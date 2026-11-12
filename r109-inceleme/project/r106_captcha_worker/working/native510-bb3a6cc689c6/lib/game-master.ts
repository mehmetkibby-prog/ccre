import { env } from "cloudflare:workers";
import { getChatGPTUser } from "@/app/chatgpt-auth";
import { AuthRequestError } from "@/lib/game-auth";
import { db } from "@/lib/game-world";
import { filterChatText } from "@/lib/profanity-storage";
import { publishRealtimeRoomEvent, publishRealtimeWorldEvent } from "@/lib/realtime-room";
import { cleanAnnouncementBody, GM_ANNOUNCEMENT_DURATION_MS, GM_ANNOUNCEMENT_MAX_SECONDS, GM_ANNOUNCEMENT_MAX_LENGTH, type GmAnnouncement } from "@/lib/gm-announcement";

export async function gameOwnerIdentity() {
  const user = await getChatGPTUser();
  const id = String(env.ADMIN_USER_ID ?? "").trim();
  const email = String(env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  if (!user || !((id && user.id === id) || (email && user.email.trim().toLowerCase() === email))) return null;
  return user.id || user.email;
}

export const ACTIVE_GM_ANNOUNCEMENT_SQL = `SELECT id, player_name, body, announcement_expires_at_ms
  FROM messages WHERE announcement_expires_at_ms > ? AND created_at<=unixepoch() ORDER BY id ASC LIMIT 1`;

// The server decides the author and privilege. The same conditional insert also
// prevents simultaneous announcements and a GM whose permission was just removed.
export const INSERT_GM_ANNOUNCEMENT_SQL = `INSERT INTO messages
  (player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms, announcement_request_id)
  SELECT ?, ?, NULL, 'world', NULL, 1, ?, CAST(? / 1000 AS INTEGER), ?, ?
  WHERE (? = 1 OR EXISTS (
    SELECT 1 FROM players p JOIN accounts a ON a.id = p.account_id
    WHERE p.id = ? AND p.account_id = ? AND p.is_gm = 1
      AND a.permanently_banned = 0 AND a.suspended_until_ms <= ?
  )) AND NOT EXISTS (SELECT 1 FROM messages WHERE announcement_expires_at_ms > ?)
  ON CONFLICT(player_id, announcement_request_id) DO NOTHING
  RETURNING id, player_id, player_name, recipient_id, scope, area, channel, body, created_at, announcement_expires_at_ms`;

type AnnouncementActor = { playerId: string; name: string; accountId: string; owner: boolean };
type StoredAnnouncement = GmAnnouncement & {
  player_id: string; recipient_id: null; scope: "world"; area: null; channel: number; created_at: number;
};

export async function sendGmAnnouncement(actor: AnnouncementActor, payload: Record<string, unknown>) {
  const durationSeconds = payload.durationSeconds === undefined ? GM_ANNOUNCEMENT_DURATION_MS / 1000 : payload.durationSeconds;
  if (typeof durationSeconds !== "number" || !Number.isInteger(durationSeconds) || durationSeconds < 1 || durationSeconds > GM_ANNOUNCEMENT_MAX_SECONDS) {
    throw new AuthRequestError(400, "invalid_announcement_duration", `Duyuru süresi 1–${GM_ANNOUNCEMENT_MAX_SECONDS} saniye arasında tam sayı olmalı.`);
  }
  const raw = cleanAnnouncementBody(payload.body);
  const requestId = typeof payload.requestId === "string" ? payload.requestId : "";
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(requestId)) throw new AuthRequestError(400, "invalid_request_id", "Duyuruyu yeniden göndermeyi dene.");
  if (!raw || raw.length > GM_ANNOUNCEMENT_MAX_LENGTH) throw new AuthRequestError(400, "invalid_announcement", "Duyuru 1–140 karakter arasında olmalı.");
  const body = await filterChatText(raw);
  const database = db();
  const previous = await database.prepare(
    "SELECT id, player_name, body, announcement_expires_at_ms FROM messages WHERE player_id = ? AND announcement_request_id = ?",
  ).bind(actor.playerId, requestId).first<GmAnnouncement>();
  if (previous) return { ok: true, announcement: previous, duplicate: true, serverNowMs: Date.now() };
  const now = Date.now();
  const [insert] = await database.batch([
    database.prepare(INSERT_GM_ANNOUNCEMENT_SQL).bind(
      actor.playerId, actor.name.slice(0, 40), body, now, now + durationSeconds * 1000, requestId,
      actor.owner ? 1 : 0, actor.playerId, actor.accountId, now, now,
    ),
    database.prepare(`INSERT INTO admin_audit_events (id, admin_account_id, action, target_account_id, detail_json, created_at_ms)
      SELECT 'gm-announcement-' || id, ?, 'gm_announcement', '', json_object('messageId', id), ?
      FROM messages WHERE player_id = ? AND announcement_request_id = ?
      ON CONFLICT(id) DO NOTHING`).bind(actor.accountId, now, actor.playerId, requestId),
  ]);
  const message = insert.results[0] as StoredAnnouncement | undefined;
  if (!message) {
    const duplicate = await database.prepare(
      "SELECT id, player_name, body, announcement_expires_at_ms FROM messages WHERE player_id = ? AND announcement_request_id = ?",
    ).bind(actor.playerId, requestId).first<GmAnnouncement>();
    if (duplicate) return { ok: true, announcement: duplicate, duplicate: true, serverNowMs: Date.now() };
    if (!actor.owner && !(await database.prepare("SELECT id FROM players WHERE id = ? AND account_id = ? AND is_gm = 1").bind(actor.playerId, actor.accountId).first())) {
      throw new AuthRequestError(403, "gm_required", "GM yetkin kaldırılmış. Duyuru gönderemezsin.");
    }
    throw new AuthRequestError(409, "announcement_active", "Şu anda bir duyuru gösteriliyor. Birkaç saniye sonra tekrar gönder.");
  }
  // Use the existing signed world-message envelope, supported by the deployed
  // VDS as well as Durable Object/SSE rooms. Ordinary chat cannot set this field.
  try {
    const [world, rooms] = await Promise.all([
      database.prepare("SELECT cycle FROM world_state WHERE id = 1").first<{ cycle: number }>(),
      database.prepare("SELECT DISTINCT channel, area, arena_match_id FROM players WHERE last_seen >= ?").bind(Math.floor(now / 1000) - 30).all<{ channel: number; area: string; arena_match_id: string }>(),
    ]);
    if (world) await publishRealtimeWorldEvent(world.cycle, rooms.results.map((room: { channel: number; area: string; arena_match_id: string }) => ({
      channel: room.channel, area: room.area, arenaMatchId: room.arena_match_id || undefined,
    })), { type: "chat_message", eventId: `chat-message:${message.id}`, chatScope: "world", cycle: world.cycle,
      serverAt: Date.now(), message });
  } catch (error) { console.warn("GM announcement realtime delivery failed; world snapshot delivery remains active.", error); }
  return { ok: true, announcement: message, serverNowMs: Date.now() };
}


type GmVisibilityRow = { id: string; is_gm: number; gm_invisible: number; gm_visibility_revision: number; channel: number; area: string; arena_match_id: string };

export async function publishGmVisibility(player: GmVisibilityRow) {
  const invisible = player.is_gm === 1 && player.gm_invisible === 1;
  // Dungeon keeps membership/rewards intact; only its viewer projection changes.
  (globalThis as any).__colDungeon?.setPlayerVisibility(player.id, invisible, player.gm_visibility_revision);
  const world = await db().prepare("SELECT cycle FROM world_state WHERE id = 1").first<{ cycle: number }>();
  if (!world) return false;
  return publishRealtimeRoomEvent(world.cycle, player.channel, player.area, {
    type: "gm_visibility", playerId: player.id, invisible,
    visibilityRevision: player.gm_visibility_revision,
  }, player.arena_match_id || undefined);
}

// The caller cannot choose another character, forge GM status or write a revision.
// The permission check is repeated inside the write, including ban/suspension.
export async function setGmVisibility(playerId: string, accountId: string, enabled: unknown) {
  if (typeof enabled !== "boolean") throw new AuthRequestError(400, "invalid_visibility", "Görünmezlik seçimi geçersiz.");
  const database = db();
  const player = await database.prepare(`UPDATE players SET gm_invisible = ?, gm_visibility_revision = gm_visibility_revision + 1
    WHERE id = ? AND account_id = ? AND is_gm = 1 AND account_id IN
      (SELECT id FROM accounts WHERE permanently_banned = 0 AND suspended_until_ms <= ?)
    RETURNING id, is_gm, gm_invisible, gm_visibility_revision, channel, area, arena_match_id`)
    .bind(enabled ? 1 : 0, playerId, accountId, Date.now()).first<GmVisibilityRow>();
  if (!player) throw new AuthRequestError(403, "gm_required", "Bu özellik yalnızca GM hesabına açık.");
  const delivered = await publishGmVisibility(player).catch(() => false);
  if (!delivered) {
    // Do not report successful concealment without live-transport confirmation.
    // Roll back only our write; a newer user/owner decision always wins.
    const restored = await database.prepare(`UPDATE players SET gm_invisible = 0, gm_visibility_revision = gm_visibility_revision + 1
      WHERE id = ? AND gm_visibility_revision = ?
      RETURNING id, is_gm, gm_invisible, gm_visibility_revision, channel, area, arena_match_id`)
      .bind(playerId, player.gm_visibility_revision).first<GmVisibilityRow>();
    if (restored) await publishGmVisibility(restored).catch(() => false);
    throw new AuthRequestError(503, "visibility_sync_failed", "Canlı görünmezlik bağlantısı doğrulanamadı. Birkaç saniye sonra tekrar dene.");
  }
  return { ok: true, invisible: enabled, visibilityRevision: player.gm_visibility_revision };
}
