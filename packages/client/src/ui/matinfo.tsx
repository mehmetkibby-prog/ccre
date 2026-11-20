/**
 * Malzeme ve etki bilgileri:
 * - Malzeme satırına fare gelince ya da dokununca kısa açıklama (iksirlerde etkisi ve süresi).
 * - Sol üst karakter kutusunda etkin iksir ve Nesne Market etkilerinin küçük simgeleri (dokununca liste, kalan süre).
 */
import React, { useEffect, useRef, useState } from 'react';
import { MATERIAL, MALL, mallIcon, POTIONS, POTION_EFFECT, TUNING, wingsBonus, type PotionKey } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';

/** Malzemenin kısa bilgi satırları: ilk satır ne işe yaradığı, sonrakiler etkisi/süresi. */
export function matLines(k: string): string[] {
  const m = MATERIAL.get(k);
  if (k === 'red_potion') return ['Kullanınca azami canının %20\'si anında yenilenir.', 'Çantadaki "Can %50\'nin altına düşünce otomatik iksir" açıksa kendiliğinden içilir.'];
  if ((POTIONS as string[]).includes(k)) {
    const e = TUNING.garden.effects[k as PotionKey], fx = POTION_EFFECT[k as PotionKey];
    return [m?.desc ?? '', `Etki: ${fx.name} +%${e.value}`, `Süre: ${e.min} dk (yeniden içince süre baştan başlar)`];
  }
  return m?.desc ? [m.desc] : [];
}

/** Malzeme satırı: fareyle üzerine gelince ya da dokununca bilgi kutusu açılır. */
export function MatRow({ k, n, children }: { k: string; n: number; children?: React.ReactNode }) {
  const m = MATERIAL.get(k);
  const [open, setOpen] = useState(false);
  const lines = matLines(k);
  return (
    <div className={'mat' + (open ? ' open' : '')}
      onPointerEnter={(e) => { if (e.pointerType === 'mouse') setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === 'mouse') setOpen(false); }}
      onClick={(e) => { if ((e.target as HTMLElement).closest('button')) return; setOpen((o) => !o); }}>
      <img src={iconUrl(m?.icon ?? 'bag')} alt="" />
      <div style={{ flex: 1, minWidth: 0 }}>{m?.name ?? k}<div className="muted" style={{ fontSize: 11 }}>× {n.toLocaleString('tr-TR')}</div></div>
      {children}
      {open && lines.length > 0 && (
        <div className="mat-tip" role="tooltip">
          <b>{m?.name ?? k}</b>
          {lines.map((l, i) => l && <div key={i} className={i === 0 ? '' : 'fx'}>{l}</div>)}
        </div>
      )}
    </div>
  );
}

const SHORT: Record<string, string> = {
  xp_ring: 'Tecrübe +%25', loot_charm: 'Eşya düşme +%25', essence_charm: 'Öz +%20', wisdom_scroll: 'Tecrübe +%25',
  war_ration: '+15 saldırı, +200 can', boss_tracker: 'Boss yerleri görünür', trade_glass: 'Pazar araması açık',
  fish_guide: 'Balık ve inci ×2', emerald_gate: 'Zümrüt geçit efekti', pet_bird: '+20 saldırı, tecrübe +%10',
  pet_monkey: '+20 saldırı, tecrübe +%10', pet_dog: 'Tecrübe +%20',
};
const fmt = (ms: number) => {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s >= 86400) return `${Math.floor(s / 86400)} g ${Math.floor((s % 86400) / 3600)} sa`;
  if (s >= 3600) return `${Math.floor(s / 3600)} sa ${Math.floor((s % 3600) / 60)} dk`;
  if (s >= 60) return `${Math.floor(s / 60)} dk`;
  return `${s} sn`;
};
function buffMeta(k: string): { name: string; icon: string; fx: string } {
  if ((POTIONS as string[]).includes(k)) { const e = TUNING.garden.effects[k as PotionKey]; return { name: MATERIAL.get(k)?.name ?? k, icon: k, fx: `${POTION_EFFECT[k as PotionKey].name} +%${e.value}` }; }
  if (k === 'crimson_wings') { const w = wingsBonus(); return { name: MALL.get(k)?.name ?? k, icon: mallIcon(k), fx: `+${w.atk} saldırı, +${w.def} savunma, +%${w.crit} kritik` }; }
  const m = MALL.get(k);
  return { name: m?.name ?? MATERIAL.get(k)?.name ?? k, icon: m ? mallIcon(k) : MATERIAL.get(k)?.icon ?? 'bag', fx: SHORT[k] ?? '' };
}

/** Sol üst karakter kutusu: etkin iksir ve Nesne Market etkileri (simge + dokununca ayrıntı). */
export function BuffPips() {
  const self = useStore((s) => s.self);
  const [, tick] = useState(0);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(iv); }, []);
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener('pointerdown', off);
    return () => window.removeEventListener('pointerdown', off);
  }, [open]);
  if (!self) return null;
  const now = Date.now() + (store.get().clockSkew ?? 0);
  const list = Object.entries(self.buffs ?? {}).filter(([k, t]) => t > now && (MALL.has(k) || (POTIONS as string[]).includes(k))).sort((a, b) => a[1] - b[1]);
  const pool = self.autoPool ?? 0, bait = self.bait ?? 0;
  if (!list.length && pool <= 0 && bait <= 0) return null;
  return (
    <div className="buff-pips" ref={ref}>
      <button className="pips-row" onClick={() => setOpen((o) => !o)} aria-label="Etkin güçlendirmeler">
        {list.slice(0, 7).map(([k, t]) => { const b = buffMeta(k), left = t - now; return <span key={k} className={'pip' + (left < 5 * 60_000 ? ' ending' : '')} title={`${b.name} · ${fmt(left)}`}><img src={iconUrl(b.icon)} alt="" /></span>; })}
        {pool > 0 && <span className="pip" title={`Oto iksir deposu · ${pool.toLocaleString('tr-TR')} can`}><img src={iconUrl('mall_auto_potion')} alt="" /></span>}
        {bait > 0 && <span className="pip" title={`Bereketli yem · ${bait} av`}><img src={iconUrl('mall_fish_bait')} alt="" /></span>}
        {list.length > 7 && <span className="pip more">+{list.length - 7}</span>}
      </button>
      {open && (
        <div className="pips-pop">
          <div className="hd">Etkin güçlendirmeler</div>
          {list.map(([k, t]) => { const b = buffMeta(k); return <div key={k} className="row1"><img src={iconUrl(b.icon)} alt="" /><div><b>{b.name}</b>{b.fx && <small>{b.fx}</small>}</div><em>{fmt(t - now)}</em></div>; })}
          {pool > 0 && <div className="row1"><img src={iconUrl('mall_auto_potion')} alt="" /><div><b>Oto iksir deposu</b><small>Can %50 altına inince iyileştirir</small></div><em>{pool.toLocaleString('tr-TR')} can</em></div>}
          {bait > 0 && <div className="row1"><img src={iconUrl('mall_fish_bait')} alt="" /><div><b>Bereketli yem</b><small>Balık miktarı ×2</small></div><em>{bait} av</em></div>}
        </div>
      )}
    </div>
  );
}
