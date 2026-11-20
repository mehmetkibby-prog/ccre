import { useCallback, useEffect, useRef, useState } from 'react';
import { MAPS } from '@col/shared';
import { api } from '../api.ts';

/** Sayfa görünürken her `ms`'de bir çalışır (sekme arka plandayken boşuna istek atılmaz). */
function useVisibleInterval(fn: () => void, ms: number) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    let id = 0;
    const start = () => { if (!id && document.visibilityState === 'visible') { ref.current(); id = window.setInterval(() => ref.current(), ms); } };
    const stop = () => { if (id) { clearInterval(id); id = 0; } };
    const vis = () => (document.visibilityState === 'visible' ? start() : stop());
    start(); document.addEventListener('visibilitychange', vis);
    return () => { stop(); document.removeEventListener('visibilitychange', vis); };
  }, [ms]);
}

interface Job { at: number; name: string; ms: number; detail?: string }
interface Proc { id: string; name: string; alive: boolean; elu: number; delayMs: number; memMB: number; memKind: string; players: number; cap: number; jobs: Job[]; note?: string; tickP95?: number; monsters?: number; restarts?: number }
interface Prof { id: number; target: string; label: string; startedAt: number; endsAt: number; state: 'running' | 'ready' | 'error'; err?: string; sizeKB: number; expiresAt: number | null }
interface Load { at: number; procs: Proc[]; profile: Prof | null; host: { cpus: number; load1: number; freeMemMB: number; totalMemMB: number } }

const f1 = (n: number) => n.toLocaleString('tr-TR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const level = (elu: number) => (elu >= 75 ? ['Yüksek', 'bad'] : elu >= 45 ? ['Orta', 'mid'] : ['Düşük', 'ok']) as [string, string];
const hm = (t: number) => new Date(t).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
/** kaç önce: sunucu saatine göre (cihaz saati yanlış olsa da doğru) */
const ago = (ms: number) => (ms < 60_000 ? `${Math.max(0, Math.round(ms / 1000))} sn önce` : ms < 3_600_000 ? `${Math.round(ms / 60_000)} dk önce` : `${Math.floor(ms / 3_600_000)} sa ${Math.round((ms % 3_600_000) / 60_000)} dk önce`);

/** Canlı işlem yükü: ana işlem ve her kanal ayrı kart; 60 sn CPU profili. */
export function LoadCard({ toast }: { toast: (x: { ok: boolean; text: string }) => void }) {
  const [d, setD] = useState<Load | null>(null);
  const [err, setErr] = useState('');
  const [target, setTarget] = useState('main');
  const [, tick] = useState(0);
  const load = useCallback(async () => { try { setD(await api<Load>('/api/admin/load')); setErr(''); } catch (e) { setErr((e as Error).message); } }, []);
  useVisibleInterval(load, 2000);
  useVisibleInterval(() => tick((n) => n + 1), 1000);
  const p = d?.profile;
  const start = async () => {
    try { await api('/api/admin/profile', { target }); toast({ ok: true, text: '60 saniyelik ölçüm başladı.' }); load(); }
    catch (e) { toast({ ok: false, text: (e as Error).message }); }
  };
  const now = Date.now();
  return (
    <section className="adm-card adm-wide">
      <h3>Canlı işlem yükü</h3>
      <div className="ld-prof">
        <div className="row" style={{ gap: 10, flexWrap: 'wrap' }}>
          <span>Profil alınacak süreç</span>
          <select className="adm-sel" value={target} onChange={(e) => setTarget(e.target.value)}>
            {(d?.procs ?? [{ id: 'main', name: 'Ana işlem' } as Proc]).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
          </select>
          <button className="btn small primary" disabled={p?.state === 'running'} onClick={start}>60 saniyelik işlemci profili</button>
          <button className="btn small ghost" onClick={load}>Durumu yenile</button>
        </div>
        {p && (
          <div className={'ld-pstate ' + p.state}>
            {p.state === 'running' && <>⏳ <b>{p.label}</b> ölçülüyor… {Math.max(0, Math.ceil((p.endsAt - now) / 1000))} sn kaldı<div className="ld-bar"><i style={{ width: `${Math.min(100, ((now - p.startedAt) / (p.endsAt - p.startedAt)) * 100)}%` }} /></div></>}
            {p.state === 'ready' && <>✓ <b>{p.label}</b> profili hazır ({p.sizeKB} KB) · <a className="btn small ember" href="/api/admin/profile/file" download>İndir (.cpuprofile)</a> <span className="muted">{p.expiresAt ? `${Math.max(0, Math.ceil((p.expiresAt - now) / 60000))} dk içinde silinir` : ''}</span></>}
            {p.state === 'error' && <>✕ <b>{p.label}</b>: {p.err}</>}
          </div>
        )}
        <div className="muted adm-hint" style={{ margin: '8px 0 0' }}>Yalnız ölçüm sırasında ek yük oluşturur. Aynı anda tek süreç ölçülür; hazır dosya 5 dakika saklanır. İndirilen dosya Chrome DevTools → Performance (ya da speedscope.app) ile açılır.</div>
      </div>
      <p className="muted adm-hint">Ana işlem ve her kanal ayrı ölçülür. <b>İşlem yoğunluğu</b>, son 2 saniyede o sürecin olay döngüsünün meşgul kaldığı paydır; VDS'nin toplam işlemci yüzdesi ya da oyuncu pingi değildir.{d ? ` Sunucu: ${d.host.cpus} çekirdek · sistem yükü ${d.host.load1.toFixed(2)} · boş bellek ${Math.round(d.host.freeMemMB).toLocaleString('tr-TR')} / ${Math.round(d.host.totalMemMB).toLocaleString('tr-TR')} MB` : ''}</p>
      {err && <p className="warn">{err}</p>}
      <div className="ld-grid">
        {d?.procs.map((x) => {
          const [lv, cls] = x.alive ? level(x.elu) : ['Kapalı', 'bad'];
          return (
            <div key={x.id} className={'ld-c ' + cls}>
              <div className="row"><b>{x.name}</b><div className="spacer" /><span className={'ld-lv ' + cls}>{lv}</span></div>
              <div className="ld-big">{x.alive ? f1(x.elu) : '—'}<small>%</small></div>
              <div className="muted ld-sub">İşlem yoğunluğu</div>
              <div className="ld-bar"><i style={{ width: `${x.alive ? Math.min(100, x.elu) : 0}%` }} /></div>
              <div className="ld-kv">
                <span>Döngü gecikmesi</span><b className={x.delayMs >= 100 ? 'warn' : ''}>{f1(x.delayMs)} ms</b>
                <span>Bellek · {x.memKind}</span><b>{f1(x.memMB)} MB</b>
                {x.tickP95 !== undefined && <><span>Dünya adımı (p95)</span><b>{f1(x.tickP95)} ms</b></>}
                <span>Oyuncu sayısı</span><b>{x.players} / {x.cap}</b>
                {!!x.restarts && <><span>Yeniden başlama</span><b className="warn">{x.restarts}</b></>}
              </div>
              <details className="ld-jobs">
                <summary>Kaydedilen işler · Son 15 dk {x.jobs.length ? <i>{x.jobs.length}</i> : null}</summary>
                {!x.jobs.length && <div className="muted">Yavaş iş yok.</div>}
                {x.jobs.map((j, i) => <div key={i} className="ld-job"><span className="muted" title={hm(j.at) + ' (sunucu saati, bu cihazın saat diliminde)'}>{ago((d?.at ?? Date.now()) - j.at)}</span><b>{j.name}</b><em className={j.ms >= 100 ? 'warn' : ''}>{f1(j.ms)} ms</em>{j.detail && <small className="muted">{j.detail}</small>}</div>)}
              </details>
            </div>
          );
        })}
      </div>
      <p className="muted adm-hint" style={{ marginTop: 10, marginBottom: 0 }}>Gecikme: son ölçüm aralığındaki en büyük döngü duraklaması. Kaydedilen işler: kanallarda bir dünya adımının süresinin %80'ini aşan adım ya da 15 ms'yi aşan komut, ana işlemde 0,5 sn'yi aşan istek; her yerde 100 ms'yi aşan duraklama. Renkler yalnız yoğunluğu özetler; tek başına lag kanıtı değildir. Panel görünürken her 2 saniyede yenilenir.</p>
    </section>
  );
}

interface Msg { id: number; at: number; ch: 'world' | 'trade' | 'local'; chn: number; from: string; text: string; map?: string }
const CH_NAME = { world: 'Dünya', trade: 'Ticaret', local: 'Bölge' } as const;

/** Oyundaki sohbetin canlı akışı (dünya, ticaret, bölge). Fısıltılar gösterilmez. */
export function ChatFeed() {
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [f, setF] = useState<'all' | Msg['ch']>('all');
  const [paused, setPaused] = useState(false);
  const last = useRef(0), box = useRef<HTMLDivElement>(null), stick = useRef(true);
  const poll = useCallback(async () => {
    if (paused) return;
    try {
      const r = await api<{ msgs: Msg[] }>(`/api/admin/chat?after=${last.current}`);
      if (!r.msgs.length) return;
      last.current = r.msgs[r.msgs.length - 1].id;
      setMsgs((m) => [...m, ...r.msgs].slice(-300));
    } catch { /* bir sonraki yoklamada yeniden denenir */ }
  }, [paused]);
  useVisibleInterval(poll, 2000);
  useEffect(() => { const b = box.current; if (b && stick.current) b.scrollTop = b.scrollHeight; }, [msgs, f]);
  const shown = msgs.filter((m) => f === 'all' || m.ch === f);
  return (
    <section className="adm-card adm-wide">
      <h3>Canlı sohbet</h3>
      <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
        {(['all', 'world', 'trade', 'local'] as const).map((k) => <button key={k} className={'btn small ' + (f === k ? 'primary' : 'ghost')} onClick={() => setF(k)}>{k === 'all' ? 'Tümü' : CH_NAME[k]}</button>)}
        <div className="spacer" />
        <button className={'btn small ' + (paused ? 'ember' : 'ghost')} onClick={() => setPaused(!paused)}>{paused ? '▶ Sürdür' : '❚❚ Duraklat'}</button>
      </div>
      <div className="cf-box" ref={box} onScroll={(e) => { const b = e.currentTarget; stick.current = b.scrollHeight - b.scrollTop - b.clientHeight < 30; }}>
        {!shown.length && <div className="muted" style={{ padding: 10 }}>Henüz ileti yok. Oyuncular yazdıkça burada anında görünür.</div>}
        {shown.map((m) => (
          <div key={m.id} className={'cf-m ' + m.ch}>
            <span className="t">{hm(m.at)}</span>
            <span className="c">{CH_NAME[m.ch]} · K{m.chn}{m.ch === 'local' && m.map ? ` · ${MAPS[m.map]?.name ?? m.map}` : ''}</span>
            <b>{m.from}</b><span className="x">{m.text}</span>
          </div>
        ))}
      </div>
      <div className="muted adm-hint" style={{ margin: '6px 0 0' }}>Dünya, Ticaret ve Bölge sohbeti, oyuncular yazdıkça (2 saniyede bir) gelir; fısıltılar gösterilmez. Sunucu son 300 iletiyi bellekte tutar.</div>
    </section>
  );
}
