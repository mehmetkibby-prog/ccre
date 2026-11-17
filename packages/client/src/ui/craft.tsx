import { useState } from 'react';
import { TUNING, MATERIAL, MALL, ITEM_TPL, RARITY, SLOT_NAMES, CLASSES, mallIcon, type CraftRecipe, type Rarity, type ClassId } from '@col/shared';
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
  // dokunulan malzeme / ürün bilgisi: "tarif|tür|anahtar"
  const [info, setInfo] = useState<string | null>(null);
  if (!self) return null;
  const tap = (v: string) => setInfo((cur) => (cur === v ? null : v));
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
            <div className={'cr-wrap'} key={r.id}>
            <div className={'cr-row' + (ok ? ' ok' : '')}>
              <div className={'cr-out tap' + (info === r.id + '|out|' ? ' on' : '')} onClick={() => tap(r.id + '|out|')}><img src={iconUrl(o.icon, o.rar)} alt="" /><div><b style={{ color: o.color }}>{r.name}</b><div className="muted" style={{ fontSize: 11 }}>{o.name} · şans %{r.chance}{r.minLevel > 1 ? ` · Sv. ${r.minLevel}` : ''}</div></div></div>
              <div className="cr-in">
                {ins.map(([k, q]) => { const have = self.materials?.[k] ?? 0; return <span key={k} className={'cr-m tap' + (have >= q ? ' have' : '') + (info === `${r.id}|mat|${k}` ? ' on' : '')} title={matName(k)} onClick={() => tap(`${r.id}|mat|${k}`)}><img src={iconUrl(matIcon(k))} alt="" />{Math.min(have, q)}/{q}</span>; })}
                {r.gems > 0 && <span className={'cr-m tap' + (self.gems >= r.gems ? ' have' : '')} onClick={() => tap(`${r.id}|gem|`)}><img src={iconUrl('gem')} alt="" />{r.gems.toLocaleString('tr-TR')}</span>}
                {r.essence > 0 && <span className={'cr-m tap' + (self.essence >= r.essence ? ' have' : '')} onClick={() => tap(`${r.id}|ess|`)}><img src={iconUrl('essence')} alt="" />{r.essence.toLocaleString('tr-TR')}</span>}
              </div>
              <button className="btn small primary" disabled={!ok} onClick={() => send({ t: 'craft', id: r.id, req: reqId() })}>{lvOk ? 'Üret' : `Sv. ${r.minLevel}`}</button>
            </div>
            {info?.startsWith(r.id + '|') && <CraftInfo r={r} cls={cls} what={info.slice(r.id.length + 1)} have={self.materials ?? {}} gems={self.gems} essence={self.essence} onClose={() => setInfo(null)} />}
            </div>
          );
        })}
      </div>
      {list.length > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Ürüne ya da malzemelere dokunursan ne olduklarını görürsün.</div>}
    </Panel>
  );
}

/** Dokunulan ürün / malzeme bilgisi (satırın altında açılır). */
function CraftInfo({ r, cls, what, have, gems, essence, onClose }: { r: CraftRecipe; cls: string; what: string; have: Record<string, number>; gems: number; essence: number; onClose: () => void }) {
  const [kind, key] = what.split('|');
  let icon = 'bag', rar = 0, title = '', color: string | undefined, lines: string[] = [];
  if (kind === 'out') {
    const o = craftOut(r, cls);
    icon = o.icon; rar = o.rar; title = o.name; color = o.color;
    if (r.out.kind === 'item') {
      const k = /^[wah]_cls$/.test(r.out.key) ? r.out.key.replace('cls', cls) : r.out.key;
      const t = ITEM_TPL.get(k);
      if (t) lines.push(`${SLOT_NAMES[t.slot]}${t.cls ? ' · ' + CLASSES[t.cls as ClassId].name : ''} · ${RARITY[(r.out.rarity ?? 'blue') as Rarity]?.name ?? ''} nadirlik`);
      lines.push('Üretilen ekipman çantana gelir.');
    } else {
      const d = MATERIAL.get(r.out.key)?.desc ?? MALL.get(r.out.key)?.desc;
      if (d) lines.push(d);
      if (r.out.qty > 1) lines.push(`Bir üretimde ${r.out.qty} adet verir.`);
    }
    lines.push(`Başarı şansı %${r.chance}${r.minLevel > 1 ? ` · en az ${r.minLevel}. seviye` : ''}.`);
  } else if (kind === 'mat') {
    icon = matIcon(key); title = matName(key);
    const d = MATERIAL.get(key)?.desc ?? MALL.get(key)?.desc;
    if (d) lines.push(d);
    lines.push(`Elinde: ${(have[key] ?? 0).toLocaleString('tr-TR')} · Gereken: ${r.inputs[key]}`);
  } else if (kind === 'gem') {
    icon = 'gem'; title = 'Mücevher';
    lines = ['Oyunun ana parası. Canavarlardan, görevlerden ve satıştan kazanılır.', `Elinde: ${gems.toLocaleString('tr-TR')} · Gereken: ${r.gems.toLocaleString('tr-TR')}`];
  } else {
    icon = 'essence'; title = 'Öz';
    lines = ['Canavarlardan düşen öz. Market\'te bozdurulabilir.', `Elinde: ${essence.toLocaleString('tr-TR')} · Gereken: ${r.essence.toLocaleString('tr-TR')}`];
  }
  return (
    <div className="cr-info" onClick={onClose}>
      <img src={iconUrl(icon, rar)} alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ color }}>{title}</b>
        {lines.map((l, i) => <div key={i} className="muted" style={{ fontSize: 12 }}>{l}</div>)}
      </div>
    </div>
  );
}
