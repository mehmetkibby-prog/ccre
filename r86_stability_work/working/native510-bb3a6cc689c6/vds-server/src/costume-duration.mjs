// One-time extension for already-active three-day costumes, wherever they are held.
// Existing longer grants and permanent rank appearances are never shortened.
export function upgradeCostumeDurations(db,now=Date.now()){
 db.exec('SAVEPOINT costume_duration_upgrade');
 try{
  db.exec('CREATE TABLE IF NOT EXISTS premium_duration_migrations(id TEXT PRIMARY KEY,applied_at_ms INTEGER NOT NULL)');
  for(const version of ['costume-five-days-v374','costume-seven-days-v378']){
  const first=db.prepare('INSERT OR IGNORE INTO premium_duration_migrations VALUES(?,?)').run(version,now).changes;
  if(first){
   db.prepare('UPDATE players SET radiant_until=radiant_until+172800000 WHERE radiant_until>?').run(now);
   db.prepare('UPDATE players SET weapon_skin_expires_at_ms=weapon_skin_expires_at_ms+172800000 WHERE weapon_skin_owned=1 AND weapon_skin_expires_at_ms>?').run(now);
   for(const table of ['player_items','player_storage_items'])if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name=?").get(table))db.prepare(`UPDATE ${table} SET expires_at_ms=expires_at_ms+172800000 WHERE kind='costume' AND expires_at_ms>?`).run(now);
   db.prepare("UPDATE premium_listings SET payload=json_set(payload,'$.item.expires_at_ms',json_extract(payload,'$.item.expires_at_ms')+172800000) WHERE product='costume' AND json_valid(payload) AND json_extract(payload,'$.item.expires_at_ms')>?").run(now);
   db.prepare("UPDATE premium_listings SET payload=json_set(payload,'$.expires_at_ms',json_extract(payload,'$.expires_at_ms')+172800000) WHERE product='weapon_skin' AND json_valid(payload) AND json_extract(payload,'$.expires_at_ms')>?").run(now);
  }
  }
  db.exec('RELEASE costume_duration_upgrade');
 }catch(e){db.exec('ROLLBACK TO costume_duration_upgrade; RELEASE costume_duration_upgrade');throw e;}
}
