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
export const gearRarity = (b: number) => ({ weapon: b & 15, armor: (b >> 4) & 15 });
