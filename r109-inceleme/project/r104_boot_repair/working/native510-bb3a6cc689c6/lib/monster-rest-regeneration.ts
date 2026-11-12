// A monster heals only while no player has an active combat engagement with it.
// Advance each live monster's clock at most once per second across all player
// heartbeats. Rewriting it on every heartbeat multiplies SQLite writes by the
// player count and continually postpones the one-second healing deadline.
// Keep advancing the clock during combat/full health and preserve the existing
// catch-up cap; no extra healing is granted when an engagement ends.
export const MONSTER_REST_REGEN_SQL = `UPDATE monsters SET
  hp = CASE WHEN hp > 0 AND hp < max_hp AND ?2 > 0
      AND last_damaged_at_ms <= ?1 - ?3 * 1000
      AND last_regen_at_ms <= ?1 - 1000
      AND NOT EXISTS (SELECT 1 FROM pve_engagements engagement
        WHERE engagement.monster_id = monsters.id
          AND engagement.spawn_round = monsters.spawn_round
          AND engagement.expires_at_ms >= ?1)
    THEN MIN(max_hp, hp + MAX(1, CAST(ROUND(max_hp * ?2 / 100.0 * MIN(5000, MAX(0, ?1 - MAX(last_regen_at_ms, last_damaged_at_ms + ?3 * 1000))) / 1000.0) AS INTEGER)))
    ELSE hp END,
  last_regen_at_ms = ?1
  WHERE hp > 0 AND last_regen_at_ms <= ?1 - 1000`;
