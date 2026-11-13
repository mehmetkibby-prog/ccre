import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { CLASSES, CLASS_IDS, MAPS, Kind, Anim, getLayout, validateCharacterName, type ClassId } from '@col/shared';
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
  return (
    <div className="screen live auth-screen">
      <MenuBackdrop />
      <div className="ferman-wrap">
        <form className="ferman" onSubmit={submit}>
          <div className="ferman-roll top" aria-hidden />
          <div className="ferman-body">
            <TugraMark />
            <h1 className="ferman-title">Tuğra<span>ONLINE</span></h1>
            <div className="ferman-sub">Fermandır: kılıcını kuşan, pazara in, adını duyur.</div>
            {OFFLINE && <div className="ferman-note"><b>Test sürümü.</b> Oyun tarayıcının içinde çalışır; hesabın yalnız bu cihazda saklanır, gördüğün diğer oyuncular test botlarıdır.</div>}
            <div className="ferman-tabs">
              <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>Giriş</button>
              <i>❖</i>
              <button type="button" className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>Kayıt Ol</button>
            </div>
            <label className="ink"><span>Kullanıcı adı</span><input autoComplete="username" value={f.username} onChange={set('username')} maxLength={20} /></label>
            {tab === 'register' && <label className="ink"><span>E-posta (isteğe bağlı)</span><input type="email" value={f.email} onChange={set('email')} /></label>}
            {tab === 'forgot' && <label className="ink"><span>Sıfırlama kodu (aldıysan)</span><input value={f.code} onChange={set('code')} /></label>}
            {(tab !== 'forgot' || f.code) && <label className="ink"><span>{tab === 'forgot' ? 'Yeni parola' : 'Parola'}</span><input type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} /></label>}
            {tab === 'register' && <label className="ink"><span>Parola tekrar</span><input type="password" autoComplete="new-password" value={f.password2} onChange={set('password2')} /></label>}
            {err && <div className="ferman-err">{err}</div>}
            {info && <div className="ferman-ok">{info}</div>}
            <button className="seal-btn" disabled={busy}>
              <span className="seal" aria-hidden><svg viewBox="0 0 40 40"><path d="M20 7 L23 15 L32 15 L25 20 L28 29 L20 24 L12 29 L15 20 L8 15 L17 15 Z" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /></svg></span>
              <span>{busy ? 'Bekle…' : tab === 'login' ? 'Mühürle ve Gir' : tab === 'register' ? 'Hesabı Mühürle' : f.code ? 'Parolayı Değiştir' : 'Kod Gönder'}</span>
            </button>
            <a className="ferman-link" onClick={() => setTab(tab === 'forgot' ? 'login' : 'forgot')}>{tab === 'forgot' ? 'Girişe dön' : 'Parolamı unuttum'}</a>
            <RealmLine />
          </div>
          <div className="ferman-roll bottom" aria-hidden />
        </form>
      </div>
    </div>
  );
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
  useEffect(() => {
    if (fallback) return;
    const canvas = ref.current!;
    let r: Renderer3D;
    const l = getLayout('bazaar');
    const sx = l.spawn.x, sy = l.spawn.y;
    const g: any = { selfId: 1, cls: 'guardian', dx: sx, dy: sy, ents: new Map<number, CEnt>(), selfFlags: 0, selfAnim: Anim.IDLE, selfAnimStart: 0, lastMoveAt: 0, sdir: 64, targetId: 0, charId: 1, hoverId: 0, camYaw: 0 };
    try {
      r = new Renderer3D(g, canvas, document.createElement('canvas'));
      r.setLayout(l);
    } catch (e) { console.warn('[menü] 3B sahne kurulamadı', e); setFallback(true); return; }
    // meydanda dolaşan oyuncular: farklı yarıçap, hız ve yönde çember
    const names = ['Defne', 'Mert', 'Ayşe', 'Kaan', 'Elif', 'Bora', 'Zeynep'];
    const walkers = names.map((name, i) => ({ r: 150 + (i % 4) * 70, w: (0.05 + (i % 3) * 0.018) * (i % 2 ? 1 : -1), p: i * 0.9 }));
    walkers.forEach((wk, i) => {
      const x = sx + Math.cos(wk.p) * wk.r, y = sy + Math.sin(wk.p) * wk.r;
      g.ents.set(10 + i, { id: 10 + i, kind: Kind.PLAYER, x, y, samples: [{ t: 0, x, y }], dir: 64, anim: Anim.WALK, animStart: 0, hp: 100, maxHp: 100, flags: 0, level: 10 + i * 4, name: names[i], cls: i % 3, variant: 0, tpl: 0, weapon: [0, 3, 6, 9, 1, 4, 7][i], wplus: i % 3 === 0 ? 5 : 0, guild: '', icon: '', rarity: 0, owner: 0, ttlEnd: 1e12, label: '', hurtUntil: 0, spawnAt: 0, deadAt: 0 } as unknown as CEnt);
    });
    const co = { x: sx, y: sy - 40, dist: 15, pitch: 0.42 };
    const cut0 = sharedU.cutR.value; sharedU.cutR.value = 0; // oyuncu yok: kameranın önündeki nesneler saydamlaşmasın
    (r as any).camOverride = co;
    let raf = 0, last = performance.now(), frames = 0;
    const t0 = last;
    const loop = (t: number) => {
      const dt = Math.min(100, t - last); last = t;
      const s = (t - t0) / 1000;
      r.camYaw = s * 0.045; // tam tur ≈ 2 dakika
      walkers.forEach((wk, i) => {
        const e = g.ents.get(10 + i);
        const a = wk.p + s * wk.w;
        const nx = sx + Math.cos(a) * wk.r, ny = sy + Math.sin(a) * wk.r;
        const ang = Math.atan2(ny - e.y, nx - e.x);
        e.dir = ((ang / (Math.PI * 2)) * 256 + 256) % 256;
        e.x = nx; e.y = ny;
      });
      try { r.draw(t, dt); } catch (e) { console.warn('[menü] çizim hatası', e); setFallback(true); return; }
      const self = (r as any).self; if (self) self.obj.visible = false; // kendi karakter yok
      if (++frames === 3) setShown(true);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); sharedU.cutR.value = cut0; try { r.renderer.dispose(); r.renderer.forceContextLoss(); } catch { /* */ } };
  }, [fallback]);
  if (fallback) return <SparkBackdrop />;
  return <><canvas ref={ref} className={'screen-live' + (shown ? ' on' : '')} /><div className="screen-vignette" /></>;
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
