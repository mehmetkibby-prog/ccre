import React from 'react';
import {
  MATERIAL, FORGE_DEFAULT, EVO_DEFAULT, FORGE_PUZZLES, FORGE_PUZZLE_NAMES, FORGE_MATS, EVO_NAMES, EVO_COLORS, MOLD_MAX_PAIRS,
  type GameTuning, type ForgeFloorTune, type ForgeMonTune, type ForgeWaveTune, type DropTune, type ForgePuzzle, type EvoStep,
} from '@col/shared';
import { Num, DropListEditor } from './AdminPanel.tsx';
import { iconUrl } from '../game/art/icons.ts';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
const WAVE_NAMES = ['1. dalga', '2. dalga', '3. dalga (elitler)'];
const MONS: [string, string][] = [['f_slag', 'Cüruf Golemi'], ['f_brute', 'Kızgın Cüruf Golemi']];

/** Canavar gücü satırı (seviye, can, saldırı, savunma, TP) */
function MonFields({ m, d, set, dis }: { m: ForgeMonTune; d: ForgeMonTune; set: (p: Partial<ForgeMonTune>) => void; dis: boolean }) {
  return (
    <div className="adm-fields six">
      <label><span>Seviye</span><Num v={m.level} def={d.level} min={1} max={120} step={1} w={60} dis={dis} on={(v) => set({ level: v ?? d.level })} /></label>
      <label><span>Can</span><Num v={m.hp} def={d.hp} min={1} max={1e8} step={50} w={84} dis={dis} on={(v) => set({ hp: v ?? d.hp })} /></label>
      <label><span>Saldırı</span><Num v={m.atk} def={d.atk} min={0} max={1e6} step={1} w={70} dis={dis} on={(v) => set({ atk: v ?? d.atk })} /></label>
      <label><span>Savunma</span><Num v={m.def} def={d.def} min={0} max={1e5} step={1} w={64} dis={dis} on={(v) => set({ def: v ?? d.def })} /></label>
      <label><span>TP</span><Num v={m.xp} def={d.xp} min={0} max={1e8} step={1} w={70} dis={dis} on={(v) => set({ xp: v ?? d.xp })} /></label>
    </div>
  );
}

/**
 * Kor Kulesi yönetimi: genel kurallar, her katın 3 dalgası (canavar, sayı, elit), katın canavar gücü (mutlak),
 * kat malzemeleri (şans/adet), bulmacalar, Karademir (güç, golem çağırma, doğrudan düşenler) ve Kor Sandığı.
 */
export function ForgeTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const T = t.forge, D = FORGE_DEFAULT;
  const set = (p: Partial<GameTuning['forge']>) => setT({ ...t, forge: { ...T, ...p } });
  const setF = (i: number, p: Partial<ForgeFloorTune>) => set({ floors: T.floors.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const setW = (i: number, k: number, p: Partial<ForgeWaveTune>) => setF(i, { waves: T.floors[i].waves.map((w, j) => (j === k ? { ...w, ...p } : w)) });
  const setBoss = (p: Partial<GameTuning['forge']['boss']>) => set({ boss: { ...T.boss, ...p } });
  const setChest = (p: Partial<GameTuning['forge']['chest']>) => set({ chest: { ...T.chest, ...p } });
  const pct = (v: number) => Math.round(v * 10000) / 100;
  return (
    <>
      <section className="admin-sec">
        <h4><img src={iconUrl('forge_chest')} alt="" style={{ width: 28, verticalAlign: 'middle' }} /> Genel</h4>
        <div className="muted adm-hint">
          Oyuncular Pazar Köyü'ndeki <b>Zindan Bekçisi</b>'nden girer. Her grup kendi 3 katlı kulesine girer (kanal başına aynı anda 6 grup).
          1. ve 2. katta: <b>1. dalga → 2. dalga → bulmaca → 3. dalga (elitler) → kapı</b>. 3. kat: Karademir. Grupta her ek oyuncu dalgaları "grup artışı" kadar büyütür.
        </div>
        <div className="adm-fields six">
          <label><span>Kule açık</span><button type="button" className={'switch' + (T.enabled ? ' on' : '')} disabled={dis} onClick={() => set({ enabled: !T.enabled })}><i /></button></label>
          <label><span>En düşük seviye</span><Num v={T.minLevel} def={D.minLevel} min={1} max={120} step={1} w={64} dis={dis} on={(v) => set({ minLevel: v ?? D.minLevel })} /></label>
          <label><span>Giriş bedeli (Mücevher)</span><Num v={T.entryGems} def={D.entryGems} min={0} max={1e7} step={10} w={84} dis={dis} on={(v) => set({ entryGems: v ?? 0 })} /></label>
          <label><span>Girişler arası (dk)</span><Num v={T.cooldownMin} def={D.cooldownMin} min={0} max={1440} step={1} w={64} dis={dis} on={(v) => set({ cooldownMin: v ?? 0 })} /></label>
          <label><span>Grup artışı (oyuncu başı %)</span><Num v={Math.round(T.partyScale * 100)} def={D.partyScale * 100} min={0} max={300} step={5} w={64} dis={dis} on={(v) => set({ partyScale: (v ?? D.partyScale * 100) / 100 })} /></label>
          <label><span>Dalga arası (sn)</span><Num v={T.waveDelay} def={D.waveDelay} min={1} max={30} step={1} w={60} dis={dis} on={(v) => set({ waveDelay: v ?? D.waveDelay })} /></label>
        </div>
        <div className="sect" style={{ marginTop: 10 }}>Elit golemler (3. dalga) — katın canavar gücüne çarpan</div>
        <div className="adm-fields six">
          <label><span>Can ×</span><Num v={T.eliteHp} def={D.eliteHp} min={1} max={50} step={0.1} w={64} dis={dis} on={(v) => set({ eliteHp: v ?? D.eliteHp })} /></label>
          <label><span>Saldırı ×</span><Num v={T.eliteAtk} def={D.eliteAtk} min={1} max={20} step={0.05} w={64} dis={dis} on={(v) => set({ eliteAtk: v ?? D.eliteAtk })} /></label>
          <label><span>TP ×</span><Num v={T.eliteXp} def={D.eliteXp} min={1} max={50} step={0.1} w={64} dis={dis} on={(v) => set({ eliteXp: v ?? D.eliteXp })} /></label>
          <label><span>Ganimet ×</span><Num v={T.eliteLoot} def={D.eliteLoot} min={1} max={50} step={0.1} w={64} dis={dis} on={(v) => set({ eliteLoot: v ?? D.eliteLoot })} /></label>
        </div>
      </section>
      <section className="admin-sec">
        <h4>Bulmacalar</h4>
        <div className="muted adm-hint"><b>Döküm Kalıpları:</b> taşların altındaki sembol çiftlerini eşleştir; yanlışta can gider. <b>Kor Taşıma:</b> ocaktan sıçrayan közü al, soğumadan ortadaki örse götür.</div>
        <div className="adm-fields six">
          <label><span>Kalıp çifti</span><Num v={T.moldPairs} def={D.moldPairs} min={2} max={MOLD_MAX_PAIRS} step={1} w={60} dis={dis} on={(v) => set({ moldPairs: v ?? D.moldPairs })} /></label>
          <label><span>Yanlış kalıp can kaybı %</span><Num v={T.moldZap} def={D.moldZap} min={0} max={50} step={1} w={60} dis={dis} on={(v) => set({ moldZap: v ?? D.moldZap })} /></label>
          <label><span>Köz sayısı</span><Num v={T.emberCount} def={D.emberCount} min={1} max={8} step={1} w={60} dis={dis} on={(v) => set({ emberCount: v ?? D.emberCount })} /></label>
          <label><span>Köz soğuma (sn)</span><Num v={T.emberSec} def={D.emberSec} min={5} max={60} step={1} w={60} dis={dis} on={(v) => set({ emberSec: v ?? D.emberSec })} /></label>
        </div>
      </section>
      {T.floors.map((f, i) => (
        <section className="admin-sec" key={i}>
          <h4>{i + 1}. Kat
            <select className="adm-sel" style={{ marginLeft: 10 }} value={f.puzzle} disabled={dis} onChange={(e) => setF(i, { puzzle: e.target.value as ForgePuzzle })}>
              {FORGE_PUZZLES.map((p) => <option key={p} value={p}>Bulmaca: {FORGE_PUZZLE_NAMES[p]}</option>)}
            </select>
          </h4>
          <div className="sect">Dalgalar (tek kişilik sayı)</div>
          <div className="tw-adm">
            {f.waves.map((w, k) => (
              <div className="tw-adm-row" key={k}>
                <div className="tw-adm-h">
                  <b className="n">{WAVE_NAMES[k]}</b>
                  <select className="adm-sel grow" value={w.monster} disabled={dis} onChange={(e) => setW(i, k, { monster: e.target.value })}>
                    {MONS.map(([id, n]) => <option key={id} value={id}>{n}</option>)}
                  </select>
                  <label className="adm-inline"><span>Sayı</span><Num v={w.count} def={D.floors[i].waves[k].count} min={0} max={40} step={1} w={56} dis={dis} on={(v) => setW(i, k, { count: v ?? 0 })} /></label>
                  <label className="adm-inline"><span>Elit</span><Num v={w.elite} def={D.floors[i].waves[k].elite} min={0} max={10} step={1} w={56} dis={dis} on={(v) => setW(i, k, { elite: v ?? 0 })} /></label>
                </div>
              </div>
            ))}
          </div>
          <div className="sect" style={{ marginTop: 8 }}>Kat canavarının gücü (her golem; elitler yukarıdaki çarpanla)</div>
          <MonFields m={f.mon} d={D.floors[i].mon} set={(p) => setF(i, { mon: { ...f.mon, ...p } })} dis={dis} />
          <div className="sect" style={{ marginTop: 8 }}>Her öldürmede düşen malzemeler</div>
          <div className="tw-adm-mats">
            {FORGE_MATS.map((k) => {
              const cur = f.mats.find((x) => x.key === k);
              const put = (p: { chance?: number; qty?: [number, number] }) => {
                const nx = { key: k, chance: cur?.chance ?? 0, qty: cur?.qty ?? [1, 1] as [number, number], ...p };
                setF(i, { mats: cur ? f.mats.map((x) => (x.key === k ? nx : x)) : [...f.mats, nx] });
              };
              return (
                <label className="adm-inline" key={k} title={MATERIAL.get(k)?.desc}>
                  <img src={iconUrl(k)} alt="" /><span>{MATERIAL.get(k)?.name}</span>
                  <Num v={pct(cur?.chance ?? 0)} def={0} min={0} max={100} step={0.1} w={62} dis={dis} on={(v) => put({ chance: (v ?? 0) / 100 })} /><span>%</span>
                  <Num v={cur?.qty[0] ?? 1} def={1} min={1} max={999} step={1} w={48} dis={dis} on={(v) => put({ qty: [v ?? 1, Math.max(v ?? 1, cur?.qty[1] ?? 1)] })} /><span>–</span>
                  <Num v={cur?.qty[1] ?? 1} def={1} min={1} max={999} step={1} w={48} dis={dis} on={(v) => put({ qty: [Math.min(cur?.qty[0] ?? 1, v ?? 1), v ?? 1] })} /><span>adet</span>
                </label>
              );
            })}
          </div>
        </section>
      ))}
      <section className="admin-sec">
        <h4>3. Kat · Karademir</h4>
        <div className="muted adm-hint">Boss'un gücü (mutlak). Canı aşağıdaki yüzdelerin altına inince yardımcı Cüruf Golemleri çağırır (1. kat gücüyle). Yer çatlağı: kızıl işaretli alan saldırısının çarpanı (diğer bosslarda 2,2).</div>
        <MonFields m={T.boss} d={D.boss} set={(p) => setBoss(p)} dis={dis} />
        <div className="adm-fields six">
          <label><span>Golem çağırma (%)</span><input className="adm-num set" style={{ width: 120 }} disabled={dis} defaultValue={T.boss.addAt.join(', ')} onBlur={(e) => setBoss({ addAt: e.target.value.split(/[,\s]+/).map(Number).filter((n) => n > 0 && n < 100).slice(0, 4).sort((a, b) => b - a) })} /></label>
          <label><span>Her çağrıda golem</span><Num v={T.boss.adds} def={D.boss.adds} min={0} max={12} step={1} w={60} dis={dis} on={(v) => setBoss({ adds: v ?? D.boss.adds })} /></label>
          <label><span>Yer çatlağı ×</span><Num v={T.boss.slamMul} def={D.boss.slamMul} min={0} max={20} step={0.1} w={64} dis={dis} on={(v) => setBoss({ slamMul: v ?? D.boss.slamMul })} /></label>
        </div>
        <div className="sect" style={{ marginTop: 12 }}>Karademir'den doğrudan düşenler (katkı veren herkese ayrı ayrı)</div>
        <DropListEditor drops={T.boss.drops} setDrops={(n: DropTune[]) => setBoss({ drops: n })} dis={dis} empty="Boss doğrudan bir şey düşürmez; yalnız Kor Sandığı verir." />
      </section>
      <section className="admin-sec">
        <h4><img src={iconUrl('forge_chest')} alt="" style={{ width: 28, verticalAlign: 'middle' }} /> Kor Sandığı</h4>
        <div className="muted adm-hint">Karademir'e (canının en az "Boss ganimeti payı" kadar) hasar veren her oyuncuya kesin 1 sandık. Çantadan açılır; her satır kendi şansıyla çıkar.</div>
        <div className="adm-fields six">
          <label><span>Mücevher en az</span><Num v={T.chest.gems[0]} def={D.chest.gems[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [v ?? 0, Math.max(v ?? 0, T.chest.gems[1])] })} /></label>
          <label><span>Mücevher en çok</span><Num v={T.chest.gems[1]} def={D.chest.gems[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [Math.min(T.chest.gems[0], v ?? 0), v ?? 0] })} /></label>
          <label><span>Öz en az</span><Num v={T.chest.essence[0]} def={D.chest.essence[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [v ?? 0, Math.max(v ?? 0, T.chest.essence[1])] })} /></label>
          <label><span>Öz en çok</span><Num v={T.chest.essence[1]} def={D.chest.essence[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [Math.min(T.chest.essence[0], v ?? 0), v ?? 0] })} /></label>
        </div>
        <div className="sect" style={{ marginTop: 12 }}>Sandık içeriği</div>
        <DropListEditor drops={T.chest.drops} setDrops={(n: DropTune[]) => setChest({ drops: n })} dis={dis} empty="Sandıkta yalnız mücevher ve öz var." />
      </section>
    </>
  );
}

/** Evrim yönetimi: silah ve zırh için 3 kademe (gereken av, Mücevher, malzemeler, toplam artış %). */
export function EvoTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const E = t.evo, D = EVO_DEFAULT;
  const set = (p: Partial<GameTuning['evo']>) => setT({ ...t, evo: { ...E, ...p } });
  const setStep = (slot: 'weapon' | 'armor', i: number, p: Partial<EvoStep>) => set({ [slot]: E[slot].map((s, j) => (j === i ? { ...s, ...p } : s)) } as Partial<GameTuning['evo']>);
  const MAT_OPTS = [...FORGE_MATS.filter((k) => k !== 'forge_chest'), 'kor_seal', 'evo_scroll', 'white_pearl', 'tower_seal', 'old_iron', 'master_scroll'];
  return (
    <>
      <section className="admin-sec">
        <h4>Evrim (Demirci Haso)</h4>
        <div className="muted adm-hint">
          Kuşanılı silah ve zırh, öldürülen her canavarı sayar. Sayaç kademenin istediğine ulaşınca Mücevher ve malzemeyle evrilir; sayaç sıfırlanır.
          Artış <b>toplam</b> yüzdedir (silahta saldırı, zırhta savunma; artı dahil eşya gücüne). Her kademede yeni efekt: I buz mavisi, II mor, III altın.
        </div>
        <div className="adm-fields six">
          <label><span>Evrim açık</span><button type="button" className={'switch' + (E.enabled ? ' on' : '')} disabled={dis} onClick={() => set({ enabled: !E.enabled })}><i /></button></label>
          <label><span>Sayılan en düşük canavar (oyuncudan kaç sv. aşağı; 0 = hepsi)</span><Num v={E.maxGap} def={D.maxGap} min={0} max={120} step={1} w={64} dis={dis} on={(v) => set({ maxGap: v ?? D.maxGap })} /></label>
        </div>
      </section>
      {(['weapon', 'armor'] as const).map((slot) => (
        <section className="admin-sec" key={slot}>
          <h4>{slot === 'weapon' ? 'Silah evrimi · saldırı' : 'Zırh evrimi · savunma'}</h4>
          <div className="tw-adm">
            {E[slot].map((s, i) => (
              <div className="tw-adm-row" key={i}>
                <div className="tw-adm-h">
                  <b className="n" style={{ color: EVO_COLORS[i + 1] }}>{['I', 'II', 'III'][i]} · {EVO_NAMES[i + 1]}</b>
                  <label className="adm-inline"><span>Gereken av</span><Num v={s.kills} def={D[slot][i].kills} min={0} max={1e7} step={50} w={84} dis={dis} on={(v) => setStep(slot, i, { kills: v ?? D[slot][i].kills })} /></label>
                  <label className="adm-inline"><span>Mücevher</span><Num v={s.gems} def={D[slot][i].gems} min={0} max={1e9} step={100} w={84} dis={dis} on={(v) => setStep(slot, i, { gems: v ?? 0 })} /></label>
                  <label className="adm-inline"><span>Toplam artış %</span><Num v={s.pct} def={D[slot][i].pct} min={0} max={500} step={0.5} w={64} dis={dis} on={(v) => setStep(slot, i, { pct: v ?? D[slot][i].pct })} /></label>
                </div>
                <div className="tw-adm-mats">
                  {MAT_OPTS.map((k) => (
                    <label className="adm-inline" key={k} title={MATERIAL.get(k)?.desc}>
                      <img src={iconUrl(MATERIAL.get(k)?.icon ?? k)} alt="" /><span>{MATERIAL.get(k)?.name ?? k}</span>
                      <Num v={s.mats[k] ?? 0} def={0} min={0} max={1e6} step={1} w={56} dis={dis} on={(v) => { const m = { ...s.mats }; if (v && v > 0) m[k] = v; else delete m[k]; setStep(slot, i, { mats: m }); }} />
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
