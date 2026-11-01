import {applyCastleCombatR59,castleCombatStatsR59} from './castle-combat-refresh-r59.mjs';
import {CastleChannelR59} from './castle-channel-r59.mjs';
import {planSingleDeathsR57,takeSingleDeathsR57} from './death-batch-single-r57.mjs';
import {controlCoalesceR53} from './r53-options.mjs';
import {createControlBatchR53} from './control-batch-r53.mjs';
import {receiveControlBatchR53} from './control-batch-r53.mjs';
import {stageTimingR51,claimHistoryR51} from './r51-options.mjs';
import {rewardRecoverySchedulerR52} from './r52-options.mjs';
import {refreshActorSectionsR52,actorSectionMetricsR52} from './actor-section-reuse-r52.mjs';
import {refreshItemSectionsR57,itemRefreshMetricsR57} from './item-refresh-r57.mjs';
import {mixedParticipantMetricsR52} from './mixed-participants-r52.mjs';
import {stageStartR51,observeStageR51,stageSnapshotR51} from './stage-timing-r51.mjs';
import {applyCollectLight,collectMetrics,collectTime} from './collect-light.mjs';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {ActorCommandRecovery} from './actor-command-recovery.mjs';
import {commandStatusDescriptor} from './actor-command-status.mjs';
import {consumeTransportNotSent} from './transport-not-sent.mjs';
import {ConnectionReleaseRecovery} from './connection-release-recovery.mjs';
import {ActorReadRecovery} from './actor-read-recovery.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const reportActorFault=createFaultReporter(text=>process.stderr.write(text));
const cosmeticRelayErrors=new Set(['event_relay_scope','event_relay_channel','event_relay_recipient','notification_arguments','notification_event','notification_scope','invalid_world_event','ipc_request_timeout','ipc_frame_size','ipc_write_backpressure','ipc_request_backpressure']);
import {BagCollectGuard} from './bag-collect-guard.mjs';
import {r37Options} from './r37-options.mjs';
import {localClaimTargets,nativeClaimPrefix} from './claim-chunks.mjs';
import {AdventureChannel} from './adventure-channel.mjs';
import {LocalMixedCombat} from './local-mixed-combat.mjs';
import {shouldSyncEngagement} from './engagement-sync.mjs';
import {SlimBundleClient} from './slim-reload.mjs';
import {r35Options} from './r35-options.mjs';
import {AfkChannel} from './afk-channel.mjs';
import {AFK_ACTIONS,afkCheckEnabled} from './afk-policy.mjs';
import {isAdventureArea} from './adventure-maps.mjs';
import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
import {performance} from 'node:perf_hooks';
import {ResidentChannel} from './resident-channel.mjs';
import {ResidentServices} from './resident-services.mjs';
import {DungeonChannel} from './dungeon-channel.mjs';
import {DungeonProjection} from './dungeon-projection.mjs';
import {gameplayR55} from './r55-gameplay-options.mjs';
import {ModeChannel} from './mode-channel.mjs';
import {WorldProjection} from './world-projection.mjs';
import {acceptWorldPoint} from './world-state.mjs';
import {ResidentWorldTransition} from './resident-world-transition.mjs';
import {SessionMirror} from './session-mirror.mjs';
import {ResidentMaintenance} from './resident-maintenance.mjs';
import {IngressRate} from './ingress-rate.mjs';
import {TicketConsumer} from './ticket.mjs';
import {ChannelConnections,MistLootConnections} from './channel-connections.mjs';
import {ChannelMailbox} from './channel-mailbox.mjs';
import {EventFanout} from './event-fanout.mjs';
import {ChannelMotion} from './channel-motion.mjs';
import {colLabAssertAction} from './generated/world-projection-rules.mjs';
import {ResidentCleanup} from './resident-cleanup.mjs';
import {ResidentSettlementRead} from './resident-settlement-read.mjs';
import {LoadWindow} from './load-window.mjs';
import {RuneBossChannel} from './rune-boss-channel.mjs';
import {HeartbeatLoop} from './heartbeat-loop.mjs';
import {SharedCombatChannel} from './shared-combat-channel.mjs';
import {createChannelWebSocketEndpoint} from './ws-endpoint.mjs';
import {demand,PROTOCOL} from './contract.mjs';
import {createCpuProfiler507,runtimePerformance} from './generated/profiler-rules.mjs';
import {deathLatencyR82} from './death-latency-r82.mjs';
import {recordNativeSecurityEvent} from './generated/mode-policy.mjs';

// One actual channel assembly for service processes and MessageChannel tests.
// Native simulation, shared combat and lifecycle rules are composed here.
// Production resource footprints remain explicit until all native cases bind.
export class ChannelRuntime {
 constructor({peer,initial,publicKey,origins,request,mechanics,clock=Date.now,onFatal=()=>{}}){
  for(const name of ['footprint','affectedAttack','affectedPvp'])demand(typeof mechanics?.[name]==='function','channel_mechanic_'+name);
  demand(typeof request==='function'&&origins instanceof Set&&typeof peer?.realm==='string','channel_runtime_dependencies');
  if(stageTimingR51){const originalRequest=request;request=(method,...args)=>{const at=stageStartR51();return observeStageR51('channel.ipc.'+method,at,originalRequest(method,...args));};}
  Object.assign(this,{peer,request,mechanics,clock,onFatal});this.started=false;this.stopping=false;this.presencePending=null;this.presenceVersion=new Map();this.lastElu=performance.eventLoopUtilization();this.lastSample=performance.now();this.lastMessages=0;this.ackSamples=[];this.health={elu:0,messagesPerSecond:0};
  this.profiler=createCpuProfiler507();
  this.loadWindow=new LoadWindow({target:'channel-'+peer.channel,incarnation:peer.incarnation});
  this.services=new ResidentServices({config:initial.config,player:id=>this.channel?.view.player(id),locked:id=>this.dungeon?.locked(id)??false,clock});
  const globals=this.services.globals;globals.__colCastle={};this.slimReload=new SlimBundleClient();
  this.readRecovery=new ActorReadRecovery({clock});
  this.releaseRecovery=new ConnectionReleaseRecovery({request,incarnation:peer.incarnation,clock});
  this.commandRecovery=new ActorCommandRecovery({status:command=>request('command_status',command),describe:commandStatusDescriptor,disconnect:(id,command,options)=>this.holdUnknownActor(id,command,options),clock});
  this.channel=new ResidentChannel({peer,initial,globals,wall:clock,recoverWriter:actorFaultIsolation?async(owner,command,error)=>{
   const value=await this.commandRecovery.recover(owner,command,error),ack=value.ack;
   if(value.status==='committed'&&ack){this.afkCheck?.committed(command.playerId,ack.result,command);if(ack.result?.notificationActors)this.mailbox.changed(ack.result.notificationActors.filter(id=>this.channel.owners.has(id)));}return value;
  }:null,requestSystem:command=>request('system_command',command),loadActor:(id,epoch,revision)=>this.readRecovery.load({actor:id,epoch,revision},()=>this.slimReload.load(id,slim=>request('read_actor',{actor:id,epoch,revision,...(slim?{slim}:{})}))),requestWriter:async(_,command)=>{
   const started=performance.now(),ack=await request('command',command);this.ackSamples.push(performance.now()-started);if(this.ackSamples.length>2048)this.ackSamples.shift();
   this.afkCheck?.committed(command.playerId,ack.result,command);
   if(ack.result?.notificationActors)this.mailbox.changed(ack.result.notificationActors.filter(id=>this.channel.owners.has(id)));return ack;
  },send:(id,packet)=>this.connections.send(id,packet,{tracked:true}),onFatal:error=>this.fail(error),ports:{
   ...mechanics,recordSecurityEvent:recordNativeSecurityEvent,guard:(identity,input)=>{const result=this.sessions.check(identity);if(result!==true)return result;const p=this.channel.view.player(identity.actor);colLabAssertAction({account:{id:identity.account},player:{id:p.id},playerAccess:{area:p.area}},input);return this.afkCheck?.guard(identity,input)??true;},
   mountLocked:id=>this.stopping||this.dungeon?.locked(id)||!gameplayR55.mountState&&(this.globalControl?.held||this.sharedCombat?.pending.has(id)===true),
   specialAction:context=>this.afkCheck?this.afkCheck.action(context):AFK_ACTIONS.includes(context.input?.action)?{type:'action',status:200,body:{ok:true,afkCheck:{enabled:false,locked:false,challenge:null}}}:null,
   scope:id=>{const p=this.channel.view.player(id);return {scopeVersion:p.realtime_scope_version,cycle:this.channel.world.cycle,channel:p.channel,area:p.area,arenaMatchId:p.arena_match_id};},
   collectGuard:context=>this.bagCollect.check(context),collectRefresh:(result,context)=>this.bagCollect.committed(result,context)||applyCollectLight(this,result,context),actorSectionRefreshR52:result=>{if(applyCastleCombatR59(this,result))return true;const proof=result.actorSectionsR52??result.itemRefreshR57?.actorSectionsR52,read=actors=>request('read_actor_drops_r52',{cycle:proof.cycle,actors,includeDrops:proof.readDrops===true});return result.itemRefreshR57?refreshItemSectionsR57(this,result,read):refreshActorSectionsR52(this,result,read);},project:context=>this.project(context),publish:(...args)=>this.publish(args),potionRefresh:row=>!this.dungeon.locked(row.id)&&this.world.refreshPotion(row),
   presence:(id,at)=>this.dungeon.seen(id,at),
   quarantineStop:(id,error)=>{this.connections?.revoke({actor:id});if(retiredActorIsolation)this.sharedCombat?.pendingActor(id,actorRejection(error)?.epoch);reportActorFault({actor:id,channel:peer.channel,error});},
   rejectedIdle:(id,error)=>this.rejectedActorIdle(id,error),isolateActor:proof=>request('actor_isolate',proof),actorCommandPending:id=>this.commandRecovery.hasActor(id,{confirmedOnly:true}),
   modeAction:context=>context.input.action==='heartbeat'?this.heartbeat.act(context):context.input.action==='dungeon'?this.dungeon.action(context):this.modes.action(context),
   modeTick:context=>{if(this.globalControl?.held)return;this.afkCheck?.tick(context.now);this.runeBoss.tick(context.now);this.adventure.tick(context.now);this.castle.tick(context.now);this.dungeon.tick(context);void this.flushShared().catch(error=>{if(!['world_engagements_unavailable','ipc_control_outcome_unknown','world_process_fenced'].includes(error.code))this.fail(error);});},
   monsterLifecycleCommitted:result=>this.world.lifecycleCommitted(result),
   mistLootCommitted:snapshot=>this.adventure.refreshLoot(snapshot),hydrateMode:bundle=>this.hydrate(bundle),dropMode:id=>this.drop(id),drainMode:async id=>{await this.heartbeat.drain();await this.runeBoss.drain();await this.adventure.drain();await this.dungeon.drain(id);},
   drainModeGroup:async ids=>{await this.heartbeat.drain();await this.runeBoss.drain();await this.adventure.drain();await this.dungeon.drainActors(ids);}
  }});
  this.dungeon=new DungeonChannel(this.channel,{globals,progressionSettings:()=>globals.__colProgression.snapshot(),initial:initial.dungeon,clock,actorsFor:(id,input)=>{
   if(input?.action!=='create')return [id];const party=this.channel.parties.get(id);return party?[...this.channel.parties].filter(([,p])=>p===party).map(([id])=>id):[id];
  }});
  this.dungeonProjection=new DungeonProjection(this.dungeon.resident);this.modes=new ModeChannel(this.channel,{footprint:(...args)=>mechanics.footprint(...args)});
  this.runeBoss=new RuneBossChannel(this.channel,{initial:initial.runeBossStates??[],clock});
  this.adventure=new AdventureChannel(this,initial.adventure);this.castle=new CastleChannelR59(this,initial.castle);
  if(afkCheckEnabled())this.afkCheck=new AfkChannel(this,{settings:initial.afkCheck?.settings});
  this.heartbeat=new HeartbeatLoop(this.channel,{schedule:controlCoalesceR53?createControlBatchR53((method,payload)=>this.request(method,payload),'heartbeat_schedules_r53'):payload=>this.request('heartbeat_schedule',payload),onFatal:error=>this.fail(error)});
  this.maintenance=new ResidentMaintenance({player:id=>this.channel.view.player(id),clock});globals.__colRealm={maintenance:this.maintenance.policy};if(initial.maintenance)this.maintenance.apply(initial.maintenance);
  this.world=new WorldProjection({state:this.channel.state,view:this.channel.view,mounts:this.channel.mounts,castleNotice:now=>this.castle.notices.read(this.castle.config,now),globals,waveView:(...args)=>this.runeBoss.wave(...args),epoch:peer.incarnation,clock});this.world.setWorld(initial.world,initial.totalOnline??0);
  this.bagCollect=new BagCollectGuard(this);
  this.worldPoint=initial.worldPoint??null;
  this.globalControl=new ResidentWorldTransition(this);
  this.sharedCombat=new SharedCombatChannel(this);this.channel.sharedCombat=this.sharedCombat;
  this.channel.movement.shared=this.sharedCombat;this.channel.retaliation.shared=this.sharedCombat;
  if(initial.sharedWorld){this.channel.attack.shared=this.sharedCombat;this.channel.pvp.shared=this.sharedCombat;}
  // R22: a plain single-target kill whose every possible reward recipient is a
  // partyless resident of this channel commits on the channel's own writer
  // path. It touches no other channel, so the all-owner barrier only added a
  // server-wide stop per kill. Everything else keeps the shared barrier.
  this.forceShared=new Map();this.forceSharedActors=new Map();this.channel.attack.localKill=(id,result)=>this.localKill(id,result);this.channel.attack.planBatchR57=(ctx,local)=>planSingleDeathsR57(this,ctx,local);this.channel.attack.takeBatchR57=plan=>takeSingleDeathsR57(this.channel,plan);this.channel.attack.localRejected=(targets,actor)=>this.forceSharedTargets(targets,actor);
  this.localMixedCombat=new LocalMixedCombat(this);this.channel.localMixed=context=>this.localMixedCombat.act(context);
  this.channel.localClaimScopes=new WeakMap();this.channel.localClaim=(id,input)=>{const scope=this.localClaim(id,input);if(scope)this.channel.localClaimScopes.set(input,scope);return Boolean(scope);};this.channel.actions.localRejected=(targets,actor)=>this.forceSharedTargets(targets,actor);
  this.channel.localCollectScopes=new WeakMap();this.channel.localCollect=(id,input)=>{const scope=this.localCollect(id,input);if(scope)this.channel.localCollectScopes.set(input,scope);return Boolean(scope);};this.channel.actions.localCollectRejected=id=>this.forceSharedActor(id,5000);
  this.channel.attackMemory.blocked=m=>!this.sharedCombat.ownsMonster(m.id)&&(this.channel.lanes.busy(['monster:'+m.id])||this.channel.combatCheckpoints.overdueR53(m));
  this.channel.pvpMemory.blocked=id=>!this.sharedCombat.ownsPlayer(id)&&(this.channel.lanes.busy(['player:'+id])||this.channel.kernel.players.get(id)?.suspended===true);
  this.cleanupControl=new ResidentCleanup({peer,cycle:()=>this.channel.world.cycle,lanes:this.channel.lanes,journal:this.channel.combatCheckpoints,writer:this.channel.systemWriter,attackMemory:this.channel.attackMemory,fishing:this.channel.fishing,onFatal:error=>this.fail(error)});
  this.settlementRead=new ResidentSettlementRead({peer,cycle:()=>this.channel.world.cycle,lanes:this.channel.lanes,journal:this.channel.combatCheckpoints,writer:this.channel.systemWriter,monster:id=>this.channel.view.monster(id),onFatal:error=>this.fail(error)});
  this.guildAccess=new Map();this.sessions=new SessionMirror({peer,owner:id=>this.channel.owners.get(id),player:id=>this.channel.view.player(id),guildAccess:id=>this.guildAccess.get(id),maintenance:this.maintenance.policy,clock,revoke:scope=>this.connections?.revoke(scope),botChallenge:scope=>this.connections?.botChallenge(scope)});
  this.rates=new IngressRate({clock});
  this.motion=new ChannelMotion({screenMultiplier:initial.motionStream?.screenMultiplier,channel:this.channel,connected:id=>this.connections?.identity(id),secure:identity=>this.sessions.check(identity)===true,blocked:id=>this.stopping||this.globalControl?.held||this.dungeon.locked(id)||this.afkCheck?.blocked(id)||Boolean(this.sharedCombat.pending.get(id)?.returnMoves),visible:(id,target)=>this.world.subscribers.get(id)?.last?.players.some(p=>p.id===target)===true,held:id=>this.heldMotion(id),heldEnabled:process.env.CORE511_HELD_MOTION_PREVIEWS!=='0',sendHeld:(id,text,valid,onSent)=>this.connections.sendMotion(id,text,valid,onSent),clock});
  this.budget={reserve:(ip,boot)=>{demand(boot===peer.incarnation,'budget_process_fenced');demand(this.releaseRecovery.canReserve(),'connection_budget_exceeded');return request('connection_reserve',{ip});},activate:(lease,boot)=>{demand(boot===peer.incarnation,'budget_process_fenced');return request('connection_activate',{lease});},release:(lease,boot)=>this.releaseRecovery.release(lease,boot)};
  const tickets=new TicketConsumer({publicKey,realm:peer.realm,channel:peer.channel,boot:peer.incarnation,origins,now:clock,assertOwner:identity=>this.sessions.check(identity)===true});
  this.lootConnections=new MistLootConnections();this.channel.actions.connectionFor=(id,input)=>this.lootConnections.connectionFor(id,input);
  this.connections=new ChannelConnections({tickets,budget:this.budget,kernel:this.channel.kernel,motion:this.motion,clock,encode:packet=>this.world.wire.encode(packet),admit:identity=>{demand(this.started&&!this.stopping&&this.sessions.check(identity)===true,'channel_session_not_ready');},guard:identity=>!this.stopping&&this.sessions.check(identity)===true,challenge:identity=>!this.stopping&&this.sessions.check(identity)?.code==='bot_check_required'?this.sessions.entries.get(identity.actor):null,
   captureInput:(identity,input,record)=>this.lootConnections.capture(identity,input,record),
   ...(this.afkCheck?{acceptedInput:(identity,input)=>this.afkCheck.accepted(identity,input)}:{}),
   rate:(_account,_action,payload,identity)=>this.rates.check(identity,payload),presence:identity=>this.channel.presence.seen(identity),ready:(identity,record)=>{
    this.lootConnections.ready(identity,record);this.afkCheck?.ready(identity);
    // Every replacement socket needs a full native image, even if its prior
    // world delta was sent successfully just before a network break.
    const sub=this.world.subscribers.get(identity.actor);if(sub){sub.last=null;sub.cache=null;sub.reset=true;}this.dungeonProjection.sent.delete(identity.actor);this.adventure.sent.delete(identity.actor);return this.mailbox.connected(identity);
   },acknowledge:(...args)=>this.mailbox.acknowledge(...args),disconnected:identity=>{this.channel.mounts.dismount(identity.actor);this.lootConnections.delete(identity.actor);this.mailbox.disconnected(identity.actor);return request('disconnected',{actor:identity.actor,epoch:identity.epoch,session:identity.session,rates:this.rates.snapshot(identity)});},onFault:error=>this.fail(error)
  });
  this.events=new EventFanout({channel:peer.channel,cycle:()=>this.channel.world.cycle,players:this.channel.state.table('players'),peerPlayer:id=>this.world.peerPlayers.get(id),connected:id=>!!this.connections.identity(id)});
  this.mailbox=new ChannelMailbox({request,canSend:id=>this.connections.canNotifyR531(id),identity:id=>this.connections.identity(id),send:(id,packet)=>{
   const event=this.events.visible(packet.payload,id);
   // An old cosmetic notification may no longer match the viewer's current
   // area/visibility. It still has a stable delivery ID to acknowledge.
   return this.connections.send(id,{...packet,payload:event?{event}:null});
  },onFault:error=>this.fail(error)});
  this.origins=origins;this.coldTraffic=new Map();
  this.sharedEpoch=initial.sharedWorld?.epoch??null;this.sharedVersion=0;this.sharedSent=new Map();this.sharedPending=null;
 }
 // Read-only eligibility for cosmetic packets while SharedCombat owns an
 // ordinary resource hold. No hold, lane, actor or queue is changed here.
 heldMotion(id){
  const c=this.channel,h=this.sharedCombat.held,p=c.kernel.players.get(id),owner=c.owners.get(id),resident=c.state.owners.get(id),a=h?.actors.find(entry=>entry.id===id),lease=a?.lease;
  return Boolean(this.started&&!this.stopping&&!this.globalControl.held&&!c.control.entries.has(id)&&!this.sharedCombat.pending.get(id)?.returnMoves&&h&&a&&a.p===p&&p?.accepting&&p.suspended&&!p.quiescer&&p.externalHold===h.token&&a.suspended===false&&a.borrowed===false&&!a.cold&&!a.quiesced&&a.epoch===p.epoch&&a.epoch===owner?.epoch&&a.epoch===resident?.epoch&&resident.state==='active'&&lease?.state==='held'&&lease.owner===h.token&&c.lanes.held.get('player:'+id)===lease&&c.lanes.tokens.has(lease));
 }
 hydrate(bundle){this.bagCollect.forget(bundle.player.id);this.slimReload.capture(bundle);this.afkCheck?.hydrate(bundle);this.maintenance.hydrate(bundle.player);this.services.hydrate(bundle);this.castle.hydrate(bundle);this.adventure.refresh(bundle);this.dungeon.refreshActor(bundle);if(bundle.projection){const access=bundle.projection.guildAccess;demand(access?.area===bundle.player.area&&(access.deadlineMs===null||Number.isSafeInteger(access.deadlineMs)),'guild_access_snapshot');this.guildAccess.set(bundle.player.id,Object.freeze({...access}));this.world.update(bundle.player.id,bundle.projection.data,{friends:bundle.projection.friends,marketRevision:bundle.projection.marketRevision});}}
 drop(id){this.channel.retaliationMemory.forgetR52(id);this.bagCollect.forget(id);this.forceSharedActors.delete(id);this.slimReload.forget(id);this.afkCheck?.drop(id);this.lootConnections.delete(id);this.adventure.forget(id);this.castle.forget(id);this.maintenance.forget(id);this.dungeon.drop(id);this.services.forget(id);this.world.forget(id);this.guildAccess.delete(id);this.dungeonProjection.forget(id);this.events.forget(id);this.mailbox.disconnected(id);this.presenceVersion.delete(id);for(const entry of this.coldTraffic.values())if(entry.id===id)this.releaseColdTraffic(entry,{retired:true});}
 publish(args){if(!actorFaultIsolation)this.afkCheck?.event(args);const route=this.events.publish(args);if(!route)return;if(actorFaultIsolation)this.afkCheck?.event(args);if(route.channels?.some(ch=>ch!==this.peer.channel)||route.rooms?.some(r=>r.channel!==this.peer.channel))void this.request('event_relay',route).catch(error=>{if(actorFaultIsolation&&cosmeticRelayErrors.has(error?.code)){reportActorFault({channel:this.peer.channel,error});return;}this.fail(error);});}
 holdUnknownActor(id,command,{confirmed=false}={}){
  this.connections?.revoke({actor:id});if(!confirmed)return;
  const ids=new Set([id,...(command.payload?.resources??[]).filter(k=>typeof k==='string'&&k.startsWith('player:')).map(k=>k.slice(7))]);
  for(const actor of ids){const p=this.channel.kernel.players.get(actor);this.sharedCombat?.pendingActor(actor,p?.epoch);if(p?.quiescer){const waiter=p.quiescer;if(waiter.group){const index=waiter.group.findIndex(row=>row.p===p);demand(index>=0,'actor_pending_group');waiter.group.splice(index,1);}p.quiescer=null;waiter.reject(Object.assign(Error('actor_command_pending'),{code:'actor_command_pending'}));}}
 }
 async rejectedActorIdle(id,error){
  // Await already-started mode work only. Never run a new checkpoint with the
  // rejected base, and never retry a native economic action during quarantine.
  const tasks=[this.dungeon.pending.get(id)?.promise,this.dungeon.resident.pending.get(id)?.promise,this.adventure.pending,this.runeBoss.pending];
  for(const task of new Set(tasks.filter(t=>typeof t?.then==='function')))try{await task;}catch(e){const r=actorRejection(e);if(!r||r.actor!==id||r.epoch!==actorRejection(error)?.epoch)throw e;}
 }
 localKill(id,result){
  if(process.env.CORE511_LOCAL_KILL==='0')return null;
  const c=this.channel,raw=result?.boundary,b=raw&&{...raw,targets:Array.isArray(raw.targets)?[...new Set(raw.targets)]:raw.targets},limit=r35Options.localAoe?10:1,killer=c.view.player(id);
  if(!result?.durable||b?.reason!=='defeat'||!Array.isArray(b.targets)||!b.targets.length||b.targets.length>limit||b.players?.length||!killer)return null;
  if(killer.arena_match_id||killer.instance_id||killer.arenaMatchId||killer.instanceId||killer.area==='arena'||isAdventureArea(killer.area)&&!instanceRewardAreaR71(killer.area))return null;
  const ids=[],targets=[],add=pid=>{if(ids.includes(pid))return true;const group=this.localGroup(pid);if(!group)return false;for(const m of group)if(!ids.includes(m))ids.push(m);return true;};
  if(!add(id))return null;
  for(const target of b.targets){
   const m=c.view.monster(target);
   if(!m||m.channel!==this.peer.channel||m.is_boss||m.is_stone||killer.area!==m.area||this.forceShared.has(target+':'+m.spawn_round))return null;
   for(const row of c.attackMemory.participants.values())if(row.monster_id===target&&row.spawn_round===m.spawn_round&&!add(row.player_id))return null;
   targets.push({id:target,spawnRound:m.spawn_round});
  }
  return {ids,targets};
 }
 localCollect(id,input){
  if(!r35Options.localCollect||this.forceSharedActors.get(id)>Date.now())return null;
  const c=this.channel,ids=this.localGroup(id),snap=c.membership.snapshots.get(id);if(!ids||!snap||typeof input.targetId!=='string')return null;
  const drop=this.world.subscribers.get(id)?.data.drops?.find(d=>d.id===input.targetId);
  if(drop&&drop.owner_id!==id)return null;
  // Ordinary and catalog collectors mutate the owner/party inventory and
  // the owned drop only. Resident settlement still routes due shared combat
  // through its original lease before this local action may execute.
  const members=snap.party===null?[id]:snap.members.filter(m=>m.party===snap.party).map(m=>m.player).sort();
  return {ids,scope:{kind:'collect',target:input.targetId,owner:id,absent:!drop,monster:drop?.monster_id??null,dropKind:drop?.kind??null,party:snap.party,members}};
 }
 // Locality survives a known temporary hold. The action/attack/mixed loops
 // defer on group suspension, barriers and resource lanes before any write.
 // Accepted inputs must still drain while quiescing; routing them to shared
 // (or deferring merely for a quiescer) can make the freeze wait on itself.
 localResident(pid){
  const c=this.channel,owner=c.owners.get(pid),p=c.kernel.players.get(pid),resident=c.state.owners.get(pid),key='player:'+pid,lane=c.lanes.held.get(key);
  if(owner?.channel!==this.peer.channel||owner.incarnation!==this.peer.incarnation||!p||p.passive||owner.passive===1||p.epoch!==owner.epoch||resident?.epoch!==p.epoch||!c.membership.snapshots.has(pid)||c.kernel.failure||c.writer?.failed?.has(pid))return false;
  const held=(lease,token)=>lease?.state==='held'&&lease.owner===token&&lane===lease&&c.lanes.tokens.has(lease);
  if(lane&&(lane.state!=='held'||!c.lanes.tokens.has(lane)))return false;
  const cold=c.control?.entries.get(pid),global=this.globalControl?.held,globalActor=global?.actors.find(a=>a.id===pid&&a.epoch===p.epoch);
  if(cold&&(cold.id!==pid||cold.epoch!==p.epoch||typeof cold.token!=='string'||!['freezing','frozen'].includes(cold.phase)||cold.lease&&!held(cold.lease,cold.token)||cold.phase==='frozen'&&!held(cold.lease,cold.token)))return false;
  if(globalActor&&(!['freezing','frozen'].includes(global.phase)||global.lease&&!held(global.lease,global.token)&&!global.extraLeases?.some(lease=>held(lease,global.token))))return false;
  const shared=this.sharedCombat?.held,actor=shared?.actors.find(a=>a.id===pid&&a.epoch===p.epoch&&a.p===p);
  const sharedHeld=actor&&p.externalHold===shared.token&&(held(actor.lease,shared.token)||actor.borrowed&&(cold?.phase==='frozen'&&actor.cold?.token===cold.token||globalActor));
  if(p.externalHold&&!sharedHeld)return false;
  if(p.suspended)return Boolean((cold||globalActor||sharedHeld)&&['active','draining','quiesced'].includes(resident.state));
  return resident.state==='active'&&(p.accepting||p.quiescer)&&(!cold||cold.phase==='freezing');
 }
 // The reward recipients a plain kill/claim can write for pid: pid alone, or
 // its whole party when every member is a resident here with the same roster
 // (native XP sharing reaches only same-channel allies). Otherwise null.
 localGroup(pid){
  const c=this.channel,snap=c.membership.snapshots.get(pid);if(!this.localResident(pid))return null;
  if(snap.party===null)return c.membership.parties.has(pid)?null:[pid];
  if(this.forceSharedActors.get(pid)>Date.now())return null;
  const roster=snap.members.filter(m=>m.party===snap.party),members=roster.map(m=>m.player),key=JSON.stringify([...members].sort()),group=[];if(!members.includes(pid)||members.length>5)return null;
  // A member offline at the last bundle read may be written offline (native
  // offline rewards); one live on another channel needs the shared barrier.
  for(const m of roster){
   if(!this.localResident(m.player)){if(m.live!==0||process.env.CORE511_LOCAL_PARTY_OFFLINE!=='1')return null;continue;}
   const other=c.membership.snapshots.get(m.player);if(this.forceSharedActors.get(m.player)>Date.now()||other.party!==snap.party||c.membership.parties.get(m.player)!==snap.party||JSON.stringify(other.members.filter(x=>x.party===snap.party).map(x=>x.player).sort())!==key)return null;
   group.push(m.player);
  }
  return group;
 }
 // claim_rewards credits every participant of the claimed rounds at once. Run
 // it locally only for plain monsters of this channel whose known participants
 // are partyless residents; the writer re-checks the real participant rows.
 localClaim(id,input){
  if(process.env.CORE511_LOCAL_CLAIM==='0')return null;
  const c=this.channel,player=c.view.player(id);
  if(!player||player.arena_match_id||player.area==='arena'||isAdventureArea(player.area)&&!instanceRewardAreaR71(player.area)||!Array.isArray(input.rewardTargets))return null;
  const nativeLimit=r37Options.claimChunks&&input.rewardTargets.length>100,targets=nativeLimit?nativeClaimPrefix(input.rewardTargets):localClaimTargets(input.rewardTargets,r37Options.claimChunks?100:10);if(!targets)return null;
  if(c.completedClaimHintsR56?.has(c.world.cycle,targets)&&targets.every(t=>{const m=c.view.monster(t.id);return m&&m.channel===this.peer.channel&&!m.is_boss&&!m.is_stone&&m.area===player.area&&!this.forceShared.has(t.id+':'+t.spawnRound);})){return {ids:[id],targets,completedR56:true,...(nativeLimit?{nativeLimit:true}:{})};}
  const ids=[],add=pid=>{if(ids.includes(pid))return true;const group=this.localGroup(pid);if(!group)return false;for(const m of group)if(!ids.includes(m))ids.push(m);return true;};
  if(!add(id))return null;
  for(const t of targets){
   const m=c.view.monster(t.id);
   if(t.id==='dunya-bosu-1'||t.id.startsWith('sinsi-tasi-')||!m||m.channel!==this.peer.channel||m.is_boss||m.is_stone||m.area!==player.area||this.forceShared.has(t.id+':'+t.spawnRound))return null;
   if(claimHistoryR51&&m.spawn_round!==t.spawnRound){const actors=c.attackMemory.claimHistory?.get(t.id,t.spawnRound);if(!actors)return null;for(const actor of actors)if(!add(actor))return null;}
   for(const row of c.attackMemory.participants.values()){
    if(row.monster_id!==t.id||row.spawn_round!==t.spawnRound)continue;
    if(!add(row.player_id))return null;
   }
  }
  return {ids,targets,...(nativeLimit?{nativeLimit:true}:{})};
 }
 // A writer scope rejection (CURRENT DB disagreed with this channel's view)
 // routes the same monster round through the original shared path next time.
 pruneForcedShared(now=Date.now()){for(const [id,until]of this.forceSharedActors)if(until<=now)this.forceSharedActors.delete(id);for(const [key,at]of this.forceShared)if(now-at>=60000)this.forceShared.delete(key);}
 forceSharedActor(id,ms=60000){this.pruneForcedShared();this.forceSharedActors.delete(id);this.forceSharedActors.set(id,Date.now()+Math.min(60000,Math.max(0,ms)));while(this.forceSharedActors.size>4096)this.forceSharedActors.delete(this.forceSharedActors.keys().next().value);}
 forceSharedTargets(targets,actor=null){if(actor)this.forceSharedActor(actor);else this.pruneForcedShared();for(const t of targets??[]){this.forceShared.set(t.id+':'+t.spawnRound,Date.now());if(this.forceShared.size>4096)this.forceShared.delete(this.forceShared.keys().next().value);}}
 project(context){
  this.world.sync(context.changes,context.now);
  if(!this.connections.canProjectR531(context.id))return context.results.length?{type:'frame',protocol:PROTOCOL,results:context.results,lastApplied:context.lastApplied}:null;
  const packet=this.world.project(context),dungeon=this.dungeonProjection.changed(context.id,context.now),events=this.events.take(context.id),adventure=this.adventure.project(context.id,context.now),castle=this.castle.project(context.id,context.now),motions=this.motion.take(context.id,context.changes,context.now),afkCheck=this.afkCheck?.project(context.id);
  if(motions?.length)this.world.wire.prepareMotions(motions);this.world.wire.prepareEvents(events);
  if(!packet&&!dungeon&&!adventure&&!castle&&!events.length&&!motions?.length&&!afkCheck)return null;return {...(packet??{type:'frame',protocol:PROTOCOL,results:context.results,lastApplied:context.lastApplied}),...(dungeon?{dungeon}:{}),...(adventure?{adventure}:{}),...(castle?{castle}:{}),...(events.length?{events}:{}),...(motions?.length?{motions}:{}),...(afkCheck?{afkCheck}:{})};
 }
 async flushPresence(){
  if(this.presencePending)return this.presencePending;const rows=this.channel.presence.batch().filter(r=>!this.mailbox.held(r.actor)&&r.version!==(this.presenceVersion.get(r.actor)??0));if(!rows.length)return;
  const task=this.request('presence',rows).then(()=>{for(const row of rows)if(this.channel.owners.get(row.actor)?.epoch===row.epoch)this.presenceVersion.set(row.actor,row.version);},error=>{if(actorFaultIsolation&&error?.code==='ipc_backpressure'&&consumeTransportNotSent(error,'presence',rows)){reportActorFault({channel:this.peer.channel,error});return;}throw error;});this.presencePending=task;
  try{await task;}finally{if(this.presencePending===task)this.presencePending=null;}
 }
 async flushShared(){
  if(this.sharedEpoch===null||this.sharedPending||this.stopping)return;
  const rows=[];for(const [actor,owner]of this.channel.owners){const resident=this.channel.kernel.players.get(actor);if(resident?.suspended||resident?.quiescer||this.mailbox.held(actor))continue;const engagement=this.channel.view.engagements.get(actor)??null,old=this.sharedSent.get(actor);if(shouldSyncEngagement(old,owner.epoch,engagement,id=>this.channel.view.monster(id)))rows.push({actor,epoch:owner.epoch,engagement});}
  if(!rows.length)return;const worldEpoch=this.sharedEpoch,task=this.request('world_engagements',rows).then(()=>{if(this.sharedEpoch===worldEpoch)for(const row of rows)if(this.channel.owners.get(row.actor)?.epoch===row.epoch)this.sharedSent.set(row.actor,row);},error=>{if(actorFaultIsolation&&error?.code==='ipc_backpressure'&&consumeTransportNotSent(error,'world_engagements',rows)){reportActorFault({channel:this.peer.channel,error});return;}throw error;});this.sharedPending=task;
  try{await task;}finally{if(this.sharedPending===task)this.sharedPending=null;}
 }
 async holdColdTraffic(requests){
  // Start the final presence flush and synchronously close every auxiliary
  // producer before awaiting anything. Frozen gameplay alone does not stop
  // delayed mailbox wakeups, browser event ACKs or world engagement sends.
  const presence=this.flushPresence(),holds=[];
  for(const request of requests){
   this.channel.control.validate(request);const {id,epoch,token}=request,old=this.coldTraffic.get(token);
   if(old){demand(old.id===id&&old.epoch===epoch,'cold_traffic_token_reused');holds.push(old.promise);continue;}
   if(this.channel.control.completed.has(token))continue;
   const entry={id,epoch,token,mailToken:'cold:'+token,promise:null};this.coldTraffic.set(token,entry);
   entry.promise=this.mailbox.hold(entry.mailToken,[id]);holds.push(entry.promise);
  }
  await Promise.all([presence,this.sharedPending,...holds].filter(Boolean));
 }
 releaseColdTraffic({id,epoch,token},{retired=false}={}){
  const entry=this.coldTraffic.get(token);if(!entry)return;
  demand(entry.id===id&&entry.epoch===epoch,'cold_traffic_release_fenced');
  this.coldTraffic.delete(token);if(retired)this.mailbox.retire(entry.mailToken);else this.mailbox.resume(entry.mailToken);
 }
 async control(method,payload){
  if(actorFaultIsolation&&method==='isolate_detach')return this.channel.quarantines.detach(payload);
  if(method==='global_pending'){
   demand(typeof payload?.token==='string'&&payload.token.length>=16,'global_pending_scope');
   if(payload.pending){demand(!this.sharedPaused||this.sharedPaused===payload.token,'global_pending_busy');this.sharedPaused=payload.token;}
   else{demand(!this.sharedPaused||this.sharedPaused===payload.token,'global_pending_fenced');this.sharedPaused=null;}
   return {token:payload.token,pending:Boolean(this.sharedPaused)};
  }
  if(method==='mount_state'){const identity=this.channel.identities.get(payload?.actor);if(!identity||identity.epoch!==payload?.epoch||this.sessions.check(identity)!==true)return {ok:false,status:409,code:'mount_owner_fenced',mount:null};return this.channel.mountToggle(payload);}
  if(method==='castle_config_r59')return this.castle.configure(payload);
  if(method==='motion_settings')return {ok:this.motion.configure(payload)};
  if(method==='afk_inspect')return this.afkCheck?.inspect(payload?.actors)??[];
  if(method==='afk_check')return this.afkCheck?.control(payload)??{disabled:true};
  if(method==='maintenance'){const ack=this.maintenance.apply(payload);this.sessions.sweep();return ack;}
  if(method==='prepare_stop'){this.stopping=true;return this.globalControl.freeze(payload);}
  if(method==='quiesce_process'){
   this.globalControl.validate(payload.token);await this.sharedCombat.idle();demand(this.stopping&&!this.sharedCombat.pending.size&&!this.sharedCombat.held&&[...this.channel.kernel.players.values()].every(p=>p.suspended&&!p.barrier&&!p.quiescer&&!p.externalHold),'shutdown_channel_pending');
   this.channel.stop();await this.channel.systemWriter?.drain();await this.flushPresence();return {drained:true,token:payload.token};
  }
  if(method==='shared_hold')return this.sharedCombat.hold(payload);
  if(actorFaultIsolation&&method==='shared_abort')return this.sharedCombat.abortHold(payload);
  if(method==='shared_release')return this.sharedCombat.release(payload);
  if(method==='shared_export')return this.sharedCombat.export(payload);
  if(method==='shared_admit')return this.sharedCombat.admit(payload);
  if(method==='market_state')return this.world.setMarket(payload);
  if(method==='cleanup_freeze')return this.cleanupControl.freeze(payload);
  if(method==='cleanup_commit')return this.cleanupControl.commit(payload);
  if(method==='cleanup_resume')return this.cleanupControl.resume(payload);
  if(method==='settlement_freeze')return this.settlementRead.freeze(payload);
  if(method==='settlement_resume')return this.settlementRead.resume(payload);
  if(method==='global_freeze')return this.globalControl.freeze(payload);
  if(actorFaultIsolation&&method==='global_abort_freeze')return this.globalControl.abortFreeze(payload);
  if(method==='global_snapshot')return this.globalControl.snapshot(payload);
  if(method==='global_export')return this.globalControl.export(payload);
  if(method==='global_admit')return this.globalControl.admit(payload);
  if(method==='global_refresh')return this.globalControl.refresh(payload);
  if(method==='gm_visibility')return this.globalControl.visibility(payload);
  if(method==='global_resume')return this.globalControl.resume(payload);
  if(method==='world_state'){
   if(acceptWorldPoint(this.worldPoint,payload)){demand(payload.world.cycle===this.channel.world.cycle,'world_state_cycle_requires_reset');this.worldPoint=payload;Object.assign(this.channel.world,payload.world);this.world.setWorld(payload.world,this.world.native.totalOnline);}
   return {revision:this.worldPoint.revision};
  }
  if(method==='shared_world'){
   demand(Number.isSafeInteger(payload.epoch)&&payload.epoch>0&&Number.isSafeInteger(payload.version)&&payload.version>0&&payload.cycle===this.channel.world.cycle&&Array.isArray(payload.monsters)&&payload.monsters.every(m=>m?.channel===0),'channel_shared_world_scope');
   if(this.sharedEpoch!==null&&payload.epoch<this.sharedEpoch||payload.epoch===this.sharedEpoch&&payload.version<=this.sharedVersion)return {ignored:true};
   demand(payload.full||payload.epoch===this.sharedEpoch&&payload.version===this.sharedVersion+1,'channel_shared_world_gap');
   if(payload.epoch!==this.sharedEpoch)this.sharedSent.clear();
   if(payload.full){const ids=new Set(payload.monsters.map(m=>m.id));for(const [id,m]of this.channel.view.monsters)if(m.channel===0&&!ids.has(id)){this.channel.view.removeMonster(id);this.world.removeSharedMonster(id);}}
   for(const row of payload.monsters){this.channel.setMonster(row);this.world.setSharedMonster(row);}this.sharedEpoch=payload.epoch;this.sharedVersion=payload.version;return {epoch:payload.epoch,version:payload.version};
  }
  if(method==='admit_passive'){
   const {bundle,identity}=payload;demand(bundle?.owner?.passive===1&&bundle.owner.epoch===identity.epoch&&bundle.player.id===identity.actor&&!this.channel.owners.has(identity.actor),'channel_passive_admission');
   this.channel.admit(bundle,identity);return {admitted:true,passive:true,epoch:identity.epoch};
  }
  if(method==='admit_held'){
   const {identity,frozen}=payload;demand(frozen?.id===identity.actor&&frozen.epoch===identity.epoch,'channel_held_admission_scope');
   const admitted=await this.control('admit',payload),ack=await this.control('freeze',frozen);demand(!ack.retired,'channel_held_admission_retired');return {...admitted,frozen:ack};
  }
  if(method==='admit'||method==='rebind'){
   const {bundle,identity,security,rates}=payload,previous=this.channel.owners.get(identity.actor);
   demand(security.actor===identity.actor&&security.session===identity.session&&security.epoch===identity.epoch,'channel_admission_security');
   if(previous?.epoch===identity.epoch){demand(this.sessions.check(identity)===true,'channel_admission_replay_fenced');return {admitted:true,epoch:identity.epoch};}
   if(method==='rebind'){demand(!this.channel.control.entries.has(identity.actor)||payload.frozen,'channel_frozen_token_required');if(payload.frozen)this.channel.control.retireFrozen(payload.frozen);this.connections.revoke({actor:identity.actor});if(payload.frozen)this.releaseColdTraffic(payload.frozen,{retired:true});this.channel.rebind(bundle,identity);}else this.channel.admit(bundle,identity);
   this.sessions.update(security);if(rates)this.rates.restore(identity,rates);return {admitted:true,epoch:identity.epoch};
  }
  if(rewardRecoverySchedulerR52&&method==='freeze_idle_group'){
   const response=await this.channel.control.freezeIdleGroup(payload.requests,()=>this.holdColdTraffic(payload.requests));
   if(response.deferred)return response;
   return {acks:response.acks.map((ack,i)=>{if(ack.retired)this.releaseColdTraffic(payload.requests[i],{retired:true});const identity=this.channel.identities.get(ack.id);return {...ack,rates:identity?this.rates.snapshot(identity):null};})};
  }
  if(actorFaultIsolation&&(method==='freeze'||method==='freeze_group')){const ids=method==='freeze'?[payload.id]:payload.requests.map(p=>p.id);demand(!ids.some(id=>this.commandRecovery.hasActor(id,{confirmedOnly:true})),'actor_command_pending');}
  if(method==='freeze'){await this.holdColdTraffic([payload]);const ack=await this.channel.control.freeze(payload),identity=this.channel.identities.get(payload.id);if(ack.retired)this.releaseColdTraffic(payload,{retired:true});return {...ack,rates:identity?this.rates.snapshot(identity):null};}
  if(method==='freeze_group'){await this.holdColdTraffic(payload.requests);const acks=await this.channel.control.freezeGroup(payload.requests);return acks.map((ack,i)=>{if(ack.retired)this.releaseColdTraffic(payload.requests[i],{retired:true});const identity=this.channel.identities.get(ack.id);return {...ack,rates:identity?this.rates.snapshot(identity):null};});}
  if(method==='resume'){const ack=await this.channel.control.resume(payload);this.releaseColdTraffic(payload);return ack;}
  if(method==='refresh_frozen')return this.channel.control.refresh(payload);
  if(method==='drain'){const result=await this.channel.drain(payload.actor);demand(result.epoch===payload.epoch,'channel_drain_fenced');const identity=this.channel.identities.get(payload.actor);return {...result,rates:this.rates.snapshot(identity)};}
  if(method==='detach'){demand(this.channel.owners.get(payload.actor)?.epoch===payload.epoch,'channel_detach_fenced');demand(!this.channel.control.entries.has(payload.actor)||payload.frozen,'channel_frozen_token_required');if(payload.frozen)this.channel.control.retireFrozen(payload.frozen);this.connections.revoke({actor:payload.actor});this.channel.detach(payload.actor);return {detached:true};}
  if(method==='sessions_r53')return receiveControlBatchR53(payload,row=>{
   // A revoke/rebind may have overtaken the optional batch. A retired lower
   // revision can never recreate a session or extend its absolute expiry.
   demand(row&&row.channel===this.peer.channel&&row.incarnation===this.peer.incarnation&&Number.isSafeInteger(row.revision),'session_mirror_channel');
   if(row.revision<=(this.sessions.revisions.get(row.actor)??0))return {revision:row.revision,stale:true};
   this.sessions.update(row);return {revision:row.revision};
  });
  if(method==='session'){this.sessions.update(payload);return {revision:payload.revision};}
  if(method==='revoke'){this.channel.mounts.dismount(payload.actor);this.sessions.retire(payload.actor,payload.revision);return {revoked:true};}
  if(method==='notifications'){this.mailbox.changed(payload.actors);return {queued:true};}
  if(method==='event'){this.events.receive(payload);return {queued:true};}
  if(method==='configuration'){
   demand([...this.channel.kernel.players.values()].every(p=>p.suspended),'configuration_requires_freeze');this.services.configure(payload.config);this.channel.settings=payload.settings;this.channel.frames.setProfiles(payload.profiles,payload.config.revision);return {revision:payload.config.revision};
  }
  if(method==='metrics')return this.snapshot();
  if(method==='load_measure')return this.loadWindow.command(payload);
  if(method==='profile')return this.profiler.command(payload);
  throw Object.assign(Error('unknown_channel_control'),{code:'unknown_channel_control'});
 }
 start(){demand(!this.started&&!this.stopping,'channel_already_started');this.started=true;this.channel.start();this.timer=setInterval(()=>{this.pruneForcedShared();this.sessions.sweep();if(actorFaultIsolation){this.commandRecovery.poll();this.readRecovery.poll();this.releaseRecovery.poll();}void this.flushPresence().catch(e=>this.fail(e));},1000);this.timer.unref();}
 endpoint(WebSocketServer){demand(!this.webSocketEndpoint,'channel_endpoint_exists');return this.webSocketEndpoint=createChannelWebSocketEndpoint({WebSocketServer,channel:this.peer.channel,boot:this.peer.incarnation,origins:this.origins,budget:this.budget,connections:this.connections,onFault:e=>this.fail(e)});}
 snapshot(){const now=performance.now(),elapsed=now-this.lastSample,elu=performance.eventLoopUtilization();if(elapsed>=1000){this.health={elu:performance.eventLoopUtilization(elu,this.lastElu).utilization,messagesPerSecond:(this.channel.kernel.metrics.messages-this.lastMessages)*1000/elapsed};this.lastSample=now;this.lastElu=elu;this.lastMessages=this.channel.kernel.metrics.messages;}const sorted=[...this.ackSamples].sort((a,b)=>a-b);return {...this.health,castleCombatR59:{...castleCombatStatsR59},...this.channel.kernel.snapshot(),stagesR51:stageSnapshotR51(),deathWaitR82:deathLatencyR82.snapshot(),r54Capture:this.channel.attack.lastCaptureR54??null,r52:{actorSections:{...actorSectionMetricsR52},itemRefreshR57:{...itemRefreshMetricsR57},rewardRecovery:{...this.channel.control.idleMetrics},mixedParticipants:{...mixedParticipantMetricsR52},aggroSpatialIndex:this.channel.view.aggroSpatialIndexR52?.snapshot()??null,retaliationQueue:this.channel.retaliationMemory.dueQueueR52?{...this.channel.retaliationMemory.dueQueueR52.metrics}:null},collect:{...collectMetrics},writerAckP95Ms:sorted[Math.max(0,Math.ceil(sorted.length*.95)-1)]??0,world:{...this.world.metrics},motion:{...this.motion.metrics,rejectReasons:{...this.motion.metrics.rejectReasons}},dungeon:{...this.dungeon.resident.metrics},process:runtimePerformance().snapshot()};}
 fail(error){if(this.channel?.handleActorFailure(error))return;if(this.failure)return;this.failure=error;this.close();this.onFatal(error);}
 close(){this.stopping=true;this.maintenance.close();clearInterval(this.timer);this.commandRecovery.close();this.readRecovery.close();this.mailbox.close();this.profiler.close();this.loadWindow.close();this.channel.stop();if(this.webSocketEndpoint)this.webSocketEndpoint.close();else this.connections.close();}
}
