import {prepareCached477} from './writer-statements.mjs';

// Background recovery is optional work. It must not stop accepting gameplay
// while waiting for an already accepted action to drain. This is a scheduling
// predicate only: the existing freeze, checkpoint and writer fences still run.
export function rewardGroupIdleR52(control,requests){
 const {kernel,lanes,checkpoints,combatCheckpoints}=control;
 if(kernel.failure||kernel.stopped||kernel.running||kernel.flushing||combatCheckpoints.pending)return false;
 return requests.every(({id,epoch,token})=>{
  const actor=kernel.players.get(id),owner=kernel.state.owners.get(id);
  return actor&&actor.epoch===epoch&&owner?.epoch===epoch&&owner.state==='active'&&!owner.pending
   &&!actor.suspended&&!actor.quiescer&&!actor.barrier&&!actor.externalHold
   &&!actor.queue.length&&!actor.results.length&&!actor.deferred.length
   &&!control.entries.has(id)&&!control.completed.has(token)&&!control.unknownActor(id)&&!control.quarantined(id,epoch)
   &&!checkpoints.entries?.get(id)?.pending&&!lanes.busy(['player:'+id]);
 });
}

// One three-field cursor per reader, rather than an ever-growing skipped-actor
// set. Completed/deleted targets disappear naturally; wrap keeps older busy
// recipients eligible on later visits. The pending index already exists.
export function nextRewardTargetsR52(sql,{nowMs,grace,cursor=null,limit=6}){
 if(limit!==6&&limit!==16)throw Error('reward_recovery_target_limit');
 const base=`SELECT d.monster_id AS id,d.spawn_round AS spawnRound,d.defeated_at AS defeatedAt,m.channel AS channel
  FROM normal_defeats d JOIN monsters m ON m.id=d.monster_id
  WHERE d.rewards_completed_at=0 AND d.defeated_at<=? AND m.channel>0 AND m.is_boss=0 AND m.is_stone=0
  AND d.loot_source_key NOT IN ('adventure.catalog','event.catalog')
  AND EXISTS(SELECT 1 FROM monster_participants mp JOIN players p ON p.id=mp.player_id
    WHERE mp.monster_id=d.monster_id AND mp.spawn_round=d.spawn_round
    AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id))`;
 const end=' ORDER BY d.defeated_at,d.monster_id,d.spawn_round LIMIT '+limit,cutoff=Math.floor(nowMs/1000)-grace;
 let rows=cursor?prepareCached477(sql,base+' AND (d.defeated_at,d.monster_id,d.spawn_round)>(?,?,?)'+end).all(cutoff,cursor.defeatedAt,cursor.id,cursor.spawnRound):[];
 if(!rows.length)rows=prepareCached477(sql,base+end).all(cutoff);
 // Do not accidentally make a local batch span independent monster channels.
 // Stop at the first boundary, retaining the next row for the next visit.
 const boundary=rows.findIndex(row=>row.channel!==rows[0].channel);if(boundary>=0)rows=rows.slice(0,boundary);
 const last=rows.at(-1);
 return {targets:rows.map(({id,spawnRound})=>({id,spawnRound})),cursor:last?{defeatedAt:last.defeatedAt,id:last.id,spawnRound:last.spawnRound}:null};
}
