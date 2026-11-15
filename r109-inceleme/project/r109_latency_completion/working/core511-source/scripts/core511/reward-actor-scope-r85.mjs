import {instanceRewardAreaR71,assertInstanceRewardScopeR71} from './instance-reward-scope-r71.mjs';
import {sharedClaimMismatchR85} from './shared-claim-rejection-r85.mjs';
import {demand} from './contract.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {normalizeClaimTargets} from './claim-chunks.mjs';

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


// Compute the complete relation component, not one pass through each group.
// Otherwise an unheld party mate of a selected guild/room member could start
// a reward that writes a held actor. The realm bound remains conservative.
export function expandRewardActorsR112(sql,initial){
 const actors=new Set(initial),queue=[...actors];if(actors.size>100)return null;
 const related=prepareCached477(sql,`SELECT p.id FROM (
  SELECT team.player_id AS id FROM party_members mine JOIN party_members team ON team.party_id=mine.party_id WHERE mine.player_id=?
  UNION SELECT team.player_id FROM guild_members mine JOIN guild_members team ON team.guild_id=mine.guild_id WHERE mine.player_id=?
  UNION SELECT team.player_id FROM dungeon_members mine JOIN dungeon_members team ON team.run_id=mine.run_id WHERE mine.player_id=?
  UNION SELECT team.player_id FROM adventure_members mine JOIN adventure_members team ON team.run_id=mine.run_id WHERE mine.player_id=? AND mine.departed=0 AND team.departed=0
 ) related JOIN players p ON p.id=related.id`);
 for(let i=0;i<queue.length;i++)for(const {id}of related.all(queue[i],queue[i],queue[i],queue[i]))if(!actors.has(id)){actors.add(id);if(actors.size>100)return null;queue.push(id);}
 return [...actors].sort();
}

// A bounded, explicitly audited native claim only. Mixed/oversized requests,
// load-lab targets, living/unrecorded rounds and other native actions retain
// the existing all-owner path. Normalization is the native shared definition.
export function foregroundClaimTargetsR85(input){
 if(input?.action!=='claim_rewards'||!Array.isArray(input.rewardTargets)||!input.rewardTargets.length||input.rewardTargets.length>10)return null;
 const targets=normalizeClaimTargets(input.rewardTargets);
 return targets.length&&targets.every(t=>Number.isSafeInteger(t.spawnRound))?targets:null;
}

// R112 also fences the external reward worker with the SAME selected scope
// and TEMP write/refresh audit. Unknown/special-map claims retain all-owner holds.
const claimantAreas=new Set(['sanctum','sinsi','forest','frozen','ancient','champions']);
export function foregroundClaimScopeR85(sql,input,actor,channel){
 const targets=foregroundClaimTargetsR85(input);if(!targets)return null;
 const player=prepareCached477(sql,'SELECT area,channel,arena_match_id FROM players WHERE id=?').get(actor);
 if(!player||player.channel!==channel||player.arena_match_id||!claimantAreas.has(player.area))return null;
 const actors=new Set([actor]);
 for(const target of targets){
  const boss=target.id==='dunya-bosu-1',stone=target.id.startsWith('sinsi-tasi-');
  // A recorded death makes the historic contribution set immutable. Without
  // this prerequisite another channel could create a new terminal reward
  // while only the initially selected recipients were draining.
  if(boss){
   if(!prepareCached477(sql,'SELECT 1 FROM boss_defeats WHERE boss_round=?').get(target.spawnRound)||prepareCached477(sql,'SELECT 1 FROM loadlab_boss_rounds_v1 WHERE boss_round=?').get(target.spawnRound))return null;
  }else if(stone){
   if(!prepareCached477(sql,'SELECT 1 FROM sinsi_defeats WHERE monster_id=? AND spawn_round=?').get(target.id,target.spawnRound))return null;
  }else{
   // Only immutable recorded ordinary deaths, in this realm/channel. Neither
   // a living round nor an adventure/event boss can enter this narrower path.
   const dead=prepareCached477(sql,`SELECT d.loot_source_key FROM normal_defeats d JOIN monsters m ON m.id=d.monster_id WHERE d.monster_id=? AND d.spawn_round=? AND m.channel=? AND m.is_boss=0 AND m.is_stone=0 AND m.area IN ('forest','frozen','ancient') AND NOT EXISTS(SELECT 1 FROM loadlab_boss_rounds_v1 l WHERE l.monster_id=m.id)`).get(target.id,target.spawnRound,channel);
   if(!dead||['adventure.catalog','event.catalog'].includes(dead.loot_source_key))return null;
  }
  for(const id of scopedRewardActorsR79(sql,boss?{kind:'boss',round:target.spawnRound}:{kind:'sinsi',id:target.id,round:target.spawnRound}))actors.add(id);
  if(actors.size>100)return null;
 }
 const expanded=expandRewardActorsR112(sql,actors);if(!expanded)return null;
 if(expanded.some(id=>!prepareCached477(sql,'SELECT 1 FROM players WHERE id=?').get(id)))return null;
 return {cycle:prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,targets,actors:expanded.sort()};
}

// A shared world lease plus the source channel's monster lanes make the
// monster contribution set stable. Scope ordinary-map attacks to that map's
// residents and reward relations, never to client-supplied recipient IDs.
// World-ending targets retain the broad path. Tower/mist rooms also require
// the existing active-run/cycle/member/profile proof and every current member.
export function foregroundAttackScopeR112(sql,input,actor,channel){
 if(input?.action!=='attack'||typeof input.targetId!=='string'||!/^[a-z0-9-]{1,64}$/.test(input.targetId))return null;
 const p=prepareCached477(sql,'SELECT area,channel,arena_match_id FROM players WHERE id=?').get(actor);
 if(!p||p.channel!==channel||p.arena_match_id||!['forest','frozen','ancient','black','rune_v2','champions'].includes(p.area)&&!instanceRewardAreaR71(p.area))return null;
 const m=prepareCached477(sql,'SELECT id,area,channel,spawn_round FROM monsters WHERE id=?').get(input.targetId);
 if(!m||m.area!==p.area||![0,channel].includes(m.channel)||m.id==='dunya-bosu-1')return null;
 if(instanceRewardAreaR71(p.area)){
  const invalid=Symbol('invalid instance');try{assertInstanceRewardScopeR71(sql,{actor,player:p,target:{id:m.id},fail:()=>{throw invalid;}});}catch(e){if(e===invalid)return null;throw e;}
 }
 const expanded=attackActorsR115(sql,actor,p.area,channel);if(!expanded)return null;
 return {cycle:prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get().cycle,area:p.area,target:{id:m.id,spawnRound:m.spawn_round},actors:expanded.sort()};
}

// Grant and terminal preparation must use the same recipient closure. Local
// contributors remain eligible after leaving the map; they are absent from
// both the current-resident list and the shared world's in-memory journal.
// Extra actors are authoritative unflushed shared contributions at grant time.
export function attackActorsR115(sql,actor,area,channel,extraActors=[]){
 const actors=new Set([actor,...extraActors,...prepareCached477(sql,'SELECT id FROM players WHERE area=? AND channel=?').all(area,channel).map(r=>r.id)]);
 if(instanceRewardAreaR71(area))for(const r of prepareCached477(sql,"SELECT a.player_id AS id FROM adventure_members a JOIN adventure_runs r ON r.id=a.run_id WHERE r.area=? AND a.departed=0").all(area))actors.add(r.id);
 for(const r of prepareCached477(sql,`SELECT DISTINCT mp.player_id AS id FROM monster_participants mp JOIN monsters m ON m.id=mp.monster_id AND m.spawn_round=mp.spawn_round JOIN players p ON p.id=mp.player_id WHERE m.area=? AND m.channel IN (0,?)`).all(area,channel))actors.add(r.id);
 return expandRewardActorsR112(sql,actors);
}
export const foregroundScopeR112=(sql,input,actor,channel)=>input?.action==='attack'?foregroundAttackScopeR112(sql,input,actor,channel):foregroundClaimScopeR85(sql,input,actor,channel);

// Parent and worker share these fences; the worker receives only a parent-made
// snapshot, never a caller-provided permission list. Called inside its sole
// writer transaction, before native reward SQL and before COMMIT respectively.
export function assertClaimWorkerScopeR112(sql,claim,payload,context){
 if(!claim)return;
 const scope=foregroundScopeR112(sql,payload.input,context.actor,context.peer.channel);
 demand(JSON.stringify(payload.input)===claim.input&&JSON.stringify(scope)===JSON.stringify(claim.scope),'shared_terminal_actor_fenced');
 const ids=(payload.resources??[]).filter(k=>k.startsWith('player:')).map(k=>k.slice(7));
 demand(ids.every(id=>scope.actors.includes(id))&&scope.actors.every(id=>ids.includes(id)),'shared_terminal_actor_fenced');
}
export function assertClaimRefreshR112(claim,proof,payload,result,context){
 if(!claim)return true;
 const audit=result?.sharedRefresh;
 if(!(payload.sharedLease===proof&&audit?.version===1&&audit.all===false&&Array.isArray(audit.actors)&&audit.actors.every(id=>claim.scope.actors.includes(id))))throw sharedClaimMismatchR85(payload,context);
 return true;
}
