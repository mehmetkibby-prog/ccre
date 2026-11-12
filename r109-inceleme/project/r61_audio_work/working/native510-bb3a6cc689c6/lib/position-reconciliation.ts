export type PositionCheckpoint = { x: number; y: number; positionRevision: number };

export function readPositionCheckpoint(raw: unknown): PositionCheckpoint | null {
  if (!raw || typeof raw !== "object") return null;
  const value = raw as Record<string, unknown>;
  const revision = value.positionRevision ?? value.position_revision;
  if (typeof value.x !== "number" || typeof value.y !== "number" || !Number.isFinite(value.x) || !Number.isFinite(value.y)
    || !Number.isSafeInteger(revision) || Number(revision) < 0) return null;
  return { x: value.x, y: value.y, positionRevision: Number(revision) };
}

// Ordering belongs to the persisted revision, not time spent in transit.
// Equal-revision snapshots cannot override coordinates already confirmed.
export function reconcilePositionCheckpoint(previous: PositionCheckpoint | undefined, incoming: PositionCheckpoint) {
  return previous && incoming.positionRevision <= previous.positionRevision ? previous : incoming;
}
