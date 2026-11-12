// Shared by full HTTP snapshots and the native push reader. Keep visibility,
// ordering, limits and selected fields identical on both delivery paths.
export const WORLD_CHAT_SQL="SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND (scope = 'world' OR (scope = 'regional' AND area = ? AND channel = ?)) AND announcement_expires_at_ms = 0 AND id > ? ORDER BY id DESC LIMIT 60";
export const REGIONAL_CHAT_SQL="SELECT id, player_id, player_name, item_snapshot, body, created_at FROM messages WHERE scope = 'regional' AND area = ? AND channel = ? AND created_at >= ? AND id > ? ORDER BY id DESC LIMIT 30";
export const MARKET_LISTINGS_SQL="SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings ORDER BY created_at DESC LIMIT 250";
export const SHARED_SHOPS_SQL=`SELECT id, owner_id, owner_name, name, x, y, channel, active, created_at,
 (SELECT stall_skin_enabled FROM players WHERE players.id=market_shops.owner_id) AS stall_skin_enabled,
 ((SELECT COUNT(*) FROM market_listings WHERE shop_id=market_shops.id)+(SELECT COUNT(*) FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))) AS hasListings
 FROM market_shops WHERE active=1 AND created_at>CAST(strftime('%s','now') AS INTEGER)-172800 ORDER BY created_at`;
