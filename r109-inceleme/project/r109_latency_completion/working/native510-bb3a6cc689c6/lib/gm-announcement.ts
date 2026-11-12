export const GM_ANNOUNCEMENT_DURATION_MS = 10_000;
export const GM_ANNOUNCEMENT_MAX_SECONDS = 60;
export const GM_ANNOUNCEMENT_MAX_LENGTH = 140;

export type GmAnnouncement = {
  id: number;
  player_name: string;
  body: string;
  announcement_expires_at_ms: number;
};

export function parseGmAnnouncement(value: unknown): GmAnnouncement | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (!Number.isSafeInteger(row.id) || Number(row.id) < 1
    || typeof row.player_name !== "string" || !row.player_name || row.player_name.length > 40
    || typeof row.body !== "string" || !row.body.trim() || row.body.length > GM_ANNOUNCEMENT_MAX_LENGTH
    || !Number.isSafeInteger(row.announcement_expires_at_ms) || Number(row.announcement_expires_at_ms) < 1) return null;
  return { id: Number(row.id), player_name: row.player_name, body: row.body,
    announcement_expires_at_ms: Number(row.announcement_expires_at_ms) };
}

export function announcementRemainingMs(announcement: GmAnnouncement, serverNowMs: number) {
  if (!Number.isFinite(serverNowMs)) return 0;
  return Math.max(0, Math.min(GM_ANNOUNCEMENT_MAX_SECONDS * 1000, announcement.announcement_expires_at_ms - serverNowMs));
}

export function cleanAnnouncementBody(value: unknown) {
  return typeof value === "string"
    ? value.normalize("NFKC").replace(/[<>\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g, " ").replace(/\s+/g, " ").trim()
    : "";
}

export function gmBadgeOffset(nowMs: number, reducedMotion = false) {
  return reducedMotion ? 0 : Math.sin(nowMs * Math.PI * 2 / 3_600) * 4;
}
