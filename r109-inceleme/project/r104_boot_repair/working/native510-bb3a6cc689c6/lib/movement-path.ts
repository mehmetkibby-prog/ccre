export type MovementPoint = { x: number; y: number };
export type MovementWaypoint = [number, number];
export const MAX_MOVEMENT_WAYPOINTS = 64;
type Walkable = (fromX: number, fromY: number, toX: number, toY: number) => boolean;

// Drain a delayed route in server-legal pieces; its final destination can stay
// beyond the single-move ceiling forever, even after the player stops.
export function boundedMovementCheckpoint(path: MovementWaypoint[], from: MovementPoint, limit = 300) {
  let start = Math.max(0, path.findLastIndex(p => p[0] === from.x && p[1] === from.y) + 1);
  if (!start) {
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1], [bx, by] = path[i];
      const dx = bx - ax, dy = by - ay, squared = dx * dx + dy * dy;
      const ratio = squared ? ((from.x - ax) * dx + (from.y - ay) * dy) / squared : -1;
      if (ratio >= 0 && ratio <= 1 && Math.hypot(from.x - ax - ratio * dx, from.y - ay - ratio * dy) < 1e-6) start = i;
    }
  }
  const result: MovementWaypoint[] = [];
  let previous = from, remaining = limit;
  for (let i = start; i < path.length; i++) {
    const [x, y] = path[i], distance = Math.hypot(x - previous.x, y - previous.y);
    if (distance > remaining) {
      const point: MovementWaypoint = [previous.x + (x - previous.x) * remaining / distance, previous.y + (y - previous.y) * remaining / distance];
      result.push(point);
      return { path: result, point, partial: true, insertAt: i };
    }
    result.push([x, y]); remaining -= distance; previous = { x, y };
  }
  const point: MovementWaypoint = path.at(-1) ?? [from.x, from.y];
  return { path: result.length ? result : [point], point, partial: false, insertAt: -1 };
}

// Keep corners around obstacles when HTTP checkpoints are coalesced. In open
// ground this remains just two points, so the normal hot path stays small.
export function appendMovementWaypoint(path: MovementWaypoint[], from: MovementPoint, to: MovementPoint, walkable: Walkable, protectedPoint?: MovementWaypoint, pendingPoint?: MovementWaypoint) {
  if (!path.length) path.push([from.x, from.y]);
  if (Math.hypot(to.x - path.at(-1)![0], to.y - path.at(-1)![1]) < 1e-8) return true;
  const beforeLast = path.at(-2);
  const last = path.at(-1)!;
  const protectedLast = [protectedPoint, pendingPoint].some(point => point && last[0] === point[0] && last[1] === point[1]);
  if (beforeLast && !protectedLast && walkable(beforeLast[0], beforeLast[1], to.x, to.y)) path.pop();
  else if (path.length >= MAX_MOVEMENT_WAYPOINTS) return false;
  path.push([to.x, to.y]);
  return true;
}

export function movementPathDistance(from: MovementPoint, to: MovementPoint, raw: unknown, walkable: Walkable): number | null {
  if (raw === undefined) return walkable(from.x, from.y, to.x, to.y) ? Math.hypot(to.x - from.x, to.y - from.y) : null;
  if (!Array.isArray(raw) || !raw.length || raw.length > MAX_MOVEMENT_WAYPOINTS) return null;
  if (!raw.every(p => Array.isArray(p) && p.length === 2 && p.every(n => typeof n === "number" && Number.isFinite(n)))) return null;
  const path = raw as MovementWaypoint[];
  const end = path.at(-1)!;
  if (end[0] !== to.x || end[1] !== to.y) return null;
  // An HTTP timeout can hide a successful commit. Resume at its exact point;
  // never walk backwards through the already-committed part of a retry.
  const resumeAt = path.findLastIndex(p => p[0] === from.x && p[1] === from.y);
  let start = Math.max(0, resumeAt + 1);
  if (resumeAt < 0) {
    // Acknowledged points inside a compressed straight segment need not remain
    // individual vertices. Resume on that segment without revisiting its start.
    for (let i = 1; i < path.length; i++) {
      const [ax, ay] = path[i - 1], [bx, by] = path[i];
      const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
      const ratio = lengthSquared ? ((from.x - ax) * dx + (from.y - ay) * dy) / lengthSquared : -1;
      if (ratio >= 0 && ratio <= 1 && Math.hypot(from.x - ax - ratio * dx, from.y - ay - ratio * dy) < 1e-6) start = i;
    }
  }
  let previous = from, distance = 0;
  for (const point of path.slice(start)) {
    if (!walkable(previous.x, previous.y, point[0], point[1])) return null;
    distance += Math.hypot(point[0] - previous.x, point[1] - previous.y);
    previous = { x: point[0], y: point[1] };
  }
  return distance;
}
