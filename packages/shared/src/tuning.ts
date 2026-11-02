/**
 * Oyun ayarları (yönetim panelinden değişir). Varsayılanlar oyunun özgün dengesidir:
 * hepsi 1 / boşken davranış bu dosya yokmuş gibidir. Sunucu ve tarayıcı aynı nesneyi okur.
 */
export interface GameTuning {
  xpMul: number; gemMul: number; essenceMul: number; dropMul: number;
  monsterHpMul: number; monsterAtkMul: number; respawnMul: number;
  density: Record<string, number>; // harita başına canavar yoğunluğu çarpanı
  bots: number; worldDecayMul: number; brightness: number;
  announcement: string;
}
export const DEFAULT_TUNING: GameTuning = {
  xpMul: 1, gemMul: 1, essenceMul: 1, dropMul: 1,
  monsterHpMul: 1, monsterAtkMul: 1, respawnMul: 1,
  density: {}, bots: 8, worldDecayMul: 1, brightness: 1, announcement: '',
};
/** Panelde gösterilen sınırlar: değerler her zaman bu aralığa sıkıştırılır. */
export const TUNING_LIMITS: Record<Exclude<keyof GameTuning, 'density' | 'announcement'>, [number, number, number]> = {
  xpMul: [0.1, 10, 0.1], gemMul: [0, 10, 0.1], essenceMul: [0, 10, 0.1], dropMul: [0, 10, 0.1],
  monsterHpMul: [0.2, 5, 0.05], monsterAtkMul: [0.2, 5, 0.05], respawnMul: [0.2, 5, 0.05],
  bots: [0, 24, 1], worldDecayMul: [0, 5, 0.1], brightness: [0.6, 1.6, 0.05],
};
export const DENSITY_LIMITS: [number, number, number] = [0.3, 3, 0.05];
export const TUNING: GameTuning = structuredClone(DEFAULT_TUNING);

const clamp = (v: unknown, [lo, hi]: [number, number, number], d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
/** Güvenilmeyen kaynaktan gelen ayarı doğrular; eksik alan varsayılan kalır. */
export function sanitizeTuning(raw: unknown): GameTuning {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const out = structuredClone(DEFAULT_TUNING);
  for (const k of Object.keys(TUNING_LIMITS) as (keyof typeof TUNING_LIMITS)[]) out[k] = clamp(r[k], TUNING_LIMITS[k], DEFAULT_TUNING[k]);
  out.bots = Math.round(out.bots);
  const dn = (r.density && typeof r.density === 'object' ? r.density : {}) as Record<string, unknown>;
  for (const [k, v] of Object.entries(dn)) if (/^[a-z_]{1,24}$/.test(k)) out.density[k] = clamp(v, DENSITY_LIMITS, 1);
  out.announcement = typeof r.announcement === 'string' ? r.announcement.slice(0, 200) : '';
  return out;
}
/** Ayarları yerinde günceller (aynı nesne; okuyanlar her seferinde güncel değeri görür). */
export function applyTuning(raw: unknown): GameTuning {
  const t = sanitizeTuning(raw);
  Object.assign(TUNING, t);
  return TUNING;
}
