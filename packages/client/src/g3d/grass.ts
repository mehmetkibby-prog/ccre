import * as THREE from 'three';
import { TILE, type MapLayout } from '@col/shared';
import { U } from './terrain.ts';
import { addWind, addFade, fadeR } from './materials.ts';
import { leafTexture } from './textures.ts';

/**
 * Dünyaya sabitlenmiş çimen alanı.
 * Harita 12 m'lik parçalara bölünür; her parçanın çimen konumları parça koordinatından
 * deterministik üretilir. Oyuncu yürüdükçe yalnız yeni giren parçalar eklenir; var olan
 * çimen asla yeniden dizilmez. Kenarda mesafeyle yumuşakça küçülür.
 */
const CHUNK = 12;
function hash(a: number, b: number, s: number) { let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(s, 83492791)) >>> 0; return () => { h = (Math.imul(h ^ (h >>> 15), 2246822507) + 0x9e3779b9) >>> 0; h = Math.imul(h ^ (h >>> 13), 3266489909) >>> 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; }; }

export class GrassField {
  group = new THREE.Group();
  private chunks = new Map<string, THREE.InstancedMesh | null>();
  private geo: THREE.BufferGeometry;
  private mat: THREE.Material;
  private density: number;
  radius: number;
  constructor(private l: MapLayout, private heightAt: (x: number, y: number) => number, quality: string) {
    this.density = quality === 'high' ? 3.6 : 1.5; // m² başına öbek (seyrek, sakin)
    this.radius = quality === 'high' ? 30 : 18;
    fadeR.value = this.radius;
    // 3 çapraz kart; normaller yukarı eğik (yumuşak ışık)
    const parts: THREE.BufferGeometry[] = [];
    for (let i = 0; i < 3; i++) { const p = new THREE.PlaneGeometry(0.46, 0.46, 1, 2); p.translate(0, 0.22, 0); p.rotateY((i / 3) * Math.PI + 0.3); parts.push(p.toNonIndexed()); }
    const pos: number[] = [], uv: number[] = [], nor: number[] = [];
    // her kartın arka yüzü ayrı üçgenlerle (ters sarım): çift yüzlü malzeme arka yüzün normalini aşağı çevirip
    // öbeklerin yarısını kahverengi-koyu gösteriyordu
    for (const p of parts) {
      const P = p.attributes.position.array, T = p.attributes.uv.array;
      pos.push(...P); uv.push(...T);
      for (let t = 0; t < P.length / 9; t++) for (const k of [0, 2, 1]) { const v = t * 3 + k; pos.push(P[v * 3], P[v * 3 + 1], P[v * 3 + 2]); uv.push(T[v * 2], T[v * 2 + 1]); }
    }
    for (let i = 0; i < pos.length / 3; i++) nor.push(0, 1, 0);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const frozen = l.def.theme === 'frozen';
    // alpha-to-coverage KULLANILMAZ: donanım kenar yumuşatması kapalı cihazlarda kartın saydam köşeleri siyah dikdörtgen çiziliyordu
    const m = new THREE.MeshStandardMaterial({ map: leafTexture('grass'), alphaTest: 0.45, side: THREE.FrontSide, roughness: 1, color: frozen ? 0xc8d4d0 : 0xb4c8a0 });
    addWind(m, 0.1, 0.4);
    addFade(m); // rüzgârdan önce çalışır
    this.mat = m;
  }

  /** Karo izin değerinin Gauss ile yumuşatılmış hali: çimen yol kenarında karo karo kesilmesin, yavaşça seyrelsin. */
  private smooth: Float32Array | null = null;
  private allowedAt(sx: number, sy: number): number {
    const l = this.l, W = l.w, H = l.h;
    if (!this.smooth) {
      const R = 2, sg = 0.85, ker = Array.from({ length: R * 2 + 1 }, (_, i) => Math.exp(-((i - R) ** 2) / (2 * sg * sg)));
      const ks = ker.reduce((x, y) => x + y, 0);
      const a = new Float32Array(W * H), b = new Float32Array(W * H);
      for (let k = 0; k < W * H; k++) a[k] = this.allowed(l.ground[k]) * (l.blocked[k] ? 0.4 : 1);
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += a[y * W + Math.min(W - 1, Math.max(0, x + k))] * ker[k + R]; b[y * W + x] = v / ks; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += b[Math.min(H - 1, Math.max(0, y + k)) * W + x] * ker[k + R]; a[y * W + x] = v / ks; }
      this.smooth = a;
    }
    const fx = Math.max(0, Math.min(W - 1.001, sx / TILE - 0.5)), fy = Math.max(0, Math.min(H - 1.001, sy / TILE - 0.5));
    const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0, A = this.smooth;
    const at = (x: number, y: number) => A[Math.min(H - 1, y) * W + Math.min(W - 1, x)];
    return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
  }

  private allowed(gt: number) {
    const th = this.l.def.theme;
    if (th === 'black') return 0;
    if (gt === 0) return 1;
    if (gt === 1) return 1.35;
    if (th === 'frozen' && gt === 6) return 0.12;
    return 0;
  }

  private build(cx: number, cz: number): THREE.InstancedMesh | null {
    const l = this.l;
    const rnd = hash(cx, cz, l.def.seed);
    const target = Math.round(CHUNK * CHUNK * this.density);
    const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    const mats: THREE.Matrix4[] = [];
    for (let i = 0; i < target; i++) {
      const gx = cx * CHUNK + rnd() * CHUNK, gz = cz * CHUNK + rnd() * CHUNK;
      const r1 = rnd(), r2 = rnd(), r3 = rnd();
      const sx = gx / U, sy = gz / U;
      const tx = Math.floor(sx / TILE), ty = Math.floor(sy / TILE);
      if (tx < 0 || ty < 0 || tx >= l.w || ty >= l.h) continue;
      // yumuşak maske + hafif gürültü: kenar doğal kıvrımlı seyrelir (karo sınırı belli olmaz)
      const k = this.allowedAt(sx, sy);
      if (k <= 0.35 || r1 > Math.min(1, (k - 0.35) / 0.4)) continue; // yol kenarında düz çizgide biter
      p.set(gx, this.heightAt(sx, sy) - 0.02, gz);
      e.set(0, r3 * 6.283, 0); q.setFromEuler(e);
      const sc = (0.6 + r2 * 0.5) * (0.55 + 0.45 * Math.min(1, k)); s.set(sc * 1.1, sc * (k > 1 ? 1.0 : 0.78) * (0.75 + r1 * 0.35), sc * 1.1);
      mats.push(m4.compose(p, q, s).clone());
    }
    if (!mats.length) return null;
    const im = new THREE.InstancedMesh(this.geo, this.mat, mats.length);
    mats.forEach((m, i) => im.setMatrixAt(i, m));
    im.receiveShadow = true;
    im.castShadow = false;
    im.computeBoundingSphere();
    return im;
  }

  /** Görüş yarıçapındaki parçaları ekle, uzaktakileri kaldır. Kare başına en fazla 2 parça üretilir. */
  update(px: number, pz: number) {
    const R = this.radius;
    const c0x = Math.floor((px - R) / CHUNK), c1x = Math.floor((px + R) / CHUNK);
    const c0z = Math.floor((pz - R) / CHUNK), c1z = Math.floor((pz + R) / CHUNK);
    const want: [number, number, number][] = [];
    for (let cz = c0z; cz <= c1z; cz++) for (let cx = c0x; cx <= c1x; cx++) {
      if (this.chunks.has(cx + ',' + cz)) continue;
      const d = Math.hypot((cx + 0.5) * CHUNK - px, (cz + 0.5) * CHUNK - pz);
      if (d <= R + CHUNK) want.push([d, cx, cz]);
    }
    want.sort((a, b) => a[0] - b[0]);
    const limit = this.chunks.size === 0 ? want.length : 3;
    for (const [, cx, cz] of want.slice(0, limit)) {
      const im = this.build(cx, cz);
      this.chunks.set(cx + ',' + cz, im);
      if (im) this.group.add(im);
    }
    for (const [key, im] of this.chunks) {
      const [cx, cz] = key.split(',').map(Number);
      const ccx = (cx + 0.5) * CHUNK, ccz = (cz + 0.5) * CHUNK;
      if (Math.hypot(ccx - px, ccz - pz) > R + CHUNK * 2.5) { if (im) { this.group.remove(im); im.dispose(); } this.chunks.delete(key); }
    }
  }
  dispose() { for (const im of this.chunks.values()) if (im) im.dispose(); this.chunks.clear(); this.geo.dispose(); this.mat.dispose(); }
}
