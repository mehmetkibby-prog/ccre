import React from 'react';
import { GARDEN_DEFAULT, HERBS, POTIONS, POTION_EFFECT, MATERIAL, type GameTuning, type Recipe, type PotionKey, type HerbKey } from '@col/shared';
import { Num } from './AdminPanel.tsx';
import { iconUrl } from '../game/art/icons.ts';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
const name = (k: string) => MATERIAL.get(k)?.name ?? k;

/** Şifa Bahçesi: orak fiyatı, toplama/büyüme süreleri, çıkan ot ve her iksirin tarifi + etkisi. */
export function GardenTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const T = t.garden, D = GARDEN_DEFAULT;
  const set = (p: Partial<GameTuning['garden']>) => setT({ ...t, garden: { ...T, ...p } });
  const setR = (i: number, p: Partial<Recipe>) => set({ recipes: T.recipes.map((r, j) => (j === i ? { ...r, ...p } : r)) });
  const setE = (k: PotionKey, p: Partial<{ value: number; min: number }>) => set({ effects: { ...T.effects, [k]: { ...T.effects[k], ...p } } });
  return (
    <>
      <section className="admin-sec">
        <h4><img src={iconUrl('herb_basket')} alt="" style={{ width: 28, verticalAlign: 'middle' }} /> Şifa Bahçesi</h4>
        <div className="muted adm-hint">Pazar Köyü'nde tilkilere giden yolun doğusunda 4 sıra × 4 bitki. Şifacı Reyhan orak satar ve iksir kaynatır. Her oyuncu için bitki, topladıktan sonra ayrı yeniden büyür.</div>
        <div className="adm-fields six">
          <label className={'adm-switch' + (T.enabled ? ' on' : '')}><input type="checkbox" checked={T.enabled} disabled={dis} onChange={() => set({ enabled: !T.enabled })} /><span className="knob" /><span className="lbl">Bahçe açık</span></label>
          <label><span>Orak fiyatı (Mücevher)</span><Num v={T.sicklePrice} def={D.sicklePrice} min={0} max={1e7} step={1} w={90} dis={dis} on={(v) => set({ sicklePrice: Math.round(v ?? D.sicklePrice) })} /></label>
          <label><span>Yeniden büyüme (dk)</span><Num v={+(T.regrowSec / 60).toFixed(2)} def={D.regrowSec / 60} min={0.1} max={1440} step={0.5} w={70} dis={dis} on={(v) => set({ regrowSec: Math.round((v ?? D.regrowSec / 60) * 60) })} /></label>
          <label><span>Toplama süresi (sn)</span><Num v={+(T.gatherMs / 1000).toFixed(2)} def={D.gatherMs / 1000} min={0.3} max={10} step={0.1} w={70} dis={dis} on={(v) => set({ gatherMs: Math.round((v ?? D.gatherMs / 1000) * 1000) })} /></label>
          <label><span>Çıkan ot en az</span><Num v={T.qty[0]} def={D.qty[0]} min={1} max={99} step={1} w={60} dis={dis} on={(v) => set({ qty: [v ?? 1, Math.max(v ?? 1, T.qty[1])] })} /></label>
          <label><span>Çıkan ot en çok</span><Num v={T.qty[1]} def={D.qty[1]} min={1} max={99} step={1} w={60} dis={dis} on={(v) => set({ qty: [Math.min(T.qty[0], v ?? 1), v ?? 1] })} /></label>
        </div>
      </section>
      <section className="admin-sec">
        <h4>İksirler: tarif ve etki</h4>
        <div className="muted adm-hint">Her iksir için hangi otlardan kaç tane, kaç Mücevher ve bir kaynatmada kaç iksir çıkacağı; içince etkisi ve süresi.</div>
        <div className="gd-adm">
          {T.recipes.map((r, i) => (
            <div key={i} className="gd-adm-row">
              <div className="hd">
                <img src={iconUrl(r.potion)} alt="" />
                <select className="adm-sel" value={r.potion} disabled={dis} onChange={(e) => setR(i, { potion: e.target.value as PotionKey })}>{POTIONS.map((p) => <option key={p} value={p}>{name(p)}</option>)}</select>
                <span className="muted">{POTION_EFFECT[r.potion].name}</span>
                <div className="spacer" />
                <button className="btn small ghost" disabled={dis} onClick={() => set({ recipes: T.recipes.filter((_, j) => j !== i) })}>✕</button>
              </div>
              <div className="adm-fields six">
                {HERBS.map((h) => (
                  <label key={h}><span><img src={iconUrl(h)} alt="" style={{ width: 16, verticalAlign: 'middle' }} /> {name(h)}</span><Num v={r.herbs[h] ?? 0} def={0} min={0} max={999} step={1} w={56} dis={dis} on={(v) => { const herbs = { ...r.herbs }; if (v) herbs[h as HerbKey] = Math.round(v); else delete herbs[h as HerbKey]; setR(i, { herbs }); }} /></label>
                ))}
                <label><span>Mücevher</span><Num v={r.gems} def={0} min={0} max={1e7} step={1} w={70} dis={dis} on={(v) => setR(i, { gems: Math.round(v ?? 0) })} /></label>
                <label><span>Çıkan iksir</span><Num v={r.out} def={1} min={1} max={99} step={1} w={56} dis={dis} on={(v) => setR(i, { out: Math.round(v ?? 1) })} /></label>
                <label><span>Etki ({POTION_EFFECT[r.potion].unit})</span><Num v={T.effects[r.potion].value} def={D.effects[r.potion].value} min={0} max={300} step={0.5} w={64} dis={dis} on={(v) => setE(r.potion, { value: v ?? D.effects[r.potion].value })} /></label>
                <label><span>Süre (dk)</span><Num v={T.effects[r.potion].min} def={D.effects[r.potion].min} min={1} max={1440} step={1} w={64} dis={dis} on={(v) => setE(r.potion, { min: Math.round(v ?? D.effects[r.potion].min) })} /></label>
              </div>
            </div>
          ))}
        </div>
        <button className="btn" style={{ marginTop: 8 }} disabled={dis || T.recipes.length >= 12} onClick={() => set({ recipes: [...T.recipes, { potion: 'potion_swift', herbs: { herb_wind: 3 }, gems: 20, out: 1 }] })}>+ Tarif ekle</button>
      </section>
    </>
  );
}
