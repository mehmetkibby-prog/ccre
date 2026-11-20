import { it, expect, beforeAll, afterAll } from 'vitest';
process.env.DATABASE_URL = 'postgres://col:col_dev_pw@127.0.0.1:5432/coreoflife_test';
const { pool } = await import('../packages/server/src/db/pool.ts');
const { migrate } = await import('../packages/server/src/db/migrate.ts');
const { CharacterStore } = await import('../packages/server/src/store.ts');
const { World, makeItem } = await import('../packages/server/src/worker/world.ts');
const { getLayout, applyTuning, DEFAULT_TUNING, STORAGE_PAGE_SLOTS, STORAGE_BASE_PAGES, STORAGE_MAX_PAGES, BAG_EQUIP_CAP, TILE } = await import('@col/shared');

/** Rauf'un yanında (ya da uzakta) Pazar Köyü'nde bir karakter */
const setup = (near = true) => {
  applyTuning(structuredClone(DEFAULT_TUNING));
  const l = getLayout('bazaar'), r = l.npcs.find((n) => n.id === 'rauf')!;
  const ch = { id: 1, accountId: 1, role: 'player', name: 'Depocu', cls: 'hunter', level: 20, xp: 0, hp: 99999, map: 'bazaar', x: near ? r.x + 40 : r.x + 2000, y: r.y + 10,
    gems: 5000, essence: 300, cp: 0, arenaCoin: 0, stats: { str: 0, res: 0, vit: 0 }, skills: [1, 1, 1, 1, 1, 1], spec: null, kills: 0,
    bag: [makeItem('w_hunter', 'blue', 't'), makeItem('earring', 'crimson', 't')], equip: {}, materials: { red_potion: 50, kor_seal: 7, xp_ring: 2 }, misc: {}, saveVersion: 1 } as any;
  const w = new World({ channel: 1, aoiMaxPlayers: 48, saveIntervalMs: 15000, post: () => {} });
  w.join(1, ch); const p = w.bySid.get(1)!;
  const sent: any[] = []; (w as any).sendJson = (q: any, o: any) => { if (q === p) sent.push(o); };
  const cmd = (c: any) => w.onCmd(1, JSON.stringify({ t: 'storage', ...c }));
  const last = () => [...sent].reverse().find((o) => o.t === 'storage');
  return { w, p, ch: p.char, cmd, sent, last };
};
void TILE;

it('Depo: eşya çantadan depoya ve geri; tek yerde, kopyalanmaz', () => {
  const g = setup();
  const [a, b] = g.ch.bag;
  g.cmd({ op: 'open' });
  expect(g.last().cap).toBe(STORAGE_PAGE_SLOTS * STORAGE_BASE_PAGES);
  g.cmd({ op: 'put_item', id: a.id });
  expect(g.ch.bag.map((x: any) => x.id)).toEqual([b.id]);
  expect(g.ch.storage.map((x: any) => x.id)).toEqual([a.id]);
  // aynı eşyayı ikinci kez koymak: çantada yok → değişmez
  g.cmd({ op: 'put_item', id: a.id });
  expect(g.ch.storage.length).toBe(1); expect(g.ch.bag.length).toBe(1);
  g.cmd({ op: 'take_item', id: a.id });
  expect(g.ch.storage.length).toBe(0); expect(g.ch.bag.map((x: any) => x.id).sort()).toEqual([a.id, b.id].sort());
  g.cmd({ op: 'take_item', id: a.id }); // depoda yok
  expect(g.ch.bag.length).toBe(2);
});

it('Depo: kapasite dolunca koymaz; çanta doluyken almaz; Ek Depo Sayfası kapasiteyi artırır', () => {
  const g = setup();
  const cap = STORAGE_PAGE_SLOTS * STORAGE_BASE_PAGES;
  g.ch.bag = Array.from({ length: BAG_EQUIP_CAP }, () => makeItem('earring', 'blue', 't'));
  g.ch.storage = Array.from({ length: cap }, () => makeItem('bracelet', 'blue', 't'));
  const before = g.ch.bag[0].id;
  g.cmd({ op: 'put_item', id: before });
  expect(g.ch.storage.length).toBe(cap); expect(g.ch.bag.length).toBe(BAG_EQUIP_CAP);
  g.cmd({ op: 'take_item', id: g.ch.storage[0].id }); // çanta dolu
  expect(g.ch.storage.length).toBe(cap);
  // sayfa ekle
  g.ch.materials.storage_page = 10;
  for (let i = 0; i < 10; i++) g.w.onCmd(1, JSON.stringify({ t: 'use', key: 'storage_page', req: 'sp' + i }));
  expect(g.ch.misc.vault.pages).toBe(STORAGE_MAX_PAGES - STORAGE_BASE_PAGES); // en çok
  expect(g.ch.materials.storage_page).toBe(10 - (STORAGE_MAX_PAGES - STORAGE_BASE_PAGES));
  g.cmd({ op: 'put_item', id: before });
  expect(g.ch.storage.length).toBe(cap + 1);
  expect(g.last().cap).toBe(STORAGE_PAGE_SLOTS * STORAGE_MAX_PAGES);
});

it('Depo: malzeme, Nesne Market eşyası, Mücevher ve Öz kısmen bırakılır/alınır, fazlası olmaz', () => {
  const g = setup();
  g.cmd({ op: 'put_mat', key: 'red_potion', n: 20 });
  g.cmd({ op: 'put_mat', key: 'xp_ring', n: 99 }); // elindekinden fazla: hepsi (2)
  g.cmd({ op: 'put_mat', key: 'yok_boyle', n: 1 });
  expect(g.ch.materials.red_potion).toBe(30); expect(g.ch.materials.xp_ring).toBeUndefined();
  expect(g.ch.misc.vault.mats).toEqual({ red_potion: 20, xp_ring: 2 });
  g.cmd({ op: 'take_mat', key: 'red_potion', n: 5 });
  expect(g.ch.materials.red_potion).toBe(35); expect(g.ch.misc.vault.mats.red_potion).toBe(15);
  g.cmd({ op: 'put_mat', key: 'red_potion', n: -5 }); g.cmd({ op: 'take_mat', key: 'red_potion', n: 'abc' });
  expect(g.ch.materials.red_potion).toBe(35);
  g.cmd({ op: 'put_cur', cur: 'gems', n: 4000 }); g.cmd({ op: 'put_cur', cur: 'essence', n: 1000 });
  expect(g.ch.gems).toBe(1000); expect(g.ch.misc.vault.gems).toBe(4000);
  expect(g.ch.essence).toBe(0); expect(g.ch.misc.vault.essence).toBe(300);
  g.cmd({ op: 'take_cur', cur: 'gems', n: 10_000 });
  expect(g.ch.gems).toBe(5000); expect(g.ch.misc.vault.gems).toBeUndefined();
  g.cmd({ op: 'put_cur', cur: 'cp', n: 5 }); // yalnız mücevher/öz
  expect(g.ch.cp).toBe(0);
  // toplam korunur
  expect(g.ch.materials.red_potion + g.ch.misc.vault.mats.red_potion).toBe(50);
});

it('Depo: Rauf\'tan uzakta çalışmaz', () => {
  const g = setup(false);
  const a = g.ch.bag[0];
  g.cmd({ op: 'put_item', id: a.id }); g.cmd({ op: 'put_cur', cur: 'gems', n: 100 });
  expect(g.ch.bag.length).toBe(2); expect(g.ch.gems).toBe(5000);
  expect(g.sent.some((o) => o.t === 'notice' && /Rauf/.test(o.text))).toBe(true);
});

let charId = 0;
beforeAll(async () => {
  await migrate();
  const a = await pool.query(`INSERT INTO accounts(username, username_norm, pass_hash) VALUES ($1,$1,'x') RETURNING id`, ['st' + Date.now()]);
  const c = await pool.query(`INSERT INTO characters(account_id, name, name_norm, cls) VALUES ($1,$2,$2,'hunter') RETURNING id`, [a.rows[0].id, 'st' + Date.now()]);
  charId = Number(c.rows[0].id);
});
afterAll(async () => { await pool.end(); });

it('Depo kalıcı: veritabanına yazılır, yeniden yüklenince aynen gelir; eşya çanta ile depo arasında çoğalmaz', async () => {
  const s = new CharacterStore();
  const base = (await s.load(charId))!;
  const w1 = makeItem('w_hunter', 'crimson', 't'), w2 = makeItem('necklace', 'orange', 't');
  const v = { ...structuredClone(base), saveVersion: 2, bag: [w1], storage: [w2], misc: { vault: { mats: { kor_seal: 4 }, gems: 777, essence: 12, pages: 1 } } };
  s.enqueue(v as any); await s.flush();
  const back = (await new CharacterStore().load(charId))!;
  expect(back.bag.map((x) => x.id)).toEqual([w1.id]);
  expect(back.storage!.map((x) => x.id)).toEqual([w2.id]);
  expect(back.storage![0].rarity).toBe('orange');
  expect(back.misc.vault).toEqual({ mats: { kor_seal: 4 }, gems: 777, essence: 12, pages: 1 });
  // depodan çantaya alınıp kaydedilince depoda kalmaz
  const v2 = { ...structuredClone(back), saveVersion: 3, bag: [w1, w2], storage: [] };
  const s2 = new CharacterStore(); s2.enqueue(v2 as any); await s2.flush();
  const rows = await pool.query(`SELECT id, location FROM items WHERE char_id=$1 ORDER BY id`, [charId]);
  expect(rows.rows.filter((r) => r.id === w2.id).map((r) => r.location)).toEqual(['bag']);
  const back2 = (await new CharacterStore().load(charId))!;
  expect(back2.storage!.length).toBe(0); expect(back2.bag.length).toBe(2);
});
