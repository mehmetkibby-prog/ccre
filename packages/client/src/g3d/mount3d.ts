import * as THREE from 'three';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { model as loadModel } from './models.ts';
import { quadAnimate, QB, fixQuadWeights } from './monsters3d.ts';

/**
 * Binek (Savaş Atı, Meshy modeli + dört ayak iskeleti). Binicinin görünüm nesnesine çocuk olarak eklenir; binici
 * eyer yüksekliğine kaldırılır, bacakları IK ile atın iki yanına iner (renderer). At yürürken adım atar, dururken
 * nefes alır ve başını hafifçe oynatır.
 *  seatY / seatZ: eyerin binicinin yerel uzayındaki yüksekliği ve ileri-geri konumu (modelden ölçülür).
 */
export interface MountRig { obj: THREE.Object3D; seatY: number; seatZ: number; halfW: number; update(dt: number, now: number, moving: boolean, speed: number): number }

let measured: { seatY: number; seatZ: number; halfW: number } | null = null;

export function createMount(): MountRig | null {
  const L = loadModel('mount_horse');
  if (!L) return null;
  fixQuadWeights(L.scene);
  const inner = skClone(L.scene) as THREE.Object3D;
  const bones: Record<string, THREE.Bone> = {};
  inner.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) { m.castShadow = true; if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); m.frustumCulled = false; }
  });
  if (!bones.body) return null;
  // eyer: gövde ve göğüs kemiğinin ortası; yükseklik o çevredeki sırt üstü (bir kez ölçülür)
  if (!measured) {
    L.scene.updateMatrixWorld(true);
    const bw = new THREE.Vector3(), cw = new THREE.Vector3();
    let b0: THREE.Object3D | undefined, c0: THREE.Object3D | undefined;
    L.scene.traverse((o) => { if (o.name === 'body') b0 = o; if (o.name === 'chest') c0 = o; });
    b0?.getWorldPosition(bw); c0?.getWorldPosition(cw);
    // modelin sınır kutusu: baş yukarıda olduğu için sırt (eyer) toplam boyun ~%61'i; gövde genişliğinin yarısı
    const box = new THREE.Box3().setFromObject(L.scene);
    const H = box.max.y - box.min.y, W = box.max.x - box.min.x;
    const sz = b0 && c0 ? (bw.z + cw.z) / 2 : (box.min.z + box.max.z) / 2;
    measured = { seatY: box.min.y + H * 0.61, seatZ: sz, halfW: Math.max(0.22, Math.min(0.55, W * 0.32)) };
  }
  const restBodyY = bones.body.position.y;
  const bodyG = new THREE.Group(); bodyG.add(inner);
  // binici atın ortasında: eyer yerel orijine gelsin (quadAnimate gövde grubunun konumunu sıfırladığı için ayrı grup)
  const shift = new THREE.Group(); shift.add(bodyG); shift.position.z = -measured.seatZ;
  const root = new THREE.Group(); root.add(shift); root.name = 'mount';
  let phase = 0;
  return {
    obj: root, seatY: measured.seatY, seatZ: 0, halfW: measured.halfW,
    update(dt, now, moving, speed) {
      const t = now / 1000;
      // adım: hızla orantılı (at uzun adımlı); hızlıyken tırıs
      phase += Math.max(0, speed) * (dt / 1000) * (Math.PI * 2 / 2.1);
      quadAnimate(bones, bodyG, moving ? 'walk' : 'idle', t, 0, phase);
      bones.body.position.y += restBodyY - QB[0][3];
      if (!moving) { bones.neck.rotation.x += Math.sin(t * 0.6) * 0.06; if (bones.head) bones.head.rotation.y = Math.sin(t * 0.37) * 0.15; }
      // binicinin inip kalkması (eyerle birlikte)
      return moving ? Math.abs(Math.sin(phase)) * 0.06 : Math.sin(t * 1.6) * 0.008;
    },
  };
}
