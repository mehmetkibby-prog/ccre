// VDS-only, additive upgrade. The frozen D1 schema is deliberately untouched.
export function ensureNormalRewardQueue(db) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const columns = new Set(db.prepare('PRAGMA table_info(normal_defeats)').all().map(row => row.name));
    if (!columns.has('rewards_completed_at')) {
      db.exec('ALTER TABLE normal_defeats ADD COLUMN rewards_completed_at INTEGER NOT NULL DEFAULT 0');
      // Backfill once, including abandoned deaths with no eligible participants.
      // Partially delivered rewards must remain recoverable after the upgrade.
      db.exec(`UPDATE normal_defeats SET rewards_completed_at = MAX(1, defeated_at)
        WHERE NOT EXISTS (
          SELECT 1 FROM monster_participants mp JOIN players p ON p.id = mp.player_id
          LEFT JOIN normal_reward_claims claim ON claim.monster_id = mp.monster_id
            AND claim.spawn_round = mp.spawn_round AND claim.player_id = mp.player_id
          WHERE mp.monster_id = normal_defeats.monster_id
            AND mp.spawn_round = normal_defeats.spawn_round AND claim.player_id IS NULL
        )`);
    }
    db.exec(`CREATE INDEX IF NOT EXISTS idx_normal_defeats_pending
      ON normal_defeats(defeated_at, monster_id) WHERE rewards_completed_at = 0`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}
