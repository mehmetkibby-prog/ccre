import {RUNE_MOBS,RUNE_SPAWNS,RUNE_LOOT_LABELS,defaultRuneConfig,runeWalkable} from './runes.mjs';
export const RUNE_V2_AREA='rune_v2';
export const RUNE_V2_MOBS=Object.freeze([...RUNE_MOBS.map(m=>Object.freeze({...m})),Object.freeze({key:'boss',name:'Karanlık Rün Yırtıcısı',count:1,hp:26000,damage:20,xp:500})]);
export const RUNE_V2_LOOT_LABELS=Object.freeze({...RUNE_LOOT_LABELS});
export const RUNE_V2_BOSS_SPAWN=Object.freeze({x:2240,y:680});
export const RUNE_V2_SPAWNS=Object.freeze([...RUNE_SPAWNS.map(s=>Object.freeze({...s})),Object.freeze({key:'boss',slot:1,...RUNE_V2_BOSS_SPAWN})]);
if(!RUNE_V2_SPAWNS.every(s=>runeWalkable(s.x,s.y)))throw Error('Karanlık Rün Sahili doğma noktası geçersiz.');
export const isRuneV2Boss=id=>typeof id==='string'&&/^rune-v2-boss-c[1-3]-1$/.test(id);
export function runeV2MonsterKey(monster){if(monster?.area!==RUNE_V2_AREA)return null;return isRuneV2Boss(monster.id)?'boss':String(monster.id).match(/^rune-v2-(tide|warden|sentinel|wraith)-c[1-3]-[1-5]$/)?.[1]??null;}
export function defaultRuneV2Config(){const original=defaultRuneConfig();return {enabled:true,monsters:Object.fromEntries(RUNE_V2_MOBS.map(m=>[m.key,{...(original.monsters[m.key]??original.monsters.warden),name:m.name,hp:m.hp,damage:m.damage,xp:m.xp,respawnSeconds:m.key==='boss'?600:30,...(m.key==='boss'?{topDamageGems:250,waveDamage:20,waveCooldownSeconds:12}:{}),loot:structuredClone(original.monsters[m.key]?.loot??original.monsters.warden.loot)}]))};}
export function validateRuneV2Config(input){
 if(!input||typeof input.enabled!=='boolean'||!input.monsters||Array.isArray(input.monsters))throw Error('Karanlık Rün Sahili ayarları geçersiz.');
 const out={enabled:input.enabled,monsters:{}};
 for(const m of RUNE_V2_MOBS){const v=input.monsters[m.key];if(!v||typeof v.name!=='string'||!v.name.trim()||v.name.trim().length>60||/[\u0000-\u001f\u007f]/u.test(v.name))throw Error(m.name+': canavar adı geçersiz.');
  const row={name:v.name.trim(),hp:v.hp,damage:v.damage,xp:v.xp,respawnSeconds:v.respawnSeconds,loot:{}};
  if(m.key==='boss'){row.topDamageGems=Object.hasOwn(v,'topDamageGems')?v.topDamageGems:250;if(!Number.isSafeInteger(row.topDamageGems)||row.topDamageGems<0||row.topDamageGems>1000000)throw Error('Boss en çok hasar ödülü geçersiz.');row.waveDamage=Object.hasOwn(v,'waveDamage')?v.waveDamage:20;row.waveCooldownSeconds=Object.hasOwn(v,'waveCooldownSeconds')?v.waveCooldownSeconds:12;if(!Number.isSafeInteger(row.waveDamage)||row.waveDamage<0||row.waveDamage>1000000)throw Error('Karanlık Rün Dalgası hasarı 0–1.000.000 arasında tam sayı olmalı.');if(!Number.isSafeInteger(row.waveCooldownSeconds)||row.waveCooldownSeconds<3||row.waveCooldownSeconds>86400)throw Error('Karanlık Rün Dalgası bekleme süresi 3–86.400 saniye arasında tam sayı olmalı.');}
  for(const[k,min,max]of [['hp',1,10000000],['damage',0,1000000],['xp',0,1000000],['respawnSeconds',1,86400]])if(!Number.isSafeInteger(row[k])||row[k]<min||row[k]>max)throw Error(m.name+': '+k+' ayarı geçersiz.');
  for(const k of Object.keys(RUNE_V2_LOOT_LABELS)){const r=v.loot?.[k];if(!r||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['white','blue','orange','red','purple','emerald'].includes(k)?3:100))throw Error(m.name+': '+RUNE_V2_LOOT_LABELS[k]+' oranı veya miktarı geçersiz.');row.loot[k]={chance:r.chance,min:r.min,max:r.max};}
  if(Object.keys(v.loot??{}).some(k=>!Object.hasOwn(RUNE_V2_LOOT_LABELS,k)))throw Error('Bilinmeyen Karanlık Rün Sahili ganimeti.');out.monsters[m.key]=row;
 }if(Object.keys(input.monsters).some(k=>!RUNE_V2_MOBS.some(m=>m.key===k)))throw Error('Bilinmeyen Karanlık Rün Sahili canavarı.');return out;
}
