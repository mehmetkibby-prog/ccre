import {kernelError} from './contract.mjs';
import {commandOutputGuard} from './r50-command-output-options.mjs';
import {isCombatOutputLimit} from './bounded-combat-output.mjs';

export const COMMAND_OUTPUT_CODES=Object.freeze(['command_result_too_large','combat_event_id_required','combat_event_row_too_large','combat_event_metadata_too_large']);
// Preserve the existing 8 MiB multipart ceiling, including the longest allowed
// request ID (160 maximally JSON-escaped characters) and command_status wrapper.
const wireOverhead=Buffer.byteLength(JSON.stringify({type:'result',id:'\0'.repeat(160),ok:true,value:{status:'committed',ack:null}}))-4;
export const COMMAND_ACK_BYTES=8388608-wireOverhead;
const limits=new WeakSet(),rolledBack=new WeakMap();
export function assertCommandOutputSize(result,context){
 if(!commandOutputGuard)return;
 const bytes=Buffer.byteLength(JSON.stringify({key:context.key,result}));
 if(bytes<=COMMAND_ACK_BYTES)return;
 const error=Object.assign(kernelError('command_result_too_large'),{bytes,limit:COMMAND_ACK_BYTES});limits.add(error);throw error;
}
export const isCommandOutputLimit=error=>commandOutputGuard&&(limits.has(error)||isCombatOutputLimit(error));
// Called only after the existing command savepoint AND service state rollback.
// This is not yet an externally publishable not_executed outcome: the outer
// request transaction and durability boundary must still complete successfully.
export function markCommandOutputRollback(error,operation,context){
 if(!isCommandOutputLimit(error)||!COMMAND_OUTPUT_CODES.includes(error.code))return;
 rolledBack.set(error,{actor:context.actor,epoch:context.epoch,key:context.key,operation,channel:context.peer.channel,incarnation:context.peer.incarnation,code:error.code});
}
export function commandOutputRollbackProof(error,peer,request){
 if(!commandOutputGuard)return null;
 const proof=rolledBack.get(error);
 return proof&&proof.code===error.code&&proof.actor===request.playerId&&proof.epoch===request.epoch&&proof.key===request.operationId&&proof.operation===request.operation&&proof.channel===peer.channel&&proof.incarnation===peer.incarnation?proof:null;
}
