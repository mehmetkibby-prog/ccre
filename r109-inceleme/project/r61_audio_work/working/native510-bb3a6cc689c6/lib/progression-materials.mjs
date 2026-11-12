export const PROGRESSION_MATERIALS = Object.freeze({forge_ember491:{"label":"Kor Mührü","image":"../game/forge-ember-v491","note":"Tüm canavarlardan kazanılabilen artı basma malzemesi. Demirci Haso’da kullanılır; pazarda satılabilir."},
  solo_key: {label:'Zindan Anahtarı',image:'solo-key-v410',note:'Demirci Haso’da 3 İnci + 100 Mücevher karşılığında üretilir. Bir solo zindan girişi için kullanılır.'},
  weathered_iron: {label:'Eskitilmiş Demir Parçası',image:'weathered-iron-v410',note:'Solo zindan bossunun özel malzemesi.'},
  strong_branch: {label:'Güçlü Dal',image:'strong-branch-v410',area:'forest',areaName:'Kuzey Ormanı',note:'Kuzey Ormanı canavarlarından düşen artı basma malzemesi.'},
  strong_crystal: {label:'Güçlü Kristal',image:'strong-crystal-v410',area:'frozen',areaName:'Donmuş Çam Geçidi',note:'Donmuş Çam Geçidi canavarlarından düşen artı basma malzemesi.'},
  desert_plant: {label:'Çöl Bitkisi',image:'desert-plant-v410',area:'black',areaName:'Kara Bölge',note:'Kara Bölge canavarlarından düşen artı basma malzemesi.'},
  master_scroll: {label:'Usta Parşömeni',image:'master-scroll-v410',area:'ancient',areaName:'Kadim Kök Vadisi',note:'Kadim Kök Vadisi canavarlarından düşen artı basma malzemesi.'},
});
export const UPGRADE_MATERIAL_KINDS=Object.freeze(['strong_branch','strong_crystal','desert_plant','master_scroll']);
export const UPGRADE_MATERIAL_DEFAULTS=Object.freeze(Object.fromEntries(UPGRADE_MATERIAL_KINDS.map(kind=>[kind,Object.freeze({chance:1,min:1,max:1})])));
export function progressionMaterial(kind){return typeof kind==='string'&&Object.hasOwn(PROGRESSION_MATERIALS,kind)?PROGRESSION_MATERIALS[kind]:null;}
export function materialForSource(source){const area=String(source).split('.')[0];return UPGRADE_MATERIAL_KINDS.find(kind=>PROGRESSION_MATERIALS[kind].area===area);}
export function validateMaterialDrops(input){
 const out={};
 for(const kind of UPGRADE_MATERIAL_KINDS){const rule=input?.[kind];
  if(!rule||!Number.isFinite(rule.chance)||rule.chance<0||rule.chance>100||!Number.isSafeInteger(rule.min)||!Number.isSafeInteger(rule.max)||rule.min<1||rule.max<rule.min||rule.max>100)throw Error('Malzeme oranı %0–100, miktarı 1–100 arasında olmalı.');
  out[kind]={chance:rule.chance,min:rule.min,max:rule.max};
 }return out;
}
