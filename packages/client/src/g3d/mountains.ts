import * as THREE from 'three';

/**
 * Ufuk manzarası: haritayı çevreleyen üç sıra (önde ormanlı alçak tepeler, ortada kayalık sırtlar, arkada karlı sivri zirveler).
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

/**
 * Açıya göre tepe yüksekliği: birkaç ölçekte yumuşak (kosinüs ara değerli) gürültü toplamı → yuvarlak, dalgalı,
 * birbirine akan tepeler (ön sıra: ormanlı alçak tepeler).
 */
function ridge(seed: number, base: number, amp: number, cells: number) {
  const n1 = noise1(seed + 1, cells), n2 = noise1(seed + 2, cells * 2 + 3), n3 = noise1(seed + 3, cells * 5 + 7);
  return (a: number) => {
    const v = n1(a) * 0.62 + n2(a) * 0.28 + n3(a) * 0.1;
    const r = Math.max(0, v - 0.22) / 0.78;
    return base + amp * (1 - Math.pow(1 - r, 1.7));
  };
}

/** Doğrusal ara değerli döngüsel gürültü (sivri sırt kırıkları için; yumuşatma yok). */
function noiseLin(seed: number, cells: number) {
  const r = rng(seed * 13 + 5), v = Array.from({ length: cells }, () => r());
  return (a: number) => { const x = ((a / (Math.PI * 2)) % 1 + 1) % 1 * cells, i = Math.floor(x), f = x - i; return v[i % cells] * (1 - f) + v[(i + 1) % cells] * f; };
}

/**
 * Gerçek dağ silueti: sırtlı (ridged) çok ölçekli gürültü. Her ölçekte 1-|2n-1| sivri tepe üretir; büyük ölçek
 * birkaç ana zirve, küçükler omuz, çentik ve kayalık kırıkları ekler. Zirveler üs alınarak sivriltilir.
 */
function peaks(seed: number, base: number, amp: number, cells: number) {
  const oct = [0, 1, 2, 3, 4].map((o) => ({ n: o < 2 ? noise1(seed + 31 * o, cells * (1 << o) + o * 3) : noiseLin(seed + 31 * o, cells * (1 << o) + o * 5), w: [0.56, 0.24, 0.12, 0.055, 0.025][o] }));
  return (a: number) => {
    let v = 0, wt = 1;
    for (const { n, w } of oct) { const r = 1 - Math.abs(2 * n(a) - 1); v += w * r * r * (0.55 + 0.45 * wt); wt = r; }
    return base + amp * Math.pow(Math.max(0, v - 0.08) / 0.92, 1.45);
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
float hash(vec2 p) { vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 p) { vec2 i = floor(p), f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x), mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y); }
float fbm(vec2 p) { float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++) { s += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; } return s; }
void main() {
  vec2 p = vUv;
  // yumuşak, yatay yayılan doku (çimenli/ormanlı yamaç hissi); dikey yarık çizgisi yok
  float big = fbm(p * vec2(0.012, 0.05));
#ifdef LITE
  float fine = vnoise(p * vec2(0.06, 0.18));
#else
  float fine = fbm(p * vec2(0.06, 0.18));
#endif
  // tepe sırtına yakın daha açık (gökyüzü ışığı), eteğe doğru koyulaşır
  float rim = smoothstep(0.55, 1.0, vT);
  vec3 c = vCol * (0.78 + 0.28 * big + 0.08 * fine) * (0.82 + 0.3 * rim);
  // kayalık dağ: dikey oluk/kaya kırıkları (yalnız arka sıralar), zirveye yakın daha belirgin
#ifndef LITE
  if (vInfo.z < 0.5) {
    float gully = fbm(vec2(p.x * 0.09, p.y * 0.035 + fbm(p * vec2(0.03, 0.02)) * 2.0));
    float strata = fbm(vec2(p.x * 0.02, p.y * 0.22));
    c *= 0.82 + 0.34 * gully + 0.1 * strata * smoothstep(0.3, 0.9, vT);
  }
#else
  if (vInfo.z < 0.5) c *= 0.84 + 0.3 * vnoise(vec2(p.x * 0.09, p.y * 0.035));
#endif
  if (vInfo.z > 0.5) c = mix(c, uForest * (0.75 + 0.4 * fine), 0.35 * smoothstep(0.1, 0.8, vT));
  if (vInfo.y > 0.5) { float m = smoothstep(vInfo.x + (big - 0.5) * 10.0, vInfo.x + 3.0, p.y); c = mix(c, uSnow * (0.85 + 0.15 * fine), m); }
  // atmosfer: uzak sıra ve etekler sise karışır
  float hz = clamp(vMist + pow(1.0 - vT, 2.0) * 0.45, 0.0, 0.85);
  c = mix(c, uHaze, hz);
  gl_FragColor = vec4(c, 1.0);
}`;

/** lite: telefonda gölgelendirici hafif (dağ ekranın büyük kısmını kapladığı için piksel başı maliyet önemli). */
export function buildMountains(themeId: string, seed = 7, lite = false): THREE.Mesh {
  const T = MOUNTAIN_THEMES[themeId] ?? MOUNTAIN_THEMES.forest;
  const N = 1440;
  const pos: number[] = [], col: number[] = [], idx: number[] = [], info: number[] = [], map: number[] = [], mist: number[] = [];
  const c = new THREE.Color();
  // katman: yarıçap, sırt, taban rengi, kar var mı, pusa karışma
  // arka sıra: karlı, sivri, yüksek gerçek dağlar; orta: kayalık sırtlar; ön: ormanlı alçak tepeler
  const snowy = themeId !== 'black' && themeId !== 'ancient';
  const blue = new THREE.Color(0x3f5f94);
  const far = new THREE.Color(T.far).lerp(blue, 0.4), mid = new THREE.Color(T.rock).lerp(blue, 0.25), near = new THREE.Color(T.hill).lerp(new THREE.Color(T.rock), 0.5);
  const layers = [
    { r: 252, f: peaks(seed, 18 * T.peak, 118 * T.peak, 6), base: far, snowy, snowK: themeId === 'frozen' ? 1 : 1.12, mist: 0.16, forest: false },
    { r: 238, f: peaks(seed + 11, 10 * T.peak, 62 * T.peak, 9), base: mid, snowy: themeId === 'frozen', snowK: 1, mist: 0.08, forest: false },
    { r: 224, f: ridge(seed + 23, 5, 18, 16), base: near, snowy: false, snowK: 1, mist: 0.04, forest: themeId !== 'frozen' && themeId !== 'black' },
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
      const lit = THREE.MathUtils.clamp(0.62 + slope / (hMax * (L.forest ? 9 : 4)), 0.32, 0.92);
      const sl = Math.min(hMax * 0.92, T.snowLine * L.snowK * hMax) * (0.92 + 0.12 * Math.sin(a * 13 + i * 0.01));
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
    vertexShader: VERT, fragmentShader: FRAG, defines: lite ? { LITE: 1 } : {}, vertexColors: true, depthWrite: false, side: THREE.DoubleSide, fog: false, toneMapped: false,
    uniforms: { uHaze: { value: new THREE.Color(T.haze) }, uSnow: { value: new THREE.Color(T.snow) }, uForest: { value: forest } },
  });
  const m = new THREE.Mesh(g, mat);
  m.renderOrder = -10; m.frustumCulled = false; m.name = 'mountains';
  // arka katman önce: ön katmanlar onun üstüne çizilir (derinlik yazılmadığı için sıra önemli)
  return m;
}

/**
 * Meshy dağları: gerçek kayalık, karlı zirveli iki dağ modeli (sivri masif + geniş sırt) ufukta bir halka hâlinde
 * dizilir; boyları, yönleri ve aralarındaki boşluklar çeşitlenir. Arkada eski çizimli sıralar boşlukları doldurur.
 * Işık sahneden gelir (gece kararır); uzaklık pusu sahnenin sis rengine doğru karışır (gündüz mavimsi pus,
 * gece lacivert). Halka kamerayla yatayda kayar: dağlar hep ufukta kalır, yaklaşılamaz.
 */
export interface MeshMountains { group: THREE.Group; haze: THREE.Color; dispose(): void }
export function buildMeshMountains(themeId: string, seed: number, lite: boolean, get: (id: string) => THREE.Object3D | null): MeshMountains | null {
  const A = get('mountain_a'), B = get('mountain_b');
  if (!A || !B) return null;
  const T = MOUNTAIN_THEMES[themeId] ?? MOUNTAIN_THEMES.forest;
  const haze = new THREE.Color(T.haze);
  const r = rng(seed * 31 + 9);
  const group = new THREE.Group(); group.name = 'mesh-mountains'; group.renderOrder = -5;
  const owned: THREE.Material[] = [];
  const parts = [A, B].map((src) => {
    let mesh: THREE.Mesh | undefined;
    src.updateMatrixWorld(true);
    src.traverse((o) => { if (!mesh && (o as THREE.Mesh).isMesh) mesh = o as THREE.Mesh; });
    if (!mesh) return null;
    const geo = mesh.geometry.clone(); geo.applyMatrix4(mesh.matrixWorld);
    geo.computeBoundingBox();
    const bb = geo.boundingBox!, c = bb.getCenter(new THREE.Vector3());
    geo.translate(-c.x, -bb.min.y, -c.z); // taban y=0, ortada
    const h = bb.max.y - bb.min.y, w = Math.max(bb.max.x - bb.min.x, bb.max.z - bb.min.z);
    const srcMat = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const mat = new THREE.MeshLambertMaterial({ map: srcMat.map ?? null, color: 0xffffff, fog: false });

    const uH = { value: haze };
    // yeşil temalarda İsviçre görünümü: etekler ve düz yamaçlar çimen yeşili, dik yamaç kaya, zirve karlı
    // yeni Meshy dağlarının dokusu zaten yeşil yamaçlı ve karlı: yeniden boyama kapalı (yalnız pus ayarı)
    const alpine = false;
    const lightHaze = themeId === 'village' || themeId === 'forest' || themeId === 'lake';
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uHaze = uH;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying float vH; varying float vUp;')
        .replace('#include <begin_vertex>', `#include <begin_vertex>
          vH = position.y;
          #ifdef USE_INSTANCING
            vUp = normalize((modelMatrix * instanceMatrix * vec4(objectNormal, 0.0)).xyz).y;
          #else
            vUp = normalize((modelMatrix * vec4(objectNormal, 0.0)).xyz).y;
          #endif`);
      let fs = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform vec3 uHaze; varying float vH; varying float vUp;');
      // karlı / kara bölgelerde yeşil doku o bölgenin rengine çevrilir
      if (themeId === 'frozen' || themeId === 'black' || themeId === 'ancient' || themeId === 'tower') fs = fs.replace('#include <map_fragment>', `#include <map_fragment>
          { float lum = dot(diffuseColor.rgb, vec3(0.299, 0.587, 0.114));
            diffuseColor.rgb = ${themeId === 'frozen' ? 'mix(vec3(lum) * vec3(0.9, 0.95, 1.04), vec3(0.96, 0.98, 1.0), 0.45)' : themeId === 'black' ? 'vec3(lum) * vec3(0.62, 0.5, 0.56)' : themeId === 'tower' ? 'vec3(lum) * vec3(0.5, 0.46, 0.62)' : 'vec3(lum) * vec3(1.0, 0.92, 0.74)'}; }`);
      if (alpine) fs = fs.replace('#include <map_fragment>', `#include <map_fragment>
          {
            vec3 tex = diffuseColor.rgb;
            float lum = dot(tex, vec3(0.299, 0.587, 0.114));
            float det = clamp(lum / 0.42, 0.55, 1.45);            // dokunun ayrıntısı (çatlak, gölge) korunur
            float t = vH / ${h.toFixed(2)};                        // 0 etek … 1 zirve
            float up = clamp(vUp, 0.0, 1.0);                      // 1 düz, 0 dik
            float n = fract(sin(dot(floor(vec2(vH * 0.37, lum * 9.0)), vec2(12.9898, 78.233))) * 43758.5453);
            vec3 grassA = vec3(0.22, 0.47, 0.12), grassB = vec3(0.14, 0.34, 0.09), forestC = vec3(0.07, 0.21, 0.07);
            vec3 grass = mix(grassA, grassB, smoothstep(0.3, 0.7, t)) * mix(1.0, det, 0.6);
            grass = mix(grass, forestC * det, smoothstep(0.62, 0.9, lum * 1.6) * (1.0 - smoothstep(0.3, 0.55, t)) * 0.7); // eteklerde koyu orman lekeleri
            vec3 rock = mix(vec3(0.46, 0.45, 0.43), vec3(0.58, 0.55, 0.50), n) * det;
            vec3 snow = vec3(0.95, 0.97, 1.0) * (0.86 + 0.14 * det);
            float gw = (1.0 - smoothstep(0.64, 0.8, t)) * smoothstep(-0.25, 0.2, up);
            float snowLine = 0.8 + 0.05 * (det - 1.0);
            float sw = smoothstep(snowLine - 0.05, snowLine + 0.05, t) * smoothstep(0.02, 0.35, up + 0.3 * smoothstep(0.85, 0.97, t));
            vec3 col = mix(rock, grass, gw);
            col = mix(col, snow, clamp(sw, 0.0, 1.0));
            diffuseColor.rgb = col;
          }`);
      sh.fragmentShader = fs.replace('#include <dithering_fragment>', `#include <dithering_fragment>
          // hava perspektifi: dağın tamamı biraz, eteği daha çok pusa karışır
          float hz = ${lightHaze ? '0.03 + 0.18' : '0.16 + 0.42'} * (1.0 - smoothstep(0.0, ${(h * 0.7).toFixed(2)}, vH)) + ${lightHaze ? '0.03' : '0.0'};
          gl_FragColor.rgb = mix(gl_FragColor.rgb, uHaze, hz);`);
    };
    mat.customProgramCacheKey = () => 'meshmtn2' + h.toFixed(2) + themeId;
    owned.push(mat);
    return { geo, mat, h, w };
  });
  if (parts.some((p) => !p)) return null;
  // halka: açı boyunca sırayla geniş sırt ve sivri masif; aralarda boşluk
  const N = lite ? 16 : 22; // birbirine değen, ufku kesintisiz saran sıra
  const lists: THREE.Matrix4[][] = [[], []];
  const q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3(), up = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2 + (r() - 0.5) * 0.18;
    const kind = (i + (r() < 0.3 ? 1 : 0)) % 2; // 0: sivri (A), 1: sırt (B)
    const P = parts[kind]!;
    const height = kind === 0 ? 72 + r() * 50 : 52 + r() * 30;
    const k = height / P.h;
    const R0 = 188 + r() * 30;
    p.set(Math.cos(a) * R0, -26 - r() * 6, Math.sin(a) * R0);
    // yüzü kabaca merkeze, biraz rastgele
    q.setFromAxisAngle(up, -a - Math.PI / 2 + (r() - 0.5) * 0.9);
    // genişlik: komşusuna değecek kadar (yay boyu / model genişliği)
    const wantW = (Math.PI * 2 * R0 / N) * (kind === 1 ? 1.5 : 1.25), kw = Math.max(k, wantW / P.w);
    s.set(kw, k, Math.min(kw, k * 1.4));
    lists[kind].push(new THREE.Matrix4().compose(p, q, s));
  }
  lists.forEach((L, kind) => {
    if (!L.length) return;
    const P = parts[kind]!;
    const im = new THREE.InstancedMesh(P.geo, P.mat, L.length);
    L.forEach((m, i) => im.setMatrixAt(i, m));
    im.frustumCulled = false; im.castShadow = false; im.receiveShadow = false; im.renderOrder = -5;
    group.add(im);
  });
  return { group, haze, dispose() { for (const c of group.children) (c as THREE.InstancedMesh).geometry.dispose(); owned.forEach((m) => m.dispose()); } };
}
