// Etkinlik / bitki bahçesi / muhafız mavi zırhı: görseller (nano-banana-pro) ve görselden 3B (iskeletsiz).
// Durum state.json: tekrar çalıştırınca kredi harcamaz.  node gen.mjs img | node gen.mjs 3d
import fs from 'node:fs';
const API = 'https://api.meshy.ai/openapi/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function call(m, p, body) { for (let i = 0; ; i++) { const r = await fetch(API + p, { method: m, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined }); const t = await r.text(); if (r.status === 429 && i < 8) { await sleep(4000 * (i + 1)); continue; } if (!r.ok) throw new Error(`${m} ${p} ${r.status} ${t.slice(0, 300)}`); return JSON.parse(t); } }
const CHAR = 'Single character only, full body from head to feet fully visible, front view facing the camera, A-pose with arms slightly away from the body, legs slightly apart, empty open hands, plain light grey studio background, soft even lighting, realistic human proportions, semi-realistic dark fantasy action RPG character art, highly detailed worn materials (steel, leather, fur, cloth), no weapon in hands, no shield in hands, no text, no logo, no frame';
const ICON = 'Stylized painterly semi-realistic RPG item icon art with soft cel shading, clean bold silhouettes with thin dark outlines, rich saturated colors, each object centered in its own cell with generous empty magenta space around it, no grid lines, no text, no border, no shadow on the background, flat solid pure magenta background (#FF00FF) everywhere.';
const jobs = {
  g_blue: { model: 'nano-banana-pro', aspect: '3:4', pose: 'a-pose', prompt: 'A heroic human knight guardian in ornate dark blackened steel plate armor with bright polished gold trim and engraved golden filigree along every plate edge, a dark steel knight helmet with an open face and a tall flowing crimson red horsehair plume on top, a thick brown fur mantle collar over the shoulders, large rounded layered pauldrons with gold rims, a deep royal blue tabard hanging at the front with a golden rampant lion emblem, a short royal blue cape at the back, steel gauntlets and greaves with gold accents, chainmail at the waist, brown leather belt with a golden buckle, stern bearded face. ' + CHAR },
  chest: { model: 'nano-banana', aspect: '1:1', prompt: 'A small ornate fantasy treasure chest game asset made of pale icy blue translucent crystal panels framed with polished silver and white-gold metal bands, several glowing cyan magical gems on the rounded lid and a jewel lock at the front, soft magical inner light, chunky readable shape, stylized hand-painted semi-realistic RPG style, three-quarter front view, the whole chest fully visible, isolated on a plain light grey studio background, no text, no frame' },
  icons: { model: 'nano-banana-pro', aspect: '4:3', prompt: 'A 4 columns by 3 rows grid of twelve separate fantasy RPG item icons. Row 1: (1) a small ornate treasure chest of pale icy blue crystal panels with silver bands and glowing cyan gems, (2) a harvesting sickle with a curved polished steel blade and a wooden handle wrapped in leather with a tiny green leaf charm, (3) a stylized open golden hand reaching down to grab something, with small sparkles around the fingers, (4) a bundle of pale mint-green feathery grass stalks with tiny white flowers tied with twine (wind herb). Row 2: (5) a sprig of dark crimson red jagged leaves on thorny stems (hunter herb), (6) a bright golden-orange blossom with a glowing red heart-shaped center and green leaves (life herb), (7) a sharp violet star-shaped flower with glowing purple petal tips (critical herb), (8) a tall slim glass flask with swirling pale green liquid and a white wind swirl symbol (swiftness potion). Row 3: (9) a round glass flask with fiery crimson-orange liquid and a claw-mark emblem on the label (hunter strength potion), (10) a big round heart-shaped bottle with glowing ruby red liquid and a golden cork (life potion), (11) an angular crystal vial with violet liquid and a tiny lightning spark inside (critical potion), (12) a woven wicker basket full of fresh green herbs and flowers. ' + ICON },
};
const st = fs.existsSync('state.json') ? JSON.parse(fs.readFileSync('state.json', 'utf8')) : {};
const save = () => fs.writeFileSync('state.json', JSON.stringify(st, null, 1));
const step = process.argv[2] ?? 'img';
console.log('kredi', (await call('GET', '/balance')).balance);
if (step === 'img') {
  for (const [k, j] of Object.entries(jobs)) if (!st[k]) { st[k] = (await call('POST', '/text-to-image', { ai_model: j.model, prompt: j.prompt, aspect_ratio: j.aspect, ...(j.pose ? { pose_mode: j.pose } : {}) })).result; save(); }
  await Promise.all(Object.keys(jobs).map(async (k) => {
    if (fs.existsSync(k + '.png')) return;
    for (;;) { const t = await call('GET', `/text-to-image/${st[k]}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.png', Buffer.from(await (await fetch(t.image_urls[0])).arrayBuffer())); console.log(k, 'tamam'); return; } if (t.status === 'FAILED') { console.log(k, 'HATA', JSON.stringify(t.task_error)); return; } await sleep(4000); }
  }));
} else {
  const D3 = { g_blue: { target_polycount: 20000, enable_pbr: true, pose_mode: 'a-pose' }, chest: { target_polycount: 3000, enable_pbr: false } };
  for (const [k, o] of Object.entries(D3)) if (!st[k + '_3d'] && fs.existsSync(k + '.png')) {
    const image_url = 'data:image/png;base64,' + fs.readFileSync(k + '.png').toString('base64');
    st[k + '_3d'] = (await call('POST', '/image-to-3d', { image_url, ai_model: 'latest', should_texture: true, topology: 'triangle', should_remesh: true, ...o })).result; save();
  }
  await Promise.all(Object.keys(D3).map(async (k) => {
    if (fs.existsSync(k + '.glb') || !st[k + '_3d']) return;
    for (;;) { const t = await call('GET', `/image-to-3d/${st[k + '_3d']}`); if (t.status === 'SUCCEEDED') { fs.writeFileSync(k + '.glb', Buffer.from(await (await fetch(t.model_urls.glb)).arrayBuffer())); console.log(k, '3d tamam'); return; } if (['FAILED', 'CANCELED'].includes(t.status)) { console.log(k, 'HATA', JSON.stringify(t.task_error)); return; } await sleep(6000); }
  }));
}
console.log('kredi', (await call('GET', '/balance')).balance);
