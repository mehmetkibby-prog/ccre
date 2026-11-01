import {actorIsolations,attachActorIsolations} from './actor-isolation-proof.mjs';
import {demand,kernelError} from './contract.mjs';
import {freezeFailuresR85,attachFreezeFailuresR85} from './freeze-failure-r85.mjs';

const unproven=new WeakSet();
const markUnproven=error=>{if(error&&typeof error==='object')unproven.add(error);return error;};
export const unprovenFreezeR85=error=>Boolean(error&&typeof error==='object'&&unproven.has(error));

// Only certified pre-command outcomes may wait for their sibling freezes.
// An unproven reply fails promptly: recovery may need to retire a sibling in
// order to settle that sibling's pending control/checkpoint. Every launched
// Promise retains both observers, so its later rejection is still consumed.
// A deadline only requests the existing fenced recovery path. It does not
// release an owner, declare rollback, or replay a native operation.
export function settleFreezeRequestsR85(requests,{knownRejection=()=>false,deadlineMs=10000,set=setTimeout,clear=clearTimeout}={}){
 demand(Array.isArray(requests)&&Number.isFinite(deadlineMs)&&deadlineMs>0,'freeze_join_configuration');
 if(!requests.length)return Promise.resolve([]);
 return new Promise((resolve,reject)=>{
  let remaining=requests.length,done=false;const settled=new Array(remaining);
  const finish=(index,row)=>{if(done)return;settled[index]=row;if(--remaining===0){done=true;clear(timer);resolve(settled);}};
  const fail=error=>{if(done)return;done=true;clear(timer);reject(markUnproven(error));};
  const timer=set(()=>fail(kernelError('cold_freeze_deadline')),deadlineMs);timer?.unref?.();
  for(const [index,request]of requests.entries())Promise.resolve(request).then(value=>finish(index,{status:'fulfilled',value}),error=>{
   if(done)return;
   let known;try{known=knownRejection(error,index)===true;}catch(validationError){fail(validationError);return;}
   if(known)finish(index,{status:'rejected',reason:error});else fail(error);
  });
 });
}

// A stopped proof and an already tracked unknown command are different facts.
// The caller must verify the latter against the exact current parent owner (or
// the resident's already confirmed command book). Both actors remain fenced.
export async function joinFreezeRequestsR85(requests,{knownPending=()=>false,...options}={}){
 const known=(error,index)=>!unprovenFreezeR85(error)&&(error?.code==='actor_command_pending'?freezeFailuresR85(error).length>0&&knownPending(error,index)===true:actorIsolations(error).length>0);
 const settled=await settleFreezeRequestsR85(requests,{...options,knownRejection:known});
 const failed=settled.map((row,index)=>({...row,index})).filter(result=>result.status==='rejected');
 if(!failed.length)return settled.map(result=>result.value);
 for(const result of failed)if(!known(result.reason,result.index))throw markUnproven(result.reason);
 const error=(failed.find(result=>result.reason?.code==='actor_command_pending')??failed[0]).reason;
 const stopped=failed.flatMap(result=>actorIsolations(result.reason));
 const pending=failed.flatMap(result=>freezeFailuresR85(result.reason));
 if(pending.some(fact=>stopped.some(proof=>proof.actor===fact.actor)))throw markUnproven(kernelError('freeze_failure_overlap_r85'));
 if(pending.length)attachFreezeFailuresR85(error,pending);
 if(stopped.length)attachActorIsolations(error,stopped);
 throw error;
}
