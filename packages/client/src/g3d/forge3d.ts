import * as THREE from 'three';
import { TUNING, FORGE_SLOTS, FORGE_FLOORS, FORGE_W, FORGE_H, MOLD_SYMBOLS, forgeRoom, TILE, type MapLayout } from '@col/shared';
import { U } from './terrain.ts';
import { glowTexture } from './textures.ts';
import { shared } from './materials.ts';
import type { ForgeView } from '../game/store.ts';

/**
 * Kor Kulesi 3B öğeleri: odaların altında akan lav denizi, her odanın kapısı (kara demir kemer + kor portal),
 * lav yarıkları (dalgaların çıktığı yerler), kalıp taşları ve açılan semboller, köz ve örsün parıltısı.
 * Kapı/taş/köz durumu yalnız oyuncunun kendi koşusuna göre çizilir (başka grupların odaları sönük kalır).
 */
const textSprite = (text: string, color = '#ffd8a0', size = 64, font = 'Georgia, serif') => {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const x = c.getContext('2d')!;
  x.font = `800 ${size}px ${font}`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 10; x.strokeStyle = 'rgba(20,6,2,.9)'; x.strokeText(text, 256, 66);
  x.fillStyle = color; x.fillText(text, 256, 66);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, fog: false }));
  sp.scale.set(4, 1, 1); sp.renderOrder = 5;
  return sp;
};
/** Kalıp sembolü dokusu (bir kez çizilir) */
const glyphTex = new Map<number, THREE.Texture>();
function glyph(i: number) {
  let t = glyphTex.get(i);
  if (t) return t;
  const s = MOLD_SYMBOLS[i], c = document.createElement('canvas'); c.width = c.height = 128;
  const x = c.getContext('2d')!;
  const g = x.createRadialGradient(64, 64, 6, 64, 64, 62); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  x.fillStyle = g; x.fillRect(0, 0, 128, 128);
  x.font = '800 84px "Segoe UI Symbol", "Noto Sans Symbols 2", "DejaVu Sans", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.lineWidth = 8; x.strokeStyle = 'rgba(20,6,2,.85)'; x.strokeText(s.glyph, 64, 70);
  x.fillStyle = s.color; x.fillText(s.glyph, 64, 70);
  t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  glyphTex.set(i, t);
  return t;
}

const LAVA_VERT = /* glsl */ `
varying vec2 vUv; varying vec3 vW;
void main() { vUv = uv; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }`;
const LAVA_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv; varying vec3 vW;
float h(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float n(vec2 p) { vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f); return mix(mix(h(i), h(i + vec2(1, 0)), f.x), mix(h(i + vec2(0, 1)), h(i + vec2(1, 1)), f.x), f.y); }
float fbm(vec2 p) { float v = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { v += a * n(p); p *= 2.03; a *= 0.5; } return v; }
void main() {
  vec2 p = vW.xz * 0.12;
  float t = uTime * 0.05;
  float a = fbm(p + vec2(t, -t * 0.7));
  float b = fbm(p * 1.7 - vec2(t * 1.3, t) + a * 2.0);
  float crust = smoothstep(0.38, 0.56, b);
  vec3 hot = mix(vec3(0.85, 0.22, 0.03), vec3(1.0, 0.62, 0.18), smoothstep(0.5, 0.05, b));
  vec3 cold = vec3(0.08, 0.03, 0.02);
  vec3 col = mix(hot * (0.95 + 0.25 * sin(uTime * 1.3 + a * 6.0)), cold, crust);
  gl_FragColor = vec4(col, 1.0);
}`;

interface Gate { slot: number; f: number; portal: THREE.Mesh; mat: THREE.MeshBasicMaterial; glow: THREE.Sprite }
interface Plate { slot: number; f: number; i: number; ring: THREE.Mesh; rmat: THREE.MeshBasicMaterial; sym: THREE.Sprite; shown: number }

export class ForgeFx {
  group = new THREE.Group();
  private gates: Gate[] = [];
  private plates: Plate[] = [];
  private ironMat = new THREE.MeshStandardMaterial({ color: 0x2a2220, roughness: 0.6, metalness: 0.6 });
  private stoneMat = new THREE.MeshStandardMaterial({ color: 0x3a302c, roughness: 0.9 });
  private lavaMat: THREE.ShaderMaterial;
  private ember: THREE.Group;
  private emberCore: THREE.Sprite;
  private anvilGlow: THREE.Sprite;
  private anvilRing: THREE.Mesh;
  private riftMat: THREE.MeshBasicMaterial;

  constructor(l: MapLayout, private heightAt: (x: number, y: number) => number) {
    void l;
    // odaların altında lav denizi (uçurum boşluklarından görünür)
    this.lavaMat = new THREE.ShaderMaterial({ uniforms: { uTime: shared.time }, vertexShader: LAVA_VERT, fragmentShader: LAVA_FRAG, fog: false });
    const lava = new THREE.Mesh(new THREE.PlaneGeometry(FORGE_W * TILE * U + 80, FORGE_H * TILE * U + 80).rotateX(-Math.PI / 2), this.lavaMat);
    lava.position.set((FORGE_W * TILE * U) / 2, -6.5, (FORGE_H * TILE * U) / 2);
    this.group.add(lava);
    const pillarG = new THREE.BoxGeometry(0.8, 4.4, 0.8);
    const lintelG = new THREE.BoxGeometry(5, 0.8, 1);
    const hornG = new THREE.ConeGeometry(0.35, 1.2, 6);
    const portalG = new THREE.CircleGeometry(1.55, 32);
    const plateG = new THREE.CylinderGeometry(0.95, 1.1, 0.22, 6);
    const ringG = new THREE.RingGeometry(0.6, 0.84, 6); ringG.rotateX(-Math.PI / 2);
    const riftG = new THREE.PlaneGeometry(2.4, 0.7).rotateX(-Math.PI / 2);
    this.riftMat = new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xff5a10, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.8, fog: false });
    for (let slot = 0; slot < FORGE_SLOTS; slot++) for (let f = 1; f <= FORGE_FLOORS; f++) {
      const room = forgeRoom(slot, f);
      const gx = room.gate.x * U, gz = room.gate.y * U, gy = this.heightAt(room.gate.x, room.gate.y);
      const arch = new THREE.Group(); arch.position.set(gx, gy, gz - 0.4);
      for (const s of [-1, 1]) {
        const p = new THREE.Mesh(pillarG, this.ironMat); p.position.set(s * 2.1, 2.2, 0); p.castShadow = true; arch.add(p);
        const hn = new THREE.Mesh(hornG, this.ironMat); hn.position.set(s * 2.4, 5.3, 0); hn.rotation.z = -s * 0.5; arch.add(hn);
      }
      const lt = new THREE.Mesh(lintelG, this.ironMat); lt.position.set(0, 4.6, 0); lt.castShadow = true; arch.add(lt);
      const mat = new THREE.MeshBasicMaterial({ color: 0x501008, transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
      const portal = new THREE.Mesh(portalG, mat); portal.position.set(0, 2.1, 0); portal.scale.set(1.05, 1.3, 1); arch.add(portal);
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff4010, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.4, fog: false }));
      glow.scale.set(6, 6, 1); glow.position.set(0, 2.1, 0.2); arch.add(glow);
      const label = textSprite(f === FORGE_FLOORS ? 'ZİRVE' : `${f}. KAT`, f === FORGE_FLOORS ? '#ffb070' : '#ffe0b0', 70);
      label.position.set(0, 6.1, 0); arch.add(label);
      this.group.add(arch);
      this.gates.push({ slot, f, portal, mat, glow });
      // lav yarıkları: dalgaların çıktığı kızıl çatlaklar
      for (const r of room.rifts) {
        const m = new THREE.Mesh(riftG, this.riftMat);
        m.position.set(r.x * U, this.heightAt(r.x, r.y) + 0.05, r.y * U);
        m.rotation.y = Math.atan2(r.x - room.cx, r.y - room.cy) + Math.PI / 2;
        this.group.add(m);
      }
      // kalıp taşları (döküm kalıbı bulmacası olan katlarda)
      if (f < FORGE_FLOORS && TUNING.forge.floors[f - 1]?.puzzle === 'mold') {
        const n = TUNING.forge.moldPairs * 2;
        for (let i = 0; i < n; i++) {
          const pp = room.plates[i];
          const g = new THREE.Group(); g.position.set(pp.x * U, this.heightAt(pp.x, pp.y), pp.y * U);
          const b = new THREE.Mesh(plateG, this.stoneMat); b.position.y = 0.08; b.receiveShadow = true; g.add(b);
          const rmat = new THREE.MeshBasicMaterial({ color: 0xff8a3a, transparent: true, opacity: 0.4, depthWrite: false, blending: THREE.AdditiveBlending, fog: false, side: THREE.DoubleSide });
          const ring = new THREE.Mesh(ringG, rmat); ring.position.y = 0.21; g.add(ring);
          const sym = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, fog: false }));
          sym.scale.setScalar(1.5); sym.position.y = 1.5; sym.visible = false; sym.renderOrder = 6; g.add(sym);
          this.group.add(g);
          this.plates.push({ slot, f, i, ring, rmat, sym, shown: -2 });
        }
      }
    }
    // köz (tek: oyuncunun koşusundaki) ve örs parıltısı
    this.ember = new THREE.Group(); this.ember.visible = false;
    this.emberCore = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, fog: false }));
    this.emberCore.scale.setScalar(1.3); this.ember.add(this.emberCore);
    const coal = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28), new THREE.MeshBasicMaterial({ color: 0xff6a20 }));
    this.ember.add(coal);
    this.group.add(this.ember);
    this.anvilGlow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: 0xff7020, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false }));
    this.anvilGlow.scale.set(4, 3, 1); this.anvilGlow.visible = false; this.group.add(this.anvilGlow);
    this.anvilRing = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.7, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffb040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0.6, fog: false, side: THREE.DoubleSide }));
    this.anvilRing.visible = false; this.group.add(this.anvilRing);
  }

  /** Her kare: kendi koşusunun kapısı, kalıpları, közü. posOf: varlık kimliğinden dünya konumu (taşıyıcı). */
  update(now: number, f: ForgeView | null, posOf: (id: number) => THREE.Vector3 | null) {
    const tt = now / 1000;
    for (const g of this.gates) {
      const mine = !!f && f.slot === g.slot && f.f === g.f;
      const open = mine && f!.stage === 'done';
      g.mat.color.setHex(open ? 0xffc060 : mine ? 0x701808 : 0x2a0a04);
      (g.glow.material as THREE.SpriteMaterial).color.setHex(open ? 0xffd080 : 0xff4010);
      g.mat.opacity = open ? 0.85 + Math.sin(tt * 4) * 0.1 : mine ? 0.45 + Math.sin(tt * 1.5) * 0.08 : 0.25;
      (g.glow.material as THREE.SpriteMaterial).opacity = open ? 0.85 + Math.sin(tt * 3) * 0.12 : mine ? 0.35 : 0.12;
      g.portal.rotation.z = tt * (open ? 1.6 : 0.3);
    }
    this.riftMat.opacity = 0.65 + Math.sin(tt * 2.2) * 0.2;
    const mold = f && f.stage === 'puzzle' && !f.pending ? f.mold : undefined;
    for (const p of this.plates) {
      const mine = !!mold && f!.slot === p.slot && f!.f === p.f;
      const s = mine ? mold!.show[p.i] ?? -1 : -1;
      const found = mine && ((mold!.found >> p.i) & 1) === 1;
      if (s !== p.shown) {
        p.shown = s;
        p.sym.visible = s >= 0;
        if (s >= 0) { (p.sym.material as THREE.SpriteMaterial).map = glyph(s); (p.sym.material as THREE.SpriteMaterial).needsUpdate = true; p.rmat.color.set(MOLD_SYMBOLS[s].color); }
        else p.rmat.color.setHex(0xff8a3a);
      }
      p.rmat.opacity = !mine ? 0.12 : found ? 0.95 : s >= 0 ? 0.8 : 0.4 + Math.sin(tt * 2 + p.i) * 0.12;
      p.sym.position.y = 1.5 + Math.sin(tt * 2.4 + p.i) * 0.1;
      p.ring.rotation.y = tt * (found ? 1.5 : 0.4);
    }
    // köz: yerde zıplar ya da taşıyanın başının üstünde yanar; örs hedef halkası
    const em = f && f.stage === 'puzzle' && !f.pending ? f.ember : undefined;
    if (em && f) {
      const room = forgeRoom(f.slot, f.f);
      const ax = room.anvil.x * U, az = room.anvil.y * U, ay = this.heightAt(room.anvil.x, room.anvil.y);
      this.anvilRing.visible = this.anvilGlow.visible = true;
      this.anvilRing.position.set(ax, ay + 0.08, az); this.anvilRing.rotation.y = tt * 0.8;
      this.anvilRing.scale.setScalar(1 + Math.sin(tt * 4) * 0.06 + (em.carrier ? 0.15 : 0));
      this.anvilGlow.position.set(ax, ay + 1.2, az);
      (this.anvilGlow.material as THREE.SpriteMaterial).opacity = 0.25 + (em.done / Math.max(1, em.need)) * 0.6;
      let at: THREE.Vector3 | null = null;
      if (em.carrier) { const p = posOf(em.carrier); if (p) at = p.clone().add(new THREE.Vector3(0, 2.7, 0)); }
      else if (em.spot >= 0) { const sp = room.emberSpots[em.spot]; at = new THREE.Vector3(sp.x * U, this.heightAt(sp.x, sp.y) + 0.45 + Math.abs(Math.sin(tt * 3)) * 0.35, sp.y * U); }
      this.ember.visible = !!at;
      if (at) {
        this.ember.position.copy(at);
        const left = Math.max(0, em.cool - (performance.now() - f.at));
        const cool = em.carrier ? Math.max(0.25, left / (TUNING.forge.emberSec * 1000)) : 1;
        this.emberCore.scale.setScalar((1.1 + Math.sin(tt * 9) * 0.15) * (0.6 + cool * 0.6));
        (this.emberCore.material as THREE.SpriteMaterial).color.setRGB(1, 0.35 + cool * 0.35, 0.1 * cool);
      }
    } else { this.ember.visible = false; this.anvilRing.visible = this.anvilGlow.visible = false; }
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry) m.geometry.dispose(); });
    this.ironMat.dispose(); this.stoneMat.dispose(); this.lavaMat.dispose(); this.riftMat.dispose();
  }
}
