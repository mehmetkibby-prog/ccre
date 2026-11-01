/**
 * Meshy API ile karakter üretimi. Anahtar ortamın ağ sırrı (Authorization: Bearer) olarak
 * vekil sunucu tarafından eklenir; MESHY_API_KEY ortam değişkeni varsa o da kullanılır.
 *
 * Her görev kimliği assets-src/meshy/state.json'a yazılır: yarıda kalan iş tekrar çalıştırıldığında
 * yeni kredi harcamadan kaldığı yerden sürer.
 *
 *   node scripts/meshy.mjs balance
 *   node scripts/meshy.mjs concepts [grup]                 konsept görselleri (scripts/meshy-characters.json)
 *   node scripts/meshy.mjs build <konsept> <modelId>       görselden 3B → iskelet → animasyonlar → assets-src/characters/<modelId>/
 *   node scripts/meshy.mjs status
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Node'un yerleşik fetch'i HTTPS_PROXY'yi ancak NODE_USE_ENV_PROXY=1 ile kullanır: gerekiyorsa kendini yeniden başlat
if ((process.env.HTTPS_PROXY || process.env.https_proxy) && !process.env.NODE_USE_ENV_PROXY) {
  const r = spawnSync(process.execPath, ['--no-warnings', ...process.argv.slice(1)], { stdio: 'inherit', env: { ...process.env, NODE_USE_ENV_PROXY: '1' } });
  process.exit(r.status ?? 1);
}

const API = 'https://api.meshy.ai/openapi';
const ROOT = path.resolve('.');
const STATE = path.join(ROOT, 'assets-src/meshy/state.json');
const SPEC = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/meshy-characters.json'), 'utf8'));
const state = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : { concepts: {}, builds: {} };
const save = () => { fs.mkdirSync(path.dirname(STATE), { recursive: true }); fs.writeFileSync(STATE, JSON.stringify(state, null, 2)); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

/** Görevi bitene kadar izler; başarısızsa hata atar. */
async function wait(kind, id, label) {
  let last = -1;
  for (;;) {
    const t = await call('GET', `/${kind}/${id}`);
    if (t.status === 'SUCCEEDED') { process.stdout.write(`\r  ${label}: tamam            \n`); return t; }
    if (t.status === 'FAILED' || t.status === 'CANCELED' || t.status === 'EXPIRED') throw new Error(`${label} başarısız: ${JSON.stringify(t.task_error ?? t).slice(0, 300)}`);
    if (t.progress !== last) { process.stdout.write(`\r  ${label}: %${t.progress ?? 0}   `); last = t.progress; }
    await sleep(4000);
  }
}

/** Yanıt nesnesinde verilen uzantıyla biten ilk URL'yi bulur (alan adları sürümden sürüme değişebiliyor). */
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

async function concepts(group) {
  const list = SPEC.concepts.filter((c) => !group || c.group === group || c.id === group);
  // önce hepsini başlat (paralel), sonra bekle
  for (const c of list) {
    if (state.concepts[c.id]?.task) continue;
    const prompt = `${c.prompt}. ${SPEC.conceptStyle}`;
    const r = await call('POST', '/v1/text-to-image', { ai_model: SPEC.imageModel, prompt, pose_mode: 'a-pose', aspect_ratio: '3:4' });
    state.concepts[c.id] = { task: r.result, prompt };
    save();
    console.log(`başlatıldı ${c.id} (${r.result})`);
  }
  for (const c of list) {
    const s = state.concepts[c.id];
    if (s.file && fs.existsSync(path.join(ROOT, s.file))) continue;
    const t = await wait('v1/text-to-image', s.task, c.id);
    const url = (t.image_urls ?? [])[0] ?? findUrl(t, /\.(png|jpe?g|webp)$/i);
    if (!url) { console.warn(`  ${c.id}: görsel adresi yok`, JSON.stringify(t).slice(0, 300)); continue; }
    s.url = url;
    s.file = path.relative(ROOT, await download(url, path.join(ROOT, 'assets-src/meshy/concepts', c.id + (path.extname(url.split('?')[0]) || '.png'))));
    save();
  }
  console.log('konseptler hazır: assets-src/meshy/concepts/');
}

async function build(conceptId, modelId) {
  const c = state.concepts[conceptId];
  if (!c?.url && !c?.file) throw new Error('Önce konsept üretilmeli: ' + conceptId);
  const anims = SPEC.animations[modelId] ?? SPEC.animations[SPEC.roles[modelId] ?? 'npc'];
  const b = (state.builds[modelId] ??= { concept: conceptId });
  if (b.concept !== conceptId) { state.builds[modelId] = { concept: conceptId }; return build(conceptId, modelId); }
  const out = path.join(ROOT, 'assets-src/characters', modelId);

  // 1) görselden 3B (dokulu)
  if (!b.model) {
    const file = c.file ? path.join(ROOT, c.file) : null;
    const image_url = file && fs.existsSync(file) ? `data:image/${path.extname(file).slice(1).replace('jpg', 'jpeg')};base64,${fs.readFileSync(file).toString('base64')}` : c.url;
    const r = await call('POST', '/v1/image-to-3d', { image_url, ai_model: SPEC.modelAi, should_texture: true, enable_pbr: true, pose_mode: 'a-pose', topology: 'triangle', target_polycount: SPEC.polycount, should_remesh: true });
    b.model = r.result; save();
    console.log(`${modelId}: 3B görevi ${b.model}`);
  }
  const m = await wait('v1/image-to-3d', b.model, `${modelId} 3B`);
  b.modelGlb = findUrl(m, /\.glb$/i, /glb/); save();

  // 2) iskelet
  if (!b.rig) {
    const r = await call('POST', '/v1/rigging', { input_task_id: b.model, height_meters: SPEC.heights?.[modelId] ?? 1.8 });
    b.rig = r.result; save();
    console.log(`${modelId}: iskelet görevi ${b.rig}`);
  }
  const rig = await wait('v1/rigging', b.rig, `${modelId} iskelet`);
  if (!b.rigLogged) { console.log('  iskelet yanıtı alanları:', Object.keys(rig.result ?? rig).join(', ')); b.rigLogged = true; }
  const rigGlb = findUrl(rig.result ?? rig, /\.glb$/i, /rigged.*glb|character.*glb/i);
  if (!rigGlb) throw new Error('İskeletli GLB adresi bulunamadı: ' + JSON.stringify(rig).slice(0, 400));
  await download(rigGlb, path.join(out, 'model.glb'));

  // 3) animasyonlar
  b.anims ??= {};
  for (const [name, actionId] of Object.entries(anims)) {
    if (!b.anims[name]) {
      const r = await call('POST', '/v1/animations', { rig_task_id: b.rig, action_id: actionId });
      b.anims[name] = { task: r.result, actionId }; save();
    }
  }
  for (const [name, a] of Object.entries(b.anims)) {
    const file = path.join(out, name + '.glb');
    if (fs.existsSync(file)) continue;
    const t = await wait('v1/animations', a.task, `${modelId} ${name}`);
    const url = findUrl(t.result ?? t, /\.glb$/i, /animation.*glb/i);
    if (!url) { console.warn(`  ${name}: GLB adresi yok`, JSON.stringify(t).slice(0, 300)); continue; }
    await download(url, file);
  }
  fs.writeFileSync(path.join(out, 'karakter.json'), JSON.stringify({ height: SPEC.heights?.[modelId] ?? 1.8, ...(SPEC.overrides?.[modelId] ?? {}) }, null, 2));
  save();
  console.log(`${modelId}: dosyalar hazır → ${path.relative(ROOT, out)}  (sonraki adım: node scripts/import-characters.mjs --only ${modelId})`);
}

const [cmd, a1, a2] = process.argv.slice(2);
const bal = async () => { const b = await call('GET', '/v1/balance'); console.log(`kredi: ${b.balance}`); };
if (cmd === 'balance') await bal();
else if (cmd === 'concepts') { await concepts(a1); await bal(); }
else if (cmd === 'build') { if (!a1 || !a2) throw new Error('kullanım: build <konsept> <modelId>'); await build(a1, a2); await bal(); }
else if (cmd === 'status') console.log(JSON.stringify(state, null, 2));
else console.log('komutlar: balance | concepts [grup] | build <konsept> <modelId> | status');
