import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, COMBAT_LOCK_MS } from '@col/shared';

it('Can yenilenmesi: saldırı altındayken olmaz; saldırı bitince (6 sn sonra) başlar', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const realNow = Date.now; let t = realNow(); Date.now = () => t;
  try {
    const l = getLayout('black');
    const ch = { id: 1, accountId: 1, role: 'player', name: 'P', cls: 'guardian', level: 40, xp: 0, hp: 500, map: 'black', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, ch); const p = w.bySid.get(1)!;
    const m = p.zone.monsterList.find((x) => x.def.id === 'k_ash_knight' && x.variant >= 1)!;
    p.x = m.x - 70; p.y = m.y; p.zone.players.move(p);
    p.stats.maxHp = 200000; p.hp = 150000; (p as any).recompute = () => {};
    let prev = p.hp, inc = 0, hits = 0;
    for (let i = 0; i < 600; i++) { t += 50; w.tick(); if (p.hp > prev) inc++; if (p.hp < prev) hits++; prev = p.hp; }
    expect(hits).toBeGreaterThan(10); // gerçekten saldırı altındaydı
    expect(inc).toBe(0); // bu sürede can hiç artmadı
    // canavar uzaklaşınca (saldırı biter) can yenilenmeye başlar
    m.hp = 0; m.state = 3 as any; (m as any).target = null;
    for (const q of p.zone.monsterList) { q.state = 3 as any; (q as any).target = null; }
    const h0 = p.hp; t += COMBAT_LOCK_MS + 500;
    for (let i = 0; i < 40; i++) { t += 50; w.tick(); }
    expect(p.hp).toBeGreaterThan(h0);
  } finally { Date.now = realNow; }
});
