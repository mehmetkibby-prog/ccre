import {optimizeR18} from './perf-r18-features.mjs';
// Keep one owner-fenced combat-store row per player. Independent clocks live in
// that same row, therefore checkpoint, transfer and durable-death fencing apply
// to the complete encounter. No timer or additional writer lane is introduced.
export const PVE_ATTACKERS_LIMIT489=32;
export function ensurePveMultiSchema489(db){
 if(!db.prepare('PRAGMA table_info(pve_engagements)').all().some(r=>r.name==='attackers489'))db.exec("ALTER TABLE pve_engagements ADD COLUMN attackers489 TEXT NOT NULL DEFAULT '{}' CHECK(json_valid(attackers489))");
 db.exec(`UPDATE pve_engagements SET attackers489=json_object(monster_id,json_object('monster_id',monster_id,'spawn_round',spawn_round,'next_hit_at_ms',next_hit_at_ms,'last_skill_at_ms',last_skill_at_ms)) WHERE attackers489='{}'`);
}
export function pveEntries489(row){
 if(!row)return [];
 const values=Object.values(JSON.parse(row.attackers489||'{}'));
 if(!values.length&&row.monster_id)values.push({monster_id:row.monster_id,spawn_round:row.spawn_round,next_hit_at_ms:row.next_hit_at_ms,last_skill_at_ms:row.last_skill_at_ms});
 return values.filter(e=>e&&typeof e.monster_id==='string'&&Number.isSafeInteger(e.spawn_round)&&Number.isSafeInteger(e.next_hit_at_ms)).slice(0,PVE_ATTACKERS_LIMIT489);
}
export function pvePath489(id){return '$.'+JSON.stringify(id);}
export const PVE_HEAD_SQL489=`UPDATE pve_engagements SET
 next_hit_at_ms=COALESCE((SELECT MIN(json_extract(value,'$.next_hit_at_ms')) FROM json_each(attackers489)),next_hit_at_ms),
 monster_id=COALESCE((SELECT key FROM json_each(attackers489) ORDER BY json_extract(value,'$.next_hit_at_ms'),key LIMIT 1),monster_id),
 spawn_round=COALESCE((SELECT json_extract(value,'$.spawn_round') FROM json_each(attackers489) ORDER BY json_extract(value,'$.next_hit_at_ms'),key LIMIT 1),spawn_round)
 WHERE player_id=? AND changes()>0`;
export async function clearPveEntry489(database,playerId,engagement){
 const path=pvePath489(engagement.monster_id),statements=[
  database.prepare(`UPDATE pve_engagements SET attackers489=json_remove(attackers489,?) WHERE player_id=? AND json_extract(attackers489,?)=? AND json_extract(attackers489,?)=?`).bind(path,playerId,path+'.spawn_round',engagement.spawn_round,path+'.next_hit_at_ms',engagement.next_hit_at_ms),
  database.prepare(PVE_HEAD_SQL489).bind(playerId),
  database.prepare("DELETE FROM pve_engagements WHERE player_id=? AND attackers489='{}'").bind(playerId)
 ];
 return database.combat?.enabled?database.combatBatch(statements,playerId):database.batch(statements);
}
let armSqlR18;
export function pveArmSql489(existing){
 if(optimizeR18&&armSqlR18!==undefined)return armSqlR18;
 // An existing target never gets its deadline reset by a player's next attack.
 const state=`CASE WHEN pve_engagements.attackers489='{}' THEN json_object(pve_engagements.monster_id,json_object('monster_id',pve_engagements.monster_id,'spawn_round',pve_engagements.spawn_round,'next_hit_at_ms',pve_engagements.next_hit_at_ms,'last_skill_at_ms',pve_engagements.last_skill_at_ms)) ELSE pve_engagements.attackers489 END`;
 const result=`CASE WHEN json_extract(${state},'$.'||json_quote(excluded.monster_id)||'.spawn_round')=excluded.spawn_round THEN ${state}
 WHEN (SELECT count(*) FROM json_each(${state}))<${PVE_ATTACKERS_LIMIT489} OR json_type(${state},'$.'||json_quote(excluded.monster_id)) IS NOT NULL
 THEN json_set(${state},'$.'||json_quote(excluded.monster_id),json_object('monster_id',excluded.monster_id,'spawn_round',excluded.spawn_round,'next_hit_at_ms',excluded.next_hit_at_ms,'last_skill_at_ms',excluded.last_skill_at_ms)) ELSE ${state} END`;
 if(optimizeR18)armSqlR18=result;return result;
}
