import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { attachToBone, boneRootPos, type GlbChar } from './models.ts';

/**
 * Nadir zırh görünümü: karakter tek parça model olduğundan zırh, iskelete bağlanan parçalarla kurulur:
 * omuzluk, göğüs amblemi, yaka, pelerin, kemer tokası, bilezik ve taç. Mavi → turuncu → kızıl giderek büyür ve süslenir;
 * her sınıfın kendi biçimi var (savaşçı: dikenli ağır plaka, avcı: yana süpürülmüş kanatçıklar, büyücü: süzülen kristaller).
 *
 * Maliyet: parçalar kemik başına birleştirilir (zırh / kumaş / taş için birer ağ), malzemeler bütün karakterlerce paylaşılır,
 * geometri model + sınıf + nadirlik başına bir kez kurulur. Gölge yok.
 */
type Tier = 1 | 2 | 3;
interface Pal { metal: number; accent: number; trim: number; gem: number; cloth: number; dark: number }
const PAL: Record<Tier, Pal> = {
  1: { metal: 0xb4c4da, accent: 0x2c5cd6, trim: 0xeef3fb, gem: 0x58a8ff, cloth: 0x1e3c80, dark: 0x5a6a84 },
  2: { metal: 0xe4a632, accent: 0xc44e16, trim: 0xfff0b8, gem: 0xffa21c, cloth: 0xb4380e, dark: 0x8a5a1c },
  3: { metal: 0x3a1220, accent: 0xb0101e, trim: 0xf0b844, gem: 0xff2436, cloth: 0x620814, dark: 0x1a0810 },
};

const mats: Partial<Record<string, THREE.Material>> = {};
function mat(kind: 'armor' | 'cloth' | 'gem', tier: Tier) {
  const k = kind + tier;
  if (mats[k]) return mats[k]!;
  const m = kind === 'gem'
    ? new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })
    : kind === 'cloth'
      ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, side: THREE.DoubleSide })
      : new THREE.MeshStandardMaterial({ vertexColors: true, roughness: tier === 3 ? 0.34 : 0.4, metalness: tier === 1 ? 0.6 : 0.75, envMapIntensity: 1.0 });
  return (mats[k] = m);
}

/** Geometriyi tek renge boyar, birleştirmeye hazırlar (indekssiz, uv'siz). */
function paint(g: THREE.BufferGeometry, color: number, bright = 1) {
  const n = g.index ? g.toNonIndexed() : g;
  n.deleteAttribute('uv');
  const c = new THREE.Color(color).multiplyScalar(bright);
  const a = new Float32Array(n.attributes.position.count * 3);
  for (let i = 0; i < a.length; i += 3) { a[i] = c.r; a[i + 1] = c.g; a[i + 2] = c.b; }
  n.setAttribute('color', new THREE.BufferAttribute(a, 3));
  if (!n.attributes.normal) n.computeVertexNormals();
  return n;
}

interface Bucket { armor: THREE.BufferGeometry[]; cloth: THREE.BufferGeometry[]; gem: THREE.BufferGeometry[] }
const bucket = (): Bucket => ({ armor: [], cloth: [], gem: [] });

/** Kemiğe ağırlıklı köşelerin kök uzayındaki kutusu (bağlanma pozunda). */
const boxes = new Map<string, THREE.Box3 | null>();
function boneBox(glb: GlbChar, bone: THREE.Object3D): THREE.Box3 | null {
  const key = glb.id + '|' + bone.name;
  if (boxes.has(key)) return boxes.get(key)!;
  const { root } = glb;
  root.updateMatrixWorld(true);
  let res: THREE.Box3 | null = null;
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (res || !m.isSkinnedMesh) return;
    const bi = m.skeleton.bones.indexOf(bone as THREE.Bone);
    if (bi < 0) return;
    const M = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(m.matrixWorld);
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    const b = new THREE.Box3(); const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) for (let k = 0; k < 4; k++) if (si.getComponent(i, k) === bi && sw.getComponent(i, k) > 0.4) {
      v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); b.expandByPoint(v.applyMatrix4(M)); break;
    }
    if (!b.isEmpty()) res = b;
  });
  boxes.set(key, res);
  return res;
}

/** Verilen kemiklere bağlı köşelerden süzgeçten geçenlerin kutusu (kök uzayı, bağlanma pozu). */
function cloud(glb: GlbChar, bones: (THREE.Object3D | undefined)[], keep: (v: THREE.Vector3) => boolean): THREE.Box3 | null {
  const { root } = glb;
  root.updateMatrixWorld(true);
  const b = new THREE.Box3(); const v = new THREE.Vector3();
  root.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const ids = new Set(bones.filter(Boolean).map((x) => m.skeleton.bones.indexOf(x as THREE.Bone)).filter((i) => i >= 0));
    if (!ids.size) return;
    const M = new THREE.Matrix4().copy(root.matrixWorld).invert().multiply(m.matrixWorld);
    const pos = m.geometry.attributes.position, si = m.geometry.attributes.skinIndex, sw = m.geometry.attributes.skinWeight;
    for (let i = 0; i < pos.count; i++) for (let k = 0; k < 4; k++) if (ids.has(si.getComponent(i, k)) && sw.getComponent(i, k) > 0.3) {
      v.fromBufferAttribute(pos, i); m.applyBoneTransform(i, v); v.applyMatrix4(M);
      if (keep(v)) b.expandByPoint(v);
      break;
    }
  });
  return b.isEmpty() ? null : b;
}

function findBone(root: THREE.Object3D, re: RegExp) {
  let f: THREE.Object3D | undefined;
  root.traverse((o) => { if (!f && (o as THREE.Bone).isBone && re.test(o.name)) f = o; });
  return f;
}

// ───────── parçalar (bağlantı noktasına göre, kök eksenlerinde: +Z ileri, +X karakterin solu, +Y yukarı) ─────────

function pauldron(B: Bucket, s: number, tier: Tier, cls: string, P: Pal, fit: number) {
  const k = Math.max((cls === 'guardian' ? 1.12 : cls === 'hunter' ? 0.9 : 1) * (1 + (tier - 1) * 0.12), fit / 0.105);
  const tilt = -s * 0.55;
  const dome = (r: number, color: number, z: number, x: number, y: number, extra = 0) => {
    const g = new THREE.SphereGeometry(r, 16, 8, 0, Math.PI * 2, 0, Math.PI * 0.5);
    g.scale(1.0, 0.46, 1.1); g.rotateZ(tilt - s * extra); g.translate(x, y, z);
    return paint(g, color);
  };
  const R = 0.105 * k;
  B.armor.push(dome(R, P.metal, 0, s * 0.02, 0.03));
  const lames = tier + (cls === 'guardian' ? 1 : 0);
  for (let i = 1; i <= lames; i++) B.armor.push(dome(R * (1 - i * 0.1), i % 2 ? P.accent : P.metal, 0, s * (0.03 + 0.035 * i), 0.02 - 0.04 * i, 0.3 * i));
  const trim = new THREE.TorusGeometry(R * 1.02, 0.009 + tier * 0.002, 6, 22);
  trim.rotateX(Math.PI / 2); trim.scale(1.0, 1, 1.1); trim.rotateZ(tilt); trim.translate(s * 0.02, 0.03, 0);
  B.armor.push(paint(trim, P.trim));
  // ön-arka uzanan sırt kaburgası ve iki yan şerit (düz top görünmesin)
  for (const [off, th, col] of [[0, 0.012, P.trim], [0.4, 0.007, P.accent], [-0.4, 0.007, P.accent]] as const) {
    const rib = new THREE.TorusGeometry(R * 0.99, th, 5, 16, Math.PI);
    rib.rotateY(Math.PI / 2); rib.scale(1, 0.46 / 1, 1.1); rib.rotateZ(tilt - off * 0.9); rib.translate(s * 0.02, 0.03, 0);
    B.armor.push(paint(rib, col));
  }
  // dom tepesindeki taş
  const gem = new THREE.OctahedronGeometry(0.018 + tier * 0.006, 0);
  gem.scale(1, 1.3, 1); gem.rotateZ(tilt); gem.translate(s * (0.02 + Math.sin(0.55) * R * 0.62), 0.03 + Math.cos(0.55) * R * 0.62, 0);
  B.gem.push(paint(gem, P.gem, 1.4));
  if (cls === 'guardian' && tier >= 2) {
    // yukarı-dışa kıvrık dikenler
    const n = tier === 3 ? 3 : 2;
    for (let i = 0; i < n; i++) {
      const h = (tier === 3 ? 0.15 : 0.1) * (i === Math.floor(n / 2) ? 1.2 : 0.9);
      const c = new THREE.ConeGeometry(0.02, h, 6); c.translate(0, h / 2, 0);
      c.rotateZ(-s * (0.5 + i * 0.12)); c.rotateX((i - (n - 1) / 2) * 0.35);
      c.translate(s * (0.03 + R * 0.45), 0.03 + R * 0.45, (i - (n - 1) / 2) * 0.06);
      B.armor.push(paint(c, tier === 3 ? P.trim : P.metal));
    }
  }
  if (cls === 'hunter' && tier >= 2) {
    // geriye süpürülmüş bıçak kanatçıklar
    for (let i = 0; i < tier; i++) {
      const c = new THREE.ConeGeometry(0.03, 0.16 + i * 0.03, 4); c.scale(1, 1, 0.22); c.translate(0, 0.08, 0);
      c.rotateX(-1.2 - i * 0.15); c.rotateZ(-s * (0.4 + i * 0.25)); c.translate(s * (0.05 + i * 0.03), 0.04 - i * 0.03, -0.04);
      B.armor.push(paint(c, i % 2 ? P.accent : P.trim));
    }
  }
  if (cls === 'arcanist') {
    // omuz üstünde süzülen kristaller
    for (let i = 0; i < tier; i++) {
      const c = new THREE.OctahedronGeometry(0.022 + tier * 0.005, 0); c.scale(1, 2.2, 1);
      c.translate(s * (0.05 + i * 0.03), 0.15 + (i % 2) * 0.05, (i - (tier - 1) / 2) * 0.06);
      B.gem.push(paint(c, P.gem, 1.3));
    }
  }
}

function emblem(B: Bucket, tier: Tier, P: Pal) {
  const disc = new THREE.CylinderGeometry(0.045 + tier * 0.012, 0.045 + tier * 0.012, 0.016, 20); disc.rotateX(Math.PI / 2);
  B.armor.push(paint(disc, tier === 3 ? P.metal : P.trim));
  const ring = new THREE.TorusGeometry(0.045 + tier * 0.012, 0.007, 6, 24); ring.translate(0, 0, 0.008);
  B.armor.push(paint(ring, P.trim));
  const core = new THREE.OctahedronGeometry(0.022 + tier * 0.008, tier >= 2 ? 1 : 0); core.scale(1, 1.25, 0.6); core.translate(0, 0, 0.018);
  B.gem.push(paint(core, P.gem, 1.5));
  if (tier >= 2) {
    // iki yana açılan kanatlar
    for (const s of [-1, 1]) {
      const sh = new THREE.Shape();
      sh.moveTo(0, 0); sh.lineTo(0.16, 0.07); sh.lineTo(0.12, 0.02); sh.lineTo(0.15, -0.01); sh.lineTo(0.09, -0.02); sh.lineTo(0.11, -0.05); sh.lineTo(0, -0.025);
      const w = new THREE.ExtrudeGeometry(sh, { depth: 0.01, bevelEnabled: false });
      w.scale(s * (tier === 3 ? 1.15 : 0.9), tier === 3 ? 1.15 : 0.9, 1); w.translate(s * 0.04, 0.01, -0.004);
      B.armor.push(paint(w, tier === 3 ? P.trim : P.metal));
    }
  }
  if (tier === 3) {
    // sekiz köşeli yıldız ve aşağı sarkan kızıl damla
    const st = new THREE.Shape();
    for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + Math.PI / 2, r = i % 2 ? 0.05 : 0.105; const x = Math.cos(a) * r, y = Math.sin(a) * r; if (i) st.lineTo(x, y); else st.moveTo(x, y); }
    const sg = new THREE.ExtrudeGeometry(st, { depth: 0.008, bevelEnabled: false }); sg.translate(0, 0, -0.01);
    B.armor.push(paint(sg, P.accent));
    const drop = new THREE.OctahedronGeometry(0.02, 0); drop.scale(1, 2, 0.6); drop.translate(0, -0.11, 0.01);
    B.gem.push(paint(drop, P.gem, 1.4));
  }
}

function collar(B: Bucket, tier: Tier, P: Pal, cls: string) {
  const h = (cls === 'arcanist' ? 0.2 : 0.13) + tier * 0.02;
  const g = new THREE.CylinderGeometry(0.13, 0.1, h, 18, 1, true, Math.PI * 0.6, Math.PI * 0.8);
  g.translate(0, h / 2, 0);
  B.armor.push(paint(g, P.accent));
  const t = new THREE.TorusGeometry(0.13, 0.008, 6, 18, Math.PI * 0.8); t.rotateX(Math.PI / 2); t.rotateY(-Math.PI * 0.6 + Math.PI / 2 - Math.PI * 0.8 / 2 + Math.PI * 0.4); t.translate(0, h, 0);
  B.armor.push(paint(t, P.trim));
}

function cape(B: Bucket, tier: Tier, P: Pal, width: number, len: number) {
  const g = new THREE.PlaneGeometry(1, 1, 6, 8);
  const pos = g.attributes.position;
  const col = new Float32Array(pos.count * 3);
  const base = new THREE.Color(P.cloth), band = new THREE.Color(P.trim), inner = new THREE.Color(P.dark);
  for (let i = 0; i < pos.count; i++) {
    const u = pos.getX(i), t = 0.5 - pos.getY(i); // t: 0 üst, 1 alt
    const w = width * (1 + t * 0.35);
    // kıvrımlar: hafif dalgalı alt kenar, sırta oturan üst, aşağı doğru geriye açılma
    const x = u * w, y = -t * len + (t > 0.95 ? Math.sin(u * 18) * 0.02 : 0);
    const z = -0.02 - t * t * 0.16 + Math.cos(u * Math.PI) * 0.04 * (1 - t * 0.5) - Math.abs(Math.sin(u * 9)) * 0.015 * t;
    pos.setXYZ(i, x, y, z);
    const c = t > 0.88 && tier >= 2 ? band : base;
    col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
  }
  void inner;
  g.deleteAttribute('uv');
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  B.cloth.push(g.toNonIndexed());
  // omuz bağlantısı: iki tokalı zincir çubuğu
  for (const s of [-1, 1]) {
    const c = new THREE.SphereGeometry(0.024, 10, 8); c.translate(s * width * 0.48, 0, 0.0);
    B.gem.push(paint(c, P.gem, 1.3));
  }
}

function buckle(B: Bucket, tier: Tier, P: Pal) {
  const p = new THREE.BoxGeometry(0.07 + tier * 0.015, 0.05 + tier * 0.01, 0.014);
  B.armor.push(paint(p, P.trim));
  const g = new THREE.OctahedronGeometry(0.016 + tier * 0.004, 0); g.scale(1.3, 1, 0.6); g.translate(0, 0, 0.012);
  B.gem.push(paint(g, P.gem, 1.4));
  if (tier === 3) for (const s of [-1, 1]) {
    const d = new THREE.BoxGeometry(0.05, 0.12, 0.012); d.translate(s * 0.08, -0.07, -0.01); d.rotateZ(s * 0.15);
    B.armor.push(paint(d, P.metal));
  }
}

function crown(B: Bucket, tier: Tier, P: Pal) {
  if (tier === 2) {
    const t = new THREE.TorusGeometry(0.11, 0.008, 6, 28); t.rotateX(Math.PI / 2);
    B.armor.push(paint(t, P.trim));
    for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const c = new THREE.ConeGeometry(0.012, 0.04, 4); c.translate(Math.cos(a) * 0.11, 0.02, Math.sin(a) * 0.11); B.armor.push(paint(c, P.trim)); }
    return;
  }
  // kızıl: süzülen kristal taç
  const t = new THREE.TorusGeometry(0.115, 0.009, 6, 28); t.rotateX(Math.PI / 2);
  B.armor.push(paint(t, P.trim));
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + Math.PI / 2, big = i === 0;
    const c = new THREE.OctahedronGeometry(big ? 0.03 : 0.02, 0); c.scale(1, big ? 2.6 : 2, 1);
    c.translate(Math.cos(a) * 0.115, (big ? 0.06 : 0.035), Math.sin(a) * 0.115);
    B.gem.push(paint(c, P.gem, 1.4));
  }
}

function bracer(B: Bucket, tier: Tier, P: Pal, dir: THREE.Vector3, rad = 0.05) {
  const k = rad / 0.05;
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
  const m = new THREE.Matrix4().makeRotationFromQuaternion(q);
  const c = new THREE.CylinderGeometry(0.05 * k, 0.044 * k, 0.11, 14, 1, true); c.applyMatrix4(m);
  B.armor.push(paint(c, P.metal));
  for (const y of [-0.05, 0.05]) { const r = new THREE.TorusGeometry((y < 0 ? 0.045 : 0.051) * k, 0.006, 6, 16); r.rotateX(Math.PI / 2); r.translate(0, y, 0); r.applyMatrix4(m); B.armor.push(paint(r, P.trim)); }
  if (tier === 3) { const g = new THREE.OctahedronGeometry(0.016, 0); g.translate(0, 0, 0.05 * k); g.applyMatrix4(m); B.gem.push(paint(g, P.gem, 1.4)); }
}

// ───────── kurulum ─────────

interface Built { bone: THREE.Object3D; at: THREE.Vector3; meshes: { geo: THREE.BufferGeometry; kind: 'armor' | 'cloth' | 'gem' }[] }
const built = new Map<string, { boneName: string; at: THREE.Vector3; meshes: Built['meshes'] }[]>();

/** Karaktere nadirliğe göre zırh parçalarını takar; takılan kök grupları döner (uzakta gizlemek için). */
export function equipArmor(glb: GlbChar, cls: string, rarity: number): THREE.Object3D[] {
  const tier = Math.min(3, rarity) as Tier;
  if (tier <= 0) return [];
  const { root } = glb;
  const key = `${glb.id}|${cls}|${tier}`;
  let plan = built.get(key);
  if (!plan) {
    plan = [];
    const P = PAL[tier];
    const add = (bone: THREE.Object3D | undefined, at: THREE.Vector3 | null, fill: (b: Bucket) => void) => {
      if (!bone || !at) return;
      const b = bucket(); fill(b);
      const meshes: Built['meshes'] = [];
      for (const kind of ['armor', 'cloth', 'gem'] as const) if (b[kind].length) { const g = mergeGeometries(b[kind], false); if (g) { g.computeBoundingSphere(); meshes.push({ geo: g, kind }); } }
      plan!.push({ boneName: bone.name, at, meshes });
    };
    const armL = findBone(root, /^(left|l)[_ .-]?arm$|^leftarm$/i), armR = findBone(root, /^(right|r)[_ .-]?arm$|^rightarm$/i);
    const spine = findBone(root, /^spine$/i) ?? findBone(root, /spine/i), hips = findBone(root, /hips|pelvis/i), head = findBone(root, /^head$/i), neck = findBone(root, /neck/i);
    const faL = findBone(root, /^(left|l)[_ .-]?fore[_ .-]?arm$/i), faR = findBone(root, /^(right|r)[_ .-]?fore[_ .-]?arm$/i);
    const hL = glb.bones.handL, hR = glb.bones.handR;
    const sbox = spine ? boneBox(glb, spine) : null;
    const front = sbox ? sbox.max.z : 0.12, back = sbox ? sbox.min.z : -0.12;
    const shL = findBone(root, /^(left|l)[_ .-]?shoulder$/i), shR = findBone(root, /^(right|r)[_ .-]?shoulder$/i);
    for (const [arm, sh, s] of [[armL, shL, 1], [armR, shR, -1]] as const) {
      if (!arm) continue;
      const p = boneRootPos(root, arm);
      // omzun gerçek yüzeyi (cüppe/kürk dahil): eklemin çevresindeki köşeler
      const c = cloud(glb, [arm, sh], (v) => v.distanceTo(p) < 0.15);
      const top = c ? c.max.y : p.y + 0.06, zc = c ? (c.min.z + c.max.z) / 2 : p.z;
      const fit = c ? Math.min(0.125, Math.max(c.max.z - c.min.z, 0.1) * 0.5) : 0.1;
      add(arm, new THREE.Vector3(p.x + s * 0.015, top - fit * 0.3, zc), (b) => pauldron(b, s, tier, cls, P, fit));
    }
    if (spine && armL && armR) {
      const sp = boneRootPos(root, spine), sh = boneRootPos(root, armL).y;
      // göğüs: omuz hizasının biraz altında, gövdenin önünde
      const chestY = THREE.MathUtils.lerp(sp.y, sh, 0.35);
      // göğsün en önü: omurga kemiklerinin bu yükseklikteki köşeleri
      const spines: THREE.Object3D[] = []; root.traverse((o) => { if ((o as THREE.Bone).isBone && /spine|chest/i.test(o.name)) spines.push(o); });
      const chestBox = cloud(glb, spines, (v) => Math.abs(v.y - chestY) < 0.06 && Math.abs(v.x) < 0.08);
      const fz = chestBox ? chestBox.max.z : front;
      const backBox = cloud(glb, spines, (v) => Math.abs(v.y - (sh - 0.05)) < 0.06 && Math.abs(v.x) < 0.12);
      const bz = backBox ? backBox.min.z : back;
      add(spine, new THREE.Vector3(0, chestY, fz + 0.012), (b) => emblem(b, tier, P));
      if (tier >= 2) {
        const width = Math.abs(boneRootPos(root, armL).x - boneRootPos(root, armR).x) * 0.82;
        const hy = hips ? boneRootPos(root, hips).y : sh - 0.5;
        add(spine, new THREE.Vector3(0, sh - 0.02, bz - 0.015), (b) => cape(b, tier, P, width, (sh - hy) * (tier === 3 ? 1.75 : 1.45)));
      }
      if (neck && (tier === 3 || (tier === 2 && cls === 'arcanist'))) {
        const np = boneRootPos(root, neck);
        add(spine, new THREE.Vector3(0, np.y - 0.06, np.z - 0.01), (b) => collar(b, tier, P, cls));
      }
    }
    if (hips) {
      const hb = boneBox(glb, hips), hp = boneRootPos(root, hips);
      add(hips, new THREE.Vector3(0, hp.y + 0.04, (hb ? hb.max.z : 0.1) + 0.008), (b) => buckle(b, tier, P));
    }
    if (head && tier >= 2) {
      const hb = boneBox(glb, head);
      add(head, new THREE.Vector3(0, (hb ? hb.max.y : boneRootPos(root, head).y + 0.2) + (tier === 3 ? 0.07 : 0.05), hb ? (hb.min.z + hb.max.z) / 2 : 0), (b) => crown(b, tier, P));
    }
    for (const [fa, h] of [[faL, hL], [faR, hR]] as const) {
      if (!fa || !h) continue;
      const a = boneRootPos(root, fa), c = boneRootPos(root, h), at = a.clone().lerp(c, 0.62);
      const d = c.clone().sub(a).normalize();
      // kolun kalınlığı (yen/eldiven dahil): bilezik ona göre büyür
      const cl = cloud(glb, [fa], (v) => Math.abs(v.clone().sub(at).dot(d)) < 0.04);
      const rad = cl ? Math.min(0.09, Math.max(0.045, Math.max(cl.max.z - cl.min.z, cl.max.y - cl.min.y) * 0.55)) : 0.05;
      add(fa, at, (b) => bracer(b, tier, P, d, rad));
    }
    built.set(key, plan);
  }
  const out: THREE.Object3D[] = [];
  const q = new THREE.Quaternion();
  for (const p of plan) {
    const bone = findBone(root, new RegExp('^' + p.boneName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'));
    if (!bone) continue;
    const g = new THREE.Group(); g.name = 'gear-fx';
    for (const m of p.meshes) { const mesh = new THREE.Mesh(m.geo, mat(m.kind, tier)); mesh.name = 'armor'; g.add(mesh); }
    attachToBone(root, bone, g, q, p.at);
    out.push(g);
  }
  return out;
}
