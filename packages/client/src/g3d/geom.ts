import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** Dünya ölçekli UV'li kutu: dokular gerilmez. */
export function box(w: number, h: number, d: number, texScale = 1): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  // BoxGeometry yüz sırası: +x,-x,+y,-y,+z,-z; her yüz 4 köşe
  const dims: [number, number][] = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
    const i = f * 4 + k;
    uv.setXY(i, uv.getX(i) * dims[f][0] / texScale, uv.getY(i) * dims[f][1] / texScale);
  }
  return g;
}
export function cyl(rTop: number, rBot: number, h: number, seg = 10, texScale = 1, open = false): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBot, h, seg, 1, open);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const circ = Math.PI * 2 * Math.max(rTop, rBot);
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * circ / texScale, uv.getY(i) * h / texScale);
  return g;
}
export function lathe(profile: [number, number][], seg = 16, texScale = 1): THREE.BufferGeometry {
  const g = new THREE.LatheGeometry(profile.map(([r, y]) => new THREE.Vector2(r, y)), seg);
  const uv = g.attributes.uv as THREE.BufferAttribute;
  const maxR = Math.max(...profile.map((p) => p[0]));
  const hgt = Math.max(...profile.map((p) => p[1])) - Math.min(...profile.map((p) => p[1]));
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * Math.PI * 2 * maxR / texScale, uv.getY(i) * hgt / texScale);
  return g;
}
export function at(g: THREE.BufferGeometry, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx): THREE.BufferGeometry {
  const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  g.applyMatrix4(m);
  return g;
}
/** Yalnız konum/normal/uv tutar (birleştirme uyumluluğu). */
export function clean(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ng = g.index ? g.toNonIndexed() : g;
  for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) ng.deleteAttribute(k);
  if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2));
  return ng;
}
export function colorize(g: THREE.BufferGeometry, c: THREE.ColorRepresentation | ((p: THREE.Vector3, n: THREE.Vector3) => THREE.Color)): THREE.BufferGeometry {
  const pos = g.attributes.position, nor = g.attributes.normal;
  const arr = new Float32Array(pos.count * 3);
  const p = new THREE.Vector3(), n = new THREE.Vector3();
  const fixed = typeof c === 'function' ? null : new THREE.Color(c);
  for (let i = 0; i < pos.count; i++) {
    const col = fixed ?? (c as (p: THREE.Vector3, n: THREE.Vector3) => THREE.Color)(p.fromBufferAttribute(pos, i), n.fromBufferAttribute(nor, i));
    arr[i * 3] = col.r; arr[i * 3 + 1] = col.g; arr[i * 3 + 2] = col.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}
export function merge(list: THREE.BufferGeometry[], withColor = false): THREE.BufferGeometry {
  const cl = list.map((g) => {
    const c = clean(g);
    if (withColor && !c.attributes.color) colorize(c, 0xffffff);
    if (!withColor && c.attributes.color) c.deleteAttribute('color');
    return c;
  });
  const m = mergeGeometries(cl, false)!;
  m.computeBoundingSphere();
  return m;
}
/** Kart (yaprak) için normal: merkezden dışarı bakan yumuşak normal → kabarık görünüm */
export function radialNormals(g: THREE.BufferGeometry, center: THREE.Vector3, upBias = 0.4) {
  const pos = g.attributes.position, nor = g.attributes.normal as THREE.BufferAttribute;
  const p = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p.fromBufferAttribute(pos, i).sub(center); p.y += upBias; p.normalize();
    nor.setXYZ(i, p.x, p.y, p.z);
  }
}
export function rng(seed: number) { let s = seed >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; }
