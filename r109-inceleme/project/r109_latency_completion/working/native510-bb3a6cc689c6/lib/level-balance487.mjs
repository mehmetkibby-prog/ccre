import {materialLevelItem498} from './material-level498.mjs';
// Configuration only changes earned PvE experience and eligible monster loot.
// No database access, timer, network request or random draw occurs in this module.
export const BALANCE_MAPS487=Object.freeze([
 ['forest','Kuzey Ormanı'],['frozen','Donmuş Çam Geçidi'],['black','Kara Bölge'],
 ['ancient','Kadim Kök Vadisi'],['sinsi','Sinsi Taş Vadisi'],['sanctum','Dünya Bossu'],
 ['dragon','Ejderha'],['afk','Oto Av Adası'],['rune','Kadim Rün Sahili'],
 ['rune_v2','Karanlık Rün Sahili'],['event','Etkinlik Adası'],['dungeon','Çekirdeğin Kalbi'],['solo','Solo Zindan']
]);
export const BALANCE_PROTECTED487=Object.freeze(['essence','strong_branch','strong_crystal','desert_plant','master_scroll']);
const protectedKinds=new Set(BALANCE_PROTECTED487),areas=new Set(BALANCE_MAPS487.map(r=>r[0]));
const plain=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const integer=(v,a,b)=>Number.isSafeInteger(v)&&v>=a&&v<=b;
export function defaultBalance487(legacy={}){
 const from=integer(legacy.forest_after_level,0,64)?legacy.forest_after_level+1:31;
 const percent=integer(legacy.forest_reduction_percent,0,100)?100-legacy.forest_reduction_percent:70;
 return {version:1,enabled:false,rules:Object.fromEntries(BALANCE_MAPS487.map(([area])=>[area,{fromLevel:area==='forest'?from:area==='frozen'?40:area==='black'?50:65,xpPercent:100,itemPercent:['forest','frozen','black'].includes(area)?percent:100}]))};
}
export function validateBalance487(input){
 if(!plain(input)||input.version!==1||typeof input.enabled!=='boolean'||!plain(input.rules)||Object.keys(input.rules).length!==areas.size||Object.keys(input.rules).some(k=>!areas.has(k)))throw Error('Seviye dengesi: tüm haritaların ayarlarını kontrol et.');
 const rules={};
 for(const[area]of BALANCE_MAPS487){const r=input.rules[area];if(!plain(r)||Object.keys(r).some(k=>!['fromLevel','xpPercent','itemPercent'].includes(k))||!integer(r.fromLevel,1,65)||!integer(r.xpPercent,0,100)||!integer(r.itemPercent,0,100))throw Error('Seviye ve yüzdeler tam sayı olmalı: seviye 1–65, oranlar 0–100.');rules[area]={fromLevel:r.fromLevel,xpPercent:r.xpPercent,itemPercent:r.itemPercent};}
 return {version:1,enabled:input.enabled,rules};
}
const cache=new WeakMap();
export function balanceFromSettings487(settings={}){
 if(cache.has(settings))return cache.get(settings);
 let value;try{const raw=JSON.parse(settings.events_json||'{}');value=raw.highLevelBalance487?validateBalance487(raw.highLevelBalance487):defaultBalance487(settings);}catch{value=defaultBalance487(settings);}
 for(const r of Object.values(value.rules))Object.freeze(r);Object.freeze(value.rules);Object.freeze(value);cache.set(settings,value);return value;
}
// A defeat without a policy snapshot predates this feature and keeps its old odds.
export function balanceFromSnapshot487(rates){
 try{const value=rates?.highLevelBalance487;if(!value)return null;
  if(Object.hasOwn(value,'area')){const r=value.rule;if(value.version!==1||typeof value.enabled!=='boolean'||!areas.has(value.area)||!plain(r)||!integer(r.fromLevel,1,65)||!integer(r.xpPercent,0,100)||!integer(r.itemPercent,0,100))return null;return {version:1,enabled:value.enabled,rules:{[value.area]:r}};}
  return validateBalance487(value);
 }catch{return null;}
}
export function balanceSnapshot487(settings,area){const config=balanceFromSettings487(settings);return areas.has(area)?{version:1,enabled:config.enabled,area,rule:config.rules[area],materialLevel498:1}:null;}
export function balanceArea487(subject={},sourceKey=''){
 const raw=subject.monster_area??subject.area;if(areas.has(raw))return raw;
 const id=String(subject.monster_id??subject.id??'');if(id.startsWith('event-'))return 'event';
 if(id==='dragon-world-1')return 'dragon';if(id==='dunya-bosu-1')return 'sanctum';
 if(id.startsWith('frozen-')||id.includes('-frozen-'))return 'frozen';if(id.startsWith('ancient-'))return 'ancient';
 if(id.startsWith('stone-boss-black-')||id.includes('-black-'))return 'black';if(id.includes('-afk-'))return 'afk';
 const key=String(sourceKey||subject.loot_source_key||'');if(key==='boss.world')return 'sanctum';if(key.startsWith('boss.frozen'))return 'frozen';if(key==='boss.ancient')return 'ancient';if(key==='boss.black_stone')return 'black';
 const area=key.split('.')[0];return areas.has(area)?area:'';
}
export function balanceFactor487(config,area,level,kind='item'){
 const r=config?.enabled&&config.rules?.[area];return r&&Number(level)>=r.fromLevel?r[kind==='xp'?'xpPercent':'itemPercent']/100:1;
}
export function balanceXpSql487(settings,subject,monsterId){
 let config=balanceFromSettings487(settings);
 if(subject&&typeof subject.events_snapshot==='string'){try{config=balanceFromSnapshot487(JSON.parse(subject.events_snapshot||'{}'));}catch{config=null;}}
 if(!config?.enabled)return '1';const area=balanceArea487(subject??{id:monsterId}),r=config.rules[area];
 return r&&r.xpPercent!==100?`(CASE WHEN p.level>=${r.fromLevel} THEN ${r.xpPercent}/100.0 ELSE 1 END)`:'1';
}
export function protectedLoot487(item,materialLevel498=false){
 if(!item)return false;const kind=typeof item==='string'?item:item.kind;
 return protectedKinds.has(kind)||(materialLevel498&&materialLevelItem498(item))||item.type==='rank'||(item.type==='resource'&&['gems','core_coins','gold','essence'].includes(item.column??kind));
}
export function scaleLootGroups487(groups,multiplier=1,guaranteedGear=false,materialLevel498=false){
 if(multiplier===1)return groups;
 return groups.map(group=>{const outcomes=group.outcomes.map(o=>protectedLoot487(o.item,materialLevel498)||(guaranteedGear&&o.item.type==='gear')?o:{...o,effectiveChancePpm:Math.round(o.effectiveChancePpm*multiplier)});return {...group,outcomes,effectiveTotalChancePpm:outcomes.reduce((n,o)=>n+o.effectiveChancePpm,0)};});
}
export function catalogMultiplier487(item,multiplier=1,materialLevel498=false){return protectedLoot487(item,materialLevel498)?1:multiplier;}
