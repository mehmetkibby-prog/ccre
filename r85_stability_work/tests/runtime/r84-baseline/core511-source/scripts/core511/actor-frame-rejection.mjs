import {kernelError} from './contract.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';

// These exact comparison guards run inside the actor's request transaction.
// A public code/fenceContext received over IPC is never rollback provenance.
const operations=Object.freeze({
 action_frame_conflict:'native_action',
 attack_frame_conflict:'attack',
 attack_settings_conflict:'attack',
 movement_frame_conflict:'movement',
 heartbeat_frame_conflict:'heartbeat',
 pvp_frame_conflict:'pvp_attack',
 retaliation_snapshot_conflict:'retaliation_death',
 retaliation_engagement_conflict:'retaliation_death',
 retaliation_settings_conflict:'retaliation_death',
 encounter_snapshot_conflict:'actor_checkpoint'
});
export const ACTOR_FRAME_CONFLICT_CODES=Object.freeze(Object.keys(operations));
export const isActorFrameConflictCode=code=>typeof code==='string'&&Object.hasOwn(operations,code);
const conflicts=new WeakMap();
export function actorFrameConflict(code,context,sqlite){
 const error=kernelError(code);
 if(actorFrameIsolation&&sqlite?.isTransaction===true&&isActorFrameConflictCode(code)&&typeof context?.actor==='string'&&typeof context?.key==='string'&&Number.isSafeInteger(context?.epoch)&&context.epoch>0&&Number.isSafeInteger(context?.peer?.channel)&&typeof context?.peer?.incarnation==='string'){
  const proof=Object.freeze({actor:context.actor,epoch:context.epoch,key:context.key,channel:context.peer.channel,incarnation:context.peer.incarnation,operation:operations[code],code});
  conflicts.set(error,proof);
 }
 return error;
}
export function actorFrameConflictProof(error,peer,request){
 if(!actorFrameIsolation)return null;
 const proof=conflicts.get(error);
 return proof&&proof.code===error.code&&proof.operation===request.operation&&proof.actor===request.playerId&&proof.epoch===request.epoch&&proof.key===request.operationId&&proof.channel===peer.channel&&proof.incarnation===peer.incarnation?proof:null;
}
