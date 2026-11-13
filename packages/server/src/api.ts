import type { ServerResponse } from 'node:http';
import { CLASS_IDS, validateCharacterName, normalizeName, CLASSES, ITEM_TEMPLATES, type ClassId } from '@col/shared';
import { Router, HttpError, json, type Req } from './http.ts';
import { pool, tx } from './db/pool.ts';
import { hashPassword, verifyPassword, createSession, destroySession, sessionAccount, isStaff, isAdmin, sha256, randomToken, invalidateAccountCache, type AuthAccount } from './auth.ts';
import { initialHp, startPosition } from './store.ts';
import { config } from './config.ts';
import { makeItem } from './worker/world.ts';
import type { Gateway } from './gateway.ts';
import type { ChannelManager } from './channels.ts';
import type { OpeningState } from './opening.ts';
import type { CharacterStore } from './store.ts';
import type { WorldState } from './worldstate.ts';
import { RateLimiter } from './http.ts';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const COOKIE = 'col_session';
const loginLimiter = new RateLimiter(0.2, 8); // IP başına
const registerLimiter = new RateLimiter(0.02, 3);
const admissionLimiter = new RateLimiter(1, 5);

export interface ApiDeps { gateway: Gateway; channels: ChannelManager; opening: OpeningState; store: CharacterStore; world: WorldState }

const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();

async function requireAuth(req: Req): Promise<AuthAccount> {
  const tok = req.cookies[COOKIE] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
  const acc = await sessionAccount(tok);
  if (!acc) throw new HttpError(401, 'Oturum gerekli.');
  if (acc.bannedUntil && new Date(acc.bannedUntil).getTime() > Date.now()) throw new HttpError(403, 'Hesabın askıya alınmış.');
  return acc;
}
async function requireAdmin(req: Req) { const a = await requireAuth(req); if (!isAdmin(a.role)) throw new HttpError(403, 'Yetkin yok.'); return a; }

function setCookie(res: ServerResponse, token: string | null) {
  const secure = config.devMode ? '' : '; Secure';
  res.setHeader('set-cookie', token ? `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${config.sessionDays * 86400}${secure}` : `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

export function buildApi(d: ApiDeps): Router {
  const r = new Router();

  r.get('/api/health', () => ({ ok: true, online: d.gateway.online(), uptime: Math.round(process.uptime()) }));

  r.get('/api/status', () => ({
    opening: { mode: d.opening.state.mode, openAt: d.opening.state.openAt, message: d.opening.state.message },
    online: d.gateway.online(), worldHealth: Math.round(d.world.health * 100) / 100, serverTime: Date.now(),
  }));

  r.post('/api/register', async (req, res) => {
    if (!config.loadTestMode && !registerLimiter.take(req.ip)) throw new HttpError(429, 'Çok fazla kayıt denemesi. Biraz sonra dene.');
    const { username, password, password2, email } = req.body ?? {};
    const u = String(username ?? '').trim();
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) throw new HttpError(400, 'Kullanıcı adı 3–20 karakter; harf, rakam, _ ve . olabilir.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400, 'Parola en az 8 karakter olmalı.');
    if (password !== password2) throw new HttpError(400, 'Parolalar eşleşmiyor.');
    const em = email ? String(email).trim().slice(0, 120) : null;
    if (em && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(em)) throw new HttpError(400, 'E-posta geçersiz.');
    const hash = await hashPassword(password);
    // ilk hesap geliştirme ortamında yönetici olur
    const first = (await pool.query('SELECT 1 FROM accounts LIMIT 1')).rowCount === 0;
    try {
      const ins = await pool.query(`INSERT INTO accounts(username, username_norm, email, pass_hash, role) VALUES ($1,$2,$3,$4,$5) RETURNING id`,
        [u, u.toLowerCase(), em, hash, first && config.devMode ? 'owner' : 'player']);
      const token = await createSession(Number(ins.rows[0].id));
      setCookie(res, token);
      return { ok: true, token };
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Bu kullanıcı adı alınmış.');
      throw e;
    }
  });

  r.post('/api/login', async (req, res) => {
    if (!config.loadTestMode && !loginLimiter.take(req.ip)) throw new HttpError(429, 'Çok fazla giriş denemesi. Biraz bekle.');
    const { username, password } = req.body ?? {};
    const row = (await pool.query('SELECT id, pass_hash, banned_until, ban_reason FROM accounts WHERE username_norm=$1', [String(username ?? '').trim().toLowerCase()])).rows[0];
    if (!row || !(await verifyPassword(String(password ?? ''), row.pass_hash))) throw new HttpError(401, 'Kullanıcı adı veya parola hatalı.');
    if (row.banned_until && new Date(row.banned_until).getTime() > Date.now()) throw new HttpError(403, `Hesabın askıda: ${row.ban_reason ?? ''}`);
    await pool.query('UPDATE accounts SET last_login=now() WHERE id=$1', [row.id]);
    const token = await createSession(Number(row.id));
    setCookie(res, token);
    return { ok: true, token };
  });

  r.post('/api/logout', async (req, res) => {
    const tok = req.cookies[COOKIE];
    if (tok) await destroySession(tok);
    setCookie(res, null);
    return { ok: true };
  });

  /** Parola sıfırlama: tek kullanımlık, 30 dk. E-posta sağlayıcısı yoksa geliştirme modunda kod yanıtta döner (açıkça etiketli). */
  r.post('/api/password/forgot', async (req) => {
    if (!loginLimiter.take('forgot:' + req.ip)) throw new HttpError(429, 'Çok fazla deneme.');
    const u = String(req.body?.username ?? '').trim().toLowerCase();
    const row = (await pool.query('SELECT id FROM accounts WHERE username_norm=$1', [u])).rows[0];
    if (!row) return { ok: true };
    const code = randomToken(9);
    await pool.query(`INSERT INTO password_resets(token_hash, account_id, expires_at) VALUES ($1,$2, now() + interval '30 minutes')`, [sha256(code), row.id]);
    return config.devMode ? { ok: true, devCode: code, note: 'GELİŞTİRME: e-posta sağlayıcısı yapılandırılmadı, kod burada gösteriliyor.' } : { ok: true };
  });
  r.post('/api/password/reset', async (req) => {
    const { code, password } = req.body ?? {};
    if (typeof password !== 'string' || password.length < 8) throw new HttpError(400, 'Parola en az 8 karakter olmalı.');
    const hash = await hashPassword(password);
    const ok = await tx(async (c) => {
      const row = (await c.query(`UPDATE password_resets SET used_at=now() WHERE token_hash=$1 AND used_at IS NULL AND expires_at > now() RETURNING account_id`, [sha256(String(code ?? ''))])).rows[0];
      if (!row) return false;
      await c.query('UPDATE accounts SET pass_hash=$1 WHERE id=$2', [hash, row.account_id]);
      await c.query('DELETE FROM sessions WHERE account_id=$1', [row.account_id]);
      invalidateAccountCache(Number(row.account_id));
      return true;
    });
    if (!ok) throw new HttpError(400, 'Kod geçersiz veya süresi dolmuş.');
    return { ok: true };
  });

  r.get('/api/me', async (req) => {
    const a = await requireAuth(req);
    const chars = await pool.query(`SELECT id, name, cls, level, map FROM characters WHERE account_id=$1 AND deleted_at IS NULL ORDER BY id`, [a.id]);
    return { account: { id: a.id, username: a.username, role: a.role }, characters: chars.rows.map((c) => ({ ...c, id: Number(c.id) })) };
  });

  r.post('/api/characters', async (req) => {
    const a = await requireAuth(req);
    const name = String(req.body?.name ?? '').trim();
    const cls = String(req.body?.cls ?? '') as ClassId;
    const err = validateCharacterName(name);
    if (err) throw new HttpError(400, err);
    if (!CLASS_IDS.includes(cls)) throw new HttpError(400, 'Geçersiz sınıf.');
    const count = (await pool.query('SELECT count(*)::int AS n FROM characters WHERE account_id=$1 AND deleted_at IS NULL', [a.id])).rows[0].n;
    if (count >= 4) throw new HttpError(400, 'Hesap başına en fazla 4 karakter.');
    const pos = startPosition();
    try {
      const id = await tx(async (c) => {
        const ins = await c.query(
          `INSERT INTO characters(account_id, name, name_norm, cls, hp, map, x, y) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
          [a.id, name, normalizeName(name), cls, initialHp(cls), pos.map, pos.x, pos.y]);
        const charId = Number(ins.rows[0].id);
        // başlangıç ekipmanı (beyaz silah + zırh, kuşanılmış)
        for (const tplId of [`w_${cls}`, `a_${cls}`]) {
          const it = makeItem(tplId, 'white', 'starter', 0);
          const slot = ITEM_TEMPLATES.find((t) => t.id === tplId)!.slot;
          await c.query(`INSERT INTO items(id, char_id, tpl, rarity, plus, location, slot, data, source) VALUES ($1,$2,$3,'white',0,'equip',$4,$5,'starter')`, [it.id, charId, tplId, slot, JSON.stringify({ ench: [] })]);
        }
        await c.query(`INSERT INTO materials(char_id, key, qty) VALUES ($1,'red_potion',5)`, [charId]);
        // Ön kayıt / başlangıç sandığı: hesap başına bir defa (makbuz benzersizliği garanti eder)
        const rec = await c.query(`INSERT INTO receipts(key, account_id, char_id, kind) SELECT $1,$2,$3,'starter_chest' FROM accounts WHERE id=$2 AND starter_eligible ON CONFLICT (key) DO NOTHING RETURNING key`, [`starter_chest:${a.id}`, a.id, charId]);
        if (rec.rowCount) await c.query(`INSERT INTO materials(char_id, key, qty) VALUES ($1,'starter_chest',1) ON CONFLICT (char_id,key) DO UPDATE SET qty=materials.qty+1`, [charId]);
        return charId;
      });
      return { ok: true, id };
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Bu karakter adı alınmış.');
      throw e;
    }
  });

  r.get('/api/channels', async (req) => {
    const a = await requireAuth(req);
    const open = d.opening.isOpenFor(a.earlyAccess, isStaff(a.role));
    const list = [];
    for (let ch = 1; ch <= config.channels; ch++) {
      const pop = d.gateway.channelPopulation(ch);
      const alive = d.channels.alive(ch);
      list.push({ id: ch, name: `Kanal ${ch}`, population: pop, capacity: config.channelCapacity, status: !alive ? 'restarting' : d.channels.maintenance[ch] ? 'maintenance' : pop >= config.channelCapacity ? 'full' : pop > config.channelCapacity * 0.7 ? 'busy' : 'ok' });
    }
    return { open: open.ok, reason: open.reason ?? null, channels: list, realm: { name: 'Tuğra Online', online: d.gateway.online(), capacity: config.realmCapacity } };
  });

  /** Kanal girişi: tek bekleyen bilet, istemci nonce'u ile eşleşir (geç gelen eski yanıt yeni seçimi bozmaz). */
  r.post('/api/admission', async (req) => {
    const a = await requireAuth(req);
    if (!admissionLimiter.take(String(a.id))) throw new HttpError(429, 'Biraz yavaş: tekrar dene.');
    const charId = Number(req.body?.characterId), ch = Number(req.body?.channel);
    const nonce = String(req.body?.nonce ?? '').slice(0, 40);
    const open = d.opening.isOpenFor(a.earlyAccess, isStaff(a.role));
    if (!open.ok) throw new HttpError(403, open.reason ?? 'Kapalı.');
    if (!(ch >= 1 && ch <= config.channels)) throw new HttpError(400, 'Geçersiz kanal.');
    if (!d.channels.alive(ch)) throw new HttpError(503, 'Kanal yeniden başlatılıyor, birazdan dene.');
    const own = await pool.query('SELECT 1 FROM characters WHERE id=$1 AND account_id=$2 AND deleted_at IS NULL', [charId, a.id]);
    if (!own.rowCount) throw new HttpError(404, 'Karakter bulunamadı.');
    const already = d.gateway.byAccount.get(a.id);
    const sameChannel = already && already.channel === ch;
    const pop = d.gateway.channelPopulation(ch);
    if (!isStaff(a.role) && !sameChannel && pop >= config.channelCapacity) throw new HttpError(409, 'Kanal dolu. Başka kanal seç.');
    if (!isStaff(a.role) && !already && d.gateway.online() >= config.realmCapacity) throw new HttpError(409, 'Sunucu dolu. Biraz sonra tekrar dene.');
    const ticket = d.gateway.issueTicket({ accountId: a.id, charId, channel: ch, role: a.role, nonce });
    return { ok: true, ticket, nonce, channel: ch };
  });

  // ───────── yönetim (temel) ─────────
  r.get('/api/admin/metrics', async (req) => {
    await requireAdmin(req);
    const load = os.loadavg();
    return {
      at: Date.now(),
      online: d.gateway.online(),
      gateway: d.gateway.stats,
      channels: d.channels.stats.filter(Boolean),
      restarts: d.channels.restarts,
      persistence: { queue: d.store.queueLength, written: d.store.written, stale: d.store.stale, failures: d.store.failures, writeMs: d.store.writeHist.snapshot() },
      mainThread: { eventLoopDelayMs: { p50: eld.percentile(50) / 1e6, p99: eld.percentile(99) / 1e6, max: eld.max / 1e6 }, heapMB: Math.round(process.memoryUsage().heapUsed / 1048576), rssMB: Math.round(process.memoryUsage().rss / 1048576) },
      host: { cpus: os.cpus().length, loadavg: load, freeMemMB: Math.round(os.freemem() / 1048576), note: 'loadavg tüm VDS içindir; kanal ELU tek worker thread yüküdür.' },
      worldHealth: d.world.health,
    };
  });
  r.get('/api/admin/opening', async (req) => { await requireAdmin(req); return d.opening.state; });
  r.post('/api/admin/opening', async (req) => {
    const a = await requireAdmin(req);
    const { mode, openAt, message, revision } = req.body ?? {};
    if (!['closed', 'scheduled', 'open', 'maintenance'].includes(mode)) throw new HttpError(400, 'Geçersiz mod.');
    const r2 = await d.opening.set({ mode, openAt: openAt ? Number(openAt) : null, message: String(message ?? '').slice(0, 300) }, Number(revision), a.id);
    if (!r2.ok) throw new HttpError(409, 'Başka bir yönetici bu ayarı değiştirdi. Sayfayı yenile.');
    return r2.state;
  });

  return r;
}

export async function handleApi(router: Router, req: Req, res: ServerResponse) {
  const route = router.find(req.method, req.path);
  if (!route) return json(res, 404, { error: 'Bulunamadı' });
  // CSRF: durum değiştiren isteklerde aynı köken şartı
  if (req.method !== 'GET') {
    const origin = req.headers.origin;
    const host = req.headers.host;
    if (origin && host && new URL(origin).host !== host && !config.devMode) return json(res, 403, { error: 'Geçersiz köken' });
  }
  try {
    const out = await route.h(req, res);
    if (!res.headersSent) json(res, 200, out ?? { ok: true });
  } catch (e) {
    if (e instanceof HttpError) return json(res, e.status, { error: e.message, code: e.code });
    console.error('[api]', req.method, req.path, e);
    if (!res.headersSent) json(res, 500, { error: 'Sunucu hatası' });
  }
}
