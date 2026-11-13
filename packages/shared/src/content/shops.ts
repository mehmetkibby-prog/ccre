import { TUNING } from '../tuning.ts';
/** NPC mağazaları ve artı basma tablosu (referans varsayılanları; yönetimden revizyonla değişir). */
export interface ShopProduct { id: string; name: string; kind: 'material' | 'equipment'; ref: string; qty: number; price: number; currency: 'gems' | 'essence'; minLevel?: number }
export const SHOPS: Record<string, { name: string; npc: string; products: ShopProduct[] }> = {
  general: {
    name: 'Erzak', npc: 'tuccar',
    products: [
      { id: 'potion_gems', name: 'Kırmızı İksir', kind: 'material', ref: 'red_potion', qty: 1, price: 6, currency: 'gems' },
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


/** NPC'ye / çantadan doğrudan satış fiyatı (Mücevher); yönetim panelinden değişebilir (sellPrice). */
export const SELL_PRICES: Record<string, number> = { white: 1, blue: 3, orange: 5, crimson: 15, unique: 25, infinite: 35, purple: 30, emerald: 50 };
/** Oyuncular arası pazarda eşyanın yaklaşık değeri (önerilen dükkân fiyatı ve test botlarının alım sınırı). */
export const MARKET_VALUE: Record<string, number> = { white: 5, blue: 18, orange: 60, crimson: 180, unique: 500, infinite: 700, purple: 600, emerald: 900 };
/** Geçerli satış fiyatı: yönetim ayarı varsa o. */
export function sellPrice(rarity: string): number { return TUNING.sellPrice[rarity] ?? SELL_PRICES[rarity] ?? 1; }
