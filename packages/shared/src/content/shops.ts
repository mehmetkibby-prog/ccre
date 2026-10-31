/** NPC mağazaları ve artı basma tablosu (referans varsayılanları; yönetimden revizyonla değişir). */
export interface ShopProduct { id: string; name: string; kind: 'material' | 'equipment'; ref: string; qty: number; price: number; currency: 'gems' | 'essence'; minLevel?: number }
export const SHOPS: Record<string, { name: string; npc: string; products: ShopProduct[] }> = {
  general: {
    name: 'Erzak', npc: 'tuccar',
    products: [
      { id: 'potion_gems', name: 'Kırmızı İksir', kind: 'material', ref: 'red_potion', qty: 1, price: 6, currency: 'gems' },
      { id: 'potion_ess', name: 'Kırmızı İksir (Öz ile)', kind: 'material', ref: 'red_potion', qty: 1, price: 15, currency: 'essence' },
      { id: 'potion_pack', name: '10× Kırmızı İksir', kind: 'material', ref: 'red_potion', qty: 10, price: 55, currency: 'gems' },
    ],
  },
  smith: {
    name: 'Haso\'nun Tezgâhı', npc: 'haso',
    products: [
      { id: 'branch', name: 'Güçlü Dal', kind: 'material', ref: 'strong_branch', qty: 1, price: 20, currency: 'gems' },
      { id: 'blue_weapon', name: 'Mavi Silah (sınıfına uygun)', kind: 'equipment', ref: 'weapon:blue', qty: 1, price: 450, currency: 'gems', minLevel: 7 },
      { id: 'blue_armor', name: 'Mavi Zırh (sınıfına uygun)', kind: 'equipment', ref: 'armor:blue', qty: 1, price: 400, currency: 'gems', minLevel: 7 },
    ],
  },
};
export const ESSENCE_TO_GEMS = { essence: 100, gems: 20 };

export interface UpgradeStep { target: number; chance: number; korSeal: number; gems: number; mat: string; matQty: number }
export const UPGRADE_TABLE: UpgradeStep[] = [
  { target: 1, chance: 100, korSeal: 1, gems: 100, mat: 'strong_branch', matQty: 5 },
  { target: 2, chance: 85, korSeal: 2, gems: 250, mat: 'strong_crystal', matQty: 10 },
  { target: 3, chance: 65, korSeal: 3, gems: 500, mat: 'desert_herb', matQty: 15 },
  { target: 4, chance: 45, korSeal: 4, gems: 1000, mat: 'master_scroll', matQty: 20 },
  { target: 5, chance: 25, korSeal: 5, gems: 2000, mat: 'old_iron', matQty: 25 },
];
/** Ustalık Mührü göreli %30 artırır: %20 → %26. */
export function masteryChance(base: number): number { return Math.min(100, Math.round(base * 1.3 * 10) / 10); }

export const SELL_PRICES: Record<string, number> = { white: 5, blue: 18, orange: 60, crimson: 180, unique: 500, infinite: 700, purple: 600, emerald: 900 };
