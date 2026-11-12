import {ENCHANT_TIERS,tierKeys,enchantTierValues} from '../../lib/enchantment-tiers.mjs';
// Startup-only compatibility: all five physical columns remain available to
// legacy queries. Current five-column settings and all items stay untouched.
export function ensureEnchantmentTierSchema(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  const columns=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(r=>r.name));
  const legacy=db.prepare('SELECT * FROM combat_settings WHERE id=1').get();
  const suffixes=['one','two','three','four','five'];
  const middle={forest_power:6,frozen_power:6,fire:6,ice:6,sword_defense:7,arrow_defense:7,magic_defense:7,strong_players:6,resistant_players:7,critical:3,attack_speed:6,cast_speed:12,life_steal:9,attack_block:9,hp:180};
  for(const [kind,,values] of ENCHANT_TIERS){
   const keys=tierKeys(kind),allKeys=suffixes.map(suffix=>`enchant_${kind}_tier_${suffix}`);
   const needsExpansion=columns.has(allKeys[2])&&!columns.has(allKeys[3])&&!columns.has(allKeys[4]);
   const defaults=[values[0],values[1],middle[kind],values[2],values[3]];
   for(let i=0;i<allKeys.length;i++)if(!columns.has(allKeys[i]))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${allKeys[i]} INTEGER NOT NULL DEFAULT ${defaults[i]}`);
   // Only an actual three-column schema needs settings expansion. Column
   // presence fences it once; no current settings or inventory migration.
   if(needsExpansion&&legacy){
    const next=enchantTierValues(legacy,kind);
    db.prepare(`UPDATE combat_settings SET ${keys.map(k=>`${k}=?`).join(',')} WHERE id=1`).run(...next);
   }
  }
  if(!columns.has('enchant_cast_speed_weight'))db.exec('ALTER TABLE combat_settings ADD COLUMN enchant_cast_speed_weight REAL NOT NULL DEFAULT 0.8');
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
