import {prepareCached477} from './writer-statements.mjs';
import {normalizeClaimTargets} from './claim-chunks.mjs';
import {dungeonFreezeActorsR71} from './dungeon-freeze-scope-r71.mjs';

// The same recipient superset serves background delivery and foreground
// claims. Keep native eligibility/reward SQL authoritative: historical paid
// participants and whole current parties are deliberately included here.
export function scopedRewardActorsR79(sql,target){
 let actors;
 if(target.kind==='drops')actors=target.rows.map(row=>row.owner);
 else if(target.kind==='boss')actors=prepareCached477(sql,`SELECT bp.player_id AS id FROM boss_participants bp JOIN players p ON p.id=bp.player_id
  WHERE bp.boss_round=? AND bp.total_damage>0 UNION SELECT mp.player_id AS id FROM monster_participants mp JOIN players p ON p.id=mp.player_id
  WHERE mp.spawn_round=? AND (mp.monster_id='dunya-bosu-1' OR EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 lab WHERE lab.monster_id=mp.monster_id AND lab.boss_round=mp.spawn_round))`).all(target.round,target.round).map(row=>row.id);
 else actors=prepareCached477(sql,`SELECT mp.player_id AS id FROM monster_participants mp JOIN players p ON p.id=mp.player_id
   WHERE mp.monster_id=? AND mp.spawn_round=?`).all(target.id,target.round).map(row=>row.id);
 const ids=new Set(actors);
 if(target.kind!=='drops')for(const id of actors)for(const row of prepareCached477(sql,`SELECT team.player_id AS id FROM party_members mine JOIN party_members team ON team.party_id=mine.party_id JOIN players p ON p.id=team.player_id WHERE mine.player_id=?`).all(id))ids.add(row.id);
 return [...ids].filter(id=>prepareCached477(sql,'SELECT 1 FROM players WHERE id=?').get(id)).sort();
}

// A bounded, explicitly audited native claim only. Mixed/oversized requests,
// load-lab targets, living/unrecorded rounds and other native actions retain
// the existing all-owner path. Normalization is the native shared definition.
export function foregroundClaimTargetsR80(input){
 if(input?.action!=='claim_rewards'||!Array.isArray(input.rewardTargets)||!input.rewardTargets.length||input.rewardTargets.length>10)return null;
 const targets=normalizeClaimTargets(input.rewardTargets);
 return targets.length&&targets.every(t=>Number.isSafeInteger(t.spawnRound)&&(t.id==='dunya-bosu-1'||t.id.startsWith('sinsi-tasi-')))?targets:null;
}

// These callers stay on the parent native writer. The ordinary-map reward
// worker has a separate guard envelope; expanding to it needs an equivalent
// scope/write-set fence in that protocol, not just a wider area allowlist.
const claimantAreas=new Set(['sanctum','sinsi']);
export function foregroundClaimScopeR80(sql,input,actor,channel){
 const targets=foregroundClaimTargetsR80(input);if(!targets)return null;
 const player=prepareCached477(sql,'SELECT area,channel,arena_match_id FROM players WHERE id=?').get(actor);
 if(!player||player.channel!==channel||player.arena_match_id||!claimantAreas.has(player.area))return null;
 const actors=new Set([actor]);
 for(const target of targets){
  const boss=target.id==='dunya-bosu-1';
  // A recorded death makes the historic contribution set immutable. Without
  // this prerequisite another channel could create a new terminal reward
  // while only the initially selected recipients were draining.
  if(boss){
   if(!prepareCached477(sql,'SELECT 1 FROM boss_defeats WHERE boss_round=?').get(target.spawnRound)||prepareCached477(sql,'SELECT 1 FROM loadlab_boss_rounds_v1 WHERE boss_round=?').get(target.spawnRound))return null;
  }else if(!prepareCached477(sql,'SELECT 1 FROM sinsi_defeats WHERE monster_id=? AND spawn_round=?').get(target.id,target.spawnRound))return null;
  for(const id of scopedRewardActorsR79(sql,boss?{kind:'boss',round:target.spawnRound}:{kind:'sinsi',id:target.id,round:target.spawnRound}))actors.add(id);
  if(actors.size>100)return null;
 }
 let expanded;
 try{expanded=dungeonFreezeActorsR71(sql,[...actors]);}catch(error){if(error?.code==='permanent_dungeon_scope_capacity')return null;throw error;}
 if(expanded.some(id=>!prepareCached477(sql,'SELECT 1 FROM players WHERE id=?').get(id)))return null;
 return {cycle:prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,targets,actors:expanded.sort()};
}
