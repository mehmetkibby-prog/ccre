import {EVENT_WORLD444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {RUNE_WORLD} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {eventWalkable444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {runeWalkable} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
export function createNativeContentRules(database,nowSeconds){const db=()=>database,nowSeconds$1=()=>nowSeconds;
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
var DRAGON_WORLD = Object.freeze({
	width: 3e3,
	height: 1875
});
var ANCIENT_WORLD = Object.freeze({
	width: 3600,
	height: 3600
});
var GUILD_VILLAGE_WORLD = Object.freeze({
	width: 3600,
	height: 2400
});
var GUILD_HALL_WORLD = Object.freeze({
	width: 2400,
	height: 1600
});
var GUILD_PLOTS = Object.freeze([
	[
		"Kuzeybatı Korusu",
		.26,
		.19
	],
	[
		"Kuzey Burnu",
		.51,
		.11
	],
	[
		"Doğu Kayalıkları",
		.73,
		.2
	],
	[
		"Gündoğumu Kıyısı",
		.84,
		.42
	],
	[
		"Güneydoğu Bahçesi",
		.76,
		.65
	],
	[
		"Güney Limanı",
		.5,
		.75
	],
	[
		"Batı Bahçesi",
		.26,
		.65
	],
	[
		"Günbatımı Kıyısı",
		.18,
		.41
	]
].map(([name, x, y], i) => ({
	slot: i + 1,
	name,
	x: x * 3600,
	y: y * 2400
})));
function guildArea(area) {
	if (typeof area !== "string") return null;
	const village = /^guild_village_([1-9][0-9]{0,3})$/.exec(area);
	if (village) return {
		kind: "village",
		district: Number(village[1])
	};
	const hall = /^guild_hall_([A-Za-z0-9-]{1,64})$/.exec(area);
	return hall ? {
		kind: "hall",
		guildId: hall[1]
	} : null;
}
function guildWalkable(area, x, y) {
	const room = guildArea(area);
	if (!room || !Number.isFinite(x) || !Number.isFinite(y)) return false;
	if (room.kind === "hall") return x >= 650 && x <= 1800 && y >= 460 && y <= 1370;
	return ((x - 1800) / 1510) ** 2 + ((y - 1240) / 1040) ** 2 <= 1 && !GUILD_PLOTS.some((p) => Math.abs(x - p.x) < 210 && y > p.y - 170 && y < p.y + 110);
}
var AFK_WORLD = Object.freeze({
	width: 5400,
	height: 3600
});
var FOREST_CORE_OBSTACLE = Object.freeze({
	x: 2700,
	y: 1707.5,
	radiusX: 76,
	radiusY: 48
});
function insideForestCore(x, y) {
	const c = FOREST_CORE_OBSTACLE;
	return ((x - c.x) / c.radiusX) ** 2 + ((y - c.y) / c.radiusY) ** 2 < 1;
}
var ANCIENT_CORE_OBSTACLE = Object.freeze({
	x: 1800,
	y: 1820,
	radiusX: 76,
	radiusY: 48
});
function insideAncientCore(x, y) {
	const c = ANCIENT_CORE_OBSTACLE;
	return ((x - c.x) / c.radiusX) ** 2 + ((y - c.y) / c.radiusY) ** 2 < 1;
}
var FROZEN_WATER_SPAWN = Object.freeze({
	x: 4095,
	y: 1110
});
var WAR_WORLD = {
	width: 3600,
	height: 2250
};
var COMMON_WORLD = {
	width: 2400,
	height: 1500
};
var BLACK_WORLD = {
	width: 5400,
	height: 3375
};
var BLACK_SPAWN = {
	x: 2700,
	y: 2925
};
var FOREST_WORLD = {
	width: 5400,
	height: 3375
};
var FROZEN_WORLD = {
	width: 4800,
	height: 3e3
};
var FOREST_CORE = {
	x: 2700,
	y: 1687.5
};
var FOREST_SPAWN = {
	x: 2700,
	y: 2025
};
var FROZEN_SPAWN = {
	x: 3525,
	y: 2325
};
var FROZEN_BOSS_SPAWN = {
	x: 2400,
	y: 1500
};
var FROZEN_LAKE = {
	x: 4170,
	y: 495,
	radiusX: 780,
	radiusY: 555
};
var FISHING_LAKE$1 = {
	x: 1200,
	y: 745,
	radiusX: 735,
	radiusY: 445
};
var FOREST_WALKABLE_POLYGON = [
	[45, 65],
	[5355, 65],
	[5355, 3330],
	[45, 3330]
];
function areaWorld(area) {if(area==='event')return EVENT_WORLD444;
 if(area==='rune'||area==='rune_v2')return RUNE_WORLD;
	const social = guildArea(area);
	if (social) return social.kind === "village" ? GUILD_VILLAGE_WORLD : GUILD_HALL_WORLD;
	if (area === "dragon") return DRAGON_WORLD;
	if (area === "afk") return AFK_WORLD;
	if (area === "ancient") return ANCIENT_WORLD;
	return area === "war" ? WAR_WORLD : area === "black" ? BLACK_WORLD : area === "frozen" ? FROZEN_WORLD : area === "forest" ? FOREST_WORLD : COMMON_WORLD;
}
function insideForestBounds(x, y) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
	let inside = false;
	for (let index = 0, previous = FOREST_WALKABLE_POLYGON.length - 1; index < FOREST_WALKABLE_POLYGON.length; previous = index, index += 1) {
		const [x1, y1] = FOREST_WALKABLE_POLYGON[index];
		const [x2, y2] = FOREST_WALKABLE_POLYGON[previous];
		const cross = (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);
		if (Math.abs(cross) < 1e-7 && x >= Math.min(x1, x2) && x <= Math.max(x1, x2) && y >= Math.min(y1, y2) && y <= Math.max(y1, y2)) return true;
		if (y1 > y !== y2 > y && x < (x2 - x1) * (y - y1) / (y2 - y1) + x1) inside = !inside;
	}
	return inside;
}
function isForestWalkablePosition(x, y) {
	return insideForestBounds(x, y) && !insideForestCore(x, y);
}
function isFrozenWalkablePosition(x, y) {
	if (!Number.isFinite(x) || !Number.isFinite(y)) return false;
	if (x < 55 || x > FROZEN_WORLD.width - 55 || y < 80 || y > FROZEN_WORLD.height - 55) return false;
	return ((x - FROZEN_LAKE.x) / FROZEN_LAKE.radiusX) ** 2 + ((y - FROZEN_LAKE.y) / FROZEN_LAKE.radiusY) ** 2 > 1;
}
function isAreaWalkablePosition(area, x, y) {if(area==='event')return eventWalkable444(x,y);
 if(area==='rune'||area==='rune_v2')return runeWalkable(x,y);
	if (guildArea(area)) return guildWalkable(area, x, y);
	if (area === "forest") return isForestWalkablePosition(x, y);
	if (area === "frozen") return isFrozenWalkablePosition(x, y);
	const world = areaWorld(area);
	if (!Number.isFinite(x) || !Number.isFinite(y) || x < 55 || x > world.width - 55 || y < 80 || y > world.height - 55) return false;
	if (area === "ancient" && insideAncientCore(x, y)) return false;
	if (area === "arena" && (x < 280 || x > 2120 || y < 250 || y > 1250)) return false;
	if (area === "fishing") return ((x - FISHING_LAKE$1.x) / FISHING_LAKE$1.radiusX) ** 2 + ((y - FISHING_LAKE$1.y) / FISHING_LAKE$1.radiusY) ** 2 >= 1.02;
	return true;
}
var HUNTING_COUNTS = {
	forest: 72,
	frozen: 45,
	black: 64
};
function huntingPositions(area) {
	const world = areaWorld(area), points = [];
	const protectedPoints = area === "forest" ? [FOREST_CORE, FOREST_SPAWN] : area === "frozen" ? [
		FROZEN_SPAWN,
		FROZEN_BOSS_SPAWN,
		FROZEN_WATER_SPAWN
	] : [BLACK_SPAWN];
	for (let row = 0; row < 9; row++) for (let col = 0; col < 11; col++) {
		const x = Math.round(240 + col * (world.width - 480) / 10 + (row % 2 ? 45 : -45)), y = Math.round(200 + row * (world.height - 420) / 8);
		if (isAreaWalkablePosition(area, x, y) && protectedPoints.every((p) => Math.hypot(x - p.x, y - p.y) > 420)) points.push({
			x,
			y
		});
	}
	return points.map((p, i) => ({
		...p,
		order: i * 37 % points.length
	})).sort((a, b) => a.order - b.order).slice(0, HUNTING_COUNTS[area]);
}
async function expandHuntingWorld(database) {
	const gate = "EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<23)";
	const writes = [
		database.prepare(`UPDATE players SET x=x*1.5,y=y*1.5,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0 WHERE area IN ('forest','frozen','black') AND ${gate}`),
		database.prepare(`UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area IN ('forest','frozen','black') AND id NOT LIKE 'frozen-%' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND ${gate}`),
		database.prepare(`UPDATE monsters SET x=?,y=? WHERE id='frozen-boss-1' AND ${gate}`).bind(FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y),
		database.prepare(`UPDATE monsters SET x=?,y=? WHERE id LIKE 'frozen-water-c%' AND ${gate}`).bind(FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y)
	];
	for (const area of [
		"forest",
		"frozen",
		"black"
	]) for (let channel = 1; channel <= 3; channel++) {
		const rows = (await database.prepare("SELECT id,name,hp,max_hp,variant FROM monsters WHERE area=? AND channel=? AND is_boss=0 AND is_stone=0 AND summoned=0 AND id NOT LIKE 'frozen-%' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') ORDER BY id").bind(area, channel).all()).results;
		if (!rows.length) throw new Error("Av alanı kaynakları bulunamadı.");
		const positions = huntingPositions(area);
		for (let i = 0; i < positions.length; i++) {
			const source = rows[i % rows.length], { x, y } = positions[i];
			if (i < rows.length) writes.push(database.prepare(`UPDATE monsters SET x=?,y=? WHERE id=? AND ${gate}`).bind(x, y, source.id));
			else {
				const family = source.id.split("-")[0], suffix = area === "black" ? `-black-c${channel}-${source.id.match(/-([1-8])$/)?.[1] ?? 1}` : area === "frozen" ? `-frozen-c${channel}-${i + 100}` : `-c${channel}-${i + 100}`;
				const id = area === "black" ? `${family}-expanded${i}${suffix}` : `${family}${suffix}`;
				writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,is_stone,summoned,area,channel,spawn_round)
    SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,0,0,area,channel,1 FROM monsters WHERE id=? AND ${gate}`).bind(id, x, y, source.id));
			}
		}
	}
	writes.push(database.prepare("UPDATE world_state SET layout_version=23 WHERE id=1 AND layout_version<23"));
	await database.batch(writes);
}
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
var families = [
	"golge",
	"curuk",
	"yutan"
];
var names = {
	golge: "Gölge Kurdu",
	curuk: "Çürük Muhafız",
	yutan: "Öz Yutan"
};
var counters = {
	golge: 0,
	curuk: 0,
	yutan: 0
};
var EXPANDED_FOREST_SPAWNS = [
	300,
	650,
	1e3,
	1350,
	1700,
	2050
].flatMap((y) => [
	360,
	920,
	1480,
	2040,
	2600,
	3160
].filter((x) => !(x >= 1480 && x <= 2040 && y >= 650 && y <= 1350)).map((x) => ({
	x,
	y
}))).map((position, index) => {
	const family = families[index % families.length];
	const number = ++counters[family];
	const variant = number === 10 ? "katil" : number >= 7 ? "agresif" : "normal";
	return {
		...position,
		family,
		number,
		variant,
		name: names[family],
		profileKey: `forest.${family}.${variant}`,
		fallbackHp: family === "golge" ? 220 : family === "curuk" ? 340 : 480
	};
});
var FOREST_SPAWN_UPSERT_SQL = `INSERT INTO monsters
  (id,name,x,y,hp,max_hp,variant,area,channel,respawn_at,is_boss,is_stone,summoned)
  SELECT ?,?,?,?,COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),
    COALESCE((SELECT max_hp FROM monster_combat_profiles WHERE profile_key=?),?),?,'forest',?,0,0,0,0
  WHERE EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)
  ON CONFLICT(id) DO UPDATE SET x=excluded.x,y=excluded.y
  WHERE monsters.area='forest' AND monsters.is_boss=0 AND monsters.is_stone=0 AND monsters.summoned=0
    AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<20)`;
var BOSS_SPAWN = {
	x: 1200,
	y: 690
};
var FROZEN_BOSS_ID = "frozen-boss-1";
var FROZEN_WATER_ID_PREFIX = "frozen-water-c";
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
var seeds = [
	[
		"golge-1",
		"Gölge Kurdu",
		460,
		700,
		220
	],
	[
		"golge-2",
		"Gölge Kurdu",
		1940,
		700,
		220
	],
	[
		"golge-3",
		"Gölge Kurdu",
		420,
		1060,
		220
	],
	[
		"golge-4",
		"Gölge Kurdu",
		1980,
		1060,
		220
	],
	[
		"curuk-1",
		"Çürük Muhafız",
		760,
		820,
		340
	],
	[
		"curuk-2",
		"Çürük Muhafız",
		1640,
		820,
		340
	],
	[
		"curuk-3",
		"Çürük Muhafız",
		700,
		1250,
		340
	],
	[
		"curuk-4",
		"Çürük Muhafız",
		1700,
		1250,
		340
	],
	[
		"yutan-1",
		"Öz Yutan",
		1040,
		1280,
		480
	],
	[
		"yutan-2",
		"Öz Yutan",
		1360,
		1280,
		480
	]
];
var forestSpawnSeeds = [
	...[
		[460, 700],
		[1940, 700],
		[420, 1060],
		[1980, 1060]
	].map(([x, y], index) => ({
		prefix: "golge",
		name: "Gölge Kurdu",
		x,
		y,
		hp: 220,
		index: index + 1
	})),
	...[
		[760, 820],
		[1640, 820],
		[700, 1250],
		[1700, 1250]
	].map(([x, y], index) => ({
		prefix: "curuk",
		name: "Çürük Muhafız",
		x,
		y,
		hp: 340,
		index: index + 1
	})),
	...[[1040, 1280], [1360, 1280]].map(([x, y], index) => ({
		prefix: "yutan",
		name: "Öz Yutan",
		x,
		y,
		hp: 480,
		index: index + 1
	}))
];
var frozenSpawnSeeds = [
	...[
		[300, 250],
		[850, 250],
		[1400, 240],
		[1980, 260],
		[420, 720],
		[980, 690],
		[2210, 740],
		[3050, 840]
	].map(([x, y], index) => ({
		prefix: "golge",
		name: "Kırağı Vaşağı",
		x,
		y,
		index: index + 1
	})),
	...[
		[280, 1200],
		[800, 1170],
		[2150, 1220],
		[2720, 1190],
		[3100, 1320],
		[430, 1670]
	].map(([x, y], index) => ({
		prefix: "curuk",
		name: "Buzkök Golemi",
		x,
		y,
		index: index + 1
	})),
	...[
		[980, 1600],
		[2050, 1640],
		[2600, 1640],
		[3060, 1770]
	].map(([x, y], index) => ({
		prefix: "yutan",
		name: "Tipi Kâhini",
		x,
		y,
		index: index + 1
	}))
];
var sinsiStoneSeeds = [
	[650, 315],
	[1190, 330],
	[1775, 340],
	[320, 670],
	[1060, 720],
	[1980, 690],
	[410, 1070],
	[1830, 1115]
];
async function seedWorld() {
	const database = db();
	const now = nowSeconds$1();
	let existingState = await database.prepare(`SELECT layout_version, guardian_reward_at,
       COALESCE((SELECT guardian_reward_seconds FROM game_settings WHERE id = 1), ?) AS guardian_reward_seconds
     FROM world_state WHERE id = 1`).bind(DEFAULT_SETTINGS.guardian_reward_seconds).first();
	if (existingState && !await database.prepare("SELECT id FROM monsters LIMIT 1").first()) {
		await database.prepare("UPDATE world_state SET layout_version=0 WHERE id=1 AND NOT EXISTS(SELECT 1 FROM monsters)").run();
		existingState = {
			...existingState,
			...await database.prepare("SELECT layout_version FROM world_state WHERE id=1").first()
		};
	}
	if ((existingState?.layout_version ?? 0) >= 24) {
		if (Number(existingState?.guardian_reward_at ?? 0) <= 0) await database.prepare("UPDATE world_state SET guardian_reward_at = ? WHERE id = 1 AND guardian_reward_at <= 0").bind(now + (existingState?.guardian_reward_seconds ?? DEFAULT_SETTINGS.guardian_reward_seconds)).run();
		return;
	}
	const statements = [
		database.prepare("INSERT OR IGNORE INTO world_state (id, health, updated_at, layout_version, guardian_reward_at) VALUES (1, 64, ?, 3, ?)").bind(now, now + DEFAULT_SETTINGS.guardian_reward_seconds),
		...existingState && existingState.layout_version >= 11 ? [] : seeds.map(([id, name, x, y, hp]) => database.prepare(`INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss)
       SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0
       WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`).bind(id, name, x, y, hp, hp)),
		database.prepare("INSERT OR IGNORE INTO monsters (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round) VALUES ('dunya-bosu-1', 'Çürümenin Kadimi', ?, ?, 0, 18000, ?, 'boss', 1, 0, 0)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, now + 600)
	];
	await database.batch(statements);
	const state = existingState ?? await database.prepare("SELECT layout_version FROM world_state WHERE id = 1").first();
	if ((state?.layout_version ?? 1) < 2) await database.batch([
		...seeds.map(([id, , x, y]) => database.prepare("UPDATE monsters SET x = ?, y = ? WHERE id = ?").bind(x, y, id)),
		database.prepare("UPDATE players SET x = 1200, y = 900 WHERE x < 100 OR x > 2300 OR y < 100 OR y > 1400"),
		database.prepare("UPDATE world_state SET layout_version = 2 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 3) await database.batch([database.prepare("UPDATE monsters SET hp = 0, max_hp = 18000, respawn_at = ?, despawn_at = 0 WHERE is_boss = 1 AND loadlab_run_id=''").bind(now + 30), database.prepare("UPDATE world_state SET layout_version = 3 WHERE id = 1")]);
	if ((state?.layout_version ?? 1) < 4) await database.batch([
		...seeds.map(([id, , , , hp]) => database.prepare("UPDATE monsters SET hp = ?, max_hp = ?, spawn_round = spawn_round + 1 WHERE id = ? AND is_boss = 0").bind(hp, hp, id)),
		database.prepare("DELETE FROM monster_participants"),
		database.prepare("UPDATE world_state SET layout_version = 4 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 5) await database.batch([
		...seeds.map(([id, , x, y]) => database.prepare("UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1 WHERE id = ? AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)").bind(x, y, id)),
		database.prepare("UPDATE monsters SET x = 1900, y = 900, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)"),
		database.prepare("DELETE FROM monster_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 5)"),
		database.prepare("UPDATE world_state SET layout_version = 5 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 6) {
		const cleanBossRespawn = nowSeconds$1() + 10;
		await database.batch([
			database.prepare("UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, cleanBossRespawn),
			database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
			database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 6)"),
			database.prepare("UPDATE world_state SET layout_version = 6 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 7) {
		const sanctumBossRespawn = nowSeconds$1() + 10;
		await database.batch([
			database.prepare("UPDATE monsters SET x = ?, y = ?, hp = 0, respawn_at = ?, despawn_at = 0, spawn_round = spawn_round + 1 WHERE is_boss = 1 AND loadlab_run_id='' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)").bind(BOSS_SPAWN.x, BOSS_SPAWN.y, sanctumBossRespawn),
			database.prepare("DELETE FROM boss_participants WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
			database.prepare("DELETE FROM monster_participants WHERE monster_id = 'dunya-bosu-1' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 7)"),
			database.prepare("UPDATE world_state SET layout_version = 7 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 8) {
		const stoneHp = (await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first())?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
		await database.batch([
			database.prepare("UPDATE monsters SET area = CASE WHEN is_boss = 1 THEN 'sanctum' ELSE 'forest' END, channel = 0 WHERE area NOT IN ('ancient','afk','rune') AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 8)"),
			...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`INSERT OR IGNORE INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)`).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1))).flat(),
			database.prepare("UPDATE world_state SET layout_version = 8 WHERE id = 1")
		]);
	}
	if ((state?.layout_version ?? 1) < 9) {
		const stoneHp = (await database.prepare("SELECT sinsi_stone_hp FROM game_settings WHERE id = 1").first())?.sinsi_stone_hp ?? DEFAULT_SETTINGS.sinsi_stone_hp;
		await database.batch([...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`INSERT INTO monsters
            (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
           VALUES (?, ?, ?, ?, ?, ?, 0, 'stone', 0, 0, 1, 'sinsi', ?, 1, 0, 0)
           ON CONFLICT(id) DO UPDATE SET x=excluded.x, y=excluded.y`).bind(`sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, `Sinsi Taş ${stoneIndex + 1}`, x, y, stoneHp, stoneHp, channelIndex + 1))).flat(), database.prepare("UPDATE world_state SET layout_version = 9 WHERE id = 1")]);
	}
	if ((state?.layout_version ?? 1) < 10) await database.batch([
		database.prepare("DELETE FROM monsters WHERE summoned = 1 AND area = 'sinsi'"),
		database.prepare("DELETE FROM monster_participants WHERE monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'"),
		...Array.from({ length: 3 }, (_, channelIndex) => sinsiStoneSeeds.map(([x, y], stoneIndex) => database.prepare(`UPDATE monsters SET x = ?, y = ?, spawn_round = spawn_round + 1
           WHERE id = ? AND is_stone = 1 AND channel = ?`).bind(x, y, `sinsi-tasi-c${channelIndex + 1}-${stoneIndex + 1}`, channelIndex + 1))).flat(),
		database.prepare("UPDATE world_state SET layout_version = 10 WHERE id = 1")
	]);
	if ((state?.layout_version ?? 1) < 11) {
		const configuredHp = await database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first();
		const forestHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		await database.batch([
			database.prepare("DELETE FROM monsters WHERE area = 'forest' AND is_boss = 0 AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)"),
			...Array.from({ length: 3 }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         SELECT ?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0
         WHERE EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 11)`).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare("UPDATE world_state SET layout_version = 11 WHERE id = 1 AND layout_version < 11")
		]);
	}
	if ((state?.layout_version ?? 1) < 12) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const legacyForestIds = seeds.map(([monsterId]) => monsterId);
		const retainedForestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const retainedForestIds = retainedForestGroups.flatMap(({ ids }) => ids);
		const retiredForestIds = Array.from({ length: 3 }, (_, channelIndex) => [
			"golge",
			"curuk",
			"yutan"
		].flatMap((prefix) => [
			7,
			8,
			9
		].map((index) => `${prefix}-c${channelIndex + 1}-${index}`))).flat();
		await database.batch([
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList(legacyForestIds)})
           AND area = 'forest' AND is_boss = 0 AND channel = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare(`UPDATE monsters
         SET x = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${retainedForestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END,
             spawn_round = spawn_round + 1
         WHERE id IN (${forestIdList(retainedForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList(retiredForestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 12)`),
			database.prepare("UPDATE world_state SET layout_version = 12 WHERE id = 1 AND layout_version < 12")
		]);
	}
	if ((state?.layout_version ?? 1) < 13) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const forestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const forestIds = forestGroups.flatMap(({ ids }) => ids);
		await database.batch([database.prepare(`UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 13)`), database.prepare("UPDATE world_state SET layout_version = 13 WHERE id = 1 AND layout_version < 13")]);
	}
	if ((state?.layout_version ?? 1) < 14) {
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const forestGroups = forestSpawnSeeds.map((seed) => ({
			seed,
			ids: Array.from({ length: 3 }, (_, channelIndex) => `${seed.prefix}-c${channelIndex + 1}-${seed.index}`)
		}));
		const forestIds = forestGroups.flatMap(({ ids }) => ids);
		await database.batch([database.prepare(`UPDATE monsters
         SET x = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.x}`).join("\n           ")}
           ELSE x END,
             y = CASE
           ${forestGroups.map(({ seed, ids }) => `WHEN id IN (${forestIdList(ids)}) THEN ${seed.y}`).join("\n           ")}
           ELSE y END
         WHERE id IN (${forestIdList(forestIds)})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 14)`), database.prepare("UPDATE world_state SET layout_version = 14 WHERE id = 1 AND layout_version < 14")]);
	}
	if ((state?.layout_version ?? 1) < 15) {
		const configuredHp = await database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first();
		const forestHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		const forestIdList = (ids) => ids.map((id) => `'${id}'`).join(", ");
		const legacyForestIds = seeds.map(([monsterId]) => monsterId);
		const retiredForestIds = Array.from({ length: 3 }, (_, channelIndex) => [
			...[5, 6].map((index) => `golge-c${channelIndex + 1}-${index}`),
			...[5, 6].map((index) => `curuk-c${channelIndex + 1}-${index}`),
			...[
				3,
				4,
				5,
				6
			].map((index) => `yutan-c${channelIndex + 1}-${index}`)
		]).flat();
		await database.batch([
			database.prepare(`DELETE FROM monsters
         WHERE id IN (${forestIdList([...legacyForestIds, ...retiredForestIds])})
           AND area = 'forest' AND is_boss = 0
           AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)`),
			...Array.from({ length: 3 }, (_, channelIndex) => forestSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'forest', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='forest', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${seed.prefix}-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, forestHp[seed.prefix], forestHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare("UPDATE players SET x = 1200, y = 900 WHERE area = 'forest' AND (x < 55 OR x > 2345 OR y < 80 OR y > 1420) AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 15)"),
			database.prepare("UPDATE world_state SET layout_version = 15 WHERE id = 1 AND layout_version < 15")
		]);
	}
	if ((state?.layout_version ?? 1) < 16) {
		const [configuredHp, frozenSettings] = await Promise.all([database.prepare("SELECT shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp FROM game_settings WHERE id = 1").first(), database.prepare(`SELECT frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp,
                frozen_water_enabled, frozen_water_hp
         FROM combat_settings WHERE id = 1`).first()]);
		const normalHp = {
			golge: configuredHp?.shadow_wolf_hp ?? DEFAULT_SETTINGS.shadow_wolf_hp,
			curuk: configuredHp?.rotten_guardian_hp ?? DEFAULT_SETTINGS.rotten_guardian_hp,
			yutan: configuredHp?.essence_devourer_hp ?? DEFAULT_SETTINGS.essence_devourer_hp
		};
		const zoneEnabled = (frozenSettings?.frozen_zone_enabled ?? DEFAULT_SETTINGS.frozen_zone_enabled) === 1;
		const bossHp = frozenSettings?.frozen_boss_hp ?? DEFAULT_SETTINGS.frozen_boss_hp;
		const waterHp = frozenSettings?.frozen_water_hp ?? DEFAULT_SETTINGS.frozen_water_hp;
		const bossActive = zoneEnabled && (frozenSettings?.frozen_boss_enabled ?? DEFAULT_SETTINGS.frozen_boss_enabled) === 1;
		const waterActive = zoneEnabled && (frozenSettings?.frozen_water_enabled ?? DEFAULT_SETTINGS.frozen_water_enabled) === 1;
		await database.batch([
			...Array.from({ length: 3 }, (_, channelIndex) => frozenSpawnSeeds.map((seed) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, ?, ?, ?, ?, ?, 0, 'normal', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${seed.prefix}-frozen-c${channelIndex + 1}-${seed.index}`, seed.name, seed.x, seed.y, normalHp[seed.prefix], normalHp[seed.prefix], channelIndex + 1))).flat(),
			database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Ayaz Tahtının Bekçisi', ?, ?, ?, ?, 0, 'frost_boss', 0, 0, 1, 'frozen', 0, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_boss', area='frozen', channel=0,
           is_boss=0, is_stone=0, summoned=0`).bind(FROZEN_BOSS_ID, FROZEN_BOSS_SPAWN.x, FROZEN_BOSS_SPAWN.y, bossActive ? bossHp : 0, bossHp),
			...Array.from({ length: 3 }, (_, channelIndex) => database.prepare(`INSERT INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned)
         VALUES (?, 'Buzgölü Semenderi', ?, ?, ?, ?, 0, 'frost_water', 0, 0, 1, 'frozen', ?, 0, 0, 0)
         ON CONFLICT(id) DO UPDATE SET
           name=excluded.name, x=excluded.x, y=excluded.y, max_hp=excluded.max_hp,
           hp=MIN(hp, excluded.max_hp), variant='frost_water', area='frozen', channel=excluded.channel,
           is_boss=0, is_stone=0, summoned=0`).bind(`${FROZEN_WATER_ID_PREFIX}${channelIndex + 1}`, FROZEN_WATER_SPAWN.x, FROZEN_WATER_SPAWN.y, waterActive ? waterHp : 0, waterHp, channelIndex + 1)),
			database.prepare("UPDATE world_state SET layout_version = 16 WHERE id = 1 AND layout_version < 16")
		]);
	}
	if ((state?.layout_version ?? 1) < 17) await database.batch([
		database.prepare("UPDATE monsters SET name = 'Kırağı Vaşağı' WHERE area = 'frozen' AND id LIKE 'golge-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE monsters SET name = 'Buzkök Golemi' WHERE area = 'frozen' AND id LIKE 'curuk-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE monsters SET name = 'Tipi Kâhini' WHERE area = 'frozen' AND id LIKE 'yutan-frozen-%' AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 17)"),
		database.prepare("UPDATE world_state SET layout_version = 17 WHERE id = 1 AND layout_version < 17")
	]);
	if ((state?.layout_version ?? 1) < 18) {
		const slots = [
			[
				"golge",
				500,
				400
			],
			[
				"curuk",
				950,
				350
			],
			[
				"yutan",
				1450,
				350
			],
			[
				"golge",
				1900,
				450
			],
			[
				"curuk",
				450,
				950
			],
			[
				"yutan",
				950,
				1050
			],
			[
				"golge",
				1500,
				1e3
			],
			[
				"curuk",
				1950,
				950
			]
		];
		await database.batch([...Array.from({ length: 3 }, (_, channel) => slots.map(([species, x, y], slot) => database.prepare(`INSERT OR IGNORE INTO monsters
          (id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, area, channel)
          VALUES (?, ?, ?, ?, 750, 750, 0, 'katil', 0, 'black', ?)`).bind(`${species}-black-c${channel + 1}-${slot + 1}`, `Kara Muhafız ${slot + 1}`, x, y, channel + 1))).flat(), database.prepare("UPDATE world_state SET layout_version = 18 WHERE id = 1 AND layout_version < 18")]);
	}
	if ((state?.layout_version ?? 1) < 19) await database.batch([database.prepare(`UPDATE monsters SET name = CASE ((CAST(substr(id, -1) AS INTEGER) - 1) % 4)
        WHEN 0 THEN 'Obsidyen Akrep' WHEN 1 THEN 'Kumtaşı Golemi'
        WHEN 2 THEN 'Mezar Muhafızı' ELSE 'Kül Çakalı' END
        WHERE area = 'black' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND EXISTS (SELECT 1 FROM world_state WHERE id = 1 AND layout_version < 19)`), database.prepare("UPDATE world_state SET layout_version = 19 WHERE id = 1 AND layout_version < 19")]);
	if ((state?.layout_version ?? 1) < 20) await database.batch([...Array.from({ length: 3 }, (_, i) => EXPANDED_FOREST_SPAWNS.map((seed) => database.prepare(FOREST_SPAWN_UPSERT_SQL).bind(`${seed.family}-c${i + 1}-${seed.number}`, seed.name, seed.x, seed.y, seed.profileKey, seed.fallbackHp, seed.profileKey, seed.fallbackHp, seed.variant, i + 1))).flat(), database.prepare("UPDATE world_state SET layout_version=20 WHERE id=1 AND layout_version<20")]);
	if ((state?.layout_version ?? 1) < 21) await database.batch([database.prepare("UPDATE monsters SET x=x*1.5,y=y*1.5 WHERE area='black' AND id NOT IN ('stone-boss-black-c1','stone-boss-black-c2','stone-boss-black-c3') AND EXISTS (SELECT 1 FROM world_state WHERE id=1 AND layout_version<21)"), database.prepare("UPDATE world_state SET layout_version=21 WHERE id=1 AND layout_version<21")]);
	if ((state?.layout_version ?? 1) < 22) {
		const families = [
			"golge",
			"curuk",
			"yutan",
			"golge",
			"curuk",
			"yutan",
			"golge",
			"curuk"
		];
		const writes = [];
		for (let channel = 1; channel <= 3; channel++) for (let i = 0; i < 24; i++) {
			const slot = i % 8 + 1, pack = Math.floor(i / 8), family = families[slot - 1];
			const angle = i * 7 % 24 * Math.PI * 2 / 24;
			const x = Math.round(1800 + Math.cos(angle) * (1250 + i % 3 * 55));
			const y = Math.round(1100 + Math.sin(angle) * (710 + i % 2 * 70));
			const sourceId = `${family}-black-c${channel}-${slot}`;
			if (pack === 0) writes.push(database.prepare("UPDATE monsters SET x=?,y=? WHERE id=? AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)").bind(x, y, sourceId));
			else writes.push(database.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,area,channel)
        SELECT ?,name,?,?,max_hp,max_hp,0,variant,0,'black',channel FROM monsters WHERE id=?
        AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<22)`).bind(`${family}-pack${pack + 1}-black-c${channel}-${slot}`, x, y, sourceId));
		}
		await database.batch([...writes, database.prepare("UPDATE world_state SET layout_version=22 WHERE id=1 AND layout_version<22")]);
	}
	if ((state?.layout_version ?? 1) < 23) await expandHuntingWorld(database);
	if ((state?.layout_version ?? 1) < 24) await database.batch([database.prepare(`UPDATE players SET
      x=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (x-1500)*.9+1800 ELSE x*1.2 END,
      y=CASE WHEN ((x-1500)/500.0)*((x-1500)/500.0)+((y-830)/380.0)*((y-830)/380.0)<=1 THEN (y-830)*.9+996 ELSE y*1.2 END,
      position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
      WHERE area='war' AND EXISTS(SELECT 1 FROM world_state WHERE id=1 AND layout_version<24)`), database.prepare("UPDATE world_state SET layout_version=24 WHERE id=1 AND layout_version<24")]);
}
return {seedWorld};}

import {RUNE_SPAWNS,validateRuneConfig} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {RUNE_V2_SPAWNS,validateRuneV2Config} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {ANCIENT_SPAWNS} from "../../../../native510-bb3a6cc689c6/lib/expansion65.mjs";
import {AFK_SPAWNS} from "../../../../native510-bb3a6cc689c6/lib/afk-island.mjs";
import {STONE_BOSS_IDS476} from "../../../../native510-bb3a6cc689c6/vds-server/src/stone-boss476.mjs";
import {migrateRuneV2BossLocation484} from "../../../../native510-bb3a6cc689c6/vds-server/src/rune-v2-location484.mjs";
export function seedNativeAdditionalContent(db){
{const insert=db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','ancient',?,0,0,0,0,1)`);
  for(let channel=1;channel<=3;channel++)for(const spawn of ANCIENT_SPAWNS)insert.run(`${spawn.family}-ancient-c${channel}-${spawn.slot}`,spawn.name,spawn.x,spawn.y,spawn.hp,spawn.hp,channel);}
{const insert=db.prepare(`INSERT OR IGNORE INTO monsters
    (id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,spawn_round,area,channel,is_stone,summoned)
    VALUES(?,?,?,?,?,?,0,'normal',0,1,'afk',?,0,0)`);
  for(const spawn of AFK_SPAWNS){
   
   for(let channel=1;channel<=3;channel++)insert.run(`${spawn.family}-afk-c${channel}-${spawn.slot}`,spawn.name,spawn.x,spawn.y,spawn.hp,spawn.hp,channel);
  }}
{const cfg=validateRuneConfig(JSON.parse(db.prepare('SELECT config_json FROM rune_settings WHERE id=1').get().config_json));
  const insert=db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','rune',?,0,0,0,0,1)`);
  for(let ch=1;ch<=3;ch++)for(const s of RUNE_SPAWNS){const m=cfg.monsters[s.key];insert.run(`rune-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,ch);}}
{const config=validateRuneV2Config(JSON.parse(db.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json));
 const insert=db.prepare("INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,?,'rune_v2',?,0,0,0,0,1)");
 // Named boss follows frozen/ancient boss per-monster reward ledger. is_boss=1
 // is reserved for the global world's shared boss_round ledger.
 for(let ch=1;ch<=3;ch++)for(const s of RUNE_V2_SPAWNS){const m=config.monsters[s.key];insert.run(`rune-v2-${s.key}-c${ch}-${s.slot}`,m.name,s.x,s.y,m.hp,m.hp,s.key==='boss'?'rune_v2_boss':'normal',ch);}
migrateRuneV2BossLocation484(db);}
{const settings=db.prepare('SELECT black_stone_boss_enabled AS enabled,black_stone_boss_hp AS hp FROM combat_settings WHERE id=1').get();
  if(!settings)throw Error('Stone boss requires existing combat settings');
  const cycle=db.prepare('SELECT cycle FROM world_state WHERE id=1').get()?.cycle;
  if(!Number.isSafeInteger(cycle))throw Error('Stone boss requires existing world');
  const insert=db.prepare("INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,'Kara Taş Muhafızı',2700,1688,?,?,'stone_boss','black',?,0,0,0,0,?)");
  for(let i=0;i<3;i++){
   const id=STONE_BOSS_IDS476[i],existing=db.prepare('SELECT id FROM monsters WHERE id=?').get(id);
   if(existing)continue;
   const quarantined=db.prepare('SELECT row_json,world_cycle FROM stone_boss_quarantine476 WHERE id=?').get(id);
   let previousRound=0;
   if(quarantined){
    const row=JSON.parse(quarantined.row_json);
    if(row.id!==id||row.channel!==i+1||row.area!=='black'||row.variant!=='stone_boss'||row.is_boss!==0||row.is_stone!==0||row.summoned!==0||!Number.isSafeInteger(row.spawn_round)||row.spawn_round<1)throw Error('Invalid stone boss quarantine');
    previousRound=row.spawn_round;
    // V475 can expire old participation while the boss is quarantined. Never
    // restore partial HP with incomplete damage standings after a downgrade;
    // a new V476 life always starts a fresh round. Receipts/drops stay intact.
   }
   // Never reuse an old receipt identity, even after an earlier rollback.
   const seen=db.prepare('SELECT MAX(spawn_round) AS n FROM (SELECT spawn_round FROM normal_defeats WHERE monster_id=? UNION ALL SELECT spawn_round FROM normal_reward_claims WHERE monster_id=? UNION ALL SELECT spawn_round FROM monster_participants WHERE monster_id=?)').get(id,id,id)?.n??0;
   const round=Math.max(previousRound,Number(seen)||0)+1;
   if(!Number.isSafeInteger(round))throw Error('Invalid stone boss spawn round');
   insert.run(id,settings.enabled?settings.hp:0,settings.hp,i+1,round);
   if(quarantined)db.prepare('DELETE FROM stone_boss_quarantine476 WHERE id=?').run(id);
  }}
}
