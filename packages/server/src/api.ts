import type { ServerResponse } from 'node:http';
import { CLASS_IDS, validateCharacterName, normalizeName, CLASSES, ITEM_TEMPLATES, computeStats, LEVEL_CAP_BASE, type ClassId } from '@col/shared';
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
import type { TuningState } from './tuning.ts';
import { resetCharState } from './worker/world.ts';
import { RateLimiter } from './http.ts';
import os from 'node:os';
import { monitorEventLoopDelay } from 'node:perf_hooks';

const COOKIE = 'col_session';
const loginLimiter = new RateLimiter(0.2, 8); // IP başına
const registerLimiter = new RateLimiter(0.02, 3);
const admissionLimiter = new RateLimiter(1, 5);

export interface ApiDeps { gateway: Gateway; channels: ChannelManager; opening: OpeningState; store: CharacterStore; world: WorldState; tuning: TuningState }

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
    online: d.gateway.online(), serverTime: Date.now(),
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

  // ───────── oyun ayarları (herkes okur; duyuru ve ışık istemcide de kullanılır) ─────────
  r.get('/api/tuning', () => d.tuning.current());
  r.get('/api/admin/tuning', async (req) => { await requireAdmin(req); return { tuning: d.tuning.current(), revision: d.tuning.revision }; });
  r.post('/api/admin/tuning', async (req) => {
    const a = await requireAdmin(req);
    const { tuning, revision } = req.body ?? {};
    const out = await d.tuning.set(tuning, Number(revision), a.id);
    if (!out.ok) throw new HttpError(409, 'Ayarlar bu arada başka bir yönetici tarafından değiştirildi. Sayfayı yenileyip tekrar dene.');
    d.gateway.broadcastTuning(out.tuning);
    return out;
  });

  // ───────── özet ─────────
  r.get('/api/admin/summary', async (req) => {
    await requireAdmin(req);
    const counts = (await pool.query(`SELECT (SELECT count(*) FROM accounts) AS accounts, (SELECT count(*) FROM characters WHERE deleted_at IS NULL) AS chars,
      (SELECT count(*) FROM accounts WHERE created_at > now() - interval '1 day') AS new_accounts,
      (SELECT count(*) FROM characters WHERE last_seen > now() - interval '1 day') AS active_day`)).rows[0];
    const mem = process.memoryUsage();
    return {
      online: d.gateway.online(), capacity: config.realmCapacity,
      channels: d.channels.population.map((p, i) => i === 0 ? null : { id: i, population: p ?? 0, capacity: config.channelCapacity, alive: d.channels.alive(i), elu: d.channels.stats[i]?.elu ?? null }).filter(Boolean),
      accounts: Number(counts.accounts), characters: Number(counts.chars), newAccounts: Number(counts.new_accounts), activeDay: Number(counts.active_day),
      opening: d.opening.state, uptime: Math.round(process.uptime()), heapMB: Math.round(mem.heapUsed / 1048576), rssMB: Math.round(mem.rss / 1048576),
      saveQueue: d.store.queueLength, saveFailures: d.store.failures, load: os.loadavg()[0], freeMemMB: Math.round(os.freemem() / 1048576),
    };
  });

  // ───────── oyuncular ─────────
  r.get('/api/admin/players', async (req) => {
    await requireAdmin(req);
    const q = String(req.query.get('q') ?? '').trim().toLowerCase().slice(0, 40);
    const onlyOnline = req.query.get('online') === '1';
    const online = d.gateway.onlineCharIds();
    const like = '%' + q.replace(/[%_\\]/g, (m) => '\\' + m) + '%';
    const rows = (await pool.query(
      `SELECT c.id, c.name, c.cls, c.level, c.gems, c.map, c.kills, c.last_seen, c.account_id, a.username, a.role, a.banned_until, a.ban_reason,
         COALESCE((SELECT qty FROM materials m WHERE m.char_id=c.id AND m.key='red_potion'), 0) AS potions
       FROM characters c JOIN accounts a ON a.id=c.account_id
       WHERE c.deleted_at IS NULL AND ($1 = '' OR c.name_norm LIKE $2 OR a.username_norm LIKE $2) ${onlyOnline ? 'AND c.id = ANY($3::bigint[])' : ''}
       ORDER BY c.last_seen DESC NULLS LAST, c.level DESC LIMIT 60`,
      onlyOnline ? [q, like, [...online]] : [q, like])).rows;
    return rows.map((x) => {
      const id = Number(x.id);
      const live = d.store.peek(id);
      return {
        id, name: x.name, cls: x.cls, level: live?.level ?? x.level, gems: Number(live?.gems ?? x.gems), potions: Number(live?.materials.red_potion ?? x.potions), map: live?.map ?? x.map,
        kills: Number(live?.kills ?? x.kills), lastSeen: x.last_seen, online: online.has(id), accountId: Number(x.account_id), username: x.username, role: x.role,
        bannedUntil: x.banned_until && new Date(x.banned_until).getTime() > Date.now() ? x.banned_until : null, banReason: x.ban_reason,
      };
    });
  });
  const audit = (actor: number, action: string, detail: unknown) => pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,$2,$3)`, [actor, action, JSON.stringify(detail)]).catch(() => {});
  r.post('/api/admin/player', async (req) => {
    const a = await requireAdmin(req);
    const { id, level, gems, potions } = req.body ?? {};
    const charId = Number(id);
    const num = (v: unknown, lo: number, hi: number) => (v === undefined || v === null || v === '' ? undefined : Math.min(hi, Math.max(lo, Math.round(Number(v)))));
    const patch = { level: num(level, 1, LEVEL_CAP_BASE), gems: num(gems, 0, 1e12), potions: num(potions, 0, 1e7) };
    if (Object.values(patch).every((v) => v === undefined || Number.isNaN(v))) throw new HttpError(400, 'Değişiklik yok.');
    const ch = d.gateway.onlineChannel(charId);
    if (ch) { d.channels.send(ch, { type: 'admin', op: 'set', charId, patch }); await audit(a.id, 'player.set', { charId, patch }); return { ok: true, text: 'Oyunda, anında uygulandı.' }; }
    const c = await d.store.load(charId);
    if (!c) throw new HttpError(404, 'Karakter bulunamadı.');
    if (patch.level !== undefined) { c.level = patch.level; c.xp = 0; c.hp = computeStats({ cls: c.cls, level: c.level, stats: c.stats, equip: c.equip }).maxHp; }
    if (patch.gems !== undefined) c.gems = patch.gems;
    if (patch.potions !== undefined) c.materials.red_potion = patch.potions;
    c.saveVersion++;
    d.store.enqueue(c, true);
    await audit(a.id, 'player.set', { charId, patch });
    return { ok: true, text: 'Kaydedildi (oyuncu çevrimdışı).' };
  });
  r.post('/api/admin/player/reset', async (req) => {
    const a = await requireAdmin(req);
    const charId = Number(req.body?.id);
    const ch = d.gateway.onlineChannel(charId);
    if (ch) { d.channels.send(ch, { type: 'admin', op: 'reset', charId }); await audit(a.id, 'player.reset', { charId }); return { ok: true, text: 'Oyunda sıfırlandı.' }; }
    const c = await d.store.load(charId);
    if (!c) throw new HttpError(404, 'Karakter bulunamadı.');
    resetCharState(c);
    c.hp = computeStats({ cls: c.cls, level: 1, stats: c.stats, equip: c.equip }).maxHp;
    d.store.enqueue(c, true);
    await audit(a.id, 'player.reset', { charId });
    return { ok: true, text: 'Karakter sıfırlandı.' };
  });
  r.post('/api/admin/account', async (req) => {
    const a = await requireAdmin(req);
    const { accountId, role, banHours, banReason, unban } = req.body ?? {};
    const acc = Number(accountId);
    const cur = (await pool.query('SELECT role FROM accounts WHERE id=$1', [acc])).rows[0];
    if (!cur) throw new HttpError(404, 'Hesap bulunamadı.');
    if (acc === a.id) throw new HttpError(400, 'Kendi hesabında bu işlem yapılamaz.');
    if (cur.role === 'owner' || (cur.role === 'admin' && a.role !== 'owner')) throw new HttpError(403, 'Bu hesaba yetkin yetmiyor.');
    if (role !== undefined) {
      if (!['player', 'moderator', 'gm', 'admin'].includes(role)) throw new HttpError(400, 'Geçersiz rol.');
      if (role === 'admin' && a.role !== 'owner') throw new HttpError(403, 'Yönetici rolünü yalnız kurucu verebilir.');
      await pool.query('UPDATE accounts SET role=$2 WHERE id=$1', [acc, role]);
    }
    if (unban) await pool.query('UPDATE accounts SET banned_until=NULL, ban_reason=NULL WHERE id=$1', [acc]);
    else if (banHours) {
      const h = Math.min(24 * 365 * 10, Math.max(1, Number(banHours)));
      await pool.query(`UPDATE accounts SET banned_until=now() + ($2 || ' hours')::interval, ban_reason=$3 WHERE id=$1`, [acc, String(h), String(banReason ?? '').slice(0, 200)]);
      await pool.query('DELETE FROM sessions WHERE account_id=$1', [acc]);
      d.gateway.kickAccount(acc, 'Hesabın askıya alındı.' + (banReason ? ' ' + String(banReason).slice(0, 200) : ''));
    }
    invalidateAccountCache(acc);
    await audit(a.id, 'account.update', { accountId: acc, role, banHours, unban: !!unban });
    return { ok: true };
  });
  r.post('/api/admin/kick', async (req) => {
    const a = await requireAdmin(req);
    const acc = Number(req.body?.accountId);
    d.gateway.kickAccount(acc, String(req.body?.reason ?? 'Yönetici tarafından oyundan çıkarıldın.').slice(0, 200));
    await audit(a.id, 'account.kick', { accountId: acc });
    return { ok: true };
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
