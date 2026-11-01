import {runeV2RealPlayerSql483} from './rune-v2-ranking.mjs';
export const DRAGON_RANK_ID498='dragon-world-1';
export const isDragonRankBoss498=id=>id===DRAGON_RANK_ID498;
const eligible=runeV2RealPlayerSql483('actor');
// The memory combat mirror has players/monsters, not account tables. Keep hit
// eligibility local; the public ranking and atomic payout independently apply
// the full authoritative account/bot eligibility below.
const eligibleHit=`actor.is_gm=0 AND actor.loadlab_run_id='' AND actor.area=victim.area AND (victim.channel=0 OR actor.channel=victim.channel) AND actor.arena_match_id='' AND actor.hp>0 AND victim.area='dragon' AND victim.channel=0 AND victim.loadlab_run_id='' AND victim.id='dragon-world-1'`;
// Replace the existing participant statement; no extra SQL on ordinary hits.
export const DRAGON_PARTICIPANT_SQL498=`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT victim.id,victim.spawn_round,actor.id,?,CASE WHEN ${eligibleHit} THEN MAX(0,MIN(victim.hp,?)) ELSE 0 END,CASE WHEN ${eligibleHit} THEN ? ELSE 0 END
 FROM monsters victim JOIN players actor ON actor.id=? WHERE victim.id=? AND victim.hp>0 AND victim.spawn_round=?
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export function dragonParticipant498(database,playerId,now,rolled,nowMs,id,round){return database.prepare(DRAGON_PARTICIPANT_SQL498).bind(now,rolled,nowMs,playerId,id,round);}
export const DRAGON_MIXED_PARTICIPANT_SQL498=`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT victim.id,victim.spawn_round,actor.id,?,CASE WHEN ${eligibleHit} THEN MAX(0,MIN(victim.hp,CAST(json_extract(expected.value,'$.stoneDamage476') AS INTEGER))) ELSE 0 END,
 CASE WHEN ${eligibleHit} THEN ? ELSE 0 END
 FROM json_each(?) expected JOIN monsters victim ON victim.id=json_extract(expected.value,'$.id') JOIN players actor ON actor.id=?
 WHERE victim.hp>0 AND victim.spawn_round=json_extract(expected.value,'$.round')
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export function dragonMixedParticipant498(database,playerId,nowMs,monsters){return database.prepare(DRAGON_MIXED_PARTICIPANT_SQL498).bind(Math.floor(nowMs/1000),nowMs,monsters,playerId);}
// Query remains bounded and uses the existing shared boss snapshot/cache.
export const DRAGON_LEADERS_UNION498=`
 UNION ALL SELECT NULL,NULL,NULL,dragon498.id,dragon498.spawn_round,dragon498.channel,(
 SELECT json_group_array(json_object('playerId',ranked.player_id,'name',ranked.name,'damage',ranked.stone_damage476)) FROM (
 SELECT mp.player_id,actor.name,mp.stone_damage476 FROM monster_participants mp JOIN players actor ON actor.id=mp.player_id
 WHERE mp.monster_id=dragon498.id AND mp.spawn_round=dragon498.spawn_round AND mp.stone_damage476>0 AND ${eligible}
 ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 25
 ) ranked) FROM monsters dragon498 WHERE dragon498.id='dragon-world-1' AND dragon498.hp>0 AND dragon498.area='dragon' AND dragon498.channel=0 AND dragon498.loadlab_run_id=''`;
export const DRAGON_AWARD_PARTICIPANTS_SQL498=`SELECT p.id,p.role,p.level,p.gems,mp.stone_damage476,mp.stone_first_hit_at_ms476,CASE WHEN ${runeV2RealPlayerSql483('p')} THEN 1 ELSE 0 END AS dragon_eligible498 FROM monster_participants mp JOIN players p ON p.id=mp.player_id WHERE mp.monster_id=? AND mp.spawn_round=? ORDER BY p.id`;
export function dragonWinner498(rows){return rows.filter(p=>p.dragon_eligible498===1&&Number.isSafeInteger(p.stone_damage476)&&p.stone_damage476>0).sort((a,b)=>b.stone_damage476-a.stone_damage476||a.stone_first_hit_at_ms476-b.stone_first_hit_at_ms476||(a.id<b.id?-1:a.id>b.id?1:0))[0]??null;}
const decoded=new WeakMap();
function ranking498(rows){if(!Array.isArray(rows))return null;if(decoded.has(rows))return decoded.get(rows);const r=rows.find(r=>isDragonRankBoss498(r.stone_monster_id));const value=r?{monsterId:r.stone_monster_id,spawnRound:Number(r.stone_spawn_round),channel:Number(r.stone_channel),entries:JSON.parse(r.stone_rows_json||'[]').slice(0,25).filter(e=>typeof e.playerId==='string'&&Number.isSafeInteger(e.damage)&&e.damage>0).map((e,i)=>({playerId:e.playerId,name:String(e.name??''),damage:e.damage,rank:Number.isSafeInteger(e.rank)&&e.rank>=1&&e.rank<=25?e.rank:i+1}))}:null;decoded.set(rows,value);return value;}
export function dragonBossFields498(rows,area,monsters,viewerId){const r=area==='dragon'?ranking498(rows):null;if(!r||!monsters?.some(m=>m.id===r.monsterId&&Number(m.spawn_round)===r.spawnRound&&Number(m.channel)===r.channel&&m.hp>0))return {dragonBossRanking:null};const own=r.entries.find(e=>e.playerId===viewerId)??null;return {dragonBossRanking:{monsterId:r.monsterId,spawnRound:r.spawnRound,channel:r.channel,contributors:r.entries.slice(0,10),own,ownRankOutsideTop25:!own&&r.entries.length===25,winnerBonusGems:150}};}
export function dragonBossHasContributor498(rows,id){return ranking498(rows)?.entries.some(e=>e.playerId===id)??false;}
export function seedDragonBossRows498(rows,data){const r=data.dragonBossRanking;if(!r)return rows.filter(r=>!isDragonRankBoss498(r.stone_monster_id));const old=ranking498(rows),sameLife=old?.monsterId===r.monsterId&&old.spawnRound===r.spawnRound;if(sameLife&&(!r.own||old.entries.some(e=>e.playerId===r.own.playerId)))return rows;const entries=sameLife?[...old.entries]:[...(r.contributors??[])];if(r.own&&!entries.some(e=>e.playerId===r.own.playerId))entries.push(r.own);entries.sort((a,b)=>a.rank-b.rank);return [...rows.filter(row=>!isDragonRankBoss498(row.stone_monster_id)),{stone_monster_id:r.monsterId,stone_spawn_round:r.spawnRound,stone_channel:r.channel,stone_rows_json:JSON.stringify(entries.slice(0,25))}];}
