import {runeWalkable} from './rune-map.mjs';
import { createHash, randomUUID, webcrypto } from "node:crypto";
import { MAX_REQUEST_NONCES } from "./broadcast-budget.mjs";

const encoder = new TextEncoder();
const KEY_ID = "coreoflife-p256-2026-09";
const MAX_USED_TICKETS = 10_000;
const MAX_USED_REQUEST_NONCES = MAX_REQUEST_NONCES;
const usedTickets = new Map();
const usedRequestNonces = new Map();
let verificationKeyPromise;
let lastReplayCleanupAt = 0;

function base64UrlToBytes(value) {
  if (typeof value !== "string" || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("invalid_base64url");
  return Buffer.from(value, "base64url");
}

function signingPublicKey() {
  if (verificationKeyPromise) return verificationKeyPromise;
  const encoded = String(process.env.REALTIME_PUBLIC_KEY_SPKI || "").replace(/\s+/g, "");
  if (!encoded || !/^[A-Za-z0-9+/]+={0,2}$/.test(encoded)) throw new Error("missing_public_key");
  verificationKeyPromise = webcrypto.subtle.importKey(
    "spki",
    Buffer.from(encoded, "base64"),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"],
  );
  return verificationKeyPromise;
}

async function verify(value, signature) {
  return webcrypto.subtle.verify(
    { name: "ECDSA", hash: "SHA-256" },
    await signingPublicKey(),
    base64UrlToBytes(signature),
    encoder.encode(value),
  );
}

function safeArea(value) {
  return /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(value) ? value : null;
}

function finite(value, minimum, maximum) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}

function worldBounds(area) {
 if(area==='event')return {minX:650,maxX:2950,minY:480,maxY:1700};
 if(area==='rune'||area==='rune_v2')return {minX:55,maxX:4265,minY:80,maxY:2825};
  if(/^guild_village_/.test(area))return {minX:55,maxX:3545,minY:80,maxY:2345};
  if(/^guild_hall_/.test(area))return {minX:55,maxX:2345,minY:80,maxY:1545};
  if(area === "dragon")return {minX:55,maxX:2945,minY:80,maxY:1820};
  if(area === "war")return {minX:55,maxX:3545,minY:80,maxY:2195};
  if (area === "ancient") return {minX:55,maxX:3545,minY:80,maxY:3545};
  if (area === "afk") return {minX:55,maxX:5345,minY:80,maxY:3545};
  if (area === "black") return { minX: 55, maxX: 5_345, minY: 80, maxY: 3_320 };
  if (area === "forest") return { minX: 45, maxX: 5_355, minY: 65, maxY: 3_330 };
  if (area === "frozen") return { minX: 55, maxX: 4_745, minY: 80, maxY: 2_945 };
  return { minX: 55, maxX: 2_345, minY: 80, maxY: 1_445 };
}

function cleanupReplayMaps(nowSeconds) {
  if (nowSeconds - lastReplayCleanupAt < 5) return;
  lastReplayCleanupAt = nowSeconds;
  for (const [id, expiry] of usedTickets) if (expiry < nowSeconds) usedTickets.delete(id);
  for (const [nonce, expiry] of usedRequestNonces) if (expiry < nowSeconds) usedRequestNonces.delete(nonce);
}

export async function realtimeSecurityReady() {
  await signingPublicKey();
  return true;
}

export async function verifyRealtimeTicket(ticket) {
  if (typeof ticket !== "string" || ticket.length > 4_096) throw new Error("invalid_ticket");
  const parts = ticket.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") throw new Error("invalid_ticket");
  const [, encoded, signature] = parts;
  if (!(await verify(`COL-TICKET-V1.${encoded}`, signature))) throw new Error("invalid_signature");
  let payload;
  try { payload = JSON.parse(base64UrlToBytes(encoded).toString("utf8")); }
  catch { throw new Error("invalid_payload"); }
  const now = Math.floor(Date.now() / 1_000);
  cleanupReplayMaps(now);
  if (payload?.v !== 1 || payload.iss !== "coreoflife.net" || payload.aud !== "coreoflife-realtime") throw new Error("invalid_claims");
  if (!Number.isSafeInteger(payload.iat) || !Number.isSafeInteger(payload.exp) || payload.iat > now + 5 || payload.exp < now || payload.exp - payload.iat > 45) throw new Error("expired_ticket");
  if (typeof payload.jti !== "string" || !/^[A-Za-z0-9-]{16,80}$/.test(payload.jti) || usedTickets.has(payload.jti)) throw new Error("replayed_ticket");
  if (typeof payload.playerId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(payload.playerId)) throw new Error("invalid_player");
  if (payload.loadlabRunId !== undefined && (typeof payload.loadlabRunId !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(payload.loadlabRunId))) throw new Error("invalid_loadlab_claim");
  if (typeof payload.name !== "string" || payload.name.length < 1 || payload.name.length > 40) throw new Error("invalid_player");
  if (!/^(muhafiz|avci|arkanist)$/.test(payload.role)) throw new Error("invalid_player");
  const area = safeArea(payload.area);
  if (!area) throw new Error("invalid_player");
  const bounds = worldBounds(area);
  const x = finite(payload.x, bounds.minX, bounds.maxX);
  const y = finite(payload.y, bounds.minY, bounds.maxY);
  const hp = finite(payload.hp, 0, 100_000_000);
  const maxHp = finite(payload.maxHp, 1, 100_000_000);
  if (x === null || y === null || hp === null || maxHp === null) throw new Error("invalid_player");
  const arenaMatchId = area === "arena" && typeof payload.arenaMatchId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(payload.arenaMatchId) ? payload.arenaMatchId : "";
  const arenaTeam = area === "arena" && (payload.arenaTeam === 1 || payload.arenaTeam === 2) ? payload.arenaTeam : 0;
  const arenaStartsAtMs = area === "arena" && Number.isFinite(Number(payload.arenaStartsAtMs)) ? Math.max(0, Number(payload.arenaStartsAtMs)) : 0;
  if (area === "arena" && (!arenaMatchId || !arenaTeam || !arenaStartsAtMs)) throw new Error("invalid_arena");
  if (area === "arena" && (x < 280 || x > 2_120 || y < 250 || y > 1_250)) throw new Error("invalid_arena");
  const leaseExpiresAt = Math.floor(Number(payload.leaseExpiresAt) || 0);
  const securityVersion = Math.floor(Number(payload.securityVersion) || 0);
  const scopeVersion = Math.floor(Number(payload.scopeVersion) || 0);
  const positionRevision = Math.max(0, Math.floor(Number(payload.positionRevision) || 0));
  if (leaseExpiresAt <= Date.now() || leaseExpiresAt > Date.now() + 60_000 || securityVersion < 1 || scopeVersion < 1) throw new Error("invalid_lease");
  const issuedAtMs = payload.issuedAtMs === undefined ? payload.iat * 1_000 : payload.issuedAtMs;
  const instanceId = payload.instanceId === undefined ? "" : payload.instanceId;
  if (!Number.isSafeInteger(issuedAtMs) || Math.floor(issuedAtMs / 1_000) !== payload.iat
    || (instanceId !== "" && (typeof instanceId !== "string" || !/^[a-f0-9-]{36}$/.test(instanceId)))) throw new Error("invalid_session_identity");
  if (usedTickets.size >= MAX_USED_TICKETS) throw new Error("ticket_capacity_exceeded");
  usedTickets.set(payload.jti, payload.exp + 5);
  return {
    maintenanceGm492: payload.maintenanceGm492 === true,
    gmInvisible: payload.gmInvisible === true,
    visibilityRevision: Number.isSafeInteger(payload.visibilityRevision) && payload.visibilityRevision >= 0 ? payload.visibilityRevision : 0,
    connectionId: randomUUID(),
    movementGrant: typeof payload.movementGrant === 'string' && /^[a-f0-9-]{36}$/.test(payload.movementGrant) ? payload.movementGrant : '',
    combatGrant: typeof payload.combatGrant === 'string' && /^[a-f0-9-]{36}$/.test(payload.combatGrant) ? payload.combatGrant : '',
    issuedAtMs,
    instanceId,
    playerId: payload.playerId,
    ...(payload.loadlabRunId !== undefined ? {loadlabRunId:payload.loadlabRunId} : {}),
    name: payload.name,
    role: payload.role,
    x,
    y,
    hp: Math.min(hp, maxHp),
    maxHp,
    rootUntilMs: Math.max(0,Number(payload.rootUntilMs)||0),
    stunUntilMs: Math.max(0,Number(payload.stunUntilMs)||0),
    hpRevision: Math.max(0, Math.floor(Number(payload.hpRevision) || 0)),
    respawnAtMs: Math.max(0, Math.floor(Number(payload.respawnAtMs) || 0)),
    area,
    channel: Math.max(1, Math.min(100, Math.floor(Number(payload.channel) || 1))),
    cycle: Math.max(1, Math.floor(Number(payload.cycle) || 1)),
    arenaMatchId,
    arenaTeam,
    arenaStartsAtMs,
    botCheckAtMs: Number.isSafeInteger(payload.botCheckAtMs)&&payload.botCheckAtMs>0?payload.botCheckAtMs:0,
    leaseExpiresAt,
    securityVersion,
    scopeVersion,
    lastSequence: positionRevision,
    lastMoveAt: 0,
    lastAttackAt: 0,
    messageWindowAt: Date.now(),
    messageCount: 0,
    moveCount: 0,
    attackCount: 0,
    pingCount: 0,
  };
}

function header(headers, name) {
  const value = headers[name] ?? headers[name.toLowerCase()];
  return Array.isArray(value) ? value[0] : value;
}

export async function verifySignedRealtimeRequest(headers, pathname, body, method = "POST") {
  const keyId = header(headers, "x-col-key-id");
  const timestamp = header(headers, "x-col-timestamp");
  const nonce = header(headers, "x-col-nonce");
  const signature = header(headers, "x-col-signature");
  if (keyId !== KEY_ID || typeof timestamp !== "string" || typeof nonce !== "string" || typeof signature !== "string") return false;
  if (!/^[A-Za-z0-9-]{16,80}$/.test(nonce) || !/^\d{10}$/.test(timestamp)) return false;
  const now = Math.floor(Date.now() / 1_000);
  const signedAt = Number(timestamp);
  cleanupReplayMaps(now);
  if (Math.abs(now - signedAt) > 30 || usedRequestNonces.has(nonce)) return false;
  if (usedRequestNonces.size >= MAX_USED_REQUEST_NONCES) return false;
  const digest = createHash("sha256").update(body).digest("base64url");
  const valid = await verify(`COL-REQUEST-V1\n${keyId}\n${timestamp}\n${nonce}\n${method}\n${pathname}\n${digest}`, signature).catch(() => false);
  // Verification yields: recheck/consume atomically afterwards, otherwise two
  // simultaneous deliveries of the same signed request can both be accepted.
  if (!valid || usedRequestNonces.has(nonce) || usedRequestNonces.size >= MAX_USED_REQUEST_NONCES) return false;
  usedRequestNonces.set(nonce, Math.max(now, signedAt) + 40);
  return true;
}
