import { useState } from 'react';
import { TUNING, MAPS, MONSTERS, MATERIAL, MALL, ITEM_TPL, RARITY, trDayKey, type QuestDef, type QuestState } from '@col/shared';
import { useStore, reqId, type SelfInfo } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';
import { matIcon } from './craft.tsx';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
const NPCS = new Map(Object.values(MAPS).flatMap((m) => m.npcs.map((n) => [n.id, { ...n, map: m.id, mapName: m.name }] as const)));
export const npcName = (id: string) => NPCS.get(id)?.name ?? id;
const npcWhere = (id: string) => { const n = NPCS.get(id); return n ? `${n.name} · ${n.mapName}` : id; };
const monName = (id: string) => (id === 'any' ? 'herhangi bir canavar' : MONSTERS.find((m) => m.id === id)?.name ?? id);
const itemName = (k: string) => MATERIAL.get(k)?.name ?? MALL.get(k)?.name ?? k;

/** Hedef satırı: metin ve ilerleme (sunucudaki hesapla aynı) */
export function objLines(q: QuestDef, self: SelfInfo, st?: { p: number[] }) {
  return q.objs.map((o, i) => {
    const have = o.kind === 'collect' ? self.materials?.[o.key] ?? 0 : o.kind === 'level' ? self.level : st?.p[i] ?? 0;
    const text = o.kind === 'kill' ? `${monName(o.key)} öldür${o.map && o.map !== 'any' ? ` (${MAPS[o.map]?.name ?? o.map})` : ''}`
      : o.kind === 'collect' ? `${itemName(o.key)} getir → ${npcName(q.turnin)}`
      : o.kind === 'talk' ? `${npcWhere(o.key)} ile konuş`
      : o.kind === 'level' ? `${o.n}. seviyeye ulaş`
      : `Kadim Kule'de ${o.n}. kata çık`;
    const show = o.kind === 'talk' ? '' : `${Math.min(have, o.n)}/${o.n}`;
    return { text, show, ok: have >= o.n, icon: o.kind === 'collect' ? matIcon(o.key) : null };
  });
}
export const questReady = (q: QuestDef, self: SelfInfo, st?: { p: number[] }) => objLines(q, self, st).every((l) => l.ok);
export function questAvailable(q: QuestDef, self: SelfInfo, qs: QuestState) {
  if (q.off || qs.a[q.id]) return false;
  if (q.repeat === 'daily' ? qs.d[q.id] === trDayKey(Date.now()) : !!qs.d[q.id]) return false;
  if (q.prereq && !qs.d[q.prereq]) return false;
  return self.level >= q.minLevel;
}
function Rewards({ q }: { q: QuestDef }) {
  const r = q.reward;
  return (
    <div className="qs-rw">
      {r.gems > 0 && <span><img src={iconUrl('gem')} alt="" />{r.gems.toLocaleString('tr-TR')}</span>}
      {r.essence > 0 && <span><img src={iconUrl('essence')} alt="" />{r.essence.toLocaleString('tr-TR')}</span>}
      {r.xp > 0 && <span className="xp">{r.xp.toLocaleString('tr-TR')} TP</span>}
      {r.cp > 0 && <span className="cp">{r.cp} ÇP</span>}
      {r.items.map((it, i) => {
        if (it.kind === 'item') { const t = ITEM_TPL.get(it.key); const rr = RARITY[(it.rarity ?? 'blue') as keyof typeof RARITY]; return <span key={i} style={{ color: rr?.color }}>{it.qty > 1 ? it.qty + '× ' : ''}{rr?.name} {t?.name ?? it.key}</span>; }
        return <span key={i}><img src={iconUrl(matIcon(it.key))} alt="" />{it.qty}× {itemName(it.key)}</span>;
      })}
    </div>
  );
}
const EMPTY: QuestState = { a: {}, d: {} };

/** Görev paneli (J): etkin görevler ve ilerleme, alınabilecekler (kimden), tamamlananlar. */
export function QuestPanel() {
  const self = useStore((s) => s.self);
  const [tab, setTab] = useState<'a' | 'n' | 'd'>('a');
  if (!self) return null;
  const qs = self.quests ?? EMPTY;
  const all = TUNING.quests;
  const active = all.filter((q) => qs.a[q.id]);
  const avail = all.filter((q) => questAvailable(q, self, qs));
  const done = all.filter((q) => qs.d[q.id] && !qs.a[q.id]);
  return (
    <Panel title="Görevler" width={560}>
      <div className="qs-tabs">
        <button className={tab === 'a' ? 'on' : ''} onClick={() => setTab('a')}>Etkin <b>{active.length}</b></button>
        <button className={tab === 'n' ? 'on' : ''} onClick={() => setTab('n')}>Alınabilir <b>{avail.length}</b></button>
        <button className={tab === 'd' ? 'on' : ''} onClick={() => setTab('d')}>Tamamlanan <b>{done.length}</b></button>
      </div>
      <div className="qs-list">
        {tab === 'a' && !active.length && <div className="muted">Etkin görevin yok. NPC'lerle konuşup görev alabilirsin; "Alınabilir" sekmesinde kimin görev verdiği yazar.</div>}
        {tab === 'a' && active.map((q) => {
          const st = qs.a[q.id]; const ready = questReady(q, self, st);
          return (
            <div className={'qs-card' + (ready ? ' ready' : '')} key={q.id}>
              <div className="qs-h"><b>{q.name}</b>{q.repeat === 'daily' && <span className="pill">Günlük</span>}{ready && <span className="pill ok">Teslime hazır</span>}</div>
              <div className="qs-d">{q.desc}</div>
              {objLines(q, self, st).map((l, i) => <div key={i} className={'qs-o' + (l.ok ? ' ok' : '')}><span>{l.ok ? '✔' : '○'}</span>{l.icon && <img src={iconUrl(l.icon)} alt="" />}{l.text}<b>{l.show}</b></div>)}
              <div className="qs-f"><span className="muted">Teslim: {npcWhere(q.turnin)}</span><div className="spacer" /><button className="btn small ghost" onClick={() => { if (confirm(`"${q.name}" görevini bırakmak istiyor musun?`)) send({ t: 'quest', op: 'abandon', id: q.id, req: reqId() }); }}>Bırak</button></div>
              <Rewards q={q} />
            </div>
          );
        })}
        {tab === 'n' && !avail.length && <div className="muted">Şu an alınabilecek yeni görev yok. Seviye atladıkça yeni görevler açılır.</div>}
        {tab === 'n' && avail.map((q) => (
          <div className="qs-card" key={q.id}>
            <div className="qs-h"><b>{q.name}</b>{q.repeat === 'daily' && <span className="pill">Günlük</span>}<span className="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>Sv. {q.minLevel}+</span></div>
            <div className="qs-d">{q.desc}</div>
            <div className="qs-f"><span className="muted">Görevi veren: <b>{npcWhere(q.giver)}</b></span></div>
            <Rewards q={q} />
          </div>
        ))}
        {tab === 'd' && !done.length && <div className="muted">Henüz tamamlanan görev yok.</div>}
        {tab === 'd' && done.map((q) => <div className="qs-card done" key={q.id}><div className="qs-h"><b>{q.name}</b><span className="pill ok">✔</span>{q.repeat === 'daily' && <span className="muted" style={{ marginLeft: 'auto', fontSize: 11 }}>{qs.d[q.id] === trDayKey(Date.now()) ? 'yarın yeniden' : 'yeniden alınabilir'}</span>}</div></div>)}
      </div>
    </Panel>
  );
}

/** NPC konuşmasında: bu NPC'nin verdiği alınabilir görevler ve bu NPC'ye teslim edilecek görevler. */
export function NpcQuests({ npc }: { npc: string }) {
  const self = useStore((s) => s.self);
  if (!self) return null;
  const qs = self.quests ?? EMPTY;
  const give = TUNING.quests.filter((q) => q.giver === npc && questAvailable(q, self, qs));
  const turn = TUNING.quests.filter((q) => q.turnin === npc && qs.a[q.id]);
  if (!give.length && !turn.length) return null;
  return (
    <div className="npc-quests">
      {turn.map((q) => {
        const ready = questReady(q, self, qs.a[q.id]);
        return (
          <div key={q.id} className={'npc-q' + (ready ? ' ready' : '')}>
            <span className="qm">{ready ? '?' : '…'}</span>
            <div><b>{q.name}</b><div className="muted" style={{ fontSize: 11 }}>{ready ? 'Hedefler tamam. Teslim et, ödülünü al.' : objLines(q, self, qs.a[q.id]).filter((l) => !l.ok).map((l) => `${l.text} ${l.show}`).join(' · ')}</div></div>
            <button className="btn small primary" disabled={!ready} onClick={() => send({ t: 'quest', op: 'turnin', id: q.id, req: reqId() })}>Teslim et</button>
          </div>
        );
      })}
      {give.map((q) => (
        <div key={q.id} className="npc-q new">
          <span className="qm">!</span>
          <div><b>{q.name}</b><div className="muted" style={{ fontSize: 11 }}>{q.desc}</div><Rewards q={q} /></div>
          <button className="btn small primary" onClick={() => send({ t: 'quest', op: 'accept', id: q.id, req: reqId() })}>Kabul et</button>
        </div>
      ))}
    </div>
  );
}
