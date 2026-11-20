import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { GrassField } from './grass.ts';
import { createGlbChar, model as loadModelRaw, hasModel, modelPending, onModelReady, onModelStatus, loadManifest, reachIK, twoBoneIK, rotateWorld, ATTACK_ANIM_MS, CAST_ANIM_MS, type GlbChar } from './models.ts';
import { equipGlb } from './gear.ts';
import { armorFx, armorPlusFx, armorPlusTier, gearFxScale, gearRarity, sigilFx } from './gearfx.ts';
import { evoArmorFx, gearEvo } from './evofx.ts';
import { mtnLight } from './mountains.ts';
import { buildMountains, buildMeshMountains, type MeshMountains } from './mountains.ts';
import { equipArmor } from './armor.ts';
import { Kind, Anim, EFlag, MONSTERS, CLASS_IDS, TILE, TUNING, RARITIES, cosmeticByte, trDayKey, dayNightAt, trHour, type MapLayout } from '@col/shared';
import type { Game, CEnt } from '../game/game.ts';
import { RAR_COLORS } from '../game/game.ts';
import { Terrain, U } from './terrain.ts';
import { buildProps, MESHY_TREES } from './props3d.ts';
import { createPet, createWings, PET_MODEL, type Pet } from './pets.ts';
import { createMount, type MountRig } from './mount3d.ts';
import { FishGear } from './fishing3d.ts';
import { sfx } from '../game/audio.ts';
import { createHumanoid, animateHumanoid, LOOKS, type Rig, type HState } from './humanoid.ts';
import { createMonster, MONSTER_MESHES, type MonsterRig } from './monsters3d.ts';
import { Fx3D } from './fx3d.ts';
import { shared, mat as sharedMat } from './materials.ts';
import { iconUrl } from '../game/art/icons.ts';
import { glowTexture } from './textures.ts';
import { store } from '../game/store.ts';
import { TowerFx } from './tower3d.ts';
import { ForgeFx } from './forge3d.ts';
import { GardenFx } from './garden3d.ts';
import { GARDEN_MAP } from '@col/shared';
import { NewYearFx } from './newyear3d.ts';

const STATE: HState[] = ['idle', 'walk', 'attack', 'hurt', 'dead', 'cast', 'gather'];
const CLASS_COLORS = ['#a8c8ff', '#a8ff98', '#dcb8ff'];
/** Dokunmatik (telefon/tablet): ekran kartı bant genişliği dar, tam ekran efekt geçişleri pahalı. */
/** Varsayılan kamera yakınlığı (küçük = uzak). ~17 m: karakter ve çevresi rahat görünür. */
export const CAM_ZOOM_DEFAULT = 0.8;
/** varsayılan kamera eğimi (rad): daha tepeden, çevre daha geniş görünsün */
export const CAM_PITCH_DEFAULT = 0.8;
export const CAM_ZOOM_MIN = 0.45, CAM_ZOOM_MAX = 2.3;
const MOBILE = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
/** telefon/tablet: cihazın ulaştığı otomatik hafifletme kademesi (bir sonraki girişte oradan başlanır) */
const PERF_KEY = 'col_perf_lvl';
const storedPerf = () => { try { return Math.max(0, Math.min(3, Number(localStorage.getItem(PERF_KEY)) || 0)); } catch { return 0; } };
/**
 * Telefonda karakter/canavar gerçek gölge düşürmez, yumuşak zemin gölgesi kullanır. Gölge haritasında
 * yalnız durağan dünya kalır ve oyuncu 2,5 m yürüdükçe bir kez çizilir (önceden her karede ya da iki
 * karede bir çiziliyordu: telefonu ısıtan en pahalı geçişlerden biri; kendi gölgesi de sekiyordu).
 */
const DYN_SHADOWS = !MOBILE;
/** Nadir eşya parıltısı gösterilen en çok oyuncu ve en uzak mesafe² (sunucu birimi). */
const FX_MAX = MOBILE ? 6 : 16, FX_FAR2 = (MOBILE ? 700 : 1100) ** 2;
/** Kalabalık bütçesi: yalnız en yakın PLAYER_FULL oyuncu tam ayrıntılı (gölge, evcil hayvan, kanat);
 *  ötekiler gölgesiz ve kozmetiksiz çizilir. 20+ oyunculu meydanda çizim çağrısı ve üçgen sayısı sınırlı kalır. */
const PLAYER_FULL = MOBILE ? 10 : 22;
/** Isınma modu (Ayarlar): gölge ve çimen kapalı, düşük çözünürlük, daha az efekt ve ayrıntı */
const cool = () => MOBILE && !!store.get().settings.cool; // yalnız telefon/tablet
let blobGeo: THREE.PlaneGeometry | null = null, blobMat: THREE.MeshBasicMaterial | null = null;
function blobShadow(r: number) {
  if (!blobGeo) {
    blobGeo = new THREE.PlaneGeometry(2, 2); blobGeo.rotateX(-Math.PI / 2);
    const cv = document.createElement('canvas'); cv.width = cv.height = 64;
    const c = cv.getContext('2d')!, gr = c.createRadialGradient(32, 32, 2, 32, 32, 32);
    gr.addColorStop(0, 'rgba(0,0,0,0.55)'); gr.addColorStop(0.55, 'rgba(0,0,0,0.3)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = gr; c.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(cv);
    blobMat = new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  }
  const m = new THREE.Mesh(blobGeo, blobMat!); m.scale.setScalar(r); m.position.y = 0.04; m.renderOrder = 1; m.name = 'blob';
  return m;
}
/**
 * Sahneden çıkan bir varlık görünümünün ekran kartı kaynaklarını bırakır. Her canavar/oyuncu kopyasının kendi
 * iskeleti (kemik dokusu) ve yere düşen eşyanın ışın geometrisi vardı; görünüm kaldırılınca silinmiyordu. Uzun
 * oturumda (çok canavar öldürüp yeniden doğdukça) bunlar birikiyor, oyun bir süre sonra ~1 sn donmaya başlıyordu;
 * yalnız sayfa kapatılınca düzeliyordu. Model geometrisi/malzemesi önbellekle paylaşıldığı için onlara dokunulmaz.
 */
function releaseView(v: { obj: THREE.Object3D; beam?: THREE.Mesh }) {
  v.obj.parent?.remove(v.obj);
  v.obj.traverse((o) => { const sm = o as THREE.SkinnedMesh; if (sm.isSkinnedMesh && sm.skeleton) sm.skeleton.dispose(); });
  if (v.beam) v.beam.geometry.dispose();
}
function prepDynamic(obj: THREE.Object3D, r: number) {
  obj.traverse((o) => { if ((o as THREE.Mesh).isMesh && o.name !== 'blob') { o.castShadow = DYN_SHADOWS; } });
  if (!DYN_SHADOWS && !obj.userData.blob) { obj.userData.blob = true; obj.add(blobShadow(r)); }
}

const THEME = {
  // Aydınlık, sıcak gündüz: güçlü gök ışığı (gölgeler kararmasın), açık sis ve gökyüzü
  village: { fog: 0xc4d2d8, top: 0x7aa6d6, sky: 0xd8e6f2, ground: 0x8a7c62, sun: 0xfff0d8, sunI: 3.6, hemi: 1.15, exp: 1.22, near: 130, far: 250 },
  forest: { fog: 0xb8ccc4, top: 0x78a2cc, sky: 0xd2e2ea, ground: 0x7a7258, sun: 0xffeccc, sunI: 3.5, hemi: 1.15, exp: 1.25, near: 130, far: 250 },
  lake: { fog: 0xc6d6de, top: 0x78a6d8, sky: 0xdae8f4, ground: 0x857a62, sun: 0xfff0dc, sunI: 3.6, hemi: 1.15, exp: 1.22, near: 130, far: 250 },
  frozen: { fog: 0xd4dee6, top: 0x8eaed0, sky: 0xe6eef6, ground: 0x9aa6b2, sun: 0xf4f6ff, sunI: 3.1, hemi: 1.1, exp: 1.12, near: 130, far: 250 },
  black: { fog: 0x8c8090, top: 0x7a7090, sky: 0xb4a8bc, ground: 0x5a4e56, sun: 0xffd2b0, sunI: 3.0, hemi: 0.95, exp: 1.2, near: 130, far: 250 },
  // Kadim Kule: karanlık, mor-mavi mistik ışık; kısa sis (komşu katlar boşlukta silik görünür)
  tower: { fog: 0x1e1a2e, top: 0x0a0812, sky: 0x6a5c94, ground: 0x1c1626, sun: 0xd2c4ff, sunI: 2.6, hemi: 0.9, exp: 1.15, near: 38, far: 100 },
  // Kor Kulesi: koyu is, alttan lavın turuncu ışığı; kısa sis
  forge: { fog: 0x2a140c, top: 0x0c0604, sky: 0x8a3a18, ground: 0x2a1408, sun: 0xffc090, sunI: 2.5, hemi: 0.95, exp: 1.18, near: 40, far: 105 },
  // Kadim Sunak (Dünya Boss'u): kızıl-mor alacakaranlık, kül ve köz; orta mesafeli sis
  wboss: { fog: 0x4a2a3a, top: 0x1a0c18, sky: 0x9a4058, ground: 0x2e1c24, sun: 0xffb8a0, sunI: 2.9, hemi: 0.95, exp: 1.22, near: 70, far: 160 },
  ancient: { fog: 0xc8c6b0, top: 0x7ea2c4, sky: 0xdcdcc8, ground: 0x857c60, sun: 0xffecc8, sunI: 3.4, hemi: 1.1, exp: 1.22, near: 130, far: 250 },
} as const;


interface View { kind: number; obj: THREE.Object3D; rig?: Rig; mon?: MonsterRig; glb?: GlbChar; model?: string; speed?: number; height: number; phase: number; lx: number; ly: number; yaw: number; state: HState; stateAt: number; deadAt: number; sprite?: THREE.Sprite; beam?: THREE.Mesh; gfx?: THREE.Object3D[]; wpend?: string | null; apend?: string | null; /** asıl model yüklenirken boş yer tutucu */ ph?: boolean;
  /** Nesne Market: evcil hayvan ve sırttaki kanat; cpend yüklenmeyi bekleyen kozmetik modeli */ pet?: Pet | null; wings?: (THREE.Object3D & { tick?: (t: number, moving: boolean) => void }) | null; cpend?: string | null }

const _footP = new THREE.Vector3();
export class Renderer3D {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(MOBILE ? 34 : 38, 1, 0.5, 260);
  composer: EffectComposer | null = null;
  private towerFx: TowerFx | null = null;
  private forgeFx: ForgeFx | null = null;
  private gardenFx: GardenFx | null = null;
  /** Pazar Köyü yeni yıl süsü (yönetimden aç/kapa) */
  private nyFx: NewYearFx | null = null; private nyOn = false;
  private nyActive(l: MapLayout | null = this.layout) { return !!l && l.def.id === 'bazaar' && TUNING.newYear >= 0.5; }
  /** yeni yıl açıkken çeşmenin yerine ağaç gelir */
  private propList(l: MapLayout) { return this.nyActive(l) ? l.props.filter((p) => p.k !== 'fountain') : l.props; }
  private applyNewYear() {
    const l = this.layout; if (!l || !this.terrain) return;
    this.nyOn = this.nyActive();
    this.nyFx?.dispose(); if (this.nyFx) this.world.remove(this.nyFx.group); this.nyFx = null;
    if (this.nyOn) { this.nyFx = new NewYearFx(l, (x, y) => this.heightAt(x, y), MOBILE); this.world.add(this.nyFx.group); }
    this.terrain.snow.value = this.nyOn ? 1 : 0;
    shared.snow.value = this.nyOn ? 1 : 0; // ağaç ve çalı tepelerinde kar
    this.shadowDirty = true;
  }
  private emblemImgs = new Map<number, HTMLImageElement>();
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
  private skWarm = false;
  layout!: MapLayout;
  w = 1; h = 1; dpr = 1;
  octx: CanvasRenderingContext2D;
  shakeAmt = 0;
  clicks: { x: number; y: number; t: number }[] = [];
  ringMesh: THREE.Mesh;
  selfRing: THREE.Mesh;
  grass: GrassField | null = null;
  private coolOn = false;
  /** balık tutan oyuncuların oltaları (görünüm → olta); karede kullanılmayanlar kaldırılır */
  private fishGears = new Map<View, { gear: FishGear; wx: number; wz: number; at: number; seen: number }>();
  private propsGroup: THREE.Group | null = null;
  /** Kamera: yatay açı (radyan), yakınlık (1 = varsayılan). Fareyle döndürülür, tekerlekle yaklaşılır. */
  /** telefon kamera düğmesi basılıyken dönüş yönü (+1 sola, −1 sağa); karede geçen süreyle uygulanır */
  camSpin = 0;
  camYaw = 0; camZoom = CAM_ZOOM_DEFAULT; camPitch = CAM_PITCH_DEFAULT; private camYawS = 0; private camZoomS = CAM_ZOOM_DEFAULT; private camPitchS = CAM_PITCH_DEFAULT;
  /** Dinamik çözünürlük: FPS düşünce piksel oranı kendiliğinden azalır. */
  private frameNo = 0;
  /** sabit çözünürlük ölçeği (giriş videosu kaydı); null: kare hızına göre uyarlanır */
  fixedScale: number | null = null;
  /** ayarlardaki tanı satırı: çizilen piksel boyutu ve otomatik çözünürlük oranı */
  renderInfo() { return { w: Math.round(this.w * this.dpr), h: Math.round(this.h * this.dpr), scale: this.dynScale, lvl: this.perfLvl }; }
  /** telefon/tablet otomatik hafifletme kademesi (0–3) ve son harita kurulma anı (yükleme sırasındaki düşüş sayılmaz) */
  perfLvl = MOBILE ? storedPerf() : 0; private mapAt = 0; private dynMax = 1;
  /** false: giriş ekranı sahnesi — kademe yükselir ama cihaza kaydedilmez (oyunun ölçümü esas) */
  persistPerf = true;
  private dynScale = 1; private fpsAcc = 0; private fpsFrames = 0; private fpsAt = 0;
  private skyTex: THREE.Texture | null = null;
  quality = '';
  camTarget = new THREE.Vector3();
  private camGroundS = -1e9;
  private tmpV = new THREE.Vector3();
  private iconTex = new Map<string, THREE.Texture>();

  constructor(private g: Game, public canvas: HTMLCanvasElement, public overlay: HTMLCanvasElement) {
    const q = store.get().settings.quality;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: q !== 'low', powerPreference: 'high-performance', stencil: false });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    // telefonda güneş gölgesi yok (zemin gölgeleri var): en pahalı geçiş kalkar, sahne parlak kalır
    this.renderer.shadowMap.enabled = q !== 'low' && DYN_SHADOWS;
    this.renderer.shadowMap.type = MOBILE ? THREE.PCFShadowMap : THREE.PCFSoftShadowMap;
    // telefonda gölge haritası iki karede bir yenilenir (karakter gölgeleri 30 Hz'de akıcı görünür)
    if (MOBILE) this.renderer.shadowMap.autoUpdate = false;
    this.octx = overlay.getContext('2d')!;
    this.scene.add(this.world, this.dyn, this.fx.group, this.sun, this.sun.target, this.hemi);
    this.sun.castShadow = true;
    // sis uzaklaştı: gölge alanı görünen sahnenin büyük kısmını kapsar (gölge sınırı göze batmasın)
    const ms = q === 'high' ? 2048 : 1024;
    this.sun.shadow.mapSize.set(ms, ms);
    const sc = this.sun.shadow.camera; sc.left = -40; sc.right = 40; sc.top = 40; sc.bottom = -40; sc.near = 1; sc.far = 140;
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
    // asa ucu: eldeki silahın kutusunun merkezinden, el → merkez yönünde silahın uzak ucuna
    const tipBox = new THREE.Box3(), tipC = new THREE.Vector3(), tipH = new THREE.Vector3();
    this.fx.tipOf = (id) => {
      const v = id === this.g.selfId ? this.self : this.views.get(id);
      const w = v?.obj.getObjectByName('held-weapon');
      if (!v || !w || !v.glb?.hand) return null;
      v.obj.updateMatrixWorld(true);
      tipBox.setFromObject(w); tipBox.getCenter(tipC);
      v.glb.hand.getWorldPosition(tipH);
      const d = tipC.clone().sub(tipH), len = d.length();
      if (len < 0.05) return tipC.clone();
      return tipC.clone().addScaledVector(d.normalize(), len + 0.22);
    };
    this.fx.swingTimeOf = (id) => { const v = id === this.g.selfId ? this.self : this.views.get(id); return v?.glb?.swingTime?.() ?? -1; };
    this.fx.trails.swingTimeOf = this.fx.swingTimeOf;
    this.fx.cam = this.camera;
    this.fx.handLOf = (id) => { const v = id === this.g.selfId ? this.self : this.views.get(id); const h = v?.glb?.bones.handL; if (!h) return null; v!.obj.updateMatrixWorld(true); return h.getWorldPosition(new THREE.Vector3()); };
    this.fx.heightOf = (id) => { const v = id === this.g.selfId ? this.self : this.views.get(id); return v?.height ?? 1.8; };
    // silah izi için bıçak ekseni: silahın kendi ekseninde bir kez ölçülür (en uzun kutu ekseni, elden uzak uç), sonra
    // her karede silahın dünya dönüşümüyle taşınır (ucuz)
    const bladeLocal = new WeakMap<THREE.Object3D, { b: THREE.Vector3; t: THREE.Vector3 }>();
    const hw = new THREE.Vector3();
    this.fx.trails.bladeOf = (id) => {
      const v = id === this.g.selfId ? this.self : this.views.get(id);
      const w = v?.obj.getObjectByName('held-weapon');
      if (!v || !w || !v.glb?.hand || !w.visible) return null;
      let c = bladeLocal.get(w);
      if (!c) {
        v.obj.updateMatrixWorld(true);
        const inv = w.matrixWorld.clone().invert(), box = new THREE.Box3(), tmp = new THREE.Box3();
        w.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh || !m.geometry) return; m.geometry.computeBoundingBox(); tmp.copy(m.geometry.boundingBox!).applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld)); box.union(tmp); });
        if (box.isEmpty()) return null;
        const hand = w.worldToLocal(v.glb.hand.getWorldPosition(hw.clone()));
        const sz = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
        const ax = sz.x >= sz.y && sz.x >= sz.z ? 0 : sz.y >= sz.z ? 1 : 2;
        const tip = ctr.clone(), half = sz.getComponent(ax) / 2;
        tip.setComponent(ax, ctr.getComponent(ax) + (hand.getComponent(ax) <= ctr.getComponent(ax) ? half : -half));
        c = { b: hand.clone().lerp(tip, 0.4), t: tip };
        bladeLocal.set(w, c);
      }
      return { base: w.localToWorld(c.b.clone()), tip: w.localToWorld(c.t.clone()) };
    };
    this.setupComposer();
    loadManifest();
    // model yüklenemezse boş yer tutucular prosedürel modelle yeniden kurulur
    this.offs.push(onModelStatus(() => {
      for (const [eid, v] of this.views) if (v.ph && !modelPending(v.model!)) { releaseView(v); this.views.delete(eid); }
      if (this.self?.ph && !modelPending(this.self.model!)) { releaseView(this.self); this.self = null; }
      this.npcViews = this.npcViews.map((v) => {
        if (!v.ph || modelPending(v.model!)) return v;
        const nv = this.humanView(v.model!, 99, v.lx, v.ly);
        nv.obj.position.copy(v.obj.position); nv.yaw = v.yaw;
        this.dyn.remove(v.obj); this.dyn.add(nv.obj);
        return Object.assign(nv, { npc: (v as unknown as { npc: string }).npc });
      });
    }));
    this.offs.push(onModelReady((id) => {
      // Meshy ağacı geldi: haritanın nesneleri yeni ağaçla yeniden kurulur
      if (MESHY_TREES.includes(id) && this.propsGroup && this.layout?.props.some((p) => p.k === 'tree')) {
        const l = this.layout;
        this.world.remove(this.propsGroup);
        this.propsGroup = buildProps(this.propList(l), (x, y) => this.heightAt(x, y), store.get().settings.quality, !DYN_SHADOWS);
        this.world.add(this.propsGroup);
        this.shadowDirty = true;
      }
      // model geldi: o modeli kullanan görünümleri yeniden kur
      for (const [eid, v] of this.views) if ((v.model === id && !v.glb) || (MONSTER_MESHES[id] && v.model === MONSTER_MESHES[id]) || v.wpend === id || v.apend === id || v.cpend === id) { releaseView(v); this.views.delete(eid); }
      if (this.self && (this.self.wpend === id || this.self.apend === id || this.self.cpend === id)) { releaseView(this.self); this.self = null; }
      if (this.self && this.self.model === id && !this.self.glb) { releaseView(this.self); this.self = null; }
      // NPC'ler: yerinde yeni modelle değiştir
      this.npcViews = this.npcViews.map((v) => {
        if (v.model !== id || v.glb) return v;
        const nv = this.humanView(id, 99, v.lx, v.ly);
        nv.obj.position.copy(v.obj.position); nv.yaw = v.yaw;
        this.dyn.remove(v.obj); this.dyn.add(nv.obj);
        return Object.assign(nv, { npc: (v as unknown as { npc: string }).npc });
      });
    }));
  }

  private setupComposer() {
    const q = store.get().settings.quality;
    this.quality = q;
    // Telefonda efekt zinciri yok: sahne doğrudan ekrana çizilir (donanım kenar yumuşatma, ton eşleme aynı geçişte).
    // Bu, her karede 4–6 tam ekran geçişi ve ortam gölgelendirmesi için sahnenin ikinci kez çizilmesini kaldırır.
    if (q === 'low' || MOBILE || cool()) { this.composer = null; this.bloom = null; return; }
    // Ortam gölgelendirmesi (GTAO) kaldırıldı: düşük çözünürlüklü gürültüsü kamera hareket ettikçe duvar, pencere ve
    // zeminde kayan desenler bırakıyordu ("dalgalanma"). Kenar yumuşatma artık ara görüntüde donanım MSAA'sı ile
    // (ince çit ve pencere çıtaları yürürken titremesin); SMAA'ya gerek kalmadı.
    const rt = new THREE.WebGLRenderTarget(Math.max(1, this.w), Math.max(1, this.h), { type: THREE.HalfFloatType, samples: 4 });
    this.composer = new EffectComposer(this.renderer, rt);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.38, 0.4, 0.9);
    // güvenlik: herhangi bir efekt bozuk (NaN/sonsuz) renk üretirse parlama onu bütün ekrana yaymasın (siyah leke)
    {
      const hp = this.bloom.materialHighPassFilter;
      hp.fragmentShader = hp.fragmentShader.replace('vec4 texel = texture2D( tDiffuse, vUv );', 'vec4 texel = texture2D( tDiffuse, vUv ); if (any(isnan(texel)) || any(isinf(texel))) texel = vec4(0.0); texel = min(texel, vec4(64.0));');
      hp.needsUpdate = true;
    }
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
  }

  heightAt(x: number, y: number) { return this.terrain ? this.terrain.heightAt(x, y) : 0; }

  setLayout(l: MapLayout) {
    this.layout = l;
    // eski dünyayı temizle
    if (this.terrain) { this.world.remove(this.terrain.mesh); if (this.terrain.water) this.world.remove(this.terrain.water); this.terrain.dispose(); }
    for (const c of [...this.world.children]) { this.world.remove(c); }
    for (const v of this.views.values()) releaseView(v);
    this.views.clear();
    for (const v of this.npcViews) releaseView(v);
    this.npcViews = [];
    this.shadowDirty = true; // yeni harita: durağan gölge haritası yeniden çizilsin
    if (this.grass) { this.dyn.remove(this.grass.group); this.grass.dispose(); this.grass = null; }
    const t0 = performance.now();
    this.terrain = new Terrain(l);
    this.world.add(this.terrain.mesh);
    if (this.terrain.water) this.world.add(this.terrain.water);
    const q = store.get().settings.quality;
    this.propsGroup = buildProps(this.propList(l), (x, y) => this.heightAt(x, y), q, !DYN_SHADOWS);
    this.world.add(this.propsGroup);
    this.nyFx?.dispose(); this.nyFx = null; this.applyNewYear();
    this.towerFx?.dispose(); this.towerFx = null;
    if (l.def.id === 'tower') { this.towerFx = new TowerFx(l, (x, y) => this.heightAt(x, y)); this.world.add(this.towerFx.group); }
    this.forgeFx?.dispose(); if (this.forgeFx) this.world.remove(this.forgeFx.group); this.forgeFx = null;
    if (l.def.id === 'forge') { this.forgeFx = new ForgeFx(l, (x, y) => this.heightAt(x, y)); this.world.add(this.forgeFx.group); }
    this.gardenFx?.dispose(); if (this.gardenFx) this.world.remove(this.gardenFx.group); this.gardenFx = null;
    if (l.def.id === GARDEN_MAP) { this.gardenFx = new GardenFx((x, y) => this.heightAt(x, y)); this.world.add(this.gardenFx.group); }
    if (q !== 'low') { this.grass = new GrassField(l, (x, y) => this.heightAt(x, y), q); this.grass.group.visible = !cool(); this.dyn.add(this.grass.group); }
    // NPC'ler
    for (const n of l.npcs) {
      const def = l.def.npcs.find((d) => d.id === n.id);
      const v = this.humanView(def?.art ?? 'merchant', 99, n.x, n.y);
      v.obj.position.set(n.x * U, this.heightAt(n.x, n.y), n.y * U);
      this.dyn.add(v.obj);
      this.npcViews.push(Object.assign(v, { npc: n.id }));
    }
    // tema ışığı
    const th = l.def.id === 'worldboss' ? THEME.wboss : THEME[l.def.theme as keyof typeof THEME] ?? THEME.forest;
    this.scene.fog = new THREE.Fog(th.fog, th.near, th.far);
    this.camera.far = th.far + 20; this.camera.updateProjectionMatrix(); // sisin ötesi çizilmez
    this.scene.background = this.skyGradient(th.top, th.fog);
    // ufukta dağlar (beyaz boşluk yerine manzara)
    if (this.mountains) { this.scene.remove(this.mountains); for (const c of this.mountains.children) (c as THREE.Mesh).geometry.dispose(); this.mountains.geometry.dispose(); (this.mountains.material as THREE.Material).dispose(); }
    this.mountains = buildMountains(l.def.theme, l.def.id.length * 13 + 5, MOBILE);
    this.scene.add(this.mountains);
    this.mtnTheme = l.def.theme; this.mtnSeed = l.def.id.length * 13 + 5;
    this.rebuildMeshMountains();
    this.sun.color.set(th.sun); this.sun.intensity = th.sunI;
    this.hemi.color.set(th.sky); this.hemi.groundColor.set(th.ground); this.hemi.intensity = th.hemi;
    this.baseExp = th.exp;
    this.renderer.toneMappingExposure = th.exp * TUNING.brightness;
    this.th = th; this.thId = l.def.theme; this.dnAt = 0; this.skyKey = '';
    this.buildLampGlow(l);
    // kendi karakterini yeniden ekle
    if (this.self) this.dyn.add(this.self.obj);
    console.debug('[3d] harita kuruldu', l.def.id, Math.round(performance.now() - t0), 'ms');
    this.mapAt = performance.now();
  }

  /** Son 2 sn'nin ortalamasına göre çizim çözünürlüğünü ayarla (hedef 60 FPS). */
  private resLow = 0; private resHigh = 0;
  private adaptResolution(now: number, dt: number) {
    if (this.fixedScale !== null) { this.dynScale = this.fixedScale; return; }
    if (document.hidden) return;
    this.fpsAcc += dt; this.fpsFrames++;
    if (now - this.fpsAt < 2000) return;
    const fps = (this.fpsFrames * 1000) / Math.max(1, this.fpsAcc);
    this.fpsAt = now; this.fpsAcc = 0; this.fpsFrames = 0;
    // hedef akıcı 60 FPS: 50'nin altında çözünürlük kademeli düşer, 57'nin üstünde geri çıkar
    // hedef, seçilen kare sınırı (30 seçiliyken 60'a ulaşamadığı için çözünürlüğü boşuna düşürüyordu);
    // telefonda en düşük %80: daha düşük çözünürlükte zemin ve çimen kenarları titriyordu
    // Çözünürlük her değiştiğinde ince çizgiler (çit, pencere, zemin deseni) bir an kayar; yürürken sık sık inip
    // çıkması "dalgalanma" gibi görünüyordu. Artık 0,1'lik kademelerle ve ancak birkaç ölçüm üst üste aynı yönü
    // gösterince değişir (düşük: 2 ölçüm ≈ 4 sn, yüksek: 4 ölçüm ≈ 8 sn); arada salınım olmaz.
    const cap = cool() ? 60 : store.get().settings.fpsCap || 60, floor = MOBILE ? (this.perfLvl >= 3 ? 0.65 : 0.8) : 0.6;
    // Telefon/tablet: 90 Hz ekranda 60 kare için kare 11 ms'ye sığmalı; sığmayınca tam 45'te kalır. Bu yüzden
    // 55'in altı da "düşük" sayılır ve çözünürlük tabanına inildiğinde sırayla hafifletilir (oturum boyunca kalır):
    // 1) uzak modeller daha erken sadeleşir, çimen kapanır · 2) zemin hafifler (kabartma ve yansıma yerine düz gökyüzü
    // ışığı), ağır beceri efektleri sadeleşir · 3) çözünürlük tabanı 0,65'e iner. Ulaşılan kademe cihazda hatırlanır
    // (bir sonraki girişte uyum beklenmez); görüntü kalitesi değiştirilince sıfırlanır. Bilgisayarda eski davranış.
    const low = MOBILE ? cap * 0.92 : cap * 0.8;
    if (fps < low) { this.resLow++; this.resHigh = 0; } else if (fps > cap * 0.95) { this.resHigh++; this.resLow = 0; } else { this.resLow = 0; this.resHigh = 0; }
    if (MOBILE && this.resLow >= 2 && this.dynScale <= floor + 0.001 && this.perfLvl < 3 && now - this.mapAt > 12_000) {
      this.perfLvl++; this.resLow = 0; console.info('[3d] otomatik hafifletme kademesi', this.perfLvl, Math.round(fps), 'fps');
      if (this.persistPerf) try { localStorage.setItem(PERF_KEY, String(this.perfLvl)); } catch { /* özel pencere */ }
    }
    if (this.resLow >= 2 && this.dynScale > floor) {
      // telefon/tablet: 60'ı tutturamayan çözünürlüğe bu oturumda geri çıkılmaz (inip çıkıp titremesin)
      if (MOBILE) this.dynMax = Math.min(this.dynMax, Math.round((this.dynScale - 0.1) * 10) / 10);
      this.dynScale = Math.max(floor, Math.round((this.dynScale - 0.1) * 10) / 10); this.resLow = 0;
    }
    else if (this.resHigh >= 4 && this.dynScale < this.dynMax) { this.dynScale = Math.min(this.dynMax, Math.round((this.dynScale + 0.1) * 10) / 10); this.resHigh = 0; }
  }

  // ───────── gece-gündüz (Türkiye saati) ─────────
  private th: (typeof THEME)[keyof typeof THEME] | null = null; private thId = 'forest';
  private dnAt = 0; private dnExp = 1; private skyKey = ''; private dnNight = 0;
  private stars: THREE.Points | null = null;
  private lampGlow: THREE.Group | null = null; private lampMat: THREE.SpriteMaterial | null = null; private lampPool: THREE.MeshBasicMaterial | null = null;
  private dnC = { a: new THREE.Color(), b: new THREE.Color() };
  private mtnHaze = new THREE.Color(); private mtnHazeOf: THREE.Object3D | null = null;
  /** Köy fenerleri: gece sıcak hale ve yerde ışık havuzu (ışık kaynağı yok: ucuz) */
  private buildLampGlow(l: MapLayout) {
    if (this.lampGlow) { this.world.remove(this.lampGlow); this.lampGlow.traverse((o) => { const m = o as THREE.Mesh; if (m.geometry && m.geometry !== this.poolGeo) m.geometry.dispose(); }); this.lampGlow = null; }
    const lamps = l.props.filter((p) => p.k === 'lamp');
    if (!lamps.length) return;
    this.lampMat ??= new THREE.SpriteMaterial({ map: glowTexture(), color: 0xffb860, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0, fog: false });
    this.lampPool ??= new THREE.MeshBasicMaterial({ map: glowTexture(), color: 0xffa040, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: 0 });
    const g = new THREE.Group(); g.visible = false;
    for (const p of lamps) {
      const s = p.s ?? 1, y = this.heightAt(p.x, p.y);
      const sp = new THREE.Sprite(this.lampMat); sp.position.set(p.x * U, y + 3.15 * s, p.y * U); sp.scale.setScalar(2.4 * s); g.add(sp);
      const d = new THREE.Mesh(this.poolGeo, this.lampPool); d.position.set(p.x * U, y + 0.06, p.y * U); d.scale.setScalar(5 * s); d.renderOrder = 1; g.add(d);
    }
    this.lampGlow = g; this.world.add(g);
  }
  private poolGeo = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);
  /** Yıldızlar: kameranın etrafında üst yarım küre (sise girmez) */
  private buildStars() {
    const n = MOBILE ? 260 : 520, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = 0.12 + Math.pow(Math.random(), 0.7) * 1.3, r = 200;
      pos.set([Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r, Math.sin(a) * Math.cos(e) * r], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const m = new THREE.PointsMaterial({ color: 0xdfe8ff, size: MOBILE ? 1.6 : 2, sizeAttenuation: false, transparent: true, depthWrite: false, fog: false, opacity: 0 });
    this.stars = new THREE.Points(g, m); this.stars.renderOrder = -20; this.stars.frustumCulled = false;
    this.scene.add(this.stars);
  }
  /**
   * Saate göre ışık: gündüz (tema), akşamüstü (altın-turuncu güneş, pembe-mor gök, sıcak pus), gece (ay ışığı mavisi,
   * koyu lacivert gök, yıldızlar, fenerler yanar). Gece zifiri değil: güneş/gök ışığı ve pozlama yönetimdeki
   * "koyuluk" oranında kısılır (en çok %85). Kapalı alan haritaları (kuleler) etkilenmez. 250 ms'de bir hesaplanır.
   */
  private applyDayNight(now: number) {
    const th = this.th; if (!th) return;
    if (this.dnAt && now - this.dnAt < 250) return;
    this.dnAt = now;
    const T = TUNING.dayNight, st = store.get();
    const indoor = this.thId === 'tower' || this.thId === 'forge';
    const on = T.enabled && !indoor && st.settings.dayNight !== false;
    const w = on ? dayNightAt(T, trHour(Date.now() + (st.clockSkew ?? 0))) : { night: 0, dusk: 0, label: 'Gündüz' as const };
    const n = w.night, d = w.dusk * (1 - n), dk = T.dark;
    const C = (day: number, dusk: number, night: number, out: THREE.Color) => out.set(day).lerp(this.dnC.a.set(dusk), d).lerp(this.dnC.b.set(night), n);
    // gece paleti koyuluğa göre: koyu lacivert ↔ okunaklı ay mavisi
    const nightFog = new THREE.Color(0x0e1630).lerp(new THREE.Color(0x3a4a70), 1 - dk);
    const fog = (this.scene.fog as THREE.Fog | null)?.color;
    if (fog) C(th.fog, 0xf08a5a, nightFog.getHex(), fog);
    C(th.sun, 0xff7428, 0x86a2ff, this.sun.color);
    C(th.sky, 0xff9a64, 0x5468a8, this.hemi.color);
    C(th.ground, 0x6a4a3a, 0x1e2232, this.hemi.groundColor);
    const lerp = (a: number, b: number, c: number) => a + (b - a) * d + (c - (a + (b - a) * d)) * n;
    this.sun.intensity = lerp(th.sunI, th.sunI * 0.85, th.sunI * (0.42 - 0.4 * dk));
    this.hemi.intensity = lerp(th.hemi, th.hemi * 0.85, th.hemi * (0.62 - 0.45 * dk));
    this.dnExp = lerp(1, 0.94, 1 - 0.5 * dk);
    this.scene.environmentIntensity = lerp(0.55, 0.4, 0.55 * (1 - 0.9 * dk));
    // gökyüzü degradesi: renk değiştikçe yeniden çizilir (küçük doku)
    const top = C(th.top, 0x6a4a8c, new THREE.Color(0x040818).lerp(new THREE.Color(0x182446), 1 - dk).getHex(), new THREE.Color());
    const key = top.getHexString() + (fog?.getHexString() ?? '');
    if (key !== this.skyKey && fog) { this.skyKey = key; this.scene.background = this.skyGradient(top.getHex(), fog.getHex()); }
    // dağlar: ışık çarpanı ve pus
    mtnLight.value.setRGB(1, 1, 1).lerp(this.dnC.a.setRGB(1.05, 0.7, 0.55), d).lerp(this.dnC.b.setRGB(0.28 + 0.4 * (1 - dk), 0.33 + 0.4 * (1 - dk), 0.5 + 0.35 * (1 - dk)), n);
    const mu = (this.mountains?.material as THREE.ShaderMaterial | undefined)?.uniforms?.uHaze;
    if (mu && fog) { if (this.mtnHazeOf !== this.mountains) { this.mtnHazeOf = this.mountains; this.mtnHaze.copy(mu.value); } mu.value.copy(this.mtnHaze).lerp(fog, Math.max(d * 0.6, n)); }
    if (this.meshMtn && fog) this.meshMtn.haze.copy(fog);
    // yıldızlar ve fenerler
    this.dnNight = n;
    if (n > 0.05 && !indoor) { if (!this.stars) this.buildStars(); }
    if (this.stars) { this.stars.visible = n > 0.05 && !indoor; (this.stars.material as THREE.PointsMaterial).opacity = Math.max(0, n - 0.1) * 0.95; this.stars.position.copy(this.camera.position); }
    const lamp = Math.max(n, d * 0.5);
    if (this.lampGlow) { this.lampGlow.visible = lamp > 0.05; if (this.lampMat) this.lampMat.opacity = 0.85 * lamp; if (this.lampPool) this.lampPool.opacity = 0.32 * lamp; }
    if (st.dayPhase !== w.label && on) store.set({ dayPhase: w.label });
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
  /** Vuruş duraklaması: verilen varlıkların animasyonu kısa süre donar (darbe ağırlığı hissi). */
  private stops = new Map<number, number>();
  /** Model yükleme aboneliklerinin kaldırıcıları (oyun kapanınca bırakılır; yoksa eski dünya bellekte kalıyordu). */
  private offs: (() => void)[] = [];
  /** Oyun ekranı kapanınca: abonelikleri kaldır, ekran kartı kaynaklarını ve WebGL bağlamını bırak. */
  dispose() {
    for (const f of this.offs) f();
    this.offs = [];
    this.nyFx?.dispose();
    for (const v of this.views.values()) releaseView(v);
    this.views.clear();
    try { this.renderer.dispose(); this.renderer.forceContextLoss(); } catch { /* */ }
  }
  hitStop(ids: number[], ms: number) { const until = performance.now() + ms; for (const id of ids) this.stops.set(id, until); }
  private frozen(id: number, now: number) { const u = this.stops.get(id); if (u === undefined) return false; if (now < u) return true; this.stops.delete(id); return false; }
  clickMark(x: number, y: number) { this.clicks.push({ x, y, t: performance.now() }); }

  resize() {
    const q = store.get().settings.quality;
    const cm = cool();
    if (q !== this.quality || cm !== this.coolOn) {
      // görüntü kalitesi elle değiştirildi: otomatik hafifletme baştan (telefon/tablet)
      if (MOBILE && this.quality && q !== this.quality) { this.perfLvl = 0; this.dynScale = 1; this.dynMax = 1; if (this.persistPerf) try { localStorage.removeItem(PERF_KEY); } catch { /* */ } }
      this.coolOn = cm;
      this.setupComposer();
      this.renderer.shadowMap.enabled = q !== 'low' && DYN_SHADOWS && !cm;
      if (this.grass) this.grass.group.visible = !cm;
      this.shadowDirty = true;
    }
    const maxDpr = cm ? (MOBILE ? 0.85 : 1) : MOBILE ? (q === 'high' ? 1.3 : q === 'medium' ? 1.1 : 0.9) : (q === 'high' ? 1.75 : q === 'medium' ? 1.25 : 1);
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    // Telefon/tablette piksel bütçesi: aynı oranla büyük ekranlı tablet (1280×800 CSS) telefonun ~1,6 katı piksel
    // çiziyordu; GPU'su telefonunkinden zayıfken kare süresi aşılıyordu. Telefonlar bütçenin altında kalır (değişmez).
    const budget = cm ? 0.6e6 : q === 'high' ? 1.25e6 : q === 'medium' ? 0.95e6 : 0.7e6;
    const fit = MOBILE ? Math.sqrt(budget / Math.max(1, w * h)) : 9;
    const dpr = Math.round(Math.max(0.6, Math.min(window.devicePixelRatio || 1, maxDpr, fit) * this.dynScale) * 20) / 20;
    if (w !== this.w || h !== this.h || dpr !== this.dpr) {
      this.w = w; this.h = h; this.dpr = dpr;
      this.renderer.setPixelRatio(dpr);
      this.renderer.setSize(w, h, false);
      this.composer?.setPixelRatio(dpr);
      this.composer?.setSize(w, h);
      this.camera.aspect = w / Math.max(1, h);
      this.camera.updateProjectionMatrix();
      const odpr = Math.min(window.devicePixelRatio || 1, MOBILE ? 1.3 : 2);
      this.overlay.width = Math.round(w * odpr); this.overlay.height = Math.round(h * odpr);
      this.octx.setTransform(odpr, 0, 0, odpr, 0, 0);
      this.fx.setScale(h * dpr * 0.9);
      gearFxScale.value = h * dpr * 0.9;
    }
  }

  // ───────── görünüm yönetimi ─────────
  private ensureSelf() {
    const cls = this.g.cls;
    // silah nadirliği değişince (yeni silah kuşanıldı) görünüm yeniden kurulur
    const eq = store.get().self?.equip, ri = (it?: { rarity: string }) => (it ? Math.max(0, RARITIES.indexOf(it.rarity as never)) : 0);
    const wr = ri(eq?.weapon) | (ri(eq?.armor) << 4) | (Math.min(15, eq?.weapon?.plus ?? 0) << 8) | (cosmeticByte(store.get().self?.buffs, Date.now()) << 12) | (Math.min(3, eq?.weapon?.evo ?? 0) << 16) | (Math.min(3, eq?.armor?.evo ?? 0) << 18) | (armorPlusTier(eq?.armor?.plus) << 20);
    if (this.self && this.selfCls === cls && this.selfWR === wr) return this.self;
    if (this.self) releaseView(this.self);
    this.selfWR = wr;
    this.self = this.humanView(cls, Kind.PLAYER, this.g.dx, this.g.dy, wr);
    this.selfCls = cls;
    this.dyn.add(this.self.obj);
    return this.self;
  }

  /** Oyuncu/NPC görünümü: hazır 3B model (GLB) varsa onu, yoksa prosedürel modeli kullanır. */
  private humanView(modelId: string, kind: number, x: number, y: number, gear = 0): View {
    const gr = gearRarity(gear);
    // nadir zırh: Meshy'de tasarlanmış zırhlı çeşit (aynı iskelet ve animasyonlar); yüklenene dek temel model
    const vid = kind === Kind.PLAYER && gr.armor > 0 ? `${modelId}_${['', 'blue', 'orange', 'crimson', 'unique'][Math.min(4, gr.armor)]}` : '';
    const designed = !!vid && hasModel(vid);
    let glb = designed ? createGlbChar(vid) : null;
    const apend = designed && !glb ? vid : null;
    glb ??= createGlbChar(modelId);
    const ev = gearEvo(gear);
    const wpend = glb ? equipGlb(glb, LOOKS[modelId], gr.weapon, gr.plus, kind === Kind.PLAYER ? ev.weapon : 0) : null;
    if (glb) {
      prepDynamic(glb.root, 0.55);
      if (kind === Kind.PLAYER && !designed) equipArmor(glb, modelId, gr.armor);
      const aura = armorFx(gr.armor);
      if (aura) glb.root.add(aura);
      if (gr.plus >= 6) glb.root.add(sigilFx());
      // zırh +5/+6: gövdeden yükselen duman ve kıvılcım (bit 20-21)
      const apFx = kind === Kind.PLAYER ? armorPlusFx((gear >> 20) & 3, glb.height) : null;
      if (apFx) glb.root.add(apFx);
      const evoAura = kind === Kind.PLAYER ? evoArmorFx(ev.armor, glb.height) : null;
      if (evoAura) glb.root.add(evoAura);
      const gfx: THREE.Object3D[] = [];
      if (gear) glb.root.traverse((o) => { if (o.name === 'gear-fx' || o.name === 'plus-fx') gfx.push(o); });
      // Nesne Market kozmetikleri (bit 12-14): kanat sırta, evcil hayvan yanına
      const cos = kind === Kind.PLAYER ? (gear >> 12) & 7 : 0;
      let cpend: string | null = null, wings: View['wings'] = null, pet: Pet | null = null;
      if (cos & 4) { wings = createWings(glb.height - 0.2, glb.root); if (wings) glb.root.add(wings); else if (modelPending('wings_crimson')) cpend = 'wings_crimson'; }
      if (cos & 3) { pet = createPet(cos & 3, { height: glb.height, charRoot: glb.root, onBark: (wx, wz) => { const d = Math.hypot(wx / U - this.g.dx, wz / U - this.g.dy); if (d < 520) sfx.play('bark', (1 - d / 520) * 0.55); } }); if (pet) glb.root.add(pet.obj); else if (modelPending(PET_MODEL[cos & 3])) cpend = PET_MODEL[cos & 3]; }
      return { kind, obj: glb.root, glb, model: modelId, height: glb.height, phase: 0, lx: x, ly: y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, gfx, wpend, apend, wings, pet, cpend };
    }
    // asıl model yükleniyorsa geçici prosedürel modeli gösterme: kısa bir süre boş kalsın, model gelince kurulur
    if (modelPending(modelId)) return { kind, obj: new THREE.Group(), model: modelId, height: 2.0, phase: 0, lx: x, ly: y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, ph: true };
    const rig = createHumanoid(LOOKS[modelId] ?? LOOKS.merchant);
    prepDynamic(rig.root, 0.55);
    return { kind, obj: rig.root, rig, model: modelId, height: 2.0, phase: 0, lx: x, ly: y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
  }

  private viewFor(e: CEnt): View | null {
    let v = this.views.get(e.id);
    // kozmetik baytı: bit 0-2 evcil hayvan/kanat, bit 3-4 zırh +5/+6 efekti
    const gbOf = (q: CEnt) => q.weapon | ((q.wplus & 15) << 8) | (((q.cos ?? 0) & 7) << 12) | (((q.wplus >> 4) & 15) << 16) | ((((q.cos ?? 0) >> 3) & 3) << 20);
    if (v && e.kind === Kind.PLAYER && (v as View & { wr?: number }).wr !== gbOf(e)) { releaseView(v); this.views.delete(e.id); v = undefined; }
    if (v) return v;
    if (e.kind === Kind.PLAYER) {
      const gb = gbOf(e);
      v = this.humanView(CLASS_IDS[e.cls] ?? 'guardian', e.kind, e.x, e.y, gb);
      (v as View & { wr?: number }).wr = gb;
    } else if (e.kind === Kind.MONSTER) {
      const def = MONSTERS[e.tpl];
      if (!def) return null;
      const glb = createGlbChar(def.art);
      if (!glb && modelPending(def.art)) v = { kind: e.kind, obj: new THREE.Group(), model: def.art, height: 2.6 * def.size, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, ph: true };
      else if (glb) { glb.root.scale.multiplyScalar(def.size * (e.variant === 2 ? 1.12 : 1)); v = { kind: e.kind, obj: glb.root, glb, model: def.art, height: glb.height * def.size, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 }; }
      else {
        const mon = createMonster(def.art, e.variant, def.size);
        v = { kind: e.kind, obj: mon.root, mon, model: def.art, height: mon.height, phase: Math.random() * 6, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0 };
      }
    } else if (e.kind === Kind.LOOT) {
      const grp = new THREE.Group();
      const tex = this.lootTex(e.icon, e.rarity);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, alphaTest: 0.03 }));
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
      // Kristal Sandık (etkinlik): simge yerine küçük 3B sandık; tek model paylaşılır (geometri/doku kopyalanmaz),
      // gölge yok, ışık yok — yalnız camgöbeği hale ve sandığın hafif süzülüp dönmesi. Model gelene dek simge görünür.
      if (e.icon === 'crystal_chest') {
        const put = () => {
          const L = loadModelRaw('crystal_chest'); if (!L) return false;
          const m = L.scene.clone(true);
          const box = new THREE.Box3().setFromObject(m), sz = box.getSize(new THREE.Vector3());
          const k = 0.62 / Math.max(0.01, sz.x, sz.y, sz.z);
          m.scale.setScalar(k); m.position.set(-(box.min.x + box.max.x) / 2 * k, -box.min.y * k, -(box.min.z + box.max.z) / 2 * k);
          m.traverse((o) => { const mm = o as THREE.Mesh; if (mm.isMesh) { mm.castShadow = false; mm.receiveShadow = false; } });
          const hold = new THREE.Group(); hold.name = 'chest3d'; hold.add(m); grp.add(hold);
          sp.visible = false; glow.scale.set(1.5, 0.6, 1);
          return true;
        };
        if (!put()) { const off = onModelReady((id) => { if (id === 'crystal_chest' && put()) off(); }); }
        (glow.material as THREE.SpriteMaterial).color.set('#7ff0ff');
      }
      v = { kind: e.kind, obj: grp, height: 1, phase: 0, lx: e.x, ly: e.y, yaw: 0, state: 'idle', stateAt: 0, deadAt: 0, sprite: sp, beam };
    } else return null;
    if (e.kind !== Kind.LOOT) prepDynamic(v.obj, e.kind === Kind.MONSTER ? 0.8 : 0.55);
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

  /**
   * Ayak sesi animasyonla senkron: ayak kemiğinin köke göre yüksekliği izlenir; ayak inip yere değdiği anda
   * (alt eşiğin altına geçince) bir adım sesi çalınır, yeniden kalkınca tekrar kurulur. Eşikler her karakterin
   * kendi animasyonundan öğrenilir (en alçak/en yüksek ayak yüksekliği), böylece yürüme ve koşmada da tutar.
   */
  private footContact(v: View, x: number, y: number) {
    const b = v.glb!.bones; if (!b.footL || !b.footR) return;
    const fv = v as View & { fc?: { min: number[]; max: number[]; armed: boolean[]; last: number; lastFoot: number } };
    const walking = v.state === 'walk' && (v.speed ?? 0) > 0.6;
    if (!walking) { if (fv.fc) fv.fc.armed = [false, false]; return; }
    if (v !== this.self && Math.hypot(x - this.g.dx, y - this.g.dy) > 700) return;
    const fc = (fv.fc ??= { min: [1e9, 1e9], max: [-1e9, -1e9], armed: [false, false], last: -1e9, lastFoot: -1 });
    const now = performance.now();
    const baseY = v.obj.position.y;
    [b.footL, b.footR].forEach((f, i) => {
      f.updateWorldMatrix(true, false);
      const h = f.getWorldPosition(_footP).y - baseY;
      // öğrenilen aralık yavaşça güncellenir (uç değerlere hızlı, geri yavaş)
      fc.min[i] = h < fc.min[i] ? h : fc.min[i] + (h - fc.min[i]) * 0.012;
      fc.max[i] = h > fc.max[i] ? h : fc.max[i] + (h - fc.max[i]) * 0.012;
      const r = fc.max[i] - fc.min[i]; if (r < 0.04) return;
      // ayaklar sırayla basar (aynı ayak art arda sayılmaz), iki adım arası en az 140 ms
      if (fc.armed[i] && h < fc.min[i] + r * 0.38) {
        fc.armed[i] = false;
        if ((i !== fc.lastFoot || now - fc.last > 700) && now - fc.last > 140) { fc.last = now; fc.lastFoot = i; this.footstep(v === this.self, x, y); }
      }
      else if (!fc.armed[i] && h > fc.min[i] + r * 0.6) fc.armed[i] = true;
    });
  }

  private stepBudget = 0; private stepFrame = -1;
  /** Ayak sesi: kendi adımın tam, yakındaki oyuncularınki uzaklıkla kısılarak (karede en çok 3 yabancı adım). */
  private footstep(isSelf: boolean, x: number, y: number, force?: 'hoof') {
    const l = this.layout; if (!l) return;
    let k = 1;
    if (!isSelf) {
      if (this.stepFrame !== this.frameNo) { this.stepFrame = this.frameNo; this.stepBudget = 3; }
      if (this.stepBudget <= 0) return;
      const d = Math.hypot(x - this.g.dx, y - this.g.dy);
      k = Math.pow(Math.max(0, 1 - d / 700), 1.6) * 0.75;
      if (k < 0.05) return;
      this.stepBudget--;
    }
    const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
    const gr = l.ground[Math.max(0, Math.min(l.h - 1, ty)) * l.w + Math.max(0, Math.min(l.w - 1, tx))];
    const surf = gr === 11 ? 'wood' : gr === 3 || gr === 9 ? 'stone' : gr === 2 || gr === 8 ? 'dirt' : gr === 5 ? 'sand' : gr === 6 || gr === 7 ? 'snow' : 'grass';
    sfx.step(force ?? surf, k);
  }

  /** Şifa Bahçesi: bitki toplarken elde orak (silah ve kalkan gizlenir). Orak modeli bir kez kurulur, paylaşılır. */
  private sickleProto: THREE.Group | null = null;
  private syncSickle(v: View, on: boolean) {
    const hv = v as View & { held?: THREE.Object3D[]; sickle?: THREE.Object3D; sickleOn?: boolean; heldOff?: boolean };
    if ((hv.sickleOn ?? false) === on) return;
    hv.sickleOn = on;
    hv.held ??= (() => { const a: THREE.Object3D[] = []; v.obj.traverse((o) => { if (o.name === 'held-weapon') a.push(o); }); return a; })();
    if (!hv.heldOff) for (const o of hv.held) o.visible = !on;
    const hand = v.glb?.hand; if (!hand) return;
    if (!this.sickleProto) {
      const g = new THREE.Group();
      const wood = new THREE.MeshStandardMaterial({ color: '#7a4e2c', roughness: 0.8 }), steel = new THREE.MeshStandardMaterial({ color: '#d8e0e8', metalness: 0.85, roughness: 0.28 }), wrap = new THREE.MeshStandardMaterial({ color: '#4a2c18', roughness: 0.9 });
      const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.34, 8), wood); handle.position.y = 0.05; g.add(handle);
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 8), wrap); grip.position.y = -0.04; g.add(grip);
      const bladeG = new THREE.TorusGeometry(0.16, 0.014, 4, 18, Math.PI * 1.15); bladeG.scale(1, 1, 2.2);
      const blade = new THREE.Mesh(bladeG, steel); blade.position.set(-0.16, 0.22, 0); blade.rotation.z = -0.15; g.add(blade);
      this.sickleProto = g;
    }
    if (!hv.sickle) {
      const s = this.sickleProto.clone();
      const ws = new THREE.Vector3(); hand.getWorldScale(ws); s.scale.setScalar(1 / Math.max(1e-4, ws.x) * (v.obj.scale.x || 1));
      s.rotation.set(Math.PI / 2, 0, 0); s.position.set(0, 0.08 / Math.max(1e-4, ws.x) * (v.obj.scale.x || 1), 0);
      hand.add(s); hv.sickle = s;
    }
    hv.sickle.visible = on;
  }

  /** Balık tutan oyuncu: elde olta, en yakın suya misina ve şamandıra. */
  private syncFish(v: View, on: boolean, x: number, y: number, now: number) {
    // balık tutarken eldeki silah kaldırılır, yerine olta tutulur
    const hv = v as View & { held?: THREE.Object3D[]; heldOff?: boolean };
    if ((hv.heldOff ?? false) !== on) {
      hv.held ??= (() => { const a: THREE.Object3D[] = []; v.obj.traverse((o) => { if (o.name === 'held-weapon') a.push(o); }); return a; })();
      for (const o of hv.held) o.visible = !on;
      hv.heldOff = on;
    }
    let f = this.fishGears.get(v);
    if (!on) { if (f) { this.dyn.remove(f.gear.obj); this.fishGears.delete(v); } return; }
    if (!f) {
      // en yakın su karosu (3 karo içinde); bulunamazsa önüne
      const l = this.layout!, tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
      let bx = x + Math.sin(v.yaw) * 100, by = y + Math.cos(v.yaw) * 100, bd = 1e9;
      for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) {
        const gx = tx + dx, gy = ty + dy; if (gx < 0 || gy < 0 || gx >= l.w || gy >= l.h) continue;
        const gr = l.ground[gy * l.w + gx]; if (gr !== 4 && gr !== 10) continue;
        const d = dx * dx + dy * dy; if (d < bd) { bd = d; bx = (gx + 0.5) * TILE; by = (gy + 0.5) * TILE; }
      }
      // şamandıra kıyıdan biraz içeride: oyuncudan su karosuna doğru 1,4 karo daha
      const ang = Math.atan2(by - y, bx - x), dist = Math.hypot(bx - x, by - y) + TILE * 0.9;
      f = { gear: new FishGear(), wx: (x + Math.cos(ang) * dist) * U, wz: (y + Math.sin(ang) * dist) * U, at: now, seen: 0 };
      this.dyn.add(f.gear.obj); this.fishGears.set(v, f);
    }
    f.seen = this.frameNo;
    const hand = new THREE.Vector3();
    const b = v.glb?.bones;
    if (b?.armR && b.foreArmR && b.handR && b.armL && b.foreArmL && b.handL) {
      // iki elle tutuş: sağ el sapta (bel hizası önde), sol el biraz ileride ve yukarıda; kollar IK ile oraya uzanır
      const P = v.obj.position, sc = Math.max(0.6, ((v.glb!.height ?? 2) - 0.2) / 1.8);
      // karakterin baktığı yön (oyuncu suya döner); sağ el bel hizasında önde, sol el ileride ve yukarıda
      const F = new THREE.Vector3(Math.sin(v.yaw), 0, Math.cos(v.yaw)), R = new THREE.Vector3(-F.z, 0, F.x);
      const gripR = P.clone().addScaledVector(F, 0.24 * sc).addScaledVector(R, -0.1 * sc); gripR.y += 0.98 * sc;
      const gripL = P.clone().addScaledVector(F, 0.46 * sc).addScaledVector(R, -0.02 * sc); gripL.y += 1.16 * sc;
      reachIK([b.armR, b.foreArmR], b.handR, gripR); reachIK([b.armL, b.foreArmL], b.handL, gripL);
      b.handR.getWorldPosition(hand); const hand2 = new THREE.Vector3(); b.handL.getWorldPosition(hand2);
      f.gear.update(hand, new THREE.Vector3(f.wx, 0, f.wz), -0.32, now, hand2);
    } else {
      if (v.glb?.hand) v.glb.hand.getWorldPosition(hand); else hand.copy(v.obj.position).add(new THREE.Vector3(0, 1.2, 0));
      f.gear.update(hand, new THREE.Vector3(f.wx, 0, f.wz), -0.32, now);
    }
  }

  /**
   * Binek: at görünüme çocuk olarak eklenir. Binici her karede atın gövde kemiğine bağlı eyer noktasına oturtulur
   * (atın inip kalkması ve yalpalaması kalçaya birebir geçer). Animasyondan sonra:
   *  - kalça eyerin üstüne taşınır, gövde dörtnalada öne eğilir ve atın yalpasına karşı dengelenir (baş sabit kalır);
   *  - bacaklar iki kemikli IK ile: uyluk atın gövdesini sarar, diz öne-dışa kırılır, ayak üzengide;
   *  - sol el dizgini tutar (saldırı başlayınca yumuşakça bırakır, sağ el silahla serbest).
   * İnince her şey eski hâline döner.
   */
  private syncMount(v: View, on: boolean, now: number, dt: number) {
    type MV = View & { mount?: MountRig | null; mountBase?: THREE.Vector3; ride?: { a: number; b: number; ua: number; ub: number; hipW: number; reinW: number; touched?: [THREE.Object3D, THREE.Quaternion, THREE.Quaternion][] } };
    const mv = v as MV;
    const inner = v.glb?.root.children[0];
    if (!on || !v.glb || !inner) {
      if (mv.mount) { v.obj.remove(mv.mount.obj); mv.mount = null; if (inner && mv.mountBase) inner.position.copy(mv.mountBase); }
      return;
    }
    const b = v.glb.bones;
    if (!mv.mount) {
      const m = createMount(); if (!m) return;
      mv.mount = m; mv.mountBase = inner.position.clone(); v.obj.add(m.obj);
      m.onHoof = () => { const p = v.obj.position; this.footstep(v === this.self, p.x / U, p.z / U, 'hoof'); };
      this.shadowDirty = true;
    }
    if (!mv.ride && b.upLegL && b.legL && b.footL && b.upLegR) {
      const P = (o?: THREE.Object3D) => (o ? o.getWorldPosition(new THREE.Vector3()) : new THREE.Vector3());
      v.obj.updateMatrixWorld(true);
      mv.ride = { a: P(b.upLegL).distanceTo(P(b.legL)), b: P(b.legL).distanceTo(P(b.footL)), ua: b.armL && b.foreArmL ? P(b.armL).distanceTo(P(b.foreArmL)) : 0, ub: b.foreArmL && b.handL ? P(b.foreArmL).distanceTo(P(b.handL)) : 0, hipW: P(b.upLegL).distanceTo(P(b.upLegR)) / 2, reinW: 1 };
    }
    const m = mv.mount;
    m.update(dt, now, v.speed ?? 0);
    const R = mv.ride;
    if (!R || !b.hips) return;
    // uzak görünümlerde iskelet her karede güncellenmez: önceki karenin eklemeleri birikmesin diye, animasyon
    // dokunmadıysa (kemik hâlâ bizim bıraktığımız açıda) animasyonun verdiği açıya geri dönülür
    const touchList = [b.hips, b.spine, b.spine2, b.upLegL, b.legL, b.upLegR, b.legR, b.armL, b.foreArmL].filter(Boolean) as THREE.Object3D[];
    if (R.touched) for (const [o, pre, post] of R.touched) if (o.quaternion.equals(post)) o.quaternion.copy(pre);
    const pre = touchList.map((o) => o.quaternion.clone());
    v.obj.updateMatrixWorld(true);
    const S = m.seat.matrixWorld;
    const W = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z).applyMatrix4(S);
    // 1) kalça eyerin üstüne (kalça kemiği bacak köklerinin biraz üstünde; oturma kemikleri eyere değsin)
    const hipNow = b.hips.getWorldPosition(new THREE.Vector3());
    const want = W(0, R.a * 0.2, -0.04);
    const par = inner.parent!;
    const d = par.worldToLocal(want.clone()).sub(par.worldToLocal(hipNow.clone()));
    inner.position.add(d);
    inner.updateMatrixWorld(true);
    // 2) gövde: eyerin eğimiyle döner, sonra dörtnala eğilmesi + yalpaya karşı denge
    const sideAx = new THREE.Vector3(1, 0, 0).transformDirection(v.obj.matrixWorld);
    const sq = new THREE.Quaternion(); S.decompose(new THREE.Vector3(), sq, new THREE.Vector3());
    const oq = v.obj.getWorldQuaternion(new THREE.Quaternion());
    const rel = oq.clone().invert().multiply(sq);
    const pitch = Math.asin(THREE.MathUtils.clamp(2 * (rel.w * rel.x - rel.y * rel.z), -1, 1));
    // dövüş duruşu kalçayı/omuzları yana çevirir: atın üstünde leğen ve omuz hattı atın yanal eksenine hizalanır
    const upAx = new THREE.Vector3(0, 1, 0).transformDirection(S), latT = new THREE.Vector3(1, 0, 0).transformDirection(S);
    const yawTo = (l: THREE.Object3D, r: THREE.Object3D) => {
      const lat = l.getWorldPosition(new THREE.Vector3()).sub(r.getWorldPosition(new THREE.Vector3()));
      lat.addScaledVector(upAx, -lat.dot(upAx)).normalize();
      return Math.atan2(new THREE.Vector3().crossVectors(lat, latT).dot(upAx), lat.dot(latT));
    };
    if (b.upLegL && b.upLegR) rotateWorld(b.hips, upAx, yawTo(b.upLegL, b.upLegR));
    rotateWorld(b.hips, sideAx, pitch);
    // eğim dönmesi kalçayı oynatmasın: yeniden eyere oturt
    const hip2 = b.hips.getWorldPosition(new THREE.Vector3());
    inner.position.add(par.worldToLocal(want.clone()).sub(par.worldToLocal(hip2)));
    inner.updateMatrixWorld(true);
    const lean = 0.08 + 0.26 * m.gallop * m.move;
    const spine = b.spine ?? b.hips;
    rotateWorld(spine, sideAx, lean * 0.6 - pitch * 0.55);
    if (b.spine2) rotateWorld(b.spine2, sideAx, lean * 0.4 - pitch * 0.35);
    if (b.armL && b.armR) rotateWorld(b.spine2 ?? spine, upAx, yawTo(b.armL, b.armR) * 0.85);
    // 3) bacaklar: diz öne-dışa, ayak üzengide (topuk biraz aşağıda)
    const hw = m.halfW, reach = R.a + R.b;
    for (const s of [1, -1]) {
      const up = s > 0 ? b.upLegL : b.upLegR, lo = s > 0 ? b.legL : b.legR, ft = s > 0 ? b.footL : b.footR;
      if (!up || !lo || !ft) continue;
      const foot = W(s * (hw + 0.05), R.a * 0.2 - reach * 0.86, 0.06);
      const pole = new THREE.Vector3(s * 0.45, 0, 1).transformDirection(S);
      twoBoneIK(up, lo, ft, foot, pole, R.a, R.b);
    }
    // 4) dizgin: sol el atın boynunun önünde; saldırıda bırakılır
    const attacking = v.state === 'attack' || v.state === 'cast';
    R.reinW += ((attacking ? 0 : 1) - R.reinW) * Math.min(1, dt / (attacking ? 60 : 220));
    if (R.reinW > 0.02 && b.armL && b.foreArmL && b.handL && R.ua > 0) {
      const save = [b.armL.quaternion.clone(), b.foreArmL.quaternion.clone()];
      const hand = W(0.1, R.a * 0.2 + reach * 0.3, 0.36 + 0.08 * m.gallop);
      const pole = new THREE.Vector3(0.5, -0.6, -0.6).transformDirection(S);
      twoBoneIK(b.armL, b.foreArmL, b.handL, hand, pole, R.ua, R.ub);
      if (R.reinW < 0.98) { b.armL.quaternion.copy(save[0].slerp(b.armL.quaternion, R.reinW)); b.foreArmL.quaternion.copy(save[1].slerp(b.foreArmL.quaternion, R.reinW)); b.armL.updateMatrixWorld(true); }
    }
    R.touched = touchList.map((o, i) => [o, pre[i], o.quaternion.clone()]);
  }

  /** Oyuncu görünümünün ayrıntısı: tam (gölge, evcil hayvan, kanat) ya da hafif. Yalnız değişince dolaşır. */
  private setDetail(v: View, full: boolean) {
    const lv = v as View & { full?: boolean; casters?: THREE.Mesh[] };
    if (lv.full === full) return;
    lv.full = full;
    if (!lv.casters) { lv.casters = []; v.obj.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.castShadow) lv.casters!.push(m); }); }
    for (const m of lv.casters) m.castShadow = full;
    if (v.pet) v.pet.obj.visible = full;
    if (v.wings) v.wings.visible = full;
    this.shadowDirty = true;
  }

  private animateView(v: View, x: number, y: number, dir: number | null, anim: number, animStart: number, now: number, dt: number, dead: boolean, faceMotion = false) {
    const mdx = x - v.lx, mdy = y - v.ly;
    const dist = Math.hypot(mdx, mdy) * U;
    const moving = dist > 0.002;
    v.lx = x; v.ly = y;
    v.obj.position.set(x * U, this.heightAt(x, y), y * U);
    // yön: uzak varlıklar yürürken gerçekten gittikleri yöne bakar (sunucunun yön bilgisi konumdan önce gelir;
    // ona bakınca karakter daha dönmeden "aniden" ters yöne çeviriyordu). Dururken / saldırırken sunucu yönü.
    let targetYaw = v.yaw;
    const sv = v as View & { mvx?: number; mvy?: number };
    if (dt > 0) { const kk = Math.min(1, dt / 120); sv.mvx = (sv.mvx ?? 0) * (1 - kk) + (mdx / dt) * kk; sv.mvy = (sv.mvy ?? 0) * (1 - kk) + (mdy / dt) * kk; }
    const mspd = Math.hypot(sv.mvx ?? 0, sv.mvy ?? 0) * 1000 * U; // m/sn
    const acting = anim === Anim.ATTACK || anim === Anim.CAST;
    if (faceMotion && mspd > 0.8 && !(acting && now - animStart < 700)) targetYaw = Math.atan2(sv.mvx!, sv.mvy!);
    else if (dir !== null) { const a = (dir / 256) * Math.PI * 2; targetYaw = Math.atan2(Math.cos(a), Math.sin(a)); }
    let d = targetYaw - v.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
    v.yaw += d * Math.min(1, dt / 90);
    v.obj.rotation.y = v.yaw;
    let st: HState = STATE[anim] ?? 'idle';
    if (dead) st = 'dead';
    else if ((st === 'attack' || st === 'cast') && now - animStart > (st === 'cast' ? CAST_ANIM_MS : ATTACK_ANIM_MS)) st = moving ? 'walk' : 'idle';
    else if ((st === 'idle' || st === 'gather') && moving) st = 'walk';
    else if (st === 'walk' && !moving && now - v.stateAt > 140) st = 'idle';
    if (st === 'walk' && (v as View & { mount?: unknown }).mount) st = 'idle'; // binicinin bacakları yürümez (at yürür)
    if (st !== v.state) { if (!(st === 'idle' && v.state === 'walk' && now - v.stateAt < 140)) { v.state = st; v.stateAt = st === 'attack' || st === 'cast' ? animStart : now; } }
    if (dead && !v.deadAt) v.deadAt = now;
    v.phase += dist * (Math.PI * 2 / 1.55);
    const k = st === 'dead' ? (now - v.deadAt) / 700 : (now - v.stateAt) / (st === 'attack' ? 480 : 600);
    const tt = now / 1000;
    const sp = dt > 0 ? (dist / dt) * 1000 : 0;
    v.speed = (v.speed ?? 0) * 0.8 + sp * 0.2;
    const restart = (v.state === 'attack' || v.state === 'cast') && (v as View & { lastStart?: number }).lastStart !== animStart;
    (v as View & { lastStart?: number }).lastStart = animStart;
    // evcil hayvan ve kanat (her karede; ucuz)
    if (v.pet?.obj.visible) v.pet.update(dt, now, v.obj, moving, (wx, wz) => this.heightAt(wx / U, wz / U));
    v.wings?.tick?.(now / 1000, moving);
    // ayrıntı kısma: kameradan uzak (~24 m+) olanların iskelet animasyonu 3 karede bir, biriken süreyle güncellenir
    // (kalabalıkta/ormanda kare süresinin çoğu iskelet hesabıydı). Durum değişimi ve vuruş başlangıcı hemen işlenir.
    const lv = v as View & { lodAcc?: number; lodSlot?: number };
    const camD2 = v.obj.position.distanceToSquared(this.camTarget);
    // Telefon/tablet: uzaktaki karakter ve canavar sadeleştirilmiş üçgen dizilimiyle çizilir (aynı doku ve iskelet),
    // iskelet animasyonu da daha yakından seyrekleşir. Bilgisayarda değişiklik yok.
    if (MOBILE && v.glb?.setLod) { const gd = this.perfLvl >= 1 ? 8 : 11; v.glb.setLod(camD2 > gd * gd); }
    const cm = cool(), lodD = cm ? 14 : MOBILE ? (this.perfLvl >= 1 ? 10 : 14) : 24, lodN = cm ? 4 : MOBILE ? (camD2 > 24 * 24 ? 3 : 2) : 3;
    const far = camD2 > lodD * lodD;
    let adt = dt;
    if (far && !restart) {
      lv.lodAcc = (lv.lodAcc ?? 0) + dt;
      lv.lodSlot ??= (Math.random() * 3) | 0;
      if ((this.frameNo + lv.lodSlot) % lodN !== 0) return;
      adt = lv.lodAcc; lv.lodAcc = 0;
    } else lv.lodAcc = 0;
    // vuruşta bacaklar: yalnız gerçekten yürürken yürüme bacakları, dururken vuruşun kendi alt gövdesi (öne hamle, kalça,
    // gövde dönüşü). Önceden kare başına 2 mm'lik konum düzeltmesi bile "yürüyor" sayılıyordu: vuruşta yalnız kol ve göğüs oynuyordu.
    const legsWalk = moving && (v.speed ?? 0) > 0.9;
    if (v.glb) v.glb.update(v.state, adt, (v.state === 'attack' || v.state === 'cast') ? legsWalk : moving, v.speed, restart, (v as View & { skill?: number }).skill);
    if (v.kind === Kind.PLAYER && v.glb && !dead && !(v as View & { mount?: unknown }).mount) this.footContact(v, x, y);
    else if (v.rig) animateHumanoid(v.rig, v.state, tt, k, v.phase);
    else if (v.mon) v.mon.update(v.state, tt, k, v.phase);
  }

  // ───────── çerçeve ─────────
  private baseExp = 1;
  private selfWR = 0;
  private mountains: THREE.Mesh | null = null;
  /** Meshy dağ halkası (modeller yüklenince kurulur; o zamana dek yalnız çizimli sıralar görünür) */
  private meshMtn: MeshMountains | null = null; private mtnTheme = 'forest'; private mtnSeed = 7; private mtnWait = false;
  private rebuildMeshMountains() {
    if (this.meshMtn) { this.scene.remove(this.meshMtn.group); this.meshMtn.dispose(); this.meshMtn = null; }
    const get = (id: string) => loadModelRaw(id)?.scene ?? null;
    this.meshMtn = buildMeshMountains(this.mtnTheme, this.mtnSeed, MOBILE, get);
    if (this.meshMtn) { this.meshMtn.haze.copy((this.scene.fog as THREE.Fog).color); this.scene.add(this.meshMtn.group); this.shadowDirty = true; return; }
    if (!this.mtnWait && (hasModel('mountain_a') || modelPending('mountain_a'))) {
      this.mtnWait = true;
      const off = onModelReady((id) => { if (id === 'mountain_a' || id === 'mountain_b') { if (loadModelRaw('mountain_a') && loadModelRaw('mountain_b')) { off(); this.mtnWait = false; this.rebuildMeshMountains(); } } });
    }
  }
  private stallObjs = new Map<string, THREE.Object3D>();
  private shadowDirty = true; private shadowAt = new THREE.Vector3(1e9, 0, 0);
  /** Oyuncu tezgâhları: satıcının çevresinde direkli tente ve önünde tezgâh masası. */
  private syncStalls() {
    const list = store.get().stalls;
    const ids = new Set(list.map((s) => s.id));
    for (const [id, o] of this.stallObjs) if (!ids.has(id)) { this.shadowDirty = true; this.dyn.remove(o); o.traverse((q) => { const m = q as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); }); this.stallObjs.delete(id); }
    for (const sl of list) {
      let o = this.stallObjs.get(sl.id);
      if (!o) { o = makeStall(sl.id); this.stallObjs.set(sl.id, o); this.dyn.add(o); this.shadowDirty = true; }
      o.position.set(sl.x * U, this.heightAt(sl.x, sl.y), sl.y * U);
    }
  }
  private sunDir = new THREE.Vector3(26, 24, 14).normalize();
  private sunRight = new THREE.Vector3().crossVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(26, 24, 14).normalize()).normalize();
  private sunUp = new THREE.Vector3().crossVectors(new THREE.Vector3(26, 24, 14).normalize(), this.sunRight).normalize();
  private snapTmp = new THREE.Vector3();
  /** Gölge kamerasını, ışık uzayında gölge karesi büyüklüğünde adımlara oturtur. */
  private snapShadow(p: THREE.Vector3) {
    const cam = this.sun.shadow.camera;
    const texel = (cam.right - cam.left) / this.sun.shadow.mapSize.x;
    const u = Math.round(p.dot(this.sunRight) / texel) * texel, v = Math.round(p.dot(this.sunUp) / texel) * texel, w = p.dot(this.sunDir);
    const q = this.snapTmp.copy(this.sunRight).multiplyScalar(u).addScaledVector(this.sunUp, v).addScaledVector(this.sunDir, w);
    this.sun.target.position.copy(q);
    this.sun.position.copy(q).addScaledVector(this.sunDir, Math.hypot(26, 24, 14));
    this.sun.target.updateMatrixWorld();
  }
  draw(now: number, dt: number) {
    this.applyDayNight(now);
    this.renderer.toneMappingExposure = this.baseExp * TUNING.brightness * this.dnExp; // yönetim panelinden ışık seviyesi; gece biraz kısık
    this.adaptResolution(now, dt);
    this.resize();
    if (!this.terrain) return;
    const g = this.g;
    shared.time.value = now / 1000;
    this.terrain.update(now);
    if (this.towerFx) { const st = store.get(); this.towerFx.update(now, st.tower, st.towerHold, st.towerSeqAt); }
    if (this.gardenFx) this.gardenFx.update(now, dt, store.get().garden, MOBILE ? this.camTarget : undefined);
    if (this.forgeFx) { const st = store.get(); this.forgeFx.update(now, st.forge, (id) => (id === st.entityId ? this.self?.obj.position : this.views.get(id)?.obj.position) ?? null); }
    // yönetimden yeni yıl aç/kapa: nesneler (çeşme ↔ ağaç) ve süs yeniden kurulur
    if (this.layout && this.nyActive() !== this.nyOn && this.propsGroup) {
      this.world.remove(this.propsGroup);
      this.propsGroup = buildProps(this.propList(this.layout), (x, y) => this.heightAt(x, y), store.get().settings.quality, !DYN_SHADOWS);
      this.world.add(this.propsGroup);
      this.applyNewYear();
    }
    this.nyFx?.update(now, this.renderer.domElement.height);
    // karlı zemin parlama eşiğini aşıp sahneyi pus gibi sarmasın: yalnız ampuller ve yıldız parlasın
    if (this.bloom) this.bloom.threshold = this.nyOn ? 1.3 : 0.9;
    // kendi karakter
    const sv = this.ensureSelf();
    const selfDead = (g.selfFlags & EFlag.DEAD) !== 0;
    let sAnim = g.selfAnim;
    if (g.gatherUntil > now) sAnim = Anim.GATHER;
    else if (!((sAnim === Anim.ATTACK || sAnim === Anim.CAST) && now - g.selfAnimStart < (sAnim === Anim.CAST ? CAST_ANIM_MS : ATTACK_ANIM_MS) - 60)) sAnim = now - g.lastMoveAt < 120 ? Anim.WALK : Anim.IDLE;
    // saldırıda "beceri" yuvası kombo sırasını taşır (1-2-3 vuruş farklı animasyon)
    (sv as View & { skill?: number }).skill = sAnim === Anim.ATTACK ? g.selfCombo : g.selfSkill;
    this.animateView(sv, g.dx, g.dy, g.sdir, sAnim, g.selfAnimStart, now, this.frozen(g.selfId, now) ? 0 : dt, selfDead);
    this.syncFish(sv, (g.selfFlags & EFlag.FISHING) !== 0 && !selfDead, g.dx, g.dy, now);
    this.syncSickle(sv, sv.state === 'gather');
    this.syncMount(sv, (g.selfFlags & EFlag.MOUNTED) !== 0 && !selfDead, now, dt);
    this.selfRing.position.set(g.dx * U, this.heightAt(g.dx, g.dy) + 0.04, g.dy * U);
    // varlıklar
    const seen = new Set<number>();
    const fxNear: { v: View; d: number }[] = [];
    const crowd: { v: View; d: number }[] = [];
    for (const e of g.ents.values()) {
      const v = this.viewFor(e);
      if (!v) continue;
      seen.add(e.id);
      if (e.kind === Kind.LOOT) {
        v.obj.position.set(e.x * U, this.heightAt(e.x, e.y), e.y * U);
        if (v.sprite) v.sprite.position.y = 0.55 + Math.sin(now / 300 + e.id) * 0.06;
        const c3 = v.obj.children.find((o) => o.name === 'chest3d');
        if (c3) { c3.position.y = 0.12 + Math.sin(now / 420 + e.id) * 0.05; c3.rotation.y = now / 1400 + e.id; }
        if (v.beam) (v.beam.material as THREE.MeshBasicMaterial).opacity = 0.7 + Math.sin(now / 250) * 0.3;
        const mine = e.owner === g.charId;
        (v.sprite!.material as THREE.SpriteMaterial).opacity = mine ? 1 : 0.5;
        continue;
      }
      const dead = (e.flags & EFlag.DEAD) !== 0 || e.deadAt > 0;
      (v as View & { skill?: number }).skill = e.anim === Anim.ATTACK ? e.combo ?? 0 : e.skill;
      this.animateView(v, e.x, e.y, e.dir, e.anim, e.animStart, now, this.frozen(e.id, now) ? 0 : dt, dead, !e.slide);
      if (e.kind === Kind.PLAYER) { this.syncFish(v, (e.flags & EFlag.FISHING) !== 0 && !dead, e.x, e.y, now); this.syncSickle(v, v.state === 'gather'); this.syncMount(v, (e.flags & EFlag.MOUNTED) !== 0 && !dead, now, dt); }
      if (v.gfx?.length) fxNear.push({ v, d: (e.x - g.dx) ** 2 + (e.y - g.dy) ** 2 });
      if (e.kind === Kind.PLAYER) crowd.push({ v, d: (e.x - g.dx) ** 2 + (e.y - g.dy) ** 2 });
      // ölü canavar yavaşça kaybolur
      if (e.kind === Kind.MONSTER && dead && v.deadAt) { const k = (now - v.deadAt) / 1500; v.obj.position.y -= Math.max(0, k - 0.5) * 0.8; }
      // isabet titreşimi
      if (e.kbUntil && now < e.kbUntil) {
        // vuruş yönünde geri sekme: hızlı itilip yavaşça yerine döner
        const k = (e.kbUntil - now) / 200, push = Math.sin(k * Math.PI) * 0.16 * k;
        v.obj.position.x += (e.kbX ?? 0) * push; v.obj.position.z += (e.kbY ?? 0) * push;
      } else if (now < e.hurtUntil) { v.obj.position.x += (Math.random() - 0.5) * 0.04; v.obj.position.z += (Math.random() - 0.5) * 0.04; }
    }
    for (const [id, v] of this.views) if (!seen.has(id)) { releaseView(v); this.views.delete(id); }
    for (const [v, f] of this.fishGears) if (f.seen !== this.frameNo) { this.dyn.remove(f.gear.obj); this.fishGears.delete(v); }
    // nadir eşya efektleri: yalnız yakındaki en çok FX_MAX oyuncuda (kalabalıkta cihaz yorulmasın)
    if (fxNear.length > (cool() ? 3 : FX_MAX)) fxNear.sort((a, b) => a.d - b.d);
    const fxMax = cool() ? 3 : FX_MAX;
    for (let i = 0; i < fxNear.length; i++) { const on = i < fxMax && fxNear[i].d < FX_FAR2; for (const o of fxNear[i].v.gfx!) o.visible = on; }
    const full = cool() ? 4 : PLAYER_FULL;
    if (crowd.length > full) crowd.sort((a, b) => a.d - b.d);
    for (let i = 0; i < crowd.length; i++) this.setDetail(crowd[i].v, i < full);
    // NPC'ler: oyuncuya döner
    for (const v of this.npcViews) {
      const toSelf = Math.hypot(g.dx - v.lx, g.dy - v.ly) < 360;
      const a = toSelf ? Math.atan2(g.dx - v.lx, g.dy - v.ly) : 0;
      let d = a - v.yaw; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2;
      v.yaw += d * Math.min(1, dt / 300); v.obj.rotation.y = v.yaw;
      if (v.glb) v.glb.update('idle', dt, false, 0); else if (v.rig) animateHumanoid(v.rig, 'idle', now / 1000 + v.lx, 0, 0);
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
    if (this.grass && MOBILE && this.perfLvl >= 1) this.grass.group.visible = false;
    if (this.grass?.group.visible) this.grass.update(g.dx * U, g.dy * U);
    // pazar tezgâhları
    this.syncStalls();
    // efektler
    this.fx.sk.q = cool() || (MOBILE && this.perfLvl >= 2) ? 0 : MOBILE ? 1 : 2;
    if (MOBILE) { this.terrain.setLite(this.perfLvl >= 2); this.terrain.envI.value = this.scene.environmentIntensity; }
    const warmNow = !this.skWarm;
    if (warmNow) { this.skWarm = true; this.fx.sk.warm(); this.fx.warmShapes(); }
    this.fx.update(dt, now);
    // efekt gölgelendiricileri ilk karede derlenir (ilk vuruş/beceride takılma olmaz)
    if (warmNow) { try { this.renderer.compile(this.scene, this.camera); } catch { /* derleme sonraki karede olur */ } }
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
    if (this.camSpin) this.camYaw += this.camSpin * 0.0021 * Math.min(dt, 50); // ≈ 2,1 rad/sn (eski 60 Hz hızı)
    let dy = this.camYaw - this.camYawS; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
    // telefon/tablet: kare süresi dalgalansa da aynı yumuşaklık (üstel); bilgisayarda eski formül
    this.camYawS += dy * (MOBILE ? 1 - Math.exp(-dt / 90) : Math.min(1, dt / 90));
    this.camZoomS += (this.camZoom * zoom - this.camZoomS) * Math.min(1, dt / 110);
    const zk = THREE.MathUtils.clamp((this.camZoomS - CAM_ZOOM_MIN) / (CAM_ZOOM_MAX - CAM_ZOOM_MIN), 0, 1); // 0 uzak · 1 yakın
    this.camPitch = THREE.MathUtils.clamp(this.camPitch, 0.1, 1.3);
    this.camPitchS += (this.camPitch - this.camPitchS) * Math.min(1, dt / 90);
    const dist = co ? co.dist : THREE.MathUtils.lerp(MOBILE ? 29 : 34, 5.5, zk); // en uzak: PC 34 m, telefon 29 m
    const pitch = co ? co.pitch : this.camPitchS;
    let sx = 0, sy = 0;
    if (this.shakeAmt > 0.002) { sx = (Math.random() - 0.5) * this.shakeAmt; sy = (Math.random() - 0.5) * this.shakeAmt; this.shakeAmt *= Math.pow(0.003, dt / 1000); }
    const hd = Math.cos(pitch) * dist;
    const cx = this.camTarget.x + Math.sin(this.camYawS) * hd + sx, cz = this.camTarget.z + Math.cos(this.camYawS) * hd;
    // kamera yerin içine girmesin (tepe/yamaç)
    const ground = this.heightAt(cx / U, cz / U) + 0.7;
    // zemin sınırı yumuşak izlenir (tümsek üstünden geçerken kamera sıçramasın)
    this.camGroundS = this.camGroundS === -1e9 ? ground : this.camGroundS + (ground - this.camGroundS) * (1 - Math.pow(0.001, dt / 1000));
    this.camera.position.set(cx, Math.max(this.camGroundS, this.camTarget.y + Math.sin(pitch) * dist + sy), cz);
    // alçak açıda biraz yukarı bak: ufuk görünsün
    this.camera.lookAt(this.camTarget.x, this.camTarget.y + 1.1 + (1 - Math.min(1, pitch / 0.6)) * 0.8, this.camTarget.z);
    if (this.mountains) this.mountains.position.set(this.camera.position.x, this.camTarget.y - 2, this.camera.position.z);
    if (this.meshMtn) this.meshMtn.group.position.set(this.camera.position.x, this.camTarget.y - 2, this.camera.position.z);
    this.g.camYaw = this.camYawS;
    shared.cam.value.copy(this.camera.position);
    shared.focus.value.set(tx, ty + 1.0, tz);
    // güneş gölge kamerası oyuncuyu takip eder; gölge haritası karesine oturtulur. Oturtulmadan her
    // karede yarım kare kayıyor ve yürürken bütün gölge kenarları titriyordu.
    if (!MOBILE) this.snapShadow(this.camTarget);
    else if (this.shadowDirty || this.shadowAt.distanceToSquared(this.camTarget) > 2.5 * 2.5) {
      // telefonda durağan gölge haritası: yalnız 2,5 m yürüyünce (ya da dünya değişince) yeniden çizilir
      this.snapShadow(this.camTarget); this.shadowAt.copy(this.camTarget); this.shadowDirty = false;
      this.renderer.shadowMap.needsUpdate = true;
    }
    this.frameNo++;
    if (this.composer) this.composer.render(); else this.renderer.render(this.scene, this.camera);
    this.drawOverlay(now);
    if (this.captureCb) {
      // ekran görüntüsü: WebGL tamponu ancak çizimle aynı görevde okunabilir; isim/hasar katmanı üstüne eklenir
      const cb = this.captureCb; this.captureCb = null;
      try {
        const out = document.createElement('canvas');
        out.width = this.canvas.width; out.height = this.canvas.height;
        const c = out.getContext('2d')!;
        c.drawImage(this.canvas, 0, 0);
        c.drawImage(this.overlay, 0, 0, out.width, out.height);
        out.toBlob((b) => cb(b), 'image/png');
      } catch { cb(null); }
    }
  }
  private captureCb: ((b: Blob | null) => void) | null = null;
  /** Bir sonraki karede oyun görüntüsünü PNG olarak verir. */
  capture(): Promise<Blob | null> { return new Promise((res) => { this.captureCb = res; }); }

  private ambient(dt: number) {
    const q = store.get().settings.quality;
    if (q === 'low' || !this.layout) return;
    const th = this.layout.def.theme;
    const c = this.camTarget;
    const k = dt / 1000 * (q === 'high' ? 1 : 0.5);
    const rx = () => c.x + (Math.random() - 0.5) * 50, rz = () => c.z + (Math.random() - 0.5) * 36;
    if (th === 'frozen' || this.nyOn) for (let i = 0; i < k * (this.nyOn ? 90 : 120); i++) this.fx.spawn(rx(), c.y + 14, rz() - 4, -0.5, -1.6, 0.2, 9000, 0.12, '#ffffff', 0, 0);
    if (th === 'forest' || th === 'village' || th === 'lake') if (Math.random() < k * 6) this.fx.spawn(rx(), c.y + 0.5 + Math.random() * 2, rz(), (Math.random() - 0.5) * 0.4, 0.1, (Math.random() - 0.5) * 0.4, 4000, 0.16, '#e8ff9a', 0, 0.2);
    if (th === 'forest' && Math.random() < k * 4) this.fx.spawn(rx(), c.y + 8, rz(), 0.6, -0.9, 0.3, 9000, 0.14, '#c8a040', -0.05, 0);
    if (th === 'tower' && Math.random() < k * 14) this.fx.spawn(rx(), c.y + 0.2 + Math.random() * 3, rz(), (Math.random() - 0.5) * 0.2, 0.25 + Math.random() * 0.3, (Math.random() - 0.5) * 0.2, 6000, 0.1, Math.random() < 0.6 ? '#9a7cff' : '#5ce0d0', 0, 0.1);
    if (th === 'forge' && Math.random() < k * 22) this.fx.spawn(rx(), c.y + 0.1 + Math.random() * 1.5, rz(), (Math.random() - 0.5) * 0.25, 0.7 + Math.random() * 0.9, (Math.random() - 0.5) * 0.25, 4500, 0.09, Math.random() < 0.7 ? '#ff7a2a' : '#ffd060', 0.02, 0);
    if (th === 'black' && Math.random() < k * 30) this.fx.spawn(rx(), c.y + 0.2, rz(), (Math.random() - 0.5) * 0.3, 0.8 + Math.random(), (Math.random() - 0.5) * 0.3, 5000, 0.12, Math.random() < 0.5 ? '#ff6a3a' : '#c060ff', 0.05, 0);
  }

  // ───────── 2B üst katman: isimler, can barları, sayılar ─────────
  project(x: number, y: number, h: number): { x: number; y: number; vis: boolean } {
    this.tmpV.set(x * U, this.heightAt(x, y) + h, y * U).project(this.camera);
    return { x: (this.tmpV.x * 0.5 + 0.5) * this.w, y: (-this.tmpV.y * 0.5 + 0.5) * this.h, vis: this.tmpV.z < 1 && Math.abs(this.tmpV.x) < 1.2 && Math.abs(this.tmpV.y) < 1.2 };
  }

  /** yeni oyuncu rehberi: altın ok bu dünya noktasını gösterir (sunucu koordinatı); null: ok yok */
  guide: { x: number; y: number } | null = null;
  private drawGuide(now: number) {
    const gd = this.guide; if (!gd) return;
    const ctx = this.octx, g = this.g;
    const dx = gd.x - g.dx, dy = gd.y - g.dy, d = Math.hypot(dx, dy);
    const p0 = this.project(g.dx, g.dy, 0.15);
    if (!p0.vis) return;
    const t = now / 1000;
    if (d > 90) {
      // oyuncunun ayağının çevresinde hedefe dönük, nabız gibi atan altın ok
      const ux = dx / d, uy = dy / d, pA = this.project(g.dx + ux * 160, g.dy + uy * 160, 0.15);
      const a = Math.atan2(pA.y - p0.y, pA.x - p0.x), r = 62 + Math.sin(t * 5) * 6;
      ctx.save();
      ctx.translate(p0.x + Math.cos(a) * r, p0.y + Math.sin(a) * r); ctx.rotate(a);
      ctx.shadowColor = 'rgba(255, 200, 60, .9)'; ctx.shadowBlur = 14;
      const grd = ctx.createLinearGradient(-14, 0, 22, 0); grd.addColorStop(0, '#ffb23a'); grd.addColorStop(1, '#fff2b0');
      ctx.fillStyle = grd; ctx.strokeStyle = 'rgba(70, 35, 5, .9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(24, 0); ctx.lineTo(-6, -17); ctx.lineTo(0, 0); ctx.lineTo(-6, 17); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(-22, -13); ctx.lineTo(-17, 0); ctx.lineTo(-22, 13); ctx.closePath(); ctx.globalAlpha = 0.55; ctx.stroke(); ctx.fill();
      ctx.restore();
      ctx.save(); ctx.font = '800 12px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,.85)'; ctx.fillStyle = '#ffe08a';
      const lx = p0.x + Math.cos(a) * (r + 34), ly = p0.y + Math.sin(a) * (r + 34), txt = `${Math.max(1, Math.round(d / 32))} m`;
      ctx.strokeText(txt, lx, ly); ctx.fillText(txt, lx, ly); ctx.restore();
    }
    // hedef ekrandaysa üstünde zıplayan işaret
    const pt = this.project(gd.x, gd.y, 2.6 + Math.sin(t * 4) * 0.25);
    if (pt.vis && pt.x > 0 && pt.y > 0 && pt.x < this.w && pt.y < this.h) {
      ctx.save(); ctx.shadowColor = 'rgba(255, 200, 60, .9)'; ctx.shadowBlur = 12; ctx.fillStyle = '#ffd24a'; ctx.strokeStyle = 'rgba(70, 35, 5, .9)'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(pt.x, pt.y + 14); ctx.lineTo(pt.x - 11, pt.y - 4); ctx.lineTo(pt.x - 4, pt.y - 4); ctx.lineTo(pt.x - 4, pt.y - 16); ctx.lineTo(pt.x + 4, pt.y - 16); ctx.lineTo(pt.x + 4, pt.y - 4); ctx.lineTo(pt.x + 11, pt.y - 4); ctx.closePath(); ctx.stroke(); ctx.fill();
      ctx.restore();
    }
  }

  private drawOverlay(now: number) {
    const ctx = this.octx, g = this.g;
    ctx.clearRect(0, 0, this.w, this.h);
    this.drawGuide(now);
    const st = store.get();
    const tag = (x: number, y: number, h: number, name: string, color: string, sub?: string, subColor = '#e8dcb8') => {
      const p = this.project(x, y, h); if (!p.vis) return null;
      ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      ctx.font = '700 13px Nunito, sans-serif'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,0.85)';
      ctx.strokeText(name, p.x, p.y); ctx.fillStyle = color; ctx.fillText(name, p.x, p.y);
      if (sub) { ctx.font = '600 11px Nunito, sans-serif'; ctx.strokeText(sub, p.x, p.y - 14); ctx.fillStyle = subColor; ctx.fillText(sub, p.x, p.y - 14); }
      return p;
    };
    /** Oyuncu/canavar adı: seviye adın solunda turuncu ve belirgin ("Lv 20  Ad"). */
    const nameTag = (x: number, y: number, h: number, name: string, color: string, level: number, lvColor = '#ffa53a') => {
      const p = this.project(x, y, h); if (!p.vis) return null;
      ctx.textBaseline = 'bottom'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,0.88)';
      ctx.font = '800 12px Nunito, sans-serif'; const lv = `Lv ${level}`, lw = ctx.measureText(lv).width;
      ctx.font = '700 13px Nunito, sans-serif'; const nw = ctx.measureText(name).width;
      const x0 = p.x - (lw + 5 + nw) / 2;
      ctx.textAlign = 'left';
      ctx.font = '800 12px Nunito, sans-serif'; ctx.strokeText(lv, x0, p.y); ctx.fillStyle = lvColor; ctx.fillText(lv, x0, p.y);
      ctx.font = '700 13px Nunito, sans-serif'; ctx.strokeText(name, x0 + lw + 5, p.y); ctx.fillStyle = color; ctx.fillText(name, x0 + lw + 5, p.y);
      ctx.textAlign = 'center';
      return p;
    };
    /** GM rozeti: adın üstünde hafifçe süzülen, altın ışıltısı gezinen "GM" yazısı (Metin2 tarzı). */
    const gmTag = (p: { x: number; y: number }, up: number) => {
      const t = now / 1000, y = p.y - 16 - up + Math.sin(t * 2.4) * 1.6;
      ctx.save();
      ctx.font = '900 italic 15px Nunito, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'bottom';
      const w = ctx.measureText('GM').width;
      // nabız gibi atan sıcak hale
      ctx.shadowColor = `rgba(255, 190, 60, ${0.55 + Math.sin(t * 3.2) * 0.25})`; ctx.shadowBlur = 10 + Math.sin(t * 3.2) * 4;
      ctx.lineWidth = 3.5; ctx.strokeStyle = 'rgba(40,16,0,0.9)'; ctx.strokeText('GM', p.x, y);
      ctx.shadowBlur = 0;
      // soldan sağa kayan parıltı
      const sx = p.x - w / 2 + ((t * 0.7) % 1.6 - 0.3) * w;
      const gr = ctx.createLinearGradient(p.x - w / 2, y, p.x + w / 2, y);
      const k = Math.max(0, Math.min(1, (sx - (p.x - w / 2)) / w));
      gr.addColorStop(0, '#ffb02e'); gr.addColorStop(Math.max(0, k - 0.18), '#ffcf4a'); gr.addColorStop(k, '#fffbe6'); gr.addColorStop(Math.min(1, k + 0.18), '#ffcf4a'); gr.addColorStop(1, '#ff9a1e');
      ctx.fillStyle = gr; ctx.fillText('GM', p.x, y);
      // iki yanında küçük yıldız kıvılcımı
      for (const sd of [-1, 1]) { const a = 0.5 + 0.5 * Math.sin(t * 4 + sd); ctx.fillStyle = `rgba(255,236,170,${a})`; ctx.font = '700 9px Nunito, sans-serif'; ctx.fillText('✦', p.x + sd * (w / 2 + 7), y - 3 - a * 2); }
      ctx.restore();
    };
    const bar = (p: { x: number; y: number }, hp: number, max: number, w: number, col: string) => {
      const k = Math.max(0, Math.min(1, hp / Math.max(1, max)));
      ctx.fillStyle = 'rgba(10,8,6,0.85)'; ctx.fillRect(p.x - w / 2 - 1.5, p.y + 2, w + 3, 7);
      ctx.fillStyle = '#3a1414'; ctx.fillRect(p.x - w / 2, p.y + 3.5, w, 4);
      ctx.fillStyle = col; ctx.fillRect(p.x - w / 2, p.y + 3.5, w * k, 4);
    };
    // lonca etiketi: ad satırının üstünde simge + lonca adı
    const guildTag = (p: { x: number; y: number }, emblem: number, name: string) => {
      let img = this.emblemImgs.get(emblem);
      if (!img) { img = new Image(); img.src = `/emblems/${emblem}.png`; this.emblemImgs.set(emblem, img); }
      ctx.font = '700 11px Nunito, sans-serif';
      const w = ctx.measureText(name).width, x0 = p.x - (w + 18) / 2, y = p.y - 16;
      if (img.complete && img.naturalWidth) ctx.drawImage(img, x0, y - 13, 16, 16);
      ctx.textAlign = 'left'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(10,8,6,0.85)';
      ctx.strokeText(name, x0 + 18, y); ctx.fillStyle = '#ffd98a'; ctx.fillText(name, x0 + 18, y);
      ctx.textAlign = 'center';
    };
    // NPC (başında görev işareti: sarı ! alınabilir görev, yeşil ? teslime hazır görev)
    const self = st.self, qs = self?.quests, today = trDayKey(Date.now());
    for (const v of this.npcViews) {
      const id = (v as unknown as { npc: string }).npc;
      const def = this.layout.def.npcs.find((d) => d.id === id);
      if (!def) continue;
      const p = tag(v.lx, v.ly, 2.25, def.name, '#ffd870', def.actions.includes('upgrade') ? '⚒ ' + def.title + ' · Artı Bas' : def.title, def.actions.includes('upgrade') ? '#ffb454' : '#a8e0b0');
      if (!p || !self || !qs) continue;
      let mark = '';
      for (const q of TUNING.quests) {
        if (q.off) continue;
        const a = qs.a[q.id];
        if (a && q.turnin === id && q.objs.every((o, i) => (o.kind === 'collect' ? self.materials?.[o.key] ?? 0 : o.kind === 'level' ? self.level : a.p[i] ?? 0) >= o.n)) { mark = '?'; break; }
        if (!mark && !a && q.giver === id && self.level >= q.minLevel && (!q.prereq || qs.d[q.prereq]) && (q.repeat === 'daily' ? qs.d[q.id] !== today : !qs.d[q.id])) mark = '!';
      }
      if (mark) {
        const y = p.y - 30 + Math.sin(now / 300) * 2.5;
        ctx.font = '900 24px Nunito, sans-serif'; ctx.lineWidth = 4; ctx.strokeStyle = 'rgba(10,8,6,0.9)';
        ctx.strokeText(mark, p.x, y); ctx.fillStyle = mark === '?' ? '#7cf09a' : '#ffd84a'; ctx.fillText(mark, p.x, y);
      }
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
        const gm = (e.flags & EFlag.GM) !== 0;
        const p = nameTag(e.x, e.y, 2.15, e.name, gm ? '#ffe08a' : (e.flags & EFlag.PVP) ? '#ff9a9a' : CLASS_COLORS[e.cls], e.level);
        if (p && e.hp < e.maxHp) bar(p, e.hp, e.maxHp, 46, '#5fe07a');
        const hasG = !!p && !!e.guild && e.guild.indexOf('|') > 0;
        if (p && hasG) { const i = e.guild.indexOf('|'); guildTag(p, Number(e.guild.slice(0, i)) | 0, e.guild.slice(i + 1)); }
        if (p && gm) gmTag(p, hasG ? 16 : 0);
      } else {
        const def = MONSTERS[e.tpl];
        const targeted = g.targetId === e.id;
        if (!(targeted || g.hoverId === e.id || e.hp < e.maxHp || def?.boss)) continue;
        const pre = e.variant === 2 ? 'Katil ' : e.variant === 1 ? 'Agresif ' : '';
        const p = nameTag(e.x, e.y, v.height + 0.35, pre + (def?.name ?? ''), e.variant === 2 ? '#ff6a6a' : e.variant === 1 ? '#ffb35a' : '#f2ecdc', e.level, def?.boss ? '#ffd84a' : '#ffa53a');
        if (p) bar(p, e.hp, e.maxHp, def?.boss ? 120 : 56, def?.boss ? '#ff4d7a' : '#e84a3a');
      }
    }
    if (st.char && st.settings.showNames) {
      const gm = st.char.role === 'gm' || st.char.role === 'admin' || st.char.role === 'owner';
      const p = nameTag(g.dx, g.dy, 2.15, st.char.name, gm ? '#ffe08a' : '#fff0c0', st.self?.level ?? 1); const mg = st.guild?.g;
      if (p && mg) guildTag(p, mg.emblem, mg.name);
      if (p && gm) gmTag(p, mg ? 16 : 0);
    }
    // tezgâh tabelaları
    for (const sl of st.stalls) {
      if (Math.hypot(sl.x - g.dx, sl.y - g.dy) > 1700) continue;
      const p = this.project(sl.x, sl.y, 3.05); if (!p.vis) continue;
      ctx.font = '800 13px Nunito, sans-serif';
      const t = sl.title, sub = `${sl.name} · ${sl.n} eşya`;
      const w = Math.max(ctx.measureText(t).width, 90) + 22, h = 36, x = p.x - w / 2, y = p.y - h;
      ctx.fillStyle = 'rgba(40,26,8,0.92)'; ctx.strokeStyle = '#e8b838'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.roundRect(x, y, w, h, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(p.x - 5, p.y); ctx.lineTo(p.x + 5, p.y); ctx.lineTo(p.x, p.y + 6); ctx.closePath(); ctx.fillStyle = '#e8b838'; ctx.fill();
      ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.fillStyle = '#ffe7a0'; ctx.fillText(t, p.x, y + 16);
      ctx.font = '600 11px Nunito, sans-serif'; ctx.fillStyle = '#d8c8a0'; ctx.fillText(sub, p.x, y + 30);
    }
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
  /** Ekrandaki noktaya en yakın varlık. onlyPlayers: yalnız diğer oyuncular (sağ tık menüsü; yanındaki canavar/eşya araya girmesin). */
  pickScreen(sx: number, sy: number, onlyPlayers = false): { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null {
    let best: { type: 'ent' | 'loot' | 'npc'; e?: CEnt; npc?: string } | null = null, bd = onlyPlayers ? 64 : 46;
    for (const e of this.g.ents.values()) {
      if (e.deadAt) continue;
      if (onlyPlayers && (e.kind !== Kind.PLAYER || e.id === this.g.selfId)) continue;
      const v = this.views.get(e.id);
      const h = e.kind === Kind.LOOT ? 0.5 : (v?.height ?? 1.6) * 0.5;
      const p = this.project(e.x, e.y, h);
      const d = Math.hypot(p.x - sx, p.y - sy) * (e.kind === Kind.LOOT ? 0.8 : 1);
      if (d < bd) { bd = d; best = { type: e.kind === Kind.LOOT ? 'loot' : 'ent', e }; }
    }
    if (onlyPlayers) return best;
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

const STALL_CLOTH = ['#b8402c', '#2c6ab8', '#3a8a4a', '#c89a2a', '#8a3ab0', '#d06a2a'];
const stallMats = new Map<string, THREE.Material>();
const stallMat = (c: string, rough = 0.85) => { let m = stallMats.get(c); if (!m) { m = new THREE.MeshStandardMaterial({ color: c, roughness: rough }); stallMats.set(c, m); } return m; };
function makeStall(id: string): THREE.Object3D {
  const g = new THREE.Group();
  let h = 0; for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const wood = stallMat('#6a4424'), dark = stallMat('#4a2e18'), cloth = stallMat(STALL_CLOTH[h % STALL_CLOTH.length], 0.95), cloth2 = stallMat('#efe4c8', 0.95);
  // dört direk
  for (const [x, z] of [[-1.15, -0.95], [1.15, -0.95], [-1.15, 1.05], [1.15, 1.05]] as const) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 2.5, 6), dark); post.position.set(x, 1.25, z); g.add(post);
  }
  // çizgili tente (öne eğik)
  for (let i = 0; i < 6; i++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.05, 2.35), i % 2 ? cloth2 : cloth);
    strip.position.set(-1.05 + i * 0.42, 2.5, 0.05); strip.rotation.x = -0.16; g.add(strip);
  }
  const valance = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.22, 0.04), cloth); valance.position.set(0, 2.3, 1.22); g.add(valance);
  // tezgâh masası (satıcının önünde) ve üstünde birkaç kutu
  const top = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.08, 0.62), wood); top.position.set(0, 0.92, 0.82); g.add(top);
  const front = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.86, 0.06), dark); front.position.set(0, 0.47, 1.1); g.add(front);
  for (let i = 0; i < 3; i++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.24), stallMat(['#c8a050', '#8a6a3a', '#a85a3a'][i])); b.position.set(-0.6 + i * 0.6, 1.06, 0.8); b.rotation.y = (i - 1) * 0.3; g.add(b); }
  g.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; } });
  return g;
}
