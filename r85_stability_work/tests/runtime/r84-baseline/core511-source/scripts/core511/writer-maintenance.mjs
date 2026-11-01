import {r35Options} from './r35-options.mjs';
import {prepareServerStatement} from './server-statements.mjs';
const immediate=()=>new Promise(resolve=>setImmediate(resolve));
export function retentionMinutes(value=process.env.CORE511_RETENTION_MINUTES){const n=Number(value??15);return Number.isSafeInteger(n)&&n>=15&&n<=10080?n:15;}
// No domain reward/item receipt is included. Sequence watermarks are never
// deleted; ACKed audience rows can be removed without changing R34 replay.
export class WriterMaintenance {
 constructor(writer,{clock=Date.now,retention=r35Options.retention,idleCheckpoint=r35Options.idleCheckpoint,minutes=retentionMinutes()}={}){
  Object.assign(this,{writer,database:writer.database,clock,retention,idleCheckpoint,minutes});this.timer=null;this.running=null;this.closed=false;this.batch=1;this.cursors={system:0,notifications:0};this.lastCheckpoint=0;this.nextPassAt=0;this.budgetMs=0;this.metrics={passes:0,skipped:0,receipts:0,system:0,notifications:0,checkpoints:0,errors:0,maxBatchMs:0,batches:0,budgetOverruns:0};
 }
 idle(){const d=this.database,w=d.walSync;return !this.closed&&!d.closed&&!d.maintenance&&!d.sqlite.isTransaction&&!d.writeQueue?.length&&!d.writeDrain&&!w?.running&&!w?.waiting?.length&&!this.writer.inflight&&!this.writer.system.pending&&!this.writer.sharedCombat?.busy&&!this.writer.sharedCombat?.terminal;}
 start(){if(this.timer||this.closed||!this.retention&&!this.idleCheckpoint)return;this.timer=setInterval(()=>{void this.step().catch(error=>{this.metrics.errors++;if(this.metrics.errors<=4)console.warn(JSON.stringify({type:'core511_writer_maintenance',code:error.code??'maintenance_failed'}));});},1000);this.timer.unref?.();}
 close(){this.closed=true;clearInterval(this.timer);this.timer=null;}
 async step(){
  if(this.running)return this.running;if(this.database.closed){this.close();return;}
  if(!this.idle()||this.clock()<this.nextPassAt){this.metrics.skipped++;return;}
  this.nextPassAt=this.clock()+1000;this.budgetMs=4;
  const task=this.run();this.running=task;try{return await task;}finally{if(this.running===task)this.running=null;}
 }
 async atomic(work){
  if(!this.idle()||this.budgetMs<=0)return {changes:0,skipped:true};
  return this.database.atomic(sql=>{
   // Recheck after joining the FIFO: a player job queued in that intervening
   // turn has priority. Do not consume a maintenance batch in its group.
   if(this.database.writeQueue?.length||this.closed)return {changes:0,skipped:true};
   const started=performance.now();this.deadline=started+Math.min(2,this.budgetMs);const result=work(sql),ms=performance.now()-started;this.metrics.maxBatchMs=Math.max(this.metrics.maxBatchMs,ms);this.metrics.batches++;this.budgetMs-=ms;
   if(ms>2){this.batch=Math.max(1,Math.floor(this.batch/2));this.metrics.budgetOverruns++;}else if(ms<.5)this.batch=Math.min(128,this.batch+1);return result;
  });
 }
 async run(){
  this.metrics.passes++;const before=Math.floor(this.clock()-this.minutes*60000);
  if(this.retention){
   {
    // Reuse the exact authority pruning operation, through an idle-only
    // database port. No ownership/replay implementation is duplicated here.
    const port=Object.create(this.writer.authority);port.database={atomic:work=>this.atomic(work)};
    const result=await port.pruneReceipts(before,this.batch);this.metrics.receipts+=Number(result.changes??0);
   }
   await immediate();if(!this.idle())return;
   await this.pruneRows('system',before);await immediate();if(!this.idle())return;
   if(r35Options.outboxV2)await this.pruneRows('notifications',before);
   await immediate();
  }
  if(this.idleCheckpoint&&this.idle()&&this.clock()-this.lastCheckpoint>=10000){
   // Same synchronous turn as the empty-queue check, outside all transactions.
   // PASSIVE never waits for readers/writers and changes no logical game data.
   this.database.sqlite.prepare('PRAGMA wal_checkpoint(PASSIVE)').get();this.lastCheckpoint=this.clock();this.metrics.checkpoints++;
  }
 }
 async pruneRows(kind,before){
  const table=kind==='system'?'kernel511_system_receipts':'kernel511_notifications';
  const result=await this.atomic(db=>{
   const rows=prepareServerStatement(db,'SELECT rowid AS rid,created_ms FROM '+table+' WHERE rowid>? ORDER BY rowid LIMIT ?').all(this.cursors[kind],this.batch);
   let changes=0,cursor=rows.length?this.cursors[kind]:0;
   for(const row of rows){
    if(performance.now()>=this.deadline)break;const id=row.rid;cursor=id;if(row.created_ms>=before)continue;
    if(kind==='notifications'){
     const row=prepareServerStatement(db,'SELECT event_id FROM kernel511_notifications n WHERE rowid=? AND created_ms<? AND NOT EXISTS(SELECT 1 FROM kernel511_notification_audience a WHERE a.event_id=n.event_id AND a.acknowledged=0)').get(id,before);
     if(!row)continue;
     prepareServerStatement(db,'DELETE FROM kernel511_notification_audience WHERE event_id=? AND acknowledged=1').run(row.event_id);
    }
    changes+=Number(prepareServerStatement(db,'DELETE FROM '+table+' WHERE rowid=? AND created_ms<?').run(id,before).changes);
   }return {changes,cursor};
  });
  if(!result.skipped)this.cursors[kind]=result.cursor;this.metrics[kind]+=Number(result.changes??0);
 }
}
