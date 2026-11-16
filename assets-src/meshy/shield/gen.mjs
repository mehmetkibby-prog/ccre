import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const step = process.argv[2];
console.log('kredi', (await call('GET', '/balance')).balance);
if (step === 'img') {
  const prompt = 'A single heroic fantasy knight heater shield game asset, front view facing the camera, perfectly straight and centered, thick polished steel rim with gold trim and rivets, deep crimson red enamel face with a raised golden lion crest emblem in the center, slightly convex, chunky stylized semi-realistic MMORPG style like a hand-painted game prop, the whole shield fully visible, isolated on plain light grey studio background, soft even lighting, no hands, no text, no frame';
  if (!st.img) { st.img = (await call('POST', '/text-to-image', { ai_model: 'nano-banana', prompt, aspect_ratio: '1:1' })).result; fs.writeFileSync('state.json', JSON.stringify(st)); }
  for (;;) { const t = await call('GET', `/text-to-image/${st.img}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync('shield.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); break; } if (t.status === 'FAILED') { console.log('HATA', JSON.stringify(t.task_error)); break; } await sleep(4000); }
}
if (step === '3d') {
  if (!st.mesh) {
    const image_url = 'data:image/png;base64,' + fs.readFileSync('shield.png').toString('base64');
    st.mesh = (await call('POST', '/image-to-3d', { image_url, ai_model: 'latest', should_texture: true, enable_pbr: false, topology: 'triangle', target_polycount: 4000, should_remesh: true })).result;
    fs.writeFileSync('state.json', JSON.stringify(st));
  }
  for (;;) { const t = await call('GET', `/image-to-3d/${st.mesh}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync('shield.glb', Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer())); console.log('tamam'); break; } if (['FAILED', 'CANCELED'].includes(t.status)) { console.log('HATA', JSON.stringify(t.task_error)); break; } await sleep(6000); }
}
console.log('kredi', (await call('GET', '/balance')).balance);
