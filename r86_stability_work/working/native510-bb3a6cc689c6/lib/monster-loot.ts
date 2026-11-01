import {emeraldName444,emeraldPower444} from './emerald-set.mjs';
import {materialForSource,progressionMaterial,UPGRADE_MATERIAL_KINDS} from './progression-materials.mjs';
export const LOOT_PPM = 1_000_000;
export const LOOT_BPS = 10_000;
export const MAX_LOOT_GROUPS = 12;
export const MAX_LOOT_OUTCOMES_PER_GROUP = 32;
export const MAX_LOOT_ROLLS = 24;
// Admin JSON bodies are capped at 16 KiB. Leave room for the action wrapper,
// source key, expected revision and JSON punctuation.
export const MAX_LOOT_PROFILE_JSON_BYTES = 12_000;

export const LOOT_GEAR_KINDS = ["weapon", "armor", "helmet", "shoes", "necklace"] as const;
export const OPEN_WORLD_LOOT_GEAR_KINDS = ["weapon", "armor", "shoes", "necklace"] as const;
export const LOOT_RARITIES = ["white", "blue", "orange", "red"] as const;
export const LOOT_RESOURCE_KINDS = ["essence", "stone_dust", "pearl", "stone_book", "evolution_scroll", "strong_branch", "strong_crystal", "desert_plant", "master_scroll"] as const;
/** These remain the only materials editable in the per-monster loot editor. */
export const SPECIAL_LOOT_RESOURCES = ["pearl", "stone_dust"] as const;
export type SpecialLootResource = (typeof SPECIAL_LOOT_RESOURCES)[number];
export type SpecialLootRule = { chancePpm: number; minAmount: number; maxAmount: number };
export const LOOT_ITEM_FAMILIES = ["generic", "sinsi"] as const;

export const LOOT_SOURCE_DEFINITIONS = [
  {key:"ancient.golge.normal",label:"Kadim Kök Vadisi · Kızıl Pençe",zone:"ancient"},
  {key:"ancient.curuk.normal",label:"Kadim Kök Vadisi · Kök Muhafızı",zone:"ancient"},
  {key:"ancient.yutan.normal",label:"Kadim Kök Vadisi · Kül Kâhini",zone:"ancient"},
  { key: "black.slot1", label: "Kara Bölge · 1. Obsidyen Akrep", zone: "black" },
  { key: "black.slot2", label: "Kara Bölge · 2. Kumtaşı Golemi", zone: "black" },
  { key: "black.slot3", label: "Kara Bölge · 3. Mezar Muhafızı", zone: "black" },
  { key: "black.slot4", label: "Kara Bölge · 4. Kül Çakalı", zone: "black" },
  { key: "black.slot5", label: "Kara Bölge · 5. Obsidyen Akrep", zone: "black" },
  { key: "black.slot6", label: "Kara Bölge · 6. Kumtaşı Golemi", zone: "black" },
  { key: "black.slot7", label: "Kara Bölge · 7. Mezar Muhafızı", zone: "black" },
  { key: "black.slot8", label: "Kara Bölge · 8. Kül Çakalı", zone: "black" },

  { key: "forest.golge.normal", label: "Kuzey Ormanı · Gölge Kurdu · Normal", zone: "forest" },
  { key: "forest.golge.agresif", label: "Kuzey Ormanı · Gölge Kurdu · Agresif", zone: "forest" },
  { key: "forest.golge.katil", label: "Kuzey Ormanı · Gölge Kurdu · Katil", zone: "forest" },
  { key: "forest.curuk.normal", label: "Kuzey Ormanı · Çürük Muhafız · Normal", zone: "forest" },
  { key: "forest.curuk.agresif", label: "Kuzey Ormanı · Çürük Muhafız · Agresif", zone: "forest" },
  { key: "forest.curuk.katil", label: "Kuzey Ormanı · Çürük Muhafız · Katil", zone: "forest" },
  { key: "forest.yutan.normal", label: "Kuzey Ormanı · Öz Yutan · Normal", zone: "forest" },
  { key: "forest.yutan.agresif", label: "Kuzey Ormanı · Öz Yutan · Agresif", zone: "forest" },
  { key: "forest.yutan.katil", label: "Kuzey Ormanı · Öz Yutan · Katil", zone: "forest" },
  { key: "frozen.golge.normal", label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Normal", zone: "frozen" },
  { key: "frozen.golge.agresif", label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Agresif", zone: "frozen" },
  { key: "frozen.golge.katil", label: "Donmuş Çam Geçidi · Kırağı Vaşağı · Katil", zone: "frozen" },
  { key: "frozen.curuk.normal", label: "Donmuş Çam Geçidi · Buzkök Golemi · Normal", zone: "frozen" },
  { key: "frozen.curuk.agresif", label: "Donmuş Çam Geçidi · Buzkök Golemi · Agresif", zone: "frozen" },
  { key: "frozen.curuk.katil", label: "Donmuş Çam Geçidi · Buzkök Golemi · Katil", zone: "frozen" },
  { key: "frozen.yutan.normal", label: "Donmuş Çam Geçidi · Tipi Kâhini · Normal", zone: "frozen" },
  { key: "frozen.yutan.agresif", label: "Donmuş Çam Geçidi · Tipi Kâhini · Agresif", zone: "frozen" },
  { key: "frozen.yutan.katil", label: "Donmuş Çam Geçidi · Tipi Kâhini · Katil", zone: "frozen" },
  { key: "sinsi.golge.agresif", label: "Sinsi Taş Vadisi · Sinsi Gölge Kurdu", zone: "sinsi" },
  { key: "sinsi.curuk.agresif", label: "Sinsi Taş Vadisi · Sinsi Muhafız", zone: "sinsi" },
  { key: "sinsi.yutan.katil", label: "Sinsi Taş Vadisi · Sinsi Öz Yutan", zone: "sinsi" },
  { key: "sinsi.stone", label: "Sinsi Taş Vadisi · Sinsi Taş", zone: "sinsi" },
  { key: "boss.world", label: "Dünya Bossu · Çürümenin Kadimi", zone: "boss" },
  { key: "boss.frozen_throne", label: "Ayaz Tahtının Bekçisi", zone: "boss" },
  { key: "boss.frozen_water", label: "Buzgölü Semenderi", zone: "boss" },
] as const;

export type LootSourceDefinition = (typeof LOOT_SOURCE_DEFINITIONS)[number];
export type LootSourceKey = LootSourceDefinition["key"];
export type LootZone = LootSourceDefinition["zone"];
export type LootGearKind = (typeof LOOT_GEAR_KINDS)[number];
export type LootRarity = (typeof LOOT_RARITIES)[number];
export type LootResourceKind = (typeof LOOT_RESOURCE_KINDS)[number];
export type LootItemFamily = (typeof LOOT_ITEM_FAMILIES)[number];

export type LootGearItem = {
  type: "gear";
  family: LootItemFamily;
  kind: LootGearKind;
  rarity: LootRarity | "purple" | "emerald";
};

export type LootResourceItem = {
  type: "resource";
  kind: LootResourceKind;
};

export type LootItem = LootGearItem | LootResourceItem;

export type LootOutcome = {
  id: string;
  item: LootItem;
  /** Exact chance in parts per million; outcomes in one group are mutually exclusive. */
  baseChancePpm: number;
  minAmount: number;
  maxAmount: number;
  /** Relative share of the Drop Charm's added probability. Zero means no charm bonus. */
  charmWeight: number;
};

export type LootGroup = {
  id: string;
  label: string;
  /** Independent equipment gate. When present, outcome chances are conditional on this gate. */
  equipmentChancePpm?: number;
  /** New normal-monster profiles store actual per-kill odds in outcomes. */
  gearChanceModel?: "direct";
  /** Number of independent rolls of this group for every eligible participant. */
  rolls: number;
  /** 10,000 = no bonus, 15,000 = 1.5x total chance while Drop Charm is active. */
  charmMultiplierBps: number;
  outcomes: LootOutcome[];
};

export type MonsterLootProfile = {
  version: 1;
  key: LootSourceKey;
  label: string;
  groups: LootGroup[];
};

export type LootProfileRecord = {
  sourceKey: LootSourceKey;
  revision: number;
  customized: boolean;
  updatedAt: number;
  profile: MonsterLootProfile;
};

export type LootTemplateRecord = {
  id: string;
  name: string;
  revision: number;
  updatedAt: number;
  groups: LootGroup[];
};

export type EffectiveLootOutcome = LootOutcome & { effectiveChancePpm: number; conditionalChancePpm?: number };
export type EffectiveLootGroup = Omit<LootGroup, "outcomes"> & {
  baseTotalChancePpm: number;
  effectiveTotalChancePpm: number;
  outcomes: EffectiveLootOutcome[];
};

export type RolledLoot = {
  groupId: string;
  rollIndex: number;
  outcomeId: string;
  item: LootItem;
  amount: number;
  chancePpm: number;
};

export type LootProfileSnapshotColumns = {
  events_snapshot?: string | null;
  loot_source_key?: string | null;
  loot_profile_revision?: number | null;
  loot_profile_json?: string | null;
};

export type LootProfileSnapshot = {
  lootSourceKey: LootSourceKey;
  lootProfileRevision: number;
  lootProfileJson: string;
};

export const SIMPLE_LOOT_BUCKET_IDS = [
  "red_all",
  "orange_main",
  "orange_accessory",
  "blue_main",
  "blue_accessory",
  "white_main",
  "white_accessory",
] as const;

export type SimpleLootBucketId = (typeof SIMPLE_LOOT_BUCKET_IDS)[number];
export type SimpleLootChances = Record<SimpleLootBucketId, number>;

/**
 * Every value is an absolute per-kill chance in parts per million. These seven
 * mutually exclusive buckets add up to the one and only equipment roll.
 */
export const FOREST_SIMPLE_LOOT_CHANCES: Readonly<SimpleLootChances> = {
  red_all: 10_000,
  orange_main: 50_000,
  orange_accessory: 30_000,
  blue_main: 150_000,
  blue_accessory: 50_000,
  white_main: 350_000,
  white_accessory: 80_000,
};

/** Donmuş Çam uses the North Forest table with a modest 10% increase. */
export const FROZEN_SIMPLE_LOOT_CHANCES: Readonly<SimpleLootChances> = {
  red_all: 11_000,
  orange_main: 55_000,
  orange_accessory: 33_000,
  blue_main: 165_000,
  blue_accessory: 55_000,
  white_main: 385_000,
  white_accessory: 88_000,
};

/** Kadim Kök's normal monsters retain the 20% equipment gate. Their default
 * color distribution is just above Frozen, instead of falling back to the
 * legacy regular table that made almost every awarded item white. */
export const ANCIENT_SIMPLE_LOOT_CHANCES: Readonly<SimpleLootChances> = {
  red_all: 6_000,
  orange_main: 57_000,
  orange_accessory: 35_000,
  blue_main: 170_000,
  blue_accessory: 60_000,
  white_main: 535_000,
  white_accessory: 137_000,
};

export type LegacyLootSettings = {
  boss_guaranteed_white_drops: number;
  regular_blue_chance: number;
  regular_orange_chance: number;
  regular_red_chance: number;
  regular_item_drop_chance: number;
  regular_armor_chance: number;
  boss_blue_chance: number;
  boss_orange_chance: number;
  boss_red_chance: number;
  boss_armor_chance: number;
  sinsi_stone_essence_min: number;
  sinsi_stone_essence_max: number;
  sinsi_stone_gear_drops: number;
  sinsi_stone_dust_reward: number;
  sinsi_stone_armor_chance: number;
  sinsi_stone_blue_chance: number;
  sinsi_stone_orange_chance: number;
  sinsi_stone_red_chance: number;
  frozen_boss_item_drop_chance: number;
  frozen_boss_item_drop_count: number;
  frozen_water_item_drop_chance: number;
  frozen_water_item_drop_count: number;
  world_boss_stone_book_chance: number; world_boss_stone_book_min: number; world_boss_stone_book_max: number;
  world_boss_evolution_scroll_chance: number; world_boss_evolution_scroll_min: number; world_boss_evolution_scroll_max: number;
  frozen_boss_stone_book_chance: number; frozen_boss_stone_book_min: number; frozen_boss_stone_book_max: number;
  frozen_boss_evolution_scroll_chance: number; frozen_boss_evolution_scroll_min: number; frozen_boss_evolution_scroll_max: number;
  frozen_water_stone_book_chance: number; frozen_water_stone_book_min: number; frozen_water_stone_book_max: number;
  frozen_water_evolution_scroll_chance: number; frozen_water_evolution_scroll_min: number; frozen_water_evolution_scroll_max: number;
};

export type LegacyLootPowerSettings = {
  unique_weapon_power?: number; unique_armor_power?: number;
  white_weapon_power_min: number; white_weapon_power_max: number;
  white_armor_power_min: number; white_armor_power_max: number;
  blue_weapon_power_min: number; blue_weapon_power_max: number;
  blue_armor_power_min: number; blue_armor_power_max: number;
  orange_weapon_power_min: number; orange_weapon_power_max: number;
  orange_armor_power_min: number; orange_armor_power_max: number;
  red_weapon_power_min: number; red_weapon_power_max: number;
  red_armor_power_min: number; red_armor_power_max: number;
};

const SOURCE_KEYS = new Set<string>(LOOT_SOURCE_DEFINITIONS.map((entry) => entry.key));
const GEAR_KINDS = new Set<string>(LOOT_GEAR_KINDS);
const RARITIES = new Set<string>(LOOT_RARITIES);
const RESOURCE_KINDS = new Set<string>(LOOT_RESOURCE_KINDS);
const ITEM_FAMILIES = new Set<string>(LOOT_ITEM_FAMILIES);
const SAFE_ID = /^[a-z0-9][a-z0-9_-]{0,47}$/;
const SAFE_LABEL = /^[^\u0000-\u001f\u007f]{1,80}$/u;

export function isLootSourceKey(value: unknown): value is LootSourceKey {
  return typeof value === "string" && SOURCE_KEYS.has(value);
}

export function lootSourceDefinition(key: LootSourceKey) {
  return LOOT_SOURCE_DEFINITIONS.find((entry) => entry.key === key)!;
}

function finiteNumber(value: unknown, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function integerInRange(value: unknown, min: number, max: number) {
  return Number.isInteger(value) && Number(value) >= min && Number(value) <= max;
}

function chanceToPpm(value: unknown) {
  return Math.round(Math.max(0, Math.min(1, finiteNumber(value))) * LOOT_PPM);
}

function weightedSplit(total: number, weights: readonly number[]) {
  const safeTotal = Math.max(0, Math.floor(total));
  const safeWeights = weights.map((weight) => Math.max(0, finiteNumber(weight)));
  const weightTotal = safeWeights.reduce((sum, weight) => sum + weight, 0);
  if (safeTotal === 0 || weightTotal <= 0) return weights.map(() => 0);
  const exact = safeWeights.map((weight) => safeTotal * weight / weightTotal);
  const result = exact.map(Math.floor);
  const remainder = safeTotal - result.reduce((sum, value) => sum + value, 0);
  const priority = exact.map((value, index) => ({ index, fraction: value - Math.floor(value) }))
    .sort((a, b) => b.fraction - a.fraction || a.index - b.index);
  for (let index = 0; index < remainder; index += 1) result[priority[index % priority.length].index] += 1;
  return result;
}

function kindWeights(armorChance: number) {
  const armorPpm = chanceToPpm(armorChance);
  const accessories = weightedSplit(armorPpm, [1, 1, 1]);
  return [LOOT_PPM - armorPpm, ...accessories] as const;
}

function legacyRarityPpms(totalChance: number, redChance: number, orangeChance: number, blueChance: number) {
  let remaining = chanceToPpm(totalChance);
  const red = Math.min(remaining, chanceToPpm(redChance));
  remaining -= red;
  const orange = Math.min(remaining, chanceToPpm(orangeChance));
  remaining -= orange;
  const blue = Math.min(remaining, chanceToPpm(blueChance));
  remaining -= blue;
  return { white: remaining, blue, orange, red } satisfies Record<LootRarity, number>;
}

function gearOutcomes(
  rarityPpms: Record<LootRarity, number>,
  armorChance: number,
  family: LootItemFamily,
  charmEnabled: boolean,
) {
  const weights = kindWeights(armorChance);
  const outcomes: LootOutcome[] = [];
  for (const rarity of ["red", "orange", "blue", "white"] as const) {
    const chances = weightedSplit(rarityPpms[rarity], weights);
    for (let index = 0; index < OPEN_WORLD_LOOT_GEAR_KINDS.length; index += 1) {
      const kind = OPEN_WORLD_LOOT_GEAR_KINDS[index];
      outcomes.push({
        id: `${rarity}-${kind}`,
        item: { type: "gear", family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic", kind, rarity },
        baseChancePpm: chances[index],
        minAmount: 1,
        maxAmount: 1,
        // The charm raises the single general equipment gate while keeping the
        // configured kind/rarity distribution intact.
        charmWeight: charmEnabled ? chances[index] : 0,
      });
    }
  }
  return outcomes;
}

const SIMPLE_BUCKET_KINDS: Record<SimpleLootBucketId, readonly LootGearKind[]> = {
  red_all: ["weapon", "armor", "shoes", "necklace"],
  orange_main: ["weapon", "armor"],
  orange_accessory: ["shoes", "necklace"],
  blue_main: ["weapon", "armor"],
  blue_accessory: ["shoes", "necklace"],
  white_main: ["weapon", "armor"],
  white_accessory: ["shoes", "necklace"],
};

const SIMPLE_BUCKET_RARITY: Record<SimpleLootBucketId, LootRarity> = {
  red_all: "red",
  orange_main: "orange",
  orange_accessory: "orange",
  blue_main: "blue",
  blue_accessory: "blue",
  white_main: "white",
  white_accessory: "white",
};

function normalizedSimpleChance(value: unknown) {
  return Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(value))));
}

function simpleGearOutcomes(chances: SimpleLootChances, family: LootItemFamily) {
  const byOutcome = new Map<string, LootOutcome>();
  for (const bucketId of SIMPLE_LOOT_BUCKET_IDS) {
    const rarity = SIMPLE_BUCKET_RARITY[bucketId];
    const kinds = SIMPLE_BUCKET_KINDS[bucketId];
    const split = weightedSplit(normalizedSimpleChance(chances[bucketId]), kinds.map(() => 1));
    kinds.forEach((kind, index) => {
      const baseChancePpm = split[index];
      byOutcome.set(`${rarity}-${kind}`, {
        id: `${rarity}-${kind}`,
        item: {
          type: "gear",
          family: family === "sinsi" && (kind === "weapon" || kind === "armor") ? "sinsi" : "generic",
          kind,
          rarity,
        },
        baseChancePpm,
        minAmount: 1,
        maxAmount: 1,
        charmWeight: baseChancePpm,
      });
    });
  }
  return (["red", "orange", "blue", "white"] as const).flatMap((rarity) =>
    OPEN_WORLD_LOOT_GEAR_KINDS.map((kind) => byOutcome.get(`${rarity}-${kind}`)!).filter(Boolean));
}

export function extractSimpleLootChances(profile: MonsterLootProfile): SimpleLootChances {
  const result = Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id) => [id, 0])) as SimpleLootChances;
  const gearGroup = profile.groups.find((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
  for (const outcome of gearGroup?.outcomes ?? []) {
    if (outcome.item.type !== "gear") continue;
    const chance = normalizedSimpleChance(outcome.baseChancePpm);
    if (outcome.item.rarity === "purple") continue;
    if (outcome.item.rarity === "red") result.red_all += chance;
    else if (outcome.item.kind === "weapon" || outcome.item.kind === "armor") {
      result[`${outcome.item.rarity}_main`] += chance;
    } else {
      result[`${outcome.item.rarity}_accessory`] += chance;
    }
  }
  return result;
}

export function simpleLootTotalChancePpm(chances: SimpleLootChances) {
  return SIMPLE_LOOT_BUCKET_IDS.reduce((sum, id) => sum + normalizedSimpleChance(chances[id]), 0);
}

export function rescaleSimpleLootChances(chances: SimpleLootChances, requestedPpm: number): SimpleLootChances {
  const target = normalizedSimpleChance(requestedPpm);
  const current = SIMPLE_LOOT_BUCKET_IDS.map((id) => normalizedSimpleChance(chances[id]));
  const weights = current.some((value) => value > 0)
    ? current
    : SIMPLE_LOOT_BUCKET_IDS.map((id) => FOREST_SIMPLE_LOOT_CHANCES[id]);
  const scaled = weightedSplit(target, weights);
  return Object.fromEntries(SIMPLE_LOOT_BUCKET_IDS.map((id, index) => [id, scaled[index]])) as SimpleLootChances;
}

export function withSimpleLootChances(profile: MonsterLootProfile, chances: SimpleLootChances): MonsterLootProfile {
  const family: LootItemFamily = profile.key === "sinsi.stone" ? "sinsi" : "generic";
  let replaced = false;
  const groups = profile.groups.map((group) => {
    if (replaced || !group.outcomes.some((outcome) => outcome.item.type === "gear")) return group;
    replaced = true;
    return {
      ...group,
      rolls: 1,
      charmMultiplierBps: 15_000,
      outcomes: simpleGearOutcomes(chances, family),
    };
  });
  return { ...profile, groups };
}

export function equipmentDropChancePpm(profile: MonsterLootProfile) {
  const group = profile.groups.find(g => g.outcomes.some(o => o.item.type === "gear"));
  if (group?.gearChanceModel === "direct") return simpleLootTotalChancePpm(extractSimpleLootChances(profile));
  return group?.equipmentChancePpm ?? simpleLootTotalChancePpm(extractSimpleLootChances(profile));
}

export function withEquipmentDropChance(profile: MonsterLootProfile, chancePpm: number): MonsterLootProfile {
  if (profile.key.startsWith("boss.")) return profile;
  const group = profile.groups.find(g => g.gearChanceModel === "direct");
  if (group) return withSimpleLootChances(profile,
    rescaleSimpleLootChances(extractSimpleLootChances(profile), chancePpm));
  return { ...profile, groups: profile.groups.map(group => group.outcomes.some(o => o.item.type === "gear")
    ? { ...group, equipmentChancePpm: normalizedSimpleChance(chancePpm) } : group) };
}

/** Convert only the active normal-monster table. Historical kill snapshots keep
 * their recorded odds and the boss's three guaranteed rewards stay untouched. */
export function directLootProfile(profile: MonsterLootProfile): MonsterLootProfile {
  if (profile.key.startsWith("boss.")) return profile;
  const legacy = upgradeEquipmentDropProfile(profile);
  return { ...legacy, groups: legacy.groups.map(group => {
    if (!group.outcomes.some(outcome => outcome.item.type === "gear") || group.gearChanceModel === "direct") return group;
    const total = normalizedSimpleChance(group.equipmentChancePpm ?? 0);
    const buckets = rescaleSimpleLootChances(extractSimpleLootChances(legacy), total);
    const family: LootItemFamily = profile.key === "sinsi.stone" ? "sinsi" : "generic";
    const { equipmentChancePpm: _oldGate, ...rest } = group;
    return { ...rest, gearChanceModel: "direct" as const,
      outcomes: simpleGearOutcomes(buckets, family) };
  }) };
}

/** White equipment fills the remaining distribution; rare colors never change the gate. */
export function balanceWhiteLootChances(chances: SimpleLootChances): SimpleLootChances {
  const colored = chances.red_all + chances.orange_main + chances.orange_accessory + chances.blue_main + chances.blue_accessory;
  const weights = [chances.white_main, chances.white_accessory];
  const white = weightedSplit(Math.max(0, LOOT_PPM - colored), weights.some(v => v > 0) ? weights : [1, 1]);
  return { ...chances, white_main: white[0], white_accessory: white[1] };
}

/** One-time interpretation of legacy live tables. Stored revisions are never deleted.
 * Initial equipment chance is at most 20%; existing lower/disabled gates survive.
 * Old color percentages become conditional percentages, with red capped at 0.6%.
 * A saved new-model table carries its own gate and is never converted again. */
export function upgradeEquipmentDropProfile(profile: MonsterLootProfile): MonsterLootProfile {
  // Boss tables retain their original weights, charm behavior and guaranteed draws.
  if (profile.key.startsWith("boss.")) return profile;
  const group = profile.groups.find(g => g.outcomes.some(o => o.item.type === "gear"));
  if (!group || group.equipmentChancePpm !== undefined || group.gearChanceModel === "direct") return profile;
  const old = extractSimpleLootChances(profile);
  const gate = Math.min(200_000, simpleLootTotalChancePpm(old));
  const distribution = balanceWhiteLootChances({ ...old, red_all: Math.min(6_000, old.red_all) });
  return withEquipmentDropChance(withSimpleLootChances(profile, distribution), gate);
}

export function allowsSpecialLootResources(sourceKey: LootSourceKey) {
  return sourceKey === "sinsi.stone" || sourceKey === "boss.world"
    || sourceKey === "boss.frozen_throne" || sourceKey === "boss.frozen_water";
}

/** Taş Sanatı Kitabı is configured through global combat settings, not the
 * per-monster editor. It is valid only on the three actual boss profiles. */
function allowsProfileResource(sourceKey: LootSourceKey, kind: LootResourceKind) {
  if(UPGRADE_MATERIAL_KINDS.includes(kind))return materialForSource(sourceKey)===kind;
  if (SPECIAL_LOOT_RESOURCES.some((resource) => resource === kind)) {
    return allowsSpecialLootResources(sourceKey);
  }
  return (kind === "stone_book" || kind === "evolution_scroll") && sourceKey.startsWith("boss.");
}

/**
 * Older live profiles may still contain material groups that were legal in a
 * previous release but are no longer exposed by the editor. Remove only those
 * obsolete groups so an invisible legacy value cannot block an otherwise
 * unrelated admin save. Gear, Essence and every currently allowed boss/Sinsi
 * material remain byte-for-byte unchanged.
 */
export function withoutForbiddenLootResources(profile: MonsterLootProfile): MonsterLootProfile {
  const groups = profile.groups.filter((group) => !group.outcomes.some((outcome) =>
    outcome.item.type === "resource"
      && outcome.item.kind !== "essence"
      && !allowsProfileResource(profile.key, outcome.item.kind),
  ));
  return groups.length === profile.groups.length ? profile : { ...profile, groups };
}

export function getSpecialLootRule(profile: MonsterLootProfile, kind: SpecialLootResource): SpecialLootRule {
  for (const group of profile.groups) {
    const outcome = group.outcomes.find((entry) => entry.item.type === "resource" && entry.item.kind === kind);
    if (outcome) return { chancePpm: group.rolls > 0 ? outcome.baseChancePpm : 0, minAmount: outcome.minAmount, maxAmount: outcome.maxAmount };
  }
  return { chancePpm: 0, minAmount: 1, maxAmount: 1 };
}

/** Only these two independent materials are editable; gear and Essence stay intact. */
export function withSpecialLootRule(profile: MonsterLootProfile, kind: SpecialLootResource, rule: SpecialLootRule): MonsterLootProfile {
  if (!allowsSpecialLootResources(profile.key)) return profile;
  const existing = profile.groups.find((group) => group.outcomes.some((entry) => entry.item.type === "resource" && entry.item.kind === kind));
  const replacement: LootGroup = {
    id: existing?.id ?? (kind === "pearl" ? "pearl" : "stone-dust"),
    label: kind === "pearl" ? "İnci" : "Taş Tozu",
    rolls: 1,
    charmMultiplierBps: LOOT_BPS,
    outcomes: [{ id: kind, item: { type: "resource", kind }, baseChancePpm: rule.chancePpm,
      minAmount: rule.minAmount, maxAmount: rule.maxAmount, charmWeight: 0 }],
  };
  return { ...profile, groups: existing ? profile.groups.map((group) => group === existing ? replacement : group) : [...profile.groups, replacement] };
}

function resourceOutcome(kind: LootResourceKind, minAmount: number, maxAmount: number): LootOutcome {
  return {
    id: kind,
    item: { type: "resource", kind },
    baseChancePpm: LOOT_PPM,
    minAmount: Math.max(1, Math.floor(minAmount)),
    maxAmount: Math.max(1, Math.floor(maxAmount)),
    charmWeight: 0,
  };
}

function rareResourceOutcome(kind: LootResourceKind, chancePpm: number, minAmount = 1, maxAmount = minAmount): LootOutcome {
  const safeMin = Math.max(1, Math.floor(finiteNumber(minAmount, 1)));
  const safeMax = Math.max(safeMin, Math.floor(finiteNumber(maxAmount, safeMin)));
  return {
    ...resourceOutcome(kind, safeMin, safeMax),
    baseChancePpm: Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(chancePpm, 0)))),
  };
}

function variantEssenceRange(key: LootSourceKey) {
  if (key.endsWith(".katil")) return { min: 8, max: 13 };
  if (key.endsWith(".agresif")) return { min: 5, max: 8 };
  return { min: 2, max: 4 };
}

function regularProfile(key: LootSourceKey, settings: LegacyLootSettings) {
  const essence = variantEssenceRange(key);
  const simpleChances = key.startsWith("forest.")
    ? FOREST_SIMPLE_LOOT_CHANCES
    : key.startsWith("frozen.")
      ? FROZEN_SIMPLE_LOOT_CHANCES
      : key.startsWith("ancient.")
        ? ANCIENT_SIMPLE_LOOT_CHANCES
        : null;
  return [
    {
      id: "gear",
      label: "Ekipman",
      rolls: 1,
      charmMultiplierBps: 15_000,
      outcomes: simpleChances
        ? simpleGearOutcomes({ ...simpleChances }, "generic")
        : gearOutcomes(legacyRarityPpms(
          settings.regular_item_drop_chance,
          settings.regular_red_chance,
          settings.regular_orange_chance,
          settings.regular_blue_chance,
        ), settings.regular_armor_chance, "generic", true),
    },
    { id: "essence", label: "Yaşam Özü", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [resourceOutcome("essence", essence.min, essence.max)] },
  ] satisfies LootGroup[];
}

function frozenEliteProfile(key: "boss.frozen_throne" | "boss.frozen_water", settings: LegacyLootSettings) {
  const throne = key === "boss.frozen_throne";
  const totalChance = throne ? settings.frozen_boss_item_drop_chance : settings.frozen_water_item_drop_chance;
  return [
    {
      id: "gear",
      label: "Ekipman",
      rolls: 1,
      charmMultiplierBps: 15_000,
      outcomes: gearOutcomes(legacyRarityPpms(
        totalChance,
        settings.regular_red_chance,
        settings.regular_orange_chance,
        settings.regular_blue_chance,
      ), settings.regular_armor_chance, "generic", true),
    },
    {
      id: "essence",
      label: "Yaşam Özü",
      rolls: 1,
      charmMultiplierBps: LOOT_BPS,
      outcomes: [resourceOutcome("essence", throne ? 20 : 8, throne ? 35 : 14)],
    },
    { id: "stone-book", label: "Taş Sanatı Kitabı", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [rareResourceOutcome("stone_book", throne ? settings.frozen_boss_stone_book_chance * LOOT_PPM : settings.frozen_water_stone_book_chance * LOOT_PPM, throne ? settings.frozen_boss_stone_book_min : settings.frozen_water_stone_book_min, throne ? settings.frozen_boss_stone_book_max : settings.frozen_water_stone_book_max)] },
    { id: "evolution-scroll", label: "Evrim Parşömeni", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [rareResourceOutcome("evolution_scroll", throne ? settings.frozen_boss_evolution_scroll_chance * LOOT_PPM : settings.frozen_water_evolution_scroll_chance * LOOT_PPM, throne ? settings.frozen_boss_evolution_scroll_min : settings.frozen_water_evolution_scroll_min, throne ? settings.frozen_boss_evolution_scroll_max : settings.frozen_water_evolution_scroll_max)] },
  ] satisfies LootGroup[];
}

function worldBossProfile(settings: LegacyLootSettings) {
  const rarities = legacyRarityPpms(
    settings.regular_item_drop_chance,
    settings.boss_red_chance,
    settings.boss_orange_chance,
    settings.boss_blue_chance,
  );
  return [
    {
      id: "gear",
      label: "Ekipman",
      rolls: 1,
      charmMultiplierBps: 15_000,
      outcomes: gearOutcomes(rarities, settings.boss_armor_chance, "generic", true),
    },
    { id: "essence", label: "Yaşam Özü", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [resourceOutcome("essence", 28, 46)] },
    { id: "stone-book", label: "Taş Sanatı Kitabı", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [rareResourceOutcome("stone_book", settings.world_boss_stone_book_chance * LOOT_PPM, settings.world_boss_stone_book_min, settings.world_boss_stone_book_max)] },
    { id: "evolution-scroll", label: "Evrim Parşömeni", rolls: 1, charmMultiplierBps: LOOT_BPS, outcomes: [rareResourceOutcome("evolution_scroll", settings.world_boss_evolution_scroll_chance * LOOT_PPM, settings.world_boss_evolution_scroll_min, settings.world_boss_evolution_scroll_max)] },
  ] satisfies LootGroup[];
}

function sinsiStoneProfile(settings: LegacyLootSettings) {
  const essenceMin = Math.max(1, Math.floor(finiteNumber(settings.sinsi_stone_essence_min, 1)));
  const essenceMax = Math.max(essenceMin, Math.floor(finiteNumber(settings.sinsi_stone_essence_max, essenceMin)));
  const rarities = legacyRarityPpms(
    settings.sinsi_stone_gear_drops > 0 ? settings.regular_item_drop_chance : 0,
    settings.sinsi_stone_red_chance,
    settings.sinsi_stone_orange_chance,
    settings.sinsi_stone_blue_chance,
  );
  return [
    {
      id: "gear",
      label: "Sinsi ekipman",
      rolls: 1,
      charmMultiplierBps: 15_000,
      outcomes: gearOutcomes(rarities, settings.sinsi_stone_armor_chance, "sinsi", true),
    },
    {
      id: "stone-dust",
      label: "Taş Tozu",
      rolls: finiteNumber(settings.sinsi_stone_dust_reward) > 0 ? 1 : 0,
      charmMultiplierBps: LOOT_BPS,
      outcomes: [resourceOutcome("stone_dust", settings.sinsi_stone_dust_reward, settings.sinsi_stone_dust_reward)],
    },
    {
      id: "essence",
      label: "Yaşam Özü",
      rolls: 1,
      charmMultiplierBps: LOOT_BPS,
      outcomes: [resourceOutcome("essence", essenceMin, essenceMax)],
    },
  ] satisfies LootGroup[];
}

export function buildDefaultLootProfile(key: LootSourceKey, settings: LegacyLootSettings): MonsterLootProfile {
  const definition = lootSourceDefinition(key);
  let groups: LootGroup[];
  if (key === "boss.world") groups = worldBossProfile(settings);
  else if (key === "boss.frozen_throne" || key === "boss.frozen_water") groups = frozenEliteProfile(key, settings);
  else if (key === "sinsi.stone") groups = sinsiStoneProfile(settings);
  else groups = regularProfile(key, settings);
  const profile: MonsterLootProfile = { version: 1, key, label: definition.label, groups };
  // Legacy settings still provide sensible boss/Sinsi totals. Compile every
  // default into the same fixed table the simple admin edits, so no source has
  // a hidden type distribution or a different live contract.
  return upgradeEquipmentDropProfile(withSimpleLootChances(profile, extractSimpleLootChances(profile)));
}

type MonsterLootIdentity = {
  id?: string | null;
  name?: string | null;
  area?: string | null;
  variant?: string | null;
  is_boss?: number | boolean | null;
  is_stone?: number | boolean | null;
  summoned?: number | boolean | null;
};

function monsterSpecies(monster: MonsterLootIdentity) {
  const id = String(monster.id ?? "").toLocaleLowerCase("tr-TR");
  const name = String(monster.name ?? "").toLocaleLowerCase("tr-TR");
  if (id.startsWith("golge-") || name.includes("kurd") || name.includes("kurt")) return "golge" as const;
  if (id.startsWith("curuk-") || name.includes("muhafız") || name.includes("muhafiz")) return "curuk" as const;
  if (id.startsWith("yutan-") || name.includes("yutan")) return "yutan" as const;
  return null;
}

export function resolveLootSourceKey(monster: MonsterLootIdentity): LootSourceKey | null {
  const id = String(monster.id ?? "");
  if(monster.area === "afk")return null;
  if (monster.area === "black") {
    const slot = /-black-c[1-3]-([1-8])$/.exec(id)?.[1];
    return slot ? `black.slot${slot}` as LootSourceKey : null;
  }
  if (id === "frozen-boss-1" || id === "ancient-boss-1") return "boss.frozen_throne";
  if (id.startsWith("frozen-water-c")) return "boss.frozen_water";
  if (Boolean(monster.is_boss)) return "boss.world";
  if (Boolean(monster.is_stone)) return "sinsi.stone";
  const species = monsterSpecies(monster);
  if (!species) return null;
  if (monster.area === "sinsi" || Boolean(monster.summoned)) {
    if (species === "golge") return "sinsi.golge.agresif";
    if (species === "curuk") return "sinsi.curuk.agresif";
    return "sinsi.yutan.katil";
  }
  if(monster.area === "ancient")return `ancient.${species}.normal`;
  const zone = monster.area === "frozen" ? "frozen" : "forest";
  const rawVariant = String(monster.variant ?? "").toLocaleLowerCase("tr-TR");
  const variant = rawVariant === "katil" ? "katil" : rawVariant === "agresif" ? "agresif" : "normal";
  return `${zone}.${species}.${variant}` as LootSourceKey;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizedItem(value: unknown, path: string, errors: string[]): LootItem | null {
  if (!isRecord(value)) { errors.push(`${path}: Geçerli bir eşya seçilmelidir.`); return null; }
  if (value.type === "gear") {
    if (!ITEM_FAMILIES.has(String(value.family))) errors.push(`${path}.family: Bilinmeyen ekipman ailesi.`);
    if (!GEAR_KINDS.has(String(value.kind))) errors.push(`${path}.kind: Bilinmeyen ekipman türü.`);
    if (!RARITIES.has(String(value.rarity))) errors.push(`${path}.rarity: Bilinmeyen nadirlik.`);
    if (!ITEM_FAMILIES.has(String(value.family)) || !GEAR_KINDS.has(String(value.kind)) || !RARITIES.has(String(value.rarity))) return null;
    if (value.family === "sinsi" && value.kind !== "weapon" && value.kind !== "armor") {
      errors.push(`${path}: Sinsi aile yalnız silah ve zırhta kullanılabilir.`);
      return null;
    }
    return { type: "gear", family: value.family as LootItemFamily, kind: value.kind as LootGearKind, rarity: value.rarity as LootRarity };
  }
  if (value.type === "resource") {
    if (!RESOURCE_KINDS.has(String(value.kind))) { errors.push(`${path}.kind: Bilinmeyen kaynak türü.`); return null; }
    return { type: "resource", kind: value.kind as LootResourceKind };
  }
  errors.push(`${path}.type: Yalnız ekipman veya kaynak seçilebilir.`);
  return null;
}

export type LootProfileValidationResult =
  | { ok: true; profile: MonsterLootProfile }
  | { ok: false; errors: string[] };

export function validateLootProfile(sourceKey: LootSourceKey, input: unknown): LootProfileValidationResult {
  const errors: string[] = [];
  if (!isLootSourceKey(sourceKey)) return { ok: false, errors: ["Bilinmeyen canavar veya boss profili."] };
  if (!isRecord(input)) return { ok: false, errors: ["Ganimet profili geçerli bir nesne olmalıdır."] };
  if (input.version !== 1) errors.push("version: Yalnız profil sürümü 1 destekleniyor.");
  if (input.key !== sourceKey) errors.push("key: Profil, seçilen canavar veya boss ile eşleşmiyor.");
  if (!Array.isArray(input.groups)) errors.push("groups: Ganimet grupları liste olmalıdır.");
  else if (input.groups.length > MAX_LOOT_GROUPS) errors.push(`groups: En fazla ${MAX_LOOT_GROUPS} grup kullanılabilir.`);

  const groups: LootGroup[] = [];
  const groupIds = new Set<string>();
  let totalRolls = 0;
  if (Array.isArray(input.groups)) input.groups.slice(0, MAX_LOOT_GROUPS + 1).forEach((rawGroup, groupIndex) => {
    const path = `groups[${groupIndex}]`;
    if (!isRecord(rawGroup)) { errors.push(`${path}: Geçerli bir grup olmalıdır.`); return; }
    const id = typeof rawGroup.id === "string" ? rawGroup.id.trim() : "";
    const label = typeof rawGroup.label === "string" ? rawGroup.label.trim() : "";
    if (!SAFE_ID.test(id)) errors.push(`${path}.id: 1-48 karakterlik güvenli bir kimlik olmalıdır.`);
    if (groupIds.has(id)) errors.push(`${path}.id: Grup kimlikleri benzersiz olmalıdır.`);
    groupIds.add(id);
    if (!SAFE_LABEL.test(label)) errors.push(`${path}.label: 1-80 karakterlik geçerli bir başlık olmalıdır.`);
    if (!integerInRange(rawGroup.rolls, 0, 12)) errors.push(`${path}.rolls: 0 ile 12 arasında tam sayı olmalıdır.`);
    if (!integerInRange(rawGroup.charmMultiplierBps, LOOT_BPS, 30_000)) {
      errors.push(`${path}.charmMultiplierBps: 10000 ile 30000 arasında tam sayı olmalıdır.`);
    }
    const rolls = integerInRange(rawGroup.rolls, 0, 12) ? Number(rawGroup.rolls) : 0;
    totalRolls += rolls;
    if (!Array.isArray(rawGroup.outcomes)) errors.push(`${path}.outcomes: Sonuçlar liste olmalıdır.`);
    else if (rawGroup.outcomes.length > MAX_LOOT_OUTCOMES_PER_GROUP) {
      errors.push(`${path}.outcomes: En fazla ${MAX_LOOT_OUTCOMES_PER_GROUP} sonuç kullanılabilir.`);
    }
    const outcomes: LootOutcome[] = [];
    const outcomeIds = new Set<string>();
    let totalChancePpm = 0;
    if (Array.isArray(rawGroup.outcomes)) rawGroup.outcomes.slice(0, MAX_LOOT_OUTCOMES_PER_GROUP + 1).forEach((rawOutcome, outcomeIndex) => {
      const outcomePath = `${path}.outcomes[${outcomeIndex}]`;
      if (!isRecord(rawOutcome)) { errors.push(`${outcomePath}: Geçerli bir sonuç olmalıdır.`); return; }
      const outcomeId = typeof rawOutcome.id === "string" ? rawOutcome.id.trim() : "";
      if (!SAFE_ID.test(outcomeId)) errors.push(`${outcomePath}.id: 1-48 karakterlik güvenli bir kimlik olmalıdır.`);
      if (outcomeIds.has(outcomeId)) errors.push(`${outcomePath}.id: Sonuç kimlikleri grup içinde benzersiz olmalıdır.`);
      outcomeIds.add(outcomeId);
      const item = normalizedItem(rawOutcome.item, `${outcomePath}.item`, errors);
      if (!integerInRange(rawOutcome.baseChancePpm, 0, LOOT_PPM)) errors.push(`${outcomePath}.baseChancePpm: 0 ile 1000000 arasında tam sayı olmalıdır.`);
      if (!integerInRange(rawOutcome.minAmount, 1, 1_000_000)) errors.push(`${outcomePath}.minAmount: 1 ile 1000000 arasında tam sayı olmalıdır.`);
      if (!integerInRange(rawOutcome.maxAmount, 1, 1_000_000)) errors.push(`${outcomePath}.maxAmount: 1 ile 1000000 arasında tam sayı olmalıdır.`);
      if (integerInRange(rawOutcome.minAmount, 1, 1_000_000) && integerInRange(rawOutcome.maxAmount, 1, 1_000_000)
        && Number(rawOutcome.minAmount) > Number(rawOutcome.maxAmount)) errors.push(`${outcomePath}: Asgari miktar azami miktarı aşamaz.`);
      if (!integerInRange(rawOutcome.charmWeight, 0, LOOT_PPM)) errors.push(`${outcomePath}.charmWeight: 0 ile 1000000 arasında tam sayı olmalıdır.`);
      if (item?.type === "gear" && (rawOutcome.minAmount !== 1 || rawOutcome.maxAmount !== 1)) {
        errors.push(`${outcomePath}: Ekipman miktarı 1 olmalıdır; birden fazla deneme için grup tekrarını kullanın.`);
      }
      if (integerInRange(rawOutcome.baseChancePpm, 0, LOOT_PPM)) totalChancePpm += Number(rawOutcome.baseChancePpm);
      if (item && integerInRange(rawOutcome.baseChancePpm, 0, LOOT_PPM)
        && integerInRange(rawOutcome.minAmount, 1, 1_000_000)
        && integerInRange(rawOutcome.maxAmount, 1, 1_000_000)
        && integerInRange(rawOutcome.charmWeight, 0, LOOT_PPM)) {
        outcomes.push({
          id: outcomeId,
          item,
          baseChancePpm: Number(rawOutcome.baseChancePpm),
          minAmount: Number(rawOutcome.minAmount),
          maxAmount: Number(rawOutcome.maxAmount),
          charmWeight: Number(rawOutcome.charmWeight),
        });
      }
    });
    if (totalChancePpm > LOOT_PPM) errors.push(`${path}: Birbirini dışlayan sonuçların toplam şansı %100'ü aşamaz.`);
    if (rawGroup.gearChanceModel !== undefined && rawGroup.gearChanceModel !== "direct") {
      errors.push(`${path}: Ekipman oran modeli geçersiz.`);
    }
    if (rawGroup.gearChanceModel === "direct") {
      if (rawGroup.equipmentChancePpm !== undefined || !outcomes.length
        || outcomes.some(o => o.item.type !== "gear") || rolls !== 1) {
        errors.push(`${path}: Kesim başı oranları tek ekipman grubunda ve tek çekilişte kullanılmalıdır.`);
      }
    }
    if (rawGroup.equipmentChancePpm !== undefined) {
      if (!integerInRange(rawGroup.equipmentChancePpm, 0, LOOT_PPM)) errors.push(`${path}: Ekipman düşme şansı 0–1000000 arasında tam sayı olmalıdır.`);
      if (!outcomes.length || outcomes.some(o => o.item.type !== "gear") || totalChancePpm !== LOOT_PPM || rolls !== 1) {
        errors.push(`${path}: Yeni ekipman dağılımı yalnız ekipman, tek deneme ve toplam %100 olmalıdır.`);
      }
    }
    if (SAFE_ID.test(id) && SAFE_LABEL.test(label) && integerInRange(rawGroup.rolls, 0, 12)
      && integerInRange(rawGroup.charmMultiplierBps, LOOT_BPS, 30_000) && Array.isArray(rawGroup.outcomes)) {
      groups.push({ id, label, rolls, charmMultiplierBps: Number(rawGroup.charmMultiplierBps), outcomes,
        ...(rawGroup.equipmentChancePpm !== undefined ? { equipmentChancePpm: Number(rawGroup.equipmentChancePpm) } : {}),
        ...(rawGroup.gearChanceModel === "direct" ? { gearChanceModel: "direct" as const } : {}) });
    }
  });
  if (totalRolls > MAX_LOOT_ROLLS) errors.push(`Grupların toplam deneme sayısı ${MAX_LOOT_ROLLS} değerini aşamaz.`);
  const normalized: MonsterLootProfile = {
    version: 1,
    key: sourceKey,
    label: lootSourceDefinition(sourceKey).label,
    groups,
  };
  if (new TextEncoder().encode(JSON.stringify(normalized)).byteLength > MAX_LOOT_PROFILE_JSON_BYTES) {
    errors.push(`Profil ${MAX_LOOT_PROFILE_JSON_BYTES} bayt sınırını aşıyor.`);
  }
  return errors.length ? { ok: false, errors: errors.slice(0, 40) } : { ok: true, profile: normalized };
}

/** Historical kill snapshots may be sparse, but they must still be incapable
 * of granting multiple equipment items or losing the guaranteed Essence. */
export function validateRewardSafeLootProfile(sourceKey: LootSourceKey, input: unknown): LootProfileValidationResult {
  const structural = validateLootProfile(sourceKey, input);
  if (!structural.ok) return structural;

  const { profile } = structural;
  const errors: string[] = [];
  const gearGroups = profile.groups.filter((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"));
  if (gearGroups.length !== 1) errors.push("Profilde tam bir ekipman grubu olmalıdır.");
  const gearGroup = gearGroups[0];
  if (gearGroup) {
    if (gearGroup.rolls !== 1) errors.push("Ekipman grubu yalnız bir çekiliş yapmalıdır.");
    if (gearGroup.outcomes.some((outcome) => outcome.item.type !== "gear")) {
      errors.push("Ekipman grubu kaynaklarla karıştırılamaz.");
    }
  }

  const essenceEntries = profile.groups.flatMap((group) => group.outcomes
    .filter((outcome) => outcome.item.type === "resource" && outcome.item.kind === "essence")
    .map((outcome) => ({ group, outcome })));
  if (essenceEntries.length !== 1) errors.push("Profilde tam bir Yaşam Özü sonucu olmalıdır.");
  const essenceEntry = essenceEntries[0];
  if (essenceEntry) {
    const { group, outcome } = essenceEntry;
    if (group.outcomes.length !== 1) errors.push("Yaşam Özü ayrı ve korumalı bir grupta olmalıdır.");
    if (group.rolls !== 1 || outcome.baseChancePpm !== LOOT_PPM) {
      errors.push("Yaşam Özü her kesimde tam bir kez ve %100 oranla çekilmelidir.");
    }
    if (group.charmMultiplierBps !== LOOT_BPS || outcome.charmWeight !== 0) {
      errors.push("Yaşam Özü oranı Ganimet Tılsımı ile değiştirilemez.");
    }
  }

  const protectedGroups = new Set<LootGroup>();
  if (gearGroup) protectedGroups.add(gearGroup);
  if (essenceEntry) protectedGroups.add(essenceEntry.group);
  const extraGroups = profile.groups.filter((group) => !protectedGroups.has(group));
  if (!allowsSpecialLootResources(sourceKey) && extraGroups.some(g=>g.outcomes.some(o=>o.item.type!=="resource"||!UPGRADE_MATERIAL_KINDS.includes(o.item.kind)||!allowsProfileResource(sourceKey,o.item.kind)))) {
    errors.push("Ek malzemeler yalnız bosslarda ve Sinsi Taş'ta kullanılabilir.");
  }
  if (extraGroups.length) {
    const seen = new Set<string>();
    for (const group of extraGroups) {
      const outcome = group.outcomes[0];
      if (group.rolls < 0 || group.rolls > 1 || group.outcomes.length !== 1
        || outcome?.item.type !== "resource" || !allowsProfileResource(sourceKey, outcome.item.kind)) {
        errors.push("Ek malzemeler yalnız tek çekilişlik, ayrı kaynak grupları olabilir.");
      } else {
        if (seen.has(outcome.item.kind)) errors.push("Her özel malzeme için yalnız bir düşme oranı ayarlanabilir.");
        seen.add(outcome.item.kind);
        if (group.charmMultiplierBps !== LOOT_BPS || outcome.charmWeight !== 0) {
          errors.push("Ek malzeme oranları Ganimet Tılsımı ile değiştirilemez.");
        }
      }
    }
  }

  return errors.length ? { ok: false, errors } : structural;
}

/**
 * Profiles becoming live use the fixed V80 table. The stricter canonical
 * check is deliberately separate from reward-safe snapshot validation so an
 * older, sparse but single-roll death record keeps its exact kill-time odds.
 */
export function validateLiveLootProfile(sourceKey: LootSourceKey, input: unknown): LootProfileValidationResult {
  const safe = validateRewardSafeLootProfile(sourceKey, input);
  if (!safe.ok) return safe;

  const { profile } = safe;
  const gearGroup = profile.groups.find((group) => group.outcomes.some((outcome) => outcome.item.type === "gear"))!;
  const errors: string[] = [];
  if (gearGroup.outcomes.length !== LOOT_RARITIES.length * OPEN_WORLD_LOOT_GEAR_KINDS.length) {
    errors.push("Ekipman tablosunda her nadirlik ve tür için tam bir sonuç bulunmalıdır.");
  }
  const combinations = new Map<string, number>();
  for (const outcome of gearGroup.outcomes) {
    if (outcome.item.type !== "gear") continue;
    const combination = `${outcome.item.rarity}:${outcome.item.kind}`;
    combinations.set(combination, (combinations.get(combination) ?? 0) + 1);
  }
  for (const rarity of LOOT_RARITIES) for (const kind of OPEN_WORLD_LOOT_GEAR_KINDS) {
    if (combinations.get(`${rarity}:${kind}`) !== 1) {
      errors.push(`Ekipman tablosunda ${rarity}/${kind} sonucu eksik veya yinelenmiş.`);
    }
  }
  if (gearGroup.charmMultiplierBps !== 15_000) {
    errors.push("Ganimet Tılsımı ekipman oranını sabit olarak %50 artırmalıdır.");
  }

  if (!errors.length) {
    const family: LootItemFamily = sourceKey === "sinsi.stone" ? "sinsi" : "generic";
    const expected = new Map(simpleGearOutcomes(extractSimpleLootChances(profile), family)
      .map((outcome) => [`${outcome.item.type === "gear" ? outcome.item.rarity : ""}:${outcome.item.type === "gear" ? outcome.item.kind : ""}`, outcome]));
    const canonical = gearGroup.outcomes.every((outcome) => {
      if (outcome.item.type !== "gear") return false;
      const wanted = expected.get(`${outcome.item.rarity}:${outcome.item.kind}`);
      return Boolean(wanted
        && outcome.id === wanted.id
        && outcome.item.family === (wanted.item.type === "gear" ? wanted.item.family : "generic")
        && outcome.baseChancePpm === wanted.baseChancePpm
        && outcome.charmWeight === wanted.charmWeight);
    });
    if (!canonical) errors.push("Ekipman oranları tür çiftleri içinde eşit ve standart düzende olmalıdır.");
    if (gearGroup.gearChanceModel === "direct" && gearGroup.equipmentChancePpm !== undefined) {
      errors.push("Kesim başı oranları eski düşme kontrolüyle birlikte kullanılamaz.");
    }
  }

  return errors.length ? { ok: false, errors } : safe;
}

// Boss-only compatibility path: keep the pre-v336 calculation unchanged.
function getBossEffectiveLootGroups(profile: MonsterLootProfile, hasDropCharm: boolean, eventPercent = 0, itemMultiplier = 1): EffectiveLootGroup[] {
  return (profile.key==="sinsi.stone"?withLegacyHelmetDrops(profile):profile).groups.map((originalGroup) => {
    const group=profile.key==="sinsi.stone"?originalGroup:{...originalGroup,outcomes:originalGroup.outcomes.filter(o=>!(o.item.type==="gear"&&o.item.kind==="helmet"))};
    const baseTotalChancePpm = group.outcomes.reduce((sum, outcome) => sum + outcome.baseChancePpm, 0);
    const multiplier = hasDropCharm ? group.charmMultiplierBps : LOOT_BPS;
    const targetTotal = Math.min(LOOT_PPM, Math.round(baseTotalChancePpm * multiplier / LOOT_BPS));
    const bonus = Math.max(0, targetTotal - baseTotalChancePpm);
    const bonusShares = weightedSplit(bonus, group.outcomes.map((outcome) => outcome.charmWeight));
    let outcomes = group.outcomes.map((outcome, index) => ({
      ...outcome,
      effectiveChancePpm: outcome.baseChancePpm + bonusShares[index],
    }));
    const bossEquipment = profile.key.startsWith("boss.") && outcomes.some(outcome => outcome.item.type === "gear");
    if (bossEquipment) {
      // Bosses make three guaranteed draws. Keep configured relative weights,
      // including the charm's rarity weights; never select a disabled outcome.
      outcomes = outcomes.filter(outcome => outcome.item.type === "gear");
      if (!outcomes.some(outcome => outcome.effectiveChancePpm > 0)) {
        // An empty admin table must still fulfill the guaranteed boss reward.
        outcomes = OPEN_WORLD_LOOT_GEAR_KINDS.map(kind => ({
          id: `boss-fallback-${kind}`, item: { type: "gear" as const, family: "generic" as const, kind, rarity: "white" as const },
          baseChancePpm: 0, effectiveChancePpm: LOOT_PPM / OPEN_WORLD_LOOT_GEAR_KINDS.length,
          minAmount: 1, maxAmount: 1, charmWeight: 0,
        }));
      }
      const shares = weightedSplit(LOOT_PPM, outcomes.map(outcome => outcome.effectiveChancePpm));
      outcomes = outcomes.map((outcome, index) => ({ ...outcome, effectiveChancePpm: shares[index] }));
    }
    if(eventPercent>0&&!bossEquipment&&!outcomes.some(o=>o.item.type==="resource"&&o.item.kind==="essence")){
      const target=Math.min(LOOT_PPM,Math.round(outcomes.reduce((n,o)=>n+o.effectiveChancePpm,0)*(1+Math.min(500,eventPercent)/100)));
      const shares=weightedSplit(target,outcomes.map(o=>o.effectiveChancePpm));
      outcomes=outcomes.map((o,i)=>({...o,effectiveChancePpm:shares[i]}));
    }
    if(profile.key.startsWith('forest.')&&itemMultiplier<1)outcomes=outcomes.map(o=>({...o,effectiveChancePpm:o.item.type==='resource'&&o.item.kind==='essence'?o.effectiveChancePpm:Math.round(o.effectiveChancePpm*Math.max(0,itemMultiplier))}));
    const effectiveTotalChancePpm = outcomes.reduce((sum, outcome) => sum + outcome.effectiveChancePpm, 0);
    return { ...group, rolls: bossEquipment ? 3 : group.rolls, baseTotalChancePpm, effectiveTotalChancePpm, outcomes };
  });
}

export function getEffectiveLootGroups(profile: MonsterLootProfile, hasDropCharm: boolean, eventPercent = 0, itemMultiplier = 1): EffectiveLootGroup[] {
  if (profile.key.startsWith("boss.")) return getBossEffectiveLootGroups(profile, hasDropCharm, eventPercent, itemMultiplier);
  // Only normal monsters adopt the independent gate, including old stored tables.
  const active = upgradeEquipmentDropProfile(profile);
  const effectiveProfile = withLegacyHelmetDrops(active);
  const eventMultiplier = 1 + Math.max(0, Math.min(500, finiteNumber(eventPercent))) / 100;
  const levelMultiplier = (profile.key.startsWith('forest.')||profile.key.startsWith('frozen.')||profile.key.startsWith('black.')) ? Math.max(0, Math.min(1, finiteNumber(itemMultiplier, 1))) : 1;
  return effectiveProfile.groups.map((group) => {
    const gear = group.outcomes.some(o => o.item.type === "gear");
    if (gear) {
      const direct = group.gearChanceModel === "direct";
      const baseTotalChancePpm = direct
        ? group.outcomes.reduce((sum,o) => sum + o.baseChancePpm,0)
        : normalizedSimpleChance(group.equipmentChancePpm ?? 0);
      const charmMultiplier = hasDropCharm ? group.charmMultiplierBps / LOOT_BPS : 1;
      const effectiveTotalChancePpm = Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * charmMultiplier * eventMultiplier) * levelMultiplier);
      const weights = group.outcomes.map(o => o.baseChancePpm);
      const base = weightedSplit(baseTotalChancePpm, weights);
      const effective = weightedSplit(effectiveTotalChancePpm, weights);
      return { ...group, rolls: 1, baseTotalChancePpm, effectiveTotalChancePpm,
        outcomes: group.outcomes.map((outcome, i) => ({ ...outcome,
          ...(!direct ? { conditionalChancePpm: outcome.baseChancePpm } : {}),
          baseChancePpm: base[i], effectiveChancePpm: effective[i] })) };
    }
    // Resources keep their separate configured odds and quantities. Essence is guaranteed.
    const baseTotalChancePpm = group.outcomes.reduce((sum, o) => sum + o.baseChancePpm, 0);
    const essence = group.outcomes.some(o => o.item.type === "resource" && o.item.kind === "essence");
    const fixedMaterial = group.outcomes.some(o=>o.item.type==="resource"&&UPGRADE_MATERIAL_KINDS.includes(o.item.kind));
    const target = essence || fixedMaterial ? baseTotalChancePpm : Math.round(Math.min(LOOT_PPM, baseTotalChancePpm * eventMultiplier) * levelMultiplier);
    const chances = weightedSplit(target, group.outcomes.map(o => o.baseChancePpm));
    return { ...group, baseTotalChancePpm, effectiveTotalChancePpm: target,
      outcomes: group.outcomes.map((outcome, i) => ({ ...outcome, effectiveChancePpm: chances[i] })) };
  });
}

function normalizedRandom(random: () => number) {
  const value = finiteNumber(random());
  if (value <= 0) return 0;
  if (value >= 1) return 1 - Number.EPSILON;
  return value;
}

export function rollLootProfile(
  profile: MonsterLootProfile,
  options: { hasDropCharm: boolean; random?: () => number; eventPercent?: number; itemMultiplier?:number; bossPurpleChancePpm?:number; ancientNormalPurpleChancePpm?:number },
): RolledLoot[] {
  const random = options.random ?? Math.random;
  const rolled: RolledLoot[] = [];
  let equipmentAwarded = 0;
  let equipmentAttempted = false;
  const boss = profile.key.startsWith("boss.");
  const eventMultiplier = 1 + Math.max(0, Math.min(500, options.eventPercent ?? 0)) / 100;
  const bossRollValue = 3 * eventMultiplier;
  const bossRolls = !boss || eventMultiplier === 1 ? 3 : Math.floor(bossRollValue) + (random() < bossRollValue % 1 ? 1 : 0);
  const equipmentLimit = boss ? bossRolls : 1;
  let essenceAwarded = false;
  const specialAwarded = new Set<LootResourceKind>();
  for (const original of getEffectiveLootGroups(profile, options.hasDropCharm, options.eventPercent, options.itemMultiplier)) {
    const group={...original,outcomes:original.outcomes.map(o=>({...o}))};
    const gearGroup = group.outcomes.some(o => o.item.type === "gear");
    // One attempt per kill, including failed attempts: no retries through legacy groups.
    if (gearGroup && !boss && equipmentAttempted) continue;
    if (gearGroup && !boss) equipmentAttempted = true;
    for (let rollIndex = 0; rollIndex < (gearGroup ? (boss ? bossRolls : 1) : group.rolls); rollIndex += 1) {
      if (gearGroup && !boss && group.gearChanceModel !== "direct"
        && Math.floor(normalizedRandom(random) * LOOT_PPM) >= group.effectiveTotalChancePpm) continue;
      const value = Math.floor(normalizedRandom(random) * LOOT_PPM);
      let cursor = 0;
      const outcome = group.outcomes.find((candidate) => {
        cursor += gearGroup && !boss && group.gearChanceModel !== "direct"
          ? candidate.conditionalChancePpm ?? 0 : candidate.effectiveChancePpm;
        return value < cursor;
      });
      if (!outcome) continue;
      // Bosses keep their original guaranteed budget; normal monsters have one item.
      if (outcome.item.type === "gear") {
        if (equipmentAwarded >= equipmentLimit) continue;
        equipmentAwarded += 1;
      } else if (outcome.item.kind === "essence") {
        if (essenceAwarded) continue;
        essenceAwarded = true;
      } else {
        // Taş Sanatı Kitabı yalnız üç gerçek bossun ganimetidir. Eski
        // profillerde kalmış bir satır dahi normal canavara ödül veremez.
        if (!allowsProfileResource(profile.key, outcome.item.kind) || specialAwarded.has(outcome.item.kind)) continue;
        specialAwarded.add(outcome.item.kind);
      }
      const amountSpan = outcome.maxAmount - outcome.minAmount + 1;
      const amount = outcome.minAmount + Math.floor(normalizedRandom(random) * amountSpan);
      rolled.push({
        groupId: group.id,
        rollIndex,
        outcomeId: outcome.id,
        item: outcome.item,
        amount,
        chancePpm: outcome.effectiveChancePpm,
      });
    }
  }
  // A separate kill-level draw keeps the configured purple chance exact even
  // when a normal monster's ordinary equipment gate fails. It replaces any
  // existing gear; otherwise the ancient monster awards just one new piece.
  const ancientNormal = profile.key.startsWith("ancient.") && profile.key.endsWith(".normal");
  const purpleChance = Math.max(0, Math.min(LOOT_PPM, Math.floor(
    boss ? options.bossPurpleChancePpm ?? 0 : ancientNormal ? options.ancientNormalPurpleChancePpm ?? 0 : 0,
  )));
  const firstGear = purpleChance > 0 ? rolled.findIndex(row => row.item.type === "gear") : -1;
  if (purpleChance > 0 && (ancientNormal || firstGear >= 0)
    && Math.floor(normalizedRandom(random) * LOOT_PPM) < purpleChance) {
    const kind = LOOT_GEAR_KINDS[Math.floor(normalizedRandom(random) * LOOT_GEAR_KINDS.length)];
    const purple: RolledLoot = {
      ...(firstGear >= 0 ? rolled[firstGear] : {
        groupId: "ancient-purple", rollIndex: 0, outcomeId: `purple-${kind}`, amount: 1,
      }),
      item: { type: "gear", family: "generic", rarity: "purple", kind },
      chancePpm: purpleChance,
    };
    if (firstGear >= 0) rolled[firstGear] = purple;
    else rolled.push(purple);
  }
  return rolled;
}

const GENERIC_GEAR_NAMES: Record<"muhafiz" | "avci" | "arkanist", Record<LootGearKind, Record<LootRarity, string>>> = {
  muhafiz: {
    weapon: { white: "Kül Çeliği", blue: "Safir Nöbet", orange: "Güneş Yaran", red: "Kızıl Kıyamet" },
    armor: { white: "Demir Nöbet Zırhı", blue: "Safir Muhafız Zırhı", orange: "Kor Tahtı Zırhı", red: "Kan Tahtı Zırhı" },
    helmet: { white: "Demir Nöbet Miğferi", blue: "Safir Nöbet Miğferi", orange: "Kor Tahtı Miğferi", red: "Kan Tahtı Miğferi" },
    shoes: { white: "Kül Muhafız Çizmeleri", blue: "Safir Muhafız Çizmeleri", orange: "Kor Muhafız Çizmeleri", red: "Kızıl Muhafız Çizmeleri" },
    necklace: { white: "Kül Muhafız Kolyesi", blue: "Safir Muhafız Kolyesi", orange: "Kor Muhafız Kolyesi", red: "Kızıl Muhafız Kolyesi" },
  },
  avci: {
    weapon: { white: "Sis Kirişli Yay", blue: "Ayaz Dişi Yayı", orange: "Kor Anka Yayı", red: "Kızıl Ejder Yayı" },
    armor: { white: "Sınır Derisi", blue: "Mavi Gölge Postu", orange: "Anka Avcı Zırhı", red: "Alev Avcısı Zırhı" },
    helmet: { white: "Sınır Avcı Başlığı", blue: "Mavi Gölge Başlığı", orange: "Anka Avcı Başlığı", red: "Alev Avcısı Başlığı" },
    shoes: { white: "Kül Avcı Çizmeleri", blue: "Safir Avcı Çizmeleri", orange: "Kor Avcı Çizmeleri", red: "Kızıl Avcı Çizmeleri" },
    necklace: { white: "Kül Avcı Kolyesi", blue: "Safir Avcı Kolyesi", orange: "Kor Avcı Kolyesi", red: "Kızıl Avcı Kolyesi" },
  },
  arkanist: {
    weapon: { white: "Kül Asası", blue: "Rün Çağrısı", orange: "Yıldız Kıran", red: "Kızıl Hiçlik" },
    armor: { white: "Soluk Cübbe", blue: "Safir Rün Cübbesi", orange: "Güneş Dokuması", red: "Kan Rünü Cübbesi" },
    helmet: { white: "Soluk Rün Tacı", blue: "Safir Rün Tacı", orange: "Güneş Tacı", red: "Kan Rünü Tacı" },
    shoes: { white: "Kül Rün Çizmeleri", blue: "Safir Rün Çizmeleri", orange: "Kor Rün Çizmeleri", red: "Kızıl Rün Çizmeleri" },
    necklace: { white: "Kül Rün Kolyesi", blue: "Safir Rün Kolyesi", orange: "Kor Rün Kolyesi", red: "Kızıl Rün Kolyesi" },
  },
};

const SINSI_GEAR_NAMES: Record<"muhafiz" | "avci" | "arkanist", Record<"weapon" | "armor", string>> = {
  muhafiz: { weapon: "Sinsi Kaya Kılıcı", armor: "Sinsi Taş Zırhı" },
  avci: { weapon: "Sinsi Kaya Yayı", armor: "Sinsi İzci Zırhı" },
  arkanist: { weapon: "Sinsi Kaya Asası", armor: "Sinsi Rün Cübbesi" },
};

export function rollLootRole(random: () => number = Math.random) {
  return (["muhafiz", "avci", "arkanist"] as const)[Math.min(2, Math.max(0, Math.floor(random() * 3)))];
}

export function resolveLootItemName(item: LootItem, role: string) {if(item.rarity === "emerald") return emeraldName444(item.kind,role);
  if (item.type === "resource") return progressionMaterial(item.kind)?.label ?? (item.kind === "stone_dust" ? "Taş Tozu" : item.kind === "pearl" ? "İnci" : item.kind === "stone_book" ? "Taş Sanatı Kitabı" : item.kind === "evolution_scroll" ? "Evrim Parşömeni" : "Yaşam Özü");
  const safeRole = role === "avci" || role === "arkanist" ? role : "muhafiz";
  if (item.rarity === "purple") return ({
    muhafiz: { weapon: "Mor Kök Kılıcı", armor: "Mor Kök Zırhı", helmet: "Mor Kök Miğferi", shoes: "Mor Kök Çizmeleri", necklace: "Mor Kök Kolyesi" },
    avci: { weapon: "Alacakaranlık Yayı", armor: "Alacakaranlık Zırhı", helmet: "Alacakaranlık Başlığı", shoes: "Alacakaranlık Çizmeleri", necklace: "Alacakaranlık Kolyesi" },
    arkanist: { weapon: "Kadim Menekşe Asası", armor: "Kadim Menekşe Cübbesi", helmet: "Kadim Menekşe Tacı", shoes: "Kadim Menekşe Çizmeleri", necklace: "Kadim Menekşe Kolyesi" },
  } as const)[safeRole][item.kind];
  if (item.family === "sinsi" && (item.kind === "weapon" || item.kind === "armor")) return SINSI_GEAR_NAMES[safeRole][item.kind];
  return GENERIC_GEAR_NAMES[safeRole][item.kind][item.rarity];
}

export function resolveLootPowerRange(item: LootItem, settings: LegacyLootPowerSettings) {if(item.rarity === "emerald"){const power=emeraldPower444(item.kind,settings);return {min:power,max:power};}
  if (item.type === "resource") return { min: 0, max: 0 };
  const gearClass = item.kind === "weapon" ? "weapon" : "armor";
  if (item.rarity === "purple") {
    const redMax = Math.max(0, Math.floor(finiteNumber(settings[`red_${gearClass}_power_max`])));
    const uniquePower = Math.max(1, Math.floor(finiteNumber(settings[`unique_${gearClass}_power`], gearClass === "weapon" ? 180 : 150)));
    const max = Math.min(uniquePower - 1, redMax + 15);
    return { min: Math.max(0, Math.min(max, redMax + 5)), max: Math.max(0, max) };
  }
  const min = Math.max(0, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_min` as keyof LegacyLootPowerSettings])));
  const max = Math.max(min, Math.floor(finiteNumber(settings[`${item.rarity}_${gearClass}_power_max` as keyof LegacyLootPowerSettings], min)));
  return { min, max };
}

export function rollLootPower(item: LootItem, settings: LegacyLootPowerSettings, random: () => number = Math.random) {
  const range = resolveLootPowerRange(item, settings);
  return range.min + Math.floor(normalizedRandom(random) * (range.max - range.min + 1));
}

export function formatLootChancePpm(ppm: number) {
  const percent = Math.max(0, Math.min(LOOT_PPM, Math.round(finiteNumber(ppm)))) / 10_000;
  const digits = percent >= 10 ? 2 : percent >= 1 ? 3 : 4;
  return `${percent.toFixed(digits).replace(/0+$/, "").replace(/\.$/, "").replace(".", ",")}%`;
}

export type PublicLootProfile = Omit<LootProfileRecord, "profile"> & {
  label: string;
  dropCharmActive: boolean;
  groups: Array<Omit<EffectiveLootGroup, "outcomes"> & {
    outcomes: Array<EffectiveLootOutcome & {
      itemName: string;
      baseChanceText: string;
      effectiveChanceText: string;
    }>;
  }>;
};

export function publicLootProfile(record: LootProfileRecord, hasDropCharm = false, role = "muhafiz", eventPercent = 0, itemMultiplier = 1): PublicLootProfile {
  return {
    sourceKey: record.sourceKey,
    revision: record.revision,
    customized: record.customized,
    updatedAt: record.updatedAt,
    label: record.profile.label,
    dropCharmActive: hasDropCharm,
    groups: getEffectiveLootGroups(record.profile, hasDropCharm,eventPercent,itemMultiplier).map((group) => ({
      ...group,
      outcomes: group.outcomes.map((outcome) => ({
        ...outcome,
        itemName: resolveLootItemName(outcome.item, role),
        baseChanceText: formatLootChancePpm(outcome.baseChancePpm),
        effectiveChanceText: formatLootChancePpm(outcome.effectiveChancePpm),
      })),
    })),
  };
}

export function serializeLootProfile(profile: MonsterLootProfile) {
  return JSON.stringify(compactLootProfile(profile));
}

// Defeat rows are written far more often than profile revisions. Keep both the
// immutable history and death-time snapshots compact while retaining the exact
// same validated in-memory model.
function compactLootProfile(profile: MonsterLootProfile) {
  return [
    1,
    profile.key,
    profile.groups.map((group) => [
      group.id,
      group.label,
      group.rolls,
      group.charmMultiplierBps,
      group.outcomes.map((outcome) => [
        outcome.id,
        outcome.item.type === "gear"
          ? [0, outcome.item.family, outcome.item.kind, outcome.item.rarity]
          : [1, outcome.item.kind],
        outcome.baseChancePpm,
        outcome.minAmount,
        outcome.maxAmount,
        outcome.charmWeight,
      ]),
      ...(group.gearChanceModel === "direct" ? [null, "direct"]
        : group.equipmentChancePpm !== undefined ? [group.equipmentChancePpm] : []),
    ]),
  ];
}

function expandCompactLootProfile(sourceKey: LootSourceKey, value: unknown) {
  if (!Array.isArray(value) || value[0] !== 1 || value[1] !== sourceKey || !Array.isArray(value[2])) return value;
  return {
    version: 1,
    key: sourceKey,
    label: lootSourceDefinition(sourceKey).label,
    groups: value[2].map((rawGroup) => {
      if (!Array.isArray(rawGroup)) return rawGroup;
      return {
        id: rawGroup[0],
        label: rawGroup[1],
        rolls: rawGroup[2],
        charmMultiplierBps: rawGroup[3],
        ...(rawGroup[5] !== undefined && rawGroup[5] !== null ? { equipmentChancePpm: rawGroup[5] } : {}),
        ...(rawGroup[6] === "direct" ? { gearChanceModel: "direct" as const } : {}),
        outcomes: Array.isArray(rawGroup[4]) ? rawGroup[4].map((rawOutcome) => {
          if (!Array.isArray(rawOutcome) || !Array.isArray(rawOutcome[1])) return rawOutcome;
          const rawItem = rawOutcome[1];
          return {
            id: rawOutcome[0],
            item: rawItem[0] === 0
              ? { type: "gear", family: rawItem[1], kind: rawItem[2], rarity: rawItem[3] }
              : { type: "resource", kind: rawItem[1] },
            baseChancePpm: rawOutcome[2],
            minAmount: rawOutcome[3],
            maxAmount: rawOutcome[4],
            charmWeight: rawOutcome[5],
          };
        }) : rawGroup[4],
      };
    }),
  };
}

export function parseStoredLootProfile(sourceKey: LootSourceKey, value: unknown) {
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    const validated = validateLootProfile(sourceKey, expandCompactLootProfile(sourceKey, parsed));
    return validated.ok ? validated.profile : null;
  } catch {
    return null;
  }
}

export function createLootProfileSnapshot(record: LootProfileRecord): LootProfileSnapshot {
  return {
    lootSourceKey: record.sourceKey,
    lootProfileRevision: Math.max(0, Math.floor(record.revision)),
    lootProfileJson: JSON.stringify(compactLootProfile(record.profile)),
  };
}

export function readLootProfileSnapshot(
  snapshot: LootProfileSnapshotColumns,
  fallbackProfile: MonsterLootProfile,
): LootProfileRecord {
  const sourceKey = isLootSourceKey(snapshot.loot_source_key) ? snapshot.loot_source_key : fallbackProfile.key;
  const parsed = parseStoredLootProfile(sourceKey, snapshot.loot_profile_json);
  const revision = Number.isInteger(snapshot.loot_profile_revision) && Number(snapshot.loot_profile_revision) >= 0
    ? Number(snapshot.loot_profile_revision)
    : 0;
  return {
    sourceKey: parsed ? sourceKey : fallbackProfile.key,
    revision,
    customized: revision > 0,
    updatedAt: 0,
    profile: withEvolutionScrolls(parsed ?? fallbackProfile,fallbackProfile,false),
  };
}

export function parseLootProfileSnapshot(snapshot: LootProfileSnapshotColumns, fallbackProfile: MonsterLootProfile) {
  return readLootProfileSnapshot(snapshot, fallbackProfile).profile;
}

export function parseLiveLootProfileSnapshot(snapshot: LootProfileSnapshotColumns, fallbackProfile: MonsterLootProfile) {
  const profile = parseLootProfileSnapshot(snapshot, fallbackProfile);
  const validated = validateRewardSafeLootProfile(fallbackProfile.key, profile);
  return validated.ok ? validated.profile : fallbackProfile;
}

export function withEvolutionScrolls(profile:MonsterLootProfile,fallback:MonsterLootProfile,replace=true):MonsterLootProfile {
 if(!profile.key.startsWith("boss.")) return profile;
 const group=fallback.groups.find(g=>g.id==="evolution-scroll");if(!group)return profile;
 const existing=profile.groups.some(g=>g.id===group.id);
 if(existing&&!replace)return profile;
 return {...profile,groups:existing?profile.groups.map(g=>g.id===group.id?group:g):[...profile.groups,group]};
}

export function withLegacyHelmetDrops(profile:MonsterLootProfile):MonsterLootProfile {
  if(profile.key!=="sinsi.stone") return {...profile,groups:profile.groups.map(g=>({...g,outcomes:g.outcomes.filter(o=>!(o.item.type==='gear'&&o.item.kind==='helmet'))}))};
  if(profile.groups.some(g=>g.outcomes.some(o=>o.item.type==='gear'&&o.item.kind==='helmet')))return profile;
  return {...profile,groups:profile.groups.map(g=>({...g,outcomes:g.outcomes.flatMap(o=>{
    if(o.item.type!=='gear'||o.item.kind!=='armor')return [o];
    const chance=Math.floor(o.baseChancePpm/2),charm=Math.floor(o.charmWeight/2);
    return [{...o,baseChancePpm:o.baseChancePpm-chance,charmWeight:o.charmWeight-charm},{...o,id:o.id+'-helmet',item:{...o.item,kind:'helmet' as const,family:'generic' as const},baseChancePpm:chance,charmWeight:charm}];
  })}))};
}

export function normalizeOpenWorldLootProfile(profile:MonsterLootProfile):MonsterLootProfile {
  // Adapt old saved live tables without losing the administrator's bucket totals.
  // Immutable kill snapshots retain their separate reward-safe read path.
  return profile.groups.some(g=>g.outcomes.some(o=>o.item.type==='gear'&&o.item.kind==='helmet'))
    ? withSimpleLootChances(profile,extractSimpleLootChances(profile)) : profile;
}

/** Overlay the separately managed material rules once while loading a profile.
 * Defeat receipts freeze this same profile, so preview and delivery agree. */
export function withUpgradeMaterialDrops(profile:MonsterLootProfile,rules:Record<string,{chance:number;min:number;max:number}>):MonsterLootProfile{
 const kind=materialForSource(profile.key) as LootResourceKind|undefined;
 const groups=profile.groups.filter(g=>!g.outcomes.some(o=>o.item.type==='resource'&&UPGRADE_MATERIAL_KINDS.includes(o.item.kind)));
 if(!kind)return {...profile,groups};
 const rule=rules[kind];if(!rule)return {...profile,groups};
 return {...profile,groups:[...groups,{id:'upgrade-material',label:progressionMaterial(kind)!.label,rolls:1,charmMultiplierBps:LOOT_BPS,outcomes:[{id:kind,item:{type:'resource',kind},baseChancePpm:Math.round(rule.chance*10000),minAmount:rule.min,maxAmount:rule.max,charmWeight:0}]}]};
}
