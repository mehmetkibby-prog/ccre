import * as THREE from 'three';
import { glowTexture } from './textures.ts';
import { U } from './terrain.ts';

/** 3B efektler. Konumlar sunucu birimindedir (x,y) + yükseklik metre (h). */
export interface FloatText { x: number; y: number; h: number; text: string; color: string; size: number; t0: number; dur: number; vx: number }
interface P3 { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; r: number; g: number; b: number; grav: number; drag: number }
export interface Projectile { x0: number; y0: number; tx: number; ty: number; tgt: number; t0: number; dur: number; kind: 'arrow' | 'orb' | 'ice'; color: string }
export interface Shape { kind: 'circle' | 'ring' | 'line' | 'blast' | 'slash' | 'pillar' | 'heal' | 'shield' | 'teleport'; x: number; y: number; r: number; r2: number; a: number; t0: number; dur: number; color: string; follow?: number }

const MAXP = 2000;
const tmpC = new THREE.Color();

export class Fx3D {
  texts: FloatText[] = [];
  projs: Projectile[] = [];
  shapes: Shape[] = [];
  private parts: P3[] = [];
  group = new THREE.Group();
  private points: THREE.Points;
  private pGeo: THREE.BufferGeometry;
  private shapeObjs = new Map<Shape, THREE.Object3D>();
  private projObjs = new Map<Projectile, THREE.Object3D>();
  lights: THREE.PointLight[] = [];
  heightAt: (x: number, y: number) => number = () => 0;
  posOf: (id: number) => { x: number; y: number } | null = () => null;

  constructor() {
    this.pGeo = new THREE.BufferGeometry();
    this.pGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(MAXP * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(MAXP * 4), 4).setUsage(THREE.DynamicDrawUsage));
    this.pGeo.setAttribute('size', new THREE.BufferAttribute(new Float32Array(MAXP), 1).setUsage(THREE.DynamicDrawUsage));
    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: glowTexture() }, uScale: { value: 600 } },
      vertexShader: `attribute float size; attribute vec4 color; varying vec4 vC; uniform float uScale;
        void main(){ vC = color; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = size * uScale / -mv.z; gl_Position = projectionMatrix * mv; }`,
      fragmentShader: `uniform sampler2D uTex; varying vec4 vC; void main(){ vec4 t = texture2D(uTex, gl_PointCoord); gl_FragColor = vec4(vC.rgb * t.a * vC.a, t.a * vC.a); }`,
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    });
    this.points = new THREE.Points(this.pGeo, mat);
    this.points.frustumCulled = false;
    this.group.add(this.points);
    for (let i = 0; i < 4; i++) { const l = new THREE.PointLight(0xffffff, 0, 9, 1.6); this.lights.push(l); this.group.add(l); }
  }

  setScale(px: number) { (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = px; }

  text(x: number, y: number, h: number, text: string, color: string, size = 18, dur = 900) {
    this.texts.push({ x, y, h, text, color, size, t0: performance.now(), dur, vx: (Math.random() - 0.5) * 30 });
    if (this.texts.length > 90) this.texts.shift();
  }
  /** Patlama parçacıkları. h: başlangıç yüksekliği (m). */
  burst(x: number, y: number, h: number, n: number, color: string, speed = 3, life = 700, size = 0.25, grav = -4) {
    tmpC.set(color);
    const gx = x * U, gz = y * U, gy = this.heightAt(x, y) + h;
    for (let i = 0; i < n && this.parts.length < MAXP; i++) {
      const a = Math.random() * Math.PI * 2, u = Math.random() * 2 - 1, s = speed * (0.3 + Math.random() * 0.7), q = Math.sqrt(1 - u * u);
      this.parts.push({ x: gx, y: gy, z: gz, vx: Math.cos(a) * q * s, vy: Math.abs(u) * s + speed * 0.3, vz: Math.sin(a) * q * s, life: life * (0.6 + Math.random() * 0.4), max: life, size: size * (0.6 + Math.random() * 0.8), r: tmpC.r, g: tmpC.g, b: tmpC.b, grav, drag: 1.5 });
    }
  }
  /** Tek parçacık (metre cinsinden dünya konumu). */
  spawn(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: string | THREE.Color, grav = 0, drag = 0) {
    if (this.parts.length >= MAXP) return;
    const c = typeof color === 'string' ? tmpC.set(color) : color;
    this.parts.push({ x, y, z, vx, vy, vz, life, max: life, size, r: c.r, g: c.g, b: c.b, grav, drag });
  }
  light(x: number, y: number, h: number, color: string, intensity: number, ms: number) {
    const l = this.lights.find((q) => q.intensity <= 0.01) ?? this.lights[0];
    l.color.set(color); l.intensity = intensity; l.position.set(x * U, this.heightAt(x, y) + h, y * U);
    (l.userData as any).decay = intensity / Math.max(50, ms);
  }

  update(dt: number, now: number) {
    const s = dt / 1000;
    for (const l of this.lights) if (l.intensity > 0) l.intensity = Math.max(0, l.intensity - ((l.userData as any).decay ?? 0.01) * dt);
    const pos = this.pGeo.attributes.position.array as Float32Array, col = this.pGeo.attributes.color.array as Float32Array, siz = this.pGeo.attributes.size.array as Float32Array;
    let n = 0;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) { this.parts[i] = this.parts[this.parts.length - 1]; this.parts.pop(); continue; }
      const d = Math.max(0, 1 - p.drag * s);
      p.vx *= d; p.vz *= d; p.vy = p.vy * d + p.grav * s;
      p.x += p.vx * s; p.y += p.vy * s; p.z += p.vz * s;
      const a = Math.min(1, (p.life / p.max) * 2);
      pos[n * 3] = p.x; pos[n * 3 + 1] = p.y; pos[n * 3 + 2] = p.z;
      col[n * 4] = p.r; col[n * 4 + 1] = p.g; col[n * 4 + 2] = p.b; col[n * 4 + 3] = a;
      siz[n] = p.size;
      n++;
    }
    this.pGeo.setDrawRange(0, n);
    this.pGeo.attributes.position.needsUpdate = true; this.pGeo.attributes.color.needsUpdate = true; this.pGeo.attributes.size.needsUpdate = true;
    this.texts = this.texts.filter((t) => now - t.t0 < t.dur);
    // şekiller
    for (const sh of this.shapes) {
      let o = this.shapeObjs.get(sh);
      if (!o) { o = this.makeShape(sh); this.shapeObjs.set(sh, o); this.group.add(o); }
      this.updateShape(sh, o, now);
    }
    for (const [sh, o] of this.shapeObjs) if (now - sh.t0 >= sh.dur) { this.group.remove(o); disposeObj(o); this.shapeObjs.delete(sh); }
    this.shapes = this.shapes.filter((sh) => now - sh.t0 < sh.dur);
    // mermiler
    for (const p of this.projs) {
      let o = this.projObjs.get(p);
      if (!o) { o = this.makeProj(p); this.projObjs.set(p, o); this.group.add(o); }
      const t = Math.min(1, (now - p.t0) / p.dur);
      const tp = this.posOf(p.tgt);
      const tx = tp ? tp.x : p.tx, ty = tp ? tp.y : p.ty;
      const x = p.x0 + (tx - p.x0) * t, y = p.y0 + (ty - p.y0) * t;
      const h = (p.kind === 'arrow' ? 1.35 : 1.5) + Math.sin(t * Math.PI) * (p.kind === 'arrow' ? 0.6 : 0.25) - t * 0.3;
      o.position.set(x * U, this.heightAt(x, y) + h, y * U);
      o.lookAt(tx * U, this.heightAt(tx, ty) + 1.0, ty * U);
      if (p.kind !== 'arrow') { tmpC.set(p.color); for (let k = 0; k < 2; k++) this.spawn(o.position.x, o.position.y, o.position.z, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, (Math.random() - 0.5) * 0.6, 380, 0.35, tmpC); }
      else if (Math.random() < 0.5) this.spawn(o.position.x, o.position.y, o.position.z, 0, 0, 0, 200, 0.12, '#ffffff');
    }
    for (const [p, o] of this.projObjs) if (now - p.t0 >= p.dur) { this.group.remove(o); disposeObj(o); this.projObjs.delete(p); }
    this.projs = this.projs.filter((p) => now - p.t0 < p.dur);
  }

  private groundY(x: number, y: number) { return this.heightAt(x, y) + 0.06; }

  private makeShape(sh: Shape): THREE.Object3D {
    const add = (blending: THREE.Blending, color: string, opacity: number) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, blending, side: THREE.DoubleSide });
    const g = new THREE.Group();
    const R = sh.r * U, R2 = sh.r2 * U;
    switch (sh.kind) {
      case 'circle': {
        const edge = new THREE.Mesh(new THREE.RingGeometry(R * 0.96, R, 48), add(THREE.NormalBlending, '#ff3040', 0.9));
        const fill = new THREE.Mesh(new THREE.CircleGeometry(R, 48), add(THREE.NormalBlending, '#ff2030', 0.18));
        const prog = new THREE.Mesh(new THREE.CircleGeometry(R, 48), add(THREE.NormalBlending, '#ff3040', 0.35)); prog.name = 'prog';
        g.add(fill, edge, prog); break;
      }
      case 'ring': {
        const fill = new THREE.Mesh(new THREE.RingGeometry(R2, R, 48), add(THREE.NormalBlending, '#ff2030', 0.22));
        const e1 = new THREE.Mesh(new THREE.RingGeometry(R * 0.97, R, 48), add(THREE.NormalBlending, '#ff3040', 0.9));
        const e2 = new THREE.Mesh(new THREE.RingGeometry(R2, R2 * 1.03 + 0.02, 48), add(THREE.NormalBlending, '#ff3040', 0.9));
        const prog = new THREE.Mesh(new THREE.RingGeometry(R2, R2 + 0.05, 48), add(THREE.NormalBlending, '#ff6060', 0.6)); prog.name = 'prog';
        g.add(fill, e1, e2, prog); break;
      }
      case 'line': {
        const len = R, w = R2 * 2;
        const plane = new THREE.PlaneGeometry(len, w); plane.translate(len / 2, 0, 0);
        const fill = new THREE.Mesh(plane, add(THREE.NormalBlending, '#ff2030', 0.22));
        const pg = new THREE.PlaneGeometry(len, w); pg.translate(len / 2, 0, 0);
        const prog = new THREE.Mesh(pg, add(THREE.NormalBlending, '#ff3040', 0.35)); prog.name = 'prog';
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(plane), new THREE.LineBasicMaterial({ color: '#ff4050' }));
        g.add(fill, prog, edges);
        g.userData.rotZ = -sh.a; break;
      }
      case 'blast': case 'heal': {
        const ring = new THREE.Mesh(new THREE.RingGeometry(0.7, 1, 48), add(THREE.AdditiveBlending, sh.kind === 'heal' ? '#7dffb0' : sh.color, 0.9)); ring.name = 'ring';
        const disc = new THREE.Mesh(new THREE.CircleGeometry(1, 48), add(THREE.AdditiveBlending, sh.kind === 'heal' ? '#7dffb0' : sh.color, 0.35)); disc.name = 'disc';
        g.add(ring, disc); break;
      }
      case 'slash': {
        // hilal kesik: ön kenar parlak, arkası söner; iç ve dış kenar yumuşak
        const geo = new THREE.RingGeometry(0.62, 1.36, 36, 4, -1.15, 2.3);
        const pa = geo.attributes.position, col = new Float32Array(pa.count * 3);
        for (let i = 0; i < pa.count; i++) {
          const x = pa.getX(i), y = pa.getY(i), th = Math.atan2(y, x), r = Math.hypot(x, y);
          const u = THREE.MathUtils.clamp((th + 1.15) / 2.3, 0, 1), v = THREE.MathUtils.clamp((r - 0.62) / 0.74, 0, 1);
          const k = Math.pow(u, 1.6) * Math.pow(Math.sin(v * Math.PI), 0.8) * (0.55 + 0.45 * v);
          col.set([k, k, k], i * 3);
        }
        geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
        const m = add(THREE.AdditiveBlending, sh.color, 1) as THREE.MeshBasicMaterial; m.vertexColors = true; m.side = THREE.DoubleSide;
        const arc = new THREE.Mesh(geo, m); arc.name = 'arc';
        g.add(arc); break;
      }
      case 'pillar': case 'teleport': {
        const geo = new THREE.CylinderGeometry(sh.kind === 'pillar' ? 0.7 : 0.55, sh.kind === 'pillar' ? 0.9 : 0.7, 6, 24, 1, true); geo.translate(0, 3, 0);
        const colors = new Float32Array(geo.attributes.position.count * 4);
        const c = new THREE.Color(sh.kind === 'pillar' ? '#ffd860' : '#7cf3ff');
        for (let i = 0; i < geo.attributes.position.count; i++) { const y = geo.attributes.position.getY(i); colors.set([c.r, c.g, c.b, 1 - y / 6], i * 4); }
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 4));
        const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        m.name = 'pillar'; g.add(m); break;
      }
      case 'shield': {
        const m = new THREE.Mesh(new THREE.SphereGeometry(1.0, 24, 16), new THREE.MeshStandardMaterial({ color: '#9fd8ff', emissive: '#4a90d0', emissiveIntensity: 0.6, transparent: true, opacity: 0.22, depthWrite: false, roughness: 0.1 }));
        m.scale.set(0.75, 1.1, 0.75); m.position.y = 1.0; g.add(m); break;
      }
    }
    return g;
  }

  private updateShape(sh: Shape, o: THREE.Object3D, now: number) {
    const t = Math.min(1, (now - sh.t0) / sh.dur);
    let x = sh.x, y = sh.y;
    if (sh.follow) { const p = this.posOf(sh.follow); if (p) { x = p.x; y = p.y; } }
    o.position.set(x * U, this.groundY(x, y), y * U);
    const flat = (q: THREE.Object3D) => { q.rotation.x = -Math.PI / 2; };
    switch (sh.kind) {
      case 'circle': case 'ring': case 'line': {
        o.children.forEach(flat);
        if (sh.kind === 'line') o.children.forEach((c) => (c.rotation.z = o.userData.rotZ));
        const prog = o.getObjectByName('prog')!;
        if (sh.kind === 'circle') prog.scale.setScalar(Math.max(0.01, t));
        else if (sh.kind === 'ring') { const R = sh.r * U, R2 = sh.r2 * U; const r = R2 + (R - R2) * t; prog.scale.setScalar(r / Math.max(0.01, R2)); }
        else prog.scale.x = Math.max(0.01, t);
        const pulse = 0.85 + Math.sin(now / 80) * 0.15;
        o.children.forEach((c) => { const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial; if (m && c.name !== 'prog') m.opacity = (m.userData.base ??= m.opacity) * pulse; });
        break;
      }
      case 'blast': case 'heal': {
        const R = sh.r * U * (0.3 + t * 0.9);
        const ring = o.getObjectByName('ring')!, disc = o.getObjectByName('disc')!;
        flat(ring); flat(disc);
        ring.scale.setScalar(R); disc.scale.setScalar(R);
        ((ring as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.9;
        ((disc as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = (1 - t) * 0.35;
        break;
      }
      case 'slash': {
        const arc = o.getObjectByName('arc')!;
        o.position.y += 1.1;
        const e = 1 - Math.pow(1 - Math.min(1, t * 1.6), 3); // hızlı savruluş, yavaş sönüş
        if (sh.r2 === 2) {
          // tepeden iniş: hedef yönünü içeren dikey düzlemde yukarıdan aşağı
          arc.rotation.set(0, -sh.a, 1.5 - e * 2.3);
          o.position.y += 0.15;
        } else if (sh.r2 === 1) {
          // ters kesik: soldan sağa yükselen çapraz
          arc.rotation.set(-Math.PI / 2 + 0.75, 0, -sh.a + Math.PI / 2 - (e - 0.5) * 2.2);
          arc.scale.x = -1;
        } else {
          // yatay kesik: sağdan sola
          arc.rotation.set(-Math.PI / 2 + 0.25, 0, -sh.a + Math.PI / 2 + (e - 0.5) * 2.2);
        }
        ((arc as THREE.Mesh).material as THREE.MeshBasicMaterial).opacity = Math.pow(1 - t, 1.4);
        const sc = (sh.r / 46) * (0.92 + t * 0.25);
        arc.scale.set(sh.r2 === 1 ? -sc : sc, sc, sc);
        break;
      }
      case 'pillar': case 'teleport': {
        const m = o.getObjectByName('pillar') as THREE.Mesh;
        (m.material as THREE.MeshBasicMaterial).opacity = Math.sin(t * Math.PI);
        m.scale.set(1 - t * 0.3, 0.6 + t * 0.6, 1 - t * 0.3);
        m.rotation.y = now / 400;
        break;
      }
      case 'shield': {
        const m = o.children[0] as THREE.Mesh;
        (m.material as THREE.MeshStandardMaterial).opacity = 0.22 * (t > 0.85 ? (1 - t) / 0.15 : 1) + Math.sin(now / 120) * 0.04;
        break;
      }
    }
  }

  private makeProj(p: Projectile): THREE.Object3D {
    const g = new THREE.Group();
    if (p.kind === 'arrow') {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.75, 5), new THREE.MeshStandardMaterial({ color: 0x6a4426 }));
      shaft.rotation.x = Math.PI / 2;
      const head = new THREE.Mesh(new THREE.ConeGeometry(0.03, 0.1, 4), new THREE.MeshStandardMaterial({ color: 0xd0d8e0, metalness: 0.9, roughness: 0.3 }));
      head.rotation.x = Math.PI / 2; head.position.z = 0.42;
      const fl = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.005, 0.12), new THREE.MeshStandardMaterial({ color: 0xe0d8c8 }));
      fl.position.z = -0.32;
      g.add(shaft, head, fl);
    } else {
      const c = new THREE.Color(p.color);
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), new THREE.MeshStandardMaterial({ color: 0, emissive: c, emissiveIntensity: 3 }));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: c, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
      halo.scale.setScalar(1.1);
      g.add(core, halo);
    }
    return g;
  }
}

function disposeObj(o: THREE.Object3D) {
  o.traverse((c) => {
    const m = c as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material as THREE.Material | THREE.Material[] | undefined;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose();
  });
}
