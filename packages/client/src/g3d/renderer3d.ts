import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GTAOPass } from 'three/examples/jsm/postprocessing/GTAOPass.js';
import { GrassField } from './grass.ts';
import { createGlbChar, onModelReady, loadManifest, ATTACK_ANIM_MS, CAST_ANIM_MS, type GlbChar } from './models.ts';
import { equipGlb } from './gear.ts';
import { Kind, Anim, EFlag, MONSTERS, CLASS_IDS, TILE, TUNING, type MapLayout } from '@col/shared';
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
/** Dokunmatik (telefon/tablet): ekran kartı bant genişliği dar, tam ekran efekt geçişleri pahalı. */
const MOBILE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

const THEME = {
  // Aydınlık, sıcak gündüz: güçlü gök ışığı (gölgeler kararmasın), açık sis ve gökyüzü
  village: { fog: 0xc4d2d8, top: 0x7aa6d6, sky: 0xd8e6f2, ground: 0x8a7c62, sun: 0xfff0d8, sunI: 3.6, hemi: 1.15, exp: 1.22, near: 55, far: 140 },
  forest: { fog: 0xb8ccc4, top: 0x78a2cc, sky: 0xd2e2ea, ground: 0x7a7258, sun: 0xffeccc, sunI: 3.5, hemi: 1.15, exp: 1.25, near: 48, far: 125 },
  lake: { fog: 0xc6d6de, top: 0x78a6d8, sky: 0xdae8f4, ground: 0x857a62, sun: 0xfff0dc, sunI: 3.6, hemi: 1.15, exp: 1.22, near: 55, far: 145 },
  frozen: { fog: 0xd4dee6, top: 0x8eaed0, sky: 0xe6eef6, ground: 0x9aa6b2, sun: 0xf4f6ff, sunI: 3.1, hemi: 1.1, exp: 1.12, near: 45, far: 120 },
  black: { fog: 0x8c8090, top: 0x7a7090, sky: 0xb4a8bc, ground: 0x5a4e56, sun: 0xffd2b0, sunI: 3.0, hemi: 0.95, exp: 1.2, near: 40, far: 110 },
  ancient: { fog: 0xc8c6b0, top: 0x7ea2c4, sky: 0xdcdcc8, ground: 0x857c60, sun: 0xffecc8, sunI: 3.4, hemi: 1.1, exp: 1.22, near: 48, far: 125 },
} as const;


interface View { kind: number; obj: THREE.Object3D; rig?: Rig; mon?: MonsterRig; glb?: GlbChar; model?: string; speed?: number; height: number; phase: number; lx: number; ly: number; yaw: number; state: HState; stateAt: number; deadAt: number; sprite?: THREE.Sprite; beam?: THREE.Mesh }

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
  grass: GrassField | null = null;
  /** Kamera: yatay açı (radyan), yakınlık (1 = varsayılan). Fareyle döndürülür, tekerlekle yaklaşılır. */
  camYaw = 0; camZoom = 1; camPitch = 0.62; private camYawS = 0; private camZoomS = 1; private camPitchS = 0.62;
  /** Dinamik çözünürlük: FPS düşünce piksel oranı kendiliğinden azalır. */
  private frameNo = 0;
  private dynScale = 1; private fpsAcc = 0; private fpsFrames = 0; private fpsAt = 0;
  private skyTex: THREE.Texture | null = null;
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
    this.renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // telefonda gölge haritası iki karede bir yenilenir (karakter gölgeleri 30 Hz'de akıcı görünür)
    if (MOBILE) this.renderer.shadowMap.autoUpdate = false;
    this.octx = overlay.getContext('2d')!;
    this.scene.add(this.world, this.dyn, this.fx.group, this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(q === 'high' ? 2048 : q === 'medium' ? 1024 : 512, q === 'high' ? 2048 : q === 'medium' ? 1024 : 512);
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
    loadManifest();
    onModelReady((id) => {
      // model geldi: o modeli kullanan görünümleri yeniden kur
      for (const [eid, v] of this.views) if (v.model === id && !v.glb) { this.dyn.remove(v.obj); this.views.delete(eid); }
      if (this.self && this.self.model === id && !this.self.glb) { this.dyn.remove(this.self.obj); this.self = null; }
      // NPC'ler: yerinde yeni modelle değiştir
      this.npcViews = this.npcViews.map((v) => {
        if (v.model !== id || v.glb) return v;
        const nv = this.humanView(id, 99, v.lx, v.ly);
        nv.obj.position.copy(v.obj.position); nv.yaw = v.yaw;
        this.dyn.remove(v.obj); this.dyn.add(nv.obj);
        return Object.assign(nv, { npc: (v as unknown as { npc: string }).npc });
      });
    });
  }

  private setupComposer() {
    const q = store.get().settings.quality;
    this.quality = q;
    // Telefonda efekt zinciri yok: sahne doğrudan ekrana çizilir (donanım kenar yumuşatma, ton eşleme aynı geçişte).
    // Bu, her karede 4–6 tam ekran geçişi ve ortam gölgelendirmesi için sahnenin ikinci kez çizilmesini kaldırır.
    if (q === 'low' || MOBILE) { this.composer = null; this.bloom = null; return; }
    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    if (q === 'high') {
      const ao = new GTAOPass(this.scene, this.camera, 512, 512);
      ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.5, thickness: 1.2, scale: 1.0, samples: 12 });
      ao.blendIntensity = 0.85;
      this.composer.addPass(ao);
    }
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.4, 0.9);
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
    if (this.grass) { this.dyn.remove(this.grass.group); this.grass.dispose(); this.grass = null; }
    const t0 = performance.now();
    this.terrain = new Terrain(l);
    this.world.add(this.terrain.mesh);
    if (this.terrain.water) this.world.add(this.terrain.water);
    const q = store.get().settings.quality;
    this.world.add(buildProps(l.props, (x, y) => this.heightAt(x, y), q));
    if (q !== 'low') { this.grass = new GrassField(l, (x, y) => this.heightAt(x, y), q); this.dyn.add(this.grass.group); }
    // NPC'ler
    for (const n of l.npcs) {
      const def = l.def.npcs.find((d) => d.id === n.id);
      const v = this.humanView(def?.art ?? 'merchant', 99, n.x, n.y);
      v.obj.position.set(n.x * U, this.heightAt(n.x, n.y), n.y * U);
      this.dyn.add(v.obj);
      this.npcViews.push(Object.assign(v, { npc: n.id }));
    }
    // tema ışığı
    const th = THEME[l.def.theme as keyof typeof THEME] ?? THEME.forest;
    this.scene.fog = new THREE.Fog(th.fog, th.near, th.far);
    this.camera.far = th.far + 20; this.camera.updateProjectionMatrix(); // sisin ötesi çizilmez
    this.scene.background = this.skyGradient(th.top, th.fog);
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.hemi.color.set(th.sky); this.hemi.groundColor.set(th.ground); this.hemi.intensity = th.hemi;
    this.baseExp = th.exp;
    this.renderer.toneMappingExposure = th.exp * TUNING.brightness;
    // kendi karakterini yeniden ekle
    if (this.self) this.dyn.add(this.self.obj);
    console.debug('[3d] harita kuruldu', l.def.id, Math.round(performance.now() - t0), 'ms');
  }

  /** Son 2 sn'nin ortalamasına göre çizim çözünürlüğünü ayarla (hedef 60 FPS). */
  private adaptResolution(now: number, dt: number) {
    if (document.hidden) return;
    this.fpsAcc += dt; this.fpsFrames++;
    if (now - this.fpsAt < 2000) return;
    const fps = (this.fpsFrames * 1000) / Math.max(1, this.fpsAcc);
    this.fpsAt = now; this.fpsAcc = 0; this.fpsFrames = 0;
    // hedef akıcı 60 FPS: 50'nin altında çözünürlük kademeli düşer, 57'nin üstünde geri çıkar
    if (fps < 50 && this.dynScale > 0.6) this.dynScale = Math.max(0.6, this.dynScale * (fps < 35 ? 0.82 : 0.9));
    else if (fps > 57 && this.dynScale < 1) this.dynScale = Math.min(1, this.dynScale * 1.05);
  }

  private skyGradient(top: number, horizon: number): THREE.Texture {
    this.skyTex?.dispose();
    const c = document.createElement('canvas'); c.width = 4; c.height = 256;
    const x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 0, 256);
    const t = new THREE.Color(top), h = new THREE.Color(horizon);
    g.addColorStop(0, `#${t.getHexString()}`); g.addColorStop(0.48, `#${h.getHexString()}`); g.addColorStop(1, `#${h.clone().multiplyScalar(0.7).getHexString()}`);
    x.fillStyle = g; x.fillRect(0, 0, 4, 256);
    const tex = new THREE.CanvasTexture(c);
    tex.mapping = THREE.EquirectangularReflectionMapping; tex.colorSpace = THREE.SRGBColorSpace;
    this.skyTex = tex;
    return tex;
  }

  shake(n: number) { this.shakeAmt = Math.max(this.shakeAmt, n * 0.02); }
  clickMark(x: number, y: number) { this.clicks.push({ x, y, t: performance.now() }); }

  resize() {
    const q = store.get().settings.quality;
    if (q !== this.quality) { this.setupComposer(); this.renderer.shadowMap.enabled = q !== 'low'; }
    const maxDpr = MOBILE ? (q === 'high' ? 1.5 : q === 'medium' ? 1.2 : 1) : (q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1);
    const dpr = Math.round(Math.max(0.6, Math.min(window.devicePixelRatio || 1, maxDpr) * this.dynScale) * 20) / 20;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    if (w !== this.w || h !== this.h || dpr !== this.dpr) {
      this.w = w; this.h = h; this.dpr = dpr;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.composer?.setPixelRatio(dpr);
      this.composer?.setSize(w, h);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      const odpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.5 : 2);
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
    this.self = this.humanView(cls, Kind.PLAYER, this.g.dx, this.g.dy);
    this.selfCls = cls;
    this.dyn.add(this.self.obj);
    return this.self;
  }

  /** Oyuncu/NPC görünümü: hazır 3B model (GLB) varsa onu, yoksa prosedürel modeli kullanır. */
  private humanView(modelId: string, kind: number, x: number, y: number): View {
    const glb = createGlbChar(modelId);
    if (glb) equipGlb(glb, LOOKS[modelId]);
    if (glb) return { kind, obj: glb.root, glb, model: modelId, height: glb.height, phase: 0, lx: x, ly: y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
    const rig = createHumanoid(LOOKS[modelId] ?? LOOKS.merchant);
    return { kind, obj: rig.root, rig, model: modelId, height: 2.0, phase: 0, lx: x, ly: y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
  }

  private viewFor(e: CEnt): View | null {
    let v = this.views.get(e.id);
    if (v) return v;
    if (e.kind === Kind.PLAYER) {
      v = this.humanView(CLASS_IDS[e.cls] ?? 'guardian', e.kind, e.x, e.y);
    } else if (e.kind === Kind.MONSTER) {
      const def = MONSTERS[e.tpl];
      if (!def) return null;
      const glb = createGlbChar(def.art);
      if (glb) { glb.root.scale.multiplyScalar(def.size * (e.variant === 2 ? 1.12 : 1)); v = { kind: e.kind, obj: glb.root, glb, model: def.art, height: glb.height * def.size, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 }; }
      else {
        const mon = createMonster(def.art, e.variant, def.size);
        v = { kind: e.kind, obj: mon.root, mon, model: def.art, height: mon.height, phase: Math.random() * 6, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
      }
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
    else if ((st === 'attack' || st === 'cast') && now - animStart > (st === 'cast' ? CAST_ANIM_MS : ATTACK_ANIM_MS)) st = moving ? 'walk' : 'idle';
    else if (st === 'idle' && moving) st = 'walk';
    else if (st === 'walk' && !moving && now - v.stateAt > 140) st = 'idle';
    if (st !== v.state) { if (!(st === 'idle' && v.state === 'walk' && now - v.stateAt < 140)) { v.state = st; v.stateAt = st === 'attack' || st === 'cast' ? animStart : now; } }
    if (dead && !v.deadAt) v.deadAt = now;
    v.phase += dist * (Math.PI * 2 / 1.55);
    const k = st === 'dead' ? (now - v.deadAt) / 700 : (now - v.stateAt) / (st === 'attack' ? 480 : 600);
    const tt = now / 1000;
    const sp = dt > 0 ? (dist / dt) * 1000 : 0;
    v.speed = (v.speed ?? 0) * 0.8 + sp * 0.2;
    const restart = (v.state === 'attack' || v.state === 'cast') && (v as View & { lastStart?: number }).lastStart !== animStart;
    (v as View & { lastStart?: number }).lastStart = animStart;
    if (v.glb) v.glb.update(v.state, dt, moving, v.speed, restart, (v as View & { skill?: number }).skill);
    else if (v.rig) animateHumanoid(v.rig, v.state, tt, k, v.phase);
    else if (v.mon) v.mon.update(v.state, tt, k, v.phase);
  }

  // ───────── çerçeve ─────────
  private baseExp = 1;
  draw(now: number, dt: number) {
    this.renderer.toneMappingExposure = this.baseExp * TUNING.brightness; // yönetim panelinden ışık seviyesi
    this.adaptResolution(now, dt);
    this.resize();
    if (!this.terrain) return;
    const g = this.g;
    shared.time.value = now / 1000;
    this.terrain.update(now);
    // kendi karakter
    const sv = this.ensureSelf();
    const selfDead = (g.selfFlags & EFlag.DEAD) !== 0;
    let sAnim = g.selfAnim;
    if (!((sAnim === Anim.ATTACK || sAnim === Anim.CAST) && now - g.selfAnimStart < (sAnim === Anim.CAST ? CAST_ANIM_MS : ATTACK_ANIM_MS) - 60)) sAnim = now - g.lastMoveAt < 120 ? Anim.WALK : Anim.IDLE;
    (sv as View & { skill?: number }).skill = g.selfSkill;
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
      (v as View & { skill?: number }).skill = e.skill;
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
      if (v.glb) v.glb.update('idle', dt, false, 0); else animateHumanoid(v.rig!, 'idle', now / 1000 + v.lx, 0, 0);
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
    this.grass?.update(g.dx * U, g.dy * U);
    // efektler
    this.fx.update(dt, now);
    this.ambient(dt);
    // kamera
    const zoom = store.get().settings.zoom;
    const co = (this as any).camOverride as { x: number; y: number; dist: number; pitch: number } | undefined;
    const fx0 = co ? co.x : g.dx, fy0 = co ? co.y : g.dy;
    const tx = fx0 * U, tz = fy0 * U, ty = this.heightAt(fx0, fy0);
    // yatayda oyuncuya kilitli (kare süresine bağlı gecikme FPS dalgalanınca karakteri ekranda oynatıyordu);
    // yalnız yükseklik, zamandan bağımsız üstel yumuşatmayla izlenir
    const first = this.camTarget.lengthSq() === 0 || Math.hypot(this.camTarget.x - tx, this.camTarget.z - tz) > 30;
    this.camTarget.x = tx; this.camTarget.z = tz;
    this.camTarget.y = first ? ty : this.camTarget.y + (ty - this.camTarget.y) * (1 - Math.pow(0.0005, dt / 1000));
    // yumuşak dönüş/yakınlaşma; yakınlaştıkça kamera alçalır (3B his)
    let dy = this.camYaw - this.camYawS; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    this.camYawS += dy * Math.min(1, dt / 90);
    this.camZoomS += (this.camZoom * zoom - this.camZoomS) * Math.min(1, dt / 110);
    const zk = THREE.MathUtils.clamp((this.camZoomS - 0.6) / 1.7, 0, 1); // 0 uzak · 1 yakın
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, 0.1, 1.3);
    this.camPitchS += (this.camPitch - this.camPitchS) * Math.min(1, dt / 90);
    const dist = co ? co.dist : THREE.MathUtils.lerp(17, 5.5, zk);
    const pitch = co ? co.pitch : this.camPitchS;
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0.002) { sx = (Math.random() - 0.5) * this.shakeAmt; sy = (Math.random() - 0.5) * this.shakeAmt; this.shakeAmt *= Math.pow(0.003, dt / 1000); }
    const hd = Math.cos(pitch) * dist;
    const cx = this.camTarget.x + Math.sin(this.camYawS) * hd + sx, cz = this.camTarget.z + Math.cos(this.camYawS) * hd;
    // kamera yerin içine girmesin (tepe/yamaç)
    const ground = this.heightAt(cx / U, cz / U) + 0.7;
    this.camera.position.set(cx, Math.max(ground, this.camTarget.y + Math.sin(pitch) * dist + sy), cz);
    // alçak açıda biraz yukarı bak: ufuk görünsün
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 1.1 + (1 - Math.min(1, pitch / 0.6)) * 0.8, this.camTarget.z);
    this.g.camYaw = this.camYawS;
    shared.cam.value.copy(this.camera.position);
    shared.focus.value.set(tx, ty + 1.0, tz);
    // güneş gölge kamerası oyuncuyu takip eder
    this.sun.position.set(this.camTarget.x + 26, this.camTarget.y + 24, this.camTarget.z + 14);
    this.sun.target.position.copy(this.camTarget);
    // çiz
    if (MOBILE && (this.frameNo++ & 1) === 0) this.renderer.shadowMap.needsUpdate = true;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.drawOverlay(now);
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
    let hit = false;
    for (let i = 0; i < 3; i++) {
      const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -h);
      if (!ray.ray.intersectPlane(plane, p)) break;
      hit = true;
      h = this.heightAt(p.x / U, p.z / U);
    }
    // ufka/göğe dokunuldu: yere ışın değmiyor → olduğun yerde kal
    if (!hit || p.distanceTo(this.camTarget) > 60) return { x: this.g.dx, y: this.g.dy };
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
