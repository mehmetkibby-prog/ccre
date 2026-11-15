import * as THREE from 'three';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { model as loadModel } from './models.ts';
import { quadAnimate, QB, fixQuadWeights } from './monsters3d.ts';

/**
 * Nesne Market evcil hayvanları ve kanat (Meshy modelleri).
 *  - Köpek / maymun: dört ayak iskeleti; sahibini arka yanından takip eder, yürürken yürür, durunca oturur.
 *  - Kuş (şahin): uçarak takip eder; sahibi durunca başının üstünde süzülerek daire çizer. Kanatlar ikiye bölünüp çırpar.
 *  - Kanat: karakterin sırtında, çok hafif çırpınır.
 * Hepsi sahibinin görünüm nesnesine çocuk olarak eklenir (görünümle birlikte silinir); dünyadaki konum ayrıca izlenir.
 * Maliyet: bir iskelet ya da iki-üç düz ağ; ek ışık/parçacık yok.
 */
export const PET_MODEL = ['', 'pet_bird', 'pet_monkey', 'pet_dog'];
export interface Pet { obj: THREE.Object3D; update(dt: number, now: number, owner: THREE.Object3D, moving: boolean, ground: (x: number, z: number) => number): void }

const _v = new THREE.Vector3();

/** Kanatlı ağı gövde + sol + sağ kanat olarak böler: kanatlar gövde kenarındaki eksen çevresinde döner. */
function splitWings(scene: THREE.Object3D, bodyFrac: number, target: number): { root: THREE.Group; left: THREE.Group; right: THREE.Group; half: number } | null {
  scene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(scene);
  const size = box.getSize(new THREE.Vector3()), c = box.getCenter(new THREE.Vector3());
  const sc = target / Math.max(0.01, size.x), half = size.x * bodyFrac * 0.5 * sc;
  const root = new THREE.Group(), body = new THREE.Group(), left = new THREE.Group(), right = new THREE.Group();
  left.position.x = -half; right.position.x = half;
  root.add(body, left, right);
  let any = false;
  scene.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    // sıkıştırılmış öznitelikleri ondalığa çevir, dünya dönüşümünü uygula, ortala ve ölçekle
    const g = new THREE.BufferGeometry();
    for (const [n, at] of Object.entries(m.geometry.attributes)) {
      const a = at as THREE.BufferAttribute, k = a.itemSize, arr = new Float32Array(a.count * k);
      for (let i = 0; i < a.count; i++) for (let j = 0; j < k; j++) arr[i * k + j] = a.getComponent(i, j);
      g.setAttribute(n, new THREE.BufferAttribute(arr, k));
    }
    if (m.geometry.index) g.setIndex(Array.from(m.geometry.index.array));
    g.applyMatrix4(m.matrixWorld); g.translate(-c.x, -c.y, -c.z); g.scale(sc, sc, sc);
    const ng = g.index ? g.toNonIndexed() : g;
    const P = ng.attributes.position;
    const parts: number[][] = [[], [], []]; // gövde, sol, sağ (üçgen indeksleri)
    for (let t = 0; t < P.count / 3; t++) {
      const cx = (P.getX(t * 3) + P.getX(t * 3 + 1) + P.getX(t * 3 + 2)) / 3;
      parts[cx < -half ? 1 : cx > half ? 2 : 0].push(t);
    }
    const mat = m.material as THREE.Material;
    parts.forEach((tris, pi) => {
      if (!tris.length) return;
      const out = new THREE.BufferGeometry();
      for (const [n, at] of Object.entries(ng.attributes)) {
        const a = at as THREE.BufferAttribute, k = a.itemSize, arr = new Float32Array(tris.length * 3 * k);
        tris.forEach((t, i) => { for (let v = 0; v < 3; v++) for (let j = 0; j < k; j++) arr[(i * 3 + v) * k + j] = a.getComponent(t * 3 + v, j); });
        out.setAttribute(n, new THREE.BufferAttribute(arr, k));
      }
      if (pi === 1) out.translate(half, 0, 0); else if (pi === 2) out.translate(-half, 0, 0);
      out.computeBoundingSphere();
      const mesh = new THREE.Mesh(out, mat); mesh.castShadow = true;
      [body, left, right][pi].add(mesh); any = true;
    });
  });
  return any ? { root, left, right, half } : null;
}

/**
 * Sırttaki kanat (Kızıl Çekirdek Kanatları): karakterin göğüs/sırt kemiğine bağlıdır; karakter eğilince, dönünce,
 * saldırırken kanat da gövdeyle birlikte hareket eder. Üstüne çok hafif çırpınma eklenir.
 * Kemik ölçeği (Meshy iskeleti) yüzünden kemiğe çocuk olarak takılmaz: her karede kemiğin köke göre konumu
 * ve dönüşü okunup bağlanma pozundaki göreli konum korunur.
 */
export function createWings(height: number, charRoot?: THREE.Object3D): (THREE.Object3D & { tick?: (t: number, moving: boolean) => void }) | null {
  const L = loadModel('wings_crimson');
  if (!L) return null;
  const w = splitWings(L.scene.clone(true), 0.12, 1.9 * (height / 1.85));
  if (!w) return null;
  const holder = new THREE.Group() as THREE.Group & { tick?: (t: number, moving: boolean) => void };
  holder.name = 'wings';
  holder.add(w.root);
  w.root.rotation.y = Math.PI; // dış yüz (görselde arkadan bakılan) karakterin arkasına baksın
  holder.position.set(0, height * 0.7, -0.17);
  // sırt kemiği: Spine02 (göğüs) yoksa Spine01 / Spine
  let bone: THREE.Object3D | undefined;
  if (charRoot) for (const n of ['Spine02', 'Spine01', 'Spine']) { charRoot.traverse((o) => { if (!bone && (o as THREE.Bone).isBone && o.name === n) bone = o; }); if (bone) break; }
  const rel = (out: { p: THREE.Vector3; q: THREE.Quaternion }) => {
    charRoot!.updateMatrixWorld(); // kemik matrisi bir önceki karedeki pozdan
    const m = new THREE.Matrix4().copy(charRoot!.matrixWorld).invert().multiply(bone!.matrixWorld);
    m.decompose(out.p, out.q, new THREE.Vector3());
    return out;
  };
  let off: THREE.Vector3 | null = null, qCorr: THREE.Quaternion | null = null;
  if (bone && charRoot) {
    const r0 = rel({ p: new THREE.Vector3(), q: new THREE.Quaternion() });
    qCorr = r0.q.clone().invert();
    off = holder.position.clone().sub(r0.p).applyQuaternion(qCorr);
  }
  const cur = { p: new THREE.Vector3(), q: new THREE.Quaternion() };
  holder.tick = (t, moving) => {
    if (bone && off && qCorr) {
      rel(cur);
      holder.position.copy(off).applyQuaternion(cur.q).add(cur.p);
      holder.quaternion.copy(cur.q).multiply(qCorr);
    }
    const a = 0.16 + Math.sin(t * (moving ? 2.6 : 1.5)) * (moving ? 0.13 : 0.07);
    w.left.rotation.y = a; w.right.rotation.y = -a; // arkaya doğru hafif kapanıp açılır
    w.left.rotation.z = Math.sin(t * 1.5 + 0.5) * 0.04; w.right.rotation.z = -w.left.rotation.z;
  };
  return holder;
}

/** Sahibinin arka yanında duracağı hedef nokta (dünya, metre). */
function followTarget(owner: THREE.Object3D, back: number, side: number) {
  const yaw = owner.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
  return { x: owner.position.x - fx * back + fz * side, z: owner.position.z - fz * back - fx * side, yaw };
}

/** Dünya konumunu sahibin yerel uzayına çevirip yerleştirir (evcil hayvan sahibin çocuğu). */
function place(obj: THREE.Object3D, owner: THREE.Object3D, x: number, y: number, z: number, yaw: number) {
  owner.updateMatrixWorld();
  obj.position.copy(owner.worldToLocal(_v.set(x, y, z)));
  obj.rotation.y = yaw - owner.rotation.y;
}

function quadPet(id: string): Pet | null {
  const L = loadModel(id);
  if (!L) return null;
  fixQuadWeights(L.scene);
  const inner = skClone(L.scene) as THREE.Object3D;
  const bones: Record<string, THREE.Bone> = {};
  inner.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) { m.castShadow = true; if (!m.geometry.boundingSphere) { m.geometry.computeBoundingSphere(); m.geometry.boundingSphere!.radius *= 1.5; } m.frustumCulled = true; }
  });
  if (!bones.body) return null;
  const restBodyY = bones.body.position.y;
  const bodyG = new THREE.Group(); bodyG.add(inner);
  const root = new THREE.Group(); root.add(bodyG); root.name = 'pet';
  let x = NaN, z = 0, yaw = 0, phase = 0, idle = 0, sit = 0;
  return {
    obj: root,
    update(dt, now, owner, ownerMoving, ground) {
      const tg = followTarget(owner, 0.95, 0.6);
      if (Number.isNaN(x)) { x = tg.x; z = tg.z; yaw = tg.yaw; }
      const dx = tg.x - x, dz = tg.z - z, d = Math.hypot(dx, dz);
      let step = 0;
      if (d > 4) { x = tg.x; z = tg.z; } // ışınlanma: yanına gel
      else if (d > 0.12) {
        const sp = Math.min(7.5, 1.2 + d * 4.5); step = Math.min(d, sp * dt / 1000);
        x += (dx / d) * step; z += (dz / d) * step;
        const want = Math.atan2(dx, dz); let da = want - yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2;
        yaw += da * Math.min(1, dt / 120);
      } else { let da = tg.yaw - yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; yaw += da * Math.min(1, dt / 400); }
      const walking = step > 0.0005 || ownerMoving && d > 0.3;
      phase += step * (Math.PI * 2 / 0.5);
      idle = walking ? 0 : idle + dt;
      sit += ((idle > 700 ? 1 : 0) - sit) * Math.min(1, dt / 260);
      quadAnimate(bones, bodyG, walking ? 'walk' : 'idle', now / 1000, 0, phase);
      bones.body.position.y += restBodyY - QB[0][3];
      if (sit > 0.01) {
        // oturuş: arka kalça yere iner, ön ayaklar dik kalır, gövde öne kalkık
        bodyG.rotation.x = -0.55 * sit;
        bodyG.position.y = -0.08 * sit;
        bones.blU.rotation.x = bones.brU.rotation.x = 1.25 * sit;
        bones.blL.rotation.x = bones.brL.rotation.x = -1.9 * sit;
        bones.blP.rotation.x = bones.brP.rotation.x = 0.7 * sit;
        bones.flU.rotation.x = bones.frU.rotation.x = 0.55 * sit;
        bones.neck.rotation.x -= 0.35 * sit;
        if (bones.tail1) bones.tail1.rotation.x = 0.9 * sit + 0.2;
      }
      place(root, owner, x, ground(x, z), z, yaw);
    },
  };
}

function birdPet(): Pet | null {
  const L = loadModel('pet_bird');
  if (!L) return null;
  const w = splitWings(L.scene.clone(true), 0.22, 0.95);
  if (!w) return null;
  const root = new THREE.Group(); root.name = 'pet'; root.add(w.root);
  w.root.rotation.x = 0.25; // görsel önden-yukarıdan: hafif öne eğik uçuş duruşu
  let x = NaN, z = 0, y = 2, yaw = 0, ang = 0, idle = 0;
  return {
    obj: root,
    update(dt, now, owner, ownerMoving, ground) {
      const t = now / 1000;
      idle = ownerMoving ? 0 : idle + dt;
      let tx: number, tz: number, ty: number;
      if (idle > 900) {
        // sahibinin üstünde yavaş daire
        ang += dt / 1000 * 0.9;
        tx = owner.position.x + Math.cos(ang) * 1.1; tz = owner.position.z + Math.sin(ang) * 1.1; ty = 2.25 + Math.sin(t * 1.3) * 0.12;
      } else { const tg = followTarget(owner, 0.7, -0.75); tx = tg.x; tz = tg.z; ty = 2.0 + Math.sin(t * 2.4) * 0.1; }
      if (Number.isNaN(x)) { x = tx; z = tz; }
      const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
      if (d > 5) { x = tx; z = tz; }
      else if (d > 0.02) { const step = Math.min(d, Math.min(9, 1 + d * 5) * dt / 1000); x += (dx / d) * step; z += (dz / d) * step; const want = Math.atan2(dx, dz); let da = want - yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; yaw += da * Math.min(1, dt / 160); }
      y += (ty - y) * Math.min(1, dt / 300);
      const fast = d > 0.4;
      const flap = Math.sin(t * (fast ? 13 : 7)) * (fast ? 0.55 : 0.3);
      w.left.rotation.z = flap; w.right.rotation.z = -flap;
      w.root.rotation.z = Math.sin(t * 1.1) * 0.08;
      place(root, owner, x, ground(x, z) + y, z, yaw);
    },
  };
}

/** Evcil hayvan (1 kuş, 2 maymun, 3 köpek); model yüklenmediyse null (yüklenince görünüm yeniden kurulur). */
export function createPet(kind: number): Pet | null {
  if (kind === 1) return birdPet();
  if (kind === 2) return quadPet('pet_monkey');
  if (kind === 3) return quadPet('pet_dog');
  return null;
}
