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

export interface PetOpts { height?: number; charRoot?: THREE.Object3D; onBark?: (x: number, z: number) => void }

function quadPet(id: string, o: PetOpts = {}): Pet | null {
  const L = loadModel(id);
  if (!L) return null;
  fixQuadWeights(L.scene);
  const inner = skClone(L.scene) as THREE.Object3D;
  const bones: Record<string, THREE.Bone> = {};
  inner.traverse((o2) => {
    if ((o2 as THREE.Bone).isBone) bones[o2.name] = o2 as THREE.Bone;
    const m = o2 as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) { m.castShadow = true; if (!m.geometry.boundingSphere) { m.geometry.computeBoundingSphere(); m.geometry.boundingSphere!.radius *= 1.5; } m.frustumCulled = true; }
  });
  if (!bones.body) return null;
  const restBodyY = bones.body.position.y;
  const bodyG = new THREE.Group(); bodyG.add(inner);
  const root = new THREE.Group(); root.add(bodyG); root.name = 'pet';
  const sitPose = (k: number) => {
    // oturuş: arka kalça yere iner, ön ayaklar dik kalır, gövde öne kalkık
    bodyG.rotation.x = -0.55 * k;
    bodyG.position.y = -0.08 * k;
    bones.blU.rotation.x = bones.brU.rotation.x = 1.25 * k;
    bones.blL.rotation.x = bones.brL.rotation.x = -1.9 * k;
    bones.blP.rotation.x = bones.brP.rotation.x = 0.7 * k;
    bones.flU.rotation.x = bones.frU.rotation.x = 0.55 * k;
    bones.neck.rotation.x -= 0.35 * k;
    if (bones.tail1) bones.tail1.rotation.x = 0.9 * k + 0.2;
  };
  // Maymun: sahibinin omzunda oturur (dört ayak iskeleti maymunun yürüyüşüne uymuyordu). Omuz kemiğini izler.
  if (id === 'pet_monkey') {
    let shoulder: THREE.Object3D | undefined;
    o.charRoot?.traverse((q) => { if (!shoulder && (q as THREE.Bone).isBone && /^(RightShoulder|RightArm)$/.test(q.name)) shoulder = q; });
    root.scale.setScalar(0.68);
    const sp = new THREE.Vector3();
    return {
      obj: root,
      update(_dt, now, owner) {
        const t = now / 1000;
        quadAnimate(bones, bodyG, 'idle', t, 0, 0);
        bones.body.position.y += restBodyY - QB[0][3];
        sitPose(1);
        bones.neck.rotation.y = Math.sin(t * 0.7) * 0.5; // etrafa bakınır
        if (bones.tail1) bones.tail1.rotation.z = Math.sin(t * 2.2) * 0.35;
        const yaw = owner.rotation.y, fx = Math.sin(yaw), fz = Math.cos(yaw);
        if (shoulder) { shoulder.getWorldPosition(sp); sp.y += 0.17; sp.x -= fz * 0.05; sp.z += fx * 0.05; }
        else sp.set(owner.position.x - fz * 0.22, owner.position.y + (o.height ?? 1.8) * 0.8, owner.position.z + fx * 0.22);
        sp.x -= fx * 0.04; sp.z -= fz * 0.04;
        place(root, owner, sp.x, sp.y + Math.abs(Math.sin(t * 1.6)) * 0.015, sp.z, yaw);
      },
    };
  }
  // Köpek: sahibi yürürken yumuşakça takip eder (hızı sahibinin hızına uyar, takılmaz); sahibi durunca etrafında
  // dolaşır, arada oturur, arada bir havlar.
  let x = NaN, z = 0, vx = 0, vz = 0, yaw = 0, phase = 0, still = 0, sit = 0, walking = false;
  let mode: 'follow' | 'roam' = 'follow', roamX = 0, roamZ = 0, roamUntil = 0, pauseUntil = 0, ownerIdle = 0, barkAt = 0, barkT = -10;
  let lox = NaN, loz = 0, ownerSpd = 0;
  return {
    obj: root,
    update(dt, now, owner, ownerMoving, ground) {
      const s = Math.min(0.1, dt / 1000), t = now / 1000;
      // sahibin gerçek hızı (m/sn)
      if (!Number.isNaN(lox) && s > 0) ownerSpd += (Math.hypot(owner.position.x - lox, owner.position.z - loz) / s - ownerSpd) * Math.min(1, dt / 200);
      lox = owner.position.x; loz = owner.position.z;
      ownerIdle = ownerMoving ? 0 : ownerIdle + dt;
      if (!barkAt) barkAt = now + 9000 + Math.random() * 12000;
      const ox = owner.position.x, oz = owner.position.z;
      let tx: number, tz: number, maxSp: number;
      const distOwner = Number.isNaN(x) ? 0 : Math.hypot(ox - x, oz - z);
      if (ownerMoving || ownerIdle < 1500 || distOwner > 3.4) {
        mode = 'follow';
        const tg = followTarget(owner, 1.0, 0.6); tx = tg.x; tz = tg.z;
        maxSp = Math.min(11, Math.max(2.2, ownerSpd * 1.25 + 0.6));
      } else {
        // dolaşma: sahibin çevresinde rastgele noktaya yürü, biraz bekle (bazen otur), yine yürü
        if (mode !== 'roam' || (now > pauseUntil && now > roamUntil)) {
          mode = 'roam';
          const a = Math.random() * Math.PI * 2, r = 1.3 + Math.random() * 1.2;
          roamX = ox + Math.cos(a) * r; roamZ = oz + Math.sin(a) * r; roamUntil = now + 4000;
          pauseUntil = 0;
        }
        tx = roamX; tz = roamZ; maxSp = 1.5;
      }
      if (Number.isNaN(x)) { x = tx; z = tz; yaw = owner.rotation.y; }
      const dx = tx - x, dz = tz - z, d = Math.hypot(dx, dz);
      if (d > 7) { x = tx; z = tz; vx = vz = 0; }
      // istenen hız: uzaklıkla artar, yaklaşınca yavaşlar; hız yumuşakça değişir (sıçrama/takılma yok)
      let wsp = Math.min(maxSp, d * 3.2); if (d < 0.15) wsp = 0;
      if (mode === 'roam' && d < 0.2 && !pauseUntil) { pauseUntil = now + 1500 + Math.random() * 3500; roamUntil = 0; }
      if (mode === 'roam' && pauseUntil && now < pauseUntil) wsp = 0;
      const wvx = d > 1e-4 ? dx / d * wsp : 0, wvz = d > 1e-4 ? dz / d * wsp : 0;
      const k = Math.min(1, dt / 140);
      vx += (wvx - vx) * k; vz += (wvz - vz) * k;
      x += vx * s; z += vz * s;
      const sp = Math.hypot(vx, vz);
      walking = walking ? sp > 0.12 : sp > 0.3;
      if (walking) { const want = Math.atan2(vx, vz); let da = want - yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; yaw += da * Math.min(1, dt / 110); }
      else if (mode === 'roam') { const want = Math.atan2(ox - x, oz - z); let da = want - yaw; while (da > Math.PI) da -= Math.PI * 2; while (da < -Math.PI) da += Math.PI * 2; yaw += da * Math.min(1, dt / 500); }
      phase += sp * s * (Math.PI * 2 / 0.62);
      still = walking ? 0 : still + dt;
      const wantSit = !walking && (mode === 'follow' ? still > 900 : still > 2500 && (Math.floor(roamX * 7) & 1) === 0);
      sit += ((wantSit ? 1 : 0) - sit) * Math.min(1, dt / 260);
      quadAnimate(bones, bodyG, walking ? 'walk' : 'idle', t, 0, phase);
      bones.body.position.y += restBodyY - QB[0][3];
      if (sit > 0.01) sitPose(sit);
      // havlama: dururken ara sıra (başını iki kez kaldırır); sesi sahibinin oyunu çalar
      if (!walking && now > barkAt) { barkAt = now + 14000 + Math.random() * 20000; barkT = t; o.onBark?.(x, z); }
      const bt = t - barkT;
      if (bt >= 0 && bt < 0.55) { const b = Math.max(0, Math.sin(bt / 0.55 * Math.PI * 2)); bones.neck.rotation.x -= b * 0.35; if (bones.head) bones.head.rotation.x -= b * 0.25; if (bones.jaw) bones.jaw.rotation.x += b * 0.45; }
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
export function createPet(kind: number, o: PetOpts = {}): Pet | null {
  if (kind === 1) return birdPet();
  if (kind === 2) return quadPet('pet_monkey', o);
  if (kind === 3) return quadPet('pet_dog', o);
  return null;
}
