/**
 * Karakter içe aktarma: Mixamo / Meshy / başka kaynaktan gelen FBX veya GLB dosyalarını
 * oyunun kullandığı tek parça, sıkıştırılmış GLB'ye çevirir ve models.json'a yazar.
 *
 * Klasör düzeni (her karakter bir klasör; klasör adı = model kimliği):
 *   assets-src/characters/guardian/   Mixamo "With Skin" FBX + animasyon FBX'leri ("Without Skin")
 *   assets-src/characters/hunter/
 *   assets-src/characters/arcanist/
 *   assets-src/characters/smith/       NPC: tek bir bekleme (idle) dosyası yeter
 *   assets-src/characters/_anims/      (isteğe bağlı) ortak animasyonlar — eksik durumlar buradan tamamlanır
 *   assets-src/characters/<id>/karakter.json   (isteğe bağlı) { "height": 1.85, "yaw": 0, "anims": { "attack": "Dosya Adı" } }
 *
 * Animasyon dosya adları Mixamo'nun verdiği adlarla kalabilir ("Sword And Shield Idle.fbx",
 * "Standing Melee Attack Downward.fbx", "Falling Back Death.fbx" …); durum eşlemesi addan çıkarılır.
 *
 * Kullanım: node scripts/import-characters.mjs [--src assets-src/characters] [--tris 16000] [--tex 1024] [--only guardian,hunter]
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { NodeIO, Logger } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, resample, weld, simplify, meshopt } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';

// Playwright projede bağımlılık değil; sistemde kurulu olanı kullan (npx playwright install chromium)
const { chromium } = await import('playwright').catch(() => createRequire(import.meta.url)('playwright'));

const arg = (k, d) => { const i = process.argv.indexOf('--' + k); return i > 0 ? process.argv[i + 1] : d; };
const SRC = path.resolve(arg('src', 'assets-src/characters'));
const OUT = path.resolve(arg('out', 'packages/client/public/models'));
const TRIS = Number(arg('tris', 16000));
const TEX = Number(arg('tex', 1024));
const ONLY = arg('only', '')?.split(',').filter(Boolean) ?? [];
const ROOT = path.resolve('.');

const HEROES = ['guardian', 'hunter', 'arcanist'];
const EXT = /\.(fbx|glb|gltf)$/i;

/** Ad → durum. Sıra önemli: ölüm/darbe/koşu/yürüme/bekleme, sonra büyü ve saldırı. */
const RULES = [
  ['dead', /death|dying|\bdie\b|dead|defeat|knock ?out/i],
  ['hurt', /hit ?reaction|impact|hurt|react|damage|getting hit|\bhit\b(?!.*attack)/i],
  ['run', /\brun|jog|sprint/i],
  ['walk', /walk/i],
  ['idle', /idle|breath|\bwait|t-?pose/i],
  ['cast', /area|cast|spell|buff|power ?up|2h magic|channel/i],
  ['attack', /attack|slash|swing|strike|stab|punch|shoot|shot|bow|arrow|recoil|combo|kick|magic|aim|thrust|chop|swip|smash|cleave/i],
];
const SIDEWAYS = /back|left|right|strafe|turn|crouch|block|injured|drunk|sad|tired|jump|start|stop/i;
const classify = (n) => RULES.find(([, re]) => re.test(n))?.[0] ?? null;

function pickStates(clips, cfg, npc) {
  const by = {};
  for (const c of clips) { const s = classify(c.name); if (s) (by[s] ??= []).push(c); }
  const best = (list) => {
    if (!list?.length) return undefined;
    const own = list.filter((c) => !c.shared);
    const pool = own.length ? own : list;
    return [...pool].sort((a, b) => Number(SIDEWAYS.test(a.name)) - Number(SIDEWAYS.test(b.name)) || a.name.length - b.name.length)[0].name;
  };
  const map = {};
  for (const s of ['idle', 'walk', 'run', 'hurt', 'dead', 'cast', 'attack']) { const n = best(by[s]); if (n) map[s] = n; }
  let attackClips = (by.attack ?? []).filter((c) => !c.shared || !(by.attack ?? []).some((o) => !o.shared)).map((c) => c.name).slice(0, 4);
  if (!map.cast && attackClips.length > 1) map.cast = attackClips[attackClips.length - 1];
  Object.assign(map, cfg.anims ?? {});
  if (cfg.attackClips) attackClips = cfg.attackClips;
  if (npc) { for (const k of Object.keys(map)) if (k !== 'idle') delete map[k]; attackClips = []; }
  return { map, attackClips };
}

function filesIn(dir, rel) {
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir).filter((f) => EXT.test(f)).sort().map((f) => ({ url: '/src/' + rel + '/' + encodeURIComponent(f), name: f.replace(EXT, '') }));
}

function mime(f) {
  return ({ '.js': 'text/javascript', '.mjs': 'text/javascript', '.wasm': 'application/wasm', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.tga': 'image/x-tga', '.json': 'application/json' })[path.extname(f).toLowerCase()] ?? 'application/octet-stream';
}

const PAGE = `<!doctype html><meta charset="utf-8"><script type="importmap">{"imports":{"three":"/three/build/three.module.js","three/addons/":"/three/examples/jsm/"}}</script><script type="module" src="/conv.js"></script>`;

async function main() {
  if (!fs.existsSync(SRC)) { console.error('Kaynak klasör yok:', SRC); process.exit(1); }
  const ids = fs.readdirSync(SRC).filter((d) => !d.startsWith('_') && !d.startsWith('.') && fs.statSync(path.join(SRC, d)).isDirectory()).filter((d) => !ONLY.length || ONLY.includes(d));
  if (!ids.length) { console.error('Karakter klasörü bulunamadı:', SRC); process.exit(1); }
  const shared = filesIn(path.join(SRC, '_anims'), '_anims').map((f) => ({ ...f, shared: true }));

  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (m) => { if (m.type() === 'error') console.warn('  [tarayıcı]', m.text()); });
  await page.route('http://col.local/**', async (route) => {
    const u = decodeURIComponent(new URL(route.request().url()).pathname);
    let file = null;
    if (u === '/') return route.fulfill({ body: PAGE, contentType: 'text/html' });
    if (u === '/conv.js') file = path.join(ROOT, 'scripts/lib/char-convert.browser.js');
    else if (u.startsWith('/three/')) file = path.join(ROOT, 'node_modules/three', u.slice(7));
    else if (u.startsWith('/draco/')) file = path.join(ROOT, 'packages/client/public/draco', u.slice(7));
    else if (u.startsWith('/src/')) file = path.join(SRC, u.slice(5));
    if (file && !path.relative(ROOT, file).startsWith('..') || (file && file.startsWith(SRC))) {
      if (fs.existsSync(file) && fs.statSync(file).isFile()) return route.fulfill({ body: fs.readFileSync(file), contentType: mime(file) });
    }
    // FBX dokuları çoğu zaman mutlak Windows yoluyla gelir: aynı klasörde dosya adıyla ara
    if (u.startsWith('/src/')) {
      const dir = path.join(SRC, u.slice(5).split('/')[0]);
      const want = path.basename(u.replace(/\\/g, '/')).toLowerCase();
      const hit = fs.existsSync(dir) && fs.readdirSync(dir, { recursive: true }).map(String).find((f) => path.basename(f).toLowerCase() === want);
      if (hit) return route.fulfill({ body: fs.readFileSync(path.join(dir, hit)), contentType: mime(hit) });
    }
    return route.fulfill({ status: 404, body: '' });
  });
  await page.goto('http://col.local/');
  await page.waitForFunction(() => window.__ready === true, null, { timeout: 30000 });

  await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  fs.mkdirSync(OUT, { recursive: true });
  const manPath = path.join(OUT, 'models.json');
  const manifest = fs.existsSync(manPath) ? JSON.parse(fs.readFileSync(manPath, 'utf8')) : {};
  let ok = 0;

  for (const id of ids) {
    const dir = path.join(SRC, id);
    const cfgPath = path.join(dir, 'karakter.json');
    const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
    const npc = cfg.npc ?? !HEROES.includes(id);
    const own = filesIn(dir, id);
    if (!own.length) { console.warn(`${id}: FBX/GLB dosyası yok, atlandı`); continue; }
    console.log(`\n${id}: ${own.length} dosya${npc ? ' (NPC)' : ''}`);
    let info;
    try {
      info = await page.evaluate((a) => window.prepareChar(a), { files: [...own, ...(npc ? [] : shared)], tex: TEX });
    } catch (e) { console.error(`  HATA: ${String(e.message ?? e).split('\n')[0]}`); continue; }
    info.log.forEach((l) => console.warn('  uyarı:', l));
    const { map, attackClips } = pickStates(info.clips, cfg, npc);
    const keep = [...new Set([...Object.values(map), ...attackClips])];
    if (!map.idle) console.warn('  uyarı: bekleme (idle) animasyonu yok — karakter T-pozunda durur');
    for (const s of npc ? ['idle'] : ['idle', 'walk', 'run', 'attack', 'hurt', 'dead']) if (!map[s]) console.warn(`  eksik durum: ${s}`);
    const glb = Buffer.from(await page.evaluate((k) => window.exportChar(k), keep), 'base64');

    const doc = await io.readBinary(new Uint8Array(glb));
    doc.setLogger(new Logger(Logger.Verbosity.WARN));
    let tris = 0;
    for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) tris += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
    const target = cfg.tris ?? (npc ? Math.round(TRIS * 0.7) : TRIS);
    const ratio = Math.min(1, target / Math.max(1, tris));
    const steps = [resample(), prune(), dedup(), weld()];
    if (ratio < 0.98) steps.push(simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.004 }));
    steps.push(prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
    await doc.transform(...steps);
    let after = 0;
    for (const m of doc.getRoot().listMeshes()) for (const p of m.listPrimitives()) after += (p.getIndices()?.getCount() ?? p.getAttribute('POSITION').getCount()) / 3;
    const file = id + '.glb';
    await io.write(path.join(OUT, file), doc);
    manifest[id] = {
      url: file, height: cfg.height ?? (npc ? 1.8 : 1.85), ...((cfg.yaw ?? info.yaw) ? { yaw: +(cfg.yaw ?? info.yaw).toFixed(4) } : {}), ...(cfg.scale ? { scale: cfg.scale } : {}),
      anims: map, ...(attackClips.length ? { attackClips } : {}),
    };
    ok++;
    console.log(`  temel: ${info.base}${info.yaw ? ` · yön düzeltmesi ${Math.round(info.yaw * 180 / Math.PI)}°` : ''} · üçgen ${Math.round(tris)} → ${Math.round(after)} · ${(fs.statSync(path.join(OUT, file)).size / 1024).toFixed(0)} KB`);
    console.log(`  durumlar: ${Object.entries(map).map(([k, v]) => `${k}=${v}`).join(' · ')}${attackClips.length > 1 ? ` · saldırı serisi: ${attackClips.length}` : ''}`);
  }
  await browser.close();
  fs.writeFileSync(manPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(`\n${ok}/${ids.length} karakter hazır → ${path.relative(ROOT, manPath)}`);
}

main().catch((e) => { console.error(e); process.exit(1); });
