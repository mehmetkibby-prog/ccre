/**
 * Gece-gündüz döngüsü (Türkiye saati, UTC+3; yaz saati yok). Yönetimden açılır, saatler ve gecenin koyuluğu ayarlanır;
 * oyuncu ayarlardan kapatabilir. Saat dilimleri:
 *   tan (dawn → day): gece → pembe-altın alaca → gündüz
 *   gündüz (day → dusk)
 *   akşamüstü (dusk → night): gündüz → altın-turuncu gün batımı → gece (ortası en kızıl an)
 *   gece (night → dawn): ay ışığı mavisi; zifiri değil (koyuluk yönetimden, en çok %85)
 */
export type DayNightForce = 'auto' | 'day' | 'dusk' | 'night';
export interface DayNightTune {
  enabled: boolean;
  /** gecenin koyuluğu 0..1 (0,6 = okunaklı ay ışığı; 1 = en koyu izin verilen) */
  dark: number;
  /** saatler (ondalık: 17,5 = 17:30) */
  dawn: number; day: number; dusk: number; night: number;
  /** yönetim önizlemesi: hep gündüz / akşamüstü / gece */
  force: DayNightForce;
}
export const DAYNIGHT_DEFAULT: DayNightTune = { enabled: true, dark: 0.6, dawn: 5.5, day: 7.5, dusk: 17.5, night: 20.5, force: 'auto' };

export function sanitizeDayNight(raw: unknown): DayNightTune {
  const r = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const D = DAYNIGHT_DEFAULT;
  const h = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.min(23.99, Math.max(0, Math.round(n * 4) / 4)) : d; };
  let dawn = h(r.dawn, D.dawn), day = h(r.day, D.day), dusk = h(r.dusk, D.dusk), night = h(r.night, D.night);
  // sıra bozuksa varsayılana dön (tan < gündüz < akşamüstü < gece)
  if (!(dawn < day && day < dusk && dusk < night)) { dawn = D.dawn; day = D.day; dusk = D.dusk; night = D.night; }
  const dk = Number(r.dark);
  const force = r.force === 'day' || r.force === 'dusk' || r.force === 'night' ? r.force : 'auto';
  return { enabled: r.enabled === undefined ? D.enabled : !!r.enabled, dark: Number.isFinite(dk) ? Math.min(0.85, Math.max(0, dk)) : D.dark, dawn, day, dusk, night, force };
}

/** Türkiye saatiyle günün saati (0..24, ondalık) */
export function trHour(epochMs: number): number {
  const d = new Date(epochMs + 3 * 3600_000);
  return d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
}

const smooth = (a: number, b: number, x: number) => { const t = Math.min(1, Math.max(0, (x - a) / Math.max(1e-6, b - a))); return t * t * (3 - 2 * t); };

/**
 * Anın ağırlıkları: night (0..1 gece), dusk (0..1 gün batımı/alaca rengi). Gündüz = geri kalan.
 * Akşamüstü dilimi: ilk yarıda gündüz → kızıl, ikinci yarıda kızıl → gece. Tan: gece → alaca → gündüz.
 */
export function dayNightAt(t: DayNightTune, hour: number): { night: number; dusk: number; label: 'Gündüz' | 'Akşamüstü' | 'Gece' | 'Şafak' } {
  if (t.force === 'day') return { night: 0, dusk: 0, label: 'Gündüz' };
  if (t.force === 'dusk') return { night: 0.15, dusk: 1, label: 'Akşamüstü' };
  if (t.force === 'night') return { night: 1, dusk: 0, label: 'Gece' };
  const h = hour;
  if (h >= t.day && h < t.dusk) return { night: 0, dusk: 0, label: 'Gündüz' };
  if (h >= t.dusk && h < t.night) {
    const mid = (t.dusk + t.night) / 2;
    if (h < mid) return { night: 0, dusk: smooth(t.dusk, mid, h), label: 'Akşamüstü' };
    const k = smooth(mid, t.night, h);
    return { night: k, dusk: 1 - k * 0.85, label: k > 0.6 ? 'Gece' : 'Akşamüstü' };
  }
  if (h >= t.dawn && h < t.day) {
    const mid = (t.dawn + t.day) / 2;
    if (h < mid) { const k = smooth(t.dawn, mid, h); return { night: 1 - k, dusk: k * 0.8, label: 'Şafak' }; }
    return { night: 0, dusk: 0.8 * (1 - smooth(mid, t.day, h)), label: 'Şafak' };
  }
  return { night: 1, dusk: 0, label: 'Gece' };
}
