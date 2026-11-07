/**
 * Zırhlı karakter çeşidi: Meshy'de görselden üretilmiş (iskeletsiz) modeli, aynı sınıfın iskeletli temel modeline
 * oturtur ve deri ağırlıklarını temel modelden aktarır. Böylece çeşit, temel modelin iskeletini ve bütün
 * animasyonlarını kullanır (Meshy'de ayrıca iskelet/animasyon ücreti ödenmez, animasyonlar paylaşılır).
 *
 * Adımlar: temel modelin bağlanma pozundaki köşelerini dünya uzayında çıkar → çeşidi aynı boya ölçekle ve ayaklarını
 * hizala → her köşeye en yakın temel köşelerden ağırlık aktar (uzaklıkla ağırlıklı, en çok 4 kemik) → temel belgenin
 * ağını yeni ağla değiştir, animasyonları sil (istemci temel modelinkini kullanır) → küçült ve sıkıştır.
 *
 *   node scripts/armor-variant.mjs <temel.glb> <çeşit.glb> <çıktı.glb> [üçgen=14000]
 */
import fs from 'node:fs';
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [basePath, varPath, outPath, triArg] = process.argv.slice(2);
if (!outPath) throw new Error('kullanım: node scripts/armor-variant.mjs <temel.glb> <çeşit.glb> <çıktı.glb> [üçgen]');
const TRI = Number(triArg ?? 14000);
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

// ── 4×4 sütun öncelikli matris yardımcıları ──
const mul = (a, b) => { const o = new Array(16).fill(0); for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k]; return o; };
const apply = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
function invert(m) {
  const inv = new Array(16);
  inv[0] = m[5] * m[10] * m[15] - m[5] * m[11] * m[14] - m[9] * m[6] * m[15] + m[9] * m[7] * m[14] + m[13] * m[6] * m[11] - m[13] * m[7] * m[10];
  inv[4] = -m[4] * m[10] * m[15] + m[4] * m[11] * m[14] + m[8] * m[6] * m[15] - m[8] * m[7] * m[14] - m[12] * m[6] * m[11] + m[12] * m[7] * m[10];
  inv[8] = m[4] * m[9] * m[15] - m[4] * m[11] * m[13] - m[8] * m[5] * m[15] + m[8] * m[7] * m[13] + m[12] * m[5] * m[11] - m[12] * m[7] * m[9];
  inv[12] = -m[4] * m[9] * m[14] + m[4] * m[10] * m[13] + m[8] * m[5] * m[14] - m[8] * m[6] * m[13] - m[12] * m[5] * m[10] + m[12] * m[6] * m[9];
  inv[1] = -m[1] * m[10] * m[15] + m[1] * m[11] * m[14] + m[9] * m[2] * m[15] - m[9] * m[3] * m[14] - m[13] * m[2] * m[11] + m[13] * m[3] * m[10];
  inv[5] = m[0] * m[10] * m[15] - m[0] * m[11] * m[14] - m[8] * m[2] * m[15] + m[8] * m[3] * m[14] + m[12] * m[2] * m[11] - m[12] * m[3] * m[10];
  inv[9] = -m[0] * m[9] * m[15] + m[0] * m[11] * m[13] + m[8] * m[1] * m[15] - m[8] * m[3] * m[13] - m[12] * m[1] * m[11] + m[12] * m[3] * m[9];
  inv[13] = m[0] * m[9] * m[14] - m[0] * m[10] * m[13] - m[8] * m[1] * m[14] + m[8] * m[2] * m[13] + m[12] * m[1] * m[10] - m[12] * m[2] * m[9];
  inv[2] = m[1] * m[6] * m[15] - m[1] * m[7] * m[14] - m[5] * m[2] * m[15] + m[5] * m[3] * m[14] + m[13] * m[2] * m[7] - m[13] * m[3] * m[6];
  inv[6] = -m[0] * m[6] * m[15] + m[0] * m[7] * m[14] + m[4] * m[2] * m[15] - m[4] * m[3] * m[14] - m[12] * m[2] * m[7] + m[12] * m[3] * m[6];
  inv[10] = m[0] * m[5] * m[15] - m[0] * m[7] * m[13] - m[4] * m[1] * m[15] + m[4] * m[3] * m[13] + m[12] * m[1] * m[7] - m[12] * m[3] * m[5];
  inv[14] = -m[0] * m[5] * m[14] + m[0] * m[6] * m[13] + m[4] * m[1] * m[14] - m[4] * m[2] * m[13] - m[12] * m[1] * m[6] + m[12] * m[2] * m[5];
  inv[3] = -m[1] * m[6] * m[11] + m[1] * m[7] * m[10] + m[5] * m[2] * m[11] - m[5] * m[3] * m[10] - m[9] * m[2] * m[7] + m[9] * m[3] * m[6];
  inv[7] = m[0] * m[6] * m[11] - m[0] * m[7] * m[10] - m[4] * m[2] * m[11] + m[4] * m[3] * m[10] + m[8] * m[2] * m[7] - m[8] * m[3] * m[6];
  inv[11] = -m[0] * m[5] * m[11] + m[0] * m[7] * m[9] + m[4] * m[1] * m[11] - m[4] * m[3] * m[9] - m[8] * m[1] * m[7] + m[8] * m[3] * m[5];
  inv[15] = m[0] * m[5] * m[10] - m[0] * m[6] * m[9] - m[4] * m[1] * m[10] + m[4] * m[2] * m[9] + m[8] * m[1] * m[6] - m[8] * m[2] * m[5];
  const det = m[0] * inv[0] + m[1] * inv[4] + m[2] * inv[8] + m[3] * inv[12];
  return inv.map((x) => x / det);
}

// ── temel model: bağlanma pozundaki dünya konumları + ağırlıklar ──
const base = await io.read(basePath);
const broot = base.getRoot();
const skin = broot.listSkins()[0];
const skinNode = broot.listNodes().find((n) => n.getSkin() === skin && n.getMesh());
const bprim = skinNode.getMesh().listPrimitives()[0];
const joints = skin.listJoints();
const ibm = skin.getInverseBindMatrices();
// bağlanma pozunda her eklem için (eklem dünya × ters bağlanma) aynı matristir: ağın dünya dönüşümü
const M = mul(joints[0].getWorldMatrix(), ibm.getElement(0, new Array(16)));
const Minv = invert(M);
const bpos = bprim.getAttribute('POSITION'), bj = bprim.getAttribute('JOINTS_0'), bw = bprim.getAttribute('WEIGHTS_0');
const BN = bpos.getCount();
const BP = new Float32Array(BN * 3), BJ = new Uint16Array(BN * 4), BW = new Float32Array(BN * 4);
const bmin = [1e9, 1e9, 1e9], bmax = [-1e9, -1e9, -1e9];
for (let i = 0; i < BN; i++) {
  const p = apply(M, bpos.getElement(i, [0, 0, 0]));
  BP.set(p, i * 3);
  for (let k = 0; k < 3; k++) { bmin[k] = Math.min(bmin[k], p[k]); bmax[k] = Math.max(bmax[k], p[k]); }
  BJ.set(bj.getElement(i, [0, 0, 0, 0]), i * 4); BW.set(bw.getElement(i, [0, 0, 0, 0]), i * 4);
}
const bH = bmax[1] - bmin[1];
console.log('temel: köşe', BN, 'boy', bH.toFixed(3), 'genişlik', (bmax[0] - bmin[0]).toFixed(3), 'derinlik', (bmax[2] - bmin[2]).toFixed(3));

// ── çeşit: ölçekle ve hizala ──
const vdoc = await io.read(varPath);
await vdoc.transform(weld());
const vprim = vdoc.getRoot().listMeshes()[0].listPrimitives()[0];
const vnode = vdoc.getRoot().listNodes().find((n) => n.getMesh());
const VW = vnode.getWorldMatrix();
const vpos = vprim.getAttribute('POSITION'), vnor = vprim.getAttribute('NORMAL'), vuv = vprim.getAttribute('TEXCOORD_0');
let VN = vpos.getCount();
const raw = []; const vmin = [1e9, 1e9, 1e9], vmax = [-1e9, -1e9, -1e9];
for (let i = 0; i < VN; i++) { const p = apply(VW, vpos.getElement(i, [0, 0, 0])); raw.push(p); for (let k = 0; k < 3; k++) { vmin[k] = Math.min(vmin[k], p[k]); vmax[k] = Math.max(vmax[k], p[k]); } }
const s = bH / (vmax[1] - vmin[1]);
// yatayda: gövde ortası (bel yüksekliğindeki köşelerin ortası) hizalanır; pelerin/etek ortalamayı kaydırmasın
const mid = (P, lo, hi, axis, y0, h) => { let a = 0, n = 0; for (const p of P) { const t = (p[1] - y0) / h; if (t > lo && t < hi) { a += p[axis]; n++; } } return n ? a / n : 0; };
const braw = []; for (let i = 0; i < BN; i++) braw.push([BP[i * 3], BP[i * 3 + 1], BP[i * 3 + 2]]);
const bcx = mid(braw, 0.55, 0.75, 0, bmin[1], bH), bcz = mid(braw, 0.55, 0.75, 2, bmin[1], bH);
const vcx = mid(raw, 0.55, 0.75, 0, vmin[1], vmax[1] - vmin[1]), vcz = mid(raw, 0.55, 0.75, 2, vmin[1], vmax[1] - vmin[1]);
const VP = raw.map((p) => [(p[0] - vcx) * s + bcx, (p[1] - vmin[1]) * s + bmin[1], (p[2] - vcz) * s + bcz]);
const nmin = [1e9, 1e9, 1e9], nmax = [-1e9, -1e9, -1e9];
for (const p of VP) for (let k = 0; k < 3; k++) { nmin[k] = Math.min(nmin[k], p[k]); nmax[k] = Math.max(nmax[k], p[k]); }
console.log('çeşit: köşe', VN, 'ölçek', s.toFixed(4), 'genişlik', (nmax[0] - nmin[0]).toFixed(3), 'derinlik', (nmax[2] - nmin[2]).toFixed(3));

// ── en yakın komşuyla ağırlık aktarımı (ızgara) ──
const cell = bH / 60;
const grid = new Map();
const key = (x, y, z) => `${x},${y},${z}`;
for (let i = 0; i < BN; i++) { const c = key(Math.floor(BP[i * 3] / cell), Math.floor(BP[i * 3 + 1] / cell), Math.floor(BP[i * 3 + 2] / cell)); let a = grid.get(c); if (!a) grid.set(c, (a = [])); a.push(i); }
const K = 8;
const OJ = new Uint16Array(VN * 4), OW = new Float32Array(VN * 4);
let far = 0;
for (let i = 0; i < VN; i++) {
  const p = VP[i];
  const cx = Math.floor(p[0] / cell), cy = Math.floor(p[1] / cell), cz = Math.floor(p[2] / cell);
  let best = [];
  for (let r = 1; r < 40 && best.length < K; r++) {
    best = [];
    for (let x = cx - r; x <= cx + r; x++) for (let y = cy - r; y <= cy + r; y++) for (let z = cz - r; z <= cz + r; z++) {
      const a = grid.get(key(x, y, z)); if (!a) continue;
      for (const j of a) { const dx = BP[j * 3] - p[0], dy = BP[j * 3 + 1] - p[1], dz = BP[j * 3 + 2] - p[2]; best.push([dx * dx + dy * dy + dz * dz, j]); }
    }
    if (best.length >= K) { best.sort((a, b) => a[0] - b[0]); best = best.slice(0, K); if (Math.sqrt(best[K - 1][0]) > r * cell) best = best.length >= K && r < 39 ? best : best; }
  }
  if (Math.sqrt(best[0][0]) > bH * 0.06) far++;
  const acc = new Map();
  const d0 = Math.max(1e-6, best[0][0]);
  for (const [d2, j] of best) {
    const w = 1 / Math.max(d0, d2);
    for (let k = 0; k < 4; k++) { const jw = BW[j * 4 + k]; if (jw <= 0) continue; const jj = BJ[j * 4 + k]; acc.set(jj, (acc.get(jj) ?? 0) + jw * w); }
  }
  const top = [...acc].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = top.reduce((a, t) => a + t[1], 0) || 1;
  top.forEach(([jj, w], k) => { OJ[i * 4 + k] = jj; OW[i * 4 + k] = w / sum; });
}
console.log('aktarım tamam; temel yüzeyden uzak köşe:', far, `(%${(far / VN * 100).toFixed(1)})`);

// ── temel belgede ağı değiştir ──
const pos = new Float32Array(VN * 3), nor = new Float32Array(VN * 3), uv = new Float32Array(VN * 2);
const R3 = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
const Ninv = invert(mul(M, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]));
for (let i = 0; i < VN; i++) {
  pos.set(apply(Minv, VP[i]), i * 3);
  // normal: önce çeşidin düğüm dönüşümü, sonra ağ uzayına (yalnız dönüş; ölçek normalize edilir)
  let n = R3(VW, vnor.getElement(i, [0, 0, 0])); n = R3(Ninv, n); const l = Math.hypot(...n) || 1;
  nor.set([n[0] / l, n[1] / l, n[2] / l], i * 3);
  uv.set(vuv.getElement(i, [0, 0]), i * 2);
}
const buf = broot.listBuffers()[0];
const acc = (arr, type) => base.createAccessor().setArray(arr).setType(type).setBuffer(buf);
const prim = base.createPrimitive()
  .setAttribute('POSITION', acc(pos, 'VEC3')).setAttribute('NORMAL', acc(nor, 'VEC3')).setAttribute('TEXCOORD_0', acc(uv, 'VEC2'))
  .setAttribute('JOINTS_0', acc(OJ, 'VEC4')).setAttribute('WEIGHTS_0', acc(OW, 'VEC4'))
  .setIndices(acc(new Uint32Array(vprim.getIndices().getArray()), 'SCALAR'));
// malzeme: çeşidin dokusu
const vtexImg = vprim.getMaterial().getBaseColorTexture().getImage();
const tex = base.createTexture('armor').setImage(vtexImg).setMimeType(vprim.getMaterial().getBaseColorTexture().getMimeType());
const mat = base.createMaterial('armor').setBaseColorTexture(tex).setRoughnessFactor(0.7).setMetallicFactor(0.15);
prim.setMaterial(mat);
const mesh = skinNode.getMesh();
for (const p of mesh.listPrimitives()) mesh.removePrimitive(p);
mesh.addPrimitive(prim);
for (const a of broot.listAnimations()) a.dispose();
await base.transform(
  prune(),
  dedup(),
  simplify({ simplifier: MeshoptSimplifier, ratio: Math.min(1, TRI / (vprim.getIndices().getCount() / 3)), error: 0.001 }),
  textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 84 }),
  meshopt({ encoder: MeshoptEncoder, level: 'medium' }),
);
await io.write(outPath, base);
console.log('yazıldı', outPath, (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB');
