import {castleEnabled} from '../castle-model-r59.mjs';
import {groundLoot30s} from '../ground-loot-expiry.mjs';
// R31 fixed belt catalogue; generated extraction remains otherwise intact.
import {beltBonusSql} from '../belt-statistics.mjs';
export {installRegistry,loadRuntimeConfig} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs";
export {seedRegistryFrame} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/realm-control.mjs";
export {VERSION as LOADLAB_VERSION} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab/protocol.mjs";
import {readFriends487} from "../../../../native510-bb3a6cc689c6/lib/friends487.mjs";
import {friendsView487} from "../../../../native510-bb3a6cc689c6/lib/friends487.mjs";
import {readFriendRequests490} from "../../../../native510-bb3a6cc689c6/lib/friends490.mjs";
import {defaultSpecialistSkills459} from "../../../../native510-bb3a6cc689c6/lib/specialist-skills459.mjs";
import {normalizeEventQueue499} from "../../../../native510-bb3a6cc689c6/lib/event-queue499.mjs";
import {validateSpecialistSkills459} from "../../../../native510-bb3a6cc689c6/lib/specialist-skills459.mjs";
import {validateBalance487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {defaultBalance487} from "../../../../native510-bb3a6cc689c6/lib/level-balance487.mjs";
import {eventDisplay499} from "../../../../native510-bb3a6cc689c6/lib/event-queue499.mjs";
import {BOSS_LEADERS_SQL476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {colLabIsMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {colLabCanSeeMonster} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {stoneBossFields476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {partyView486} from "../../../../native510-bb3a6cc689c6/lib/party-view486.mjs";
import {colLabCanSeeCombat} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {createWorldPlayerProjector} from "../world-player-projection-r102.mjs";
export {createWorldPlayerProjector};
const ambient=globalThis;
export function createColdWorldRules({globals,now=Date.now}){const globalThis=globals,Date=class extends ambient.Date{static now(){return now();}};
function defaultFishingCatch482(){return {pearl:12,red_pearl:8,talisman:10,sokan:30,levrek:20,zargana:20};}
function validateFishingCatch482(input){
 const keys=['pearl','red_pearl','talisman','sokan','levrek','zargana'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||Object.keys(input).some(key=>!keys.includes(key)))throw Error('Altı av ödülünün oranını gir.');
 const next={};let total=0;
 for(const key of keys){const value=input[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>0.000001)throw Error('Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=value;total+=Math.round(value*100);}
 if(total!==10000)throw Error('Yakalama oranlarının toplamı %100 olmalı.');
 return next;
}
function halloweenEventView456(raw){const c=readEventsConfig(raw),e=eventDisplay499(c.events.halloween);return {enabled:e.enabled,start:e.start,end:e.end,percent:e.percent,wandChance:c.halloweenWandChance};}
const colDecor453 = (function createSeasonalDecorServer453() {
  const areas = ['forest','frozen','black','bazaar','fishing','sanctum','sinsi','war','arena',"ancient","afk","dragon","event","rune","rune_v2",'guild_arena'];
  const themes = ['new_year','halloween','ramadan','first_light'];
  const acceptedThemes = ['none', ...themes];
  const cache = new Map();
  const readSql = 'SELECT seasonal_themes_json,new_year_mode,halloween_mode FROM game_settings WHERE id=1';
  const writeSql = 'UPDATE game_settings SET seasonal_themes_json=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?';
  let parseCount = 0;
  const plain = value => !!value && typeof value === 'object' && !Array.isArray(value);
  const n = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
  const round = value => Math.round(value * 1e5) / 1e5;
  const validRevision = revision => Number.isSafeInteger(revision) && revision >= 0;
  const error = (status, message) => ({ok:false,status,error:message});
  function validateLayout(theme, props, lights) {
    if (!themes.includes(theme) || !Array.isArray(props) || props.length > 32 || !Array.isArray(lights) || lights.length > 8) return null;
    const normalizedProps = [], normalizedLights = [];
    for (const prop of props) {
      if (!Array.isArray(prop) || prop.length < 4 || prop.length > 5 || !Number.isInteger(prop[0]) || prop[0] < 0 || prop[0] > ((theme === "new_year" || theme === "halloween") ? 11 : 5) ||
          !n(prop[1],0,1) || !n(prop[2],0,1) || !n(prop[3],60,320) || (prop.length === 5 && typeof prop[4] !== 'boolean')) return null;
      normalizedProps.push(prop.length === 5 ? [prop[0],round(prop[1]),round(prop[2]),round(prop[3]),prop[4]] : [prop[0],round(prop[1]),round(prop[2]),round(prop[3])]);
    }
    for (const light of lights) {
      if (!Array.isArray(light) || light.length !== 5 || !n(light[0],0,1) || !n(light[1],0,1) || !n(light[2],0,1) || !n(light[3],0,1) || !n(light[4],0,.08)) return null;
      normalizedLights.push(light.map(round));
    }
    return {props:normalizedProps,lights:normalizedLights};
  }
  function parse(raw) {
    raw = typeof raw === 'string' && raw.length <= 196608 ? raw : '{}';
    if (cache.has(raw)) return cache.get(raw);
    parseCount++;
    let map;
    try { map = JSON.parse(raw); } catch { map = {}; }
    if (!plain(map)) map = {};
    const publicThemes = {};
    for (const area of areas.slice(0,-1)) if (Object.hasOwn(map,area) && acceptedThemes.includes(map[area])) publicThemes[area] = map[area];
    const layouts = {};
    if (map.__decor?.version === 1 && plain(map.__decor.layouts)) for (const theme of themes) for (const area of areas) {
      const key = theme + ':' + area;
      const value = map.__decor.layouts[key];
      if (!plain(value) || !validRevision(value.revision) || typeof value.custom !== 'boolean') continue;
      const layout = validateLayout(theme,value.props,value.lights);
      if (!layout) continue;
      const item = {revision:value.revision,custom:value.custom,...(value.custom ? layout : {props:[],lights:[]})};
      for (const tuple of item.props) Object.freeze(tuple);
      for (const tuple of item.lights) Object.freeze(tuple);
      Object.freeze(item.props); Object.freeze(item.lights); Object.freeze(item);
      layouts[key] = item;
    }
    const config = Object.freeze({themes:Object.freeze(publicThemes),layouts:Object.freeze(layouts),publicJson:JSON.stringify(publicThemes)});
    if (cache.size >= 4) cache.delete(cache.keys().next().value);
    cache.set(raw,config);
    return config;
  }
  function theme(settings, area) {
    if (!areas.includes(area)) return 'none';
    const themeArea = area === 'guild_arena' ? 'arena' : area;
    const config = parse(settings?.seasonal_themes_json);
    return Object.hasOwn(config.themes,themeArea) ? config.themes[themeArea] : Number(settings?.new_year_mode) === 1 ? 'new_year' : Number(settings?.halloween_mode) === 1 ? 'halloween' : 'none';
  }
  function layout(settings, area, selectedTheme) {
    if (!areas.includes(area) || !themes.includes(selectedTheme)) return null;
    return parse(settings?.seasonal_themes_json).layouts[selectedTheme + ':' + area] ?? null;
  }
  function projectSettings(settings, area, arenaMatchId = '') {
    const raw = settings?.seasonal_themes_json;
    // The baseline has no custom records. Preserve the exact original object,
    // shape and bytes until an administrator creates a decoration revision.
    if (typeof raw !== 'string' || !raw.includes('__decor')) return settings;
    // Guild matches persist player.area='arena'. Their existing match ID
    // already identifies the courtyard; no new viewer query is necessary.
    if (area === 'arena' && typeof arenaMatchId === 'string' && arenaMatchId.startsWith('guild-')) area = 'guild_arena';
    const config = parse(raw);
    const result = {...settings,seasonal_themes_json:config.publicJson};
    delete result.seasonal_decor_current;
    const selectedTheme = theme(settings,area);
    const selected = selectedTheme === 'none' ? null : config.layouts[selectedTheme + ':' + area];
    if (selected) result.seasonal_decor_current = {area,theme:selectedTheme,...selected};
    return result;
  }
  function pack(config, publicThemes = config.themes, layouts = config.layouts) {
    return JSON.stringify({...publicThemes,...(Object.keys(layouts).length ? {__decor:{version:1,layouts}} : {})});
  }
  async function save(database, payload) {
    if (!areas.includes(payload.area) || !themes.includes(payload.theme) || !validRevision(payload.expectedRevision) || payload.expectedRevision === Number.MAX_SAFE_INTEGER) return error(400,'Harita, tema veya yerleşim sürümü geçersiz.');
    const resetting = payload.action === 'reset_decor_layout';
    if (!resetting && payload.action !== 'set_decor_layout') return error(400,'Süsleme işlemi geçersiz.');
    const nextLayout = resetting ? {props:[],lights:[]} : validateLayout(payload.theme,payload.props,payload.lights);
    if (!nextLayout) return error(400,'En fazla 32 süs ve 8 ışık dizisi kullanılabilir. Süs türü, boyutu veya konumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const key = payload.theme + ':' + payload.area;
    if ((config.layouts[key]?.revision ?? 0) !== payload.expectedRevision) return error(409,'Bu yerleşim başka pencerede değişti. Paneli yenile.');
    const revision = payload.expectedRevision + 1;
    const layouts = {...config.layouts,[key]:{revision,custom:!resetting,...nextLayout}};
    const saved = await database.prepare(writeSql).bind(pack(config,config.themes,layouts),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Süsler veya temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true,revision};
  }
  async function setMapTheme(database,payload) {
    if (!areas.slice(0,-1).includes(payload.area) || !acceptedThemes.includes(payload.theme)) return error(400,'Harita veya tema geçersiz. Zindanda tema kullanılamaz.');
    const current = await database.prepare(readSql).first();
    if (!current || theme(current,payload.area) !== payload.expectedTheme) return error(409,'Bu haritanın teması değişmiş. Paneli yenileyip tekrar dene.');
    const config = parse(current.seasonal_themes_json);
    const map = Object.fromEntries(areas.slice(0,-1).map(area=>[area,theme(current,area)]));
    map[payload.area] = payload.theme;
    const saved = await database.prepare(writeSql).bind(pack(config,map),current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  async function setGlobalTheme(database,payload) {
    if (typeof payload.enabled !== 'boolean' || !['set_new_year_mode','set_halloween_mode'].includes(payload.action)) return error(400,'Tema durumu geçersiz.');
    const current = await database.prepare(readSql).first();
    if (!current) return error(409,'Dünya ayarı bulunamadı. Paneli yenile.');
    const config = parse(current.seasonal_themes_json);
    const winter = payload.action === 'set_new_year_mode';
    const newYear = winter ? (payload.enabled ? 1 : 0) : payload.enabled ? 0 : current.new_year_mode;
    const halloween = winter ? payload.enabled ? 0 : current.halloween_mode : (payload.enabled ? 1 : 0);
    const saved = await database.prepare('UPDATE game_settings SET seasonal_themes_json=?,new_year_mode=?,halloween_mode=? WHERE id=1 AND seasonal_themes_json=? AND new_year_mode=? AND halloween_mode=?').bind(pack(config,{}),newYear,halloween,current.seasonal_themes_json,current.new_year_mode,current.halloween_mode).run();
    if (!saved.meta?.changes) return error(409,'Temalar başka pencerede değişti. Paneli yenile.');
    cache.clear();
    return {ok:true};
  }
  return Object.freeze({projectSettings,save,setMapTheme,setGlobalTheme,layout,theme,validateLayout,cacheState:()=>({size:cache.size,parseCount})});
})();
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
function guildSkillService() {
	return globalThis.__colGuildSkill;
}
var EXTRA_PRODUCTS = {"fishing_guide":{"name":"Balıkçılık Kılavuzu","price":372,"image":"/game/fishing-bait-v374.webp","stock":"fishing_guides","timer":"fishing_guide_until","seconds":3600,"description":"1 saat boyunca her başarılı avın balık, inci, tılsım taşı ve etkinlik ödülü 2 katına çıkar. Çantadan kullanınca başlar; çevrimdışıyken süre ilerler. Bereketli Olta Yemi ile birlikte aktifken normal balık miktarı en fazla 2 kat olur; her başarılı gerçek balık avı 1 yem hakkı tüketir. Görev ilerlemesi değişmez."},"boss_reminder":{"name":"Boss Takip","price":75,"image":"/game/boss-tracker-v480.webp","stock":"boss_reminders","timer":"boss_reminder_until","seconds":604800,"description":"Bossların resimlerini, konumlarını ve yeniden doğma sürelerini gösterir. Satın alınca çantana gelir; çantadan kullandığında 7 günlük süre başlar. Çevrimdışıyken süre azalır."},
	mastery_seal492:{"name":"Ustalık Mührü","price":47,"image":"/game/ustalik-muhru-v492.webp","stock":"mastery_seals492","description":"Haso → Artı Basma’da seçildiğinde bir denemenin mevcut başarı şansını %30 artırır: %20 → %26. En fazla %100. Başarıda veya başarısızlıkta 1 adet tüketilir; artı düşmesini önlemez."},protection_seal: {
		name: "Demircinin Koruma Mührü",
		price: 75,
		image: "/game/protection-seal-v374.webp",
		stock: "protection_seals",
		description: "Sonraki başarısız Taş Sanatı üretiminde her malzemenin yarısını geri verir (küsurat aşağı yuvarlanır). Garantili dönüşümlerde tüketilmez."
	},
	battle_ration: {
		name: "Savaşçının Kumanyası",
		price: 50,
		image: "/game/battle-ration-v374.webp",
		stock: "battle_rations",
		timer: "ration_until",
		seconds: 3600,
		description: "60 dakika +15 saldırı ve +200 can. Ölümde kaybolmaz. Aktifken yeniden kullanılamaz."
	},
	fishing_bait: {
		name: "Bereketli Olta Yemi",
		price: 150,
		image: "/game/fishing-bait-v374.webp",
		stock: "fishing_baits",
		description: "30 başarılı balık avında çift balık. Balıkçılık Kılavuzu ile birleşmez; birlikte etkinse normal balık miktarı en fazla 2 kat olur ve her başarılı gerçek balık avı 1 yem hakkı tüketir. İnci ve Tılsım Taşı çoğalmaz; yem hakkı tüketmez."
	},
	rank_scroll: {
		name: "Kadim Bilgelik Parşömeni",
		price: 100,
		image: "/game/rank-scroll-v374.webp",
		stock: "rank_scrolls",
		timer: "wisdom_until",
		seconds: 7200,
		description: "2 saat %25 ek rütbe tecrübesi. Rütbesi açılmış oyuncular kullanabilir; Savaşçının Yolu görevini atlatmaz."
	},
	xp_costume: {
		name: "Kadim Işığın Giysisi",
		price: 150,
		image: "/game/radiant-costume-icon-v374.webp",
		stock: "radiant_costumes",
		timer: "radiant_until",
		seconds: 7 * 864e5 / 1e3,
		description: "7 gün %20 fazla canavar tecrübesi. Sınıfına özel ışıklı görünüm. Eski giysiyle aynı anda kuşanılmaz."
	},
	essence_charm: {
		name: "Öz Toplayıcı Tılsım",
		price: 150,
		image: "/game/essence-charm-v374.webp",
		stock: "essence_charms",
		timer: "essence_until",
		seconds: 259200,
		description: "3 gün canavarlardan %20 fazla öz. Ticaret, bağış ve sandık ödüllerini artırmaz."
	}
};
var PREMIUM_ITEMS = {trade_glass499:{"name":"Ticaret Camı","price":100,"image":"/game/trade-glass499.webp","shopOnly499":true},pumpkin_knight499:{"name":"Bal Kabağı Şövalyesi Seti","price":250,"shopOnly499":true,"image":"/game/pumpkin-knight-icon499.webp","description":"7 günlük zırh ve sınıfa uygun silah görünümü. Toplam +1000 Can, +20 saldırı, canavarlara karşı %10 güç ve %25 canavar tecrübesi. Süre satın alınca başlar; çevrimdışıyken de ilerler. Çantadan kuşanılır."},"cp_coupon_100":{"name":"100 ÇP Kuponu","price":110,"faceValue":100,"image":"/game/cp-coupon-100-v483.svg"},"cp_coupon_200":{"name":"200 ÇP Kuponu","price":220,"faceValue":200,"image":"/game/cp-coupon-200-v483.svg"},"cp_coupon_500":{"name":"500 ÇP Kuponu","price":550,"faceValue":500,"image":"/game/cp-coupon-500-v483.svg"},
	...EXTRA_PRODUCTS,
	afk_ticket: {
		name: "Oto Av +2 Saat",
		price: 200,
		image: "/game/afk-ticket-v350.webp"
	},
	enchant_add: {
		name: "Efsun Artırma Nesnesi",
		price: 35,
		image: "/game/enchant-add-v262.webp"
	},
	wings: {
		name: "Kızıl Çekirdek Kanatları",
		price: 500
	},
	xp_ring: {
		name: "Tecrübe Yüzüğü",
		price: 150
	},
	drop_charm: {
		name: "Ganimet Tılsımı",
		price: 150
	},
	item_link: {
		name: "Eşya Yansıtma",
		price: 1,
		image: "/game/item-reflection-v250.webp"
	},
	enchant_scroll: {
		name: "Efsun Değiştirme Parşömeni",
		price: 25,
		image: "/game/enchant-change.webp"
	},
	auto_potion: {
		name: "Oto Kırmızı İksir",
		price: 100,
		image: "/game/auto-red-potion.webp"
	},
	costume: {
		name: "Sınıf Giysisi",
		price: 200
	},
	stall_skin: {
		name: "Zümrüt Pazar Tezgâhı",
		price: 75,
		image: "/game/premium-stall.webp"
	},
	teleport_skin: {
		name: "Zümrüt Geçidi",
		price: 75,
		image: "/game/teleport-seal-v250.webp"
	},
	weapon_skin: {
		name: "Zümrüt Hükümran Silahı",
		price: 150,
		image: "/game/premium-weapons.webp"
	},
	storage_page: {
		name: "Ek Depo Sayfası",
		price: 100
	},
	rename_scroll: {
		name: "İsim Değiştirme",
		price: 50,
		image: "/game/rename-scroll-v250.webp"
	}
};
function dragonService() {
	return globalThis.__colDragonBoss ?? null;
}
function rankService() {
	return globalThis.__colRanks;
}
function withRankPlayers(rows, ownerId) {
	const ranked = rankService()?.project(rows, ownerId) ?? rows;
	const guilded = guildSkillService()?.project(ranked) ?? ranked;
	return globalThis.__colPremium?.project(guilded, ownerId) ?? guilded;
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
var PVP_REWARD_COOLDOWN_MS = 1800 * 1e3;
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
var MARKET_PRODUCTS = {
	...Object.fromEntries(Object.entries(PREMIUM_ITEMS).map(([k, v]) => [k, {
		name: v.name,
		price: v.price,
		currency: "ÇP"
	}])),
	pet_bird: {
		name: "Kuş Peti",
		price: 200,
		currency: "ÇP"
	},
	pet_monkey: {
		name: "Maymun Peti",
		price: 200,
		currency: "ÇP"
	},
	pet_dog: {
		name: "Köpek Peti",
		price: 200,
		currency: "ÇP"
	},
	coins_200: {
		name: "200 ÇP E-PIN",
		price: 150,
		currency: "TL"
	},
	coins_1000: {
		name: "1000 ÇP E-PIN",
		price: 550,
		currency: "TL"
	},coins_3000:{name:"3000 ÇP E-PIN",price:1500,currency:"TL"},
	coins_500: {
		name: "500 ÇP E-PIN",
		price: 300,
		currency: "TL"
	},
	support: {
		name: "Destek Paketi",
		price: 400,
		currency: "TL"
	}
};
function parseMarketPrices(raw) {
	let value = {};
	try {
		value = typeof raw === "string" ? JSON.parse(raw) : raw ?? {};
	} catch {}
	return Object.fromEntries(Object.entries(MARKET_PRODUCTS).map(([key, item]) => {
		const row = value[key];
		return [key, {
			base: Number.isSafeInteger(row?.base) && row.base >= 1 && row.base <= 1e6 ? row.base : item.price,
			discount: !key.startsWith("coins_") && Number.isInteger(row?.discount) && row.discount >= 0 && row.discount <= 90 ? row.discount : 0
		}];
	}));
}
const EVENT_KINDS = ['loot','xp','essence','chest','moonlight','fishing','halloween'];
const EVENT_LABELS = {loot:'Ganimet Bereketi',xp:'Tecrübe Bereketi',essence:'Öz Bereketi',chest:'Kristal Sandığı',moonlight:'Ayışığı Sandığı',fishing:'Balıkçılık Etkinliği',halloween:'Cadılar Bayramı'};
const CHEST_PRIZES = [
 {id:'pearl',label:'Beyaz İnci',weight:2}, {id:'potion',label:'Kırmızı İksir',weight:20},
 {id:'weapon',label:'Turuncu Silah',weight:1}, {id:'armor',label:'Turuncu Zırh',weight:1},
 {id:'essence5',label:'5 Öz',weight:20}, {id:'essence8',label:'8 Öz',weight:15},
 {id:'essence10',label:'10 Öz',weight:15}, {id:'essence15',label:'15 Öz',weight:10},
 {id:'essence20',label:'20 Öz',weight:6}, {id:'sokan',label:'Sokan Balığı',weight:10},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:0.1},
 {id:'red_pearl',label:'Kırmızı İnci',weight:0.1},
];
const MOONLIGHT_PRIZES = [
 {id:'essence20',label:'20 Yaşam Özü',weight:30},{id:'potions5',label:'5 Kırmızı İksir',weight:25},
 {id:'dust5',label:'5 Taş Tozu',weight:20},{id:'gems20',label:'20 Mücevher',weight:15},
 {id:'wing',label:'Kanat Parçası',weight:1},{id:'pearl',label:'Beyaz İnci',weight:2},
 {id:'dragon',label:'Ejderha Parçası',weight:.6},{id:'necklace',label:'Kırmızı Kolye · rastgele efsun',weight:1},
 {id:'attack_stone',label:'Saldırı Gücü Taşı',weight:1},{id:'evolution_scroll',label:'Evrim Parşömeni',weight:1},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:.05},
 {id:'red_pearl',label:'Kırmızı İnci',weight:.05},
];
const FISHING_EVENT_PRIZES = [
 {id:'enchant_scroll',label:'Efsun Değiştirme Nesnesi',weight:50,image:'/game/enchant-change.webp'},
 {id:'enchant_add',label:'Efsun Artırma Nesnesi',weight:30,image:'/game/enchant-add-v262.webp'},
 {id:'afk_ticket',label:'Oto Av Bileti · +2 saat',weight:15,image:'/game/afk-ticket-v350.webp'},
 {id:'auto_potion',label:'Oto Kırmızı İksir',weight:5,image:'/game/auto-red-potion.webp'},
];
function defaultEvents(){return {version:1,events:Object.fromEntries(EVENT_KINDS.map(kind=>[kind,{enabled:false,start:0,end:0,percent:kind==='chest'?2:kind==='moonlight'||kind==='fishing'||kind==='halloween'?1:20,runId:''}])),weights:Object.fromEntries(CHEST_PRIZES.map(p=>[p.id,p.weight])),moonlightWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),fishingWeights:Object.fromEntries(FISHING_EVENT_PRIZES.map(p=>[p.id,p.weight])),halloweenWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),halloweenWandChance:20,fishingRedPearlChance460:5,fishingCatchWeights482:defaultFishingCatch482(),specialistSkills459:defaultSpecialistSkills459()};}
function validateEvents(input){
 if(!input||typeof input!=='object')throw new Error('Etkinlik ayarları geçersiz.');
 const config=defaultEvents();
 for(const kind of EVENT_KINDS){const e=(kind==='moonlight'||kind==='fishing'||kind==='halloween')&&!input.events?.[kind]?config.events[kind]:input.events?.[kind];if(!e||typeof e.enabled!=='boolean'||!Number.isFinite(e.percent)||e.percent<0||e.percent>(kind==='chest'||kind==='moonlight'||kind==='fishing'||kind==='halloween'?100:500)||!Number.isSafeInteger(e.start)||!Number.isSafeInteger(e.end)||e.start<0||e.end<0||e.end>4102444800||((e.enabled||e.start||e.end)&&!(e.start>0&&e.end>e.start)))throw new Error(`${EVENT_LABELS[kind]}: oranı ve başlangıç/bitiş saatini kontrol et.`);
 config.events[kind]={enabled:e.enabled,start:e.start,end:e.end,percent:e.percent,runId:typeof e.runId==='string'?e.runId.slice(0,80):''};config.events[kind].schedule499=normalizeEventQueue499(kind,e.schedule499,config.events[kind]);}
 for(const prize of CHEST_PRIZES){const w=input.weights?.[prize.id]??((prize.id==='fifth_enchant'||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Sandık ağırlıkları 0–100000 arasında olmalı.');config.weights[prize.id]=w;}
 if(Object.values(config.weights).reduce((a,b)=>a+b,0)<=0)throw new Error('Sandıkta en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.moonlightWeights?.[prize.id]??((input.moonlightWeights===undefined||prize.id==='red_pearl')?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Ayışığı Sandığı ağırlıkları 0–100000 arasında olmalı.');config.moonlightWeights[prize.id]=w;}
 if(Object.values(config.moonlightWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Ayışığı Sandığında en az bir ödül açık olmalı.');
 for(const prize of FISHING_EVENT_PRIZES){const w=input.fishingWeights?.[prize.id]??(input.fishingWeights===undefined?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Balıkçılık ödül ağırlıkları 0–100000 arasında olmalı.');config.fishingWeights[prize.id]=w;}
 if(Object.values(config.fishingWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Balıkçılık etkinliğinde en az bir ödül açık olmalı.');
 for(const prize of MOONLIGHT_PRIZES){const w=input.halloweenWeights?.[prize.id]??(input.halloweenWeights===undefined?config.moonlightWeights[prize.id]:prize.id==='red_pearl'?prize.weight:undefined);if(!Number.isFinite(w)||w<0||w>100000)throw new Error('Bal Kabağı ağırlıkları 0–100000 arasında olmalı.');config.halloweenWeights[prize.id]=w;}
 if(Object.values(config.halloweenWeights).reduce((a,b)=>a+b,0)<=0)throw new Error('Bal Kabağında en az bir ödül açık olmalı.');
 const wand=input.halloweenWandChance??20;if(!Number.isFinite(wand)||wand<0||wand>100)throw new Error('Cadı değneği şansı 0–100 arasında olmalı.');config.halloweenWandChance=wand;const red=input.fishingRedPearlChance460??5;if(typeof red!=='number'||!Number.isFinite(red)||red<0||red>100||Math.abs(red*100-Math.round(red*100))>0.000001)throw new Error('Kırmızı inci şansı 0–100 arasında, en fazla iki ondalıklı olmalı.');config.fishingRedPearlChance460=red;config.fishingCatchWeights482=validateFishingCatch482(input.fishingCatchWeights482??defaultFishingCatch482());config.specialistSkills459=validateSpecialistSkills459(input.specialistSkills459??defaultSpecialistSkills459());
 config.highLevelBalance487=validateBalance487(input.highLevelBalance487??defaultBalance487());
 return config;
}
function parseEvents(raw){try{return validateEvents(typeof raw==='string'?JSON.parse(raw):raw);}catch{return defaultEvents();}}
let cachedEventsRaw;
let cachedEventsConfig;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
function readEventsConfig(raw){
 if(typeof raw!=='string')return parseEvents(raw);
 if(raw!==cachedEventsRaw){cachedEventsConfig=deepFreeze(parseEvents(raw));cachedEventsRaw=raw;}
 return cachedEventsConfig;
}
var ARENA_QUEUE_TTL_MS = 45e3;
var WORLD_CHAT_SQL = "SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'world' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 20)\nUNION ALL SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'trade' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 60)\nUNION ALL SELECT * FROM (SELECT id, player_id, player_name, item_snapshot, body, created_at, scope, area, channel FROM messages WHERE recipient_id IS NULL AND scope = 'regional' AND area = ? AND channel = ? AND announcement_expires_at_ms = 0 AND id > ? ORDER BY id DESC LIMIT 30)\nORDER BY id DESC";
var REGIONAL_CHAT_SQL = "SELECT id, player_id, player_name, item_snapshot, body, created_at FROM messages WHERE scope = 'regional' AND area = ? AND channel = ? AND created_at >= ? AND id > ? ORDER BY id DESC LIMIT 30";
var MARKET_LISTINGS_SQL = "SELECT id, shop_id, seller_id, kind, item_id, item_name, rarity, power, role, enchantments, amount, price_gems, created_at FROM market_listings ORDER BY created_at DESC LIMIT 250";
var ACTIVE_GM_ANNOUNCEMENT_SQL = `SELECT id, player_name, body, announcement_expires_at_ms
  FROM messages WHERE announcement_expires_at_ms > ? AND created_at<=unixepoch() ORDER BY id ASC LIMIT 1`;
var ACTIVE_PLAYERS_SQL = `SELECT * FROM (WITH visible_players AS MATERIALIZED (
 SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id,
  p.motion_sequence, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms, p.essence, p.contribution, p.xp, p.level, p.gems,
  p.core_coins, p.item_link_orbs, p.afk_tickets, p.enchant_scrolls, p.enchant_add_scrolls, p.fifth_enchant_scrolls, p.auto_potion_owned, p.auto_potion_enabled, p.auto_potion_remaining, p.auto_potion_total,
  p.stall_skin_owned, p.stall_skin_enabled, p.teleport_skin_owned, p.teleport_skin_enabled, p.teleport_skin_expires_at_ms, p.weapon_skin_owned, p.weapon_skin_enabled, p.weapon_skin_expires_at_ms, p.storage_pages, p.rename_scrolls,
  p.jewelry_attack, p.jewelry_defense, p.jewelry_cast_speed, p.jewelry_pvp, p.jewelry_resist, p.potions, p.specialization, p.skill_four, p.skill_one, p.skill_two, p.skill_three, p.has_rod, p.rod_equipped, p.fish_sokan, p.fish_levrek, p.fish_zargana, p.pearls,
  p.stone_dust, p.xp_ring_until, p.drop_charm_until, p.has_wings, p.wings_equipped, p.wings_expires_at_ms, p.area, p.channel, p.arena_match_id, p.last_seen FROM players p WHERE (p.last_seen >= ? OR p.id = ?) AND p.channel = ? AND p.area = ?
 AND (p.is_gm != 1 OR p.gm_invisible != 1 OR p.id = ?)
 AND (p.area != 'arena' OR (p.arena_match_id != '' AND p.arena_match_id = (SELECT arena_match_id FROM players WHERE id = ?)))
 ORDER BY p.last_seen DESC LIMIT 80), equipped_items AS MATERIALIZED (
 SELECT i.player_id,i.kind,i.role,i.rarity,i.power,CASE WHEN substr(i.item_name,1,3)='+5 ' AND i.kind IN ('weapon','armor','helmet','shoes','necklace') THEN json_insert(CASE WHEN json_valid(i.enchantments) AND json_type(i.enchantments)='array' THEN i.enchantments ELSE '[]' END, '$[#]', json_object('kind',CASE i.kind WHEN 'weapon' THEN 'strong_players' WHEN 'shoes' THEN 'strong_players' WHEN 'helmet' THEN 'critical_damage491' ELSE 'resistant_players' END,'value',CASE i.kind WHEN 'helmet' THEN 10 WHEN 'weapon' THEN 5 WHEN 'armor' THEN 5 ELSE 3 END)) ELSE i.enchantments END AS enchantments
 FROM visible_players vp JOIN player_items i ON i.player_id=vp.id AND i.equipped=1
), equipment_summary AS MATERIALIZED (
 SELECT player_id,
 MAX(CASE WHEN kind='costume' THEN role END) AS costume_role,
 MAX(CASE WHEN kind='armor' THEN rarity END) AS armor_rarity,
 MAX(CASE WHEN kind='helmet' THEN rarity END) AS helmet_rarity,
 MAX(CASE WHEN kind='weapon' THEN rarity END) AS weapon_rarity,
 MAX(CASE WHEN kind='weapon' THEN (SELECT json_extract(e.value,'$.value') FROM json_each(enchantments) e WHERE json_extract(e.value,'$.kind')='evolution_level' LIMIT 1) END) AS weapon_evolution,
 SUM(CASE WHEN kind='weapon' THEN power ELSE 0 END) AS weapon_power,
 SUM(CASE WHEN kind IN ('armor','helmet','shoes','necklace','costume') THEN power ELSE 0 END) AS armor_power
 FROM equipped_items GROUP BY player_id
), equipment_effects AS MATERIALIZED (
 SELECT i.player_id,i.kind,
 json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.kind') AS effect_kind,
 CAST(json_extract(CASE WHEN json_valid(effect.value) THEN effect.value ELSE '{}' END, '$.value') AS INTEGER) AS effect_value
 FROM equipped_items i,
 json_each(CASE WHEN json_valid(i.enchantments) THEN i.enchantments ELSE '[]' END) effect
), enchantment_totals AS MATERIALIZED (SELECT i.player_id,
MIN(50,MAX(0,COALESCE(SUM(CASE WHEN i.effect_kind='cast_speed' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value>0 THEN MIN(50,MAX(1,i.effect_value)) ELSE 0 END),0))) AS cast_speed,
MIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='forest_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS forest_power,
MIN(10, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='frozen_power' AND i.kind IN ('weapon','armor','necklace') AND i.effect_value BETWEEN 1 AND 10 THEN i.effect_value ELSE 0 END),0))) AS frozen_power,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='fire' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS fire_damage,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='ice' AND i.kind IN ('weapon') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS ice_damage,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='strong_players' AND i.kind IN ('weapon','armor','helmet','shoes','necklace','earring','bracelet') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS strong_players,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='sword_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS sword_defense,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='arrow_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS arrow_defense,
MIN(80, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='magic_defense' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS magic_defense,
MIN(90, MAX(0, COALESCE(SUM(CASE WHEN i.effect_kind='resistant_players' AND i.kind IN ('armor','helmet','shoes','necklace','earring','bracelet','costume') THEN MIN(95, MAX(0, i.effect_value)) ELSE 0 END),0))) AS resistant_players
 FROM equipment_effects i GROUP BY i.player_id)
SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence, p.hp, p.max_hp, p.hp_revision, p.respawn_at_ms, p.essence, p.contribution, p.xp, p.level, p.gems, p.core_coins, p.item_link_orbs, p.afk_tickets, p.enchant_scrolls, p.enchant_add_scrolls, p.fifth_enchant_scrolls, p.auto_potion_owned, p.auto_potion_enabled, p.auto_potion_remaining,p.auto_potion_total, p.stall_skin_owned, p.stall_skin_enabled, p.teleport_skin_owned, p.teleport_skin_enabled, p.teleport_skin_expires_at_ms, p.weapon_skin_owned, p.weapon_skin_enabled,p.weapon_skin_expires_at_ms, p.storage_pages, p.rename_scrolls, p.potions,
  (SELECT g.name FROM guild_members gm JOIN guilds g ON g.id=gm.guild_id WHERE gm.player_id=p.id) AS guild_name,
  p.specialization, p.skill_four, p.skill_one, p.skill_two, p.skill_three, p.has_rod, p.rod_equipped,
  p.fish_sokan, p.fish_levrek, p.fish_zargana, p.pearls, p.stone_dust, p.xp_ring_until, p.drop_charm_until,
  es.costume_role AS costume_role,
  p.has_wings, p.wings_equipped, p.wings_expires_at_ms, p.area, p.channel, p.arena_match_id, p.last_seen,
  (SELECT equipped FROM dungeon_wings WHERE player_id=p.id) AS core_wings,
  (SELECT name FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_name,
  (SELECT kind FROM player_pets WHERE player_id = p.id AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() AND equipped = 1 LIMIT 1) AS pet_kind,
  COALESCE((SELECT team FROM arena_match_players WHERE match_id = p.arena_match_id AND player_id = p.id LIMIT 1), 0) AS arena_team,
  es.armor_rarity AS armor_rarity,
  es.helmet_rarity AS helmet_rarity,
  es.weapon_rarity AS weapon_rarity,
  COALESCE(es.weapon_evolution,0) AS weapon_evolution,
  COALESCE(es.weapon_power,0) + CASE WHEN p.weapon_skin_enabled=1 THEN 20 ELSE 0 END + p.jewelry_attack + ${beltBonusSql('attack','p')} AS equipped_weapon_power,
  COALESCE(es.armor_power,0) + p.jewelry_defense + CASE WHEN p.role='muhafiz' THEN 10 ELSE 0 END AS equipped_armor_power,
  COALESCE(et.forest_power,0) AS forest_power,
  COALESCE(et.frozen_power,0) AS frozen_power,
  MIN(50,COALESCE(et.cast_speed,0) + p.jewelry_cast_speed) AS cast_speed,
  COALESCE(et.fire_damage,0) AS fire_damage,
  COALESCE(et.ice_damage,0) AS ice_damage,
  COALESCE(et.strong_players,0) + p.jewelry_pvp + ${beltBonusSql('strongPlayers','p')} AS strong_players,
  COALESCE(et.sword_defense,0) AS sword_defense,
  COALESCE(et.arrow_defense,0) AS arrow_defense,
  COALESCE(et.magic_defense,0) AS magic_defense,
  MIN(90,COALESCE(et.resistant_players,0) + p.jewelry_resist) AS resistant_players
 FROM visible_players p LEFT JOIN equipment_summary es ON es.player_id=p.id LEFT JOIN enchantment_totals et ON et.player_id=p.id ORDER BY p.last_seen DESC LIMIT 80)`;
const CASTLE_PLAYERS_SQL_R59=ACTIVE_PLAYERS_SQL.replaceAll('ORDER BY p.last_seen DESC LIMIT 80','ORDER BY (p.id=?2) DESC,p.last_seen DESC LIMIT 100');
const CASTLE_OWNER_PLAYERS_SQL_R59=CASTLE_PLAYERS_SQL_R59.replaceAll('WHERE (p.last_seen >= ? OR p.id = ?)','WHERE (p.last_seen >= ? OR p.id = ?) AND p.id=?2');
var OWNER_PLAYER_SQL = ACTIVE_PLAYERS_SQL.replace("WHERE (p.last_seen >= ? OR p.id = ?)", "WHERE p.id = ? AND (p.last_seen >= ? OR p.id = ?)").replaceAll("p.specialization, p.skill_four,", "p.specialization, p.skill_four, p.attack_four_at, p.special_guard_until_ms,").replaceAll("p.attack_four_at, p.special_guard_until_ms,", "p.attack_four_at, p.special_guard_until_ms, p.realtime_scope_version,").replace("SELECT p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence","SELECT COALESCE((SELECT json_object('id',s.puzzle_id,'area',s.area,'channel',s.channel,'template',s.template,'choices',json_array(json_object('id','a','shape',(s.template+3-s.correct_slot)%3),json_object('id','b','shape',(s.template+4-s.correct_slot)%3),json_object('id','c','shape',(s.template+5-s.correct_slot)%3)),'expiresAt',s.expires_at,'test',json(CASE WHEN s.test=1 THEN 'true' ELSE 'false' END),'xp',s.xp,'essence',s.essence) FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=p.id AND s.puzzle_id<>'' AND s.expires_at>unixepoch()*1000 AND s.area=p.area AND s.channel=p.channel AND s.scope_version=p.realtime_scope_version AND p.hp>0 AND p.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=p.id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','rune-v2-boss-c4-1')) AND b.hp>0) AND s.config_revision=c.revision AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=p.id) AND (s.test=1 OR c.enabled=1)),'') AS broken_core464, p.id, p.name, p.role, p.is_gm, p.gm_invisible, p.gm_visibility_revision, p.x, p.y, p.position_revision, p.motion_stream_id, p.motion_sequence");
var MONSTERS_SQL = `SELECT id, name, x, y, hp, max_hp, respawn_at, variant, is_boss, despawn_at, spawn_round, area, channel, is_stone, wave_stage, summoned, parent_stone_id
  FROM monsters
  WHERE ((area = ? AND (channel = 0 OR channel = ?)) OR (is_boss = 1 AND loadlab_run_id='') OR id='dragon-world-1')
    AND (summoned = 0 OR hp > 0)
  ORDER BY is_boss, is_stone, id`;
var DROPS_SQL = `SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at
  FROM world_drops WHERE owner_id = ? AND expires_at ${groundLoot30s ? '>' : '>='} ? AND enchantments NOT IN ('__pending__','__profile_pending__')
  AND monster_id NOT LIKE '%-afk-%'
  AND ((? = CASE WHEN monster_id LIKE 'event-%' THEN CASE WHEN json_extract((SELECT config_json FROM event_island_settings444 WHERE id=1),'$.enabled')=1 THEN 'event' ELSE 'bazaar' END WHEN monster_id LIKE 'rune-v2-%' THEN 'rune_v2' WHEN monster_id LIKE 'rune-%' THEN 'rune' WHEN monster_id='dragon-world-1' THEN 'dragon' WHEN monster_id LIKE '%-ancient-%' OR monster_id = 'ancient-boss-1' THEN 'ancient' ELSE 'forest' END AND monster_id != 'dunya-bosu-1' AND monster_id NOT LIKE 'sinsi-tasi-%' AND monster_id NOT LIKE '%-sinsi-%' AND monster_id NOT LIKE 'frozen-%' AND (monster_id LIKE 'event-%' OR monster_id NOT LIKE '%-frozen-%') AND monster_id NOT LIKE '%-black-%')
    OR (? = 'black' AND monster_id LIKE '%-black-%')
    OR (? = 'sanctum' AND monster_id = 'dunya-bosu-1')
    OR (? = 'sinsi' AND (monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'))
    OR (? = 'frozen' AND monster_id NOT LIKE 'event-%' AND (monster_id LIKE 'frozen-%' OR monster_id LIKE '%-frozen-%')))
  ORDER BY expires_at`;
var COMBAT_EVENTS_SQL = `SELECT e.id, e.player_id, e.target_id, e.role, e.ability, e.created_at
  FROM combat_events e JOIN players attacker ON attacker.id = e.player_id JOIN players viewer ON viewer.id = ?
  WHERE e.created_at >= ? AND attacker.channel = viewer.channel AND attacker.area = viewer.area
    AND (attacker.loadlab_run_id = '' OR attacker.loadlab_run_id = viewer.loadlab_run_id)
    AND (attacker.is_gm != 1 OR attacker.gm_invisible != 1 OR attacker.id = viewer.id)
    AND NOT EXISTS (SELECT 1 FROM players target WHERE target.id = e.target_id AND target.is_gm = 1 AND target.gm_invisible = 1 AND target.id != viewer.id)
    AND (viewer.area != 'arena' OR (viewer.arena_match_id != '' AND attacker.arena_match_id = viewer.arena_match_id))
  ORDER BY e.created_at DESC, e.id DESC LIMIT 512`;
var BOSS_LEADERS_SQL = BOSS_LEADERS_SQL476;
function arenaStatements(database, playerId, nowMs) {
	return [
		database.prepare(`SELECT q.mode AS queue_mode, q.team_name AS queue_team_name, q.queued_at_ms,
        CASE WHEN q.player_id IS NULL THEN 0 ELSE (SELECT COUNT(*) FROM arena_queue q2 WHERE q2.room_id = q.room_id AND q2.mode = q.mode AND q2.channel = p.channel AND q2.last_seen_ms >= ?) END AS queue_count,
        CASE WHEN q.player_id IS NULL THEN 0 ELSE 1 + (SELECT COUNT(*) FROM arena_queue q3 WHERE q3.room_id = q.room_id AND q3.mode = q.mode AND q3.channel = p.channel AND q3.last_seen_ms >= ? AND (q3.queued_at_ms < q.queued_at_ms OR (q3.queued_at_ms = q.queued_at_ms AND q3.player_id < q.player_id))) END AS queue_position,
        m.id AS match_id, m.mode, m.status, m.starts_at_ms, m.kill_target, m.team_a_name, m.team_b_name,
        m.team_a_score, m.team_b_score, m.reward_gems, mp.team AS my_team, p.realtime_scope_version AS owner_scope_version
       FROM players p
       LEFT JOIN arena_queue q ON q.player_id = p.id
       LEFT JOIN arena_matches m ON m.id = p.arena_match_id AND m.status IN ('countdown','active')
       LEFT JOIN arena_match_players mp ON mp.match_id = m.id AND mp.player_id = p.id
       WHERE p.id = ? LIMIT 1`).bind(nowMs - ARENA_QUEUE_TTL_MS, nowMs - ARENA_QUEUE_TTL_MS, playerId),
		database.prepare(`SELECT mp.player_id AS id, p.name, p.role, mp.team, mp.slot, mp.kills, mp.deaths
       FROM players viewer
       JOIN arena_match_players mp ON mp.match_id = viewer.arena_match_id
       JOIN players p ON p.id = mp.player_id
       WHERE viewer.id = ? AND viewer.area = 'arena' AND viewer.arena_match_id != ''
       ORDER BY mp.team, mp.slot`).bind(playerId),
		database.prepare(`SELECT m.id AS match_id, m.mode, m.team_a_name, m.team_b_name, m.team_a_score, m.team_b_score,
        m.kill_target, m.winner_team, m.reward_gems, m.finished_at_ms, mp.team AS my_team,
        COALESCE(my_reward.gems, 0) AS my_reward_gems,
        COALESCE(cooldown.last_awarded_at_ms + ?, 0) AS reward_available_at_ms
       FROM arena_match_players mp JOIN arena_matches m ON m.id = mp.match_id
       LEFT JOIN arena_reward_claims my_reward ON my_reward.match_id = m.id AND my_reward.player_id = mp.player_id
       LEFT JOIN pvp_reward_cooldowns cooldown ON cooldown.player_id = mp.player_id AND cooldown.reward_scope = 'arena_win'
       WHERE mp.player_id = ? AND mp.result_seen_at_ms = 0 AND m.status = 'finished' AND m.settlement_token != ''
       ORDER BY m.finished_at_ms DESC LIMIT 1`).bind(PVP_REWARD_COOLDOWN_MS, playerId),
		database.prepare(`SELECT match_id, mode, team_name, message, created_at_ms, expires_at_ms
       FROM arena_announcements WHERE expires_at_ms > ? ORDER BY created_at_ms DESC LIMIT 1`).bind(nowMs),
		database.prepare(ACTIVE_GM_ANNOUNCEMENT_SQL).bind(nowMs),
		database.prepare(`SELECT p.id AS playerId, (p.is_gm = 1 AND p.gm_invisible = 1) AS invisible,
      p.gm_visibility_revision AS visibilityRevision FROM players p JOIN players viewer ON viewer.id = ?
      WHERE p.gm_visibility_revision > 0 AND p.channel = viewer.channel AND p.area = viewer.area
        AND (viewer.area != 'arena' OR p.arena_match_id = viewer.arena_match_id)`).bind(playerId)
	];
}
function arenaPayloadFromResults(results, nowMs) {
	const [contextResult, membersResult, resultResult, announcementResult, gmAnnouncementResult, visibilityResult] = results;
	const context = contextResult.results[0];
	const result = resultResult.results[0];
	return {
		arenaQueue: context?.queue_mode ? {
			mode: context.queue_mode,
			teamName: context.queue_team_name ?? "",
			queuedAtMs: Number(context.queued_at_ms ?? 0),
			queuedCount: Number(context.queue_count ?? 0),
			position: Number(context.queue_position ?? 0)
		} : null,
		arenaMatch: context?.match_id ? {
			id: context.match_id,
			mode: context.mode,
			status: context.status === "countdown" && Number(context.starts_at_ms) <= nowMs ? "active" : context.status,
			startsAtMs: Number(context.starts_at_ms ?? 0),
			killTarget: Number(context.kill_target ?? 0),
			teamAName: context.team_a_name ?? "Takım A",
			teamBName: context.team_b_name ?? "Takım B",
			teamAScore: Number(context.team_a_score ?? 0),
			teamBScore: Number(context.team_b_score ?? 0),
			rewardGems: Number(context.reward_gems ?? 0),
			myTeam: Number(context.my_team ?? 0),
      ownerScopeVersion: Number(context.owner_scope_version ?? 0),
			members: membersResult.results
		} : null,
		arenaResult: result ? {
			matchId: String(result.match_id ?? ""),
			mode: String(result.mode ?? "1v1"),
			teamAName: String(result.team_a_name ?? "Takım A"),
			teamBName: String(result.team_b_name ?? "Takım B"),
			teamAScore: Number(result.team_a_score ?? 0),
			teamBScore: Number(result.team_b_score ?? 0),
			killTarget: Number(result.kill_target ?? 0),
			winnerTeam: Number(result.winner_team ?? 0),
			myTeam: Number(result.my_team ?? 0),
			rewardEnabled: Number(result.reward_gems ?? 0) > 0,
			rewardGems: Number(result.winner_team) === Number(result.my_team) ? Number(result.my_reward_gems ?? 0) : 0,
			rewardGranted: Number(result.winner_team) === Number(result.my_team) && Number(result.my_reward_gems ?? 0) > 0,
			rewardAvailableAtMs: Number(result.winner_team) === Number(result.my_team) ? Number(result.reward_available_at_ms ?? 0) : 0,
			finishedAtMs: Number(result.finished_at_ms ?? 0)
		} : null,
		globalAnnouncement: announcementResult.results[0] ?? null,
		gmAnnouncement: gmAnnouncementResult.results[0] ?? null,
		playerVisibility: visibilityResult.results
	};
}
async function worldBatch(database, playerId, nowMs, statements, projectPlayers = false, roomRoster = false) {
	const snapshotStartedAtMs = Date.now();
	const queries = [...statements, ...arenaStatements(database, playerId, nowMs)];
	const native = database;
	const results = await (native.readWorldSnapshot ? native.readWorldSnapshot(queries, projectPlayers ? { projection: {
		playersIndex: 1,
		ownerId: playerId,
		roomRoster
	} } : void 0) : database.batch(queries));
	return {
		playersProjected: results.playersProjected === true,
		snapshotAtMs: results.snapshotAtMs ?? snapshotStartedAtMs,
		snapshot: results.slice(0, statements.length),
		arenaPayload: arenaPayloadFromResults(results.slice(statements.length), nowMs)
	};
}
async function readColdWorld(database,{auth,nowMs,starterReward}){const playerId=auth.player.id,now=Math.floor(nowMs/1000),requestStartedAtMs=nowMs,ownerOnly=false,compact=false,combat=false,internal465=false,mark=()=>{};const respond=async data=>{
   let friends487=null;
   if(!compact&&!combat&&!ownerOnly&&playerId)data={...data,cauldron488:globalThis.__colCauldron488.compact(playerId,data.settings)};
   if(!compact&&!combat&&!ownerOnly&&playerId){friends487=await readFriends487(database,playerId);data={...data,friends:friendsView487(friends487,now),friendRequests:await readFriendRequests490(database,playerId)};if(internal465&&database.worldPush?.subscribers.has(playerId))database.worldPush.seedFriends487(playerId,friends487);}
   const decorateStartedR15 = performance.now();
   // V502: last 20 durable public world messages survive entry; other scopes retain their existing entry fences.
   if(Array.isArray(data.chat))data={...data,chat:data.chat.filter(message=>message.scope==='world'||message.id>(auth.gamePresence?.chatAfterId??0))};
      if(data.area==='arena'&&data.arenaMatch&&Number.isSafeInteger(data.arenaMatch.ownerScopeVersion)&&Array.isArray(data.players))data={...data,players:data.players.map(p=>p.id===playerId?{...p,realtime_scope_version:data.arenaMatch.ownerScopeVersion}:p)};
   if(!combat&&!ownerOnly&&playerId&&Array.isArray(data.players)){const ownCore464=await database.prepare("SELECT COALESCE((SELECT json_object('id',s.puzzle_id,'area',s.area,'channel',s.channel,'template',s.template,'choices',json_array(json_object('id','a','shape',(s.template+3-s.correct_slot)%3),json_object('id','b','shape',(s.template+4-s.correct_slot)%3),json_object('id','c','shape',(s.template+5-s.correct_slot)%3)),'expiresAt',s.expires_at,'test',json(CASE WHEN s.test=1 THEN 'true' ELSE 'false' END),'xp',s.xp,'essence',s.essence) FROM broken_core_state464 s JOIN broken_core_settings464 c ON c.id=1 WHERE s.player_id=p.id AND s.puzzle_id<>'' AND s.expires_at>unixepoch()*1000 AND s.area=p.area AND s.channel=p.channel AND s.scope_version=p.realtime_scope_version AND p.hp>0 AND p.arena_match_id='' AND NOT EXISTS(SELECT 1 FROM dungeon_members WHERE player_id=p.id) AND NOT EXISTS(SELECT 1 FROM pve_engagements e JOIN monsters b ON b.id=e.monster_id WHERE e.player_id=p.id AND (b.is_boss=1 OR b.id='frozen-boss-1' OR b.id='ancient-boss-1' OR b.id='dragon-world-1' OR b.id LIKE 'frozen-water-c%' OR b.id IN ('rune-v2-boss-c1-1','rune-v2-boss-c2-1','rune-v2-boss-c3-1','rune-v2-boss-c4-1')) AND b.hp>0) AND s.config_revision=c.revision AND NOT EXISTS(SELECT 1 FROM guild_members gm JOIN guild_war_locks gl ON gl.guild_id=gm.guild_id WHERE gm.player_id=p.id) AND (s.test=1 OR c.enabled=1)),'') AS broken_core464 FROM players p WHERE p.id=?").bind(playerId).first();data={...data,players:data.players.map(p=>p.id===playerId?{...p,broken_core464:ownCore464?.broken_core464??""}:p)};}
   data={...data,maintenance438:globalThis.__colRealm?.maintenance?.view(auth.account.id)??null,maintenanceRevision491:globalThis.__colRealm?.maintenance?.policy?.revision??0};
   if (data.settings) data = {...data,halloweenEvent456:halloweenEventView456(data.settings.events_json),settings:colDecor453.projectSettings(data.settings,data.area,data.arenaMatch?.id)};

return data;};const viewer = playerId ? await database.prepare("SELECT p.channel, p.area, p.arena_match_id, pm.party_id FROM players p LEFT JOIN party_members pm ON pm.player_id = p.id WHERE p.id = ?").bind(playerId).first() : null;
		const channel = viewer?.channel ?? 1;
		const area = viewer?.area ?? "bazaar";
		const regionalArea = area === "arena" && viewer?.arena_match_id ? `arena:${viewer.arena_match_id}` : area;
const membership = viewer?.party_id ? { party_id: viewer.party_id } : null;
		const playerQuery = database.prepare(ownerOnly ? OWNER_PLAYER_SQL : castleEnabled()&&channel===4?(['guild_castle','bazaar'].includes(area)?CASTLE_OWNER_PLAYERS_SQL_R59:CASTLE_PLAYERS_SQL_R59):ACTIVE_PLAYERS_SQL).bind(...ownerOnly ? [playerId] : [], now - 30, playerId, channel, area, playerId, playerId);
		const { snapshot: [world, players, monsters, leaders, chat, directMessages, drops, inventory, storageItems, stones, pets, dungeonMaterials, dungeonWings, online, shops, listings, partyMembers, partyInvite, combatEvents, settingsResult, economySettingsResult, combatSettingsResult, bossLeaders, regionalMessages, marketPricesResult], arenaPayload, snapshotAtMs, playersProjected } = await worldBatch(database, playerId, nowMs, [
			database.prepare("SELECT health, updated_at, layout_version, cycle, reset_at, guardian_reward_at FROM world_state WHERE id = 1"),
			playerQuery,
			database.prepare(MONSTERS_SQL).bind(area, channel),
			database.prepare(area === "war" ? "SELECT p.name,p.role,COUNT(*) AS contribution FROM war_kill_claims k JOIN players p ON p.id=k.killer_id WHERE p.loadlab_run_id = '' AND k.created_at_ms >= (CAST(strftime('%s','now','+3 hours','start of day','-3 hours') AS INTEGER)*1000) GROUP BY p.id ORDER BY contribution DESC,p.name ASC LIMIT 5" : "SELECT name, role, contribution FROM players WHERE loadlab_run_id = '' AND contribution > 0 ORDER BY contribution DESC, name ASC LIMIT 5"),
			database.prepare(WORLD_CHAT_SQL).bind(regionalArea, channel, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare(`SELECT m.id, m.player_id, m.player_name, m.recipient_id, m.item_snapshot, m.body, m.created_at,
          COALESCE(recipient.name, '') AS recipient_name FROM messages m
          LEFT JOIN players recipient ON recipient.id = m.recipient_id
          LEFT JOIN direct_message_dismissals dismissal
            ON dismissal.player_id = ?
           AND dismissal.peer_id = CASE WHEN m.player_id = ? THEN m.recipient_id ELSE m.player_id END
         WHERE m.recipient_id IS NOT NULL AND (m.player_id = ? OR m.recipient_id = ?)
           AND m.id > COALESCE(dismissal.dismissed_through_id, 0) AND m.id > ?
         ORDER BY m.id DESC LIMIT 40`).bind(playerId, playerId, playerId, playerId, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare(DROPS_SQL).bind(playerId, now, area, area, area, area, area),
			database.prepare("SELECT id, player_id, kind, item_name, rarity, power, role, enchantments, equipped, created_at, expires_at_ms, sale_locked499 FROM player_items WHERE player_id = ? ORDER BY equipped DESC, CASE rarity WHEN 'emerald' THEN 7 WHEN 'infinite' THEN 6 WHEN 'unique' THEN 5 WHEN 'purple' THEN 4 WHEN 'red' THEN 3 WHEN 'orange' THEN 2 WHEN 'blue' THEN 1 ELSE 0 END DESC, created_at DESC").bind(playerId),
			database.prepare("SELECT id, player_id, slot, kind, item_name, rarity, power, role, enchantments, created_at FROM player_storage_items WHERE player_id = ? ORDER BY slot").bind(playerId),
			database.prepare("SELECT kind,amount FROM player_stones WHERE player_id=? ORDER BY kind").bind(playerId),
			database.prepare("SELECT kind,name,equipped,acquired_at FROM player_pets WHERE player_id=? AND acquired_at+(CASE WHEN kind='starter' THEN 259200 ELSE 604800 END)>unixepoch() ORDER BY acquired_at").bind(playerId),
			database.prepare("SELECT kind,amount FROM dungeon_materials WHERE player_id=?").bind(playerId),
			database.prepare("SELECT equipped FROM dungeon_wings WHERE player_id=?").bind(playerId),
			database.prepare("SELECT COUNT(*) AS count FROM players WHERE last_seen >= ?").bind(now - 30),
			database.prepare(`SELECT id, owner_id, owner_name, name, x, y, channel, active, created_at, (SELECT stall_skin_enabled FROM players WHERE players.id=market_shops.owner_id) AS stall_skin_enabled, ((SELECT COUNT(*) FROM market_listings WHERE shop_id=market_shops.id)+(SELECT COUNT(*) FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)))) AS stock_count502
         FROM market_shops
         WHERE channel = ? AND active = 1 AND created_at>CAST(strftime('%s','now') AS INTEGER)-172800
           AND (owner_id = ? OR EXISTS (SELECT 1 FROM market_listings WHERE shop_id = market_shops.id) OR EXISTS(SELECT 1 FROM premium_listings WHERE seller_id=market_shops.owner_id AND (product NOT IN ('weapon_skin','teleport_skin') OR json_extract(payload,'$.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER)) AND (product!='costume' OR json_extract(payload,'$.item.expires_at_ms')>CAST((julianday('now')-2440587.5)*86400000 AS INTEGER))))
         ORDER BY created_at`).bind(channel, playerId),
			database.prepare(MARKET_LISTINGS_SQL),
			database.prepare(`SELECT p.id, p.name, p.role, p.hp, p.max_hp, p.level, p.area, p.channel, p.last_seen, p.x, p.y, p.arena_match_id, p.movement_checked_at_ms, p.last_monster_hit_at, party.leader_id
         FROM party_members pm JOIN players p ON p.id = pm.player_id JOIN parties party ON party.id = pm.party_id
         WHERE pm.party_id = ? ORDER BY pm.joined_at`).bind(membership?.party_id ?? ""),
			database.prepare(`SELECT pi.sender_id, p.name AS sender_name, pi.created_at FROM party_invites pi
         JOIN players p ON p.id = pi.sender_id WHERE pi.recipient_id = ? AND pi.created_at >= ?`).bind(playerId, now - 120),
			database.prepare(COMBAT_EVENTS_SQL).bind(playerId, requestStartedAtMs - 2200),
			database.prepare(GAME_SETTINGS_SQL),
			database.prepare(ECONOMY_SETTINGS_SQL),
			database.prepare(COMBAT_SETTINGS_SQL),
			database.prepare(BOSS_LEADERS_SQL),
			database.prepare(REGIONAL_CHAT_SQL).bind(regionalArea, channel, now - 5, auth.gamePresence?.chatAfterId ?? 0),
			database.prepare("SELECT prices_json FROM premium_shop_settings WHERE id=1")
		], true, !ownerOnly);
		const worldRow = world.results[0];
		const onlineRow = online.results[0];
		const settings = {
			...DEFAULT_SETTINGS,
			...settingsResult.results[0] ?? {},
			...economySettingsResult.results[0] ?? {},
			...combatSettingsResult.results[0] ?? {}
		};
		const boss = monsters.results.find((entry) => Number(entry.is_boss) === 1 && !colLabIsMonster(entry.id));
		mark("snapshot");
		return respond({
			serverTime: now,
			snapshotAtMs,
			world: worldRow ?? {
				health: 64,
				updated_at: now,
				layout_version: 17,
				cycle: 1,
				reset_at: 0,
				guardian_reward_at: now + 3600
			},
			players: playersProjected ? players.results : withRankPlayers(players.results, playerId),
			eventIsland:globalThis.__colEventIsland444?.public(channel)??{enabled:false,activeKinds:[]},
 runeBonusPerLevel:globalThis.__colRunes?.settings().config.bonusPerLevel??.2,runeV2:{enabled:globalThis.__colRuneV2?.settings().config.enabled===true,revision:globalThis.__colRuneV2?.settings().revision??0},
 ranks: rankService()?.settings() ?? null,
			dragon: dragonService()?.settings() ?? null,
			monsters: monsters.results.filter(m=>colLabCanSeeMonster(playerId,m)),
			drops: dragonService()?.describeDrops?.(drops.results) ?? drops.results,
			premiumPrices: parseMarketPrices(marketPricesResult.results[0]?.prices_json),
			inventory: inventory.results,
			storageItems: storageItems.results,
			stones: stones.results,
			pets: pets.results,
			starterReward: starterReward,
			dungeonMaterials: dungeonMaterials.results,
			dungeonWings: dungeonWings.results[0] ?? null,
			shops: shops.results,
			listings: listings.results,
			leaders: leaders.results,
			...stoneBossFields476(bossLeaders.results,area,channel,monsters.results,playerId),
			regionalMessages: regionalMessages.results,
			chat: [...chat.results].reverse(),
			directMessages: [...directMessages.results].reverse(),
			party: partyView486(membership?.party_id,partyMembers.results,playerId,now),
			partyInvite: partyInvite.results[0] ?? null,
			combatEvents: combatEvents.results.filter(e=>colLabCanSeeCombat(playerId,e)).reverse(),
			channel,
			area,
			totalOnline: onlineRow?.count ?? players.results.length,
			bossNextAt: boss && Number(boss.hp) <= 0 ? Number(boss.respawn_at) : 0,
			bossEndsAt: boss && Number(boss.hp) > 0 ? Number(boss.despawn_at) : 0,
			...arenaPayload,
			partial: false,
			ownerOnly,
			settings
		});
}
return {readColdWorld,readFriends487,arenaStatements,arenaPayloadFromResults,withRankPlayers};}
