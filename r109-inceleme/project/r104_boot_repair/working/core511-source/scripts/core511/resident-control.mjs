import {joinFreezeRequestsR85} from './freeze-outcomes-r85.mjs';
import {attachFreezeFailuresR85} from './freeze-failure-r85.mjs';
import {demand,kernelError} from './contract.mjs';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {attachActorIsolation,attachActorIsolations,actorIsolations} from './actor-isolation-proof.mjs';
import {rewardGroupIdleR52} from './reward-recovery-r52.mjs';

// Bound only to the parent's authenticated persistent control connection.
// Replayed freeze/resume requests share their original work. Cold hydration is
// performed while the actor and all of its equipment-dependent views are held.
export class ResidentControl {
 constructor({kernel,peer,lanes,checkpoints,combatCheckpoints,writer,frames,readBundle,applyBundle,drainModes=async()=>{},drainModesGroup=async ids=>{for(const id of ids)await drainModes(id);},unknownActor=()=>false,quarantined=()=>null,onFault=()=>{}}){
  demand(kernel&&peer&&lanes&&checkpoints&&combatCheckpoints&&writer&&frames&&typeof readBundle==='function'&&typeof applyBundle==='function','resident_control_dependencies');
  Object.assign(this,{kernel,peer,lanes,checkpoints,combatCheckpoints,writer,frames,readBundle,applyBundle,drainModes,drainModesGroup,unknownActor,quarantined,onFault});this.entries=new Map();this.completed=new Map();this.pendingFreezesR85=new Map();this.idleGroups=new Map();this.idleMetrics={attempted:0,deferred:0,acquired:0,completed:0,failed:0,replayed:0};
 }
 validate({id,epoch,token}){demand(typeof id==='string'&&Number.isSafeInteger(epoch)&&epoch>0&&typeof token==='string'&&token.length>=8&&token.length<=160,'resident_control_request');}
 freezeIdleGroup(requests,beforeDrain=null){
  demand(Array.isArray(requests)&&requests.length>0&&requests.length<=100&&new Set(requests.map(r=>r.id)).size===requests.length,'resident_control_group');
  for(const request of requests)this.validate(request);
  const token=requests[0].token,signature=JSON.stringify(requests.map(({id,epoch,token})=>({id,epoch,token}))),old=this.idleGroups.get(token);
  if(old){demand(old.signature===signature,'resident_control_idle_token_reused');this.idleMetrics.replayed++;return old.promise;}
  if(this.idleGroups.size>=256){
   for(const [key,entry]of this.idleGroups)if(entry.done&&!entry.requests.some(r=>this.entries.get(r.id)?.token===r.token)){this.idleGroups.delete(key);break;}
   demand(this.idleGroups.size<256,'resident_control_idle_capacity');
  }
  const entry={signature,requests:requests.map(({id,epoch,token})=>({id,epoch,token})),done:false,promise:null};this.idleGroups.set(token,entry);this.idleMetrics.attempted++;
  if(!rewardGroupIdleR52(this,requests)){
   this.idleMetrics.deferred++;entry.done=true;entry.promise=Promise.resolve({deferred:true,notExecuted:true,code:'reward_recovery_busy'});return entry.promise;
  }
  // No await between the all-owner predicate and quiesceGroup. The latter
  // closes admission synchronously before cold producer/checkpoint waits.
  this.idleMetrics.acquired++;
  try{entry.promise=this.freezeGroup(requests,beforeDrain).then(acks=>{this.idleMetrics.completed++;return {acks};},error=>{this.idleMetrics.failed++;throw error;}).finally(()=>{entry.done=true;});}
  catch(error){this.idleMetrics.failed++;entry.done=true;entry.promise=Promise.reject(error);}
  return entry.promise;
 }
 freezeGroup(requests,beforeDrain=null){
  demand(Array.isArray(requests)&&requests.length>0&&requests.length<=100&&new Set(requests.map(r=>r.id)).size===requests.length,'resident_control_group');
  for(const request of requests){this.validate(request);demand(!this.entries.has(request.id)&&!this.completed.has(request.token),'resident_control_group_busy');}
  if(actorFaultIsolation){
   const quarantined=retiredActorIsolation?new Map(requests.map(r=>[r.id,this.quarantined(r.id,r.epoch)]).filter(([,entry])=>entry)):new Map();
   // A quarantine has already stopped its actor. Do not ask FixedLoop to
   // quiesce that draining owner again, or spread its rejection to peers.
   const active=requests.filter(r=>!quarantined.has(r.id)),positions=new Map(active.map((r,i)=>[r.id,i]));
   const group=active.length?this.kernel.quiesceGroup(active):Promise.resolve([]);
   const cold=beforeDrain?.();
   // FixedLoop preserves a separate waiter for each actor. If it completed
   // synchronously, the aggregate is already fulfilled and supplies its row.
   // Otherwise retain each waiter before a rejected actor leaves the group.
   const actors=requests.map(request=>quarantined.has(request.id)?Promise.resolve({id:request.id,epoch:request.epoch,quarantined:true}):this.kernel.players.get(request.id)?.quiescer?.promise??group.then(rows=>rows[positions.get(request.id)]));
   void group.catch(()=>{});
   const drained=Promise.allSettled(actors).then(async rows=>{
    if(beforeDrain)await cold;
    const ids=rows.filter(row=>row.status==='fulfilled'&&!row.value.retired&&!row.value.quarantined).map(row=>row.value.id);
    if(ids.length)await this.drainModesGroup(ids);
    return rows;
   });
   // A bad actor's rejection must not become the healthy peer's error. Finish
   // healthy leases first; the parent can then abort the unentered cold job,
   // refresh/resume those exact owners, and retire only the rejected actor.
   const freezes=requests.map((request,index)=>this.freeze(request,drained.then(rows=>{const row=rows[index];if(row.status==='rejected')throw row.reason;return {...row.value,modesDrained:true};})));
   return joinFreezeRequestsR85(freezes,{knownPending:(error,index)=>{
    const request=requests[index],actor=this.kernel.players.get(request.id);
    return error?.code==='actor_command_pending'&&actor?.epoch===request.epoch&&this.unknownActor(request.id);
   }});
  }
  // Drain all accepted cross-player work before suspending any group member.
  const group=this.kernel.quiesceGroup(requests),cold=beforeDrain?.();
  const drained=group.then(async rows=>{
   if(beforeDrain)await cold;
   const ids=rows.filter(row=>!row.retired).map(row=>row.id);
   // A room spanning several frozen actors must checkpoint once, before any
   // individual cold lease is acquired. Passive members retain simulation.
   if(ids.length)await this.drainModesGroup(ids);
   return rows.map(row=>({...row,modesDrained:true}));
  });
  return Promise.all(requests.map((request,index)=>this.freeze(request,drained.then(rows=>rows[index]))));
 }
 freeze(request,quiesced=null){
  this.validate(request);const {id,epoch,token}=request,old=this.entries.get(id);
  if(old){demand(old.token===token&&old.epoch===epoch,'resident_control_busy');return old.promise;}
  const completed=this.completed.get(token);
  if(completed){demand(completed.id===id&&completed.epoch===epoch&&completed.retired===true,'resident_control_token_retired');return Promise.resolve(completed);}
  const quarantine=retiredActorIsolation&&this.quarantined(id,epoch);
  if(quarantine){
   const rejected=actorRejection(quarantine.error);
   demand(quarantine.id===id&&quarantine.epoch===epoch&&rejected?.actor===id&&rejected.epoch===epoch&&typeof quarantine.ready?.then==='function','resident_quarantine_scope');
   const entry={id,epoch,token,phase:'quarantined',lease:null,promise:null,resume:null};this.entries.set(id,entry);
   // Parent cold work can arrive while quarantine is draining. Reuse its
   // stopped proof, never checkpoint the rejected base or acquire its lane.
   entry.promise=Promise.resolve(quarantine.ready).then(proof=>{
    demand(this.entries.get(id)===entry&&proof?.actor===id&&proof.epoch===epoch&&proof.stopped===true,'resident_quarantine_proof');
    this.entries.delete(id);
    // Fresh error: concurrent/replayed control scopes must not mutate the
    // original actor command's private rejection or another freeze token.
    throw attachActorIsolation(kernelError(quarantine.error.code),{...proof,freezeToken:token,channel:this.peer.channel,incarnation:this.peer.incarnation});
   },error=>{entry.phase='unknown';throw error;});return entry.promise;
  }
  const entry={id,epoch,token,phase:'freezing',lease:null,promise:null,resume:null};this.entries.set(id,entry);
  entry.promise=(async()=>{
   try{
    // R22: a shared terminal that began after the parent's idle check may hold
    // this actor's lane. Let it release before quiescing; quiescing first would
    // change the owner state that terminal re-checks on release.
    if(!quiesced)while(this.kernel.players.get(id)?.externalHold&&this.lanes.busy(['player:'+id]))await this.lanes.available(['player:'+id]);
    const drained=await (quiesced??this.kernel.quiesce(id,epoch));
    // A native guild final hit can retire this scope while accepted input is
    // draining. Its durable export already removed the old resident; never
    // checkpoint it or treat that successful handoff as a process failure.
    if(drained.retired){
     demand(!entry.lease&&this.entries.get(id)===entry,'resident_control_retirement');
     entry.phase='retired';this.entries.delete(id);
     const ack={id,token,epoch,channel:this.peer.channel,incarnation:this.peer.incarnation,retired:true};
     this.completed.set(token,ack);if(this.completed.size>256)this.completed.delete(this.completed.keys().next().value);return ack;
    }
    if(!drained.modesDrained)await this.drainModes(id);
    const lease=this.lanes.acquire(['player:'+id],token);demand(lease,'resident_control_busy');entry.lease=lease;
    await this.checkpoints.drain(id);await this.combatCheckpoints.drain();this.lanes.assert(lease);
    this.frames.invalidate(id);entry.phase='frozen';
    return {id,token,epoch,channel:this.peer.channel,incarnation:this.peer.incarnation,finalSequence:this.writer.finalSequence(id)};
   }catch(error){
    if(actorFaultIsolation&&error?.code==='actor_command_pending'&&this.unknownActor(id)&&!entry.lease){entry.phase='pending_command';this.entries.delete(id);const player=this.kernel.players.get(id);this.pendingFreezesR85.set(token,{entry,player,barrier:player?.barrier,work:null});throw attachFreezeFailuresR85(kernelError('actor_command_pending'),[{actor:id,epoch,freezeToken:token,channel:this.peer.channel,incarnation:this.peer.incarnation,stage:'pending_command',pending:true}]);}
    const rejected=actorFaultIsolation&&actorRejection(error);
    if(rejected?.actor===id&&rejected.epoch===epoch){
     // The checkpoint transaction rolled back. No cold operation has started.
     if(entry.lease?.state==='held')this.lanes.reject(entry.lease,error);
     entry.phase='rejected';this.entries.delete(id);
     const proof=await this.onFault(error,id);
     if(proof)attachActorIsolation(error,{...proof,freezeToken:token,channel:this.peer.channel,incarnation:this.peer.incarnation});
     throw error;
    }
    entry.phase='unknown';if(entry.lease?.state==='held')this.lanes.fence(entry.lease);this.onFault(error,id);throw error;
   }
  })();return entry.promise;
 }
 cancelPending(request){
  this.validate(request);const {id,epoch,token}=request,done=this.completed.get(token);
  if(done?.cancelledPendingR85){demand(done.id===id&&done.epoch===epoch,'resident_pending_cancel_fenced');return Promise.resolve(done);}
  const pending=this.pendingFreezesR85.get(token);
  demand(pending?.entry.id===id&&pending.entry.epoch===epoch&&pending.entry.phase==='pending_command'&&!pending.entry.lease&&pending.barrier?.then,'resident_pending_cancel_fenced');
  if(pending.work)return pending.work;
  // Only the parent's authenticated pre-command abort cancels this freeze.
  // Wait the original writer barrier, then use the normal durable checkpoint,
  // current-image refresh and exact-owner resume. Never infer rollback or flip
  // accepting while the native outcome is unresolved.
  pending.work=(async()=>{
   await pending.barrier;
   demand(this.pendingFreezesR85.get(token)===pending&&this.kernel.players.get(id)===pending.player&&pending.player.epoch===epoch&&!pending.player.barrier&&!this.unknownActor(id)&&!this.entries.has(id),'resident_pending_cancel_fenced');
   this.pendingFreezesR85.delete(token);await this.freeze(request);await this.refresh(request);const ack=await this.resume(request);ack.cancelledPendingR85=true;return ack;
  })().catch(error=>{this.onFault(error,id);throw error;});
  return pending.work;
 }
 refresh(request){
  this.validate(request);const {id,epoch,token}=request,entry=this.entries.get(id);demand(entry&&entry.token===token&&entry.epoch===epoch,'resident_control_fenced');
  if(entry.refresh)return entry.refresh;
  entry.refresh=(async()=>{try{
   await entry.promise;demand(entry.phase==='frozen','resident_control_fenced');this.lanes.assert(entry.lease);
   const bundle=await this.readBundle(id,epoch);demand(bundle?.player?.id===id&&bundle.player.channel===this.peer.channel,'resident_control_snapshot_scope');
   const applied=this.applyBundle(bundle);demand(!applied?.then,'resident_control_async_apply');this.checkpoints.hydrate(bundle.player);this.checkpoints.encounters?.hydrate(id,bundle.engagement);this.frames.hydrate(bundle.combat??bundle);
   return {id,token,epoch,refreshed:true};
  }catch(error){entry.phase='unknown';if(entry.lease?.state==='held')this.lanes.fence(entry.lease);this.onFault(error);throw error;}})();return entry.refresh;
 }
 resume(request){
  this.validate(request);const {id,epoch,token}=request,done=this.completed.get(token);
  if(done){demand(done.id===id&&done.epoch===epoch,'resident_control_token_reused');return Promise.resolve(done);}
  const entry=this.entries.get(id);demand(entry&&entry.token===token&&entry.epoch===epoch,'resident_control_fenced');
  if(entry.resume)return entry.resume;
  entry.resume=(async()=>{
   try{
    await this.refresh(request);demand(entry.phase==='frozen','resident_control_fenced');this.lanes.assert(entry.lease);
    this.lanes.release(entry.lease);this.kernel.resume(id,epoch);this.entries.delete(id);
    const ack={id,token,epoch,resumed:true};this.completed.set(token,ack);
    // Resume replay beyond this bounded cache fails closed; no mutation replay.
    if(this.completed.size>256)this.completed.delete(this.completed.keys().next().value);
    return ack;
   }catch(error){entry.phase='unknown';if(entry.lease?.state==='held')this.lanes.fence(entry.lease);this.onFault(error);throw error;}
  })();return entry.resume;
 }
 retireFrozen(request){
  this.validate(request);const {id,epoch,token}=request,done=this.completed.get(token);
  if(done){demand(done.id===id&&done.epoch===epoch&&done.retired===true,'resident_control_token_reused');return done;}
  const entry=this.entries.get(id);demand(entry&&entry.token===token&&entry.epoch===epoch&&entry.phase==='frozen'&&!entry.resume,'resident_control_fenced');
  this.lanes.assert(entry.lease);demand(this.kernel.players.get(id)?.suspended===true,'resident_control_not_suspended');
  this.writer.finalSequence(id);this.lanes.release(entry.lease);this.entries.delete(id);
  const ack={id,epoch,token,channel:this.peer.channel,incarnation:this.peer.incarnation,retired:true};this.completed.set(token,ack);if(this.completed.size>256)this.completed.delete(this.completed.keys().next().value);return ack;
 }
}
