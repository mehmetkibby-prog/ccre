import { useEffect, useState } from 'react';
import { TUNING, MONSTERS, TOWER_FLOORS, TOWER_PUZZLE_NAMES, TOWER_PUZZLE_HINTS, SEQ_COLORS, SEQ_NAMES, MATERIAL, ALTAR_HOLD_MS } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);

/** Zindan Bekçisi: Kadim Kule girişi, katların özeti ve ödüller. */
export function TowerPanel() {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const T = TUNING.tower;
  const ok = self.level >= T.minLevel && T.enabled;
  return (
    <Panel title="Kadim Kule · Zindan Bekçisi" width={520}>
      <div className="tw-hero">
        <img src={iconUrl('tower_seal')} alt="" />
        <div>
          <b>On katlı kadim kule</b>
          <div className="muted" style={{ fontSize: 12 }}>Her katta canavarlar ve bulmacalar seni bekliyor; her iki katta bir yeni düşmanlar çıkar. Zirvede Azrail'i yenen herkes <b>Azrail Sandığı</b> kazanır. Giriş sınırsızdır.</div>
        </div>
      </div>
      <div className="tw-floors">
        {T.floors.slice(0, TOWER_FLOORS).map((f, i) => {
          const m = MONSTERS.find((x) => x.id === f.monster);
          return (
            <div key={i} className={'tw-fl' + (f.puzzle === 'boss' ? ' boss' : f.puzzle !== 'kill' ? ' puz' : '')}>
              <span className="n">{i + 1}</span>
              <span className="nm">{TOWER_PUZZLE_NAMES[f.puzzle]}</span>
              <span className="muted">{m?.name ?? f.monster} · Sv. {f.level[0]}{f.level[1] !== f.level[0] ? `–${f.level[1]}` : ''}</span>
            </div>
          );
        })}
      </div>
      <div className="tw-mats">
        {['tower_seal', 'soul_ring', 'sly_core', 'mourn_silk', 'azrail_chest', 'azrail_hook'].map((k) => (
          <div key={k} className="tw-mat" title={MATERIAL.get(k)?.desc}><img src={iconUrl(k)} alt="" /><span>{MATERIAL.get(k)?.name}</span></div>
        ))}
      </div>
      {!T.enabled && <div className="err" style={{ marginTop: 8 }}>Kadim Kule şu an kapalı.</div>}
      {T.enabled && self.level < T.minLevel && <div className="err" style={{ marginTop: 8 }}>Kuleye girmek için en az {T.minLevel}. seviye gerekir (sen: {self.level}).</div>}
      <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!ok} onClick={() => { send({ t: 'tower', op: 'enter' }); store.set({ panel: null, npc: null }); }}>Kuleye gir</button>
    </Panel>
  );
}

/** Kuledeyken üstte kat bilgisi, görev ilerlemesi, bulmaca ipuçları ve çıkış. */
export function TowerHud() {
  const t = useStore((s) => s.tower);
  const map = useStore((s) => s.map);
  const hold = useStore((s) => s.towerHold);
  // mühür sırası: kat başında ve yanlışta taşlar tek tek gösterilir (ezberle); 3B taşlar da aynı anda parlar
  const showSeq = useStore((s) => s.towerSeqAt);
  const setShowSeq = (v: number) => store.set({ towerSeqAt: v });
  const [, tick] = useState(0);
  const [open, setOpen] = useState(true);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  if (!t || !t.f || map !== 'tower') return null;
  const ft = TUNING.tower.floors[t.f - 1];
  const name = TOWER_PUZZLE_NAMES[t.puzzle];
  const seqT = performance.now() - showSeq, seqStep = Math.floor(seqT / 900);
  const seqVisible = t.puzzle === 'seq' && !!t.seq && showSeq > 0 && seqT > -1000 && seqStep < t.seq.length + 2;
  const holdK = hold ? Math.min(1, (performance.now() - hold.at) / ALTAR_HOLD_MS) : 0;
  return (
    <div className={'tw-hud' + (open ? '' : ' min')} onPointerDown={(e) => e.stopPropagation()}>
      <div className="tw-hd" onClick={() => setOpen(!open)}>
        <span className="fl">{t.f}. Kat</span><span className="nm">{name}</span>
        {t.done ? <span className="ok">✔ Kapı açık</span> : <span className="pr">{t.puzzle === 'boss' ? 'Azrail' : `${t.have}/${t.need}`}</span>}
        <span className="tg">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="tw-bd">
          {!t.done && <div className="hint">{TOWER_PUZZLE_HINTS[t.puzzle]}</div>}
          {t.done && <div className="hint ok">{t.f >= TOWER_FLOORS ? 'Zafer! Kuzeydeki kapıdan çıkabilirsin.' : 'Kuzeydeki parlayan kapıya yürü: üst kata çıkarsın.'}</div>}
          {!t.done && t.puzzle === 'kill' && <div className="tw-bar"><i style={{ width: `${Math.min(1, t.have / Math.max(1, t.need)) * 100}%` }} /></div>}
          {!t.done && t.puzzle === 'key' && <div className="muted" style={{ fontSize: 12 }}>Öldürülen: {t.kills} · anahtar en geç 15. canavarda düşer</div>}
          {!t.done && t.puzzle === 'seq' && t.seq && (
            <div className="tw-seq">
              {t.seq.map((c, i) => {
                const shown = seqVisible ? i <= seqStep : i < t.si;
                return <span key={i} className={'d' + (i < t.si ? ' done' : '') + (seqVisible && i === seqStep ? ' now' : '')} style={{ background: shown ? SEQ_COLORS[c] : undefined }} title={shown ? SEQ_NAMES[c] : '?'}>{shown ? '' : '?'}</span>;
              })}
              {!seqVisible && <button className="btn small ghost" onClick={() => setShowSeq(performance.now())}>Sırayı göster</button>}
            </div>
          )}
          {!t.done && t.puzzle === 'riddle' && t.riddle && (
            <div className="tw-riddle">
              <div className="q">“{t.riddle.q}”</div>
              <div className="muted" style={{ fontSize: 11 }}>Cevaplar taşların üstünde yazılı. Doğru taşa bas.</div>
            </div>
          )}
          {!t.done && t.puzzle === 'altar' && (
            <div className="tw-altar">
              {[0, 1, 2].map((i) => <span key={i} className={'a' + ((t.alt >> i) & 1 ? ' lit' : '')}>{(t.alt >> i) & 1 ? '🔥' : '○'}</span>)}
              {t.altLeft > 0 && <span className="muted">{Math.ceil(Math.max(0, t.altLeft - (Date.now() - t.at)) / 1000)} sn</span>}
              {hold && holdK < 1 && <div className="tw-bar hold"><i style={{ width: `${holdK * 100}%` }} /></div>}
            </div>
          )}
          {t.puzzle === 'boss' && !t.done && <BossLine />}
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            <span className="muted" style={{ fontSize: 11 }}>En iyi: {t.best}. kat{t.clears ? ` · Azrail zaferi: ${t.clears}` : ''}</span>
            <div className="spacer" />
            <button className="btn small ghost" onClick={() => send({ t: 'tower', op: 'leave' })}>Kuleden çık</button>
          </div>
          {ft && ft.puzzle !== t.puzzle && <div className="muted" style={{ fontSize: 10 }}>Kat ayarı değişti; bir sonraki girişte geçerli olur.</div>}
        </div>
      )}
    </div>
  );
}

function BossLine() {
  const b = useStore((s) => s.bosses.find((x) => x.id === 'azrail'));
  const skew = useStore((s) => s.clockSkew);
  if (!b) return null;
  if (b.alive) return <div className="muted" style={{ fontSize: 12 }}>Azrail uyanık. Dikkat: yerdeki işaretlerden kaç!</div>;
  const left = b.nextAt ? Math.max(0, b.nextAt - (Date.now() + skew)) : 0;
  return <div className="muted" style={{ fontSize: 12 }}>Azrail {Math.floor(left / 60000)} dk {Math.floor((left % 60000) / 1000)} sn sonra uyanacak.</div>;
}
