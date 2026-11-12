type MonsterIdentity = { id: string; spawn_round: number };
type RepairTarget = { id: string; spawnRound: number };

export function monsterRosterGap(monsters: readonly MonsterIdentity[], target: RepairTarget) {
  if (!target.id || target.id.length > 80 || !Number.isSafeInteger(target.spawnRound) || target.spawnRound < 0) return false;
  const known = monsters.find(monster => monster.id === target.id);
  // An older intent, or an intent for the known life (including its death),
  // cannot prove that any roster data is missing. Never invent a newer life.
  return !known || known.spawn_round < target.spawnRound;
}

// Many players and both transport lanes can mention the same missing life.
// Share one repair across this viewer's room, not one request per attacker.
// Ordinary polling remains the fallback for a one-off event inside the cooldown.
export function createMonsterRosterRepair(options: {
  readScope: () => string;
  readMonsters: () => readonly MonsterIdentity[];
  waitForSnapshot: () => Promise<unknown>;
  refresh: () => Promise<unknown>;
  stopped: () => boolean;
  now?: () => number;
  cooldownMs?: number;
}) {
  const now = options.now ?? (() => performance.now());
  const cooldownMs = options.cooldownMs ?? 1000;
  let scope = "", generation = 0, nextAt = Number.NEGATIVE_INFINITY;
  let running: Promise<void> | null = null;
  const pending = new Map<string, RepairTarget>();
  return function request(targets: readonly RepairTarget[]): Promise<void> {
    const currentScope = options.readScope();
    if (options.stopped() || !currentScope) return Promise.resolve();
    if (currentScope !== scope) {
      scope = currentScope;
      generation += 1;
      nextAt = Number.NEGATIVE_INFINITY;
      running = null;
      pending.clear();
    }
    if (now() < nextAt) return running ?? Promise.resolve();
    const monsters = options.readMonsters();
    for (const target of targets) {
      if (!monsterRosterGap(monsters, target)) continue;
      const prior = pending.get(target.id);
      if ((!prior || prior.spawnRound < target.spawnRound) && (prior || pending.size < 64)) pending.set(target.id, target);
    }
    if (!pending.size) return running ?? Promise.resolve();
    if (running) return running;
    const requestedGeneration = generation;
    const task = (async () => {
      // A snapshot already underway may supply the missing identity. Recheck
      // its result before sending another request; never wait on combat-only
      // reads, because those cannot add a new monster to the client roster.
      await options.waitForSnapshot();
      if (options.stopped() || requestedGeneration !== generation || options.readScope() !== currentScope) return;
      const fresh = options.readMonsters();
      const stillMissing = [...pending.values()].some(target => monsterRosterGap(fresh, target));
      pending.clear();
      if (!stillMissing || now() < nextAt) return;
      nextAt = now() + cooldownMs;
      await options.refresh();
    })().catch(() => {
      // Existing periodic reconciliation retries a failed/aborted snapshot.
    }).finally(() => {
      if (running === task) { running = null; pending.clear(); }
    });
    running = task;
    return task;
  };
}
