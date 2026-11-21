/**
 * Boss silahları: tek Meshy üretiminden (scripts/meshy-coast.mjs boss_weapons — dört silah dik ve yan yana) gelen ağı
 * silahlara ayırır ve ele takılmaya hazır GLB'ler yazar. Her silahta:
 *   - konuma göre kaynaştırılmış bağlı parçalar x aralığına göre dört silaha toplanır (soldan sağa sıra görseldeki gibi);
 *   - sap +Y boyunca (baş/namlu yukarıda), başlangıç noktası tutuş yerinde (alttan `grip` oranı, sapın ortası);
 *   - boy metre olarak (`len`), bossun boyuna göre; namlu/baş düzlemi X-Y (kalınlık Z);
 *   - doku: ortak atlasın yalnız o silahın UV adaları yeni küçük atlasa taşınır (yoğunluk artıyorsa), JPEG + meshopt.
 * Elde yön/konum ince ayarı monsters3d.ts'teki hazır tanımlarda (dönüş, kayma).
 *
 *   node scripts/boss-weapons.mjs <boss_weapons.glb> <çıktı klasörü>
 */
import fs from 'node:fs';
import path from 'node:path';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, meshopt, prune, dedup, textureCompress } from '@gltf-transform/functions';
import { MeshoptDecoder, MeshoptEncoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

/** soldan sağa: model kimliği, boy (m), tutuş (alttan oran), doku sınırı, üçgen sınırı */
const WEAPONS = [
  { id: 'w_boss_fox', len: 1.5, grip: 0.17, tex: 512, tris: 4000 },   // Tilki Kral: altın-bronz pala
  { id: 'w_boss_scythe', len: 3.0, grip: 0.4, tex: 768, tris: 5000 }, // Azrail: kızıl ağızlı tırpan
  { id: 'w_boss_axe', len: 4.3, grip: 0.3, tex: 768, tris: 5000 },    // Kadim Yıkıcı: dev rünlü balta
  { id: 'w_boss_maul', len: 2.5, grip: 0.3, tex: 768, tris: 5000 },   // Karademir: kor başlı demirci gürzü
];

const [inp, outDir] = process.argv.slice(2);
if (!outDir) throw new Error('kullanım: node scripts/boss-weapons.mjs <girdi.glb> <çıktı klasörü>');
await MeshoptDecoder.ready; await MeshoptEncoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder, 'meshopt.encoder': MeshoptEncoder });
const src = await io.read(inp);
const prim = src.getRoot().listMeshes()[0].listPrimitives()[0];
const P = prim.getAttribute('POSITION').getArray(), N = prim.getAttribute('NORMAL').getArray(), UV = prim.getAttribute('TEXCOORD_0').getArray();
const I = prim.getIndices().getArray();
const nv = P.length / 3, nt = I.length / 3;

// ── bağlı parçalar (doku dikişleri köşeleri böler: konuma göre kaynaştırılır) ──
const canon = new Int32Array(nv); const seen = new Map();
for (let i = 0; i < nv; i++) { const k = `${Math.round(P[i * 3] * 1e4)},${Math.round(P[i * 3 + 1] * 1e4)},${Math.round(P[i * 3 + 2] * 1e4)}`; if (!seen.has(k)) seen.set(k, i); canon[i] = seen.get(k); }
const par = Int32Array.from({ length: nv }, (_, i) => i);
const find = (x) => { while (par[x] !== x) { par[x] = par[par[x]]; x = par[x]; } return x; };
for (let t = 0; t < nt; t++) { const a = find(canon[I[t * 3]]), b = find(canon[I[t * 3 + 1]]), c = find(canon[I[t * 3 + 2]]); par[a] = b; par[find(c)] = find(b); }
const comps = new Map();
for (let t = 0; t < nt; t++) {
  const r = find(canon[I[t * 3]]);
  let c = comps.get(r);
  if (!c) { c = { tris: [], x0: 1e9, x1: -1e9 }; comps.set(r, c); }
  c.tris.push(t);
  for (let k = 0; k < 3; k++) { const x = P[I[t * 3 + k] * 3]; c.x0 = Math.min(c.x0, x); c.x1 = Math.max(c.x1, x); }
}
// x aralıkları çakışan/çok yakın parçalar aynı silah
const groups = [];
for (const c of [...comps.values()].sort((a, b) => a.x0 - b.x0)) {
  const g = groups[groups.length - 1];
  if (g && c.x0 < g.x1 + 0.02) { g.tris.push(...c.tris); g.x1 = Math.max(g.x1, c.x1); g.n++; } else groups.push({ tris: [...c.tris], x0: c.x0, x1: c.x1, n: 1 });
}
console.log('parça', comps.size, '→ silah', groups.length);
if (groups.length !== WEAPONS.length) throw new Error('silah sayısı tutmadı: ' + groups.length);

const img = sharp(Buffer.from(prim.getMaterial().getBaseColorTexture().getImage()));
const { data: SRC, info: SI } = await img.removeAlpha().raw().toBuffer({ resolveWithObject: true });
const SW = SI.width, SH = SI.height;
/** UV adalarını raflara dizip yeni atlas kurar (uv yerinde güncellenir). */
async function repack(uv, idx) {
  const n = uv.length / 2, pr = Int32Array.from({ length: n }, (_, i) => i);
  const f = (x) => { while (pr[x] !== x) { pr[x] = pr[pr[x]]; x = pr[x]; } return x; };
  for (let t = 0; t < idx.length; t += 3) { const a = f(idx[t]), b = f(idx[t + 1]), c = f(idx[t + 2]); pr[a] = b; pr[f(c)] = f(b); }
  const charts = new Map();
  for (let i = 0; i < n; i++) {
    const r = f(i); let c = charts.get(r);
    if (!c) { c = { verts: [], u0: 1e9, v0: 1e9, u1: -1e9, v1: -1e9 }; charts.set(r, c); }
    c.verts.push(i); const x = uv[i * 2] * SW, y = uv[i * 2 + 1] * SH;
    c.u0 = Math.min(c.u0, x); c.v0 = Math.min(c.v0, y); c.u1 = Math.max(c.u1, x); c.v1 = Math.max(c.v1, y);
  }
  const PAD = 3;
  const rects = [...charts.values()].map((c) => { const x0 = Math.max(0, Math.floor(c.u0) - PAD), y0 = Math.max(0, Math.floor(c.v0) - PAD); return { c, x0, y0, w: Math.min(SW, Math.ceil(c.u1) + PAD) - x0, h: Math.min(SH, Math.ceil(c.v1) + PAD) - y0 }; });
  let W2 = Math.ceil(Math.sqrt(rects.reduce((a, r) => a + r.w * r.h, 0) * 1.15) / 4) * 4, H2 = 0;
  rects.sort((a, b) => b.h - a.h);
  for (;;) {
    let x = 0, y = 0, sh = 0, ok = true;
    for (const r of rects) { if (r.w > W2) { ok = false; break; } if (x + r.w > W2) { y += sh; x = 0; sh = 0; } r.X = x; r.Y = y; x += r.w; sh = Math.max(sh, r.h); }
    H2 = y + sh; if (ok && H2 <= W2 * 1.1) break; W2 = Math.ceil(W2 * 1.06 / 4) * 4;
  }
  H2 = Math.ceil(H2 / 4) * 4;
  const out = Buffer.alloc(W2 * H2 * 3, 0);
  for (const r of rects) for (let yy = 0; yy < r.h; yy++) SRC.copy(out, ((r.Y + yy) * W2 + r.X) * 3, ((r.y0 + yy) * SW + r.x0) * 3, ((r.y0 + yy) * SW + r.x0 + r.w) * 3);
  for (const r of rects) for (const i of r.c.verts) { uv[i * 2] = (uv[i * 2] * SW - r.x0 + r.X) / W2; uv[i * 2 + 1] = (uv[i * 2 + 1] * SH - r.y0 + r.Y) / H2; }
  return { img: await sharp(out, { raw: { width: W2, height: H2, channels: 3 } }).jpeg({ quality: 92 }).toBuffer(), W2, H2 };
}

fs.mkdirSync(outDir, { recursive: true });
for (const [gi, w] of WEAPONS.entries()) {
  const g = groups[gi];
  const remap = new Map(); const pos = [], nor = [], uv = [], idx = [];
  for (const t of g.tris) for (let k = 0; k < 3; k++) {
    const v = I[t * 3 + k];
    let j = remap.get(v);
    if (j === undefined) { j = remap.size; remap.set(v, j); pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); nor.push(N[v * 3], N[v * 3 + 1], N[v * 3 + 2]); uv.push(UV[v * 2], UV[v * 2 + 1]); }
    idx.push(j);
  }
  let y0 = 1e9, y1 = -1e9; for (let i = 1; i < pos.length; i += 3) { y0 = Math.min(y0, pos[i]); y1 = Math.max(y1, pos[i]); }
  const k = w.len / (y1 - y0), gy = y0 + (y1 - y0) * w.grip;
  // tutuş: o yükseklikteki sap kesitinin ortası
  let sx = 0, sz = 0, sn = 0; for (let i = 0; i < pos.length; i += 3) if (Math.abs(pos[i + 1] - gy) < (y1 - y0) * 0.012) { sx += pos[i]; sz += pos[i + 2]; sn++; }
  const gx = sx / Math.max(1, sn), gz = sz / Math.max(1, sn);
  for (let i = 0; i < pos.length; i += 3) { pos[i] = (pos[i] - gx) * k; pos[i + 1] = (pos[i + 1] - gy) * k; pos[i + 2] = (pos[i + 2] - gz) * k; }
  // doku: yeni atlas yoğunluğu belirgin artırıyorsa
  let uvArea = 0; for (let t = 0; t < idx.length; t += 3) { const [a, b, c] = [idx[t], idx[t + 1], idx[t + 2]]; uvArea += Math.abs((uv[b * 2] - uv[a * 2]) * (uv[c * 2 + 1] - uv[a * 2 + 1]) - (uv[c * 2] - uv[a * 2]) * (uv[b * 2 + 1] - uv[a * 2 + 1])) / 2; }
  const uv2 = uv.slice(); const at = await repack(uv2, idx);
  const gain = (SW * SH) / (at.W2 * at.H2);
  const useNew = gain > 1.15;
  const doc = new Document(); const buf = doc.createBuffer();
  const acc = (arr, type) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
  const tex = doc.createTexture(w.id).setImage(new Uint8Array(useNew ? at.img : Buffer.from(prim.getMaterial().getBaseColorTexture().getImage()))).setMimeType('image/jpeg');
  const mat = doc.createMaterial(w.id).setBaseColorTexture(tex).setRoughnessFactor(0.55).setMetallicFactor(0.25);
  const p2 = doc.createPrimitive().setMaterial(mat).setIndices(acc(new Uint32Array(idx), 'SCALAR'))
    .setAttribute('POSITION', acc(new Float32Array(pos), 'VEC3')).setAttribute('NORMAL', acc(new Float32Array(nor), 'VEC3')).setAttribute('TEXCOORD_0', acc(new Float32Array(useNew ? uv2 : uv), 'VEC2'));
  doc.createScene(w.id).addChild(doc.createNode(w.id).setMesh(doc.createMesh(w.id).addPrimitive(p2)));
  const tris0 = idx.length / 3;
  await doc.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, w.tris / tris0), error: 0.002 }), dedup(), prune(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [w.tex, w.tex], quality: 84 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const file = path.join(outDir, w.id + '.glb');
  await io.write(file, doc);
  const tris = doc.getRoot().listMeshes()[0].listPrimitives()[0].getIndices().getCount() / 3;
  console.log(`${w.id.padEnd(14)} parça ${g.n}  boy ${w.len} m  üçgen ${tris0}→${tris}  atlas ${useNew ? at.W2 + '×' + at.H2 : 'ortak'} (UV payı %${(uvArea * 100).toFixed(1)})  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
}
