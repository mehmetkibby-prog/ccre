import type {GameSettings,GearKind,Enchantment,EnchantmentKind} from "./game-world";
import {enchantmentFitsItem} from "./combat-stats";
const clamp=(value:number,min:number,max:number)=>Math.max(min,Math.min(max,value));
import {rollEnchantmentValue} from "./enchantment-tiers.mjs";
const enchantKinds: Array<{ kind: EnchantmentKind; weight?: keyof GameSettings; min?: keyof GameSettings; max?: keyof GameSettings }> = [
  { kind: "forest_power", weight: "enchant_forest_power_weight" },
  { kind: "frozen_power", weight: "enchant_frozen_power_weight" },
  { kind: "fire", weight: "enchant_fire_weight", min: "enchant_fire_min", max: "enchant_fire_max" },
  { kind: "ice", weight: "enchant_ice_weight", min: "enchant_ice_min", max: "enchant_ice_max" },
  { kind: "sword_defense", weight: "enchant_sword_defense_weight", min: "enchant_sword_defense_min", max: "enchant_sword_defense_max" },
  { kind: "arrow_defense", weight: "enchant_arrow_defense_weight", min: "enchant_arrow_defense_min", max: "enchant_arrow_defense_max" },
  { kind: "magic_defense", weight: "enchant_magic_defense_weight", min: "enchant_magic_defense_min", max: "enchant_magic_defense_max" },
  { kind: "strong_players", weight: "enchant_strong_players_weight", min: "enchant_strong_players_min", max: "enchant_strong_players_max" },
  { kind: "resistant_players", weight: "enchant_resistant_players_weight", min: "enchant_resistant_players_min", max: "enchant_resistant_players_max" },
  { kind: "critical", weight: "enchant_critical_weight", min: "enchant_critical_min", max: "enchant_critical_max" },
  { kind: "attack_speed", weight: "enchant_attack_speed_weight", min: "enchant_attack_speed_min", max: "enchant_attack_speed_max" },
  {kind:"cast_speed",weight:"enchant_cast_speed_weight"},
  { kind: "life_steal", weight: "enchant_life_steal_weight", min: "enchant_life_steal_min", max: "enchant_life_steal_max" },
  { kind: "attack_block", weight: "enchant_attack_block_weight", min: "enchant_attack_block_min", max: "enchant_attack_block_max" },
  { kind: "hp", weight: "enchant_hp_weight" },
];

export function rollEnchantments(settings: GameSettings, itemKind: GearKind): Enchantment[] {
  if (Math.random() >= clamp(settings.enchant_item_chance, 0, 1)) return [];
  const countChances = [
    clamp(settings.enchant_one_chance, 0, 1),
    clamp(settings.enchant_two_chance, 0, 1),
    clamp(settings.enchant_three_chance, 0, 1),
    clamp(settings.enchant_four_chance, 0, 1),
  ];
  const totalChance = countChances.reduce((sum, chance) => sum + chance, 0);
  let countRoll = Math.random() * Math.max(Number.EPSILON, totalChance);
  let wanted = 1;
  for (let index = 0; index < countChances.length; index += 1) {
    countRoll -= countChances[index];
    if (countRoll <= 0) { wanted = index + 1; break; }
  }
  const pool = enchantKinds
    .filter((entry) => enchantmentFitsItem(entry.kind, itemKind) && !(itemKind === "armor" && entry.kind === "critical"))
    .map((entry) => ({ ...entry, score: Math.random() * Math.max(0, entry.weight ? Number(settings[entry.weight]) : .8) }));
  return pool.filter((entry) => entry.score > 0).sort((a, b) => b.score - a.score).slice(0, wanted).map((entry) => {
    return {kind:entry.kind,value:rollEnchantmentValue(settings,entry.kind)};
  });
}

