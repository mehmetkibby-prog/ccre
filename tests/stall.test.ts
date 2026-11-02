import { describe, it, expect, beforeEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState, FromWorker } from '../packages/server/src/types.ts';
import { getLayout, MAPS, BAG_EQUIP_CAP, encodeMove, TICK_MS } from '@col/shared';

const mk = MAPS.bazaar.market!;
const MX = mk.tx * 64 + 32, MY = mk.ty * 64 + 32;
function char(id: number, over: Partial<CharState> = {}): CharState {
  return {
    id, accountId: id, role: 'player', name: 'Oyuncu' + id, cls: 'guardian', level: 10, xp: 0, hp: 500, map: 'bazaar', x: MX + id * 200, y: MY,
    gems: 1000, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0,
    bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over,
  };
}
let out: FromWorker[] = [];
let w: World;
const json = (sid: number) => out.flatMap((m) => (m.type === 'out' ? m.batch.filter(([s, d]) => s === sid && typeof d === 'string').map(([, d]) => JSON.parse(d as string)) : []));
beforeEach(() => { out = []; w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) }); });
const cmd = (sid: number, o: unknown) => w.onCmd(sid, JSON.stringify(o));

describe('pazar tezgâhı', () => {
  it('kurulur, satılır: eşya ve Mücevher bir kez aktarılır, iki karakter de kaydedilir', () => {
    const sword = makeItem('w_guardian', 'orange', 't', 0), boots = makeItem('boots', 'blue', 't', 0);
    w.join(1, char(1, { bag: [sword, boots] })); w.join(2, char(2, { gems: 500 }));
    const seller = w.bySid.get(1)!, buyer = w.bySid.get(2)!;
    cmd(1, { t: 'stall_open', title: 'Ucuz kılıç', items: [{ id: sword.id, price: 300 }, { id: boots.id, price: 50 }], req: 'o1' });
    expect(seller.stall?.prices.size).toBe(2);
    w.tick();
    expect(json(2).some((m) => m.t === 'stalls' && m.list.length === 1 && m.list[0].title === 'Ucuz kılıç')).toBe(true);
    out = [];
    const buy = { t: 'stall_buy', owner: seller.id, item: sword.id, price: 300, req: 'b1' };
    cmd(2, buy); cmd(2, buy); cmd(2, { ...buy, req: 'b2' }); // tekrar ve yeni makbuzla ikinci deneme
    expect(buyer.char.bag.map((b) => b.id)).toEqual([sword.id]);
    expect(seller.char.bag.map((b) => b.id)).toEqual([boots.id]);
    expect(buyer.char.gems).toBe(200);
    expect(seller.char.gems).toBe(1300);
    expect(seller.stall?.prices.has(sword.id)).toBe(false);
    const saves = out.filter((m) => m.type === 'save' && (m as { urgent?: boolean }).urgent) as { char: CharState }[];
    expect(saves.some((m) => m.char.id === 1) && saves.some((m) => m.char.id === 2)).toBe(true);
  });

  it('yetersiz Mücevher, yanlış fiyat ve dolu çanta satın almayı reddeder', () => {
    const it1 = makeItem('boots', 'blue', 't', 0);
    w.join(1, char(1, { bag: [it1] })); w.join(2, char(2, { gems: 10 }));
    const seller = w.bySid.get(1)!, buyer = w.bySid.get(2)!;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: it1.id, price: 100 }], req: 'o1' });
    cmd(2, { t: 'stall_buy', owner: seller.id, item: it1.id, price: 100, req: 'a' });
    expect(buyer.char.bag.length).toBe(0);
    buyer.char.gems = 1000;
    cmd(2, { t: 'stall_buy', owner: seller.id, item: it1.id, price: 1, req: 'b' });
    expect(buyer.char.bag.length).toBe(0);
    buyer.char.bag = Array.from({ length: BAG_EQUIP_CAP }, () => makeItem('boots', 'white', 't', 0));
    cmd(2, { t: 'stall_buy', owner: seller.id, item: it1.id, price: 100, req: 'c' });
    expect(seller.char.bag.length).toBe(1);
    expect(seller.char.gems).toBe(1000);
  });

  it('meydan dışında ve kilitli eşyayla kurulmaz; açıkken çanta işlemleri ve yürüme kapalı', () => {
    const locked = { ...makeItem('boots', 'blue', 't', 0), locked: true }, free = makeItem('boots', 'white', 't', 0);
    const l = getLayout('bazaar');
    w.join(1, char(1, { bag: [locked, free], x: l.spawn.x, y: l.spawn.y }));
    const p = w.bySid.get(1)!;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: free.id, price: 5 }], req: 'x1' });
    expect(p.stall).toBeNull();
    p.x = MX; p.y = MY;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: locked.id, price: 5 }], req: 'x2' });
    expect(p.stall).toBeNull();
    cmd(1, { t: 'stall_open', title: '', items: [{ id: free.id, price: 5 }], req: 'x3' });
    expect(p.stall).not.toBeNull();
    cmd(1, { t: 'equip', item: free.id });
    expect(p.char.bag.some((b) => b.id === free.id)).toBe(true);
    const x0 = p.x;
    for (let i = 0; i < 6; i++) { w.onMove(1, encodeMove(i + 1, 0)); w.tick(); }
    expect(p.x).toBe(x0);
    cmd(1, { t: 'stall_close' });
    expect(p.stall).toBeNull();
  });

  it('oyundan çıkınca tezgâh kapanır ve eşya çantada kalır; iki tezgâh üst üste kurulamaz', () => {
    const a = makeItem('boots', 'blue', 't', 0), b = makeItem('boots', 'blue', 't', 0);
    w.join(1, char(1, { bag: [a] })); w.join(2, char(2, { bag: [b] }));
    const p1 = w.bySid.get(1)!, p2 = w.bySid.get(2)!;
    p2.x = p1.x + 40; p2.y = p1.y;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: a.id, price: 5 }], req: 'q1' });
    cmd(2, { t: 'stall_open', title: '', items: [{ id: b.id, price: 5 }], req: 'q2' });
    expect(p2.stall).toBeNull();
    out = [];
    w.leave(1); w.tick();
    const left = out.find((m) => m.type === 'left') as { char: CharState } | undefined;
    expect(left?.char.bag.map((x) => x.id)).toEqual([a.id]);
    expect(json(2).some((m) => m.t === 'stalls' && m.list.length === 0)).toBe(true);
    void TICK_MS;
  });
});
