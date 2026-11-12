import {demand} from './contract.mjs';
import {recoveryWatchdog} from './r47-options.mjs';
import {lateRecoveryProof} from './r48-options.mjs';
import {demandFence} from './fence-diagnostics.mjs';

// Trusted supervisor API only. No channel/HTTP RPC exposes these operations.
// A replacement can register only after the old OS process has terminated and
// its persistent incarnation has been durably marked offline.
export class CoordinatorRecovery {
 constructor(coordinator){this.core=coordinator;this.exits=new Map();this.saved=new Map();}
 bindLateProofs(){
  // A queued operation can create its lease AFTER the actual exit callback
  // scanned existing leases. Retain the recorded proof before a failed boot
  // replaces exits[channel]. No timeout or DB epoch alone invents an OS exit.
  for(const entries of [this.core.permanent.entries,this.core.transitions])for(const entry of entries.values()){
   const owner=entry.owner;if(!owner)continue;
   const prior=entry.recoveryExit;if(prior?.peer.channel===owner.channel&&prior.peer.incarnation===owner.incarnation)continue;
   const proof=this.exits.get(owner.channel);
   if(proof?.peer.channel===owner.channel&&proof.peer.incarnation===owner.incarnation)entry.recoveryExit=proof;
  }
 }
 exited(peer,{terminated}){
  demand(terminated===true,'recovery_process_must_be_terminated');const c=this.core,row=c.processes.get(peer.channel);
  demand(row?.peer.incarnation===peer.incarnation,'recovery_incarnation_fenced');
  if(lateRecoveryProof)this.bindLateProofs();
  const old=this.exits.get(peer.channel);if(old?.peer.incarnation===peer.incarnation)return old.promise;
  const saved=new Map();for(const [id,s]of c.sessions)if(s.identity.boot===peer.incarnation){const p=c.presence.entries.get(id),snapshot={session:s.session,request:s.request,security:s.security,lastAt:p?.lastAt??0,exitAt:c.clock()};saved.set(id,snapshot);this.saved.set(id,snapshot);c.presence.revoke({actor:id});c.sessions.delete(id);}
  // Wake any lost freeze/ACK wait before waiting on the coordinator cold queue.
  row.online=false;row.control.close();c.budget.releaseProcess(peer.incarnation);
  const state={peer,saved,promise:null};this.exits.set(peer.channel,state);
  // Keep the proof on the bounded actor lease itself. A failed replacement
  // may overwrite exits[channel], but cannot erase proof of the older exit.
  if(recoveryWatchdog)for(const entries of [c.permanent.entries,c.transitions])for(const entry of entries.values())if(entry.owner?.incarnation===peer.incarnation)entry.recoveryExit=state;
  state.promise=c.authority.disconnectProcess(peer.channel,peer.incarnation).then(()=>{c.writer.refreshOwners();c.actorIsolation?.retiredProcess(peer);return {fenced:true};});return state.promise;
 }
 async requestFor(id,tokenHash,saved){
  const c=this.core,sql=c.database.sqlite,p=sql.prepare('SELECT g.instance_id FROM game_presence g JOIN auth_sessions s ON s.account_id=g.account_id WHERE s.token_hash=? AND g.token_hash=s.token_hash').get(tokenHash);
  demand(p?.instance_id,'recovery_presence_missing');
  return saved?.request??new Request([...c.origins][0]+'/api/realtime/core511-ticket',{method:'POST',headers:{Origin:[...c.origins][0],'X-Game-Instance':p.instance_id}});
 }
 async session(id,admission,saved){
  const c=this.core,request=await this.requestFor(id,admission.session_id,saved);let session=await c.auth.rules.getGameSessionByHash(admission.session_id,request,true);
  const prior=saved?.session,p=session?.gamePresence,at=saved?.lastAt??0,now=c.clock();
  // This is the SAME observed WS lease, without a clock extension. A deleted
  // row, new instance/token/version or expired central security cannot revive.
  if(session&&p&&prior&&at>0&&at<=now&&now<at+40000&&session.player?.id===id&&session.account.id===prior.account.id&&session.tokenHash===prior.tokenHash&&session.securityVersion===prior.securityVersion&&p.instanceId===prior.gamePresence?.instanceId&&p.tokenHash===prior.tokenHash&&saved.security.securityValidUntil>now&&!saved.security.blocked)
   session={...session,gamePresence:{...p,expiresAtMs:Math.max(p.expiresAtMs,at+40000)}};
  session=await c.auth.rules.validateGameSession(request,session);demand(session.player?.id===id,'recovery_session_owner');return {session,request};
 }
 async passive(owner){
  const c=this.core,bundle=await c.load(owner.player_id),id=owner.player_id;
  demand(bundle.owner.passive===1,'recovery_passive_owner');
  const identity={actor:id,account:bundle.player.account_id??'offline',session:'simulation:'+bundle.dungeon.memberships.find(([actor])=>actor===id)?.[1],epoch:owner.epoch,channel:owner.channel,boot:owner.incarnation,realm:c.realmId};
  await c.process(owner).control.request('admit_passive',{bundle,identity});c.sessions.delete(id);c.presence.revoke({actor:id});
 }
 restore(peer){return this.core.serial(async()=>{
  const c=this.core;demand(c.process(peer),'recovery_process_unavailable');const exit=this.exits.get(peer.channel);if(exit)await exit.promise;
  if(recoveryWatchdog){
   if(lateRecoveryProof)this.bindLateProofs();
   // The interrupted cold operation has finished on core.serial. The native
   // SQLite rows and their original atomic ledgers/receipts are authoritative;
   // never invoke the callback again or infer rollback from a missing ACK.
   const pending=[...c.permanent.entries].map(([id,entry])=>({id,entry,permanent:true})).concat([...c.transitions].map(([id,entry])=>({id,entry,permanent:false})))
    .filter(({id})=>c.authority.owner(id)?.channel===peer.channel);
   if(pending.length){
    await c.permanent.tail;await c.writer.durableExternal();
    for(const {id,entry,permanent}of pending){
     // Waiting for the cold queue/durability may have completed and removed
     // the captured lease normally. Never reconcile a different/new lease.
     if(lateRecoveryProof){const live=(permanent?c.permanent.entries:c.transitions).get(id);if(live!==entry){demand(!live,'recovery_lease_replaced');continue;}}
     if(lateRecoveryProof&&permanent&&entry.owner===null){c.permanent.reconciledOffline(id);continue;}
     const proof=entry.recoveryExit,current=c.authority.owner(id),admission=c.authority.admission(id),simulation=c.authority.simulation(id);
     if(lateRecoveryProof)demandFence(Boolean(entry.owner&&proof)&&entry.phase==='unknown'&&proof.peer.channel===entry.owner.channel&&proof.peer.incarnation===entry.owner.incarnation,'recovery_exit_proof_missing',()=>({operation:'recovery',phase:entry.phase,actor:id,channel:entry.owner?.channel,incarnation:entry.owner?.incarnation,ownerEpoch:entry.owner?.epoch,requestEpoch:current?.epoch,leaseKind:permanent?'permanent':'transition'}));
     else demand(entry.phase==='unknown'&&proof?.peer.incarnation===entry.owner?.incarnation,'recovery_exit_proof_missing');await proof.promise;
     demand(current?.state==='active'&&current.incarnation===peer.incarnation&&current.incarnation!==entry.owner.incarnation&&current.epoch>entry.owner.epoch,'recovery_owner_unresolved');
     demand([admission,simulation].every(row=>!row||row.channel===current.channel&&row.epoch===current.epoch),'recovery_admission_unresolved');
     if(permanent)c.permanent.reconciled(id,{incarnation:entry.owner.incarnation,recovered:true});else c.transitions.delete(id);
    }
   }
  }else if(exit){
   for(const [id,entry]of c.permanent.entries)if(entry.owner?.incarnation===exit.peer.incarnation)c.permanent.reconciled(id,{incarnation:exit.peer.incarnation,recovered:true});
   for(const [id,entry]of c.transitions)if(entry.owner.incarnation===exit.peer.incarnation){demand(entry.phase==='unknown'&&c.authority.owner(id)?.incarnation!==entry.owner.incarnation,'recovery_transition_unresolved');c.transitions.delete(id);}
  }
  const owners=c.database.sqlite.prepare("SELECT * FROM kernel511_channel_owners WHERE channel=? AND incarnation=? AND state='active' ORDER BY player_id").all(peer.channel,peer.incarnation);let active=0,passive=0,retired=0;
  for(const owner of owners){
   const id=owner.player_id,admission=c.authority.admission(id),simulation=c.authority.simulation(id),saved=this.saved.get(id);
   if(admission){
    let verified,denied=null;
    try{verified=await c.nativeGuildAuth.beforeAdmission(owner,()=>this.session(id,admission,saved));}catch(error){
     // An unknown cold auth write must terminate this unactivated owner. It
     // cannot be treated as a normal account denial followed by logout.
     if(['native_guild_auth_cold_uncertain','native_realm_security_cold_uncertain'].includes(error.code))throw error;denied=error;
    }
    const securityRetirement=c.nativeRealmSecurity.takeRetirement(owner);
    if(denied||securityRetirement){
     // The old process is gone, and registerProcess has loaded its final
     // durable checkpoint under a fresh epoch. No live writer needs thawing.
     const result=securityRetirement??await c.writer.logout(id,peer,{epoch:owner.epoch,sessionId:admission.session_id,finalSequence:owner.sequence});retired++;c.sessions.delete(id);c.presence.revoke({actor:id});
     if(result.simulation){await this.passive(c.authority.owner(id));passive++;}this.saved.delete(id);continue;
    }
    const s=await c.install(verified.session,owner,verified.request);s.disconnectedAt=saved?.exitAt??c.clock();
    if(saved?.lastAt&&c.clock()-saved.lastAt<40000)c.presence.seen(peer,s.identity,saved.lastAt);active++;
   }else if(simulation){await this.passive(owner);passive++;}
   this.saved.delete(id);
  }
  this.exits.delete(peer.channel);return {active,passive,retired};
 },{duringGlobal:true});}
}
