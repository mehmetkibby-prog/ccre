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
