export function ensureMonsterRespawnSettings(db){
 const columns=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(row=>row.name));
 for(const name of ['frozen_monster_respawn_seconds','black_monster_respawn_seconds']){
  if(!columns.has(name))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${name} INTEGER NOT NULL DEFAULT 18`);
 }
}
