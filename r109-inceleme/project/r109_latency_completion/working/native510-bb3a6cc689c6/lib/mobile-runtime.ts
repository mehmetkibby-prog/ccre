export const FALLBACK_MOVE_CHECKPOINT_MS = 250;
export const REALTIME_MOVE_CHECKPOINT_MS = 250;
export const REALTIME_COMBAT_MOVE_CHECKPOINT_MS = 250;
export const RECENT_COMBAT_POSITION_MS = 800;

// Every visible position comes from an authoritative HTTP checkpoint. Send
// four per second rather than adding half a second before the network trip.
// The client still coalesces queued positions and allows only one in flight.
export function movementCheckpointIntervalMs(
  realtimeConnected: boolean,
  nowMs: number,
  lastCastAtMs: number,
) {
  if (!realtimeConnected) return FALLBACK_MOVE_CHECKPOINT_MS;
  const recentlyAttacking = lastCastAtMs > 0
    && Number.isFinite(nowMs)
    && nowMs - lastCastAtMs >= 0
    && nowMs - lastCastAtMs <= RECENT_COMBAT_POSITION_MS;
  return recentlyAttacking ? REALTIME_COMBAT_MOVE_CHECKPOINT_MS : REALTIME_MOVE_CHECKPOINT_MS;
}
