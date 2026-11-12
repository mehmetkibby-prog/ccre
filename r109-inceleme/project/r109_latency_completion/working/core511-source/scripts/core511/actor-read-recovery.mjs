import {demand,kernelError} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const report=createFaultReporter(text=>process.stderr.write(text));
const transient=new Set(['ipc_backpressure','read_worker_backpressure','read_worker_timeout','read_worker_queue_timeout','read_worker_process_changed','read_worker_closed']);
const delays=[2000,5000,10000,30000];

// Only actor snapshot reads may enter here, never commands or cursor-based
// guild scans. Keep the caller's existing actor/resource barrier pending.
// Retrying reads CURRENT SQLite under the original owner/epoch checks; a
// successful gameplay commit is neither replayed nor overwritten by a cache.
export class ActorReadRecovery {
 constructor({clock=Date.now,limit=100,onWait=()=>{}}={}){Object.assign(this,{clock,limit,onWait});this.entries=new Set();this.closed=false;}
 load(scope,fetch){
  if(!actorFaultIsolation)return fetch();
  if(this.closed)return Promise.reject(kernelError('channel_stopping'));
  let result;try{result=fetch();}catch(error){return this.failed(scope,fetch,error);}
  return Promise.resolve(result).catch(error=>this.failed(scope,fetch,error));
 }
 failed(scope,fetch,error){
  if(!transient.has(error?.code)||this.closed)return Promise.reject(error);
  demand(scope&&typeof scope.actor==='string'&&scope.actor.length>0&&scope.actor.length<=160&&Number.isSafeInteger(scope.epoch)&&scope.epoch>0&&Number.isSafeInteger(scope.revision)&&scope.revision>=0,'actor_read_recovery_scope');
  demand(this.entries.size<this.limit,'actor_read_recovery_capacity');
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const row={scope:{actor:scope.actor,epoch:scope.epoch,revision:scope.revision},fetch,resolve,reject,promise,pending:false,attempt:0,next:this.clock()+delays[0]};this.entries.add(row);
  report({actor:scope.actor,error});try{this.onWait(row.scope,error);}catch{}
  return promise;
 }
 hasActor(id){for(const row of this.entries)if(row.scope.actor===id)return true;return false;}
 poll(){
  if(this.closed||!this.entries.size)return;let budget=2;const now=this.clock();
  for(const row of this.entries){
   if(!budget||row.pending||now<row.next)continue;budget--;row.pending=true;
   void Promise.resolve().then(row.fetch).then(value=>{
    if(!this.entries.delete(row))return;row.resolve(value);
   },error=>{
    if(!this.entries.has(row))return;
    if(!transient.has(error?.code)){this.entries.delete(row);row.reject(error);}
   }).finally(()=>{row.pending=false;row.attempt++;row.next=this.clock()+delays[Math.min(row.attempt,delays.length-1)];});
  }
 }
 close(){this.closed=true;for(const row of this.entries)row.reject(kernelError('channel_stopping'));this.entries.clear();}
}
