import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { applyTuning, DEFAULT_TUNING, getLayout, EFlag, Anim } from '@col/shared';

const mkW = () => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const sent: any[] = [];
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  (w as any).sendJson = (p: any, o: any) => sent.push({ to: p.char.name, ...o });
  (w as any).now = Date.now();
  return { w, sent };
};
const join = (w: World, sid: number, id: number, name: string, x: number, y: number) => {
  const ch = { id, accountId: id, role: 'player', name, cls: 'guardian', level: 30, xp: 0, hp: 999, map: 'bazaar', x, y, gems: 50, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
  w.join(sid, ch); const p = w.bySid.get(sid)!; p.x = x; p.y = y; return p;
};

it('ölüm: binekten iner, olta toplanır; canlanınca ölü bayrağı ve ölüm animasyonu kalkar', () => {
  const { w, sent } = mkW();
  const l = getLayout('bazaar');
  const p = join(w, 1, 601, 'Ece', l.spawn.x, l.spawn.y);
  p.char.misc.mount = { owned: true, riding: true } as any;
  p.fishing = { token: 'x', fish: 'carp', biteAt: (w as any).now };
  expect(w.playerFlags(p) & EFlag.MOUNTED).toBeTruthy();
  (w as any).killPlayer(p, null);
  expect(p.dead).toBe(true);
  expect(p.char.misc.mount!.riding).toBe(false);
  expect(p.fishing).toBeUndefined();
  expect(p.hp).toBe(0);
  const f = w.playerFlags(p);
  expect(f & EFlag.DEAD).toBeTruthy();
  expect(f & EFlag.MOUNTED).toBeFalsy();
  expect(f & EFlag.FISHING).toBeFalsy();
  expect(sent.some((o) => o.to === 'Ece' && o.t === 'fish_result' && o.ok === false)).toBe(true);
  // burada doğ: bayrak ve animasyon temizlenir, başkalarına gidecek güncellemede işaretli
  (w as any).now += 60_000;
  (w as any).cmdRespawn(p, 'here');
  expect(p.dead).toBe(false);
  expect(p.hp).toBeGreaterThan(0);
  expect(p.anim).toBe(Anim.IDLE);
  expect(w.playerFlags(p) & EFlag.DEAD).toBeFalsy();
});

it('yönetim sıfırlaması ölü oyuncuyu ayağa kaldırır (ölüm animasyonu kalmaz)', () => {
  const { w } = mkW();
  const l = getLayout('bazaar');
  const p = join(w, 2, 602, 'Ada', l.spawn.x, l.spawn.y);
  (w as any).killPlayer(p, null);
  expect(p.anim).toBe(Anim.DEAD);
  expect(w.adminResetPlayer(602)).toBe(true);
  expect(p.dead).toBe(false);
  expect(p.anim).toBe(Anim.IDLE);
});

it('istemci: canlanan oyuncunun ölüm işareti silinir; ölü olan, canavar ya da canı 0 olan dokunulmaz', async () => {
  const { clearReviveState } = await import('../packages/client/src/game/entstate.ts');
  const { Kind } = await import('@col/shared');
  const ply = { kind: Kind.PLAYER, hp: 150, flags: 0, deadAt: 1000, anim: Anim.DEAD, animStart: 0 };
  expect(clearReviveState(ply, 5000)).toBe(true);
  expect(ply.deadAt).toBe(0); expect(ply.anim).toBe(Anim.IDLE); expect(ply.animStart).toBe(5000);
  const stillDead = { kind: Kind.PLAYER, hp: 0, flags: EFlag.DEAD, deadAt: 1000, anim: Anim.DEAD, animStart: 0 };
  expect(clearReviveState(stillDead, 5000)).toBe(false); expect(stillDead.deadAt).toBe(1000);
  const flagged = { kind: Kind.PLAYER, hp: 50, flags: EFlag.DEAD, deadAt: 1000, anim: Anim.DEAD, animStart: 0 };
  expect(clearReviveState(flagged, 5000)).toBe(false);
  const mon = { kind: Kind.MONSTER, hp: 10, flags: 0, deadAt: 1000, anim: Anim.DEAD, animStart: 0 };
  expect(clearReviveState(mon, 5000)).toBe(false);
});

it('ışınlanınca olta toplanır (uzakta balık tamamlanamaz)', () => {
  const { w, sent } = mkW();
  const l = getLayout('bazaar');
  const p = join(w, 3, 603, 'Naz', l.spawn.x, l.spawn.y);
  p.fishing = { token: 'tok', fish: 'carp', biteAt: (w as any).now };
  expect(w.playerFlags(p) & EFlag.FISHING).toBeTruthy();
  (w as any).moveToZone(p, (w as any).zones.get('bazaar'), l.spawn.x + 300, l.spawn.y);
  expect(p.fishing).toBeUndefined();
  expect(w.playerFlags(p) & EFlag.FISHING).toBeFalsy();
  expect(sent.some((o) => o.to === 'Naz' && o.t === 'fish_result' && o.ok === false)).toBe(true);
});
