import { AdminPanel } from '../admin/AdminPanel.tsx';
import React, { useEffect, useState } from 'react';
import {
  CLASSES, MAPS, SLOTS, SLOT_NAMES, RARITY, ITEM_TPL, ENCHANTS, MATERIAL, SHOPS, upgradeStep, upgradeFailDown, isUpgradable, MAX_PLUS, sellPrice, MARKET_VALUE, itemIconName, masteryChance, itemDisplayName, itemPower,
  classSkill, STAT_MAX, getLayout, TILE, inMarket, STALL_MAX_ITEMS, STALL_MAX_PRICE, STALL_TITLE_MAX, type ItemInstance, type Slot, type ClassId,
} from '@col/shared';
import type { Game } from '../game/game.ts';
import { store, useStore, reqId, notify } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { SkillIcon } from './icons.tsx';
import { sfx } from '../game/audio.ts';

const RIDX = ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'];
const close = () => store.set({ panel: null, npc: null, shop: null, stallView: null });

function Panel({ title, children, width }: { title: string; children: React.ReactNode; width?: number }) {
  return (
    <div className="frame panel" style={width ? { width: `min(${width}px, 96vw)` } : undefined} onPointerDown={(e) => e.stopPropagation()}>
      <div className="hd"><span className="title">{title}</span><button className="x" onClick={close}>✕</button></div>
      <div className="bd">{children}</div>
    </div>
  );
}

export function Panels({ game, onExit }: { game: Game; onExit: (r: string, toCh?: boolean) => void }) {
  const p = useStore((s) => s.panel);
  const ct = useStore((s) => s.confirmTravel);
  const modal = useStore((s) => s.modal);
  const up = useStore((s) => s.upgradeResult);
  void onExit;
  return (
    <>
      {p === 'inventory' && <Inventory game={game} />}
      {p === 'character' && <Character game={game} />}
      {p === 'skills' && <Skills game={game} />}
      {p === 'teleport' && <Teleport game={game} />}
      {p === 'map' && <BigMap game={game} />}
      {p === 'settings' && <Settings />}
      {p === 'npc' && <NpcDialog game={game} />}
      {p === 'shop' && <Shop game={game} />}
      {p === 'upgrade' && <Upgrade game={game} />}
      {p === 'admin' && <AdminPanel onClose={() => store.set({ panel: null })} />}
      {p === 'market' && <Market game={game} />}
      {ct && (
        <div className="overlay"><div className="frame dead" style={{ maxWidth: 440 }}>
          <div className="title" style={{ fontSize: 20, marginBottom: 8 }}>Dikkat: PvP bölgesi</div>
          <div style={{ fontSize: 14 }}>{ct.text}</div>
          <div className="row" style={{ justifyContent: 'center', marginTop: 16 }}>
            <button className="btn" onClick={() => store.set({ confirmTravel: null })}>Vazgeç</button>
            <button className="btn red" onClick={() => { game.travel(ct.map, true); store.set({ confirmTravel: null }); }}>Kabul ediyorum, ışınlan</button>
          </div>
        </div></div>
      )}
      {modal && (
        <div className="overlay" onClick={() => store.set({ modal: null })}><div className="frame dead">
          <div className="title" style={{ fontSize: 22 }}>{modal.title}</div>
          {modal.lines.map((l) => <div key={l} style={{ fontSize: 16, fontWeight: 800, color: '#b8f0a8', marginTop: 6 }}>+ {l}</div>)}
          <button className="btn primary" style={{ marginTop: 16 }}>Tamam</button>
        </div></div>
      )}
      {up && (
        <div className="overlay" onClick={() => store.set({ upgradeResult: null })}><div className={'frame dead result ' + (up.ok ? 'ok' : 'bad')}>
          <h2>{up.ok ? 'Örs Şarkı Söyledi' : 'Kıvılcım Söndü'}</h2>
          <div className="pips" style={{ margin: '10px 0' }}>{Array.from({ length: MAX_PLUS }, (_, i) => <i key={i} className={(i < up.after ? 'on' : '') + (i === 5 ? ' p6' : '')} />)}</div>
          <div style={{ fontSize: 16 }}>+{up.before} → <b style={{ color: up.ok ? 'var(--ember2)' : 'var(--bad)' }}>+{up.after}</b> <span className="muted">(şans %{up.chance})</span></div>
          {!up.ok && up.after === up.before && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Eşyanın kademesi korundu.</div>}
          <button className="btn primary" style={{ marginTop: 18 }}>Tamam</button>
        </div></div>
      )}
    </>
  );
}

// ───────── eşya ipucu ─────────
const TIER_NAMES = ['1. kademe', '2. kademe', '3. kademe', '4. kademe'];
function ItemTip({ it, x, y, pinned, onClose }: { it: ItemInstance; x: number; y: number; pinned?: boolean; onClose?: () => void }) {
  const tpl = ITEM_TPL.get(it.tpl);
  const r = RARITY[it.rarity];
  const body = (
    <>
      <div className="nm" style={{ color: r.color }}>{itemDisplayName(it)}</div>
      <div className="muted" style={{ fontSize: 11 }}>{r.name} · {tpl ? SLOT_NAMES[tpl.slot] : ''}{tpl?.cls ? ` · ${CLASSES[tpl.cls].name}` : ''} · Gereken Sv. {r.minLevel}</div>
      <div className="st" style={{ marginTop: 6 }}>{tpl?.slot === 'weapon' ? 'Saldırı' : 'Savunma'} +{itemPower(it)}</div>
      {it.ench.length > 0 && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Efsunlar ({it.ench.length})</div>}
      {it.ench.map((e, i) => (
        <div key={i} className={'en t' + (e.tier ?? 0)}>
          <span>{ENCHANTS[e.t].name} {ENCHANTS[e.t].unit === '%' ? `%${e.v}` : `+${e.v.toLocaleString('tr-TR')}`}</span>
          <small>{TIER_NAMES[e.tier ?? 0]}</small>
          {pinned && <div className="ed">{ENCHANTS[e.t].desc}</div>}
        </div>
      ))}
      {it.kills ? <div className="muted" style={{ fontSize: 11 }}>Silahla av: {it.kills}</div> : null}
      {it.locked && <div style={{ color: '#ffd27a', fontSize: 11 }}>Kilitli (satılamaz)</div>}
      <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Satış: {sellPrice(it.rarity)} Mücevher</div>
    </>
  );
  // telefonda: dokununca sabit kart, "Kapat" ile kapanır
  if (pinned) return (
    <div className="frame tip tip-sheet" role="dialog" aria-label="Eşya özellikleri" onPointerDown={(e) => e.stopPropagation()}>
      {body}
      <button className="btn small" style={{ width: '100%', marginTop: 10 }} onClick={() => onClose?.()}>Kapat</button>
    </div>
  );
  return <div className="frame tip" style={{ left: Math.min(x + 16, innerWidth - 270), top: Math.min(y + 10, innerHeight - 220) }}>{body}</div>;
}
let lastPointer = 'mouse';
function useTip() {
  const [tip, setTip] = useState<{ it: ItemInstance; x: number; y: number; pinned?: boolean; onClose?: () => void } | null>(null);
  // fare: üstüne gelince; dokunmatik: dokununca sabit kart (üstüne gelme olayı dokunmada anlık titriyordu)
  const bind = (it: ItemInstance | undefined) => it ? {
    onPointerEnter: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setTip({ it, x: e.clientX, y: e.clientY }); },
    onPointerMove: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setTip({ it, x: e.clientX, y: e.clientY }); },
    onPointerLeave: (e: React.PointerEvent) => { if (e.pointerType === 'mouse') setTip(null); },
    onPointerDown: (e: React.PointerEvent) => { lastPointer = e.pointerType; },
    // dokunmatik: kart, hücrenin kendi tıklamasından (seçim) SONRA açılır; ekranı kapatmaz
    onTapCard: () => { if (lastPointer !== 'mouse') setTip({ it, x: 0, y: 0, pinned: true, onClose: () => setTip(null) }); },
  } : {};
  return { tip, bind, clear: () => setTip(null) };
}
function Cell({ it, label, onClick, sel, bind }: { it?: ItemInstance; label?: string; onClick?: () => void; sel?: boolean; bind?: { onTapCard?: () => void } }) {
  const tpl = it ? ITEM_TPL.get(it.tpl) : null;
  const { onTapCard, ...handlers } = bind ?? {};
  return (
    <div className={'cell' + (it ? ' r-' + it.rarity : '') + (sel ? ' sel' : '')} {...handlers} onClick={() => { onClick?.(); onTapCard?.(); }}>
      {it && tpl ? <img src={iconUrl(itemIconName(it), RIDX.indexOf(it.rarity))} alt="" /> : <span className="lbl">{label}</span>}
      {it?.plus ? <span className={'plus' + (it.plus >= 6 ? ' p6' : it.plus >= 5 ? ' p5' : '')}>+{it.plus}</span> : null}
      {it?.locked ? <span className="lock">🔒</span> : null}
    </div>
  );
}

function Inventory({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const { tip, bind, clear } = useTip();
  const [sel, setSel] = useState<string | null>(null);
  if (!self) return null;
  const selItem = self.bag.find((b) => b.id === sel);
  const selSlot = (Object.keys(self.equip) as Slot[]).find((s) => self.equip[s]?.id === sel);
  const selEq = selSlot ? self.equip[selSlot] : undefined;
  const sellIt = (it: ItemInstance) => { game.send({ t: 'sell', items: [it.id], req: reqId() }); setSel(null); clear(); };
  const layout: (Slot | null)[] = ['earring', 'helmet', 'necklace', 'weapon', 'armor', 'bracelet', null, 'boots', null];
  return (
    <Panel title="Çanta ve Ekipman" width={820}>
      <div className="inv">
        <div>
          <div className="paper">
            {layout.map((s, i) => s ? <Cell key={s} it={self.equip[s]} label={SLOT_NAMES[s]} bind={bind(self.equip[s])} onClick={() => { if (self.equip[s]) setSel(sel === self.equip[s]!.id ? null : self.equip[s]!.id); }} sel={!!self.equip[s] && sel === self.equip[s]!.id} /> : <div key={i} />)}
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6, textAlign: 'center' }}>Eşyaya dokun: çıkar, sat ya da kilitle</div>
          {selEq && selSlot && (
            <div className="row" style={{ marginTop: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
              <span style={{ color: RARITY[selEq.rarity].color, fontWeight: 800, width: '100%', textAlign: 'center' }}>{itemDisplayName(selEq)}</span>
              <button className="btn small" onClick={() => { game.send({ t: 'unequip', slot: selSlot }); setSel(null); clear(); }}>Çıkar</button>
              <button className="btn small red" disabled={!!selEq.locked} title={selEq.locked ? 'Kilitli eşya satılmaz' : ''} onClick={() => sellIt(selEq)}>Sat +{sellPrice(selEq.rarity)}</button>
              <button className="btn small" onClick={() => game.send({ t: 'lock', item: selEq.id, on: !selEq.locked })}>{selEq.locked ? 'Kilidi aç' : 'Kilitle'}</button>
            </div>
          )}
        </div>
        <div>
          <div className="row"><b>Çanta</b><span className="muted" style={{ fontSize: 12 }}>{self.bag.length} / 35 ekipman</span><div className="spacer" />{MAPS[store.get().map]?.market && <button className="btn small primary" onClick={() => store.set({ panel: 'market', stallView: null })}>Pazar Dükkânı</button>}</div>
          <div className="bag" style={{ marginTop: 8 }}>
            {self.bag.map((it) => <Cell key={it.id} it={it} sel={sel === it.id} bind={bind(it)} onClick={() => setSel(sel === it.id ? null : it.id)} />)}
            {Array.from({ length: Math.max(0, 35 - self.bag.length) }).slice(0, 14).map((_, i) => <div key={'e' + i} className="cell" />)}
          </div>
          {selItem && (
            <div className="row" style={{ marginTop: 10, flexWrap: 'wrap' }}>
              <span style={{ color: RARITY[selItem.rarity].color, fontWeight: 800 }}>{itemDisplayName(selItem)}</span>
              <div className="spacer" />
              <button className="btn small green" onClick={() => { game.send({ t: 'equip', item: selItem.id }); setSel(null); clear(); }}>Kuşan</button>
              <button className="btn small red" disabled={!!selItem.locked} title={selItem.locked ? 'Kilitli eşya satılmaz' : ''} onClick={() => sellIt(selItem)}>Sat +{sellPrice(selItem.rarity)}</button>
              <button className="btn small" onClick={() => game.send({ t: 'lock', item: selItem.id, on: !selItem.locked })}>{selItem.locked ? 'Kilidi aç' : 'Kilitle'}</button>
            </div>
          )}
          <div style={{ marginTop: 14 }}><b>Malzemeler</b></div>
          <div className="mats">
            {Object.entries(self.materials).filter(([, n]) => n > 0).map(([k, n]) => {
              const m = MATERIAL.get(k);
              return (
                <div key={k} className="mat" title={m?.desc}>
                  <img src={iconUrl(m?.icon ?? 'bag')} alt="" /><div style={{ flex: 1 }}>{m?.name ?? k}<div className="muted" style={{ fontSize: 11 }}>× {n.toLocaleString('tr-TR')}</div></div>
                  {(k === 'starter_chest' || k === 'red_potion') && <button className="btn small" onClick={() => game.send({ t: 'use', key: k, req: reqId() })}>{k === 'starter_chest' ? 'Aç' : 'Kullan'}</button>}
                </div>
              );
            })}
          </div>
          <label className="row" style={{ marginTop: 12, fontSize: 13 }}>
            <input type="checkbox" checked={self.autoPotion} onChange={(e) => game.send({ t: 'autopotion', on: e.target.checked })} /> Can %50'nin altına düşünce otomatik iksir (en az 2 sn arayla)
          </label>
        </div>
      </div>
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}

function Character({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const char = useStore((s) => s.char);
  const [draft, setDraft] = useState(self?.statAlloc ?? { str: 0, res: 0, vit: 0 });
  useEffect(() => { if (self) setDraft(self.statAlloc); }, [self?.statRev]);
  if (!self || !char) return null;
  const used = draft.str + draft.res + draft.vit;
  const left = self.statBudget - used;
  const ch = (k: 'str' | 'res' | 'vit', d: number) => setDraft((x) => ({ ...x, [k]: Math.max(0, Math.min(STAT_MAX, x[k] + Math.min(d, d > 0 ? left : d))) }));
  const changed = draft.str !== self.statAlloc.str || draft.res !== self.statAlloc.res || draft.vit !== self.statAlloc.vit;
  const c = self.combat;
  const row = (k: 'str' | 'res' | 'vit', name: string, eff: string) => (
    <div className="stat">
      <div style={{ flex: 1 }}><b>{name}</b><div className="muted" style={{ fontSize: 11 }}>{eff}</div></div>
      <button className="btn small" onClick={() => ch(k, -1)}>−</button>
      <div className="v">{draft[k]}</div>
      <button className="btn small" onClick={() => ch(k, 1)}>+1</button>
      <button className="btn small" onClick={() => ch(k, 5)}>+5</button>
    </div>
  );
  return (
    <Panel title={`${char.name} — ${CLASSES[char.cls as ClassId].name}`} width={760}>
      <div className="stats">
        <div>
          <div className="row"><b>Statü puanları</b><div className="spacer" /><span style={{ color: left > 0 ? '#8fe08a' : '#a9a08a', fontWeight: 800 }}>Kalan: {left}</span></div>
          <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>Her seviye 3 puan. Her statü en fazla 64. 64 puanda: saldırı %10 / savunma %10 / can %12.</div>
          {row('str', 'Güç', `Saldırı +%${(draft.str / 64 * 10).toFixed(1)}`)}
          {row('res', 'Direnç', `Savunma +%${(draft.res / 64 * 10).toFixed(1)}`)}
          {row('vit', 'Canlılık', `Maks. can +%${(draft.vit / 64 * 12).toFixed(1)}`)}
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn small" onClick={() => setDraft({ str: 0, res: 0, vit: 0 })}>Sıfırla</button>
            <button className="btn small" onClick={() => setDraft(self.statAlloc)}>Geri al</button>
            <div className="spacer" />
            <button className="btn primary small" disabled={!changed} onClick={() => game.send({ t: 'stats', ...draft, rev: self.statRev })}>Uygula</button>
          </div>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Savaş sırasında değiştirilemez. Maks. can artışı bedava iyileşme vermez.</div>
        </div>
        <div>
          <b>Savaş değerleri</b>
          <div style={{ marginTop: 6 }}>
            {[['Seviye', self.level], ['Maks. can', c.maxHp], ['Saldırı', c.atk], ['Savunma', c.def], ['Kritik', `%${c.crit}`], ['Kritik hasarı', `+%${c.critDmg}`], ['Saldırı hızı', `+%${c.atkSpeed}`], ['Blok', `%${c.block}`], ['Can çalma', `%${c.lifesteal}`], ['PvP güç', `%${c.pvpPower}`], ['PvP direnç', `%${c.pvpResist}`], ['Hareket hızı', c.speed], ['Toplam av', self.kills.toLocaleString('tr-TR')], ['Bugünkü av', self.daily]].map(([k, v]) => <div key={k as string} className="kv"><span>{k}</span><b>{v}</b></div>)}
          </div>
        </div>
      </div>
    </Panel>
  );
}

function Skills({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const cls = useStore((s) => s.char?.cls) as ClassId;
  if (!self || !cls) return null;
  const used = (self.skills[0] ?? 1) + (self.skills[1] ?? 1) + (self.skills[2] ?? 1);
  const spec = CLASSES[cls].specs;
  return (
    <Panel title="Beceriler" width={640}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Geliştirme hakkı: {used} / {self.skillBudget} (seviyenle artar). Bedel: mevcut seviye × 5 Mücevher. Her kademe +%4 hasar.</div>
      {[0, 1, 2].map((s) => {
        const sk = classSkill(cls, s)!;
        const lvl = self.skills[s] ?? 1;
        const locked = self.level < sk.unlock;
        return (
          <div key={s} className="skillrow" style={locked ? { opacity: 0.55 } : undefined}>
            <div className="ic"><SkillIcon id={sk.id} /></div>
            <div style={{ flex: 1 }}><b>{sk.name}</b> <span className="muted" style={{ fontSize: 12 }}>Sv. {lvl}/10 · {(sk.cooldownMs / 1000).toFixed(sk.cooldownMs < 1000 ? 2 : 0)} sn · menzil {sk.range}</span><div className="muted" style={{ fontSize: 12 }}>{sk.desc}{locked ? ` — ${sk.unlock}. seviyede açılır` : ''}</div></div>
            <button className="btn small" disabled={locked || lvl >= 10 || used >= self.skillBudget || self.gems < lvl * 5} onClick={() => game.send({ t: 'skillup', s, req: reqId() })}>Geliştir ({lvl * 5})</button>
          </div>
        );
      })}
      <div className="title" style={{ fontSize: 16, margin: '12px 0 6px' }}>Uzmanlık (Sv. 30)</div>
      {!self.spec ? (
        <div className="row" style={{ alignItems: 'stretch' }}>
          {spec.map((sp) => (
            <div key={sp.id} className="skillrow" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="row"><div className="ic"><SkillIcon id={sp.skill.id} /></div><b>{sp.name}</b></div>
              <div className="muted" style={{ fontSize: 12 }}>{sp.skill.name}: {sp.skill.desc}</div>
              <button className="btn small primary" disabled={self.level < 30} onClick={() => { if (confirm(`${sp.name} dalını seçmek istiyor musun? Değiştirmek için sıfırlama parşömeni gerekir.`)) game.send({ t: 'spec', spec: sp.id, req: reqId() }); }}>Seç</button>
            </div>
          ))}
        </div>
      ) : (() => {
        const sk = classSkill(cls, 3, self.spec)!;
        const lvl = self.skills[3] ?? 1;
        return (
          <div className="skillrow">
            <div className="ic"><SkillIcon id={sk.id} /></div>
            <div style={{ flex: 1 }}><b>{sk.name}</b> <span className="muted" style={{ fontSize: 12 }}>Güç {lvl}/10</span><div className="muted" style={{ fontSize: 12 }}>{sk.desc}</div></div>
            <button className="btn small" disabled={lvl >= 10 || self.gems < lvl * 10} onClick={() => game.send({ t: 'skillup', s: 3, req: reqId() })}>Geliştir ({lvl * 10})</button>
          </div>
        );
      })()}
    </Panel>
  );
}

function Teleport({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const map = useStore((s) => s.map);
  return (
    <Panel title="Işınlanma" width={620}>
      <div className="maplist">
        {Object.values(MAPS).filter((m) => m.travelable).map((m) => {
          const locked = (self?.level ?? 1) < m.minLevel;
          return (
            <button key={m.id} className="mapcard" disabled={locked || m.id === map} onClick={() => { sfx.play('ui'); game.travel(m.id); }}>
              <div className="row"><b>{m.name}</b><div className="spacer" />{m.pvp && <span className="pvp">PvP</span>}{m.safe && <span className="ok" style={{ fontSize: 11, fontWeight: 800 }}>Güvenli</span>}</div>
              <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{m.desc}</div>
              <div style={{ fontSize: 11, marginTop: 4, color: locked ? '#ff8a7a' : '#a9a08a' }}>{m.id === map ? 'Buradasın' : locked ? `Seviye ${m.minLevel} gerekir` : `Seviye ${m.minLevel}+`}</div>
            </button>
          );
        })}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 10 }}>Savaştayken ışınlanamazsın. Sunucu her girişte seviye ve bölge şartını doğrular.</div>
    </Panel>
  );
}

function BigMap({ game }: { game: Game }) {
  const map = useStore((s) => s.map);
  const ref = React.useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const draw = () => {
      const c = ref.current; if (!c) return;
      const l = getLayout(map);
      const s = Math.min(640 / l.w, 440 / l.h);
      c.width = l.w * s; c.height = l.h * s;
      const x = c.getContext('2d')!;
      const COL = ['#5f9a46', '#4e8a3c', '#a88a5a', '#9a948a', '#3f8ac0', '#d8c490', '#e8f0f8', '#a8d8f0', '#3a3240', '#6a6670', '#2a6a9a', '#a07a4a'];
      for (let ty = 0; ty < l.h; ty++) for (let tx = 0; tx < l.w; tx++) { x.fillStyle = COL[l.ground[ty * l.w + tx]]; x.fillRect(tx * s, ty * s, s + 0.5, s + 0.5); if (l.blocked[ty * l.w + tx] && l.ground[ty * l.w + tx] !== 4) { x.fillStyle = 'rgba(10,30,10,.5)'; x.fillRect(tx * s, ty * s, s + 0.5, s + 0.5); } }
      const k = s / TILE;
      x.font = '700 12px Nunito'; x.textAlign = 'center';
      for (const n of l.npcs) { const d = l.def.npcs.find((q) => q.id === n.id); x.fillStyle = '#ffd84a'; x.beginPath(); x.arc(n.x * k, n.y * k, 4, 0, 7); x.fill(); x.fillStyle = '#fff'; x.fillText(d?.name ?? '', n.x * k, n.y * k - 7); }
      // canavar yuvaları: daire + ad + seviye aralığı
      for (const z of l.zones) {
        x.fillStyle = 'rgba(220,70,50,.16)'; x.strokeStyle = 'rgba(255,120,90,.75)'; x.lineWidth = 1.5;
        x.beginPath(); x.arc(z.x * k, z.y * k, z.r * k, 0, 7); x.fill(); x.stroke();
        x.font = '800 11px Nunito'; x.lineWidth = 3; x.strokeStyle = 'rgba(0,0,0,.75)'; x.fillStyle = '#ffd9cf';
        const t = `${z.name} · Sv ${z.level[0]}-${z.level[1]}`; x.strokeText(t, z.x * k, z.y * k + 4); x.fillText(t, z.x * k, z.y * k + 4);
      }
      x.font = '700 12px Nunito';
      x.fillStyle = '#fff'; x.strokeStyle = '#000'; x.lineWidth = 2; x.beginPath(); x.arc(game.dx * k, game.dy * k, 5, 0, 7); x.fill(); x.stroke();
    };
    draw(); const iv = setInterval(draw, 500); return () => clearInterval(iv);
  }, [map]);
  return <Panel title={`Harita — ${MAPS[map]?.name}`} width={700}><canvas ref={ref} style={{ display: 'block', margin: '0 auto', borderRadius: 6, border: '1px solid #3a3322' }} /></Panel>;
}

function Settings() {
  const s = useStore((x) => x.settings);
  const set = (p: Partial<typeof s>) => store.set({ settings: { ...s, ...p } });
  return (
    <Panel title="Ayarlar" width={480}>
      <div className="field"><label>Görüntü kalitesi</label>
        <div className="row">{(['low', 'medium', 'high'] as const).map((q) => <button key={q} className={'btn small ' + (s.quality === q ? 'primary' : '')} onClick={() => set({ quality: q })}>{q === 'low' ? 'Düşük' : q === 'medium' ? 'Orta' : 'Yüksek'}</button>)}</div>
        <div className="muted" style={{ fontSize: 11 }}>Düşük: gölge, çimen ve parıltı kapalı. Oyun kuralları değişmez; kritik savaş bilgileri her profilde görünür.</div>
      </div>
      <div className="field"><label>Kare hızı</label>
        <div className="row">{([[30, '30 · Pil tasarrufu'], [60, '60'], [0, 'Sınırsız']] as const).map(([v, l]) => <button key={v} className={'btn small ' + (s.fpsCap === v ? 'primary' : '')} onClick={() => set({ fpsCap: v })}>{l}</button>)}</div>
        <div className="muted" style={{ fontSize: 11 }}>Telefon ısınıyorsa 30 seç. Sınırsız, 120 Hz ekranlarda saniyede 120 kare çizer ve pili hızlı tüketir.</div>
      </div>
      <div className="field"><label>Yakınlaştırma: {s.zoom.toFixed(2)}</label><input type="range" min={0.7} max={1.6} step={0.05} value={s.zoom} onChange={(e) => set({ zoom: Number(e.target.value) })} /></div>
      <div className="field"><label>Müzik / ambiyans: {Math.round(s.music * 100)}</label><input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => set({ music: Number(e.target.value) })} /></div>
      <div className="field"><label>Efekt sesi: {Math.round(s.sfx * 100)}</label><input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => set({ sfx: Number(e.target.value) })} /></div>
      <label className="row" style={{ fontSize: 14 }}><input type="checkbox" checked={s.showNames} onChange={(e) => set({ showNames: e.target.checked })} /> Oyuncu isimlerini göster</label>
      <label className="row" style={{ fontSize: 14, marginTop: 6 }}><input type="checkbox" checked={s.showDamage} onChange={(e) => set({ showDamage: e.target.checked })} /> Başkalarının hasar sayıları</label>
      <div className="row" style={{ marginTop: 14 }}><button className="btn small" onClick={() => document.documentElement.requestFullscreen?.()}>Tam ekran</button></div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>Kısayollar: WASD/oklar yürü · Fare ile tıkla-yürü/hedef · Boşluk/1 saldır · 2-3-4 beceri · Q iksir · Z topla · Tab hedef değiştir · I çanta · C karakter · K beceri · T ışınlan · M harita · Enter sohbet</div>
    </Panel>
  );
}

function NpcDialog({ game }: { game: Game }) {
  const npc = useStore((s) => s.npc);
  if (!npc) return null;
  const labels: Record<string, string> = { upgrade: `Artı Bas (silah ve zırh, en çok +${MAX_PLUS})`, shop_smith: 'Demirci tezgâhı', shop_general: 'Erzak al', sell: 'Eşya sat', storage: 'Depo (yakında)', bank: 'Mücevher bankası (yakında)', craft: 'Takı üretimi (yakında)', teleport: 'Işınlan', dungeon: 'Seferler (yakında)', mount: 'Binek görevi (yakında)', fishing_shop: 'Olta al (yakında)' };
  const act = (a: string) => {
    if (a === 'teleport') store.set({ panel: 'teleport' });
    else if (a === 'shop_general') store.set({ panel: 'shop', shop: 'general' });
    else if (a === 'shop_smith') store.set({ panel: 'shop', shop: 'smith' });
    else if (a === 'sell') store.set({ panel: 'shop', shop: 'sell' });
    else if (a === 'upgrade') store.set({ panel: 'upgrade' });
    else notify('Bu hizmet bir sonraki aşamada açılacak.', 'info');
  };
  const greet: Record<string, string> = {
    haso: 'Ocak sıcak, örs hazır. Silahını ya da zırhını getir; artısını +6\'ya kadar ben dövüp çıkarırım. Güçlü Dal, mühür ve biraz da Mücevher lazım.', rauf: 'Eşyaların bende emanet, bir tanesi bile kaybolmaz.', nur: 'Çekirdeğin ışığı seni dilediğin yere taşır.',
    tuccar: 'Yolculuğa iksirsiz çıkılmaz, yiğit!', pakize: 'İnce işçilik sabır ister.', bekci: 'Kapının ardında karanlık bekliyor.', arda: 'İyi bir binek, iyi bir dosttur.', hasan: 'Göl bugün cömert görünüyor.',
  };
  return (
    <div className="frame panel npcd" onPointerDown={(e) => e.stopPropagation()}>
      <div className="hd"><span className="title">{npc.name}</span><span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{npc.title}</span><button className="x" onClick={close}>✕</button></div>
      <div className="bd">
        <div className="npc-greet">“{greet[npc.id] ?? 'Hoş geldin, yolcu.'}”</div>
        <div className="npc-acts">{npc.actions.concat(npc.id === 'haso' ? ['sell'] : []).map((a) => <button key={a} className={'btn' + (a === 'upgrade' ? ' ember' : '')} onClick={() => act(a)}>{labels[a] ?? a}</button>)}</div>
      </div>
    </div>
  );
}

function Shop({ game }: { game: Game }) {
  const shopId = useStore((s) => s.shop);
  const self = useStore((s) => s.self);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [sel, setSel] = useState<Set<string>>(new Set());
  if (!self || !shopId) return null;
  if (shopId === 'sell') {
    const list = self.bag.filter((i) => !i.locked);
    const total = [...sel].reduce((a, id) => a + sellPrice(self.bag.find((x) => x.id === id)?.rarity ?? 'white'), 0);
    const pick = (rs: string[]) => setSel(new Set(list.filter((i) => rs.includes(i.rarity)).map((i) => i.id)));
    return (
      <Panel title="Eşya Sat" width={640}>
        <div className="row" style={{ marginBottom: 8, flexWrap: 'wrap' }}>
          <button className="btn small" onClick={() => pick(['white'])}>Beyazları seç</button>
          <button className="btn small" onClick={() => pick(['white', 'blue'])}>Beyaz + Mavi</button>
          <button className="btn small" onClick={() => pick(['white', 'blue', 'orange'])}>+ Turuncu</button>
          <button className="btn small ghost" onClick={() => setSel(new Set())}>Temizle</button>
        </div>
        <div className="bag">{list.map((it) => <Cell key={it.id} it={it} sel={sel.has(it.id)} onClick={() => { const n = new Set(sel); n.has(it.id) ? n.delete(it.id) : n.add(it.id); setSel(n); }} />)}</div>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Kilitli ve kuşanılmış eşyalar listede yok; malzemeler toplu satışa girmez.</div>
        <div className="row" style={{ marginTop: 10 }}><b>{sel.size} eşya · +{total} Mücevher</b><div className="spacer" /><button className="btn primary" disabled={!sel.size} onClick={() => { game.send({ t: 'sell', items: [...sel], req: reqId() }); setSel(new Set()); }}>Sat</button></div>
      </Panel>
    );
  }
  const shop = SHOPS[shopId];
  return (
    <Panel title={shop.name} width={560}>
      {shop.products.map((p) => {
        const q = qty[p.id] ?? 1;
        const wallet = p.currency === 'gems' ? self.gems : self.essence;
        return (
          <div key={p.id} className="skillrow">
            <div className="ic"><img src={iconUrl(p.kind === 'material' ? MATERIAL.get(p.ref)?.icon ?? 'bag' : p.ref.startsWith('weapon') ? 'sword' : 'armor_guardian', p.kind === 'equipment' ? 1 : 0)} style={{ width: 38 }} alt="" /></div>
            <div style={{ flex: 1 }}><b>{p.name}</b><div className="muted" style={{ fontSize: 12 }}>{p.price} {p.currency === 'gems' ? 'Mücevher' : 'Öz'}{p.minLevel ? ` · Sv. ${p.minLevel}` : ''}</div></div>
            <input className="inp" type="number" min={1} max={99} value={q} style={{ width: 60, padding: 5 }} onChange={(e) => setQty({ ...qty, [p.id]: Math.max(1, Math.min(99, Number(e.target.value) || 1)) })} />
            <button className="btn small primary" disabled={wallet < p.price * q} onClick={() => game.send({ t: 'buy', shop: shopId, product: p.id, qty: q, price: p.price, req: reqId() })}>Al ({p.price * q})</button>
          </div>
        );
      })}
    </Panel>
  );
}

/** Demirci: silah ve zırhı +6'ya kadar güçlendirir. Malzeme, Mücevher ve şans yönetim panelinden gelir. */
function Upgrade({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const [sel, setSel] = useState<string | null>(null);
  const [mastery, setMastery] = useState(false);
  const [hit, setHit] = useState(0);
  const { tip, bind } = useTip();
  if (!self) return null;
  const all = [...Object.values(self.equip).filter(Boolean) as ItemInstance[], ...self.bag];
  const items = all.filter((i) => isUpgradable(ITEM_TPL.get(i.tpl)?.slot));
  const it = items.find((i) => i.id === sel) ?? null;
  const tpl = it ? ITEM_TPL.get(it.tpl) : null;
  const step = it && it.plus < MAX_PLUS ? upgradeStep(it.plus + 1) : null;
  const m = self.materials;
  const chance = step ? (mastery && step.chance < 100 ? masteryChance(step.chance) : step.chance) : 0;
  const lacks = step ? Object.entries(step.mats).filter(([k, q]) => (m[k] ?? 0) < q).length + (self.gems < step.gems ? 1 : 0) : 1;
  const C = 2 * Math.PI * 52;
  const next = it && step ? itemPower({ ...it, plus: it.plus + 1 }) : 0;
  const equipped = new Set(Object.values(self.equip).map((x) => x?.id));
  const go = () => { if (!it) return; setHit((h) => h + 1); sfx.play('ui'); game.send({ t: 'upgrade', item: it.id, expectPlus: it.plus, mastery, req: reqId() }); };
  return (
    <Panel title="Demirci Haso · Örs" width={820}>
      <div className="forge">
        <div className="forge-pick">
          <div className="sect">Silah ve zırhların</div>
          <div className="bag">
            {items.map((i) => <Cell key={i.id} it={i} sel={sel === i.id} bind={bind(i)} onClick={() => setSel(i.id)} />)}
            {items.length === 0 && <div className="muted" style={{ gridColumn: '1 / -1', fontSize: 13 }}>Çantanda ya da üzerinde silah veya zırh yok.</div>}
          </div>
          <div className="muted" style={{ fontSize: 11.5 }}>{equipped.size ? 'Üzerindekiler de listede. ' : ''}Yalnız silah ve gövde zırhına artı basılır; en çok +{MAX_PLUS}. Silahta her artı saldırıyı, zırhta savunma ve canı artırır.</div>
          <div className="sect" style={{ marginTop: 6 }}>Kurallar</div>
          <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
            Başarıda eşya bir kademe yükselir. {upgradeFailDown() ? 'Başarısızlıkta bir kademe düşer (+0 altına inmez).' : 'Başarısızlıkta kademe korunur.'} Eşya hiçbir zaman yok olmaz.
            Ustalık Mührü şansı göreli %30 artırır. +5'te silah alev halkası, +6'da yıldız ateşi kazanır.
          </div>
        </div>
        <div className="anvil">
          <div key={hit} className={'forge-fx' + (hit ? ' hit' : '')} />
          {!it ? <div className="muted" style={{ textAlign: 'center', padding: '40px 10px' }}>Örse koymak için soldan bir silah ya da zırh seç.</div> : (
            <>
              <div className="stage">
                <Cell it={it} bind={bind(it)} />
                <span className="arrow">›</span>
                <div className={'tplus' + (it.plus + 1 >= 6 ? ' p6' : '')}>{step ? `+${step.target}` : `+${it.plus}`}</div>
              </div>
              <div className="nm" style={{ color: RARITY[it.rarity].color }}>{itemDisplayName(it)}</div>
              <div className="pips">{Array.from({ length: MAX_PLUS }, (_, i) => <i key={i} className={(i < it.plus ? 'on' : '') + (i === 5 ? ' p6' : '')} />)}</div>
              {step ? (
                <>
                  <div className="chance">
                    <svg viewBox="0 0 120 120"><circle cx="60" cy="60" r="52" stroke="rgba(0,0,0,.5)" strokeWidth="8" fill="none" /><circle cx="60" cy="60" r="52" stroke={chance >= 70 ? '#5ef0a6' : chance >= 40 ? '#ffb454' : '#ff6b7d'} strokeWidth="8" fill="none" strokeDasharray={C} strokeDashoffset={C * (1 - chance / 100)} style={{ transition: 'stroke-dashoffset .3s' }} /></svg>
                    <div className="v"><div><b>%{chance}</b><small>Başarı</small></div></div>
                  </div>
                  <div className="gain"><span>{tpl?.slot === 'weapon' ? 'Saldırı' : 'Savunma'} {itemPower(it)} → <b>{next}</b></span></div>
                  <div className="req">
                    {Object.entries(step.mats).map(([k, q]) => {
                      const have = m[k] ?? 0, md = MATERIAL.get(k);
                      return <div key={k} className={'r ' + (have >= q ? 'have' : 'miss')} title={md?.desc}><img src={iconUrl(md?.icon ?? 'bag')} alt="" />{md?.name ?? k}<span className="q">{have.toLocaleString('tr-TR')} / {q}</span></div>;
                    })}
                    <div className={'r ' + (self.gems >= step.gems ? 'have' : 'miss')}><img src={iconUrl('gem')} alt="" />Mücevher<span className="q">{self.gems.toLocaleString('tr-TR')} / {step.gems.toLocaleString('tr-TR')}</span></div>
                  </div>
                  <label className="row" style={{ fontSize: 12.5, alignSelf: 'flex-start' }}><input type="checkbox" checked={mastery} disabled={!(m.mastery_seal > 0) || step.chance >= 100} onChange={(e) => setMastery(e.target.checked)} /> Ustalık Mührü ({m.mastery_seal ?? 0})</label>
                  <button className="btn ember" style={{ width: '100%', padding: 12, fontSize: 15 }} disabled={lacks > 0} onClick={go}>{lacks > 0 ? 'Malzeme eksik' : `Döv · +${step.target}`}</button>
                </>
              ) : <div className="ok" style={{ textAlign: 'center' }}>Bu eşya en üst kademede (+{MAX_PLUS}).</div>}
            </>
          )}
        </div>
      </div>
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}

// ───────── pazar tezgâhı ─────────
const fmtG = (n: number) => n.toLocaleString('tr-TR');
const suggestPrice = (it: ItemInstance) => Math.max(1, Math.round((MARKET_VALUE[it.rarity] ?? 5) * (1 + it.plus * 0.6)));
function Market({ game }: { game: Game }) {
  const view = useStore((s) => s.stallView);
  const my = useStore((s) => s.myStall);
  if (view && !view.own) return <StallBuy game={game} />;
  if (my) return <MyStallPanel game={game} />;
  return <StallSetup game={game} />;
}
function StallSetup({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const map = useStore((s) => s.map);
  const { tip, bind } = useTip();
  const [title, setTitle] = useState('');
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [here, setHere] = useState(() => inMarket(MAPS[map], game.px, game.py));
  useEffect(() => { const iv = setInterval(() => setHere(MAPS[map] ? inMarket(MAPS[map], game.px, game.py) : false), 400); return () => clearInterval(iv); }, [map, game]);
  if (!self) return null;
  const mk = MAPS[map]?.market;
  const chosen = Object.keys(prices).filter((id) => self.bag.some((b) => b.id === id));
  const toggle = (it: ItemInstance) => {
    if (it.locked) return notify('Kilitli eşya satılamaz. Önce çantada kilidini aç.', 'error');
    const next = { ...prices };
    if (next[it.id] !== undefined) delete next[it.id];
    else { if (chosen.length >= STALL_MAX_ITEMS) return notify(`Tezgâha en çok ${STALL_MAX_ITEMS} eşya konabilir.`, 'error'); next[it.id] = String(suggestPrice(it)); }
    setPrices(next);
  };
  const bad = chosen.some((id) => { const n = Number(prices[id]); return !Number.isInteger(n) || n < 1 || n > STALL_MAX_PRICE; });
  const open = () => game.send({ t: 'stall_open', title, items: chosen.map((id) => ({ id, price: Number(prices[id]) })), req: reqId() });
  return (
    <Panel title="Dükkân Kur" width={720}>
      {!mk ? <div className="muted">Dükkân yalnız Pazar Köyü'ndeki Pazar Meydanı'nda kurulur. Işınlayıcı Nur seni köye götürebilir.</div> : (
        <>
          <div className={'stall-where' + (here ? ' ok' : '')}>
            {here ? <>Pazar Meydanı'ndasın. Eşyalarını seç, fiyat ver, dükkânını aç. Dükkân burada kalır, sen istediğin yere gidebilirsin.</> : <>Dükkân yalnız <b>{mk.name}</b>'nda kurulabilir (köyün doğusu).</>}
            {!here && <button className="btn small primary" onClick={() => { game.goToMarket(); close(); }}>Meydana yürü</button>}
          </div>
          <div className="field"><label>Dükkân adı</label><input value={title} maxLength={STALL_TITLE_MAX} placeholder={`${store.get().char?.name ?? ''} Dükkânı`} onChange={(e) => setTitle(e.target.value)} /></div>
          <div className="row"><b>Çantan</b><span className="muted" style={{ fontSize: 12 }}>Satmak istediklerine dokun · {chosen.length}/{STALL_MAX_ITEMS}</span></div>
          <div className="bag" style={{ marginTop: 6 }}>
            {self.bag.map((it) => <Cell key={it.id} it={it} sel={prices[it.id] !== undefined} bind={bind(it)} onClick={() => toggle(it)} />)}
            {self.bag.length === 0 && <div className="muted" style={{ fontSize: 13, gridColumn: '1 / -1' }}>Çantanda satılacak ekipman yok.</div>}
          </div>
          {chosen.length > 0 && (
            <div className="stall-list">
              {chosen.map((id) => {
                const it = self.bag.find((b) => b.id === id)!;
                return (
                  <div className="stall-row" key={id}>
                    <Cell it={it} bind={bind(it)} />
                    <span className="nm" style={{ color: RARITY[it.rarity].color }}>{itemDisplayName(it)}</span>
                    <label className="price"><input inputMode="numeric" value={prices[id]} onChange={(e) => setPrices({ ...prices, [id]: e.target.value.replace(/[^0-9]/g, '').slice(0, 9) })} /><span>Mücevher</span></label>
                    <button className="btn small ghost" onClick={() => toggle(it)} aria-label="Çıkar">✕</button>
                  </div>
                );
              })}
            </div>
          )}
          <div className="row" style={{ marginTop: 12 }}>
            <span className="muted" style={{ fontSize: 12 }}>Seçtiğin eşyalar çantandan dükkâna geçer. Dükkânı kapatınca satılmayanlar geri döner.</span>
            <div className="spacer" />
            <button className="btn primary" disabled={!here || chosen.length === 0 || bad} onClick={open}>Dükkânı Aç</button>
          </div>
        </>
      )}
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}
function MyStallPanel({ game }: { game: Game }) {
  const my = useStore((s) => s.myStall)!;
  const log = useStore((s) => s.stallLog);
  const free = useStore((s) => 35 - (s.self?.bag.length ?? 0));
  const { tip, bind } = useTip();
  return (
    <Panel title={`Dükkânın: ${my.title}`} width={620}>
      <div className="stall-where ok">Dükkânın Pazar Meydanı'nda açık. İstediğin yere gidebilirsin; oyundan çıksan da açık kalır. Sen yokken satılanların parası oyuna girince hesabına geçer.</div>
      <div className="row" style={{ fontSize: 13 }}><span className="muted">Şimdiye kadar kazanç:</span><b style={{ color: '#ffd27a' }}>{fmtG(my.earned)} Mücevher</b></div>
      <div className="stall-list">
        {my.items.map(({ item, price }) => (
          <div className="stall-row" key={item.id}>
            <Cell it={item} bind={bind(item)} />
            <span className="nm" style={{ color: RARITY[item.rarity].color }}>{itemDisplayName(item)}</span>
            <span className="pv">{fmtG(price)} <small>Mücevher</small></span>
          </div>
        ))}
      </div>
      {log.length > 0 && <><div style={{ marginTop: 12 }}><b>Satışlar</b></div>{log.map((l, i) => <div key={i} className="muted" style={{ fontSize: 12 }}>✓ {l}</div>)}</>}
      <div className="row" style={{ marginTop: 14 }}>
        <span className="muted" style={{ fontSize: 12 }}>Kapatınca kalan {my.items.length} eşya çantana döner{free < my.items.length ? ` (çantanda ${free} boş yer var)` : ''}.</span>
        <div className="spacer" /><button className="btn red" onClick={() => game.send({ t: 'stall_close' })}>Dükkânı Kapat</button>
      </div>
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}
function StallBuy({ game }: { game: Game }) {
  const v = useStore((s) => s.stallView)!;
  const gems = useStore((s) => s.self?.gems ?? 0);
  const bagFull = useStore((s) => (s.self?.bag.length ?? 0) >= 35);
  const { tip, bind } = useTip();
  const [confirm, setConfirm] = useState<string | null>(null);
  // uzaktan açıldıysa: tezgâha varınca içeriği iste
  useEffect(() => {
    if (v.items || v.closed) return;
    const iv = setInterval(() => {
      const s = store.get().stalls.find((q) => q.id === v.stall);
      if (!s) { store.set({ stallView: { ...v, closed: true } }); return; }
      if (Math.hypot(s.x - game.px, s.y - game.py) < 500) game.send({ t: 'stall_view', stall: v.stall });
    }, 500);
    return () => clearInterval(iv);
  }, [v, game]);
  return (
    <Panel title={v.title ? `${v.title}` : 'Dükkân'} width={620}>
      <div className="row" style={{ marginBottom: 8 }}><span className="muted">Satıcı: <b style={{ color: '#f1ead8' }}>{v.name ?? '…'}</b></span><div className="spacer" /><span>Mücevherin: <b style={{ color: '#ffd27a' }}>{fmtG(gems)}</b></span></div>
      {v.closed ? <div className="muted">Bu dükkân kapanmış.</div> : !v.items ? <div className="muted">Dükkâna yürüyorsun…</div> : v.items.length === 0 ? <div className="muted">Dükkânda eşya kalmamış.</div> : (
        <div className="stall-list">
          {v.items.map(({ item, price }) => {
            const poor = gems < price;
            return (
              <div className="stall-row" key={item.id}>
                <Cell it={item} bind={bind(item)} />
                <span className="nm" style={{ color: RARITY[item.rarity].color }}>{itemDisplayName(item)}</span>
                <span className={'pv' + (poor ? ' poor' : '')}>{fmtG(price)} <small>Mücevher</small></span>
                {confirm === item.id
                  ? <button className="btn small green" onClick={() => { game.send({ t: 'stall_buy', stall: v.stall, item: item.id, price, req: reqId() }); setConfirm(null); }}>Onayla</button>
                  : <button className="btn small primary" disabled={poor || bagFull} title={poor ? 'Yeterli Mücevherin yok' : bagFull ? 'Çantan dolu' : ''} onClick={() => setConfirm(item.id)}>Satın al</button>}
              </div>
            );
          })}
        </div>
      )}
      {bagFull && <div className="err">Çantan dolu; satın almak için yer aç.</div>}
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}
