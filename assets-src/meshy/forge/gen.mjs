// Kor Kulesi: canavar + boss konseptleri ve malzeme ikon sayfası (nano-banana-pro). Durum state.json (tekrar çalıştırınca kredi harcamaz)
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const MON = 'full body fully visible from head to feet, front view facing the camera, A-pose with arms held about 40 degrees away from the body, legs apart, empty open hands, no weapon, semi-realistic dark fantasy MMORPG monster character art, highly detailed materials, plain light grey studio background, soft even lighting, single character only, no text, no frame';
const jobs = {
  f_slag: { aspect: '3:4', pose: 'a-pose', prompt: 'A slag golem monster from a hellish forge, a stocky hunched humanoid made of black cooled volcanic slag and dark iron chunks, deep cracks across the whole body glowing bright molten orange from within, heavy oversized forearms and fists, small head sunk between massive shoulders with two glowing yellow ember eyes, bits of rusted iron chain and slag drips on the body, ' + MON },
  f_boss: { aspect: '3:4', pose: 'a-pose', prompt: 'Karademir the Forge Lord, a towering terrifying final boss, a giant muscular demon blacksmith with dark charcoal grey skin, a horned blackened iron mask with glowing molten orange eye slits, massive iron pauldrons riveted to the shoulders, molten orange glowing runes and cracks on the chest and arms, thick scorched leather blacksmith apron with iron plates, heavy iron chains wrapped around the waist, iron bracers, burning embers drifting from the shoulders, ' + MON },
  sheet: { aspect: '1:1', prompt: 'A 2 by 2 grid of four separate fantasy RPG item icons on a flat solid pure magenta background (#FF00FF), each icon centered in its own quarter with wide empty magenta space between them, no grid lines. Top-left: a rough glowing ember stone, a black volcanic rock chunk with bright molten orange cracks and tiny sparks. Top-right: a small heavy ingot of star iron, dark blue-silver metal bar with tiny shining white star specks and a faint blue glow. Bottom-left: an evolution crystal, a tall elegant faceted crystal shard glowing golden and violet with a swirling inner light and a small bronze base. Bottom-right: an ornate forge treasure chest of dark iron and scorched wood with an anvil emblem on the lid, molten orange light leaking from the lid gap. Stylized painterly semi-realistic RPG icon art with soft cel shading, clean bold silhouettes with thin dark outlines, rich colors, no text, no border, no shadow on the background.' },
};
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const b0 = (await call('GET', '/balance')).balance; console.log('kredi', b0);
for (const [k, j] of Object.entries(jobs)) {
  if (st[k]) continue;
  st[k] = (await call('POST', '/text-to-image', { ai_model: 'nano-banana-pro', prompt: j.prompt, aspect_ratio: j.aspect, ...(j.pose ? { pose_mode: j.pose } : {}) })).result;
  fs.writeFileSync('state.json', JSON.stringify(st, null, 1));
}
await Promise.all(Object.entries(st).map(async ([k, id]) => {
  if (fs.existsSync(`${k}.png`)) return;
  for (;;) { const t = await call('GET', `/text-to-image/${id}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(`${k}.png`, Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); console.log(k, 'tamam'); return; } if (t.status === 'FAILED') { console.log(k, 'HATA', JSON.stringify(t.task_error)); return; } await sleep(5000); }
}));
console.log('kredi', (await call('GET', '/balance')).balance);
