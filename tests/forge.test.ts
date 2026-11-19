import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, TUNING, forgeRoom, forgeAt, FORGE_MAP, FORGE_SLOTS, FORGE_FLOORS, computeStats, itemPower, EVO_DEFAULT, ITEM_TEMPLATES } from '@col/shared';

const mk = (id: number, level: number) => {
  const l = getLayout('bazaar'); const n = l.npcs.find((x) => x.id === 'bekci')!;
  return { id, accountId: id, role: 'player', name: 'P' + id, cls: 'guardian', level, xp: 0, hp: 99999, map: 'bazaar', x: n.x + 60, y: n.y + 60, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
};
const setup = (level = 15) => {
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  w.join(1, mk(1, level)); const p = w.bySid.get(1)!;
  const sent: any[] = [];
  (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  (w as any).addXp = () => {};
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  const step = (n = 2) => { for (let i = 0; i < n; i++) w.tick(); };
  const goto = (x: number, y: number) => { p.x = x; p.y = y; p.zone.players.move(p); step(2); };
  return { w, p, cmd, step, goto, sent };
};
const run = (w: World) => [...w.forge.runs.values()][0];
const go = (w: World, step: (n?: number) => void) => { const r = run(w); r.nextAt = 0; step(2); };
const killAll = (w: World, p: any) => { for (const m of [...run(w).mons]) (w as any).killMonster(m, p); };

it('Kor Kulesi: odalar yürünebilir, konumdan grup ve kat çıkar', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const l = getLayout(FORGE_MAP);
  for (let s = 0; s < FORGE_SLOTS; s++) for (let f = 1; f <= FORGE_FLOORS; f++) {
    const r = forgeRoom(s, f);
    expect(forgeAt(r.entry.x, r.entry.y)).toEqual({ slot: s, floor: f });
    for (const pt of [r.entry, r.gate, ...r.plates.slice(0, 10), ...r.emberSpots, ...r.rifts]) {
      const tx = Math.floor(pt.x / 64), ty = Math.floor(pt.y / 64);
      expect(l.blocked[ty * l.w + tx]).toBe(0);
    }
  }
  expect(l.spawnPoints.length).toBe(0); // canavarlar dalgayla gelir
});

it('Kor Kulesi: 3 dalga + döküm kalıbı, kor taşıma, Karademir, sandık ve köye dönüş', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const low = setup(9);
  low.cmd({ t: 'forge', op: 'enter' });
  expect(low.p.zone.id).toBe('bazaar');
  const { w, p, cmd, step, goto, sent } = setup(15);
  cmd({ t: 'forge', op: 'enter' });
  expect(p.zone.id).toBe(FORGE_MAP);
  const R = run(w);
  expect(R.floor).toBe(1); expect(R.pending).toBe('w1');
  // 1. kat: iki dalga
  go(w, step); expect(R.stage).toBe('w1'); expect(R.mons.size).toBe(TUNING.forge.floors[0].waves[0].count);
  const m0 = [...R.mons][0];
  expect(m0.maxHp).toBe(TUNING.forge.floors[0].mon.hp); expect(m0.level).toBe(12);
  const r1 = forgeRoom(R.slot, 1);
  goto(r1.gate.x, r1.gate.y); expect(R.floor).toBe(1); // kapı kapalı
  goto(r1.entry.x, r1.entry.y);
  killAll(w, p); expect(R.pending).toBe('w2');
  go(w, step); expect(R.stage).toBe('w2'); killAll(w, p); expect(R.pending).toBe('puzzle');
  // döküm kalıbı: yanlış eşleşme can yakar, doğrular kalır
  go(w, step); expect(R.stage).toBe('puzzle'); expect(R.mold?.sym.length).toBe(TUNING.forge.moldPairs * 2);
  const sym = R.mold!.sym;
  const a = 0, wrong = sym.findIndex((s, i) => i > 0 && s !== sym[0]);
  const hp0 = p.hp;
  goto(r1.plates[a].x, r1.plates[a].y); goto(r1.entry.x, r1.entry.y); goto(r1.plates[wrong].x, r1.plates[wrong].y);
  expect(p.hp).toBeLessThan(hp0);
  R.mold!.closeAt = 1; goto(r1.entry.x, r1.entry.y);
  expect(R.mold!.open.length).toBe(0);
  for (let s = 0; s < TUNING.forge.moldPairs; s++) {
    const [i, j] = sym.map((v, k) => (v === s ? k : -1)).filter((k) => k >= 0);
    goto(r1.plates[i].x, r1.plates[i].y); goto(r1.entry.x, r1.entry.y); goto(r1.plates[j].x, r1.plates[j].y); goto(r1.entry.x, r1.entry.y);
  }
  expect(R.mold).toBeUndefined(); expect(R.pending).toBe('w3');
  // 3. dalga: elitler (daha güçlü, malzeme düşer)
  go(w, step); expect(R.stage).toBe('w3');
  const elites = [...R.mons].filter((m) => m.variant === 2);
  expect(elites.length).toBe(TUNING.forge.floors[0].waves[2].elite);
  expect(elites[0].maxHp).toBe(TUNING.forge.floors[0].mon.hp * TUNING.forge.eliteHp);
  killAll(w, p); expect(R.stage).toBe('done');
  goto(r1.gate.x, r1.gate.y);
  expect(R.floor).toBe(2); expect(forgeAt(p.x, p.y)).toEqual({ slot: R.slot, floor: 2 });
  // 2. kat: kor taşıma
  go(w, step); killAll(w, p); go(w, step); killAll(w, p); go(w, step);
  expect(R.stage).toBe('puzzle'); expect(R.ember).toBeTruthy();
  const r2 = forgeRoom(R.slot, 2);
  for (let k = 0; k < TUNING.forge.emberCount; k++) {
    R.ember!.respawnAt = 0; step(2);
    const sp = r2.emberSpots[R.ember!.spot];
    goto(sp.x, sp.y); expect(R.ember?.carrier).toBe(p.char.id);
    if (k === 0) { R.ember!.coolAt = 1; step(2); expect(R.ember!.carrier).toBe(0); R.ember!.respawnAt = 0; step(2); const s2 = r2.emberSpots[R.ember!.spot]; goto(s2.x, s2.y); }
    goto(r2.anvil.x, r2.anvil.y + 80);
  }
  expect(R.ember).toBeUndefined(); expect(R.pending).toBe('w3');
  go(w, step); killAll(w, p);
  goto(r2.gate.x, r2.gate.y); expect(R.floor).toBe(3);
  // ölüm → katın girişinde doğar, koşu sürer
  (w as any).killPlayer(p, null); p.deadAt -= 60_000; cmd({ t: 'respawn', where: 'here' });
  expect(forgeAt(p.x, p.y)).toEqual({ slot: R.slot, floor: 3 });
  // Karademir: canı eşiğe inince golem çağırır; ölünce sandık
  go(w, step); const boss = R.boss!;
  expect(boss.def.id).toBe('f_boss'); expect(boss.maxHp).toBe(TUNING.forge.boss.hp);
  boss.hp = boss.maxHp * 0.5; step(2);
  expect(R.mons.size).toBe(1 + TUNING.forge.boss.adds);
  boss.threat.set(p, boss.maxHp);
  (w as any).killMonster(boss, p);
  expect(R.stage).toBe('done'); expect(R.mons.size).toBe(0);
  expect(p.char.materials.forge_chest).toBe(1);
  cmd({ t: 'use', key: 'forge_chest', req: 'c1' });
  expect(p.char.materials.forge_chest).toBe(0);
  expect(p.char.materials.ember_stone ?? 0).toBeGreaterThan(0);
  expect(sent.some((m) => m.t === 'chestResult' && m.title === 'Kor Sandığı')).toBe(true);
  const r3 = forgeRoom(R.slot, 3);
  goto(r3.gate.x, r3.gate.y);
  expect(p.zone.id).toBe('bazaar'); expect(w.forge.runs.size).toBe(0);
});

it('Kor Kulesi: grup arkadaşı aynı koşuya katılır; kopan oyuncu kaldığı kattan döner', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const { w, p, cmd } = setup(15);
  w.join(2, mk(2, 15)); const q = w.bySid.get(2)!;
  (w.social as any).partyMembers = (x: any) => [p, q];
  cmd({ t: 'forge', op: 'enter' });
  w.onCmd(2, JSON.stringify({ t: 'forge', op: 'enter' }));
  expect(w.forge.runs.size).toBe(1);
  expect(q.zone.id).toBe(FORGE_MAP);
  const R = run(w); expect(R.members.size).toBe(2);
  // q kopar ve geri gelir
  const snap = (w as any).snapshotChar(q); w.leave(2);
  expect(R.members.has(snap.id)).toBe(true);
  w.join(2, snap); const q2 = w.bySid.get(2)!;
  expect(q2.zone.id).toBe(FORGE_MAP); expect(forgeAt(q2.x, q2.y)?.slot).toBe(R.slot);
  // çıkış: q köye, koşu p ile sürer
  w.onCmd(2, JSON.stringify({ t: 'forge', op: 'leave' }));
  expect(q2.zone.id).toBe('bazaar'); expect(R.members.size).toBe(1);
  // koşusu olmayan oyuncu kule haritasında açılmaz
  const lone = mk(3, 15); lone.map = FORGE_MAP; w.join(3, lone);
  expect(w.bySid.get(3)!.zone.id).toBe('bazaar');
});

it('Evrim: av sayacı, bedel, kademe, saldırı/savunma artışı', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const { w, p, cmd, sent } = setup(15);
  const h = getLayout('bazaar').npcs.find((x) => x.id === 'haso')!;
  p.x = h.x + 60; p.y = h.y + 60; p.zone.players.move(p);
  const wpn = { id: 'w1', tpl: 'sword_guardian', rarity: 'blue', plus: 0, ench: [] } as any;
  const arm = { id: 'a1', tpl: 'armor_guardian', rarity: 'blue', plus: 0, ench: [] } as any;
  const tpls = ITEM_TEMPLATES as any[];
  wpn.tpl = tpls.find((t) => t.slot === 'weapon' && t.cls === 'guardian').id;
  arm.tpl = tpls.find((t) => t.slot === 'armor' && t.cls === 'guardian').id;
  p.char.equip.weapon = wpn; p.char.equip.armor = arm; p.recompute(false);
  const atk0 = p.stats.atk, def0 = p.stats.def, wp0 = itemPower(wpn);
  // sayaç: canavar öldürünce silah ve zırh sayar, çok düşük seviyeli canavar sayılmaz
  const fox = (w as any).zones.get('bazaar').monsterList.find((m: any) => m.def.id === 'wild_fox');
  (w as any).rewardKill(p, fox); expect(wpn.kills ?? 0).toBe(1); expect(arm.kills ?? 0).toBe(1);
  p.char.level = 40; (w as any).rewardKill(p, fox); expect(wpn.kills).toBe(1); p.char.level = 15;
  // av eksik → olmaz
  cmd({ t: 'evolve', item: 'w1', req: 'e1' });
  expect(wpn.evo ?? 0).toBe(0);
  const st = EVO_DEFAULT.weapon[0];
  wpn.kills = st.kills; p.char.gems = st.gems; for (const [k, q] of Object.entries(st.mats)) p.char.materials[k] = q;
  cmd({ t: 'evolve', item: 'w1', req: 'e2' });
  expect(wpn.evo).toBe(1); expect(wpn.kills).toBe(0); expect(p.char.gems).toBe(0);
  // evrim eşyanın gücüne yönetimdeki düz değeri ekler (saldırı da aynı kadar artar)
  expect(itemPower(wpn)).toBe(wp0 + st.add);
  expect(p.stats.atk).toBe(atk0 + st.add);
  expect(sent.some((m) => m.t === 'evolved')).toBe(true);
  // zırh: savunma
  arm.kills = EVO_DEFAULT.armor[0].kills; p.char.gems = 99999; for (const [k, q] of Object.entries(EVO_DEFAULT.armor[0].mats)) p.char.materials[k] = q;
  cmd({ t: 'evolve', item: 'a1', req: 'e3' });
  expect(arm.evo).toBe(1); expect(p.stats.def).toBeGreaterThan(def0);
  // görünüm baytı: artı alt 4 bit, silah evrimi 4-5, zırh evrimi 6-7
  const sp = (w as any).playerSpawn(p);
  expect(sp.wplus).toBe(0 | (1 << 4) | (1 << 6));
  void computeStats;
});

it('Kor Kulesi ve evrim ayarları: yönetimden gelen değer korunur, bozuk değer sınırlanır', async () => {
  const { sanitizeTuning, FORGE_DEFAULT } = await import('@col/shared');
  const raw = structuredClone(DEFAULT_TUNING) as any;
  raw.forge.floors[0].waves[1].count = 7; raw.forge.boss.hp = 50000; raw.forge.moldPairs = 99; raw.forge.floors[1].puzzle = 'mold';
  raw.forge.boss.addAt = [20, 80, 'x']; raw.evo.weapon[2].add = 25; raw.evo.armor[0].mats = { ember_stone: 5 };
  const t = sanitizeTuning(raw);
  expect(t.forge.floors[0].waves[1].count).toBe(7);
  expect(t.forge.boss.hp).toBe(50000);
  expect(t.forge.moldPairs).toBe(5);
  expect(t.forge.floors[1].puzzle).toBe('mold');
  expect(t.forge.boss.addAt).toEqual([80, 20]);
  expect(t.evo.weapon[2].add).toBe(25);
  expect(t.evo.armor[0].mats).toEqual({ ember_stone: 5 });
  expect(sanitizeTuning({}).forge).toEqual(FORGE_DEFAULT);
});
