import { it, expect } from 'vitest';
import { World, applyGive } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, xpToNext, RANKS, MATERIAL, runeKey } from '@col/shared';

const mk = (level: number) => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const posts: any[] = [], sent: any[] = [];
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => posts.push(m) });
  (w as any).sendJson = (_p: any, o: any) => sent.push(o);
  const l = getLayout('bazaar');
  const ch = { id: 81, accountId: 1, role: 'player', name: 'Rutbeli', cls: 'guardian', level, xp: 0, hp: 9999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 64, res: 64, vit: 64 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
  w.join(1, ch);
  (w as any).now = Date.now();
  return { w, p: w.bySid.get(1)!, sent, ch };
};

it('Rütbe: 65. seviyeye ulaşan doğrudan Öz Avcısı olur; sonraki tecrübe rütbeyi yükseltir, saldırı/can yüzdesi eklenir', () => {
  const { w, p, ch, sent } = mk(64);
  const atk0 = p.stats.atk, hp0 = p.stats.maxHp;
  w.addXp(p, xpToNext(64) + 1000);
  expect(ch.level).toBe(65);
  expect(ch.misc.rank).toEqual({ r: 1, xp: 1000 });
  expect(p.stats.atk).toBeGreaterThan(atk0); // seviye + %1
  // rütbe 2 eşiği
  w.addXp(p, RANKS[1].xp);
  expect(ch.misc.rank.r).toBe(2);
  expect(sent.some((o) => o.t === 'rank_up' && o.r === 2)).toBe(true);
  // görünüm: diğer oyunculara rütbe gider
  const sp = (w as any).spawnOf ? (w as any).spawnOf(p) : null;
  if (sp) expect(sp.rank).toBe(2);
  expect(p.stats.maxHp).toBeGreaterThan(hp0);
});

it('Rütbe: 65 olan eski karakter girişte Öz Avcısı olur; yönetim rütbe verebilir/kaldırabilir', () => {
  const { w, p, ch } = mk(65);
  expect(ch.misc.rank?.r).toBe(1);
  const atk1 = p.stats.atk;
  expect(w.adminGive(ch.id, { kind: 'rank', r: 10 })).toBe(true);
  expect(ch.misc.rank.r).toBe(10);
  expect(p.stats.atk).toBeGreaterThan(atk1);
  w.adminGive(ch.id, { kind: 'rank', r: 0 });
  expect(ch.misc.rank).toBeUndefined();
});

it('Rünler: 5 parça → Sv.1; garantili yükseltme (3, 4… parça); savaş dışında takılır, yüzde eklenir; Sv.50 altı kapalı', () => {
  const low = mk(49);
  low.ch.materials.rune_frag_kudret = 5;
  low.w.onCmd(1, JSON.stringify({ t: 'rune', op: 'craft', k: 'kudret' }));
  expect(low.ch.materials.rune_frag_kudret).toBe(5);

  const { w, p, ch } = mk(50);
  ch.materials.rune_frag_kudret = 5 + 3 + 4;
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'craft', k: 'kudret' }));
  expect(ch.materials[runeKey('kudret', 1)]).toBe(1);
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'up', key: runeKey('kudret', 1) }));
  expect(ch.materials[runeKey('kudret', 1)]).toBeUndefined();
  expect(ch.materials[runeKey('kudret', 2)]).toBe(1);
  expect(ch.materials.rune_frag_kudret).toBe(4);
  const atk0 = p.stats.atk;
  // savaşta takılamaz
  p.combatUntil = (w as any).now + 5000;
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'equip', key: runeKey('kudret', 2) }));
  expect(ch.misc.runes?.eq?.kudret).toBeUndefined();
  p.combatUntil = 0;
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'equip', key: runeKey('kudret', 2) }));
  expect(ch.misc.runes.eq.kudret).toBe(2);
  expect(ch.materials[runeKey('kudret', 2)]).toBeUndefined();
  expect(p.stats.atk).toBeGreaterThanOrEqual(atk0);
  expect(p.stats.atk).toBe(Math.round(atk0 / 1 * 1.004) || p.stats.atk);
  // takılı rünü yükselt: 2→3 = 4 parça
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'up', k: 'kudret' }));
  expect(ch.misc.runes.eq.kudret).toBe(3);
  expect(ch.materials.rune_frag_kudret).toBeUndefined();
  // çıkar: çantaya Sv.3 yığını
  w.onCmd(1, JSON.stringify({ t: 'rune', op: 'unequip', k: 'kudret' }));
  expect(ch.misc.runes.eq.kudret).toBeUndefined();
  expect(ch.materials[runeKey('kudret', 3)]).toBe(1);
});

it('Rünler: seviye yığınları malzeme sözlüğünde (pazarda seviyesiyle satılır); yönetim rün verir', () => {
  expect(MATERIAL.get(runeKey('yasam', 10))?.name).toContain('Sv.10');
  expect(MATERIAL.has('rune_frag_siper')).toBe(true);
  const c: any = { materials: {}, misc: {}, level: 70 };
  applyGive(c, { kind: 'rune', k: 'siper', lv: 7 });
  expect(c.materials[runeKey('siper', 7)]).toBe(1);
});
