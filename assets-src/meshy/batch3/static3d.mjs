// sabit modeller: dağlar ve vaşak (iskeletsiz; vaşak sonra quad-rig ile dört ayaklı iskelete bağlanır)
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const jobs = { mountain_a: 9000, mountain_b: 9000, lynx: 12000 };
const st = fs.existsSync('static_state.json') ? JSON.parse(fs.readFileSync('static_state.json')) : {};
for (const [k, poly] of Object.entries(jobs)) {
  if (st[k]) continue;
  const image_url = 'data:image/png;base64,' + fs.readFileSync(k + '.png').toString('base64');
  st[k] = (await call('POST', '/image-to-3d', { image_url, ai_model: 'latest', should_texture: true, enable_pbr: false, topology: 'triangle', target_polycount: poly, should_remesh: true })).result;
  fs.writeFileSync('static_state.json', JSON.stringify(st));
}
await Promise.all(Object.entries(st).map(async ([k, id]) => {
  if (fs.existsSync(k + '.glb')) return;
  for (;;) { const t = await call('GET', `/image-to-3d/${id}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.glb', Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer())); console.log(k, 'tamam'); return; } if (['FAILED', 'CANCELED'].includes(t.status)) { console.log(k, 'HATA', JSON.stringify(t.task_error)); return; } await sleep(6000); }
}));
console.log('kredi', (await call('GET', '/balance')).balance);
