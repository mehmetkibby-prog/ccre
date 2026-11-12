type Point = { x: number; y: number };

// Keep a chase stable when two peers are nearly equally distant. This only
// chooses a visual target; server range, hits and ownership remain unchanged.
export function selectMonsterChaseTarget<T extends Point & { id: string }>(
  players: readonly T[], anchor: Point, range: number, currentId: string | null,
): T | undefined {
  let nearest: T | undefined, nearestDistance = Infinity;
  let current: T | undefined, currentDistance = Infinity;
  for (const player of players) {
    const distance = Math.hypot(player.x - anchor.x, player.y - anchor.y);
    if (player.id === currentId && distance <= range + 24) { current = player; currentDistance = distance; }
    if (distance <= range && distance < nearestDistance) { nearest = player; nearestDistance = distance; }
  }
  return current && (!nearest || currentDistance <= nearestDistance + 32) ? current : nearest;
}

// Leash changes affect the next destination, never the current displayed point.
// Returning from a provoked chase must obey the same per-frame distance budget
// as walking. A respawn is handled separately by its spawn_round.
export function advanceMonsterPosition(
  current: Point, target: Point, anchor: Point, leash: number, speed: number, dt: number,
  constrain: (from: Point, to: Point) => Point,
): Point {
  const anchorDistance = Math.hypot(target.x - anchor.x, target.y - anchor.y);
  const destination = anchorDistance > leash && anchorDistance > 0
    ? { x: anchor.x + (target.x - anchor.x) * leash / anchorDistance,
        y: anchor.y + (target.y - anchor.y) * leash / anchorDistance }
    : target;
  const distance = Math.hypot(destination.x - current.x, destination.y - current.y);
  const step = Math.min(distance, Math.max(0, speed) * Math.min(.1, Math.max(0, dt)));
  if (distance < 1e-8 || step === 0) return current;
  const next = constrain(current, {
    x: current.x + (destination.x - current.x) * step / distance,
    y: current.y + (destination.y - current.y) * step / distance,
  });
  // A collision fallback must not teleport a creature to the player spawn.
  return Math.hypot(next.x - current.x, next.y - current.y) <= step + 1e-6 ? next : current;
}
