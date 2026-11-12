import {DRAGON_LEADERS_UNION498,dragonBossFields498,dragonBossHasContributor498,seedDragonBossRows498} from './dragon-ranking498.mjs';
import {RUNE_V2_LEADERS_UNION483,runeV2BossFields483,runeV2BossHasContributor483,seedRuneV2BossRows483} from './rune-v2-ranking.mjs';
// Stone-boss scoring reuses the existing participant row, combat transaction,
// normal reward claim and boss-leader snapshot. No timer or per-hit query.
export const STONE_IDS_SQL476="'stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3'";
export const isStoneBossRanking476=id=>id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3';
export const STONE_PARTICIPANT_SQL476=`INSERT INTO monster_participants (monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT id,spawn_round,?,?,MIN(hp,?),? FROM monsters WHERE id=? AND hp>0 AND spawn_round=?
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,
 stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export const STONE_MIXED_PARTICIPANT_SQL476=`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at,stone_damage476,stone_first_hit_at_ms476)
 SELECT victim.id,victim.spawn_round,?,?,CASE WHEN victim.id IN (${STONE_IDS_SQL476}) THEN MIN(victim.hp,CAST(json_extract(expected.value,'$.stoneDamage476') AS INTEGER)) ELSE 0 END,
 CASE WHEN victim.id IN (${STONE_IDS_SQL476}) THEN ? ELSE 0 END
 FROM json_each(?) expected JOIN monsters victim ON victim.id=json_extract(expected.value,'$.id')
 WHERE victim.hp>0 AND victim.spawn_round=json_extract(expected.value,'$.round')
 ON CONFLICT(monster_id,spawn_round,player_id) DO UPDATE SET created_at=excluded.created_at,
 stone_damage476=monster_participants.stone_damage476+excluded.stone_damage476,
 stone_first_hit_at_ms476=CASE WHEN monster_participants.stone_first_hit_at_ms476>0 THEN monster_participants.stone_first_hit_at_ms476 ELSE excluded.stone_first_hit_at_ms476 END`;
export const STONE_WINNER_GEMS_SQL476=`UPDATE players SET gems=gems+?+CASE WHEN id=(
 SELECT mp.player_id FROM monster_participants mp JOIN players eligible ON eligible.id=mp.player_id
 WHERE eligible.loadlab_run_id='' AND mp.monster_id=? AND mp.spawn_round=? AND mp.stone_damage476>0
 ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 1
 ) THEN 150 ELSE 0 END WHERE id IN (SELECT player_id FROM normal_reward_claims WHERE claim_token=?)`;
export const STONE_PARTICIPANT_EXPIRY_GUARD476=`NOT (monster_id IN (${STONE_IDS_SQL476},'rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','dragon-world-1') AND stone_damage476>0 AND (EXISTS(SELECT 1 FROM monsters live_stone476 WHERE live_stone476.id=monster_participants.monster_id AND live_stone476.spawn_round=monster_participants.spawn_round AND live_stone476.hp>0) OR EXISTS(SELECT 1 FROM normal_defeats pending_stone476 WHERE pending_stone476.monster_id=monster_participants.monster_id AND pending_stone476.spawn_round=monster_participants.spawn_round AND pending_stone476.rewards_completed_at=0)))`;
// Defeats are cleaned before participants. Preserve only genuinely undelivered
// stone rewards; completed or ownerless history keeps the existing expiry.
export const STONE_DEFEAT_EXPIRY_GUARD476=`NOT (monster_id IN (${STONE_IDS_SQL476},'rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','dragon-world-1') AND rewards_completed_at=0 AND EXISTS(SELECT 1 FROM monster_participants pending_mp476 JOIN players pending_player476 ON pending_player476.id=pending_mp476.player_id WHERE pending_mp476.monster_id=normal_defeats.monster_id AND pending_mp476.spawn_round=normal_defeats.spawn_round AND NOT EXISTS(SELECT 1 FROM normal_reward_claims pending_claim476 WHERE pending_claim476.monster_id=pending_mp476.monster_id AND pending_claim476.spawn_round=pending_mp476.spawn_round AND pending_claim476.player_id=pending_mp476.player_id)))`;
export const LEGACY_BOSS_LEADERS_SQL476=`SELECT p.name, p.role, bp.total_damage
  FROM boss_participants bp
  JOIN players p ON p.id = bp.player_id
  JOIN monsters boss ON boss.is_boss = 1 AND boss.spawn_round = bp.boss_round
  WHERE boss.hp > 0 AND bp.total_damage > 0 AND p.loadlab_run_id = '' AND boss.loadlab_run_id = ''
  ORDER BY bp.total_damage DESC, bp.created_at ASC, p.name ASC LIMIT 5`;
// At most five old leaderboard rows and three fixed stone-boss rows. The JSON
// aggregate wraps sorted raw columns so SQLite does not double-encode objects.
export const BOSS_LEADERS_SQL476=`SELECT legacy.name,legacy.role,legacy.total_damage,NULL AS stone_monster_id,NULL AS stone_spawn_round,NULL AS stone_channel,NULL AS stone_rows_json
 FROM (${LEGACY_BOSS_LEADERS_SQL476}) legacy
 UNION ALL
 SELECT NULL,NULL,NULL,stone476.id,stone476.spawn_round,stone476.channel,(
  SELECT json_group_array(json_object('playerId',ranked.player_id,'name',ranked.name,'damage',ranked.stone_damage476)) FROM (
   SELECT mp.player_id,p.name,mp.stone_damage476 FROM monster_participants mp JOIN players p ON p.id=mp.player_id
   WHERE p.loadlab_run_id='' AND mp.monster_id=stone476.id AND mp.spawn_round=stone476.spawn_round AND mp.stone_damage476>0
   ORDER BY mp.stone_damage476 DESC,mp.stone_first_hit_at_ms476 ASC,mp.player_id ASC LIMIT 10
  ) ranked
 ) AS stone_rows_json FROM monsters stone476 WHERE stone476.id IN (${STONE_IDS_SQL476}) AND stone476.hp>0 AND stone476.loadlab_run_id=''`+RUNE_V2_LEADERS_UNION483+DRAGON_LEADERS_UNION498;
const decoded=new WeakMap();
function decode(rows){
 if(!Array.isArray(rows))return {world:[],stone:new Map()};
 let view=decoded.get(rows);if(view)return view;
 view={world:[],stone:new Map()};
 for(const row of rows){
  if(!row.stone_monster_id){view.world.push({name:row.name,role:row.role,total_damage:row.total_damage});continue;}
  if(!isStoneBossRanking476(row.stone_monster_id)||![1,2,3].includes(Number(row.stone_channel)))continue;
  const entries=JSON.parse(row.stone_rows_json||'[]');
  const contributors=entries.filter(e=>typeof e.playerId==='string'&&Number.isFinite(Number(e.damage))&&Number(e.damage)>0).slice(0,10).map((e,i)=>({playerId:e.playerId,name:String(e.name??''),damage:Number(e.damage),rank:i+1}));
  view.stone.set(Number(row.stone_channel),{monsterId:row.stone_monster_id,spawnRound:Number(row.stone_spawn_round),channel:Number(row.stone_channel),contributors,winnerBonusGems:150});
 }
 decoded.set(rows,view);return view;
}
export function stoneBossFields476(rows,area,channel,monsters,viewerId){
 const view=decode(rows),ranking=area==='black'?view.stone.get(Number(channel)):null;
 const live=ranking&&(monsters??[]).some(m=>m.id===ranking.monsterId&&Number(m.spawn_round)===ranking.spawnRound&&Number(m.channel)===ranking.channel&&Number(m.hp)>0);
 return {bossLeaders:view.world,blackStoneBossRanking:live?ranking:null,...runeV2BossFields483(rows,area,channel,monsters,viewerId),...dragonBossFields498(rows,area,monsters,viewerId)};
}
// A new subscription already carries an authoritative snapshot. Seed only its
// channel while preserving the other cached channels; refreshBoss still uses
// the global bounded query, never the last subscriber's private scope.
export function seedStoneBossRows476(current,data){
 let rows=current??data.bossLeaders??[];
 if(data.area==='dragon')return seedDragonBossRows498(rows,data);if(data.area==='rune_v2')return seedRuneV2BossRows483(rows,data);if(data.area!=='black')return rows;
 rows=rows.filter(r=>Number(r.stone_channel)!==Number(data.channel));
 const ranking=data.blackStoneBossRanking;
 if(ranking)rows.push({stone_monster_id:ranking.monsterId,stone_spawn_round:ranking.spawnRound,stone_channel:ranking.channel,stone_rows_json:JSON.stringify(ranking.contributors)});
 return rows;
}
export function stoneBossHasContributor476(rows,playerId){
 if(dragonBossHasContributor498(rows,playerId)||runeV2BossHasContributor483(rows,playerId))return true;for(const ranking of decode(rows).stone.values())if(ranking.contributors.some(row=>row.playerId===playerId))return true;
 return false;
}
