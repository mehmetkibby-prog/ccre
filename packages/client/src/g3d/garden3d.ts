import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GARDEN_PLANTS, GARDEN_ROWS, GARDEN_COLS, TILE } from '@col/shared';
import { glowTexture } from './textures.ts';
import { U } from './terrain.ts';

/**
 * Şifa Bahçesi bitkileri (prosedürel, hafif): her sıra ayrı tür. Olgun bitki rüzgârda hafif sallanır ve üstünde
 * küçük bir ışıltı nabız gibi atar; toplanınca filize döner, yeniden olgunlaşınca büyüyerek açar.
 * 40 bitki toplu çizilir (InstancedMesh): tür başına parça sayısı kadar çizim çağrısı, toplam ~13; telefonda da hafif.
 */
const ROW_GLOW = ['#bfffe0', '#ff8a8a', '#ffd27a', '#d6b8ff'];

function colorGeo(g: THREE.BufferGeometry, top: THREE.Color, bottom: THREE.Color, h: number) {
  const p = g.attributes.position, c = new Float32Array(p.count * 3), t = new THREE.Color();
  for (let i = 0; i < p.count; i++) { t.copy(bottom).lerp(top, THREE.MathUtils.clamp(p.getY(i) / h, 0, 1)); c.set([t.r, t.g, t.b], i * 3); }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
  return g;
}
/** ince, uca doğru daralan, kavisli yaprak/ot şeridi (y yukarı) */
function blade(h: number, w: number, bend: number, seg = 5) {
  const g = new THREE.PlaneGeometry(w, h, 1, seg); g.translate(0, h / 2, 0);
  const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) { const y = p.getY(i), k = y / h; p.setX(i, p.getX(i) * (1 - k * 0.92)); p.setZ(i, bend * k * k); }
  g.computeVertexNormals(); return g;
}
/** tırtıklı yaprak (düz şekil, damarlı görünüm için kenarı dişli) */
function jagLeaf(len: number, wid: number) {
  const s = new THREE.Shape(); s.moveTo(0, 0);
  const n = 5;
  for (let i = 1; i <= n; i++) { const t = i / n, y = t * len, x = Math.sin(t * Math.PI) * wid * (i % 2 ? 1 : 0.62); s.lineTo(x, y - len * 0.08); s.lineTo(x * 0.7, y); }
  for (let i = n; i >= 1; i--) { const t = i / n, y = t * len, x = Math.sin(t * Math.PI) * wid * (i % 2 ? 1 : 0.62); s.lineTo(-x * 0.7, y); s.lineTo(-x, y - len * 0.08); }
  s.lineTo(0, 0);
  const g = new THREE.ShapeGeometry(s, 2); return g;
}
function petal(len: number, wid: number) {
  const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(wid, len * 0.45, 0, len); s.quadraticCurveTo(-wid, len * 0.45, 0, 0);
  return new THREE.ShapeGeometry(s, 6);
}
const place = (g: THREE.BufferGeometry, rx: number, ry: number, rz: number, x = 0, y = 0, z = 0) => { g.rotateX(rx); g.rotateZ(rz); g.rotateY(ry); g.translate(x, y, z); return g; };

interface Fly { s: THREE.Sprite; cx: number; cz: number; y: number; r: number; ph: number; sp: number }
interface PlantView { i: number; row: number; slot: number; x: number; y: number; z: number; ry: number; ripe: boolean; grow: number; seed: number }

export class GardenFx {
  group = new THREE.Group();
  private plants: PlantView[] = [];
  private mats: THREE.Material[] = [];
  private geos: THREE.BufferGeometry[] = [];
  private flies: Fly[] = [];
  /** tür (sıra) başına o türün parçaları (her parça bir InstancedMesh, sıradaki bitki sayısı kadar örnek) */
  private rowMeshes: THREE.InstancedMesh[][] = [];
  private sproutIM!: THREE.InstancedMesh;
  private glowPts!: THREE.Points;
  private readonly M = new THREE.Matrix4(); private readonly Q = new THREE.Quaternion(); private readonly E = new THREE.Euler();
  private readonly P = new THREE.Vector3(); private readonly S = new THREE.Vector3();

  constructor(heightAt: (x: number, y: number) => number) {
    this.group.name = 'garden';
    const leafM = new THREE.MeshStandardMaterial({ vertexColors: true, side: THREE.DoubleSide, roughness: 0.85 });
    const soilM = new THREE.MeshStandardMaterial({ color: '#4a3220', roughness: 1 });
    const glowM = (c: string, e: number) => new THREE.MeshStandardMaterial({ color: c, emissive: c, emissiveIntensity: e, side: THREE.DoubleSide, roughness: 0.6 });
    const whiteM = glowM('#f4fff0', 0.25), lifeM = new THREE.MeshStandardMaterial({ color: '#ffb02a', emissive: '#ff8a10', emissiveIntensity: 0.25, side: THREE.DoubleSide, roughness: 0.55 });
    const heartM = glowM('#ff2a3a', 0.9), starM = glowM('#a070ff', 0.45), starCoreM = glowM('#fff0ff', 0.8), bloodM = new THREE.MeshStandardMaterial({ color: '#b01828', emissive: '#400008', side: THREE.DoubleSide, roughness: 0.7 });
    this.mats.push(leafM, soilM, whiteM, lifeM, heartM, starM, starCoreM, bloodM);
    const G = (g: THREE.BufferGeometry) => { this.geos.push(g); return g; };
    const mound = G(new THREE.SphereGeometry(0.5, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2)); mound.scale(1, 0.3, 1);
    const sproutG = G(mergeGeometries([0, 1, 2].map((k) => colorGeo(place(blade(0.32, 0.12, 0.08), 0, (k / 3) * Math.PI * 2, 0.35), new THREE.Color('#9fe070'), new THREE.Color('#2f6a24'), 0.3)))!);
    const rnd = (s: number) => { const x = Math.sin(s * 127.1) * 43758.5; return x - Math.floor(x); };

    // tür başına bir "tam bitki" geometri seti (bitkiler arasında paylaşılır)
    const species: ((seed: number) => THREE.Object3D)[] = [
      // 0) Rüzgâr Otu: ince nane yeşili otlar, uçlarında beyaz çiçek kümeleri
      () => {
        const gs: THREE.BufferGeometry[] = [], fl: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 16; i++) {
          const a = (i / 16) * Math.PI * 2 + rnd(i) * 0.4, h = 0.75 + rnd(i + 3) * 0.45, tilt = 0.1 + rnd(i + 7) * 0.3;
          gs.push(colorGeo(place(blade(h, 0.07, 0.25 + rnd(i) * 0.2), tilt, a, 0, Math.cos(a) * 0.06, 0, Math.sin(a) * 0.06), new THREE.Color('#c8ffe0'), new THREE.Color('#3f8a5a'), h));
          if (i % 2 === 0) { const s = new THREE.IcosahedronGeometry(0.045, 0); s.translate(Math.cos(a) * (0.06 + h * Math.sin(tilt) * 0.9), h * 0.97, Math.sin(a) * (0.06 + h * Math.sin(tilt) * 0.9)); fl.push(s); }
        }
        const o = new THREE.Group(); o.add(new THREE.Mesh(G(mergeGeometries(gs)!), leafM), new THREE.Mesh(G(mergeGeometries(fl)!), whiteM)); return o;
      },
      // 1) Avcı Yaprağı: koyu sapların üstünde kızıl, tırtıklı yaprak rozeti
      () => {
        const gs: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 9; i++) {
          const a = (i / 9) * Math.PI * 2, up = 0.45 + (i % 3) * 0.25;
          gs.push(place(jagLeaf(0.55 + (i % 3) * 0.12, 0.17), -Math.PI / 2 + up, a, 0, Math.cos(a) * 0.05, 0.08 + (i % 3) * 0.12, Math.sin(a) * 0.05));
        }
        const stems = colorGeo(mergeGeometries([0, 1, 2].map((k) => place(new THREE.CylinderGeometry(0.012, 0.018, 0.4, 4).translate(0, 0.2, 0), 0.2, k * 2.1, 0)))!, new THREE.Color('#4a1a14'), new THREE.Color('#2a0a08'), 0.4);
        const o = new THREE.Group(); o.add(new THREE.Mesh(G(mergeGeometries(gs)!), bloodM), new THREE.Mesh(G(stems), leafM)); return o;
      },
      // 2) Hayat Çiçeği: geniş yaprakların ortasından yükselen altın çiçek, kırmızı parlayan kalp ortası
      () => {
        const lv: THREE.BufferGeometry[] = [], pt: THREE.BufferGeometry[] = [];
        for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; lv.push(colorGeo(place(petal(0.5, 0.2), -Math.PI / 2 + 0.55, a, 0, 0, 0.04, 0), new THREE.Color('#8fe070'), new THREE.Color('#2f7a2a'), 0.5)); }
        lv.push(colorGeo(new THREE.CylinderGeometry(0.018, 0.024, 0.62, 5).translate(0, 0.31, 0), new THREE.Color('#5aa040'), new THREE.Color('#2f6a24'), 0.62));
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; pt.push(place(petal(0.2, 0.09), -Math.PI / 2 + 0.35, a, 0, 0, 0.64, 0)); }
        const heart = new THREE.SphereGeometry(0.06, 10, 8); heart.translate(0, 0.67, 0);
        const o = new THREE.Group(); o.add(new THREE.Mesh(G(mergeGeometries(lv)!), leafM), new THREE.Mesh(G(mergeGeometries(pt)!), lifeM), new THREE.Mesh(G(heart), heartM)); return o;
      },
      // 3) Yıldız Menekşesi: ince saplar üstünde sivri mor yıldız çiçekleri
      () => {
        const st: THREE.BufferGeometry[] = [], pt: THREE.BufferGeometry[] = [], cs: THREE.BufferGeometry[] = [];
        const heads: [number, number, number][] = [[0, 0.62, 0], [0.16, 0.48, 0.08], [-0.13, 0.52, -0.1]];
        for (const [x, y, z] of heads) {
          const len = Math.hypot(x, y, z); const s = new THREE.CylinderGeometry(0.01, 0.014, len, 4).translate(0, len / 2, 0);
          s.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(x, y, z).normalize())); st.push(colorGeo(s, new THREE.Color('#6ab060'), new THREE.Color('#2f6a24'), y));
          for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; pt.push(place(petal(0.13, 0.035), -Math.PI / 2 + 0.15, a, 0, x, y, z)); }
          cs.push(new THREE.SphereGeometry(0.03, 8, 6).translate(x, y + 0.01, z));
        }
        for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; st.push(colorGeo(place(blade(0.3, 0.09, 0.12), 0.5, a, 0), new THREE.Color('#8ad070'), new THREE.Color('#2f6a24'), 0.3)); }
        const o = new THREE.Group(); o.add(new THREE.Mesh(G(mergeGeometries(st)!), leafM), new THREE.Mesh(G(mergeGeometries(pt)!), starM), new THREE.Mesh(G(mergeGeometries(cs)!), starCoreM)); return o;
      },
    ];
    const base = species.map((f) => f(0));
    // yükseltilmiş toprak yataklar: koyu toprak, tahta çerçeve; sıralar arasında taş basamaklı yol
    const plankM = new THREE.MeshStandardMaterial({ color: '#8a5a34', roughness: 0.9 }), bedM = new THREE.MeshStandardMaterial({ color: '#3e2a1a', roughness: 1 }), stoneM = new THREE.MeshStandardMaterial({ color: '#a8a296', roughness: 0.95 });
    this.mats.push(plankM, bedM, stoneM);
    const x0 = (GARDEN_COLS[0] - 1.1) * TILE, x1 = (GARDEN_COLS[GARDEN_COLS.length - 1] + 2.1) * TILE, len = (x1 - x0) * U, bw = 1.5;
    const bedG = G(new THREE.BoxGeometry(len, 0.16, bw)), longG = G(new THREE.BoxGeometry(len + 0.16, 0.24, 0.12)), endG = G(new THREE.BoxGeometry(0.12, 0.24, bw + 0.12));
    const stoneG = G(new THREE.CylinderGeometry(0.34, 0.38, 0.08, 7));
    for (const [ri, ty] of GARDEN_ROWS.entries()) {
      const cx = (x0 + x1) / 2, cy = (ty + 0.5) * TILE, y = heightAt(cx, cy);
      const bed = new THREE.Group(); bed.position.set(cx * U, y, cy * U);
      const soil = new THREE.Mesh(bedG, bedM); soil.position.y = 0.06; soil.receiveShadow = true; bed.add(soil);
      for (const s of [-1, 1]) { const pl = new THREE.Mesh(longG, plankM); pl.position.set(0, 0.08, s * (bw / 2 + 0.03)); pl.castShadow = pl.receiveShadow = true; bed.add(pl); const ed = new THREE.Mesh(endG, plankM); ed.position.set(s * (len / 2 + 0.03), 0.08, 0); bed.add(ed); }
      this.group.add(bed);
      // sıranın önünde basamak taşları
      if (ri < GARDEN_ROWS.length - 1) for (let k = 0, ns = Math.round(len / 1.6); k < ns; k++) {
        const sx = x0 + ((k + 0.5) / ns) * (x1 - x0), sy = (ty + 2) * TILE, st = new THREE.Mesh(stoneG, stoneM);
        st.position.set(sx * U, heightAt(sx, sy) + 0.01, sy * U); st.rotation.y = k * 1.7; st.receiveShadow = true; this.group.add(st);
      }
    }
    // yatakların boş aralarında küçük yeşillikler (tek instanced çizim)
    {
      const per = GARDEN_COLS.length * 3, n = GARDEN_ROWS.length * per, im = new THREE.InstancedMesh(sproutG, leafM, n), M = new THREE.Matrix4(), Q = new THREE.Quaternion(), S = new THREE.Vector3(), P = new THREE.Vector3();
      let k = 0;
      for (const ty of GARDEN_ROWS) for (let j = 0; j < per; j++) {
        const sx = x0 + ((j + 0.5) / per) * (x1 - x0) + (rnd(k + 300) - 0.5) * 30, sy = (ty + 0.5) * TILE + (rnd(k + 400) - 0.5) * 34;
        if (GARDEN_PLANTS.some((pl) => Math.hypot(pl.x - sx, pl.y - sy) < 34)) { S.setScalar(0.0001); } else S.setScalar(0.7 + rnd(k + 500) * 0.6);
        Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), rnd(k + 600) * 6.28); P.set(sx * U, heightAt(sx, sy) + 0.13, sy * U);
        M.compose(P, Q, S); im.setMatrixAt(k++, M);
      }
      im.instanceMatrix.needsUpdate = true; im.receiveShadow = true; this.group.add(im);
    }
    // kelebekler: küçük renkli parıltılar bahçe üstünde süzülür (çok hafif)
    const flyCols = ['#fff3a0', '#ffb0e0', '#a8e0ff', '#ffffff', '#c8ffb0'];
    const gx = ((x0 + x1) / 2) * U, gz = ((GARDEN_ROWS[0] + GARDEN_ROWS[GARDEN_ROWS.length - 1]) / 2 + 0.5) * TILE * U;
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: flyCols[i % flyCols.length], blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.85 }));
      s.scale.setScalar(0.22); this.mats.push(s.material); this.group.add(s);
      this.flies.push({ s, cx: gx + (rnd(i + 40) - 0.5) * len * 0.8, cz: gz + (rnd(i + 50) - 0.5) * 6, y: heightAt(gx / U, gz / U) + 0.8 + rnd(i + 60) * 0.7, r: 0.8 + rnd(i + 70) * 1.6, ph: rnd(i + 80) * 6.28, sp: 0.4 + rnd(i + 90) * 0.5 });
    }
    // bitkiler: tür başına parça parça InstancedMesh; tümseği ve filizi ortak birer InstancedMesh; ışıltılar tek nokta bulutu
    const N = GARDEN_PLANTS.length;
    for (const [row] of GARDEN_ROWS.entries()) {
      const cnt = GARDEN_PLANTS.filter((p) => p.row === row).length, parts: THREE.InstancedMesh[] = [];
      base[row].traverse((o) => {
        const mm = o as THREE.Mesh; if (!mm.isMesh) return;
        const im = new THREE.InstancedMesh(mm.geometry, mm.material as THREE.Material, cnt);
        im.castShadow = true; im.frustumCulled = false; im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        parts.push(im); this.group.add(im);
      });
      this.rowMeshes.push(parts);
    }
    const moundIM = new THREE.InstancedMesh(mound, soilM, N); moundIM.receiveShadow = true; moundIM.frustumCulled = false;
    this.sproutIM = new THREE.InstancedMesh(sproutG, leafM, N); this.sproutIM.frustumCulled = false; this.sproutIM.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const gPos = new Float32Array(N * 3), gCol = new Float32Array(N * 3);
    const slots = GARDEN_ROWS.map(() => 0);
    for (const pl of GARDEN_PLANTS) {
      const y = heightAt(pl.x, pl.y) + 0.12, ry = rnd(pl.i + 11) * Math.PI * 2;
      this.Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), ry); this.P.set(pl.x * U, y, pl.y * U);
      moundIM.setMatrixAt(pl.i, this.M.compose(this.P, this.Q, this.S.setScalar(1)));
      this.plants.push({ i: pl.i, row: pl.row, slot: slots[pl.row]++, x: pl.x * U, y, z: pl.y * U, ry, ripe: true, grow: 1, seed: rnd(pl.i + 5) * 10 });
      gPos.set([pl.x * U, y + 1, pl.y * U], pl.i * 3);
    }
    moundIM.instanceMatrix.needsUpdate = true; this.group.add(moundIM, this.sproutIM);
    const gg = G(new THREE.BufferGeometry());
    gg.setAttribute('position', new THREE.BufferAttribute(gPos, 3).setUsage(THREE.DynamicDrawUsage));
    gg.setAttribute('color', new THREE.BufferAttribute(gCol, 3).setUsage(THREE.DynamicDrawUsage));
    const gm = new THREE.PointsMaterial({ map: glowTexture(), size: 1.2, sizeAttenuation: true, vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false });
    this.mats.push(gm);
    this.glowPts = new THREE.Points(gg, gm); this.glowPts.frustumCulled = false; this.group.add(this.glowPts);
  }

  /** ready: bitki başına kalan olgunlaşma süresi (ms, at anında) */
  update(now: number, dt: number, garden: { ready: number[]; at: number } | null) {
    const t = now / 1000;
    const { M, Q, E, P, S } = this, zero = S.clone().setScalar(0);
    const gPos = this.glowPts.geometry.attributes.position as THREE.BufferAttribute, gCol = this.glowPts.geometry.attributes.color as THREE.BufferAttribute;
    const col = new THREE.Color();
    for (const p of this.plants) {
      const ripe = !garden || (garden.ready[p.i] ?? 0) - (now - garden.at) <= 0;
      if (ripe !== p.ripe) { p.ripe = ripe; p.grow = ripe ? 0 : 1; }
      if (ripe && p.grow < 1) p.grow = Math.min(1, p.grow + dt / 700);
      const e = 1 - Math.pow(1 - p.grow, 3);
      // olgun bitki: rüzgârda hafif salınım, büyüyerek açar; olgun değilse yerinde filiz
      E.set(Math.sin(t * 1.2 + p.seed * 1.7) * 0.035, p.ry, Math.sin(t * 1.6 + p.seed) * 0.05, 'YXZ'); Q.setFromEuler(E);
      P.set(p.x, p.y + 0.06, p.z);
      const sc = ripe ? (1.9 + (p.seed % 1) * 0.3) * (0.35 + 0.65 * e) : 0;
      M.compose(P, Q, S.setScalar(sc));
      for (const im of this.rowMeshes[p.row]) im.setMatrixAt(p.slot, M);
      Q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), p.ry);
      this.sproutIM.setMatrixAt(p.i, M.compose(P, Q, ripe ? zero : S.setScalar(1)));
      const k = ripe ? 0.18 + 0.22 * (0.5 + 0.5 * Math.sin(t * 2.2 + p.seed)) : 0;
      col.set(ROW_GLOW[p.row]).multiplyScalar(k); gCol.setXYZ(p.i, col.r, col.g, col.b);
      gPos.setY(p.i, p.y + 0.95 + p.row * 0.06 + Math.sin(t * 1.4 + p.seed) * 0.06);
    }
    for (const parts of this.rowMeshes) for (const im of parts) im.instanceMatrix.needsUpdate = true;
    this.sproutIM.instanceMatrix.needsUpdate = true; gPos.needsUpdate = true; gCol.needsUpdate = true;
    for (const f of this.flies) {
      const a = t * f.sp + f.ph;
      f.s.position.set(f.cx + Math.cos(a) * f.r, f.y + Math.sin(a * 2.3) * 0.25, f.cz + Math.sin(a * 1.3) * f.r * 0.6);
      (f.s.material as THREE.SpriteMaterial).opacity = 0.55 + 0.4 * Math.abs(Math.sin(t * 9 + f.ph)); // kanat çırpar gibi
    }
  }
  dispose() { this.mats.forEach((m) => m.dispose()); this.geos.forEach((g) => g.dispose()); }
}
