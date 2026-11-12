import { TUNING } from '../tuning.ts';

/**
 * Artı basma (Demirci): yalnız silah ve gövde zırhı, en çok +6.
 * Her kademe: başarı şansı, Mücevher bedeli, malzemeler (ör. Güçlü Dal) ve o kademeye ulaşınca eşyanın
 * temel gücüne eklenen toplam yüzde (silah saldırıya, zırh savunma/cana). Hepsi yönetim panelinden değişir.
 * Başarısızlıkta eşya bir kademe düşer (panelden kapatılabilir); +0 altına inmez, eşya yok olmaz.
 */
export const MAX_PLUS = 6;
export const UPGRADABLE_SLOTS = ['weapon', 'armor'] as const;
export interface UpgradeStep { target: number; chance: number; gems: number; mats: Record<string, number>; weapon: number; armor: number }

export const DEFAULT_UPGRADE: UpgradeStep[] = [
  { target: 1, chance: 100, gems: 100, mats: { strong_branch: 3, kor_seal: 1 }, weapon: 8, armor: 6 },
  { target: 2, chance: 90, gems: 250, mats: { strong_branch: 5, kor_seal: 2 }, weapon: 17, armor: 13 },
  { target: 3, chance: 75, gems: 500, mats: { strong_crystal: 5, kor_seal: 3 }, weapon: 28, armor: 21 },
  { target: 4, chance: 55, gems: 1000, mats: { desert_herb: 8, kor_seal: 4 }, weapon: 41, armor: 31 },
  { target: 5, chance: 35, gems: 2000, mats: { master_scroll: 10, kor_seal: 5 }, weapon: 57, armor: 43 },
  { target: 6, chance: 20, gems: 4000, mats: { old_iron: 15, kor_seal: 6 }, weapon: 78, armor: 58 },
];

/** Geçerli tablo: yönetim ayarı varsa o (6 kademe), yoksa varsayılan. */
export function upgradeSteps(): UpgradeStep[] {
  const t = TUNING.upgrade?.steps;
  return t && t.length === MAX_PLUS ? t.map((s, i) => ({ target: i + 1, ...s })) : DEFAULT_UPGRADE;
}
export const upgradeStep = (target: number) => upgradeSteps()[target - 1] ?? null;
export const upgradeFailDown = () => TUNING.upgrade?.failDown ?? true;
export const isUpgradable = (slot: string | undefined) => slot === 'weapon' || slot === 'armor';

/** Artının eklediği güç: temel gücün yüzdesi (beyaz eşyada da her kademe en az +kademe kadar). */
export function plusBonus(slot: string, plus: number, base: number): number {
  if (plus <= 0) return 0;
  const s = upgradeSteps()[Math.min(plus, MAX_PLUS) - 1];
  if (!s) return 0;
  const pct = slot === 'weapon' ? s.weapon : s.armor;
  return Math.max(plus, Math.round((base * pct) / 100));
}

/** Ustalık Mührü göreli %30 artırır: %20 → %26. */
export function masteryChance(base: number): number { return Math.min(100, Math.round(base * 1.3 * 10) / 10); }
