// Temporary synthetic history only; never imports a live database.
export function seedHistory(sql, rows, nowMs) {
 if(!rows)return {rows:0};
 const at=Math.floor(nowMs/1000)-3600,started=performance.now();
 const prefix=`WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<${rows}) `;
 sql.prepare(prefix+`INSERT INTO normal_defeats(monster_id,spawn_round,defeated_at,x,y,xp_reward,essence_min,essence_span,loot_profile_json,rewards_completed_at)
 SELECT 'history-'||i,1,?,0,0,1,0,0,?,? FROM n`).run(at,JSON.stringify({historical:true,padding:'x'.repeat(1800)}),at);
 for(const table of ['normal_reward_claims','monster_xp_claims'])sql.prepare(prefix+`INSERT INTO ${table}(monster_id,spawn_round,player_id,claim_token,awarded_at) SELECT 'history-'||i,1,'offline-history','paid-'||i,? FROM n`).run(at);
 sql.prepare(prefix+`INSERT INTO monster_participants(monster_id,spawn_round,player_id,created_at) SELECT 'history-'||i,1,'offline-history',? FROM n`).run(at);
 return {rows,seedMs:performance.now()-started,logicalBytes:sql.prepare('PRAGMA page_count').get().page_count*sql.prepare('PRAGMA page_size').get().page_size};
}
