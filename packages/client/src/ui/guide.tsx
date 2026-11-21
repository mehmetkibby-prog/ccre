/**
 * Rehber: oyunda sağ üstteki "Rehber" düğmesiyle açılan pencere ve sitedeki /rehber sayfası.
 * Masal kitabı / maceracı günlüğü havasında: Bilge Ayaz (bilge baykuş) her bölümün başında kısa konuşur; ana ekranda
 * resimli bölüm kartları, bölümlerde numaralı adımlar, merdivenler, patika ve ikonlu ganimet yongaları var. Derin
 * sayılar "Ayrıntılar"ın arkasında. Bütün sayılar o anki ayardan (yönetim paneli) okunur; ayar değişince yenilenir.
 * GuideContent oyuna bağlı değildir (site de kullanır); GuidePanel onu oyunun pencere çerçevesine koyar.
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  MAPS, MONSTERS, TUNING, MATERIAL, MALL, ITEM_TPL, RARITY, RARITIES, ENCHANTS, ENCHANT_TIER_WEIGHTS, MAX_PLUS, MOUNT, STAT_GAIN, STAT_MAX,
  STORAGE_PAGE_SLOTS, STORAGE_BASE_PAGES, STORAGE_MAX_PAGES, STALL_MAX_ITEMS, VARIANT_LOOT_MULT, MALL_CATS, EVENT_NAMES, EVENT_ICONS, EVO_NAMES, EVO_COLORS,
  TRANSFORM_GROUP_NAMES, TRANSFORM_GROUPS, TOWER_PUZZLE_NAMES, FORGE_PUZZLE_NAMES, POTION_EFFECT, HERBS, UNIQUE_EXTRA, QTE_MULT, WORLD_BOSS_ID, WORLD_BOSS_MAP,
  RUNES, RUNE_KINDS, RUNE_MAX_LEVEL, RANKS, RANK_LEVEL, PVP_RING, SLOT_NAMES,
  upgradeSteps, upgradeFailDown, masteryChance, transformConf, itemPower, mallPrice, mallForSale, mallIcon, fishingConf, fishTable,
  statBudget, skillUpgradeBudget, skillDamageMult, skillUpCost, runeConf, runePct, runeUpCost,
  type Rarity, type Slot, type ResolvedLoot,
} from '@col/shared';
import { iconUrl } from '../game/art/icons.ts';
import { onConfig } from '../admin/config.ts';
import { store, useStore, type SelfInfo } from '../game/store.ts';
import { Panel } from './panels.tsx';
import { GUILD_COST, GUILD_MIN_LEVEL } from './guild.tsx';
import { sfx } from '../game/audio.ts';
import {
  roadmap, recommendedStop, milestones, materialSources, monsterLoot, mapMonsters, rarityShares, dropName, dropRows, pctTxt, fmt, range, matName, monName,
  powerAdvice, type GuideStop, type DropRow, type PowerTip,
} from './guideData.ts';
import './guide.css';

// ───────── bölümler ─────────
type Ch = 'guc' | 'ilk' | 'yol' | 'esya' | 'zindan' | 'pazar' | 'eglence' | 'run' | 'puf';
interface ChapterDef { id: Ch; icon: string; title: string; teaser: string; c: string }
function chapters(): ChapterDef[] {
  return [
    { id: 'guc', icon: '💪', title: 'Gücünü Artır', teaser: 'Bilge Ayaz\'dan sana özel öneriler', c: '#ffcf5a' },
    { id: 'ilk', icon: '🌱', title: 'İlk Adımlar', teaser: 'Oyuna doğru ve hızlı başla', c: '#5fe39a' },
    { id: 'yol', icon: '🗺️', title: 'Nereye Gitmeliyim?', teaser: 'Seviyene göre av yerleri', c: '#6cc8ff' },
    { id: 'esya', icon: '⚒️', title: 'Eşyanı Güçlendir', teaser: 'Artı, evrim ve Eşsiz dönüşüm', c: '#ffb45a' },
    { id: 'zindan', icon: '🐉', title: 'Zindanlar ve Bosslar', teaser: 'Kuleler, bosslar ve ganimet', c: '#ff7a5a' },
    { id: 'pazar', icon: '🏪', title: 'Pazar ve Ticaret', teaser: 'Dükkân, depo, market, üretim', c: '#e8c27a' },
    { id: 'eglence', icon: '🎣', title: 'Eğlence', teaser: 'Balık, bahçe, binek, meydanlar', c: '#5fe0d0' },
    { id: 'run', icon: '🔮', title: 'Rün ve Rütbe', teaser: `Sv. ${runeConf().unlockLevel} sonrası yeni güçler`, c: '#c58bff' },
    { id: 'puf', icon: '💡', title: 'Püf Noktaları', teaser: 'Kısayollar ve altın ipuçları', c: '#ffe27a' },
  ];
}
const SEEN_KEY = 'col_guide_seen';
const readSeen = (): Ch[] => { try { return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]'); } catch { return []; } };
const isCh = (s: string): s is Ch => chapters().some((c) => c.id === s);

// ───────── küçük yapı taşları ─────────
const matIcon = (k: string) => iconUrl(MATERIAL.get(k)?.icon ?? (MALL.has(k) ? mallIcon(k) : 'dust'));
function dropIcon(d: { kind: string; key: string; rarity?: string }) {
  if (d.kind === 'item') return iconUrl(ITEM_TPL.get(d.key)?.icon ?? (d.key.startsWith('a_') ? 'armor_guardian' : 'sword'), Math.max(0, RARITIES.indexOf((d.rarity ?? 'blue') as Rarity)));
  return d.kind === 'mall' ? iconUrl(mallIcon(d.key)) : matIcon(d.key);
}
const ART_EMOJI: Record<string, string> = {
  fox: '🦊', goblin: '👺', wolf: '🐺', rotguard: '🧟', devourer: '👾', lynx: '🐆', golem: '🧊', seer: '🔮', k_knight: '🗡️', k_gargoyle: '🦇',
  c_crab: '🦀', c_raider: '☠️', c_siren: '🧜‍♀️', c_golem: '🗿', blackstone: '🪨', fox_king: '🦊', world_boss: '🐉', azrail: '💀', f_boss: '🔨', f_slag: '🌋',
  t_skeleton: '💀', t_gargoyle: '🦇', t_wraith: '👻', t_knight: '⚔️', t_executioner: '🪓', boss_tree: '🌳',
};
const monEmoji = (id: string) => ART_EMOJI[MONSTERS.find((m) => m.id === id)?.art ?? ''] ?? '👾';
const THEME_EMOJI: Record<string, string> = { village: '🏘️', forest: '🌲', frozen: '❄️', black: '🌋', coast: '🌊', lake: '🏞️' };
const npcName = (action: string) => Object.values(MAPS).flatMap((m) => m.npcs).find((n) => n.actions.includes(action))?.name ?? '';

/** Bilge Ayaz: gözlüklü, dala tünemiş sevimli baykuş (göz kırpar) */
export function Owl({ size = 76 }: { size?: number }) {
  return (
    <svg className="rh-owl" width={size} height={size} viewBox="0 0 96 96" aria-hidden>
      <defs>
        <radialGradient id="rho-b" cx="50%" cy="32%" r="72%"><stop offset="0" stopColor="#dcA460" /><stop offset="1" stopColor="#84501f" /></radialGradient>
        <radialGradient id="rho-f" cx="50%" cy="40%" r="62%"><stop offset="0" stopColor="#fff6e0" /><stop offset="1" stopColor="#ecd3a2" /></radialGradient>
      </defs>
      <ellipse cx="48" cy="91" rx="26" ry="3.5" fill="rgba(0,0,0,.28)" />
      <path d="M8 85 Q48 78 90 84" stroke="#6b4423" strokeWidth="5" strokeLinecap="round" fill="none" />
      <path d="M74 81 q7 -10 16 -7 q-6 7 -16 7z" fill="#45e08f" stroke="#1f7a4a" strokeWidth="1" />
      <path d="M23 28 L19 7 L37 21 Z" fill="#8a5326" /><path d="M73 28 L77 7 L59 21 Z" fill="#8a5326" />
      <ellipse cx="48" cy="51" rx="30" ry="32" fill="url(#rho-b)" />
      <ellipse cx="48" cy="63" rx="18" ry="17" fill="#f2dbaa" />
      <path d="M40 59 q3 3 6 0 M50 59 q3 3 6 0 M45 67 q3 3 6 0" stroke="#c99a5a" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M19 47 Q11 67 26 79 Q24 63 28 51 Z" fill="#74421c" /><path d="M77 47 Q85 67 70 79 Q72 63 68 51 Z" fill="#74421c" />
      <circle cx="36" cy="40" r="13" fill="url(#rho-f)" /><circle cx="60" cy="40" r="13" fill="url(#rho-f)" />
      <g className="rh-owl-eyes">
        <circle cx="36" cy="40" r="7" fill="#2a1a0c" /><circle cx="60" cy="40" r="7" fill="#2a1a0c" />
        <circle cx="38.5" cy="37.5" r="2.5" fill="#fff" /><circle cx="62.5" cy="37.5" r="2.5" fill="#fff" />
      </g>
      <circle cx="36" cy="40" r="10.5" fill="none" stroke="#e8b84e" strokeWidth="2" /><circle cx="60" cy="40" r="10.5" fill="none" stroke="#e8b84e" strokeWidth="2" />
      <path d="M46.5 40 q1.5 -2.4 3 0" stroke="#e8b84e" strokeWidth="2" fill="none" />
      <path d="M44.5 47.5 L51.5 47.5 L48 54.5 Z" fill="#ffb347" stroke="#c46f1c" strokeWidth="1" strokeLinejoin="round" />
      <ellipse cx="27" cy="53" rx="4" ry="2.2" fill="#ff9a86" opacity=".6" /><ellipse cx="69" cy="53" rx="4" ry="2.2" fill="#ff9a86" opacity=".6" />
      <path d="M41 80 l-3 5 M41 80 l0 6 M41 80 l3 5 M55 80 l-3 5 M55 80 l0 6 M55 80 l3 5" stroke="#ffb347" strokeWidth="2.4" strokeLinecap="round" />
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

/** Bilge Ayaz konuşuyor */
function Say({ children, small }: { children: React.ReactNode; small?: boolean }) {
  return (
    <div className={'rh-say' + (small ? ' small' : '')}>
      <Owl size={small ? 58 : 78} />
      <div className="rh-bubble"><span className="who">Bilge Ayaz</span>{children}</div>
    </div>
  );
}
function Sec({ icon, title, sub, children, className, id }: { icon: string; title: React.ReactNode; sub?: React.ReactNode; children: React.ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={'rh-sec' + (className ? ' ' + className : '')}>
      <h3><span className="ic" aria-hidden>{icon}</span><span>{title}{sub && <small>{sub}</small>}</span></h3>
      {children}
    </section>
  );
}
interface Step { icon: string; title: React.ReactNode; text?: React.ReactNode; extra?: React.ReactNode }
function Steps({ items }: { items: Step[] }) {
  return (
    <ol className="rh-steps">
      {items.map((s, i) => (
        <li key={i}>
          <span className="n">{i + 1}</span>
          <div className="bd"><b><span aria-hidden>{s.icon}</span> {s.title}</b>{s.text && <p>{s.text}</p>}{s.extra}</div>
        </li>
      ))}
    </ol>
  );
}
/** "Ayrıntılar": derin sayılar burada saklı */
function More({ label = 'Ayrıntılar', children }: { label?: string; children: React.ReactNode }) {
  const [o, setO] = useState(false);
  return (
    <div className={'rh-more' + (o ? ' open' : '')}>
      <button type="button" className="rh-more-b" onClick={() => setO(!o)}>{o ? 'Gizle' : label}<i aria-hidden>▾</i></button>
      {o && <div className="rh-more-bd">{children}</div>}
    </div>
  );
}
const Pill = ({ c, children }: { c?: string; children: React.ReactNode }) => <span className={'rh-pill' + (c ? ' ' + c : '')}>{children}</span>;
const Lv = ({ a, b }: { a: number; b?: number | null }) => <span className="rh-lv">Sv. {a}{b === null ? '+' : b !== undefined && b !== a ? `–${b}` : ''}</span>;
const RarDot = ({ r }: { r: Rarity }) => <span className="rh-rar" style={{ ['--rc' as string]: RARITY[r]?.color ?? '#ccc' }}>{RARITY[r]?.name ?? r}</span>;
function Mat({ k, n }: { k: string; n?: number }) {
  return <span className="rh-mat" title={matName(k)}><img src={matIcon(k)} alt="" />{n !== undefined && <b>×{fmt(n)}</b>}</span>;
}
const Gem = ({ n }: { n: number }) => <span className="rh-mat gem" title="Mücevher"><img src={iconUrl('gem')} alt="" /><b>{fmt(n)}</b></span>;

/** Ganimet yongası listesi: en çok `max` tane, kalanı "Tümü" ile */
interface Loot { key: string; icon: string; name: string; val: string; sure?: boolean; sub?: React.ReactNode }
function LootChips({ items, max = 6 }: { items: Loot[]; max?: number }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, max);
  return (
    <div className="rh-loot">
      {shown.map((x) => (
        <div key={x.key} className={'rh-lchip' + (x.sure ? ' sure' : '')} title={x.name}>
          <img src={x.icon} alt="" />
          <span className="t"><span className="nm">{x.name}</span>{x.sub}<b>{x.val}</b></span>
        </div>
      ))}
      {items.length > max && <button type="button" className="rh-all" onClick={() => setAll(!all)}>{all ? 'Daha az' : `Tümü (${items.length})`}</button>}
    </div>
  );
}
function lootOf(r: ResolvedLoot, boss?: boolean): Loot[] {
  const out: Loot[] = [];
  const rd = Object.fromEntries(Object.entries(r.rarityWeights).map(([k, w]) => [k, (w ?? 0) * (TUNING.rarityDrop[k] ?? 1)]));
  const rs = rarityShares(rd);
  if ((r.equipChance > 0 || boss) && rs.length) {
    const top = rs[rs.length - 1][0];
    out.push({ key: 'eq', icon: iconUrl('sword', RARITIES.indexOf(top)), name: boss ? '3 ekipman' : 'Ekipman', val: boss ? 'kesin' : pctTxt(r.equipChance * TUNING.dropMul), sure: boss, sub: <span className="rars">{rs.map(([k]) => <RarDot key={k} r={k} />)}</span> });
  }
  for (const d of r.drops) out.push(dropLoot(d));
  for (const m of [...r.materials].sort((a, b) => b.chance - a.chance)) out.push({ key: 'm' + m.id, icon: matIcon(m.id), name: matName(m.id), val: pctTxt(m.chance * TUNING.dropMul) });
  const ess = r.essence.map((x) => x * TUNING.essenceMul);
  if (ess[1] > 0) out.push({ key: 'ess', icon: iconUrl('essence'), name: 'Yaşam Özü', val: range(ess[0], ess[1]), sure: true });
  return out;
}
const dropLoot = (d: DropRow): Loot => ({ key: 'd' + d.kind + d.key, icon: dropIcon(d), name: dropName(d), val: (d.chance >= 1 ? 'kesin' : pctTxt(d.chance)) + (d.qty[1] > 1 ? ` · ×${range(d.qty[0], d.qty[1])}` : ''), sure: d.chance >= 1 });
const chestLoot = (gems: [number, number], essence: [number, number], drops: DropRow[]): Loot[] => [
  ...(gems[1] > 0 ? [{ key: 'g', icon: iconUrl('gem'), name: 'Mücevher', val: range(gems[0], gems[1]), sure: true }] : []),
  ...(essence[1] > 0 ? [{ key: 'e', icon: iconUrl('essence'), name: 'Yaşam Özü', val: range(essence[0], essence[1]), sure: true }] : []),
  ...drops.map(dropLoot),
];

// ───────── 0. Gücünü Artır ─────────
/** Sunucunun hesapladığı Karakter Gücü (self.combat.power; eski sürümde yoksa gösterilmez) */
const powerOf = (self?: SelfInfo) => (self?.combat as { power?: number } | undefined)?.power;
function PowerChapter({ self }: { self?: SelfInfo }) {
  const tips = powerAdvice(self);
  const hot = tips.filter((t) => t.hot);
  const pw = powerOf(self);
  return (
    <>
      {pw !== undefined && <div className="rh-power"><span className="ic" aria-hidden>⚔️</span><span><small>Karakter Gücün</small><b>{fmt(pw)}</b></span><em>Önerileri yaptıkça bu sayı büyür!</em></div>}
      <Say>{self
        ? hot.length ? <>Önce şunu söyleyeyim: <b>{hot[0].title.replace(/!$/, '')}</b>. Hemen kullan, bedava güç! Sonra aşağıdakilere sırayla bak.</> : <>Senin için baktım. Aşağıdakileri sırayla yaparsan çok daha güçlü olursun!</>
        : <>Güçlenmenin birçok yolu var. En kolayından başla: puanlarını dağıt, sonra eşyalarına artı bas. İşte hepsi!</>}</Say>
      <div className="rh-tips">
        {tips.map((t) => <TipCard key={t.id} t={t} />)}
      </div>
      {!self && <p className="rh-fine center">🎮 Oyunda bu bölüm karakterine bakar ve sana özel öneriler verir: boştaki puanların, sıradaki artın, evrim sayacın…</p>}
    </>
  );
}
function TipCard({ t }: { t: PowerTip }) {
  return (
    <div className={'rh-tip' + (t.hot ? ' hot' : '')}>
      <span className="ic" aria-hidden>{t.icon}</span>
      <div className="tx"><b>{t.title}</b><small>{t.how}</small></div>
      {t.gain && <span className="gain">{t.gain}</span>}
    </div>
  );
}

// ───────── 1. İlk Adımlar ─────────
function FirstChapter({ level }: { level?: number }) {
  const stops = roadmap();
  const first = stops[0], second = stops[1];
  const q = TUNING.quests.find((x) => !x.off && x.minLevel <= 1) ?? TUNING.quests.find((x) => !x.off);
  const qGiver = q ? Object.values(MAPS).flatMap((m) => m.npcs).find((n) => n.id === q.giver)?.name : undefined;
  const sk = skillUpCost(1, false);
  return (
    <>
      <Say>{level !== undefined && level >= (second?.minLevel ?? 10) ? <>İlk adımları çoktan geçmişsin, aferin! Yine de şu altın kuralları bir hatırlayalım.</> : <>Hoş geldin maceracı! Hiç dert etme; şu altı adımı izle, gerisi kendiliğinden gelir.</>}</Say>
      <Steps items={[
        { icon: '🦊', title: 'İlk avına çık', text: <>{first?.map.name}'nün güneyindeki Tilki Korusu yeni başlayanlar için. Canavara tıkla ya da saldırı düğmesine bas.</>, extra: first && <div className="rh-chips">{first.monsters.map((m) => <span key={m.id} className="rh-chip">{monEmoji(m.id)} {m.name} <em>Sv. {m.level}</em></span>)}</div> },
        { icon: '📜', title: 'Görev al', text: q ? <>Başındaki işaretten görevi al: ilk görevin <b>{q.name}</b>{qGiver ? <> ({qGiver})</> : null}. Görev penceresi: <kbd>J</kbd></> : <>NPC'lerden görev al; ödülleri güzel! Görev penceresi: <kbd>J</kbd></> },
        { icon: '🎯', title: 'Statü puanlarını dağıt', text: <>Seviye atlamak tek başına güç vermez! Her seviyede <b>{statBudget(2) - statBudget(1)} puan</b> gelir; Karakter <kbd>C</kbd> penceresinden dağıt.</>, extra: <div className="rh-stats"><span>⚔️ Güç <b>+{STAT_GAIN.str} saldırı</b></span><span>🛡️ Direnç <b>+{STAT_GAIN.res} savunma</b></span><span>❤️ Canlılık <b>+{STAT_GAIN.vit} can</b></span></div> },
        { icon: '✨', title: 'Becerilerini geliştir', text: <>Beceri <kbd>K</kbd> penceresinden Mücevherle geliştir (ilk kademe {fmt(sk.gems)} Mücevher). Her kademe <b>+%{Math.round((skillDamageMult(2) - 1) * 100)} hasar</b>.</> },
        { icon: '🧪', title: 'İksirin hep yanında olsun', text: <>Canın azalınca <kbd>Q</kbd> ya da iksir düğmesi. Üstteki <b>Market</b>'te Kırmızı İksir {fmt(TUNING.potionEss)} Öz.</> },
        { icon: '🧭', title: 'Yeni bölgelere ışınlan', text: second ? <>Sv. {second.minLevel} olunca <b>{second.map.name}</b> açılır. Işınlanmak için <kbd>T</kbd> ya da köydeki <b>{npcName('teleport')}</b>.</> : <>Işınlanmak için <kbd>T</kbd>.</> },
      ]} />
    </>
  );
}

// ───────── 2. Nereye Gitmeliyim? ─────────
function RoadChapter({ level }: { level?: number }) {
  const stops = roadmap();
  const rec = recommendedStop(stops, level);
  const recStop = stops.find((s) => s.map.id === rec);
  const ms = milestones(GUILD_MIN_LEVEL);
  const next = level !== undefined ? ms.filter((m) => m.level > level) : ms;
  return (
    <>
      <Say>{recStop && level !== undefined
        ? <>Sv. {level} için en güzel av yerin <b>{recStop.map.name}</b>. {recStop.cap > 0 && level > recStop.cap ? <>Ama dikkat: burada ganimet azalmaya başladı, bir sonraki durağa hazırlan!</> : <>Patikayı takip et; seviyen yettikçe bir sonraki durağa geç.</>}</>
        : <>Her bölgenin bir giriş seviyesi var. Patikayı takip et; seviyen yettikçe bir sonraki durağa geç!</>}</Say>
      <div className="rh-path">
        {stops.map((s, i) => <StopCard key={s.map.id} s={s} i={i} on={s.map.id === rec} locked={level !== undefined && level < s.minLevel} />)}
      </div>
      <Sec icon="🌟" title={level !== undefined ? 'Sırada neler var?' : 'Hangi seviyede ne açılır?'}>
        <div className="rh-ms">
          {(next.length ? next : ms).slice(0, 6).map((m, i) => <div key={i} className={'rh-m' + (i === 0 && level !== undefined ? ' next' : '')}><span className="lv">{m.level}</span><span className="ic" aria-hidden>{m.icon}</span><span className="tx">{m.text}</span></div>)}
        </div>
        {ms.length > 6 && <More label="Bütün liste"><div className="rh-ms">{ms.map((m, i) => <div key={i} className={'rh-m' + (level !== undefined && m.level <= level ? ' done' : '')}><span className="lv">{m.level}</span><span className="ic" aria-hidden>{m.icon}</span><span className="tx">{m.text}</span></div>)}</div></More>}
      </Sec>
    </>
  );
}
function StopCard({ s, i, on, locked }: { s: GuideStop; i: number; on: boolean; locked: boolean }) {
  const m = s.map;
  const loot: Loot[] = [
    ...(s.equipChance > 0 && s.rarities.length ? [{ key: 'eq', icon: iconUrl('sword', RARITIES.indexOf(s.rarities[s.rarities.length - 1][0])), name: 'Ekipman', val: pctTxt(s.equipChance), sub: <span className="rars">{s.rarities.map(([r]) => <RarDot key={r} r={r} />)}</span> }] : []),
    ...s.mats.map((x) => ({ key: x.id, icon: matIcon(x.id), name: matName(x.id), val: pctTxt(x.chance) })),
  ];
  return (
    <div className={'rh-stop' + (i % 2 ? ' r' : ' l') + (on ? ' on' : '') + (locked ? ' locked' : '') + (m.pvp ? ' pvp' : '')}>
      <div className="pin" aria-hidden><span>{THEME_EMOJI[m.theme] ?? '🗺️'}</span><i>{i + 1}</i></div>
      <article className="card">
        {on && <span className="here">📍 Şu an buradasın</span>}
        <header><h4>{m.name}</h4><Lv a={s.minLevel} b={s.maxLevel} />{m.safe ? <Pill c="safe">Güvenli</Pill> : m.pvp ? <Pill c="pvp">PvP</Pill> : null}</header>
        <div className="rh-chips">
          {s.monsters.map((x) => <span key={x.id} className="rh-chip">{monEmoji(x.id)} {x.name} <em>Sv.{x.level}</em></span>)}
          {s.bosses.map((x) => <span key={x.id} className="rh-chip boss">👑 {x.name} <em>Sv.{x.level}</em></span>)}
        </div>
        <div className="mini-loot" title="Burada düşenler">
          {s.rarities.map(([r]) => <RarDot key={r} r={r} />)}
          {s.mats.slice(0, 4).map((x) => <img key={x.id} src={matIcon(x.id)} alt={matName(x.id)} title={matName(x.id)} />)}
        </div>
        {(s.cap > 0 || m.dropPenalty === 'gems5') && (
          <div className="notes">
            {s.cap > 0 && <span>📉 Sv. {s.cap} üstünde ganimet azalır</span>}
            {m.dropPenalty === 'gems5' && <span>⚠️ Bir oyuncu seni yenerse Mücevherinin %5'i gider</span>}
          </div>
        )}
        <More label="Ganimet"><LootChips items={loot} max={8} /></More>
      </article>
    </div>
  );
}

// ───────── 3. Eşyanı Güçlendir ─────────
function GearChapter() {
  const steps = upgradeSteps();
  const E = TUNING.evo, tc = transformConf();
  const mastery = MALL.get('mastery_seal'), protect = MALL.get('protect_seal');
  const enchAdd = MALL.get('enchant_add'), enchChange = MALL.get('enchant_change');
  const maxEnch = ENCHANT_TIER_WEIGHTS.length;
  const ench = (Object.keys(ENCHANTS) as (keyof typeof ENCHANTS)[]).filter((k) => !ENCHANTS[k].legacy && !(TUNING.enchants.disabled ?? []).includes(k));
  const smith = npcName('upgrade');
  const from = tc.from[0] ?? 'crimson';
  const uqRows: [Slot, string][] = [['weapon', 'w_guardian'], ['armor', 'a_guardian'], ['necklace', 'necklace'], ['earring', 'earring'], ['bracelet', 'bracelet']];
  const chanceCol = (c: number) => (c >= 75 ? '#6fe08a' : c >= 40 ? '#ffd25a' : '#ff8a6a');
  const sources = materialSources();
  return (
    <>
      <Say>Silahın ve zırhın güçlendikçe sen de güçlenirsin! Üç yol var, üçü de <b>{smith}</b>'nun örsünde: artı basma, evrim ve Eşsiz dönüşüm.</Say>
      <div className="rh-trio">
        {([['rh-arti', '➕', 'Artı basma', 'Hemen güç'], ['rh-evrim', '🌀', 'Evrim', 'Avladıkça'], ['rh-essiz', '💛', 'Eşsiz', 'Son dokunuş'], ['rh-efsun', '🔮', 'Efsun', 'Ek özellikler']] as const).map(([id, ic, t, s]) => (
          <button type="button" key={id} onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })}><span aria-hidden>{ic}</span><b>{t}</b><small>{s}</small></button>
        ))}
      </div>

      <Sec id="rh-arti" icon="➕" title="Artı basma" sub={`Silah ve zırh · +${MAX_PLUS}'ya kadar`}>
        <div className="rh-stairs" role="list">
          {steps.map((s, i) => (
            <div key={s.target} className="st" role="listitem" style={{ ['--i' as string]: i, ['--cc' as string]: chanceCol(s.chance) }}>
              <b>+{s.target}</b>
              <span className="meter"><i style={{ width: `${s.chance}%` }} /></span>
              <small>%{s.chance}</small>
            </div>
          ))}
        </div>
        <div className="rh-chips center">
          <Pill c={upgradeFailDown() ? 'warn' : ''}>{upgradeFailDown() ? '❌ Başarısızsa bir kademe düşer' : '🙂 Başarısızsa kademe korunur'}</Pill>
          {mastery && <Pill c="good">🍀 {mastery.name}: şans ×1,3</Pill>}
          {protect && mallForSale('protect_seal') && <Pill>🛡️ {protect.name}: yarı malzeme geri</Pill>}
        </div>
        <More>
          <div className="rh-rows">
            {steps.map((s) => (
              <div key={s.target} className="rh-row">
                <span className="rh-plus">+{s.target}</span>
                <span className="cost"><Gem n={s.gems} />{Object.entries(s.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span>
                <span className="gain">⚔️ +{s.weapon} · 🛡️ +{s.armor}</span>
                {s.chance < 100 && mastery && <small className="note">Mühürle %{String(masteryChance(s.chance)).replace('.', ',')}</small>}
              </div>
            ))}
          </div>
          <p className="rh-fine">Eklenen güç o kademedeki toplamdır (silahta saldırı, zırhta savunma). Savaş sırasında artı basılamaz.</p>
        </More>
      </Sec>

      {E.enabled && (
        <Sec id="rh-evrim" icon="🌀" title="Evrim" sub="Kuşandığın silah ve zırh avladıkça evrilir">
          <div className="rh-chain">
            {E.weapon.map((w, i) => (
              <React.Fragment key={i}>
                {i > 0 && <span className="arr" aria-hidden>➜</span>}
                <div className="orb" style={{ ['--ec' as string]: EVO_COLORS[i + 1] }}>
                  <span className="o">{['I', 'II', 'III'][i]}</span>
                  <b>{EVO_NAMES[i + 1]}</b>
                  <small>{fmt(w.kills)} av</small>
                </div>
              </React.Fragment>
            ))}
          </div>
          <p className="rh-p">Sayaç dolunca {smith}'ya git; malzemeler <b>Kor Kulesi</b>'nden çıkar. Artı, efsun ve nadirlik korunur.{E.maxGap ? <> Senden {E.maxGap} seviyeden fazla düşük canavarlar sayılmaz.</> : null}</p>
          <More>
            <div className="rh-rows">
              {E.weapon.map((w, i) => (
                <div key={i} className="rh-row">
                  <span className="rh-plus evo" style={{ ['--ec' as string]: EVO_COLORS[i + 1] }}>{['I', 'II', 'III'][i]}</span>
                  <span className="cost"><Gem n={w.gems} />{Object.entries(w.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span>
                  <span className="gain">⚔️ +{w.add}{E.armor[i] && <> · 🛡️ +{E.armor[i].add}</>}</span>
                </div>
              ))}
            </div>
          </More>
        </Sec>
      )}

      {tc.enabled && (
        <Sec id="rh-essiz" icon="💛" title="Eşsiz dönüşüm" sub="Eşyanın son ve en parlak hâli">
          <div className="rh-morph">
            <span className="orb" style={{ ['--rc' as string]: RARITY[from].color }}>{RARITY[from].name}</span>
            <span className="spark" aria-hidden>✨➜✨</span>
            <span className="orb uq" style={{ ['--rc' as string]: RARITY.unique.color }}>{RARITY.unique.name}</span>
          </div>
          <div className="rh-chips center">
            <Pill>🎚️ Sv. {Math.min(...Object.values(tc.cost).map((c) => c.minLevel))}+</Pill>
            <Pill c="good">✅ Artı ve evrim kalır</Pill>
            <Pill c="warn">🔄 Efsunlar silinir</Pill>
            {Object.values(tc.cost).every((c) => c.chance >= 100) && <Pill c="good">🎯 Şans %100</Pill>}
          </div>
          <div className="rh-gains">
            {uqRows.map(([slot, tpl]) => {
              const t = ITEM_TPL.get(tpl); if (!t) return null;
              const it = { id: 'g', tpl, rarity: from, plus: 0, ench: [] };
              const ex = UNIQUE_EXTRA[slot];
              return (
                <div key={slot} className="rh-gain">
                  <img src={iconUrl(t.icon, RARITIES.indexOf('unique'))} alt="" />
                  <b>{SLOT_NAMES[slot]}</b>
                  <span>{fmt(itemPower(it))} ➜ <em>{fmt(itemPower({ ...it, rarity: 'unique' }))}</em></span>
                  {ex && <small>+ {ex.label}</small>}
                </div>
              );
            })}
          </div>
          <More label="Bedeller">
            <div className="rh-rows">
              {TRANSFORM_GROUPS.map((g) => {
                const c = tc.cost[g];
                return (
                  <div key={g} className="rh-row">
                    <span className="lbl">{TRANSFORM_GROUP_NAMES[g]}</span>
                    <span className="cost"><Gem n={c.gems} />{Object.entries(c.mats).map(([k, q]) => <Mat key={k} k={k} n={q} />)}</span>
                    <span className="gain">{c.minPlus > 0 ? `en az +${c.minPlus} · ` : ''}%{c.chance}</span>
                  </div>
                );
              })}
            </div>
            <p className="rh-fine">Güç örnekleri +0 Muhafız eşyası içindir.</p>
          </More>
        </Sec>
      )}

      <Sec id="rh-efsun" icon="🔮" title="Efsun" sub={`Bir eşyada ${maxEnch} efsuna kadar`}>
        <div className="rh-duo">
          {[enchAdd, enchChange].map((m) => m && (
            <div key={m.id} className="rh-shop">
              <img src={iconUrl(mallIcon(m.id))} alt="" />
              <div><b>{m.name}</b><small>{m.id === 'enchant_add' ? 'Eşyaya yeni bir efsun ekler' : 'Efsunları yeniden belirler'}</small></div>
              {mallForSale(m.id) && <span className="price">{fmt(mallPrice(m.id))} ÇP</span>}
            </div>
          ))}
        </div>
        <More label={`Efsun listesi (${ench.length})`}>
          <div className="rh-ench">
            {ench.map((k) => {
              const e = ENCHANTS[k], v = TUNING.enchants.values?.[k] ?? e.tiers;
              return <div key={k} className="e"><b>{e.name}</b><span className="tiers">{v.map((x, i) => <i key={i} className={'t' + i}>{e.unit === '%' ? `%${x}` : `+${fmt(x)}`}</i>)}</span><small>{e.slots.map((s) => SLOT_NAMES[s]).join(' · ')}</small></div>;
            })}
          </div>
        </More>
      </Sec>

      <More label="📦 Hangi malzeme nereden çıkar?">
        <div className="rh-srcs">
          {sources.map((s) => (
            <div key={s.id} className="rh-src">
              <span className="who"><img src={matIcon(s.id)} alt="" /><b>{matName(s.id)}</b></span>
              <span className="from">{s.from.length ? s.from.slice(0, 4).map((f, i) => <span key={i}>{f.where}{f.chance !== undefined && f.chance < 1 ? ` · ${pctTxt(f.chance)}` : ''}</span>) : <span>görev ve etkinlik ödülleri</span>}</span>
            </div>
          ))}
        </div>
      </More>
    </>
  );
}

// ───────── 4. Zindanlar ve Bosslar ─────────
function DungeonChapter() {
  const T = TUNING.tower, F = TUNING.forge, W = TUNING.worldBoss;
  const warden = npcName('tower') || npcName('forge');
  const wbDef = MONSTERS.find((m) => m.id === WORLD_BOSS_ID), wbMap = MAPS[WORLD_BOSS_MAP];
  const wb = wbMap ? mapMonsters(wbMap).find((x) => x.id === WORLD_BOSS_ID) : undefined;
  const towerMats = new Map<string, number>();
  for (const f of T.floors) for (const [k, ch] of Object.entries(f.mats)) if (ch > 0) towerMats.set(k, Math.max(towerMats.get(k) ?? 0, ch));
  const azName = monName(T.floors.find((f) => f.puzzle === 'boss')?.monster ?? 'azrail');
  const field = Object.values(MAPS).filter((m) => m.travelable).flatMap((m) => mapMonsters(m).filter((x) => x.boss).map((x) => ({ m, x })));
  const forgeMats = new Map<string, number>();
  for (const f of F.floors) for (const m of f.mats) forgeMats.set(m.key, Math.max(forgeMats.get(m.key) ?? 0, m.chance));
  return (
    <>
      <Say>Tek başına zor, grupla çok kolay! Bossun canının en az <b>%{String(TUNING.bossShareMin).replace('.', ',')}</b> kadarını vuran herkes kendi ganimetini alır. Zindanlara köydeki <b>{warden}</b> ile girilir.</Say>
      <div className="rh-bosses">
        {T.enabled && (
          <BossCard emoji="🏰" tone="#6cc8ff" name="Kadim Kule" lv={<Lv a={T.minLevel} b={null} />} tags={[`${T.floors.length} kat`, `Zirvede ${azName}`]}
            how={<>Her katta canavarlar ve bir bulmaca. Kapı açılınca üst kata çık; {azName}'i yenen herkese <b>{matName('azrail_chest')}</b>!</>}
            extra={<div className="rh-floors" aria-label="Katlar">{T.floors.map((f, i) => <span key={i} className={f.puzzle === 'boss' ? 'boss' : f.puzzle !== 'kill' ? 'puz' : ''} title={`${i + 1}. kat · ${TOWER_PUZZLE_NAMES[f.puzzle]} · ${monName(f.monster)}`}>{f.puzzle === 'boss' ? '💀' : i + 1}</span>)}</div>}
            loot={[...chestLoot(T.chest.gems, T.chest.essence, dropRows(T.chest.drops).filter((d) => d.key !== 'red_potion')), ...(T.chest.hookChance > 0 ? [dropLoot({ kind: 'mat', key: 'azrail_hook', chance: T.chest.hookChance, qty: [1, 1] })] : []), ...[...towerMats].map(([k, ch]) => ({ key: 't' + k, icon: matIcon(k), name: matName(k) + ' (katlar)', val: pctTxt(ch) }))]} />
        )}
        {F.enabled && (
          <BossCard emoji="🔥" tone="#ff8a4a" name="Kor Kulesi" lv={<Lv a={F.minLevel} b={null} />} tags={['Grupla', `Zirvede ${monName('f_boss')}`]}
            how={<>Her grup kendi kulesine girer; dalgalar ve bulmacalar ({F.floors.map((f) => FORGE_PUZZLE_NAMES[f.puzzle]).join(', ')}). Düşenler <b>evrim</b> malzemesi.{F.entryGems > 0 && <> Giriş {fmt(F.entryGems)} Mücevher.</>}</>}
            loot={[dropLoot({ kind: 'mat', key: 'forge_chest', chance: 1, qty: [1, 1] }), ...dropRows(F.boss.drops).map(dropLoot), ...[...forgeMats].map(([k, ch]) => ({ key: 'f' + k, icon: matIcon(k), name: matName(k) + ' (katlar)', val: pctTxt(ch) }))]} />
        )}
        {W.enabled && wbDef && wbMap && (
          <BossCard emoji="🐉" tone="#c58bff" name={wbDef.name} title="Dünya Boss'u" lv={<Lv a={W.minLevel} b={null} />} tags={[`Her ${fmt(wb?.respawnMin ?? wbDef.respawnMin ?? 0)} dk`, 'Bütün kanal']}
            how={<>Mini haritanın altındaki sayaç dolunca <b>“Dünya Boss'una git”</b>. Herkes birlikte savaşır.</>}
            loot={lootOf(monsterLoot(WORLD_BOSS_MAP, WORLD_BOSS_ID), true)} />
        )}
        {field.map(({ m, x }) => {
          const r = monsterLoot(m.id, x.id);
          return (
            <BossCard key={m.id + x.id} emoji={monEmoji(x.id)} crown tone={m.pvp ? '#ff6a5a' : '#ffd25a'} name={x.name} lv={<span className="rh-lv">Sv. {x.level}</span>}
              tags={[m.name, `Her ${fmt(x.respawnMin ?? 0)} dk`, ...(m.pvp ? ['PvP'] : [])]}
              how={<>{m.name} haritasında doğar; grupla git!{r.maxLevel > 0 && <> Sv. {r.maxLevel} üstündeysen ganimet azalır.</>}</>}
              loot={lootOf(r, true)} />
          );
        })}
      </div>
      <p className="rh-fine center">Boss düğmesi doğma sürelerini gösterir. Tilki Kral dışındakilerin yeri için <b>{MALL.get('boss_tracker')?.name ?? 'Boss Takip'}</b> gerekir.</p>
    </>
  );
}
function BossCard({ emoji, crown, tone, name, title, lv, tags, how, extra, loot }: { emoji: string; crown?: boolean; tone: string; name: string; title?: string; lv: React.ReactNode; tags: string[]; how: React.ReactNode; extra?: React.ReactNode; loot: Loot[] }) {
  return (
    <article className="rh-boss" style={{ ['--bc' as string]: tone }}>
      <header>
        <span className="pt" aria-hidden>{emoji}{crown && <i>👑</i>}</span>
        <div>{title && <small className="kicker">{title}</small>}<h4>{name}</h4><div className="tags">{lv}{tags.map((t) => <span key={t}>{t}</span>)}</div></div>
      </header>
      <p>{how}</p>
      {extra}
      <LootChips items={loot} max={6} />
    </article>
  );
}

// ───────── 5. Pazar ve Ticaret ─────────
interface Info { icon: string; title: string; text: React.ReactNode; tag?: string }
function InfoCards({ items }: { items: Info[] }) {
  return <div className="rh-infos">{items.map((x) => <div key={x.title} className="rh-info"><span className="ic" aria-hidden>{x.icon}</span><div><b>{x.title}{x.tag && <em>{x.tag}</em>}</b><p>{x.text}</p></div></div>)}</div>;
}
function MarketChapter() {
  const mk = Object.values(MAPS).find((m) => m.market);
  const tg = MALL.get('trade_glass');
  const crafts = TUNING.crafts.filter((c) => !c.off);
  const cats = MALL_CATS.filter(([c]) => c !== 'yakinda' && c !== 'cp').map(([, n]) => n);
  return (
    <>
      <Say>Mücevherini akıllıca harca, fazlalarını sat! İşte köyün ticaret köşeleri.</Say>
      <InfoCards items={[
        ...(mk?.market ? [{ icon: '🏪', title: 'Kendi dükkânın', text: <>{mk.market.name}'na git, <b>“Dükkân Kur”</b>a bas; {STALL_MAX_ITEMS} ürüne kadar sat. Başkasının tezgâhına tıklayıp alışveriş yap.</> }] : []),
        ...(tg && mallForSale('trade_glass') ? [{ icon: '🔍', title: tg.name, tag: `${fmt(mallPrice('trade_glass'))} ÇP`, text: <>Bütün dükkânlarda arama yapar; aradığını hemen bul.</> }] : []),
        { icon: '📦', title: `Depo · ${npcName('storage')}`, text: <>{STORAGE_BASE_PAGES} sayfa × {STORAGE_PAGE_SLOTS} bölme; Ek Depo Sayfası ile {STORAGE_MAX_PAGES} sayfaya kadar. Malzemeler yer kaplamaz.</> },
        { icon: '💧', title: 'Market (Öz)', text: <>{fmt(TUNING.essxEss)} Öz → {fmt(TUNING.essxGems)} Mücevher. Kırmızı İksir: {fmt(TUNING.potionEss)} Öz ya da {fmt(TUNING.potionGems)} Mücevher.</> },
        ...(crafts.length ? [{ icon: '🧵', title: `Üretim · ${npcName('craft')}`, text: <>{crafts.slice(0, 3).map((c) => c.name).join(', ')}{crafts.length > 3 ? ` ve ${crafts.length - 3} tarif daha` : ''}. Başarısızsa malzemenin yarısı geri döner.</> }] : []),
        { icon: '💎', title: 'Nesne Market', text: <>ÇP ile: {cats.slice(0, 4).join(', ')}… ÇP, E-PIN ya da ÇP Kuponuyla yüklenir.</> },
      ]} />
    </>
  );
}

// ───────── 6. Eğlence ─────────
function FunChapter() {
  const G = TUNING.garden, fc = fishingConf(), A = TUNING.arena, KR = TUNING.killRank;
  const fishNpcs = Object.values(MAPS).flatMap((m) => m.npcs.filter((n) => n.actions.includes('fishing_shop')).map((n) => ({ n, m })));
  const lake = Object.values(MAPS).find((m) => m.travelable && m.safe && !m.spawns.length && m.npcs.some((n) => n.actions.includes('fishing_shop')));
  const medal = (i: number) => ['🥇', '🥈', '🥉'][i] ?? `${i + 1}.`;
  const per = KR.period === 'day' ? 'Günlük' : KR.period === 'month' ? 'Aylık' : 'Haftalık';
  return (
    <>
      <Say>Hep savaş olmaz ya! Göl kenarında balık tut, bahçede ot topla, atına bin… ya da meydanda gücünü göster.</Say>
      <InfoCards items={[
        ...(fishNpcs.length ? [{ icon: '🎣', title: 'Balıkçılık', tag: `Olta ${fmt(fc.rodPrice)} 💎`, text: <>{lake ? <>{lake.name}'nde </> : null}suya yaklaş, <b>“Olta At”</b>. {fishTable().map((f) => f.name).slice(0, 3).join(', ')} ve inciler çıkar. Olta: {fishNpcs.map(({ n }) => n.name).join(' / ')}.</> }] : []),
        ...(G.enabled ? [{ icon: '🌿', title: `Şifa Bahçesi · ${npcName('garden')}`, tag: `Orak ${fmt(G.sicklePrice)} 💎`, text: <>{HERBS.length} çeşit ot topla, iksir kaynat: {G.recipes.slice(0, 2).map((r) => `${matName(r.potion)} (${POTION_EFFECT[r.potion].name.toLocaleLowerCase('tr-TR')} +%${G.effects[r.potion].value})`).join(', ')}…</> }] : []),
        { icon: '🐎', title: `Binek · ${npcName('mount')}`, tag: `Sv. ${MOUNT.level}+`, text: <>{MOUNT.kills} canavar avla, {MOUNT.seals} {matName(MOUNT.sealKey)} ve {fmt(MOUNT.gems)} Mücevher getir: <b>{MOUNT.name}</b> senin! Daha hızlı ve +{MOUNT.atk} saldırı. Bin/in: <kbd>H</kbd></> },
        { icon: '🩸', title: PVP_RING.name, tag: 'PvP', text: <>{MAPS[PVP_RING.map]?.name}'nde, {npcName('garden') || 'Şifa Bahçesi'}'nin karşısında. İçeri girince adın kırmızı olur, oradaki herkesle vuruşursun. Günlük öldürme tablosu var; ölünce bir şey kaybetmezsin.</> },
        { icon: '⚔️', title: 'Savaş Arenası', tag: `Sv. ${A.minLevel}+`, text: <>{A.auto && A.times.length ? <>Her gün {A.times.join(', ')} saatlerinde</> : <>Etkinlik saatlerinde</>} açılır, {A.durationMin} dk sürer. En çok rakip yenen kazanır{A.rewards.length ? <>: {A.rewards.map((r, i) => `${medal(i)} ${fmt(r.gems)}`).join(' ')} Mücevher</> : null}.</> },
        { icon: '🏳️', title: 'Lonca', tag: `Sv. ${GUILD_MIN_LEVEL}+`, text: <>{fmt(GUILD_COST)} Mücevherle kur ya da bir loncaya katıl (<kbd>G</kbd>). Rakip loncalara savaş ilan et!</> },
        { icon: '🎉', title: 'Etkinlikler', text: <>{(Object.keys(EVENT_NAMES) as (keyof typeof EVENT_NAMES)[]).map((k) => `${EVENT_ICONS[k]} ${EVENT_NAMES[k]}`).join(' · ')}. Üstteki <b>Etkinlik</b> düğmesine bak.</> },
        { icon: '🏆', title: 'Sıralama', text: <>{per} canavar sıralamasında ilk {KR.rewards.length}: {KR.rewards.map((r, i) => `${medal(i)} ${[r.cp ? `${fmt(r.cp)} ÇP` : '', r.gems ? `${fmt(r.gems)} 💎` : ''].filter(Boolean).join(' + ')}`).join(' ')}</> },
      ]} />
    </>
  );
}

// ───────── 7. Rün ve Rütbe ─────────
function RuneChapter({ level }: { level?: number }) {
  const rc = runeConf();
  const coast = MAPS.coast;
  return (
    <>
      <Say>{level !== undefined && level < rc.unlockLevel ? <>Bu kapı Sv. {rc.unlockLevel}'de açılıyor. Şimdiden bil ki seni çok güçlü yapacak!</> : <>Sv. {rc.unlockLevel} oldun mu? {coast?.name ?? 'Rün Sahili'} seni bekliyor! Sv. {RANK_LEVEL} olunca da rütbeler başlar.</>}</Say>
      <Sec icon="💠" title="Rünler" sub={`Sv. ${rc.unlockLevel}+ · üçü birden takılır`}>
        <div className="rh-runes">
          {RUNE_KINDS.map((k) => (
            <div key={k} className="rh-rune" style={{ ['--rc' as string]: RUNES[k].color }}>
              <img src={iconUrl(RUNES[k].icon)} alt="" />
              <b>{RUNES[k].short}</b>
              <small>{RUNES[k].statName}</small>
              <span>+%{String(runePct(1)).replace('.', ',')} / sv. · en çok +%{String(runePct(RUNE_MAX_LEVEL)).replace('.', ',')}</span>
            </div>
          ))}
        </div>
        <Steps items={[
          { icon: '🌊', title: `${coast?.name ?? 'Rün Sahili'}'nde avlan`, text: 'Oradaki canavarlardan rün parçaları düşer.' },
          { icon: '🧩', title: `${rc.craftCost} parça = 1 rün`, text: <>Aynı türden {rc.craftCost} parçayla 1. seviye rün yap. Rün penceresi: <kbd>U</kbd></> },
          { icon: '⬆️', title: 'Yükselt, hep başarılı!', text: <>1→2 için {runeUpCost(1)}, 2→3 için {runeUpCost(2)} parça; her seviyede bir fazla. En çok Sv. {RUNE_MAX_LEVEL}.</> },
          { icon: '🛒', title: 'Al, sat', text: 'Rünler ve parçalar pazarda seviyesiyle satılır. Takıp çıkarmak savaş dışında.' },
        ]} />
      </Sec>
      <Sec icon="🎖️" title="Rütbeler" sub={`Sv. ${RANK_LEVEL} sonrası`}>
        <p className="rh-p">Sv. {RANK_LEVEL} olunca hemen <b style={{ color: RANKS[0].color }}>{RANKS[0].name}</b> olursun. Sonra kazandığın tecrübe rütbene akar; rütben adının üstünde parlar ve <b>saldırı ile canına</b> yüzde ekler.</p>
        <div className="rh-ranks">
          {RANKS.map((r) => <div key={r.id} className="rh-rank" style={{ ['--rc' as string]: r.color }}><i>{r.id}</i><b>{r.name}</b><small>+%{r.atkPct}</small></div>)}
        </div>
        <More label="Gereken tecrübe">
          <div className="rh-rows">{RANKS.slice(1).map((r) => <div key={r.id} className="rh-row"><span className="lbl" style={{ color: r.color }}>{r.name}</span><span className="gain">{fmt(r.xp)} TP</span></div>)}</div>
        </More>
      </Sec>
    </>
  );
}

// ───────── 8. Püf Noktaları ─────────
const KEYS: [string[], string][] = [
  [['W', 'A', 'S', 'D'], 'Yürü'], [['Sol tık'], 'Yürü · saldır · konuş'], [['Sağ tık'], 'Sürükle: kamera'], [['Tekerlek'], 'Yakınlaştır'],
  [['Boşluk', '1'], 'Saldır'], [['2', '–', '6'], 'Beceriler'], [['Q'], 'İksir iç'], [['Z', 'F'], 'Yerdekini topla'], [['Tab'], 'Sıradaki canavar'],
  [['H'], 'Binek'], [['I', 'B'], 'Çanta'], [['C'], 'Karakter'], [['K'], 'Beceri'], [['M'], 'Harita'], [['J'], 'Görevler'], [['G'], 'Lonca'], [['T'], 'Işınlan'], [['U'], 'Rünler'],
  [['Enter'], 'Sohbet'], [['Esc'], 'Kapat'],
];
function TipsChapter() {
  const touch = typeof matchMedia !== 'undefined' && matchMedia('(pointer: coarse)').matches;
  const vm = VARIANT_LOOT_MULT.map((x) => String(x).replace('.', ','));
  const keys = <div className="rh-keys">{KEYS.map(([k, t], i) => <div key={i} className="rh-key"><span className="ks">{k.map((x, j) => x === '–' ? <span key={j} className="dash">–</span> : <kbd key={j}>{x}</kbd>)}</span><span>{t}</span></div>)}</div>;
  const phone = (
    <ul className="rh-list">
      <li>🟡 Sol alttaki <b>altın topu</b> sürükle: yürü. <b>⚔</b> düğmesine basılı tut: saldır.</li>
      <li>👆 Ekranda tek parmakla kaydır: kamera döner; iki parmakla yakınlaş.</li>
      <li>⏳ Bir oyuncuya <b>uzun bas</b>: fısıltı, ticaret, düello, grup.</li>
      <li>☰ <b>Menü</b> düğmesinde Karakter, Beceri, Görev, Lonca ve Rehber var.</li>
    </ul>
  );
  return (
    <>
      <Say>Benden sana birkaç sır… Bunları bilen maceracı hep bir adım öndedir!</Say>
      <div className="rh-notes">
        {[
          ['❓', <>Canavarı seç, hedef çerçevesindeki <b>?</b> düğmesine bas: ne düştüğünü görürsün.</>],
          ['😈', <><b>Agresif</b> canavarlar ×{vm[1]}, <b>Katil</b> canavarlar ×{vm[2]} ganimet şansı verir.</>],
          ['🎯', <>Zamanlama çubuklu beceride ibre <b>yeşildeyken</b> bas: ×{String(QTE_MULT).replace('.', ',')} hasar!</>],
          ['📉', <>Bölgenin ganimet sınırını geçince düşenler azalır. Bir üst bölgeye geç!</>],
          ['🤖', <>Oto atak günde {fmt(TUNING.autoAttackMin)} dakika; gece yarısı yenilenir.</>],
          ['🌍', <><b>Dünya Sağlığı</b> zamanla azalır; Öz bağışlayarak herkese iyilik yap.</>],
          ['⏱️', <>Savaştayken ışınlanamaz ve artı basamazsın; birkaç saniye bekle.</>],
          ['🤝', <>Grupta tecrübe paylaşılır, bosslar çok daha kolay düşer.</>],
        ].map(([ic, t], i) => <div key={i} className="rh-note" style={{ ['--r' as string]: `${(i % 3 - 1) * 0.6}deg` }}><span aria-hidden>{ic}</span><p>{t}</p></div>)}
      </div>
      {touch ? <><Sec icon="📱" title="Telefonda">{phone}</Sec><More label="⌨️ Bilgisayar kısayolları">{keys}</More></>
        : <><Sec icon="⌨️" title="Klavye kısayolları">{keys}</Sec><Sec icon="📱" title="Telefonda">{phone}</Sec></>}
      <p className="rh-fine center">Statü {STAT_MAX}'e, beceri hakkı {skillUpgradeBudget(999)}'a kadar çıkar.</p>
    </>
  );
}

// ───────── ana ekran ─────────
function Home({ level, self, open, seen }: { level?: number; self?: SelfInfo; open: (c: Ch) => void; seen: Ch[] }) {
  const ch = chapters();
  const stops = roadmap();
  const rec = stops.find((s) => s.map.id === recommendedStop(stops, level));
  const tips = powerAdvice(self);
  const hot = tips.filter((t) => t.hot).length;
  const [feat, ...rest] = ch;
  return (
    <>
      <Say>{level !== undefined
        ? <>Merhaba! Ben Bilge Ayaz. Sv. {level} olmuşsun, maşallah!{rec && <> Şu an en güzel av yerin <b>{rec.map.name}</b>.</>} Ne merak ediyorsun?</>
        : <>Merhaba maceracı! Ben Bilge Ayaz. Core of Life'ta yolunu kaybetmeyesin diye buradayım. Bir bölüm seç, birlikte bakalım!</>}</Say>
      <button type="button" className="rh-feature" style={{ ['--tc' as string]: feat.c }} onClick={() => open(feat.id)}>
        <span className="em" aria-hidden>{feat.icon}</span>
        <span className="tx"><b>{feat.title}</b><small>{self ? (hot ? `${hot} hızlı güç fırsatın var!` : `Sana özel ${tips.length} önerim var`) : feat.teaser}</small></span>
        <span className="go" aria-hidden>➜</span>
      </button>
      <div className="rh-tiles">
        {rest.map((c, i) => (
          <button type="button" key={c.id} className="rh-tile" style={{ ['--tc' as string]: c.c, ['--d' as string]: `${i * 40}ms` }} onClick={() => open(c.id)}>
            <span className="em" aria-hidden>{c.icon}</span>
            <b>{c.title}</b>
            <small>{c.teaser}</small>
            {seen.includes(c.id) && <span className="seen" title="Okudun">✓</span>}
          </button>
        ))}
      </div>
    </>
  );
}

/** Rehber içeriği (oyunda pencere, sitede sayfa). level/self: oyuncunun seviyesi ve durumu (kişiye özel öneriler). */
export function GuideContent({ level, self, site, openCh, onOpened }: { level?: number; self?: SelfInfo; site?: boolean; openCh?: string | null; onOpened?: () => void }) {
  const [ch, setCh] = useState<Ch | null>(() => { if (openCh && isCh(openCh)) return openCh; if (!site) return null; const h = location.hash.slice(1); return isCh(h) ? h : null; });
  const [seen, setSeen] = useState<Ch[]>(readSeen);
  const [, force] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => onConfig(() => force((n) => n + 1)), []);
  const open = (c: Ch | null) => {
    setCh(c);
    if (c && !seen.includes(c)) { const s = [...seen, c]; setSeen(s); try { localStorage.setItem(SEEN_KEY, JSON.stringify(s)); } catch { /* depolama kapalı olabilir */ } }
    if (site) try { history.replaceState(history.state, '', c ? '#' + c : location.pathname + location.search); } catch { /* */ }
    // yeni sayfanın başına dön
    requestAnimationFrame(() => {
      const r = root.current, sc = r?.closest('.bd, .site') as HTMLElement | null;
      if (!r || !sc) return;
      const top = r.getBoundingClientRect().top - sc.getBoundingClientRect().top + sc.scrollTop - (site ? 76 : 0);
      if (sc.scrollTop > top) sc.scrollTo({ top: Math.max(0, top), behavior: 'instant' as ScrollBehavior });
    });
  };
  // dışarıdan istenen bölüm (ör. Karakter Gücü rozeti → 'guc'): aç ve isteği temizle; pencere açıkken de çalışır
  useEffect(() => { if (openCh && isCh(openCh)) { open(openCh); onOpened?.(); } }, [openCh]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = chapters();
  const idx = ch ? list.findIndex((c) => c.id === ch) : -1;
  const cur = idx >= 0 ? list[idx] : null;
  const prev = idx > 0 ? list[idx - 1] : null, next = idx >= 0 && idx < list.length - 1 ? list[idx + 1] : null;
  return (
    <div ref={root} className={'rh' + (site ? ' rh-site' : ' rh-game')}>
      {!cur ? <Home level={level} self={self} open={open} seen={seen} /> : (
        <div key={cur.id} className="rh-chapter" style={{ ['--cc' as string]: cur.c }}>
          <div className="rh-top">
            <button type="button" className="rh-back" onClick={() => open(null)}>← Rehber</button>
            <div className="rh-dots" aria-label="Bölümler">{list.map((c, i) => <button type="button" key={c.id} className={(i === idx ? 'on' : '') + (seen.includes(c.id) ? ' seen' : '')} title={c.title} aria-label={c.title} onClick={() => open(c.id)} />)}</div>
            <span className="rh-count">{idx + 1}/{list.length}</span>
          </div>
          <header className="rh-ch-h"><span className="em" aria-hidden>{cur.icon}</span><div><small>Bölüm {idx + 1}</small><h2>{cur.title}</h2></div></header>
          {cur.id === 'guc' && <PowerChapter self={self} />}
          {cur.id === 'ilk' && <FirstChapter level={level} />}
          {cur.id === 'yol' && <RoadChapter level={level} />}
          {cur.id === 'esya' && <GearChapter />}
          {cur.id === 'zindan' && <DungeonChapter />}
          {cur.id === 'pazar' && <MarketChapter />}
          {cur.id === 'eglence' && <FunChapter />}
          {cur.id === 'run' && <RuneChapter level={level} />}
          {cur.id === 'puf' && <TipsChapter />}
          <nav className="rh-nav">
            {prev ? <button type="button" onClick={() => open(prev.id)}><small>Önceki</small><b>← {prev.icon} {prev.title}</b></button> : <button type="button" onClick={() => open(null)}><small>Başa dön</small><b>← 📖 Rehber</b></button>}
            {next ? <button type="button" className="next" onClick={() => open(next.id)}><small>Sonraki bölüm</small><b>{next.icon} {next.title} →</b></button> : <button type="button" className="next" onClick={() => open(null)}><small>Bitti!</small><b>📖 Rehbere dön →</b></button>}
          </nav>
        </div>
      )}
      <div className="rh-foot">Sayılar oyunun güncel ayarlarından gelir; yönetim değiştirdiğinde rehber de kendiliğinden güncellenir.</div>
    </div>
  );
}

/** Oyun içi pencere */
export function GuidePanel() {
  const self = useStore((s) => s.self);
  // store.guideCh: başka bir yerden (ör. Karakter Gücü rozeti) Rehber'i belli bir bölümle açma isteği
  const req = useStore((s) => (s as { guideCh?: string | null }).guideCh ?? null);
  return <Panel title="Rehber" width={880}><GuideContent level={self?.level} self={self ?? undefined} openCh={req} onOpened={() => store.set({ guideCh: null } as never)} /></Panel>;
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
