import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { Kind, Anim, EFlag, MONSTERS, CLASS_IDS, TILE, type MapLayout } from '@col/shared';
import type { Game, CEnt } from '../game/game.ts';
import { RAR_COLORS } from '../game/game.ts';
import { Terrain, U } from './terrain.ts';
import { buildProps } from './props3d.ts';
import { createHumanoid, animateHumanoid, LOOKS, type Rig, type HState } from './humanoid.ts';
import { createMonster, type MonsterRig } from './monsters3d.ts';
import { Fx3D } from './fx3d.ts';
import { shared, mat as sharedMat } from './materials.ts';
import { iconUrl } from '../game/art/icons.ts';
import { glowTexture } from './textures.ts';
import { store } from '../game/store.ts';

const STATE: HState[] = ['idle', 'walk', 'attack', 'hurt', 'dead', 'cast'];
const CLASS_COLORS = ['#a8c8ff', '#a8ff98', '#dcb8ff'];
const THEME = {
  village: { fog: 0xb8c8a8, sky: 0xcfe0f0, ground: 0x6a6040, sun: 0xfff0d8, sunI: 2.6, hemi: 0.75, exp: 1.0 },
  forest: { fog: 0x8aa088, sky: 0xbfd8e0, ground: 0x4a5030, sun: 0xffe8c0, sunI: 2.4, hemi: 0.7, exp: 1.0 },
  lake: { fog: 0xa8c8d0, sky: 0xd0e8f8, ground: 0x5a6040, sun: 0xfff0d8, sunI: 2.6, hemi: 0.75, exp: 1.0 },
  frozen: { fog: 0xc8d8e8, sky: 0xe0ecf8, ground: 0x8a9aa8, sun: 0xe8f0ff, sunI: 2.2, hemi: 0.9, exp: 0.95 },
  black: { fog: 0x2a2030, sky: 0x4a3a5a, ground: 0x201820, sun: 0xffb090, sunI: 1.6, hemi: 0.45, exp: 1.1 },
  ancient: { fog: 0x8a8a6a, sky: 0xc8c8a8, ground: 0x4a4a30, sun: 0xffe0b0, sunI: 2.3, hemi: 0.7, exp: 1.0 },
} as const;

interface View { kind: number; obj: THREE.Object3D; rig?: Rig; mon?: MonsterRig; height: number; phase: number; lx: number; ly: number; yaw: number; state: HState; stateAt: number; deadAt: number; sprite?: THREE.Sprite; beam?: THREE.Mesh }

export class Renderer3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(30, 1, 0.5, 260);
  composer: EffectComposer | null = null;
  bloom: UnrealBloomPass | null = null;
  sun = new THREE.DirectionalLight(0xffffff, 2.5);
  hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.7);
  terrain: Terrain | null = null;
  world = new THREE.Group();
  dyn = new THREE.Group();
  views = new Map<number, View>();
  npcViews: View[] = [];
  self: View | null = null;
  selfCls = '';
  fx = new Fx3D();
  layout!: MapLayout;
  w = 1; h = 1; dpr = 1;
  octx: CanvasRenderingContext2D;
  shakeAmt = 0;
  clicks: { x: number; y: number; t: number }[] = [];
  ringMesh: THREE.Mesh;
  selfRing: THREE.Mesh;
  grass: THREE.InstancedMesh | null = null;
  grassAt = { x: -1e9, y: -1e9 };
  quality = '';
  camTarget = new THREE.Vector3();
  private tmpV = new THREE.Vector3();
  private iconTex = new Map<string, THREE.Texture>();

  constructor(private g: Game, public canvas: HTMLCanvasElement, public overlay: HTMLCanvasElement) {
    const q = store.get().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.shadowMap.enabled = q !== 'low';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.octx = overlay.getContext('2d')!;
    this.scene.add(this.world, this.dyn, this.fx.group, this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(q === 'high' ? 2048 : 1024, q === 'high' ? 2048 : 1024);
    const sc = this.sun.shadow.camera; sc.left = -22; sc.right = 22; sc.top = 22; sc.bottom = -22; sc.near = 1; sc.far = 90;
    this.sun.shadow.bias = -0.0004; this.sun.shadow.normalBias = 0.03;
    // ortam yansıması (metal zırh için)
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    const sky = new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), new THREE.ShaderMaterial({
      side: THREE.BackSide, uniforms: {},
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.0); }',
      fragmentShader: 'varying vec3 vP; void main(){ float h = normalize(vP).y; vec3 top=vec3(0.45,0.62,0.85), hor=vec3(1.0,0.92,0.78), gr=vec3(0.28,0.24,0.18); vec3 c = h>0.0 ? mix(hor, top, pow(h,0.6)) : mix(hor, gr, pow(-h,0.4)); gl_FragColor=vec4(c*1.2,1.0); }',
    }));
    envScene.add(sky);
    this.scene.environment = pm.fromScene(envScene, 0.04).texture;
    this.scene.environmentIntensity = 0.55;
    // hedef halkası
    const rm = new THREE.MeshBasicMaterial({ color: 0xff5050, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide });
    this.ringMesh = new THREE.Mesh(new THREE.RingGeometry(0.62, 0.72, 40), rm); this.ringMesh.rotation.x = -Math.PI / 2; this.ringMesh.visible = false;
    this.selfRing = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.56, 40), new THREE.MeshBasicMaterial({ color: 0xfff0b0, transparent: true, opacity: 0.4, depthWrite: false }));
    this.selfRing.rotation.x = -Math.PI / 2;
    this.dyn.add(this.ringMesh, this.selfRing);
    this.fx.posOf = (id) => (id === this.g.selfId ? { x: this.g.dx, y: this.g.dy } : this.g.ents.get(id) ?? null);
    this.fx.heightAt = (x, y) => this.heightAt(x, y);
    this.setupComposer();
  }

  private setupComposer() {
    const q = store.get().settings.quality;
    this.quality = q;
    if (q === 'low') { this.composer = null; return; }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (q === 'high') {
      const ao = new GTAOPass(this.scene, this.camera, 512, 512);
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.blendIntensity = 0.85;
      this.composer.addPass(ao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.5, 0.45, 0.88);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  heightAt(x: number, y: number) { return this.terrain ? this.terrain.heightAt(x, y) : 0; }

  setLayout(l: MapLayout) {
    this.layout = l;
    // eski dünyayı temizle
    if (this.terrain) { this.world.remove(this.terrain.mesh); if (this.terrain.water) this.world.remove(this.terrain.water); this.terrain.dispose(); }
    for (const c of [...this.world.children]) { this.world.remove(c); }
    for (const v of this.views.values()) this.dyn.remove(v.obj);
    this.views.clear();
    for (const v of this.npcViews) this.dyn.remove(v.obj);
    this.npcViews = [];
    if (this.grass) { this.dyn.remove(this.grass); this.grass = null; }
    this.grassAt = { x: -1e9, y: -1e9 };
    const t0 = performance.now();
    this.terrain = new Terrain(l);
    this.world.add(this.terrain.mesh);
    if (this.terrain.water) this.world.add(this.terrain.water);
    const q = store.get().settings.quality;
    this.world.add(buildProps(l.props, (x, y) => this.heightAt(x, y), q));
    // NPC'ler
    for (const n of l.npcs) {
      const def = l.def.npcs.find((d) => d.id === n.id);
      const rig = createHumanoid(LOOKS[def?.art ?? 'merchant'] ?? LOOKS.merchant);
      rig.root.position.set(n.x * U, this.heightAt(n.x, n.y), n.y * U);
      this.dyn.add(rig.root);
      this.npcViews.push({ kind: 99, obj: rig.root, rig, height: 2.0, phase: 0, lx: n.x, ly: n.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, ...({ npc: n.id } as object) });
    }
    // tema ışığı
    const th = THEME[l.def.theme as keyof typeof THEME] ?? THEME.forest;
    this.scene.fog = new THREE.Fog(th.fog, 34, 92);
    this.scene.background = new THREE.Color(th.fog);
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.hemi.color.set(th.sky); this.hemi.groundColor.set(th.ground); this.hemi.intensity = th.hemi;
    this.renderer.toneMappingExposure = th.exp;
    // kendi karakterini yeniden ekle
    if (this.self) this.dyn.add(this.self.obj);
    console.debug('[3d] harita kuruldu', l.def.id, Math.round(performance.now() - t0), 'ms');
  }

  shake(n: number) { this.shakeAmt = Math.max(this.shakeAmt, n * 0.02); }
  clickMark(x: number, y: number) { this.clicks.push({ x, y, t: performance.now() }); }

  resize() {
    const q = store.get().settings.quality;
    if (q !== this.quality) { this.setupComposer(); this.renderer.shadowMap.enabled = q !== 'low'; }
    const maxDpr = q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1;
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w !== this.w || h !== this.h || dpr !== this.dpr) {
      this.w = w; this.h = h; this.dpr = dpr;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.composer?.setPixelRatio(dpr);
      this.composer?.setSize(w, h);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      const odpr = Math.min(window.devicePixelRatio || 1, 2);
      this.overlay.width = Math.round(w * odpr); this.overlay.height = Math.round(h * odpr);
      this.octx.setTransform(odpr, 0, 0, odpr, 0, 0);
      this.fx.setScale(h * dpr * 0.9);
    }
  }

  // ───────── görünüm yönetimi ─────────
  private ensureSelf() {
    const cls = this.g.cls;
    if (this.self && this.selfCls === cls) return this.self;
    if (this.self) this.dyn.remove(this.self.obj);
    const rig = createHumanoid(LOOKS[cls]);
    this.self = { kind: Kind.PLAYER, obj: rig.root, rig, height: 2.0, phase: 0, lx: this.g.dx, ly: this.g.dy, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
    this.selfCls = cls;
    this.dyn.add(rig.root);
    return this.self;
  }

  private viewFor(e: CEnt): View | null {
    let v = this.views.get(e.id);
    if (v) return v;
    if (e.kind === Kind.PLAYER) {
      const rig = createHumanoid(LOOKS[CLASS_IDS[e.cls] ?? 'guardian']);
      v = { kind: e.kind, obj: rig.root, rig, height: 2.0, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
    } else if (e.kind === Kind.MONSTER) {
      const def = MONSTERS[e.tpl];
      if (!def) return null;
      const mon = createMonster(def.art, e.variant, def.size);
      v = { kind: e.kind, obj: mon.root, mon, height: mon.height, phase: Math.random() * 6, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
    } else if (e.kind === Kind.LOOT) {
      const grp = new THREE.Group();
      const tex = this.lootTex(e.icon, e.rarity);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
      sp.scale.setScalar(0.62); sp.position.y = 0.5;
      grp.add(sp);
      const col = new THREE.Color(RAR_COLORS[e.rarity] ?? '#ffffff');
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), color: col, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0.7 }));
      glow.scale.set(1.2, 0.5, 1); glow.position.y = 0.08; grp.add(glow);
      let beam: THREE.Mesh | undefined;
      if (e.rarity >= 2) {
        const bg = new THREE.CylinderGeometry(0.12, 0.2, 4, 12, 1, true); bg.translate(0, 2, 0);
        const cols = new Float32Array(bg.attributes.position.count * 4);
        for (let i = 0; i < bg.attributes.position.count; i++) { const y = bg.attributes.position.getY(i); cols.set([col.r, col.g, col.b, (1 - y / 4) * 0.8], i * 4); }
        bg.setAttribute('color', new THREE.BufferAttribute(cols, 4));
        beam = new THREE.Mesh(bg, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }));
        grp.add(beam);
      }
      v = { kind: e.kind, obj: grp, height: 1, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, sprite: sp, beam };
    } else return null;
    v.obj.traverse((o) => { if ((o as THREE.Mesh).isMesh && e.kind !== Kind.LOOT) o.castShadow = true; });
    this.dyn.add(v.obj);
    this.views.set(e.id, v);
    return v;
  }

  private lootTex(icon: string, rarity: number) {
    const k = icon + rarity;
    let t = this.iconTex.get(k);
    if (!t) {
      const img = new Image(); img.src = iconUrl(icon, rarity);
      t = new THREE.Texture(img); t.colorSpace = THREE.SRGBColorSpace;
      img.onload = () => { t!.needsUpdate = true; };
      this.iconTex.set(k, t);
    }
    return t;
  }

  private animateView(v: View, x: number, y: number, dir: number | null, anim: number, animStart: number, now: number, dt: number, dead: boolean) {
    const dist = Math.hypot(x - v.lx, y - v.ly) * U;
    const moving = dist > 0.002;
    v.lx = x; v.ly = y;
    v.obj.position.set(x * U, this.heightAt(x, y), y * U);
    // yön
    let targetYaw = v.yaw;
    if (dir !== null) { const a = (dir / 256) * Math.PI * 2; targetYaw = Math.atan2(Math.cos(a), Math.sin(a)); }
    let d = targetYaw - v.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    v.yaw += d * Math.min(1, dt / 90);
    v.obj.rotation.y = v.yaw;
    let st: HState = STATE[anim] ?? 'idle';
    if (dead) st = 'dead';
    else if ((st === 'attack' || st === 'cast') && now - animStart > 600) st = moving ? 'walk' : 'idle';
    else if (st === 'idle' && moving) st = 'walk';
    else if (st === 'walk' && !moving && now - v.stateAt > 140) st = 'idle';
    if (st !== v.state) { if (!(st === 'idle' && v.state === 'walk' && now - v.stateAt < 140)) { v.state = st; v.stateAt = st === 'attack' || st === 'cast' ? animStart : now; } }
    if (dead && !v.deadAt) v.deadAt = now;
    v.phase += dist * (Math.PI * 2 / 1.55);
    const k = st === 'dead' ? (now - v.deadAt) / 700 : (now - v.stateAt) / (st === 'attack' ? 480 : 600);
    const tt = now / 1000;
    if (v.rig) animateHumanoid(v.rig, v.state, tt, k, v.phase);
    else if (v.mon) v.mon.update(v.state, tt, k, v.phase);
  }

  // ───────── çerçeve ─────────
  draw(now: number, dt: number) {
    this.resize();
    if (!this.terrain) return;
    const g = this.g;
    shared.time.value = now / 1000;
    this.terrain.update(now);
    // kendi karakter
    const sv = this.ensureSelf();
    const selfDead = (g.selfFlags & EFlag.DEAD) !== 0;
    let sAnim = g.selfAnim;
    if (!((sAnim === Anim.ATTACK || sAnim === Anim.CAST) && now - g.selfAnimStart < 520)) sAnim = now - g.lastMoveAt < 120 ? Anim.WALK : Anim.IDLE;
    this.animateView(sv, g.dx, g.dy, g.sdir, sAnim, g.selfAnimStart, now, dt, selfDead);
    this.selfRing.position.set(g.dx * U, this.heightAt(g.dx, g.dy) + 0.04, g.dy * U);
    // varlıklar
    const seen = new Set<number>();
    for (const e of g.ents.values()) {
      const v = this.viewFor(e);
      if (!v) continue;
      seen.add(e.id);
      if (e.kind === Kind.LOOT) {
        v.obj.position.set(e.x * U, this.heightAt(e.x, e.y), e.y * U);
        if (v.sprite) v.sprite.position.y = 0.55 + Math.sin(now / 300 + e.id) * 0.06;
        if (v.beam) (v.beam.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(now / 250) * 0.3;
        const mine = e.owner === g.charId;
        (v.sprite!.material as THREE.SpriteMaterial).opacity = mine ? 1 : 0.5;
        continue;
      }
      const dead = (e.flags & EFlag.DEAD) !== 0 || e.deadAt > 0;
      this.animateView(v, e.x, e.y, e.dir, e.anim, e.animStart, now, dt, dead);
      // ölü canavar yavaşça kaybolur
      if (e.kind === Kind.MONSTER && dead && v.deadAt) { const k = (now - v.deadAt) / 1500; v.obj.position.y -= Math.max(0, k - 0.5) * 0.8; }
      // isabet titreşimi
      if (now < e.hurtUntil) { v.obj.position.x += (Math.random() - 0.5) * 0.05; v.obj.position.z += (Math.random() - 0.5) * 0.05; }
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { this.dyn.remove(v.obj); this.views.delete(id); }
    // NPC'ler: oyuncuya döner
    for (const v of this.npcViews) {
      const toSelf = Math.hypot(g.dx - v.lx, g.dy - v.ly) < 360;
      const a = toSelf ? Math.atan2(g.dx - v.lx, g.dy - v.ly) : 0;
      let d = a - v.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      v.yaw += d * Math.min(1, dt / 300); v.obj.rotation.y = v.yaw;
      animateHumanoid(v.rig!, 'idle', now / 1000 + v.lx, 0, 0);
    }
    // hedef halkası
    const tgt = g.targetId ? g.ents.get(g.targetId) : null;
    this.ringMesh.visible = !!tgt;
    if (tgt) {
      const big = tgt.kind === Kind.MONSTER && MONSTERS[tgt.tpl]?.boss;
      this.ringMesh.position.set(tgt.x * U, this.heightAt(tgt.x, tgt.y) + 0.05, tgt.y * U);
      this.ringMesh.scale.setScalar((big ? 3 : 1) * (1 + Math.sin(now / 200) * 0.05));
      this.ringMesh.rotation.z = now / 1500;
    }
    // çimen
    this.updateGrass(g.dx, g.dy);
    // efektler
    this.fx.update(dt, now);
    this.ambient(dt);
    // kamera
    const zoom = store.get().settings.zoom;
    const co = (this as any).camOverride as { x: number; y: number; dist: number; pitch: number } | undefined;
    const fx0 = co ? co.x : g.dx, fy0 = co ? co.y : g.dy;
    const tx = fx0 * U, tz = fy0 * U, ty = this.heightAt(fx0, fy0);
    this.camTarget.lerp(this.tmpV.set(tx, ty, tz), this.camTarget.lengthSq() === 0 ? 1 : Math.min(1, dt / 70));
    const dist = co ? co.dist : 16 / zoom;
    const pitch = co ? co.pitch : 0.82; // ~47°
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0.002) { sx = (Math.random() - 0.5) * this.shakeAmt; sy = (Math.random() - 0.5) * this.shakeAmt; this.shakeAmt *= Math.pow(0.003, dt / 1000); }
    this.camera.position.set(this.camTarget.x + sx, this.camTarget.y + Math.sin(pitch) * dist + sy, this.camTarget.z + Math.cos(pitch) * dist);
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 0.8, this.camTarget.z);
    shared.cam.value.copy(this.camera.position);
    shared.focus.value.set(tx, ty + 1.0, tz);
    // güneş gölge kamerası oyuncuyu takip eder
    this.sun.position.set(this.camTarget.x + 18, this.camTarget.y + 30, this.camTarget.z + 10);
    this.sun.target.position.copy(this.camTarget);
    // çiz
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.drawOverlay(now);
  }

  private updateGrass(px: number, py: number) {
    const q = store.get().settings.quality;
    if (q === 'low' || !this.layout) return;
    if (Math.hypot(px - this.grassAt.x, py - this.grassAt.y) < 260) return;
    this.grassAt = { x: px, y: py };
    const l = this.layout;
    const R = q === 'high' ? 34 : 24; // metre
    const count = q === 'high' ? 9000 : 4500;
    if (!this.grass) {
      const geo = new THREE.BufferGeometry();
      const planes: THREE.BufferGeometry[] = [];
      for (let i = 0; i < 3; i++) { const p = new THREE.PlaneGeometry(0.55, 0.42); p.translate(0, 0.21, 0); p.rotateY((i / 3) * Math.PI); planes.push(p); }
      const merged = (planes[0].clone() as THREE.BufferGeometry);
      void geo; void merged;
      const mg = mergeSimple(planes);
      // çimen normallerini yukarı eğ: yumuşak ışık
      const n = mg.attributes.normal as THREE.BufferAttribute;
      for (let i = 0; i < n.count; i++) n.setXYZ(i, n.getX(i) * 0.3, 0.95, n.getZ(i) * 0.3);
      this.grass = new THREE.InstancedMesh(mg, sharedMat('grass'), count);
      this.grass.frustumCulled = false;
      this.grass.receiveShadow = true;
      this.dyn.add(this.grass);
    }
    const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), e = new THREE.Euler();
    let n = 0;
    const cx = px * U, cz = py * U;
    let seed = 1;
    const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    const theme = l.def.theme;
    if (theme === 'black') { this.grass.count = 0; return; }
    for (let i = 0; i < count * 3 && n < count; i++) {
      const gx = Math.floor((cx - R + rnd() * R * 2) / 0.9) * 0.9 + rnd() * 0.9, gz = Math.floor((cz - R + rnd() * R * 2) / 0.9) * 0.9 + rnd() * 0.9;
      const sx = gx / U, sy = gz / U;
      const tx = Math.floor(sx / TILE), ty = Math.floor(sy / TILE);
      if (tx < 0 || ty < 0 || tx >= l.w || ty >= l.h) continue;
      const gt = l.ground[ty * l.w + tx];
      if (!(gt === 0 || gt === 1 || (theme === 'frozen' && gt === 6 && rnd() < 0.15))) continue;
      if (l.blocked[ty * l.w + tx] && rnd() < 0.7) continue;
      p.set(gx, this.heightAt(sx, sy), gz);
      e.set(0, rnd() * 6.28, 0); q4.setFromEuler(e);
      const sc = 0.7 + rnd() * 0.7; s.set(sc, sc * (gt === 1 ? 1.3 : 1), sc);
      m4.compose(p, q4, s);
      this.grass.setMatrixAt(n++, m4);
    }
    this.grass.count = n;
    this.grass.instanceMatrix.needsUpdate = true;
  }

  private ambient(dt: number) {
    const q = store.get().settings.quality;
    if (q === 'low' || !this.layout) return;
    const th = this.layout.def.theme;
    const c = this.camTarget;
    const k = dt / 1000 * (q === 'high' ? 1 : 0.5);
    const rx = () => c.x + (Math.random() - 0.5) * 50, rz = () => c.z + (Math.random() - 0.5) * 36;
    if (th === 'frozen') for (let i = 0; i < k * 120; i++) this.fx.spawn(rx(), c.y + 14, rz() - 4, -0.5, -1.6, 0.2, 9000, 0.12, '#ffffff', 0, 0);
    if (th === 'forest' || th === 'village' || th === 'lake') if (Math.random() < k * 6) this.fx.spawn(rx(), c.y + 0.5 + Math.random() * 2, rz(), (Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4, 4000, 0.16, '#e8ff9a', 0, 0.2);
    if (th === 'forest' && Math.random() < k * 4) this.fx.spawn(rx(), c.y + 8, rz(), 0.6, -0.9, 0.3, 9000, 0.14, '#c8a040', -0.05, 0);
    if (th === 'black' && Math.random() < k * 30) this.fx.spawn(rx(), c.y + 0.2, rz(), (Math.random() - 0.5) * 0.3, 0.8 + Math.random(), (Math.random() - 0.5) * 0.3, 5000, 0.12, Math.random() < 0.5 ? '#ff6a3a' : '#c060ff', 0.05, 0);
  }

  // ───────── 2B üst katman: isimler, can barları, sayılar ─────────
  project(x: number, y: number, h: number): { x: number; y: number; vis: boolean } {
    this.tmpV.set(x * U, this.heightAt(x, y) + h, y * U).project(this.camera);
    return { x: (this.tmpV.x * 0.5 + 0.5) * this.w, y: (-this.tmpV.y * 0.5 + 0.5) * this.h, vis: this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.2 && Math.abs(this.tmpV.y) < 1.2 };
  }

  private drawOverlay(now: number) {
    const ctx = this.octx, g = this.g;
    ctx.clearRect(0, 0, this.w, this.h);
    const st = store.get();
    const tag = (x: number, y: number, h: number, name: string, color: string, sub?: string, subColor = '#e8dcb8') => {
      const p = this.project(x, y, h); if (!p.vis) return null;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = '700 13px Nunito, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,0.85)';
      ctx.strokeText(name, p.x, p.y); ctx.fillStyle = color; ctx.fillText(name, p.x, p.y);
      if (sub) { ctx.font = '600 11px Nunito, sans-serif'; ctx.strokeText(sub, p.x, p.y - 14); ctx.fillStyle = subColor; ctx.fillText(sub, p.x, p.y - 14); }
      return p;
    };
    const bar = (p: { x: number; y: number }, hp: number, max: number, w: number, col: string) => {
      const k = Math.max(0, Math.min(1, hp / Math.max(1, max)));
      ctx.fillStyle = 'rgba(10,8,6,0.85)'; ctx.fillRect(p.x - w / 2 - 1.5, p.y + 2, w + 3, 7);
      ctx.fillStyle = '#3a1414'; ctx.fillRect(p.x - w / 2, p.y + 3.5, w, 4);
      ctx.fillStyle = col; ctx.fillRect(p.x - w / 2, p.y + 3.5, w * k, 4);
    };
    // NPC
    for (const v of this.npcViews) {
      const id = (v as unknown as { npc: string }).npc;
      const def = this.layout.def.npcs.find((d) => d.id === id);
      if (def) tag(v.lx, v.ly, 2.25, def.name, '#ffd870', def.title, '#a8e0b0');
    }
    for (const e of g.ents.values()) {
      if (e.kind === Kind.LOOT) {
        if (Math.hypot(e.x - g.dx, e.y - g.dy) > 480) continue;
        const left = Math.max(0, (e.ttlEnd - now) / 1000);
        tag(e.x, e.y, 1.0, e.label, e.owner === g.charId ? RAR_COLORS[e.rarity] : '#8a857c', left < 10 ? `${Math.ceil(left)} sn` : undefined, '#ffb0b0');
        continue;
      }
      const v = this.views.get(e.id);
      if (!v || e.deadAt || (e.flags & EFlag.DEAD)) continue;
      if (e.kind === Kind.PLAYER) {
        if (!st.settings.showNames && g.targetId !== e.id) continue;
        const p = tag(e.x, e.y, 2.15, e.name, (e.flags & EFlag.GM) ? '#ffd84a' : (e.flags & EFlag.PVP) ? '#ff9a9a' : CLASS_COLORS[e.cls], `Sv. ${e.level}`);
        if (p && e.hp < e.maxHp) bar(p, e.hp, e.maxHp, 46, '#5fe07a');
      } else {
        const def = MONSTERS[e.tpl];
        const targeted = g.targetId === e.id;
        if (!(targeted || g.hoverId === e.id || e.hp < e.maxHp || def?.boss)) continue;
        const pre = e.variant === 2 ? 'Katil ' : e.variant === 1 ? 'Agresif ' : '';
        const p = tag(e.x, e.y, v.height + 0.35, pre + (def?.name ?? ''), e.variant === 2 ? '#ff6a6a' : e.variant === 1 ? '#ffb35a' : '#f2ecdc', `Sv. ${e.level}`, def?.boss ? '#ffd84a' : '#c8c0b0');
        if (p) bar(p, e.hp, e.maxHp, def?.boss ? 120 : 56, def?.boss ? '#ff4d7a' : '#e84a3a');
      }
    }
    if (st.char && st.settings.showNames) tag(g.dx, g.dy, 2.15, st.char.name, '#fff0c0', `Sv. ${st.self?.level ?? 1}`);
    // tıklama işaretleri
    for (const c of this.clicks) { const k = (now - c.t) / 500; if (k > 1) continue; const p = this.project(c.x, c.y, 0.05); ctx.strokeStyle = `rgba(255,240,170,${1 - k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(p.x, p.y, 8 + k * 14, (8 + k * 14) * 0.5, 0, 0, Math.PI * 2); ctx.stroke(); }
    this.clicks = this.clicks.filter((c) => now - c.t < 500);
    // hasar sayıları
    if (st.settings.showDamage || true) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of this.fx.texts) {
        const k = (now - t.t0) / t.dur;
        const p = this.project(t.x, t.y, t.h + k * 0.9); if (!p.vis) continue;
        const pop = k < 0.12 ? 0.6 + (k / 0.12) * 0.55 : 1.15 - Math.min(0.15, k - 0.12);
        ctx.globalAlpha = k > 0.7 ? 1 - (k - 0.7) / 0.3 : 1;
        ctx.font = `800 ${Math.round(t.size * pop)}px Fredoka, Nunito, sans-serif`;
        ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(20,10,6,0.9)';
        ctx.strokeText(t.text, p.x + t.vx * k, p.y); ctx.fillStyle = t.color; ctx.fillText(t.text, p.x + t.vx * k, p.y);
      }
      ctx.globalAlpha = 1;
    }
    // düşük can kenar kızarması
    if (st.hp / Math.max(1, st.maxHp) < 0.25 && !(g.selfFlags & EFlag.DEAD)) {
      const gr = ctx.createRadialGradient(this.w / 2, this.h / 2, this.h * 0.3, this.w / 2, this.h / 2, this.h * 0.8);
      gr.addColorStop(0, 'rgba(160,0,0,0)'); gr.addColorStop(1, `rgba(160,0,0,${0.35 + Math.sin(now / 200) * 0.12})`);
      ctx.fillStyle = gr; ctx.fillRect(0, 0, this.w, this.h);
    }
  }

  /** Ekran noktasından dünya (sunucu) koordinatı: zemine ışın. */
  screenToWorld(sx: number, sy: number) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(new THREE.Vector2((sx / this.w) * 2 - 1, -(sy / this.h) * 2 + 1), this.camera);
    let h = this.camTarget.y;
    const p = new THREE.Vector3();
    for (let i = 0; i < 3; i++) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h);
      if (!ray.ray.intersectPlane(plane, p)) break;
      h = this.heightAt(p.x / U, p.z / U);
    }
    return { x: p.x / U, y: p.z / U };
  }
  /** Ekranda en yakın varlık/NPC (piksel mesafesi). */
  pickScreen(sx: number, sy: number): { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null {
    let best: { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null = null, bd = 46;
    for (const e of this.g.ents.values()) {
      if (e.deadAt) continue;
      const v = this.views.get(e.id);
      const h = e.kind === Kind.LOOT ? 0.5 : (v?.height ?? 1.6) * 0.5;
      const p = this.project(e.x, e.y, h);
      const d = Math.hypot(p.x - sx, p.y - sy) * (e.kind === Kind.LOOT ? 0.8 : 1);
      if (d < bd) { bd = d; best = { type: e.kind === Kind.LOOT ? 'loot' : 'ent', e }; }
    }
    for (const v of this.npcViews) {
      const p = this.project(v.lx, v.ly, 1.0);
      const d = Math.hypot(p.x - sx, p.y - sy);
      if (d < bd) { bd = d; best = { type: 'npc', npc: (v as unknown as { npc: string }).npc }; }
    }
    return best;
  }
}

function mergeSimple(list: THREE.BufferGeometry[]) {
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  let off = 0;
  for (const g0 of list) {
    const g = g0.index ? g0 : g0;
    const p = g.attributes.position, n = g.attributes.normal, u = g.attributes.uv;
    for (let i = 0; i < p.count; i++) { pos.push(p.getX(i), p.getY(i), p.getZ(i)); nor.push(n.getX(i), n.getY(i), n.getZ(i)); uv.push(u.getX(i), u.getY(i)); }
    const ix = g.index!; for (let i = 0; i < ix.count; i++) idx.push(ix.getX(i) + off);
    off += p.count;
  }
  const m = new THREE.BufferGeometry();
  m.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  m.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  m.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  m.setIndex(idx);
  return m;
}
