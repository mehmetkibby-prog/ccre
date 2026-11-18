import * as THREE from 'three';
import { shared } from './materials.ts';
import { glowTexture } from './textures.ts';
import { gearFxScale, runeRing } from './gearfx.ts';

/**
 * Evrim efektleri (nadirlik ve +5/+6 efektlerinden ayrı, kendi dili var):
 *  I  · Uyanmış  (buz mavisi): silahın çevresinde sarmal kıvılcım akışı · zırhta ayak çevresinde ince dönen halka
 *  II · Dövülmüş (mor):        iki ters sarmal + silahı saran nabız atan ışık kabuğu · zırhta gövde çevresinde
 *                               dönen üç ruh küresi ve yükselen mor kıvılcımlar
 *  III· Yücelmiş (altın):      altın sarmallar, silahın çevresinde dönen kristal kıymıkları, ışık kabuğu ·
 *                               zırhta ayak altında dönen altın rün mührü, beş kristal kıymık, yükselen ışık sütunu
 *                               (iki katlı, ters dönen halkalar)
 * Bütün hareket gölgelendiricide (karede CPU işi yok); malzeme ve geometri paylaşılır. Nesneler 'plus-fx' adlıdır:
 * renderer uzaktakileri gizler (performans).
 */
const MOBILE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const K = MOBILE ? 0.6 : 1;
const COL: [number, number][] = [[0, 0], [0x4ad8ff, 0xd8f8ff], [0xb070ff, 0xffb8f0], [0xffc83a, 0xfff4c8]];

const VERT = /* glsl */ `
uniform float uTime, uScale, uR, uY0, uY1, uSpd, uSize, uMode, uWorld;
uniform vec3 uA, uB;
attribute vec4 aSeed;
varying vec3 vCol; varying float vA; varying float vShape;
void main() {
  float t = fract(uTime * (0.22 + aSeed.x * 0.18) + aSeed.w);
  vec3 p;
  if (uMode < 0.5) {
    // sarmal: eksen boyunca yükselir, çevresinde döner
    float y = mix(uY0, uY1, t);
    float ang = aSeed.y + uTime * uSpd + t * 11.0;
    float r = uR * (0.55 + 0.45 * sin(t * 3.14159));
    p = vec3(cos(ang) * r, y, sin(ang) * r);
    vA = sin(t * 3.14159);
    vShape = 0.0;
  } else if (uMode < 1.5) {
    // yörünge: sabit yükseklik bantlarında dönen kıymık / küre
    float ang = aSeed.y + uTime * uSpd;
    float y = mix(uY0, uY1, aSeed.z) + sin(uTime * 2.1 + aSeed.w * 6.28) * 0.07;
    p = vec3(cos(ang) * uR, y, sin(ang) * uR);
    vA = 0.75 + 0.25 * sin(uTime * 5.0 + aSeed.w * 30.0);
    vShape = 1.0;
  } else {
    // sütun: halka üstünden dikine yükselen ışık zerreleri
    float ang = aSeed.y;
    float r = uR * (0.75 + 0.25 * aSeed.x);
    p = vec3(cos(ang) * r, mix(uY0, uY1, t), sin(ang) * r);
    vA = sin(t * 3.14159) * 0.9;
    vShape = 0.0;
  }
  vec4 wp = uWorld > 0.5 ? vec4(modelMatrix[3].xyz + p, 1.0) : modelMatrix * vec4(p, 1.0);
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, uSize * (0.7 + 0.6 * aSeed.x) * uScale / -mv.z);
  vCol = mix(uA, uB, aSeed.z * aSeed.z);
}`;
const FRAG = /* glsl */ `
varying vec3 vCol; varying float vA; varying float vShape;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float a;
  if (vShape > 0.5) {
    // kristal kıymık: dikine uzun baklava + parlak çekirdek
    float d = abs(c.x) * 2.6 + abs(c.y) * 1.25;
    a = smoothstep(0.62, 0.38, d) + max(0.0, 1.0 - length(c) * 5.0) * 0.8;
  } else {
    float d = length(c) * 2.0;
    a = max(0.0, 1.0 - d); a = a * a * (1.0 + 2.0 * a * a);
  }
  gl_FragColor = vec4(vCol * a * vA * 1.9, 0.0);
}`;

interface PtsOpt { mode: 0 | 1 | 2; n: number; r: number; y0: number; y1: number; spd: number; size: number; world: boolean; tier: number }
const mats = new Map<string, THREE.ShaderMaterial>();
const geos = new Map<string, THREE.BufferGeometry>();
function pts(o: PtsOpt) {
  const key = `${o.mode}|${o.r}|${o.y0}|${o.y1}|${o.spd}|${o.size}|${o.world}|${o.tier}`;
  let m = mats.get(key);
  if (!m) {
    const [a, b] = COL[o.tier];
    m = new THREE.ShaderMaterial({
      uniforms: {
        uTime: shared.time, uScale: gearFxScale, uR: { value: o.r }, uY0: { value: o.y0 }, uY1: { value: o.y1 }, uSpd: { value: o.spd }, uSize: { value: o.size },
        uMode: { value: o.mode }, uWorld: { value: o.world ? 1 : 0 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) },
      },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    mats.set(key, m);
  }
  const n = Math.max(2, Math.round(o.n * (o.mode === 1 ? 1 : K)));
  const gk = `${n}|${o.mode}`;
  let g = geos.get(gk);
  if (!g) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    let s = n * 131 + o.mode * 7;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) seed.set([r(), o.mode === 1 ? (i / n) * Math.PI * 2 : r() * Math.PI * 2, o.mode === 1 ? (i % 3) / 2 : r(), i / n], i * 4);
    g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 1, 0), 2.6);
    geos.set(gk, g);
  }
  const p = new THREE.Points(g, m);
  p.name = 'plus-fx'; p.renderOrder = 4; p.frustumCulled = false;
  return p;
}

const SHELL_VERT = /* glsl */ `
uniform float uPush;
varying vec3 vN, vV, vW;
void main() {
  vec4 w = modelMatrix * vec4(position + normal * uPush, 1.0);
  vW = w.xyz; vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SHELL_FRAG = /* glsl */ `
uniform float uTime; uniform vec3 uA, uB;
varying vec3 vN, vV, vW;
void main() {
  float f = pow(max(0.0, 1.0 - abs(dot(normalize(vN), normalize(vV)))), 2.0);
  float pulse = 0.6 + 0.4 * sin(uTime * 3.2);
  float wave = 0.5 + 0.5 * sin(vW.y * 18.0 - uTime * 5.0);
  vec3 col = mix(uA, uB, wave);
  gl_FragColor = vec4(col * (0.12 + f * 1.2) * pulse * 1.3, 0.0);
}`;
const shells = new Map<number, THREE.ShaderMaterial>();
function shellMat(tier: number) {
  let m = shells.get(tier);
  if (!m) {
    const [a, b] = COL[tier];
    m = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.time, uPush: { value: 0.02 }, uA: { value: new THREE.Color(a) }, uB: { value: new THREE.Color(b) } },
      vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    shells.set(tier, m);
  }
  return m;
}

/** Silah grubuna evrim efekti (silahın yerel ekseni: kılıç/çekiç namlu +Y, asa üst uç, yay ortadan). */
export function evoWeaponFx(g: THREE.Object3D, evo: number, kind: string) {
  const tier = Math.min(3, evo | 0);
  if (tier <= 0) return;
  const [y0, y1, r] = kind === 'staff' ? [0.5, 1.4, 0.12] : kind === 'bow' ? [-0.6, 0.6, 0.09] : [0.1, 0.82, 0.09];
  // I: tek sarmal · II: iki ters sarmal · III: iki sarmal + dönen kristal kıymıklar
  g.add(pts({ mode: 0, n: [0, 16, 22, 28][tier], r, y0, y1, spd: 3.2, size: [0, 0.055, 0.065, 0.075][tier], world: false, tier }));
  if (tier >= 2) g.add(pts({ mode: 0, n: tier === 3 ? 24 : 18, r: r * 1.35, y0, y1, spd: -2.4, size: 0.05, world: false, tier }));
  if (tier >= 2) {
    // silahın kendi ağlarını saran nabızlı ışık kabuğu
    const meshes: THREE.Mesh[] = [];
    g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as unknown as THREE.Points).isPoints && m.geometry?.attributes.normal && m.name !== 'plus-fx') meshes.push(m); });
    for (const m of meshes) { const sh = new THREE.Mesh(m.geometry, shellMat(tier)); sh.name = 'plus-fx'; sh.renderOrder = 5; sh.frustumCulled = false; m.add(sh); }
  }
  if (tier >= 3) g.add(pts({ mode: 1, n: 6, r: r * 2.6, y0: y0 + 0.1, y1: y1 - 0.1, spd: 2.1, size: 0.16, world: false, tier }));
  // uçta yumuşak parıltı
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: COL[tier][0], blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: [0, 0.3, 0.4, 0.55][tier] }));
  halo.scale.setScalar([0, 0.16, 0.22, 0.3][tier]); halo.position.y = y1; halo.name = 'plus-fx';
  g.add(halo);
}

const discGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const discMats = new Map<number, THREE.MeshBasicMaterial>();
/** Zırh evrim efekti: karakter köküne eklenir (dünya ekseninde; dönüşten etkilenmez). */
export function evoArmorFx(evo: number, height: number): THREE.Object3D | null {
  const tier = Math.min(3, evo | 0);
  if (tier <= 0) return null;
  const g = new THREE.Group(); g.name = 'plus-fx';
  const h = Math.max(1.4, height);
  // ayak altında ışık
  let dm = discMats.get(tier);
  if (!dm) { dm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: COL[tier][0], transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: [0, 0.3, 0.42, 0.55][tier] }); discMats.set(tier, dm); }
  const disc = new THREE.Mesh(discGeo, dm); disc.scale.setScalar([0, 1.4, 1.7, 2.2][tier]); disc.position.y = 0.035; disc.renderOrder = 2;
  g.add(disc);
  // I: ince dönen halka + az sayıda yükselen kıvılcım
  const ring = runeRing(COL[tier][0], tier === 3 ? 0.5 : 0.9);
  ring.scale.setScalar([0, 1.25, 1.45, 1.9][tier]); ring.position.y = 0.06;
  g.add(ring);
  g.add(pts({ mode: 2, n: [0, 10, 16, 26][tier], r: 0.55, y0: 0.05, y1: h * (tier === 3 ? 1.25 : 0.8), spd: 0, size: [0, 0.07, 0.08, 0.09][tier], world: true, tier }));
  // II: gövde çevresinde dönen üç ruh küresi
  if (tier >= 2) g.add(pts({ mode: 1, n: tier === 3 ? 5 : 3, r: 0.72, y0: h * 0.35, y1: h * 0.75, spd: tier === 3 ? 1.5 : 1.8, size: tier === 3 ? 0.22 : 0.18, world: true, tier }));
  // III: altın sarmal yükseliş + omuz üstünde hale
  if (tier >= 3) {
    g.add(pts({ mode: 0, n: 30, r: 0.62, y0: 0.1, y1: h * 1.1, spd: 1.6, size: 0.07, world: true, tier }));
    // ikinci, ters dönen iç halka (altın mühür katmanlı görünsün)
    const inner = runeRing(0xfff0b8, -0.8);
    inner.scale.setScalar(1.15); inner.position.y = 0.07;
    g.add(inner);
  }
  return g;
}

/** Görünüm sayısından evrim kademeleri (bit 16-17 silah, 18-19 zırh) */
export const gearEvo = (b: number) => ({ weapon: (b >> 16) & 3, armor: (b >> 18) & 3 });
