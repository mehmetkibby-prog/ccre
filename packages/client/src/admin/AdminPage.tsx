/**
 * Yönetim sayfası (/admin1997): oyundan ayrı, telefonda da rahat kullanılan tam sayfa.
 * Sunucu sürümünde her şey sunucu API'si ile; tarayıcı test sürümünde (#admin1997) paylaşılan ayar kaydı ve yerel oyuncular ile.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CLASSES, MAPS, TUNING, sanitizeTuning, type ClassId, type GameTuning, type MonsterTune, type SpawnTune } from '@col/shared';
import { api } from '../api.ts';
import { OFFLINE } from '../mode.ts';
import { ClassIcon } from '../ui/icons.tsx';
import { configState, onConfig, saveConfig, applyRemoteTuning } from './config.ts';
import { GeneralTab, MonsterTab, RarityTable, LootTab, EnchantTab, UpgradeTab, MapTab, LevelTab, Num, fmtN } from './AdminPanel.tsx';

// ───────── veri katmanı ─────────
export interface APlayer {
  id: number; name: string; cls: string; level: number; gems: number; potions: number; map: string; online: boolean;
  kills?: number; lastSeen?: string | null; accountId?: number; username?: string; role?: string; bannedUntil?: string | null; banReason?: string | null; bot?: boolean;
}
interface Opening { mode: 'closed' | 'scheduled' | 'open' | 'maintenance'; openAt: number | null; message: string; revision: number }
interface Summary {
  online: number; capacity: number; channels: { id: number; population: number; capacity: number; alive: boolean; elu: number | null }[];
  accounts: number; characters: number; newAccounts: number; activeDay: number; opening: Opening | null; worldHealth?: number; topDonors?: { name: string; amount: number }[];
  uptime: number; heapMB: number; rssMB: number; saveQueue: number; saveFailures: number; load: number; freeMemMB: number;
}
interface Backend {
  loadTuning(): Promise<{ tuning: GameTuning; revision: number }>;
  saveTuning(t: GameTuning, revision: number): Promise<{ tuning: GameTuning; revision: number }>;
  summary(): Promise<Summary>;
  setOpening(o: Omit<Opening, 'revision'>, revision: number): Promise<Opening>;
  setWorld?(health: number): Promise<number>;
  players(q: string, onlyOnline: boolean): Promise<APlayer[]>;
  updatePlayer(id: number, patch: { level?: number; gems?: number; potions?: number }): Promise<string>;
  resetPlayer(id: number): Promise<string>;
  account?(accountId: number, body: Record<string, unknown>): Promise<void>;
  kick?(accountId: number): Promise<void>;
}
const serverBackend: Backend = {
  loadTuning: () => api('/api/admin/tuning'),
  saveTuning: async (tuning, revision) => { const r = await api('/api/admin/tuning', { tuning, revision }); applyRemoteTuning(r.tuning); return r; },
  summary: () => api('/api/admin/summary'),
  setOpening: (o, revision) => api('/api/admin/opening', { ...o, revision }),
  setWorld: async (health) => (await api('/api/admin/world', { health })).health,
  players: (q, on) => api(`/api/admin/players?q=${encodeURIComponent(q)}${on ? '&online=1' : ''}`),
  updatePlayer: async (id, patch) => (await api('/api/admin/player', { id, ...patch })).text,
  resetPlayer: async (id) => (await api('/api/admin/player/reset', { id })).text,
  account: async (accountId, body) => { await api('/api/admin/account', { accountId, ...body }); },
  kick: async (accountId) => { await api('/api/admin/kick', { accountId }); },
};
const localBackend: Backend = {
  loadTuning: async () => ({ tuning: structuredClone(TUNING), revision: 0 }),
  saveTuning: async (t) => { await saveConfig(t); return { tuning: sanitizeTuning(t), revision: 0 }; },
  summary: async () => {
    const m = await import('../offline/local.ts');
    const list = m.adminPlayers();
    return { online: list.filter((p) => p.online).length, capacity: 120, channels: [{ id: 1, population: list.filter((p) => p.online).length, capacity: 120, alive: true, elu: null }], accounts: 0, characters: list.filter((p) => !p.bot).length, newAccounts: 0, activeDay: 0, opening: null, uptime: Math.round(performance.now() / 1000), heapMB: 0, rssMB: 0, saveQueue: 0, saveFailures: 0, load: 0, freeMemMB: 0 };
  },
  setOpening: async () => { throw new Error('Test sürümünde oyun her zaman açık.'); },
  players: async (q, on) => {
    const m = await import('../offline/local.ts');
    return m.adminPlayers().filter((p) => (!on || p.online) && (!q || p.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr'))));
  },
  updatePlayer: async (id, patch) => (await import('../offline/local.ts')).adminUpdatePlayer(id, patch),
  resetPlayer: async (id) => (await import('../offline/local.ts')).adminResetPlayer(id),
};
const backend = OFFLINE ? localBackend : serverBackend;

type Tab = 'durum' | 'oyuncu' | 'genel' | 'seviye' | 'canavar' | 'ganimet' | 'efsun' | 'arti' | 'harita';
const TABS: [Tab, string, string][] = [
  ['durum', 'Durum', '◉'], ['oyuncu', 'Oyuncular', '☺'], ['genel', 'Genel', '⚙'], ['seviye', 'Seviye', '▲'], ['canavar', 'Canavarlar', '✶'],
  ['ganimet', 'Ganimet', '◆'], ['efsun', 'Efsunlar', '✧'], ['arti', 'Artı Basma', '⚒'], ['harita', 'Haritalar', '⌖'],
];
const SETTING_TABS = new Set<Tab>(['genel', 'seviye', 'canavar', 'ganimet', 'efsun', 'arti', 'harita']);
const ROLE_NAME: Record<string, string> = { player: 'Oyuncu', moderator: 'Moderatör', gm: 'GM', admin: 'Yönetici', owner: 'Kurucu' };

// ───────── giriş kapısı ─────────
export function AdminPage() {
  const [me, setMe] = useState<{ username: string; role: string } | null | undefined>(undefined);
  const check = useCallback(async () => {
    if (OFFLINE) { setMe(configState.canEdit ? { username: 'Sahip', role: 'owner' } : null); return; }
    try { const m = await api('/api/me'); setMe({ username: m.account.username, role: m.account.role }); } catch { setMe(null); }
  }, []);
  useEffect(() => { check(); if (OFFLINE) return onConfig(() => check()); }, [check]);
  useEffect(() => { document.title = 'Tuğra Yönetim'; }, []);
  if (me === undefined) return <div className="adm-page center"><div className="adm-spin" /></div>;
  if (!me) return OFFLINE ? <div className="adm-page center"><div className="adm-card narrow"><h2>Yönetim</h2><p className="muted">Bu test sürümünde ayarları yalnız sayfanın sahibi değiştirebilir.</p><a className="btn" href="./">Oyuna dön</a></div></div> : <AdminLogin onDone={check} />;
  if (me.role !== 'admin' && me.role !== 'owner') return (
    <div className="adm-page center"><div className="adm-card narrow">
      <h2>Yetkin yok</h2><p className="muted"><b>{me.username}</b> hesabı yönetici değil.</p>
      <div className="row"><button className="btn" onClick={async () => { await api('/api/logout', {}).catch(() => {}); check(); }}>Başka hesapla gir</button><a className="btn ghost" href="/">Oyuna dön</a></div>
    </div></div>
  );
  return <AdminShell me={me} onLogout={async () => { await api('/api/logout', {}).catch(() => {}); check(); }} />;
}

function AdminLogin({ onDone }: { onDone: () => void }) {
  const [u, setU] = useState(''); const [p, setP] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); if (busy) return; setBusy(true); setErr('');
    try { await api('/api/login', { username: u, password: p }); onDone(); } catch (e2) { setErr((e2 as Error).message); }
    setBusy(false);
  };
  return (
    <div className="adm-page center">
      <form className="adm-card narrow" onSubmit={submit}>
        <div className="adm-brand big">Tuğra<small>Yönetim Paneli</small></div>
        <div className="field"><label>Kullanıcı adı</label><input autoComplete="username" value={u} onChange={(e) => setU(e.target.value)} /></div>
        <div className="field"><label>Parola</label><input type="password" autoComplete="current-password" value={p} onChange={(e) => setP(e.target.value)} /></div>
        {err && <div className="err">{err}</div>}
        <button className="btn primary" style={{ width: '100%', padding: 12 }} disabled={busy}>{busy ? 'Bekle…' : 'Giriş yap'}</button>
      </form>
    </div>
  );
}

// ───────── kabuk: üst çubuk, sekmeler, kaydet çubuğu ─────────
function AdminShell({ me, onLogout }: { me: { username: string; role: string }; onLogout: () => void }) {
  const [tab, setTab] = useState<Tab>(() => { const k = location.hash.split('/').pop() as Tab; return TABS.some((x) => x[0] === k) ? k : 'durum'; });
  const [t, setT] = useState<GameTuning | null>(null);
  const [base, setBase] = useState('');
  const [rev, setRev] = useState(0);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ ok: boolean; text: string } | null>(null);
  const [online, setOnline] = useState<number | null>(null);
  const load = useCallback(async () => {
    try { const r = await backend.loadTuning(); setT(structuredClone(r.tuning)); setBase(JSON.stringify(sanitizeTuning(r.tuning))); setRev(r.revision); }
    catch (e) { setToast({ ok: false, text: (e as Error).message }); }
  }, []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (toast) { const id = setTimeout(() => setToast(null), 4200); return () => clearTimeout(id); } }, [toast]);
  const dirty = !!t && JSON.stringify(sanitizeTuning(t)) !== base;
  const save = async () => {
    if (!t) return;
    setBusy(true);
    try { const r = await backend.saveTuning(t, rev); setT(structuredClone(r.tuning)); setBase(JSON.stringify(sanitizeTuning(r.tuning))); setRev(r.revision); setToast({ ok: true, text: 'Kaydedildi. Oyundaki herkese anında uygulandı.' }); }
    catch (e) { setToast({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };
  const go = (k: Tab) => { setTab(k); try { history.replaceState(null, '', (OFFLINE ? '#admin1997/' : '#/') + k); } catch { /* */ } window.scrollTo({ top: 0 }); };
  const setTT = setT as React.Dispatch<React.SetStateAction<GameTuning>>;
  const setMon = (id: string, patch: Partial<MonsterTune>) => setT((cur) => {
    if (!cur) return cur;
    const m = { ...(cur.monsters[id] ?? {}), ...patch } as Record<string, unknown>;
    for (const k of Object.keys(m)) if (m[k] === undefined) delete m[k];
    const monsters = { ...cur.monsters }; if (Object.keys(m).length) monsters[id] = m as MonsterTune; else delete monsters[id];
    return { ...cur, monsters };
  });
  const setSpawn = (key: string, patch: Partial<SpawnTune>) => setT((cur) => {
    if (!cur) return cur;
    const m = { ...(cur.spawns[key] ?? {}), ...patch } as Record<string, unknown>;
    for (const k of Object.keys(m)) if (m[k] === undefined) delete m[k];
    const spawns = { ...cur.spawns }; if (Object.keys(m).length) spawns[key] = m as SpawnTune; else delete spawns[key];
    return { ...cur, spawns };
  });
  const title = TABS.find((x) => x[0] === tab)?.[1];
  return (
    <div className={'adm-page' + (dirty ? ' has-save' : '')}>
      <header className="adm-top">
        <div className="adm-brand">Tuğra<small>Yönetim</small></div>
        {online !== null && <span className="adm-live"><i />{online} çevrimiçi</span>}
        <div className="spacer" />
        <span className="adm-me">{me.username}<small>{ROLE_NAME[me.role] ?? me.role}</small></span>
        <a className="btn small ghost" href={OFFLINE ? './' : '/'}>Oyun</a>
        {!OFFLINE && <button className="btn small ghost" onClick={onLogout}>Çıkış</button>}
      </header>
      <nav className="adm-nav" role="tablist">
        {TABS.map(([k, l, ic]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><span className="ic">{ic}</span>{l}</button>)}
      </nav>
      <main className="adm-main">
        <h1 className="adm-h1">{title}</h1>
        {tab === 'durum' && <StatusTab t={t} setT={setTT} onOnline={setOnline} toast={setToast} save={save} dirty={dirty} />}
        {tab === 'oyuncu' && <PlayersTab toast={setToast} />}
        {SETTING_TABS.has(tab) && !t && <div className="adm-spin" />}
        {SETTING_TABS.has(tab) && t && (
          <div className="adm-settings">
            <p className="muted adm-hint">Boş kutu = varsayılan değer. Değişiklikler <b>Kaydet</b> deyince oyundaki herkese anında uygulanır.</p>
            {tab === 'genel' && <GeneralTab t={t} setT={setTT} dis={busy} />}
            {tab === 'seviye' && <LevelTab t={t} setT={setTT} dis={busy} />}
            {tab === 'canavar' && <MonsterTab t={t} setMon={setMon} dis={busy} />}
            {tab === 'ganimet' && <><RarityTable t={t} setT={setTT} dis={busy} /><LootTab t={t} setMon={setMon} dis={busy} /></>}
            {tab === 'efsun' && <EnchantTab t={t} setT={setTT} dis={busy} />}
            {tab === 'arti' && <UpgradeTab t={t} setT={setTT} dis={busy} />}
            {tab === 'harita' && <MapTab t={t} setT={setTT} setSpawn={setSpawn} dis={busy} />}
          </div>
        )}
      </main>
      {dirty && (
        <div className="adm-savebar">
          <span>Kaydedilmemiş değişiklik</span>
          <div className="spacer" />
          <button className="btn small ghost" disabled={busy} onClick={() => t && setT(JSON.parse(base))}>Geri al</button>
          <button className="btn small primary" disabled={busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet ve uygula'}</button>
        </div>
      )}
      {toast && <div className={'adm-toast ' + (toast.ok ? 'ok' : 'bad')} role="status">{toast.text}</div>}
    </div>
  );
}

// ───────── durum: açılış, duyuru, kanallar, sunucu ─────────
const MODES: [Opening['mode'], string, string][] = [['open', 'Açık', 'Herkes girebilir'], ['closed', 'Kapalı', 'Yalnız yöneticiler'], ['maintenance', 'Bakım', 'Mesaj gösterilir']];
function StatusTab({ t, setT, onOnline, toast, save, dirty }: { t: GameTuning | null; setT: React.Dispatch<React.SetStateAction<GameTuning>>; onOnline: (n: number) => void; toast: (x: { ok: boolean; text: string }) => void; save: () => void; dirty: boolean }) {
  const [s, setS] = useState<Summary | null>(null);
  const [msg, setMsg] = useState('');
  const [pending, setPending] = useState(false);
  const load = useCallback(async () => { try { const x = await backend.summary(); setS(x); onOnline(x.online); } catch (e) { toast({ ok: false, text: (e as Error).message }); } }, [onOnline, toast]);
  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [load]);
  useEffect(() => { if (s?.opening) setMsg(s.opening.message ?? ''); }, [s?.opening?.revision]); // eslint-disable-line react-hooks/exhaustive-deps
  const setMode = async (mode: Opening['mode']) => {
    if (!s?.opening || pending) return;
    setPending(true);
    try { const o = await backend.setOpening({ mode, openAt: null, message: msg }, s.opening.revision); setS({ ...s, opening: o }); toast({ ok: true, text: `Oyun durumu: ${MODES.find((m) => m[0] === mode)?.[1]}` }); }
    catch (e) { toast({ ok: false, text: (e as Error).message }); load(); }
    setPending(false);
  };
  const up = s ? `${Math.floor(s.uptime / 86400)} g ${Math.floor((s.uptime % 86400) / 3600)} sa ${Math.floor((s.uptime % 3600) / 60)} dk` : '';
  return (
    <div className="adm-grid">
      <div className="adm-stats">
        <Stat k="Çevrimiçi" v={s ? `${s.online}` : '…'} sub={s ? `kapasite ${s.capacity}` : ''} accent />
        <Stat k="Hesap" v={s ? fmtN(s.accounts, 0) : '…'} sub={s ? `son 24 sa: +${s.newAccounts}` : ''} />
        <Stat k="Karakter" v={s ? fmtN(s.characters, 0) : '…'} sub={s ? `bugün aktif: ${s.activeDay}` : ''} />
        <Stat k="Çalışma süresi" v={up || '…'} sub={s && s.heapMB ? `bellek ${s.rssMB} MB` : ''} />
      </div>

      {s?.opening && (
        <section className="adm-card">
          <h3>Oyun durumu</h3>
          <div className="adm-seg">
            {MODES.map(([m, l, d]) => <button key={m} className={s.opening!.mode === m ? 'on ' + m : ''} disabled={pending} onClick={() => setMode(m)}><b>{l}</b><small>{d}</small></button>)}
          </div>
          <div className="field" style={{ marginTop: 12, marginBottom: 0 }}><label>Kapalı / bakım mesajı</label>
            <input value={msg} maxLength={300} placeholder="Ör. Sunucu 20:00'de açılıyor" onChange={(e) => setMsg(e.target.value)} onBlur={() => s.opening && msg !== s.opening.message && setMode(s.opening.mode)} />
          </div>
        </section>
      )}

      {s?.worldHealth !== undefined && <WorldCard s={s} toast={toast} reload={load} />}

      <section className="adm-card">
        <h3>Duyuru şeridi</h3>
        <p className="muted adm-hint">Oyunun en üstünde herkese görünen kısa mesaj. Boş bırakılırsa gizlenir.</p>
        <textarea className="admin-ta" maxLength={200} disabled={!t} value={t?.announcement ?? ''} placeholder="Ör. Bu akşam çift TP etkinliği!" onChange={(e) => t && setT({ ...t, announcement: e.target.value })} />
        <div className="row" style={{ marginTop: 8 }}><div className="spacer" /><button className="btn small primary" disabled={!dirty} onClick={save}>Yayınla</button></div>
      </section>

      <section className="adm-card">
        <h3>Kanallar</h3>
        <div className="adm-chs">
          {s?.channels.map((c) => (
            <div key={c.id} className={'adm-ch' + (c.alive ? '' : ' down')}>
              <div className="row"><b>Kanal {c.id}</b><div className="spacer" /><span className="muted">{c.alive ? `${c.population}/${c.capacity}` : 'yeniden başlıyor'}</span></div>
              <div className="bar" style={{ marginTop: 6 }}><i style={{ width: `${Math.min(100, (c.population / c.capacity) * 100)}%` }} /></div>
              {c.elu !== null && <small className="muted">işlemci yükü %{c.elu}</small>}
            </div>
          ))}
        </div>
      </section>

      {s && s.heapMB > 0 && (
        <section className="adm-card">
          <h3>Sunucu</h3>
          <div className="adm-kv">
            <span>Sistem yükü (1 dk)</span><b>{s.load.toFixed(2)}</b>
            <span>Boş bellek</span><b>{fmtN(s.freeMemMB, 0)} MB</b>
            <span>Oyun süreci belleği</span><b>{s.rssMB} MB</b>
            <span>Kayıt kuyruğu</span><b className={s.saveQueue > 50 ? 'warn' : ''}>{s.saveQueue}</b>
            <span>Kayıt hatası</span><b className={s.saveFailures ? 'warn' : ''}>{s.saveFailures}</b>
          </div>
        </section>
      )}
    </div>
  );
}
function WorldCard({ s, toast, reload }: { s: Summary; toast: (x: { ok: boolean; text: string }) => void; reload: () => void }) {
  const [v, setV] = useState<number | undefined>(undefined);
  const wh = s.worldHealth ?? 100;
  const set = async (n: number) => { try { await backend.setWorld!(n); toast({ ok: true, text: `Dünya Sağlığı %${fmtN(n, 1)} yapıldı.` }); setV(undefined); reload(); } catch (e) { toast({ ok: false, text: (e as Error).message }); } };
  return (
    <section className="adm-card">
      <h3>Dünya Sağlığı</h3>
      <div className="row" style={{ gap: 10 }}><div className={'bar wh' + (wh < 30 ? ' low' : '')} style={{ flex: 1, height: 10 }}><i style={{ width: `${wh}%` }} /></div><b style={{ fontVariantNumeric: 'tabular-nums' }}>%{fmtN(wh, 1)}</b></div>
      <p className="muted adm-hint" style={{ marginTop: 8 }}>Azalma hızı ve bağış etkisi <b>Genel</b> sekmesinde.</p>
      {backend.setWorld && (
        <div className="row wrap" style={{ gap: 8 }}>
          <Num v={v} def={Math.round(wh)} min={0} max={100} step={1} w={84} on={setV} />
          <button className="btn small primary" disabled={v === undefined} onClick={() => v !== undefined && set(v)}>Ayarla</button>
          <button className="btn small ghost" onClick={() => set(100)}>%100 yap</button>
        </div>
      )}
      {!!s.topDonors?.length && <div className="adm-kv" style={{ marginTop: 12 }}>{s.topDonors.map((d) => <React.Fragment key={d.name}><span>{d.name}</span><b>{fmtN(d.amount, 0)} Öz</b></React.Fragment>)}</div>}
    </section>
  );
}
function Stat({ k, v, sub, accent }: { k: string; v: string; sub?: string; accent?: boolean }) {
  return <div className={'adm-stat' + (accent ? ' accent' : '')}><small>{k}</small><b>{v}</b>{sub && <span>{sub}</span>}</div>;
}

// ───────── oyuncular: arama, kart, düzenleme ─────────
function PlayersTab({ toast }: { toast: (x: { ok: boolean; text: string }) => void }) {
  const [q, setQ] = useState('');
  const [onlyOnline, setOnlyOnline] = useState(false);
  const [list, setList] = useState<APlayer[] | null>(null);
  const [open, setOpen] = useState<number | null>(null);
  const load = useCallback(async () => { try { setList(await backend.players(q.trim(), onlyOnline)); } catch (e) { toast({ ok: false, text: (e as Error).message }); } }, [q, onlyOnline, toast]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  return (
    <div>
      <div className="adm-search-row">
        <input className="adm-search" placeholder="Karakter ya da hesap adı ara…" value={q} onChange={(e) => setQ(e.target.value)} />
        <button className={'btn small' + (onlyOnline ? ' primary' : ' ghost')} onClick={() => setOnlyOnline(!onlyOnline)}>Çevrimiçi</button>
      </div>
      {!list && <div className="adm-spin" />}
      {list && !list.length && <p className="muted">Oyuncu bulunamadı.</p>}
      <div className="adm-plist">
        {list?.map((p) => <PlayerCard key={p.id} p={p} open={open === p.id} onToggle={() => setOpen(open === p.id ? null : p.id)} toast={toast} reload={load} />)}
      </div>
    </div>
  );
}
function PlayerCard({ p, open, onToggle, toast, reload }: { p: APlayer; open: boolean; onToggle: () => void; toast: (x: { ok: boolean; text: string }) => void; reload: () => void }) {
  const [edit, setEdit] = useState<{ level?: number; gems?: number; potions?: number }>({});
  const [confirm, setConfirm] = useState<'' | 'reset' | 'ban'>('');
  const [banH, setBanH] = useState(24); const [banR, setBanR] = useState('');
  const [busy, setBusy] = useState(false);
  const run = async (f: () => Promise<string | void>, okText?: string) => {
    setBusy(true);
    try { const r = await f(); toast({ ok: true, text: `${p.name}: ${r || okText || 'Tamam.'}` }); setEdit({}); setConfirm(''); reload(); }
    catch (e) { toast({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };
  const changed = Object.values(edit).some((v) => v !== undefined);
  const cls = (p.cls in CLASSES ? p.cls : 'guardian') as ClassId;
  const seen = p.lastSeen ? new Date(p.lastSeen).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '';
  const staff = p.role === 'admin' || p.role === 'owner';
  return (
    <div className={'adm-pcard' + (open ? ' open' : '') + (p.bannedUntil ? ' banned' : '')}>
      <button className="adm-phead" onClick={onToggle}>
        <span className="ico"><ClassIcon cls={cls} size={26} /></span>
        <span className="nm"><b>{p.name}</b><small>{p.username ? `${p.username} · ` : ''}{CLASSES[cls]?.name} · {MAPS[p.map]?.name ?? p.map}</small></span>
        <span className="lv">Sv. {p.level}</span>
        <span className={'dot' + (p.online ? ' on' : '')} title={p.online ? 'Çevrimiçi' : 'Çevrimdışı'} />
      </button>
      {open && (
        <div className="adm-pbody">
          <div className="adm-tags">
            {p.role && <span className={'tag' + (staff ? ' gold' : '')}>{ROLE_NAME[p.role] ?? p.role}</span>}
            {p.bot && <span className="tag">Bot</span>}
            {p.bannedUntil && <span className="tag bad">Yasaklı: {new Date(p.bannedUntil).toLocaleString('tr-TR')}{p.banReason ? ` · ${p.banReason}` : ''}</span>}
            {p.kills !== undefined && <span className="tag">{fmtN(p.kills, 0)} av</span>}
            {seen && !p.online && <span className="tag">Son: {seen}</span>}
          </div>
          <div className="adm-fields">
            <label><span>Seviye</span><Num v={edit.level} def={p.level} min={1} max={65} step={1} w={84} on={(v) => setEdit({ ...edit, level: v })} /></label>
            <label><span>Mücevher</span><Num v={edit.gems} def={p.gems} min={0} max={1e12} step={1} w={110} on={(v) => setEdit({ ...edit, gems: v })} /></label>
            <label><span>Kırmızı İksir</span><Num v={edit.potions} def={p.potions} min={0} max={1e7} step={1} w={84} on={(v) => setEdit({ ...edit, potions: v })} /></label>
          </div>
          <div className="adm-acts">
            <button className="btn small primary" disabled={!changed || busy} onClick={() => run(() => backend.updatePlayer(p.id, edit))}>Değişikliği uygula</button>
            {!p.bot && (confirm === 'reset'
              ? <><button className="btn small red" disabled={busy} onClick={() => run(() => backend.resetPlayer(p.id))}>Evet, sıfırla</button><button className="btn small ghost" onClick={() => setConfirm('')}>Vazgeç</button></>
              : <button className="btn small ghost" disabled={busy} onClick={() => setConfirm('reset')}>Karakteri sıfırla</button>)}
            {backend.kick && p.online && p.accountId && <button className="btn small ghost" disabled={busy} onClick={() => run(() => backend.kick!(p.accountId!), 'oyundan çıkarıldı.')}>Oyundan at</button>}
          </div>
          {confirm === 'reset' && <p className="muted adm-hint">Seviye 1'e iner; çanta, eşyalar (beyaz başlangıç silahı ve zırhı verilir), para, malzemeler, statü ve beceriler sıfırlanır, köye ışınlanır.</p>}
          {backend.account && p.accountId && p.role !== 'owner' && (
            <div className="adm-acc">
              <label className="adm-inline"><span>Rol</span>
                <select className="adm-sel" disabled={busy} value={p.role} onChange={(e) => run(() => backend.account!(p.accountId!, { role: e.target.value }), 'rol güncellendi.')}>
                  {['player', 'moderator', 'gm', 'admin'].map((r) => <option key={r} value={r}>{ROLE_NAME[r]}</option>)}
                </select>
              </label>
              {p.bannedUntil
                ? <button className="btn small" disabled={busy} onClick={() => run(() => backend.account!(p.accountId!, { unban: true }), 'yasak kaldırıldı.')}>Yasağı kaldır</button>
                : confirm === 'ban'
                  ? <div className="adm-ban">
                      <select className="adm-sel" value={banH} onChange={(e) => setBanH(Number(e.target.value))}>{[[1, '1 saat'], [24, '1 gün'], [72, '3 gün'], [168, '1 hafta'], [720, '1 ay'], [87600, 'Süresiz']].map(([h, l]) => <option key={h} value={h}>{l}</option>)}</select>
                      <input className="adm-num" style={{ flex: 1, minWidth: 120 }} placeholder="Sebep" value={banR} maxLength={200} onChange={(e) => setBanR(e.target.value)} />
                      <button className="btn small red" disabled={busy} onClick={() => run(() => backend.account!(p.accountId!, { banHours: banH, banReason: banR }), 'yasaklandı.')}>Yasakla</button>
                      <button className="btn small ghost" onClick={() => setConfirm('')}>Vazgeç</button>
                    </div>
                  : <button className="btn small ghost danger" disabled={busy} onClick={() => setConfirm('ban')}>Yasakla…</button>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Yönetim sayfası mı? (sunucu: /admin1997, tarayıcı test sürümü: #admin1997) */
export function isAdminRoute() {
  return /^\/admin1997\/?$/.test(location.pathname) || location.hash.startsWith('#admin1997');
}
export default AdminPage;
