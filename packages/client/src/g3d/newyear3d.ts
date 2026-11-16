import * as THREE from 'three';
import type { MapLayout, Prop } from '@col/shared';
import { U } from './terrain.ts';
import { glowTexture } from './textures.ts';
import { model as loadGlb, onModelReady } from './models.ts';

/**
 * Pazar Köyü yeni yıl süsü (yalnız görsel, sunucu çarpışmasına dokunmaz):
 *  - çeşmenin yerinde Meshy yılbaşı ağacı (çeşmenin engelli alanı ağacın gövdesini kaplar),
 *    üstünde göz kırpan renkli ampuller, parlayan yıldız ve zeminde sıcak ışık halesi;
 *  - her evin saçağı ile kat kirişi boyunca sarkık ampul dizileri, kapıda çelenk, çatıda kar örtüsü.
 * Ampuller tek bir nokta bulutu (tek çizim çağrısı); renkleri bilgisayarda parlama (bloom) efektine de girer.
 */
const TREE_H = 8.2;
const BULB_COLS = [0xff3a3a, 0xffc83a, 0x3ad06a, 0x3a8cff, 0xff6ad8, 0xfff2c8];

function bulbMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uViewH: { value: 800 } },
    vertexShader: `
      attribute vec3 color; attribute float phase; attribute float size;
      uniform float uTime; uniform float uViewH;
      varying vec3 vCol; varying float vTw;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        gl_Position = projectionMatrix * mv;
        // yavaş göz kırpma + dizi boyunca akan dalga
        float tw = 0.5 + 0.5 * sin(uTime * (1.4 + fract(phase * 7.13) * 1.6) + phase * 6.2831);
        vTw = 0.35 + 0.65 * tw * tw;
        vCol = color;
        gl_PointSize = clamp(size * projectionMatrix[1][1] * uViewH * 0.5 / max(0.5, -mv.z), 1.5, 48.0);
      }`,
    fragmentShader: `
      varying vec3 vCol; varying float vTw;
      void main() {
        float d = length(gl_PointCoord - 0.5) * 2.0;
        if (d > 1.0) discard;
        float core = smoothstep(0.42, 0.12, d);
        float halo = exp(-d * d * 5.0) * 0.55;
        vec3 c = vCol * (halo + core * 1.6) * vTw + vec3(core * 0.35 * vTw);
        gl_FragColor = vec4(c, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
}

class Bulbs {
  pos: number[] = []; col: number[] = []; ph: number[] = []; sz: number[] = [];
  private c = new THREE.Color();
  add(x: number, y: number, z: number, ci: number, phase: number, size = 0.32) {
    this.pos.push(x, y, z);
    this.c.setHex(BULB_COLS[ci % BULB_COLS.length]);
    this.col.push(this.c.r, this.c.g, this.c.b);
    this.ph.push(phase); this.sz.push(size);
  }
  /** iki nokta arasında sarkık dizi */
  string(ax: number, ay: number, az: number, bx: number, by: number, bz: number, n: number, sag: number, seed: number, size?: number) {
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      this.add(ax + (bx - ax) * t, ay + (by - ay) * t - Math.sin(t * Math.PI) * sag, az + (bz - az) * t, i + seed, (i + seed) * 0.37 + t * 2, size);
    }
  }
  build(mat: THREE.ShaderMaterial) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(this.col, 3));
    g.setAttribute('phase', new THREE.Float32BufferAttribute(this.ph, 1));
    g.setAttribute('size', new THREE.Float32BufferAttribute(this.sz, 1));
    g.computeBoundingSphere();
    const p = new THREE.Points(g, mat);
    p.frustumCulled = true; p.renderOrder = 4;
    return p;
  }
}

/** props3d'deki ev ölçüleri (house builder ile aynı) */
const HW = 6.4, HD = 4.6, H1 = 2.7, H2 = 2.3;
const Z0 = -HD / 2 - 0.2, FZ = Z0 + HD / 2 + 0.02, FZ2 = Z0 + (HD + 0.5) / 2 + 0.02;
const RW = HW + 1.4, RUN = (HD + 1.4) / 2, RISE = 2.5, ROOF_Y = 0.6 + H1 + H2;

export class NewYearFx {
  group = new THREE.Group();
  private mat = bulbMaterial();
  private star: THREE.Sprite | null = null;
  private starBase = 1;
  private offModel: (() => void) | null = null;
  private disposables: { dispose(): void }[] = [this.mat];

  constructor(private l: MapLayout, private heightAt: (x: number, y: number) => number, mobile: boolean) {
    const bulbs = new Bulbs();
    // ── evler ──
    const snowMat = new THREE.MeshStandardMaterial({ color: 0xc9d1dc, roughness: 0.92, metalness: 0 });
    const wreathMat = new THREE.MeshStandardMaterial({ color: 0x1f5a2c, roughness: 0.85 });
    const bowMat = new THREE.MeshStandardMaterial({ color: 0xc81e2a, roughness: 0.6 });
    this.disposables.push(snowMat, wreathMat, bowMat);
    const slope = Math.atan2(RISE, RUN), len = Math.hypot(RUN, RISE);
    const snowG: THREE.BufferGeometry[] = [], wreathG: THREE.BufferGeometry[] = [], bowG: THREE.BufferGeometry[] = [];
    const houses = l.props.filter((p) => p.k === 'house');
    houses.forEach((p, hi) => {
      const ox = p.x * U, oz = p.y * U, oy = heightAt(p.x, p.y) - 0.03, s = p.s;
      const P = (x: number, y: number, z: number): [number, number, number] => [ox + x * s, oy + y * s, oz + z * s];
      // çatı karı: iki eğimli plakanın üstünde ince beyaz örtü
      for (const sg of [-1, 1]) {
        const g = new THREE.BoxGeometry(RW - 0.05, 0.16, len + 0.12);
        g.rotateX(sg * slope);
        g.translate(0, ROOF_Y + RISE / 2 + 0.15, Z0 + sg * RUN / 2);
        g.scale(s, s, s); g.translate(ox, oy, oz);
        snowG.push(g);
      }
      // ön saçak dizisi: dört askı arasında sarkık
      const ey = ROOF_Y - 0.18, ez = Z0 + RUN + 0.12;
      for (let k = 0; k < 4; k++) {
        const x0 = -RW / 2 + (RW * k) / 4, x1 = -RW / 2 + (RW * (k + 1)) / 4;
        const a = P(x0, ey, ez), b = P(x1, ey, ez);
        bulbs.string(a[0], a[1], a[2], b[0], b[1], b[2], 6, 0.28 * s, hi * 31 + k * 7);
      }
      // alın kenarları (yan üçgenler) boyunca: saçaktan mahyaya
      for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
        const a = P(sx * RW / 2, ROOF_Y - 0.05, Z0 + sz * (RUN + 0.08)), b = P(sx * RW / 2, ROOF_Y + RISE + 0.12, Z0);
        bulbs.string(a[0], a[1], a[2], b[0], b[1], b[2], 7, 0, hi * 17 + sx * 5 + sz * 3 + 40, 0.28);
      }
      // kat kirişi dizisi
      const by = 0.6 + H1 - 0.12, bz = FZ2 + 0.14;
      for (let k = 0; k < 3; k++) {
        const x0 = -(HW + 0.5) / 2 + ((HW + 0.5) * k) / 3, x1 = -(HW + 0.5) / 2 + ((HW + 0.5) * (k + 1)) / 3;
        const a = P(x0, by, bz), b = P(x1, by, bz);
        bulbs.string(a[0], a[1], a[2], b[0], b[1], b[2], 5, 0.2 * s, hi * 13 + k * 5 + 90, 0.26);
      }
      // kapıda çelenk (kapı üstü kirişin hemen altında) ve kırmızı fiyonk
      const wy = 0.6 + 1.62, wz = FZ + 0.2;
      const t = new THREE.TorusGeometry(0.34, 0.11, 8, 18); t.scale(s, s, s); t.translate(...P(0, wy, wz)); wreathG.push(t);
      const bw = new THREE.BoxGeometry(0.26, 0.16, 0.08); bw.scale(s, s, s); bw.translate(...P(0, wy - 0.34, wz + 0.08)); bowG.push(bw);
      for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; const q = P(Math.cos(a) * 0.34, wy + Math.sin(a) * 0.34, wz + 0.1); bulbs.add(q[0], q[1], q[2], i % 2 ? 0 : 1, i * 0.8 + hi, 0.16); }
    });
    const mk = (gs: THREE.BufferGeometry[], m: THREE.Material, shadow: boolean) => {
      if (!gs.length) return;
      const g = mergeGeos(gs); gs.forEach((x) => x.dispose());
      const mesh = new THREE.Mesh(g, m); mesh.castShadow = shadow && !mobile; mesh.receiveShadow = true;
      this.group.add(mesh); this.disposables.push(g);
    };
    mk(snowG, snowMat, false); mk(wreathG, wreathMat, false); mk(bowG, bowMat, false);
    // ── fener direklerine sarmal ampul (kırmızı-altın) ──
    for (const p of l.props.filter((q) => q.k === 'lamp')) {
      const x = p.x * U, z = p.y * U, y0 = heightAt(p.x, p.y);
      for (let i = 0; i < 14; i++) { const t = i / 13, a = t * Math.PI * 2 * 3; bulbs.add(x + Math.cos(a) * 0.14, y0 + 0.35 + t * 2.5, z + Math.sin(a) * 0.14, i % 2 ? 0 : 1, i * 0.45 + p.x, 0.17); }
    }
    this.group.add(bulbs.build(this.mat));
    // ── meydan ağacı ──
    const f = l.props.find((p) => p.k === 'fountain');
    if (f) {
      if (!this.addTree(f)) this.offModel = onModelReady((id) => { if (id === 'ny_tree' && this.addTree(f)) { this.offModel?.(); this.offModel = null; } });
    }
  }

  private addTree(f: Prop): boolean {
    const L = loadGlb('ny_tree');
    if (!L) return false;
    const root = L.scene.clone(true);
    root.position.set(0, 0, 0); root.rotation.set(0, 0, 0); root.scale.setScalar(1);
    root.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(root);
    const sc = TREE_H / Math.max(0.01, box.max.y - box.min.y);
    const cx = (box.min.x + box.max.x) / 2, cz = (box.min.z + box.max.z) / 2;
    const wx = f.x * U, wz = f.y * U, wy = this.heightAt(f.x, f.y) - 0.05;
    const holder = new THREE.Group();
    root.position.set(-cx, -box.min.y, -cz);
    holder.add(root);
    holder.scale.setScalar(sc);
    holder.position.set(wx, wy, wz);
    holder.rotation.y = 0.35;
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.castShadow = true; m.receiveShadow = true;
      const src = m.material as THREE.MeshStandardMaterial;
      if (src?.isMeshStandardMaterial) { src.roughness = 0.75; src.metalness = 0; if (src.map) { src.map.anisotropy = 4; src.emissiveMap = src.map; src.emissive.setScalar(0.22); } }
    });
    this.group.add(holder);
    holder.updateMatrixWorld(true);
    // ── ağaç ampulleri: dış yüzeye yakın tepe noktalarından örnek, sarmal renk sırası ──
    const pts: THREE.Vector3[] = [];
    const v = new THREE.Vector3();
    holder.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const pa = m.geometry.attributes.position as THREE.BufferAttribute;
      const stepN = Math.max(1, Math.floor(pa.count / 4000));
      for (let i = 0; i < pa.count; i += stepN) { v.fromBufferAttribute(pa, i).applyMatrix4(m.matrixWorld); pts.push(v.clone()); }
    });
    const bins = 24, maxR = new Float32Array(bins);
    const hOf = (p: THREE.Vector3) => Math.min(bins - 1, Math.max(0, Math.floor(((p.y - wy) / TREE_H) * bins)));
    const rOf = (p: THREE.Vector3) => Math.hypot(p.x - wx, p.z - wz);
    for (const p of pts) { const b = hOf(p); maxR[b] = Math.max(maxR[b], rOf(p)); }
    const cand = pts.filter((p) => { const t = (p.y - wy) / TREE_H; return t > 0.12 && t < 0.9 && rOf(p) > maxR[hOf(p)] * 0.78; });
    const bulbs = new Bulbs();
    const want = 170; let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < want && cand.length; i++) {
      const p = cand[Math.floor(rnd() * cand.length)];
      // biraz dışarı it: dalların içinde kaybolmasın
      const dx = p.x - wx, dz = p.z - wz, r = Math.hypot(dx, dz) || 1;
      const t = (p.y - wy) / TREE_H;
      bulbs.add(p.x + (dx / r) * 0.12, p.y, p.z + (dz / r) * 0.12, Math.floor(t * 9 + Math.atan2(dz, dx) * 1.5 + 9), rnd() * 10, 0.34);
    }
    this.group.add(bulbs.build(this.mat));
    // tepe yıldızı parıltısı ve zemin halesi
    const top = new THREE.Vector3(wx, wy + TREE_H * 0.965, wz);
    const star = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffe08a, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    star.position.copy(top); star.scale.setScalar(2.4); star.renderOrder = 5;
    this.star = star; this.starBase = 2.4;
    this.group.add(star);
    const halo = new THREE.Mesh(new THREE.CircleGeometry(5.2, 40), new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffb860, transparent: true, opacity: 0.38, depthWrite: false, blending: THREE.AdditiveBlending, polygonOffset: true, polygonOffsetFactor: -2 }));
    halo.rotation.x = -Math.PI / 2; halo.position.set(wx, wy + 0.08, wz); halo.renderOrder = 2;
    this.group.add(halo);
    this.disposables.push(halo.geometry, halo.material as THREE.Material, star.material);
    return true;
  }

  update(now: number, viewH: number) {
    this.mat.uniforms.uTime.value = now / 1000;
    this.mat.uniforms.uViewH.value = viewH;
    if (this.star) { const k = 1 + Math.sin(now / 380) * 0.12 + Math.sin(now / 157) * 0.05; this.star.scale.setScalar(this.starBase * k); }
  }

  dispose() {
    this.offModel?.();
    for (const d of this.disposables) d.dispose();
    this.group.traverse((o) => { const p = o as THREE.Points; if (p.isPoints) p.geometry.dispose(); });
    void this.l;
  }
}

function mergeGeos(gs: THREE.BufferGeometry[]): THREE.BufferGeometry {
  // yalnız position/normal (uv'siz düz malzeme)
  let n = 0, idx = 0;
  const ng = gs.map((g) => (g.index ? g : g));
  for (const g of ng) { n += g.attributes.position.count; idx += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3), ind = new Uint32Array(idx);
  let o = 0, io = 0;
  for (const g of ng) {
    const c = g.attributes.position.count;
    pos.set(g.attributes.position.array as Float32Array, o * 3);
    nor.set(g.attributes.normal.array as Float32Array, o * 3);
    if (g.index) for (let i = 0; i < g.index.count; i++) ind[io++] = g.index.getX(i) + o;
    else for (let i = 0; i < c; i++) ind[io++] = i + o;
    o += c;
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setIndex(new THREE.BufferAttribute(ind, 1));
  out.computeBoundingSphere();
  return out;
}
