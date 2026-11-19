import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { getLayout, applyTuning, DEFAULT_TUNING, eventWindow, activeEvents, TR_OFFSET_MS, type EventDef } from '@col/shared';

const ev = (p: Partial<EventDef>): EventDef => ({ id: 'e1', kind: 'xp', on: true, mult: 2, chance: 0.05, mode: 'now', start: 0, durMin: 60, at: '20:00', days: [], ...p });

it('etkinlik pencereleri: hemen, tarihte, her gün (Türkiye saati, gece yarısını aşan)', () => {
  const t0 = Date.UTC(2026, 10, 19, 17, 0) ; // 20:00 TR
  expect(eventWindow(ev({ start: t0 }), t0 + 30 * 60000)).not.toBeNull();
  expect(eventWindow(ev({ start: t0 }), t0 + 61 * 60000)).toBeNull();
  expect(eventWindow(ev({ start: t0, on: false }), t0 + 60000)).toBeNull();
  expect(eventWindow(ev({ mode: 'once', start: t0 + 3600_000 }), t0)).toBeNull();
  // her gün 23:30'da 2 saat: ertesi gün 00:30'da hâlâ etkin
  const d = ev({ mode: 'daily', at: '23:30', durMin: 120 });
  const at0030 = Date.UTC(2026, 10, 19, 0, 30) - TR_OFFSET_MS + 86400_000;
  expect(eventWindow(d, at0030)).not.toBeNull();
  expect(eventWindow(d, at0030 + 3 * 3600_000)).toBeNull();
  // yalnız Cumartesi (6): Perşembe 19.11.2026 20:30'da etkin değil
  expect(eventWindow(ev({ mode: 'daily', at: '20:00', days: [6] }), t0 + 30 * 60000)).toBeNull();
  expect(eventWindow(ev({ mode: 'daily', at: '20:00', days: [4] }), t0 + 30 * 60000)).not.toBeNull();
  const a = activeEvents({ announce: true, list: [ev({ start: t0 }), ev({ id: 'e2', mult: 1.5, start: t0 }), ev({ id: 'e3', kind: 'chest', chance: 0.1, start: t0 })], chest: DEFAULT_TUNING.events.chest }, t0 + 1000);
  expect(a.xp).toBe(3); expect(a.chest).toBe(0.1); expect(a.drop).toBe(1);
});

it('Kristal Sandık etkinliği: canavardan sandık düşer, açınca ödül verir; TP etkinliği TP artırır', () => {
  const tun = structuredClone(DEFAULT_TUNING);
  tun.events.list = [ev({ kind: 'chest', chance: 1, start: Date.now() - 1000 }), ev({ id: 'x', kind: 'xp', mult: 3, start: Date.now() - 1000 })];
  tun.events.announce = false;
  applyTuning(tun);
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  const l = getLayout('bazaar');
  w.join(1, { id: 1, accountId: 1, role: 'player', name: 'P1', cls: 'guardian', level: 3, xp: 0, hp: 999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any);
  const p = w.bySid.get(1)!;
  (w as any).tickEvents();
  const fox = (w as any).zones.get('bazaar').monsterList.find((m: any) => m.def.id === 'wild_fox');
  let xpGot = 0; (w as any).addXp = (_q: any, x: number) => { xpGot += x; };
  (w as any).rewardKill(p, fox);
  const loots = [...(w as any).zones.get('bazaar').lootById.values()].filter((x: any) => x.payload.kind === 'mat' && x.payload.key === 'crystal_chest');
  expect(loots.length).toBe(1);
  expect(xpGot).toBeGreaterThan(0);
  const xp3 = xpGot; xpGot = 0;
  applyTuning({ ...tun, events: { ...tun.events, list: [] } }); (w as any).tickEvents();
  (w as any).rewardKill(p, fox);
  expect(xp3 / Math.max(1e-9, xpGot)).toBeCloseTo(3, 1);
  p.char.materials.crystal_chest = 1;
  const sent: any[] = []; (w as any).sendJson = (_q: any, o: any) => sent.push(o);
  w.onCmd(1, JSON.stringify({ t: 'use', key: 'crystal_chest', req: 'r1' }));
  expect(p.char.materials.crystal_chest).toBe(0);
  expect(sent.find((m) => m.t === 'chestResult')?.title).toBe('Kristal Sandık');
  expect(p.char.gems).toBeGreaterThanOrEqual(DEFAULT_TUNING.events.chest.gems[0]);
});

it('“Hemen başlat” etkinliği sunucu saatiyle başlar (yönetici cihazının saati 1 saat geride olsa da)', async () => {
  const { anchorNowEvents } = await import('../packages/server/src/api.ts');
  const prev = { events: { list: [{ id: 'old', mode: 'now', start: 1000, on: true }] } };
  const skewed = Date.now() - 59 * 60_000; // cihaz saati 59 dk geride
  const next = { events: { list: [
    { id: 'new1', mode: 'now', start: skewed, on: true, kind: 'chest' },      // yeni: sunucu saati
    { id: 'old', mode: 'now', start: 1000, on: true, kind: 'xp' },            // değişmemiş: korunur
    { id: 'day', mode: 'daily', start: 5, on: true, kind: 'xp' },             // günlük: dokunulmaz
  ] } };
  anchorNowEvents(next, prev as any);
  expect(Math.abs(next.events.list[0].start - Date.now())).toBeLessThan(2000);
  expect(next.events.list[1].start).toBe(1000);
  expect(next.events.list[2].start).toBe(5);
  // yeniden başlat (başlangıç değişti) → sunucu saati
  const re = { events: { list: [{ id: 'old', mode: 'now', start: skewed, on: true }] } };
  anchorNowEvents(re, prev as any);
  expect(Math.abs(re.events.list[0].start - Date.now())).toBeLessThan(2000);
});
