import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
import {EVENT_WORLD444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {RUNE_WORLD} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {colLabHttpAuth} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/http-auth.mjs";
import {colLabIsPlayer} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {eventWalkable444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {runeWalkable} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {safeLoadLabAuthCodeR12} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/auth-preparation-r12.mjs";
const ambient=globalThis;
export function createEntryRules({environment,globals=ambient,clock=ambient.Date.now,uuid=()=>ambient.crypto.randomUUID(),response=ambient.Response,ports={}}={}){
const globalThis=globals,env=environment,Date=class extends ambient.Date{static now(){return clock();}},crypto={...ambient.crypto,randomUUID:uuid,subtle:ambient.crypto.subtle},Response=response,channelCapacity510=()=>25;
const settlePveEngagement=(...args)=>{if(typeof ports.settlePveEngagement!=="function")throw Error("entry_port_unbound:settlePveEngagement");return ports.settlePveEngagement(...args);};
const selectEntry504=(...args)=>{if(typeof ports.selectEntry504!=="function")throw Error("entry_port_unbound:selectEntry504");return ports.selectEntry504(...args);};
async function colRepairRuneAccess(database,playerId){
 const current = await database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune'").bind(playerId).first();
 const enabled = globalThis.__colRunes?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRunes?.settings().config.enabled?1:0).first();}
async function colRepairRuneV2Access(database,playerId){
 const current = await database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune_v2' AND hp>0").bind(playerId).first();
 const enabled = globalThis.__colRuneV2?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune_v2' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRuneV2?.settings().config.enabled?1:0).first();}
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
var ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
var STARTER_CHARACTER_GRANT_SQL = `INSERT OR IGNORE INTO prereg_rewards(account_id,player_id,granted_at_ms)
  SELECT account_id,id,? FROM players WHERE id=? AND account_id=?`;
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
var FOREST_WORLD = {
	width: 5400,
	height: 3375
};
var FROZEN_WORLD = {
	width: 4800,
	height: 3e3
};
var FOREST_SPAWN = {
	x: 2700,
	y: 2025
};
var BAZAAR_SPAWN = {
	x: 1200,
	y: 920
};
var FROZEN_SPAWN = {
	x: 3525,
	y: 2325
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
function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);if(area==='event')return EVENT_WORLD444;
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
function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);if(area==='event')return eventWalkable444(x,y);
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
async function repairAncientAccess(database, playerId) {
 const needsRepair = await database.prepare(`SELECT id FROM players WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id))))`).bind(playerId).first();
 if (!needsRepair) return null;

	return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,
 movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
 position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0
 WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id)))) RETURNING id`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), playerId).first();
}
var DEFAULT_BLOCKED_WORDS = [
	"amk",
	"aq",
	"amq",
	"amina",
	"aminakoyim",
	"aminakoyayim",
	"amcik",
	"sik",
	"sikerim",
	"sikeyim",
	"siktir",
	"sikis",
	"sikik",
	"sikim",
	"sikiyim",
	"orospu",
	"orospucocugu",
	"oc",
	"pic",
	"yarrak",
	"yarak",
	"got",
	"gotveren",
	"ibne",
	"pezevenk",
	"kahpe",
	"kaltak",
	"dalyarak",
	"dallama",
	"gavat",
	"fuck",
	"fucking",
	"fucker",
	"motherfucker",
	"bitch",
	"asshole",
	"bastard",
	"shit",
	"dick",
	"cunt"
];
var aliases = {
	"ı": "i",
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	"$": "s",
	"!": "i",
	"а": "a",
	"е": "e",
	"о": "o",
	"с": "c",
	"і": "i"
};
function fold(char) {
	return [...char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")].map((c) => aliases[c] ?? c).join("");
}
function normalizeBlockedWord(value) {
	return [...value].map(fold).join("").replace(/[^a-z]/g, "");
}
function maskProfanity(value, customWords = []) {
	let normalized = "";
	const positions = [];
	let offset = 0;
	for (const char of value) {
		for (const c of fold(char)) {
			normalized += c;
			positions.push({
				start: offset,
				end: offset + char.length
			});
		}
		offset += char.length;
	}
	const masked = /* @__PURE__ */ new Set();
	for (const word of new Set([...DEFAULT_BLOCKED_WORDS, ...customWords].map(normalizeBlockedWord))) {
		if (word.length < 2 || word.length > 40) continue;
		const letters = [...word.replace(/(.)\1+/g, "$1")].map((c) => `${c}+`).join("[^a-z0-9]{0,6}");
		const expression = new RegExp(`(?<![a-z0-9])${letters}(?:lar|ler|larin|lerin|sin|siniz|lik|ligi|im|in|ini|iniz|um|un|unu|unuz|tir|dir)?(?![a-z0-9])`, "g");
		for (const match of normalized.matchAll(expression)) {
			const start = positions[match.index]?.start;
			const end = positions[match.index + match[0].length - 1]?.end;
			if (start === void 0 || end === void 0) continue;
			for (let i = start; i < end; i++) masked.add(i);
		}
	}
	return value.split("").map((char, i) => masked.has(i) ? "*" : char).join("");
}
function hasForbiddenCharacterName(value, customWords = []) {
	if (maskProfanity(value, customWords) !== value) return true;
	const compact = normalizeBlockedWord(value).replace(/(.)\1+/g, "$1");
	return [
		...DEFAULT_BLOCKED_WORDS.filter((w) => w.length >= 4),
		"siken",
		"sikici",
		"sikmis",
		"sikti",
		"sikmek",
		"sikilir",
		"siktim",
		"picoglu",
		"picler",
		"sikkafa",
		"sikbas",
		"siksurat",
		"sikbeyin",
		"sikagiz",
		"sikburun",
		"sikyuz",
		"siksok",
		"sikmerak",
		"siksever",
		"sikyala",
		"sikoglu",
		"gotkafa",
		"gotbas",
		"gotsurat",
		"gotoglu",
		"gotlale",
		"amk",
		"amq",
		...customWords.filter((w) => normalizeBlockedWord(w).length >= 4)
	].some((word) => {
		const folded = normalizeBlockedWord(word).replace(/(.)\1+/g, "$1");
		return folded.length >= 3 && compact.includes(folded);
	});
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
var GAME_SETTINGS_SQL = `SELECT expansion65_enabled, expansion65_preview_player_id, expansion65_revision, events_json, beta_starts_at, beta_ends_at, health_decay_per_second, donation_health_per_essence, boss_hp, boss_respawn_seconds,
  boss_duration_seconds, regular_monster_damage_scale, normal_variant_damage_scale,
  aggressive_variant_damage_scale, killer_variant_damage_scale, boss_damage_scale,
  shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp, aggressive_variant_hp_scale, killer_variant_hp_scale,
  guardian_reward_gems, guardian_reward_seconds,
  potion_essence_cost, exchange_essence_cost, exchange_gem_reward,
  skill_upgrade_gem_cost, xp_per_level,
  xp_curve_json, xp_base_cost, xp_growth_per_level, skill_two_unlock_level, skill_three_unlock_level,
  skill_two_cooldown_ms, skill_three_cooldown_ms, skill_damage_scale,
  skill_one_multiplier, skill_two_multiplier, skill_three_multiplier, skill_upgrade_damage_per_level,
  starter_weapon_power, guardian_base_attack, hunter_base_attack, arcanist_base_attack,
  base_critical_chance, third_skill_critical_bonus, critical_damage_multiplier,
  wing_gem_cost, wing_attack_bonus, wing_defense_bonus, wing_critical_chance,
  boss_guaranteed_white_drops, regular_blue_chance, regular_orange_chance, regular_red_chance,
  regular_item_drop_chance, regular_armor_chance, boss_blue_chance,
  boss_orange_chance, boss_red_chance, boss_armor_chance, item_sale_white, item_sale_blue, item_sale_orange, item_sale_red,
  white_weapon_power_min, white_weapon_power_max, white_armor_power_min, white_armor_power_max,
  blue_weapon_power_min, blue_weapon_power_max, blue_armor_power_min, blue_armor_power_max,
  orange_weapon_power_min, orange_weapon_power_max, orange_armor_power_min, orange_armor_power_max,
  red_weapon_power_min, red_weapon_power_max, red_armor_power_min, red_armor_power_max,
  new_year_mode, halloween_mode, seasonal_themes_json,
  fishing_rod_cost, fish_sokan_value, fish_levrek_value, fish_zargana_value,
  fish_sokan_weight, fish_levrek_weight, fish_zargana_weight,
  channel_capacity, sinsi_stone_unlock_level, sinsi_stone_hp, sinsi_stone_respawn_seconds,
  sinsi_stone_wave_count, sinsi_stone_summon_hp, sinsi_stone_summon_damage_scale,
  sinsi_stone_essence_min, sinsi_stone_essence_max, sinsi_stone_gear_drops, sinsi_stone_dust_reward,
  sinsi_stone_armor_chance, sinsi_stone_blue_chance, sinsi_stone_orange_chance,
  sinsi_stone_red_chance FROM game_settings WHERE id = 1`;
var ECONOMY_SETTINGS_SQL = `SELECT * FROM economy_settings WHERE id = 1`;
var COMBAT_SETTINGS_SQL = `SELECT ${ENCHANT_TIER_KEYS.filter((key) => !key.startsWith("enchant_hp_")).join(", ")}, afk_island_enabled,afk_island_xp_reward,afk_island_respawn_seconds,ancient_golge_xp_reward,ancient_curuk_xp_reward,ancient_yutan_xp_reward,ancient_monster_respawn_seconds,ancient_boss_enabled,ancient_boss_hp,ancient_boss_damage_scale,ancient_boss_respawn_seconds,ancient_boss_xp_reward,ancient_boss_reward_gems,black_stone_boss_enabled,black_stone_boss_hp,black_stone_boss_damage_scale,black_stone_boss_respawn_seconds,black_stone_boss_xp_reward,black_stone_boss_reward_gems,ancient_boss_purple_chance,ancient_normal_purple_chance,world_boss_purple_chance, boss_fire_interval_seconds, boss_fire_damage_multiplier, forest_monster_respawn_seconds, frozen_monster_respawn_seconds, black_monster_respawn_seconds, player_max_hp, rest_regen_percent, rest_regen_combat_delay_seconds, rest_regen_still_seconds, monster_rest_regen_percent, monster_rest_regen_combat_delay_seconds,
  shadow_wolf_xp_reward, rotten_guardian_xp_reward, essence_devourer_xp_reward,
  aggressive_variant_xp_reward, killer_variant_xp_reward,
  frozen_shadow_wolf_xp_reward, frozen_rotten_guardian_xp_reward, frozen_essence_devourer_xp_reward,
  frozen_aggressive_variant_xp_reward, frozen_killer_variant_xp_reward, black_monster_xp_reward,
  sinsi_shadow_wolf_xp_reward, sinsi_guardian_xp_reward, sinsi_devourer_xp_reward,
  sinsi_stone_xp_reward, boss_xp_reward,
  frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp, frozen_boss_damage_scale,
  frozen_boss_respawn_seconds, frozen_boss_xp_reward, frozen_boss_reward_gems,
  frozen_boss_item_drop_chance, frozen_boss_item_drop_count,
  world_boss_stone_book_chance, world_boss_stone_book_min, world_boss_stone_book_max,
  world_boss_evolution_scroll_chance, world_boss_evolution_scroll_min, world_boss_evolution_scroll_max,
  frozen_boss_stone_book_chance, frozen_boss_stone_book_min, frozen_boss_stone_book_max,
  frozen_boss_evolution_scroll_chance, frozen_boss_evolution_scroll_min, frozen_boss_evolution_scroll_max,
  frozen_water_stone_book_chance, frozen_water_stone_book_min, frozen_water_stone_book_max,
  frozen_water_evolution_scroll_chance, frozen_water_evolution_scroll_min, frozen_water_evolution_scroll_max,
  frozen_water_enabled, frozen_water_hp, frozen_water_damage_scale, frozen_water_respawn_seconds,
  frozen_water_xp_reward, frozen_water_reward_gems, frozen_water_item_drop_chance, frozen_water_item_drop_count,
  enchant_forest_power_weight, enchant_frozen_power_weight,
  enchant_item_chance, enchant_one_chance, enchant_two_chance, enchant_three_chance, enchant_four_chance, enchant_fire_weight, enchant_ice_weight,
  enchant_sword_defense_weight, enchant_arrow_defense_weight, enchant_magic_defense_weight,
  enchant_strong_players_weight, enchant_resistant_players_weight, enchant_critical_weight, enchant_attack_speed_weight, enchant_cast_speed_weight,
  enchant_life_steal_weight, enchant_life_steal_min, enchant_life_steal_max,
  enchant_attack_block_weight, enchant_attack_block_min, enchant_attack_block_max,
  enchant_hp_weight, enchant_hp_tier_one, enchant_hp_tier_two, enchant_hp_tier_three, enchant_hp_tier_four, enchant_hp_tier_five,
  enchant_fire_min, enchant_fire_max, enchant_ice_min, enchant_ice_max,
  enchant_sword_defense_min, enchant_sword_defense_max, enchant_arrow_defense_min, enchant_arrow_defense_max,
  enchant_magic_defense_min, enchant_magic_defense_max, enchant_strong_players_min, enchant_strong_players_max,
  enchant_resistant_players_min, enchant_resistant_players_max, enchant_critical_min, enchant_critical_max,
  enchant_attack_speed_min, enchant_attack_speed_max,
  elemental_tick_count, elemental_tick_interval_ms, pvp_kill_reward_gems, pvp_death_loss_gems,
  pvp_respawn_seconds, arena_1v1_reward_gems, arena_2v2_reward_gems, arena_3v3_reward_gems, arena_5v5_reward_gems
  FROM combat_settings WHERE id = 1`;
function db() {
	if (!env.DB) throw new Error("Dünya veritabanı bağlı değil.");
	return env.DB;
}
var GAME_SETTINGS_CACHE_MS = 5e3;
var gameSettingsCache = null;
var gameSettingsCacheGeneration = 0;
var nativeSettingsReads = /* @__PURE__ */ new WeakMap();
async function readGameSettings(database) {
	const [game, economy, combat] = await Promise.all([
		database.prepare(GAME_SETTINGS_SQL).first(),
		database.prepare(ECONOMY_SETTINGS_SQL).first(),
		database.prepare(COMBAT_SETTINGS_SQL).first()
	]);
	const value = {
		...DEFAULT_SETTINGS,
		...game ?? {},
		...economy ?? {},
		...combat ?? {},
		...globalThis.__colPremium?.forestPolicy?.() ?? {
			forest_after_level: 30,
			forest_reduction_percent: 30
		}
	};
	value.channel_capacity = Math.max(1, Math.min(30, Math.round(Number(value.channel_capacity) || 15)));
	return value;
}
async function getGameSettings() {
	const now = Date.now();
	const generation = gameSettingsCacheGeneration;
	if (env.CORE_RUNTIME === "vds") {
		const database = db();
		const current = nativeSettingsReads.get(database);
		if (current?.generation === generation) {
			if (current.value && current.expiresAt > now) return current.value;
			if (current.promise) return await current.promise;
		}
		const read = {
			generation,
			expiresAt: 0
		};
		nativeSettingsReads.set(database, read);
		read.promise = readGameSettings(database).then((value) => {
			if (gameSettingsCacheGeneration === generation && nativeSettingsReads.get(database) === read) {
				read.value = value;
				read.expiresAt = Date.now() + GAME_SETTINGS_CACHE_MS;
			}
			return value;
		}).finally(() => {
			if (nativeSettingsReads.get(database) === read) {
				read.promise = void 0;
				if (!read.value) nativeSettingsReads.delete(database);
			}
		});
		return await read.promise;
	}
	if (gameSettingsCache && gameSettingsCache.expiresAt > now) return gameSettingsCache.value;
	const value = await readGameSettings(db());
	if (gameSettingsCacheGeneration === generation) gameSettingsCache = {
		value,
		expiresAt: Date.now() + GAME_SETTINGS_CACHE_MS
	};
	return value;
}
function safeName(value) {
	return typeof value === "string" ? value.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) : "";
}
async function loadBlockedWords() {
	return (await db().prepare("SELECT word FROM blocked_words ORDER BY word LIMIT 500").all()).results.map((row) => row.word);
}
function readGameInstance(request) {
	const value = request.headers.get("x-game-instance") ?? new URL(request.url).searchParams.get("instance") ?? "";
	return /^[a-f0-9-]{36}$/.test(value) ? value : "";
}
function isGameApi(path) {
	return [
		"/api/guild-skill",
		"/api/guild-chat",
		"/api/guild-voice",
		"/api/guild-village",
		"/api/ranks",
		"/api/community-event",
		"/api/guild",
		"/api/dungeon",
		"/api/premium",
		"/api/quests"
	].includes(path) || path === "/api/trade" || path === "/api/connection-diagnostics" || path === "/api/starter-reward" || path === "/api/bot-check" || path === "/api/action" || path === "/api/world" || path === "/api/chat" || path.startsWith("/api/realtime/") || path.startsWith("/api/black-zone/");
}
var SESSION_COOKIE_NAME = "__Host-yasam-session";
var CSRF_COOKIE_NAME = "__Host-yasam-csrf";
var LOCAL_SESSION_COOKIE_NAME = "yasam-session-local";
var LOCAL_CSRF_COOKIE_NAME = "yasam-csrf-local";
var SESSION_TOUCH_INTERVAL_SECONDS = 300;
var encoder = new TextEncoder();
var AuthRequestError = class extends Error {
	constructor(status, code, message, retryAfter) {
		super(message);
		this.name = "AuthRequestError";
		this.status = status;
		this.code = code;
		this.retryAfter = retryAfter;
	}
};
var realmRuntime = () => globalThis.__colRealm;
function authDatabase() {
	if (!env.DB) throw new Error("Cloudflare D1 `DB` bağlaması bulunamadı.");
	return env.DB;
}
function nowSeconds() {
	return Math.floor(Date.now() / 1e3);
}
function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
async function sha256(value) {
	const bytes = encoder.encode(value);
	const runtime = env;
	if (bytes.byteLength <= 4096 && runtime.CORE_RUNTIME === "vds") {
		const nativeDigest = runtime.CORE_SHA256;
		if (typeof nativeDigest === "function") return nativeDigest(bytes);
	}
	return bytesToBase64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)));
}
function timingSafeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
	return difference === 0;
}
function assertSameOrigin(request) {
	const origin = request.headers.get("Origin");
	let expectedOrigin;
	try {
		expectedOrigin = new URL(request.url).origin;
	} catch {
		throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
	}
	if (!origin || origin !== expectedOrigin) throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
}
async function readJsonObject(request, maxBytes = 16384) {
	if (request.headers.has("x-col-lab-proof")) try { await colLabHttpAuth.captureBody(request); } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 256 || maxBytes > 65536) throw new Error("Geçersiz istek boyutu sınırı.");
	if (!(request.headers.get("Content-Type")?.toLowerCase() ?? "").startsWith("application/json")) throw new AuthRequestError(415, "unsupported_media_type", "İstek JSON biçiminde olmalı.");
	const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
	if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
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
	let payload;
	try {
		payload = JSON.parse(serialized);
	} catch {
		throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	}
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	return payload;
}
function cookieValue(request, name) {
	const header = request.headers.get("Cookie") ?? "";
	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0) continue;
		if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
	}
	return null;
}
function requestUsesSecureCookies(request) {
	try {
		return new URL(request.url).protocol === "https:";
	} catch {
		return true;
	}
}
function authCookieNames(request) {
	return requestUsesSecureCookies(request) ? {
		session: SESSION_COOKIE_NAME,
		csrf: CSRF_COOKIE_NAME,
		secure: true
	} : {
		session: LOCAL_SESSION_COOKIE_NAME,
		csrf: LOCAL_CSRF_COOKIE_NAME,
		secure: false
	};
}
function validOpaqueToken(value) {
	return Boolean(value && value.length >= 32 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value));
}
function csrfTokenFromRequest(request) {
	const token = cookieValue(request, authCookieNames(request).csrf);
	return validOpaqueToken(token) ? token : null;
}
const requestSessionHashes465 = new WeakMap();
async function getGameSession(request, onLookup) {
	const sessionToken = cookieValue(request, authCookieNames(request).session);
	if (!validOpaqueToken(sessionToken) || !sessionToken) return null;
	let digest = requestSessionHashes465.get(request);
	if (!digest || digest.token !== sessionToken) {
		digest = {token: sessionToken, hash: sha256(sessionToken)};
		requestSessionHashes465.set(request, digest);
	}
	const tokenHash = await digest.hash;
	onLookup?.(tokenHash);
	return getGameSessionByHash(tokenHash, request);
}
async function getGameSessionByHash(tokenHash, request, trustedRealtime = false) {
	const now = nowSeconds();
	const record = await authDatabase().prepare(realmRuntime()?.role === "accounts" ? `SELECT s.token_hash,s.account_id,s.csrf_hash,s.expires_at,s.last_seen_at,
      s.security_version,a.security_version AS account_security_version,a.suspended_until_ms,a.permanently_banned,a.ban_reason,a.username,a.email,
      NULL AS player_id,NULL AS player_name,NULL AS player_role,NULL AS player_area,NULL AS player_level,
      NULL AS instance_id,NULL AS presence_token_hash,NULL AS presence_expires_at_ms,NULL AS chat_after_id
      FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1` : `SELECT s.token_hash, s.account_id, s.csrf_hash, s.expires_at, s.last_seen_at,
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
     LIMIT 1`).bind(tokenHash, now).first();
	if (!record) return null;
	if (record.security_version !== record.account_security_version) return null;
	if (record.permanently_banned || record.suspended_until_ms > Date.now()) throw new AuthRequestError(423, "account_suspended", record.ban_reason || "Hesabın güvenlik nedeniyle geçici olarak askıya alındı.");
	const session = {
		tokenHash: record.token_hash,
		gamePresence: record.instance_id ? {
			instanceId: record.instance_id,
			tokenHash: record.presence_token_hash ?? "",
			expiresAtMs: record.presence_expires_at_ms ?? 0,
			chatAfterId: record.chat_after_id ?? 0
		} : void 0,
		account: {
			id: record.account_id,
			username: record.username,
			email: record.email
		},
		player: record.player_id && record.player_name && record.player_role ? {
			id: record.player_id,
			name: record.player_name,
			role: record.player_role
		} : null,
		playerAccess: record.player_id && record.player_area !== null && record.player_level !== null ? {
			area: record.player_area,
			level: record.player_level
		} : null,
		csrfHash: record.csrf_hash,
		expiresAt: record.expires_at,
		lastSeenAt: record.last_seen_at,
		securityVersion: record.security_version
	};
	try { const pending = colLabHttpAuth.beforeSessionTouch(request, session, trustedRealtime); if (pending) await pending; } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (record.last_seen_at <= now - SESSION_TOUCH_INTERVAL_SECONDS) await authDatabase().prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ? AND last_seen_at <= ?").bind(now, tokenHash, now - SESSION_TOUCH_INTERVAL_SECONDS).run();
	return session;
}
async function requireGameSession(request, onLookup) {
	return validateGameSession(request, await getGameSession(request, onLookup));
}
async function requireRealtimeGameSession(request, tokenHash) {
	if (env.CORE_RUNTIME !== "vds") throw new AuthRequestError(403, "invalid_movement_transport", "Hareket bağlantısı doğrulanamadı.");
	return validateGameSession(request, await getGameSessionByHash(tokenHash, request, true));
}
async function validateGameSession(request, session) {
	if (!session) throw new AuthRequestError(401, "authentication_required", "Oturum açmalısın.");
	const realm = realmRuntime(), path = new URL(request.url).pathname;
 if(realm?.maintenance&&!realm.maintenance.allows(session.account.id))throw new AuthRequestError(403,'game_maintenance','Oyun şu an bakımda.');
	if (realm?.role === "accounts") throw new AuthRequestError(403, "realm_required", "Önce sunucu seçmelisin.");
	if (realm?.role === "game") {
		if (realm.realm.status !== "open" || realm.policy?.status && realm.policy.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		const decision = realm.security.authorize(session.account.id, session.securityVersion);
		const allowed = typeof decision === "boolean" ? decision : await decision;
		if (realm.policy?.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		if (!allowed&&realm.policy?.launch?.phase==="maintenance") throw new AuthRequestError(403,"game_maintenance","Oyun şu an bakımda.");
 if (!allowed) throw new AuthRequestError(401, "security_verification_required", "Oturumunu yeniden doğrula.");
	}
	const launch = globalThis.__colLaunch;
	if (realm?.role !== "game" && launch && !launch.status(session.account.id).canPlay) throw new AuthRequestError(403, "launch_locked", "Oyun henüz erişime açık değil. Açılış ekranına dön.");
	if (isGameApi(new URL(request.url).pathname)) {
		const presence = session.gamePresence;
		if (!presence || presence.instanceId !== readGameInstance(request) || presence.tokenHash !== session.tokenHash || presence.expiresAtMs <= Date.now()) throw new AuthRequestError(409, "game_instance_expired", "Bu oyun penceresinin oturumu açık değil. Yeniden bağlan.");
	}
	const pathname = new URL(request.url).pathname;
	const bot = globalThis.__colBotCheck;
	const mustCheckBot465 = bot && session.player && ![
		"/api/bot-check", "/api/game-presence", "/api/auth/logout", "/api/support"
	].includes(pathname) && (request.method !== "GET" || pathname.startsWith("/api/realtime/"));
	let botRequired465 = false;
	if (mustCheckBot465 && bot.requiredPrepared) {
		const result = bot.requiredPrepared(session.account.id);
		botRequired465 = typeof result === "boolean" ? result : await result;
	} else {
		if (bot?.prepare && session.player) {
			const pending = bot.prepare(session.account.id);
			if (pending) await pending;
		}
		if (mustCheckBot465) botRequired465 = bot.required(session.account.id);
	}
	if (botRequired465) throw new AuthRequestError(403, "bot_check_required", "Devam etmek için bot doğrulamasını tamamla.");
	if (session.player && session.playerAccess?.area?.startsWith("guild_")) {
		const { guildVillageService, publishGuildEjections } = await import("../../../../native510-bb3a6cc689c6/dist-vds/server/channel-runtime/assets/guild-village-runtime-Dke_G6YB.js");
		const repair = guildVillageService() ? await authDatabase().core511GuildAuth.repair(guildVillageService(), session.player.id) : undefined;
		if (repair) {
			session.playerAccess.area = repair.area;
			await authDatabase().core511GuildAuth.publish([repair]);
		}
	}
	return session;
}
async function assertCsrf(request, session) {
	assertSameOrigin(request);
	const cookieToken = csrfTokenFromRequest(request);
	const headerToken = request.headers.get("X-CSRF-Token");
	if (!validOpaqueToken(cookieToken) || !validOpaqueToken(headerToken) || !cookieToken || !headerToken) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	if (!timingSafeEqual(encoder.encode(cookieToken), encoder.encode(headerToken))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	const submittedHash = await sha256(headerToken);
	if (!timingSafeEqual(encoder.encode(submittedHash), encoder.encode(session.csrfHash))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
}
function noStoreHeaders(initial) {
	const headers = new Headers(initial);
	headers.set("Cache-Control", "no-store, max-age=0");
	headers.set("Pragma", "no-cache");
	return headers;
}
var nextRateLimitCleanupAt = 0;
async function enforceRateLimit(scope, identifier, { limit, windowSeconds, blockSeconds }, loadlabRateContext = null) {
	const now = nowSeconds();
	const cutoff = now - windowSeconds;
	const key = await sha256(`${scope}:${identifier}`);
	const database = authDatabase();
	const cleanupDue = !loadlabRateContext && now >= nextRateLimitCleanupAt;
	if (cleanupDue) nextRateLimitCleanupAt = now + 3600;
	const statements = [...cleanupDue ? [database.prepare("DELETE FROM auth_rate_limits WHERE blocked_until <= ? AND window_started_at <= ?").bind(now, now - 1440 * 60)] : [], database.prepare(`INSERT INTO auth_rate_limits (key, attempts, window_started_at, blocked_until)
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
     RETURNING attempts, blocked_until`).bind(key, now, now, cutoff, cutoff, now, now, cutoff, limit, now + blockSeconds)];
	if (loadlabRateContext) colLabHttpAuth.tagRateLimit(loadlabRateContext, statements[statements.length - 1], {scope,identifier,key,limit,windowSeconds,blockSeconds});
	const responses = await database.batch(statements);
	const result = responses[responses.length - 1].results[0];
	if (!result || result.blocked_until > now || result.attempts > limit) throw new AuthRequestError(429, "rate_limited", "Çok fazla deneme yaptın. Bir süre sonra tekrar dene.", Math.max(1, (result?.blocked_until ?? now + blockSeconds) - now));
}
function authErrorResponse(error, fallback = "İşlem şu anda tamamlanamadı.") {
	if (error instanceof Error && error.message.includes("channel_full")) return Response.json({
		code: "channel_full",
		error: "Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."
	}, {
		status: 409,
		headers: noStoreHeaders()
	});
	if (error instanceof AuthRequestError) {
		const headers = noStoreHeaders();
		if (error.retryAfter) headers.set("Retry-After", String(error.retryAfter));
		return Response.json({
			error: error.message,
			code: error.code,
			...(error.code==='game_maintenance'&&globalThis.__colRealm?.maintenance?{maintenance438:globalThis.__colRealm.maintenance.view(),maintenanceRevision491:globalThis.__colRealm.maintenance.policy?.revision??0,snapshotAtMs:Date.now()}:{})
		}, {
			status: error.status,
			headers
		});
	}
	console.error("Auth operation failed", error instanceof Error ? error.message : "unknown error");
	return Response.json({ error: fallback }, {
		status: 500,
		headers: noStoreHeaders()
	});
}
function characterNameKey(name) {
	return name.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/\s+/gu, "");
}
var roles = new Set([
	"muhafiz",
	"avci",
	"arkanist"
]);
async function ensureStarterWeapon(database, playerId, power, now) {
	const starterId = `starter-${crypto.randomUUID()}`;
	await database.batch([database.prepare(`INSERT OR IGNORE INTO player_items
        (id, player_id, kind, item_name, rarity, power, role, equipped, created_at)
       SELECT ?, id, 'weapon',
         CASE role WHEN 'avci' THEN 'Acemi Yayı' WHEN 'arkanist' THEN 'Acemi Asası' ELSE 'Acemi Kılıcı' END,
         'white', ?, role,
         CASE WHEN rod_equipped = 0 AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = players.id AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         ) THEN 1 ELSE 0 END,
         ?
       FROM players WHERE id = ? AND NOT EXISTS (
         SELECT 1 FROM player_items owned WHERE owned.player_id = players.id AND owned.kind = 'weapon'
       )`).bind(starterId, power, now, playerId), database.prepare(`UPDATE player_items SET equipped = 1
       WHERE id = ? AND player_id = ?
         AND EXISTS (SELECT 1 FROM players WHERE id = ? AND rod_equipped = 0)
         AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = ? AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         )`).bind(starterId, playerId, playerId, playerId)]);
}
async function joinExisting(context){const {auth,database,now,requestReceivedAtMs,joinSettings,labAccount504,payload,automatic504,initialEntry=false}=context;let requestedChannel=context.requestedChannel;
						const existing = await database.prepare("SELECT id, channel, area, arena_match_id, x, y, hp, max_hp, hp_revision, respawn_at_ms, combat_lock_until_ms, level, is_gm, last_seen FROM players WHERE id = ? AND account_id = ?").bind(auth.player.id, auth.account.id).first();
						if (!existing) return Response.json({ error: "Hesabına bağlı karakter bulunamadı." }, { status: 409 });
                        requestedChannel=await selectEntry504({database,player:existing,nowMs:requestReceivedAtMs,requestedChannel,automatic:automatic504,isLab:labAccount504||colLabIsPlayer(existing.id)});
                        if(colLabIsPlayer(existing.id)&&requestedChannel!==existing.channel)return Response.json({code:"loadlab_channel_fixed",error:"Test kanalı oturum boyunca sabittir."},{status:403});
						if (existing.area === "afk" && (existing.level < 30 || !joinSettings.afk_island_enabled && !existing.is_gm)) {
							await database.prepare(`UPDATE players SET area='bazaar',x=?,y=?,position_revision=position_revision+1,
            realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
            WHERE id=? AND area='afk'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, existing.id).run();
							Object.assign(existing, {
								area: "bazaar",
								x: BAZAAR_SPAWN.x,
								y: BAZAAR_SPAWN.y
							});
						}
						if (existing.area === "frozen" && (!joinSettings.frozen_zone_enabled || existing.level < 20)) {
							await database.prepare(`UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = ?,
            movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
            realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE id = ? AND area = 'frozen'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), existing.id).run();
							existing.area = "bazaar";
							existing.arena_match_id = "";
							existing.combat_lock_until_ms = 0;
							existing.x = BAZAAR_SPAWN.x;
							existing.y = BAZAAR_SPAWN.y;
						}
						if ((existing.area === "arena" || existing.arena_match_id) && requestedChannel !== existing.channel) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
						if (requestedChannel !== existing.channel) {
							if ((await settlePveEngagement(database, existing.id, joinSettings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
							if (!initialEntry && existing.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
						}
						if (!isAreaWalkablePosition(existing.area, existing.x, existing.y)) {
							const safeSpawn = existing.area === "frozen" ? FROZEN_SPAWN : existing.area === "forest" ? FOREST_SPAWN : BAZAAR_SPAWN;
							await database.prepare(`UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
            motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1 WHERE id = ? AND area = ?`).bind(safeSpawn.x, safeSpawn.y, Date.now(), existing.id, existing.area).run();
							existing.x = safeSpawn.x;
							existing.y = safeSpawn.y;
						}
						const joinStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?,
             realtime_scope_version = realtime_scope_version + CASE WHEN channel != ? THEN 1 ELSE 0 END
           WHERE id = ? AND account_id = ?
           AND (channel = ? OR combat_lock_until_ms <= ? OR ? = 1)
           AND ((channel = ? AND last_seen >= ?) OR (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?)
           RETURNING channel`).bind(requestedChannel, now, requestedChannel, existing.id, auth.account.id, requestedChannel, requestReceivedAtMs, initialEntry ? 1 : 0, requestedChannel, now - 30, requestedChannel, existing.id, now - 30, channelCapacity510(requestedChannel,joinSettings.channel_capacity));
						const residentTransfer = requestedChannel !== existing.channel && typeof database.transferPlayer === "function";
						if (residentTransfer) await ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						const joinedChannel = residentTransfer ? await database.transferPlayer(existing.id, requestedChannel, joinStatement, [database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]) : await joinStatement.first();
						if (!joinedChannel) return Response.json({
							code: "channel_full",
							error: `Kanal ${requestedChannel} dolu. Başka bir kanal seç.`
						}, { status: 409 });
						if (requestedChannel !== existing.channel && !residentTransfer) await database.batch([database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]);
						if (!residentTransfer) await ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						return Response.json({
							ok: true,
							playerId: existing.id,
							channel: joinedChannel.channel,
							hp: existing.hp,
							maxHp: existing.max_hp,
							hpRevision: existing.hp_revision,
							respawnAtMs: existing.respawn_at_ms,
							message: `${existing.area === "bazaar" ? "Pazar Alanı" : existing.area === "forest" ? "Kuzey Ormanı" : existing.area === "frozen" ? "Donmuş Çam Geçidi" : "Kaldığın bölge"} · Kanal ${joinedChannel.channel}'e yeniden katıldın.`
						});
					}
async function createCharacter(context){const {auth,database,now,requestReceivedAtMs,joinSettings,payload,requestedChannel}=context;const realm = globalThis.__colRealm;
if (realm?.role === "game" && !auth.player && realm.policy?.registrationOpen === false) return Response.json({ error: "Bu sunucu yeni karakter kaydına kapalı." }, { status: 403 });
const name = safeName(payload.name);
if (hasForbiddenCharacterName(name, await loadBlockedWords())) return Response.json({ error: "Karakter adı küfür veya uygunsuz sözcük içeremez." }, { status: 400 });
const nameKey = characterNameKey(name);
const role = roles.has(payload.role ?? "") ? payload.role : "muhafiz";
if (name.length < 2) return Response.json({ error: "Karakter adı en az 2 harf olmalı." }, { status: 400 });
const channel = requestedChannel;
const proposedPlayerId = crypto.randomUUID();
const legacyNames = await database.prepare("SELECT id, name FROM players WHERE id NOT IN (SELECT player_id FROM character_names)").all();
for (let offset = 0; offset < legacyNames.results.length; offset += 50) await database.batch(legacyNames.results.slice(offset, offset + 50).map((entry) => database.prepare("INSERT OR IGNORE INTO character_names (normalized_name, player_id) VALUES (?, ?)").bind(characterNameKey(entry.name), entry.id)));
try {
						await database.batch([
							database.prepare(`INSERT INTO players (id, account_id, name, role, x, y, hp, max_hp, essence, contribution, xp, level, area, channel, last_seen, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'bazaar', ?, ?, ?
         WHERE (SELECT COUNT(*) FROM players WHERE channel = ? AND last_seen >= ?) < ?
           AND NOT EXISTS (SELECT 1 FROM character_names WHERE normalized_name = ?)
         ON CONFLICT(account_id) DO NOTHING`).bind(proposedPlayerId, auth.account.id, name, role, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, joinSettings.player_max_hp, joinSettings.player_max_hp, channel, now, now, channel, now - 30, channelCapacity510(channel,joinSettings.channel_capacity), nameKey),
							database.prepare("INSERT INTO character_names (normalized_name, player_id) SELECT ?, id FROM players WHERE id = ?").bind(nameKey, proposedPlayerId),
							...env.CORE_RUNTIME === "vds" ? [database.prepare(STARTER_CHARACTER_GRANT_SQL).bind(requestReceivedAtMs, proposedPlayerId, auth.account.id)] : []
						]);
					} catch (error) {
						if (await database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first()) return Response.json({
							error: "Bu karakter adı daha önce alınmış. Başka bir ad seç.",
							code: "character_name_taken"
						}, { status: 409 });
						throw error;
					}
const created = await database.prepare("SELECT id, channel, hp, max_hp, hp_revision, respawn_at_ms FROM players WHERE account_id = ? LIMIT 1").bind(auth.account.id).first();
if (!created) {
						const taken = await database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first();
						return Response.json({
							error: taken ? "Bu karakter adı daha önce alınmış. Başka bir ad seç." : "Kanal dolu; başka bir kanal seç.",
							code: taken ? "character_name_taken" : "channel_full"
						}, { status: 409 });
					}
await ensureStarterWeapon(database, created.id, joinSettings.starter_weapon_power, now);
return Response.json({
						ok: true,
						playerId: created.id,
						channel: created.channel,
						hp: created.hp,
						maxHp: created.max_hp,
						hpRevision: created.hp_revision,
						respawnAtMs: created.respawn_at_ms,
						message: `Pazar Alanı · Kanal ${created.channel}'e katıldın.`
					});}
return {getGameSession,getGameSessionByHash,validateGameSession,requireGameSession,requireRealtimeGameSession,assertCsrf,assertSameOrigin,readJsonObject,authErrorResponse,noStoreHeaders,enforceRateLimit,ensureStarterWeapon,colRepairRuneV2Access,colRepairRuneAccess,repairAncientAccess,getGameSettings,AuthRequestError,joinExisting,createCharacter};
}
export function createEntryWriterRules({environment,globals=ambient,clock=ambient.Date.now,uuid=()=>ambient.crypto.randomUUID(),response=ambient.Response,ports={}}={}){
const globalThis=globals,env=environment,Date=class extends ambient.Date{static now(){return clock();}},crypto={...ambient.crypto,randomUUID:uuid,subtle:ambient.crypto.subtle},Response=response,channelCapacity510=()=>25;
const settlePveEngagement=(...args)=>{if(typeof ports.settlePveEngagement!=="function")throw Error("entry_port_unbound:settlePveEngagement");return ports.settlePveEngagement(...args);};
const selectEntry504=(...args)=>{if(typeof ports.selectEntry504!=="function")throw Error("entry_port_unbound:selectEntry504");return ports.selectEntry504(...args);};
 function colRepairRuneAccess(database,playerId){
 const current = database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune'").bind(playerId).first();
 const enabled = globalThis.__colRunes?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRunes?.settings().config.enabled?1:0).first();}
 function colRepairRuneV2Access(database,playerId){
 const current = database.prepare("SELECT id,(level<65 OR rank_tier<1) AS underqualified FROM players WHERE id=? AND area='rune_v2' AND hp>0").bind(playerId).first();
 const enabled = globalThis.__colRuneV2?.settings().config.enabled ? 1 : 0;
 if (!current || (!current.underqualified && enabled)) return null;
return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0 WHERE id=? AND area='rune_v2' AND (level<65 OR rank_tier<1 OR ?=0) RETURNING id`).bind(BAZAAR_SPAWN.x,BAZAAR_SPAWN.y,Date.now(),playerId,globalThis.__colRuneV2?.settings().config.enabled?1:0).first();}
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
var ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
var STARTER_CHARACTER_GRANT_SQL = `INSERT OR IGNORE INTO prereg_rewards(account_id,player_id,granted_at_ms)
  SELECT account_id,id,? FROM players WHERE id=? AND account_id=?`;
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
var FOREST_WORLD = {
	width: 5400,
	height: 3375
};
var FROZEN_WORLD = {
	width: 4800,
	height: 3e3
};
var FOREST_SPAWN = {
	x: 2700,
	y: 2025
};
var BAZAAR_SPAWN = {
	x: 1200,
	y: 920
};
var FROZEN_SPAWN = {
	x: 3525,
	y: 2325
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
function areaWorld(area) {if(isAdventureArea(area))return adventureBounds(area);if(area==='event')return EVENT_WORLD444;
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
function isAreaWalkablePosition(area, x, y) {if(isAdventureArea(area))return adventureWalkable(area,x,y);if(area==='event')return eventWalkable444(x,y);
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
 function repairAncientAccess(database, playerId) {
 const needsRepair = database.prepare(`SELECT id FROM players WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id))))`).bind(playerId).first();
 if (!needsRepair) return null;

	return database.prepare(`UPDATE players SET area='bazaar',arena_match_id='',x=?,y=?,
 movement_checked_at_ms=?,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
 position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0
 WHERE id=? AND area='ancient' AND (level<50 OR NOT EXISTS(SELECT 1 FROM game_settings s WHERE s.id=1 AND
 (s.expansion65_enabled=1 OR (players.is_gm=1 AND players.id=s.expansion65_preview_player_id)))) RETURNING id`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), playerId).first();
}
var DEFAULT_BLOCKED_WORDS = [
	"amk",
	"aq",
	"amq",
	"amina",
	"aminakoyim",
	"aminakoyayim",
	"amcik",
	"sik",
	"sikerim",
	"sikeyim",
	"siktir",
	"sikis",
	"sikik",
	"sikim",
	"sikiyim",
	"orospu",
	"orospucocugu",
	"oc",
	"pic",
	"yarrak",
	"yarak",
	"got",
	"gotveren",
	"ibne",
	"pezevenk",
	"kahpe",
	"kaltak",
	"dalyarak",
	"dallama",
	"gavat",
	"fuck",
	"fucking",
	"fucker",
	"motherfucker",
	"bitch",
	"asshole",
	"bastard",
	"shit",
	"dick",
	"cunt"
];
var aliases = {
	"ı": "i",
	"0": "o",
	"1": "i",
	"3": "e",
	"4": "a",
	"5": "s",
	"7": "t",
	"@": "a",
	"$": "s",
	"!": "i",
	"а": "a",
	"е": "e",
	"о": "o",
	"с": "c",
	"і": "i"
};
function fold(char) {
	return [...char.normalize("NFKD").toLowerCase().replace(/\p{M}/gu, "")].map((c) => aliases[c] ?? c).join("");
}
function normalizeBlockedWord(value) {
	return [...value].map(fold).join("").replace(/[^a-z]/g, "");
}
function maskProfanity(value, customWords = []) {
	let normalized = "";
	const positions = [];
	let offset = 0;
	for (const char of value) {
		for (const c of fold(char)) {
			normalized += c;
			positions.push({
				start: offset,
				end: offset + char.length
			});
		}
		offset += char.length;
	}
	const masked = /* @__PURE__ */ new Set();
	for (const word of new Set([...DEFAULT_BLOCKED_WORDS, ...customWords].map(normalizeBlockedWord))) {
		if (word.length < 2 || word.length > 40) continue;
		const letters = [...word.replace(/(.)\1+/g, "$1")].map((c) => `${c}+`).join("[^a-z0-9]{0,6}");
		const expression = new RegExp(`(?<![a-z0-9])${letters}(?:lar|ler|larin|lerin|sin|siniz|lik|ligi|im|in|ini|iniz|um|un|unu|unuz|tir|dir)?(?![a-z0-9])`, "g");
		for (const match of normalized.matchAll(expression)) {
			const start = positions[match.index]?.start;
			const end = positions[match.index + match[0].length - 1]?.end;
			if (start === void 0 || end === void 0) continue;
			for (let i = start; i < end; i++) masked.add(i);
		}
	}
	return value.split("").map((char, i) => masked.has(i) ? "*" : char).join("");
}
function hasForbiddenCharacterName(value, customWords = []) {
	if (maskProfanity(value, customWords) !== value) return true;
	const compact = normalizeBlockedWord(value).replace(/(.)\1+/g, "$1");
	return [
		...DEFAULT_BLOCKED_WORDS.filter((w) => w.length >= 4),
		"siken",
		"sikici",
		"sikmis",
		"sikti",
		"sikmek",
		"sikilir",
		"siktim",
		"picoglu",
		"picler",
		"sikkafa",
		"sikbas",
		"siksurat",
		"sikbeyin",
		"sikagiz",
		"sikburun",
		"sikyuz",
		"siksok",
		"sikmerak",
		"siksever",
		"sikyala",
		"sikoglu",
		"gotkafa",
		"gotbas",
		"gotsurat",
		"gotoglu",
		"gotlale",
		"amk",
		"amq",
		...customWords.filter((w) => normalizeBlockedWord(w).length >= 4)
	].some((word) => {
		const folded = normalizeBlockedWord(word).replace(/(.)\1+/g, "$1");
		return folded.length >= 3 && compact.includes(folded);
	});
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
var GAME_SETTINGS_SQL = `SELECT expansion65_enabled, expansion65_preview_player_id, expansion65_revision, events_json, beta_starts_at, beta_ends_at, health_decay_per_second, donation_health_per_essence, boss_hp, boss_respawn_seconds,
  boss_duration_seconds, regular_monster_damage_scale, normal_variant_damage_scale,
  aggressive_variant_damage_scale, killer_variant_damage_scale, boss_damage_scale,
  shadow_wolf_hp, rotten_guardian_hp, essence_devourer_hp, aggressive_variant_hp_scale, killer_variant_hp_scale,
  guardian_reward_gems, guardian_reward_seconds,
  potion_essence_cost, exchange_essence_cost, exchange_gem_reward,
  skill_upgrade_gem_cost, xp_per_level,
  xp_curve_json, xp_base_cost, xp_growth_per_level, skill_two_unlock_level, skill_three_unlock_level,
  skill_two_cooldown_ms, skill_three_cooldown_ms, skill_damage_scale,
  skill_one_multiplier, skill_two_multiplier, skill_three_multiplier, skill_upgrade_damage_per_level,
  starter_weapon_power, guardian_base_attack, hunter_base_attack, arcanist_base_attack,
  base_critical_chance, third_skill_critical_bonus, critical_damage_multiplier,
  wing_gem_cost, wing_attack_bonus, wing_defense_bonus, wing_critical_chance,
  boss_guaranteed_white_drops, regular_blue_chance, regular_orange_chance, regular_red_chance,
  regular_item_drop_chance, regular_armor_chance, boss_blue_chance,
  boss_orange_chance, boss_red_chance, boss_armor_chance, item_sale_white, item_sale_blue, item_sale_orange, item_sale_red,
  white_weapon_power_min, white_weapon_power_max, white_armor_power_min, white_armor_power_max,
  blue_weapon_power_min, blue_weapon_power_max, blue_armor_power_min, blue_armor_power_max,
  orange_weapon_power_min, orange_weapon_power_max, orange_armor_power_min, orange_armor_power_max,
  red_weapon_power_min, red_weapon_power_max, red_armor_power_min, red_armor_power_max,
  new_year_mode, halloween_mode, seasonal_themes_json,
  fishing_rod_cost, fish_sokan_value, fish_levrek_value, fish_zargana_value,
  fish_sokan_weight, fish_levrek_weight, fish_zargana_weight,
  channel_capacity, sinsi_stone_unlock_level, sinsi_stone_hp, sinsi_stone_respawn_seconds,
  sinsi_stone_wave_count, sinsi_stone_summon_hp, sinsi_stone_summon_damage_scale,
  sinsi_stone_essence_min, sinsi_stone_essence_max, sinsi_stone_gear_drops, sinsi_stone_dust_reward,
  sinsi_stone_armor_chance, sinsi_stone_blue_chance, sinsi_stone_orange_chance,
  sinsi_stone_red_chance FROM game_settings WHERE id = 1`;
var ECONOMY_SETTINGS_SQL = `SELECT * FROM economy_settings WHERE id = 1`;
var COMBAT_SETTINGS_SQL = `SELECT ${ENCHANT_TIER_KEYS.filter((key) => !key.startsWith("enchant_hp_")).join(", ")}, afk_island_enabled,afk_island_xp_reward,afk_island_respawn_seconds,ancient_golge_xp_reward,ancient_curuk_xp_reward,ancient_yutan_xp_reward,ancient_monster_respawn_seconds,ancient_boss_enabled,ancient_boss_hp,ancient_boss_damage_scale,ancient_boss_respawn_seconds,ancient_boss_xp_reward,ancient_boss_reward_gems,black_stone_boss_enabled,black_stone_boss_hp,black_stone_boss_damage_scale,black_stone_boss_respawn_seconds,black_stone_boss_xp_reward,black_stone_boss_reward_gems,ancient_boss_purple_chance,ancient_normal_purple_chance,world_boss_purple_chance, boss_fire_interval_seconds, boss_fire_damage_multiplier, forest_monster_respawn_seconds, frozen_monster_respawn_seconds, black_monster_respawn_seconds, player_max_hp, rest_regen_percent, rest_regen_combat_delay_seconds, rest_regen_still_seconds, monster_rest_regen_percent, monster_rest_regen_combat_delay_seconds,
  shadow_wolf_xp_reward, rotten_guardian_xp_reward, essence_devourer_xp_reward,
  aggressive_variant_xp_reward, killer_variant_xp_reward,
  frozen_shadow_wolf_xp_reward, frozen_rotten_guardian_xp_reward, frozen_essence_devourer_xp_reward,
  frozen_aggressive_variant_xp_reward, frozen_killer_variant_xp_reward, black_monster_xp_reward,
  sinsi_shadow_wolf_xp_reward, sinsi_guardian_xp_reward, sinsi_devourer_xp_reward,
  sinsi_stone_xp_reward, boss_xp_reward,
  frozen_zone_enabled, frozen_boss_enabled, frozen_boss_hp, frozen_boss_damage_scale,
  frozen_boss_respawn_seconds, frozen_boss_xp_reward, frozen_boss_reward_gems,
  frozen_boss_item_drop_chance, frozen_boss_item_drop_count,
  world_boss_stone_book_chance, world_boss_stone_book_min, world_boss_stone_book_max,
  world_boss_evolution_scroll_chance, world_boss_evolution_scroll_min, world_boss_evolution_scroll_max,
  frozen_boss_stone_book_chance, frozen_boss_stone_book_min, frozen_boss_stone_book_max,
  frozen_boss_evolution_scroll_chance, frozen_boss_evolution_scroll_min, frozen_boss_evolution_scroll_max,
  frozen_water_stone_book_chance, frozen_water_stone_book_min, frozen_water_stone_book_max,
  frozen_water_evolution_scroll_chance, frozen_water_evolution_scroll_min, frozen_water_evolution_scroll_max,
  frozen_water_enabled, frozen_water_hp, frozen_water_damage_scale, frozen_water_respawn_seconds,
  frozen_water_xp_reward, frozen_water_reward_gems, frozen_water_item_drop_chance, frozen_water_item_drop_count,
  enchant_forest_power_weight, enchant_frozen_power_weight,
  enchant_item_chance, enchant_one_chance, enchant_two_chance, enchant_three_chance, enchant_four_chance, enchant_fire_weight, enchant_ice_weight,
  enchant_sword_defense_weight, enchant_arrow_defense_weight, enchant_magic_defense_weight,
  enchant_strong_players_weight, enchant_resistant_players_weight, enchant_critical_weight, enchant_attack_speed_weight, enchant_cast_speed_weight,
  enchant_life_steal_weight, enchant_life_steal_min, enchant_life_steal_max,
  enchant_attack_block_weight, enchant_attack_block_min, enchant_attack_block_max,
  enchant_hp_weight, enchant_hp_tier_one, enchant_hp_tier_two, enchant_hp_tier_three, enchant_hp_tier_four, enchant_hp_tier_five,
  enchant_fire_min, enchant_fire_max, enchant_ice_min, enchant_ice_max,
  enchant_sword_defense_min, enchant_sword_defense_max, enchant_arrow_defense_min, enchant_arrow_defense_max,
  enchant_magic_defense_min, enchant_magic_defense_max, enchant_strong_players_min, enchant_strong_players_max,
  enchant_resistant_players_min, enchant_resistant_players_max, enchant_critical_min, enchant_critical_max,
  enchant_attack_speed_min, enchant_attack_speed_max,
  elemental_tick_count, elemental_tick_interval_ms, pvp_kill_reward_gems, pvp_death_loss_gems,
  pvp_respawn_seconds, arena_1v1_reward_gems, arena_2v2_reward_gems, arena_3v3_reward_gems, arena_5v5_reward_gems
  FROM combat_settings WHERE id = 1`;
function db() {
	if (!env.DB) throw new Error("Dünya veritabanı bağlı değil.");
	return env.DB;
}
var GAME_SETTINGS_CACHE_MS = 5e3;
var gameSettingsCache = null;
var gameSettingsCacheGeneration = 0;
var nativeSettingsReads = /* @__PURE__ */ new WeakMap();
 function readGameSettings(database) {
	const [game, economy, combat] = [
		database.prepare(GAME_SETTINGS_SQL).first(),
		database.prepare(ECONOMY_SETTINGS_SQL).first(),
		database.prepare(COMBAT_SETTINGS_SQL).first()
	];
	const value = {
		...DEFAULT_SETTINGS,
		...game ?? {},
		...economy ?? {},
		...combat ?? {},
		...globalThis.__colPremium?.forestPolicy?.() ?? {
			forest_after_level: 30,
			forest_reduction_percent: 30
		}
	};
	value.channel_capacity = Math.max(1, Math.min(30, Math.round(Number(value.channel_capacity) || 15)));
	return value;
}
function getGameSettings(){return readGameSettings(db());}
function safeName(value) {
	return typeof value === "string" ? value.replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 18) : "";
}
 function loadBlockedWords() {
	return (db().prepare("SELECT word FROM blocked_words ORDER BY word LIMIT 500").all()).results.map((row) => row.word);
}
function readGameInstance(request) {
	const value = request.headers.get("x-game-instance") ?? new URL(request.url).searchParams.get("instance") ?? "";
	return /^[a-f0-9-]{36}$/.test(value) ? value : "";
}
function isGameApi(path) {
	return [
		"/api/guild-skill",
		"/api/guild-chat",
		"/api/guild-voice",
		"/api/guild-village",
		"/api/ranks",
		"/api/community-event",
		"/api/guild",
		"/api/dungeon",
		"/api/premium",
		"/api/quests"
	].includes(path) || path === "/api/trade" || path === "/api/connection-diagnostics" || path === "/api/starter-reward" || path === "/api/bot-check" || path === "/api/action" || path === "/api/world" || path === "/api/chat" || path.startsWith("/api/realtime/") || path.startsWith("/api/black-zone/");
}
var SESSION_COOKIE_NAME = "__Host-yasam-session";
var CSRF_COOKIE_NAME = "__Host-yasam-csrf";
var LOCAL_SESSION_COOKIE_NAME = "yasam-session-local";
var LOCAL_CSRF_COOKIE_NAME = "yasam-csrf-local";
var SESSION_TOUCH_INTERVAL_SECONDS = 300;
var encoder = new TextEncoder();
var AuthRequestError = class extends Error {
	constructor(status, code, message, retryAfter) {
		super(message);
		this.name = "AuthRequestError";
		this.status = status;
		this.code = code;
		this.retryAfter = retryAfter;
	}
};
var realmRuntime = () => globalThis.__colRealm;
function authDatabase() {
	if (!env.DB) throw new Error("Cloudflare D1 `DB` bağlaması bulunamadı.");
	return env.DB;
}
function nowSeconds() {
	return Math.floor(Date.now() / 1e3);
}
function bytesToBase64Url(bytes) {
	let binary = "";
	for (const byte of bytes) binary += String.fromCharCode(byte);
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
 function sha256(value) {
	const bytes = encoder.encode(value);
	const runtime = env;
	if (bytes.byteLength <= 4096 && runtime.CORE_RUNTIME === "vds") {
		const nativeDigest = runtime.CORE_SHA256;
		if (typeof nativeDigest === "function") return nativeDigest(bytes);
	}
	return bytesToBase64Url(new Uint8Array(crypto.subtle.digest("SHA-256", bytes)));
}
function timingSafeEqual(left, right) {
	if (left.length !== right.length) return false;
	let difference = 0;
	for (let index = 0; index < left.length; index += 1) difference |= left[index] ^ right[index];
	return difference === 0;
}
function assertSameOrigin(request) {
	const origin = request.headers.get("Origin");
	let expectedOrigin;
	try {
		expectedOrigin = new URL(request.url).origin;
	} catch {
		throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
	}
	if (!origin || origin !== expectedOrigin) throw new AuthRequestError(403, "invalid_origin", "İstek kaynağı doğrulanamadı.");
}
 function readJsonObject(request, maxBytes = 16384) {
	if (request.headers.has("x-col-lab-proof")) try { colLabHttpAuth.captureBody(request); } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (!Number.isSafeInteger(maxBytes) || maxBytes < 256 || maxBytes > 65536) throw new Error("Geçersiz istek boyutu sınırı.");
	if (!(request.headers.get("Content-Type")?.toLowerCase() ?? "").startsWith("application/json")) throw new AuthRequestError(415, "unsupported_media_type", "İstek JSON biçiminde olmalı.");
	const declaredLength = Number(request.headers.get("Content-Length") ?? 0);
	if (Number.isFinite(declaredLength) && declaredLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
	if (!request.body) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	const reader = request.body.getReader();
	const decoder = new TextDecoder("utf-8", { fatal: true });
	let byteLength = 0;
	let serialized = "";
	try {
		while (true) {
			const { done, value } = reader.read();
			if (done) break;
			byteLength += value.byteLength;
			if (byteLength > maxBytes) {
				reader.cancel();
				throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
			}
			serialized += decoder.decode(value, { stream: true });
		}
		serialized += decoder.decode();
	} catch {
		if (byteLength > maxBytes) throw new AuthRequestError(413, "payload_too_large", "İstek çok büyük.");
		throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	}
	let payload;
	try {
		payload = JSON.parse(serialized);
	} catch {
		throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	}
	if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new AuthRequestError(400, "invalid_json", "İstek biçimi geçersiz.");
	return payload;
}
function cookieValue(request, name) {
	const header = request.headers.get("Cookie") ?? "";
	for (const part of header.split(";")) {
		const separator = part.indexOf("=");
		if (separator < 0) continue;
		if (part.slice(0, separator).trim() === name) return part.slice(separator + 1).trim();
	}
	return null;
}
function requestUsesSecureCookies(request) {
	try {
		return new URL(request.url).protocol === "https:";
	} catch {
		return true;
	}
}
function authCookieNames(request) {
	return requestUsesSecureCookies(request) ? {
		session: SESSION_COOKIE_NAME,
		csrf: CSRF_COOKIE_NAME,
		secure: true
	} : {
		session: LOCAL_SESSION_COOKIE_NAME,
		csrf: LOCAL_CSRF_COOKIE_NAME,
		secure: false
	};
}
function validOpaqueToken(value) {
	return Boolean(value && value.length >= 32 && value.length <= 128 && /^[A-Za-z0-9_-]+$/.test(value));
}
function csrfTokenFromRequest(request) {
	const token = cookieValue(request, authCookieNames(request).csrf);
	return validOpaqueToken(token) ? token : null;
}
const requestSessionHashes465 = new WeakMap();
 function getGameSession(request, onLookup) {
	const sessionToken = cookieValue(request, authCookieNames(request).session);
	if (!validOpaqueToken(sessionToken) || !sessionToken) return null;
	let digest = requestSessionHashes465.get(request);
	if (!digest || digest.token !== sessionToken) {
		digest = {token: sessionToken, hash: sha256(sessionToken)};
		requestSessionHashes465.set(request, digest);
	}
	const tokenHash = digest.hash;
	onLookup?.(tokenHash);
	return getGameSessionByHash(tokenHash, request);
}
 function getGameSessionByHash(tokenHash, request, trustedRealtime = false) {
	const now = nowSeconds();
	const record = authDatabase().prepare(realmRuntime()?.role === "accounts" ? `SELECT s.token_hash,s.account_id,s.csrf_hash,s.expires_at,s.last_seen_at,
      s.security_version,a.security_version AS account_security_version,a.suspended_until_ms,a.permanently_banned,a.ban_reason,a.username,a.email,
      NULL AS player_id,NULL AS player_name,NULL AS player_role,NULL AS player_area,NULL AS player_level,
      NULL AS instance_id,NULL AS presence_token_hash,NULL AS presence_expires_at_ms,NULL AS chat_after_id
      FROM auth_sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=? AND s.expires_at>? LIMIT 1` : `SELECT s.token_hash, s.account_id, s.csrf_hash, s.expires_at, s.last_seen_at,
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
     LIMIT 1`).bind(tokenHash, now).first();
	if (!record) return null;
	if (record.security_version !== record.account_security_version) return null;
	if (record.permanently_banned || record.suspended_until_ms > Date.now()) throw new AuthRequestError(423, "account_suspended", record.ban_reason || "Hesabın güvenlik nedeniyle geçici olarak askıya alındı.");
	const session = {
		tokenHash: record.token_hash,
		gamePresence: record.instance_id ? {
			instanceId: record.instance_id,
			tokenHash: record.presence_token_hash ?? "",
			expiresAtMs: record.presence_expires_at_ms ?? 0,
			chatAfterId: record.chat_after_id ?? 0
		} : void 0,
		account: {
			id: record.account_id,
			username: record.username,
			email: record.email
		},
		player: record.player_id && record.player_name && record.player_role ? {
			id: record.player_id,
			name: record.player_name,
			role: record.player_role
		} : null,
		playerAccess: record.player_id && record.player_area !== null && record.player_level !== null ? {
			area: record.player_area,
			level: record.player_level
		} : null,
		csrfHash: record.csrf_hash,
		expiresAt: record.expires_at,
		lastSeenAt: record.last_seen_at,
		securityVersion: record.security_version
	};
	try { const pending = colLabHttpAuth.beforeSessionTouch(request, session, trustedRealtime); if (pending) pending; } catch (errorR12) { throw new AuthRequestError(403, safeLoadLabAuthCodeR12(errorR12), "Test bağlantısı doğrulanamadı."); }
	if (record.last_seen_at <= now - SESSION_TOUCH_INTERVAL_SECONDS) authDatabase().prepare("UPDATE auth_sessions SET last_seen_at = ? WHERE token_hash = ? AND last_seen_at <= ?").bind(now, tokenHash, now - SESSION_TOUCH_INTERVAL_SECONDS).run();
	return session;
}
 function requireGameSession(request, onLookup) {
	return validateGameSession(request, getGameSession(request, onLookup));
}
 function requireRealtimeGameSession(request, tokenHash) {
	if (env.CORE_RUNTIME !== "vds") throw new AuthRequestError(403, "invalid_movement_transport", "Hareket bağlantısı doğrulanamadı.");
	return validateGameSession(request, getGameSessionByHash(tokenHash, request, true));
}
 function validateGameSession(request, session) {
	if (!session) throw new AuthRequestError(401, "authentication_required", "Oturum açmalısın.");
	const realm = realmRuntime(), path = new URL(request.url).pathname;
 if(realm?.maintenance&&!realm.maintenance.allows(session.account.id))throw new AuthRequestError(403,'game_maintenance','Oyun şu an bakımda.');
	if (realm?.role === "accounts") throw new AuthRequestError(403, "realm_required", "Önce sunucu seçmelisin.");
	if (realm?.role === "game") {
		if (realm.realm.status !== "open" || realm.policy?.status && realm.policy.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		const decision = realm.security.authorize(session.account.id, session.securityVersion);
		const allowed = typeof decision === "boolean" ? decision : decision;
		if (realm.policy?.status !== "open") throw new AuthRequestError(503, "realm_closed", "Sunucu kapalı.");
		if (!allowed&&realm.policy?.launch?.phase==="maintenance") throw new AuthRequestError(403,"game_maintenance","Oyun şu an bakımda.");
 if (!allowed) throw new AuthRequestError(401, "security_verification_required", "Oturumunu yeniden doğrula.");
	}
	const launch = globalThis.__colLaunch;
	if (realm?.role !== "game" && launch && !launch.status(session.account.id).canPlay) throw new AuthRequestError(403, "launch_locked", "Oyun henüz erişime açık değil. Açılış ekranına dön.");
	if (isGameApi(new URL(request.url).pathname)) {
		const presence = session.gamePresence;
		if (!presence || presence.instanceId !== readGameInstance(request) || presence.tokenHash !== session.tokenHash || presence.expiresAtMs <= Date.now()) throw new AuthRequestError(409, "game_instance_expired", "Bu oyun penceresinin oturumu açık değil. Yeniden bağlan.");
	}
	const pathname = new URL(request.url).pathname;
	const bot = globalThis.__colBotCheck;
	const mustCheckBot465 = bot && session.player && ![
		"/api/bot-check", "/api/game-presence", "/api/auth/logout", "/api/support"
	].includes(pathname) && (request.method !== "GET" || pathname.startsWith("/api/realtime/"));
	let botRequired465 = false;
	if (mustCheckBot465 && bot.requiredPrepared) {
		const result = bot.requiredPrepared(session.account.id);
		botRequired465 = typeof result === "boolean" ? result : result;
	} else {
		if (bot?.prepare && session.player) {
			const pending = bot.prepare(session.account.id);
			if (pending) pending;
		}
		if (mustCheckBot465) botRequired465 = bot.required(session.account.id);
	}
	if (botRequired465) throw new AuthRequestError(403, "bot_check_required", "Devam etmek için bot doğrulamasını tamamla.");
	if (session.player && session.playerAccess?.area?.startsWith("guild_")) {
		const { guildVillageService, publishGuildEjections } = import("../../../../native510-bb3a6cc689c6/dist-vds/server/channel-runtime/assets/guild-village-runtime-Dke_G6YB.js");
		const repair = guildVillageService()?.repair(session.player.id);
		if (repair) {
			session.playerAccess.area = repair.area;
			publishGuildEjections([repair]);
		}
	}
	return session;
}
 function assertCsrf(request, session) {
	assertSameOrigin(request);
	const cookieToken = csrfTokenFromRequest(request);
	const headerToken = request.headers.get("X-CSRF-Token");
	if (!validOpaqueToken(cookieToken) || !validOpaqueToken(headerToken) || !cookieToken || !headerToken) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	if (!timingSafeEqual(encoder.encode(cookieToken), encoder.encode(headerToken))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
	const submittedHash = sha256(headerToken);
	if (!timingSafeEqual(encoder.encode(submittedHash), encoder.encode(session.csrfHash))) throw new AuthRequestError(403, "invalid_csrf", "Güvenlik doğrulaması başarısız.");
}
function noStoreHeaders(initial) {
	const headers = new Headers(initial);
	headers.set("Cache-Control", "no-store, max-age=0");
	headers.set("Pragma", "no-cache");
	return headers;
}
var nextRateLimitCleanupAt = 0;
 function enforceRateLimit(scope, identifier, { limit, windowSeconds, blockSeconds }, loadlabRateContext = null) {
	const now = nowSeconds();
	const cutoff = now - windowSeconds;
	const key = sha256(`${scope}:${identifier}`);
	const database = authDatabase();
	const cleanupDue = !loadlabRateContext && now >= nextRateLimitCleanupAt;
	if (cleanupDue) nextRateLimitCleanupAt = now + 3600;
	const statements = [...cleanupDue ? [database.prepare("DELETE FROM auth_rate_limits WHERE blocked_until <= ? AND window_started_at <= ?").bind(now, now - 1440 * 60)] : [], database.prepare(`INSERT INTO auth_rate_limits (key, attempts, window_started_at, blocked_until)
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
     RETURNING attempts, blocked_until`).bind(key, now, now, cutoff, cutoff, now, now, cutoff, limit, now + blockSeconds)];
	if (loadlabRateContext) colLabHttpAuth.tagRateLimit(loadlabRateContext, statements[statements.length - 1], {scope,identifier,key,limit,windowSeconds,blockSeconds});
	const responses = database.batch(statements);
	const result = responses[responses.length - 1].results[0];
	if (!result || result.blocked_until > now || result.attempts > limit) throw new AuthRequestError(429, "rate_limited", "Çok fazla deneme yaptın. Bir süre sonra tekrar dene.", Math.max(1, (result?.blocked_until ?? now + blockSeconds) - now));
}
function authErrorResponse(error, fallback = "İşlem şu anda tamamlanamadı.") {
	if (error instanceof Error && error.message.includes("channel_full")) return Response.json({
		code: "channel_full",
		error: "Kanal dolu. Boş bir kanal seç veya yer açılmasını bekle."
	}, {
		status: 409,
		headers: noStoreHeaders()
	});
	if (error instanceof AuthRequestError) {
		const headers = noStoreHeaders();
		if (error.retryAfter) headers.set("Retry-After", String(error.retryAfter));
		return Response.json({
			error: error.message,
			code: error.code,
			...(error.code==='game_maintenance'&&globalThis.__colRealm?.maintenance?{maintenance438:globalThis.__colRealm.maintenance.view(),maintenanceRevision491:globalThis.__colRealm.maintenance.policy?.revision??0,snapshotAtMs:Date.now()}:{})
		}, {
			status: error.status,
			headers
		});
	}
	console.error("Auth operation failed", error instanceof Error ? error.message : "unknown error");
	return Response.json({ error: fallback }, {
		status: 500,
		headers: noStoreHeaders()
	});
}
function characterNameKey(name) {
	return name.normalize("NFKC").toLocaleLowerCase("tr-TR").replace(/ı/g, "i").replace(/\s+/gu, "");
}
var roles = new Set([
	"muhafiz",
	"avci",
	"arkanist"
]);
 function ensureStarterWeapon(database, playerId, power, now) {
	const starterId = `starter-${crypto.randomUUID()}`;
	database.batch([database.prepare(`INSERT OR IGNORE INTO player_items
        (id, player_id, kind, item_name, rarity, power, role, equipped, created_at)
       SELECT ?, id, 'weapon',
         CASE role WHEN 'avci' THEN 'Acemi Yayı' WHEN 'arkanist' THEN 'Acemi Asası' ELSE 'Acemi Kılıcı' END,
         'white', ?, role,
         CASE WHEN rod_equipped = 0 AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = players.id AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         ) THEN 1 ELSE 0 END,
         ?
       FROM players WHERE id = ? AND NOT EXISTS (
         SELECT 1 FROM player_items owned WHERE owned.player_id = players.id AND owned.kind = 'weapon'
       )`).bind(starterId, power, now, playerId), database.prepare(`UPDATE player_items SET equipped = 1
       WHERE id = ? AND player_id = ?
         AND EXISTS (SELECT 1 FROM players WHERE id = ? AND rod_equipped = 0)
         AND NOT EXISTS (
           SELECT 1 FROM player_items equipped_weapon
           WHERE equipped_weapon.player_id = ? AND equipped_weapon.kind = 'weapon' AND equipped_weapon.equipped = 1
         )`).bind(starterId, playerId, playerId, playerId)]);
}
 function joinExisting(context){const {auth,database,now,requestReceivedAtMs,joinSettings,labAccount504,payload,automatic504,initialEntry=false}=context;let requestedChannel=context.requestedChannel;
						const existing = database.prepare("SELECT id, channel, area, arena_match_id, x, y, hp, max_hp, hp_revision, respawn_at_ms, combat_lock_until_ms, level, is_gm, last_seen FROM players WHERE id = ? AND account_id = ?").bind(auth.player.id, auth.account.id).first();
						if (!existing) return Response.json({ error: "Hesabına bağlı karakter bulunamadı." }, { status: 409 });
                        requestedChannel=selectEntry504({database,player:existing,nowMs:requestReceivedAtMs,requestedChannel,automatic:automatic504,isLab:labAccount504||colLabIsPlayer(existing.id)});
                        if(colLabIsPlayer(existing.id)&&requestedChannel!==existing.channel)return Response.json({code:"loadlab_channel_fixed",error:"Test kanalı oturum boyunca sabittir."},{status:403});
						if (existing.area === "afk" && (existing.level < 30 || !joinSettings.afk_island_enabled && !existing.is_gm)) {
							database.prepare(`UPDATE players SET area='bazaar',x=?,y=?,position_revision=position_revision+1,
            realtime_scope_version=realtime_scope_version+1,motion_stream_id='',motion_sequence=0
            WHERE id=? AND area='afk'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, existing.id).run();
							Object.assign(existing, {
								area: "bazaar",
								x: BAZAAR_SPAWN.x,
								y: BAZAAR_SPAWN.y
							});
						}
						if (existing.area === "frozen" && (!joinSettings.frozen_zone_enabled || existing.level < 20)) {
							database.prepare(`UPDATE players SET area = 'bazaar', arena_match_id = '', x = ?, y = ?, movement_checked_at_ms = ?,
            movement_debt_ms = 0, motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1,
            realtime_scope_version = realtime_scope_version + 1, combat_lock_until_ms = 0 WHERE id = ? AND area = 'frozen'`).bind(BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, Date.now(), existing.id).run();
							existing.area = "bazaar";
							existing.arena_match_id = "";
							existing.combat_lock_until_ms = 0;
							existing.x = BAZAAR_SPAWN.x;
							existing.y = BAZAAR_SPAWN.y;
						}
						if ((existing.area === "arena" || existing.arena_match_id) && requestedChannel !== existing.channel) return Response.json({ error: "Arena maçı sürerken kanal değiştirilemez." }, { status: 409 });
						if (requestedChannel !== existing.channel) {
							if ((settlePveEngagement(database, existing.id, joinSettings, requestReceivedAtMs))?.dead) return Response.json({ error: "Yaratığın vuruşu önce gerçekleşti; yeniden doğmayı bekliyorsun." }, { status: 409 });
							if (!initialEntry && existing.combat_lock_until_ms > requestReceivedAtMs) return Response.json({ error: "Savaş sürerken kanal değiştiremezsin." }, { status: 409 });
						}
						if (!isAreaWalkablePosition(existing.area, existing.x, existing.y)) {
							const safeSpawn = existing.area === "frozen" ? FROZEN_SPAWN : existing.area === "forest" ? FOREST_SPAWN : BAZAAR_SPAWN;
							database.prepare(`UPDATE players SET x = ?, y = ?, movement_checked_at_ms = ?, movement_debt_ms = 0,
            motion_stream_id = '', motion_sequence = 0, position_revision = position_revision + 1 WHERE id = ? AND area = ?`).bind(safeSpawn.x, safeSpawn.y, Date.now(), existing.id, existing.area).run();
							existing.x = safeSpawn.x;
							existing.y = safeSpawn.y;
						}
						const joinStatement = database.prepare(`UPDATE players SET channel = ?, last_seen = ?,
             realtime_scope_version = realtime_scope_version + CASE WHEN channel != ? THEN 1 ELSE 0 END
           WHERE id = ? AND account_id = ?
           AND (channel = ? OR combat_lock_until_ms <= ? OR ? = 1)
           AND ((channel = ? AND last_seen >= ?) OR (SELECT COUNT(*) FROM players WHERE channel = ? AND id != ? AND last_seen >= ?) < ?)
           RETURNING channel`).bind(requestedChannel, now, requestedChannel, existing.id, auth.account.id, requestedChannel, requestReceivedAtMs, initialEntry ? 1 : 0, requestedChannel, now - 30, requestedChannel, existing.id, now - 30, channelCapacity510(requestedChannel,joinSettings.channel_capacity));
						const residentTransfer = requestedChannel !== existing.channel && typeof database.transferPlayer === "function";
						if (residentTransfer) ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						const joinedChannel = residentTransfer ? database.transferPlayer(existing.id, requestedChannel, joinStatement, [database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]) : joinStatement.first();
						if (!joinedChannel) return Response.json({
							code: "channel_full",
							error: `Kanal ${requestedChannel} dolu. Başka bir kanal seç.`
						}, { status: 409 });
						if (requestedChannel !== existing.channel && !residentTransfer) database.batch([database.prepare("DELETE FROM arena_queue WHERE player_id = ?").bind(existing.id)]);
						if (!residentTransfer) ensureStarterWeapon(database, existing.id, joinSettings.starter_weapon_power, now);
						return Response.json({
							ok: true,
							playerId: existing.id,
							channel: joinedChannel.channel,
							hp: existing.hp,
							maxHp: existing.max_hp,
							hpRevision: existing.hp_revision,
							respawnAtMs: existing.respawn_at_ms,
							message: `${existing.area === "bazaar" ? "Pazar Alanı" : existing.area === "forest" ? "Kuzey Ormanı" : existing.area === "frozen" ? "Donmuş Çam Geçidi" : "Kaldığın bölge"} · Kanal ${joinedChannel.channel}'e yeniden katıldın.`
						});
					}
 function createCharacter(context){const {auth,database,now,requestReceivedAtMs,joinSettings,payload,requestedChannel}=context;const realm = globalThis.__colRealm;
if (realm?.role === "game" && !auth.player && realm.policy?.registrationOpen === false) return Response.json({ error: "Bu sunucu yeni karakter kaydına kapalı." }, { status: 403 });
const name = safeName(payload.name);
if (hasForbiddenCharacterName(name, loadBlockedWords())) return Response.json({ error: "Karakter adı küfür veya uygunsuz sözcük içeremez." }, { status: 400 });
const nameKey = characterNameKey(name);
const role = roles.has(payload.role ?? "") ? payload.role : "muhafiz";
if (name.length < 2) return Response.json({ error: "Karakter adı en az 2 harf olmalı." }, { status: 400 });
const channel = requestedChannel;
const proposedPlayerId = crypto.randomUUID();
const legacyNames = database.prepare("SELECT id, name FROM players WHERE id NOT IN (SELECT player_id FROM character_names)").all();
for (let offset = 0; offset < legacyNames.results.length; offset += 50) database.batch(legacyNames.results.slice(offset, offset + 50).map((entry) => database.prepare("INSERT OR IGNORE INTO character_names (normalized_name, player_id) VALUES (?, ?)").bind(characterNameKey(entry.name), entry.id)));
try {
						database.batch([
							database.prepare(`INSERT INTO players (id, account_id, name, role, x, y, hp, max_hp, essence, contribution, xp, level, area, channel, last_seen, created_at)
         SELECT ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, 0, 1, 'bazaar', ?, ?, ?
         WHERE (SELECT COUNT(*) FROM players WHERE channel = ? AND last_seen >= ?) < ?
           AND NOT EXISTS (SELECT 1 FROM character_names WHERE normalized_name = ?)
         ON CONFLICT(account_id) DO NOTHING`).bind(proposedPlayerId, auth.account.id, name, role, BAZAAR_SPAWN.x, BAZAAR_SPAWN.y, joinSettings.player_max_hp, joinSettings.player_max_hp, channel, now, now, channel, now - 30, channelCapacity510(channel,joinSettings.channel_capacity), nameKey),
							database.prepare("INSERT INTO character_names (normalized_name, player_id) SELECT ?, id FROM players WHERE id = ?").bind(nameKey, proposedPlayerId),
							...env.CORE_RUNTIME === "vds" ? [database.prepare(STARTER_CHARACTER_GRANT_SQL).bind(requestReceivedAtMs, proposedPlayerId, auth.account.id)] : []
						]);
					} catch (error) {
						if (database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first()) return Response.json({
							error: "Bu karakter adı daha önce alınmış. Başka bir ad seç.",
							code: "character_name_taken"
						}, { status: 409 });
						throw error;
					}
const created = database.prepare("SELECT id, channel, hp, max_hp, hp_revision, respawn_at_ms FROM players WHERE account_id = ? LIMIT 1").bind(auth.account.id).first();
if (!created) {
						const taken = database.prepare("SELECT player_id FROM character_names WHERE normalized_name = ?").bind(nameKey).first();
						return Response.json({
							error: taken ? "Bu karakter adı daha önce alınmış. Başka bir ad seç." : "Kanal dolu; başka bir kanal seç.",
							code: taken ? "character_name_taken" : "channel_full"
						}, { status: 409 });
					}
ensureStarterWeapon(database, created.id, joinSettings.starter_weapon_power, now);
return Response.json({
						ok: true,
						playerId: created.id,
						channel: created.channel,
						hp: created.hp,
						maxHp: created.max_hp,
						hpRevision: created.hp_revision,
						respawnAtMs: created.respawn_at_ms,
						message: `Pazar Alanı · Kanal ${created.channel}'e katıldın.`
					});}
return {getGameSession,getGameSessionByHash,validateGameSession,requireGameSession,requireRealtimeGameSession,assertCsrf,assertSameOrigin,readJsonObject,authErrorResponse,noStoreHeaders,enforceRateLimit,ensureStarterWeapon,colRepairRuneV2Access,colRepairRuneAccess,repairAncientAccess,getGameSettings,AuthRequestError,joinExisting,createCharacter};
}
