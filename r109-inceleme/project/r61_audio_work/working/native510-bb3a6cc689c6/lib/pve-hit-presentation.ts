/** One committed hit can arrive over HTTP and both realtime sockets. */
export type PveHit = {
  ability?: "basic" | "boss_fire";
  targetId: string; monsterId: string; spawnRound: number;
  cycle: number; area: string; channel: number;
  hp: number; maxHp: number; hpRevision: number; respawnAtMs: number;
  damage: number; blocked: number; attackBlocked?: boolean; nextHitAtMs: number; serverAt: number;
};

export function acceptPveHit(
  value: unknown,
  scope: { cycle: number; area: string; channel: number },
  currentRevision: number,
  seen: Map<string, number>,
): PveHit | null {
  if (!value || typeof value !== "object") return null;
  const hit = value as PveHit;
  if (typeof hit.targetId !== "string" || !hit.targetId || typeof hit.monsterId !== "string" || !hit.monsterId
    || hit.cycle !== scope.cycle || hit.area !== scope.area || hit.channel !== scope.channel
    || ![hit.hp, hit.maxHp, hit.hpRevision, hit.respawnAtMs, hit.damage, hit.blocked,
      hit.spawnRound, hit.nextHitAtMs, hit.serverAt].every(Number.isFinite)
    || hit.hp < 0 || hit.maxHp < 1 || hit.hp > hit.maxHp || hit.damage < 0
    || (hit.damage === 0 && hit.attackBlocked !== true)
    || hit.hpRevision < currentRevision || hit.hpRevision <= (seen.get(hit.targetId) ?? -1)) return null;
  seen.delete(hit.targetId);
  seen.set(hit.targetId, hit.hpRevision);
  if (seen.size > 256) seen.delete(seen.keys().next().value!);
  return hit;
}

/** Stop the wind-up before contact until the server commits the hit. */
export function pveAttackProgress(startedAt: number, duration: number, now: number, awaitingImpact = false) {
  if (startedAt <= 0) return 0;
  const progress = Math.max(0, (now - startedAt) / Math.max(1, duration));
  return awaitingImpact ? Math.min(.32, progress) : progress < 1 ? progress : 0;
}
