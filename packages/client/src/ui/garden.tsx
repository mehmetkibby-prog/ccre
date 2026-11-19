import { useEffect, useState } from 'react';
import { TUNING, MATERIAL, HERBS, POTION_EFFECT, GARDEN_PLANTS, GARDEN_REACH, GARDEN_MAP, type Recipe } from '@col/shared';
import { store, useStore, reqId } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const name = (k: string) => MATERIAL.get(k)?.name ?? k;
const ROW_NAMES = ['1. sıra', '2. sıra', '3. sıra', '4. sıra'];

/** Şifacı Reyhan: orak, bahçe bilgisi ve iksir tarifleri (malzeme / mücevher / çıkan adet, etkisi ve süresi). */
export function GardenPanel() {
  const self = useStore((s) => s.self);
  const gd = useStore((s) => s.garden);
  const [tab, setTab] = useState<'iksir' | 'bahce'>('iksir');
  useEffect(() => { send({ t: 'garden', op: 'state' }); }, []);
  if (!self) return null;
  const T = TUNING.garden, m = self.materials;
  const hasSickle = (m.sickle ?? 0) > 0 || !!gd?.sickle;
  const can = (r: Recipe, n: number) => self.gems >= r.gems * n && Object.entries(r.herbs).every(([k, q]) => (m[k] ?? 0) >= (q ?? 0) * n);
  const maxN = (r: Recipe) => { let n = 50; if (r.gems > 0) n = Math.min(n, Math.floor(self.gems / r.gems)); for (const [k, q] of Object.entries(r.herbs)) if (q) n = Math.min(n, Math.floor((m[k] ?? 0) / q)); return Math.max(0, n); };
  return (
    <Panel title="Şifacı Reyhan · Şifa Bahçesi" width={560}>
      <div className="gd-hero">
        <img src={iconUrl('herb_basket')} alt="" />
        <div>
          <b>“Bahçemdeki her sıranın otu başka bir derde deva, evladım.”</b>
          <div className="muted" style={{ fontSize: 12 }}>Orakla olgun bitkiye eğil, topla; otları bana getir, iksirini kaynatayım. Her bitki sen topladıktan sonra yeniden büyür.</div>
        </div>
      </div>
      <div className="gd-tabs">
        <button className={tab === 'iksir' ? 'on' : ''} onClick={() => setTab('iksir')}>İksir kaynat</button>
        <button className={tab === 'bahce' ? 'on' : ''} onClick={() => setTab('bahce')}>Orak ve bahçe</button>
      </div>
      {tab === 'iksir' && (
        <div className="gd-recipes">
          {!T.recipes.length && <p className="muted">Şu an tarif yok.</p>}
          {T.recipes.map((r, i) => {
            const ef = T.effects[r.potion], mx = maxN(r);
            return (
              <div key={i} className={'gd-rc' + (can(r, 1) ? ' ok' : '')}>
                <img className="pot" src={iconUrl(r.potion)} alt="" />
                <div className="mid">
                  <b>{r.out > 1 ? `${r.out}× ` : ''}{name(r.potion)}</b>
                  <span className="ef">{POTION_EFFECT[r.potion].name} +{ef.value}{POTION_EFFECT[r.potion].unit} · {ef.min} dk</span>
                  <div className="req">
                    {Object.entries(r.herbs).map(([k, q]) => <span key={k} className={(m[k] ?? 0) >= (q ?? 0) ? 'have' : 'miss'} title={MATERIAL.get(k)?.desc}><img src={iconUrl(k)} alt="" />{name(k)} <i>{m[k] ?? 0}/{q}</i></span>)}
                    {r.gems > 0 && <span className={self.gems >= r.gems ? 'have' : 'miss'}><img src={iconUrl('gem')} alt="" />{r.gems} Mücevher</span>}
                    {(m[r.potion] ?? 0) > 0 && <span className="muted">Çantanda: {m[r.potion]}</span>}
                  </div>
                </div>
                <div className="act">
                  <button className="btn small ember" disabled={!can(r, 1)} onClick={() => send({ t: 'garden', op: 'brew', r: i, n: 1, req: reqId() })}>Kaynat</button>
                  {mx > 1 && <button className="btn small ghost" onClick={() => send({ t: 'garden', op: 'brew', r: i, n: Math.min(5, mx), req: reqId() })}>×{Math.min(5, mx)}</button>}
                </div>
              </div>
            );
          })}
          <div className="muted" style={{ fontSize: 11.5, marginTop: 4 }}>İksirler çantanın Malzeme bölümünde; “Kullan” ile içilir. Aynı iksiri yeniden içmek süreyi baştan başlatır.</div>
        </div>
      )}
      {tab === 'bahce' && (
        <div className="gd-garden">
          <div className={'gd-sickle' + (hasSickle ? ' own' : '')}>
            <img src={iconUrl('sickle')} alt="" />
            <div className="mid">
              <b>Şifacı Orağı</b>
              <span className="muted">{hasSickle ? 'Orağın var. Bahçede olgun bitkiye tıkla ya da yanında Z\'ye bas: eğilip toplarsın.' : `Bahçede toplamak için gerekir. Bir kez alınır: ${T.sicklePrice.toLocaleString('tr-TR')} Mücevher.`}</span>
            </div>
            {!hasSickle && <button className="btn ember" disabled={self.gems < T.sicklePrice} onClick={() => send({ t: 'garden', op: 'buy', req: reqId() })}>Satın al</button>}
          </div>
          <div className="gd-rows">
            {HERBS.map((h, row) => {
              const now = performance.now();
              const plants = GARDEN_PLANTS.filter((p) => p.row === row);
              const ripe = plants.filter((p) => !gd || (gd.ready[p.i] ?? 0) - (now - gd.at) <= 0).length;
              return (
                <div key={h} className="gd-row">
                  <img src={iconUrl(h)} alt="" /><div className="mid"><b>{name(h)}</b><span className="muted">{ROW_NAMES[row]} · {MATERIAL.get(h)?.desc.split('. ')[1] ?? ''}</span></div>
                  <span className={'gd-ripe' + (ripe ? ' on' : '')}>{ripe}/4 olgun</span>
                </div>
              );
            })}
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>Bir bitki topladıktan sonra senin için {Math.round(T.regrowSec / 60)} dk içinde yeniden olgunlaşır; her toplamada {T.qty[0] === T.qty[1] ? T.qty[0] : `${T.qty[0]}–${T.qty[1]}`} ot çıkar.</div>
        </div>
      )}
    </Panel>
  );
}

/** Toplama çubuğu ve yakındaki olgun bitki ipucu (yalnız bahçede). */
export function GatherHud() {
  const g = useStore((s) => s.gather);
  const gd = useStore((s) => s.garden);
  const map = useStore((s) => s.map);
  const [, tick] = useState(0);
  useEffect(() => { const id = setInterval(() => tick((n) => n + 1), 100); return () => clearInterval(id); }, []);
  if (map !== GARDEN_MAP) return null;
  const now = performance.now();
  if (g) {
    const pl = GARDEN_PLANTS[g.i], k = Math.min(1, (now - g.start) / g.ms);
    return (
      <div className="gd-bar">
        <img src={iconUrl(pl?.herb ?? 'herb_wind')} alt="" />
        <div className="in"><span>{name(pl?.herb ?? '')} toplanıyor…</span><div className="tw-bar"><i style={{ width: `${k * 100}%` }} /></div></div>
      </div>
    );
  }
  const game = currentGame; if (!game) return null;
  let best = -1, bd = GARDEN_REACH + 30;
  for (const p of GARDEN_PLANTS) { const d = Math.hypot(p.x - game.px, p.y - game.py); if (d < bd && (!gd || (gd.ready[p.i] ?? 0) - (now - gd.at) <= 0)) { bd = d; best = p.i; } }
  if (best < 0) return null;
  const pl = GARDEN_PLANTS[best];
  return (
    <button className="gd-hint" onClick={() => game.gatherNearby(best)}>
      <img src={iconUrl(pl.herb)} alt="" /><span><b>{name(pl.herb)}</b> olgun · {gd && !gd.sickle ? 'orak gerekir (Şifacı Reyhan)' : <>topla <kbd>Z</kbd></>}</span>
    </button>
  );
}
export const openGarden = () => store.set({ panel: 'garden' });
