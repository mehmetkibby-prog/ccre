/**
 * Rün sistemi (Rün Sahili): üç tür rün aynı anda takılır.
 *  - Kızıl Kudret: saldırı, Safir Siper: savunma, Zümrüt Yaşam: azami can; her seviye ilgili özelliğe +%0,20.
 *  - Ganimet: Rün Sahili canavarlarından rün parçaları (malzeme) düşer; aynı türden 5 parça → 1. seviye rün.
 *  - Geliştirme garantili: 1→2 için 3 parça, 2→3 için 4 parça… her seviyede bir parça fazla.
 *  - Takma/çıkarma savaş dışında; parçalar ve rünler pazarda satılır, rün seviyesiyle el değiştirir.
 *  - Panel 50. seviyede açılır (Rün Sahili'ne de 50'de girilir).
 *
 * Çantadaki rünler seviyeye özel malzeme yığınlarıdır ("rune_kudret_10" = 10. seviye Kızıl Kudret Rünü). Böylece
 * pazar, Ticaret Camı, depo ve ticaret rünleri seviyesiyle birlikte taşır. Takılı rünler misc.runes.eq'de (seviye).
 */
import { MATERIAL, type MaterialDef } from './items.ts';
import { TUNING } from '../tuning.ts';

export type RuneKind = 'kudret' | 'siper' | 'yasam';
export const RUNE_KINDS: RuneKind[] = ['kudret', 'siper', 'yasam'];
export interface RuneDef { kind: RuneKind; name: string; short: string; frag: string; fragName: string; stat: 'atk' | 'def' | 'hp'; statName: string; color: string; icon: string; fragIcon: string }
export const RUNES: Record<RuneKind, RuneDef> = {
  kudret: { kind: 'kudret', name: 'Kızıl Kudret Rünü', short: 'Kızıl Kudret', frag: 'rune_frag_kudret', fragName: 'Kızıl Kudret Parçası', stat: 'atk', statName: 'saldırı', color: '#ff5a4a', icon: 'rune_kudret', fragIcon: 'rune_frag_kudret' },
  siper: { kind: 'siper', name: 'Safir Siper Rünü', short: 'Safir Siper', frag: 'rune_frag_siper', fragName: 'Safir Siper Parçası', stat: 'def', statName: 'savunma', color: '#4f93ff', icon: 'rune_siper', fragIcon: 'rune_frag_siper' },
  yasam: { kind: 'yasam', name: 'Zümrüt Yaşam Rünü', short: 'Zümrüt Yaşam', frag: 'rune_frag_yasam', fragName: 'Zümrüt Yaşam Parçası', stat: 'hp', statName: 'azami can', color: '#38dd7a', icon: 'rune_yasam', fragIcon: 'rune_frag_yasam' },
};
export const RUNE_FRAG_KEYS = RUNE_KINDS.map((k) => RUNES[k].frag);
export const RUNE_MAX_LEVEL = 30;
/** Yönetimden ayarlanabilen değerler (yoksa varsayılan) */
export const RUNE_DEFAULTS = { unlockLevel: 50, craftCost: 5, pctPerLevel: 0.2, upBase: 2 };
export function runeConf() {
  const t = TUNING.runes ?? {};
  return {
    unlockLevel: t.unlockLevel ?? RUNE_DEFAULTS.unlockLevel,
    craftCost: t.craftCost ?? RUNE_DEFAULTS.craftCost,
    pctPerLevel: t.pctPerLevel ?? RUNE_DEFAULTS.pctPerLevel,
    upBase: t.upBase ?? RUNE_DEFAULTS.upBase,
  };
}
export const RUNE_UNLOCK_LEVEL = RUNE_DEFAULTS.unlockLevel;
export const RUNE_CRAFT_COST = RUNE_DEFAULTS.craftCost;
/** lv → lv+1 için gereken parça (1→2: 3, 2→3: 4 …) */
export const runeUpCost = (lv: number) => Math.max(1, Math.floor(lv)) + runeConf().upBase;
/** Bir rünün verdiği yüzde */
export const runePct = (lv: number) => Math.round(Math.max(0, Math.min(RUNE_MAX_LEVEL, Math.floor(lv))) * runeConf().pctPerLevel * 100) / 100;
export const isRuneKind = (k: unknown): k is RuneKind => k === 'kudret' || k === 'siper' || k === 'yasam';

/** Çantadaki rün yığınının anahtarı */
export const runeKey = (k: RuneKind, lv: number) => `rune_${k}_${Math.max(1, Math.min(RUNE_MAX_LEVEL, Math.floor(lv)))}`;
/** "rune_kudret_10" → { k: 'kudret', lv: 10 } */
export function parseRuneKey(key: string): { k: RuneKind; lv: number } | null {
  const m = /^rune_(kudret|siper|yasam)_(\d{1,2})$/.exec(key);
  if (!m) return null;
  const lv = Number(m[2]);
  return lv >= 1 && lv <= RUNE_MAX_LEVEL ? { k: m[1] as RuneKind, lv } : null;
}
export const isRuneKey = (key: string) => parseRuneKey(key) !== null;

/** Takılı rünler: tür → seviye */
export interface RuneState { eq: Partial<Record<RuneKind, number>> }
/** Takılı rünlerin toplam yüzdeleri (stat hesabına) */
export function runeBonus(st: RuneState | undefined): { atkPct: number; defPct: number; hpPct: number } {
  const e = st?.eq ?? {};
  return { atkPct: e.kudret ? runePct(e.kudret) : 0, defPct: e.siper ? runePct(e.siper) : 0, hpPct: e.yasam ? runePct(e.yasam) : 0 };
}

// rün yığınları malzeme sözlüğüne kaydedilir (pazar/depo/ticaret doğrulaması MATERIAL ile yapılır)
for (const k of RUNE_KINDS) {
  const d = RUNES[k];
  for (let lv = 1; lv <= RUNE_MAX_LEVEL; lv++) {
    const def: MaterialDef = { id: runeKey(k, lv), name: `${d.name} · Sv.${lv}`, icon: d.icon, color: d.color, sellable: false, desc: `Rün panelinden takılır: ${d.statName} +%${(lv * RUNE_DEFAULTS.pctPerLevel).toFixed(1).replace('.', ',')}. Pazarda seviyesiyle satılır.` };
    MATERIAL.set(def.id, def);
  }
}
