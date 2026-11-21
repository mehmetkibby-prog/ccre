import React from 'react';
import { RUNE_DEFAULTS, RUNES, RUNE_KINDS, RANKS, RANK_LEVEL, type GameTuning } from '@col/shared';
import { Num } from './AdminPanel.tsx';

type SetT = (t: GameTuning) => void;
/**
 * Rün ve Rütbe: rün sisteminin açılış seviyesi, üretim parça sayısı, seviye başına yüzde, yükseltme taban bedeli.
 * Rün parçalarının düşme oranı Ganimet → Rün Sahili'nden; canavar güçleri Canavarlar, sayıları Haritalar sekmesinden.
 */
export function RuneTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const R = t.runes ?? {}, D = RUNE_DEFAULTS;
  const set = (p: Partial<NonNullable<GameTuning['runes']>>) => {
    const next = { ...R, ...p } as Record<string, number | undefined>;
    for (const k of Object.keys(next)) if (next[k] === undefined) delete next[k];
    setT({ ...t, runes: Object.keys(next).length ? next : undefined });
  };
  const pct = R.pctPerLevel ?? D.pctPerLevel, up = R.upBase ?? D.upBase;
  return (
    <>
      <section className="admin-sec">
        <h4>Rünler</h4>
        <div className="muted adm-hint">
          Üç rün aynı anda takılır: {RUNE_KINDS.map((k) => <b key={k} style={{ color: RUNES[k].color }}>{RUNES[k].short} ({RUNES[k].statName}) </b>)}.
          Aynı türden parçalar bir araya gelince 1. seviye rün olur; yükseltme garantilidir ve her seviye bir parça daha ister.
          Rün parçalarının düşme oranı <b>Ganimet → Rün Sahili</b>'nden (varsayılan her tür %1), canavarların gücü <b>Canavarlar</b>, sayıları <b>Haritalar</b> sekmesinden ayarlanır.
        </div>
        <div className="adm-fields six">
          <label><span>Rün paneli açılış seviyesi</span><Num v={R.unlockLevel} def={D.unlockLevel} min={1} max={120} step={1} w={64} dis={dis} on={(v) => set({ unlockLevel: v })} /></label>
          <label><span>Üretim: kaç parça = 1. seviye rün</span><Num v={R.craftCost} def={D.craftCost} min={1} max={100} step={1} w={64} dis={dis} on={(v) => set({ craftCost: v })} /></label>
          <label><span>Seviye başına artış (%)</span><Num v={R.pctPerLevel} def={D.pctPerLevel} min={0} max={5} step={0.05} w={64} dis={dis} on={(v) => set({ pctPerLevel: v })} /></label>
          <label><span>Yükseltme taban bedeli (1→2 = 1 + bu)</span><Num v={R.upBase} def={D.upBase} min={0} max={100} step={1} w={64} dis={dis} on={(v) => set({ upBase: v })} /></label>
        </div>
        <div className="muted adm-hint">
          Şu anki değerlerle: 1→2 için {1 + up}, 2→3 için {2 + up}, 9→10 için {9 + up} parça; 10. seviye rün %{(10 * pct).toLocaleString('tr-TR')}, 30. seviye %{(30 * pct).toLocaleString('tr-TR')} verir.
        </div>
      </section>
      <section className="admin-sec">
        <h4>Rütbeler</h4>
        <div className="muted adm-hint">{RANK_LEVEL}. seviyeye ulaşan oyuncu doğrudan <b style={{ color: RANKS[0].color }}>{RANKS[0].name}</b> olur; sonra kazandığı tecrübe rütbesini yükseltir. Oyuncuya istediğin rütbeyi <b>Oyuncular</b> sekmesinde, oyuncuyu açıp “Eşya ver → Rütbe” ile verebilirsin.</div>
        <div className="adm-table-wrap"><table className="adm-table"><thead><tr><th>#</th><th>Rütbe</th><th>Gereken rütbe TP</th><th>Saldırı / can</th></tr></thead><tbody>
          {RANKS.map((r) => <tr key={r.id}><td>{r.id}</td><td style={{ color: r.color, fontWeight: 800 }}>{r.name}</td><td>{r.xp ? r.xp.toLocaleString('tr-TR') : 'Sv. ' + RANK_LEVEL}</td><td>+%{r.atkPct}</td></tr>)}
        </tbody></table></div>
      </section>
    </>
  );
}
