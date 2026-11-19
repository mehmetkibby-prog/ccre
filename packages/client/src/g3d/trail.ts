import * as THREE from 'three';

/**
 * Silah izi (ribbon trail): savuruş sırasında silahın kabza yanı ile ucu her karede örneklenir, iki nokta dizisi
 * arasında Catmull-Rom ile yumuşatılmış bir şerit çizilir. Şeridin yeni ucu parlak ve beyaza yakın, kuyruğu sınıf
 * renginde söner; uca doğru parlaklaşır (bıçağın dış kenarı). Her karakter için tek şerit, havuzdan kullanılır.
 *
 * Örnekleme zamanı animasyona bağlıdır: yalnız vuruş klibinin verilen aralığında (sn) iz bırakılır; kare hızı düşse de
 * iz kılıcın gerçek yolunu izler.
 */
export interface Blade { base: THREE.Vector3; tip: THREE.Vector3 }
interface Sample { b: THREE.Vector3; t: THREE.Vector3; at: number }
const MAXS = 40, SUB = 4, MAXV = MAXS * SUB * 2;

const VERT = /* glsl */ `
  attribute vec2 aUv; varying vec2 vUv;
  void main() { vUv = aUv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const FRAG = /* glsl */ `
  uniform vec3 uCol; uniform vec3 uCore; uniform float uAlpha; varying vec2 vUv;
  void main() {
    float age = clamp(vUv.x, 0.0, 1.0), s = vUv.y;               // age: 0 yeni → 1 eski; s: 0 kabza → 1 uç
    float fade = pow(1.0 - age, 2.0);
    float edge = smoothstep(0.0, 0.55, s) * (1.0 - smoothstep(0.93, 1.0, s));
    float core = clamp(pow(s, 6.0) * 1.6 - age * 2.0, 0.0, 1.0); // uçta ve yeni kısımda beyaz çekirdek
    vec3 c = mix(uCol, uCore, core);
    float a = fade * edge * pow(s, 1.8) * uAlpha * 0.7;
    gl_FragColor = vec4(c * a, a);
  }`;

class Trail {
  mesh: THREE.Mesh;
  geo = new THREE.BufferGeometry();
  pos = new Float32Array(MAXV * 3);
  uv = new Float32Array(MAXV * 2);
  samples: Sample[] = [];
  win: [number, number] = [0, 0];
  armed = false;
  started = false;
  life = 120;
  lastUse = 0;
  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aUv', new THREE.BufferAttribute(this.uv, 2).setUsage(THREE.DynamicDrawUsage));
    const idx: number[] = [];
    for (let i = 0; i < MAXV / 2 - 1; i++) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    this.geo.setIndex(idx);
    const mat = new THREE.ShaderMaterial({
      uniforms: { uCol: { value: new THREE.Color() }, uCore: { value: new THREE.Color() }, uAlpha: { value: 1 } },
      vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(this.geo, mat);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
  }
  set(color: THREE.ColorRepresentation, core: THREE.ColorRepresentation, alpha: number, life: number) {
    const u = (this.mesh.material as THREE.ShaderMaterial).uniforms;
    (u.uCol.value as THREE.Color).set(color); (u.uCore.value as THREE.Color).set(core); u.uAlpha.value = alpha; this.life = life;
  }
  /** örnekleri yumuşatıp şeridi kurar */
  build(now: number) {
    const S = this.samples;
    while (S.length && now - S[0].at > this.life) S.shift();
    if (S.length < 2) { this.mesh.visible = false; return; }
    const cr = (p0: THREE.Vector3, p1: THREE.Vector3, p2: THREE.Vector3, p3: THREE.Vector3, u: number, o: THREE.Vector3) => {
      const u2 = u * u, u3 = u2 * u;
      o.set(0, 0, 0)
        .addScaledVector(p0, -0.5 * u3 + u2 - 0.5 * u)
        .addScaledVector(p1, 1.5 * u3 - 2.5 * u2 + 1)
        .addScaledVector(p2, -1.5 * u3 + 2 * u2 + 0.5 * u)
        .addScaledVector(p3, 0.5 * u3 - 0.5 * u2);
      return o;
    };
    const ob = new THREE.Vector3(), ot = new THREE.Vector3();
    let v = 0;
    const put = (b: THREE.Vector3, t: THREE.Vector3, at: number) => {
      if (v >= MAXV) return;
      const age = (now - at) / this.life;
      this.pos.set([b.x, b.y, b.z], v * 3); this.uv.set([age, 0], v * 2); v++;
      this.pos.set([t.x, t.y, t.z], v * 3); this.uv.set([age, 1], v * 2); v++;
    };
    // en yeniden eskiye: yaş 0 → 1
    for (let i = S.length - 1; i > 0; i--) {
      const s1 = S[i], s0 = S[i - 1], sp = S[Math.min(S.length - 1, i + 1)], sn = S[Math.max(0, i - 2)];
      for (let k = 0; k < SUB; k++) {
        const u = 1 - k / SUB; // s1 → s0 yönünde
        cr(sn.b, s0.b, s1.b, sp.b, u, ob); cr(sn.t, s0.t, s1.t, sp.t, u, ot);
        put(ob, ot, s0.at + (s1.at - s0.at) * u);
      }
    }
    put(S[0].b, S[0].t, S[0].at);
    this.geo.setDrawRange(0, Math.max(0, (v / 2 - 1) * 6));
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.aUv as THREE.BufferAttribute).needsUpdate = true;
    this.mesh.visible = true;
  }
}

export class WeaponTrails {
  group = new THREE.Group();
  private act = new Map<number, Trail>();
  private pool: Trail[] = [];
  /** varlığın elindeki silahın kabza-yanı ve uç noktası (dünya, metre); renderer bağlar */
  bladeOf: (id: number) => Blade | null = () => null;
  /** oynayan vuruş klibinin zamanı (sn), yoksa -1 */
  swingTimeOf: (id: number) => number = () => -1;

  /**
   * Bir savuruş için iz kur: klip zamanı [t0, t1] aralığındayken iz bırakılır.
   * color: kuyruk rengi, core: uçtaki çekirdek, alpha: genel parlaklık, life: izin ömrü (ms)
   */
  start(id: number, t0: number, t1: number, color: THREE.ColorRepresentation, core: THREE.ColorRepresentation = '#ffffff', alpha = 1, life = 120) {
    let tr = this.act.get(id);
    if (!tr) {
      tr = this.pool.pop() ?? new Trail();
      if (!tr.mesh.parent) this.group.add(tr.mesh);
      this.act.set(id, tr);
    }
    tr.set(color, core, alpha, life);
    tr.win = [t0, t1]; tr.armed = true; tr.started = false; tr.samples.length = 0;
    tr.lastUse = performance.now();
  }

  update(now: number) {
    for (const [id, tr] of this.act) {
      if (tr.armed) {
        const st = this.swingTimeOf(id);
        // yeni klip başladı mı (önceki savuruşun zamanı karışmasın)
        if (st >= 0 && st < tr.win[0]) tr.started = true;
        if (st >= tr.win[0] && st <= tr.win[1] + 0.02) {
          tr.started = true;
          const bl = this.bladeOf(id);
          if (bl) {
            const last = tr.samples[tr.samples.length - 1];
            if (!last || now - last.at > 2) tr.samples.push({ b: bl.base.clone(), t: bl.tip.clone(), at: now });
            if (tr.samples.length > MAXS) tr.samples.shift();
          }
        } else if (tr.started && (st > tr.win[1] + 0.02 || st < 0)) tr.armed = false;
        if (now - tr.lastUse > 1500) tr.armed = false; // klip hiç oynamadıysa
      }
      tr.build(now);
      if (!tr.armed && !tr.samples.length) { tr.mesh.visible = false; this.act.delete(id); this.pool.push(tr); }
    }
  }

  /** izin uç noktasının son hareket yönü, ekran düzleminde (radyan; kesik ışığını hizalamak için) */
  screenAngle(id: number, cam: THREE.Camera): number | null {
    const tr = this.act.get(id); if (!tr || tr.samples.length < 2) return null;
    const S = tr.samples, a = S[S.length - 1].t.clone().project(cam), b = S[Math.max(0, S.length - 3)].t.clone().project(cam);
    const dx = a.x - b.x, dy = a.y - b.y;
    if (Math.abs(dx) + Math.abs(dy) < 1e-4) return null;
    return Math.atan2(dy, dx);
  }
}
