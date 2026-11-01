import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { clone as skClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { cyl, lathe, at, clean, colorize } from './geom.ts';
import { objTexture } from './textures.ts';
import { sculptedTemplate } from './heroes.ts';

/**
 * İskeletli, gerçekçi oranlı insan modeli (≈1.8 m). Parçalar kemiklere sabit bağlanır,
 * tek SkinnedMesh + 2 malzeme (kumaş/deri ve metal) → karakter başına az çizim çağrısı.
 */
export interface HLook {
  id: string;
  skin: number; hair: number; hairStyle: 'short' | 'long' | 'bun' | 'bald' | 'tail';
  beard?: number; female?: boolean;
  shirt: number; pants: number; boots: number; belt: number;
  armor?: 'plate' | 'leather' | 'robe' | 'apron' | 'dress' | 'vest';
  armorCol?: number; trim?: number;
  helmet?: 'knight' | 'hood' | 'circlet' | 'cap' | 'bandana' | 'wizard';
  helmCol?: number;
  cape?: number;
  weapon?: 'sword' | 'bow' | 'staff' | 'hammer' | 'rod' | 'book' | 'none';
  shield?: boolean; quiver?: boolean;
  orb?: number;
  bulk?: number; // kilo/omuz genişliği
  height?: number;
}

export const LOOKS: Record<string, HLook> = {
  guardian: { id: 'guardian', skin: 0xe0b08c, hair: 0x4a2e1a, hairStyle: 'short', beard: 0x4a2e1a, shirt: 0x5a3a30, pants: 0x3a3a44, boots: 0x3a2a1e, belt: 0x4a3020, armor: 'plate', armorCol: 0xa8b0bc, trim: 0xc89a40, helmet: 'knight', helmCol: 0xa8b0bc, cape: 0x8a1e22, weapon: 'sword', shield: true, bulk: 1.12 },
  hunter: { id: 'hunter', skin: 0xe8c0a0, hair: 0x8a4a20, hairStyle: 'tail', female: true, shirt: 0x5a6a38, pants: 0x4a3a28, boots: 0x3a2818, belt: 0x5a3a20, armor: 'leather', armorCol: 0x6a4a2c, trim: 0x8a8a5a, helmet: 'hood', helmCol: 0x3a5a2e, cape: 0x3a5a2e, weapon: 'bow', quiver: true, bulk: 0.95 },
  arcanist: { id: 'arcanist', skin: 0xf0c8a8, hair: 0xd8d0e8, hairStyle: 'long', shirt: 0x3a2a6a, pants: 0x2a2040, boots: 0x2a1e30, belt: 0xb08a3a, armor: 'robe', armorCol: 0x4a2e8a, trim: 0xd0a848, helmet: 'circlet', helmCol: 0xd0a848, weapon: 'staff', orb: 0x7cf3ff, bulk: 0.95 },
  smith: { id: 'smith', skin: 0xd0956a, hair: 0x2a1a10, hairStyle: 'bald', beard: 0x3a2214, shirt: 0x8a5a3a, pants: 0x3a3230, boots: 0x2a1e16, belt: 0x3a2a1e, armor: 'apron', armorCol: 0x5a3e2a, weapon: 'hammer', bulk: 1.25 },
  keeper: { id: 'keeper', skin: 0xe0b090, hair: 0x9a9aa0, hairStyle: 'short', beard: 0xb0b0b8, shirt: 0x3a5a7a, pants: 0x3a3a40, boots: 0x2a2018, belt: 0x6a4a2a, armor: 'vest', armorCol: 0x2a3a50, helmet: 'cap', helmCol: 0x2a4050, weapon: 'book' },
  crafter: { id: 'crafter', skin: 0xf0c8a8, hair: 0x8a2a1a, hairStyle: 'bun', female: true, shirt: 0xe8dcc0, pants: 0x6a3a4a, boots: 0x3a2a20, belt: 0x6a4a2a, armor: 'dress', armorCol: 0x8a3a5a, weapon: 'none' },
  mage: { id: 'mage', skin: 0xe8c0a0, hair: 0x1a1a2a, hairStyle: 'long', female: true, shirt: 0x203a6a, pants: 0x1a2040, boots: 0x1a1a2a, belt: 0xc0a040, armor: 'robe', armorCol: 0x1e3a7a, trim: 0x7cf3ff, helmet: 'hood', helmCol: 0x1a2a5a, weapon: 'staff', orb: 0xffd060 },
  warden: { id: 'warden', skin: 0xc89070, hair: 0x1a1a1a, hairStyle: 'short', beard: 0x1a1a1a, shirt: 0x3a2a2a, pants: 0x2a2a30, boots: 0x1e1a18, belt: 0x2a1e18, armor: 'plate', armorCol: 0x5a6070, trim: 0x9a3030, helmet: 'knight', helmCol: 0x5a6070, cape: 0x3a1e4a, weapon: 'sword', shield: true, bulk: 1.15 },
  stable: { id: 'stable', skin: 0xd8a880, hair: 0x6a3a1a, hairStyle: 'short', shirt: 0x8a6a4a, pants: 0x4a4a32, boots: 0x3a2818, belt: 0x5a3a20, armor: 'vest', armorCol: 0x5a4028, helmet: 'bandana', helmCol: 0xb08030, weapon: 'none' },
  merchant: { id: 'merchant', skin: 0xd8a888, hair: 0x3a2418, hairStyle: 'short', beard: 0x3a2418, shirt: 0xb08030, pants: 0x4a3020, boots: 0x2a1e14, belt: 0x6a2a6a, armor: 'vest', armorCol: 0x7a2a3a, helmet: 'cap', helmCol: 0x7a2a3a, weapon: 'none', bulk: 1.3 },
  fisher: { id: 'fisher', skin: 0xc89870, hair: 0xc0c0c0, hairStyle: 'short', beard: 0xd0d0d0, shirt: 0x4a6a8a, pants: 0x3a4030, boots: 0x2a2620, belt: 0x4a3a2a, armor: 'vest', armorCol: 0x6a5a3a, helmet: 'cap', helmCol: 0x3a5a4a, weapon: 'rod' },
};

export interface Rig {
  root: THREE.Object3D; // dünya konumu/yönü
  body: THREE.Object3D; // ölüm vb. için ikinci dönüş katmanı
  bones: Record<string, THREE.Bone>;
  mesh: THREE.SkinnedMesh;
  weapon?: THREE.Object3D;
  orb?: THREE.Object3D;
  look: HLook;
}

export const BONES: BoneDef[] = [
  ['hips', null, 0, 0.98, 0], ['spine', 'hips', 0, 0.12, 0], ['chest', 'spine', 0, 0.18, 0], ['neck', 'chest', 0, 0.22, 0], ['head', 'neck', 0, 0.08, 0],
  ['upperArmL', 'chest', 0.19, 0.16, 0], ['foreArmL', 'upperArmL', 0.02, -0.29, 0], ['handL', 'foreArmL', 0.01, -0.25, 0],
  ['upperArmR', 'chest', -0.19, 0.16, 0], ['foreArmR', 'upperArmR', -0.02, -0.29, 0], ['handR', 'foreArmR', -0.01, -0.25, 0],
  ['thighL', 'hips', 0.1, -0.04, 0], ['shinL', 'thighL', 0, -0.43, 0], ['footL', 'shinL', 0, -0.44, 0],
  ['thighR', 'hips', -0.1, -0.04, 0], ['shinR', 'thighR', 0, -0.43, 0], ['footR', 'shinR', 0, -0.44, 0],
];
const BONE_INDEX = Object.fromEntries(BONES.map((b, i) => [b[0], i]));
// bağ pozundaki dünya konumları
const WORLD: Record<string, THREE.Vector3> = {};
for (const [n, p, x, y, z] of BONES) WORLD[n] = new THREE.Vector3(x, y, z).add(p ? WORLD[p] : new THREE.Vector3());

export interface Piece { g: THREE.BufferGeometry; bone: string; metal?: boolean; glow?: boolean; color: number | ((p: THREE.Vector3, n: THREE.Vector3) => THREE.Color) }

export function seg(a: THREE.Vector3, b: THREE.Vector3, r0: number, r1: number, sides = 10): THREE.BufferGeometry {
  const len = a.distanceTo(b);
  const g = cyl(r1, r0, len, sides, 0.3);
  g.translate(0, len / 2, 0);
  g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()));
  g.translate(a.x, a.y, a.z);
  return g;
}
export const sph = (r: number, x: number, y: number, z: number, sx = 1, sy = sx, sz = sx, w = 14, h = 10) => at(new THREE.SphereGeometry(r, w, h), x, y, z, 0, 0, 0, sx, sy, sz);
const W = WORLD;
export { WORLD };

function buildPieces(L: HLook): Piece[] {
  const P: Piece[] = [];
  const bulk = L.bulk ?? 1;
  const add = (g: THREE.BufferGeometry, bone: string, color: Piece['color'], metal = false) => P.push({ g, bone, color, metal });
  const robe = L.armor === 'robe' || L.armor === 'dress';
  // ── bacaklar
  for (const s of ['L', 'R'] as const) {
    const t = W['thigh' + s], k = W['shin' + s], f = W['foot' + s];
    add(seg(t, k, 0.1 * bulk, 0.068), 'thigh' + s, L.pants);
    add(sph(0.068, k.x, k.y, k.z), 'shin' + s, L.pants);
    add(seg(k, f.clone().add(new THREE.Vector3(0, 0.04, 0)), 0.066, 0.05), 'shin' + s, L.pants);
    // çizme
    add(seg(k.clone().add(new THREE.Vector3(0, -0.16, 0)), f.clone().add(new THREE.Vector3(0, 0.02, 0)), 0.074, 0.064), 'shin' + s, L.boots);
    add(at(new THREE.TorusGeometry(0.074, 0.014, 6, 14), k.x, k.y - 0.16, k.z, Math.PI / 2), 'shin' + s, L.boots);
    add(at(new THREE.SphereGeometry(0.068, 12, 8), f.x, f.y - 0.025, f.z + 0.07, 0, 0, 0, 0.95, 0.62, 1.95), 'foot' + s, L.boots);
    if (L.armor === 'plate') {
      add(seg(k.clone().add(new THREE.Vector3(0, -0.02, 0.01)), f.clone().add(new THREE.Vector3(0, 0.08, 0.01)), 0.07, 0.06), 'shin' + s, L.armorCol!, true);
      add(sph(0.075, k.x, k.y, k.z + 0.02, 1, 1, 0.9), 'shin' + s, L.armorCol!, true);
      add(seg(t.clone().add(new THREE.Vector3(0, -0.05, 0.01)), k.clone().add(new THREE.Vector3(0, 0.08, 0.01)), 0.095 * bulk, 0.075), 'thigh' + s, L.armorCol!, true);
    }
  }
  // ── kalça ve gövde
  const hip = W.hips;
  add(sph(0.16 * bulk, hip.x, hip.y, hip.z, 1.05, 0.72, 0.78), 'hips', L.pants);
  add(at(new THREE.TorusGeometry(0.155 * bulk, 0.025, 6, 20), hip.x, hip.y + 0.06, 0, Math.PI / 2, 0, 0, 1, 0.78 / 1.05, 1), 'hips', L.belt);
  add(at(new THREE.BoxGeometry(0.07, 0.06, 0.03), 0, hip.y + 0.06, 0.13 * bulk), 'hips', L.trim ?? 0xb08a3a, true);
  const torsoCol = L.armor === 'plate' ? L.armorCol! : L.armor === 'leather' || L.armor === 'vest' || L.armor === 'apron' ? L.shirt : L.armor ? L.armorCol! : L.shirt;
  const torso = lathe([[0.0, 0], [0.155, 0], [0.158, 0.08], [0.175, 0.2], [0.215, 0.33], [0.225, 0.41], [0.2, 0.48], [0.1, 0.55], [0, 0.56]], 20, 0.4);
  torso.scale(bulk, 1, 0.68 * (bulk > 1.1 ? 1.15 : 1));
  torso.translate(0, hip.y + 0.04, 0);
  // gövdeyi iki kemiğe böl: alt yarı spine, üst yarı chest
  add(torso, 'chest', torsoCol, L.armor === 'plate');
  if (L.armor === 'plate') {
    add(at(lathe([[0, 0], [0.205, 0], [0.215, 0.12], [0.2, 0.22], [0, 0.24]], 18, 0.3), 0, W.chest.y + 0.02, 0.015, 0, 0, 0, bulk, 1, 0.72), 'chest', L.armorCol!, true);
    for (const s of [1, -1]) {
      add(at(new THREE.SphereGeometry(0.11, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), s * 0.21 * bulk, W.chest.y + 0.16, 0, 0, 0, s * -0.35, 1.05, 0.8, 1), s > 0 ? 'upperArmL' : 'upperArmR', L.armorCol!, true);
      add(at(new THREE.TorusGeometry(0.1, 0.012, 6, 16, Math.PI), s * 0.21 * bulk, W.chest.y + 0.16, 0, 0, Math.PI / 2, s * -0.35), s > 0 ? 'upperArmL' : 'upperArmR', L.trim!, true);
    }
    // tabard
    add(at(new THREE.BoxGeometry(0.2, 0.36, 0.02), 0, hip.y - 0.16, 0.135 * bulk), 'hips', L.cape ?? 0x802020);
    add(at(new THREE.BoxGeometry(0.2, 0.3, 0.02), 0, hip.y - 0.14, -0.13 * bulk), 'hips', L.cape ?? 0x802020);
    add(at(new THREE.BoxGeometry(0.06, 0.08, 0.025), 0, W.chest.y + 0.08, 0.15), 'chest', L.trim!, true);
  }
  if (L.armor === 'leather' || L.armor === 'vest') {
    add(at(lathe([[0, 0], [0.16, 0], [0.18, 0.12], [0.21, 0.28], [0.19, 0.38], [0, 0.4]], 16, 0.3), 0, hip.y + 0.06, 0.005, 0, 0, 0, bulk * 1.04, 1, 0.74), 'chest', L.armorCol!);
    if (L.armor === 'leather') {
      add(at(new THREE.BoxGeometry(0.04, 0.5, 0.02), 0.05, W.chest.y + 0.02, 0.13, 0, 0, 0.75), 'chest', 0x3a2a1a);
      for (const s of [1, -1]) add(at(new THREE.SphereGeometry(0.085, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), s * 0.2, W.chest.y + 0.16, 0, 0, 0, s * -0.4, 1, 0.7, 1), s > 0 ? 'upperArmL' : 'upperArmR', L.armorCol!);
    }
  }
  if (L.armor === 'apron') add(at(new THREE.BoxGeometry(0.32 * bulk, 0.75, 0.03), 0, hip.y + 0.05, 0.15 * bulk), 'chest', L.armorCol!);
  if (robe) {
    // etek (cübbe/elbise) kalçaya bağlı, bacakları örter
    const sk = lathe([[0.16, 0], [0.2, -0.2], [0.25, -0.5], [0.3, -0.8], [0.31, -0.9], [0, -0.9]], 20, 0.4);
    sk.scale(bulk, 1, 0.85); sk.translate(0, hip.y + 0.06, 0);
    add(sk, 'hips', L.armorCol!);
    add(at(new THREE.TorusGeometry(0.305, 0.018, 6, 24), 0, hip.y - 0.82, 0, Math.PI / 2, 0, 0, bulk, 0.85, 1), 'hips', L.trim ?? 0xd0a848, true);
    add(at(new THREE.BoxGeometry(0.05, 0.62, 0.02), 0, W.chest.y - 0.02, 0.14), 'chest', L.trim ?? 0xd0a848, true);
  }
  // ── kollar
  for (const s of ['L', 'R'] as const) {
    const sh = W['upperArm' + s], el = W['foreArm' + s], ha = W['hand' + s];
    add(sph(0.082 * bulk, sh.x, sh.y - 0.015, sh.z), 'upperArm' + s, L.armor === 'plate' ? L.armorCol! : torsoCol, L.armor === 'plate');
    add(seg(sh, el, 0.068 * bulk, 0.052), 'upperArm' + s, L.armor === 'plate' ? 0x6a6a72 : L.shirt);
    add(sph(0.052, el.x, el.y, el.z), 'foreArm' + s, L.shirt);
    const sleeve = robe ? 0.075 : 0.044;
    add(seg(el, ha.clone().add(new THREE.Vector3(0, 0.04, 0)), robe ? 0.055 : 0.052, robe ? sleeve : 0.042), 'foreArm' + s, robe ? L.armorCol! : L.shirt);
    if (L.armor === 'plate') add(seg(el.clone().add(new THREE.Vector3(0, -0.04, 0)), ha.clone().add(new THREE.Vector3(0, 0.03, 0)), 0.055, 0.052), 'foreArm' + s, L.armorCol!, true);
    if (L.armor === 'leather') add(seg(el.clone().add(new THREE.Vector3(0, -0.06, 0)), ha.clone().add(new THREE.Vector3(0, 0.04, 0)), 0.052, 0.048), 'foreArm' + s, L.armorCol!);
    // el
    const hc = L.armor === 'plate' ? L.armorCol! : L.armor === 'leather' ? 0x3a2818 : L.skin;
    add(at(new THREE.SphereGeometry(0.05, 12, 8), ha.x, ha.y - 0.035, ha.z + 0.012, 0, 0, 0, 0.7, 1.1, 1.1), 'hand' + s, hc, L.armor === 'plate');
    add(at(new THREE.CapsuleGeometry(0.016, 0.04, 3, 6), ha.x + (s === 'L' ? -0.025 : 0.025), ha.y - 0.03, ha.z + 0.04, 0.6, 0, 0), 'hand' + s, hc, L.armor === 'plate');
  }
  // ── boyun ve baş
  const nk = W.neck, hd = W.head;
  add(seg(nk.clone().add(new THREE.Vector3(0, -0.05, 0)), hd.clone().add(new THREE.Vector3(0, 0.03, 0)), 0.064, 0.055), 'neck', L.skin);
  const hy = hd.y + 0.1;
  add(sph(0.1, 0, hy, 0.005, 0.92, 1.12, 1.0, 20, 16), 'head', L.skin);
  add(sph(0.07, 0, hy - 0.06, 0.035, 0.95, 0.75, 0.9), 'head', L.skin); // çene
  add(at(new THREE.ConeGeometry(0.018, 0.045, 8), 0, hy - 0.005, 0.1, Math.PI / 2 - 0.3), 'head', L.skin); // burun
  for (const s of [1, -1]) {
    add(sph(0.02, s * 0.092, hy, 0, 0.5, 1, 0.7), 'head', L.skin); // kulak
    add(sph(0.015, s * 0.036, hy + 0.012, 0.086, 1.15, 0.75, 0.5), 'head', 0xf4f0ea); // göz akı
    add(sph(0.0095, s * 0.036, hy + 0.012, 0.093), 'head', 0x2a2018); // göz bebeği
    add(at(new THREE.BoxGeometry(0.04, 0.008, 0.012), s * 0.036, hy + 0.035, 0.09, 0, 0, s * -0.12), 'head', L.beard ?? L.hair); // kaş
  }
  add(at(new THREE.BoxGeometry(0.035, 0.006, 0.01), 0, hy - 0.05, 0.096), 'head', 0x8a4a40); // dudak
  // saç
  if (L.hairStyle !== 'bald') {
    add(at(new THREE.SphereGeometry(0.106, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), 0, hy + 0.005, -0.008, -0.25, 0, 0, 0.96, 1.08, 1.04), 'head', L.hair);
    if (L.hairStyle === 'long') add(at(new THREE.CylinderGeometry(0.095, 0.075, 0.28, 14, 1, true, Math.PI * 0.6, Math.PI * 1.8), 0, hy - 0.12, -0.02), 'head', L.hair);
    if (L.hairStyle === 'tail') { add(sph(0.04, 0, hy + 0.02, -0.11), 'head', L.hair); add(seg(new THREE.Vector3(0, hy, -0.12), new THREE.Vector3(0, hy - 0.26, -0.15), 0.035, 0.015), 'head', L.hair); }
    if (L.hairStyle === 'bun') add(sph(0.05, 0, hy + 0.08, -0.07), 'head', L.hair);
  } else add(sph(0.101, 0, hy + 0.01, 0, 0.92, 1.1, 1.0), 'head', L.skin);
  if (L.beard !== undefined) {
    add(at(new THREE.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, Math.PI * 0.45, Math.PI * 0.55), 0, hy - 0.035, 0.03, 0, 0, 0, 1.05, 1.25, 1), 'head', L.beard);
    add(at(new THREE.BoxGeometry(0.06, 0.012, 0.02), 0, hy - 0.035, 0.095), 'head', L.beard);
  }
  // başlık
  switch (L.helmet) {
    case 'knight':
      add(at(new THREE.SphereGeometry(0.122, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.62), 0, hy + 0.0, 0, 0, 0, 0, 0.95, 1.12, 1.05), 'head', L.helmCol!, true);
      add(at(new THREE.BoxGeometry(0.022, 0.1, 0.03), 0, hy - 0.015, 0.118), 'head', L.helmCol!, true);
      add(at(new THREE.TorusGeometry(0.118, 0.012, 6, 20), 0, hy - 0.035, 0, Math.PI / 2, 0, 0, 0.95, 1.05, 1), 'head', L.trim!, true);
      add(at(new THREE.BoxGeometry(0.03, 0.06, 0.2), 0, hy + 0.13, -0.02), 'head', L.trim!, true);
      add(at(new THREE.ConeGeometry(0.04, 0.22, 8), 0, hy + 0.16, -0.12, -1.9), 'head', L.cape ?? 0x8a1e22);
      break;
    case 'hood':
      add(at(new THREE.SphereGeometry(0.13, 18, 12, Math.PI * 0.82, Math.PI * 1.36, 0, Math.PI * 0.74), 0, hy + 0.012, -0.012, 0, 0, 0, 0.98, 1.1, 1.08), 'head', L.helmCol!);
      add(at(new THREE.ConeGeometry(0.26 * (L.bulk ?? 1), 0.22, 16, 1, true), 0, W.chest.y + 0.24, 0, 0, 0, 0, 1, 1, 0.75), 'chest', L.helmCol!);
      break;
    case 'circlet':
      add(at(new THREE.TorusGeometry(0.104, 0.009, 6, 24), 0, hy + 0.05, 0, Math.PI / 2 - 0.15, 0, 0), 'head', L.helmCol!, true);
      add(at(new THREE.OctahedronGeometry(0.018), 0, hy + 0.06, 0.1), 'head', L.orb ?? 0x7cf3ff);
      break;
    case 'cap':
      add(at(new THREE.SphereGeometry(0.112, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45), 0, hy + 0.02, 0, -0.1), 'head', L.helmCol!);
      add(at(new THREE.CylinderGeometry(0.12, 0.12, 0.012, 16, 1, false, -Math.PI / 2, Math.PI), 0, hy + 0.035, 0.03, -0.15), 'head', L.helmCol!);
      break;
    case 'bandana':
      add(at(new THREE.SphereGeometry(0.11, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), 0, hy + 0.02, 0), 'head', L.helmCol!);
      break;
  }
  // pelerin
  if (L.cape && L.armor !== 'robe') {
    const cape = new THREE.CylinderGeometry(0.2 * (L.bulk ?? 1), 0.36 * (L.bulk ?? 1), 1.05, 14, 6, true, Math.PI * 0.62, Math.PI * 0.76);
    cape.translate(0, -0.52, 0); cape.scale(1, 1, 0.55); cape.translate(0, W.chest.y + 0.22, -0.04);
    add(cape, 'chest', L.cape);
  }
  if (L.quiver) {
    add(at(cyl(0.05, 0.045, 0.5, 10), 0.08, W.chest.y + 0.05, -0.16, 0.25, 0, -0.35), 'chest', 0x6a4426);
    for (let i = 0; i < 4; i++) add(at(new THREE.ConeGeometry(0.015, 0.07, 4), 0.14 + i * 0.012, W.chest.y + 0.32, -0.21 + i * 0.01, 0.25, 0, -0.35), 'chest', 0xe8e0d0);
  }
  return P;
}

function weaponModel(L: HLook): { obj: THREE.Object3D; orb?: THREE.Object3D } | null {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: 0xd8dee8, metalness: 0.95, roughness: 0.22 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5a3a22, roughness: 0.75, map: objTexture('timber').map });
  const gold = new THREE.MeshStandardMaterial({ color: 0xd0a040, metalness: 1, roughness: 0.3 });
  const leather = new THREE.MeshStandardMaterial({ color: 0x3a2618, roughness: 0.8 });
  let orb: THREE.Object3D | undefined;
  switch (L.weapon) {
    case 'sword': {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.85, 0.012), metal); blade.position.y = 0.55;
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.1, 4), metal); tip.position.y = 1.02; tip.rotation.y = Math.PI / 4; tip.scale.z = 0.35;
      const fuller = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.7, 0.014), new THREE.MeshStandardMaterial({ color: 0x8a94a0, metalness: 0.9, roughness: 0.4 })); fuller.position.y = 0.5;
      const guard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.035, 0.05), gold); guard.position.y = 0.12;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.02, 0.17, 8), leather); grip.position.y = 0.02;
      const pommel = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), gold); pommel.position.y = -0.07;
      g.add(blade, tip, fuller, guard, grip, pommel);
      g.rotation.x = Math.PI / 2; // elde ileri bakar
      break;
    }
    case 'hammer': {
      const h = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.022, 0.6, 8), wood); h.position.y = 0.2;
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.1, 0.1), new THREE.MeshStandardMaterial({ color: 0x5a5c64, metalness: 0.8, roughness: 0.45 })); head.position.y = 0.48;
      g.add(h, head); g.rotation.x = Math.PI / 2;
      break;
    }
    case 'staff': {
      const s = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.026, 1.7, 8), wood); s.position.y = 0.35;
      const claw = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.013, 6, 12, Math.PI * 1.4), gold); claw.position.y = 1.24; claw.rotation.z = Math.PI * 1.2;
      const cm = new THREE.MeshStandardMaterial({ color: 0x103040, emissive: L.orb ?? 0x7cf3ff, emissiveIntensity: 2.6, roughness: 0.1 });
      const crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.06, 0), cm); crystal.position.y = 1.28; crystal.scale.y = 1.6;
      g.add(s, claw, crystal);
      orb = crystal;
      g.rotation.x = Math.PI / 2 - 0.15;
      g.position.y = -0.2;
      break;
    }
    case 'bow': {
      const curve = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.016, 6, 24, Math.PI * 0.62), wood);
      curve.rotation.z = Math.PI / 2 + Math.PI * 0.31 - Math.PI / 2; curve.position.x = -0.5;
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.022, 0.12, 8), leather); grip.position.x = 0.12;
      const sx = -0.5 + Math.cos(Math.PI * 0.31) * 0.62, sy = Math.sin(Math.PI * 0.31) * 0.62;
      const string = new THREE.Mesh(new THREE.CylinderGeometry(0.003, 0.003, sy * 2, 4), new THREE.MeshStandardMaterial({ color: 0xe8e0d0 })); string.position.x = sx;
      const b = new THREE.Group(); b.add(curve, grip, string);
      b.rotation.y = Math.PI / 2; // yay düzlemi ileri
      g.add(b);
      break;
    }
    case 'rod': {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.02, 1.8, 6), wood); r.position.y = 0.7;
      g.add(r); g.rotation.x = Math.PI / 2 - 0.5;
      break;
    }
    case 'book': {
      const bk = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.05), new THREE.MeshStandardMaterial({ color: 0x6a2020, roughness: 0.7 }));
      g.add(bk);
      break;
    }
    default: return null;
  }
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) { o.castShadow = true; } });
  return { obj: g, orb };
}

function shieldModel(L: HLook): THREE.Object3D {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  shape.moveTo(-0.2, 0.25); shape.lineTo(0.2, 0.25); shape.lineTo(0.2, 0.0); shape.quadraticCurveTo(0.18, -0.22, 0, -0.32); shape.quadraticCurveTo(-0.18, -0.22, -0.2, 0.0); shape.closePath();
  const face = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.03, bevelEnabled: true, bevelSize: 0.015, bevelThickness: 0.015, bevelSegments: 2 }), new THREE.MeshStandardMaterial({ color: L.cape ?? 0x8a1e22, roughness: 0.6 }));
  const rim = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.02, bevelEnabled: false }), new THREE.MeshStandardMaterial({ color: 0xb0b8c4, metalness: 0.9, roughness: 0.3 }));
  rim.scale.set(1.08, 1.08, 1); rim.position.z = -0.012;
  const boss = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xd0a040, metalness: 1, roughness: 0.3 }));
  boss.rotation.x = Math.PI / 2; boss.position.z = 0.04;
  g.add(rim, face, boss);
  g.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
  return g;
}

const templates = new Map<string, THREE.Object3D>();

function buildTemplate(L: HLook): THREE.Object3D { return templateFromPieces(buildPieces(L), BONES); }

export type BoneDef = [string, string | null, number, number, number];
export interface TplOpts { glowColor?: number; clothRough?: number; texture?: string; transparent?: boolean; opacity?: number }
/** Parça listesinden iskeletli şablon (insan veya yaratık). Malzeme grupları: 0 kumaş/deri, 1 metal, 2 parlayan. */
export function templateFromPieces(pieces: Piece[], boneDefs: BoneDef[], o: TplOpts = {}): THREE.Object3D {
  const BONE_INDEX = Object.fromEntries(boneDefs.map((b, i) => [b[0], i]));
  const tmp = new THREE.Color();
  const toGeo = (kind: number) => {
    const list = pieces.filter((p) => (p.glow ? 2 : p.metal ? 1 : 0) === kind).map((p) => {
      const g = clean(p.g);
      colorize(g, typeof p.color === 'number' ? (tmp.set(p.color), tmp.clone()) : p.color);
      const n = g.attributes.position.count;
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
      const bi = BONE_INDEX[p.bone];
      for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4));
      g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      return g;
    });
    return list.length ? mergeGeometries(list, false) : null;
  };
  const parts = [toGeo(0), toGeo(1), toGeo(2)];
  const placeholder = () => { const g = new THREE.BufferGeometry(); return g; };
  void placeholder;
  const present = parts.map((g, i) => [g, i] as const).filter(([g]) => g) as [THREE.BufferGeometry, number][];
  const geo = mergeGeometries(present.map(([g]) => g), true)!;
  // grup → malzeme indeksi eşlemesi
  geo.groups.forEach((gr, i) => { gr.materialIndex = present[i][1]; });
  const tex = objTexture(o.texture ?? 'cloth');
  const mats = [
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.clothRough ?? 0.78, map: tex.map, normalMap: tex.normal, normalScale: new THREE.Vector2(0.5, 0.5), transparent: !!o.transparent, opacity: o.opacity ?? 1 }),
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.85, map: objTexture('metal').map }),
    new THREE.MeshStandardMaterial({ color: 0x000000, emissive: o.glowColor ?? 0xffe080, emissiveIntensity: 2.4 }),
  ];
  // kemikler
  const bones: THREE.Bone[] = [];
  for (const [n, p, x, y, z] of boneDefs) {
    const b = new THREE.Bone(); b.name = n; b.position.set(x, y, z);
    if (p) bones[BONE_INDEX[p]].add(b);
    bones.push(b);
  }
  const mesh = new THREE.SkinnedMesh(geo, mats);
  mesh.add(bones[0]);
  mesh.bind(new THREE.Skeleton(bones));
  mesh.castShadow = true; mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const root = new THREE.Group();
  const body = new THREE.Group(); body.name = 'body';
  body.add(mesh);
  root.add(body);
  return root;
}

export function instantiate(tpl: THREE.Object3D) {
  const root = skClone(tpl) as THREE.Object3D;
  const body = root.getObjectByName('body')!;
  let mesh!: THREE.SkinnedMesh;
  root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh; });
  const bones: Record<string, THREE.Bone> = {};
  for (const b of mesh.skeleton.bones) bones[b.name] = b;
  return { root, body, mesh, bones };
}

export function createHumanoid(L: HLook): Rig {
  let tpl = templates.get(L.id);
  if (!tpl) { tpl = sculptedTemplate(L.id) ?? buildTemplate(L); templates.set(L.id, tpl); }
  const root = skClone(tpl) as THREE.Object3D;
  const body = root.getObjectByName('body')!;
  let mesh!: THREE.SkinnedMesh;
  root.traverse((o) => { if ((o as THREE.SkinnedMesh).isSkinnedMesh) mesh = o as THREE.SkinnedMesh; });
  const bones: Record<string, THREE.Bone> = {};
  for (const b of mesh.skeleton.bones) bones[b.name] = b;
  const rig: Rig = { root, body, bones, mesh, look: L };
  const w = weaponModel(L);
  if (w) {
    const hand = L.weapon === 'bow' ? bones.handL : bones.handR;
    w.obj.position.y += -0.06;
    hand.add(w.obj);
    rig.weapon = w.obj; rig.orb = w.orb;
  }
  if (L.shield) { const s = shieldModel(L); s.position.set(0.07, -0.12, 0.02); s.rotation.set(0, Math.PI / 2, 0); bones.foreArmL.add(s); }
  return rig;
}

// ───────────── animasyon ─────────────
export type HState = 'idle' | 'walk' | 'attack' | 'cast' | 'hurt' | 'dead';

/** Prosedürel animasyon: her kare kemik açıları zaman ve duruma göre hesaplanır. */
export function animateHumanoid(r: Rig, st: HState, t: number, k: number, walkPhase: number) {
  const B = r.bones;
  const w = r.look.weapon;
  for (const b of Object.values(B)) b.rotation.set(0, 0, 0);
  B.hips.position.y = 0.98;
  r.body.rotation.set(0, 0, 0); r.body.position.set(0, 0, 0);
  const breath = Math.sin(t * 2.2) * 0.025;
  // dinlenme: kollar hafif yanda
  B.upperArmL.rotation.z = 0.12; B.upperArmR.rotation.z = -0.12;
  B.foreArmL.rotation.x = -0.15; B.foreArmR.rotation.x = -0.25;
  B.spine.rotation.x = breath * 0.4; B.chest.rotation.x = breath * 0.3;
  if (w === 'sword' || w === 'hammer') { B.foreArmR.rotation.x = -0.9; B.upperArmR.rotation.x = 0.1; }
  if (w === 'staff') { B.foreArmR.rotation.x = -1.1; B.upperArmR.rotation.x = 0.15; B.upperArmR.rotation.z = -0.2; }
  if (w === 'bow') { B.foreArmL.rotation.x = -0.6; }
  if (r.look.shield) { B.foreArmL.rotation.x = -1.1; B.upperArmL.rotation.x = -0.15; B.upperArmL.rotation.z = 0.3; }
  if (st === 'walk') {
    const s = Math.sin(walkPhase), c = Math.cos(walkPhase);
    B.thighL.rotation.x = -s * 0.62; B.thighR.rotation.x = s * 0.62;
    B.shinL.rotation.x = Math.max(0, c) * 0.95 + 0.05; B.shinR.rotation.x = Math.max(0, -c) * 0.95 + 0.05;
    B.footL.rotation.x = -Math.max(0, s) * 0.3; B.footR.rotation.x = -Math.max(0, -s) * 0.3;
    B.hips.position.y = 0.98 - Math.abs(c) * 0.035;
    B.hips.rotation.y = s * 0.12; B.chest.rotation.y = -s * 0.18;
    B.spine.rotation.x = 0.06;
    if (!r.look.shield) B.upperArmL.rotation.x = s * 0.5;
    if (w !== 'staff' && w !== 'sword') B.upperArmR.rotation.x = -s * 0.5;
    else B.upperArmR.rotation.x += -s * 0.25;
  }
  if (st === 'attack') {
    const p = Math.min(1, k);
    if (w === 'sword' || w === 'hammer') {
      // yukarı kaldır → çapraz savur
      const up = p < 0.35 ? p / 0.35 : 1, sw = p < 0.35 ? 0 : (p - 0.35) / 0.65;
      B.upperArmR.rotation.x = -2.5 * up + 2.1 * easeOut(sw);
      B.upperArmR.rotation.z = -0.3 - 0.6 * sw;
      B.foreArmR.rotation.x = -0.4 - 0.4 * (1 - sw);
      B.chest.rotation.y = 0.45 * up - 0.9 * easeOut(sw);
      B.spine.rotation.x = 0.15 * sw;
      B.thighL.rotation.x = -0.35; B.shinL.rotation.x = 0.3; B.thighR.rotation.x = 0.25;
    } else if (w === 'bow') {
      const draw = Math.min(1, p / 0.55), rel = p > 0.6 ? (p - 0.6) / 0.4 : 0;
      B.chest.rotation.y = -0.9;
      B.upperArmL.rotation.x = -1.5; B.upperArmL.rotation.z = 0.0; B.foreArmL.rotation.x = 0;
      B.upperArmR.rotation.x = -1.45; B.upperArmR.rotation.z = -0.15 * draw;
      B.foreArmR.rotation.x = -1.9 * draw * (1 - rel);
      B.head.rotation.y = 0.8;
    } else {
      const lift = Math.sin(Math.min(1, p) * Math.PI);
      B.upperArmR.rotation.x = -1.2 - lift * 0.8; B.foreArmR.rotation.x = -0.4;
      B.upperArmL.rotation.x = -0.8 * lift; B.upperArmL.rotation.z = 0.4;
      B.chest.rotation.x = -0.1 * lift;
    }
  }
  if (st === 'cast') {
    const lift = Math.sin(Math.min(1, k) * Math.PI);
    B.upperArmR.rotation.x = -2.4 * lift - 0.3; B.upperArmL.rotation.x = -2.2 * lift; B.upperArmL.rotation.z = 0.3;
    B.foreArmR.rotation.x = -0.2; B.foreArmL.rotation.x = -0.2;
    B.chest.rotation.x = -0.18 * lift; B.head.rotation.x = -0.2 * lift;
    B.hips.position.y = 0.98 - 0.05 * lift;
    B.thighL.rotation.x = -0.2 * lift; B.shinL.rotation.x = 0.25 * lift; B.shinR.rotation.x = 0.2 * lift;
  }
  if (st === 'hurt') { B.chest.rotation.x = -0.25; B.head.rotation.x = -0.3; }
  if (st === 'dead') {
    const p = Math.min(1, k);
    r.body.rotation.x = -Math.PI / 2 * easeOut(p);
    r.body.position.y = 0.12 * p;
    B.upperArmL.rotation.z = 1.2; B.upperArmR.rotation.z = -1.2;
    B.thighL.rotation.z = 0.15; B.thighR.rotation.z = -0.15;
  }
  if (r.orb) { r.orb.rotation.y = t * 2; }
}
const easeOut = (x: number) => 1 - (1 - x) * (1 - x);
