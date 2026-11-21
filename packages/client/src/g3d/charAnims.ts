import * as THREE from 'three';

/**
 * Elle çizilmiş karakter animasyonları (Meshy iskeleti: Hips, Spine02, Spine01, Spine, neck, Head,
 * Left/RightShoulder, Arm, ForeArm, Hand, UpLeg, Leg, Foot).
 *
 * Pozlar sezgisel yazılır:
 *  - { e: [x, y, z] }: model eksenlerinde derece (X: öne eğil, Y: sola dön, Z: sağa yat), eklem çevresinde
 *  - { a: [x, y, z] }: kemiğin bakacağı yön (model ekseni: +X karakterin solu, +Y yukarı, +Z ileri)
 * Her iki biçim de ebeveynin dinlenme çerçevesinde uygulanır: gövde dönünce kol da onunla döner.
 * Kareler arası geçiş 30 kare/sn örneklenir; her kare kendi yumuşatmasını seçer (vuruşta hızlı çıkış).
 */
/** w: a/bl yönleri gövde çerçevesinde değil karakterin kök ekseninde verilir (kalça ve omurga dönüşü düşülür). */
export type BonePose = { e?: [number, number, number]; a?: [number, number, number]; tw?: number; bl?: [number, number, number]; w?: boolean };
export type Pose = Record<string, BonePose>;
export interface Key { t: number; p: Pose; hips?: [number, number]; ease?: 'out' | 'in' | 'inOut' | 'lin' }

const EASE = {
  out: (u: number) => 1 - Math.pow(1 - u, 3),
  in: (u: number) => u * u * u,
  inOut: (u: number) => (u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2),
  lin: (u: number) => u,
};

interface Rig {
  bones: Map<string, THREE.Bone>;
  /** kök uzayında: ebeveynin dinlenme dönüşü, kemiğin dinlenme yönü (çocuğuna), yerel dinlenme dönüşü */
  parentRest: Map<string, THREE.Quaternion>;
  dirRest: Map<string, THREE.Vector3>;
  localRest: Map<string, THREE.Quaternion>;
  hipsPos: THREE.Vector3; hipsScale: number; hipsParentRest: THREE.Quaternion;
  /** kalçanın yerden yüksekliği (kök birimi, bağlanma pozu): hareket yakalama kliplerinde kalça kayması bununla ölçeklenir */
  hipsY: number;
  /** sağ eldeki kılıcın bıçak yönü (kök uzayı, bağlanma pozu); gear.ts ile aynı hesap */
  blade: THREE.Vector3 | null;
  /** asanın ekseni (kristal uca doğru), kök uzayında bağlanma pozunda */
  staff: THREE.Vector3 | null;
  parentName: Map<string, string>;
}

function readRig(inner: THREE.Object3D, root: THREE.Object3D): Rig {
  root.updateMatrixWorld(true);
  const rootQ = root.getWorldQuaternion(new THREE.Quaternion()).invert();
  const rootP = new THREE.Vector3(), rootS = new THREE.Vector3();
  root.matrixWorld.decompose(rootP, new THREE.Quaternion(), rootS);
  const bones = new Map<string, THREE.Bone>();
  inner.traverse((o) => { if ((o as THREE.Bone).isBone && !bones.has(o.name)) bones.set(o.name, o as THREE.Bone); });
  const parentRest = new Map<string, THREE.Quaternion>(), dirRest = new Map<string, THREE.Vector3>(), localRest = new Map<string, THREE.Quaternion>();
  const wp = (o: THREE.Object3D) => root.worldToLocal(o.getWorldPosition(new THREE.Vector3()));
  for (const [n, b] of bones) {
    parentRest.set(n, rootQ.clone().multiply(b.parent!.getWorldQuaternion(new THREE.Quaternion())));
    localRest.set(n, b.quaternion.clone());
    const child = b.children.find((c) => (c as THREE.Bone).isBone);
    dirRest.set(n, child ? wp(child).sub(wp(b)).normalize() : new THREE.Vector3(0, 1, 0));
  }
  const hips = bones.get('Hips')!;
  lastW = null;
  const blade = handBlade(inner, root, bones.get('RightHand'));
  const staff = staffAxis();
  const ps = hips.parent!.getWorldScale(new THREE.Vector3());
  const footY = Math.min(...['LeftToeBase', 'RightToeBase', 'LeftFoot', 'RightFoot'].map((n) => bones.get(n)).filter(Boolean).map((b) => wp(b!).y));
  const hipsY = wp(hips).y - (Number.isFinite(footY) ? footY : 0);
  return { bones, parentRest, dirRest, localRest, hipsPos: hips.position.clone(), hipsScale: ps.y / rootS.y, hipsParentRest: parentRest.get('Hips')!, hipsY, blade, staff, parentName: new Map([...bones].map(([n, b]) => [n, b.parent?.name ?? ''])) };
}

/**
 * Kılıcın bıçak yönü: ele en çok bağlı köşelerin dağılımından (PCA) el boyu L ve genişliği W; bıçak W + 0,18·L
 * (gear.ts kılıcı bu eksene oturtur).
 */
function handBlade(inner: THREE.Object3D, root: THREE.Object3D, hand: THREE.Bone | undefined): THREE.Vector3 | null {
  if (!hand) return null;
  let mesh: THREE.SkinnedMesh | null = null;
  inner.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m.skeleton.bones.includes(hand)) mesh = m; });
  if (!mesh) return null;
  const m = mesh as THREE.SkinnedMesh;
  const bi = m.skeleton.bones.indexOf(hand);
  const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
  const M = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(m.matrixWorld);
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < pos.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.5) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); pts.push(v.applyMatrix4(M)); break; }
  if (pts.length < 12) return null;
  const c = new THREE.Vector3(); pts.forEach((p) => c.add(p)); c.multiplyScalar(1 / pts.length);
  const C = [0, 0, 0, 0, 0, 0, 0, 0, 0];
  for (const p of pts) { const d = [p.x - c.x, p.y - c.y, p.z - c.z]; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) C[a * 3 + b] += d[a] * d[b]; }
  const mul = (v: THREE.Vector3, m9: number[]) => new THREE.Vector3(m9[0] * v.x + m9[1] * v.y + m9[2] * v.z, m9[3] * v.x + m9[4] * v.y + m9[5] * v.z, m9[6] * v.x + m9[7] * v.y + m9[8] * v.z);
  const power = (m9: number[], seed: THREE.Vector3) => { let v = seed.clone().normalize(); for (let i = 0; i < 60; i++) { const n = mul(v, m9); if (n.lengthSq() < 1e-20) break; v = n.normalize(); } return v; };
  const L = power(C, new THREE.Vector3(0.3, -1, 0.2));
  const l1 = mul(L, C).dot(L);
  const C2 = C.map((x, i) => x - l1 * [L.x, L.y, L.z][Math.floor(i / 3)] * [L.x, L.y, L.z][i % 3]);
  const W = power(C2, new THREE.Vector3(0, 0, 1));
  W.sub(L.clone().multiplyScalar(W.dot(L))).normalize();
  const wrist = root.worldToLocal(hand.getWorldPosition(new THREE.Vector3()));
  if (L.dot(c.clone().sub(wrist)) < 0) L.negate();
  if (W.z < 0) W.negate();
  lastW = W.clone();
  return W.addScaledVector(L, 0.18).normalize();
}
let lastW: THREE.Vector3 | null = null;
/** Asa ekseni (gear.ts 'staff' ile aynı): bağlanma pozunda yukarı + 0,3·W; kristal uç bu yönde. */
function staffAxis(): THREE.Vector3 | null { return lastW ? new THREE.Vector3(0, 1, 0).addScaledVector(lastW, 0.3).normalize() : null; }

const D2R = Math.PI / 180;
/** "a" pozunun gövde çerçevesindeki mutlak dönüşü (burgu / bıçak yönü dahil). */
function absAim(rig: Rig, name: string, bp: BonePose): THREE.Quaternion {
  const to = new THREE.Vector3(...bp.a!).normalize();
  const D = new THREE.Quaternion().setFromUnitVectors(rig.dirRest.get(name)!, to);
  if (bp.bl && rig.blade) {
    // bıçak yönü: önkol ekseni çevresinde, bıçağın izdüşümü istenen yönün izdüşümüne denk gelecek kadar burgu
    const b1 = rig.blade.clone().applyQuaternion(D), want = new THREE.Vector3(...bp.bl).normalize();
    b1.addScaledVector(to, -b1.dot(to)); want.addScaledVector(to, -want.dot(to));
    if (b1.lengthSq() > 1e-6 && want.lengthSq() > 1e-6) {
      b1.normalize(); want.normalize();
      D.premultiply(new THREE.Quaternion().setFromAxisAngle(to, Math.atan2(new THREE.Vector3().crossVectors(b1, want).dot(to), b1.dot(want))));
    }
  } else if (bp.tw) D.premultiply(new THREE.Quaternion().setFromAxisAngle(to, bp.tw * D2R));
  return D;
}
/**
 * Poz → kemiğin yerel dönüşü: L = Qp⁻¹ · D · Qp · L0. "e" ebeveyne göredir; "a" gövdeye göre mutlaktır:
 * ebeveyn de "a" ile döndürülmüşse (ör. önkolun üst kolu) onun dönüşü düşülür.
 */
function localFor(rig: Rig, name: string, pose: Pose, out: THREE.Quaternion) {
  const bp = pose[name];
  const L0 = rig.localRest.get(name)!, Qp = rig.parentRest.get(name)!;
  let D = new THREE.Quaternion();
  if (bp?.a) {
    D = absAim(rig, name, bp);
    const pn = rig.parentName.get(name), pp = pn ? pose[pn] : undefined;
    if (pp?.a) D.premultiply(absAim(rig, pn!, pp).invert());
  } else if (bp?.bl && rig.blade) {
    // yalnız bıçak yönü (el kemiği): bilek, kılıcı istenen yöne çevirecek en kısa dönüşü yapar (ön kol "a" ile verilmiş olmalı)
    const pn = rig.parentName.get(name)!, pp = pose[pn];
    const Dp = pp?.a ? absAim(rig, pn, pp) : new THREE.Quaternion();
    const cur = rig.blade.clone().applyQuaternion(Dp), want = new THREE.Vector3(...bp.bl).normalize();
    const R = new THREE.Quaternion().setFromUnitVectors(cur, want);
    if (bp.tw) R.premultiply(new THREE.Quaternion().setFromAxisAngle(want, bp.tw * D2R));
    D = Dp.clone().invert().multiply(R).multiply(Dp);
    if (bp.e) D.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(bp.e[0] * D2R, bp.e[1] * D2R, bp.e[2] * D2R, 'YXZ')));
  } else if (bp?.e) D.setFromEuler(new THREE.Euler(bp.e[0] * D2R, bp.e[1] * D2R, bp.e[2] * D2R, 'YXZ'));
  return out.copy(Qp).invert().multiply(D).multiply(Qp).multiply(L0);
}

/**
 * "w" işaretli kemiklerin yönlerini gövde çerçevesine çevirir: atalarının (kalça, omurga…) "e" dönüşlerinin bileşkesi C,
 * yön v için C⁻¹·v. Böylece kollar ve kılıç "karakterin önü/sağı/yukarısı"na göre yazılabilir.
 */
function resolveWorld(rig: Rig, pose: Pose): Pose {
  if (!Object.values(pose).some((bp) => bp.w)) return pose;
  const out: Pose = { ...pose };
  for (const [name, bp] of Object.entries(pose)) {
    if (!bp.w) continue;
    const chain: string[] = [];
    for (let n = rig.parentName.get(name); n; n = rig.parentName.get(n)) chain.unshift(n);
    const C = new THREE.Quaternion();
    for (const n of chain) { const e = pose[n]?.e; if (e && !pose[n]?.a) C.multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0] * D2R, e[1] * D2R, e[2] * D2R, 'YXZ'))); }
    const Ci = C.invert();
    const map = (v?: [number, number, number]) => (v ? (new THREE.Vector3(...v).applyQuaternion(Ci).toArray() as [number, number, number]) : undefined);
    out[name] = { ...bp, a: map(bp.a), bl: map(bp.bl), w: false };
  }
  return out;
}

const rigCache = new WeakMap<THREE.Object3D, Rig>();
/** Modelin bağlanma pozundaki iskelet bilgisi (bir kez okunur; kemikler dinlenme pozundayken çağrılmalı). */
export function rigOf(inner: THREE.Object3D, root: THREE.Object3D): Rig {
  let rig = rigCache.get(inner);
  if (!rig) { rig = readRig(inner, root); rigCache.set(inner, rig); }
  return rig;
}
export type { Rig };
export function buildClip(name: string, inner: THREE.Object3D, root: THREE.Object3D, keys: Key[], dur: number, hipK = 1): THREE.AnimationClip {
  let rig = rigCache.get(inner);
  if (!rig) { rig = readRig(inner, root); rigCache.set(inner, rig); }
  keys = keys.map((k) => ({ ...k, p: resolveWorld(rig!, k.p) }));
  const names = [...new Set(keys.flatMap((k) => Object.keys(k.p)))].filter((n) => rig!.bones.has(n));
  const FPS = 60, n = Math.round(dur * FPS) + 1; // 60 kare/sn örnek: hızlı savuruşta kademeli (kesik kesik) görünmesin
  const times = Float32Array.from({ length: n }, (_, i) => Math.min(dur, i / FPS));
  const seg = (t: number) => { let i = 0; while (i < keys.length - 2 && t > keys[i + 1].t) i++; const a = keys[i], b = keys[i + 1]; const u = THREE.MathUtils.clamp((t - a.t) / Math.max(1e-4, b.t - a.t), 0, 1); return { a, b, u: EASE[b.ease ?? 'inOut'](u) }; };
  const tracks: THREE.KeyframeTrack[] = [];
  const qa = new THREE.Quaternion(), qb = new THREE.Quaternion();
  for (const bn of names) {
    const vals = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) {
      const { a, b, u } = seg(times[i]);
      localFor(rig, bn, a.p, qa); localFor(rig, bn, b.p, qb);
      qa.slerp(qb, u); qa.toArray(vals, i * 4);
    }
    tracks.push(new THREE.QuaternionKeyframeTrack(`${rig.bones.get(bn)!.name}.quaternion`, times, vals));
  }
  // kalça: çömelme / öne atılma (model ekseni metre: [aşağı-yukarı, ileri])
  if (keys.some((k) => k.hips)) {
    const vals = new Float32Array(n * 3), v = new THREE.Vector3();
    const inv = rig.hipsParentRest.clone().invert();
    for (let i = 0; i < n; i++) {
      const { a, b, u } = seg(times[i]);
      const ha = a.hips ?? [0, 0], hb = b.hips ?? [0, 0];
      v.set(0, (ha[0] + (hb[0] - ha[0]) * u) * hipK, (ha[1] + (hb[1] - ha[1]) * u) * hipK).applyQuaternion(inv).divideScalar(rig.hipsScale || 1).add(rig.hipsPos);
      v.toArray(vals, i * 3);
    }
    tracks.push(new THREE.VectorKeyframeTrack(`${rig.bones.get('Hips')!.name}.position`, times, vals));
  }
  return new THREE.AnimationClip(name, dur, tracks);
}

// ───────── Muhafız (kılıç + kalkan) ─────────
/** savaş duruşu: kılıç önde, kalkan göğüs önünde, dizler hafif kırık */
const GUARD: Pose = {
  Spine02: { e: [8, 0, 0] }, Spine01: { e: [3, 0, 0] }, Spine: { e: [3, 0, 0] }, neck: { e: [-4, 0, 0] }, Head: { e: [-8, 0, 0] },
  RightArm: { a: [-0.38, -0.78, 0.5] }, RightForeArm: { a: [-0.12, 0.05, 1], bl: [0.1, 0.8, 0.6] }, RightHand: { e: [0, 0, 0] },
  LeftArm: { a: [0.35, -0.7, 0.62] }, LeftForeArm: { a: [-0.45, 0.12, 0.88] },
  LeftUpLeg: { e: [-12, 0, 6] }, LeftLeg: { e: [16, 0, 0] }, LeftFoot: { e: [-4, 0, 0] },
  RightUpLeg: { e: [10, 0, -6] }, RightLeg: { e: [14, 0, 0] }, RightFoot: { e: [-4, 0, 0] },
};
const P = (over: Pose): Pose => ({ ...GUARD, ...over });
/** tüm gövde: kalça yaw (sola +) ve öne eğilme (derece) verilir; bacaklar ters dönerek ayaklar yerde kalır */
const B = (pose: Pose, yaw: number, lean = 0): Pose => {
  const o: Pose = { ...pose, Hips: { e: [lean, yaw, 0] } };
  for (const n of ['LeftUpLeg', 'RightUpLeg']) { const e = o[n]?.e ?? [0, 0, 0]; o[n] = { e: [e[0] - lean, e[1] - yaw, e[2]] }; }
  return o;
};
const LUNGE_L: Pose = { LeftUpLeg: { e: [-30, 0, 6] }, LeftLeg: { e: [30, 0, 0] }, RightUpLeg: { e: [20, 0, -6] }, RightLeg: { e: [8, 0, 0] } };
const LUNGE_R: Pose = { RightUpLeg: { e: [-26, 0, -6] }, RightLeg: { e: [28, 0, 0] }, LeftUpLeg: { e: [16, 0, 6] }, LeftLeg: { e: [10, 0, 0] } };

/**
 * Üç sınıfın ORTAK düz vuruş ritmi (ekran süresi, sn): tuşa basıştan değme/atış anına (BASIC_HIT_S) ve duruşa dönüşe
 * (BASIC_END_S) kadar. Muhafız kılıcı, Avcı oku ve Arkanist küresi aynı anda çıkar; bekleme süresi de üçünde aynıdır
 * (classes.ts BASIC_COOLDOWN_MS). Elle çizilmiş klipler kendi tasarım zamanlarıyla yazılır ve retimeBasic ile bu ritme çekilir.
 */
export const BASIC_HIT_S = 0.16, BASIC_END_S = 0.56;
/** elle çizilmiş düz vuruş kliplerinin tasarım süresi */
const BASIC_DESIGN_END_S = 0.62;
/** tasarım zamanını ortak ritme çevirir: [0, değme] → [0, BASIC_HIT_S], [değme, 0,62] → [BASIC_HIT_S, BASIC_END_S] */
export function basicTime(t: number, designHit: number): number {
  if (t <= designHit) return (t / designHit) * BASIC_HIT_S;
  return BASIC_HIT_S + ((Math.min(t, BASIC_DESIGN_END_S) - designHit) / (BASIC_DESIGN_END_S - designHit)) * (BASIC_END_S - BASIC_HIT_S);
}
/** elle çizilmiş düz vuruş klibini ortak ritme çeker (kare değerleri aynı, yalnız zamanlar) */
export function retimeBasic(clip: THREE.AnimationClip, designHit: number): THREE.AnimationClip {
  const tracks = clip.tracks.map((tr) => { const c = tr.clone(); c.times = Float32Array.from(c.times, (t) => basicTime(t, designHit)); return c; });
  return new THREE.AnimationClip(clip.name, BASIC_END_S, tracks);
}
/** Muhafız elle çizilmiş vuruşunun tasarımdaki değme anı (sn) */
const GUARDIAN_DESIGN_HIT_S = 0.22;
/** Muhafız düz vuruşunun değme anı (ekran süresi, sn): üç sınıfta aynı */
export const GUARDIAN_IMPACT_S = BASIC_HIT_S;
/**
 * Muhafız kılıç izinin parladığı aralık (ekran süresi, kombo başına): hazırlık bittiğinde başlar, savuruşun sonunda biter.
 * Efekt (kılıç izi) bu aralıkta kılıcın gerçek ucunu ve kabzasını izler.
 */
export const GUARDIAN_TRAIL_S: [number, number][] = ([[0.15, 0.34], [0.15, 0.34], [0.17, 0.36]] as [number, number][]).map(([a, b]) => [basicTime(a, GUARDIAN_DESIGN_HIT_S), basicTime(b, GUARDIAN_DESIGN_HIT_S)]);
export function guardianClips(inner: THREE.Object3D, root: THREE.Object3D) {
  // Tasarım: kılıç hep gövdenin önünde kalır, hedefin bulunduğu yerden geçer; gövde yalnız ölçülü burulur.
  // Ritim: 0,12 sn hazırlık, kısa bekleme, ~0,06 sn kesiş (değme 0,22), savruluş, 0,62'de duruşa dönüş.
  // Kol ve kılıç yönleri karakterin kök ekseninde verilir (V: sağ, yukarı, ileri); gövde dönüşü otomatik düşülür.
  const V = (r: number, u: number, f: number): [number, number, number] => [-r, u, f];
  const KNEE: Pose = { LeftUpLeg: { e: [-16, 0, 7] }, LeftLeg: { e: [22, 0, 0] }, RightUpLeg: { e: [12, 0, -7] }, RightLeg: { e: [22, 0, 0] } };
  const STEP_L: Pose = { LeftUpLeg: { e: [-34, 0, 6] }, LeftLeg: { e: [36, 0, 0] }, LeftFoot: { e: [-6, 0, 0] }, RightUpLeg: { e: [18, 0, -6] }, RightLeg: { e: [12, 0, 0] } };
  const SH_IN: Pose = { LeftArm: { a: V(-0.3, -0.62, 0.72), w: true }, LeftForeArm: { a: V(0.55, 0.05, 0.84), w: true } };
  const SH_OUT: Pose = { LeftArm: { a: V(-0.6, -0.6, 0.5), w: true }, LeftForeArm: { a: V(-0.3, -0.05, 0.95), w: true } };
  const arm = (ua: [number, number, number], fa: [number, number, number], bl: [number, number, number]): Pose =>
    ({ RightArm: { a: V(...ua), w: true }, RightForeArm: { a: V(...fa), w: true }, RightHand: { bl: V(...bl), w: true } });
  /** gövde: öne eğilme ve sola dönüş (derece) omurgaya paylaştırılır; baş hedefe bakmaya devam eder */
  const torso = (lean: number, yaw: number): Pose => ({ Spine02: { e: [lean * 0.45, yaw * 0.5, 0] }, Spine01: { e: [lean * 0.3, yaw * 0.3, 0] }, Spine: { e: [lean * 0.25, yaw * 0.2, 0] }, Head: { e: [-6 - lean * 0.5, -yaw * 0.8, 0] } });
  const clip = (name: string, keys: [number, Pose, [number, number], Key['ease']][]) =>
    buildClip(name, inner, root, [{ t: 0, p: GUARD }, ...keys.map(([t, p, hips, ease]) => ({ t, p, hips, ease })), { t: 0.62, p: GUARD, ease: 'inOut' }], 0.62, 0.9);
  const I = GUARDIAN_DESIGN_HIT_S;

  // 1) Çapraz iniş: kılıç sağ omzun üstüne kalkar, sağ üstten sol alta keser; sol ayakla öne adım
  const w1 = (k: number) => B(P({ ...KNEE, ...SH_IN, ...torso(-2, -12 - k * 2), ...arm([0.6, 0.7, -0.1], [-0.1, 0.9, 0.3], [0.35, 0.55, -0.75]) }), -14 - k * 2, -2);
  const a1 = clip('G Kesik 1', [
    [0.12, w1(0), [-0.06, -0.05], 'out'],
    [0.16, w1(1), [-0.07, -0.06], 'lin'],
    [I, B(P({ ...STEP_L, ...SH_OUT, ...torso(10, 8), ...arm([0.05, -0.5, 0.86], [-0.75, -0.2, 0.6], [-0.2, -0.2, 0.95]) }), 10, 4), [-0.1, 0.13], 'in'],
    [0.33, B(P({ ...STEP_L, ...SH_OUT, ...torso(12, 14), ...arm([-0.35, -0.6, 0.72], [-0.8, -0.55, 0.27], [-0.8, -0.45, -0.4]) }), 14, 5), [-0.11, 0.15], 'out'],
  ]);
  // 2) Ters yatay: kılıç sol kalçaya çekilir, göğüs hizasında soldan sağa süpürür
  const w2 = (k: number) => B(P({ ...KNEE, ...SH_IN, ...torso(4, 10 + k * 2), ...arm([-0.2, -0.6, 0.75], [-0.9, -0.4, 0.17], [-0.55, 0.15, -0.8]) }), 14 + k * 2, 2);
  const a2 = clip('G Kesik 2', [
    [0.12, w2(0), [-0.06, -0.04], 'out'],
    [0.16, w2(1), [-0.07, -0.05], 'lin'],
    [I, B(P({ ...STEP_L, ...SH_OUT, ...torso(8, -6), ...arm([0, -0.35, 0.94], [0, -0.33, 0.94], [0.45, 0.05, 0.89]) }), -8, 4), [-0.09, 0.12], 'in'],
    [0.33, B(P({ ...STEP_L, ...SH_OUT, ...torso(6, -12), ...arm([0.6, -0.35, 0.72], [0.82, -0.46, 0.4], [0.75, 0.05, -0.65]) }), -16, 4), [-0.1, 0.14], 'out'],
  ]);
  // 3) Tepeden ağır iniş: geriye yaylanıp kılıcı başın üstüne kaldırır, derin hamleyle önüne indirir
  const LUNGE3: Pose = { LeftUpLeg: { e: [-42, 0, 6] }, LeftLeg: { e: [50, 0, 0] }, LeftFoot: { e: [-8, 0, 0] }, RightUpLeg: { e: [26, 0, -6] }, RightLeg: { e: [24, 0, 0] } };
  const w3 = (k: number) => B(P({ ...KNEE, ...torso(-12 - k * 3, -4), LeftArm: { a: V(-0.5, -0.3, 0.8), w: true }, LeftForeArm: { a: V(-0.1, 0.25, 0.96), w: true }, ...arm([0.25, 0.95, 0.15], [-0.2, 0.9, -0.1], [0, 0.35, -0.94]) }), -4, -6);
  const a3 = clip('G Kesik 3', [
    [0.13, w3(0), [0.04, -0.06], 'out'],
    [0.18, w3(1), [0.05, -0.07], 'lin'],
    [I + 0.02, B(P({ ...LUNGE3, ...torso(18, 2), LeftArm: { a: V(-0.65, -0.7, 0.3), w: true }, LeftForeArm: { a: V(-0.5, -0.5, 0.7), w: true }, ...arm([0, 0, 1], [-0.42, -0.7, 0.58], [0, -0.2, 0.98]) }), 4, 8), [-0.18, 0.17], 'in'],
    [0.35, B(P({ ...LUNGE3, ...torso(22, 2), LeftArm: { a: V(-0.65, -0.72, 0.28), w: true }, LeftForeArm: { a: V(-0.5, -0.55, 0.67), w: true }, ...arm([0, -0.35, 0.94], [-0.32, -0.74, 0.58], [0, -0.45, 0.89]) }), 4, 10), [-0.2, 0.18], 'out'],
  ]);

  // ─ beceriler (0,95 sn) ─
  // Zincir Çekişi: zinciri fırlat, hedefi kendine çek
  const s1 = buildClip('G Zincir', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.16, ease: 'out', hips: [-0.04, 0.06], p: P({ ...LUNGE_L, Spine02: { e: [8, -18, 0] }, Spine: { e: [4, -8, 0] }, RightArm: { a: [-0.28, 0.32, 0.9] }, RightForeArm: { a: [-0.08, 0.3, 0.95], bl: [0, 1, 0] } }) },
    { t: 0.3, ease: 'lin', hips: [-0.04, 0.07], p: P({ ...LUNGE_L, Spine02: { e: [10, -20, 0] }, Spine: { e: [4, -10, 0] }, RightArm: { a: [-0.25, 0.28, 0.93] }, RightForeArm: { a: [-0.05, 0.25, 0.97], bl: [0, 1, 0] } }) },
    { t: 0.46, ease: 'out', hips: [-0.09, -0.07], p: P({ LeftUpLeg: { e: [-32, 0, 8] }, LeftLeg: { e: [26, 0, 0] }, RightUpLeg: { e: [24, 0, -8] }, RightLeg: { e: [24, 0, 0] }, Spine02: { e: [-14, 36, 0] }, Spine: { e: [-8, 20, 0] }, Head: { e: [-10, -24, 0] }, RightArm: { a: [-0.78, -0.25, -0.57] }, RightForeArm: { a: [-0.25, 0.55, 0.8], bl: [0, 1, 0.2] } }) },
    { t: 0.66, ease: 'lin', hips: [-0.08, -0.06], p: P({ LeftUpLeg: { e: [-30, 0, 8] }, LeftLeg: { e: [24, 0, 0] }, RightUpLeg: { e: [22, 0, -8] }, RightLeg: { e: [22, 0, 0] }, Spine02: { e: [-10, 30, 0] }, Spine: { e: [-6, 16, 0] }, Head: { e: [-10, -20, 0] }, RightArm: { a: [-0.75, -0.3, -0.55] }, RightForeArm: { a: [-0.25, 0.6, 0.76], bl: [0, 1, 0.2] } }) },
    { t: 0.95, ease: 'inOut', p: GUARD },
  ], 0.95);
  // Kalkan Hücumu: çömel, kalkanla omuz omuza dal
  const s2 = buildClip('G Kalkan', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.13, ease: 'out', hips: [-0.15, -0.04], p: P({ Spine02: { e: [30, 14, 0] }, Spine: { e: [10, 4, 0] }, Head: { e: [-26, -8, 0] }, LeftArm: { a: [0.18, -0.22, 0.96] }, LeftForeArm: { a: [-0.62, 0.22, 0.75] }, RightArm: { a: [-0.6, -0.62, -0.5] }, RightForeArm: { a: [-0.3, -0.5, -0.8], bl: [0, -0.3, -1] }, LeftUpLeg: { e: [-42, 0, 6] }, LeftLeg: { e: [58, 0, 0] }, RightUpLeg: { e: [22, 0, -6] }, RightLeg: { e: [48, 0, 0] } }) },
    { t: 0.3, ease: 'in', hips: [-0.06, 0.16], p: P({ Spine02: { e: [24, -26, 0] }, Spine: { e: [8, -14, 0] }, Head: { e: [-22, 22, 0] }, LeftArm: { a: [0.05, 0.02, 1] }, LeftForeArm: { a: [-0.72, 0.3, 0.63] }, RightArm: { a: [-0.62, -0.5, -0.6] }, RightForeArm: { a: [-0.35, -0.3, -0.88], bl: [0, -0.3, -1] }, LeftUpLeg: { e: [-46, 0, 4] }, LeftLeg: { e: [22, 0, 0] }, RightUpLeg: { e: [36, 0, -4] }, RightLeg: { e: [12, 0, 0] } }) },
    { t: 0.56, ease: 'lin', hips: [-0.07, 0.15], p: P({ Spine02: { e: [22, -24, 0] }, Spine: { e: [8, -12, 0] }, Head: { e: [-20, 20, 0] }, LeftArm: { a: [0.08, 0.02, 1] }, LeftForeArm: { a: [-0.7, 0.3, 0.65] }, RightArm: { a: [-0.6, -0.52, -0.6] }, RightForeArm: { a: [-0.35, -0.32, -0.88], bl: [0, -0.3, -1] }, LeftUpLeg: { e: [-44, 0, 4] }, LeftLeg: { e: [26, 0, 0] }, RightUpLeg: { e: [32, 0, -4] }, RightLeg: { e: [16, 0, 0] } }) },
    { t: 0.95, ease: 'inOut', p: GUARD },
  ], 0.95);
  // Hüküm / Çelik İrade: kılıcı göğe kaldır, diz çöküp yere sapla
  const s3 = buildClip('G Hüküm', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.22, ease: 'out', hips: [0.02, -0.02], p: P({ Spine02: { e: [-18, 0, 0] }, Spine: { e: [-10, 0, 0] }, Head: { e: [-26, 0, 0] }, RightArm: { a: [-0.12, 1, 0.06] }, RightForeArm: { a: [0, 0.4, 0.92], bl: [0, 1, 0] }, LeftArm: { a: [0.55, 0.55, 0.62] }, LeftForeArm: { a: [-0.22, 0.7, 0.68] }, LeftUpLeg: { e: [-4, 0, 6] }, LeftLeg: { e: [4, 0, 0] }, RightUpLeg: { e: [4, 0, -6] }, RightLeg: { e: [4, 0, 0] } }) },
    { t: 0.34, ease: 'lin', hips: [0.03, -0.03], p: P({ Spine02: { e: [-22, 0, 0] }, Spine: { e: [-12, 0, 0] }, Head: { e: [-28, 0, 0] }, RightArm: { a: [-0.1, 1, 0.0] }, RightForeArm: { a: [0, 0.3, 0.95], bl: [0, 1, 0] }, LeftArm: { a: [0.55, 0.58, 0.6] }, LeftForeArm: { a: [-0.22, 0.72, 0.66] }, LeftUpLeg: { e: [-4, 0, 6] }, LeftLeg: { e: [4, 0, 0] }, RightUpLeg: { e: [4, 0, -6] }, RightLeg: { e: [4, 0, 0] } }) },
    { t: 0.46, ease: 'in', hips: [-0.3, 0.08], p: P({ Spine02: { e: [40, 0, 0] }, Spine: { e: [18, 0, 0] }, Head: { e: [-22, 0, 0] }, RightArm: { a: [-0.12, -0.5, 0.86] }, RightForeArm: { a: [0, -0.2, 0.98], bl: [0, -1, 0] }, LeftArm: { a: [0.42, -0.5, 0.75] }, LeftForeArm: { a: [-0.3, 0.1, 0.95] }, LeftUpLeg: { e: [-58, 0, 5] }, LeftLeg: { e: [78, 0, 0] }, RightUpLeg: { e: [24, 0, -5] }, RightLeg: { e: [84, 0, 0] } }) },
    { t: 0.7, ease: 'lin', hips: [-0.3, 0.08], p: P({ Spine02: { e: [38, 0, 0] }, Spine: { e: [16, 0, 0] }, Head: { e: [-26, 0, 0] }, RightArm: { a: [-0.12, -0.5, 0.86] }, RightForeArm: { a: [0, -0.2, 0.98], bl: [0, -1, 0] }, LeftArm: { a: [0.42, -0.5, 0.75] }, LeftForeArm: { a: [-0.3, 0.1, 0.95] }, LeftUpLeg: { e: [-58, 0, 5] }, LeftLeg: { e: [78, 0, 0] }, RightUpLeg: { e: [24, 0, -5] }, RightLeg: { e: [84, 0, 0] } }) },
    { t: 0.95, ease: 'inOut', p: GUARD },
  ], 0.95);
  // Yer Sarsan (Sv. 7): sıçrar, kılıcı ters (uç aşağı) iki eliyle başının üstüne kaldırır, geniş çömelişle toprağa saplar
  const UP2: Pose = { RightArm: { a: [-0.2, 0.95, 0.2] }, RightForeArm: { a: [0.3, 0.9, 0.3], bl: [0, -1, 0.1] }, LeftArm: { a: [0.2, 0.95, 0.22] }, LeftForeArm: { a: [-0.32, 0.9, 0.3] } };
  // saplama: önkollar öne yatay, iki el göğüs önünde kabzada; bıçak dimdik aşağı, ucu toprakta
  const PLANT: Pose = { RightArm: { a: [-0.12, -0.62, 0.78] }, RightForeArm: { a: [0.4, -0.05, 0.92], bl: [0, -1, 0] }, LeftArm: { a: [0.12, -0.62, 0.78] }, LeftForeArm: { a: [-0.4, -0.05, 0.92] } };
  const SQUAT: Pose = { LeftUpLeg: { e: [-62, 0, 18] }, LeftLeg: { e: [86, 0, 0] }, LeftFoot: { e: [-14, 0, 0] }, RightUpLeg: { e: [-56, 0, -18] }, RightLeg: { e: [84, 0, 0] }, RightFoot: { e: [-14, 0, 0] } };
  const s5 = buildClip('G Yer Sarsan', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.12, ease: 'out', hips: [-0.16, -0.02], p: P({ ...SQUAT, Spine02: { e: [18, 0, 0] }, Spine: { e: [8, 0, 0] }, Head: { e: [-14, 0, 0] }, RightArm: { a: [-0.3, -0.3, 0.9] }, RightForeArm: { a: [0, 0.2, 0.98], bl: [0, 1, 0] }, LeftArm: { a: [0.3, -0.3, 0.9] }, LeftForeArm: { a: [0, 0.2, 0.98] } }) },
    { t: 0.26, ease: 'out', hips: [0.16, 0.02], p: P({ ...UP2, LeftUpLeg: { e: [-30, 0, 8] }, LeftLeg: { e: [52, 0, 0] }, RightUpLeg: { e: [-22, 0, -8] }, RightLeg: { e: [58, 0, 0] }, Spine02: { e: [-16, 0, 0] }, Spine: { e: [-8, 0, 0] }, Head: { e: [-18, 0, 0] } }) },
    { t: 0.32, ease: 'lin', hips: [0.17, 0.03], p: P({ ...UP2, LeftUpLeg: { e: [-32, 0, 8] }, LeftLeg: { e: [56, 0, 0] }, RightUpLeg: { e: [-24, 0, -8] }, RightLeg: { e: [60, 0, 0] }, Spine02: { e: [-18, 0, 0] }, Spine: { e: [-9, 0, 0] }, Head: { e: [-20, 0, 0] } }) },
    { t: 0.4, ease: 'in', hips: [-0.34, 0.06], p: P({ ...SQUAT, ...PLANT, Spine02: { e: [38, 0, 0] }, Spine: { e: [16, 0, 0] }, Head: { e: [-30, 0, 0] } }) },
    { t: 0.74, ease: 'lin', hips: [-0.32, 0.06], p: P({ ...SQUAT, ...PLANT, Spine02: { e: [34, 0, 0] }, Spine: { e: [14, 0, 0] }, Head: { e: [-34, 0, 0] } }) },
    { t: 0.95, ease: 'inOut', p: GUARD },
  ], 0.95);
  // Kalkan Darbesi (Sv. 1): kalkanı göğsüne çekip gövdeyi sağa burar, sol ayakla derin hamle yapıp kalkanı hedefin yüzüne iter
  const IB = FIRST_SKILL_S[0];
  // kalkan ön kola bağlı: ön kol göğsün önünden sağa yatınca kalkanın yüzü hedefe bakar (ön kol öne uzanınca kalkan yatıyordu)
  const SH_BACK: Pose = { LeftArm: { a: V(-0.55, -0.62, -0.05), w: true }, LeftForeArm: { a: V(0.75, 0.12, 0.45), w: true } };
  const SH_PUNCH: Pose = { LeftArm: { a: V(-0.22, -0.16, 0.96), w: true }, LeftForeArm: { a: V(0.88, 0.04, 0.47), w: true } };
  const SWORD_LOW = arm([0.5, -0.78, -0.35], [0.45, -0.75, 0.1], [0.35, 0.55, -0.75]);
  const s7 = buildClip('G Kalkan Darbesi', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.12, ease: 'out', hips: [-0.08, -0.1], p: B(P({ ...KNEE, ...SH_BACK, ...SWORD_LOW, ...torso(-4, 22) }), 20, -3) },
    { t: 0.17, ease: 'lin', hips: [-0.09, -0.11], p: B(P({ ...KNEE, ...SH_BACK, ...SWORD_LOW, ...torso(-5, 24) }), 22, -3) },
    { t: IB, ease: 'in', hips: [-0.14, 0.26], p: B(P({ ...LUNGE3, ...SH_PUNCH, ...SWORD_LOW, ...torso(16, -22) }), -20, 8) },
    { t: 0.44, ease: 'out', hips: [-0.13, 0.24], p: B(P({ ...LUNGE3, ...SH_PUNCH, ...SWORD_LOW, ...torso(14, -18) }), -18, 7) },
    { t: 0.95, ease: 'inOut', p: GUARD },
  ], 0.95);
  return { attacks: [a1, a2, a3].map((c) => retimeBasic(c, GUARDIAN_DESIGN_HIT_S)), skills: { 1: s1, 2: s2, 3: s3, 5: s5, 7: s7 } as Record<number, THREE.AnimationClip> };
}
/** Sv. 7 becerilerinde vuruşun yere değdiği an (sn): efektler buna göre */
export const SKILL7_IMPACT_S = [0.4, 0.46, 0.46];
/** Sv. 1 becerilerinde değme/bırakış anı (sn): Muhafız kalkanın değdiği, Avcı havada oku bıraktığı, Arkanist şimşeği saldığı an */
export const FIRST_SKILL_S = [0.26, 0.3, 0.28];

// ───────── Avcı (yay sol elde) ─────────
/**
 * Okçu duruşu: gövde sağa döner (sol omuz hedefe), baş hedefe bakar. Kol yönleri gövde çerçevesindedir:
 * gövde -70° dönükken hedef yönü ≈ (0,94, 0, 0,34) (karakterin solu). Sol kol hedefe uzanır, sağ el kirişi
 * yanağa çeker (dirsek ok hattının gerisinde), bırakınca el omuz üstünden geriye savrulur.
 */
const HUNT: Pose = {
  Spine02: { e: [4, -6, 0] }, Spine01: { e: [2, 0, 0] }, Spine: { e: [2, 0, 0] }, Head: { e: [-4, 8, 0] },
  LeftArm: { a: [0.38, -0.72, 0.58] }, LeftForeArm: { a: [0.12, -0.35, 0.93] },
  RightArm: { a: [-0.4, -0.86, 0.32] }, RightForeArm: { a: [-0.12, -0.55, 0.83] },
  LeftUpLeg: { e: [-8, 0, 7] }, LeftLeg: { e: [10, 0, 0] }, RightUpLeg: { e: [6, 0, -7] }, RightLeg: { e: [10, 0, 0] },
};
const HP = (over: Pose): Pose => ({ ...HUNT, ...over });
/** yay çekme: gövde dönüşü (yaw, derece; toplam), yukarı nişan (rad), çekme (0..1) */
function bowPose(yaw: number, up: number, draw: number, extra: Pose = {}): Pose {
  const t = -yaw * D2R; // gövdeden bakınca hedef yönü
  const fx = Math.sin(t), fz = Math.cos(t), cu = Math.cos(up), su = Math.sin(up);
  const tgt: [number, number, number] = [fx * cu, su, fz * cu];
  const back: [number, number, number] = [-fx * 0.92 * cu, 0.06 + su * 0.35, -fz * 0.92 * cu];
  const k = draw;
  return {
    Spine: { e: [0, yaw * 0.2, 0] }, Spine01: { e: [0, yaw * 0.13, 0] }, Spine02: { e: [-4, yaw * 0.12, 0] },
    neck: { e: [0, -yaw * 0.35, 0] }, Head: { e: [-up * 40, -yaw * 0.62, 0] },
    LeftArm: { a: tgt }, LeftForeArm: { a: [tgt[0], tgt[1] + 0.02, tgt[2]] },
    // sağ kol: çekmeden önce kirişe uzanır (öne), çekince dirsek ok hattının gerisine
    RightArm: { a: [tgt[0] * (1 - k) + back[0] * k, 0.05 + su * 0.5, tgt[2] * (1 - k) + back[2] * k] },
    RightForeArm: { a: [fx * cu * 0.92, 0.02 + su * 0.6, fz * cu * 0.92 + 0.3] },
    LeftUpLeg: { e: [-6, 0, 12] }, LeftLeg: { e: [8, 0, 0] }, RightUpLeg: { e: [8, 0, -12] }, RightLeg: { e: [10, 0, 0] },
    ...extra,
  };
}
function releasePose(yaw: number, up: number, extra: Pose = {}): Pose {
  const p = bowPose(yaw, up, 1, extra);
  const t = -yaw * D2R, fx = Math.sin(t), fz = Math.cos(t);
  // bırakış: sağ el kulağın arkasından geriye savrulur, yay kolu hafif geri teper
  p.RightArm = { a: [-fx * 0.8, 0.28, -fz * 0.8 - 0.2] };
  p.RightForeArm = { a: [-fx * 0.55, 0.55, -fz * 0.6] };
  p.LeftForeArm = { a: [fx, Math.sin(up) + 0.12, fz] };
  return p;
}
/** Avcı okunun bırakıldığı an (ekran süresi, sn): üç sınıfta aynı; elle çizilmiş klipte tasarım anı 0,19 */
export const HUNTER_RELEASE_S = BASIC_HIT_S;
const HUNTER_DESIGN_HIT_S = 0.19;
export function hunterClips(inner: THREE.Object3D, root: THREE.Object3D) {
  const R = HUNTER_DESIGN_HIT_S;
  const H = (p: Pose, yaw: number, lean = 0) => B(p, yaw * 0.55, lean);
  // 1) atış: geniş okçu duruşuna oturur, yayı kaldırıp dizleri bükerek sonuna kadar çeker, bırakınca bütün gövde geri teper
  const ST1: Pose = { LeftUpLeg: { e: [-26, 0, 16] }, LeftLeg: { e: [34, 0, 0] }, RightUpLeg: { e: [18, 0, -16] }, RightLeg: { e: [30, 0, 0] } };
  const ST2: Pose = { LeftUpLeg: { e: [-30, 0, 16] }, LeftLeg: { e: [44, 0, 0] }, RightUpLeg: { e: [22, 0, -16] }, RightLeg: { e: [40, 0, 0] } };
  const ST3: Pose = { LeftUpLeg: { e: [-18, 0, 14] }, LeftLeg: { e: [22, 0, 0] }, RightUpLeg: { e: [28, 0, -14] }, RightLeg: { e: [26, 0, 0] } };
  const a1 = buildClip('H Atış 1', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.08, ease: 'out', hips: [-0.07, 0.02], p: H(bowPose(-66, 0.02, 0.45, ST1), -66, 2) },
    { t: 0.15, ease: 'inOut', hips: [-0.11, -0.02], p: H(bowPose(-74, 0.03, 1.1, ST2), -74, -4) },
    { t: R, ease: 'lin', hips: [-0.12, -0.03], p: H(bowPose(-75, 0.03, 1.15, ST2), -75, -5) },
    { t: R + 0.07, ease: 'out', hips: [-0.06, -0.13], p: H(releasePose(-78, 0.07, ST3), -78, -10) },
    { t: 0.4, ease: 'lin', hips: [-0.05, -0.11], p: H(releasePose(-74, 0.05, ST3), -74, -7) },
    { t: 0.62, ease: 'inOut', p: HUNT },
  ], 0.62);
  // 2) güçlü çekiş: dize çöker gibi alçalır, sonuna kadar çeker, geri teper
  const a2 = buildClip('H Atış 2', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.09, ease: 'out', hips: [-0.06, 0], p: H(bowPose(-66, 0.02, 0.5, { LeftUpLeg: { e: [-22, 0, 12] }, LeftLeg: { e: [30, 0, 0] }, RightUpLeg: { e: [16, 0, -12] }, RightLeg: { e: [26, 0, 0] } }), -66) },
    { t: 0.15, ease: 'inOut', hips: [-0.08, -0.02], p: H(bowPose(-74, 0.03, 1.1, { LeftUpLeg: { e: [-24, 0, 12] }, LeftLeg: { e: [34, 0, 0] }, RightUpLeg: { e: [18, 0, -12] }, RightLeg: { e: [30, 0, 0] } }), -74, -3) },
    { t: R, ease: 'lin', hips: [-0.08, -0.02], p: H(bowPose(-74, 0.03, 1.14, { LeftUpLeg: { e: [-24, 0, 12] }, LeftLeg: { e: [34, 0, 0] }, RightUpLeg: { e: [18, 0, -12] }, RightLeg: { e: [30, 0, 0] } }), -74, -3) },
    { t: R + 0.07, ease: 'out', hips: [-0.06, -0.09], p: H(releasePose(-76, 0.06, { LeftUpLeg: { e: [-18, 0, 12] }, LeftLeg: { e: [24, 0, 0] }, RightUpLeg: { e: [20, 0, -12] }, RightLeg: { e: [22, 0, 0] } }), -76, -8) },
    { t: 0.4, ease: 'lin', hips: [-0.04, -0.07], p: H(releasePose(-72, 0.05), -72, -5) },
    { t: 0.62, ease: 'inOut', p: HUNT },
  ], 0.62);
  // 3) dönerek atış: gövdeyi daha çok çevirir, kalçadan çekip bırakır
  const a3 = buildClip('H Atış 3', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.1, ease: 'out', hips: [-0.01, 0.03], p: H(bowPose(-80, -0.02, 0.6), -80, 4) },
    { t: 0.16, ease: 'inOut', hips: [-0.02, 0.04], p: H(bowPose(-84, 0.0, 1), -84, 5) },
    { t: R, ease: 'lin', hips: [-0.02, 0.04], p: H(bowPose(-84, 0.0, 1.04), -84, 5) },
    { t: R + 0.06, ease: 'out', hips: [-0.02, 0.0], p: H(releasePose(-86, 0.02), -86, 0) },
    { t: 0.38, ease: 'lin', p: H(releasePose(-80, 0.02), -80, 0) },
    { t: 0.62, ease: 'inOut', p: HUNT },
  ], 0.62);
  // beceriler (0,95 sn)
  // Yelpaze Atış: göğe doğru nişan alıp yayı yana savurarak art arda bırakır
  const s1 = buildClip('H Yelpaze', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.16, ease: 'out', hips: [-0.03, -0.02], p: H(bowPose(-55, 0.55, 0.7), -55, -10) },
    { t: 0.3, ease: 'inOut', hips: [-0.04, -0.03], p: H(bowPose(-62, 0.6, 1.05), -62, -12) },
    { t: 0.38, ease: 'out', hips: [-0.04, -0.05], p: H(releasePose(-66, 0.62), -66, -12) },
    { t: 0.52, ease: 'inOut', hips: [-0.04, -0.04], p: H(bowPose(-80, 0.5, 0.95), -80, -10) },
    { t: 0.58, ease: 'out', hips: [-0.04, -0.06], p: H(releasePose(-84, 0.5), -84, -10) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // Delici Ok: sağ dize çöker, uzun çeker, güçlü bırakışla geri sarsılır
  const KNEEL: Pose = { LeftUpLeg: { e: [-48, 0, 10] }, LeftLeg: { e: [62, 0, 0] }, LeftFoot: { e: [-10, 0, 0] }, RightUpLeg: { e: [28, 0, -8] }, RightLeg: { e: [96, 0, 0] }, RightFoot: { e: [30, 0, 0] } };
  const s2 = buildClip('H Delici', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.2, ease: 'out', hips: [-0.36, 0.02], p: H(bowPose(-68, 0.02, 0.6, KNEEL), -68, 4) },
    { t: 0.46, ease: 'inOut', hips: [-0.38, 0.02], p: H(bowPose(-74, 0.03, 1.15, KNEEL), -74, 5) },
    { t: 0.52, ease: 'out', hips: [-0.36, -0.06], p: H(releasePose(-78, 0.06, KNEEL), -78, -4) },
    { t: 0.7, ease: 'lin', hips: [-0.34, -0.04], p: H(releasePose(-74, 0.04, KNEEL), -74, -2) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // Şafak Oku: yayı göğe kaldırıp ışık toplar, aşağı indirip tek ağır atış
  const s3 = buildClip('H Şafak', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.22, ease: 'out', hips: [0.02, 0], p: H(bowPose(-40, 1.1, 0.4, { Spine02: { e: [-18, -6, 0] } }), -40, -14) },
    { t: 0.42, ease: 'inOut', hips: [-0.06, 0.02], p: H(bowPose(-72, 0.08, 1.15), -72, 2) },
    { t: 0.48, ease: 'out', hips: [-0.06, -0.08], p: H(releasePose(-76, 0.08), -76, -8) },
    { t: 0.68, ease: 'lin', hips: [-0.04, -0.05], p: H(releasePose(-72, 0.06), -72, -4) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // Kök Oku: yere doğru nişan, dizleri kırık
  const s4 = buildClip('H Kök', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.2, ease: 'out', hips: [-0.12, 0.04], p: H(bowPose(-66, -0.32, 0.7, { LeftUpLeg: { e: [-28, 0, 12] }, LeftLeg: { e: [40, 0, 0] }, RightUpLeg: { e: [20, 0, -12] }, RightLeg: { e: [34, 0, 0] } }), -66, 14) },
    { t: 0.42, ease: 'inOut', hips: [-0.14, 0.05], p: H(bowPose(-72, -0.34, 1.1, { LeftUpLeg: { e: [-30, 0, 12] }, LeftLeg: { e: [44, 0, 0] }, RightUpLeg: { e: [22, 0, -12] }, RightLeg: { e: [38, 0, 0] } }), -72, 16) },
    { t: 0.48, ease: 'out', hips: [-0.12, -0.02], p: H(releasePose(-74, -0.3), -74, 8) },
    { t: 0.7, ease: 'lin', hips: [-0.08, -0.01], p: H(releasePose(-70, -0.2), -70, 4) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // Fırtına Oku (Sv. 7): geriye yaslanıp yayı dimdik göğe çeker, bırakınca gövde geri teper; ok yağarken diz kırıp bekler
  const SKY: Pose = { LeftUpLeg: { e: [-20, 0, 14] }, LeftLeg: { e: [18, 0, 0] }, RightUpLeg: { e: [24, 0, -14] }, RightLeg: { e: [34, 0, 0] } };
  const s5 = buildClip('H Fırtına', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.14, ease: 'out', hips: [-0.06, -0.03], p: H(bowPose(-50, 0.75, 0.5, { ...SKY, Spine02: { e: [-8, -4, 0] }, Spine: { e: [-4, 0, 0] } }), -50, -4) },
    { t: 0.3, ease: 'inOut', hips: [-0.09, -0.05], p: H(bowPose(-54, 1.08, 1.15, { ...SKY, Spine02: { e: [-12, -4, 0] }, Spine: { e: [-6, 0, 0] } }), -54, -6) },
    { t: 0.38, ease: 'lin', hips: [-0.09, -0.05], p: H(bowPose(-55, 1.1, 1.18, { ...SKY, Spine02: { e: [-13, -4, 0] }, Spine: { e: [-6, 0, 0] } }), -55, -7) },
    { t: 0.46, ease: 'out', hips: [-0.11, -0.1], p: H(releasePose(-58, 1.12, { ...SKY, Spine02: { e: [-14, -6, 0] }, Spine: { e: [-7, 0, 0] } }), -58, -9) },
    { t: 0.72, ease: 'inOut', hips: [-0.15, 0.02], p: H(bowPose(-66, 0.1, 0.2, { LeftUpLeg: { e: [-30, 0, 12] }, LeftLeg: { e: [44, 0, 0] }, RightUpLeg: { e: [20, 0, -12] }, RightLeg: { e: [40, 0, 0] } }), -66, 6) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // Geri Sıçrayış (Sv. 1): derin çömelir, geriye sıçrar; havada dizler göğse toplanmışken yayı çekip bırakır, çömelerek konar
  const RB = FIRST_SKILL_S[1];
  const CROUCH: Pose = { LeftUpLeg: { e: [-44, 0, 14] }, LeftLeg: { e: [70, 0, 0] }, LeftFoot: { e: [-14, 0, 0] }, RightUpLeg: { e: [-6, 0, -14] }, RightLeg: { e: [64, 0, 0] }, RightFoot: { e: [-12, 0, 0] } };
  const TUCK: Pose = { LeftUpLeg: { e: [-62, 0, 14] }, LeftLeg: { e: [96, 0, 0] }, LeftFoot: { e: [-20, 0, 0] }, RightUpLeg: { e: [-40, 0, -14] }, RightLeg: { e: [92, 0, 0] }, RightFoot: { e: [-20, 0, 0] } };
  const LAND: Pose = { LeftUpLeg: { e: [-36, 0, 16] }, LeftLeg: { e: [58, 0, 0] }, RightUpLeg: { e: [6, 0, -16] }, RightLeg: { e: [62, 0, 0] } };
  const s7 = buildClip('H Geri Sıçrayış', inner, root, [
    { t: 0, p: HUNT },
    { t: 0.1, ease: 'out', hips: [-0.2, 0.04], p: H(bowPose(-62, 0.04, 0.35, CROUCH), -62, 10) },
    { t: 0.22, ease: 'out', hips: [0.34, -0.22], p: H(bowPose(-72, 0.14, 1.05, TUCK), -72, -14) },
    { t: RB, ease: 'lin', hips: [0.4, -0.3], p: H(bowPose(-75, 0.12, 1.15, TUCK), -75, -16) },
    { t: RB + 0.05, ease: 'out', hips: [0.36, -0.34], p: H(releasePose(-78, 0.14, TUCK), -78, -18) },
    { t: 0.5, ease: 'in', hips: [-0.18, -0.18], p: H(releasePose(-74, 0.06, LAND), -74, 6) },
    { t: 0.66, ease: 'out', hips: [-0.1, -0.1], p: H(bowPose(-68, 0.04, 0.2, LAND), -68, 4) },
    { t: 0.95, ease: 'inOut', p: HUNT },
  ], 0.95);
  // her düz vuruş aynı asa savuruşu (küre hep asanın ucundan çıkar; eski sol avuç ve tepeden indirme kaldırıldı)
  const ha = retimeBasic(a1, HUNTER_DESIGN_HIT_S);
  return { attacks: [ha, ha, ha], skills: { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5, 7: s7 } as Record<number, THREE.AnimationClip> };
}

// ───────── Arkanist (asa sağ elde) ─────────
const ARC: Pose = {
  Spine02: { e: [4, 4, 0] }, Spine01: { e: [2, 0, 0] }, Spine: { e: [2, 0, 0] }, Head: { e: [-4, -4, 0] },
  RightArm: { a: [-0.45, -0.8, 0.4] }, RightForeArm: { a: [-0.1, -0.15, 0.98] },
  LeftArm: { a: [0.45, -0.85, 0.28] }, LeftForeArm: { a: [0.25, -0.45, 0.86] },
  LeftUpLeg: { e: [-8, 0, 6] }, LeftLeg: { e: [10, 0, 0] }, RightUpLeg: { e: [8, 0, -6] }, RightLeg: { e: [10, 0, 0] },
};
const AP = (over: Pose): Pose => ({ ...ARC, ...over });
/** Arkanist düz vuruşunda kürenin asa ucundan çıktığı an (sn) */
export const ARCANIST_RELEASE_S = BASIC_HIT_S;
/** elle çizilmiş asa dürtüşünün tasarımdaki atış anı */
const ARCANIST_DESIGN_HIT_S = 0.22;
/** asa ucunun ince ışık izi bıraktığı aralık (ekran süresi, sn) */
export const ARCANIST_TRAIL_S: [number, number] = [basicTime(0.13, ARCANIST_DESIGN_HIT_S), basicTime(0.27, ARCANIST_DESIGN_HIT_S)];
export function arcanistClips(inner: THREE.Object3D, root: THREE.Object3D) {
  // "bl" (silah yönü) bu modelde asanın kristal ucunu gösterir
  let rig = rigCache.get(inner);
  if (!rig) { rig = readRig(inner, root); rigCache.set(inner, rig); }
  if (rig.staff) rig.blade = rig.staff;
  const R = 0.25; // Sv. 7 Girdap'ın atış anı (eski savuruş ritmi)
  const STEP: Pose = { LeftUpLeg: { e: [-26, 0, 6] }, LeftLeg: { e: [22, 0, 0] }, RightUpLeg: { e: [16, 0, -6] }, RightLeg: { e: [10, 0, 0] } };
  // Düz vuruş: asayı sağ omzun üstünden geriye kaldırır (sol el hedefe nişan alır), gövdeyi çevirip öne adımlar ve asayı
  // öne savurur; atış anında (R) asanın kristal ucu tam hedefe (öne, hafif yukarı) bakar, küre oradan çıkar; sonra asa
  // ucu öne-aşağı iner. Kol/bilek açıları asa ucunun yönü ölçülerek bulundu (asa yumrukta önkola dik durur).
  const WIND: Pose = { RightArm: { a: [-0.35, 0.9, 0.2] }, RightForeArm: { a: [0.2, 0.95, -0.2] }, RightHand: { e: [60, -60, 90] }, LeftArm: { a: [0.5, 0.05, 0.86] }, LeftForeArm: { a: [0.1, 0.2, 0.97] } };
  const SHOT: Pose = { RightArm: { a: [-0.25, 0.1, 0.96] }, RightForeArm: { a: [-0.3, 0.5, 0.81] }, RightHand: { e: [120, 0, 30] }, LeftArm: { a: [0.62, -0.45, 0.64] }, LeftForeArm: { a: [0.45, -0.75, 0.48] } };
  const FOLLOW: Pose = { RightArm: { a: [-0.25, -0.1, 0.96] }, RightForeArm: { a: [0.6, 0.2, 0.77] }, RightHand: { e: [60, 0, 90] }, LeftArm: { a: [0.62, -0.5, 0.6] }, LeftForeArm: { a: [0.4, -0.8, 0.45] } };
  // bacaklar: hazırlıkta ağırlık arka (sağ) bacakta, dizler bükük; atışta büyük öne hamle (ön diz bükük, arka bacak gergin)
  const BACK: Pose = { LeftUpLeg: { e: [-10, 0, 8] }, LeftLeg: { e: [12, 0, 0] }, RightUpLeg: { e: [-4, 0, -8] }, RightLeg: { e: [30, 0, 0] } };
  const LUNGE: Pose = { LeftUpLeg: { e: [-42, 0, 7] }, LeftLeg: { e: [42, 0, 0] }, RightUpLeg: { e: [26, 0, -7] }, RightLeg: { e: [6, 0, 0] } };
  const LUNGE2: Pose = { LeftUpLeg: { e: [-46, 0, 7] }, LeftLeg: { e: [48, 0, 0] }, RightUpLeg: { e: [28, 0, -7] }, RightLeg: { e: [8, 0, 0] } };
  // Düz vuruş (yeniden): asayı sağ kalçaya geri çekip sol avucuyla hedefe nişan alır, sonra sol ayakla öne adımlayıp
  // asayı hedefe uzatır (dürtme); kürenin çıktığı anda (ARCANIST_RELEASE_S) asa ucu öne-yukarı hedefe bakar.
  // Yönler karakterin kök ekseninde (V: sağ, yukarı, ileri).
  const V = (r: number, u: number, f: number): [number, number, number] => [-r, u, f];
  const W = (o: Record<string, [number, number, number]>, bl?: [number, number, number]): Pose => {
    const p: Pose = {};
    for (const [k, v] of Object.entries(o)) p[k] = { a: V(...v), w: true };
    if (bl) p.RightHand = { bl: V(...bl), w: true };
    return p;
  };
  const tors = (lean: number, yaw: number): Pose => ({ Spine02: { e: [lean * 0.45, yaw * 0.5, 0] }, Spine01: { e: [lean * 0.3, yaw * 0.3, 0] }, Spine: { e: [lean * 0.25, yaw * 0.2, 0] }, Head: { e: [-4 - lean * 0.5, -yaw * 0.85, 0] } });
  const AIM = (k: number) => B(AP({ ...BACK, ...tors(-4, -14 - k * 3), ...W({ RightArm: [0.5, -0.5, -0.3], RightForeArm: [0.25, 0.45, 0.6], LeftArm: [-0.22, -0.2, 0.95], LeftForeArm: [0.05, 0.12, 0.99] }, [0.1, 0.75, -0.65]) }), -10 - k * 2, -3);
  const THRUST = B(AP({ ...LUNGE, ...tors(8, 6), ...W({ RightArm: [0.15, -0.28, 0.95], RightForeArm: [0.02, -0.35, 0.94], LeftArm: [-0.45, -0.8, 0.3], LeftForeArm: [0.45, -0.1, 0.88] }, [0, 0.42, 0.9]) }), 6, 6);
  const RECOIL = B(AP({ ...LUNGE2, ...tors(10, 8), ...W({ RightArm: [0.12, -0.4, 0.9], RightForeArm: [0, -0.5, 0.86], LeftArm: [-0.45, -0.82, 0.25], LeftForeArm: [0.5, -0.15, 0.85] }, [0, 0.25, 0.97]) }), 8, 8);
  const a1 = buildClip('A Asa Dürtüşü', inner, root, [
    { t: 0, p: ARC },
    { t: 0.12, ease: 'out', hips: [-0.06, -0.06], p: AIM(0) },
    { t: 0.16, ease: 'lin', hips: [-0.07, -0.07], p: AIM(1) },
    { t: ARCANIST_DESIGN_HIT_S, ease: 'in', hips: [-0.11, 0.17], p: THRUST },
    { t: 0.34, ease: 'out', hips: [-0.13, 0.2], p: RECOIL },
    { t: 0.62, ease: 'inOut', p: ARC },
  ], 0.62);
  // beceriler
  const WIDE: Pose = { LeftUpLeg: { e: [-14, 0, 14] }, LeftLeg: { e: [24, 0, 0] }, RightUpLeg: { e: [10, 0, -14] }, RightLeg: { e: [24, 0, 0] } };
  // Öz Halkası: asayı göğe kaldırır, çömelip yere vurur
  const s1 = buildClip('A Halka', inner, root, [
    { t: 0, p: ARC },
    { t: 0.26, ease: 'out', hips: [0.03, -0.02], p: AP({ Spine02: { e: [-20, 0, 0] }, Spine: { e: [-10, 0, 0] }, Head: { e: [-22, 0, 0] }, RightArm: { a: [-0.2, 0.97, 0.1] }, RightForeArm: { a: [-0.05, 0.98, 0.2] }, LeftArm: { a: [0.7, 0.6, 0.38] }, LeftForeArm: { a: [0.45, 0.85, 0.27] } }) },
    { t: 0.36, ease: 'lin', hips: [0.04, -0.02], p: AP({ Spine02: { e: [-22, 0, 0] }, Spine: { e: [-12, 0, 0] }, Head: { e: [-26, 0, 0] }, RightArm: { a: [-0.18, 0.98, 0.08] }, RightForeArm: { a: [-0.05, 0.99, 0.15] }, LeftArm: { a: [0.72, 0.62, 0.3] }, LeftForeArm: { a: [0.45, 0.86, 0.22] } }) },
    { t: 0.5, ease: 'in', hips: [-0.28, 0.08], p: AP({ ...WIDE, LeftUpLeg: { e: [-46, 0, 14] }, LeftLeg: { e: [68, 0, 0] }, RightUpLeg: { e: [30, 0, -14] }, RightLeg: { e: [70, 0, 0] }, Spine02: { e: [34, 0, 0] }, Spine: { e: [16, 0, 0] }, Head: { e: [-24, 0, 0] }, RightArm: { a: [-0.2, -0.35, 0.92] }, RightForeArm: { a: [-0.05, -0.85, 0.52] }, LeftArm: { a: [0.85, -0.25, 0.45] }, LeftForeArm: { a: [0.6, -0.5, 0.62] } }) },
    { t: 0.72, ease: 'lin', hips: [-0.27, 0.08], p: AP({ ...WIDE, LeftUpLeg: { e: [-44, 0, 14] }, LeftLeg: { e: [64, 0, 0] }, RightUpLeg: { e: [28, 0, -14] }, RightLeg: { e: [66, 0, 0] }, Spine02: { e: [30, 0, 0] }, Spine: { e: [14, 0, 0] }, Head: { e: [-26, 0, 0] }, RightArm: { a: [-0.2, -0.35, 0.92] }, RightForeArm: { a: [-0.05, -0.85, 0.52] }, LeftArm: { a: [0.85, -0.2, 0.48] }, LeftForeArm: { a: [0.6, -0.45, 0.66] } }) },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // Kırağı Mührü: iki avucunu öne uzatır, mührü iter
  const s2 = buildClip('A Mühür', inner, root, [
    { t: 0, p: ARC },
    { t: 0.22, ease: 'out', hips: [-0.04, -0.03], p: AP({ Spine02: { e: [-6, 0, 0] }, RightArm: { a: [-0.6, -0.1, 0.79] }, RightForeArm: { a: [0.45, 0.2, 0.87] }, LeftArm: { a: [0.6, -0.1, 0.79] }, LeftForeArm: { a: [-0.45, 0.2, 0.87] } }) },
    { t: 0.42, ease: 'in', hips: [-0.08, 0.12], p: AP({ ...STEP, Spine02: { e: [16, 0, 0] }, Spine: { e: [8, 0, 0] }, Head: { e: [-14, 0, 0] }, RightArm: { a: [-0.22, 0.12, 0.97] }, RightForeArm: { a: [-0.05, 0.1, 0.99] }, LeftArm: { a: [0.22, 0.12, 0.97] }, LeftForeArm: { a: [0.05, 0.1, 0.99] } }) },
    { t: 0.7, ease: 'lin', hips: [-0.08, 0.12], p: AP({ ...STEP, Spine02: { e: [14, 0, 0] }, Spine: { e: [8, 0, 0] }, Head: { e: [-12, 0, 0] }, RightArm: { a: [-0.24, 0.1, 0.96] }, RightForeArm: { a: [-0.06, 0.12, 0.99] }, LeftArm: { a: [0.24, 0.1, 0.96] }, LeftForeArm: { a: [0.06, 0.12, 0.99] } }) },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // Öz Patlaması: enerjiyi göğsünde toplar (kollar içe), sonra iki yana patlatır
  const s3 = buildClip('A Patlama', inner, root, [
    { t: 0, p: ARC },
    { t: 0.3, ease: 'out', hips: [-0.12, -0.02], p: AP({ ...WIDE, Spine02: { e: [22, 0, 0] }, Spine: { e: [10, 0, 0] }, Head: { e: [-6, 0, 0] }, RightArm: { a: [-0.4, -0.55, 0.73] }, RightForeArm: { a: [0.7, 0.1, 0.7] }, LeftArm: { a: [0.4, -0.55, 0.73] }, LeftForeArm: { a: [-0.7, 0.1, 0.7] } }) },
    { t: 0.44, ease: 'in', hips: [0.04, 0.03], p: AP({ Spine02: { e: [-24, 0, 0] }, Spine: { e: [-12, 0, 0] }, Head: { e: [-24, 0, 0] }, RightArm: { a: [-0.9, 0.42, 0.1] }, RightForeArm: { a: [-0.85, 0.5, 0.15] }, LeftArm: { a: [0.9, 0.42, 0.1] }, LeftForeArm: { a: [0.85, 0.5, 0.15] } }) },
    { t: 0.7, ease: 'lin', hips: [0.03, 0.02], p: AP({ Spine02: { e: [-20, 0, 0] }, Spine: { e: [-10, 0, 0] }, Head: { e: [-20, 0, 0] }, RightArm: { a: [-0.9, 0.38, 0.15] }, RightForeArm: { a: [-0.85, 0.45, 0.2] }, LeftArm: { a: [0.9, 0.38, 0.15] }, LeftForeArm: { a: [0.85, 0.45, 0.2] } }) },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // Yaşam Dalgası: asayı yükseltir, sol kolu açar, göğe bakar
  const s4 = buildClip('A Dalga', inner, root, [
    { t: 0, p: ARC },
    { t: 0.3, ease: 'out', hips: [0.03, 0], p: AP({ Spine02: { e: [-18, 0, 0] }, Spine: { e: [-8, 0, 0] }, Head: { e: [-30, 0, 0] }, RightArm: { a: [-0.35, 0.92, 0.15] }, RightForeArm: { a: [-0.1, 0.97, 0.2] }, LeftArm: { a: [0.92, 0.3, 0.25] }, LeftForeArm: { a: [0.85, 0.45, 0.28] } }) },
    { t: 0.7, ease: 'lin', hips: [0.04, 0], p: AP({ Spine02: { e: [-20, 0, 0] }, Spine: { e: [-10, 0, 0] }, Head: { e: [-34, 0, 0] }, RightArm: { a: [-0.32, 0.93, 0.15] }, RightForeArm: { a: [-0.08, 0.98, 0.2] }, LeftArm: { a: [0.93, 0.32, 0.18] }, LeftForeArm: { a: [0.86, 0.46, 0.22] } }) },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // Öz Girdabı (Sv. 7): asayı başının üstünde iki kez çevirir (gövde sola-sağa burulur), sonra öne hamleyle girdabı iter
  const SWIRL = (yaw: number, side: number): Pose => B(AP({ ...WIDE, Spine02: { e: [-14, yaw * 0.5, side * 8] }, Spine: { e: [-6, yaw * 0.3, 0] }, Head: { e: [-20, -yaw * 0.4, 0] }, RightArm: { a: [-0.3 + side * 0.25, 0.94, 0.15 - side * 0.2] }, RightForeArm: { a: [side * 0.45, 0.85, 0.25] }, RightHand: { e: [20, side * 40, 0] }, LeftArm: { a: [0.85, 0.35 + side * 0.15, 0.3] }, LeftForeArm: { a: [0.7, 0.55, 0.3] } }), yaw * 0.4, -6);
  const s5 = buildClip('A Girdap', inner, root, [
    { t: 0, p: ARC },
    { t: 0.13, ease: 'out', hips: [-0.06, 0], p: SWIRL(34, 1) },
    { t: 0.26, ease: 'inOut', hips: [-0.07, 0], p: SWIRL(-34, -1) },
    { t: 0.36, ease: 'inOut', hips: [-0.08, -0.04], p: SWIRL(26, 1) },
    { t: R + 0.21, ease: 'in', hips: [-0.15, 0.22], p: B(AP({ ...LUNGE, ...SHOT, Spine02: { e: [14, 4, 0] }, Spine01: { e: [5, 2, 0] }, Spine: { e: [4, 0, 0] }, Head: { e: [-16, -4, 0] } }), 4, 12) },
    { t: 0.72, ease: 'lin', hips: [-0.16, 0.24], p: B(AP({ ...LUNGE2, ...FOLLOW, Spine02: { e: [16, 6, 0] }, Spine01: { e: [6, 2, 0] }, Spine: { e: [5, 0, 0] }, Head: { e: [-18, -6, 0] } }), 6, 14) },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // Öz Zinciri (Sv. 1): sol avucunda kıvılcım toplarken asayı geri alır, derin hamleyle asa ucunu hedefe uzatıp şimşeği salar
  const RA = FIRST_SKILL_S[2];
  const s7 = buildClip('A Zincir', inner, root, [
    { t: 0, p: ARC },
    { t: 0.13, ease: 'out', hips: [-0.07, -0.08], p: AIM(0) },
    { t: 0.21, ease: 'lin', hips: [-0.08, -0.09], p: AIM(1.4) },
    { t: RA, ease: 'in', hips: [-0.13, 0.2], p: THRUST },
    { t: 0.46, ease: 'out', hips: [-0.15, 0.23], p: RECOIL },
    { t: 0.62, ease: 'lin', hips: [-0.14, 0.21], p: RECOIL },
    { t: 0.95, ease: 'inOut', p: ARC },
  ], 0.95);
  // her düz vuruş aynı asa savuruşu (küre hep asanın ucundan çıkar; eski sol avuç ve tepeden indirme kaldırıldı)
  const aa = retimeBasic(a1, ARCANIST_DESIGN_HIT_S);
  return { attacks: [aa, aa, aa], skills: { 1: s1, 2: s2, 3: s3, 4: s4, 5: s5, 7: s7 } as Record<number, THREE.AnimationClip> };
}

// ───────── Şifa Bahçesi: diz çöküp orakla bitki kesme (üç sınıf aynı iskelet) ─────────
/** Döngü: sol el bitkiyi tutar, sağ el orağı geriden öne-sola çeker (0,7 sn). */
export function gatherClip(inner: THREE.Object3D, root: THREE.Object3D) {
  const V = (r: number, u: number, f: number): [number, number, number] => [-r, u, f];
  const KNEEL: Pose = { LeftUpLeg: { e: [-50, 0, 10] }, LeftLeg: { e: [66, 0, 0] }, LeftFoot: { e: [-12, 0, 0] }, RightUpLeg: { e: [24, 0, -10] }, RightLeg: { e: [100, 0, 0] }, RightFoot: { e: [32, 0, 0] } };
  const body = (lean: number, yaw: number): Pose => ({ Spine02: { e: [lean * 0.45, yaw * 0.5, 0] }, Spine01: { e: [lean * 0.3, yaw * 0.3, 0] }, Spine: { e: [lean * 0.25, yaw * 0.2, 0] }, neck: { e: [6, 0, 0] }, Head: { e: [14, -yaw * 0.6, 0] } });
  const LH: Pose = { LeftArm: { a: V(-0.12, -0.72, 0.68), w: true }, LeftForeArm: { a: V(0.12, -0.8, 0.58), w: true } };
  const back = (): Pose => ({ ...KNEEL, ...body(30, -10), ...LH, RightArm: { a: V(0.45, -0.55, 0.35), w: true }, RightForeArm: { a: V(0.35, -0.65, 0.45), w: true } });
  const cut = (): Pose => ({ ...KNEEL, ...body(34, 8), ...LH, RightArm: { a: V(0.02, -0.68, 0.73), w: true }, RightForeArm: { a: V(-0.45, -0.62, 0.6), w: true } });
  return buildClip('Bitki Topla', inner, root, [
    { t: 0, hips: [-0.42, 0.06], p: back() },
    { t: 0.3, hips: [-0.43, 0.08], ease: 'in', p: cut() },
    { t: 0.7, hips: [-0.42, 0.06], ease: 'inOut', p: back() },
  ], 0.7);
}

// ───────── üst / alt gövde ayrımı (yürürken vurmak için) ─────────
const LOWER_RE = /(hips|upleg|leg|foot|toebase|toe_end)$/i;
const partCache = new WeakMap<THREE.AnimationClip, { up?: THREE.AnimationClip; low?: THREE.AnimationClip }>();
/** Klibin yalnız üst gövde (omurga, kollar, baş) ya da yalnız alt gövde (kalça, bacaklar) izleri. */
export function bodyPart(clip: THREE.AnimationClip, upper: boolean): THREE.AnimationClip {
  let c = partCache.get(clip);
  if (!c) { c = {}; partCache.set(clip, c); }
  const k = upper ? 'up' : 'low';
  if (c[k]) return c[k]!;
  const tracks = clip.tracks.filter((t) => LOWER_RE.test(t.name.split('.')[0]) !== upper);
  return (c[k] = new THREE.AnimationClip(clip.name + (upper ? '#üst' : '#alt'), clip.duration, tracks));
}

