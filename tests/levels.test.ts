import { describe, it, expect, afterEach } from 'vitest';
import { xpToNext, DEFAULT_XP_TABLE, LEVEL_CAP_BASE, applyTuning, sanitizeTuning, DEFAULT_TUNING } from '../packages/shared/src/index.ts';

afterEach(() => applyTuning(DEFAULT_TUNING));

describe('seviye ve TP tablosu', () => {
  it('en fazla seviye 65, varsayılan tablo 64 kademe ve artan', () => {
    expect(LEVEL_CAP_BASE).toBe(65);
    expect(DEFAULT_XP_TABLE.length).toBe(64);
    for (let i = 1; i < 64; i++) expect(DEFAULT_XP_TABLE[i]).toBeGreaterThanOrEqual(DEFAULT_XP_TABLE[i - 1]);
    expect(xpToNext(1)).toBe(DEFAULT_XP_TABLE[0]);
    expect(xpToNext(64)).toBe(DEFAULT_XP_TABLE[63]);
    // ilk 10 seviye hızlı, son 5 seviye çok daha pahalı
    const sum = (a: number, b: number) => DEFAULT_XP_TABLE.slice(a - 1, b - 1).reduce((x, y) => x + y, 0);
    expect(sum(1, 10)).toBeLessThan(3000);
    expect(sum(60, 65)).toBeGreaterThan(800_000);
  });
  it('yönetim tablosu uygulanır; bozuk tablo yok sayılır', () => {
    const t = DEFAULT_XP_TABLE.map((v) => v * 2);
    applyTuning({ xpTable: t });
    expect(xpToNext(10)).toBe(DEFAULT_XP_TABLE[9] * 2);
    expect(sanitizeTuning({ xpTable: [1, 2, 3] }).xpTable).toBeUndefined();
    expect(sanitizeTuning({ xpTable: t.map((v, i) => (i === 5 ? 'x' : v)) }).xpTable).toBeUndefined();
  });
  it('efsunlu düşme oranı doğrulanır', () => {
    const s = sanitizeTuning({ enchants: { chance: { white: 0.4, blue: 7, bad$: 0.2 } } });
    expect(s.enchants.chance).toEqual({ white: 0.4 });
  });
});
