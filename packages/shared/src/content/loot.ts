import type { Rarity } from './items.ts';

/** Ganimet profilleri: harita × varyant. Değerler referans varsayılanıdır, yönetimden değişebilir. */
export interface LootProfile {
  equipChance: number; // 0..1
  rarityWeights: Partial<Record<Rarity, number>>;
  gems: [number, number];
  essence: [number, number];
  materials: { id: string; chance: number; qty: [number, number] }[];
}

export const LOOT_PROFILES: Record<string, LootProfile> = {
  // Pazar Köyü / Tilki Korusu: başlangıç avı, az ama işe yarar ganimet
  village: {
    equipChance: 0.05,
    rarityWeights: { white: 88, blue: 12 },
    gems: [1, 3], essence: [0, 1],
    materials: [
      { id: 'red_potion', chance: 0.12, qty: [1, 1] },
      { id: 'strong_branch', chance: 0.05, qty: [1, 1] },
      { id: 'kor_seal', chance: 0.015, qty: [1, 1] },
    ],
  },
  forest: {
    equipChance: 0.075,
    rarityWeights: { white: 70, blue: 26, orange: 4 },
    gems: [1, 4], essence: [1, 3],
    materials: [
      { id: 'red_potion', chance: 0.06, qty: [1, 2] },
      { id: 'kor_seal', chance: 0.035, qty: [1, 1] },
      { id: 'strong_branch', chance: 0.03, qty: [1, 2] },
      { id: 'white_pearl', chance: 0.004, qty: [1, 1] },
    ],
  },
  frozen: {
    equipChance: 0.08,
    rarityWeights: { blue: 55, orange: 38, crimson: 7 },
    gems: [4, 10], essence: [3, 7],
    materials: [
      { id: 'red_potion', chance: 0.07, qty: [1, 3] },
      { id: 'kor_seal', chance: 0.05, qty: [1, 1] },
      { id: 'strong_crystal', chance: 0.04, qty: [1, 2] },
      { id: 'desert_herb', chance: 0.02, qty: [1, 1] },
      { id: 'white_pearl', chance: 0.008, qty: [1, 1] },
    ],
  },
  black: {
    equipChance: 0.09,
    rarityWeights: { orange: 50, crimson: 42, unique: 8 },
    gems: [8, 18], essence: [6, 12],
    materials: [
      { id: 'red_potion', chance: 0.08, qty: [1, 3] },
      { id: 'kor_seal', chance: 0.06, qty: [1, 2] },
      { id: 'master_scroll', chance: 0.025, qty: [1, 1] },
      { id: 'old_iron', chance: 0.02, qty: [1, 1] },
      { id: 'red_pearl', chance: 0.005, qty: [1, 1] },
    ],
  },
};
/** Varyant çarpanları: agresif/katil daha iyi ganimet bırakır. */
export const VARIANT_LOOT_MULT = [1, 1.35, 2.4];
export const KILLER_RARITY_SHIFT = 1; // katil varyant bir üst nadirliğe kayma şansı
