/** Balıkçılık: Şelale Gölü'nde Balıkçı Hasan'dan olta alınır; tutma oyunu Stardew Valley tarzıdır. */
import { TUNING } from '../tuning.ts';

export type FishMotion = 'smooth' | 'dart' | 'mixed' | 'sinker';
export interface FishDef { id: string; name: string; weight: number; diff: number; price: number; motion: FishMotion; pearl?: boolean }
/** id = çantadaki malzeme anahtarı. weight: tutulma ağırlığı, diff: 1–100 zorluk, price: Hasan'a satış (Mücevher, 0 = satılmaz). */
export const FISH: FishDef[] = [
  { id: 'fish_sokan', name: 'Sokan', weight: 50, diff: 22, price: 1, motion: 'smooth' },
  { id: 'fish_zargana', name: 'Zargana', weight: 30, diff: 45, price: 3, motion: 'dart' },
  { id: 'fish_levrek', name: 'Levrek', weight: 15, diff: 65, price: 5, motion: 'mixed' },
  { id: 'white_pearl', name: 'Beyaz İnci', weight: 4, diff: 55, price: 0, motion: 'sinker', pearl: true },
  { id: 'red_pearl', name: 'Kırmızı İnci', weight: 2, diff: 80, price: 0, motion: 'dart', pearl: true },
];
export const FISH_BY_ID = new Map(FISH.map((f) => [f.id, f] as const));
export const ROD_ID = 'fishing_rod';
export const FISHING_DEFAULTS = { rodPrice: 500, biteMin: 2, biteMax: 7 };
export function fishingConf() {
  const f = TUNING.fishing ?? {};
  return { rodPrice: f.rodPrice ?? FISHING_DEFAULTS.rodPrice, biteMin: f.biteMin ?? FISHING_DEFAULTS.biteMin, biteMax: Math.max(f.biteMin ?? FISHING_DEFAULTS.biteMin, f.biteMax ?? FISHING_DEFAULTS.biteMax) };
}
/** Yönetim ayarıyla birleşmiş av tablosu (kapalı olanlar çıkar). */
export function fishTable(): FishDef[] {
  const c = TUNING.fishing?.catches ?? {};
  return FISH.filter((f) => !c[f.id]?.off).map((f) => ({ ...f, weight: c[f.id]?.weight ?? f.weight, diff: c[f.id]?.diff ?? f.diff, price: c[f.id]?.price ?? f.price }));
}
export function fishPrice(id: string) { return fishTable().find((f) => f.id === id)?.price ?? 0; }
