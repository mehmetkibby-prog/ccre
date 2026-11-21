/**
 * Rütbe sistemi: 65. seviyeye (seviye sınırı) ulaşan karakter doğrudan ilk rütbeyi ("Öz Avcısı") alır. Bundan sonra
 * kazandığı tecrübe puanı rütbe tecrübesine akar; eşiğe ulaşınca bir üst rütbeye çıkar. Her rütbe saldırıya ve azami
 * cana küçük bir yüzde katar; rütbe adı oyuncunun adının üstünde renkli görünür. Yönetim istediği oyuncuya rütbe verebilir.
 */
export interface RankDef { id: number; name: string; color: string; /** bu rütbeye çıkmak için gereken rütbe tecrübesi (bir öncekinden) */ xp: number; atkPct: number; hpPct: number }

export const RANK_LEVEL = 65;
export const RANKS: RankDef[] = [
  { id: 1, name: 'Öz Avcısı', color: '#7fd8ff', xp: 0, atkPct: 1, hpPct: 1 },
  { id: 2, name: 'Gölge Muhafızı', color: '#9fb4ff', xp: 400_000, atkPct: 2, hpPct: 2 },
  { id: 3, name: 'Kızıl Yemin', color: '#ff8a7a', xp: 600_000, atkPct: 3, hpPct: 3 },
  { id: 4, name: 'Demir Pençe', color: '#d9d2c4', xp: 900_000, atkPct: 4, hpPct: 4 },
  { id: 5, name: 'Fırtına Kılıcı', color: '#8ff0d2', xp: 1_300_000, atkPct: 5, hpPct: 5 },
  { id: 6, name: 'Ejder Yürek', color: '#ffb35c', xp: 1_800_000, atkPct: 6, hpPct: 6 },
  { id: 7, name: 'Kadim Bilge', color: '#d8a8ff', xp: 2_500_000, atkPct: 7, hpPct: 7 },
  { id: 8, name: 'Efsane Lord', color: '#ffd24a', xp: 3_400_000, atkPct: 8, hpPct: 8 },
  { id: 9, name: 'Gök Hükümdarı', color: '#7affa0', xp: 4_600_000, atkPct: 9, hpPct: 9 },
  { id: 10, name: 'Ebedi Öz', color: '#ff5fd2', xp: 6_000_000, atkPct: 10, hpPct: 10 },
];
export const RANK_MAX = RANKS.length;
export const rankDef = (r: number | undefined): RankDef | null => (r && r >= 1 ? RANKS[Math.min(RANK_MAX, Math.floor(r)) - 1] : null);

export interface RankState { r: number; xp: number }
/**
 * Tecrübe ekler: seviye sınırındaki karakterin rütbesini ilerletir. Döner: yeni durum ve kaç rütbe atlandı.
 * Rütbesi olmayan (65'e yeni ulaşan) karakter önce Öz Avcısı olur.
 */
export function addRankXp(st: RankState | undefined, gain: number): { st: RankState; ups: number } {
  const s: RankState = st && st.r >= 1 ? { r: Math.min(RANK_MAX, st.r), xp: Math.max(0, st.xp) } : { r: 1, xp: 0 };
  let ups = st && st.r >= 1 ? 0 : 1;
  s.xp += Math.max(0, Math.floor(gain));
  while (s.r < RANK_MAX && s.xp >= RANKS[s.r].xp) { s.xp -= RANKS[s.r].xp; s.r++; ups++; }
  if (s.r >= RANK_MAX) s.xp = 0;
  return { st: s, ups };
}
/** Rütbe yüzdeleri (yoksa 0) */
export function rankBonus(r: number | undefined): { atkPct: number; hpPct: number } {
  const d = rankDef(r);
  return d ? { atkPct: d.atkPct, hpPct: d.hpPct } : { atkPct: 0, hpPct: 0 };
}
