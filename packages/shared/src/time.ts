/** Türkiye takvimi (Europe/Istanbul, kalıcı UTC+3). Günlük haklar bu güne göre döner; cihaz saati kullanılmaz. */
export const TR_OFFSET_MS = 3 * 3600_000;
export function trDayKey(epochMs: number): string {
  const d = new Date(epochMs + TR_OFFSET_MS);
  return d.toISOString().slice(0, 10);
}
export function trClock(epochMs: number): { h: number; m: number; s: number } {
  const d = new Date(epochMs + TR_OFFSET_MS);
  return { h: d.getUTCHours(), m: d.getUTCMinutes(), s: d.getUTCSeconds() };
}

/** Sıralama dönemi (Türkiye takvimi): gün, hafta (Pazartesi başlar) ya da ay. Anahtar ve bitiş anı. */
export type RankPeriod = 'day' | 'week' | 'month';
export function trPeriod(epochMs: number, period: RankPeriod): { key: string; start: number; end: number } {
  const d = new Date(epochMs + TR_OFFSET_MS);
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate();
  let start: number, end: number;
  if (period === 'day') { start = Date.UTC(y, m, day); end = start + 86400_000; }
  else if (period === 'month') { start = Date.UTC(y, m, 1); end = Date.UTC(y, m + 1, 1); }
  else { const wd = (d.getUTCDay() + 6) % 7; start = Date.UTC(y, m, day - wd); end = start + 7 * 86400_000; }
  const key = period[0] + new Date(start).toISOString().slice(0, 10);
  return { key, start: start - TR_OFFSET_MS, end: end - TR_OFFSET_MS };
}
