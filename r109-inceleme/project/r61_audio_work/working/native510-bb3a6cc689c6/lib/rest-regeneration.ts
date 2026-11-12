// Numbered parameters: now in ms, player id, percent/sec, combat delay sec, still delay sec.
// Credit begins only after every rest condition; never accumulate offline healing.
const restStart = `MAX(last_regen_at, last_movement_at_ms + ?5 * 1000,
  MAX(last_monster_hit_at, attack_one_at, attack_two_at, attack_three_at, attack_four_at) + ?4 * 1000)`;
const eligible = `hp > 0 AND hp < max_hp AND ?3 > 0 AND last_seen >= CAST(?1 / 1000 AS INTEGER) - 15
  AND last_movement_at_ms <= ?1 - ?5 * 1000
  AND MAX(last_monster_hit_at, attack_one_at, attack_two_at, attack_three_at, attack_four_at) <= ?1 - ?4 * 1000
  AND ${restStart} <= ?1 - 1000`;
const gain = `MAX(1, CAST(ROUND(max_hp * ?3 / 100.0 * MIN(5000, MAX(0, ?1 - ${restStart})) / 1000.0) AS INTEGER))`;
export const REST_REGEN_SQL = `UPDATE players SET last_seen = CAST(?1 / 1000 AS INTEGER),
  hp = CASE WHEN ${eligible} THEN MIN(max_hp, hp + ${gain}) ELSE hp END,
  hp_revision = hp_revision + CASE WHEN ${eligible} THEN 1 ELSE 0 END,
  last_regen_at = ?1
  WHERE id = ?2 RETURNING hp, max_hp, hp_revision, respawn_at_ms, area, channel, arena_match_id`;
