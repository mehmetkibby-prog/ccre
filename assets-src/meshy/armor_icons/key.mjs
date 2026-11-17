// Magenta (#FF00FF) arka planı şeffaf yapar, kenardaki pembe sızıntıyı temizler, kırpıp 128×128 simgeye küçültür.
// node key.mjs <girdi.png> <çıktı.png>
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('../../../node_modules/sharp');
const [inp, out] = process.argv.slice(2);
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const W = info.width, H = info.height;
for (let i = 0; i < W * H; i++) {
  const o = i * 4, r = data[o], g = data[o + 1], b = data[o + 2];
  // magentalık: kırmızı ve mavi yüksek, yeşil düşük
  const m = Math.min(r, b) - g; // ~255 saf magenta, ~0 doğal renk
  let a = 255;
  if (m > 150) a = 0; else if (m > 60) a = Math.round(255 * (150 - m) / 90);
  if (a < 255 && a > 0) { // yarı saydam kenar: magenta katkısını çıkar
    const k = 1 - a / 255;
    data[o] = Math.max(0, Math.min(255, (r - 255 * k) / Math.max(0.05, 1 - k)));
    data[o + 2] = Math.max(0, Math.min(255, (b - 255 * k) / Math.max(0.05, 1 - k)));
  }
  if (a === 255 && m > 25) { const avg = (Math.min(r, b) + g) / 2; data[o] = Math.min(r, avg + (r - Math.min(r, b))); data[o + 2] = Math.min(b, avg + (b - Math.min(r, b))); } // pembe ton sızıntısı
  data[o + 3] = a;
}
const keyed = await sharp(data, { raw: { width: W, height: H, channels: 4 } }).png().toBuffer();
const trimmed = await sharp(keyed).trim({ threshold: 1 }).toBuffer();
await sharp(trimmed).resize(116, 116, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 6, bottom: 6, left: 6, right: 6, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png({ compressionLevel: 9 }).toFile(out);
console.log(out);
