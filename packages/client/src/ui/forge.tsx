import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { TUNING, MONSTERS, MATERIAL, FORGE_PUZZLE_NAMES, FORGE_PUZZLE_HINTS, FORGE_STAGE_NAMES, MOLD_SYMBOLS, FORGE_MAP } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const MATS = ['ember_stone', 'star_iron', 'evo_crystal', 'forge_chest'];

/** Zindan Bekçisi · Kor Kulesi girişi: katlar, ödüller, kurallar. */
export function ForgePanel() {
  const self = useStore((s) => s.self);
  const party = useStore((s) => s.party);
  if (!self) return null;
  const T = TUNING.forge;
  const ok = self.level >= T.minLevel && T.enabled && self.gems >= T.entryGems;
  const mname = (id: string) => MONSTERS.find((m) => m.id === id)?.name ?? id;
  return (
    <Panel title="Kor Kulesi · Zindan Bekçisi" width={540}>
      <div className="tw-hero fg-hero">
        <img src={iconUrl('forge_chest')} alt="" />
        <div>
          <b>Üç katlı demirci kulesi</b>
          <div className="muted" style={{ fontSize: 12 }}>
            Karademir'in ocağı yeniden yandı. Her grup <b>kendi kulesine</b> girer: katlar dalga dalga gelir, her katta bir bulmaca çözülür.
            Zirvede Karademir'i yenen herkes <b>Kor Sandığı</b> kazanır. Düşen malzemeler <b>silah ve zırh evrimi</b> içindir (Demirci Haso).
          </div>
        </div>
      </div>
      <div className="tw-floors fg-floors">
        {T.floors.map((f, i) => (
          <div key={i} className="tw-fl puz">
            <span className="n">{i + 1}</span>
            <span className="nm">3 dalga · {FORGE_PUZZLE_NAMES[f.puzzle]}</span>
            <span className="muted">{mname(f.waves[0]?.monster ?? 'f_slag')} · Sv. {f.mon.level}</span>
          </div>
        ))}
        <div className="tw-fl boss">
          <span className="n">3</span><span className="nm">Karademir</span><span className="muted">Kor Ustası · Sv. {T.boss.level}</span>
        </div>
      </div>
      <div className="tw-mats">
        {MATS.map((k) => <div key={k} className="tw-mat" title={MATERIAL.get(k)?.desc}><img src={iconUrl(k)} alt="" /><span>{MATERIAL.get(k)?.name}</span></div>)}
      </div>
      <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>
        Grup halinde girersen kule birlikte açılır (her ek oyuncuda dalgalar büyür). Grup arkadaşın içerideyse sen de onun kulesine katılırsın.
        {T.cooldownMin > 0 && <> İki giriş arası {T.cooldownMin} dk.</>}{T.entryGems > 0 && <> Giriş: <b>{T.entryGems}</b> Mücevher.</>}
        {party.members.length > 1 && <> · Grubun: {party.members.length} kişi</>}
      </div>
      {!T.enabled && <div className="err" style={{ marginTop: 8 }}>Kor Kulesi şu an kapalı.</div>}
      {T.enabled && self.level < T.minLevel && <div className="err" style={{ marginTop: 8 }}>Kuleye girmek için en az {T.minLevel}. seviye gerekir (sen: {self.level}).</div>}
      <button className="btn ember" style={{ width: '100%', marginTop: 10, padding: 11 }} disabled={!ok} onClick={() => { send({ t: 'forge', op: 'enter' }); store.set({ panel: null, npc: null }); }}>Kor Kulesi'ne gir</button>
    </Panel>
  );
}

/** Kuledeyken: kat, aşama, dalga sayacı, bulmaca ipucu ve durumu, boss canı, çıkış. */
export function ForgeHud() {
  const f = useStore((s) => s.forge);
  const map = useStore((s) => s.map);
  const [, tick] = useState(0);
  const [open, setOpen] = useState(() => !matchMedia('(pointer: coarse)').matches);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 250); return () => clearInterval(id); }, []);
  // bilgisayarda kutu sol üstte karakter kutusunun altında: grup çerçevesi kutunun boyu kadar aşağı kayar
  const box = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const h = box.current && !matchMedia('(pointer: coarse)').matches ? box.current.offsetHeight + 8 : 0;
    document.documentElement.style.setProperty('--fghud-h', h + 'px');
  });
  useEffect(() => () => document.documentElement.style.setProperty('--fghud-h', '0px'), []);
  if (!f || map !== FORGE_MAP) return null;
  const el = performance.now() - f.at;
  const wait = Math.max(0, f.wait - el);
  const waves = f.f < 3;
  const stName = f.pending ? `${FORGE_STAGE_NAMES[f.pending] ?? ''} geliyor` : f.stage === 'puzzle' ? FORGE_PUZZLE_NAMES[f.puzzle ?? 'mold'] : FORGE_STAGE_NAMES[f.stage];
  const steps = ['w1', 'w2', 'puzzle', 'w3'];
  const cur = f.stage === 'done' ? 4 : steps.indexOf(f.pending ?? f.stage);
  const cool = f.ember && f.ember.cool > 0 ? Math.max(0, f.ember.cool - el) : 0;
  return (
    <div ref={box} className={'tw-hud fg-hud' + (open ? '' : ' min')} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
      <div className="tw-hd" onClick={() => setOpen(!open)}>
        <span className="fl">{f.f === 3 ? 'Zirve' : `${f.f}. Kat`}</span><span className="nm">{stName}</span>
        {f.stage === 'done' ? <span className="ok">✔ Kapı açık</span> : f.pending ? <span className="pr">{Math.ceil(wait / 1000)} sn</span>
          : f.stage === 'puzzle' ? <span className="pr">{f.mold ? `${popcount(f.mold.found) / 2}/${f.mold.n / 2}` : f.ember ? `${f.ember.done}/${f.ember.need}` : ''}</span>
          : f.boss !== undefined ? <span className="pr">%{f.boss}</span> : <span className="pr">{f.alive} canavar</span>}
        <span className="tg">{open ? '▾' : '▸'}</span>
      </div>
      {open && (
        <div className="tw-bd">
          {waves && (
            <div className="fg-steps">
              {['1. Dalga', '2. Dalga', 'Bulmaca', 'Elitler'].map((n, i) => <span key={i} className={'s' + (i < cur ? ' done' : i === cur ? ' now' : '')}>{n}</span>)}
            </div>
          )}
          {f.stage === 'done' && <div className="hint ok">{f.f >= 3 ? 'Zafer! Kuzeydeki kapıdan köye dön; Kor Sandığı çantanda.' : 'Kuzeydeki parlayan kapıya yürü: bütün grup üst kata çıkar.'}</div>}
          {f.pending && <div className="hint">Nefeslen: {FORGE_STAGE_NAMES[f.pending]} {Math.ceil(wait / 1000)} saniye sonra.{f.pending === 'w3' ? ' Elitler daha güçlü ama ganimetleri bol!' : ''}</div>}
          {!f.pending && (f.stage === 'w1' || f.stage === 'w2' || f.stage === 'w3') && (
            <>
              <div className="hint">Lav yarıklarından çıkan golemleri yen. Kalan: <b>{f.alive}</b> / {f.total}</div>
              <div className="tw-bar"><i style={{ width: `${f.total ? (1 - f.alive / f.total) * 100 : 0}%` }} /></div>
            </>
          )}
          {!f.pending && f.stage === 'puzzle' && f.puzzle && <div className="hint">{FORGE_PUZZLE_HINTS[f.puzzle]}</div>}
          {!f.pending && f.stage === 'puzzle' && f.mold && (
            <div className="fg-mold">
              {f.mold.show.map((s, i) => {
                const found = (f.mold!.found >> i) & 1, sym = s >= 0 ? MOLD_SYMBOLS[s] : null;
                return <span key={i} className={'m' + (found ? ' found' : sym ? ' open' : '')} style={sym ? { color: sym.color, borderColor: sym.color } : undefined} title={sym?.name ?? 'Kapalı kalıp'}>{sym ? sym.glyph : '?'}</span>;
              })}
            </div>
          )}
          {!f.pending && f.stage === 'puzzle' && f.ember && (
            <div className="fg-ember">
              {Array.from({ length: f.ember.need }, (_, i) => <span key={i} className={'e' + (i < f.ember!.done ? ' lit' : '')}>{i < f.ember!.done ? '🔥' : '○'}</span>)}
              {f.ember.carrier ? <span className="muted">Köz taşınıyor · {Math.ceil(cool / 1000)} sn</span> : <span className="muted">{f.ember.spot >= 0 ? 'Köz yerde: parlayan noktaya koş!' : 'Ocak kıvılcım saçıyor…'}</span>}
              {f.ember.carrier ? <div className="tw-bar hold"><i style={{ width: `${Math.min(1, cool / (TUNING.forge.emberSec * 1000)) * 100}%` }} /></div> : null}
            </div>
          )}
          {f.stage === 'boss' && !f.pending && f.boss !== undefined && (
            <>
              <div className="hint">Karademir: yerdeki kızıl işaretlerden kaç. Canı azaldıkça cüruf golemleri çağırır.</div>
              <div className="tw-bar boss"><i style={{ width: `${f.boss}%` }} /></div>
            </>
          )}
          <div className="row" style={{ marginTop: 6, gap: 6 }}>
            <span className="muted" style={{ fontSize: 11 }}>{f.members > 1 ? `Grup: ${f.members} kişi` : 'Tek başına'}</span>
            <div className="spacer" />
            <button className="btn small ghost" onClick={() => send({ t: 'forge', op: 'leave' })}>Kuleden çık</button>
          </div>
        </div>
      )}
    </div>
  );
}
const popcount = (n: number) => { let c = 0; while (n) { c += n & 1; n >>= 1; } return c; };
