import {deathMovementPermitR86,mergeDeathBundleR86,mergeDeathRowR86} from './death-movement-r86.mjs';
import {ordinaryPotionBatchR61} from './potion-batch-channel-r61.mjs';
import {residentCapacityR59,channelAdmissionR59,castleResumeR59} from './castle-capacity-r59.mjs';
import {CompletedClaimHintsR56} from './completed-claims-r56.mjs';
import {ResidentMounts} from './mount-runtime.mjs';
import {normalPlayerR53} from './r53-options.mjs';
import {ipcSafeStream,readActorBatches} from './ipc-safe-stream.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {ActorQuarantine} from './actor-quarantine.mjs';
import {isAdventureArea} from './adventure-maps.mjs';
import {ResidentState} from './resident-state.mjs';
import {AggroMemory} from './aggro-memory.mjs';
import {FixedLoop,DEFER_INPUT} from './fixed-loop.mjs';
import {ResourceLanes} from './resource-lanes.mjs';
import {OrderedWriterClient} from './ownership.mjs';
import {ActorCheckpoints} from './actor-checkpoint.mjs';
import {EncounterCheckpoints} from './encounter-checkpoint.mjs';
import {CombatCheckpoints} from './combat-checkpoint.mjs';
import {CombatFrames} from './combat-frames.mjs';
import {AttackMemory} from './attack-memory.mjs';
import {AttackLoop} from './attack-loop.mjs';
import {PvpMemory} from './pvp-memory.mjs';
import {PvpLoop} from './pvp-loop.mjs';
import {RetaliationMemory} from './retaliation-memory.mjs';
import {RetaliationLoop} from './retaliation-loop.mjs';
import {MovementActionMemory} from './movement-action.mjs';
import {MovementLoop} from './movement-loop.mjs';
import {SkillMemory} from './skill-memory.mjs';
import {ActionLoop} from './action-loop.mjs';
import {NATIVE_ACTIONS} from './action-writer.mjs';
import {residentSettlement} from './combat-settlement.mjs';
import {ResidentControl} from './resident-control.mjs';
import {ResidentMembership} from './resident-membership.mjs';
import {demand} from './contract.mjs';

import {SHARED_NATIVE_ACTIONS} from './native-channel-mechanics.mjs';
const sharedNativeActions=new Set(SHARED_NATIVE_ACTIONS);
import {ResidentPresence} from './presence.mjs';
import {MixedCombat} from './mixed-combat.mjs';
import {OrderedSystemClient} from './system-writer.mjs';
import {WorldClock} from './world-clock.mjs';
import {MonsterLifecycle} from './monster-lifecycle.mjs';
import {settlementFootprint,settlementNeedsShared} from './settlement-resources.mjs';
import {canRefreshPotion} from './potion-refresh.mjs';

// Simulation composition used by the service and the MessageChannel runner.
// Boot/hydration can await the read worker. A tick cannot call it or SQLite.
// Mode, admission, access/bot guard and rendering ports are mandatory: assembly
// must bind the original implementations before a candidate may start.
export class ResidentChannel {
 constructor({peer,initial,globals,requestWriter,requestSystem=null,recoverWriter=null,loadActor,send,ports,wall=Date.now,onFatal=()=>{}}){
  for(const name of ['guard','scope','footprint','affectedAttack','affectedPvp','publish','project','modeAction','modeTick','recordSecurityEvent','hydrateMode','dropMode','drainMode'])demand(typeof ports?.[name]==='function','resident_channel_port_'+name);
  demand(typeof requestWriter==='function'&&typeof loadActor==='function'&&typeof send==='function'&&initial?.world,'resident_channel_dependencies');
  Object.assign(this,{peer,loadActor,ports,wall,onFatal,globals});this.world={...initial.world};this.settings=initial.settings;this.owners=new Map();this.identities=new Map();this.fishing=new Map();this.membership=new ResidentMembership();this.parties=this.membership.parties;this.arenas=this.membership.arenas;this.teams=this.membership.teams;this.revision=0;
  this.completedClaimHintsR56=new CompletedClaimHintsR56();
  this.state=new ResidentState(peer.channel);this.lanes=new ResourceLanes();this.view=new AggroMemory({channel:peer.channel,cycle:this.world.cycle,now:wall});
  this.presence=new ResidentPresence({owner:id=>this.owners.get(id),player:id=>this.view.player(id),setPlayer:row=>this.view.setPlayer(row),clock:wall,onSeen:(id,now)=>ports.presence?.(id,now)});
  // The state/grid and aggro reader share the same authoritative player Map.
  // No independent stale row is kept for movement versus combat.
  this.mounts=new ResidentMounts({owner:id=>this.owners.get(id),player:id=>this.view.player(id),cycle:()=>this.world.cycle,engagement:id=>this.view.engagements.get(id),locked:id=>ports.mountLocked?.(id)===true||(this.fishing.get(id)?.expires_at_ms??-Infinity)>=wall(),clock:wall});
  this.view.players=this.state.table('players');this.view.setPlayer=row=>{if(this.mounts.enabled)this.mounts.observe(row.id,this.view.player(row.id),row);const instanceId=row.arena_match_id||'',metadata=row.cycle===this.world.cycle&&row.instanceId===instanceId?null:{cycle:this.world.cycle,instanceId};const next=this.state.put('players',row,metadata);if(next.last_seen>=Math.floor(wall()/1000)-30)this.view.activePlayers.add(row.id);else this.view.activePlayers.delete(row.id);};
  const setAggroMonster=this.view.setMonster.bind(this.view);this.view.setMonster=row=>{setAggroMonster(row);if(row.channel===peer.channel)this.state.put('monsters',row,row.cycle===this.world.cycle?null:{cycle:this.world.cycle});};
  this.writer=new OrderedWriterClient({peer,request:requestWriter,recover:recoverWriter,owner:id=>this.owners.get(id),canDispatch:id=>!this.quarantines?.entries.has(id),onUnknown:(id,e)=>this.fail(e)});
  this.encounters=new EncounterCheckpoints(id=>this.view.engagements.get(id)??null,(id,row)=>this.view.setEngagement(id,row));
  const setEncounter=this.view.setEngagement.bind(this.view);this.view.setEngagement=(id,row)=>{this.encounters.observe(id,this.view.engagements.get(id)??null,row);return setEncounter(id,row);};
  this.checkpoints=new ActorCheckpoints({state:this.state,encounters:this.encounters,submit:e=>this.writer.submit(e),pollable:id=>{const p=this.kernel?.players.get(id);return p&&!p.barrier&&!p.suspended&&!p.externalHold;},onRejected:(id,e)=>this.quarantineActor(id,e),onFatal:e=>this.fail(e)});
  this.systemWriter=requestSystem?new OrderedSystemClient({owner:initial.system,request:requestSystem,onUnknown:e=>this.fail(e)}):null;
  this.combatCheckpoints=new CombatCheckpoints({submit:e=>(this.systemWriter??this.writer).submit(e),submitBatch:this.systemWriter?events=>this.systemWriter.submitBatch(events):null,actor:this.systemWriter?null:()=>this.owners.keys().next().value,onFatal:e=>this.fail(e)});
  this.worldClock=new WorldClock({view:this.view,owns:m=>m.channel===peer.channel,blocked:id=>this.lanes.busy(['monster:'+id])||this.combatCheckpoints.overdueR53(this.view.monster(id)),changed:c=>this.combatCheckpoints.changed(c),clock:wall});this.nextRegen=wall()+1000;
  this.lifecycle=this.systemWriter?new MonsterLifecycle({clock:this.worldClock,settings:()=>this.settings,view:this.view,lanes:this.lanes,journal:this.combatCheckpoints,submit:e=>this.systemWriter.submit(e),committed:result=>{for(const id of result.removed??[]){this.view.removeMonster(id);this.state.remove('monsters',id);this.worldClock.forget(id);}for(const m of result.monsters)this.setMonster(m);this.attackMemory.committed(result);ports.monsterLifecycleCommitted?.(result);},onFatal:e=>this.fail(e)}):null;
  const party=id=>this.parties.get(id),arena=id=>this.arenas.get(id),team=(match,id)=>this.teams.get(match+':'+id),blocked=id=>!this.sharedCombat?.ownsPlayer(id)&&(this.lanes.busy(['player:'+id])||this.kernel?.players.get(id)?.suspended===true);
  this.frames=new CombatFrames({view:this.view,settings:()=>this.settings,world:()=>this.world,party,arena,team,participants:(id,monster,round)=>this.attackMemory.participants.has(JSON.stringify([monster,round,id])),now:wall});
  this.frames.setProfiles(initial.profiles,0);
  const changed=c=>this.combatCheckpoints.changed(c),publish=(...a)=>ports.publish(...a),committed=(r,context)=>this.applyCommit(r,context);
  const settle=residentSettlement({globals,frameFor:(...a)=>this.frames.retaliation(...a),blocked:id=>!this.sharedCombat?.ownsMonster(id)&&this.lanes.busy(['monster:'+id])});
  this.attackMemory=new AttackMemory({view:this.view,globals,retaliate:settle,assertMonsterOwner:m=>m.channel===0?this.sharedCombat?.ownsMonster(m.id)===true:m.channel===peer.channel,rankingEligible:(p,m)=>this.frames.rankingEligible(p,m),afk:id=>this.frames.entry(id).afk,monsters:p=>[...this.view.monsters.values()].filter(m=>m.hp>0&&m.area===p.area&&(m.channel===0||m.channel===p.channel)),changed});
  // The original mixed cast is bound below to the same private overlays.
  const common={lanes:this.lanes,checkpoints:this.checkpoints,combatCheckpoints:this.combatCheckpoints,submit:e=>this.writer.submit(e),committed,publish};
  this.attack=new AttackLoop({...common,memory:this.attackMemory,frameFor:(id,input,now,received)=>this.frames.attack(id,input,received??now,now),affectedActors:(...a)=>ports.affectedAttack(...a)});
  const attackBlocked=this.attackMemory.blocked;this.attackMemory.blocked=m=>attackBlocked(m)||this.combatCheckpoints.overdueR53(m);
  this.pvpMemory=new PvpMemory({view:this.view,globals,players:()=>[...this.view.players.values()],frameFor:id=>this.frames.frame(id),party,arena,team,dragon:id=>this.frames.dragon(id),pet:id=>this.frames.pet(id),changedArenaLife:(...args)=>this.frames.changedArenaLife(...args),blocked,cycle:()=>this.world.cycle,changed});
  this.mixed=new MixedCombat({attack:this.attackMemory,pvp:this.pvpMemory,frameFor:id=>this.frames.frame(id),party,dragon:id=>this.frames.dragon(id),blocked,cycle:()=>this.world.cycle});
  this.pvp=new PvpLoop({...common,memory:this.pvpMemory,frameFor:(id,input,now,received)=>this.frames.pvp(id,input,received??now,now),affectedActors:(...a)=>ports.affectedPvp(...a)});
  this.retaliationMemory=new RetaliationMemory({view:this.view,globals,publish});
  this.retaliation=new RetaliationLoop({...common,memory:this.retaliationMemory,frameFor:(id,entry,view=this.view)=>{const frame=this.frames.retaliation(id,[entry],view);return {player:frame.player,monster:frame.monsters[0],armorItems:frame.armorItems};},settings:()=>this.settings});
  this.attack.beforeOrdinaryAttackR86=context=>this.retaliation.beforeOrdinaryAttackR86(context);
  this.movementMemory=new MovementActionMemory({state:this.state,view:this.view,world:this.world,fishing:this.fishing,epoch:id=>this.owners.get(id)?.epoch,settings:()=>this.settings,retaliate:settle,changed,recordSecurityEvent:ports.recordSecurityEvent,...(this.mounts.enabled?{mountSpeed:(id,row,now)=>this.mounts.multiplier(id,row,now)}:{}),wall});
  this.movement=new MovementLoop({...common,memory:this.movementMemory,contextFor:(id,input,now)=>({auth:{account:{id:this.identities.get(id).account},player:{id}},scope:ports.scope(id,input,now)}),frameFor:(id,time)=>{
   const p=this.state.read('players',id),fields=['id','role','x','y','hp','hp_revision','area','channel','arena_match_id','movement_checked_at_ms','movement_debt_ms','position_revision','root_until_ms','realtime_scope_version'];return {movement:{...Object.fromEntries(fields.map(k=>[k,p[k]])),world_cycle:this.world.cycle,pve_hit_due:Number((this.view.engagements.get(id)?.next_hit_at_ms??Infinity)<=time)},settings:this.settings};
  }});
  this.skills=new SkillMemory({view:this.view,globals,party,arena,team,blocked,changed});
  this.actions=new ActionLoop({...common,footprint:(id,input,receivedAtMs)=>{const value=ports.footprint(id,input);return {...value,resources:[...value.resources,...settlementFootprint(this.view,id,input,receivedAtMs)]};},frameFor:id=>({player:this.frames.frame(id),settings:this.settings})});
  this.kernel=new FixedLoop({state:this.state,wall,send,onFatal:e=>onFatal(e),rules:{
   movement:ctx=>this.action(ctx),combat:ctx=>this.action(ctx),
   ai:ctx=>{this.retaliation.tick(ctx);demand(!ports.modeTick(ctx)?.then,'async_mode_tick');},
   aiSteps:ctx=>{const r=this;return (function*(){yield* r.retaliation.tickSteps(ctx);demand(!ports.modeTick(ctx)?.then,'async_mode_tick');})();},
   respawn:ctx=>{if(!this.backgroundPaused){this.lifecycle?.tick(ctx.now);if(this.systemWriter&&ctx.now>=this.nextRegen){this.nextRegen=ctx.now+1000;this.worldClock.regenerate(this.settings,ctx.now);}this.checkpoints.poll();this.combatCheckpoints.poll();}},project:ctx=>ports.project(ctx)
  }});
  this.quarantines=new ActorQuarantine(this,{stop:(id,e)=>ports.quarantineStop?.(id,e),idle:(id,e)=>ports.rejectedIdle?.(id,e),isolate:proof=>ports.isolateActor(proof)});
  this.control=new ResidentControl({kernel:this.kernel,peer,lanes:this.lanes,checkpoints:this.checkpoints,combatCheckpoints:this.combatCheckpoints,writer:this.writer,frames:this.frames,unknownActor:id=>ports.actorCommandPending?.(id)===true,quarantined:(id,epoch)=>{const row=this.quarantines.entries.get(id);return row?.epoch===epoch?row:null;},drainModes:id=>ports.drainMode(id),drainModesGroup:ports.drainModeGroup,readBundle:(id,epoch)=>loadActor(id,epoch,++this.revision),applyBundle:b=>this.applyBundle(b),onFault:(e,id)=>actorFaultIsolation&&actorRejection(e)?.actor===id?this.quarantineActor(id,e):this.fail(e)});
  for(const m of initial.monsters)this.setMonster(m);
  this.combatCheckpoints.hydrate('monsters',initial.monsters.filter(m=>m.channel===peer.channel));
  for(const kind of ['participants','bossParticipants']){const rows=initial[kind]??[];this.combatCheckpoints.hydrate(kind,rows);for(const p of rows)this.attackMemory[kind].set(JSON.stringify(kind==='participants'?[p.monster_id,p.spawn_round,p.player_id]:[p.boss_round,p.player_id]),Object.freeze({...p}));}
 }
 setMonster(row){if(isAdventureArea(row.area)&&row.channel===this.peer.channel)this.combatCheckpoints.seedMonsters([row]);this.view.setMonster(row);this.view.adventureProfile=m=>this.globals.__colAdventure?.profile(m);}
 applyBundle(bundle){
  const owner=this.owners.get(bundle.player.id);demand(owner&&bundle.owner?.epoch===owner.epoch&&bundle.owner?.incarnation===this.peer.incarnation&&bundle.player.channel===this.peer.channel&&bundle.world.cycle===this.world.cycle,'resident_bundle_fenced');
  demand(Number.isSafeInteger(bundle.revision)&&bundle.revision===bundle.combat.revision,'resident_bundle_revision');this.revision=Math.max(this.revision,bundle.revision);
  this.view.setPlayer(this.presence.merge(bundle.player,owner.epoch));this.view.setEngagement(bundle.player.id,bundle.engagement);if(bundle.fishing)this.fishing.set(bundle.player.id,bundle.fishing);else this.fishing.delete(bundle.player.id);
  this.membership.hydrate(bundle);if(this.mounts.enabled)this.mounts.hydrate(bundle.player.id,bundle.mounts);
  for(const m of bundle.adventure?.monsters??[])this.setMonster(m);
  this.frames.hydrate(bundle.combat);demand(!this.ports.hydrateMode(bundle)?.then,'async_mode_hydration');
 }
 admit(bundle,identity){
  const {player,owner}=bundle,passive=owner?.passive===1;demand((passive||this.kernel.activeCount<residentCapacityR59(this.peer.channel))&&!this.owners.has(player.id)&&owner?.incarnation===this.peer.incarnation&&owner.channel===this.peer.channel&&identity.actor===player.id&&identity.account===player.account_id&&identity.epoch===owner.epoch,'resident_admission_scope');
  this.owners.set(player.id,Object.freeze({...owner}));this.identities.set(player.id,Object.freeze({...identity}));
  try{this.applyBundle(bundle);this.state.claim(player.id,owner.epoch);this.writer.seed(player.id,owner.epoch,owner.sequence);this.encounters.hydrate(player.id,bundle.engagement);this.checkpoints.hydrate(player);this.kernel.admit(player.id,owner.epoch,{passive});}
  catch(error){this.fail(error);throw error;}
 }
 rebind(bundle,identity){
  const id=bundle.player.id,owner=this.owners.get(id),actor=this.kernel.players.get(id);
  demand(owner&&actor?.suspended&&bundle.owner.epoch>owner.epoch&&bundle.owner.incarnation===owner.incarnation,'resident_rebind_not_drained');this.writer.finalSequence(id);
  this.state.freeze(id,owner.epoch);this.kernel.detach(id,owner.epoch);this.checkpoints.forget(id);this.frames.remove(id);this.view.removePlayer(id);this.presence.forget(id);this.mounts.forget(id);this.owners.delete(id);this.identities.delete(id);
  // Keep room membership/state: only input/session authority is retired.
  this.admit(bundle,identity);
 }
 async applyCommit(result,context){
  this.completedClaimHintsR56.record(this.world.cycle,result.completedClaimsR56);
  if(context?.input?.action==='collect'&&this.ports.collectRefresh?.(result,context))return;
  const sectionRefresh=this.ports.actorSectionRefreshR52?.(result,context);if(sectionRefresh===true||(sectionRefresh&&typeof sectionRefresh.then==='function'&&await sectionRefresh))return;
  const changed=result.players??[result.player];demand(changed.every(p=>p&&typeof p.id==='string'),'resident_commit_actor');
  // R88: a potion that ran under the movement permit carries the resident's
  // newer motion suffix; the merged row (or the unmodified SQL row when the
  // R86 compatibility proof fails) is what the shortcut compares and installs.
  const potionRow=context?.deathMotionR86&&context.input?.action==='use_potion'&&result.players?.length===1?mergeDeathRowR86(context.deathMotionR86,result.players[0],{cycle:this.world.cycle}):result.players?.[0];
  const potionResult=potionRow===result.players?.[0]?result:{...result,players:[potionRow]};
  if(context&&this.ports.potionRefresh&&canRefreshPotion(this.view.player(context.id),potionResult,context)){
   const id=context.id,owner=this.owners.get(id),actor=this.kernel.players.get(id);
   demand(owner&&actor?.barrier&&actor.epoch===owner.epoch&&this.lanes.busy(['player:'+id]),'potion_refresh_not_fenced');this.state.assertOwner(id,owner.epoch);
   if(this.ports.potionRefresh(potionRow)===true){this.view.setPlayer(this.presence.merge(potionRow,owner.epoch));this.view.setEngagement(id,result.encounters[0][1]);return;}
  }
  // Native rewards can legitimately include recently disconnected party
  // members. Their durable rows remain in the writer; only current residents
  // have a frame/checkpoint to refresh in this channel.
  const players=changed.filter(p=>this.owners.has(p.id));
  const load=p=>this.loadActor(p.id,this.owners.get(p.id).epoch,++this.revision);
  const bundles=ipcSafeStream?await readActorBatches(players,load):await Promise.all(players.map(load));
  for(const bundle of bundles)this.applyBundle(mergeDeathBundleR86(context?.deathMotionR86,bundle));for(const monster of result.monsters??[])this.setMonster(monster);
  if(result.mistLoot)this.ports.mistLootCommitted?.(result.mistLoot);
 }
 action(context){
  const {id,input,now,receivedAtMs}=context,identity=this.identities.get(id);demand(identity,'resident_identity_missing');
  const guard=this.ports.guard(identity,input,now);demand(!guard?.then,'async_gameplay_guard');if(guard!==true){demand(guard&&Number.isInteger(guard.status)&&guard.status>=400,'invalid_gameplay_guard_result');if(input.action==='move'&&deathMovementPermitR86(this.kernel,id))return DEFER_INPUT;return {type:'action',...guard};}
  const deathMotionR86=input.action==='move'?deathMovementPermitR86(this.kernel,id):null;
  if(deathMotionR86)return this.movement.moveDuringDeathR86(context,deathMotionR86);
  if(this.lanes.busy(['player:'+id]))return DEFER_INPUT;
  if(normalPlayerR53(this.view.player(id))&&this.checkpoints.overdueR53(id)){this.checkpoints.poll();return DEFER_INPUT;}
  if(this.mounts.enabled){const rejected=this.mounts.beforeAction(id,input,receivedAtMs??now);if(rejected)return {type:'action',...rejected};}
  if(input.action==='collect'){const rejected=this.ports.collectGuard?.(context);if(rejected)return rejected;}
  const special=this.ports.specialAction?.(context);if(special)return special;
  if(sharedNativeActions.has(input.action)&&this.sharedCombat&&!(input.action==='claim_rewards'&&this.localClaim?.(id,input))&&!(input.action==='collect'&&this.localCollect?.(id,input)))return this.sharedCombat.nativeAction(context);
  if(this.sharedCombat&&settlementNeedsShared(this.view,id,input,receivedAtMs??now))return this.sharedCombat.nativeAction(context);
  const localMixed=this.localMixed?.(context);if(localMixed!==undefined&&localMixed!==null)return localMixed;
  if(this.sharedCombat?.needs(input,this.view.player(id),now))return this.sharedCombat.act(context);
  if(input.action==='move')return this.movement.move(context);
  if(input.action==='attack')return this.attack.attack(context);
  if(input.action==='pvp_attack')return this.pvp.attack(context);
  if(['guardian_dash','cast_support456'].includes(input.action)){
   const result=this.skills.step({...this.frames.attack(id,input,receivedAtMs,now),playerId:id},{nowMs:now});if(result.deferred)return DEFER_INPUT;for(const e of result.events)this.ports.publish(...e);return {type:'action',...result.result};
  }
  const potionBatch=ordinaryPotionBatchR61(this,context);if(potionBatch!==null)return potionBatch;
  if(NATIVE_ACTIONS.includes(input.action))return this.actions.act(context);
  return this.ports.modeAction(context);
 }
 mountToggle(input){
  const id=input?.actor??input?.id,actor=this.kernel.players.get(id),owner=this.owners.get(id);
  if(!actor||!owner||actor.epoch!==input?.epoch||!actor.accepting)return {ok:false,status:409,code:'mount_owner_fenced',mount:null};
  const busy=actor.suspended||actor.externalHold||actor.barrier||actor.quiescer||this.lanes.busy(['player:'+id])||this.ports.actorCommandPending?.(id)===true;
  return this.mounts.command({...input,id},{busy});
 }
 async drain(id){const owner=this.owners.get(id);demand(owner,'resident_actor_missing');await this.kernel.quiesce(id,owner.epoch);await this.ports.drainMode(id);await this.checkpoints.drain(id);await this.combatCheckpoints.drain();return {epoch:owner.epoch,finalSequence:this.writer.finalSequence(id)};}
 detach(id){const owner=this.owners.get(id);demand(owner,'resident_actor_missing');this.state.freeze(id,owner.epoch);this.kernel.detach(id,owner.epoch);this.checkpoints.forget(id);this.frames.remove(id);this.view.removePlayer(id);this.identities.delete(id);this.owners.delete(id);this.presence.forget(id);this.mounts.forget(id);this.fishing.delete(id);this.membership.forget(id);this.ports.dropMode(id);}
 quarantineActor(id,error){return this.quarantines.reject(id,error);}
 handleActorFailure(error){
  const rejected=actorFaultIsolation&&actorRejection(error);if(!rejected)return false;
  // A delayed rejection for an already retired owner cannot poison its new epoch.
  if(this.owners.get(rejected.actor)?.epoch===rejected.epoch)void this.quarantineActor(rejected.actor,error);
  return true;
 }
 fail(error){if(this.handleActorFailure(error))return;if(this.kernel)this.kernel.fail(error);else this.onFatal(error);}
 start(){this.kernel.start();}
 stop(){this.kernel.stop();}
}
