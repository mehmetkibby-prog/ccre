import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { HState } from './humanoid.ts';
import { guardianClips, bodyPart } from './charAnims.ts';

/**
 * Hazır 3B modeller (GLB). `models/models.json` dosyasında listelenen modeller yüklenir;
 * listede olmayan veya yüklenemeyen model için oyun kendi prosedürel modeline düşer.
 *
 * models.json örneği:
 * {
 *   "guardian": { "url": "guardian.glb", "height": 1.85 },
 *   "hunter":   { "url": "hunter.glb", "yaw": 0 },
 *   "arcanist": { "url": "arcanist.glb", "anims": { "attack": "Spell_01" } }
 * }
 * Anahtarlar: sınıf kimliği (guardian/hunter/arcanist), NPC görünümü (smith, keeper…) veya canavar çizimi (wolf, rotguard…).
 */
export interface ModelEntry { url: string; /** animasyonlar bu modelden alınır (aynı iskeletli zırh çeşitleri) */ animFrom?: string; height?: number; yaw?: number; scale?: number; anims?: Partial<Record<HState | 'run', string>>; attackClips?: string[]; weaponBone?: string }
interface Loaded { sphere?: THREE.Sphere; scene: THREE.Object3D; clips: THREE.AnimationClip[]; entry: ModelEntry; scale: number; offsetY: number; map: Partial<Record<HState | 'run', THREE.AnimationClip>> }

const BASE = (import.meta.env.BASE_URL ?? './') + 'models/';
let manifest: Record<string, ModelEntry> | null = null;
let manifestPromise: Promise<void> | null = null;
const loaded = new Map<string, Loaded>();
const loading = new Set<string>();
const failed = new Set<string>();
let loader: GLTFLoader | null = null;
const listeners = new Set<(id: string) => void>();

function getLoader() {
  if (loader) return loader;
  loader = new GLTFLoader();
  const draco = new DRACOLoader();
  draco.setDecoderPath((import.meta.env.BASE_URL ?? './') + 'draco/');
  loader.setDRACOLoader(draco);
  loader.setMeshoptDecoder(MeshoptDecoder);
  return loader;
}

/** Yükleme durumu (test sürümünde ekranda gösterilir). */
export const modelStatus = { total: 0, loaded: 0, failed: 0, lastError: '' };
const statusListeners = new Set<() => void>();
export function onModelStatus(fn: () => void) { statusListeners.add(fn); return () => { statusListeners.delete(fn); }; }
const bumpStatus = () => statusListeners.forEach((f) => f());

function b64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
/** glTF JSON + ikili tampon → bellekte GLB. */
function packGlb(json: unknown, bin: Uint8Array | null) {
  const enc = new TextEncoder().encode(JSON.stringify(json));
  const jsonLen = (enc.length + 3) & ~3, binLen = bin ? (bin.length + 3) & ~3 : 0;
  const total = 12 + 8 + jsonLen + (bin ? 8 + binLen : 0);
  const buf = new ArrayBuffer(total), dv = new DataView(buf), u8 = new Uint8Array(buf);
  dv.setUint32(0, 0x46546c67, true); dv.setUint32(4, 2, true); dv.setUint32(8, total, true);
  dv.setUint32(12, jsonLen, true); dv.setUint32(16, 0x4e4f534a, true);
  u8.set(enc, 20); u8.fill(0x20, 20 + enc.length, 20 + jsonLen);
  if (bin) { const o = 20 + jsonLen; dv.setUint32(o, binLen, true); dv.setUint32(o + 4, 0x004e4942, true); u8.set(bin, o + 8); }
  return buf;
}
/**
 * .glb doğrudan; .json (glTF + gömülü tampon) ise tampon burada çözülüp bellekte GLB kurulur.
 * Bazı barındırıcıların içerik güvenlik politikası data: adreslerinin fetch ile okunmasını engellediği için
 * yükleyicinin gömülü tamponu kendisinin açmasına güvenilmez.
 */
async function fetchModel(url: string): Promise<GLTF> {
  const l = getLoader();
  if (!/\.json(\?|$)/i.test(url)) return l.loadAsync(url);
  const r = await fetch(url);
  if (!r.ok) throw new Error('HTTP ' + r.status + ' ' + url);
  const json = await r.json();
  let bin: Uint8Array | null = null;
  const b0 = json.buffers?.[0];
  if (typeof b0?.uri === 'string' && b0.uri.startsWith('data:')) {
    bin = b64ToBytes(b0.uri.slice(b0.uri.indexOf(',') + 1));
    delete b0.uri;
    b0.byteLength = bin.length;
  }
  const base = url.slice(0, url.lastIndexOf('/') + 1);
  return new Promise((res, rej) => l.parse(packGlb(json, bin), base, res, rej));
}

export function loadManifest(): Promise<void> {
  if (manifestPromise) return manifestPromise;
  manifestPromise = fetch(BASE + 'models.json', { cache: 'no-cache' })
    .then((r) => { if (!r.ok) { modelStatus.lastError = 'models.json HTTP ' + r.status; bumpStatus(); return {}; } return r.json(); })
    .then((m) => { manifest = m && typeof m === 'object' ? (m as Record<string, ModelEntry>) : {}; bumpStatus(); })
    .catch((e) => { manifest = {}; modelStatus.lastError = 'models.json: ' + ((e as Error)?.message ?? e); bumpStatus(); });
  return manifestPromise;
}
/** Model bildirimde var ve henüz yükleniyor mu (yüklenemezse ya da hiç yoksa false). */
export function modelPending(id: string) { if (!manifest) return true; return !!manifest[id] && !loaded.has(id) && !failed.has(id); }
/** Model bildirimde var mı (yüklenmiş olması gerekmez). */
export function hasModel(id: string) { return !!manifest?.[id]; }
/** Model yüklenince (ya da yüklenemezse null ile) çözülür. */
function whenLoaded(id: string): Promise<Loaded | null> {
  const l = model(id);
  if (l) return Promise.resolve(l);
  if (failed.has(id) || !manifest?.[id]) return Promise.resolve(null);
  return new Promise((res) => {
    const t = setInterval(() => { const x = loaded.get(id); if (x || failed.has(id)) { clearInterval(t); res(x ?? null); } }, 100);
  });
}
export function onModelReady(fn: (id: string) => void) { listeners.add(fn); return () => listeners.delete(fn); }

const PATTERNS: [HState | 'run', RegExp][] = [
  ['dead', /death|die|dying|dead|defeat/i],
  ['hurt', /hit|hurt|damage|react|impact/i],
  ['cast', /cast|spell|magic|buff/i],
  ['attack', /attack|slash|swing|strike|stab|punch|shoot|shot|bow|combo|kick/i],
  ['run', /run|jog|sprint/i],
  ['walk', /walk/i],
  ['idle', /idle|stand|breath|wait/i],
];

function prepare(id: string, gltf: GLTF, entry: ModelEntry): Loaded {
  const scene = gltf.scene;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = true; m.receiveShadow = true;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      for (const mt of mats) { const s = mt as THREE.MeshStandardMaterial; if (s.map) s.map.anisotropy = 4; s.envMapIntensity = 0.8; }
    }
  });
  // ölçek: hedef boy (m), ayaklar y=0
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3());
  const target = entry.height ?? 1.8;
  const scale = entry.scale ?? (size.y > 0.01 ? target / size.y : 1);
  const offsetY = -box.min.y * scale;
  console.debug('[model] boyut', id, size.toArray().map((v) => v.toFixed(2)).join('×'), 'ölçek', scale.toFixed(3));
  const map: Loaded['map'] = {};
  for (const [st, name] of Object.entries(entry.anims ?? {})) { const c = gltf.animations.find((a) => a.name === name); if (c) map[st as HState] = c; }
  for (const [st, re] of PATTERNS) if (!map[st]) { const c = gltf.animations.find((a) => re.test(a.name) && !Object.values(map).includes(a)); if (c) map[st] = c; }
  if (!map.idle && gltf.animations[0]) map.idle = gltf.animations.find((a) => !Object.values(map).includes(a)) ?? gltf.animations[0];
  console.debug('[model]', id, 'klipler:', gltf.animations.map((a) => a.name).join(', '), '→', Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v?.name])));
  return { scene, clips: gltf.animations, entry, scale, offsetY, map };
}

/** Model hazırsa döner; değilse yüklemeyi başlatır ve null döner. */
export function model(id: string): Loaded | null {
  const l = loaded.get(id);
  if (l) return l;
  if (failed.has(id) || loading.has(id)) return null;
  if (!manifest) { loadManifest().then(() => { if (manifest?.[id]) model(id); }); return null; }
  const entry = manifest[id];
  if (!entry) return null;
  loading.add(id);
  modelStatus.total++; bumpStatus();
  fetchModel(BASE + entry.url).then(async (gltf) => {
    if (entry.animFrom) { const b = await whenLoaded(entry.animFrom); if (b) gltf.animations = b.clips; }
    loading.delete(id);
    loaded.set(id, prepare(id, gltf, entry));
    modelStatus.loaded++; bumpStatus();
    listeners.forEach((f) => f(id));
  }).catch((err) => {
    loading.delete(id); failed.add(id);
    modelStatus.failed++; modelStatus.lastError = `${id}: ${(err as Error)?.message ?? err}`; bumpStatus();
    console.warn('[model] yüklenemedi', id, err);
  });
  return null;
}

export interface GlbBones { handR?: THREE.Object3D; handL?: THREE.Object3D; foreArmL?: THREE.Object3D; fingerR?: THREE.Object3D; fingerL?: THREE.Object3D }
export interface GlbChar { debugPose?(kind: 'a' | 's', idx: number, t: number): void; id: string; root: THREE.Object3D; height: number; update(st: HState, dt: number, moving: boolean, speed: number, restart?: boolean, skill?: number): void; hand?: THREE.Object3D; bones: GlbBones }

const _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _s = new THREE.Vector3();
/**
 * Bir nesneyi kemiğe bağlar. Yön ve konum, karakterin bağlanma (A-poz) anındaki kök uzayında verilir:
 * böylece iskeletin kemik eksenleri ne olursa olsun silah elde doğru durur (+Z ileri, +X karakterin solu).
 */
export function attachToBone(root: THREE.Object3D, bone: THREE.Object3D, obj: THREE.Object3D, rootQuat: THREE.Quaternion, rootPos: THREE.Vector3) {
  root.updateMatrixWorld(true);
  const holder = new THREE.Group();
  bone.getWorldQuaternion(_q).invert();
  root.getWorldQuaternion(_q2);
  holder.quaternion.copy(_q.multiply(_q2).multiply(rootQuat));
  holder.position.copy(bone.worldToLocal(root.localToWorld(rootPos.clone())));
  bone.getWorldScale(_s);
  holder.scale.set(1 / _s.x, 1 / _s.y, 1 / _s.z);
  holder.add(obj);
  bone.add(holder);
  return holder;
}
/** Kemiğin kök uzayındaki konumu (bağlanma pozunda). */
export function boneRootPos(root: THREE.Object3D, bone: THREE.Object3D) {
  root.updateMatrixWorld(true);
  return root.worldToLocal(bone.getWorldPosition(new THREE.Vector3()));
}

/**
 * Hazır (Meshy) saldırı/büyü klipleri 2–8 sn sürer. Önceden bütün klip 0,55 sn'ye sıkıştırılıyordu
 * (4–14 kat hız) ve hareket kesik görünüyordu. Şimdi yalnız vuruş/atış anı makul hızla oynatılır.
 */
const activeCache = new WeakMap<THREE.AnimationClip, Map<number, THREE.AnimationClip>>();
export const SWING_MAX_SPEED = 2;
/**
 * Klibin en yoğun hareket penceresi (vuruşun/atışın kendisi). Pencere uzunluğu, ekranda kalma
 * süresine en çok SWING_MAX_SPEED hızla sığacak kadardır; hareketin en çok olduğu yer seçilir.
 */
/**
 * Sınıf kliplerinde vuruş/atış anı (saniye), karelere tek tek bakılarak seçildi. Saldırıda pencere
 * ≤ 1,14 sn (0,62 sn'ye 2 katla sığar), beceride ≤ 1,75 sn. Okçu kliplerinde otomatik seçim sadağa
 * uzanmayı yakalıyordu; burada nişan + bırakma seçilir.
 */
const CLIP_WINDOWS: Record<string, { attack?: [number, number]; cast?: [number, number] }> = {
  'Attack Draw Shoot': { attack: [6.2, 7.3], cast: [5.7, 7.4] },
  'Attack Archery Shot': { attack: [3.15, 4.3], cast: [2.55, 4.3] },
  'Cast Archery Volley': { attack: [0, 0.7], cast: [0, 0.7] },
  'Attack Charged': { attack: [0.3, 1.35], cast: [0.25, 1.6] },
  'Attack Slash': { attack: [0.6, 1.75], cast: [0.5, 1.95] },
  'Attack Thrust': { attack: [1.2, 2.3], cast: [0.8, 2.4] },
  'Cast Ground Slam': { attack: [1.4, 2.5], cast: [1.05, 2.7] },
  'Attack Magic 1': { attack: [0.4, 1.5], cast: [0.3, 1.7] },
  'Attack Magic 2': { attack: [0.7, 1.8], cast: [0.45, 2.0] },
  'Cast Charged Spell': { attack: [1.3, 2.3], cast: [0.55, 2.3] },
};
function activeClip(clip: THREE.AnimationClip, screenMs: number, kind: 'attack' | 'cast'): THREE.AnimationClip {
  let per = activeCache.get(clip);
  if (!per) { per = new Map(); activeCache.set(clip, per); }
  const hit = per.get(screenMs);
  if (hit) return hit;
  const FPS = 30, n = Math.max(2, Math.round(clip.duration * FPS) + 1);
  const fixed = CLIP_WINDOWS[clip.name]?.[kind];
  if (fixed) {
    const a = Math.max(0, Math.round(fixed[0] * FPS)), b = Math.min(n - 1, Math.round(fixed[1] * FPS));
    const sub = b - a >= 6 ? THREE.AnimationUtils.subclip(clip, clip.name + '#' + kind, a, b, FPS) : clip;
    per.set(screenMs, sub);
    return sub;
  }
  const motion = new Float32Array(n);
  const q0 = new THREE.Quaternion(), q1 = new THREE.Quaternion();
  for (const tr of clip.tracks) {
    if (!(tr instanceof THREE.QuaternionKeyframeTrack) || tr.times.length < 2) continue;
    // parmak ve yüz gibi küçük kemikler yerine büyük eklemler ağırlıklı (kalça/omurga/kollar)
    const w = /hips|spine|arm|shoulder|leg|upleg|thigh|neck/i.test(tr.name) ? 1 : 0.35;
    const it = tr.createInterpolant(); let prev: Float32Array | null = null;
    for (let i = 0; i < n; i++) {
      const v = it.evaluate(Math.min(clip.duration, i / FPS)) as unknown as Float32Array;
      if (prev) { q0.fromArray(prev); q1.fromArray(v); motion[i] += w * q0.angleTo(q1); }
      prev = Float32Array.from(v);
    }
  }
  const win = Math.min(n - 1, Math.max(12, Math.round((screenMs / 1000) * SWING_MAX_SPEED * 0.92 * FPS)));
  let out = clip;
  if (win < n - 1) {
    let sum = 0;
    for (let i = 0; i < win; i++) sum += motion[i];
    let best = sum, bs = 0;
    for (let i = win; i < n; i++) { sum += motion[i] - motion[i - win]; if (sum > best) { best = sum; bs = i - win + 1; } }
    const sub = THREE.AnimationUtils.subclip(clip, clip.name + '#vurus' + screenMs, bs, bs + win, FPS);
    if (sub.duration > 0.2) out = sub;
  }
  per.set(screenMs, out);
  return out;
}
/** Sınıf modelinde her becerinin kendi klibi (1, 2: beceriler; 3: uzmanlık becerisi). */
const SKILL_CLIPS: Record<string, Record<number, string[]>> = {
  guardian: { 1: ['Attack Thrust'], 2: ['Attack Charged'], 3: ['Cast Ground Slam'] },
  hunter: { 1: ['Cast Archery Volley', 'Attack Archery Shot'], 2: ['Attack Draw Shoot'], 3: ['Attack Draw Shoot'] },
  arcanist: { 1: ['Cast Charged Spell'], 2: ['Attack Magic 2'], 3: ['Cast Charged Spell'] },
};
/** Saldırı ve beceri animasyonlarının ekranda kalma süresi (ms); renderer de bu süreleri kullanır. */
export const ATTACK_ANIM_MS = 620, CAST_ANIM_MS = 950;

/** Bir modelin kendi iskelet ve animasyon karıştırıcısıyla yeni bir örneği. */
/** Hazır silah modeli (ör. w_guardian_crimson): yüklüyse geometri ve malzemeyi paylaşan bir kopya, değilse yüklemeyi başlatıp null. */
export function weaponGlb(id: string): THREE.Object3D | null {
  const L = model(id);
  return L ? L.scene.clone(true) : null;
}

/** Elle çizilmiş klipler (model kimliği başına bir kez). */
const customClips = new Map<string, ReturnType<typeof guardianClips> | null>();

/**
 * Tilki Kral: Meshy iki ayaklı iskeletinde kuyruk kemiği yok, kuyruk köşeleri sol bacağa bağlanmıştı; yürürken
 * kuyruk bacakla savrulup gerilerek arkasında iz gibi uzuyordu. Gövdenin arkasındaki (ve bel altındaki) köşeler
 * kalçaya taşınır: kuyruk gövdeyle birlikte hareket eder. Geometri klonlar arasında ortak: bir kez yapılır.
 */
const tailFixed = new WeakSet<THREE.BufferGeometry>();
function tailToHips(scene: THREE.Object3D) {
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh || tailFixed.has(m.geometry)) return;
    tailFixed.add(m.geometry);
    const hips = m.skeleton.bones.findIndex((b) => b.name === 'Hips');
    if (hips < 0) return;
    const P = m.geometry.attributes.position, J = m.geometry.attributes.skinIndex, W = m.geometry.attributes.skinWeight;
    m.geometry.computeBoundingBox();
    const bb = m.geometry.boundingBox!, zc = (bb.min.z + bb.max.z) / 2, zh = (bb.max.z - bb.min.z) / 2, yc = (bb.min.y + bb.max.y) / 2, yh = (bb.max.y - bb.min.y) / 2;
    const ws = [0, 0, 0, 0], js = [0, 0, 0, 0];
    for (let i = 0; i < P.count; i++) {
      const back = (zc - P.getZ(i)) / zh, up = (P.getY(i) - yc) / yh;
      if (back < 0.32 || up > 0.12 || up < -0.95) continue;
      const f = THREE.MathUtils.smoothstep(back, 0.32, 0.5) * THREE.MathUtils.smoothstep(-up, -0.12, 0.02);
      if (f <= 0) continue;
      for (let k = 0; k < 4; k++) { js[k] = J.getComponent(i, k); ws[k] = W.getComponent(i, k) * (1 - f); }
      let slot = js.indexOf(hips);
      if (slot < 0) { slot = ws.indexOf(Math.min(...ws)); js[slot] = hips; ws[slot] = 0; }
      ws[slot] += f;
      const sum = ws[0] + ws[1] + ws[2] + ws[3] || 1;
      J.setXYZW(i, js[0], js[1], js[2], js[3]);
      W.setXYZW(i, ws[0] / sum, ws[1] / sum, ws[2] / sum, ws[3] / sum);
    }
    J.needsUpdate = true; W.needsUpdate = true;
  });
}

export function createGlbChar(id: string): GlbChar | null {
  const L = model(id);
  if (!L) return null;
  if (id === 'fox_king') tailToHips(L.scene);
  const inner = skClone(L.scene) as THREE.Object3D;
  inner.scale.setScalar(L.scale);
  inner.position.y = L.offsetY;
  inner.rotation.y = L.entry.yaw ?? 0;
  const root = new THREE.Group();
  root.add(inner);
  const mixer = new THREE.AnimationMixer(inner);
  const actions = new Map<THREE.AnimationClip, THREE.AnimationAction>();
  const act = (c: THREE.AnimationClip) => { let a = actions.get(c); if (!a) { a = mixer.clipAction(c); actions.set(c, a); } return a; };
  let current: THREE.AnimationAction | null = null;
  let curState: string = '';
  const find = (re: RegExp) => { let b: THREE.Object3D | undefined; inner.traverse((o) => { if (!b && (o as THREE.Bone).isBone && re.test(o.name)) b = o; }); return b; };
  const bones: GlbBones = {
    handR: find(/(right|^r)[_ .-]?hand$|hand[_ .-]?r$/i), handL: find(/(left|^l)[_ .-]?hand$|hand[_ .-]?l$/i),
    foreArmL: find(/(left|^l)[_ .-]?(fore[_ .-]?arm|lower[_ .-]?arm|elbow)$|(forearm|lowerarm)[_ .-]?l$/i),
    fingerR: find(/(right|^r)[_ .-]?hand[_ .-]?middle[_ .-]?1$|(right|^r)[_ .-]?middle[_ .-]?1$/i), fingerL: find(/(left|^l)[_ .-]?hand[_ .-]?middle[_ .-]?1$|(left|^l)[_ .-]?middle[_ .-]?1$/i),
  };
  const hand = bones.handR;
  root.updateMatrixWorld(true);
  // Görüş dışı eleme: iskeletli ağın sınır küresi bağlanma pozunda bir kez hesaplanır, animasyon payıyla büyütülür.
  // (Önceden eleme kapalıydı; köydeki tüm karakterler kamera arkasında da gölgeleriyle çiziliyordu.)
  inner.traverse((o) => {
    const sm = o as THREE.SkinnedMesh;
    if (!sm.isSkinnedMesh) return;
    if (!L.sphere) { sm.computeBoundingSphere(); L.sphere = sm.boundingSphere!.clone(); L.sphere.radius *= 1.6; }
    sm.boundingSphere = L.sphere.clone();
    sm.frustumCulled = true;
  });
  const byName = (n: string) => L.clips.find((c) => c.name === n);
  const baseId = L.entry.animFrom ?? id;
  // Muhafız: elle çizilmiş kombo ve beceri klipleri (model başına bir kez kurulur; kemik adlarıyla bağlanır)
  let custom = customClips.get(id);
  if (custom === undefined && baseId === 'guardian') { custom = guardianClips(inner, root); customClips.set(id, custom); }
  const attackClips = (L.entry.attackClips ?? []).map(byName).filter(Boolean) as THREE.AnimationClip[];
  const skillClips = SKILL_CLIPS[baseId] ?? {};
  let attackN = 0, skillN = 0;
  // saldırı/beceri üst gövdede; alt gövde duruşta vuruşun kendi bacakları, yürürken yürüme bacakları
  let swingSet: { up: THREE.AnimationAction; low: THREE.AnimationAction; walk: THREE.AnimationAction | null } | null = null;
  let walkMix = 0;
  const endSwing = (fade: number) => { if (!swingSet) return; for (const a of [swingSet.up, swingSet.low, swingSet.walk]) a?.fadeOut(fade); swingSet = null; };
  const play = (st: HState | 'run', once: boolean, skill = 0, moving = false) => {
    let clip = L.map[st] ?? (st === 'run' ? L.map.walk : st === 'cast' ? L.map.attack : st === 'hurt' ? null : null) ?? L.map.idle;
    const swing = once && (st === 'attack' || st === 'cast');
    let designed = false;
    if (st === 'attack' && custom) { clip = custom.attacks[((skill % 3) + 3) % 3]; designed = true; }
    else if (st === 'attack' && attackClips.length) clip = attackClips[attackN++ % attackClips.length];
    if (st === 'cast' && custom?.skills[skill]) { clip = custom.skills[skill]; designed = true; }
    else if (st === 'cast') { const names = skillClips[skill] ?? []; const c = names.length ? byName(names[skillN++ % names.length]) : undefined; if (c) clip = c; }
    if (!clip) return;
    const screenMs = st === 'attack' ? ATTACK_ANIM_MS : CAST_ANIM_MS;
    if (swing && !designed) clip = activeClip(clip, screenMs, st === 'attack' ? 'attack' : 'cast');
    // hazır klipler ekranda kalma süresine sığacak kadar hızlanır (en çok 2,2 kat); çizilenler zaten o süreye göre
    const ts = swing && !designed ? THREE.MathUtils.clamp(clip.duration / (screenMs / 1000 * 0.92), 0.9, SWING_MAX_SPEED) : 1;
    if (swing) {
      endSwing(0.06);
      const up = act(bodyPart(clip, true)), low = act(bodyPart(clip, false));
      for (const a of [up, low]) { a.reset(); a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; a.timeScale = ts; a.setEffectiveWeight(1); a.play(); }
      const wc = L.map.walk ? bodyPart(L.map.walk, false) : null;
      const walk = wc ? act(wc) : null;
      if (walk) { walk.setLoop(THREE.LoopRepeat, Infinity); walk.enabled = true; walk.play(); }
      walkMix = moving ? 1 : 0;
      low.setEffectiveWeight(1 - walkMix); walk?.setEffectiveWeight(walkMix);
      up.fadeIn(0.06); low.fadeIn(0.06);
      if (current) { current.fadeOut(0.08); current = null; }
      swingSet = { up, low, walk };
      return;
    }
    const a = act(clip);
    if (a === current && !once && !swingSet) return;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    a.timeScale = 1;
    a.setEffectiveWeight(1);
    a.play();
    if (swingSet) { endSwing(0.16); a.fadeIn(0.16); if (current && current !== a) current.fadeOut(0.16); }
    else if (current && current !== a) current.crossFadeTo(a, once ? 0.1 : 0.2, false);
    current = a;
  };
  play('idle', false);
  return {
    id, root, height: (L.entry.height ?? 1.8) + 0.2, hand, bones,
    /** Geliştirme: çizilmiş klibi verilen anda dondurur (kind: 'a' saldırı / 's' beceri). */
    debugPose(kind: 'a' | 's', idx: number, t: number) {
      const clip = kind === 'a' ? custom?.attacks[idx] : custom?.skills[idx];
      if (!clip) return;
      mixer.stopAllAction(); swingSet = null; current = null; curState = 'debug';
      const a = mixer.clipAction(clip); a.reset(); a.setEffectiveWeight(1); a.play(); a.time = t; a.paused = true; mixer.update(0);
    },
    update(st, dt, moving, speed, restart, skill) {
      if (curState === 'debug') return;
      const want = st === 'walk' ? (L.map.run && speed > 3.5 ? 'run' : 'walk') : st;
      if (want !== curState || (restart && (want === 'attack' || want === 'cast'))) {
        curState = want;
        play(want as HState, want === 'attack' || want === 'cast' || want === 'dead' || want === 'hurt', skill ?? 0, moving);
      }
      if ((want === 'walk' || want === 'run') && current) current.timeScale = THREE.MathUtils.clamp(speed / (want === 'run' ? 5.5 : 2.2), 0.6, 1.8);
      if (swingSet) {
        // vuruş sürerken yürümeye başlanır/durulursa bacaklar yumuşakça geçer
        walkMix += ((moving ? 1 : 0) - walkMix) * Math.min(1, dt / 90);
        swingSet.low.setEffectiveWeight(1 - walkMix);
        if (swingSet.walk) { swingSet.walk.setEffectiveWeight(walkMix); swingSet.walk.timeScale = THREE.MathUtils.clamp(speed / 2.2, 0.6, 1.8); }
      }
      mixer.update(dt / 1000);
    },
  };
}
