// Maintenance/startup only, before any channel is running. Keep the CURRENT
// database and all earned loot/receipts; never restore an older DB backup.
export function evacuateCastleOfflineR59(sql,{now=Date.now()}={}){
 if(!sql.isTransaction)throw Error('castle_offline_atomic_required');
 if(!sql.prepare("SELECT 1 FROM sqlite_schema WHERE type='table' AND name='castle_entries_r59'").get())return {players:0};
 sql.exec('CREATE TEMP TABLE castle_offline_ids_r59(id TEXT PRIMARY KEY) WITHOUT ROWID');
 try{
  sql.exec(`INSERT INTO castle_offline_ids_r59 SELECT p.id FROM players p WHERE p.area='guild_castle' OR (p.channel=4 AND (EXISTS(SELECT 1 FROM castle_entries_r59 e WHERE e.player_id=p.id) OR (SELECT COUNT(*) FROM kernel511_admissions WHERE channel=4)>25 AND EXISTS(SELECT 1 FROM kernel511_admissions a WHERE a.player_id=p.id)))`);
  const count=sql.prepare('SELECT COUNT(*) n FROM castle_offline_ids_r59').get().n;
  // Do not discard unrelated private-dungeon progress on a rollback.
  if(sql.prepare('SELECT 1 FROM dungeon_members WHERE player_id IN(SELECT id FROM castle_offline_ids_r59) LIMIT 1').get())throw Error('castle_rollback_requires_dungeon_exit');
  sql.prepare(`UPDATE players SET area='bazaar',x=1200,y=920,hp=max_hp,respawn_at_ms=0,combat_lock_until_ms=0,stun_until_ms=0,root_until_ms=0,movement_debt_ms=0,movement_checked_at_ms=?,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,hp_revision=hp_revision+1,realtime_scope_version=realtime_scope_version+1,last_seen=0 WHERE id IN(SELECT id FROM castle_offline_ids_r59) AND area='guild_castle'`).run(now);
  sql.exec(`UPDATE players SET last_seen=0 WHERE id IN(SELECT id FROM castle_offline_ids_r59);
DELETE FROM game_presence WHERE account_id IN(SELECT account_id FROM players WHERE id IN(SELECT id FROM castle_offline_ids_r59));
DELETE FROM kernel511_admissions WHERE player_id IN(SELECT id FROM castle_offline_ids_r59);
DELETE FROM kernel511_simulations WHERE player_id IN(SELECT id FROM castle_offline_ids_r59);
DELETE FROM castle_entries_r59 WHERE player_id IN(SELECT id FROM castle_offline_ids_r59);`);
  sql.prepare(`UPDATE kernel511_channel_owners SET epoch=epoch+1,sequence=0,state='active',transfer_id=NULL,target_channel=NULL,release_sequence=NULL,updated_ms=? WHERE player_id IN(SELECT id FROM castle_offline_ids_r59)`).run(now);
  return {players:count};
 }finally{sql.exec('DROP TABLE temp.castle_offline_ids_r59');}
}
