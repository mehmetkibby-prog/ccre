// Only the two early stale/dead/out-of-range retaliation exits call this.
// Engagement state already belongs to the normal combat-memory store. Preserve
// its compare-and-swap predicate and the existing owner, age and durability
// fallback; no reward, inventory, death or currency statement is deferred here.
export async function clearStalePveEngagement477(database, playerId, expectedNextHitAtMs) {
  const statement = database.prepare('DELETE FROM pve_engagements WHERE player_id = ? AND next_hit_at_ms = ?').bind(playerId, expectedNextHitAtMs);
  if (database.combat?.enabled && typeof database.combatBatch === 'function') {
    return (await database.combatBatch([statement], playerId))[0];
  }
  return statement.run();
}
