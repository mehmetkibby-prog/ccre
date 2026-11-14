import { describe, it, expect, afterEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState } from '../packages/server/src/types.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, MONSTERS, charBuffs, mallPrice } from '@col/shared';

afterEach(() => applyTuning(DEFAULT_TUNING));
const mkChar = (over: Partial<CharState> = {}): CharState => {
  const l = getLayout('bazaar');
  return {
    id: 1, accountId: 1, role: 'player', name: 'Avcı', cls: 'hunter', level: 20, xp: 0, hp: 900, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
    gems: 5000, essence: 0, cp: 1000, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
    bag: [makeItem('boots', 'blue', 't', 1)], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over,
  };
};
const world = () => { const out: string[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m: any) => { if (m.type === 'out') for (const [, d] of m.batch) if (typeof d === 'string') out.push(d); } }); return { w, out }; };
let rq = 0;
const cmd = (w: World, c: Record<string, unknown>) => w.onCmd(1, JSON.stringify({ req: 'r' + ++rq, ...c }));

describe('Nesne Market', () => {
  it('ÇP ile satın alır, çantaya ekler; yetersiz ÇP reddedilir', () => {
    const { w } = world(); w.join(1, mkChar()); const p = w.bySid.get(1)!;
    cmd(w, { t: 'mall_buy', id: 'xp_ring', qty: 2 });
    expect(p.char.materials.xp_ring).toBe(2); expect(p.char.cp).toBe(1000 - mallPrice('xp_ring') * 2);
    cmd(w, { t: 'mall_buy', id: 'auto_potion_big', qty: 5 });
    expect(p.char.materials.auto_potion_big).toBeUndefined();
    cmd(w, { t: 'mall_buy', id: 'afk_ticket', qty: 1 }); // yakında: satılmaz
    expect(p.char.materials.afk_ticket).toBeUndefined();
  });
  it('süreli ürün: kullanınca etki başlar, tekrar kullanınca süre uzar; bonus hesaplanır', () => {
    const { w } = world(); w.join(1, mkChar({ materials: { xp_ring: 2, war_ration: 2 } })); const p = w.bySid.get(1)!;
    const atk0 = p.stats.atk;
    cmd(w, { t: 'use', key: 'xp_ring' });
    const t1 = p.char.misc.buffs!.xp_ring; expect(t1).toBeGreaterThan(Date.now() + 4 * 86400_000);
    cmd(w, { t: 'use', key: 'xp_ring' });
    expect(p.char.misc.buffs!.xp_ring - t1).toBeGreaterThan(4 * 86400_000);
    cmd(w, { t: 'use', key: 'war_ration' });
    expect(p.stats.atk).toBeGreaterThan(atk0);
    cmd(w, { t: 'use', key: 'war_ration' }); // etkinken yeniden kullanılamaz
    expect(p.char.materials.war_ration).toBe(1);
    expect(charBuffs(p.char.misc.buffs, Date.now()).xpPct).toBe(25);
  });
  it('efsun artırma ve değiştirme, kupon, oto iksir deposu, uzmanlık sıfırlama', () => {
    const { w } = world();
    const boots = makeItem('boots', 'blue', 't', 1);
    w.join(1, mkChar({ bag: [boots], spec: 'x', materials: { enchant_add: 1, enchant_change: 1, cp_100: 1, auto_potion: 1, spec_reset: 1 } }));
    const p = w.bySid.get(1)!;
    cmd(w, { t: 'use', key: 'enchant_add', item: boots.id });
    expect(boots.ench.length).toBe(2);
    const before = JSON.stringify(boots.ench);
    cmd(w, { t: 'use', key: 'enchant_change', item: boots.id });
    expect(boots.ench.length).toBe(2); expect(p.char.materials.enchant_change).toBeUndefined();
    void before;
    cmd(w, { t: 'use', key: 'cp_100' }); expect(p.char.cp).toBe(1100);
    cmd(w, { t: 'use', key: 'auto_potion' }); expect(p.char.misc.autoPool).toBe(1_000_000);
    cmd(w, { t: 'use', key: 'spec_reset' }); expect(p.char.spec).toBeNull();
  });
});

describe('Balıkçılık', () => {
  it('olta yoksa atılamaz; suya yakın atılır, tutma oyunu oynanmadan biterse sayılmaz, oynanınca balık gelir', () => {
    const { w, out } = world();
    const lake = getLayout('lake');
    // suya komşu bir karo bul
    let pos = { x: 0, y: 0 };
    outer: for (let y = 2; y < lake.h - 2; y++) for (let x = 2; x < lake.w - 2; x++) { const g = lake.ground[y * lake.w + x]; if ((g === 4 || g === 10) && !lake.blocked[y * lake.w + x + 2]) { pos = { x: (x + 2) * 64 + 32, y: y * 64 + 32 }; break outer; } }
    w.join(1, mkChar({ map: 'lake', ...pos }));
    const p = w.bySid.get(1)!; p.x = pos.x; p.y = pos.y;
    cmd(w, { t: 'fish_cast' });
    expect(p.fishing).toBeUndefined();
    p.char.materials.fishing_rod = 1;
    cmd(w, { t: 'fish_cast' });
    expect(p.fishing).toBeDefined();
    const token = p.fishing!.token;
    cmd(w, { t: 'fish_end', token, ok: true }); // vurmadan hemen bitirmek: sayılmaz
    expect(Object.keys(p.char.materials).filter((k) => k.startsWith('fish_') || k.endsWith('_pearl')).length).toBe(0);
    cmd(w, { t: 'fish_cast' });
    p.fishing!.biteAt = Date.now() - 5000; w.now = Date.now();
    cmd(w, { t: 'fish_end', token: p.fishing!.token, ok: true });
    const got = Object.entries(p.char.materials).filter(([k]) => k.startsWith('fish_') || k.endsWith('_pearl'));
    expect(got.length).toBe(1);
    w.tick();
    expect(out.some((s) => s.includes('"fish_result"') && s.includes('"ok":true'))).toBe(true);
  });
});

describe('Bosslar', () => {
  it('Tilki Kral saatte bir doğar (yönetimden değişir) ve durum listesinde görünür', () => {
    const { w } = world();
    const fk = MONSTERS.find((m) => m.id === 'fox_king')!;
    expect(w.respawnDelay(fk)).toBe(60 * 60_000);
    applyTuning({ monsters: { fox_king: { respawnMin: 30 } } });
    expect(w.respawnDelay(fk)).toBe(30 * 60_000);
    const st = w.bossStatus().find((b) => b.id === 'fox_king')!;
    expect(st.map).toBe('bazaar'); expect(st.alive).toBe(true);
  });
  it('boss panelindeki mutlak can değeri yeni doğan bossa uygulanır', () => {
    applyTuning({ monsters: { fox_king: { hp: 12345 } } });
    const { w } = world(); w.join(1, mkChar());
    const fk = w.bySid.get(1)!.zone.monsterList.find((m) => m.def.id === 'fox_king')!;
    expect(fk.maxHp).toBe(12345);
  });
});
