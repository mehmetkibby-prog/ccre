// Sv. 1 becerileri: 3 sınıfın yeni başlangıç becerisi ikonu + kilitli beceri amblemi (tek görsel, 2×2). Durum state.json
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const prompt = 'A 2 by 2 grid of four square fantasy MMORPG skill icons, each icon exactly fills one quarter of the image edge to edge, each with its own thin ornate antique gold square border frame, separated by a thin black gap. Painterly semi-realistic hand-painted RPG skill icon style, dramatic lighting, rich saturated colors, bold readable silhouette, no text, no letters, no people faces. '
  + 'Top-left: SHIELD BASH — a heavy blue-steel heater shield with a gold rim and a red lion crest slamming forward toward the viewer, a bright golden impact flash and a crescent shockwave bursting from its face, flying white-gold sparks, stars of stun circling, steel blue and warm gold tones. '
  + 'Top-right: LEAPING SHOT — a glowing emerald arrow streaking forward while a curved bow and swirling green wind trail arc backward away from it, leaf fragments and feathers scattered, sense of a quick backward leap, fresh green and white tones. '
  + 'Bottom-left: ESSENCE CHAIN — a crackling violet arcane lightning bolt jumping in a zigzag chain between three glowing purple orbs, bright white-pink core, small runes floating, magenta sparks, deep indigo background. '
  + 'Bottom-right: SEALED SKILL — an antique dark iron padlock with gold filigree, locked, a faint cold blue glow behind it, simple and clear.';
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
console.log('kredi', (await call('GET', '/balance')).balance);
if (!st.sheet) { st.sheet = (await call('POST', '/text-to-image', { ai_model: 'nano-banana-pro', prompt, aspect_ratio: '1:1' })).result; fs.writeFileSync('state.json', JSON.stringify(st, null, 1)); }
for (;;) { const t = await call('GET', `/text-to-image/${st.sheet}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync('sheet.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); break; } if (t.status === 'FAILED') { console.log('HATA', JSON.stringify(t.task_error)); break; } await sleep(5000); }
console.log('kredi', (await call('GET', '/balance')).balance);
