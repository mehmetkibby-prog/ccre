import { TUNING, MATERIAL, MALL, ITEM_TPL, RARITY, mallIcon, type CraftRecipe, type Rarity } from '@col/shared';
import { useStore, reqId } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const RAR_I: Record<string, number> = { white: 0, blue: 1, orange: 2, crimson: 3, unique: 4, infinite: 5, purple: 6, emerald: 7 };

/** Tarif çıktısının adı ve ikonu (sınıfa göre silah/zırh/miğfer: üretenin sınıfı) */
export function craftOut(r: CraftRecipe, cls: string) {
  if (r.out.kind === 'item') {
    const key = /^[wah]_cls$/.test(r.out.key) ? r.out.key.replace('cls', cls) : r.out.key;
    const t = ITEM_TPL.get(key);
    const rar = (r.out.rarity ?? 'blue') as Rarity;
    const icon = t ? (t.slot === 'weapon' || t.slot === 'armor') && t.cls && rar !== 'white' ? (t.slot === 'weapon' ? `w_${t.cls}_${['blue', 'orange', 'crimson'].includes(rar) ? rar : 'unique'}` : `armor_${t.cls}_${['blue', 'orange', 'crimson'].includes(rar) ? rar : 'unique'}`) : t.icon : 'bag';
    return { name: `${RARITY[rar]?.name ?? ''} ${t?.name ?? key}`.trim(), icon, rar: RAR_I[rar] ?? 0, color: RARITY[rar]?.color };
  }
  const m = MATERIAL.get(r.out.key), ml = MALL.get(r.out.key);
  return { name: `${r.out.qty > 1 ? r.out.qty + '× ' : ''}${m?.name ?? ml?.name ?? r.out.key}`, icon: m?.icon ?? (ml ? mallIcon(r.out.key) : 'bag'), rar: 0, color: undefined };
}
export const matName = (k: string) => MATERIAL.get(k)?.name ?? MALL.get(k)?.name ?? k;
export const matIcon = (k: string) => MATERIAL.get(k)?.icon ?? (MALL.has(k) ? mallIcon(k) : 'bag');

/** Zanaatkâr Pakize: yönetimden tanımlanan tarifler; girdiler elde olan/gereken ile. */
export function CraftPanel() {
  const self = useStore((s) => s.self);
  const cls = useStore((s) => s.char?.cls ?? 'guardian');
  if (!self) return null;
  const list = TUNING.crafts.filter((r) => !r.off);
  return (
    <Panel title="Üretim · Zanaatkâr Pakize" width={600}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Malzemeleri getir, gerisini ben hallederim. Başarısız olursa mücevher ve öz gider, malzemelerin yarısını geri veririm.</div>
      {!list.length && <div className="muted">Şu an üretilebilecek bir tarif yok.</div>}
      <div className="cr-list">
        {list.map((r) => {
          const o = craftOut(r, cls);
          const lvOk = self.level >= r.minLevel;
          const ins = Object.entries(r.inputs);
          const ok = lvOk && ins.every(([k, q]) => (self.materials?.[k] ?? 0) >= q) && self.gems >= r.gems && self.essence >= r.essence;
          return (
            <div className={'cr-row' + (ok ? ' ok' : '')} key={r.id}>
              <div className="cr-out"><img src={iconUrl(o.icon, o.rar)} alt="" /><div><b style={{ color: o.color }}>{r.name}</b><div className="muted" style={{ fontSize: 11 }}>{o.name} · şans %{r.chance}{r.minLevel > 1 ? ` · Sv. ${r.minLevel}` : ''}</div></div></div>
              <div className="cr-in">
                {ins.map(([k, q]) => { const have = self.materials?.[k] ?? 0; return <span key={k} className={'cr-m' + (have >= q ? ' have' : '')} title={matName(k)}><img src={iconUrl(matIcon(k))} alt="" />{Math.min(have, q)}/{q}</span>; })}
                {r.gems > 0 && <span className={'cr-m' + (self.gems >= r.gems ? ' have' : '')}><img src={iconUrl('gem')} alt="" />{r.gems.toLocaleString('tr-TR')}</span>}
                {r.essence > 0 && <span className={'cr-m' + (self.essence >= r.essence ? ' have' : '')}><img src={iconUrl('essence')} alt="" />{r.essence.toLocaleString('tr-TR')}</span>}
              </div>
              <button className="btn small primary" disabled={!ok} onClick={() => send({ t: 'craft', id: r.id, req: reqId() })}>{lvOk ? 'Üret' : `Sv. ${r.minLevel}`}</button>
            </div>
          );
        })}
      </div>
    </Panel>
  );
}
