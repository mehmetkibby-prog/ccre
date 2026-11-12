export type PlayerHealthPreviewIntent = Readonly<{
  damage: number;
  expiresAt: number;
}>;

export type PlayerHealthPreviewState = Readonly<{
  baseHp: number;
  baseRevision: number;
  rawVisualHp: number;
  intents: ReadonlyMap<string, PlayerHealthPreviewIntent>;
}>;

function normalizedHp(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

function normalizedRevision(value: number) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(0, Math.floor(numeric)) : 0;
}

export function previewPlayerHit(
  previous: PlayerHealthPreviewState | undefined,
  intentId: string,
  authoritativeHp: number,
  authoritativeRevision: number,
  minimumDamage: number,
  expiresAt: number,
): PlayerHealthPreviewState {
  if (previous?.intents.has(intentId)) return previous;
  const baselineHp = normalizedHp(authoritativeHp);
  const baseRevision = normalizedRevision(authoritativeRevision);
  const damage = Math.max(1, normalizedHp(minimumDamage));
  const intents = new Map(previous?.intents ?? []);
  intents.set(intentId, { damage, expiresAt: Math.max(0, Number(expiresAt) || 0) });
  const preservePreviousBaseline = Boolean(previous && baseRevision <= previous.baseRevision);
  return {
    // Aynı revizyondaki dünya nesnesi önceki iyimser vuruş yüzünden zaten düşük
    // görünebilir. Onu yeni kesin taban sanmak, ret/sona erme anında eksik can
    // geri yükler. Taban yalnız daha yeni bir sunucu revizyonuyla değişebilir.
    baseHp: preservePreviousBaseline ? previous!.baseHp : baselineHp,
    baseRevision: Math.max(previous?.baseRevision ?? baseRevision, baseRevision),
    // Ham tahmin yalnız vuruş takibi içindir; can göstergesi kesin veriyi kullanır.
    rawVisualHp: (previous?.rawVisualHp ?? baselineHp) - damage,
    intents,
  };
}

export function settlePlayerHitPreview(
  previous: PlayerHealthPreviewState | undefined,
  intentId: string,
  authoritativeHp: number,
  authoritativeRevision: number,
) {
  const hp = normalizedHp(authoritativeHp);
  const revision = normalizedRevision(authoritativeRevision);
  if (!previous || !intentId || !previous.intents.has(intentId) || hp <= 0) {
    return { state: hp <= 0 ? undefined : previous, hp: resolvePlayerDisplayHp(hp, hp <= 0 ? undefined : previous) };
  }
  const intents = new Map(previous.intents);
  intents.delete(intentId);
  if (!intents.size) return { state: undefined, hp };
  const state: PlayerHealthPreviewState = {
    baseHp: hp,
    baseRevision: revision,
    rawVisualHp: Math.min(previous.rawVisualHp, hp),
    intents,
  };
  return { state, hp: resolvePlayerDisplayHp(hp, state) };
}

export function rejectPlayerHitPreview(
  previous: PlayerHealthPreviewState | undefined,
  intentId: string,
  authoritativeHp: number,
  authoritativeRevision: number,
) {
  const hp = normalizedHp(authoritativeHp);
  const revision = normalizedRevision(authoritativeRevision);
  const rejected = previous?.intents.get(intentId);
  if (!previous || !intentId || !rejected || hp <= 0) {
    return { state: hp <= 0 ? undefined : previous, hp: resolvePlayerDisplayHp(hp, hp <= 0 ? undefined : previous) };
  }
  const intents = new Map(previous.intents);
  intents.delete(intentId);
  if (!intents.size) return { state: undefined, hp };
  const state: PlayerHealthPreviewState = {
    baseHp: hp,
    baseRevision: revision,
    rawVisualHp: Math.min(hp, previous.rawVisualHp + rejected.damage),
    intents,
  };
  return { state, hp: resolvePlayerDisplayHp(hp, state) };
}

export function prunePlayerHitPreviews(
  previous: PlayerHealthPreviewState | undefined,
  now: number,
  authoritativeHp: number,
  authoritativeRevision: number,
) {
  if (!previous) return undefined;
  const intents = new Map<string, PlayerHealthPreviewIntent>();
  let expiredDamage = 0;
  for (const [intentId, preview] of previous.intents) {
    if (preview.expiresAt > now) intents.set(intentId, preview);
    else expiredDamage += preview.damage;
  }
  if (!intents.size || normalizedHp(authoritativeHp) <= 0) return undefined;
  const hp = normalizedHp(authoritativeHp);
  return {
    baseHp: hp,
    baseRevision: normalizedRevision(authoritativeRevision),
    // Kayıp ret/sonuç olursa yalnız süresi dolan intent'in hasarını geri al;
    // devam eden diğer vuruşların önizlemesi korunur.
    rawVisualHp: Math.min(hp, previous.rawVisualHp + expiredDamage),
    intents,
  } satisfies PlayerHealthPreviewState;
}

export function resolvePlayerDisplayHp(
  authoritativeHp: number,
  _preview?: PlayerHealthPreviewState,
  _optimisticHp?: number,
) {
  // Unconfirmed/rejected hits cannot empty the bar, hide a living player,
  // prevent targeting, or postpone a death already confirmed by the server.
  return normalizedHp(authoritativeHp);
}

/** A hit changes the bar once, on confirmation, including critical/elemental damage.
 * Intent previews remain available for tracking, never as a second HP balance.
 */
export function previewPlayerBarHp(authoritativeHp: number, _preview?: PlayerHealthPreviewState, _now = performance.now()) {
  return normalizedHp(authoritativeHp);
}
