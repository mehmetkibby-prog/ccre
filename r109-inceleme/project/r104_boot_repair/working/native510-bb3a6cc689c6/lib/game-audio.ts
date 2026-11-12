export type GameAudioMixInput = {
  joined: boolean;
  area: string | null | undefined;
  musicEnabled: boolean;
  effectsEnabled: boolean;
  musicVolume: number;
  effectsVolume: number;
};

export type GameAudioGestureRecoveryInput = {
  audioSupported: boolean;
  audioState: string | null;
  audioRecoveryPending: boolean;
  effectsEnabled: boolean;
  musicEnabled: boolean;
  joined: boolean;
  area: string | null | undefined;
  musicPaused: boolean;
  ambiencePaused: boolean;
  musicRecoveryBlocked: boolean;
  ambienceRecoveryBlocked: boolean;
  mediaPrimeNeeded: boolean;
  mediaPrimePending: boolean;
};

export function normalizeGameAudioVolume(value: number, fallback: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : fallback));
}

export function resolveGameAudioMix(input: GameAudioMixInput) {
  const musicVolume = normalizeGameAudioVolume(input.musicVolume, .12);
  const effectsVolume = normalizeGameAudioVolume(input.effectsVolume, 1);
  const musicActive = input.joined && input.musicEnabled;
  return {
    music: musicActive ? musicVolume : 0,
    ambience: musicActive && input.area === "fishing" ? Math.min(.075, musicVolume * .28) : 0,
    effects: input.effectsEnabled ? effectsVolume : 0,
  } as const;
}

// This runs in the capture-phase pointer hot path. Once audio is unlocked it
// must stay a cheap no-op; otherwise every rapid combat tap can wake WebKit's
// media pipeline even though no recovery is necessary.
export function shouldRecoverGameAudioFromGesture(input: GameAudioGestureRecoveryInput) {
  if (!input.effectsEnabled && !input.musicEnabled) return false;
  if (input.audioSupported && input.audioState !== "running") return !input.audioRecoveryPending;
  if (input.musicEnabled && input.joined) {
    if (input.musicPaused && !input.musicRecoveryBlocked) return true;
    if (input.area === "fishing" && input.ambiencePaused && !input.ambienceRecoveryBlocked) return true;
  }
  return input.musicEnabled && input.mediaPrimeNeeded && !input.mediaPrimePending;
}

export function shouldPrimeMediaGeneration(generation: number, attemptedGeneration: number, pending: boolean) {
  return !pending && generation !== attemptedGeneration;
}

export type AudioResumeAttempt = { audio: object; at: number; fromGesture: boolean };
// An autoplay-blocked resume promise may never settle until a real gesture.
// It must not own a permanent lock. Upgrade a background attempt immediately
// on a gesture; otherwise bound retries while interrupted/suspended to 1/sec.
export function shouldAttemptAudioResume(audio: { state: string } | null, previous: AudioResumeAttempt | null, fromGesture: boolean, now: number) {
  if (!audio || audio.state === "running" || audio.state === "closed") return false;
  if (!previous || previous.audio !== audio) return true;
  if (fromGesture && !previous.fromGesture) return true;
  return now - previous.at >= 1000;
}
