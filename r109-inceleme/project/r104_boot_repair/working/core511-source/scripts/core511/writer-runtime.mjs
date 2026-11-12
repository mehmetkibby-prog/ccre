import {installDailyMonsterRewardsR76} from './daily-monster-rewards-r76.mjs';
import {potionBatchHandlerR61,finishPotionBatchFailureR61,runPotionBatchContextR61} from './potion-batch-writer-r61.mjs';
import {createCastleJoinedR59} from './castle-joined-r59.mjs';
import {evacuateCastleOfflineR59} from './castle-offline-r59.mjs';
import {castleEnabled} from './castle-model-r59.mjs';
import {castleCombatCandidateR59,certifyCastleCombatR59} from './castle-combat-refresh-r59.mjs';
import {installGuildCapacityR59} from './guild-capacity-r59.mjs';
import {installCastleCapacityR59} from './castle-capacity-sql-r59.mjs';
import {createCastleStepR59} from './castle-channel-r59.mjs';
import {initializeXpGroupR56} from './xp-group-r56.mjs';
import {createJoinedClaimActorsR56} from './claim-actor-join-r56.mjs';
import {createJoinedCheckpointR53} from './joined-checkpoint-r53.mjs';
import {initializeRewardSqlR531} from './reward-sql-r531.mjs';
import {runAbandonedNormal} from './abandoned-normal.mjs';
import {runScopedRewardR79} from './scoped-reward-maintenance-r79.mjs';
import {WriterSettings} from './writer-settings.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {r35Options} from './r35-options.mjs';
import {WriterMaintenance} from './writer-maintenance.mjs';
import {createAdventureHandler} from './adventure-writer.mjs';
import {SharedRefreshScope} from './shared-refresh-scope.mjs';
import {installRewardGroupCommitR53} from './reward-group-commit-r53.mjs';
import {installGroupCommit} from './group-commit.mjs';
import {prepareCached477,withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {ChannelOwnership,registerOwnedRule} from './ownership.mjs';
import {NativeGameServices} from './game-services.mjs';
import {WriterPresence} from './presence.mjs';
import {NotificationOutbox} from './notification-outbox.mjs';
import {createActorCheckpointHandler} from './actor-checkpoint.mjs';
import {createCombatCheckpointHandler} from './combat-checkpoint.mjs';
import {createCheckpointResourceGuard} from './checkpoint-resource-guard.mjs';
import {createAttackWriterHandler,createMonsterRewardHandler} from './attack-writer.mjs';
import {createPvpWriterHandler} from './pvp-writer.mjs';
import {createActionWriterHandler} from './action-writer.mjs';
import {createRetaliationWriterHandler} from './retaliation-writer.mjs';
import {createDungeonWriterHandler,createDungeonEntryWriterHandler} from './dungeon-runtime.mjs';
import {createModeWriterHandler} from './mode-writer.mjs';
import {createMovementWriterHandler} from './movement-action.mjs';
import {writerSettlement} from './combat-settlement.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {SystemWriter} from './system-writer.mjs';
import {createRespawnHandler,createRepairHandler,createDragonTickHandler} from './monster-lifecycle.mjs';
import {DurableWorldState} from './world-state.mjs';
import {createWorldUpkeepHandler,createWorldTransitionHandler} from './world-jobs.mjs';
import {createCleanupHandler} from './world-cleanup.mjs';
import {ensureWorldCleanupIndexes} from './generated/world-cleanup-rules.mjs';
import {DurableMarketState,readMarketRevision} from './market-state.mjs';
import {createPlayerJobHandler} from './player-jobs.mjs';
import {DurableGuildState,readGuildRevision} from './guild-state.mjs';
import {createRuneBossHandler} from './rune-boss-writer.mjs';
import {ensureGuildWarReturns,captureReturnOwners,reconcileReturnOwners,finalizeReturnSequence} from './guild-war.mjs';
import {createHeartbeatWriterHandler} from './heartbeat-writer.mjs';
import {createNativeGameplayRates} from './gameplay-rate.mjs';
import {resolveNativeNotificationRecipients,captureNotificationVisibility} from './notification-audience.mjs';
import {recordNativeSecurityEvent} from './generated/mode-policy.mjs';
import {PlayerWriteScope} from './player-write-scope.mjs';
import {MonsterWriteScope,includeWrittenMonsters} from './monster-write-scope.mjs';
import {ensureDungeonFinalizations,recordDungeonFinalization} from './dungeon-finalizations.mjs';
import {assertSettlementResources} from './settlement-resources.mjs';
import {assertNativeWriteResources} from './native-write-resources.mjs';
import {performance} from 'node:perf_hooks';
import {actorSectionCandidateR52,certifyActorSectionsR52} from './actor-section-reuse-r52.mjs';
import {captureCommitSectionsR57} from './actor-commit-sections-r57.mjs';
import {captureItemRefreshR57} from './item-refresh-r57.mjs';
import {runDeathBatchContextR57} from './death-batch-writer-r57.mjs';
import {r37Options} from './r37-options.mjs';
import {CollectWriteAudit,collectLightResult,collectMetrics,collectTime} from './collect-light.mjs';
import {CommandFailureScope} from './command-failure-scope.mjs';
import {captureServiceTransactions} from './service-transaction.mjs';
import {installBagLimit} from './bag-limit.mjs';

// The actual sole-writer composition. A security port is required; resource
// ownership is intrinsic, with an optional additional policy. Neither uses a
// test-account flag. It starts no timers and performs no legacy reset/migration.
export class GameWriter {
 constructor(database,{realmId,ports,clock=Date.now}){
  demand(typeof ports?.guard==='function','game_writer_port_guard');demand(ports.assertResources===undefined||typeof ports.assertResources==='function','game_writer_port_assertResources');
  Object.assign(this,{database,ports,clock});this.commandFailures=new CommandFailureScope(database.sqlite,{clock,checkpoint:()=>captureServiceTransactions(this.services.database),onRollback:restore=>{restore();this.services.globals.__colAdventure.profileCache.clear();}});this.durableGroups=installGroupCommit(database);this.rewardGroupsR53=installRewardGroupCommitR53(database);this.authority=new ChannelOwnership(database,{realmId,now:clock});this.owners=new Map();
  this.playerWrites=new PlayerWriteScope(this.authority);this.sharedRefresh=new SharedRefreshScope({affectedActors:()=>this.playerWrites.ids()});
  this.monsterWrites=new MonsterWriteScope();this.settingsCache=new WriterSettings();
  this.authority.presenceOwner=id=>this.owners.get(id);this.presence=new WriterPresence(this.authority,{clock});
  this.notifications=new NotificationOutbox(database,{resolveRecipients:resolveNativeNotificationRecipients,captureRoute:captureNotificationVisibility,clock});
  this.services=new NativeGameServices(database.sqlite,{clock});
  this.gameplayRates=createNativeGameplayRates(database.sqlite,{globals:this.services.globals,clock,onApplied:restore=>this.commandFailures.preserve(restore)});
  this.system=new SystemWriter(database,{realmId,authority:this.authority,clock});
  this.collectAudit=new CollectWriteAudit();this.collectMetrics=collectMetrics;this.inflight=0;this.maintenance=new WriterMaintenance(this,{clock});
  this.system.add('abandoned_normal',(sql,payload,context)=>runAbandonedNormal(this,sql,payload,context));
  this.system.add('scoped_reward',(sql,payload,context)=>runScopedRewardR79(this,sql,payload,context));
  this.system.add('monster_respawn',createRespawnHandler({services:this.services,clock}));
  this.system.add('castle_step',createCastleStepR59(this.services));
  this.system.add('adventure_step',createAdventureHandler({services:this.services,authority:this.authority,clock}));
  this.system.add('rune_boss_step',createRuneBossHandler({services:this.services,authority:this.authority,clock}));
  this.system.add('monster_repair',createRepairHandler({services:this.services,clock}));
  this.system.add('dragon_tick',createDragonTickHandler({services:this.services,clock}));
  this.system.add('world_upkeep',createWorldUpkeepHandler({services:this.services,clock}));
  this.system.add('player_upkeep',createPlayerJobHandler({database,services:this.services,clock,assertHeld:(...args)=>{demand(this.playerJobs,'player_job_coordinator_missing');return this.playerJobs.assertHeld(...args);}}));
  this.system.add('world_cleanup_batch',createCleanupHandler({clock,assertHeld:(...args)=>{demand(this.cleanupCoordinator,'cleanup_coordinator_missing');return this.cleanupCoordinator.assertHeld(...args);}}));
  const worldTransition=createWorldTransitionHandler({services:this.services,clock,authority:this.authority,appendEvents:(...args)=>this.notifications.append(...args),assertHeartbeat:(...args)=>{demand(this.heartbeatJobs,'heartbeat_coordinator_missing');return this.heartbeatJobs.assertHeld(...args);},assertFrozen:(...args)=>{demand(this.globalWorld,'world_transition_coordinator_missing');return this.globalWorld.assertFrozen(...args);}});
  this.system.add('world_transition',(sql,payload,context)=>this.sharedRefresh.run(sql,payload,context,()=>worldTransition(sql,payload,context),{global:r35Options.globalRefresh&&payload.mode==='heartbeat'}));
  const checkpointResources=createCheckpointResourceGuard(this.authority);
  this.system.add('combat_checkpoint',createCombatCheckpointHandler({assertResources:checkpointResources}));
  const own=(sql,peer,id,epoch)=>Boolean(this.authority.assertAdmitted(sql,peer,id,epoch)),simulated=(sql,peer,id,epoch)=>Boolean(this.authority.assertSimulated(sql,peer,id,epoch));
  const resources=(sql,payload,context,{settlement=true}={})=>{const owned=assertNativeWriteResources(sql,payload,context,{authority:this.authority,shared:this.sharedCombat});if(settlement)assertSettlementResources(sql,payload,context);return ports.assertResources?ports.assertResources(sql,payload,context):owned;};
  const dependencies={joinCastleR59:createCastleJoinedR59(this.authority),guardBatchActorR57:(sql,payload,context)=>demand(ports.guard(sql,payload,context,'attack')===true,'game_writer_security'),runBatchContextR57:(payload,work)=>runDeathBatchContextR57(this.services,payload,work),joinClaimActorsR56:createJoinedClaimActorsR56(this.authority),joinCheckpointR53:createJoinedCheckpointR53(this.authority),globalsFor:()=>this.services.globals,settingsFor:sql=>this.settingsCache.read(sql),assertOwnership:own,assertResources:resources,affectedActors:()=>this.playerWrites.ids(),enforceRateLimit:this.gameplayRates.enforce,recordSecurityEvent:recordNativeSecurityEvent,mixedPorts:ports.mixedPorts,settleRetaliation:writerSettlement,randomFor:()=>{demand(this.services.active,'game_random_context');return this.services.active;},clock};
  const add=(kind,handler,{random=true,simulation=false,...options}={})=>registerOwnedRule(this.authority,kind,(sql,payload,context)=>{const result=this.commandFailures.run(kind,payload,context,()=>{
   demand(ports.guard(sql,payload,context,kind)===true,'game_writer_security');
   const isCombat=kind==='attack'||kind==='pvp_attack',potion=kind==='native_action'&&payload.input?.action==='use_potion',completedClaim=kind==='native_action'&&payload.input?.action==='claim_rewards'&&payload.localScope?.completedR56===true;
   const collect=kind==='native_action'&&payload.input?.action==='collect',auditCollect=collect&&r37Options.collectLight&&payload.localScope?.kind==='collect';let collectSafe=false;
   const native=()=>{const start=performance.now(),audited=auditCollect?this.collectAudit.run(sql,payload,()=>handler(sql,payload,context)):{result:handler(sql,payload,context),safe:false},result=audited.result,at=performance.now();collectSafe=audited.safe;if(collect)collectTime('nativeWriter',at-start);const appended=this.notifications.append(sql,context,isCombat?includeWrittenMonsters(sql,result,this.monsterWrites.ids()):result,{immediatePublisher:['attack','pvp_attack','native_action','movement'].includes(kind)});if(collect)collectTime('notification',performance.now()-at);return appended;};
   const combat=()=>isCombat||potion||completedClaim?this.monsterWrites.run(sql,payload,context,native,{shared:this.sharedCombat,readOnly:potion||completedClaim}):native();
   const work=()=>this.playerWrites.run(sql,payload,context,kind,()=>{const result=this.sharedRefresh.run(sql,payload,context,combat,{global:collect&&r37Options.collectLight&&payload.localScope?.kind==='collect',local:actorSectionCandidateR52(kind,payload)||castleCombatCandidateR59(kind,payload)});const start=performance.now(),value=collect&&collectSafe?collectLightResult(sql,payload,result):result;if(collect)collectTime('changedRows',performance.now()-start);return captureItemRefreshR57(sql,kind,payload,context,captureCommitSectionsR57(sql,certifyActorSectionsR52(sql,kind,payload,context,certifyCastleCombatR59(sql,kind,payload,context,value))));},{shared:this.sharedCombat});
   if(!random)return work();
   if(kind==='dungeon'||kind==='dungeon_entry'||kind==='retaliation_death'||kind==='movement'||kind==='heartbeat'){
    const rng=new OperationRandom(payload.seed),nowMs=payload.nowMs??payload.operation?.now;
    return this.services.run({seed:payload.seed,nowMs},work,{random:()=>rng.roll(),roll:()=>rng.roll(),uuid:()=>rng.uuid(),integer:(...args)=>rng.integer(...args)});
   }
   return this.services.run(payload,work);
  });return kind==='native_action'?finishPotionBatchFailureR61(sql,payload,result):result;},{...options,allowSimulation:simulation});
  add('actor_checkpoint',createActorCheckpointHandler(),{random:false,simulation:true,duringDrain:true});
  // The older actor-addressed journal has the same channel-wide payload as
  // the system journal. Both paths must derive resource ownership from SQL;
  // an external gameplay callback cannot authorize another owner's journal.
  add('combat_checkpoint',createCombatCheckpointHandler({assertResources:checkpointResources}),{random:false,simulation:true,duringDrain:true});
  add('attack',createAttackWriterHandler(dependencies));add('pvp_attack',createPvpWriterHandler({...dependencies,returns:{
   capture:(sql,payload,context,fresh)=>{
    if(!prepareServerStatement(sql,"SELECT 1 FROM guild_wars WHERE id=? AND status='active'").get(fresh.player.arena_match_id))return null;
    demand(payload.sharedLease&&this.sharedCombat,'guild_combat_requires_barrier');this.sharedCombat.assertWrite(sql,payload,context);return captureReturnOwners(sql);
   },reconcile:(sql,before,nowMs)=>reconcileReturnOwners(sql,before,nowMs,{authority:this.authority})
  }}));
  add('native_action',potionBatchHandlerR61(createActionWriterHandler(dependencies),{guardActor:(sql,payload,context)=>ports.guard(sql,payload,context,'native_action'),runContext:(payload,work)=>runPotionBatchContextR61(this.services,payload,work)}));add('movement',createMovementWriterHandler(dependencies));add('retaliation_death',createRetaliationWriterHandler(dependencies));
  add('heartbeat',createHeartbeatWriterHandler(dependencies));
  add('monster_reward',createMonsterRewardHandler(dependencies));
  add('dungeon',createDungeonWriterHandler({...dependencies,...this.services.dungeonOptions(),assertOwnership:simulated,onFinish:recordDungeonFinalization}),{simulation:true});
  add('dungeon_entry',createDungeonEntryWriterHandler({...dependencies,...this.services.dungeonOptions(),assertOwnership:simulated,authority:this.authority,assertShared:(sql,payload,context)=>{demand(payload.sharedLease&&this.sharedCombat,'dungeon_entry_requires_barrier');this.sharedCombat.assertWrite(sql,payload,context);},assertHeld:(id,payload,context)=>id===context.actor||this.sharedCombat.allows(id,context.peer,{playerId:context.actor,payload})}));
  add('mode_action',createModeWriterHandler({services:this.services,assertOwnership:own,assertResources:resources,gameplayRates:this.gameplayRates}),{random:false});
 }
 async initialize(){await this.authority.initialize();await this.system.initialize();await this.notifications.initialize();await this.database.atomic(sql=>{installBagLimit(sql);if(!castleEnabled())evacuateCastleOfflineR59(sql);installCastleCapacityR59(sql);installGuildCapacityR59(sql);ensureWorldCleanupIndexes(sql);ensureGuildWarReturns(sql);ensureDungeonFinalizations(sql);installDailyMonsterRewardsR76(sql,{now:this.clock});this.playerWrites.initialize(sql);this.monsterWrites.initialize(sql);this.sharedRefresh.initialize(sql);this.collectAudit.initialize(sql);this.settingsCache.initialize(sql);initializeRewardSqlR531(sql);initializeXpGroupR56(sql);});this.worldState=new DurableWorldState(this.database);await this.worldState.initialize();this.marketState=new DurableMarketState(this.database);await this.marketState.initialize();this.guildState=new DurableGuildState(this.database);await this.guildState.initialize();this.refreshOwners();}
 async durableExternal(){const market=readMarketRevision(this.database.sqlite),guild=readGuildRevision(this.database.sqlite);await this.worldState.syncExternal();this.marketState.publish(market);this.guildState.publish(guild);}
 refreshOwners(presence=null){
  const sql=this.database.sqlite,prepare=query=>r35Options.writerHygiene?prepareServerStatement(sql,query):sql.prepare(query);
  // The reward worker only consumes this mirror for its captured presence
  // stamps. Historical owners survive logout and must not be scanned on every
  // kill. Read those exact keys from SQL; do not trust an envelope's admission
  // or reuse the previous command's mirror. Main-process callers retain the
  // complete mirror used by ownership, transfers and shared recovery.
  const ids=presence===null?null:[...new Set(presence.map(row=>row.actor))];
  if(ids?.length===0){this.owners=new Map();return;}
  const query=`SELECT o.*,CASE WHEN a.player_id IS NULL THEN 0 ELSE 1 END AS admitted FROM kernel511_channel_owners o
   LEFT JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.channel=o.channel AND a.epoch=o.epoch`;
  const rows=ids===null?prepare(query).all():prepare(query+' WHERE o.player_id IN (SELECT value FROM json_each(?))').all(JSON.stringify(ids));
  this.owners=new Map(rows.map(row=>[row.player_id,{...row,admitted:row.admitted===1}]));
 }
 // R22: an ownership atomic rolls back when a shared terminal (party/boss kill)
 // fences it. Only for callers holding no freeze: wait for idle and retry.
 async owned(work,maxMs=3000){const until=Date.now()+maxMs;for(;;){const combat=this.sharedCombat;while(combat?.terminal&&Date.now()<until)await Promise.race([combat.terminalIdle(),new Promise(resolve=>setTimeout(resolve,250))]);try{return await work();}catch(error){if(!error?.sharedTerminal||Date.now()>=until)throw error;}}}
 async register(peer){const result=await this.authority.registerProcess(peer.channel,peer.incarnation);await this.system.register({...peer,realm:this.authority.realmId});this.refreshOwners();return result;}
 async admit(id,peer,options){const result=await this.authority.admit(id,peer,options);this.refreshOwners();return result;}
 async resume(id,peer,options){const result=await this.authority.resume(id,peer,options);this.refreshOwners();return result;}
 async beginTransfer(id,peer,options){const result=await this.authority.beginOwnedTransfer(id,peer,options);this.refreshOwners();return result;}
 async release(id,peer,options){const result=await this.authority.release(id,peer,options);this.refreshOwners();return result;}
 async cancelTransfer(id,peer,options){const result=await this.authority.cancelTransfer(id,peer,options);this.refreshOwners();return result;}
 async acceptTransfer(id,peer,options,transition){const result=await this.authority.acceptOwnedTransfer(id,peer,options,transition);this.presence.forget(id);this.refreshOwners();return result;}
 async retireSimulation(id,peer,options){const result=await this.authority.retireSimulation(id,peer,options);this.presence.forget(id);this.refreshOwners();return result;}
 async logout(id,peer,options){const result=await this.authority.logout(id,peer,options);if(result.loggedOut)this.presence.forget(id);this.refreshOwners();return result;}
 async command(peer,request){
  const collect=request.operation==='native_action'&&request.payload?.input?.action==='collect',started=performance.now();this.inflight++;try{
  let stamps=[];
  const dispatch=this.rewardWorkerR533?.candidate(request)?this.rewardWorkerR533.dispatch(peer,request):null;
  const result=await this.authority.command(peer,request,{...(dispatch?{dispatch}:{before:sql=>{stamps=this.presence.materialize(sql);}}),after:(sql,result)=>finalizeReturnSequence(sql,result.result?.moves??[],request,peer)});
  if(dispatch)stamps=dispatch.written;
  this.presence.acknowledged(stamps);if(result.result?.moves?.length||result.result?.passiveAdmissions?.length)this.refreshOwners();return result;
  }finally{this.inflight--;if(collect)collectTime('commandThroughFsync',performance.now()-started);}
 }
 async notificationPending(peer,{actor,epoch,cursor}){
  demand(!this.database.sqlite.isTransaction,'notification_read_during_write');
  const messages=withPreparedStatements477(this.database.sqlite,()=>{this.authority.assertAdmitted(this.database.sqlite,peer,actor,epoch);return r35Options.outboxV2&&cursor!==undefined?this.notifications.pendingPage(this.database.sqlite,actor,cursor,JSON.stringify([peer.channel,peer.incarnation,epoch])):this.notifications.pending(this.database.sqlite,actor);});
  // An older notification wake-up may see a newer COMMIT whose asynchronous
  // fsync is still pending. Its SQL snapshot must wait for that existing flush.
  await this.durableGroups?.afterRead();return messages;
 }
 notificationAck(peer,{actor,epoch,ids}){return this.notifications.acknowledge(actor,ids,sql=>Boolean(this.authority.assertAdmitted(sql,peer,actor,epoch)));}
 notificationAckBatch(peer,entries){return this.notifications.acknowledgeBatch(entries,(sql,row)=>{try{return Boolean(this.authority.assertAdmitted(sql,peer,row.actor,row.epoch));}catch(error){if(['owner_epoch_fenced','simulation_epoch_fenced'].includes(error.code))return false;throw error;}});}
}
