import { describe, it, expect, afterEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, itemPower, transformConf } from '@col/shared';

afterEach(() => applyTuning(DEFAULT_TUNING));
const world = () => { const out: string[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m: any) => { if (m.type === 'out') for (const [, d] of m.batch) if (typeof d === 'string') out.push(d); } }); return { w, out }; };
let rq = 0;
const cmd = (w: World, c: Record<string, unknown>) => w.onCmd(1, JSON.stringify({ req: 't' + ++rq, ...c }));
const nearSmith = (over: Partial<CharState>): CharState => {
  const l = getLayout('bazaar'); const h = l.npcs.find((n) => n.id === 'haso')!;
  return { id: 1, accountId: 1, role: 'player', name: 'Dövücü', cls: 'guardian', level: 40, xp: 0, hp: 900, map: 'bazaar', x: h.x + 40, y: h.y + 40,
    gems: 100000, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
    bag: [], equip: {}, materials: { old_iron: 99, master_scroll: 99, kor_seal: 99, desert_herb: 99, strong_crystal: 99 }, misc: {}, saveVersion: 1, ...over } as CharState;
};

describe('Dönüşüm (Haso)', () => {
  it('Kızıl silah Eşsiz olur; efsun, artı ve evrim korunur; bedel düşer; güç artar', () => {
    const sw = makeItem('w_guardian', 'crimson', 't'); sw.plus = 3; sw.evo = 1;
    const ench = JSON.stringify(sw.ench);
    const { w } = world(); w.join(1, nearSmith({ bag: [sw] })); const p = w.bySid.get(1)!;
    const before = itemPower(sw);
    cmd(w, { t: 'transform', item: sw.id });
    expect(sw.rarity).toBe('unique');
    expect(JSON.stringify(sw.ench)).toBe(ench); expect(sw.plus).toBe(3); expect(sw.evo).toBe(1);
    expect(p.char.gems).toBe(100000 - transformConf().cost.weapon.gems);
    expect(itemPower(sw)).toBeGreaterThan(before);
  });
  it('Kızıl olmayan ya da zaten Eşsiz eşya dönüşmez; ayardan kaynak nadirlik ve kapatma çalışır', () => {
    const blue = makeItem('w_guardian', 'blue', 't');
    const { w } = world(); w.join(1, nearSmith({ bag: [blue] })); const p = w.bySid.get(1)!;
    cmd(w, { t: 'transform', item: blue.id });
    expect(blue.rarity).toBe('blue'); expect(p.char.gems).toBe(100000);
    applyTuning({ ...DEFAULT_TUNING, transform: { from: ['blue'] } });
    cmd(w, { t: 'transform', item: blue.id });
    expect(blue.rarity).toBe('unique');
    cmd(w, { t: 'transform', item: blue.id }); // zaten eşsiz
    expect(p.char.gems).toBe(100000 - transformConf().cost.weapon.gems);
    applyTuning({ ...DEFAULT_TUNING, transform: { enabled: false } });
    const red = makeItem('a_guardian', 'crimson', 't'); p.char.bag.push(red);
    cmd(w, { t: 'transform', item: red.id });
    expect(red.rarity).toBe('crimson');
  });
  it('şans %0 iken bedel gider ama eşya bozulmaz', () => {
    applyTuning({ ...DEFAULT_TUNING, transform: { cost: { other: { gems: 10, mats: {}, chance: 0, minPlus: 0, minLevel: 1 } } } });
    const ring = makeItem('necklace', 'crimson', 't');
    const ench = JSON.stringify(ring.ench);
    const { w } = world(); w.join(1, nearSmith({ bag: [ring] })); const p = w.bySid.get(1)!;
    cmd(w, { t: 'transform', item: ring.id });
    expect(ring.rarity).toBe('crimson'); expect(JSON.stringify(ring.ench)).toBe(ench); expect(p.char.gems).toBe(100000 - 10);
  });
});
