import type { ClassId } from './classes.ts';

export type Slot = 'weapon' | 'armor' | 'helmet' | 'boots' | 'necklace' | 'earring' | 'bracelet';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'boots', 'necklace', 'earring', 'bracelet'];
export const SLOT_NAMES: Record<Slot, string> = {
  weapon: 'Silah', armor: 'Zırh', helmet: 'Miğfer', boots: 'Ayakkabı', necklace: 'Kolye', earring: 'Küpe', bracelet: 'Bilezik',
};

export type Rarity = 'white' | 'blue' | 'orange' | 'crimson' | 'unique' | 'infinite' | 'purple' | 'emerald';
export const RARITIES: Rarity[] = ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'];
export interface RarityDef { id: Rarity; name: string; color: string; minLevel: number; power: number; }
/** Güç çarpanları renk sırasından otomatik türemez; her nadirlik kendi değeriyle tanımlı. */
export const RARITY: Record<Rarity, RarityDef> = {
  white: { id: 'white', name: 'Sıradan', color: '#e8e6df', minLevel: 1, power: 1 },
  blue: { id: 'blue', name: 'Mavi', color: '#5fa8ff', minLevel: 7, power: 1.45 },
  orange: { id: 'orange', name: 'Turuncu', color: '#ffa53d', minLevel: 20, power: 2.2 },
  crimson: { id: 'crimson', name: 'Kızıl', color: '#ff4d5a', minLevel: 30, power: 3.1 },
  unique: { id: 'unique', name: 'Eşsiz', color: '#ffd84a', minLevel: 50, power: 4.6 },
  infinite: { id: 'infinite', name: 'Sonsuz', color: '#7cf3ff', minLevel: 50, power: 5.6 },
  purple: { id: 'purple', name: 'Mor Kök', color: '#c58bff', minLevel: 60, power: 5.2 },
  emerald: { id: 'emerald', name: 'Kadim Zümrüt', color: '#3ef09a', minLevel: 65, power: 6.4 },
};

export interface ItemTemplate {
  id: string;
  name: string;
  slot: Slot;
  cls?: ClassId; // yalnız silah/zırh/miğfer
  basePower: number; // silahta saldırı, diğerlerinde savunma/can katkısı
  icon: string; // istemci ikon çizici anahtarı
}

/** Sınıf başına isim havuzu; nadirlik ad ön ekini ve gücü belirler. */
const WEAPON_NAMES: Record<ClassId, string> = { guardian: 'Kılıç', hunter: 'Yay', arcanist: 'Asa' };
const ARMOR_NAMES: Record<ClassId, string> = { guardian: 'Plaka Zırh', hunter: 'Deri Yelek', arcanist: 'Cübbe' };
const HELM_NAMES: Record<ClassId, string> = { guardian: 'Tolga', hunter: 'Başlık', arcanist: 'Taç' };

export const ITEM_TEMPLATES: ItemTemplate[] = [];
for (const cls of ['guardian', 'hunter', 'arcanist'] as ClassId[]) {
  ITEM_TEMPLATES.push({ id: `w_${cls}`, name: WEAPON_NAMES[cls], slot: 'weapon', cls, basePower: 12, icon: cls === 'guardian' ? 'sword' : cls === 'hunter' ? 'bow' : 'staff' });
  ITEM_TEMPLATES.push({ id: `a_${cls}`, name: ARMOR_NAMES[cls], slot: 'armor', cls, basePower: 10, icon: `armor_${cls}` });
  ITEM_TEMPLATES.push({ id: `h_${cls}`, name: HELM_NAMES[cls], slot: 'helmet', cls, basePower: 6, icon: `helm_${cls}` });
}
ITEM_TEMPLATES.push({ id: 'boots', name: 'Çizme', slot: 'boots', basePower: 5, icon: 'boots' });
ITEM_TEMPLATES.push({ id: 'necklace', name: 'Kolye', slot: 'necklace', basePower: 5, icon: 'necklace' });
ITEM_TEMPLATES.push({ id: 'earring', name: 'Küpe', slot: 'earring', basePower: 4, icon: 'earring' });
ITEM_TEMPLATES.push({ id: 'bracelet', name: 'Bilezik', slot: 'bracelet', basePower: 4, icon: 'bracelet' });
export const ITEM_TPL = new Map(ITEM_TEMPLATES.map((t) => [t.id, t] as const));

export type EnchantType =
  | 'forest_power' | 'frost_power' | 'fire_dmg' | 'ice_dmg' | 'sword_def' | 'arrow_def' | 'magic_def'
  | 'pvp_power' | 'pvp_resist' | 'crit' | 'atk_speed' | 'skill_speed' | 'lifesteal' | 'block' | 'hp';
export const ENCHANTS: Record<EnchantType, { name: string; unit: '%' | ''; slots: Slot[]; tiers: [number, number, number, number] }> = {
  forest_power: { name: 'Orman Canavarlarına Güç', unit: '%', slots: ['weapon', 'necklace', 'earring'], tiers: [3, 5, 8, 12] },
  frost_power: { name: 'Buz Canavarlarına Güç', unit: '%', slots: ['weapon', 'necklace', 'earring'], tiers: [3, 5, 8, 12] },
  fire_dmg: { name: 'Ateş Hasarı', unit: '%', slots: ['weapon'], tiers: [2, 4, 6, 9] },
  ice_dmg: { name: 'Buz Hasarı', unit: '%', slots: ['weapon'], tiers: [2, 4, 6, 9] },
  sword_def: { name: 'Kılıca Karşı Savunma', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [3, 5, 8, 12] },
  arrow_def: { name: 'Oka Karşı Savunma', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [3, 5, 8, 12] },
  magic_def: { name: 'Büyüye Karşı Savunma', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [3, 5, 8, 12] },
  pvp_power: { name: 'PvP Güç', unit: '%', slots: ['weapon', 'bracelet', 'earring'], tiers: [1, 2, 3, 5] },
  pvp_resist: { name: 'PvP Direnç', unit: '%', slots: ['armor', 'necklace', 'bracelet'], tiers: [1, 2, 3, 5] },
  crit: { name: 'Kritik Vuruş', unit: '%', slots: ['weapon', 'helmet', 'earring'], tiers: [2, 3, 5, 8] },
  atk_speed: { name: 'Saldırı Hızı', unit: '%', slots: ['weapon', 'boots', 'bracelet'], tiers: [2, 4, 6, 9] },
  skill_speed: { name: 'Yetenek Hızı', unit: '%', slots: ['weapon', 'helmet', 'necklace'], tiers: [2, 4, 6, 9] },
  lifesteal: { name: 'Can Çalma', unit: '%', slots: ['weapon', 'necklace'], tiers: [1, 2, 3, 4] },
  block: { name: 'Blok', unit: '%', slots: ['armor', 'bracelet'], tiers: [2, 3, 5, 7] },
  hp: { name: 'Maks. Can', unit: '', slots: ['armor', 'helmet', 'boots', 'necklace', 'earring', 'bracelet'], tiers: [80, 160, 280, 450] },
};
export const ENCHANT_TIER_WEIGHTS = [55, 28, 13, 4];

export interface Enchant { t: EnchantType; v: number; tier: number }
export interface ItemInstance {
  id: string;
  tpl: string;
  rarity: Rarity;
  plus: number;
  ench: Enchant[];
  locked?: boolean;
  evo?: number; // silah evrim kademesi
  kills?: number; // silahla av sayacı
  src?: string; // edinim kaynağı
}

/** Artı basma: silah gücü ve diğer savunma ekleri (referans). */
export const PLUS_WEAPON = [0, 3, 8, 15, 25, 40];
export const PLUS_ARMOR = [0, 2, 6, 11, 18, 28];

export function itemDisplayName(it: ItemInstance): string {
  const t = ITEM_TPL.get(it.tpl);
  const r = RARITY[it.rarity];
  const base = t ? t.name : it.tpl;
  const prefix = it.rarity === 'white' ? '' : r.name + ' ';
  return `${prefix}${base}${it.plus ? ' +' + it.plus : ''}`;
}
export function itemPower(it: ItemInstance): number {
  const t = ITEM_TPL.get(it.tpl);
  if (!t) return 0;
  const base = Math.round(t.basePower * RARITY[it.rarity].power);
  const plus = t.slot === 'weapon' ? PLUS_WEAPON[it.plus] ?? 0 : PLUS_ARMOR[it.plus] ?? 0;
  return base + plus;
}

export interface MaterialDef { id: string; name: string; icon: string; color: string; sellable: boolean; desc: string }
export const MATERIALS: MaterialDef[] = [
  { id: 'red_potion', name: 'Kırmızı İksir', icon: 'potion_red', color: '#ff4d5a', sellable: false, desc: 'Maks. canın %20\'sini yeniler.' },
  { id: 'kor_seal', name: 'Kor Mührü', icon: 'seal', color: '#ff8a3d', sellable: false, desc: 'Artı basmada kullanılır. Canavar öldürünce düşer.' },
  { id: 'strong_branch', name: 'Güçlü Dal', icon: 'branch', color: '#9c6b3c', sellable: false, desc: 'Artı basma malzemesi.' },
  { id: 'strong_crystal', name: 'Güçlü Kristal', icon: 'crystal', color: '#7fd6ff', sellable: false, desc: 'Artı basma malzemesi.' },
  { id: 'desert_herb', name: 'Çöl Bitkisi', icon: 'herb', color: '#c9b458', sellable: false, desc: 'Artı basma malzemesi.' },
  { id: 'master_scroll', name: 'Usta Parşömeni', icon: 'scroll', color: '#e8d6a8', sellable: false, desc: 'Artı basma malzemesi.' },
  { id: 'old_iron', name: 'Eskimiş Demir', icon: 'iron', color: '#8d939a', sellable: false, desc: 'Artı basma malzemesi.' },
  { id: 'white_pearl', name: 'Beyaz İnci', icon: 'pearl_white', color: '#f4f1ff', sellable: false, desc: 'Evrim ve üretimde kullanılır.' },
  { id: 'red_pearl', name: 'Kırmızı İnci', icon: 'pearl_red', color: '#ff6b7a', sellable: false, desc: 'Külkanat Krateri girişinde kullanılır.' },
  { id: 'evo_scroll', name: 'Evrim Parşömeni', icon: 'scroll_evo', color: '#b78bff', sellable: false, desc: 'Silah evriminde kullanılır.' },
  { id: 'stone_dust', name: 'Taş Tozu', icon: 'dust', color: '#c8c2b8', sellable: false, desc: 'Taş sanatında kullanılır.' },
  { id: 'mastery_seal', name: 'Ustalık Mührü', icon: 'seal_gold', color: '#ffd84a', sellable: false, desc: 'Artı basma başarı şansını göreli %30 artırır.' },
  { id: 'starter_chest', name: 'Başlangıç Sandığı', icon: 'chest', color: '#e0a650', sellable: false, desc: 'Bir defalık hediye: 50 Mücevher ve 10 Kırmızı İksir.' },
  { id: 'talisman_stone', name: 'Tılsım Taşı', icon: 'talisman', color: '#5ce0b0', sellable: false, desc: '20 tanesi Tılsımın Gücü olur.' },
];
export const MATERIAL = new Map(MATERIALS.map((m) => [m.id, m] as const));
