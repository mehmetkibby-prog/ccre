import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const jobs = {
  tree_cute: 'A single cute stylized deciduous tree game asset, soft rounded fluffy canopy made of a few big puffy cloud-like leaf clusters in fresh vibrant spring green with lighter yellow-green highlights on top, short sturdy warm brown trunk with a gentle curve and a few visible roots, charming cozy fairytale village style like a Ghibli or Animal Crossing tree, clean hand-painted texture, front view, whole tree fully visible, isolated on plain light grey studio background, no ground plane, no text',
  ny_fir: 'A single tall elegant Christmas fir tree game asset, perfectly symmetrical full cone shape with many soft layered tiers of lush deep emerald green needles, slightly lighter green tips, a few round shiny ornament balls in red and gold, a golden star on the top, straight brown trunk visible at the bottom, cozy stylized fairytale hand-painted RPG style, front view, whole tree fully visible from base to star, isolated on plain light grey studio background, no lights, no snow, no gifts, no text',
};
const icons = {
  icon_pick: 'Game UI icon for "pick up loot": a small open leather pouch with golden coins and a glowing green gem spilling out, a hand-drawn golden sparkle above it, rich fantasy RPG icon style, centered, clean bold silhouette, dark transparent-looking deep brown background vignette, square, no text',
};
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const save = () => fs.writeFileSync('state.json', JSON.stringify(st));
console.log('kredi', (await call('GET', '/balance')).balance);
for (const [k, prompt] of Object.entries({ ...jobs, ...icons })) if (!st[k + '_img']) { st[k + '_img'] = (await call('POST', '/text-to-image', { ai_model: 'nano-banana', prompt, aspect_ratio: icons[k] ? '1:1' : '3:4' })).result; save(); }
for (const k of Object.keys({ ...jobs, ...icons })) {
  for (;;) { const t = await call('GET', `/text-to-image/${st[k + '_img']}`); if (t.status === 'SUCCEEDED') { if (!fs.existsSync(k + '.png')) fs.writeFileSync(k + '.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); break; } if (t.status === 'FAILED') throw new Error(k + ' img fail'); await sleep(4000); }
  console.log(k, 'gorsel tamam');
}
for (const k of Object.keys(jobs)) if (!st[k + '_3d']) {
  const image_url = 'data:image/png;base64,' + fs.readFileSync(k + '.png').toString('base64');
  st[k + '_3d'] = (await call('POST', '/image-to-3d', { image_url, ai_model: 'latest', should_texture: true, enable_pbr: false, topology: 'triangle', target_polycount: 7000, should_remesh: true })).result; save();
}
await Promise.all(Object.keys(jobs).map(async (k) => {
  if (fs.existsSync(k + '.glb')) return;
  for (;;) { const t = await call('GET', `/image-to-3d/${st[k + '_3d']}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.glb', Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer())); console.log(k, '3d tamam'); return; } if (['FAILED', 'CANCELED'].includes(t.status)) { console.log(k, 'HATA'); return; } await sleep(6000); }
}));
console.log('kredi', (await call('GET', '/balance')).balance);
