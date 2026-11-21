/**
 * Forum: oyun hesabıyla üyelik. Bölümler ortak tanımdan (FORUM_CATS); "Duyurular"da yalnız yönetim konu açar.
 * Okuma herkese açık; yazmak için oturum gerekir. Metin düz yazı olarak saklanır ve istemcide düz yazı basılır
 * (HTML yorumlanmaz). Yönetim/moderatör: sabitle, kilitle, konu/ileti sil. Kötüye kullanım sınırı hesap başına.
 */
import { FORUM_CAT, FORUM_CATS, FORUM_LIMITS as L, cleanForumText, cleanForumTitle } from '@col/shared';
import { HttpError, RateLimiter, type Router, type Req } from './http.ts';
import { pool, tx } from './db/pool.ts';
import type { AuthAccount } from './auth.ts';

type Auth = (req: Req) => Promise<AuthAccount>;
type OptAuth = (req: Req) => Promise<AuthAccount | null>;

const topicLimiter = new RateLimiter(1 / 90, 2); // hesap başına: ~1,5 dakikada bir konu (2'ye kadar art arda)
const replyLimiter = new RateLimiter(1 / 12, 4); // ~12 sn'de bir yanıt (4'e kadar art arda)
const editLimiter = new RateLimiter(1 / 5, 6);

const isStaffRole = (r: string) => r === 'gm' || r === 'admin' || r === 'owner';
const isModRole = (r: string) => r === 'moderator' || isStaffRole(r);
const meView = (a: AuthAccount | null) => (a ? { id: a.id, name: a.username, role: a.role, staff: isStaffRole(a.role), mod: isModRole(a.role) } : null);
const num = (v: unknown, d = 0) => { const n = Number(v); return Number.isFinite(n) ? Math.floor(n) : d; };
const iso = (d: Date | string | null) => (d ? new Date(d).getTime() : null);

/** Yazarların en yüksek seviyeli karakteri (ad, sınıf, seviye) — konu sayfasında rozet olarak görünür */
async function heroes(ids: number[]) {
  if (!ids.length) return new Map<number, { name: string; level: number; cls: string }>();
  const r = await pool.query(`SELECT DISTINCT ON (account_id) account_id, name, level, cls FROM characters WHERE account_id = ANY($1::bigint[]) AND deleted_at IS NULL ORDER BY account_id, level DESC, id`, [ids]);
  return new Map(r.rows.map((x) => [Number(x.account_id), { name: x.name as string, level: Number(x.level), cls: x.cls as string }]));
}

export function registerForum(r: Router, requireAuth: Auth, optionalAuth: OptAuth) {
  r.get('/api/forum/cats', async (req) => {
    const me = await optionalAuth(req);
    const stats = await pool.query(`SELECT cat, count(*)::int AS topics, coalesce(sum(replies + 1), 0)::int AS posts FROM forum_topics WHERE NOT deleted GROUP BY cat`);
    const last = await pool.query(`SELECT DISTINCT ON (t.cat) t.cat, t.id, t.title, t.last_post_at, a.username FROM forum_topics t LEFT JOIN accounts a ON a.id = t.last_account_id WHERE NOT t.deleted ORDER BY t.cat, t.last_post_at DESC`);
    const st = new Map(stats.rows.map((x) => [x.cat as string, x]));
    const ls = new Map(last.rows.map((x) => [x.cat as string, x]));
    return {
      me: meView(me),
      cats: FORUM_CATS.map((c) => {
        const s = st.get(c.id), l = ls.get(c.id);
        return { ...c, topics: s?.topics ?? 0, posts: s?.posts ?? 0, last: l ? { id: Number(l.id), title: l.title, at: iso(l.last_post_at), user: l.username ?? '' } : null };
      }),
    };
  });

  r.get('/api/forum/topics', async (req) => {
    const me = await optionalAuth(req);
    const cat = FORUM_CAT.get(String(req.query.get('cat') ?? ''));
    if (!cat) throw new HttpError(404, 'Bölüm bulunamadı.');
    const total = Number((await pool.query('SELECT count(*)::int AS n FROM forum_topics WHERE cat=$1 AND NOT deleted', [cat.id])).rows[0].n);
    const pages = Math.max(1, Math.ceil(total / L.topicsPerPage));
    const page = Math.min(pages, Math.max(1, num(req.query.get('page'), 1)));
    const rows = (await pool.query(
      `SELECT t.id, t.title, t.created_at, t.last_post_at, t.replies, t.views, t.pinned, t.locked, a.username AS author, a.role AS author_role, l.username AS last_user
       FROM forum_topics t JOIN accounts a ON a.id = t.account_id LEFT JOIN accounts l ON l.id = t.last_account_id
       WHERE t.cat = $1 AND NOT t.deleted ORDER BY t.pinned DESC, t.last_post_at DESC LIMIT $2 OFFSET $3`,
      [cat.id, L.topicsPerPage, (page - 1) * L.topicsPerPage])).rows;
    return {
      me: meView(me), cat, page, pages, total,
      canPost: !!me && (!cat.staffOnly || isStaffRole(me.role)),
      topics: rows.map((t) => ({ id: Number(t.id), title: t.title, author: t.author, authorRole: t.author_role, createdAt: iso(t.created_at), lastAt: iso(t.last_post_at), lastUser: t.last_user ?? t.author, replies: t.replies, views: t.views, pinned: t.pinned, locked: t.locked })),
    };
  });

  r.get('/api/forum/topic', async (req) => {
    const me = await optionalAuth(req);
    const id = num(req.query.get('id'));
    const t = (await pool.query(`SELECT t.*, a.username AS author FROM forum_topics t JOIN accounts a ON a.id = t.account_id WHERE t.id = $1`, [id])).rows[0];
    if (!t || (t.deleted && !(me && isModRole(me.role)))) throw new HttpError(404, 'Konu bulunamadı.');
    const total = Number((await pool.query('SELECT count(*)::int AS n FROM forum_posts WHERE topic_id=$1 AND NOT deleted', [id])).rows[0].n);
    const pages = Math.max(1, Math.ceil(total / L.postsPerPage));
    const page = req.query.get('page') === 'son' ? pages : Math.min(pages, Math.max(1, num(req.query.get('page'), 1)));
    const posts = (await pool.query(
      `SELECT p.id, p.body, p.created_at, p.edited_at, p.account_id, a.username, a.role,
              (SELECT count(*)::int FROM forum_posts q WHERE q.account_id = p.account_id AND NOT q.deleted) AS post_count
       FROM forum_posts p JOIN accounts a ON a.id = p.account_id
       WHERE p.topic_id = $1 AND NOT p.deleted ORDER BY p.id LIMIT $2 OFFSET $3`,
      [id, L.postsPerPage, (page - 1) * L.postsPerPage])).rows;
    if (page === 1) await pool.query('UPDATE forum_topics SET views = views + 1 WHERE id = $1', [id]);
    const firstId = Number((await pool.query('SELECT min(id) AS m FROM forum_posts WHERE topic_id=$1', [id])).rows[0].m ?? 0);
    const hs = await heroes([...new Set(posts.map((p) => Number(p.account_id)))]);
    const cat = FORUM_CAT.get(t.cat);
    const editable = (p: { account_id: string; created_at: Date }) => !!me && (isModRole(me.role) || (Number(p.account_id) === me.id && Date.now() - new Date(p.created_at).getTime() < L.editMinutes * 60_000));
    return {
      me: meView(me), page, pages,
      topic: { id: Number(t.id), title: t.title, cat: t.cat, catName: cat?.name ?? t.cat, author: t.author, createdAt: iso(t.created_at), replies: t.replies, views: t.views + (page === 1 ? 1 : 0), pinned: t.pinned, locked: t.locked, deleted: t.deleted },
      canReply: !!me && !t.deleted && (!t.locked || isModRole(me.role)),
      posts: posts.map((p) => ({ id: Number(p.id), first: Number(p.id) === firstId, body: p.body, createdAt: iso(p.created_at), editedAt: iso(p.edited_at), user: p.username, role: p.role, posts: p.post_count, hero: hs.get(Number(p.account_id)) ?? null, mine: !!me && Number(p.account_id) === me.id, canEdit: editable(p) })),
    };
  });

  r.post('/api/forum/topic', async (req) => {
    const me = await requireAuth(req);
    const cat = FORUM_CAT.get(String(req.body?.cat ?? ''));
    if (!cat) throw new HttpError(400, 'Bölüm seç.');
    if (cat.staffOnly && !isStaffRole(me.role)) throw new HttpError(403, 'Bu bölümde yalnız yönetim konu açabilir.');
    const title = cleanForumTitle(req.body?.title);
    const body = cleanForumText(req.body?.body, L.bodyMax);
    if (title.length < L.titleMin) throw new HttpError(400, `Başlık en az ${L.titleMin} karakter olmalı.`);
    if (body.length < L.bodyMin) throw new HttpError(400, 'Mesaj boş olamaz.');
    if (!isModRole(me.role) && !topicLimiter.take('t' + me.id)) throw new HttpError(429, 'Çok sık konu açıyorsun; biraz bekle.');
    const id = await tx(async (c) => {
      const t = await c.query(`INSERT INTO forum_topics(cat, account_id, title, last_account_id) VALUES ($1,$2,$3,$2) RETURNING id`, [cat.id, me.id, title]);
      const tid = Number(t.rows[0].id);
      await c.query(`INSERT INTO forum_posts(topic_id, account_id, body) VALUES ($1,$2,$3)`, [tid, me.id, body]);
      return tid;
    });
    return { ok: true, id };
  });

  r.post('/api/forum/reply', async (req) => {
    const me = await requireAuth(req);
    const tid = num(req.body?.topic);
    const body = cleanForumText(req.body?.body, L.bodyMax);
    if (body.length < L.bodyMin) throw new HttpError(400, 'Mesaj boş olamaz.');
    if (!isModRole(me.role) && !replyLimiter.take('r' + me.id)) throw new HttpError(429, 'Çok hızlı yazıyorsun; birkaç saniye bekle.');
    const r2 = await tx(async (c) => {
      const t = (await c.query('SELECT id, locked, deleted FROM forum_topics WHERE id=$1 FOR UPDATE', [tid])).rows[0];
      if (!t || t.deleted) throw new HttpError(404, 'Konu bulunamadı.');
      if (t.locked && !isModRole(me.role)) throw new HttpError(403, 'Konu kilitli; yanıt yazılamaz.');
      const p = await c.query(`INSERT INTO forum_posts(topic_id, account_id, body) VALUES ($1,$2,$3) RETURNING id`, [tid, me.id, body]);
      await c.query(`UPDATE forum_topics SET replies = replies + 1, last_post_at = now(), last_account_id = $2 WHERE id = $1`, [tid, me.id]);
      const n = Number((await c.query('SELECT count(*)::int AS n FROM forum_posts WHERE topic_id=$1 AND NOT deleted', [tid])).rows[0].n);
      return { id: Number(p.rows[0].id), page: Math.max(1, Math.ceil(n / L.postsPerPage)) };
    });
    return { ok: true, ...r2 };
  });

  r.post('/api/forum/edit', async (req) => {
    const me = await requireAuth(req);
    if (!editLimiter.take('e' + me.id)) throw new HttpError(429, 'Biraz yavaş.');
    const pid = num(req.body?.post);
    const body = cleanForumText(req.body?.body, L.bodyMax);
    if (body.length < L.bodyMin) throw new HttpError(400, 'Mesaj boş olamaz.');
    const p = (await pool.query('SELECT p.id, p.topic_id, p.account_id, p.created_at, p.deleted, (SELECT min(id) FROM forum_posts WHERE topic_id = p.topic_id) AS first FROM forum_posts p WHERE p.id=$1', [pid])).rows[0];
    if (!p || p.deleted) throw new HttpError(404, 'İleti bulunamadı.');
    const own = Number(p.account_id) === me.id;
    if (!isModRole(me.role) && !(own && Date.now() - new Date(p.created_at).getTime() < L.editMinutes * 60_000)) throw new HttpError(403, `İletiyi yalnız ilk ${L.editMinutes} dakikada düzenleyebilirsin.`);
    await pool.query('UPDATE forum_posts SET body=$2, edited_at=now() WHERE id=$1', [pid, body]);
    // konunun ilk iletisini düzenleyen başlığı da değiştirebilir
    if (Number(p.first) === pid && req.body?.title !== undefined) {
      const title = cleanForumTitle(req.body.title);
      if (title.length < L.titleMin) throw new HttpError(400, `Başlık en az ${L.titleMin} karakter olmalı.`);
      await pool.query('UPDATE forum_topics SET title=$2 WHERE id=$1', [p.topic_id, title]);
    }
    return { ok: true };
  });

  /** Moderasyon: sabitle, kilitle, konu sil, ileti sil (yönetim ve moderatör) */
  r.post('/api/forum/mod', async (req) => {
    const me = await requireAuth(req);
    if (!isModRole(me.role)) throw new HttpError(403, 'Yetkin yok.');
    const op = String(req.body?.op ?? ''), on = req.body?.on !== false;
    if (op === 'pin' || op === 'lock') {
      const n = await pool.query(`UPDATE forum_topics SET ${op === 'pin' ? 'pinned' : 'locked'} = $2 WHERE id = $1`, [num(req.body?.topic), on]);
      if (!n.rowCount) throw new HttpError(404, 'Konu bulunamadı.');
    } else if (op === 'delete_topic') {
      await pool.query('UPDATE forum_topics SET deleted = true WHERE id = $1', [num(req.body?.topic)]);
    } else if (op === 'delete_post') {
      await tx(async (c) => {
        const p = (await c.query('SELECT id, topic_id, deleted FROM forum_posts WHERE id=$1', [num(req.body?.post)])).rows[0];
        if (!p || p.deleted) throw new HttpError(404, 'İleti bulunamadı.');
        const first = Number((await c.query('SELECT min(id) AS m FROM forum_posts WHERE topic_id=$1', [p.topic_id])).rows[0].m);
        if (Number(p.id) === first) { await c.query('UPDATE forum_topics SET deleted = true WHERE id = $1', [p.topic_id]); return; }
        await c.query('UPDATE forum_posts SET deleted = true WHERE id = $1', [p.id]);
        const last = (await c.query('SELECT account_id, created_at FROM forum_posts WHERE topic_id=$1 AND NOT deleted ORDER BY id DESC LIMIT 1', [p.topic_id])).rows[0];
        await c.query('UPDATE forum_topics SET replies = GREATEST(0, replies - 1), last_post_at = $2, last_account_id = $3 WHERE id = $1', [p.topic_id, last?.created_at ?? new Date(), last?.account_id ?? null]);
      });
    } else throw new HttpError(400, 'Bilinmeyen işlem.');
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,'forum.mod',$2)`, [me.id, JSON.stringify(req.body ?? {})]).catch(() => {});
    return { ok: true };
  });
}
