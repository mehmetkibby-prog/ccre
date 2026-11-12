import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
// Generated exact V510 wrapper and SQL writer. No movement formula changes.
import {createMovementRule} from './movement.mjs';
export function createMovementActionMemory(rules,ports){
const {settlePveEngagement,getGameSettings,publishRealtimeRoomEvent,deliverRealtime,recordSecurityEvent}=ports;
const applyAuthoritativeMove=createMovementRule(rules,recordSecurityEvent),readAuthoritativeMovement=(database,...args)=>database.read(...args);
 function executeMovementAction(request, auth, database, payload, requestReceivedAtMs, scope) {
	const playerId = auth.player.id;
	const movementState = readAuthoritativeMovement(database, playerId, auth.account.id, requestReceivedAtMs);
	const pendingRetaliation = movementState?.pve_hit_due ? settlePveEngagement(database, playerId, getGameSettings(), requestReceivedAtMs) : null;
	if (pendingRetaliation?.dead) return {
		status: 409,
		data: {
			error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.",
            code: "movement_retaliation_dead",
			pveHit: pendingRetaliation.pveHit,
			hp: pendingRetaliation.hp,
			maxHp: pendingRetaliation.max_hp,
			hpRevision: pendingRetaliation.hp_revision,
			respawnAtMs: pendingRetaliation.respawn_at_ms
		}
	};
	const moved = applyAuthoritativeMove(request, auth, database, payload, requestReceivedAtMs, movementState, scope);
	if (!moved.ok) return {
		status: moved.status,
		data: {
			error: moved.message,
			code: moved.code,
			untilMs: moved.untilMs,
			...moved.x === void 0 ? {} : {
				x: moved.x,
				y: moved.y,
				area: moved.area,
				positionRevision: moved.positionRevision
			}
		}
	};
	deliverRealtime(publishRealtimeRoomEvent(moved.worldCycle, moved.channel, moved.area, {
		type: "move",
		eventId: `move:${playerId}:${moved.positionRevision}`,
		cycle: moved.worldCycle,
		channel: moved.channel,
		area: moved.area,
		arenaMatchId: moved.arenaMatchId,
		playerId,
		x: moved.x,
		y: moved.y,
		sequence: moved.positionRevision,
		authoritative: true,
		...typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId) && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1 ? {
			motionStreamId: payload.motionStreamId,
			motionSequence: payload.motionSequence
		} : {},
		serverAt: requestReceivedAtMs
	}, moved.arenaMatchId || void 0));
	return {
		status: 200,
		data: {
			ok: true,
			pveHit: pendingRetaliation?.pveHit,
			x: moved.x,
			y: moved.y,
			area: moved.area,
			positionRevision: moved.positionRevision
		}
	};
}
return executeMovementAction;
}
export function createMovementActionWriter(rules,ports){
const {settlePveEngagement,getGameSettings,publishRealtimeRoomEvent,deliverRealtime,recordSecurityEvent}=ports;
const {validArea,movementPathDistance,isAreaWalkableSegment,evaluateMovementBudget}=rules;
 function readAuthoritativeMovement(database, playerId, accountId, nowMs) {
	return database.prepare(`SELECT id, role, x, y, hp, hp_revision, area, channel, arena_match_id,
       COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle,
       movement_checked_at_ms, movement_debt_ms, position_revision, root_until_ms, realtime_scope_version,
       EXISTS (SELECT 1 FROM pve_engagements engagement
         WHERE engagement.player_id = players.id AND engagement.next_hit_at_ms <= ?) AS pve_hit_due
     FROM players WHERE id = ? AND account_id = ? LIMIT 1`).bind(nowMs, playerId, accountId).first();
}
 function applyAuthoritativeMove(request, session, database, payload, nowMs = Date.now(), initialRow, scope) {
	const playerId = session.player?.id ?? "";
	const targetX = Number(payload.x);
	const targetY = Number(payload.y);
	if (!playerId || !Number.isFinite(targetX) || !Number.isFinite(targetY) || payload.area !== void 0 && !validArea(payload.area)) return {
		ok: false,
		status: 400,
		code: "invalid_movement",
		message: "Hareket verisi geçersiz."
	};
	for (let attempt = 0; attempt < 2; attempt += 1) {
		const row = attempt === 0 && initialRow?.id === playerId ? initialRow : readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
		if (!row) return {
			ok: false,
			status: 409,
			code: "movement_state_missing",
			message: "Hareket durumu bulunamadı."
		};
		const authoritative = {
			x: row.x,
			y: row.y,
			area: row.area,
			positionRevision: row.position_revision
		};
		if (scope && (scope.scopeVersion !== row.realtime_scope_version || scope.cycle !== row.world_cycle || scope.channel !== row.channel || scope.area !== row.area || scope.arenaMatchId !== row.arena_match_id)) return {
			ok: false,
			status: 409,
			code: "realtime_scope_changed",
			message: "Harita bağlantısını yenile.",
			...authoritative
		};
		if (row.hp <= 0 || payload.area !== void 0 && payload.area !== row.area) return {
			ok: false,
			status: 409,
			code: "movement_state_changed",
			message: "Konumun sunucuyla eşitleniyor.",
			...authoritative
		};
		if (row.root_until_ms > nowMs) return {
			ok: false,
			status: 409,
			code: "movement_rooted",
			message: "Kısa süreliğine sabitlendin.",
			untilMs: row.root_until_ms,
			...authoritative
		};
		if (payload.basePositionRevision !== void 0 && (!Number.isSafeInteger(payload.basePositionRevision) || payload.basePositionRevision !== row.position_revision)) return {
			ok: false,
			status: 409,
			code: "movement_checkpoint_stale",
			message: "Hareket kontrol noktası yenileniyor.",
			...authoritative
		};
		const distance = movementPathDistance(row, {
			x: targetX,
			y: targetY
		}, payload.path, (fromX, fromY, toX, toY) => isAreaWalkableSegment(row.area, fromX, fromY, toX, toY));
		if (distance === null) {
			recordSecurityEvent(request, session, {
				code: "invalid_path",
				surface: "action",
				actionName: "move",
				confidence: 75,
				scoreDelta: 8,
				evidence: {
					distance: Math.hypot(targetX - row.x, targetY - row.y),
					area: row.area
				}
			});
			return {
				ok: false,
				status: 409,
				code: "movement_path_rejected",
				message: "Bu yönde ilerleyemezsin.",
				...authoritative
			};
		}
		const movement = evaluateMovementBudget(row.role, distance, nowMs, row.movement_checked_at_ms, row.movement_debt_ms);
		if (!movement.allowed) {
			recordSecurityEvent(request, session, {
				code: movement.severe ? "teleport_attempt" : "speed_violation",
				surface: "action",
				actionName: "move",
				confidence: movement.severe ? 98 : 78,
				scoreDelta: movement.severe ? 35 : 10,
				evidence: {
					distance,
					elapsedMs: movement.elapsedMs,
					debtMs: movement.nextDebtMs,
					speed: movement.speed,
					area: row.area
				}
			});
			return {
				ok: false,
				status: 409,
				code: "movement_speed_rejected",
				message: "Hareket hızın sunucuyla eşitleniyor.",
				...authoritative
			};
		}
		const validMotion = typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId) && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1;
		const checkpoint = database.prepare(`UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = ?,
         position_revision = position_revision + 1, motion_stream_id = ?, motion_sequence = ?, last_seen = ?
       WHERE id = ? AND account_id = ? AND hp > 0 AND area = ?
         AND position_revision = ? AND movement_checked_at_ms = ? AND movement_debt_ms = ?
         AND realtime_scope_version = ? AND channel = ? AND arena_match_id = ?
         AND COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) = ?
         AND x = ? AND y = ? AND root_until_ms <= ?
         AND COALESCE((SELECT reset_at FROM world_state WHERE id = 1), 0) <= ?
         AND NOT EXISTS (SELECT 1 FROM fishing_sessions WHERE player_id = players.id AND expires_at_ms >= ?)
       RETURNING x, y, position_revision`).bind(targetX, targetY, nowMs, movement.nextDebtMs, validMotion ? payload.motionStreamId : "", validMotion ? payload.motionSequence : 0, Math.floor(nowMs / 1e3), playerId, session.account.id, row.area, row.position_revision, row.movement_checked_at_ms, row.movement_debt_ms, row.realtime_scope_version, row.channel, row.arena_match_id, row.world_cycle, row.x, row.y, nowMs, Math.floor(nowMs / 1e3), nowMs);
		const native = database;
		const moved = native.positionCheckpoint ? native.positionCheckpoint(checkpoint) : checkpoint.first();
		if (moved) return {
			ok: true,
			x: moved.x,
			y: moved.y,
			area: row.area,
			channel: row.channel,
			arenaMatchId: row.arena_match_id,
			worldCycle: row.world_cycle,
			positionRevision: moved.position_revision
		};
	}
	const current = readAuthoritativeMovement(database, playerId, session.account.id, nowMs);
	return {
		ok: false,
		status: 409,
		code: "movement_conflict",
		message: "Konumun sunucuyla eşitleniyor.",
		...current ? {
			x: current.x,
			y: current.y,
			area: current.area,
			positionRevision: current.position_revision
		} : {}
	};
}
 function executeMovementAction(request, auth, database, payload, requestReceivedAtMs, scope) {
	const playerId = auth.player.id;
	const movementState = readAuthoritativeMovement(database, playerId, auth.account.id, requestReceivedAtMs);
	const pendingRetaliation = movementState?.pve_hit_due ? settlePveEngagement(database, playerId, getGameSettings(), requestReceivedAtMs) : null;
	if (pendingRetaliation?.dead) return {
		status: 409,
		data: {
			error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun.",
            code: "movement_retaliation_dead",
			pveHit: pendingRetaliation.pveHit,
			hp: pendingRetaliation.hp,
			maxHp: pendingRetaliation.max_hp,
			hpRevision: pendingRetaliation.hp_revision,
			respawnAtMs: pendingRetaliation.respawn_at_ms
		}
	};
	const moved = applyAuthoritativeMove(request, auth, database, payload, requestReceivedAtMs, movementState, scope);
	if (!moved.ok) return {
		status: moved.status,
		data: {
			error: moved.message,
			code: moved.code,
			untilMs: moved.untilMs,
			...moved.x === void 0 ? {} : {
				x: moved.x,
				y: moved.y,
				area: moved.area,
				positionRevision: moved.positionRevision
			}
		}
	};
	deliverRealtime(publishRealtimeRoomEvent(moved.worldCycle, moved.channel, moved.area, {
		type: "move",
		eventId: `move:${playerId}:${moved.positionRevision}`,
		cycle: moved.worldCycle,
		channel: moved.channel,
		area: moved.area,
		arenaMatchId: moved.arenaMatchId,
		playerId,
		x: moved.x,
		y: moved.y,
		sequence: moved.positionRevision,
		authoritative: true,
		...typeof payload.motionStreamId === "string" && /^[A-Za-z0-9-]{16,80}$/.test(payload.motionStreamId) && Number.isSafeInteger(payload.motionSequence) && Number(payload.motionSequence) >= 1 ? {
			motionStreamId: payload.motionStreamId,
			motionSequence: payload.motionSequence
		} : {},
		serverAt: requestReceivedAtMs
	}, moved.arenaMatchId || void 0));
	return {
		status: 200,
		data: {
			ok: true,
			pveHit: pendingRetaliation?.pveHit,
			x: moved.x,
			y: moved.y,
			area: moved.area,
			positionRevision: moved.positionRevision
		}
	};
}
return {executeMovementAction,readAuthoritativeMovement};
}
