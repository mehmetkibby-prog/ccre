/**
 * Meshy'de görselden üretilen silah GLB'lerini oyunun silah düzenine getirir ve küçültür.
 *
 * Oyun düzeni (gear.ts / humanoid.ts weaponModel ile aynı):
 *  - kılıç: namlu +Y, genişlik X, kabzanın ortası orijinde, boy ≈ 1,15 m
 *  - asa:   baş +Y, alttan %27'den tutulur, boy ≈ 1,85 m
 *  - yay:   dik (Y), kavis ileri (+Z), kiriş ve uçlar arkada (−Z), kabza orijinde, boy ≈ 1,36 m
 *
 * Adımlar: düz büyük arka plan parçalarını at → X-Y düzleminde ana eksenle dikleştir → ucu seç →
 * ölçekle/ötele → üçgen sayısını azalt → dokuyu 512 px JPEG yap → meshopt ile sıkıştır.
 *
 *   node scripts/weapons.mjs <girdi klasörü> <çıktı klasörü> [ad ...]
 *   (ad: w_<sınıf>_<nadirlik>; verilmezse girdideki bütün w_*.glb)
 */
import fs from 'node:fs';
import path from 'node:path';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [inDir, outDir, ...only] = process.argv.slice(2);
if (!inDir || !outDir) throw new Error('kullanım: node scripts/weapons.mjs <girdi> <çıktı> [ad ...]');
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });
const names = only.length ? only : fs.readdirSync(inDir).filter((f) => /^w_.*\.glb$/.test(f)).map((f) => f.slice(0, -4));
fs.mkdirSync(outDir, { recursive: true });

const SPEC = {
  guardian: { kind: 'sword', len: 1.15 },
  arcanist: { kind: 'staff', len: 1.85 },
  hunter: { kind: 'bow', len: 1.36 },
};

for (const name of names) {
  const cls = name.split('_')[1];
  const spec = SPEC[cls];
  const doc = await io.read(path.join(inDir, name + '.glb'));
  const root = doc.getRoot();
  await doc.transform(weld());
  const prims = root.listMeshes().flatMap((m) => m.listPrimitives());

  // 1) bağlı parçalara ayır; ince ve geniş düz parçalar (görseldeki çerçeve/disk) atılır
  for (const p of prims) {
    const pos = p.getAttribute('POSITION'), idx = p.getIndices();
    const n = pos.getCount(), parent = new Int32Array(n).map((_, i) => i);
    const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
    const ia = idx.getArray();
    for (let i = 0; i < ia.length; i += 3) { const a = find(ia[i]), b = find(ia[i + 1]), c = find(ia[i + 2]); parent[b] = a; parent[c] = a; }
    const box = new Map();
    const v = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      pos.getElement(i, v); const r = find(i);
      const b = box.get(r) ?? { min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9], n: 0 };
      for (let k = 0; k < 3; k++) { b.min[k] = Math.min(b.min[k], v[k]); b.max[k] = Math.max(b.max[k], v[k]); }
      b.n++; box.set(r, b);
    }
    const drop = new Set();
    for (const [r, b] of box) {
      const ex = b.max.map((m, k) => m - b.min[k]);
      if (ex[2] < 0.035 && ex[0] > 1.0 && ex[1] > 1.0) drop.add(r);
    }
    // parçaya bağlı kalmış düz disk: en önde/arkada ince bir katmanda köşelerin çoğu ve geniş bir alan
    const zs = []; for (let i = 0; i < n; i++) zs.push(pos.getElement(i, v)[2]);
    const zmax = Math.max(...zs), zmin = Math.min(...zs);
    const slab = [];
    for (const [lo, hi] of [[zmax - 0.025, 1e9], [-1e9, zmin + 0.025]]) {
      let c = 0, x0 = 1e9, x1 = -1e9;
      for (let i = 0; i < n; i++) if (zs[i] > lo && zs[i] < hi) { c++; const x = pos.getElement(i, v)[0]; x0 = Math.min(x0, x); x1 = Math.max(x1, x); }
      if (c > n * 0.1 && x1 - x0 > 1.2) slab.push([lo, hi]);
    }
    const inSlab = (j) => slab.some(([lo, hi]) => zs[j] > lo && zs[j] < hi);
    if (drop.size || slab.length) {
      const keep = [];
      for (let i = 0; i < ia.length; i += 3) if (!drop.has(find(ia[i])) && !(inSlab(ia[i]) && inSlab(ia[i + 1]) && inSlab(ia[i + 2]))) keep.push(ia[i], ia[i + 1], ia[i + 2]);
      if (slab.length) console.log(name, 'düz disk katmanı atıldı');
      idx.setArray(new Uint32Array(keep));
      console.log(name, 'arka plan parçası atıldı:', drop.size);
    }
  }
  // görselin dairesel zemini 3B'de silahın arkasında bir levha olmuş modeller: levhanın derinliği
  const DISC = { w_arcanist_orange: 0.055 }[name];
  if (DISC !== undefined) for (const p of prims) {
    const pos = p.getAttribute('POSITION'), idx = p.getIndices();
    let ia = idx.getArray();
    const P3 = (j) => pos.getElement(j, [0, 0, 0]);
    const keep = [];
    for (let i = 0; i < ia.length; i += 3) {
      const a = P3(ia[i]), b = P3(ia[i + 1]), c = P3(ia[i + 2]);
      const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
      const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx, nl = Math.hypot(nx, ny, nz) || 1;
      if (a[2] > DISC && b[2] > DISC && c[2] > DISC && Math.abs(nz / nl) > 0.7) continue;
      keep.push(ia[i], ia[i + 1], ia[i + 2]);
    }
    // kalan kenar şeridi: tamamı levha derinliğinde kalan bağlı parçalar
    ia = new Uint32Array(keep);
    const n = pos.getCount(), parent = new Int32Array(n).map((_, i) => i);
    const find = (x) => { while (parent[x] !== x) x = parent[x] = parent[parent[x]]; return x; };
    for (let i = 0; i < ia.length; i += 3) { const r = find(ia[i]); parent[find(ia[i + 1])] = r; parent[find(ia[i + 2])] = r; }
    const zlo = new Map();
    for (let i = 0; i < ia.length; i++) { const r = find(ia[i]); zlo.set(r, Math.min(zlo.get(r) ?? 1e9, P3(ia[i])[2])); }
    const out = [];
    for (let i = 0; i < ia.length; i += 3) if (zlo.get(find(ia[i])) <= DISC) out.push(ia[i], ia[i + 1], ia[i + 2]);
    idx.setArray(new Uint32Array(out));
    console.log(name, 'levha temizlendi:', (ia.length - out.length) / 3 + (keep.length === 0 ? 0 : 0), 'kenar üçgeni');
  }
  await doc.transform(prune());

  // kullanılan köşeler
  const used = (p) => { const s = new Set(p.getIndices().getArray()); return [...s]; };
  const pts = [];
  for (const p of prims) { const pos = p.getAttribute('POSITION'); for (const i of used(p)) pts.push(pos.getElement(i, [0, 0, 0])); }

  // 2) X-Y düzleminde ana eksen → Y
  let cx = 0, cy = 0; for (const q of pts) { cx += q[0]; cy += q[1]; } cx /= pts.length; cy /= pts.length;
  let sxx = 0, syy = 0, sxy = 0; for (const q of pts) { const dx = q[0] - cx, dy = q[1] - cy; sxx += dx * dx; syy += dy * dy; sxy += dx * dy; }
  const ang = 0.5 * Math.atan2(2 * sxy, sxx - syy); // ana eksenin X'e açısı
  let rot = Math.PI / 2 - ang; // ana ekseni +Y'ye çevir
  const R = (q, a) => [q[0] * Math.cos(a) - q[1] * Math.sin(a), q[0] * Math.sin(a) + q[1] * Math.cos(a), q[2]];
  let P = pts.map((q) => R([q[0] - cx, q[1] - cy, q[2]], rot));

  // 3) yön: boyuna dilimlerde genişlik profili
  const ys = P.map((q) => q[1]); let y0 = Math.min(...ys), y1 = Math.max(...ys);
  const NB = 40, wid = new Array(NB).fill(0).map(() => [1e9, -1e9]), zid = new Array(NB).fill(0).map(() => [1e9, -1e9]);
  for (const q of P) { const b = Math.min(NB - 1, Math.floor((q[1] - y0) / (y1 - y0) * NB)); wid[b][0] = Math.min(wid[b][0], q[0]); wid[b][1] = Math.max(wid[b][1], q[0]); zid[b][0] = Math.min(zid[b][0], q[2]); zid[b][1] = Math.max(zid[b][1], q[2]); }
  const W = wid.map(([a, b]) => (b > a ? b - a : 0));
  let flip = false;
  if (spec.kind === 'sword') {
    // kabza tarafı: siper (en geniş dilim) hangi uca yakınsa o uç aşağı
    const g = W.indexOf(Math.max(...W));
    flip = g > NB / 2;
  } else if (spec.kind === 'staff') {
    // baş tarafı (en geniş dilimler) yukarı
    const top = W.slice(NB / 2).reduce((a, b) => a + b, 0), bot = W.slice(0, NB / 2).reduce((a, b) => a + b, 0);
    flip = bot > top;
  }
  if (flip) { rot += Math.PI; P = P.map((q) => [-q[0], -q[1], q[2]]); [y0, y1] = [-y1, -y0]; W.reverse(); }
  const L = y1 - y0, s = spec.len / L;

  // 4) kabza noktası (dikleştirilmiş, ölçeksiz koordinatta)
  let gy, gx = 0, gz = 0, yawToZ = 0;
  if (spec.kind === 'sword') {
    const g = W.indexOf(Math.max(...W.slice(0, NB / 2)));
    gy = y0 + (g + 0.5) / NB * L - 0.1 / s; // siperin 10 cm altı
    const sl = P.filter((q) => Math.abs(q[1] - gy) < 0.03 / s); if (sl.length) { gx = sl.reduce((a, q) => a + q[0], 0) / sl.length; gz = sl.reduce((a, q) => a + q[2], 0) / sl.length; }
  } else if (spec.kind === 'staff') {
    gy = y0 + L * 0.27;
    const sl = P.filter((q) => Math.abs(q[1] - gy) < 0.03 / s); if (sl.length) { gx = sl.reduce((a, q) => a + q[0], 0) / sl.length; gz = sl.reduce((a, q) => a + q[2], 0) / sl.length; }
  } else {
    // yay: kabza ortada; kavis X'te → Y çevresinde döndürülüp +Z'ye. Uçlar kirişle birlikte arkada kalır.
    gy = y0 + L / 2;
    const mid = P.filter((q) => Math.abs(q[1] - gy) < 0.06 * L);
    const tips = P.filter((q) => Math.abs(q[1] - gy) > 0.42 * L);
    const tx = tips.reduce((a, q) => a + q[0], 0) / tips.length;
    // ön: kabzanın uçlardan daha uzağa taştığı taraf (kiriş uçlara bağlı olduğundan arkada uçların hizasında kalır)
    const mids = mid.map((q) => q[0]);
    const front = Math.max(...mids) - tx > tx - Math.min(...mids) ? 1 : -1;
    gx = front > 0 ? Math.max(...mids) - 0.035 / s : Math.min(...mids) + 0.035 / s;
    gz = mid.reduce((a, q) => a + q[2], 0) / mid.length;
    // yerel +X (ön) → +Z: Y çevresinde −90°; ön −X ise +90°
    yawToZ = front > 0 ? -Math.PI / 2 : Math.PI / 2;
  }

  // 5) dönüşümü köşelere ve normallere uygula
  const cr = Math.cos(rot), sr = Math.sin(rot), cyw = Math.cos(yawToZ), syw = Math.sin(yawToZ);
  const xf = (q, isN) => {
    let x = isN ? q[0] : q[0] - cx, y = isN ? q[1] : q[1] - cy, z = q[2];
    [x, y] = [x * cr - y * sr, x * sr + y * cr];
    if (!isN) { x -= gx; y -= gy; z -= gz; x *= s; y *= s; z *= s; }
    // Y çevresinde dönüş: x' = x cos + z sin, z' = −x sin + z cos
    [x, z] = [x * cyw + z * syw, -x * syw + z * cyw];
    return [x, y, z];
  };
  for (const p of prims) {
    const pos = p.getAttribute('POSITION'), nor = p.getAttribute('NORMAL');
    for (let i = 0; i < pos.getCount(); i++) pos.setElement(i, xf(pos.getElement(i, [0, 0, 0]), false));
    if (nor) for (let i = 0; i < nor.getCount(); i++) nor.setElement(i, xf(nor.getElement(i, [0, 0, 0]), true));
  }
  // sahne düğümlerinde dönüşüm kalmasın
  for (const nd of root.listNodes()) { nd.setTranslation([0, 0, 0]); nd.setRotation([0, 0, 0, 1]); nd.setScale([1, 1, 1]); }

  // 6) küçült
  const tri0 = prims.reduce((a, p) => a + p.getIndices().getCount() / 3, 0);
  await doc.transform(
    dedup(),
    simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, 4500 / tri0), error: 0.002 }),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512], quality: 82 }),
    prune(),
    meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
  );
  for (const m of root.listMaterials()) { m.setMetallicFactor(0.2); m.setRoughnessFactor(0.55); m.setDoubleSided(true); }
  const tri1 = prims.reduce((a, p) => a + (p.getIndices()?.getCount() ?? 0) / 3, 0);
  const out = path.join(outDir, name + '.glb');
  await io.write(out, doc);
  console.log(name.padEnd(20), spec.kind, flip ? 'çevrildi' : '', `üçgen ${tri0 | 0}→${tri1 | 0}`, (fs.statSync(out).size / 1024).toFixed(0) + ' KB');
}
