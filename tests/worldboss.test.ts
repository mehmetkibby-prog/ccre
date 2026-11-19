import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, TILE, WORLD_BOSS_ID, WORLD_BOSS_MAP } from '@col/shared';

const setup = (level = 40) => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  const l = getLayout('bazaar');
  w.join(1, { id: 1, accountId: 1, role: 'player', name: 'P1', cls: 'guardian', level, xp: 0, hp: 9999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any);
  const p = w.bySid.get(1)!;
  const sent: any[] = []; (w as any).sendJson = (_q: any, o: any) => sent.push(o);
  const cmd = (c: any) => w.onCmd(1, JSON.stringify(c));
  const wb = () => w.bossStatus().find((b) => b.id === WORLD_BOSS_ID)!;
  const advance = (ms: number) => { const real = Date.now; const t = real() + ms; Date.now = () => t; try { w.tick(); } finally { Date.now = real; } };
  return { w, p, sent, cmd, wb, advance };
};

it('Kadim Sunak: yürünebilir meydan, boss ortada, giriş güneyde', () => {
  const l = getLayout(WORLD_BOSS_MAP);
  const sp = l.spawnPoints.find((s) => s.monster === WORLD_BOSS_ID)!;
  expect(sp).toBeTruthy();
  expect(l.blocked[Math.floor(l.spawn.y / TILE) * l.w + Math.floor(l.spawn.x / TILE)]).toBe(0);
  expect(Math.hypot(sp.x - l.spawn.x, sp.y - l.spawn.y)).toBeGreaterThan(900);
});

it('Dünya Boss\'u açılışta doğmaz; sayaç dolunca doğar, düğme meydana götürür (seviye şartı)', () => {
  const { p, cmd, wb, advance, sent } = setup(20);
  const s0 = wb();
  expect(s0.alive).toBe(false);
  expect(s0.cycleMs).toBe(120 * 60_000);
  expect(s0.nextAt! - Date.now()).toBeGreaterThan(119 * 60_000);
  cmd({ t: 'worldboss', op: 'go', req: 'g0' });
  expect(p.zone.id).toBe('bazaar'); // henüz doğmadı
  advance(121 * 60_000);
  expect(wb().alive).toBe(true);
  expect(sent.some((m) => m.t === 'chat' && /Dünya Boss/.test(m.text))).toBe(true);
  cmd({ t: 'worldboss', op: 'go', req: 'g1' });
  expect(p.zone.id).toBe('bazaar'); // seviye 20 < 30
  p.char.level = 35;
  cmd({ t: 'worldboss', op: 'go', req: 'g2' });
  expect(p.zone.id).toBe(WORLD_BOSS_MAP);
});

it('kapalıyken doğmaz; yönetim değerleri boss\'a işler', () => {
  const t = structuredClone(DEFAULT_TUNING); t.worldBoss.enabled = false; t.monsters[WORLD_BOSS_ID] = { hp: 777777 };
  const { w, wb, advance } = setup(40);
  applyTuning(t);
  advance(125 * 60_000);
  expect(wb().alive).toBe(false);
  expect(wb().off).toBe(true);
  t.worldBoss.enabled = true; applyTuning(t);
  advance(130 * 60_000);
  expect(wb().alive).toBe(true);
  const m = w.zones.get(WORLD_BOSS_MAP)!.monsterList.find((q) => q.def.id === WORLD_BOSS_ID)!;
  expect(m.maxHp).toBe(777777);
  applyTuning(structuredClone(DEFAULT_TUNING));
});

it('yönetim doğma aralığını kısaltınca bekleyen doğuş yeni süreye çekilir', () => {
  const { w, wb } = setup(40);
  const t = structuredClone(DEFAULT_TUNING); t.monsters[WORLD_BOSS_ID] = { respawnMin: 0.5 }; applyTuning(t);
  w.retimeWorldBoss();
  expect(wb().nextAt! - Date.now()).toBeLessThan(31_000);
  applyTuning(structuredClone(DEFAULT_TUNING));
});

it('ayar kaydı (harita yeniden kurulumu) boss\'u erken doğurmaz, canlıysa canını korur', () => {
  const { w, wb, advance } = setup(40);
  const at0 = wb().nextAt!;
  w.reseedMonsters(WORLD_BOSS_MAP);
  expect(wb().alive).toBe(false);
  expect(wb().nextAt).toBe(at0);
  advance(121 * 60_000);
  const z = w.zones.get(WORLD_BOSS_MAP)!;
  const m = z.monsterList.find((q) => q.def.id === WORLD_BOSS_ID)!;
  m.hp = Math.round(m.maxHp * 0.4);
  w.reseedMonsters(WORLD_BOSS_MAP);
  const m2 = z.monsterList.find((q) => q.def.id === WORLD_BOSS_ID)!;
  expect(Math.round((m2.hp / m2.maxHp) * 100)).toBe(40);
});
