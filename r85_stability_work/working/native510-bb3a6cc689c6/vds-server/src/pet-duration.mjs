// Pet expiry is acquired_at + duration throughout gameplay. Extend live copies
// once; retain the old expiry for expired copies rather than reviving them.
export function upgradePetDurations(db, now = Date.now()) {
 db.exec('SAVEPOINT pet_duration_upgrade');
 try {
  db.exec('CREATE TABLE IF NOT EXISTS premium_duration_migrations(id TEXT PRIMARY KEY,applied_at_ms INTEGER NOT NULL)');
  const first=db.prepare("INSERT OR IGNORE INTO premium_duration_migrations VALUES('pet-seven-days-v378',?)").run(now).changes;
  if(first){
   const pets=new Set(db.prepare('PRAGMA table_info(player_pets)').all().map(row=>row.name));
   if(pets.has('acquired_at'))db.prepare("UPDATE player_pets SET acquired_at=acquired_at-345600 WHERE kind<>'starter' AND acquired_at+259200<=?").run(Math.floor(now/1000));
   const storage=new Set(db.prepare('PRAGMA table_info(player_storage_items)').all().map(row=>row.name));
   if(['storage_type','payload','expires_at_ms'].every(key=>storage.has(key))){
    db.prepare("UPDATE player_storage_items SET payload=json_set(payload,'$.acquired_at',json_extract(payload,'$.acquired_at')-345600) WHERE storage_type='pet' AND kind<>'starter' AND json_valid(payload) AND expires_at_ms<=?").run(now);
    db.prepare("UPDATE player_storage_items SET expires_at_ms=expires_at_ms+345600000 WHERE storage_type='pet' AND kind<>'starter' AND expires_at_ms>?").run(now);
   }
  }
  db.exec('RELEASE pet_duration_upgrade');
 } catch(error) { db.exec('ROLLBACK TO pet_duration_upgrade; RELEASE pet_duration_upgrade');throw error; }
}
