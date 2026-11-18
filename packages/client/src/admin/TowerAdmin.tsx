import React from 'react';
import { MONSTERS, MATERIAL, TOWER_MATS, TOWER_PUZZLES, TOWER_PUZZLE_NAMES, TOWER_DEFAULT, monsterStats, type GameTuning, type TowerFloorTune, type DropTune, type TowerPuzzle } from '@col/shared';
import { Num, DropListEditor } from './AdminPanel.tsx';
import { iconUrl } from '../game/art/icons.ts';

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;

/**
 * Kadim Kule yönetimi: kat başına görev türü, canavar, sayı, seviye, can/saldırı çarpanı, öldürme hedefi ve
 * kat malzemelerinin düşme şansı; anahtar şansı; Azrail Sandığı içeriği ve Azrail Kancası şansı.
 * Azrail'in canı/saldırısı/doğma süresi "Bosslar" sekmesindedir.
 */
export function TowerTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const T = t.tower;
  const set = (p: Partial<GameTuning['tower']>) => setT({ ...t, tower: { ...T, ...p } });
  const setF = (i: number, p: Partial<TowerFloorTune>) => set({ floors: T.floors.map((f, j) => (j === i ? { ...f, ...p } : f)) });
  const setChest = (p: Partial<GameTuning['tower']['chest']>) => set({ chest: { ...T.chest, ...p } });
  const mons = MONSTERS.filter((m) => (!m.boss || m.id === 'azrail') && !m.id.startsWith('f_'));
  return (
    <>
      <section className="admin-sec">
        <h4>Genel</h4>
        <div className="muted adm-hint">Oyuncular Pazar Köyü'ndeki <b>Zindan Bekçisi</b>'nden kuleye girer; giriş sınırsızdır. Her kat bir oda; görev bitince kuzeydeki kapı açılır ve üst kata geçilir. Ölen oyuncu o katın girişinde doğar. Azrail'in can, saldırı ve doğma süresi <b>Bosslar</b> sekmesinde.</div>
        <div className="adm-fields">
          <label><span>Kule açık</span><button type="button" className={'switch' + (T.enabled ? ' on' : '')} disabled={dis} onClick={() => set({ enabled: !T.enabled })}><i /></button></label>
          <label><span>En düşük seviye</span><Num v={T.minLevel} def={TOWER_DEFAULT.minLevel} min={1} max={120} step={1} w={70} dis={dis} on={(v) => set({ minLevel: v ?? TOWER_DEFAULT.minLevel })} /></label>
          <label><span>Kat Anahtarı şansı %</span><Num v={Math.round(T.keyChance * 1000) / 10} def={TOWER_DEFAULT.keyChance * 100} min={0} max={100} step={0.5} w={70} dis={dis} on={(v) => set({ keyChance: (v ?? TOWER_DEFAULT.keyChance * 100) / 100 })} /></label>
        </div>
        <div className="muted adm-hint" style={{ marginTop: 8 }}>
          Görev türleri: <b>Kat Muhafızları</b> (N canavar öldür) · <b>Mühür Sırası</b> (renkli taşlara gösterilen sırayla bas) · <b>Kayıp Anahtar</b> (canavardan anahtar düşer, 15'te kesin) · <b>Bilmece</b> (doğru cevaplı taşa bas) · <b>Ruh Sunakları</b> (3 sunakta 3'er sn dur, 60 sn içinde). 10. kat her zaman Azrail.
        </div>
      </section>
      <section className="admin-sec">
        <h4>Katlar</h4>
        <div className="muted adm-hint">Can ×/Saldırı × yalnız o kattaki canavarlara uygulanır (genel canavar ayarının üstüne). Canavar, sayı veya seviye değişince kat yeniden kurulur. Malzeme şansları her öldürmede ayrı ayrı denenir.</div>
        <div className="tw-adm">
          {T.floors.map((f, i) => {
            const d = MONSTERS.find((m) => m.id === f.monster);
            const st = d ? monsterStats(d, f.level[0], 0) : null;
            const boss = i === 9;
            return (
              <div className={'tw-adm-row' + (boss ? ' boss' : '')} key={i}>
                <div className="tw-adm-h">
                  <b className="n">{i + 1}. Kat</b>
                  {boss ? <span className="pill">Azrail</span> : (
                    <select className="adm-sel" value={f.puzzle} disabled={dis} onChange={(e) => setF(i, { puzzle: e.target.value as TowerPuzzle })}>
                      {TOWER_PUZZLES.filter((p) => p !== 'boss').map((p) => <option key={p} value={p}>{TOWER_PUZZLE_NAMES[p]}</option>)}
                    </select>
                  )}
                  {!boss && (
                    <select className="adm-sel grow" value={f.monster} disabled={dis} onChange={(e) => setF(i, { monster: e.target.value })}>
                      {mons.filter((m) => !m.boss).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                    </select>
                  )}
                  {st && <small className="muted">taban can ≈ {Math.round(st.maxHp * (t.monsters[f.monster]?.hpMul ?? 1) * t.monsterHpMul * f.hpMul).toLocaleString('tr-TR')} · saldırı ≈ {Math.round(st.atk * t.monsterAtkMul * f.atkMul)}</small>}
                </div>
                <div className="adm-fields six">
                  {!boss && <label><span>Sayı</span><Num v={f.count} def={TOWER_DEFAULT.floors[i].count} min={0} max={60} step={1} w={60} dis={dis} on={(v) => setF(i, { count: v ?? TOWER_DEFAULT.floors[i].count })} /></label>}
                  <label><span>Seviye en az</span><Num v={f.level[0]} def={TOWER_DEFAULT.floors[i].level[0]} min={1} max={120} step={1} w={60} dis={dis} on={(v) => { const a = v ?? 1; setF(i, { level: [a, boss ? a : Math.max(a, f.level[1])] }); }} /></label>
                  {!boss && <label><span>Seviye en çok</span><Num v={f.level[1]} def={TOWER_DEFAULT.floors[i].level[1]} min={1} max={120} step={1} w={60} dis={dis} on={(v) => { const b = v ?? 1; setF(i, { level: [Math.min(f.level[0], b), b] }); }} /></label>}
                  <label><span>Can ×</span><Num v={f.hpMul} def={1} min={0.05} max={50} step={0.05} w={64} dis={dis} on={(v) => setF(i, { hpMul: v ?? 1 })} /></label>
                  <label><span>Saldırı ×</span><Num v={f.atkMul} def={1} min={0.05} max={50} step={0.05} w={64} dis={dis} on={(v) => setF(i, { atkMul: v ?? 1 })} /></label>
                  {f.puzzle === 'kill' && <label><span>Öldürme hedefi</span><Num v={f.kills} def={TOWER_DEFAULT.floors[i].kills || 12} min={1} max={500} step={1} w={64} dis={dis} on={(v) => setF(i, { kills: v ?? 12 })} /></label>}
                </div>
                {!boss && (
                  <div className="tw-adm-mats">
                    {TOWER_MATS.map((k) => (
                      <label className="adm-inline" key={k} title={MATERIAL.get(k)?.name}>
                        <img src={iconUrl(k)} alt="" /><span>{MATERIAL.get(k)?.name}</span>
                        <Num v={Math.round((f.mats[k] ?? 0) * 10000) / 100} def={0} min={0} max={100} step={0.1} w={62} dis={dis} on={(v) => setF(i, { mats: { ...f.mats, [k]: (v ?? 0) / 100 } })} /><span>%</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
      <section className="admin-sec">
        <h4><img src={iconUrl('azrail_chest')} alt="" style={{ width: 28, verticalAlign: 'middle' }} /> Azrail Sandığı</h4>
        <div className="muted adm-hint">Azrail'e (canının en az "Boss ganimeti payı" kadar) hasar veren her oyuncuya kesin 1 sandık düşer. Oyuncu çantasından açar; aşağıdaki içerikten her satır kendi şansıyla çıkar.</div>
        <div className="adm-fields six">
          <label><span>Mücevher en az</span><Num v={T.chest.gems[0]} def={TOWER_DEFAULT.chest.gems[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [v ?? 0, Math.max(v ?? 0, T.chest.gems[1])] })} /></label>
          <label><span>Mücevher en çok</span><Num v={T.chest.gems[1]} def={TOWER_DEFAULT.chest.gems[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ gems: [Math.min(T.chest.gems[0], v ?? 0), v ?? 0] })} /></label>
          <label><span>Öz en az</span><Num v={T.chest.essence[0]} def={TOWER_DEFAULT.chest.essence[0]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [v ?? 0, Math.max(v ?? 0, T.chest.essence[1])] })} /></label>
          <label><span>Öz en çok</span><Num v={T.chest.essence[1]} def={TOWER_DEFAULT.chest.essence[1]} min={0} max={1e7} step={1} w={84} dis={dis} on={(v) => setChest({ essence: [Math.min(T.chest.essence[0], v ?? 0), v ?? 0] })} /></label>
          <label><span><img src={iconUrl('azrail_hook')} alt="" style={{ width: 18, verticalAlign: 'middle' }} /> Azrail Kancası %</span><Num v={Math.round(T.chest.hookChance * 10000) / 100} def={TOWER_DEFAULT.chest.hookChance * 100} min={0} max={100} step={0.1} w={70} dis={dis} on={(v) => setChest({ hookChance: (v ?? 0) / 100 })} /></label>
        </div>
        <div className="sect" style={{ marginTop: 12 }}>Sandık içeriği</div>
        <DropListEditor drops={T.chest.drops} setDrops={(n: DropTune[]) => setChest({ drops: n })} dis={dis} empty="Sandıkta yalnız mücevher, öz ve şansa bağlı Azrail Kancası var." />
      </section>
    </>
  );
}
