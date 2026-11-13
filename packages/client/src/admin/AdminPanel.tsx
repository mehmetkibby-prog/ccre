import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TUNING, TUNING, TUNING_LIMITS, DENSITY_LIMITS, MAPS, MONSTERS, LOOT_PROFILES, RARITY, RARITIES, MATERIALS, ENCHANTS,
  ENCHANT_COUNT_WEIGHTS, ENCHANT_TIER_WEIGHTS, SELL_PRICES, DEFAULT_XP_TABLE, LEVEL_CAP_BASE, MAX_PLUS, DEFAULT_UPGRADE, type UpgradeStepTune, monsterStats, sanitizeTuning, type GameTuning, type MonsterTune, type SpawnTune,
} from '@col/shared';
import { configState, onConfig } from './config.ts';
import { OFFLINE } from '../mode.ts';
type NumKey = keyof typeof TUNING_LIMITS;
const ROWS: { title: string; note?: string; items: [NumKey, string, string][] }[] = [
  { title: 'Ekonomi ve ödüller', items: [
    ['xpMul', 'Deneyim (TP) çarpanı', '2 = çift TP etkinliği'],
    ['gemMul', 'Mücevher çarpanı', 'Canavardan düşen mücevher'],
    ['essenceMul', 'Öz çarpanı', 'Canavardan düşen Öz (Dünya Sağlığı bağışı için)'],
    ['dropMul', 'Eşya ve malzeme düşme', 'Ekipman ve malzeme düşme şansı'],
  ] },
  { title: 'Canavarlar', note: 'Can ve saldırı, yeni doğan canavarlara uygulanır.', items: [
    ['monsterHpMul', 'Canavar canı', ''],
    ['monsterAtkMul', 'Canavar saldırısı', ''],
    ['respawnMul', 'Yeniden doğma süresi', '0,5 = iki kat hızlı doğar'],
  ] },
  { title: 'Dünya Sağlığı', note: 'Sağlık zamanla azalır, oyuncuların Öz bağışıyla artar. Anlık değeri Durum sekmesinden ayarlayabilirsin.', items: [
    ['worldDecayMul', 'Azalma hızı', '1 = günde yaklaşık %26 · 0 = hiç azalmaz'],
    ['worldDonateGain', '1 Öz bağışının etkisi', 'Varsayılan 0,02 puan; sağlık düştükçe etki büyür'],
  ] },
  { title: 'Dünya', items: [
    ...(OFFLINE ? [['bots', 'Test botu sayısı', 'Köyde dolaşan / ormanda avlanan oyuncular'] as [NumKey, string, string]] : []),
    ['brightness', 'Işık seviyesi', 'Bütün haritaların parlaklığı'],
  ] },
];
const DENSITY_MAPS = Object.values(MAPS).filter((m) => m.spawns.length > 0);
const fmt = (k: NumKey, v: number) => (k === 'bots' ? String(v) : k === 'worldDonateGain' ? v.toLocaleString('tr-TR', { maximumFractionDigits: 3 }) + ' puan' : v.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '×');

type Tab = 'genel' | 'canavar' | 'ganimet' | 'efsun' | 'arti' | 'harita' | 'oyuncu';
const TABS: [Tab, string][] = [['genel', 'Genel'], ['canavar', 'Canavarlar'], ['ganimet', 'Ganimet'], ['efsun', 'Efsunlar'], ['arti', 'Artı Basma'], ['harita', 'Haritalar'], ['oyuncu', 'Oyuncular']];
export const fmtN = (n: number, d = 2) => n.toLocaleString('tr-TR', { maximumFractionDigits: d });
/** Canavarın göründüğü ilk haritanın teması → varsayılan ganimet profili. */
function monsterTheme(id: string) {
  for (const m of Object.values(MAPS)) if (m.spawns.some((g) => g.monster === id)) return m.theme;
  return 'forest';
}
/** Boş = varsayılan. Sayı kutusu; yer tutucu varsayılanı gösterir. */
export function Num({ v, def, on, min, max, step = 0.01, w = 72, dis }: { v: number | undefined; def: number; on: (n: number | undefined) => void; min: number; max: number; step?: number; w?: number; dis?: boolean }) {
  const [txt, setTxt] = useState(v === undefined ? '' : String(v));
  useEffect(() => { setTxt(v === undefined ? '' : String(v)); }, [v]);
  return <input className={'adm-num' + (v !== undefined ? ' set' : '')} style={{ width: w }} inputMode="decimal" disabled={dis} placeholder={fmtN(def)} value={txt}
    onChange={(e) => { const t = e.target.value.replace(',', '.'); setTxt(t); if (t.trim() === '') return on(undefined); const n = Number(t); if (Number.isFinite(n)) on(Math.min(max, Math.max(min, n))); }}
    onBlur={() => setTxt(v === undefined ? '' : String(v))} step={step} />;
}

export type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
export function GeneralTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const preset = (p: Partial<GameTuning>) => setT({ ...t, ...p });
  return (
    <>
      <section className="admin-sec">
        <h4>Hazır ayarlar</h4>
        <div className="row wrap">
          <button className="btn small" disabled={dis} onClick={() => preset({ xpMul: 2, gemMul: 1.5 })}>Çift TP etkinliği</button>
          <button className="btn small" disabled={dis} onClick={() => preset({ dropMul: 2.5 })}>Bol ganimet</button>
          <button className="btn small" disabled={dis} onClick={() => preset({ monsterHpMul: 0.7, monsterAtkMul: 0.7 })}>Kolay canavarlar</button>
          <button className="btn small" disabled={dis} onClick={() => preset({ monsterHpMul: 1.6, monsterAtkMul: 1.4, xpMul: 1.5 })}>Zor mod</button>
          <button className="btn small ghost" disabled={dis} onClick={() => setT(structuredClone(DEFAULT_TUNING))}>Her şeyi varsayılana dön</button>
        </div>
      </section>
      <section className="admin-sec">
        <h4>Duyuru</h4>
        <textarea className="admin-ta" maxLength={200} disabled={dis} placeholder="Oyunun üstünde herkese görünen kısa mesaj (boş bırakılırsa gizlenir)" value={t.announcement} onChange={(e) => setT({ ...t, announcement: e.target.value })} />
      </section>
      {ROWS.map((sec) => (
        <section className="admin-sec" key={sec.title}>
          <h4>{sec.title === 'Canavarlar' ? 'Bütün canavarlar' : sec.title}</h4>
          {sec.note && <div className="muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 6 }}>{sec.note}{sec.title === 'Canavarlar' ? ' Tür başına ayar "Canavarlar" bölmesinde.' : ''}</div>}
          {sec.items.map(([k, label, hint]) => {
            const [lo, hi, step] = TUNING_LIMITS[k];
            return (
              <label className="admin-row" key={k}>
                <span className="lab"><b>{label}</b>{hint && <small>{hint}</small>}</span>
                <input type="range" min={lo} max={hi} step={step} value={t[k]} disabled={dis} onChange={(e) => setT({ ...t, [k]: Number(e.target.value) })} />
                <span className={'val' + (t[k] !== DEFAULT_TUNING[k] ? ' changed' : '')}>{fmt(k, t[k])}</span>
              </label>
            );
          })}
        </section>
      ))}
    </>
  );
}

export function MonsterTab({ t, setMon, dis }: { t: GameTuning; setMon: (id: string, p: Partial<MonsterTune>) => void; dis: boolean }) {
  return (
    <section className="admin-sec">
      <h4>Canavar türleri</h4>
      <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Çarpanlar genel çarpanlarla birlikte uygulanır. Değişiklik yeni doğan canavarlara geçer. Örnek değerler Sv. 10 normal canavar içindir.</div>
      <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Canavar</th><th>Can ×</th><th>Saldırı ×</th><th>Savunma +</th><th>Hız ×</th><th>TP ×</th><th>Doğma ×</th></tr></thead>
        <tbody>{MONSTERS.map((d) => {
          const m = t.monsters[d.id] ?? {}, s = monsterStats(d, 10, 0);
          return (
            <tr key={d.id}>
              <td><b>{d.name}</b><small>Can {fmtN(Math.round(s.maxHp * (m.hpMul ?? 1)), 0)} · Sld {fmtN(Math.round(s.atk * (m.atkMul ?? 1)), 0)} · Hız {fmtN(Math.round(d.speed * (m.speedMul ?? 1)), 0)}</small></td>
              <td><Num v={m.hpMul} def={1} min={0.05} max={20} on={(v) => setMon(d.id, { hpMul: v })} dis={dis} w={58} /></td>
              <td><Num v={m.atkMul} def={1} min={0.05} max={20} on={(v) => setMon(d.id, { atkMul: v })} dis={dis} w={58} /></td>
              <td><Num v={m.defAdd} def={0} min={-200} max={2000} step={1} on={(v) => setMon(d.id, { defAdd: v })} dis={dis} w={58} /></td>
              <td><Num v={m.speedMul} def={1} min={0.2} max={3} on={(v) => setMon(d.id, { speedMul: v })} dis={dis} w={58} /></td>
              <td><Num v={m.xpMul} def={1} min={0} max={50} on={(v) => setMon(d.id, { xpMul: v })} dis={dis} w={58} /></td>
              <td><Num v={m.respawnMul} def={1} min={0.1} max={20} on={(v) => setMon(d.id, { respawnMul: v })} dis={dis} w={58} /></td>
            </tr>
          );
        })}</tbody>
      </table></div>
    </section>
  );
}

/** Bütün canavarlar için nadirlik: düşme çarpanı, satış fiyatı, silah ve zırh gücü. */
export function RarityTable({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const setRec = (k: 'rarityDrop' | 'sellPrice', r: string, v: number | undefined) => { const n = { ...t[k] }; if (v === undefined) delete n[r]; else n[r] = v; setT({ ...t, [k]: n }); };
  const setPow = (r: string, f: 'weapon' | 'armor', v: number | undefined) => {
    const cur = { ...(t.rarityPower[r] ?? {}) }; if (v === undefined) delete cur[f]; else cur[f] = v;
    const all = { ...t.rarityPower }; if (Object.keys(cur).length) all[r] = cur; else delete all[r];
    setT({ ...t, rarityPower: all });
  };
  return (
    <section className="admin-sec">
      <h4>Nadirlik ayarları (bütün canavarlar)</h4>
      <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Düşme çarpanı canavar ağırlıklarını çarpar (0 = o nadirlik hiç düşmez, 2 = iki kat). Güç çarpanı eşyanın taban gücünü çarpar: silah saldırıyı, zırh/takı savunma ve canı belirler. Varsayılan güçler canavar can ve saldırısına göre dengelendi.</div>
      <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Nadirlik</th><th>Düşme ×</th><th>Satış</th><th>Silah gücü ×</th><th>Zırh gücü ×</th></tr></thead>
        <tbody>{RARITIES.map((r) => (
          <tr key={r}>
            <td><b style={{ color: RARITY[r].color }}>{RARITY[r].name}</b><small>Gereken Sv. {RARITY[r].minLevel}</small></td>
            <td><Num v={t.rarityDrop[r]} def={1} min={0} max={100} dis={dis} w={58} on={(v) => setRec('rarityDrop', r, v)} /></td>
            <td><Num v={t.sellPrice[r]} def={SELL_PRICES[r] ?? 1} min={0} max={1e7} step={1} dis={dis} w={64} on={(v) => setRec('sellPrice', r, v)} /></td>
            <td><Num v={t.rarityPower[r]?.weapon} def={RARITY[r].weaponPower} min={0.1} max={50} dis={dis} w={58} on={(v) => setPow(r, 'weapon', v)} /></td>
            <td><Num v={t.rarityPower[r]?.armor} def={RARITY[r].power} min={0.1} max={50} dis={dis} w={58} on={(v) => setPow(r, 'armor', v)} /></td>
          </tr>
        ))}</tbody>
      </table></div>
    </section>
  );
}

export function LootTab({ t, setMon, dis }: { t: GameTuning; setMon: (id: string, p: Partial<MonsterTune>) => void; dis: boolean }) {
  const [id, setId] = useState(MONSTERS[0].id);
  const d = MONSTERS.find((x) => x.id === id)!;
  const theme = monsterTheme(id), prof = LOOT_PROFILES[theme] ?? LOOT_PROFILES.forest, m = t.monsters[id] ?? {};
  const chance = m.equipChance ?? prof.equipChance;
  const weights: Record<string, number> = Object.fromEntries(Object.entries(m.rarity ?? prof.rarityWeights).map(([k, w]) => [k, (w ?? 0) * (t.rarityDrop[k] ?? 1)]));
  const wsum = Object.values(weights).reduce((a, b) => a + (b || 0), 0);
  const setRar = (r: string, v: number | undefined) => {
    const next: Record<string, number> = { ...(m.rarity ?? (prof.rarityWeights as Record<string, number>)) };
    if (v === undefined || v === 0) delete next[r]; else next[r] = v;
    setMon(id, { rarity: Object.keys(next).length ? next : undefined });
  };
  const matIds = useMemo(() => MATERIALS.map((x) => x.id), []);
  const effective = (p: number) => p * t.dropMul; // genel düşme çarpanı
  const odds = (p: number) => (p <= 0 ? '—' : `≈ her ${fmtN(Math.max(1, 1 / p), 0)} öldürmede 1`);
  return (
    <>
      <section className="admin-sec">
        <h4>Canavar seç</h4>
        <div className="row wrap">
          {MONSTERS.map((x) => <button key={x.id} className={'btn small' + (x.id === id ? ' primary' : '')} onClick={() => setId(x.id)}>{x.name}{t.monsters[x.id] && (t.monsters[x.id].equipChance !== undefined || t.monsters[x.id].rarity || t.monsters[x.id].gems || t.monsters[x.id].essence || t.monsters[x.id].mats) ? ' •' : ''}</button>)}
        </div>
        <div className="muted" style={{ fontSize: 11, marginTop: 6 }}>{d.name}: varsayılanlar {MAPS[Object.keys(MAPS).find((k) => MAPS[k].theme === theme) ?? 'forest']?.name} ganimet profilinden gelir. Agresif canavar 1,35 kat, katil 2,4 kat daha çok bırakır; genel "Eşya ve malzeme düşme" çarpanı ({fmtN(t.dropMul)}×) da uygulanır.</div>
      </section>
      <section className="admin-sec">
        <h4>Ekipman düşmesi</h4>
        <label className="admin-row"><span className="lab"><b>Düşme şansı (%)</b><small>{odds(effective(chance))} (normal canavar)</small></span>
          <Num v={m.equipChance === undefined ? undefined : +(m.equipChance * 100).toFixed(3)} def={prof.equipChance * 100} min={0} max={100} on={(v) => setMon(id, { equipChance: v === undefined ? undefined : v / 100 })} dis={dis} /><span /></label>
        <div className="adm-table-wrap"><table className="adm-table">
          <thead><tr><th>Nadirlik</th><th>Ağırlık</th><th>Payı</th><th>Zorluk</th></tr></thead>
          <tbody>{RARITIES.map((r) => {
            const w = weights[r] ?? 0, share = wsum > 0 ? w / wsum : 0;
            return (
              <tr key={r}>
                <td><b style={{ color: RARITY[r].color }}>{RARITY[r].name}</b><small>Gereken Sv. {RARITY[r].minLevel}</small></td>
                <td><Num v={m.rarity ? m.rarity[r] : undefined} def={(prof.rarityWeights as Record<string, number>)[r] ?? 0} min={0} max={10000} step={1} on={(v) => setRar(r, v)} dis={dis} w={64} /></td>
                <td>%{fmtN(share * 100, 1)}</td>
                <td><small>{odds(effective(chance) * share)}</small></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
      <section className="admin-sec">
        <h4>Mücevher ve Öz (öldürme başına)</h4>
        {(['gems'] as const).map((k) => {
          const cur = m[k] ?? prof[k];
          return (
            <label className="admin-row" key={k}><span className="lab"><b>{k === 'gems' ? 'Mücevher' : 'Öz'} en az / en çok</b><small>Genel çarpan: {fmtN(k === 'gems' ? t.gemMul : t.essenceMul)}×</small></span>
              <span className="row" style={{ gap: 6 }}>
                <Num v={m[k]?.[0]} def={prof[k][0]} min={0} max={1e6} step={1} on={(v) => setMon(id, { [k]: v === undefined && !m[k] ? undefined : [v ?? prof[k][0], cur[1]] } as Partial<MonsterTune>)} dis={dis} w={64} />
                <Num v={m[k]?.[1]} def={prof[k][1]} min={0} max={1e6} step={1} on={(v) => setMon(id, { [k]: v === undefined && !m[k] ? undefined : [cur[0], v ?? prof[k][1]] } as Partial<MonsterTune>)} dis={dis} w={64} />
              </span><span /></label>
          );
        })}
      </section>
      <section className="admin-sec">
        <h4>Malzemeler</h4>
        <div className="adm-table-wrap"><table className="adm-table">
          <thead><tr><th>Malzeme</th><th>Şans (%)</th><th>Zorluk</th></tr></thead>
          <tbody>{matIds.map((mid) => {
            const def = prof.materials.find((x) => x.id === mid)?.chance ?? 0;
            const cur = m.mats?.[mid] ?? def, md = MATERIALS.find((x) => x.id === mid)!;
            return (
              <tr key={mid}>
                <td><b style={{ color: md.color }}>{md.name}</b></td>
                <td><Num v={m.mats?.[mid] === undefined ? undefined : +(m.mats[mid] * 100).toFixed(3)} def={def * 100} min={0} max={100} on={(v) => { const mats = { ...(m.mats ?? {}) }; if (v === undefined) delete mats[mid]; else mats[mid] = v / 100; setMon(id, { mats: Object.keys(mats).length ? mats : undefined }); }} dis={dis} w={64} /></td>
                <td><small>{odds(effective(cur))}</small></td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </section>
    </>
  );
}

/** Demirci: 6 kademenin şansı, Mücevher bedeli, malzemeleri ve kazandırdığı güç. */
export function UpgradeTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const steps: UpgradeStepTune[] = t.upgrade.steps?.length === MAX_PLUS ? t.upgrade.steps : DEFAULT_UPGRADE.map(({ target, ...s }) => { void target; return structuredClone(s); });
  const custom = t.upgrade.steps?.length === MAX_PLUS;
  const put = (i: number, patch: Partial<UpgradeStepTune>) => {
    const n = steps.map((s, j) => (j === i ? { ...s, ...patch } : s));
    setT({ ...t, upgrade: { ...t.upgrade, steps: n } });
  };
  const setMat = (i: number, oldKey: string | null, key: string, qty: number) => {
    const mats = { ...steps[i].mats };
    if (oldKey && oldKey !== key) delete mats[oldKey];
    if (key && qty > 0) mats[key] = qty; else if (key) delete mats[key];
    put(i, { mats });
  };
  const matOpts = MATERIALS.filter((m) => !['red_potion', 'starter_chest', 'mastery_seal'].includes(m.id));
  return (
    <>
      <section className="admin-sec">
        <h4>Artı basma (Demirci)</h4>
        <div className="muted" style={{ fontSize: 11.5, marginBottom: 8 }}>Yalnız silah ve gövde zırhına basılır, en çok +{MAX_PLUS}. "Güç %" o kademeye ulaşınca eşyanın temel gücüne eklenen <b>toplam</b> yüzdedir (silah saldırı, zırh savunma/can). Her kademede en çok 6 malzeme.</div>
        <label className="row" style={{ fontSize: 13, marginBottom: 8 }}><input type="checkbox" disabled={dis} checked={t.upgrade.failDown ?? true} onChange={(e) => setT({ ...t, upgrade: { ...t.upgrade, failDown: e.target.checked } })} /> Başarısızlıkta eşya bir kademe düşsün</label>
        <div className="row wrap">
          <span className={'pill' + (custom ? '' : ' ok')}>{custom ? 'Özel tablo' : 'Varsayılan tablo'}</span>
          {custom && <button className="btn small ghost" disabled={dis} onClick={() => setT({ ...t, upgrade: { ...t.upgrade, steps: undefined } })}>Varsayılana dön</button>}
        </div>
      </section>
      <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Kademe</th><th>Şans %</th><th>Mücevher</th><th>Silah gücü %</th><th>Zırh gücü %</th><th>Malzemeler (ad · adet)</th></tr></thead>
        <tbody>{steps.map((s, i) => (
          <tr key={i}>
            <td><b>+{i + 1}</b><small>{i === 4 ? '+5 efekti' : i === 5 ? '+6 efekti' : ''}</small></td>
            <td><Num v={custom ? s.chance : undefined} def={s.chance} min={0} max={100} step={1} w={58} dis={dis} on={(v) => put(i, { chance: v ?? DEFAULT_UPGRADE[i].chance })} /></td>
            <td><Num v={custom ? s.gems : undefined} def={s.gems} min={0} max={1e7} step={1} w={78} dis={dis} on={(v) => put(i, { gems: Math.round(v ?? DEFAULT_UPGRADE[i].gems) })} /></td>
            <td><Num v={custom ? s.weapon : undefined} def={s.weapon} min={0} max={1000} step={1} w={58} dis={dis} on={(v) => put(i, { weapon: v ?? DEFAULT_UPGRADE[i].weapon })} /></td>
            <td><Num v={custom ? s.armor : undefined} def={s.armor} min={0} max={1000} step={1} w={58} dis={dis} on={(v) => put(i, { armor: v ?? DEFAULT_UPGRADE[i].armor })} /></td>
            <td>
              <div className="col" style={{ gap: 4 }}>
                {Object.entries(s.mats).map(([k, q]) => (
                  <div key={k} className="row" style={{ gap: 4 }}>
                    <select className="adm-sel" disabled={dis} value={k} onChange={(e) => setMat(i, k, e.target.value, q)}>{matOpts.map((m) => <option key={m.id} value={m.id} disabled={m.id !== k && m.id in s.mats}>{m.name}</option>)}</select>
                    <Num v={q} def={q} min={0} max={9999} step={1} w={58} dis={dis} on={(v) => setMat(i, k, k, Math.round(v ?? 0))} />
                    <button className="btn small ghost" disabled={dis} onClick={() => setMat(i, k, k, 0)} aria-label="Kaldır">✕</button>
                  </div>
                ))}
                {Object.keys(s.mats).length < 6 && <button className="btn small ghost" disabled={dis} onClick={() => { const f = matOpts.find((m) => !(m.id in s.mats)); if (f) setMat(i, null, f.id, 1); }}>+ Malzeme</button>}
              </div>
            </td>
          </tr>
        ))}</tbody>
      </table></div>
    </>
  );
}

/** Paylar: toplamı 100 olan yüzdeler. Biri değişince diğerleri oranları korunarak 100'e tamamlanır. */
function shares(w: readonly number[]) { const tot = w.reduce((a, b) => a + b, 0) || 1; return w.map((x) => (x / tot) * 100); }
function reshare(cur: number[], i: number, pct: number) {
  pct = Math.max(0, Math.min(100, pct));
  const rest = cur.reduce((a, b, k) => (k === i ? a : a + b), 0);
  const left = 100 - pct;
  const out = cur.map((x, k) => (k === i ? pct : rest > 0 ? (x / rest) * left : left / (cur.length - 1)));
  // tam sayıya yuvarla, farkı en büyük diğer paya yükle
  const r = out.map((x) => Math.round(x)); const diff = 100 - r.reduce((a, b) => a + b, 0);
  if (diff) { let m = -1; r.forEach((x, k) => { if (k !== i && (m < 0 || x > r[m])) m = k; }); if (m >= 0) r[m] = Math.max(0, r[m] + diff); }
  return r;
}
const SHARE_COLORS = ['#9aa3b5', '#5fa8ff', '#e2b250', '#e2654c'];
function ShareBar({ parts }: { parts: { v: number; c: string; l: string }[] }) {
  return <div className="share-bar">{parts.filter((p) => p.v > 0.4).map((p, k) => <i key={k} style={{ width: `${p.v}%`, background: p.c }} title={`${p.l}: %${fmtN(p.v, 1)}`} />)}</div>;
}
function ShareRow({ label, pct, color, dis, on }: { label: string; pct: number; color: string; dis: boolean; on: (v: number) => void }) {
  return (
    <label className="share-row">
      <span className="lab"><i style={{ background: color }} />{label}</span>
      <input type="range" min={0} max={100} step={1} value={Math.round(pct)} disabled={dis} onChange={(e) => on(Number(e.target.value))} />
      <span className="val">%{fmtN(pct, 0)}</span>
    </label>
  );
}
const ENCH_GROUPS: [string, string, string][] = [['white', 'Sıradan eşyalar', 'Beyaz'], ['blue', 'Mavi eşyalar', 'Mavi'], ['orange', 'Turuncu eşyalar', 'Turuncu'], ['default', 'Kızıl ve üstü', 'Kızıl, eşsiz…']];
const TIER_NAMES = ['Zayıf (I)', 'Orta (II)', 'Güçlü (III)', 'Çok güçlü (IV)'];

/** Efsunlar: sade düzen. Efsunlu düşme oranı + efsun sayısı payları (nadirlik başına), kademe payları, efsun listesi. */
export function EnchantTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const et = t.enchants;
  const setEt = (p: Partial<GameTuning['enchants']>) => { const n = { ...et, ...p } as Record<string, unknown>; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]; setT({ ...t, enchants: n as GameTuning['enchants'] }); };
  const defCw = (r: string) => (ENCHANT_COUNT_WEIGHTS as Record<string, [number, number, number, number]>)[r] ?? ENCHANT_COUNT_WEIGHTS.default;
  const cwOf = (r: string) => shares(et.countWeights?.[r] ?? defCw(r));
  const setCw = (r: string, next: number[]) => {
    const cw = { ...(et.countWeights ?? {}) };
    const d = shares(defCw(r)).map((x) => Math.round(x));
    if (next.every((x, k) => Math.abs(x - d[k]) < 0.5)) delete cw[r]; else cw[r] = next as [number, number, number, number];
    setEt({ countWeights: Object.keys(cw).length ? cw : undefined });
  };
  const chanceOf = (r: string) => (et.chance?.[r] ?? 1) * 100;
  const setChance = (r: string, pct: number) => { const c = { ...(et.chance ?? {}) }; if (pct >= 100) delete c[r]; else c[r] = Math.max(0, pct) / 100; setEt({ chance: Object.keys(c).length ? c : undefined }); };
  const tw = shares(et.tierWeights ?? ENCHANT_TIER_WEIGHTS);
  const setTw = (next: number[]) => { const d = shares(ENCHANT_TIER_WEIGHTS).map((x) => Math.round(x)); setEt({ tierWeights: next.every((x, k) => Math.abs(x - d[k]) < 0.5) ? undefined : next as [number, number, number, number] }); };
  const off = new Set(et.disabled ?? []);
  const ids = Object.keys(ENCHANTS).filter((k) => !ENCHANTS[k as keyof typeof ENCHANTS].legacy);
  const [openId, setOpenId] = useState<string | null>(null);
  return (
    <>
      <section className="admin-sec">
        <h4>Efsunlu düşme</h4>
        <div className="muted adm-hint">Canavardan düşen eşyanın efsunlu gelme olasılığı ve efsunluysa kaç efsun taşıyacağı. Bir kaydırıcıyı oynatınca diğerleri toplam %100 olacak şekilde kendiliğinden ayarlanır.</div>
        <div className="ench-groups">
          {ENCH_GROUPS.map(([r, title, sub]) => {
            const ch = chanceOf(r), cw = cwOf(r);
            const real = [100 - ch, ...cw.map((x) => (x * ch) / 100)];
            return (
              <div className="ench-card" key={r}>
                <div className="ench-hd"><b>{title}</b><small>{sub}</small></div>
                <label className="share-row big">
                  <span className="lab">Efsunlu düşme oranı</span>
                  <input type="range" min={0} max={100} step={1} value={Math.round(ch)} disabled={dis} onChange={(e) => setChance(r, Number(e.target.value))} />
                  <span className="val">%{fmtN(ch, 0)}</span>
                </label>
                <div className="ench-sub">Efsunlu düşenlerin efsun sayısı</div>
                {[0, 1, 2, 3].map((k) => <ShareRow key={k} label={`${k + 1} efsunlu`} pct={cw[k]} color={SHARE_COLORS[k]} dis={dis} on={(v) => setCw(r, reshare(cw.map((x) => Math.round(x)), k, v))} />)}
                <ShareBar parts={[{ v: real[0], c: '#3a2e22', l: 'Efsunsuz' }, ...cw.map((_, k) => ({ v: real[k + 1], c: SHARE_COLORS[k], l: `${k + 1} efsunlu` }))]} />
                <div className="ench-sum">100 eşyadan ≈ {fmtN(real[0], 0)} efsunsuz · {real.slice(1).map((x, k) => `${fmtN(x, 0)} tanesi ${k + 1}`).join(' · ')} efsunlu</div>
              </div>
            );
          })}
        </div>
      </section>
      <section className="admin-sec">
        <h4>Efsun gücü</h4>
        <div className="muted adm-hint">Her efsunun hangi güçte (kademede) geleceği. Değerler aşağıdaki listede.</div>
        <div className="ench-card">
          {[0, 1, 2, 3].map((k) => <ShareRow key={k} label={TIER_NAMES[k]} pct={tw[k]} color={SHARE_COLORS[k]} dis={dis} on={(v) => setTw(reshare(tw.map((x) => Math.round(x)), k, v))} />)}
          <ShareBar parts={tw.map((v, k) => ({ v, c: SHARE_COLORS[k], l: TIER_NAMES[k] }))} />
        </div>
      </section>
      <section className="admin-sec">
        <h4>Efsun listesi</h4>
        <div className="muted adm-hint">Kapalı efsunlar yeni düşen eşyalarda çıkmaz. Değerler yeni düşen eşyalara uygulanır; mevcut eşyalar değişmez.</div>
        <div className="ench-list">
          {ids.map((k) => {
            const e = ENCHANTS[k as keyof typeof ENCHANTS], vals = et.values?.[k] ?? e.tiers, on = !off.has(k), open = openId === k;
            return (
              <div key={k} className={'ench-item' + (on ? '' : ' off')}>
                <div className="ench-row">
                  <button type="button" className={'switch' + (on ? ' on' : '')} disabled={dis} aria-pressed={on} aria-label={on ? 'Kapat' : 'Aç'} onClick={() => { const s2 = new Set(off); if (on) s2.add(k); else s2.delete(k); setEt({ disabled: s2.size ? [...s2] : undefined }); }}><i /></button>
                  <button type="button" className="ench-name" onClick={() => setOpenId(open ? null : k)}>
                    <b>{e.name}</b><small>{vals.map((v) => `${v}${e.unit}`).join(' / ')}</small>
                  </button>
                  <span className="chev">{open ? '▴' : '▾'}</span>
                </div>
                {open && (
                  <div className="ench-edit">
                    <div className="muted" style={{ fontSize: 11.5 }}>{e.desc}</div>
                    <div className="adm-fields four">
                      {[0, 1, 2, 3].map((i) => (
                        <label key={i}><span>{TIER_NAMES[i]}</span><Num v={et.values?.[k]?.[i]} def={e.tiers[i]} min={0} max={100000} step={1} dis={dis} w={70} on={(v) => { const cur = [...(et.values?.[k] ?? e.tiers)] as [number, number, number, number]; cur[i] = v ?? e.tiers[i]; const all = { ...(et.values ?? {}) }; if (cur.every((x, j) => x === e.tiers[j])) delete all[k]; else all[k] = cur; setEt({ values: Object.keys(all).length ? all : undefined }); }} /></label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}

// ───────── seviye kasılma dengesi ─────────
const BRACKETS: [number, number, string][] = [
  [1, 10, 'Hızlı başlangıç'], [10, 20, 'Kademeli ilerleme'], [20, 30, 'Kademeli ilerleme'], [30, 40, 'Kademeli ilerleme'],
  [40, 45, 'Zorlu son seviyeler'], [45, 50, 'Zorlu son seviyeler'], [50, 55, 'Zorlu son seviyeler'], [55, 60, 'Zorlu son seviyeler'], [60, 65, 'Zorlu son seviyeler'],
];
const fmtMin = (m: number) => (m < 120 ? `${fmtN(m, 0)} dakika` : m < 60 * 48 ? `${Math.floor(m / 60)} sa ${Math.round(m % 60)} dk` : `${fmtN(m / 60 / 24, 1)} gün`);
export function LevelTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const custom = t.xpTable?.length === LEVEL_CAP_BASE - 1;
  const table = custom ? t.xpTable! : [...DEFAULT_XP_TABLE];
  const [tpm, setTpm] = useState(() => { try { return Number(localStorage.getItem('adm_tpm')) || 300; } catch { return 300; } });
  const [open, setOpen] = useState<number | null>(null);
  const put = (next: number[]) => setT({ ...t, xpTable: next.every((v, i) => v === DEFAULT_XP_TABLE[i]) ? undefined : next });
  const scale = (a: number, b: number, f: number) => put(table.map((v, i) => (i + 1 >= a && i + 1 < b ? Math.max(1, Math.round(v * f)) : v)));
  const bad = table.map((v, i) => i > 0 && v < table[i - 1]);
  const fixOrder = () => { const n = [...table]; for (let i = 1; i < n.length; i++) if (n[i] < n[i - 1]) n[i] = n[i - 1]; put(n); };
  const sum = (a: number, b: number) => table.slice(a - 1, b - 1).reduce((x, y) => x + y, 0);
  const total = sum(1, LEVEL_CAP_BASE);
  return (
    <>
      <section className="admin-sec">
        <h4>Seviye kasılma dengesi <span className="pill ok" style={{ marginLeft: 6 }}>En fazla {LEVEL_CAP_BASE}</span></h4>
        <div className="muted adm-hint">İlk 10 seviye hızlı, son seviyeler zor. TP bedelini artırmak kasılmayı yavaşlatır. Kaydedince oyundaki oyuncuların seviyesi ve seviye içindeki ilerleme oranı korunur. Süreler tahminidir; ekipman, grup ve TP çarpanı sonucu değiştirir.</div>
        <div className="row wrap" style={{ gap: 8 }}>
          <button className="btn small" disabled={dis} onClick={() => scale(1, LEVEL_CAP_BASE, 0.9)}>Tümünü %10 kolaylaştır</button>
          <button className="btn small" disabled={dis} onClick={() => scale(1, LEVEL_CAP_BASE, 1.1)}>Tümünü %10 zorlaştır</button>
          <label className="adm-inline"><span>Tahmin için dakikada kazanılan TP</span><Num v={tpm} def={300} min={1} max={1e7} step={1} w={86} on={(v) => { const n = v ?? 300; setTpm(n); try { localStorage.setItem('adm_tpm', String(n)); } catch { /* */ } }} /></label>
        </div>
        <div className="lvl-total">1 → {LEVEL_CAP_BASE}: <b>{fmtN(total, 0)} TP</b> · ≈ {fmtMin(total / tpm)}{custom ? '' : ' · varsayılan tablo'}</div>
        {bad.some(Boolean) && <div className="lvl-warn">Sıra bozuk: Sv. {bad.map((b, i) => (b ? i + 1 : 0)).filter(Boolean).join(', ')} bir önceki seviyeden daha ucuz. <button className="btn small" disabled={dis} onClick={fixOrder}>Sırayı düzelt</button></div>}
      </section>
      <div className="lvl-grid">
        {BRACKETS.map(([a, b, label], bi) => {
          const s = sum(a, b), hasBad = bad.slice(a - 1, b - 1).some(Boolean);
          return (
            <div className={'lvl-card' + (hasBad ? ' bad' : '')} key={a}>
              <div className="lvl-hd"><b>{a} → {b}</b><small>{label}</small></div>
              <div className="lvl-tp">{fmtN(s, 0)} TP</div>
              <div className="muted lvl-time">Girilen hıza göre ≈ {fmtMin(s / tpm)}</div>
              <div className="row" style={{ gap: 6 }}>
                <button className="btn small" disabled={dis} onClick={() => scale(a, b, 0.9)}>%10 Kolaylaştır</button>
                <button className="btn small" disabled={dis} onClick={() => scale(a, b, 1.1)}>%10 Zorlaştır</button>
              </div>
              <button type="button" className="lvl-more" onClick={() => setOpen(open === bi ? null : bi)}>{open === bi ? '▾' : '▸'} Seviyeleri tek tek düzenle</button>
              {open === bi && (
                <div className="lvl-rows">
                  {table.slice(a - 1, b - 1).map((v, k) => {
                    const L = a + k;
                    return <label key={L} className={bad[L - 1] ? 'bad' : ''}><span>Sv. {L} → {L + 1}</span><Num v={custom ? v : undefined} def={v} min={1} max={1e9} step={1} dis={dis} w={110} on={(nv) => { const n = [...table]; n[L - 1] = Math.max(1, Math.round(nv ?? DEFAULT_XP_TABLE[L - 1])); put(n); }} /></label>;
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="row" style={{ marginTop: 10 }}><button className="btn small ghost" disabled={dis || !custom} onClick={() => setT({ ...t, xpTable: undefined })}>Varsayılan tabloya dön</button></div>
    </>
  );
}

export function MapTab({ t, setT, setSpawn, dis }: { t: GameTuning; setT: SetT; setSpawn: (k: string, p: Partial<SpawnTune>) => void; dis: boolean }) {
  return (
    <>{Object.values(MAPS).filter((m) => m.spawns.length).map((m) => {
      const dens = t.density[m.id] ?? 1;
      return (
        <section className="admin-sec" key={m.id}>
          <h4>{m.name}</h4>
          <label className="admin-row"><span className="lab"><b>Genel yoğunluk</b><small>Bütün grupların sayısını çarpar</small></span>
            <input type="range" min={DENSITY_LIMITS[0]} max={DENSITY_LIMITS[1]} step={DENSITY_LIMITS[2]} value={dens} disabled={dis} onChange={(e) => setT({ ...t, density: { ...t.density, [m.id]: Number(e.target.value) } })} />
            <span className={'val' + (dens !== 1 ? ' changed' : '')}>{fmtN(dens)}×</span></label>
          <div className="adm-table-wrap"><table className="adm-table">
            <thead><tr><th>Grup</th><th>Sayı</th><th>Sv. en az</th><th>Sv. en çok</th><th>Normal</th><th>Agresif</th><th>Katil</th></tr></thead>
            <tbody>{m.spawns.map((g, i) => {
              const key = m.id + ':' + i, o = t.spawns[key] ?? {}, md = MONSTERS.find((x) => x.id === g.monster);
              const lv = o.level ?? g.level, va = o.variants ?? g.variants;
              return (
                <tr key={key}>
                  <td><b>{md?.name ?? g.monster}</b><small>{g.region === 'near' ? 'Yakın' : g.region === 'mid' ? 'Orta' : g.region === 'far' ? 'Uzak' : 'Her yer'} bölge</small></td>
                  <td><Num v={o.count} def={g.count} min={0} max={400} step={1} dis={dis} w={54} on={(v) => setSpawn(key, { count: v })} /></td>
                  <td><Num v={o.level?.[0]} def={g.level[0]} min={1} max={120} step={1} dis={dis} w={50} on={(v) => setSpawn(key, { level: v === undefined && !o.level ? undefined : [v ?? g.level[0], lv[1]] })} /></td>
                  <td><Num v={o.level?.[1]} def={g.level[1]} min={1} max={120} step={1} dis={dis} w={50} on={(v) => setSpawn(key, { level: v === undefined && !o.level ? undefined : [lv[0], v ?? g.level[1]] })} /></td>
                  {[0, 1, 2].map((vi) => <td key={vi}><Num v={o.variants?.[vi]} def={g.variants[vi]} min={0} max={1000} step={1} dis={dis} w={50} on={(v) => { const n = [...va] as [number, number, number]; n[vi] = v ?? g.variants[vi]; setSpawn(key, { variants: n.every((x, j) => x === g.variants[j]) ? undefined : n }); }} /></td>)}
                </tr>
              );
            })}</tbody>
          </table></div>
        </section>
      );
    })}<div className="muted" style={{ fontSize: 11 }}>Kaydedince haritanın canavar yuvaları oyun açıkken yeniden kurulur.</div></>
  );
}

/** Oyunun üstünde duyuru şeridi (boşsa görünmez). */
export function AnnouncementBar() {
  const [text, setText] = useState(TUNING.announcement);
  useEffect(() => onConfig((t) => setText(t.announcement)), []);
  if (!text.trim()) return null;
  return <div className="announce" role="status">{text}</div>;
}

/** Yönetim düğmesi: yalnız düzenleme yetkisi olanlara görünür. */
export function useCanAdmin() {
  const [ok, setOk] = useState(configState.canEdit);
  useEffect(() => onConfig(() => setOk(configState.canEdit)), []);
  return ok;
}
