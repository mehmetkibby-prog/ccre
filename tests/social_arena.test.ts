import { it, expect, describe } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { Arena } from '../packages/server/src/arena.ts';
import { getLayout } from '@col/shared';
import { makeItem } from '../packages/server/src/worker/world.ts';

const mk = (id: number, over: any = {}) => { const l = getLayout('bazaar'); return { id, accountId: id, role: 'player', name: 'P' + id, cls: 'guardian', level: 30, xp: 0, hp: 900, map: 'bazaar', x: l.spawn.x + id * 10, y: l.spawn.y, gems: 1000, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over } as any; };
const world = () => { const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) }); return { w, out }; };
const cmd = (w: World, sid: number, c: any) => w.onCmd(sid, JSON.stringify(c));

describe('Oyuncular arası', () => {
  it('grup: davet + kabul; aynı gruptakiler PvP alanında bile birbirine vuramaz', () => {
    const { w } = world();
    w.join(1, mk(1)); w.join(2, mk(2));
    const a = w.bySid.get(1)!, b = w.bySid.get(2)!;
    cmd(w, 1, { t: 'social', op: 'invite', kind: 'party', target: b.id });
    cmd(w, 2, { t: 'social', op: 'answer', kind: 'party', from: a.char.id, accept: true });
    expect(w.social.sameParty(a, b)).toBe(true);
    // ikisini de Kara Bölge'ye (açık PvP) taşı
    const black = (w as any).zones.get('black');
    (w as any).moveToZone(a, black, black.layout.spawn.x, black.layout.spawn.y);
    (w as any).moveToZone(b, black, black.layout.spawn.x + 20, black.layout.spawn.y);
    expect((w as any).canPvp(a, b)).toBe(false);
    cmd(w, 2, { t: 'party', op: 'leave' });
    expect((w as any).canPvp(a, b)).toBe(true);
  });

  it('ticaret: iki taraf kilitleyip onaylayınca eşya ve mücevher takas olur; teklif değişince kilit düşer', () => {
    const { w } = world();
    const sw = makeItem('w_guardian', 'blue', 't');
    w.join(1, mk(1, { bag: [sw] })); w.join(2, mk(2));
    const a = w.bySid.get(1)!, b = w.bySid.get(2)!;
    cmd(w, 1, { t: 'social', op: 'invite', kind: 'trade', target: b.id });
    cmd(w, 2, { t: 'social', op: 'answer', kind: 'trade', from: a.char.id, accept: true });
    cmd(w, 1, { t: 'trade', op: 'set', items: [sw.id], gems: 0 });
    cmd(w, 2, { t: 'trade', op: 'set', items: [], gems: 300 });
    cmd(w, 1, { t: 'trade', op: 'lock' }); cmd(w, 2, { t: 'trade', op: 'lock' });
    cmd(w, 1, { t: 'trade', op: 'confirm' });
    // B son anda teklifini değiştirirse kilitler düşer, takas olmaz
    cmd(w, 2, { t: 'trade', op: 'set', items: [], gems: 1 });
    cmd(w, 2, { t: 'trade', op: 'confirm' });
    expect(a.char.bag.length).toBe(1);
    cmd(w, 1, { t: 'trade', op: 'lock' }); cmd(w, 2, { t: 'trade', op: 'lock' });
    cmd(w, 1, { t: 'trade', op: 'confirm' }); cmd(w, 2, { t: 'trade', op: 'confirm' });
    expect(a.char.bag.length).toBe(0); expect(b.char.bag[0].id).toBe(sw.id);
    expect(a.char.gems).toBe(1001); expect(b.char.gems).toBe(999);
  });

  it('düello: ölüm yok, can 1 de kalır ve düello biter', () => {
    const { w } = world();
    w.join(1, mk(1)); w.join(2, mk(2));
    const a = w.bySid.get(1)!, b = w.bySid.get(2)!;
    cmd(w, 1, { t: 'social', op: 'invite', kind: 'duel', target: b.id });
    cmd(w, 2, { t: 'social', op: 'answer', kind: 'duel', from: a.char.id, accept: true });
    expect((w as any).canPvp(a, b)).toBe(false); // 3 sn geri sayım
    (w as any).now += 3500;
    expect((w as any).canPvp(a, b)).toBe(true);
    b.hp = 0; (w as any).killPlayer(b, a);
    expect(b.dead).toBe(false); expect(b.hp).toBe(1);
    expect((w as any).canPvp(a, b)).toBe(false); // köyde düello bitti
  });

  it('grup TP paylaşımı: menzildeki üye de TP alır', () => {
    const { w } = world();
    w.join(1, mk(1, { level: 10 })); w.join(2, mk(2, { level: 10 }));
    const a = w.bySid.get(1)!, b = w.bySid.get(2)!;
    cmd(w, 1, { t: 'social', op: 'invite', kind: 'party', target: b.id });
    cmd(w, 2, { t: 'social', op: 'answer', kind: 'party', from: a.char.id, accept: true });
    const forest = (w as any).zones.get('forest');
    (w as any).moveToZone(a, forest, forest.layout.spawn.x, forest.layout.spawn.y);
    (w as any).moveToZone(b, forest, forest.layout.spawn.x + 900, forest.layout.spawn.y);
    const m = forest.monsterList[0]; m.x = a.x + 50; m.y = a.y;
    const bx = b.char.xp;
    (w as any).rewardKill(a, m);
    expect(b.char.xp).toBeGreaterThan(bx);
  });
});

describe('Savaş Arenası hile koruması', () => {
  const host = (sess: Record<number, { accountId: number; ip: string }>) => {
    const given: [number, any][] = [];
    const h = { sessionByChar: (id: number) => sess[id] ? { charId: id, accountId: sess[id].accountId, ip: sess[id].ip, name: 'P' + id, cls: 'guardian', channel: 1 } : undefined, broadcastWorkers: () => {}, broadcastClients: () => {}, give: (id: number, g: any) => given.push([id, g]), audit: () => {} };
    return { h, given };
  };
  it('aynı hesap, aynı IP, aynı rakipten 3+ ve yeni doğanı kesmek puan saymaz; kazanan ödül alır', () => {
    const { h, given } = host({ 1: { accountId: 10, ip: '1.1.1.1' }, 2: { accountId: 20, ip: '2.2.2.2' }, 3: { accountId: 10, ip: '3.3.3.3' }, 4: { accountId: 40, ip: '1.1.1.1' } });
    const A = new Arena(h as any);
    A.start(10, 'test');
    A.kill(1, 3, 30, 30); // aynı hesap
    A.kill(1, 4, 30, 30); // aynı IP
    expect(A.ranking().find((s) => s.charId === 1)?.kills ?? 0).toBe(0);
    const realNow = Date.now; let t = realNow();
    Date.now = () => t;
    try {
      for (let i = 0; i < 6; i++) { t += 10_000; A.kill(1, 2, 30, 30); } // aynı rakip: en çok 3
      expect(A.ranking()[0].kills).toBe(3);
      A.kill(2, 1, 30, 30); A.kill(2, 1, 30, 30); // ikincisi: yeni doğan (8 sn içinde) sayılmaz
      expect(A.ranking().find((s) => s.charId === 2)!.kills).toBe(1);
    } finally { Date.now = realNow; }
    A.stop('test');
    expect(given.some(([id, g]) => id === 1 && g.kind === 'gems')).toBe(true);
  });
  it('aynı IP adresinden arenaya en çok 2 karakter girer', () => {
    const { h } = host({ 1: { accountId: 1, ip: '9.9.9.9' }, 2: { accountId: 2, ip: '9.9.9.9' }, 3: { accountId: 3, ip: '9.9.9.9' } });
    const A = new Arena(h as any);
    A.start(10, 'test');
    expect(A.canJoin(1, 30)).toBeNull(); expect(A.canJoin(2, 30)).toBeNull();
    expect(A.canJoin(3, 30)).toMatch(/en çok 2/);
    expect(A.canJoin(3, 1)).toMatch(/seviye/);
  });
});
