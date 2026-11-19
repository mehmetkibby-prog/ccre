import { installAvailable, onInstallChange, promptInstall } from '../game/install.ts';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CLASSES, MAPS, SLOTS, SLOT_NAMES, RARITY, ITEM_TPL, ENCHANTS, MATERIAL, SHOPS, upgradeStep, upgradeFailDown, isUpgradable, MAX_PLUS, sellPrice, MARKET_VALUE, itemIconName, masteryChance, itemDisplayName, itemPower,
  transformConf, transformGroup, classSkill, skillUpCost, TUNING, STAT_MAX, STAT_GAIN, getLayout, TILE, inMarket, STALL_MAX_ITEMS, STALL_MAX_PRICE, STALL_TITLE_MAX, MALL, mallIcon, skillBuffVal, EVO_TIERS, EVO_NAMES, EVO_COLORS, evoPct, type ItemInstance, type Slot, type ClassId,
} from '@col/shared';
import { api } from '../api.ts';
import { MallPanel, BossPanel, FishShop, TradeGlass, AutoPanel, EssMarketPanel } from './extras.tsx';
import { FriendsPanel, MountPanel, RankingsPanel } from './social.tsx';
import { TowerPanel } from './tower.tsx';
import { ForgePanel } from './forge.tsx';
import { CraftPanel } from './craft.tsx';
import { QuestPanel, NpcQuests } from './quests.tsx';
import { GuildPanel } from './guild.tsx';
import type { Game } from '../game/game.ts';
import { store, useStore, reqId, notify } from '../game/store.ts';
import { iconUrl } from '../game/art/icons.ts';
import { SkillIcon } from './icons.tsx';
import { sfx } from '../game/audio.ts';

const TOUCH_UI = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
const RIDX = ['white', 'blue', 'orange', 'crimson', 'unique', 'infinite', 'purple', 'emerald'];
const close = () => store.set({ panel: null, npc: null, shop: null, stallView: null });

export function Panel({ title, children, width }: { title: string; children: React.ReactNode; width?: number }) {
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
      {p === 'settings' && <Settings game={game} />}
      {p === 'npc' && <NpcDialog game={game} />}
      {p === 'shop' && <Shop game={game} />}
      {p === 'upgrade' && <Upgrade game={game} />}
      {p === 'market' && <Market game={game} />}
      {p === 'donate' && <Donate game={game} />}
      {p === 'mall' && <MallPanel game={game} />}
      {p === 'bosses' && <BossPanel game={game} />}
      {p === 'auto' && <AutoPanel game={game} />}
      {p === 'friends' && <FriendsPanel />}
      {p === 'mount' && <MountPanel />}
      {p === 'tower' && <TowerPanel />}
      {p === 'forge' && <ForgePanel />}
      {p === 'craft' && <CraftPanel />}
      {p === 'quests' && <QuestPanel />}
      {p === 'guild' && <GuildPanel />}
      {p === 'essmarket' && <EssMarketPanel game={game} />}
      {p === 'rankings' && <RankingsPanel />}
      {p === 'fishshop' && <FishShop game={game} />}
      {p === 'tradeglass' && <TradeGlass game={game} />}
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
export function ItemTip({ it, x, y, pinned, onClose }: { it: ItemInstance; x: number; y: number; pinned?: boolean; onClose?: () => void }) {
  const tpl = ITEM_TPL.get(it.tpl);
  const r = RARITY[it.rarity];
  const power = itemPower(it);
  const self = store.get().self;
  const lvlOk = !self || self.level >= r.minLevel;
  const body = (
    <>
      <div className="tip-hd" style={{ ['--rc' as string]: r.color }}>
        <div className={'cell r-' + it.rarity}><img src={iconUrl(itemIconName(it), RIDX.indexOf(it.rarity))} alt="" /></div>
        <div style={{ minWidth: 0 }}>
          <div className="nm" style={{ color: r.color }}>{itemDisplayName(it)}</div>
          <div className="sub">{r.name} · {tpl ? SLOT_NAMES[tpl.slot] : ''}{tpl?.cls ? ` · ${CLASSES[tpl.cls].name}` : ''}</div>
          {it.plus > 0 && <div className="pips">{Array.from({ length: Math.max(MAX_PLUS, it.plus) }, (_, i) => <i key={i} className={(i < it.plus ? 'on' : '') + (i === 5 ? ' p6' : '')} />)}</div>}
        </div>
      </div>
      <div className="tip-stat">
        <span>{tpl?.slot === 'weapon' ? 'Saldırı' : 'Savunma'}</span>
        <b>+{power.toLocaleString('tr-TR')}</b>
        {(it.plus > 0 || !!it.evo) && <small>{itemPower({ ...it, plus: 0, evo: 0 })}{it.plus > 0 ? ` + ${itemPower({ ...it, evo: 0 }) - itemPower({ ...it, plus: 0, evo: 0 })} (artı)` : ''}{it.evo ? ` + %${evoPct(TUNING, tpl?.slot ?? '', it.evo)} (evrim)` : ''}</small>}
      </div>
      {(tpl?.slot === 'weapon' || tpl?.slot === 'armor') && (it.evo || it.kills) ? (
        <div className="tip-evo">
          {it.evo ? <span className="ev" style={{ color: EVO_COLORS[Math.min(3, it.evo)] }}>{'◆'.repeat(it.evo)}{'◇'.repeat(EVO_TIERS - it.evo)} {it.evo}. Evrim · {EVO_NAMES[Math.min(3, it.evo)]}</span> : <span className="ev muted">Evrilmemiş</span>}
          {(it.evo ?? 0) < EVO_TIERS && <span className="muted">Evrim avı {(it.kills ?? 0).toLocaleString('tr-TR')} / {TUNING.evo[tpl.slot][it.evo ?? 0].kills.toLocaleString('tr-TR')}</span>}
        </div>
      ) : null}
      {it.ench.length > 0 && (
        <div className="tip-ench">
          <div className="sect">Efsunlar · {it.ench.length}</div>
          {it.ench.map((e, i) => {
            const E = ENCHANTS[e.t], tier = e.tier ?? 0;
            return (
              <div key={i} className={'er t' + tier}>
                <div className="ln">
                  <span className="k">{E.name}</span>
                  <span className="v">{E.unit === '%' ? `%${e.v}` : `+${e.v.toLocaleString('tr-TR')}`}</span>
                  <span className="tr" title={TIER_NAMES[tier]}>{[0, 1, 2, 3].map((q) => <i key={q} className={q <= tier ? 'on' : ''} />)}</span>
                </div>
                {pinned && <div className="ed">{E.desc}</div>}
              </div>
            );
          })}
        </div>
      )}
      <div className="tip-ft">
        <span style={{ color: lvlOk ? undefined : 'var(--bad)' }}>Gereken seviye {r.minLevel}</span>
        <span>Satış <b>{sellPrice(it.rarity)}</b> Mücevher</span>
        {it.locked && <span style={{ color: 'var(--ember2)' }}>🔒 Kilitli</span>}
      </div>
    </>
  );
  // telefonda: dokununca sabit kart, "Kapat" ile kapanır
  // panelin kırpma alanı kartı kesmesin: sayfanın en üst katmanına çizilir
  // Kart uzun olunca alttaki "Kapat" ekran dışında kalıyordu: köşede her zaman görünen ✕, kartın dışına dokununca da kapanır.
  if (pinned) return createPortal(
    <div className="tip-back" onPointerDown={(e) => { e.stopPropagation(); if (e.target === e.currentTarget) onClose?.(); }}>
      <div className="frame tip tip-sheet" role="dialog" aria-label="Eşya özellikleri" onPointerDown={(e) => e.stopPropagation()}>
        <button className="tip-x" aria-label="Kapat" onClick={() => onClose?.()}>✕</button>
        {body}
        <button className="btn small" style={{ width: '100%', marginTop: 10 }} onClick={() => onClose?.()}>Kapat</button>
      </div>
    </div>, document.body,
  );
  return <FloatingTip x={x} y={y}>{body}</FloatingTip>;
}
/** İmlecin yanında açılır; gerçek yüksekliği ölçülüp ekrana sığdırılır (altta yer yoksa imlecin üstüne çıkar). */
function FloatingTip({ x, y, children }: { x: number; y: number; children: React.ReactNode }) {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useLayoutEffect(() => {
    const el = ref.current; if (!el) return;
    const h = el.offsetHeight, w = el.offsetWidth;
    let top = y + 14;
    if (top + h > innerHeight - 8) top = y - h - 10;
    top = Math.max(8, Math.min(top, innerHeight - h - 8));
    let left = x + 18;
    if (left + w > innerWidth - 8) left = x - w - 14;
    el.style.left = Math.max(8, left) + 'px'; el.style.top = top + 'px'; el.style.visibility = 'visible';
  });
  return createPortal(<div ref={ref} className="frame tip" style={{ left: x + 18, top: y + 14, visibility: 'hidden' }}>{children}</div>, document.body);
}
let lastPointer = 'mouse';
export function useTip() {
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
export function Cell({ it, label, onClick, sel, bind }: { it?: ItemInstance; label?: string; onClick?: () => void; sel?: boolean; bind?: { onTapCard?: () => void } }) {
  const tpl = it ? ITEM_TPL.get(it.tpl) : null;
  const { onTapCard, ...handlers } = bind ?? {};
  return (
    <div className={'cell' + (it ? ' r-' + it.rarity : '') + (sel ? ' sel' : '')} {...handlers} onClick={() => { onClick?.(); onTapCard?.(); }}>
      {it && tpl ? <img src={iconUrl(itemIconName(it), RIDX.indexOf(it.rarity))} className={it.rarity === 'unique' && !itemIconName(it).endsWith('_unique') ? 'uq-tint' : undefined} alt="" /> : <span className="lbl">{label}</span>}
      {it?.plus ? <span className={'plus' + (it.plus >= 6 ? ' p6' : it.plus >= 5 ? ' p5' : '')}>+{it.plus}</span> : null}
      {it?.locked ? <span className="lock">🔒</span> : null}
    </div>
  );
}

type BagTab = 'esya' | 'malzeme' | 'market';
/** Duvar saati (epoch ms) ile yenilenen bileşen: süreli etkilerin kalan süresi için. */
export function useClock(ms = 1000) { const [, set] = useState(0); useEffect(() => { const iv = setInterval(() => set((x) => x + 1), ms); return () => clearInterval(iv); }, [ms]); return Date.now(); }
const fmtLeft = (ms: number) => { const m = Math.max(0, Math.round(ms / 60000)); if (m >= 2880) return `${Math.round(m / 1440)} gün`; if (m >= 120) return `${Math.floor(m / 60)} sa ${m % 60} dk`; if (m >= 60) return `1 sa ${m - 60} dk`; return `${m} dk`; };
function Inventory({ game }: { game: Game }) {
  const self = useStore((s) => s.self);
  const target = useStore((s) => s.mallTarget);
  const { tip, bind, clear } = useTip();
  const [sel, setSel] = useState<string | null>(null);
  const [tab, setTab] = useState<BagTab>(() => (target ? 'esya' : 'esya'));
  const [rename, setRename] = useState('');
  const [encItem, setEncItem] = useState<string | null>(null);
  const now = useClock(1000);
  if (!self) return null;
  const selItem = self.bag.find((b) => b.id === sel);
  const selSlot = (Object.keys(self.equip) as Slot[]).find((s) => self.equip[s]?.id === sel);
  const selEq = selSlot ? self.equip[selSlot] : undefined;
  const sellIt = (it: ItemInstance) => { game.send({ t: 'sell', items: [it.id], req: reqId() }); setSel(null); clear(); };
  const layout: (Slot | null)[] = ['earring', 'helmet', 'necklace', 'weapon', 'armor', 'bracelet', null, 'boots', null];
  // market ürünü bir ekipmana uygulanacaksa: eşyaya dokununca uygulanır
  const pick = (id: string) => {
    // efsun ürünleri: eşya bir kez seçilir, panelde Değiştir/Artır art arda basılır
    if (target === 'enchant_change' || target === 'enchant_add') { setEncItem(id); store.set({ mallTarget: null }); setSel(null); clear(); return; }
    if (target) { game.useItem(target, id); store.set({ mallTarget: null }); setSel(null); clear(); return; }
    setSel(sel === id ? null : id);
  };
  const mats = Object.entries(self.materials).filter(([k, n]) => n > 0 && !MALL.has(k));
  const mallOwned = Object.entries(self.materials).filter(([k, n]) => n > 0 && MALL.has(k));
  const buffs = Object.entries(self.buffs ?? {}).filter(([, t]) => t > now + (store.get().clockSkew ?? 0));
  const doRename = async () => {
    try { const r = await api<{ name: string }>('/api/rename', { characterId: store.get().char?.id, name: rename }); notify(`Yeni adın: ${r.name}`, 'ok'); setRename(''); }
    catch (e) { notify((e as Error).message, 'error'); }
  };
  return (
    <Panel title="Çanta ve Ekipman" width={840}>
      {target && <div className="bag-target">✦ <b>{MALL.get(target)?.name}</b>: uygulamak istediğin ekipmana dokun. <button className="btn small ghost" onClick={() => store.set({ mallTarget: null })}>Vazgeç</button></div>}
      <div className="inv">
        <div>
          <div className="paper">
            {layout.map((s, i) => s ? <Cell key={s} it={self.equip[s]} label={SLOT_NAMES[s]} bind={bind(self.equip[s])} onClick={() => { if (self.equip[s]) pick(self.equip[s]!.id); }} sel={!!self.equip[s] && sel === self.equip[s]!.id} /> : <div key={i} />)}
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
          <div className="bag-tabs">
            {([['esya', 'Eşya', self.bag.length], ['malzeme', 'Malzeme', mats.length], ['market', 'Nesne Market', mallOwned.length]] as [BagTab, string, number][]).map(([k, l, n]) =>
              <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}{n > 0 && <small>{n}</small>}</button>)}
          </div>
          {tab === 'esya' && <>
            <div className="row"><span className="muted" style={{ fontSize: 12 }}>{self.bag.length} / 35 ekipman</span><div className="spacer" />{MAPS[store.get().map]?.market && <button className="btn small primary" onClick={() => store.set({ panel: 'market', stallView: null })}>Pazar Dükkânı</button>}</div>
            <div className="bag" style={{ marginTop: 8 }}>
              {self.bag.map((it) => <Cell key={it.id} it={it} sel={sel === it.id} bind={bind(it)} onClick={() => pick(it.id)} />)}
              {Array.from({ length: Math.max(0, 35 - self.bag.length) }).slice(0, 14).map((_, i) => <div key={'e' + i} className="cell" />)}
            </div>
            {/* toplu satış: o renkteki kilitsiz çanta eşyalarının hepsi (kuşanılmış ve kilitli eşyalar satılmaz) */}
            <div className="bulk-sell">
              <span className="muted">Toplu sat:</span>
              {(['white', 'blue', 'orange', 'crimson'] as const).map((r) => {
                const list = self.bag.filter((it) => it.rarity === r && !it.locked);
                const sum = list.length * sellPrice(r);
                return (
                  <button key={r} className="btn small bs-btn" style={{ borderColor: RARITY[r].color, color: RARITY[r].color }} disabled={!list.length}
                    title={list.length ? `${list.length} eşya · +${sum} Mücevher` : `Çantada kilitsiz ${RARITY[r].name.toLocaleLowerCase('tr')} eşya yok`}
                    onClick={() => { if (confirm(`Çantadaki ${list.length} adet ${RARITY[r].name} eşya satılsın mı? (+${sum.toLocaleString('tr-TR')} Mücevher)\nKilitli ve kuşanılmış eşyalar satılmaz.`)) { game.send({ t: 'sell', items: list.map((it) => it.id), req: reqId() }); setSel(null); clear(); } }}>
                    {RARITY[r].name === 'Sıradan' ? 'Beyaz' : RARITY[r].name}{list.length > 0 && <small>{list.length}</small>}
                  </button>
                );
              })}
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
          </>}
          {tab === 'malzeme' && <>
            <div className="mats">
              {mats.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Malzemen yok. Canavarlardan düşer.</div>}
              {mats.map(([k, n]) => {
                const m = MATERIAL.get(k);
                return (
                  <div key={k} className="mat" title={m?.desc}>
                    <img src={iconUrl(m?.icon ?? 'bag')} alt="" /><div style={{ flex: 1 }}>{m?.name ?? k}<div className="muted" style={{ fontSize: 11 }}>× {n.toLocaleString('tr-TR')}</div></div>
                    {(k === 'starter_chest' || k === 'azrail_chest' || k === 'forge_chest' || k === 'red_potion') && <button className="btn small" onClick={() => game.send({ t: 'use', key: k, req: reqId() })}>{k === 'red_potion' ? 'Kullan' : 'Aç'}</button>}
                  </div>
                );
              })}
            </div>
            <label className="row" style={{ marginTop: 12, fontSize: 13 }}>
              <input type="checkbox" checked={self.autoPotion} onChange={(e) => game.send({ t: 'autopotion', on: e.target.checked })} /> Can %50'nin altına düşünce otomatik iksir (en az 2 sn arayla)
            </label>
          </>}
          {tab === 'market' && <>
            {(buffs.length > 0 || (self.autoPool ?? 0) > 0 || (self.bait ?? 0) > 0) && (
              <div className="buff-list">
                {buffs.map(([k, t]) => { const m = MALL.get(k); return <div key={k} className="buff"><img src={iconUrl(mallIcon(k))} alt="" /><span>{m?.name ?? k}</span><b>{fmtLeft(t - now - (store.get().clockSkew ?? 0))}</b></div>; })}
                {(self.autoPool ?? 0) > 0 && <div className="buff"><img src={iconUrl('mall_auto_potion')} alt="" /><span>Oto iksir deposu</span><b>{(self.autoPool ?? 0).toLocaleString('tr-TR')} can</b></div>}
                {(self.bait ?? 0) > 0 && <div className="buff"><img src={iconUrl('mall_fish_bait')} alt="" /><span>Bereketli yem</span><b>{self.bait} av</b></div>}
              </div>
            )}
            <div className="mats mall-mats">
              {mallOwned.length === 0 && <div className="muted" style={{ fontSize: 13 }}>Nesne Market ürünün yok. Sağ üstteki <b>Market</b> düğmesinden alabilirsin.</div>}
              {mallOwned.map(([k, n]) => {
                const m = MALL.get(k)!;
                const act = m.target ? 'Ekipman seç' : k === 'rename' ? null : (k === 'mastery_seal' || k === 'protect_seal') ? null : 'Kullan';
                return (
                  <div key={k} className="mat mall-mat" title={m.desc}>
                    <img src={iconUrl(mallIcon(k))} alt="" /><div style={{ flex: 1, minWidth: 0 }}>{m.name}<div className="muted" style={{ fontSize: 11 }}>× {n.toLocaleString('tr-TR')}</div></div>
                    {act && <button className="btn small" onClick={() => { if (m.target) { store.set({ mallTarget: k }); setTab('esya'); } else game.useItem(k); }}>{act}</button>}
                    {k === 'rename' && <div className="rename-row"><input className="inp" placeholder="Yeni ad" maxLength={18} value={rename} onChange={(e) => setRename(e.target.value)} /><button className="btn small primary" disabled={rename.trim().length < 2} onClick={doRename}>Değiştir</button></div>}
                    {(k === 'mastery_seal' || k === 'protect_seal') && <small className="muted" style={{ fontSize: 10.5 }}>Haso'da kendiliğinden</small>}
                  </div>
                );
              })}
            </div>
            <div className="row" style={{ marginTop: 10, gap: 8, flexWrap: 'wrap' }}>
              <button className="btn small primary" onClick={() => store.set({ panel: 'mall' })}>Nesne Market'i aç</button>
              {(self.buffs?.trade_glass ?? 0) > now && <button className="btn small" onClick={() => game.send({ t: 'market_search', q: '' })}>Pazarda ara (Ticaret Camı)</button>}
              {(self.stallSkin ?? 0) > 0 && <label className="row" style={{ fontSize: 12.5, gap: 6 }}><input type="checkbox" checked={self.stallSkin === 2} onChange={(e) => game.send({ t: 'stall_skin', on: e.target.checked })} /> Zümrüt tezgâh görünümü</label>}
            </div>
          </>}
        </div>
      </div>
      {tip && <ItemTip {...tip} />}
      {encItem && <EnchantBox game={game} itemId={encItem} onClose={() => setEncItem(null)} />}
    </Panel>
  );
}

/** Efsun penceresi: seçili ekipmanın efsunları; Değiştir / Artır düğmelerine art arda basılır (her basış 1 ürün harcar). */
function EnchantBox({ game, itemId, onClose }: { game: Game; itemId: string; onClose: () => void }) {
  const self = useStore((s) => s.self);
  const [pending, setPending] = useState(0);
  const [flash, setFlash] = useState(0);
  const it = self ? (self.bag.find((x) => x.id === itemId) ?? Object.values(self.equip).find((x) => x?.id === itemId)) : undefined;
  const sig = it ? JSON.stringify(it.ench) : '';
  const [lastSig, setLastSig] = useState(sig);
  // sunucudan yeni efsunlar gelince bekleme biter ve satırlar parlar
  useEffect(() => { if (sig !== lastSig) { setLastSig(sig); setPending(0); setFlash((f) => f + 1); } }, [sig, lastSig]);
  useEffect(() => { if (!pending) return; const t = setTimeout(() => setPending(0), 2500); return () => clearTimeout(t); }, [pending]);
  if (!self || !it) return null;
  const tpl = ITEM_TPL.get(it.tpl);
  const nChange = self.materials.enchant_change ?? 0, nAdd = self.materials.enchant_add ?? 0;
  const use = (k: 'enchant_change' | 'enchant_add') => { if (pending) return; setPending(Date.now()); game.useItem(k, it.id); };
  const full = it.ench.length >= 4;
  return createPortal(
    <div className="enc-back" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="enc-box" onPointerDown={(e) => e.stopPropagation()}>
        <div className="enc-hd">
          <img src={iconUrl(itemIconName(it))} alt="" />
          <div style={{ flex: 1, minWidth: 0 }}>
            <b style={{ color: RARITY[it.rarity].color }}>{itemDisplayName(it)}</b>
            <div className="muted" style={{ fontSize: 11.5 }}>{tpl ? SLOT_NAMES[tpl.slot] : ''} · Efsun {it.ench.length}/4</div>
          </div>
          <button className="btn small ghost" onClick={onClose}>✕</button>
        </div>
        <div key={flash} className={'enc-list' + (flash ? ' flash' : '')}>
          {it.ench.length === 0 && <div className="muted" style={{ fontSize: 12.5, padding: 6 }}>Bu eşyada efsun yok. Önce <b>Artır</b> ile efsun ekle.</div>}
          {it.ench.map((e, i) => {
            const E = ENCHANTS[e.t], tier = e.tier ?? 0;
            return (
              <div key={i} className={'er t' + tier}>
                <span className="k">{E.name}</span>
                <span className="v">{E.unit === '%' ? `%${e.v}` : `+${e.v.toLocaleString('tr-TR')}`}</span>
                <span className="tr" title={TIER_NAMES[tier]}>{[0, 1, 2, 3].map((q) => <i key={q} className={q <= tier ? 'on' : ''} />)}</span>
              </div>
            );
          })}
        </div>
        <div className="enc-acts">
          <button className="btn primary" disabled={!!pending || nChange <= 0 || it.ench.length === 0} onClick={() => use('enchant_change')}>
            <img src={iconUrl(mallIcon('enchant_change'))} alt="" /> Değiştir <small>× {nChange}</small>
          </button>
          <button className="btn green" disabled={!!pending || nAdd <= 0 || full} onClick={() => use('enchant_add')} title={full ? 'Bu eşyada 4 efsun var' : ''}>
            <img src={iconUrl(mallIcon('enchant_add'))} alt="" /> Artır <small>× {nAdd}</small>
          </button>
        </div>
        {nChange <= 0 && nAdd <= 0 && <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>Efsun ürünün kalmadı. <button className="btn small" onClick={() => store.set({ panel: 'mall' })}>Nesne Market</button></div>}
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Her basış 1 ürün harcar. Beğendiğin efsunlar gelince pencereyi kapatman yeterli.</div>
      </div>
    </div>,
    document.body,
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
          <div className="muted" style={{ fontSize: 11, margin: '4px 0 8px' }}>Seviye atlamak can, saldırı ve savunmayı artırmaz; her seviye 3 statü puanı verir. Her statü en fazla 64. Puan başına: Güç +{STAT_GAIN.str} saldırı, Direnç +{STAT_GAIN.res} savunma, Canlılık +{STAT_GAIN.vit} can.</div>
          {row('str', 'Güç', `Saldırı +${draft.str * STAT_GAIN.str}`)}
          {row('res', 'Direnç', `Savunma +${draft.res * STAT_GAIN.res}`)}
          {row('vit', 'Canlılık', `Maks. can +${draft.vit * STAT_GAIN.vit}`)}
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
  const used = (self.skills[0] ?? 1) + (self.skills[1] ?? 1) + (self.skills[2] ?? 1) + Math.max(0, (self.skills[4] ?? 1) - 1);
  const spec = CLASSES[cls].specs;
  // geliştirme bedeli (yönetimden: Mücevher + malzemeler) ve yeterli mi
  const costOf = (lvl: number, isSpec: boolean) => skillUpCost(lvl, isSpec);
  const canPay = (c: ReturnType<typeof costOf>) => self.gems >= c.gems && Object.entries(c.mats).every(([k, q]) => (self.materials[k] ?? 0) >= q);
  const CostLine = ({ c }: { c: ReturnType<typeof costOf> }) => (
    <div className="sk-cost">
      <span className={self.gems >= c.gems ? '' : 'miss'}><img src={iconUrl('gem')} alt="" />{c.gems.toLocaleString('tr-TR')}</span>
      {Object.entries(c.mats).map(([k, q]) => <span key={k} className={(self.materials[k] ?? 0) >= q ? '' : 'miss'} title={MATERIAL.get(k)?.name ?? MALL.get(k)?.name ?? k}><img src={iconUrl(MATERIAL.get(k)?.icon ?? (MALL.has(k) ? mallIcon(k) : 'dust'))} alt="" />{(self.materials[k] ?? 0).toLocaleString('tr-TR')}/{q}</span>)}
    </div>
  );
  return (
    <Panel title="Beceriler" width={640}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Geliştirme hakkı: {used} / {self.skillBudget} (seviyenle artar). Her kademe +%4 hasar; bedel her geliştirmenin altında yazar.</div>
      {[0, 1, 2, 4].map((s) => classSkill(cls, s)!).map((sk, i) => ({ sk, s: [0, 1, 2, 4][i] })).sort((a, b) => a.sk.unlock - b.sk.unlock).map(({ s }) => {
        const sk = classSkill(cls, s)!;
        const lvl = self.skills[s] ?? 1;
        const locked = self.level < sk.unlock;
        return (
          <div key={s} className="skillrow" style={locked ? { opacity: 0.55 } : undefined}>
            <div className="ic"><SkillIcon id={sk.id} /></div>
            <div style={{ flex: 1 }}><b>{sk.name}</b> {sk.qte && <span className="sk-new">Zamanlama çubuklu</span>} <span className="muted" style={{ fontSize: 12 }}>Sv. {lvl}/10 · {(sk.cooldownMs / 1000).toFixed(sk.cooldownMs < 1000 ? 2 : 0)} sn{sk.range ? ` · menzil ${sk.range}` : ' · çevrene'}</span><div className="muted" style={{ fontSize: 12 }}>{sk.desc}{locked ? ` — ${sk.unlock}. seviyede açılır` : ''}</div>
              {sk.buff && <div className="sk-buff">3 sn güçlendirme şimdi <b>%{skillBuffVal(sk, lvl)!.v}</b>{lvl < 10 && <> → geliştirince <b>%{skillBuffVal(sk, lvl + 1)!.v}</b></>} · çubuk yeşilde: <b>×1,5</b> hasar · tuş <kbd>5</kbd></div>}</div>
            <div className="sk-up">
              <button className="btn small" disabled={locked || lvl >= 10 || used >= self.skillBudget || !canPay(costOf(lvl, false))} onClick={() => game.send({ t: 'skillup', s, req: reqId() })}>Geliştir</button>
              {lvl < 10 && <CostLine c={costOf(lvl, false)} />}
            </div>
          </div>
        );
      })}
      <div className="title" style={{ fontSize: 16, margin: '12px 0 6px' }}>Uzmanlık (Sv. {TUNING.specLevel})</div>
      {!self.spec ? (
        <div className="row" style={{ alignItems: 'stretch' }}>
          {spec.map((sp) => (
            <div key={sp.id} className="skillrow" style={{ flex: 1, flexDirection: 'column', alignItems: 'flex-start' }}>
              <div className="row"><div className="ic"><SkillIcon id={sp.skill.id} /></div><b>{sp.name}</b></div>
              <div className="muted" style={{ fontSize: 12 }}>{sp.skill.name}: {sp.skill.desc}</div>
              <button className="btn small primary" disabled={self.level < TUNING.specLevel} onClick={() => { if (confirm(`${sp.name} dalını seçmek istiyor musun? Değiştirmek için sıfırlama parşömeni gerekir.`)) game.send({ t: 'spec', spec: sp.id, req: reqId() }); }}>Seç</button>
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
            <div className="sk-up">
              <button className="btn small" disabled={lvl >= 10 || !canPay(costOf(lvl, true))} onClick={() => game.send({ t: 'skillup', s: 3, req: reqId() })}>Geliştir</button>
              {lvl < 10 && <CostLine c={costOf(lvl, true)} />}
            </div>
          </div>
        );
      })()}
    </Panel>
  );
}

/** Dünya Sağlığı'na Öz bağışı. */
function Donate({ game }: { game: Game }) {
  const wh = useStore((s) => s.worldHealth);
  const ess = useStore((s) => s.self?.essence ?? 0);
  const [amt, setAmt] = useState(Math.min(ess, 50));
  useEffect(() => { if (amt > ess) setAmt(ess); }, [ess]); // eslint-disable-line react-hooks/exhaustive-deps
  const go = (n: number) => { if (n <= 0) return; sfx.play('ui'); game.donate(n); };
  return (
    <Panel title="Dünya Sağlığı" width={420}>
      <div className="donate">
        <div className="donate-meter"><div className={'bar' + (wh < 30 ? ' low' : '')}><i style={{ width: `${wh}%` }} /></div><b>%{wh.toFixed(1)}</b></div>
        <p className="muted" style={{ fontSize: 13, lineHeight: 1.5, margin: '10px 0 14px' }}>Dünyanın sağlığı zamanla azalır. Canavarlardan düşen <b style={{ color: 'var(--iznik)' }}>Öz</b>ü bağışladıkça artar; sağlık düştükçe her bağış daha çok iyileştirir.</p>
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><span className="muted">Elindeki Öz</span><b style={{ color: '#8ff4ff' }}><img src={iconUrl('essence')} alt="" style={{ width: 16, verticalAlign: -3, marginRight: 4 }} />{ess.toLocaleString('tr-TR')}</b></div>
        <input type="range" min={0} max={Math.max(1, ess)} step={1} value={Math.min(amt, ess)} disabled={!ess} onChange={(e) => setAmt(Number(e.target.value))} style={{ width: '100%' }} />
        <div className="row wrap" style={{ gap: 6, margin: '8px 0 12px' }}>
          {[10, 50, 100].map((n) => <button key={n} className="btn small ghost" disabled={ess < n} onClick={() => setAmt(n)}>{n}</button>)}
          <button className="btn small ghost" disabled={!ess} onClick={() => setAmt(ess)}>Tümü</button>
        </div>
        <button className="btn primary" style={{ width: '100%', padding: 12 }} disabled={!ess || amt <= 0} onClick={() => go(amt)}>{amt > 0 ? `${amt.toLocaleString('tr-TR')} Öz bağışla` : 'Bağışlanacak Öz yok'}</button>
      </div>
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

/** Ayarlar: bağlantı gecikmesi ve kare hızı (oyun ekranında gösterilmez). */
const COLO_NAMES: Record<string, string> = { IST: 'İstanbul', ADB: 'İzmir', ESB: 'Ankara', SOF: 'Sofya', OTP: 'Bükreş', ATH: 'Atina', BUD: 'Budapeşte', VIE: 'Viyana', FRA: 'Frankfurt', AMS: 'Amsterdam', LHR: 'Londra', CDG: 'Paris', MXP: 'Milano', WAW: 'Varşova', PRG: 'Prag', MUC: 'Münih', DUS: 'Düsseldorf', HAM: 'Hamburg', TLV: 'Tel Aviv', TBS: 'Tiflis', KBP: 'Kiev' };
let coloCache: string | null = null;
/** Bağlantının geçtiği Cloudflare noktası (yurt dışı bir nokta ise gecikmeyi ağ yolu artırır, oyun değil). */
function useColo() {
  const [c, setC] = useState(coloCache);
  useEffect(() => {
    if (coloCache !== null) return;
    fetch('/cdn-cgi/trace', { cache: 'no-store' }).then((r) => (r.ok ? r.text() : '')).then((t) => { const m = /colo=([A-Z]{3})/.exec(t); coloCache = m ? m[1] : ''; setC(coloCache); }).catch(() => { coloCache = ''; setC(''); });
  }, []);
  return c;
}
function NetStats({ game }: { game: Game }) {
  const ping = useStore((x) => x.ping), fps = useStore((x) => x.fps);
  // tanı: ekran kartında tutulan geometri/doku/program sayısı (uzun oturumda sürekli artıyorsa sızıntı var)
  const [mem, setMem] = useState('');
  useEffect(() => { const f = () => { const i = game.renderer.renderer.info; setMem(`${i.memory.geometries} geo · ${i.memory.textures} doku · ${i.programs?.length ?? 0} program`); }; f(); const iv = setInterval(f, 1000); return () => clearInterval(iv); }, [game]);
  const colo = useColo();
  const path = useStore((x) => x.netPath);
  return (
    <>
      <div className="netstats">
        <div><small>Gecikme</small><b style={{ color: ping > 200 ? '#ff6b7d' : ping > 100 ? '#ffdca3' : '#5ef0a6' }}>{ping} ms</b></div>
        <div><small>Kare hızı</small><b>{fps} fps</b></div>
      </div>
      {path === 'direct' && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Bağlantı: <b>doğrudan sunucuya</b> (Türkiye)</div>}
      <div className="muted" style={{ fontSize: 10, marginTop: 2, opacity: 0.7 }}>Bellek: {mem}</div>
      {path !== 'direct' && colo && <div className="muted" style={{ fontSize: 11, marginTop: 4 }}>Bağlantı noktası: <b>{COLO_NAMES[colo] ?? colo}</b> ({colo}){colo !== 'IST' && colo !== 'ADB' && colo !== 'ESB' ? ' · yurt dışından geçiyor, gecikmeyi bu yol artırır' : ''}</div>}
    </>
  );
}

function Settings({ game }: { game: Game }) {
  const s = useStore((x) => x.settings);
  const set = (p: Partial<typeof s>) => store.set({ settings: { ...s, ...p } });
  return (
    <Panel title="Ayarlar" width={480}>
      <NetStats game={game} />
      {matchMedia('(pointer: coarse)').matches && <div className={'field cool-field' + (s.cool ? ' on' : '')}>
        <label>Isınma modu</label>
        <button className={'btn ' + (s.cool ? 'primary' : '')} style={{ width: '100%' }} onClick={() => set({ cool: !s.cool })}>{s.cool ? '❄ Isınma modu AÇIK' : 'Isınma modunu aç'}</button>
        <div className="muted" style={{ fontSize: 11 }}>Telefon ısınıyorsa aç: akıcılık aynı kalır (saniyede 60 kare), ısıyı azaltmak için gölge ve çimen kapanır, çözünürlük biraz düşer, uzaktaki oyuncu ve efektler sadeleşir. Oyun, hasar ve kurallar aynen kalır.</div>
      </div>}
      <div className="field"><label>Görüntü kalitesi</label>
        <div className="row">{(['low', 'medium', 'high'] as const).map((q) => <button key={q} className={'btn small ' + (s.quality === q ? 'primary' : '')} onClick={() => set({ quality: q })}>{q === 'low' ? 'Düşük' : q === 'medium' ? 'Orta' : 'Yüksek'}</button>)}</div>
        <div className="muted" style={{ fontSize: 11 }}>Düşük: gölge, çimen ve parıltı kapalı. Oyun kuralları değişmez; kritik savaş bilgileri her profilde görünür.</div>
      </div>
      <div className="field"><label>Kare hızı</label>
        <div className="row">{([[30, '30 · Pil tasarrufu'], [60, '60'], [0, 'Sınırsız']] as const).map(([v, l]) => <button key={v} disabled={!!s.cool && TOUCH_UI} className={'btn small ' + (s.fpsCap === v && !(s.cool && TOUCH_UI) ? 'primary' : '')} onClick={() => set({ fpsCap: v })}>{l}</button>)}</div>
        <div className="muted" style={{ fontSize: 11 }}>Telefon ısınıyorsa 30 seç. Sınırsız, 120 Hz ekranlarda saniyede 120 kare çizer ve pili hızlı tüketir.</div>
      </div>
      <div className="field"><label>Yakınlaştırma: {s.zoom.toFixed(2)}</label><input type="range" min={0.7} max={1.6} step={0.05} value={s.zoom} onChange={(e) => set({ zoom: Number(e.target.value) })} /></div>
      {/* müzik ve efekt sesi birbirinden bağımsız; yanındaki düğme yalnız o sesi kapatır/açar */}
      <div className="field"><label className="row" style={{ gap: 8 }}><span>Müzik (köy müziği ve ambiyans): {Math.round(s.music * 100)}</span><div className="spacer" /><button className="btn small" onClick={() => set({ music: s.music > 0 ? 0 : 0.5 })}>{s.music > 0 ? '🔇 Müziği kapat' : '🔊 Müziği aç'}</button></label><input type="range" min={0} max={1} step={0.05} value={s.music} onChange={(e) => set({ music: Number(e.target.value) })} /></div>
      <div className="field"><label className="row" style={{ gap: 8 }}><span>Efekt sesi (vuruş, adım, arayüz): {Math.round(s.sfx * 100)}</span><div className="spacer" /><button className="btn small" onClick={() => set({ sfx: s.sfx > 0 ? 0 : 0.7 })}>{s.sfx > 0 ? '🔇 Efektleri kapat' : '🔊 Efektleri aç'}</button></label><input type="range" min={0} max={1} step={0.05} value={s.sfx} onChange={(e) => set({ sfx: Number(e.target.value) })} /></div>
      <label className="row" style={{ fontSize: 14 }}><input type="checkbox" checked={s.showNames} onChange={(e) => set({ showNames: e.target.checked })} /> Oyuncu isimlerini göster</label>
      <label className="row" style={{ fontSize: 14, marginTop: 6 }}><input type="checkbox" checked={s.showDamage} onChange={(e) => set({ showDamage: e.target.checked })} /> Başkalarının hasar sayıları</label>
      <div className="row" style={{ marginTop: 14, gap: 8, flexWrap: 'wrap' }}>
        <InstallButton />
        <button className="btn small ghost" title="Karakter ve kanal seçimine döner" onClick={() => window.dispatchEvent(new Event('col-exit'))}>Kanal / karakter değiştir</button>
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 12 }}>Kısayollar: WASD/oklar yürü · Fare ile tıkla-yürü/hedef · Boşluk/1 saldır · 2-3-4 beceri · Q iksir · Z topla · Tab hedef değiştir · I çanta · C karakter · K beceri · T ışınlan · M harita · Enter sohbet</div>
    </Panel>
  );
}

function NpcDialog({ game }: { game: Game }) {
  const npc = useStore((s) => s.npc);
  if (!npc) return null;
  const labels: Record<string, string> = { upgrade: `Artı Bas (silah ve zırh, en çok +${MAX_PLUS})`, shop_smith: 'Demirci tezgâhı', shop_general: 'Erzak al', sell: 'Eşya sat', storage: 'Depo (yakında)', bank: 'Mücevher bankası (yakında)', craft: 'Üretim', teleport: 'Işınlan', dungeon: 'Seferler (yakında)', tower: 'Kadim Kule (Sv. 25+)', forge: 'Kor Kulesi (Sv. 10+)', evolve: 'Evrim (silah ve zırh)', mount: 'Binek görevi · Bineğim', fishing_shop: 'Olta al · Balık sat' };
  const act = (a: string) => {
    if (a === 'teleport') store.set({ panel: 'teleport' });
    else if (a === 'shop_general') store.set({ panel: 'shop', shop: 'general' });
    else if (a === 'shop_smith') store.set({ panel: 'shop', shop: 'smith' });
    else if (a === 'sell') store.set({ panel: 'shop', shop: 'sell' });
    else if (a === 'upgrade') store.set({ panel: 'upgrade' });
    else if (a === 'fishing_shop') store.set({ panel: 'fishshop' });
    else if (a === 'mount') store.set({ panel: 'mount' });
    else if (a === 'tower') store.set({ panel: 'tower' });
    else if (a === 'forge') store.set({ panel: 'forge' });
    else if (a === 'evolve') { upgradeTab.next = 'evrim'; store.set({ panel: 'upgrade' }); }
    else if (a === 'craft') store.set({ panel: 'craft' });
    else notify('Bu hizmet bir sonraki aşamada açılacak.', 'info');
  };
  const greet: Record<string, string> = {
    haso: 'Ocak sıcak, örs hazır. Silahını ya da zırhını getir; artısını +6\'ya kadar ben dövüp çıkarırım. Güçlü Dal, mühür ve biraz da Mücevher lazım.', rauf: 'Eşyaların bende emanet, bir tanesi bile kaybolmaz.', nur: 'Çekirdeğin ışığı seni dilediğin yere taşır.',
    tuccar: 'Yolculuğa iksirsiz çıkılmaz, yiğit!', pakize: 'İnce işçilik sabır ister. Malzemeni getir, sana ne üretebileceğimi göstereyim.', bekci: 'İki kulenin kapısını ben beklerim. Kor Kulesi\'nde Karademir\'in ocağı yanar; Kadim Kule\'nin zirvesinde Azrail bekler. Hangisine hazırsın?', arda: 'İyi bir binek, iyi bir dosttur.', hasan: 'Göl bugün cömert görünüyor.', kemal: 'Gölet küçük ama balığı bol!',
  };
  return (
    <div className="frame panel npcd" onPointerDown={(e) => e.stopPropagation()}>
      <div className="hd"><span className="title">{npc.name}</span><span className="muted" style={{ marginLeft: 8, fontSize: 12 }}>{npc.title}</span><button className="x" onClick={close}>✕</button></div>
      <div className="bd">
        <div className="npc-greet">“{greet[npc.id] ?? 'Hoş geldin, yolcu.'}”</div>
        <NpcQuests npc={npc.id} />
        <div className="npc-acts">{npc.actions.concat(npc.id === 'haso' ? ['sell'] : []).map((a) => <button key={a} className={'btn' + (a === 'upgrade' || a === 'forge' ? ' ember' : a === 'evolve' ? ' evo-act' : '')} onClick={() => act(a)}>{labels[a] ?? a}</button>)}</div>
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
      {!shop.products.length && (
        <div className="essm-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 14, marginBottom: 8 }}>Kırmızı İksir artık <b>Market</b>'te Öz ile satılıyor.</div>
          <button className="btn primary" onClick={() => store.set({ panel: 'essmarket', npc: null })}>Market'i aç</button>
        </div>
      )}
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

/** Demirci Haso: Artı Bas ve Dönüşüm sekmeleri. */
function Upgrade({ game }: { game: Game }) {
  const [mode, setMode] = useState<'arti' | 'donusum' | 'evrim'>(() => { const t = upgradeTab.next; upgradeTab.next = 'arti'; return t; });
  const tabs = (
    <div className="bag-tabs forge-tabs">
      <button className={mode === 'arti' ? 'on' : ''} onClick={() => setMode('arti')}>Artı Bas</button>
      <button className={mode === 'donusum' ? 'on' : ''} onClick={() => setMode('donusum')}>Dönüşüm <small className="uq">Eşsiz</small></button>
      <button className={mode === 'evrim' ? 'on' : ''} onClick={() => setMode('evrim')}>Evrim <small className="evo-tag">I · II · III</small></button>
    </div>
  );
  return mode === 'arti' ? <PlusForge game={game} tabs={tabs} /> : mode === 'evrim' ? <EvolveForge game={game} tabs={tabs} /> : <TransformForge game={game} tabs={tabs} />;
}
/** NPC menüsünden "Evrim" seçilince Haso paneli o sekmeyle açılır */
export const upgradeTab: { next: 'arti' | 'donusum' | 'evrim' } = { next: 'arti' };

/**
 * Haso · Evrim: silah ve zırh, kuşanılıp canavar öldürdükçe av sayar. Sayaç kademenin istediğine ulaşınca
 * Kor Kulesi malzemeleri ve Mücevherle evrilir (sayaç sıfırlanır). Silahta saldırı, zırhta savunma artar; her
 * kademede yeni efekt (III en görkemlisi). Bedeller yönetimden.
 */
function EvolveForge({ game, tabs }: { game: Game; tabs: React.ReactNode }) {
  const self = useStore((s) => s.self);
  const res = useStore((s) => s.evolveResult);
  const [sel, setSel] = useState<string | null>(null);
  const { tip, bind } = useTip();
  if (!self) return null;
  const E = TUNING.evo;
  const all = [...Object.values(self.equip).filter(Boolean) as ItemInstance[], ...self.bag];
  const slotOf = (i: ItemInstance) => ITEM_TPL.get(i.tpl)?.slot;
  const items = all.filter((i) => slotOf(i) === 'weapon' || slotOf(i) === 'armor').sort((a, b) => (b.evo ?? 0) - (a.evo ?? 0) || (b.kills ?? 0) - (a.kills ?? 0));
  const it = items.find((i) => i.id === sel) ?? null;
  const slot = it ? slotOf(it) as 'weapon' | 'armor' : null;
  const cur = it?.evo ?? 0;
  const max = cur >= EVO_TIERS;
  const st = slot && !max ? E[slot][cur] : null;
  const m = self.materials;
  const kills = it?.kills ?? 0;
  const lacks = st ? Object.entries(st.mats).filter(([k, q]) => (m[k] ?? 0) < q).length + (self.gems < st.gems ? 1 : 0) + (kills < st.kills ? 1 : 0) : 1;
  const equipped = new Set(Object.values(self.equip).map((x) => x?.id));
  const go = () => { if (!it) return; sfx.play('ui'); game.send({ t: 'evolve', item: it.id, req: reqId() }); };
  return (
    <Panel title="Demirci Haso · Evrim" width={820}>
      {tabs}
      {!E.enabled ? <div className="muted" style={{ padding: 20 }}>Evrim şu an kapalı.</div> : (
        <div className="forge evo">
          <div className="forge-pick">
            <div className="sect">Silah ve zırhların</div>
            <div className="bag">
              {items.map((i) => (
                <div key={i.id} className="evo-cell">
                  <Cell it={i} sel={sel === i.id} bind={bind(i)} label={equipped.has(i.id) ? 'Kuşanılı' : undefined} onClick={() => setSel(i.id)} />
                  {(i.evo ?? 0) > 0 && <span className="evo-pip" style={{ color: EVO_COLORS[Math.min(3, i.evo ?? 0)] }}>{'◆'.repeat(i.evo ?? 0)}</span>}
                </div>
              ))}
              {items.length === 0 && <div className="muted" style={{ gridColumn: '1 / -1', fontSize: 13 }}>Çantanda ya da üzerinde silah veya zırh yok.</div>}
            </div>
            <div className="sect" style={{ marginTop: 6 }}>Nasıl evrilir?</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Silahın ve zırhın <b>kuşanılıyken</b> öldürdüğün her canavarı sayar{E.maxGap ? ` (senden ${E.maxGap} seviyeden fazla düşük canavarlar sayılmaz)` : ''}. Sayaç dolunca
              <b> Kor Kulesi</b> malzemeleri ve Mücevherle bir üst kademeye geçer; sayaç sıfırlanır. Artı, efsun ve nadirlik korunur.
            </div>
            <div className="evo-ladder">
              {[0, 1, 2].map((k) => (
                <div key={k} className={'st' + (it && cur > k ? ' done' : it && cur === k ? ' now' : '')} style={{ ['--ec' as string]: EVO_COLORS[k + 1] }}>
                  <b>{['I', 'II', 'III'][k]}</b><span>{EVO_NAMES[k + 1]}</span>
                  <small>{slot ? `${slot === 'weapon' ? 'Saldırı' : 'Savunma'} +%${E[slot][k].pct}` : `Silah +%${E.weapon[k].pct} · Zırh +%${E.armor[k].pct}`}</small>
                </div>
              ))}
            </div>
          </div>
          <div className="anvil">
            <div key={res?.at ?? 0} className={'forge-fx evo-hit' + (res && res.item === it?.id ? ' hit e' + res.evo : '')} />
            {!it ? <div className="muted" style={{ textAlign: 'center', padding: '40px 10px' }}>Evriltmek için soldan bir silah ya da zırh seç.</div> : (
              <>
                <div className="stage">
                  <Cell it={it} bind={bind(it)} />
                  {!max && <><span className="arrow">›</span><Cell it={{ ...it, evo: cur + 1, kills: 0 }} /></>}
                </div>
                <div className="nm" style={{ color: RARITY[it.rarity].color }}>{itemDisplayName(it)}</div>
                <div className="evo-tier" style={{ color: max ? EVO_COLORS[3] : EVO_COLORS[cur + 1] }}>{max ? `Son kademe · ${EVO_NAMES[3]}` : `${cur + 1}. Evrim · ${EVO_NAMES[cur + 1]}`}</div>
                {max ? <div className="ok" style={{ textAlign: 'center' }}>Bu eşya evrimin son kademesinde. Altın efekti seninle!</div> : st && (
                  <>
                    <div className="evo-kills">
                      <div className="lb"><span>Evrim avı</span><b>{kills.toLocaleString('tr-TR')} / {st.kills.toLocaleString('tr-TR')}</b></div>
                      <div className="tw-bar"><i style={{ width: `${Math.min(1, kills / Math.max(1, st.kills)) * 100}%`, background: EVO_COLORS[cur + 1] }} /></div>
                      {!equipped.has(it.id) && <div className="muted" style={{ fontSize: 11 }}>Bu eşya kuşanılı değil: av sayması için kuşan.</div>}
                    </div>
                    <div className="gain"><span>{slot === 'weapon' ? 'Saldırı' : 'Savunma'} {itemPower(it)} → <b style={{ color: EVO_COLORS[cur + 1] }}>{itemPower({ ...it, evo: cur + 1 })}</b></span></div>
                    <div className="req">
                      {Object.entries(st.mats).map(([k, q]) => {
                        const have = m[k] ?? 0, md = MATERIAL.get(k);
                        return <div key={k} className={'r ' + (have >= q ? 'have' : 'miss')} title={md?.desc}><img src={iconUrl(md?.icon ?? 'bag')} alt="" />{md?.name ?? k}<span className="q">{have.toLocaleString('tr-TR')} / {q}</span></div>;
                      })}
                      {st.gems > 0 && <div className={'r ' + (self.gems >= st.gems ? 'have' : 'miss')}><img src={iconUrl('gem')} alt="" />Mücevher<span className="q">{self.gems.toLocaleString('tr-TR')} / {st.gems.toLocaleString('tr-TR')}</span></div>}
                    </div>
                    <button className="btn ember evo-btn" style={{ width: '100%', padding: 12, fontSize: 15, ['--ec' as string]: EVO_COLORS[cur + 1] }} disabled={lacks > 0} onClick={go}>{lacks > 0 ? (kills < st.kills ? 'Av sayısı yetmiyor' : 'Malzeme eksik') : `Evrilt · ${EVO_NAMES[cur + 1]}`}</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}

/** Haso · Dönüşüm: ekipmanı Eşsiz'e çevirir; artı ve evrim korunur, efsunlar silinir. Bedeller yönetimden. */
function TransformForge({ game, tabs }: { game: Game; tabs: React.ReactNode }) {
  const self = useStore((s) => s.self);
  const res = useStore((s) => s.transformResult);
  const [sel, setSel] = useState<string | null>(null);
  const { tip, bind } = useTip();
  if (!self) return null;
  const conf = transformConf();
  const all = [...Object.values(self.equip).filter(Boolean) as ItemInstance[], ...self.bag];
  const items = all.filter((i) => transformGroup(i) && i.rarity !== 'unique' && conf.from.includes(i.rarity));
  const it = items.find((i) => i.id === sel) ?? (res?.ok ? all.find((i) => i.id === res.item) ?? null : null);
  const g = it ? transformGroup(it) : null;
  const cost = g ? conf.cost[g] : null;
  const m = self.materials;
  const lacks = cost ? Object.entries(cost.mats).filter(([k, q]) => (m[k] ?? 0) < q).length + (self.gems < cost.gems ? 1 : 0) + (self.level < cost.minLevel ? 1 : 0) + (it && it.plus < cost.minPlus ? 1 : 0) : 1;
  const done = it?.rarity === 'unique';
  const after = it && !done ? itemPower({ ...it, rarity: 'unique' }) : 0;
  const go = () => { if (!it) return; sfx.play('ui'); game.send({ t: 'transform', item: it.id, req: reqId() }); };
  return (
    <Panel title="Demirci Haso · Dönüşüm" width={820}>
      {tabs}
      {!conf.enabled ? <div className="muted" style={{ padding: 20 }}>Dönüşüm şu an kapalı.</div> : (
        <div className="forge">
          <div className="forge-pick">
            <div className="sect">Dönüşebilecek eşyalar ({conf.from.map((r) => RARITY[r].name).join(', ')})</div>
            <div className="bag">
              {items.map((i) => <Cell key={i.id} it={i} sel={sel === i.id} bind={bind(i)} onClick={() => setSel(i.id)} />)}
              {items.length === 0 && <div className="muted" style={{ gridColumn: '1 / -1', fontSize: 13 }}>Çantanda ya da üzerinde dönüşebilecek ekipman yok.</div>}
            </div>
            <div className="sect" style={{ marginTop: 6 }}>Kurallar</div>
            <div className="muted" style={{ fontSize: 12, lineHeight: 1.5 }}>
              Silah, zırh, miğfer, takılar ve çizme <b style={{ color: RARITY.unique.color }}>Eşsiz</b>'e dönüşür. <b>Artı ve evrim kalır, efsunlar silinir</b>; güç artar.
              Eşsiz silah ve zırh altın parıltı ve hafif duman saçar. Başarısızlıkta eşya bozulmaz, yalnız bedel gider.
            </div>
          </div>
          <div className="anvil">
            <div key={res?.at ?? 0} className={'forge-fx' + (res?.ok ? ' hit uq' : '')} />
            {!it ? <div className="muted" style={{ textAlign: 'center', padding: '40px 10px' }}>Dönüştürmek için soldan bir eşya seç.</div> : (
              <>
                <div className="stage">
                  <Cell it={it} bind={bind(it)} />
                  <span className="arrow">›</span>
                  <Cell it={{ ...it, rarity: 'unique' }} />
                </div>
                <div className="nm" style={{ color: RARITY[done ? 'unique' : it.rarity].color }}>{itemDisplayName(it)}</div>
                {done ? <div className="ok" style={{ textAlign: 'center' }}>Eşsiz'e dönüştü! Artısı korundu, efsunları silindi.</div> : cost && (
                  <>
                    <div className="gain"><span>{g === 'weapon' ? 'Saldırı' : 'Savunma'} {itemPower(it)} → <b style={{ color: RARITY.unique.color }}>{after}</b></span>{cost.chance < 100 && <span> · Başarı %{cost.chance}</span>}</div>
                    <div className="req">
                      {Object.entries(cost.mats).map(([k, q]) => {
                        const have = m[k] ?? 0, md = MATERIAL.get(k);
                        return <div key={k} className={'r ' + (have >= q ? 'have' : 'miss')} title={md?.desc}><img src={iconUrl(md?.icon ?? 'bag')} alt="" />{md?.name ?? k}<span className="q">{have.toLocaleString('tr-TR')} / {q}</span></div>;
                      })}
                      <div className={'r ' + (self.gems >= cost.gems ? 'have' : 'miss')}><img src={iconUrl('gem')} alt="" />Mücevher<span className="q">{self.gems.toLocaleString('tr-TR')} / {cost.gems.toLocaleString('tr-TR')}</span></div>
                      {cost.minPlus > 0 && <div className={'r ' + (it.plus >= cost.minPlus ? 'have' : 'miss')}>En az artı<span className="q">+{it.plus} / +{cost.minPlus}</span></div>}
                      {cost.minLevel > 1 && <div className={'r ' + (self.level >= cost.minLevel ? 'have' : 'miss')}>Seviye<span className="q">{self.level} / {cost.minLevel}</span></div>}
                    </div>
                    <button className="btn ember uq-btn" style={{ width: '100%', padding: 12, fontSize: 15 }} disabled={lacks > 0} onClick={go}>{lacks > 0 ? 'Gereksinim eksik' : 'Dönüştür · Eşsiz'}</button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      )}
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}

/** Demirci: silah ve zırhı +6'ya kadar güçlendirir. Malzeme, Mücevher ve şans yönetim panelinden gelir. */
function PlusForge({ game, tabs }: { game: Game; tabs: React.ReactNode }) {
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
      {tabs}
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

/** Ayarlar: oyunu telefonun ana ekranına uygulama gibi ekler (yalnız tarayıcı izin verdiğinde görünür). */
function InstallButton() {
  const [, bump] = useState(0);
  useEffect(() => onInstallChange(() => bump((n) => n + 1)), []);
  if (!installAvailable()) return null;
  return <button className="btn small" title="Adres çubuğu olmadan, tam ekran açılır" onClick={() => { void promptInstall(); }}>Ana ekrana ekle</button>;
}
