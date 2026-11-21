import { it, expect } from 'vitest';
import { computeStats, combatPower, type CharCore } from '@col/shared';

const base: CharCore = { cls: 'guardian', level: 30, stats: { str: 0, res: 0, vit: 0 }, equip: {} };

it('Karakter Gücü: statü, efsun ve rütbe/rün yüzdeleriyle büyür', () => {
  const p0 = combatPower(computeStats(base));
  expect(p0).toBeGreaterThan(0);
  expect(combatPower(computeStats({ ...base, stats: { str: 10, res: 0, vit: 0 } }))).toBeGreaterThan(p0);
  expect(combatPower(computeStats({ ...base, stats: { str: 0, res: 10, vit: 0 } }))).toBeGreaterThan(p0);
  expect(combatPower(computeStats({ ...base, stats: { str: 0, res: 0, vit: 10 } }))).toBeGreaterThan(p0);
  expect(combatPower(computeStats({ ...base, pct: { atk: 5, def: 5, hp: 5 } }))).toBeGreaterThan(p0);
  const s = computeStats(base);
  for (const k of ['crit', 'atkSpeed', 'skillSpeed', 'lifesteal', 'block', 'pvpPower', 'pvpResist', 'pvePower'] as const) {
    expect(combatPower({ ...s, [k]: s[k] + 10 }), k).toBeGreaterThan(p0);
  }
  for (const k of ['forest_power', 'frost_power', 'fire_dmg', 'ice_dmg', 'sword_def', 'arrow_def', 'magic_def'] as const) {
    expect(combatPower({ ...s, enchants: { [k]: 10 } }), k).toBeGreaterThan(p0);
  }
});
