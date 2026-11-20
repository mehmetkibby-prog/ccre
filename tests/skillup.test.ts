import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, classSkill, skillUpCost, skillDesc, skillMultAt, skillHealPct } from '@col/shared';

const mk = (id: number, cls: string, level: number) => {
  const l = getLayout('forest');
  return { id, accountId: id, role: 'player', name: 'P' + id, cls, level, xp: 0, hp: 99999, map: 'forest', x: l.spawn.x, y: l.spawn.y, gems: 9_999_999, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
};
const setup = (cls: string, level: number) => {
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  const ch = mk(1, cls, level);
  w.join(1, ch); const p = w.bySid.get(1)!;
  const sent: any[] = [];
  (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  (w as any).addXp = () => {};
  for (const m of p.zone.monsterList) { m.x = p.x + 4000; m.y = p.y + 4000; p.zone.monsters.move(m); }
  const m = p.zone.monsterList[0];
  m.x = p.x + 100; m.y = p.y; m.maxHp = m.hp = 1e9; m.armor = 0; p.zone.monsters.move(m);
  // hasar hesabına giden çarpan yakalanır (rastgele kritik/sapmadan bağımsız)
  const mults: number[] = []; const hit0 = (w as any).hit.bind(w);
  (w as any).hit = (a: any, t: any, mult: number, sk: any) => { if (t === m) mults.push(mult); return hit0(a, t, mult, sk); };
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  // yeterli malzeme (yönetimden ayarlı bedel)
  for (let l = 1; l < 10; l++) for (const [k, q] of Object.entries(skillUpCost(l, false).mats)) ch.materials[k] = (ch.materials[k] ?? 0) + q * 3;
  return { w, p, ch, m, cmd, sent, mults };
};
let rq = 0; const req = () => 'r' + (++rq);

it('Beceri geliştirme: kademe artar, bedel düşer, hasar çarpanı her kademede +%4 artar', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const g = setup('guardian', 40);
  const sk = classSkill('guardian', 1)!;
  // 1. kademede at
  g.cmd({ t: 'skill', s: 1, id: g.m.id, x: g.m.x, y: g.m.y });
  expect(g.mults.length).toBeGreaterThan(0);
  const m1 = g.mults[0];
  expect(m1).toBeCloseTo(sk.mult, 5);
  // 4 kez geliştir
  const gems0 = g.ch.gems;
  let spent = 0;
  for (let i = 0; i < 4; i++) { spent += skillUpCost(1 + i, false).gems; g.cmd({ t: 'skillup', s: 1, req: req() }); }
  expect(g.ch.skills[1]).toBe(5);
  expect(gems0 - g.ch.gems).toBe(spent);
  expect(g.sent.filter((o) => o.t === 'notice' && /geliştirildi/.test(o.text)).length).toBe(4);
  // bekleme bitince yeniden at: çarpan 1,16 katı
  g.w.now += 60_000; g.p.cooldowns.fill(0);
  g.mults.length = 0;
  g.cmd({ t: 'skill', s: 1, id: g.m.id, x: g.m.x, y: g.m.y });
  expect(g.mults[0] / m1).toBeCloseTo(1.16, 5);
  expect(g.mults[0]).toBeCloseTo(skillMultAt(sk, 5), 5);
});

it('Geliştirme hakkı yoksa ya da en üst kademedeyse geliştirilmez', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const g = setup('hunter', 1); // 1. seviye: hak yok
  g.cmd({ t: 'skillup', s: 5, req: req() });
  expect(g.ch.skills[5]).toBe(1);
  expect(g.sent.some((o) => o.t === 'notice' && /hakkın yok/.test(o.text))).toBe(true);
  const h = setup('hunter', 60); h.ch.skills[0] = 10;
  h.cmd({ t: 'skillup', s: 0, req: req() });
  expect(h.ch.skills[0]).toBe(10);
});

it('İyileştiren beceri (Çelik İrade) kademeyle daha çok can yeniler', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const heal = (lvl: number) => {
    const g = setup('guardian', 40); g.ch.spec = 'steel'; g.ch.skills[3] = lvl;
    g.p.recompute?.(true);
    g.p.hp = 1;
    g.cmd({ t: 'skill', s: 3 });
    return { got: g.p.hp - 1, max: g.p.stats.maxHp };
  };
  const a = heal(1), b = heal(6);
  const sk = classSkill('guardian', 3, 'steel')!;
  expect(a.got).toBe(Math.round(a.max * sk.healPct! / 100));
  expect(b.got).toBe(Math.round(b.max * skillHealPct(sk, 6) / 100));
  expect(b.got).toBeGreaterThan(a.got);
});

it('Açıklama metni kademeye göre güncellenir', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const bash = classSkill('guardian', 5)!;
  expect(skillDesc(bash, 1)).toBe(bash.desc);
  expect(skillDesc(bash, 3)).toContain('1,4× hasar'); // 1,3 × 1,08 = 1,404
  expect(skillDesc(bash, 3)).not.toContain('1,3×');
  const steel = classSkill('guardian', 3, 'steel')!;
  expect(skillDesc(steel, 2)).toContain('%12,5'); // 12 × 1,04 = 12,48 → 12,5
  const storm = classSkill('hunter', 4)!;
  const d = skillDesc(storm, 3);
  expect(d).toContain('+%32'); expect(d).toContain('+%27'); // güçlendirme kademe başına +1
  expect(d).toContain('1,94×'); // 1,8 × 1,08
});
