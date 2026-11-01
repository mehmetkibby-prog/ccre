import {normalizeEventQueue499,eventOccurrence499,eventDisplay499,appendEvent499,stopEvent499,retainEventQueues499} from './event-queue499.mjs';
function defaultFishingCatch482(){return {pearl:12,red_pearl:8,talisman:10,sokan:30,levrek:20,zargana:20};}
function validateFishingCatch482(input){
 const keys=['pearl','red_pearl','talisman','sokan','levrek','zargana'];
 if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length!==keys.length||Object.keys(input).some(key=>!keys.includes(key)))throw Error('Altı av ödülünün oranını gir.');
 const next={};let total=0;
 for(const key of keys){const value=input[key];if(typeof value!=='number'||!Number.isFinite(value)||value<0||value>100||Math.abs(value*100-Math.round(value*100))>0.000001)throw Error('Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.');next[key]=value;total+=Math.round(value*100);}
 if(total!==10000)throw Error('Yakalama oranlarının toplamı %100 olmalı.');
 return next;
}
function readFishingCatch482(raw){try{const value=typeof raw==='string'?JSON.parse(raw):raw;return validateFishingCatch482(value?.fishingCatchWeights482??defaultFishingCatch482());}catch{return defaultFishingCatch482();}}
import * as colSpecialistSkills459 from './specialist-skills459.mjs';
export const EVENT_KINDS = ['loot','xp','essence','chest','moonlight','fishing','halloween'];
export const EVENT_LABELS = {loot:'Ganimet Bereketi',xp:'Tecrübe Bereketi',essence:'Öz Bereketi',chest:'Kristal Sandığı',moonlight:'Ayışığı Sandığı',fishing:'Balıkçılık Etkinliği',halloween:'Cadılar Bayramı'};
export const CHEST_PRIZES = [
 {id:'pearl',label:'Beyaz İnci',weight:2}, {id:'potion',label:'Kırmızı İksir',weight:20},
 {id:'weapon',label:'Turuncu Silah',weight:1}, {id:'armor',label:'Turuncu Zırh',weight:1},
 {id:'essence5',label:'5 Öz',weight:20}, {id:'essence8',label:'8 Öz',weight:15},
 {id:'essence10',label:'10 Öz',weight:15}, {id:'essence15',label:'15 Öz',weight:10},
 {id:'essence20',label:'20 Öz',weight:6}, {id:'sokan',label:'Sokan Balığı',weight:10},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:0.1},
 {id:'red_pearl',label:'Kırmızı İnci',weight:0.1},
];
export const MOONLIGHT_PRIZES = [
 {id:'essence20',label:'20 Yaşam Özü',weight:30},{id:'potions5',label:'5 Kırmızı İksir',weight:25},
 {id:'dust5',label:'5 Taş Tozu',weight:20},{id:'gems20',label:'20 Mücevher',weight:15},
 {id:'wing',label:'Kanat Parçası',weight:1},{id:'pearl',label:'Beyaz İnci',weight:2},
 {id:'dragon',label:'Ejderha Parçası',weight:.6},{id:'necklace',label:'Kırmızı Kolye · rastgele efsun',weight:1},
 {id:'attack_stone',label:'Saldırı Gücü Taşı',weight:1},{id:'evolution_scroll',label:'Evrim Parşömeni',weight:1},
 {id:'fifth_enchant',label:'Beşinci Efsun Nesnesi',weight:.05},
 {id:'red_pearl',label:'Kırmızı İnci',weight:.05},
];
export const FISHING_EVENT_PRIZES = [
 {id:'enchant_scroll',label:'Efsun Değiştirme Nesnesi',weight:50,image:'/game/enchant-change.webp'},
 {id:'enchant_add',label:'Efsun Artırma Nesnesi',weight:30,image:'/game/enchant-add-v262.webp'},
 {id:'afk_ticket',label:'Oto Av Bileti · +2 saat',weight:15,image:'/game/afk-ticket-v350.webp'},
 {id:'auto_potion',label:'Oto Kırmızı İksir',weight:5,image:'/game/auto-red-potion.webp'},
];
export function defaultEvents(){return {version:1,events:Object.fromEntries(EVENT_KINDS.map(kind=>[kind,{enabled:false,start:0,end:0,percent:kind==='chest'?2:kind==='moonlight'||kind==='fishing'||kind==='halloween'?1:20,runId:''}])),weights:Object.fromEntries(CHEST_PRIZES.map(p=>[p.id,p.weight])),moonlightWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),fishingWeights:Object.fromEntries(FISHING_EVENT_PRIZES.map(p=>[p.id,p.weight])),halloweenWeights:Object.fromEntries(MOONLIGHT_PRIZES.map(p=>[p.id,p.weight])),halloweenWandChance:20,fishingRedPearlChance460:5,fishingCatchWeights482:defaultFishingCatch482(),specialistSkills459:colSpecialistSkills459.defaultSpecialistSkills459()};}
export function validateEvents(input){
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
 const wand=input.halloweenWandChance??20;if(!Number.isFinite(wand)||wand<0||wand>100)throw new Error('Cadı değneği şansı 0–100 arasında olmalı.');config.halloweenWandChance=wand;const red=input.fishingRedPearlChance460??5;if(typeof red!=='number'||!Number.isFinite(red)||red<0||red>100||Math.abs(red*100-Math.round(red*100))>0.000001)throw new Error('Kırmızı inci şansı 0–100 arasında, en fazla iki ondalıklı olmalı.');config.fishingRedPearlChance460=red;config.fishingCatchWeights482=validateFishingCatch482(input.fishingCatchWeights482??defaultFishingCatch482());config.specialistSkills459=colSpecialistSkills459.validateSpecialistSkills459(input.specialistSkills459??colSpecialistSkills459.defaultSpecialistSkills459());
 return config;
}
export function parseEvents(raw){try{return validateEvents(typeof raw==='string'?JSON.parse(raw):raw);}catch{return defaultEvents();}}
// Read-only hot path (combat/fishing/chest rolls): the same events_json string is
// parsed and fully validated on every attack. Reuse the validated result while
// the exact string is unchanged. The returned object is frozen; callers that
// need a mutable copy (admin editing) must keep using parseEvents().
let cachedEventsRaw,cachedEventsConfig;
const deepFreeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.freeze(value);for(const child of Object.values(value))deepFreeze(child);}return value;};
export function readEventsConfig(raw){
 if(typeof raw!=='string')return parseEvents(raw);
 if(raw!==cachedEventsRaw){cachedEventsConfig=deepFreeze(parseEvents(raw));cachedEventsRaw=raw;}
 return cachedEventsConfig;
}
export function eventActive(event,now=Date.now()/1000){return !!eventOccurrence499(event,now);}
export function eventBonus(config,kind,now=Date.now()/1000){return eventOccurrence499(config.events[kind],now)?.percent??0;}
// Stochastic rounding preserves small rewards: +20% of 1 is really +20% on average.
export function bonusAmount(amount,percent,random=Math.random){const value=Math.max(0,amount)*(1+Math.max(0,percent)/100),base=Math.floor(value);return base+(random()<value-base?1:0);}
export function pickChestPrize(config,random=Math.random){const total=CHEST_PRIZES.reduce((n,p)=>n+config.weights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of CHEST_PRIZES){roll-=config.weights[p.id];if(roll<0)return p;}return CHEST_PRIZES.findLast(p=>config.weights[p.id]>0);}
export function pickMoonlightPrize(config,random=Math.random){const total=MOONLIGHT_PRIZES.reduce((n,p)=>n+config.moonlightWeights[p.id],0);let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;for(const p of MOONLIGHT_PRIZES){roll-=config.moonlightWeights[p.id];if(roll<0)return p;}return MOONLIGHT_PRIZES.findLast(p=>config.moonlightWeights[p.id]>0);}
export function eventRemaining(seconds){const n=Math.max(0,Math.ceil(seconds));return `${Math.floor(n/86400)}g ${String(Math.floor(n/3600)%24).padStart(2,'0')}:${String(Math.floor(n/60)%60).padStart(2,'0')}:${String(n%60).padStart(2,'0')}`;}

// One extra reward per completed cast; fishing bait never multiplies this draw.
export function rollFishingEventReward(config,now=Date.now()/1000,random=Math.random){
 const chance=eventBonus(config,'fishing',now);if(chance<=0||random()*100>=chance)return null;
 const total=FISHING_EVENT_PRIZES.reduce((sum,p)=>sum+config.fishingWeights[p.id],0);
 let roll=Math.max(0,Math.min(1-Number.EPSILON,random()))*total;
 for(const prize of FISHING_EVENT_PRIZES){roll-=config.fishingWeights[prize.id];if(roll<0)return prize;}
 return null;
}

export function pickHalloweenPrize(config,random=Math.random){return pickMoonlightPrize({moonlightWeights:config.halloweenWeights},random);}
