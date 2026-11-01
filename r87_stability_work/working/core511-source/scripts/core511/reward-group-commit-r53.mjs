import {stageOnlyTimingR78} from './timing-mode-r78.mjs';
import {rewardGroupCommitR53} from './r53-options.mjs';
import {entryWriteReadyR67} from './entry-write-window-r67.mjs';
import {workerWindowR56,shortWriteWindowR56} from './r56-options.mjs';
import {withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {measureWriterSql477} from '../../../native510-bb3a6cc689c6/vds-server/src/writer-sql-timing477.mjs';

const installed=new WeakMap();
// Reuse LocalDatabase's BEGIN/COMMIT/fsync/failure path. Only coalesce the FIFO
// jobs fed to that path; no transaction remains open during collection.
export function installRewardGroupCommitR53(database,{enabled=rewardGroupCommitR53,windowMs=shortWriteWindowR56?2:20,maxJobs=8,budgetMs=8}={}){
 if(!enabled)return null;
 if(installed.has(database))return installed.get(database);
 if(!Number.isSafeInteger(windowMs)||windowMs<0||windowMs>50||!Number.isSafeInteger(maxJobs)||maxJobs<1||maxJobs>16||!Number.isFinite(budgetMs)||budgetMs<1||budgetMs>50)throw Error('reward_group_configuration');
 const nativeSchedule=database.scheduleWriteDrain,nativeDrain=database.drainWrites,nativeClose=database.close;
 if(![nativeSchedule,nativeDrain,nativeClose].every(f=>typeof f==='function'))throw Error('reward_group_database_contract');
 const stats={protocol:'core511-reward-group-r53',windowMs,maxJobs,budgetMs,groups:0,jobs:0,collectWindows:0,rejected:0,maxGroup:0,maxWorkMs:0};
 let window=null,draining=false;
 database.scheduleWriteDrain=function(){
  const entryReady=entryWriteReadyR67(this);
  if(this.writeDrain){
   if(window===this.writeDrain&&(entryReady||this.writeQueue.length>=maxJobs)){clearTimeout(window);window=null;this.writeDrain=null;nativeSchedule.call(this);}
   return;
  }
  if(!this.writeQueue.length)return;
  // An external worker command is a FIFO barrier, not a coalescible SQL job.
  // Do not add a collection window when it is already the head. An older
  // ordinary write retains its normal window and original ordering.
  if(entryReady||this.writeQueue.length>=maxJobs||windowMs===0||workerWindowR56&&this.writeQueue[0]?.externalR533){nativeSchedule.call(this);return;}
  stats.collectWindows++;window=setTimeout(()=>{if(this.writeDrain===window)this.writeDrain=null;window=null;nativeSchedule.call(this);},windowMs);this.writeDrain=window;
 };
 database.drainWrites=function(){
  if(draining)throw Error('reward_group_reentrant');
  if(window){clearTimeout(window);if(this.writeDrain===window)this.writeDrain=null;window=null;}
  if(!this.writeQueue.length){this.writeDrain=null;return;}
  const tail=this.writeQueue,selected=tail.splice(0,maxJobs),done=[],timing=stageOnlyTimingR78();let returned=false;
  const returnTail=()=>{if(returned)return;returned=true;if(done.length<selected.length)tail.unshift(...selected.slice(done.length));};
  const settle=(error=null)=>{
   for(const job of done){
    if(job.timing)Object.assign(job.timing,{batchId:timing.batchId,batchSize:done.length,transactionMs:timing.transactionMs,commitMs:timing.commitMs,durableMs:timing.durableMs,durabilityMode:timing.durabilityMode,fsyncWaitMs:timing.fsyncWaitMs,flushId:timing.flushId});
    const failure=error??job.error;failure?job.reject(failure):job.resolve(job.results);
   }
  };
  const proxy={queuedAt477:selected[0].queuedAt477??performance.now(),timing,atomic:sql=>{
   const started=performance.now();
   try{
    for(const job of selected){
     done.push(job);const at=performance.now();if(job.timing)job.timing.queueMs=at-job.queuedAt477;
     sql.exec('SAVEPOINT core511_reward_group_job');
     try{
      const work=()=>job.atomic?job.atomic(sql):job.guard?this.executeGuardedJob(job):job.statements.map(s=>this.execute(s));
      const prepared=()=>withPreparedStatements477(sql,work,{schemaChecked:true});
      job.results=job.timing?measureWriterSql477(sql,prepared,job.timing):prepared();
      if(job.results&&typeof job.results.then==='function')throw Error('Atomic callback must be synchronous');
      sql.exec(job.guardedRejected?'ROLLBACK TO core511_reward_group_job; RELEASE core511_reward_group_job':'RELEASE core511_reward_group_job');
     }catch(error){job.error=error;stats.rejected++;if(!sql.isTransaction)throw error;sql.exec('ROLLBACK TO core511_reward_group_job; RELEASE core511_reward_group_job');}
     finally{if(job.timing)job.timing.jobMs=performance.now()-at;}
     if(performance.now()-started>=budgetMs)break;
    }
    stats.groups++;stats.jobs+=done.length;stats.maxGroup=Math.max(stats.maxGroup,done.length);stats.maxWorkMs=Math.max(stats.maxWorkMs,performance.now()-started);
    return {jobs:done.length};
   }finally{returnTail();}
  },resolve:()=>settle(),reject:error=>{
   // BEGIN/schema failure can precede entry into proxy.atomic. In that case
   // none of these selected jobs ran, but each still needs the same rejection.
   if(!returned){done.push(...selected);returned=true;}
   settle(error);
  }};
  draining=true;this.writeQueue=[proxy];
  try{return nativeDrain.call(this);}
  finally{
   this.writeQueue=tail;draining=false;
   // nativeDrain only sees the one bounded proxy. Socket I/O gets a turn
   // before another group, and the tail remains in original FIFO order.
   // These jobs already passed the collection window. Never add another
   // 20ms delay after each budget-limited slice of the same queued work.
   if(tail.length)nativeSchedule.call(this);
  }
 };
 database.close=function(...args){if(window){clearTimeout(window);if(this.writeDrain===window)this.writeDrain=null;window=null;}return nativeClose.apply(this,args);};
 installed.set(database,stats);return stats;
}
