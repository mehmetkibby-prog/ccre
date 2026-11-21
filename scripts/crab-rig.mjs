/**
 * Gelgit Yengeci: Meshy'de üretilen iskeletsiz yengeç modeline kendi iskeletini ve hazır kliplerini ekler.
 * Meshy'nin iskelet servisi yalnız iki ayaklıları desteklediği için kemikler geometriden çıkarılır:
 *   yere değen 8 köşe kümesi → bacak uçları (taraf başına 4), bacak üstü kabuk kenarının altında;
 *   ön bölgede kabuk kenarının altında kalan iki küme → kıskaçlar (kol + kıskaç).
 * Deri ağırlığı bölgeye göre: kabuk/karın → gövde; bacak sütunları → o bacağın iki kemiği (üstte gövdeye yumuşak geçiş);
 * kıskaçlar → kol/kıskaç. Kemiklerin dinlenme dönüşü birimdir: klipler doğrudan dünya eksenleriyle yazılır.
 * Klipler (oyundaki adlarla eşleşir): Idle, Walk, Attack Snap, Attack Claws, Death. Bacak kemiklerinin adları
 * "…leg/…foot" ile biter: vuruş sırasında yürürken alt gövde yürüyüşten gelir (charAnims bodyPart).
 *
 *   node scripts/crab-rig.mjs <crab_raw.glb> <çıktı.glb> [doku=1536]
 */
import fs from 'node:fs';
import { Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { textureCompress, meshopt, prune, dedup, weld, simplify } from '@gltf-transform/functions';
import { MeshoptEncoder, MeshoptDecoder, MeshoptSimplifier } from 'meshoptimizer';
import sharp from 'sharp';

const [inPath, outPath, texArg] = process.argv.slice(2);
if (!outPath) throw new Error('kullanım: node scripts/crab-rig.mjs <girdi.glb> <çıktı.glb> [doku]');
const TEX = Number(texArg ?? 1536);
const SQUASH_Z = 0.82; // Meshy kabuğu boyuna uzun çizmişti: yengece yakışır yuvarlaklık
await MeshoptEncoder.ready; await MeshoptDecoder.ready; await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder, 'meshopt.decoder': MeshoptDecoder });

const src = await io.read(inPath);
await src.transform(weld(), simplify({ simplifier: MeshoptSimplifier, ratio: 0.85, error: 0.0006 }));
const sp = src.getRoot().listMeshes()[0].listPrimitives()[0];
const pos = sp.getAttribute('POSITION'), nor = sp.getAttribute('NORMAL'), uvA = sp.getAttribute('TEXCOORD_0');
const N = pos.getCount();
const P = [], NN = [];
for (let i = 0; i < N; i++) {
  const p = pos.getElement(i, [0, 0, 0]), n = nor.getElement(i, [0, 0, 0]);
  P.push([p[0], p[1], p[2] * SQUASH_Z]);
  const nz = n[2] / SQUASH_Z, l = Math.hypot(n[0], n[1], nz) || 1; NN.push([n[0] / l, n[1] / l, nz / l]);
}
let minY = Infinity, maxY = -Infinity, maxZ = -Infinity;
for (const p of P) { minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); maxZ = Math.max(maxZ, p[2]); }
for (const p of P) p[1] -= minY;
const H = maxY - minY;
console.log('boy', H.toFixed(3), 'köşe', N);

// ── yere değen kümeler (ızgara bağlantılı) ──
function clusters(pts, cell) {
  const g = new Map();
  for (const q of pts) { const k = Math.floor(q[0] / cell) + ',' + Math.floor(q[2] / cell); (g.get(k) ?? g.set(k, []).get(k)).push(q); }
  const seen = new Set(), out = [];
  for (const k of g.keys()) {
    if (seen.has(k)) continue;
    const st = [k], c = []; seen.add(k);
    while (st.length) { const kk = st.pop(); c.push(...g.get(kk)); const [x, z] = kk.split(',').map(Number); for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) { const nk = (x + dx) + ',' + (z + dz); if (g.has(nk) && !seen.has(nk)) { seen.add(nk); st.push(nk); } } }
    const m = [0, 0, 0]; for (const q of c) { m[0] += q[0]; m[1] += q[1]; m[2] += q[2]; }
    out.push({ n: c.length, c: m.map((v) => v / c.length) });
  }
  return out;
}
const tips = clusters(P.filter((p) => p[1] < H * 0.055), 0.02).filter((c) => c.n >= 6).sort((a, b) => b.n - a.n).slice(0, 8);
if (tips.length !== 8) throw new Error('8 bacak ucu bulunamadı: ' + tips.length);
const RIM = H * 0.45; // kabuk kenarı (bacak üstü)
const legs = [];
for (const side of ['L', 'R']) {
  const s = tips.filter((t) => (side === 'L' ? t.c[0] > 0 : t.c[0] < 0)).sort((a, b) => b.c[2] - a.c[2]); // önden arkaya
  s.forEach((t, i) => {
    const tip = [t.c[0], 0, t.c[2]];
    const hip = [t.c[0] * 0.8, RIM, t.c[2] * 0.92];
    const knee = [t.c[0] * 0.97, H * 0.24, t.c[2]];
    legs.push({ name: side + (i + 1), side, i, hip, knee, tip });
  });
}
const frontLegZ = Math.max(...legs.map((l) => l.tip[2]));
// ── kıskaçlar: ön bacakların önünde, kabuk kenarının altında ──
const clawPts = P.filter((p) => p[2] > frontLegZ + 0.02 && p[1] < RIM * 1.05);
const claws = {};
for (const side of ['L', 'R']) {
  const s = clawPts.filter((p) => (side === 'L' ? p[0] > 0 : p[0] < 0));
  const zmin = Math.min(...s.map((p) => p[2])), zmax = Math.max(...s.map((p) => p[2]));
  const mean = (arr) => arr.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]).map((v) => v / Math.max(1, arr.length));
  const back = mean(s.filter((p) => p[2] < zmin + (zmax - zmin) * 0.3));
  const tipC = mean(s.filter((p) => p[2] > zmax - (zmax - zmin) * 0.25));
  const shoulder = [back[0] * 0.8, Math.max(back[1], RIM * 0.8), zmin - 0.01];
  const wrist = [(back[0] + tipC[0]) / 2, (shoulder[1] + tipC[1]) / 2, zmin + (zmax - zmin) * 0.45];
  claws[side] = { shoulder, wrist, tip: [tipC[0], tipC[1], zmax], zmin, zmax };
}
const body = [0, H * 0.52, 0];

// ── kemikler ──
const J = { body };
const PARENT = { body: null };
for (const s of ['L', 'R']) {
  J['claw' + s] = claws[s].shoulder; PARENT['claw' + s] = 'body';
  J['pincer' + s] = claws[s].wrist; PARENT['pincer' + s] = 'claw' + s;
}
for (const l of legs) { J[l.name + '_leg'] = l.hip; PARENT[l.name + '_leg'] = 'body'; J[l.name + '_foot'] = l.knee; PARENT[l.name + '_foot'] = l.name + '_leg'; }
const NAMES = Object.keys(PARENT);
for (const n of NAMES) console.log(n.padEnd(9), J[n].map((v) => v.toFixed(3)).join(' '));
const END = { body: [0, H * 0.52, 0.01] };
for (const s of ['L', 'R']) { END['claw' + s] = claws[s].wrist; END['pincer' + s] = claws[s].tip; }
for (const l of legs) { END[l.name + '_leg'] = l.knee; END[l.name + '_foot'] = l.tip; }

const segDist = (p, a, b) => { const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]]; const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2 || 1e-9; let t = ((p[0] - a[0]) * ab[0] + (p[1] - a[1]) * ab[1] + (p[2] - a[2]) * ab[2]) / l2; t = Math.max(0, Math.min(1, t)); return Math.hypot(p[0] - a[0] - ab[0] * t, p[1] - a[1] - ab[1] * t, p[2] - a[2] - ab[2] * t); };
const sm = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const JI = new Uint16Array(N * 4), JW = new Float32Array(N * 4);
const legR = 0.09;
let nBody = 0, nLeg = 0, nClaw = 0;
for (let i = 0; i < N; i++) {
  const p = P[i];
  const w = new Map();
  const add = (n, v) => { if (v > 0) w.set(n, (w.get(n) ?? 0) + v); };
  const side = p[0] >= 0 ? 'L' : 'R';
  // kıskaç bölgesi
  // kıskaç bölgesi: kıskaç zincirine (omuz→bilek→uç) en yakın taraf; iki kıskacın uçları ortada birbirine yakın
  const cd = (s2) => Math.min(segDist(p, claws[s2].shoulder, claws[s2].wrist), segDist(p, claws[s2].wrist, claws[s2].tip));
  const cs = cd('L') < cd('R') ? 'L' : 'R';
  const mouth = Math.abs(p[0]) < 0.07 && p[1] > H * 0.3; // kabuk önünün altındaki ağız/göz bölgesi gövdede kalır
  if (p[2] > frontLegZ + 0.02 && p[1] < RIM * 1.05 && !mouth) {
    const c = claws[cs];
    const t = sm(c.zmin + (c.zmax - c.zmin) * 0.3, c.zmin + (c.zmax - c.zmin) * 0.5, p[2]); // kola mı kıskaca mı
    const toBody = 1 - sm(c.zmin - 0.01, c.zmin + 0.05, p[2]);
    add('body', toBody); add('claw' + cs, (1 - toBody) * (1 - t)); add('pincer' + cs, (1 - toBody) * t); nClaw++;
  } else {
    // en yakın bacak (aynı tarafta); bacak sütununun içindeyse bacağa
    let best = null, bd = Infinity;
    for (const l of legs) { if (l.side !== side) continue; const d = Math.min(segDist(p, l.hip, l.knee), segDist(p, l.knee, l.tip)); if (d < bd) { bd = d; best = l; } }
    const inLeg = best && bd < legR && p[1] < RIM + 0.02;
    if (!inLeg) { add('body', 1); nBody++; }
    else {
      const toBody = sm(RIM - 0.07, RIM + 0.01, p[1]); // bacak tepesi kabuğa yumuşak bağlanır
      const lower = 1 - sm(best.knee[1] - 0.03, best.knee[1] + 0.03, p[1]);
      add('body', toBody); add(best.name + '_leg', (1 - toBody) * (1 - lower)); add(best.name + '_foot', (1 - toBody) * lower); nLeg++;
    }
  }
  const e = [...w.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const sum = e.reduce((a, x) => a + x[1], 0) || 1;
  e.forEach(([n, v], k) => { JI[i * 4 + k] = NAMES.indexOf(n); JW[i * 4 + k] = v / sum; });
}
console.log('köşe: gövde', nBody, 'bacak', nLeg, 'kıskaç', nClaw);

// ── klipler (30 kare/sn) ──
const FPS = 30;
const qFromEuler = (x, y, z) => { // XYZ sırası
  const c1 = Math.cos(x / 2), c2 = Math.cos(y / 2), c3 = Math.cos(z / 2), s1 = Math.sin(x / 2), s2 = Math.sin(y / 2), s3 = Math.sin(z / 2);
  return [s1 * c2 * c3 + c1 * s2 * s3, c1 * s2 * c3 - s1 * c2 * s3, c1 * c2 * s3 + s1 * s2 * c3, c1 * c2 * c3 - s1 * s2 * s3];
};
const ease = (x) => x * x * (3 - 2 * x);
const seg = (t, a, b) => Math.max(0, Math.min(1, (t - a) / (b - a)));
const sideSign = (s) => (s === 'L' ? 1 : -1);
/** Kare başına poz: { kemik: [rx, ry, rz] }, bodyPos: [dx, dy, dz] (dinlenmeye göre). */
const CLIPS = {
  Idle: {
    dur: 3.0, loop: true,
    pose(t) {
      const ph = (t / 3.0) * Math.PI * 2, r = {};
      r.body = [Math.sin(ph) * 0.025, Math.sin(ph) * 0.03, Math.sin(ph * 2) * 0.012];
      for (const s of ['L', 'R']) {
        const k = sideSign(s), o = s === 'L' ? 0 : 1.3;
        r['claw' + s] = [-0.12 + Math.sin(ph + o) * 0.08, k * Math.sin(ph * 2 + o) * 0.05, 0];
        const snap = Math.max(0, Math.sin(ph * 2 + o * 2)) ** 8; // ara ara kıskaç kapanır
        r['pincer' + s] = [-0.05 - snap * 0.25, -k * snap * 0.2, 0];
      }
      for (const l of legs) { const k = sideSign(l.side); const sh = Math.max(0, Math.sin(ph * 2 + l.i * 1.7 + (l.side === 'L' ? 0 : 2.1))) ** 6; r[l.name + '_leg'] = [0, 0, k * sh * 0.18]; r[l.name + '_foot'] = [0, 0, -k * sh * 0.22]; }
      return { r, pos: [0, Math.sin(ph) * 0.006, 0] };
    },
  },
  Walk: {
    dur: 0.8, loop: true,
    pose(t) {
      const ph = (t / 0.8) * Math.PI * 2, r = {};
      for (const l of legs) {
        const g = ((l.i + (l.side === 'L' ? 0 : 1)) % 2) * Math.PI; // çapraz iki takım
        const a = ph + g, lift = Math.max(0, Math.sin(a)), k = sideSign(l.side);
        r[l.name + '_leg'] = [0.45 * Math.cos(a), 0, k * (0.06 + lift * 0.5)];
        r[l.name + '_foot'] = [0, 0, -k * lift * 0.55];
      }
      r.body = [0.03, Math.sin(ph) * 0.05, Math.sin(ph * 2) * 0.035];
      for (const s of ['L', 'R']) { const k = sideSign(s); r['claw' + s] = [-0.22 + Math.sin(ph * 2 + (s === 'L' ? 0 : 1.5)) * 0.06, k * 0.06, 0]; r['pincer' + s] = [-0.08, 0, 0]; }
      return { r, pos: [0, Math.abs(Math.sin(ph * 2)) * 0.012, 0] };
    },
  },
  // iki kıskaç birden kalkar ve öne çakılır
  'Attack Claws': {
    dur: 1.1, loop: false,
    pose(t) {
      const up = ease(seg(t, 0, 0.42)), hit = ease(seg(t, 0.42, 0.56)), back = ease(seg(t, 0.62, 1.1));
      const raise = up * (1 - hit), slam = hit * (1 - back);
      const r = {};
      r.body = [-0.22 * raise + 0.16 * slam, 0, 0];
      for (const s of ['L', 'R']) {
        const k = sideSign(s);
        r['claw' + s] = [-0.78 * raise + 0.4 * slam, k * 0.5 * raise - k * 0.12 * slam, k * 0.28 * raise];
        r['pincer' + s] = [-0.5 * raise + 0.25 * slam, -k * 0.35 * slam, 0];
      }
      for (const l of legs) { const k = sideSign(l.side); r[l.name + '_leg'] = [l.i < 2 ? -0.1 * slam : 0.12 * raise, 0, k * (0.1 * raise)]; }
      return { r, pos: [0, 0.03 * raise - 0.01 * slam, -0.03 * raise + 0.07 * slam] };
    },
  },
  // tek kıskaçla sağ-sol hızlı çimdik
  'Attack Snap': {
    dur: 1.0, loop: false,
    pose(t) {
      const r = {};
      const jab = (a, b, c) => ease(seg(t, a, b)) * (1 - ease(seg(t, b + 0.08, c)));
      const jl = jab(0.05, 0.3, 0.55), jr = jab(0.4, 0.62, 0.95);
      r.body = [0.08 * (jl + jr), 0.18 * jl - 0.18 * jr, 0];
      r.clawL = [-0.55 * jl + 0.15 * jr, 0.45 * jl, 0];
      r.clawR = [-0.55 * jr + 0.15 * jl, -0.45 * jr, 0];
      const snapL = ease(seg(t, 0.22, 0.32)) * (1 - ease(seg(t, 0.4, 0.55))), snapR = ease(seg(t, 0.55, 0.65)) * (1 - ease(seg(t, 0.72, 0.9)));
      r.pincerL = [-0.3 * jl + 0.2 * snapL, -0.4 * snapL, 0];
      r.pincerR = [-0.3 * jr + 0.2 * snapR, 0.4 * snapR, 0];
      for (const l of legs) { const k = sideSign(l.side); r[l.name + '_leg'] = [0, 0, k * 0.05 * (jl + jr)]; }
      return { r, pos: [0, 0, 0.05 * (jl + jr)] };
    },
  },
  Death: {
    dur: 1.6, loop: false,
    pose(t) {
      const rear = ease(seg(t, 0, 0.35)) * (1 - ease(seg(t, 0.35, 0.7)));
      const fall = ease(seg(t, 0.35, 0.85)), curl = ease(seg(t, 0.6, 1.4));
      const r = {};
      r.body = [-0.35 * rear + 0.08 * fall, 0, 0.22 * fall];
      for (const s of ['L', 'R']) {
        const k = sideSign(s);
        r['claw' + s] = [-0.9 * rear + 0.35 * fall, k * 0.4 * fall, k * 0.2 * rear];
        r['pincer' + s] = [0.3 * fall, -k * 0.3 * curl, 0];
      }
      for (const l of legs) {
        const k = sideSign(l.side), j = Math.sin(t * 22 + l.i * 2) * 0.12 * rear; // ölüm çırpınması
        r[l.name + '_leg'] = [j, 0, k * (0.15 * rear + 0.75 * fall - 0.35 * curl)];
        r[l.name + '_foot'] = [0, 0, -k * (1.25 * curl)];
      }
      return { r, pos: [0, 0.04 * rear - H * 0.3 * fall, 0] };
    },
  },
};

// ── çıktı belgesi ──
const doc = new Document();
const buf = doc.createBuffer();
const scene = doc.createScene('crab');
const rootN = doc.createNode('crab_root');
scene.addChild(rootN);
const nodes = {};
for (const n of NAMES) {
  const par = PARENT[n];
  const t = par ? J[n].map((v, k) => v - J[par][k]) : J[n];
  nodes[n] = doc.createNode(n).setTranslation(t);
  (par ? nodes[par] : rootN).addChild(nodes[n]);
}
const ibm = new Float32Array(NAMES.length * 16);
NAMES.forEach((n, i) => { ibm.set([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, -J[n][0], -J[n][1], -J[n][2], 1], i * 16); });
const acc = (arr, type) => doc.createAccessor().setType(type).setArray(arr).setBuffer(buf);
const skin = doc.createSkin('crab_skin').setSkeleton(nodes.body).setInverseBindMatrices(acc(ibm, 'MAT4'));
for (const n of NAMES) skin.addJoint(nodes[n]);
const fpos = new Float32Array(N * 3), fnor = new Float32Array(N * 3), fuv = new Float32Array(N * 2);
for (let i = 0; i < N; i++) { fpos.set(P[i], i * 3); fnor.set(NN[i], i * 3); fuv.set(uvA.getElement(i, [0, 0]), i * 2); }
const tex = sp.getMaterial().getBaseColorTexture();
const mat = doc.createMaterial('shell').setBaseColorTexture(doc.createTexture('shell').setImage(tex.getImage()).setMimeType(tex.getMimeType())).setRoughnessFactor(0.62).setMetallicFactor(0);
const prim = doc.createPrimitive().setMaterial(mat).setIndices(acc(new Uint32Array(sp.getIndices().getArray()), 'SCALAR'))
  .setAttribute('POSITION', acc(fpos, 'VEC3')).setAttribute('NORMAL', acc(fnor, 'VEC3')).setAttribute('TEXCOORD_0', acc(fuv, 'VEC2'))
  .setAttribute('JOINTS_0', acc(JI, 'VEC4')).setAttribute('WEIGHTS_0', acc(JW, 'VEC4'));
rootN.addChild(doc.createNode('crab_mesh').setMesh(doc.createMesh('crab').addPrimitive(prim)).setSkin(skin));

for (const [name, c] of Object.entries(CLIPS)) {
  const n = Math.round(c.dur * FPS) + 1;
  const times = new Float32Array(n);
  const rot = Object.fromEntries(NAMES.map((b) => [b, new Float32Array(n * 4)]));
  const bpos = new Float32Array(n * 3);
  for (let f = 0; f < n; f++) {
    const t = Math.min(c.dur, f / FPS); times[f] = t;
    const { r, pos: dp } = c.pose(c.loop && f === n - 1 ? 0 : t); // döngü: son kare ilkle aynı
    for (const b of NAMES) rot[b].set(qFromEuler(...(r[b] ?? [0, 0, 0])), f * 4);
    bpos.set([J.body[0] + dp[0], J.body[1] + dp[1], J.body[2] + dp[2]], f * 3);
  }
  const anim = doc.createAnimation(name);
  const input = acc(times, 'SCALAR');
  for (const b of NAMES) {
    const s = doc.createAnimationSampler().setInput(input).setOutput(acc(rot[b], 'VEC4')).setInterpolation('LINEAR');
    anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes[b]).setTargetPath('rotation').setSampler(s));
  }
  const s = doc.createAnimationSampler().setInput(input).setOutput(acc(bpos, 'VEC3')).setInterpolation('LINEAR');
  anim.addSampler(s).addChannel(doc.createAnimationChannel().setTargetNode(nodes.body).setTargetPath('translation').setSampler(s));
}

await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [TEX, TEX], quality: 84 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
await io.write(outPath, doc);
console.log('yazıldı', outPath, (fs.statSync(outPath).size / 1024).toFixed(0) + ' KB');
