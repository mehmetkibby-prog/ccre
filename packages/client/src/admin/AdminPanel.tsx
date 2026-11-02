import React, { useEffect, useState } from 'react';
import { DEFAULT_TUNING, TUNING, TUNING_LIMITS, DENSITY_LIMITS, MAPS, sanitizeTuning, type GameTuning } from '@col/shared';
import { configState, onConfig, saveConfig } from './config.ts';

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

export function AdminPanel({ onClose }: { onClose: () => void }) {
  const [t, setT] = useState<GameTuning>(() => structuredClone(TUNING));
  const [base, setBase] = useState<string>(() => JSON.stringify(sanitizeTuning(TUNING)));
  const [, force] = useState(0);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  // başka bir yöneticinin kaydı gelirse: düzenleme yoksa formu güncelle
  useEffect(() => onConfig((next) => {
    const fresh = JSON.stringify(sanitizeTuning(next));
    setT((cur) => (JSON.stringify(sanitizeTuning(cur)) === base ? structuredClone(next) : cur));
    setBase(fresh); force((n) => n + 1);
  }), [base]);
  const canEdit = configState.canEdit;
  const dirty = JSON.stringify(sanitizeTuning(t)) !== base;
  const setNum = (k: NumKey, v: number) => setT({ ...t, [k]: v });
  const save = async () => {
    setBusy(true); setMsg(null);
    try { await saveConfig(t); setMsg({ ok: true, text: 'Kaydedildi. Oyundaki herkes yeni ayarları hemen kullanır.' }); }
    catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
    setBusy(false);
  };
  const preset = (p: Partial<GameTuning>) => setT({ ...t, ...p });
  return (
    <div className="overlay admin-ov" onPointerDown={(e) => e.stopPropagation()}>
      <div className="frame panel admin" role="dialog" aria-label="Yönetim paneli">
        <div className="hd"><span className="title">Yönetim Paneli</span><button className="x" onClick={onClose} aria-label="Kapat">✕</button></div>
        <div className="bd">
          <div className="admin-status">
            {canEdit ? <span className="pill ok">Yönetici</span> : <span className="pill">Yalnız görüntüleme</span>}
            <span className="muted">{configState.live ? 'Ayarlar paylaşılan kayıtta. Kaydedince bu oyunu açan herkese uygulanır.' : configState.error || 'Ayar kaydına bağlanılıyor…'}</span>
          </div>
          {!canEdit && <div className="muted" style={{ fontSize: 12, marginBottom: 10 }}>Değişiklik yalnız sayfanın sahibi ve Editör yetkisi olanlar tarafından yapılabilir.</div>}

          <section className="admin-sec">
            <h4>Hazır ayarlar</h4>
            <div className="row wrap">
              <button className="btn small" disabled={!canEdit} onClick={() => preset({ xpMul: 2, gemMul: 1.5, essenceMul: 1.5 })}>Çift TP etkinliği</button>
              <button className="btn small" disabled={!canEdit} onClick={() => preset({ dropMul: 2.5 })}>Bol ganimet</button>
              <button className="btn small" disabled={!canEdit} onClick={() => preset({ monsterHpMul: 0.7, monsterAtkMul: 0.7 })}>Kolay canavarlar</button>
              <button className="btn small" disabled={!canEdit} onClick={() => preset({ monsterHpMul: 1.6, monsterAtkMul: 1.4, xpMul: 1.5 })}>Zor mod</button>
              <button className="btn small ghost" disabled={!canEdit} onClick={() => setT(structuredClone(DEFAULT_TUNING))}>Varsayılana dön</button>
            </div>
          </section>

          <section className="admin-sec">
            <h4>Duyuru</h4>
            <textarea className="admin-ta" maxLength={200} disabled={!canEdit} placeholder="Oyunun üstünde herkese görünen kısa mesaj (boş bırakılırsa gizlenir)" value={t.announcement} onChange={(e) => setT({ ...t, announcement: e.target.value })} />
            <div className="muted" style={{ fontSize: 11, textAlign: 'right' }}>{t.announcement.length}/200</div>
          </section>

          {ROWS.map((sec) => (
            <section className="admin-sec" key={sec.title}>
              <h4>{sec.title}</h4>
              {sec.note && <div className="muted" style={{ fontSize: 11, marginTop: -4, marginBottom: 6 }}>{sec.note}</div>}
              {sec.items.map(([k, label, hint]) => {
                const [lo, hi, step] = TUNING_LIMITS[k];
                return (
                  <label className="admin-row" key={k}>
                    <span className="lab"><b>{label}</b>{hint && <small>{hint}</small>}</span>
                    <input type="range" min={lo} max={hi} step={step} value={t[k]} disabled={!canEdit} onChange={(e) => setNum(k, Number(e.target.value))} />
                    <span className={'val' + (t[k] !== DEFAULT_TUNING[k] ? ' changed' : '')}>{fmt(k, t[k])}</span>
                  </label>
                );
              })}
              {sec.title === 'Canavarlar' && (
                <>
                  <div className="muted" style={{ fontSize: 12, margin: '8px 0 4px' }}>Harita başına canavar yoğunluğu. Yuvalar oyun açıkken yeniden kurulur.</div>
                  {DENSITY_MAPS.map((m) => {
                    const v = t.density[m.id] ?? 1;
                    return (
                      <label className="admin-row" key={m.id}>
                        <span className="lab"><b>{m.name}</b><small>{Math.round(m.spawns.reduce((a, g) => a + g.count, 0) * v)} canavar</small></span>
                        <input type="range" min={DENSITY_LIMITS[0]} max={DENSITY_LIMITS[1]} step={DENSITY_LIMITS[2]} value={v} disabled={!canEdit} onChange={(e) => setT({ ...t, density: { ...t.density, [m.id]: Number(e.target.value) } })} />
                        <span className={'val' + (v !== 1 ? ' changed' : '')}>{v.toLocaleString('tr-TR', { maximumFractionDigits: 2 })}×</span>
                      </label>
                    );
                  })}
                </>
              )}
            </section>
          ))}
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
