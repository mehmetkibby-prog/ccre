import React, { useEffect, useState } from 'react';
import { RARITY, itemDisplayName, CLASSES, MOUNT, type ClassId, type ItemInstance } from '@col/shared';
import { store, useStore, pmOpen, pmSet, type PmConv } from '../game/store.ts';
import { Cell, Panel, ItemTip, useTip } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { api } from '../api.ts';
import { iconUrl } from '../game/art/icons.ts';
import { ClassIcon } from './icons.tsx';

/**
 * Oyuncular arası arayüz: sağ tık (telefonda uzun basma) menüsü, davet kartları, grup çerçevesi, güvenli ticaret
 * penceresi ve arkadaş listesi. Bütün kararlar sunucuda doğrulanır; burası yalnız istek gönderir ve durumu gösterir.
 */
const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const KIND: Record<string, string> = { party: 'grubuna katılmaya', trade: 'ticarete', duel: 'düelloya', friend: 'arkadaş olmaya' };

export function openWhisper(name: string) {
  pmOpen(name);
  setTimeout(() => (document.getElementById('pm-in-' + name) as HTMLInputElement | null)?.focus(), 40);
}

/**
 * Fısıltı pencereleri: her konuşma ayrı pencere (başlıktan sürüklenir), küçültülünce zarf simgesine döner
 * (okunmamış sayısıyla yanıp söner), ✕ ile kapanır. Telefonda tek pencere alttan açılır; zarflar sol kenarda.
 */
export function WhisperWindows() {
  const pms = useStore((s) => s.pms);
  const me = useStore((s) => s.char?.name ?? '');
  const mobile = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const open = pms.filter((c) => c.open).sort((a, b) => a.z - b.z);
  const shown = mobile ? open.slice(-1) : open.slice(-3);
  const mini = pms.filter((c) => !c.open || !shown.includes(c));
  return (
    <>
      {mini.length > 0 && (
        <div className="pm-dock">
          {mini.map((c) => (
            <button key={c.name} className={'pm-env' + (c.unread ? ' new' : '')} title={`${c.name} ile fısıltı`} onClick={() => pmSet(c.name, { open: true })}>
              <span className="ic">✉</span><span className="nm">{c.name}</span>{c.unread > 0 && <b>{c.unread}</b>}
            </button>
          ))}
        </div>
      )}
      {shown.map((c, i) => <WhisperWindow key={c.name} c={c} me={me} idx={i} mobile={mobile} />)}
    </>
  );
}
function WhisperWindow({ c, me, idx, mobile }: { c: PmConv; me: string; idx: number; mobile: boolean }) {
  const [text, setText] = useState('');
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const box = React.useRef<HTMLDivElement>(null);
  const list = React.useRef<HTMLDivElement>(null);
  useEffect(() => { list.current?.scrollTo({ top: 1e9 }); }, [c.msgs.length]);
  const sendMsg = () => { const t = text.trim(); if (!t) return; currentGame?.send({ t: 'chat', ch: 'pm', to: c.name, text: t } as never); setText(''); };
  const drag = (e: React.PointerEvent) => {
    if (mobile || !box.current) return;
    const r = box.current.getBoundingClientRect(), ox = e.clientX - r.left, oy = e.clientY - r.top;
    const mv = (ev: PointerEvent) => setPos({ x: Math.max(0, Math.min(innerWidth - r.width, ev.clientX - ox)), y: Math.max(0, Math.min(innerHeight - 60, ev.clientY - oy)) });
    const up = () => { removeEventListener('pointermove', mv); removeEventListener('pointerup', up); };
    addEventListener('pointermove', mv); addEventListener('pointerup', up);
  };
  const style: React.CSSProperties = mobile ? {} : pos ? { left: pos.x, top: pos.y } : { left: `calc(50% - 450px + ${idx * 300}px)`, bottom: 150 };
  return (
    <div ref={box} className={'pm-win' + (mobile ? ' mob' : '')} style={{ ...style, zIndex: 40 + c.z % 50 }} onPointerDown={() => pmSet(c.name, { open: true })}>
      <div className="pm-h" onPointerDown={drag}>
        <span>✉ {c.name}</span>
        <button title="Küçült" onPointerDown={(e) => e.stopPropagation()} onClick={() => pmSet(c.name, { open: false })}>–</button>
        <button title="Kapat" onPointerDown={(e) => e.stopPropagation()} onClick={() => pmSet(c.name, null)}>✕</button>
      </div>
      <div className="pm-msgs" ref={list}>
        {!c.msgs.length && <div className="muted" style={{ fontSize: 12, padding: 6 }}>{c.name} adlı oyuncuya fısıltı yaz. Yalnız ikiniz görürsünüz.</div>}
        {c.msgs.map((m, i) => <div key={i} className={'pm-m' + (m.me ? ' me' : '')}><b>{m.me ? me : c.name}</b>{m.text}</div>)}
      </div>
      <form className="pm-in" onSubmit={(e) => { e.preventDefault(); sendMsg(); }}>
        <input id={'pm-in-' + c.name} value={text} maxLength={200} placeholder="Mesaj yaz…" onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.stopPropagation()} />
        <button className="btn small primary" type="submit">Gönder</button>
      </form>
    </div>
  );
}

/** Oyuncu menüsü: fısıltı, ticaret, düello, arkadaşlık, grup. */
export function PlayerMenu() {
  const m = useStore((s) => s.playerMenu);
  const party = useStore((s) => s.party);
  const me = useStore((s) => s.char?.id ?? 0);
  const myGuild = useStore((s) => s.guild?.g);
  useEffect(() => {
    if (!m) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.pmenu')) store.set({ playerMenu: null }); };
    const t = setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', close); };
  }, [m]);
  if (!m) return null;
  const inv = (kind: string) => { send({ t: 'social', op: 'invite', kind, target: m.id }); store.set({ playerMenu: null }); };
  const member = party.members.find((x) => x.eid === m.id);
  // lonca daveti: lider/subaysan ve hedef bir loncada değilse
  const targetGuild = currentGame?.ents.get(m.id)?.guild;
  const x = Math.min(m.x, window.innerWidth - 200), y = Math.min(m.y, window.innerHeight - 260);
  return (
    <div className="pmenu" style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      <div className="pm-h">{m.name}</div>
      <button onClick={() => { openWhisper(m.name); store.set({ playerMenu: null }); }}>💬 Fısıltı (sohbet)</button>
      <button onClick={() => inv('trade')}>🤝 Ticaret</button>
      <button onClick={() => inv('duel')}>⚔ Düello</button>
      <button onClick={() => inv('friend')}>★ Arkadaş ekle</button>
      {member ? (party.leader === me && <button onClick={() => { send({ t: 'party', op: 'kick', target: member.id }); store.set({ playerMenu: null }); }}>✕ Gruptan çıkar</button>)
        : <button onClick={() => inv('party')}>👥 Gruba davet et</button>}
      {myGuild && myGuild.myRank >= 1 && !targetGuild && <button onClick={() => { send({ t: 'guild', op: 'invite', name: m.name }); store.set({ playerMenu: null }); }}>🛡 Loncaya davet et</button>}
    </div>
  );
}

/** Gelen davetler (30 sn içinde yanıtlanır). */
export function InviteCards() {
  const list = useStore((s) => s.invites);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => { tick((x) => x + 1); const now = Date.now(); const keep = store.get().invites.filter((i) => now - i.at < 30_000); if (keep.length !== store.get().invites.length) store.set({ invites: keep }); }, 1000); return () => clearInterval(iv); }, []);
  if (!list.length) return null;
  const answer = (i: (typeof list)[number], accept: boolean) => { send({ t: 'social', op: 'answer', kind: i.kind, from: i.from, accept }); store.set((s) => ({ invites: s.invites.filter((x) => x !== i) })); };
  return (
    <div className="invites">
      {list.map((i) => (
        <div key={i.kind + i.from} className="invite">
          <div><b>{i.name}</b> <small>Sv. {i.level} {CLASSES[i.cls as ClassId]?.name ?? ''}</small></div>
          <div className="iv-t">seni {KIND[i.kind]} çağırıyor <small>({Math.max(0, 30 - Math.floor((Date.now() - i.at) / 1000))} sn)</small></div>
          <div className="row"><button className="btn small primary" onClick={() => answer(i, true)}>Kabul et</button><button className="btn small" onClick={() => answer(i, false)}>Reddet</button></div>
        </div>
      ))}
    </div>
  );
}

/** Grup çerçevesi: üyelerin canı, lider tacı, gruptan ayrılma. */
export function PartyFrame() {
  const party = useStore((s) => s.party);
  const me = useStore((s) => s.char?.id ?? 0);
  if (party.members.length < 2) return null;
  return (
    <div className="partyframe">
      <div className="pf-h">Grup <button className="pf-leave" onClick={() => send({ t: 'party', op: 'leave' })}>Ayrıl</button></div>
      {party.members.filter((m) => m.id !== me).map((m) => (
        <div key={m.id} className={'pf-m' + (m.dead ? ' dead' : '') + (m.eid ? '' : ' away')} onClick={() => m.eid && currentGame?.setTarget(m.eid)}>
          <div className="pf-n">{party.leader === m.id && <span className="crown">♛</span>}{m.name} <small>Sv. {m.level}</small></div>
          <div className="pf-bar"><i style={{ width: `${Math.max(0, Math.min(1, m.hp / Math.max(1, m.maxHp))) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

/** Güvenli ticaret: teklif → iki taraf kilitler → iki taraf onaylar. Teklif değişirse kilitler düşer. */
export function TradeWindow() {
  const tr = useStore((s) => s.trade);
  const self = useStore((s) => s.self);
  const [pick, setPick] = useState(false);
  const [gems, setGems] = useState('');
  // eşya bilgisi: farede üstüne gelince; dokunmatikte dokununca sabit kart (+ "Teklife ekle")
  const { tip, bind } = useTip();
  const [touchPick, setTouchPick] = useState<ItemInstance | null>(null);
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  useEffect(() => { if (tr) setGems(String(tr.me.gems || '')); }, [tr?.me.gems]);
  if (!tr || !self) return null;
  const myIds = tr.me.items.map((i) => i.id);
  const setOffer = (ids: string[], g = Number(gems) || 0) => send({ t: 'trade', op: 'set', items: ids, gems: g });
  const Side = ({ title, s, mine }: { title: string; s: typeof tr.me; mine: boolean }) => (
    <div className={'tr-side' + (s.ok ? ' ok' : s.locked ? ' locked' : '')}>
      <div className="tr-h">{title} <span className="tr-st">{s.ok ? '✔ Onayladı' : s.locked ? '🔒 Kilitledi' : 'Hazırlanıyor'}</span></div>
      <div className="tr-items">
        {s.items.map((it: ItemInstance) => <div key={it.id} className="tr-it"><Cell it={it} bind={bind(it)} /><span style={{ color: RARITY[it.rarity]?.color }}>{itemDisplayName(it)}</span>{mine && <em title="Tekliften çıkar" onClick={() => setOffer(myIds.filter((x) => x !== it.id))}>✕</em>}</div>)}
        {!s.items.length && <div className="muted" style={{ fontSize: 12 }}>Eşya yok</div>}
      </div>
      <div className="tr-gems">💎 {s.gems.toLocaleString('tr-TR')} mücevher</div>
    </div>
  );
  return (
    <div className="trade-wrap">
      <div className="trade frame">
        <div className="tr-title">Ticaret · {tr.with}<button className="close" onClick={() => send({ t: 'trade', op: 'cancel' })}>✕</button></div>
        <div className="tr-cols">
          <Side title="Senin teklifin" s={tr.me} mine />
          <Side title={`${tr.with} teklifi`} s={tr.them} mine={false} />
        </div>
        <div className="tr-ctl">
          <button className="btn small" onClick={() => setPick(!pick)}>{pick ? 'Çantayı kapat' : '+ Çantadan eşya ekle'}</button>
          <label className="tr-g">💎 <input inputMode="numeric" value={gems} placeholder="0" onChange={(e) => setGems(e.target.value.replace(/\D/g, '').slice(0, 10))} onBlur={() => setOffer(myIds)} onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') setOffer(myIds); }} /></label>
        </div>
        {pick && <div className="tr-bag">{self.bag.filter((it) => !myIds.includes(it.id) && !it.locked).map((it) => <div key={it.id}><Cell it={it} bind={touch ? {} : bind(it)} onClick={() => (touch ? setTouchPick(it) : setOffer([...myIds, it.id]))} /></div>)}</div>}
        {pick && <div className="muted" style={{ fontSize: 11 }}>{touch ? 'Eşyaya dokun: özelliklerini gör, sonra "Teklife ekle".' : 'Eşyanın üstüne gel: özellikleri görünür. Tıkla: teklife ekle.'}</div>}
        <div className="muted" style={{ fontSize: 11 }}>İki taraf da önce kilitler, sonra onaylar. Teklif değişirse kilitler açılır. Kilitli (🔒) eşyalar takas edilemez.</div>
        {tip && <ItemTip {...tip} />}
        {touchPick && (
          <>
            <ItemTip it={touchPick} x={0} y={0} pinned onClose={() => setTouchPick(null)} />
            <div className="tr-pickbar"><button className="btn primary" onClick={() => { setOffer([...myIds, touchPick.id]); setTouchPick(null); }}>Teklife ekle</button><button className="btn" onClick={() => setTouchPick(null)}>Vazgeç</button></div>
          </>
        )}
        <div className="row tr-btns">
          <button className="btn" disabled={tr.me.locked} onClick={() => send({ t: 'trade', op: 'lock' })}>{tr.me.locked ? '🔒 Kilitlendi' : 'Kilitle'}</button>
          <button className="btn primary" disabled={!tr.me.locked || !tr.them.locked || tr.me.ok} onClick={() => send({ t: 'trade', op: 'confirm' })}>{tr.me.ok ? 'Bekleniyor…' : 'Onayla'}</button>
          <button className="btn" onClick={() => send({ t: 'trade', op: 'cancel' })}>İptal</button>
        </div>
      </div>
    </div>
  );
}

/** Savaş Arenası: üstte geri sayım + Katıl/Ayrıl; arenadayken sağda canlı sıralama. */
export function ArenaHud() {
  const a = useStore((s) => s.arena);
  const map = useStore((s) => s.map);
  const me = useStore((s) => s.char?.name ?? '');
  const skew = useStore((s) => s.clockSkew);
  const [, tick] = useState(0);
  useEffect(() => { const iv = setInterval(() => tick((x) => x + 1), 1000); return () => clearInterval(iv); }, []);
  if (!a?.active) return null;
  const left = Math.max(0, Math.round((a.endsAt - (Date.now() + (skew || 0))) / 1000));
  const inArena = map === 'arena';
  const myRank = a.board.findIndex((b) => b.name === me);
  return (
    <>
      <div className="arena-bar">
        <span>⚔ Savaş Arenası</span><span className="t">{Math.floor(left / 60)}:{String(left % 60).padStart(2, '0')}</span>
        {inArena ? <button className="leave" onClick={() => send({ t: 'arena', op: 'leave' })}>Ayrıl</button> : <button onClick={() => send({ t: 'arena', op: 'join' })}>Arenaya Katıl</button>}
      </div>
      {inArena && (
        <div className="arena-board">
          <div className="h">Sıralama (öldürme)</div>
          {a.board.slice(0, 5).map((b, i) => <div key={b.name} className={'r' + (b.name === me ? ' me' : '')}><span>{i + 1}</span>{b.name}<b>{b.kills}</b></div>)}
          {myRank >= 5 && <div className="r me"><span>{myRank + 1}</span>{me}<b>{a.board[myRank].kills}</b></div>}
          {!a.board.length && <div className="muted">Henüz puan yok.</div>}
        </div>
      )}
    </>
  );
}

/** Binek: Seyis Arda'nın görevi (al / ilerleme / teslim) ve sahibi için bin-in. */
export function MountPanel() {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const m = self.mount ?? {};
  const seals = self.materials?.[MOUNT.sealKey] ?? 0;
  const q = m.quest;
  const Row = ({ ok, children }: { ok: boolean; children: React.ReactNode }) => <div className={'mq-row' + (ok ? ' ok' : '')}><span>{ok ? '✔' : '○'}</span>{children}</div>;
  return (
    <Panel title="Binek · Seyis Arda" width={420}>
      <div className="mount-hero"><img src="/icons/mount.jpg" alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} /><div><b>{MOUNT.name}</b><div className="muted" style={{ fontSize: 12 }}>Binekteyken hareket hızı %{Math.round((MOUNT.speedMul - 1) * 100)} artar ve +{MOUNT.atk} saldırı kazanırsın. Binekte yalnız düz saldırı yapılır.</div></div></div>
      {m.owned ? (
        <>
          <div className="ok" style={{ margin: '8px 0' }}>Bu binek senin.</div>
          <button className="btn primary" style={{ width: '100%' }} onClick={() => send({ t: 'mount', op: 'ride' })}>{m.riding ? 'Binekten in' : 'Bineğe bin'}</button>
          <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>Kısayol: H · Oyun ekranındaki at düğmesiyle de binip inebilirsin.</div>
        </>
      ) : !q ? (
        <>
          <p style={{ fontSize: 13 }}>“İyi bir binek iyi bir dosttur. Kendini kanıtla, sana en iyi atımı vereyim.”</p>
          <Row ok={self.level >= MOUNT.level}>Seviye {MOUNT.level} (sen: {self.level})</Row>
          <button className="btn primary" style={{ width: '100%', marginTop: 8 }} disabled={self.level < MOUNT.level} onClick={() => send({ t: 'mount', op: 'quest' })}>Görevi al</button>
        </>
      ) : (
        <>
          <Row ok={q.kills >= MOUNT.kills}>{MOUNT.kills} canavar öldür · {Math.min(q.kills, MOUNT.kills)}/{MOUNT.kills}</Row>
          <Row ok={seals >= MOUNT.seals}>{MOUNT.seals} Kor Mührü · {Math.min(seals, MOUNT.seals)}/{MOUNT.seals}</Row>
          <Row ok={self.gems >= MOUNT.gems}>{MOUNT.gems} Mücevher · {Math.min(self.gems, MOUNT.gems)}/{MOUNT.gems}</Row>
          <div className="mq-bar"><i style={{ width: `${Math.min(1, q.kills / MOUNT.kills) * 100}%` }} /></div>
          <button className="btn primary" style={{ width: '100%', marginTop: 8 }} disabled={q.kills < MOUNT.kills || seals < MOUNT.seals || self.gems < MOUNT.gems} onClick={() => send({ t: 'mount', op: 'claim' })}>Teslim et · Bineği al</button>
        </>
      )}
    </Panel>
  );
}

/** Oyun ekranında bin/in düğmesi (bineği olanlara). */
export function MountButton() {
  // bilgisayarda binek tuşu beceri çubuğunda (H), telefonda beceri kümesinde (MobileControls); yüzen düğme yok
  return null;
}

/** Arkadaş listesi (menüden açılır). */
export function FriendsPanel() {
  const list = useStore((s) => s.friends);
  useEffect(() => { send({ t: 'friends', op: 'list' }); }, []);
  return (
    <Panel title="Arkadaşlar" width={380}>
      <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Arkadaş eklemek için oyuncuya sağ tıkla (telefonda üstüne uzun bas) → Arkadaş ekle.</div>
      {!list.length && <div className="muted">Henüz arkadaşın yok.</div>}
      {list.map((f) => (
        <div key={f.name} className="friend-row">
          <span className={'dot' + (f.here ? ' on' : '')} /> <b>{f.name}</b> {f.here && <small className="muted">bu kanalda</small>}
          <div className="spacer" />
          <button className="btn small" onClick={() => openWhisper(f.name)}>Fısıltı</button>
          <button className="btn small" onClick={() => send({ t: 'friends', op: 'remove', name: f.name })}>Sil</button>
        </div>
      ))}
    </Panel>
  );
}

/** Sıralamalar: en yüksek seviye ilk 10 ve dönemlik canavar avcıları ilk 10 (ilk sıralara ödül). */
interface RankRow { charId: number; name: string; cls: string; level: number; kills: number }
export function RankingsPanel() {
  const me = useStore((s) => s.char?.name ?? '');
  const [tab, setTab] = useState<'kills' | 'level'>('kills');
  const [data, setData] = useState<{ level: RankRow[]; kills: RankRow[]; period: { key: string; end: number; kind: string }; rewards: { cp: number; gems: number }[] } | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api('/api/rankings').then(setData).catch((e) => setErr((e as Error).message)); }, []);
  const skew = useStore((s) => s.clockSkew);
  const left = data ? Math.max(0, data.period.end - (Date.now() + (skew || 0))) : 0;
  const d = Math.floor(left / 86400000), h = Math.floor((left % 86400000) / 3600000), m = Math.floor((left % 3600000) / 60000);
  const rows = data ? (tab === 'kills' ? data.kills : data.level) : [];
  const per = data?.period.kind === 'day' ? 'Günlük' : data?.period.kind === 'month' ? 'Aylık' : 'Haftalık';
  return (
    <Panel title="Sıralama" width={460}>
      <div className="bag-tabs rank-tabs">
        <button className={tab === 'kills' ? 'on' : ''} onClick={() => setTab('kills')}>Canavar Avcıları</button>
        <button className={tab === 'level' ? 'on' : ''} onClick={() => setTab('level')}>En Yüksek Seviye</button>
      </div>
      {tab === 'kills' && data && (
        <div className="rank-info">
          <span>{per} yarış · bitimine <b>{d > 0 ? `${d} gün ` : ''}{h} sa {m} dk</b></span>
          <div className="rank-rewards">{data.rewards.map((r, i) => <span key={i} className={'rw r' + (i + 1)}><i>{i + 1}.</i>{r.cp > 0 && <><img src={iconUrl('mall_cp_100')} alt="" onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')} />{r.cp} ÇP</>}{r.cp > 0 && r.gems > 0 && ' + '}{r.gems > 0 && <><img src={iconUrl('gem')} alt="" />{r.gems.toLocaleString('tr-TR')}</>}</span>)}</div>
        </div>
      )}
      {err && <div className="err">{err}</div>}
      {!data && !err && <div className="adm-spin" />}
      <div className="rank-list">
        {rows.map((r, i) => (
          <div key={r.charId} className={'rank-row' + (i < 3 ? ' top t' + (i + 1) : '') + (r.name === me ? ' me' : '')}>
            <span className="pos">{i < 3 ? <Medal n={i + 1} /> : i + 1}</span>
            <span className="cls"><ClassIcon cls={(r.cls in CLASSES ? r.cls : 'guardian') as ClassId} size={24} /></span>
            <span className="nm">{r.name}<small>Sv. {r.level}</small></span>
            <b className="val">{tab === 'kills' ? `${r.kills.toLocaleString('tr-TR')} av` : `Sv. ${r.level}`}</b>
            {tab === 'kills' && i < (data?.rewards.length ?? 0) && <span className="prize">{data!.rewards[i].cp > 0 ? `${data!.rewards[i].cp} ÇP` : `${data!.rewards[i].gems.toLocaleString('tr-TR')} 💎`}</span>}
          </div>
        ))}
        {data && !rows.length && <div className="muted" style={{ padding: 12, textAlign: 'center' }}>{tab === 'kills' ? 'Bu dönem henüz kimse canavar avlamadı. İlk sen ol!' : 'Henüz oyuncu yok.'}</div>}
      </div>
      <div className="muted" style={{ fontSize: 11, marginTop: 8 }}>Sıralama birkaç saniyede bir yenilenir. Dönem bitince ödüller kazananların hesabına otomatik gönderilir.</div>
    </Panel>
  );
}
function Medal({ n }: { n: number }) {
  const c = n === 1 ? ['#fff3b0', '#e2b13a', '#8a5a10'] : n === 2 ? ['#ffffff', '#b8c0cc', '#5a6270'] : ['#ffd2a8', '#c8783a', '#6a3a10'];
  return (
    <svg viewBox="0 0 32 36" width="26" height="30" aria-hidden>
      <path d="M8 0 L14 12 L18 12 L24 0 Z" fill={n === 1 ? '#c83a3a' : n === 2 ? '#3a6ac8' : '#3a9a5a'} />
      <circle cx="16" cy="22" r="11" fill={c[1]} stroke={c[2]} strokeWidth="2" />
      <circle cx="16" cy="22" r="7.5" fill={c[0]} opacity=".55" />
      <text x="16" y="26.5" textAnchor="middle" fontSize="11" fontWeight="900" fill={c[2]}>{n}</text>
    </svg>
  );
}
