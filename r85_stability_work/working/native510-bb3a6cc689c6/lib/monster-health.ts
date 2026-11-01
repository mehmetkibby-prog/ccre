export type MonsterHealthState = Readonly<{
  spawnRound: number;
  hp: number;
}>;

function normalizeHealthValue(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function normalizePreviewValue(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.floor(numeric) : 0;
}

export function reconcileMonsterHealth(
  previous: MonsterHealthState | undefined,
  spawnRound: number,
  hp: number,
): MonsterHealthState {
  const next = {
    spawnRound: normalizeHealthValue(spawnRound),
    hp: normalizeHealthValue(hp),
  };

  if (!previous || next.spawnRound > previous.spawnRound) return next;
  if (next.spawnRound < previous.spawnRound || next.hp >= previous.hp) return previous;
  return next;
}

export function predictMonsterPreviewHp(currentHp: number, minimumDamage: number) {
  const hp = normalizePreviewValue(currentHp);
  const damage = Math.max(1, normalizeHealthValue(minimumDamage));
  // Keep estimates separately for hit feedback and rejection bookkeeping.
  // They must never determine authoritative life state or rewards.
  return hp - damage;
}

export function rollbackMonsterPreviewHp(currentPreviewHp: number, damage: number, authoritativeHp: number) {
  const confirmed = normalizeHealthValue(authoritativeHp);
  if (confirmed <= 0) return 0;
  return Math.min(
    confirmed,
    normalizePreviewValue(currentPreviewHp) + Math.max(1, normalizeHealthValue(damage)),
  );
}

export function resolveMonsterDisplayHp(authoritativeHp: number, _previewHps: Iterable<number>) {
  // A lethal estimate clamped to 1 HP still looks dead on a large health bar.
  // Show confirmed damage only, so an empty bar and confirmed death agree.
  return normalizeHealthValue(authoritativeHp);
}

// Presentation only: never use this value for targeting, death or rewards.
export function previewMonsterBarHp(authoritativeHp: number, previewHp?: number) {
  const hp = normalizeHealthValue(authoritativeHp);
  if (hp === 0 || previewHp === undefined || !Number.isFinite(previewHp)) return hp;
  // A predicted lethal hit can be rejected or delayed. Never show 0 HP while
  // the confirmed monster remains alive and targetable.
  return Math.min(hp, Math.max(1, Math.floor(previewHp)));
}

// Pause a duplicate tap briefly while a lethal-looking strike is in flight.
// A slow or lost response must not freeze the enemy for the orphan timeout.
export function hasPendingLethalMonsterHit(
  authoritativeHp: number,
  preview: { rawVisualHp: number; intents: ReadonlyMap<string, { expiresAt: number; pauseUntil?: number }> } | undefined,
  localRequests: ReadonlySet<string>,
  now: number,
) {
  if (!(authoritativeHp > 0) || !preview || !Number.isFinite(preview.rawVisualHp) || preview.rawVisualHp > 0) return false;
  for (const [intentId, intent] of preview.intents) {
    if (localRequests.has(intentId) && Math.min(intent.expiresAt, intent.pauseUntil ?? intent.expiresAt) > now) return true;
  }
  return false;
}
