import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
import {EVENT_WORLD444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {PVE_HEAD_SQL489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {RUNE_WORLD} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {clearPveEntry489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {colLabMayAffectMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabMonsterSource} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {specialization456 as colSpec456} from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import {equipmentTotalsR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-pure.mjs";
import {eventWalkable444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {isRuneV2Boss as nativeRuneV2Boss} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {optimizeR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-features.mjs";
import {pveArmSql489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {entriesR53 as pveEntries489,hitEngagementR53} from '../engagement-memory-r53.mjs';
import {pvePath489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
import {runeWalkable} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
const ambient=globalThis;
export function createRetaliationRules({random=Math.random,now=Date.now,globals=globalThis,fourChannels=false,publish=()=>{throw Error("retaliation_publish_unbound");}}={}) {
const globalThis=globals,Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date {static now(){return now();}};
const publishRealtimeRoomEvent=publish,deliverRealtime=value=>value;
const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");
function colRuneFactor(p,stat){return globalThis.__colRunes?.factor(p,stat)??1;}
var validEnchantments = new Set([
 "critical_damage491",
	"stone_talisman",
	"stone_talisman_color",
	"evolution_level",
	"evolution_kills",
	"evolution_attack",
	"evolution_critical",
	"evolution_players",
	"forest_power",
	"frozen_power",
	"fire",
	"ice",
	"sword_defense",
	"arrow_defense",
	"magic_defense",
	"strong_players",
	"resistant_players",
	"critical",
	"attack_speed","cast_speed",
	"life_steal",
	"attack_block",
	"hp",
	"stone_critical",
	"stone_attack",
	"stone_defense",
	"stone_block"
]);
var weaponForbiddenEnchantments = new Set([
	"sword_defense",
	"arrow_defense",
	"magic_defense",
	"resistant_players",
	"attack_block",
	"hp"
]);
function enchantmentFitsItem(kind,itemKind){if(kind==='critical_damage491')return itemKind==='helmet';if(!itemKind)return true;if(['forest_power','frozen_power','cast_speed'].includes(kind))return ['weapon','armor','necklace'].includes(itemKind);if(kind==='stone_talisman'||kind==='stone_talisman_color'||kind.startsWith('evolution_'))return itemKind==='weapon';if(kind==='attack_block')return itemKind==='armor'||itemKind==='helmet';if(kind==='stone_critical'||kind==='stone_attack')return itemKind==='weapon';if(kind==='stone_defense'||kind==='stone_block')return itemKind==='armor';if(itemKind==='weapon')return !weaponForbiddenEnchantments.has(kind);if(itemKind==='armor'||itemKind==='helmet')return kind!=='fire'&&kind!=='ice'&&kind!=='attack_speed';return kind!=='fire'&&kind!=='ice'&&kind!=='attack_speed'&&kind!=='life_steal';}
function parseEnchantments(value, itemKind) {
	if (typeof value !== "string" || !value) return [];
	try {
		const parsed = JSON.parse(value);
		if (!Array.isArray(parsed)) return [];
		return parsed.filter((entry) => validEnchantments.has(entry.kind) && Number.isFinite(Number(entry.value)) && (!["forest_power", "frozen_power"].includes(String(entry.kind)) || Number.isInteger(Number(entry.value)) && Number(entry.value) >= 1 && Number(entry.value) <= 10) && (![
			"attack_speed","cast_speed",
			"life_steal",
			"attack_block"
		].includes(String(entry.kind)) || Number(entry.value) > 0) && enchantmentFitsItem(entry.kind, itemKind)).map((entry) => ({
			kind: entry.kind,
			value: entry.kind.startsWith("evolution_") ? Math.max(0, Math.min(entry.kind === "evolution_kills" ? 1e9 : entry.kind === "evolution_level" ? 3 : entry.kind === "evolution_attack" ? 1e5 : 80, Math.floor(Number(entry.value)))) : entry.kind==="cast_speed"?Math.max(1,Math.min(50,Math.round(Number(entry.value)))):entry.kind === "attack_speed" ? Math.max(1, Math.min(80, Math.round(Number(entry.value)))) : entry.kind === "stone_critical" ? Math.max(7, Math.min(10, Math.round(Number(entry.value)))) : entry.kind === "stone_attack" ? Math.max(20, Math.min(30, Math.round(Number(entry.value)))) : entry.kind === "stone_defense" ? Math.max(30, Math.min(50, Math.round(Number(entry.value)))) : entry.kind === "stone_block" ? Math.max(6, Math.min(8, Math.round(Number(entry.value)))) : entry.kind === "life_steal" || entry.kind === "attack_block" ? Math.max(1, Math.min(15, Math.round(Number(entry.value)))) : Math.max(0, Math.min(entry.kind === "hp" ? 1e6 : 95, Math.round(Number(entry.value))))
		}));
	} catch {
		return [];
	}
}
function totalParsedEnchantments(entries, kind) {
	const total = entries.filter((entry) => entry.kind === kind).reduce((sum, entry) => sum + entry.value, 0);
	const cap = kind==='critical_damage491'?10:kind==="cast_speed"?50:kind === "forest_power" || kind === "frozen_power" ? 10 : kind === "stone_attack" ? 30 : kind === "stone_defense" ? 50 : kind === "stone_critical" ? 10 : kind === "stone_block" ? 8 : kind === "life_steal" ? 15 : kind === "attack_block" ? 15 : kind === "hp" ? 3e6 : kind === "resistant_players" ? 90 : 80;
	const evoKind = kind === "stone_attack" ? "evolution_attack" : kind === "critical" ? "evolution_critical" : kind === "strong_players" ? "evolution_players" : null;
	const talisman = kind === "stone_attack" && entries.some((e) => e.kind === "stone_talisman") ? 15 : 0;
	const evolution = evoKind ? entries.filter((e) => e.kind === evoKind).reduce((sum, e) => sum + e.value, 0) : 0;
	return Math.max(0, Math.min(cap, total)) + evolution + talisman;
}
function colEnhancementEntries491(item,entries) {
 // Keep the already parsed array and avoid allocations for unenhanced items
 // and name-less combat projection rows (which already contain virtual stats).
 if(typeof item?.item_name!=='string'||!item.item_name.startsWith('+5 '))return entries;
 if(item.kind==='weapon')entries.push({kind:'strong_players',value:5});
 else if(item.kind==='shoes')entries.push({kind:'strong_players',value:3});
 else if(item.kind==='armor')entries.push({kind:'resistant_players',value:5});
 else if(item.kind==='necklace')entries.push({kind:'resistant_players',value:3});
 else if(item.kind==='helmet')entries.push({kind:'critical_damage491',value:10});
 return entries;
}
function createEnchantmentTotals(items) {
 if(optimizeR18)return equipmentTotalsR18(items,parseEnchantments,colEnhancementEntries491,totalParsedEnchantments);
	const entries = items.flatMap((item) => colEnhancementEntries491(item,parseEnchantments(item.enchantments, item.kind)));
	return (kind) => totalParsedEnchantments(entries, kind);
}
function attackIsBlocked(percent, roll = Math.random()) {
	const chance = Math.max(0, Math.min(15, Number(percent) || 0));
	return chance > 0 && Number.isFinite(roll) && roll >= 0 && roll < chance / 100;
}
var EMPTY_RANK_BONUSES = Object.freeze({
	hp: 0,
	defense: 0,
	pve: 0,
	pvp: 0
});
var DRAGON_WORLD = Object.freeze({
	width: 3e3,
	height: 1875
});
function rankService() {
	return globalThis.__colRanks;
}
function serverRankBonuses(id) {
	return rankService()?.bonuses(id) ?? EMPTY_RANK_BONUSES;
}
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
function armorDamageReduction(defense, mode = "pvp") {
	const value = Number(defense);
	const safe = Number.isFinite(value) ? Math.max(0, value) : 0;
	const pve = mode === "pve";
	const divisor = pve ? 100 : 250;
	const oldCap = pve ? .8 : .55;
	const extraCap = pve ? .02 : .05;
	const excess = Math.max(0, safe - divisor * oldCap);
	return Math.min(oldCap, safe / divisor) + extraCap * (excess / (excess + divisor));
}
function isBlackStoneBoss476(id){return id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4';}
var FROZEN_BOSS_ID = "frozen-boss-1";
function isFrozenBossId(id) {
	return id === FROZEN_BOSS_ID;
}
function isFrozenWaterId(id) {
	return typeof id === "string" && id.startsWith("frozen-water-c");
}
function hasWingBonus(player) {
	return player?.wings_equipped === 1 || player?.core_wings === 1;
}
function monsterCombatPosition(monster, player) {
	if (Number(monster.root_until_ms) > Date.now()) return {
		ok: true,
		supplied: true,
		x: Number(monster.control_x),
		y: Number(monster.control_y)
	};
	if (monster.is_stone || isFrozenWaterId(monster.id) || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary) return {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
	const deltaX = player.x - monster.x;
	const deltaY = player.y - monster.y;
	const anchorDistance = Math.hypot(deltaX, deltaY);
	if (!anchorDistance) return {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
	const maximumChase = isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 460 : 480;
	const travel = Math.min(maximumChase, Math.max(0, anchorDistance - 85));
	const x = monster.x + deltaX / anchorDistance * travel;
	const y = monster.y + deltaY / anchorDistance * travel;
	return isAreaWalkablePosition(monster.area, x, y) ? {
		ok: true,
		supplied: true,
		x,
		y
	} : {
		ok: true,
		supplied: false,
		x: monster.x,
		y: monster.y
	};
}
function monsterIsInPlayerWorld(monster, player) {
    if(!colLabMayAffectMonster(player,monster))return false;
	if (monster.area !== player.area) return false;
	return monster.channel === 0 || monster.channel === player.channel;
}
function pveAggroRange(monster) {if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.stationary?0:(globalThis.__colAdventure?.profile(monster)?.range??320);if(monster.area==='event')return 320;
	return isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 370 : isFrozenWaterId(monster.id) ? 330 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : monster.id.startsWith("yutan") ? 300 : 230;
}
function pveAttackCadenceMs(monster) {if(isAdventureArea(monster.area))return globalThis.__colAdventure?.profile(monster)?.cadence??2200;if(monster.area==='event')return globalThis.__colEventIsland444?.profile(monster)?.cadence??2100;
	const base = isFrozenWaterId(monster.id) ? 2850 : isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" ? 2250 : monster.is_boss || monster.id === "dragon-world-1" ? 2100 : monster.variant === "katil" ? 800 : monster.variant === "agresif" || monster.summoned ? 950 : 1100;
	const jitter = [...monster.id].reduce((sum, character) => sum * 33 + character.charCodeAt(0) >>> 0, 0) % 221;
	return base + (monster.is_boss || monster.id === "dragon-world-1" || isBlackStoneBoss476(monster.id) || (isFrozenBossId(monster.id)||isRuneV2Boss(monster.id)) || monster.id === "ancient-boss-1" || isFrozenWaterId(monster.id) ? jitter : jitter % 81);
}
function pveDamage(monster, armorPower, player, settings) {if(isAdventureArea(monster.area)){const p=globalThis.__colAdventure?.profile(monster);if(!p)throw Error('adventure_combat_profile_missing');const raw=monster.runeDamageOverride484??p.damage;if(!raw)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:raw};}
 if(monster.area==='rune_v2'){const raw484=isRuneV2Boss(monster.id)&&Number.isSafeInteger(monster.runeDamageOverride484)&&monster.runeDamageOverride484>=0&&monster.runeDamageOverride484<=1000000?monster.runeDamageOverride484:globalThis.__colRuneV2?.monster(monster)?.damage??0;if(raw484===0)return {raw:0,amount:0,blocked:0};monster={...monster,exact_hit_damage:raw484};}if(monster.area==='rune'&&globalThis.__colRunes?.monster(monster)?.damage===0)return {raw:0,amount:0,blocked:0};
 if(monster.area==='rune')monster={...monster,exact_hit_damage:globalThis.__colRunes?.monster(monster)?.damage??0};
	if (monster.area === "afk") return {
		raw: 0,
		amount: 0,
		blocked: 0
	};
	const exactHitDamage = Number(monster.area==='event'?(globalThis.__colEventIsland444?.profile(monster)?.damage??1):monster.exact_hit_damage);
	const baseDamage = monster.id.startsWith("golge") ? 7 : monster.id.startsWith("curuk") ? 14 : 18;
	const variantDamage = Math.round(baseDamage * (monster.variant === "katil" ? settings.killer_variant_damage_scale : monster.variant === "agresif" ? settings.aggressive_variant_damage_scale : settings.normal_variant_damage_scale));
	const eliteBaseDamage = isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 48 : isFrozenWaterId(monster.id) ? 32 : monster.is_boss || monster.id === "dragon-world-1" ? 48 : variantDamage;
	const eliteDamageScale = isBlackStoneBoss476(monster.id) ? settings.black_stone_boss_damage_scale : isFrozenBossId(monster.id) ? settings.frozen_boss_damage_scale : monster.id === "ancient-boss-1" ? settings.ancient_boss_damage_scale : isFrozenWaterId(monster.id) ? settings.frozen_water_damage_scale : monster.is_boss || monster.id === "dragon-world-1" ? settings.boss_damage_scale : settings.regular_monster_damage_scale;
	const unscaledRaw479 = Number.isSafeInteger(exactHitDamage) && exactHitDamage >= 1 && exactHitDamage <= 1e6 ? exactHitDamage : Math.max(1, Math.round(eliteBaseDamage * eliteDamageScale * (monster.summoned ? settings.sinsi_stone_summon_damage_scale : 1)));
	const raw = monster.id === "dragon-world-1" && monster.area === "dragon" ? Math.round(unscaledRaw479 * 1.5) : unscaledRaw479;
	const reduction = armorDamageReduction((armorPower + (Number(player.jewelry_defense)||0) + (player.role==='muhafiz'?10:0) + (hasWingBonus(player) ? settings.wing_defense_bonus : 0))*colRuneFactor(player,'defense'), "pve");
	const amount = Math.max(1, Math.round(raw * (1 - reduction) * (player.special_guard_until_ms>Date.now()?1-(colSpec456(player.role,player.specialization,settings)?.guard??0):1)));
	if(monster.id==='dragon-world-1'&&monster.area==='dragon')return {raw:raw*4,amount:amount*4,blocked:(raw-amount)*4};
	return {
		raw,
		amount,
		blocked: raw - amount
	};
}
function preparePveEngagement(database, player, monster, nowMs) {if(isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary)return [];
 if(isRuneV2Boss(monster.id))return [];
    if(!colLabMayAffectMonster(player,monster))return [];
	if (player.area === "afk" || monster.is_stone || monster.hp <= 0) return [];
	const nextHitAtMs = nowMs + pveAttackCadenceMs(monster);
	const keepExisting = `pve_engagements.expires_at_ms >= excluded.updated_at_ms
    AND EXISTS (SELECT 1 FROM monsters live_monster
      WHERE live_monster.id = pve_engagements.monster_id
        AND live_monster.spawn_round = pve_engagements.spawn_round AND live_monster.hp > 0)`;
	return [database.prepare(`INSERT INTO pve_engagements
         (player_id, monster_id, spawn_round, next_hit_at_ms, expires_at_ms, hit_sequence, updated_at_ms, last_skill_at_ms,attackers489)
       SELECT ?, ?, ?, ?, ?, 0, ?, ?, ? FROM players current_player
       WHERE current_player.id = ? AND current_player.hp > 0
         AND current_player.area = ? AND current_player.channel = ? AND current_player.arena_match_id = ?
         AND current_player.realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM monsters current_monster
           WHERE current_monster.id = ? AND current_monster.spawn_round = ? AND current_monster.hp > 0)
       ON CONFLICT(player_id) DO UPDATE SET
         attackers489 = ${pveArmSql489()},
         monster_id = CASE WHEN ${keepExisting} THEN pve_engagements.monster_id ELSE excluded.monster_id END,
         spawn_round = CASE WHEN ${keepExisting} THEN pve_engagements.spawn_round ELSE excluded.spawn_round END,
         next_hit_at_ms = CASE WHEN ${keepExisting}
           THEN MIN(pve_engagements.next_hit_at_ms, excluded.next_hit_at_ms) ELSE excluded.next_hit_at_ms END,
         expires_at_ms = CASE WHEN ${keepExisting}
           THEN MAX(pve_engagements.expires_at_ms, excluded.expires_at_ms) ELSE excluded.expires_at_ms END,
         last_skill_at_ms = CASE WHEN ${keepExisting} THEN pve_engagements.last_skill_at_ms ELSE excluded.last_skill_at_ms END,
         updated_at_ms = excluded.updated_at_ms
       RETURNING player_id`).bind(player.id, monster.id, monster.spawn_round, nextHitAtMs, nowMs + 8e3, nowMs, nowMs, JSON.stringify({[monster.id]:{monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nowMs}}), player.id, player.area, player.channel, player.arena_match_id, player.realtime_scope_version, monster.id, monster.spawn_round), database.prepare(`UPDATE players SET combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
       WHERE id = ? AND hp > 0 AND area = ? AND channel = ? AND arena_match_id = ?
         AND realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM pve_engagements engagement
           WHERE engagement.player_id = players.id AND engagement.updated_at_ms = ?)`).bind(nowMs + 5e3, player.id, player.area, player.channel, player.arena_match_id, player.realtime_scope_version, nowMs)];
}
async function settlePveOne489(database,playerId,settings,nowMs,engagement,{player,monster,armorItems}) {

	if (!player || !monster || isRuneV2Boss(monster.id) || !colLabMayAffectMonster(player,monster) || player.area === "afk" || monster.area === "afk" || player.hp <= 0 || monster.hp <= 0 || monster.is_stone || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary || monster.spawn_round !== engagement.spawn_round || !monsterIsInPlayerWorld(monster, player)) {
		await clearPveEntry489(database,playerId,engagement);
		return null;
	}
	const monsterPosition = monster.provoked ? monsterCombatPosition(monster, player) : monster;
	const enemyRange = !monster.provoked ? pveAggroRange(monster) : isRuneV2Boss(monster.id) || isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 350 : isFrozenWaterId(monster.id) ? 300 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : 260;
	if (Math.hypot(player.x - monsterPosition.x, player.y - monsterPosition.y) > enemyRange) {
		await clearPveEntry489(database,playerId,engagement);
		return null;
	}
	if(monster.stun_until_ms>nowMs)return null;
	const equippedDefense = armorItems.results;
	let enchantmentTotals473_equippedDefense;
	const armorPower = equippedDefense.reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_defense");
	const attackBlocked = attackIsBlocked((enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("attack_block") + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_block"));
	const baseDamage = pveDamage(monster, armorPower + serverRankBonuses(player.id).defense, player, settings);
	const cadenceMs = pveAttackCadenceMs(monster);
	const fireBoss = colLabMonsterSource(monster.id) === "dunya-bosu-1" && monster.area === "sanctum" || monster.id === "dragon-world-1" && monster.area === "dragon";
	const fireIntervalMs = Math.max(1, Math.min(60, settings.boss_fire_interval_seconds ?? 7)) * 1e3;
	const lastSkillAt = engagement.last_skill_at_ms || engagement.next_hit_at_ms - cadenceMs;
	const fireSkill = fireBoss && nowMs >= lastSkillAt + fireIntervalMs;
	const multiplier = fireSkill ? Math.max(1, Math.min(5, settings.boss_fire_damage_multiplier ?? 1.2)) : 1;
	const calculatedDamage = fireSkill ? {
		amount: Math.max(1, Math.round(baseDamage.amount * multiplier)),
		raw: Math.round(baseDamage.raw * multiplier),
		blocked: Math.round(baseDamage.raw * multiplier) - Math.max(1, Math.round(baseDamage.amount * multiplier))
	} : baseDamage;
	const damage = attackBlocked ? {
		amount: 0,
		raw: calculatedDamage.raw,
		blocked: calculatedDamage.raw
	} : calculatedDamage;
	const nextSkillAt = fireSkill ? nowMs : lastSkillAt;
	const nextHitAtMs = fireBoss ? Math.min(nowMs + cadenceMs, nextSkillAt + fireIntervalMs) : nowMs + cadenceMs;
	const runeV2DeathPenalty483=player.area==='rune_v2'&&player.rune_v2_test483===0;
	const commitPve = (statements) => database.combat?.enabled ? database.combatBatch(statements, playerId) : database.batch(statements);
	const result = (await commitPve([
		database.prepare(`UPDATE players SET hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,${runeV2DeathPenalty483 ? "\n         gems=CASE WHEN hp<=? AND loadlab_run_id='' THEN MAX(0,gems-CAST(gems/20 AS INTEGER)) ELSE gems END," : ""}
         respawn_at_ms = CASE WHEN hp - ? <= 0 THEN ? ELSE 0 END,
         last_monster_hit_at = ?, last_seen = ?, combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
       WHERE id = ? AND hp > 0 AND area = ? AND channel = ? AND realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM pve_engagements e WHERE e.player_id = players.id
           AND json_extract(e.attackers489,?)=? AND json_extract(e.attackers489,?)=? AND ?<=?)
         AND EXISTS (SELECT 1 FROM monsters m WHERE m.id = ? AND m.hp > 0 AND m.spawn_round = ? AND m.stun_until_ms <= ?)
       RETURNING hp, max_hp, hp_revision, respawn_at_ms${runeV2DeathPenalty483 ? ",gems" : ""}`).bind(damage.amount, ...(runeV2DeathPenalty483?[damage.amount]:[]), damage.amount, nowMs + 2600, nowMs, Math.floor(nowMs / 1e3), nowMs + 5e3, playerId, player.area, player.channel,player.realtime_scope_version,pvePath489(monster.id)+'.spawn_round',monster.spawn_round,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms,engagement.next_hit_at_ms,nowMs,monster.id,monster.spawn_round,nowMs),
		database.prepare(`UPDATE pve_engagements SET attackers489=json_set(attackers489,?,json(?)),hit_sequence=hit_sequence+1,updated_at_ms=?,expires_at_ms=MAX(expires_at_ms,?),last_skill_at_ms=? WHERE player_id=? AND json_extract(attackers489,?)=? AND changes()>0`).bind(pvePath489(monster.id),JSON.stringify({monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nextSkillAt}),nowMs,nowMs+8000,nextSkillAt,playerId,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms),
        database.prepare(PVE_HEAD_SQL489).bind(playerId),
		database.prepare(`DELETE FROM pve_engagements WHERE player_id = ?
       AND EXISTS (SELECT 1 FROM players WHERE id = ? AND hp <= 0)`).bind(playerId, playerId)
	]))[0].results[0];
	if (!result) return null;
	const pveHit = {
		type: "player_hit",
		eventId: `pve:${playerId}:${result.hp_revision}`,
		cycle: player.world_cycle,
		area: player.area,
		channel: player.channel,
		spawnRound: monster.spawn_round,
		nextHitAtMs,
		ability: fireSkill ? "boss_fire" : "basic",
		targetId: playerId,
		monsterId: monster.id,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		hp: result.hp,
		maxHp: result.max_hp,
		hpRevision: result.hp_revision,
		respawnAtMs: result.respawn_at_ms,
		dead: result.hp <= 0,
		serverAt: nowMs
	};
	await deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0));
	return {
		...result,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		dead: result.hp <= 0,
		monsterId: monster.id,
		pveHit
	};
}
function retaliateMemory(port,playerId,settings,nowMs,engagement,{player,monster,armorItems}) {

	if (!player || !monster || isRuneV2Boss(monster.id) || !colLabMayAffectMonster(player,monster) || player.area === "afk" || monster.area === "afk" || player.hp <= 0 || monster.hp <= 0 || monster.is_stone || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary || monster.spawn_round !== engagement.spawn_round || !monsterIsInPlayerWorld(monster, player)) {
		port.clear(playerId,engagement);
		return null;
	}
	const monsterPosition = monster.provoked ? monsterCombatPosition(monster, player) : monster;
	const enemyRange = !monster.provoked ? pveAggroRange(monster) : isRuneV2Boss(monster.id) || isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 350 : isFrozenWaterId(monster.id) ? 300 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : 260;
	if (Math.hypot(player.x - monsterPosition.x, player.y - monsterPosition.y) > enemyRange) {
		port.clear(playerId,engagement);
		return null;
	}
	if(monster.stun_until_ms>nowMs)return null;
	const equippedDefense = armorItems.results;
	let enchantmentTotals473_equippedDefense;
	const armorPower = equippedDefense.reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_defense");
	const attackBlocked = attackIsBlocked((enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("attack_block") + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_block"));
	const baseDamage = pveDamage(monster, armorPower + serverRankBonuses(player.id).defense, player, settings);
	const cadenceMs = pveAttackCadenceMs(monster);
	const fireBoss = colLabMonsterSource(monster.id) === "dunya-bosu-1" && monster.area === "sanctum" || monster.id === "dragon-world-1" && monster.area === "dragon";
	const fireIntervalMs = Math.max(1, Math.min(60, settings.boss_fire_interval_seconds ?? 7)) * 1e3;
	const lastSkillAt = engagement.last_skill_at_ms || engagement.next_hit_at_ms - cadenceMs;
	const fireSkill = fireBoss && nowMs >= lastSkillAt + fireIntervalMs;
	const multiplier = fireSkill ? Math.max(1, Math.min(5, settings.boss_fire_damage_multiplier ?? 1.2)) : 1;
	const calculatedDamage = fireSkill ? {
		amount: Math.max(1, Math.round(baseDamage.amount * multiplier)),
		raw: Math.round(baseDamage.raw * multiplier),
		blocked: Math.round(baseDamage.raw * multiplier) - Math.max(1, Math.round(baseDamage.amount * multiplier))
	} : baseDamage;
	const damage = attackBlocked ? {
		amount: 0,
		raw: calculatedDamage.raw,
		blocked: calculatedDamage.raw
	} : calculatedDamage;
	const nextSkillAt = fireSkill ? nowMs : lastSkillAt;
	const nextHitAtMs = fireBoss ? Math.min(nowMs + cadenceMs, nextSkillAt + fireIntervalMs) : nowMs + cadenceMs;
	const runeV2DeathPenalty483=player.area==='rune_v2'&&player.rune_v2_test483===0;
	const result = port.hit({playerId,player,monster,engagement,damage,nowMs,nextHitAtMs,nextSkillAt,runeV2DeathPenalty483});
	if (!result) return null;
	const pveHit = {
		type: "player_hit",
		eventId: `pve:${playerId}:${result.hp_revision}`,
		cycle: player.world_cycle,
		area: player.area,
		channel: player.channel,
		spawnRound: monster.spawn_round,
		nextHitAtMs,
		ability: fireSkill ? "boss_fire" : "basic",
		targetId: playerId,
		monsterId: monster.id,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		hp: result.hp,
		maxHp: result.max_hp,
		hpRevision: result.hp_revision,
		respawnAtMs: result.respawn_at_ms,
		dead: result.hp <= 0,
		serverAt: nowMs
	};
	port.publish(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0);
	return {
		...result,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		dead: result.hp <= 0,
		monsterId: monster.id,
		pveHit
	};
}
function retaliateWriter(database,playerId,settings,nowMs,engagement,{player,monster,armorItems}) {

	if (!player || !monster || isRuneV2Boss(monster.id) || !colLabMayAffectMonster(player,monster) || player.area === "afk" || monster.area === "afk" || player.hp <= 0 || monster.hp <= 0 || monster.is_stone || isAdventureArea(monster.area)&&globalThis.__colAdventure?.profile(monster)?.stationary || monster.spawn_round !== engagement.spawn_round || !monsterIsInPlayerWorld(monster, player)) {
		clearWriter(database,playerId,engagement);
		return null;
	}
	const monsterPosition = monster.provoked ? monsterCombatPosition(monster, player) : monster;
	const enemyRange = !monster.provoked ? pveAggroRange(monster) : isRuneV2Boss(monster.id) || isBlackStoneBoss476(monster.id) || isFrozenBossId(monster.id) || monster.id === "ancient-boss-1" ? 350 : isFrozenWaterId(monster.id) ? 300 : monster.is_boss || monster.id === "dragon-world-1" ? 320 : 260;
	if (Math.hypot(player.x - monsterPosition.x, player.y - monsterPosition.y) > enemyRange) {
		clearWriter(database,playerId,engagement);
		return null;
	}
	if(monster.stun_until_ms>nowMs)return null;
	const equippedDefense = armorItems.results;
	let enchantmentTotals473_equippedDefense;
	const armorPower = equippedDefense.reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_defense");
	const attackBlocked = attackIsBlocked((enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("attack_block") + (enchantmentTotals473_equippedDefense ??= createEnchantmentTotals(equippedDefense))("stone_block"));
	const baseDamage = pveDamage(monster, armorPower + serverRankBonuses(player.id).defense, player, settings);
	const cadenceMs = pveAttackCadenceMs(monster);
	const fireBoss = colLabMonsterSource(monster.id) === "dunya-bosu-1" && monster.area === "sanctum" || monster.id === "dragon-world-1" && monster.area === "dragon";
	const fireIntervalMs = Math.max(1, Math.min(60, settings.boss_fire_interval_seconds ?? 7)) * 1e3;
	const lastSkillAt = engagement.last_skill_at_ms || engagement.next_hit_at_ms - cadenceMs;
	const fireSkill = fireBoss && nowMs >= lastSkillAt + fireIntervalMs;
	const multiplier = fireSkill ? Math.max(1, Math.min(5, settings.boss_fire_damage_multiplier ?? 1.2)) : 1;
	const calculatedDamage = fireSkill ? {
		amount: Math.max(1, Math.round(baseDamage.amount * multiplier)),
		raw: Math.round(baseDamage.raw * multiplier),
		blocked: Math.round(baseDamage.raw * multiplier) - Math.max(1, Math.round(baseDamage.amount * multiplier))
	} : baseDamage;
	const damage = attackBlocked ? {
		amount: 0,
		raw: calculatedDamage.raw,
		blocked: calculatedDamage.raw
	} : calculatedDamage;
	const nextSkillAt = fireSkill ? nowMs : lastSkillAt;
	const nextHitAtMs = fireBoss ? Math.min(nowMs + cadenceMs, nextSkillAt + fireIntervalMs) : nowMs + cadenceMs;
	const runeV2DeathPenalty483=player.area==='rune_v2'&&player.rune_v2_test483===0;
	const commitPve = (statements) => database.combat?.enabled ? database.combatBatch(statements, playerId) : database.batch(statements);
	const result = (commitPve([
		database.prepare(`UPDATE players SET hp = MAX(0, hp - ?), hp_revision = hp_revision + 1,${runeV2DeathPenalty483 ? "\n         gems=CASE WHEN hp<=? AND loadlab_run_id='' THEN MAX(0,gems-CAST(gems/20 AS INTEGER)) ELSE gems END," : ""}
         respawn_at_ms = CASE WHEN hp - ? <= 0 THEN ? ELSE 0 END,
         last_monster_hit_at = ?, last_seen = ?, combat_lock_until_ms = MAX(combat_lock_until_ms, ?)
       WHERE id = ? AND hp > 0 AND area = ? AND channel = ? AND realtime_scope_version = ?
         AND EXISTS (SELECT 1 FROM pve_engagements e WHERE e.player_id = players.id
           AND json_extract(e.attackers489,?)=? AND json_extract(e.attackers489,?)=? AND ?<=?)
         AND EXISTS (SELECT 1 FROM monsters m WHERE m.id = ? AND m.hp > 0 AND m.spawn_round = ? AND m.stun_until_ms <= ?)
       RETURNING hp, max_hp, hp_revision, respawn_at_ms${runeV2DeathPenalty483 ? ",gems" : ""}`).bind(damage.amount, ...(runeV2DeathPenalty483?[damage.amount]:[]), damage.amount, nowMs + 2600, nowMs, Math.floor(nowMs / 1e3), nowMs + 5e3, playerId, player.area, player.channel,player.realtime_scope_version,pvePath489(monster.id)+'.spawn_round',monster.spawn_round,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms,engagement.next_hit_at_ms,nowMs,monster.id,monster.spawn_round,nowMs),
		database.prepare(`UPDATE pve_engagements SET attackers489=json_set(attackers489,?,json(?)),hit_sequence=hit_sequence+1,updated_at_ms=?,expires_at_ms=MAX(expires_at_ms,?),last_skill_at_ms=? WHERE player_id=? AND json_extract(attackers489,?)=? AND changes()>0`).bind(pvePath489(monster.id),JSON.stringify({monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nextSkillAt}),nowMs,nowMs+8000,nextSkillAt,playerId,pvePath489(monster.id)+'.next_hit_at_ms',engagement.next_hit_at_ms),
        database.prepare(PVE_HEAD_SQL489).bind(playerId),
		database.prepare(`DELETE FROM pve_engagements WHERE player_id = ?
       AND EXISTS (SELECT 1 FROM players WHERE id = ? AND hp <= 0)`).bind(playerId, playerId)
	]))[0].results[0];
	if (!result) return null;
	const pveHit = {
		type: "player_hit",
		eventId: `pve:${playerId}:${result.hp_revision}`,
		cycle: player.world_cycle,
		area: player.area,
		channel: player.channel,
		spawnRound: monster.spawn_round,
		nextHitAtMs,
		ability: fireSkill ? "boss_fire" : "basic",
		targetId: playerId,
		monsterId: monster.id,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		hp: result.hp,
		maxHp: result.max_hp,
		hpRevision: result.hp_revision,
		respawnAtMs: result.respawn_at_ms,
		dead: result.hp <= 0,
		serverAt: nowMs
	};
	deliverRealtime(publishRealtimeRoomEvent(player.world_cycle, player.channel, player.area, pveHit, player.arena_match_id || void 0));
	return {
		...result,
		damage: damage.amount,
		blocked: damage.blocked,
		attackBlocked,
		dead: result.hp <= 0,
		monsterId: monster.id,
		pveHit
	};
}
function clearWriter(database,playerId,engagement){
 const path=pvePath489(engagement.monster_id),statements=[
  database.prepare(`UPDATE pve_engagements SET attackers489=json_remove(attackers489,?) WHERE player_id=? AND json_extract(attackers489,?)=? AND json_extract(attackers489,?)=?`).bind(path,playerId,path+'.spawn_round',engagement.spawn_round,path+'.next_hit_at_ms',engagement.next_hit_at_ms),
  database.prepare(PVE_HEAD_SQL489).bind(playerId),
  database.prepare("DELETE FROM pve_engagements WHERE player_id=? AND attackers489='{}'").bind(playerId)
 ];
 return database.combat?.enabled?database.combatBatch(statements,playerId):database.batch(statements);
}
function prepareFrame(database,playerId,entries489){
const frameStatementsR18=[
		database.prepare(`SELECT role,specialization,special_guard_until_ms,jewelry_defense,stat_attack,stat_defense,stat_hp,level,rank_tier,rune_defense_level,id, x, y, hp, max_hp, hp_revision, respawn_at_ms, area, channel, arena_match_id, realtime_scope_version,loadlab_run_id,
        CASE WHEN area='rune_v2' THEN (length(loadlab_run_id)>0
          OR EXISTS(SELECT 1 FROM loadlab_entities_v1 e WHERE e.id=players.id OR e.account_id=players.account_id)
          OR EXISTS(SELECT 1 FROM loadlab_admissions_v1 a WHERE a.account_id=players.account_id)) ELSE 0 END AS rune_v2_test483, wings_equipped, (SELECT equipped FROM dungeon_wings WHERE player_id=players.id) AS core_wings,
        COALESCE((SELECT cycle FROM world_state WHERE id = 1), 1) AS world_cycle
       FROM players WHERE id = ? LIMIT 1`).bind(playerId),
		database.prepare(`SELECT monster.id, monster.name, monster.x, monster.y, monster.hp, monster.max_hp,
        monster.respawn_at, monster.variant, monster.is_boss, monster.despawn_at, monster.spawn_round,
        monster.area, monster.channel, monster.is_stone,monster.loadlab_run_id,monster.stun_until_ms, monster.wave_stage, monster.summoned,
        monster.parent_stone_id, profile.hit_damage AS exact_hit_damage,
        EXISTS (SELECT 1 FROM monster_participants participant WHERE participant.player_id = ?
          AND participant.monster_id = monster.id AND participant.spawn_round = monster.spawn_round) AS provoked
       FROM monsters monster
       LEFT JOIN all_monster_combat_profiles profile
         ON monster.area IN ('forest', 'frozen', 'black', 'ancient')
        AND monster.variant IN ('normal', 'agresif', 'katil')
        AND monster.summoned = 0 AND monster.is_boss = 0 AND monster.is_stone = 0
        AND profile.area = monster.area AND profile.variant = monster.variant
        AND profile.family = CASE
          WHEN monster.area = 'black' THEN 'slot' || substr(monster.id, -1)
          WHEN monster.id LIKE 'golge-%' THEN 'golge'
          WHEN monster.id LIKE 'curuk-%' THEN 'curuk'
          WHEN monster.id LIKE 'yutan-%' THEN 'yutan'
          ELSE NULL END
       WHERE monster.id IN (SELECT value FROM json_each(?))`).bind(playerId,JSON.stringify(entries489.map(e=>e.monster_id))),
		database.prepare("SELECT kind, item_name, power, enchantments, equipped FROM player_items WHERE player_id = ? AND kind IN ('armor','helmet','shoes','necklace','costume') AND equipped = 1").bind(playerId)
	];
return frameStatementsR18;
}
function settleAllMemory(port,playerId,settings,nowMs){const row489=port.row(playerId);if(!row489||row489.next_hit_at_ms>nowMs)return null;const entries489=pveEntries489(row489);const {player,monsters489,armorItems}=port.frame(playerId,entries489); const byId489=new Map(monsters489.results.map(m=>[m.id,m]));let result489=null;
 for(const entry489 of entries489){if(entry489.next_hit_at_ms>nowMs)continue;const monster489=byId489.get(entry489.monster_id);

  const next489=port.one(playerId,settings,nowMs,hitEngagementR53(row489,entry489),{player,monster:monster489,armorItems});
  if(next489)result489=next489;if(next489?.dead)break;
 }
 return result489;
}
async function settleAllNative(database,playerId,settings,nowMs){const row489=await database.prepare("SELECT * FROM pve_engagements WHERE player_id=? LIMIT 1").bind(playerId).first();if(!row489||row489.next_hit_at_ms>nowMs)return null;const entries489=pveEntries489(row489);const frame=prepareFrame(database,playerId,entries489);const [player,monsters489,armorItems]=await Promise.all([frame[0].first(),frame[1].all(),frame[2].all()]); const byId489=new Map(monsters489.results.map(m=>[m.id,m]));let result489=null;
 for(const entry489 of entries489){if(entry489.next_hit_at_ms>nowMs)continue;const monster489=byId489.get(entry489.monster_id);
  if(monster489&&database.combat?.enabled&&!database.channelCompute)database.combat.syncEntity('monsters',monster489.id);
  const next489=await settlePveOne489(database,playerId,settings,nowMs,{...row489,...entry489},{player,monster:monster489,armorItems});
  if(next489)result489=next489;if(next489?.dead)break;
 }
 return result489;
}
function settleAllWriter(database,playerId,settings,nowMs){const row489=database.prepare("SELECT * FROM pve_engagements WHERE player_id=? LIMIT 1").bind(playerId).first();if(!row489||row489.next_hit_at_ms>nowMs)return null;const entries489=pveEntries489(row489);const frame=prepareFrame(database,playerId,entries489);const [player,monsters489,armorItems]=[frame[0].first(),frame[1].all(),frame[2].all()]; const byId489=new Map(monsters489.results.map(m=>[m.id,m]));let result489=null;
 for(const entry489 of entries489){if(entry489.next_hit_at_ms>nowMs)continue;const monster489=byId489.get(entry489.monster_id);
  if(monster489&&database.combat?.enabled&&!database.channelCompute)database.combat.syncEntity('monsters',monster489.id);
  const next489=retaliateWriter(database,playerId,settings,nowMs,{...row489,...entry489},{player,monster:monster489,armorItems});
  if(next489)result489=next489;if(next489?.dead)break;
 }
 return result489;
}
const runeBossDamage=(boss,player,items,raw,settings)=>{
  if(raw===0)return {amount:0,raw:0,blocked:0,attackBlocked:false};
  const totals=createEnchantmentTotals(items),armor=items.reduce((sum,item)=>sum+Math.max(0,Number(item.power)||0),0)+totals('stone_defense');
  const calculated=pveDamage({...boss,runeDamageOverride484:raw},armor+serverRankBonuses(player.id).defense,player,settings),blocked=attackIsBlocked(totals('attack_block')+totals('stone_block'));
  return blocked?{amount:0,raw:calculated.raw,blocked:calculated.raw,attackBlocked:true}:{...calculated,attackBlocked:false};
 };
return Object.freeze({retaliateNative:settlePveOne489,retaliateMemory,retaliateWriter,settleAllMemory,settleAllNative,settleAllWriter,clearWriter,preparePveEngagement,pveAttackCadenceMs,prepareFrame,isRuneV2Boss,runeBossDamage,monsterCombatPosition});
}
