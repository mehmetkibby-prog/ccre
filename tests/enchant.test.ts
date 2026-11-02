import { describe, it, expect, beforeEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { ENCHANTS, ITEM_TEMPLATES, MONSTERS, getLayout } from '@col/shared';
import { Monster } from '../packages/server/src/worker/entities.ts';

let w: World;
beforeEach(() => { w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} }); });
function char(id: number, map: string, over: Partial<CharState> = {}): CharState {
  const l = getLayout(map);
  return { id, accountId: id, role: 'player', name: 'E' + id, cls: 'guardian', level: 30, xp: 0, hp: 5000, map, x: l.spawn.x, y: l.spawn.y,
    gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over };
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const W = () => w as any;
const avg = (n: number, f: () => number) => { let s = 0; for (let i = 0; i < n; i++) s += f(); return s / n; };
function monster(zoneId: string, id: string, level = 20) {
  const z = w.zones.get(zoneId)!;
  const m = new Monster(MONSTERS.find((d) => d.id === id)!, { monster: id, level, variant: 0, x: 0, y: 0 });
  m.zone = z; m.hp = m.maxHp = 1e12; return m;
}

describe('efsunlar', () => {
  it('canavardan düşen eşyada 1–4 efsun, eskisi (Orman Gücü) düşmez, aynı efsun iki kez gelmez', () => {
    const counts = [0, 0, 0, 0, 0];
    for (let i = 0; i < 2000; i++) {
      const tpl = ITEM_TEMPLATES[i % ITEM_TEMPLATES.length];
      const it = makeItem(tpl.id, (['white', 'blue', 'orange', 'crimson'] as const)[i % 4], 'drop');
      counts[it.ench.length]++;
      expect(it.ench.some((e) => ENCHANTS[e.t].legacy)).toBe(false);
      expect(new Set(it.ench.map((e) => e.t)).size).toBe(it.ench.length);
      for (const e of it.ench) expect(ENCHANTS[e.t].tiers).toContain(e.v);
    }
    expect(counts[0]).toBe(0);
    for (const k of [1, 2, 3, 4]) expect(counts[k]).toBeGreaterThan(50);
  });

  it('Ateş canavara hasarı artırır; Donmuş Çam canavarına 1,5 kat, Buz yarı işler', () => {
    w.join(1, char(1, 'forest')); const p = w.bySid.get(1)!;
    const hitAvg = (zone: string, mon: string, ench: Record<string, number>) => {
      p.stats.enchants = ench as never; p.stats.crit = 0;
      p.zone = w.zones.get(zone)!; // oyuncu ve canavar aynı haritada
      const m = monster(zone, mon);
      return avg(3000, () => { const h = m.hp; W().hit(p, m, 1); return h - m.hp; });
    };
    const base = hitAvg('forest', 'shadow_wolf', {});
    expect(hitAvg('forest', 'shadow_wolf', { fire_dmg: 10 }) / base).toBeGreaterThan(1.08);
    const fb = hitAvg('frozen', 'frost_lynx', {});
    const fire = hitAvg('frozen', 'frost_lynx', { fire_dmg: 10 }) / fb, ice = hitAvg('frozen', 'frost_lynx', { ice_dmg: 10 }) / fb;
    expect(fire).toBeGreaterThan(ice + 0.06); // 1,15 kata karşı 1,05 kat civarı
    expect(hitAvg('frozen', 'frost_lynx', { frost_power: 10 }) / fb).toBeGreaterThan(1.08);
    expect(hitAvg('forest', 'shadow_wolf', { frost_power: 10 }) / base).toBeLessThan(1.03); // Donmuş Çam Gücü ormanda işlemez
  });

  it('Kılıç Savunması yakın dövüşen canavara, Büyü Savunması büyücü canavara işler', () => {
    w.join(1, char(1, 'forest')); const p = w.bySid.get(1)!;
    p.stats.block = 0; p.stats.def = 0;
    const taken = (mon: string, ench: Record<string, number>) => {
      p.stats.enchants = ench as never;
      const m = monster('forest', mon);
      return avg(3000, () => { p.hp = 1e9; p.dead = false; W().monsterHitPlayer(m, p, 1); return 1e9 - p.hp; });
    };
    const wolf = taken('shadow_wolf', {}), eater = taken('essence_eater', {});
    expect(taken('shadow_wolf', { sword_def: 12 }) / wolf).toBeLessThan(0.92);
    expect(taken('shadow_wolf', { magic_def: 12 }) / wolf).toBeGreaterThan(0.97);
    expect(taken('essence_eater', { magic_def: 12 }) / eater).toBeLessThan(0.92);
  });

  it('oyuncular arasında Ok Savunması Avcıya işler, Can Çalma oyuncuya karşı da can verir', () => {
    w.join(1, char(1, 'black', { cls: 'hunter' })); w.join(2, char(2, 'black'));
    const a = w.bySid.get(1)!, d = w.bySid.get(2)!;
    a.stats.crit = 0; d.stats.block = 0;
    const dealt = (ench: Record<string, number>) => { d.stats.enchants = ench as never; return avg(2000, () => { d.hp = 1e9; d.dead = false; W().hit(a, d, 1); return 1e9 - d.hp; }); };
    const base = dealt({});
    expect(dealt({ arrow_def: 12 }) / base).toBeLessThan(0.92);
    expect(dealt({ sword_def: 12 }) / base).toBeGreaterThan(0.97);
    a.stats.lifesteal = 5; a.hp = 10; d.hp = 1e9; d.stats.enchants = {} as never;
    W().hit(a, d, 1);
    expect(a.hp).toBeGreaterThan(10);
  });
});
