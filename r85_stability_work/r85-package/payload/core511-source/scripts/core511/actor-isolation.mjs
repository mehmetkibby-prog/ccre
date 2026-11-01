import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorFrameIsolation} from './r48_3-options.mjs';
import {actorIsolations} from './actor-isolation-proof.mjs';
import {freezeFailuresR85} from './freeze-failure-r85.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {requestDigest,opaqueId} from './generated/owner-protocol.mjs';
import {readReceipt} from './compact-receipt.mjs';

// The authenticated channel supplies a stopped-actor proof, not a timeout.
// The original gameplay/HTTP callback is never replayed. A queued retirement
// runs after the cold operation has unwound, outside its freeze request.
export class ActorIsolation {
 constructor(core){this.core=core;this.entries=new Map();this.unknown=new Map();this.unknownActors=new Map();}
 hasPending(id){return actorFaultIsolation&&(this.entries.has(id)||this.unknownActors.has(id));}
 markUnknown(peer,request,digest){
  const old=this.unknown.get(request.operationId);if(old){demand(old.digest===digest&&old.peer.channel===peer.channel&&old.peer.incarnation===peer.incarnation,'operation_id_reused');return;}
  demand(this.unknown.size<100,'actor_unknown_capacity');
  const ids=request.statusVersion===1?request.actors:[...new Set([request.playerId,...(request.payload?.resources??[]).filter(k=>typeof k==='string'&&k.startsWith('player:')).map(k=>k.slice(7))])];demand(ids.length<=100&&this.unknownActors.size+ids.filter(id=>!this.unknownActors.has(id)).length<=4096,'actor_unknown_resources');
  const row={operationId:request.operationId,actor:request.playerId,epoch:request.epoch,sequence:request.sequence,peer:{...peer},digest,owners:ids.map(id=>({id,owner:this.core.authority.owner(id)}))};this.unknown.set(request.operationId,row);
  for(const {id}of row.owners){let entries=this.unknownActors.get(id);if(!entries)this.unknownActors.set(id,entries=new Set());entries.add(row);}
 }
 clearUnknown(operationId){const row=this.unknown.get(operationId);if(!row)return;this.unknown.delete(operationId);for(const {id}of row.owners){const entries=this.unknownActors.get(id);entries?.delete(row);if(!entries?.size)this.unknownActors.delete(id);}}
 retiredProcess(peer){
  if(!actorFaultIsolation)return;const process=this.core.processes.get(peer.channel);demand(process?.online===false&&process.peer.incarnation===peer.incarnation,'actor_isolation_process_live');
  // Only CoordinatorRecovery calls this AFTER actual OS exit and durable
  // disconnectProcess. Replacement registration supplies a fresh epoch.
  for(const row of this.unknown.values())if(row.peer.channel===peer.channel&&row.peer.incarnation===peer.incarnation)this.clearUnknown(row.operationId);
  for(const [id,row]of this.entries)if(row.peer.channel===peer.channel&&row.peer.incarnation===peer.incarnation)this.entries.delete(id);
  if(actorFrameIsolation)this.core.authority.commandOutcomes?.forgetProcess(peer);
 }
 async commandStatus(peer,request){
  demand(actorFaultIsolation,'actor_isolation_disabled');const c=this.core,sql=c.database.sqlite;
  const {playerId,epoch,sequence,operationId,operation,payload}=request??{};
  opaqueId(playerId);opaqueId(operationId);demand(Number.isSafeInteger(epoch)&&epoch>0&&Number.isSafeInteger(sequence)&&sequence>0&&typeof operation==='string'&&Object.hasOwn(c.authority.operations,operation),'invalid_channel_command');
  c.process(peer);
  demand(!sql.isTransaction,'actor_status_uncommitted');
  let digest;
  if(request.statusVersion!==undefined){
   demand(request.statusVersion===1&&typeof request.digest==='string'&&/^[a-f0-9]{64}$/.test(request.digest)&&Array.isArray(request.actors)&&request.actors.length>0&&request.actors.length<=100&&request.actors.includes(playerId)&&new Set(request.actors).size===request.actors.length,'actor_status_descriptor');for(const id of request.actors)opaqueId(id);digest=request.digest;
  }else digest=requestDigest({realmId:c.realmId,channel:peer.channel,playerId,epoch,sequence,operation,payload});
  if(!actorFrameIsolation){const negative=c.sharedWorld?.combat.rejectedStatus(peer,request,digest);if(negative)return negative;}
  const receipt=prepareCached477(sql,'SELECT * FROM kernel511_channel_receipts WHERE operation_id=?').get(operationId);
  if(!receipt){
   const owner=c.authority.assertSimulated(sql,peer,playerId,epoch,{allowDraining:true});
   if(actorFrameIsolation){
    const outcomes=c.authority.commandOutcomes,inFlight=outcomes?.inFlight(request)===true;
    // A receipt always wins. Shared negatives additionally require the
    // bridge's completed shared_abort; an actor-only rollback is insufficient.
    const negative=!inFlight&&(c.sharedWorld?.combat.rejectedStatus(peer,request,digest)??outcomes?.rejectedStatus(peer,request,digest));
    if(negative&&owner.sequence<sequence){this.clearUnknown(operationId);return negative;}
    this.markUnknown(peer,request,digest);
    return {status:'unresolved',diagnostic:{operationId,operation,sequence,ownerSequence:owner.sequence,receiptPresent:false,rollbackProven:false,inFlight}};
   }
   this.markUnknown(peer,request,digest);return {status:'unresolved'};
  }
  demand(receipt.player_id===playerId&&receipt.epoch===epoch&&receipt.sequence===sequence&&receipt.digest===digest,'operation_id_reused');
  const ack=readReceipt(sql,receipt.response);
  // Capture the receipt before the durability barrier. Missing ACK is not
  // rollback, and reading a committed SQLite row alone is not durable ACK.
  await c.writer.durableExternal();c.process(peer);
  const combat=c.sharedWorld?.combat,shared=combat?.ownsStatus(peer,request),move=shared&&ack.result?.moves?.find(m=>m.id===playerId&&m.source?.epoch===epoch&&m.source.channel===peer.channel&&m.source.incarnation===peer.incarnation);
  const owner=c.authority.owner(playerId);demand(move?owner?.epoch===move.target.epoch&&owner.channel===move.target.channel&&owner.incarnation===move.target.incarnation&&owner.sequence===0:owner?.epoch===epoch&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.sequence===sequence,'actor_status_owner_changed');
  if(shared)await combat.reconcileStatus(peer,request,ack);
  this.clearUnknown(operationId);if(actorFrameIsolation)c.authority.commandOutcomes?.pruneActor(playerId);return {status:'committed',ack};
 }
 guard(peer,request,resources=request.payload?.resources??[]){
  if(!actorFaultIsolation)return;
  const ids=[request.playerId,...resources.filter(k=>typeof k==='string'&&k.startsWith('player:')).map(k=>k.slice(7))];
  let exact;
  for(const id of ids){
   demand(!this.entries.has(id)||this.core.sharedWorld?.combat.stoppedAllows?.(id,peer,request),'permanent_actor_fenced');const pending=this.unknownActors.get(id);if(!pending)continue;
   // A status read may overtake an original command already queued in the
   // parent. Let ONLY that exact original request finish; blocking it would
   // manufacture a permanent missing receipt. No callback retry is scheduled.
   if(exact===undefined){const row=this.unknown.get(request.operationId);exact=Boolean(row&&row.actor===request.playerId&&row.epoch===request.epoch&&row.sequence===request.sequence&&row.peer.channel===peer.channel&&row.peer.incarnation===peer.incarnation&&row.digest===requestDigest({realmId:this.core.realmId,channel:peer.channel,playerId:request.playerId,epoch:request.epoch,sequence:request.sequence,operation:request.operation,payload:request.payload}));}
   demand(exact&&[...pending].every(row=>row.operationId===request.operationId),'permanent_actor_fenced');
  }
 }
 assertAvailable(ids){if(actorFaultIsolation)for(const id of ids){demand(!this.unknownActors.has(id),'actor_command_pending');const row=this.entries.get(id);demand(!row||row.phase==='retiring','permanent_actor_fenced');}}
 matches(row,peer,p){return row.peer.channel===peer.channel&&row.peer.incarnation===peer.incarnation&&row.epoch===p.epoch&&row.token===p.token&&row.finalSequence===p.finalSequence&&row.session===p.session;}
 request(peer,p){
  demand(actorFaultIsolation,'actor_isolation_disabled');
  demand(p&&typeof p.actor==='string'&&p.actor.length>0&&p.actor.length<=160&&Number.isSafeInteger(p.epoch)&&p.epoch>0&&typeof p.token==='string'&&p.token.length>=8&&p.token.length<=160&&typeof p.session==='string'&&p.session.length<=160&&p.stopped===true&&Number.isSafeInteger(p.finalSequence)&&p.finalSequence>=0&&typeof p.reason==='string'&&p.reason.length<=96,'actor_isolation_proof');
  const c=this.core,prior=this.entries.get(p.actor);
  if(prior){demand(this.matches(prior,peer,p),'actor_isolation_replaced');return {queued:true,token:prior.token};}
  c.process(peer);const owner=c.authority.owner(p.actor),admission=c.authority.admission(p.actor),simulation=c.authority.simulation(p.actor);
  demand(owner?.state==='active'&&owner.epoch===p.epoch&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&owner.sequence===p.finalSequence,'actor_isolation_owner_fenced');
  demand(admission?admission.epoch===p.epoch&&admission.session_id===p.session:simulation?.epoch===p.epoch&&p.session==='simulation:'+simulation.run_id,'actor_isolation_session_fenced');
  demand(this.entries.size<100,'actor_isolation_capacity');
  const row={...p,peer:{...peer},phase:'queued',running:null,attempts:0,oldSimulation:simulation?.run_id??null};this.entries.set(p.actor,row);
  c.presence.revoke({actor:p.actor});const s=c.sessions.get(p.actor);if(s&&s.identity.epoch===p.epoch)s.security={...s.security,blocked:true};
  this.queue(row);return {queued:true,token:row.token};
 }
 queue(row){
  if(row.running||this.entries.get(row.actor)!==row)return;
  row.attempts++;
  row.running=this.core.serial(()=>this.settle(row),{duringGlobal:true}).catch(error=>{
   row.error=error;row.nextAttemptAt=(this.core.clock?.()??Date.now())+[2000,5000,10000,30000][Math.min(row.attempts-1,3)];
   // An actor remains fenced on failed reconciliation. This report never
   // converts an unknown transaction into a retry of the original operation.
   const fatal=/^SQLITE_(CORRUPT|NOTADB|IOERR|FULL)/.test(error?.code??'');
   this.core.onFault({actor:row.actor,error,authentication:!fatal,actorIsolation:true});
  }).finally(()=>{row.running=null;});
 }
 retry(){if(actorFaultIsolation)for(const row of this.entries.values())if(!row.running&&(row.nextAttemptAt??0)<=(this.core.clock?.()??Date.now()))this.queue(row);}
 async settle(row){
  const c=this.core,id=row.actor;demand(this.entries.get(id)===row,'actor_isolation_replaced');c.process(row.peer);
  demand(!c.permanent.entries.has(id)&&!c.transitions.has(id),'actor_isolation_cold_pending');
  await c.writer.durableExternal();
  const owner=c.authority.owner(id),admission=c.authority.admission(id),simulation=c.authority.simulation(id);
  let result;
  if(owner?.epoch===row.epoch){
   demand(owner.channel===row.peer.channel&&owner.incarnation===row.peer.incarnation&&owner.state==='active'&&owner.sequence===row.finalSequence,'actor_isolation_owner_fenced');
   // A passive actor also retires its old epoch: ResidentState correctly
   // refuses to claim a previously released epoch. Keep its dungeon run and
   // gameplay rows, changing only this proven-drained ownership watermark.
   if(!admission){
    demand(simulation?.epoch===row.epoch&&simulation.run_id===row.oldSimulation,'actor_isolation_session_fenced');row.phase='retiring';
    result=await c.database.atomic(sql=>{
     c.authority.admissionGuard?.([id]);const current=c.authority.assertSimulated(sql,row.peer,id,row.epoch),currentSimulation=c.authority.simulation(id,sql);
     demand(!c.authority.admission(id,sql)&&current.sequence===row.finalSequence&&currentSimulation?.run_id===row.oldSimulation,'actor_isolation_passive_fenced');
     prepareCached477(sql,'UPDATE kernel511_channel_owners SET epoch=epoch+1,sequence=0,updated_ms=? WHERE player_id=?').run(c.clock(),id);
     prepareCached477(sql,'UPDATE kernel511_simulations SET epoch=epoch+1 WHERE player_id=?').run(id);
     return {simulation:row.oldSimulation,epoch:row.epoch+1};
    });c.writer.refreshOwners();
   }
   else{demand(admission.session_id===row.session&&admission.epoch===row.epoch,'actor_isolation_session_fenced');row.phase='retiring';result=await c.writer.logout(id,row.peer,{epoch:row.epoch,sessionId:row.session,finalSequence:row.finalSequence});}
  }else{
   // The only retryable retirement is this exact old epoch -> next epoch,
   // with no new admission. Read and sync the committed authority, never
   // execute logout (or the player's original operation) a second time.
   demand(row.phase==='retiring'&&owner?.epoch===row.epoch+1&&owner.channel===row.peer.channel&&owner.incarnation===row.peer.incarnation&&owner.state==='active'&&owner.sequence===0&&!admission&&(!simulation||simulation.epoch===owner.epoch),'actor_isolation_retirement_unknown');
   result={loggedOut:true,epoch:owner.epoch,...(simulation?{simulation:simulation.run_id}:{})};
  }
  await c.writer.durableExternal();c.writer.refreshOwners?.();
  const ack=await c.process(row.peer).control.request('isolate_detach',{actor:id,epoch:row.epoch,token:row.token,nextEpoch:result.epoch});
  demand(ack?.detached===true&&ack.actor===id&&ack.epoch===row.epoch&&ack.token===row.token,'actor_isolation_detach_mismatch');
  c.sessions.delete(id);c.presence.revoke({actor:id});
  if(result.simulation){
   const bundle=await c.load(id),next=c.authority.owner(id),identity={actor:id,account:bundle.player.account_id??'offline',session:'simulation:'+result.simulation,epoch:next.epoch,channel:next.channel,boot:next.incarnation,realm:c.realmId};
   const admitted=await c.process(row.peer).control.request('admit_passive',{bundle,identity});demand(admitted?.admitted===true,'actor_isolation_passive_admission');
  }
  this.entries.delete(id);if(actorFrameIsolation)c.authority.commandOutcomes?.pruneActor(id);return {isolated:true,epoch:result.epoch};
 }
 pendingFreezeEntry(entry){
  const id=entry.id??entry.request?.id,owner=entry.owner,current=this.core.authority.owner(id);
  if(!owner||current?.epoch!==owner.epoch||current.channel!==owner.channel||current.incarnation!==owner.incarnation)return false;
  return [...this.unknownActors.get(id)??[]].some(row=>row.owners.some(p=>p.id===id&&p.owner?.epoch===owner.epoch&&p.owner.channel===owner.channel&&p.owner.incarnation===owner.incarnation));
 }
 pendingFreezeEntries(held,error){
  if(error?.code!=='actor_command_pending')return null;
  const facts=freezeFailuresR85(error);if(!facts.length||facts.some(f=>actorIsolations(error).some(p=>p.actor===f.actor)))return null;
  const rows=facts.map(fact=>({fact,entry:held.find(entry=>(entry.id??entry.request?.id)===fact.actor&&(entry.token??entry.request?.token)===fact.freezeToken&&entry.owner?.epoch===fact.epoch&&entry.owner.channel===fact.channel&&entry.owner.incarnation===fact.incarnation)}));
  if(rows.some(({fact,entry})=>{if(!entry)return true;const owner=this.core.authority.owner(fact.actor);return owner?.epoch!==fact.epoch||owner.channel!==fact.channel||owner.incarnation!==fact.incarnation||fact.pending&&!this.pendingFreezeEntry(entry);}))return null;
  return rows;
 }
 pendingFreeze(held,error){return this.pendingFreezeEntries(held,error)!==null;}
 async rejectTransitions(held,error){
  const rows=held.map(entry=>({original:entry,id:entry.request.id,token:entry.request.token,owner:entry.owner,phase:entry.phase,admission:entry.admission??this.core.authority.admission(entry.request.id),simulation:entry.simulation??this.core.authority.simulation(entry.request.id),endpoint:this.core.endpoint(entry.owner.channel,entry.owner.incarnation)}));
  return this.rejectFreeze(rows,error,this.core.transitions);
 }
 async rejectFreeze(held,error,store=this.core.permanent.entries){
  if(!actorFaultIsolation||held.some(e=>e.phase!=='freezing'))return false;
  const proofs=actorIsolations(error),bad=new Set(),pending=this.pendingFreezeEntries(held,error);
  if(error.code==='actor_command_pending'&&!pending)return false;
  if(proofs.length){
   const matches=proofs.map(proof=>({proof,entry:held.find(e=>e.id===proof.actor&&e.owner?.epoch===proof.epoch&&e.owner.channel===proof.channel&&e.owner.incarnation===proof.incarnation&&e.token===proof.freezeToken)}));if(matches.some(m=>!m.entry)||new Set(matches.map(m=>m.entry)).size!==matches.length)return false;
   for(const {proof,entry}of matches){bad.add(entry);this.request({channel:proof.channel,incarnation:proof.incarnation,realm:this.core.realmId},{...proof,session:entry.admission?.session_id??'simulation:'+entry.simulation?.run_id,reason:proof.reason??error.code});}
  }
  // Every pending actor has exact registry proof. An authenticated not_started
  // member owns no resident/cold-traffic hold, so must not be refreshed/resumed.
  for(const {entry}of pending??[])bad.add(entry);
  if(!bad.size)return false;
  // The synchronous cold callback has not been entered. Good members may
  // already be frozen; refresh CURRENT DB and resume each exact original
  // token. The failed actor stays quarantined for queued durable retirement.
  for(const entry of held){
   if(bad.has(entry))continue;
   if(entry.endpoint){const request={id:entry.id,epoch:entry.owner.epoch,token:entry.token};const ack=await entry.endpoint.refresh(request);demand(ack?.refreshed===true&&ack.id===entry.id&&ack.epoch===entry.owner.epoch&&ack.token===entry.token,'actor_isolation_group_refresh');entry.phase='releasing';if(entry.original)entry.original.phase='releasing';const resumed=await entry.endpoint.resume(request);demand(resumed?.resumed===true&&resumed.epoch===entry.owner.epoch&&resumed.token===entry.token,'actor_isolation_group_resume');}
  }
  for(const entry of held){
   const original=entry.original??entry;demand(store.get(entry.id)===original,'actor_isolation_lease_changed');
   const fact=pending?.find(row=>row.entry===entry)?.fact;
   if(fact?.stage==='pending_command'&&typeof entry.endpoint?.cancelPending==='function'){
    // Healthy actors and the cold serial lane are already released. Retain
    // this exact pending actor's parent fence until its existing native result
    // permits the child to checkpoint, refresh and resume the aborted freeze.
    const request={id:entry.id,epoch:entry.owner.epoch,token:entry.token};
    original.pendingCleanupR85=Promise.resolve().then(()=>entry.endpoint.cancelPending(request)).then(ack=>{
     demand(ack?.id===entry.id&&ack.epoch===entry.owner.epoch&&ack.token===entry.token&&ack.resumed===true&&ack.cancelledPendingR85===true,'actor_pending_cleanup_ack');
     if(store.get(entry.id)!==original)return;const owner=this.core.authority.owner(entry.id);
     demand(owner?.epoch===entry.owner.epoch&&owner.channel===entry.owner.channel&&owner.incarnation===entry.owner.incarnation,'actor_pending_cleanup_owner');store.delete(entry.id);
    }).catch(error=>{if(store.get(entry.id)!==original)return;original.phase='unknown';this.core.onFault({actor:entry.id,error});});
   }else store.delete(entry.id);
  }
  return true;
 }
}
