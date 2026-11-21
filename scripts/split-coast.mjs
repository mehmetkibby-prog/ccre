/**
 * Rün Sahili sahil seti: tek Meshy üretiminden (menhir + Gelgit Yengeci + batık gemi, scripts/meshy-coast.mjs coast_mix)
 * gelen tek ağı nesnelere ayırır. Konuma göre kaynaştırılmış bağlı parçalar bulunur, en büyük üç parça tohum olur,
 * küçük kopuk parçalar (yelken, ip, çakıl) en yakın nesneye katılır. Her nesne kendi GLB'sine yazılır (aynı doku),
 * tabanı y=0'a, ortası x=z=0'a taşınır; ad görseldeki sıradan (soldan sağa: menhir, yengeç, gemi).
 *
 *   node scripts/split-coast.mjs <coast_mix.glb> <çıktı klasörü>
 *   → <çıktı>/menhir_raw.glb, crab_raw.glb, shipwreck_raw.glb (paketleme ayrı)
 * Doku: ortak atlasın yalnız o nesnenin kullandığı UV adaları, kaynak çözünürlükte yeni ve küçük bir atlasa taşınır
 * (menhir ortak atlasın ~%4'ünü kullanıyordu: bütün atlas küçültülünce rünler bulanıklaşırdı).
 */
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import sharp from 'sharp';

const [inp, outDir] = process.argv.slice(2);
if (!outDir) throw new Error('kullanım: node scripts/split-coast.mjs <girdi.glb> <çıktı klasörü>');
await MeshoptDecoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
const src = await io.read(inp);
const prim = src.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray(), UV = prim.getAttribute('TEXCOORD_0').getArray();
const I = prim.getIndices().getArray();
const nv = P.length / 3, nt = I.length / 3;

// konuma göre kaynaştır (doku dikişleri köşeleri böler) → birleşim-bul
const key = (i) => `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`;
const canon = new Int32Array(nv); const seen = new Map();
for (let i = 0; i < nv; i++) { const k = key(i); if (!seen.has(k)) seen.set(k, i); canon[i] = seen.get(k); }
const par = Int32Array.from({ length: nv }, (_, i) => i);
const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
const join = (a, b) => { a = find(a); b = find(b); if (a !== b) par[a] = b; };
for (let t = 0; t < nt; t++) { const a = canon[I[t * 3]], b = canon[I[t * 3 + 1]], c = canon[I[t * 3 + 2]]; join(a, b); join(b, c); }
const comps = new Map();
for (let t = 0; t < nt; t++) {
  const r = find(canon[I[t * 3]]);
  let c = comps.get(r);
  if (!c) { c = { tris: [], min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] }; comps.set(r, c); }
  c.tris.push(t);
  for (let k = 0; k < 3; k++) { const v = I[t * 3 + k]; for (let a = 0; a < 3; a++) { c.min[a] = Math.min(c.min[a], P[v * 3 + a]); c.max[a] = Math.max(c.max[a], P[v * 3 + a]); } }
}
const list = [...comps.values()].sort((a, b) => b.tris.length - a.tris.length);
const ctr = (c) => c.min.map((v, a) => (v + c.max[a]) / 2);
console.log('parça:', list.length, 'en büyükler:', list.slice(0, 8).map((c) => `${c.tris.length}@${ctr(c).map((v) => v.toFixed(2)).join(',')}`).join('  '));
// tohum: birbirinden uzak en büyük üç parça
const seeds = [list[0]];
for (const c of list) { if (seeds.length === 3) break; if (seeds.every((s) => Math.hypot(...ctr(s).map((v, a) => v - ctr(c)[a])) > 0.25)) seeds.push(c); }
const groups = seeds.map((s) => ({ comps: [s], min: [...s.min], max: [...s.max] }));
const boxDist = (g, c) => { let d = 0; for (let a = 0; a < 3; a++) { const gap = Math.max(g.min[a] - c.max[a], c.min[a] - g.max[a], 0); d += gap * gap; } return Math.sqrt(d); };
for (const c of list) {
  if (seeds.includes(c)) continue;
  let best = groups[0], bd = Infinity;
  for (const g of groups) { const d = boxDist(g, c); if (d < bd) { bd = d; best = g; } }
  best.comps.push(c);
  for (let a = 0; a < 3; a++) { best.min[a] = Math.min(best.min[a], c.min[a]); best.max[a] = Math.max(best.max[a], c.max[a]); }
}
// adlandırma: üretim görseldeki soldan sağa sırayı korur (menhir, yengeç, gemi)
const dims = (g) => g.max.map((v, a) => v - g.min[a]);
const [menhir, crab, shipwreck] = [...groups].sort((a, b) => (a.min[0] + a.max[0]) - (b.min[0] + b.max[0]));
const named = { menhir, crab, shipwreck };

const tex = prim.getMaterial().getBaseColorTexture();
const srcImg = sharp(Buffer.from(tex.getImage()));
const { data: SRC, info: SI } = await srcImg.removeAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = SI.width, SH = SI.height;
/** Nesnenin UV adalarını (indeks bağlantılı üçgen kümeleri) raflara dizip yeni atlas kurar; UV'ler yerinde güncellenir. */
async function repack(uv, idx) {
  const nv2 = uv.length / 2, par2 = Int32Array.from({ length: nv2 }, (_, i) => i);
  const f2 = (x) => { while (par2[x] !== x) { par2[x] = par2[par2[x]]; x = par2[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const a = f2(idx[t]), b = f2(idx[t + 1]), c = f2(idx[t + 2]); par2[a] = b; par2[f2(c)] = f2(b); }
  const charts = new Map();
  for (let i = 0; i < nv2; i++) {
    const r = f2(i); let c = charts.get(r);
    if (!c) { c = { verts: [], u0: 1e9, v0: 1e9, u1: -1e9, v1: -1e9 }; charts.set(r, c); }
    c.verts.push(i); const x = uv[i * 2] * SW, y = uv[i * 2 + 1] * SH;
    c.u0 = Math.min(c.u0, x); c.v0 = Math.min(c.v0, y); c.u1 = Math.max(c.u1, x); c.v1 = Math.max(c.v1, y);
  }
  const PAD = 3;
  const rects = [...charts.values()].map((c) => { const x0 = Math.max(0, Math.floor(c.u0) - PAD), y0 = Math.max(0, Math.floor(c.v0) - PAD); return { c, x0, y0, w: Math.min(SW, Math.ceil(c.u1) + PAD) - x0, h: Math.min(SH, Math.ceil(c.v1) + PAD) - y0 }; });
  const area = rects.reduce((a, r) => a + r.w * r.h, 0);
  let W2 = Math.ceil(Math.sqrt(area * 1.15) / 4) * 4, H2 = 0;
  rects.sort((a, b) => b.h - a.h);
  for (;;) { // raf dizimi: sığmazsa genişlik artar
    let x = 0, y = 0, sh = 0, ok = true;
    for (const r of rects) { if (r.w > W2) { ok = false; break; } if (x + r.w > W2) { y += sh; x = 0; sh = 0; } r.X = x; r.Y = y; x += r.w; sh = Math.max(sh, r.h); }
    H2 = y + sh; if (ok && H2 <= W2 * 1.1) break; W2 = Math.ceil(W2 * 1.06 / 4) * 4;
  }
  H2 = Math.ceil(H2 / 4) * 4;
  const out = Buffer.alloc(W2 * H2 * 3, 0);
  for (const r of rects) for (let yy = 0; yy < r.h; yy++) SRC.copy(out, ((r.Y + yy) * W2 + r.X) * 3, ((r.y0 + yy) * SW + r.x0) * 3, ((r.y0 + yy) * SW + r.x0 + r.w) * 3);
  for (const r of rects) for (const i of r.c.verts) { uv[i * 2] = (uv[i * 2] * SW - r.x0 + r.X) / W2; uv[i * 2 + 1] = (uv[i * 2 + 1] * SH - r.y0 + r.Y) / H2; }
  const img = await sharp(out, { raw: { width: W2, height: H2, channels: 3 } }).jpeg({ quality: 92 }).toBuffer();
  return { img, W2, H2, charts: rects.length };
}
fs.mkdirSync(outDir, { recursive: true });
for (const [name, g] of Object.entries(named)) {
  const tris = g.comps.flatMap((c) => c.tris);
  const remap = new Map(); const pos = [], nor = [], uv = [], idx = [];
  for (const t of tris) for (let k = 0; k < 3; k++) {
    const v = I[t * 3 + k];
    let j = remap.get(v);
    if (j === undefined) { j = remap.size; remap.set(v, j); pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); nor.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); uv.push(UV[v * 2], UV[v * 2 + 1]); }
    idx.push(j);
  }
  // taban y=0, orta x=z=0
  const cx = (g.min[0] + g.max[0]) / 2, cz = (g.min[2] + g.max[2]) / 2, y0 = g.min[1];
  // süsler gerçek boyda (metre; props3d MESHY_PROPS boylarıyla aynı), yengeç ham birimde kalır (crab-rig ölçüleri ona göre)
  const k = { menhir: 3.4, shipwreck: 3.6 }[name] ? { menhir: 3.4, shipwreck: 3.6 }[name] / (g.max[1] - g.min[1]) : 1;
  for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - cx) * k; pos[i + 1] = (pos[i + 1] - y0) * k; pos[i + 2] = (pos[i + 2] - cz) * k; }
  // yeni atlas yalnız doku yoğunluğunu belirgin artırıyorsa (küçük adalar çok yer kaplar): yoksa ortak atlas kalır
  let uvArea = 0; for (let t = 0; t < idx.length; t += 3) { const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]]; uvArea += Math.abs((uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1])) / 2; }
  const uvCopy = uv.slice();
  let atlas = await repack(uvCopy, idx);
  const gain = (uvArea * SW * SH / (atlas.W2 * atlas.H2)) / uvArea;
  if (gain > 1.15) uv.splice(0, uv.length, ...uvCopy);
  else atlas = { img: Buffer.from(tex.getImage()), W2: SW, H2: SH, charts: 'ortak atlas' };
  const doc = new Document(); const buf = doc.createBuffer();
  const acc = (arr, type) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const t2 = doc.createTexture(name).setImage(new Uint8Array(atlas.img)).setMimeType(typeof atlas.charts === 'number' ? 'image/jpeg' : tex.getMimeType());
  const mat = doc.createMaterial(name).setBaseColorTexture(t2).setRoughnessFactor(0.85).setMetallicFactor(0);
  const p2 = doc.createPrimitive().setMaterial(mat).setIndices(acc(new Uint32Array(idx), 'SCALAR'))
    .setAttribute('POSITION', acc(new Float32Array(pos), 'VEC3')).setAttribute('NORMAL', acc(new Float32Array(nor), 'VEC3')).setAttribute('TEXCOORD_0', acc(new Float32Array(uv), 'VEC2'));
  const node = doc.createNode(name).setMesh(doc.createMesh(name).addPrimitive(p2));
  doc.createScene(name).addChild(node);
  const file = path.join(outDir, name + '_raw.glb');
  await io.write(file, doc);
  const d = dims(g).map((v) => v * k);
  console.log(`${name.padEnd(9)} parça ${String(g.comps.length).padStart(4)}  üçgen ${String(tris.length).padStart(6)}  boyut x${d[0].toFixed(3)} y${d[1].toFixed(3)} z${d[2].toFixed(3)}  atlas ${atlas.W2}×${atlas.H2} (${atlas.charts}${typeof atlas.charts === 'number' ? ' ada' : ''}, UV payı %${(uvArea * 100).toFixed(1)})  → ${file}`);
}
