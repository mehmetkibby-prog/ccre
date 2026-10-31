import fs from 'node:fs';
import path from 'node:path';
import { pool } from './pool.ts';

export async function migrate(): Promise<string[]> {
  const dir = new URL('./migrations/', import.meta.url).pathname;
  await pool.query('CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TIMESTAMPTZ NOT NULL DEFAULT now())');
  const done = new Set((await pool.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
  const applied: string[] = [];
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    if (done.has(f)) continue;
    const sql = fs.readFileSync(path.join(dir, f), 'utf8');
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      await c.query(sql);
      await c.query('INSERT INTO schema_migrations(name) VALUES ($1)', [f]);
      await c.query('COMMIT');
      applied.push(f);
    } catch (e) {
      await c.query('ROLLBACK');
      throw new Error(`migration ${f} failed: ${(e as Error).message}`);
    } finally { c.release(); }
  }
  return applied;
}

if (process.argv[1] && process.argv[1].endsWith('migrate.ts')) {
  migrate().then((a) => { console.log('applied:', a.length ? a : 'none'); return pool.end(); }).catch((e) => { console.error(e); process.exit(1); });
}
