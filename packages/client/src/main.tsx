import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import * as THREE from 'three';
import { CLASSES, CLASS_IDS, MAPS, validateCharacterName, type ClassId } from '@col/shared';
import { api } from './api.ts';
import { store, useStore } from './game/store.ts';
import { GameScreen } from './ui/GameScreen.tsx';
import { createHumanoid, animateHumanoid, LOOKS } from './g3d/humanoid.ts';
import { createGlbChar, loadManifest, onModelReady, type GlbChar } from './g3d/models.ts';
import { equipGlb } from './g3d/gear.ts';
import { ClassIcon } from './ui/icons.tsx';
import './ui/styles.css';
import { OFFLINE } from './mode.ts';
import { AdminPanel, AnnouncementBar, useCanAdmin } from './admin/AdminPanel.tsx';
// Test (Artifact) sürümü: yönetim ayarlarını paylaşılan kayıttan okur.
if (OFFLINE) import('./admin/config.ts').then((m) => m.startConfigSync());

type Screen = { s: 'loading' } | { s: 'auth' } | { s: 'chars' } | { s: 'channels'; charId: number } | { s: 'game'; ticket: string; charId: number; channel: number };
interface Me { account: { id: number; username: string; role: string }; characters: { id: number; name: string; cls: ClassId; level: number; map: string }[] }

function App() {
  return <><AppScreens /><MenuAdmin /></>;
}

/** Menü ekranlarında (oyun dışında) yönetim düğmesi ve duyuru. */
function MenuAdmin() {
  const canAdmin = useCanAdmin();
  const [open, setOpen] = useState(false);
  const inGame = useStoreConnected();
  if (inGame) return null;
  return <>
    <AnnouncementBar />
    {canAdmin && <button className="btn small primary admin-btn" onClick={() => setOpen(true)}>Yönetim Paneli</button>}
    {open && <AdminPanel onClose={() => setOpen(false)} />}
  </>;
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
    <div className="screen">
      <MenuBackdrop />
      <div style={{ zIndex: 1 }}>
        <div className="logo">Tuğra<small>ONLINE</small><em>Yaşam Çekirdeği Destanı</em></div>
        {OFFLINE && <div className="frame auth" style={{ padding: '12px 16px', marginBottom: 12, fontSize: 13 }}><b className="title">Test sürümü</b><div className="muted" style={{ marginTop: 4 }}>Oyun sunucusu bu sürümde tarayıcının içinde çalışır. Hesabın ve karakterin yalnız bu cihazda saklanır. Köyde ve ormanda gördüğün diğer oyuncular test botlarıdır.</div></div>}
        <form className="frame auth" onSubmit={submit}>
          <div className="tabs">
            <button type="button" className={tab === 'login' ? 'on' : ''} onClick={() => setTab('login')}>Giriş</button>
            <button type="button" className={tab === 'register' ? 'on' : ''} onClick={() => setTab('register')}>Kayıt Ol</button>
          </div>
          <div className="field"><label>Kullanıcı adı</label><input autoComplete="username" value={f.username} onChange={set('username')} maxLength={20} /></div>
          {tab === 'register' && <div className="field"><label>E-posta (isteğe bağlı)</label><input type="email" value={f.email} onChange={set('email')} /></div>}
          {tab === 'forgot' && <div className="field"><label>Sıfırlama kodu (aldıysan)</label><input value={f.code} onChange={set('code')} /></div>}
          {(tab !== 'forgot' || f.code) && <div className="field"><label>{tab === 'forgot' ? 'Yeni parola' : 'Parola'}</label><input type="password" autoComplete={tab === 'login' ? 'current-password' : 'new-password'} value={f.password} onChange={set('password')} /></div>}
          {tab === 'register' && <div className="field"><label>Parola tekrar</label><input type="password" autoComplete="new-password" value={f.password2} onChange={set('password2')} /></div>}
          {err && <div className="err">{err}</div>}
          {info && <div className="ok" style={{ fontSize: 13, marginBottom: 8 }}>{info}</div>}
          <button className="btn primary" style={{ width: '100%', padding: 12, fontSize: 16 }} disabled={busy}>{busy ? 'Bekle…' : tab === 'login' ? 'Oyuna Gir' : tab === 'register' ? 'Hesap Oluştur' : f.code ? 'Parolayı Değiştir' : 'Kod Gönder'}</button>
          <div className="row" style={{ marginTop: 10, justifyContent: 'center' }}>
            <a className="muted" style={{ fontSize: 12, cursor: 'pointer' }} onClick={() => setTab(tab === 'forgot' ? 'login' : 'forgot')}>{tab === 'forgot' ? 'Girişe dön' : 'Parolamı unuttum'}</a>
          </div>
        </form>
      </div>
    </div>
  );
}

/** Menü arka planı: yavaşça dönen 3B köy sahnesi yerine hafif sis ve kıvılcımlar (düşük maliyet). */
function MenuBackdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current!; const ctx = c.getContext('2d')!;
    let raf = 0; const parts = Array.from({ length: 60 }, () => ({ x: Math.random(), y: Math.random(), s: Math.random() * 2 + 0.5, v: Math.random() * 0.0006 + 0.0002 }));
    const loop = () => {
      c.width = c.clientWidth; c.height = c.clientHeight;
      ctx.clearRect(0, 0, c.width, c.height);
      for (const p of parts) { p.y -= p.v; if (p.y < 0) p.y = 1; ctx.fillStyle = `rgba(160,255,200,${0.25 + p.s * 0.15})`; ctx.beginPath(); ctx.arc(p.x * c.width, p.y * c.height, p.s, 0, Math.PI * 2); ctx.fill(); }
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
  useEffect(() => {
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
    // Hazır gerçekçi model varsa onu, yoksa (yüklenene kadar) prosedürel modeli göster
    let rig: ReturnType<typeof createHumanoid> | null = null;
    let glb: GlbChar | null = null;
    const show = () => {
      const g = createGlbChar(cls);
      if (g) {
        equipGlb(g, LOOKS[cls]);
        if (rig) scene.remove(rig.root);
        rig = null; glb = g;
        scene.add(g.root);
      } else if (!rig) {
        rig = createHumanoid(LOOKS[cls]);
        rig.root.traverse((o) => { if ((o as THREE.Mesh).isMesh) o.castShadow = true; });
        scene.add(rig.root);
      }
    };
    loadManifest().then(show);
    show();
    const off = onModelReady((id) => { if (id === cls && !glb) show(); });
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
    return () => { cancelAnimationFrame(raf); off(); r.dispose(); };
  }, [cls]);
  return <canvas ref={ref} className="preview3d" />;
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
