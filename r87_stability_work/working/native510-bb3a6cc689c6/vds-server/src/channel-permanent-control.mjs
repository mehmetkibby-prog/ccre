import {installRuneV2HealthControl485} from './rune-v2-health485.mjs';
// Main requests this only for participants of a permanent economic operation.
// Freeze/flush is sparse; there is no per-tick main readback or state transport.
export function installChannelPermanentControl(rpc,db){
 installRuneV2HealthControl485(rpc,db);
 const fences=new Map();db.permanentWait=new Map();
 rpc.handlers.permanentFreeze=async({id,token})=>{
  if(fences.has(id)||db.drainingPlayers.has(id))throw Error('owner_draining');
  await db.ensureOwner(id);let release;const promise=new Promise(r=>release=r);
  db.permanentWait.set(id,{promise,release});fences.set(id,token);
  await db.freezePlayer(id);return {ok:true};
 };
 rpc.handlers.permanentResume=async({id,token})=>{
  if(fences.get(id)!==token)throw Error('invalid_permanent_fence');
  await db.applyCommitted([{table:'players',id,keys:[id],owner:id,staticChanged:'permanent_action'}]);
  fences.delete(id);db.drainingPlayers.delete(id);
  const wait=db.permanentWait.get(id);db.permanentWait.delete(id);wait.release();return {ok:true};
 };
}
