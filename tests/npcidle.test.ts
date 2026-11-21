import { it, expect } from 'vitest';
import * as THREE from 'three';
import { calmIdle } from '../packages/client/src/g3d/models.ts';

it('NPC bekleme klibi: baş/boyun sabit, gövde hareketi küçülür', () => {
  const times = [0, 1, 2, 3, 4];
  const quat = (yawDeg: number[]) => yawDeg.flatMap((d) => new THREE.Quaternion().setFromEuler(new THREE.Euler(0, (d * Math.PI) / 180, 0)).toArray());
  const head = new THREE.QuaternionKeyframeTrack('Head.quaternion', times, quat([0, 40, 0, -40, 0]));
  const arm = new THREE.QuaternionKeyframeTrack('LeftArm.quaternion', times, quat([0, 20, 0, -20, 0]));
  const hips = new THREE.VectorKeyframeTrack('Hips.position', times, [0, 1, 0, 0.1, 1, 0, 0, 1, 0, -0.1, 1, 0, 0, 1, 0]);
  const c = calmIdle(new THREE.AnimationClip('Idle', 4, [head, arm, hips]));
  const ang = (tr: THREE.KeyframeTrack, i: number) => new THREE.Quaternion().fromArray(tr.values, i * 4).angleTo(new THREE.Quaternion().fromArray(tr.values, 0)) * 180 / Math.PI;
  const [h, a, p] = c.tracks;
  for (let i = 0; i < 5; i++) expect(ang(h, i)).toBeLessThan(0.01);
  expect(ang(a, 1)).toBeGreaterThan(3); expect(ang(a, 1)).toBeLessThan(8);
  expect(Math.abs(p.values[3])).toBeLessThan(0.03);
  expect(head.values[5]).not.toBeCloseTo(h.values[5], 3); // asıl klip değişmez (kopya)
});
