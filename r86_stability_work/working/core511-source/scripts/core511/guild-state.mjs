import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
export const readGuildRevision=sql=>prepareCached477(sql,'SELECT revision FROM kernel511_guild_version WHERE id=1').get().revision;
export class DurableGuildState {
 constructor(database){demand(database?.atomic&&!database.kernel511GuildState,'guild_feed_exists');this.database=database;database.kernel511GuildState=this;this.listeners=new Set();this.current=-1;}
 async initialize(){
  await this.database.atomic(sql=>{
   sql.exec('CREATE TABLE IF NOT EXISTS kernel511_guild_version(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL DEFAULT 0);INSERT OR IGNORE INTO kernel511_guild_version VALUES(1,0);');
   for(const table of ['guild_members','guild_skills']){
    const columns=prepareCached477(sql,'PRAGMA table_info('+table+')').all().map(r=>r.name);demand(columns.length&&columns.every(k=>/^[a-z_]+$/.test(k)),'guild_revision_columns');
    for(const operation of ['INSERT','DELETE'])sql.exec('CREATE TRIGGER IF NOT EXISTS kernel511_'+table+'_'+operation.toLowerCase()+' AFTER '+operation+' ON '+table+' BEGIN UPDATE kernel511_guild_version SET revision=revision+1 WHERE id=1; END;');
    sql.exec('CREATE TRIGGER IF NOT EXISTS kernel511_'+table+'_update AFTER UPDATE ON '+table+' WHEN '+columns.map(k=>'NEW.'+k+' IS NOT OLD.'+k).join(' OR ')+' BEGIN UPDATE kernel511_guild_version SET revision=revision+1 WHERE id=1; END;');
   }
   return readGuildRevision(sql);
  }).then(revision=>{this.current=revision;});
  const original=this.database.atomic.bind(this.database),feed=this;this.database.atomic=function(task,options){if(typeof task!=='function'||task.constructor?.name==='AsyncFunction')return original(task,options);let revision;return original(sql=>{const result=task(sql);demand(!result?.then,'guild_feed_async_operation');revision=readGuildRevision(sql);return result;},options).then(result=>{feed.publish(revision);return result;});};return this.current;
 }
 publish(revision){demand(Number.isSafeInteger(revision)&&revision>=0,'guild_revision');if(revision<=this.current)return;this.current=revision;for(const notify of this.listeners)notify(revision);}
 subscribe(notify){this.listeners.add(notify);return ()=>this.listeners.delete(notify);}
 waitFor(revision){if(this.current>=revision)return Promise.resolve();return new Promise((resolve,reject)=>{const done=()=>{clearTimeout(timer);unsubscribe();},unsubscribe=this.subscribe(value=>{if(value>=revision){done();resolve();}}),timer=setTimeout(()=>{done();reject(Object.assign(Error('guild_durability_timeout'),{code:'guild_durability_timeout'}));},10000);});}
}
