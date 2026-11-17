import { describe, it, expect } from 'vitest';
import { World, makeItem, resetCharState, fixHelmetHp } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { getLayout } from '@col/shared';

const mkChar = (over: Partial<CharState> = {}): CharState => {
  const l = getLayout('bazaar');
  return {
    id: 1, accountId: 1, role: 'player', name: 'Kalkan', cls: 'guardian', level: 20, xp: 0, hp: 900, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
    gems: 5000, essence: 50, cp: 3, arenaCoin: 0, stats: { str: 10, res: 5, vit: 5 }, skills: [3, 2, 1, 1], spec: null, kills: 99,
    bag: [makeItem('boots', 'blue', 't', 1)], equip: { weapon: { ...makeItem('w_guardian', 'crimson', 't', 0), plus: 5 } }, materials: { red_potion: 40, kor_seal: 9 }, misc: {}, saveVersion: 3, ...over,
  };
};

describe('Muhafız yakın dövüş', () => {
  it('uzaktaki hedefe vuramaz, yakındakine vurur', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, mkChar());
    const p = w.bySid.get(1)!;
    const fox = p.zone.monsterList.find((m) => m.def.id === 'wild_fox')!;
    const hp0 = fox.hp;
    p.x = fox.x - 200; p.y = fox.y; p.zone.players.move(p);
    w.onCmd(1, JSON.stringify({ t: 'attack', id: fox.id }));
    expect(fox.hp).toBe(hp0);
    p.x = fox.x - 70; p.cooldowns[0] = 0;
    w.onCmd(1, JSON.stringify({ t: 'attack', id: fox.id }));
    expect(fox.hp).toBeLessThan(hp0);
  });
});

describe('Yönetim: karakteri sıfırla', () => {
  it('kayıtlı karakter: seviye 1, başlangıç eşyaları, para ve malzeme sıfır', () => {
    const c = mkChar();
    resetCharState(c);
    expect(c.level).toBe(1); expect(c.xp).toBe(0); expect(c.gems).toBe(0); expect(c.kills).toBe(0);
    expect(c.bag.length).toBe(0);
    expect(c.equip.weapon?.rarity).toBe('white'); expect(c.equip.weapon?.plus).toBe(0); expect(c.equip.armor?.tpl).toBe('a_guardian');
    expect(c.materials).toEqual({ red_potion: 5 });
    expect(c.stats).toEqual({ str: 0, res: 0, vit: 0 }); expect(c.saveVersion).toBe(4);
  });
  it('çevrimiçi karakter anında sıfırlanır ve köye döner', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, mkChar({ map: 'forest', x: 0, y: 0 }));
    expect(w.adminResetPlayer(1)).toBe(true);
    const p = w.bySid.get(1)!;
    expect(p.char.level).toBe(1); expect(p.zone.id).toBe('bazaar'); expect(p.hp).toBe(p.stats.maxHp);
  });
});

describe('düz saldırı ağ dalgalanması', () => {
  it('biraz erken gelen saldırı reddedilmez, bekleme bitince uygulanır', () => {
    const realNow = Date.now; let t = realNow();
    Date.now = () => t;
    try {
      const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
      w.join(1, mkChar({ stats: { str: 0, res: 0, vit: 0 } }));
      const p = w.bySid.get(1)!;
      const fox = p.zone.monsterList.find((m) => m.def.id === 'wild_fox')!;
      fox.hp = fox.maxHp = 1e6;
      p.x = fox.x - 60; p.y = fox.y; p.zone.players.move(p);
      w.now = t; w.onCmd(1, JSON.stringify({ t: 'attack', id: fox.id }));
      const hp1 = fox.hp; expect(hp1).toBeLessThan(1e6);
      t += 450; w.now = t; w.onCmd(1, JSON.stringify({ t: 'attack', id: fox.id })); // 200 ms erken
      expect(fox.hp).toBe(hp1);
      t += 200; fox.x = p.x + 60; fox.y = p.y; w.tick();
      expect(fox.hp).toBeLessThan(hp1);
    } finally { Date.now = realNow; }
  });
});

describe('ganimet: sınıf ayrımı yok', () => {
  it('canavardan her sınıfın eşyası düşebilir', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, mkChar({ cls: 'hunter' }));
    const p = w.bySid.get(1)!;
    const seen = new Set<string>();
    for (let i = 0; i < 600; i++) { const it = w.rollEquipment(p, { white: 1 }, false); const c = it ? /_(guardian|hunter|arcanist)$/.exec(it.tpl)?.[1] : null; if (c) seen.add(c); }
    expect([...seen].sort()).toEqual(['arcanist', 'guardian', 'hunter']);
  });
});

describe('kask: can efsunu yok', () => {
  it('yeni kasklara can efsunu gelmez; eski kasktaki aynı kademede başka efsuna döner', () => {
    for (let i = 0; i < 200; i++) expect(makeItem('h_guardian', 'crimson', 'drop', 4).ench.some((e) => e.t === 'hp')).toBe(false);
    const h = makeItem('h_hunter', 'blue', 'drop', 1); h.ench = [{ t: 'hp', v: 1000, tier: 2 }];
    expect(fixHelmetHp(h)).toBe(true);
    expect(h.ench.length).toBe(1); expect(h.ench[0].t).not.toBe('hp'); expect(h.ench[0].tier).toBe(2);
    const a = makeItem('a_hunter', 'blue', 'drop', 1); a.ench = [{ t: 'hp', v: 1000, tier: 2 }];
    expect(fixHelmetHp(a)).toBe(false);
  });
});

describe('ölüyken çıkıp yeniden girme', () => {
  it('ölüm penceresi yeniden gelir ve "burada doğ" çalışır', () => {
    const out: string[] = [];
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m: any) => { if (m.type === 'out') for (const [, d] of m.batch) if (typeof d === 'string') out.push(d); } });
    w.now = Date.now();
    w.join(1, mkChar({ map: 'forest', x: 3000, y: 2000, hp: 0, misc: { deadAt: Date.now() - 60_000 } }));
    const p = w.bySid.get(1)!;
    expect(p.dead).toBe(true);
    w.tick();
    expect(out.some((d) => d.startsWith('{"t":"dead"'))).toBe(true);
    const x0 = p.x, y0 = p.y;
    w.onCmd(1, JSON.stringify({ t: 'respawn', where: 'here' }));
    expect(p.dead).toBe(false); expect(p.hp).toBeGreaterThan(0);
    expect(p.zone.id).toBe('forest'); expect(Math.hypot(p.x - x0, p.y - y0)).toBeLessThan(1);
  });
});

describe('Market: Mücevherle Kırmızı İksir', () => {
  it('1 Mücevher = 1 Kırmızı İksir; yetmezse alınmaz', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, mkChar({ gems: 30, materials: { red_potion: 0 } }));
    const p = w.bySid.get(1)!;
    w.onCmd(1, JSON.stringify({ t: 'essx', op: 'gpotion', n: 25, rate: 1, req: 'a1' }));
    expect(p.char.gems).toBe(5); expect(p.char.materials.red_potion).toBe(25);
    w.onCmd(1, JSON.stringify({ t: 'essx', op: 'gpotion', n: 10, rate: 1, req: 'a2' }));
    expect(p.char.gems).toBe(5); expect(p.char.materials.red_potion).toBe(25);
  });
});

describe('ekipman düşmesi: yazan sıklık tutar', () => {
  it('%33 şans: ortalama her 3 öldürmede 1, uzun şanssız seri yok', () => {
    const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w.join(1, mkChar()); const p = w.bySid.get(1)!;
    let n = 0, gap = 0, maxGap = 0;
    for (let i = 0; i < 300; i++) { if (w.equipRoll(p, 0.33)) { n++; maxGap = Math.max(maxGap, gap); gap = 0; } else gap++; }
    expect(n).toBeGreaterThanOrEqual(92); expect(n).toBeLessThanOrEqual(108);
    expect(maxGap).toBeLessThanOrEqual(4);
    expect(w.equipRoll(p, 0)).toBe(false); expect(w.equipRoll(p, 1)).toBe(true);
  });
});
