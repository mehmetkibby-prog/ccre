import React from 'react';
import { MAPS, MONSTERS, MATERIALS, MALL_ITEMS, RARITIES, RARITY, QUESTS_DEFAULT, QUEST_OBJ_NAMES, type GameTuning, type QuestDef, type QuestObj, type QuestObjKind } from '@col/shared';
import { Num, KIND_NAMES, dropOptions } from './AdminPanel.tsx';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
const NPC_OPTS: [string, string][] = Object.values(MAPS).flatMap((m) => m.npcs.map((n) => [n.id, `${n.name} (${m.name})`] as [string, string]));
const MON_OPTS: [string, string][] = [['any', 'Herhangi bir canavar'], ...MONSTERS.map((m) => [m.id, m.name] as [string, string])];
const MAP_OPTS: [string, string][] = [['any', 'Her yerde'], ...Object.values(MAPS).filter((m) => m.spawns.length || m.id === 'tower').map((m) => [m.id, m.name] as [string, string])];
const ITEM_KEY_OPTS: [string, string][] = [...MATERIALS.map((m) => [m.id, m.name] as [string, string]), ...MALL_ITEMS.filter((m) => !m.soon && !m.epin).map((m) => [m.id, `${m.name} (market)`] as [string, string])];
const Sel = ({ v, opts, on, dis, grow }: { v: string; opts: [string, string][]; on: (v: string) => void; dis: boolean; grow?: boolean }) => (
  <select className={'adm-sel' + (grow ? ' grow' : '')} value={v} disabled={dis} onChange={(e) => on(e.target.value)}>{opts.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
);

/**
 * Görev tasarımı: görevi veren ve teslim alan NPC, en düşük seviye, önceki görev, günlük tekrar, hedefler
 * (öldür / eşya getir / konuş / seviye / kule katı) ve ödüller. Kaydedince oyunda hemen görünür.
 */
export function QuestTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const list = t.quests;
  const set = (n: QuestDef[]) => setT({ ...t, quests: n });
  const upd = (i: number, p: Partial<QuestDef>) => set(list.map((q, j) => (j === i ? { ...q, ...p } : q)));
  const add = () => { let k = list.length + 1; while (list.some((q) => q.id === 'q' + k)) k++; set([...list, { id: 'q' + k, name: 'Yeni görev', desc: '', giver: 'tuccar', turnin: 'tuccar', minLevel: 1, repeat: 'none', objs: [{ kind: 'kill', key: 'any', map: 'any', n: 10 }], reward: { gems: 100, essence: 0, xp: 500, cp: 0, items: [] } }]); };
  return (
    <section className="admin-sec">
      <h4>Görevler</h4>
      <div className="muted adm-hint">Oyuncu görevi veren NPC ile konuşunca görevi görür ve kabul eder; hedefler bitince teslim alan NPC'ye gidip ödülünü alır. "Eşya getir" hedefindeki eşyalar teslimde oyuncudan alınır. Oyuncu "Görev" düğmesinden (J) ilerlemesini izler.</div>
      <div className="tw-adm">
        {list.map((q, i) => {
          const setObj = (j: number, p: Partial<QuestObj>) => upd(i, { objs: q.objs.map((o, jj) => (jj === j ? { ...o, ...p } : o)) });
          const setRw = (p: Partial<QuestDef['reward']>) => upd(i, { reward: { ...q.reward, ...p } });
          return (
            <details className={'tw-adm-row qa' + (q.off ? ' off' : '')} key={q.id}>
              <summary><b>{q.name}</b> <span className="muted">· {NPC_OPTS.find((n) => n[0] === q.giver)?.[1] ?? q.giver} · Sv. {q.minLevel}{q.repeat === 'daily' ? ' · günlük' : ''}{q.off ? ' · kapalı' : ''}</span></summary>
              <div className="tw-adm-h" style={{ marginTop: 8 }}>
                <input className="inp grow" value={q.name} maxLength={50} disabled={dis} onChange={(e) => upd(i, { name: e.target.value })} />
                <label className="adm-inline"><span>Açık</span><button type="button" className={'switch' + (q.off ? '' : ' on')} disabled={dis} onClick={() => upd(i, { off: q.off ? undefined : true })}><i /></button></label>
                <button className="btn small ghost danger" disabled={dis} onClick={() => { if (confirm(`"${q.name}" silinsin mi?`)) set(list.filter((_, j) => j !== i)); }}>Sil</button>
              </div>
              <textarea className="inp" style={{ width: '100%', minHeight: 54 }} maxLength={400} placeholder="Görev metni (oyuncuya görünür)" value={q.desc} disabled={dis} onChange={(e) => upd(i, { desc: e.target.value })} />
              <div className="adm-fields six" style={{ marginTop: 6 }}>
                <label><span>Görevi veren</span><Sel v={q.giver} opts={NPC_OPTS} on={(v) => upd(i, { giver: v })} dis={dis} /></label>
                <label><span>Teslim alan</span><Sel v={q.turnin} opts={NPC_OPTS} on={(v) => upd(i, { turnin: v })} dis={dis} /></label>
                <label><span>En düşük seviye</span><Num v={q.minLevel} def={1} min={1} max={120} step={1} w={64} dis={dis} on={(v) => upd(i, { minLevel: v ?? 1 })} /></label>
                <label><span>Önce bitmeli</span><Sel v={q.prereq ?? ''} opts={[['', '—'], ...list.filter((x) => x.id !== q.id).map((x) => [x.id, x.name] as [string, string])]} on={(v) => upd(i, { prereq: v || undefined })} dis={dis} /></label>
                <label><span>Tekrar</span><Sel v={q.repeat} opts={[['none', 'Bir kez'], ['daily', 'Her gün']]} on={(v) => upd(i, { repeat: v as QuestDef['repeat'] })} dis={dis} /></label>
              </div>
              <div className="sect" style={{ marginTop: 8 }}>Hedefler</div>
              <div className="drop-list">
                {q.objs.map((o, j) => (
                  <div className="drop-row" key={j}>
                    <Sel v={o.kind} opts={Object.entries(QUEST_OBJ_NAMES) as [string, string][]} dis={dis} on={(v) => { const k = v as QuestObjKind; setObj(j, { kind: k, key: k === 'kill' ? 'any' : k === 'collect' ? 'kor_seal' : k === 'talk' ? 'tuccar' : '', n: k === 'level' ? 10 : k === 'tower' ? 5 : 1, map: k === 'kill' ? 'any' : undefined }); }} />
                    {o.kind === 'kill' && <><Sel v={o.key} opts={MON_OPTS} on={(v) => setObj(j, { key: v })} dis={dis} grow /><Sel v={o.map ?? 'any'} opts={MAP_OPTS} on={(v) => setObj(j, { map: v })} dis={dis} /></>}
                    {o.kind === 'collect' && <Sel v={o.key} opts={ITEM_KEY_OPTS} on={(v) => setObj(j, { key: v })} dis={dis} grow />}
                    {o.kind === 'talk' && <Sel v={o.key} opts={NPC_OPTS} on={(v) => setObj(j, { key: v })} dis={dis} grow />}
                    {o.kind !== 'talk' && <label className="adm-inline"><span>{o.kind === 'level' ? 'Seviye' : o.kind === 'tower' ? 'Kat' : 'Adet'}</span><Num v={o.n} def={1} min={1} max={o.kind === 'tower' ? 10 : o.kind === 'level' ? 120 : 100000} step={1} w={70} dis={dis} on={(v) => setObj(j, { n: v ?? 1 })} /></label>}
                    <button className="btn small ghost danger" disabled={dis || q.objs.length <= 1} onClick={() => upd(i, { objs: q.objs.filter((_, jj) => jj !== j) })}>✕</button>
                  </div>
                ))}
                {q.objs.length < 6 && <button className="btn small" disabled={dis} onClick={() => upd(i, { objs: [...q.objs, { kind: 'kill', key: 'any', map: 'any', n: 10 }] })}>+ Hedef ekle</button>}
              </div>
              <div className="sect" style={{ marginTop: 8 }}>Ödül</div>
              <div className="adm-fields six">
                <label><span>Mücevher</span><Num v={q.reward.gems} def={0} min={0} max={1e9} step={1} w={84} dis={dis} on={(v) => setRw({ gems: v ?? 0 })} /></label>
                <label><span>Öz</span><Num v={q.reward.essence} def={0} min={0} max={1e9} step={1} w={84} dis={dis} on={(v) => setRw({ essence: v ?? 0 })} /></label>
                <label><span>TP</span><Num v={q.reward.xp} def={0} min={0} max={1e10} step={1} w={96} dis={dis} on={(v) => setRw({ xp: v ?? 0 })} /></label>
                <label><span>ÇP</span><Num v={q.reward.cp} def={0} min={0} max={1e6} step={1} w={70} dis={dis} on={(v) => setRw({ cp: v ?? 0 })} /></label>
              </div>
              <div className="drop-list" style={{ marginTop: 6 }}>
                {q.reward.items.map((it, j) => {
                  const setIt = (p: Partial<QuestDef['reward']['items'][number]>) => setRw({ items: q.reward.items.map((x, jj) => (jj === j ? { ...x, ...p } : x)) });
                  return (
                    <div className="drop-row" key={j}>
                      <select className="adm-sel" value={it.kind} disabled={dis} onChange={(e) => { const k = e.target.value as 'item' | 'mat' | 'mall'; setIt({ kind: k, key: dropOptions(k)[0]?.[0] ?? '', rarity: k === 'item' ? 'blue' : undefined }); }}>{(Object.keys(KIND_NAMES) as ('item' | 'mat' | 'mall')[]).map((k) => <option key={k} value={k}>{KIND_NAMES[k]}</option>)}</select>
                      <Sel v={it.key} opts={dropOptions(it.kind)} on={(v) => setIt({ key: v })} dis={dis} grow />
                      {it.kind === 'item' && <select className="adm-sel" value={it.rarity ?? 'blue'} disabled={dis} onChange={(e) => setIt({ rarity: e.target.value })}>{RARITIES.map((r) => <option key={r} value={r}>{RARITY[r].name}</option>)}</select>}
                      <label className="adm-inline"><span>Adet</span><Num v={it.qty} def={1} min={1} max={9999} step={1} w={60} dis={dis} on={(v) => setIt({ qty: v ?? 1 })} /></label>
                      <button className="btn small ghost danger" disabled={dis} onClick={() => setRw({ items: q.reward.items.filter((_, jj) => jj !== j) })}>✕</button>
                    </div>
                  );
                })}
                {q.reward.items.length < 8 && <button className="btn small" disabled={dis} onClick={() => setRw({ items: [...q.reward.items, { kind: 'mat', key: 'red_potion', qty: 5 }] })}>+ Ödül eşyası ekle</button>}
              </div>
            </details>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 10, gap: 8 }}>
        <button className="btn small" disabled={dis || list.length >= 120} onClick={add}>+ Görev ekle</button>
        <button className="btn small ghost" disabled={dis} onClick={() => { if (confirm('Görev listesi örnek görevlerle değiştirilsin mi?')) set(structuredClone(QUESTS_DEFAULT)); }}>Örnek görevlere dön</button>
      </div>
    </section>
  );
}
