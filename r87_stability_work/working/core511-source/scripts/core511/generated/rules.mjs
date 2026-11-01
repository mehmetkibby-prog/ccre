import {GROUND_LOOT_SECONDS} from '../ground-loot-expiry.mjs';
// R31 fixed belt catalogue; generated extraction remains otherwise intact.
import {beltStats} from '../belt-model.mjs';
import {isAdventureArea,isMistArea,adventureBounds,adventureWalkable,adventureSegment,adventureMonsterId} from '../adventure-maps.mjs';
import {RUNE_TYPES} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {RUNE_LOOT_LABELS} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {EVENT_WORLD444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {RUNE_WORLD} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {balanceArea487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {balanceFactor487,levelExemptEnabledR58} from "../level-rewards-r58.mjs";
import {balanceFromSnapshot487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {catalogMultiplier487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {colLabMonsterSource} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {specialization456 as colSpec456} from "../../../../native510-bb3a6cc689c6/lib/expansion456.mjs";
import {equipmentTotalsR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-pure.mjs";
import {eventSegment444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {eventWalkable444} from "../../../../native510-bb3a6cc689c6/lib/event-island444.mjs";
import {isRuneV2Boss as nativeRuneV2Boss} from "../../../../native510-bb3a6cc689c6/lib/rune-v2.mjs";
import {materialLevelItem498} from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import {materialLevelPolicy498} from "../../../../native510-bb3a6cc689c6/lib/material-level498.mjs";
import {optimizeR18} from "../../../../native510-bb3a6cc689c6/vds-server/src/perf-r18-features.mjs";
import {runeWalkable} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {runeWalkableSegment} from "../../../../native510-bb3a6cc689c6/lib/runes.mjs";
import {scaleLootGroups487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
const ambient=globalThis;
export function createRules({random=Math.random,now=Date.now,globals=globalThis,uuid=()=>ambient.crypto.randomUUID(),fourChannels=false}={}) {
const globalThis=globals,crypto={randomUUID:uuid};const Math=Object.create(ambient.Math);Math.random=random;const Date=class extends ambient.Date {static now(){return now();}};
const isRuneV2Boss=id=>nativeRuneV2Boss(id)||(fourChannels&&id==="rune-v2-boss-c4-1");
function prepareRuneDrops(profile,participants,monsterId,center,settings,now,helpers,random=Math.random){
 const rules=profile.runeLoot,rows=[];if(!rules||!participants.length)return rows;
 const owner=participants[Math.min(participants.length-1,Math.floor(random()*participants.length))];
 helpers.onOwner487?.(owner);
 for(const [kind,rule]of Object.entries(rules)){
  if(!(rule.chance>0)||random()*100>=rule.chance*(helpers.balance487?.(kind,owner)??1))continue;
  const amount=rule.min+Math.floor(random()*(rule.max-rule.min+1));
  if(['white','blue','orange','red','purple','emerald'].includes(kind)){
   for(let n=0;n<amount;n++){const slots=['weapon','armor','helmet','shoes','necklace'],gearKind=slots[Math.floor(random()*slots.length)],role=helpers.role(),item={type:'gear',family:'generic',kind:gearKind,rarity:kind};
    rows.push([crypto.randomUUID(),owner.player_id,monsterId,gearKind,helpers.name(item,role),kind,helpers.power(item,settings),1,role,JSON.stringify(helpers.enchants(settings,gearKind)),center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+GROUND_LOOT_SECONDS,now+5]);}
  }else{
   const label=RUNE_LOOT_LABELS[kind]??kind;
   rows.push([crypto.randomUUID(),owner.player_id,monsterId,kind,label,kind in RUNE_TYPES?'unique':'white',0,amount,null,'[]',center.x+rows.length%5*10,center.y+Math.floor(rows.length/5)*8,now+GROUND_LOOT_SECONDS,now+5]);
  }
 }
 return rows;
}
function eventKind444(value){const id=typeof value==='string'?value:value?.id??'';if(!id.startsWith('event-'))return null;return (fourChannels?/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-4]-[a-f0-9-]{36}$/:/^event-(world|frozen|water|ancient|dragon|dungeon|solo)-c[1-3]-[a-f0-9-]{36}$/).exec(id)?.[1]??null;}
function colTransferLevel491(item){if(!item||!["weapon","armor","helmet","shoes","necklace","earring","bracelet"].includes(item.kind))return 0;const match=/^\+([0-5]) /.exec(String(item.item_name??''));return match?Number(match[1]):0;}
function colTransferBonus491(item){return (item?.kind==='weapon'?[0,3,8,15,25,40]:[0,2,6,11,18,28])[colTransferLevel491(item)];}
function colJewelry456(items){let attack=0,defense=0,castSpeed=0,strongPlayers=0,resistantPlayers=0;for(const i of items){if(i.equipped!==1)continue;if(i.kind==='earring'){attack+=20;castSpeed+=10;strongPlayers+=5;defense+=colTransferBonus491(i);}else if(i.kind==='bracelet'){attack+=20;defense+=50;resistantPlayers+=5;defense+=colTransferBonus491(i);}}return {attack,defense,castSpeed,strongPlayers,resistantPlayers};}
const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
function colRuneFactor(p,stat){return globalThis.__colRunes?.factor(p,stat)??1;}
var PROGRESSION_MATERIALS = Object.freeze({forge_ember491:{"label":"Kor Mührü","image":"../game/forge-ember-v491","note":"Tüm canavarlardan kazanılabilen artı basma malzemesi. Demirci Haso’da kullanılır; pazarda satılabilir."},"rune_defense":{label:"Safir Siper Parçası",image:"rune-defense-v422-shard"},"rune_attack":{label:"Kızıl Kudret Parçası",image:"rune-attack-v422-shard"},"rune_hp":{label:"Zümrüt Yaşam Parçası",image:"rune-hp-v422-shard"},
	solo_key: {
		label: "Zindan Anahtarı",
		image: "solo-key-v410",
		note: "Demirci Haso’da 3 İnci + 100 Mücevher karşılığında üretilir. Bir solo zindan girişi için kullanılır."
	},
	weathered_iron: {
		label: "Eskitilmiş Demir Parçası",
		image: "weathered-iron-v410",
		note: "Solo zindan bossunun özel malzemesi."
	},
	strong_branch: {
		label: "Güçlü Dal",
		image: "strong-branch-v410",
		area: "forest",
		areaName: "Kuzey Ormanı",
		note: "Kuzey Ormanı canavarlarından düşen artı basma malzemesi."
	},
	strong_crystal: {
		label: "Güçlü Kristal",
		image: "strong-crystal-v410",
		area: "frozen",
		areaName: "Donmuş Çam Geçidi",
		note: "Donmuş Çam Geçidi canavarlarından düşen artı basma malzemesi."
	},
	desert_plant: {
		label: "Çöl Bitkisi",
		image: "desert-plant-v410",
		area: "black",
		areaName: "Kara Bölge",
		note: "Kara Bölge canavarlarından düşen artı basma malzemesi."
	},
	master_scroll: {
		label: "Usta Parşömeni",
		image: "master-scroll-v410",
		area: "ancient",
		areaName: "Kadim Kök Vadisi",
		note: "Kadim Kök Vadisi canavarlarından düşen artı basma malzemesi."
	}
});
var UPGRADE_MATERIAL_KINDS = Object.freeze([
	"strong_branch",
	"strong_crystal",
	"desert_plant",
	"master_scroll"
]);
function progressionMaterial(kind) {
	return typeof kind === "string" && Object.hasOwn(PROGRESSION_MATERIALS, kind) ? PROGRESSION_MATERIALS[kind] : null;
}
function materialForSource(source) {
	const area = String(source).split(".")[0];
	return UPGRADE_MATERIAL_KINDS.find((kind) => PROGRESSION_MATERIALS[kind].area === area);
}
var LOOT_PPM = 1e6;
var LOOT_BPS = 1e4;
var LOOT_GEAR_KINDS = [
	"weapon",
	"armor",
	"helmet",
	"shoes",
	"necklace"
];
var OPEN_WORLD_LOOT_GEAR_KINDS = [
	"weapon",
	"armor",
	"shoes",
	"necklace"
];
var SPECIAL_LOOT_RESOURCES = ["pearl", "stone_dust"];
var LOOT_SOURCE_DEFINITIONS = [
	{
		key: "ancient.golge.normal",
		label: "Kadim Kök Vadisi · Kızıl Pençe",
		zone: "ancient"
	},
	{
		key: "ancient.curuk.normal",
		label: "Kadim Kök Vadisi · Kök Muhafızı",
		zone: "ancient"
	},
	{
		key: "ancient.yutan.normal",
		label: "Kadim Kök Vadisi · Kül Kâhini",
		zone: "ancient"
	},
	{
		key: "black.slot1",
		label: "Kara Bölge · 1. Obsidyen Akrep",
		zone: "black"
	},
	{
		key: "black.slot2",
		label: "Kara Bölge · 2. Kumtaşı Golemi",
		zone: "black"
	},
	{
		key: "black.slot3",
		label: "Kara Bölge · 3. Mezar Muhafızı",
		zone: "black"
	},
	{
		key: "black.slot4",
		label: "Kara Bölge · 4. Kül Çakalı",
		zone: "black"
	},
	{
		key: "black.slot5",
		label: "Kara Bölge · 5. Obsidyen Akrep",
		zone: "black"
	},
	{
		key: "black.slot6",
		label: "Kara Bölge · 6. Kumtaşı Golemi",
		zone: "black"
	},
	{
		key: "black.slot7",
		label: "Kara Bölge · 7. Mezar Muhafızı",
		zone: "black"
	},
	{
		key: "black.slot8",
		label: "Kara Bölge · 8. Kül Çakalı",
		zone: "black"
	},
	{
		key: "forest.golge.normal",
		label: "Kuzey Ormanı · Gölge Kurdu · Normal",
		zone: "forest"
	},
	{
		key: "forest.golge.agresif",
		label: "Kuzey Ormanı · Gölge Kurdu · Agresif",
		zone: "forest"
	},
	{
		key: "forest.golge.katil",
		label: "Kuzey Ormanı · Gölge Kurdu · Katil",
		zone: "forest"
	},
	{
		key: "forest.curuk.normal",
		label: "Kuzey Ormanı · Çürük Muhafız · Normal",
		zone: "forest"
	},
	{
		key: "forest.curuk.agresif",
		label: "Kuzey Ormanı · Çürük Muhafız · Agresif",
		zone: "forest"
	},
	{
		key: "forest.curuk.katil",
		label: "Kuzey Ormanı · Çürük Muhafız · Katil",
		zone: "forest"
	},
	{
		key: "forest.yutan.normal",
		label: "Kuzey Ormanı · Öz Yutan · Normal",
		zone: "forest"
	},
	{
		key: "forest.yutan.agresif",
		label: "Kuzey Ormanı · Öz Yutan · Agresif",
		zone: "forest"
	},
	{
		key: "forest.yutan.katil",
		label: "Kuzey Ormanı · Öz Yutan · Katil",
		zone: "forest"
	},
	{
		key: "frozen.golge.normal",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.golge.agresif",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.golge.katil",
		label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Katil",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.normal",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.agresif",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.curuk.katil",
		label: "Donmuş Çam Geçidi · Buzkök Golemi · Katil",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.normal",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Normal",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.agresif",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Agresif",
		zone: "frozen"
	},
	{
		key: "frozen.yutan.katil",
		label: "Donmuş Çam Geçidi · Tipi Kâhini · Katil",
		zone: "frozen"
	},
	{
		key: "sinsi.golge.agresif",
		label: "Sinsi Taş Vadisi · Sinsi Gölge Kurdu",
		zone: "sinsi"
	},
	{
		key: "sinsi.curuk.agresif",
		label: "Sinsi Taş Vadisi · Sinsi Muhafız",
		zone: "sinsi"
	},
	{
		key: "sinsi.yutan.katil",
		label: "Sinsi Taş Vadisi · Sinsi Öz Yutan",
		zone: "sinsi"
	},
	{
		key: "sinsi.stone",
		label: "Sinsi Taş Vadisi · Sinsi Taş",
		zone: "sinsi"
	},
	{
		key: "boss.world",
		label: "Dünya Bossu · Çürümenin Kadimi",
		zone: "boss"
	},
	{
		key: "boss.black_stone",
		label: "Kara Bölge · Kara Taş Muhafızı",
		zone: "boss"
	},
	{
		key: "boss.frozen_throne",
		label: "Ayaz Tahtının Bekçisi",
		zone: "boss"
	},
	{
		key: "boss.frozen_water",
		label: "Buzgölü Semenderi",
		zone: "boss"
	}
];
var SIMPLE_LOOT_BUCKET_IDS = [
	"red_all",
	"orange_main",
	"orange_accessory",
	"blue_main",
	"blue_accessory",
	"white_main",
	"white_accessory"
];
var FOREST_SIMPLE_LOOT_CHANCES = {
	red_all: 1e4,
	orange_main: 5e4,
	orange_accessory: 3e4,
	blue_main: 15e4,
	blue_accessory: 5e4,
	white_main: 35e4,
	white_accessory: 8e4
};
var FROZEN_SIMPLE_LOOT_CHANCES = {
	red_all: 11e3,
	orange_main: 55e3,
	orange_accessory: 33e3,
	blue_main: 165e3,
	blue_accessory: 55e3,
	white_main: 385e3,
	white_accessory: 88e3
};
var ANCIENT_SIMPLE_LOOT_CHANCES = {
	red_all: 6e3,
	orange_main: 57e3,
	orange_accessory: 35e3,
	blue_main: 17e4,
	blue_accessory: 6e4,
	white_main: 535e3,
	white_accessory: 137e3
};
function lootSourceDefinition(key) {
	return LOOT_SOURCE_DEFINITIONS.find((entry) => entry.key === key);
}
function finiteNumber(value, fallback = 0) {
	const parsed = Number(value);
	return Number.isFinite(parsed) ? parsed : fallback;
}
function chanceToPpm(value) {
	return Math.round(Math.max(0, Math.min(1, finiteNumber(value))) * LOOT_PPM);
}
function weightedSplit(total, weights) {
	const safeTotal = Math.max(0, Math.floor(total));
	const safeWeights = weights.map((weight) => Math.max(0, finiteNumber(weight)));
	const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
	if (safeTotal === 0 || weightTotal <= 0) return weights.map(() => 0);
	const exact = safeWeights.map((weight) => safeTotal * weight / weightTotal);
	const result = exact.map(Math.floor);
	const remainder = safeTotal - result.reduce((sum, value) => sum + value, 0);
	const priority = exact.map((value, index) => ({
		index,
		fraction: value - Math.floor(value)
	})).sort((a, b) => b.fraction - a.fraction || a.index - b.index);
	for (let index = 0; index < remainder; index += 1) result[priority[index % priority.length].index] += 1;
	return result;
}
function kindWeights(armorChance) {
	const armorPpm = chanceToPpm(armorChance);
	const accessories = weightedSplit(armorPpm, [
		1,
		1,
		1
	]);
	return [LOOT_PPM - armorPpm, ...accessories];
}
function legacyRarityPpms(totalChance, redChance, orangeChance, blueChance) {
	let remaining = chanceToPpm(totalChance);
	const red = Math.min(remaining, chanceToPpm(redChance));
	remaining -= red;
	const orange = Math.min(remaining, chanceToPpm(orangeChance));
	remaining -= orange;
	const blue = Math.min(remaining, chanceToPpm(blueChance));
	remaining -= blue;
	return {
		white: remaining,
		blue,
		orange,
		red
	};
}
function gearOutcomes(rarityPpms, armorChance, family, charmEnabled) {
	const weights = kindWeights(armorChance);
	const outcomes = [];
	for (const rarity of [
		"red",
		"orange",
		"blue",
		"white"
	]) {
		const chances = weightedSplit(rarityPpms[rarity], weights);
		for (let index = 0; index < OPEN_WORLD_LOOT_GEAR_KINDS.length; index += 1) {
			const kind = OPEN_WORLD_LOOT_GEAR_KINDS[index];
			outcomes.push({
				id: `${rarity}-${kind}`,
				item: {
					type: "gear",
					family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic",
					kind,
					rarity
				},
				baseChancePpm: chances[index],
				minAmount: 1,
				maxAmount: 1,
				charmWeight: charmEnabled ? chances[index] : 0
			});
		}
	}
	return outcomes;
}
var SIMPLE_BUCKET_KINDS = {
	red_all: [
		"weapon",
		"armor",
		"shoes",
		"necklace"
	],
	orange_main: ["weapon", "armor"],
	orange_accessory: ["shoes", "necklace"],
	blue_main: ["weapon", "armor"],
	blue_accessory: ["shoes", "necklace"],
	white_main: ["weapon", "armor"],
	white_accessory: ["shoes", "necklace"]
};
var SIMPLE_BUCKET_RARITY = {
	red_all: "red",
	orange_main: "orange",
	orange_accessory: "orange",
	blue_main: "blue",
	blue_accessory: "blue",
	white_main: "white",
	white_accessory: "white"
};
function normalizedSimpleChance(value) {
	return Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(value))));
}
function simpleGearOutcomes(chances, family) {
	const byOutcome = /* @__PURE__ */ new Map();
	for (const bucketId of SIMPLE_LOOT_BUCKET_IDS) {
		const rarity = SIMPLE_BUCKET_RARITY[bucketId];
		const kinds = SIMPLE_BUCKET_KINDS[bucketId];
		const split = weightedSplit(normalizedSimpleChance(chances[bucketId]), kinds.map(() => 1));
		kinds.forEach((kind, index) => {
			const baseChancePpm = split[index];
			byOutcome.set(`${rarity}-${kind}`, {
				id: `${rarity}-${kind}`,
				item: {
					type: "gear",
					family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic",
					kind,
					rarity
				},
				baseChancePpm,
				minAmount: 1,
				maxAmount: 1,
				charmWeight: baseChancePpm
			});
		});
	}
	return [
		"red",
		"orange",
		"blue",
		"white"
	].flatMap((rarity) => OPEN_WORLD_LOOT_GEAR_KINDS.map((kind) => byOutcome.get(`${rarity}-${kind}`)).filter(Boolean));
}
function extractSimpleLootChances(profile) {
	const result = Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id) => [id, 0]));
	const gearGroup = profile.groups.find((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
	for (const outcome of gearGroup?.outcomes ?? []) {
		if (outcome.item.type !== "gear") continue;
		const chance = normalizedSimpleChance(outcome.baseChancePpm);
		if (outcome.item.rarity === "purple") continue;
		if (outcome.item.rarity === "red") result.red_all += chance;
		else if (outcome.item.kind === "weapon" || outcome.item.kind === "armor") result[`${outcome.item.rarity}_main`] += chance;
		else result[`${outcome.item.rarity}_accessory`] += chance;
	}
	return result;
}
function simpleLootTotalChancePpm(chances) {
	return SIMPLE_LOOT_BUCKET_IDS.reduce((sum, id) => sum + normalizedSimpleChance(chances[id]), 0);
}
function rescaleSimpleLootChances(chances, requestedPpm) {
	const target = normalizedSimpleChance(requestedPpm);
	const current = SIMPLE_LOOT_BUCKET_IDS.map((id) => normalizedSimpleChance(chances[id]));
	const scaled = weightedSplit(target, current.some((value) => value > 0) ? current : SIMPLE_LOOT_BUCKET_IDS.map((id) => FOREST_SIMPLE_LOOT_CHANCES[id]));
	return Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id, index) => [id, scaled[index]]));
}
function withSimpleLootChances(profile, chances) {
	const family = profile.key === "sinsi.stone" ? "sinsi" : "generic";
	let replaced = false;
	const groups = profile.groups.map((group) => {
		if (replaced || !group.outcomes.some((outcome) => outcome.item.type === "gear")) return group;
		replaced = true;
		return {
			...group,
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: simpleGearOutcomes(chances, family)
		};
	});
	return {
		...profile,
		groups
	};
}
function withEquipmentDropChance(profile, chancePpm) {
	if (profile.key.startsWith("boss.")) return profile;
	if (profile.groups.find((g) => g.gearChanceModel === "direct")) return withSimpleLootChances(profile, rescaleSimpleLootChances(extractSimpleLootChances(profile), chancePpm));
	return {
		...profile,
		groups: profile.groups.map((group) => group.outcomes.some((o) => o.item.type === "gear") ? {
			...group,
			equipmentChancePpm: normalizedSimpleChance(chancePpm)
		} : group)
	};
}
function balanceWhiteLootChances(chances) {
	const colored = chances.red_all + chances.orange_main + chances.orange_accessory + chances.blue_main + chances.blue_accessory;
	const weights = [chances.white_main, chances.white_accessory];
	const white = weightedSplit(Math.max(0, LOOT_PPM - colored), weights.some((v) => v > 0) ? weights : [1, 1]);
	return {
		...chances,
		white_main: white[0],
		white_accessory: white[1]
	};
}
function upgradeEquipmentDropProfile(profile) {
	if (profile.key.startsWith("boss.")) return profile;
	const group = profile.groups.find((g) => g.outcomes.some((o) => o.item.type === "gear"));
	if (!group || group.equipmentChancePpm !== void 0 || group.gearChanceModel === "direct") return profile;
	const old = extractSimpleLootChances(profile);
	const gate = Math.min(2e5, simpleLootTotalChancePpm(old));
	return withEquipmentDropChance(withSimpleLootChances(profile, balanceWhiteLootChances({
		...old,
		red_all: Math.min(6e3, old.red_all)
	})), gate);
}
function allowsSpecialLootResources(sourceKey) {
	return sourceKey === "boss.black_stone" || sourceKey === "sinsi.stone" || sourceKey === "boss.world" || sourceKey === "boss.frozen_throne" || sourceKey === "boss.frozen_water";
}
function allowsProfileResource(sourceKey, kind) {
	if (UPGRADE_MATERIAL_KINDS.includes(kind)) return materialForSource(sourceKey) === kind;
	if (SPECIAL_LOOT_RESOURCES.some((resource) => resource === kind)) return allowsSpecialLootResources(sourceKey);
	return (kind === "stone_book" || kind === "evolution_scroll") && sourceKey.startsWith("boss.");
}
function resourceOutcome(kind, minAmount, maxAmount) {
	return {
		id: kind,
		item: {
			type: "resource",
			kind
		},
		baseChancePpm: LOOT_PPM,
		minAmount: Math.max(1, Math.floor(minAmount)),
		maxAmount: Math.max(1, Math.floor(maxAmount)),
		charmWeight: 0
	};
}
function rareResourceOutcome(kind, chancePpm, minAmount = 1, maxAmount = minAmount) {
	const safeMin = Math.max(1, Math.floor(finiteNumber(minAmount, 1)));
	return {
		...resourceOutcome(kind, safeMin, Math.max(safeMin, Math.floor(finiteNumber(maxAmount, safeMin)))),
		baseChancePpm: Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(chancePpm, 0))))
	};
}
function variantEssenceRange(key) {
	if (key.endsWith(".katil")) return {
		min: 8,
		max: 13
	};
	if (key.endsWith(".agresif")) return {
		min: 5,
		max: 8
	};
	return {
		min: 2,
		max: 4
	};
}
function regularProfile(key, settings) {
	const essence = variantEssenceRange(key);
	const simpleChances = key.startsWith("forest.") ? FOREST_SIMPLE_LOOT_CHANCES : key.startsWith("frozen.") ? FROZEN_SIMPLE_LOOT_CHANCES : key.startsWith("ancient.") ? ANCIENT_SIMPLE_LOOT_CHANCES : null;
	return [{
		id: "gear",
		label: "Ekipman",
		rolls: 1,
		charmMultiplierBps: 12500,
		outcomes: simpleChances ? simpleGearOutcomes({ ...simpleChances }, "generic") : gearOutcomes(legacyRarityPpms(settings.regular_item_drop_chance, settings.regular_red_chance, settings.regular_orange_chance, settings.regular_blue_chance), settings.regular_armor_chance, "generic", true)
	}, {
		id: "essence",
		label: "Yaşam Özü",
		rolls: 1,
		charmMultiplierBps: LOOT_BPS,
		outcomes: [resourceOutcome("essence", essence.min, essence.max)]
	}];
}
function frozenEliteProfile(key, settings) {
	const throne = key === "boss.frozen_throne";
	return [
		{
			id: "gear",
			label: "Ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(throne ? settings.frozen_boss_item_drop_chance : settings.frozen_water_item_drop_chance, settings.regular_red_chance, settings.regular_orange_chance, settings.regular_blue_chance), settings.regular_armor_chance, "generic", true)
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", throne ? 20 : 8, throne ? 35 : 14)]
		},
		{
			id: "stone-book",
			label: "Taş Sanatı Kitabı",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("stone_book", throne ? settings.frozen_boss_stone_book_chance * LOOT_PPM : settings.frozen_water_stone_book_chance * LOOT_PPM, throne ? settings.frozen_boss_stone_book_min : settings.frozen_water_stone_book_min, throne ? settings.frozen_boss_stone_book_max : settings.frozen_water_stone_book_max)]
		},
		{
			id: "evolution-scroll",
			label: "Evrim Parşömeni",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("evolution_scroll", throne ? settings.frozen_boss_evolution_scroll_chance * LOOT_PPM : settings.frozen_water_evolution_scroll_chance * LOOT_PPM, throne ? settings.frozen_boss_evolution_scroll_min : settings.frozen_water_evolution_scroll_min, throne ? settings.frozen_boss_evolution_scroll_max : settings.frozen_water_evolution_scroll_max)]
		}
	];
}
function worldBossProfile(settings) {
	return [
		{
			id: "gear",
			label: "Ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(settings.regular_item_drop_chance, settings.boss_red_chance, settings.boss_orange_chance, settings.boss_blue_chance), settings.boss_armor_chance, "generic", true)
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", 28, 46)]
		},
		{
			id: "stone-book",
			label: "Taş Sanatı Kitabı",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("stone_book", settings.world_boss_stone_book_chance * LOOT_PPM, settings.world_boss_stone_book_min, settings.world_boss_stone_book_max)]
		},
		{
			id: "evolution-scroll",
			label: "Evrim Parşömeni",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [rareResourceOutcome("evolution_scroll", settings.world_boss_evolution_scroll_chance * LOOT_PPM, settings.world_boss_evolution_scroll_min, settings.world_boss_evolution_scroll_max)]
		}
	];
}
function sinsiStoneProfile(settings) {
	const essenceMin = Math.max(1, Math.floor(finiteNumber(settings.sinsi_stone_essence_min, 1)));
	const essenceMax = Math.max(essenceMin, Math.floor(finiteNumber(settings.sinsi_stone_essence_max, essenceMin)));
	return [
		{
			id: "gear",
			label: "Sinsi ekipman",
			rolls: 1,
			charmMultiplierBps: 12500,
			outcomes: gearOutcomes(legacyRarityPpms(settings.sinsi_stone_gear_drops > 0 ? settings.regular_item_drop_chance : 0, settings.sinsi_stone_red_chance, settings.sinsi_stone_orange_chance, settings.sinsi_stone_blue_chance), settings.sinsi_stone_armor_chance, "sinsi", true)
		},
		{
			id: "stone-dust",
			label: "Taş Tozu",
			rolls: finiteNumber(settings.sinsi_stone_dust_reward) > 0 ? 1 : 0,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("stone_dust", settings.sinsi_stone_dust_reward, settings.sinsi_stone_dust_reward)]
		},
		{
			id: "essence",
			label: "Yaşam Özü",
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [resourceOutcome("essence", essenceMin, essenceMax)]
		}
	];
}
function buildDefaultLootProfile(key, settings) {
	const definition = lootSourceDefinition(key);
	let groups;
	if (key === "boss.black_stone") groups = frozenEliteProfile("boss.frozen_throne",{...settings,regular_red_chance:.05,regular_orange_chance:.2,regular_blue_chance:.4,regular_armor_chance:.5,frozen_boss_item_drop_chance:.75,frozen_boss_stone_book_chance:.3,frozen_boss_stone_book_min:1,frozen_boss_stone_book_max:1,frozen_boss_evolution_scroll_chance:.3,frozen_boss_evolution_scroll_min:1,frozen_boss_evolution_scroll_max:1});
	else if (key === "boss.world") groups = worldBossProfile(settings);
	else if (key === "boss.frozen_throne" || key === "boss.frozen_water") groups = frozenEliteProfile(key, settings);
	else if (key === "sinsi.stone") groups = sinsiStoneProfile(settings);
	else groups = regularProfile(key, settings);
	const profile = {
		version: 1,
		key,
		label: definition.label,
		groups
	};
	return upgradeEquipmentDropProfile(withSimpleLootChances(profile, extractSimpleLootChances(profile)));
}
function getBossEffectiveLootGroups(profile, hasDropCharm, eventPercent = 0, itemMultiplier = 1) {
	return (profile.key === "sinsi.stone" ? withLegacyHelmetDrops(profile) : profile).groups.map((originalGroup) => {
		const group = profile.key === "sinsi.stone" ? originalGroup : {
			...originalGroup,
			outcomes: originalGroup.outcomes.filter((o) => !(o.item.type === "gear" && o.item.kind === "helmet"))
		};
		const baseTotalChancePpm = group.outcomes.reduce((sum, outcome) => sum + outcome.baseChancePpm, 0);
		const multiplier = hasDropCharm ? group.charmMultiplierBps : LOOT_BPS;
		const targetTotal = Math.min(LOOT_PPM, Math.round(baseTotalChancePpm * multiplier / LOOT_BPS));
		const bonusShares = weightedSplit(Math.max(0, targetTotal - baseTotalChancePpm), group.outcomes.map((outcome) => outcome.charmWeight));
		let outcomes = group.outcomes.map((outcome, index) => ({
			...outcome,
			effectiveChancePpm: outcome.baseChancePpm + bonusShares[index]
		}));
		const bossEquipment = profile.key.startsWith("boss.") && outcomes.some((outcome) => outcome.item.type === "gear");
		if (bossEquipment) {
			outcomes = outcomes.filter((outcome) => outcome.item.type === "gear");
			if (!outcomes.some((outcome) => outcome.effectiveChancePpm > 0)) outcomes = OPEN_WORLD_LOOT_GEAR_KINDS.map((kind) => ({
				id: `boss-fallback-${kind}`,
				item: {
					type: "gear",
					family: "generic",
					kind,
					rarity: "white"
				},
				baseChancePpm: 0,
				effectiveChancePpm: LOOT_PPM / OPEN_WORLD_LOOT_GEAR_KINDS.length,
				minAmount: 1,
				maxAmount: 1,
				charmWeight: 0
			}));
			const shares = weightedSplit(LOOT_PPM, outcomes.map((outcome) => outcome.effectiveChancePpm));
			outcomes = outcomes.map((outcome, index) => ({
				...outcome,
				effectiveChancePpm: shares[index]
			}));
		}
		if (eventPercent > 0 && !bossEquipment && !outcomes.some((o) => o.item.type === "resource" && o.item.kind === "essence")) {
			const shares = weightedSplit(Math.min(LOOT_PPM, Math.round(outcomes.reduce((n, o) => n + o.effectiveChancePpm, 0) * (1 + Math.min(500, eventPercent) / 100))), outcomes.map((o) => o.effectiveChancePpm));
			outcomes = outcomes.map((o, i) => ({
				...o,
				effectiveChancePpm: shares[i]
			}));
		}
		if (profile.key.startsWith("forest.") && itemMultiplier < 1) outcomes = outcomes.map((o) => ({
			...o,
			effectiveChancePpm: o.item.type === "resource" && o.item.kind === "essence" ? o.effectiveChancePpm : Math.round(o.effectiveChancePpm * Math.max(0, itemMultiplier))
		}));
		const effectiveTotalChancePpm = outcomes.reduce((sum, outcome) => sum + outcome.effectiveChancePpm, 0);
		return {
			...group,
			rolls: bossEquipment ? 3 : group.rolls,
			baseTotalChancePpm,
			effectiveTotalChancePpm,
			outcomes
		};
	});
}
function getEffectiveLootGroups(profile, hasDropCharm, eventPercent = 0, itemMultiplier = 1, materialLevel498 = false) {
	if (profile.key.startsWith("boss.")) return getBossEffectiveLootGroups(profile, hasDropCharm, eventPercent, itemMultiplier);
	const effectiveProfile = withLegacyHelmetDrops(upgradeEquipmentDropProfile(profile));
	const eventMultiplier = 1 + Math.max(0, Math.min(500, finiteNumber(eventPercent))) / 100;
	const levelMultiplier = (profile.key.startsWith('forest.')||profile.key.startsWith('frozen.')||profile.key.startsWith('black.')) ? Math.max(0, Math.min(1, finiteNumber(itemMultiplier, 1))) : 1;
	return effectiveProfile.groups.map((group) => {
		if (group.outcomes.some((o) => o.item.type === "gear")) {
			const direct = group.gearChanceModel === "direct";
			const baseTotalChancePpm = direct ? group.outcomes.reduce((sum, o) => sum + o.baseChancePpm, 0) : normalizedSimpleChance(group.equipmentChancePpm ?? 0);
			const charmMultiplier = hasDropCharm ? group.charmMultiplierBps / LOOT_BPS : 1;
			const effectiveTotalChancePpm = Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * charmMultiplier * eventMultiplier) * levelMultiplier);
			const weights = group.outcomes.map((o) => o.baseChancePpm);
			const base = weightedSplit(baseTotalChancePpm, weights);
			const effective = weightedSplit(effectiveTotalChancePpm, weights);
			return {
				...group,
				rolls: 1,
				baseTotalChancePpm,
				effectiveTotalChancePpm,
				outcomes: group.outcomes.map((outcome, i) => ({
					...outcome,
					...!direct ? { conditionalChancePpm: outcome.baseChancePpm } : {},
					baseChancePpm: base[i],
					effectiveChancePpm: effective[i]
				}))
			};
		}
		const baseTotalChancePpm = group.outcomes.reduce((sum, o) => sum + o.baseChancePpm, 0);
		const essence = group.outcomes.some((o) => o.item.type === "resource" && o.item.kind === "essence");
		const fixedMaterial = group.outcomes.some((o) => o.item.type === "resource" && UPGRADE_MATERIAL_KINDS.includes(o.item.kind));
		const allMaterials498=materialLevel498&&group.outcomes.every(o=>materialLevelItem498(o.item));
		const target = essence || fixedMaterial ? baseTotalChancePpm : Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * eventMultiplier) * (allMaterials498?1:levelMultiplier));
		const chances = weightedSplit(target, group.outcomes.map((o) => o.baseChancePpm));
		const materialChances498=materialLevel498&&!allMaterials498&&!essence&&!fixedMaterial&&levelMultiplier!==1&&group.outcomes.some(o=>materialLevelItem498(o.item))?weightedSplit(Math.round(Math.min(LOOT_PPM,baseTotalChancePpm*eventMultiplier)),group.outcomes.map(o=>o.baseChancePpm)):null;
		const effectiveChances498=materialChances498?chances.map((chance,i)=>materialLevelItem498(group.outcomes[i].item)?materialChances498[i]:chance):chances;
		return {
			...group,
			baseTotalChancePpm,
			effectiveTotalChancePpm: materialChances498?effectiveChances498.reduce((sum,chance)=>sum+chance,0):target,
			outcomes: group.outcomes.map((outcome, i) => ({
				...outcome,
				effectiveChancePpm: effectiveChances498[i]
			}))
		};
	});
}
function normalizedRandom(random) {
	const value = finiteNumber(random());
	if (value <= 0) return 0;
	if (value >= 1) return 1 - Number.EPSILON;
	return value;
}
function rollLootProfile(profile, options) {
	const random = options.random ?? Math.random;
	const rolled = [];
	let equipmentAwarded = 0;
	let equipmentAttempted = false;
	const boss = profile.key.startsWith("boss.");
	const eventMultiplier = 1 + Math.max(0, Math.min(500, options.eventPercent ?? 0)) / 100;
	const bossRollValue = 3 * eventMultiplier;
	const bossRolls = !boss || eventMultiplier === 1 ? 3 : Math.floor(bossRollValue) + (random() < bossRollValue % 1 ? 1 : 0);
	const equipmentLimit = boss ? bossRolls : 1;
	let essenceAwarded = false;
	const specialAwarded = /* @__PURE__ */ new Set();
	for (const original of scaleLootGroups487(getEffectiveLootGroups(profile, options.hasDropCharm, options.eventPercent, options.itemMultiplier,options.materialLevel498??false),options.levelBalanceMultiplier487??1,profile.key.startsWith("boss."),options.materialLevel498??false)) {
		const group = {
			...original,
			outcomes: original.outcomes.map((o) => ({ ...o }))
		};
		const gearGroup = group.outcomes.some((o) => o.item.type === "gear");
		if (gearGroup && !boss && equipmentAttempted) continue;
		if (gearGroup && !boss) equipmentAttempted = true;
		for (let rollIndex = 0; rollIndex < (gearGroup ? boss ? bossRolls : 1 : group.rolls); rollIndex += 1) {
			if (gearGroup && !boss && group.gearChanceModel !== "direct" && Math.floor(normalizedRandom(random) * 1e6) >= group.effectiveTotalChancePpm) continue;
			const value = Math.floor(normalizedRandom(random) * LOOT_PPM);
			let cursor = 0;
			const outcome = group.outcomes.find((candidate) => {
				cursor += gearGroup && !boss && group.gearChanceModel !== "direct" ? candidate.conditionalChancePpm ?? 0 : candidate.effectiveChancePpm*(gearGroup&&boss&&rollIndex>=3?(options.levelBalanceMultiplier487??1):1);
				return value < cursor;
			});
			if (!outcome) continue;
			if (outcome.item.type === "gear") {
				if (equipmentAwarded >= equipmentLimit) continue;
				equipmentAwarded += 1;
			} else if (outcome.item.kind === "essence") {
				if (essenceAwarded) continue;
				essenceAwarded = true;
			} else {
				if (!allowsProfileResource(profile.key, outcome.item.kind) || specialAwarded.has(outcome.item.kind)) continue;
				specialAwarded.add(outcome.item.kind);
			}
			const amountSpan = outcome.maxAmount - outcome.minAmount + 1;
			const amount = outcome.minAmount + Math.floor(normalizedRandom(random) * amountSpan);
			rolled.push({
				groupId: group.id,
				rollIndex,
				outcomeId: outcome.id,
				item: outcome.item,
				amount,
				chancePpm: outcome.effectiveChancePpm
			});
		}
	}
	const ancientNormal = profile.key.startsWith("ancient.") && profile.key.endsWith(".normal");
	const purpleChance = Math.max(0, Math.min(LOOT_PPM, Math.floor(boss ? options.bossPurpleChancePpm ?? 0 : ancientNormal ? (options.ancientNormalPurpleChancePpm ?? 0)*(rolled.some(row=>row.item.type==="gear")?1:options.levelBalanceMultiplier487??1) : 0)));
	const firstGear = purpleChance > 0 ? rolled.findIndex((row) => row.item.type === "gear") : -1;
	if (purpleChance > 0 && (ancientNormal || firstGear >= 0) && Math.floor(normalizedRandom(random) * 1e6) < purpleChance) {
		const kind = LOOT_GEAR_KINDS[Math.floor(normalizedRandom(random) * LOOT_GEAR_KINDS.length)];
		const purple = {
			...firstGear >= 0 ? rolled[firstGear] : {
				groupId: "ancient-purple",
				rollIndex: 0,
				outcomeId: `purple-${kind}`,
				amount: 1
			},
			item: {
				type: "gear",
				family: "generic",
				rarity: "purple",
				kind
			},
			chancePpm: purpleChance
		};
		if (firstGear >= 0) rolled[firstGear] = purple;
		else rolled.push(purple);
	}
	return rolled;
}
var GENERIC_GEAR_NAMES = {
	muhafiz: {
		weapon: {
			white: "Kül Çeliği",
			blue: "Safir Nöbet",
			orange: "Güneş Yaran",
			red: "Kızıl Kıyamet"
		},
		armor: {
			white: "Demir Nöbet Zırhı",
			blue: "Safir Muhafız Zırhı",
			orange: "Kor Tahtı Zırhı",
			red: "Kan Tahtı Zırhı"
		},
		helmet: {
			white: "Demir Nöbet Miğferi",
			blue: "Safir Nöbet Miğferi",
			orange: "Kor Tahtı Miğferi",
			red: "Kan Tahtı Miğferi"
		},
		shoes: {
			white: "Kül Muhafız Çizmeleri",
			blue: "Safir Muhafız Çizmeleri",
			orange: "Kor Muhafız Çizmeleri",
			red: "Kızıl Muhafız Çizmeleri"
		},
		necklace: {
			white: "Kül Muhafız Kolyesi",
			blue: "Safir Muhafız Kolyesi",
			orange: "Kor Muhafız Kolyesi",
			red: "Kızıl Muhafız Kolyesi"
		}
	},
	avci: {
		weapon: {
			white: "Sis Kirişli Yay",
			blue: "Ayaz Dişi Yayı",
			orange: "Kor Anka Yayı",
			red: "Kızıl Ejder Yayı"
		},
		armor: {
			white: "Sınır Derisi",
			blue: "Mavi Gölge Postu",
			orange: "Anka Avcı Zırhı",
			red: "Alev Avcısı Zırhı"
		},
		helmet: {
			white: "Sınır Avcı Başlığı",
			blue: "Mavi Gölge Başlığı",
			orange: "Anka Avcı Başlığı",
			red: "Alev Avcısı Başlığı"
		},
		shoes: {
			white: "Kül Avcı Çizmeleri",
			blue: "Safir Avcı Çizmeleri",
			orange: "Kor Avcı Çizmeleri",
			red: "Kızıl Avcı Çizmeleri"
		},
		necklace: {
			white: "Kül Avcı Kolyesi",
			blue: "Safir Avcı Kolyesi",
			orange: "Kor Avcı Kolyesi",
			red: "Kızıl Avcı Kolyesi"
		}
	},
	arkanist: {
		weapon: {
			white: "Kül Asası",
			blue: "Rün Çağrısı",
			orange: "Yıldız Kıran",
			red: "Kızıl Hiçlik"
		},
		armor: {
			white: "Soluk Cübbe",
			blue: "Safir Rün Cübbesi",
			orange: "Güneş Dokuması",
			red: "Kan Rünü Cübbesi"
		},
		helmet: {
			white: "Soluk Rün Tacı",
			blue: "Safir Rün Tacı",
			orange: "Güneş Tacı",
			red: "Kan Rünü Tacı"
		},
		shoes: {
			white: "Kül Rün Çizmeleri",
			blue: "Safir Rün Çizmeleri",
			orange: "Kor Rün Çizmeleri",
			red: "Kızıl Rün Çizmeleri"
		},
		necklace: {
			white: "Kül Rün Kolyesi",
			blue: "Safir Rün Kolyesi",
			orange: "Kor Rün Kolyesi",
			red: "Kızıl Rün Kolyesi"
		}
	}
};
var SINSI_GEAR_NAMES = {
	muhafiz: {
		weapon: "Sinsi Kaya Kılıcı",
		armor: "Sinsi Taş Zırhı"
	},
	avci: {
		weapon: "Sinsi Kaya Yayı",
		armor: "Sinsi İzci Zırhı"
	},
	arkanist: {
		weapon: "Sinsi Kaya Asası",
		armor: "Sinsi Rün Cübbesi"
	}
};
function rollLootRole(random = Math.random) {
	return [
		"muhafiz",
		"avci",
		"arkanist"
	][Math.min(2, Math.max(0, Math.floor(random() * 3)))];
}
function resolveLootItemName(item, role) {if(item.rarity==="emerald")return emeraldName444(item.kind,role);
	if (item.type === "resource") return progressionMaterial(item.kind)?.label ?? (item.kind === "stone_dust" ? "Taş Tozu" : item.kind === "pearl" ? "İnci" : item.kind === "stone_book" ? "Taş Sanatı Kitabı" : item.kind === "evolution_scroll" ? "Evrim Parşömeni" : "Yaşam Özü");
	const safeRole = role === "avci" || role === "arkanist" ? role : "muhafiz";
	if (item.rarity === "purple") return {
		muhafiz: {
			weapon: "Mor Kök Kılıcı",
			armor: "Mor Kök Zırhı",
			helmet: "Mor Kök Miğferi",
			shoes: "Mor Kök Çizmeleri",
			necklace: "Mor Kök Kolyesi"
		},
		avci: {
			weapon: "Alacakaranlık Yayı",
			armor: "Alacakaranlık Zırhı",
			helmet: "Alacakaranlık Başlığı",
			shoes: "Alacakaranlık Çizmeleri",
			necklace: "Alacakaranlık Kolyesi"
		},
		arkanist: {
			weapon: "Kadim Menekşe Asası",
			armor: "Kadim Menekşe Cübbesi",
			helmet: "Kadim Menekşe Tacı",
			shoes: "Kadim Menekşe Çizmeleri",
			necklace: "Kadim Menekşe Kolyesi"
		}
	}[safeRole][item.kind];
	if (item.family === "sinsi" && (item.kind === "weapon" || item.kind === "armor")) return SINSI_GEAR_NAMES[safeRole][item.kind];
	return GENERIC_GEAR_NAMES[safeRole][item.kind][item.rarity];
}
function resolveLootPowerRange(item, settings) {if(item.rarity==="emerald"){const power=emeraldPower444(item.kind,settings);return {min:power,max:power};}
	if (item.type === "resource") return {
		min: 0,
		max: 0
	};
	const gearClass = item.kind === "weapon" ? "weapon" : "armor";
	if (item.rarity === "purple") {
		const redMax = Math.max(0, Math.floor(finiteNumber(settings[`red_${gearClass}_power_max`])));
		const uniquePower = Math.max(1, Math.floor(finiteNumber(settings[`unique_${gearClass}_power`], gearClass === "weapon" ? 180 : 150)));
		const max = Math.min(uniquePower - 1, redMax + 15);
		return {
			min: Math.max(0, Math.min(max, redMax + 5)),
			max: Math.max(0, max)
		};
	}
	const min = Math.max(0, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_min`])));
	return {
		min,
		max: Math.max(min, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_max`], min)))
	};
}
function rollLootPower(item, settings, random = Math.random) {
	const range = resolveLootPowerRange(item, settings);
	return range.min + Math.floor(normalizedRandom(random) * (range.max - range.min + 1));
}
function withLegacyHelmetDrops(profile) {
	if (profile.key !== "sinsi.stone") return {
		...profile,
		groups: profile.groups.map((g) => ({
			...g,
			outcomes: g.outcomes.filter((o) => !(o.item.type === "gear" && o.item.kind === "helmet"))
		}))
	};
	if (profile.groups.some((g) => g.outcomes.some((o) => o.item.type === "gear" && o.item.kind === "helmet"))) return profile;
	return {
		...profile,
		groups: profile.groups.map((g) => ({
			...g,
			outcomes: g.outcomes.flatMap((o) => {
				if (o.item.type !== "gear" || o.item.kind !== "armor") return [o];
				const chance = Math.floor(o.baseChancePpm / 2), charm = Math.floor(o.charmWeight / 2);
				return [{
					...o,
					baseChancePpm: o.baseChancePpm - chance,
					charmWeight: o.charmWeight - charm
				}, {
					...o,
					id: o.id + "-helmet",
					item: {
						...o.item,
						kind: "helmet",
						family: "generic"
					},
					baseChancePpm: chance,
					charmWeight: charm
				}];
			})
		}))
	};
}
function withUpgradeMaterialDrops(profile, rules) {
	const kind = materialForSource(profile.key);
	const groups = profile.groups.filter((g) => !g.outcomes.some((o) => o.item.type === "resource" && UPGRADE_MATERIAL_KINDS.includes(o.item.kind)));
	if (!kind) return {
		...profile,
		groups
	};
	const rule = rules[kind];
	if (!rule) return {
		...profile,
		groups
	};
	return {
		...profile,
		groups: [...groups, {
			id: "upgrade-material",
			label: progressionMaterial(kind).label,
			rolls: 1,
			charmMultiplierBps: LOOT_BPS,
			outcomes: [{
				id: kind,
				item: {
					type: "resource",
					kind
				},
				baseChancePpm: Math.round(rule.chance * 1e4),
				minAmount: rule.min,
				maxAmount: rule.max,
				charmWeight: 0
			}]
		}]
	};
}
var EQUIPMENT_SETS = Object.freeze({
	red: {
		name: "Kızıl Set",
		slots: [
			"weapon",
			"armor",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 0,
			pve: 3,
			pvp: 3,
			resistance: 0,
			speed: 3
		}
	},
	unique: {"name":"Eşsiz Set","slots":["weapon","armor","helmet","shoes","necklace"],"bonuses":{"hp":600,"pve":6,"pvp":6,"resistance":6,"speed":9}},
	purple: {
		name: "Mor Kök Seti",
		slots: [
			"weapon",
			"armor",
			"helmet",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 500,
			pve: 5,
			pvp: 5,
			resistance: 5,
			speed: 5
		}
	},
	infinite: {
		name: "Sonsuz Set",
		slots: [
			"weapon",
			"armor",
			"helmet",
			"shoes",
			"necklace"
		],
		bonuses: {
			hp: 700,
			pve: 7,
			pvp: 7,
			resistance: 7,
			speed: 10
		}
	}
,emerald:EMERALD_SET444});
function equipmentSetState(rarity,items){
 const definition=EQUIPMENT_SETS[rarity];if(!definition)return null;
 const worn=new Set(items.filter(item=>item.equipped===1&&item.rarity===rarity).map(item=>item.kind));
 const count=definition.slots.filter(slot=>worn.has(slot)).length;
 const thresholds=Object.fromEntries(Object.keys(definition.bonuses).map(key=>[key,colEquipmentSetThreshold473(key,definition)]));
 const activeBonuses=Object.fromEntries(Object.entries(definition.bonuses).map(([key,value])=>[key,count>=thresholds[key]?value:0]));
 return {...definition,rarity,count,complete:count===definition.slots.length,missing:definition.slots.filter(slot=>!worn.has(slot)),thresholds,activeBonuses};
}
function colEquipmentSetThreshold473(key,definition){
 // V476: each lower tier remains active when a higher-tier piece is removed.
 // Red has no HP bonus and keeps its original three positive bonuses at 2/3/4.
 if(definition.bonuses.hp>0)return key==='hp'?2:key==='pve'?3:key==='pvp'?4:definition.slots.length;
 return key==='pve'?2:key==='pvp'?3:definition.slots.length;
}
function equipmentSetBonuses(items){
 const total={
		hp: 0,
		pve: 0,
		pvp: 0,
		resistance: 0,
		speed: 0
	,attack:0};
 for(const rarity of Object.keys(EQUIPMENT_SETS)){
  const state=equipmentSetState(rarity,items);
  for(const key of Object.keys(total))total[key]+=(state.activeBonuses[key]??0);
 }return total;
}
function effectiveAttackCooldownMs(baseCooldownMs, attackSpeedPercent) {
	const base = Math.max(1, Math.round(Number(baseCooldownMs) || 1));
	const speed = Math.max(0, Math.min(80, Number(attackSpeedPercent) || 0));
	return Math.max(120, Math.round(base / (1 + speed / 100)));
}
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
function isGearKind(value) {
	return value === "weapon" || value === "armor" || value === "helmet" || value === "shoes" || value === "necklace" || value === "earring" || value === "bracelet";
}
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
function calculateEquipmentStats(role, items, settings, wingsEquipped, weaponSkin = false, rank = {
	hp: 0,
	defense: 0,
	pve: 0,
	pvp: 0
}, guild = {
	attack: 0,
	hp: 0,
	xp: 0
}, premium = {
	attack: 0,
	hp: 0
}) {
	const equipped = items.filter((item) => item.equipped === 1 && (isGearKind(item.kind) || item.kind === "costume"));
	const total = createEnchantmentTotals(equipped);
	const set = equipmentSetBonuses(equipped);
 const jewelry456=colJewelry456(equipped),beltR31=beltStats(items);
	const weaponPower = equipped.filter((item) => item.kind === "weapon").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_attack") + jewelry456.attack + beltR31.attack;
	const armorPower = equipped.filter((item) => item.kind !== "weapon" && item.kind !== "earring" && item.kind !== "bracelet").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_defense") + jewelry456.defense;
	const hpBonus = total("hp") + set.hp + beltR31.hp;
	const roleBaseAttack = role === "arkanist" ? settings.arcanist_base_attack : role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack;
	const criticalBonus = total("critical") + total("stone_critical");
	const criticalChance = Math.max(0, Math.min(.95, settings.base_critical_chance + (wingsEquipped ? settings.wing_critical_chance : 0) + criticalBonus / 100));
	return {
		baseMaxHp: Math.max(1, Math.round(settings.player_max_hp)),
		hpBonus,
		maxHp: Math.max(1, Math.round(settings.player_max_hp) + hpBonus + rank.hp + guild.hp + premium.hp),
		roleBaseAttack,
		weaponPower,
		weaponSkinAttack: weaponSkin ? 20 : 0,
		monsterPower: (premium.monsters ?? 0) + (weaponSkin ? 10 : 0) + rank.pve + set.pve + (total("stone_talisman") > 0 ? 2 : 0),
		attack: (roleBaseAttack + guild.attack + premium.attack + weaponPower + (weaponSkin ? 20 : 0) + (wingsEquipped ? settings.wing_attack_bonus : 0))+(set.attack??0),
		armorPower,
		defense: armorPower + (wingsEquipped ? settings.wing_defense_bonus : 0) + rank.defense + (role === "muhafiz" ? 10 : 0),
		forestPower: total("forest_power"),
		frozenPower: total("frozen_power"),
		fire: total("fire"),
		ice: total("ice"),
		swordDefense: total("sword_defense"),
		arrowDefense: total("arrow_defense"),
		magicDefense: total("magic_defense"),
		strongPlayers: total("strong_players") + jewelry456.strongPlayers + beltR31.strongPlayers + rank.pvp + set.pvp,
		resistantPlayers: total("resistant_players") + jewelry456.resistantPlayers + set.resistance,
		criticalBonus,
		attackSpeed: total("attack_speed") + set.speed,castSpeed:Math.min(50,total("cast_speed")+jewelry456.castSpeed),
		lifeSteal: total("life_steal"),
		attackBlock: total("attack_block") + total("stone_block"),
		criticalChance,
		thirdSkillCriticalChance: Math.max(0, Math.min(.95, criticalChance + settings.third_skill_critical_bonus)),
		criticalDamageMultiplier: settings.critical_damage_multiplier + total("critical_damage491") / 100
	};
}
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
function enchantTierValues(settings,kind) {
 const definition=ENCHANT_TIERS.find(d=>d[0]===kind);
 if(!definition)throw new Error('Geçersiz efsun türü.');
 const valid = value => Number.isSafeInteger(value)&&value>=1&&value<=definition[3];
 const keys=tierKeys(kind), legacyKey=`enchant_${kind}_tier_three`;
 // Some old installations supplied only three columns. Expand those bounds
 // into four choices without increasing their old maximum or editing items.
 if(settings?.[keys[2]]==null&&settings?.[keys[3]]==null&&settings?.[legacyKey]!=null){
  const oldMax=Number(settings[legacyKey]);
  const top=valid(oldMax)?oldMax:definition[2][3];
  const oldMin=Number(settings[keys[0]]??Math.min(definition[2][0],top));
  const low=valid(oldMin)&&oldMin<=top?oldMin:Math.min(definition[2][0],top);
  return Array.from({length:4},(_,i)=>low+Math.floor((top-low)*i/3));
 }
 return keys.map((key,i)=>{
  const value=Number(settings?.[key]??definition[2][i]);
  return valid(value)?value:definition[2][i];
 });
}
function rollEnchantmentValue(settings,kind,random=Math.random){
 const roll=Number(random());
 return enchantTierValues(settings,kind)[Number.isFinite(roll)?Math.min(3,Math.max(0,Math.floor(roll*4))):0];
}
var clamp$2 = (value, min, max) => Math.max(min, Math.min(max, value));
var enchantKinds = [
	{
		kind: "forest_power",
		weight: "enchant_forest_power_weight"
	},
	{
		kind: "frozen_power",
		weight: "enchant_frozen_power_weight"
	},
	{
		kind: "fire",
		weight: "enchant_fire_weight",
		min: "enchant_fire_min",
		max: "enchant_fire_max"
	},
	{
		kind: "ice",
		weight: "enchant_ice_weight",
		min: "enchant_ice_min",
		max: "enchant_ice_max"
	},
	{
		kind: "sword_defense",
		weight: "enchant_sword_defense_weight",
		min: "enchant_sword_defense_min",
		max: "enchant_sword_defense_max"
	},
	{
		kind: "arrow_defense",
		weight: "enchant_arrow_defense_weight",
		min: "enchant_arrow_defense_min",
		max: "enchant_arrow_defense_max"
	},
	{
		kind: "magic_defense",
		weight: "enchant_magic_defense_weight",
		min: "enchant_magic_defense_min",
		max: "enchant_magic_defense_max"
	},
	{
		kind: "strong_players",
		weight: "enchant_strong_players_weight",
		min: "enchant_strong_players_min",
		max: "enchant_strong_players_max"
	},
	{
		kind: "resistant_players",
		weight: "enchant_resistant_players_weight",
		min: "enchant_resistant_players_min",
		max: "enchant_resistant_players_max"
	},
	{
		kind: "critical",
		weight: "enchant_critical_weight",
		min: "enchant_critical_min",
		max: "enchant_critical_max"
	},
	{
		kind: "attack_speed",
		weight: "enchant_attack_speed_weight",
		min: "enchant_attack_speed_min",
		max: "enchant_attack_speed_max"
	},{kind:"cast_speed",weight:"enchant_cast_speed_weight"},
	{
		kind: "life_steal",
		weight: "enchant_life_steal_weight",
		min: "enchant_life_steal_min",
		max: "enchant_life_steal_max"
	},
	{
		kind: "attack_block",
		weight: "enchant_attack_block_weight",
		min: "enchant_attack_block_min",
		max: "enchant_attack_block_max"
	},
	{
		kind: "hp",
		weight: "enchant_hp_weight"
	}
];
function rollEnchantments(settings, itemKind) {
	if (Math.random() >= clamp$2(settings.enchant_item_chance, 0, 1)) return [];
	const countChances = [
		clamp$2(settings.enchant_one_chance, 0, 1),
		clamp$2(settings.enchant_two_chance, 0, 1),
		clamp$2(settings.enchant_three_chance, 0, 1),
		clamp$2(settings.enchant_four_chance, 0, 1)
	];
	const totalChance = countChances.reduce((sum, chance) => sum + chance, 0);
	let countRoll = Math.random() * Math.max(Number.EPSILON, totalChance);
	let wanted = 1;
	for (let index = 0; index < countChances.length; index += 1) {
		countRoll -= countChances[index];
		if (countRoll <= 0) {
			wanted = index + 1;
			break;
		}
	}
	return enchantKinds.filter((entry) => enchantmentFitsItem(entry.kind, itemKind) && !(itemKind === "armor" && entry.kind === "critical")).map((entry) => ({
		...entry,
		score: Math.random() * Math.max(0, entry.weight ? Number(settings[entry.weight]) : .8)
	})).filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, wanted).map((entry) => {
		return {
			kind: entry.kind,
			value: rollEnchantmentValue(settings, entry.kind)
		};
	});
}
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
function guildSegment(area, ax, ay, bx, by) {
	if (!guildWalkable(area, ax, ay) || !guildWalkable(area, bx, by)) return false;
	const steps = Math.ceil(Math.hypot(bx - ax, by - ay) / 20);
	for (let i = 1; i < steps; i++) if (!guildWalkable(area, ax + (bx - ax) * i / steps, ay + (by - ay) * i / steps)) return false;
	return true;
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
function forestCoreSegment(fromX, fromY, toX, toY) {
	const c = FOREST_CORE_OBSTACLE, ax = (fromX - c.x) / c.radiusX, ay = (fromY - c.y) / c.radiusY;
	const dx = (toX - fromX) / c.radiusX, dy = (toY - fromY) / c.radiusY, squared = dx * dx + dy * dy;
	if (![
		ax,
		ay,
		dx,
		dy
	].every(Number.isFinite)) return false;
	const start = ax * ax + ay * ay, dot = ax * dx + ay * dy;
	if (start < 1) return dot >= 0;
	const t = squared ? Math.max(0, Math.min(1, -dot / squared)) : 0;
	return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 >= 1;
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
function ancientCoreSegment(fromX, fromY, toX, toY) {
	const c = ANCIENT_CORE_OBSTACLE, ax = (fromX - c.x) / c.radiusX, ay = (fromY - c.y) / c.radiusY;
	const dx = (toX - fromX) / c.radiusX, dy = (toY - fromY) / c.radiusY, squared = dx * dx + dy * dy;
	if (![
		ax,
		ay,
		dx,
		dy
	].every(Number.isFinite)) return false;
	const start = ax * ax + ay * ay, dot = ax * dx + ay * dy;
	if (start < 1) return dot >= 0;
	const t = squared ? Math.max(0, Math.min(1, -dot / squared)) : 0;
	return (ax + t * dx) ** 2 + (ay + t * dy) ** 2 >= 1;
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
function isAreaWalkableSegment(area, fromX, fromY, toX, toY) {if(isAdventureArea(area))return adventureSegment(area,fromX,fromY,toX,toY);if(area==='event')return eventSegment444(fromX,fromY,toX,toY);
 if(area==='rune'||area==='rune_v2')return runeWalkableSegment(fromX,fromY,toX,toY);
	if (guildArea(area)) return guildSegment(area, fromX, fromY, toX, toY);
	if (area === "forest") return insideForestBounds(fromX, fromY) && insideForestBounds(toX, toY) && forestCoreSegment(fromX, fromY, toX, toY);
	if (area === "ancient") return [
		fromX,
		fromY,
		toX,
		toY
	].every(Number.isFinite) && fromX >= 55 && fromX <= ANCIENT_WORLD.width - 55 && fromY >= 80 && fromY <= ANCIENT_WORLD.height - 55 && toX >= 55 && toX <= ANCIENT_WORLD.width - 55 && toY >= 80 && toY <= ANCIENT_WORLD.height - 55 && ancientCoreSegment(fromX, fromY, toX, toY);
	if (!isAreaWalkablePosition(area, fromX, fromY) || !isAreaWalkablePosition(area, toX, toY)) return false;
	const lake = area === "frozen" ? FROZEN_LAKE : area === "fishing" ? FISHING_LAKE$1 : null;
	if (lake) {
		const ax = (fromX - lake.x) / lake.radiusX, ay = (fromY - lake.y) / lake.radiusY;
		const dx = (toX - fromX) / lake.radiusX, dy = (toY - fromY) / lake.radiusY;
		const squared = dx * dx + dy * dy;
		const ratio = squared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / squared)) : 0;
		const closest = (ax + ratio * dx) ** 2 + (ay + ratio * dy) ** 2;
		if (area === "frozen" ? closest <= 1 : closest < 1.02) return false;
	}
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
function forestLootMultiplier(sourceKey,level,policy={}){
 const source=String(sourceKey),playerLevel=Number(level);
 const after=Number.isInteger(policy.forest_after_level)?policy.forest_after_level:30;
 const reduction=Number.isFinite(policy.forest_reduction_percent)?Math.max(0,Math.min(100,policy.forest_reduction_percent)):30;
 const reduced=source.startsWith('forest.')?playerLevel>after:source.startsWith('frozen.')?playerLevel>=40:source.startsWith('black.')?playerLevel>=50:false;
 return reduced?1-reduction/100:1;
}
function isBlackStoneBoss476(id){return id==='stone-boss-black-c1'||id==='stone-boss-black-c2'||id==='stone-boss-black-c3'||fourChannels&&id==='stone-boss-black-c4';}
var FROZEN_BOSS_ID = "frozen-boss-1";
function isFrozenBossId(id) {
	return id === FROZEN_BOSS_ID;
}
function isFrozenWaterId(id) {
	return typeof id === "string" && id.startsWith("frozen-water-c");
}
function bonusAmount(amount,percent,random=Math.random){const value=Math.max(0,amount)*(1+Math.max(0,percent)/100),base=Math.floor(value);return base+(random()<value-base?1:0);}
function hasWingBonus(player) {
	return player?.wings_equipped === 1 || player?.core_wings === 1;
}
function lifeStealAmount(damage, percent) {
	return Math.floor(Math.max(0, damage) * Math.max(0, Math.min(15, percent)) / 100);
}
var localWindows = /* @__PURE__ */ new Map();
var nextLocalCleanupAtMs = 0;
function enforceLocalActionRate(accountId, action) {
	const nowMs = Date.now();
	const category = (action === "upgrade_unique" || action === "evolve_weapon") ? "crafting485" : action === "move" ? "move" : action === "heartbeat" ? "heartbeat" : action === "attack" || action === "pvp_attack" || action === "hurt" ? "combat" : action === "collect" ? "loot" : action === "claim_rewards" ? "rewards" : action === "fishing_input" ? "fishing" : /listing|shop|fish|buy_|sell_|exchange|upgrade|epin/.test(action) ? "economy" : "other";
	const limits = {
		global: {
			intervalMs: 6e4,
			limit: 720
		},
		move: {
			intervalMs: 6e4,
			limit: 360
		},
		heartbeat: {
			intervalMs: 6e4,
			limit: 30
		},
		combat: {
			intervalMs: 6e4,
			limit: 240
		},
		loot: {
			intervalMs: 6e4,
			limit: 360
		},
		rewards: {
			intervalMs: 6e4,
			limit: 180
		},
		fishing: {
			intervalMs: 6e4,
			limit: 480
		},
		crafting485: { intervalMs: 6e4, limit: 240 },
		economy: {
			intervalMs: 6e4,
			limit: 45
		},
		other: {
			intervalMs: 6e4,
			limit: 120
		}
	};
	for (const scope of ["global", category]) {
		const limit = limits[scope];
		const key = `${accountId}:${scope}`;
		const previous = localWindows.get(key);
		const next = !previous || nowMs - previous.startedAtMs >= limit.intervalMs ? {
			startedAtMs: nowMs,
			count: 1
		} : {
			startedAtMs: previous.startedAtMs,
			count: previous.count + 1
		};
		localWindows.set(key, next);
		if (next.count > limit.limit) return Math.max(1, Math.ceil((next.startedAtMs + limit.intervalMs - nowMs) / 1e3));
	}
	if (nowMs >= nextLocalCleanupAtMs) {
		nextLocalCleanupAtMs = nowMs + 6e4;
		for (const [key, window] of localWindows) if (nowMs - window.startedAtMs > 12e4) localWindows.delete(key);
	}
	return 0;
}
function movementSpeedForRole(role) {
	return (role === "avci" ? 265 : 239) * 1.07;
}
function evaluateMovementBudget(role, distance, nowMs, checkedAtMs, debtMs) {
	const speed = movementSpeedForRole(role);
	const elapsedMs = checkedAtMs > 0 ? Math.max(0, Math.min(1600, nowMs - checkedAtMs)) : 520;
	const travelMs = Math.ceil(Math.max(0, distance) / speed * 1e3);
	const nextDebtMs = Math.max(0, Math.max(0, debtMs) + travelMs - elapsedMs);
	const maxSingleDistance = speed * 1.84;
	const maxJitterDebtMs = 1e3;
	return {
		speed,
		elapsedMs,
		travelMs,
		nextDebtMs,
		maxSingleDistance,
		allowed: distance <= maxSingleDistance && nextDebtMs <= maxJitterDebtMs,
		severe: distance > maxSingleDistance * 1.5 || nextDebtMs > maxJitterDebtMs * 2
	};
}
function movementPathDistance(from, to, raw, walkable) {
	if (raw === void 0) return walkable(from.x, from.y, to.x, to.y) ? Math.hypot(to.x - from.x, to.y - from.y) : null;
	if (!Array.isArray(raw) || !raw.length || raw.length > 64) return null;
	if (!raw.every((p) => Array.isArray(p) && p.length === 2 && p.every((n) => typeof n === "number" && Number.isFinite(n)))) return null;
	const path = raw;
	const end = path.at(-1);
	if (end[0] !== to.x || end[1] !== to.y) return null;
	const resumeAt = path.findLastIndex((p) => p[0] === from.x && p[1] === from.y);
	let start = Math.max(0, resumeAt + 1);
	if (resumeAt < 0) for (let i = 1; i < path.length; i++) {
		const [ax, ay] = path[i - 1], [bx, by] = path[i];
		const dx = bx - ax, dy = by - ay, lengthSquared = dx * dx + dy * dy;
		const ratio = lengthSquared ? ((from.x - ax) * dx + (from.y - ay) * dy) / lengthSquared : -1;
		if (ratio >= 0 && ratio <= 1 && Math.hypot(from.x - ax - ratio * dx, from.y - ay - ratio * dy) < 1e-6) start = i;
	}
	let previous = from, distance = 0;
	for (const point of path.slice(start)) {
		if (!walkable(previous.x, previous.y, point[0], point[1])) return null;
		distance += Math.hypot(point[0] - previous.x, point[1] - previous.y);
		previous = {
			x: point[0],
			y: point[1]
		};
	}
	return distance;
}
function validArea(area) {if(isAdventureArea(area))return true;
	return typeof area === "string" && /^(forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area);
}
function areaSkillPoint(target, player, hint, nowMs, primary = false, recentlyProvoked = false) {
	if (Number(target.root_until_ms) > nowMs && Number.isFinite(target.control_x) && Number.isFinite(target.control_y)) return {
		x: Number(target.control_x),
		y: Number(target.control_y)
	};
	if (!hint || hint.id !== target.id || hint.spawnRound !== target.spawn_round || target.is_stone || target.is_boss) return target;
	const leash = primary || recentlyProvoked ? 480 : 150;
	if (Math.hypot(hint.x - target.x, hint.y - target.y) > leash + 2 || (primary || recentlyProvoked) && Math.hypot(player.x - hint.x, player.y - hint.y) > 500 || Math.hypot(player.x - target.x, player.y - target.y) > (primary || recentlyProvoked ? 850 : 500) || !isAreaWalkablePosition(target.area, hint.x, hint.y) || !isAreaWalkableSegment(target.area, target.x, target.y, hint.x, hint.y)) return target;
	return {
		x: hint.x,
		y: hint.y
	};
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
function droppedGearName(kind, role, rarity, currentName) {
	if (kind === "weapon" || kind === "armor") return currentName ?? (kind === "weapon" ? "Kadim Silah" : "Kadim Zırh");
	const prefix = rarity === "red" ? "Kızıl" : rarity === "orange" ? "Kor" : rarity === "blue" ? "Safir" : "Kül";
	const className = role === "avci" ? "Avcı" : role === "arkanist" ? "Rün" : "Muhafız";
	return kind === "shoes" ? `${prefix} ${className} Çizmeleri` : kind === "helmet" ? `${prefix} ${className} ${role === "arkanist" ? "Tacı" : role === "avci" ? "Başlığı" : "Miğferi"}` : `${prefix} ${className} Kolyesi`;
}
function prepareProfileDrops(profile, participants, monsterId, center, settings, now, eventSnapshot, pearlsRetired = false) {
 // Only this frozen boss profile grants independent existing rolls to each
 // authoritative participant. Old pending deaths and ordinary rune mobs keep
 // their original single-owner distribution; no ranking reward is duplicated.
 if(profile.runeBossPersonal502===true&&profile.key==='rune_v2.boss'&&(fourChannels?/^rune-v2-boss-c[1-4]-1$/:/^rune-v2-boss-c[1-3]-1$/).test(colLabMonsterSource(monsterId))){
  const personal502={...profile,runeBossPersonal502:false};
  return participants.flatMap(participant=>prepareProfileDrops(personal502,[participant],monsterId,center,settings,now,eventSnapshot,pearlsRetired));
 }

 if(profile.runeLoot){const rates487=JSON.parse(eventSnapshot||'{}'),policy487=balanceFromSnapshot487(rates487),area487=balanceArea487({...center,id:monsterId},profile.key);let owner487;
 const rows=prepareRuneDrops(profile,participants,monsterId,center,settings,now,{role:rollLootRole,name:resolveLootItemName,power:rollLootPower,enchants:rollEnchantments,onOwner487:o=>{owner487=o;},balance487:(kind,owner)=>catalogMultiplier487(kind,balanceFactor487(policy487,area487,owner.level),materialLevelPolicy498(rates487))});
 // Event chest rolls were missing entirely on rune profiles. Keep the same
 // frozen event chances, level policy, one owner and durable claim gate.
 if(owner487)for(const [event,kind,label,dx]of [['chest','crystal_chest','Kristal Sandığı',-20],['moonlight','moonlight_chest','Ayışığı Sandığı',0],['halloween','halloween_pumpkin','Bal Kabağı',20]]){
  const rate=(Number(rates487[event])||0)*(policy487?.enabled?balanceFactor487(policy487,area487,owner487.level):1);
  if(rate>0&&Math.random()*100<rate)rows.push([crypto.randomUUID(),owner487.player_id,monsterId,kind,label,'orange',0,1,null,'[]',center.x+dx,center.y+22,now+GROUND_LOOT_SECONDS,now+5]);
 }return rows;}
	const rates = JSON.parse(eventSnapshot || "{}");
 const balance487=balanceFromSnapshot487(rates),balanceArea=balanceArea487({...center,id:monsterId},profile.key);
	if (rates.materials) profile = withUpgradeMaterialDrops(profile, rates.materials);
	const expiresAt = now + GROUND_LOOT_SECONDS;
	const collectibleAt = now + 5;
	const prepared = [];
	const personalBossLoot = profile.key.startsWith("boss.");
	const lootOwnerIndex = participants.length ? Math.floor(Math.random() * participants.length) : -1;
	participants.forEach((participant, participantIndex) => {
		const ownsItems = personalBossLoot || participantIndex === lootOwnerIndex;
		const levelBalanceMultiplier487=balanceFactor487(balance487,balanceArea,participant.level);
		const itemMultiplier = balance487?.enabled||levelExemptEnabledR58(balanceArea)?1:forestLootMultiplier(profile.key, participant.level, settings);
		const bossPurpleChance = ownsItems ? (monsterId === "ancient-boss-1"||eventKind444(monsterId)==='ancient') ? settings.ancient_boss_purple_chance : (colLabMonsterSource(monsterId) === "dunya-bosu-1"||eventKind444(monsterId)==='world') ? settings.world_boss_purple_chance : 0 : 0;
		const ancientNormalPurpleChance = participantIndex === lootOwnerIndex && profile.key?.startsWith("ancient.") ? settings.ancient_normal_purple_chance : 0;
		rollLootProfile(profile, {
			hasDropCharm: participant.drop_charm_until > now,
			eventPercent: rates.loot ?? 0,
			itemMultiplier,levelBalanceMultiplier487,materialLevel498:materialLevelPolicy498(rates),
			bossPurpleChancePpm: Math.round(Math.max(0, Math.min(1, bossPurpleChance)) * 1e6),
			ancientNormalPurpleChancePpm: Math.round(Math.max(0, Math.min(1, ancientNormalPurpleChance)) * 1e6)
		}).forEach((drop, dropIndex) => {
			if (pearlsRetired && drop.item.kind === "pearl") return;
			if (drop.item.kind !== "essence" && !ownsItems) return;
			const gear = drop.item.type === "gear";
			const lootRole = gear ? rollLootRole() : participant.role;
			const itemName = resolveLootItemName(drop.item, lootRole);
			const angle = (participantIndex * 1.73 + dropIndex * 2.41) % (Math.PI * 2);
			const radius = 18 + (participantIndex * 19 + dropIndex * 23) % 39;
			prepared.push([
				crypto.randomUUID(),
				participant.player_id,
				monsterId,
				drop.item.kind,
				gear ? droppedGearName(drop.item.kind, lootRole, drop.item.rarity, itemName) : itemName,
				drop.item.type === "gear" ? drop.item.rarity : drop.item.kind === "stone_dust" ? "orange" : drop.item.kind === "pearl" ? "blue" : "white",
				gear ? rollLootPower(drop.item, settings) : 0,
				drop.item.kind === "essence" ? bonusAmount(drop.amount, rates.essence ?? 0) : drop.amount,
				gear ? lootRole : null,
				gear ? JSON.stringify(rollEnchantments(settings, drop.item.kind)) : "[]",
				center.x + Math.cos(angle) * radius,
				center.y + Math.sin(angle) * radius * .72,
				expiresAt,
				collectibleAt
			]);
		});
		if (ownsItems && Math.random() * 100 < (rates.chest ?? 0) * itemMultiplier * levelBalanceMultiplier487) prepared.push([
			crypto.randomUUID(),
			participant.player_id,
			monsterId,
			"crystal_chest",
			"Kristal Sandığı",
			"blue",
			0,
			1,
			null,
			"[]",
			center.x + participantIndex * 10,
			center.y + 20,
			expiresAt,
			collectibleAt
		]);
		if (ownsItems && Math.random() * 100 < (rates.moonlight ?? 0) * itemMultiplier * levelBalanceMultiplier487) prepared.push([
			crypto.randomUUID(),
			participant.player_id,
			monsterId,
			"moonlight_chest",
			"Ayışığı Sandığı",
			"orange",
			0,
			1,
			null,
			"[]",
			center.x + participantIndex * 10 + 14,
			center.y + 22,
			expiresAt,
			collectibleAt
		]);
 if(ownsItems&&(rates.halloween??0)>0&&Math.random()*100<(rates.halloween??0)*itemMultiplier*levelBalanceMultiplier487)prepared.push([crypto.randomUUID(),participant.player_id,monsterId,'halloween_pumpkin','Bal Kabağı','orange',0,1,null,'[]',center.x+participantIndex*10+24,center.y+24,expiresAt,collectibleAt]);
	});
	return prepared;
}
function monsterXpReward(target, settings) {if(isAdventureArea(target.area))return globalThis.__colAdventure?.profile(target)?.xp??0;if(isBlackStoneBoss476(target.id))return settings.black_stone_boss_xp_reward;if(target.area==='event')return globalThis.__colEventIsland444?.profile(target)?.xp??0;
 if(target.area==='rune_v2')return globalThis.__colRuneV2?.monster(target)?.xp??0;if(target.area==='rune')return globalThis.__colRunes?.monster(target)?.xp??0;
	if (isFrozenBossId(target.id)) return settings.frozen_boss_xp_reward;
	if (target.id === "ancient-boss-1") return settings.ancient_boss_xp_reward;
	if (isFrozenWaterId(target.id)) return settings.frozen_water_xp_reward;
	if (target.is_boss || target.id === "dragon-world-1") return settings.boss_xp_reward;
	if (target.is_stone) return settings.sinsi_stone_xp_reward;
	if (target.area === "sinsi" || target.summoned) {
		if (target.id.startsWith("golge-")) return settings.sinsi_shadow_wolf_xp_reward;
		if (target.id.startsWith("curuk-")) return settings.sinsi_guardian_xp_reward;
		if (target.id.startsWith("yutan-")) return settings.sinsi_devourer_xp_reward;
		return 0;
	}
	if (target.area === "frozen") {
		if (target.variant === "katil") return settings.frozen_killer_variant_xp_reward;
		if (target.variant === "agresif") return settings.frozen_aggressive_variant_xp_reward;
		if (target.id.startsWith("golge-")) return settings.frozen_shadow_wolf_xp_reward;
		if (target.id.startsWith("curuk-")) return settings.frozen_rotten_guardian_xp_reward;
		if (target.id.startsWith("yutan-")) return settings.frozen_essence_devourer_xp_reward;
		return 0;
	}
	if (target.area === "ancient") return target.id.startsWith("golge-") ? settings.ancient_golge_xp_reward : target.id.startsWith("curuk-") ? settings.ancient_curuk_xp_reward : settings.ancient_yutan_xp_reward;
	if (target.area === "afk") return settings.afk_island_xp_reward;
	if (target.area === "black") return settings.black_monster_xp_reward;
	if (target.variant === "katil") return settings.killer_variant_xp_reward;
	if (target.variant === "agresif") return settings.aggressive_variant_xp_reward;
	if (target.id.startsWith("golge-")) return settings.shadow_wolf_xp_reward;
	if (target.id.startsWith("curuk-")) return settings.rotten_guardian_xp_reward;
	if (target.id.startsWith("yutan-")) return settings.essence_devourer_xp_reward;
	return 0;
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
return Object.freeze({evaluateMovementBudget,movementPathDistance,isAreaWalkableSegment,validArea,armorDamageReduction,equipmentSetBonuses,calculateEquipmentStats,createEnchantmentTotals,effectiveAttackCooldownMs,attackIsBlocked,monsterCombatPosition,areaSkillPoint,monsterXpReward,pveDamage,lifeStealAmount,rollLootProfile,resolveLootItemName,rollLootPower,buildDefaultLootProfile,prepareProfileDrops,enforceLocalActionRate});
}
