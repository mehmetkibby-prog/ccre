import {SOLO_CATALOG} from '../../../native510-bb3a6cc689c6/lib/solo-dungeon.mjs';
import {createMistConfigCacheR56} from './mist-config-cache-r56.mjs';
export const MIST_MAPS=Object.freeze({forest:'Kuzey Ormanı',frozen:'Donmuş Geçit',black:'Kara Bölge',ancient:'Kadim Orman',rune:'Rün Vadisi',rune_v2:'Karanlık Rün Sahili',sinsi:'Sinsi Taş Bölgesi'});
export const MIST_KINDS=Object.freeze({claw:'Sis Pençesi',guard:'Kayıp Nöbetçi',spirit:'Solgun Ruh',seal:'Sis Mührü',keeper:'Sis Bekçisi',rare:'Gezgin Sis Avcısı',gold:'Altın Sis Muhafızı'});
export const MIST_CHEST=Object.freeze({id:'mist:chest',kind:'mist_chest',name:'Sis Sandığı',type:'mistChest'});
export const MIST_CATALOG=Object.freeze([...SOLO_CATALOG]);
const drop=(itemId,chance=100,min=1,max=min)=>({itemId,chance,min,max});
const baseReward=()=>[{itemId:'resource:essence',chance:100,min:5,max:10}].filter(r=>MIST_CATALOG.some(i=>i.id===r.itemId));
const enemy=(hp,damage,xp,gems=0,count=1)=>({hp,damage,xp,gems,essence:3,count,speed:110,attackMs:1800,drops:baseReward()});
export const MIST_DEFAULTS=Object.freeze({enabled:true,revision:1,minLevel:1,chancePercent:.3,goldChancePercent:5,portalSeconds:45,durationSeconds:600,maxPlayers:4,maxActivePerChannel:8,killCooldownSeconds:120,
 maps:['forest','frozen'],xpMultiplier:1.2,essenceMultiplier:1.2,scale:{level:.035,hp:.00015,attack:.012,maximum:20},
 objectives:{clear:true,seals:true,hunt:true},enemies:{claw:enemy(220,7,30,0,6),guard:enemy(340,14,40,0,4),spirit:enemy(480,18,55,0,3),seal:enemy(900,0,0,0,3),keeper:enemy(7000,45,500,10),rare:enemy(4500,32,350,5),gold:enemy(12000,65,900,20)},chest:baseReward(),goldChest:baseReward()});
const int=(v,min,max,name)=>{if(!Number.isSafeInteger(v)||v<min||v>max)throw Error(name+' geçersiz.');return v;};
const num=(v,min,max,name)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error(name+' geçersiz.');return v;};
export function validateMistDrops(rows){
 if(!Array.isArray(rows)||rows.length>16)throw Error('Ödül tablosu en fazla 16 satır olabilir.');const ids=new Set();
 return rows.map(r=>{const item=MIST_CATALOG.find(i=>i.id===r?.itemId);if(!item||String(item.id).startsWith('tower:')||ids.has(item.id))throw Error('Geçersiz/tekrarlanan Sis Yarığı ödülü.');ids.add(item.id);const stack=['resource','material','stone'].includes(item.type);return {itemId:item.id,chance:num(r.chance,0,100,'Düşme oranı'),min:int(r.min,1,stack?1000:1,'Miktar'),max:int(r.max,r.min,stack?1000:1,'Miktar')};});
}
export function validateMistConfig(c){
 if(!c||typeof c.enabled!=='boolean')throw Error('Sis Yarığı açık/kapalı ayarı geçersiz.');
 const out={enabled:c.enabled,revision:int(c.revision??1,1,Number.MAX_SAFE_INTEGER,'Sürüm'),minLevel:int(c.minLevel,1,100,'Asgari seviye'),chancePercent:num(c.chancePercent,0,100,'Portal olasılığı'),goldChancePercent:num(c.goldChancePercent,0,100,'Altın portal olasılığı'),portalSeconds:int(c.portalSeconds,5,300,'Portal süresi'),durationSeconds:int(c.durationSeconds,60,3600,'Harita süresi'),maxPlayers:int(c.maxPlayers,1,4,'Oyuncu sınırı'),maxActivePerChannel:int(c.maxActivePerChannel,1,25,'Eşzamanlı yarık'),killCooldownSeconds:int(c.killCooldownSeconds,0,3600,'Portal aralığı'),xpMultiplier:num(c.xpMultiplier,0,10,'Tecrübe çarpanı'),essenceMultiplier:num(c.essenceMultiplier,0,10,'Öz çarpanı')};
 if(!Array.isArray(c.maps)||!c.maps.length||c.maps.some(m=>!Object.hasOwn(MIST_MAPS,m))||new Set(c.maps).size!==c.maps.length)throw Error('Portal haritaları geçersiz.');out.maps=[...c.maps];
 out.scale={level:num(c.scale?.level,0,1,'Seviye ölçeği'),hp:num(c.scale?.hp,0,.1,'Can ölçeği'),attack:num(c.scale?.attack,0,1,'Saldırı ölçeği'),maximum:num(c.scale?.maximum,1,100,'Ölçek üst sınırı')};
 out.objectives={};for(const kind of ['clear','seals','hunt']){if(typeof c.objectives?.[kind]!=='boolean')throw Error('Görev seçimi geçersiz.');out.objectives[kind]=c.objectives[kind];}if(!Object.values(out.objectives).some(Boolean))throw Error('En az bir görev açık olmalı.');
 out.enemies={};for(const kind of Object.keys(MIST_KINDS)){const e=c.enemies?.[kind];if(!e)throw Error('Düşman ayarı eksik: '+kind);out.enemies[kind]={hp:int(e.hp,1,100000000,'Can'),damage:int(e.damage,0,1000000,'Hasar'),xp:int(e.xp,0,1000000,'Tecrübe'),gems:int(e.gems,0,100000,'Mücevher'),essence:int(e.essence,0,100000,'Öz'),count:int(e.count,1,kind==='seal'?3:30,'Sayı'),speed:int(e.speed,0,240,'Hız'),attackMs:int(e.attackMs,600,60000,'Saldırı süresi'),drops:validateMistDrops(e.drops)};}
 out.enemies.seal.count=3;out.chest=validateMistDrops(c.chest);out.goldChest=validateMistDrops(c.goldChest);return out;
}
const readCachedMistConfigR56=createMistConfigCacheR56(raw=>validateMistConfig(JSON.parse(raw)));
export function readMistConfig(raw){return raw==null?structuredClone(MIST_DEFAULTS):typeof raw==='string'?readCachedMistConfigR56(raw):validateMistConfig(raw);}
export function mistScale(config,player){return Math.min(config.scale.maximum,1+Math.max(0,player.level-1)*config.scale.level+Math.max(0,player.max_hp)*config.scale.hp+Math.max(0,player.attack??0)*config.scale.attack);}
