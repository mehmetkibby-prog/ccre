import { recordSecurityEvent } from "@/lib/anti-cheat";
import type { GameSession } from "@/lib/game-auth";
import type { db as createGameDatabase } from "@/lib/game-world";
import { evaluateMovementBudget } from "@/lib/movement-policy";
import { movementPathDistance } from "@/lib/movement-path";
import { isAreaWalkableSegment } from "@/lib/world-layout";

type GameDatabase = ReturnType<typeof createGameDatabase>;

type MovementRow = {
  id: string;
  role: string;
  x: number;
  y: number;
  hp: number;
  hp_revision: number;
  area: string;
  channel: number;
  arena_match_id: string;
  world_cycle: number;
  realtime_scope_version: number;
  movement_checked_at_ms: number;
  movement_debt_ms: number;
  position_revision: number;
  pve_hit_due: number;
  root_until_ms: number;
};

export type MovementScope = {scopeVersion: number; cycle: number; channel: number; area: string; arenaMatchId: string};

export type MovementResult =
  | { ok: true; x: number; y: number; area: string; channel: number; arenaMatchId: string; worldCycle: number; positionRevision: number }
  | { ok: false; status: 400 | 409; code: string; message: string; x?: number; y?: number; area?: string; positionRevision?: number; untilMs?: number };

function validArea(area: unknown): area is string {
  return typeof area === "string" && /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area);
}

export async function readAuthoritativeMovement(database: GameDatabase, playerId: string, accountId: string, nowMs: number) {
  return database.prepare(
    `SELECT id, role, x, y, hp, hp_revision, area, channel, arena_match_id,
       COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
       movement_checked_at_ms, movement_debt_ms, position_revision, root_until_ms, realtime_scope_version,
       EXISTS (SELECT 1 FROM pve_engagements engagement
         WHERE engagement.player_id = players.id AND engagement.next_hit_at_ms <= ?) AS pve_hit_due
     FROM players WHERE id = ? AND account_id = ? LIMIT 1`,
  ).bind(nowMs, playerId, accountId).first<MovementRow>();
}

export async function applyAuthoritativeMove(
  request: Request,
  session: GameSession,
  database: GameDatabase,
  payload: { x?: unknown; y?: unknown; area?: unknown; path?: unknown; basePositionRevision?: unknown; motionStreamId?: unknown; motionSequence?: unknown },
  nowMs = Date.now(),
  initialRow?: MovementRow | null,
  scope?: MovementScope,
): Promise<MovementResult> {
  const playerId = session.player?.id ?? "";
  const targetX = Number(payload.x);
  const targetY = Number(payload.y);
  if (!playerId || !Number.isFinite(targetX) || !Number.isFinite(targetY) || (payload.area !== undefined && !validArea(payload.area))) {
    return { ok: false, status: 400, code: "invalid_movement", message: "Hareket verisi geçersiz." };
  }
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const row = attempt === 0 && initialRow?.id === playerId
      ? initialRow : await readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
    if (!row) return { ok: false, status: 409, code: "movement_state_missing", message: "Hareket durumu bulunamadı." };
    const authoritative = { x: row.x, y: row.y, area: row.area, positionRevision: row.position_revision };
    // Can sürümü hareket yetkisi değildir. Bu istekten hemen önce sunucuya ait
    // bir PvE vuruşu hp_revision değerini artırabilir; oyuncu hâlâ hayattaysa
    // bu durum normal hareketi eski konuma geri savurmamalıdır. Güncel can,
    // alan ve konum CAS'ı aşağıdaki sunucu satırından doğrulanmaya devam eder.
    if (scope && (scope.scopeVersion !== row.realtime_scope_version || scope.cycle !== row.world_cycle
      || scope.channel !== row.channel || scope.area !== row.area || scope.arenaMatchId !== row.arena_match_id)) {
      return {ok:false,status:409,code: "realtime_scope_changed",message:'Harita bağlantısını yenile.',...authoritative};
    }
    if (row.hp <= 0 || (payload.area !== undefined && payload.area !== row.area)) {
      return { ok: false, status: 409, code: "movement_state_changed", message: "Konumun sunucuyla eşitleniyor.", ...authoritative };
    }
    if (row.root_until_ms > nowMs) return {ok:false,status:409,code:"movement_rooted",message:"Kısa süreliğine sabitlendin.",untilMs:row.root_until_ms,...authoritative};
    if (payload.basePositionRevision !== undefined && (!Number.isSafeInteger(payload.basePositionRevision)
      || payload.basePositionRevision !== row.position_revision)) {
      return { ok: false, status: 409, code: "movement_checkpoint_stale", message: "Hareket kontrol noktası yenileniyor.", ...authoritative };
    }
    const distance = movementPathDistance(row, { x: targetX, y: targetY }, payload.path,
      (fromX, fromY, toX, toY) => isAreaWalkableSegment(row.area, fromX, fromY, toX, toY));
    if (distance === null) {
      await recordSecurityEvent(request, session, {
        code: "invalid_path", surface: "action", actionName: "move", confidence: 75, scoreDelta: 8,
        evidence: { distance: Math.hypot(targetX - row.x, targetY - row.y), area: row.area },
      });
      return { ok: false, status: 409, code: "movement_path_rejected", message: "Bu yönde ilerleyemezsin.", ...authoritative };
    }

    const movement = evaluateMovementBudget(
      row.role,
      distance,
      nowMs,
      row.movement_checked_at_ms,
      row.movement_debt_ms,
    );
    if (!movement.allowed) {
      await recordSecurityEvent(request, session, {
        code: movement.severe ? "teleport_attempt" : "speed_violation",
        surface: "action",
        actionName: "move",
        confidence: movement.severe ? 98 : 78,
        scoreDelta: movement.severe ? 35 : 10,
        evidence: { distance, elapsedMs: movement.elapsedMs, debtMs: movement.nextDebtMs, speed: movement.speed, area: row.area },
      });
      return { ok: false, status: 409, code: "movement_speed_rejected", message: "Hareket hızın sunucuyla eşitleniyor.", ...authoritative };
    }

    const validMotion = typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId)
      && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1;
    const checkpoint = database.prepare(
      `UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = ?,
         position_revision = position_revision + 1, motion_stream_id = ?, motion_sequence = ?, last_seen = ?
       WHERE id = ? AND account_id = ? AND hp > 0 AND area = ?
         AND position_revision = ? AND movement_checked_at_ms = ? AND movement_debt_ms = ?
         AND realtime_scope_version = ? AND channel = ? AND arena_match_id = ?
         AND COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) = ?
         AND x = ? AND y = ? AND root_until_ms <= ?
         AND COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) <= ?
         AND NOT EXISTS (SELECT 1 FROM fishing_sessions WHERE player_id = players.id AND expires_at_ms >= ?)
       RETURNING x, y, position_revision`,
    ).bind(
      targetX, targetY, nowMs, movement.nextDebtMs, validMotion ? payload.motionStreamId : "", validMotion ? payload.motionSequence : 0, Math.floor(nowMs / 1_000),
      playerId, session.account.id, row.area, row.position_revision, row.movement_checked_at_ms,
      row.movement_debt_ms, row.realtime_scope_version, row.channel, row.arena_match_id, row.world_cycle, row.x, row.y, nowMs, Math.floor(nowMs / 1_000), nowMs,
    );
    const native = database as typeof database & { positionCheckpoint?: (statement: typeof checkpoint) => Promise<{x:number;y:number;position_revision:number}|null> };
    const moved = native.positionCheckpoint ? await native.positionCheckpoint(checkpoint) : await checkpoint.first<{x:number;y:number;position_revision:number}>();
    if (moved) return {
      ok: true,
      x: moved.x,
      y: moved.y,
      area: row.area,
      channel: row.channel,
      arenaMatchId: row.arena_match_id,
      worldCycle: row.world_cycle,
      positionRevision: moved.position_revision,
    };
  }

  const current = await readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
  return {
    ok: false,
    status: 409,
    code: "movement_conflict",
    message: "Konumun sunucuyla eşitleniyor.",
    ...(current ? { x: current.x, y: current.y, area: current.area, positionRevision: current.position_revision } : {}),
  };
}
