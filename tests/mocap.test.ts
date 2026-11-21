import { it, expect, beforeAll } from 'vitest';
import * as THREE from 'three';
import fs from 'node:fs';
import path from 'node:path';
const { MOCAP_TRIED: MOCAP_ATTACK, MOCAP_BONES, mocapClip, setMocapData } = await import('../packages/client/src/g3d/mocap.ts');
const { rigOf } = await import('../packages/client/src/g3d/charAnims.ts');

const DATA = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../packages/client/public/anims/mocap.json'), 'utf8'));
const ATTACK_S = 0.62;

/** Meshy iskeleti gibi: Armature (0,01 ölçek, cm) altında A duruşu (kollar ~65° aşağı); +X sol, +Y yukarı, +Z ileri. */
function meshyRig() {
  const root = new THREE.Object3D(), inner = new THREE.Object3D(), arm = new THREE.Object3D();
  arm.name = 'Armature'; arm.scale.setScalar(0.01); root.add(inner); inner.add(arm);
  const bones = new Map<string, THREE.Bone>();
  const add = (name: string, parent: THREE.Object3D, x: number, y: number, z: number) => { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); parent.add(b); bones.set(name, b); return b; };
  const hips = add('Hips', arm, 0, 95, 0);
  const s2 = add('Spine02', hips, 0, 10, 0), s1 = add('Spine01', s2, 0, 12, 0), sp = add('Spine', s1, 0, 14, 0);
  const neck = add('neck', sp, 0, 14, 0); add('Head', neck, 0, 10, 0);
  for (const [side, sx] of [['Left', 1], ['Right', -1]] as const) {
    const sh = add(side + 'Shoulder', sp, sx * 4, 10, 0);
    const a = 65 * Math.PI / 180, dx = Math.cos(a), dy = -Math.sin(a);
    const ua = add(side + 'Arm', sh, sx * 14, 0, 0);
    const fa = add(side + 'ForeArm', ua, sx * 28 * dx, 28 * dy, 0);
    add(side + 'Hand', fa, sx * 25 * dx, 25 * dy, 0);
    const ul = add(side + 'UpLeg', hips, sx * 10, -6, 0);
    const ll = add(side + 'Leg', ul, 0, -42, 0);
    const ft = add(side + 'Foot', ll, 0, -40, 0);
    add(side + 'ToeBase', ft, 0, -6, 12);
  }
  root.updateMatrixWorld(true);
  return { root, inner, bones };
}

beforeAll(() => setMocapData(DATA));

it('Mocap verisi: kombodaki her klip var, zaman pencereleri klibin içinde ve sıralı', () => {
  for (const [cls, spec] of Object.entries(MOCAP_ATTACK)) {
    expect(spec.combo.length, cls).toBeGreaterThan(0);
    for (const [key, a, h, b] of spec.combo) {
      const c = DATA.clips[key];
      expect(c, `${cls} ${key}`).toBeTruthy();
      expect(0 <= a && a < h && h < b && b <= (c.n - 1) / c.fps + 1e-6, `${cls} ${key} ${a}/${h}/${b}`).toBe(true);
      for (const n of MOCAP_BONES) expect(c.q[n]?.length, `${key} ${n}`).toBe(c.n * 4);
      expect(c.hips.length).toBe(c.n * 3);
    }
  }
});

it('Mocap aktarımı: A duruşlu iskelete 0,62 sn klip; dönüşler geçerli, vuruş anında el gövdenin önünde', () => {
  for (const [cls, spec] of Object.entries(MOCAP_ATTACK)) {
    const { root, inner, bones } = meshyRig();
    const rig = rigOf(inner, root);
    spec.combo.forEach(([key, a, h, b], i) => {
      const clip = mocapClip(`${cls} ${i}`, rig, key, [[a, 0], [h, spec.hit], [b, ATTACK_S]], { weapon: spec.weapon, hipK: spec.hipK, damp: spec.damp })!;
      expect(clip).toBeTruthy();
      expect(clip.duration).toBeCloseTo(ATTACK_S, 3);
      expect(clip.tracks.length).toBe(MOCAP_BONES.length + 1); // + kalça konumu
      for (const tr of clip.tracks) {
        expect(Array.from(tr.values).every(Number.isFinite), tr.name).toBe(true);
        if (tr.name.endsWith('.quaternion')) for (let k = 0; k < tr.values.length; k += 4) expect(Math.hypot(tr.values[k], tr.values[k + 1], tr.values[k + 2], tr.values[k + 3])).toBeCloseTo(1, 3);
      }
      // vuruş anında: sağ el karakterin önünde (yön ters aktarılsaydı arkada kalırdı), kalça yerden kopmamış
      const mixer = new THREE.AnimationMixer(inner);
      mixer.clipAction(clip).play(); mixer.setTime(spec.hit);
      root.updateMatrixWorld(true);
      const hand = root.worldToLocal(bones.get('RightHand')!.getWorldPosition(new THREE.Vector3()));
      const hips = root.worldToLocal(bones.get('Hips')!.getWorldPosition(new THREE.Vector3()));
      expect(hand.z, `${cls} ${key} el ileri`).toBeGreaterThan(hips.z + 0.15);
      expect(hips.y, `${cls} kalça`).toBeGreaterThan(0.6);
      expect(hips.y).toBeLessThan(1.1);
      mixer.stopAllAction(); mixer.uncacheRoot(inner);
      for (const bn of bones.values()) { bn.quaternion.identity(); }
    });
  }
});

it('Meshy kütüphane vuruşları: native.json her kombo klibini içerir; klip 0,62 sn, dönüşler birim, kalça yerinde', async () => {
  const { NATIVE_ATTACK, nativeClip, setNativeData } = await import('../packages/client/src/g3d/mocap.ts');
  const ND = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../packages/client/public/anims/native.json'), 'utf8'));
  setNativeData(ND);
  expect(Object.keys(NATIVE_ATTACK).sort()).toEqual(['arcanist', 'guardian']);
  for (const [cls, spec] of Object.entries(NATIVE_ATTACK)) {
    const { root, inner } = meshyRig();
    const rig = rigOf(inner, root);
    for (const [key, a, h, b] of spec.combo) {
      const c = ND.clips[key];
      expect(c, `${cls} ${key}`).toBeTruthy();
      expect(0 <= a && a < h && h < b && b <= (c.n - 1) / c.fps + 1e-6, `${cls} ${key} ${a}/${h}/${b}`).toBe(true);
      const clip = nativeClip(cls, rig, key, [[a, 0], [h, spec.hit], [b, ATTACK_S]])!;
      expect(clip.duration).toBeCloseTo(ATTACK_S, 3);
      expect(clip.tracks.length).toBeGreaterThan(15);
      for (const tr of clip.tracks) {
        expect(Array.from(tr.values).every(Number.isFinite), tr.name).toBe(true);
        if (tr.name.endsWith('.quaternion')) for (let k = 0; k < tr.values.length; k += 4) expect(Math.hypot(tr.values[k], tr.values[k + 1], tr.values[k + 2], tr.values[k + 3])).toBeCloseTo(1, 2);
        if (tr.name.endsWith('.position')) for (let k = 0; k < tr.values.length; k += 3) { expect(tr.values[k]).toBeCloseTo(rig.hipsPos.x, 5); expect(tr.values[k + 2]).toBeCloseTo(rig.hipsPos.z, 5); }
      }
    }
  }
});
