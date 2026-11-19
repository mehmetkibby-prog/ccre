import { useEffect, useState } from 'react';
import { TUNING, activeEvents, EVENT_NAMES, EVENT_ICONS } from '@col/shared';
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
