/**
 * Rütbe arayüzü: 65. seviyeden sonra tecrübe çubuğu rütbe ilerlemesini gösterir; karakter panelinde rütbe kartı.
 */
import React from 'react';
import { RANKS, RANK_MAX, RANK_LEVEL, rankDef } from '@col/shared';
type RankSelf = { level: number; rank?: { r: number; xp: number } | null };

/** Seviye sınırındaki oyuncu için rütbe ilerlemesi (yoksa null): k 0–1, etiket ve ayrıntı */
export function rankProgress(self: RankSelf | null | undefined) {
  if (!self || self.level < RANK_LEVEL || !self.rank) return null;
  const d = rankDef(self.rank.r); if (!d) return null;
  const next = d.id < RANK_MAX ? RANKS[d.id] : null;
  const k = next ? Math.min(1, self.rank.xp / Math.max(1, next.xp)) : 1;
  return { d, next, k, xp: self.rank.xp, need: next?.xp ?? 0 };
}

/** Karakter panelindeki rütbe kartı */
export function RankCard({ self }: { self: RankSelf }) {
  const rp = rankProgress(self);
  if (!rp) {
    return (
      <div className="rank-card locked">
        <div className="rk-badge">✦</div>
        <div className="rk-info"><b>Rütbe</b><span className="muted">{RANK_LEVEL}. seviyede açılır: ilk rütben <b style={{ color: RANKS[0].color }}>{RANKS[0].name}</b>. Sonra kazandığın tecrübe rütbeni yükseltir.</span></div>
      </div>
    );
  }
  const { d, next, k, xp, need } = rp;
  return (
    <div className="rank-card" style={{ '--rk': d.color } as React.CSSProperties}>
      <div className="rk-badge">{d.id}</div>
      <div className="rk-info">
        <b style={{ color: d.color }}>{d.name}</b>
        <span className="muted">Saldırı ve azami can +%{d.atkPct}{next ? <> · Sonraki: <b style={{ color: next.color }}>{next.name}</b> (+%{next.atkPct})</> : ' · En yüksek rütbe'}</span>
        {next && <div className="rk-bar"><i style={{ width: `${k * 100}%` }} /><span>{xp.toLocaleString('tr-TR')} / {need.toLocaleString('tr-TR')} TP · %{(k * 100).toFixed(1)}</span></div>}
      </div>
    </div>
  );
}
