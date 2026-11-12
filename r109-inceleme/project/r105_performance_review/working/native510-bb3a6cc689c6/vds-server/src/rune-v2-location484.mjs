import {RUNE_V2_BOSS_SPAWN} from '../../lib/rune-v2.mjs';

// Called inside ensureRuneV2Schema's existing cold-start transaction. A marker
// prevents later restarts from moving an engaged boss back to its spawn.
export function migrateRuneV2BossLocation484(db) {
  if (!db.isTransaction) throw Error('Karanlık Rün Sahili konum geçişi işlem içinde çalışmalı.');
  db.exec('CREATE TABLE IF NOT EXISTS rune_v2_location_migrations484 (id TEXT PRIMARY KEY, applied_at INTEGER NOT NULL)');
  const applied = db.prepare("INSERT OR IGNORE INTO rune_v2_location_migrations484(id,applied_at) VALUES('upper_stone_entrance',unixepoch())").run().changes;
  if (!applied) return 0;
  const result = db.prepare(`UPDATE monsters SET x=?,y=?
    WHERE area='rune_v2' AND channel IN (1,2,3)
    AND id='rune-v2-boss-c'||channel||'-1' AND variant='rune_v2_boss'
    AND is_boss=0 AND is_stone=0 AND summoned=0 AND loadlab_run_id=''`).run(RUNE_V2_BOSS_SPAWN.x,RUNE_V2_BOSS_SPAWN.y);
  return Number(result.changes);
}
