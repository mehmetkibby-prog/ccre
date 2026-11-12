import React, { useEffect, useMemo, useState } from 'react';
import {
  DEFAULT_TUNING, TUNING, TUNING_LIMITS, DENSITY_LIMITS, MAPS, MONSTERS, LOOT_PROFILES, RARITY, RARITIES, MATERIALS, ENCHANTS,
  ENCHANT_COUNT_WEIGHTS, ENCHANT_TIER_WEIGHTS, SELL_PRICES, MAX_PLUS, DEFAULT_UPGRADE, type UpgradeStepTune, monsterStats, sanitizeTuning, type GameTuning, type MonsterTune, type SpawnTune,
} from '@col/shared';
import { configState, onConfig, saveConfig } from './config.ts';
import { OFFLINE } from '../mode.ts';
import type { AdminPlayer } from '../offline/local.ts';
type NumKey = keyof typeof TUNING_LIMITS;
const ROWS: { title: string; note?: string; items: [NumKey, string, string][] }[] = [
  { title: 'Ekonomi ve ödüller', items: [
    ['xpMul', 'Deneyim (TP) çarpanı', '2 = çift TP etkinliği'],
    ['gemMul', 'Mücevher çarpanı', 'Canavardan düşen mücevher'],
    ['essenceMul', 'Öz çarpanı', 'Canavardan düşen öz'],
    ['dropMul', 'Eşya ve malzeme düşme', 'Ekipman ve malzeme düşme şansı'],
  ] },
  { title: 'Canavarlar', note: 'Can ve saldırı, yeni doğan canavarlara uygulanır.', items: [
    ['monsterHpMul', 'Canavar canı', ''],
    ['monsterAtkMul', 'Canavar saldırısı', ''],
    ['respawnMul', 'Yeniden doğma süresi', '0,5 = iki kat hızlı doğar'],
  ] },
  { title: 'Dünya', items: [
    ['bots', 'Test botu sayısı', 'Köyde dolaşan / ormanda avlanan oyuncular'],
    ['worldDecayMul', 'Dünya Sağlığı azalma hızı', '0 = hiç azalmaz'],
    ['brightness', 'Işık seviyesi', 'Bütün haritaların parlaklığı'],
  ] },
];
const DENSITY_MAPS = Object.values(MAPS).filter((m) => m.spawns.length > 0);
const fmt = (k: NumKey, v: number) => (k === 'bots' ? String(v) : v.toLocaleString('tr-TR', { maximumFractionDigits: 2 }) + '×');

type Tab = 'genel' | 'canavar' | 'ganimet' | 'efsun' | 'arti' | 'harita' | 'oyuncu';
const TABS: [Tab, string][] = [['genel', 'Genel'], ['canavar', 'Canavarlar'], ['ganimet', 'Ganimet'], ['efsun', 'Efsunlar'], ['arti', 'Artı Basma'], ['harita', 'Haritalar'], ['oyuncu', 'Oyuncular']];
const fmtN = (n: number, d = 2) => n.toLocaleString('tr-TR', { maximumFractionDigits: d });
/** Canavarın göründüğü ilk haritanın teması → varsayılan ganimet profili. */
function monsterTheme(id: string) {
  for (const m of Object.values(MAPS)) if (m.spawns.some((g) => g.monster === id)) return m.theme;
  return 'forest';
}
/** Boş = varsayılan. Sayı kutusu; yer tutucu varsayılanı gösterir. */
function Num({ v, def, on, min, max, step = 0.01, w = 72, dis }: { v: number | undefined; def: number; on: (n: number | undefined) => void; min: number; max: number; step?: number; w?: number; dis?: boolean }) {
  const [txt, setTxt] = useState(v === undefined ? '' : String(v));
  useEffect(() => { setTxt(v === undefined ? '' : String(v)); }, [v]);
  return <input className={'adm-num' + (v !== undefined ? ' set' : '')} style={{ width: w }} inputMode="decimal" disabled={dis} placeholder={fmtN(def)} value={txt}
    onChange={(e) => { const t = e.target.value.replace(',', '.'); setTxt(t); if (t.trim() === '') return on(undefined); const n = Number(t); if (Number.isFinite(n)) on(Math.min(max, Math.max(min, n))); }}
    onBlur={() => setTxt(v === undefined ? '' : String(v))} step={step} />;
}

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState<GameTuning>(() => structuredClone(TUNING));
  const [base, setBase] = useState<string>(() => JSON.stringify(sanitizeTuning(TUNING)));
  const [tab, setTab] = useState<Tab>('genel');
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  useEffect(() => onConfig((next) => {
    const fresh = JSON.stringify(sanitizeTuning(next));
    setT((cur) => (JSON.stringify(sanitizeTuning(cur)) === base ? structuredClone(next) : cur));
    setBase(fresh); force((n) => n + 1);
  }), [base]);
  const canEdit = configState.canEdit, dis = !canEdit;
  const dirty = JSON.stringify(sanitizeTuning(t)) !== base;
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await saveConfig(t); setMsg({ ok: true, text: 'Kaydedildi. Oyundaki herkes yeni ayarları hemen kullanır.' }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };
  const setMon = (id: string, patch: Partial<MonsterTune>) => setT((cur) => {
    const m = { ...(cur.monsters[id] ?? {}), ...patch } as Record<string, unknown>;
    for (const k of Object.keys(m)) if (m[k] === undefined) delete m[k];
    const monsters = { ...cur.monsters }; if (Object.keys(m).length) monsters[id] = m as MonsterTune; else delete monsters[id];
    return { ...cur, monsters };
  });
  const setSpawn = (key: string, patch: Partial<SpawnTune>) => setT((cur) => {
    const m = { ...(cur.spawns[key] ?? {}), ...patch } as Record<string, unknown>;
    for (const k of Object.keys(m)) if (m[k] === undefined) delete m[k];
    const spawns = { ...cur.spawns }; if (Object.keys(m).length) spawns[key] = m as SpawnTune; else delete spawns[key];
    return { ...cur, spawns };
  });
  return (
    <div className="overlay admin-ov" onPointerDown={(e) => e.stopPropagation()}>
      <div className="frame panel admin admin-wide" role="dialog" aria-label="Yönetim paneli">
        <div className="hd"><span className="title">Yönetim Paneli</span><button className="x" onClick={onClose} aria-label="Kapat">✕</button></div>
        <div className="adm-tabs" role="tablist">
          {TABS.map(([k, l]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{l}</button>)}
        </div>
        <div className="bd">
          <div className="admin-status">
            {canEdit ? <span className="pill ok">Yönetici</span> : <span className="pill">Yalnız görüntüleme</span>}
            <span className="muted">{configState.live ? 'Ayarlar paylaşılan kayıtta. "Kaydet ve uygula" ile oyunu açan herkese geçer. Boş kutu = varsayılan.' : configState.error || 'Ayar kaydına bağlanılıyor…'}</span>
          </div>
          {tab === 'genel' && <GeneralTab t={t} setT={setT} dis={dis} />}
          {tab === 'canavar' && <MonsterTab t={t} setMon={setMon} dis={dis} />}
          {tab === 'ganimet' && <><RarityTable t={t} setT={setT} dis={dis} /><LootTab t={t} setMon={setMon} dis={dis} /></>}
          {tab === 'efsun' && <EnchantTab t={t} setT={setT} dis={dis} />}
          {tab === 'arti' && <UpgradeTab t={t} setT={setT} dis={dis} />}
          {tab === 'harita' && <MapTab t={t} setT={setT} setSpawn={setSpawn} dis={dis} />}
          {tab === 'oyuncu' && <PlayerTab dis={dis} />}
          {msg && <div className={msg.ok ? 'okmsg' : 'err'}>{msg.text}</div>}
        </div>
        <div className="admin-ft">
          <span className="muted" style={{ fontSize: 12 }}>{dirty ? 'Kaydedilmemiş değişiklik var' : 'Değişiklik yok'}</span>
          <div className="spacer" />
          <button className="btn small ghost" disabled={!dirty || busy} onClick={() => setT(JSON.parse(base))}>Geri al</button>
          <button className="btn small primary" disabled={!canEdit || !dirty || busy} onClick={save}>{busy ? 'Kaydediliyor…' : 'Kaydet ve uygula'}</button>
        </div>
      </div>
    </div>
  );
}

type SetT = React.Dispatch<React.SetStateAction<GameTuning>>;
function GeneralTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const preset = (p: Partial<GameTuning>) => setT({ ...t, ...p });
  return (
    <>
      <section className="admin-sec">
        <h4>Hazır ayarlar</h4>
        <div className="row wrap">
          <button className="btn small" disabled={dis} onClick={() => preset({ xpMul: 2, gemMul: 1.5, essenceMul: 1.5 })}>Çift TP etkinliği</button>
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
          {sec.note && <div className="muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 6 }}>{sec.note} Tür başına ayar "Canavarlar" bölmesinde.</div>}
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

function MonsterTab({ t, setMon, dis }: { t: GameTuning; setMon: (id: string, p: Partial<MonsterTune>) => void; dis: boolean }) {
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
function RarityTable({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
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

function LootTab({ t, setMon, dis }: { t: GameTuning; setMon: (id: string, p: Partial<MonsterTune>) => void; dis: boolean }) {
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
        {(['gems', 'essence'] as const).map((k) => {
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

const CW_ROWS: [string, string][] = [['white', 'Sıradan'], ['blue', 'Mavi'], ['orange', 'Turuncu'], ['default', 'Kızıl ve üstü']];
/** Demirci: 6 kademenin şansı, Mücevher bedeli, malzemeleri ve kazandırdığı güç. */
function UpgradeTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
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

function EnchantTab({ t, setT, dis }: { t: GameTuning; setT: SetT; dis: boolean }) {
  const et = t.enchants;
  const setEt = (p: Partial<GameTuning['enchants']>) => { const n = { ...et, ...p } as Record<string, unknown>; for (const k of Object.keys(n)) if (n[k] === undefined) delete n[k]; setT({ ...t, enchants: n as GameTuning['enchants'] }); };
  const defCw = (r: string) => (ENCHANT_COUNT_WEIGHTS as Record<string, [number, number, number, number]>)[r] ?? ENCHANT_COUNT_WEIGHTS.default;
  const setCw = (r: string, i: number, v: number | undefined) => {
    const cur = [...(et.countWeights?.[r] ?? defCw(r))] as [number, number, number, number];
    cur[i] = v ?? defCw(r)[i];
    const cw = { ...(et.countWeights ?? {}) }; cw[r] = cur;
    if (cur.every((x, k) => x === defCw(r)[k])) delete cw[r];
    setEt({ countWeights: Object.keys(cw).length ? cw : undefined });
  };
  const tw = et.tierWeights ?? (ENCHANT_TIER_WEIGHTS as unknown as [number, number, number, number]);
  const off = new Set(et.disabled ?? []);
  const ids = Object.keys(ENCHANTS).filter((k) => !ENCHANTS[k as keyof typeof ENCHANTS].legacy);
  return (
    <>
      <section className="admin-sec">
        <h4>Düşen eşyada efsun sayısı</h4>
        <div className="muted" style={{ fontSize: 11, marginBottom: 6 }}>Canavardan düşen her eşya 1, 2, 3 ya da 4 efsunlu olur. Ağırlıklar nadirliğe göre; yüzdeler otomatik hesaplanır.</div>
        <div className="adm-table-wrap"><table className="adm-table">
          <thead><tr><th>Nadirlik</th><th>1 efsun</th><th>2 efsun</th><th>3 efsun</th><th>4 efsun</th></tr></thead>
          <tbody>{CW_ROWS.map(([r, l]) => {
            const cur = et.countWeights?.[r] ?? defCw(r), sum = cur.reduce((a, b) => a + b, 0) || 1;
            return <tr key={r}><td><b>{l}</b></td>{[0, 1, 2, 3].map((i) => <td key={i}><Num v={et.countWeights?.[r]?.[i]} def={defCw(r)[i]} min={0} max={1000} step={1} on={(v) => setCw(r, i, v)} dis={dis} w={54} /><small>%{fmtN(cur[i] / sum * 100, 0)}</small></td>)}</tr>;
          })}</tbody>
        </table></div>
      </section>
      <section className="admin-sec">
        <h4>Kademe oranı</h4>
        <div className="row wrap">{[0, 1, 2, 3].map((i) => (
          <label key={i} className="row" style={{ gap: 6 }}><span>{i + 1}. kademe</span>
            <Num v={et.tierWeights?.[i]} def={ENCHANT_TIER_WEIGHTS[i]} min={0} max={1000} step={1} dis={dis} w={56} on={(v) => { const n = [...tw] as [number, number, number, number]; n[i] = v ?? ENCHANT_TIER_WEIGHTS[i]; setEt({ tierWeights: n.every((x, k) => x === ENCHANT_TIER_WEIGHTS[k]) ? undefined : n }); }} />
            <small className="muted">%{fmtN(tw[i] / (tw.reduce((a, b) => a + b, 0) || 1) * 100, 0)}</small></label>
        ))}</div>
      </section>
      <section className="admin-sec">
        <h4>Efsunlar ve kademe değerleri</h4>
        <div className="adm-table-wrap"><table className="adm-table">
          <thead><tr><th>Açık</th><th>Efsun</th><th>1.</th><th>2.</th><th>3.</th><th>4.</th></tr></thead>
          <tbody>{ids.map((k) => {
            const e = ENCHANTS[k as keyof typeof ENCHANTS], vals = et.values?.[k];
            return (
              <tr key={k} className={off.has(k) ? 'off' : ''}>
                <td><input type="checkbox" checked={!off.has(k)} disabled={dis} onChange={(ev) => { const s = new Set(off); if (ev.target.checked) s.delete(k); else s.add(k); setEt({ disabled: s.size ? [...s] : undefined }); }} /></td>
                <td><b>{e.name}</b><small>{e.desc}</small></td>
                {[0, 1, 2, 3].map((i) => <td key={i}><Num v={vals?.[i]} def={e.tiers[i]} min={0} max={100000} step={1} dis={dis} w={56} on={(v) => { const cur = [...(vals ?? e.tiers)] as [number, number, number, number]; cur[i] = v ?? e.tiers[i]; const all = { ...(et.values ?? {}) }; if (cur.every((x, j) => x === e.tiers[j])) delete all[k]; else all[k] = cur; setEt({ values: Object.keys(all).length ? all : undefined }); }} /></td>)}
              </tr>
            );
          })}</tbody>
        </table></div>
        <div className="muted" style={{ fontSize: 11 }}>Değerler yeni düşen eşyalara uygulanır; mevcut eşyalar değişmez.</div>
      </section>
    </>
  );
}

function MapTab({ t, setT, setSpawn, dis }: { t: GameTuning; setT: SetT; setSpawn: (k: string, p: Partial<SpawnTune>) => void; dis: boolean }) {
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

function PlayerTab({ dis }: { dis: boolean }) {
  const [list, setList] = useState<AdminPlayer[]>([]);
  const [edit, setEdit] = useState<Record<number, { level?: number; gems?: number; essence?: number; potions?: number }>>({});
  const [note, setNote] = useState('');
  const [q, setQ] = useState('');
  const api = useMemo(() => (OFFLINE ? import('../offline/local.ts') : null), []);
  const reload = () => { api?.then((m) => setList(m.adminPlayers())); };
  useEffect(() => { reload(); const iv = setInterval(reload, 4000); return () => clearInterval(iv); }, []);
  if (!OFFLINE) return <div className="muted">Sunucu sürümünde oyuncular sunucu yönetim komutuyla (gm_set) düzenlenir.</div>;
  const shown = list.filter((p) => !q || p.name.toLocaleLowerCase('tr').includes(q.toLocaleLowerCase('tr')));
  const apply = async (p: AdminPlayer) => { const m = await api!; setNote(`${p.name}: ${m.adminUpdatePlayer(p.id, edit[p.id] ?? {})}`); setEdit((e) => { const n = { ...e }; delete n[p.id]; return n; }); reload(); };
  const set = (id: number, k: 'level' | 'gems' | 'essence' | 'potions', v: number | undefined) => setEdit((e) => ({ ...e, [id]: { ...(e[id] ?? {}), [k]: v } }));
  return (
    <section className="admin-sec">
      <h4>Oyuncular</h4>
      <div className="muted" style={{ fontSize: 11, marginBottom: 8 }}>Bu test sürümünde her ziyaretçinin karakteri kendi tarayıcısında durur: burada bu cihazdaki karakterler ve oyundaki botlar listelenir. Çevrimiçi oyuncu anında güncellenir (seviye değişince canı ve istatistikleri yeniden hesaplanır).</div>
      <input className="adm-search" placeholder="Oyuncu ara…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="adm-table-wrap"><table className="adm-table">
        <thead><tr><th>Oyuncu</th><th>Seviye</th><th>Mücevher</th><th>Öz</th><th>İksir</th><th /></tr></thead>
        <tbody>{shown.map((p) => {
          const e = edit[p.id] ?? {};
          return (
            <tr key={p.id}>
              <td><b>{p.name}</b><small>{p.online ? '● çevrimiçi' : 'çevrimdışı'}{p.bot ? ' · bot' : ''} · {MAPS[p.map]?.name ?? p.map}</small></td>
              <td><Num v={e.level} def={p.level} min={1} max={50} step={1} dis={dis} w={52} on={(v) => set(p.id, 'level', v)} /></td>
              <td><Num v={e.gems} def={p.gems} min={0} max={1e9} step={1} dis={dis} w={74} on={(v) => set(p.id, 'gems', v)} /></td>
              <td><Num v={e.essence} def={p.essence} min={0} max={1e9} step={1} dis={dis} w={70} on={(v) => set(p.id, 'essence', v)} /></td>
              <td><Num v={e.potions} def={p.potions} min={0} max={1e6} step={1} dis={dis} w={56} on={(v) => set(p.id, 'potions', v)} /></td>
              <td><button className="btn small primary" disabled={dis || !edit[p.id] || !Object.values(edit[p.id]).some((x) => x !== undefined)} onClick={() => apply(p)}>Uygula</button></td>
            </tr>
          );
        })}</tbody>
      </table></div>
      {note && <div className="okmsg">{note}</div>}
    </section>
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
