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
export type BonePose = { e?: [number, number, number]; a?: [number, number, number]; tw?: number; bl?: [number, number, number] };
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
  /** sağ eldeki kılıcın bıçak yönü (kök uzayı, bağlanma pozu); gear.ts ile aynı hesap */
  blade: THREE.Vector3 | null;
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
  const blade = handBlade(inner, root, bones.get('RightHand'));
  const ps = hips.parent!.getWorldScale(new THREE.Vector3());
  return { bones, parentRest, dirRest, localRest, hipsPos: hips.position.clone(), hipsScale: ps.y / rootS.y, hipsParentRest: parentRest.get('Hips')!, blade, parentName: new Map([...bones].map(([n, b]) => [n, b.parent?.name ?? ''])) };
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
  return W.addScaledVector(L, 0.18).normalize();
}

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
  } else if (bp?.e) D.setFromEuler(new THREE.Euler(bp.e[0] * D2R, bp.e[1] * D2R, bp.e[2] * D2R, 'YXZ'));
  return out.copy(Qp).invert().multiply(D).multiply(Qp).multiply(L0);
}

const rigCache = new WeakMap<THREE.Object3D, Rig>();
export function buildClip(name: string, inner: THREE.Object3D, root: THREE.Object3D, keys: Key[], dur: number): THREE.AnimationClip {
  let rig = rigCache.get(inner);
  if (!rig) { rig = readRig(inner, root); rigCache.set(inner, rig); }
  const names = [...new Set(keys.flatMap((k) => Object.keys(k.p)))].filter((n) => rig!.bones.has(n));
  const FPS = 30, n = Math.round(dur * FPS) + 1;
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
      v.set(0, ha[0] + (hb[0] - ha[0]) * u, ha[1] + (hb[1] - ha[1]) * u).applyQuaternion(inv).divideScalar(rig.hipsScale || 1).add(rig.hipsPos);
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

export const GUARDIAN_IMPACT_S = 0.17;
export function guardianClips(inner: THREE.Object3D, root: THREE.Object3D) {
  const I = GUARDIAN_IMPACT_S;
  // 1) yatay kesik: sağdan sola, gövde ile birlikte savrulur
  const a1 = buildClip('G Kesik 1', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.11, ease: 'out', hips: [-0.04, -0.05], p: B(P({ Spine02: { e: [4, -26, 0] }, Spine: { e: [0, -12, 0] }, Head: { e: [-8, 34, 0] }, RightArm: { a: [-0.92, 0.28, -0.18] }, RightForeArm: { a: [-0.55, 0.3, -0.78], bl: [-0.3, 0.6, -0.75] } }), -22, -4) },
    { t: I, ease: 'in', hips: [-0.1, 0.13], p: B(P({ ...LUNGE_L, Spine02: { e: [12, 18, 0] }, Spine: { e: [6, 12, 0] }, Head: { e: [-10, -34, 0] }, RightArm: { a: [0.15, 0.02, 1] }, RightForeArm: { a: [0.8, -0.02, 0.6], bl: [-0.2, 0.05, 1] } }), 20, 10) },
    { t: 0.31, ease: 'out', hips: [-0.11, 0.15], p: B(P({ ...LUNGE_L, Spine02: { e: [12, 32, 0] }, Spine: { e: [6, 20, 0] }, Head: { e: [-10, -50, 0] }, RightArm: { a: [0.62, -0.12, 0.7] }, RightForeArm: { a: [0.96, -0.12, -0.15], bl: [0.3, 0, 1] } }), 30, 12) },
    { t: 0.62, ease: 'inOut', p: GUARD },
  ], 0.62);
  // 2) ters kesik: soldan sağa yükselen
  const a2 = buildClip('G Kesik 2', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.11, ease: 'out', hips: [-0.05, -0.04], p: B(P({ Spine02: { e: [10, 28, 0] }, Spine: { e: [4, 14, 0] }, Head: { e: [-8, -38, 0] }, RightArm: { a: [0.55, -0.4, 0.73] }, RightForeArm: { a: [0.82, -0.5, -0.2], bl: [0.3, -0.8, -0.4] } }), 22, 6) },
    { t: I, ease: 'in', hips: [-0.09, 0.12], p: B(P({ ...LUNGE_R, Spine02: { e: [4, -18, 0] }, Spine: { e: [0, -10, 0] }, Head: { e: [-8, 32, 0] }, RightArm: { a: [-0.38, 0.28, 0.88] }, RightForeArm: { a: [-0.72, 0.55, 0.42], bl: [-0.5, 0.6, 0.6] } }), -20, 6) },
    { t: 0.31, ease: 'out', hips: [-0.08, 0.14], p: B(P({ ...LUNGE_R, Spine02: { e: [-2, -30, 0] }, Spine: { e: [-4, -16, 0] }, Head: { e: [-6, 48, 0] }, RightArm: { a: [-0.85, 0.48, 0.25] }, RightForeArm: { a: [-0.58, 0.78, -0.25], bl: [-0.6, 0.7, -0.2] } }), -30, 2) },
    { t: 0.62, ease: 'inOut', p: GUARD },
  ], 0.62);
  // 3) tepeden iniş: geriye yaylanıp bütün ağırlıkla aşağı
  const a3 = buildClip('G Kesik 3', inner, root, [
    { t: 0, p: GUARD },
    { t: 0.12, ease: 'out', hips: [0.03, -0.07], p: B(P({ Spine02: { e: [-16, 0, 0] }, Spine: { e: [-10, 0, 0] }, Head: { e: [4, 0, 0] }, RightArm: { a: [-0.18, 0.95, -0.22] }, RightForeArm: { a: [0, 0.3, -0.95], bl: [0, -0.6, -0.8] }, LeftArm: { a: [0.42, -0.25, 0.87] }, LeftForeArm: { a: [0.1, 0.55, 0.83] } }), -8, -8) },
    { t: I + 0.02, ease: 'in', hips: [-0.17, 0.16], p: B(P({ LeftUpLeg: { e: [-40, 0, 5] }, LeftLeg: { e: [50, 0, 0] }, RightUpLeg: { e: [28, 0, -5] }, RightLeg: { e: [34, 0, 0] }, Spine02: { e: [30, 0, 0] }, Spine: { e: [14, 0, 0] }, Head: { e: [-26, 0, 0] }, RightArm: { a: [-0.12, 0.02, 1] }, RightForeArm: { a: [0, -0.55, 0.84], bl: [0, 1, 0.3] } }), 6, 14) },
    { t: 0.34, ease: 'out', hips: [-0.18, 0.17], p: B(P({ LeftUpLeg: { e: [-40, 0, 5] }, LeftLeg: { e: [52, 0, 0] }, RightUpLeg: { e: [28, 0, -5] }, RightLeg: { e: [36, 0, 0] }, Spine02: { e: [34, 0, 0] }, Spine: { e: [16, 0, 0] }, Head: { e: [-30, 0, 0] }, RightArm: { a: [-0.12, -0.42, 0.9] }, RightForeArm: { a: [0, -0.88, 0.47], bl: [0, 0.4, 1] } }), 8, 16) },
    { t: 0.62, ease: 'inOut', p: GUARD },
  ], 0.62);

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
  return { attacks: [a1, a2, a3], skills: { 1: s1, 2: s2, 3: s3 } as Record<number, THREE.AnimationClip> };
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
