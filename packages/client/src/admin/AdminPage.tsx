/**
 * Yönetim sayfası (/admin1997): oyundan ayrı, telefonda da rahat kullanılan tam sayfa.
 * Sunucu sürümünde her şey sunucu API'si ile; tarayıcı test sürümünde (#admin1997) paylaşılan ayar kaydı ve yerel oyuncular ile.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { CLASSES, MAPS, TUNING, sanitizeTuning, ITEM_TEMPLATES, RARITIES, RARITY, MAX_PLUS, MATERIALS, MALL_ITEMS, type ClassId, type GameTuning, type MonsterTune, type SpawnTune } from '@col/shared';
import { api } from '../api.ts';
import { OFFLINE } from '../mode.ts';
import { ClassIcon } from '../ui/icons.tsx';
import { configState, onConfig, saveConfig, applyRemoteTuning } from './config.ts';
import { GeneralTab, MonsterTab, RarityTable, LootTab, ZoneLootTab, EnchantTab, UpgradeTab, TransformTab, MapTab, LevelTab, BossTab, FishingTab, MallTab, Num, fmtN } from './AdminPanel.tsx';
import { TowerTab } from './TowerAdmin.tsx';

// ───────── veri katmanı ─────────
export interface APlayer {
  id: number; name: string; cls: string; level: number; gems: number; potions: number; map: string; online: boolean; cp?: number;
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
  updatePlayer(id: number, patch: { level?: number; gems?: number; potions?: number; cp?: number }): Promise<string>;
  sendCp?(id: number, amount: number): Promise<string>;
  give?(id: number, g: Record<string, unknown>): Promise<string>;
  epinList?(): Promise<{ code: string; cp: number; note: string | null; createdAt: string; usedAt: string | null; usedBy: string | null }[]>;
  epinCreate?(cp: number, count: number, note: string): Promise<string[]>;
  resetPlayer(id: number): Promise<string>;
  account?(accountId: number, body: Record<string, unknown>): Promise<void>;
  kick?(accountId: number): Promise<void>;
  accounts?(q: string, f: AccFilter, offset: number): Promise<AccList>;
  setAccess?(accountId: number, allow: boolean): Promise<void>;
}
type AccFilter = 'all' | 'access' | 'new' | 'banned';
interface AAccount { id: number; username: string; email: string | null; role: string; testAccess: boolean; banned: boolean; createdAt: string; lastLogin: string | null; charCount: number; chars: { name: string; cls: string; level: number }[]; online: boolean }
interface AccList { total: number; offset: number; stats: { total: number; day: number; week: number; access: number }; rows: AAccount[] }
const serverBackend: Backend = {
  loadTuning: () => api('/api/admin/tuning'),
  saveTuning: async (tuning, revision) => { const r = await api('/api/admin/tuning', { tuning, revision }); applyRemoteTuning(r.tuning); return r; },
  summary: () => api('/api/admin/summary'),
  setOpening: (o, revision) => api('/api/admin/opening', { ...o, revision }),
  setWorld: async (health) => (await api('/api/admin/world', { health })).health,
  players: (q, on) => api(`/api/admin/players?q=${encodeURIComponent(q)}${on ? '&online=1' : ''}`),
  updatePlayer: async (id, patch) => (await api('/api/admin/player', { id, ...patch })).text,
  resetPlayer: async (id) => (await api('/api/admin/player/reset', { id })).text,
  sendCp: async (id, amount) => (await api('/api/admin/cp', { id, amount })).text,
  give: async (id, g) => (await api('/api/admin/give', { id, ...g })).text,
  epinList: () => api('/api/admin/epin'),
  epinCreate: async (cp, count, note) => (await api('/api/admin/epin', { cp, count, note })).codes,
  account: async (accountId, body) => { await api('/api/admin/account', { accountId, ...body }); },
  kick: async (accountId) => { await api('/api/admin/kick', { accountId }); },
  accounts: (q, f, offset) => api(`/api/admin/accounts?q=${encodeURIComponent(q)}&f=${f}&offset=${offset}`),
  setAccess: async (accountId, allow) => { await api('/api/admin/access', { accountId, allow }); },
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

type Tab = 'durum' | 'kayit' | 'oyuncu' | 'genel' | 'seviye' | 'boss' | 'canavar' | 'ganimet' | 'efsun' | 'arti' | 'donusum' | 'harita' | 'balik' | 'market' | 'arena' | 'kule';
const TABS: [Tab, string, string][] = [
  ['durum', 'Durum', '◉'], ...(backend.accounts ? [['kayit', 'Kayıtlar', '☰'] as [Tab, string, string]] : []), ['oyuncu', 'Oyuncular', '☺'],
  ['arena', 'Savaş Arenası', '⚔'], ['kule', 'Kadim Kule', '♜'], ['boss', 'Bosslar', '♛'],
  ['genel', 'Genel', '⚙'], ['seviye', 'Seviye', '▲'], ['canavar', 'Canavarlar', '✶'], ['harita', 'Haritalar', '⌖'],
  ['ganimet', 'Ganimet', '◆'], ['efsun', 'Efsunlar', '✧'], ['arti', 'Artı Basma', '⚒'], ['donusum', 'Dönüşüm', '✦'], ['market', 'Nesne Market', '✦'], ['balik', 'Balıkçılık', '≈'],
];
/** Sekme grupları: sol menüde başlık altında, telefonda yatay çubukta küçük ayraçla */
const GROUPS: [string, Tab[]][] = [
  ['Sunucu', ['durum', 'kayit', 'oyuncu']],
  ['Etkinlikler', ['arena', 'kule', 'boss']],
  ['Oyun dengesi', ['genel', 'seviye', 'canavar', 'harita']],
  ['Ekonomi', ['ganimet', 'efsun', 'arti', 'donusum', 'market', 'balik']],
];
const SETTING_TABS = new Set<Tab>(['genel', 'seviye', 'boss', 'balik', 'market', 'canavar', 'ganimet', 'efsun', 'arti', 'donusum', 'harita', 'arena', 'kule']);
const ROLE_NAME: Record<string, string> = { player: 'Oyuncu', moderator: 'Moderatör', gm: 'GM', admin: 'Yönetici', owner: 'Kurucu' };

// ───────── giriş kapısı ─────────
export function AdminPage() {
  const [me, setMe] = useState<{ username: string; role: string } | null | undefined>(undefined);
  const check = useCallback(async () => {
    if (OFFLINE) { setMe(configState.canEdit ? { username: 'Sahip', role: 'owner' } : null); return; }
    try { const m = await api('/api/me'); setMe({ username: m.account.username, role: m.account.role }); } catch { setMe(null); }
  }, []);
  useEffect(() => { check(); if (OFFLINE) return onConfig(() => check()); }, [check]);
  useEffect(() => { document.title = 'Core of Life 3D Yönetim'; }, []);
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
        <div className="adm-brand big">Core of Life 3D<small>Yönetim Paneli</small></div>
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
        <div className="adm-brand">Core of Life 3D<small>Yönetim</small></div>
        {online !== null && <span className="adm-live"><i />{online} çevrimiçi</span>}
        <div className="spacer" />
        <span className="adm-me">{me.username}<small>{ROLE_NAME[me.role] ?? me.role}</small></span>
        <a className="btn small ghost" href={OFFLINE ? './' : '/'}>Oyun</a>
        {!OFFLINE && <button className="btn small ghost" onClick={onLogout}>Çıkış</button>}
      </header>
      <nav className="adm-nav" role="tablist">
        {GROUPS.map(([g, ks]) => (
          <div className="adm-ng" key={g}>
            <span className="adm-ngh">{g}</span>
            {ks.map((k) => TABS.find((x) => x[0] === k)).filter((x): x is [Tab, string, string] => !!x).map(([k, l, ic]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => go(k)}><span className="ic">{ic}</span>{l}</button>)}
          </div>
        ))}
      </nav>
      <main className="adm-main">
        <h1 className="adm-h1">{title}</h1>
        {tab === 'durum' && <StatusTab t={t} setT={setTT} onOnline={setOnline} toast={setToast} save={save} dirty={dirty} />}
        {tab === 'kayit' && <AccountsTab toast={setToast} />}
        {tab === 'oyuncu' && <PlayersTab toast={setToast} />}
        {SETTING_TABS.has(tab) && !t && <div className="adm-spin" />}
        {SETTING_TABS.has(tab) && t && (
          <div className="adm-settings">
            <p className="muted adm-hint">Boş kutu = varsayılan değer. Değişiklikler <b>Kaydet</b> deyince oyundaki herkese anında uygulanır.</p>
            {tab === 'genel' && <GeneralTab t={t} setT={setTT} dis={busy} />}
            {tab === 'seviye' && <LevelTab t={t} setT={setTT} dis={busy} />}
            {tab === 'kule' && <TowerTab t={t} setT={setTT} dis={busy} />}
            {tab === 'boss' && <BossTab t={t} setMon={setMon} setSpawn={setSpawn} dis={busy} />}
            {tab === 'balik' && <FishingTab t={t} setT={setTT} dis={busy} />}
            {tab === 'market' && <MallTab t={t} setT={setTT} dis={busy} epin={backend.epinCreate ? <EpinBox toast={setToast} /> : undefined} />}
            {tab === 'canavar' && <MonsterTab t={t} setMon={setMon} dis={busy} />}
            {tab === 'ganimet' && <><ZoneLootTab t={t} setT={setTT} dis={busy} /><details className="admin-sec adm-more"><summary>Canavara özel ganimet (isteğe bağlı, bölge ayarının üstüne yazar)</summary><LootTab t={t} setMon={setMon} dis={busy} /></details><RarityTable t={t} setT={setTT} dis={busy} /></>}
            {tab === 'efsun' && <EnchantTab t={t} setT={setTT} dis={busy} />}
            {tab === 'arti' && <UpgradeTab t={t} setT={setTT} dis={busy} />}
            {tab === 'donusum' && <TransformTab t={t} setT={setTT} dis={busy} />}
            {tab === 'arena' && <><ArenaTab t={t} setT={setTT} dis={busy} toast={setToast} /><KillRankAdmin t={t} setT={setTT} dis={busy} /></>}
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
        <h3>2D oyun düğmesi</h3>
        <p className="muted adm-hint">Ana menüdeki küçük "Core of Life 2D" düğmesinin gideceği adres (https:// ile başlamalı). Boş bırakılırsa düğme gizlenir.</p>
        <input className="adm-search" maxLength={200} disabled={!t} value={t?.classicUrl ?? ''} placeholder="https://2d.coreoflife.net" onChange={(e) => t && setT({ ...t, classicUrl: e.target.value })} />
        <div className="row" style={{ marginTop: 8 }}><div className="spacer" /><button className="btn small primary" disabled={!dirty} onClick={save}>Kaydet</button></div>
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
function EpinBox({ toast }: { toast: (x: { ok: boolean; text: string }) => void }) {
  const [cp, setCp] = useState<number | undefined>(500);
  const [count, setCount] = useState<number | undefined>(1);
  const [note, setNote] = useState('');
  const [made, setMade] = useState<string[]>([]);
  const [list, setList] = useState<Awaited<ReturnType<NonNullable<Backend['epinList']>>>>([]);
  const load = useCallback(() => { backend.epinList?.().then(setList).catch(() => {}); }, []);
  useEffect(() => { load(); }, [load]);
  const make = async () => {
    try { const codes = await backend.epinCreate!(cp ?? 0, count ?? 1, note); setMade(codes); toast({ ok: true, text: `${codes.length} E-PIN kodu üretildi.` }); load(); }
    catch (e) { toast({ ok: false, text: (e as Error).message }); }
  };
  const copy = (txt: string) => { navigator.clipboard?.writeText(txt).then(() => toast({ ok: true, text: 'Kopyalandı.' })).catch(() => {}); };
  return (
    <section className="admin-sec">
      <h4>E-PIN kodu üret</h4>
      <div className="muted adm-hint">Ödemeyi aldığın oyuncuya kodu ver; oyuncu Nesne Market › ÇP ve E-PIN bölümünde kodu yazınca ÇP hesabına yüklenir. Her kod bir kez kullanılır.</div>
      <div className="adm-fields">
        <label><span>ÇP</span><Num v={cp} def={500} min={1} max={1e6} step={1} w={90} on={setCp} /></label>
        <label><span>Adet</span><Num v={count} def={1} min={1} max={50} step={1} w={70} on={setCount} /></label>
        <label><span>Not (isteğe bağlı)</span><input className="adm-num" style={{ width: '100%' }} value={note} maxLength={80} onChange={(e) => setNote(e.target.value)} placeholder="ör. Ahmet - havale" /></label>
      </div>
      <div className="row" style={{ marginTop: 8 }}><button className="btn small primary" disabled={!cp} onClick={make}>Kod üret</button></div>
      {made.length > 0 && <div className="epin-made">{made.map((c) => <button key={c} className="epin-code" onClick={() => copy(c)}>{c}<small>kopyala</small></button>)}</div>}
      {list.length > 0 && <div className="adm-kv" style={{ marginTop: 12 }}>{list.slice(0, 20).map((x) => <React.Fragment key={x.code}><span style={{ fontFamily: 'monospace' }}>{x.code}</span><b>{x.cp} ÇP · {x.usedAt ? `kullanıldı (${x.usedBy ?? '?'})` : 'boşta'}</b></React.Fragment>)}</div>}
    </section>
  );
}
function Stat({ k, v, sub, accent }: { k: string; v: string; sub?: string; accent?: boolean }) {
  return <div className={'adm-stat' + (accent ? ' accent' : '')}><small>{k}</small><b>{v}</b>{sub && <span>{sub}</span>}</div>;
}

// ───────── oyuncular: arama, kart, düzenleme ─────────
/**
 * Kayıt listesi: sisteme kayıt olan tüm hesaplar (en yeni önce). Her hesaba "Bakımda giriş" izni verilebilir:
 * izinli hesaplar oyun kapalıyken ya da bakımdayken de (yönetici gibi) girer. GM/yönetici/kurucu zaten girer.
 */
function AccountsTab({ toast }: { toast: (x: { ok: boolean; text: string }) => void }) {
  const [q, setQ] = useState('');
  const [f, setF] = useState<AccFilter>('all');
  const [data, setData] = useState<AccList | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState(0);
  const load = useCallback(async () => { try { setData(await backend.accounts!(q.trim(), f, offset)); } catch (e) { toast({ ok: false, text: (e as Error).message }); } }, [q, f, offset, toast]);
  useEffect(() => { const id = setTimeout(load, 250); return () => clearTimeout(id); }, [load]);
  useEffect(() => { setOffset(0); }, [q, f]);
  const toggle = async (a: AAccount) => {
    setBusy(a.id);
    try { await backend.setAccess!(a.id, !a.testAccess); toast({ ok: true, text: `${a.username}: ${a.testAccess ? 'bakımda giriş izni kaldırıldı.' : 'artık bakımda da girebilir.'}` }); await load(); }
    catch (e) { toast({ ok: false, text: (e as Error).message }); }
    setBusy(0);
  };
  const dt = (s: string | null) => s ? new Date(s).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
  const st = data?.stats;
  const FILTERS: [AccFilter, string][] = [['all', 'Tümü'], ['access', 'Bakımda girebilenler'], ['new', 'Son 7 gün'], ['banned', 'Yasaklı']];
  return (
    <div>
      {st && <div className="adm-accstats">
        <div><b>{fmtN(st.total, 0)}</b><span>Toplam kayıt</span></div>
        <div><b>{fmtN(st.day, 0)}</b><span>Son 24 saat</span></div>
        <div><b>{fmtN(st.week, 0)}</b><span>Son 7 gün</span></div>
        <div className="gold"><b>{fmtN(st.access, 0)}</b><span>Bakımda giriş izni</span></div>
      </div>}
      <p className="muted adm-hint">“Bakımda giriş” açık olan hesaplar, oyun kapalıyken ya da bakımdayken de senin gibi oyuna girebilir. GM, yönetici ve kurucu hesapları zaten her zaman girer.</p>
      <div className="adm-search-row">
        <input className="adm-search" placeholder="Hesap, e-posta ya da karakter adı ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="adm-chips">{FILTERS.map(([k, l]) => <button key={k} className={'btn small' + (f === k ? ' primary' : ' ghost')} onClick={() => setF(k)}>{l}</button>)}</div>
      {!data && <div className="adm-spin" />}
      {data && !data.rows.length && <p className="muted">Kayıt bulunamadı.</p>}
      <div className="adm-acclist">
        {data?.rows.map((a) => {
          const staff = a.role === 'gm' || a.role === 'admin' || a.role === 'owner';
          return (
            <div key={a.id} className={'adm-accrow' + (a.banned ? ' banned' : '')}>
              <div className="who">
                <b>{a.username}</b>{a.online && <span className="dot on" title="Çevrimiçi" />}
                <small>#{a.id}{a.email ? ` · ${a.email}` : ''}</small>
                <div className="adm-tags">
                  {a.role !== 'player' && <span className={'tag' + (staff ? ' gold' : '')}>{ROLE_NAME[a.role] ?? a.role}</span>}
                  {a.banned && <span className="tag bad">Yasaklı</span>}
                  {a.chars.length ? a.chars.map((c) => <span key={c.name} className="tag">{c.name} · Sv. {c.level}</span>) : <span className="tag">Karakter yok</span>}
                  {a.charCount > a.chars.length && <span className="tag">+{a.charCount - a.chars.length}</span>}
                </div>
              </div>
              <div className="when"><span>Kayıt: {dt(a.createdAt)}</span><span>Son giriş: {dt(a.lastLogin)}</span></div>
              <div className="acc">
                {staff
                  ? <span className="tag gold">Her zaman girer</span>
                  : <label className={'adm-switch' + (a.testAccess ? ' on' : '')}>
                      <input type="checkbox" checked={a.testAccess} disabled={busy === a.id} onChange={() => toggle(a)} />
                      <span className="knob" /><span className="lbl">Bakımda giriş</span>
                    </label>}
              </div>
            </div>
          );
        })}
      </div>
      {data && data.total > 50 && (
        <div className="adm-pager">
          <button className="btn small ghost" disabled={offset === 0} onClick={() => setOffset(Math.max(0, offset - 50))}>‹ Önceki</button>
          <span>{offset + 1}–{Math.min(data.total, offset + 50)} / {data.total}</span>
          <button className="btn small ghost" disabled={offset + 50 >= data.total} onClick={() => setOffset(offset + 50)}>Sonraki ›</button>
        </div>
      )}
    </div>
  );
}

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
  const [edit, setEdit] = useState<{ level?: number; gems?: number; potions?: number; cp?: number }>({});
  const [cpAdd, setCpAdd] = useState<number | undefined>(undefined);
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
            {p.cp !== undefined && <label><span>ÇP (bakiye)</span><Num v={edit.cp} def={p.cp} min={0} max={1e9} step={1} w={100} on={(v) => setEdit({ ...edit, cp: v })} /></label>}
          </div>
          {backend.sendCp && (
            <div className="adm-cp">
              <span>ÇP gönder</span>
              {[100, 500, 1000].map((n) => <button key={n} className="btn small ghost" disabled={busy} onClick={() => run(() => backend.sendCp!(p.id, n))}>+{n}</button>)}
              <Num v={cpAdd} def={0} min={-1e7} max={1e7} step={1} w={90} on={setCpAdd} />
              <button className="btn small primary" disabled={busy || !cpAdd} onClick={() => run(() => backend.sendCp!(p.id, cpAdd!)).then(() => setCpAdd(undefined))}>Gönder</button>
            </div>
          )}
          {backend.give && <GiveBox busy={busy} onGive={(g) => run(() => backend.give!(p.id, g))} />}
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

/** Canavar Avcıları sıralaması: dönem ve ilk sıraların ödülleri (dönem bitince otomatik verilir). */
function KillRankAdmin({ t, setT, dis }: { t: GameTuning; setT: React.Dispatch<React.SetStateAction<GameTuning>>; dis: boolean }) {
  const k = t.killRank;
  const set = (p: Partial<GameTuning['killRank']>) => setT({ ...t, killRank: { ...k, ...p } });
  const setR = (i: number, p: Partial<{ cp: number; gems: number }>) => set({ rewards: k.rewards.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  return (
    <section className="admin-sec">
      <h4>Canavar Avcıları sıralaması</h4>
      <div className="muted adm-hint">Oyuncular "Sıralama" düğmesinden en çok canavar avlayanları görür. Dönem bitince (Türkiye saatiyle) ilk sıralara aşağıdaki ödüller otomatik verilir ve herkese duyurulur; sayaç sıfırlanır. Yönetici/GM hesapları sıralamaya girmez.</div>
      <label className="adm-inline" style={{ marginBottom: 8 }}><span>Dönem</span>
        <select className="adm-sel" value={k.period} disabled={dis} onChange={(e) => set({ period: e.target.value as 'day' | 'week' | 'month' })}>
          <option value="day">Günlük (her gece 00.00)</option><option value="week">Haftalık (Pazartesi 00.00)</option><option value="month">Aylık (ayın 1'i 00.00)</option>
        </select>
      </label>
      <div className="drop-list">
        {k.rewards.map((r, i) => (
          <div className="drop-row" key={i}>
            <b style={{ width: 54 }}>{i + 1}. sıra</b>
            <label className="adm-inline"><span>ÇP</span><Num v={r.cp} def={0} min={0} max={1e6} step={1} w={80} dis={dis} on={(v) => setR(i, { cp: v ?? 0 })} /></label>
            <label className="adm-inline"><span>Mücevher</span><Num v={r.gems} def={0} min={0} max={1e8} step={1} w={100} dis={dis} on={(v) => setR(i, { gems: v ?? 0 })} /></label>
            <button className="btn small ghost danger" disabled={dis} onClick={() => set({ rewards: k.rewards.filter((_, j) => j !== i) })}>✕</button>
          </div>
        ))}
        {k.rewards.length < 10 && <button className="btn small" disabled={dis} onClick={() => set({ rewards: [...k.rewards, { cp: 0, gems: 500 }] })}>+ Sıra ekle</button>}
      </div>
    </section>
  );
}

/** Yönetim sayfası mı? (sunucu: /admin1997, tarayıcı test sürümü: #admin1997) */
export function isAdminRoute() {
  return /^\/admin1997\/?$/.test(location.pathname) || location.hash.startsWith('#admin1997');
}
export default AdminPage;

/** Oyuncuya eşya ver: silah/zırh/takı (nadirlik, artı) ya da malzeme / Nesne Market ürünü (adet). */
/**
 * Savaş Arenası: otomatik saatler (Türkiye saati), süre, en düşük seviye, sıra ödülleri; canlı sıralama ve elle
 * başlat/bitir. Ödüller etkinlik bitince ilk sıralardaki oyuncuların çantasına gider (çevrimdışıysa girince).
 */
function ArenaTab({ t, setT, dis, toast }: { t: GameTuning; setT: React.Dispatch<React.SetStateAction<GameTuning>>; dis: boolean; toast: (x: { ok: boolean; text: string }) => void }) {
  const A = t.arena;
  const set = (p: Partial<GameTuning['arena']>) => setT((cur) => ({ ...cur, arena: { ...cur.arena, ...p } }));
  const [st, setSt] = useState<{ active: boolean; endsAt: number; rejected: number; board: { name: string; cls: string; kills: number; deaths: number }[]; last: { at: number; board: { name: string; kills: number; deaths: number }[] } | null } | null>(null);
  const [mins, setMins] = useState(String(A.durationMin));
  const [timesTxt, setTimesTxt] = useState(A.times.join(', '));
  useEffect(() => setTimesTxt(A.times.join(', ')), [A.times.join(',')]);
  const load = useCallback(() => { if (!OFFLINE) api('/api/admin/arena').then(setSt).catch(() => {}); }, []);
  useEffect(() => { load(); const iv = setInterval(load, 5000); return () => clearInterval(iv); }, [load]);
  const act = async (op: 'start' | 'stop') => { try { setSt(await api('/api/admin/arena', { op, minutes: Number(mins) || A.durationMin })); toast({ ok: true, text: op === 'start' ? 'Arena başlatıldı.' : 'Arena bitirildi, ödüller dağıtıldı.' }); } catch (e) { toast({ ok: false, text: (e as Error).message }); } };
  const setReward = (i: number, p: Partial<GameTuning['arena']['rewards'][number]>) => set({ rewards: A.rewards.map((r, k) => (k === i ? { ...r, ...p } : r)) });
  const matOptions = [...MATERIALS.map((m) => [m.id, m.name] as const), ...MALL_ITEMS.filter((m) => m.cat !== 'yakinda' && !m.epin).map((m) => [m.id, m.name] as const)];
  const left = st?.active ? Math.max(0, Math.round((st.endsAt - Date.now()) / 1000)) : 0;
  return (
    <>
      <section className="adm-card">
        <h3>Durum</h3>
        {OFFLINE ? <p className="muted">Test sürümünde arena yalnız sunucuda çalışır.</p> : !st ? <p className="muted">Yükleniyor…</p> : (
          <>
            <p><b style={{ color: st.active ? '#5ef0a6' : undefined }}>{st.active ? `AÇIK · kalan ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}` : 'Kapalı'}</b>{st.active && <small className="muted"> · hile denetiminde sayılmayan öldürme: {st.rejected}</small>}</p>
            <div className="row" style={{ gap: 8, flexWrap: 'wrap' }}>
              {!st.active ? <><label className="muted" style={{ fontSize: 12 }}>Süre (dk) <input className="adm-num" style={{ width: 60 }} value={mins} onChange={(e) => setMins(e.target.value.replace(/\D/g, ''))} /></label><button className="btn small primary" onClick={() => act('start')}>Şimdi başlat</button></>
                : <button className="btn small" onClick={() => act('stop')}>Şimdi bitir ve ödülleri dağıt</button>}
            </div>
            {(st.active ? st.board : st.last?.board ?? []).length > 0 && (
              <table className="adm-table" style={{ marginTop: 10 }}><thead><tr><th>#</th><th>Oyuncu</th><th>Öldürme</th><th>Ölüm</th></tr></thead>
                <tbody>{(st.active ? st.board : st.last!.board).map((b, i) => <tr key={i}><td>{i + 1}</td><td>{b.name}</td><td>{b.kills}</td><td>{b.deaths}</td></tr>)}</tbody></table>
            )}
            {!st.active && st.last && <p className="muted" style={{ fontSize: 11 }}>Son etkinlik: {new Date(st.last.at).toLocaleString('tr-TR')}</p>}
          </>
        )}
      </section>
      <section className="adm-card">
        <h3>Otomatik saatler</h3>
        <p className="muted adm-hint">Türkiye saatiyle her gün bu saatlerde kendiliğinden açılır. Virgülle ayır (ör. 13:00, 21:00). Değişiklikten sonra üstteki Kaydet'e bas.</p>
        <label className="row" style={{ gap: 8 }}><input type="checkbox" disabled={dis} checked={A.auto} onChange={(e) => set({ auto: e.target.checked })} /> Otomatik açılsın</label>
        <input className="adm-search" disabled={dis} value={timesTxt} placeholder="21:00" onChange={(e) => setTimesTxt(e.target.value)} onBlur={() => set({ times: timesTxt.split(/[,\s]+/).map((x) => x.trim()).filter((x) => /^([01]\d|2[0-3]):[0-5]\d$/.test(x)) })} />
        <div className="row" style={{ gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          <label>Süre (dk) <Num v={A.durationMin} def={15} min={3} max={120} step={1} on={(v) => set({ durationMin: Math.round(v ?? 15) })} dis={dis} w={60} /></label>
          <label>En düşük seviye <Num v={A.minLevel} def={10} min={1} max={100} step={1} on={(v) => set({ minLevel: Math.round(v ?? 10) })} dis={dis} w={60} /></label>
        </div>
      </section>
      <section className="adm-card">
        <h3>Ödüller (sıraya göre)</h3>
        <p className="muted adm-hint">En çok rakip yenen 1. olur (eşitlikte ölümü az olan, o da eşitse puana önce ulaşan). En az 1 geçerli öldürmesi olan ödül alır. Aynı hesap ya da aynı IP'den gelen öldürmeler, aynı rakipten 3'ten fazlası, yeni doğanı kesmek ve 20 seviye altındakini kesmek sayılmaz.</p>
        {A.rewards.map((r, i) => (
          <div key={i} className="arena-rw">
            <b>{i + 1}.</b>
            <label>💎 <Num v={r.gems} def={0} min={0} max={10_000_000} step={100} on={(v) => setReward(i, { gems: Math.round(v ?? 0) })} dis={dis} w={90} /></label>
            {Object.entries(r.mats).map(([k, q]) => (
              <span key={k} className="arena-mat">{matOptions.find((m) => m[0] === k)?.[1] ?? k} ×<input className="adm-num" style={{ width: 52 }} value={q} disabled={dis} onChange={(e) => setReward(i, { mats: { ...r.mats, [k]: Math.max(1, Math.min(9999, Number(e.target.value) || 1)) } })} /><button className="btn small" disabled={dis} onClick={() => { const m = { ...r.mats }; delete m[k]; setReward(i, { mats: m }); }}>✕</button></span>
            ))}
            <select className="adm-search" style={{ width: 'auto' }} disabled={dis || Object.keys(r.mats).length >= 6} value="" onChange={(e) => e.target.value && setReward(i, { mats: { ...r.mats, [e.target.value]: 1 } })}>
              <option value="">+ malzeme / market ürünü</option>
              {matOptions.filter((m) => !(m[0] in r.mats)).map((m) => <option key={m[0]} value={m[0]}>{m[1]}</option>)}
            </select>
            <select className="adm-search" style={{ width: 'auto' }} disabled={dis} value={r.item ? `${r.item.tpl}|${r.item.rarity}` : ''} onChange={(e) => { const [tpl, rarity] = e.target.value.split('|'); setReward(i, { item: tpl ? { tpl, rarity, plus: r.item?.plus ?? 0 } : undefined }); }}>
              <option value="">(eşya yok)</option>
              {ITEM_TEMPLATES.flatMap((tp) => (['orange', 'crimson', 'unique'] as const).map((ra) => <option key={tp.id + ra} value={`${tp.id}|${ra}`}>{tp.name} · {RARITY[ra]?.name ?? ra}</option>))}
            </select>
            {r.item && <label>+<Num v={r.item.plus} def={0} min={0} max={MAX_PLUS} step={1} on={(v) => setReward(i, { item: { ...r.item!, plus: Math.round(v ?? 0) } })} dis={dis} w={44} /></label>}
            <button className="btn small" disabled={dis} onClick={() => set({ rewards: A.rewards.filter((_, k) => k !== i) })}>Sırayı sil</button>
          </div>
        ))}
        <button className="btn small" disabled={dis || A.rewards.length >= 10} onClick={() => set({ rewards: [...A.rewards, { gems: 500, mats: {} }] })}>+ Sıra ekle</button>
      </section>
    </>
  );
}

function GiveBox({ busy, onGive }: { busy: boolean; onGive: (g: Record<string, unknown>) => void }) {
  const [kind, setKind] = useState<'item' | 'mat'>('item');
  const [tpl, setTpl] = useState(ITEM_TEMPLATES[0]?.id ?? '');
  const [rarity, setRarity] = useState('crimson');
  const [plus, setPlus] = useState(0);
  const [key, setKey] = useState(MATERIALS[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const slotName: Record<string, string> = { weapon: 'Silah', armor: 'Zırh', helmet: 'Miğfer', boots: 'Çizme', necklace: 'Kolye', earring: 'Küpe', bracelet: 'Bilezik' };
  const items = [...ITEM_TEMPLATES].sort((a, b) => (a.slot + (a.cls ?? '')).localeCompare(b.slot + (b.cls ?? '')));
  return (
    <div className="adm-give">
      <div className="row" style={{ gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <b style={{ fontSize: 12.5 }}>Eşya ver</b>
        <button className={'btn small ' + (kind === 'item' ? 'primary' : 'ghost')} onClick={() => setKind('item')}>Silah · Zırh · Takı</button>
        <button className={'btn small ' + (kind === 'mat' ? 'primary' : 'ghost')} onClick={() => setKind('mat')}>Malzeme · Nesne Market</button>
      </div>
      {kind === 'item' ? (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select className="adm-sel" value={tpl} onChange={(e) => setTpl(e.target.value)}>
            {items.map((t) => <option key={t.id} value={t.id}>{(slotName[t.slot] ?? t.slot) + (t.cls ? ' · ' + CLASSES[t.cls as ClassId].name : '') + ' — ' + t.name}</option>)}
          </select>
          <select className="adm-sel" value={rarity} onChange={(e) => setRarity(e.target.value)} style={{ color: RARITY[rarity as keyof typeof RARITY]?.color }}>
            {RARITIES.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}
          </select>
          <select className="adm-sel" value={plus} onChange={(e) => setPlus(Number(e.target.value))}>
            {Array.from({ length: MAX_PLUS + 1 }, (_, i) => <option key={i} value={i}>+{i}</option>)}
          </select>
          <button className="btn small primary" disabled={busy || !tpl} onClick={() => onGive({ kind: 'item', tpl, rarity, plus })}>Ver</button>
        </div>
      ) : (
        <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
          <select className="adm-sel" value={key} onChange={(e) => setKey(e.target.value)}>
            <optgroup label="Malzemeler">{MATERIALS.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
            <optgroup label="Nesne Market">{MALL_ITEMS.filter((m) => m.cat !== 'yakinda' && !m.epin).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}</optgroup>
          </select>
          <input className="inp" type="number" min={1} max={99999} value={qty} style={{ width: 80, padding: 5 }} onChange={(e) => setQty(Math.max(1, Math.min(99999, Number(e.target.value) || 1)))} />
          <button className="btn small primary" disabled={busy || !key} onClick={() => onGive({ kind: 'mat', key, qty })}>Ver</button>
        </div>
      )}
    </div>
  );
}
