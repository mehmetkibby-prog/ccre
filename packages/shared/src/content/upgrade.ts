import { TUNING } from '../tuning.ts';

/**
 * Artı basma (Demirci): yalnız silah ve gövde zırhı, en çok +6.
 * Her kademe: başarı şansı, Mücevher bedeli, malzemeler (ör. Güçlü Dal) ve o kademeye ulaşınca karakterin
 * TOPLAM saldırısına (silah) ya da TOPLAM savunmasına (zırh) eklenen yüzde: evrimle aynı mantık, artış her
 * seviyede hissedilir. Evrimle toplanır (ör. +%10 artı ve +%8 evrim = +%18). Hepsi yönetim panelinden değişir.
 * Başarısızlıkta eşya bir kademe düşer (panelden kapatılabilir); +0 altına inmez, eşya yok olmaz.
 */
export const MAX_PLUS = 6;
export const UPGRADABLE_SLOTS = ['weapon', 'armor'] as const;
export interface UpgradeStep { target: number; chance: number; gems: number; mats: Record<string, number>; weapon: number; armor: number }

export const DEFAULT_UPGRADE: UpgradeStep[] = [
  { target: 1, chance: 100, gems: 100, mats: { strong_branch: 3, kor_seal: 1 }, weapon: 3, armor: 2 },
  { target: 2, chance: 90, gems: 250, mats: { strong_branch: 5, kor_seal: 2 }, weapon: 6, armor: 5 },
  { target: 3, chance: 75, gems: 500, mats: { strong_crystal: 5, kor_seal: 3 }, weapon: 10, armor: 8 },
  { target: 4, chance: 55, gems: 1000, mats: { desert_herb: 8, kor_seal: 4 }, weapon: 15, armor: 12 },
  { target: 5, chance: 35, gems: 2000, mats: { master_scroll: 10, kor_seal: 5 }, weapon: 21, armor: 17 },
  { target: 6, chance: 20, gems: 4000, mats: { old_iron: 15, kor_seal: 6 }, weapon: 28, armor: 23 },
];

/** Geçerli tablo: yönetim ayarı varsa o (6 kademe), yoksa varsayılan. */
export function upgradeSteps(): UpgradeStep[] {
  const t = TUNING.upgrade?.steps;
  if (!t || t.length !== MAX_PLUS) return DEFAULT_UPGRADE;
  // eski kayıtlı tabloda yüzde eşyanın kendi gücüneydi (ör. +6 = %78): toplam güce uygulanırsa çok büyük olur.
  // Şans, bedel ve malzemeler korunur; yüzdeler yönetim yeni tabloyu kaydedene dek yeni varsayılandan gelir.
  const total = !!TUNING.upgrade?.total;
  return t.map((s, i) => ({ target: i + 1, ...s, ...(total ? {} : { weapon: DEFAULT_UPGRADE[i].weapon, armor: DEFAULT_UPGRADE[i].armor }) }));
}
export const upgradeStep = (target: number) => upgradeSteps()[target - 1] ?? null;
export const upgradeFailDown = () => TUNING.upgrade?.failDown ?? true;
export const isUpgradable = (slot: string | undefined) => slot === 'weapon' || slot === 'armor';

/** Artının yüzdesi: silahta toplam saldırıya, zırhta toplam savunmaya eklenir (computeStats). */
export function plusPct(slot: string | undefined, plus: number): number {
  if (plus <= 0 || !isUpgradable(slot)) return 0;
  const s = upgradeSteps()[Math.min(plus, MAX_PLUS) - 1];
  return s ? (slot === 'weapon' ? s.weapon : s.armor) : 0;
}

/** Ustalık Mührü göreli %30 artırır: %20 → %26. */
export function masteryChance(base: number): number { return Math.min(100, Math.round(base * 1.3 * 10) / 10); }
