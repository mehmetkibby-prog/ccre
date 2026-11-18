// Sv. 7 becerileri: 3 sınıfın yeni alan becerisi ikonu + "mükemmel vuruş" amblemi (tek görsel, 2×2). Durum state.json
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const prompt = 'A 2 by 2 grid of four square fantasy MMORPG skill icons, each icon exactly fills one quarter of the image edge to edge, each with its own thin ornate antique gold square border frame, separated by a thin black gap. Painterly semi-realistic hand-painted RPG skill icon style, dramatic lighting, rich saturated colors, bold readable silhouette, no text, no letters. '
  + 'Top-left: EARTHQUAKE SLAM — a great steel sword plunged point-down into cracked stone ground, a bright golden-orange shockwave ring bursting outward from the impact, flying rock debris and dust, glowing cracks radiating, blue-grey steel tones with orange light. '
  + 'Top-right: STORM ARROW — a glowing green-white arrow shooting up into a swirling dark storm cloud, from which many bright emerald wind arrows rain down diagonally, green wind streaks, lightning-like light. '
  + 'Bottom-left: ESSENCE VORTEX — a swirling violet and magenta arcane whirlpool vortex seen from above, glowing purple runes orbiting its rim, bright white-pink core imploding, sparks spiraling inward. '
  + 'Bottom-right: PERFECT STRIKE — a radiant golden starburst emblem with a crisp white flash in the center and a thin golden ring, sharp light rays.';
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
console.log('kredi', (await call('GET', '/balance')).balance);
if (!st.sheet) { st.sheet = (await call('POST', '/text-to-image', { ai_model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' })).result; fs.writeFileSync('state.json', JSON.stringify(st, null, 1)); }
for (;;) { const t = await call('GET', `/text-to-image/${st.sheet}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync('sheet.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); break; } if (t.status === 'FAILED') { console.log('HATA', JSON.stringify(t.task_error)); break; } await sleep(5000); }
console.log('kredi', (await call('GET', '/balance')).balance);
