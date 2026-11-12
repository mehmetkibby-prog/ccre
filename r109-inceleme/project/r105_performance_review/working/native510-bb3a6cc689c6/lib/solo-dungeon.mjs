import {DRAGON_CATALOG} from './dragon-boss.mjs';
import {PROGRESSION_MATERIALS} from './progression-materials.mjs';
export const SOLO_NAME='Paslı Mahzen';
export const SOLO_KEY_COST=Object.freeze({pearls:3,gems:100});
export const SOLO_MAPS=Object.freeze([null,
 {id:'solo_ash',name:'Kül Geçidi',image:'/dungeon/solo-ash-v410.webp',objective:'Geçidi Temizle',spawn:{x:1200,y:1190}},
 {id:'solo_foundry',name:'Kırık Dökümhane',image:'/dungeon/solo-foundry-v410.webp',objective:'Dökümhaneyi Geç',spawn:{x:1200,y:1190}},
 {id:'solo_throne',name:'Demir Avlu',image:'/dungeon/solo-throne-v410.webp',objective:'Demir Hükümdarı Yen',spawn:{x:1200,y:1190}},
]);
export const SOLO_CATALOG=Object.freeze([...DRAGON_CATALOG,...Object.entries(PROGRESSION_MATERIALS).map(([kind,m])=>({id:`material:${kind}`,kind,name:m.label,type:'material',group:'Yeni Malzemeler'}))]);
export const SOLO_CATALOG_BY_ID=new Map(SOLO_CATALOG.map(i=>[i.id,i]));
export const SOLO_DEFAULTS=Object.freeze({enabled:true,minimum_level:50,daily_limit:5,duration_seconds:1800,
 stage1_hp:6000,stage1_damage:24,stage2_hp:8000,stage2_damage:30,stage3_hp:10000,stage3_damage:36,
 boss_hp:60000,boss_damage:65,loot:[{itemId:'material:weathered_iron',chance:1,min:1,max:1}]});
export function soloDay(now=Date.now()){return Math.floor((now+10800000)/86400000);}
export function validateSoloConfig(input){
 if(!input||typeof input.enabled!=='boolean')throw Error('Solo zindan açık/kapalı ayarı geçersiz.');
 const out={enabled:input.enabled};
 for(const [key,min,max] of [['minimum_level',1,65],['daily_limit',1,100],['duration_seconds',300,3600],...['stage1_hp','stage2_hp','stage3_hp','boss_hp'].map(k=>[k,1,100000000]),...['stage1_damage','stage2_damage','stage3_damage','boss_damage'].map(k=>[k,1,1000000])]){
  const n=input[key];if(!Number.isSafeInteger(n)||n<min||n>max)throw Error('Geçersiz solo zindan ayarı: '+key);out[key]=n;
 }
 if(!Array.isArray(input.loot)||input.loot.length>64)throw Error('En fazla 64 ayrı ödül satırı eklenebilir.');
 const seen=new Set();let individualItems=0;
 out.loot=input.loot.map(rule=>{
  const item=SOLO_CATALOG_BY_ID.get(rule.itemId),stack=item&&['resource','material','stone'].includes(item.type);
  if(!item||seen.has(rule.itemId)||!Number.isFinite(rule.chance)||rule.chance<0||rule.chance>100||!Number.isSafeInteger(rule.min)||!Number.isSafeInteger(rule.max)||rule.min<1||rule.max<rule.min||rule.max>(stack?10000:5))throw Error('Ödül, oran veya en az/en çok miktarı geçersiz.');
  seen.add(rule.itemId);if(!stack&&rule.chance>0)individualItems+=rule.max;
  return {itemId:rule.itemId,chance:Math.round(rule.chance*10000)/10000,min:rule.min,max:rule.max};
 });
 if(out.enabled&&!out.loot.some(r=>r.chance>0))throw Error('Garanti 3 ganimet için en az bir eşyanın oranı sıfırdan büyük olmalı.');
 if(individualItems>40)throw Error('Bir turda en fazla 40 ayrı ekipman/pet/özel eşya teslim edilebilir.');
 return out;
}
// Three guaranteed draws. Percentages are relative selection weights; zero disables.
// Draws may repeat so a one-item table still yields three physical loot entries.
export function rollSoloLoot(config,random=Math.random){
 const unit=()=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));
 const enabled=config.loot.filter(rule=>rule.chance>0&&SOLO_CATALOG_BY_ID.has(rule.itemId));
 const pool=enabled.length?enabled:SOLO_DEFAULTS.loot;
 const total=pool.reduce((n,r)=>n+r.chance,0);
 return Array.from({length:3},()=>{let ticket=unit()*total;let chosen=pool[pool.length-1];for(const rule of pool){ticket-=rule.chance;if(ticket<0){chosen=rule;break;}}return {...chosen,amount:chosen.min+Math.floor(unit()*(chosen.max-chosen.min+1))};});
}
