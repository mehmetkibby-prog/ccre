import { describe, it, expect, beforeAll, afterAll } from 'vitest';
process.env.DATABASE_URL = 'postgres://col:col_dev_pw@127.0.0.1:5432/coreoflife_test';
const { pool } = await import('../packages/server/src/db/pool.ts');
const { migrate } = await import('../packages/server/src/db/migrate.ts');
const { CharacterStore } = await import('../packages/server/src/store.ts');
const { makeItem } = await import('../packages/server/src/worker/world.ts');

let charId = 0;
beforeAll(async () => {
  await migrate();
  const a = await pool.query(`INSERT INTO accounts(username, username_norm, pass_hash) VALUES ($1,$1,'x') RETURNING id`, ['t' + Date.now()]);
  const c = await pool.query(`INSERT INTO characters(account_id, name, name_norm, cls) VALUES ($1,$2,$2,'hunter') RETURNING id`, [a.rows[0].id, 'c' + Date.now()]);
  charId = Number(c.rows[0].id);
});
afterAll(async () => { await pool.end(); });

describe('kalıcılık', () => {
  it('geç gelen eski kayıt yeni durumu ezmez; eşya tek sahipli', async () => {
    const s = new CharacterStore();
    const base = (await s.load(charId))!;
    const sword = makeItem('w_hunter', 'blue', 't');
    const v5 = { ...structuredClone(base), saveVersion: 5, gems: 500, bag: [sword] };
    const v3 = { ...structuredClone(base), saveVersion: 3, gems: 999999, bag: [] };
    s.enqueue(v5); await s.flush();
    // önbellekteki daha yeni sürüm, eski kaydı kuyruğa bile almaz
    s.enqueue(v3); await s.flush();
    // doğrudan DB'ye eski sürüm yazma denemesi (başka süreçten gelmiş gibi)
    const s2 = new CharacterStore();
    s2.enqueue(v3); await s2.flush();
    const r = await pool.query('SELECT gems, save_version FROM characters WHERE id=$1', [charId]);
    expect(Number(r.rows[0].gems)).toBe(500);
    expect(Number(r.rows[0].save_version)).toBe(5);
    const items = await pool.query('SELECT char_id FROM items WHERE id=$1', [sword.id]);
    expect(items.rowCount).toBe(1);
    expect(s2.stale).toBe(1);
  });
  it('eşya başka karaktere geçince eski sahipte kalmaz (UUID tekil)', async () => {
    const s = new CharacterStore();
    const c = (await s.load(charId))!;
    expect(c.bag.length).toBe(1);
    const moved = c.bag[0];
    const a2 = await pool.query(`INSERT INTO accounts(username, username_norm, pass_hash) VALUES ($1,$1,'x') RETURNING id`, ['u' + Date.now()]);
    const c2 = await pool.query(`INSERT INTO characters(account_id, name, name_norm, cls) VALUES ($1,$2,$2,'hunter') RETURNING id`, [a2.rows[0].id, 'd' + Date.now()]);
    const other = (await new CharacterStore().load(Number(c2.rows[0].id)))!;
    const s3 = new CharacterStore();
    s3.enqueue({ ...other, bag: [moved], saveVersion: other.saveVersion + 1 });
    s3.enqueue({ ...c, bag: [], saveVersion: c.saveVersion + 1 });
    await s3.flush();
    const rows = await pool.query('SELECT char_id FROM items WHERE id=$1', [moved.id]);
    expect(rows.rowCount).toBe(1);
    expect(Number(rows.rows[0].char_id)).toBe(Number(c2.rows[0].id));
  });
});
