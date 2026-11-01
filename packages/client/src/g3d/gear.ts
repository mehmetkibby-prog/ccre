import * as THREE from 'three';
import { weaponModel, shieldModel, type HLook } from './humanoid.ts';
import { attachToBone, boneRootPos, type GlbChar } from './models.ts';

const E = (x: number, y: number, z: number) => new THREE.Quaternion().setFromEuler(new THREE.Euler(x, y, z));

/** Avuç içi: el kemiği ile orta parmak kökü arası; parmak kemiği yoksa ön kol yönünde biraz ileri. */
function palm(root: THREE.Object3D, hand: THREE.Object3D, finger?: THREE.Object3D) {
  const h = boneRootPos(root, hand);
  if (finger) return h.lerp(boneRootPos(root, finger), 0.55);
  const p = hand.parent ? boneRootPos(root, hand.parent) : h.clone().add(new THREE.Vector3(0, 0.1, 0));
  return h.clone().add(h.clone().sub(p).setLength(0.07));
}

/** Simetrik uzun yay: dik (Y), kavis ileri (+Z), kiriş arkada; kabza orijinde. */
function bowModel() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: 0x4a3020, roughness: 0.7 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x2a1c12, roughness: 0.85 });
  const pts = [[0, 0.68, -0.14], [0, 0.5, -0.03], [0, 0.25, 0.04], [0, 0, 0.06], [0, -0.25, 0.04], [0, -0.5, -0.03], [0, -0.68, -0.14]].map(([x, y, z]) => new THREE.Vector3(x, y, z));
  const limb = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.013, 6), wood);
  const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.019, 0.019, 0.14, 8), leather); grip.position.z = 0.06;
  const string = new THREE.Mesh(new THREE.CylinderGeometry(0.0022, 0.0022, 1.36, 4), new THREE.MeshStandardMaterial({ color: 0xd8d0c0, roughness: 0.6 })); string.position.z = -0.14;
  g.add(limb, grip, string);
  g.position.z = -0.06; // kabza avuçta
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

/**
 * Hazır (GLB) karaktere sınıfının silahını ve kalkanını takar. Yönler bağlanma pozunda kök uzayında verilir
 * (+Z ileri, +Y yukarı, +X karakterin solu), bu yüzden iskeletin kemik eksenlerinden bağımsızdır.
 */
export function equipGlb(glb: GlbChar, L: HLook | undefined) {
  if (!L) return;
  const { root, bones } = glb;
  const w = L.weapon === 'bow' ? { obj: bowModel() } : weaponModel(L);
  if (w) {
    const left = L.weapon === 'bow';
    const hand = left ? bones.handL : bones.handR;
    if (hand) {
      const g = w.obj;
      if (L.weapon !== 'bow') { g.rotation.set(0, 0, 0); g.position.set(0, 0, 0); }
      let q = new THREE.Quaternion();
      switch (L.weapon) {
        case 'sword': case 'hammer': q = E(Math.PI / 2 + 0.35, 0, 0); g.position.y = -0.02; break; // namlu ileri-aşağı
        case 'staff': g.position.y = -0.2; break; // dik
        case 'rod': q = E(Math.PI / 2 - 0.6, 0, 0); break; // ileri-yukarı
        default: break;
      }
      attachToBone(root, hand, g, q, palm(root, hand, left ? bones.fingerL : bones.fingerR));
    }
  }
  if (L.shield && bones.foreArmL) {
    const a = boneRootPos(root, bones.foreArmL);
    const b = bones.handL ? boneRootPos(root, bones.handL) : a.clone();
    const sh = shieldModel(L);
    sh.scale.setScalar(0.82);
    attachToBone(root, bones.foreArmL, sh, E(0, Math.PI / 2, 0), a.lerp(b, 0.45).add(new THREE.Vector3(0.1, 0, 0.01)));
  }
}
