import crypto from 'node:crypto';
import type { ServerResponse } from 'node:http';
import { validEmail, CLASS_IDS, validateCharacterName, normalizeName, CLASSES, ITEM_TEMPLATES, computeStats, LEVEL_CAP_BASE, ITEM_TPL, RARITIES, MAX_PLUS, MATERIAL, MALL, RANK_MAX, RUNE_MAX_LEVEL, isRuneKind, type ClassId } from '@col/shared';
import { Router, HttpError, json, type Req } from './http.ts';
import { pool, tx } from './db/pool.ts';
import { newCaptcha, checkCaptcha } from './captcha.ts';
import { hashPassword, verifyPassword, createSession, destroySession, sessionAccount, isStaff, isAdmin, sha256, randomToken, invalidateAccountCache, type AuthAccount } from './auth.ts';
import { initialHp, startPosition } from './store.ts';
import { config } from './config.ts';
import { makeItem, applyGive } from './worker/world.ts';
import type { AdminGive } from './types.ts';
import type { Gateway } from './gateway.ts';
import type { ChannelManager } from './channels.ts';
import type { OpeningState } from './opening.ts';
import type { CharacterStore } from './store.ts';
import type { WorldState } from './worldstate.ts';
import type { TuningState } from './tuning.ts';
import { resetCharState } from './worker/world.ts';
import { RateLimiter } from './http.ts';
import os from 'node:os';
import { monitorEventLoopDelay, performance } from 'node:perf_hooks';
import { LoadMon, cpuProfile } from './loadmon.ts';
import { registerForum } from './forum.ts';

const COOKIE = 'col_session';
const loginLimiter = new RateLimiter(0.2, 8); // IP başına
const registerLimiter = new RateLimiter(0.02, 3);
const captchaLimiter = new RateLimiter(0.5, 12); // IP başına doğrulama kodu görseli
const admissionLimiter = new RateLimiter(1, 5);

export interface ApiDeps { gateway: Gateway; channels: ChannelManager; opening: OpeningState; store: CharacterStore; world: WorldState; tuning: TuningState; rankings?: import('./rankings.ts').Rankings }

const eld = monitorEventLoopDelay({ resolution: 10 });
eld.enable();
/** ana işlemin canlı yükü (yönetim > Durum > Canlı işlem yükü) */
export const mainLoad = new LoadMon();
/**
 * "Hemen başlat" etkinlikleri sunucu saatiyle başlar: yeni eklenen, yeniden başlatılan ya da yeniden açılan "now"
 * etkinliğinin başlangıcı sunucunun şimdiki zamanı olur. Yönetici cihazının saati sunucudan farklıysa (ör. 1 saat)
 * etkinlik sunucuda hemen bitiyor ya da hiç başlamıyordu.
 */
export function anchorNowEvents(next: unknown, prev: { events?: { list: { id: string; start: number; on: boolean; mode: string }[] } }) {
  const list = (next as { events?: { list?: unknown } } | null)?.events?.list;
  if (!Array.isArray(list)) return;
  const old = new Map((prev.events?.list ?? []).map((e) => [e.id, e] as const));
  const now = Date.now();
  for (const raw of list) {
    const e = raw as { id?: string; start?: number; on?: boolean; mode?: string };
    if (!e || e.mode !== 'now') continue;
    const p = e.id ? old.get(e.id) : undefined;
    if (!p || p.mode !== 'now' || p.start !== e.start || (!p.on && e.on !== false)) e.start = now;
  }
}
const PROFILE_MS = 60_000, PROFILE_KEEP_MS = 5 * 60_000;
interface ProfileJob { id: number; target: string; label: string; startedAt: number; endsAt: number; state: 'running' | 'ready' | 'error'; data?: string; err?: string; readyAt?: number }
let profile: ProfileJob | null = null, profileSeq = 0;
function profileView() {
  if (profile && profile.state !== 'running' && (profile.readyAt ?? 0) + PROFILE_KEEP_MS < Date.now()) profile = null; // hazır dosya 5 dk saklanır
  if (!profile) return null;
  const { data, ...v } = profile;
  return { ...v, sizeKB: data ? Math.round(data.length / 1024) : 0, expiresAt: profile.readyAt ? profile.readyAt + PROFILE_KEEP_MS : null };
}

async function requireAuth(req: Req): Promise<AuthAccount> {
  const tok = req.cookies[COOKIE] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
  const acc = await sessionAccount(tok);
  if (!acc) throw new HttpError(401, 'Oturum gerekli.');
  if (acc.bannedUntil && new Date(acc.bannedUntil).getTime() > Date.now()) throw new HttpError(403, 'Hesabın askıya alınmış.');
  return acc;
}
/** Oturum varsa hesap, yoksa null (forum okuma gibi herkese açık uçlar) */
async function optionalAuth(req: Req): Promise<AuthAccount | null> {
  const tok = req.cookies[COOKIE] ?? (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : undefined);
  if (!tok) return null;
  const acc = await sessionAccount(tok).catch(() => null);
  if (!acc || (acc.bannedUntil && new Date(acc.bannedUntil).getTime() > Date.now())) return null;
  return acc;
}
async function requireAdmin(req: Req) { const a = await requireAuth(req); if (!isAdmin(a.role)) throw new HttpError(403, 'Yetkin yok.'); return a; }

function setCookie(res: ServerResponse, token: string | null) {
  const secure = config.devMode ? '' : '; Secure';
  res.setHeader('set-cookie', token ? `${COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${config.sessionDays * 86400}${secure}` : `${COOKIE}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secure}`);
}

/** Ön kayıt sandığı: ön kayıtlı hesabın bir karakterine, hesap başına bir kez (makbuz tekilliği garanti eder). */
async function grantPrereg(c: import('pg').PoolClient, accountId: number, charId: number): Promise<boolean> {
  const rec = await c.query(`INSERT INTO receipts(key, account_id, char_id, kind) SELECT $1,$2,$3,'prereg_chest' FROM accounts WHERE id=$2 AND prereg ON CONFLICT (key) DO NOTHING RETURNING key`, [`prereg_chest:${accountId}`, accountId, charId]);
  if (rec.rowCount) await c.query(`INSERT INTO materials(char_id, key, qty) VALUES ($1,'prereg_chest',1) ON CONFLICT (char_id,key) DO UPDATE SET qty=materials.qty+1`, [charId]);
  return !!rec.rowCount;
}
/** ön kayıt sayısı (sitede gösterilir; 60 sn önbellek) */
let preregCache = { n: 0, at: 0 };
async function preregCount() {
  if (Date.now() - preregCache.at < 60_000) return preregCache.n;
  try { preregCache = { n: Number((await pool.query('SELECT count(*)::int AS n FROM accounts WHERE prereg')).rows[0].n), at: Date.now() }; } catch { /* tablo yoksa 0 */ }
  return preregCache.n;
}

export function buildApi(d: ApiDeps): Router {
  const r = new Router();

  registerForum(r, requireAuth, optionalAuth);

  r.get('/api/health', () => ({ ok: true, online: d.gateway.online(), uptime: Math.round(process.uptime()) }));

  r.get('/api/status', async () => ({
    opening: { mode: d.opening.state.mode, openAt: d.opening.state.openAt, message: d.opening.state.message },
    // oyundaki oyuncu sayısı herkese açık değil (yalnız yönetim panelinde)
    worldHealth: Math.round(d.world.health * 100) / 100, serverTime: Date.now(),
  }));

  /** Kayıt doğrulama kodu (bot koruması): görsel SVG, kod sunucuda */
  r.get('/api/captcha', async (req) => {
    if (!config.loadTestMode && !captchaLimiter.take(req.ip)) throw new HttpError(429, 'Çok sık istek. Biraz bekle.');
    return newCaptcha();
  });

  r.post('/api/register', async (req, res) => {
    if (!config.loadTestMode && !registerLimiter.take(req.ip)) throw new HttpError(429, 'Çok fazla kayıt denemesi. Biraz sonra dene.');
    const { username, password, password2, email } = req.body ?? {};
    const u = String(username ?? '').trim();
    if (!/^[A-Za-z0-9_.]{3,20}$/.test(u)) throw new HttpError(400, 'Kullanıcı adı 3–20 karakter; harf, rakam, _ ve . olabilir.');
    if (typeof password !== 'string' || password.length < 8 || password.length > 128) throw new HttpError(400, 'Parola en az 8 karakter olmalı.');
    if (password !== password2) throw new HttpError(400, 'Parolalar eşleşmiyor.');
    // e-posta zorunlu (hesap kurtarma ve duyurular için); bir adres yalnız bir hesapta
    const em = String(email ?? '').trim().toLowerCase();
    if (!em) throw new HttpError(400, 'E-posta adresi zorunlu.');
    if (!validEmail(em)) throw new HttpError(400, 'E-posta adresi geçersiz.');
    if (req.body?.accept !== true && req.body?.accept !== undefined) throw new HttpError(400, 'Gizlilik politikasını onaylaman gerekiyor.');
    if (req.body?.website) throw new HttpError(400, 'Kayıt yapılamadı.'); // görünmez tuzak alanı: yalnız botlar doldurur
    if (!config.loadTestMode && !checkCaptcha(req.body?.captchaId, req.body?.captcha)) throw new HttpError(400, 'Doğrulama kodu hatalı ya da süresi doldu. Yeni kodu yaz.');
    if ((await pool.query('SELECT 1 FROM accounts WHERE lower(email)=$1 LIMIT 1', [em])).rowCount) throw new HttpError(409, 'Bu e-posta adresiyle açılmış bir hesap var.');
    const hash = await hashPassword(password);
    // ilk hesap geliştirme ortamında yönetici olur
    const first = (await pool.query('SELECT 1 FROM accounts LIMIT 1')).rowCount === 0;
    // oyun açılmadan açılan hesap ön kayıtlıdır: ilk karakterine Ön Kayıt Sandığı gelir
    const prereg = d.opening.state.mode !== 'open';
    try {
      const ins = await pool.query(`INSERT INTO accounts(username, username_norm, email, pass_hash, role, prereg) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
        [u, u.toLowerCase(), em, hash, first && config.devMode ? 'owner' : 'player', prereg]);
      const token = await createSession(Number(ins.rows[0].id));
      setCookie(res, token);
      return { ok: true, token, prereg, canEnter: d.opening.isOpenFor(false, false, false).ok };
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Bu kullanıcı adı alınmış.');
      throw e;
    }
  });

  r.post('/api/login', async (req, res) => {
    if (!config.loadTestMode && !loginLimiter.take(req.ip)) throw new HttpError(429, 'Çok fazla giriş denemesi. Biraz bekle.');
    const { username, password } = req.body ?? {};
    const row = (await pool.query('SELECT id, pass_hash, banned_until, ban_reason, role, early_access, test_access FROM accounts WHERE username_norm=$1', [String(username ?? '').trim().toLowerCase()])).rows[0];
    if (!row || !(await verifyPassword(String(password ?? ''), row.pass_hash))) throw new HttpError(401, 'Kullanıcı adı veya parola hatalı.');
    if (row.banned_until && new Date(row.banned_until).getTime() > Date.now()) throw new HttpError(403, `Hesabın askıda: ${row.ban_reason ?? ''}`);
    await pool.query('UPDATE accounts SET last_login=now() WHERE id=$1', [row.id]);
    const token = await createSession(Number(row.id));
    setCookie(res, token);
    // oyun kapalıyken yalnız yönetimin izin verdiği hesaplar oyuna girer (öteki hesaplar foruma girebilir, oyunu bekler)
    return { ok: true, token, canEnter: d.opening.isOpenFor(!!row.early_access, isStaff(row.role), !!row.test_access).ok };
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
    // ön kayıt: hesap işaretli mi, sandık bir karaktere verildi mi
    const pr = (await pool.query(`SELECT a.prereg, EXISTS (SELECT 1 FROM receipts r WHERE r.key = 'prereg_chest:' || a.id) AS got FROM accounts a WHERE a.id=$1`, [a.id])).rows[0];
    const gate = d.opening.isOpenFor(a.earlyAccess, isStaff(a.role), a.testAccess);
    return { account: { id: a.id, username: a.username, role: a.role, prereg: !!pr?.prereg, preregGranted: !!pr?.got, canEnter: gate.ok, waitMsg: gate.ok ? undefined : gate.reason }, characters: chars.rows.map((c) => ({ ...c, id: Number(c.id) })) };
  });

  r.post('/api/characters', async (req) => {
    const a = await requireAuth(req);
    if (!d.opening.isOpenFor(a.earlyAccess, isStaff(a.role), a.testAccess).ok) throw new HttpError(403, 'Oyun henüz açılmadı. Ön kaydın alındı; açılışta karakterini oluşturabileceksin.');
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
        await grantPrereg(c, a.id, charId);
        return charId;
      });
      return { ok: true, id };
    } catch (e: any) {
      if (e.code === '23505') throw new HttpError(409, 'Bu karakter adı alınmış.');
      throw e;
    }
  });

  /** Sıralamalar: seviye ilk 10, dönemlik canavar avcıları ilk 10 ve ödüller. */
  r.get('/api/rankings', async (req) => {
    await requireAuth(req);
    if (!d.rankings) throw new HttpError(503, 'Sıralama hazır değil.');
    return d.rankings.get();
  });

  r.get('/api/channels', async (req) => {
    const a = await requireAuth(req);
    const open = d.opening.isOpenFor(a.earlyAccess, isStaff(a.role), a.testAccess);
    const list = [];
    for (let ch = 1; ch <= config.channels; ch++) {
      const pop = d.gateway.channelPopulation(ch);
      const alive = d.channels.alive(ch);
      list.push({ id: ch, name: `Kanal ${ch}`, population: pop, capacity: config.channelCapacity, status: !alive ? 'restarting' : d.channels.maintenance[ch] ? 'maintenance' : pop >= config.channelCapacity ? 'full' : pop > config.channelCapacity * 0.7 ? 'busy' : 'ok' });
    }
    return { open: open.ok, reason: open.reason ?? null, channels: list, realm: { name: 'Core of Life 3D', online: d.gateway.online(), capacity: config.realmCapacity } };
  });

  /** Kanal girişi: tek bekleyen bilet, istemci nonce'u ile eşleşir (geç gelen eski yanıt yeni seçimi bozmaz). */
  r.post('/api/admission', async (req) => {
    const a = await requireAuth(req);
    if (!admissionLimiter.take(String(a.id))) throw new HttpError(429, 'Biraz yavaş: tekrar dene.');
    const charId = Number(req.body?.characterId), ch = Number(req.body?.channel);
    const nonce = String(req.body?.nonce ?? '').slice(0, 40);
    const open = d.opening.isOpenFor(a.earlyAccess, isStaff(a.role), a.testAccess);
    if (!open.ok) throw new HttpError(403, open.reason ?? 'Kapalı.');
    if (!(ch >= 1 && ch <= config.channels)) throw new HttpError(400, 'Geçersiz kanal.');
    if (!d.channels.alive(ch)) throw new HttpError(503, 'Kanal yeniden başlatılıyor, birazdan dene.');
    const own = await pool.query('SELECT 1 FROM characters WHERE id=$1 AND account_id=$2 AND deleted_at IS NULL', [charId, a.id]);
    if (!own.rowCount) throw new HttpError(404, 'Karakter bulunamadı.');
    const already = d.gateway.byAccount.get(a.id);
    // ön kayıt sandığı daha önce açılmış karakterlere de: karakter oyunda değilken (oyundaysa kayıt üstüne yazılırdı)
    if (!already && await tx((c) => grantPrereg(c, a.id, charId))) {
      // karakter yakın zamanda oyundaysa önbellekteki kopyası sonra yazılır: sandık oradan da silinmesin
      const live = d.store.peek?.(charId); if (live) live.materials.prereg_chest = Math.max(1, live.materials.prereg_chest ?? 0);
    }
    const sameChannel = already && already.channel === ch;
    const pop = d.gateway.channelPopulation(ch);
    if (!isStaff(a.role) && !sameChannel && pop >= config.channelCapacity) throw new HttpError(409, 'Kanal dolu. Başka kanal seç.');
    if (!isStaff(a.role) && !already && d.gateway.online() >= config.realmCapacity) throw new HttpError(409, 'Sunucu dolu. Biraz sonra tekrar dene.');
    const ticket = d.gateway.issueTicket({ accountId: a.id, charId, channel: ch, role: a.role, nonce });
    return { ok: true, ticket, nonce, channel: ch, ...(config.directWs ? { direct: config.directWs } : {}) };
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
  // ───────── canlı işlem yükü, CPU profili, sohbet akışı ─────────
  d.gateway.onProfile = (ch, m) => {
    if (!profile || profile.id !== m.id || profile.state !== 'running') return;
    if (m.data) { profile.state = 'ready'; profile.data = m.data; } else { profile.state = 'error'; profile.err = m.err ?? 'Profil alınamadı.'; }
    profile.readyAt = Date.now();
  };
  r.get('/api/admin/load', async (req) => {
    await requireAdmin(req);
    const mm = mainLoad.snapshot();
    const procs = [
      { id: 'main', name: 'Ana işlem', alive: true, elu: mm.elu, delayMs: mm.delayMs, memMB: mm.rssMB, memKind: 'RSS', players: d.gateway.online(), cap: config.realmCapacity, jobs: mm.jobs, note: 'Bağlantılar, giriş/kayıt, dünya ve ticaret sohbeti, kayıt yazma; RSS bütün işlemindir (kanallar dahil).' },
      ...d.channels.population.map((pop, i) => {
        if (i === 0) return null;
        const st = d.channels.stats[i], ld = st?.load, alive = d.channels.alive(i), fresh = !!st && Date.now() - st.at < 8000;
        return { id: 'ch' + i, name: `Kanal ${i}`, alive: alive && fresh, elu: ld?.elu ?? st?.elu ?? 0, delayMs: ld?.delayMs ?? 0, memMB: ld?.heapMB ?? st?.heapMB ?? 0, memKind: 'Yığın', players: pop ?? 0, cap: config.channelCapacity, jobs: ld?.jobs ?? [], tickP95: st?.tick.p95 ?? 0, monsters: st?.awakeMonsters ?? 0, restarts: d.channels.restarts[i] ?? 0 };
      }).filter(Boolean),
    ];
    return { at: Date.now(), procs, profile: profileView(), host: { cpus: os.cpus().length, load1: os.loadavg()[0], freeMemMB: Math.round(os.freemem() / 1048576), totalMemMB: Math.round(os.totalmem() / 1048576) } };
  });
  r.post('/api/admin/profile', async (req) => {
    await requireAdmin(req);
    const v = profileView();
    if (v?.state === 'running') throw new HttpError(409, `Şu an ${v.label} ölçülüyor; aynı anda tek süreç ölçülür.`);
    const target = String(req.body?.target ?? 'main');
    const ch = target === 'main' ? 0 : Number(target.replace(/^ch/, ''));
    if (target !== 'main' && !(ch >= 1 && d.channels.alive(ch))) throw new HttpError(400, 'Bu kanal şu an çalışmıyor.');
    const id = ++profileSeq, now = Date.now();
    profile = { id, target, label: ch ? `Kanal ${ch}` : 'Ana işlem', startedAt: now, endsAt: now + PROFILE_MS, state: 'running' };
    const done = (data?: string, err?: string) => { if (profile?.id !== id || profile.state !== 'running') return; if (data) { profile.state = 'ready'; profile.data = data; } else { profile.state = 'error'; profile.err = err; } profile.readyAt = Date.now(); };
    if (!ch) cpuProfile(PROFILE_MS).then((x) => done(x), (e) => done(undefined, String(e?.message ?? e)));
    else d.channels.send(ch, { type: 'profile', id, ms: PROFILE_MS });
    setTimeout(() => done(undefined, 'Süreç yanıt vermedi (yeniden başlamış olabilir).'), PROFILE_MS + 20_000).unref();
    return profileView();
  });
  r.get('/api/admin/profile/file', async (req, res) => {
    await requireAdmin(req);
    profileView();
    if (!profile?.data) throw new HttpError(404, 'Hazır profil yok (5 dakika saklanır).');
    const stamp = new Date(profile.startedAt).toISOString().slice(0, 16).replace(/[:T]/g, '-');
    res.writeHead(200, { 'content-type': 'application/json', 'cache-control': 'no-store', 'content-disposition': `attachment; filename="coreoflife-${profile.target}-${stamp}.cpuprofile"` });
    res.end(profile.data);
  });
  r.get('/api/admin/chat', async (req) => {
    await requireAdmin(req);
    const after = Number(req.query.get('after') ?? 0) || 0;
    return { msgs: d.gateway.chatLog.filter((m) => m.id > after).slice(-200) };
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
  r.get('/api/admin/tuning', async (req) => { await requireAdmin(req); return { tuning: d.tuning.current(), revision: d.tuning.revision, now: Date.now() }; });
  r.post('/api/admin/tuning', async (req) => {
    const a = await requireAdmin(req);
    const { tuning, revision } = req.body ?? {};
    anchorNowEvents(tuning, d.tuning.current());
    const out = await d.tuning.set(tuning, Number(revision), a.id);
    if (!out.ok) throw new HttpError(409, 'Ayarlar bu arada başka bir yönetici tarafından değiştirildi. Sayfayı yenileyip tekrar dene.');
    d.gateway.broadcastTuning(out.tuning);
    return { ...out, now: Date.now() };
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
      opening: d.opening.state, worldHealth: Math.round(d.world.health * 100) / 100, topDonors: d.world.top(5), uptime: Math.round(process.uptime()), heapMB: Math.round(mem.heapUsed / 1048576), rssMB: Math.round(mem.rss / 1048576),
      saveQueue: d.store.queueLength, saveFailures: d.store.failures, load: os.loadavg()[0], freeMemMB: Math.round(os.freemem() / 1048576),
    };
  });

  r.post('/api/admin/world', async (req) => {
    const a = await requireAdmin(req);
    const v = Number(req.body?.health);
    if (!Number.isFinite(v)) throw new HttpError(400, 'Geçersiz değer.');
    d.world.set(v); d.gateway.broadcastWorld();
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,'world.set',$2)`, [a.id, JSON.stringify({ health: v })]).catch(() => {});
    return { ok: true, health: d.world.health };
  });

  // ───────── oyuncular ─────────
  r.get('/api/admin/players', async (req) => {
    await requireAdmin(req);
    const q = String(req.query.get('q') ?? '').trim().toLowerCase().slice(0, 40);
    const onlyOnline = req.query.get('online') === '1';
    const online = d.gateway.onlineCharIds();
    const like = '%' + q.replace(/[%_\\]/g, (m) => '\\' + m) + '%';
    const rows = (await pool.query(
      `SELECT c.id, c.name, c.cls, c.level, c.gems, c.cp, c.map, c.kills, c.last_seen, c.account_id, a.username, a.role, a.banned_until, a.ban_reason,
         COALESCE((SELECT qty FROM materials m WHERE m.char_id=c.id AND m.key='red_potion'), 0) AS potions
       FROM characters c JOIN accounts a ON a.id=c.account_id
       WHERE c.deleted_at IS NULL AND ($1 = '' OR c.name_norm LIKE $2 OR a.username_norm LIKE $2) ${onlyOnline ? 'AND c.id = ANY($3::bigint[])' : ''}
       ORDER BY c.last_seen DESC NULLS LAST, c.level DESC LIMIT 60`,
      onlyOnline ? [q, like, [...online]] : [q, like])).rows;
    return rows.map((x) => {
      const id = Number(x.id);
      const live = d.store.peek(id);
      return {
        id, name: x.name, cls: x.cls, level: live?.level ?? x.level, gems: Number(live?.gems ?? x.gems), cp: Number(live?.cp ?? x.cp), potions: Number(live?.materials.red_potion ?? x.potions), map: live?.map ?? x.map,
        kills: Number(live?.kills ?? x.kills), lastSeen: x.last_seen, online: online.has(id), accountId: Number(x.account_id), username: x.username, role: x.role,
        bannedUntil: x.banned_until && new Date(x.banned_until).getTime() > Date.now() ? x.banned_until : null, banReason: x.ban_reason,
      };
    });
  });
  const audit = (actor: number, action: string, detail: unknown) => pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,$2,$3)`, [actor, action, JSON.stringify(detail)]).catch(() => {});
  r.post('/api/admin/player', async (req) => {
    const a = await requireAdmin(req);
    const { id, level, gems, potions, cp } = req.body ?? {};
    const charId = Number(id);
    const num = (v: unknown, lo: number, hi: number) => (v === undefined || v === null || v === '' ? undefined : Math.min(hi, Math.max(lo, Math.round(Number(v)))));
    const patch = { level: num(level, 1, LEVEL_CAP_BASE), gems: num(gems, 0, 1e12), potions: num(potions, 0, 1e7), cp: num(cp, 0, 1e9) };
    if (Object.values(patch).every((v) => v === undefined || Number.isNaN(v))) throw new HttpError(400, 'Değişiklik yok.');
    const ch = d.gateway.onlineChannel(charId);
    if (ch) { d.channels.send(ch, { type: 'admin', op: 'set', charId, patch }); await audit(a.id, 'player.set', { charId, patch }); return { ok: true, text: 'Oyunda, anında uygulandı.' }; }
    const c = await d.store.load(charId);
    if (!c) throw new HttpError(404, 'Karakter bulunamadı.');
    if (patch.level !== undefined) { c.level = patch.level; c.xp = 0; c.hp = computeStats({ cls: c.cls, level: c.level, stats: c.stats, equip: c.equip }).maxHp; }
    if (patch.gems !== undefined) c.gems = patch.gems;
    if (patch.potions !== undefined) c.materials.red_potion = patch.potions;
    if (patch.cp !== undefined) c.cp = patch.cp;
    c.saveVersion++;
    d.store.enqueue(c, true);
    await audit(a.id, 'player.set', { charId, patch });
    return { ok: true, text: 'Kaydedildi (oyuncu çevrimdışı).' };
  });
  /** ÇP ekle: çevrimiçiyse anında, değilse kayda. (E-PIN ile de aynı yol kullanılır.) */
  const addCp = async (charId: number, amount: number) => {
    const ch = d.gateway.onlineChannel(charId);
    if (ch) { d.channels.send(ch, { type: 'admin', op: 'addcp', charId, amount }); return true; }
    const c = await d.store.load(charId);
    if (!c) return false;
    c.cp = Math.max(0, c.cp + amount); c.saveVersion++; d.store.enqueue(c, true);
    return true;
  };
  r.post('/api/admin/cp', async (req) => {
    const a = await requireAdmin(req);
    const charId = Number(req.body?.id), amount = Math.round(Number(req.body?.amount));
    if (!Number.isFinite(amount) || amount === 0 || Math.abs(amount) > 1e7) throw new HttpError(400, 'Geçersiz miktar.');
    if (!(await addCp(charId, amount))) throw new HttpError(404, 'Karakter bulunamadı.');
    await audit(a.id, 'player.cp', { charId, amount });
    return { ok: true, text: `${amount > 0 ? '+' : ''}${amount.toLocaleString('tr-TR')} ÇP gönderildi.` };
  });
  /** Oyuncuya eşya / malzeme / Nesne Market ürünü ver */
  r.post('/api/admin/give', async (req) => {
    const a = await requireAdmin(req);
    const charId = Number(req.body?.id), b = req.body ?? {};
    let g: AdminGive;
    if (b.kind === 'item') {
      if (!ITEM_TPL.has(String(b.tpl)) || !(RARITIES as string[]).includes(String(b.rarity))) throw new HttpError(400, 'Geçersiz eşya.');
      g = { kind: 'item', tpl: String(b.tpl), rarity: String(b.rarity), plus: Math.max(0, Math.min(MAX_PLUS, Math.round(Number(b.plus) || 0))) };
    } else if (b.kind === 'mat') {
      const key = String(b.key), qty = Math.round(Number(b.qty));
      if (!(MATERIAL.has(key) || MALL.has(key)) || !(qty >= 1 && qty <= 99999)) throw new HttpError(400, 'Geçersiz malzeme ya da adet.');
      g = { kind: 'mat', key, qty };
    } else if (b.kind === 'rank') {
      const r = Math.round(Number(b.r));
      if (!(r >= 0 && r <= RANK_MAX)) throw new HttpError(400, 'Geçersiz rütbe.');
      g = { kind: 'rank', r };
    } else if (b.kind === 'rune') {
      const lv = Math.round(Number(b.lv));
      if (!isRuneKind(b.k) || !(lv >= 1 && lv <= RUNE_MAX_LEVEL)) throw new HttpError(400, 'Geçersiz rün.');
      g = { kind: 'rune', k: b.k, lv };
    } else throw new HttpError(400, 'Geçersiz tür.');
    const ch = d.gateway.onlineChannel(charId);
    let text: string;
    if (ch) { d.channels.send(ch, { type: 'admin', op: 'give', charId, give: g }); text = 'Gönderildi (oyuncu çevrimiçi, çantasına düştü).'; }
    else {
      const c = await d.store.load(charId);
      if (!c) throw new HttpError(404, 'Karakter bulunamadı.');
      applyGive(c, g); c.saveVersion++; d.store.enqueue(c, true);
      text = 'Gönderildi (oyuncu çevrimdışı; girince çantasında).';
    }
    await audit(a.id, 'player.give', { charId, give: g });
    return { ok: true, text };
  });
  // Savaş Arenası: durum, canlı sıralama, elle başlat/bitir (otomatik saatler ve ödüller oyun ayarlarında)
  r.get('/api/admin/arena', async (req) => { await requireAdmin(req); return d.gateway.arena.adminView(); });
  r.post('/api/admin/arena', async (req) => {
    const a = await requireAdmin(req);
    const op = String(req.body?.op ?? '');
    if (op === 'start') {
      const min = Math.max(1, Math.min(180, Math.round(Number(req.body?.minutes) || 15)));
      if (!d.gateway.arena.start(min, 'yönetici')) throw new HttpError(409, 'Arena zaten açık.');
      await audit(a.id, 'arena.manual_start', { minutes: min });
    } else if (op === 'stop') {
      if (!d.gateway.arena.stop('yönetici bitirdi')) throw new HttpError(409, 'Arena açık değil.');
      await audit(a.id, 'arena.manual_stop', {});
    } else throw new HttpError(400, 'Geçersiz işlem.');
    return d.gateway.arena.adminView();
  });
  // E-PIN kodları
  r.get('/api/admin/epin', async (req) => {
    await requireAdmin(req);
    const rows = (await pool.query(`SELECT e.code, e.cp, e.note, e.created_at, e.used_at, c.name AS used_by FROM epin_codes e LEFT JOIN characters c ON c.id=e.used_by_char ORDER BY e.created_at DESC LIMIT 100`)).rows;
    return rows.map((x) => ({ code: x.code, cp: x.cp, note: x.note, createdAt: x.created_at, usedAt: x.used_at, usedBy: x.used_by }));
  });
  r.post('/api/admin/epin', async (req) => {
    const a = await requireAdmin(req);
    const cp = Math.round(Number(req.body?.cp)), count = Math.min(50, Math.max(1, Math.round(Number(req.body?.count) || 1)));
    if (!Number.isFinite(cp) || cp < 1 || cp > 1e6) throw new HttpError(400, 'Geçersiz ÇP.');
    const note = String(req.body?.note ?? '').slice(0, 80);
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const codes: string[] = [];
    for (let i = 0; i < count; i++) {
      const raw = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b) => A[b % A.length]).join('');
      codes.push(`TGR-${raw.slice(0, 4)}-${raw.slice(4, 8)}-${raw.slice(8, 12)}-${raw.slice(12, 16)}`);
    }
    for (const c of codes) await pool.query('INSERT INTO epin_codes(code, cp, note, created_by) VALUES ($1,$2,$3,$4)', [c, cp, note || null, a.id]);
    await audit(a.id, 'epin.create', { cp, count });
    return { ok: true, codes };
  });
  r.post('/api/epin', async (req) => {
    const a = await requireAuth(req);
    if (!config.loadTestMode && !loginLimiter.take(req.ip + ':epin')) throw new HttpError(429, 'Çok fazla deneme. Biraz bekle.');
    const code = String(req.body?.code ?? '').trim().toUpperCase().replace(/\s+/g, '');
    const charId = Number(req.body?.characterId);
    const own = (await pool.query('SELECT 1 FROM characters WHERE id=$1 AND account_id=$2 AND deleted_at IS NULL', [charId, a.id])).rowCount;
    if (!own) throw new HttpError(403, 'Karakter bulunamadı.');
    const r2 = await pool.query(`UPDATE epin_codes SET used_at=now(), used_by_char=$2, used_by_account=$3 WHERE code=$1 AND used_at IS NULL RETURNING cp`, [code, charId, a.id]);
    if (!r2.rowCount) throw new HttpError(404, 'Kod geçersiz ya da daha önce kullanılmış.');
    const cp = Number(r2.rows[0].cp);
    await addCp(charId, cp);
    await audit(a.id, 'epin.redeem', { code, charId, cp });
    return { ok: true, cp, text: `${cp.toLocaleString('tr-TR')} ÇP yüklendi.` };
  });
  // İsim Değiştirme (Nesne Market ürünü)
  r.post('/api/rename', async (req) => {
    const a = await requireAuth(req);
    const charId = Number(req.body?.characterId), name = String(req.body?.name ?? '').trim();
    const bad = validateCharacterName(name); if (bad) throw new HttpError(400, bad);
    const own = (await pool.query('SELECT 1 FROM characters WHERE id=$1 AND account_id=$2 AND deleted_at IS NULL', [charId, a.id])).rowCount;
    if (!own) throw new HttpError(403, 'Karakter bulunamadı.');
    const live = d.store.peek(charId) ?? await d.store.load(charId);
    if (!live || (live.materials.rename ?? 0) <= 0) throw new HttpError(400, 'İsim Değiştirme ürünü gerekir (Nesne Market).');
    try { await pool.query('UPDATE characters SET name=$2, name_norm=$3 WHERE id=$1', [charId, name, normalizeName(name)]); }
    catch (e: any) { if (e.code === '23505') throw new HttpError(409, 'Bu ad alınmış.'); throw e; }
    const ch = d.gateway.onlineChannel(charId);
    if (ch) d.channels.send(ch, { type: 'admin', op: 'rename', charId, name });
    else { const c = await d.store.load(charId); if (c) { c.name = name; c.materials.rename = Math.max(0, (c.materials.rename ?? 1) - 1); c.saveVersion++; d.store.enqueue(c, true); } }
    await audit(a.id, 'char.rename', { charId, name });
    return { ok: true, name };
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
      d.gateway.setAccountRole(acc, role);
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
  // ───────── kayıt listesi ─────────
  /**
   * Sisteme kayıt olan tüm hesaplar (en yeni önce), arama ve süzgeçle: tümü / bakımda giriş izni olanlar / son 7 gün /
   * yasaklılar. Her hesapta karakterleri (en yüksek seviyeli 3'ü), son giriş ve çevrimiçi durumu.
   */
  r.get('/api/admin/accounts', async (req) => {
    await requireAdmin(req);
    const q = String(req.query.get('q') ?? '').trim().toLowerCase().slice(0, 40);
    const f = String(req.query.get('f') ?? 'all');
    const offset = Math.max(0, Math.min(1e6, Number(req.query.get('offset') ?? 0) | 0));
    const like = '%' + q.replace(/[%_\\]/g, (m) => '\\' + m) + '%';
    const where = [`($1 = '' OR a.username_norm LIKE $2 OR lower(coalesce(a.email,'')) LIKE $2 OR EXISTS (SELECT 1 FROM characters c WHERE c.account_id=a.id AND c.deleted_at IS NULL AND c.name_norm LIKE $2))`];
    if (f === 'access') where.push(`(a.test_access OR a.role IN ('gm','admin','owner'))`);
    else if (f === 'new') where.push(`a.created_at > now() - interval '7 days'`);
    else if (f === 'banned') where.push(`a.banned_until > now()`);
    const W = where.join(' AND ');
    const total = Number((await pool.query(`SELECT count(*) AS n FROM accounts a WHERE ${W}`, [q, like])).rows[0].n);
    const rows = (await pool.query(
      `SELECT a.id, a.username, a.email, a.role, a.test_access, a.banned_until, a.created_at, a.last_login,
         (SELECT count(*) FROM characters c WHERE c.account_id=a.id AND c.deleted_at IS NULL) AS char_count,
         (SELECT coalesce(json_agg(x), '[]') FROM (SELECT c.name, c.cls, c.level FROM characters c WHERE c.account_id=a.id AND c.deleted_at IS NULL ORDER BY c.level DESC, c.id LIMIT 3) x) AS chars
       FROM accounts a WHERE ${W} ORDER BY a.created_at DESC, a.id DESC LIMIT 50 OFFSET ${offset}`, [q, like])).rows;
    const st = (await pool.query(`SELECT count(*) AS total, count(*) FILTER (WHERE created_at > now() - interval '1 day') AS day,
      count(*) FILTER (WHERE created_at > now() - interval '7 days') AS week, count(*) FILTER (WHERE test_access) AS access FROM accounts`)).rows[0];
    return {
      total, offset,
      stats: { total: Number(st.total), day: Number(st.day), week: Number(st.week), access: Number(st.access) },
      rows: rows.map((x) => ({
        id: Number(x.id), username: x.username, email: x.email ?? null, role: x.role, testAccess: !!x.test_access,
        banned: !!(x.banned_until && new Date(x.banned_until).getTime() > Date.now()), createdAt: x.created_at, lastLogin: x.last_login,
        charCount: Number(x.char_count), chars: x.chars ?? [], online: d.gateway.byAccount.has(Number(x.id)),
      })),
    };
  });
  /** Bakımda / kapalıyken giriş izni ver ya da al. İzin alınınca oyun o hesaba kapalıysa oyundan çıkarılır. */
  r.post('/api/admin/access', async (req) => {
    const a = await requireAdmin(req);
    const acc = Number(req.body?.accountId), allow = !!req.body?.allow;
    const r2 = await pool.query('UPDATE accounts SET test_access=$2 WHERE id=$1 RETURNING role, early_access', [acc, allow]);
    if (!r2.rowCount) throw new HttpError(404, 'Hesap bulunamadı.');
    invalidateAccountCache(acc);
    if (!allow && !d.opening.isOpenFor(!!r2.rows[0].early_access, isStaff(r2.rows[0].role)).ok) d.gateway.kickAccount(acc, 'Oyun şu an bakımda.');
    await audit(a.id, allow ? 'account.access.grant' : 'account.access.revoke', { accountId: acc });
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
  const t0 = performance.now();
  try {
    const out = await route.h(req, res);
    if (!res.headersSent) json(res, 200, out ?? { ok: true });
    const ms = performance.now() - t0;
    if (ms >= 500) mainLoad.job(`İstek: ${req.method} ${req.path}`, ms, 'bekleme dahil (veritabanı, parola doğrulama)');
  } catch (e) {
    if (e instanceof HttpError) return json(res, e.status, { error: e.message, code: e.code });
    console.error('[api]', req.method, req.path, e);
    if (!res.headersSent) json(res, 500, { error: 'Sunucu hatası' });
  }
}
