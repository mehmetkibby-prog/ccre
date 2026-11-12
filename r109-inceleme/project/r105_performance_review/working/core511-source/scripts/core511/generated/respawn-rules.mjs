import {RUNE_V2_BOSS_SPAWN} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {colLabIsMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabMonsterActive} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {isRuneV2Boss as nativeRuneV2Boss} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
const ambient=globalThis;
export function createRespawnRules({globals,random=ambient.Math.random,fourChannels=true}){
const globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;
const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");
var ENCHANT_TIERS = [
 ['forest_power','Kuzey Ormanı gücü',[2,4,8,10],10],
 ['frozen_power','Donmuş Çam gücü',[2,4,8,10],10],
 ['fire','Ateş',[2,4,8,10],80], ['ice','Buz',[2,4,8,10],80],
 ['sword_defense','Kılıç savunması',[2,4,9,12],80],
 ['arrow_defense','Ok savunması',[2,4,9,12],80],
 ['magic_defense','Büyü savunması',[2,4,9,12],80],
 ['strong_players','Oyunculara karşı güç',[2,4,8,10],80],
 ['resistant_players','Oyunculara karşı savunma',[2,4,9,12],80],
 ['critical','Kritik şansı',[1,2,4,6],80],
 ['attack_speed','Saldırı hızı',[2,4,8,10],80],
 ['cast_speed','Büyü Hızı',[4,8,16,20],50],
 ['life_steal','Can çalma',[3,6,12,15],15],
 ['attack_block','Saldırı bloklama',[3,6,12,15],15],
 ['hp','Azami can',[60,120,240,300],1000000],
];
var TIER_SUFFIXES = ['one','two','four','five'];
var tierKeys = kind => TIER_SUFFIXES.map(suffix=>`enchant_${kind}_tier_${suffix}`);
var ENCHANT_TIER_DEFAULTS = Object.fromEntries(ENCHANT_TIERS.flatMap(([kind,,values])=>tierKeys(kind).map((key,i)=>[key,values[i]])));
var ANCIENT_BOSS_SPAWN = Object.freeze({
	x: 1800,
	y: 1650
});
var FROZEN_WATER_SPAWN = Object.freeze({
	x: 4095,
	y: 1110
});
var FROZEN_BOSS_SPAWN = {
	x: 2400,
	y: 1500
};
var EVOLUTION_DEFAULTS = {
	evolution_1_kills: 100,
	evolution_1_gems: 100,
	evolution_1_scrolls: 5,
	evolution_1_attack: 20,
	evolution_1_critical: 3,
	evolution_1_players: 5,
	evolution_2_kills: 350,
	evolution_2_gems: 250,
	evolution_2_scrolls: 25,
	evolution_2_attack: 50,
	evolution_2_critical: 5,
	evolution_2_players: 8,
	evolution_3_kills: 500,
	evolution_3_gems: 500,
	evolution_3_scrolls: 50,
	evolution_3_attack: 80,
	evolution_3_critical: 7,
	evolution_3_players: 12
};
function monsterBalanceKeyFor(monster) {
	if (monster.summoned || monster.is_boss || monster.is_stone) return null;
	if (monster.area === "black") {
		const slot = (fourChannels?/^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-4]-([1-8])$/:/^(?:golge|curuk|yutan)(?:-pack[23])?-black-c[1-3]-([1-8])$/).exec(monster.id)?.[1];
		return slot && monster.variant === "katil" ? `black.slot${slot}.katil` : null;
	}
	if (monster.area !== "ancient" && monster.area !== "afk" && monster.area !== "forest" && monster.area !== "frozen") return null;
	const family = monster.id.startsWith("golge-") ? "golge" : monster.id.startsWith("curuk-") ? "curuk" : monster.id.startsWith("yutan-") ? "yutan" : null;
	const variant = monster.variant === "normal" || monster.variant === "agresif" || monster.variant === "katil" ? monster.variant : null;
	if (monster.area === "ancient") return family && variant === "normal" ? `ancient.${family}.normal` : null;
	if (monster.area === "afk") return family && variant === "normal" ? `afk.${family}.normal` : null;
	return family && variant ? `${monster.area}.${family}.${variant}` : null;
}
var BOSS_SPAWN = {
	x: 1200,
	y: 690
};
function isBlackStoneBoss476(id){return id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4';}
var FROZEN_BOSS_ID = "frozen-boss-1";
var ANCIENT_BOSS_ID = "ancient-boss-1";
var FROZEN_WATER_ID_PREFIX = "frozen-water-c";
function isFrozenBossId(id) {
	return id === FROZEN_BOSS_ID;
}
function isAncientBossId(id) {
	return id === ANCIENT_BOSS_ID;
}
function isFrozenWaterId(id) {
	return typeof id === "string" && id.startsWith("frozen-water-c");
}
var DEFAULT_SETTINGS = {
	...ENCHANT_TIER_DEFAULTS,
	expansion65_enabled: 0,
	expansion65_preview_player_id: "",
	expansion65_revision: 0,
	ancient_golge_xp_reward: 400,
	ancient_curuk_xp_reward: 600,
	ancient_yutan_xp_reward: 800,
	ancient_monster_respawn_seconds: 25,
	beta_starts_at: 0,
	beta_ends_at: 0,
	...EVOLUTION_DEFAULTS,
	health_decay_per_second: .003,
	donation_health_per_essence: .02,
	boss_hp: 18e3,
	boss_respawn_seconds: 600,
	boss_duration_seconds: 300,
	regular_monster_damage_scale: .45,
	normal_variant_damage_scale: 1,
	aggressive_variant_damage_scale: 1.45,
	killer_variant_damage_scale: 2,
	boss_damage_scale: .3,
	shadow_wolf_hp: 220,
	rotten_guardian_hp: 340,
	essence_devourer_hp: 480,
	aggressive_variant_hp_scale: 1.7,
	killer_variant_hp_scale: 2.65,
	guardian_reward_gems: 20,
	guardian_reward_seconds: 3600,
	potion_essence_cost: 15,
	exchange_essence_cost: 100,
	exchange_gem_reward: 20,
	skill_upgrade_gem_cost: 5,
	xp_per_level: 125,
	shadow_wolf_xp_reward: 34,
	rotten_guardian_xp_reward: 46,
	essence_devourer_xp_reward: 58,
	aggressive_variant_xp_reward: 62,
	killer_variant_xp_reward: 95,
	frozen_shadow_wolf_xp_reward: 34,
	frozen_rotten_guardian_xp_reward: 46,
	frozen_essence_devourer_xp_reward: 58,
	frozen_aggressive_variant_xp_reward: 62,
	frozen_killer_variant_xp_reward: 95,
	black_monster_xp_reward: 95,
	afk_island_enabled: 0,
	afk_island_xp_reward: 10,
	afk_island_respawn_seconds: 12,
	sinsi_shadow_wolf_xp_reward: 62,
	sinsi_guardian_xp_reward: 62,
	sinsi_devourer_xp_reward: 95,
	sinsi_stone_xp_reward: 0,
	boss_xp_reward: 300,
	xp_base_cost: 50,
	xp_growth_per_level: 10,
	skill_two_unlock_level: 5,
	skill_three_unlock_level: 30,
	skill_two_cooldown_ms: 1e4,
	skill_three_cooldown_ms: 12e3,
	skill_damage_scale: .72,
	skill_one_multiplier: 1,
	skill_two_multiplier: 1.3,
	skill_three_multiplier: 1.75,
	skill_upgrade_damage_per_level: .04,
	boss_guaranteed_white_drops: 0,
	starter_weapon_power: 5,
	guardian_base_attack: 24,
	hunter_base_attack: 25,
	arcanist_base_attack: 27,
	base_critical_chance: .11,
	third_skill_critical_bonus: .11,
	critical_damage_multiplier: 1.45,
	wing_gem_cost: 100000,
	wing_attack_bonus: 30,
	wing_defense_bonus: 50,
	wing_critical_chance: .15,
	regular_blue_chance: .15,
	regular_orange_chance: .01,
	regular_red_chance: .001,
	regular_item_drop_chance: .71,
	regular_armor_chance: .5,
	boss_blue_chance: .2,
	boss_orange_chance: .03,
	boss_red_chance: .01,
	boss_armor_chance: .5,
	item_sale_white: 2,
	item_sale_blue: 8,
	item_sale_orange: 30,
	item_sale_red: 100,
	new_year_mode: 1,
	halloween_mode: 0,
	seasonal_themes_json: "{}",
	white_weapon_power_min: 5,
	white_weapon_power_max: 12,
	white_armor_power_min: 5,
	white_armor_power_max: 12,
	blue_weapon_power_min: 15,
	blue_weapon_power_max: 25,
	blue_armor_power_min: 15,
	blue_armor_power_max: 25,
	orange_weapon_power_min: 30,
	orange_weapon_power_max: 45,
	orange_armor_power_min: 30,
	orange_armor_power_max: 45,
	red_weapon_power_min: 60,
	red_weapon_power_max: 85,
	red_armor_power_min: 60,
	red_armor_power_max: 85,
	fishing_rod_cost: 100,
	fish_sokan_value: 1,
	fish_levrek_value: 3,
	fish_zargana_value: 5,
	fish_sokan_weight: 55,
	fish_levrek_weight: 30,
	fish_zargana_weight: 15,
	fishing_pearl_chance: .03,
	blacksmith_dust_cost: 250,
	blacksmith_pearl_cost: 25,
	blacksmith_gem_cost: 5e3,
	guild_create_level: 30,
	guild_create_gems: 500,
	stone_art_dust_cost: 20,
	stone_art_book_cost: 5,
	stone_art_gem_cost: 100,
	unique_weapon_power: 180,
	unique_armor_power: 150,
	channel_capacity: 25,
	sinsi_stone_unlock_level: 50,
	sinsi_stone_hp: 12e3,
	sinsi_stone_respawn_seconds: 180,
	sinsi_stone_wave_count: 3,
	sinsi_stone_summon_hp: 650,
	sinsi_stone_summon_damage_scale: .8,
	sinsi_stone_essence_min: 18,
	sinsi_stone_essence_max: 32,
	sinsi_stone_gear_drops: 1,
	sinsi_stone_dust_reward: 3,
	sinsi_stone_armor_chance: .5,
	sinsi_stone_blue_chance: .32,
	sinsi_stone_orange_chance: .06,
	sinsi_stone_red_chance: .01,
	enchant_item_chance: .72,
	enchant_one_chance: .15,
	enchant_two_chance: .45,
	enchant_three_chance: .36,
	enchant_four_chance: .04,
	enchant_forest_power_weight: 1,
	enchant_frozen_power_weight: 1,
	enchant_fire_weight: 1,
	enchant_ice_weight: 1,
	enchant_sword_defense_weight: 1,
	enchant_arrow_defense_weight: 1,
	enchant_magic_defense_weight: 1,
	enchant_strong_players_weight: .7,
	enchant_resistant_players_weight: .7,
	enchant_critical_weight: .8,
	enchant_attack_speed_weight: .8,enchant_cast_speed_weight: .8,
	enchant_life_steal_weight: .8,
	enchant_life_steal_min: 1,
	enchant_life_steal_max: 15,
	enchant_attack_block_weight: .7,
	enchant_attack_block_min: 1,
	enchant_attack_block_max: 15,
	enchant_hp_weight: 1,
	enchant_hp_tier_one: 60,
	enchant_hp_tier_two: 120,
	enchant_hp_tier_three: 180,
	enchant_fire_min: 5,
	enchant_fire_max: 10,
	enchant_ice_min: 5,
	enchant_ice_max: 10,
	enchant_sword_defense_min: 4,
	enchant_sword_defense_max: 12,
	enchant_arrow_defense_min: 4,
	enchant_arrow_defense_max: 12,
	enchant_magic_defense_min: 4,
	enchant_magic_defense_max: 12,
	enchant_strong_players_min: 4,
	enchant_strong_players_max: 12,
	enchant_resistant_players_min: 4,
	enchant_resistant_players_max: 12,
	enchant_critical_min: 2,
	enchant_critical_max: 6,
	enchant_attack_speed_min: 5,
	enchant_attack_speed_max: 7,
	boss_fire_interval_seconds: 7,
	boss_fire_damage_multiplier: 1.2,
	forest_monster_respawn_seconds: 18,
	frozen_monster_respawn_seconds: 18,
	black_monster_respawn_seconds: 18,
	player_max_hp: 100,
	rest_regen_percent: 4,
	rest_regen_combat_delay_seconds: 5,
	rest_regen_still_seconds: 2,
	monster_rest_regen_percent: 3,
	monster_rest_regen_combat_delay_seconds: 5,
	elemental_tick_count: 4,
	elemental_tick_interval_ms: 320,
	pvp_kill_reward_gems: 3,
	pvp_death_loss_gems: 1,
	pvp_respawn_seconds: 3,
	arena_1v1_reward_gems: 25,
	arena_2v2_reward_gems: 35,
	arena_3v3_reward_gems: 50,
	arena_5v5_reward_gems: 75,
	frozen_zone_enabled: 1,
	black_stone_boss_enabled:1,black_stone_boss_hp:26000,black_stone_boss_damage_scale:.42,black_stone_boss_respawn_seconds:600,black_stone_boss_xp_reward:500,black_stone_boss_reward_gems:12,
	frozen_boss_enabled: 1,
	frozen_boss_hp: 26e3,
	frozen_boss_damage_scale: .42,
	frozen_boss_respawn_seconds: 600,
	frozen_boss_xp_reward: 500,
	frozen_boss_reward_gems: 12,
	ancient_boss_enabled: 1,
	ancient_boss_hp: 26e3,
	ancient_boss_damage_scale: .42,
	ancient_boss_respawn_seconds: 2400,
	ancient_boss_xp_reward: 500,
	ancient_boss_reward_gems: 12,
	ancient_boss_purple_chance: .001,
	ancient_normal_purple_chance: .001,
	world_boss_purple_chance: 5e-4,
	frozen_boss_item_drop_chance: .75,
	frozen_boss_item_drop_count: 1,
	world_boss_stone_book_chance: .4,
	world_boss_stone_book_min: 1,
	world_boss_stone_book_max: 1,
	world_boss_evolution_scroll_chance: .4,
	world_boss_evolution_scroll_min: 1,
	world_boss_evolution_scroll_max: 1,
	frozen_boss_stone_book_chance: .3,
	frozen_boss_stone_book_min: 1,
	frozen_boss_stone_book_max: 1,
	frozen_boss_evolution_scroll_chance: .3,
	frozen_boss_evolution_scroll_min: 1,
	frozen_boss_evolution_scroll_max: 1,
	frozen_water_stone_book_chance: .15,
	frozen_water_stone_book_min: 1,
	frozen_water_stone_book_max: 1,
	frozen_water_evolution_scroll_chance: .15,
	frozen_water_evolution_scroll_min: 1,
	frozen_water_evolution_scroll_max: 1,
	frozen_water_enabled: 1,
	frozen_water_hp: 9e3,
	frozen_water_damage_scale: .28,
	frozen_water_respawn_seconds: 180,
	frozen_water_xp_reward: 180,
	frozen_water_reward_gems: 4,
	frozen_water_item_drop_chance: .35,
	frozen_water_item_drop_count: 1
};
function randomVariant() {
	const roll = Math.random();
	if (roll < .1) return "katil";
	if (roll < .4) return "agresif";
	return "normal";
}
function plan(database,settings,monsters,now){const due={results:monsters};const respawns = due.results.filter(monster=>colLabMonsterActive(monster)).map((monster) => {
 if(colLabIsMonster(monster.id))return database.prepare("UPDATE monsters SET hp=max_hp,respawn_at=0,despawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND loadlab_run_id<>'' AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=? RETURNING id").bind(monster.id,monster.spawn_round,monster.respawn_at,now);
 if(monster.area==='rune_v2'){const cfg=globalThis.__colRuneV2?.monster(monster);if(!cfg)throw Error('Karanlık Rün Sahili canavarı ayarı bulunamadı.');const boss484=isRuneV2Boss(monster.id);return database.prepare("UPDATE monsters SET name=?,hp=?,max_hp=?,variant=?,x=CASE WHEN ? THEN ? ELSE x END,y=CASE WHEN ? THEN ? ELSE y END,respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND area='rune_v2' AND loadlab_run_id='' AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(cfg.name,cfg.hp,cfg.hp,boss484?'rune_v2_boss':'normal',boss484?1:0,RUNE_V2_BOSS_SPAWN.x,boss484?1:0,RUNE_V2_BOSS_SPAWN.y,monster.id,monster.spawn_round,monster.respawn_at,now);}if(monster.area==='rune'){const cfg=globalThis.__colRunes?.monster(monster);if(!cfg)throw Error('Rün canavarı ayarı bulunamadı.');return database.prepare("UPDATE monsters SET hp=?,max_hp=?,variant='normal',respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(cfg.hp,cfg.hp,monster.id,monster.spawn_round,monster.respawn_at,now);}
		if (monster.summoned) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND summoned = 1 AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(monster.id, monster.spawn_round, monster.respawn_at, now);
		if (monster.is_stone) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, wave_stage = 0, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.sinsi_stone_hp, settings.sinsi_stone_hp, monster.id, monster.spawn_round, monster.respawn_at, now);
		if (monster.is_boss) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, respawn_at = 0, despawn_at = ?, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.boss_hp, settings.boss_hp, BOSS_SPAWN.x, BOSS_SPAWN.y, now + settings.boss_duration_seconds, monster.id, monster.spawn_round, monster.respawn_at, now);
		if(isBlackStoneBoss476(monster.id)){
   if(!settings.black_stone_boss_enabled)return database.prepare("UPDATE monsters SET respawn_at=0 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=?").bind(monster.id,monster.spawn_round,monster.respawn_at);
   return database.prepare("UPDATE monsters SET hp=?,max_hp=?,x=2700,y=1688,variant='stone_boss',respawn_at=0,spawn_round=spawn_round+1 WHERE id=? AND hp<=0 AND spawn_round=? AND respawn_at=? AND respawn_at<=?").bind(settings.black_stone_boss_hp,settings.black_stone_boss_hp,monster.id,monster.spawn_round,monster.respawn_at,now);
  }
  if (isFrozenBossId(monster.id)) {
			if (!settings.frozen_zone_enabled || !settings.frozen_boss_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.frozen_boss_hp, settings.frozen_boss_hp, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		if (isAncientBossId(monster.id)) {
			if (!settings.ancient_boss_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'ancient_boss', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.ancient_boss_hp, settings.ancient_boss_hp, ANCIENT_BOSS_SPAWN.x, ANCIENT_BOSS_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		if (isFrozenWaterId(monster.id)) {
			if (!settings.frozen_zone_enabled || !settings.frozen_water_enabled) return database.prepare("UPDATE monsters SET respawn_at = 0 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ?").bind(monster.id, monster.spawn_round, monster.respawn_at);
			return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, x = ?, y = ?, variant = 'frost_water', respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(settings.frozen_water_hp, settings.frozen_water_hp, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, monster.id, monster.spawn_round, monster.respawn_at, now);
		}
		const variant = monster.area === "ancient" || monster.area === "afk" ? "normal" : monster.area === "black" ? "katil" : randomVariant();
		const profileKey = monsterBalanceKeyFor({
			...monster,
			variant
		});
		const legacyBase = monster.id.startsWith("golge") ? settings.shadow_wolf_hp : monster.id.startsWith("curuk") ? settings.rotten_guardian_hp : settings.essence_devourer_hp;
		const legacyMultiplier = variant === "katil" ? settings.killer_variant_hp_scale : variant === "agresif" ? settings.aggressive_variant_hp_scale : 1;
		const legacyHp = monster.area === "black" ? 750 : Math.round(legacyBase * legacyMultiplier);
		if (!profileKey) return database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, variant = ?, respawn_at = 0, spawn_round = spawn_round + 1 WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?").bind(legacyHp, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
		return database.prepare(`UPDATE monsters SET
         hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         max_hp = COALESCE((SELECT max_hp FROM all_monster_combat_profiles WHERE profile_key = ?), ?),
         variant = ?, respawn_at = 0, spawn_round = spawn_round + 1
       WHERE id = ? AND hp <= 0 AND spawn_round = ? AND respawn_at = ? AND respawn_at <= ?`).bind(profileKey, legacyHp, profileKey, legacyHp, variant, monster.id, monster.spawn_round, monster.respawn_at, now);
	});
return respawns;}
function repairPlan(database,now){return [
		database.prepare(`DELETE FROM monsters
       WHERE summoned = 1 AND hp <= 0 AND respawn_at <= 0
         AND EXISTS (
           SELECT 1 FROM monsters parent
           WHERE parent.id = monsters.parent_stone_id
             AND parent.spawn_round > monsters.spawn_round
         )`),
		database.prepare(`UPDATE market_shops SET active = 0
       WHERE active = 1 AND created_at <= ?
         AND (created_at <= ? OR (NOT EXISTS (SELECT 1 FROM market_listings WHERE shop_id = market_shops.id) AND NOT EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))))`).bind(now - 120,now - 172800),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + CASE WHEN area = 'forest' THEN COALESCE((SELECT forest_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'frozen' THEN COALESCE((SELECT frozen_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'ancient' THEN COALESCE((SELECT ancient_monster_respawn_seconds FROM combat_settings WHERE id=1),25) WHEN area = 'black' THEN COALESCE((SELECT black_monster_respawn_seconds FROM combat_settings WHERE id=1),18) WHEN area = 'afk' THEN COALESCE((SELECT afk_island_respawn_seconds FROM combat_settings WHERE id=1),12) ELSE 18 END
       WHERE area!='event' AND summoned = 0 AND hp <= 0 AND respawn_at <= 0 AND is_boss = 0 AND is_stone = 0
         AND id != ? AND id != ? AND id NOT LIKE ? AND id != 'dragon-world-1' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3')`).bind(now, FROZEN_BOSS_ID, ANCIENT_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.frozen_boss_respawn_seconds, FROZEN_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp=0,respawn_at=?+COALESCE((SELECT black_stone_boss_respawn_seconds FROM combat_settings WHERE id=1),600) WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND hp<=0 AND respawn_at<=0 AND COALESCE((SELECT black_stone_boss_enabled FROM combat_settings WHERE id=1),1)=1`).bind(now),
		database.prepare(`UPDATE monsters SET hp=0,respawn_at=0 WHERE id IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND COALESCE((SELECT black_stone_boss_enabled FROM combat_settings WHERE id=1),1)=0`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT ancient_boss_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id = ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.ancient_boss_respawn_seconds, ANCIENT_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = 0 WHERE id = ?
         AND COALESCE((SELECT ancient_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0`).bind(ANCIENT_BOSS_ID),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE(
         (SELECT frozen_water_respawn_seconds FROM combat_settings WHERE id = 1), ?)
       WHERE id LIKE ? AND hp <= 0 AND respawn_at <= 0
         AND COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 1
         AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 1`).bind(now, DEFAULT_SETTINGS.frozen_water_respawn_seconds, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = 0
       WHERE (id = ? OR id LIKE ?)
         AND (COALESCE((SELECT frozen_zone_enabled FROM combat_settings WHERE id = 1), 1) = 0
           OR (id = ? AND COALESCE((SELECT frozen_boss_enabled FROM combat_settings WHERE id = 1), 1) = 0)
           OR (id LIKE ? AND COALESCE((SELECT frozen_water_enabled FROM combat_settings WHERE id = 1), 1) = 0))`).bind(FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`, FROZEN_BOSS_ID, `${FROZEN_WATER_ID_PREFIX}%`),
		database.prepare(`UPDATE monsters SET hp = 0, respawn_at = ? + COALESCE((SELECT sinsi_stone_respawn_seconds FROM game_settings WHERE id = 1), ?)
       WHERE hp <= 0 AND respawn_at <= 0 AND is_stone = 1`).bind(now, DEFAULT_SETTINGS.sinsi_stone_respawn_seconds)
	];}
function despawnPlan(database,settings,now){return [database.prepare("UPDATE monsters SET hp = 0, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1 AND loadlab_run_id='' AND hp > 0 AND despawn_at > 0 AND despawn_at <= ?").bind(now + settings.boss_respawn_seconds, now)];}
function scoped(database,statements,channel,ids){return statements.filter(s=>/^(UPDATE|DELETE FROM) monsters/i.test(s.sql.trim())).map(s=>{const sql=fourChannels?s.sql.replaceAll("'stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3'","'stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3','stone-boss-black-c4'"):s.sql;return database.prepare(sql+" AND monsters.channel=? AND monsters.id IN ("+ids.map(()=>"?").join(",")+")").bind(...s.params,channel,...ids);});}
return {plan,repairPlan,despawnPlan,scoped,defaults:DEFAULT_SETTINGS};
}
