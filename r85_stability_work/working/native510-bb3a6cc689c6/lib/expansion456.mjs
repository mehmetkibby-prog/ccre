function colTransferLevel491(item){if(!item||!["weapon","armor","helmet","shoes","necklace","earring","bracelet"].includes(item.kind))return 0;const match=/^\+([0-5]) /.exec(String(item.item_name??''));return match?Number(match[1]):0;}
function colTransferBonus491(item){return (item?.kind==='weapon'?[0,3,8,15,25,40]:[0,2,6,11,18,28])[colTransferLevel491(item)];}
import {configureSpecialization459} from './specialist-skills459.mjs';
import {PROGRESSION_MATERIALS} from './progression-materials.mjs';

export const PAKIZE456=Object.freeze({x:1070,y:390,reach:245,name:'Zanaat Ustası Pakize',image:'/game/pakize-npc-v456.webp'});
export const JEWELRY_RECIPE456=Object.freeze({gems:50000,materials:Object.freeze({strong_branch:250,strong_crystal:250,desert_plant:150,master_scroll:100})});
export const JEWELRY456=Object.freeze({
 earring:Object.freeze({kind:'earring',name:'Yaşam Küpesi',image:'/game/emerald-earrings-v456.webp',attack:20,defense:0,castSpeed:10,strongPlayers:5,resistantPlayers:0}),
 bracelet:Object.freeze({kind:'bracelet',name:'Yaşam Bileziği',image:'/game/emerald-bracelet-v456.webp',attack:20,defense:50,castSpeed:0,strongPlayers:0,resistantPlayers:5}),
});
export const SPECIALIZATIONS456=Object.freeze({
 arkanist:Object.freeze([
  Object.freeze({id:'arkanist_burst',name:'Öz Yıkıcısı',description:'Öz enerjisini güçlü bir saldırıya dönüştürür.',skill:'Öz Patlaması',effect:'burst',cooldown:18000,multiplier:2.1,color:'#bd79f2'}),
  Object.freeze({id:'arkanist_heal',name:'Yaşam Dokuyucusu',description:'Kendisini ve 320 menzil içindeki en fazla 4 grup üyesini iyileştirir; Arena’da yalnız kendi takımını etkiler.',skill:'Yaşam Dalgası',effect:'heal',cooldown:24000,heal:.20,color:'#77d5a0'}),
 ]),
 avci:Object.freeze([
  Object.freeze({id:'avci_sharp',name:'Keskin Nişancı',description:'Tek hedefe güçlü bir ok atışı yapar.',skill:'Şafak Oku',effect:'burst',cooldown:18000,multiplier:2.2,color:'#edc36b'}),
  Object.freeze({id:'avci_trap',name:'İz Sürücü',description:'Hedefini kısa süre durduran bir ok atar.',skill:'Kök Oku',effect:'root',cooldown:20000,multiplier:1.5,rootMs:1800,color:'#80c493'}),
 ]),
 muhafiz:Object.freeze([
  Object.freeze({id:'muhafiz_tank',name:'Çelik Muhafız',description:'Canını toparlar ve kısa süre aldığı hasarı azaltır.',skill:'Çelik İrade',effect:'guard',cooldown:24000,heal:.12,guard:.20,guardMs:6000,color:'#85c3df'}),
  Object.freeze({id:'muhafiz_strike',name:'Hüküm Savaşçısı',description:'Silahıyla güçlü bir yakın dövüş darbesi indirir.',skill:'Hüküm Darbesi',effect:'burst',cooldown:18000,multiplier:2.2,color:'#e99b68'}),
 ]),
});
export const HALLOWEEN456=Object.freeze({
 pumpkin:Object.freeze({kind:'halloween_pumpkin',name:'Bal Kabağı',image:'/game/halloween-pumpkin-v456.webp'}),
 wand:Object.freeze({kind:'witch_wand',name:'Cadının Sihirli Değneği',image:'/game/witch-wand-v456.webp'}),
 candy:Object.freeze({kind:'halloween_candy',name:'Cadı Şekeri',image:'/game/halloween-candy-v456.webp'}),
 witch:Object.freeze({x:1370,y:500,reach:245,name:'Cadı',image:'/game/village-witch-npc-v456.webp'}),
 wandChance:20,exchangeWands:50,candySeconds:10800,candyXpBonus:.25,
});
export function specialization456(role,id,settings){return configureSpecialization459(SPECIALIZATIONS456[role]?.find(s=>s.id===id)??null,settings);}
export function jewelryStats456(items){
 const stats={attack:0,defense:0,castSpeed:0,strongPlayers:0,resistantPlayers:0};
 for(const item of items??[]){const base=Object.hasOwn(JEWELRY456,item.kind)?JEWELRY456[item.kind]:null;if(item.equipped!==1||!base)continue;for(const key of Object.keys(stats))stats[key]+=base[key];stats.defense+=colTransferBonus491(item);}
 return stats;
}
export function recipeRows456(){return Object.entries(JEWELRY_RECIPE456.materials).map(([kind,amount])=>({kind,amount,...PROGRESSION_MATERIALS[kind]}));}
export function skillFourCost456(baseCost,currentLevel){return Math.max(1,Math.round(Number(baseCost)||1))*Math.max(1,Math.min(10,Math.floor(Number(currentLevel)||1)))*2;}
export function skillFourGrowth456(level,growth=.04){return 1+(Math.max(1,Math.min(10,Math.floor(Number(level)||1)))-1)*Math.max(0,Number(growth)||0);}
export function specializationGuard456(player,nowMs,settings){const branch=specialization456(player?.role,player?.specialization,settings);return branch?.effect==='guard'&&Number(player.special_guard_until_ms)>nowMs?branch.guard:0;}
export function candyXpMultiplier456(until,nowMs){return Number(until)>nowMs?1+HALLOWEEN456.candyXpBonus:1;}

export const SPECIALIZATION_RESET463=Object.freeze({"kind":"specialization_reset_scroll463","name":"Uzmanlık Sıfırlama Parşömeni","image":"/game/rename-scroll-v250.webp","gems":5000,"coreCoins":50,"description":"Seçtiğin uzmanlık yolunu sıfırlar ve yeni bir uzmanlık seçmeni sağlar. Karakter seviyen, eşyaların ve beceri geliştirme seviyelerin korunur. Çantanın Nesne Market bölümünden, savaş dışındayken kullanılır; 1 parşömen tüketilir."});
