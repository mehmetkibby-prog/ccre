import * as THREE from 'three';
import { objTexture, leafTexture } from './textures.ts';

export const shared = { time: { value: 0 }, focus: { value: new THREE.Vector3() }, cam: { value: new THREE.Vector3() }, cutR: { value: 3.0 } };

type Patch = (sh: THREE.WebGLProgramParametersWithUniforms) => void;
/** Birden çok shader yamasını zincirler (rüzgâr + görüş deliği). */
function patch(m: THREE.Material, key: string, fn: Patch) {
  const ud = m.userData as { patches?: Patch[]; keys?: string[] };
  (ud.patches ??= []).push(fn); (ud.keys ??= []).push(key);
  m.onBeforeCompile = (sh) => { for (const f of ud.patches!) f(sh); };
  m.customProgramCacheKey = () => ud.keys!.join('|');
}

/** Görüş deliği: kamera ile oyuncu arasındaki objeler titreşimli (dither) kesilir. */
export function addCutout(m: THREE.Material) {
  patch(m, 'cut', (sh) => {
    sh.uniforms.uFocus = shared.focus; sh.uniforms.uCam = shared.cam; sh.uniforms.uCutR = shared.cutR;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutW;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        { vec4 cw = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            cw = instanceMatrix * cw;
          #endif
          vCutW = (modelMatrix * cw).xyz; }`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vCutW; uniform vec3 uFocus; uniform vec3 uCam; uniform float uCutR;')
      .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
        {
          vec3 ab = uFocus - uCam;
          float tt = clamp(dot(vCutW - uCam, ab) / dot(ab, ab), 0.0, 1.0);
          float dd = length(vCutW - (uCam + ab * tt));
          // koni: kameraya yakın yerde dar, oyuncuya yakın yerde geniş delik
          float rr = uCutR * (0.25 + 0.75 * tt);
          if (tt < 0.985 && dd < rr && vCutW.y > uFocus.y - 0.6) {
            float k = dd / rr;
            // 4x4 Bayer düzenli titreşim: gürültüsüz, temiz geçiş
            ivec2 q = ivec2(mod(gl_FragCoord.xy, 4.0));
            int bi = q.x + q.y * 4;
            float bayer[16] = float[16](0.0,8.0,2.0,10.0,12.0,4.0,14.0,6.0,3.0,11.0,1.0,9.0,15.0,7.0,13.0,5.0);
            float th = (bayer[bi] + 0.5) / 16.0;
            if (th > smoothstep(0.55, 1.0, k)) discard;
          }
        }`);
  });
  return m;
}

/** Mesafeye göre yumuşak küçülme: çimen alanının kenarında "pat" diye belirme olmaz. */
export const fadeR = { value: 30 };
export function addFade(m: THREE.Material) {
  patch(m, 'fade', (sh) => {
    sh.uniforms.uFadeC = shared.focus; sh.uniforms.uFadeR = fadeR;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uFadeC; uniform float uFadeR;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 io = vec4(0.0, 0.0, 0.0, 1.0);
          #ifdef USE_INSTANCING
            io = instanceMatrix * io;
          #endif
          io = modelMatrix * io;
          float fd = distance(io.xz, uFadeC.xz);
          transformed *= 1.0 - smoothstep(uFadeR - 9.0, uFadeR, fd);
        }`);
  });
  return m;
}

/** Rüzgâr: yapraklar/çimen için köşe kaydırma (dünya konumu + yükseklik ağırlıklı). */
export function addWind(m: THREE.Material, strength = 0.08, heightRef = 3) {
  patch(m, 'wind' + strength + heightRef, (sh) => {
    sh.uniforms.uTime = shared.time;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uTime;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        {
          vec4 wp0 = vec4(transformed, 1.0);
          #ifdef USE_INSTANCING
            wp0 = instanceMatrix * wp0;
          #endif
          wp0 = modelMatrix * wp0;
          float k = clamp(transformed.y / ${heightRef.toFixed(2)}, 0.0, 1.5);
          float ph = wp0.x * 0.35 + wp0.z * 0.27;
          transformed.x += sin(uTime * 1.6 + ph) * ${strength.toFixed(3)} * k;
          transformed.z += cos(uTime * 1.3 + ph * 1.3) * ${(strength * 0.7).toFixed(3)} * k;
        }`);
  });
  return m;
}

const cache = new Map<string, THREE.Material>();
function texMat(name: string, opts: THREE.MeshStandardMaterialParameters = {}, repeat = 1) {
  const t = objTexture(name);
  const map = t.map.clone(); map.needsUpdate = true; map.repeat.set(repeat, repeat);
  const nor = t.normal.clone(); nor.needsUpdate = true; nor.repeat.set(repeat, repeat);
  return new THREE.MeshStandardMaterial({ map, normalMap: nor, roughness: 0.9, metalness: 0, ...opts });
}

export function mat(key: string): THREE.Material {
  let m = cache.get(key);
  if (m) return m;
  switch (key) {
    case 'bark': m = texMat('bark', { color: 0xc8b8a8 }); break;
    case 'bark_dead': m = texMat('bark', { color: 0x6a6070 }); break;
    case 'leaves': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('broad'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0xbdd28a }), 0.09, 5); break;
    case 'leaves_autumn': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('broad'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0xffcc88 }), 0.09, 5); break;
    case 'needles': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('needle'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, color: 0xa8c49c }), 0.05, 7); break;
    case 'needles_snow': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('needle'), alphaTest: 0.4, side: THREE.DoubleSide, roughness: 0.9, color: 0xb8d8d0 }), 0.04, 7); break;
    case 'bush': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('broad'), alphaTest: 0.45, side: THREE.DoubleSide, roughness: 0.85, color: 0xb2cc82 }), 0.05, 1.2); break;
    case 'grass': m = addWind(new THREE.MeshStandardMaterial({ map: leafTexture('grass'), alphaTest: 0.35, alphaToCoverage: true, side: THREE.DoubleSide, roughness: 0.95, color: 0xf0fce8 }), 0.12, 0.6); break;
    // anime ağaç taçları: köşe renkli dolgun kütle (yaprak kartı yok), hafif rüzgâr
    case 'canopy': m = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), 0.05, 6); break;
    case 'canopy_low': m = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }), 0.03, 1.5); break;
    case 'pine_core': m = new THREE.MeshStandardMaterial({ color: 0x35553a, roughness: 0.95, side: THREE.DoubleSide }); break;
    case 'pine_core_snow': m = new THREE.MeshStandardMaterial({ color: 0x3a5a52, roughness: 0.95, side: THREE.DoubleSide }); break;
    case 'snow': m = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, roughness: 0.7 }); break;
    case 'rock': m = texMat('rock', { color: 0xffffff }); break;
    case 'rock_dark': m = texMat('rock', { color: 0x605868 }); break;
    case 'plaster': m = texMat('plaster', {}, 0.5); break;
    case 'timber': m = texMat('timber', { roughness: 0.8 }); break;
    case 'stonewall': m = texMat('stonewall', {}, 0.6); break;
    case 'roof_red': m = texMat('rooftile', { color: 0xb8988a, roughness: 0.8 }, 0.5); break;
    case 'roof_slate': m = texMat('rooftile_slate', { roughness: 0.6 }, 0.5); break;
    case 'roof_green': m = texMat('rooftile_slate', { color: 0x9aa890, roughness: 0.7 }, 0.5); break;
    case 'roof_blue': m = texMat('rooftile_slate', { color: 0xa0b8ff, roughness: 0.6 }, 0.5); break;
    case 'planks': m = texMat('timber', { color: 0xd8b088 }, 1); break;
    case 'metal': m = texMat('metal', { color: 0x9aa4b0, metalness: 0.9, roughness: 0.35 }); break;
    case 'iron': m = texMat('metal', { color: 0x4a4c54, metalness: 0.85, roughness: 0.5 }); break;
    case 'gold': m = new THREE.MeshStandardMaterial({ color: 0xd8a840, metalness: 1, roughness: 0.3 }); break;
    case 'glass_warm': m = new THREE.MeshStandardMaterial({ color: 0x402010, emissive: 0xffa040, emissiveIntensity: 1.6, roughness: 0.3 }); break;
    case 'ember': m = new THREE.MeshStandardMaterial({ color: 0x401000, emissive: 0xff5a10, emissiveIntensity: 2.2 }); break;
    case 'crystal': m = new THREE.MeshStandardMaterial({ color: 0x8a50d0, emissive: 0x9a40ff, emissiveIntensity: 0.9, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.88 }); break;
    case 'ice': m = new THREE.MeshStandardMaterial({ color: 0xc0ecff, emissive: 0x3a90c0, emissiveIntensity: 0.35, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.85 }); break;
    case 'rune_green': m = new THREE.MeshStandardMaterial({ color: 0x103020, emissive: 0x3ef09a, emissiveIntensity: 2.4 }); break;
    case 'rune_blue': m = new THREE.MeshStandardMaterial({ color: 0x102030, emissive: 0x7cf3ff, emissiveIntensity: 2.4 }); break;
    case 'rune_red': m = new THREE.MeshStandardMaterial({ color: 0x300808, emissive: 0xff3050, emissiveIntensity: 2.6 }); break;
    case 'water_small': m = new THREE.MeshStandardMaterial({ color: 0x3a8ab0, roughness: 0.05, transparent: true, opacity: 0.8 }); break;
    case 'cloth_red': m = texMat('cloth', { color: 0xa02828, side: THREE.DoubleSide }, 2); break;
    case 'cloth_green': m = texMat('cloth', { color: 0x2a6a3a, side: THREE.DoubleSide }, 2); break;
    case 'cloth_cream': m = texMat('cloth', { color: 0xe8dcc0, side: THREE.DoubleSide }, 2); break;
    case 'hay': m = new THREE.MeshStandardMaterial({ color: 0xd8b860, roughness: 1 }); break;
    case 'vcolor': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85 }); break;
    case 'flower': m = addWind(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 }), 0.04, 0.4); break;
    case 'mushroom': m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }); break;
    case 'bone': m = new THREE.MeshStandardMaterial({ color: 0xe0d8c0, roughness: 0.7 }); break;
    case 'waterfall': m = new THREE.MeshStandardMaterial({ color: 0xd8f4ff, emissive: 0x204050, transparent: true, opacity: 0.85, roughness: 0.1 }); break;
    default: m = new THREE.MeshStandardMaterial({ color: 0xff00ff });
  }
  if (CUT.has(key)) addCutout(m);
  cache.set(key, m);
  return m;
}
const CUT = new Set(['canopy', 'canopy_low', 'bark', 'bark_dead', 'leaves', 'leaves_autumn', 'needles', 'needles_snow', 'bush', 'pine_core', 'pine_core_snow', 'snow', 'rock', 'rock_dark', 'plaster', 'timber', 'stonewall', 'roof_red', 'roof_slate', 'roof_green', 'roof_blue', 'planks', 'glass_warm', 'cloth_red', 'cloth_green', 'cloth_cream', 'hay', 'iron', 'crystal', 'ice']);
