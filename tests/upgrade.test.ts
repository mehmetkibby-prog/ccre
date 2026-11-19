import { describe, it, expect, beforeEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState, FromWorker } from '../packages/server/src/types.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, itemPower, MAX_PLUS, upgradeStep, plusPct, DEFAULT_UPGRADE, evoPct } from '@col/shared';

function char(over: Partial<CharState> = {}): CharState {
  const l = getLayout('bazaar');
  return {
    id: 1, accountId: 1, role: 'player', name: 'Test', cls: 'guardian', level: 30, xp: 0, hp: 500, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
    gems: 100000, essence: 100, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
    bag: [], equip: {}, materials: { strong_branch: 99, kor_seal: 99, strong_crystal: 99, desert_herb: 99, master_scroll: 99, old_iron: 99 }, misc: {}, saveVersion: 1, ...over,
  };
}
let w: World;
const out: FromWorker[] = [];
beforeEach(() => { applyTuning(structuredClone(DEFAULT_TUNING)); out.length = 0; w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) }); });
const nearSmith = (sid: number) => { const p = w.bySid.get(sid)!; const n = p.zone.layout.npcs.find((x) => x.id === 'haso')!; p.x = n.x + 20; p.y = n.y + 20; p.combatUntil = 0; return p; };

describe('Demirci / artı basma', () => {
  it('yalnız silah ve zırha basılır', () => {
    const boots = makeItem('boots', 'white', 't', 0);
    w.join(1, char({ bag: [boots] }));
    const p = nearSmith(1); const g = p.char.gems;
    w.onCmd(1, JSON.stringify({ t: 'upgrade', item: boots.id, expectPlus: 0, mastery: false, req: 'a' }));
    expect(boots.plus).toBe(0); expect(p.char.gems).toBe(g);
  });

  it('en çok +6; ayarlanan malzeme ve Mücevher düşülür; her artı toplam saldırıyı yönetimdeki yüzde kadar artırır', () => {
    applyTuning({ ...structuredClone(DEFAULT_TUNING), upgrade: { total: true, steps: Array.from({ length: 6 }, (_, i) => ({ chance: 100, gems: 10 * (i + 1), mats: { strong_branch: 2 }, weapon: 10 * (i + 1), armor: 5 })) } });
    const sw = makeItem('w_guardian', 'white', 't', 0);
    w.join(1, char({ equip: { weapon: sw } }));
    const p = nearSmith(1);
    const g0 = p.char.gems, b0 = p.char.materials.strong_branch;
    const base = p.stats.atk;
    for (let i = 0; i < 8; i++) {
      w.onCmd(1, JSON.stringify({ t: 'upgrade', item: sw.id, expectPlus: sw.plus, mastery: false, req: 'u' + i }));
      p.recompute(true);
      if (i < 6) expect(p.stats.atk).toBe(Math.round(base * (1 + (10 * (i + 1)) / 100)));
    }
    expect(sw.plus).toBe(MAX_PLUS);
    expect(itemPower(sw)).toBe(itemPower({ ...sw, plus: 0 })); // eşyanın kendi gücü değişmez, yüzde toplamdan
    expect(g0 - p.char.gems).toBe(10 + 20 + 30 + 40 + 50 + 60);
    expect(b0 - p.char.materials.strong_branch).toBe(12);
  });

  it('eski kayıtlı tablo (yüzde eşya gücüne göreydi): şans/bedel korunur, yüzde yeni varsayılandan', () => {
    applyTuning({ ...structuredClone(DEFAULT_TUNING), upgrade: { steps: Array.from({ length: 6 }, () => ({ chance: 100, gems: 7, mats: {}, weapon: 78, armor: 58 })) } });
    expect(upgradeStep(6)!.weapon).toBe(DEFAULT_UPGRADE[5].weapon);
    expect(upgradeStep(6)!.gems).toBe(7);
    expect(plusPct('armor', 3)).toBe(DEFAULT_UPGRADE[2].armor);
    expect(plusPct('boots', 3)).toBe(0);
  });

  it('artı ve evrim toplanır (zırh: toplam savunma)', () => {
    const ar = { ...makeItem('a_guardian', 'white', 't', 0), plus: 4, evo: 1 };
    w.join(1, char({ equip: { armor: { ...ar, plus: 0, evo: 0 } } }));
    const p = w.bySid.get(1)!; p.recompute(true);
    const d0 = p.stats.def;
    p.char.equip.armor = ar; p.recompute(true);
    const pct = DEFAULT_UPGRADE[3].armor + evoPct(DEFAULT_TUNING, 'armor', 1);
    expect(p.stats.def).toBe(Math.round(d0 * (1 + pct / 100)));
  });

  it('malzeme eksikse hiçbir şey harcanmaz', () => {
    const ar = makeItem('a_guardian', 'blue', 't', 0);
    w.join(1, char({ bag: [ar], materials: { strong_branch: 1, kor_seal: 5 } }));
    const p = nearSmith(1); const g = p.char.gems;
    w.onCmd(1, JSON.stringify({ t: 'upgrade', item: ar.id, expectPlus: 0, mastery: false, req: 'x' }));
    expect(ar.plus).toBe(0); expect(p.char.gems).toBe(g); expect(p.char.materials.kor_seal).toBe(5);
  });

  it('başarısızlıkta düşme panelden kapatılabilir', () => {
    applyTuning({ ...structuredClone(DEFAULT_TUNING), upgrade: { failDown: false, steps: Array.from({ length: 6 }, () => ({ chance: 0, gems: 1, mats: {}, weapon: 10, armor: 10 })) } });
    const sw = { ...makeItem('w_guardian', 'white', 't', 0), plus: 3 };
    w.join(1, char({ bag: [sw] }));
    nearSmith(1);
    w.onCmd(1, JSON.stringify({ t: 'upgrade', item: sw.id, expectPlus: 3, mastery: false, req: 'f' }));
    expect(sw.plus).toBe(3);
  });
});
