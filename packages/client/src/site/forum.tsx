/**
 * Forum arayüzü: /forum (bölümler), /forum/b/<bölüm>?s=N (konular), /forum/k/<konu>?s=N (iletiler).
 * Oyun hesabıyla giriş; "Duyurular" bölümünde yalnız yönetim konu açar. Metin düz yazı olarak basılır
 * (bağlantılar tıklanabilir, HTML yorumlanmaz).
 */
import React, { useEffect, useRef, useState } from 'react';
import { FORUM_LIMITS as L } from '@col/shared';
import { api } from '../api.ts';
import { SiteNav, SiteFooter, Link, navigate, useRoute } from './site.tsx';

interface Me { id: number; name: string; role: string; staff: boolean; mod: boolean }
interface Cat { id: string; name: string; desc: string; staffOnly: boolean; topics: number; posts: number; last: { id: number; title: string; at: number; user: string } | null }
interface TopicRow { id: number; title: string; author: string; authorRole: string; createdAt: number; lastAt: number; lastUser: string; replies: number; views: number; pinned: boolean; locked: boolean }
interface Post { id: number; first: boolean; body: string; createdAt: number; editedAt: number | null; user: string; role: string; posts: number; hero: { name: string; level: number; cls: string } | null; mine: boolean; canEdit: boolean }

const ROLE: Record<string, string> = { owner: 'Kurucu', admin: 'Yönetici', gm: 'GM', moderator: 'Moderatör' };
const CLS: Record<string, string> = { guardian: 'Muhafız', hunter: 'Avcı', arcanist: 'Arkanist' };
function ago(t: number) {
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return 'az önce';
  if (s < 3600) return `${Math.floor(s / 60)} dk önce`;
  if (s < 86400) return `${Math.floor(s / 3600)} sa önce`;
  if (s < 7 * 86400) return `${Math.floor(s / 86400)} gün önce`;
  return new Date(t).toLocaleDateString('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' });
}
const full = (t: number) => new Date(t).toLocaleString('tr-TR', { dateStyle: 'long', timeStyle: 'short' });
/** düz metin: satırlar korunur, http(s) bağlantıları tıklanabilir */
function Body({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s<>"']+)/g);
  return <div className="fp-body">{parts.map((p, i) => (i % 2 ? <a key={i} href={p} target="_blank" rel="noopener noreferrer nofollow ugc">{p}</a> : <React.Fragment key={i}>{p}</React.Fragment>))}</div>;
}
function RoleBadge({ role }: { role: string }) { return ROLE[role] ? <span className={'f-role r-' + role}>{ROLE[role]}</span> : null; }
function CatIcon({ id }: { id: string }) {
  const p: Record<string, React.ReactNode> = {
    duyurular: <path d="M4 10v4l3 1 2 5h2l-1-5 9 3V5L10 9H5zM19 9a3 3 0 0 1 0 6" />,
    genel: <path d="M4 5h16v11H9l-5 4zM8 9h8M8 12h5" />,
    rehber: <path d="M5 4h9l5 5v11H5zM14 4v5h5M8 13h8M8 16h6" />,
    oneri: <path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2.1h5c0-.9.4-1.6 1-2.1A6 6 0 0 0 12 3z" />,
    hata: <path d="M12 3l9 16H3zM12 9v5M12 17h.01" />,
    ticaret: <path d="M3 7h18l-2 11H5zM8 7a4 4 0 0 1 8 0M9 12h6" />,
  };
  return <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p[id] ?? p.genel}</svg>;
}
function Pager({ page, pages, base }: { page: number; pages: number; base: string }) {
  if (pages <= 1) return null;
  const nums = [...new Set([1, page - 1, page, page + 1, pages].filter((n) => n >= 1 && n <= pages))].sort((a, b) => a - b);
  return <nav className="f-pager">{nums.map((n, i) => <React.Fragment key={n}>{i > 0 && n - nums[i - 1] > 1 && <span>…</span>}<Link to={`${base}?s=${n}`} className={n === page ? 'on' : ''}>{n}</Link></React.Fragment>)}</nav>;
}

/** Forumdan ayrılmadan giriş */
function LoginBox({ onDone, onClose }: { onDone: () => void; onClose: () => void }) {
  const [u, setU] = useState(''), [p, setP] = useState(''), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('');
    try { await api('/api/login', { username: u, password: p }); onDone(); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <div className="f-modal" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <form className="f-login" onSubmit={go}>
        <button type="button" className="f-x" onClick={onClose} aria-label="Kapat">✕</button>
        <h3>Foruma giriş</h3><p>Oyun hesabınla giriş yap. Hesabın yok mu? <Link to="/?kayit" onClick={onClose}>Ön kayıt ol</Link></p>
        <input placeholder="Kullanıcı adı" autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} maxLength={20} />
        <input placeholder="Parola" type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} />
        {err && <div className="f-err">{err}</div>}
        <button className="site-btn primary" disabled={busy}>{busy ? 'Bekle…' : 'Giriş yap'}</button>
      </form>
    </div>
  );
}

function Composer({ title, onSend, withTitle, initial = '', initialTitle = '', submitLabel = 'Gönder', onCancel }: { title?: string; onSend: (t: string, b: string) => Promise<void>; withTitle?: boolean; initial?: string; initialTitle?: string; submitLabel?: string; onCancel?: () => void }) {
  const [t, setT] = useState(initialTitle), [b, setB] = useState(initial), [err, setErr] = useState(''), [busy, setBusy] = useState(false);
  const go = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setErr(''); setBusy(true);
    try { await onSend(t, b); setT(''); setB(''); } catch (x) { setErr((x as Error).message); }
    setBusy(false);
  };
  return (
    <form className="f-compose" onSubmit={go}>
      {title && <h3>{title}</h3>}
      {withTitle && <input className="f-title-in" placeholder="Konu başlığı" value={t} maxLength={L.titleMax} onChange={(e) => setT(e.target.value)} />}
      <textarea placeholder="Mesajını yaz…" value={b} maxLength={L.bodyMax} rows={withTitle ? 8 : 5} onChange={(e) => setB(e.target.value)} />
      <div className="f-compose-ft"><small>{b.length.toLocaleString('tr-TR')} / {L.bodyMax.toLocaleString('tr-TR')}</small>{err && <span className="f-err">{err}</span>}<span className="sp" />{onCancel && <button type="button" className="site-btn ghost" onClick={onCancel}>Vazgeç</button>}<button className="site-btn primary" disabled={busy}>{busy ? 'Gönderiliyor…' : submitLabel}</button></div>
    </form>
  );
}

function ForumHome({ me, askLogin }: { me: Me | null; askLogin: () => void }) {
  const [cats, setCats] = useState<Cat[] | null>(null);
  useEffect(() => { api('/api/forum/cats').then((r) => setCats(r.cats)).catch(() => setCats([])); }, [me?.id]);
  const off = cats?.filter((c) => c.staffOnly) ?? [], com = cats?.filter((c) => !c.staffOnly) ?? [];
  const row = (c: Cat) => (
    <Link key={c.id} to={`/forum/b/${c.id}`} className={'f-cat' + (c.staffOnly ? ' official' : '')}>
      <span className="f-cat-ic"><CatIcon id={c.id} /></span>
      <span className="f-cat-main"><b>{c.name}</b><small>{c.desc}</small></span>
      <span className="f-cat-num"><b>{c.topics.toLocaleString('tr-TR')}</b><small>konu</small></span>
      <span className="f-cat-num"><b>{c.posts.toLocaleString('tr-TR')}</b><small>ileti</small></span>
      <span className="f-cat-last">{c.last ? <><b>{c.last.title}</b><small>{c.last.user} · {ago(c.last.at)}</small></> : <small>Henüz konu yok</small>}</span>
    </Link>
  );
  return (
    <>
      <div className="f-hero"><div><span className="eyebrow">Topluluk</span><h1>Core of Life Forumu</h1><p>Duyuruları takip et, taktiklerini paylaş, önerilerini yaz. Oyun hesabınla katıl.</p></div>
        {!me ? <button className="site-btn primary" onClick={askLogin}>Giriş yap</button> : <div className="f-me">Hoş geldin, <b>{me.name}</b> <RoleBadge role={me.role} /></div>}</div>
      {!cats ? <div className="f-loading">Yükleniyor…</div> : <>
        <h2 className="f-group">Resmî</h2><div className="f-cats">{off.map(row)}</div>
        <h2 className="f-group">Topluluk</h2><div className="f-cats">{com.map(row)}</div>
      </>}
    </>
  );
}

function CatPage({ id, page, me, askLogin }: { id: string; page: number; me: Me | null; askLogin: () => void }) {
  const [d, setD] = useState<{ cat: Cat; page: number; pages: number; total: number; canPost: boolean; topics: TopicRow[] } | null>(null);
  const [err, setErr] = useState('');
  const [compose, setCompose] = useState(false);
  useEffect(() => { setD(null); api(`/api/forum/topics?cat=${encodeURIComponent(id)}&page=${page}`).then(setD).catch((e) => setErr(e.message)); }, [id, page, me?.id]);
  if (err) return <div className="f-empty">{err} <Link to="/forum">Foruma dön</Link></div>;
  if (!d) return <div className="f-loading">Yükleniyor…</div>;
  return (
    <>
      <div className="f-crumbs"><Link to="/forum">Forum</Link><span>›</span><b>{d.cat.name}</b></div>
      <div className="f-head"><div><h1>{d.cat.name}</h1><p>{d.cat.desc}</p></div>
        {d.canPost ? <button className="site-btn primary" onClick={() => setCompose(!compose)}>{compose ? 'Vazgeç' : 'Yeni konu'}</button>
          : !me ? <button className="site-btn ghost" onClick={askLogin}>Konu açmak için giriş yap</button>
          : d.cat.staffOnly ? <span className="f-note">Bu bölümde yönetim konu açar; yanıt yazabilirsin.</span> : null}</div>
      {compose && <Composer title="Yeni konu" withTitle submitLabel="Konuyu aç" onCancel={() => setCompose(false)} onSend={async (t, b) => { const r = await api<{ id: number }>('/api/forum/topic', { cat: id, title: t, body: b }); navigate(`/forum/k/${r.id}`); }} />}
      {d.topics.length === 0 ? <div className="f-empty">Henüz konu yok.{d.canPost ? ' İlk konuyu sen aç!' : ''}</div> : (
        <div className="f-topics">
          <div className="f-trow head"><span>Konu</span><span>Yanıt</span><span>Görüntülenme</span><span>Son ileti</span></div>
          {d.topics.map((t) => (
            <Link key={t.id} to={`/forum/k/${t.id}`} className={'f-trow' + (t.pinned ? ' pinned' : '')}>
              <span className="f-tmain">{t.pinned && <i className="f-badge pin">Sabit</i>}{t.locked && <i className="f-badge lock">Kilitli</i>}<b>{t.title}</b><small>{t.author} <RoleBadge role={t.authorRole} /> · {ago(t.createdAt)}</small></span>
              <span className="f-tnum">{t.replies.toLocaleString('tr-TR')}</span>
              <span className="f-tnum">{t.views.toLocaleString('tr-TR')}</span>
              <span className="f-tlast"><b>{t.lastUser}</b><small title={full(t.lastAt)}>{ago(t.lastAt)}</small></span>
            </Link>
          ))}
        </div>
      )}
      <Pager page={d.page} pages={d.pages} base={`/forum/b/${id}`} />
    </>
  );
}

function TopicPage({ id, page, me, askLogin }: { id: number; page: number | 'son'; me: Me | null; askLogin: () => void }) {
  type D = { page: number; pages: number; topic: { id: number; title: string; cat: string; catName: string; author: string; createdAt: number; replies: number; views: number; pinned: boolean; locked: boolean; deleted: boolean }; canReply: boolean; posts: Post[] };
  const [d, setD] = useState<D | null>(null);
  const [err, setErr] = useState('');
  const [editing, setEditing] = useState<number | null>(null);
  const [tick, setTick] = useState(0);
  const bottom = useRef<HTMLDivElement>(null);
  const load = () => api<D>(`/api/forum/topic?id=${id}&page=${page}`).then(setD).catch((e) => setErr(e.message));
  useEffect(() => { setD(null); load(); }, [id, page, me?.id, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  if (err) return <div className="f-empty">{err} <Link to="/forum">Foruma dön</Link></div>;
  if (!d) return <div className="f-loading">Yükleniyor…</div>;
  const t = d.topic;
  const mod = async (op: string, extra: Record<string, unknown>) => { await api('/api/forum/mod', { op, ...extra }); };
  return (
    <>
      <div className="f-crumbs"><Link to="/forum">Forum</Link><span>›</span><Link to={`/forum/b/${t.cat}`}>{t.catName}</Link></div>
      <div className="f-head topic"><div><h1>{t.pinned && <i className="f-badge pin">Sabit</i>}{t.locked && <i className="f-badge lock">Kilitli</i>}{t.deleted && <i className="f-badge del">Silinmiş</i>}{t.title}</h1><p>{t.author} tarafından · {full(t.createdAt)} · {t.views.toLocaleString('tr-TR')} görüntülenme</p></div>
        {me?.mod && <div className="f-mod">
          <button onClick={async () => { await mod('pin', { topic: t.id, on: !t.pinned }); setTick(tick + 1); }}>{t.pinned ? 'Sabitlemeyi kaldır' : 'Sabitle'}</button>
          <button onClick={async () => { await mod('lock', { topic: t.id, on: !t.locked }); setTick(tick + 1); }}>{t.locked ? 'Kilidi aç' : 'Kilitle'}</button>
          {!t.deleted && <button className="danger" onClick={async () => { if (confirm('Konu silinsin mi?')) { await mod('delete_topic', { topic: t.id }); navigate(`/forum/b/${t.cat}`); } }}>Konuyu sil</button>}
        </div>}
      </div>
      <Pager page={d.page} pages={d.pages} base={`/forum/k/${id}`} />
      <div className="f-posts">
        {d.posts.map((p) => (
          <article key={p.id} id={'i' + p.id} className={'f-post' + (ROLE[p.role] ? ' staff' : '')}>
            <aside className="fp-user">
              <div className={'fp-av ' + (p.hero?.cls ?? 'none')}>{p.user.slice(0, 1).toUpperCase()}</div>
              <b>{p.user}</b><RoleBadge role={p.role} />
              {p.hero && <small className="fp-hero">{p.hero.name} · {CLS[p.hero.cls] ?? p.hero.cls} · Sv. {p.hero.level}</small>}
              <small>{p.posts.toLocaleString('tr-TR')} ileti</small>
            </aside>
            <div className="fp-main">
              <div className="fp-meta"><span title={full(p.createdAt)}>{ago(p.createdAt)}</span>{p.editedAt && <span className="fp-edited" title={full(p.editedAt)}>düzenlendi</span>}<span className="sp" />
                {p.canEdit && editing !== p.id && <button onClick={() => setEditing(p.id)}>Düzenle</button>}
                {me?.mod && <button className="danger" onClick={async () => { if (confirm(p.first ? 'Bu konunun ilk iletisi; konu silinsin mi?' : 'İleti silinsin mi?')) { await mod('delete_post', { post: p.id }); if (p.first) navigate(`/forum/b/${t.cat}`); else setTick(tick + 1); } }}>Sil</button>}
              </div>
              {editing === p.id
                ? <Composer initial={p.body} withTitle={p.first} initialTitle={p.first ? t.title : ''} submitLabel="Kaydet" onCancel={() => setEditing(null)} onSend={async (title, body) => { await api('/api/forum/edit', { post: p.id, body, ...(p.first ? { title } : {}) }); setEditing(null); setTick(tick + 1); }} />
                : <Body text={p.body} />}
            </div>
          </article>
        ))}
      </div>
      <Pager page={d.page} pages={d.pages} base={`/forum/k/${id}`} />
      <div ref={bottom} />
      {d.canReply ? <Composer title="Yanıt yaz" submitLabel="Yanıtla" onSend={async (_t, b) => { const r = await api<{ page: number; id: number }>('/api/forum/reply', { topic: t.id, body: b }); if (r.page !== d.page) navigate(`/forum/k/${id}?s=${r.page}`); else setTick(tick + 1); setTimeout(() => document.getElementById('i' + r.id)?.scrollIntoView({ behavior: 'smooth' }), 400); }} />
        : !me ? <div className="f-empty"><button className="site-btn primary" onClick={askLogin}>Yanıt yazmak için giriş yap</button></div>
        : t.locked ? <div className="f-empty">Bu konu kilitli; yeni yanıt yazılamaz.</div> : null}
    </>
  );
}

export function ForumPage() {
  const route = useRoute();
  const [me, setMe] = useState<Me | null>(null);
  const [login, setLogin] = useState(false);
  const [v, setV] = useState(0);
  useEffect(() => { api('/api/forum/cats').then((r) => setMe(r.me)).catch(() => {}); }, [v]);
  useEffect(() => { document.title = 'Forum · Core of Life 3D'; return () => { document.title = 'Core of Life 3D'; }; }, []);
  const url = new URL(route, location.origin);
  const parts = url.pathname.split('/').filter(Boolean); // ['forum', 'b'|'k', id]
  const s = url.searchParams.get('s');
  const pageNum = Math.max(1, Number(s) || 1);
  const askLogin = () => setLogin(true);
  return (
    <div className="site page forum">
      <SiteNav />
      <main className="f-wrap">
        {parts[1] === 'b' && parts[2] ? <CatPage id={parts[2]} page={pageNum} me={me} askLogin={askLogin} />
          : parts[1] === 'k' && parts[2] ? <TopicPage id={Number(parts[2])} page={s === 'son' ? 'son' : pageNum} me={me} askLogin={askLogin} />
          : <ForumHome me={me} askLogin={askLogin} />}
        {me && <div className="f-signed">{me.name} olarak giriş yaptın · <a href="#" onClick={async (e) => { e.preventDefault(); await api('/api/logout', {}).catch(() => {}); setMe(null); setV(v + 1); }}>Çıkış</a></div>}
      </main>
      <SiteFooter />
      {login && <LoginBox onClose={() => setLogin(false)} onDone={() => { setLogin(false); setV(v + 1); }} />}
    </div>
  );
}
