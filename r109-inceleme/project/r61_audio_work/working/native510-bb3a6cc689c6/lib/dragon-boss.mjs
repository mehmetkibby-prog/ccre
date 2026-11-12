import {catalogMultiplier487} from './level-balance487.mjs';
const EMERALD_SET444=Object.freeze({name:'Kadim Zümrüt Seti',slots:['weapon','armor','helmet','shoes','necklace'],bonuses:{hp:1000,pve:10,pvp:10,resistance:0,speed:12,attack:50}});
function emeraldName444(kind,role){return kind==='weapon'?({muhafiz:'Kadim Zümrüt Hükümkılıcı',avci:'Kadim Zümrüt Ufuk Yayı',arkanist:'Kadim Zümrüt Öz Asası'}[role]??'Kadim Zümrüt Hükümkılıcı'):({armor:'Kadim Zümrüt Zırhı',helmet:'Kadim Zümrüt Tacı',necklace:'Kadim Zümrüt Kalbi',shoes:'Kadim Zümrüt Çizmeleri'}[kind]??'Kadim Zümrüt');}
function emeraldPower444(kind,settings={}){if(kind==='weapon')return 350;if(kind==='armor')return 300;const unique=Math.max(1,Number(settings[kind==='weapon'?'unique_weapon_power':'unique_armor_power'])||(kind==='weapon'?180:150));const percent=Number.isFinite(Number(settings.infinite_power_percent))?Math.max(0,Number(settings.infinite_power_percent)):30;const weaponBase=Math.max(1,Number(settings.infinite_weapon_power)||230);const infinite=globalThis.__colDragonBoss?.infinitePower?.({kind,power:unique})??(kind==='weapon'&&unique<=180?Math.max(unique,weaponBase):kind==='weapon'?Math.max(unique,Math.round(unique*(1+percent/100)),weaponBase):Math.round(unique*(1+percent/100)));return Math.min(100000,Math.ceil(infinite*1.15));}
const EMERALD_CATALOG444=['muhafiz','avci','arkanist'].flatMap(role=>['weapon','armor','helmet','necklace','shoes'].map(kind=>({id:`gear:${role}:${kind}:emerald`,name:emeraldName444(kind,role),type:'gear',kind,role,rarity:'emerald',group:'Kadim Zümrüt'})));
function emeraldIconStyle444(kind,role){if(kind==='armor')return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-armor-v445.webp)',backgroundSize:'contain',backgroundPosition:'center',backgroundRepeat:'no-repeat'};const col=kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(role)):Math.max(0,['helmet','necklace','shoes'].indexOf(kind));return {display:'inline-block',flexShrink:0,backgroundImage:'url(/game/emerald-set-v444.webp)',backgroundSize:'300% 200%',backgroundPosition:`${col*50}% ${kind==='weapon'?0:100}%`,backgroundRepeat:'no-repeat'};}
function emeraldGroundArt444(drop){if(drop.kind==='armor')return {src:'/game/emerald-armor-v445.webp',columns:1,rows:1,col:0,row:0,glyph:'◆',label:drop.item_name??emeraldName444('armor',drop.role),color:'#39c889',rarity:'emerald'};return {src:'/game/emerald-set-v444.webp',columns:3,rows:2,col:drop.kind==='weapon'?Math.max(0,['muhafiz','avci','arkanist'].indexOf(drop.role)):Math.max(0,['helmet','necklace','shoes'].indexOf(drop.kind)),row:drop.kind==='weapon'?0:1,glyph:'◆',label:drop.item_name??emeraldName444(drop.kind,drop.role),color:'#39c889',rarity:'emerald'};}
function emeraldGrantFields444(current,change){const next={...current,...change};if(next.rarity!=='emerald')return next;return {...next,itemName:emeraldName444(next.kind,next.role),power:emeraldPower444(next.kind)};}

import {PREMIUM_ITEMS} from './premium-catalog.mjs';
import {DRAGON_GEAR_NAMES} from './dragon-gear-names.mjs';
import {RANK_REWARDS} from './ranks.mjs';
export const DRAGON_ID='dragon-world-1';
export const DRAGON_NAME='Külkanat · Kadim Ejderha';
export const DRAGON_WORLD=Object.freeze({width:3000,height:1875});
export const DRAGON_SPAWN=Object.freeze({x:1500,y:900});
export const DRAGON_ENTRY=Object.freeze({x:1500,y:1510});
export const DRAGON_INTERVAL=10800;
export const DRAGON_MIN_REWARDS=3;
export const DRAGON_MAX_REWARDS=5;
const roles={muhafiz:'Muhafız',avci:'Avcı',arkanist:'Arkanist'},kinds={weapon:'Silah',armor:'Zırh',helmet:'Kask',shoes:'Çizme',necklace:'Kolye'},rarities={white:'Beyaz',blue:'Mavi',orange:'Turuncu',red:'Kırmızı',purple:'Mor Kök',unique:'Eşsiz',infinite:'Sonsuz'};
export const DRAGON_CATALOG=[{"id":"material:halloween_pumpkin","name":"Bal Kabağı","type":"material","kind":"halloween_pumpkin","group":"Cadılar Bayramı"},{"id":"material:witch_wand","name":"Cadının Sihirli Değneği","type":"material","kind":"witch_wand","group":"Cadılar Bayramı"},{"id":"material:halloween_candy","name":"Cadı Şekeri","type":"material","kind":"halloween_candy","group":"Cadılar Bayramı"},
 ...Object.entries(roles).flatMap(([role,label])=>Object.entries(kinds).flatMap(([kind,name])=>Object.entries(rarities).map(([rarity,color])=>({id:`gear:${role}:${kind}:${rarity}`,name:DRAGON_GEAR_NAMES[role][kind][rarity]??`${color} ${label} ${name}`,type:'gear',kind,role,rarity,group:'Ekipman'})))),
 ...Object.entries(roles).flatMap(([role])=>['weapon','armor'].flatMap(kind=>['white','blue','orange','red'].map(rarity=>({id:`gear:sinsi:${role}:${kind}:${rarity}`,name:`${rarities[rarity]} ${DRAGON_GEAR_NAMES[role][kind].sinsi}`,type:'gear',family:'sinsi',kind,role,rarity,group:'Sinsi Ekipman'})))),
 ...Object.entries({essence:'Yaşam Özü',gems:'Mücevher',potions:'Kırmızı İksir',pearls:'Beyaz İnci',stone_dust:'Taş Tozu',fish_sokan:'Sokan Balığı',fish_levrek:'Levrek',fish_zargana:'Zargana',fifth_enchant_scrolls:'Beşinci Efsun Nesnesi'}).map(([column,name])=>({id:`resource:${column}`,name,type:'resource',column,group:'Malzemeler'})),
 ...Object.entries({wing:'Kanat Parçası',infinite:'Sonsuz Taşı Parçası',pet:'Ejderha Parçası'}).map(([kind,name])=>({id:`material:${kind}`,name,type:'material',kind,group:'Zindan'})),
 ...Object.entries({critical:['Kritik Şansı Taşı',[7,8,9,10]],attack:['Saldırı Gücü Taşı',[20,25,30]],defense:['Savunma Taşı',[30,40,50]],block:['Bloklama Taşı',[6,7,8]]}).flatMap(([kind,[name,values]])=>values.map(value=>({id:`stone:${kind}:${value}`,name:`${name} +${value}`,type:'stone',kind:`${kind}:${value}`,group:'Taşlar'}))),
 ...Object.entries({book:'Taş Sanatı Kitabı',evolution_scroll:'Evrim Parşömeni'}).map(([kind,name])=>({id:`stone:${kind}`,name,type:'stone',kind,group:'Malzemeler'})),
 {id:'special:starter_chest',name:'Başlangıç Sandığı',type:'special',kind:'starter_chest',group:'Sandıklar'},
 ...['crystal_chest','moonlight_chest'].map((kind,i)=>({id:`stone:${kind}`,name:['Kristal Sandığı','Ayışığı Sandığı'][i],type:'stone',kind,group:'Sandıklar'})),
 ...Object.entries(PREMIUM_ITEMS).filter(([,item])=>!item.shopOnly499).map(([kind,item])=>({id:`premium:${kind}`,name:item.name,type:'premium',kind,group:'Nesne Market'})),
 ...Object.entries({bird:'Kuş Peti',monkey:'Maymun Peti',dog:'Köpek Peti',dragon:'Ejderha Peti',starter:'Başlangıç Tilkisi'}).map(([kind,name])=>({id:`pet:${kind}`,name,type:'pet',kind,group:'Petler'})),
 {id:'special:rod',name:'Olta',type:'special',kind:'rod',group:'Diğer'},
 {id:'special:core_wings',name:'Çekirdek Kanatları · Kalıcı',type:'special',kind:'core_wings',group:'Zindan'},
 ...RANK_REWARDS.map(r=>({id:`rank:${r.id}`,name:r.name,type:'rank',kind:r.id,group:'Rütbe Görünümleri'})),
...EMERALD_CATALOG444];
export const DRAGON_CATALOG_BY_ID=new Map(DRAGON_CATALOG.map(i=>[i.id,i]));
export function defaultDragonConfig(bossHp=18000){return {enabled:true,hp:Math.round(bossHp*1.25),interval:DRAGON_INTERVAL,loot:[
 {itemId:'resource:essence',chance:100,min:20,max:30},{itemId:'resource:gems',chance:70,min:10,max:20},{itemId:'material:wing',chance:3,min:1,max:1},{itemId:'material:pet',chance:2,min:1,max:1},{itemId:'resource:pearls',chance:8,min:1,max:1},
 ...Object.keys(roles).map(role=>({itemId:`gear:${role}:weapon:red`,chance:2,min:1,max:1})),
]};}
export function validateDragonConfig(value){
 if(!value||typeof value.enabled!=='boolean'||!Number.isSafeInteger(value.hp)||value.hp<1||value.hp>100000000||!Number.isSafeInteger(value.interval)||value.interval<60||value.interval>604800||!Array.isArray(value.loot)||value.loot.length>DRAGON_CATALOG.length)throw new Error('Ejderha ayarları geçersiz.');
 const seen=new Set();const loot=value.loot.map(r=>{const item=DRAGON_CATALOG_BY_ID.get(r.itemId);if(!item||seen.has(r.itemId)||!Number.isFinite(r.chance)||r.chance<0||r.chance>100||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||r.min<1||r.max<r.min||r.max>(['resource','material','stone'].includes(item.type)?10000:10))throw new Error('Ganimet: eşya, yüzde veya adet geçersiz.');seen.add(r.itemId);return {itemId:r.itemId,chance:Math.round(r.chance*10000)/10000,min:r.min,max:r.max};});
 return {enabled:value.enabled,hp:value.hp,interval:value.interval,loot};
}
export function requireDragonLoot(config){
 if(config.enabled&&!config.loot.some(rule=>rule.chance>0))throw new Error('Ejderha açıkken en az bir ganimetin şansı %0’dan büyük olmalı.');
 return config;
}
// Independent configured rolls first, then a bounded weighted top-up. Repeats
// are intentional: a short table must not force its rarest entry to drop.
export function rollDragonLoot(config,random=Math.random,itemMultiplier487=1,materialLevel498=false){
 const active=config.loot.filter(rule=>rule.chance>0);
 const unit=()=>Math.max(0,Math.min(1-Number.EPSILON,Number(random())||0));
 const accepted487=new Set();
 const selected=active.filter(rule=>{const ticket=unit()*100;if(ticket<rule.chance*catalogMultiplier487(DRAGON_CATALOG_BY_ID.get(rule.itemId),itemMultiplier487,materialLevel498))accepted487.add(rule);return ticket<rule.chance;});
 if(selected.length>DRAGON_MAX_REWARDS){
  // Unbiased truncation: list order must not decide which successful rows survive.
  for(let i=selected.length-1;i>0;i--){const j=Math.floor(unit()*(i+1));[selected[i],selected[j]]=[selected[j],selected[i]];}
  selected.length=DRAGON_MAX_REWARDS;
 }
 const total=active.reduce((sum,rule)=>sum+rule.chance,0);
 for(let i=selected.length;total>0&&i<DRAGON_MIN_REWARDS;i++){
  const target=unit()*total;let cursor=0;
  selected.push(active.find(rule=>(cursor+=rule.chance)>target)??active[active.length-1]);
 }
 return selected.map((rule,index)=>({keep:index<DRAGON_MIN_REWARDS||itemMultiplier487===1||accepted487.has(rule),value:{...rule,amount:rule.min+Math.floor(unit()*(rule.max-rule.min+1))}})).filter(row=>row.keep).map(row=>row.value);
}
export function nextWorldBoss(boss,dragon,enabled=true){
 const list=[boss,...(enabled?[dragon]:[])].filter(Boolean);
 return list.sort((a,b)=>(a.hp>0?0:a.respawn_at||Infinity)-(b.hp>0?0:b.respawn_at||Infinity)||String(a.id).localeCompare(String(b.id)))[0]??null;
}

// Each owner sees their own spread. Keep spacing even at arena boundaries.
export function dragonDropPosition(x,y,index,count){
 const cx=Math.max(240,Math.min(DRAGON_WORLD.width-240,Number(x)||DRAGON_SPAWN.x));
 const cy=Math.max(200,Math.min(DRAGON_WORLD.height-200,Number(y)||DRAGON_SPAWN.y));
 const angle=-Math.PI/2+index*Math.PI*2/Math.max(1,count);
 return {x:cx+Math.cos(angle)*160,y:cy+Math.sin(angle)*120};
}
