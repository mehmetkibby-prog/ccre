import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { CLASSES, CLASS_IDS, MAPS, Kind, Anim, getLayout, MONSTER_INDEX, validateCharacterName, type ClassId } from '@col/shared';
import { Renderer3D } from './g3d/renderer3d.ts';
import { shared as sharedU } from './g3d/materials.ts';
import type { CEnt } from './game/game.ts';
import { api } from './api.ts';
import { store, useStore } from './game/store.ts';
import { GameScreen } from './ui/GameScreen.tsx';
import { createHumanoid, animateHumanoid, LOOKS } from './g3d/humanoid.ts';
import { createGlbChar, loadManifest, modelPending, onModelReady, onModelStatus, type GlbChar } from './g3d/models.ts';
import { equipGlb } from './g3d/gear.ts';
import { ClassIcon } from './ui/icons.tsx';
import './ui/styles.css';
import { OFFLINE } from './mode.ts';
import { AnnouncementBar } from './admin/AdminPanel.tsx';
import { AdminPage, isAdminRoute } from './admin/AdminPage.tsx';
// Test (Artifact) sürümü: yönetim ayarlarını paylaşılan kayıttan okur.
if (OFFLINE) import('./admin/config.ts').then((m) => m.startConfigSync());
// sunucu sürümü: yönetim ayarlarından istemciyi ilgilendirenler (duyuru, ışık)
else import('./admin/config.ts').then((m) => api('/api/tuning').then(m.applyRemoteTuning).catch(() => {}));

type Screen = { s: 'loading' } | { s: 'auth' } | { s: 'chars' } | { s: 'channels'; charId: number } | { s: 'game'; ticket: string; charId: number; channel: number };
interface Me { account: { id: number; username: string; role: string }; characters: { id: number; name: string; cls: ClassId; level: number; map: string }[] }

function App() {
  if (isAdminRoute()) return <AdminPage />;
  return <><AppScreens /><MenuAnnounce /></>;
}

/** Menü ekranlarında (oyun dışında) duyuru şeridi. Yönetim paneli ayrı sayfada: /admin1997 */
function MenuAnnounce() {
  const inGame = useStoreConnected();
  if (inGame) return null;
  return <AnnouncementBar />;
}
function useStoreConnected() { return useStore((s) => s.connected); }

function AppScreens() {
  const [screen, setScreen] = useState<Screen>({ s: 'loading' });
  const [me, setMe] = useState<Me | null>(null);
  const [lastError, setLastError] = useState('');
  const refresh = async () => {
    try { const m = await api<Me>('/api/me'); setMe(m); setScreen({ s: 'chars' }); }
    catch { setScreen({ s: 'auth' }); }
  };
  useEffect(() => { refresh(); }, []);
  if (screen.s === 'loading') return <div className="screen"><div className="logo">Tuğra<small>ONLINE</small></div></div>;
  if (screen.s === 'auth') return <AuthScreen onDone={refresh} />;
  if (screen.s === 'chars' && me) return <CharScreen me={me} error={lastError} onReload={refresh} onPlay={(id) => { setLastError(''); setScreen({ s: 'channels', charId: id }); }} onLogout={async () => { await api('/api/logout', {}).catch(() => {}); setScreen({ s: 'auth' }); }} />;
  if (screen.s === 'channels') return <ChannelScreen charId={screen.charId} onBack={() => setScreen({ s: 'chars' })} onEnter={(ticket, ch) => setScreen({ s: 'game', ticket, charId: screen.charId, channel: ch })} />;
  if (screen.s === 'game') return <GameScreen key={screen.ticket} ticket={screen.ticket} onExit={(reason, toChannels) => { store.set({ connected: false, self: null, char: null, dead: null, panel: null }); if (reason) setLastError(reason); if (toChannels) setScreen({ s: 'channels', charId: screen.charId }); else refresh(); }} />;
  return null;
}

function AuthScreen({ onDone }: { onDone: () => void }) {
  const [tab, setTab] = useState<'login' | 'register' | 'forgot'>('login');
  const [f, setF] = useState({ username: '', password: '', password2: '', email: '', code: '' });
  const [err, setErr] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErr(''); setInfo(''); setBusy(true);
    try {
      if (tab === 'login') { await api('/api/login', { username: f.username, password: f.password }); onDone(); }
      else if (tab === 'register') { await api('/api/register', { username: f.username, password: f.password, password2: f.password2, email: f.email || undefined }); onDone(); }
      else {
        if (!f.code) { const r = await api<{ devCode?: string; note?: string }>('/api/password/forgot', { username: f.username }); setInfo(r.devCode ? `${r.note} Kod: ${r.devCode}` : 'Hesap varsa sıfırlama kodu gönderildi.'); }
        else { await api('/api/password/reset', { code: f.code, password: f.password }); setInfo('Parola değişti, giriş yapabilirsin.'); setTab('login'); }
      }
    } catch (e2) { setErr((e2 as Error).message); }
    setBusy(false);
  };
  const [showPw, setShowPw] = useState(false);
  const title = tab === 'login' ? 'Tekrar hoş geldin' : tab === 'register' ? 'Destana katıl' : 'Parolanı yenile';
  const sub = tab === 'login' ? 'Hesabınla giriş yap, kaldığın yerden devam et.' : tab === 'register' ? 'Ücretsiz hesap aç; ilk sandığın seni bekliyor.' : 'Kullanıcı adını yaz, sıfırlama kodunu al.';
  return (
    <div className="screen live auth-screen">
      <MenuBackdrop />
      <div className="auth-layout">
        <div className="auth-brand">
          <TugraMark />
          <h1 className="brand-title">TUĞRA</h1>
          <div className="brand-online"><i />ONLINE<i /></div>
          <p className="brand-tag">Pazarın kalabalığında ün kazan, korunun derinliğinde Tilki Kral'ı yen.</p>
          <RealmLine />
        </div>
        <form className="auth-card" onSubmit={submit}>
          <div className="ac-corner tl" /><div className="ac-corner tr" /><div className="ac-corner bl" /><div className="ac-corner br" />
          {tab !== 'forgot' && (
            <div className="ac-tabs" role="tablist">
              <button type="button" role="tab" aria-selected={tab === 'login'} className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>Giriş Yap</button>
              <button type="button" role="tab" aria-selected={tab === 'register'} className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>Kayıt Ol</button>
              <span className="ac-tab-ink" style={{ transform: `translateX(${tab === 'register' ? 100 : 0}%)` }} />
            </div>
          )}
          <h2 className="ac-title">{title}</h2>
          <p className="ac-sub">{sub}</p>
          {OFFLINE && <div className="ac-note"><b>Test sürümü:</b> oyun tarayıcının içinde çalışır, hesabın yalnız bu cihazda saklanır.</div>}
          <label className="ac-field"><span className="ac-ic"><Ico k="user" /></span><input placeholder=" " autoComplete="username" value={f.username} onChange={set('username')} maxLength={20} /><em>Kullanıcı adı</em></label>
          {tab === 'register' && <label className="ac-field"><span className="ac-ic"><Ico k="mail" /></span><input placeholder=" " type="email" value={f.email} onChange={set('email')} /><em>E-posta (isteğe bağlı)</em></label>}
          {tab === 'forgot' && <label className="ac-field"><span className="ac-ic"><Ico k="key" /></span><input placeholder=" " value={f.code} onChange={set('code')} /><em>Sıfırlama kodu (aldıysan)</em></label>}
          {(tab !== 'forgot' || f.code) && <label className="ac-field"><span className="ac-ic"><Ico k="lock" /></span><input placeholder=" " type={showPw ? 'text' : 'password'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} /><em>{tab === 'forgot' ? 'Yeni parola' : 'Parola'}</em><button type="button" className="ac-eye" onClick={() => setShowPw(!showPw)} aria-label={showPw ? 'Parolayı gizle' : 'Parolayı göster'}><Ico k={showPw ? 'eyeoff' : 'eye'} /></button></label>}
          {tab === 'register' && <label className="ac-field"><span className="ac-ic"><Ico k="lock" /></span><input placeholder=" " type={showPw ? 'text' : 'password'} autoComplete="new-password" value={f.password2} onChange={set('password2')} /><em>Parola tekrar</em></label>}
          {err && <div className="ac-err">{err}</div>}
          {info && <div className="ac-ok">{info}</div>}
          <button className="ac-cta" disabled={busy}><span>{busy ? 'Bekle…' : tab === 'login' ? 'OYUNA GİR' : tab === 'register' ? 'HESABI OLUŞTUR' : f.code ? 'PAROLAYI DEĞİŞTİR' : 'KOD GÖNDER'}</span></button>
          <div className="ac-links">
            {tab === 'login' && <><a onClick={() => setTab('forgot')}>Parolamı unuttum</a><a onClick={() => setTab('register')}>Hesabın yok mu? <b>Kayıt ol</b></a></>}
            {tab === 'register' && <a onClick={() => setTab('login')}>Zaten hesabın var mı? <b>Giriş yap</b></a>}
            {tab === 'forgot' && <a onClick={() => setTab('login')}>← Girişe dön</a>}
          </div>
        </form>
      </div>
    </div>
  );
}

/** Giriş kartındaki küçük simgeler. */
function Ico({ k }: { k: 'user' | 'lock' | 'mail' | 'key' | 'eye' | 'eyeoff' }) {
  const p: Record<string, React.ReactNode> = {
    user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-7 8-7s8 3 8 7" /></>,
    lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" /></>,
    key: <><circle cx="8" cy="15" r="4" /><path d="M11 12l9-9M17 6l3 3" /></>,
    eye: <><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
    eyeoff: <><path d="M3 3l18 18M10.6 5.1A10.7 10.7 0 0 1 12 5c6.4 0 10 7 10 7a17 17 0 0 1-3.2 4.2M6.1 6.1C3.6 7.9 2 12 2 12s3.6 7 10 7a9.8 9.8 0 0 0 5-1.4" /></>,
  };
  return <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>{p[k]}</svg>;
}

/** Ferman tepesindeki amblem: tuğradan esinlenmiş özgün bir süs (üç direk, iç içe kavisler, alt kuyruk). */
function TugraMark() {
  return (
    <svg className="tugra-mark" viewBox="0 0 220 120" aria-hidden>
      <defs>
        <linearGradient id="tg-gold" gradientUnits="userSpaceOnUse" x1="20" y1="10" x2="200" y2="110"><stop offset="0" stopColor="#f8e2a4" /><stop offset=".5" stopColor="#d9a441" /><stop offset="1" stopColor="#8a5e1c" /></linearGradient>
      </defs>
      <g fill="none" stroke="url(#tg-gold)" strokeLinecap="round" strokeLinejoin="round">
        <path d="M70 92 C40 92 22 74 26 56 C30 36 58 30 78 44 C96 57 92 84 70 92 Z" strokeWidth="3.2" />
        <path d="M66 84 C48 82 38 70 41 58 C45 44 62 42 74 52 C84 61 80 80 66 84 Z" strokeWidth="2" opacity=".85" />
        <path d="M112 96 L112 14" strokeWidth="4" />
        <path d="M128 96 L128 20" strokeWidth="4" />
        <path d="M144 96 L144 26" strokeWidth="4" />
        <path d="M112 30 C120 22 132 26 140 18" strokeWidth="2" />
        <path d="M128 38 C136 30 148 34 156 26" strokeWidth="2" />
        <path d="M144 46 C152 38 164 42 172 34" strokeWidth="2" />
        <path d="M70 92 C110 104 160 104 196 90 C206 86 210 78 204 74" strokeWidth="3" />
        <path d="M88 104 C120 112 168 110 192 100" strokeWidth="1.6" opacity=".7" />
      </g>
      <circle cx="58" cy="64" r="4" fill="#c9442f" />
    </svg>
  );
}

/** Ferman altında sunucu durumu. */
function RealmLine() {
  const [st, setSt] = useState<{ online: number; open: boolean; msg: string } | null>(null);
  useEffect(() => {
    let alive = true;
    const load = () => api('/api/status').then((r) => { if (alive) setSt({ online: r.online ?? 0, open: !r.opening || r.opening.mode === 'open', msg: r.opening?.message ?? '' }); }).catch(() => {});
    load(); const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);
  if (!st) return null;
  return <div className={'realm-line' + (st.open ? ' open' : '')}><i />{st.open ? `Sunucu açık · ${st.online} kişi oyunda` : st.msg || 'Sunucu şu an kapalı'}</div>;
}

/** Menü arka planı: Pazar Köyü'nün canlı 3B görüntüsü. Kamera meydanın çevresinde yavaşça döner, oyuncular dolaşır.
 *  WebGL yoksa ya da sahne kurulamazsa hafif kıvılcımlı yedek arka plan. */
function MenuBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const [fallback, setFallback] = useState(false);
  const [shown, setShown] = useState(false);
  const vid = useRef<HTMLVideoElement>(null);
  // telefonda canlı 3B sahne açılmaz (veri ve pil): hazır savaş videosu döner. Masaüstünde video hemen oynar,
  // canlı sahne tüm modeller (boss + 8 oyuncu + silahlar) yüklenince üstüne yumuşakça geçer; yarım sahne hiç görünmez.
  const liveOk = useMemo(() => !matchMedia('(pointer: coarse)').matches && innerWidth > 860, []);
  useEffect(() => { document.documentElement.classList.remove('boot'); }, []);
  useEffect(() => { if (shown) { const id = setTimeout(() => vid.current?.pause(), 2000); return () => clearTimeout(id); } }, [shown]);
  useEffect(() => {
    if (fallback || !liveOk) return;
    const canvas = ref.current!;
    let r: Renderer3D;
    // Tilki Kral Arenası: 8 kişilik grup boss'la savaşıyor (giriş ekranı sahnesi)
    const l = getLayout('bazaar');
    const zk = l.zones.find((z) => z.monster === 'fox_king');
    const bx = zk ? zk.x : l.spawn.x, by = zk ? zk.y : l.spawn.y;
    const g: any = { selfId: 1, cls: 'guardian', dx: bx, dy: by, ents: new Map<number, CEnt>(), selfFlags: 0, selfAnim: Anim.IDLE, selfAnimStart: 0, lastMoveAt: 0, sdir: 64, targetId: 0, charId: 1, hoverId: 0, camYaw: 0 };
    try {
      r = new Renderer3D(g, canvas, document.createElement('canvas'));
      r.setLayout(l);
    } catch (e) { console.warn('[menü] 3B sahne kurulamadı', e); setFallback(true); return; }
    const fx = r.fx;
    const mk = (id: number, kind: number, x: number, y: number, extra: Record<string, unknown>) => ({ id, kind, x, y, samples: [{ t: 0, x, y }], dir: 64, anim: Anim.IDLE, animStart: 0, hp: 100, maxHp: 100, flags: 0, level: 30, name: '', cls: 0, variant: 0, tpl: 0, weapon: 0, wplus: 0, guild: '', icon: '', rarity: 0, owner: 0, ttlEnd: 1e12, label: '', hurtUntil: 0, spawnAt: 0, deadAt: 0, ...extra }) as unknown as CEnt & { combo?: number; skill?: number };
    const BOSS = 9;
    const boss = mk(BOSS, Kind.MONSTER, bx, by, { tpl: MONSTER_INDEX.get('fox_king') ?? 0, level: 20, name: 'Tilki Kral', hp: 26000, maxHp: 36000 });
    g.ents.set(BOSS, boss);
    const dirTo = (x0: number, y0: number, x1: number, y1: number) => ((Math.atan2(y1 - y0, x1 - x0) / (Math.PI * 2)) * 256 + 256) % 256;
    // c: 0 Muhafız (yakın), 1 Avcı, 2 Arkanist; r: bossa uzaklık (px), a: açı
    const party = [
      { n: 'Defne', c: 0, r: 100, a: 0.2, w: 3, p: 6 }, { n: 'Mert', c: 0, r: 104, a: 2.3, w: 6, p: 4 }, { n: 'Kaan', c: 0, r: 98, a: 4.3, w: 9, p: 5 },
      { n: 'Ayşe', c: 1, r: 255, a: 1.15, w: 1, p: 5 }, { n: 'Bora', c: 1, r: 265, a: 3.55, w: 4, p: 0 },
      { n: 'Elif', c: 2, r: 225, a: 0.55, w: 7, p: 6 }, { n: 'Zeynep', c: 2, r: 235, a: 2.85, w: 2, p: 3 }, { n: 'Emir', c: 2, r: 230, a: 5.15, w: 5, p: 0 },
    ].map((m, i) => {
      const x = bx + Math.cos(m.a) * m.r, y = by + Math.sin(m.a) * m.r;
      const e = mk(10 + i, Kind.PLAYER, x, y, { name: m.n, cls: m.c, level: 24 + i * 3, weapon: m.w, wplus: m.p, dir: dirTo(x, y, bx, by) });
      g.ents.set(e.id, e);
      return { ...m, e, next: performance.now() + 600 + i * 230, n2: 0 };
    });
    const later: { at: number; f: () => void }[] = [];
    const after = (ms: number, f: () => void) => later.push({ at: performance.now() + ms, f });
    const hitBoss = (dmg: number, crit = false) => {
      boss.hp = Math.max(1, boss.hp - dmg); boss.hurtUntil = performance.now() + 140;
      fx.text(bx + (Math.random() - 0.5) * 50, by, 3.4 + Math.random() * 0.6, (crit ? '' : '') + dmg.toLocaleString('tr-TR'), crit ? '#ffd84a' : '#fff1d6', crit ? 26 : 18, 900);
      if (boss.hp < boss.maxHp * 0.25) boss.hp = Math.round(boss.maxHp * 0.8); // sahne sonsuz döngü: kral "toparlanır"
    };
    let bossNext = performance.now() + 1500, bossN = 0;
    const co = { x: bx, y: by, dist: 16, pitch: 0.4 };
    (r as any).camOverride = co;
    const cut0 = sharedU.cutR.value; sharedU.cutR.value = 0; // oyuncu yok: kameranın önündeki nesneler saydamlaşmasın
    let raf = 0, last = performance.now(), frames = 0;
    const t0 = last;
    const loop = (t: number) => {
      const dt = Math.min(100, t - last); last = t;
      const s = (t - t0) / 1000;
      const rec = (window as any).__menuCam as ((s: number) => [number, number]) | undefined; // video kaydı için kamera
      if (rec) [r.camYaw, co.dist] = rec(s);
      else { r.camYaw = s * 0.06; co.dist = 15 + Math.sin(s * 0.11) * 2; } // tam tur ≈ 1,7 dakika
      for (let k = later.length - 1; k >= 0; k--) if (t >= later[k].at) { const f = later[k].f; later.splice(k, 1); f(); }
      // oyuncular
      for (const m of party) {
        const e = m.e;
        e.dir = dirTo(e.x, e.y, bx, by);
        if (t < m.next) continue;
        m.n2++;
        const ex = e.x, ey = e.y;
        if (m.c === 0) {
          e.anim = Anim.ATTACK; e.animStart = t; e.combo = (m.n2 - 1) % 3;
          const a = Math.atan2(by - ey, bx - ex);
          after(160, () => {
            fx.shapes.push({ kind: 'slash', x: ex, y: ey, r: e.combo === 2 ? 64 : 74, r2: e.combo ?? 0, a: a + (e.combo === 1 ? 0.35 : e.combo === 0 ? -0.35 : 0), t0: performance.now(), dur: 260, color: e.combo === 2 ? '#ffe2a0' : '#ffffff' });
            fx.shapes.push({ kind: 'blast', x: bx, y: by, r: 46, r2: 0, a: 0, t0: performance.now(), dur: 200, color: '#fff4d8' });
            const crit = Math.random() < 0.2; hitBoss(Math.round(380 + Math.random() * 260) * (crit ? 2 : 1), crit);
          });
          if (m.n2 % 5 === 0) fx.shapes.push({ kind: 'shield', x: ex, y: ey, r: 40, r2: 0, a: 0, t0: t, dur: 1600, color: '#ffd27a', follow: e.id });
          m.next = t + 720 + Math.random() * 260;
        } else if (m.c === 1) {
          e.anim = Anim.ATTACK; e.animStart = t;
          const volley = m.n2 % 4 === 0;
          for (let k = 0; k < (volley ? 3 : 1); k++) after(140 + k * 110, () => {
            fx.projs.push({ x0: ex, y0: ey, tx: bx, ty: by, tgt: BOSS, t0: performance.now(), dur: 220, kind: 'arrow', color: '#fff' });
            after(220, () => { const crit = Math.random() < 0.25; hitBoss(Math.round(300 + Math.random() * 220) * (crit ? 2 : 1), crit); });
          });
          m.next = t + 820 + Math.random() * 300;
        } else {
          const big = m.n2 % 4 === 0, heal = !big && m.n2 % 5 === 0;
          e.anim = Anim.CAST; e.animStart = t; e.skill = big ? 2 : heal ? 3 : 0;
          if (big) after(420, () => {
            fx.shapes.push({ kind: 'circle', x: bx, y: by, r: 150, r2: 0, a: 0, t0: performance.now(), dur: 420, color: 'rgba(197,139,255,0.5)' });
            after(420, () => {
              fx.shapes.push({ kind: 'blast', x: bx, y: by, r: 150, r2: 0, a: 0, t0: performance.now(), dur: 380, color: '#c58bff' });
              fx.burst(bx, by, 0.4, 46, '#d6b0ff', 5, 800, 0.24); fx.light(bx, by, 1.4, '#c58bff', 7, 500);
              hitBoss(Math.round(1400 + Math.random() * 600), true);
            });
          });
          else if (heal) {
            const tank = party[(m.n2 / 5) % 3 | 0].e;
            after(300, () => { fx.shapes.push({ kind: 'heal', x: tank.x, y: tank.y, r: 70, r2: 0, a: 0, t0: performance.now(), dur: 900, color: '#8dffb0' }); fx.text(tank.x, tank.y, 2.3, '+' + (600 + Math.round(Math.random() * 300)), '#6dff9a', 18); });
          } else after(260, () => {
            fx.projs.push({ x0: ex, y0: ey, tx: bx, ty: by, tgt: BOSS, t0: performance.now(), dur: 280, kind: 'orb', color: m.n2 % 2 ? '#7cf3ff' : '#ff9a5a' });
            fx.light(ex, ey, 1.6, '#7cf3ff', 3, 300);
            after(280, () => { const crit = Math.random() < 0.2; hitBoss(Math.round(420 + Math.random() * 260) * (crit ? 2 : 1), crit); });
          });
          m.next = t + (big ? 1700 : 1100) + Math.random() * 300;
        }
      }
      // Tilki Kral: sırayla öndekilere pençe, her üçüncüde yere vurma
      if (t >= bossNext) {
        bossN++;
        const slam = bossN % 3 === 0;
        const victim = party[bossN % 3].e;
        boss.dir = dirTo(bx, by, victim.x, victim.y);
        boss.anim = Anim.ATTACK; boss.animStart = t;
        if (slam) {
          fx.shapes.push({ kind: 'ring', x: bx, y: by, r: 190, r2: 0.7, a: 0, t0: t, dur: 700, color: 'rgba(255,110,60,0.55)' });
          after(700, () => {
            fx.shapes.push({ kind: 'blast', x: bx, y: by, r: 190, r2: 0, a: 0, t0: performance.now(), dur: 420, color: '#ff7a3a' });
            fx.burst(bx, by, 0.2, 60, '#ffb070', 6, 900, 0.26); fx.light(bx, by, 1.2, '#ff7a3a', 8, 600);
            r.shake(2);
            for (const m of party) if (m.c === 0) fx.text(m.e.x, m.e.y, 2.4, '-' + (700 + Math.round(Math.random() * 300)), '#ff6a5a', 18);
          });
        } else after(320, () => { fx.burst(victim.x, victim.y, 1.1, 12, '#ff5040', 3.5, 420, 0.16); fx.text(victim.x, victim.y, 2.4, '-' + (300 + Math.round(Math.random() * 200)), '#ff6a5a', 16); });
        bossNext = t + (slam ? 2600 : 1900);
      }
      // geniş ekranda ferman solda: savaş sahnesi sağ boşlukta görünsün
      const cw = canvas.clientWidth, chh = canvas.clientHeight;
      if (cw > 860 && !rec) r.camera.setViewOffset(cw, chh, -cw * 0.04, 0, cw, chh); else if (r.camera.view) r.camera.clearViewOffset();
      try { r.draw(t, dt); } catch (e) { console.warn('[menü] çizim hatası', e); setFallback(true); return; }
      const self = (r as any).self; if (self) self.obj.visible = false; // kendi karakter yok
      // canlı sahne ancak herkes (boss, 8 oyuncu, silahları) tam yüklenince belirir; o zamana dek video oynar
      if (!shownRef) {
        const views = (r as any).views as Map<number, { glb?: unknown; ph?: boolean; wpend?: string | null; apend?: string | null }> | undefined;
        const ok = !!views && [BOSS, ...party.map((m) => m.e.id)].every((id) => { const v = views.get(id); return v && v.glb && !v.ph && !v.wpend && !v.apend; });
        frames = ok ? frames + 1 : 0;
        if (frames > 20) { shownRef = true; canvas.dataset.ready = '1'; setShown(true); }
      }
      raf = requestAnimationFrame(loop);
    };
    let shownRef = false;
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); sharedU.cutR.value = cut0; try { r.renderer.dispose(); r.renderer.forceContextLoss(); } catch { /* */ } };
  }, [fallback]);
  if (fallback) return <SparkBackdrop />;
  // hazır sahne görüntüsü anında görünür; canlı 3B sahne hazır olunca üstüne yumuşakça geçer
  return <>
    <video ref={vid} className="screen-poster" src="/poster/arena.mp4" poster="/poster/arena.jpg" autoPlay muted loop playsInline preload="auto" />
    {liveOk && <canvas ref={ref} className={'screen-live' + (shown ? ' on' : '')} />}
    <div className="screen-vignette" />
  </>;
}

/** Yedek arka plan: hafif sis ve kıvılcımlar. */
function SparkBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    let raf = 0; const parts = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 0.5, v: Math.random() * 0.0006 + 0.0002 }));
    const loop = () => {
      c.width = c.clientWidth; c.height = c.clientHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) { p.y -= p.v; if (p.y < 0) p.y = 1; ctx.fillStyle = `rgba(255,214,140,${0.25 + p.s * 0.15})`; ctx.beginPath(); ctx.arc(p.x * c.width, p.y * c.height, p.s, 0, Math.PI * 2); ctx.fill(); }
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(raf);
  }, []);
  return <canvas ref={ref} className="screen-bg" style={{ width: '100%', height: '100%' }} />;
}

/** Karakter seçiminde dönen 3B sınıf önizlemesi. */
function ClassPreview({ cls }: { cls: ClassId }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [waiting, setWaiting] = useState(true);
  useEffect(() => {
    setWaiting(true);
    const canvas = ref.current!;
    const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    r.outputColorSpace = THREE.SRGBColorSpace; r.toneMapping = THREE.ACESFilmicToneMapping; r.shadowMap.enabled = true;
    const scene = new THREE.Scene();
    const cam = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
    cam.position.set(0, 1.25, 5.3); cam.lookAt(0, 0.95, 0);
    scene.add(new THREE.HemisphereLight(0xdfe8ff, 0x3a2a18, 0.9));
    const key = new THREE.DirectionalLight(0xfff0d8, 2.6); key.position.set(2, 4, 3); key.castShadow = true; scene.add(key);
    const rim = new THREE.DirectionalLight(0x9fd0ff, 1.6); rim.position.set(-3, 2, -3); scene.add(rim);
    const floor = new THREE.Mesh(new THREE.CircleGeometry(1.4, 48), new THREE.MeshStandardMaterial({ color: 0x2a3424, roughness: 0.9 }));
    floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);
    // Asıl model yüklenene kadar bekleme göstergesi; model hiç yoksa ya da yüklenemezse prosedürel model
    let rig: ReturnType<typeof createHumanoid> | null = null;
    let glb: GlbChar | null = null;
    let manifestReady = false;
    const show = () => {
      if (glb) return;
      const g = createGlbChar(cls);
      if (g) {
        equipGlb(g, LOOKS[cls]);
        if (rig) scene.remove(rig.root);
        rig = null; glb = g;
        scene.add(g.root);
        setWaiting(false);
      } else if (!rig && manifestReady && !modelPending(cls)) {
        setWaiting(false);
        rig = createHumanoid(LOOKS[cls]);
        rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        scene.add(rig.root);
      }
    };
    loadManifest().then(() => { manifestReady = true; show(); });
    show();
    const off = onModelReady((id) => { if (id === cls && !glb) show(); });
    const offSt = onModelStatus(show);
    let raf = 0; const t0 = performance.now(); let last = t0; let lastCyc = 0;
    const loop = (t: number) => {
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (canvas.width !== w * devicePixelRatio) { r.setPixelRatio(devicePixelRatio); r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
      const s = (t - t0) / 1000, dt = t - last; last = t;
      const obj = glb?.root ?? rig?.root;
      if (obj) obj.rotation.y = Math.sin(s * 0.5) * 0.6;
      const cyc = s % 5, acting = cyc > 3.6;
      const st = acting ? (cls === 'arcanist' ? 'cast' : 'attack') : 'idle';
      if (glb) { glb.update(st, dt, false, 0, acting && lastCyc <= 3.6); }
      else if (rig) animateHumanoid(rig, st, s, acting ? (cyc - 3.6) / 1.4 : 0, 0);
      lastCyc = cyc;
      r.render(scene, cam);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); off(); offSt(); r.dispose(); };
  }, [cls]);
  return <div className="preview-wrap"><canvas ref={ref} className="preview3d" />{waiting && <div className="preview-wait"><i /><span>Karakter yükleniyor…</span></div>}</div>;
}

function CharScreen({ me, onPlay, onReload, onLogout, error }: { me: Me; onPlay: (id: number) => void; onReload: () => void; onLogout: () => void; error: string }) {
  const [sel, setSel] = useState<number | null>(me.characters[0]?.id ?? null);
  const [creating, setCreating] = useState(me.characters.length === 0);
  const [name, setName] = useState('');
  const [cls, setCls] = useState<ClassId>('guardian');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const selChar = me.characters.find((c) => c.id === sel);
  const previewCls: ClassId = creating ? cls : selChar?.cls ?? 'guardian';
  const create = async () => {
    const v = validateCharacterName(name);
    if (v) return setErr(v);
    if (busy) return;
    setBusy(true); setErr('');
    try { const r = await api<{ id: number }>('/api/characters', { name, cls }); setCreating(false); setSel(r.id); onReload(); }
    catch (e) { setErr((e as Error).message); }
    setBusy(false);
  };
  return (
    <div className="screen">
      <div className="frame charsel">
        <div>
          <div className="row"><div className="title" style={{ fontSize: 22 }}>Karakterler</div><div className="spacer" /><span className="muted" style={{ fontSize: 12 }}>{me.account.username}</span><button className="btn small ghost" onClick={onLogout}>Çıkış</button></div>
          {error && <div className="err">{error}</div>}
          <div className="charlist" style={{ marginTop: 12 }}>
            {me.characters.map((c) => (
              <div key={c.id} className={'charcard' + (sel === c.id && !creating ? ' on' : '')} onClick={() => { setSel(c.id); setCreating(false); }} onDoubleClick={() => onPlay(c.id)}>
                <div className="ico"><ClassIcon cls={c.cls} /></div>
                <div><div style={{ fontWeight: 800 }}>{c.name}</div><div className="muted" style={{ fontSize: 12 }}>{CLASSES[c.cls].name} · Seviye {c.level} · {MAPS[c.map]?.name ?? c.map}</div></div>
              </div>
            ))}
            {me.characters.length < 4 && <button className="btn ghost" onClick={() => setCreating(true)}>+ Yeni karakter</button>}
          </div>
          {creating && (
            <div style={{ marginTop: 16 }}>
              <div className="title" style={{ fontSize: 17, marginBottom: 6 }}>Sınıf seç</div>
              <div className="classpick">
                {CLASS_IDS.map((c) => <button key={c} className={cls === c ? 'on' : ''} onClick={() => setCls(c)}><ClassIcon cls={c} /><div>{CLASSES[c].name}</div></button>)}
              </div>
              <div className="muted" style={{ fontSize: 13, minHeight: 36 }}>{CLASSES[cls].desc}</div>
              <div className="field" style={{ marginTop: 8 }}><label>Karakter adı (2–18)</label><input value={name} maxLength={18} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && create()} /></div>
              {err && <div className="err">{err}</div>}
              <button className="btn primary" style={{ width: '100%' }} onClick={create} disabled={busy}>Oluştur</button>
              <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Hesap başına bir defa Başlangıç Sandığı: 50 Mücevher + 10 Kırmızı İksir.</div>
            </div>
          )}
          {!creating && selChar && <button className="btn primary" style={{ width: '100%', marginTop: 16, padding: 12, fontSize: 16 }} onClick={() => onPlay(selChar.id)}>Oyna</button>}
        </div>
        <div className="col">
          <ClassPreview cls={previewCls} />
          <div className="title" style={{ textAlign: 'center', fontSize: 20 }}>{creating ? CLASSES[cls].name : selChar?.name}</div>
        </div>
      </div>
    </div>
  );
}

interface ChannelInfo { id: number; name: string; population: number; capacity: number; status: string }
function ChannelScreen({ charId, onBack, onEnter }: { charId: number; onBack: () => void; onEnter: (ticket: string, ch: number) => void }) {
  const [data, setData] = useState<{ open: boolean; reason: string | null; channels: ChannelInfo[]; realm: { name: string; online: number; capacity: number } } | null>(null);
  const [err, setErr] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const nonceRef = useRef('');
  const load = () => api('/api/channels').then(setData).catch((e) => setErr(e.message));
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, []);
  const enter = async (ch: number) => {
    if (pending !== null) return; // tek bekleyen giriş
    const nonce = Math.random().toString(36).slice(2);
    nonceRef.current = nonce;
    setPending(ch); setErr('');
    try {
      const r = await api<{ ticket: string; nonce: string; channel: number }>('/api/admission', { characterId: charId, channel: ch, nonce });
      if (r.nonce !== nonceRef.current) return; // geç gelen eski yanıt
      onEnter(r.ticket, r.channel);
    } catch (e) { setErr((e as Error).message); }
    setPending(null);
  };
  return (
    <div className="screen">
      <div className="frame channels">
        <div className="row"><div className="title" style={{ fontSize: 22 }}>Kanal Seç</div><div className="spacer" /><button className="btn small ghost" onClick={onBack}>Geri</button></div>
        {data && <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>{data.realm.name} · Çevrimiçi {data.realm.online}/{data.realm.capacity}</div>}
        {data && !data.open && <div className="err">{data.reason}</div>}
        <div className="chgrid">
          {data?.channels.map((c) => {
            const k = c.population / c.capacity;
            const label = c.status === 'full' ? 'Dolu' : c.status === 'busy' ? 'Yoğun' : c.status === 'restarting' ? 'Yeniden başlatılıyor' : c.status === 'maintenance' ? 'Bakımda' : 'Uygun';
            return (
              <button key={c.id} className="chcard" disabled={!data.open || c.status === 'full' || c.status === 'restarting' || c.status === 'maintenance' || pending !== null} onClick={() => enter(c.id)}>
                <div className="row"><b>{c.name}</b><div className="spacer" /><span className="muted" style={{ fontSize: 12 }}>{pending === c.id ? 'Bağlanıyor…' : label}</span></div>
                <div className={'bar ' + (c.status === 'full' ? 'full' : c.status === 'busy' ? 'busy' : '')} style={{ marginTop: 8 }}><i style={{ width: `${Math.min(100, k * 100)}%` }} /></div>
                <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>{c.population} / {c.capacity}</div>
              </button>
            );
          })}
        </div>
        {err && <div className="err">{err}</div>}
        <div className="muted" style={{ fontSize: 11 }}>Kanal değiştirince bulunduğun kanaldaki grup/etkinlik bağlantın kesilir. Karakterin ve eşyaların korunur.</div>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<App />);
