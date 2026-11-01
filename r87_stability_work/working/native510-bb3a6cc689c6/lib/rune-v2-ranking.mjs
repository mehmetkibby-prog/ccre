import {runeV2BossWave484} from '../vds-server/src/rune-v2-combat484.mjs';
import {randomUUID} from 'node:crypto';
export const RUNE_V2_IDS_SQL483="'rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1'";
export const isRuneV2RankBoss483=id=>typeof id==='string'&&/^rune-v2-boss-c[1-3]-1$/.test(id);
export const runeV2RealPlayerSql483=p=>`${p}.is_gm=0 AND ${p}.loadlab_run_id='' AND EXISTS(SELECT 1 FROM accounts eligible_account483 WHERE eligible_account483.id=${p}.account_id AND eligible_account483.permanently_banned=0 AND eligible_account483.email NOT LIKE '%@loadlab.invalid') AND NOT EXISTS(SELECT 1 FROM loadlab_entities_v1 marked483 WHERE marked483.id=${p}.id OR marked483.account_id=${p}.account_id) AND NOT EXISTS(SELECT 1 FROM loadlab_admissions_v1 admitted483 WHERE admitted483.account_id=${p}.account_id)`;
const eligible=runeV2RealPlayerSql483('actor');
const eligibleHit=`${eligible} AND actor.area=victim.area AND actor.channel=victim.channel AND actor.arena_match_id='' AND actor.hp>0 AND victim.area='rune_v2' AND victim.loadlab_run_id='' AND victim.id='rune-v2-boss-c'||victim.channel||'-1'`;
export const RUNE_V2_RANKING_SCHEMA483=`CREATE TABLE IF NOT EXISTS rune_v2_boss_winner_claims483(monster_id TEXT NOT NULL,spawn_round INTEGER NOT NULL,winner_id TEXT NOT NULL,damage INTEGER NOT NULL,first_hit_at_ms INTEGER NOT NULL,bonus_gems INTEGER NOT NULL CHECK(bonus_gems BETWEEN 0 AND 1000000),config_revision INTEGER NOT NULL,claim_token TEXT NOT NULL,created_at_ms INTEGER NOT NULL,applied INTEGER NOT NULL DEFAULT 0 CHECK(applied IN (0,1)),PRIMARY KEY(monster_id,spawn_round));`;
export const RUNE_V2_PARTICIPANT_SQL483=`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT victim.id,victim.spawn_round,actor.id,?,CASE WHEN ${eligibleHit} THEN MIN(victim.hp,?) ELSE 0 END,CASE WHEN ${eligibleHit} THEN ? ELSE 0 END
 FROM monsters victim JOIN players actor ON actor.id=? WHERE victim.id=? AND victim.hp>0 AND victim.spawn_round=?
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export function runeV2Participant483(database,playerId,now,rolled,nowMs,id,round){return database.prepare(RUNE_V2_PARTICIPANT_SQL483).bind(now,rolled,nowMs,playerId,id,round);}
export const RUNE_V2_MIXED_PARTICIPANT_SQL483=`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT victim.id,victim.spawn_round,actor.id,?,CASE WHEN victim.id IN (${RUNE_V2_IDS_SQL483}) AND ${eligibleHit} THEN MIN(victim.hp,CAST(json_extract(expected.value,'$.stoneDamage476') AS INTEGER)) ELSE 0 END,
 CASE WHEN victim.id IN (${RUNE_V2_IDS_SQL483}) AND ${eligibleHit} THEN ? ELSE 0 END
 FROM json_each(?) expected JOIN monsters victim ON victim.id=json_extract(expected.value,'$.id') JOIN players actor ON actor.id=?
 WHERE victim.hp>0 AND victim.spawn_round=json_extract(expected.value,'$.round')
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export function runeV2MixedParticipant483(database,playerId,nowMs,monsters){return database.prepare(RUNE_V2_MIXED_PARTICIPANT_SQL483).bind(Math.floor(nowMs/1000),nowMs,monsters,playerId);}
// Selected winner and configured prize freeze in the same durable death transaction.
// The recipient's current map/online status cannot erase valid past contribution.
export const RUNE_V2_WINNER_INSERT_SQL483=`INSERT OR IGNORE INTO rune_v2_boss_winner_claims483(monster_id,spawn_round,winner_id,damage,first_hit_at_ms,bonus_gems,config_revision,claim_token,created_at_ms)
 SELECT victim.id,victim.spawn_round,COALESCE(winner.player_id,''),COALESCE(winner.stone_damage476,0),COALESCE(winner.stone_first_hit_at_ms476,0),
 CASE WHEN winner.player_id IS NULL THEN 0 ELSE MIN(MAX(0,9000000000000-recipient.gems),COALESCE(json_extract(defeat.loot_profile_json,'$.runeV2Boss.topDamageGems'),250)) END,
 COALESCE(json_extract(defeat.loot_profile_json,'$.runeV2Boss.revision'),1),?,?
 FROM monsters victim JOIN normal_defeats defeat ON defeat.monster_id=victim.id AND defeat.spawn_round=victim.spawn_round
 LEFT JOIN monster_participants winner ON winner.monster_id=victim.id AND winner.spawn_round=victim.spawn_round AND winner.player_id=(
  SELECT mp.player_id FROM monster_participants mp JOIN players actor ON actor.id=mp.player_id WHERE mp.monster_id=victim.id AND mp.spawn_round=victim.spawn_round AND mp.stone_damage476>0 AND ${eligible}
  ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 1)
 LEFT JOIN players recipient ON recipient.id=winner.player_id
 WHERE victim.id=? AND victim.spawn_round=? AND victim.hp>0 AND victim.hp<=? AND victim.area='rune_v2' AND victim.loadlab_run_id='' AND victim.id='rune-v2-boss-c'||victim.channel||'-1' AND victim.id IN (${RUNE_V2_IDS_SQL483})`;
export const RUNE_V2_WINNER_PAY_SQL483=`UPDATE players SET gems=gems+(SELECT bonus_gems FROM rune_v2_boss_winner_claims483 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0)
 WHERE id=(SELECT winner_id FROM rune_v2_boss_winner_claims483 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0) AND ${runeV2RealPlayerSql483('players')}`;
export function prepareRuneV2Winner483(database,target,rolled,nowMs){if(!isRuneV2RankBoss483(target.id))return [];const token=randomUUID(),args=[target.id,target.spawn_round,token];return [database.prepare(RUNE_V2_WINNER_INSERT_SQL483).bind(token,nowMs,target.id,target.spawn_round,rolled),database.prepare(RUNE_V2_WINNER_PAY_SQL483).bind(...args,...args),database.prepare('UPDATE rune_v2_boss_winner_claims483 SET applied=1 WHERE monster_id=? AND spawn_round=? AND claim_token=? AND applied=0').bind(...args)];}
// At most25 names per boss in shared cache; only top10 and the viewer's own row leave it.
export const RUNE_V2_LEADERS_UNION483=`
 UNION ALL SELECT NULL,NULL,NULL,rank_boss483.id,rank_boss483.spawn_round,rank_boss483.channel,(
 SELECT json_group_array(json_object('playerId',ranked.player_id,'name',ranked.name,'damage',ranked.stone_damage476)) FROM (
  SELECT mp.player_id,actor.name,mp.stone_damage476 FROM monster_participants mp JOIN players actor ON actor.id=mp.player_id
  WHERE mp.monster_id=rank_boss483.id AND mp.spawn_round=rank_boss483.spawn_round AND mp.stone_damage476>0 AND ${eligible}
  ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 25
 ) ranked) FROM monsters rank_boss483 WHERE rank_boss483.id IN (${RUNE_V2_IDS_SQL483}) AND rank_boss483.hp>0 AND rank_boss483.area='rune_v2' AND rank_boss483.loadlab_run_id='' AND rank_boss483.id='rune-v2-boss-c'||rank_boss483.channel||'-1'`;
const decoded=new WeakMap();
function rankings483(rows){if(!Array.isArray(rows))return new Map();let found=decoded.get(rows);if(found)return found;found=new Map();for(const r of rows){if(!isRuneV2RankBoss483(r.stone_monster_id))continue;const entries=JSON.parse(r.stone_rows_json||'[]').slice(0,25).filter(e=>typeof e.playerId==='string'&&Number.isSafeInteger(e.damage)&&e.damage>0).map((e,i)=>({playerId:e.playerId,name:String(e.name??''),damage:e.damage,rank:Number.isSafeInteger(e.rank)&&e.rank>=1&&e.rank<=25?e.rank:i+1}));found.set(Number(r.stone_channel),{monsterId:r.stone_monster_id,spawnRound:Number(r.stone_spawn_round),channel:Number(r.stone_channel),entries});}decoded.set(rows,found);return found;}
function runeV2BossFieldsWithoutWave484(rows,area,channel,monsters,viewerId){const r=area==='rune_v2'?rankings483(rows).get(Number(channel)):null;if(!r||!monsters?.some(m=>m.id===r.monsterId&&m.spawn_round===r.spawnRound&&m.channel===r.channel&&m.hp>0))return {runeV2BossRanking:null};const own=r.entries.find(e=>e.playerId===viewerId)??null;return {runeV2BossRanking:{monsterId:r.monsterId,spawnRound:r.spawnRound,channel:r.channel,contributors:r.entries.slice(0,10),own,ownRankOutsideTop25:!own&&r.entries.length===25,winnerBonusGems:globalThis.__colRuneV2?.settings().config.monsters.boss.topDamageGems??250}};}
export function runeV2BossHasContributor483(rows,playerId){for(const ranking of rankings483(rows).values())if(ranking.entries.some(r=>r.playerId===playerId))return true;return false;}
export function seedRuneV2BossRows483(rows,data){const r=data.runeV2BossRanking;if(!r)return rows.filter(row=>!isRuneV2RankBoss483(row.stone_monster_id)||Number(row.stone_channel)!==Number(data.channel));const existing=rankings483(rows).get(Number(data.channel));if(existing?.monsterId===r.monsterId&&existing.spawnRound===r.spawnRound)return rows;const entries=[...(r.contributors??[])];if(r.own&&!entries.some(e=>e.playerId===r.own.playerId))entries.push(r.own);entries.sort((a,b)=>a.rank-b.rank);return [...rows.filter(row=>!isRuneV2RankBoss483(row.stone_monster_id)||Number(row.stone_channel)!==Number(data.channel)),{stone_monster_id:r.monsterId,stone_spawn_round:r.spawnRound,stone_channel:r.channel,stone_rows_json:JSON.stringify(entries)}];}

export function runeV2BossFields483(rows,area,channel,monsters,viewerId){return {...runeV2BossFieldsWithoutWave484(rows,area,channel,monsters,viewerId),runeV2BossWave484:runeV2BossWave484(area,channel,monsters)};}
