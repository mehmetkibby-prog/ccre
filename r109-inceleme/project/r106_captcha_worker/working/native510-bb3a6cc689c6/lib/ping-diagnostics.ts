export type PingProbe = { clientAt: number; sentAt: number; queuedBytes: number };
export type PingSample = { at: number; ms: number; sentAt: number; queuedBytes: number };
type FrameGap = { at: number; ms: number };

// Application RTT includes browser scheduling as well as the network/server.
// Never smooth, cap, or subtract frame gaps from the measured round trip.
export function finishPingProbe(probe: PingProbe, clientAt: unknown, now: number): PingSample | null {
  if (clientAt !== probe.clientAt || !Number.isFinite(now) || !Number.isFinite(probe.sentAt)
    || now < probe.sentAt) return null;
  return { at: now, sentAt: probe.sentAt, ms: Math.max(1, Math.round(now - probe.sentAt)), queuedBytes: probe.queuedBytes };
}

export function recentPingSpike(samples: readonly PingSample[], gaps: readonly FrameGap[], now: number) {
  // 200 ms is a diagnostic threshold, not a replacement for the raw ping.
  let sample: PingSample | undefined;
  for (let i = samples.length - 1; i >= 0; i--) {
    const candidate = samples[i];
    if (candidate.ms >= 200 && now >= candidate.at && now - candidate.at < 30_000) { sample = candidate; break; }
  }
  if (!sample) return null;
  let overlappingFrameGapMs = 0;
  for (const gap of gaps) {
    // A gap may be recorded on the first frame AFTER the pong handler ran.
    // Compare intervals, not just the time at which the gap was recorded.
    if (gap.at > sample.sentAt && gap.at - gap.ms < sample.at) {
      overlappingFrameGapMs = Math.max(overlappingFrameGapMs, gap.ms);
    }
  }
  return { ...sample, overlappingFrameGapMs };
}
