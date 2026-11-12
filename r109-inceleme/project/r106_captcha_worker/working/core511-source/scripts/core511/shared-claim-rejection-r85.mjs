import {kernelError} from './contract.mjs';

// Private provenance for an audited selected claim's unexpected cold effects.
// A code string or failed COMMIT cannot certify this outcome. The command
// savepoint AND native service state must roll back before ownership examines
// the proof; the outer request rollback/durability still must succeed there.
const mismatches=new WeakMap(),rolledBack=new WeakSet();
export function sharedClaimMismatchR85(payload,context){
 const error=kernelError('shared_terminal_actor_fenced');
 if(payload?.input?.action==='claim_rewards'&&typeof payload.sharedLease==='string'&&context?.peer){
  mismatches.set(error,{actor:context.actor,epoch:context.epoch,key:context.key,sequence:context.sequence,channel:context.peer.channel,incarnation:context.peer.incarnation,sharedLease:payload.sharedLease});
 }
 return error;
}
export const isSharedClaimMismatchR85=error=>mismatches.has(error);
export function markSharedClaimRollbackR85(error){if(mismatches.has(error))rolledBack.add(error);}
export function sharedClaimRollbackProofR85(error,peer,request){
 if(!rolledBack.has(error)||error?.code!=='shared_terminal_actor_fenced'||request.operation!=='native_action'||request.payload?.input?.action!=='claim_rewards')return null;
 const p=mismatches.get(error);
 return p&&p.actor===request.playerId&&p.epoch===request.epoch&&p.key===request.operationId&&p.sequence===request.sequence&&p.channel===peer.channel&&p.incarnation===peer.incarnation&&p.sharedLease===request.payload.sharedLease?p:null;
}
