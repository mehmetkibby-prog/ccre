import {DRAGON_CATALOG} from './dragon-boss.mjs';
import {PREMIUM_ITEMS} from './premium-catalog.mjs';
import {PROGRESSION_MATERIALS} from './progression-materials.mjs';
import {RUNE_TYPES} from './runes.mjs';
export const ARENA_REWARDS=Object.freeze({'1v1':5,'2v2':6,'3v3':7,'5v5':10});
export const ARENA_LIMITS=Object.freeze({'1v1':5,'2v2':3,'3v3':2,'5v5':1});
export const arenaDay=ms=>Math.floor((ms+10800000)/86400000);
export const arenaDayStart=ms=>arenaDay(ms)*86400000-10800000;
export const ARENA_CATALOG=[
 ...Object.entries({talisman_stones:'Tılsım Taşı',talisman_powers:'Tılsımın Gücü'}).map(([column,name])=>({id:'resource:'+column,type:'resource',column,name,group:'Malzemeler'})),
 ...DRAGON_CATALOG.map(x=>({...x,image:x.type==='premium'?PREMIUM_ITEMS[x.kind]?.image:x.column==='fifth_enchant_scrolls'?'/game/enchant-fifth-v260.webp':x.image})),
 ...Object.entries(PROGRESSION_MATERIALS).map(([kind,m])=>({id:'material:'+kind,type:'material',kind,name:m.label,image:'/dungeon/'+m.image+'.webp',group:'Geliştirme'})),
 ...Object.entries(RUNE_TYPES).flatMap(([kind,m])=>[{id:'material:'+kind,type:'material',kind,name:m.shard,image:'/dungeon/'+m.image+'-shard.webp',group:'Rün'},{id:'rune:'+kind,type:'rune',kind,name:m.label,image:'/game/'+m.image+'.webp',group:'Rün'}]),
 {id:'arena:wings',type:'arena',kind:'wings',name:'Arena Kanatları',image:'/game/arena-wings-v424.webp',group:'Arena',description:'5 gün · +10 saldırı · Canavarlara karşı +%10 güç. Süre satın alma/ödülde başlar, çevrimdışıyken ilerler. Yenileme kalan süreye 5 gün ekler. Eski süresiz kanatlar bu güncellemede bir defaya mahsus 5 günlük süreye geçer.'},
 {id:'arena:exp_ring',type:'arena',kind:'exp_ring',name:'Arena Tecrübe Yüzüğü',image:'/game/exp-ring-v424.webp',group:'Arena',description:'Kullanınca 1 saat +%20 tecrübe. Çevrimdışıyken süre ilerler; tekrar kullanım süreyi uzatır.'},
];
export const ARENA_BY_ID=new Map(ARENA_CATALOG.map(x=>[x.id,x]));
export const DEFAULT_ARENA_SHOP=[{itemId:'premium:auto_potion',price:15,amount:1},{itemId:'premium:enchant_scroll',price:60,amount:1},{itemId:'arena:wings',price:500,amount:1},{itemId:'arena:exp_ring',price:50,amount:1}];
export function validateArenaShop(rows){
 if(!Array.isArray(rows)||rows.length>ARENA_CATALOG.length)throw Error('Market listesi geçersiz.');const seen=new Set();
 return rows.map(r=>{const item=ARENA_BY_ID.get(r.itemId);if(!item||seen.has(r.itemId)||!Number.isSafeInteger(r.price)||r.price<1||r.price>100000000||!Number.isSafeInteger(r.amount)||r.amount<1||r.amount>(['material','stone','resource'].includes(item.type)?10000:1))throw Error('Eşya, fiyat veya adet geçersiz.');seen.add(r.itemId);let power=0;if(item.type==='gear'||item.type==='rune'){power=r.power??(item.type==='rune'?1:({white:10,blue:20,orange:35,red:50,purple:70,unique:90,infinite:100,emerald:265}[item.rarity]));if(!Number.isSafeInteger(power)||power<(item.type==='rune'?1:0)||power>100000)throw Error('Eşya gücü geçersiz.');}return {itemId:r.itemId,price:r.price,amount:r.amount,...(power?{power}:{})};});
}
