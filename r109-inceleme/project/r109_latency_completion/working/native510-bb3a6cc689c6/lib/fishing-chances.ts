export const FISHING_PRIZES = ["sokan","levrek","zargana","pearl","talisman"] as const;
export type FishingChances = Record<typeof FISHING_PRIZES[number],number>;
export function fishingChanceSettings(chances: unknown) {
  if(!chances || typeof chances!=="object")throw new Error("Yakalama oranlarını gir.");
  const values=FISHING_PRIZES.map(key=>(chances as FishingChances)[key]??(key==="talisman"?0:NaN));
  if(values.some(value=>typeof value!=="number" || !Number.isFinite(value) || value<0 || value>100 || Math.abs(value*100-Math.round(value*100))>.000001))throw new Error("Oranlar 0–100 arasında, en fazla iki ondalıklı olmalı.");
  if(values.reduce((sum,value)=>sum+Math.round(value*100),0)!==10000)throw new Error("Yakalama oranlarının toplamı %100 olmalı.");
  return {fish_sokan_weight:Math.round(values[0]*100),fish_levrek_weight:Math.round(values[1]*100),fish_zargana_weight:Math.round(values[2]*100),fishing_pearl_chance:values[3]/100,...("talisman" in (chances as object)?{fishing_talisman_chance:values[4]/100}:{})};
}
export function fishingChancesFromSettings(settings:Record<string,number>):FishingChances {
  const pearl=Math.max(0,Math.min(10000,Math.round((settings.fishing_pearl_chance??.03)*10000)));
  const talisman=Math.max(0,Math.min(10000-pearl,Math.round((settings.fishing_talisman_chance??0)*10000)));
  const weights=[settings.fish_sokan_weight??55,settings.fish_levrek_weight??30,settings.fish_zargana_weight??15].map(n=>Math.max(0,n));
  const total=weights.reduce((a,b)=>a+b,0)||1;
  const raw=weights.map(n=>n/total*(10000-pearl-talisman));const cents=raw.map(Math.floor);
  let remaining=10000-pearl-talisman-cents.reduce((a,b)=>a+b,0);
  const order=[0,1,2].sort((a,b)=>(raw[b]-cents[b])-(raw[a]-cents[a]));
  if(remaining>3){cents[0]+=remaining;remaining=0;}
  for(let i=0;i<remaining;i++)cents[order[i]]++;
  return {sokan:cents[0]/100,levrek:cents[1]/100,zargana:cents[2]/100,pearl:pearl/100,...(settings.fishing_talisman_chance!==undefined?{talisman:talisman/100}:{})} as FishingChances;
}
