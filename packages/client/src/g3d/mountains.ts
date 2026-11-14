import * as THREE from 'three';

/**
 * Ufuk manzarası: haritayı çevreleyen iki sıra dağ (önde alçak, mavimsi ormanlı tepeler; arkada karlı yüksek zirveler).
 * Kamerayla birlikte yatayda kayar (gökyüzü gibi sonsuz uzakta görünür), ilk çizilir ve derinlik yazmaz:
 * dünyadaki her şey üstüne çizilir. Tek ağ, tek çizim çağrısı, ışık/sis hesabı yok (köşe renkleri hazır).
 */
export interface MountainTheme { rock: number; far: number; snow: number; hill: number; haze: number; snowLine: number; peak: number }
export const MOUNTAIN_THEMES: Record<string, MountainTheme> = {
  village: { rock: 0x465a7c, far: 0x7a8fb2, snow: 0xf6f9ff, hill: 0x5f8a78, haze: 0xd8e4ee, snowLine: 0.66, peak: 1 },
  forest: { rock: 0x435672, far: 0x7489a8, snow: 0xf4f8ff, hill: 0x4f7c66, haze: 0xcfdde4, snowLine: 0.66, peak: 1 },
  lake: { rock: 0x485e82, far: 0x7c92b6, snow: 0xf6faff, hill: 0x5a8a80, haze: 0xd8e6f0, snowLine: 0.66, peak: 1 },
  frozen: { rock: 0x8e9cb4, far: 0xb4c2d6, snow: 0xffffff, hill: 0xa8b8cc, haze: 0xe2eaf2, snowLine: 0.25, peak: 1.15 },
  black: { rock: 0x4a3c48, far: 0x6a5a68, snow: 0xb05a40, hill: 0x3a3038, haze: 0xa89aa8, snowLine: 0.85, peak: 0.9 },
  ancient: { rock: 0x9a8a6a, far: 0xb4a888, snow: 0xf2eee2, hill: 0x8a8a5a, haze: 0xd8d6c4, snowLine: 0.7, peak: 0.85 },
};

function rng(seed: number) { let s = seed >>> 0 || 1; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

/** Açı üzerinde döngüsel 1B değer gürültüsü (sırtı kırmak için). */
function noise1(seed: number, cells: number) {
  const r = rng(seed * 7 + 3), v = Array.from({ length: cells }, () => r());
  return (a: number) => {
    const x = ((a / (Math.PI * 2)) % 1 + 1) % 1 * cells, i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f);
    return v[i % cells] * (1 - u) + v[(i + 1) % cells] * u;
  };
}

/** Açıya göre dağ yüksekliği: geniş zirveler + kırık, çok katlı sırt (doğal silüet). */
function ridge(seed: number, count: number, hMin: number, hMax: number, wMin: number, wMax: number) {
  const r = rng(seed);
  const peaks = Array.from({ length: count }, () => ({ c: r() * Math.PI * 2, w: wMin + r() * (wMax - wMin), h: hMin + r() * (hMax - hMin), skew: 0.6 + r() * 0.8 }));
  const n1 = noise1(seed + 1, 90), n2 = noise1(seed + 2, 260), n3 = noise1(seed + 3, 700);
  return (a: number) => {
    let h = 0;
    for (const p of peaks) {
      let d = a - p.c; d -= Math.round(d / (Math.PI * 2)) * Math.PI * 2;
      const k = d < 0 ? -d / (p.w * p.skew) : d / (p.w / p.skew);
      // yumuşak omuzlu zirve (düz üçgen yerine)
      if (k < 1) h = Math.max(h, p.h * (1 - k * k) ** 1.6 * (0.55 + 0.45 * (1 - k)));
    }
    const rough = (n1(a) - 0.5) * 0.16 + (Math.abs(n2(a) - 0.5) - 0.25) * 0.14 + (n3(a) - 0.5) * 0.05;
    return Math.max(0, h * (1 + rough) + rough * hMax * 0.08);
  };
}

const VERT = /* glsl */`
attribute vec3 aInfo;   // x: kar çizgisi (y), y: kar var mı, z: orman katmanı mı
attribute vec2 aMap;    // x: yay boyu (m), y: alt→üst (0..1)
varying vec3 vCol; varying vec2 vUv; varying vec3 vInfo; varying float vT; varying float vMist;
attribute float aMist;
void main() {
  vCol = color; vUv = vec2(aMap.x, position.y); vInfo = aInfo; vT = aMap.y; vMist = aMist;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = /* glsl */`
uniform vec3 uHaze; uniform vec3 uSnow; uniform vec3 uForest;
varying vec3 vCol; varying vec2 vUv; varying vec3 vInfo; varying float vT; varying float vMist;
float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec2 p = vUv;
  float big = fbm(p * vec2(0.022, 0.03));
  float gully = fbm(vec2(p.x * 0.09, p.y * 0.045));          // yarıklar (hafif dikey)
  float fine = fbm(p * vec2(0.09, 0.12));
  // yarıklarda gölge, sırtlarda ışık (güneş soldan): yatay gürültü eğimi
  float gx = fbm(vec2((p.x + 1.5) * 0.09, p.y * 0.045)) - gully;
  float shade = clamp(0.86 + gx * 1.8 + (big - 0.5) * 0.4, 0.55, 1.2);
  vec3 c = vCol * shade * (0.9 + 0.2 * fine);
  // ormanlı ön tepeler: ağaç tepeciklerinden oluşan doku
  if (vInfo.z > 0.5) {
    float trees = fbm(p * vec2(0.55, 0.75));
    c = mix(c, uForest * (0.7 + 0.5 * trees), 0.55 + 0.25 * smoothstep(0.2, 0.9, vT));
  }
  // kar: düzensiz sınır, yarıklarda aşağı iner, gölgeli yüzde mavimsi
  if (vInfo.y > 0.5) {
    float edge = vInfo.x + (big - 0.5) * 14.0 - (gully - 0.5) * 18.0;
    float m = smoothstep(edge, edge + 2.5, p.y);
    vec3 sn = uSnow * mix(vec3(0.78, 0.84, 0.95), vec3(1.0), clamp(shade - 0.55, 0.0, 1.0));
    c = mix(c, sn * (0.92 + 0.12 * fine), m);
  }
  // atmosfer: tabana ve uzak katmana doğru pus
  float hz = clamp(vMist + pow(1.0 - vT, 2.4) * 0.5, 0.0, 0.85);
  c = mix(c, uHaze, hz);
  gl_FragColor = vec4(c, 1.0);
}`;

export function buildMountains(themeId: string, seed = 7): THREE.Mesh {
  const T = MOUNTAIN_THEMES[themeId] ?? MOUNTAIN_THEMES.forest;
  const N = 1440;
  const pos: number[] = [], col: number[] = [], idx: number[] = [], info: number[] = [], map: number[] = [], mist: number[] = [];
  const c = new THREE.Color();
  // katman: yarıçap, sırt, taban rengi, kar var mı, pusa karışma
  const layers = [
    { r: 250, f: ridge(seed, 34, 34 * T.peak, 74 * T.peak, 0.1, 0.32), base: new THREE.Color(T.far), snowy: true, mist: 0.2, forest: false },
    { r: 236, f: ridge(seed + 11, 40, 22 * T.peak, 56 * T.peak, 0.08, 0.22), base: new THREE.Color(T.rock), snowy: true, mist: 0.06, forest: false },
    { r: 222, f: ridge(seed + 23, 60, 7, 20, 0.05, 0.14), base: new THREE.Color(T.hill), snowy: false, mist: 0.16, forest: themeId !== 'frozen' && themeId !== 'black' },
  ];
  const ROWS = [0, 0.3, 0.5, 0.66, 0.8, 0.9, 1];
  for (const L of layers) {
    const start = pos.length / 3;
    let hMax = 0; for (let i = 0; i < N; i++) hMax = Math.max(hMax, L.f((i / N) * Math.PI * 2));
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const h = L.f(a);
      // yamaç ışığı: güneşe bakan yüz açık, öteki koyu (sırt boyunca eğime göre)
      // geniş aralıkta eğim: kırık sırt komşu sütunlarda ışığı zıplatıp dikey çizgi yapmasın
      const slope = (L.f(a + 0.03) - L.f(a - 0.03)) / 0.06;
      const lit = THREE.MathUtils.clamp(0.58 + slope / (hMax * 7), 0.3, 0.9);
      const sl = T.snowLine * hMax * (0.92 + 0.12 * Math.sin(a * 13 + i * 0.01));
      for (const t of ROWS) {
        const y = -30 + (h + 30) * t;
        pos.push(Math.cos(a) * L.r, y, Math.sin(a) * L.r);
        c.copy(L.base).multiplyScalar(0.6 + lit * 0.65);
        col.push(c.r, c.g, c.b);
        info.push(sl, L.snowy ? 1 : 0, L.forest ? 1 : 0);
        map.push(a * L.r, t);
        mist.push(L.mist);
      }
    }
    const R = ROWS.length;
    for (let i = 0; i < N; i++) for (let k = 0; k < R - 1; k++) {
      const a = start + i * R + k, b = start + (i + 1) * R + k;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aInfo', new THREE.Float32BufferAttribute(info, 3));
  g.setAttribute('aMap', new THREE.Float32BufferAttribute(map, 2));
  g.setAttribute('aMist', new THREE.Float32BufferAttribute(mist, 1));
  g.setIndex(idx);
  const forest = new THREE.Color(T.hill).multiplyScalar(0.62).lerp(new THREE.Color(0x2c5a34), 0.5);
  const mat = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG, vertexColors: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
    uniforms: { uHaze: { value: new THREE.Color(T.haze) }, uSnow: { value: new THREE.Color(T.snow) }, uForest: { value: forest } },
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = -10; m.frustumCulled = false; m.name = 'mountains';
  // arka katman önce: ön katmanlar onun üstüne çizilir (derinlik yazılmadığı için sıra önemli)
  return m;
}
