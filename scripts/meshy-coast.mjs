/**
 * Rün Sahili (Sv. 50) Meshy varlıkları (ve boss silahları, boss_weapons): Rün Golemi, Boğulmuş Akıncı, Rün Sireni (iki ayaklı, Meshy iskeleti) ve tek
 * görselden tek 3B üretimle çıkan sahil seti (menhir + Gelgit Yengeci + batık gemi; scripts/split-coast.mjs ile ayrılır).
 * Kredi tasarrufu: kütüphane animasyonu satın alınmaz. Meshy iskeletleri aynı 24 kemiği aynı adlarla kullandığından
 * bekleme/saldırı/ölüm klipleri önceki Meshy canavarlarının ham kliplerinden (assets-src/characters/<kaynak>/) alınır,
 * import-characters.mjs kemik adlarıyla bağlar ve kalça yüksekliğini ölçekler. Yürüme, iskelet görevinin ücretsiz
 * verdiği kendi yürüyüşüdür.
 *
 * Durum: assets-src/meshy/concepts/coast-state.json (git dışı). Tekrar çalıştırınca biten adım yeniden ücretlenmez.
 *   node scripts/meshy-coast.mjs balance
 *   node scripts/meshy-coast.mjs img [id…]        konsept görselleri → assets-src/meshy/concepts/<id>.png
 *   node scripts/meshy-coast.mjs 3d <id>          görselden 3B → assets-src/meshy/concepts/<id>.glb
 *   node scripts/meshy-coast.mjs rig <id>         iskelet + ücretsiz yürüyüş + ödünç klipler → assets-src/characters/<id>/
 *   node scripts/meshy-coast.mjs status
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
}

const API = 'https://api.meshy.ai/openapi';
const ROOT = path.resolve('.');
const DIR = path.join(ROOT, 'assets-src/meshy/concepts');
const CHARS = path.join(ROOT, 'assets-src/characters');
const STATE = path.join(DIR, 'coast-state.json');
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
const save = () => { fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state, null, 1)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const MON = 'full body fully visible from head to feet, front view facing the camera, A-pose with arms held about 40 degrees away from the body, legs apart, empty open hands, no weapon, semi-realistic dark fantasy MMORPG monster character art, highly detailed materials, plain light grey studio background, soft even lighting, single character only, no text, no frame';

/**
 * model: Meshy 3B modeli (latest = Meshy-6, 30 kredi; meshy-6-lite daha ucuz). height: iskelet boyu (m).
 * borrow: { klip adı: 'kaynak/dosya.glb' } — assets-src/characters altındaki ham Meshy klibi kopyalanır.
 */
const JOBS = {
  c_golem: {
    model: 'latest', height: 2.4, rig: true, aspect: '3:4', pose: 'a-pose',
    prompt: 'A massive hulking ancient rune golem monster standing upright on two thick legs, a body built from stacked weathered sandstone blocks and dark grey-blue sea rock, deep carved runic glyphs and cracks glowing bright cyan from within, patches of barnacles, small sea shells and dripping dark green kelp on the shoulders, arms and legs, very broad heavy shoulders, oversized blocky stone forearms and huge fists, small head sunk between the shoulders with two glowing cyan eyes, ' + MON,
    borrow: { Idle: 'f_slag/Idle.glb', 'Attack Slam': 'f_boss/Cast Ground Slam.glb', 'Attack Slash': 'f_slag/Attack Slash.glb', Death: 'f_slag/Death.glb' },
  },
  c_raider: {
    model: 'meshy-6-lite', height: 1.95, rig: true, aspect: '3:4', pose: 'a-pose',
    prompt: 'A drowned undead sea raider warrior monster risen from the ocean, gaunt grey-green rotting skin and a skull-like face with ghostly sea-green glowing eyes, a rusted dented iron raider helmet with small horns, rusted iron chest plate, pauldrons and greaves overgrown with dark green seaweed, coral growths, barnacles and small sea shells, torn wet dark leather and tattered sea-soaked cloth, rope belt with rusted buckles, ' + MON,
    borrow: { Idle: 'k_knight/Idle.glb', 'Attack Slash': 'k_knight/Attack Slash.glb', 'Attack Hook': 'goblin/Attack Hook.glb', Death: 'k_knight/Death.glb' },
  },
  c_siren: {
    model: 'meshy-6-lite', height: 1.85, rig: true, aspect: '3:4', pose: 'a-pose',
    prompt: 'A beautiful but sinister sea siren witch monster, pale blue-green skin with patches of shimmering teal fish scales on the arms, shoulders and cheeks, fin-like ears, long wet dark teal hair with small shells and pearls, a crown of coral and sea shells, a fitted scale bodice and flowing tattered sea-green and deep blue layered robes with a fish-scale pattern split at the front, bare scaly feet, strings of pearls and seaweed draped on the body, glowing cyan rune tattoos on the forearms, glowing cyan eyes, ' + MON,
    borrow: { Idle: 'arcanist/Idle.glb', 'Attack Magic 1': 'arcanist/Attack Magic 1.glb', 'Attack Magic 2': 'arcanist/Attack Magic 2.glb', Death: 'arcanist/Death.glb' },
  },
  coast_ship: {
    aspect: '16:9',
    prompt: 'A single old wrecked wooden sailing ship, the broken dark weathered wooden hull lying tilted on its side and half buried in a low wide mound of pale beach sand, the stern broken open with exposed curved wooden hull ribs and missing planks, a snapped thick mast stump with a torn grey-white sail draped over the deck, a few barnacles and strands of seaweed on the hull, no ropes, no rigging lines, side three-quarter view from slightly above, the whole wreck fully visible, stylized semi-realistic hand-painted fantasy MMORPG game asset, highly detailed weathered wood, isolated on plain light grey studio background, no water, no sky, no text, no frame',
  },
  // boss silahları: dört silah tek görselde dik ve yan yana, tek 3B üretim; scripts/boss-weapons.mjs ayırıp ele hazırlar
  boss_weapons: {
    model: 'latest', polycount: 24000, aspect: '16:9',
    prompt: 'Four separate fantasy MMORPG weapon game assets standing perfectly upright side by side in one row with wide empty space between them, none touching, each shown flat in pure side profile so its full silhouette is visible, handle at the bottom and blade or head at the top, isolated on one plain light grey studio background, no ground, no shadows. From left to right: 1) an elegant royal curved scimitar saber, polished golden-bronze blade with engraved fox motifs, ornate golden crossguard and a fox-head pommel with a small red silk tassel; 2) a huge dark reaper war scythe, a long black iron and bone haft with silver rings, a very large curved black steel blade at the top with a glowing crimson edge; 3) a colossal two-handed runic greataxe, a massive single-edged black iron cleaver head covered in glowing orange-red ember cracks and carved runes, a long thick dark haft wrapped in leather with iron bands and a spiked pommel; 4) a giant blacksmith forge war maul, a huge heavy dark iron block hammer head with molten glowing orange ember cracks and riveted bands, a long thick iron-banded handle. Stylized semi-realistic hand-painted fantasy MMORPG style, highly detailed materials, soft even lighting, no text, no frame',
  },
  // sahil seti: coast_set görselindeki menhir ve yengeç + coast_ship enkazı tek görselde (compose), tek 3B üretim
  coast_mix: { model: 'latest', polycount: 30000 },
  coast_set: {
    aspect: '16:9',
    prompt: 'Three separate fantasy RPG game assets in a row with wide empty space between them, none of them touching, all seen from the same slightly elevated three-quarter front view, isolated on one plain light grey studio background, no ground, no floor, no shadows. Left: a tall ancient rune menhir standing stone, a single weathered tall slab of grey-blue stone tapering to a rough broken top, deep carved runic glyphs glowing bright cyan running down its front, patches of moss and a few barnacles at its base. Middle: a huge armored tide crab monster facing the viewer, a wide domed teal and coral-red shell carapace covered in barnacles with one large glowing cyan rune etched on top, two massive serrated claws held forward, eight jointed spiky legs spread wide. Right: an old wrecked wooden sailing ship, a broken dark wooden hull lying slightly tilted and half buried in a low mound of pale sand, exposed curved hull ribs, a snapped mast with a torn grey-white sail and hanging ropes. Stylized semi-realistic hand-painted fantasy MMORPG style, highly detailed weathered materials, soft even lighting, no water, no text, no frame',
  },
};

async function call(method, p, body) {
  const headers = { 'Content-Type': 'application/json' };
  if (process.env.MESHY_API_KEY) headers.Authorization = 'Bearer ' + process.env.MESHY_API_KEY;
  for (let attempt = 0; ; attempt++) {
    const r = await fetch(API + p, { method, headers, body: body ? JSON.stringify(body) : undefined });
    const text = await r.text();
    if (r.status === 429 && attempt < 6) { await sleep(3000 * (attempt + 1)); continue; }
    if (!r.ok) throw new Error(`${method} ${p} → ${r.status} ${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  }
}
async function wait(kind, id, label) {
  let last = -1;
  for (;;) {
    const t = await call('GET', `/${kind}/${id}`);
    if (t.status === 'SUCCEEDED') { process.stdout.write(`\r  ${label}: tamam (kredi ${t.consumed_credits ?? '?'})          \n`); return t; }
    if (['FAILED', 'CANCELED', 'EXPIRED'].includes(t.status)) throw new Error(`${label} başarısız: ${JSON.stringify(t.task_error ?? t).slice(0, 300)}`);
    if (t.progress !== last) { process.stdout.write(`\r  ${label}: %${t.progress ?? 0}   `); last = t.progress; }
    await sleep(5000);
  }
}
function findUrl(obj, re, prefer) {
  const found = [];
  const walk = (o, k) => {
    if (typeof o === 'string' && /^https?:\/\//.test(o) && re.test(o.split('?')[0])) found.push({ k, u: o });
    else if (o && typeof o === 'object') for (const [kk, v] of Object.entries(o)) walk(v, k ? k + '.' + kk : kk);
  };
  walk(obj, '');
  return (prefer ? found.find((f) => prefer.test(f.k)) : null)?.u ?? found[0]?.u ?? null;
}
async function download(url, file) {
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      fs.mkdirSync(path.dirname(file), { recursive: true });
      fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
      return file;
    } catch (e) { if (attempt === 3) throw e; await sleep(2000 * (attempt + 1)); }
  }
}
const balance = async () => (await call('GET', '/v1/balance')).balance;

async function img(ids) {
  for (const id of ids) {
    const j = JOBS[id], s = (state[id] ??= {});
    if (s.img) continue;
    s.img = (await call('POST', '/v1/text-to-image', { ai_model: 'nano-banana', prompt: j.prompt, aspect_ratio: j.aspect, ...(j.pose ? { pose_mode: j.pose } : {}) })).result;
    save(); console.log('görsel istendi', id);
  }
  await Promise.all(ids.map(async (id) => {
    const s = state[id], file = path.join(DIR, id + '.png');
    if (fs.existsSync(file)) return;
    const t = await wait('v1/text-to-image', s.img, id + ' görsel');
    await download(t.image_urls[0], file);
  }));
}

async function to3d(id) {
  const j = JOBS[id], s = (state[id] ??= {});
  const file = path.join(DIR, id + '.png');
  if (!fs.existsSync(file)) throw new Error('önce görsel: ' + id);
  if (!s.model) {
    const image_url = 'data:image/png;base64,' + fs.readFileSync(file).toString('base64');
    const body = { image_url, ai_model: j.model, should_texture: true, enable_pbr: !!j.rig, topology: 'triangle', target_polycount: j.polycount ?? 20000, should_remesh: true, ...(j.pose ? { pose_mode: j.pose } : {}) };
    s.model = (await call('POST', '/v1/image-to-3d', body)).result; save();
    console.log(`${id}: 3B görevi ${s.model} (${j.model})`);
  }
  const t = await wait('v1/image-to-3d', s.model, id + ' 3B');
  s.modelCredits = t.consumed_credits; save();
  const out = path.join(DIR, id + '.glb');
  if (!fs.existsSync(out)) await download(t.model_urls?.glb ?? findUrl(t, /\.glb$/i), out);
  console.log('  →', path.relative(ROOT, out));
}

async function rig(id) {
  const j = JOBS[id], s = state[id];
  if (!s?.model) throw new Error('önce 3B: ' + id);
  const out = path.join(CHARS, id);
  if (!s.rig) { s.rig = (await call('POST', '/v1/rigging', { input_task_id: s.model, height_meters: j.height })).result; save(); console.log(`${id}: iskelet görevi ${s.rig}`); }
  const t = await wait('v1/rigging', s.rig, id + ' iskelet');
  s.rigCredits = t.consumed_credits; save();
  const res = t.result ?? t;
  await download(res.rigged_character_glb_url ?? findUrl(res, /\.glb$/i, /rigged.*glb/i), path.join(out, 'model.glb'));
  const walk = res.basic_animations?.walking_glb_url;
  if (walk) await download(walk, path.join(out, 'Walk.glb'));
  else console.warn('  ücretsiz yürüyüş klibi yok');
  for (const [name, src] of Object.entries(j.borrow ?? {})) fs.copyFileSync(path.join(CHARS, src), path.join(out, name + '.glb'));
  fs.writeFileSync(path.join(out, 'karakter.json'), JSON.stringify({ height: j.height, npc: false, tris: 12000 }, null, 1));
  console.log(`${id}: hazır → ${path.relative(ROOT, out)}  (sonraki: node scripts/import-characters.mjs --only ${id})`);
}

const [cmd, ...args] = process.argv.slice(2);
if (cmd === 'balance') console.log('kredi:', await balance());
else if (cmd === 'img') { await img(args.length ? args : Object.keys(JOBS)); console.log('kredi:', await balance()); }
else if (cmd === '3d') { await Promise.all(args.map(to3d)); console.log('kredi:', await balance()); }
else if (cmd === 'rig') { await Promise.all(args.map(rig)); console.log('kredi:', await balance()); }
else if (cmd === 'status') console.log(JSON.stringify(state, null, 1));
else console.log('komutlar: balance | img [id…] | 3d <id> | rig <id> | status');
