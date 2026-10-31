import * as THREE from 'three';

/**
 * Prosedürel, döşenebilir (tileable) dokular + kabartma (normal) haritaları.
 * Hepsi kodla üretilir; dış görsel kullanılmaz.
 */
export interface TexSet { color: Uint8ClampedArray; height: Float32Array; size: number }

function hash(x: number, y: number, s: number) {
  let h = (Math.imul(x, 374761393) + Math.imul(y, 668265263) + Math.imul(s, 1442695041)) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
/** Periyodik değer gürültüsü: (x,y) ∈ [0,period) döşenebilir. */
function vnoise(x: number, y: number, period: number, seed: number) {
  const xi = Math.floor(x), yi = Math.floor(y);
  const xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const m = (a: number) => ((a % period) + period) % period;
  const a = hash(m(xi), m(yi), seed), b = hash(m(xi + 1), m(yi), seed), c = hash(m(xi), m(yi + 1), seed), d = hash(m(xi + 1), m(yi + 1), seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}
export function fbm(x: number, y: number, base: number, oct: number, seed: number) {
  let s = 0, amp = 0.5, f = base, tot = 0;
  for (let i = 0; i < oct; i++) { s += vnoise(x * f, y * f, f, seed + i * 31) * amp; tot += amp; amp *= 0.5; f *= 2; }
  return s / tot;
}
/** Döşenebilir Voronoi: en yakın ve ikinci yakın hücre mesafesi. */
function voronoi(x: number, y: number, cells: number, seed: number) {
  const px = x * cells, py = y * cells;
  const xi = Math.floor(px), yi = Math.floor(py);
  let d1 = 9, d2 = 9, id = 0;
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const cx = xi + i, cy = yi + j;
    const wx = ((cx % cells) + cells) % cells, wy = ((cy % cells) + cells) % cells;
    const fx = cx + 0.15 + hash(wx, wy, seed) * 0.7, fy = cy + 0.15 + hash(wy, wx, seed + 7) * 0.7;
    const d = Math.hypot(fx - px, fy - py);
    if (d < d1) { d2 = d1; d1 = d; id = wx * 131 + wy; } else if (d < d2) d2 = d;
  }
  return { d1, d2, id };
}

type Painter = (u: number, v: number) => [number, number, number, number]; // r,g,b, height
function make(size: number, p: Painter): TexSet {
  const color = new Uint8ClampedArray(size * size * 4);
  const height = new Float32Array(size * size);
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const [r, g, b, h] = p(x / size, y / size);
    const i = (y * size + x) * 4;
    color[i] = r; color[i + 1] = g; color[i + 2] = b; color[i + 3] = 255;
    height[y * size + x] = h;
  }
  return { color, height, size };
}
const mixc = (a: number[], b: number[], t: number) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Normal haritası (Sobel), döşenebilir. */
export function normalFrom(t: TexSet, strength: number): Uint8ClampedArray {
  const { size, height } = t;
  const out = new Uint8ClampedArray(size * size * 4);
  const H = (x: number, y: number) => height[((y + size) % size) * size + ((x + size) % size)];
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const dx = (H(x + 1, y - 1) + 2 * H(x + 1, y) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x - 1, y) + H(x - 1, y + 1));
    const dy = (H(x - 1, y + 1) + 2 * H(x, y + 1) + H(x + 1, y + 1)) - (H(x - 1, y - 1) + 2 * H(x, y - 1) + H(x + 1, y - 1));
    let nx = -dx * strength, ny = -dy * strength, nz = 1;
    const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
    const i = (y * size + x) * 4;
    out[i] = (nx * 0.5 + 0.5) * 255; out[i + 1] = (ny * 0.5 + 0.5) * 255; out[i + 2] = (nz * 0.5 + 0.5) * 255; out[i + 3] = 255;
  }
  return out;
}

// ───────────── zemin dokuları ─────────────
export const GROUND_PAINTERS: Record<string, Painter> = {
  grass(u, v) {
    const n = fbm(u, v, 4, 5, 11), n2 = fbm(u, v, 16, 3, 12), blade = fbm(u * 1, v * 1, 64, 2, 13);
    const dry = clamp01((fbm(u, v, 3, 3, 14) - 0.55) * 3);
    let c = mixc([58, 96, 34], [104, 142, 52], n * 0.8 + blade * 0.4);
    c = mixc(c, [128, 128, 64], dry * 0.45);
    const k = 0.8 + n2 * 0.35;
    return [c[0] * k, c[1] * k, c[2] * k, blade * 0.7 + n * 0.3];
  },
  lush(u, v) {
    const n = fbm(u, v, 4, 5, 21), blade = fbm(u, v, 64, 2, 23);
    const c = mixc([40, 82, 30], [78, 124, 44], n * 0.7 + blade * 0.5);
    const flower = hash(Math.floor(u * 90), Math.floor(v * 90), 5) > 0.992 ? 1 : 0;
    return flower ? [230, 220, 120, 1] : [c[0], c[1], c[2], blade];
  },
  dirt(u, v) {
    const n = fbm(u, v, 3, 6, 31), n2 = fbm(u, v, 12, 4, 32);
    const vo = voronoi(u, v, 10, 33);
    const pebble = vo.d1 < 0.16 && hash(vo.id, 1, 34) > 0.82 ? 1 - vo.d1 / 0.16 : 0;
    const crack = clamp01(1 - (vo.d2 - vo.d1) * 22) * clamp01((n2 - 0.45) * 4);
    let c = mixc([78, 58, 40], [134, 104, 72], n * 0.75 + n2 * 0.35);
    c = mixc(c, [128, 120, 108], pebble * 0.85);
    c = mixc(c, [50, 36, 24], crack * 0.6);
    return [c[0], c[1], c[2], n * 0.5 + n2 * 0.3 + pebble * 0.5 - crack * 0.3];
  },
  cobble(u, v) {
    const vo = voronoi(u, v, 9, 41);
    const edge = clamp01((vo.d2 - vo.d1) * 6);
    const tint = hash(vo.id, 3, 42);
    const n = fbm(u, v, 32, 3, 43);
    const stone = mixc(mixc([112, 104, 94], [168, 152, 128], tint), [140, 128, 112], n * 0.3);
    const mortar = [48, 42, 34];
    const c = mixc(mortar, stone, Math.pow(edge, 0.6));
    const h = Math.pow(edge, 0.5) * (0.8 + n * 0.2);
    return [c[0], c[1], c[2], h];
  },
  sand(u, v) {
    const n = fbm(u, v, 6, 4, 51), ripple = Math.sin((v + fbm(u, v, 3, 2, 52) * 0.4) * Math.PI * 28) * 0.5 + 0.5;
    const c = mixc([196, 172, 124], [228, 208, 160], n * 0.6 + ripple * 0.25);
    return [c[0], c[1], c[2], ripple * 0.4 + n * 0.3];
  },
  snow(u, v) {
    const n = fbm(u, v, 4, 5, 61), sp = hash(Math.floor(u * 256), Math.floor(v * 256), 62) > 0.985 ? 30 : 0;
    const c = mixc([200, 214, 230], [248, 252, 255], n);
    return [c[0] + sp, c[1] + sp, c[2] + sp, n];
  },
  ice(u, v) {
    const n = fbm(u, v, 3, 4, 71), vo = voronoi(u, v, 5, 72);
    const crack = vo.d2 - vo.d1 < 0.04 ? 1 : 0;
    const c = mixc([120, 170, 205], [190, 225, 245], n);
    return crack ? [235, 245, 255, 0.2] : [c[0], c[1], c[2], 0.5 + n * 0.2];
  },
  ash(u, v) {
    const n = fbm(u, v, 4, 5, 81), n2 = fbm(u, v, 20, 3, 82);
    const vo = voronoi(u, v, 7, 83);
    const crack = clamp01(1 - (vo.d2 - vo.d1) * 20);
    let c = mixc([34, 30, 38], [72, 64, 74], n * 0.7 + n2 * 0.3);
    c = mixc(c, [150, 50, 30], crack * 0.6);
    return [c[0], c[1], c[2], n * 0.5 - crack * 0.4];
  },
  flagstone(u, v) {
    // büyük kesme taş plakalar
    const gx = u * 4, gy = v * 4;
    const row = Math.floor(gy), off = row % 2 ? 0.5 : 0;
    const fx = (gx + off) % 1, fy = gy % 1;
    const edge = Math.min(fx, 1 - fx, fy, 1 - fy);
    const id = Math.floor(gx + off) * 17 + row;
    const n = fbm(u, v, 16, 4, 91);
    const c = mixc([96, 92, 100], [140, 134, 140], hash(id, 2, 92) * 0.6 + n * 0.4);
    const m = clamp01(edge * 30);
    return [c[0] * (0.55 + m * 0.45), c[1] * (0.55 + m * 0.45), c[2] * (0.55 + m * 0.45), m * 0.8 + n * 0.2];
  },
  planks(u, v) {
    const board = Math.floor(v * 6);
    const fy = (v * 6) % 1;
    const grain = fbm(u * 0.2 + board * 0.13, v * 3, 8, 4, 101 + board);
    const edge = clamp01(Math.min(fy, 1 - fy) * 25);
    const c = mixc([96, 64, 38], [150, 108, 66], grain * 0.8 + hash(board, 1, 102) * 0.3);
    return [c[0] * (0.5 + edge * 0.5), c[1] * (0.5 + edge * 0.5), c[2] * (0.5 + edge * 0.5), edge * 0.7 + grain * 0.3];
  },
};
/** Haritadaki G türü → doku katmanı */
export const GROUND_LAYERS = ['grass', 'lush', 'dirt', 'cobble', 'sand', 'sand', 'snow', 'ice', 'ash', 'flagstone', 'sand', 'planks'];
export const LAYER_NAMES = Object.keys(GROUND_PAINTERS);

let groundArrays: { color: THREE.DataArrayTexture; normal: THREE.DataArrayTexture } | null = null;
export function groundTextureArrays(size = 256) {
  if (groundArrays) return groundArrays;
  const n = LAYER_NAMES.length;
  const col = new Uint8Array(size * size * 4 * n);
  const nor = new Uint8Array(size * size * 4 * n);
  LAYER_NAMES.forEach((name, i) => {
    const t = make(size, GROUND_PAINTERS[name]);
    col.set(t.color, i * size * size * 4);
    nor.set(normalFrom(t, name === 'cobble' || name === 'flagstone' ? 6 : 3), i * size * size * 4);
  });
  const mk = (data: Uint8Array, srgb: boolean) => {
    const tex = new THREE.DataArrayTexture(data, size, size, n);
    tex.format = THREE.RGBAFormat; tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
    tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = true;
    tex.anisotropy = 4;
    if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
    tex.needsUpdate = true;
    return tex;
  };
  groundArrays = { color: mk(col, true), normal: mk(nor, false) };
  return groundArrays;
}

// ───────────── nesne dokuları ─────────────
const OBJ_PAINTERS: Record<string, Painter> = {
  bark(u, v) {
    const n = fbm(u * 4, v * 0.6, 4, 4, 201), r = fbm(u * 8, v * 0.8, 8, 3, 202);
    const ridge = Math.abs(Math.sin((u + n * 0.3) * Math.PI * 10));
    const c = mixc([46, 32, 22], [110, 84, 60], ridge * 0.6 + r * 0.4);
    return [c[0], c[1], c[2], ridge * 0.8 + r * 0.2];
  },
  plaster(u, v) {
    const n = fbm(u, v, 6, 5, 211), s = fbm(u, v, 2, 3, 212);
    const c = mixc([196, 182, 156], [236, 226, 204], n * 0.5 + 0.5);
    const dirt = clamp01((s - 0.6) * 2);
    return [c[0] - dirt * 40, c[1] - dirt * 40, c[2] - dirt * 45, n * 0.6];
  },
  timber(u, v) {
    const grain = fbm(u * 0.5, v * 6, 6, 4, 221);
    const c = mixc([54, 36, 22], [102, 70, 42], grain);
    return [c[0], c[1], c[2], grain];
  },
  rooftile(u, v) {
    const rows = 8, cols = 8;
    const ry = v * rows, row = Math.floor(ry), fy = ry % 1;
    const fx = (u * cols + (row % 2) * 0.5) % 1;
    const curve = Math.sin(fx * Math.PI);
    const id = Math.floor(u * cols + (row % 2) * 0.5) * 7 + row;
    const n = fbm(u, v, 16, 3, 231);
    const tint = hash(id, 1, 232);
    const base = mixc([120, 44, 32], [168, 72, 48], tint * 0.6 + n * 0.4);
    const shade = 0.55 + curve * 0.35 + fy * 0.25;
    return [base[0] * shade, base[1] * shade, base[2] * shade, curve * 0.6 + fy * 0.4];
  },
  rooftile_slate(u, v) {
    const rows = 9, cols = 6;
    const ry = v * rows, row = Math.floor(ry), fy = ry % 1;
    const fx = (u * cols + (row % 2) * 0.5) % 1;
    const id = Math.floor(u * cols + (row % 2) * 0.5) * 7 + row;
    const n = fbm(u, v, 16, 3, 241);
    const edge = clamp01(Math.min(fx, 1 - fx) * 30);
    const base = mixc([46, 54, 70], [84, 96, 116], hash(id, 1, 242) * 0.6 + n * 0.4);
    const sh = (0.6 + fy * 0.4) * (0.6 + edge * 0.4);
    return [base[0] * sh, base[1] * sh, base[2] * sh, fy * 0.6 + edge * 0.4];
  },
  stonewall(u, v) {
    const vo = voronoi(u, v * 1.6, 5, 251);
    const edge = clamp01((vo.d2 - vo.d1) * 5);
    const n = fbm(u, v, 12, 4, 252);
    const c = mixc([70, 66, 62], mixc([118, 112, 104], [150, 142, 130], hash(vo.id, 2, 253)), Math.pow(edge, 0.5));
    return [c[0] * (0.85 + n * 0.3), c[1] * (0.85 + n * 0.3), c[2] * (0.85 + n * 0.3), Math.pow(edge, 0.5)];
  },
  rock(u, v) {
    const n = fbm(u, v, 3, 6, 261), c2 = fbm(u, v, 12, 3, 262);
    const vo = voronoi(u, v, 4, 263);
    const crack = clamp01(1 - (vo.d2 - vo.d1) * 14);
    let c = mixc([84, 82, 80], [148, 144, 136], n * 0.7 + c2 * 0.3);
    c = mixc(c, [40, 38, 36], crack * 0.7);
    const moss = clamp01((fbm(u, v, 2, 3, 264) - 0.58) * 4);
    c = mixc(c, [70, 96, 40], moss * 0.7);
    return [c[0], c[1], c[2], n * 0.6 - crack * 0.4];
  },
  cloth(u, v) {
    const w = (Math.sin(u * Math.PI * 160) * Math.sin(v * Math.PI * 160)) * 0.5 + 0.5;
    const n = fbm(u, v, 8, 3, 271);
    const k = 200 + w * 30 + n * 25;
    return [k, k, k, w * 0.5 + n * 0.3];
  },
  leather(u, v) {
    const n = fbm(u, v, 12, 4, 281), vo = voronoi(u, v, 24, 282);
    const k = 190 + n * 50 - clamp01(1 - (vo.d2 - vo.d1) * 10) * 30;
    return [k, k, k, n * 0.5 + (vo.d2 - vo.d1)];
  },
  metal(u, v) {
    const brush = fbm(u * 0.05, v * 1, 64, 3, 291), n = fbm(u, v, 6, 3, 292);
    const k = 190 + brush * 50 + n * 15;
    return [k, k, k, brush * 0.2];
  },
  skin(u, v) {
    const n = fbm(u, v, 24, 3, 301);
    const k = 235 + n * 20;
    return [k, k - 4, k - 8, n * 0.15];
  },
};

const objCache = new Map<string, { map: THREE.Texture; normal: THREE.Texture }>();
export function objTexture(name: string, size = 256) {
  let e = objCache.get(name);
  if (e) return e;
  const t = make(size, OBJ_PAINTERS[name]);
  const map = new THREE.DataTexture(t.color, size, size, THREE.RGBAFormat);
  map.colorSpace = THREE.SRGBColorSpace;
  const normal = new THREE.DataTexture(normalFrom(t, name === 'stonewall' || name === 'rooftile' || name === 'bark' ? 5 : 2.5), size, size, THREE.RGBAFormat);
  for (const tx of [map, normal]) { tx.wrapS = tx.wrapT = THREE.RepeatWrapping; tx.generateMipmaps = true; tx.minFilter = THREE.LinearMipmapLinearFilter; tx.magFilter = THREE.LinearFilter; tx.anisotropy = 4; tx.needsUpdate = true; }
  e = { map, normal };
  objCache.set(name, e);
  return e;
}

/** Yaprak/iğne kartları için alfa dokusu (canvas). */
export function leafTexture(kind: 'broad' | 'needle' | 'grass'): THREE.Texture {
  const key = 'leaf_' + kind;
  const c = objCache.get(key);
  if (c) return c.map;
  const S = 256;
  const cv = document.createElement('canvas'); cv.width = cv.height = S;
  const ctx = cv.getContext('2d')!;
  let seed = 7;
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  if (kind === 'broad') {
    for (let i = 0; i < 70; i++) {
      const x = 20 + rnd() * (S - 40), y = 20 + rnd() * (S - 40), a = rnd() * Math.PI * 2, l = 16 + rnd() * 14;
      const g = 90 + rnd() * 80;
      ctx.save(); ctx.translate(x, y); ctx.rotate(a);
      ctx.fillStyle = `rgb(${g * 0.55},${g},${g * 0.35})`;
      ctx.beginPath(); ctx.moveTo(0, -l); ctx.quadraticCurveTo(l * 0.6, 0, 0, l); ctx.quadraticCurveTo(-l * 0.6, 0, 0, -l); ctx.fill();
      ctx.strokeStyle = `rgba(30,50,20,0.5)`; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -l); ctx.lineTo(0, l); ctx.stroke();
      ctx.restore();
    }
  } else if (kind === 'needle') {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(S / 2, S); ctx.lineTo(S / 2, 10); ctx.stroke();
    for (let i = 0; i < 260; i++) {
      const y = 10 + rnd() * (S - 20), side = rnd() < 0.5 ? -1 : 1, l = (S - y) * 0.18 + 20 + rnd() * 20;
      const g = 70 + rnd() * 70;
      ctx.strokeStyle = `rgb(${g * 0.35},${g},${g * 0.55})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(S / 2, y); ctx.lineTo(S / 2 + side * l, y + l * 0.45); ctx.stroke();
    }
  } else {
    for (let i = 0; i < 40; i++) {
      const x = rnd() * S, h = S * (0.5 + rnd() * 0.5), g = 90 + rnd() * 90;
      ctx.strokeStyle = `rgb(${g * 0.55},${g},${g * 0.3})`; ctx.lineWidth = 3 + rnd() * 3;
      ctx.beginPath(); ctx.moveTo(x, S); ctx.quadraticCurveTo(x + (rnd() - 0.5) * 30, S - h * 0.6, x + (rnd() - 0.5) * 60, S - h); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.generateMipmaps = true;
  objCache.set(key, { map: tex, normal: tex });
  return tex;
}

/** Yumuşak parıltı/parçacık sprite dokusu */
let glowTex: THREE.Texture | null = null;
export function glowTexture() {
  if (glowTex) return glowTex;
  const cv = document.createElement('canvas'); cv.width = cv.height = 64;
  const ctx = cv.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  glowTex = new THREE.CanvasTexture(cv);
  return glowTex;
}
