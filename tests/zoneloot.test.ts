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
