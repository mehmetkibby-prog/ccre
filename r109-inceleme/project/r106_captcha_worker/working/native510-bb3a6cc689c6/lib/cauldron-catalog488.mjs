import {QUEST_CATALOG438} from './quests438.mjs';
import {PREMIUM_ITEMS} from './premium-catalog.mjs';
import {EXTRA_PRODUCTS} from './extra-products.mjs';
import {JEWELRY456,HALLOWEEN456,SPECIALIZATION_RESET463} from './expansion456.mjs';
import {RUNE_TYPES} from './runes.mjs';
import {groundLootArt} from './ground-loot-art.mjs';

// This is the existing reward catalogue, not a second source of item stats.
// Every supplemental entry below already has a native inventory/grant path.
const extras488=[
 {id:'resource:red_pearls',type:'resource',column:'red_pearls',name:'Kırmızı İnci',group:'Malzemeler'},
 {id:'resource:arena_coins',type:'resource',column:'arena_coins',name:'Arena Coin',group:'Para',image:'/game/arena-coin-v424.webp'},
 {id:'material:'+SPECIALIZATION_RESET463.kind,type:'material',kind:SPECIALIZATION_RESET463.kind,name:SPECIALIZATION_RESET463.name,group:'Nesne Market',image:'/game/specialization-reset-scroll-v481.svg',description:SPECIALIZATION_RESET463.description},
 ...Object.values(JEWELRY456).map(item=>({id:'jewelry:'+item.kind,type:'jewelry',kind:item.kind,name:item.name,group:'Üretim Takıları',image:item.image,description:'Mevcut Pakize üretimiyle aynı özelliklerde; karakterinin sınıfına uygun, kuşanılmamış olarak gelir.'})),
 ...Object.entries({critical:['Kritik Şansı Taşı',7],attack:['Saldırı Gücü Taşı',25],defense:['Savunma Taşı',50],block:['Bloklama Taşı',8]}).map(([kind,[name,value]])=>({id:'stone:'+kind,type:'stone',kind,name:name+' · temel',group:'Taşlar',description:'Mevcut temel taş: '+(['critical','block'].includes(kind)?'%':'+')+value+'.'})),
];
const roleLabels488=Object.freeze({muhafiz:'Muhafız',avci:'Avcı',arkanist:'Arkanist'});
const descriptions488=Object.freeze({
 'premium:wings':'7 gün Kızıl Çekirdek Kanatları. Süre teslimde başlar; varsa kalan süreye eklenir.',
 'premium:xp_ring':'5 gün Tecrübe Yüzüğü. Etkisi teslimde başlar; varsa kalan süreye eklenir.',
 'premium:drop_charm':'5 gün Ganimet Tılsımı. Etkisi teslimde başlar; varsa kalan süreye eklenir.',
 'premium:costume':'7 günlük sınıf giysisi. Süre teslimde başlar; mevcut aynı sınıf giysisinin süresi uzar.',
 'premium:weapon_skin':'7 gün Zümrüt Hükümran Silahı. Süre teslimde başlar; varsa kalan süreye eklenir.',
 'premium:teleport_skin':'7 gün Zümrüt Geçidi. Süre teslimde başlar; varsa kalan süreye eklenir.',
 'premium:auto_potion':'Mevcut oto iksir sistemine 100.000 can kapasitesi ekler.',
 'premium:storage_page':'Bir ek depo sayfası açar. Dört sayfası dolu oyuncuda tarif uygulanmaz; malzeme harcanmaz.',
 'premium:stall_skin':'Kalıcı Zümrüt Pazar Tezgâhı görünümü. Zaten sahip oyuncuda malzeme harcanmaz.',
 'special:rod':'Kalıcı olta. Zaten sahip oyuncuda malzeme harcanmaz.',
 'special:core_wings':'Kalıcı Çekirdek Kanatları. Zaten sahip oyuncuda malzeme harcanmaz.',
 'special:starter_chest':'Mevcut Başlangıç Sandığı olarak çantaya eklenir; içeriği ve açılma kuralları değişmez.',
 'resource:core_coins':'Doğrudan Çekirdek Parası bakiyesine eklenir. Fiziksel ÇP kuponu değildir.',
 'resource:xp':'Mevcut görev tecrübesi kurallarıyla verilir: seviye sınırı, 65. seviye rütbe ve etkin Savaş Bileti ilerlemesi korunur. Hiçbir ilerleme kalmadıysa malzeme harcanmaz.',
});
function icon488(item){
 let image=item.image;
 if(item.type==='premium')image=PREMIUM_ITEMS[item.kind]?.image??image;
 if(item.id==='premium:fishing_guide')image='/game/fishing-guide-v481.svg';
 if(item.type==='material')image=Object.values(HALLOWEEN456).find(x=>x?.kind===item.kind)?.image??image;
 if(item.type==='rune')image='/game/'+RUNE_TYPES[item.kind].image+'.webp';
 if(item.type==='material'&&Object.hasOwn(RUNE_TYPES,item.kind))image='/dungeon/'+RUNE_TYPES[item.kind].image+'-shard.webp';
 if(image)return Object.freeze({src:image,columns:1,rows:1,col:0,row:0,glyph:'◆'});
 if(item.id==='resource:red_pearls')return Object.freeze({glyph:'pearl',color:'#ef4565'});
 if(item.id==='resource:core_coins')return Object.freeze({glyph:'ÇP',color:'#ebc572'});
 if(item.id==='resource:talisman_stones'||item.id==='resource:talisman_powers')return Object.freeze({src:'/game/talisman-v373.svg',columns:1,rows:1,col:0,row:0,glyph:'◆'});
 const art=groundLootArt({...item,catalog_id:item.id,item_name:item.name});
 // A resource may intentionally use the game's existing vector glyph.
 return Object.freeze(art);
}
function decorate488(item){
 const editablePower=item.type==='gear'||item.type==='rune';
 const maxAmount=item.type==='xp'?1000000:item.id==='resource:core_coins'?100000:['resource','stone','material'].includes(item.type)?10000:1;
 const description=descriptions488[item.id]??item.description??(item.type==='premium'?EXTRA_PRODUCTS[item.kind]?.description:undefined)??(item.type==='pet'?`${item.kind==='starter'?3:7} gün. Süre teslimde başlar; mevcut petin süresi uzar.`:item.type==='rank'?'Mevcut rütbe görünümünü açar; rütbe/istatistik seviyesi vermez. Zaten açıksa malzeme harcanmaz.':item.type==='gear'?'Mevcut ödül ekipmanı: seçilen güçle, +0 ve efsunsuz teslim edilir. Sınıfı ve nadirliği sabittir.':undefined);
 const defaultPower=item.type==='rune'?1:({white:10,blue:20,orange:35,red:50,purple:70,unique:90,infinite:100,emerald:265}[item.rarity]);
 return Object.freeze({...item,label:item.name+(item.role?' · '+roleLabels488[item.role]:''),maxAmount,icon:icon488(item),...(description?{description}:{}),...(editablePower?{powerMin:item.type==='rune'?1:0,powerMax:100000,defaultPower}: {})});
}
const unique488=new Map();
for(const item of [...QUEST_CATALOG438,...extras488]){
 if(unique488.has(item.id))throw Error('Tekrarlanan kazan ödülü: '+item.id);
 unique488.set(item.id,decorate488(item));
}
export const CAULDRON_CATALOG488=Object.freeze([...unique488.values()]);
export const CAULDRON_BY_ID488=new Map(CAULDRON_CATALOG488.map(item=>[item.id,item]));
export const CAULDRON_CATALOG_EXCLUSIONS488=Object.freeze([
 Object.freeze({id:'progression',reason:'Doğrudan seviye, rütbe kademesi ve beceri açma yönetim işlemidir. Tecrübe Puanı ödülü mevcut görev ilerleme kurallarıyla seçilebilir.'}),
 Object.freeze({id:'guild',reason:'Lonca/şato sahipliği ve loncaya bağlı sancak yetkisi kişisel envanter ödülü değildir.'}),
 Object.freeze({id:'services',reason:'Hesap yetkileri, ban/GM, etkin sezon satın alma ve ödeme paketleri kişisel eşya değildir. Paketlerdeki ödül eşyaları tek tek seçilebilir.'}),
]);

export function validateCauldronReward488(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).some(k=>!['itemId','amount','power'].includes(k)))throw Error('Kazan ödül biçimi geçersiz.');
 const item=typeof value.itemId==='string'?CAULDRON_BY_ID488.get(value.itemId):null;
 if(!item)throw Error('Kazan ödülü mevcut eşya kataloğunda yok.');
 if(!Number.isSafeInteger(value.amount)||value.amount<1||value.amount>item.maxAmount)throw Error(item.name+': ödül adedi 1–'+item.maxAmount+' arasında olmalı.');
 if(item.powerMin!==undefined){const power=value.power??item.defaultPower;if(!Number.isSafeInteger(power)||power<item.powerMin||power>item.powerMax)throw Error(item.name+': güç/seviye geçersiz.');return {itemId:item.id,amount:value.amount,power};}
 if(value.power!==undefined)throw Error('Bu ödülün gücü değiştirilemez.');
 return {itemId:item.id,amount:value.amount};
}
export function validateCauldronRewards488(values){
 if(!Array.isArray(values)||values.length<1||values.length>8)throw Error('Her tarif için 1–8 ödül seçilmeli.');
 const seen=new Set();
 return values.map(value=>{const reward=validateCauldronReward488(value);if(seen.has(reward.itemId))throw Error('Aynı ödülü iki satır yerine tek satırda seç.');seen.add(reward.itemId);return reward;});
}
export function cauldronRewardPreview488(value){
 const reward=validateCauldronReward488(value),item=CAULDRON_BY_ID488.get(reward.itemId);
 return {...reward,name:item.name,label:item.label,type:item.type,group:item.group,icon:item.icon,...(item.description?{description:item.description}:{})};
}
