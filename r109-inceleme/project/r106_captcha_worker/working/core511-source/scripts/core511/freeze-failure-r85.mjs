import {demand,kernelError,validChannel} from './contract.mjs';
import {actorIsolations} from './actor-isolation-proof.mjs';

// These facts describe only a failed freeze control request. They are not a
// command receipt, rollback proof, stopped-owner proof, or permission to write.
// A pending command is still reconciled by the existing exact parent registry.
const known=new WeakMap(),empty=Object.freeze([]);
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160;
function snapshots(rows){
 demand(Array.isArray(rows)&&rows.length>0&&rows.length<=100,'invalid_freeze_failure_r85');
 const facts=rows.map(row=>{
  demand(id(row?.actor)&&Number.isSafeInteger(row.epoch)&&row.epoch>0&&id(row.freezeToken)&&row.freezeToken.length>=8&&validChannel(row.channel)&&id(row.incarnation)&&['pending_command','not_started'].includes(row.stage)&&typeof row.pending==='boolean'&&(row.stage!=='pending_command'||row.pending===true),'invalid_freeze_failure_r85');
  return Object.freeze({actor:row.actor,epoch:row.epoch,freezeToken:row.freezeToken,channel:row.channel,incarnation:row.incarnation,stage:row.stage,pending:row.pending});
 });
 demand(new Set(facts.map(row=>row.actor)).size===facts.length&&facts.some(row=>row.pending),'invalid_freeze_failure_r85');
 return Object.freeze(facts);
}
function matches(facts,method,payload){
 const requests=method==='freeze'?[payload]:['freeze_group','freeze_idle_group'].includes(method)?payload?.requests:null;
 demand(Array.isArray(requests)&&requests.length>0&&requests.length<=100&&new Set(requests.map(r=>r?.id)).size===requests.length&&(method!=='freeze'||facts.length===1),'invalid_freeze_failure_scope_r85');
 for(const fact of facts){const request=requests.find(row=>row?.id===fact.actor);demand(request&&request.epoch===fact.epoch&&request.token===fact.freezeToken,'invalid_freeze_failure_scope_r85');}
 demand(new Set(facts.map(f=>f.channel+':'+f.incarnation)).size===1,'invalid_freeze_failure_scope_r85');
 if(facts.some(f=>f.stage==='not_started'))demand(facts.length===requests.length&&facts.every(f=>f.stage==='not_started'),'invalid_freeze_failure_scope_r85');
}
export function attachFreezeFailuresR85(error,rows){demand(error?.code==='actor_command_pending','invalid_freeze_failure_code_r85');known.set(error,snapshots(rows));return error;}
export function freezeFailuresR85(error){return known.get(error)??empty;}
function disjoint(error,facts){demand(!facts.some(f=>actorIsolations(error).some(p=>p.actor===f.actor)),'invalid_freeze_failure_overlap_r85');}
export function controlFreezeFailureForR85(error,method,payload){
 // A wrapper such as admit_held may already have admitted an actor before its
 // inner freeze rejects. Its outer failure is never a not-started freeze RPC.
 // Emit only the coded error there; incoming cross-scope facts still fail closed.
 if(!['freeze','freeze_group','freeze_idle_group'].includes(method))return null;
 const facts=freezeFailuresR85(error);if(!facts.length)return null;demand(error?.code==='actor_command_pending','invalid_freeze_failure_code_r85');matches(facts,method,payload);disjoint(error,facts);return facts;
}
export function receiveFreezeFailureR85(error,rows,method,payload){if(rows===undefined)return error;demand(error?.code==='actor_command_pending','invalid_freeze_failure_code_r85');const facts=snapshots(rows);matches(facts,method,payload);disjoint(error,facts);known.set(error,facts);return error;}

// The outer runtime may reject before starting either auxiliary traffic holds
// or resident freezes. Authenticate that entire unstarted request explicitly,
// so the parent never sends refresh/resume for a hold that did not exist.
export function rejectPendingFreezeStartR85(runtime,requests){
 const pending=requests.filter(request=>runtime.commandRecovery.hasActor(request.id,{confirmedOnly:true}));if(!pending.length)return;
 for(const request of requests)runtime.channel.control.validate(request);
 const error=kernelError('actor_command_pending'),ids=new Set(requests.map(r=>r.id));
 const alreadyStarted=requests.some(r=>runtime.channel.control.entries.has(r.id)||runtime.channel.control.completed.has(r.token))||[...runtime.coldTraffic.values()].some(row=>ids.has(row.id));
 if(alreadyStarted)throw error;
 const pendingIds=new Set(pending.map(r=>r.id));
 throw attachFreezeFailuresR85(error,requests.map(request=>({actor:request.id,epoch:request.epoch,freezeToken:request.token,channel:runtime.peer.channel,incarnation:runtime.peer.incarnation,stage:'not_started',pending:pendingIds.has(request.id)})));
}
