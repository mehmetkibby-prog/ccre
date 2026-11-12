import {rewardRecoveryR62,RECOVERY_TARGETS_R62,RECOVERY_PRIORITY_AGE_S_R62} from './reward-recovery-r62.mjs';
import {mountRewardResult} from './mounts-rewards.mjs';
import {randomUUID} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {OperationRandom} from './operation-random.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {demand} from './contract.mjs';
import {r37Options} from './r37-options.mjs';
import {rewardRecoverySchedulerR52,nativeRewardWorksetR52} from './r52-options.mjs';
import {rewardWorksetDatabaseR52} from './reward-workset-r52.mjs';
export function abandonedActors(sql,target,nowMs=Date.now()){
 // Unpaid loot owners plus the native XP-sharing eligibility predicate. A
 // paid participant, distant/dead ally, or previously granted XP source cannot
 // make an unrelated fenced actor part of this job. The writer checks again
 // after draining, and its existing SQL write audit remains authoritative.
 // The same eligibility query runs before the freeze and again inside the
 // writer. Keep both reads fresh, but reuse its compiled statement even when
 // the preflight has no writer scope. This scope is strictly synchronous and
 // performs the native schema check; it never spans a freeze or an await.
 return withPreparedStatements477(sql,()=>{
 // Keep the unpaid participants for this exact monster life as the source
 // relation. Flattening this CTE can instead join broadly across all players
 // before applying the participant filter. Only these ten fields are needed.
 // CROSS JOIN pins source -> its party -> ally lookup order. The unchanged
 // ON predicates and UNION retain eligibility while avoiding a full ally scan.
 const rows=prepareCached477(sql,`WITH life(monster,round,recent) AS (SELECT ?,?,?), sources AS MATERIALIZED (
  SELECT p.id,p.hp,p.last_seen,p.movement_checked_at_ms,p.last_monster_hit_at,p.area,p.channel,p.arena_match_id,p.x,p.y
  FROM monster_participants mp JOIN players p ON p.id=mp.player_id JOIN life
  WHERE mp.monster_id=life.monster AND mp.spawn_round=life.round
  AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id)
 ), xp_sources AS (
  SELECT source.* FROM sources source JOIN life
  WHERE NOT EXISTS(SELECT 1 FROM monster_xp_claims r WHERE r.monster_id=life.monster AND r.spawn_round=life.round AND r.player_id=source.id)
  AND NOT EXISTS(SELECT 1 FROM sinsi_reward_claims r WHERE r.monster_id=life.monster AND r.spawn_round=life.round AND r.player_id=source.id)
  AND NOT EXISTS(SELECT 1 FROM boss_reward_claims r WHERE r.boss_round=life.round AND r.player_id=source.id
    AND (life.monster='dunya-bosu-1' OR EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 lab WHERE lab.monster_id=life.monster AND lab.boss_round=life.round)))
 ) SELECT id FROM sources UNION SELECT ally.id FROM xp_sources source
 CROSS JOIN party_members mine ON mine.player_id=source.id
 CROSS JOIN party_members team ON team.party_id=mine.party_id AND team.player_id<>source.id
 CROSS JOIN players ally ON ally.id=team.player_id JOIN life
 WHERE source.hp>0 AND MAX(source.last_seen,CAST(source.movement_checked_at_ms/1000 AS INTEGER),CAST(source.last_monster_hit_at/1000 AS INTEGER))>=life.recent
 AND ally.hp>0 AND MAX(ally.last_seen,CAST(ally.movement_checked_at_ms/1000 AS INTEGER),CAST(ally.last_monster_hit_at/1000 AS INTEGER))>=life.recent
 AND ally.area=source.area AND ally.channel=source.channel AND ally.arena_match_id=source.arena_match_id
 AND (ally.x-source.x)*(ally.x-source.x)+(ally.y-source.y)*(ally.y-source.y)<=5760000 ORDER BY id`).all(target.id,target.spawnRound,Math.floor(nowMs/1000)-30);
 return rows.map(r=>r.id);
 });
}
function ordinaryDue(sql,target,nowMs){
 const row=prepareCached477(sql,`SELECT m.channel,m.is_boss,m.is_stone,d.defeated_at,d.loot_source_key FROM normal_defeats d
 JOIN monsters m ON m.id=d.monster_id WHERE d.monster_id=? AND d.spawn_round=?`).get(target.id,target.spawnRound);
 return row&&row.channel>0&&!row.is_boss&&!row.is_stone&&!['adventure.catalog','event.catalog'].includes(row.loot_source_key)
  &&row.defeated_at<=Math.floor(nowMs/1000)-Number(process.env.CORE511_REWARD_GRACE_S??20);
}
export class AbandonedNormal {
 constructor(world){this.world=world;this.core=world.core;this.held=null;this.trace=[];this.core.writer.abandonedNormal=this;}
 async run(peer,entry){
  const c=this.core,target=entry.normalTarget;if(!r37Options.abandonedLocal||!target)return false;
  const targets=entry.normalTargets??[target],started=performance.now();let actors=[],previous=new Map(),executing=false;
  try{return await c.serial(async()=>{
   if(this.world.row?.peer.incarnation!==peer.incarnation||this.held||c.recoveringWorld)return {handled:true,deferred:true};
   demand(Array.isArray(targets)&&targets.length>0&&targets.length<=(rewardRecoveryR62?RECOVERY_TARGETS_R62:6),'abandoned_target_count');
   // Reuse compiled reads across this batch; the scope ends before any await.
   const nowMs=c.clock(),preflight=withPreparedStatements477(c.database.sqlite,()=>{
    if(!targets.every(t=>ordinaryDue(c.database.sqlite,t,nowMs)))return null;
    return [...new Set(targets.flatMap(t=>abandonedActors(c.database.sqlite,t,nowMs)))].sort();
   });if(!preflight)return false;actors=preflight;
   if(!actors.length)return {handled:true,deferred:true};if(actors.length>100)return false;
   // Ownership/entry controls use the same serial lane. A retained control
   // fence must defer this job before any resident freeze is started.
   if(actors.some(id=>c.transitions.has(id)||c.entryReads.has(id)))return {handled:true,deferred:true};
   previous=new Map(actors.map(id=>[id,c.permanent.entries.get(id)]));
   // Expected rejection must happen before any freeze RPC or world writer
   // sequence is reserved. The permanent coordinator still rechecks atomically.
   c.permanent.assertAvailable(actors);
   // An aged durable reward must not starve behind perpetual AI/checkpoints.
   // The oldest target triggers promotion even alongside younger eligible
   // targets, so a stream of new deaths cannot keep an old debt idle forever.
   // Promote to the existing draining freeze, never bypass owner/epoch fences.
   const priority=rewardRecoveryR62&&entry.recoveryR62===true&&withPreparedStatements477(c.database.sqlite,()=>targets.some(t=>{
    const d=prepareCached477(c.database.sqlite,'SELECT defeated_at FROM normal_defeats WHERE monster_id=? AND spawn_round=?').get(t.id,t.spawnRound);
    return d&&d.defeated_at<=Math.floor(nowMs/1000)-RECOVERY_PRIORITY_AGE_S_R62;
   }));
   const result=await c.permanent[rewardRecoverySchedulerR52&&!priority?'durablePlayersWhenIdle':'durablePlayers'](actors,async locked=>{
    executing=true;
    const payload={target,targets,actors,cycle:entry.cycle,nowMs:c.clock(),seed:OperationRandom.seed(),token:randomUUID()},key='abandoned-normal:'+payload.token;
    this.held={peer,payload,key,locked};
    try{const ack=await this.world.row.control.request('player_job_execute',{key,kind:'abandoned_normal',payload});demand(ack.key===key&&ack.result,'abandoned_ack');return ack.result;}finally{this.held=null;}
   });
   this.record({targets:targets.length,actors:actors.length,holdAndRefreshMs:performance.now()-started,awarded:Boolean(result.result?.awarded),deferred:Boolean(result.deferred),...(rewardRecoverySchedulerR52?{idleScheduled:!priority,priority,code:result.code??null}:{}),global:false});return rewardRecoverySchedulerR52&&result.deferred?{handled:true,...result}:true;
  });}catch(error){
   // PermanentCoordinator owns unknown freeze/commit/refresh recovery. Do not
   // additionally reject heartbeat_due and kill the otherwise healthy world.
   // Never clear its fences, thaw actors, acknowledge a write or replay here.
   const recovery=executing||actors.some(id=>{const e=c.permanent.entries.get(id);return e&&e!==previous.get(id);});
   this.record({targets:targets.length,actors:actors.length,deferred:true,recovery,code:error?.code??error?.message??'abandoned_deferred',global:false});
   return {handled:true,deferred:true,recovery};
  }
 }
 record(row){this.trace.push(row);if(this.trace.length>128)this.trace.shift();}
 assertHeld(sql,payload,context){
  const h=this.held;demand(h&&h.peer.incarnation===context.peer.incarnation&&h.key===context.key&&JSON.stringify(h.payload)===JSON.stringify(payload)&&prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle===payload.cycle,'abandoned_writer_fenced');
  for(const held of h.locked){const e=this.core.permanent.entries.get(held.id);demand(e===held&&e.phase==='frozen','abandoned_actor_not_frozen');if(e.owner){const owner=this.core.authority.owner(e.id,sql);demand(owner?.state==='active'&&owner.epoch===e.owner.epoch&&owner.incarnation===e.owner.incarnation&&owner.sequence===e.finalSequence,'abandoned_sequence_fenced');}}
  return true;
 }
}
export function runAbandonedNormal(writer,sql,payload,context){
 demand(r37Options.abandonedLocal&&context.peer.channel===0&&context.peer.role==='world'&&writer.abandonedNormal?.assertHeld(sql,payload,context),'abandoned_owner');
 const {target,actors,nowMs}=payload,targets=payload.targets??[target];
 demand(Array.isArray(targets)&&targets.length>0&&targets.length<=(rewardRecoveryR62?RECOVERY_TARGETS_R62:6),'abandoned_target_count');
 // Only ordinary native normal rewards use this path. Special catalogs retain
 // their existing world owner. A changed roster is retried without any write.
 if(!targets.every(t=>ordinaryDue(sql,t,nowMs))||JSON.stringify([...new Set(targets.flatMap(t=>abandonedActors(sql,t,nowMs)))].sort())!==JSON.stringify(actors))return {deferred:true};
 const scoped={...payload,sharedLease:payload.token,resources:actors.map(id=>'player:'+id)},ctx={...context,actor:actors[0]},shared={assertWrite:()=>writer.abandonedNormal.assertHeld(sql,payload,context),allows:id=>actors.includes(id)};
 return writer.services.run(payload,()=>writer.playerWrites.run(sql,scoped,ctx,'abandoned_normal',()=>writer.monsterWrites.run(sql,scoped,ctx,()=>{
  const events=[],record=(...args)=>events.push(args),sync=value=>{demand(!value?.then,'abandoned_async');return value;};
  const rules=createAttackWriterRules({...writer.services.active,globals:writer.services.globals,now:()=>nowMs,fourChannels:true,ports:{publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:sync,runRewardDelivery:(_,key,fn)=>mountRewardResult(writer.services.globals,key,sync(fn()))}});
  const rewardDb=nativeRewardWorksetR52?rewardWorksetDatabaseR52(nativeAtomicStatements(sql)):null;
  const results=targets.map(t=>sync(rules.awardPendingNormalRewards(rewardDb??nativeAtomicStatements(sql),writer.settingsCache.read(sql),Math.floor(nowMs/1000),{id:t.id,spawn_round:t.spawnRound})));
  const result={awarded:results.some(r=>r?.awarded),processed:results.filter(r=>r?.awarded).length,results};
  return writer.notifications.append(sql,ctx,{result,events},{immediatePublisher:false});
 },{shared,readOnly:true}),{shared,afterWriteGuard:(_,ids)=>{demand(ids.every(id=>actors.includes(id)),'abandoned_unlocked_recipient');return writer.abandonedNormal.assertHeld(sql,payload,context);}}));
}
