import { describe, it, expect } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { getLayout, MAPS } from '@col/shared';

describe('Tilki Korusu', () => {
  it('Pazar Köyü güneyinde 1. seviye pasif tilkiler var; köy yerleşimi değişmedi', () => {
    const l = getLayout('bazaar');
    const fox = l.spawnPoints.filter((s) => s.monster === 'wild_fox');
    expect(fox.length).toBeGreaterThan(20);
    expect(fox.every((s) => s.level === 1 && s.variant === 0 && s.y > 60 * 64)).toBe(true);
    expect(MAPS.bazaar.market?.tx).toBe(67);
    expect(l.npcs.find((n) => n.id === 'haso')).toMatchObject({ x: 17 * 64 + 32, y: 14 * 64 + 32 });
  });

  it('1. seviye karakter birkaç tilkiyle seviye atlar', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    const l = getLayout('bazaar');
    const ch: CharState = {
      id: 1, accountId: 1, role: 'player', name: 'Acemi', cls: 'hunter', level: 1, xp: 0, hp: 100, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
      gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
      bag: [], equip: { weapon: makeItem('w_hunter', 'white', 't', 0) }, materials: {}, misc: {}, saveVersion: 1,
    };
    w.join(1, ch);
    const p = w.bySid.get(1)!;
    const foxes = p.zone.monsterList.filter((m) => m.def.id === 'wild_fox');
    expect(foxes.length).toBeGreaterThan(20);
    for (let i = 0; i < 7; i++) (w as any).killMonster(foxes[i], p);
    expect(p.char.level).toBeGreaterThanOrEqual(2);
  });
});
