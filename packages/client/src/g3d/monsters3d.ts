import * as THREE from 'three';
import { at, cyl, lathe } from './geom.ts';
import { fbm } from './textures.ts';
import { model as loadModel } from './models.ts';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { templateFromPieces, instantiate, seg, sph, BONES, WORLD, animateHumanoid, type Piece, type BoneDef, type Rig, type HState } from './humanoid.ts';

/** Ortak canavar arayüzü: render katmanı yalnız bunu bilir. */
export interface MonsterRig { root: THREE.Object3D; height: number; update(st: HState, t: number, k: number, phase: number): void }

const EYE = [0xffd860, 0xff8a20, 0xff2020];
const V3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);

// ───────────── dört ayaklı (kurt, vaşak) ─────────────
const QB: BoneDef[] = [
  ['body', null, 0, 0.56, -0.05], ['chest', 'body', 0, 0.04, 0.4], ['neck', 'chest', 0, 0.1, 0.17], ['head', 'neck', 0, 0.06, 0.15], ['jaw', 'head', 0, -0.06, 0.07],
  ['tail1', 'body', 0, 0.06, -0.44], ['tail2', 'tail1', 0, -0.06, -0.22],
  ['flU', 'chest', 0.12, -0.08, 0.04], ['flL', 'flU', 0, -0.24, 0], ['flP', 'flL', 0, -0.22, 0],
  ['frU', 'chest', -0.12, -0.08, 0.04], ['frL', 'frU', 0, -0.24, 0], ['frP', 'frL', 0, -0.22, 0],
  ['blU', 'body', 0.13, -0.03, -0.32], ['blL', 'blU', 0, -0.25, -0.04], ['blP', 'blL', 0, -0.22, 0.03],
  ['brU', 'body', -0.13, -0.03, -0.32], ['brL', 'brU', 0, -0.25, -0.04], ['brP', 'brL', 0, -0.22, 0.03],
];
const QW: Record<string, THREE.Vector3> = {};
for (const [n, p, x, y, z] of QB) QW[n] = V3(x, y, z).add(p ? QW[p] : V3(0, 0, 0));

function furColor(top: number, belly: number, seed: number) {
  const a = new THREE.Color(top), b = new THREE.Color(belly);
  return (p: THREE.Vector3, n: THREE.Vector3) => {
    const k = THREE.MathUtils.clamp(-n.y * 1.1 - 0.15, 0, 1);
    const c = a.clone().lerp(b, k);
    const v = 0.82 + fbm(p.x * 3 + 5, p.z * 3 + p.y * 2, 2, 3, seed) * 0.36;
    return c.multiplyScalar(v);
  };
}

function quadPieces(kind: 'wolf' | 'lynx', variant: number): Piece[] {
  const P: Piece[] = [];
  const wolf = kind === 'wolf';
  const top = wolf ? [0x5a5e68, 0x5a4234, 0x2a2430][variant] : [0xd8c8b0, 0xc0a888, 0x8a7a9a][variant];
  const fur = furColor(top, wolf ? 0xa8a098 : 0xf4f0ea, 7 + variant);
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'] = fur, glow = false) => P.push({ g, bone, color, glow });
  const b = QW.body, c = QW.chest;
  add(sph(0.22, b.x, b.y + 0.02, b.z - 0.04, 0.95, 0.92, 1.75), 'body');
  add(sph(0.25, c.x, c.y + 0.02, c.z - 0.08, 0.98, 1.08, 1.1), 'chest'); // göğüs yelesi
  if (wolf) for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI - Math.PI / 2; add(at(new THREE.ConeGeometry(0.05, 0.16, 5), Math.sin(a) * 0.18, c.y + 0.12 + Math.cos(a) * 0.06, c.z + 0.04, 0.9, 0, Math.sin(a) * 0.5), 'chest'); }
  add(seg(c.clone().add(V3(0, 0.04, 0.0)), QW.head.clone().add(V3(0, -0.02, -0.03)), 0.15, 0.11), 'neck');
  const h = QW.head;
  add(sph(0.125, h.x, h.y + 0.02, h.z, 1.05, 0.92, 1.12), 'head');
  // burun/ağız
  add(seg(h.clone().add(V3(0, -0.005, 0.05)), h.clone().add(V3(0, -0.025, wolf ? 0.26 : 0.15)), 0.08, wolf ? 0.042 : 0.055), 'head');
  add(sph(0.026, h.x, h.y - 0.01, h.z + (wolf ? 0.265 : 0.155)), 'head', 0x1a1414);
  add(seg(h.clone().add(V3(0, -0.06, 0.04)), h.clone().add(V3(0, -0.06, wolf ? 0.23 : 0.13)), 0.05, 0.03), 'jaw', 0x8a7a70);
  for (const s of [1, -1]) {
    add(at(new THREE.ConeGeometry(0.045, wolf ? 0.12 : 0.11, 4), s * 0.065, h.y + 0.12, h.z - 0.02, -0.15, 0, s * -0.25), 'head');
    if (!wolf) add(at(new THREE.ConeGeometry(0.008, 0.07, 4), s * 0.075, h.y + 0.2, h.z - 0.03), 'head', 0x1a1414);
    add(sph(0.018, s * 0.055, h.y + 0.04, h.z + 0.085, 1, 0.8, 0.6), 'head', EYE[variant], true);
  }
  // kuyruk
  add(seg(QW.tail1, QW.tail2, 0.075, 0.085), 'tail1');
  add(seg(QW.tail2, QW.tail2.clone().add(V3(0, -0.04, -0.26)), 0.085, 0.025), 'tail2', wolf ? fur : 0x2a2420);
  // bacaklar
  for (const L of ['fl', 'fr', 'bl', 'br']) {
    const u = QW[L + 'U'], l = QW[L + 'L'], p = QW[L + 'P'];
    add(seg(u.clone().add(V3(0, 0.08, 0)), l, L[0] === 'b' ? 0.11 : 0.088, 0.055), L + 'U');
    add(seg(l, p, 0.05, 0.038), L + 'L');
    add(sph(0.05, p.x, p.y - 0.01, p.z + 0.03, 1, 0.6, 1.4), L + 'P', 0x2a2420);
  }
  if (!wolf) for (let i = 0; i < 6; i++) add(sph(0.03, ((i * 37) % 7 - 3) * 0.04, b.y + 0.15, b.z + ((i * 53) % 9 - 4) * 0.06, 1, 0.3, 1), 'body', 0x4a3a30);
  return P;
}

/**
 * Yabani tilki: kurt iskeleti üzerine ince, alçak gövde; kızıl turuncu post, beyaz göğüs/yanak/kuyruk ucu,
 * siyah uçlu iri kulaklar, siyah "çorap" bacaklar, uzun sivri burun ve gür kuyruk.
 * Varyantlar: kızıl (normal), koyu pas (agresif), gümüş-kara (katil).
 */
function foxPieces(variant: number): Piece[] {
  const P: Piece[] = [];
  const top = new THREE.Color([0xd9611c, 0xa83c16, 0x7a7a86][variant]);
  const saddle = new THREE.Color([0xa8400e, 0x6a200a, 0x3a3a46][variant]);
  const cream = new THREE.Color([0xf6ece0, 0xe8dccc, 0xe8eaf0][variant]);
  const sock = [0x241510, 0x1a0e0a, 0x101014][variant];
  const white = cream.getHex();
  // post: sırtta koyu kızıl "eyer", böğürde turuncu, karında krem; ince tüy dalgalanması
  const coat = (p: THREE.Vector3, n: THREE.Vector3) => {
    const c = top.clone();
    c.lerp(saddle, THREE.MathUtils.clamp((n.y - 0.35) * 1.6, 0, 1));
    c.lerp(cream, THREE.MathUtils.clamp((-n.y - 0.2) * 1.7, 0, 1));
    return c.multiplyScalar(0.9 + fbm(p.x * 9 + 3, p.z * 7 + p.y * 9, 2, 3, 17 + variant) * 0.22);
  };
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'] = coat, glow = false) => P.push({ g, bone, color, glow });
  /** Z ekseni boyunca uzanan döndürme yüzeyi (profil: [yarıçap, boy]); w = genişlik, hgt = yükseklik çarpanı. */
  const along = (prof: [number, number][], x: number, y: number, z: number, w: number, hgt: number) => at(lathe(prof, 18, 0.5), x, y, z, Math.PI / 2, 0, 0, w, 1, hgt);
  const S = 14; // boru kenar sayısı
  const b = QW.body, c = QW.chest, h = QW.head;

  // gövde: yuvarlak kalça → ince bel → derin göğüs (kısa, atletik)
  add(along([[0, -0.37], [0.075, -0.355], [0.13, -0.3], [0.145, -0.22], [0.13, -0.11], [0.112, 0.0], [0.108, 0.1], [0.12, 0.2], [0.09, 0.28], [0, 0.3]], b.x, b.y + 0.035, b.z, 0.82, 1.08), 'body');
  add(along([[0, -0.32], [0.095, -0.3], [0.118, -0.2], [0.145, -0.07], [0.155, 0.02], [0.135, 0.1], [0.07, 0.155], [0, 0.17]], c.x, c.y - 0.03, c.z - 0.06, 0.84, 1.3), 'chest');
  // beyaz göğüs önlüğü ve aşağı sarkan yele perçemleri
  add(sph(0.105, c.x, c.y - 0.07, c.z + 0.07, 0.85, 1.25, 0.7), 'chest', white);
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * 0.034;
    add(at(new THREE.ConeGeometry(0.03, 0.13 - Math.abs(i - 2) * 0.02, 5), x, c.y - 0.17, c.z + 0.06, -0.25, 0, Math.PI + x * 2.5), 'chest', white);
  }
  // boyun
  add(seg(c.clone().add(V3(0, 0.03, 0.04)), h.clone().add(V3(0, -0.035, -0.05)), 0.115, 0.08, S), 'neck');
  add(seg(c.clone().add(V3(0, -0.02, 0.09)), h.clone().add(V3(0, -0.07, 0.0)), 0.07, 0.055, S), 'neck', white);

  // kafa: üçgen kafatası, yana taşan beyaz yanak perçemleri
  add(sph(0.095, h.x, h.y + 0.02, h.z - 0.01, 1.18, 0.86, 1.05, 18, 12), 'head');
  add(sph(0.07, h.x, h.y + 0.055, h.z + 0.03, 1.0, 0.6, 1.0), 'head'); // alın
  for (const s2 of [1, -1]) {
    add(at(new THREE.ConeGeometry(0.048, 0.13, 6), s2 * 0.09, h.y - 0.03, h.z - 0.005, 0, s2 * 0.5, -s2 * (Math.PI / 2 + 0.25)), 'head', white);
    add(sph(0.055, s2 * 0.055, h.y - 0.035, h.z + 0.035, 1, 0.75, 1.1), 'head', white);
  }
  // sivri burun: üstü kızıl, altı beyaz; siyah burun ucu
  add(seg(h.clone().add(V3(0, -0.008, 0.05)), h.clone().add(V3(0, -0.045, 0.265)), 0.058, 0.017, S), 'head');
  add(seg(h.clone().add(V3(0, -0.05, 0.05)), h.clone().add(V3(0, -0.062, 0.225)), 0.043, 0.013, S), 'jaw', white);
  add(sph(0.021, h.x, h.y - 0.043, h.z + 0.272, 1.1, 0.85, 1), 'head', 0x120c0a);
  for (const s2 of [1, -1]) {
    // gözden buruna inen koyu "gözyaşı" çizgisi
    add(seg(h.clone().add(V3(s2 * 0.043, 0.012, 0.095)), h.clone().add(V3(s2 * 0.02, -0.035, 0.19)), 0.007, 0.005, 6), 'head', 0x3a1a10);
    // badem gözler
    add(sph(0.017, s2 * 0.046, h.y + 0.026, h.z + 0.089, 1.4, 0.68, 0.6), 'head', EYE[variant], true);
    // iri üçgen kulaklar: yassı, ucu ve arkası koyu, içi krem
    const ex = s2 * 0.06, ey = h.y + 0.125, ez = h.z - 0.035;
    add(at(new THREE.ConeGeometry(0.062, 0.17, 3), ex, ey, ez, -0.18, 0, -s2 * 0.24, 1, 1, 0.42), 'head');
    add(at(new THREE.ConeGeometry(0.03, 0.07, 3), ex - s2 * 0.018, ey + 0.065, ez - 0.012, -0.18, 0, -s2 * 0.24, 1, 1, 0.5), 'head', sock);
    add(at(new THREE.ConeGeometry(0.04, 0.11, 3), ex, ey - 0.01, ez + 0.012, -0.18, 0, -s2 * 0.24, 1, 1, 0.2), 'head', 0xf0d2c0);
  }

  // gür kuyruk: tek parça, ortası şişkin, tutam tutam kabarık; kızıldan beyaz uca geçiş
  {
    const L = 0.7;
    const g = lathe([[0.035, 0], [0.07, 0.05], [0.105, 0.14], [0.13, 0.28], [0.138, 0.4], [0.122, 0.53], [0.075, 0.63], [0.02, 0.69], [0, L]], 22, 0.4);
    const pa = g.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pa.count; i++) {
      const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i);
      const a = Math.atan2(z, x), k = 1 + 0.09 * Math.sin(a * 7 + y * 26) * Math.min(1, y * 6) + 0.05 * Math.sin(a * 13 - y * 40);
      pa.setXYZ(i, x * k, y, z * k * 0.92);
    }
    g.computeVertexNormals();
    const base = QW.tail1.clone().add(V3(0, 0.03, 0.08));
    const dir = V3(0, -0.22, -1).normalize();
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir));
    g.translate(base.x, base.y, base.z);
    const tipStart = base.z + dir.z * L * 0.74;
    add(g, 'tail1', (p, n) => (p.z < tipStart ? cream.clone().multiplyScalar(0.94 + fbm(p.x * 20, p.y * 20, 2, 3, 5) * 0.12) : coat(p, n)));
  }

  // bacaklar: ince, alt yarısı siyah "çorap"; arka bacaklarda dolgun kalça
  for (const L of ['fl', 'fr', 'bl', 'br']) {
    const u = QW[L + 'U'], l = QW[L + 'L'], p = QW[L + 'P'];
    const back = L[0] === 'b';
    if (back) add(sph(0.085, u.x * 0.85, u.y + 0.03, u.z + 0.03, 0.6, 1.1, 1.2), L + 'U');
    add(seg(u.clone().add(V3(0, 0.05, 0)), l, back ? 0.066 : 0.048, 0.034, S), L + 'U', back ? coat : (pp: THREE.Vector3, n: THREE.Vector3) => (pp.y < u.y - 0.12 ? new THREE.Color(sock) : coat(pp, n)));
    add(sph(0.033, l.x, l.y, l.z, 1), L + 'L', sock);
    add(seg(l, p, 0.03, 0.023, S), L + 'L', sock);
    add(sph(0.036, p.x, p.y - 0.012, p.z + 0.028, 1, 0.55, 1.45), L + 'P', sock);
  }
  return P;
}

function quadAnimate(bones: Record<string, THREE.Bone>, body: THREE.Object3D, st: HState, t: number, k: number, phase: number) {
  for (const b of Object.values(bones)) b.rotation.set(0, 0, 0);
  body.rotation.set(0, 0, 0); body.position.set(0, 0, 0);
  bones.body.position.y = QB[0][3];
  bones.tail1.rotation.x = 0.5; bones.tail1.rotation.y = Math.sin(t * 3) * 0.3; bones.tail2.rotation.x = -0.3;
  bones.neck.rotation.x = -0.1 + Math.sin(t * 1.4) * 0.04;
  if (st === 'walk') {
    const s = Math.sin(phase);
    bones.flU.rotation.x = -s * 0.7; bones.brU.rotation.x = -s * 0.6;
    bones.frU.rotation.x = s * 0.7; bones.blU.rotation.x = s * 0.6;
    bones.flL.rotation.x = Math.max(0, s) * 0.8; bones.frL.rotation.x = Math.max(0, -s) * 0.8;
    bones.blL.rotation.x = -Math.max(0, -s) * 0.7; bones.brL.rotation.x = -Math.max(0, s) * 0.7;
    bones.body.position.y = QB[0][3] + Math.abs(Math.cos(phase)) * 0.04;
    bones.body.rotation.x = s * 0.05;
    bones.tail1.rotation.y = Math.sin(phase) * 0.4;
  }
  if (st === 'attack') {
    const p = Math.sin(Math.min(1, k) * Math.PI);
    body.position.z = p * 0.35;
    bones.chest.rotation.x = 0.2 * p; bones.neck.rotation.x = 0.35 * p; bones.jaw.rotation.x = 0.6 * p;
    bones.flU.rotation.x = -0.9 * p; bones.frU.rotation.x = -0.9 * p; bones.blU.rotation.x = 0.4 * p; bones.brU.rotation.x = 0.4 * p;
  }
  if (st === 'hurt') { bones.neck.rotation.x = -0.4; }
  if (st === 'dead') { const p = Math.min(1, k * 1.5); body.rotation.z = (Math.PI / 2) * p; body.position.y = 0.15 * p; bones.neck.rotation.x = 0.3; }
}

// ───────────── insan iskeletli yaratıklar ─────────────
function treantPieces(variant: number): Piece[] {
  const W = WORLD;
  const P: Piece[] = [];
  const bark = (p: THREE.Vector3) => new THREE.Color([0xb89a78, 0xa08060, 0x806058][variant]).multiplyScalar(0.85 + fbm(p.x * 4 + 3, p.y * 2, 2, 3, 41) * 0.5);
  const moss = (p: THREE.Vector3) => new THREE.Color(variant === 2 ? 0x4a5a2a : 0x5a7a2a).multiplyScalar(0.7 + fbm(p.x * 6, p.z * 6, 2, 3, 42) * 0.6);
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'] = bark, glow = false) => P.push({ g, bone, color, glow });
  const hip = W.hips;
  add(at(lathe([[0.26, 0], [0.3, 0.2], [0.32, 0.5], [0.3, 0.7], [0.24, 0.8], [0, 0.85]], 12, 0.5), 0, hip.y - 0.1, 0, 0, 0, 0, 1.2, 1.1, 0.95), 'chest');
  add(at(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), 0, hip.y + 0.78, 0, 0, 0, 0, 1.15, 0.6, 1), 'chest', moss);
  for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; add(at(cyl(0.01, 0.04, 0.35, 5), Math.cos(a) * 0.22, hip.y + 0.98, Math.sin(a) * 0.18, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5), 'chest'); }
  add(at(new THREE.SphereGeometry(0.06, 10, 6, 0, Math.PI * 2, 0, Math.PI / 2), 0.15, hip.y + 0.9, 0.12, 0, 0, 0, 1, 0.7, 1), 'chest', 0xc03028);
  // yüz oyuğu + gözler
  add(sph(0.12, 0, hip.y + 0.5, 0.24, 1.2, 0.7, 0.4), 'chest', 0x1a120c);
  for (const s of [1, -1]) add(sph(0.035, s * 0.07, hip.y + 0.52, 0.29, 1, 1.2, 0.6), 'chest', EYE[variant], true);
  for (const s of ['L', 'R'] as const) {
    const sh = W['upperArm' + s].clone().add(V3((s === 'L' ? 1 : -1) * 0.14, -0.05, 0)), el = W['foreArm' + s].clone().add(V3((s === 'L' ? 1 : -1) * 0.16, -0.02, 0)), ha = W['hand' + s].clone().add(V3((s === 'L' ? 1 : -1) * 0.16, -0.05, 0));
    add(seg(sh, el, 0.1, 0.08), 'upperArm' + s);
    add(seg(el, ha, 0.08, 0.06), 'foreArm' + s);
    for (let f = 0; f < 3; f++) add(seg(ha, ha.clone().add(V3((f - 1) * 0.06, -0.18, 0.04)), 0.03, 0.008), 'hand' + s);
    const t = W['thigh' + s], kn = W['shin' + s], ft = W['foot' + s];
    add(seg(t, kn, 0.13, 0.11), 'thigh' + s);
    add(seg(kn, ft, 0.11, 0.14), 'shin' + s);
    for (let f = 0; f < 3; f++) add(seg(ft, ft.clone().add(V3((f - 1) * 0.1, -0.03, 0.18)), 0.05, 0.015), 'foot' + s);
  }
  return P;
}

function golemPieces(variant: number): Piece[] {
  const W = WORLD; const P: Piece[] = [];
  const ice = (p: THREE.Vector3) => new THREE.Color(variant === 2 ? 0x6a8ad0 : 0x9ad0f0).multiplyScalar(0.8 + fbm(p.x * 3, p.y * 3 + p.z, 2, 3, 51) * 0.4);
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'] = ice, glow = false) => P.push({ g, bone, color, glow });
  const chunk = (r: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => at(new THREE.IcosahedronGeometry(r, 0), x, y, z, x * 3, y * 2, z, sx, sy, sz);
  add(chunk(0.42, 0, W.chest.y, 0, 1.2, 1, 0.9), 'chest');
  add(chunk(0.28, 0, W.hips.y, 0, 1.1, 0.8, 0.9), 'hips');
  add(chunk(0.2, 0, W.head.y + 0.2, 0.05), 'head');
  for (const s of [1, -1]) add(sph(0.035, s * 0.08, W.head.y + 0.22, 0.22), 'head', variant === 2 ? 0xff4040 : 0xe0ffff, true);
  for (const s of ['L', 'R'] as const) {
    const sx = s === 'L' ? 1 : -1;
    add(chunk(0.22, W['upperArm' + s].x + sx * 0.15, W['upperArm' + s].y, 0), 'upperArm' + s);
    add(chunk(0.16, W['foreArm' + s].x + sx * 0.18, W['foreArm' + s].y, 0, 1, 1.4, 1), 'upperArm' + s);
    add(chunk(0.2, W['hand' + s].x + sx * 0.18, W['hand' + s].y - 0.05, 0.02, 1.1, 1, 1.1), 'foreArm' + s);
    add(chunk(0.17, W['thigh' + s].x, W['thigh' + s].y - 0.2, 0, 1, 1.3, 1), 'thigh' + s);
    add(chunk(0.16, W['shin' + s].x, W['shin' + s].y - 0.25, 0.02, 1, 1.4, 1.1), 'shin' + s);
  }
  for (let i = 0; i < 6; i++) add(at(new THREE.ConeGeometry(0.06, 0.35, 5), (i - 2.5) * 0.12, W.chest.y + 0.38, -0.1, -0.3, 0, (i - 2.5) * 0.2), 'chest', 0xe0f4ff);
  return P;
}

function seerPieces(variant: number): Piece[] {
  const W = WORLD; const P: Piece[] = [];
  const robe = [0x3a4a8a, 0x2a3a7a, 0x1a1a4a][variant];
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'] = robe, glow = false) => P.push({ g, bone, color, glow });
  add(at(lathe([[0.12, 0], [0.22, -0.3], [0.32, -0.7], [0.38, -0.95], [0, -0.95]], 18, 0.5), 0, W.hips.y + 0.1, 0), 'hips');
  add(at(lathe([[0, 0], [0.16, 0], [0.2, 0.2], [0.2, 0.42], [0.08, 0.52], [0, 0.52]], 16, 0.5), 0, W.hips.y, 0, 0, 0, 0, 1, 1, 0.75), 'chest');
  add(at(new THREE.SphereGeometry(0.15, 14, 10, -Math.PI * 0.9, Math.PI * 1.8, 0, Math.PI * 0.75), 0, W.head.y + 0.1, -0.01, 0, Math.PI, 0, 1, 1.2, 1.1), 'head');
  add(sph(0.1, 0, W.head.y + 0.08, 0.03), 'head', 0x0a0a14);
  for (const s of [1, -1]) add(sph(0.022, s * 0.04, W.head.y + 0.1, 0.12), 'head', 0xbff6ff, true);
  for (const s of ['L', 'R'] as const) { add(seg(W['upperArm' + s], W['foreArm' + s], 0.07, 0.07), 'upperArm' + s); add(seg(W['foreArm' + s], W['hand' + s], 0.075, 0.1), 'foreArm' + s); }
  add(sph(0.09, W.handR.x, W.handR.y - 0.12, 0.08), 'handR', 0x9be8ff, true);
  add(at(new THREE.TorusGeometry(0.3, 0.012, 6, 30), 0, W.hips.y - 0.75, 0, Math.PI / 2), 'hips', 0x7cf3ff, true);
  return P;
}

// ───────────── şablon önbelleği ─────────────
const tpls = new Map<string, THREE.Object3D>();
function tpl(key: string, build: () => THREE.Object3D) { let t = tpls.get(key); if (!t) { t = build(); tpls.set(key, t); } return t; }

export function createMonster(art: string, variant: number, size: number): MonsterRig {
  const s = size * (variant === 2 ? 1.12 : 1);
  const glow = EYE[variant];
  if (art === 'fox') { const m = createMeshFox(variant, s); if (m) return m; }
  if (art === 'fox_king') return createMonster('rotguard', variant, size * 1.5); // 3B model yüklenemezse yedek
  if (art === 'wolf' || art === 'lynx' || art === 'fox') {
    const t = tpl(art + variant, () => templateFromPieces(art === 'fox' ? foxPieces(variant) : quadPieces(art, variant), QB, { glowColor: glow, texture: art === 'fox' ? 'cloth' : 'leather', clothRough: 0.92 }));
    const inst = instantiate(t);
    inst.root.scale.setScalar(s * (art === 'wolf' ? 1.35 : art === 'fox' ? 1.15 : 1.2));
    const fox = art === 'fox';
    return {
      root: inst.root, height: (fox ? 0.85 : 1.1) * s,
      update: (st, tm, k, ph) => {
        quadAnimate(inst.bones, inst.body, st, tm, k, ph);
        if (fox) {
          // tilki: kuyruk yere paralel ve canlı sallanır, kulaklar dik; boşta ara ara başını yana eğer
          inst.bones.tail1.rotation.x = 0.1; inst.bones.tail2.rotation.x = 0;
          if (st !== 'dead') { inst.bones.neck.rotation.x -= 0.32; inst.bones.head.rotation.x += 0.24; } // baş dik, burun düz
          inst.bones.tail1.rotation.y = Math.sin(tm * (st === 'walk' ? 6 : 2.2)) * (st === 'walk' ? 0.35 : 0.22);
          if (st === 'idle') inst.bones.head.rotation.z = Math.max(0, Math.sin(tm * 0.7)) ** 6 * 0.35;
        }
      },
    };
  }
  if (art === 'rotguard' || art === 'golem' || art === 'seer') {
    const pieces = art === 'rotguard' ? treantPieces(variant) : art === 'golem' ? golemPieces(variant) : seerPieces(variant);
    const t = tpl(art + variant, () => templateFromPieces(pieces, BONES, { glowColor: art === 'golem' ? (variant === 2 ? 0xff4040 : 0xa0f0ff) : art === 'seer' ? 0x9be8ff : glow, texture: art === 'rotguard' ? 'bark' : art === 'golem' ? 'rock' : 'cloth', clothRough: art === 'golem' ? 0.25 : 0.85 }));
    const inst = instantiate(t);
    const rig: Rig = { root: inst.root, body: inst.body, bones: inst.bones, mesh: inst.mesh, look: { id: art, weapon: art === 'seer' ? 'staff' : 'none' } as never };
    inst.root.scale.setScalar(s * (art === 'golem' ? 1.25 : art === 'rotguard' ? 1.1 : 1));
    return {
      root: inst.root, height: (art === 'golem' ? 2.4 : 2.1) * s,
      update: (st, tm, k, ph) => {
        animateHumanoid(rig, st, tm, k, ph * (art === 'golem' ? 0.7 : 1));
        if (art === 'seer') { inst.body.position.y = 0.25 + Math.sin(tm * 2) * 0.08; rig.bones.thighL.rotation.x = 0; rig.bones.thighR.rotation.x = 0; }
        if (art === 'rotguard' && st !== 'dead') { rig.bones.chest.rotation.x += 0.12; }
      },
    };
  }
  if (art === 'devourer') return createDevourer(variant, s);
  if (art === 'blackstone') return createBlackStone(s);
  return createDevourer(variant, s);
}

/** Hazır 3B modeli olan canavarlar: model kimliği → sanat adı (model gelince görünümler yeniden kurulur). */
export const MONSTER_MESHES: Record<string, string> = { fox_mesh: 'fox' };
const foxMats = new Map<number, THREE.Material>();
/**
 * Meshy'de tasarlanıp scripts/quad-rig.mjs ile dört ayaklı iskelete bağlanan tilki. Kemik adları QB ile aynı,
 * dinlenme dönüşleri birim: quadAnimate doğrudan sürer. Model yüklenmediyse null (çizilmiş tilki görünür).
 */
function createMeshFox(variant: number, s: number): MonsterRig | null {
  const L = loadModel('fox_mesh');
  if (!L) return null;
  const inner = skClone(L.scene) as THREE.Object3D;
  const bones: Record<string, THREE.Bone> = {};
  inner.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) {
      m.castShadow = true; m.frustumCulled = false;
      if (variant > 0) {
        let vm = foxMats.get(variant);
        if (!vm) { vm = (m.material as THREE.MeshStandardMaterial).clone(); (vm as THREE.MeshStandardMaterial).color.set(variant === 2 ? 0x9aa2b8 : 0xc08a78); foxMats.set(variant, vm); }
        m.material = vm;
      }
    }
  });
  if (!bones.body) return null;
  const restBodyY = bones.body.position.y;
  const bodyG = new THREE.Group(); bodyG.add(inner);
  const root = new THREE.Group(); root.add(bodyG);
  root.scale.setScalar(s * 1.05);
  return {
    root, height: 0.95 * s * 1.05,
    update(st, t, k, ph) {
      quadAnimate(bones, bodyG, st, t, k, ph);
      bones.body.position.y += restBodyY - QB[0][3];
      bones.tail1.rotation.x = 0.12; bones.tail2.rotation.x = 0.05;
      bones.tail1.rotation.y = Math.sin(t * (st === 'walk' ? 6 : 2.2)) * (st === 'walk' ? 0.3 : 0.18);
      if (st === 'idle') bones.head.rotation.z = Math.max(0, Math.sin(t * 0.7)) ** 6 * 0.3;
    },
  };
}

function createDevourer(variant: number, s: number): MonsterRig {
  const root = new THREE.Group();
  const col = [0x5a2a9a, 0x4a1a7a, 0x7a1040][variant];
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.5, 28, 20), new THREE.MeshPhysicalMaterial({ color: col, roughness: 0.12, metalness: 0, transparent: true, opacity: 0.86, emissive: col, emissiveIntensity: 0.35, clearcoat: 1, clearcoatRoughness: 0.1 }));
  body.position.y = 0.45; body.castShadow = true;
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.16, 1), new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x9ffff0, emissiveIntensity: 2.5 }));
  core.position.y = 0.42;
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(0.14, 14, 8), new THREE.MeshStandardMaterial({ color: 0x1a0820, roughness: 0.6 }));
  mouth.position.set(0, 0.32, 0.4); mouth.scale.set(1.4, 0.4, 0.4);
  const eyes: THREE.Mesh[] = [];
  for (const sx of [1, -1]) { const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), new THREE.MeshStandardMaterial({ color: 0, emissive: EYE[variant], emissiveIntensity: 2.2 })); e.position.set(sx * 0.17, 0.62, 0.38); eyes.push(e); }
  const g = new THREE.Group(); g.add(body, core, mouth, ...eyes);
  root.add(g); root.scale.setScalar(s * 1.1);
  return {
    root, height: 1.1 * s,
    update(st, t, k, ph) {
      const sq = st === 'walk' ? Math.sin(ph) : Math.sin(t * 2) * 0.3;
      g.scale.set(1 + sq * 0.08, 1 - sq * 0.1, 1 + sq * 0.08);
      g.position.y = st === 'walk' ? Math.max(0, Math.sin(ph)) * 0.18 : 0;
      mouth.scale.y = st === 'attack' || st === 'cast' ? 0.4 + Math.sin(Math.min(1, k) * Math.PI) * 1.0 : 0.4;
      core.rotation.y = t * 2; core.rotation.x = t;
      if (st === 'dead') { g.scale.setScalar(Math.max(0.01, 1 - k)); }
    },
  };
}

function createBlackStone(s: number): MonsterRig {
  const root = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({ color: 0x1e1a24, roughness: 0.35, metalness: 0.3 });
  const rune = new THREE.MeshStandardMaterial({ color: 0, emissive: 0xff2a50, emissiveIntensity: 2.6 });
  const geo = new THREE.IcosahedronGeometry(1, 2);
  const p = geo.attributes.position as THREE.BufferAttribute; const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = fbm(v.x + 3, v.y + 3, 2, 3, 61); p.setXYZ(i, v.x * (0.9 + n * 0.3), v.y * 2.0 * (0.9 + n * 0.2) + 1.8, v.z * (0.8 + n * 0.3)); }
  geo.computeVertexNormals();
  const mono = new THREE.Mesh(geo, stone); mono.castShadow = true;
  const runes = new THREE.Group();
  for (let i = 0; i < 5; i++) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.18 + i * 0.03, 0.025, 6, 6), rune); r.position.set(0, 1.0 + i * 0.5, 0.92 - Math.abs(i - 2) * 0.1); runes.add(r); }
  const shards: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) { const sh = new THREE.Mesh(new THREE.OctahedronGeometry(0.28, 0), stone); sh.castShadow = true; shards.push(sh); root.add(sh); }
  root.add(mono, runes);
  root.scale.setScalar(s * 0.9);
  return {
    root, height: 4.6 * s,
    update(st, t) {
      shards.forEach((sh, i) => { const a = t * 0.8 + (i / shards.length) * Math.PI * 2; sh.position.set(Math.cos(a) * 2.0, 2.2 + Math.sin(t * 1.5 + i) * 0.4, Math.sin(a) * 2.0); sh.rotation.set(t + i, t * 0.7, 0); });
      rune.emissiveIntensity = 2 + Math.sin(t * 3) * 0.8 + (st === 'attack' ? 2 : 0);
    },
  };
}
