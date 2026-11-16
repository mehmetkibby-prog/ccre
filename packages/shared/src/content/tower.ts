/**
 * Kadim Kule: tek haritada 10 ayrı kat odası (5×2 dizilim, aralarında geçilmez uçurum).
 * Her odanın güneyinde giriş, kuzeyinde üst kata çıkan kapı vardır. Bulmaca katlarında yerde basılacak
 * mühür taşları bulunur. Konumlar sunucu ve istemcide aynı fonksiyondan gelir (gösterilen = gerçek).
 */
import { TILE } from '../constants.ts';
import type { TowerPuzzle } from '../tuning.ts';

export const TOWER_MAP = 'tower';
export const TOWER_FLOORS = 10;
export const TOWER_COLS = 5;
/** oda merkezleri arası (karo) ve oda yarıçapı (karo) */
export const TOWER_SPACE = 40;
export const TOWER_R = 11;
export const TOWER_W = TOWER_COLS * TOWER_SPACE;
export const TOWER_H = 2 * TOWER_SPACE;
/** mühür taşına basma yarıçapı ve kapıya girme yarıçapı (dünya birimi) */
export const PLATE_R = 56;
export const GATE_R = 90;
/** sunakta beklenmesi gereken süre (ms) ve üç sunağın yakılması için süre (ms) */
export const ALTAR_HOLD_MS = 3000;
export const ALTAR_WINDOW_MS = 60_000;

export const TOWER_PUZZLE_NAMES: Record<TowerPuzzle, string> = {
  kill: 'Kat Muhafızları', seq: 'Mühür Sırası', key: 'Kayıp Anahtar', riddle: 'Bilge Taşların Bilmecesi', altar: 'Ruh Sunakları', boss: 'Azrail',
};
export const TOWER_PUZZLE_HINTS: Record<TowerPuzzle, string> = {
  kill: 'Kattaki canavarları öldür; sayı dolunca kapı açılır.',
  seq: 'Mühür taşları sırayla parlar. Aynı sırayla taşlara bas. Yanlış taş seni çarpar ve sıra baştan başlar.',
  key: 'Canavarlardan biri Kat Anahtarı taşıyor. Anahtarı bul, kapı açılsın.',
  riddle: 'Bilmeceyi oku, doğru cevabın yazılı olduğu taşa bas. Yanlış cevap seni girişe geri atar.',
  altar: 'Üç sunağın her birinde 3 saniye dur. Üçünü de 60 saniye içinde yak.',
  boss: 'Azrail\'i yen. Hasar veren herkese Azrail Sandığı düşer.',
};
/** Mühür taşı renkleri (sıra bulmacası) */
export const SEQ_COLORS = ['#ff5a4a', '#4aa8ff', '#5ae07a', '#ffd04a'];
export const SEQ_NAMES = ['Kızıl', 'Mavi', 'Yeşil', 'Altın'];

const tc = (t: number) => t * TILE + TILE / 2;

export interface TowerRoom {
  floor: number; cx: number; cy: number; r: number;
  entry: { x: number; y: number }; gate: { x: number; y: number };
  /** kat bulmacasının taşları (dünya birimi) */
  plates: { x: number; y: number }[];
}
/** Oda merkezi karo koordinatı */
export function towerRoomTile(floor: number) {
  const i = Math.max(0, Math.min(TOWER_FLOORS - 1, floor - 1));
  return { tx: TOWER_SPACE / 2 + (i % TOWER_COLS) * TOWER_SPACE, ty: TOWER_SPACE / 2 + Math.floor(i / TOWER_COLS) * TOWER_SPACE };
}
export function towerRoom(floor: number, puzzle?: TowerPuzzle): TowerRoom {
  const { tx, ty } = towerRoomTile(floor);
  const plates: { x: number; y: number }[] = [];
  if (puzzle === 'seq' || puzzle === 'riddle') for (const ox of [-6, -2, 2, 6]) plates.push({ x: tc(tx + ox), y: tc(ty - 2) });
  else if (puzzle === 'altar') for (const [ox, oy] of [[-7, 2], [7, 2], [0, -5]]) plates.push({ x: tc(tx + ox), y: tc(ty + oy) });
  return { floor, cx: tc(tx), cy: tc(ty), r: TOWER_R * TILE, entry: { x: tc(tx), y: tc(ty + TOWER_R - 3) }, gate: { x: tc(tx), y: tc(ty - TOWER_R + 2) }, plates };
}
/** Dünya noktası hangi katta (0 = hiçbiri) */
export function towerFloorAt(x: number, y: number): number {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const col = Math.floor(tx / TOWER_SPACE), row = Math.floor(ty / TOWER_SPACE);
  if (col < 0 || col >= TOWER_COLS || row < 0 || row > 1) return 0;
  return row * TOWER_COLS + col + 1;
}

/** Bilmeceler: q soru, a doğru cevap, w üç yanlış cevap */
export const RIDDLES: { q: string; a: string; w: [string, string, string] }[] = [
  { q: 'Gece doğar, gündüz kaybolur; gökte tek gözüyle bakar, bazen yarım bazen tam.', a: 'Ay', w: ['Güneş', 'Baykuş', 'Fener'] },
  { q: 'Ondan ne kadar çok alırsan o kadar büyür.', a: 'Çukur', w: ['Hazine', 'Ateş', 'Gölge'] },
  { q: 'Adımı söyleyen beni hemen bozar.', a: 'Sessizlik', w: ['Ayna', 'Yemin', 'Zincir'] },
  { q: 'Peşinden gelir, asla yakalanmaz; ışık olmadan doğmaz.', a: 'Gölge', w: ['Rüzgâr', 'Yankı', 'Ruh'] },
  { q: 'Ağzım yok konuşurum, kulağım yok duyarım; dağda seslenene ben cevap veririm.', a: 'Yankı', w: ['Rüzgâr', 'Kuzgun', 'Çan'] },
  { q: 'Akrebi var ama zehri yok, yelkovanı var ama yelkeni yok.', a: 'Saat', w: ['Pusula', 'Terazi', 'Kum Saati'] },
  { q: 'Dişleri var ama ısırmaz; dağınık saçı düzeltir.', a: 'Tarak', w: ['Testere', 'Anahtar', 'Çark'] },
  { q: 'Her sabah doğar, her akşam batar; yaklaşanı yakar.', a: 'Güneş', w: ['Ay', 'Yıldız', 'Meşale'] },
  { q: 'Kapısı yok, kilidi yok; içinde altın bir hazine saklı.', a: 'Yumurta', w: ['Ceviz', 'Sandık', 'Kese'] },
  { q: 'Ne kadar kurutursa o kadar ıslanır.', a: 'Havlu', w: ['Sünger', 'Toprak', 'Kum'] },
];
