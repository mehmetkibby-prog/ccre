import * as THREE from 'three';
import { TILE, type MapLayout } from '@col/shared';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { groundTextureArrays, GROUND_LAYERS, LAYER_NAMES, fbm } from './textures.ts';
const MOBILE_T = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;

/** Sunucu birimi → metre */
export const U = 1 / 40;
export const TILE_M = TILE * U;

const G_WATER = 4, G_DEEP = 10, G_PLANK = 11;
/** iskele tahtalarının üstü (iskele modeli -0,2'de, tahtalar +0,1): karakter burada yürür */
const DECK_Y = -0.08;

export class Terrain {
  mesh: THREE.Mesh;
  water: THREE.Mesh | null = null;
  /** yeni yıl karı (0–1), çalışırken değişebilir */
  snow = { value: 0 };
  /** gökyüzü ışığının şiddeti (renderer gece-gündüzle günceller): hafif zeminde yansıma haritası yerine kullanılır */
  envI = { value: 0.55 };
  private lite = false;
  /**
   * Telefon/tablet hafifletmesi: zeminde kabartma dokusu ve gökyüzü yansıma haritası (IBL) derlenmez; yerine aynı
   * parlaklıkta düz bir gökyüzü ışığı eklenir. Zemin kaba bir yüzey: yansıması zaten görünmüyordu. Bir kez yeniden derlenir.
   */
  setLite(on: boolean) {
    if (on === this.lite) return;
    this.lite = on;
    const m = this.mesh.material as THREE.MeshStandardMaterial;
    m.defines = on ? { STANDARD: '', TERRAIN_LITE: '' } : { STANDARD: '' };
    m.needsUpdate = true;
  }
  heights: Float32Array;
  hw: number; hh: number; // yükseklik ızgarası boyutu
  step: number; // metre
  waterNormal?: THREE.Texture;

  constructor(public layout: MapLayout) {
    const l = layout;
    const SUB = 2;
    this.step = TILE_M / SUB;
    this.hw = l.w * SUB + 1; this.hh = l.h * SUB + 1;
    this.heights = new Float32Array(this.hw * this.hh);
    const seed = l.def.seed;
    const theme = l.def.theme;
    const gAt = (tx: number, ty: number) => l.ground[Math.max(0, Math.min(l.h - 1, ty)) * l.w + Math.max(0, Math.min(l.w - 1, tx))];
    // yükseklikler: yabani haritalarda tepeler ve kenarlarda kayalık yamaçlar
    const wild = theme !== 'village' && theme !== 'lake';
    const spx = layout.spawn.x / TILE, spy = layout.spawn.y / TILE;
    // Göllere uzaklık (karo): su düzlemi tek yükseklikte (-0,32 m); tepe üstüne düşen göl tabanı suyun
    // üstünde kalıp "içi boş göl" gibi görünüyordu. Göl karoları her zaman suyun altına oyulur, çevresi kıyıya iner.
    const wd = new Float32Array(l.w * l.h).fill(1e9), qx: number[] = [];
    for (let k = 0; k < l.w * l.h; k++) if (l.ground[k] === G_WATER || l.ground[k] === G_DEEP || l.ground[k] === G_PLANK) { wd[k] = 0; qx.push(k); }
    for (let qi = 0; qi < qx.length; qi++) {
      const k = qx[qi], x = k % l.w, y = (k / l.w) | 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= l.w || ny >= l.h) continue;
        const nk = ny * l.w + nx; if (wd[nk] > wd[k] + 1) { wd[nk] = wd[k] + 1; qx.push(nk); }
      }
    }
    const WATER_Y = -0.32;
    // Yol/meydan ve kum düzleştirmesi yumuşak maskeyle: karo başına aç-kapa düzleştirme yol kenarında karo karo
    // basamaklar (kayalık yamaç dokulu, kesik kesik kenar) yapıyordu. Maske Gauss ile bulanıklaştırılıp çift doğrusal okunur.
    const blurMask = (pred: (g: number) => boolean) => {
      const W = l.w, H = l.h, R = 3, sg = 1.1, ker = Array.from({ length: R * 2 + 1 }, (_, i) => Math.exp(-((i - R) ** 2) / (2 * sg * sg)));
      const ks = ker.reduce((x, y) => x + y, 0);
      const a = new Float32Array(W * H), b = new Float32Array(W * H);
      for (let k = 0; k < W * H; k++) a[k] = pred(l.ground[k]) ? 1 : 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += a[y * W + Math.min(W - 1, Math.max(0, x + k))] * ker[k + R]; b[y * W + x] = v / ks; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += b[Math.min(H - 1, Math.max(0, y + k)) * W + x] * ker[k + R]; a[y * W + x] = v / ks; }
      return (tx: number, ty: number) => {
        const fx = Math.max(0, Math.min(W - 1.001, tx - 0.5)), fy = Math.max(0, Math.min(H - 1.001, ty - 0.5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
        const at = (x: number, y: number) => a[Math.min(H - 1, y) * W + Math.min(W - 1, x)];
        return (at(x0, y0) * (1 - u) + at(x0 + 1, y0) * u) * (1 - v) + (at(x0, y0 + 1) * (1 - u) + at(x0 + 1, y0 + 1) * u) * v;
      };
    };
    const roadW = blurMask((g) => g === 3 || g === 9), sandW = blurMask((g) => g === 2);
    for (let j = 0; j < this.hh; j++) for (let i = 0; i < this.hw; i++) {
      const tx = i / SUB, ty = j / SUB;
      let h = (fbm(tx / l.w, ty / l.h, 3, 4, seed) - 0.5) * (wild ? 3.4 : 0.6) + (fbm(tx / 9, ty / 9, 2, 3, seed + 11) - 0.5) * (wild ? 0.7 : 0.15);
      // doğuş noktası çevresi daha düz
      const ds = Math.hypot(tx - spx, ty - spy);
      if (ds < 8) h *= 0.35 + 0.65 * (ds / 8);
      // su çukurları: komşu tile'ların su oranı
      let water = 0, cnt = 0;
      for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const g = gAt(Math.floor(tx) + dx, Math.floor(ty) + dy); if (g === G_WATER || g === G_DEEP || g === G_PLANK) water += g === G_DEEP ? 1.6 : 1; cnt++; }
      h -= (water / cnt) * 1.3;
      // sınır yamaçları (doğal duvar)
      const edge = Math.min(tx, ty, l.w - tx, l.h - ty);
      const rim = wild ? 5 : 3;
      if (edge < rim) h += Math.pow(rim - edge, 1.35) * (wild ? 1.25 : 0.55) * (0.55 + fbm(tx / 6, ty / 6, 2, 3, seed + 3) * 0.9);
      // yollar ve meydan düz
      const rw = THREE.MathUtils.smoothstep(roadW(tx, ty), 0.05, 0.6), sw = sandW(tx, ty);
      h = THREE.MathUtils.lerp(h * (1 - 0.25 * sw), h * 0.25 + 0.02, rw);
      // (kenar yamacı ve yollardan sonra: kenardaki göller de dolu kalsın)
      if (water > 0) h = Math.min(h, WATER_Y - 0.18 - (water / cnt) * 0.9); // göl tabanı daima suyun altında
      else {
        // kıyıya uzaklık çift doğrusal okunur: karo karo okununca kıyı basamak basamak iniyor, kayalık yamaç
        // dokusu kenarda kesik kesik görünüyordu
        const fx = Math.max(0, Math.min(l.w - 1.001, tx - 0.5)), fy = Math.max(0, Math.min(l.h - 1.001, ty - 0.5));
        const x0 = Math.floor(fx), y0 = Math.floor(fy), u = fx - x0, v = fy - y0;
        const W_ = (x: number, y: number) => Math.min(6, wd[Math.min(l.h - 1, y) * l.w + Math.min(l.w - 1, x)]);
        const d = (W_(x0, y0) * (1 - u) + W_(x0 + 1, y0) * u) * (1 - v) + (W_(x0, y0 + 1) * (1 - u) + W_(x0 + 1, y0 + 1) * u) * v;
        if (d < 4) h = Math.min(h, THREE.MathUtils.lerp(WATER_Y + 0.08, Math.max(h, WATER_Y + 0.08), THREE.MathUtils.smoothstep(d, 0.3, 4))); // kıyıya yumuşak iniş
      }
      if (theme === 'tower' || theme === 'forge') {
        // Kadim Kule: oda zemini düz taş, odalar arası derin uçurum (köşedeki dört karodan biri oda ise zemin)
        let room = false;
        for (let dy = -1; dy <= 0 && !room; dy++) for (let dx = -1; dx <= 0; dx++) { const x0 = Math.floor(tx) + dx, y0 = Math.floor(ty) + dy; if (x0 >= 0 && y0 >= 0 && x0 < l.w && y0 < l.h && l.ground[y0 * l.w + x0] !== 8) { room = true; break; } }
        h = room ? (fbm(tx / 5, ty / 5, 2, 3, seed) - 0.5) * 0.08 : -9 - fbm(tx / 7, ty / 7, 2, 3, seed + 5) * 6;
      }
      this.heights[j * this.hw + i] = h;
    }
    // geometri
    const geo = new THREE.PlaneGeometry(l.w * TILE_M, l.h * TILE_M, this.hw - 1, this.hh - 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate((l.w * TILE_M) / 2, 0, (l.h * TILE_M) / 2);
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let k = 0; k < pos.count; k++) {
      const i = Math.round(pos.getX(k) / this.step), j = Math.round(pos.getZ(k) / this.step);
      pos.setY(k, this.heights[Math.min(this.hh - 1, j) * this.hw + Math.min(this.hw - 1, i)]);
    }
    geo.computeVertexNormals();
    // splat dokusu: her tile için katman ağırlıkları (12 kanal = 3 RGBA doku)
    // Karo başına tek değer çift doğrusal örneklenince yol/çimen kenarı merdiven gibi kesik kesik görünüyordu.
    // Ağırlıklar 4× çözünürlükte, Gauss bulanıklığıyla (σ ≈ 0,8 karo) yumuşatılır: kenarlar yuvarlak ve doğal kıvrımlı.
    const SS = 4, W = l.w * SS, H = l.h * SS;
    const splats: Uint8Array[] = [new Uint8Array(W * H * 4), new Uint8Array(W * H * 4), new Uint8Array(W * H * 4)];
    const used = new Set<number>();
    const lay = new Int8Array(l.w * l.h);
    for (let k = 0; k < l.w * l.h; k++) { const li = LAYER_NAMES.indexOf(GROUND_LAYERS[l.ground[k]]); lay[k] = li; used.add(li); }
    const R = 9, sig = 4.2, ker = Array.from({ length: R * 2 + 1 }, (_, i) => Math.exp(-((i - R) ** 2) / (2 * sig * sig)));
    const ks = ker.reduce((a, b) => a + b, 0); for (let i = 0; i < ker.length; i++) ker[i] /= ks;
    const A = new Float32Array(W * H), B = new Float32Array(W * H);
    for (const li of used) {
      for (let y = 0; y < H; y++) { const ty = (y / SS) | 0; for (let x = 0; x < W; x++) A[y * W + x] = lay[ty * l.w + ((x / SS) | 0)] === li ? 1 : 0; }
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += A[y * W + Math.min(W - 1, Math.max(0, x + k))] * ker[k + R]; B[y * W + x] = v; }
      const ch = splats[(li / 4) | 0], o = li % 4;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { let v = 0; for (let k = -R; k <= R; k++) v += B[Math.min(H - 1, Math.max(0, y + k)) * W + x] * ker[k + R]; ch[(y * W + x) * 4 + o] = Math.round(v * 255); }
    }
    const splatTex = splats.map((d) => {
      const t = new THREE.DataTexture(d, W, H, THREE.RGBAFormat);
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
      return t;
    });
    const arr = groundTextureArrays();
    // Zemin karışımı yalnız bu haritada geçen katmanlar (+ yamaç kayası) için, sabit indisli kodla üretilir.
    // Önceki 11 katmanlık döngü her pikselde dizileri değişken indisle okuyordu; telefon/tablet GPU'larında bu
    // yerel diziler belleğe taşar ve zemin (ekranın çoğu) karenin en pahalı parçası oluyordu. Sonuç aynı:
    // kullanılmayan katmanın ağırlığı zaten hep 0'dı ve atlanıyordu.
    const cliffI = LAYER_NAMES.indexOf('cliff');
    const active = [...new Set([...used].filter((i) => i >= 0).concat(cliffI))].sort((a, b) => a - b);
    const blendCode = active.map((i) => {
      const cl = i === cliffI;
      const w = `s${(i / 4) | 0}.${'xyzw'[i % 4]}`;
      const uv = cl ? 'mix(tuv, cuv, slope)' : 'tuv', gx = cl ? 'mix(tdx, cdx, slope)' : 'tdx', gy = cl ? 'mix(tdy, cdy, slope)' : 'tdy';
      return `  { float wi = ${w} * (1.0 - slope)${cl ? ' + slope' : ''};
    if (wi >= 0.01) {
      vec2 uvi = ${uv}, gx = ${gx}, gy = ${gy};
      vec4 c = textureGrad(uColArr, vec3(uvi, ${i}.0), gx, gy);
      float ww = pow(wi, 9.0) * (0.85 + 0.15 * dot(c.rgb, vec3(0.33)));
      col += c.rgb * ww;
#ifdef TERRAIN_LITE
      nor += vec3(0.0, 0.0, 1.0) * ww;
#else
      nor += (textureGrad(uNorArr, vec3(uvi, ${i}.0), gx, gy).xyz * 2.0 - 1.0) * ww;
#endif
      tot += ww;
    } }`;
    }).join('\n');
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const tint = theme === 'frozen' ? new THREE.Color(0.95, 0.98, 1.05) : theme === 'black' ? new THREE.Color(0.85, 0.8, 0.9) : theme === 'tower' ? new THREE.Color(0.5, 0.48, 0.6) : theme === 'forge' ? new THREE.Color(0.66, 0.54, 0.48) : new THREE.Color(1, 1, 1);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSplat0 = { value: splatTex[0] };
      sh.uniforms.uSplat1 = { value: splatTex[1] };
      sh.uniforms.uSplat2 = { value: splatTex[2] };
      sh.uniforms.uColArr = { value: arr.color };
      sh.uniforms.uNorArr = { value: arr.normal };
      sh.uniforms.uMapSize = { value: new THREE.Vector2(l.w * TILE_M, l.h * TILE_M) };
      sh.uniforms.uTint = { value: tint };
      sh.uniforms.uSnow = this.snow;
      sh.uniforms.uEnvI = this.envI;
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position,1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = '#ifdef TERRAIN_LITE\n#undef USE_ENVMAP\n#endif\n' + sh.fragmentShader
        .replace('#include <lights_fragment_maps>', `#include <lights_fragment_maps>
#ifdef TERRAIN_LITE
  // yansıma haritası yerine: gökyüzü ortalaması kadar yaygın ışık (zemin çoğunlukla yukarı bakar)
  { vec3 wn = inverseTransformDirection(normal, viewMatrix); iblIrradiance += PI * mix(vec3(0.42, 0.37, 0.3), vec3(0.86, 0.95, 1.02), smoothstep(-0.2, 0.8, wn.y)) * uEnvI * 0.94; }
#endif`)
        .replace('#include <common>', `#include <common>
precision highp float;
precision highp sampler2DArray;
varying vec3 vWPos; varying vec3 vWNor;
uniform sampler2D uSplat0; uniform sampler2D uSplat1; uniform sampler2D uSplat2;
uniform sampler2DArray uColArr; uniform sampler2DArray uNorArr;
uniform vec2 uMapSize; uniform vec3 uTint; uniform float uSnow; uniform float uEnvI;
// sin'siz karma (Dave Hoskins hash12): telefon GPU'larında büyük açılı sin hassas değil, gürültü ~1 m'lik bloklara bölünüp
// yol kenarında basamaklar ve zeminde dikdörtgen açık/koyu yamalar yapıyordu
float hsh(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x), mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x), f.y); }
vec3 gCol; vec3 gNor;
void groundBlend(){
  vec2 uv = vWPos.xz / uMapSize;
  // kenar dümdüz: örnekleme noktasına gürültü eklenmez (yumuşatılmış maske düz, temiz bir sınır verir)
  vec2 suv = uv;
  ${[...new Set(active.map((i) => (i / 4) | 0))].map((k) => `vec4 s${k} = texture2D(uSplat${k}, suv);`).join(' ')}
  // eğim: dik yerler kaya yamacı olur
  float slope = smoothstep(0.3, 0.5, 1.0 - normalize(vWNor).y);
  vec2 tuv = vWPos.xz / 2.4;
  // yamaçta dikey düzlemden örnekle (kaya dokusu gerilmesin)
  vec2 cuv = vec2(vWPos.x + vWPos.z, vWPos.y * 1.6) / 3.0;
  // Doku türevleri döngüden ÖNCE: döngüdeki koşullu atlama (continue) içinde örtük türev tanımsızdır ve
  // GPU doğru mipmap'i seçemez; uzaktaki taş/çimen dokusu en keskin seviyeden örneklenip yürürken
  // "kayan siyah çizgiler" olarak titriyordu.
  vec2 tdx = dFdx(tuv), tdy = dFdy(tuv), cdx = dFdx(cuv), cdy = dFdy(cuv);
  vec3 col = vec3(0.0); vec3 nor = vec3(0.0); float tot = 0.0;
  // her katman: ağırlık yüksek üsle (dar, net geçiş), dokunun parlaklığıyla hafif oynatılır
${blendCode}
  gCol = col / max(tot, 1e-4) * uTint;
  // geniş ölçekli renk varyasyonu (tekrar hissini kırar)
  gCol *= 0.82 + 0.3 * vn(vWPos.xz * 0.06) + 0.08 * vn(vWPos.xz * 0.5);
  // yeni yıl: zemine yamalı ince kar (taş yollar ve meydan da serpilir, eğimde azalır)
  if (uSnow > 0.0) {
    // yalnız geniş ölçekli gürültü (ince desen kamera kayarken ekranda kıpırdıyordu); kenar ekran türevine göre
    // yumuşatılır: yakında net, uzakta pikselden ince kalıp titremez
    float sn = vn(vWPos.xz * 0.22) * 0.65 + vn(vWPos.xz * 0.85) * 0.35;
    float aa = fwidth(sn) * 1.5 + 0.035;
    float cov = smoothstep(0.64 - aa, 0.7 + aa, sn) * (1.0 - slope) * uSnow;
    gCol = mix(gCol, vec3(0.66, 0.7, 0.76) * (0.94 + 0.06 * vn(vWPos.xz * 0.5)), cov * 0.7);
  }
  gNor = normalize(nor / max(tot, 1e-4));
}`)
        .replace('#include <map_fragment>', 'groundBlend();\ndiffuseColor.rgb *= gCol;')
        .replace('#include <normal_fragment_maps>', `{
  vec3 up = normalize(vWNor);
  vec3 T = normalize(cross(vec3(0.0,0.0,1.0), up));
  vec3 B = normalize(cross(up, T));
  vec3 wn = normalize(T * gNor.x + B * -gNor.y + up * gNor.z * 1.8); // kabartma yumuşak (anime görünüm)
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}`);
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
    if (MOBILE_T) this.buildChunks(geo, mat);
    this.buildWater(l);
  }

  /**
   * Telefon/tablet: zemin tek parça çizildiğinde ekranın arkasında kalan bölümler de dahil karede ~93 bin üçgen işleniyordu
   * (çözünürlükten bağımsız; tablette ekran kartının en büyük kalemlerinden). Zemin 36×36 hücrelik parçalara bölünür:
   * parçalar aynı köşe tamponlarını ve malzemeyi paylaşır, yalnız görüş alanındakiler çizilir. Görüntü aynı.
   */
  private chunks: THREE.Mesh[] = [];
  private buildChunks(geo: THREE.BufferGeometry, mat: THREE.Material) {
    const idx = geo.index!.array as ArrayLike<number>, pos = geo.attributes.position as THREE.BufferAttribute;
    const gx = this.hw - 1, gy = this.hh - 1, C = 36;
    const Arr = pos.count < 65536 ? Uint16Array : Uint32Array;
    for (let cy = 0; cy < gy; cy += C) for (let cx = 0; cx < gx; cx += C) {
      const x1 = Math.min(gx, cx + C), y1 = Math.min(gy, cy + C);
      const out = new Arr((x1 - cx) * (y1 - cy) * 6);
      let o = 0, minY = Infinity, maxY = -Infinity;
      for (let iy = cy; iy < y1; iy++) {
        const from = (iy * gx + cx) * 6, to = (iy * gx + x1) * 6;
        for (let k = from; k < to; k++) { const v = idx[k]; out[o++] = v; const h = pos.getY(v); if (h < minY) minY = h; if (h > maxY) maxY = h; }
      }
      const g = new THREE.BufferGeometry();
      for (const [k, a] of Object.entries(geo.attributes)) g.setAttribute(k, a);
      g.setIndex(new THREE.BufferAttribute(out, 1));
      g.boundingBox = new THREE.Box3(new THREE.Vector3(cx * this.step, minY, cy * this.step), new THREE.Vector3(x1 * this.step, maxY, y1 * this.step));
      g.boundingSphere = g.boundingBox.getBoundingSphere(new THREE.Sphere());
      const m = new THREE.Mesh(g, mat); m.receiveShadow = true; m.name = 'terrain-chunk';
      m.matrixAutoUpdate = false;
      this.chunks.push(m); this.mesh.add(m);
    }
    // ana zemin nesnesi çizilmez (parçaları çizilir); kendisi yerinde kalır (ekleme/kaldırma ve malzeme aynı yoldan)
    this.mesh.layers.disableAll();
  }

  private buildWater(l: MapLayout) {
    let any = false;
    const mask = new Uint8Array(l.w * l.h * 4);
    // Düzlem X ekseninde döndürüldüğü için UV'nin v'si dünyada z'nin TERSİ yönde: satırlar ters yazılır.
    // (Önceden maske dikeyde aynalanıyordu: göller suyu olmayan boş çukur, su ise çimenin üstünde kalıyordu.)
    for (let ty = 0; ty < l.h; ty++) for (let tx = 0; tx < l.w; tx++) {
      const g = l.ground[ty * l.w + tx];
      const v = g === G_WATER || g === G_PLANK ? 230 : g === G_DEEP ? 255 : 0;
      if (v) any = true;
      const i = (l.h - 1 - ty) * l.w + tx;
      mask[i * 4] = mask[i * 4 + 1] = mask[i * 4 + 2] = v; mask[i * 4 + 3] = 255;
    }
    if (!any) return;
    const alpha = new THREE.DataTexture(mask, l.w, l.h, THREE.RGBAFormat);
    alpha.magFilter = THREE.LinearFilter; alpha.minFilter = THREE.LinearFilter; alpha.needsUpdate = true;
    // dalga normal dokusu
    const S = 256;
    const h = new Float32Array(S * S);
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) h[y * S + x] = fbm(x / S, y / S, 6, 4, 777) * 0.7 + fbm(x / S, y / S, 20, 2, 778) * 0.3;
    const nd = new Uint8Array(S * S * 4);
    const H = (x: number, y: number) => h[((y + S) % S) * S + ((x + S) % S)];
    for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
      const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
      const len = Math.hypot(dx, dy, 1);
      const i = (y * S + x) * 4;
      nd[i] = (-dx / len * 0.5 + 0.5) * 255; nd[i + 1] = (-dy / len * 0.5 + 0.5) * 255; nd[i + 2] = (1 / len * 0.5 + 0.5) * 255; nd[i + 3] = 255;
    }
    const nt = new THREE.DataTexture(nd, S, S, THREE.RGBAFormat);
    nt.wrapS = nt.wrapT = THREE.RepeatWrapping; nt.generateMipmaps = true; nt.minFilter = THREE.LinearMipmapLinearFilter; nt.needsUpdate = true;
    nt.repeat.set(l.w * TILE_M / 6, l.h * TILE_M / 6);
    this.waterNormal = nt;
    // Yüzey yalnız suyun bulunduğu 4×4 karoluk bloklarda (1 karo pay: kıyıdaki yumuşak geçiş kesilmesin).
    // Önceden bütün haritayı kaplayan tek saydam düzlemdi; suyun hiç olmadığı ekran alanında da gölgelendirici çalışıyordu.
    // UV'ler tüm haritaya göre aynı (alfa maskesi ve dalga dokusu değişmez): görünüm birebir aynı.
    const MW = l.w * TILE_M, MH = l.h * TILE_M, B = 4, parts: THREE.BufferGeometry[] = [];
    const wet = (tx: number, ty: number) => { const g = l.ground[ty * l.w + tx]; return g === G_WATER || g === G_PLANK || g === G_DEEP; };
    for (let by = 0; by < l.h; by += B) for (let bx = 0; bx < l.w; bx += B) {
      let hit = false;
      for (let ty = Math.max(0, by - 1); ty < Math.min(l.h, by + B + 1) && !hit; ty++) for (let tx = Math.max(0, bx - 1); tx < Math.min(l.w, bx + B + 1); tx++) if (wet(tx, ty)) { hit = true; break; }
      if (!hit) continue;
      const bw = Math.min(B, l.w - bx) * TILE_M, bh = Math.min(B, l.h - by) * TILE_M;
      const q = new THREE.PlaneGeometry(bw, bh, 1, 1);
      q.rotateX(-Math.PI / 2);
      q.translate(bx * TILE_M + bw / 2, -0.32, by * TILE_M + bh / 2);
      const p = q.attributes.position as THREE.BufferAttribute, uv = q.attributes.uv as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / MW, 1 - p.getZ(i) / MH);
      parts.push(q);
    }
    const geo = mergeGeometries(parts)!;
    const frozen = l.def.theme === 'frozen';
    const mat = new THREE.MeshStandardMaterial({
      color: frozen ? 0x9cc8e0 : l.def.theme === 'black' ? 0x1a2a3a : 0x2a6a8a, roughness: frozen ? 0.25 : 0.06, metalness: 0.1,
      transparent: true, opacity: frozen ? 0.9 : 0.86, alphaMap: alpha, normalMap: nt, normalScale: new THREE.Vector2(0.6, 0.6), depthWrite: false, envMapIntensity: 1.4,
    });
    // alphaMap UV'si harita boyutunda (0..1); normalMap için ayrı tekrar gerekir → normal UV'yi shader'da çarp
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uRep = { value: new THREE.Vector2(l.w * TILE_M / 5, l.h * TILE_M / 5) };
      sh.uniforms.uTime = { value: 0 };
      (mat.userData as any).shader = sh;
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', '#include <common>\nuniform vec2 uRep; uniform float uTime;')
        .replace('#include <normal_fragment_maps>', `
          vec3 n1 = texture2D(normalMap, vNormalMapUv * uRep + vec2(uTime*0.012, uTime*0.008)).xyz * 2.0 - 1.0;
          vec3 n2 = texture2D(normalMap, vNormalMapUv * uRep * 1.7 - vec2(uTime*0.01, -uTime*0.014)).xyz * 2.0 - 1.0;
          vec3 mapN = normalize(vec3((n1.xy + n2.xy) * normalScale, n1.z * n2.z));
          normal = normalize(tbn * mapN);`);
    };
    nt.repeat.set(1, 1);
    this.water = new THREE.Mesh(geo, mat);
    this.water.renderOrder = 2;
    this.water.receiveShadow = false;
  }

  update(t: number) {
    const sh = this.water && ((this.water.material as THREE.MeshStandardMaterial).userData as any).shader;
    if (sh) sh.uniforms.uTime.value = t / 1000;
  }

  /** Sunucu koordinatında zemin yüksekliği (metre). */
  heightAt(x: number, y: number): number {
    // iskele tahtası: karakter suyun üstündeki tahtalarda durur (altı göl)
    const l = this.layout, ttx = Math.floor(x / 64), tty = Math.floor(y / 64);
    if (ttx >= 0 && tty >= 0 && ttx < l.w && tty < l.h && l.ground[tty * l.w + ttx] === G_PLANK) return DECK_Y;
    const fx = (x * U) / this.step, fy = (y * U) / this.step;
    const i = Math.max(0, Math.min(this.hw - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.hh - 2, Math.floor(fy)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j));
    const H = this.heights, w = this.hw;
    const a = H[j * w + i], b = H[j * w + i + 1], c = H[(j + 1) * w + i], d = H[(j + 1) * w + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  dispose() {
    for (const c of this.chunks) c.geometry.dispose(); this.chunks = [];
    this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose();
    if (this.water) { this.water.geometry.dispose(); (this.water.material as THREE.Material).dispose(); }
  }
}
