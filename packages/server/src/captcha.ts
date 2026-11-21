// Web Crypto: hem Node (sunucu) hem tarayıcıda (çevrimdışı sürüm) çalışır
const cry = globalThis.crypto;
function randomInt(lo: number, hi: number) { const a = new Uint32Array(1); cry.getRandomValues(a); return lo + (a[0] % (hi - lo)); }
function randomId(n: number) { const a = new Uint8Array(n); cry.getRandomValues(a); let s = ''; for (const b of a) s += 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_'[b & 63]; return s; }

/**
 * Kayıt doğrulama kodu (bot koruması). Kod sunucuda üretilir ve saklanır; görsel SVG içinde YAZI DEĞİL çizgi
 * (kendi küçük çizgi fontumuz) olarak, harf başına rastgele dönüş/kayma/renk ve gürültü eğrileriyle çizilir:
 * SVG'nin metni okunarak kod çıkarılamaz. Her kod tek kullanımlık (doğru ya da yanlış, denenince silinir), 10 dk geçerli.
 */
const ALPHA = 'ACEFHKLMNPRTUWXY23479';
/** 4×6 ızgarada çizgi grupları (y aşağı) */
const GLYPH: Record<string, number[][][]> = {
  A: [[[0, 6], [2, 0], [4, 6]], [[1, 3.6], [3, 3.6]]],
  C: [[[4, 1], [3, 0], [1, 0], [0, 1], [0, 5], [1, 6], [3, 6], [4, 5]]],
  E: [[[4, 0], [0, 0], [0, 6], [4, 6]], [[0, 3], [3, 3]]],
  F: [[[4, 0], [0, 0], [0, 6]], [[0, 3], [3, 3]]],
  H: [[[0, 0], [0, 6]], [[4, 0], [4, 6]], [[0, 3], [4, 3]]],
  K: [[[0, 0], [0, 6]], [[4, 0], [0, 3.6]], [[1.4, 2.5], [4, 6]]],
  L: [[[0, 0], [0, 6], [4, 6]]],
  M: [[[0, 6], [0, 0], [2, 3.2], [4, 0], [4, 6]]],
  N: [[[0, 6], [0, 0], [4, 6], [4, 0]]],
  P: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]]],
  R: [[[0, 6], [0, 0], [3, 0], [4, 1], [4, 2], [3, 3], [0, 3]], [[2, 3], [4, 6]]],
  T: [[[0, 0], [4, 0]], [[2, 0], [2, 6]]],
  U: [[[0, 0], [0, 5], [1, 6], [3, 6], [4, 5], [4, 0]]],
  W: [[[0, 0], [1, 6], [2, 2.8], [3, 6], [4, 0]]],
  X: [[[0, 0], [4, 6]], [[4, 0], [0, 6]]],
  Y: [[[0, 0], [2, 3], [4, 0]], [[2, 3], [2, 6]]],
  '2': [[[0, 1], [1, 0], [3, 0], [4, 1], [4, 2], [0, 6], [4, 6]]],
  '3': [[[0, 0], [4, 0], [2, 2.5], [3, 2.5], [4, 3.5], [4, 5], [3, 6], [1, 6], [0, 5]]],
  '4': [[[3, 6], [3, 0], [0, 4], [4, 4]]],
  '7': [[[0, 0], [4, 0], [1.5, 6]]],
  '9': [[[4, 3], [1, 3], [0, 2], [0, 1], [1, 0], [3, 0], [4, 1], [4, 5], [3, 6], [0, 6]]],
};
const TTL = 10 * 60_000, MAX = 20_000;
const store = new Map<string, { a: string; exp: number }>();
const rnd = (a: number, b: number) => a + (randomInt(0, 1_000_000) / 1_000_000) * (b - a);
const f = (n: number) => n.toFixed(1);

function svgFor(code: string): string {
  const W = 200, H = 64, out: string[] = [];
  out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}"><rect width="${W}" height="${H}" rx="8" fill="#f3ead6"/>`);
  // arka plan gürültüsü: noktalar ve ince eğriler
  for (let i = 0; i < 46; i++) out.push(`<circle cx="${f(rnd(0, W))}" cy="${f(rnd(0, H))}" r="${f(rnd(0.6, 1.8))}" fill="hsl(${randomInt(0, 360)},40%,${randomInt(45, 70)}%)" opacity=".7"/>`);
  for (let i = 0; i < 3; i++) out.push(`<path d="M${f(rnd(-10, 20))} ${f(rnd(8, H - 8))} C ${f(rnd(40, 80))} ${f(rnd(0, H))}, ${f(rnd(110, 160))} ${f(rnd(0, H))}, ${f(rnd(185, 215))} ${f(rnd(8, H - 8))}" stroke="hsl(${randomInt(0, 360)},45%,55%)" stroke-width="${f(rnd(1, 1.8))}" fill="none" opacity=".75"/>`);
  const step = (W - 24) / code.length;
  [...code].forEach((ch, i) => {
    const sx = rnd(4.2, 5.4), sy = rnd(5.6, 6.8), cx = 14 + i * step + rnd(-2, 4), cy = rnd(8, 14), rot = rnd(-22, 22), skew = rnd(-14, 14);
    const d = GLYPH[ch].map((pl) => pl.map(([x, y], k) => `${k ? 'L' : 'M'}${f(x * sx + rnd(-0.8, 0.8))} ${f(y * sy + rnd(-0.8, 0.8))}`).join(' ')).join(' ');
    out.push(`<path transform="translate(${f(cx)} ${f(cy)}) rotate(${f(rot)} 10 18) skewX(${f(skew)})" d="${d}" stroke="hsl(${randomInt(0, 360)},55%,${randomInt(22, 36)}%)" stroke-width="${f(rnd(2.6, 3.4))}" stroke-linecap="round" stroke-linejoin="round" fill="none"/>`);
  });
  // harflerin üstünden geçen bir eğri (kesip ayırmayı zorlaştırır)
  out.push(`<path d="M2 ${f(rnd(24, 40))} Q ${f(rnd(60, 140))} ${f(rnd(0, H))} ${W - 2} ${f(rnd(24, 40))}" stroke="hsl(${randomInt(0, 360)},50%,35%)" stroke-width="1.6" fill="none" opacity=".8"/></svg>`);
  return out.join('');
}

/** Yeni doğrulama kodu: kimlik ve SVG görseli (kod istemciye gitmez). */
export function newCaptcha(): { id: string; svg: string } {
  const now = Date.now();
  if (store.size > MAX) for (const [k, v] of store) { if (v.exp < now || store.size > MAX * 0.8) store.delete(k); else break; }
  const code = Array.from({ length: 5 }, () => ALPHA[randomInt(0, ALPHA.length)]).join('');
  const id = randomId(16);
  store.set(id, { a: code, exp: now + TTL });
  return { id, svg: svgFor(code) };
}

/** Kodu doğrular ve her durumda siler (tek deneme). Büyük/küçük harf ve boşluklar önemsiz. */
export function checkCaptcha(id: unknown, answer: unknown): boolean {
  if (typeof id !== 'string' || typeof answer !== 'string') return false;
  const e = store.get(id);
  store.delete(id);
  if (!e || e.exp < Date.now()) return false;
  return answer.replace(/\s+/g, '').toUpperCase() === e.a;
}

/** Yalnız testler için: kodun kendisi */
export function captchaAnswerForTest(id: string) { return store.get(id)?.a; }
