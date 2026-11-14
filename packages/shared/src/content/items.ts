import { TUNING } from '../tuning.ts';
import { isUpgradable, plusBonus } from './upgrade.ts';
import type { ClassId } from './classes.ts';

export type Slot = 'weapon' | 'armor' | 'helmet' | 'boots' | 'necklace' | 'earring' | 'bracelet';
export const SLOTS: Slot[] = ['weapon', 'armor', 'helmet', 'boots', 'necklace', 'earring', 'bracelet'];
export const SLOT_NAMES: Record<Slot, string> = {
  weapon: 'Silah', armor: 'Zırh', helmet: 'Miğfer', boots: 'Ayakkabı', necklace: 'Kolye', earring: 'Küpe', bracelet: 'Bilezik',
};

export type Rarity = 'white' | 'blue' | 'orange' | 'crimson' | 'unique' | 'infinite' | 'purple' | 'emerald';
export const RARITIES: Rarity[] = ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'];
/** power: zırh ve takıların çarpanı (savunma/can); weaponPower: silah çarpanı (saldırı). */
export interface RarityDef { id: Rarity; name: string; color: string; minLevel: number; power: number; weaponPower: number }
/** Güç çarpanları renk sırasından otomatik türemez; her nadirlik kendi değeriyle tanımlı. */
export const RARITY: Record<Rarity, RarityDef> = {
  white: { id: 'white', name: 'Sıradan', color: '#e8e6df', minLevel: 1, power: 1, weaponPower: 1 },
  blue: { id: 'blue', name: 'Mavi', color: '#5fa8ff', minLevel: 7, power: 1.5, weaponPower: 1.8 },
  orange: { id: 'orange', name: 'Turuncu', color: '#ffa53d', minLevel: 20, power: 2.6, weaponPower: 3.1 },
  crimson: { id: 'crimson', name: 'Kızıl', color: '#ff4d5a', minLevel: 30, power: 3.9, weaponPower: 5.4 },
  unique: { id: 'unique', name: 'Eşsiz', color: '#ffd84a', minLevel: 50, power: 5.4, weaponPower: 7.2 },
  infinite: { id: 'infinite', name: 'Sonsuz', color: '#7cf3ff', minLevel: 50, power: 6.4, weaponPower: 8.6 },
  purple: { id: 'purple', name: 'Mor Kök', color: '#c58bff', minLevel: 60, power: 6.0, weaponPower: 8.0 },
  emerald: { id: 'emerald', name: 'Kadim Zümrüt', color: '#3ef09a', minLevel: 65, power: 7.2, weaponPower: 9.8 },
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
/**
 * Efsunlar (Efsun Rehberi): dört kademe değeri. `legacy` olanlar artık düşmez; eski eşyalarda çalışmaya devam eder.
 * Hepsi savaşta uygulanır: bkz. formulas.ts (computeStats, enchantAttackMult, enchantDefenseMult) ve world.ts hit/monsterHitPlayer.
 */
export const ENCHANTS: Record<EnchantType, { name: string; unit: '%' | ''; slots: Slot[]; tiers: [number, number, number, number]; desc: string; group: 'atk' | 'def'; legacy?: boolean }> = {
  frost_power: { name: 'Donmuş Çam Gücü', unit: '%', slots: ['weapon', 'necklace', 'earring'], tiers: [2, 4, 8, 10], group: 'atk', desc: 'Donmuş Çam Geçidi canavarlarına verilen hasar artar.' },
  fire_dmg: { name: 'Ateş', unit: '%', slots: ['weapon', 'earring'], tiers: [2, 4, 8, 10], group: 'atk', desc: 'Bütün saldırılara ateş hasarı ekler. Donmuş Çam canavarlarına 1,5 kat etkili.' },
  ice_dmg: { name: 'Buz', unit: '%', slots: ['weapon', 'bracelet'], tiers: [2, 4, 8, 10], group: 'atk', desc: 'Bütün saldırılara buz hasarı ekler. Donmuş Çam canavarları buza dayanıklıdır (yarısı işler).' },
  pvp_power: { name: 'Oyunculara Karşı Güç', unit: '%', slots: ['weapon', 'bracelet', 'earring'], tiers: [3, 6, 12, 15], group: 'atk', desc: 'Oyunculara verilen hasar artar.' },
  crit: { name: 'Kritik Şansı', unit: '%', slots: ['weapon', 'helmet', 'earring'], tiers: [2, 4, 7, 10], group: 'atk', desc: 'Kritik vuruş olasılığı artar.' },
  atk_speed: { name: 'Saldırı Hızı', unit: '%', slots: ['weapon', 'boots', 'bracelet'], tiers: [2, 4, 8, 10], group: 'atk', desc: 'Temel saldırı bekleme süresi kısalır (toplamda en çok %40).' },
  skill_speed: { name: 'Büyü Hızı', unit: '%', slots: ['weapon', 'helmet', 'necklace'], tiers: [3, 7, 10, 15], group: 'atk', desc: 'Becerilerin bekleme süresi kısalır (toplamda en çok %40).' },
  sword_def: { name: 'Kılıç Savunması', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [2, 5, 9, 12], group: 'def', desc: 'Yakın dövüş hasarı azalır: Muhafız ve yakın dövüşen canavarlar.' },
  arrow_def: { name: 'Ok Savunması', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [2, 5, 9, 12], group: 'def', desc: 'Avcı oklarından gelen hasar azalır.' },
  magic_def: { name: 'Büyü Savunması', unit: '%', slots: ['armor', 'helmet', 'boots'], tiers: [2, 5, 9, 12], group: 'def', desc: 'Büyü hasarı azalır: Arkanist ile Öz Yutan ve Tipi Kâhini.' },
  pvp_resist: { name: 'Oyunculara Karşı Savunma', unit: '%', slots: ['armor', 'necklace', 'bracelet'], tiers: [3, 6, 12, 15], group: 'def', desc: 'Oyunculardan gelen hasar azalır.' },
  block: { name: 'Saldırı Bloklama', unit: '%', slots: ['armor', 'bracelet'], tiers: [2, 4, 8, 10], group: 'def', desc: 'Gelen saldırıyı tamamen engelleme olasılığı.' },
  lifesteal: { name: 'Can Çalma', unit: '%', slots: ['weapon', 'necklace'], tiers: [1, 2, 3, 5], group: 'def', desc: 'Verilen hasarın bu kadarı can olarak geri gelir (canavar ve oyuncu).' },
  hp: { name: 'Azami Can', unit: '', slots: ['armor', 'helmet', 'boots', 'necklace', 'earring', 'bracelet'], tiers: [300, 600, 1000, 1500], group: 'def', desc: 'Azami cana sabit artış.' },
  forest_power: { name: 'Orman Canavarlarına Güç', unit: '%', slots: ['weapon', 'necklace', 'earring'], tiers: [3, 5, 8, 12], group: 'atk', legacy: true, desc: 'Kuzey Ormanı canavarlarına verilen hasar artar (eski efsun).' },
};
/** Canavardan düşen eşyada efsun sayısı (1–4) ağırlıkları; nadirlik yükseldikçe çok efsun olasılığı artar. */
export const ENCHANT_COUNT_WEIGHTS: Record<string, [number, number, number, number]> = {
  white: [55, 28, 13, 4], blue: [40, 32, 19, 9], orange: [26, 33, 27, 14], default: [12, 26, 34, 28],
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

/** Eski sistemden artısı kalmış takı/çizme/kask için sabit ek (artık yalnız silah ve zırha basılır). */
export const PLUS_LEGACY = [0, 2, 6, 11, 18, 28, 40];

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
  // silah saldırıyı, diğerleri savunma/canı belirler; yönetim panelinden nadirlik başına değiştirilebilir
  const r = RARITY[it.rarity], ov = TUNING.rarityPower[it.rarity];
  const mult = t.slot === 'weapon' ? ov?.weapon ?? r.weaponPower : ov?.armor ?? r.power;
  const base = Math.round(t.basePower * mult);
  const plus = isUpgradable(t.slot) ? plusBonus(t.slot, it.plus, base) : PLUS_LEGACY[Math.min(it.plus, 6)] ?? 0;
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
  { id: 'fishing_rod', name: 'Olta', icon: 'rod', color: '#c8a46a', sellable: false, desc: 'Şelale Gölü\'nde balık tutmak için. Suya yakın dur, Olta At\'a bas.' },
  { id: 'fish_sokan', name: 'Sokan', icon: 'fish_sokan', color: '#8fb8c8', sellable: false, desc: 'Gölün en yaygın balığı. Balıkçı Hasan alır.' },
  { id: 'fish_zargana', name: 'Zargana', icon: 'fish_zargana', color: '#7fd6c8', sellable: false, desc: 'Uzun gagalı, çevik balık. Balıkçı Hasan alır.' },
  { id: 'fish_levrek', name: 'Levrek', icon: 'fish_levrek', color: '#b8c8d8', sellable: false, desc: 'Değerli, güçlü balık. Balıkçı Hasan alır.' },
  { id: 'talisman_stone', name: 'Tılsım Taşı', icon: 'talisman', color: '#5ce0b0', sellable: false, desc: '20 tanesi Tılsımın Gücü olur.' },
];
export const MATERIAL = new Map(MATERIALS.map((m) => [m.id, m] as const));

/** Eşyanın ikon adı: silahlarda nadirliğe özel görsel (mavi/turuncu/kızıl; daha üstü kızıl görselini kullanır). */
export function itemIconName(it: { tpl: string; rarity: Rarity }): string {
  const t = ITEM_TPL.get(it.tpl);
  if (!t) return 'bag';
  if ((t.slot === 'weapon' || t.slot === 'armor') && t.cls && it.rarity !== 'white') {
    const r = it.rarity === 'blue' || it.rarity === 'orange' ? it.rarity : 'crimson';
    return t.slot === 'weapon' ? `w_${t.cls}_${r}` : `armor_${t.cls}_${r}`;
  }
  return t.icon;
}
