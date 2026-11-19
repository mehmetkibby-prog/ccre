/**
 * Dünya Boss'u (Kadim Sunak): her kanalda kendi zamanlayıcısıyla doğar. Mini haritanın altındaki sayaç doğmasına
 * kalan süreyi gösterir; doğunca "Dünya Boss'una git" düğmesi oyuncuyu meydana götürür. Can, saldırı, savunma, seviye,
 * doğma aralığı ve ganimet Boss sekmesindeki "Kadim Yıkıcı" kartından; buradakiler giriş ve saldırı düzeni.
 */
export const WORLD_BOSS_ID = 'world_boss';
export const WORLD_BOSS_MAP = 'worldboss';
export interface WorldBossTune {
  enabled: boolean;
  /** meydana girmek için en düşük seviye */
  minLevel: number;
  /** alan saldırıları (daire / halka / çizgi) arası süre (sn) */
  patternSec: number;
  /** alan saldırısının hasar çarpanı (normal vuruşun katı) */
  slamMul: number;
}
export const WORLD_BOSS_DEFAULT: WorldBossTune = { enabled: true, minLevel: 30, patternSec: 4.5, slamMul: 2.6 };
const num = (v: unknown, lo: number, hi: number, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : d; };
export function sanitizeWorldBoss(raw: unknown): WorldBossTune {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>, D = WORLD_BOSS_DEFAULT;
  return {
    enabled: r.enabled !== false,
    minLevel: Math.round(num(r.minLevel, 1, 120, D.minLevel)),
    patternSec: num(r.patternSec, 1.5, 60, D.patternSec),
    slamMul: num(r.slamMul, 0, 20, D.slamMul),
  };
}
