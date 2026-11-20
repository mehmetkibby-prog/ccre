/**
 * Depo (Depocu Rauf'un evi): eşya, malzeme, Nesne Market eşyası, Mücevher ve Öz bırakılır/alınır.
 * Sunucu her işlemden sonra deponun güncel hâlini yollar (store.storage); çanta zaten self'ten gelir.
 * Eşyaya dokun/tıkla → seç → "Depoya koy" / "Çantaya al" (bilgisayarda çift tıkla da taşınır).
 */
import { useEffect, useState } from 'react';
import { MATERIAL, MALL, STORAGE_PAGE_SLOTS, STORAGE_MAX_PAGES, itemDisplayName, RARITY, type ItemInstance } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { Panel, Cell, useTip, ItemTip } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';
import { matName, matIcon } from './craft.tsx';
import { sfx } from '../game/audio.ts';

type Tab = 'esya' | 'malzeme' | 'market' | 'para';
/** NPC'den açılırken başlangıç sekmesi ("Mücevher ve Öz deposu" para sekmesini açar) */
export const storageTab: { next: Tab } = { next: 'esya' };
const send = (c: Record<string, unknown>) => currentGame?.send({ t: 'storage', ...c } as never);

export function StoragePanel() {
  const self = useStore((s) => s.self);
  const st = useStore((s) => s.storage);
  const [tab, setTab] = useState<Tab>(() => { const t = storageTab.next; storageTab.next = 'esya'; return t; });
  const [page, setPage] = useState(0);
  const [sel, setSel] = useState<{ side: 'bag' | 'dep'; id: string } | null>(null);
  const [stack, setStack] = useState<{ side: 'bag' | 'dep'; key: string } | null>(null);
  const { tip, bind, clear } = useTip();
  useEffect(() => { store.set({ storage: null }); send({ op: 'open' }); }, []);
  if (!self) return null;
  if (!st) return <Panel title="Depo · Depocu Rauf" width={860}><div className="muted" style={{ padding: 30, textAlign: 'center' }}>Depo açılıyor…</div></Panel>;
  if (st.far) return <Panel title="Depo · Depocu Rauf" width={520}><div className="dep-far"><img src={iconUrl('chest')} alt="" /><b>Depo, Depocu Rauf'un evinde.</b><span>Pazar Köyü'nde Rauf'un yanına git, onunla konuşup "Depo"yu seç. Eşyaların, malzemelerin, Mücevher ve Öz'ün orada güvende.</span></div></Panel>;

  const pages = st.pages, cap = st.cap;
  const used = st.items.length;
  const pageItems = st.items.slice(page * STORAGE_PAGE_SLOTS, (page + 1) * STORAGE_PAGE_SLOTS);
  const move = (side: 'bag' | 'dep', id: string) => { send({ op: side === 'bag' ? 'put_item' : 'take_item', id }); sfx.play('ui'); setSel(null); clear(); };
  const isMall = (k: string) => MALL.has(k);
  const bagStacks = Object.entries(self.materials).filter(([k, n]) => n > 0 && (tab === 'market' ? isMall(k) : !isMall(k) && MATERIAL.has(k)));
  const depStacks = Object.entries(st.mats).filter(([k, n]) => n > 0 && (tab === 'market' ? isMall(k) : !isMall(k)));
  const selItem = sel ? (sel.side === 'bag' ? self.bag : st.items).find((x) => x.id === sel.id) : undefined;

  const Grid = ({ items, side, slots }: { items: ItemInstance[]; side: 'bag' | 'dep'; slots: number }) => (
    <div className="dep-grid">
      {Array.from({ length: Math.max(slots, items.length) }, (_, i) => {
        const it = items[i];
        if (!it) return <div key={'e' + i} className="cell dep-empty" />;
        return (
          <div key={it.id} onDoubleClick={() => move(side, it.id)}>
            <Cell it={it} sel={sel?.id === it.id} bind={bind(it)} onClick={() => setSel(sel?.id === it.id ? null : { side, id: it.id })} />
          </div>
        );
      })}
    </div>
  );

  return (
    <Panel title="Depo · Depocu Rauf" width={880}>
      <div className="dep-head">
        <div className="dep-rauf"><img src={iconUrl('chest')} alt="" /></div>
        <div className="dep-say">“Ne bırakırsan bırak, bende emanet. Bir tanesi bile kaybolmaz.”<small>Eşyaya dokun ya da tıkla, sonra taşı. Bilgisayarda çift tıklamak da yeter.</small></div>
        <div className="dep-cap"><b>{used}</b> / {cap}<small>eşya bölmesi</small></div>
      </div>
      <div className="dep-tabs">
        {([['esya', 'Eşyalar'], ['malzeme', 'Malzemeler'], ['market', 'Nesne Market'], ['para', 'Mücevher ve Öz']] as [Tab, string][]).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => { setTab(k); setSel(null); setStack(null); clear(); }}>{l}</button>
        ))}
      </div>

      {tab === 'esya' && (
        <div className="dep-cols">
          <section className="dep-side">
            <div className="dep-sh"><b>Çantan</b><small>{self.bag.length} eşya</small></div>
            <Grid items={self.bag} side="bag" slots={0} />
            {self.bag.length === 0 && <div className="muted dep-none">Çantanda eşya yok.</div>}
          </section>
          <div className="dep-mid">
            {selItem ? (
              <>
                <div className="dep-selnm" style={{ color: RARITY[selItem.rarity].color }}>{itemDisplayName(selItem)}</div>
                {sel!.side === 'bag'
                  ? <button className="btn primary dep-mv" disabled={used >= cap} onClick={() => move('bag', selItem.id)}>Depoya koy ›</button>
                  : <button className="btn green dep-mv" disabled={self.bag.length >= 35} onClick={() => move('dep', selItem.id)}>‹ Çantaya al</button>}
                {sel!.side === 'bag' && used >= cap && <small className="bad">Depo dolu</small>}
              </>
            ) : <div className="muted dep-hint">Bir eşya seç</div>}
          </div>
          <section className="dep-side dep-vault">
            <div className="dep-sh"><b>Depo</b>
              <div className="dep-pages">
                {Array.from({ length: pages }, (_, i) => <button key={i} className={page === i ? 'on' : ''} onClick={() => { setPage(i); setSel(null); }}>{i + 1}</button>)}
                {pages < STORAGE_MAX_PAGES && <span className="dep-lock" title="Nesne Market'teki Ek Depo Sayfası ile açılır">+</span>}
              </div>
            </div>
            <Grid items={pageItems} side="dep" slots={STORAGE_PAGE_SLOTS} />
            {pages < STORAGE_MAX_PAGES && <div className="muted dep-more">Daha fazla yer: Nesne Market → <b>Ek Depo Sayfası</b> (24 bölme)</div>}
          </section>
        </div>
      )}

      {(tab === 'malzeme' || tab === 'market') && (
        <div className="dep-cols">
          <section className="dep-side">
            <div className="dep-sh"><b>Çantan</b></div>
            <div className="dep-stacks">
              {bagStacks.length === 0 && <div className="muted dep-none">{tab === 'market' ? 'Çantanda Nesne Market eşyası yok.' : 'Çantanda malzeme yok.'}</div>}
              {bagStacks.map(([k, n]) => <button key={k} className={'dep-stk' + (stack?.side === 'bag' && stack.key === k ? ' on' : '')} onClick={() => setStack({ side: 'bag', key: k })}><img src={iconUrl(matIcon(k))} alt="" /><span>{matName(k)}</span><b>{n.toLocaleString('tr-TR')}</b></button>)}
            </div>
          </section>
          <div className="dep-mid">
            {stack ? <QtyMover k={stack.key} max={(stack.side === 'bag' ? self.materials[stack.key] : st.mats[stack.key]) ?? 0} side={stack.side} onDone={() => setStack(null)} /> : <div className="muted dep-hint">Bir yığın seç</div>}
          </div>
          <section className="dep-side dep-vault">
            <div className="dep-sh"><b>Depo</b><small>yığınlar bölme kaplamaz</small></div>
            <div className="dep-stacks">
              {depStacks.length === 0 && <div className="muted dep-none">Depoda yok.</div>}
              {depStacks.map(([k, n]) => <button key={k} className={'dep-stk' + (stack?.side === 'dep' && stack.key === k ? ' on' : '')} onClick={() => setStack({ side: 'dep', key: k })}><img src={iconUrl(matIcon(k))} alt="" /><span>{matName(k)}</span><b>{n.toLocaleString('tr-TR')}</b></button>)}
            </div>
          </section>
        </div>
      )}

      {tab === 'para' && (
        <div className="dep-money">
          <CurCard cur="gems" name="Mücevher" icon="gem" have={self.gems} kept={st.gems} />
          <CurCard cur="essence" name="Yaşam Özü" icon="essence" have={self.essence} kept={st.essence} />
        </div>
      )}
      {tip && <ItemTip {...tip} />}
    </Panel>
  );
}

function QtyMover({ k, max, side, onDone }: { k: string; max: number; side: 'bag' | 'dep'; onDone: () => void }) {
  const [n, setN] = useState(max);
  useEffect(() => { setN(max); }, [k, side, max]);
  if (max <= 0) return <div className="muted dep-hint">Kalmadı</div>;
  const go = () => { send({ op: side === 'bag' ? 'put_mat' : 'take_mat', key: k, n }); sfx.play('ui'); onDone(); };
  return (
    <div className="dep-qty">
      <img src={iconUrl(matIcon(k))} alt="" />
      <div className="dep-selnm">{matName(k)}</div>
      <div className="dep-num"><button onClick={() => setN(Math.max(1, n - 1))}>−</button><input type="number" min={1} max={max} value={n} onChange={(e) => setN(Math.max(1, Math.min(max, Math.floor(Number(e.target.value) || 1))))} /><button onClick={() => setN(Math.min(max, n + 1))}>+</button></div>
      <div className="dep-quick">{[1, 10, 100].filter((q) => q < max).map((q) => <button key={q} onClick={() => setN(q)}>{q}</button>)}<button onClick={() => setN(max)}>Tümü</button></div>
      <button className={'btn dep-mv ' + (side === 'bag' ? 'primary' : 'green')} onClick={go}>{side === 'bag' ? `${n.toLocaleString('tr-TR')} tane depoya koy ›` : `‹ ${n.toLocaleString('tr-TR')} tane çantaya al`}</button>
    </div>
  );
}

function CurCard({ cur, name, icon, have, kept }: { cur: 'gems' | 'essence'; name: string; icon: string; have: number; kept: number }) {
  const [amt, setAmt] = useState('');
  const n = Math.max(0, Math.floor(Number(amt) || 0));
  const act = (op: 'put_cur' | 'take_cur', q: number) => { if (q <= 0) return; send({ op, cur, n: q }); sfx.play('ui'); setAmt(''); };
  return (
    <div className={'dep-cur ' + cur}>
      <div className="dep-cur-hd"><img src={iconUrl(icon)} alt="" /><b>{name}</b></div>
      <div className="dep-cur-row"><span>Üzerinde</span><b>{have.toLocaleString('tr-TR')}</b></div>
      <div className="dep-cur-row vault"><span>Depoda</span><b>{kept.toLocaleString('tr-TR')}</b></div>
      <input type="number" min={0} placeholder="Miktar" value={amt} onChange={(e) => setAmt(e.target.value)} />
      <div className="dep-cur-btns">
        <button className="btn primary" disabled={n <= 0 || n > have} onClick={() => act('put_cur', n)}>Yatır</button>
        <button className="btn green" disabled={n <= 0 || n > kept} onClick={() => act('take_cur', n)}>Çek</button>
      </div>
      <div className="dep-quick">
        <button disabled={have <= 0} onClick={() => act('put_cur', have)}>Hepsini yatır</button>
        <button disabled={kept <= 0} onClick={() => act('take_cur', kept)}>Hepsini çek</button>
      </div>
    </div>
  );
}

/** sunucudan gelen depo durumu */
export function onStorageMsg(m: { items?: ItemInstance[]; mats?: Record<string, number>; gems?: number; essence?: number; pages?: number; cap?: number }) {
  store.set({ storage: { items: Array.isArray(m.items) ? m.items : [], mats: m.mats ?? {}, gems: m.gems ?? 0, essence: m.essence ?? 0, pages: m.pages ?? 2, cap: m.cap ?? 48 } });
}
