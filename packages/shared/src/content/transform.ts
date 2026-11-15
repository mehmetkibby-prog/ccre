import { TUNING, type TransformCostTune } from '../tuning.ts';
import { ITEM_TPL, RARITIES, type ItemInstance, type Rarity } from './items.ts';

/**
 * Demirci Haso · Dönüşüm: ekipman Eşsiz nadirliğe dönüşür. Efsunlar, artı, evrim ve av sayacı korunur
 * (yalnız nadirlik değişir). Ne istendiği yönetim panelindeki Dönüşüm sekmesinden ayarlanır.
 * Gruplar: silah, gövde zırhı, diğerleri (miğfer, takılar, çizme).
 */
export type TransformGroup = 'weapon' | 'armor' | 'other';
export const TRANSFORM_GROUPS: TransformGroup[] = ['weapon', 'armor', 'other'];
export const TRANSFORM_GROUP_NAMES: Record<TransformGroup, string> = { weapon: 'Silahlar', armor: 'Zırhlar', other: 'Diğer ekipman' };
export type TransformCost = TransformCostTune;

export const TRANSFORM_DEFAULTS: { enabled: boolean; from: Rarity[]; cost: Record<TransformGroup, TransformCost> } = {
  enabled: true,
  from: ['crimson'],
  cost: {
    weapon: { gems: 25000, mats: { old_iron: 20, master_scroll: 12, kor_seal: 8 }, chance: 100, minPlus: 0, minLevel: 30 },
    armor: { gems: 20000, mats: { old_iron: 16, desert_herb: 12, kor_seal: 6 }, chance: 100, minPlus: 0, minLevel: 30 },
    other: { gems: 9000, mats: { strong_crystal: 10, kor_seal: 4 }, chance: 100, minPlus: 0, minLevel: 30 },
  },
};

export function transformConf() {
  const t = TUNING.transform ?? {};
  const cost = {} as Record<TransformGroup, TransformCost>;
  for (const g of TRANSFORM_GROUPS) {
    const d = TRANSFORM_DEFAULTS.cost[g], o = t.cost?.[g] ?? {};
    cost[g] = { gems: o.gems ?? d.gems, mats: o.mats ?? d.mats, chance: o.chance ?? d.chance, minPlus: o.minPlus ?? d.minPlus, minLevel: o.minLevel ?? d.minLevel };
  }
  return { enabled: t.enabled ?? TRANSFORM_DEFAULTS.enabled, from: (t.from?.length ? t.from : TRANSFORM_DEFAULTS.from) as Rarity[], cost };
}
export function transformGroup(it: Pick<ItemInstance, 'tpl'>): TransformGroup | null {
  const slot = ITEM_TPL.get(it.tpl)?.slot;
  if (!slot) return null;
  return slot === 'weapon' ? 'weapon' : slot === 'armor' ? 'armor' : 'other';
}
/** Dönüşebilir mi: eşya ekipman, nadirliği kaynak listesinde (Eşsiz zaten dönüşmüş). */
export function canTransform(it: Pick<ItemInstance, 'tpl' | 'rarity'>): boolean {
  const c = transformConf();
  return c.enabled && it.rarity !== 'unique' && c.from.includes(it.rarity) && !!transformGroup(it);
}
export const TRANSFORM_RARITY_OPTIONS = RARITIES.filter((r) => r !== 'unique');
