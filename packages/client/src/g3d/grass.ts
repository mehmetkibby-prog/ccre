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
    for (let i = 0; i < 3; i++) { const p = new THREE.PlaneGeometry(0.5, 0.38, 1, 2); p.translate(0, 0.19, 0); p.rotateY((i / 3) * Math.PI + 0.3); parts.push(p.toNonIndexed()); }
    const pos: number[] = [], uv: number[] = [], nor: number[] = [];
    for (const p of parts) { pos.push(...p.attributes.position.array); uv.push(...p.attributes.uv.array); }
    for (let i = 0; i < pos.length / 3; i++) nor.push(0, 1, 0);
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    this.geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    this.geo.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
    const frozen = l.def.theme === 'frozen';
    // alpha-to-coverage: MSAA ile yaprak kenarları yumuşar (alfa kesme kenarı titriyordu)
    const m = new THREE.MeshStandardMaterial({ map: leafTexture('grass'), alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 1, color: frozen ? 0xdde6e2 : 0xf4fff0 });
    addWind(m, 0.1, 0.4);
    addFade(m); // rüzgârdan önce çalışır
    this.mat = m;
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
      const k = this.allowed(l.ground[ty * l.w + tx]);
      if (k <= 0 || r1 > Math.min(1, k)) continue;
      if (l.blocked[ty * l.w + tx] && r2 < 0.6) continue;
      p.set(gx, this.heightAt(sx, sy) - 0.02, gz);
      e.set(0, r3 * 6.283, 0); q.setFromEuler(e);
      const sc = 0.6 + r2 * 0.5; s.set(sc, sc * (k > 1 ? 1.2 : 0.9) * (0.75 + r1 * 0.4), sc);
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
