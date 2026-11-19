import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, GARDEN_PLANTS, TILE } from '@col/shared';

const setup = () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  const l = getLayout('bazaar');
  const npc = l.npcs.find((n) => n.id === 'reyhan')!;
  w.join(1, { id: 1, accountId: 1, role: 'player', name: 'P1', cls: 'hunter', level: 10, xp: 0, hp: 9999, map: 'bazaar', x: npc.x, y: npc.y + 40, gems: 5000, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any);
  const p = w.bySid.get(1)!;
  const sent: any[] = []; (w as any).sendJson = (_q: any, o: any) => sent.push(o);
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  return { w, p, sent, cmd, l };
};

it('Şifa Bahçesi: harita, orak, eğilip toplama, yeniden büyüme', () => {
  const { w, p, sent, cmd, l } = setup();
  // bitkilerin yeri yürünebilir, bahçe çitle çevrili
  for (const pl of GARDEN_PLANTS) expect(l.blocked[Math.floor(pl.y / TILE) * l.w + Math.floor(pl.x / TILE)]).toBe(0);
  const pl = GARDEN_PLANTS[5];
  p.x = pl.x; p.y = pl.y + 40;
  cmd({ t: 'garden', op: 'start', i: pl.i });
  expect(p.gather).toBeNull(); // orak yok
  p.x = l.npcs.find((n) => n.id === 'reyhan')!.x; p.y = l.npcs.find((n) => n.id === 'reyhan')!.y + 40;
  cmd({ t: 'garden', op: 'buy', req: 'b1' });
  expect(p.char.materials.sickle).toBe(1); expect(p.char.gems).toBe(5000 - DEFAULT_TUNING.garden.sicklePrice);
  p.x = pl.x; p.y = pl.y + 40;
  cmd({ t: 'garden', op: 'start', i: pl.i });
  expect(p.gather?.i).toBe(pl.i);
  // süre dolmadan bitirmek olmaz
  cmd({ t: 'garden', op: 'done', i: pl.i });
  expect(p.char.materials[pl.herb] ?? 0).toBe(0);
  cmd({ t: 'garden', op: 'start', i: pl.i });
  (w as any).now += DEFAULT_TUNING.garden.gatherMs;
  cmd({ t: 'garden', op: 'done', i: pl.i });
  expect(p.char.materials[pl.herb]).toBeGreaterThanOrEqual(1);
  expect(sent.find((m) => m.t === 'gather' && m.op === 'done')?.key).toBe(pl.herb);
  // aynı bitki hemen yeniden toplanamaz; süre geçince olur
  const had = p.char.materials[pl.herb];
  cmd({ t: 'garden', op: 'start', i: pl.i });
  expect(p.gather).toBeNull();
  (w as any).now += DEFAULT_TUNING.garden.regrowSec * 1000 + 1;
  cmd({ t: 'garden', op: 'start', i: pl.i }); (w as any).now += DEFAULT_TUNING.garden.gatherMs; cmd({ t: 'garden', op: 'done', i: pl.i });
  expect(p.char.materials[pl.herb]).toBeGreaterThan(had);
});

it('Şifa Bahçesi: iksir kaynatma ve etkisi (saldırı hızı, can, kritik, canavar hasarı)', () => {
  const { p, cmd, l } = setup();
  const npc = l.npcs.find((n) => n.id === 'reyhan')!; p.x = npc.x; p.y = npc.y + 40;
  p.char.materials.herb_wind = 3; p.char.materials.herb_life = 6;
  const gems = p.char.gems;
  // Kor Mührü ve balık da istenir: eksikken kaynamaz
  cmd({ t: 'garden', op: 'brew', r: 0, n: 1, req: 'k0' });
  expect(p.char.materials.potion_swift ?? 0).toBe(0);
  p.char.materials.kor_seal = 3; p.char.materials.fish_zargana = 1; p.char.materials.fish_sokan = 4;
  cmd({ t: 'garden', op: 'brew', r: 0, n: 1, req: 'k1' });
  expect(p.char.materials.potion_swift).toBe(1); expect(p.char.materials.herb_wind ?? 0).toBe(0); expect(p.char.gems).toBe(gems - DEFAULT_TUNING.garden.recipes[0].gems);
  expect(p.char.materials.kor_seal).toBe(2); expect(p.char.materials.fish_zargana ?? 0).toBe(0);
  cmd({ t: 'garden', op: 'brew', r: 0, n: 1, req: 'k2' });
  expect(p.char.materials.potion_swift).toBe(1); // ot yetmiyor
  cmd({ t: 'garden', op: 'brew', r: 2, n: 2, req: 'k3' });
  expect(p.char.materials.potion_life).toBe(2);
  const as0 = p.stats.atkSpeed, hp0 = p.stats.maxHp;
  cmd({ t: 'use', key: 'potion_swift', req: 'u1' });
  cmd({ t: 'use', key: 'potion_life', req: 'u2' });
  expect(p.stats.atkSpeed).toBe(as0 + DEFAULT_TUNING.garden.effects.potion_swift.value);
  expect(p.stats.maxHp).toBe(Math.round(hp0 * (1 + DEFAULT_TUNING.garden.effects.potion_life.value / 100)));
  expect(p.char.materials.potion_swift ?? 0).toBe(0);
});

it('Şifa Bahçesi: 4 sıra × 10 bitki, yeniden doğma saniye ile ayarlanır', () => {
  const { w, p, cmd, l } = setup();
  expect(GARDEN_PLANTS.length).toBe(40);
  for (const row of [0, 1, 2, 3]) expect(GARDEN_PLANTS.filter((q) => q.row === row).length).toBe(10);
  for (const pl of GARDEN_PLANTS) expect(l.blocked[Math.floor(pl.y / TILE) * l.w + Math.floor(pl.x / TILE)]).toBe(0);
  const t = structuredClone(DEFAULT_TUNING); t.garden.regrowSec = 7; applyTuning(t);
  p.char.materials.sickle = 1;
  const pl = GARDEN_PLANTS[39]; p.x = pl.x; p.y = pl.y + 40;
  cmd({ t: 'garden', op: 'start', i: pl.i }); (w as any).now += t.garden.gatherMs; cmd({ t: 'garden', op: 'done', i: pl.i });
  const had = p.char.materials[pl.herb];
  expect(had).toBeGreaterThanOrEqual(1);
  (w as any).now += 6000; cmd({ t: 'garden', op: 'start', i: pl.i }); expect(p.gather).toBeNull();
  (w as any).now += 1100; cmd({ t: 'garden', op: 'start', i: pl.i }); expect(p.gather?.i).toBe(pl.i);
  applyTuning(structuredClone(DEFAULT_TUNING));
});
