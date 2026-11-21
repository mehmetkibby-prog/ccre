import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { applyTuning, DEFAULT_TUNING, PVP_RING, inPvpRing, getLayout, EFlag } from '@col/shared';

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

it('Kan Meydanı: içerideki iki oyuncu vuruşur (kırmızı ad), dışarıdakine vurulamaz; günlük tablo sayar, gemi kaybı yok', () => {
  const { w, sent } = mkW();
  const cx = (PVP_RING.tx + 0.5) * 64, cy = (PVP_RING.ty + 0.5) * 64;
  expect(inPvpRing('bazaar', cx, cy)).toBe(true);
  // meydan alanı yürünebilir
  const l = getLayout('bazaar');
  expect(l.blocked[PVP_RING.ty * l.w + PVP_RING.tx]).toBe(0);
  const a = join(w, 1, 501, 'Ali', cx - 60, cy), b = join(w, 2, 502, 'Veli', cx + 60, cy), c = join(w, 3, 503, 'Can', l.spawn.x, l.spawn.y);
  expect((w as any).canPvp(a, b)).toBe(true);
  expect((w as any).canPvp(a, c)).toBe(false);
  expect((w as any).canPvp(c, a)).toBe(false);
  expect(w.playerFlags(a) & EFlag.PVP).toBeTruthy();
  expect(w.playerFlags(c) & EFlag.PVP).toBeFalsy();
  // giriş bildirimi: tablo gelir
  (w as any).ringTick(a);
  expect(sent.some((o) => o.to === 'Ali' && o.t === 'ring')).toBe(true);
  const gems = b.char.gems;
  (w as any).killPlayer(b, a);
  expect(b.char.gems).toBe(gems);
  const msg = sent.filter((o) => o.t === 'ring').pop();
  expect(msg.board[0]).toEqual({ name: 'Ali', n: 1 });
  // aynı kişiyi 60 sn içinde tekrar öldürmek sayılmaz
  b.dead = false; b.hp = b.stats.maxHp;
  (w as any).killPlayer(b, a);
  expect((w as any).ring.kills.get(501).n).toBe(1);
});
