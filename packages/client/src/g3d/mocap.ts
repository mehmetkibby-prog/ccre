import * as THREE from 'three';
import { GUARDIAN_IMPACT_S, ARCANIST_RELEASE_S, type Rig } from './charAnims.ts';

/**
 * Hareket yakalama (mocap) kliplerini Meshy iskeletine aktarma.
 *
 * Kaynak: Quaternius "Universal Animation Library" 1-2 ve Mesh2Motion (ikisi de CC0 1.0, ticari kullanım serbest).
 * Klipler geliştirmede bir kez "pişirilir" (public/anims/mocap.json): her kemiğin dinlenme pozundan bu yana dünya
 * uzayındaki dönüşü (D), karakterin kendi ekseninde (+X sol, +Y yukarı, +Z ileri) saklanır; kalça kayması kalça
 * yüksekliğine bölünür. Böylece veri iskeletten bağımsızdır.
 *
 * Oyunda her model için: Meshy modeli A duruşunda (kollar aşağı), kaynak T duruşunda; önce modelin kol/bacak kemikleri
 * kaynağın dinlenme yönlerine çevrilir (T duruşu karşılığı), sağ el de silahı kaynaktaki tutuşa (yumruk, bıçak ileri)
 * gelecek kadar burulur. Sonra her karede W = D · W_T; yerel dönüş = ebeveyn⁻¹ · W.
 */
export interface MocapClip {
  fps: number;
  n: number;
  /** kemik başına n×4 dönüş (D, karakter ekseninde) */
  q: Record<string, number[]>;
  /** n×3 kalça kayması (karakter ekseninde, kalça yüksekliği birimi) */
  hips: number[];
  /** kaynağın dinlenme pozunda kemik yönleri (çocuğuna doğru), karakter ekseninde */
  rest: Record<string, [number, number, number]>;
  /** vuruş / atış anı (sn, klip zamanı) */
  hit: number;
}
export interface MocapData { v: 1; clips: Record<string, MocapClip> }

/** T duruşuna çevrilecek kemikler (ebeveynden çocuğa) ve yön ölçülen çocukları */
const ALIGN: [string, string][] = [
  ['LeftArm', 'LeftForeArm'], ['LeftForeArm', 'LeftHand'], ['RightArm', 'RightForeArm'], ['RightForeArm', 'RightHand'],
  ['LeftUpLeg', 'LeftLeg'], ['LeftLeg', 'LeftFoot'], ['RightUpLeg', 'RightLeg'], ['RightLeg', 'RightFoot'],
];
export const MOCAP_BONES = ['Hips', 'Spine02', 'Spine01', 'Spine', 'neck', 'Head', 'LeftShoulder', 'LeftArm', 'LeftForeArm', 'LeftHand', 'RightShoulder', 'RightArm', 'RightForeArm', 'RightHand', 'LeftUpLeg', 'LeftLeg', 'LeftFoot', 'LeftToeBase', 'RightUpLeg', 'RightLeg', 'RightFoot', 'RightToeBase'];

let data: MocapData | null = null;
let loading: Promise<MocapData | null> | null = null;
/** Pişmiş klipleri bir kez yükler (oyun açılırken arka planda). */
export function loadMocap(): Promise<MocapData | null> {
  return (loading ??= fetch('/anims/mocap.json?v=1').then((r) => (r.ok ? r.json() : null)).then((d) => (data = d)).catch(() => null));
}
export function mocapReady() { return data; }
/** test / araç: pişmiş veriyi doğrudan verir */
export function setMocapData(d: MocapData | null) { data = d; }

/** Klibin sonuna, vuruş anına göre zaman eğrisi: [kaynak sn, oyun sn] çiftleri (doğrusal parçalı). */
export type TimeMap = [number, number][];
const warp = (map: TimeMap, t: number) => {
  for (let i = 1; i < map.length; i++) {
    const [a0, b0] = map[i - 1], [a1, b1] = map[i];
    if (t <= a1 || i === map.length - 1) return b0 + ((t - a0) / Math.max(1e-6, a1 - a0)) * (b1 - b0);
  }
  return t;
};

const tRef = new WeakMap<Rig, Map<string, Map<string, THREE.Quaternion>>>();
/** Modelin T duruşu karşılığı (kök uzayında dünya dönüşleri); klibin kaynak dinlenme yönlerine göre. */
function tPose(rig: Rig, clipKey: string, c: MocapClip, weapon: 'blade' | 'staff' | null): Map<string, THREE.Quaternion> {
  let per = tRef.get(rig);
  if (!per) { per = new Map(); tRef.set(rig, per); }
  const hit = per.get(clipKey);
  if (hit) return hit;
  const W = new Map<string, THREE.Quaternion>(), localDir = new Map<string, THREE.Vector3>();
  for (const n of MOCAP_BONES) {
    if (!rig.bones.has(n)) continue;
    const w = rig.parentRest.get(n)!.clone().multiply(rig.localRest.get(n)!);
    W.set(n, w);
    localDir.set(n, rig.dirRest.get(n)!.clone().applyQuaternion(w.clone().invert()));
  }
  const desc = (n: string): string[] => { const out: string[] = []; for (const m of W.keys()) { let p = rig.parentName.get(m); while (p) { if (p === n) { out.push(m); break; } p = rig.parentName.get(p); } } return out; };
  const q = new THREE.Quaternion();
  for (const [n] of ALIGN) {
    const want = c.rest[n], w = W.get(n);
    if (!want || !w) continue;
    const cur = localDir.get(n)!.clone().applyQuaternion(w);
    q.setFromUnitVectors(cur.normalize(), new THREE.Vector3(...want).normalize());
    for (const m of [n, ...desc(n)]) W.get(m)!.premultiply(q);
  }
  // silah tutuşu: kaynakta yumruktaki silah T duruşunda ileri bakar (+Z); el, önkol ekseni çevresinde ona burulur
  const hand = W.get('RightHand'), axis = weapon === 'staff' ? rig.staff : weapon === 'blade' ? rig.blade : null;
  if (hand && axis) {
    const rest = rig.parentRest.get('RightHand')!.clone().multiply(rig.localRest.get('RightHand')!);
    const local = axis.clone().applyQuaternion(rest.invert());
    const along = localDir.get('RightHand')!.clone().applyQuaternion(hand).normalize();
    const b = local.applyQuaternion(hand), want = new THREE.Vector3(0, 0, 1);
    b.addScaledVector(along, -b.dot(along)); want.addScaledVector(along, -want.dot(along));
    if (b.lengthSq() > 1e-6 && want.lengthSq() > 1e-6) {
      b.normalize(); want.normalize();
      hand.premultiply(new THREE.Quaternion().setFromAxisAngle(along, Math.atan2(new THREE.Vector3().crossVectors(b, want).dot(along), b.dot(want))));
    }
  }
  per.set(clipKey, W);
  return W;
}

/**
 * Pişmiş klibi bu modelin iskeletine aktarır. map: kaynak zamanını oyun zamanına çeviren eğri (vuruş anı hizalanır);
 * from/to: kaynak klipten alınacak aralık. hipK: kalça kaymasının ölçeği (yerinde vuruş için < 1).
 */
/**
 * Yumuşatma (0..1, 1 = kaynaktaki gibi): kalça, omurga ve bacak dönüşleri ebeveynlerine göre (yerel) dik duruşa doğru
 * çekilir. Kollar gövdeye bağlı kalır, savuruş yalnız küçülür; derin çömelme ve tam dönüşler ölçülü olur.
 */
export interface MocapDamp { hips?: number; spine?: number; legs?: number; head?: number }
const DAMP_GROUP: Record<string, keyof MocapDamp> = {
  Hips: 'hips', Spine02: 'spine', Spine01: 'spine', Spine: 'spine', neck: 'head', Head: 'head',
  LeftUpLeg: 'legs', LeftLeg: 'legs', LeftFoot: 'legs', LeftToeBase: 'legs', RightUpLeg: 'legs', RightLeg: 'legs', RightFoot: 'legs', RightToeBase: 'legs',
};
/** lock: bu kemiklerin yerel dönüşü verilen poza (ör. kalkan kolu savaş duruşunda) w oranında sabitlenir */
export interface MocapLock { pose: Map<string, THREE.Quaternion>; w: number }
export function mocapClip(name: string, rig: Rig, key: string, map: TimeMap, opt: { weapon?: 'blade' | 'staff' | null; hipK?: number; damp?: MocapDamp; lock?: MocapLock } = {}): THREE.AnimationClip | null {
  const c = data?.clips[key];
  if (!c) return null;
  const Wt = tPose(rig, key, c, opt.weapon ?? null);
  const from = map[0][0], to = map[map.length - 1][0];
  const i0 = Math.max(0, Math.floor(from * c.fps)), i1 = Math.min(c.n - 1, Math.ceil(to * c.fps));
  const frames = i1 - i0 + 1;
  const times = new Float32Array(frames);
  for (let i = 0; i < frames; i++) times[i] = Math.max(0, warp(map, Math.min(to, Math.max(from, (i0 + i) / c.fps))));
  const names = MOCAP_BONES.filter((n) => rig.bones.has(n) && c.q[n] && Wt.has(n));
  const world = new Map<string, THREE.Quaternion>(names.map((n) => [n, new THREE.Quaternion()]));
  const out = new Map<string, Float32Array>(names.map((n) => [n, new Float32Array(frames * 4)]));
  const D = new THREE.Quaternion(), L = new THREE.Quaternion(), P = new THREE.Quaternion(), prev = new Map<string, THREE.Quaternion>();
  // T duruşundaki yerel dönüşler (yumuşatmanın hedefi)
  const refLocal = new Map<string, THREE.Quaternion>();
  for (const n of names) refLocal.set(n, (Wt.get(rig.parentName.get(n)!) ?? rig.parentRest.get(n)!).clone().invert().multiply(Wt.get(n)!));
  for (let f = 0; f < frames; f++) {
    const k = (i0 + f) * 4;
    for (const n of names) { const a = c.q[n]; D.set(a[k], a[k + 1], a[k + 2], a[k + 3]); world.get(n)!.copy(D).multiply(Wt.get(n)!); }
    for (const n of names) {
      const pn = rig.parentName.get(n)!;
      P.copy(world.get(pn) ?? rig.parentRest.get(n)!).invert();
      L.copy(P).multiply(world.get(n)!);
      const g = DAMP_GROUP[n], k = g ? opt.damp?.[g] : undefined;
      if (k !== undefined && k < 1) { const r = refLocal.get(n)!; if (r.dot(L) < 0) L.set(-L.x, -L.y, -L.z, -L.w); L.copy(r.clone().slerp(L, k)); }
      const lk = opt.lock?.pose.get(n);
      if (lk) L.slerp(lk, opt.lock!.w);
      const pv = prev.get(n);
      if (pv && pv.dot(L) < 0) L.set(-L.x, -L.y, -L.z, -L.w);
      prev.set(n, L.clone());
      L.toArray(out.get(n)!, f * 4);
    }
  }
  const tracks: THREE.KeyframeTrack[] = names.map((n) => new THREE.QuaternionKeyframeTrack(`${rig.bones.get(n)!.name}.quaternion`, times, out.get(n)!));
  if (c.hips.length && rig.bones.has('Hips')) {
    const vals = new Float32Array(frames * 3), v = new THREE.Vector3(), inv = rig.hipsParentRest.clone().invert(), h = rig.hipsY * (opt.hipK ?? 1);
    const base = new THREE.Vector3(c.hips[i0 * 3], 0, c.hips[i0 * 3 + 2]);
    for (let f = 0; f < frames; f++) {
      const k = (i0 + f) * 3;
      // yatay kayma klibin ilk karesine göre (yerinde vuruş); dikey (çömelme) dinlenme pozuna göre
      v.set(c.hips[k] - base.x, c.hips[k + 1], c.hips[k + 2] - base.z).multiplyScalar(h).applyQuaternion(inv).divideScalar(rig.hipsScale || 1).add(rig.hipsPos);
      v.toArray(vals, f * 3);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${rig.bones.get('Hips')!.name}.position`, times, vals));
  }
  return new THREE.AnimationClip(name, times[frames - 1], tracks);
}

/**
 * Düz vuruş kombosu: hareket yakalama klipleri (mocap.ts). Her vuruş: [klip, kaynak başlangıç, kaynak değme anı,
 * kaynak bitiş] (sn). Değme anı oyundaki vuruş anına (efekt ve hasar sayısı) hizalanır, bitiş saldırı süresine (ATTACK_ANIM_MS).
 */
export type MSpec = [string, number, number, number];
/** Kullanılan kombolar (boş: elle çizilmiş eski vuruşlar). MOCAP_TRIED: denenip beğenilmeyen aktarımlar, karşılaştırma için. */
export const MOCAP_ATTACK: Record<string, { hit: number; weapon: 'blade' | 'staff'; hipK: number; damp?: MocapDamp; lockLeft?: number; combo: MSpec[] }> = {};
export const MOCAP_TRIED: Record<string, { hit: number; weapon: 'blade' | 'staff'; hipK: number; damp?: MocapDamp; lockLeft?: number; combo: MSpec[] }> = {
  // tek elle kılıç kombosu (Mesh2Motion, CC0): sağ üstten çapraz iniş → ters yatay savuruş → tepeden kesip duruşa dönüş.
  // Üç vuruş aynı kesintisiz çekimden: art arda basılınca birbirine akar. Kalkan kolu savaş duruşunda kalır.
  guardian: { hit: GUARDIAN_IMPACT_S, weapon: 'blade', hipK: 0.9, damp: { hips: 0.85, spine: 0.9, legs: 0.85, head: 0.7 }, lockLeft: 1,
    combo: [['slash', 0.05, 0.367, 0.85], ['slash', 0.7, 1.05, 1.26], ['slash', 1.06, 1.31, 1.75]] },
  // asayı iki eliyle hedefe saplar gibi uzatır (mızrak hamlesi, Mesh2Motion CC0); küre en uzandığı anda asa ucundan çıkar
  arcanist: { hit: ARCANIST_RELEASE_S, weapon: 'staff', hipK: 0.9, damp: { hips: 0.9, spine: 0.9, legs: 0.85, head: 0.75 },
    combo: [['thrust', 0.2, 0.4, 0.95]] },
};

// ───────── Meshy hareket kütüphanesi: modelin kendi iskeletine çekilmiş klipler (aktarma yok) ─────────
/** Kemik başına yerel dönüşler (n×4) ve kalçanın yerel konumu (n×3); karakterin Meshy iskeletiyle birebir aynı. */
export interface NativeClip { fps: number; n: number; q: Record<string, number[]>; hips: number[] }
let nativeData: { clips: Record<string, NativeClip> } | null = null;
let nativeLoading: Promise<unknown> | null = null;
export function loadNative(url = '/anims/native.json?v=2') {
  return (nativeLoading ??= fetch(url).then((r) => (r.ok ? r.json() : null)).then((d) => (nativeData = d)).catch(() => null));
}
export function nativeReady() { return nativeData; }
export function setNativeData(d: { clips: Record<string, NativeClip> } | null) { nativeData = d; }
/**
 * Kütüphane klibinin bir aralığını oyun süresine yerleştirir (değme anı hizalı). Kalça yatayda yerinde tutulur (klip
 * yürüyerek ilerliyor), dikey iniş-kalkış (çökme, hamle) korunur. lock: kalkan kolu gibi kemikleri sabit poza çeker.
 */
export function nativeClip(name: string, rig: Rig, key: string, map: TimeMap, opt: { lock?: MocapLock; stepK?: number } = {}): THREE.AnimationClip | null {
  const c = nativeData?.clips[key];
  if (!c) return null;
  const from = map[0][0], to = map[map.length - 1][0];
  const i0 = Math.max(0, Math.floor(from * c.fps)), i1 = Math.min(c.n - 1, Math.ceil(to * c.fps));
  const frames = i1 - i0 + 1;
  const times = new Float32Array(frames);
  for (let i = 0; i < frames; i++) times[i] = Math.max(0, warp(map, Math.min(to, Math.max(from, (i0 + i) / c.fps))));
  const tracks: THREE.KeyframeTrack[] = [];
  const Q = new THREE.Quaternion();
  for (const [bn, a] of Object.entries(c.q)) {
    const bone = rig.bones.get(bn);
    if (!bone) continue;
    const vals = new Float32Array(frames * 4), lk = opt.lock?.pose.get(bn);
    for (let f = 0; f < frames; f++) {
      const k = (i0 + f) * 4; Q.set(a[k], a[k + 1], a[k + 2], a[k + 3]);
      if (lk) Q.slerp(lk, opt.lock!.w);
      Q.toArray(vals, f * 4);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${bone.name}.quaternion`, times, vals));
  }
  const hb = rig.bones.get('Hips');
  if (hb && c.hips.length) {
    const vals = new Float32Array(frames * 3), x0 = c.hips[i0 * 3], z0 = c.hips[i0 * 3 + 2], sk = opt.stepK ?? 0;
    for (let f = 0; f < frames; f++) {
      const k = (i0 + f) * 3;
      vals[f * 3] = rig.hipsPos.x + (c.hips[k] - x0) * sk; vals[f * 3 + 1] = c.hips[k + 1]; vals[f * 3 + 2] = rig.hipsPos.z + (c.hips[k + 2] - z0) * sk;
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${hb.name}.position`, times, vals));
  }
  return new THREE.AnimationClip(name, times[frames - 1], tracks);
}
/** Kullanılan kütüphane kombosu: [klip, kaynak başlangıç, kaynak değme anı, kaynak bitiş] (boş: elle çizilmiş eski vuruşlar) */
export const NATIVE_ATTACK: Record<string, { hit: number; lockLeft?: number; stepK?: number; combo: MSpec[] }> = {
  // Muhafız: Meshy "Weapon Combo 2" — üç vuruş (sağdan çapraz, yatay savuruş, tepeden iniş); pencereler kılıç ucunun
  // en hızlı olduğu anlara (1,20 / 2,07 / 3,10 sn) göre seçildi. Hazırlık kısa kesilir: vuruş tuşa basınca çabuk gelir
  // (değme anı üç sınıfta aynı, BASIC_HIT_S).
  guardian: { hit: GUARDIAN_IMPACT_S, combo: [['g241', 0.96, 1.18, 1.62], ['g241', 1.82, 2.05, 2.5], ['g241', 2.87, 3.1, 3.6]] },
  // Arkanist: Meshy "Mage Spell Cast" — asayla öne itiş, küre değme anında çıkar
  arcanist: { hit: ARCANIST_RELEASE_S, combo: [['a132', 0.84, 1.05, 1.55]] },
};
