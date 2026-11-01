import {demand,kernelError} from './contract.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
const report=createFaultReporter(text=>process.stderr.write(text));
const reportOverdue=createFaultReporter(text=>process.stderr.write(text));
const retryable=new Set(['ipc_request_timeout','ipc_backpressure','ipc_request_backpressure','ipc_write_backpressure','ipc_frame_size','read_worker_backpressure','actor_command_pending']);
const delays=[2000,5000,10000,30000];
const diagnosticAfter=20000;
function statusDiagnostic(value,command,observedAt){
 const d=value?.diagnostic;if(!d||d.operationId!==command.operationId||d.operation!==command.operation||d.sequence!==command.sequence)return null;
 const snapshot={observedAt};
 if(Number.isSafeInteger(d.ownerSequence)&&d.ownerSequence>=0)snapshot.ownerSequence=d.ownerSequence;
 for(const key of ['receiptPresent','rollbackProven','inFlight'])if(typeof d[key]==='boolean')snapshot[key]=d[key];
 return snapshot;
}
// Only failed commands enter this bounded cold path. Their original Promise
// remains pending, so its existing actor/resource barrier still owns all work.
// No success/negative ACK is synthesized and the native command is never replayed.
export class ActorCommandRecovery {
 constructor({status,describe=(_peer,command)=>command,disconnect=()=>{},clock=Date.now,limit=100,diagnose=reportOverdue}){Object.assign(this,{status,describe,disconnect,clock,limit,diagnose});this.entries=new Map();this.closed=false;}
 async recover(peer,command,error){
  if(/^SQLITE_(CORRUPT|NOTADB|IOERR|FULL)/.test(error?.code??''))throw error;
  const startedAt=actorFrameIsolation?this.clock():0;
  const descriptor=this.describe(peer,command),value=await this.probe(descriptor);
  if(value?.status==='committed'||value?.status==='not_executed')return value;
  demand(['unresolved','retry'].includes(value?.status),'actor_recovery_status');
  const key=command.operationId,prior=this.entries.get(key);if(prior)return prior.promise;
  demand(!this.closed&&this.entries.size<this.limit,'actor_recovery_capacity');
  let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});
  const row={peer,command,descriptor,resolve,reject,promise,pending:false,attempt:0,confirmed:value.status==='unresolved',next:this.clock()+delays[0]};this.entries.set(key,row);
  if(actorFrameIsolation)Object.assign(row,{startedAt,diagnosed:false,diagnostic:statusDiagnostic(value,command,this.clock())});
  this.disconnect(command.playerId,command,{confirmed:row.confirmed});report({actor:command.playerId,channel:peer.channel,error:{code:'actor_command_outcome_pending',fenceContext:{operation:command.operation,requestEpoch:command.epoch,sequence:command.sequence}}});return promise;
 }
 hasActor(id,{confirmedOnly=false}={}){for(const row of this.entries.values())if((!confirmedOnly||row.confirmed)&&(row.command.playerId===id||row.command.payload?.resources?.includes('player:'+id)))return true;return false;}
 async probe(command){try{return await this.status(command);}catch(error){if(retryable.has(error?.code))return {status:'retry'};throw error;}}
 poll(){
  if(this.closed||!this.entries.size)return;let budget=2,diagnosticBudget=2;const now=this.clock();
  for(const [key,row]of this.entries){
   // Diagnose from the last exact parent status, even while its next retry is
   // not due. Age is explicit: a lost status reply cannot become proof of an
   // absent receipt or a rollback. This does not settle or release the barrier.
   if(actorFrameIsolation&&diagnosticBudget&&!row.diagnosed&&now-row.startedAt>=diagnosticAfter){
    diagnosticBudget--;row.diagnosed=true;const d=row.diagnostic;
    this.diagnose({actor:row.command.playerId,channel:row.peer.channel,error:{code:'actor_command_outcome_overdue',fenceContext:{operationId:row.command.operationId,operation:row.command.operation,requestEpoch:row.command.epoch,sequence:row.command.sequence,waitMs:now-row.startedAt,receiptStatus:d?.receiptPresent===true?'present':d?.receiptPresent===false?'absent':'unknown',...(d?{ownerSequence:d.ownerSequence,receiptPresent:d.receiptPresent,rollbackProven:d.rollbackProven,inFlight:d.inFlight,statusAgeMs:Math.max(0,now-d.observedAt)}:{})}}});
   }
   if(!budget||row.pending||now<row.next)continue;budget--;row.pending=true;
   void this.probe(row.descriptor).then(value=>{
    if(this.entries.get(key)!==row)return;
    if(value?.status==='committed'||value?.status==='not_executed'){this.entries.delete(key);row.resolve(value);return;}
    demand(['unresolved','retry'].includes(value?.status),'actor_recovery_status');
    if(actorFrameIsolation){const diagnostic=statusDiagnostic(value,row.command,this.clock());if(diagnostic)row.diagnostic=diagnostic;}
    if(value.status==='unresolved'&&!row.confirmed){row.confirmed=true;this.disconnect(row.command.playerId,row.command,{confirmed:true});}
   }).catch(error=>{this.entries.delete(key);row.reject(error);}).finally(()=>{row.pending=false;row.attempt++;row.next=this.clock()+delays[Math.min(row.attempt,delays.length-1)];});
  }
 }
 close(){this.closed=true;for(const row of this.entries.values())row.reject(kernelError('channel_stopping'));this.entries.clear();}
}
