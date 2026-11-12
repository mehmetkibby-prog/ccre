import { describe, it, expect, beforeEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState, FromWorker } from '../packages/server/src/types.ts';
import { encodeMove, getLayout, TICK_MS, readSnapshot, Kind } from '@col/shared';
import { Monster } from '../packages/server/src/worker/entities.ts';

function char(over: Partial<CharState> = {}): CharState {
  const l = getLayout('bazaar');
  return {
    id: 1, accountId: 1, role: 'player', name: 'Test', cls: 'guardian', level: 10, xp: 0, hp: 500, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
    gems: 1000, essence: 100, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
    bag: [], equip: { weapon: makeItem('w_guardian', 'white', 't', 0) }, materials: { red_potion: 5 }, misc: {}, saveVersion: 1, ...over,
  };
}
let out: FromWorker[] = [];
let w: World;
const json = () => out.flatMap((m) => (m.type === 'out' ? m.batch.filter(([, d]) => typeof d === 'string').map(([, d]) => JSON.parse(d as string)) : []));
beforeEach(() => { out = []; w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) }); });

describe('dupe/hile korumaları', () => {
  it('aynı satış isteği iki kez gelse tek kez işlenir', () => {
    const it1 = makeItem('boots', 'blue', 't', 0);
    w.join(1, char({ bag: [it1] }));
    const p = w.bySid.get(1)!;
    const npc = p.zone.layout.npcs.find((n) => n.id === 'tuccar')!;
    p.x = npc.x + 30; p.y = npc.y + 30;
    const before = p.char.gems;
    const cmd = JSON.stringify({ t: 'sell', items: [it1.id], req: 'abc' });
    w.onCmd(1, cmd); w.onCmd(1, cmd);
    expect(p.char.bag.length).toBe(0);
    expect(p.char.gems - before).toBe(3); // mavi eşya 3 Mücevher
  });

  it('kilitli eşya satılamaz', () => {
    const it1 = { ...makeItem('boots', 'blue', 't', 0), locked: true };
    w.join(1, char({ bag: [it1] }));
    const p = w.bySid.get(1)!;
    const npc = p.zone.layout.npcs.find((n) => n.id === 'tuccar')!;
    p.x = npc.x + 30; p.y = npc.y + 30;
    w.onCmd(1, JSON.stringify({ t: 'sell', items: [it1.id], req: 'x1' }));
    expect(p.char.bag.length).toBe(1);
  });

  it('NPC uzaktaysa satın alma reddedilir', () => {
    w.join(1, char());
    const p = w.bySid.get(1)!;
    p.x = 200; p.y = 200;
    const g = p.char.gems;
    w.onCmd(1, JSON.stringify({ t: 'buy', shop: 'general', product: 'potion_gems', qty: 5, price: 6, req: 'b1' }));
    expect(p.char.gems).toBe(g);
  });

  it('çantadan ve üzerindeki eşyadan her yerde satılır: beyaz 1, mavi 3, turuncu 5, kızıl 15', () => {
    const items = (['white', 'blue', 'orange', 'crimson'] as const).map((r) => makeItem('boots', r, 't', 0));
    const sword = makeItem('w_guardian', 'crimson', 't', 0);
    w.join(1, char({ bag: items, equip: { weapon: sword }, gems: 0 }));
    const p = w.bySid.get(1)!;
    p.x = 200; p.y = 200; // NPC'den uzak
    w.onCmd(1, JSON.stringify({ t: 'sell', items: [...items.map((i) => i.id), sword.id], req: 's9' }));
    expect(p.char.gems).toBe(1 + 3 + 5 + 15 + 15);
    expect(p.char.bag.length).toBe(0);
    expect(p.char.equip.weapon).toBeUndefined();
  });

  it('görünüm baytı silah ve zırh nadirliğini taşır (parıltı efekti)', () => {
    w.join(1, char({ equip: { weapon: makeItem('w_guardian', 'orange', 't', 0), armor: makeItem('a_guardian', 'crimson', 't', 0) } }));
    const b = w.bySid.get(1)!.weaponRarityIndex();
    expect(b & 15).toBe(2);
    expect(b >> 4).toBe(3);
  });

  it('sahte fiyatla satın alma reddedilir, bedel alınmaz', () => {
    w.join(1, char());
    const p = w.bySid.get(1)!;
    const npc = p.zone.layout.npcs.find((n) => n.id === 'tuccar')!;
    p.x = npc.x + 30; p.y = npc.y + 30;
    w.onCmd(1, JSON.stringify({ t: 'buy', shop: 'general', product: 'potion_gems', qty: 5, price: 1, req: 'b2' }));
    expect(p.char.gems).toBe(1000);
    expect(p.char.materials.red_potion).toBe(5);
    w.onCmd(1, JSON.stringify({ t: 'buy', shop: 'general', product: 'potion_gems', qty: 5, price: 6, req: 'b3' }));
    expect(p.char.gems).toBe(970);
    expect(p.char.materials.red_potion).toBe(10);
  });

  it('canavar iki kez öldürülse ödül bir kez verilir', () => {
    w.join(1, char({ map: 'forest', x: 0, y: 0 }));
    const p = w.bySid.get(1)!;
    const m = p.zone.monsterList[0];
    const xp0 = p.char.xp, k0 = p.char.kills;
    (w as any).killMonster(m, p);
    (w as any).killMonster(m, p);
    expect(p.char.kills - k0).toBe(1);
    expect(p.char.xp).toBeGreaterThan(xp0);
  });

  it('başkasının ganimeti alınamaz; kendi ganimeti bir kez alınır', () => {
    w.join(1, char({ map: 'forest' }));
    w.join(2, char({ id: 2, accountId: 2, name: 'B', map: 'forest' }));
    const a = w.bySid.get(1)!, b = w.bySid.get(2)!;
    const m = a.zone.monsterList[0];
    (w as any).dropLoot(a, m, { kind: 'item', item: makeItem('boots', 'white', 't', 0) });
    const loot = [...a.zone.lootById.values()][0];
    a.x = b.x = loot.x; a.y = b.y = loot.y;
    w.onCmd(2, JSON.stringify({ t: 'pickup', id: loot.id }));
    expect(b.char.bag.length).toBe(0);
    w.onCmd(1, JSON.stringify({ t: 'pickup', id: loot.id }));
    w.onCmd(1, JSON.stringify({ t: 'pickup', id: loot.id }));
    expect(a.char.bag.length).toBe(1);
  });

  it('hız hilesi: saniyede 20 adımdan fazlası işlenmez', () => {
    w.join(1, char({ map: 'forest' }));
    const p = w.bySid.get(1)!;
    const x0 = p.x;
    // 1 saniyede 200 komut gönder (10× hız)
    for (let i = 1; i <= 200; i++) w.onMove(1, encodeMove(i, 0));
    for (let t = 0; t < 20; t++) w.tick();
    const moved = Math.abs(p.x - x0);
    expect(moved).toBeLessThanOrEqual(p.stats.speed * 1.3);
  });

  it('ölüyken saldırı/ışınlanma reddedilir; dirilme can verir', () => {
    w.join(1, char({ map: 'forest' }));
    const p = w.bySid.get(1)!;
    (w as any).killPlayer(p, null);
    expect(p.dead).toBe(true);
    w.onCmd(1, JSON.stringify({ t: 'travel', map: 'bazaar', req: 't1' }));
    expect(p.zone.id).toBe('forest');
    w.onCmd(1, JSON.stringify({ t: 'respawn', where: 'town' }));
    expect(p.dead).toBe(false);
    expect(p.hp).toBe(p.stats.maxHp);
    expect(p.zone.id).toBe('bazaar');
  });

  it('statü: eski revizyon ve bütçe aşımı reddedilir; can bedava dolmaz', () => {
    w.join(1, char({ level: 10, hp: 100 }));
    const p = w.bySid.get(1)!;
    w.onCmd(1, JSON.stringify({ t: 'stats', str: 30, res: 0, vit: 0, rev: 0 }));
    expect(p.char.stats.str).toBe(0); // bütçe 27
    w.onCmd(1, JSON.stringify({ t: 'stats', str: 0, res: 0, vit: 27, rev: 5 }));
    expect(p.char.stats.vit).toBe(0); // eski revizyon
    w.onCmd(1, JSON.stringify({ t: 'stats', str: 0, res: 0, vit: 27, rev: 0 }));
    expect(p.char.stats.vit).toBe(27);
    expect(p.hp).toBe(100);
  });

  it('artı basma: beklenen artı uyuşmazsa malzeme harcanmaz', () => {
    const it1 = makeItem('a_guardian', 'blue', 't', 0);
    w.join(1, char({ bag: [it1], materials: { kor_seal: 5, strong_branch: 10 } }));
    const p = w.bySid.get(1)!;
    const npc = p.zone.layout.npcs.find((n) => n.id === 'haso')!;
    p.x = npc.x + 30; p.y = npc.y + 30; p.combatUntil = 0;
    w.onCmd(1, JSON.stringify({ t: 'upgrade', item: it1.id, expectPlus: 3, mastery: false, req: 'u1' }));
    expect(p.char.materials.kor_seal).toBe(5);
    w.onCmd(1, JSON.stringify({ t: 'upgrade', item: it1.id, expectPlus: 0, mastery: false, req: 'u2' }));
    expect(it1.plus).toBe(1); // +1 %100
    expect(p.char.materials.kor_seal).toBe(4);
    expect(p.char.gems).toBe(900);
  });

  it('Kara Bölge girişi onay ister; seviye şartı uygulanır', () => {
    w.join(1, char({ level: 39 }));
    const p = w.bySid.get(1)!;
    w.onCmd(1, JSON.stringify({ t: 'travel', map: 'black', req: 'a', confirm: true }));
    expect(p.zone.id).toBe('bazaar');
    p.char.level = 40;
    w.onCmd(1, JSON.stringify({ t: 'travel', map: 'black', req: 'b' }));
    expect(p.zone.id).toBe('bazaar');
    w.tick();
    expect(json().some((m) => m.t === 'confirmTravel')).toBe(true);
    w.onCmd(1, JSON.stringify({ t: 'travel', map: 'black', req: 'c', confirm: true }));
    expect(p.zone.id).toBe('black');
  });

  it('snapshot ikili kodlanır ve okunabilir (yakındaki canavarlar)', () => {
    w.join(1, char({ map: 'forest' }));
    const p = w.bySid.get(1)!;
    const m = p.zone.monsterList[0];
    p.x = m.x + 100; p.y = m.y;
    p.zone.players.move(p);
    w.tick();
    const bins = out.flatMap((o) => (o.type === 'out' ? o.batch.filter(([, d]) => typeof d !== 'string').map(([, d]) => d as ArrayBuffer) : []));
    expect(bins.length).toBeGreaterThan(0);
    const s = readSnapshot(bins[bins.length - 1]);
    expect(s.spawns.some((e) => e.kind === Kind.MONSTER && e.id === m.id)).toBe(true);
  });

  it('ayrılışta son durum teslim edilir ve sürüm artar', () => {
    w.join(1, char());
    w.leave(1);
    const left = out.find((o) => o.type === 'left') as Extract<FromWorker, { type: 'left' }>;
    expect(left.char.saveVersion).toBe(2);
    expect(w.bySid.size).toBe(0);
  });
});
void Monster; void TICK_MS;
