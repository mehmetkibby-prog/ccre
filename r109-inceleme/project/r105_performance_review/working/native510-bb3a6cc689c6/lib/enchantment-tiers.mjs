// Four configurable roll values. Legacy storage retains all five columns; the
// former middle (`three`) column is deliberately not an active roll choice.
// Existing inventory values are never re-rolled or migrated here.
export const ENCHANT_TIERS = [
 ['forest_power','Kuzey Ormanı gücü',[2,4,8,10],10],
 ['frozen_power','Donmuş Çam gücü',[2,4,8,10],10],
 ['fire','Ateş',[2,4,8,10],80], ['ice','Buz',[2,4,8,10],80],
 ['sword_defense','Kılıç savunması',[2,4,9,12],80],
 ['arrow_defense','Ok savunması',[2,4,9,12],80],
 ['magic_defense','Büyü savunması',[2,4,9,12],80],
 ['strong_players','Oyunculara karşı güç',[2,4,8,10],80],
 ['resistant_players','Oyunculara karşı savunma',[2,4,9,12],80],
 ['critical','Kritik şansı',[1,2,4,6],80],
 ['attack_speed','Saldırı hızı',[2,4,8,10],80],
 ['cast_speed','Büyü Hızı',[4,8,16,20],50],
 ['life_steal','Can çalma',[3,6,12,15],15],
 ['attack_block','Saldırı bloklama',[3,6,12,15],15],
 ['hp','Azami can',[60,120,240,300],1000000],
];
export const TIER_SUFFIXES = ['one','two','four','five'];
export const tierKeys = kind => TIER_SUFFIXES.map(suffix=>`enchant_${kind}_tier_${suffix}`);
export const ENCHANT_TIER_DEFAULTS = Object.fromEntries(ENCHANT_TIERS.flatMap(([kind,,values])=>tierKeys(kind).map((key,i)=>[key,values[i]])));
export const ENCHANT_TIER_KEYS = Object.keys(ENCHANT_TIER_DEFAULTS);
export function enchantTierValues(settings,kind) {
 const definition=ENCHANT_TIERS.find(d=>d[0]===kind);
 if(!definition)throw new Error('Geçersiz efsun türü.');
 const valid = value => Number.isSafeInteger(value)&&value>=1&&value<=definition[3];
 const keys=tierKeys(kind), legacyKey=`enchant_${kind}_tier_three`;
 // Some old installations supplied only three columns. Expand those bounds
 // into four choices without increasing their old maximum or editing items.
 if(settings?.[keys[2]]==null&&settings?.[keys[3]]==null&&settings?.[legacyKey]!=null){
  const oldMax=Number(settings[legacyKey]);
  const top=valid(oldMax)?oldMax:definition[2][3];
  const oldMin=Number(settings[keys[0]]??Math.min(definition[2][0],top));
  const low=valid(oldMin)&&oldMin<=top?oldMin:Math.min(definition[2][0],top);
  return Array.from({length:4},(_,i)=>low+Math.floor((top-low)*i/3));
 }
 return keys.map((key,i)=>{
  const value=Number(settings?.[key]??definition[2][i]);
  return valid(value)?value:definition[2][i];
 });
}
export function rollEnchantmentValue(settings,kind,random=Math.random){
 const roll=Number(random());
 return enchantTierValues(settings,kind)[Number.isFinite(roll)?Math.min(3,Math.max(0,Math.floor(roll*4))):0];
}
export function validateEnchantmentTiers(input,current){
 const result={};
 for(const [kind,label,,max] of ENCHANT_TIERS){
  const keys=tierKeys(kind);
  if(!keys.some(key=>Object.hasOwn(input,key)))continue;
  const previous=enchantTierValues(current,kind);
  const values=keys.map((key,i)=>Object.hasOwn(input,key)?Number(input[key]):previous[i]);
  // An unchanged legacy row whose bounds cannot hold four distinct positive
  // integers remains a no-op. Any edit still needs four ascending values.
  const legacyUnchanged=previous[3]-previous[0]<3&&previous.every((value,i)=>value===values[i]&&(!i||previous[i-1]<=value));
  if(values.some(v=>!Number.isSafeInteger(v)||v<1||v>max)||(!legacyUnchanged&&!values.every((value,i)=>!i||values[i-1]<value)))
   throw new Error(`${label}: dört farklı tam sayı küçükten büyüğe, 1–${max} arasında olmalı; 4. kademe en yüksek değerdir.`);
  keys.forEach((key,i)=>{result[key]=values[i];});
 }
 return result;
}
