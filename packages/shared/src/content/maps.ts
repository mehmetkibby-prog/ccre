export type Theme = 'village' | 'forest' | 'frozen' | 'black' | 'lake' | 'ancient';
export type Region = 'near' | 'mid' | 'far' | 'any';

export interface SpawnGroup {
  monster: string;
  count: number;
  level: [number, number];
  variants: [number, number, number]; // normal/agresif/katil ağırlıkları
  region: Region;
  /** Yuvalar yalnız bu karo dikdörtgeninde kurulur: [x0, y0, x1, y1]. */
  area?: [number, number, number, number];
}
export interface NpcDef { id: string; name: string; title: string; art: string; tx: number; ty: number; actions: string[] }
export interface MapDef {
  id: string;
  name: string;
  w: number; h: number; // tile
  theme: Theme;
  seed: number;
  safe: boolean;
  pvp: boolean;
  minLevel: number;
  respawnMap: string;
  dropPenalty?: 'none' | 'gems5';
  /** Oyuncu tezgâhlarının kurulabildiği alan (karo merkezi ve elips yarıçapları). */
  market?: { tx: number; ty: number; rx: number; ry: number; name: string };
  spawns: SpawnGroup[];
  npcs: NpcDef[];
  desc: string;
  travelable: boolean; // ışınlanma menüsünde
}

export const MAPS: Record<string, MapDef> = {
  bazaar: {
    id: 'bazaar', name: 'Pazar Köyü', w: 88, h: 132, theme: 'village', seed: 1907, safe: true, pvp: false, minLevel: 1,
    respawnMap: 'bazaar', travelable: true,
    // köyün güneyindeki Tilki Korusu: 1. seviye başlangıç avı (tilkiler saldırılmadıkça dokunmaz)
    spawns: [
      { monster: 'wild_fox', count: 70, level: [1, 1], variants: [100, 0, 0], region: 'any', area: [5, 62, 82, 111] },
      // en güneydeki Tilki Kral Arenası (merkez 44,121; yarıçap 8 karo)
      { monster: 'fox_king', count: 1, level: [20, 20], variants: [100, 0, 0], region: 'any', area: [39, 116, 49, 126] },
    ],
    market: { tx: 67, ty: 24, rx: 14, ry: 11, name: 'Pazar Meydanı' },
    desc: 'Güvenli sosyal merkez. Doğudaki Pazar Meydanı\'nda oyuncular tezgâh kurup eşya satar; güneydeki Tilki Korusu yeni başlayanların ilk avıdır; korunun en ucundaki arenada Tilki Kral bekler.',
    npcs: [
      { id: 'haso', name: 'Haso', title: 'Demirci', art: 'smith', tx: 17, ty: 14, actions: ['upgrade', 'shop_smith'] },
      { id: 'rauf', name: 'Rauf', title: 'Depocu', art: 'keeper', tx: 38, ty: 14, actions: ['storage', 'bank'] },
      { id: 'pakize', name: 'Pakize', title: 'Zanaatkâr', art: 'crafter', tx: 17, ty: 30, actions: ['craft'] },
      { id: 'nur', name: 'Nur', title: 'Işınlayıcı', art: 'mage', tx: 31, ty: 26, actions: ['teleport'] },
      { id: 'bekci', name: 'Zindan Bekçisi', title: 'Seferler', art: 'warden', tx: 38, ty: 30, actions: ['dungeon'] },
      { id: 'arda', name: 'Seyis Arda', title: 'Binek Ustası', art: 'stable', tx: 45, ty: 22, actions: ['mount'] },
      { id: 'tuccar', name: 'Tüccar Selim', title: 'Erzak', art: 'merchant', tx: 24, ty: 22, actions: ['shop_general', 'sell'] },
    ],
  },
  forest: {
    id: 'forest', name: 'Kuzey Ormanı', w: 96, h: 72, theme: 'forest', seed: 4242, safe: false, pvp: false, minLevel: 1,
    respawnMap: 'forest', travelable: true,
    desc: 'Başlangıç av bölgesi. Gölge Kurtları, Çürük Muhafızlar ve Öz Yutanlar.',
    npcs: [],
    spawns: [
      // her satır kendi yuvalarına bölünür (yaklaşık 9 canavarlık sürüler), bkz. mapgen placeSpawns
      { monster: 'shadow_wolf', count: 40, level: [1, 6], variants: [80, 18, 2], region: 'near' },
      { monster: 'shadow_wolf', count: 24, level: [6, 10], variants: [60, 32, 8], region: 'mid' },
      { monster: 'rot_guard', count: 30, level: [5, 12], variants: [65, 28, 7], region: 'mid' },
      { monster: 'essence_eater', count: 30, level: [9, 16], variants: [55, 35, 10], region: 'far' },
      { monster: 'rot_guard', count: 18, level: [12, 18], variants: [45, 40, 15], region: 'far' },
    ],
  },
  frozen: {
    id: 'frozen', name: 'Donmuş Çam Geçidi', w: 96, h: 72, theme: 'frozen', seed: 777, safe: false, pvp: false, minLevel: 20,
    respawnMap: 'frozen', travelable: true,
    desc: 'Kırağı Vaşakları, Buzkök Golemleri ve Tipi Kâhinleri.',
    npcs: [],
    spawns: [
      { monster: 'frost_lynx', count: 30, level: [20, 26], variants: [70, 25, 5], region: 'near' },
      { monster: 'ice_golem', count: 24, level: [24, 32], variants: [65, 28, 7], region: 'mid' },
      { monster: 'blizzard_seer', count: 22, level: [28, 36], variants: [55, 35, 10], region: 'far' },
    ],
  },
  black: {
    id: 'black', name: 'Kara Bölge', w: 80, h: 64, theme: 'black', seed: 6666, safe: false, pvp: true, minLevel: 40,
    respawnMap: 'black', travelable: true, dropPenalty: 'gems5',
    desc: 'Açık PvP. Ölümde ekipman korunur, bölgede yeniden doğarsın. Kara Taş Muhafızı burada.',
    npcs: [],
    spawns: [
      { monster: 'black_stone', count: 1, level: [45, 45], variants: [100, 0, 0], region: 'far' },
      { monster: 'blizzard_seer', count: 20, level: [40, 46], variants: [40, 45, 15], region: 'any' },
    ],
  },
  lake: {
    id: 'lake', name: 'Şelale Gölü', w: 64, h: 48, theme: 'lake', seed: 31, safe: true, pvp: false, minLevel: 1,
    respawnMap: 'lake', travelable: true, spawns: [],
    desc: 'Güvenli balıkçılık bölgesi. Balıkçı Hasan seni bekliyor.',
    npcs: [{ id: 'hasan', name: 'Balıkçı Hasan', title: 'Balıkçı', art: 'fisher', tx: 30, ty: 34, actions: ['fishing_shop'] }],
  },
};
export const MAP_IDS = Object.keys(MAPS);

/** Nokta (dünya birimi) haritanın pazar alanında mı? */
export function inMarket(def: MapDef, x: number, y: number): boolean {
  const m = def.market;
  if (!m) return false;
  const T = 64, cx = m.tx * T + T / 2, cy = m.ty * T + T / 2;
  return ((x - cx) / (m.rx * T)) ** 2 + ((y - cy) / (m.ry * T)) ** 2 <= 1;
}
