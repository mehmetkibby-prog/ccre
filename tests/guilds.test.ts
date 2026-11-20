import { it, expect, beforeAll, afterAll } from 'vitest';
process.env.DATABASE_URL = 'postgres://col:col_dev_pw@127.0.0.1:5432/coreoflife_test';
const { pool } = await import('../packages/server/src/db/pool.ts');
const { migrate } = await import('../packages/server/src/db/migrate.ts');
const { Guilds } = await import('../packages/server/src/guilds.ts');

const ids: number[] = [];
const tag = Date.now().toString(36);
beforeAll(async () => {
  await migrate();
  for (let i = 0; i < 4; i++) {
    const a = await pool.query(`INSERT INTO accounts(username, username_norm, pass_hash) VALUES ($1,$1,'x') RETURNING id`, [`g${tag}${i}`]);
    const c = await pool.query(`INSERT INTO characters(account_id, name, name_norm, cls, level) VALUES ($1,$2,$2,'guardian',30) RETURNING id`, [a.rows[0].id, `G${tag}${i}`]);
    ids.push(Number(c.rows[0].id));
  }
});
afterAll(async () => { await pool.query(`DELETE FROM guilds WHERE name LIKE 'Test%'`); await pool.end(); });

it('Lonca: kur (bedel kanalda), davet, katıl, vergi, ayar, savaş puanı ve sonucu', async () => {
  const sent: Record<number, any[]> = {}; const workers: any[] = []; const gives: any[] = []; const ann: string[] = [];
  const sess = ids.map((id, i) => ({ sid: 100 + i, charId: id, accountId: 1000 + i, name: `G${tag}${i}`, cls: 'guardian', channel: 1 }));
  const G = new Guilds({
    byChar: (c) => sess.find((s) => s.charId === c), byName: (n) => sess.find((s) => s.name.toLowerCase() === n.toLowerCase()),
    send: (c, o) => (sent[c] ??= []).push(o), toWorker: (_ch, m) => workers.push(m), toAllWorkers: (m) => workers.push(m), give: (c, g) => gives.push([c, g]), announce: (t) => ann.push(t),
  });
  await G.load();
  const [A, B, C, D] = sess;
  const name1 = `Test ${tag.slice(-6)}`, name2 = `Testb ${tag.slice(-5)}`;
  await G.handle(A, { op: 'create', name: name1, emblem: 3 });
  const charge = workers.find((m) => m.type === 'guild_charge');
  expect(charge?.gems).toBe(1000);
  await G.onCharged(charge.req, true);
  expect(G.tagOf(A.charId)?.name).toBe(name1);
  // aynı ad: reddedilir
  await G.handle(C, { op: 'create', name: name1.toLocaleUpperCase('tr'), emblem: 1 });
  expect(sent[C.charId].some((o) => o.t === 'notice' && /Bu adda/.test(o.text))).toBe(true);
  // davet → katıl
  await G.handle(A, { op: 'invite', name: B.name });
  expect(sent[B.charId].some((o) => o.t === 'guildInvite')).toBe(true);
  await G.handle(B, { op: 'accept', level: 25 });
  expect(G.tagOf(B.charId)?.gid).toBe(G.tagOf(A.charId)?.gid);
  // loncadakine davet gitmez
  await G.handle(A, { op: 'invite', name: B.name });
  expect(sent[A.charId].some((o) => o.t === 'notice' && /zaten bir loncada/.test(o.text))).toBe(true);
  // üye ayar değiştiremez; lider değiştirir
  await G.handle(B, { op: 'settings', tax: 15 });
  expect(G.tagOf(A.charId)?.tax).toBe(0);
  await G.handle(A, { op: 'settings', tax: 50, emblem: 7, notice: 'merhaba' });
  expect(G.tagOf(A.charId)?.tax).toBe(20); expect(G.tagOf(A.charId)?.emblem).toBe(7);
  // vergi → hazine
  const gid = G.tagOf(A.charId)!.gid;
  G.onTax([[gid, B.charId, 40], [gid, A.charId, 10]]);
  await G.flush();
  expect(Number((await pool.query('SELECT bank FROM guilds WHERE id=$1', [gid])).rows[0].bank)).toBe(50);
  // ikinci lonca, savaş
  await G.handle(C, { op: 'create', name: name2, emblem: 0 });
  const ch2 = workers.filter((m) => m.type === 'guild_charge').at(-1);
  await G.onCharged(ch2.req, true);
  await G.handle(C, { op: 'invite', name: D.name }); await G.handle(D, { op: 'accept', level: 30 });
  const gid2 = G.tagOf(C.charId)!.gid;
  await G.handle(A, { op: 'war', gid: gid2 });
  await G.handle(C, { op: 'war_accept' });
  const wl = workers.filter((m) => m.type === 'gwar').at(-1);
  expect(wl.wars.length).toBe(1);
  const w = wl.wars[0];
  // başlamadan öldürme sayılmaz
  G.onWarKill(A.charId, C.charId);
  (G as any).wars.get(w.id).startAt = Date.now() - 1;
  G.onWarKill(A.charId, C.charId); G.onWarKill(B.charId, D.charId); G.onWarKill(D.charId, A.charId);
  G.onWarKill(A.charId, B.charId); // aynı lonca: sayılmaz
  expect((G as any).wars.get(w.id).score).toEqual([2, 1]);
  (G as any).wars.get(w.id).endsAt = Date.now() - 1;
  await G.tick();
  expect((G as any).wars.size).toBe(0);
  expect(ann.some((t) => t.includes('Kazanan: ' + name1))).toBe(true);
  expect(Number((await pool.query('SELECT wins FROM guilds WHERE id=$1', [gid])).rows[0].wins)).toBe(1);
  // lider hazineden çeker
  await G.handle(A, { op: 'withdraw', amount: 30 });
  expect(gives.some(([c, g]) => c === A.charId && g.kind === 'essence' && g.qty === 30)).toBe(true);
  // lider üye varken ayrılamaz; dağıtınca etiketler silinir
  await G.handle(A, { op: 'leave' });
  expect(G.tagOf(A.charId)).not.toBeNull();
  await G.handle(A, { op: 'disband' });
  expect(G.tagOf(A.charId)).toBeNull(); expect(G.tagOf(B.charId)).toBeNull();
  // yeniden yükleme: ikinci lonca DB'den gelir
  const G2 = new Guilds({ byChar: () => undefined, byName: () => undefined, send: () => {}, toWorker: () => {}, toAllWorkers: () => {}, give: () => {}, announce: () => {} });
  await G2.load();
  expect(G2.tagOf(D.charId)?.name).toBe(name2);
});
