type Point = { x: number; y: number };
type Segment = (fromX: number, fromY: number, toX: number, toY: number) => boolean;

// Every returned step obeys the same whole-segment check as the game server.
// Sliding keeps input responsive on lake edges without jumping to a spawn.
export function slideMovement(current: Point, next: Point, walkable: Segment, outwardNormal?: Point): Point {
  const valid = (to: Point) => walkable(current.x, current.y, to.x, to.y);
  if (valid(next)) return next;
  if (!valid(current)) return current;
  const candidates = [{ x: next.x, y: current.y }, { x: current.x, y: next.y }];
  if (outwardNormal) {
    const { x: nx, y: ny } = outwardNormal;
    const squared = nx * nx + ny * ny;
    const inward = squared > 0 ? Math.min(0, ((next.x - current.x) * nx + (next.y - current.y) * ny) / squared) : 0;
    candidates.unshift({ x: next.x - inward * nx, y: next.y - inward * ny });
  }
  let best = current, progress = 0;
  for (const candidate of [next, ...candidates]) {
    let low = 0, high = 1;
    if (valid(candidate)) low = 1;
    else for (let i = 0; i < 16; i++) {
      const ratio = (low + high) / 2;
      const point = { x: current.x + (candidate.x - current.x) * ratio, y: current.y + (candidate.y - current.y) * ratio };
      if (valid(point)) low = ratio; else high = ratio;
    }
    const point = { x: current.x + (candidate.x - current.x) * low, y: current.y + (candidate.y - current.y) * low };
    const distance = Math.hypot(point.x - current.x, point.y - current.y);
    if (distance > progress && valid(point)) { best = point; progress = distance; }
  }
  return best;
}
