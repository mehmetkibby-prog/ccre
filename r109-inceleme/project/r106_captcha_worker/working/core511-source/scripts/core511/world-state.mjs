import {prepareCached477} from './writer-statements.mjs';
import {preparedSchemaVersions477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {demand} from './contract.mjs';

export function readWorldPoint(sql){
 const row=prepareCached477(sql,'SELECT * FROM world_state WHERE id=1').get(),revision=prepareCached477(sql,'SELECT revision FROM kernel511_world_version WHERE id=1').get()?.revision;
 demand(row&&Number.isSafeInteger(revision)&&revision>=0,'world_point_missing');return {revision,world:{...row}};
}
export function acceptWorldPoint(current,next){
 demand(next&&Number.isSafeInteger(next.revision)&&next.revision>=0&&next.world?.id===1&&Number.isSafeInteger(next.world.cycle),'world_point_invalid');
 if(current===next)return false;
 if(current&&next.revision<current.revision)return false;
 if(current&&next.revision===current.revision){demand(JSON.stringify(next.world)===JSON.stringify(current.world),'world_point_reused');return false;}
 return true;
}

// Capture the world row inside the sole writer transaction; publish only after
// its normal COMMIT/WAL fsync completes. Native SQL is unchanged. A trigger
// revision survives crashes and also covers donation/admin/guardian writes.
// An older receipt replay captures today's row, never its historical result.
export class DurableWorldState {
 constructor(database){demand(database?.atomic&&!database.kernel511WorldState,'world_feed_exists');this.database=database;this.listeners=new Set();this.current=null;this.installed=false;database.kernel511WorldState=this;}
 async initialize(){
  demand(!this.installed,'world_feed_already_installed');
  await this.database.atomic(sql=>{
   const columns=prepareCached477(sql,'PRAGMA table_info(world_state)').all().map(row=>row.name);demand(columns.length&&columns.every(k=>/^[a-z_]+$/.test(k)),'world_columns');
   sql.exec(`CREATE TABLE IF NOT EXISTS kernel511_world_version(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 0);
    INSERT OR IGNORE INTO kernel511_world_version(id,revision) VALUES(1,0);
    CREATE TRIGGER IF NOT EXISTS kernel511_world_update AFTER UPDATE ON world_state WHEN NEW.id=1 AND (${columns.map(k=>'NEW.'+k+' IS NOT OLD.'+k).join(' OR ')}) BEGIN UPDATE kernel511_world_version SET revision=revision+1 WHERE id=1; END;
    CREATE TRIGGER IF NOT EXISTS kernel511_world_insert AFTER INSERT ON world_state WHEN NEW.id=1 BEGIN UPDATE kernel511_world_version SET revision=revision+1 WHERE id=1; END;
    CREATE TRIGGER IF NOT EXISTS kernel511_world_delete AFTER DELETE ON world_state WHEN OLD.id=1 BEGIN UPDATE kernel511_world_version SET revision=revision+1 WHERE id=1; END;`);
   return readWorldPoint(sql);
  }).then(point=>{this.current=Object.freeze({revision:point.revision,world:Object.freeze(point.world)});});
  const original=this.database.atomic.bind(this.database),feed=this,initialSchema=preparedSchemaVersions477(this.database.sqlite).mainVersion;
  this.database.atomic=function(task,options){
   if(typeof task!=='function'||task.constructor?.name==='AsyncFunction')return original(task,options);
   let point;return original(sql=>{const result=task(sql);demand(!result?.then,'world_feed_async_operation');
    // The trigger revision is read in this same transaction. Reuse only the
    // already durable immutable image when that revision is unchanged; a new
    // revision still captures the full row and waits for the original fsync.
    const revision=prepareCached477(sql,'SELECT revision FROM kernel511_world_version WHERE id=1').get()?.revision;
    const sameSchema=preparedSchemaVersions477(sql).mainVersion===initialSchema;
    point=sameSchema&&revision===feed.current?.revision?feed.current:readWorldPoint(sql);
    return result;
   },options).then(result=>{feed.publish(point);return result;});
  };
  this.installed=true;return this.current;
 }
 publish(point){if(!acceptWorldPoint(this.current,point))return;this.current=Object.freeze({revision:point.revision,world:Object.freeze(point.world)});for(const notify of this.listeners)notify(this.current);}
 async syncExternal(){demand(!this.database.sqlite.isTransaction,'world_external_uncommitted');const point=readWorldPoint(this.database.sqlite);await this.database.durableAfterCommit();this.publish(point);}
 subscribe(notify){demand(typeof notify==='function','world_feed_subscriber');this.listeners.add(notify);return ()=>this.listeners.delete(notify);}
}

export class WorldStateDelivery {
 constructor({current,request}){demand(typeof current==='function'&&typeof request==='function','world_delivery_dependencies');Object.assign(this,{current,request});this.sent=-1;this.pending=null;this.failure=null;}
 flush(){
  if(this.pending)return this.pending;if(this.failure)return Promise.reject(this.failure);
  this.pending=Promise.resolve().then(async()=>{try{while(this.current().revision>this.sent){const point=this.current(),ack=await this.request(point);demand(Number.isSafeInteger(ack?.revision)&&ack.revision>=point.revision,'world_state_ack');this.sent=ack.revision;}}catch(error){this.failure=error;throw error;}finally{this.pending=null;}});return this.pending;
 }
}
