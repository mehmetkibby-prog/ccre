import { it, expect, beforeAll, afterAll } from 'vitest';
process.env.DATABASE_URL = 'postgres://col:col_dev_pw@127.0.0.1:5432/coreoflife_test';
const { pool } = await import('../packages/server/src/db/pool.ts');
const { migrate } = await import('../packages/server/src/db/migrate.ts');
const { buildApi } = await import('../packages/server/src/api.ts');
const { World } = await import('../packages/server/src/worker/world.ts');
const { getLayout, applyTuning, DEFAULT_TUNING, charBuffs, cosmeticByte, petCode, PREREG_REWARD } = await import('@col/shared');

const opening = { state: { mode: 'closed', openAt: null, message: '', revision: 0 }, isOpenFor: () => ({ ok: true }) };
const deps: any = { opening, gateway: { online: () => 0, byAccount: new Map(), channelPopulation: () => 0, issueTicket: () => 'tk' }, channels: { alive: () => true, maintenance: {} }, store: {}, world: { health: 1 }, tuning: {} };
let api: ReturnType<typeof buildApi>;
const call = async (method: string, path: string, body: any = {}, token?: string, query = '') => {
  const route = api.find(method, path);
  if (!route) throw new Error('rota yok ' + path);
  const res: any = { setHeader() {} };
  const req: any = { method, path, query: new URLSearchParams(query), headers: {}, ip: '10.0.0.' + Math.floor(Math.random() * 250), body, cookies: token ? { col_session: token } : {}, raw: {} };
  try { return { ok: true, v: await route.h(req, res) as any }; } catch (e: any) { return { ok: false, status: e.status, msg: e.message }; }
};
const uniq = () => Date.now().toString(36) + Math.floor(Math.random() * 1e6).toString(36);

beforeAll(async () => { await migrate(); api = buildApi(deps); });
afterAll(async () => { await pool.end(); });

it('Kayıt: e-posta zorunlu ve tekil; oyun açılmadan açılan hesap ön kayıtlı', async () => {
  const u = 'pr' + uniq(), em = u + '@ornek.com';
  expect((await call('POST', '/api/register', { username: u, password: 'parola123', password2: 'parola123' })).status).toBe(400);
  expect((await call('POST', '/api/register', { username: u, password: 'parola123', password2: 'parola123', email: 'bozuk' })).status).toBe(400);
  const r = await call('POST', '/api/register', { username: u, password: 'parola123', password2: 'parola123', email: em.toUpperCase(), accept: true });
  expect(r.ok).toBe(true);
  const row = (await pool.query('SELECT prereg, email FROM accounts WHERE username_norm=$1', [u])).rows[0];
  expect(row.prereg).toBe(true); expect(row.email).toBe(em);
  // aynı e-posta başka kullanıcı adıyla
  const dup = await call('POST', '/api/register', { username: u + 'x', password: 'parola123', password2: 'parola123', email: em, accept: true });
  expect(dup.status).toBe(409);
  // oyun açıldıktan sonra açılan hesap ön kayıtlı değil
  opening.state.mode = 'open';
  const u2 = 'pr' + uniq();
  await call('POST', '/api/register', { username: u2, password: 'parola123', password2: 'parola123', email: u2 + '@ornek.com', accept: true });
  expect((await pool.query('SELECT prereg FROM accounts WHERE username_norm=$1', [u2])).rows[0].prereg).toBe(false);
  opening.state.mode = 'closed';
});

it('Ön Kayıt Sandığı hesap başına bir kez gelir; açınca 15 Mücevher + kalıcı Yeşil Tilki (+10 saldırı, +200 can)', async () => {
  const u = 'ps' + uniq();
  const { v } = await call('POST', '/api/register', { username: u, password: 'parola123', password2: 'parola123', email: u + '@ornek.com', accept: true });
  const c1 = await call('POST', '/api/characters', { name: 'On' + uniq().slice(-6), cls: 'guardian' }, v.token);
  const c2 = await call('POST', '/api/characters', { name: 'Ik' + uniq().slice(-6), cls: 'hunter' }, v.token);
  expect(c1.ok && c2.ok).toBe(true);
  const q = async (id: number) => Number((await pool.query(`SELECT qty FROM materials WHERE char_id=$1 AND key='prereg_chest'`, [id])).rows[0]?.qty ?? 0);
  expect(await q(c1.v.id)).toBe(1);
  expect(await q(c2.v.id)).toBe(0);
  // ön kayıtlı olmayan hesaba gelmez
  opening.state.mode = 'open';
  const u3 = 'pn' + uniq();
  const r3 = await call('POST', '/api/register', { username: u3, password: 'parola123', password2: 'parola123', email: u3 + '@ornek.com', accept: true });
  const c3 = await call('POST', '/api/characters', { name: 'Yo' + uniq().slice(-6), cls: 'arcanist' }, r3.v.token);
  expect(await q(c3.v.id)).toBe(0);
  opening.state.mode = 'closed';

  // sandığı aç (oyun dünyası)
  applyTuning(structuredClone(DEFAULT_TUNING));
  const l = getLayout('bazaar');
  const ch = { id: 77, accountId: 1, role: 'player', name: 'Sandikci', cls: 'guardian', level: 10, xp: 0, hp: 999, map: 'bazaar', x: l.spawn.x, y: l.spawn.y,
    gems: 100, essence: 0, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0, bag: [], equip: {}, materials: { prereg_chest: 1 }, misc: {}, saveVersion: 1 } as any;
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, ch); const p = w.bySid.get(1)!;
  const sent: any[] = []; (w as any).sendJson = (_q: any, o: any) => sent.push(o);
  const atk0 = p.stats.atk, hp0 = p.stats.maxHp;
  w.onCmd(1, JSON.stringify({ t: 'use', key: 'prereg_chest', req: 'r1' }));
  expect(p.char.gems).toBe(100 + PREREG_REWARD.gems);
  expect(p.char.materials.prereg_chest).toBe(0);
  expect(p.char.materials.pet_fox).toBe(1);
  expect(sent.find((o) => o.t === 'chestResult')?.title).toBe('Ön Kayıt Sandığı');
  const b = charBuffs(p.char.misc.buffs, Date.now());
  expect(b.atkFlat).toBe(10); expect(b.hpFlat).toBe(200);
  expect(p.stats.atk).toBeGreaterThan(atk0); expect(p.stats.maxHp).toBe(hp0 + 200);
  expect(petCode(cosmeticByte(p.char.misc.buffs, Date.now()))).toBe(4); // diğer oyuncular tilkiyi görür
  // dinlenmeye gönder / tekrar çağır (tükenmez)
  w.onCmd(1, JSON.stringify({ t: 'use', key: 'pet_fox', req: 'r2' }));
  expect(charBuffs(p.char.misc.buffs, Date.now()).atkFlat).toBe(0);
  expect(p.stats.maxHp).toBe(hp0);
  w.onCmd(1, JSON.stringify({ t: 'use', key: 'pet_fox', req: 'r3' }));
  expect(charBuffs(p.char.misc.buffs, Date.now()).hpFlat).toBe(200);
  expect(p.char.materials.pet_fox).toBe(1);
});

it('Forum: oyuncu duyuru açamaz; genel bölümde konu/yanıt; kilit, sabitleme ve silme yönetimde', async () => {
  const mk = async (role = 'player') => {
    const u = 'fo' + uniq();
    const r = await call('POST', '/api/register', { username: u, password: 'parola123', password2: 'parola123', email: u + '@ornek.com', accept: true });
    if (role !== 'player') await pool.query('UPDATE accounts SET role=$2 WHERE username_norm=$1', [u, role]);
    return { name: u, token: r.v.token as string };
  };
  const pl = await mk(), ad = await mk('admin');
  expect((await call('POST', '/api/forum/topic', { cat: 'duyurular', title: 'Benim duyurum', body: 'deneme' }, pl.token)).status).toBe(403);
  expect((await call('POST', '/api/forum/topic', { cat: 'genel', title: 'Selam', body: 'x' })).status).toBe(401);
  const ann = await call('POST', '/api/forum/topic', { cat: 'duyurular', title: 'Ön kayıt başladı', body: 'Herkese merhaba!' }, ad.token);
  expect(ann.ok).toBe(true);
  const t = await call('POST', '/api/forum/topic', { cat: 'genel', title: '  Muhafız   kurulumu?  ', body: 'Hangi efsunlar iyi?\n\n<script>alert(1)</script>' }, pl.token);
  expect(t.ok).toBe(true);
  const rep = await call('POST', '/api/forum/reply', { topic: t.v.id, body: 'Ok savunması al.' }, ad.token);
  expect(rep.ok).toBe(true);
  const list = await call('GET', '/api/forum/topics', {}, undefined, 'cat=genel');
  const mine = list.v.topics.find((x: any) => x.id === t.v.id);
  expect(mine.title).toBe('Muhafız kurulumu?'); expect(mine.replies).toBe(1); expect(mine.lastUser).toBe(ad.name);
  expect(list.v.canPost).toBe(false); // giriş yapmadan
  const view = await call('GET', '/api/forum/topic', {}, pl.token, 'id=' + t.v.id);
  expect(view.v.posts.length).toBe(2);
  expect(view.v.posts[0].body).toContain('<script>'); // düz metin saklanır, istemci düz metin basar
  expect(view.v.posts[0].canEdit).toBe(true); expect(view.v.posts[1].canEdit).toBe(false);
  // oyuncu moderasyon yapamaz
  expect((await call('POST', '/api/forum/mod', { op: 'lock', topic: t.v.id }, pl.token)).status).toBe(403);
  // kilitle: oyuncu yanıt yazamaz, yönetim yazabilir
  expect((await call('POST', '/api/forum/mod', { op: 'lock', topic: t.v.id }, ad.token)).ok).toBe(true);
  expect((await call('POST', '/api/forum/reply', { topic: t.v.id, body: 'kilitli mi?' }, pl.token)).status).toBe(403);
  // sabitle: listede en üstte
  await call('POST', '/api/forum/mod', { op: 'pin', topic: t.v.id }, ad.token);
  const list2 = await call('GET', '/api/forum/topics', {}, undefined, 'cat=genel');
  expect(list2.v.topics[0].id).toBe(t.v.id); expect(list2.v.topics[0].pinned).toBe(true);
  // yanıtı sil: yanıt sayısı düşer
  await call('POST', '/api/forum/mod', { op: 'delete_post', post: rep.v.id }, ad.token);
  const view2 = await call('GET', '/api/forum/topic', {}, undefined, 'id=' + t.v.id);
  expect(view2.v.posts.length).toBe(1); expect(view2.v.topic.replies).toBe(0);
  // konuyu sil: listeden çıkar, oyuncu göremez
  await call('POST', '/api/forum/mod', { op: 'delete_topic', topic: t.v.id }, ad.token);
  expect((await call('GET', '/api/forum/topic', {}, pl.token, 'id=' + t.v.id)).status).toBe(404);
  const cats = await call('GET', '/api/forum/cats');
  expect(cats.v.cats.find((c: any) => c.id === 'duyurular').staffOnly).toBe(true);
});
