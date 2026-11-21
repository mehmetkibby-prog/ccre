/**
 * Rün paneli (Sv.50+): üç yuva (Kızıl Kudret / Safir Siper / Zümrüt Yaşam), parçalardan üretim, garantili yükseltme,
 * savaş dışında takma/çıkarma. Çantadaki rünler seviyeye özel malzeme yığınlarıdır (pazarda seviyesiyle satılır).
 */
import React from 'react';
import { RUNES, RUNE_KINDS, RUNE_MAX_LEVEL, runeConf, runeKey, parseRuneKey, runeUpCost, runePct, type RuneKind } from '@col/shared';
import type { Game } from '../game/game.ts';
import { useStore, reqId } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { Panel } from './panels.tsx';

const pct = (v: number) => v.toLocaleString('tr-TR', { maximumFractionDigits: 2 });

export function RunePanel({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const conf = runeConf();
  const send = (op: 'craft' | 'up' | 'equip' | 'unequip', o: { k?: RuneKind; key?: string }) => game.send({ t: 'rune', op, ...o, req: reqId() });
  if (self.level < conf.unlockLevel) return <Panel title="Rünler" width={460}><div className="muted">Rün paneli {conf.unlockLevel}. seviyede açılır. Rün parçaları Rün Sahili canavarlarından düşer.</div></Panel>;
  const eq = self.runes?.eq ?? {};
  const mats = self.materials ?? {};
  const bag = Object.entries(mats).map(([k, n]) => ({ key: k, n, r: parseRuneKey(k) })).filter((x) => x.r && x.n > 0) as { key: string; n: number; r: { k: RuneKind; lv: number } }[];
  bag.sort((a, b) => RUNE_KINDS.indexOf(a.r.k) - RUNE_KINDS.indexOf(b.r.k) || b.r.lv - a.r.lv);
  return (
    <Panel title="Rünler" width={640}>
      <div className="rn-slots">
        {RUNE_KINDS.map((k) => {
          const d = RUNES[k], lv = eq[k] ?? 0, frags = mats[d.frag] ?? 0, cost = lv ? runeUpCost(lv) : 0;
          return (
            <div key={k} className={'rn-slot' + (lv ? ' on' : '')} style={{ '--rc': d.color } as React.CSSProperties}>
              <div className="rn-gem"><img src={iconUrl(d.icon)} alt="" />{lv > 0 && <span className="rn-lv">{lv}</span>}</div>
              <b>{d.short}</b>
              <span className="rn-eff">{lv ? <>{d.statName} <em>+%{pct(runePct(lv))}</em></> : <span className="muted">boş yuva</span>}</span>
              {lv > 0 && (
                <div className="rn-btns">
                  <button className="btn small primary" disabled={lv >= RUNE_MAX_LEVEL || frags < cost} title={`${cost} ${d.fragName}`} onClick={() => send('up', { k })}>{lv >= RUNE_MAX_LEVEL ? 'En yüksek' : <>Yükselt <small>{cost} parça</small></>}</button>
                  <button className="btn small" onClick={() => send('unequip', { k })}>Çıkar</button>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="rn-sum">
        {RUNE_KINDS.map((k) => <span key={k} style={{ color: RUNES[k].color }}>{RUNES[k].statName} +%{pct(runePct(eq[k] ?? 0))}</span>)}
      </div>

      <div className="rn-sect">Parçalar ve üretim</div>
      <div className="rn-frags">
        {RUNE_KINDS.map((k) => {
          const d = RUNES[k], n = mats[d.frag] ?? 0;
          return (
            <div key={k} className="rn-frag" style={{ '--rc': d.color } as React.CSSProperties}>
              <img src={iconUrl(d.fragIcon)} alt="" />
              <div><b>{d.fragName}</b><span className="muted">Elinde {n.toLocaleString('tr-TR')}</span></div>
              <button className="btn small primary" disabled={n < conf.craftCost} onClick={() => send('craft', { k })}>Üret <small>{conf.craftCost} parça</small></button>
            </div>
          );
        })}
      </div>

      <div className="rn-sect">Çantandaki rünler</div>
      {bag.length === 0 ? <div className="muted" style={{ fontSize: 12.5 }}>Çantanda rün yok. Parçalardan üretebilir ya da pazardan alabilirsin.</div> : (
        <div className="rn-bag">
          {bag.map(({ key, n, r }) => {
            const d = RUNES[r.k], cost = runeUpCost(r.lv), frags = mats[d.frag] ?? 0, cur = eq[r.k] ?? 0;
            return (
              <div key={key} className="rn-item" style={{ '--rc': d.color } as React.CSSProperties}>
                <div className="rn-ic"><img src={iconUrl(d.icon)} alt="" /><span className="rn-lv">{r.lv}</span>{n > 1 && <span className="rn-n">×{n}</span>}</div>
                <div className="rn-in"><b>{d.short} · Sv.{r.lv}</b><span className="muted">{d.statName} +%{pct(runePct(r.lv))}{cur ? ` (takılı: Sv.${cur})` : ''}</span></div>
                <div className="rn-btns">
                  <button className="btn small green" onClick={() => send('equip', { key })}>{cur ? 'Değiştir' : 'Tak'}</button>
                  <button className="btn small" disabled={r.lv >= RUNE_MAX_LEVEL || frags < cost} title={`${cost} ${d.fragName}`} onClick={() => send('up', { key: runeKey(r.k, r.lv) })}>Yükselt <small>{cost}</small></button>
                </div>
              </div>
            );
          })}
        </div>
      )}
      <div className="rn-note muted">Rünler yalnız savaş dışında takılıp çıkarılır. Yükseltme her zaman başarılıdır: 1→2 için {runeUpCost(1)}, 2→3 için {runeUpCost(2)} parça; her seviyede bir parça artar. Rünler ve parçalar oyuncu pazarında satılabilir; rün seviyesiyle el değiştirir. Parçalar Rün Sahili canavarlarından düşer.</div>
    </Panel>
  );
}
