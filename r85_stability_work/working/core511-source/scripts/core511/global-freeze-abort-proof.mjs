import {demand,validChannel} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {snapshotActorIsolation} from './actor-isolation-proof.mjs';

// This is a completed control-plane unwind, never proof of a command outcome.
// Only the local world-freeze owner may mint it, after every drain settles and
// healthy residents resume. An ordinary error code/property cannot mint it.
const known=new WeakMap();
function snapshot(proof){
 demand(proof?.aborted===true&&typeof proof.token==='string'&&proof.token.length>=16&&proof.token.length<=160&&Number.isSafeInteger(proof.cycle)&&proof.cycle>=0&&validChannel(proof.channel)&&typeof proof.incarnation==='string'&&proof.incarnation.length>0&&proof.incarnation.length<=160&&Array.isArray(proof.actors)&&proof.actors.length>0&&proof.actors.length<=100,'invalid_global_freeze_abort_proof');
 const actors=proof.actors.map(snapshotActorIsolation);
 demand(new Set(actors.map(row=>row.actor)).size===actors.length&&actors.every(row=>row.freezeToken===proof.token&&row.channel===proof.channel&&row.incarnation===proof.incarnation),'invalid_global_freeze_abort_proof');
 return Object.freeze({token:proof.token,cycle:proof.cycle,channel:proof.channel,incarnation:proof.incarnation,aborted:true,actors:Object.freeze(actors)});
}
function matches(proof,method,payload){demand(method==='global_freeze'&&payload?.token===proof.token&&payload?.cycle===proof.cycle,'invalid_global_freeze_abort_scope');}
export function attachGlobalFreezeAbort(error,proof){if(actorFaultIsolation)known.set(error,snapshot(proof));return error;}
export function globalFreezeAbort(error){return actorFaultIsolation?known.get(error)??null:null;}
export function controlGlobalFreezeAbortFor(error,method,payload){const proof=globalFreezeAbort(error);if(proof)matches(proof,method,payload);return proof;}
export function receiveGlobalFreezeAbort(error,proof,method,payload){if(!actorFaultIsolation||proof===undefined)return error;const accepted=snapshot(proof);matches(accepted,method,payload);known.set(error,accepted);return error;}
