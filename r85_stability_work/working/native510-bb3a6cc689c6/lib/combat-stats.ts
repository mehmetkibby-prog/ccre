import {equipmentSetBonuses} from './equipment-sets.mjs';
export type GearKind = "weapon" | "armor" | "helmet" | "shoes" | "necklace";
export type EnchantmentKind = "stone_talisman" | "stone_talisman_color" | "forest_power" | "frozen_power" | "fire" | "ice" | "sword_defense" | "arrow_defense" | "magic_defense" | "strong_players" | "resistant_players" | "critical" | "attack_speed" | "cast_speed" | "life_steal" | "attack_block" | "hp" | "stone_critical" | "stone_attack" | "stone_defense" | "stone_block" | "evolution_level" | "evolution_kills" | "evolution_attack" | "evolution_critical" | "evolution_players";
export type Enchantment = { kind: EnchantmentKind; value: number };

export const REGION_POWER_VALUES = [5, 7, 10] as const;
export function regionalMonsterMultiplier(area: string, forestPower: number, frozenPower: number, isStone = false) {
  const value = isStone ? 0 : area === "forest" ? forestPower : area === "frozen" ? frozenPower : 0;
  return 1 + Math.max(0, Math.min(10, Number(value) || 0)) / 100;
}

export const ATTACK_SPEED_ENCHANT_VALUES = [5, 7, 10] as const;
// Temel saldırı bir yetenek bekleme süresi taşımaz. Bu sabit yalnız ayrı
// silah vuruşlarını ritme sokar; silahın saldırı hızı efsunu ritmi kısaltabilir.
export const BASIC_ATTACK_CADENCE_MS = 650;
export const BASIC_ATTACK_INPUT_BUFFER_MS = 320;
// Mobil ağlarda art arda iki isteğin varış sırası/RTT farkı 80 ms'yi kolayca
// aşabiliyor. Rezervasyon uzun dönem ritmini korurken bu pay yalnız tek paketin
// doğal ağ dalgalanması yüzünden reddedilmesini önler.
export const BASIC_ATTACK_NETWORK_JITTER_ALLOWANCE_MS = 220;

export function basicAttackBufferDelayMs(readyAtMs: number, nowMs: number) {
  if (!Number.isFinite(readyAtMs) || !Number.isFinite(nowMs)) return null;
  const remainingMs = readyAtMs - nowMs;
  return remainingMs > 0 && remainingMs <= BASIC_ATTACK_INPUT_BUFFER_MS
    ? Math.max(1, Math.ceil(remainingMs))
    : null;
}

export type StatItem = {
  kind: string;
  rarity?: string | null;
  power?: number | null;
  enchantments?: string | null;
  equipped?: number | null;
};

export type CombatStatSettings = {
  player_max_hp: number;
  guardian_base_attack: number;
  hunter_base_attack: number;
  arcanist_base_attack: number;
  base_critical_chance: number;
  third_skill_critical_bonus: number;
  critical_damage_multiplier: number;
  wing_attack_bonus: number;
  wing_defense_bonus: number;
  wing_critical_chance: number;
};

const validEnchantments = new Set<EnchantmentKind>([
 "stone_talisman","stone_talisman_color",
  "evolution_level","evolution_kills","evolution_attack","evolution_critical","evolution_players",
  "forest_power", "frozen_power", "fire", "ice", "sword_defense", "arrow_defense", "magic_defense", "strong_players", "resistant_players", "critical", "attack_speed", "cast_speed", "life_steal", "attack_block", "hp", "stone_critical", "stone_attack", "stone_defense", "stone_block",
]);

const weaponForbiddenEnchantments = new Set<EnchantmentKind>([
  "sword_defense", "arrow_defense", "magic_defense", "resistant_players", "attack_block", "hp",
]);

export function enchantmentFitsItem(kind: EnchantmentKind, itemKind?: string) {
  if (!itemKind) return true;
  if(['forest_power','frozen_power','cast_speed'].includes(kind))return ['weapon','armor','necklace'].includes(itemKind);
  if(kind==="stone_talisman"||kind==="stone_talisman_color")return itemKind==="weapon";
  if (kind.startsWith("evolution_")) return itemKind === "weapon";
  if (kind === "attack_block") return itemKind === "armor" || itemKind === "helmet";
  if (kind === "stone_critical" || kind === "stone_attack") return itemKind === "weapon";
  if (kind === "stone_defense" || kind === "stone_block") return itemKind === "armor";
  if (itemKind === "weapon") return !weaponForbiddenEnchantments.has(kind);
  if (itemKind === "armor" || itemKind === "helmet") return kind !== "fire" && kind !== "ice" && kind !== "attack_speed";
  return kind !== "fire" && kind !== "ice" && kind !== "attack_speed" && kind !== "life_steal";
}

export function isGearKind(value: unknown): value is GearKind {
  return value === "weapon" || value === "armor" || value === "helmet" || value === "shoes" || value === "necklace";
}

export function parseEnchantments(value: unknown, itemKind?: string): Enchantment[] {
  if (typeof value !== "string" || !value) return [];
  try {
    const parsed = JSON.parse(value) as Array<{ kind?: unknown; value?: unknown }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is { kind: EnchantmentKind; value: number } => (
        validEnchantments.has(entry.kind as EnchantmentKind)
        && Number.isFinite(Number(entry.value))
        && (!["forest_power", "frozen_power"].includes(String(entry.kind)) || (Number.isInteger(Number(entry.value)) && Number(entry.value) >= 1 && Number(entry.value) <= 10))
        && (!["attack_speed", "cast_speed", "life_steal", "attack_block"].includes(String(entry.kind)) || Number(entry.value) > 0)
        && enchantmentFitsItem(entry.kind as EnchantmentKind, itemKind)
      ))
      .map((entry) => ({
        kind: entry.kind,
        value: entry.kind.startsWith("evolution_") ? Math.max(0,Math.min(entry.kind === "evolution_kills" ? 1e9 : entry.kind === "evolution_level" ? 3 : entry.kind === "evolution_attack" ? 100000 : 80,Math.floor(Number(entry.value)))) : entry.kind === "cast_speed" ? Math.max(1,Math.min(50,Math.round(Number(entry.value)))) : entry.kind === "attack_speed"
          ? Math.max(1, Math.min(80, Math.round(Number(entry.value))))
          : entry.kind === "stone_critical" ? Math.max(7, Math.min(10, Math.round(Number(entry.value))))
          : entry.kind === "stone_attack" ? Math.max(20, Math.min(30, Math.round(Number(entry.value))))
          : entry.kind === "stone_defense" ? Math.max(30, Math.min(50, Math.round(Number(entry.value))))
          : entry.kind === "stone_block" ? Math.max(6, Math.min(8, Math.round(Number(entry.value))))
          : entry.kind === "life_steal" || entry.kind === "attack_block" ? Math.max(1, Math.min(15, Math.round(Number(entry.value))))
          : Math.max(0, Math.min(entry.kind === "hp" ? 1_000_000 : 95, Math.round(Number(entry.value)))),
      }));
  } catch { return []; }
}

function totalParsedEnchantments(entries: Enchantment[], kind: EnchantmentKind) {
  const total=entries.filter(entry=>entry.kind===kind).reduce((sum,entry)=>sum+entry.value,0);
  const cap = kind === "cast_speed" ? 50 : kind === "forest_power" || kind === "frozen_power" ? 10 : kind === "stone_attack" ? 30 : kind === "stone_defense" ? 50 : kind === "stone_critical" ? 10 : kind === "stone_block" ? 8 : kind === "life_steal" ? 15 : kind === "attack_block" ? 15 : kind === "hp" ? 3_000_000 : kind === "resistant_players" ? 90 : 80;
  const evoKind = kind === "stone_attack" ? "evolution_attack" : kind === "critical" ? "evolution_critical" : kind === "strong_players" ? "evolution_players" : null;
  const talisman=kind==="stone_attack"&&entries.some(e=>e.kind==="stone_talisman")?15:0;
  const evolution = evoKind ? entries.filter(e=>e.kind===evoKind).reduce((sum,e)=>sum+e.value,0) : 0;
  return Math.max(0, Math.min(cap, total)) + evolution + talisman;
}

// Keep this closure request-local: later equipment edits must be read again.
export function createEnchantmentTotals(items: Array<Pick<StatItem, "kind" | "enchantments">>) {
  const entries = items.flatMap(item => parseEnchantments(item.enchantments, item.kind));
  return (kind: EnchantmentKind) => totalParsedEnchantments(entries, kind);
}

export function enchantmentTotal(items: Array<Pick<StatItem, "kind" | "enchantments">>, kind: EnchantmentKind) {
  return totalParsedEnchantments(items.flatMap(item=>parseEnchantments(item.enchantments,item.kind)),kind);
}

export function attackIsBlocked(percent: number, roll = Math.random()) {
  const chance = Math.max(0, Math.min(15, Number(percent) || 0));
  return chance > 0 && Number.isFinite(roll) && roll >= 0 && roll < chance / 100;
}

export { effectiveAttackCooldownMs } from './class-combat.mjs';

export function effectivePlayerMaxHp(baseMaxHp: number, items: Array<Pick<StatItem, "kind" | "enchantments">>) {
  return Math.max(1, Math.round(baseMaxHp) + enchantmentTotal(items, "hp"));
}

export function calculateEquipmentStats(
  role: string,
  items: StatItem[],
  settings: CombatStatSettings,
  wingsEquipped: boolean,
  weaponSkin = false,
  rank = {hp:0,defense:0,pve:0,pvp:0},
  guild = {attack:0,hp:0,xp:0},
  premium = {attack:0,hp:0},
) {
  const equipped = items.filter((item) => item.equipped === 1 && (isGearKind(item.kind) || item.kind === "costume"));
  const total = createEnchantmentTotals(equipped);
  const set = equipmentSetBonuses(equipped);
  const weaponPower = equipped.filter((item) => item.kind === "weapon").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_attack");
  const armorPower = equipped.filter((item) => item.kind !== "weapon").reduce((sum, item) => sum + Math.max(0, Number(item.power) || 0), 0) + total("stone_defense");
  const hpBonus = total("hp") + set.hp;
  const roleBaseAttack = role === "arkanist" ? settings.arcanist_base_attack : role === "avci" ? settings.hunter_base_attack : settings.guardian_base_attack;
  const criticalBonus = total("critical") + total("stone_critical");
  const criticalChance = Math.max(0, Math.min(.95, settings.base_critical_chance + (wingsEquipped ? settings.wing_critical_chance : 0) + criticalBonus / 100));
  return {
    baseMaxHp: Math.max(1, Math.round(settings.player_max_hp)),
    hpBonus,
    maxHp: Math.max(1, Math.round(settings.player_max_hp) + hpBonus + rank.hp + guild.hp + premium.hp),
    roleBaseAttack,
    weaponPower,
    weaponSkinAttack: weaponSkin ? 20 : 0,
    monsterPower: (weaponSkin ? 10 : 0) + rank.pve + set.pve + (total("stone_talisman")>0?2:0),
    attack: (set.attack??0) + roleBaseAttack + guild.attack + premium.attack + weaponPower + (weaponSkin ? 20 : 0) + (wingsEquipped ? settings.wing_attack_bonus : 0),
    armorPower,
    defense: armorPower + (wingsEquipped ? settings.wing_defense_bonus : 0) + rank.defense,
    forestPower: total("forest_power"),
    frozenPower: total("frozen_power"),
    fire: total("fire"),
    ice: total("ice"),
    swordDefense: total("sword_defense"),
    arrowDefense: total("arrow_defense"),
    magicDefense: total("magic_defense"),
    strongPlayers: total("strong_players") + rank.pvp + set.pvp,
    resistantPlayers: total("resistant_players") + set.resistance,
    criticalBonus,
    attackSpeed: total("attack_speed") + set.speed,
    castSpeed: total("cast_speed"),
    lifeSteal: total("life_steal"),
    attackBlock: total("attack_block") + total("stone_block"),
    criticalChance,
    thirdSkillCriticalChance: Math.max(0, Math.min(.95, criticalChance + settings.third_skill_critical_bonus)),
    criticalDamageMultiplier: settings.critical_damage_multiplier,
  };
}

// Accessories are shared; weapons and armor retain their class identity.
export function canEquipGear(item: { kind: string; role?: string | null }, role: string | null | undefined) {
  return isGearKind(item.kind) && (item.kind === "shoes" || item.kind === "necklace" || item.role === role);
}

export const GEAR_REQUIRED_LEVELS = { white: 1, blue: 7, orange: 20, red: 30, purple: 60, unique: 50, infinite: 50, emerald: 65 } as const;
export function requiredGearLevel(rarity: unknown): number {
  return typeof rarity === 'string' && rarity in GEAR_REQUIRED_LEVELS ? GEAR_REQUIRED_LEVELS[rarity as keyof typeof GEAR_REQUIRED_LEVELS] : 1;
}
export function meetsGearLevel(item: {rarity?: string | null}, level: number | null | undefined) {
  return Number.isFinite(level) && Number(level) >= requiredGearLevel(item.rarity);
}
