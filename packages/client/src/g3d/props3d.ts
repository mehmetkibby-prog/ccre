import * as THREE from 'three';
import type { Prop, PropKind } from '@col/shared';
import { box, cyl, lathe, at, merge, colorize, radialNormals, rng } from './geom.ts';
import { mat } from './materials.ts';
import { fbm } from './textures.ts';
import { U } from './terrain.ts';
import { mergeVertices } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/**
 * Anime tarzı yumuşak taç kütlesi: hafif tümsekli küre, yumuşak normaller, alttan koyu üstten açık köşe rengi.
 * (Önceki yüzlerce alfa kesmeli yaprak kartı yürürken titriyordu ve uzaktan ne olduğu anlaşılmıyordu.)
 */
const _c = new THREE.Color();
function fluff(seed: number, cx: number, cy: number, cz: number, rad: number, sy: number, dark: number, light: number, detail = 1, snow = false): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.IcosahedronGeometry(rad, detail);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    const d = v.clone().normalize();
    const bump = 1 + (fbm(d.x * 0.5 + 0.5 + seed * 0.37, d.z * 0.5 + 0.5 + d.y * 0.31, 3, 2, seed) - 0.5) * 0.42;
    const flat = d.y < -0.2 ? 0.78 : 1; // altı biraz basık
    pos.setXYZ(i, v.x * bump, v.y * bump * sy * flat, v.z * bump);
  }
  g.computeVertexNormals();
  g.translate(cx, cy, cz);
  const D = new THREE.Color(dark), L = new THREE.Color(light), W = new THREE.Color(0xf4f8ff);
  colorize(g, (p, n) => {
    const t = THREE.MathUtils.clamp((p.y - (cy - rad * sy)) / (2 * rad * sy), 0, 1);
    const k = THREE.MathUtils.smoothstep(t * 0.6 + Math.max(0, n.y) * 0.4, 0.05, 0.95);
    _c.copy(D).lerp(L, k);
    if (snow && n.y > 0.35) _c.lerp(W, THREE.MathUtils.smoothstep(n.y, 0.35, 0.8) * 0.85);
    return _c.clone();
  });
  return g;
}
function cone(cx: number, cy: number, cz: number, r: number, h: number, dark: number, light: number, snow: boolean, seed: number): THREE.BufferGeometry {
  let g: THREE.BufferGeometry = new THREE.ConeGeometry(r, h, 12, 2);
  g.deleteAttribute('normal'); g.deleteAttribute('uv');
  g = mergeVertices(g);
  const pos = g.attributes.position as THREE.BufferAttribute, v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) { v.fromBufferAttribute(pos, i); if (v.y < h * 0.45) { const a = Math.atan2(v.z, v.x); const w = 1 + Math.sin(a * 6 + seed) * 0.08; pos.setXYZ(i, v.x * w, v.y - (Math.sin(a * 6 + seed) * 0.5 + 0.5) * 0.18 * (h * 0.5 - v.y) / h, v.z * w); } }
  g.computeVertexNormals();
  g.translate(cx, cy + h / 2, cz);
  const D = new THREE.Color(dark), L = new THREE.Color(light), W = new THREE.Color(0xf4f8ff);
  colorize(g, (p, n) => {
    const t = THREE.MathUtils.clamp((p.y - cy) / h, 0, 1);
    _c.copy(D).lerp(L, THREE.MathUtils.smoothstep(t * 0.5 + Math.max(0, n.y) * 0.6, 0.1, 0.95));
    if (snow && n.y > 0.3) _c.lerp(W, 0.8);
    return _c.clone();
  });
  return g;
}

/** Bir prop modeli: malzeme anahtarına göre birleştirilmiş geometri parçaları. */
export interface Part { geo: THREE.BufferGeometry; mat: string; shadow?: boolean }
type Builder = (v: number) => Part[];

function group(parts: { g: THREE.BufferGeometry; m: string; shadow?: boolean }[]): Part[] {
  const by = new Map<string, { list: THREE.BufferGeometry[]; shadow: boolean }>();
  for (const p of parts) { const e = by.get(p.m) ?? { list: [], shadow: p.shadow !== false }; e.list.push(p.g); by.set(p.m, e); }
  return [...by.entries()].map(([m, e]) => ({ geo: merge(e.list, m === 'vcolor' || m === 'flower' || m === 'mushroom'), mat: m, shadow: e.shadow }));
}

function leafCluster(r: () => number, cx: number, cy: number, cz: number, rad: number, n: number, card = 1.3): THREE.BufferGeometry {
  const list: THREE.BufferGeometry[] = [];
  const c = new THREE.Vector3(cx, cy, cz);
  for (let i = 0; i < n; i++) {
    const u = r() * 2 - 1, th = r() * Math.PI * 2, rr = rad * Math.cbrt(r());
    const s = Math.sqrt(1 - u * u);
    const g = new THREE.PlaneGeometry(card * (0.8 + r() * 0.5), card * (0.8 + r() * 0.5));
    at(g, cx + Math.cos(th) * s * rr, cy + u * rr * 0.8, cz + Math.sin(th) * s * rr, r() * Math.PI, r() * Math.PI, r() * Math.PI);
    list.push(g);
  }
  const m = merge(list);
  radialNormals(m, c, rad * 0.6);
  return m;
}

const B: Partial<Record<PropKind, Builder>> = {
  tree(v) {
    const r = rng(100 + v);
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    const H = 3.4 + v * 0.3;
    parts.push({ g: at(cyl(0.2, 0.36, H, 9, 1.4), 0, H / 2, 0), m: 'bark' });
    // kökler
    for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + r(); parts.push({ g: at(cyl(0.05, 0.16, 0.9, 6, 1), Math.cos(a) * 0.32, 0.2, Math.sin(a) * 0.32, Math.sin(a) * 1.1, 0, -Math.cos(a) * 1.1), m: 'bark' }); }
    const tips: [number, number, number][] = [[0, H + 1.2, 0]];
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + r() * 0.8, l = 1.4 + r() * 0.6, y0 = H * (0.6 + r() * 0.3);
      const tilt = 0.8 + r() * 0.3;
      const bx = Math.cos(a) * Math.sin(tilt) * l, by = Math.cos(tilt) * l, bz = Math.sin(a) * Math.sin(tilt) * l;
      const g = cyl(0.05, 0.13, l, 6, 1); g.translate(0, l / 2, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(bx, by, bz).normalize());
      g.applyQuaternion(q); g.translate(0, y0, 0);
      parts.push({ g, m: 'bark' });
      tips.push([bx, y0 + by + 0.3, bz]);
    }
    // anime taç: ortada büyük kütle, dal uçlarında daha küçük kütleler
    const autumn = v === 2;
    const dark = autumn ? 0xa8502a : 0x2f7a3e, light = autumn ? 0xffc65a : 0x9ede62;
    const crown: THREE.BufferGeometry[] = [fluff(100 + v, 0, H + 0.55, 0, 1.75, 0.88, dark, light, 2)];
    tips.slice(1).forEach(([x, y, z], i) => crown.push(fluff(110 + v * 7 + i, x * 0.9, y + 0.15, z * 0.9, 1.05 + r() * 0.3, 0.85, dark, light, 1)));
    const res = group(parts);
    res.push({ geo: merge(crown, true), mat: 'canopy' });
    return res;
  },
  pine(v) { return pineModel(v, false); },
  snowpine(v) { return pineModel(v, true); },
  deadtree(v) {
    const r = rng(300 + v);
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    const branch = (o: THREE.Vector3, dir: THREE.Vector3, l: number, rad: number, d: number) => {
      if (d > 2 || l < 0.45) return; // daha az ve kalın dal: net kuru ağaç silüeti
      const g = cyl(rad * 0.6, rad, l, 6, 1); g.translate(0, l / 2, 0);
      g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)); g.translate(o.x, o.y, o.z);
      parts.push({ g, m: 'bark_dead' });
      const end = o.clone().addScaledVector(dir, l);
      for (let i = 0; i < 2 + (d === 0 ? 1 : 0); i++) {
        const nd = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.4, 0.2 + r() * 0.3, (r() - 0.5) * 1.4)).normalize();
        branch(end, nd, l * 0.62, rad * 0.6, d + 1);
      }
    };
    branch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(0.05, 1, 0).normalize(), 2.8, 0.28, 0);
    return group(parts);
  },
  rock(v) {
    const r = rng(400 + v);
    const g = new THREE.IcosahedronGeometry(1, 3);
    const p = g.attributes.position as THREE.BufferAttribute;
    const tmp = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      tmp.fromBufferAttribute(p, i);
      const n = fbm(tmp.x * 0.4 + 2 + v, tmp.y * 0.4 + 3, 2, 4, 401 + v);
      const k = 0.75 + n * 0.5;
      p.setXYZ(i, tmp.x * k * 1.3, Math.max(-0.2, tmp.y * k * 0.8), tmp.z * k * 1.1);
    }
    g.computeVertexNormals();
    at(g, 0, 0.4, 0, 0, r() * 6, 0, 0.9);
    return [{ geo: merge([g]), mat: v === 2 ? 'rock_dark' : 'rock' }];
  },
  bush(v) {
    const r = rng(500 + v);
    const blobs = [fluff(500 + v, 0, 0.55, 0, 0.72, 0.8, 0x357f40, 0x8fd060, 1), fluff(510 + v, 0.5, 0.42, 0.2, 0.5, 0.8, 0x357f40, 0x8fd060, 1), fluff(520 + v, -0.45, 0.42, -0.1, 0.52, 0.8, 0x357f40, 0x8fd060, 1)];
    void r;
    const res: Part[] = [{ geo: merge(blobs, true), mat: 'canopy_low' }];
    if (v !== 1) {
      const berries: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 9; i++) { const a = r() * 6.28; berries.push(colorize(at(new THREE.SphereGeometry(0.06, 6, 5), Math.cos(a) * 0.65, 0.5 + r() * 0.5, Math.sin(a) * 0.65), v === 0 ? 0xd02840 : 0x4050e0)); }
      res.push({ geo: merge(berries, true), mat: 'vcolor' });
    }
    return res;
  },
  house(v) {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    const W = 6.4, D = 4.6, H1 = 2.7, H2 = 2.3;
    const z0 = -D / 2 - 0.2; // ön yüz z=0 civarı
    const roofKey = ['roof_red', 'roof_slate', 'roof_red', 'roof_green'][v % 4];
    parts.push({ g: at(box(W + 0.3, 0.6, D + 0.3, 1.2), 0, 0.3, z0), m: 'stonewall' });
    parts.push({ g: at(box(W, H1, D, 2), 0, 0.6 + H1 / 2, z0), m: 'plaster' });
    parts.push({ g: at(box(W + 0.5, H2, D + 0.5, 2), 0, 0.6 + H1 + H2 / 2, z0), m: 'plaster' });
    // ahşap kirişler (ön ve yanlar)
    const beam = (w: number, h: number, d: number, x: number, y: number, z: number, rz = 0) => parts.push({ g: at(box(w, h, d, 0.7), x, y, z, 0, 0, rz), m: 'timber' });
    const fz = z0 + D / 2 + 0.02, fz2 = z0 + (D + 0.5) / 2 + 0.02;
    for (const x of [-W / 2, -W / 6, W / 6, W / 2]) beam(0.22, H1, 0.12, x, 0.6 + H1 / 2, fz);
    for (const x of [-(W + 0.5) / 2, -W / 4, 0, W / 4, (W + 0.5) / 2]) beam(0.2, H2, 0.12, x, 0.6 + H1 + H2 / 2, fz2);
    beam(W + 0.6, 0.26, 0.16, 0, 0.6 + H1, fz2 - 0.05);
    beam(W + 0.6, 0.22, 0.14, 0, 0.6 + H1 + H2, fz2);
    // çapraz destekler
    beam(0.16, 2.0, 0.1, -W / 2.6, 0.6 + H1 + H2 / 2, fz2 + 0.02, 0.7);
    beam(0.16, 2.0, 0.1, W / 2.6, 0.6 + H1 + H2 / 2, fz2 + 0.02, -0.7);
    for (const s of [-1, 1]) {
      const sx = s * (W / 2 + 0.02);
      for (const z of [z0 - D / 2, z0, z0 + D / 2]) parts.push({ g: at(box(0.12, H1, 0.2, 0.7), sx, 0.6 + H1 / 2, z), m: 'timber' });
    }
    // çatı (eğimli iki plaka)
    const RW = W + 1.4, run = (D + 1.4) / 2, rise = 2.5, slope = Math.atan2(rise, run), len = Math.hypot(run, rise);
    const roofY = 0.6 + H1 + H2;
    for (const s of [-1, 1]) parts.push({ g: at(box(RW, 0.18, len + 0.2, 1.6), 0, roofY + rise / 2, z0 + s * run / 2, s * slope, 0, 0), m: roofKey });
    // alın üçgenleri
    const tri = new THREE.Shape(); tri.moveTo(-run + 0.5, 0); tri.lineTo(0, rise - 0.15); tri.lineTo(run - 0.5, 0); tri.closePath();
    for (const s of [-1, 1]) { const tg = new THREE.ExtrudeGeometry(tri, { depth: 0.15, bevelEnabled: false }); tg.scale(0.5, 0.5, 1); tg.scale(2, 2, 1); at(tg, s * (W / 2 + 0.17) - (s > 0 ? 0.15 : 0), roofY, z0, 0, Math.PI / 2, 0); parts.push({ g: tg, m: 'plaster' }); }
    parts.push({ g: at(box(0.3, 0.3, D + 1.6, 0.7), 0, roofY + rise + 0.05, z0, 0, 0, Math.PI / 4), m: 'timber' });
    // baca
    parts.push({ g: at(box(0.8, 2.2, 0.8, 1), W / 3, roofY + 1.6, z0 - 0.6), m: 'stonewall' });
    parts.push({ g: at(box(1.0, 0.18, 1.0, 1), W / 3, roofY + 2.7, z0 - 0.6), m: 'stonewall' });
    // kapı
    parts.push({ g: at(box(1.2, 2.1, 0.14, 0.8), 0, 0.6 + 1.05, fz + 0.04), m: 'planks' });
    parts.push({ g: at(box(1.5, 0.2, 0.2, 0.8), 0, 0.6 + 2.2, fz + 0.06), m: 'timber' });
    parts.push({ g: at(new THREE.SphereGeometry(0.06, 8, 6), 0.4, 1.6, fz + 0.14), m: 'gold' });
    parts.push({ g: at(box(1.6, 0.2, 0.7, 1), 0, 0.1, fz + 0.4), m: 'stonewall' });
    // pencereler
    const win = (x: number, y: number, z: number, ry = 0, w = 0.9, h = 0.95) => {
      parts.push({ g: at(box(w, h, 0.08), x, y, z, 0, ry, 0), m: 'glass_warm' });
      const fz3 = 0.07;
      parts.push({ g: at(box(w + 0.2, 0.12, 0.16, 0.6), x, y + h / 2, z, 0, ry), m: 'timber' });
      parts.push({ g: at(box(w + 0.3, 0.14, 0.3, 0.6), x, y - h / 2 - 0.05, z, 0, ry), m: 'timber' });
      parts.push({ g: at(box(0.08, h, 0.12, 0.6), x, y, z + fz3 * 0, 0, ry), m: 'timber' });
      parts.push({ g: at(box(w, 0.07, 0.1, 0.6), x, y, z, 0, ry), m: 'timber' });
    };
    win(-W / 3, 0.6 + 1.45, fz + 0.02); win(W / 3, 0.6 + 1.45, fz + 0.02);
    win(-W / 4 - 0.4, 0.6 + H1 + 1.15, fz2 + 0.02, 0, 0.8, 0.8); win(W / 4 + 0.4, 0.6 + H1 + 1.15, fz2 + 0.02, 0, 0.8, 0.8);
    // saksı çiçekleri
    const fl: THREE.BufferGeometry[] = [];
    const r = rng(600 + v);
    for (const x of [-W / 3, W / 3]) for (let i = 0; i < 7; i++) fl.push(colorize(at(new THREE.SphereGeometry(0.08, 6, 5), x - 0.4 + i * 0.13, 0.6 + 0.95 + r() * 0.08, fz + 0.2), [0xe04060, 0xffd040, 0xffffff, 0xc070e0][Math.floor(r() * 4)]));
    const res = group(parts);
    res.push({ geo: merge(fl, true), mat: 'vcolor' });
    return res;
  },
  stall(v) {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    for (const x of [-1.5, 1.5]) for (const z of [-0.5, 0.5]) parts.push({ g: at(cyl(0.06, 0.07, 2.4, 6), x, 1.2, z), m: 'timber' });
    parts.push({ g: at(box(3.2, 0.9, 1.1, 0.8), 0, 0.45, 0.1), m: 'planks' });
    parts.push({ g: at(box(3.4, 0.08, 1.3, 0.8), 0, 0.92, 0.1), m: 'timber' });
    const cloth = ['cloth_red', 'cloth_green', 'cloth_cream', 'cloth_red'][v % 4];
    parts.push({ g: at(box(3.6, 0.06, 1.9, 1), 0, 2.45, 0.3, 0.25, 0, 0), m: cloth });
    const goods: THREE.BufferGeometry[] = [];
    const r = rng(700 + v);
    for (let i = 0; i < 14; i++) goods.push(colorize(at(new THREE.SphereGeometry(0.11, 8, 6), -1.3 + (i % 7) * 0.42, 1.05, (i < 7 ? -0.15 : 0.25)), [[0xd03020, 0xe0a020], [0x60c040, 0xffd060], [0xa040c0, 0x60c0e0], [0xe0e0e0, 0xd08040]][v % 4][Math.floor(r() * 2)]));
    goods.push(colorize(at(box(0.5, 0.35, 0.4), 1.2, 1.15, 0.2), 0x8a5a30));
    const res = group(parts);
    res.push({ geo: merge(goods, true), mat: 'vcolor' });
    return res;
  },
  /** Şadırvan: sekizgen mermer havuz, çini kuşak, iki kat çanak; çanaklardan dökülen su şeritleri (canlı malzeme). */
  fountain() {
    const parts: { g: THREE.BufferGeometry; m: string; shadow?: boolean }[] = [];
    const O = 8; // sekizgen
    // havuz: dış duvar, dudak, iç taban
    parts.push({ g: lathe([[0, 0], [2.42, 0], [2.48, 0.08], [2.48, 0.62], [2.56, 0.66], [2.56, 0.8], [2.2, 0.8], [2.16, 0.72], [2.12, 0.3], [0, 0.3]], O, 1.2), m: 'marble' });
    // İznik çinisi kuşak (havuz dış yüzü)
    parts.push({ g: at(cyl(2.495, 2.495, 0.26, O, 1, true), 0, 0.36, 0), m: 'tile_iznik' });
    // köşe taşları
    for (let i = 0; i < O; i++) { const a = (i / O) * Math.PI * 2; parts.push({ g: at(box(0.22, 0.95, 0.22), Math.cos(a) * 2.5, 0.47, Math.sin(a) * 2.5, 0, -a), m: 'marble' }); parts.push({ g: at(new THREE.SphereGeometry(0.11, 8, 6), Math.cos(a) * 2.5, 1.0, Math.sin(a) * 2.5), m: 'gold' }); }
    parts.push({ g: at(new THREE.CylinderGeometry(2.14, 2.14, 0.04, 40), 0, 0.6, 0), m: 'fwater_basin', shadow: false });
    // gövde (sekizgen) ve orta çanak
    parts.push({ g: lathe([[0, 0], [0.5, 0], [0.42, 0.18], [0.3, 0.3], [0.26, 1.2], [0.34, 1.32], [0, 1.32]], O, 1), m: 'marble' });
    parts.push({ g: at(lathe([[0, 0], [0.25, 0], [1.05, 0.26], [1.18, 0.42], [1.1, 0.46], [0.98, 0.36], [0, 0.32]], 24, 1), 0, 1.22, 0), m: 'marble' });
    parts.push({ g: at(new THREE.CylinderGeometry(1.0, 1.0, 0.03, 32), 0, 1.6, 0), m: 'fwater_bowl', shadow: false });
    // üst gövde, üst çanak ve altın alem
    parts.push({ g: at(lathe([[0, 0], [0.2, 0], [0.16, 0.6], [0.22, 0.7], [0, 0.7]], O, 1), 0, 1.55, 0), m: 'marble' });
    parts.push({ g: at(lathe([[0, 0], [0.14, 0], [0.55, 0.16], [0.6, 0.26], [0.52, 0.28], [0, 0.2]], 20, 1), 0, 2.2, 0), m: 'marble' });
    parts.push({ g: at(new THREE.CylinderGeometry(0.5, 0.5, 0.025, 24), 0, 2.44, 0), m: 'fwater_top', shadow: false });
    parts.push({ g: at(lathe([[0, 0], [0.09, 0], [0.13, 0.12], [0.06, 0.3], [0.02, 0.42], [0, 0.42]], 12, 1), 0, 2.42, 0), m: 'gold' });
    // su şeritleri: üst çanaktan ortaya, orta çanaktan havuza (u = akış yönü)
    const jets: THREE.BufferGeometry[] = [];
    const jet = (a: number, r0: number, y0: number, r1: number, y1: number, rad: number) => {
      const c = Math.cos(a), sn = Math.sin(a);
      const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(c * r0, y0, sn * r0), new THREE.Vector3(c * (r0 + (r1 - r0) * 0.75), y0 + 0.12, sn * (r0 + (r1 - r0) * 0.75)), new THREE.Vector3(c * r1, y1, sn * r1));
      jets.push(new THREE.TubeGeometry(curve, 14, rad, 6, false));
    };
    for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8; jet(a, 1.12, 1.64, 1.72, 0.6, 0.05); }
    for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; jet(a, 0.57, 2.46, 0.84, 1.6, 0.032); }
    parts.push({ g: merge(jets), m: 'fountain_jet', shadow: false });
    return group(parts);
  },
  lamp() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: at(cyl(0.06, 0.09, 3.0, 8), 0, 1.5, 0), m: 'iron' });
    parts.push({ g: at(cyl(0.18, 0.22, 0.2, 8), 0, 0.1, 0), m: 'iron' });
    parts.push({ g: at(box(0.34, 0.42, 0.34), 0, 3.15, 0), m: 'glass_warm' });
    parts.push({ g: at(new THREE.ConeGeometry(0.32, 0.3, 4), 0, 3.52, 0, 0, Math.PI / 4), m: 'iron' });
    for (const [x, z] of [[-0.17, -0.17], [0.17, -0.17], [-0.17, 0.17], [0.17, 0.17]]) parts.push({ g: at(box(0.04, 0.44, 0.04), x, 3.15, z), m: 'iron' });
    return group(parts);
  },
  fence() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    for (const x of [-0.75, 0, 0.75]) parts.push({ g: at(box(0.12, 1.0, 0.12, 0.6), x, 0.5, 0), m: 'timber' });
    for (const y of [0.35, 0.75]) parts.push({ g: at(box(1.65, 0.1, 0.06, 0.6), 0, y, 0.06), m: 'timber' });
    return group(parts);
  },
  well() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: lathe([[0.85, 0], [0.9, 0.9], [0.7, 0.9], [0.65, 0.2], [0, 0.2]], 20, 1), m: 'stonewall' });
    parts.push({ g: at(new THREE.CylinderGeometry(0.66, 0.66, 0.03, 20), 0, 0.5, 0), m: 'water_small' });
    for (const x of [-0.8, 0.8]) parts.push({ g: at(box(0.14, 2.2, 0.14, 0.6), x, 1.1, 0), m: 'timber' });
    for (const s of [-1, 1]) parts.push({ g: at(box(2.1, 0.08, 0.9, 1), 0, 2.35, s * 0.35, s * 0.6), m: 'roof_red' });
    parts.push({ g: at(cyl(0.05, 0.05, 1.6, 6), 0, 1.8, 0, 0, 0, Math.PI / 2), m: 'timber' });
    parts.push({ g: at(cyl(0.16, 0.13, 0.25, 8), 0.1, 1.2, 0), m: 'planks' });
    return group(parts);
  },
  anvil() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: at(cyl(0.3, 0.38, 0.55, 8), 0, 0.27, 0), m: 'timber' });
    parts.push({ g: at(box(0.35, 0.25, 0.25), 0, 0.68, 0), m: 'iron' });
    parts.push({ g: at(box(0.95, 0.18, 0.32), 0.05, 0.86, 0), m: 'iron' });
    parts.push({ g: at(new THREE.ConeGeometry(0.15, 0.4, 8), 0.65, 0.86, 0, 0, 0, -Math.PI / 2), m: 'iron' });
    parts.push({ g: at(box(0.4, 0.05, 0.1), 0, 0.98, 0), m: 'ember' });
    return group(parts);
  },
  forge() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    // taş ocak gövdesi ve kızgın kor yatağı
    parts.push({ g: at(box(1.9, 0.95, 1.25, 0.7), 0, 0.475, 0), m: 'stonewall' });
    parts.push({ g: at(box(1.5, 0.12, 0.85), 0, 1.0, 0), m: 'ember' });
    parts.push({ g: at(box(0.8, 0.4, 0.06), 0, 0.42, 0.63), m: 'ember' });
    for (const x of [-0.85, 0.85]) parts.push({ g: at(box(0.18, 0.5, 1.25, 0.7), x, 1.2, 0), m: 'stonewall' });
    // davlumbaz ve baca
    parts.push({ g: at(new THREE.CylinderGeometry(0.28, 1.05, 0.9, 4, 1), 0, 1.95, -0.05, 0, Math.PI / 4), m: 'stonewall' });
    parts.push({ g: at(box(0.5, 1.7, 0.5, 0.7), 0, 3.2, -0.05), m: 'stonewall' });
    parts.push({ g: at(box(0.6, 0.12, 0.6), 0, 4.08, -0.05), m: 'iron' });
    // körük
    parts.push({ g: at(box(0.55, 0.12, 0.85), -1.35, 0.72, 0.1, 0.18, 0, 0), m: 'timber' });
    parts.push({ g: at(new THREE.CylinderGeometry(0.06, 0.06, 0.6, 6), -1.08, 0.7, 0.1, 0, 0, Math.PI / 2), m: 'iron' });
    parts.push({ g: at(box(0.45, 0.18, 0.7), -1.35, 0.6, 0.1), m: 'cloth_red' });
    // su fıçısı
    parts.push({ g: at(cyl(0.34, 0.3, 0.7, 12), 1.35, 0.35, 0.45), m: 'planks' });
    parts.push({ g: at(new THREE.CylinderGeometry(0.31, 0.31, 0.02, 16), 1.35, 0.66, 0.45), m: 'water_small' });
    // silah askısı: iki direk, kiriş, üç kılıç
    for (const z of [-0.55, 0.15]) parts.push({ g: at(box(0.08, 1.6, 0.08), 1.45, 0.8, z), m: 'timber' });
    parts.push({ g: at(box(0.08, 0.08, 0.85), 1.45, 1.45, -0.2), m: 'timber' });
    for (const z of [-0.45, -0.2, 0.05]) { parts.push({ g: at(box(0.03, 1.0, 0.08), 1.52, 0.85, z), m: 'metal' }); parts.push({ g: at(box(0.04, 0.05, 0.22), 1.52, 1.33, z), m: 'gold' }); }
    return group(parts);
  },
  crate() { return [{ geo: merge([at(box(0.9, 0.9, 0.9, 0.9), 0, 0.45, 0)]), mat: 'planks' }, { geo: merge([at(box(0.95, 0.1, 0.95, 0.6), 0, 0.88, 0), at(box(0.95, 0.1, 0.95, 0.6), 0, 0.05, 0)]), mat: 'timber' }]; },
  barrel() {
    return group([
      { g: lathe([[0.32, 0], [0.4, 0.2], [0.42, 0.5], [0.4, 0.8], [0.32, 1.0], [0, 1.0]], 14, 0.8), m: 'planks' },
      { g: at(new THREE.TorusGeometry(0.405, 0.025, 4, 16), 0, 0.22, 0, Math.PI / 2), m: 'iron' },
      { g: at(new THREE.TorusGeometry(0.405, 0.025, 4, 16), 0, 0.78, 0, Math.PI / 2), m: 'iron' },
    ]);
  },
  crystal(v) { return crystalModel(v, 'crystal'); },
  icecrystal(v) { return crystalModel(v, 'ice'); },
  portalstone(v) {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: lathe([[0, 0], [1.4, 0], [1.5, 0.12], [1.4, 0.3], [0, 0.3]], 24, 1.2), m: 'stonewall' });
    const mono = box(0.9, 3.4, 0.5, 1.2); mono.translate(0, 1.95, 0);
    const p = mono.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - Math.max(0, y - 2.4) * 0.35; p.setX(i, p.getX(i) * k); p.setZ(i, p.getZ(i) * k); }
    mono.computeVertexNormals();
    parts.push({ g: mono, m: 'rock_dark' });
    const rune = ['rune_green', 'rune_blue', 'rune_red'][v % 3];
    parts.push({ g: at(new THREE.TorusGeometry(0.25, 0.04, 6, 4), 0, 2.6, 0.26, 0, 0, Math.PI / 4), m: rune });
    parts.push({ g: at(box(0.06, 0.9, 0.04), 0, 1.6, 0.26), m: rune });
    parts.push({ g: at(box(0.5, 0.06, 0.04), 0, 1.75, 0.26), m: rune });
    parts.push({ g: at(new THREE.TorusGeometry(1.25, 0.03, 4, 32), 0, 0.32, 0, Math.PI / 2), m: rune });
    return group(parts);
  },
  log() { return group([{ g: at(cyl(0.3, 0.33, 2.6, 10, 1.2), 0, 0.3, 0, 0, 0.3, Math.PI / 2), m: 'bark' }]); },
  stump() { return group([{ g: at(cyl(0.38, 0.5, 0.6, 9, 1), 0, 0.3, 0), m: 'bark_dead' }]); },
  mushroom(v) {
    const r = rng(800 + v); const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) {
      const x = (r() - 0.5) * 0.4, z = (r() - 0.5) * 0.4, s = 0.5 + r() * 0.6;
      list.push(colorize(at(cyl(0.025 * s, 0.035 * s, 0.18 * s, 6), x, 0.09 * s, z), 0xf0e6d0));
      list.push(colorize(at(new THREE.SphereGeometry(0.09 * s, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), x, 0.17 * s, z), [0xc03028, 0xa07040, 0x8050c0][v % 3]));
    }
    return [{ geo: merge(list, true), mat: 'mushroom' }];
  },
  flowers(v) {
    const r = rng(900 + v); const list: THREE.BufferGeometry[] = [];
    const cols = [0xff6090, 0xffffff, 0xa080ff, 0xff9040, 0x60c0ff];
    for (let i = 0; i < 6; i++) {
      const x = (r() - 0.5) * 0.7, z = (r() - 0.5) * 0.5, h = 0.18 + r() * 0.15;
      list.push(colorize(at(cyl(0.008, 0.01, h, 4), x, h / 2, z), 0x3a7a2a));
      list.push(colorize(at(new THREE.IcosahedronGeometry(0.045, 0), x, h, z), cols[(v + i) % 5]));
    }
    return [{ geo: merge(list, true), mat: 'flower', shadow: false }];
  },
  grasstuft(v) {
    const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) list.push(at(new THREE.PlaneGeometry(0.7, 0.5), 0, 0.25, 0, 0, (i / 3) * Math.PI));
    const g = merge(list);
    // normaller yukarı: yandan ışık alan dikey kartlar koyu ve sivri görünüyordu; zeminle aynı parlaklıkta olsun
    const nor = g.attributes.normal as THREE.BufferAttribute;
    for (let i = 0; i < nor.count; i++) nor.setXYZ(i, 0, 1, 0);
    return [{ geo: g, mat: v === 3 ? 'needles_snow' : 'grass', shadow: false }];
  },
  bones() {
    const list: THREE.BufferGeometry[] = [];
    list.push(at(cyl(0.03, 0.03, 0.5, 6), 0, 0.04, 0, 0, 0.4, Math.PI / 2), at(cyl(0.03, 0.03, 0.4, 6), 0.1, 0.04, 0.15, 0, -0.6, Math.PI / 2), at(new THREE.SphereGeometry(0.12, 8, 6), -0.2, 0.1, 0.1));
    return [{ geo: merge(list), mat: 'bone' }];
  },
  reeds() {
    const list: THREE.BufferGeometry[] = []; const r = rng(55);
    for (let i = 0; i < 8; i++) { const x = (r() - 0.5) * 0.6, z = (r() - 0.5) * 0.6, h = 1.0 + r() * 0.6; list.push(colorize(at(cyl(0.012, 0.02, h, 4), x, h / 2, z, (r() - 0.5) * 0.2, 0, (r() - 0.5) * 0.2), 0x5a8a3a)); if (i % 2 === 0) list.push(colorize(at(cyl(0.035, 0.035, 0.22, 6), x, h - 0.05, z), 0x6a3a1a)); }
    return [{ geo: merge(list, true), mat: 'flower' }];
  },
  lily() { return [{ geo: merge([colorize(at(new THREE.CircleGeometry(0.35, 12, 0.3, Math.PI * 1.85), 0, -0.3, 0, -Math.PI / 2), 0x3a8a40)], true), mat: 'vcolor', shadow: false }]; },
  dock() {
    const list: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 16; i++) list.push(at(box(3.0, 0.1, 0.38, 0.8), 0, 0.1, i * 0.42 + 0.2));
    const posts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 5; i++) for (const x of [-1.5, 1.5]) posts.push(at(cyl(0.1, 0.1, 1.6, 6), x, -0.3, i * 1.6 + 0.3));
    return [{ geo: merge(list), mat: 'planks' }, { geo: merge(posts), mat: 'timber' }];
  },
  waterfall() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    const cliff = new THREE.IcosahedronGeometry(1, 3);
    const p = cliff.attributes.position as THREE.BufferAttribute; const t = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { t.fromBufferAttribute(p, i); const n = fbm(t.x + 5, t.y + 5, 2, 4, 909); p.setXYZ(i, t.x * 8 * (0.8 + n * 0.4), Math.max(0, t.y) * 6 * (0.8 + n * 0.4), t.z * 2.2); }
    cliff.computeVertexNormals();
    parts.push({ g: at(cliff, 0, 0, -3), m: 'rock' });
    parts.push({ g: at(new THREE.PlaneGeometry(4, 6.5, 1, 6), 0, 3.0, -0.7, -0.15), m: 'waterfall' });
    return group(parts);
  },
  /** Yazılı tabela: iki direk, ahşap levha; yazı iki yüzde (doku: materials.ts → sign_<v>). */
  signpost(v) {
    const parts: { g: THREE.BufferGeometry; m: string; shadow?: boolean }[] = [];
    for (const x of [-1.25, 1.25]) parts.push({ g: at(box(0.16, 2.9, 0.16, 0.6), x, 1.45, 0), m: 'timber' });
    parts.push({ g: at(box(2.75, 1.42, 0.1, 0.8), 0, 2.15, 0), m: 'planks' });
    parts.push({ g: at(box(2.95, 0.1, 0.16, 0.8), 0, 2.9, 0), m: 'timber' });
    parts.push({ g: at(new THREE.PlaneGeometry(2.6, 1.3), 0, 2.15, 0.056), m: 'sign_' + v, shadow: false });
    parts.push({ g: at(new THREE.PlaneGeometry(2.6, 1.3), 0, 2.15, -0.056, 0, Math.PI, 0), m: 'sign_' + v, shadow: false });
    return group(parts);
  },
  /** Yolun üstünde giriş kemeri: iki taş sütun, kiriş, büyük yazılı levha (iki yüzlü, ±X'e bakar), küçük kiremit çatı. */
  gate(v) {
    const parts: { g: THREE.BufferGeometry; m: string; shadow?: boolean }[] = [];
    const Z = 4.1; // sütunlar yolun iki kenarında
    for (const z of [-Z, Z]) {
      parts.push({ g: at(box(0.9, 0.5, 0.9, 0.8), 0, 0.25, z), m: 'stonewall' });
      parts.push({ g: at(cyl(0.32, 0.38, 5.6, 10), 0, 3.0, z), m: 'marble' });
      parts.push({ g: at(box(0.8, 0.3, 0.8, 0.8), 0, 5.9, z), m: 'stonewall' });
      parts.push({ g: at(new THREE.SphereGeometry(0.22, 12, 8), 0, 6.25, z), m: 'gold' });
    }
    // kirişler
    parts.push({ g: at(box(0.45, 0.4, 2 * Z + 0.9, 1), 0, 5.6, 0), m: 'timber' });
    parts.push({ g: at(box(0.35, 0.25, 2 * Z - 0.4, 1), 0, 2.9, 0), m: 'timber' });
    // levha: ahşap zemin + altın çerçeve + iki yüzde yazı
    parts.push({ g: at(box(0.16, 2.3, 6.4, 0.8), 0, 4.15, 0), m: 'planks' });
    parts.push({ g: at(box(0.2, 0.12, 6.6, 1), 0, 5.33, 0), m: 'gold' });
    parts.push({ g: at(box(0.2, 0.12, 6.6, 1), 0, 2.97, 0), m: 'gold' });
    parts.push({ g: at(new THREE.PlaneGeometry(6.2, 2.15), -0.09, 4.15, 0, 0, -Math.PI / 2, 0), m: 'sign_' + v, shadow: false });
    parts.push({ g: at(new THREE.PlaneGeometry(6.2, 2.15), 0.09, 4.15, 0, 0, Math.PI / 2, 0), m: 'sign_' + v, shadow: false });
    // kiremit çatı
    for (const sx of [-1, 1]) parts.push({ g: at(box(1.1, 0.12, 2 * Z + 1.6, 1), sx * 0.42, 6.05, 0, 0, 0, sx * -0.5), m: 'roof_red' });
    parts.push({ g: at(new THREE.SphereGeometry(0.28, 12, 8), 0, 6.55, 0), m: 'gold' });
    return group(parts);
  },
  banner() {
    return group([
      { g: at(cyl(0.05, 0.06, 4.2, 6), 0, 2.1, 0), m: 'timber' },
      { g: at(new THREE.SphereGeometry(0.1, 8, 6), 0, 4.25, 0), m: 'gold' },
      { g: at(new THREE.PlaneGeometry(1.1, 1.8, 1, 4), 0.6, 3.1, 0), m: 'cloth_green' },
      { g: at(new THREE.TorusGeometry(0.22, 0.04, 6, 16), 0.6, 3.3, 0.02), m: 'gold' },
    ]);
  },
  tent() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: at(new THREE.ConeGeometry(2.6, 3.4, 8, 1, true), 0, 1.7, -1.0), m: 'cloth_cream' });
    parts.push({ g: at(cyl(0.05, 0.05, 4.0, 6), 0, 2.0, -1.0), m: 'timber' });
    parts.push({ g: at(new THREE.PlaneGeometry(0.6, 0.4), 0.3, 3.8, -1.0), m: 'cloth_red' });
    return group(parts);
  },
  hay() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    for (const [x, y] of [[-0.6, 0.4], [0.6, 0.4], [0, 1.1]] as const) parts.push({ g: at(cyl(0.45, 0.45, 1.1, 12), x, y, -0.3, 0, 0, Math.PI / 2), m: 'hay' });
    return group(parts);
  },
};

function pineModel(v: number, snow: boolean): Part[] {
  // anime çam: üst üste dört yumuşak koni, net silüet (önceden katman başına 16 sarkık iğne kartı vardı)
  const H = 6.2 + v * 0.6;
  const parts: Part[] = [{ geo: merge([at(cyl(0.12, 0.3, H * 0.55, 8, 1.4), 0, H * 0.275, 0)]), mat: 'bark' }];
  const dark = snow ? 0x2f5e58 : 0x226a4c, light = snow ? 0x7fb0a4 : 0x6fc88a;
  const cones: THREE.BufferGeometry[] = [];
  const tiers = 4;
  for (let t = 0; t < tiers; t++) {
    const k = t / tiers;
    const r = (2.2 - k * 1.55) * (1 + v * 0.06), h = 2.6 - k * 0.6;
    cones.push(cone(0, H * 0.22 + k * H * 0.62, 0, r, h, dark, light, snow, t * 1.7 + v));
  }
  parts.push({ geo: merge(cones, true), mat: 'canopy' });
  return parts;
}

function crystalModel(v: number, m: string): Part[] {
  const r = rng(1000 + v);
  const list: THREE.BufferGeometry[] = [];
  for (let i = 0; i < 6; i++) {
    const h = 0.6 + r() * 1.4 * (i === 0 ? 1.6 : 1);
    const g = new THREE.CylinderGeometry(0, 0.14 + r() * 0.12, h, 6);
    const base = new THREE.CylinderGeometry(0.14, 0.14, 0.01, 6);
    void base;
    at(g, (r() - 0.5) * 0.7, h / 2 - 0.05, (r() - 0.5) * 0.7, (r() - 0.5) * 0.6, r() * 3, (r() - 0.5) * 0.6);
    list.push(g);
  }
  return [{ geo: merge(list), mat: m }, { geo: merge([at(new THREE.IcosahedronGeometry(0.5, 1), 0, 0.05, 0, 0, 0, 0, 1, 0.4, 1)]), mat: 'rock_dark' }];
}

// ───────────── örnekleme (instancing) ─────────────
const modelCache = new Map<string, Part[]>();
export function propModel(k: PropKind, v: number): Part[] | null {
  const key = k + v;
  let m = modelCache.get(key);
  if (m) return m;
  const b = B[k];
  if (!b) return null;
  m = b(v);
  modelCache.set(key, m);
  return m;
}

/** Haritadaki tüm propları türe göre gruplayıp InstancedMesh olarak kurar. */
/** Telefonda ağaç/çalı altına yumuşak zemin gölgesi (güneş gölge haritası yerine). */
const BLOB_R: Partial<Record<PropKind, number>> = { tree: 2.7, pine: 2.3, snowpine: 2.3, bush: 1.2, deadtree: 1.3, rock: 1.0, house: 4.2, stall: 1.6, well: 1.2, tent: 2.4 };
let blobPart: { geo: THREE.BufferGeometry; mat: THREE.Material } | null = null;
function blobGeo() {
  if (blobPart) return blobPart;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const c = cv.getContext('2d')!, gr = c.createRadialGradient(32, 32, 2, 32, 32, 32);
  gr.addColorStop(0, 'rgba(20,40,20,0.42)'); gr.addColorStop(0.6, 'rgba(20,40,20,0.22)'); gr.addColorStop(1, 'rgba(20,40,20,0)');
  c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
  const g = new THREE.PlaneGeometry(2, 2); g.rotateX(-Math.PI / 2); g.translate(0, 0.05, 0);
  blobPart = { geo: g, mat: new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }) };
  return blobPart;
}
export function buildProps(props: Prop[], heightAt: (x: number, y: number) => number, quality: string, blobs = false): THREE.Group {
  const root = new THREE.Group();
  const groups = new Map<string, Prop[]>();
  for (const p of props) {
    if (quality === 'low' && (p.k === 'grasstuft' || p.k === 'flowers')) continue;
    // 40 m'lik hücreler: her hücre ayrı InstancedMesh → görüş/gölge dışı kalanlar çizilmez
    const cell = Math.floor((p.x * U) / 40) + ':' + Math.floor((p.y * U) / 40);
    const key = p.k + '|' + variantFor(p) + '|' + cell;
    const arr = groups.get(key) ?? []; arr.push(p); groups.set(key, arr);
  }
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), pos = new THREE.Vector3(), e = new THREE.Euler();
  for (const [key, list] of groups) {
    const [k, vs] = key.split('|');
    const model = propModel(k as PropKind, Number(vs));
    if (!model) continue;
    const fixedRot = k === 'gate' || k === 'signpost' || k === 'house' || k === 'stall' || k === 'fence' || k === 'dock' || k === 'waterfall' || k === 'tent' || k === 'banner' || k === 'portalstone' || k === 'well';
    for (const part of model) {
      const im = new THREE.InstancedMesh(part.geo, mat(part.mat), list.length);
      list.forEach((p, i) => {
        const rot = fixedRot ? 0 : ((p.x * 7 + p.y * 13) % 628) / 100;
        const scale = (k === 'tree' || k === 'pine' || k === 'snowpine' || k === 'deadtree') ? p.s * 0.8 : k === 'rock' ? p.s * 1.1 : p.s;
        const wy = k === 'lily' || k === 'dock' ? -0.2 : heightAt(p.x, p.y) - 0.03;
        pos.set(p.x * U, wy, p.y * U);
        e.set(0, rot, 0); q.setFromEuler(e); s.setScalar(scale);
        m4.compose(pos, q, s);
        im.setMatrixAt(i, m4);
      });
      im.castShadow = part.shadow !== false && quality !== 'low';
      im.receiveShadow = true;
      im.computeBoundingSphere();
      im.frustumCulled = true;
      root.add(im);
    }
    const br = blobs ? BLOB_R[k as PropKind] : undefined;
    if (br) {
      const bp = blobGeo(), im = new THREE.InstancedMesh(bp.geo, bp.mat, list.length);
      list.forEach((p, i) => { pos.set(p.x * U, heightAt(p.x, p.y) - 0.03, p.y * U); q.identity(); s.setScalar(br * p.s); m4.compose(pos, q, s); im.setMatrixAt(i, m4); });
      im.renderOrder = 1; im.computeBoundingSphere(); root.add(im);
    }
  }
  return root;
}
function variantFor(p: Prop) {
  switch (p.k) {
    case 'tree': return p.v % 3;
    case 'pine': case 'snowpine': return p.v % 2;
    case 'rock': case 'bush': case 'mushroom': case 'crystal': case 'icecrystal': return p.v % 3;
    case 'flowers': return p.v % 5;
    case 'house': case 'stall': return p.v % 4;
    case 'portalstone': return p.v % 3;
    case 'grasstuft': return p.v === 3 ? 3 : 0;
    default: return 0;
  }
}
