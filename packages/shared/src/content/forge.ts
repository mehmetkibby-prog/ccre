/**
 * Kor Kulesi (Sv. 10+): üç katlı demirci kulesi. Kadim Kule'den farkı: her grup kendi kule odalarına girer
 * (paylaşılmayan örnek), katlar dalga dalga gelir ve her katta bir bulmaca vardır.
 *
 *  1. ve 2. kat:  1. dalga → 2. dalga → bulmaca → 3. dalga (elitler) → kapı açılır
 *  3. kat:        Karademir (boss) — canı azaldıkça Cüruf Golemleri çağırır
 *
 * Harita FORGE_SLOTS sıra × 3 sütun odadan oluşur: her sıra bir grubun kulesidir (sütun = kat). Odalar arası
 * geçilmez lav uçurumu. Konumlar sunucu ve istemcide aynı fonksiyondan gelir (gösterilen = gerçek).
 */
import { TILE } from '../constants.ts';

export const FORGE_MAP = 'forge';
export const FORGE_FLOORS = 3;
/** aynı anda en çok kaç grup (kanal başına) */
export const FORGE_SLOTS = 6;
/** oda merkezleri arası (karo): yatay kat, dikey grup; oda yarıçapı */
export const FORGE_SX = 36;
export const FORGE_SY = 44;
export const FORGE_R = 10;
export const FORGE_W = FORGE_FLOORS * FORGE_SX;
export const FORGE_H = FORGE_SLOTS * FORGE_SY;
/** taşa basma ve kapıya girme yarıçapı (dünya birimi) */
export const FORGE_PLATE_R = 58;
export const FORGE_GATE_R = 90;
/** közü alma ve örse bırakma yarıçapı */
export const EMBER_PICK_R = 70;
export const ANVIL_R = 110;

export type ForgePuzzle = 'mold' | 'ember';
export const FORGE_PUZZLES: ForgePuzzle[] = ['mold', 'ember'];
export const FORGE_PUZZLE_NAMES: Record<ForgePuzzle, string> = { mold: 'Döküm Kalıpları', ember: 'Kor Taşıma' };
export const FORGE_PUZZLE_HINTS: Record<ForgePuzzle, string> = {
  mold: 'Kalıp taşlarının altında çift çift semboller saklı. Bir taşa bas, sembolü görünür; sonra eşini bul. Yanlış eşleşmede iki taş kapanır ve kıvılcım çarpar. Bütün çiftleri bul.',
  ember: 'Ocaktan közler sıçrar. Közün üstüne basıp al, soğumadan ortadaki örse taşı. Taşırken köz soğur; vaktinde yetiştiremezsen yerine yenisi düşer.',
};
/** Kalıp sembolleri (adı, rengi, istemcide çizilen işaret) */
export const MOLD_SYMBOLS: { name: string; color: string; glyph: string }[] = [
  { name: 'Kılıç', color: '#ff7a3a', glyph: '⚔' },
  { name: 'Kalkan', color: '#5ab8ff', glyph: '⛨' },
  { name: 'Çekiç', color: '#ffd04a', glyph: '⚒' },
  { name: 'Alev', color: '#ff4a6a', glyph: '✹' },
  { name: 'Yıldız', color: '#b58aff', glyph: '✦' },
];
export const MOLD_MAX_PAIRS = 5;

export const FORGE_STAGE_NAMES: Record<string, string> = {
  w1: '1. Dalga', w2: '2. Dalga', puzzle: 'Bulmaca', w3: '3. Dalga · Elitler', boss: 'Karademir', done: 'Kapı açık',
};

const tc = (t: number) => t * TILE + TILE / 2;

export interface ForgeRoom {
  slot: number; floor: number; cx: number; cy: number; r: number;
  entry: { x: number; y: number }; gate: { x: number; y: number };
  /** döküm kalıbı taşları (en çok 10) */
  plates: { x: number; y: number }[];
  /** örs (kor taşıma hedefi) ve közlerin düşebileceği noktalar */
  anvil: { x: number; y: number };
  emberSpots: { x: number; y: number }[];
  /** dalga canavarlarının çıktığı lav yarıkları */
  rifts: { x: number; y: number }[];
}

export function forgeRoomTile(slot: number, floor: number) {
  const s = Math.max(0, Math.min(FORGE_SLOTS - 1, slot)), f = Math.max(1, Math.min(FORGE_FLOORS, floor));
  return { tx: FORGE_SX / 2 + (f - 1) * FORGE_SX, ty: FORGE_SY / 2 + s * FORGE_SY };
}

export function forgeRoom(slot: number, floor: number): ForgeRoom {
  const { tx, ty } = forgeRoomTile(slot, floor);
  const plates: { x: number; y: number }[] = [];
  // 2 sıra × 5 sütun; çift sayısına göre ortadan doldurulur (istemci ve sunucu ilk 2×çift taşı kullanır)
  for (const ox of [-2, 2, -6, 6, 0]) for (const oy of [-4, 0]) plates.push({ x: tc(tx + ox), y: tc(ty + oy) });
  const emberSpots: { x: number; y: number }[] = [];
  for (let i = 0; i < 8; i++) {
    const a = (-Math.PI / 2) + (i - 3.5) * 0.62; // kuzey yarımda (girişten uzak)
    emberSpots.push({ x: tc(tx + Math.cos(a) * 7.2), y: tc(ty + 1 + Math.sin(a) * 6.4) });
  }
  const rifts: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) { const a = Math.PI * (1.08 + i * 0.168); rifts.push({ x: tc(tx + Math.cos(a) * 7), y: tc(ty + Math.sin(a) * 7) }); }
  return {
    slot, floor, cx: tc(tx), cy: tc(ty), r: FORGE_R * TILE,
    entry: { x: tc(tx), y: tc(ty + FORGE_R - 3) }, gate: { x: tc(tx), y: tc(ty - FORGE_R + 2) },
    plates, anvil: { x: tc(tx), y: tc(ty + 3) }, emberSpots, rifts,
  };
}

/** Dünya noktası hangi grubun hangi katında (yoksa null) */
export function forgeAt(x: number, y: number): { slot: number; floor: number } | null {
  const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE);
  const col = Math.floor(tx / FORGE_SX), row = Math.floor(ty / FORGE_SY);
  if (col < 0 || col >= FORGE_FLOORS || row < 0 || row >= FORGE_SLOTS) return null;
  return { slot: row, floor: col + 1 };
}
