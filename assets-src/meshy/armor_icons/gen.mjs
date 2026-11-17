// Renkli zırh simgeleri (mavi/turuncu/kızıl/eşsiz × 3 sınıf): yalnız zırhın kendisi, kişi/kol/el yok.
// Düz magenta arka planla üretilir; key.mjs arka planı şeffaf yapar. node gen.mjs (NODE_USE_ENV_PROXY=1)
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const STYLE = ' Fantasy RPG inventory item icon of the armor piece ALONE, displayed upright and front-facing as if worn by an invisible body: absolutely no person, no head, no face, no neck, no hands, no arms, no legs, no mannequin, no stand, empty hollow collar and empty sleeves. Painterly semi-realistic with soft cel shading, clean bold silhouette with a thin dark outline, rich saturated colors, centered and filling about 80% of the square frame, single object only. Flat solid pure magenta background (#FF00FF) with no gradient and no shadow, no text, no border, no frame.';
const CLS = {
  guardian: 'heavy knight plate armor chest piece (cuirass with rounded shoulder pauldrons and a cloth tabard hanging at the front)',
  hunter: 'light ranger leather armor (fitted leather jerkin vest with short leather shoulder guards, cross straps and buckles, short skirt flaps)',
  arcanist: 'long flowing wizard robe (high collar, wide long sleeves hanging empty, embroidered front panel and a sash belt)',
};
const RAR = {
  blue: 'in polished silver steel and deep sapphire blue, with blue enamel, silver trims and a small glowing blue gem',
  orange: 'in warm amber orange and burnished gold, with golden trims, a sun emblem and a small glowing amber gem',
  crimson: 'in dark blackened steel and deep crimson red, with ornate red filigree, spiky accents and a glowing ruby gem',
  unique: 'in radiant ivory white and shining gold, with intricate golden filigree, glowing golden runes and a bright golden gem, legendary and majestic',
};
const jobs = {};
for (const [c, cd] of Object.entries(CLS)) for (const [r, rd] of Object.entries(RAR)) jobs[`armor_${c}_${r}`] = `A ${cd} ${rd}.` + STYLE;
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const save = () => fs.writeFileSync('state.json', JSON.stringify(st, null, 1));
console.log('kredi', (await call('GET', '/balance')).balance);
for (const [k, prompt] of Object.entries(jobs)) if (!st[k]) { st[k] = (await call('POST', '/text-to-image', { ai_model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' })).result; save(); }
await Promise.all(Object.keys(jobs).map(async (k) => {
  if (fs.existsSync(k + '.png')) return;
  for (;;) { const t = await call('GET', `/text-to-image/${st[k]}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); console.log(k, 'tamam'); return; } if (t.status === 'FAILED') { console.log(k, 'HATA', JSON.stringify(t.task_error)); return; } await sleep(4000); }
}));
console.log('kredi', (await call('GET', '/balance')).balance);
