/**
 * Dört ayaklı otomatik iskelet: Meshy'de görselden üretilen (iskeletsiz) hayvan modelini oyunun dört ayaklı
 * iskeletine (monsters3d.ts QB: body, chest, neck, head, jaw, tail1, tail2, fl/fr/bl/br U-L-P) bağlar.
 * Meshy'nin iskelet servisi yalnız iki ayaklıları desteklediği için kemikler geometriden çıkarılır:
 *   patiler (en alttaki köşeler, dört çeyreğe bölünür) → bacak sütunları → gövde alt yüzü → omurga,
 *   en öndeki yüksek küme → baş, en arkadaki ince uzantı → kuyruk.
 * Deri ağırlığı: bölgeye göre aday kemikler (bacak / kuyruk / baş / gövde), en yakın iki kemik parçasına
 * uzaklıkla yumuşak geçiş. Kemiklerin dinlenme dönüşü birimdir (yalnız öteleme): istemcideki prosedürel
 * animasyon (quadAnimate) aynen çalışır.
 *
 *   node scripts/quad-rig.mjs <girdi.glb> <çıktı.glb> [boy=0.95]
 *   boy: kulak ucuna kadar yükseklik (oyun birimi, metre)
 */
import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplify, textureCompress, meshopt, prune, dedup } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [inPath, outPath, hArg] = process.argv.slice(2);
if (!outPath) throw new Error('kullanım: node scripts/quad-rig.mjs <girdi.glb> <çıktı.glb> [boy]');
const HEIGHT = Number(hArg ?? 0.95);
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const src = await io.read(inPath);
await src.transform(weld());
await src.transform(simplify({ simplifier: MeshoptSimplifier, ratio: 0.75, error: 0.0008 }));
const sp = src.getRoot().listMeshes()[0].listPrimitives()[0];
const node = src.getRoot().listNodes().find((n) => n.getMesh());
const Wm = node.getWorldMatrix();
const ap = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2] + m[12], m[1] * v[0] + m[5] * v[1] + m[9] * v[2] + m[13], m[2] * v[0] + m[6] * v[1] + m[10] * v[2] + m[14]];
const ar = (m, v) => [m[0] * v[0] + m[4] * v[1] + m[8] * v[2], m[1] * v[0] + m[5] * v[1] + m[9] * v[2], m[2] * v[0] + m[6] * v[1] + m[10] * v[2]];
const pos = sp.getAttribute('POSITION'), nor = sp.getAttribute('NORMAL'), uvA = sp.getAttribute('TEXCOORD_0');
const N = pos.getCount();
let P = [], NN = [];
for (let i = 0; i < N; i++) { P.push(ap(Wm, pos.getElement(i, [0, 0, 0]))); NN.push(ar(Wm, nor.getElement(i, [0, 0, 0]))); }

// ── yön: uzun yatay eksen gövde; baş, yüksek ucun olduğu taraf → +Z ──
const bb = () => { const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9]; for (const p of P) for (let k = 0; k < 3; k++) { mn[k] = Math.min(mn[k], p[k]); mx[k] = Math.max(mx[k], p[k]); } return { mn, mx }; };
// yatay düzlemde ana eksen (PCA, X-Z)
let cx = 0, cz = 0; for (const p of P) { cx += p[0]; cz += p[2]; } cx /= N; cz /= N;
let sxx = 0, szz = 0, sxz = 0; for (const p of P) { const dx = p[0] - cx, dz = p[2] - cz; sxx += dx * dx; szz += dz * dz; sxz += dx * dz; }
const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz); // ana eksenin X'e açısı
const rotY = (p, a) => [p[0] * Math.cos(a) + p[2] * Math.sin(a), p[1], -p[0] * Math.sin(a) + p[2] * Math.cos(a)];
// ana ekseni Z'ye çevir: X ekseninden ang kadar → Z'ye çevirmek için
let yaw = ang - Math.PI / 2;
P = P.map((p) => rotY([p[0] - cx, p[1], p[2] - cz], yaw)); NN = NN.map((n) => rotY(n, yaw));
{ // baş tarafı: üst %25'teki köşelerin z ortalaması hangi uçtaysa
  const { mn, mx } = bb(); const top = mn[1] + (mx[1] - mn[1]) * 0.75;
  let s = 0, n = 0; for (const p of P) if (p[1] > top) { s += p[2]; n++; }
  if (s / n < 0) { P = P.map((p) => [-p[0], p[1], -p[2]]); NN = NN.map((q) => [-q[0], q[1], -q[2]]); yaw += Math.PI; }
}
// ölçek ve yere oturtma
{
  const { mn, mx } = bb(); const s = HEIGHT / (mx[1] - mn[1]);
  const mz = (mn[2] + mx[2]) / 2, mxx = (mn[0] + mx[0]) / 2;
  P = P.map((p) => [(p[0] - mxx) * s, (p[1] - mn[1]) * s, (p[2] - mz) * s]);
}
const { mn, mx } = bb();
const H = mx[1] - mn[1], Lz = mx[2] - mn[2];
console.log('boyut (m): boy', H.toFixed(3), 'uzunluk', Lz.toFixed(3), 'genişlik', (mx[0] - mn[0]).toFixed(3));

// ── patiler: yere değen köşeler 4 kümeye ayrılır (k-ortalama); yere sarkan kuyruk ucu ayıklanır ──
const minY = Math.min(...P.map((p) => p[1]));
const low = P.filter((p) => p[1] < minY + H * 0.03);
const zMid0 = low.reduce((a, p) => a + p[2], 0) / low.length;
let cent = [[1, 1], [-1, 1], [1, -1], [-1, -1]].map(([sx, sz]) => { const g = low.filter((p) => Math.sign(p[0] || 1) === sx && Math.sign(p[2] - zMid0 || 1) === sz); return g.length ? [g.reduce((a, p) => a + p[0], 0) / g.length, g.reduce((a, p) => a + p[2], 0) / g.length] : [sx * 0.08, zMid0 + sz * 0.2]; });
for (let it = 0; it < 20; it++) {
  const acc2 = cent.map(() => [0, 0, 0]);
  for (const p of low) { let bi = 0, bd = 1e9; cent.forEach((c, i) => { const d = Math.hypot(p[0] - c[0], p[2] - c[1]); if (d < bd) { bd = d; bi = i; } }); acc2[bi][0] += p[0]; acc2[bi][1] += p[2]; acc2[bi][2]++; }
  cent = cent.map((c, i) => (acc2[i][2] ? [acc2[i][0] / acc2[i][2], acc2[i][1] / acc2[i][2]] : c));
}
// öndeki iki küme ön bacak, arkadaki iki küme arka bacak; x işaretine göre sol/sağ
cent.sort((a, b) => b[1] - a[1]);
const fr2 = cent.slice(0, 2).sort((a, b) => b[0] - a[0]), bk2 = cent.slice(2).sort((a, b) => b[0] - a[0]);
const paw = { fl: [fr2[0][0], H * 0.035, fr2[0][1]], fr: [fr2[1][0], H * 0.035, fr2[1][1]], bl: [bk2[0][0], H * 0.035, bk2[0][1]], br: [bk2[1][0], H * 0.035, bk2[1][1]] };
const zMid = (fr2[0][1] + fr2[1][1] + bk2[0][1] + bk2[1][1]) / 4;
console.log('yere değen köşe', low.length);
if (process.env.DUMP) { const g = {}; for (const p of P.filter((q) => q[1] < minY + H * 0.12)) { const k = Math.round(p[0] * 20) + ',' + Math.round(p[2] * 20); g[k] = Math.min(g[k] ?? 9, p[1]); } const xs = [...new Set(Object.keys(g).map((k) => +k.split(',')[0]))].sort((a, b) => a - b); for (let z = 10; z >= -14; z--) console.log(String(z / 20).padStart(6), xs.map((x) => { const v = g[x + ',' + z]; return v === undefined ? ' . ' : String(Math.round(v * 100)).padStart(3); }).join('')); console.log('x:', xs.map((x) => x / 20).join(' ')); }
// ── gövde alt yüzü: patilerin arasında, bacak sütunları dışında kalan en alçak yüzey ──
const legR = Math.max(0.03, Math.abs(paw.fl[0] - paw.fr[0]) * 0.32);
const nearLeg = (p) => Object.values(paw).some((q) => Math.hypot(p[0] - q[0], p[2] - q[2]) < legR * 1.6);
const zFront = (paw.fl[2] + paw.fr[2]) / 2, zBack = (paw.bl[2] + paw.br[2]) / 2;
// bacak sütunlarında köşelerin kesintisiz devam ettiği en yüksek nokta ≈ gövde alt yüzü
const bellyAt = (z) => { let best = 1e9; for (const p of P) if (Math.abs(p[2] - z) < 0.04 && Math.abs(p[0]) < legR * 1.2 && p[1] > H * 0.12) best = Math.min(best, p[1]); return best < 1e8 ? best : H * 0.4; };
const bellyF = bellyAt(zFront), bellyB = bellyAt(zBack);
// omurga yüksekliği: o z'deki sırt üstü ile karın arasının ortası
const backAt = (z) => { let top = -1e9; for (const p of P) if (Math.abs(p[2] - z) < 0.04 && Math.abs(p[0]) < 0.06) top = Math.max(top, p[1]); return top; };
const spineY = (z, belly) => (belly + backAt(z)) / 2;
const body = [0, spineY(zBack, bellyB), zBack + 0.02];
const chest = [0, spineY(zFront, bellyF), zFront - 0.02];
// ── baş: en öndeki köşelerin ağırlık merkezi civarı (burun ucundan geriye) ──
const zNose = mx[2];
const headPts = P.filter((p) => p[2] > zNose - Lz * 0.16 && p[1] > H * 0.35);
const headC = headPts.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / Math.max(1, headPts.length));
const head = [0, headC[1], zNose - Lz * 0.14];
const neck = [0, (chest[1] + head[1]) / 2 + 0.02, (chest[2] + head[2]) / 2];
const jaw = [0, head[1] - 0.05, head[2] + Lz * 0.06];
// ── kuyruk: kalçanın arkasındaki uzantı ──
const zTail0 = zBack - Lz * 0.12;
const tailPts = P.filter((p) => p[2] < zTail0);
const tailY = (z) => { const s = tailPts.filter((p) => Math.abs(p[2] - z) < 0.04); return s.length ? s.reduce((a, p) => a + p[1], 0) / s.length : body[1]; };
const tail1 = [0, tailY(zTail0), zTail0];
const zTail2 = zTail0 - (zTail0 - mn[2]) * 0.45;
const tail2 = [0, tailY(zTail2), zTail2];
// ── bacak eklemleri ──
const legs = {};
for (const k of ['fl', 'fr', 'bl', 'br']) {
  const p = paw[k], top = k[0] === 'f' ? bellyF : bellyB;
  const U = [p[0], top + 0.03, p[2] + (k[0] === 'f' ? 0.0 : 0.02)];
  const L = [p[0], p[1] + (U[1] - p[1]) * 0.45, p[2] + (k[0] === 'f' ? -0.015 : 0.02)];
  legs[k] = { U, L, P: p };
}
const J = { body, chest, neck, head, jaw, tail1, tail2 };
for (const k of Object.keys(legs)) { J[k + 'U'] = legs[k].U; J[k + 'L'] = legs[k].L; J[k + 'P'] = legs[k].P; }
const PARENT = { body: null, chest: 'body', neck: 'chest', head: 'neck', jaw: 'head', tail1: 'body', tail2: 'tail1', flU: 'chest', flL: 'flU', flP: 'flL', frU: 'chest', frL: 'frU', frP: 'frL', blU: 'body', blL: 'blU', blP: 'blL', brU: 'body', brL: 'brU', brP: 'brL' };
const NAMES = Object.keys(PARENT);
for (const n of NAMES) console.log(n.padEnd(6), J[n].map((v) => v.toFixed(3)).join(' '));

// ── kemik parçaları (deri ağırlığı için) ──
const END = { body: J.chest, chest: J.neck, neck: J.head, head: [0, J.head[1], J.head[2] + 0.06], jaw: [0, J.jaw[1] - 0.01, zNose], tail1: J.tail2, tail2: [0, tailY(mn[2] + 0.03), mn[2]], flU: J.flL, flL: J.flP, flP: [J.flP[0], 0, J.flP[2] + 0.04], frU: J.frL, frL: J.frP, frP: [J.frP[0], 0, J.frP[2] + 0.04], blU: J.blL, blL: J.blP, blP: [J.blP[0], 0, J.blP[2] + 0.04], brU: J.brL, brL: J.brP, brP: [J.brP[0], 0, J.brP[2] + 0.04] };
const segDist = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9; let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t); };
const JI = new Uint16Array(N * 4), JW = new Float32Array(N * 4);
for (let i = 0; i < N; i++) {
  const p = P[i];
  let cand;
  const belly = p[2] > (zFront + zBack) / 2 ? bellyF : bellyB;
  if (p[1] < belly - 0.02) {
    // bacak: x işaretine ve öne/arkaya göre tek bacak zinciri
    const k = (p[2] > (zFront + zBack) / 2 ? 'f' : 'b') + (p[0] >= 0 ? 'l' : 'r');
    cand = [k + 'U', k + 'L', k + 'P'];
  } else if (p[2] < zTail0 + 0.02) cand = ['tail1', 'tail2', 'body'];
  else if (p[2] > J.neck[2] - 0.02) cand = ['neck', 'head', 'jaw', 'chest'];
  else cand = ['body', 'chest', 'neck', 'flU', 'frU', 'blU', 'brU', 'tail1'];
  const d = cand.map((n) => [segDist(p, J[n], END[n]), n]).sort((a, b) => a[0] - b[0]);
  // en yakın iki kemik: yakına doğru keskinleşen yumuşak geçiş
  const [d0, n0] = d[0], [d1, n1] = d[1] ?? [1e9, n0];
  let w0 = 1 / Math.pow(d0 + 0.004, 4), w1 = 1 / Math.pow(d1 + 0.004, 4);
  if (n0 === 'jaw' && p[1] > J.jaw[1] + 0.01) { w0 = 0; } // üst çene kafaya bağlı
  const s = w0 + w1 || 1;
  JI[i * 4] = NAMES.indexOf(n0); JW[i * 4] = w0 / s;
  JI[i * 4 + 1] = NAMES.indexOf(n1); JW[i * 4 + 1] = w1 / s;
  if (JW[i * 4] === 0) { JW[i * 4] = 0; JW[i * 4 + 1] = 1; }
}

// ── çıktı belgesi: kemik düğümleri (yalnız öteleme), deri, ağ ──
const doc = new Document();
const buf = doc.createBuffer();
const scene = doc.createScene('fox');
const rootN = doc.createNode('fox_root');
scene.addChild(rootN);
const nodes = {};
for (const n of NAMES) {
  const par = PARENT[n];
  const t = par ? J[n].map((v, k) => v - J[par][k]) : J[n];
  nodes[n] = doc.createNode(n).setTranslation(t);
  (par ? nodes[par] : rootN).addChild(nodes[n]);
}
const ibm = new Float32Array(NAMES.length * 16);
NAMES.forEach((n, i) => { const m = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -J[n][0], -J[n][1], -J[n][2], 1]; ibm.set(m, i * 16); });
const skin = doc.createSkin('fox_skin').setSkeleton(nodes.body).setInverseBindMatrices(doc.createAccessor().setType('MAT4').setArray(ibm).setBuffer(buf));
for (const n of NAMES) skin.addJoint(nodes[n]);
const fpos = new Float32Array(N * 3), fnor = new Float32Array(N * 3), fuv = new Float32Array(N * 2);
for (let i = 0; i < N; i++) { fpos.set(P[i], i * 3); const n = NN[i]; const l = Math.hypot(...n) || 1; fnor.set([n[0] / l, n[1] / l, n[2] / l], i * 3); fuv.set(uvA.getElement(i, [0, 0]), i * 2); }
const acc = (arr, type) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const tex = sp.getMaterial().getBaseColorTexture();
const mat = doc.createMaterial('fur').setBaseColorTexture(doc.createTexture('fur').setImage(tex.getImage()).setMimeType(tex.getMimeType())).setRoughnessFactor(0.9).setMetallicFactor(0);
const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc(new Uint32Array(sp.getIndices().getArray()), 'SCALAR'))
  .setAttribute('POSITION', acc(fpos, 'VEC3')).setAttribute('NORMAL', acc(fnor, 'VEC3')).setAttribute('TEXCOORD_0', acc(fuv, 'VEC2'))
  .setAttribute('JOINTS_0', acc(JI, 'VEC4')).setAttribute('WEIGHTS_0', acc(JW, 'VEC4'));
const meshNode = doc.createNode('fox_mesh').setMesh(doc.createMesh('fox').addPrimitive(prim)).setSkin(skin);
rootN.addChild(meshNode);
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [1024, 1024], quality: 84 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outPath, doc);
console.log('yazıldı', outPath, (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB', 'köşe', N);
