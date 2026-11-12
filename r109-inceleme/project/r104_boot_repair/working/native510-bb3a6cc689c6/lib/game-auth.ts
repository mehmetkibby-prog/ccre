import { env } from "cloudflare:workers";
import { isGameApi, readGameInstance } from "./game-instance";

// Cloudflare Workers WebCrypto rejects PBKDF2 requests above 100,000 rounds.
// Keep this at the runtime ceiling so registration and verification use the
// strongest work factor the deployed environment accepts.
export const PASSWORD_ITERATIONS = 100_000;
const WORKER_PBKDF2_MAX_ITERATIONS = 100_000;
export const SESSION_COOKIE_NAME = "__Host-yasam-session";
export const CSRF_COOKIE_NAME = "__Host-yasam-csrf";
const LOCAL_SESSION_COOKIE_NAME = "yasam-session-local";
const LOCAL_CSRF_COOKIE_NAME = "yasam-csrf-local";

const SESSION_LIFETIME_SECONDS = 30 * 24 * 60 * 60;
const SESSION_TOUCH_INTERVAL_SECONDS = 5 * 60;
const PASSWORD_HASH_BYTES = 32;
const PASSWORD_SALT_BYTES = 16;
const TOKEN_BYTES = 32;
const MIN_PASSWORD_LENGTH = 9;
const MAX_PASSWORD_LENGTH = 128;
const encoder = new TextEncoder();

export type AccountSummary = {
  id: string;
  username: string;
  email: string;
};

export type PlayerSummary = {
  id: string;
  name: string;
  role: string;
};

export type GameSession = {
  tokenHash: string;
  account: AccountSummary;
  player: PlayerSummary | null;
  playerAccess: { area: string; level: number } | null;
  csrfHash: string;
  expiresAt: number;
  lastSeenAt: number;
  securityVersion: number;
  gamePresence?: { instanceId: string; tokenHash: string; expiresAtMs: number; chatAfterId: number };
};

export type NewSession = {
  sessionToken: string;
  csrfToken: string;
  expiresAt: number;
};

export type PasswordHash = {
  passwordHash: string;
  passwordSalt: string;
  passwordIterations: number;
};

export type StoredPassword = {
  password_hash: string;
  password_salt: string;
  password_iterations: number;
};

export class AuthRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryAfter?: number;

  constructor(status: number, code: string, message: string, retryAfter?: number) {
    super(message);
    this.name = "AuthRequestError";
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

export const realmRuntime = () => (globalThis as any).__colRealm;

export function authDatabase() {
  if (!env.DB) throw new Error("Cloudflare D1 `DB` bağlaması bulunamadı.");
  return env.DB;
}

export function nowSeconds() {
  return Math.floor(Date.now() / 1_000);
}

function bytesToBase64Url(bytes: Uint8Array) {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(value: string) {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Geçersiz base64url değeri.");
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/") + padding);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

export function generateOpaqueToken(byteLength = TOKEN_BYTES) {
  if (!Number.isSafeInteger(byteLength) || byteLength < 24 || byteLength > 64) {
    throw new Error("Geçersiz güvenlik belirteci uzunluğu.");
  }
  return bytesToBase64Url(crypto.getRandomValues(new Uint8Array(byteLength)));
}

export async function sha256(value: string) {
  const bytes = encoder.encode(value);
  const runtime = env as unknown as { CORE_RUNTIME?: string; CORE_SHA256?: (bytes: Uint8Array) => string };
  // Short token hashes need no asynchronous crypto queue on the persistent VDS.
  // This caches no authorization state; large payloads and Workers keep WebCrypto.
  if (bytes.byteLength <= 4096 && runtime.CORE_RUNTIME === "vds") {
    const nativeDigest = runtime.CORE_SHA256;
    if (typeof nativeDigest === "function") return nativeDigest(bytes);
  }
  return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}

async function derivePassword(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  // TS 5.9, generic Uint8Array'ın SharedArrayBuffer olabileceğini varsayar;
  // WebCrypto'ya kesin bir ArrayBuffer-backed kopya veriyoruz.
  const cryptoSalt = new Uint8Array(salt.byteLength);
  cryptoSalt.set(salt);
  const result = await crypto.subtle.deriveBits(
    { name: "PBKDF2", hash: "SHA-256", salt: cryptoSalt, iterations },
    key,
    PASSWORD_HASH_BYTES * 8,
  );
  return new Uint8Array(result);
}

function timingSafeEqual(left: Uint8Array, right: Uint8Array) {
  if (left.length !== right.length) return false;
  let difference = 0;
  for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
  return difference === 0;
}

export function validatePassword(password: unknown) {
  if (typeof password !== "string") {
    throw new AuthRequestError(400, "invalid_password", "Parola geçersiz.");
  }
  const characterLength = Array.from(password).length;
  if (characterLength < MIN_PASSWORD_LENGTH || characterLength > MAX_PASSWORD_LENGTH) {
    throw new AuthRequestError(
      400,
      "invalid_password",
      `Parola ${MIN_PASSWORD_LENGTH}-${MAX_PASSWORD_LENGTH} karakter arasında olmalı.`,
    );
  }
  return password;
}

export async function hashPassword(password: string, iterations = PASSWORD_ITERATIONS): Promise<PasswordHash> {
  validatePassword(password);
  if (
    !Number.isSafeInteger(iterations)
    || iterations < PASSWORD_ITERATIONS
    || iterations > WORKER_PBKDF2_MAX_ITERATIONS
  ) {
    throw new Error("Geçersiz PBKDF2 çalışma katsayısı.");
  }
  const salt = crypto.getRandomValues(new Uint8Array(PASSWORD_SALT_BYTES));
  const hash = await derivePassword(password, salt, iterations);
  return {
    passwordHash: bytesToBase64Url(hash),
    passwordSalt: bytesToBase64Url(salt),
    passwordIterations: iterations,
  };
}

export async function verifyPassword(password: string, stored: StoredPassword) {
  if (
    !Number.isSafeInteger(stored.password_iterations)
    || stored.password_iterations < 100_000
    || stored.password_iterations > WORKER_PBKDF2_MAX_ITERATIONS
  ) return false;
  try {
    const expected = base64UrlToBytes(stored.password_hash);
    const salt = base64UrlToBytes(stored.password_salt);
    const actual = await derivePassword(password, salt, stored.password_iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

/** Burns the normal verification cost so an unknown account is not a fast path. */
export async function runDummyPasswordCheck(password: string) {
  const safePassword = typeof password === "string" ? password.slice(0, MAX_PASSWORD_LENGTH) : "";
  await derivePassword(safePassword, new Uint8Array(PASSWORD_SALT_BYTES), PASSWORD_ITERATIONS);
}

export function normalizeUsername(value: unknown) {
  if (typeof value !== "string") {
    throw new AuthRequestError(400, "invalid_username", "Kullanıcı adı geçersiz.");
  }
  const username = value.trim().normalize("NFKC");
  if (
    Array.from(username).length < 3
    || Array.from(username).length > 24
    || !/^[\p{L}\p{N}_.-]+$/u.test(username)
  ) {
    throw new AuthRequestError(
      400,
      "invalid_username",
      "Kullanıcı adı 3-24 karakter olmalı; yalnızca harf, sayı, nokta, tire ve alt çizgi kullanılabilir.",
    );
  }
  return { username, normalized: username.toLowerCase() };
}

export function normalizeEmail(value: unknown) {
  if (typeof value !== "string") {
    throw new AuthRequestError(400, "invalid_email", "Geçerli bir e-posta adresi yazmalısın.");
  }
  const email = value.trim().normalize("NFKC").toLowerCase();
  if (
    email.length > 254
    || /[\r\n]/.test(email)
    || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
  ) {
    throw new AuthRequestError(400, "invalid_email", "Geçerli bir e-posta adresi yazmalısın.");
  }
  return { email, normalized: email };
}

export function normalizeLogin(value: unknown) {
  if (typeof value !== "string") {
    throw new AuthRequestError(400, "invalid_login", "Kullanıcı adı veya e-posta gerekli.");
  }
  const login = value.trim().normalize("NFKC").toLowerCase();
  if (!login || login.length > 254) {
    throw new AuthRequestError(400, "invalid_login", "Kullanıcı adı veya e-posta gerekli.");
  }
  return login;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("Origin");
  let expectedOrigin: string;
  try {
    expectedOrigin = new URL(request.url).origin;
  } catch {
    throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
  }
  if (!origin || origin !== expectedOrigin) {
    throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
  }
}

export async function readJsonObject(request: Request, maxBytes = 16_384) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 256 || maxBytes > 65_536) {
    throw new Error("Geçersiz istek boyutu sınırı.");
  }
  const contentType = request.headers.get("Content-Type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new AuthRequestError(415, "unsupported_media_type", "İstek JSON biçiminde olmalı.");
  }
  const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
  if (Number.isFinite(declaredLength) && declaredLength > maxBytes) {
    throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
  }
  if (!request.body) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteLength = 0;
  let serialized = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
      }
      serialized += decoder.decode(value, { stream: true });
    }
    serialized += decoder.decode();
  } catch {
    if (byteLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
    throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
  }
  let payload: unknown;
  try { payload = JSON.parse(serialized); }
  catch { throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz."); }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
  }
  return payload as Record<string, unknown>;
}

function cookieValue(request: Request, name: string) {
  const header = request.headers.get("Cookie") ?? "";
  for (const part of header.split(";")) {
    const separator = part.indexOf("=");
    if (separator < 0) continue;
    if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
  }
  return null;
}

function requestUsesSecureCookies(request: Request) {
  try {
    return new URL(request.url).protocol === "https:";
  } catch {
    return true;
  }
}

function authCookieNames(request: Request) {
  return requestUsesSecureCookies(request)
    ? { session: SESSION_COOKIE_NAME, csrf: CSRF_COOKIE_NAME, secure: true }
    : { session: LOCAL_SESSION_COOKIE_NAME, csrf: LOCAL_CSRF_COOKIE_NAME, secure: false };
}

function validOpaqueToken(value: string | null) {
  return Boolean(value && value.length >= 32 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value));
}

export function csrfTokenFromRequest(request: Request) {
  const token = cookieValue(request, authCookieNames(request).csrf);
  return validOpaqueToken(token) ? token : null;
}

export async function validCsrfTokenForSession(request: Request, session: GameSession) {
  const token = csrfTokenFromRequest(request);
  if (!token) return null;
  const tokenHash = await sha256(token);
  return timingSafeEqual(encoder.encode(tokenHash), encoder.encode(session.csrfHash)) ? token : null;
}

export async function getGameSession(request: Request, onLookup?: (tokenHash: string) => void): Promise<GameSession | null> {
  const sessionToken = cookieValue(request, authCookieNames(request).session);
  if (!validOpaqueToken(sessionToken) || !sessionToken) return null;
  const tokenHash = await sha256(sessionToken);
  // Optional read-only prefetch; callers must still await every authorization
  // and presence check before using its result or performing any mutation.
  onLookup?.(tokenHash);
  return getGameSessionByHash(tokenHash);
}

// Native movement grants hold this hash only inside the game process. Every
// checkpoint still reads the live session, account and presence from SQLite.
async function getGameSessionByHash(tokenHash: string): Promise<GameSession | null> {
  const now = nowSeconds();
  const record = await authDatabase().prepare(
    realmRuntime()?.role==='accounts' ? `SELECT s.token_hash,s.account_id,s.csrf_hash,s.expires_at,s.last_seen_at,
      s.security_version,a.security_version AS account_security_version,a.suspended_until_ms,a.permanently_banned,a.ban_reason,a.username,a.email,
      NULL AS player_id,NULL AS player_name,NULL AS player_role,NULL AS player_area,NULL AS player_level,
      NULL AS instance_id,NULL AS presence_token_hash,NULL AS presence_expires_at_ms,NULL AS chat_after_id
      FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1` :
    `SELECT s.token_hash, s.account_id, s.csrf_hash, s.expires_at, s.last_seen_at,
      s.security_version, a.security_version AS account_security_version,
      a.suspended_until_ms, a.permanently_banned, a.ban_reason,
      a.username, a.email, p.id AS player_id, p.name AS player_name, p.role AS player_role,
      p.area AS player_area, p.level AS player_level,
      presence.instance_id, presence.token_hash AS presence_token_hash, presence.expires_at_ms AS presence_expires_at_ms, presence.chat_after_id
     FROM auth_sessions s
     JOIN accounts a ON a.id = s.account_id
     LEFT JOIN players p ON p.account_id = a.id
     LEFT JOIN game_presence presence ON presence.account_id = a.id
     WHERE s.token_hash = ? AND s.expires_at > ?
     LIMIT 1`,
  ).bind(tokenHash, now).first<{
    token_hash: string;
    account_id: string;
    csrf_hash: string;
    expires_at: number;
    last_seen_at: number;
    security_version: number;
    account_security_version: number;
    suspended_until_ms: number;
    permanently_banned: number;
    ban_reason: string;
    username: string;
    email: string;
    player_id: string | null;
    player_name: string | null;
    player_role: string | null;
    player_area: string | null;
    player_level: number | null;
    instance_id: string | null;
    presence_token_hash: string | null;
    presence_expires_at_ms: number | null;
    chat_after_id: number | null;
  }>();
  if (!record) return null;
  if (record.security_version !== record.account_security_version) return null;
  if (record.permanently_banned || record.suspended_until_ms > Date.now()) {
    throw new AuthRequestError(423, "account_suspended", record.ban_reason || "Hesabın güvenlik nedeniyle geçici olarak askıya alındı.");
  }

  if (record.last_seen_at <= now - SESSION_TOUCH_INTERVAL_SECONDS) {
    await authDatabase().prepare(
      "UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ? AND last_seen_at <= ?",
    ).bind(now, tokenHash, now - SESSION_TOUCH_INTERVAL_SECONDS).run();
  }

  return {
    tokenHash: record.token_hash,
    gamePresence: record.instance_id ? { instanceId: record.instance_id, tokenHash: record.presence_token_hash ?? "", expiresAtMs: record.presence_expires_at_ms ?? 0, chatAfterId: record.chat_after_id ?? 0 } : undefined,
    account: { id: record.account_id, username: record.username, email: record.email },
    player: record.player_id && record.player_name && record.player_role
      ? { id: record.player_id, name: record.player_name, role: record.player_role }
      : null,
    playerAccess: record.player_id && record.player_area !== null && record.player_level !== null
      ? { area: record.player_area, level: record.player_level }
      : null,
    csrfHash: record.csrf_hash,
    expiresAt: record.expires_at,
    lastSeenAt: record.last_seen_at,
    securityVersion: record.security_version,
  };
}

export async function requireGameSession(request: Request, onLookup?: (tokenHash: string) => void) {
  return validateGameSession(request, await getGameSession(request, onLookup));
}

export async function requireRealtimeGameSession(request: Request, tokenHash: string) {
  if ((env as unknown as { CORE_RUNTIME?: string }).CORE_RUNTIME !== "vds")
    throw new AuthRequestError(403, "invalid_movement_transport", "Hareket bağlantısı doğrulanamadı.");
  return validateGameSession(request, await getGameSessionByHash(tokenHash));
}

async function validateGameSession(request: Request, session: GameSession | null) {
  if (!session) throw new AuthRequestError(401, "authentication_required", "Oturum açmalısın.");
  const realm=realmRuntime(),path=new URL(request.url).pathname;
  if(realm?.role==='accounts')throw new AuthRequestError(403,'realm_required','Önce sunucu seçmelisin.');
  if(realm?.role==='game'){
    if(realm.realm.status!=='open'||realm.policy?.status&&realm.policy.status!=='open')throw new AuthRequestError(503,'realm_closed','Sunucu kapalı.');
    // All game hot paths share the bounded 30-second security gate. Valid
    // entries return synchronously; near-expiry refresh is single-flight and
    // background. Missing/expired entries still require successful validation.
    const decision=realm.security.authorize(session.account.id,session.securityVersion);
    const allowed=typeof decision==='boolean'?decision:await decision;
    if(realm.policy?.status!=='open')throw new AuthRequestError(503,'realm_closed','Sunucu kapalı.');
    if(!allowed)throw new AuthRequestError(401,'security_verification_required','Oturumunu yeniden doğrula.');
  }
  const launch=(globalThis as any).__colLaunch;
  // Realm security already checks the central launch permission at the same
  // authorization boundary. A second wall-clock check can expire between the
  // two checks and mislabel an authorized request as launch_locked.
  if(realm?.role!=='game' && launch && !launch.status(session.account.id).canPlay)throw new AuthRequestError(403,"launch_locked","Oyun henüz erişime açık değil. Açılış ekranına dön.");
  if (isGameApi(new URL(request.url).pathname)) {
    const presence = session.gamePresence;
    if (!presence || presence.instanceId !== readGameInstance(request) || presence.tokenHash !== session.tokenHash || presence.expiresAtMs <= Date.now()) {
      throw new AuthRequestError(409, "game_instance_expired", "Bu oyun penceresinin oturumu açık değil. Yeniden bağlan.");
    }
  }
  const pathname=new URL(request.url).pathname;
  const bot=(globalThis as any).__colBotCheck;
  if(bot?.prepare && session.player){const pending=bot.prepare(session.account.id);if(pending)await pending;}
  if(bot && session.player && !["/api/bot-check","/api/game-presence","/api/auth/logout","/api/support"].includes(pathname) && (request.method!=="GET" || pathname.startsWith("/api/realtime/")) && bot.required(session.account.id)) throw new AuthRequestError(403,"bot_check_required","Devam etmek için bot doğrulamasını tamamla.");
  if(session.player && session.playerAccess?.area?.startsWith('guild_')){
    const {guildVillageService,publishGuildEjections}=await import('./guild-village-runtime');
    const repair=guildVillageService()?.repair(session.player.id);
    if(repair){session.playerAccess.area=repair.area;await publishGuildEjections([repair]);}
  }
  return session;
}

export async function assertCsrf(request: Request, session: GameSession) {
  assertSameOrigin(request);
  const cookieToken = csrfTokenFromRequest(request);
  const headerToken = request.headers.get("X-CSRF-Token");
  if (!validOpaqueToken(cookieToken) || !validOpaqueToken(headerToken) || !cookieToken || !headerToken) {
    throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
  }
  if (!timingSafeEqual(encoder.encode(cookieToken), encoder.encode(headerToken))) {
    throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
  }
  const submittedHash = await sha256(headerToken);
  if (!timingSafeEqual(encoder.encode(submittedHash), encoder.encode(session.csrfHash))) {
    throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
  }
}

export async function createSession(accountId: string): Promise<NewSession> {
  const sessionToken = generateOpaqueToken();
  const csrfToken = generateOpaqueToken();
  const tokenHash = await sha256(sessionToken);
  const csrfHash = await sha256(csrfToken);
  const nowMs = Date.now();
  const now = Math.floor(nowMs / 1000);
  const expiresAt = now + SESSION_LIFETIME_SECONDS;
  const database = authDatabase();
  const account = await database.prepare(
    "SELECT security_version, suspended_until_ms, permanently_banned, ban_reason FROM accounts WHERE id = ? LIMIT 1",
  ).bind(accountId).first<{ security_version: number; suspended_until_ms: number; permanently_banned: number; ban_reason: string }>();
  if (!account) throw new AuthRequestError(401, "invalid_credentials", "Giriş bilgileri doğrulanamadı.");
  if (account.permanently_banned || account.suspended_until_ms > nowMs) {
    throw new AuthRequestError(423, "account_suspended", account.ban_reason || "Hesabın güvenlik nedeniyle askıya alındı.");
  }
  if(realmRuntime()?.role==='accounts'){
    // Central login does not revoke sessions in either realm.
    await database.batch([
      database.prepare('DELETE FROM auth_sessions WHERE expires_at<=?').bind(now),
      database.prepare('DELETE FROM auth_sessions WHERE account_id=?').bind(accountId),
      database.prepare(`INSERT INTO auth_sessions(token_hash,account_id,csrf_hash,security_version,created_at,last_seen_at,expires_at)
        SELECT ?,id,?,security_version,?,?,? FROM accounts WHERE id=? AND permanently_banned=0 AND suspended_until_ms<=?`)
        .bind(tokenHash,csrfHash,now,now,expiresAt,accountId,nowMs),
    ]);
    return {sessionToken,csrfToken,expiresAt};
  }
  const sessionBatch = await database.batch([
    database.prepare("DELETE FROM auth_sessions WHERE expires_at <= ?").bind(now),
    // Keep the first active device intact; all writes share the same guard.
    database.prepare(`UPDATE accounts SET security_version = security_version + 1, updated_at = ? WHERE id = ?
      AND NOT EXISTS (SELECT 1 FROM game_presence WHERE account_id = ? AND expires_at_ms > ?)`)
      .bind(now, accountId, accountId, nowMs),
    database.prepare(`DELETE FROM auth_sessions WHERE account_id = ?
      AND NOT EXISTS (SELECT 1 FROM game_presence WHERE account_id = ? AND expires_at_ms > ?)`)
      .bind(accountId, accountId, nowMs),
    database.prepare(
      `INSERT INTO auth_sessions (token_hash, account_id, csrf_hash, security_version, created_at, last_seen_at, expires_at)
       SELECT ?, id, ?, security_version, ?, ?, ? FROM accounts
       WHERE id = ? AND permanently_banned = 0 AND suspended_until_ms <= ?
         AND NOT EXISTS (SELECT 1 FROM game_presence WHERE account_id = ? AND expires_at_ms > ?)`,
    ).bind(tokenHash, csrfHash, now, now, expiresAt, accountId, nowMs, accountId, nowMs),
  ]);
  if (!sessionBatch.at(-1)?.meta.changes) {
    throw new AuthRequestError(409, "game_already_open", "Bu hesap başka bir cihazda açık. Önce oradaki oyunu kapat; bağlantı koptuysa 45 saniye sonra tekrar dene.");
  }
  return { sessionToken, csrfToken, expiresAt };
}

export async function deleteCurrentSession(request: Request) {
  const sessionToken = cookieValue(request, authCookieNames(request).session);
  if (!validOpaqueToken(sessionToken) || !sessionToken) return;
  const tokenHash = await sha256(sessionToken);
  const database = authDatabase();
  if(realmRuntime()){
    const session=await getGameSession(request);
    await database.batch([
      database.prepare('DELETE FROM auth_sessions WHERE token_hash=?').bind(tokenHash),
      ...(realmRuntime().role==='game'?[database.prepare('DELETE FROM game_presence WHERE token_hash=?').bind(tokenHash)]:[]),
    ]);
    if(session&&realmRuntime().role==='game')realmRuntime().security.forget(session.account.id);
    return;
  }
  await database.batch([
    database.prepare(
      `UPDATE accounts SET security_version = security_version + 1, updated_at = ?
       WHERE id = (SELECT account_id FROM auth_sessions WHERE token_hash = ?)`,
    ).bind(nowSeconds(), tokenHash),
    database.prepare("DELETE FROM auth_sessions WHERE token_hash = ?").bind(tokenHash),
    database.prepare("DELETE FROM game_presence WHERE token_hash = ?").bind(tokenHash),
  ]);
}

function serializeCookie(name: string, value: string, maxAge: number, httpOnly: boolean, secure: boolean) {
  return [
    `${name}=${value}`,
    "Path=/",
    `Max-Age=${maxAge}`,
    secure ? "Secure" : "",
    httpOnly ? "HttpOnly" : "",
    "SameSite=Lax",
  ].filter(Boolean).join("; ");
}

export function sessionResponseHeaders(session: NewSession, request: Request) {
  const headers = noStoreHeaders();
  const maxAge = Math.max(0, session.expiresAt - nowSeconds());
  const cookies = authCookieNames(request);
  headers.append("Set-Cookie", serializeCookie(cookies.session, session.sessionToken, maxAge, true, cookies.secure));
  headers.append("Set-Cookie", serializeCookie(cookies.csrf, session.csrfToken, maxAge, false, cookies.secure));
  return headers;
}

export function clearedSessionResponseHeaders(request: Request) {
  const headers = noStoreHeaders();
  const expired = "Expires=Thu, 01 Jan 1970 00:00:00 GMT";
  const cookies = authCookieNames(request);
  headers.append("Set-Cookie", serializeCookie(cookies.session, "", 0, true, cookies.secure) + `; ${expired}`);
  headers.append("Set-Cookie", serializeCookie(cookies.csrf, "", 0, false, cookies.secure) + `; ${expired}`);
  return headers;
}

export function noStoreHeaders(initial?: HeadersInit) {
  const headers = new Headers(initial);
  headers.set("Cache-Control", "no-store, max-age=0");
  headers.set("Pragma", "no-cache");
  return headers;
}

export function clientIp(request: Request) {
  const cloudflareIp = request.headers.get("CF-Connecting-IP")?.trim();
  if (cloudflareIp) return cloudflareIp.slice(0, 128);
  const forwardedIp = request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim();
  return (forwardedIp || "unknown").slice(0, 128);
}

export type RateLimitOptions = {
  limit: number;
  windowSeconds: number;
  blockSeconds: number;
};

let nextRateLimitCleanupAt = 0;

export async function enforceRateLimit(
  scope: string,
  identifier: string,
  { limit, windowSeconds, blockSeconds }: RateLimitOptions,
) {
  const now = nowSeconds();
  const cutoff = now - windowSeconds;
  const key = await sha256(`${scope}:${identifier}`);
  const database = authDatabase();
  const cleanupDue = now >= nextRateLimitCleanupAt;
  if (cleanupDue) nextRateLimitCleanupAt = now + 60 * 60;
  const statements = [
    ...(cleanupDue ? [database.prepare(
      "DELETE FROM auth_rate_limits WHERE blocked_until <= ? AND window_started_at <= ?",
    ).bind(now, now - 24 * 60 * 60)] : []),
    database.prepare(
    `INSERT INTO auth_rate_limits (key, attempts, window_started_at, blocked_until)
     VALUES (?, 1, ?, 0)
     ON CONFLICT(key) DO UPDATE SET
       attempts = CASE
         WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.attempts
         WHEN auth_rate_limits.window_started_at <= ? THEN 1
         ELSE auth_rate_limits.attempts + 1
       END,
       window_started_at = CASE
         WHEN auth_rate_limits.window_started_at <= ? THEN ?
         ELSE auth_rate_limits.window_started_at
       END,
       blocked_until = CASE
         WHEN auth_rate_limits.blocked_until > ? THEN auth_rate_limits.blocked_until
         WHEN auth_rate_limits.window_started_at > ? AND auth_rate_limits.attempts + 1 > ? THEN ?
         ELSE 0
       END
     RETURNING attempts, blocked_until`,
    ).bind(
    key,
    now,
    now,
    cutoff,
    cutoff,
    now,
    now,
    cutoff,
    limit,
    now + blockSeconds,
    ),
  ];
  const responses = await database.batch(statements);
  const rateResult = responses[responses.length - 1];
  const result = rateResult.results[0] as { attempts: number; blocked_until: number } | undefined;

  if (!result || result.blocked_until > now || result.attempts > limit) {
    const retryAfter = Math.max(1, (result?.blocked_until ?? now + blockSeconds) - now);
    throw new AuthRequestError(429, "rate_limited", "Çok fazla deneme yaptın. Bir süre sonra tekrar dene.", retryAfter);
  }
}

export async function clearRateLimit(scope: string, identifier: string) {
  const key = await sha256(`${scope}:${identifier}`);
  await authDatabase().prepare("DELETE FROM auth_rate_limits WHERE key = ?").bind(key).run();
}

export function authErrorResponse(error: unknown, fallback = "İşlem şu anda tamamlanamadı.") {
  if (error instanceof Error && error.message.includes("channel_full")) return Response.json({code:"channel_full",error:"Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."},{status:409,headers:noStoreHeaders()});
  if (error instanceof AuthRequestError) {
    const headers = noStoreHeaders();
    if (error.retryAfter) headers.set("Retry-After", String(error.retryAfter));
    return Response.json({ error: error.message, code: error.code }, { status: error.status, headers });
  }
  console.error("Auth operation failed", error instanceof Error ? error.message : "unknown error");
  return Response.json({ error: fallback }, { status: 500, headers: noStoreHeaders() });
}

export function isUniqueConstraintError(error: unknown) {
  return error instanceof Error && /UNIQUE constraint failed|SQLITE_CONSTRAINT_UNIQUE/i.test(error.message);
}

export function accountPayload(account: AccountSummary, player: PlayerSummary | null, csrfToken?: string | null) {
  return {
    authenticated: true as const,
    realmSelection: realmRuntime()?.role==='accounts',
    ...(realmRuntime()?.role==='game'?{realmId:realmRuntime().id,authOrigin:realmRuntime().authOrigin}:{}),
    account: {...account,realmAdmin:realmRuntime()?.role==='accounts'&&!!env.ADMIN_USER_ID&&account.id===env.ADMIN_USER_ID},
    player,
    ...(csrfToken ? { csrfToken } : {}),
  };
}
