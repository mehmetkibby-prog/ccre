import * as THREE from 'three';
import { TILE, type MapLayout } from '@col/shared';
import { groundTextureArrays, GROUND_LAYERS, LAYER_NAMES, fbm } from './textures.ts';

/** Sunucu birimi → metre */
export const U = 1 / 40;
export const TILE_M = TILE * U;

const G_WATER = 4, G_DEEP = 10;

export class Terrain {
  mesh: THREE.Mesh;
  water: THREE.Mesh | null = null;
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
    for (let j = 0; j < this.hh; j++) for (let i = 0; i < this.hw; i++) {
      const tx = i / SUB, ty = j / SUB;
      let h = (fbm(tx / l.w, ty / l.h, 3, 4, seed) - 0.5) * (wild ? 3.4 : 0.6) + (fbm(tx / 9, ty / 9, 2, 3, seed + 11) - 0.5) * (wild ? 0.7 : 0.15);
      // doğuş noktası çevresi daha düz
      const ds = Math.hypot(tx - spx, ty - spy);
      if (ds < 8) h *= 0.35 + 0.65 * (ds / 8);
      // su çukurları: komşu tile'ların su oranı
      let water = 0, cnt = 0;
      for (let dy = -1; dy <= 0; dy++) for (let dx = -1; dx <= 0; dx++) { const g = gAt(Math.floor(tx) + dx, Math.floor(ty) + dy); if (g === G_WATER || g === G_DEEP) water += g === G_DEEP ? 1.6 : 1; cnt++; }
      h -= (water / cnt) * 1.3;
      // sınır yamaçları (doğal duvar)
      const edge = Math.min(tx, ty, l.w - tx, l.h - ty);
      const rim = wild ? 5 : 3;
      if (edge < rim) h += Math.pow(rim - edge, 1.35) * (wild ? 1.25 : 0.55) * (0.55 + fbm(tx / 6, ty / 6, 2, 3, seed + 3) * 0.9);
      // yollar ve meydan düz
      const g = gAt(Math.floor(tx), Math.floor(ty));
      if (g === 3 || g === 9 || g === 11) h = h * 0.25 + 0.02;
      else if (g === 2) h *= 0.75;
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
    const nl = LAYER_NAMES.length;
    const splats: Uint8Array[] = [new Uint8Array(l.w * l.h * 4), new Uint8Array(l.w * l.h * 4), new Uint8Array(l.w * l.h * 4)];
    for (let ty = 0; ty < l.h; ty++) for (let tx = 0; tx < l.w; tx++) {
      const g = l.ground[ty * l.w + tx];
      const layer = LAYER_NAMES.indexOf(GROUND_LAYERS[g]);
      const idx = ty * l.w + tx;
      splats[(layer / 4) | 0][idx * 4 + (layer % 4)] = 255;
    }
    const splatTex = splats.map((d) => {
      const t = new THREE.DataTexture(d, l.w, l.h, THREE.RGBAFormat);
      t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearFilter; t.needsUpdate = true;
      return t;
    });
    const arr = groundTextureArrays();
    const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.95, metalness: 0 });
    const tint = theme === 'frozen' ? new THREE.Color(0.95, 0.98, 1.05) : theme === 'black' ? new THREE.Color(0.85, 0.8, 0.9) : new THREE.Color(1, 1, 1);
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uSplat0 = { value: splatTex[0] };
      sh.uniforms.uSplat1 = { value: splatTex[1] };
      sh.uniforms.uSplat2 = { value: splatTex[2] };
      sh.uniforms.uColArr = { value: arr.color };
      sh.uniforms.uNorArr = { value: arr.normal };
      sh.uniforms.uMapSize = { value: new THREE.Vector2(l.w * TILE_M, l.h * TILE_M) };
      sh.uniforms.uTint = { value: tint };
      sh.vertexShader = sh.vertexShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWPos;\nvarying vec3 vWNor;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWPos = (modelMatrix * vec4(position,1.0)).xyz;\nvWNor = normalize(mat3(modelMatrix) * normal);');
      sh.fragmentShader = sh.fragmentShader
        .replace('#include <common>', `#include <common>
precision highp sampler2DArray;
varying vec3 vWPos; varying vec3 vWNor;
uniform sampler2D uSplat0; uniform sampler2D uSplat1; uniform sampler2D uSplat2;
uniform sampler2DArray uColArr; uniform sampler2DArray uNorArr;
uniform vec2 uMapSize; uniform vec3 uTint;
float hsh(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
float vn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hsh(i),hsh(i+vec2(1,0)),f.x), mix(hsh(i+vec2(0,1)),hsh(i+vec2(1,1)),f.x), f.y); }
vec3 gCol; vec3 gNor;
void groundBlend(){
  vec2 uv = vWPos.xz / uMapSize;
  vec2 j = vec2(vn(vWPos.xz*0.9), vn(vWPos.xz*0.9+17.3)) - 0.5;
  vec2 suv = uv + j * (${(TILE_M * 0.9).toFixed(3)} / uMapSize);
  vec4 s0 = texture2D(uSplat0, suv), s1 = texture2D(uSplat1, suv), s2 = texture2D(uSplat2, suv);
  float w[${nl}];
  vec4 SP[3]; SP[0]=s0; SP[1]=s1; SP[2]=s2;
  for (int i = 0; i < ${nl}; i++) w[i] = SP[i / 4][i - (i / 4) * 4];
  // eğim: dik yerler kaya yamacı olur
  float slope = smoothstep(0.2, 0.42, 1.0 - normalize(vWNor).y);
  for (int i = 0; i < ${nl}; i++) w[i] *= (1.0 - slope);
  w[${LAYER_NAMES.indexOf('cliff')}] += slope;
  vec2 tuv = vWPos.xz / 2.4;
  // yamaçta dikey düzlemden örnekle (kaya dokusu gerilmesin)
  vec2 cuv = vec2(vWPos.x + vWPos.z, vWPos.y * 1.6) / 3.0;
  vec3 col = vec3(0.0); vec3 nor = vec3(0.0); float tot = 0.0;
  for (int i = 0; i < ${nl}; i++) {
    if (w[i] < 0.01) continue;
    vec2 uvi = i == ${LAYER_NAMES.indexOf('cliff')} ? mix(tuv, cuv, slope) : tuv;
    vec4 c = texture(uColArr, vec3(uvi, float(i)));
    // yükseklik tabanlı keskin geçiş: taşlar çimenin içinden çıkar
    float hgt = dot(c.rgb, vec3(0.33));
    float ww = pow(w[i], 1.6) * (0.35 + hgt);
    ww = ww * ww;
    col += c.rgb * ww;
    nor += (texture(uNorArr, vec3(uvi, float(i))).xyz * 2.0 - 1.0) * ww;
    tot += ww;
  }
  gCol = col / max(tot, 1e-4) * uTint;
  // geniş ölçekli renk varyasyonu (tekrar hissini kırar)
  gCol *= 0.82 + 0.3 * vn(vWPos.xz * 0.06) + 0.08 * vn(vWPos.xz * 0.5);
  gNor = normalize(nor / max(tot, 1e-4));
}`)
        .replace('#include <map_fragment>', 'groundBlend();\ndiffuseColor.rgb *= gCol;')
        .replace('#include <normal_fragment_maps>', `{
  vec3 up = normalize(vWNor);
  vec3 T = normalize(cross(vec3(0.0,0.0,1.0), up));
  vec3 B = normalize(cross(up, T));
  vec3 wn = normalize(T * gNor.x + B * -gNor.y + up * gNor.z * 1.2);
  normal = normalize((viewMatrix * vec4(wn, 0.0)).xyz);
}`);
    };
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.receiveShadow = true;
    this.mesh.name = 'terrain';
    this.buildWater(l);
  }

  private buildWater(l: MapLayout) {
    let any = false;
    const mask = new Uint8Array(l.w * l.h * 4);
    for (let i = 0; i < l.w * l.h; i++) {
      const g = l.ground[i];
      const v = g === G_WATER ? 230 : g === G_DEEP ? 255 : 0;
      if (v) any = true;
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
    const geo = new THREE.PlaneGeometry(l.w * TILE_M, l.h * TILE_M, 1, 1);
    geo.rotateX(-Math.PI / 2);
    geo.translate((l.w * TILE_M) / 2, -0.32, (l.h * TILE_M) / 2);
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
    const fx = (x * U) / this.step, fy = (y * U) / this.step;
    const i = Math.max(0, Math.min(this.hw - 2, Math.floor(fx))), j = Math.max(0, Math.min(this.hh - 2, Math.floor(fy)));
    const u = Math.min(1, Math.max(0, fx - i)), v = Math.min(1, Math.max(0, fy - j));
    const H = this.heights, w = this.hw;
    const a = H[j * w + i], b = H[j * w + i + 1], c = H[(j + 1) * w + i], d = H[(j + 1) * w + i + 1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }

  dispose() {
    this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose();
    if (this.water) { this.water.geometry.dispose(); (this.water.material as THREE.Material).dispose(); }
  }
}
