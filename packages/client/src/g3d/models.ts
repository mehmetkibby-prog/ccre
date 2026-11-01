import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import type { HState } from './humanoid.ts';

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
export interface ModelEntry { url: string; height?: number; yaw?: number; scale?: number; anims?: Partial<Record<HState | 'run', string>>; attackClips?: string[]; weaponBone?: string }
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
    .then((m) => { manifest = m && typeof m === 'object' ? (m as Record<string, ModelEntry>) : {}; })
    .catch((e) => { manifest = {}; modelStatus.lastError = 'models.json: ' + ((e as Error)?.message ?? e); bumpStatus(); });
  return manifestPromise;
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
  fetchModel(BASE + entry.url).then((gltf) => {
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
export interface GlbChar { id: string; root: THREE.Object3D; height: number; update(st: HState, dt: number, moving: boolean, speed: number, restart?: boolean): void; hand?: THREE.Object3D; bones: GlbBones }

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

/** Bir modelin kendi iskelet ve animasyon karıştırıcısıyla yeni bir örneği. */
export function createGlbChar(id: string): GlbChar | null {
  const L = model(id);
  if (!L) return null;
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
  const attackClips = (L.entry.attackClips ?? []).map((n) => L.clips.find((c) => c.name === n)).filter(Boolean) as THREE.AnimationClip[];
  let attackN = 0;
  const play = (st: HState | 'run', once: boolean) => {
    let clip = L.map[st] ?? (st === 'run' ? L.map.walk : st === 'cast' ? L.map.attack : st === 'hurt' ? null : null) ?? L.map.idle;
    if (st === 'attack' && attackClips.length) clip = attackClips[attackN++ % attackClips.length];
    if (!clip) return;
    const a = act(clip);
    if (a === current && !once) return;
    a.reset();
    a.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    a.clampWhenFinished = once;
    if (once && (st === 'attack' || st === 'cast')) a.timeScale = Math.max(1, clip.duration / 0.55);
    else a.timeScale = 1;
    a.play();
    if (current && current !== a) current.crossFadeTo(a, once ? 0.08 : 0.18, false);
    current = a;
  };
  play('idle', false);
  return {
    id, root, height: (L.entry.height ?? 1.8) + 0.2, hand, bones,
    update(st, dt, moving, speed, restart) {
      const want = st === 'walk' ? (L.map.run && speed > 3.5 ? 'run' : 'walk') : st;
      if (want !== curState || (restart && (want === 'attack' || want === 'cast'))) {
        curState = want;
        play(want as HState, want === 'attack' || want === 'cast' || want === 'dead' || want === 'hurt');
      }
      if ((want === 'walk' || want === 'run') && current) current.timeScale = THREE.MathUtils.clamp(speed / (want === 'run' ? 5.5 : 2.2), 0.6, 1.8);
      void moving;
      mixer.update(dt / 1000);
    },
  };
}
