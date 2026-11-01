import {perfR13Features} from '../../vds-server/src/perf-r13-features.mjs';
import {perfR11Features} from '../../vds-server/src/perf-r11-features.mjs';
import {createRealtimeMotionCork} from './motion-cork-r11.mjs';
const motionCorkR11=createRealtimeMotionCork({enabled:perfR11Features.enabled('realtimeMotionCork')});
import {colLabValidateRoomAudience} from '../../vds-server/src/loadlab-gameplay.mjs';
import {runeWalkable} from './rune-map.mjs';
import {guildArea,guildWalkable} from './guild-village-layout.mjs';
import { eventForViewer } from "./visibility.mjs";
import { admitRealtimeMessage } from "./message-budget.mjs";
import { acceptMotion, MOTION_PROTOCOL, presentationPosition, reconcileMotionCheckpoint } from "./motion.mjs";
import {insideAncientCore} from "./ancient-core.mjs";

const BLACK_BOUNDS = { minX: 55, maxX: 5_345, minY: 80, maxY: 3_320 };
const WAR_BOUNDS = { minX:55,maxX:3545,minY:80,maxY:2195 };
const COMMON_BOUNDS = { minX: 55, maxX: 2_345, minY: 80, maxY: 1_445 };
// Görsel taşıma hattı da yetkili HTTP/Worker geometrisiyle aynı sınırı kullanır;
// aksi hâlde kalıcı olmasa bile harita dışı sahte konumlar diğer oyunculara yayılır.
const FOREST_BOUNDS = { minX: 45, maxX: 5_355, minY: 65, maxY: 3_330 };
const FROZEN_BOUNDS = { minX: 55, maxX: 4_745, minY: 80, maxY: 2_945 };
const AFK_BOUNDS = { minX: 55, maxX: 5_345, minY: 80, maxY: 3_545 };
const ARENA_BOUNDS = { minX: 280, maxX: 2_120, minY: 250, maxY: 1_250 };
const MAX_EVENT_BYTES = 24_000;
const guildAccessFloors=new Map();
const rooms = new Map();
const traffic={bytesSent:0,framesSent:0};
const socketsByPlayer = new Map();
const revokedSecurityVersions = new Map();
// Only GM visibility revisions are retained, including across socket handoffs.
// The floor outlives every unused 30-second ticket; active sockets retain it.
const visibilityStates = new Map();
function rememberVisibility(playerId, invisible, revision, maintenanceGm492=false) {
  const current = visibilityStates.get(playerId);
  if (current && revision <= current.revision) return current;
  const state = { invisible: invisible === true, maintenanceGm492:maintenanceGm492===true, revision, expiresAt: Date.now() + 120_000 };
  if (revision > 0 || invisible) visibilityStates.set(playerId, state);
  return state;
}
function hiddenPlayer(id) {
  return visibilityStates.get(id)?.invisible === true || socketsByPlayer.get(id)?.player?.gmInvisible === true;
}
function visibilityEvent(playerId, state) {
  return { type: "gm_visibility", playerId, invisible: state.invisible, visibilityRevision: state.revision, serverAt: Date.now() };
}
export function resolveMaintenanceIdentity492(player) {applyTicketVisibility(player);return player;}
function applyTicketVisibility(player) {
  const state = rememberVisibility(player.playerId, player.gmInvisible === true, player.visibilityRevision || 0, player.maintenanceGm492);
  player.maintenanceGm492 = state.maintenanceGm492===true;
  player.gmInvisible = state.invisible;
  player.visibilityRevision = state.revision;
  return state;
}
// A socket is authenticated once at connection time. Game mutations never rely
// on this presentation channel: the VDS game API checks the normal session and
// game-presence lease on every authoritative request. Keeping the socket alive
// avoids periodic client-side handoffs that caused visible reconnects mid-walk.
export const SESSION_PROTOCOL = "persistent-socket-v1";

function supersedes(current, candidate) {
  return candidate.securityVersion > current.securityVersion
    || (candidate.securityVersion === current.securityVersion
      && (candidate.scopeVersion > current.scopeVersion
        || (candidate.scopeVersion === current.scopeVersion && (candidate.issuedAtMs ?? 0) >= (current.issuedAtMs ?? 0))));
}

function finiteCoordinate(value, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max ? numeric : null;
}

function safeArea(value) {
  return typeof value === "string" && /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(value) ? value : null;
}

function worldBounds(area) {
 if(area==='event')return {minX:650,maxX:2950,minY:480,maxY:1700};
 if(area==='rune'||area==='rune_v2')return {minX:55,maxX:4265,minY:80,maxY:2825};
  if(/^guild_village_/.test(area))return {minX:55,maxX:3545,minY:80,maxY:2345};
  if(/^guild_hall_/.test(area))return {minX:55,maxX:2345,minY:80,maxY:1545};
  return area === "afk" ? AFK_BOUNDS : area === "ancient" ? {minX:55,maxX:3545,minY:80,maxY:3545} : area === "war" ? WAR_BOUNDS : area === "black" ? BLACK_BOUNDS : area === "forest" ? FOREST_BOUNDS : area === "frozen" ? FROZEN_BOUNDS : COMMON_BOUNDS;
}

function isAreaWalkablePosition(area, x, y) {
 if(area==='rune'||area==='rune_v2')return runeWalkable(x,y);
  if(guildArea(area))return guildWalkable(area,x,y);
  const bounds = worldBounds(area);
  if (!Number.isFinite(x) || !Number.isFinite(y) || x < bounds.minX || x > bounds.maxX || y < bounds.minY || y > bounds.maxY) return false;
  if (area === "ancient" && insideAncientCore(x,y)) return false;
  if (area === "frozen" && ((x - 4170) / 780) ** 2 + ((y - 495) / 555) ** 2 <= 1) return false;
  if (area === "fishing" && ((x - 1200) / 735) ** 2 + ((y - 745) / 445) ** 2 < 1.02) return false;
  if (area === "arena" && (x < ARENA_BOUNDS.minX || x > ARENA_BOUNDS.maxX || y < ARENA_BOUNDS.minY || y > ARENA_BOUNDS.maxY)) return false;
  return true;
}

function roomKey({ cycle, channel, area, arenaMatchId }) {
  const arenaScope = area === "arena" && typeof arenaMatchId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(arenaMatchId)
    ? `:match:${arenaMatchId}` : area === "arena" ? ":match:invalid" : "";
  return `cycle:${Math.max(1, Math.floor(Number(cycle) || 1))}:channel:${Math.max(1, Math.floor(Number(channel) || 1))}:area:${area}${arenaScope}`;
}

function getRoom(identity) {
  const key = roomKey(identity);
  let room = rooms.get(key);
  if (!room) {
    room = { key, clients: new Set(), players: new Map(), seenIntents: new Map(), arenaFinished: false };
    rooms.set(key, room);
  }
  return room;
}

function send(socket, payload, essential = true) {
  motionCorkR11.prepare(socket,essential);
  if(socket.player?.area?.startsWith('guild_hall_')&&socket.player.leaseExpiresAt<=Date.now()){socket.close(4003,'Guild access lease expired');return false;}
  if (socket.readyState !== 1) return false;
  if (socket.bufferedAmount > 1_048_576) {
    socket.close(1013, "Client too slow");
    return false;
  }
  // Superseded movement must not accumulate behind a slow connection.
  if (!essential && socket.bufferedAmount > 8_192) return false;
  const encoded = Buffer.isBuffer(payload) ? payload
    : Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (encoded.length > MAX_EVENT_BYTES) return false;
  // Shared UTF-8 buffers must retain the existing JSON text-frame protocol.
  motionCorkR11.send(socket,encoded,essential);
  traffic.bytesSent+=encoded.length;traffic.framesSent++;
  return true;
}

function publicPlayer(player) {
  return {
    playerId: player.playerId,
    visibilityRevision: player.visibilityRevision || 0,
    name: player.name,
    role: player.role,
    x: player.x,
    y: player.y,
    hp: player.hp,
    maxHp: player.maxHp,
    hpRevision: player.hpRevision,
    respawnAtMs: player.respawnAtMs,
    cycle: player.cycle,
    channel: player.channel,
    area: player.area,
    arenaMatchId: player.arenaMatchId || "",
    arenaTeam: player.arenaTeam || 0,
  };
}

function broadcast(room, payload, except, essential = true, labAudience = null) {
  // Encode ordinary room fanout once; viewer-specific projections still pass
  // through send separately. Server text frames do not mutate this buffer.
  const encoded = Buffer.from(JSON.stringify(payload));
  if (encoded.length > MAX_EVENT_BYTES) return;
  const project = hiddenPlayer(payload.playerId) || hiddenPlayer(payload.targetId) || hiddenPlayer(payload.attackerId) || hiddenPlayer(payload.actorId);
  for (const client of room.clients) {
    if (client === except || labAudience && !labAudience.has(client.player?.playerId)) continue;
    const visibleEvent = project ? eventForViewer(payload, hiddenPlayer, client.player?.playerId) : payload;
    if (visibleEvent) send(client, visibleEvent === payload ? encoded : visibleEvent, essential);
  }
}

function flushPendingMotion(socket) {
  const pending = socket.pendingMotionPreview;
  socket.pendingMotionPreview = null;
  if (!pending) return;
  const { room, event } = pending;
  const player = socket.player;
  if (socket.readyState !== 1 || socket.room !== room || !player || player.hp <= 0
    || socketsByPlayer.get(player.playerId) !== socket || !room.clients.has(socket)
    || player.connectionId !== event.streamId || event.hpRevision < (player.motionHpFloor ?? 0)
    || player.motion?.sequence !== event.sequence || player.motion.x !== event.x || player.motion.y !== event.y) return;
  // Visibility is checked at delivery, including a GM toggle during this turn.
  broadcast(room, event, socket, false);
}

function deliverMotion(room, socket, event) {
  if (socket.motionFlush) {
    // Keep only the newest already-validated preview in a received batch.
    socket.pendingMotionPreview = { room, event };
    return;
  }
  // Normal 30 Hz traffic retains its immediate first-frame delivery. Batched
  // old previews cannot fan out hundreds of obsolete frames ahead of pongs.
  broadcast(room, event, socket, false);
  socket.motionFlush = setImmediate(() => {
    socket.motionFlush = null;
    flushPendingMotion(socket);
  });
}

function cleanupRoom(room) {
  if (!room.clients.size) rooms.delete(room.key);
}

export function authenticateSocket(socket, player) {
  const guildFloor=guildAccessFloors.get(player.playerId);
  if(player.area?.startsWith('guild_hall_')&&(player.leaseExpiresAt<=Date.now()||(guildFloor?.until>Date.now()&&player.hpRevision<guildFloor.revision))){socket.close(4003,'Guild access changed');return;}

  const now = Date.now();
  const revocation = revokedSecurityVersions.get(player.playerId);
  if (revocation?.expiresAtMs <= now) revokedSecurityVersions.delete(player.playerId);
  else if (revocation && player.securityVersion < revocation.minimumVersion) {
    socket.close(4003, "Session revoked");
    return false;
  }
  const previous = socketsByPlayer.get(player.playerId);
  if (previous && previous !== socket) {
    // An old map's delayed authentication must never evict its newer map.
    if (!supersedes(previous.player, player)) {
      socket.close(4003, "Stale connection ticket");
      return false;
    }
    disconnectSocket(previous);
    previous.close(4009, "Replaced by a newer connection");
  }
  const visibility = applyTicketVisibility(player);
  const room = getRoom(player);
  socket.player = player;
  socket.room = room;
  socket.isAlive = true;
  room.clients.add(socket);
  room.players.set(player.playerId, player);
  socketsByPlayer.set(player.playerId, socket);
  send(socket, {
    type: "welcome",
    transport: "dedicated-v1",
    playerId: player.playerId,
    worldPushProtocol: 'world-delta-v1',
    motionProtocol: MOTION_PROTOCOL,
    motionStreamId: player.connectionId,
    ...(player.combatGrant ? {combatProtocol:'authoritative-combat-v1',...(perfR13Features.enabled('asyncCombatPending')?{deferredRewardProtocol:'durable-combat-two-phase-r13'}:{}),combatActions:['attack','pvp_attack','guardian_dash'],combatReady:Boolean(socket.combatRelay?.availableFor?.(player.channel)??socket.combatRelay?.available)} : {}),
    ...(player.movementGrant ? {movementProtocol:'durable-movement-v1',movementReady:Boolean(socket.movementRelay?.availableFor?.(player.channel)??socket.movementRelay?.available)} : {}),
    sessionProtocol: player.maintenanceGm492===true||player.area?.startsWith('guild_hall_')?'renewable-lease-v1':SESSION_PROTOCOL,
    leaseRemainingMs: Math.max(0, player.leaseExpiresAt - Date.now()),
    peers: [...room.players.values()].filter((entry) => entry.playerId !== player.playerId && !hiddenPlayer(entry.playerId)).map(publicPlayer),
    playerVisibility: [...room.players.values()].filter(entry => entry.visibilityRevision > 0)
      .map(entry => ({ playerId: entry.playerId, invisible: entry.gmInvisible === true, visibilityRevision: entry.visibilityRevision })),
    cycle: player.cycle,
    channel: player.channel,
    area: player.area,
    arenaMatchId: player.arenaMatchId || "",
    serverAt: Date.now(),
  });
  if (visibility.revision > 0) broadcast(room, visibilityEvent(player.playerId, visibility));
  broadcast(room, { type: "presence_join", transport: "dedicated-v1", ...publicPlayer(player), serverAt: Date.now() }, socket);
  return true;
}

export function renewSocketLease(socket, renewed) {
  const current = socket.player;
  const revocation = revokedSecurityVersions.get(renewed.playerId);
  if (!current || socketsByPlayer.get(current.playerId) !== socket || socket.readyState !== 1
    || renewed.leaseExpiresAt <= Date.now()
    || (revocation && revocation.expiresAtMs > Date.now() && renewed.securityVersion < revocation.minimumVersion)
    || renewed.playerId !== current.playerId || renewed.instanceId !== current.instanceId
    || renewed.securityVersion !== current.securityVersion || renewed.scopeVersion !== current.scopeVersion
    || roomKey(renewed) !== roomKey(current) || !supersedes(current, renewed)) {
    socket.close(4003, "Session renewal rejected");
    return false;
  }
  // Compatibility for a browser tab running the immediately preceding build.
  // Fresh authorization never rewinds position, HP or motion state.
  const visibility = applyTicketVisibility(renewed);
  const changed = current.visibilityRevision !== visibility.revision || current.gmInvisible !== visibility.invisible;
  current.maintenanceGm492 = visibility.maintenanceGm492===true;
  current.gmInvisible = visibility.invisible;
  current.visibilityRevision = visibility.revision;
  if (changed) broadcast(socket.room, visibilityEvent(current.playerId, visibility));
  current.movementGrant = renewed.movementGrant;current.combatGrant=renewed.combatGrant;
  current.botCheckAtMs = renewed.botCheckAtMs;
  current.leaseExpiresAt = renewed.leaseExpiresAt;
  current.issuedAtMs = renewed.issuedAtMs;
  return send(socket, { type: "lease_renewed", sessionProtocol: current.maintenanceGm492===true||current.area.startsWith('guild_hall_')?'renewable-lease-v1':SESSION_PROTOCOL,
    leaseRemainingMs: Math.max(0, current.leaseExpiresAt - Date.now()),
    cycle: current.cycle, channel: current.channel, area: current.area,
    arenaMatchId: current.arenaMatchId || "", serverAt: Date.now() });
}

export function disconnectSocket(socket) {
  motionCorkR11.release(socket,'close');
  socket.movementRelay?.detach(socket);socket.combatRelay?.detach(socket);
  if (socket.motionFlush) clearImmediate(socket.motionFlush);
  socket.motionFlush = null;
  socket.pendingMotionPreview = null;
  const { room, player } = socket;
  if (!room || !player) return;
  room.clients.delete(socket);
  if (socketsByPlayer.get(player.playerId) === socket) {
    socketsByPlayer.delete(player.playerId);
    room.players.delete(player.playerId);
    broadcast(room, { type: "presence_leave", transport: "dedicated-v1", playerId: player.playerId, serverAt: Date.now() }, socket);
  }
  cleanupRoom(room);
  socket.room = null;
  socket.player = null;
}

export function allowMessage(player, now, type) {
  return admitRealtimeMessage(player, now, type) === "allow";
}

export function handleSocketMessage(socket, payload) {
  const player = socket.player;
  const room = socket.room;
  if (!player || !room || !payload || typeof payload !== "object") return;
  const now = Date.now();
  if(player.area?.startsWith('guild_hall_')&&player.leaseExpiresAt<=now)return socket.close(4003,'Guild access lease expired');
  // The signed ticket is checked once when this socket opens. This is only a
  // presentation channel plus a movement relay; the game process checks live
  // session/presence and authoritative movement before every durable ACK. Do not turn a short renewal lease into
  // a user-visible disconnect or a movement freeze.
  if(player.botCheckAtMs && now>=player.botCheckAtMs)return socket.close(4003,"Player verification required");
  const admission = admitRealtimeMessage(player, now, payload.type);
  if (player.admissionReason) socket.recordAdmission?.(player.admissionReason);
  if (admission === "close") return socket.close(1008, "Rate limit exceeded");
  if (admission === "drop") return;
  if (admission === "throttle") {
    // No game work, ACK success, or HTTP retry: a bounded transient rejection
    // keeps the authenticated stream alive without admitting extra actions.
    if (payload.streamId !== player.connectionId || !Number.isSafeInteger(payload.id) || payload.id < 1) return;
    const movement = payload.type === "movement_checkpoint";
    const pending = movement ? socket.movementPending : socket.combatPending;
    const last = movement ? socket.movementLast : socket.combatLast;
    if (pending?.id === payload.id) return;
    if (last?.id === payload.id) { send(socket, last.reply); return; }
    send(socket, { type: movement ? "movement_ack" : "combat_ack",
      protocol: movement ? "durable-movement-v1" : "authoritative-combat-v1",
      streamId: player.connectionId, id: payload.id, status: 429,
      data: { code: movement ? "movement_rate_limited" : "combat_rate_limited",
        error: "İşlem aralığı çok kısa. Biraz bekleyin.", retryAfterMs: 250 } });
    return;
  }
  if (payload.type === "ping") {
    send(socket, {
      type: "pong", clientAt: Number(payload.clientAt) || 0,
      cycle: player.cycle, channel: player.channel, area: player.area,
      arenaMatchId: player.arenaMatchId || "", serverAt: now,
    });
    return;
  }
  if (payload.type === "combat_attack") return socket.combatRelay?.handle(socket, payload);
  if (payload.type === "movement_checkpoint") return socket.movementRelay?.handle(socket, payload);
  if (payload.type === "move") {
    // Hareket paketleri yalnız giriş niyetidir. Başka oyunculara konumu ancak
    // D1 CAS'ından geçmiş imzalı `move` olayı yayınlar.
    return;
  }
  if (payload.type === "motion") {
    const event = acceptMotion(player, payload, now, isAreaWalkablePosition);
    if (event) deliverMotion(room, socket, event);
    return;
  }
  if (payload.type !== "attack_intent") return;
  const intentId = typeof payload.intentId === "string" && /^[A-Za-z0-9:_-]{1,120}$/.test(payload.intentId) ? payload.intentId : "";
  const intentKey = `${player.playerId}:${intentId}`;
  if (now < (player.stunUntilMs ?? 0) || !intentId || room.seenIntents.has(intentKey) || now - player.lastAttackAt < 100 || player.hp <= 0) return;
  const targetId = typeof payload.targetId === "string" && /^[A-Za-z0-9_-]{1,80}$/.test(payload.targetId) ? payload.targetId : "";
  const targetKind = payload.targetKind === "player" ? "player" : payload.targetKind === "monster" ? "monster" : "";
  const spawnRound = Number(payload.spawnRound);
  const ability = Math.max(0, Math.min(3, Math.floor(Number(payload.ability) || 0)));
  const bounds = worldBounds(player.area);
  const targetX = finiteCoordinate(payload.targetX, bounds.minX, bounds.maxX);
  const targetY = finiteCoordinate(payload.targetY, bounds.minY, bounds.maxY);
  const attackerPosition = presentationPosition(player, now);
  if (!targetId || !targetKind || targetX === null || targetY === null || !isAreaWalkablePosition(player.area, targetX, targetY) || Math.hypot(targetX - attackerPosition.x, targetY - attackerPosition.y) > 780) return;
  if (targetKind === "monster" && (!Number.isSafeInteger(spawnRound) || spawnRound < 0)) return;
  if (targetKind === "player") {
    const target = room.players.get(targetId);
    const arenaAttack = player.area === "arena";
    if ((player.area !== "war" && player.area !== "black" && player.area !== "rune_v2" && !arenaAttack) || !target || target.gmInvisible || target.hp <= 0) return;
    if (arenaAttack && (room.arenaFinished || now < Number(player.arenaStartsAtMs || 0) || !player.arenaTeam || player.arenaTeam === target.arenaTeam)) return;
    const roleRange = player.role === "muhafiz" ? 190 : player.role === "avci" ? 500 : 470;
    const attackRange = player.role === "muhafiz" && (ability===1||ability===2) ? (ability === 1 ? 300 : 330) : ability === 2 ? Math.max(roleRange, 285) : roleRange;
    const targetPosition = presentationPosition(target, now);
    if (Math.hypot(targetPosition.x - attackerPosition.x, targetPosition.y - attackerPosition.y) > attackRange + 125 || Math.hypot(targetX - targetPosition.x, targetY - targetPosition.y) > 150) return;
  } else if (player.area !== 'event' && player.area !== 'rune_v2' && player.area !== 'rune' && player.area !== "afk" && player.area !== "ancient" && player.area !== "forest" && player.area !== "frozen" && player.area !== "sanctum" && player.area !== "dragon" && player.area !== "sinsi" && player.area !== "black") return;
  player.lastAttackAt = now;
  room.seenIntents.set(intentKey, now);
  if (room.seenIntents.size > 800) {
    for (const [id, seenAt] of room.seenIntents) if (now - seenAt > 10_000) room.seenIntents.delete(id);
  }
  flushPendingMotion(socket);
  broadcast(room, {
    type: "attack_intent",
    intentId,
    attackerId: player.playerId,
    role: player.role,
    ability,
    targetKind,
    targetId,
    targetX,
    targetY,
    ...(targetKind === "monster" ? { spawnRound } : {}),
    hits: [],
    serverAt: now,
  }, socket);
}

export function applyPlayerState(room, event) {
  const type = String(event.type || "");
  if (type === "guardian_control") {
    const apply = (id,row) => {
      const player=room.players.get(id);
      if(!player || !row || Number(row.position_revision)<player.lastSequence || Number(row.hp_revision)<player.hpRevision) return;
      Object.assign(player,{x:row.x,y:row.y,lastSequence:row.position_revision,hp:row.hp,hpRevision:row.hp_revision,
        rootUntilMs:row.root_until_ms,stunUntilMs:row.stun_until_ms,lastMoveAt:Date.now()});
      player.motion=undefined;player.motionHpFloor=Math.max(player.motionHpFloor ?? 0,row.hp_revision);
    };
    apply(event.actorId,event.moved);
    if(event.targetKind === "player") apply(event.targetId,event.controlled);
    return true;
  }
  if (type === "move") {
    if (event.authoritative !== true) return false;
    const playerId = String(event.playerId || "");
    const sequence = Math.floor(Number(event.sequence));
    const x = Number(event.x);
    const y = Number(event.y);
    const player = room.players.get(playerId);
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(playerId) || !Number.isSafeInteger(sequence) || sequence < 1
      || !Number.isFinite(x) || !Number.isFinite(y)) return false;
    if (player) {
      if (sequence <= player.lastSequence || !isAreaWalkablePosition(player.area, x, y)) return false;
      Object.assign(player, { x, y, lastSequence: sequence, lastMoveAt: Date.now() });
      reconcileMotionCheckpoint(player, event, player.lastMoveAt);
    }
    return true;
  }
  const playerId = type === "player_respawn" ? String(event.playerId || "") : String(event.targetId || "");
  const player = room.players.get(playerId);
  if (!player || !["pvp_result", "player_hit", "player_state", "player_respawn"].includes(type)) return;
  const revision = Math.max(0, Math.floor(Number(event.hpRevision) || 0));
  if (revision < player.hpRevision) return;
  const eventHp = Math.max(0, Number(event.hp) || 0);
  player.hp = revision === player.hpRevision && type !== "player_respawn" ? Math.min(player.hp, eventHp) : eventHp;
  player.maxHp = Math.max(1, Number(event.maxHp) || player.maxHp);
  player.hpRevision = revision;
  player.respawnAtMs = Math.max(0, Math.floor(Number(event.respawnAtMs) || 0));
  if (player.hp <= 0 || type === "player_respawn") player.motion = undefined;
  if (type === "player_respawn") {
    player.motionHpFloor = Math.max(player.motionHpFloor ?? 0, revision);
    const area = safeArea(event.area) ?? player.area;
    if (area !== player.area) {
      if(player.area?.startsWith('guild_hall_'))guildAccessFloors.set(player.playerId,{revision,until:Date.now()+90_000});
      const socket = socketsByPlayer.get(player.playerId);
      if (socket) socket.close(4003, "Realtime scope changed");
      return;
    }
    const bounds = worldBounds(area);
    const x = finiteCoordinate(event.x, bounds.minX, bounds.maxX);
    const y = finiteCoordinate(event.y, bounds.minY, bounds.maxY);
    const insideArena = area !== "arena" || (x !== null && y !== null && x >= ARENA_BOUNDS.minX && x <= ARENA_BOUNDS.maxX && y >= ARENA_BOUNDS.minY && y <= ARENA_BOUNDS.maxY);
    if (x !== null && y !== null && insideArena && isAreaWalkablePosition(area, x, y)) Object.assign(player, { area, x, y });
  }
}

export function broadcastAuthoritativeEvent(roomIdentity, event) {
  const labAudience=colLabValidateRoomAudience(roomIdentity,event);
  if(labAudience?.size===0)return 0;
  if(labAudience){const {__colLabAudience,...publicEvent}=event;event=publicEvent;}
  if (event?.type === "gm_visibility") {
    const id = event.playerId, revision = event.visibilityRevision;
    if (typeof id !== 'string' || !/^[A-Za-z0-9_-]{1,80}$/.test(id)
      || typeof event.invisible !== 'boolean' || !Number.isSafeInteger(revision) || revision < 1) throw new Error('invalid_visibility');
    const state = rememberVisibility(id, event.invisible, revision, event.maintenanceGm492);
    const socket = socketsByPlayer.get(id);
    if (socket?.player) { socket.player.maintenanceGm492=state.maintenanceGm492===true; socket.player.gmInvisible = state.invisible; socket.player.visibilityRevision = state.revision; }
    // Send removal markers to previous scopes too. Concurrent map changes must
    // not leave a stale avatar behind. This contains no position or appearance.
    let delivered = 0;
    for (const room of rooms.values()) { broadcast(room, visibilityEvent(id, state)); delivered += room.clients.size; }
    return delivered;
  }
  if(["direct_message","trade_changed","world_delta","world_reset","pvp_gem_loss479"].includes(event?.type))throw new Error("private_event_requires_audience");
  if (event?.type === "force_disconnect") {
    const targetId = String(event.targetId || "");
    if (!/^[A-Za-z0-9_-]{1,80}$/.test(targetId)) return 0;
    const suppliedVersion = Math.floor(Number(event.securityVersion));
    const minimumVersion = Number.isSafeInteger(suppliedVersion) && suppliedVersion > 0
      ? suppliedVersion
      : Number.MAX_SAFE_INTEGER;
    const previous = revokedSecurityVersions.get(targetId);
    revokedSecurityVersions.set(targetId, {
      minimumVersion: Math.max(previous?.minimumVersion || 0, minimumVersion),
      // A signed ticket/lease can survive for at most sixty seconds. Keeping the
      // revision floor a little longer also rejects an unused pre-ban ticket.
      expiresAtMs: Date.now() + 90_000,
    });
    const socket = socketsByPlayer.get(targetId);
    if (!socket) return 0;
    disconnectSocket(socket);
    socket.close(4003, "Session revoked");
    return 1;
  }
  const room = rooms.get(roomKey(roomIdentity));
  if (!room) return 0;
  if (room.arenaFinished && event?.type === "pvp_result") return 0;
  if (event?.type === "arena_match_finished") room.arenaFinished = true;
  if (applyPlayerState(room, event) === false) return 0;
  const before = room.clients.size;
  broadcast(room, { ...event, serverAt: Number(event.serverAt) || Date.now() },undefined,true,labAudience);
  return labAudience?[...room.clients].filter(client=>labAudience.has(client.player?.playerId)).length:before;
}

export function broadcastWorldEvent(cycle, event) {
  const safeCycle = cycle;
  const message = event?.message;
  const messageId = message?.id;
  if (!Number.isSafeInteger(safeCycle) || safeCycle < 1
    || event?.type !== "chat_message" || !["world", "trade"].includes(event?.chatScope)
    || event?.cycle !== safeCycle
    || !Number.isSafeInteger(messageId) || messageId < 1
    || event?.eventId !== `chat-message:${messageId}`
    || message?.scope !== event?.chatScope || message?.recipient_id !== null || message?.area !== null
    || typeof message?.player_id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(message.player_id)
    || typeof message?.player_name !== "string" || message.player_name.length < 1 || message.player_name.length > 40
    || typeof message?.body !== "string" || message.body.length < 1 || message.body.length > 140
    || !Number.isSafeInteger(message?.channel) || message.channel < 1 || message.channel > 100
    || !Number.isSafeInteger(message?.created_at) || message.created_at < 1) {
    throw new Error("invalid_world_event");
  }
  const now = Date.now();
  const encoded = Buffer.from(JSON.stringify({ ...event, serverAt: Number(event.serverAt) || now }));
  if (encoded.length > MAX_EVENT_BYTES) return 0;
  let delivered = 0;
  for (const socket of socketsByPlayer.values()) {
    if(socket.player?.area?.startsWith('guild_hall_')&&socket.player.leaseExpiresAt<=now){socket.close(4003,'Guild access lease expired');continue;}
    if (socket.player?.cycle !== safeCycle) continue;
    if (send(socket, encoded)) delivered += 1;
  }
  return delivered;
}

export function realtimeStats() {
  let clients = 0;
  for (const room of rooms.values()) clients += room.clients.size;
  return { rooms: rooms.size, clients,traffic:{...traffic},motionCorkR11:motionCorkR11.snapshot() };
}

export function heartbeatSockets() {
  const now = Date.now();
  for(const [id,floor]of guildAccessFloors)if(floor.until<=now)guildAccessFloors.delete(id);
  for (const [id, state] of visibilityStates) {
    if (!socketsByPlayer.has(id) && state.expiresAt <= now) visibilityStates.delete(id);
  }
  for (const [playerId, revocation] of revokedSecurityVersions) {
    if (revocation.expiresAtMs <= now) revokedSecurityVersions.delete(playerId);
  }
  for (const socket of socketsByPlayer.values()) {
    if(socket.player?.area?.startsWith('guild_hall_')&&socket.player.leaseExpiresAt<=now){socket.close(4003,'Guild access lease expired');continue;}
    if(socket.player?.botCheckAtMs && now>=socket.player.botCheckAtMs){socket.close(4003,"Player verification required");continue;}
    if (socket.isAlive === false) socket.terminate();
    else {
      socket.isAlive = false;
      socket.ping();
    }
  }
}

// Called only by the signed server-to-server route. Never a client wire command.
export function broadcastPlayerEvent(cycle, audience, event) {
 if(!Number.isSafeInteger(cycle)||cycle<1||!Array.isArray(audience)||audience.length<1||audience.length>(event?.type==='guild_changed'?80:8)
  ||audience.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(id))
  ||!['direct_message','party_invite','trade_changed','guild_changed','world_delta','world_reset','pvp_gem_loss479'].includes(event?.type))throw new Error('invalid_private_event');
 if(event.type==='pvp_gem_loss479'&&(audience.length!==1||event.targetId!==audience[0]||!Number.isSafeInteger(event.hpRevision)||event.hpRevision<1||!Number.isSafeInteger(event.pvpGemsLost479)||event.pvpGemsLost479<0||event.eventId!=='pvp-gems479:'+event.targetId+':'+event.hpRevision))throw Error('invalid_pvp_gem_loss479');
 if(event.type==='guild_changed'&&(typeof event.eventId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(event.eventId)))throw new Error('invalid_guild_event');
 if(event.type==='direct_message'){
  const m=event.message;
  if(!Number.isSafeInteger(m?.id)||m.id<1||m.scope!=='direct'||event.eventId!==`direct-message:${m.id}`
   ||!m.player_id||!m.recipient_id||audience.some(id=>id!==m.player_id&&id!==m.recipient_id))throw new Error('invalid_private_message');
 }
 if(['world_delta','world_reset'].includes(event.type)){
  if(audience.length!==1||event.protocol!=='world-delta-v1'||event.cycle!==cycle||!Number.isSafeInteger(event.seq)||event.seq<1||typeof event.epoch!=='string'||typeof event.instanceId!=='string')throw Error('invalid_world_delta');
  const socket=socketsByPlayer.get(audience[0]),p=socket?.player;
  if(!p||p.cycle!==cycle||p.channel!==event.channel||p.area!==event.area||p.instanceId!==event.instanceId||(p.area==='arena'&&(p.arenaMatchId!==event.arenaMatchId||!p.arenaMatchId)))return 0;
  if(event.room!==JSON.stringify([cycle,p.channel,p.area,p.area==='arena'?p.arenaMatchId:'']))throw Error('invalid_world_scope');
  for(const row of event.entities?.players?.upsert??[])if(hiddenPlayer(row.id)&&row.id!==p.playerId)throw Error('hidden_world_player');
  for(const row of event.entities?.monsters?.upsert??[])for(const id of row.targetIds??[])if(hiddenPlayer(id)&&id!==p.playerId)throw Error('hidden_world_target');
  for(const row of event.entities?.combatEvents?.upsert??[])if((hiddenPlayer(row.player_id)&&row.player_id!==p.playerId)||(hiddenPlayer(row.target_id)&&row.target_id!==p.playerId))throw Error('hidden_world_combat');
  for(const row of event.entities?.drops?.upsert??[])if(row.owner_id!==undefined&&row.owner_id!==p.playerId)throw Error('private_world_drop');
  for(const key of ['inventory','storageItems'])for(const row of event.entities?.[key]?.upsert??[])if(row.player_id!==undefined&&row.player_id!==p.playerId)throw Error('private_world_inventory');
  for(const row of event.entities?.directMessages?.upsert??[])if(row.player_id!==undefined&&row.recipient_id!==undefined&&row.player_id!==p.playerId&&row.recipient_id!==p.playerId)throw Error('private_world_message');
  if(event.frame&&(!Number.isInteger(event.frame.index)||!Number.isInteger(event.frame.total)||event.frame.total<2||event.frame.total>128||event.frame.index<0||event.frame.index>=event.frame.total))throw Error('invalid_world_frame');
  for(const segment of event.fieldSegments??[])if(!['settings','halloweenEvent456','ranks','eventIsland','dragon','premiumPrices','party','partyInvite','starterReward','globalAnnouncement','gmAnnouncement','arenaQueue','arenaMatch','arenaResult','playerVisibility','bossLeaders','leaders','dungeonWings'].includes(segment.key)||typeof segment.text!=='string')throw Error('invalid_world_field_segment');
  return send(socket,event)?1:0;
 }
 const {audiencePlayerIds,recipients,...safeEvent}=event;
 let delivered=0;
 for(const id of new Set(audience)){const socket=socketsByPlayer.get(id);if(socket?.player?.cycle===cycle&&send(socket,{...safeEvent,serverAt:Number(event.serverAt)||Date.now()}))delivered++;}
 return delivered;
}
