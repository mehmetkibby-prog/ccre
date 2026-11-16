import { useEffect, useState } from 'react';
import { CLASSES, type ClassId } from '@col/shared';
import { store, useStore } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { currentGame } from './GameScreen.tsx';
import { iconUrl } from '../game/art/icons.ts';

const send = (c: Record<string, unknown>) => currentGame?.send(c as never);
export const emblemUrl = (i: number) => `/emblems/${Math.max(0, Math.min(15, i | 0))}.png`;
export const EMBLEM_COUNT = 16;
export const GUILD_COST = 1000, GUILD_MIN_LEVEL = 20, GUILD_TAX_MAX = 20;
/** Oyuncu ad etiketindeki lonca bilgisi: "simge|ad" */
export function parseGuild(s: string | undefined): { emblem: number; name: string } | null {
  if (!s) return null; const i = s.indexOf('|'); if (i < 0) return null;
  return { emblem: Number(s.slice(0, i)) | 0, name: s.slice(i + 1) };
}
const RANK = ['Üye', 'Subay', 'Lider'];
const g = (c: Record<string, unknown>) => send({ t: 'guild', ...c });
const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

function EmblemPick({ v, on }: { v: number; on: (i: number) => void }) {
  return <div className="gd-emb">{Array.from({ length: EMBLEM_COUNT }, (_, i) => <button key={i} className={i === v ? 'on' : ''} onClick={() => on(i)}><img src={emblemUrl(i)} alt="" /></button>)}</div>;
}

/** Lonca paneli (G): kurma; üyeler, rütbeler, davet; ayarlar (vergi, simge, duyuru); hazine; savaş. */
export function GuildPanel() {
  const view = useStore((s) => s.guild);
  const self = useStore((s) => s.self);
  const myId = useStore((s) => s.char?.id ?? 0);
  const list = useStore((s) => s.guildList);
  const skew = useStore((s) => s.clockSkew);
  const [tab, setTab] = useState<'m' | 's' | 'w'>('m');
  const [name, setName] = useState(''); const [emb, setEmb] = useState(0);
  const [inv, setInv] = useState(''); const [wd, setWd] = useState(0);
  const [st, setSt] = useState<{ tax: number; emblem: number; notice: string } | null>(null);
  const [, tick] = useState(0);
  useEffect(() => { g({ op: 'info' }); const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, []);
  useEffect(() => { if (tab === 'w') g({ op: 'list' }); }, [tab]);
  const G = view?.g;
  useEffect(() => { if (G) setSt({ tax: G.tax, emblem: G.emblem, notice: G.notice }); }, [G?.id, G?.tax, G?.emblem, G?.notice]);
  if (!self) return null;
  const now = Date.now() + (skew ?? 0);
  if (!G) {
    const ok = self.level >= GUILD_MIN_LEVEL && self.gems >= GUILD_COST && name.trim().length >= 3;
    return (
      <Panel title="Lonca" width={520}>
        {view?.invite && (
          <div className="gd-inv"><img src={emblemUrl(view.invite.emblem)} alt="" /><div><b>{view.invite.name}</b><div className="muted" style={{ fontSize: 12 }}>{view.invite.from} seni loncaya çağırıyor.</div></div><button className="btn small primary" onClick={() => g({ op: 'accept', level: self.level })}>Katıl</button><button className="btn small" onClick={() => g({ op: 'decline' })}>Reddet</button></div>
        )}
        <div className="gd-create">
          <div className="sect">Lonca kur</div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 8 }}>Kurma bedeli <b>{GUILD_COST.toLocaleString('tr-TR')} Mücevher</b>, en az <b>{GUILD_MIN_LEVEL}. seviye</b>. Lider olarak üye davet eder, öz vergisini ayarlar ve rakip loncalara savaş ilan edersin.</div>
          <input className="inp" maxLength={16} placeholder="Lonca adı (3–16 harf)" value={name} onChange={(e) => setName(e.target.value)} style={{ width: '100%' }} />
          <div className="muted" style={{ fontSize: 12, margin: '8px 0 4px' }}>Simge seç</div>
          <EmblemPick v={emb} on={setEmb} />
          {self.level < GUILD_MIN_LEVEL && <div className="err" style={{ marginTop: 6 }}>{GUILD_MIN_LEVEL}. seviye gerekir (sen: {self.level}).</div>}
          {self.gems < GUILD_COST && <div className="err" style={{ marginTop: 6 }}>{GUILD_COST.toLocaleString('tr-TR')} Mücevher gerekir.</div>}
          <button className="btn primary" style={{ width: '100%', marginTop: 10 }} disabled={!ok} onClick={() => g({ op: 'create', name: name.trim(), emblem: emb })}>Lonca kur · {GUILD_COST.toLocaleString('tr-TR')} <img src={iconUrl('gem')} alt="" style={{ width: 16, verticalAlign: 'middle' }} /></button>
        </div>
      </Panel>
    );
  }
  const lead = G.myRank === 2, officer = G.myRank >= 1;
  const war = view?.war;
  return (
    <Panel title="Lonca" width={600}>
      <div className="gd-hero">
        <img src={emblemUrl(G.emblem)} alt="" />
        <div className="gd-hi"><b>{G.name}</b><div className="muted" style={{ fontSize: 12 }}>{G.members.length} üye · {G.members.filter((m) => m.online).length} çevrimiçi · Savaş: {G.wins} galibiyet / {G.losses} yenilgi</div>{G.notice && <div className="gd-notice">“{G.notice}”</div>}</div>
        <div className="gd-bank"><img src={iconUrl('essence')} alt="" /><b>{G.bank.toLocaleString('tr-TR')}</b><small>Hazine · vergi %{G.tax}</small></div>
      </div>
      {war && <WarCard war={war} now={now} />}
      {view?.warReq && officer && (
        <div className="gd-inv war"><img src={emblemUrl(view.warReq.emblem)} alt="" /><div><b>{view.warReq.name}</b><div className="muted" style={{ fontSize: 12 }}>{view.warReq.by} loncana savaş ilan etti! 5 dakikalık meydan savaşı.</div></div><button className="btn small red" onClick={() => g({ op: 'war_accept' })}>Kabul et</button><button className="btn small" onClick={() => g({ op: 'war_decline' })}>Reddet</button></div>
      )}
      <div className="qs-tabs">
        <button className={tab === 'm' ? 'on' : ''} onClick={() => setTab('m')}>Üyeler</button>
        <button className={tab === 'w' ? 'on' : ''} onClick={() => setTab('w')}>Savaş</button>
        <button className={tab === 's' ? 'on' : ''} onClick={() => setTab('s')}>{lead ? 'Ayarlar' : 'Bilgi'}</button>
      </div>
      {tab === 'm' && (
        <>
          {officer && <div className="row" style={{ gap: 6, marginBottom: 6 }}><input className="inp" style={{ flex: 1 }} placeholder="Oyuncu adı (ya da oyuncuya tıkla → Loncaya davet et)" value={inv} onChange={(e) => setInv(e.target.value)} /><button className="btn small primary" disabled={!inv.trim()} onClick={() => { g({ op: 'invite', name: inv.trim() }); setInv(''); }}>Davet et</button></div>}
          <div className="gd-mem">
            {G.members.map((m) => (
              <div key={m.id} className={'gd-m' + (m.online ? ' on' : '')}>
                <i className="dot" /><b>{m.name}</b><small className="muted">Sv. {m.level} {CLASSES[m.cls as ClassId]?.name ?? ''}</small>
                <span className={'rk r' + m.rank}>{RANK[m.rank]}</span>
                <small className="muted" title="Hazineye katkı (Öz)">{m.contributed.toLocaleString('tr-TR')} Öz</small>
                <span className="gd-act">
                  {lead && m.id !== myId && m.rank < 2 && <button className="btn tiny" onClick={() => g({ op: 'rank', id: m.id, rank: m.rank === 1 ? 0 : 1 })}>{m.rank === 1 ? 'Üye yap' : 'Subay yap'}</button>}
                  {lead && m.rank < 2 && <button className="btn tiny" onClick={() => { if (confirm(`Liderliği ${m.name}'e devretmek istiyor musun?`)) g({ op: 'transfer', id: m.id }); }}>Lider yap</button>}
                  {officer && m.rank < G.myRank && <button className="btn tiny danger" onClick={() => { if (confirm(`${m.name} loncadan çıkarılsın mı?`)) g({ op: 'kick', id: m.id }); }}>Çıkar</button>}
                </span>
              </div>
            ))}
          </div>
          <div className="row" style={{ marginTop: 8 }}><div className="spacer" />
            {lead && G.members.length > 1 ? null : <button className="btn small ghost" onClick={() => { if (confirm(G.members.length <= 1 ? 'Tek üyesin; ayrılırsan lonca dağılır. Emin misin?' : 'Loncadan ayrılmak istiyor musun?')) g({ op: 'leave' }); }}>Loncadan ayrıl</button>}
          </div>
        </>
      )}
      {tab === 'w' && (
        <div>
          <div className="muted" style={{ fontSize: 12, marginBottom: 6 }}>Lider ya da subay rakip loncaya savaş ilan eder; rakip kabul edince 60 sn sonra, ilan edenin kanalındaki <b>Lonca Savaş Meydanı</b>'nda 5 dakikalık savaş başlar. En çok rakip yenen lonca kazanır. Meydanda ölümde kayıp yoktur.</div>
          <div className="gd-list">
            {(list ?? []).filter((x) => x.id !== G.id).map((x) => (
              <div key={x.id} className="gd-l"><img src={emblemUrl(x.emblem)} alt="" /><b>{x.name}</b><small className="muted">{x.members} üye · {x.wins}G/{x.losses}Y</small><div className="spacer" />{officer && !war && <button className="btn small red" onClick={() => { if (confirm(`${x.name} loncasına savaş ilan edilsin mi?`)) g({ op: 'war', gid: x.id }); }}>⚔ Savaş ilan et</button>}</div>
            ))}
            {list && list.filter((x) => x.id !== G.id).length === 0 && <div className="muted">Başka lonca yok.</div>}
            {!list && <div className="muted">Yükleniyor…</div>}
          </div>
        </div>
      )}
      {tab === 's' && (
        lead && st ? (
          <div>
            <label className="gd-f"><span>Öz vergisi: <b>%{st.tax}</b></span><input type="range" min={0} max={GUILD_TAX_MAX} value={st.tax} onChange={(e) => setSt({ ...st, tax: Number(e.target.value) })} /></label>
            <div className="muted" style={{ fontSize: 11, marginTop: -4 }}>Üyelerin canavardan kazandığı Özün bu kadarı lonca hazinesine gider.</div>
            <div className="muted" style={{ fontSize: 12, margin: '10px 0 4px' }}>Lonca simgesi</div>
            <EmblemPick v={st.emblem} on={(i) => setSt({ ...st, emblem: i })} />
            <textarea className="inp" style={{ width: '100%', marginTop: 8, minHeight: 50 }} maxLength={200} placeholder="Lonca duyurusu (üyeler görür)" value={st.notice} onChange={(e) => setSt({ ...st, notice: e.target.value })} />
            <button className="btn primary" style={{ width: '100%', marginTop: 8 }} onClick={() => g({ op: 'settings', ...st })}>Ayarları kaydet</button>
            <div className="sect" style={{ marginTop: 12 }}>Hazine</div>
            <div className="row" style={{ gap: 6 }}><input className="inp" type="number" min={0} max={G.bank} value={wd || ''} placeholder="Öz miktarı" onChange={(e) => setWd(Math.max(0, Math.min(G.bank, Number(e.target.value) || 0)))} style={{ flex: 1 }} /><button className="btn small" disabled={!wd} onClick={() => { g({ op: 'withdraw', amount: wd }); setWd(0); }}>Hazineden çek</button></div>
            <button className="btn small ghost danger" style={{ marginTop: 12 }} onClick={() => { if (confirm(`${G.name} dağıtılsın mı? Bu geri alınamaz.`)) g({ op: 'disband' }); }}>Loncayı dağıt</button>
          </div>
        ) : <div className="muted" style={{ fontSize: 13 }}>Öz vergisi: %{G.tax}. Kazandığın Özün bu kadarı lonca hazinesine gider. Ayarları lider değiştirir.</div>
      )}
    </Panel>
  );
}

function WarCard({ war, now }: { war: NonNullable<NonNullable<ReturnType<typeof store.get>['guild']>['war']>; now: number }) {
  const started = now >= war.startAt;
  return (
    <div className="gd-war">
      <div className="gw-s"><img src={emblemUrl(war.ae)} alt="" /><b>{war.an}</b><span className="sc">{war.score[0]}</span></div>
      <div className="gw-mid"><b>{started ? mmss(war.endsAt - now) : `Başlamasına ${mmss(war.startAt - now)}`}</b><small>Kanal {war.channel}</small><button className="btn small red" onClick={() => g({ op: 'war_join' })}>Savaşa katıl</button></div>
      <div className="gw-s r"><span className="sc">{war.score[1]}</span><b>{war.bn}</b><img src={emblemUrl(war.be)} alt="" /></div>
    </div>
  );
}

/** Ekranda lonca savaşı şeridi (savaş sürerken) */
export function GuildWarBar() {
  const war = useStore((s) => s.guild?.war);
  const map = useStore((s) => s.map);
  const skew = useStore((s) => s.clockSkew);
  const [, tick] = useState(0);
  useEffect(() => { if (!war) return; const id = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(id); }, [!!war]);
  if (!war) return null;
  const now = Date.now() + (skew ?? 0);
  if (now > war.endsAt + 3000) return null;
  const started = now >= war.startAt;
  return (
    <div className="gw-bar" onPointerDown={(e) => e.stopPropagation()}>
      <img src={emblemUrl(war.ae)} alt="" /><b>{war.an}</b><span className="sc">{war.score[0]}</span>
      <span className="t">{started ? mmss(war.endsAt - now) : `⚔ ${mmss(war.startAt - now)}`}</span>
      <span className="sc">{war.score[1]}</span><b>{war.bn}</b><img src={emblemUrl(war.be)} alt="" />
      {map !== 'guildwar' && <button onClick={() => g({ op: 'war_join' })}>Katıl</button>}
    </div>
  );
}

/** Lonca daveti / savaş ilanı kartı (panel kapalıyken) */
export function GuildInviteCard() {
  const view = useStore((s) => s.guild);
  const self = useStore((s) => s.self);
  const panel = useStore((s) => s.panel);
  if (!view || panel === 'guild') return null;
  if (view.invite && !view.g) return (<div className="invites" style={{ top: 150 }}>
    <div className="invite gd-card"><img src={emblemUrl(view.invite.emblem)} alt="" /><div><b>{view.invite.name}</b><div className="iv-t">{view.invite.from} seni loncaya çağırıyor</div></div>
      <div className="row"><button className="btn small primary" onClick={() => g({ op: 'accept', level: self?.level ?? 1 })}>Katıl</button><button className="btn small" onClick={() => g({ op: 'decline' })}>Reddet</button></div></div></div>
  );
  if (view.warReq && view.g && view.g.myRank >= 1) return (<div className="invites" style={{ top: 150 }}>
    <div className="invite gd-card war"><img src={emblemUrl(view.warReq.emblem)} alt="" /><div><b>{view.warReq.name}</b><div className="iv-t">loncana savaş ilan etti!</div></div>
      <div className="row"><button className="btn small red" onClick={() => g({ op: 'war_accept' })}>Kabul et</button><button className="btn small" onClick={() => g({ op: 'war_decline' })}>Reddet</button></div></div></div>
  );
  return null;
}
