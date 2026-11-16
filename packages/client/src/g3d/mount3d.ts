import * as THREE from 'three';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { model as loadModel } from './models.ts';
import { fixQuadWeights } from './monsters3d.ts';

/**
 * Binek (Savaş Atı, Meshy modeli + dört ayak iskeleti). Binicinin görünüm nesnesine çocuk olarak eklenir.
 *  seat: atın gövde kemiğine bağlı eyer noktası (+Z ileri, +Y yukarı). Binici her karede buna oturtulur; atın
 *        inip kalkması ve öne-arkaya yalpalaması binicinin kalçasına birebir geçer.
 *  halfW: eyer hizasında gövdenin yarı genişliği (üzengi ve diz için).
 *  gallop: 0 = adım, 1 = dörtnala (binicinin öne eğilmesi bununla).  move: 0 = duruyor, 1 = hareket.
 *
 * Yürüyüş: dört vuruşlu adım (sol arka, sol ön, sağ arka, sağ ön). Hızlanınca enine dörtnala: sağ arka, sol arka,
 * sağ ön, sol ön yere basar, ardından dört ayağın da havada olduğu "uçuş" anı gelir. Gövde arka ayaklar iterken
 * önden kalkar, ön ayaklar basarken burun iner; boyun bu salınıma karşı sallanır, kuyruk geriye savrulur.
 * Basış süresince toynak yerde geriye kayar; süpürme hızı yer hızına eşit olsun diye adım sıklığı hızdan bulunur.
 */
export interface MountRig { obj: THREE.Object3D; seat: THREE.Object3D; halfW: number; gallop: number; move: number; cycle: number; update(dt: number, now: number, speed: number): void; /** toynak yere bastığında (nal sesi) */ onHoof?: () => void }

let measured: { seatY: number; seatZ: number; seatX: number; halfW: number; leg: number } | null = null;

const frac = (x: number) => x - Math.floor(x);
const ss = (x: number) => x * x * (3 - 2 * x);
const TAU = Math.PI * 2;

/** Bir bacağın açıları: u = bacağın kendi döngü evresi (0..1), st = basış oranı. */
function legPose(u: number, st: number, fwd: number, back: number, flexL: number, flexP: number) {
  if (u < st) {
    const s = u / st; // toynak yerde: önden arkaya süpürür; ortada bilek (fetlock) esner
    return { up: -fwd + (fwd + back) * s, lo: 0.06 * Math.sin(Math.PI * s), pa: -0.25 * Math.sin(Math.PI * s) };
  }
  const s = (u - st) / (1 - st); // havada: bacak katlanır, öne savrulur, inmeden önce uzanır
  const f = Math.sin(Math.PI * Math.min(1, s * 1.25));
  return { up: back - (fwd + back) * ss(s), lo: flexL * f, pa: flexP * f };
}

/**
 * Kuyruk ağırlıklarını düzeltir (bir kez, paylaşılan geometride): Meshy atının sarkan kuyruğu otomatik iskelette
 * arka bacak kemiklerine bağlanmıştı (kuyruk bacaklarla oynayıp ata yapışık görünüyordu), kuyruk kemiği ise
 * sağrıyı oynatıyordu. Kuyruk kökünün arkasında ve altındaki ince sütun kuyruk kemiklerine (yukarısı tail1,
 * aşağısı tail2, arası yumuşak geçiş), kökün üstündeki sağrı ise gövdeye bağlanır.
 */
const _retailed = new WeakSet<THREE.Object3D>();
function retailHorse(scene: THREE.Object3D) {
  if (_retailed.has(scene)) return; _retailed.add(scene);
  scene.updateMatrixWorld(true);
  let t1: THREE.Bone | undefined, t2: THREE.Bone | undefined, body: THREE.Bone | undefined;
  scene.traverse((o) => { if (o.name === 'tail1') t1 = o as THREE.Bone; if (o.name === 'tail2') t2 = o as THREE.Bone; if (o.name === 'body') body = o as THREE.Bone; });
  if (!t1 || !t2 || !body) return;
  const p1 = t1.getWorldPosition(new THREE.Vector3()), p2 = t2.getWorldPosition(new THREE.Vector3());
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const bones = m.skeleton.bones, i1 = bones.indexOf(t1!), i2 = bones.indexOf(t2!), ib = bones.indexOf(body!);
    if (i1 < 0 || i2 < 0 || ib < 0) return;
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld);
      const dx = Math.abs(v.x - p1.x);
      if (v.z < p1.z - 0.02 && dx < 0.2 && v.y < p1.y + 0.15) {
        // aşağı inildikçe tail2'ye geçiş
        const k = THREE.MathUtils.clamp((p1.y - 0.05 - v.y) / Math.max(0.05, (p1.y - p2.y) * 1.4), 0, 1);
        si.setXYZW(i, i1, i2, 0, 0); sw.setXYZW(i, 1 - k, k, 0, 0);
      } else if (v.y >= p1.y + 0.15) {
        // sağrı: kuyruk kemiğine bağlı kalmasın
        let tw = 0; for (let c = 0; c < 4; c++) { const j = si.getComponent(i, c); if (j === i1 || j === i2) tw += sw.getComponent(i, c); }
        if (tw > 0.01) { si.setXYZW(i, ib, 0, 0, 0); sw.setXYZW(i, 1, 0, 0, 0); }
      }
    }
    si.needsUpdate = true; sw.needsUpdate = true;
  });
}

export function createMount(): MountRig | null {
  const L = loadModel('mount_horse');
  if (!L) return null;
  fixQuadWeights(L.scene);
  retailHorse(L.scene);
  const inner = skClone(L.scene) as THREE.Object3D;
  const bones: Record<string, THREE.Bone> = {};
  inner.traverse((o) => {
    if ((o as THREE.Bone).isBone) bones[o.name] = o as THREE.Bone;
    const m = o as THREE.SkinnedMesh;
    if (m.isSkinnedMesh) { m.castShadow = true; if (!m.geometry.boundingSphere) m.geometry.computeBoundingSphere(); m.frustumCulled = false; }
  });
  for (const n of ['body', 'chest', 'neck', 'flU', 'flL', 'flP', 'frU', 'frL', 'frP', 'blU', 'blL', 'blP', 'brU', 'brL', 'brP']) if (!bones[n]) return null;
  if (!measured) {
    L.scene.updateMatrixWorld(true);
    const bw = new THREE.Vector3(), cw = new THREE.Vector3(), fw = new THREE.Vector3(), pw = new THREE.Vector3();
    let b0: THREE.Object3D | undefined, c0: THREE.Object3D | undefined, u0: THREE.Object3D | undefined, p0: THREE.Object3D | undefined;
    L.scene.traverse((o) => { if (o.name === 'body') b0 = o; if (o.name === 'chest') c0 = o; if (o.name === 'flU') u0 = o; if (o.name === 'flP') p0 = o; });
    b0!.getWorldPosition(bw); c0!.getWorldPosition(cw); u0!.getWorldPosition(fw); p0!.getWorldPosition(pw);
    // sırt (eyer) yüksekliği: eyer z'sindeki dilimin en üst köşeleri; genişlik aynı dilimden
    const sz = (bw.z * 0.45 + cw.z * 0.55);
    let top = -1e9, minX = 1e9, maxX = -1e9;
    const v = new THREE.Vector3();
    L.scene.traverse((o) => {
      const m = o as THREE.SkinnedMesh;
      if (!m.isSkinnedMesh) return;
      const pos = m.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(m.matrixWorld);
        if (Math.abs(v.z - sz) > 0.12) continue;
        if (v.y > bw.y - 0.05 && Math.abs(v.x - bw.x) < 0.12) top = Math.max(top, v.y);
        if (Math.abs(v.y - (bw.y - 0.05)) < 0.12) { minX = Math.min(minX, v.x); maxX = Math.max(maxX, v.x); }
      }
    });
    const box = new THREE.Box3().setFromObject(L.scene);
    if (top < -1e8) top = box.min.y + (box.max.y - box.min.y) * 0.61;
    const halfW = maxX > minX ? (maxX - minX) / 2 : (box.max.x - box.min.x) * 0.3;
    measured = { seatY: top, seatZ: sz, seatX: bw.x, halfW: Math.max(0.18, Math.min(0.5, halfW)), leg: Math.max(0.3, fw.y - pw.y) };
  }
  const M = measured;
  // binici atın ortasında: eyer yerel orijine gelsin
  const shift = new THREE.Group(); shift.add(inner); shift.position.set(-M.seatX, 0, -M.seatZ);
  const root = new THREE.Group(); root.add(shift); root.name = 'mount';
  root.updateMatrixWorld(true);
  // eyer noktası gövde kemiğine bağlı (bağlanma pozunda yerleştirilir; sonra kemikle birlikte hareket eder)
  const seat = new THREE.Object3D();
  seat.position.copy(bones.body.worldToLocal(new THREE.Vector3(0, M.seatY, 0)));
  bones.body.getWorldQuaternion(seat.quaternion).invert();
  bones.body.add(seat);
  const rest: Record<string, THREE.Vector3> = {};
  for (const [n, b] of Object.entries(bones)) rest[n] = b.position.clone();
  let cycle = 0, move = 0, gallop = 0, prevCycle = 0;
  const rig: MountRig = {
    obj: root, seat, halfW: M.halfW, gallop: 0, move: 0, cycle: 0,
    update(dt, now, speed) {
      const t = now / 1000, k = Math.min(1, dt / 1000);
      // hareket ve dörtnala karışımları yumuşak (ani duruşta bacaklar bir anda donmasın)
      move += ((speed > 0.4 ? 1 : 0) - move) * Math.min(1, k * 6);
      gallop += ((speed > 3.2 ? 1 : speed > 1.8 ? (speed - 1.8) / 1.4 : 0) - gallop) * Math.min(1, k * 3);
      // adım sıklığı: basışta toynağın geriye süpürme hızı ≈ yer hızı
      const sweepW = M.leg * 2.2 * 0.85, sweepG = M.leg * 2.2 * 1.3;
      const fW = Math.max(0.6, speed) / (sweepW / 0.62), fG = Math.min(2.6, Math.max(1.5, speed / (sweepG / 0.36)));
      cycle = frac(cycle + (fW + (fG - fW) * gallop) * k * (move > 0.02 ? 1 : 0));
      const g = gallop, w = 1 - g, a = move;
      for (const b of Object.values(bones)) b.rotation.set(0, 0, 0);
      for (const [n, b] of Object.entries(bones)) b.position.copy(rest[n]);
      // bacaklar: [kemik öneki, adım evresi, dörtnala evresi, ön mü]
      const legs: [string, number, number, boolean][] = [['bl', 0.0, 0.12, false], ['fl', 0.25, 0.54, true], ['br', 0.5, 0.0, false], ['fr', 0.75, 0.42, true]];
      // nal sesi: baskın yürüyüşte her bacağın basış anı (evre 0'dan geçiş)
      if (a > 0.5 && rig.onHoof) for (const [, ow, og] of legs) { const o = g > 0.5 ? og : ow; const u0 = frac(prevCycle - o), u1 = frac(cycle - o); if (u1 < u0 && u0 - u1 > 0.5) rig.onHoof(); }
      prevCycle = cycle;
      for (const [p, ow, og, front] of legs) {
        const W = legPose(frac(cycle - ow), 0.62, front ? 0.32 : 0.28, front ? 0.3 : 0.32, front ? 0.9 : -0.7, front ? 0.5 : 0.35);
        const G = legPose(frac(cycle - og), 0.36, front ? 0.8 : 0.62, front ? 0.55 : 0.62, front ? 1.6 : -1.15, front ? 0.9 : 0.6);
        bones[p + 'U'].rotation.x = (W.up * w + G.up * g) * a;
        bones[p + 'L'].rotation.x = (W.lo * w + G.lo * g) * a;
        bones[p + 'P'].rotation.x = (W.pa * w + G.pa * g) * a;
      }
      // gövde: dörtnalada arka itişte burun kalkar, ön basışta iner; uçuşta en yüksek
      const pitchG = -0.085 * Math.cos(TAU * (cycle - 0.15)), liftG = 0.07 * Math.cos(TAU * (cycle - 0.95)) + 0.02;
      const pitchW = 0.012 * Math.sin(TAU * cycle * 2), liftW = 0.018 * Math.cos(TAU * cycle * 2);
      const breathe = Math.sin(t * 1.6) * 0.006 * (1 - a);
      bones.body.rotation.x = (pitchW * w + pitchG * g) * a;
      bones.body.position.y += (liftW * w + liftG * g) * a + breathe;
      bones.body.rotation.z = Math.sin(TAU * cycle) * 0.025 * w * a; // adımda hafif yan salınım
      // boyun/baş: dörtnalada gövdeye karşı pompalar, adımda başı ileri-geri sallar
      bones.neck.rotation.x = -0.05 + (0.06 * Math.sin(TAU * cycle * 2) * w + (0.16 * Math.sin(TAU * (cycle - 0.55)) + 0.1) * g) * a;
      if (bones.head) bones.head.rotation.x = -bones.neck.rotation.x * 0.55 - bones.body.rotation.x * 0.5;
      if (a < 0.5) { bones.neck.rotation.x += Math.sin(t * 0.6) * 0.06 * (1 - a * 2); if (bones.head) bones.head.rotation.y = Math.sin(t * 0.37) * 0.15 * (1 - a * 2); }
      bones.chest.rotation.x = -bones.body.rotation.x * 0.3;
      // sarkan kuyruk: dururken hafif yana savrulur (sinek kovar gibi), yürürken sallanır, dörtnalada geriye uçuşur
      if (bones.tail1) {
        bones.tail1.rotation.x = 0.12 + (0.25 * w + 0.85 * g) * a + Math.sin(TAU * cycle + 1) * 0.08 * a;
        bones.tail1.rotation.z = Math.sin(t * (a > 0.5 ? 5 : 1.7)) * (0.07 + 0.1 * (1 - a)) + Math.max(0, Math.sin(t * 0.9)) ** 8 * 0.25 * (1 - a);
      }
      if (bones.tail2) { bones.tail2.rotation.x = (0.1 * w + 0.35 * g) * a + Math.sin(TAU * cycle + 0.4) * 0.12 * a; bones.tail2.rotation.z = Math.sin(t * (a > 0.5 ? 5 : 1.7) - 0.8) * 0.12; }
      rig.gallop = g; rig.move = a; rig.cycle = cycle;
    },
  };
  return rig;
}
