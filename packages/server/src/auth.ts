import crypto from 'node:crypto';
import { promisify } from 'node:util';
import { pool } from './db/pool.ts';
import { config } from './config.ts';
import type { Role } from './types.ts';

const scrypt = promisify(crypto.scrypt) as (pw: string, salt: Buffer, len: number, opts: crypto.ScryptOptions) => Promise<Buffer>;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

export async function hashPassword(pw: string): Promise<string> {
  const salt = crypto.randomBytes(16);
  const h = await scrypt(pw, salt, 32, SCRYPT);
  return `s1$${salt.toString('base64')}$${h.toString('base64')}`;
}
export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [v, s, h] = stored.split('$');
  if (v !== 's1') return false;
  const calc = await scrypt(pw, Buffer.from(s, 'base64'), 32, SCRYPT);
  const want = Buffer.from(h, 'base64');
  return want.length === calc.length && crypto.timingSafeEqual(calc, want);
}
export const sha256 = (s: string) => crypto.createHash('sha256').update(s).digest('hex');
export const randomToken = (n = 32) => crypto.randomBytes(n).toString('base64url');

export interface AuthAccount { id: number; username: string; role: Role; earlyAccess: boolean; bannedUntil: Date | null }

/** Oturum belirteci yalnız özeti (sha256) ile saklanır. Kısa süreli bellek önbelleği DB yükünü azaltır. */
const cache = new Map<string, { acc: AuthAccount; at: number }>();
export async function createSession(accountId: number): Promise<string> {
  const token = randomToken();
  await pool.query(`INSERT INTO sessions(token_hash, account_id, expires_at) VALUES ($1,$2, now() + ($3 || ' days')::interval)`, [sha256(token), accountId, String(config.sessionDays)]);
  return token;
}
export async function destroySession(token: string) { cache.delete(sha256(token)); await pool.query('DELETE FROM sessions WHERE token_hash=$1', [sha256(token)]); }
export async function sessionAccount(token: string | undefined): Promise<AuthAccount | null> {
  if (!token || token.length > 128) return null;
  const th = sha256(token);
  const c = cache.get(th);
  if (c && Date.now() - c.at < 30_000) return c.acc;
  const r = await pool.query(`SELECT a.id, a.username, a.role, a.early_access, a.banned_until FROM sessions s JOIN accounts a ON a.id=s.account_id WHERE s.token_hash=$1 AND s.expires_at > now()`, [th]);
  if (!r.rowCount) { cache.delete(th); return null; }
  const row = r.rows[0];
  const acc: AuthAccount = { id: Number(row.id), username: row.username, role: row.role, earlyAccess: row.early_access, bannedUntil: row.banned_until };
  cache.set(th, { acc, at: Date.now() });
  return acc;
}
export function invalidateAccountCache(accountId: number) { for (const [k, v] of cache) if (v.acc.id === accountId) cache.delete(k); }
export const isStaff = (r: Role) => r === 'gm' || r === 'admin' || r === 'owner';
export const isAdmin = (r: Role) => r === 'admin' || r === 'owner';
