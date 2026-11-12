export const WORLD_CHAT_INTERVAL_SECONDS = 5;
export const LAST_WORLD_CHAT_SQL = `SELECT MAX(created_at) AS sent_at FROM messages
 WHERE player_id=? AND scope IN ('world','trade') AND recipient_id IS NULL AND announcement_expires_at_ms=0`;
// One statement serializes competing tabs and ordinary / item-linked messages.
export const INSERT_CHAT_SQL = `INSERT INTO messages
 (player_id,player_name,recipient_id,scope,area,channel,body,created_at)
 SELECT ?,?,?,?,?,?,?,? WHERE ? NOT IN ('world','trade') OR NOT EXISTS (
 SELECT 1 FROM messages WHERE player_id=? AND scope IN ('world','trade') AND recipient_id IS NULL
 AND announcement_expires_at_ms=0 AND created_at>?)
 RETURNING id,player_id,player_name,recipient_id,scope,area,channel,body,created_at`;
export function worldChatRetryAfter(sentAt,now){return sentAt==null?0:Math.max(0,Math.ceil(Number(sentAt)+WORLD_CHAT_INTERVAL_SECONDS-now));}
export class WorldChatCooldownError extends Error {
 constructor(seconds){super(`Dünya ve Ticaret sohbetinde iki mesaj arasında 5 saniye beklemelisin. ${Math.max(1,seconds)} saniye sonra tekrar gönderebilirsin.`);this.code="world_chat_cooldown";this.retryAfterSeconds=Math.max(1,seconds);}
}

export function isWorldChatCooldownError(error){return error instanceof Error&&error.code==="world_chat_cooldown"&&Number.isFinite(error.retryAfterSeconds);}
