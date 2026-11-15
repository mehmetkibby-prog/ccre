import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { glowTexture } from './textures.ts';
import { U } from './terrain.ts';
import type { Fx3D } from './fx3d.ts';

/**
 * Beceri efektleri: yerde dönen rün daireleri (Meshy dokuları), şok dalgası, ışık sütunu, gökten inen ışık kılıcı,
 * altın zincir, ok yağmuru, buz/diken fışkırması, kaya parçaları, kalkan kubbesi, ışık huzmesi ve mermiler.
 *
 * Performans: geometri/doku/gölgelendiriciler ortak; her efekt kısa ömürlü ve sayısı sınırlı. Kalite düzeyi
 * (q: 0 ısınma modu, 1 telefon, 2 bilgisayar) parçacık sayısını ve ışığı ayarlar. Uzaktaki oyuncuların becerileri
 * sadeleşir; çok kalabalıkta başkalarının efektleri kırpılır, kendi efektin hep tam görünür.
 * Konumlar sunucu birimindedir (x,y); yükseklikler metredir.
 */

type P = { x: number; y: number };
interface El { o: THREE.Object3D; t0: number; dur: number; upd: (k: number, now: number) => void; mats: THREE.Material[]; own?: THREE.BufferGeometry[] }

const TEX = new Map<string, THREE.Texture>();
function tex(name: string) {
  let t = TEX.get(name);
  if (!t) { t = new THREE.TextureLoader().load(`/textures/vfx/${name}.jpg`); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; TEX.set(name, t); }
  return t;
}
export type Circle = 'holy' | 'arcane' | 'frost' | 'nature' | 'crack';

function canvasTex(size: number, draw: (c: CanvasRenderingContext2D, s: number) => void, wrap = false) {
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  draw(cv.getContext('2d')!, size);
  const t = new THREE.CanvasTexture(cv);
  if (wrap) { t.wrapS = t.wrapT = THREE.RepeatWrapping; }
  return t;
}
let ringT: THREE.Texture | null = null, streakT: THREE.Texture | null = null, noiseT: THREE.Texture | null = null;
/** Yumuşak halka (şok dalgası): dış kenar parlak, içe doğru sönen. */
const ringTex = () => ringT ??= canvasTex(256, (c, s) => {
  const g = c.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.55, 'rgba(255,255,255,0.05)'); g.addColorStop(0.82, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.93, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
/** Işık huzmesi kesiti: ortası parlak, kenarları sönük (V yönünde). */
const streakTex = () => streakT ??= canvasTex(64, (c, s) => {
  const g = c.createLinearGradient(0, 0, 0, s);
  g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.35, 'rgba(255,255,255,0.35)'); g.addColorStop(0.5, 'rgba(255,255,255,1)');
  g.addColorStop(0.65, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, s, s);
});
/** Döşenebilir yumuşak gürültü (enerji sütunu akışı). */
const noiseTex = () => noiseT ??= canvasTex(128, (c, s) => {
  const img = c.createImageData(s, s);
  const grid = 8, rnd: number[] = [];
  for (let i = 0; i < grid * grid; i++) rnd.push(Math.random());
  const at = (x: number, y: number) => rnd[((y % grid + grid) % grid) * grid + ((x % grid + grid) % grid)];
  for (let y = 0; y < s; y++) for (let x = 0; x < s; x++) {
    const fx = x / s * grid, fy = y / s * grid, ix = Math.floor(fx), iy = Math.floor(fy), u = fx - ix, v = fy - iy;
    const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v);
    const n = at(ix, iy) * (1 - su) * (1 - sv) + at(ix + 1, iy) * su * (1 - sv) + at(ix, iy + 1) * (1 - su) * sv + at(ix + 1, iy + 1) * su * sv;
    const vv = Math.pow(n, 1.6) * 255, i = (y * s + x) * 4;
    img.data[i] = img.data[i + 1] = img.data[i + 2] = vv; img.data[i + 3] = 255;
  }
  c.putImageData(img, 0, 0);
}, true);

let flatG: THREE.PlaneGeometry | null = null;
const flatGeo = () => { if (!flatG) { flatG = new THREE.PlaneGeometry(2, 2); flatG.rotateX(-Math.PI / 2); } return flatG; };
let beamG: THREE.BufferGeometry | null = null;
/** Çapraz iki şerit (X kesitli huzme): her açıdan görünür. Uzunluk +Z yönünde 0..1. */
const beamGeo = () => {
  if (beamG) return beamG;
  const a = new THREE.PlaneGeometry(1, 1); a.translate(0, 0, 0); a.rotateY(Math.PI / 2); a.translate(0, 0, 0.5);
  const b = a.clone(); b.rotateZ(Math.PI / 2);
  // rotateY sonrası düzlem YZ'de; uzunluk Z boyunca 1, genişlik Y boyunca 1
  return (beamG = mergeGeometries([a, b])!);
};
let colG: THREE.CylinderGeometry | null = null;
const colGeo = () => { if (!colG) { colG = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true); colG.translate(0, 0.5, 0); } return colG; };
let domeG: THREE.SphereGeometry | null = null;
const domeGeo = () => domeG ??= new THREE.SphereGeometry(1, 28, 18);
let chainG: THREE.TorusGeometry | null = null;
const chainGeo = () => chainG ??= new THREE.TorusGeometry(0.075, 0.022, 5, 10);
let arrowG: THREE.BufferGeometry | null = null;
const arrowGeo = () => {
  if (arrowG) return arrowG;
  const shaft = new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5); shaft.rotateX(Math.PI / 2);
  const head = new THREE.ConeGeometry(0.05, 0.16, 5); head.rotateX(Math.PI / 2); head.translate(0, 0, 0.52);
  const fl = new THREE.BoxGeometry(0.1, 0.006, 0.16); fl.translate(0, 0, -0.38);
  const fl2 = fl.clone(); fl2.rotateZ(Math.PI / 2);
  return (arrowG = mergeGeometries([shaft, head, fl, fl2])!);
};
let iceG: THREE.ConeGeometry | null = null, thornG: THREE.BufferGeometry | null = null, rockG: THREE.DodecahedronGeometry | null = null;
const iceGeo = () => { if (!iceG) { iceG = new THREE.ConeGeometry(0.22, 1.5, 5); iceG.translate(0, 0.75, 0); } return iceG; };
const thornGeo = () => {
  if (thornG) return thornG;
  // kıvrık diken: üst kısmı bükülmüş koni
  const g = new THREE.ConeGeometry(0.18, 1.6, 6, 6); g.translate(0, 0.8, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); p.setX(i, p.getX(i) + Math.pow(y / 1.6, 2) * 0.35); }
  g.computeVertexNormals();
  return (thornG = g);
};
const rockGeo = () => rockG ??= new THREE.DodecahedronGeometry(0.12, 0);

const additive = (map: THREE.Texture | null, color: THREE.ColorRepresentation, opacity = 1) =>
  new THREE.MeshBasicMaterial({ map, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false });

const COLUMN_VS = `varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix * normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }`;
const COLUMN_FS = `uniform sampler2D uNoise; uniform vec3 uColor; uniform float uTime; uniform float uFade;
  varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){
    float n = texture2D(uNoise, vec2(vUv.x * 2.0, vUv.y * 0.7 - uTime * 1.6)).r;
    float n2 = texture2D(uNoise, vec2(vUv.x * 3.0 + 0.3, vUv.y * 1.1 - uTime * 2.3)).r;
    float edge = pow(1.0 - abs(dot(vN, vV)), 1.4);
    float v = smoothstep(0.0, 0.08, vUv.y) * pow(1.0 - vUv.y, 1.5);
    float a = (0.15 + 0.85 * n * n2 + 0.5 * edge) * v * uFade;
    gl_FragColor = vec4(uColor * a * 1.05 + vec3(a * 0.1), a);
  }`;
const DOME_FS = `uniform vec3 uColor; uniform float uTime; uniform float uFade; varying vec2 vUv; varying vec3 vN; varying vec3 vV;
  void main(){
    float f = pow(1.0 - abs(dot(vN, vV)), 2.2);
    vec2 g = vec2(vUv.x * 18.0, vUv.y * 10.0);
    vec2 h = abs(fract(g + vec2(0.5 * floor(g.y), 0.0)) - 0.5);
    float hex = smoothstep(0.42, 0.5, max(h.x, h.y));
    float sweep = smoothstep(0.08, 0.0, abs(fract(vUv.y - uTime * 0.45) - 0.5) - 0.38);
    float a = (f * 0.85 + hex * 0.22 * (0.4 + f) + sweep * 0.25 * hex + 0.04) * uFade;
    gl_FragColor = vec4(uColor * a * 1.5, a);
  }`;

export interface SkillCtx {
  cls: number; skill: number; variant: number; src: number; tgt: number;
  sp: P; tp: P; self: boolean; near: number; now: number;
  shake: (n: number) => void; hitStop: (ids: number[], ms: number) => void; sound: (name: string, k: number) => void;
}

export class SkillFx {
  group = new THREE.Group();
  private els: El[] = [];
  /** 0: ısınma modu, 1: telefon, 2: bilgisayar */
  q = 2;
  constructor(private fx: Fx3D) { this.group.name = 'skill-fx'; }

  private gy(x: number, y: number) { return this.fx.heightAt(x, y); }
  private pos(id: number) { return id ? this.fx.posOf(id) : null; }
  private get pk() { return this.q === 0 ? 0.35 : this.q === 1 ? 0.6 : 1; }
  /** Çok kalabalıkta başkalarının ikincil efektleri atlanır. */
  private full(self: boolean) { return self || this.els.length < (this.q === 2 ? 140 : this.q === 1 ? 70 : 40); }

  private add(o: THREE.Object3D, dur: number, upd: (k: number, now: number) => void, mats: THREE.Material[], own?: THREE.BufferGeometry[]) {
    o.traverse((c) => { c.frustumCulled = false; });
    this.group.add(o);
    const el: El = { o, t0: performance.now(), dur, upd, mats, own };
    this.els.push(el);
    upd(0, el.t0);
    return el;
  }

  update(now: number) {
    for (let i = this.els.length - 1; i >= 0; i--) {
      const el = this.els[i];
      const k = (now - el.t0) / el.dur;
      if (k >= 1) {
        this.group.remove(el.o);
        for (const m of el.mats) m.dispose();
        el.own?.forEach((g) => g.dispose());
        this.els[i] = this.els[this.els.length - 1]; this.els.pop();
        continue;
      }
      try { el.upd(Math.max(0, k), now); } catch (e) { console.error('[skillfx]', e); el.t0 = -1e9; } // hatalı efekt kaldırılır, diğerleri sürer
    }
  }

  /** Gölgelendiricileri önceden derle (ilk beceride takılma olmasın). */
  warm() {
    const far = { x: -99999, y: -99999 };
    this.decal('holy', far, 10, 50); this.shock(far, 10, 50, '#fff'); this.column(far, 1, 1, 50, '#fff'); this.dome(0, far, 50, '#fff');
    this.beam(far, 1, far, 1, 0.2, 50, '#fff'); this.flash(far, 1, 1, 50, '#fff'); this.spikes(far, 'ice', 1, 10, 50); this.spikes(far, 'thorn', 1, 10, 50);
    this.rocks(far, 1, '#777'); this.sword(far, 50, '#fff'); this.chain(0, 0, far, far, 50); this.arrowRain(far, 10, 1, 50, '#fff');
    for (const el of this.els) el.o.position.y -= 500;
  }

  // ───────── yapı taşları ─────────

  /** Yerde dönen doku (rün dairesi / çatlak). r: sunucu birimi yarıçap. */
  decal(name: Circle, p: P, r: number, dur: number, o: { color?: THREE.ColorRepresentation; spin?: number; grow?: [number, number]; fadeIn?: number; fadeOut?: number; follow?: number; opacity?: number; h?: number } = {}) {
    const mat = additive(tex(name), o.color ?? '#ffffff', 0);
    const m = new THREE.Mesh(flatGeo(), mat);
    m.renderOrder = 2;
    const spin = o.spin ?? 0.6, g0 = o.grow?.[0] ?? 1, g1 = o.grow?.[1] ?? 1, fi = o.fadeIn ?? 0.12, fo = o.fadeOut ?? 0.35, op = o.opacity ?? 1;
    return this.add(m, dur, (k, now) => {
      const q = (o.follow && this.pos(o.follow)) || p;
      m.position.set(q.x * U, this.gy(q.x, q.y) + 0.05 + (o.h ?? 0), q.y * U);
      const e = 1 - Math.pow(1 - Math.min(1, k / Math.max(0.001, 1 - fo)), 3);
      m.scale.setScalar(r * U * (g0 + (g1 - g0) * e));
      m.rotation.y = (now / 1000) * spin;
      mat.opacity = op * Math.min(1, k / fi) * (k > 1 - fo ? (1 - k) / fo : 1);
    }, [mat]);
  }

  /** Genişleyen şok dalgası halkası. */
  shock(p: P, r: number, dur: number, color: THREE.ColorRepresentation, from = 0.15, h = 0.08) {
    const mat = additive(ringTex(), color, 1);
    const m = new THREE.Mesh(flatGeo(), mat); m.renderOrder = 3;
    return this.add(m, dur, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      m.position.set(p.x * U, this.gy(p.x, p.y) + h, p.y * U);
      m.scale.setScalar(r * U * (from + (1 - from) * e));
      mat.opacity = Math.pow(1 - k, 1.4) * 0.9;
    }, [mat]);
  }

  /** Enerji sütunu (yerden yükselen akan ışık). r ve height metre. */
  column(p: P, r: number, height: number, dur: number, color: THREE.ColorRepresentation, follow = 0) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uNoise: { value: noiseTex() }, uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uFade: { value: 0 } },
      vertexShader: COLUMN_VS, fragmentShader: COLUMN_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(colGeo(), mat); m.renderOrder = 4;
    return this.add(m, dur, (k, now) => {
      const q = (follow && this.pos(follow)) || p;
      m.position.set(q.x * U, this.gy(q.x, q.y), q.y * U);
      const e = 1 - Math.pow(1 - Math.min(1, k * 3), 3);
      m.scale.set(r * (1 - k * 0.35), height * (0.3 + 0.7 * e), r * (1 - k * 0.35));
      mat.uniforms.uTime.value = now / 1000;
      mat.uniforms.uFade.value = Math.min(1, k * 6) * Math.pow(1 - k, 1.2);
    }, [mat]);
  }

  /** Karakteri saran altıgen desenli kalkan kubbesi. */
  dome(follow: number, p: P, dur: number, color: THREE.ColorRepresentation) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { uColor: { value: new THREE.Color(color) }, uTime: { value: 0 }, uFade: { value: 0 } },
      vertexShader: COLUMN_VS, fragmentShader: DOME_FS, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    const m = new THREE.Mesh(domeGeo(), mat); m.renderOrder = 5;
    return this.add(m, dur, (k, now) => {
      const q = (follow && this.pos(follow)) || p;
      const pop = Math.min(1, (now - (m.userData.t0 ??= now)) / 260);
      const s = 0.85 + 0.2 * (1 - Math.pow(1 - pop, 3)) - 0.05 + Math.sin(now / 160) * 0.015;
      m.position.set(q.x * U, this.gy(q.x, q.y) + 0.95, q.y * U);
      m.scale.set(0.95 * s, 1.25 * s, 0.95 * s);
      m.rotation.y = now / 1400;
      mat.uniforms.uTime.value = now / 1000;
      mat.uniforms.uFade.value = pop * (k > 0.88 ? (1 - k) / 0.12 : 1) * (1 + Math.max(0, 1 - pop) * 1.5);
    }, [mat]);
  }

  /** İki nokta arasında ışık huzmesi (h: metre). */
  beam(a: P, ha: number, b: P, hb: number, width: number, dur: number, color: THREE.ColorRepresentation, grow = false) {
    const mat = additive(streakTex(), color, 1);
    const m = new THREE.Mesh(beamGeo(), mat); m.renderOrder = 4;
    const A = new THREE.Vector3(), B = new THREE.Vector3();
    return this.add(m, dur, (k) => {
      A.set(a.x * U, this.gy(a.x, a.y) + ha, a.y * U); B.set(b.x * U, this.gy(b.x, b.y) + hb, b.y * U);
      const len = A.distanceTo(B);
      m.position.copy(A); m.lookAt(B);
      const e = grow ? Math.min(1, k * 5) : 1;
      m.scale.set(width * (1 - k * 0.6), width * (1 - k * 0.6), Math.max(0.01, len * e));
      mat.opacity = Math.pow(1 - k, 1.5) * 1.3;
    }, [mat]);
  }

  /** Parlama (kamera yüzlü ışık topu). size: metre. */
  flash(p: P, h: number, size: number, dur: number, color: THREE.ColorRepresentation) {
    const mat = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    const s = new THREE.Sprite(mat); s.renderOrder = 6;
    return this.add(s, dur, (k) => {
      s.position.set(p.x * U, this.gy(p.x, p.y) + h, p.y * U);
      s.scale.setScalar(size * (0.5 + 0.7 * (1 - Math.pow(1 - Math.min(1, k * 4), 2))));
      mat.opacity = Math.pow(1 - k, 2) * 0.75;
    }, [mat]);
  }

  /** Yerden fışkıran buz sarkıtları ya da kıvrık dikenler (r: sunucu birimi). */
  spikes(p: P, kind: 'ice' | 'thorn', n: number, r: number, dur: number) {
    const mat = kind === 'ice'
      ? new THREE.MeshStandardMaterial({ color: '#cff6ff', emissive: '#3fb6e8', emissiveIntensity: 0.75, roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.88 })
      : new THREE.MeshStandardMaterial({ color: '#5a4426', emissive: '#2f7a1e', emissiveIntensity: 0.22, roughness: 0.85, transparent: true, opacity: 1 });
    const im = new THREE.InstancedMesh(kind === 'ice' ? iceGeo() : thornGeo(), mat, n);
    const parts: { x: number; y: number; ry: number; tilt: number; s: number; d: number }[] = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.random() * 0.6, rr = (i === 0 ? 0 : 0.35 + Math.random() * 0.65) * r;
      parts.push({ x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, ry: -a + Math.PI / 2, tilt: i === 0 ? 0.05 : 0.25 + Math.random() * 0.35, s: (i === 0 ? 1.35 : 0.6 + Math.random() * 0.6), d: Math.random() * 0.12 });
    }
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
    return this.add(im, dur, (k) => {
      const tMs = k * dur;
      for (let i = 0; i < n; i++) {
        const q = parts[i];
        const up = Math.min(1, Math.max(0, (tMs - q.d * dur) / 160));
        const rise = 1 - Math.pow(1 - up, 3), sink = k > 0.82 ? (k - 0.82) / 0.18 : 0;
        const h = q.s * (rise * 1.06 - (up >= 1 ? 0.06 * Math.min(1, (tMs - q.d * dur - 160) / 120) : 0)) * (1 - sink);
        E.set(q.tilt, q.ry, 0, 'YXZ'); Q.setFromEuler(E);
        V.set(q.x * U, this.gy(q.x, q.y) - 0.05, q.y * U); S.set(q.s * (1 - sink * 0.4), Math.max(0.001, h), q.s * (1 - sink * 0.4));
        M.compose(V, Q, S); im.setMatrixAt(i, M);
      }
      im.instanceMatrix.needsUpdate = true;
      mat.opacity = (kind === 'ice' ? 0.88 : 1) * (k > 0.9 ? (1 - k) / 0.1 : 1);
    }, [mat]);
  }

  /** Savrulan kaya parçaları. */
  rocks(p: P, n: number, color: THREE.ColorRepresentation, speed = 5) {
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.95 });
    const im = new THREE.InstancedMesh(rockGeo(), mat, n);
    const g0 = this.gy(p.x, p.y);
    const parts = Array.from({ length: n }, () => {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.6);
      return { x: p.x * U, z: p.y * U, y: g0 + 0.1, vx: Math.cos(a) * s * 0.45, vz: Math.sin(a) * s * 0.45, vy: s * (0.7 + Math.random() * 0.6), rs: 0.6 + Math.random() * 1.2, rx: Math.random() * 6, ry: Math.random() * 6, land: false };
    });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3();
    let last = performance.now();
    return this.add(im, 1300, (k, now) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      for (let i = 0; i < n; i++) {
        const q = parts[i];
        if (!q.land) {
          q.vy -= 14 * dt; q.x += q.vx * dt; q.z += q.vz * dt; q.y += q.vy * dt; q.rx += dt * 9; q.ry += dt * 7;
          const gh = this.gy(q.x / U, q.z / U) + 0.05;
          if (q.y < gh && q.vy < 0) { if (Math.abs(q.vy) > 2.5) { q.vy *= -0.3; q.vx *= 0.5; q.vz *= 0.5; } else { q.y = gh; q.land = true; } }
        }
        E.set(q.rx, q.ry, 0); Q.setFromEuler(E); V.set(q.x, q.y, q.z);
        const sc = q.rs * (k > 0.75 ? (1 - k) / 0.25 : 1); S.set(sc, sc, sc);
        M.compose(V, Q, S); im.setMatrixAt(i, M);
      }
      im.instanceMatrix.needsUpdate = true;
    }, [mat]);
  }

  /** Gökten inen dev ışık kılıcı (Hüküm Darbesi). İniş ilk %22'de. */
  sword(p: P, dur: number, color: THREE.ColorRepresentation) {
    const g = new THREE.Group();
    const blade = new THREE.CylinderGeometry(0.32, 0.02, 4.2, 4, 1); blade.rotateY(Math.PI / 4); blade.scale(1, 1, 0.28); blade.translate(0, 2.1, 0);
    const guard = new THREE.BoxGeometry(1.5, 0.16, 0.22); guard.translate(0, 4.25, 0);
    const grip = new THREE.CylinderGeometry(0.07, 0.07, 0.9, 6); grip.translate(0, 4.75, 0);
    const pom = new THREE.SphereGeometry(0.17, 6, 4); pom.translate(0, 5.25, 0);
    const geo = mergeGeometries([blade, guard, grip, pom])!;
    const core = new THREE.MeshStandardMaterial({ color: '#f3d58a', emissive: '#c88a20', emissiveIntensity: 0.9, metalness: 0.8, roughness: 0.25, transparent: true, opacity: 1 });
    const aura = additive(null, color, 0.22);
    const m1 = new THREE.Mesh(geo, core), m2 = new THREE.Mesh(geo, aura);
    m2.scale.setScalar(1.18); m2.position.y = -0.35;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false }));
    glow.scale.set(2.2, 6, 1); glow.position.y = 2.6;
    g.add(m1, m2, glow);
    const gm = glow.material as THREE.SpriteMaterial;
    return this.add(g, dur, (k) => {
      const f = Math.min(1, k / 0.22), e = f * f * f;
      const gh = this.gy(p.x, p.y);
      g.position.set(p.x * U, gh - 1.0 * e + (1 - e) * 10, p.y * U); // uç yere saplanır
      const out = k > 0.7 ? (k - 0.7) / 0.3 : 0;
      core.opacity = 1 - out; aura.opacity = (0.2 + Math.sin(k * 40) * 0.05) * (1 - out); gm.opacity = 0.45 * (1 - out);
      g.rotation.y = k * 0.6;
    }, [core, aura, gm], [geo, blade, guard, grip, pom]);
  }

  /** Altın zincir: kullanıcıdan hedefe uzanır, hedefi çekerken gerilir, sonra geri sarılır. */
  chain(src: number, tgt: number, sp: P, tp: P, dur: number) {
    const N = 48;
    const mat = new THREE.MeshStandardMaterial({ color: '#e8c060', metalness: 0.9, roughness: 0.3, emissive: '#ffb030', emissiveIntensity: 0.55, transparent: true });
    const im = new THREE.InstancedMesh(chainGeo(), mat, N);
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), Q2 = new THREE.Quaternion(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
    const A = new THREE.Vector3(), B = new THREE.Vector3(), D = new THREE.Vector3(), XA = new THREE.Vector3(1, 0, 0);
    return this.add(im, dur, (k, now) => {
      const a = this.pos(src) ?? sp, b = this.pos(tgt) ?? tp;
      A.set(a.x * U, this.gy(a.x, a.y) + 1.25, a.y * U); B.set(b.x * U, this.gy(b.x, b.y) + 1.0, b.y * U);
      D.subVectors(B, A); const len = D.length(); D.normalize();
      const reach = k < 0.3 ? 1 - Math.pow(1 - k / 0.3, 2) : k > 0.72 ? 1 - (k - 0.72) / 0.28 : 1;
      const shown = len * reach, step = 0.13, cnt = Math.min(N, Math.floor(shown / step));
      Q.setFromUnitVectors(XA, D);
      for (let i = 0; i < N; i++) {
        if (i >= cnt) { S.set(0, 0, 0); M.compose(A, Q, S); im.setMatrixAt(i, M); continue; }
        const t = (i * step) / Math.max(0.01, len);
        const sag = Math.sin(t * Math.PI) * (k < 0.3 ? 0.25 : 0.06) * (1 + Math.sin(now / 40 + i) * 0.1);
        V.copy(A).addScaledVector(D, i * step); V.y -= sag;
        Q2.setFromAxisAngle(XA, i % 2 ? Math.PI / 2 : 0); Q2.premultiply(Q);
        S.set(1, 1, 1); M.compose(V, Q2, S); im.setMatrixAt(i, M);
      }
      im.instanceMatrix.needsUpdate = true;
      mat.opacity = k > 0.9 ? (1 - k) / 0.1 : 1;
    }, [mat]);
  }

  /** Gökten ok yağmuru (r: sunucu birimi). Her ok yere saplanınca toz kalkar. */
  arrowRain(p: P, r: number, n: number, dur: number, color: THREE.ColorRepresentation) {
    const mat = new THREE.MeshStandardMaterial({ color: '#d8e6c8', emissive: color, emissiveIntensity: 1.1, roughness: 0.5, transparent: true });
    const im = new THREE.InstancedMesh(arrowGeo(), mat, n);
    const fall = 260;
    const arrows = Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2, rr = Math.sqrt(Math.random()) * r;
      return { x: p.x + Math.cos(a) * rr, y: p.y + Math.sin(a) * rr, t: (i / n) * (dur * 0.42) + Math.random() * 40, landed: false, yaw: Math.random() * 6 };
    });
    const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), E = new THREE.Euler(), V = new THREE.Vector3(), S = new THREE.Vector3(1, 1, 1);
    return this.add(im, dur, (k) => {
      const tMs = k * dur;
      for (const [i, q] of arrows.entries()) {
        const f = Math.min(1, Math.max(0, (tMs - q.t) / fall));
        const gh = this.gy(q.x, q.y);
        if (tMs < q.t) { S.set(0, 0, 0); } else S.set(1.3, 1.3, 1.3);
        // eğik düşüş: hedefin üstünden 9 m yukarıdan, hafif yanal kayarak
        const h = (1 - f) * 9;
        V.set(q.x * U - (1 - f) * 1.8 * Math.sin(q.yaw), gh + h + 0.25, q.y * U - (1 - f) * 1.8 * Math.cos(q.yaw));
        E.set(Math.PI / 2 - 0.2, q.yaw, 0, 'YXZ'); Q.setFromEuler(E);
        M.compose(V, Q, S); im.setMatrixAt(i, M);
        if (f >= 1 && !q.landed) { q.landed = true; this.fx.burst(q.x, q.y, 0.05, Math.ceil(5 * this.pk), '#cbb68a', 1.4, 450, 0.2, 1); this.fx.burst(q.x, q.y, 0.2, Math.ceil(3 * this.pk), color as string, 1.6, 300, 0.12, 0); }
      }
      im.instanceMatrix.needsUpdate = true;
      mat.opacity = k > 0.85 ? (1 - k) / 0.15 : 1;
    }, [mat]);
  }

  /** Mermi: süzülen ışık/ok; yol boyunca iz bırakır, varınca onHit(hedef konumu). */
  missile(sp: P, tgt: number, tp: P, dur: number, kind: 'arrow' | 'orb' | 'ice', color: THREE.ColorRepresentation, size: number, onHit?: (p: P) => void, trail = 2) {
    const g = new THREE.Group();
    const mats: THREE.Material[] = [];
    const gm = new THREE.SpriteMaterial({ map: glowTexture(), color, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, toneMapped: false });
    mats.push(gm);
    const glow = new THREE.Sprite(gm); glow.scale.setScalar(size); g.add(glow);
    if (kind === 'arrow') {
      const am = new THREE.MeshStandardMaterial({ color: '#f0f8e0', emissive: color, emissiveIntensity: 1.4 }); mats.push(am);
      const a = new THREE.Mesh(arrowGeo(), am); a.scale.setScalar(1.25); g.add(a);
    } else {
      const cm = new THREE.MeshBasicMaterial({ color: '#ffffff', toneMapped: false }); mats.push(cm);
      const c = new THREE.Mesh(kind === 'ice' ? new THREE.OctahedronGeometry(size * 0.18) : new THREE.SphereGeometry(size * 0.14, 10, 8), cm); g.add(c);
    }
    const col = new THREE.Color(color);
    let hit = false; const end = { ...tp };
    return this.add(g, dur + 30, (k) => {
      const f = Math.min(1, k * (dur + 30) / dur);
      const b = this.pos(tgt); if (b) { end.x = b.x; end.y = b.y; }
      const x = sp.x + (end.x - sp.x) * f, y = sp.y + (end.y - sp.y) * f;
      const h = 1.3 + Math.sin(f * Math.PI) * (kind === 'arrow' ? 0.35 : 0.5) - f * 0.25;
      g.position.set(x * U, this.gy(x, y) + h, y * U);
      g.lookAt(end.x * U, this.gy(end.x, end.y) + 1.05, end.y * U);
      for (let i = 0; i < trail; i++) this.fx.spawn(g.position.x, g.position.y, g.position.z, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, 320, size * 0.28, col);
      if (f >= 1 && !hit) { hit = true; g.visible = false; onHit?.(end); }
    }, mats);
  }

  // ───────── koreografi ─────────

  /** Sınıf + beceri + uzmanlık türüne göre tam efekt. */
  play(c: SkillCtx) {
    const full = this.full(c.self), pk = this.pk * (c.self ? 1 : 0.7), q = this.q;
    const n = (x: number) => Math.max(1, Math.round(x * pk));
    const fx = this.fx, after = (ms: number, f: () => void) => window.setTimeout(f, ms);
    const S = (name: string, k = 1) => c.sound(name, c.near * k);
    const light = (p: P, h: number, col: string, i: number, ms: number) => { if (q > 0) fx.light(p.x, p.y, h, col, i, ms); };
    const impact = (power: number) => { if (c.self) { c.shake(power); if (c.tgt) c.hitStop([c.src, c.tgt], Math.min(120, 40 + power * 10)); } };
    const sp = c.sp, tp = c.tp;
    const cast = (name: Circle, col: string) => { this.decal(name, sp, 62, 650, { follow: c.src, spin: 1.6, grow: [0.5, 1.05], color: col, fadeOut: 0.4 }); fx.burst(sp.x, sp.y, 0.15, n(14), col, 1.3, 600, 0.13, 2.4); };

    if (c.cls === 0) { // ─── Muhafız: kutsal çelik, altın
      const G = '#ffc94a';
      if (c.skill === 1) { // Zincir Çekişi
        cast('holy', G); S('chain');
        this.chain(c.src, c.tgt, sp, tp, 700);
        after(210, () => { const p = this.pos(c.tgt) ?? tp; this.flash(p, 1.1, 2.2, 260, '#ffe08a'); fx.burst(p.x, p.y, 1.0, n(22), '#ffd27a', 3.5, 500, 0.16, -3); light(p, 1.2, G, 4, 300); impact(2); });
      } else if (c.skill === 2) { // Kalkan Hücumu
        S('charge'); cast('holy', G);
        this.beam(sp, 1.0, tp, 1.0, 1.1, 320, '#ffd98a');
        for (let i = 0; i < 7; i++) { const k = i / 7; fx.burst(sp.x + (tp.x - sp.x) * k, sp.y + (tp.y - sp.y) * k, 0.1, n(6), '#d9c7a1', 1.2, 650, 0.24, 1); }
        after(150, () => {
          S('impact');
          this.decal('crack', tp, 150, 1900, { spin: 0, fadeIn: 0.02, fadeOut: 0.5, grow: [0.7, 1], color: '#ffd9a0' });
          this.shock(tp, 230, 520, '#ffcf6a'); if (full) this.shock(tp, 160, 380, '#fff0c0', 0.05);
          this.decal('holy', tp, 165, 760, { spin: 3, grow: [0.4, 1.15], fadeIn: 0.05, fadeOut: 0.6, color: G });
          this.flash(tp, 0.8, 3, 280, '#ffe7a8');
          if (full) this.rocks(tp, n(9), '#7a6a58', 5.5);
          fx.burst(tp.x, tp.y, 0.2, n(36), '#e8d7b0', 4, 800, 0.26, 1.2); fx.burst(tp.x, tp.y, 0.6, n(20), G, 5, 500, 0.15, -4);
          light(tp, 1, G, 7, 450); impact(6);
        });
      } else if (c.skill === 3 && c.variant === 0) { // Çelik İrade
        S('shield');
        this.decal('holy', sp, 95, 1500, { follow: c.src, spin: 1.2, grow: [0.3, 1], fadeOut: 0.3, color: G });
        this.column(sp, 0.95, 4.5, 950, '#ffd36a', c.src);
        this.flash(sp, 1.0, 2.4, 340, '#ffe7a8');
        for (let i = 0; i < n(26); i++) { const a = Math.random() * 6.28, r = 0.4 + Math.random() * 0.6; fx.spawn(sp.x * U + Math.cos(a) * r, this.gy(sp.x, sp.y) + Math.random() * 0.5, sp.y * U + Math.sin(a) * r, -Math.sin(a) * 0.8, 1.6 + Math.random() * 1.6, Math.cos(a) * 0.8, 1100, 0.14, '#ffe08a', 0, 0.4); }
        light(sp, 1.6, G, 5, 700);
      } else if (c.skill === 3) { // Hüküm Darbesi
        S('holy');
        cast('holy', G);
        this.decal('holy', tp, 175, 1250, { spin: -0.9, grow: [0.85, 1], fadeIn: 0.15, fadeOut: 0.3, color: G });
        this.sword(tp, 1250, '#ffd36a');
        after(270, () => {
          S('impact', 1.2);
          this.decal('crack', tp, 185, 2100, { spin: 0, fadeIn: 0.02, fadeOut: 0.5, grow: [0.6, 1], color: '#ffe0a0' });
          this.shock(tp, 290, 620, '#ffcf6a'); if (full) this.shock(tp, 200, 420, '#fff0c0', 0.05);
          this.column(tp, 1.1, 6, 620, '#ffc94a');
          this.flash(tp, 1.2, 3.4, 320, '#ffe7a8');
          if (full) this.rocks(tp, n(14), '#7a6a58', 6.5);
          fx.burst(tp.x, tp.y, 0.3, n(46), '#ffe8b0', 5.5, 900, 0.24, 0.5); fx.burst(tp.x, tp.y, 0.1, n(30), '#d9c7a1', 3, 900, 0.3, 1);
          light(tp, 1.5, G, 9, 600); impact(8);
        });
      }
    } else if (c.cls === 1) { // ─── Avcı: rüzgâr ve doğa, yeşil
      const V = '#8dff5a';
      if (c.skill === 1) { // Yelpaze Atış: gökten ok yağmuru
        S('volley'); cast('nature', V);
        for (let i = 0; i < 3; i++) after(i * 60, () => fx.burst(sp.x, sp.y, 1.6, n(5), V, 2.5, 300, 0.12, 6));
        this.decal('nature', tp, 160, 1250, { spin: 0.8, grow: [0.6, 1], fadeIn: 0.1, fadeOut: 0.3, color: '#b8ff8a', opacity: 0.85 });
        after(120, () => this.arrowRain(tp, 150, n(c.self ? 16 : 10) + (q === 0 ? 2 : 0), 1000, V));
        after(520, () => { this.shock(tp, 190, 480, V); impact(2.5); });
      } else if (c.skill === 2) { // Delici Ok
        S('pierce'); cast('nature', V);
        this.flash(sp, 1.3, 1.6, 200, '#e6ffd0');
        this.missile(sp, c.tgt, tp, 170, 'arrow', V, 1.3, (p) => {
          this.beam(sp, 1.3, p, 1.05, 0.55, 380, '#c8ff9a');
          this.decal('nature', p, 95, 1500, { spin: 2.2, grow: [1.2, 0.9], fadeIn: 0.04, color: V });
          this.shock(p, 150, 420, '#d8ffb0', 0.1);
          this.flash(p, 1.05, 2.4, 260, '#eaffd0');
          fx.burst(p.x, p.y, 1.0, n(26), V, 4.5, 500, 0.15, -2);
          light(p, 1.1, V, 5, 320); impact(3);
        }, 3);
      } else if (c.skill === 3 && c.variant === 0) { // Şafak Oku: ışık huzmesi
        S('beam');
        this.decal('holy', sp, 70, 700, { follow: c.src, spin: 2.4, grow: [0.4, 1], color: '#fff2a0' });
        this.flash(sp, 1.3, 2.6, 260, '#fff6c8');
        this.beam(sp, 1.3, tp, 1.05, 0.9, 520, '#ffd860', true);
        if (full) this.beam(sp, 1.3, tp, 1.05, 0.3, 380, '#fff2c0', true);
        this.missile(sp, c.tgt, tp, 150, 'arrow', '#fff3a8', 1.8, (p) => {
          this.flash(p, 1.05, 3, 320, '#fff0b0');
          this.shock(p, 210, 480, '#ffd860'); this.column(p, 0.85, 3.6, 500, '#ffd040');
          fx.burst(p.x, p.y, 1.0, n(40), '#fff3a8', 5, 700, 0.2, -1);
          light(p, 1.2, '#fff0a0', 7, 450); impact(4);
        }, 3);
      } else if (c.skill === 3) { // Kök Oku: dikenli kökler
        S('pierce');
        cast('nature', V);
        this.missile(sp, c.tgt, tp, 190, 'arrow', '#7dff6a', 1.2, (p) => {
          S('vine');
          this.decal('nature', p, 125, 1900, { spin: 0.5, grow: [0.5, 1], fadeIn: 0.05, fadeOut: 0.2, color: V });
          this.spikes(p, 'thorn', n(10) + 2, 95, 1850);
          fx.burst(p.x, p.y, 0.2, n(24), '#6a8a3a', 2.2, 900, 0.22, 1.5); fx.burst(p.x, p.y, 0.4, n(18), V, 2, 1100, 0.12, 0.6);
          light(p, 0.8, V, 4, 500); impact(2.5);
        }, 2);
      }
    } else if (c.cls === 2) { // ─── Arkanist: öz büyüsü mor, buz mavi, yaşam yeşil
      const A = '#b98bff';
      if (c.skill === 1) { // Öz Halkası
        S('arcane'); cast('arcane', A);
        this.decal('arcane', tp, 175, 900, { spin: 1.2, grow: [0.25, 1], fadeIn: 0.15, fadeOut: 0.45, color: A, opacity: 0.8 });
        this.missile(sp, c.tgt, tp, 260, 'orb', A, 1.5, (p) => {
          S('boom', 0.8);
          this.decal('arcane', p, 190, 820, { spin: 4, grow: [0.6, 1.15], fadeIn: 0.03, fadeOut: 0.6, color: '#d6b8ff' });
          this.shock(p, 220, 520, A); if (full) after(90, () => this.shock(p, 260, 520, '#e6d6ff', 0.3));
          this.column(p, 1.0, 3.6, 520, A);
          this.flash(p, 1.0, 2.8, 300, '#d8c0ff');
          fx.burst(p.x, p.y, 0.6, n(48), A, 4.8, 800, 0.22, -0.5);
          light(p, 1.2, A, 6, 450); impact(3.5);
        }, 3);
      } else if (c.skill === 2) { // Kırağı Mührü
        const I = '#8fe6ff';
        S('frost'); cast('frost', I);
        this.decal('frost', tp, 140, 2000, { spin: 0.4, grow: [0.5, 1], fadeIn: 0.08, fadeOut: 0.25, color: '#cdf4ff' });
        this.missile(sp, c.tgt, tp, 290, 'ice', '#bff4ff', 1.3, (p) => {
          S('shatter');
          this.spikes(p, 'ice', n(11) + 2, 120, 1750);
          this.shock(p, 190, 520, I);
          this.flash(p, 0.8, 3.4, 320, '#e6fbff');
          fx.burst(p.x, p.y, 0.3, n(40), '#e8fbff', 3, 1000, 0.18, 0.5);
          for (let i = 0; i < n(18); i++) fx.spawn(p.x * U + (Math.random() - 0.5) * 3, this.gy(p.x, p.y) + 0.2 + Math.random() * 0.4, p.y * U + (Math.random() - 0.5) * 3, (Math.random() - 0.5) * 0.4, 0.15, (Math.random() - 0.5) * 0.4, 1600, 0.6, '#9fc8d8', 0, 0.5);
          light(p, 1, I, 6, 600); impact(3);
        }, 3);
      } else if (c.skill === 3 && c.variant === 0) { // Öz Patlaması
        S('arcane');
        cast('arcane', A);
        this.decal('arcane', tp, 200, 1300, { spin: 1.6, grow: [0.7, 1], fadeIn: 0.1, fadeOut: 0.3, color: A });
        if (full) this.decal('arcane', tp, 120, 1300, { spin: -2.6, grow: [0.8, 1], fadeIn: 0.1, fadeOut: 0.3, color: '#e6c8ff', h: 0.02 });
        // enerji toplanır: halkadan merkeze akan kıvılcımlar
        for (let i = 0; i < n(30); i++) { const a = Math.random() * 6.28, r = 4.5; const gx = tp.x * U + Math.cos(a) * r, gz = tp.y * U + Math.sin(a) * r; fx.spawn(gx, this.gy(tp.x, tp.y) + 0.3, gz, -Math.cos(a) * r / 0.28, 1.2, -Math.sin(a) * r / 0.28, 280, 0.2, A, 0, 0); }
        after(280, () => {
          S('explode');
          this.column(tp, 1.7, 8, 760, '#c9a0ff');
          this.shock(tp, 320, 650, A); if (full) this.shock(tp, 220, 420, '#e6d6ff', 0.05);
          this.decal('crack', tp, 190, 1900, { spin: 0, fadeIn: 0.02, fadeOut: 0.5, grow: [0.6, 1], color: '#c79bff' });
          this.flash(tp, 1.4, 4, 380, '#d9c0ff');
          if (full) this.rocks(tp, n(10), '#5a4a6a', 6);
          fx.burst(tp.x, tp.y, 0.5, n(60), A, 6, 900, 0.24, -0.8); fx.burst(tp.x, tp.y, 2.0, n(24), '#ffffff', 4, 500, 0.14, -2);
          light(tp, 1.6, A, 9, 650); impact(8);
        });
      } else if (c.skill === 3) { // Yaşam Dalgası
        const L = '#6dffa0';
        S('heal');
        this.decal('nature', sp, 330, 1300, { follow: c.src, spin: 0.7, grow: [0.15, 1], fadeIn: 0.05, fadeOut: 0.45, color: L, opacity: 0.9 });
        this.shock(sp, 340, 900, L, 0.1);
        this.column(sp, 0.9, 3.4, 900, L, c.src);
        for (let i = 0; i < n(36); i++) { const a = Math.random() * 6.28, r = Math.random() * 6; fx.spawn(sp.x * U + Math.cos(a) * r, this.gy(sp.x, sp.y) + 0.1, sp.y * U + Math.sin(a) * r, 0, 0.9 + Math.random() * 1.2, 0, 1400, 0.16, Math.random() < 0.5 ? L : '#e6ffb0', 0, 0.3); }
        light(sp, 1.4, L, 5, 800);
      }
    }
  }
}
