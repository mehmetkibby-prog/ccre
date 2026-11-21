export type Theme = 'village' | 'forest' | 'frozen' | 'black' | 'lake' | 'ancient' | 'tower' | 'forge' | 'coast';
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
      { monster: 'wild_fox', count: 63, level: [1, 1], variants: [100, 0, 0], region: 'any', area: [5, 62, 82, 90] },
      // korunun güney yarısında pazardan çalıp kaçan goblinler (tilkilerden biraz güçlü)
      { monster: 'sneaky_goblin', count: 27, level: [2, 3], variants: [85, 15, 0], region: 'any', area: [5, 89, 82, 112] },
      // en güneydeki Tilki Kral Arenası (merkez 44,121; yarıçap 8 karo)
      { monster: 'fox_king', count: 1, level: [20, 20], variants: [100, 0, 0], region: 'any', area: [39, 116, 49, 126] },
    ],
    market: { tx: 67, ty: 24, rx: 14, ry: 11, name: 'Pazar Meydanı' },
    desc: 'Güvenli sosyal merkez. Doğudaki Pazar Meydanı\'nda oyuncular tezgâh kurup eşya satar; güneydeki Tilki Korusu yeni başlayanların ilk avıdır; korunun en ucundaki arenada Tilki Kral bekler.',
    npcs: [
      { id: 'haso', name: 'Haso', title: 'Demirci', art: 'smith', tx: 17, ty: 14, actions: ['upgrade', 'evolve'] },
      { id: 'rauf', name: 'Rauf', title: 'Depocu', art: 'keeper', tx: 38, ty: 14, actions: ['storage', 'bank'] },
      { id: 'pakize', name: 'Pakize', title: 'Zanaatkâr', art: 'crafter', tx: 17, ty: 30, actions: ['craft'] },
      { id: 'nur', name: 'Nur', title: 'Işınlayıcı', art: 'mage', tx: 31, ty: 26, actions: ['teleport'] },
      { id: 'bekci', name: 'Zindan Bekçisi', title: 'Seferler', art: 'warden', tx: 38, ty: 30, actions: ['forge', 'tower'] },
      { id: 'arda', name: 'Seyis Arda', title: 'Binek Ustası', art: 'stable', tx: 45, ty: 22, actions: ['mount'] },
      { id: 'tuccar', name: 'Tüccar Selim', title: 'Erzak', art: 'merchant', tx: 24, ty: 22, actions: ['shop_general', 'sell'] },
      { id: 'kemal', name: 'Balıkçı Kemal', title: '', art: 'fisher', tx: 15, ty: 35, actions: ['fishing_shop'] },
      { id: 'reyhan', name: 'Şifacı Reyhan', title: 'Şifa Bahçesi', art: 'herbalist', tx: 31, ty: 45, actions: ['garden'] },
    ],
  },
  forest: {
    id: 'forest', name: 'Kuzey Ormanı', w: 96, h: 72, theme: 'forest', seed: 4242, safe: false, pvp: false, minLevel: 10,
    respawnMap: 'forest', travelable: true,
    desc: 'Sv. 10–19 av bölgesi. Gölge Kurtları, Çürük Muhafızlar ve Öz Yutanlar.',
    npcs: [],
    spawns: [
      // her satır kendi yuvalarına bölünür (yaklaşık 9 canavarlık sürüler), bkz. mapgen placeSpawns
      { monster: 'shadow_wolf', count: 40, level: [10, 12], variants: [80, 18, 2], region: 'near' },
      { monster: 'shadow_wolf', count: 24, level: [12, 14], variants: [60, 32, 8], region: 'mid' },
      { monster: 'rot_guard', count: 30, level: [13, 16], variants: [65, 28, 7], region: 'mid' },
      { monster: 'essence_eater', count: 30, level: [15, 18], variants: [55, 35, 10], region: 'far' },
      { monster: 'rot_guard', count: 18, level: [17, 19], variants: [45, 40, 15], region: 'far' },
    ],
  },
  frozen: {
    id: 'frozen', name: 'Donmuş Çam Geçidi', w: 96, h: 72, theme: 'frozen', seed: 777, safe: false, pvp: false, minLevel: 20,
    respawnMap: 'frozen', travelable: true,
    desc: 'Kırağı Vaşakları, Buzkök Golemleri ve Tipi Kâhinleri.',
    npcs: [],
    spawns: [
      { monster: 'frost_lynx', count: 56, level: [20, 26], variants: [70, 25, 5], region: 'near' },
      { monster: 'ice_golem', count: 42, level: [24, 32], variants: [65, 28, 7], region: 'mid' },
      { monster: 'blizzard_seer', count: 36, level: [28, 36], variants: [55, 35, 10], region: 'far' },
    ],
  },
  black: {
    id: 'black', name: 'Kara Bölge', w: 80, h: 64, theme: 'black', seed: 6666, safe: false, pvp: true, minLevel: 40,
    respawnMap: 'black', travelable: true, dropPenalty: 'gems5',
    desc: 'Açık PvP. Kül Şövalyeleri, Kara Taş Gargoylleri ve Kara Taş Muhafızı. Ölümde ekipman korunur, bölgede yeniden doğarsın.',
    npcs: [],
    spawns: [
      { monster: 'black_stone', count: 1, level: [45, 45], variants: [100, 0, 0], region: 'far' },
      // Kül Şövalyeleri bölgenin her yerinde, Kara Taş Gargoylleri muhafızın çevresinde (önceki 20 Tipi Kâhini yerine 42 canavar)
      { monster: 'k_ash_knight', count: 26, level: [42, 42], variants: [45, 40, 15], region: 'any' },
      { monster: 'k_gargoyle', count: 16, level: [46, 46], variants: [40, 45, 15], region: 'far' },
    ],
  },
  coast: {
    id: 'coast', name: 'Rün Sahili', w: 128, h: 96, theme: 'coast', seed: 5150, safe: false, pvp: false, minLevel: 50,
    respawnMap: 'coast', travelable: true,
    desc: 'Dalgaların kadim rün taşlarını dövdüğü uçsuz bucaksız sahil. Batık gemiler, parlayan menhirler ve denizden çıkan güçlü yaratıklar; rün parçaları burada düşer.',
    spawns: [
      { monster: 'c_tide_crab', count: 46, level: [52, 52], variants: [60, 32, 8], region: 'near' },
      { monster: 'c_drowned_raider', count: 34, level: [55, 55], variants: [52, 38, 10], region: 'mid' },
      { monster: 'c_tide_crab', count: 14, level: [52, 52], variants: [50, 38, 12], region: 'mid' },
      { monster: 'c_rune_siren', count: 30, level: [57, 57], variants: [50, 38, 12], region: 'far' },
      { monster: 'c_rune_golem', count: 22, level: [60, 60], variants: [45, 40, 15], region: 'far' },
      { monster: 'c_drowned_raider', count: 12, level: [55, 55], variants: [45, 40, 15], region: 'far' },
    ],
    npcs: [],
  },
  arena: {
    id: 'arena', name: 'Savaş Arenası', w: 44, h: 44, theme: 'village', seed: 1453, safe: false, pvp: true, minLevel: 1,
    respawnMap: 'arena', travelable: false, spawns: [], npcs: [],
    desc: 'Etkinlik saatlerinde açılan PvP arenası. En çok rakip yenen ödülleri kazanır. Ölümde kayıp yok.',
  },
  lake: {
    id: 'lake', name: 'Şelale Gölü', w: 64, h: 48, theme: 'lake', seed: 31, safe: true, pvp: false, minLevel: 1,
    respawnMap: 'lake', travelable: true, spawns: [],
    desc: 'Güvenli balıkçılık bölgesi. Balıkçı Hasan seni bekliyor.',
    npcs: [{ id: 'hasan', name: 'Balıkçı Hasan', title: 'Balıkçı', art: 'fisher', tx: 30, ty: 34, actions: ['fishing_shop'] }],
  },
  // Lonca savaşı meydanı: arena düzeni; iki lonca batı ve doğudan girer (bkz. server guilds.ts)
  guildwar: {
    id: 'guildwar', name: 'Lonca Savaş Meydanı', w: 44, h: 44, theme: 'village', seed: 1071, safe: false, pvp: true, minLevel: 1,
    respawnMap: 'guildwar', travelable: false, spawns: [], npcs: [],
    desc: 'Lonca savaşlarının yapıldığı meydan. 5 dakikada en çok rakip yenen lonca kazanır. Ölümde kayıp yok.',
  },
  // Dünya Boss'u meydanı: mini haritanın altındaki sayaç dolunca "Dünya Boss'una git" ile girilir (bkz. TUNING.worldBoss)
  worldboss: {
    id: 'worldboss', name: 'Kadim Sunak', w: 56, h: 56, theme: 'black', seed: 4242, safe: false, pvp: false, minLevel: 1,
    respawnMap: 'worldboss', travelable: false, npcs: [],
    spawns: [{ monster: 'world_boss', count: 1, level: [55, 55], variants: [100, 0, 0], region: 'any', area: [24, 21, 32, 29] }],
    desc: 'Dünya Boss\'unun yıkık sunağı. Bütün kanal birlikte savaşır; ganimeti verdiği hasara göre herkes alır.',
  },
  // Kadim Kule: 10 kat odası (bkz. content/tower.ts); giriş Zindan Bekçisi'nden, canavarlar kat ayarından
  tower: {
    id: 'tower', name: 'Kadim Kule', w: 200, h: 80, theme: 'tower', seed: 1299, safe: false, pvp: false, minLevel: 1,
    respawnMap: 'tower', travelable: false, spawns: [], npcs: [],
    desc: 'On katlı kadim kule. Her katta canavarlar ve bulmacalar; zirvede Azrail bekler.',
  },
  // Kor Kulesi: her grubun kendi 3 katı (bkz. content/forge.ts); giriş Zindan Bekçisi'nden
  forge: {
    id: 'forge', name: 'Kor Kulesi', w: 108, h: 264, theme: 'forge', seed: 7311, safe: false, pvp: false, minLevel: 1,
    respawnMap: 'forge', travelable: false, spawns: [], npcs: [],
    desc: 'Üç katlı demirci kulesi. Dalga dalga Cüruf Golemleri, kalıp ve köz bulmacaları; zirvede Karademir.',
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

/**
 * Pazar Köyü Kan Meydanı: Şifacı Reyhan'ın karşısında (yolun batısı) taş halkalı kum meydan. İçine giren herkesin
 * adı kırmızıya döner ve meydandaki diğer oyuncularla vuruşabilir (köyün geri kalanı güvenli). Ölümde kayıp yok.
 * tx/ty karo merkezi, r karo yarıçapı (iç alan).
 */
export const PVP_RING = { map: 'bazaar', tx: 14, ty: 50, r: 6.2, name: 'Kan Meydanı' } as const;
/** Dünya koordinatı (piksel) Kan Meydanı'nın içinde mi? */
export function inPvpRing(mapId: string, x: number, y: number): boolean {
  if (mapId !== PVP_RING.map) return false;
  const T = 64, dx = x / T - (PVP_RING.tx + 0.5), dy = y / T - (PVP_RING.ty + 0.5);
  return dx * dx + dy * dy <= PVP_RING.r * PVP_RING.r;
}
