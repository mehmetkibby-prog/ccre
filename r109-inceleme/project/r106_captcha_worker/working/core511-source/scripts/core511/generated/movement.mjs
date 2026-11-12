import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
// Generated from pinned V510. Only async/storage operations were replaced.
export function createMovementRule(rules, recordSecurityEvent=()=>{}) {
const {validArea,movementPathDistance,isAreaWalkableSegment,evaluateMovementBudget}=rules;
const readAuthoritativeMovement=(database,playerId,accountId,now)=>database.read(playerId,accountId,now);
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
		const checkpoint = database.checkpoint(session, row, payload, nowMs, targetX, targetY, movement);
		const native = database;
		const moved = checkpoint;
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
return applyAuthoritativeMove;
}
