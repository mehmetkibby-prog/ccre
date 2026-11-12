import * as THREE from 'three';
import { shared } from './materials.ts';
import { glowTexture } from './textures.ts';

/**
 * Nadir silah ve zırh efekti: parıltı kıvılcımları + yükselen duman.
 * Beyazda yoktur; mavi < turuncu < kızıl giderek yoğunlaşır.
 *
 * Maliyet: bütün hareket köşe gölgelendiricisinde zamanla hesaplanır (karede CPU işi yok, bellek
 * ayrılmaz). Geometri ve malzeme her (nadirlik, tür) için bir kez kurulur ve bütün karakterlerce
 * paylaşılır; karakter başına silah ve zırh için birer çizim çağrısı düşer. Kıvılcım (toplamalı) ve
 * duman (örten) tek geçişte çizilir: önçarpımlı karışımda alfa 0 olan parçacık ekler, alfa > 0 olan örter.
 * Uzaktaki ve sınırın üstündeki oyuncuların efekti renderer tarafından gizlenir.
 */
const MOBILE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const K = MOBILE ? 0.6 : 1;

/** Nokta boyutu ölçeği (piksel / metre × uzaklık); renderer yeniden boyutlanınca ayarlar. */
export const gearFxScale = { value: 600 };

interface Tier {
  /** silah: kıvılcım, duman · zırh: kıvılcım, duman */
  w: [number, number]; a: [number, number];
  spark: number; spark2: number; smoke: number;
  /** duman örtücülüğü: 0 = parlayan sis (toplamalı), 1 = koyu duman */
  dark: number; smokeA: number; rise: number;
}
const TIERS: Record<number, Tier> = {
  1: { w: [9, 5], a: [14, 6], spark: 0x6fb0ff, spark2: 0xd8ecff, smoke: 0x3a6cff, dark: 0, smokeA: 0.32, rise: 0.55 },
  2: { w: [14, 9], a: [20, 10], spark: 0xffa030, spark2: 0xfff0b0, smoke: 0xff7418, dark: 0, smokeA: 0.4, rise: 0.75 },
  3: { w: [22, 16], a: [30, 20], spark: 0xff2a20, spark2: 0xffc070, smoke: 0xff1a28, dark: 0, smokeA: 0.34, rise: 1.0 },
};

const VERT = /* glsl */ `
uniform float uTime, uScale, uRise, uSmokeA, uDark, uAura;
uniform vec3 uSpark, uSpark2, uSmoke;
attribute vec4 aSeed; // x: hız, y: açı, z: tür (0 kıvılcım, 1 duman), w: faz
varying vec4 vCol; varying float vSoft;
void main() {
  float smoke = aSeed.z;
  float life = mix(1.0, 2.2, smoke) * mix(0.8, 1.25, aSeed.x);
  float t = fract(uTime / life + aSeed.w);
  vec4 wp;
  if (uAura > 0.5) {
    // zırh: ayak çevresinden sarmal yükselir (dünya ekseninde; karakterin dönüşünden bağımsız)
    float ang = aSeed.y + t * mix(2.2, 0.8, smoke);
    float r = position.x * mix(1.0, 0.75, t * (1.0 - smoke)) + smoke * t * 0.3;
    wp = vec4(modelMatrix[3].xyz + vec3(cos(ang) * r, position.y + t * mix(1.8, 1.3, smoke) * uRise, sin(ang) * r), 1.0);
  } else {
    // silah: namlu boyunca doğar, dünyada yukarı süzülür
    wp = modelMatrix * vec4(position, 1.0);
    wp.y += t * uRise * mix(0.7, 1.0, smoke);
  }
  wp.x += sin(uTime * 1.7 + aSeed.y * 3.0) * 0.07 * t;
  wp.z += cos(uTime * 1.3 + aSeed.w * 9.0) * 0.07 * t;
  vec4 mv = viewMatrix * wp;
  gl_Position = projectionMatrix * mv;
  float sz = smoke > 0.5 ? mix(0.18, 0.5, t) * (uAura > 0.5 ? 1.3 : 1.0) : mix(0.13, 0.18, aSeed.x) * (1.0 - t * 0.5) * (uAura > 0.5 ? 1.25 : 1.0);
  gl_PointSize = max(1.0, sz * uScale / -mv.z);
  float fade = smoothstep(0.0, 0.12, t) * (1.0 - t);
  if (smoke > 0.5) {
    float a = uSmokeA * fade;
    vCol = vec4(uSmoke * a * mix(1.0, 0.6, uDark), a * uDark);
    vSoft = 1.0;
  } else {
    float tw = 0.55 + 0.45 * sin(uTime * 17.0 + aSeed.w * 40.0);
    vCol = vec4(mix(uSpark, uSpark2, aSeed.x * aSeed.x) * fade * tw * 2.2, 0.0);
    vSoft = 0.0;
  }
}`;
const FRAG = /* glsl */ `
varying vec4 vCol; varying float vSoft;
void main() {
  float r = length(gl_PointCoord - 0.5) * 2.0;
  float a = max(0.0, 1.0 - r);
  a = vSoft > 0.5 ? a * a * (0.75 + 0.25 * sin(r * 9.0 + vCol.r * 20.0)) : a * a * (1.0 + 2.0 * a * a);
  gl_FragColor = vCol * a;
}`;

const mats = new Map<string, THREE.ShaderMaterial>();
function material(tier: number, aura: boolean) {
  const key = tier + (aura ? 'a' : 'w');
  let m = mats.get(key);
  if (m) return m;
  const T = TIERS[tier];
  m = new THREE.ShaderMaterial({
    uniforms: {
      uTime: shared.time, uScale: gearFxScale, uRise: { value: T.rise }, uSmokeA: { value: T.smokeA }, uDark: { value: T.dark }, uAura: { value: aura ? 1 : 0 },
      uSpark: { value: new THREE.Color(T.spark) }, uSpark2: { value: new THREE.Color(T.spark2) }, uSmoke: { value: new THREE.Color(T.smoke) },
    },
    vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  mats.set(key, m);
  return m;
}

const geos = new Map<string, THREE.BufferGeometry>();
/** y0..y1: silahın yerel ekseninde parıltının dağıldığı boy (yay ortadan tutulur). */
function geometry(tier: number, aura: boolean, y0: number, y1: number) {
  const key = `${tier}${aura ? 'a' : 'w'}${y0}|${y1}`;
  let g = geos.get(key);
  if (g) return g;
  const T = TIERS[tier];
  const [ns, nm] = (aura ? T.a : T.w).map((n) => Math.max(n ? 2 : 0, Math.round(n * K)));
  const n = ns + nm;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
  let s = tier * 7919 + (aura ? 13 : 0);
  const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < n; i++) {
    const smoke = i >= ns ? 1 : 0;
    if (aura) { pos[i * 3] = 0.3 + rnd() * 0.25; pos[i * 3 + 1] = smoke ? rnd() * 0.2 : 0.05 + rnd() * 0.5; }
    else { const a = rnd() * Math.PI * 2; pos[i * 3] = Math.cos(a) * 0.035; pos[i * 3 + 1] = y0 + rnd() * (y1 - y0); pos[i * 3 + 2] = Math.sin(a) * 0.035; }
    seed.set([rnd(), rnd() * Math.PI * 2, smoke, i / n + rnd() * 0.3], i * 4);
  }
  g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  // hareket gölgelendiricide olduğundan sınır küresi elle verilir (görüş dışı ayıklama doğru çalışsın)
  g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, aura ? 0.9 : (y0 + y1) / 2, 0), aura ? 1.8 : 1.6);
  geos.set(key, g);
  return g;
}

function points(tier: number, aura: boolean, y0 = 0.1, y1 = 0.9) {
  const p = new THREE.Points(geometry(tier, aura, y0, y1), material(tier, aura));
  p.name = 'gear-fx'; p.renderOrder = 3;
  // zırh efektinin konumu kökten alınır; ölçeği/dönüşü yok sayılır, sınırı da bu yüzden kökte durur
  return p;
}

/** Silah parıltısı (nadirlik 1+). Silah grubunun yerel ekseninde konumlanır. */
export function weaponFx(rarity: number, kind: string): THREE.Points | null {
  const tier = Math.min(3, rarity);
  if (tier <= 0) return null;
  return kind === 'bow' ? points(tier, false, -0.6, 0.6) : kind === 'staff' ? points(tier, false, 0.55, 1.35) : points(tier, false, 0.15, 1.0);
}

const discGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
const discMats = new Map<number, THREE.MeshBasicMaterial>();
/** Zırh aurası (nadirlik 1+): ayak altında renkli ışıma + yükselen kıvılcım ve duman. Karakter köküne eklenir. */
export function armorFx(rarity: number): THREE.Object3D | null {
  const tier = Math.min(3, rarity);
  if (tier <= 0) return null;
  const g = new THREE.Group(); g.name = 'gear-fx';
  const p = points(tier, true); p.name = '';
  let dm = discMats.get(tier);
  if (!dm) {
    dm = new THREE.MeshBasicMaterial({ map: glowTexture(), color: TIERS[tier].spark, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: [0, 0.35, 0.45, 0.6][tier] });
    discMats.set(tier, dm);
  }
  const disc = new THREE.Mesh(discGeo, dm);
  disc.scale.setScalar([0, 1.3, 1.5, 1.8][tier]); disc.position.y = 0.04; disc.renderOrder = 2;
  g.add(disc, p);
  return g;
}

/** Sunucunun gönderdiği tek baytı çözer: alt 4 bit silah, üst 4 bit zırh nadirliği. */
export const gearRarity = (b: number) => ({ weapon: b & 15, armor: (b >> 4) & 15, plus: (b >> 8) & 15 });

// ═══════════════════ +5 / +6 silah efektleri ═══════════════════
// +5 "kor ateşi": silahın kendi şeklini saran akan altın alev kabuğu + kabzada dönen rün halkası.
// +6 "yıldız ateşi": renk değiştiren titrek ışık kabuğu, ters dönen iki rün halkası, namluyu saran yıldız tozu
// ve ayak altında dönen rün mührü. Hepsi gölgelendiricide zamanla hareket eder; malzemeler paylaşılır.

let runeTex: THREE.Texture | null = null;
/** Rün halkası dokusu (bir kez çizilir): iki çember arasında oyma işaretler. */
function runeTexture() {
  if (runeTex) return runeTex;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const x = c.getContext('2d')!;
  x.translate(S / 2, S / 2); x.strokeStyle = '#fff'; x.fillStyle = '#fff'; x.lineCap = 'round';
  x.lineWidth = 3; x.beginPath(); x.arc(0, 0, 118, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 2; x.beginPath(); x.arc(0, 0, 86, 0, Math.PI * 2); x.stroke();
  x.lineWidth = 1.5; x.beginPath(); x.arc(0, 0, 80, 0, Math.PI * 2); x.stroke();
  let s = 7; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
  const N = 18;
  for (let i = 0; i < N; i++) {
    x.save(); x.rotate((i / N) * Math.PI * 2); x.translate(0, -102); x.lineWidth = 2.6;
    x.beginPath();
    const k = Math.floor(r() * 4);
    if (k === 0) { x.moveTo(-6, -8); x.lineTo(0, 8); x.lineTo(6, -8); }
    else if (k === 1) { x.moveTo(0, -9); x.lineTo(0, 9); x.moveTo(-6, -2); x.lineTo(6, 4); }
    else if (k === 2) { x.moveTo(-6, 8); x.lineTo(0, -8); x.lineTo(6, 8); x.moveTo(-3, 2); x.lineTo(3, 2); }
    else { x.arc(0, 0, 6, 0, Math.PI * 2); x.moveTo(0, -9); x.lineTo(0, 9); }
    x.stroke(); x.restore();
  }
  for (let i = 0; i < 6; i++) { x.save(); x.rotate((i / 6) * Math.PI * 2); x.beginPath(); x.moveTo(0, -78); x.lineTo(5, -70); x.lineTo(0, -62); x.lineTo(-5, -70); x.closePath(); x.fill(); x.restore(); }
  runeTex = new THREE.CanvasTexture(c);
  runeTex.colorSpace = THREE.SRGBColorSpace;
  return runeTex;
}

const SHELL_VERT = /* glsl */ `
uniform float uTime, uPush;
varying vec3 vN, vV, vW;
void main() {
  vec3 p = position + normal * uPush;
  vec4 w = modelMatrix * vec4(p, 1.0);
  vW = w.xyz;
  vN = normalize(mat3(modelMatrix) * normal);
  vV = normalize(cameraPosition - w.xyz);
  gl_Position = projectionMatrix * viewMatrix * w;
}`;
const SHELL_FRAG = /* glsl */ `
uniform float uTime, uStar;
uniform vec3 uA, uB;
varying vec3 vN, vV, vW;
float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
void main() {
  float f = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.2);
  // yukarı akan alev bantları
  float band = 0.55 + 0.45 * sin(vW.y * 26.0 - uTime * 7.0 + sin(vW.x * 30.0 + uTime * 3.0) * 1.4);
  vec3 col = mix(uA, uB, band);
  if (uStar > 0.5) {
    // yıldız ateşi: renk döngüsü ve titreme
    float t = uTime * 0.8 + vW.y * 3.0;
    col = 0.5 + 0.5 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + t));
    col = mix(col, vec3(1.0, 0.95, 0.8), 0.25);
    float fl = 0.75 + 0.25 * step(0.6, h(floor(vW * 40.0) + floor(uTime * 12.0)));
    band *= fl;
  }
  float a = (0.18 + f * 1.1) * (0.6 + 0.6 * band);
  gl_FragColor = vec4(col * a * (uStar > 0.5 ? 1.5 : 1.25), 0.0);
}`;
const shellMats = new Map<number, THREE.ShaderMaterial>();
function shellMat(star: boolean) {
  const k = star ? 1 : 0;
  let m = shellMats.get(k);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.time, uPush: { value: star ? 0.016 : 0.012 }, uStar: { value: k }, uA: { value: new THREE.Color(0xff6a10) }, uB: { value: new THREE.Color(0xffe08a) } },
    vertexShader: SHELL_VERT, fragmentShader: SHELL_FRAG, transparent: true, depthWrite: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  shellMats.set(k, m);
  return m;
}

const RING_VERT = /* glsl */ `
uniform float uTime, uSpin;
varying vec2 vUv;
void main() {
  float a = uTime * uSpin;
  vec2 c = uv - 0.5;
  vUv = vec2(c.x * cos(a) - c.y * sin(a), c.x * sin(a) + c.y * cos(a)) + 0.5;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const RING_FRAG = /* glsl */ `
uniform sampler2D uMap;
uniform vec3 uCol;
uniform float uTime, uStar;
varying vec2 vUv;
void main() {
  float t = texture2D(uMap, vUv).a;
  vec3 col = uCol;
  if (uStar > 0.5) col = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + uTime * 0.5 + vUv.x));
  float pulse = 0.75 + 0.25 * sin(uTime * 3.0);
  gl_FragColor = vec4(col * t * pulse * 1.6, 0.0);
}`;
const ringMats = new Map<string, THREE.ShaderMaterial>();
function ringMat(spin: number, star: boolean, col: number) {
  const k = `${spin}|${star}|${col}`;
  let m = ringMats.get(k);
  if (m) return m;
  m = new THREE.ShaderMaterial({
    uniforms: { uTime: shared.time, uSpin: { value: spin }, uMap: { value: runeTexture() }, uCol: { value: new THREE.Color(col) }, uStar: { value: star ? 1 : 0 } },
    vertexShader: RING_VERT, fragmentShader: RING_FRAG, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
  });
  ringMats.set(k, m);
  return m;
}
const ringGeo = new THREE.PlaneGeometry(1, 1);

const MOTE_VERT = /* glsl */ `
uniform float uTime, uScale, uY0, uY1;
attribute vec4 aSeed;
varying vec3 vCol; varying float vA;
void main() {
  float t = fract(uTime * (0.18 + aSeed.x * 0.12) + aSeed.w);
  float y = mix(uY0, uY1, t);
  float ang = aSeed.y + uTime * (2.2 + aSeed.x * 1.6) + t * 9.0;
  float r = 0.07 + 0.06 * sin(t * 3.14159);
  vec4 mv = modelViewMatrix * vec4(cos(ang) * r, y, sin(ang) * r, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = max(1.0, (0.05 + 0.04 * aSeed.z) * uScale / -mv.z);
  vCol = 0.55 + 0.45 * cos(6.2831 * (vec3(0.0, 0.33, 0.67) + aSeed.z + uTime * 0.4));
  vA = sin(t * 3.14159);
}`;
const MOTE_FRAG = /* glsl */ `
varying vec3 vCol; varying float vA;
void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c) * 2.0;
  float star = max(0.0, 1.0 - d) + max(0.0, 1.0 - abs(c.x) * 14.0) * max(0.0, 1.0 - abs(c.y) * 2.2) * 0.6 + max(0.0, 1.0 - abs(c.y) * 14.0) * max(0.0, 1.0 - abs(c.x) * 2.2) * 0.6;
  gl_FragColor = vec4(vCol * star * vA * 1.8, 0.0);
}`;
const moteMats = new Map<string, THREE.ShaderMaterial>();
let moteGeo: THREE.BufferGeometry | null = null;
function motes(y0: number, y1: number) {
  if (!moteGeo) {
    const n = MOBILE ? 16 : 26, pos = new Float32Array(n * 3), seed = new Float32Array(n * 4);
    let s = 99; const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) seed.set([r(), r() * 6.283, r(), i / n], i * 4);
    moteGeo = new THREE.BufferGeometry();
    moteGeo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    moteGeo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
    moteGeo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0.5, 0), 1.6);
  }
  const k = `${y0}|${y1}`;
  let m = moteMats.get(k);
  if (!m) {
    m = new THREE.ShaderMaterial({
      uniforms: { uTime: shared.time, uScale: gearFxScale, uY0: { value: y0 }, uY1: { value: y1 } },
      vertexShader: MOTE_VERT, fragmentShader: MOTE_FRAG, transparent: true, depthWrite: false,
      blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
    });
    moteMats.set(k, m);
  }
  const p = new THREE.Points(moteGeo, m); p.renderOrder = 4;
  return p;
}

/** Silah grubuna artı efektini ekler (+5 kor ateşi, +6 yıldız ateşi). */
export function plusFx(g: THREE.Object3D, plus: number, kind: string) {
  if (plus < 5) return;
  const star = plus >= 6;
  // kabuk: silahın kendi ağları, normal boyunca biraz şişirilmiş, toplamalı parıltı
  const meshes: THREE.Mesh[] = [];
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !(m as unknown as THREE.Points).isPoints && m.geometry?.attributes.normal && m.name !== 'plus-fx') meshes.push(m); });
  for (const m of meshes) {
    const sh = new THREE.Mesh(m.geometry, shellMat(star));
    sh.name = 'plus-fx'; sh.renderOrder = 5; sh.frustumCulled = false;
    m.add(sh);
  }
  // rün halkaları: namlu eksenine dik
  const fx = new THREE.Group(); fx.name = 'plus-fx';
  const y = kind === 'staff' ? 1.12 : kind === 'bow' ? 0 : 0.2;
  const size = kind === 'staff' ? 0.5 : kind === 'bow' ? 0.46 : 0.36;
  const r1 = new THREE.Mesh(ringGeo, ringMat(1.3, star, 0xffb040));
  r1.rotation.x = -Math.PI / 2; r1.position.y = y; r1.scale.setScalar(size); r1.renderOrder = 5;
  fx.add(r1);
  if (star) {
    const r2 = new THREE.Mesh(ringGeo, ringMat(-0.9, true, 0xffffff));
    r2.rotation.x = -Math.PI / 2; r2.position.y = kind === 'staff' ? 0.75 : kind === 'bow' ? 0.35 : 0.62; r2.scale.setScalar(size * 0.78); r2.renderOrder = 5;
    fx.add(r2);
    fx.add(kind === 'bow' ? motes(-0.6, 0.6) : kind === 'staff' ? motes(0.3, 1.4) : motes(0.1, 1.05));
  }
  g.add(fx);
}

/** +6 silahlı karakterin ayak altında dönen rün mührü. */
export function sigilFx(): THREE.Object3D {
  const m = new THREE.Mesh(ringGeo, ringMat(0.35, true, 0xffffff));
  m.rotation.x = -Math.PI / 2; m.position.y = 0.05; m.scale.setScalar(1.7); m.renderOrder = 2; m.name = 'gear-fx';
  return m;
}
