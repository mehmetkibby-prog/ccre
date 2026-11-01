import {WalCheckpoint,supportsConcurrentCheckpoint} from '../../../native510-bb3a6cc689c6/vds-server/src/wal-checkpoint.mjs';
import {demand} from './contract.mjs';

// Do not retry unknown SQLite errors, corrupt/missing databases, unsafe
// versions, invalid protocol results or connection-configuration failures.
const RETRYABLE_R80=new Set(['checkpoint-backlog','checkpoint-timeout','worker-start-timeout','worker-exit']);
const RETRY_DEFAULTS_R80=Object.freeze({initialMs:30000,maxMs:300000,maxAttempts:5,stableMs:60000,probeIntervalMs:30000,probeMaxIntervalMs:300000,probeHealthyPasses:2});
function retryPolicyR80(options){
 const value={...RETRY_DEFAULTS_R80,...options};
 for(const key of ['initialMs','maxMs','stableMs','probeIntervalMs','probeMaxIntervalMs'])demand(Number.isFinite(value[key])&&value[key]>=1,'checkpoint_retry_configuration');
 demand(value.maxMs>=value.initialMs&&value.probeMaxIntervalMs>=value.probeIntervalMs&&Number.isSafeInteger(value.maxAttempts)&&value.maxAttempts>=1&&value.maxAttempts<=10&&Number.isSafeInteger(value.probeHealthyPasses)&&value.probeHealthyPasses>=2&&value.probeHealthyPasses<=10,'checkpoint_retry_configuration');
 return value;
}

// Only the trusted parent and its one reward writer share this flag. It never
// contains gameplay state or credentials. A failed/stopped supervisor restores
// automatic checkpoints; the reward writer checks it before every COMMIT too.
export class CheckpointRuntimeR79 {
 constructor(database,file,{enabled=process.env.CORE_WAL_CHECKPOINT_WORKER!=='0',options={},retryOptions={},report=event=>console.warn(JSON.stringify(event))}={}){
  this.database=database;this.file=file;this.listeners=new Set();this.state=new Int32Array(new SharedArrayBuffer(4));this.closed=false;this.report=report;this.policy=retryPolicyR80(retryOptions);
  this.status='starting';this.attempts=0;this.retryUsed=0;this.recoveries=0;this.nextRetryAtMs=null;this.lastFallback=null;this.lastRecoveredAtMs=null;
  demand(!database.sqlite.isTransaction&&!database.core511CheckpointR79,'checkpoint_runtime_binding');
  database.core511CheckpointR79=this;
  if(!enabled){this.status='fallback';this.fallback('disabled');this.ready=Promise.resolve(false);return;}
  // Never accept a caller-supplied SQLite version: the native worker must
  // validate the actual runtime on both sides of its existing safety gate.
  const {sqliteVersion:_ignored,onFallback:_ignoredFallback,onReady:_ignoredReady,standbyOnStart:_ignoredStandby,probeIntervalMs:_ignoredProbe,probeMaxIntervalMs:_ignoredProbeMax,probeHealthyPasses:_ignoredProbePasses,...workerOptions}=options;
  this.workerOptions=workerOptions;
  this.ready=this.start(false);
 }
 start(recovery){
  const frame={recovery,handled:false,activated:false};this.frame=frame;this.status=recovery?'probing':'starting';
  const worker=new WalCheckpoint(this.file,{...this.workerOptions,standbyOnStart:recovery,probeIntervalMs:this.policy.probeIntervalMs,probeMaxIntervalMs:this.policy.probeMaxIntervalMs,probeHealthyPasses:this.policy.probeHealthyPasses,
   onFallback:reason=>this.fallback(reason,frame),onReady:()=>this.activated(frame)});
  frame.worker=worker;this.worker=worker;this.database.walCheckpoint=worker;
  try{this.unregister=worker.register(this.database.sqlite,{externallyDurable:Boolean(this.database.walSync)});}
  catch(error){this.fallback('connection-configuration',frame);return worker.close().then(()=>{throw error;});}
  return worker.ready.then(ready=>{
   if(ready&&!this.closed&&this.frame===frame&&worker.snapshot().ready)return true;
   if(!this.closed&&this.frame===frame&&!frame.handled)this.fallback(worker.snapshot().fallback??'not-ready',frame);
   return false;
  });
 }
 activated(frame){
  if(this.closed||this.frame!==frame||frame.activated)return;
  frame.activated=true;this.status='ready';this.reason=null;this.nextRetryAtMs=null;this.publish(true);
  if(frame.recovery){this.recoveries++;this.lastRecoveredAtMs=Date.now();}
  this.emit({state:frame.recovery?'recovered':'ready',attempts:this.attempts,recoveries:this.recoveries});
  clearTimeout(this.stableTimer);
  // Do not reset the crash budget on a worker that only briefly became ready.
  this.stableTimer=setTimeout(()=>{if(!this.closed&&this.frame===frame&&this.worker.snapshot().ready)this.retryUsed=0;},this.policy.stableMs);this.stableTimer.unref();
 }
 get buffer(){return this.state.buffer;}
 publish(active){Atomics.store(this.state,0,active?1:0);for(const listener of this.listeners)try{listener();}catch{/* The shared flag still fences every reward COMMIT. */}}
 subscribe(listener){demand(typeof listener==='function','checkpoint_listener');this.listeners.add(listener);return()=>this.listeners.delete(listener);}
 emit(detail){try{this.report({event:'core511_checkpoint',sqliteVersion:process.versions.sqlite,...detail});}catch{}}
 fallback(reason,frame=this.frame){
  if(this.closed||frame&&this.frame!==frame||frame?.handled)return;
  if(frame)frame.handled=true;
  clearTimeout(this.stableTimer);this.publish(false);this.reason=reason;this.lastFallback=reason;this.status='fallback';
  this.emit({state:'fallback',reason,attempts:this.attempts});
  this.scheduleRetry(reason);
 }
 scheduleRetry(reason){
  if(this.closed||this.retryTimer||!RETRYABLE_R80.has(reason))return;
  if(this.retryUsed>=this.policy.maxAttempts){this.status='retry-exhausted';this.emit({state:'retry-exhausted',reason,attempts:this.attempts});return;}
  const delay=Math.min(this.policy.maxMs,this.policy.initialMs*2**this.retryUsed);
  this.status='retry-wait';this.nextRetryAtMs=Date.now()+delay;
  this.emit({state:'retry-wait',reason,delayMs:delay,attempt:this.attempts+1,nextRetryAtMs:this.nextRetryAtMs});
  this.retryTimer=setTimeout(()=>{
   this.retryTimer=null;this.nextRetryAtMs=null;if(this.closed)return;
   if(this.retrying){void this.retrying.finally(()=>{if(!this.closed)this.scheduleRetry(reason);}).catch(()=>{});return;}
   const task=this.retry();this.retrying=task;
   void task.catch(()=>{if(!this.closed){this.status='fallback';this.reason='worker-close';this.lastFallback='worker-close';this.publish(false);this.emit({state:'fallback',reason:'worker-close',attempts:this.attempts});}}).finally(()=>{if(this.retrying===task)this.retrying=null;});
  },delay);this.retryTimer.unref();
 }
 async retry(){
  const previous=this.worker;
  // close() fences the actual thread exit; no second checkpoint connection is
  // created while an old worker may still own an in-flight checkpoint.
  await previous?.close();
  if(this.closed||this.worker!==previous)return;
  if(this.database.closed){this.status='fallback';return;}
  if(this.database.sqlite.isTransaction){this.scheduleRetry(this.reason);return;}
  this.retryUsed++;this.attempts++;this.emit({state:'probing',reason:this.reason,attempt:this.attempts});
  try{await this.start(true);}
  catch(error){
   // A refused connection registration is a permanent fallback, not a failed
   // thread-exit proof. Its worker must still be confirmed closed.
   if(this.worker?.exited||!this.worker?.worker)return;
   throw error;
  }
 }
 snapshot(){
  const current=this.worker?.snapshot()??{protocol:'passive-wal-worker-v1',ready:false,fallback:this.reason??'disabled',connections:0,running:false};
  return {...current,fallback:current.ready?null:(current.fallback??this.reason??null),retryR80:{state:this.closed?'closed':this.status,attempts:this.attempts,consecutiveAttempts:this.retryUsed,maxAttempts:this.policy.maxAttempts,nextRetryAtMs:this.nextRetryAtMs,recoveries:this.recoveries,lastFallback:this.lastFallback,lastRecoveredAtMs:this.lastRecoveredAtMs,retryAllowed:!this.closed&&this.retryUsed<this.policy.maxAttempts&&RETRYABLE_R80.has(this.reason)}};
 }
 async close(){
  if(this.closing)return this.closing;
  this.closed=true;this.status='closed';clearTimeout(this.retryTimer);clearTimeout(this.stableTimer);this.retryTimer=null;this.nextRetryAtMs=null;this.publish(false);
  this.closing=(async()=>{await this.worker?.close();await this.retrying;await this.worker?.close();this.listeners.clear();})();return this.closing;
 }
}

// This connection has FULL synchronous commits. Disabling its automatic
// checkpoint changes only who copies WAL pages, never the durable ACK boundary.
export function installRewardCheckpointR79(database,buffer){
 if(buffer===undefined||buffer===null)return {sync:()=>false,close:()=>{},snapshot:()=>({active:false,supervised:false})};
 demand(buffer instanceof SharedArrayBuffer&&buffer.byteLength===4,'reward_checkpoint_buffer');
 const state=new Int32Array(buffer),sql=database.sqlite;
 const original=Number(sql.prepare('PRAGMA wal_autocheckpoint').get().wal_autocheckpoint);
 demand(Number.isSafeInteger(original)&&original>0&&Number(sql.prepare('PRAGMA synchronous').get().synchronous)>=2,'reward_checkpoint_durability');
 const supported=supportsConcurrentCheckpoint(process.versions.sqlite);let active=false,closed=false;
 const sync=()=>{const next=!closed&&supported&&Atomics.load(state,0)===1;if(next!==active){sql.exec('PRAGMA wal_autocheckpoint='+(next?0:original));active=next;}return active;};
 const commit=database.commitWrites;database.commitWrites=function(...args){sync();return Reflect.apply(commit,this,args);};
 sync();
 return {sync,close:()=>{closed=true;sync();},snapshot:()=>({active,supervised:true,original,supported})};
}
