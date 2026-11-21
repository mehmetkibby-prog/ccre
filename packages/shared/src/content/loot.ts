import type { Rarity } from './items.ts';
import type { GameTuning, DropTune } from '../tuning.ts';

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
  // Rün Sahili (Sv. 50+): rün parçaları her tür için %1 (yönetim Ganimet → Rün Sahili'nden değiştirir)
  coast: {
    equipChance: 0.08,
    rarityWeights: { orange: 40, crimson: 48, unique: 12 },
    gems: [12, 24], essence: [8, 16],
    materials: [
      { id: 'red_potion', chance: 0.09, qty: [1, 3] },
      { id: 'kor_seal', chance: 0.07, qty: [1, 2] },
      { id: 'master_scroll', chance: 0.03, qty: [1, 1] },
      { id: 'old_iron', chance: 0.025, qty: [1, 1] },
      { id: 'rune_frag_kudret', chance: 0.01, qty: [1, 1] },
      { id: 'rune_frag_siper', chance: 0.01, qty: [1, 1] },
      { id: 'rune_frag_yasam', chance: 0.01, qty: [1, 1] },
    ],
  },
  // Kadim Kule: kat malzemeleri kat ayarından gelir (TUNING.tower.floors[].mats), burada genel tablo
  tower: {
    equipChance: 0.09,
    rarityWeights: { blue: 30, orange: 48, crimson: 20, unique: 2 },
    gems: [6, 14], essence: [5, 10],
    materials: [
      { id: 'red_potion', chance: 0.08, qty: [1, 3] },
      { id: 'kor_seal', chance: 0.05, qty: [1, 2] },
    ],
  },
};
/** Varyant çarpanları: agresif/katil daha iyi ganimet bırakır. */
export const VARIANT_LOOT_MULT = [1, 1.35, 2.4];
export const KILLER_RARITY_SHIFT = 1; // katil varyant bir üst nadirliğe kayma şansı

/**
 * Bölge seviye sınırı: bu seviyenin üstündeki oyuncu o haritada ganimetin (ekipman, malzeme, özel eşya, Öz) yalnız
 * overMul kadarını alır. Ceza canavara göre değil bölgeye göre (Pazar Köyü Sv. 10'a kadar). Yönetimden değişir.
 */
export const ZONE_LEVEL_CAP: Record<string, number> = { bazaar: 10, forest: 20, frozen: 35 };
export const OVER_LEVEL_MUL = 0.1;
export interface ResolvedLoot {
  equipChance: number; rarityWeights: Partial<Record<Rarity, number>>; gems: [number, number]; essence: [number, number];
  materials: { id: string; chance: number; qty: [number, number] }[]; drops: DropTune[]; maxLevel: number; overMul: number;
}
/**
 * Bir canavarın geçerli ganimet tablosu: harita profili → bölge ayarı (yönetim) → canavar türü ayarı (yönetim).
 * Sunucu düşme hesabında, istemci canavar bilgisindeki "?" penceresinde aynısını kullanır (gösterilen = gerçek).
 */
export function resolveLoot(t: GameTuning, mapId: string, theme: string, monsterId: string, isMat: (id: string) => boolean = () => true, floor?: number): ResolvedLoot {
  const base = LOOT_PROFILES[theme] ?? LOOT_PROFILES[mapId] ?? LOOT_PROFILES.forest;
  const z = t.zoneLoot?.[mapId], m = t.monsters?.[monsterId];
  const mats = new Map<string, { chance: number; qty: [number, number] }>();
  for (const x of base.materials) mats.set(x.id, { chance: x.chance, qty: x.qty });
  // Kadim Kule: o katın malzeme olasılıkları (Kadim Kat Mührü, Ruh Zinciri Halkası, …)
  const fl = mapId === 'tower' && floor ? t.tower?.floors?.[floor - 1] : undefined;
  for (const layer of [fl?.mats, z?.mats, m?.mats]) for (const [id, ch] of Object.entries(layer ?? {})) {
    if (!isMat(id)) continue;
    const cur = mats.get(id); mats.set(id, { chance: ch, qty: cur?.qty ?? [1, 1] });
  }
  for (const [id, q] of Object.entries(z?.matQty ?? {})) { const cur = mats.get(id); if (cur) cur.qty = q; }
  return {
    equipChance: m?.equipChance ?? z?.equipChance ?? base.equipChance,
    rarityWeights: (m?.rarity ?? z?.rarity ?? base.rarityWeights) as Partial<Record<Rarity, number>>,
    gems: m?.gems ?? z?.gems ?? base.gems, essence: m?.essence ?? z?.essence ?? base.essence,
    materials: [...mats].filter(([, v]) => v.chance > 0).map(([id, v]) => ({ id, chance: v.chance, qty: v.qty })),
    drops: [...(z?.drops ?? []), ...(m?.drops ?? [])],
    maxLevel: z?.maxLevel ?? ZONE_LEVEL_CAP[mapId] ?? 0,
    overMul: z?.overMul ?? OVER_LEVEL_MUL,
  };
}
/** Seviye sınırını aşan oyuncu için düşme çarpanı (1 = ceza yok). */
export function overLevelMul(r: ResolvedLoot, level: number) { return r.maxLevel > 0 && level > r.maxLevel ? r.overMul : 1; }
