import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, TUNING, towerRoom, towerFloorAt, RIDDLES, TOWER_MAP } from '@col/shared';

const mk = (id: number, level: number) => {
  const l = getLayout('bazaar'); const n = l.npcs.find((x) => x.id === 'bekci')!;
  return { id, accountId: id, role: 'player', name: 'P' + id, cls: 'guardian', level, xp: 0, hp: 99999, map: 'bazaar', x: n.x + 60, y: n.y + 60, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
};
const setup = (level = 40) => {
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  w.join(1, mk(1, level)); const p = w.bySid.get(1)!;
  const sent: any[] = [];
  (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  const step = (n = 2) => { for (let i = 0; i < n; i++) w.tick(); };
  const goto = (x: number, y: number) => { p.x = x; p.y = y; p.zone.players.move(p); step(2); };
  return { w, p, cmd, step, goto, sent };
};

it('Kadim Kule: geometri ve kat yerleşimi tutarlı', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const l = getLayout(TOWER_MAP);
  for (let f = 1; f <= 10; f++) {
    const r = towerRoom(f, TUNING.tower.floors[f - 1].puzzle);
    expect(towerFloorAt(r.entry.x, r.entry.y)).toBe(f);
    expect(towerFloorAt(r.gate.x, r.gate.y)).toBe(f);
    const tx = Math.floor(r.entry.x / 64), ty = Math.floor(r.entry.y / 64);
    expect(l.blocked[ty * l.w + tx]).toBe(0); // giriş yürünebilir
    const n = l.spawnPoints.filter((s) => s.floor === f).length;
    expect(n).toBe(TUNING.tower.floors[f - 1].count);
  }
  expect(l.spawnPoints.find((s) => s.floor === 10)?.monster).toBe('azrail');
});

it('Kadim Kule: seviye sınırı, öldürme katı, kapıdan üst kat, ölümde kat girişi', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const low = setup(10);
  low.cmd({ t: 'tower', op: 'enter' });
  expect(low.p.zone.id).toBe('bazaar');
  const { w, p, cmd, goto, sent } = setup(40);
  cmd({ t: 'tower', op: 'enter' });
  expect(p.zone.id).toBe(TOWER_MAP);
  expect(p.char.misc.tower?.f).toBe(1);
  const r1 = towerRoom(1);
  // kapı kapalıyken geçilmez
  goto(r1.gate.x, r1.gate.y);
  expect(p.char.misc.tower?.f).toBe(1);
  const mon = p.zone.monsterList.find((m: any) => m.sp.floor === 1)!;
  for (let i = 0; i < TUNING.tower.floors[0].kills; i++) (w as any).rewardKill(p, mon);
  expect(p.char.misc.tower?.done).toBe(true);
  // başka kattaki canavar sayılmaz
  goto(r1.entry.x, r1.entry.y); goto(r1.gate.x, r1.gate.y);
  expect(p.char.misc.tower?.f).toBe(2);
  expect(towerFloorAt(p.x, p.y)).toBe(2);
  const m1 = p.zone.monsterList.find((m: any) => m.sp.floor === 1)!;
  (w as any).rewardKill(p, m1);
  expect(p.char.misc.tower?.n).toBe(0);
  // ölüm → aynı katın girişi
  (w as any).killPlayer(p, null); p.deadAt -= 60_000;
  cmd({ t: 'respawn', where: 'here' });
  expect(towerFloorAt(p.x, p.y)).toBe(2);
  expect(sent.some((m) => m.t === 'tower' && m.f === 2)).toBe(true);
  // çıkış: köye
  cmd({ t: 'tower', op: 'leave' });
  expect(p.zone.id).toBe('bazaar');
});

it('Kadim Kule: mühür sırası, bilmece ve sunak bulmacaları', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const { p, goto, cmd } = setup(40);
  cmd({ t: 'tower', op: 'enter' });
  // 3. kat: mühür sırası
  const r3 = towerRoom(3, 'seq');
  goto(r3.entry.x, r3.entry.y);
  const t = p.char.misc.tower!;
  expect(t.f).toBe(3); expect(t.seq?.length).toBe(5);
  const hp0 = p.hp;
  const wrong = (t.seq![0] + 1) % 4;
  goto(r3.plates[wrong].x, r3.plates[wrong].y);
  expect(p.hp).toBeLessThan(hp0); expect(t.si).toBe(0);
  for (const i of t.seq!) { goto(r3.entry.x, r3.entry.y); goto(r3.plates[i].x, r3.plates[i].y); }
  expect(p.char.misc.tower?.done).toBe(true);
  // 7. kat: bilmece (yanlış → giriş, doğru → kapı)
  const r7 = towerRoom(7, 'riddle');
  goto(r7.entry.x, r7.entry.y);
  let t7 = p.char.misc.tower!;
  expect(t7.f).toBe(7); expect(t7.opts?.length).toBe(4);
  const bad = t7.opts!.findIndex((o) => o !== 0);
  goto(r7.plates[bad].x, r7.plates[bad].y);
  expect(Math.hypot(p.x - r7.entry.x, p.y - r7.entry.y)).toBeLessThan(120);
  t7 = p.char.misc.tower!;
  expect(RIDDLES[t7.rd!]).toBeTruthy();
  const good = t7.opts!.indexOf(0);
  goto(r7.plates[good].x, r7.plates[good].y);
  expect(p.char.misc.tower?.done).toBe(true);
  // 9. kat: sunaklar (3 sn bekle)
  const r9 = towerRoom(9, 'altar');
  goto(r9.entry.x, r9.entry.y);
  const w9 = p.char.misc.tower!;
  expect(w9.f).toBe(9);
  const realNow = Date.now;
  let fake = Date.now();
  Date.now = () => fake;
  try {
    for (const pl of r9.plates) {
      goto(pl.x, pl.y);
      fake += 3200; goto(pl.x + 1, pl.y);
    }
  } finally { Date.now = realNow; }
  expect(p.char.misc.tower?.alt).toBe(7);
  expect(p.char.misc.tower?.done).toBe(true);
});

it('Kadim Kule: Azrail hasar verenlere kesin sandık; sandık içeriği ve Azrail Kancası', () => {
  applyTuning({ ...structuredClone(DEFAULT_TUNING), tower: { ...structuredClone(DEFAULT_TUNING.tower), chest: { gems: [100, 100], essence: [50, 50], hookChance: 1, drops: [{ kind: 'mat', key: 'soul_ring', chance: 1, qty: [2, 2] }] } } });
  const { w, p, goto, cmd, sent } = setup(60);
  cmd({ t: 'tower', op: 'enter' });
  const r10 = towerRoom(10);
  goto(r10.entry.x, r10.entry.y);
  expect(p.char.misc.tower?.f).toBe(10);
  const az = p.zone.monsterList.find((m: any) => m.def.id === 'azrail')!;
  expect(az).toBeTruthy();
  az.threat.set(p, az.maxHp);
  (w as any).killMonster(az, p);
  expect(p.char.materials.azrail_chest).toBe(1);
  expect(p.char.misc.tower?.done).toBe(true);
  cmd({ t: 'use', key: 'azrail_chest', req: 'c1' });
  expect(p.char.materials.azrail_chest).toBe(0);
  expect(p.char.materials.azrail_hook).toBe(1);
  expect(p.char.materials.soul_ring).toBe(2);
  expect(sent.some((m) => m.t === 'chestResult' && m.title === 'Azrail Sandığı')).toBe(true);
  // zirve kapısı → köy
  goto(r10.gate.x, r10.gate.y);
  expect(p.zone.id).toBe('bazaar');
  applyTuning(structuredClone(DEFAULT_TUNING));
});

it('Üretim: Pakize yanında, malzeme ve bedel düşer; başarıda çıktı, sınıfa göre silah', () => {
  applyTuning({ ...structuredClone(DEFAULT_TUNING), crafts: [
    { id: 'r1', name: 'Mühür', out: { kind: 'mat', key: 'mastery_seal', qty: 2 }, inputs: { tower_seal: 3 }, gems: 100, essence: 0, chance: 100, minLevel: 1 },
    { id: 'r2', name: 'Silah', out: { kind: 'item', key: 'w_cls', rarity: 'unique', qty: 1 }, inputs: { azrail_hook: 1 }, gems: 0, essence: 0, chance: 100, minLevel: 1 },
  ] });
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  const ch = mk(1, 30); const pk = getLayout('bazaar').npcs.find((n) => n.id === 'pakize')!; ch.x = pk.x + 60; ch.y = pk.y + 60;
  ch.gems = 150; ch.materials = { tower_seal: 4, azrail_hook: 1 }; ch.cls = 'hunter';
  w.join(1, ch); const p = w.bySid.get(1)!;
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  cmd({ t: 'craft', id: 'r1', req: 'k1' });
  expect(p.char.materials.mastery_seal).toBe(2); expect(p.char.materials.tower_seal).toBe(1); expect(p.char.gems).toBe(50);
  cmd({ t: 'craft', id: 'r1', req: 'k2' }); // yetersiz malzeme
  expect(p.char.materials.mastery_seal).toBe(2);
  cmd({ t: 'craft', id: 'r2', req: 'k3' });
  expect(p.char.bag.at(-1)?.tpl).toBe('w_hunter'); expect(p.char.bag.at(-1)?.rarity).toBe('unique');
  applyTuning(structuredClone(DEFAULT_TUNING));
});
