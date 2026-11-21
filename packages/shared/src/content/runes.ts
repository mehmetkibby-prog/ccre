/**
 * Rün sistemi (Rün Sahili): üç tür rün aynı anda takılır.
 *  - Kızıl Kudret: saldırı, Safir Siper: savunma, Zümrüt Yaşam: azami can; her seviye ilgili özelliğe +%0,20.
 *  - Ganimet: Rün Sahili canavarlarından rün parçaları (malzeme) düşer; aynı türden 5 parça → 1. seviye rün.
 *  - Geliştirme garantili: 1→2 için 3 parça, 2→3 için 4 parça… her seviyede bir parça fazla.
 *  - Takma/çıkarma savaş dışında; parçalar ve rünler pazarda satılır, rün seviyesiyle el değiştirir.
 *  - Panel 50. seviyede açılır (Rün Sahili'ne de 50'de girilir).
 */
export type RuneKind = 'kudret' | 'siper' | 'yasam';
export const RUNE_KINDS: RuneKind[] = ['kudret', 'siper', 'yasam'];
export interface RuneDef { kind: RuneKind; name: string; short: string; frag: string; fragName: string; stat: 'atk' | 'def' | 'hp'; statName: string; color: string; icon: string }
export const RUNES: Record<RuneKind, RuneDef> = {
  kudret: { kind: 'kudret', name: 'Kızıl Kudret Rünü', short: 'Kızıl Kudret', frag: 'rune_frag_kudret', fragName: 'Kızıl Kudret Parçası', stat: 'atk', statName: 'saldırı', color: '#ff5a4a', icon: 'rune_kudret' },
  siper: { kind: 'siper', name: 'Safir Siper Rünü', short: 'Safir Siper', frag: 'rune_frag_siper', fragName: 'Safir Siper Parçası', stat: 'def', statName: 'savunma', color: '#4f93ff', icon: 'rune_siper' },
  yasam: { kind: 'yasam', name: 'Zümrüt Yaşam Rünü', short: 'Zümrüt Yaşam', frag: 'rune_frag_yasam', fragName: 'Zümrüt Yaşam Parçası', stat: 'hp', statName: 'azami can', color: '#38dd7a', icon: 'rune_yasam' },
};
export const RUNE_FRAG_KEYS = RUNE_KINDS.map((k) => RUNES[k].frag);
export const RUNE_UNLOCK_LEVEL = 50;
export const RUNE_CRAFT_COST = 5;
export const RUNE_PCT_PER_LEVEL = 0.2;
export const RUNE_MAX_LEVEL = 30;
/** lv → lv+1 için gereken parça (1→2: 3, 2→3: 4 …) */
export const runeUpCost = (lv: number) => Math.max(1, Math.floor(lv)) + 2;
/** Bir rünün verdiği yüzde */
export const runePct = (lv: number) => Math.round(Math.max(0, Math.min(RUNE_MAX_LEVEL, Math.floor(lv))) * RUNE_PCT_PER_LEVEL * 100) / 100;
/** Çantadaki/takılı rün */
export interface RuneItem { uid: string; k: RuneKind; lv: number }
export interface RuneState { bag: RuneItem[]; eq: Partial<Record<RuneKind, RuneItem>> }
export const RUNE_BAG_MAX = 30;
export const isRuneKind = (k: unknown): k is RuneKind => k === 'kudret' || k === 'siper' || k === 'yasam';
/** Takılı rünlerin toplam yüzdeleri (stat hesabına) */
export function runeBonus(st: RuneState | undefined): { atkPct: number; defPct: number; hpPct: number } {
  const e = st?.eq ?? {};
  return { atkPct: e.kudret ? runePct(e.kudret.lv) : 0, defPct: e.siper ? runePct(e.siper.lv) : 0, hpPct: e.yasam ? runePct(e.yasam.lv) : 0 };
}
