// Exact static native SQL from the pinned generated writer. No bind values.
export const bulkHitShapesR56={
  "participant": "INSERT INTO monster_participants (monster_id, spawn_round, player_id, created_at)\n             SELECT id, spawn_round, ?, ? FROM monsters WHERE id = ? AND hp > 0 AND spawn_round = ?\n             ON CONFLICT(monster_id, spawn_round, player_id) DO UPDATE SET created_at = excluded.created_at",
  "health": "UPDATE monsters SET hp = MAX(0, hp - ?), last_damaged_at_ms = ?,\n             wave_stage = CASE WHEN is_stone = 0 THEN wave_stage\n               WHEN hp - ? <= 0 THEN 3\n               WHEN hp - ? <= max_hp / 2 THEN MAX(wave_stage, 2)\n               ELSE MAX(wave_stage, 1) END,\n             respawn_at = CASE WHEN hp - ? <= 0 THEN ? ELSE respawn_at END,\n             despawn_at = CASE WHEN hp - ? <= 0 AND is_boss = 1 THEN 0 ELSE despawn_at END\n           WHERE id = ? AND hp > 0 AND spawn_round = ? RETURNING hp, wave_stage",
  "before": "SELECT hp FROM monsters WHERE id=? AND hp>0 AND spawn_round=?",
  "event": "INSERT INTO combat_events (player_id, target_id, role, ability, created_at) VALUES (?, ?, ?, ?, ?)"
};
