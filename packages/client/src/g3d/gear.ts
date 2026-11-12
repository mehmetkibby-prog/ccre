import * as THREE from 'three';
import { weaponModel, shieldModel, type HLook } from './humanoid.ts';
import { attachToBone, boneRootPos, weaponGlb, type GlbChar } from './models.ts';
import { glowTexture } from './textures.ts';
import { weaponFx, plusFx } from './gearfx.ts';

/**
 * Elin bağlanma pozundaki geometrisinden avuç çerçevesi (kök uzayında):
 *  L = el boyu (bilekten parmak uçlarına), W = el genişliği (serçe parmaktan başparmağa, ileri),
 *  N = avuç içinin baktığı yön (gövdeye doğru), grip = sapın oturacağı nokta (avuç içinin hemen önü).
 * Meshy iskeletinde parmak kemiği olmadığı için el, ele en çok bağlı köşelerin dağılımından (PCA) çıkarılır.
 * Yumruk içindeki sap el genişliği boyunca uzanır; hazır saldırı animasyonları da bu tutuşa göre yapılmıştır.
 */
interface HandFrame { grip: THREE.Vector3; L: THREE.Vector3; W: THREE.Vector3; N: THREE.Vector3 }
const frames = new Map<string, HandFrame | null>();

function handFrame(glb: GlbChar, hand: THREE.Object3D): HandFrame | null {
  const key = glb.id + '|' + hand.name;
  if (frames.has(key)) return frames.get(key)!;
  const { root } = glb;
  root.updateMatrixWorld(true);
  let mesh: THREE.SkinnedMesh | null = null;
  root.traverse((o) => { const m = o as THREE.SkinnedMesh; if (!mesh && m.isSkinnedMesh && m.skeleton.bones.includes(hand as THREE.Bone)) mesh = m; });
  let res: HandFrame | null = null;
  if (mesh) {
    const m = mesh as THREE.SkinnedMesh;
    const bi = m.skeleton.bones.indexOf(hand as THREE.Bone);
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    // köşeler nicemlenmiş olabilir (KHR_mesh_quantization): gerçek konum ancak iskelet dönüşümüyle çıkar
    const M = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(m.matrixWorld);
    const pts: THREE.Vector3[] = [];
    for (let i = 0; i < pos.count; i++) {
      for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.5) { const v = new THREE.Vector3().fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); pts.push(v.applyMatrix4(M)); break; }
    }
    if (pts.length >= 12) {
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
      const wrist = boneRootPos(root, hand);
      if (L.dot(c.clone().sub(wrist)) < 0) L.negate();
      if (W.z < 0) W.negate();
      const N = new THREE.Vector3().crossVectors(L, W).normalize();
      if (N.x * c.x > 0) N.negate(); // gövdeye doğru
      // avuç: bilekten ağırlık merkezine %80, avuç içinin biraz önü
      const grip = wrist.clone().lerp(c, 0.8).add(N.clone().multiplyScalar(0.022));
      res = { grip, L, W, N };
    }
  }
  frames.set(key, res);
  return res;
}

/** Nesnenin yerel eksenlerini (X, Y; Z = X×Y) kök uzayındaki vektörlere oturtan dönüş. */
function basis(yAxis: THREE.Vector3, xHint: THREE.Vector3) {
  const Y = yAxis.clone().normalize();
  const X = xHint.clone().sub(Y.clone().multiplyScalar(xHint.dot(Y))).normalize();
  const Z = new THREE.Vector3().crossVectors(X, Y);
  return new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, Y, Z));
}

/** Simetrik uzun yay: dik (Y), kavis ileri (+Z), kiriş arkada; kabza orijinde. */
function bowModel() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.85 });
  const pts = [[0, 0.68, -0.14], [0, 0.5, -0.03], [0, 0.25, 0.04], [0, 0, 0.06], [0, -0.25, 0.04], [0, -0.5, -0.03], [0, -0.68, -0.14]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const limb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.013, 6), wood);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.12, 8), leather); grip.position.z = 0.06;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1.36, 4), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 })); string.position.z = -0.14;
  g.add(limb, grip, string);
  g.position.z = -0.06; // kabza avuçta
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

const UP = new THREE.Vector3(0, 1, 0);

/**
 * Hazır (GLB) karaktere sınıfının silahını ve kalkanını takar. Konum ve yön bağlanma pozunda,
 * elin gerçek geometrisinden hesaplanır; böylece silah avucun içinden geçer ve animasyonla birlikte doğru döner.
 */
/**
 * Silahın nadirlik görünümü: mavi safir parıltısı, turuncu altın-amber, kızıl ve üstü kırmızı ışıma ve hale.
 * (rarity: RARITIES sırası; 0 beyaz = özgün görünüm)
 */
const RAR_STYLE: Record<number, { tint: number; emissive: number; ei: number; halo?: number }> = {
  1: { tint: 0xa8c8ff, emissive: 0x2a5cff, ei: 0.55 },
  2: { tint: 0xffc066, emissive: 0xff7a10, ei: 0.7, halo: 0xffa040 },
  3: { tint: 0xff6a6a, emissive: 0xff1020, ei: 1.15, halo: 0xff2a30 },
};
const RAR_NAME = ['', 'blue', 'orange', 'crimson'];
const WEAPON_CLS: Record<string, string> = { sword: 'guardian', bow: 'hunter', staff: 'arcanist' };
/** Nadirliğe özel tasarlanmış silah modelinin kimliği (beyazda yok; kızıldan üstü kızıl modeli kullanır). */
export function weaponModelId(kind: string | undefined, rarity: number) {
  const cls = kind ? WEAPON_CLS[kind] : undefined;
  return cls && rarity > 0 ? `w_${cls}_${RAR_NAME[Math.min(3, rarity)]}` : null;
}
/** Tasarlanmış modelin malzemesi: dokusu hafifçe kendinden ışır (nadirlik arttıkça daha çok). Model başına bir kez kurulur. */
const glowMats = new Map<THREE.Material, THREE.Material>();
function glowGlb(g: THREE.Object3D, rarity: number) {
  const ei = [0, 0.12, 0.3, 0.5][Math.min(3, rarity)];
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.castShadow = true;
    const src = m.material as THREE.MeshStandardMaterial;
    let c = glowMats.get(src) as THREE.MeshStandardMaterial | undefined;
    if (!c) {
      c = src.clone();
      if (c.map) { c.emissiveMap = c.map; c.emissive = new THREE.Color(0xffffff); c.emissiveIntensity = ei; }
      glowMats.set(src, c);
    }
    m.material = c;
  });
}

export function styleWeapon(g: THREE.Object3D, rarity: number, kind = 'sword', designed = false) {
  const st = RAR_STYLE[Math.min(3, rarity)];
  if (!st || rarity <= 0) return;
  if (!designed) g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const mats = (Array.isArray(m.material) ? m.material : [m.material]).map((x) => {
      const c = (x as THREE.MeshStandardMaterial).clone();
      if (c.color) c.color.lerp(new THREE.Color(st.tint), 0.55);
      if ('emissive' in c) { c.emissive = new THREE.Color(st.emissive); c.emissiveIntensity = st.ei * 0.6; }
      return c;
    });
    m.material = Array.isArray(m.material) ? mats : mats[0];
  });
  if (st.halo) {
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: st.halo, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: rarity >= 3 ? 0.75 : 0.45 }));
    halo.scale.setScalar(rarity >= 3 ? 0.9 : 0.6); halo.position.y = kind === 'staff' ? 1.2 : kind === 'bow' ? 0 : 0.5; halo.name = 'rarity-halo';
    g.add(halo);
  }
  const fx = weaponFx(rarity, kind);
  if (fx) g.add(fx);
}

/**
 * Karaktere silah ve kalkan takar. Nadir silahta tasarlanmış model kullanılır; model henüz yüklenmediyse
 * renklendirilmiş basit silah takılır ve beklenen modelin kimliği döner (gelince görünüm yeniden kurulur).
 */
export function equipGlb(glb: GlbChar, L: HLook | undefined, rarity = 0, plus = 0): string | null {
  if (!L) return null;
  const { root, bones } = glb;
  const isBow = L.weapon === 'bow';
  const wid = weaponModelId(L.weapon, rarity);
  const designed = wid ? weaponGlb(wid) : null;
  let w: { obj: THREE.Object3D } | null;
  if (designed) { glowGlb(designed, rarity); const holder = new THREE.Group(); holder.add(designed); w = { obj: holder }; }
  else w = isBow ? { obj: bowModel() } : weaponModel(L);
  const hand = isBow ? bones.handL : bones.handR;
  if (w && hand) {
    const f = handFrame(glb, hand);
    const g = w.obj;
    if (!isBow) { g.rotation.set(0, 0, 0); g.position.set(0, 0, 0); }
    let q: THREE.Quaternion;
    let at: THREE.Vector3;
    if (f) {
      at = f.grip;
      switch (L.weapon) {
        case 'sword': case 'hammer': q = basis(f.W.clone().addScaledVector(f.L, 0.18), f.L); g.position.y = L.weapon === 'sword' ? -0.02 : 0.02; break; // namlu başparmak yönünde
        case 'bow': { // uzun eksen el genişliği boyunca (dik-ileri eğik), kavis parmak yönüne (gerildiğinde hedefe)
          const Y = f.W.clone().addScaledVector(UP, 0.9).normalize();
          const Z = f.L.clone().sub(Y.clone().multiplyScalar(f.L.dot(Y))).normalize();
          q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3().crossVectors(Y, Z), Y, Z));
          break;
        }
        case 'staff': q = basis(UP.clone().addScaledVector(f.W, 0.3), f.L); g.position.y = -0.25; break;
        case 'rod': q = basis(f.W.clone().addScaledVector(UP, 0.7), f.L); break;
        default: q = basis(f.W, f.L);
      }
    } else {
      at = boneRootPos(root, hand);
      q = new THREE.Quaternion();
    }
    styleWeapon(g, rarity, L.weapon, !!designed);
    plusFx(g, plus, L.weapon ?? 'sword');
    attachToBone(root, hand, g, q, at);
  }
  if (L.shield && bones.foreArmL) {
    const elbow = boneRootPos(root, bones.foreArmL);
    const wrist = bones.handL ? boneRootPos(root, bones.handL) : elbow.clone().add(new THREE.Vector3(0.1, -0.25, 0));
    const up = elbow.clone().sub(wrist).normalize(); // ön kol boyunca yukarı
    const out = new THREE.Vector3(Math.sign(elbow.x) || 1, 0, 0.35);
    out.sub(up.clone().multiplyScalar(out.dot(up))).normalize(); // kolun dışı
    const X = new THREE.Vector3().crossVectors(up, out);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(X, up, out));
    const sh = shieldModel(L);
    sh.scale.setScalar(0.8);
    attachToBone(root, bones.foreArmL, sh, q, elbow.lerp(wrist, 0.55).addScaledVector(out, 0.075));
  }
  return wid && !designed ? wid : null;
}
