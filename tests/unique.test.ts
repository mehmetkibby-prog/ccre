import { it, expect } from 'vitest';
import { applyTuning, DEFAULT_TUNING, itemPower, computeStats, CLASSES, mallPrice, mallBasePrice, mallDiscount } from '@col/shared';

const item = (tpl: string, rarity: string, plus = 0) => ({ id: 'x' + tpl + rarity, tpl, rarity, plus, ench: [] }) as any;
const core = (equip: Record<string, any>) => ({ cls: 'guardian', level: 40, stats: { str: 0, res: 0, vit: 0 }, equip, buffs: undefined }) as any;

it('Eşsiz dönüşüm: takı 16→30, zırh 39→55, silah 65→85', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  for (const t of ['earring', 'bracelet']) { expect(itemPower(item(t, 'crimson'))).toBe(16); expect(itemPower(item(t, 'unique'))).toBe(30); }
  expect(itemPower(item('necklace', 'unique'))).toBeGreaterThanOrEqual(36);
  expect(itemPower(item('a_guardian', 'crimson'))).toBe(39); expect(itemPower(item('a_guardian', 'unique'))).toBe(55);
  expect(itemPower(item('w_guardian', 'crimson'))).toBe(65); expect(itemPower(item('w_guardian', 'unique'))).toBe(85);
});

it('Eşsiz ekstra bonuslar efsunlardan bağımsız eklenir', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const base = computeStats(core({ earring: item('earring', 'crimson'), bracelet: item('bracelet', 'crimson'), necklace: item('necklace', 'crimson'), armor: item('a_guardian', 'crimson'), weapon: item('w_guardian', 'crimson') }));
  const uq = computeStats(core({ earring: item('earring', 'unique'), bracelet: item('bracelet', 'unique'), necklace: item('necklace', 'unique'), armor: item('a_guardian', 'unique'), weapon: item('w_guardian', 'unique') }));
  expect(uq.atkSpeed - base.atkSpeed).toBe(10);
  expect(uq.crit - base.crit).toBe(10);
  expect(uq.skillSpeed - base.skillSpeed).toBe(10);
  expect(uq.pvpPower - base.pvpPower).toBe(10);
  // can: bilezik +700 ekstra (+ güç artışından gelen takı canı)
  expect(uq.maxHp - base.maxHp).toBeGreaterThanOrEqual(700);
  expect(uq.atk).toBeGreaterThan(base.atk); expect(uq.def).toBeGreaterThan(base.def);
  expect(CLASSES.guardian).toBeTruthy();
});

it('Nesne Market: görsellerdeki fiyatlar ve indirim', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  expect(mallPrice('trade_glass')).toBe(100); expect(mallPrice('cp_500')).toBe(550); expect(mallPrice('item_reflect')).toBe(1);
  expect(mallBasePrice('auto_potion')).toBe(75); expect(mallDiscount('auto_potion')).toBe(10); expect(mallPrice('auto_potion')).toBe(68);
  expect(mallPrice('crimson_wings')).toBe(500); expect(mallPrice('rename')).toBe(50); expect(mallPrice('emerald_gate')).toBe(15);
});
