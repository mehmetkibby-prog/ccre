// Server-only combat kernel. No browser-supplied damage, gear or HP is trusted.
// The first rollout is shadow-only: D1 remains the sole live writer until
// ownership fencing and durable settlement are available and verified.
export const COMBAT_PROTOCOL = "memory-combat-shadow-v1";

function number(value, min = 0, max = 1e12) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) throw new Error("invalid_combat_frame");
  return value;
}

export function resolveDamage(rules, rolls) {
  const keys = ["roleBase", "weaponPower", "wingAttack", "multiplier", "skillGrowth", "scale", "criticalChance", "criticalMultiplier", "strongPlayers", "armorReduction", "classDefense", "resistantPlayers", "firePercent", "icePercent"];
  for (const key of keys) number(rules?.[key]);
  number(rolls?.critical, 0, 1); number(rolls?.spread, 0, 1);
  if (rolls.critical === 1 || rolls.spread === 1 || rules.criticalChance > .95 || rules.armorReduction > .6 || rules.resistantPlayers > 90) throw new Error("invalid_combat_frame");
  const critical = rolls.critical < rules.criticalChance;
  const raw = Math.max(1, Math.floor((rules.roleBase + rules.weaponPower + rules.wingAttack + rolls.spread * 7)
    * rules.multiplier * rules.skillGrowth * rules.scale * (critical ? rules.criticalMultiplier : 1)));
  const directDamage = Math.max(1, Math.round(raw * (1 + rules.strongPlayers / 100)
    * (1 - rules.armorReduction) * (1 - rules.classDefense / 100) * (1 - rules.resistantPlayers / 100)));
  const fireDamage = rules.firePercent ? Math.max(1, Math.round(directDamage * rules.firePercent / 100)) : 0;
  const iceDamage = rules.icePercent ? Math.max(1, Math.round(directDamage * rules.icePercent / 100)) : 0;
  return { critical, directDamage, damage: directDamage + fireDamage + iceDamage };
}

export class MemoryCombat {
  constructor(scope) {
    this.scope = scope;
    this.players = new Map();
    this.results = new Map();
  }

  // Called only with authenticated backend checkpoints, never client packets.
  checkpoint(snapshot) {
    if (!snapshot || snapshot.scope !== this.scope || typeof snapshot.id !== "string" || !snapshot.id || snapshot.id.length > 80) throw new Error("invalid_combat_scope");
    number(snapshot.hp); number(snapshot.revision); number(snapshot.scopeVersion, 1);
    if (!Number.isSafeInteger(snapshot.revision) || !Number.isSafeInteger(snapshot.scopeVersion)) throw new Error("invalid_combat_frame");
    const old = this.players.get(snapshot.id);
    if (old && (snapshot.scopeVersion < old.scopeVersion || (snapshot.scopeVersion === old.scopeVersion && snapshot.revision < old.revision))) return false;
    if (old && snapshot.scopeVersion === old.scopeVersion && snapshot.revision === old.revision && snapshot.hp !== old.hp) throw new Error("conflicting_combat_checkpoint");
    if (!old && this.players.size >= 64) throw new Error("combat_capacity");
    this.players.set(snapshot.id, { ...snapshot });
    return true;
  }

  // Synchronous decision: no fetch, SQL, promises or client clock in this path.
  // Persistent exactly-once death settlement is deliberately outside this kernel.
  attack(command) {
    if (typeof command?.intentId !== "string" || !command.intentId || command.intentId.length > 120) throw new Error("invalid_combat_frame");
    const key = `${command.attackerId}:${command.intentId}`;
    const old = this.results.get(key);
    if (old) {
      if (old.targetId !== command.targetId || old.ability !== command.ability) throw new Error("conflicting_combat_intent");
      return old;
    }
    // Never evict a receipt silently and permit a replay to damage twice.
    if (this.results.size >= 2048) throw new Error("combat_capacity");
    const attacker = this.players.get(command.attackerId);
    const target = this.players.get(command.targetId);
    if (!attacker || !target || attacker === target || attacker.hp <= 0 || target.hp <= 0) throw new Error("invalid_combat_target");
    if (attacker.scopeVersion !== command.attackerScopeVersion || target.scopeVersion !== command.targetScopeVersion) throw new Error("stale_combat_scope");
    if (target.revision !== command.targetRevision) throw new Error("stale_combat_revision");
    number(command.ability, 0, 3);
    if (!Number.isInteger(command.ability)) throw new Error("invalid_combat_frame");
    const resolved = resolveDamage(command.rules, command.rolls);
    const hp = Math.max(0, target.hp - resolved.damage);
    const revision = target.revision + 1;
    const result = Object.freeze({ ...resolved, attackerId: command.attackerId, targetId: command.targetId,
      ability: command.ability, intentId: command.intentId, hp, hpRevision: revision, killed: hp === 0,
      deathId: hp === 0 ? `${this.scope}:${target.id}:${target.scopeVersion}:${revision}` : null });
    target.hp = hp;
    target.revision = revision;
    this.results.set(key, result);
    return result;
  }
}

// Bounded, anonymous verification metrics; this cannot publish or mutate live HP.
export class CombatShadow {
  constructor() {
    this.seen = new Map();
    this.counters = { compared: 0, matched: 0, mismatched: 0, invalid: 0, duplicates: 0, totalDecisionUs: 0, maxDecisionUs: 0 };
  }
  observe(scope, frame, event) {
    const start = performance.now();
    try {
      if (event?.type !== "pvp_result" || frame?.v !== 1 || frame.intentId !== event.intentId || frame.attacker.id !== event.attackerId || frame.target.id !== event.targetId) throw new Error("invalid_combat_frame");
      const key = `${scope}:${event.attackerId}:${event.intentId}`;
      if (this.seen.has(key)) { this.counters.duplicates++; return; }
      // Reconstruct the exact pre-commit checkpoint for parity, not a fictional
      // live ownership lease. Signed deliveries may arrive in reverse order.
      const engine = new MemoryCombat(scope);
      engine.checkpoint({ ...frame.attacker, scope });
      engine.checkpoint({ ...frame.target, scope });
      const result = engine.attack({ ...frame, attackerId: event.attackerId, targetId: event.targetId,
        ability: event.ability, attackerScopeVersion: frame.attacker.scopeVersion,
        targetScopeVersion: frame.target.scopeVersion, targetRevision: frame.target.revision });
      const matched = result.damage === event.damage && result.critical === event.critical && result.hp === event.hp && result.hpRevision === event.hpRevision && result.killed === event.killed;
      this.counters.compared++;
      this.counters[matched ? "matched" : "mismatched"]++;
      const elapsed = Math.round((performance.now() - start) * 1000);
      this.counters.totalDecisionUs += elapsed;
      this.counters.maxDecisionUs = Math.max(this.counters.maxDecisionUs, elapsed);
      this.seen.set(key, true);
      if (this.seen.size > 4096) this.seen.delete(this.seen.keys().next().value);
    } catch { this.counters.invalid++; }
  }
  status() {
    return { protocol: COMBAT_PROTOCOL, mode: "shadow", authoritative: false, ...this.counters };
  }
}
