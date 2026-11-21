import { it, expect } from 'vitest';
import { World } from '../packages/server/src/worker/world.ts';
import { captchaAnswerForTest } from '../packages/server/src/captcha.ts';
import { getLayout, applyTuning, DEFAULT_TUNING } from '@col/shared';

const mk = (role = 'player') => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const posts: any[] = [], sent: any[] = [];
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: (m) => posts.push(m) });
  (w as any).sendJson = (_p: any, o: any) => sent.push(o);
  const l = getLayout('bazaar');
  const ch = { id: 91, accountId: 1, role, name: 'Botcu', cls: 'guardian', level: 10, xp: 0, hp: 999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y, gems: 0, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: {}, misc: {}, saveVersion: 1 } as any;
  w.join(1, ch);
  return { w, p: w.bySid.get(1)!, posts, sent, ch };
};

it('Bot doğrulaması: zamanı gelince sorulur, savaş/oto av kilitlenir; doğru kodla açılır, sonraki ~1 saat sonra', () => {
  const { w, p, sent, ch } = mk();
  (w as any).now = Date.now();
  (w as any).tickBotChecks();
  expect(p.botCheck).toBeNull(); // ilk girişte hemen sorulmaz
  expect(ch.misc.botNext - (w as any).now).toBeGreaterThan(50 * 60_000);
  ch.misc.botNext = 0; (w as any).tickBotChecks();
  const q = sent.find((o) => o.t === 'botcheck');
  expect(q?.svg).toContain('<svg'); expect(p.botCheck).not.toBeNull(); expect(ch.misc.botDue).toBe(true);
  // beklerken saldırı ve oto av reddedilir
  sent.length = 0;
  w.onCmd(1, JSON.stringify({ t: 'auto', on: true }));
  expect(p.autoOn).toBe(false);
  expect(sent.some((o) => o.t === 'notice' && /doğrulama/i.test(o.text))).toBe(true);
  // yanlış kod: hak düşer, yeni kod gelir
  const id1 = p.botCheck!.id;
  w.onCmd(1, JSON.stringify({ t: 'botcheck', id: id1, a: 'ZZZZZ' }));
  expect(p.botCheck!.tries).toBe(1); expect(p.botCheck!.id).not.toBe(id1);
  // doğru kod
  const id2 = p.botCheck!.id, ans = captchaAnswerForTest(id2)!;
  w.onCmd(1, JSON.stringify({ t: 'botcheck', id: id2, a: ans.toLowerCase() }));
  expect(p.botCheck).toBeNull(); expect(ch.misc.botDue).toBe(false);
  expect(ch.misc.botNext - (w as any).now).toBeGreaterThan(50 * 60_000);
  w.onCmd(1, JSON.stringify({ t: 'auto', on: true }));
  expect(p.autoOn).toBe(true);
});

it('Bot doğrulaması: süre dolar ya da 5 kez yanlış girilirse oyundan çıkarılır; çıkıp girmek atlatmaz; yönetim muaf', () => {
  const a = mk();
  a.ch.misc.botNext = 0; (a.w as any).now = Date.now(); (a.w as any).tickBotChecks();
  (a.w as any).now += 5 * 60_000 + 1000; (a.w as any).tickBotChecks();
  expect(a.posts.some((m) => m.type === 'kick')).toBe(true);
  // bekleyen doğrulama kayıtta kalır: yeniden girişte hemen sorulur
  const b = mk(); b.ch.misc.botDue = true; b.ch.misc.botNext = Date.now() + 3e6; (b.w as any).now = Date.now(); (b.w as any).tickBotChecks();
  expect(b.p.botCheck).not.toBeNull();
  for (let i = 0; i < 5; i++) b.w.onCmd(1, JSON.stringify({ t: 'botcheck', id: b.p.botCheck?.id, a: 'QQQQQ' }));
  expect(b.posts.some((m) => m.type === 'kick')).toBe(true);
  const g = mk('gm'); g.ch.misc.botNext = 0; (g.w as any).now = Date.now(); (g.w as any).tickBotChecks();
  expect(g.p.botCheck).toBeNull();
});
