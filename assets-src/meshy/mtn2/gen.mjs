import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const BASE = 'stylized hand-painted fantasy RPG game asset, smooth clean gentle silhouette, NOT jagged, NOT spiky, no sharp rock spikes, lush vivid green alpine meadow on the lower and middle slopes, a thick smooth white snow cap covering the upper slopes and summit like a Swiss Alps postcard, soft rounded forms, side view, the whole mountain fully visible, isolated on plain light grey studio background, no sky, no clouds, no trees, no buildings, no text, no frame';
const jobs = {
  alp_a: 'A single isolated majestic tall alpine mountain with one broad smooth snowy summit, wide smooth slopes, ' + BASE,
  alp_b: 'A single isolated wide alpine mountain range ridge with three smooth rounded snowy summits of different heights joined by soft saddles, ' + BASE,
};
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const save = () => fs.writeFileSync('state.json', JSON.stringify(st));
console.log('kredi', (await call('GET', '/balance')).balance);
for (const [k, prompt] of Object.entries(jobs)) if (!st[k + '_img']) { st[k + '_img'] = (await call('POST', '/text-to-image', { ai_model: 'nano-banana', prompt, aspect_ratio: '16:9' })).result; save(); }
for (const k of Object.keys(jobs)) {
  for (;;) { const t = await call('GET', `/text-to-image/${st[k + '_img']}`); if (t.status === 'SUCCEEDED') { if (!fs.existsSync(k + '.png')) fs.writeFileSync(k + '.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); break; } if (t.status === 'FAILED') throw new Error(k + ' img fail'); await sleep(4000); }
  console.log(k, 'gorsel tamam');
}
if (process.argv[2] === 'img') process.exit(0);
for (const k of Object.keys(jobs)) if (!st[k + '_3d']) {
  const image_url = 'data:image/png;base64,' + fs.readFileSync(k + '.png').toString('base64');
  st[k + '_3d'] = (await call('POST', '/image-to-3d', { image_url, ai_model: 'latest', should_texture: true, enable_pbr: false, topology: 'triangle', target_polycount: 7000, should_remesh: true })).result; save();
}
await Promise.all(Object.keys(jobs).map(async (k) => {
  if (fs.existsSync(k + '.glb')) return;
  for (;;) { const t = await call('GET', `/image-to-3d/${st[k + '_3d']}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.glb', Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer())); console.log(k, '3d tamam'); return; } if (['FAILED', 'CANCELED'].includes(t.status)) { console.log(k, 'HATA'); return; } await sleep(6000); }
}));
console.log('kredi', (await call('GET', '/balance')).balance);
