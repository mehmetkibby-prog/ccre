type FishingKind = "sokan" | "levrek" | "zargana" | "pearl" | "talisman";
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
export const FISHING_PROOF_SCALE = 1_000_000;
export const FISHING_PROOF_REQUIRED = 780_000;

export type FishingProofRow = {
  fish_kind: FishingKind;
  started_at_ms: number;
  bite_at_ms: number;
  earliest_finish_at_ms: number;
  expires_at_ms: number;
  proof_updated_at_ms: number;
  proof_sequence: number;
  proof_bar: number;
  proof_velocity: number;
  proof_progress: number;
  proof_holding: number;
  proof_samples: number;
  proof_changes: number;
  proof_seed: number;
};

export function fishingMotion(seed: number) {
  const normalizedSeed = Math.max(0, Math.floor(seed));
  return {
    phase: (normalizedSeed % 628_319) / 100_000,
    frequency: 1.45 + (Math.floor(normalizedSeed / 8) % 401) / 1_000,
    amplitude: .27 + (Math.floor(normalizedSeed / 3_208) % 61) / 1_000,
  };
}

export function advanceFishingProof(state: FishingProofRow, requestedAtMs: number) {
  const biteAtMs = Math.max(state.started_at_ms, state.bite_at_ms);
  let cursorMs = Math.max(biteAtMs, state.proof_updated_at_ms || biteAtMs);
  const endMs = Math.max(cursorMs, Math.min(requestedAtMs, state.expires_at_ms + 3_000));
  let bar = clamp(state.proof_bar / FISHING_PROOF_SCALE, .06, .94);
  let velocity = clamp(state.proof_velocity / FISHING_PROOF_SCALE, -4, 4);
  let progress = clamp(state.proof_progress / FISHING_PROOF_SCALE, 0, 1);
  const holding = state.proof_holding === 1;
  const motion = fishingMotion(state.proof_seed);
  while (cursorMs < endMs && progress > 0 && progress < 1) {
    const stepMs = Math.min(20, endMs - cursorMs);
    const dt = stepMs / 1_000;
    cursorMs += stepMs;
    const elapsed = Math.max(0, (cursorMs - biteAtMs) / 1_000);
    const fishPosition = clamp(.5 + Math.sin(elapsed * motion.frequency + motion.phase
      + Math.sin(elapsed * .71 + motion.phase * .31) * 1.8) * motion.amplitude
      + Math.sin(elapsed * motion.frequency * 2.13 + motion.phase * .73) * motion.amplitude * .28, .06, .94);
    velocity += (holding ? -1.72 : 1.22) * dt;
    velocity *= Math.pow(.38, dt);
    bar += velocity * dt;
    if (bar < .06) { bar = .06; velocity = Math.abs(velocity) * .2; }
    if (bar > .94) { bar = .94; velocity = -Math.abs(velocity) * .2; }
    // Tracking must stay inside the visible green zone. Escaped and completed
    // casts are terminal, including when delayed input packets are replayed.
    progress = clamp(progress + (Math.abs(bar - fishPosition) <= .19 ? .135 : -.105) * dt, 0, 1);
  }
  return {
    updatedAtMs: endMs,
    bar: Math.round(bar * FISHING_PROOF_SCALE),
    velocity: Math.round(velocity * FISHING_PROOF_SCALE),
    progress: Math.round(progress * FISHING_PROOF_SCALE),
  };
}

export type FishingInput = { at: number; holding: boolean };
/** Replay bounded timestamped controls together, never one HTTP round trip per tap. */
export function replayFishingInputs(proof: FishingProofRow, inputs: FishingInput[], nowMs: number) {
  if (!inputs.length || inputs.length > 64) throw new Error("invalid_batch");
  let state = { ...proof };
  let changes = 0;
  for (const input of inputs) {
    const atMs = proof.bite_at_ms + input.at;
    if (!Number.isSafeInteger(input.at) || typeof input.holding !== "boolean" || input.at < 0
      || atMs < state.proof_updated_at_ms || atMs > proof.expires_at_ms
      || atMs > nowMs + 250 || atMs < nowMs - 5000) throw new Error("invalid_time");
    const advanced = advanceFishingProof(state, atMs);
    if (state.proof_holding !== Number(input.holding)) changes++;
    state = {...state, proof_updated_at_ms: advanced.updatedAtMs, proof_bar: advanced.bar,
      proof_velocity: advanced.velocity, proof_progress: advanced.progress, proof_holding:Number(input.holding)};
  }
  return {state, samples:inputs.length, changes};
}
