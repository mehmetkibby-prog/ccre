import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const reportMarketFault=createFaultReporter(text=>process.stderr.write(text));
const transientMarketReads=new Set(['read_worker_backpressure','read_worker_timeout','read_worker_queue_timeout','read_worker_process_changed','read_worker_closed']);
const failedMarketReads=new WeakSet();
export function readMarketRevision(sql){return prepareCached477(sql,'SELECT revision FROM kernel511_market_version WHERE id=1').get().revision;}
export function readMarketState(sql){sql.exec('BEGIN');try{const point={revision:readMarketRevision(sql),shops:prepareCached477(sql,'SELECT id,active,created_at FROM market_shops ORDER BY id').all()};sql.exec('COMMIT');return point;}catch(error){sql.exec('ROLLBACK');throw error;}}
// Only compact version metadata is read on the writer. The public market row
// image is built once per committed change by the query-only worker.
export class DurableMarketState {
 constructor(database){demand(database?.atomic&&!database.kernel511MarketState,'market_feed_exists');this.database=database;database.kernel511MarketState=this;this.listeners=new Set();this.current=-1;}
 async initialize(){
  await this.database.atomic(sql=>{sql.exec(`CREATE TABLE IF NOT EXISTS kernel511_market_version(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 0);
   INSERT OR IGNORE INTO kernel511_market_version VALUES(1,0);
   CREATE TRIGGER IF NOT EXISTS kernel511_market_insert AFTER INSERT ON market_shops BEGIN UPDATE kernel511_market_version SET revision=revision+1 WHERE id=1; END;
   CREATE TRIGGER IF NOT EXISTS kernel511_market_delete AFTER DELETE ON market_shops BEGIN UPDATE kernel511_market_version SET revision=revision+1 WHERE id=1; END;
   CREATE TRIGGER IF NOT EXISTS kernel511_market_update AFTER UPDATE OF id,active,created_at ON market_shops WHEN NEW.id IS NOT OLD.id OR NEW.active IS NOT OLD.active OR NEW.created_at IS NOT OLD.created_at BEGIN UPDATE kernel511_market_version SET revision=revision+1 WHERE id=1; END;`);return readMarketRevision(sql);}).then(revision=>{this.current=revision;});
  const original=this.database.atomic.bind(this.database),feed=this;this.database.atomic=function(task,options){if(typeof task!=='function'||task.constructor?.name==='AsyncFunction')return original(task,options);let revision;return original(sql=>{const result=task(sql);demand(!result?.then,'market_feed_async_operation');revision=readMarketRevision(sql);return result;},options).then(result=>{feed.publish(revision);return result;});};return this.current;
 }
 publish(revision){demand(Number.isSafeInteger(revision)&&revision>=0,'market_revision');if(revision<=this.current)return;this.current=revision;for(const notify of this.listeners)notify(revision);}
 subscribe(notify){this.listeners.add(notify);return ()=>this.listeners.delete(notify);}
 waitFor(revision){if(this.current>=revision)return Promise.resolve();return new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);unsubscribe();},unsubscribe=this.subscribe(value=>{if(value>=revision){done();resolve();}}),timer=setTimeout(()=>{done();reject(Object.assign(Error('market_durability_timeout'),{code:'market_durability_timeout'}));},10000);});}
}
export class MarketStateCoordinator {
 constructor(core){this.core=core;this.feed=core.writer.marketState;this.cached=null;this.reading=null;this.deferred=new Map();this.closed=false;this.unsubscribe=this.feed.subscribe(()=>{for(const row of core.processes.values())if(row.online&&row.marketAttached)this.deliver(row);});}
 deliver(row){void this.flush(row).then(()=>{if(this.deferred.get(row.peer.channel)===row)this.deferred.delete(row.peer.channel);},error=>{
  // A replacement loads the complete committed market image. A lost reply
  // to a retired process is still rejected, but is not a replacement fault.
  if(this.closed||!row.online||this.core.processes.get(row.peer.channel)!==row)return;
  if(actorFaultIsolation&&failedMarketReads.has(error)){
   demand(this.deferred.has(row.peer.channel)||this.deferred.size<4,'market_retry_capacity');this.deferred.set(row.peer.channel,row);reportMarketFault({error,channel:row.peer.channel});return;
  }
  this.core.onFault({error,channel:row.peer.channel,incarnation:row.peer.incarnation});
 });}
 retry(){if(!actorFaultIsolation||this.closed)return;for(const [channel,row]of this.deferred){if(!row.online||this.core.processes.get(channel)!==row)this.deferred.delete(channel);else this.deliver(row);}}
 async point(){
  if(this.cached?.revision>=this.feed.current)return this.cached;if(this.reading)return this.reading;
  this.reading=(async()=>{let result;try{result=await this.core.reader.query('kernel511_market_state',[]);}catch(error){if(actorFaultIsolation&&transientMarketReads.has(error?.code))failedMarketReads.add(error);throw error;}const point=result.rows;await this.feed.waitFor(point.revision);if(!this.cached||point.revision>this.cached.revision)this.cached=point;return this.cached;})().finally(()=>{this.reading=null;});return this.reading;
 }
 attach(row){row.marketAttached=true;row.marketSent=-1;return this.flush(row);}
 flush(row){
  if(row.marketPending)return row.marketPending;row.marketPending=Promise.resolve().then(async()=>{while(row.marketSent<this.feed.current){this.core.process(row.peer);const point=await this.point(),ack=await row.control.request('market_state',point);demand(Number.isSafeInteger(ack?.revision)&&ack.revision>=point.revision,'market_state_ack');row.marketSent=ack.revision;}}).finally(()=>{row.marketPending=null;});return row.marketPending;
 }
 close(){this.closed=true;this.deferred.clear();this.unsubscribe();}
}
