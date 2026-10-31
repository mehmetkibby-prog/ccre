import pg from 'pg';
import { config } from '../config.ts';

export const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 16, idleTimeoutMillis: 30_000, statement_timeout: 10_000 } as pg.PoolConfig);
pool.on('error', (e) => console.error('[db] pool error', e.message));

export async function tx<T>(fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const r = await fn(c);
    await c.query('COMMIT');
    return r;
  } catch (e) {
    await c.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}
