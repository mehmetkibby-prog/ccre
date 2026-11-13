import { describe, it, expect } from 'vitest';
import { World, makeItem, resetCharState } from '../packages/server/src/worker/world.ts';
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
