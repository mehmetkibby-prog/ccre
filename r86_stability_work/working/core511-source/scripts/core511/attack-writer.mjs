import {capturePortalCreationR57} from './portal-refresh-r57.mjs';
import {executeDeathBatchR57} from './death-batch-writer-r57.mjs';
import {localRewardBudgetR57} from './local-reward-budget-r57.mjs';
import {rewardSliceR56,smallGroupEagerR56,smallRewardCompleteR56} from './r56-options.mjs';
import {completedClaimTargetsR56} from './completed-claims-r56.mjs';
import {nonlethalRewardPortR56} from './nonlethal-rewards-r56.mjs';
import {prepareRewardCodeR54} from './reward-code-r54.mjs';
import {memoryCombatR53,eagerNormalRewardsR53} from './r53-options.mjs';
import {withRewardSqlR531} from './reward-sql-r531.mjs';
import {attackRowBatchR51} from './r51-options.mjs';
import {nativeRewardWorksetR52} from './r52-options.mjs';
import {rewardWorksetDatabaseR52} from './reward-workset-r52.mjs';
import {attackMonsterRowsR51,attackParticipantRowsR51} from './attack-row-batch-r51.mjs';
import {mountRewardResult} from './mounts-rewards.mjs';
import {compactCombatResult} from './bounded-combat-output.mjs';
import {actorFrameConflict} from './actor-frame-rejection.mjs';
import {isMistArea} from './adventure-maps.mjs';
import {instanceRewardAreaR71} from './instance-reward-scope-r71.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {OperationRandom} from './operation-random.mjs';
import {demand} from './contract.mjs';
import {createHmac} from 'node:crypto';
import {stablePresenceFrame} from './presence.mjs';
const batchSnapshotR61=process.env.CORE511_R61_BATCH_SNAPSHOT==='1';

// Normalize once, then encode once. The old recursive JSON.parse/stringify
// round trips allocated a string and parsed tree at EVERY frame field.
function orderedAttack(value,nested=false){
 if(value&&typeof value==='object')return Array.isArray(value)?value.map(v=>orderedAttack(v,true)):Object.fromEntries(Object.keys(value).sort().map(k=>[k,orderedAttack(value[k],true)]));
 if(nested&&['function','symbol'].includes(typeof value))return JSON.parse(JSON.stringify(value)); // retain rejection
 return value??null;
}
export const canonicalAttack=value=>JSON.stringify(orderedAttack(value));
// Combat/settings rows are flat scalars. Compare their canonical meaning
// without constructing/sorting/copying two JSON trees. Complex values retain
// the exact canonical fallback and all unexpected columns still reject.
export function sameAttackFrame(a,b){
 if(a&&b&&typeof a==='object'&&typeof b==='object'&&!Array.isArray(a)&&!Array.isArray(b)){
  const keys=Object.keys(a),other=Object.keys(b);if(keys.length!==other.length)return false;
  const scalar=v=>v===null||['undefined','string','number','boolean'].includes(typeof v);
  const normalized=v=>v==null||typeof v==='number'&&!Number.isFinite(v)?null:v;
  for(const k of keys){if(!Object.hasOwn(b,k))return false;if(!scalar(a[k])||!scalar(b[k]))return canonicalAttack(a)===canonicalAttack(b);if(normalized(a[k])!==normalized(b[k]))return false;}
  return true;
 }return canonicalAttack(a)===canonicalAttack(b);
}

export function attackRandom(seed){
 const derive=label=>createHmac('sha256',Buffer.from(seed,'hex')).update('core511-attack:'+label).digest('hex');
 const dice=new OperationRandom(derive('dice')),ids=new OperationRandom(derive('ids'));
 return {random:()=>dice.roll(),uuid:()=>ids.uuid()};
}
export function readAttackFrame(sqlite,actor,target,globals){
 const rules=createAttackWriterRules({globals}),frame=rules.hydrateAttack(nativeAtomicStatements(sqlite),actor,target);
 if(frame.player)frame.player.pet_kind=prepareCached477(sqlite,"SELECT kind FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped=1 LIMIT 1").get(actor)?.kind??null;
 return frame;
}
export function createAttackWriterHandler({settingsFor,globalsFor,assertOwnership,assertResources,settleRetaliation,mixedPorts,joinCheckpointR53,runBatchContextR57,guardBatchActorR57,affectedActors=()=>[],randomFor=p=>attackRandom(p.seed),clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,assertOwnership,assertResources,settleRetaliation])demand(typeof fn==='function','attack_writer_dependencies');
 const handle=(sqlite,payload,context,batchReadR61=null)=>{
  demand(sqlite.isTransaction,'attack_requires_atomic');
  demand(assertOwnership(sqlite,context.peer,context.actor,context.epoch)===true,'attack_owner_fenced');
  demand(assertResources(sqlite,payload,context)===true,'attack_resources_fenced');
  const joined=payload.checkpointR53?joinCheckpointR53?.(sqlite,payload,context):null;
  demand(!payload.checkpointR53||joined,'checkpoint_join_unbound');
  if(joined?.rejected){const r=joined.rejected;return {result:{status:409,body:{code:r.code,not_executed:true,error:'Oyuncu durumu yenilendi. İşlem uygulanmadı; tekrar deneyebilirsin.'}},r53Rejected:r.actor,players:[r.player],encounters:[[r.actor,r.engagement]],engagement:r.actor===context.actor?r.engagement:null,monsters:[],participants:[],bossParticipants:[],events:[],community:[]};}
  const {nowMs,receivedAtMs,seed,input,expected}=payload;
  demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000&&Number.isSafeInteger(receivedAtMs)&&receivedAtMs<=nowMs&&receivedAtMs>=0,'attack_invalid_time');
  demand(input?.action==='attack'&&typeof input.targetId==='string','attack_invalid_action');
  const globals=globalsFor(sqlite,context.actor),settings=settingsFor(sqlite,context.actor),frame=readAttackFrame(sqlite,context.actor,input.targetId,globals);
  // Only the private batch callback supplies fresh=true for a secondary.
  // Its expected image was this exact SQL frame, read after earlier native
  // calls and all fences. Comparing it to itself adds copies but no guard.
  // The primary retains every external expected-frame/settings comparison.
  if(!frame.player)throw actorFrameConflict('attack_frame_conflict',context,sqlite);
  if(batchReadR61?.fresh!==true){
   if(!(sameAttackFrame(stablePresenceFrame(frame.player),stablePresenceFrame(expected?.player))&&sameAttackFrame(frame.monster,expected?.monster)))throw actorFrameConflict('attack_frame_conflict',context,sqlite);
   if(!sameAttackFrame(settings,expected.settings))throw actorFrameConflict('attack_settings_conflict',context,sqlite);
  }
  const nativeDb=nativeAtomicStatements(sqlite),db=nativeRewardWorksetR52?rewardWorksetDatabaseR52(nativeDb):nativeDb,events=[],community=[],rng=randomFor(payload);
  const sync=value=>{demand(!value?.then,'async_attack_writer_port');return value;};
  const record=(...args)=>{events.push(args);};
  const nonlethalR56=nonlethalRewardPortR56(sqlite,rng);
  const rules=createAttackWriterRules({...rng,uuid:nonlethalR56.uuid,random:nonlethalR56.random,globals,now:()=>nowMs,fourChannels:true,response:{json:(body,{status=200}={})=>({body,status})},ports:{
   prepareMonsterXpR54:args=>prepareRewardCodeR54(sqlite,args),
   skipNonlethalRewardsR56:nonlethalR56.skip,
   hitGroupSizeR56:nonlethalR56.hitGroupSize,batchHitsR56:nonlethalR56.batchHits,
   beforeMixed:c=>assertMixedResources(payload,c),releasePvpCommit:()=>{},
   ...mixedPorts?.(sqlite,context),settlePveEngagement:(_,id,s,time)=>sync(settleRetaliation(sqlite,id,s,time,{...context,globals,random:rng.random,publish:record})),
   publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:sync,
   startBackgroundTask:fn=>sync(fn()),scheduleRequestTask:()=>false,
   publishCommunityProgress:()=>{community.push({cycle:frame.player.world_cycle});},
   // LocalDatabase's sole synchronous atomic lane serializes reward delivery;
   // original UNIQUE claim rows and guarded writes stay in this transaction.
   runRewardDelivery:(_,key,fn)=>{demand(sqlite.isTransaction&&typeof key==='string','reward_lane_required');return mountRewardResult(globals,key,sync(fn()));}
  }});
  const ctx={player:frame.player,playerId:context.actor,payload:input,settings,attackTargetId:input.targetId,preloadedAttackMonster:frame.monster,requestReceivedAtMs:receivedAtMs,now:Math.floor(nowMs/1000),auth:{account:{id:prepareCached477(sqlite,'SELECT account_id FROM players WHERE id=?').get(context.actor).account_id}}};
  if(isMistArea(frame.player.area))globals.__colAdventure.loot.cancel(context.actor);
  const mistSnapshot=isMistArea(frame.player.area)?globals.__colAdventure.loot.capture(context.actor):null;
  const result=compactCombatResult(sync(rules.nativeAttack(db,ctx)));
  if(mistSnapshot)globals.__colAdventure.loot.settleDeaths(mistSnapshot,result.body,events);
  // R22: finalize this kill's own pending gear enchantments in the same
  // transaction (the native loot path does the same on pickup). Otherwise the
  // next heartbeat runs a server-wide world transition just to roll them.
  const killedIds=(result.body?.hits??[]).filter(hit=>hit.killed).map(hit=>hit.id);
  // Small ordinary fights should not create a string of party-wide claim
  // barriers merely to save a few milliseconds in the death command. Retain
  // the four-target bound for the >64-kill stress case.
  // Restore complete native delivery for <=32 deaths. Deferring the last few
  // rewards creates another whole-party barrier; large fights retain slices.
  let completedR53=0,rewardBudgetR56=rewardSliceR56?(smallRewardCompleteR56&&killedIds.length<=32?32:smallGroupEagerR56&&killedIds.length<=64?16:4):Infinity;
  rewardBudgetR56=localRewardBudgetR57(payload,frame.player.area,killedIds,rewardBudgetR56);
  if(eagerNormalRewardsR53)for(const hit of result.body?.hits??[])if(hit.killed){
   const m=prepareCached477(sqlite,'SELECT area,channel,is_boss,is_stone FROM monsters WHERE id=?').get(hit.id);
   if(m&&m.channel>0&&!m.is_boss&&!m.is_stone&&(['forest','frozen','black','ancient','sanctum'].includes(m.area)||payload.localScope?.kind==='kill'&&instanceRewardAreaR71(m.area))){
    if(rewardBudgetR56--<=0)continue;
    const awarded=sync(rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:hit.id,spawn_round:hit.spawnRound}));
    // Native eligibility deliberately returns null for an unknown loot source
    // or no surviving participant. Such a target retains its native path; it
    // is not a corrupt transaction and must not make a channel fail.
    if(!awarded)continue;
    const defeat=prepareCached477(sqlite,'SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=? AND spawn_round=?').get(hit.id,hit.spawnRound);
    demand(defeat?.rewards_completed_at>0,'normal_reward_commit_incomplete');completedR53++;
   }
  }

  if(killedIds.length&&process.env.CORE511_DROP_FINALIZE!=='0')sync(rules.tryFinalizePendingDropEnchantments(db,settings,{ownerId:context.actor,monsterIds:killedIds}));
  const portalCreationR57=capturePortalCreationR57(sqlite,()=>{const created=[];for(const hit of result.body.hits??[])if(hit.killed){const m=prepareCached477(sqlite,'SELECT * FROM monsters WHERE id=?').get(hit.id);if(m){const portal=globals.__colAdventure.maybePortal(m,frame.player);if(portal)created.push(portal);}}return created;});
  const hits=result.body.hits??[],targets=batchReadR61?.omit?[]:attackRowBatchR51?attackMonsterRowsR51(sqlite,hits.map(hit=>hit.id)):hits.map(hit=>prepareCached477(sqlite,'SELECT * FROM monsters WHERE id=?').get(hit.id));
  const recipients=new Set([context.actor,...(result.body.progression??[]).map(row=>row.id),...(result.body.pvpHits??[]).map(row=>row.targetId)]);
  const completedClaimsR56=completedClaimTargetsR56(sqlite,hits.filter(h=>h.killed).map(h=>({id:h.id,spawnRound:h.spawnRound})));
  // Intermediate rows are never published. The last native call retains the
  // cumulative player-write snapshot; the batch reads its final monster union.
  if(batchReadR61?.omit)return {result,events,...(portalCreationR57?{portalCreationR57}:{}),...(completedClaimsR56.length?{completedClaimsR56}:{}),...(joined?{checkpointR53:joined.saved}:{}),...(completedR53?{rewardsCompletedR53:completedR53}:{}),...(mistSnapshot?{mistLoot:globals.__colAdventure.loot.snapshot(mistSnapshot.run.id)}:{}),community,players:[],monsters:[],participants:[],bossParticipants:[],engagement:null};
  if(memoryCombatR53)for(const id of affectedActors())recipients.add(id);
  return {result,events,...(portalCreationR57?{portalCreationR57}:{}),...(completedClaimsR56.length?{completedClaimsR56}:{}),...(joined?{checkpointR53:joined.saved}:{}),...(completedR53?{rewardsCompletedR53:completedR53}:{}),...(mistSnapshot?{mistLoot:globals.__colAdventure.loot.snapshot(mistSnapshot.run.id)}:{}),community,players:[...recipients].sort().map(id=>prepareCached477(sqlite,'SELECT * FROM players WHERE id=?').get(id)),monsters:targets,participants:attackRowBatchR51?attackParticipantRowsR51(sqlite,targets):targets.flatMap(m=>prepareCached477(sqlite,'SELECT monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476 FROM monster_participants WHERE monster_id=? AND spawn_round=?').all(m.id,m.spawn_round)),bossParticipants:targets.filter(m=>m.is_boss).flatMap(m=>prepareCached477(sqlite,'SELECT boss_round,player_id,hit_count,total_damage,created_at FROM boss_participants WHERE boss_round=?').all(m.spawn_round)),engagement:prepareCached477(sqlite,'SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null};
 };
 return (sqlite,payload,context)=>withRewardSqlR531(sqlite,payload,context.actor,()=>payload.batchAttacksR57===undefined?handle(sqlite,payload,context):executeDeathBatchR57(sqlite,payload,context,{execute:handle,executeSnapshotR61:batchSnapshotR61?(sql,p,c,{secondary,last})=>handle(sql,p,c,{fresh:secondary,omit:!last}):null,readFrame:(sql,id,target)=>readAttackFrame(sql,id,target,globalsFor(sql,id)),settingsFor,assertOwnership,guardActor:guardBatchActorR57,runContext:runBatchContextR57}));
}

export function assertMixedResources(payload,cast){const held=new Set(payload.resources??[]);for(const id of [cast.player.id,...cast.playerPlans473.map(p=>p.target.id)])demand(held.has('player:'+id),'mixed_unlocked_player');for(const m of cast.targets)demand(held.has('monster:'+m.id),'mixed_unlocked_monster');return true;}

// Existing pending-defeat claim handlers recover interrupted delivery. Every
// reward call is inside an ordered, receipt-backed writer transaction as above.
export function createMonsterRewardHandler({settingsFor,globalsFor,assertResources,randomFor=p=>attackRandom(p.seed),clock=Date.now}){
 for(const fn of [settingsFor,globalsFor,assertResources])demand(typeof fn==='function','reward_writer_dependencies');
 return (sqlite,payload,context)=>{
  demand(sqlite.isTransaction&&assertResources(sqlite,payload,context)===true,'reward_resources_fenced');
  demand(['normal','boss','sinsi'].includes(payload.kind),'reward_kind');
  const {nowMs,seed,monsterId,spawnRound}=payload;demand(Number.isSafeInteger(nowMs)&&nowMs>=0&&nowMs<=clock()+5000&&Number.isSafeInteger(spawnRound)&&spawnRound>=0&&typeof monsterId==='string','reward_input');
  const globals=globalsFor(sqlite,context.actor),settings=settingsFor(sqlite,context.actor),nativeDb=nativeAtomicStatements(sqlite),db=nativeRewardWorksetR52?rewardWorksetDatabaseR52(nativeDb):nativeDb;
  const events=[],record=(...args)=>{events.push(args);};
  const rules=createAttackWriterRules({...randomFor(payload),globals,now:()=>nowMs,fourChannels:true,ports:{publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:value=>value,runRewardDelivery:(_,key,fn)=>{const value=fn();demand(!value?.then,'async_reward_writer_port');return mountRewardResult(globals,key,value);}}});
  const result=payload.kind==='boss'?rules.awardPendingBossRewards(db,settings,Math.floor(nowMs/1000),spawnRound):payload.kind==='sinsi'?rules.awardPendingSinsiStoneRewards(db,settings,Math.floor(nowMs/1000),{id:monsterId,spawn_round:spawnRound}):rules.awardPendingNormalRewards(db,settings,Math.floor(nowMs/1000),{id:monsterId,spawn_round:spawnRound});
  demand(!result?.then,'async_reward_writer_result');return {result:result??null,events};
 };
}
