import { it, expect, afterEach } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, trDayKey } from '@col/shared';

afterEach(() => applyTuning(DEFAULT_TUNING));
it('oto atak: günlük süre sunucuda tutulur, bitince açılmaz', () => {
  const out: string[] = [];
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m: any) => { if (m.type === 'out') for (const [, d] of m.batch) if (typeof d === 'string') out.push(d); } });
  const l = getLayout('bazaar');
  const day = trDayKey(Date.now());
  w.join(1, { id: 1, accountId: 1, role: 'player', name: 'Oto', cls: 'guardian', level: 5, xp: 0, hp: 300, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: { autoDay: { day, ms: 119 * 60_000 } }, saveVersion: 1 } as any);
  const p = w.bySid.get(1)!;
  w.onCmd(1, JSON.stringify({ t: 'auto', on: true }));
  expect(p.autoOn).toBe(true);
  // 61 sn geçmiş gibi: hak (120 dk) dolar, kapanır
  // her sayımda en çok 10 sn işlenir (zaman atlatma hilesi olmasın): 7 sayım ≈ 70 sn
  for (let i = 0; i < 7; i++) { p.autoAt = Date.now() - 10_000; (w as any).autoTick(p, Date.now()); }
  expect(p.autoOn).toBe(false);
  w.onCmd(1, JSON.stringify({ t: 'auto', on: true }));
  expect(p.autoOn).toBe(false);
  // dünkü kayıt bugünü etkilemez
  p.char.misc.autoDay = { day: '2000-01-01', ms: 999_999_999 };
  w.onCmd(1, JSON.stringify({ t: 'auto', on: true }));
  expect(p.autoOn).toBe(true);
});
