export type PvpPresentation = {
  intentId: string;
  attackerId: string;
  targetId: string;
  ability: number;
  role: string;
  startedAt: number;
  confirmedAt?: number;
};

// Visual motion uses its normal duration independently of network latency.
// Confirmations update damage/HP; they must never pause or restart the swing.
export function pvpPresentationPose(hit: PvpPresentation | undefined, now: number, durationMs = 390) {
  if (!hit) return undefined;
  const elapsed = Math.max(0, now - hit.startedAt);
  return { active: elapsed < durationMs, phase: Math.min(1, elapsed / durationMs) };
}

export function pvpProjectileProgress(elapsedSeconds: number, durationSeconds = .34) {
  return Math.max(0, Math.min(1, elapsedSeconds / durationSeconds));
}
