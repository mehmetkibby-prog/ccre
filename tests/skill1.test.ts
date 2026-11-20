import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, classSkill, CLASSES, skillUpgradeBudget, skillPointsUsed, CAST_FIRST, CAST_CHAIN_HOP, Ev } from '@col/shared';

const mk = (id: number, cls: string, level: number) => {
  const l = getLayout('forest');
  return { id, accountId: id, role: 'player', name: 'P' + id, cls, level, xp: 0, hp: 99999, map: 'forest', x: l.spawn.x, y: l.spawn.y, gems: 99999, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
};
/** Oyuncunun önüne n canavar dizer (canları bol, zırhsız); yayılım: komşular arası mesafe */
const setup = (cls: string, level = 1, n = 3, gap = 60) => {
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, mk(1, cls, level)); const p = w.bySid.get(1)!;
  const sent: any[] = [];
  (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  (w as any).addXp = () => {};
  const evs: any[] = [];
  const z = p.zone, emit0 = z.emit.bind(z);
  z.emit = (x: number, y: number, ev: any) => { evs.push(ev); return emit0(x, y, ev); };
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  // bölgedeki diğer canavarlar uzağa: yalnız dizdiklerimiz sayılsın
  for (const m of p.zone.monsterList) { m.x = p.x + 4000; m.y = p.y + 4000; p.zone.monsters.move(m); }
  const mons = p.zone.monsterList.slice(0, n);
  mons.forEach((m: any, i: number) => { m.x = p.x + 100 + i * gap; m.y = p.y; m.maxHp = m.hp = 1e7; m.armor = 0; m.stunUntil = 0; p.zone.monsters.move(m); });
  return { w, p, cmd, sent, mons, evs };
};

it('Sv. 1 becerisi: her sınıfta tanımlı, düz vuruştan güçlü, Sv. 5 becerisinden zayıf, kısa bekleme', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  for (const c of ['guardian', 'hunter', 'arcanist'] as const) {
    const sk = classSkill(c, 5)!;
    expect(sk.unlock).toBe(1);
    expect(sk.mult).toBeGreaterThan(classSkill(c, 0)!.mult);
    expect(sk.mult).toBeLessThan(CLASSES[c].skills[1].mult);
    expect(sk.cooldownMs).toBeGreaterThanOrEqual(7000); expect(sk.cooldownMs).toBeLessThanOrEqual(10000);
  }
  // Öz Zinciri toplam hasarı (3 hedef) Sv. 5 Öz Halkası'nın 3 hedefteki toplamından az olmalı
  const ch = classSkill('arcanist', 5)!, nova = classSkill('arcanist', 1)!;
  expect(ch.mult * (1 + ch.chain!.n * ch.chain!.mul)).toBeLessThan(nova.mult * 3);
});

it('Kalkan Darbesi: 1. seviyede atılır, ana hedefi sersemletir, çevreye yalnız hasar sıçrar', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const g = setup('guardian', 1, 3, 40);
  const [a, b] = g.mons;
  g.cmd({ t: 'skill', s: 5, id: a.id, x: a.x, y: a.y });
  expect(a.hp).toBeLessThan(1e7);
  expect(a.stunUntil - g.w.now).toBe(700);
  expect(b.hp).toBeLessThan(1e7); // sıçrayan hasar
  expect(b.stunUntil).toBeLessThanOrEqual(g.w.now); // ama sersemletme yok
  expect(g.evs.find((e) => e.e === Ev.CAST)?.skill).toBe(CAST_FIRST);
  expect(g.sent.find((m) => m.t === 'cd' && m.s === 5)?.until).toBe(8000);
  // bekleme sürerken ikinci kez atılmaz
  const hp1 = a.hp; g.cmd({ t: 'skill', s: 5, id: a.id, x: a.x, y: a.y }); expect(a.hp).toBe(hp1);
});

it('Geri Sıçrayış: ok hasarı ve hedefin tersine ~140 birim geri sıçrar', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const h = setup('hunter', 1, 1);
  const m = h.mons[0];
  const x0 = h.p.x, y0 = h.p.y, d0 = Math.hypot(m.x - x0, m.y - y0);
  h.cmd({ t: 'skill', s: 5, id: m.id, x: m.x, y: m.y });
  expect(m.hp).toBeLessThan(1e7);
  const moved = Math.hypot(h.p.x - x0, h.p.y - y0), d1 = Math.hypot(m.x - h.p.x, m.y - h.p.y);
  expect(moved).toBeGreaterThan(100); expect(moved).toBeLessThan(180);
  expect(d1).toBeGreaterThan(d0 + 100); // hedeften uzaklaştı
});

it('Öz Zinciri: ana hedef + 2 sıçrayış (her biri ayrı olay), sıçrayış hasarı daha az, menzil dışına sıçramaz', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const a = setup('arcanist', 1, 4, 120);
  const [m0, m1, m2, m3] = a.mons;
  m3.x = m0.x + 2000; a.p.zone.monsters.move(m3); // çok uzak: zincir ulaşmaz
  a.cmd({ t: 'skill', s: 5, id: m0.id, x: m0.x, y: m0.y });
  const d = (m: any) => 1e7 - m.hp;
  expect(d(m0)).toBeGreaterThan(0); expect(d(m1)).toBeGreaterThan(0); expect(d(m2)).toBeGreaterThan(0);
  expect(d(m3)).toBe(0);
  const hops = a.evs.filter((e) => e.e === Ev.CAST && e.skill === CAST_CHAIN_HOP);
  expect(hops.map((e) => e.tgt)).toEqual([m1.id, m2.id]); // en yakından sırayla
  expect(hops[0].x).toBe(m0.x | 0); expect(hops[1].x).toBe(m1.x | 0); // her sıçrayış bir öncekinden
  // ortalamada sıçrayış ana vuruştan zayıf (rastgele kritik payı için çok atış)
  let main = 0, hop = 0;
  for (let i = 0; i < 30; i++) {
    const t = setup('arcanist', 1, 2, 120);
    t.cmd({ t: 'skill', s: 5, id: t.mons[0].id, x: t.mons[0].x, y: t.mons[0].y });
    main += 1e7 - t.mons[0].hp; hop += 1e7 - t.mons[1].hp;
  }
  expect(hop / main).toBeGreaterThan(0.55); expect(hop / main).toBeLessThan(0.95);
});

it('Sv. 1 becerisi geliştirilir; ilk kademesi bütçeden yemez; yuva sınırı dışı istekler reddedilir', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  expect(skillPointsUsed([1, 1, 1, 1, 1, 1])).toBe(3);
  expect(skillPointsUsed([1, 1, 1, 1, 1, 3])).toBe(5);
  expect(skillPointsUsed([1, 1, 1, 1, 1])).toBe(3); // eski kayıtlar (5 yuvalı)
  const g = setup('guardian', 6, 1);
  for (let i = 0; i < 6; i++) g.cmd({ t: 'skillup', s: 5, req: 'r' + i });
  expect(g.p.char.skills[5]).toBe(1 + (skillUpgradeBudget(6) - 3));
  const hp = g.mons[0].hp; g.cmd({ t: 'skill', s: 6, id: g.mons[0].id }); expect(g.mons[0].hp).toBe(hp);
});
