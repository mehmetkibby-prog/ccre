import {rewardRecoveryR62,RECOVERY_TARGETS_R62} from './reward-recovery-r62.mjs';
import {r37Options} from './r37-options.mjs';
import {createAttackWriterRules} from './generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from './retaliation-writer.mjs';
import {demand} from './contract.mjs';
import {rewardRecoverySchedulerR52} from './r52-options.mjs';
import {nextRewardTargetsR52} from './reward-recovery-r52.mjs';

// Query-only worker discovery. Each original reward/queue selection prefix is
// mechanically copied before its first write/random draw. One shared reward
// scan serves a batch of recent authenticated heartbeats.
export class HeartbeatMaintenanceReader {
 constructor(sql){this.sql=sql;this.rules=createAttackWriterRules({globals:{}});}
 // Normal-local recovery must not consume the special catalog/global path.
 nonlocalNormalR62(db,settings){
  const target=this.sql.prepare(`SELECT d.monster_id AS id,d.spawn_round AS spawnRound
   FROM normal_defeats d LEFT JOIN monsters m ON m.id=d.monster_id
   WHERE d.rewards_completed_at=0
   AND (m.id IS NULL OR m.channel<=0 OR m.is_boss<>0 OR m.is_stone<>0 OR d.loot_source_key IN ('adventure.catalog','event.catalog'))
   AND EXISTS(SELECT 1 FROM monster_participants mp JOIN players p ON p.id=mp.player_id
    WHERE mp.monster_id=d.monster_id AND mp.spawn_round=d.spawn_round
    AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id))
   ORDER BY d.defeated_at,d.monster_id LIMIT 1`).get();
  // The native selector uses the persisted spawn_round field. Passing the
  // transport's spawnRound spelling binds undefined and crashes world jobs
  // whenever an adventure reward is observed before its deferred claim.
  return target?this.rules.readPendingNormal511(db,settings,undefined,{id:target.id,spawn_round:target.spawnRound}):null;
 }
 recoveryDueR62({cycle,nowMs}){
  demand(rewardRecoveryR62&&Number.isSafeInteger(cycle)&&Number.isSafeInteger(nowMs),'reward_recovery_scan');
  const sql=this.sql;sql.exec('BEGIN');try{
   if(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle!==cycle)return null;
   if(this.recoveryCycleR62!==cycle){this.recoveryCycleR62=cycle;this.recoveryCursorR62=null;}
   const next=nextRewardTargetsR52(sql,{nowMs,grace:Number(process.env.CORE511_REWARD_GRACE_S??20),cursor:this.recoveryCursorR62,limit:RECOVERY_TARGETS_R62});
   this.recoveryCursorR62=next.cursor;
   return next.targets.length?{cycle,nowMs,recoveryR62:true,normalTarget:next.targets[0],normalTargets:next.targets}:null;
  }finally{sql.exec('ROLLBACK');}
 }
 due(entries,{cycle,nowMs,skipAbandoned=false,skipOrdinaryR62=false,skipRewardsR79=false}){
  demand(Array.isArray(entries)&&entries.length<=100&&Number.isSafeInteger(cycle)&&Number.isSafeInteger(nowMs),'heartbeat_maintenance_scan');
  const sql=this.sql,db=nativeAtomicStatements(sql),rules=this.rules;sql.exec('BEGIN');
  try{
   if(sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle!==cycle)return null;
   const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},valid=[];
   for(const row of entries){demand(row&&typeof row.actor==='string'&&Number.isSafeInteger(row.epoch)&&row.cycle===cycle&&Number.isSafeInteger(row.nowMs)&&row.nowMs>=0&&row.nowMs<=nowMs+5000,'heartbeat_maintenance_entry');const owner=sql.prepare("SELECT o.player_id FROM kernel511_channel_owners o JOIN kernel511_admissions a ON a.player_id=o.player_id AND a.epoch=o.epoch AND a.channel=o.channel WHERE o.player_id=? AND o.epoch=? AND o.state='active'").get(row.actor,row.epoch);if(owner&&!rules.colLabIsPlayer(row.actor))valid.push(row);}
   if(!valid.length)return null;
   // A fresh normal defeat is normally claimed by its own client (claim_rewards)
   // within a second. Only abandoned rewards justify a global world freeze.
   const normal=skipRewardsR79||skipAbandoned?null:rewardRecoveryR62&&skipOrdinaryR62?this.nonlocalNormalR62(db,settings):rules.readPendingNormal511(db,settings),grace=Number(process.env.CORE511_REWARD_GRACE_S??20);
   const normalDue=Boolean(normal)&&!(grace>0&&(sql.prepare('SELECT defeated_at FROM normal_defeats WHERE monster_id=? AND spawn_round=?').get(normal.monster_id,normal.spawn_round)?.defeated_at??0)>Math.floor(nowMs/1000)-grace);
   for(const [reason,due]of (skipRewardsR79?[]:[['pending_boss',()=>rules.readPendingBoss511(db,settings)],['pending_sinsi',()=>rules.readPendingSinsi511(db,settings)],['abandoned_normal',()=>normalDue],['pending_drop',()=>rules.readPendingDrops511(db,settings).length]]))if(due()){
    const m=reason==='abandoned_normal'&&r37Options.abandonedLocal?sql.prepare('SELECT channel,is_boss,is_stone FROM monsters WHERE id=?').get(normal.monster_id):null;
    const ordinary=m&&m.channel>0&&!m.is_boss&&!m.is_stone&&!['adventure.catalog','event.catalog'].includes(normal.loot_source_key);
    let targets=ordinary&&!rewardRecoverySchedulerR52?sql.prepare(`SELECT d.monster_id AS id,d.spawn_round AS spawnRound FROM normal_defeats d JOIN monsters m ON m.id=d.monster_id
     WHERE d.rewards_completed_at=0 AND d.defeated_at<=? AND m.channel>0 AND m.is_boss=0 AND m.is_stone=0
     AND d.loot_source_key NOT IN ('adventure.catalog','event.catalog')
     AND EXISTS(SELECT 1 FROM monster_participants mp JOIN players p ON p.id=mp.player_id WHERE mp.monster_id=d.monster_id AND mp.spawn_round=d.spawn_round
       AND NOT EXISTS(SELECT 1 FROM normal_reward_claims r WHERE r.monster_id=mp.monster_id AND r.spawn_round=mp.spawn_round AND r.player_id=mp.player_id))
     ORDER BY d.defeated_at,d.monster_id LIMIT 6`).all(Math.floor(nowMs/1000)-grace):[];
    if(ordinary&&rewardRecoverySchedulerR52){
     if(this.normalCycle!==cycle){this.normalCycle=cycle;this.normalCursor=null;}
     const next=nextRewardTargetsR52(sql,{nowMs,grace,cursor:this.normalCursor});targets=next.targets;this.normalCursor=next.cursor;
    }
    return {...valid[0],maintenanceReason:reason,...(ordinary?{normalTarget:rewardRecoverySchedulerR52&&targets.length?targets[0]:{id:normal.monster_id,spawnRound:normal.spawn_round},normalTargets:targets.length?targets:[{id:normal.monster_id,spawnRound:normal.spawn_round}]}:{})};
   }
   for(const entry of valid){
    const {heartbeat,actor,nowMs:at}=entry;
    if(heartbeat?.arena_match_id){
     // Capture the UNCHANGED native UPDATE without executing it, then ask its
     // exact WHERE predicate. Only SET's three parameters are omitted.
     const plan=rules.tryFinishArenaForfeit({prepare:sql=>({bind:(...params)=>({first:()=>({sql,params})})})},heartbeat.arena_match_id,at),index=plan.sql.indexOf('\n     WHERE id = ?'),end=plan.sql.lastIndexOf('\n     RETURNING *');demand(index>=0&&end>index,'heartbeat_forfeit_query_drift');
     if(sql.prepare('SELECT 1 FROM arena_matches'+plan.sql.slice(index,end)+' LIMIT 1').get(...plan.params.slice(3))||sql.prepare("SELECT 1 FROM arena_matches WHERE id=? AND status='finished' AND settlement_token='' LIMIT 1").get(heartbeat.arena_match_id))return entry;
    }
    if(heartbeat&&!heartbeat.arena_match_id&&heartbeat.area!=='arena'){
     const queued=sql.prepare('SELECT mode,channel,room_id FROM arena_queue WHERE player_id=? LIMIT 1').get(actor);if(queued&&rules.isArenaMode(queued.mode)&&rules.readArenaSelection511(db,queued.mode,queued.channel,settings,cycle,at,queued.room_id))return entry;
    }
   }
   return null;
  }finally{sql.exec('ROLLBACK');}
 }
}
