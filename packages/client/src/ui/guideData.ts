/**
 * Rehber verisi: hepsi o anki ayardan (TUNING, yönetim paneli) okunur, sabit sayı yok. React/DOM bağımlılığı
 * yoktur; oyun içi Rehber penceresi, sitedeki /rehber sayfası ve hedef çerçevesindeki "?" düşme listesi aynı
 * fonksiyonları kullanır (gösterilen = sunucunun kullandığı tablo).
 */
import {
  MAPS, MONSTERS, TUNING, MATERIAL, MALL, ITEM_TPL, RARITY, RARITIES, CLASS_IDS, MOUNT, fixedLevel, resolveLoot, classSkill,
  upgradeSteps, transformConf, fishTable, mallForSale, HERBS, SLOT_NAMES, MAX_PLUS, STAT_GAIN, EVO_TIERS, ENCHANT_TIER_WEIGHTS, RUNES, RUNE_KINDS,
  RUNE_MAX_LEVEL, RANKS, RANK_LEVEL, PET_KEYS, statBudget, skillDamageMult, skillPointsUsed, plusAdd, itemPower, transformGroup, runeConf, runePct,
  wingsBonus, mallPrice,
  type ResolvedLoot, type Rarity, type MapDef, type DropTune, type Slot, type ItemInstance, type RuneKind,
} from '@col/shared';

const isMat = (id: string) => MATERIAL.has(id);
/** Sunucuyla aynı kural (world.ts NO_MONSTER_DROP): Ustalık Mührü canavardan düşmez; market, görev ve üretimle gelir. */
export const NO_MONSTER_DROP = new Set(['mastery_seal']);
/** Yüzde yazımı: hedef çerçevesindeki düşme listesiyle aynı (küçük olasılıklarda ondalık). */
export function pctTxt(x: number): string {
  const v = Math.min(1, Math.max(0, x)) * 100;
  return v >= 10 ? `%${v.toFixed(0)}` : v >= 1 ? `%${v.toFixed(1).replace('.', ',')}` : `%${v.toFixed(2).replace('.', ',')}`;
}
export const fmt = (n: number) => Math.round(n).toLocaleString('tr-TR');
export const range = (a: number, b: number) => (a === b ? fmt(a) : `${fmt(a)}–${fmt(b)}`);
export const monName = (id: string) => MONSTERS.find((m) => m.id === id)?.name ?? id;
export const matName = (id: string) => MATERIAL.get(id)?.name ?? MALL.get(id)?.name ?? id;
export function dropName(d: { kind: string; key: string; rarity?: string }): string {
  if (d.kind === 'item') return `${ITEM_TPL.get(d.key)?.name ?? (d.key.startsWith('w_') ? 'Silah' : d.key.startsWith('a_') ? 'Zırh' : d.key)}${d.rarity ? ` (${RARITY[d.rarity as Rarity]?.name ?? d.rarity})` : ''}`;
  return d.kind === 'mall' ? MALL.get(d.key)?.name ?? d.key : matName(d.key);
}

/**
 * Bir canavarın geçerli ganimet tablosu (sunucudaki resolveLoot + kule/sandık kuralları). Hedef çerçevesindeki "?"
 * penceresi ve Rehber bunu kullanır.
 */
export function monsterLoot(mapId: string, monsterId: string, o: { floor?: number; forgeFloor?: number; variant?: number } = {}): ResolvedLoot {
  const theme = MAPS[mapId]?.theme ?? 'forest';
  const r = resolveLoot(TUNING, mapId, theme, monsterId, isMat, o.floor);
  // sunucu bunları canavardan hiç düşürmez (yönetim ganimetine eklense bile)
  r.materials = r.materials.filter((m) => !NO_MONSTER_DROP.has(m.id));
  r.drops = r.drops.filter((d) => !NO_MONSTER_DROP.has(d.key));
  if (monsterId === 'azrail') r.drops = [{ kind: 'mat', key: 'azrail_chest', chance: 1, qty: [1, 1] }, ...r.drops];
  if (monsterId.startsWith('f_')) {
    // Kor Kulesi: yalnız kulenin kendi tablosu (kat malzemeleri; elitte çarpan) · Karademir: doğrudan düşenler + Kor Sandığı
    const F = TUNING.forge, fl = F.floors[Math.max(0, Math.min(F.floors.length - 1, (o.forgeFloor ?? 1) - 1))];
    const k = o.variant === 2 ? F.eliteLoot : 1;
    r.essence = [0, 0]; r.equipChance = 0; r.maxLevel = 0;
    r.materials = monsterId === 'f_boss' ? [] : (fl?.mats ?? []).map((m) => ({ id: m.key, chance: Math.min(1, m.chance * k), qty: m.qty }));
    r.drops = monsterId === 'f_boss' ? [{ kind: 'mat', key: 'forge_chest', chance: 1, qty: [1, 1] }, ...F.boss.drops] : [];
  }
  return r;
}
/** Nadirlik ağırlıkları → [nadirlik, yüzde] (sıfırlar çıkar) */
export function rarityShares(w: Partial<Record<string, number>>): [Rarity, number][] {
  const e = Object.entries(w).filter(([, v]) => (v ?? 0) > 0) as [Rarity, number][];
  const tot = e.reduce((a, [, v]) => a + v, 0) || 1;
  return e.sort((a, b) => RARITIES.indexOf(a[0]) - RARITIES.indexOf(b[0])).map(([k, v]) => [k, (v / tot) * 100]);
}

// ───────── Yol haritası ─────────
export interface GuideMon { id: string; name: string; level: number; boss: boolean; respawnMin?: number }
export interface GuideStop {
  map: MapDef; minLevel: number; maxLevel: number | null;
  monsters: GuideMon[]; bosses: GuideMon[];
  /** canavar seviyeleri (boss hariç) */
  monLv: [number, number] | null;
  rarities: [Rarity, number][]; mats: { id: string; chance: number }[];
  equipChance: number; gems: [number, number]; essence: [number, number];
  /** bölge seviye sınırı: üstündeki oyuncu ganimetin overMul kadarını alır */
  cap: number; overMul: number;
}
/** Haritadaki etkin doğma grupları (yönetimde sayısı 0 yapılan grup çıkar) */
export function mapMonsters(m: MapDef): GuideMon[] {
  const out = new Map<string, GuideMon>();
  m.spawns.forEach((g, gi) => {
    const ov = TUNING.spawns[m.id + ':' + gi];
    if ((ov?.count ?? g.count) <= 0) return;
    const d = MONSTERS.find((x) => x.id === g.monster); if (!d) return;
    const lv = fixedLevel(g.monster, (ov?.level ?? g.level)[0]);
    if (!out.has(d.id)) out.set(d.id, { id: d.id, name: d.name, level: lv, boss: !!d.boss, respawnMin: d.boss ? TUNING.monsters[d.id]?.respawnMin ?? d.respawnMin ?? 10 : undefined });
  });
  return [...out.values()];
}
/** Işınlanılabilen av bölgeleri, giriş seviyesine göre sıralı (boss dışında canavarı olanlar). */
export function roadmap(): GuideStop[] {
  const maps = Object.values(MAPS).filter((m) => m.travelable && mapMonsters(m).some((x) => !x.boss)).sort((a, b) => a.minLevel - b.minLevel);
  return maps.map((m, i) => {
    const all = mapMonsters(m), mons = all.filter((x) => !x.boss), bosses = all.filter((x) => x.boss);
    const lv = mons.map((x) => x.level);
    const rw = new Map<string, number>(); const mats = new Map<string, number>();
    let eq = 0, g: [number, number] = [Infinity, 0], e: [number, number] = [Infinity, 0], cap = 0, over = 1;
    for (const x of mons) {
      const r = monsterLoot(m.id, x.id);
      const tot = Object.values(r.rarityWeights).reduce((a, v) => a + (v ?? 0), 0) || 1;
      for (const [k, v] of Object.entries(r.rarityWeights)) if ((v ?? 0) > 0) rw.set(k, Math.max(rw.get(k) ?? 0, (v! / tot) * 100));
      for (const mt of r.materials) mats.set(mt.id, Math.max(mats.get(mt.id) ?? 0, mt.chance * TUNING.dropMul));
      for (const d of r.drops) if (d.kind === 'mat') mats.set(d.key, Math.max(mats.get(d.key) ?? 0, d.chance));
      eq = Math.max(eq, r.equipChance * TUNING.dropMul);
      g = [Math.min(g[0], r.gems[0]), Math.max(g[1], r.gems[1])]; e = [Math.min(e[0], r.essence[0]), Math.max(e[1], r.essence[1])];
      cap = r.maxLevel; over = r.overMul;
    }
    const next = maps[i + 1];
    return {
      map: m, minLevel: m.minLevel, maxLevel: next ? Math.max(m.minLevel, next.minLevel - 1) : null,
      monsters: mons.sort((a, b) => a.level - b.level), bosses,
      monLv: lv.length ? [Math.min(...lv), Math.max(...lv)] : null,
      rarities: [...rw].sort((a, b) => RARITIES.indexOf(a[0] as Rarity) - RARITIES.indexOf(b[0] as Rarity)) as [Rarity, number][],
      mats: [...mats].filter(([id]) => id !== 'red_potion').map(([id, chance]) => ({ id, chance })).sort((a, b) => b.chance - a.chance),
      equipChance: eq, gems: g[0] === Infinity ? [0, 0] : g, essence: e[0] === Infinity ? [0, 0] : e, cap, overMul: over,
    };
  });
}
/** Oyuncunun seviyesine uygun durak: giriş seviyesi geçilmiş en yüksek bölge */
export function recommendedStop(stops: GuideStop[], level: number | undefined): string | null {
  if (!level) return null;
  let id: string | null = null;
  for (const s of stops) if (level >= s.minLevel) id = s.map.id;
  return id;
}

// ───────── Seviye kilometre taşları ─────────
export interface Milestone { level: number; icon: string; text: string }
export function milestones(guildLevel: number): Milestone[] {
  const out: Milestone[] = [];
  for (const s of roadmap()) if (s.minLevel > 1) out.push({ level: s.minLevel, icon: '🗺️', text: `${s.map.name} açılır` });
  // beceriler: her sınıfta aynı sıradaki becerinin en erken açıldığı seviye
  for (const [idx, icon] of [[1, '✨'], [4, '🎯'], [2, '⚡']] as const) {
    const by = new Map<number, string[]>();
    for (const c of CLASS_IDS) { const s = classSkill(c, idx, null); if (s && s.unlock > 1) by.set(s.unlock, [...(by.get(s.unlock) ?? []), s.name]); }
    for (const [lv, names] of by) out.push({ level: lv, icon, text: `Yeni beceri: ${names.join(' · ')}` });
  }
  if (TUNING.specLevel > 1) out.push({ level: TUNING.specLevel, icon: '🌟', text: 'Uzmanlık dalını seçersin (uzmanlık becerisi)' });
  // eşya nadirliği: oyunda gerçekten düşen ya da dönüşümle elde edilen nadirliklerin kuşanma seviyesi
  const seen = new Set<string>();
  for (const s of roadmap()) for (const [r] of s.rarities) seen.add(r);
  if (transformConf().enabled) seen.add('unique');
  for (const r of RARITIES) if (seen.has(r) && RARITY[r].minLevel > 1) out.push({ level: RARITY[r].minLevel, icon: '🛡️', text: `${RARITY[r].name} eşya kuşanılır` });
  out.push({ level: MOUNT.level, icon: '🐎', text: 'Seyis Arda\'nın binek görevi' });
  if (TUNING.forge.enabled) out.push({ level: TUNING.forge.minLevel, icon: '🔥', text: 'Kor Kulesi zindanı' });
  if (TUNING.tower.enabled) out.push({ level: TUNING.tower.minLevel, icon: '🏰', text: 'Kadim Kule zindanı' });
  if (TUNING.worldBoss.enabled) out.push({ level: TUNING.worldBoss.minLevel, icon: '🐉', text: 'Dünya Boss\'u' });
  const tc = transformConf();
  if (tc.enabled) out.push({ level: Math.min(...Object.values(tc.cost).map((c) => c.minLevel)), icon: '💛', text: 'Eşsiz Dönüşüm' });
  out.push({ level: guildLevel, icon: '🏳️', text: 'Lonca kurabilirsin' });
  out.push({ level: TUNING.arena.minLevel, icon: '⚔️', text: 'Savaş Arenası' });
  const cr = TUNING.crafts.filter((c) => !c.off);
  if (cr.length) out.push({ level: Math.min(...cr.map((c) => c.minLevel)), icon: '🧵', text: 'Pakize\'de ilk üretim tarifi' });
  return out.filter((m) => m.level > 1).sort((a, b) => a.level - b.level);
}

// ───────── Malzeme nereden çıkar ─────────
export interface MatSource { where: string; chance?: number; note?: string }
/** Güçlendirmede (artı, evrim, dönüşüm, üretim) kullanılan malzemeler ve nereden çıktıkları */
export function materialSources(): { id: string; uses: string[]; from: MatSource[] }[] {
  const uses = new Map<string, Set<string>>();
  const use = (id: string, u: string) => { if (!uses.has(id)) uses.set(id, new Set()); uses.get(id)!.add(u); };
  for (const s of upgradeSteps()) for (const k of Object.keys(s.mats)) use(k, 'Artı basma');
  for (const st of [...TUNING.evo.weapon, ...TUNING.evo.armor]) for (const k of Object.keys(st.mats)) use(k, 'Evrim');
  for (const c of Object.values(transformConf().cost)) for (const k of Object.keys(c.mats)) use(k, 'Dönüşüm');
  for (const r of TUNING.crafts.filter((c) => !c.off)) for (const k of Object.keys(r.inputs)) use(k, 'Üretim');
  const src = new Map<string, Map<string, MatSource>>();
  const add = (id: string, where: string, chance?: number, note?: string) => {
    if (!src.has(id)) src.set(id, new Map());
    const m = src.get(id)!, cur = m.get(where);
    if (!cur || (chance ?? 0) > (cur.chance ?? 0)) m.set(where, { where, chance, note });
  };
  for (const m of Object.values(MAPS)) for (const x of mapMonsters(m)) {
    const r = monsterLoot(m.id, x.id);
    const where = x.boss ? `${x.name} (${m.name})` : m.name;
    for (const mt of r.materials) add(mt.id, where, mt.chance * TUNING.dropMul);
    for (const d of r.drops) if (d.kind === 'mat') add(d.key, where, d.chance);
  }
  TUNING.tower.floors.forEach((f, i) => { for (const [k, ch] of Object.entries(f.mats)) if (ch > 0) add(k, 'Kadim Kule', ch, `${i + 1}. kat`); });
  for (const d of TUNING.tower.chest.drops) if (d.kind === 'mat') add(d.key, 'Azrail Sandığı', d.chance);
  if (TUNING.tower.chest.hookChance > 0) add('azrail_hook', 'Azrail Sandığı', TUNING.tower.chest.hookChance);
  TUNING.forge.floors.forEach((f) => { for (const mt of f.mats) add(mt.key, 'Kor Kulesi', mt.chance); });
  for (const d of TUNING.forge.boss.drops) if (d.kind === 'mat') add(d.key, 'Karademir', d.chance);
  for (const d of TUNING.forge.chest.drops) if (d.kind === 'mat') add(d.key, 'Kor Sandığı', d.chance);
  for (const r of TUNING.crafts.filter((c) => !c.off)) if (r.out.kind === 'mat') add(r.out.key, 'Pakize (üretim)', r.chance / 100);
  for (const f of fishTable()) add(f.id, 'Şelale Gölü (balık)');
  for (const h of HERBS) add(h, 'Şifa Bahçesi');
  for (const id of uses.keys()) if (MALL.has(id) && mallForSale(id)) add(id, 'Nesne Market');
  return [...uses].map(([id, u]) => ({ id, uses: [...u], from: [...(src.get(id)?.values() ?? [])].sort((a, b) => (b.chance ?? 0) - (a.chance ?? 0)) }));
}

/** Ödül/düşme satırı (sandık, boss): ad + adet + olasılık */
export interface DropRow { kind: string; key: string; rarity?: string; chance: number; qty: [number, number] }
export const dropRows = (d: DropTune[]): DropRow[] => d.filter((x) => x.chance > 0).map((x) => ({ kind: x.kind, key: x.key, rarity: x.rarity, chance: x.chance, qty: x.qty }));

// ───────── Gücünü artır: kişiye özel (oyunda) ya da genel (sitede) öneriler ─────────
/** Oyuncu durumundan önerinin ihtiyaç duyduğu kısım (store.SelfInfo bunu karşılar) */
export interface PowerSelf {
  level: number; statBudget: number; statAlloc: { str: number; res: number; vit: number }; skills: number[]; skillBudget: number;
  equip: Partial<Record<Slot, ItemInstance>>; runes?: { eq: Partial<Record<RuneKind, number>> }; mount?: { owned?: boolean }; buffs?: Record<string, number>;
}
export interface PowerTip { id: string; icon: string; title: string; how: string; gain?: string; hot?: boolean }
const slotNm = (s: Slot) => SLOT_NAMES[s].toLocaleLowerCase('tr-TR');
/**
 * Bilge Ayaz'ın güç önerileri. self verilirse kişiye özel (boştaki puanlar, sıradaki artı, evrim sayacı, dönüşebilecek
 * eşya, eksik efsun, boş rün yuvası…); verilmezse herkes için genel liste. Sayılar ayardan gelir.
 */
export function powerAdvice(self?: PowerSelf, now = Date.now()): PowerTip[] {
  const out: PowerTip[] = [];
  const E = TUNING.evo, tc = transformConf(), rc = runeConf();
  const enchAdd = MALL.get('enchant_add'), wings = MALL.get('crimson_wings'), wb = wingsBonus();
  const gardenOn = TUNING.garden.enabled && TUNING.garden.recipes.length > 0;
  const hunter = TUNING.garden.effects.potion_hunter;
  if (!self) {
    const top = upgradeSteps()[MAX_PLUS - 1];
    out.push({ id: 'stat', icon: '🎯', title: 'Statü puanlarını dağıt', how: `Her seviye ${statBudget(2) - statBudget(1)} puan · Karakter (C)`, gain: `Güç +${STAT_GAIN.str} saldırı` });
    out.push({ id: 'skill', icon: '✨', title: 'Becerilerini geliştir', how: 'Beceri (K) · Mücevherle', gain: `kademe başına +%${Math.round((skillDamageMult(2) - 1) * 100)} hasar` });
    if (top) out.push({ id: 'plus', icon: '⚒️', title: 'Silahına ve zırhına artı bas', how: `Demirci Haso · +${MAX_PLUS}'ya kadar`, gain: `+${MAX_PLUS}: ⚔ +${top.weapon} · 🛡 +${top.armor}` });
    if (E.enabled) out.push({ id: 'evo', icon: '🌀', title: 'Silahını evrilt', how: 'Kuşanıp avla, Haso\'da evrilt · Kor Kulesi malzemeleri', gain: `en çok ⚔ +${E.weapon[E.weapon.length - 1]?.add ?? 0}` });
    if (tc.enabled) out.push({ id: 'uq', icon: '💛', title: `${tc.from.map((r) => RARITY[r].name).join(', ')} eşyayı Eşsiz yap`, how: `Haso · Sv. ${Math.min(...Object.values(tc.cost).map((c) => c.minLevel))}+`, gain: 'güç + ekstra bonus' });
    if (enchAdd) out.push({ id: 'ench', icon: '🔮', title: 'Efsunları tamamla', how: `${enchAdd.name} · Nesne Market`, gain: `${ENCHANT_TIER_WEIGHTS.length} efsuna kadar` });
    out.push({ id: 'rune', icon: '💠', title: 'Rün tak', how: `Sv. ${rc.unlockLevel}+ · ${MAPS.coast?.name ?? 'Rün Sahili'} parçaları`, gain: `rün başına en çok +%${fmt2(runePct(RUNE_MAX_LEVEL))}` });
    out.push({ id: 'rank', icon: '🎖️', title: 'Rütbe kazan', how: `Sv. ${RANK_LEVEL}'ten sonra tecrübeyle`, gain: `en çok +%${RANKS[RANKS.length - 1].atkPct} saldırı ve can` });
    out.push({ id: 'mount', icon: '🐎', title: 'Binek edin', how: `Seyis Arda · Sv. ${MOUNT.level}+`, gain: `+${MOUNT.atk} saldırı` });
    if (gardenOn) out.push({ id: 'potion', icon: '🌿', title: 'Bahçe iksiri iç', how: 'Şifacı Reyhan\'da kaynat', gain: `canavara +%${hunter.value} hasar` });
    if (wings) out.push({ id: 'wings', icon: '🌟', title: wings.name, how: 'Nesne Market · süreli', gain: `+${wb.atk} saldırı · +${wb.def} savunma` });
    return out;
  }
  const lv = self.level;
  // boştaki puanlar
  const freeSt = self.statBudget - (self.statAlloc.str + self.statAlloc.res + self.statAlloc.vit);
  if (freeSt > 0) out.push({ id: 'stat', icon: '🎯', title: `${freeSt} statü puanın boşta!`, how: 'Karakter (C) penceresinden dağıt', gain: `en çok ⚔ +${freeSt * STAT_GAIN.str}`, hot: true });
  const freeSk = self.skillBudget - skillPointsUsed(self.skills);
  if (freeSk > 0) out.push({ id: 'skill', icon: '✨', title: `${freeSk} beceri hakkın boşta`, how: 'Beceri (K) · Mücevherle geliştir', gain: `kademe başına +%${Math.round((skillDamageMult(2) - 1) * 100)}`, hot: true });
  // daha iyi nadirlik: seviyenin yettiği, oyunda düşen en iyi nadirlik
  const stops = roadmap();
  const w = self.equip.weapon, a = self.equip.armor;
  const ri = (r?: string) => (r ? RARITIES.indexOf(r as Rarity) : -1);
  let best: Rarity | null = null;
  for (const s of stops) for (const [r] of s.rarities) if (RARITY[r].minLevel <= lv && ri(r) > ri(best ?? undefined)) best = r;
  if (best) for (const it of [w, a]) {
    if (it && ri(it.rarity) < ri(best) && it.rarity !== 'unique') {
      // girebildiği bölgeler içinde o nadirliğin en çok düştüğü yer
      const share = (s: GuideStop) => s.rarities.find(([r]) => r === best)?.[1] ?? 0;
      const where = stops.filter((s) => s.minLevel <= lv && share(s) > 0).sort((x, y) => share(y) - share(x))[0]?.map.name;
      out.push({ id: 'rar-' + it.tpl, icon: '🗡️', title: `${RARITY[best].name} ${slotNm(ITEM_TPL.get(it.tpl)?.slot ?? 'weapon')} kuşanabilirsin`, how: where ? `${where} canavarlarından düşer` : 'Canavarlardan düşer', gain: 'çok daha güçlü' });
      break;
    }
  }
  // sıradaki artı
  for (const [it, icon] of [[w, '⚔'], [a, '🛡']] as const) {
    if (!it || it.plus >= MAX_PLUS) continue;
    const slot = ITEM_TPL.get(it.tpl)?.slot; const st = upgradeSteps()[it.plus];
    if (!slot || !st) continue;
    out.push({ id: 'plus-' + slot, icon: '⚒️', title: `${SLOT_NAMES[slot]}ına +${it.plus + 1} bas`, how: `Demirci Haso · şans %${st.chance} · ${fmt(st.gems)} Mücevher`, gain: `${icon} +${plusAdd(slot, it.plus + 1) - plusAdd(slot, it.plus)}` });
  }
  // evrim sayacı
  if (E.enabled) for (const it of [w, a]) {
    const slot = it ? ITEM_TPL.get(it.tpl)?.slot : undefined;
    if (!it || (slot !== 'weapon' && slot !== 'armor') || (it.evo ?? 0) >= EVO_TIERS) continue;
    const e = it.evo ?? 0, st = E[slot][e];
    if (!st) continue;
    out.push({ id: 'evo-' + slot, icon: '🌀', title: `${SLOT_NAMES[slot]} evrimi: ${fmt(Math.min(it.kills ?? 0, st.kills))} / ${fmt(st.kills)} av`, how: (it.kills ?? 0) >= st.kills ? 'Sayaç doldu! Haso\'da evrilt' : 'Kuşanıp avla · Kor Kulesi malzemeleri', gain: `${slot === 'weapon' ? '⚔' : '🛡'} +${st.add - (e ? E[slot][e - 1].add : 0)}` });
  }
  // Eşsiz'e dönüşebilecek kuşanılmış eşya
  if (tc.enabled) for (const it of Object.values(self.equip)) {
    if (!it || !tc.from.includes(it.rarity)) continue;
    const g = transformGroup(it); if (!g || lv < tc.cost[g].minLevel) continue;
    const slot = ITEM_TPL.get(it.tpl)!.slot;
    out.push({ id: 'uq-' + slot, icon: '💛', title: `${SLOT_NAMES[slot]} Eşsiz'e dönüşebilir`, how: `Haso · Dönüşüm · ${fmt(tc.cost[g].gems)} Mücevher`, gain: `+${itemPower({ ...it, rarity: 'unique' }) - itemPower(it)} güç` });
    break;
  }
  // eksik efsun (silah/zırh)
  const max = ENCHANT_TIER_WEIGHTS.length;
  for (const it of [w, a]) if (it && it.ench.length < max && enchAdd) {
    out.push({ id: 'ench-' + it.tpl, icon: '🔮', title: `${SLOT_NAMES[ITEM_TPL.get(it.tpl)?.slot ?? 'weapon']}: ${it.ench.length}/${max} efsun`, how: `${enchAdd.name} · Nesne Market`, gain: '+1 efsun' });
    break;
  }
  // rün ve rütbe
  if (lv >= rc.unlockLevel) {
    const empty = RUNE_KINDS.filter((k) => !self.runes?.eq?.[k]);
    if (empty.length) out.push({ id: 'rune', icon: '💠', title: `${empty.length} rün yuvan boş`, how: `${MAPS.coast?.name ?? 'Rün Sahili'} · ${rc.craftCost} parça = 1 rün · Rün (U)`, gain: empty.map((k) => RUNES[k].statName).join(', ') });
    else out.push({ id: 'rune', icon: '💠', title: 'Rünlerini yükselt', how: 'Yükseltme her zaman başarılı · Rün (U)', gain: `seviye başına +%${fmt2(rc.pctPerLevel)}` });
  } else out.push({ id: 'rune', icon: '💠', title: `Sv. ${rc.unlockLevel} olunca rünler açılır`, how: MAPS.coast?.name ?? 'Rün Sahili', gain: 'saldırı · savunma · can' });
  if (lv >= RANK_LEVEL) out.push({ id: 'rank', icon: '🎖️', title: 'Rütbeni yükselt', how: 'Kazandığın tecrübe rütbeye akar', gain: `en çok +%${RANKS[RANKS.length - 1].atkPct}` });
  if (!self.mount?.owned && lv >= MOUNT.level) out.push({ id: 'mount', icon: '🐎', title: 'Binek görevini tamamla', how: `Seyis Arda · ${MOUNT.kills} av, ${MOUNT.seals} ${MATERIAL.get(MOUNT.sealKey)?.name ?? MOUNT.sealKey}`, gain: `+${MOUNT.atk} saldırı` });
  if (gardenOn) out.push({ id: 'potion', icon: '🌿', title: 'Avdan önce iksir iç', how: 'Şifacı Reyhan\'da kaynat', gain: `canavara +%${hunter.value}` });
  const on = (k: string) => (self.buffs?.[k] ?? 0) > now;
  if (wings && !on('crimson_wings')) out.push({ id: 'wings', icon: '🌟', title: wings.name, how: `Nesne Market · ${fmt(mallPrice('crimson_wings'))} ÇP`, gain: `+${wb.atk} saldırı · +${wb.def} savunma` });
  if (!PET_KEYS.some((k) => on(k)) && MALL.get('pet_bird')) out.push({ id: 'pet', icon: '🐾', title: 'Yol arkadaşı edin', how: 'Nesne Market · evcil hayvan', gain: '+20 saldırı' });
  return out;
}
const fmt2 = (n: number) => String(Math.round(n * 100) / 100).replace('.', ',');
