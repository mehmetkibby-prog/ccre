import React, { useEffect, useState } from 'react';
import {
  EVENTS_DEFAULT, EVENT_NAMES, EVENT_ICONS, eventWindow, eventNextStart, TR_OFFSET_MS,
  type GameTuning, type EventDef, type EventKind, type EventMode, type DropTune,
} from '@col/shared';
import { Num, DropListEditor } from './AdminPanel.tsx';
import { iconUrl } from '../game/art/icons.ts';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
const KINDS: EventKind[] = ['xp', 'drop', 'essence', 'chest'];
const DAYS = ['Paz', 'Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt'];
const DUR: [number, string][] = [[30, '30 dk'], [60, '1 sa'], [120, '2 sa'], [180, '3 sa'], [360, '6 sa'], [1440, '1 gün']];
const KIND_DESC: Record<EventKind, string> = {
  xp: 'Canavarlardan kazanılan TP bu çarpanla artar.',
  drop: 'Eşya ve malzeme düşme şansları bu çarpanla artar.',
  essence: 'Canavarlardan düşen Öz bu çarpanla artar.',
  chest: 'Her canavar öldürmede bu şansla Kristal Sandık düşer.',
};

const newId = () => Math.random().toString(36).slice(2, 10);
const trTime = (ms: number) => { const d = new Date(ms + TR_OFFSET_MS); return `${String(d.getUTCDate()).padStart(2, '0')}.${String(d.getUTCMonth() + 1).padStart(2, '0')} ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`; };
/** epoch ms ↔ <input type=datetime-local> değeri (Türkiye saati) */
const toLocal = (ms: number) => new Date((ms || Date.now()) + TR_OFFSET_MS).toISOString().slice(0, 16);
const fromLocal = (v: string) => { const t = Date.parse(v + ':00Z'); return Number.isFinite(t) ? t - TR_OFFSET_MS : 0; };
const left = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)); return m >= 60 ? `${Math.floor(m / 60)} sa${m % 60 ? ` ${m % 60} dk` : ''}` : `${m} dk`; };

/**
 * Etkinlikler: TP / eşya / Öz artışı ve Kristal Sandık. Hızlı başlat (tek dokunuş, hemen kaydedilir) ya da ayrıntılı
 * liste: her etkinlik hemen, belirli bir tarihte ya da her gün belirli saatte (seçili günlerde) başlar.
 */
export function EventsTab({ t, setT, dis, save }: { t: GameTuning; setT: SetT; dis: boolean; save: (patch?: Partial<GameTuning>) => void }) {
  const E = t.events, D = EVENTS_DEFAULT;
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 5000); return () => clearInterval(id); }, []);
  const setE = (p: Partial<GameTuning['events']>) => setT({ ...t, events: { ...E, ...p } });
  const setEv = (i: number, p: Partial<EventDef>) => setE({ list: E.list.map((x, j) => (j === i ? { ...x, ...p } : x)) });
  const setChest = (p: Partial<GameTuning['events']['chest']>) => setE({ chest: { ...E.chest, ...p } });
  const now = Date.now();
  const quick = (kind: EventKind) => {
    const ev: EventDef = { id: newId(), kind, on: true, mult: 2, chance: 0.03, mode: 'now', start: Date.now(), durMin: 60, at: '20:00', days: [] };
    save({ events: { ...E, list: [ev, ...E.list] } });
  };
  const stopNow = (i: number) => save({ events: { ...E, list: E.list.map((x, j) => (j === i ? { ...x, on: false } : x)) } });
  return (
    <>
      <section className="admin-sec ev-sec">
        <h4>Hızlı başlat</h4>
        <div className="muted adm-hint">Tek dokunuşla 1 saatlik etkinlik hemen başlar ve kaydedilir (çarpan ×2, sandık %3). Ayrıntıları aşağıdan değiştirebilirsin.</div>
        <div className="ev-quick">
          {KINDS.map((k) => (
            <button key={k} className={'ev-qc ev-' + k} disabled={dis} onClick={() => quick(k)}>
              {k === 'chest' ? <img src={iconUrl('crystal_chest')} alt="" /> : <span className="ic">{EVENT_ICONS[k]}</span>}
              <b>{EVENT_NAMES[k]}</b><small>{k === 'chest' ? '%3 · 1 saat' : '×2 · 1 saat'}</small>
            </button>
          ))}
        </div>
      </section>

      <section className="admin-sec ev-sec">
        <div className="row" style={{ gap: 8, alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Etkinlikler</h4><div className="spacer" />
          <label className={'adm-switch' + (E.announce ? ' on' : '')}><input type="checkbox" checked={E.announce} disabled={dis} onChange={() => setE({ announce: !E.announce })} /><span className="knob" /><span className="lbl">Başlayınca/bitince sohbette duyur</span></label>
        </div>
        {!E.list.length && <p className="muted">Henüz etkinlik yok. Yukarıdan hızlı başlat ya da aşağıdan ekle.</p>}
        <div className="ev-list">
          {E.list.map((e, i) => {
            const w = eventWindow(e, now), nx = w ? null : eventNextStart(e, now);
            const st = !e.on ? ['off', 'Kapalı'] : w ? ['live', `Şu an aktif · ${left(w[1] - now)} kaldı`] : nx ? ['next', `Sıradaki: ${trTime(nx)}`] : ['done', 'Bitti'];
            return (
              <div key={e.id} className={'ev-card ev-' + e.kind + ' st-' + st[0]}>
                <div className="ev-hd">
                  {e.kind === 'chest' ? <img src={iconUrl('crystal_chest')} alt="" /> : <span className="ic">{EVENT_ICONS[e.kind]}</span>}
                  <select className="adm-sel" value={e.kind} disabled={dis} onChange={(x) => setEv(i, { kind: x.target.value as EventKind })}>{KINDS.map((k) => <option key={k} value={k}>{EVENT_NAMES[k]}</option>)}</select>
                  <span className={'ev-st st-' + st[0]}>{st[1]}</span>
                  <div className="spacer" />
                  {w && <button className="btn small red" disabled={dis} onClick={() => stopNow(i)}>Durdur</button>}
                  <label className={'adm-switch' + (e.on ? ' on' : '')} title="Açık / kapalı"><input type="checkbox" checked={e.on} disabled={dis} onChange={() => setEv(i, { on: !e.on })} /><span className="knob" /></label>
                  <button className="btn small ghost" disabled={dis} title="Sil" onClick={() => setE({ list: E.list.filter((_, j) => j !== i) })}>✕</button>
                </div>
                <div className="muted" style={{ fontSize: 11.5, margin: '2px 0 6px' }}>{KIND_DESC[e.kind]}</div>
                <div className="ev-fields">
                  {e.kind === 'chest'
                    ? <label><span>Düşme şansı (%)</span><Num v={+(e.chance * 100).toFixed(2)} def={3} min={0.01} max={100} step={0.1} w={70} dis={dis} on={(v) => setEv(i, { chance: (v ?? 3) / 100 })} /></label>
                    : <label><span>Çarpan (×)</span><div className="adm-chips">{[1.5, 2, 3].map((m) => <button key={m} className={'btn small' + (e.mult === m ? ' primary' : ' ghost')} disabled={dis} onClick={() => setEv(i, { mult: m })}>×{m}</button>)}<Num v={e.mult} def={2} min={1} max={10} step={0.1} w={56} dis={dis} on={(v) => setEv(i, { mult: v ?? 2 })} /></div></label>}
                  <label><span>Ne zaman</span>
                    <div className="adm-seg ev-seg">
                      {([['now', 'Hemen'], ['once', 'Tarihte'], ['daily', 'Her gün']] as [EventMode, string][]).map(([m, l]) => (
                        <button key={m} className={e.mode === m ? 'on' : ''} disabled={dis} onClick={() => setEv(i, { mode: m, start: m === 'now' ? Date.now() : m === 'once' && e.start < Date.now() ? Date.now() + 3600_000 : e.start })}><b>{l}</b></button>
                      ))}
                    </div>
                  </label>
                  {e.mode === 'once' && <label><span>Başlangıç (TR saati)</span><input className="adm-num" style={{ width: 190 }} type="datetime-local" disabled={dis} value={toLocal(e.start)} onChange={(x) => setEv(i, { start: fromLocal(x.target.value) })} /></label>}
                  {e.mode === 'now' && <label><span>Başladı</span><span className="muted">{trTime(e.start)} {e.on && !w && <button className="btn small" disabled={dis} onClick={() => setEv(i, { start: Date.now() })}>Yeniden başlat</button>}</span></label>}
                  {e.mode === 'daily' && (
                    <>
                      <label><span>Saat (TR)</span><input className="adm-num" style={{ width: 100 }} type="time" disabled={dis} value={e.at} onChange={(x) => setEv(i, { at: x.target.value || '20:00' })} /></label>
                      <label><span>Günler {e.days.length ? '' : '(her gün)'}</span><div className="adm-chips">{DAYS.map((d, k) => <button key={k} className={'btn small' + (e.days.includes(k) ? ' primary' : ' ghost')} disabled={dis} onClick={() => setEv(i, { days: e.days.includes(k) ? e.days.filter((x) => x !== k) : [...e.days, k].sort() })}>{d}</button>)}</div></label>
                    </>
                  )}
                  <label><span>Süre</span><div className="adm-chips">{DUR.map(([m, l]) => <button key={m} className={'btn small' + (e.durMin === m ? ' primary' : ' ghost')} disabled={dis} onClick={() => setEv(i, { durMin: m })}>{l}</button>)}<Num v={e.durMin} def={60} min={1} max={20160} step={1} w={64} dis={dis} on={(v) => setEv(i, { durMin: Math.round(v ?? 60) })} /><span className="muted">dk</span></div></label>
                </div>
              </div>
            );
          })}
        </div>
        <button className="btn" style={{ marginTop: 8 }} disabled={dis || E.list.length >= 30} onClick={() => setE({ list: [...E.list, { id: newId(), kind: 'xp', on: true, mult: 2, chance: 0.03, mode: 'daily', start: Date.now(), durMin: 60, at: '20:00', days: [] }] })}>+ Etkinlik ekle</button>
      </section>

      <section className="admin-sec ev-sec">
        <h4><img src={iconUrl('crystal_chest')} alt="" style={{ width: 28, verticalAlign: 'middle' }} /> Kristal Sandık içeriği</h4>
        <div className="muted adm-hint">Kristal Sandık etkinliğinde canavarlardan düşer; çantadan açılır. Mücevher ve Öz aralıktan, her satır kendi şansıyla çıkar.</div>
        <div className="adm-fields six">
          <label><span>Mücevher en az</span><Num v={E.chest.gems[0]} def={D.chest.gems[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [v ?? 0, Math.max(v ?? 0, E.chest.gems[1])] })} /></label>
          <label><span>Mücevher en çok</span><Num v={E.chest.gems[1]} def={D.chest.gems[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [Math.min(E.chest.gems[0], v ?? 0), v ?? 0] })} /></label>
          <label><span>Öz en az</span><Num v={E.chest.essence[0]} def={D.chest.essence[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [v ?? 0, Math.max(v ?? 0, E.chest.essence[1])] })} /></label>
          <label><span>Öz en çok</span><Num v={E.chest.essence[1]} def={D.chest.essence[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [Math.min(E.chest.essence[0], v ?? 0), v ?? 0] })} /></label>
        </div>
        <div className="sect" style={{ marginTop: 12 }}>Sandıktan çıkabilecekler</div>
        <DropListEditor drops={E.chest.drops} setDrops={(n: DropTune[]) => setChest({ drops: n })} dis={dis} empty="Sandıkta yalnız mücevher ve öz var." />
      </section>
    </>
  );
}
