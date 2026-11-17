import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, resolveLoot, overLevelMul, applyTuning, DEFAULT_TUNING, TUNING } from '@col/shared';

const mk = (id: number, level: number) => { const l = getLayout('bazaar'); return { id, accountId: id, role: 'player', name: 'P' + id, cls: 'guardian', level, xp: 0, hp: 9999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any; };

it('bölge ganimeti: yönetim ayarı uygulanır, seviye sınırını aşan oyuncu çok az eşya alır', () => {
  applyTuning({ ...structuredClone(DEFAULT_TUNING), zoneLoot: { bazaar: { maxLevel: 10, overMul: 0.1, mats: { kor_seal: 0.5 } } } });
  const r = resolveLoot(TUNING, 'bazaar', 'village', 'wild_fox');
  expect(r.materials.find((m) => m.id === 'kor_seal')?.chance).toBe(0.5);
  expect(overLevelMul(r, 10)).toBe(1);
  expect(overLevelMul(r, 11)).toBe(0.1);
  const count = (level: number, cap: number) => {
    applyTuning({ ...structuredClone(DEFAULT_TUNING), zoneLoot: { bazaar: { maxLevel: cap, overMul: 0.1 } } });
    const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
    w.join(1, mk(1, level)); const p = w.bySid.get(1)!;
    const fox = [...(w as any).zones.get('bazaar').monsterList].find((m: any) => m.def.id === 'wild_fox');
    for (let i = 0; i < 3000; i++) (w as any).rewardKill(p, fox);
    return p.zone.lootById.size;
  };
  const free = count(11, 0), capped = count(11, 10);
  console.log(`3000 tilki, Sv.11: sınırsız → ${free} ganimet, sınır 10 → ${capped} ganimet`);
  expect(capped).toBeLessThan(free * 0.2);
  expect(capped).toBeGreaterThan(0);
  applyTuning(structuredClone(DEFAULT_TUNING));
});

it('Market: Öz → Mücevher ve Öz ile Kırmızı İksir; yetersiz Öz ve eski oranla işlem yok', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  const ch = mk(1, 5); ch.essence = 1000; ch.gems = 0; w.join(1, ch); const p = w.bySid.get(1)!;
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  cmd({ t: 'essx', op: 'gems', n: 3, rate: 200 * 100000 + 15, req: 'a1' });
  expect(p.char.essence).toBe(400); expect(p.char.gems).toBe(45);
  cmd({ t: 'essx', op: 'gems', n: 3, rate: 200 * 100000 + 15, req: 'a2' }); // 600 Öz gerekir, 400 var
  expect(p.char.essence).toBe(400);
  cmd({ t: 'essx', op: 'potion', n: 5, rate: 999, req: 'a3' }); // yanlış oran
  expect(p.char.materials.red_potion ?? 0).toBe(0);
  cmd({ t: 'essx', op: 'potion', n: 5, rate: 20, req: 'a4' });
  expect(p.char.materials.red_potion).toBe(5); expect(p.char.essence).toBe(300);
});

it('boss: yeterince hasar veren herkes kendi ganimetini alır, çok az vuran almaz', () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  for (const id of [1, 2, 3]) w.join(id, mk(id, 8)); // Pazar Köyü sınırı (Sv. 10) altında
  const [a, b, c] = [1, 2, 3].map((id) => w.bySid.get(id)!);
  const z: any = a.zone;
  const boss = [...(w as any).zones.values()].flatMap((zz: any) => zz.monsterList).find((m: any) => m.def.boss);
  // bossu oyuncuların bölgesine al
  boss.zone.removeMonster(boss); z.addMonster(boss); boss.x = a.x + 30; boss.y = a.y; boss.killed = false; boss.hp = boss.maxHp;
  boss.threat.set(a, boss.maxHp * 0.5); boss.threat.set(b, boss.maxHp * 0.2); boss.threat.set(c, boss.maxHp * 0.01);
  const lootBefore = z.lootById.size;
  (w as any).killMonster(boss, c);
  const owners = new Set([...z.lootById.values()].map((l: any) => l.ownerChar));
  console.log(`boss ganimeti: ${z.lootById.size - lootBefore} parça, sahipler ${[...owners].join(',')}`);
  expect(owners.has(1)).toBe(true); expect(owners.has(2)).toBe(true); expect(owners.has(3)).toBe(false);
  // haftalık canavar sıralaması sayacı
  expect(a.char.misc.rankKills?.n).toBe(1); expect(c.char.misc.rankKills).toBeUndefined();
});

it('Canavar doğrudan değerleri: ref seviyede girilen can/saldırı, diğer seviye ve çeşitlerde aynı oranla; temel kritik 0; takı düşmez', () => {
  applyTuning({ ...structuredClone(DEFAULT_TUNING), monsters: { shadow_wolf: { ref: 10, baseHp: 1000, baseAtk: 50, speed: 300, respawnSec: 5 } } });
  const out: any[] = []; const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => out.push(m) });
  const wolves = [...(w as any).zones.get('forest').monsterList].filter((m: any) => m.def.id === 'shadow_wolf');
  const l1 = wolves.find((m: any) => m.sp.level === 10 && m.sp.variant === 0); // Kuzey Ormanı Sv. 10'dan başlar
  expect(l1.maxHp).toBe(1000); expect(l1.atk).toBe(50); expect(l1.def.speed).toBe(300);
  const hi = wolves.find((m: any) => m.sp.level >= 12 && m.sp.variant === 0);
  expect(hi.maxHp).toBeGreaterThan(1000);
  expect((w as any).respawnDelay(l1.def)).toBe(5000);
  w.join(1, mk(1, 20)); const p = w.bySid.get(1)!;
  expect(p.stats.crit).toBe(0);
  for (let i = 0; i < 400; i++) { const it = w.rollEquipment(p, { blue: 1 }, false); expect(['necklace', 'earring', 'bracelet']).not.toContain(it!.tpl); }
  applyTuning(structuredClone(DEFAULT_TUNING));
});
