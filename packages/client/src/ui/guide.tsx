/**
 * Rehber: oyunda sağ üstteki "Rehber" düğmesiyle (telefonda Menü'den) açılan pencere ve sitedeki /rehber sayfası.
 * Bütün sayılar o anki ayardan (yönetim paneli) okunur; ayar değişince kendiliğinden yenilenir. GuideContent oyuna
 * bağlı değildir (site de kullanır); GuidePanel onu oyunun pencere çerçevesine koyar.
 */
import { RUNES, RUNE_KINDS, RUNE_MAX_LEVEL, runeConf, runePct, runeUpCost, RANKS, RANK_LEVEL } from '@col/shared';
import React, { useEffect, useRef, useState } from 'react';
import {
  MAPS, MONSTERS, TUNING, MATERIAL, MALL, ITEM_TPL, RARITY, RARITIES, SLOT_NAMES, ENCHANTS, ENCHANT_TIER_WEIGHTS, MAX_PLUS, MOUNT, STAT_GAIN, STAT_MAX,
  STORAGE_PAGE_SLOTS, STORAGE_BASE_PAGES, STORAGE_MAX_PAGES, STALL_MAX_ITEMS, VARIANT_LOOT_MULT, MALL_CATS, EVENT_NAMES, EVENT_ICONS, EVO_NAMES, EVO_COLORS,
  TRANSFORM_GROUP_NAMES, TRANSFORM_GROUPS, TOWER_PUZZLE_NAMES, FORGE_PUZZLE_NAMES, POTION_EFFECT, HERBS, UNIQUE_EXTRA, QTE_MULT, WORLD_BOSS_ID, WORLD_BOSS_MAP,
  upgradeSteps, upgradeFailDown, masteryChance, transformConf, itemPower, mallPrice, mallForSale, mallIcon, fishingConf, fishTable, fixedLevel,
  statBudget, skillUpgradeBudget, skillDamageMult, skillUpCost,
  type Rarity, type Slot, type ResolvedLoot,
} from '@col/shared';
import { iconUrl } from '../game/art/icons.ts';
import { onConfig } from '../admin/config.ts';
import { store, useStore } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { GUILD_COST, GUILD_MIN_LEVEL } from './guild.tsx';
import { sfx } from '../game/audio.ts';
import {
  roadmap, recommendedStop, milestones, materialSources, monsterLoot, mapMonsters, rarityShares, dropName, dropRows, pctTxt, fmt, range, matName, monName,
  type GuideStop, type DropRow,
} from './guideData.ts';
import './guide.css';

type Tab = 'yol' | 'guc' | 'zindan' | 'hayat' | 'ipucu';
const TABS: [Tab, string, string][] = [['yol', '🗺️', 'Yol Haritası'], ['guc', '⚒️', 'Güçlenme'], ['zindan', '🐉', 'Zindanlar & Bosslar'], ['hayat', '🏡', 'Günlük Hayat'], ['ipucu', '💡', 'İpuçları']];
const TAB_KEY = 'col_guide_tab';

// ───────── küçük yapı taşları ─────────
const matIcon = (k: string) => iconUrl(MATERIAL.get(k)?.icon ?? (MALL.has(k) ? mallIcon(k) : 'dust'));
function dropIcon(d: { kind: string; key: string; rarity?: string }) {
  if (d.kind === 'item') return iconUrl(ITEM_TPL.get(d.key)?.icon ?? (d.key.startsWith('a_') ? 'armor_guardian' : 'sword'), Math.max(0, RARITIES.indexOf((d.rarity ?? 'blue') as Rarity)));
  return d.kind === 'mall' ? iconUrl(mallIcon(d.key)) : matIcon(d.key);
}
/** malzeme yongası: simge + (isteğe bağlı ad) + adet */
function Mat({ k, n, named }: { k: string; n?: number | string; named?: boolean }) {
  return <span className={'g-mat' + (named ? ' named' : '')} title={MATERIAL.get(k)?.desc ?? matName(k)}><img src={matIcon(k)} alt="" />{named && <span className="nm">{matName(k)}</span>}{n !== undefined && <b>{typeof n === 'number' ? `×${fmt(n)}` : n}</b>}</span>;
}
function Cur({ k, n }: { k: 'gem' | 'essence' | 'cp'; n: React.ReactNode }) {
  return <span className={'g-mat cur ' + k} title={k === 'gem' ? 'Mücevher' : k === 'essence' ? 'Yaşam Özü' : 'Çekirdek Puanı'}><img src={iconUrl(k)} alt="" /><b>{n}</b></span>;
}
function Card({ icon, title, sub, tone, children, className }: { icon: string; title: React.ReactNode; sub?: React.ReactNode; tone?: 'gold' | 'em' | 'ember' | 'sky' | 'violet'; children?: React.ReactNode; className?: string }) {
  return (
    <section className={'g-card' + (tone ? ' t-' + tone : '') + (className ? ' ' + className : '')}>
      <header className="g-card-h"><span className="g-ic" aria-hidden>{icon}</span><div className="g-tt"><h3>{title}</h3>{sub && <small>{sub}</small>}</div></header>
      {children}
    </section>
  );
}
/** Kartta geçen malzemelerin adları (tabloda yalnız simge ve adet görünür) */
function MatLegend({ keys }: { keys: string[] }) {
  const u = [...new Set(keys)];
  if (!u.length) return null;
  return <div className="g-legend"><span className="lb">Malzemeler</span>{u.map((k) => <Mat key={k} k={k} named />)}</div>;
}
const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
const Badge = ({ c, children }: { c?: string; children: React.ReactNode }) => <span className={'g-badge' + (c ? ' ' + c : '')}>{children}</span>;
const Lv = ({ a, b }: { a: number; b?: number | null }) => <span className="g-lv">Sv. {a}{b === null ? '+' : b !== undefined && b !== a ? `–${b}` : ''}</span>;
function More({ title, children, open }: { title: React.ReactNode; children: React.ReactNode; open?: boolean }) {
  return <details className="g-more" open={open}><summary><span>{title}</span><i aria-hidden>▾</i></summary><div className="g-more-bd">{children}</div></details>;
}
const RarTag = ({ r, pct }: { r: Rarity; pct?: number }) => <span className="g-rar" style={{ ['--rc' as string]: RARITY[r]?.color ?? '#ccc' }}>{RARITY[r]?.name ?? r}{pct !== undefined && <small>{pct >= 1 ? Math.round(pct) : pct.toFixed(1).replace('.', ',')}%</small>}</span>;

/** Ganimet listesi: Öz, ekipman (nadirlik payları), malzemeler, özel düşenler. boss: 3 ekipman zarı (sınır içindeyse kesin). */
function DropList({ r, boss }: { r: ResolvedLoot; boss?: boolean }) {
  const rd = Object.fromEntries(Object.entries(r.rarityWeights).map(([k, w]) => [k, (w ?? 0) * (TUNING.rarityDrop[k] ?? 1)]));
  const rs = rarityShares(rd);
  const ess = r.essence.map((x) => x * TUNING.essenceMul) as [number, number];
  return (
    <div className="g-drops">
      {ess[1] > 0 && <div className="g-drop"><img src={iconUrl('essence')} alt="" /><span className="nm">Yaşam Özü<small>her öldürmede</small></span><b className="sure">{range(ess[0], ess[1])}</b></div>}
      {(r.equipChance > 0 || boss) && rs.length > 0 && (
        <div className="g-drop"><img src={iconUrl('sword', 1)} alt="" /><span className="nm">{boss ? '3 ekipman zarı' : 'Ekipman'}<small className="g-rars">{rs.map(([k, p]) => <RarTag key={k} r={k} pct={p} />)}</small></span><b className={boss ? 'sure' : ''}>{boss ? 'kesin' : pctTxt(r.equipChance * TUNING.dropMul)}</b></div>
      )}
      {r.materials.map((m) => (
        <div key={m.id} className="g-drop"><img src={matIcon(m.id)} alt="" /><span className="nm">{matName(m.id)}{m.qty[1] > 1 && <small>{range(m.qty[0], m.qty[1])} adet</small>}</span><b>{pctTxt(m.chance * TUNING.dropMul)}</b></div>
      ))}
      {r.drops.map((d, i) => <RowDrop key={'d' + i} d={d} />)}
    </div>
  );
}
function RowDrop({ d }: { d: DropRow }) {
  return <div className="g-drop special"><img src={dropIcon(d)} alt="" /><span className="nm">{dropName(d)}{d.qty[1] > 1 && <small>{range(d.qty[0], d.qty[1])} adet</small>}</span><b className={d.chance >= 1 ? 'sure' : ''}>{d.chance >= 1 ? 'kesin' : pctTxt(d.chance)}</b></div>;
}
/** Sandık içeriği: Mücevher, Öz aralığı ve olasılıklı düşenler */
function ChestList({ gems, essence, drops, extra }: { gems: [number, number]; essence: [number, number]; drops: DropRow[]; extra?: React.ReactNode }) {
  return (
    <div className="g-drops">
      {gems[1] > 0 && <div className="g-drop"><img src={iconUrl('gem')} alt="" /><span className="nm">Mücevher<small>her sandıkta</small></span><b className="sure">{range(gems[0], gems[1])}</b></div>}
      {essence[1] > 0 && <div className="g-drop"><img src={iconUrl('essence')} alt="" /><span className="nm">Yaşam Özü<small>her sandıkta</small></span><b className="sure">{range(essence[0], essence[1])}</b></div>}
      {drops.map((d, i) => <RowDrop key={i} d={d} />)}
      {extra}
    </div>
  );
}

/** Sevimli rehber maskotu: gülümseyen açık kitap, tepesinde filiz */
function GuideMascot({ size = 64 }: { size?: number }) {
  return (
    <svg className="g-mascot" width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <defs>
        <radialGradient id="gm-glow" cx="50%" cy="55%" r="50%"><stop offset="0" stopColor="#ffe9a8" stopOpacity=".75" /><stop offset="1" stopColor="#ffe9a8" stopOpacity="0" /></radialGradient>
        <linearGradient id="gm-page" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#fffaf0" /><stop offset="1" stopColor="#f3dfae" /></linearGradient>
      </defs>
      <circle cx="32" cy="36" r="28" fill="url(#gm-glow)" />
      <path d="M5 22 V55 Q18.5 49.5 32 55 Q45.5 49.5 59 55 V22" fill="#c9442f" stroke="#6e1f16" strokeWidth="2" strokeLinejoin="round" />
      <path d="M8 20 Q20 14.5 31 20.5 V52 Q20 46.5 8 51.5 Z" fill="url(#gm-page)" stroke="#7d5b22" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M56 20 Q44 14.5 33 20.5 V52 Q44 46.5 56 51.5 Z" fill="url(#gm-page)" stroke="#7d5b22" strokeWidth="1.8" strokeLinejoin="round" />
      <path d="M12 25 Q18 23 25 25.5 M39 25.5 Q46 23 52 25" stroke="#d9b46a" strokeWidth="1.4" fill="none" strokeLinecap="round" />
      <ellipse cx="20" cy="33" rx="2.6" ry="3" fill="#3a2410" /><ellipse cx="44" cy="33" rx="2.6" ry="3" fill="#3a2410" />
      <circle cx="21" cy="32" r=".9" fill="#fff" /><circle cx="45" cy="32" r=".9" fill="#fff" />
      <ellipse cx="15" cy="39" rx="3.2" ry="1.9" fill="#ff8f86" opacity=".75" /><ellipse cx="49" cy="39" rx="3.2" ry="1.9" fill="#ff8f86" opacity=".75" />
      <path d="M27 40 Q32 45 37 40" fill="none" stroke="#3a2410" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M32 20 C31 13 35 8.5 42 7.5 C41.5 14 37.5 18 32 20 Z" fill="#45e08f" stroke="#1f7a4a" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M32 20 C31 15 28 12 23 11.5 C24 16 27.5 19 32 20 Z" fill="#7ff0b4" stroke="#1f7a4a" strokeWidth="1.4" strokeLinejoin="round" />
      <path d="M10 6 l1.4 3.2 3.2 1.4 -3.2 1.4 -1.4 3.2 -1.4 -3.2 -3.2 -1.4 3.2 -1.4z" fill="#ffd84a" />
      <path d="M55 9 l1 2.3 2.3 1 -2.3 1 -1 2.3 -1 -2.3 -2.3 -1 2.3 -1z" fill="#ffe9a8" />
    </svg>
  );
}
/** Üst düğme simgesi: açık kitap */
export function BookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden>
      <path d="M2.5 5.6 Q7 3.6 11.4 5.9 V20.2 Q7 17.9 2.5 19.7 Z" fill="#ffd84a" stroke="#6a4512" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M21.5 5.6 Q17 3.6 12.6 5.9 V20.2 Q17 17.9 21.5 19.7 Z" fill="#ffeab0" stroke="#6a4512" strokeWidth="1.3" strokeLinejoin="round" />
      <path d="M5 9.2 Q7.5 8.4 9.6 9.4 M5 12.2 Q7.5 11.4 9.6 12.4 M14.4 9.4 Q16.5 8.4 19 9.2 M14.4 12.4 Q16.5 11.4 19 12.2" stroke="#a8741e" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </svg>
  );
}

// ───────── 1. Yol Haritası ─────────
function RoadTab({ level }: { level?: number }) {
  const stops = roadmap();
  const rec = recommendedStop(stops, level);
  const ms = milestones(GUILD_MIN_LEVEL);
  const next = level ? ms.find((m) => m.level > level) : undefined;
  const recStop = stops.find((s) => s.map.id === rec);
  return (
    <>
      {level !== undefined && recStop && (
        <div className="g-hint">
          <span className="g-ic" aria-hidden>🧭</span>
          <div>
            <b>Sv. {level} için önerimiz: {recStop.map.name}</b>
            <span>
              {recStop.monsters.map((m) => m.name).join(', ')} seni bekliyor.
              {recStop.cap > 0 && level > recStop.cap && <> Bu bölgenin ganimet sınırını (Sv. {recStop.cap}) geçtin; ganimet {pctTxt(recStop.overMul)} oranına iner.</>}
              {next && <> Sıradaki hedef: <b>Sv. {next.level}</b> · {next.text}.</>}
            </span>
          </div>
        </div>
      )}
      <p className="g-lead">Haritalar giriş seviyesine göre sıralı. Işınlanmak için <b>T</b> tuşu ya da Pazar Köyü'ndeki <b>Nur</b>. Her canavarın gerçek düşme listesi, hedef çerçevesindeki <b>?</b> düğmesindedir.</p>
      <div className="g-road">
        {stops.map((s, i) => <StopCard key={s.map.id} s={s} n={i + 1} on={s.map.id === rec} locked={level !== undefined && level < s.minLevel} />)}
      </div>
      <Card icon="🌱" title="Seviye yolculuğu" sub="Hangi seviyede neler açılır" tone="em">
        <ol className="g-steps">
          {ms.map((m, i) => (
            <li key={i} className={level !== undefined ? (m.level <= level ? 'done' : m === next ? 'next' : '') : ''}>
              <span className="lv">{m.level}</span><span className="ic" aria-hidden>{m.icon}</span><span className="tx">{m.text}</span>
            </li>
          ))}
        </ol>
      </Card>
    </>
  );
}
function StopCard({ s, n, on, locked }: { s: GuideStop; n: number; on: boolean; locked: boolean }) {
  const m = s.map;
  return (
    <article className={'g-stop' + (on ? ' on' : '') + (locked ? ' locked' : '') + (m.pvp ? ' pvp' : '')}>
      <div className="g-stop-n" aria-hidden>{n}</div>
      <div className="g-stop-bd">
        <div className="g-stop-h">
          <h4>{m.name}</h4>
          <Lv a={s.minLevel} b={s.maxLevel} />
          {m.safe ? <Badge c="safe">Güvenli</Badge> : m.pvp ? <Badge c="pvp">PvP</Badge> : <Badge c="hunt">Av bölgesi</Badge>}
          {on && <Badge c="you">Sana uygun</Badge>}
        </div>
        <div className="g-chips">
          {s.monsters.map((x) => <span key={x.id} className="g-chip mon">{x.name} <em>Sv. {x.level}</em></span>)}
          {s.bosses.map((x) => <span key={x.id} className="g-chip boss">👑 {x.name} <em>Sv. {x.level}</em></span>)}
        </div>
        <div className="g-stop-loot">
          {s.rarities.length > 0 && <span className="g-rars">{s.rarities.map(([r, p]) => <RarTag key={r} r={r} pct={p} />)}</span>}
          {s.mats.length > 0 && <span className="g-mats">{s.mats.slice(0, 5).map((x) => <Mat key={x.id} k={x.id} named n={pctTxt(x.chance)} />)}</span>}
        </div>
        {(s.cap > 0 || m.dropPenalty === 'gems5') && (
          <div className="g-stop-note">
            {s.cap > 0 && <span>📉 Sv. {s.cap} üstünde ganimet {pctTxt(s.overMul)} oranına iner.</span>}
            {m.dropPenalty === 'gems5' && <span>⚠️ Bir oyuncu seni yenerse Mücevherinin %5'i gider; ekipman korunur.</span>}
          </div>
        )}
      </div>
    </article>
  );
}

// ───────── 2. Güçlenme ─────────
function PowerTab() {
  const steps = upgradeSteps();
  const E = TUNING.evo, tc = transformConf();
  const mastery = MALL.get('mastery_seal'), protect = MALL.get('protect_seal');
  const enchAdd = MALL.get('enchant_add'), enchChange = MALL.get('enchant_change');
  const maxEnch = ENCHANT_TIER_WEIGHTS.length;
  const ench = (Object.keys(ENCHANTS) as (keyof typeof ENCHANTS)[]).filter((k) => !ENCHANTS[k].legacy && !(TUNING.enchants.disabled ?? []).includes(k));
  const sample = (slot: Slot, tpl: string) => ({ slot, tpl, from: tc.from[0] ?? 'crimson' });
  const uqRows = [sample('weapon', 'w_guardian'), sample('armor', 'a_guardian'), sample('necklace', 'necklace'), sample('earring', 'earring'), sample('bracelet', 'bracelet')];
  const skillTop = skillUpCost(9, false), skillLow = skillUpCost(1, false);
  const sources = materialSources();
  return (
    <>
      <Card icon="🔨" title={<>Artı Basma <small className="g-npc">Demirci Haso</small></>} sub={`Yalnız silah ve gövde zırhı · en çok +${MAX_PLUS}`} tone="gold">
        <div className="g-tbl-wrap">
          <table className="g-tbl resp">
            <thead><tr><th>Artı</th><th>Şans</th><th>Bedel</th><th>Eklenen güç</th></tr></thead>
            <tbody>
              {steps.map((s) => (
                <tr key={s.target}>
                  <td><span className="g-plus">+{s.target}</span></td>
                  <td data-l="Şans"><b className={'g-ch' + (s.chance >= 75 ? ' hi' : s.chance >= 40 ? ' mid' : ' lo')}>%{s.chance}</b>{s.chance < 100 && <small className="g-sub">mühürle %{String(masteryChance(s.chance)).replace('.', ',')}</small>}</td>
                  <td><span className="g-cost"><Cur k="gem" n={fmt(s.gems)} />{Object.entries(s.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span></td>
                  <td><span className="g-gain"><span title="Silahın saldırısına">⚔️ +{fmt(s.weapon)}</span><span title="Zırhın savunmasına">🛡️ +{fmt(s.armor)}</span></span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <MatLegend keys={steps.flatMap((s) => Object.keys(s.mats))} />
        <ul className="g-list">
          <li>Eklenen güç o kademedeki <b>toplam</b> düz değerdir: silahta saldırıya, zırhta savunmaya eklenir.</li>
          <li>{upgradeFailDown() ? <>Başarısız olursa eşya <b>bir kademe düşer</b> (+0'ın altına inmez, eşya yok olmaz).</> : <>Başarısız olursa eşya <b>kademesini korur</b>; yalnız bedel gider.</>}</li>
          {mastery && <li><Mat k="mastery_seal" /> <b>{mastery.name}</b>: başarı şansını 1,3 katına çıkarır (ör. %{steps[steps.length - 1]?.chance ?? 20} → %{masteryChance(steps[steps.length - 1]?.chance ?? 20)}). {mallForSale('mastery_seal') && <>Nesne Market'te {fmt(mallPrice('mastery_seal'))} ÇP. </>}{TUNING.crafts.some((c) => !c.off && c.out.key === 'mastery_seal') && <>Pakize'de de üretilir. </>}Canavardan düşmez.</li>}
          {protect && mallForSale('protect_seal') && <li><img className="g-inl" src={iconUrl(mallIcon('protect_seal'))} alt="" /> <b>{protect.name}</b> ({fmt(mallPrice('protect_seal'))} ÇP): başarısız denemede harcanan malzemenin yarısı geri döner.</li>}
          <li>Savaş sırasında artı basılamaz; Haso'ya yaklaşıp konuş.</li>
        </ul>
      </Card>

      {E.enabled && (
        <Card icon="🌀" title={<>Evrim <small className="g-npc">Demirci Haso</small></>} sub="Silah ve zırh avladıkça evrilir" tone="violet">
          <div className="g-tbl-wrap">
            <table className="g-tbl resp">
              <thead><tr><th>Kademe</th><th>Av</th><th>Bedel</th><th>Eklenen güç</th></tr></thead>
              <tbody>
                {E.weapon.map((w, i) => {
                  const a = E.armor[i];
                  return (
                    <tr key={i}>
                      <td><span className="g-evo" style={{ ['--ec' as string]: EVO_COLORS[i + 1] }}>{['I', 'II', 'III'][i]} <small>{EVO_NAMES[i + 1]}</small></span></td>
                      <td data-l="Av"><b>{fmt(w.kills)}</b>{a && a.kills !== w.kills && <small className="g-sub">zırh {fmt(a.kills)}</small>}</td>
                      <td><span className="g-cost"><Cur k="gem" n={fmt(w.gems)} />{Object.entries(w.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span>{a && JSON.stringify(a.mats) !== JSON.stringify(w.mats) && <small className="g-sub">zırh: {Object.entries(a.mats).map(([k, q]) => `${q} ${matName(k)}`).join(', ')}</small>}</td>
                      <td><span className="g-gain"><span title="Silahın saldırısına">⚔️ +{fmt(w.add)}</span>{a && <span title="Zırhın savunmasına">🛡️ +{fmt(a.add)}</span>}</span></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <MatLegend keys={[...E.weapon, ...E.armor].flatMap((w) => Object.keys(w.mats))} />
          <ul className="g-list">
            <li>Silah ve zırh <b>kuşanılıyken</b> öldürdüğün canavarları sayar{E.maxGap ? <> (senden {E.maxGap} seviyeden fazla düşük canavarlar sayılmaz)</> : null}. Sayaç dolunca evrilir, sayaç sıfırlanır.</li>
            <li>Malzemeler <b>Kor Kulesi</b>'nden çıkar. Artı, efsun ve nadirlik korunur; her kademede yeni bir parıltı gelir.</li>
          </ul>
        </Card>
      )}

      {tc.enabled && (
        <Card icon="💛" title={<>Eşsiz Dönüşüm <small className="g-npc">Demirci Haso</small></>} sub={<>{tc.from.map((r) => <RarTag key={r} r={r} />)} <span className="g-arrow">→</span> <RarTag r="unique" /></>} tone="gold">
          <div className="g-tgroups">
            {TRANSFORM_GROUPS.map((g) => {
              const c = tc.cost[g];
              return (
                <div key={g} className="g-tgroup">
                  <b>{TRANSFORM_GROUP_NAMES[g]}</b>
                  <span className="g-req"><Lv a={c.minLevel} b={null} />{c.minPlus > 0 && <span className="g-lv">en az +{c.minPlus}</span>}<span className={'g-ch' + (c.chance >= 100 ? ' hi' : ' mid')}>Şans %{c.chance}</span></span>
                  <span className="g-cost"><Cur k="gem" n={fmt(c.gems)} />{Object.entries(c.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span>
                </div>
              );
            })}
          </div>
          <MatLegend keys={TRANSFORM_GROUPS.flatMap((g) => Object.keys(tc.cost[g].mats))} />
          <div className="g-sect">Ne kazandırır?</div>
          <div className="g-uq">
            {uqRows.map((u) => {
              const tpl = ITEM_TPL.get(u.tpl); if (!tpl) return null;
              const it = { id: 'g', tpl: u.tpl, rarity: u.from, plus: 0, ench: [] };
              const a = itemPower(it), b = itemPower({ ...it, rarity: 'unique' });
              const ex = UNIQUE_EXTRA[u.slot];
              return (
                <div key={u.slot} className="g-uq-row">
                  <span className="sl">{SLOT_NAMES[u.slot]}</span>
                  <span className="pw">{u.slot === 'weapon' ? 'Saldırı' : 'Savunma'} {fmt(a)} → <b>{fmt(b)}</b></span>
                  {ex && <span className="ex">+ {ex.label}</span>}
                </div>
              );
            })}
          </div>
          <ul className="g-list">
            <li><b>Artı ve evrim kalır, efsunlar silinir</b> (yeniden efsunlanır). Örnek güç değerleri +0 Muhafız eşyası içindir.</li>
            <li>{Object.values(tc.cost).every((c) => c.chance >= 100) ? 'Şans her grupta %100.' : 'Başarısızlıkta eşya bozulmaz, yalnız bedel gider.'} Ekstralar efsunlardan ayrıdır.</li>
          </ul>
        </Card>
      )}

      <Card icon="🔮" title="Efsun" sub={`Bir ekipmanda en çok ${maxEnch} efsun`} tone="sky">
        <div className="g-two">
          {enchAdd && <div className="g-mini"><img src={iconUrl(mallIcon('enchant_add'))} alt="" /><div><b>{enchAdd.name}</b>{mallForSale('enchant_add') && <Cur k="cp" n={`${fmt(mallPrice('enchant_add'))} ÇP`} />}<span>{enchAdd.desc}</span></div></div>}
          {enchChange && <div className="g-mini"><img src={iconUrl(mallIcon('enchant_change'))} alt="" /><div><b>{enchChange.name}</b>{mallForSale('enchant_change') && <Cur k="cp" n={`${fmt(mallPrice('enchant_change'))} ÇP`} />}<span>{enchChange.desc}</span></div></div>}
        </div>
        <p className="g-note">Düşen eşyalarda {maxEnch} taneye kadar efsun olabilir; nadirlik yükseldikçe çok efsun olasılığı artar. Her efsunun dört kademesi vardır (I–IV).</p>
        <More title={`Efsun listesi (${ench.length})`}>
          <div className="g-tbl-wrap">
            <table className="g-tbl small stack">
              <thead><tr><th>Efsun</th><th>Yuvalar</th><th>I · II · III · IV</th></tr></thead>
              <tbody>
                {ench.map((k) => {
                  const e = ENCHANTS[k], v = TUNING.enchants.values?.[k] ?? e.tiers;
                  return <tr key={k}><td><b>{e.name}</b><small className="g-sub">{e.desc}</small></td><td className="g-slots" data-l="Yuvalar">{e.slots.map((s) => SLOT_NAMES[s]).join(', ')}</td><td className="g-tiers">{v.map((x, i) => <span key={i} className={'t' + i}>{e.unit === '%' ? `%${x}` : `+${fmt(x)}`}</span>)}</td></tr>;
                })}
              </tbody>
            </table>
          </div>
        </More>
      </Card>

      <Card icon="📈" title="Beceriler ve statü" tone="em">
        <ul className="g-list">
          <li>Her seviye <b>{statBudget(2) - statBudget(1)} statü puanı</b> verir (Karakter · <kbd>C</kbd>). Puan başına Güç +{STAT_GAIN.str} saldırı, Direnç +{STAT_GAIN.res} savunma, Canlılık +{STAT_GAIN.vit} can; her statü en çok {STAT_MAX}. Seviye atlamak tek başına gücü artırmaz.</li>
          <li>Beceri geliştirme hakkı seviyenle artar (en çok {skillUpgradeBudget(999)}). Her kademe +%{Math.round((skillDamageMult(2) - 1) * 100)} hasar. Bedel: {fmt(skillLow.gems)} Mücevherden ({'1→2'}) {fmt(skillTop.gems)} Mücevhere ({'9→10'}) {Object.keys(skillTop.mats).length > 0 && <>ve malzeme</>} (Beceri · <kbd>K</kbd>).</li>
          <li>Sv. {TUNING.specLevel} olunca uzmanlık dalını seçersin; uzmanlık becerisinin bedeli ayrı yazılır.</li>
        </ul>
      </Card>

      <Card icon="🜂" title="Rünler" sub={`Sv. ${runeConf().unlockLevel}'de açılır · Rün Sahili`} tone="violet">
        <div className="g-two">
          {RUNE_KINDS.map((k) => <div key={k} className="g-mini"><img src={iconUrl(RUNES[k].icon)} alt="" /><div><b style={{ color: RUNES[k].color }}>{RUNES[k].name}</b><span>Her seviye {RUNES[k].statName} +%{fmt(runeConf().pctPerLevel)} (Sv.10 = +%{fmt(runePct(10))}, Sv.{RUNE_MAX_LEVEL} = +%{fmt(runePct(RUNE_MAX_LEVEL))})</span></div></div>)}
        </div>
        <ul className="g-list">
          <li>Üç rün aynı anda takılır (Rün paneli · <kbd>U</kbd>). Takma ve çıkarma yalnız savaş dışında.</li>
          <li>Rün parçaları <b>{MAPS.coast?.name ?? 'Rün Sahili'}</b> canavarlarından düşer. Aynı türden <b>{runeConf().craftCost} parça</b> = 1. seviye rün.</li>
          <li>Yükseltme her zaman başarılı: 1→2 için {runeUpCost(1)}, 2→3 için {runeUpCost(2)} parça; her seviyede bir parça fazla.</li>
          <li>Rünler ve parçalar oyuncu pazarında satılır; rün seviyesiyle el değiştirir.</li>
        </ul>
      </Card>

      <Card icon="🎖" title="Rütbeler" sub={`Sv. ${RANK_LEVEL}'ten sonra`} tone="gold">
        <p className="g-note">Sv. {RANK_LEVEL}'e ulaşan doğrudan <b style={{ color: RANKS[0].color }}>{RANKS[0].name}</b> olur. Sonra kazandığın tecrübe rütbe tecrübesine akar; rütbe adın üstünde renkli görünür, saldırı ve azami cana yüzde ekler.</p>
        <div className="g-tbl-wrap">
          <table className="g-tbl small">
            <thead><tr><th>#</th><th>Rütbe</th><th>Gereken TP</th><th>Bonus</th></tr></thead>
            <tbody>{RANKS.map((r) => <tr key={r.id}><td>{r.id}</td><td><b style={{ color: r.color }}>{r.name}</b></td><td>{r.xp ? fmt(r.xp) : `Sv. ${RANK_LEVEL}`}</td><td>+%{r.atkPct}</td></tr>)}</tbody>
          </table>
        </div>
      </Card>

      <More title="📦 Hangi malzeme nereden çıkar?">
        <div className="g-srcs">
          {sources.map((s) => (
            <div key={s.id} className="g-src">
              <Mat k={s.id} named />
              <span className="use">{s.uses.join(' · ')}</span>
              <span className="from">{s.from.length ? s.from.slice(0, 5).map((f, i) => <span key={i}>{f.where}{f.note ? ` (${f.note})` : ''}{f.chance !== undefined && f.chance < 1 ? ` ${pctTxt(f.chance)}` : f.chance !== undefined ? ' kesin' : ''}</span>) : <span className="muted">yalnız etkinlik ve görev ödülleri</span>}</span>
            </div>
          ))}
        </div>
      </More>
    </>
  );
}

// ───────── 3. Zindanlar & Bosslar ─────────
const npcName = (action: string) => MAPS.bazaar?.npcs.find((n) => n.actions.includes(action))?.name ?? '';
function DungeonTab() {
  const T = TUNING.tower, F = TUNING.forge, W = TUNING.worldBoss;
  const warden = npcName('tower') || npcName('forge');
  const wbDef = MONSTERS.find((m) => m.id === WORLD_BOSS_ID);
  const wbMap = MAPS[WORLD_BOSS_MAP];
  const wbLv = wbMap ? mapMonsters(wbMap).find((x) => x.id === WORLD_BOSS_ID) : undefined;
  const towerMats = new Map<string, [number, number]>();
  for (const f of T.floors) for (const [k, ch] of Object.entries(f.mats)) if (ch > 0) { const c = towerMats.get(k); towerMats.set(k, c ? [Math.min(c[0], ch), Math.max(c[1], ch)] : [ch, ch]); }
  const azFloor = T.floors.findIndex((f) => f.puzzle === 'boss');
  const azName = monName(T.floors[azFloor]?.monster ?? 'azrail');
  const field = Object.values(MAPS).filter((m) => m.travelable).flatMap((m) => mapMonsters(m).filter((x) => x.boss).map((x) => ({ m, x })));
  const share = TUNING.bossShareMin;
  return (
    <>
      <p className="g-lead">Zindanlara Pazar Köyü'ndeki <b>{warden}</b> ile girilir. Bosslarda, boss canının en az <b>%{String(share).replace('.', ',')}</b> oranında hasar veren herkes kendi ganimetini ayrıca alır.</p>
      {T.enabled && (
        <Card icon="🏰" title="Kadim Kule" sub={<><Lv a={T.minLevel} b={null} /> {T.floors.length} kat · zirvede {azName}</>} tone="sky">
          <p className="g-note">Her katta canavarlar ve bir görev ya da bulmaca var; kapı açılınca üst kata çıkarsın. {azName}'i yenen herkes <b>{matName('azrail_chest')}</b> kazanır. Giriş: <b>{warden}</b>.</p>
          <More title={`Katlar (${T.floors.length})`}>
            <ol className="g-floors">
              {T.floors.map((f, i) => <li key={i} className={f.puzzle === 'boss' ? 'boss' : f.puzzle !== 'kill' ? 'puz' : ''}><span className="n">{i + 1}</span><b>{TOWER_PUZZLE_NAMES[f.puzzle]}</b><span className="muted">{monName(f.monster)} · Sv. {f.level[0]}{f.level[1] !== f.level[0] ? `–${f.level[1]}` : ''}</span></li>)}
            </ol>
          </More>
          <div className="g-sect">Katlarda düşenler</div>
          <div className="g-drops">
            {[...towerMats].map(([k, [a, b]]) => <div key={k} className="g-drop"><img src={matIcon(k)} alt="" /><span className="nm">{matName(k)}<small>her öldürmede</small></span><b>{a === b ? pctTxt(a) : `${pctTxt(a)}–${pctTxt(b).slice(1)}`}</b></div>)}
          </div>
          <div className="g-sect">{matName('azrail_chest')} içinden</div>
          <ChestList gems={T.chest.gems} essence={T.chest.essence} drops={dropRows(T.chest.drops)} extra={T.chest.hookChance > 0 && <RowDrop d={{ kind: 'mat', key: 'azrail_hook', chance: T.chest.hookChance, qty: [1, 1] }} />} />
        </Card>
      )}
      {F.enabled && (
        <Card icon="🔥" title="Kor Kulesi" sub={<><Lv a={F.minLevel} b={null} /> {F.floors.length} kat + {monName('f_boss')}</>} tone="ember">
          <p className="g-note">Her grup <b>kendi kulesine</b> girer; katlar dalga dalga gelir, her katta bir bulmaca çözülür. Grupta her ek oyuncu dalgaları %{Math.round(F.partyScale * 100)} büyütür.{F.entryGems > 0 && <> Giriş: <b>{fmt(F.entryGems)} Mücevher</b>.</>}{F.cooldownMin > 0 && <> İki giriş arası {F.cooldownMin} dk.</>} Düşenler <b>evrim</b> malzemesidir.</p>
          <ol className="g-floors">
            {F.floors.map((f, i) => <li key={i} className="puz"><span className="n">{i + 1}</span><b>{FORGE_PUZZLE_NAMES[f.puzzle]}</b><span className="muted">{monName(f.waves[0]?.monster ?? 'f_slag')} · Sv. {f.mon.level} · {f.waves.length} dalga</span></li>)}
            <li className="boss"><span className="n">{F.floors.length + 1}</span><b>{monName('f_boss')}</b><span className="muted">Sv. {F.boss.level}</span></li>
          </ol>
          <div className="g-sect">Katlarda düşenler</div>
          <div className="g-drops">
            {F.floors.flatMap((f, i) => f.mats.map((m) => <div key={i + m.key} className="g-drop"><img src={matIcon(m.key)} alt="" /><span className="nm">{matName(m.key)}<small>{i + 1}. kat · elitte ×{String(F.eliteLoot).replace('.', ',')}</small></span><b>{pctTxt(m.chance)}</b></div>))}
          </div>
          <div className="g-sect">{monName('f_boss')} ve {matName('forge_chest')}</div>
          <div className="g-drops">
            <RowDrop d={{ kind: 'mat', key: 'forge_chest', chance: 1, qty: [1, 1] }} />
            {dropRows(F.boss.drops).map((d, i) => <RowDrop key={i} d={d} />)}
          </div>
          <More title={`${matName('forge_chest')} içinden`}><ChestList gems={F.chest.gems} essence={F.chest.essence} drops={dropRows(F.chest.drops)} /></More>
        </Card>
      )}
      {W.enabled && wbDef && wbMap && (
        <Card icon="🐉" title={<>Dünya Boss'u · {wbDef.name}</>} sub={<><Lv a={W.minLevel} b={null} /> {wbMap.name} · canavar Sv. {wbLv?.level ?? fixedLevel(WORLD_BOSS_ID, wbMap.spawns[0]?.level[0] ?? 1)}</>} tone="violet">
          <p className="g-note">Her kanalda yaklaşık <b>{fmt(wbLv?.respawnMin ?? wbDef.respawnMin ?? 0)} dakikada</b> bir doğar. Mini haritanın altındaki sayaç dolunca <b>“Dünya Boss'una git”</b> düğmesiyle sunağa geçersin; bütün kanal birlikte savaşır.</p>
          <DropList r={monsterLoot(WORLD_BOSS_MAP, WORLD_BOSS_ID)} boss />
        </Card>
      )}
      {field.map(({ m, x }) => {
        const r = monsterLoot(m.id, x.id);
        return (
          <Card key={m.id + x.id} icon="👑" title={x.name} sub={<><span className="g-lv">Sv. {x.level}</span> {m.name}{m.pvp ? ' · PvP' : ''} · her {fmt(x.respawnMin ?? 0)} dk</>} tone={m.pvp ? 'ember' : 'gold'}>
            <p className="g-note">{m.name}{m.minLevel > 1 ? ` (giriş Sv. ${m.minLevel})` : ''} haritasında doğar. Grupla gitmek iyi fikir!{r.maxLevel > 0 && <> Bölge sınırı: <b>Sv. {r.maxLevel}</b> üstündeysen ganimet {pctTxt(r.overMul)} oranına iner.</>}</p>
            <DropList r={r} boss />
          </Card>
        );
      })}
      <p className="g-note center">Boss düğmesi doğma sürelerini gösterir. Tilki Kral dışındaki bossların yeri için <b>{MALL.get('boss_tracker')?.name ?? 'Boss Takip'}</b> (Nesne Market) gerekir.</p>
    </>
  );
}

// ───────── 4. Günlük Hayat ─────────
function LifeTab() {
  const mk = Object.values(MAPS).find((m) => m.market);
  const npc = (a: string) => Object.values(MAPS).flatMap((m) => m.npcs.map((n) => ({ n, m }))).filter(({ n }) => n.actions.includes(a));
  const tg = MALL.get('trade_glass');
  const days = (ms?: number) => (ms ? Math.round(ms / 86_400_000) : 0);
  const crafts = TUNING.crafts.filter((c) => !c.off);
  const G = TUNING.garden, fc = fishingConf(), fishes = fishTable();
  const A = TUNING.arena, KR = TUNING.killRank;
  const quests = TUNING.quests.filter((q) => !q.off);
  const evOn = TUNING.events.list.filter((e) => e.on);
  const per = KR.period === 'day' ? 'Günlük' : KR.period === 'month' ? 'Aylık' : 'Haftalık';
  const cats = MALL_CATS.filter(([c]) => c !== 'yakinda' && c !== 'cp').map(([, n]) => n);
  const fishNpcs = npc('fishing_shop');
  const lake = Object.values(MAPS).find((m) => m.travelable && m.safe && !m.spawns.length && m.npcs.some((n) => n.actions.includes('fishing_shop')));
  const nm = (a: string) => npc(a)[0]?.n.name ?? '';
  const card = (icon: string, title: string, body: React.ReactNode, tone?: 'gold' | 'em' | 'ember' | 'sky' | 'violet') => <Card key={title} icon={icon} title={title} tone={tone} className="g-life"><p>{body}</p></Card>;
  return (
    <div className="g-grid">
      {mk?.market && card('🏪', 'Pazar ve dükkân', <>{mk.name}'ndeki <b>{mk.market.name}</b>'nda “Dükkân Kur” ile tezgâh aç; en çok {STALL_MAX_ITEMS} ürün koyarsın. Başkasının tezgâhına tıklayıp alışveriş yaparsın.{tg && mallForSale('trade_glass') && <> <b>{tg.name}</b> ({fmt(mallPrice('trade_glass'))} ÇP) {days(tg.buff?.ms)} gün boyunca bütün ilanlarda arama yaptırır.</>}</>, 'gold')}
      {card('📦', `Depo · ${nm('storage')}`, <>{STORAGE_BASE_PAGES} sayfa × {STORAGE_PAGE_SLOTS} bölme ile başlarsın; <b>{MALL.get('storage_page')?.name ?? 'Ek Depo Sayfası'}</b> ile en çok {STORAGE_MAX_PAGES} sayfa. Malzemeler, Mücevher ve Öz bölme kaplamaz.</>, 'sky')}
      {crafts.length > 0 && card('🧵', `Üretim · ${nm('craft')}`, <>{crafts.length} tarif: {crafts.slice(0, 5).map((c) => c.name).join(', ')}{crafts.length > 5 ? '…' : ''}. Başarısız olursa malzemelerin yarısı geri döner.</>, 'violet')}
      {G.enabled && card('🌿', `Şifa Bahçesi · ${nm('garden')}`, <>{fmt(G.sicklePrice)} Mücevherlik orakla {HERBS.length} çeşit bitki topla, iksir kaynat: {G.recipes.map((r) => `${matName(r.potion)} (${POTION_EFFECT[r.potion].name.toLocaleLowerCase('tr-TR')} +%${G.effects[r.potion].value})`).join(', ')}.</>, 'em')}
      {fishNpcs.length > 0 && card('🎣', 'Balıkçılık', <>Olta {fmt(fc.rodPrice)} Mücevher: {fishNpcs.map(({ n, m }) => `${n.name} (${m.name})`).join(' · ')}. {lake ? <>{lake.name}'nde </> : null}suya yaklaş, “Olta At”a bas. Çıkanlar: {fishes.map((f) => f.name).join(', ')}.</>, 'sky')}
      {card('🐎', `Binek · ${nm('mount')}`, <>Sv. {MOUNT.level} olunca görevi al, {MOUNT.kills} canavar avla; {MOUNT.seals} {matName(MOUNT.sealKey)} ve {fmt(MOUNT.gems)} Mücevherle <b>{MOUNT.name}</b> senin. Hız ×{String(MOUNT.speedMul).replace('.', ',')}, +{MOUNT.atk} saldırı; <kbd>H</kbd> ile bin/in.</>, 'gold')}
      {card('🏳️', 'Lonca', <>Sv. {GUILD_MIN_LEVEL} ve {fmt(GUILD_COST)} Mücevherle kurulur <span className="g-nw">(<kbd>G</kbd>)</span>. Lider üye davet eder, öz vergisini ayarlar ve rakip loncaya savaş ilan eder; savaşlar {MAPS.guildwar?.name ?? 'Lonca Savaş Meydanı'}'nda.</>, 'ember')}
      {card('⚔️', 'Savaş Arenası', <>Sv. {A.minLevel}+ · {A.durationMin} dk. {A.auto && A.times.length ? <>Her gün açılış saatleri: {A.times.join(', ')}. </> : <>Etkinlik saatlerinde açılır; üstte “Arenaya Katıl” çıkar. </>}En çok rakip yenen kazanır{A.rewards.length > 0 && <>: {A.rewards.map((r, i) => `${medal(i)} ${fmt(r.gems)} Mücevher`).join(' · ')}</>}. Ölümde kayıp yok.</>, 'ember')}
      {card('📜', 'Görevler', <>{quests.length} görev{quests.some((q) => q.repeat === 'daily') && <> ({quests.filter((q) => q.repeat === 'daily').length} tanesi günlük)</>}. NPC'lerden al, <kbd>J</kbd> ile ilerlemeni izle; ödüller Mücevher, Öz, TP ve eşya.</>, 'em')}
      {card('🎉', 'Etkinlikler', <>{(Object.keys(EVENT_NAMES) as (keyof typeof EVENT_NAMES)[]).map((k) => `${EVENT_ICONS[k]} ${EVENT_NAMES[k]}`).join(' · ')}. Üstteki <b>Etkinlik</b> düğmesi şu an etkin olanları ve yaklaşanları gösterir{evOn.length ? ` (${evOn.length} planlı etkinlik)` : ''}.</>, 'violet')}
      {card('🏆', 'Sıralama', <>Seviye ve canavar sıralaması. {per} canavar sıralamasında ilk {KR.rewards.length} ödül alır: {KR.rewards.map((r, i) => `${medal(i)} ${[r.cp ? `${fmt(r.cp)} ÇP` : '', r.gems ? `${fmt(r.gems)} Mücevher` : ''].filter(Boolean).join(' + ') || '—'}`).join(' · ')}.</>, 'gold')}
      {card('💎', 'Nesne Market', <>ÇP ile alınır: {cats.join(', ')}. ÇP, E-PIN kodu ya da ÇP Kuponuyla yüklenir. Süreli ürünler çantadan “Kullan” denince başlar.</>, 'violet')}
      {card('💧', 'Market (Öz)', <>{fmt(TUNING.essxEss)} Öz → {fmt(TUNING.essxGems)} Mücevher bozdur. Kırmızı İksir: {fmt(TUNING.potionEss)} Öz ya da {fmt(TUNING.potionGems)} Mücevher.</>, 'sky')}
      {card('🤖', 'Oto atak', <>Günde {fmt(TUNING.autoAttackMin)} dakika; Türkiye saatiyle 00.00'da yenilenir. Üstteki <b>Oto atak</b> düğmesinden başlat.</>, 'em')}
      {card('🌍', 'Dünya Sağlığı', <>Herkesin ortak çubuğu: zamanla azalır, <b>Öz bağışlarıyla</b> artar. Üstteki çubuğa dokunup bağış yap.</>, 'em')}
    </div>
  );
}

// ───────── 5. İpuçları ─────────
const KEYS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Yürü (yön tuşları da olur)'], [['Sol tık'], 'Yürü · canavara saldır · NPC ile konuş'], [['Sağ tık', 'sürükle'], 'Kamerayı döndür'], [['Tekerlek'], 'Yakınlaştır / uzaklaştır'],
  [['Boşluk', '1'], 'Saldır (basılı tut)'], [['2', '–', '6'], 'Beceriler (çubuktaki sırayla)'], [['Q'], 'Kırmızı İksir iç'], [['Z', 'F'], 'Yerdekileri topla'], [['Tab'], 'Sıradaki canavarı seç'],
  [['H'], 'Bineğe bin / in'], [['I', 'B'], 'Çanta'], [['C'], 'Karakter ve statü'], [['K'], 'Beceri penceresi'], [['M'], 'Büyük harita'], [['J'], 'Görevler'], [['G'], 'Lonca'], [['T'], 'Işınlan'],
  [['Enter'], 'Sohbet'], [['Esc'], 'Pencereyi kapat / hedefi bırak'], [['F8'], 'Ekran görüntüsü'],
];
function TipsTab() {
  const safe = Object.values(MAPS).filter((m) => m.travelable && m.safe).map((m) => m.name);
  const pvp = Object.values(MAPS).filter((m) => m.travelable && m.pvp).map((m) => m.name);
  const vm = VARIANT_LOOT_MULT.map((x) => String(x).replace('.', ','));
  // dokunmatik cihazda önce telefon ipuçları, klavye kısayolları açılır bölümde
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const keys = <div className="g-keys">{KEYS.map(([k, t], i) => <div key={i} className="g-key"><span className="ks">{k.map((x, j) => x === '–' ? <span key={j} className="dash">–</span> : <kbd key={j}>{x}</kbd>)}</span><span className="kt">{t}</span></div>)}</div>;
  return (
    <>
      {!touch && <Card icon="⌨️" title="Bilgisayar kısayolları" tone="gold">{keys}</Card>}
      <Card icon="📱" title="Telefonda" tone="em">
        <ul className="g-list">
          <li>Sol alttaki <b>altın topu</b> sürükle: yürürsün. <b>⚔</b> düğmesine basılı tut: saldırırsın.</li>
          <li>Beceri, <b>iksir</b>, <b>el</b> (topla) ve <b>Hedef</b> (sıradaki canavar) düğmeleri sağ altta. Kilitli beceride açılış seviyesi yazar.</li>
          <li>Ekranda tek parmakla kaydır: kamera döner. İki parmakla: yakınlaştır ve döndür.</li>
          <li>Bir oyuncuya <b>uzun bas</b>: fısıltı, ticaret, düello, arkadaşlık ve grup menüsü.</li>
          <li><b>Menü</b> düğmesinde Karakter, Beceri, Görev, Lonca, Arkadaş, Sıralama, Rehber ve Sohbet var; <b>Çanta</b> ile <b>Işınlan</b> hep ekranda.</li>
          <li><b>Tam ekran</b> düğmesi adres çubuğunu gizler; tarayıcın izin verirse Ayarlar'dan <b>Ana ekrana ekle</b>.</li>
        </ul>
      </Card>
      <Card icon="🍀" title="Altın ipuçları" tone="violet">
        <ul className="g-list">
          <li>Canavarı seçip hedef çerçevesindeki <b>?</b> düğmesine bas: o canavardan ne düştüğünü şanslarıyla görürsün.</li>
          <li><b>Agresif</b> canavarlar ganimeti ×{vm[1]}, <b>Katil</b> canavarlar ×{vm[2]} şansla bırakır (ama daha güçlüdür).</li>
          <li>Zamanlama çubuklu beceride ibre <b>yeşildeyken</b> bas: ×{String(QTE_MULT).replace('.', ',')} hasar.</li>
          <li>Bölgenin ganimet sınırını geçince düşenler azalır; bir üst bölgeye geçme zamanı!</li>
          {safe.length > 0 && <li>Güvenli bölgeler: {safe.join(', ')}.{pvp.length > 0 && <> Açık PvP: {pvp.join(', ')}.</>}</li>}
          <li>Savaştayken ışınlanamaz, artı basamaz ve dönüşüm yapamazsın; önce birkaç saniye savaştan çık.</li>
        </ul>
      </Card>
      {touch && <More title="⌨️ Bilgisayar kısayolları">{keys}</More>}
    </>
  );
}

/** Rehber içeriği (oyunda pencere, sitede sayfa). level: oyuncunun seviyesi (uygun haritayı vurgular). */
export function GuideContent({ level, site }: { level?: number; site?: boolean }) {
  const [tab, setTabS] = useState<Tab>(() => { try { const t = localStorage.getItem(TAB_KEY) as Tab | null; return t && TABS.some(([k]) => k === t) ? t : 'yol'; } catch { return 'yol'; } });
  const [, force] = useState(0);
  useEffect(() => onConfig(() => force((n) => n + 1)), []);
  const body = useRef<HTMLDivElement>(null);
  const setTab = (t: Tab, btn?: HTMLElement) => {
    setTabS(t); try { localStorage.setItem(TAB_KEY, t); } catch { /* depolama kapalı olabilir */ }
    btn?.scrollIntoView({ inline: 'nearest', block: 'nearest' });
    // aşağıdayken sekme değişince yeni sekmenin başına dön (sekme çubuğu üstte yapışık kalır)
    const b = body.current, sc = b?.closest('.bd, .site');
    if (b && sc && b.getBoundingClientRect().top < sc.getBoundingClientRect().top) requestAnimationFrame(() => b.scrollIntoView({ block: 'start' }));
  };
  return (
    <div className={'guide' + (site ? ' guide-site' : ' guide-game')}>
      <div className="guide-hero">
        <GuideMascot size={site ? 76 : 60} />
        <div className="gh-tx">
          <b>Maceracının Rehberi</b>
          <span>Nerede avlanacağın, eşyanı nasıl güçlendireceğin, zindanlar ve dahası; hepsi tek yerde.</span>
        </div>
        {level !== undefined && <span className="gh-lv"><small>Seviyen</small>{level}</span>}
      </div>
      <nav className="guide-tabs" role="tablist">
        {TABS.map(([k, ic, nm]) => <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'on' : ''} onClick={(e) => setTab(k, e.currentTarget)}><span aria-hidden>{ic}</span>{nm}</button>)}
      </nav>
      <div className="guide-body" ref={body}>
        {tab === 'yol' && <RoadTab level={level} />}
        {tab === 'guc' && <PowerTab />}
        {tab === 'zindan' && <DungeonTab />}
        {tab === 'hayat' && <LifeTab />}
        {tab === 'ipucu' && <TipsTab />}
      </div>
      <div className="guide-foot">Sayılar oyunun güncel ayarlarından gelir; yönetim değiştirdiğinde rehber de kendiliğinden güncellenir.</div>
    </div>
  );
}

/** Oyun içi pencere */
export function GuidePanel() {
  const level = useStore((s) => s.self?.level);
  return <Panel title="Rehber" width={860}><GuideContent level={level} /></Panel>;
}
/** Sağ üst düğme (Etkinlik'in sağında) */
export function GuideButton() {
  const open = useStore((s) => s.panel === 'guide');
  return (
    <button className={'boss-btn guide-btn' + (open ? ' on' : '')} title="Rehber" onClick={() => { sfx.play('ui'); store.set((s) => ({ panel: s.panel === 'guide' ? null : 'guide', mobMenu: false })); }}>
      <BookIcon /><span>Rehber</span>
    </button>
  );
}
