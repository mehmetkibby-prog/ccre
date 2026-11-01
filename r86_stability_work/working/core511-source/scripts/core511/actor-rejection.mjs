import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
import {ACTOR_FRAME_CONFLICT_CODES} from './actor-frame-rejection.mjs';
import {commandOutputGuard} from './r50-command-output-options.mjs';
import {COMMAND_OUTPUT_CODES} from './command-output-guard.mjs';
import {rewardWorkerR533,sharedRejectionR533} from './r533-options.mjs';

// Only the writer's pre-execution guard may mint this outcome. A code string
// alone or a failed COMMIT is never sufficient. Shared terminal requests need
// their separate, outer-rollback-confirmed pre-execution guard proof.
const known=new WeakMap();
const codes=new Set(['owner_epoch_fenced','simulation_epoch_fenced','shared_terminal_actor_fenced','transition_actor_fenced','permanent_actor_fenced','local_kill_requires_shared','local_claim_requires_shared','local_collect_requires_shared']);
if(rewardWorkerR533)codes.add('reward_worker_rolled_back');
const sharedCodes=new Set(codes);
const unsubmittedSharedCodes=new Set(['ipc_frame_size','ipc_backpressure']);
// A real shared lease is signed JSON (verifySharedLease accepts up to 8192
// characters), not an opaque operation id. Truncating its admissible length
// to 160 silently discarded proven rollback and triggered global recovery.
const sharedLeaseBound=sharedRejectionR533?8192:160;
const validSharedLease=lease=>typeof lease==='string'&&lease.length>=8&&lease.length<=sharedLeaseBound;
if(actorFaultIsolation)for(const code of ['checkpoint_snapshot_conflict','ipc_frame_size','ipc_backpressure'])codes.add(code);
if(actorFrameIsolation)for(const code of ACTOR_FRAME_CONFLICT_CODES){codes.add(code);sharedCodes.add(code);}
if(commandOutputGuard)for(const code of COMMAND_OUTPUT_CODES){codes.add(code);sharedCodes.add(code);}
export function rejectActorJob(error,peer,request){
 if(!codes.has(error?.code)||request.payload?.sharedLease)return error;
 known.set(error,Object.freeze({actor:request.playerId,epoch:request.epoch,sequence:request.sequence,key:request.operationId,operation:request.operation,channel:peer.channel,incarnation:peer.incarnation,outcome:'not_executed',...(error.fenceContext?.checkpointColumns?{checkpointColumns:error.fenceContext.checkpointColumns}:{})}));return error;
}
export function rejectSharedActorJob(error,peer,request){
 const sharedLease=request.payload?.sharedLease;
 if(!actorFaultIsolation||!sharedCodes.has(error?.code)||!validSharedLease(sharedLease))return error;
 known.set(error,Object.freeze({actor:request.playerId,epoch:request.epoch,sequence:request.sequence,key:request.operationId,operation:request.operation,channel:peer.channel,incarnation:peer.incarnation,sharedLease,outcome:'not_executed'}));return error;
}
// The transport caller must first consume its private exact-request pre-send
// proof. This marker allows cancellation of an unused shared lease only; it
// cannot be inferred from an oversized reply or an unknown COMMIT.
export function rejectUnsubmittedSharedActorJob(error,peer,request){
 const sharedLease=request.payload?.sharedLease;
 if(!actorFaultIsolation||!unsubmittedSharedCodes.has(error?.code)||!validSharedLease(sharedLease))return error;
 known.set(error,Object.freeze({actor:request.playerId,epoch:request.epoch,sequence:request.sequence,key:request.operationId,operation:request.operation,channel:peer.channel,incarnation:peer.incarnation,sharedLease,unsubmitted:true,outcome:'not_executed'}));return error;
}
export function actorRejection(error){return known.get(error)??null;}
export function receiveActorRejection(error,outcome,method,request){
 if(outcome===undefined)return error;
 const shared=request.payload?.sharedLease;
 demand(method==='command'&&outcome?.outcome==='not_executed'&&codes.has(error.code)&&outcome.actor===request.playerId&&outcome.epoch===request.epoch&&outcome.sequence===request.sequence&&outcome.key===request.operationId&&outcome.operation===request.operation&&(shared?actorFaultIsolation&&outcome.sharedLease===shared&&(outcome.unsubmitted===true?unsubmittedSharedCodes.has(error.code):outcome.unsubmitted===undefined&&sharedCodes.has(error.code)):outcome.sharedLease===undefined&&outcome.unsubmitted===undefined),'invalid_actor_rejection');
 known.set(error,Object.freeze({...outcome}));return error;
}
