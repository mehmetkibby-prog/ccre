import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING } from '@col/shared';

it('Rehber: tamamlanan adım bitleri birikir, kalıcı alana yazılır, geçersiz bit yok sayılır', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const l = getLayout('bazaar');
  const ch = { id: 1, accountId: 1, role: 'player', name: 'Yeni', cls: 'guardian', level: 1, xp: 0, hp: 500, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, ch); const p = w.bySid.get(1)!;
  const sent: any[] = []; (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  w.onCmd(1, JSON.stringify({ t: 'tut', bits: 1 }));
  w.onCmd(1, JSON.stringify({ t: 'tut', bits: 2 | 1024 }));
  w.onCmd(1, JSON.stringify({ t: 'tut', bits: 'x' }));
  expect(p.char.misc.tutorial).toBe(3);
  (w as any).sendSelf(p, 1);
  expect(sent.find((o) => o.t === 'self')?.tut).toBe(3);
});
