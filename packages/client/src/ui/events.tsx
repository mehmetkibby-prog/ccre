import { useEffect, useState } from 'react';
import { TUNING, activeEvents, eventWindow, eventNextStart, TR_OFFSET_MS, EVENT_NAMES, EVENT_ICONS, type EventDef } from '@col/shared';
import { store } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { onConfig } from '../admin/config.ts';
import { iconUrl } from '../game/art/icons.ts';

/** Etkin etkinlikler: dünya sağlığının altında küçük parlayan rozetler (çarpan ve kalan süre). */
export function EventBadges() {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); const off = onConfig(() => tick((n) => n + 1)); return () => { clearInterval(id); off(); }; }, []);
  const now = Date.now();
  const ev = activeEvents(TUNING.events, now);
  if (!ev.list.length) return null;
  const fmt = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h}:${String(m).padStart(2, '0')} sa` : `${m}:${String(s % 60).padStart(2, '0')}`; };
  return (
    <div className="ev-badges">
      {ev.list.slice(0, 4).map(({ e, end }) => (
        <div key={e.id} className={'ev-badge ev-' + e.kind} title={`${EVENT_NAMES[e.kind]} etkinliği`}>
          {e.kind === 'chest' ? <img src={iconUrl('crystal_chest')} alt="" /> : <span className="ic">{EVENT_ICONS[e.kind]}</span>}
          <span className="nm">{e.kind === 'chest' ? 'Kristal Sandık' : `${EVENT_NAMES[e.kind].replace(' Artışı', '')} ×${+e.mult.toFixed(2)}`}</span>
          <span className="tm">{fmt(end - now)}</span>
        </div>
      ))}
    </div>
  );
}

/** Üst düğme: etkin etkinlik varsa parlar, sayısını gösterir; tıklayınca Etkinlikler penceresi. */
export function EventButton() {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 5000); const off = onConfig(() => tick((n) => n + 1)); return () => { clearInterval(id); off(); }; }, []);
  const n = activeEvents(TUNING.events, Date.now()).list.length;
  return (
    <button className={'boss-btn ev-btn' + (n ? ' on' : '')} title="Etkinlikler" onClick={() => store.set((s) => ({ panel: s.panel === 'events' ? null : 'events' }))}>
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden><path d="M12 2.5l2.6 5.6 6.1.7-4.5 4.2 1.2 6-5.4-3-5.4 3 1.2-6L3.3 8.8l6.1-.7z" fill="#ffd84a" stroke="#6a4512" strokeWidth="1.3" strokeLinejoin="round" /></svg>
      <span>Etkinlik</span>{n > 0 && <i className="ev-n">{n}</i>}
    </button>
  );
}

const DESC: Record<string, (e: { mult: number; chance: number }) => string> = {
  xp: (e) => `Canavarlardan kazandığın TP ×${+e.mult.toFixed(2)}`,
  drop: (e) => `Eşya ve malzeme düşme şansı ×${+e.mult.toFixed(2)}`,
  essence: (e) => `Canavarlardan düşen Öz ×${+e.mult.toFixed(2)}`,
  chest: (e) => `Her canavardan %${+(e.chance * 100).toFixed(2)} şansla Kristal Sandık düşer`,
};
const DAYS = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];

/** Etkinlikler penceresi: şu an etkin olanlar (kalan süreyle) ve yaklaşanlar. */
export function EventsPanel() {
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 1000); const off = onConfig(() => tick((n) => n + 1)); return () => { clearInterval(id); off(); }; }, []);
  const now = Date.now();
  const act = activeEvents(TUNING.events, now).list;
  const next = TUNING.events.list.map((e) => ({ e, at: eventWindow(e, now) ? null : eventNextStart(e, now) })).filter((x): x is { e: EventDef; at: number } => x.at !== null).sort((a, b) => a.at - b.at).slice(0, 6);
  const left = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h ? `${h} sa ${m} dk` : `${m}:${String(s % 60).padStart(2, '0')}`; };
  const when = (ms: number) => { const d = new Date(ms + TR_OFFSET_MS), t = new Date(now + TR_OFFSET_MS); const hm = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; return d.getUTCDate() === t.getUTCDate() ? `Bugün ${hm}` : `${DAYS[d.getUTCDay()]} ${hm}`; };
  const icon = (k: string) => k === 'chest' ? <img src={iconUrl('crystal_chest')} alt="" /> : <span className="ic">{EVENT_ICONS[k as 'xp']}</span>;
  return (
    <Panel title="Etkinlikler" width={460}>
      <div className="evp-sec">Şu an etkin</div>
      {!act.length && <p className="muted" style={{ margin: '4px 0 10px' }}>Şu an etkin etkinlik yok. Yaklaşanları aşağıda görebilirsin.</p>}
      <div className="evp-list">
        {act.map(({ e, end }) => (
          <div key={e.id} className={'evp-card live ev-' + e.kind}>
            {icon(e.kind)}
            <div className="mid"><b>{EVENT_NAMES[e.kind]}</b><span>{DESC[e.kind](e)}</span></div>
            <div className="tm"><small>kalan</small><b>{left(end - now)}</b></div>
          </div>
        ))}
      </div>
      {next.length > 0 && <>
        <div className="evp-sec">Yaklaşan</div>
        <div className="evp-list">
          {next.map(({ e, at }) => (
            <div key={e.id} className={'evp-card ev-' + e.kind}>
              {icon(e.kind)}
              <div className="mid"><b>{EVENT_NAMES[e.kind]}</b><span>{DESC[e.kind](e)} · {e.durMin >= 60 ? `${+(e.durMin / 60).toFixed(1)} saat` : `${e.durMin} dk`}</span></div>
              <div className="tm"><small>başlar</small><b>{when(at)}</b></div>
            </div>
          ))}
        </div>
      </>}
    </Panel>
  );
}
