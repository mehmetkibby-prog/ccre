import type { GameSession } from "@/lib/game-auth";

type SecurityEvidence = Record<string, string | number | boolean | null | undefined>;

type SecurityEvent = {
  code: string;
  surface: "action" | "chat" | "realtime" | "economy" | "auth";
  actionName?: string;
  confidence: number;
  scoreDelta: number;
  evidence?: SecurityEvidence;
};

type Window = { startedAtMs: number; count: number };
const localWindows = new Map<string, Window>();
let nextLocalCleanupAtMs = 0;

/**
 * Fast abuse shedder. Canonical gameplay checks still live in D1; this map only
 * prevents one isolate from spending unlimited CPU/D1 work on an obvious flood.
 */
export function enforceLocalActionRate(accountId: string, action: string) {
  const nowMs = Date.now();
  const category = action === "move" ? "move"
    : action === "heartbeat" ? "heartbeat"
    : action === "attack" || action === "pvp_attack" || action === "hurt" ? "combat"
    : action === "collect" ? "loot"
    : action === "claim_rewards" ? "rewards"
    : action === "fishing_input" ? "fishing"
    : /listing|shop|fish|buy_|sell_|exchange|upgrade|epin/.test(action) ? "economy"
    : "other";
  const limits: Record<string, { intervalMs: number; limit: number }> = {
    // Aktif savaşta hareket, vuruş, ödül talebi ve oyuncuya özel ganimet
    // teslimi birlikte çalışır. Kategoriler ayrı sınırda kalırken global tavan
    // normal hızlı oyunu engellemeden bariz HTTP selini hâlâ izole eder.
    global: { intervalMs: 60_000, limit: 720 },
    move: { intervalMs: 60_000, limit: 360 },
    heartbeat: { intervalMs: 60_000, limit: 30 },
    combat: { intervalMs: 60_000, limit: 240 },
    loot: { intervalMs: 60_000, limit: 360 },
    rewards: { intervalMs: 60_000, limit: 180 },
    fishing: { intervalMs: 60_000, limit: 480 },
    economy: { intervalMs: 60_000, limit: 45 },
    other: { intervalMs: 60_000, limit: 120 },
  };
  for (const scope of ["global", category]) {
    const limit = limits[scope];
    const key = `${accountId}:${scope}`;
    const previous = localWindows.get(key);
    const next = !previous || nowMs - previous.startedAtMs >= limit.intervalMs
      ? { startedAtMs: nowMs, count: 1 }
      : { startedAtMs: previous.startedAtMs, count: previous.count + 1 };
    localWindows.set(key, next);
    if (next.count > limit.limit) return Math.max(1, Math.ceil((next.startedAtMs + limit.intervalMs - nowMs) / 1_000));
  }
  if (nowMs >= nextLocalCleanupAtMs) {
    nextLocalCleanupAtMs = nowMs + 60_000;
    for (const [key, window] of localWindows) if (nowMs - window.startedAtMs > 120_000) localWindows.delete(key);
  }
  return 0;
}

// Legacy call sites remain compatible; rejection enforcement is independent.
// Test-only recording is retired: no queue, timer, database writes or penalties.
export async function recordSecurityEvent(_request: Request, _session: GameSession, _event: SecurityEvent) {}
