import * as THREE from 'three';

/**
 * Heykel (SDF) tabanlı model üretimi.
 * Vücut ve zırh, yumuşak birleşen işaretli mesafe alanlarından (SDF) oluşur;
 * Surface Nets ile tek parça, dikişsiz bir ağ çıkarılır. Her köşe en yakın iki kemiğe
 * yumuşak ağırlıkla bağlanır: eklemler bükülürken kopmaz.
 */
export type V3 = [number, number, number];
export interface Prim {
  kind: 'cone' | 'ell' | 'box' | 'torus';
  a: V3; b?: V3; r1: number; r2?: number; // koni: a→b yarıçap r1→r2 · elipsoit: a merkez, b yarıçaplar · kutu: a merkez, b yarı boyut, r1 köşe · torus: a merkez, r1 büyük r2 küçük
  rot?: V3; // euler (kutu/elipsoit/torus)
  bone: string;
  color: number;
  mat?: 0 | 1 | 2; // 0 kumaş/deri/ten, 1 metal, 2 parlayan
  k?: number; // yumuşak birleşme
  sub?: boolean; // çıkarma
  noBlend?: boolean; // keskin kenar (zırh plakası)
  solo?: boolean; // aynalanmaz (tek taraflı eşya)
  grp?: string; // çıkarma yalnız aynı gruptaki parçalara uygulanır
}

const tmp = new THREE.Vector3();
interface Compiled { p: Prim; inv: THREE.Matrix4 | null; ax: number; ay: number; az: number; bx: number; by: number; bz: number; bmin: V3; bmax: V3 }

function compile(p: Prim): Compiled {
  let inv: THREE.Matrix4 | null = null;
  if (p.rot && p.kind !== 'cone') {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...p.a), new THREE.Quaternion().setFromEuler(new THREE.Euler(...p.rot)), new THREE.Vector3(1, 1, 1));
    inv = m.invert();
  }
  const b = p.b ?? [0, 0, 0];
  let r = p.r1;
  let lo: V3, hi: V3;
  if (p.kind === 'cone') { r = Math.max(p.r1, p.r2 ?? p.r1); lo = [Math.min(p.a[0], b[0]) - r, Math.min(p.a[1], b[1]) - r, Math.min(p.a[2], b[2]) - r]; hi = [Math.max(p.a[0], b[0]) + r, Math.max(p.a[1], b[1]) + r, Math.max(p.a[2], b[2]) + r]; }
  else if (p.kind === 'ell') { const m = Math.max(...b); lo = [p.a[0] - m, p.a[1] - m, p.a[2] - m]; hi = [p.a[0] + m, p.a[1] + m, p.a[2] + m]; }
  else if (p.kind === 'box') { const m = Math.hypot(...b) + p.r1; lo = [p.a[0] - m, p.a[1] - m, p.a[2] - m]; hi = [p.a[0] + m, p.a[1] + m, p.a[2] + m]; }
  else { const m = p.r1 + (p.r2 ?? 0.02); lo = [p.a[0] - m, p.a[1] - m, p.a[2] - m]; hi = [p.a[0] + m, p.a[1] + m, p.a[2] + m]; }
  const pad = (p.k ?? 0.03) + 0.02;
  return { p, inv, ax: p.a[0], ay: p.a[1], az: p.a[2], bx: b[0], by: b[1], bz: b[2], bmin: [lo[0] - pad, lo[1] - pad, lo[2] - pad], bmax: [hi[0] + pad, hi[1] + pad, hi[2] + pad] };
}

function primDist(c: Compiled, x: number, y: number, z: number): number {
  const p = c.p;
  if (p.kind === 'cone') {
    // iq: yuvarlak koni (iki küre arası)
    const r1 = p.r1, r2 = p.r2 ?? p.r1;
    const bax = c.bx - c.ax, bay = c.by - c.ay, baz = c.bz - c.az;
    const l2 = bax * bax + bay * bay + baz * baz;
    const rr = r1 - r2, a2 = l2 - rr * rr, il2 = 1 / l2;
    const pax = x - c.ax, pay = y - c.ay, paz = z - c.az;
    const yy = pax * bax + pay * bay + paz * baz;
    const zz = yy - l2;
    const qx = pax * l2 - bax * yy, qy = pay * l2 - bay * yy, qz = paz * l2 - baz * yy;
    const x2 = qx * qx + qy * qy + qz * qz;
    const y2 = yy * yy * l2, z2 = zz * zz * l2;
    const k = Math.sign(rr) * rr * rr * x2;
    if (Math.sign(zz) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - r2;
    if (Math.sign(yy) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - r1;
    return (Math.sqrt(x2 * a2 * il2) + yy * rr) * il2 - r1;
  }
  let lx = x - c.ax, ly = y - c.ay, lz = z - c.az;
  if (c.inv) { tmp.set(x, y, z).applyMatrix4(c.inv); lx = tmp.x; ly = tmp.y; lz = tmp.z; }
  if (p.kind === 'ell') {
    const rx = c.bx, ry = c.by, rz = c.bz;
    const k0 = Math.hypot(lx / rx, ly / ry, lz / rz);
    const k1 = Math.hypot(lx / (rx * rx), ly / (ry * ry), lz / (rz * rz));
    return k1 > 1e-9 ? (k0 * (k0 - 1)) / k1 : -Math.min(rx, ry, rz);
  }
  if (p.kind === 'box') {
    const qx = Math.abs(lx) - c.bx + p.r1, qy = Math.abs(ly) - c.by + p.r1, qz = Math.abs(lz) - c.bz + p.r1;
    return Math.hypot(Math.max(qx, 0), Math.max(qy, 0), Math.max(qz, 0)) + Math.min(Math.max(qx, qy, qz), 0) - p.r1;
  }
  // torus (XZ düzleminde)
  const q = Math.hypot(lx, lz) - p.r1;
  return Math.hypot(q, ly) - (p.r2 ?? 0.02);
}

function smin(a: number, b: number, k: number) {
  if (k <= 0) return Math.min(a, b);
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

export interface SculptOut { geo: THREE.BufferGeometry; }

/** SDF'den Surface Nets ağı + renk + kemik ağırlıkları. */
export function sculpt(prims: Prim[], boneIndex: Record<string, number>, bounds: { min: V3; max: V3 }, cell: number): THREE.BufferGeometry {
  const C = prims.map(compile);
  const adds = C.filter((c) => !c.p.sub);
  // gruplar: çıkarma yalnız kendi grubunu oyar (ör. kapüşonun yüz açıklığı yüzü oymaz)
  const groupNames = [...new Set(C.map((c) => c.p.grp ?? ''))];
  const groups = groupNames.map((g) => ({ adds: C.filter((c) => !c.p.sub && (c.p.grp ?? '') === g), subs: C.filter((c) => c.p.sub && (c.p.grp ?? '') === g) }));
  const inBox = (c: Compiled, x: number, y: number, z: number) => !(x < c.bmin[0] || y < c.bmin[1] || z < c.bmin[2] || x > c.bmax[0] || y > c.bmax[1] || z > c.bmax[2]);
  const field = (x: number, y: number, z: number) => {
    let total = 1e9;
    for (const g of groups) {
      let d = 1e9;
      for (let i = 0; i < g.adds.length; i++) {
        const c = g.adds[i];
        if (!inBox(c, x, y, z)) continue;
        const di = primDist(c, x, y, z);
        d = c.p.noBlend ? Math.min(d, di) : smin(d, di, c.p.k ?? 0.03);
      }
      for (let i = 0; i < g.subs.length; i++) {
        const c = g.subs[i];
        if (!inBox(c, x, y, z)) continue;
        d = Math.max(d, -primDist(c, x, y, z));
      }
      total = Math.min(total, d);
    }
    return Math.min(total, 1);
  };
  const [x0, y0, z0] = bounds.min;
  const nx = Math.ceil((bounds.max[0] - x0) / cell) + 1, ny = Math.ceil((bounds.max[1] - y0) / cell) + 1, nz = Math.ceil((bounds.max[2] - z0) / cell) + 1;
  const F = new Float32Array(nx * ny * nz);
  const idx = (i: number, j: number, k: number) => (k * ny + j) * nx + i;
  for (let k = 0; k < nz; k++) for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) F[idx(i, j, k)] = field(x0 + i * cell, y0 + j * cell, z0 + k * cell);
  // hücre köşeleri ve kenarları
  const corners = [[0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1]];
  const edges = [[0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7]];
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i: number, j: number, k: number) => (k * (ny - 1) + j) * (nx - 1) + i;
  const pos: number[] = [];
  for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    let mask = 0;
    const v: number[] = [];
    for (let c = 0; c < 8; c++) { const val = F[idx(i + corners[c][0], j + corners[c][1], k + corners[c][2])]; v.push(val); if (val < 0) mask |= 1 << c; }
    if (mask === 0 || mask === 255) continue;
    let sx = 0, sy = 0, sz = 0, n = 0;
    for (const [a, b] of edges) {
      const va = v[a], vb = v[b];
      if ((va < 0) === (vb < 0)) continue;
      const t = va / (va - vb);
      sx += corners[a][0] + (corners[b][0] - corners[a][0]) * t;
      sy += corners[a][1] + (corners[b][1] - corners[a][1]) * t;
      sz += corners[a][2] + (corners[b][2] - corners[a][2]) * t;
      n++;
    }
    cellVert[cidx(i, j, k)] = pos.length / 3;
    pos.push(x0 + (i + sx / n) * cell, y0 + (j + sy / n) * cell, z0 + (k + sz / n) * cell);
  }
  // yüzeyler
  const index: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) index.push(a, b, c, a, c, d); else index.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
    const s0 = F[idx(i, j, k)] < 0, s1 = F[idx(i + 1, j, k)] < 0;
    if (s0 !== s1) quad(cellVert[cidx(i, j - 1, k - 1)], cellVert[cidx(i, j, k - 1)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j - 1, k)], s0);
  }
  for (let k = 1; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = F[idx(i, j, k)] < 0, s1 = F[idx(i, j + 1, k)] < 0;
    if (s0 !== s1) quad(cellVert[cidx(i - 1, j, k - 1)], cellVert[cidx(i - 1, j, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i, j, k - 1)], s0);
  }
  for (let k = 0; k < nz - 1; k++) for (let j = 1; j < ny - 1; j++) for (let i = 1; i < nx - 1; i++) {
    const s0 = F[idx(i, j, k)] < 0, s1 = F[idx(i, j, k + 1)] < 0;
    if (s0 !== s1) quad(cellVert[cidx(i - 1, j - 1, k)], cellVert[cidx(i, j - 1, k)], cellVert[cidx(i, j, k)], cellVert[cidx(i - 1, j, k)], s0);
  }
  // köşe öznitelikleri: normal (gradyan), renk, malzeme, kemik ağırlıkları, uv
  const vc = pos.length / 3;
  const nor = new Float32Array(vc * 3), col = new Float32Array(vc * 3), uv = new Float32Array(vc * 2);
  const si = new Uint16Array(vc * 4), sw = new Float32Array(vc * 4);
  const matOf = new Uint8Array(vc);
  const e = cell * 0.5;
  const colr = new THREE.Color();
  for (let v = 0; v < vc; v++) {
    const x = pos[v * 3], y = pos[v * 3 + 1], z = pos[v * 3 + 2];
    let gx = field(x + e, y, z) - field(x - e, y, z), gy = field(x, y + e, z) - field(x, y - e, z), gz = field(x, y, z + e) - field(x, y, z - e);
    const gl = Math.hypot(gx, gy, gz) || 1; gx /= gl; gy /= gl; gz /= gl;
    nor[v * 3] = gx; nor[v * 3 + 1] = gy; nor[v * 3 + 2] = gz;
    // en yakın parça → renk; en yakın iki farklı kemik → ağırlık
    let best = 1e9, bestC: Compiled | null = null;
    let b1 = '', d1 = 1e9, b2 = '', d2 = 1e9;
    for (const c of adds) {
      if (x < c.bmin[0] || y < c.bmin[1] || z < c.bmin[2] || x > c.bmax[0] || y > c.bmax[1] || z > c.bmax[2]) continue;
      const d = primDist(c, x, y, z);
      if (d < best) { best = d; bestC = c; }
      const bn = c.p.bone;
      if (bn === b1) { if (d < d1) d1 = d; }
      else if (d < d1) { b2 = b1; d2 = d1; b1 = bn; d1 = d; }
      else if (bn !== b1 && d < d2) { b2 = bn; d2 = d; }
    }
    const p = bestC?.p;
    colr.set(p ? p.color : 0xff00ff);
    col[v * 3] = colr.r; col[v * 3 + 1] = colr.g; col[v * 3 + 2] = colr.b;
    matOf[v] = p?.mat ?? 0;
    const i1 = boneIndex[b1] ?? 0, i2 = boneIndex[b2] ?? i1;
    let w1 = 1, w2 = 0;
    if (b2 && d2 - d1 < 0.06) { const t = (d2 - d1) / 0.06; w1 = 0.5 + 0.5 * t; w2 = 1 - w1; }
    si[v * 4] = i1; si[v * 4 + 1] = i2; sw[v * 4] = w1; sw[v * 4 + 1] = w2;
    uv[v * 2] = Math.atan2(x, z) * 0.35 + 0.5; uv[v * 2 + 1] = y * 2.2;
  }
  // malzeme gruplarına göre üçgenleri sırala
  const tris: number[][] = [[], [], []];
  for (let t = 0; t < index.length; t += 3) {
    const a = index[t], b = index[t + 1], c = index[t + 2];
    const m = Math.max(matOf[a], matOf[b], matOf[c]) === 2 ? 2 : (matOf[a] + matOf[b] + matOf[c]) >= 2 ? 1 : 0;
    tris[m].push(a, b, c);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  geo.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
  geo.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
  const all: number[] = [];
  let start = 0;
  for (let m = 0; m < 3; m++) { const t = tris[m]; for (let i = 0; i < t.length; i++) all.push(t[i]); geo.addGroup(start, t.length, m); start += t.length; }
  geo.setIndex(all);
  geo.computeBoundingSphere();
  return geo;
}
