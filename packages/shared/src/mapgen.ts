import { mulberry32, smoothNoise, noise2, type Rng } from './rng.ts';
import { TILE } from './constants.ts';
import { MAPS, type MapDef, type Region } from './content/maps.ts';
import { MONSTERS } from './content/monsters.ts';
import { TUNING } from './tuning.ts';

export const enum G { GRASS = 0, LUSH = 1, DIRT = 2, COBBLE = 3, WATER = 4, SAND = 5, SNOW = 6, ICE = 7, ASH = 8, STONE = 9, DEEP = 10, PLANK = 11 }

export type PropKind =
  | 'tree' | 'pine' | 'snowpine' | 'deadtree' | 'rock' | 'bush' | 'flowers' | 'grasstuft' | 'mushroom' | 'log' | 'stump'
  | 'house' | 'stall' | 'fountain' | 'lamp' | 'fence' | 'well' | 'anvil' | 'forge' | 'crate' | 'barrel' | 'crystal' | 'portalstone'
  | 'icecrystal' | 'bones' | 'reeds' | 'lily' | 'dock' | 'waterfall' | 'banner' | 'tent' | 'hay' | 'signpost' | 'gate';

export interface Prop { k: PropKind; x: number; y: number; v: number; s: number } // dünya koordinatı, varyant, ölçek
export interface SpawnPoint { monster: string; level: number; variant: 0 | 1 | 2; x: number; y: number }
/** Bir canavar türünün yuvası: canavarlar bu dairenin içinde doğar ve dolaşır. */
export interface MonsterZone { name: string; monster: string; x: number; y: number; r: number; level: [number, number]; count: number }

export interface MapLayout {
  def: MapDef;
  w: number; h: number;
  ground: Uint8Array;
  blocked: Uint8Array;
  props: Prop[];
  spawn: { x: number; y: number };
  spawnPoints: SpawnPoint[];
  zones: MonsterZone[];
  npcs: { id: string; x: number; y: number }[];
}

function idx(l: { w: number }, x: number, y: number) { return y * l.w + x; }

function blockRect(l: MapLayout, tx: number, ty: number, w: number, h: number) {
  for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) if (x >= 0 && y >= 0 && x < l.w && y < l.h) l.blocked[idx(l, x, y)] = 1;
}
function isFree(l: MapLayout, tx: number, ty: number, w = 1, h = 1) {
  for (let y = ty; y < ty + h; y++) for (let x = tx; x < tx + w; x++) {
    if (x < 1 || y < 1 || x >= l.w - 1 || y >= l.h - 1) return false;
    if (l.blocked[idx(l, x, y)]) return false;
  }
  return true;
}
const tc = (t: number) => t * TILE + TILE / 2;

function carvePath(l: MapLayout, rng: Rng, x0: number, y0: number, x1: number, y1: number, width: number, g: G, protect: Uint8Array) {
  let x = x0, y = y0;
  let guard = 0;
  while ((Math.abs(x - x1) > 1 || Math.abs(y - y1) > 1) && guard++ < 4000) {
    const dx = Math.sign(x1 - x), dy = Math.sign(y1 - y);
    const r = rng();
    if (r < 0.7) { if (Math.abs(x1 - x) >= Math.abs(y1 - y)) x += dx; else y += dy; }
    else if (r < 0.85) y += rng() < 0.5 ? 1 : -1;
    else x += rng() < 0.5 ? 1 : -1;
    x = Math.max(2, Math.min(l.w - 3, x)); y = Math.max(2, Math.min(l.h - 3, y));
    for (let oy = -width; oy <= width; oy++) for (let ox = -width; ox <= width; ox++) {
      if (ox * ox + oy * oy > width * width + 1) continue;
      const px = x + ox, py = y + oy;
      if (px < 1 || py < 1 || px >= l.w - 1 || py >= l.h - 1) continue;
      const i = idx(l, px, py);
      if (l.ground[i] !== G.WATER && l.ground[i] !== G.DEEP) l.ground[i] = g;
      protect[i] = 1;
    }
  }
}

function genVillage(l: MapLayout, rng: Rng) {
  const { w, h } = l;
  const cx = 28, cy = 22;
  const protect = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = smoothNoise(x, y, 6, 3);
    l.ground[idx(l, x, y)] = n > 0.62 ? G.LUSH : G.GRASS;
  }
  // meydan
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = ((x - cx) / 10.5) ** 2 + ((y - cy) / 8) ** 2;
    if (d < 1) { l.ground[idx(l, x, y)] = G.COBBLE; protect[idx(l, x, y)] = 1; }
  }
  // yollar
  const road = (x0: number, y0: number, x1: number, y1: number) => {
    for (let y = Math.min(y0, y1); y <= Math.max(y0, y1); y++) for (let x = Math.min(x0, x1); x <= Math.max(x0, x1); x++) {
      l.ground[idx(l, x, y)] = G.COBBLE; protect[idx(l, x, y)] = 1;
    }
  };
  road(cx - 1, 3, cx + 1, cy); road(cx - 1, cy, cx + 1, Math.min(h - 4, 58)); road(3, cy - 1, cx, cy + 1); road(cx, cy - 1, w - 4, cy + 1);
  // Pazar Meydanı: oyuncuların tezgâh kurduğu geniş taş meydan (doğu yolu üstünde)
  const mk = l.def.market;
  if (mk) {
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const d = ((x - mk.tx) / mk.rx) ** 2 + ((y - mk.ty) / mk.ry) ** 2;
      if (d < 1.12) { l.ground[idx(l, x, y)] = d > 0.86 ? G.DIRT : G.COBBLE; protect[idx(l, x, y)] = 1; }
    }
    // kenarda fener halkası ve dört köşede sancak
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      const fx = mk.tx + Math.cos(a) * (mk.rx + 0.6), fy = mk.ty + Math.sin(a) * (mk.ry + 0.6);
      if (Math.abs(Math.sin(a)) < 0.25 && Math.cos(a) < 0) continue; // batı girişi (yol) açık kalsın
      l.props.push({ k: 'lamp', x: fx * TILE, y: fy * TILE, v: 0, s: 1 });
    }
    for (const [ox, oy] of [[-0.72, -0.72], [0.72, -0.72], [-0.72, 0.72], [0.72, 0.72]] as const) l.props.push({ k: 'banner', x: (mk.tx + ox * mk.rx) * TILE, y: (mk.ty + oy * mk.ry) * TILE, v: 0, s: 1.1 });
    // köyden pazara giden yolun girişinde büyük kemer tabela (Seyis Arda'nın hemen doğusu): v=0 → "PAZAR ALANI"
    const gx = 47;
    l.props.push({ k: 'gate', x: (gx + 0.5) * TILE, y: (cy + 0.5) * TILE, v: 0, s: 1 });
    for (const gy of [cy - 2, cy + 2]) l.blocked[idx(l, gx, gy)] = 1;
    // kenarda süs sandık ve fıçılar (yürüme alanının dışında)
    for (let k = 0; k < 10; k++) {
      const a = 0.4 + (k / 10) * Math.PI * 2;
      const fx = mk.tx + Math.cos(a) * (mk.rx + 1.6), fy = mk.ty + Math.sin(a) * (mk.ry + 1.6);
      if (fx < 2 || fy < 2 || fx > w - 3 || fy > h - 3 || (Math.abs(Math.sin(a)) < 0.3 && Math.cos(a) < 0)) continue;
      l.props.push({ k: k % 2 ? 'barrel' : 'crate', x: fx * TILE, y: fy * TILE, v: k % 2, s: 1 });
      l.blocked[idx(l, Math.floor(fx), Math.floor(fy))] = 1;
    }
  }
  // göl köşesi
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = ((x - 9) / 5.5) ** 2 + ((y - 37) / 3.6) ** 2 + (smoothNoise(x, y, 3, 9) - 0.5) * 0.5;
    if (d < 1) { l.ground[idx(l, x, y)] = d < 0.45 ? G.DEEP : G.WATER; l.blocked[idx(l, x, y)] = 1; }
    else if (d < 1.5 && l.ground[idx(l, x, y)] !== G.COBBLE) l.ground[idx(l, x, y)] = G.SAND;
  }
  // çeşme
  blockRect(l, cx - 1, cy - 1, 2, 2);
  l.props.push({ k: 'fountain', x: cx * TILE, y: cy * TILE, v: 0, s: 1 });
  // evler: [tx, ty, roofVariant]
  const houses: [number, number, number][] = [
    [14, 10, 0], [21, 9, 1], [34, 9, 2], [41, 10, 3], [13, 26, 1], [36, 27, 0], [42, 26, 2], [20, 33, 3], [33, 34, 1], [8, 18, 2], [47, 16, 0],
  ];
  for (const [tx, ty, v] of houses) {
    blockRect(l, tx, ty, 4, 3);
    l.props.push({ k: 'house', x: (tx + 2) * TILE, y: (ty + 3) * TILE, v, s: 1 });
    for (let x = tx - 1; x <= tx + 4; x++) protect[idx(l, x, ty + 3)] = 1;
  }
  // çeşme meydanı açık bırakılır (süs tezgâhları kaldırıldı; oyuncu tezgâhları Pazar Meydanı'nda)
  // demirci örsü, depo sandıkları
  blockRect(l, 15, 13, 1, 1); l.props.push({ k: 'anvil', x: 15.5 * TILE, y: 14 * TILE, v: 0, s: 1 });
  // demir ocağı: ocak, baca, körük, su fıçısı ve silah askısı (Demirci uzaktan seçilsin)
  blockRect(l, 12, 13, 3, 2); l.props.push({ k: 'forge', x: 13.5 * TILE, y: 14 * TILE, v: 0, s: 1 });
  for (const [x, y] of [[40, 13], [41, 13], [40.5, 12.4]] as const) l.props.push({ k: 'crate', x: x * TILE, y: y * TILE + TILE, v: 0, s: 1 });
  blockRect(l, 40, 12, 2, 1);
  l.props.push({ k: 'barrel', x: 42.6 * TILE, y: 13.9 * TILE, v: 0, s: 1 });
  l.props.push({ k: 'barrel', x: 19.3 * TILE, y: 13.9 * TILE, v: 1, s: 1 });
  l.props.push({ k: 'well', x: 44 * TILE, y: 33 * TILE, v: 0, s: 1 }); blockRect(l, 43, 32, 2, 1);
  l.props.push({ k: 'portalstone', x: 31 * TILE, y: 25 * TILE, v: 0, s: 1 });
  l.props.push({ k: 'hay', x: 47 * TILE, y: 22 * TILE, v: 0, s: 1 }); blockRect(l, 46, 21, 2, 1);
  l.props.push({ k: 'tent', x: 39.5 * TILE, y: 33 * TILE, v: 0, s: 1 }); blockRect(l, 38, 31, 3, 2);
  for (const [x, y] of [[26, 8], [30, 8], [26, 36], [30, 36], [10, 21], [10, 25], [46, 21], [46, 25], [20, 21], [36, 23]] as const) {
    l.props.push({ k: 'lamp', x: x * TILE, y: y * TILE, v: 0, s: 1 });
  }
  for (const [x, y] of [[25, 12], [31, 12]] as const) l.props.push({ k: 'banner', x: x * TILE, y: y * TILE, v: 0, s: 1 });
  // ── Tilki Korusu (güney): köyden çitle ayrılan, patikalı sık koru ──
  const GY = 60;
  if (h > GY + 10) {
    for (let y = GY; y < h; y++) for (let x = 0; x < w; x++) {
      const n = smoothNoise(x, y, 5, 811);
      l.ground[idx(l, x, y)] = n > 0.45 ? G.LUSH : G.GRASS;
    }
    // giriş: köy yolu çitteki kapıdan patikaya döner
    for (const [x0, y0, x1, y1] of [
      [cx, 58, cx, Math.min(h - 7, 110)], [cx, 64, 12, 74], [cx, 66, 52, 76], [52, 76, 74, 68], [cx, 72, 40, 81],
      [cx, 86, 12, 98], [12, 98, 20, 108], [cx, 90, 60, 100], [60, 100, 78, 88], [74, 68, 78, 88], [cx, 100, 46, 109],
    ] as const) carvePath(l, rng, x0, y0, x1, y1, 1, G.DIRT, protect);
    // korunun ortasında küçük bir gölet (tilkilerin su içtiği yer)
    for (let y = GY + 1; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
      const d = ((x - 71) / 4.5) ** 2 + ((y - 106) / 3) ** 2 + (smoothNoise(x, y, 3, 31) - 0.5) * 0.5;
      const i = idx(l, x, y);
      if (protect[i]) continue;
      if (d < 1) { l.ground[i] = d < 0.4 ? G.DEEP : G.WATER; l.blocked[i] = 1; }
      else if (d < 1.45) l.ground[i] = G.SAND;
    }
    // ── Tilki Kral Arenası: korunun en güney ucunda yuvarlak taş meydan ──
    const AX = 44, AY = h - 11, AR = 8;
    if (h >= 128) {
      carvePath(l, rng, 46, 109, AX, AY - AR + 1, 1, G.DIRT, protect);
      for (let y = AY - AR - 2; y <= AY + AR + 2; y++) for (let x = AX - AR - 2; x <= AX + AR + 2; x++) {
        if (x < 2 || y < 2 || x >= w - 2 || y >= h - 2) continue;
        const d = Math.hypot(x - AX, y - AY) / AR, i = idx(l, x, y);
        if (d < 1.12) { l.ground[i] = d > 0.88 ? G.DIRT : G.COBBLE; l.blocked[i] = 0; protect[i] = 1; }
      }
      // kenarda taş halkası (kuzey girişi açık), fenerler ve dört sancak
      for (let k = 0; k < 22; k++) {
        const a = (k / 22) * Math.PI * 2;
        if (Math.sin(a) < -0.9) continue; // kuzey: giriş
        const fx = AX + Math.cos(a) * (AR + 0.9), fy = AY + Math.sin(a) * (AR + 0.9);
        l.props.push({ k: k % 2 ? 'rock' : 'lamp', x: fx * TILE, y: fy * TILE, v: k % 3, s: k % 2 ? 0.9 : 1 });
        if (k % 2) l.blocked[idx(l, Math.floor(fx), Math.floor(fy))] = 1;
      }
      for (const [ox, oy] of [[-0.62, -0.62], [0.62, -0.62], [-0.62, 0.62], [0.62, 0.62]] as const) l.props.push({ k: 'banner', x: (AX + ox * AR) * TILE, y: (AY + oy * AR) * TILE, v: 0, s: 1.2 });
      for (const [ox, oy] of [[-2.4, 1.6], [2.2, 2.4], [0.6, -2.8]] as const) l.props.push({ k: 'bones', x: (AX + ox) * TILE, y: (AY + oy) * TILE, v: 0, s: 1 });
    }
    for (let x = 4; x < w - 4; x++) {
      if (Math.abs(x - cx) <= 2) continue;
      const i = idx(l, x, GY - 1);
      if (l.blocked[i]) continue;
      l.props.push({ k: 'fence', x: tc(x), y: tc(GY - 1), v: 0, s: 1 }); l.blocked[i] = 1;
    }
    for (const sx of [-3, 3]) l.props.push({ k: 'lamp', x: tc(cx + sx), y: tc(GY - 1), v: 0, s: 1 });
    l.props.push({ k: 'banner', x: tc(cx - 3), y: tc(GY + 1), v: 0, s: 1 });
    // ağaç kümeleri (açıklıklar inlere kalır)
    for (let y = GY + 1; y < h - 3; y++) for (let x = 3; x < w - 3; x++) {
      const i = idx(l, x, y);
      if (protect[i] || l.blocked[i]) continue;
      const dense = smoothNoise(x, y, 6, 1907 + 3);
      const want = dense > 0.56 ? rng() < 0.6 : rng() < 0.035;
      if (want && (x + y) % 2 === 0) {
        l.props.push({ k: rng() < 0.4 ? 'pine' : 'tree', x: tc(x) + (rng() - 0.5) * 24, y: tc(y) + (rng() - 0.5) * 18, v: (rng() * 4) | 0, s: 0.95 + rng() * 0.45 });
        l.blocked[i] = 1;
      }
    }
    // kütük, mantar, kaya, çalı
    for (let n = 0; n < 170; n++) {
      const x = 4 + ((rng() * (w - 8)) | 0), y = GY + 1 + ((rng() * (h - GY - 5)) | 0);
      const i = idx(l, x, y);
      if (protect[i] || l.blocked[i]) continue;
      const r = rng();
      const px = tc(x) + (rng() - 0.5) * 40, py = tc(y) + (rng() - 0.5) * 40;
      if (r < 0.08 && isFree(l, x, y)) { l.props.push({ k: 'log', x: tc(x), y: tc(y), v: (rng() * 2) | 0, s: 1 }); l.blocked[i] = 1; }
      else if (r < 0.14 && isFree(l, x, y)) { l.props.push({ k: 'stump', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.9 + rng() * 0.3 }); l.blocked[i] = 1; }
      else if (r < 0.2 && isFree(l, x, y)) { l.props.push({ k: 'rock', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.7 + rng() * 0.4 }); l.blocked[i] = 1; }
      else if (r < 0.32 && isFree(l, x, y)) { l.props.push({ k: 'bush', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.9 + rng() * 0.3 }); l.blocked[i] = 1; }
      else if (r < 0.55) l.props.push({ k: 'mushroom', x: px, y: py, v: (rng() * 3) | 0, s: 1 });
      else l.props.push({ k: rng() < 0.5 ? 'flowers' : 'grasstuft', x: px, y: py, v: (rng() * 5) | 0, s: 1 });
    }
  }
  // sınır ağaçları
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    const i = idx(l, x, y);
    if (protect[i] && edge > 1) continue;
    if (edge <= 1) l.blocked[i] = 1;
    if (edge <= 2 && (x + y) % 2 === 0 && !l.ground[i]) {
      l.props.push({ k: rng() < 0.3 ? 'pine' : 'tree', x: tc(x) + (rng() - 0.5) * 20, y: tc(y) + (rng() - 0.5) * 16, v: (rng() * 4) | 0, s: 0.9 + rng() * 0.35 });
      l.blocked[i] = 1;
    }
  }
  // süs
  for (let n = 0, N = Math.round(220 * (w * h) / (56 * 44)); n < N; n++) {
    const x = 3 + ((rng() * (w - 6)) | 0), y = 3 + ((rng() * (h - 6)) | 0);
    const i = idx(l, x, y);
    if (protect[i] || l.blocked[i] || l.ground[i] === G.SAND || l.ground[i] === G.WATER) continue;
    const r = rng();
    if (r < 0.5) l.props.push({ k: 'flowers', x: tc(x) + (rng() - 0.5) * 40, y: tc(y) + (rng() - 0.5) * 40, v: (rng() * 5) | 0, s: 1 });
    else if (r < 0.75) l.props.push({ k: 'grasstuft', x: tc(x) + (rng() - 0.5) * 40, y: tc(y) + (rng() - 0.5) * 40, v: (rng() * 3) | 0, s: 1 });
    else if (r < 0.88 && isFree(l, x, y)) { l.props.push({ k: 'bush', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.9 + rng() * 0.3 }); l.blocked[i] = 1; }
    else if (isFree(l, x, y)) { l.props.push({ k: 'tree', x: tc(x), y: tc(y), v: (rng() * 4) | 0, s: 0.9 + rng() * 0.3 }); l.blocked[i] = 1; }
  }
  for (let n = 0; n < 16; n++) {
    const x = 6 + ((rng() * 8) | 0), y = 33 + ((rng() * 8) | 0);
    if (l.ground[idx(l, x, y)] === G.WATER) l.props.push({ k: 'lily', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 1 });
  }
  // çit
  for (let x = 12; x <= 20; x++) if (!protect[idx(l, x, 39)]) { l.props.push({ k: 'fence', x: tc(x), y: tc(39), v: 0, s: 1 }); l.blocked[idx(l, x, 39)] = 1; }
  l.spawn = { x: tc(cx), y: tc(cy + 3) };
  if (l.def.spawns.length) placeSpawns(l, mulberry32(l.def.seed * 7 + 13));
}

function genWild(l: MapLayout, rng: Rng) {
  const { w, h, def } = l;
  const theme = def.theme;
  const seed = def.seed;
  const base = theme === 'frozen' ? G.SNOW : theme === 'black' ? G.ASH : G.GRASS;
  const alt = theme === 'frozen' ? G.ICE : theme === 'black' ? G.STONE : G.LUSH;
  const path = theme === 'frozen' ? G.STONE : theme === 'black' ? G.STONE : G.DIRT;
  const protect = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const n = smoothNoise(x, y, 7, seed);
    l.ground[idx(l, x, y)] = n > 0.66 ? alt : base;
  }
  const sx = 6, sy = (h / 2) | 0;
  l.spawn = { x: tc(sx), y: tc(sy) };
  // spawn çevresi açık
  for (let y = sy - 4; y <= sy + 4; y++) for (let x = 2; x <= sx + 5; x++) { protect[idx(l, x, y)] = 1; l.ground[idx(l, x, y)] = path; }
  // patikalar: spawn → uzak noktalar
  const targets: [number, number][] = [[w - 8, 8], [w - 8, h - 8], [w / 2, 6], [w / 2, h - 6], [w - 6, h / 2]];
  for (const [tx, ty] of targets) carvePath(l, rng, sx + 3, sy, tx | 0, ty | 0, 1, path, protect);
  // su birikintileri
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(l, x, y);
    if (protect[i]) continue;
    const n = smoothNoise(x, y, 9, seed + 77);
    if (n > (theme === 'black' ? 0.8 : 0.78)) {
      l.ground[i] = theme === 'frozen' ? G.ICE : theme === 'black' ? G.DEEP : G.WATER;
      if (theme !== 'frozen') l.blocked[i] = 1;
    }
  }
  // sınır ve ağaç kümeleri
  const treeKind = theme === 'frozen' ? 'snowpine' : theme === 'black' ? 'deadtree' : 'tree';
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(l, x, y);
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (edge <= 1) l.blocked[i] = 1;
    if (protect[i] || l.ground[i] === G.WATER || l.ground[i] === G.DEEP) continue;
    const dense = smoothNoise(x, y, 5, seed + 13);
    const isEdge = edge <= 3;
    const want = isEdge ? rng() < 0.7 : dense > 0.68 ? rng() < 0.45 : rng() < 0.018;
    if (want && (x + y * 3) % 2 === 0) {
      const k: PropKind = theme === 'forest' && rng() < 0.35 ? 'pine' : treeKind;
      l.props.push({ k, x: tc(x) + (rng() - 0.5) * 24, y: tc(y) + (rng() - 0.5) * 18, v: (rng() * 4) | 0, s: 0.85 + rng() * 0.45 });
      l.blocked[i] = 1;
    }
  }
  // kayalar ve süs
  const count = (w * h) / 9;
  for (let n = 0; n < count; n++) {
    const x = 2 + ((rng() * (w - 4)) | 0), y = 2 + ((rng() * (h - 4)) | 0);
    const i = idx(l, x, y);
    if (l.blocked[i] || l.ground[i] === G.WATER) continue;
    const r = rng();
    const px = tc(x) + (rng() - 0.5) * 44, py = tc(y) + (rng() - 0.5) * 44;
    if (r < 0.035 && !protect[i]) { l.props.push({ k: 'rock', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.8 + rng() * 0.5 }); l.blocked[i] = 1; }
    else if (r < 0.06 && !protect[i] && theme === 'black') { l.props.push({ k: 'crystal', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.8 + rng() * 0.5 }); l.blocked[i] = 1; }
    else if (r < 0.06 && !protect[i] && theme === 'frozen') { l.props.push({ k: 'icecrystal', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.8 + rng() * 0.5 }); l.blocked[i] = 1; }
    else if (r < 0.08 && theme === 'forest' && !protect[i]) { l.props.push({ k: 'log', x: tc(x), y: tc(y), v: (rng() * 2) | 0, s: 1 }); l.blocked[i] = 1; }
    else if (r < 0.1 && theme !== 'frozen') l.props.push({ k: theme === 'black' ? 'bones' : 'mushroom', x: px, y: py, v: (rng() * 3) | 0, s: 1 });
    else if (r < 0.14 && !protect[i] && isFree(l, x, y)) { l.props.push({ k: theme === 'black' ? 'stump' : 'bush', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 0.8 + rng() * 0.4 }); l.blocked[i] = 1; }
    else if (r < 0.45 && theme === 'forest') l.props.push({ k: rng() < 0.5 ? 'flowers' : 'grasstuft', x: px, y: py, v: (rng() * 5) | 0, s: 1 });
    else if (r < 0.3 && theme === 'frozen') l.props.push({ k: 'grasstuft', x: px, y: py, v: 3, s: 1 });
  }
  // su kenarı sazlık
  for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
    if (l.ground[idx(l, x, y)] !== G.WATER) continue;
    if (noise2(x, y, seed) < 0.12) l.props.push({ k: 'lily', x: tc(x), y: tc(y), v: (noise2(y, x, 5) * 3) | 0, s: 1 });
    if (noise2(x, y, seed + 1) < 0.15 && l.ground[idx(l, x + 1, y)] !== G.WATER) l.props.push({ k: 'reeds', x: tc(x) + 30, y: tc(y), v: 0, s: 1 });
  }
  l.props.push({ k: 'portalstone', x: l.spawn.x - 70, y: l.spawn.y - 30, v: theme === 'frozen' ? 1 : theme === 'black' ? 2 : 0, s: 1 });
  // canavar noktaları
  placeSpawns(l, mulberry32(l.def.seed * 7 + 13)); // kendi RNG'si: yoğunluk değişince aynı tohumdan yeniden kurulabilir
}

function genLake(l: MapLayout, rng: Rng) {
  const { w, h } = l;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = idx(l, x, y);
    const d = ((x - 32) / 22) ** 2 + ((y - 18) / 12) ** 2 + (smoothNoise(x, y, 4, 31) - 0.5) * 0.35;
    if (d < 0.55) { l.ground[i] = G.DEEP; l.blocked[i] = 1; }
    else if (d < 1) { l.ground[i] = G.WATER; l.blocked[i] = 1; }
    else if (d < 1.35) l.ground[i] = G.SAND;
    else l.ground[i] = smoothNoise(x, y, 6, 2) > 0.6 ? G.LUSH : G.GRASS;
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (edge <= 1) l.blocked[i] = 1;
  }
  // iskele
  for (let y = 26; y <= 31; y++) for (let x = 30; x <= 31; x++) { l.ground[idx(l, x, y)] = G.PLANK; l.blocked[idx(l, x, y)] = 0; }
  l.props.push({ k: 'dock', x: 31 * TILE, y: 26 * TILE, v: 0, s: 1 });
  l.props.push({ k: 'waterfall', x: 32 * TILE, y: 4 * TILE, v: 0, s: 1 });
  blockRect(l, 27, 0, 10, 6);
  for (let n = 0; n < 160; n++) {
    const x = 2 + ((rng() * (w - 4)) | 0), y = 2 + ((rng() * (h - 4)) | 0);
    const i = idx(l, x, y);
    const g = l.ground[i];
    if (l.blocked[i]) { if (g === G.WATER && rng() < 0.2) l.props.push({ k: 'lily', x: tc(x), y: tc(y), v: (rng() * 3) | 0, s: 1 }); continue; }
    if (g === G.SAND) { if (rng() < 0.25) l.props.push({ k: 'reeds', x: tc(x), y: tc(y), v: 0, s: 1 }); continue; }
    const edge = Math.min(x, y, w - 1 - x, h - 1 - y);
    if (edge < 4 && rng() < 0.8) { l.props.push({ k: rng() < 0.3 ? 'pine' : 'tree', x: tc(x), y: tc(y), v: (rng() * 4) | 0, s: 0.9 + rng() * 0.3 }); l.blocked[i] = 1; }
    else l.props.push({ k: rng() < 0.6 ? 'flowers' : 'grasstuft', x: tc(x), y: tc(y), v: (rng() * 5) | 0, s: 1 });
  }
  l.props.push({ k: 'portalstone', x: 24 * TILE, y: 40 * TILE, v: 0, s: 1 });
  l.props.push({ k: 'barrel', x: 33 * TILE, y: 35 * TILE, v: 0, s: 1 });
  l.spawn = { x: tc(30), y: tc(40) };
}

function regionOf(l: MapLayout, x: number, y: number): Region {
  const d = Math.hypot(x - l.spawn.x, y - l.spawn.y) / (Math.hypot(l.w, l.h) * TILE);
  return d < 0.33 ? 'near' : d < 0.6 ? 'mid' : 'far';
}

const ZONE_NAMES: Record<string, string[]> = {
  wild_fox: ['Tilki İni', 'Kızıl Kuyruk Yuvası', 'Çalı Dibi', 'Böğürtlen Kovuğu', 'Yaprak Yatağı', 'Kızıl Pınar'],
  shadow_wolf: ['Kurt İni', 'Gölge Sürüsü', 'Uluma Tepesi', 'Kurt Pınarı', 'Kara Pati Yatağı'],
  rot_guard: ['Çürük Kamp', 'Yıkık Nöbet', 'Pas Karakolu', 'Çürük Mezarlık'],
  essence_eater: ['Öz Yuvası', 'Yutan Çukuru', 'Mor Bataklık', 'Öz Kuyusu'],
  frost_lynx: ['Vaşak Sırtı', 'Kırağı Yatağı', 'Buzlu Pati İzi'],
  ice_golem: ['Golem Kayalığı', 'Buz Ocağı', 'Donuk Taşlar'],
  blizzard_seer: ['Kâhin Çemberi', 'Tipi Sunağı', 'Ak Fırtına'],
  black_stone: ['Kara Taş'],
  fox_king: ['Tilki Kral Arenası'],
};
/** Bir yuvada kaç canavar olur: kalabalık ama okunaklı sürüler. */
const PACK = 9;

/**
 * Canavar yerleşimi: her doğma grubu birkaç yuvaya bölünür. Yuva merkezleri grubun bölgesinde
 * (yakın/orta/uzak), birbirinden ve başlangıç noktasından uzakta seçilir; canavarlar yuva dairesi
 * içinde, birbirine çok yapışmadan dağıtılır. Yeniden doğma aynı noktada olduğundan yuva korunur.
 * Önceden canavarlar haritanın her yerine 1–3'lük gruplarla serpiliyordu (dağınık ve seyrek).
 */
function placeSpawns(l: MapLayout, rng: Rng) {
  const mdefs = new Map(MONSTERS.map((m) => [m.id, m] as const));
  const dens = TUNING.density[l.def.id] ?? 1;
  const used = new Map<string, number>();
  const taken = new Set<number>();
  for (let gi = 0; gi < l.def.spawns.length; gi++) {
    // yönetim: doğma grubu ayarı (sayı, seviye aralığı, normal/agresif/katil oranı)
    const ov = TUNING.spawns[l.def.id + ':' + gi];
    const g = ov ? { ...l.def.spawns[gi], count: ov.count ?? l.def.spawns[gi].count, level: ov.level ?? l.def.spawns[gi].level, variants: ov.variants ?? l.def.spawns[gi].variants } : l.def.spawns[gi];
    const md = mdefs.get(g.monster);
    if (g.count <= 0) continue;
    const total = md?.boss ? g.count : Math.max(1, Math.round(g.count * dens));
    const camps = md?.boss ? total : Math.max(1, Math.round(total / PACK));
    let left = total;
    for (let c = 0; c < camps && left > 0; c++) {
      const n = md?.boss ? 1 : Math.ceil(left / (camps - c));
      const rT = md?.boss ? 2 : Math.min(7, Math.max(3.2, Math.sqrt(n) * 1.35 + 1.2)); // yarıçap (karo)
      // yuva merkezi
      let cx = -1, cy = -1;
      for (let tries = 0; tries < 900; tries++) {
        const relax = tries > 600; // çok sıkışık haritada bölge koşulunu gevşet
        const A = g.area;
        const tx = A ? A[0] + ((rng() * (A[2] - A[0])) | 0) : 4 + ((rng() * (l.w - 8)) | 0), ty = A ? A[1] + ((rng() * (A[3] - A[1])) | 0) : 4 + ((rng() * (l.h - 8)) | 0);
        if (!isFree(l, tx, ty)) continue;
        if (A && (tx - rT < A[0] || ty - rT < A[1] || tx + rT > A[2] || ty + rT > A[3])) continue; // in alanın dışına taşmasın
        const x = tc(tx), y = tc(ty);
        if (Math.hypot(x - l.spawn.x, y - l.spawn.y) < 900 + rT * TILE) continue;
        if (!relax && g.region !== 'any' && !A && regionOf(l, x, y) !== g.region) continue;
        if (l.zones.some((z) => Math.hypot(z.x - x, z.y - y) < z.r + rT * TILE + 2.5 * TILE)) continue;
        // dairenin çoğu yürünebilir olmalı
        let free = 0, all = 0;
        for (let oy = -Math.floor(rT); oy <= rT; oy++) for (let ox = -Math.floor(rT); ox <= rT; ox++) if (ox * ox + oy * oy <= rT * rT) { all++; if (tx + ox > 1 && ty + oy > 1 && tx + ox < l.w - 2 && ty + oy < l.h - 2 && isFree(l, tx + ox, ty + oy)) free++; }
        if (free < Math.max(n * 1.6, all * 0.55)) continue;
        cx = tx; cy = ty; break;
      }
      if (cx < 0) continue;
      const names = ZONE_NAMES[g.monster] ?? [md?.name ?? 'Yuva'];
      const k = used.get(g.monster) ?? 0; used.set(g.monster, k + 1);
      const zone: MonsterZone = { name: names[k % names.length] + (k >= names.length ? ' ' + (Math.floor(k / names.length) + 1) : ''), monster: g.monster, x: tc(cx), y: tc(cy), r: rT * TILE, level: [g.level[0], g.level[1]], count: 0 };
      l.zones.push(zone);
      let placed = 0;
      for (let tries = 0; placed < n && tries < n * 80; tries++) {
        const a = rng() * Math.PI * 2, d = (placed === 0 ? 0 : Math.sqrt(rng())) * rT;
        const tx = Math.round(cx + Math.cos(a) * d), ty = Math.round(cy + Math.sin(a) * d);
        if (tx < 2 || ty < 2 || tx >= l.w - 2 || ty >= l.h - 2 || !isFree(l, tx, ty)) continue;
        if (g.area && (tx < g.area[0] || ty < g.area[1] || tx > g.area[2] || ty > g.area[3])) continue;
        const key = ty * l.w + tx;
        if (taken.has(key) && tries < n * 40) continue; // aynı karoya iki canavar koyma (gerekirse izin ver)
        taken.add(key);
        const tot = g.variants[0] + g.variants[1] + g.variants[2];
        const r = rng() * tot;
        const variant = (r < g.variants[0] ? 0 : r < g.variants[0] + g.variants[1] ? 1 : 2) as 0 | 1 | 2;
        const level = g.level[0] + ((rng() * (g.level[1] - g.level[0] + 1)) | 0);
        const jx = (rng() - 0.5) * TILE * 0.6, jy = (rng() - 0.5) * TILE * 0.6;
        l.spawnPoints.push({ monster: g.monster, level, variant, x: tc(tx) + jx, y: tc(ty) + jy });
        placed++;
      }
      zone.count = placed; left -= placed;
    }
  }
}

/** Yönetimden yoğunluk değişince yuvaları ve doğma noktalarını aynı tohumla yeniden kurar. */
export function rebuildSpawns(l: MapLayout) {
  l.spawnPoints = []; l.zones = [];
  if (l.def.spawns.length) placeSpawns(l, mulberry32(l.def.seed * 7 + 13));
}

const cache = new Map<string, MapLayout>();
export function getLayout(mapId: string): MapLayout {
  const c = cache.get(mapId);
  if (c) return c;
  const def = MAPS[mapId];
  if (!def) throw new Error('unknown map ' + mapId);
  const l: MapLayout = {
    def, w: def.w, h: def.h,
    ground: new Uint8Array(def.w * def.h), blocked: new Uint8Array(def.w * def.h),
    props: [], spawn: { x: 0, y: 0 }, spawnPoints: [], zones: [], npcs: [],
  };
  const rng = mulberry32(def.seed);
  if (def.theme === 'village') genVillage(l, rng);
  else if (def.theme === 'lake') genLake(l, rng);
  else genWild(l, rng);
  for (const n of def.npcs) {
    l.npcs.push({ id: n.id, x: n.tx * TILE + TILE / 2, y: n.ty * TILE + TILE / 2 });
    l.blocked[idx(l, n.tx, n.ty)] = 1;
  }
  l.props.sort((a, b) => a.y - b.y);
  cache.set(mapId, l);
  return l;
}

/** Dünya koordinatında engel var mı? Harita dışı engeldir. */
export function isBlockedAt(l: MapLayout, x: number, y: number): boolean {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  if (tx < 0 || ty < 0 || tx >= l.w || ty >= l.h) return true;
  return l.blocked[ty * l.w + tx] === 1;
}
