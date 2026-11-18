import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, qteZone, QTE_SWEEP_MS, classSkill, CLASSES, skillUpgradeBudget } from '@col/shared';

const mk = (id: number, cls: string, level: number) => {
  const l = getLayout('forest');
  return { id, accountId: id, role: 'player', name: 'P' + id, cls, level, xp: 0, hp: 99999, map: 'forest', x: l.spawn.x, y: l.spawn.y, gems: 99999, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
};
const setup = (cls: string, level = 7) => {
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, mk(1, cls, level)); const p = w.bySid.get(1)!;
  const sent: any[] = [];
  (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  (w as any).addXp = () => {};
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  // yakındaki canavarlar: oyuncunun yanına taşı, canları bol
  const mons = p.zone.monsterList.slice(0, 3);
  mons.forEach((m: any, i: number) => { m.x = p.x + 40 + i * 20; m.y = p.y + 30; m.maxHp = m.hp = 1e7; m.armor = 0; p.zone.monsters.move(m); });
  return { w, p, cmd, sent, mons };
};

it('Sv. 7 becerisi: her sınıfta tanımlı, Sv. 7 öncesi kapalı, alan hasarı ve 3 sn güçlendirme', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  for (const c of ['guardian', 'hunter', 'arcanist'] as const) {
    const sk = classSkill(c, 4)!;
    expect(sk.unlock).toBe(7); expect(sk.qte).toBe(true); expect(sk.buff?.ms).toBe(3000); expect(sk.kind).toBe('aoe');
    // diğer becerilerle orantılı: 2. ve 3. beceri arası güç, uzun bekleme
    expect(sk.mult).toBeGreaterThanOrEqual(1.5); expect(sk.mult).toBeLessThanOrEqual(2.1);
    expect(sk.cooldownMs).toBeGreaterThan(CLASSES[c].skills[1].cooldownMs);
  }
  const low = setup('guardian', 6);
  low.cmd({ t: 'skill', s: 4 });
  expect(low.mons[0].hp).toBe(1e7);
  // Muhafız: kendi çevresine vurur, Demir Deri (hasar azaltma)
  const g = setup('guardian');
  g.cmd({ t: 'skill', s: 4 });
  expect(g.mons.every((m: any) => m.hp < 1e7)).toBe(true);
  expect(g.p.shieldPct).toBe(30); expect(g.p.shieldUntil - g.w.now).toBe(3000);
  expect(g.sent.find((m) => m.t === 'cd' && m.s === 4)?.perfect).toBe(false);
  // Avcı: saldırı ve koşu hızı
  const h = setup('hunter');
  const sp0 = h.p.stats.speed, as0 = h.p.stats.atkSpeed;
  h.cmd({ t: 'skill', s: 4, id: h.mons[0].id, x: h.mons[0].x, y: h.mons[0].y });
  expect(h.p.stats.atkSpeed).toBe(as0 + 30); expect(h.p.stats.speed).toBeCloseTo(sp0 * 1.25);
  h.p.sbuff!.until = 0; h.w.tick();
  expect(h.p.stats.atkSpeed).toBe(as0); expect(h.p.sbuff).toBeNull();
  // Arkanist: can çalma + canavarları merkeze çeker
  const a = setup('arcanist');
  const far = a.mons[2]; const cx = a.mons[0].x, cy = a.mons[0].y; const d0 = Math.hypot(far.x - cx, far.y - cy);
  a.cmd({ t: 'skill', s: 4, id: a.mons[0].id, x: cx, y: cy });
  expect(a.p.stats.lifesteal).toBeGreaterThanOrEqual(25);
  expect(Math.hypot(far.x - cx, far.y - cy)).toBeLessThan(d0);
});

it('Sv. 7 becerisi: zamanlama çubuğu yeşilde 1,5 kat; dışında normal; süre sunucuda ölçülür', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const one = (perfectTry: boolean, offset: 'in' | 'out' | 'none') => {
    const g = setup('guardian');
    const m = g.mons[0];
    const n = g.p.char.misc.qn ?? 0, [z0, z1] = qteZone(n, g.p.char.id);
    if (offset !== 'none') { g.cmd({ t: 'qte', s: 4 }); expect(g.p.qteAt).toBe(g.w.now); g.p.qteAt = g.w.now - QTE_SWEEP_MS * (offset === 'in' ? (z0 + z1) / 2 : Math.max(0, z0 - 0.25)); }
    g.cmd({ t: 'skill', s: 4, qte: perfectTry ? 1 : 0 });
    expect(g.p.char.misc.qn).toBe(n + 1); // bölge her atışta değişir
    return { d: 1e7 - m.hp, perfect: g.sent.find((x) => x.t === 'cd' && x.s === 4)?.perfect };
  };
  const avg = (perfectTry: boolean, offset: 'in' | 'out' | 'none') => {
    let d = 0, perf = 0; for (let i = 0; i < 20; i++) { const r = one(perfectTry, offset); d += r.d; perf += r.perfect ? 1 : 0; }
    return { d: d / 20, perf };
  };
  const normal = avg(false, 'none'), inZone = avg(true, 'in'), outZone = avg(true, 'out'), noStart = avg(true, 'none');
  expect(inZone.perf).toBe(20); expect(outZone.perf).toBe(0); expect(noStart.perf).toBe(0);
  expect(inZone.d / normal.d).toBeGreaterThan(1.38); expect(inZone.d / normal.d).toBeLessThan(1.62);
  expect(outZone.d / normal.d).toBeGreaterThan(0.88); expect(outZone.d / normal.d).toBeLessThan(1.12);
});

it('Sv. 7 becerisi geliştirilir; ilk kademesi bütçeden yemez', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const g = setup('guardian', 7);
  const used0 = 3;
  expect(skillUpgradeBudget(7)).toBe(7);
  for (let i = 0; i < 4; i++) g.cmd({ t: 'skillup', s: 4, req: 'u' + i });
  expect(g.p.char.skills[4]).toBe(1 + Math.min(4, skillUpgradeBudget(7) - used0));
  // seviye arttıkça güçlendirme de artar
  g.p.cooldowns[4] = 0; g.cmd({ t: 'skill', s: 4 });
  expect(g.p.shieldPct).toBe(30 + (g.p.char.skills[4] - 1));
  expect(skillUpgradeBudget(60)).toBe(39);
});
