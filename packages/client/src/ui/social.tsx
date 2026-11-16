import React, { useEffect, useState } from 'react';
import { RARITY, itemDisplayName, CLASSES, MOUNT, type ClassId, type ItemInstance } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { Cell, Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';

/**
 * Oyuncular arası arayüz: sağ tık (telefonda uzun basma) menüsü, davet kartları, grup çerçevesi, güvenli ticaret
 * penceresi ve arkadaş listesi. Bütün kararlar sunucuda doğrulanır; burası yalnız istek gönderir ve durumu gösterir.
 */
const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const KIND: Record<string, string> = { party: 'grubuna katılmaya', trade: 'ticarete', duel: 'düelloya', friend: 'arkadaş olmaya' };

export function openWhisper(name: string) {
  store.set({ whisperTo: name, chatOpen: true, playerMenu: null });
  setTimeout(() => (document.getElementById('chat-input') as HTMLInputElement | null)?.focus(), 30);
}

/** Oyuncu menüsü: fısıltı, ticaret, düello, arkadaşlık, grup. */
export function PlayerMenu() {
  const m = useStore((s) => s.playerMenu);
  const party = useStore((s) => s.party);
  const me = useStore((s) => s.char?.id ?? 0);
  useEffect(() => {
    if (!m) return;
    const close = (e: PointerEvent) => { if (!(e.target as HTMLElement).closest?.('.pmenu')) store.set({ playerMenu: null }); };
    const t = setTimeout(() => window.addEventListener('pointerdown', close), 0);
    return () => { clearTimeout(t); window.removeEventListener('pointerdown', close); };
  }, [m]);
  if (!m) return null;
  const inv = (kind: string) => { send({ t: 'social', op: 'invite', kind, target: m.id }); store.set({ playerMenu: null }); };
  const member = party.members.find((x) => x.eid === m.id);
  const x = Math.min(m.x, window.innerWidth - 200), y = Math.min(m.y, window.innerHeight - 260);
  return (
    <div className="pmenu" style={{ left: x, top: y }} onContextMenu={(e) => e.preventDefault()}>
      <div className="pm-h">{m.name}</div>
      <button onClick={() => openWhisper(m.name)}>💬 Fısıltı</button>
      <button onClick={() => inv('trade')}>🤝 Ticaret</button>
      <button onClick={() => inv('duel')}>⚔ Düello</button>
      <button onClick={() => inv('friend')}>★ Arkadaş ekle</button>
      {member ? (party.leader === me && <button onClick={() => { send({ t: 'party', op: 'kick', target: member.id }); store.set({ playerMenu: null }); }}>✕ Gruptan çıkar</button>)
        : <button onClick={() => inv('party')}>👥 Gruba davet et</button>}
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
  useEffect(() => { if (tr) setGems(String(tr.me.gems || '')); }, [tr?.me.gems]);
  if (!tr || !self) return null;
  const myIds = tr.me.items.map((i) => i.id);
  const setOffer = (ids: string[], g = Number(gems) || 0) => send({ t: 'trade', op: 'set', items: ids, gems: g });
  const Side = ({ title, s, mine }: { title: string; s: typeof tr.me; mine: boolean }) => (
    <div className={'tr-side' + (s.ok ? ' ok' : s.locked ? ' locked' : '')}>
      <div className="tr-h">{title} <span className="tr-st">{s.ok ? '✔ Onayladı' : s.locked ? '🔒 Kilitledi' : 'Hazırlanıyor'}</span></div>
      <div className="tr-items">
        {s.items.map((it: ItemInstance) => <div key={it.id} className="tr-it" title={itemDisplayName(it)} onClick={() => mine && setOffer(myIds.filter((x) => x !== it.id))}><Cell it={it} /><span style={{ color: RARITY[it.rarity]?.color }}>{itemDisplayName(it)}</span>{mine && <em>✕</em>}</div>)}
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
        {pick && <div className="tr-bag">{self.bag.filter((it) => !myIds.includes(it.id) && !it.locked).map((it) => <div key={it.id} title={itemDisplayName(it)} onClick={() => setOffer([...myIds, it.id])}><Cell it={it} /></div>)}</div>}
        <div className="muted" style={{ fontSize: 11 }}>İki taraf da önce kilitler, sonra onaylar. Teklif değişirse kilitler açılır. Kilitli (🔒) eşyalar takas edilemez.</div>
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
  const m = useStore((s) => s.self?.mount);
  // bilgisayarda binek tuşu beceri çubuğunda (H); bu yüzen düğme yalnız dokunmatik ekranda
  if (!m?.owned || !matchMedia('(pointer: coarse)').matches) return null;
  return <button className={'mount-btn' + (m.riding ? ' on' : '')} title={m.riding ? 'Binekten in (H)' : 'Bineğe bin (H)'} onClick={() => send({ t: 'mount', op: 'ride' })}>🐎</button>;
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
