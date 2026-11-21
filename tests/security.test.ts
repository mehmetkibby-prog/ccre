import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING } from '@col/shared';

const mk = (role = 'player', sid = 1, id = 71, name = 'Deneme') => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const posts: any[] = [], sent: any[] = [];
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => posts.push(m) });
  (w as any).sendJson = (_p: any, o: any) => sent.push(o);
  const l = getLayout('bazaar');
  const ch = { id, accountId: id, role, name, cls: 'guardian', level: 30, xp: 0, hp: 999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 100, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
  w.join(sid, ch);
  return { w, p: w.bySid.get(sid)!, posts, sent, ch };
};

it('Hile koruması: bozuk yuva adıyla çıkarma kanalı çökertmez, çantaya hayalet eşya eklemez', () => {
  const { w, ch } = mk();
  for (const slot of ['__proto__', 'constructor', 'toString', 'hasOwnProperty', 'x'.repeat(40), 42, null])
    expect(() => w.onCmd(1, JSON.stringify({ t: 'unequip', slot }))).not.toThrow();
  expect(ch.bag.length).toBe(0);
  expect(() => (w as any).tick?.()).not.toThrow();
});

it('Hile koruması: GM rolü gm_set ile oyuncu değeri değiştiremez', () => {
  const { w, ch } = mk('gm');
  w.onCmd(1, JSON.stringify({ t: 'gm_set', name: 'Deneme', gems: 999999 }));
  expect(ch.gems).toBe(100);
});

it('Hile koruması: arenadan ışınlanarak çıkılınca arena kaydı kapanır', () => {
  const { w, p, posts } = mk();
  (w as any).arenaActive = true;
  const az = (w as any).zones.get('arena'), bz = (w as any).zones.get('bazaar');
  (w as any).moveToZone(p, az, az.layout.spawn.x, az.layout.spawn.y);
  posts.length = 0;
  (w as any).moveToZone(p, bz, bz.layout.spawn.x, bz.layout.spawn.y);
  expect(posts.some((m) => m.type === 'arena_left' && m.charId === p.char.id)).toBe(true);
});

it('Hile koruması: aynı malzemeyi isteyen iki hedefli görev, toplam yetmezse teslim edilemez', () => {
  const { w, p, ch } = mk();
  const q = { id: 'tq', name: 'T', giver: 'x', turnin: 'x', objs: [{ kind: 'collect', key: 'wood', n: 5 }, { kind: 'collect', key: 'wood', n: 5 }], reward: { items: [] } };
  ch.materials.wood = 6;
  expect((w as any).questReady(p, q)).toBe(false);
  ch.materials.wood = 10;
  expect((w as any).questReady(p, q)).toBe(true);
});
