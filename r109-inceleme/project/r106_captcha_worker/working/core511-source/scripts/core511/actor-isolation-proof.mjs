import {demand,validChannel} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {rewardRecoverySchedulerR52} from './r52-options.mjs';

// A stopped actor is a control-plane fact, not a durable command outcome.
// Only local quarantine may attach it; only the authenticated matching freeze
// response may reconstruct it in the parent. A code string carries no proof.
const known=new WeakMap();
const empty=Object.freeze([]);
const id=value=>typeof value==='string'&&value.length>0&&value.length<=160;
export function snapshotActorIsolation(proof){
 demand(proof?.stopped===true&&id(proof.actor)&&Number.isSafeInteger(proof.epoch)&&proof.epoch>0&&id(proof.token)&&proof.token.length>=8&&id(proof.freezeToken)&&proof.freezeToken.length>=8&&validChannel(proof.channel)&&id(proof.incarnation)&&Number.isSafeInteger(proof.finalSequence)&&proof.finalSequence>=0,'invalid_actor_isolation_proof');
 demand(proof.reason===undefined||typeof proof.reason==='string'&&/^[a-z0-9_]{1,80}$/.test(proof.reason),'invalid_actor_isolation_proof');
 return Object.freeze({actor:proof.actor,epoch:proof.epoch,token:proof.token,freezeToken:proof.freezeToken,channel:proof.channel,incarnation:proof.incarnation,finalSequence:proof.finalSequence,stopped:true,...(proof.reason===undefined?{}:{reason:proof.reason})});
}
function snapshots(proofs){
 demand(Array.isArray(proofs)&&proofs.length>0&&proofs.length<=100,'invalid_actor_isolation_proof');
 const rows=proofs.map(snapshotActorIsolation);demand(new Set(rows.map(row=>row.actor)).size===rows.length,'invalid_actor_isolation_proof');return Object.freeze(rows);
}
function matches(proofs,method,payload){
 const requests=method==='freeze'?[payload]:method==='freeze_group'||rewardRecoverySchedulerR52&&method==='freeze_idle_group'?payload?.requests:null;
 demand(Array.isArray(requests)&&requests.length>0&&requests.length<=100&&(method!=='freeze'||proofs.length===1),'invalid_actor_isolation_scope');
 for(const proof of proofs){const matching=requests.filter(row=>row?.id===proof.actor);demand(matching.length===1&&matching[0].epoch===proof.epoch&&matching[0].token===proof.freezeToken,'invalid_actor_isolation_scope');}
}
export function attachActorIsolation(error,proof){
 return attachActorIsolations(error,[proof]);
}
export function attachActorIsolations(error,proofs){if(actorFaultIsolation)known.set(error,snapshots(proofs));return error;}
export const brandControlIsolation=attachActorIsolation;
export function actorIsolations(error){return actorFaultIsolation?known.get(error)??empty:empty;}
export function actorIsolation(error){return actorIsolations(error)[0]??null;}
export function controlIsolationFor(error,method,payload){
 const proofs=actorIsolations(error);if(!proofs.length)return null;matches(proofs,method,payload);return proofs.length===1?proofs[0]:proofs;
}
export function receiveActorIsolation(error,proof,method,payload){
 if(!actorFaultIsolation||proof===undefined)return error;
 const accepted=snapshots(Array.isArray(proof)?proof:[proof]);matches(accepted,method,payload);known.set(error,accepted);return error;
}
