/** Türkçe duyarlı ad normalizasyonu: tekillik ve arama için. */
const MAP: Record<string, string> = { 'İ': 'i', 'I': 'ı', 'Ş': 'ş', 'Ğ': 'ğ', 'Ü': 'ü', 'Ö': 'ö', 'Ç': 'ç' };
export function trLower(s: string): string {
  return s.replace(/[İIŞĞÜÖÇ]/g, (c) => MAP[c] ?? c).toLowerCase();
}
/** Tekillik anahtarı: Türkçe harfleri sadeleştirir, böylece "Işık" ve "isik" çakışır. */
export function normalizeName(s: string): string {
  return trLower(s.trim())
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g').replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .replace(/[^a-z0-9]/g, '');
}
const RESERVED = ['gm', 'admin', 'yonetici', 'moderator', 'sistem', 'system', 'coreoflife', 'destek', 'owner', 'haso', 'rauf', 'pakize'];
const BANNED_FRAGMENTS = ['amk', 'orospu', 'sik', 'yarrak', 'pic', 'got'];
export function validateCharacterName(name: string): string | null {
  const t = name.trim();
  if ([...t].length < 2 || [...t].length > 18) return 'İsim 2–18 karakter olmalı.';
  if (!/^[A-Za-zÇĞİÖŞÜçğıöşü0-9_]+$/.test(t)) return 'İsimde yalnız harf, rakam ve alt çizgi kullanılabilir.';
  const n = normalizeName(t);
  if (n.length < 2) return 'İsim çok kısa.';
  if (RESERVED.some((r) => n === r || n.startsWith(r + '_') || n.startsWith('gm'))) return 'Bu isim ayrılmış.';
  if (BANNED_FRAGMENTS.some((b) => n.includes(b) && n.length <= b.length + 3)) return 'Bu isim kullanılamaz.';
  return null;
}
export function sanitizeChat(s: string, max = 140): string {
  return s.replace(/[\u0000-\u001f\u007f]/g, '').slice(0, max).trim();
}
