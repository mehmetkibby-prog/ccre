import { it, expect } from 'vitest';
import { CLASS_IDS, classSkill, skillOrder, TUNING } from '@col/shared';

it('beceri çubuğu: 1 düz vuruş, 2-6 açılma seviyesine göre sıralı; yönetimden değişen seviye sırayı değiştirir', () => {
  for (const c of CLASS_IDS) {
    const o = skillOrder(c, null);
    expect(o[0]).toBe(0);
    expect([...o].sort()).toEqual([0, 1, 2, 3, 4, 5]);
    const lv = o.map((i) => (i === 3 ? TUNING.specLevel : classSkill(c, i)!.unlock));
    for (let k = 1; k < lv.length; k++) expect(lv[k]).toBeGreaterThanOrEqual(lv[k - 1]);
  }
  expect(skillOrder('guardian', null)).toEqual([0, 5, 1, 4, 2, 3]); // Sv.1, 5, 7, 30, uzmanlık
  const saved = TUNING.skillUnlock;
  try {
    TUNING.skillUnlock = { ...saved, g_quake: 3 };
    expect(skillOrder('guardian', null)).toEqual([0, 5, 4, 1, 2, 3]);
  } finally { TUNING.skillUnlock = saved; }
});
