// Bounded projection of the current viewer's eligible party, not a promised
// reward. The kill transaction remains the sole XP authority. Its peer gate
// is attacker-centred (800 units), not monster-centred.
export function partyView486(id, rows, viewerId, nowSeconds) {
  if (!id) return null;
  const members = rows.slice(0, 5);
  const viewer = members.find(row => row.id === viewerId);
  const active = row => row && Number(row.hp) > 0 && Math.max(Number(row.last_seen) || 0, Math.floor((Number(row.movement_checked_at_ms) || 0) / 1000), Math.floor((Number(row.last_monster_hit_at) || 0) / 1000)) >= nowSeconds - 30;
  const eligible = row => Boolean(active(viewer) && active(row) && row.area === viewer.area && row.channel === viewer.channel && (row.arena_match_id || '') === (viewer.arena_match_id || '') && (row.x - viewer.x) ** 2 + (row.y - viewer.y) ** 2 <= 640000);
  const projected = members.map(row => ({...row, xpEligible486: eligible(row)}));
  const eligibleMembers = projected.filter(row => row.xpEligible486).length;
  return {id, viewerId486: viewerId, leaderId: members[0]?.leader_id || '', eligibleMembers486: eligibleMembers, xpBonusPercent486: 2 * Math.max(0, eligibleMembers - 1), members: projected};
}
