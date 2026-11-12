import {demand,PROTOCOL} from './contract.mjs';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {attachGlobalFreezeAbort} from './global-freeze-abort-proof.mjs';

// A world period can affect every resident (including passive room members).
// Drain the complete input group before suspending any member; a queued party
// action must never wait forever on a partner frozen one actor earlier.
export class ResidentWorldTransition {
 constructor(runtime){this.runtime=runtime;this.held=null;this.completed=new Map();}
 freeze({token,cycle}){
  const r=this.runtime,c=r.channel;demand(typeof token==='string'&&token.length>=16&&token.length<=160&&cycle===c.world.cycle&&!this.completed.has(token),'global_freeze_scope');
  if(this.held){demand(this.held.token===token,'global_freeze_busy');return this.held.promise;}
  const held={token,cycle,phase:'freezing',lease:null,extraLeases:[],actors:[...c.owners].map(([id,o])=>({id,epoch:o.epoch})),promise:null};this.held=held;c.backgroundPaused=true;
  held.promise=(async()=>{try{
   await r.flushPresence();held.mailboxHeld=true;await r.mailbox.hold(token,held.actors.map(a=>a.id));if(r.sharedPending)await r.sharedPending;
   // A prior quarantine already stopped its owner. Reuse that exact rollback
   // error instead of asking the kernel to quiesce a draining actor again.
   const quarantined=new Map();if(retiredActorIsolation)for(const actor of held.actors){const q=c.quarantines?.entries.get(actor.id),proof=q&&actorRejection(q.error);if(q?.epoch===actor.epoch&&proof?.actor===actor.id&&proof.epoch===actor.epoch)quarantined.set(actor.id,q.error);}
   const active=held.actors.filter(actor=>!quarantined.has(actor.id)),positions=new Map(active.map((actor,index)=>[actor.id,index]));
   const group=c.kernel.quiesceGroup(active);
   if(actorFaultIsolation){const actors=held.actors.map(actor=>quarantined.has(actor.id)?Promise.reject(quarantined.get(actor.id)):c.kernel.players.get(actor.id)?.quiescer?.promise??group.then(rows=>rows[positions.get(actor.id)]));void group.catch(()=>{});await this.joinFreeze(held,actors);}else await group;
   if(c.lifecycle?.pending)await c.lifecycle.pending;
   await r.runeBoss.drain();await r.adventure.drain();
   await r.heartbeat.drain();
   await r.dungeon.drainGroup(held.actors.map(a=>a.id));
   const checkpoints=held.actors.map(a=>c.checkpoints.drain(a.id));if(actorFaultIsolation)await this.joinFreeze(held,checkpoints);else await Promise.all(checkpoints);await c.combatCheckpoints.drain();await c.systemWriter?.drain();
   held.lease=c.lanes.acquire(['global:world',...held.actors.map(a=>'player:'+a.id),...[...c.view.monsters.values()].filter(m=>m.channel===c.peer.channel).map(m=>'monster:'+m.id)],token,{worldTransition:true});demand(held.lease,'global_freeze_resources');held.phase='frozen';
   return this.snapshot({token});
  }catch(error){
   if(actorFaultIsolation&&held.phase==='freezing'&&!held.lease){let aborted=false;try{aborted=await this.abortRejected(held,error);}catch(unwind){error=unwind;}if(aborted)throw error;}
   held.phase='unknown';if(held.lease?.state==='held')c.lanes.fence(held.lease);r.fail(error);throw error;
  }})();return held.promise;
 }
 async joinFreeze(held,tasks){const rows=await Promise.allSettled(tasks);held.rejections=rows.filter(row=>row.status==='rejected').map(row=>row.reason);if(held.rejections.length)throw held.rejections[0];return rows.map(row=>row.value);}
 async abortRejected(held,error){
  const r=this.runtime,c=r.channel,errors=held.rejections?.length?[...held.rejections]:[error];
  const matching=e=>{const proof=actorRejection(e);return proof&&held.actors.some(a=>a.id===proof.actor&&a.epoch===proof.epoch);};
  if(!errors.every(matching)||!held.mailboxHeld)return false;
  // Join work that already started; do not run another checkpoint with a
  // rejected base or retry a native action while unwinding this cold freeze.
  const pending=[r.sharedPending,c.lifecycle?.pending,r.runeBoss.pending,r.adventure.pending,r.heartbeat.pending,c.combatCheckpoints.pending,c.systemWriter?.pending,...c.writer.pending.values(),...[...c.checkpoints.entries.values()].map(e=>e.pending),...[...r.dungeon.pending.values()].map(e=>e.promise),...[...r.dungeon.resident.pending.values()].map(e=>e.promise)].filter(p=>typeof p?.then==='function');
  for(const row of await Promise.allSettled([...new Set(pending)]))if(row.status==='rejected')errors.push(row.reason);
  if(!errors.every(matching))return false;
  const rejected=new Map(errors.map(e=>[actorRejection(e).actor,e]));
  const proofs=await Promise.all([...rejected].map(async([id,e])=>({...await c.quarantineActor(id,e),freezeToken:held.token,channel:c.peer.channel,incarnation:c.peer.incarnation})));
  demand(this.held===held&&held.phase==='freezing'&&!held.lease&&!held.refresh,'global_freeze_abort_changed');
  const good=held.actors.filter(a=>!rejected.has(a.id));
  for(const {id,epoch}of good){const p=c.kernel.players.get(id);demand(c.owners.get(id)?.epoch===epoch&&p?.epoch===epoch&&p.suspended&&!p.quiescer&&!p.externalHold&&!p.barrier&&c.state.owners.get(id)?.pending===0,'global_freeze_abort_actor_pending');}
  for(const {id,epoch}of good)c.kernel.resume(id,epoch);
  c.backgroundPaused=false;this.held=null;r.mailbox.resume(held.token);held.phase='aborted';
  const ack={token:held.token,cycle:held.cycle,aborted:true};this.completed.set(held.token,ack);if(this.completed.size>64)this.completed.delete(this.completed.keys().next().value);
  attachGlobalFreezeAbort(error,{...ack,channel:c.peer.channel,incarnation:c.peer.incarnation,actors:proofs});return true;
 }
 abortFreeze({token,cycle}){
  const done=this.completed.get(token);if(done){demand(done.aborted===true&&done.cycle===cycle,'global_freeze_abort_replay');return done;}
  const held=this.validate(token),r=this.runtime,c=r.channel;demand(actorFaultIsolation&&held.cycle===cycle&&!held.refresh&&!held.refreshed&&!held.extraLeases.length,'global_freeze_abort_after_commit');
  for(const {id,epoch}of held.actors){const p=c.kernel.players.get(id);demand(p?.epoch===epoch&&p.suspended&&!p.quiescer&&!p.barrier&&!p.externalHold&&c.state.owners.get(id)?.pending===0,'global_freeze_abort_actor_pending');}
  c.lanes.release(held.lease);for(const {id,epoch}of held.actors)c.kernel.resume(id,epoch);c.backgroundPaused=false;this.held=null;r.mailbox.resume(token);held.phase='aborted';
  const ack={token,cycle,aborted:true};this.completed.set(token,ack);if(this.completed.size>64)this.completed.delete(this.completed.keys().next().value);return ack;
 }
 validate(token){const held=this.held;demand(held?.token===token&&held.phase==='frozen','global_transition_not_frozen');for(const lease of [held.lease,...held.extraLeases])this.runtime.channel.lanes.assert(lease);return held;}
 snapshot({token}){const held=this.validate(token),r=this.runtime,c=r.channel;return {token,cycle:held.cycle,channel:c.peer.channel,incarnation:c.peer.incarnation,actors:held.actors.map(a=>({...a,sequence:c.writer.finalSequence(a.id),rates:c.owners.get(a.id)?.passive===1?null:r.rates.snapshot(c.identities.get(a.id))})),systemSequence:c.systemWriter?.sequence??null};}
 visibility({token,player}){
  this.validate(token);const r=this.runtime,c=r.channel,{id,is_gm,gm_invisible,gm_visibility_revision:revision}=player;
  demand(typeof id==='string'&&[0,1].includes(is_gm)&&[0,1].includes(gm_invisible)&&Number.isSafeInteger(revision)&&revision>=0,'native_gm_visibility_control');
  const fields={is_gm,gm_invisible,gm_visibility_revision:revision},local=c.view.player(id),peer=r.world.peerPlayers.get(id);
  for(const row of [local,peer])if(row)demand(revision>=row.gm_visibility_revision,'native_gm_visibility_stale');
  if(local){const next={...local,...fields};c.view.setPlayer(next);r.maintenance.hydrate(next);}
  if(peer)r.world.setPeerPlayer({...peer,...fields});
  for(const room of r.world.rooms.values()){const old=room.staticPlayers.get(id);if(old){room.staticPlayers.set(id,{...old,...fields});room.revision++;}}
  for(const sub of r.world.subscribers.values()){sub.last=null;sub.lastCommon=null;sub.cache=null;sub.reset=true;}r.world.globalRevision++;
  const dungeon=r.dungeon.resident,p=dungeon.players.get(id);if(p)dungeon.players.set(id,{...p,...fields});
  // Reuse the exact native dungeon visibility method and revision predicate.
  const engine={runs:new Map([...dungeon.runs].map(([id,e])=>[id,e.run]))};dungeon.rules.DungeonEngine.prototype.setPlayerVisibility.call(engine,id,is_gm===1&&gm_invisible===1,revision);
  for(const [rid,entry]of dungeon.runs)if(entry.run.members.some(p=>p.id===id))dungeon.versions.set(rid,(dungeon.versions.get(rid)??0)+1);
  for(const [viewer,p]of c.state.table('players'))if(p.channel===player.channel&&p.area===player.area&&(p.area!=='arena'||p.arena_match_id===player.arena_match_id))r.connections.send(viewer,{type:'gm_visibility',protocol:PROTOCOL,playerId:id,maintenanceGm492:is_gm===1,invisible:is_gm===1&&gm_invisible===1,visibilityRevision:revision});
  return {token,id,revision};
 }
 async export({token,id,source,target,retired=false}){
  const held=this.validate(token),r=this.runtime,c=r.channel,actor=held.actors.find(a=>a.id===id);demand(actor?.epoch===source.epoch&&source.channel===c.peer.channel&&source.incarnation===c.peer.incarnation,'global_export_owner');
  // The browser obtains a new signed ticket using its native session after the
  // barrier. No credential or authorization is embedded in this notification.
  await r.connections.retire(id,[{type:'channel_changed',protocol:PROTOCOL,channel:target.channel,epoch:target.epoch,retired}]);c.detach(id);held.actors=held.actors.filter(a=>a.id!==id);return {token,id,exported:true};
 }
 async admit(payload){
  const token=payload.frozen?.token,held=this.validate(token),r=this.runtime,c=r.channel,{identity}=payload;demand(!held.actors.some(a=>a.id===identity.actor),'global_admit_duplicate');
  const lease=c.lanes.acquire(['player:'+identity.actor],token);demand(lease,'global_admit_resources');held.extraLeases.push(lease);
  try{await r.mailbox.hold(token,[identity.actor]);await r.control(payload.bundle.owner.passive===1?'admit_passive':'admit',payload);await c.kernel.quiesce(identity.actor,identity.epoch);held.actors.push({id:identity.actor,epoch:identity.epoch});return {token,id:identity.actor,admitted:true,epoch:identity.epoch};}
  catch(error){held.phase='unknown';for(const l of [held.lease,...held.extraLeases])if(l.state==='held')c.lanes.fence(l);r.fail(error);throw error;}
 }
 async refresh({token,worldPoint,reset=false,contributions=false,dungeonCleanup=null,configuration=false,refreshActors=null}){
  const held=this.validate(token),r=this.runtime,c=r.channel;
  if(held.refresh)return held.refresh;
  held.refresh=(async()=>{try{
   demand(worldPoint?.world?.cycle===(reset?held.cycle+1:held.cycle),'global_refresh_cycle');
   if(configuration){demand(!reset&&!contributions&&!dungeonCleanup,'configuration_refresh_scope');const initial=await r.request('read_channel_refresh',{token,revision:r.services.revision+1});demand(initial.world.cycle===held.cycle,'configuration_refresh_cycle');this.configure(initial);}
   if(reset){const initial=await r.request('read_channel_refresh',{token,revision:r.services.revision+1});demand(initial.world.cycle===worldPoint.world.cycle&&initial.worldPoint.revision>=worldPoint.revision,'global_refresh_snapshot');this.reset(initial);}
   else{Object.assign(c.world,worldPoint.world);r.worldPoint=worldPoint;r.world.setWorld(worldPoint.world,r.world.native.totalOnline);}
   if(dungeonCleanup){r.dungeon.applyCleanup(dungeonCleanup);for(const {id}of dungeonCleanup.finished)r.dungeonProjection.rooms.delete(id);}
   if(contributions&&!reset){const initial=await r.request('read_channel_refresh',{token,revision:r.services.revision+1});demand(initial.world.cycle===held.cycle&&!c.combatCheckpoints.pending,'global_contributions_scope');r.services.configure(initial.config);c.frames.setProfiles(initial.profiles,initial.config.revision);
    for(const kind of ['participants','bossParticipants']){c.combatCheckpoints.base.get(kind).clear();c.combatCheckpoints.current.get(kind).clear();c.attackMemory[kind].clear();const rows=initial[kind]??[];c.combatCheckpoints.hydrate(kind,rows);for(const p of rows)c.attackMemory[kind].set(JSON.stringify(kind==='participants'?[p.monster_id,p.spawn_round,p.player_id]:[p.boss_round,p.player_id]),Object.freeze({...p}));}
   }
   // Cold bundles are loaded while all actors remain behind the same lease.
   // No actor resumes until all four channels and the shared owner acknowledge.
   // Reads overlap (revisions are still assigned in actor order); applies stay ordered.
   demand(refreshActors===null||Array.isArray(refreshActors)&&refreshActors.every(id=>held.actors.some(a=>a.id===id)),'global_refresh_actor_scope');
   const actors=reset||configuration||refreshActors===null?held.actors:held.actors.filter(a=>refreshActors.includes(a.id));
   const bundles=await Promise.all(actors.map(actor=>c.loadActor(actor.id,actor.epoch,++c.revision)));
   for(const [i,actor]of actors.entries()){const bundle=bundles[i];c.applyBundle(bundle);c.checkpoints.hydrate(bundle.player);c.encounters.hydrate(actor.id,bundle.engagement);}
   held.refreshed=true;return {token,cycle:c.world.cycle,refreshed:true};
  }catch(error){held.phase='unknown';if(held.lease?.state==='held')c.lanes.fence(held.lease);r.fail(error);throw error;}})();return held.refresh;
 }
 configure(initial){
  const r=this.runtime,c=r.channel;demand(!c.combatCheckpoints.pending&&!c.lifecycle?.pending&&Object.values(c.combatCheckpoints.snapshot()).every(rows=>!rows.length),'configuration_channel_pending');
  r.adventure.reset(initial.adventure);c.settings=initial.settings;r.services.configure(initial.config);c.frames.setProfiles(initial.profiles,initial.config.revision);
  const next=new Map(initial.monsters.filter(m=>m.channel===c.peer.channel).map(m=>[m.id,m]));let eventChanged=false;
  for(const [id,old]of c.view.monsters)if(old.channel===c.peer.channel){if(!next.has(id)){c.view.removeMonster(id);c.state.remove('monsters',id);if(old.area==='event'){r.world.native.monsters.delete(id);eventChanged=true;}}if(!next.has(id)||next.get(id).spawn_round!==old.spawn_round)c.worldClock.forget(id);}
  // Frozen or empty channels may drain dirty rows without projecting a frame.
  // Publish the durable island spawn/clear snapshot before any actor resumes.
  for(const row of next.values()){c.setMonster(row);if(row.area==='event'){r.world.monster(row);eventChanged=true;}}
  if(eventChanged)r.world.globalRevision++;
  for(const kind of ['monsters','participants','bossParticipants']){const rows=kind==='monsters'?[...next.values()]:initial[kind]??[];c.combatCheckpoints.base.get(kind).clear();c.combatCheckpoints.current.get(kind).clear();c.combatCheckpoints.hydrate(kind,rows);
   if(kind!=='monsters'){c.attackMemory[kind].clear();for(const p of rows)c.attackMemory[kind].set(JSON.stringify(kind==='participants'?[p.monster_id,p.spawn_round,p.player_id]:[p.boss_round,p.player_id]),Object.freeze({...p}));}
  }
 }
 reset(initial){
  const r=this.runtime,c=r.channel;demand(!c.combatCheckpoints.pending&&!c.lifecycle?.pending,'global_reset_pending');Object.assign(c.world,initial.world);c.view.cycle=c.world.cycle;c.settings=initial.settings;r.services.configure(initial.config);c.frames.setProfiles(initial.profiles,initial.config.revision);
  // The native world-cycle reset does not reset Rune V2 cast rows or monster
  // lives. Keep its same-process cache; the native next step cancels a cast
  // once the reset has moved its players back to the bazaar.
  for(const id of c.view.monsters.keys()){c.view.removeMonster(id);c.state.remove('monsters',id);c.worldClock.forget(id);}for(const id of c.view.engagements.keys())c.view.setEngagement(id,null);
  for(const rows of c.combatCheckpoints.base.values())rows.clear();for(const rows of c.combatCheckpoints.current.values())rows.clear();c.combatCheckpoints.events.length=0;c.attackMemory.participants.clear();c.attackMemory.bossParticipants.clear();c.parties.clear();c.arenas.clear();c.teams.clear();c.fishing.clear();
  for(const m of initial.monsters)c.setMonster(m);c.combatCheckpoints.hydrate('monsters',initial.monsters.filter(m=>m.channel===c.peer.channel));
  for(const kind of ['participants','bossParticipants']){c.combatCheckpoints.hydrate(kind,initial[kind]??[]);for(const p of initial[kind]??[])c.attackMemory[kind].set(JSON.stringify(kind==='participants'?[p.monster_id,p.spawn_round,p.player_id]:[p.boss_round,p.player_id]),Object.freeze({...p}));}
  r.adventure.reset(initial.adventure);const dungeon=r.dungeon.resident;demand(!dungeon.pending.size&&!r.dungeon.pending.size,'global_dungeon_pending');for(const key of ['players','memberships','materials','runs','notices','presence'])dungeon[key].clear();dungeon.hydrate(initial.dungeon);r.dungeonProjection.sent.clear();
  const w=r.world;for(const key of ['rooms','subscribers','peerPlayers','engagements'])w[key].clear();for(const key of ['playerCache','monsterCache','pending','monsters','events'])w.native[key].clear();w.native.worldLoop.engagedByMonster.clear();for(const m of initial.monsters)w.monster(m);w.globalRevision++;w.eventRevision++;w.engagementRevision++;w.lastChanges=null;
  r.sharedVersion=0;r.sharedSent.clear();r.worldPoint=initial.worldPoint;w.setWorld(initial.world,w.native.totalOnline);
 }
 resume({token}){
  const done=this.completed.get(token);if(done)return done;const held=this.validate(token),r=this.runtime,c=r.channel;demand(held.refreshed===true,'global_resume_without_refresh');for(const lease of [held.lease,...held.extraLeases])c.lanes.release(lease);for(const {id,epoch}of held.actors)c.kernel.resume(id,epoch);c.backgroundPaused=false;this.held=null;r.mailbox.resume(token);const ack={token,cycle:c.world.cycle,resumed:true};this.completed.set(token,ack);if(this.completed.size>64)this.completed.delete(this.completed.keys().next().value);return ack;
 }
}
