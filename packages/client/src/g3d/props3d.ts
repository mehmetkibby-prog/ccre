import * as THREE from 'three';
import type { Prop, PropKind } from '@col/shared';
import { box, cyl, lathe, at, merge, colorize, radialNormals, rng } from './geom.ts';
import { mat } from './materials.ts';
import { fbm } from './textures.ts';
import { U } from './terrain.ts';

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
    const leaves: THREE.BufferGeometry[] = [];
    for (const [x, y, z] of tips) leaves.push(leafCluster(r, x, y, z, 1.35 + r() * 0.3, 34, 1.4));
    leaves.push(leafCluster(r, 0, H + 0.3, 0, 1.9, 46, 1.5));
    const res = group(parts);
    res.push({ geo: merge(leaves), mat: v === 2 ? 'leaves_autumn' : 'leaves' });
    return res;
  },
  pine(v) { return pineModel(v, false); },
  snowpine(v) { return pineModel(v, true); },
  deadtree(v) {
    const r = rng(300 + v);
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    const branch = (o: THREE.Vector3, dir: THREE.Vector3, l: number, rad: number, d: number) => {
      if (d > 3 || l < 0.3) return;
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
    const leaves = [leafCluster(r, 0, 0.6, 0, 0.75, 30, 0.9), leafCluster(r, 0.5, 0.45, 0.2, 0.55, 18, 0.8), leafCluster(r, -0.45, 0.45, -0.1, 0.55, 18, 0.8)];
    const res: Part[] = [{ geo: merge(leaves), mat: 'bush' }];
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
  fountain() {
    const parts: { g: THREE.BufferGeometry; m: string }[] = [];
    parts.push({ g: lathe([[0, 0], [2.3, 0], [2.4, 0.15], [2.4, 0.7], [2.1, 0.75], [2.0, 0.3], [0, 0.3]], 32, 1.2), m: 'stonewall' });
    parts.push({ g: at(new THREE.CylinderGeometry(2.05, 2.05, 0.05, 32), 0, 0.55, 0), m: 'water_small' });
    parts.push({ g: lathe([[0, 0], [0.35, 0], [0.28, 0.4], [0.25, 1.6], [0.35, 1.8], [0, 1.8]], 16, 1), m: 'stonewall' });
    parts.push({ g: at(lathe([[0, 0], [0.2, 0], [0.9, 0.3], [1.0, 0.45], [0.85, 0.45], [0, 0.25]], 24, 1), 0, 1.75, 0), m: 'stonewall' });
    parts.push({ g: at(new THREE.CylinderGeometry(0.85, 0.85, 0.04, 24), 0, 2.15, 0), m: 'water_small' });
    parts.push({ g: at(new THREE.OctahedronGeometry(0.32, 0), 0, 2.75, 0, 0, 0.4, 0, 1, 1.5, 1), m: 'rune_green' });
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
    return [{ geo: merge(list), mat: v === 3 ? 'needles_snow' : 'grass', shadow: false }];
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
  const r = rng(200 + v);
  const H = 7 + v * 0.5;
  const parts: { g: THREE.BufferGeometry; m: string }[] = [{ g: at(cyl(0.08, 0.3, H, 8, 1.4), 0, H / 2, 0), m: 'bark' }];
  const cards: THREE.BufferGeometry[] = [];
  const cores: THREE.BufferGeometry[] = [];
  const tiers = 11;
  for (let t = 0; t < tiers; t++) {
    const k = t / tiers;
    const y = 1.2 + k * (H - 1.3);
    const len = 2.2 * (1 - k) + 0.35;
    // koyu iç koni: yoğunluk hissi
    if (t % 2 === 0) cores.push(at(new THREE.ConeGeometry(len * 0.7, len * 0.9, 9, 1, true), 0, y + len * 0.2, 0));
    const n = 9;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + t * 0.7 + r() * 0.4;
      const droop = 0.35 + r() * 0.2;
      for (const cross of [0, Math.PI / 2]) {
        const g = new THREE.PlaneGeometry(len * 0.5, len);
        g.translate(0, len / 2, 0);
        g.rotateY(cross);
        g.rotateZ(-Math.PI / 2 + droop);
        g.rotateY(-a);
        g.translate(0, y, 0);
        cards.push(g);
      }
    }
  }
  const leaf = merge(cards);
  radialNormals(leaf, new THREE.Vector3(0, H * 0.35, 0), 1.0);
  const res = group(parts);
  const core = merge(cores);
  res.push({ geo: core, mat: snow ? 'pine_core_snow' : 'pine_core' });
  res.push({ geo: leaf, mat: snow ? 'needles_snow' : 'needles' });
  if (snow) {
    const caps: THREE.BufferGeometry[] = [];
    for (let t = 0; t < 6; t++) { const y = 1.6 + t * (H - 2) / 6, rad = 2.0 * (1 - t / 6) + 0.3; caps.push(at(new THREE.ConeGeometry(rad * 0.75, 0.45, 10, 1, true), 0, y + 0.35, 0)); }
    res.push({ geo: merge(caps), mat: 'snow' });
  }
  return res;
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
export function buildProps(props: Prop[], heightAt: (x: number, y: number) => number, quality: string): THREE.Group {
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
    const fixedRot = k === 'house' || k === 'stall' || k === 'fence' || k === 'dock' || k === 'waterfall' || k === 'tent' || k === 'banner' || k === 'portalstone' || k === 'well';
    for (const part of model) {
      const im = new THREE.InstancedMesh(part.geo, mat(part.mat), list.length);
      list.forEach((p, i) => {
        const rot = fixedRot ? 0 : ((p.x * 7 + p.y * 13) % 628) / 100;
        const scale = (k === 'tree' || k === 'pine' || k === 'snowpine' || k === 'deadtree') ? p.s * 1.15 : k === 'rock' ? p.s * 1.1 : p.s;
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
