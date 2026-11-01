import {BATTLE_PASS_CATALOG,validateBattlePassReward} from './battle-pass.mjs';
import {DRAGON_GEAR_NAMES} from './dragon-gear-names.mjs';
import {ENCHANT_TIERS,rollEnchantmentValue} from './enchantment-tiers.mjs';

export const QUEST_EVENTS438=[{id:'kill',label:'Normal canavar öldür'},{id:'fish',label:'Balıkçılıkta bir şey yakala'},{id:'market',label:'Pazar öğretisini oku'},{id:'evolution',label:'İlk silah evrimini yap'}];
export const QUEST_CATALOG438=[
 {id:'class:blue_weapon',name:'Sınıfına uygun mavi silah · 4 efsun',type:'class',kind:'weapon',rarity:'blue',group:'Başlangıç'},
 {id:'class:blue_armor',name:'Sınıfına uygun mavi zırh · 4 efsun',type:'class',kind:'armor',rarity:'blue',group:'Başlangıç'},
 {id:'resource:xp',name:'Tecrübe Puanı',type:'xp',group:'Gelişim'},...BATTLE_PASS_CATALOG,
];
export const QUEST_BY_ID438=new Map(QUEST_CATALOG438.map(item=>[item.id,item]));
export function defaultQuests438(){return {enabled:true,quests:[
 {id:'first_hunt',title:'İlk Avın',description:'Işınlan menüsünden Kuzey Ormanı’na git. Normal canavarları hedefleyip saldırarak 15 tanesini yen.',event:'kill',target:15,rewards:[{itemId:'class:blue_weapon',amount:1},{itemId:'resource:gems',amount:25},{itemId:'resource:xp',amount:150}]},
 {id:'second_hunt',title:'Gücünü Kanıtla',description:'İlk ödülünü aldıktan sonra 30 normal canavar daha yen. Yeni silahını çantandan kuşanmayı unutma.',event:'kill',target:30,rewards:[{itemId:'class:blue_armor',amount:1},{itemId:'resource:gems',amount:35},{itemId:'resource:xp',amount:200}]},
 {id:'first_catch',title:'Oltanın Ucundaki Sürpriz',description:'Işınlan → Balıkçılık alanına git. Balıkçı Hasan’dan olta al, çantanda kuşan ve kıyıda olta at. Balık vurunca basılı tutup bırakarak göstergeyi yeşil alanda tut ve bir şey yakala.',event:'fish',target:1,rewards:[]},
 {id:'market_lesson',title:'Pazarını Tanı',description:'Işınlan → Pazar Alanı’na git. Pazarım bölümünden isim seçip pazar kurabilir; eşyaları, adetlerini ve fiyatlarını belirleyebilirsin. Pazar en fazla 2 gün açık kalır. Kalan eşyaları kapanınca Pazarım’dan geri alırsın. Bu görev için pazar açman veya eşya satman gerekmez.',event:'market',target:1,rewards:[]},
 {id:'first_evolution',title:'Silahının İlk Evrimi',description:'Silahını kuşanıp gerekli canavar sayısını tamamla. Çanta → Silah → Evrim bölümünde gösterilen mücevher ve inci bedelini hazırla, ilk evrimini gerçekleştir.',event:'evolution',target:1,rewards:[{itemId:'resource:pearls',amount:2},{itemId:'resource:gems',amount:150},{itemId:'resource:xp',amount:500}]},
]};}
export function validateQuests438(input){
 if(!input||typeof input.enabled!=='boolean'||!Array.isArray(input.quests)||input.quests.length<1||input.quests.length>40)throw Error('Görev ayarları geçersiz; 1–40 görev olmalı.');
 const seen=new Set();
 return {enabled:input.enabled,quests:input.quests.map(q=>{
  if(!q||typeof q.id!=='string'||!/^[a-z][a-z0-9_-]{2,47}$/.test(q.id)||seen.has(q.id)||typeof q.title!=='string'||!q.title.trim()||q.title.trim().length>80||typeof q.description!=='string'||q.description.length>1600||!QUEST_EVENTS438.some(e=>e.id===q.event)||!Number.isSafeInteger(q.target)||q.target<1||q.target>100000||(['market','evolution'].includes(q.event)&&q.target!==1)||!Array.isArray(q.rewards)||q.rewards.length>6)throw Error('Görev kimliği, hedefi veya açıklaması geçersiz.');
  seen.add(q.id);const rewards=q.rewards.map(r=>{
   const item=QUEST_BY_ID438.get(r?.itemId);if(!item)throw Error('Görev ödülü bulunamadı.');
   if(item.type==='class'){if(r.amount!==1)throw Error('Sınıf eşyası bir adet olmalı.');return {itemId:r.itemId,amount:1};}
   if(item.type==='xp'){if(!Number.isSafeInteger(r.amount)||r.amount<1||r.amount>1000000)throw Error('Görev tecrübesi geçersiz.');return {itemId:r.itemId,amount:r.amount};}
   return validateBattlePassReward(r);
  });
  return {id:q.id,title:q.title.trim(),description:q.description.trim(),event:q.event,target:q.target,rewards};
 })};
}
export function questClassItem438(item,role){
 const gearRole=role==='savasci'?'muhafiz':role;
 if(item.type!=='class')return item;
 return {...item,role,name:DRAGON_GEAR_NAMES[gearRole]?.[item.kind]?.blue??(item.kind==='weapon'?'Safir Kılıç':'Safir Zırh')};
}
export function questEnchantments438(kind,settings,random=Math.random){
 const weaponForbidden=new Set(['sword_defense','arrow_defense','magic_defense','resistant_players','attack_block','hp']);
 const pool=ENCHANT_TIERS.filter(([key])=>{
  if(kind==='weapon')return !weaponForbidden.has(key);
  if(['forest_power','frozen_power','cast_speed'].includes(key))return kind==='armor'||kind==='necklace';
  if(['fire','ice','attack_speed'].includes(key))return false;
  if(key==='attack_block')return kind==='armor'||kind==='helmet';
  if(key==='life_steal')return kind==='armor'||kind==='helmet';
  return kind!=='armor'||key!=='critical';
 }).map(([key])=>key);
 // Exactly four distinct legal enchantments, using the current admin value tiers.
 // A zero ordinary drop weight cannot accidentally erase a guaranteed quest enchantment.
 for(let i=pool.length-1;i>0;i--){const j=Math.floor(Math.max(0,Math.min(.999999999,random()))*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
 return pool.slice(0,4).map(key=>({kind:key,value:rollEnchantmentValue(settings,key,random)}));
}
// Embedded only in the existing XP mutation, never a second kill transaction.
export function questKillSql438(){return 'quest_kills438=MIN(1000000000,quest_kills438+1)';}
export function questMonsterEligible438(monster){return !!monster&&['forest','frozen','black','ancient','rune','rune_v2'].includes(monster.area??monster.monster_area)&&!/^rune-v2-boss-c[1-3]-1$/.test(monster.id??monster.monster_id??'')&&Number(monster.is_boss??monster.monster_is_boss)===0&&Number(monster.is_stone??monster.monster_is_stone)===0;}
