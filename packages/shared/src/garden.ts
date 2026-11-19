/**
 * Şifa Bahçesi (Pazar Köyü, tilkilere giden yolun doğusu): 4 sıra × 4 bitki. Her sıra ayrı tür; orakla eğilip
 * toplanır, her oyuncu için ayrı yeniden büyür (oyuncular birbirinin bitkisini kapmaz). Şifacı Reyhan orak satar
 * ve bitkilerden iksir yapar. Fiyatlar, süreler, tarifler ve iksir etkileri yönetimden.
 */
import { TILE } from './constants.ts';

export type HerbKey = 'herb_wind' | 'herb_blood' | 'herb_life' | 'herb_star';
export type PotionKey = 'potion_swift' | 'potion_hunter' | 'potion_life' | 'potion_star';
export const HERBS: HerbKey[] = ['herb_wind', 'herb_blood', 'herb_life', 'herb_star'];
export const POTIONS: PotionKey[] = ['potion_swift', 'potion_hunter', 'potion_life', 'potion_star'];
/** iksirin etkisi (yönetimdeki değerle): saldırı hızı %, canavara hasar %, azami can %, kritik şansı (puan) */
export const POTION_EFFECT: Record<PotionKey, { name: string; unit: string }> = {
  potion_swift: { name: 'Saldırı hızı', unit: '%' },
  potion_hunter: { name: 'Canavarlara hasar', unit: '%' },
  potion_life: { name: 'Azami can', unit: '%' },
  potion_star: { name: 'Kritik şansı', unit: '%' },
};

/** bahçe karoları (Pazar Köyü haritası) */
export const GARDEN_AREA = { x0: 33, y0: 42, x1: 45, y1: 55 };
export const GARDEN_COLS = [35, 37.5, 40, 42.5];
export const GARDEN_ROWS = [44, 47, 50, 53];
export interface GardenPlant { i: number; row: number; herb: HerbKey; x: number; y: number }
/** 16 bitki: sıra sıra (0: Rüzgâr Otu, 1: Avcı Yaprağı, 2: Hayat Çiçeği, 3: Yıldız Menekşesi) */
export const GARDEN_PLANTS: GardenPlant[] = GARDEN_ROWS.flatMap((ty, row) => GARDEN_COLS.map((tx, c) => ({
  i: row * 4 + c, row, herb: HERBS[row], x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE,
})));
export const GARDEN_MAP = 'bazaar';
/** bitkiye eğilmek için en çok uzaklık (dünya birimi) */
export const GARDEN_REACH = 96;

export interface Recipe { potion: PotionKey; herbs: Partial<Record<HerbKey, number>>; gems: number; out: number }
export interface PotionTune { value: number; min: number }
export interface GardenTune {
  enabled: boolean;
  /** Orak fiyatı (Mücevher) */
  sicklePrice: number;
  /** bitkinin yeniden olgunlaşma süresi (sn) */
  regrowSec: number;
  /** eğilip toplama süresi (ms) */
  gatherMs: number;
  /** bir toplamada çıkan bitki [en az, en çok] */
  qty: [number, number];
  recipes: Recipe[];
  effects: Record<PotionKey, PotionTune>;
}

export const GARDEN_DEFAULT: GardenTune = {
  enabled: true, sicklePrice: 300, regrowSec: 600, gatherMs: 1800, qty: [1, 2],
  recipes: [
    { potion: 'potion_swift', herbs: { herb_wind: 3 }, gems: 20, out: 1 },
    { potion: 'potion_hunter', herbs: { herb_blood: 3 }, gems: 20, out: 1 },
    { potion: 'potion_life', herbs: { herb_life: 3 }, gems: 20, out: 1 },
    { potion: 'potion_star', herbs: { herb_star: 3 }, gems: 25, out: 1 },
  ],
  effects: {
    potion_swift: { value: 12, min: 10 },
    potion_hunter: { value: 10, min: 10 },
    potion_life: { value: 15, min: 10 },
    potion_star: { value: 8, min: 10 },
  },
};

const obj = (v: unknown) => (v && typeof v === 'object' && !Array.isArray(v) ? v as Record<string, unknown> : {});
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function sanitizeGarden(raw: unknown): GardenTune {
  const r = obj(raw), D = GARDEN_DEFAULT;
  const q = Array.isArray(r.qty) ? r.qty : D.qty;
  const a = Math.round(num(q[0], 1, 99, D.qty[0])), b = Math.round(num(q[1], 1, 99, D.qty[1]));
  const recipes: Recipe[] = [];
  for (const x of Array.isArray(r.recipes) ? r.recipes.slice(0, 12) : D.recipes) {
    const o = obj(x);
    if (!POTIONS.includes(o.potion as PotionKey)) continue;
    const herbs: Recipe['herbs'] = {};
    for (const [k, v] of Object.entries(obj(o.herbs))) if (HERBS.includes(k as HerbKey)) { const n = Math.round(num(v, 0, 999, 0)); if (n > 0) herbs[k as HerbKey] = n; }
    recipes.push({ potion: o.potion as PotionKey, herbs, gems: Math.round(num(o.gems, 0, 1e7, 0)), out: Math.round(num(o.out, 1, 99, 1)) });
  }
  const effects = {} as GardenTune['effects'];
  const re = obj(r.effects);
  for (const k of POTIONS) { const e = obj(re[k]); effects[k] = { value: num(e.value, 0, 300, D.effects[k].value), min: Math.round(num(e.min, 1, 24 * 60, D.effects[k].min)) }; }
  return {
    enabled: r.enabled !== false,
    sicklePrice: Math.round(num(r.sicklePrice, 0, 1e7, D.sicklePrice)),
    regrowSec: Math.round(num(r.regrowSec, 5, 86400, D.regrowSec)),
    gatherMs: Math.round(num(r.gatherMs, 300, 10000, D.gatherMs)),
    qty: [Math.min(a, b), Math.max(a, b)],
    recipes: Array.isArray(r.recipes) ? recipes : structuredClone(D.recipes),
    effects,
  };
}

/** İksir etkilerinin toplamı (etkin olanlar): sunucu karakter gücünü hesaplarken kullanır */
export function potionBuffs(buffs: Record<string, number> | undefined, now: number, t: GardenTune): { atkSpeed: number; pve: number; hpPct: number; crit: number } {
  const on = (k: PotionKey) => (buffs?.[k] ?? 0) > now ? t.effects[k].value : 0;
  return { atkSpeed: on('potion_swift'), pve: on('potion_hunter'), hpPct: on('potion_life'), crit: on('potion_star') };
}
