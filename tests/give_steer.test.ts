import { it, expect } from 'vitest';
import { World, applyGive } from '../packages/server/src/worker/world.ts';
import { getLayout } from '@col/shared';

const mk = (over: any = {}) => { const l = getLayout('bazaar'); return { id: 1, accountId: 1, role: 'player', name: 'Alan', cls: 'guardian', level: 30, xp: 0, hp: 900, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1, ...over } as any; };

it('yönetim: eşya ve malzeme verme (çevrimiçi ve kayda)', () => {
  const c = mk();
  applyGive(c, { kind: 'item', tpl: 'w_guardian', rarity: 'unique', plus: 4 });
  applyGive(c, { kind: 'mat', key: 'kor_seal', qty: 7 });
  expect(c.bag[0].rarity).toBe('unique'); expect(c.bag[0].plus).toBe(4); expect(c.materials.kor_seal).toBe(7);
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, mk({ id: 2 }));
  expect(w.adminGive(2, { kind: 'mat', key: 'xp_ring', qty: 2 })).toBe(true);
  expect(w.bySid.get(1)!.char.materials.xp_ring).toBe(2);
});

it('canavar önündeki engelin etrafından dolanır (takılıp titremez)', () => {
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  const z: any = (w as any).zones?.get?.('bazaar') ?? [...(w as any).zones.values()][0];
  const l = z.layout;
  // açık bir alan bul, ortasına 1 karoluk "ağaç" koy; canavarı solundan sağına yürüt
  let ox = -1, oy = -1;
  for (let y = 70; y < l.h - 5 && ox < 0; y++) for (let x = 10; x < l.w - 10; x++) { let ok = true; for (let dy = -2; dy <= 2 && ok; dy++) for (let dx = -4; dx <= 4; dx++) if (l.blocked[(y + dy) * l.w + x + dx]) { ok = false; break; } if (ok) { ox = x; oy = y; break; } }
  expect(ox).toBeGreaterThan(0);
  const saved = l.blocked[oy * l.w + ox]; l.blocked[oy * l.w + ox] = 1;
  const m: any = [...z.monsters.all ? z.monsters.all() : []][0] ?? z.monsterList?.[0];
  const mon = m ?? { id: 7, x: 0, y: 0, dir: 0, anim: 0, animUntil: 0, dirty: 0 };
  const zz = { layout: l, monsters: { move() {} } };
  mon.x = (ox - 2) * 64 + 32; mon.y = oy * 64 + 32;
  const tx = (ox + 3) * 64 + 32, ty = oy * 64 + 32;
  let steps = 0;
  while (Math.hypot(tx - mon.x, ty - mon.y) > 20 && steps < 400) { (w as any).stepMonster(zz, mon, tx, ty, 200); steps++; }
  l.blocked[oy * l.w + ox] = saved;
  expect(Math.hypot(tx - mon.x, ty - mon.y)).toBeLessThan(25);
});
