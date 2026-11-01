// Realm-wide authenticated server budget, not a player's action allowance.
// v417: 90 players × (10 push + 4 movement + 1.25 attack)/s already
// needs 13,725 events/10s, before HP fanout and keepalive traffic.
// Keep a finite 24,000-event window and its matching bounded replay cache.
export const BROADCAST_WINDOW_MS = 10_000;
export const MAX_BROADCAST_REQUESTS = 24_000;
// A signature can be 30s ahead and remains valid for 30s after that timestamp.
// Keep ten windows (including clock skew, cleanup delay and window boundaries)
// without evicting live replay records. The ingress
// budget is global so changing source IP cannot exhaust this bounded cache.
export const MAX_REQUEST_NONCES = MAX_BROADCAST_REQUESTS * 10;
export const BROADCAST_CAPACITY_REVISION = 417;
// Signed batches: one ECDSA verification for up to MAX_BATCH_EVENTS events.
export const BROADCAST_BATCH_REVISION = 1;
export const MAX_BATCH_EVENTS = 64;
export const MAX_BATCH_BYTES = 262_144;

export function createBroadcastBudget() {
  let startedAt = 0, count = 0;
  // A batch spends one unit per contained event, so batching never raises the
  // number of events accepted in a window.
  return (now, units = 1) => {
    if (now - startedAt >= BROADCAST_WINDOW_MS) { startedAt = now; count = 0; }
    if (count + units > MAX_BROADCAST_REQUESTS) return false;
    count += units;
    return true;
  };
}
