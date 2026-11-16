import React from 'react';
import { MATERIALS, MALL_ITEMS, RARITIES, RARITY, CRAFTS_DEFAULT, type GameTuning, type CraftRecipe } from '@col/shared';
import { Num, KIND_NAMES, dropOptions } from './AdminPanel.tsx';
import { iconUrl } from '../game/art/icons.ts';
import { craftOut, matIcon } from '../ui/craft.tsx';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
/** Girdi seçenekleri: bütün malzemeler (kule malzemeleri dahil, yeni eklenenler otomatik) ve market ürünleri */
const inputOpts = (): [string, string][] => [...MATERIALS.map((m) => [m.id, m.name] as [string, string]), ...MALL_ITEMS.filter((m) => !m.soon && !m.epin).map((m) => [m.id, `${m.name} (market)`] as [string, string])];
const itemOpts = (): [string, string][] => [['w_cls', 'Silah (üretenin sınıfına)'], ['a_cls', 'Zırh (üretenin sınıfına)'], ['h_cls', 'Miğfer (üretenin sınıfına)'], ...dropOptions('item')];

/** Üretim tarifleri: Zanaatkâr Pakize'de oyuncuya görünür. Oyuna eklenen her yeni malzeme girdi listesinde otomatik çıkar. */
export function CraftTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const list = t.crafts;
  const set = (n: CraftRecipe[]) => setT({ ...t, crafts: n });
  const upd = (i: number, p: Partial<CraftRecipe>) => set(list.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const add = () => { let k = list.length + 1; while (list.some((r) => r.id === 'r' + k)) k++; set([...list, { id: 'r' + k, name: 'Yeni tarif', out: { kind: 'mat', key: 'mastery_seal', qty: 1 }, inputs: { tower_seal: 1 }, gems: 0, essence: 0, chance: 100, minLevel: 1 }]); };
  const ins = inputOpts();
  return (
    <section className="admin-sec">
      <h4>Üretim tarifleri</h4>
      <div className="muted adm-hint">Oyuncular Pazar Köyü'nde <b>Zanaatkâr Pakize</b>'den üretir. Girdi olarak oyundaki her malzeme ve market ürünü seçilebilir; oyuna yeni bir eşya eklendiğinde burada otomatik görünür. Başarısız üretimde mücevher/öz gider, malzemelerin yarısı geri döner.</div>
      <div className="tw-adm">
        {list.map((r, i) => {
          const o = craftOut(r, 'guardian');
          const opts = r.out.kind === 'item' ? itemOpts() : dropOptions(r.out.kind);
          const inp = Object.entries(r.inputs);
          const setIn = (n: [string, number][]) => upd(i, { inputs: Object.fromEntries(n.filter(([, q]) => q > 0)) });
          return (
            <div className={'tw-adm-row' + (r.off ? ' off' : '')} key={r.id}>
              <div className="tw-adm-h">
                <img src={iconUrl(o.icon, o.rar)} alt="" style={{ width: 34, height: 34 }} />
                <input className="inp grow" value={r.name} maxLength={40} disabled={dis} onChange={(e) => upd(i, { name: e.target.value })} />
                <label className="adm-inline"><span>Açık</span><button type="button" className={'switch' + (r.off ? '' : ' on')} disabled={dis} onClick={() => upd(i, { off: r.off ? undefined : true })}><i /></button></label>
                <button className="btn small ghost danger" disabled={dis} onClick={() => set(list.filter((_, j) => j !== i))}>Sil</button>
              </div>
              <div className="drop-row">
                <b style={{ width: 54 }}>Çıktı</b>
                <select className="adm-sel" value={r.out.kind} disabled={dis} onChange={(e) => { const k = e.target.value as CraftRecipe['out']['kind']; upd(i, { out: { kind: k, key: (k === 'item' ? itemOpts() : dropOptions(k))[0]?.[0] ?? '', qty: 1, ...(k === 'item' ? { rarity: 'blue' } : {}) } }); }}>
                  {(Object.keys(KIND_NAMES) as CraftRecipe['out']['kind'][]).map((k) => <option key={k} value={k}>{KIND_NAMES[k]}</option>)}
                </select>
                <select className="adm-sel grow" value={r.out.key} disabled={dis} onChange={(e) => upd(i, { out: { ...r.out, key: e.target.value } })}>{opts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
                {r.out.kind === 'item' && <select className="adm-sel" value={r.out.rarity ?? 'blue'} disabled={dis} onChange={(e) => upd(i, { out: { ...r.out, rarity: e.target.value } })}>{RARITIES.map((x) => <option key={x} value={x}>{RARITY[x].name}</option>)}</select>}
                <label className="adm-inline"><span>Adet</span><Num v={r.out.qty} def={1} min={1} max={999} step={1} w={56} dis={dis} on={(v) => upd(i, { out: { ...r.out, qty: v ?? 1 } })} /></label>
              </div>
              <div className="drop-list" style={{ marginTop: 6 }}>
                {inp.map(([k, q], j) => (
                  <div className="drop-row" key={j}>
                    <img src={iconUrl(matIcon(k))} alt="" style={{ width: 24, height: 24 }} />
                    <select className="adm-sel grow" value={k} disabled={dis} onChange={(e) => setIn(inp.map((x, jj) => (jj === j ? [e.target.value, x[1]] : x)))}>{ins.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
                    <label className="adm-inline"><span>Adet</span><Num v={q} def={1} min={1} max={9999} step={1} w={64} dis={dis} on={(v) => setIn(inp.map((x, jj) => (jj === j ? [x[0], v ?? 1] : x)))} /></label>
                    <button className="btn small ghost danger" disabled={dis} onClick={() => setIn(inp.filter((_, jj) => jj !== j))}>✕</button>
                  </div>
                ))}
                {inp.length < 8 && <button className="btn small" disabled={dis} onClick={() => { const free = ins.find(([id]) => !(id in r.inputs)); if (free) setIn([...inp, [free[0], 1]]); }}>+ Girdi ekle</button>}
              </div>
              <div className="adm-fields six" style={{ marginTop: 6 }}>
                <label><span>Mücevher</span><Num v={r.gems} def={0} min={0} max={1e9} step={1} w={90} dis={dis} on={(v) => upd(i, { gems: v ?? 0 })} /></label>
                <label><span>Öz</span><Num v={r.essence} def={0} min={0} max={1e9} step={1} w={90} dis={dis} on={(v) => upd(i, { essence: v ?? 0 })} /></label>
                <label><span>Başarı %</span><Num v={r.chance} def={100} min={0} max={100} step={1} w={64} dis={dis} on={(v) => upd(i, { chance: v ?? 100 })} /></label>
                <label><span>En düşük seviye</span><Num v={r.minLevel} def={1} min={1} max={120} step={1} w={64} dis={dis} on={(v) => upd(i, { minLevel: v ?? 1 })} /></label>
              </div>
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="btn small" disabled={dis || list.length >= 60} onClick={add}>+ Tarif ekle</button>
        <button className="btn small ghost" disabled={dis} onClick={() => set(structuredClone(CRAFTS_DEFAULT))}>Örnek tariflere dön</button>
      </div>
    </section>
  );
}
