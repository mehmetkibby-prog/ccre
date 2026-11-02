import { describe, it, expect, beforeEach } from 'vitest';
import { World, makeItem } from '../packages/server/src/worker/world.ts';
import type { CharState, FromWorker, MarketState } from '../packages/server/src/types.ts';
import { getLayout, MAPS, BAG_EQUIP_CAP, encodeMove } from '@col/shared';

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
const lastMarket = () => [...out].reverse().find((m) => m.type === 'market') as { state: MarketState; chars: CharState[] } | undefined;
beforeEach(() => { out = []; w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) }); });
const cmd = (sid: number, o: unknown) => w.onCmd(sid, JSON.stringify(o));
const stallId = () => w.market.stalls[0]?.id;

describe('pazar: bağımsız dükkân', () => {
  it('eşyalar çantadan dükkâna geçer; satıcı yürüyebilir ve başka işler yapabilir; aynı kayıtta dükkân ve karakter yazılır', () => {
    const sword = makeItem('w_guardian', 'orange', 't', 0), boots = makeItem('boots', 'blue', 't', 0), keep = makeItem('boots', 'white', 't', 0);
    w.join(1, char(1, { bag: [sword, boots, keep] }));
    const p = w.bySid.get(1)!;
    cmd(1, { t: 'stall_open', title: 'Ucuz kılıç', items: [{ id: sword.id, price: 300 }, { id: boots.id, price: 50 }], req: 'o1' });
    expect(w.market.stalls.length).toBe(1);
    expect(p.char.bag.map((b) => b.id)).toEqual([keep.id]);
    const m = lastMarket()!;
    expect(m.state.stalls[0].items.map((x) => x.item.id).sort()).toEqual([sword.id, boots.id].sort());
    expect(m.chars.find((c) => c.id === 1)!.bag.map((b) => b.id)).toEqual([keep.id]);
    const x0 = p.x;
    for (let i = 0; i < 6; i++) { w.onMove(1, encodeMove(i + 1, 0)); w.tick(); }
    expect(p.x).toBeGreaterThan(x0); // dükkân açıkken yürüyebilir
    cmd(1, { t: 'equip', item: keep.id });
    expect(p.char.equip.boots?.id).toBe(keep.id);
    expect(w.market.stalls[0].x).toBe(Math.round(x0)); // dükkân yerinde kalır
  });

  it('sahibi çevrimiçiyken para hemen; çevrimdışıyken bekleyen kazanca, geri dönünce cüzdana geçer', () => {
    const a = makeItem('boots', 'blue', 't', 0), b = makeItem('boots', 'orange', 't', 0);
    w.join(1, char(1, { bag: [a, b] })); w.join(2, char(2, { gems: 1000 }));
    cmd(1, { t: 'stall_open', title: '', items: [{ id: a.id, price: 100 }, { id: b.id, price: 250 }], req: 'o' });
    const id = stallId();
    const buyer = w.bySid.get(2)!; buyer.x = w.market.stalls[0].x + 50; buyer.y = w.market.stalls[0].y;
    cmd(2, { t: 'stall_buy', stall: id, item: a.id, price: 100, req: 'b1' });
    expect(w.bySid.get(1)!.char.gems).toBe(1100);
    // sahip çıkar; dükkân açık kalır
    w.leave(1);
    expect(w.market.stalls.length).toBe(1);
    cmd(2, { t: 'stall_buy', stall: id, item: b.id, price: 250, req: 'b2' });
    cmd(2, { t: 'stall_buy', stall: id, item: b.id, price: 250, req: 'b2' }); // tekrar
    expect(buyer.char.gems).toBe(1000 - 100 - 250);
    expect(buyer.char.bag.map((x) => x.id).sort()).toEqual([a.id, b.id].sort());
    expect(w.market.pending['1'].gems).toBe(250);
    expect(w.market.stalls.length).toBe(0); // boşalan dükkân kapanır
    // sahip geri döner (kaydedilmiş 1100 Mücevherle): kazanç teslim edilir
    out = [];
    w.join(3, char(1, { gems: 1100 }));
    expect(w.bySid.get(3)!.char.gems).toBe(1350);
    expect(w.market.pending['1']).toBeUndefined();
    w.tick();
    expect(json(3).some((m) => m.t === 'notice' && /Sen yokken/.test(m.text))).toBe(true);
    expect(lastMarket()!.chars.find((c) => c.id === 1)!.gems).toBe(1350);
  });

  it('kayıttan yüklenince dükkânlar ve bekleyen kazanç geri gelir; bozuk kayıt atlanır', () => {
    const a = makeItem('boots', 'blue', 't', 0);
    w.join(1, char(1, { bag: [a] }));
    cmd(1, { t: 'stall_open', title: 'Kalıcı', items: [{ id: a.id, price: 77 }], req: 'o' });
    const saved = structuredClone(lastMarket()!.state);
    saved.pending['5'] = { gems: 40, sales: [] };
    const w2 = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
    w2.loadMarket({ ...saved, stalls: [...saved.stalls, { id: 'x', ownerId: 9, zone: 'forest', items: [] }, null] });
    expect(w2.market.stalls.map((s) => s.title)).toEqual(['Kalıcı']);
    expect(w2.market.stalls[0].items[0].item.id).toBe(a.id);
    expect(w2.market.pending['5'].gems).toBe(40);
  });

  it('kurallar: meydan dışında, kilitli eşyayla ya da ikinci dükkân kurulamaz; yetersiz para / dolu çanta reddedilir; kapatınca eşyalar döner', () => {
    const l = getLayout('bazaar');
    const locked = { ...makeItem('boots', 'blue', 't', 0), locked: true }, a = makeItem('boots', 'white', 't', 0), b = makeItem('boots', 'white', 't', 0);
    w.join(1, char(1, { bag: [locked, a, b], x: l.spawn.x, y: l.spawn.y })); w.join(2, char(2, { gems: 5 }));
    const p = w.bySid.get(1)!;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: a.id, price: 10 }], req: 'x1' });
    expect(w.market.stalls.length).toBe(0);
    p.x = MX; p.y = MY;
    cmd(1, { t: 'stall_open', title: '', items: [{ id: locked.id, price: 10 }], req: 'x2' });
    expect(w.market.stalls.length).toBe(0);
    cmd(1, { t: 'stall_open', title: '', items: [{ id: a.id, price: 10 }], req: 'x3' });
    cmd(1, { t: 'stall_open', title: '', items: [{ id: b.id, price: 10 }], req: 'x4' });
    expect(w.market.stalls.length).toBe(1);
    const buyer = w.bySid.get(2)!; buyer.x = MX + 30; buyer.y = MY;
    cmd(2, { t: 'stall_buy', stall: stallId(), item: a.id, price: 10, req: 'y1' });
    expect(buyer.char.bag.length).toBe(0);
    buyer.char.gems = 100; buyer.char.bag = Array.from({ length: BAG_EQUIP_CAP }, () => makeItem('boots', 'white', 't', 0));
    cmd(2, { t: 'stall_buy', stall: stallId(), item: a.id, price: 10, req: 'y2' });
    expect(w.market.stalls[0].items.length).toBe(1);
    cmd(1, { t: 'stall_close' });
    expect(w.market.stalls.length).toBe(0);
    expect(p.char.bag.some((x) => x.id === a.id)).toBe(true);
  });
});
