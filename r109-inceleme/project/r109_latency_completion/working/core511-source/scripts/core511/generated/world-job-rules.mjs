const ambient=globalThis;
export function createWorldJobRules({globals={},now=ambient.Date.now,uuid=()=>ambient.crypto.randomUUID(),fourChannels=true}={}){
const globalThis=globals,Date={now},crypto={randomUUID:uuid};
var ANCIENT_BOSS_SPAWN = Object.freeze({
	x: 1800,
	y: 1650
});
var FROZEN_WATER_SPAWN = Object.freeze({
	x: 4095,
	y: 1110
});
var BAZAAR_SPAWN = {
	x: 1200,
	y: 920
};
var FROZEN_BOSS_SPAWN = {
	x: 2400,
	y: 1500
};
var BOSS_SPAWN = {
	x: 1200,
	y: 690
};
var FROZEN_BOSS_ID = "frozen-boss-1";
var ANCIENT_BOSS_ID = "ancient-boss-1";
var FROZEN_WATER_ID_PREFIX = "frozen-water-c";
function upkeep(database,settings,now){return database.batch([...[database.prepare("UPDATE world_state SET health = MAX(0, health - MAX(0, ? - updated_at) * ?), updated_at = ? WHERE id = 1 AND reset_at = 0 AND updated_at < ?").bind(now, settings.health_decay_per_second, now, now)],
...[database.prepare("UPDATE market_shops SET active=0 WHERE active=1 AND created_at<=? AND (created_at<=? OR (NOT EXISTS(SELECT 1 FROM market_listings WHERE shop_id=market_shops.id) AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))))").bind(now - 120,now - 172800)],
...[database.prepare("UPDATE world_state SET reset_at = ? WHERE id = 1 AND health <= 0 AND reset_at = 0").bind(now + 8), database.prepare("SELECT reset_at, cycle, guardian_reward_at FROM world_state WHERE id = 1")]]);}
function guardian(database,settings,state,now){let rewardAt = Number(state?.guardian_reward_at ?? 0);
	if (rewardAt <= 0) {
		const initializedAt = now + settings.guardian_reward_seconds;
		database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at <= 0 AND reset_at = 0").bind(initializedAt).run();
		rewardAt = initializedAt;
	}
	if (rewardAt <= now && !state?.reset_at) {
		const winner = database.prepare("SELECT id FROM players WHERE loadlab_run_id = '' AND contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 1").first();
		const nextRewardAt = now + settings.guardian_reward_seconds;
		if (!winner) {
			database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND reset_at = 0").bind(nextRewardAt, rewardAt).run();
			return;
		}
		const claimToken = crypto.randomUUID();
		database.batch([
			database.prepare(`INSERT INTO guardian_reward_claims (period_at, winner_id, gems, claim_token, awarded_at)
         SELECT ?, ?, ?, ?, ? WHERE EXISTS (
           SELECT 1 FROM world_state WHERE id = 1 AND guardian_reward_at = ? AND guardian_reward_at <= ? AND reset_at = 0
         ) ON CONFLICT(period_at) DO NOTHING`).bind(rewardAt, winner.id, settings.guardian_reward_gems, claimToken, now, rewardAt, now),
			database.prepare("UPDATE players SET gems = gems + ? WHERE id = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(settings.guardian_reward_gems, winner.id, claimToken),
			database.prepare("UPDATE players SET contribution = 0 WHERE EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(claimToken),
			database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at = ? AND EXISTS (SELECT 1 FROM guardian_reward_claims WHERE claim_token = ?)").bind(nextRewardAt, rewardAt, claimToken)
		]);
	}}
function reset(database,settings,state,now){
const original=database;database=fourChannels?{...original,prepare:sql=>original.prepare(sql.replaceAll("'stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3'","'stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3','stone-boss-black-c4'"))}:original;if (state?.reset_at && state.reset_at <= now) {
		const claimedResetAt = now + 30;
		const stateCycle = state.cycle ?? 0;
		const resetGate = "EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND cycle = ? AND reset_at = ?)";
		database.batch([
			database.prepare("UPDATE world_state SET reset_at = ? WHERE id = 1 AND reset_at = ? AND cycle = ? RETURNING cycle").bind(claimedResetAt, state.reset_at, stateCycle),
			database.prepare(`UPDATE arena_matches SET status = 'cancelled', updated_at_ms = ?
        WHERE (status IN ('waiting','countdown','active') OR (status = 'finished' AND settlement_token = ''))
          AND ${resetGate}`).bind(Date.now(), stateCycle, claimedResetAt),
			database.prepare(`UPDATE players SET hp = ?, max_hp = ?, hp_revision = hp_revision + 1, respawn_at_ms = 0, essence = MIN(essence,wheel_paid_essence), contribution = 0, xp = 0, level = 1, gems = MIN(gems,wheel_paid_gems), potions = MIN(potions,wheel_paid_potions), fifth_enchant_scrolls = 0, has_rod = 0, rod_equipped = 0, fish_sokan = 0, fish_levrek = 0, fish_zargana = 0, pearls = MIN(pearls,wheel_paid_pearls), stone_dust = 0, has_wings = CASE WHEN EXISTS(SELECT 1 FROM premium_receipts WHERE player_id=players.id AND ((action='buy' AND product='wings:1') OR (action='wheel_spin' AND json_extract(result,'$.wheel.rewardId')='wings_3d'))) OR EXISTS(SELECT 1 FROM support_pack_grants WHERE player_id=players.id) OR EXISTS(SELECT 1 FROM epin_codes WHERE redeemed_by_player_id=players.id AND status='redeemed' AND product_code NOT LIKE 'core-coins-%') THEN has_wings ELSE 0 END, wings_equipped=0, skill_one = 1, skill_two = 1, skill_three = 1, area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = CASE WHEN MAX(last_seen, CAST(movement_checked_at_ms / 1000 AS INTEGER), CAST(last_monster_hit_at / 1000 AS INTEGER)) >= CAST(strftime('%s','now') AS INTEGER) - 30 THEN CAST(strftime('%s','now') AS INTEGER) * 1000 ELSE movement_checked_at_ms END, movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1, realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE ${resetGate}`).bind(settings.player_max_hp, settings.player_max_hp, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_items WHERE premium_origin=0 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`UPDATE player_items SET equipped=0 WHERE premium_origin=1 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`UPDATE player_storage_items SET amount=json_extract(payload,'$.paid') WHERE storage_type='counter' AND premium_origin=1 AND json_type(payload,'$.paid') IS NOT NULL AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_storage_items WHERE premium_origin=0 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_pets WHERE kind IN ('dragon','starter') AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM player_stones WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM dungeon_materials WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM dungeon_wings WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM black_loot_chests WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM black_loot_attempts WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`INSERT INTO player_items (id, player_id, kind, item_name, rarity, power, role, equipped, created_at)
        SELECT 'starter-' || id, id, 'weapon',
          CASE role WHEN 'avci' THEN 'Acemi Yayı' WHEN 'arkanist' THEN 'Acemi Asası' ELSE 'Acemi Kılıcı' END,
          'white', ?, role, 1, ? FROM players WHERE ${resetGate}`).bind(settings.starter_weapon_power, now, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM world_drops WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM pve_engagements WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM messages WHERE recipient_id IS NULL AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monsters WHERE summoned = 1 AND ${resetGate}`).bind(stateCycle, claimedResetAt),
			...["forest","frozen","ancient","afk","event","rune","rune_v2"].flatMap((area) => [
				"golge",
				"curuk",
				"yutan"
			].map((family) => {
				const profileKey = `${area}.${family}.normal`;
				return database.prepare(`UPDATE monsters SET
             hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             max_hp = (SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?),
             respawn_at = 0, variant = 'normal', spawn_round = spawn_round + 1
           WHERE area = ? AND id LIKE ? AND is_boss = 0 AND is_stone = 0 AND summoned = 0
             AND EXISTS (SELECT 1 FROM all_monster_combat_profiles WHERE profile_key = ?) AND ${resetGate}`).bind(profileKey, profileKey, area, `${family}-%`, profileKey, stateCycle, claimedResetAt);
			})),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_boss_enabled ? settings.frozen_boss_hp : 0, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, FROZEN_BOSS_ID, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp=?,max_hp=?,x=2700,y=1688,respawn_at=0,variant='stone_boss',spawn_round=spawn_round+1 WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND ${resetGate}`).bind(settings.black_stone_boss_enabled?settings.black_stone_boss_hp:0,settings.black_stone_boss_hp,stateCycle,claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'ancient_boss', spawn_round = spawn_round + 1 WHERE id = ? AND ${resetGate}`).bind(settings.ancient_boss_enabled ? settings.ancient_boss_hp : 0, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, ANCIENT_BOSS_ID, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, variant = 'frost_water', spawn_round = spawn_round + 1 WHERE id LIKE ? AND ${resetGate}`).bind(settings.frozen_zone_enabled && settings.frozen_water_enabled ? settings.frozen_water_hp : 0, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, `${FROZEN_WATER_ID_PREFIX}%`, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE is_stone = 1 AND ${resetGate}`).bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, stateCycle, claimedResetAt),
			database.prepare(`UPDATE monsters SET hp = 0, max_hp = ?, x = ?, y = ?, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND ${resetGate}`).bind(settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_respawn_seconds, stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_participants WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monster_xp_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM boss_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM normal_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM normal_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM sinsi_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM sinsi_defeats WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM blacksmith_upgrades WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM monster_participants WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM combat_events WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM party_invites WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM party_members WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM parties WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM market_listings WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM market_shops WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM fishing_sessions WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM arena_queue WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM arena_announcements WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare(`DELETE FROM guardian_reward_claims WHERE ${resetGate}`).bind(stateCycle, claimedResetAt),
			database.prepare("UPDATE world_state SET health = 50, updated_at = ?, cycle = cycle + 1, reset_at = 0, guardian_reward_at = ? WHERE id = 1 AND cycle = ? AND reset_at = ?").bind(now, now + settings.guardian_reward_seconds, stateCycle, claimedResetAt)
		]);
		return;
	}}
return {upkeep,guardian,reset};
}
