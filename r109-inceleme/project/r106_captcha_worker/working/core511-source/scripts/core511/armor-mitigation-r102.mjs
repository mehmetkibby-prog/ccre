// R102: retain the low-defense curve and never weaken existing armor.
// Beyond its old knee, a second diminishing-return curve gives high gear a
// measurable contribution. Armor alone cannot exceed 95% PvE / 75% PvP or
// dungeon reduction. Other explicit guard/block skills keep their own rules.
export function armorDamageReduction(defense, mode='pvp'){
 const value=Number(defense),safe=Number.isFinite(value)?Math.max(0,value):0;
 const pve=mode==='pve',divisor=pve?100:250,knee=pve?.8:.55,excess=Math.max(0,safe-divisor*knee);
 const legacy=(pve?.02:.05)*excess/(excess+divisor);
 const growth=(pve?.15:.20)*excess/(excess+1000);
 return Math.min(knee,safe/divisor)+Math.max(legacy,growth);
}
