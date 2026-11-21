import {
  TICK_MS, VIEW_HALF_W, VIEW_HALF_H, NO_DIR, DIR_STEPS, LOOT_TTL_MS, LOOT_OWNER_ONLY_MS, LOOT_PICKUP_RANGE, RESPAWN_DELAY_MS,
  COMBAT_LOCK_MS, BAG_EQUIP_CAP, storageCap, STORAGE_MAX_PAGES, STORAGE_BASE_PAGES, STALL_MAX_ITEMS, STALL_MIN_GAP, STALL_VIEW_RANGE, STALL_MAX_PRICE, STALL_TITLE_MAX, STALL_NO_SELL, MARKET_MAX_STALLS, inMarket, CHAT_MAX, Anim, Upd, EFlag, Ev, DmgFlag, Fx, Kind, Op, BinWriter, writeSpawn, writeUpdate, writeEvent,
  stepMove, nearestFree, getLayout, MAPS, classSkill, attackCooldown, skillDamageMult, rollDamage, xpToNext, statBudget, skillUpgradeBudget, skillPointsUsed, SKILL_SLOTS, CAST_FIRST, CAST_CHAIN_HOP,
  LEVEL_CAP_BASE, STAT_MAX, skillUpCost, ITEM_TPL, ITEM_TEMPLATES, RARITY, RARITIES, ENCHANTS, ENCHANT_TIER_WEIGHTS, LOOT_PROFILES, VARIANT_LOOT_MULT, resolveLoot, overLevelMul,
  itemIconName, enchantAttackMult, enchantDefenseMult, classAttackKind, monsterAttackKind, ENCHANT_COUNT_WEIGHTS,
  SHOPS, sellPrice, masteryChance, MALL, mallPrice, mallForSale, charBuffs, AUTO_POOL, CP_COUPON, SUPPORT_PACK, PET_KEYS, PET_FOX_MS, PREREG_REWARD, fishTable, fishingConf, fishPrice, FISH_BY_ID, ROD_ID, validateCharacterName, MAX_PLUS, cosmeticByte, transformConf, transformGroup, canTransform, upgradeStep, upgradeFailDown, isUpgradable, MATERIAL, trDayKey, trPeriod, sanitizeChat, itemDisplayName, CLASSES, MONSTERS, TUNING, rebuildSpawns, MOUNT, RANK_LEVEL, RANK_MAX, rankDef, addRankXp, RUNES, RUNE_MAX_LEVEL, runeConf, runeKey, parseRuneKey, runeUpCost, isRuneKind, runePct,
  FORGE_MAP, WORLD_BOSS_ID, WORLD_BOSS_MAP, EVO_TIERS, EVO_NAMES, QTE_SWEEP_MS, QTE_TOL, QTE_MULT, qteZone, skillBuffVal, skillHealPct,
  towerRoom, towerFloorAt, TOWER_MAP, TOWER_FLOORS, TOWER_PUZZLE_NAMES, PLATE_R, GATE_R, ALTAR_HOLD_MS, ALTAR_WINDOW_MS, RIDDLES, SEQ_NAMES, QUEST_MAX_ACTIVE, type QuestDef,
  type ClientCmd, type ItemInstance, type Rarity, type Slot, type EnchantType, type GameEvent, type EntitySpawn, type SkillDef,
} from '@col/shared';
import type { CharState, FromWorker, WorkerStats, MarketState, MarketStall, StallEntry, AdminGive, TowerProgress, GuildTag, GuildWarInfo } from '../types.ts';
import { Zone, type ZoneEvent } from './zone.ts';
import { Player, Monster, Loot, MState, type LootPayload, type Telegraph } from './entities.ts';
import { Histogram } from '../metrics.ts';
import { newCaptcha, checkCaptcha } from '../captcha.ts';
import { findPath, los, freeAt, activeEvents, EVENT_NAMES, type ActiveEvents, GARDEN_PLANTS, GARDEN_MAP, GARDEN_REACH, POTIONS, HERBS, type PotionKey } from '@col/shared';
import { Social, type InviteKind } from './social.ts';
import { Forge } from './forge.ts';

const DIR_TO_BYTE = 256 / DIR_STEPS;
const angleByte = (dx: number, dy: number) => { let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2; return Math.round((a / (Math.PI * 2)) * 256) & 255; };
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = Math.random;
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const MONSTER_RADIUS = 22;
const PLAYER_HIT_R = 14; // oyuncu gövde yarıçapı: alan vuruşlarında kenardan değen oyuncu da sayılır
const RANGE_TOLERANCE = 48;
const MELEE_TOLERANCE = 30;
const NPC_RANGE = 260;
const RECEIPT_KEEP = 64;

const STAFF_ROLES = new Set(['gm', 'admin', 'owner']);
/** Bot doğrulaması: 50–70 dakikada bir (rastgele), cevap için 5 dk; beklerken savaş, oto av, toplama kilitli. */
const BOT_EVERY_MS = 60 * 60_000, BOT_JITTER_MS = 10 * 60_000, BOT_GRACE_MS = 5 * 60_000, BOT_MAX_TRIES = 5;
const BOT_BLOCK = new Set(['attack', 'skill', 'auto', 'pickup', 'fish_cast', 'fish_end', 'garden', 'stall_open']);
const TRADE_BLOCK = new Set(['rune', 'upgrade', 'transform', 'evolve', 'use', 'sell', 'craft', 'stall_open', 'equip', 'unequip', 'storage', 'fish_sell', 'mall_buy']);
const HEAVY_CMDS = new Set(['sync', 'bosses', 'market_search']);
export interface WorldOptions { channel: number; aoiMaxPlayers: number; saveIntervalMs: number; post: (m: FromWorker, transfer?: ArrayBuffer[]) => void }

/** Bir kanalın tüm bölgeleri. Tek thread, tek yazar: kanal içi her durum değişikliği burada sıralı işlenir. */
/** Canavarlardan asla düşmeyen malzemeler (yönetim ganimet tablosuna eklense bile). */
const NO_MONSTER_DROP = new Set(['mastery_seal']);

export class World {
  zones = new Map<string, Zone>();
  bySid = new Map<number, Player>();
  tickNo = 0;
  private pathBudget = 24;
  t0 = Date.now();
  now = Date.now();
  out: [number, string | ArrayBuffer][] = [];
  transfer: ArrayBuffer[] = [];
  writer = new BinWriter(64 * 1024);
  /** Adım başına kodlama önbelleği: bir varlığın doğma/güncelleme baytları her izleyici için değil, adımda bir kez kodlanır. */
  private encW = new BinWriter(1024);
  private spawnBin = new Map<object, Uint8Array>();
  private updBin = new Map<object, Uint8Array>();
  tickHist = new Histogram(1200);
  overruns = 0;
  bytesOut = 0; msgsOut = 0;
  worldHealth = 100; online = 0;

  /** Oyuncular arası: grup, ticaret, düello, arkadaşlık (kanal içi). */
  social: Social;
  /** Kor Kulesi: grup başına örnek koşular */
  forge: Forge;
  private byCharId(charId: number) { for (const q of this.bySid.values()) if (q.char.id === charId) return q; return undefined; }

  constructor(public opt: WorldOptions) {
    for (const id of Object.keys(MAPS)) this.zones.set(id, new Zone(id));
    // Dünya Boss'u açılışta hemen doğmaz: sayaç (doğma aralığı) dolunca doğar
    { const z = this.zones.get(WORLD_BOSS_MAP); if (z) for (const m of [...z.monsterList]) if (m.def.id === WORLD_BOSS_ID) { z.removeMonster(m); z.respawnQueue.push({ at: Date.now() + this.respawnDelay(m.def), sp: m.sp }); } }
    const w = this;
    this.social = new Social({
      get now() { return w.now; }, bagCap: BAG_EQUIP_CAP,
      byChar: (id) => w.byCharId(id), sendJson: (p, o) => w.sendJson(p, o), notice: (p, t, k) => w.notice(p, t, k), save: (p, u) => w.save(p, u),
    });
    this.social.allCharNames = function* () { for (const q of w.bySid.values()) yield q.char.name; };
    this.forge = new Forge({
      get now() { return w.now; },
      zone: () => w.zones.get(FORGE_MAP)!,
      byChar: (id) => w.byCharId(id), partyMembers: (p) => w.social.partyMembers(p),
      sendJson: (p, o) => w.sendJson(p, o), notice: (p, t, k) => w.notice(p, t, k), save: (p, u) => w.save(p, u),
      moveToZone: (p, z, x, y) => w.moveToZone(p, z, x, y),
      toTown: (p) => { const town = w.zones.get('bazaar')!; const n = town.layout.npcs.find((x) => x.id === 'bekci'); w.moveToZone(p, town, (n?.x ?? town.layout.spawn.x) + 60, (n?.y ?? town.layout.spawn.y) + 70); w.save(p); },
      zap: (p, f, m) => w.towerZap(p, f, m),
      broadcastWorld: (from, text) => { const msg = JSON.stringify({ t: 'chat', ch: 'world', from, text, cls: '', gm: true }); for (const q of w.bySid.values()) w.pushOut(q.sid, msg); },
      nearWarden: (p) => w.nearNpc(p, 'bekci'),
    });
  }
  /**
   * Yönetim: bir karakterin seviyesini/cüzdanını değiştirir (çevrimiçiyse anında, istatistikleriyle).
   * Sunucuda `gm_set` komutu yalnız yönetici rolündeki oyunculara açıktır; tarayıcı sürümünde panelden çağrılır.
   */
  adminSetPlayer(charId: number, patch: { level?: number; gems?: number; essence?: number; potions?: number; cp?: number }): boolean {
    let p: Player | undefined;
    for (const q of this.bySid.values()) if (q.char.id === charId) { p = q; break; }
    if (!p) return false;
    const c = p.char;
    if (patch.level !== undefined) {
      c.level = Math.max(1, Math.min(LEVEL_CAP_BASE, Math.round(patch.level))); c.xp = 0;
      if (c.level >= RANK_LEVEL && !(c.misc.rank && c.misc.rank.r >= 1)) c.misc.rank = { r: 1, xp: 0 };
      p.recompute(false); p.hp = p.stats.maxHp;
      p.dirty |= Upd.HP | Upd.MAXHP | Upd.LEVEL;
      p.zone.emit(p.x, p.y, { e: Ev.LEVELUP, id: p.id, level: c.level });
    }
    if (patch.gems !== undefined) c.gems = Math.max(0, Math.round(patch.gems));
    if (patch.essence !== undefined) c.essence = Math.max(0, Math.round(patch.essence));
    if (patch.potions !== undefined) c.materials.red_potion = Math.max(0, Math.round(patch.potions));
    if (patch.cp !== undefined) c.cp = Math.max(0, Math.round(patch.cp));
    p.selfDirty |= 1 | 2 | 4;
    this.save(p, true);
    return true;
  }

  private findPlayer(charId: number) { for (const q of this.bySid.values()) if (q.char.id === charId) return q; return undefined; }
  /** Yönetim / E-PIN: ÇP ekle (çevrimiçi karakter). */
  adminAddCp(charId: number, amount: number): boolean {
    const p = this.findPlayer(charId); if (!p) return false;
    p.char.cp = Math.max(0, p.char.cp + Math.round(amount));
    p.selfDirty |= 1; this.save(p, true);
    this.notice(p, amount >= 0 ? `Hesabına ${Math.round(amount).toLocaleString('tr-TR')} ÇP yüklendi.` : `${Math.round(-amount)} ÇP düşüldü.`, 'ok');
    return true;
  }
  /** Yönetim: çevrimiçi oyuncuya eşya/malzeme ver (anında çantasına). */
  adminGive(charId: number, g: AdminGive): boolean {
    const p = this.findPlayer(charId); if (!p) return false;
    const before = p.char.misc.rank?.r ?? 0;
    const text = applyGive(p.char, g);
    if (g.kind === 'rank') this.rankChanged(p, before);
    p.recompute(true); p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.notice(p, text, 'ok');
    return true;
  }
  /** İsim Değiştirme: ad veritabanında değişti; burada bellekteki ad güncellenir ve ürün tüketilir. */
  /** Yönetimden rol değişti: oyundaki karaktere anında yansır (GM yazısı başında belirir/kalkar). */
  adminSetRole(charId: number, role: string) {
    const p = this.findPlayer(charId); if (!p) return;
    p.char.role = role as typeof p.char.role;
    this.sendJson(p, { t: 'char', id: p.char.id, name: p.char.name, cls: p.char.cls, role: p.char.role });
    this.notice(p, role === 'gm' || role === 'admin' ? 'Artık Oyun Yöneticisisin (GM).' : 'Rolün güncellendi.', 'info');
  }

  adminRename(charId: number, name: string): boolean {
    const p = this.findPlayer(charId); if (!p || !name) return false;
    const c = p.char;
    if ((c.materials.rename ?? 0) <= 0) return false; // aynı karta paralel istek: yalnız bir kez
    c.materials.rename -= 1;
    c.name = name; p.selfDirty |= 2; this.save(p, true); // diğer oyuncular yeni adı karakter yeniden göründüğünde görür
    this.sendJson(p, { t: 'char', id: c.id, name: c.name, cls: c.cls, role: c.role });
    this.notice(p, `Yeni adın: ${name}`, 'ok');
    return true;
  }

  /** Yönetim: çevrimiçi karakteri yeni açılmış hâline döndürür (seviye 1, başlangıç eşyaları, köyde). */
  adminResetPlayer(charId: number): boolean {
    let p: Player | undefined;
    for (const q of this.bySid.values()) if (q.char.id === charId) { p = q; break; }
    if (!p) return false;
    resetCharState(p.char);
    const town = this.zones.get('bazaar')!;
    p.dead = false;
    this.moveToZone(p, town, town.layout.spawn.x, town.layout.spawn.y);
    p.recompute(false); p.hp = p.stats.maxHp;
    p.dirty |= Upd.HP | Upd.MAXHP | Upd.LEVEL;
    p.selfDirty |= 1 | 2 | 4;
    this.notice(p, 'Karakterin yönetici tarafından sıfırlandı.', 'info');
    this.save(p, true);
    return true;
  }

  /** Dünya Sağlığı'na Öz bağışı: Öz burada düşülür, sağlık ana süreçte artar. */
  private cmdDonate(p: Player, amount: number, req: string) {
    if (amount <= 0 || amount > p.char.essence) return this.notice(p, 'Geçersiz bağış miktarı.');
    if (this.seenReceipt(p, req)) return;
    p.char.essence -= amount;
    p.selfDirty |= 1; this.save(p, true);
    this.opt.post({ type: 'donate', sid: p.sid, charId: p.char.id, name: p.char.name, amount });
  }

  /** Yönetim: TP tablosu değişirken oyundakilerin seviye içi ilerleme oranı korunur (önce oranlar alınır, sonra uygulanır). */
  xpRatios() { const m = new Map<number, number>(); for (const p of this.bySid.values()) m.set(p.sid, p.char.xp / Math.max(1, xpToNext(p.char.level))); return m; }
  applyXpRatios(m: Map<number, number>) {
    for (const p of this.bySid.values()) {
      const r = m.get(p.sid); if (r === undefined) continue;
      const next = Math.max(1, Math.round(Math.min(0.999, r) * xpToNext(p.char.level)));
      if (next !== p.char.xp) { p.char.xp = next; p.selfDirty |= 1; }
    }
  }

  /** Yönetim: canavar ayarı değişince haritadaki canlı canavarlar da yeni can/saldırıyı hemen alır. */
  restatMonsters() {
    for (const z of this.zones.values()) for (const m of z.monsterList) {
      if (m.state === MState.DEAD) continue;
      const a = m.maxHp, h = m.hp; m.restat();
      if (m.maxHp !== a || m.hp !== h) m.dirty |= Upd.HP | Upd.MAXHP;
    }
  }

  /** Yönetim: haritanın canavar yuvalarını güncel yoğunlukla yeniden kurar (oyuncuların görüşünden çıkanlar istemciden düşer). */
  reseedMonsters(mapId: string) {
    const z = this.zones.get(mapId);
    if (!z) return;
    // Dünya Boss'u ayar kaydında sıfırlanmaz: canlıysa canı korunur, bekliyorsa sayacı sürer
    const wbAlive = z.monsterList.find((m) => m.def.id === WORLD_BOSS_ID && m.state !== MState.DEAD);
    const wbHp = wbAlive ? wbAlive.hp / wbAlive.maxHp : 0;
    const wbAt = z.respawnQueue.find((r) => r.sp.monster === WORLD_BOSS_ID)?.at ?? (z.monsterList.some((m) => m.def.id === WORLD_BOSS_ID) && !wbAlive ? this.now + 5000 : 0);
    for (const m of [...z.monsterList]) { m.threat.clear(); m.target = null; z.removeMonster(m); }
    z.respawnQueue.length = 0;
    rebuildSpawns(z.layout);
    const defs = new Map(MONSTERS.map((d) => [d.id, d] as const));
    for (const sp of z.layout.spawnPoints) {
      const d = defs.get(sp.monster); if (!d) continue;
      if (d.id === WORLD_BOSS_ID && !wbAlive) { z.respawnQueue.push({ at: wbAt || Date.now() + this.respawnDelay(d), sp }); continue; }
      const m = new Monster(d, sp);
      if (d.id === WORLD_BOSS_ID && wbHp > 0) m.hp = Math.max(1, Math.round(m.maxHp * wbHp));
      z.addMonster(m);
    }
    if (mapId === WORLD_BOSS_MAP) this.broadcastBosses();
  }

  // ───────────────────────────── bağlantı ─────────────────────────────
  join(sid: number, char: CharState) {
    if (this.bySid.has(sid)) return;
    char.level = Math.max(1, Math.min(LEVEL_CAP_BASE, char.level));
    if (char.level < LEVEL_CAP_BASE && char.xp >= xpToNext(char.level)) char.xp = xpToNext(char.level) - 1; // TP tablosu değiştiyse
    if (char.level >= RANK_LEVEL && !(char.misc.rank && char.misc.rank.r >= 1)) { char.misc.rank = { r: 1, xp: 0 }; char.xp = 0; } // 65: doğrudan Öz Avcısı
    if (!this.zones.has(char.map) || (char.map === 'arena' && !this.arenaActive) || (char.map === TOWER_MAP && !TUNING.tower.enabled) || (char.map === FORGE_MAP && !this.forge.hasChar(char.id)) || (char.map === 'guildwar' && !this.guildWars.length)) { const l = getLayout('bazaar'); char.map = 'bazaar'; char.x = l.spawn.x; char.y = l.spawn.y; }
    const zone = this.zones.get(char.map)!;
    const pos = nearestFree(zone.layout, char.x || zone.layout.spawn.x, char.y || zone.layout.spawn.y);
    char.x = pos.x; char.y = pos.y;
    // kaska can efsunu artık gelmiyor: eski kasklardakini değiştir
    for (const it of [...char.bag, ...Object.values(char.equip)]) fixHelmetHp(it as ItemInstance | undefined);
    // ön kayıt tilkisi önceden kalıcıydı: 3 güne indir (bir kez)
    { const b = char.misc.buffs; if (b?.pet_fox && b.pet_fox > Date.now() + 30 * 86_400_000) { char.misc.foxUntil = Date.now() + PET_FOX_MS; b.pet_fox = char.misc.foxUntil; } }
    const p = new Player(sid, char);
    if (zone.id === FORGE_MAP) this.forge.rejoin(p);
    if (char.misc.deadAt && char.hp <= 0) { p.dead = true; p.deadAt = Math.min(this.now, char.misc.deadAt); p.hp = 0; p.anim = Anim.DEAD; }
    if (p.hp <= 0 && !p.dead) p.hp = p.stats.maxHp;
    this.bySid.set(sid, p);
    zone.addPlayer(p);
    this.sendJson(p, { t: 'welcome', entityId: p.id, channel: this.opt.channel, map: zone.id, x: p.x, y: p.y, serverTime: this.now, worldHealth: this.worldHealth, online: this.online });
    this.sendFullSelf(p);
    // ölüyken çıkıp yeniden giren: ölüm penceresi (Burada doğ / Köyde doğ) yeniden gösterilir. Önceden gönderilmiyordu;
    // karakter ölü kalıyor, ne yerinde doğabiliyor ne ışınlanabiliyordu.
    if (p.dead) this.sendJson(p, { t: 'dead', killer: null, lost: 0, respawnIn: Math.max(0, RESPAWN_DELAY_MS - (this.now - p.deadAt)), town: MAPS[zone.def.respawnMap]?.name });
    if (zone.id === TOWER_MAP) this.towerSend(p);
    if (zone.id === FORGE_MAP) this.forge.sendTo(p);
    this.marketJoin(p);
    this.opt.post({ type: 'joined', sid, ok: true });
  }

  leave(sid: number) {
    const p = this.bySid.get(sid);
    if (!p) return;
    this.social.onLeave(p);
    if (p.zone.id === 'arena') this.opt.post({ type: 'arena_left', charId: p.char.id });
    this.bySid.delete(sid);
    p.zone.removePlayer(p);
    for (const m of p.zone.monsterList) if (m.target === p) { m.target = null; m.threat.delete(p); }
    this.opt.post({ type: 'left', sid, char: this.snapshotChar(p) });
  }

  snapshotChar(p: Player): CharState {
    const c = p.char;
    c.x = Math.round(p.x); c.y = Math.round(p.y); c.map = p.zone.id; c.hp = p.dead ? 0 : Math.round(p.hp);
    if (p.dead) c.misc.deadAt = p.deadAt; else delete c.misc.deadAt;
    c.saveVersion++;
    p.saveDirty = false; p.lastSaveAt = this.now;
    try { return structuredClone(c); }
    catch (e) {
      // kopyalanamayan değer (işlev, nesne kökü…): JSON üzerinden temizle, geçersiz eşyaları at — kanal çökmesin
      console.error('[world] snapshot temizleniyor', c.id, (e as Error).message);
      const ok = (it: unknown) => !!it && typeof it === 'object' && typeof (it as ItemInstance).id === 'string' && typeof (it as ItemInstance).tpl === 'string';
      c.bag = c.bag.filter(ok);
      for (const k of Object.keys(c.equip)) if (!ok((c.equip as Record<string, unknown>)[k])) delete (c.equip as Record<string, unknown>)[k];
      if (c.storage) c.storage = c.storage.filter(ok);
      return JSON.parse(JSON.stringify(c)) as CharState;
    }
  }
  save(p: Player, urgent = false) { this.opt.post({ type: 'save', char: this.snapshotChar(p), urgent }); }

  // ───────────────────────────── giriş ─────────────────────────────
  onMove(sid: number, buf: ArrayBuffer) {
    const p = this.bySid.get(sid);
    if (!p || buf.byteLength < 4) return;
    const v = new DataView(buf);
    const seq = v.getUint16(1, true), dir = v.getUint8(3);
    if (p.inputs.length >= 30) p.inputs.shift();
    p.inputs.push({ seq, dir });
    p.lastActiveAt = this.now;
  }

  onCmd(sid: number, raw: string) {
    const p = this.bySid.get(sid);
    if (!p) return;
    let c: ClientCmd;
    try { c = JSON.parse(raw); } catch { return; }
    if (!c || typeof c !== 'object' || typeof (c as { t?: unknown }).t !== 'string') return;
    p.lastActiveAt = this.now;
    try { this.dispatch(p, c); } catch (e) { console.error('[world] cmd error', c.t, (e as Error).stack); this.notice(p, 'İşlem tamamlanamadı.', 'error'); }
  }

  private dispatch(p: Player, c: ClientCmd) {
    if (c.t === 'botcheck') return this.cmdBotCheck(p, c);
    // ticaret sürerken teklifteki eşyalar değiştirilemesin (kilitten sonra artı/efsun/dönüşümle değiştirip karşı tarafı aldatma)
    if (TRADE_BLOCK.has(c.t) && this.social.inTrade(p)) { this.reply(p, c, false, 'Ticaret sürerken bu işlem yapılamaz.'); return this.notice(p, 'Ticaret sürerken bu işlem yapılamaz.'); }
    // pahalı sorgular oyuncu başına saniyede bir
    if (HEAVY_CMDS.has(c.t)) { if (this.now - (p.heavyAt ?? 0) < 900) return; p.heavyAt = this.now; }
    if (p.botCheck && BOT_BLOCK.has(c.t)) { this.notice(p, 'Önce ekrandaki doğrulama kodunu gir.', 'error'); return this.sendBotCheck(p); }
    if (p.dead && !['respawn', 'chat', 'ping', 'sync', 'lock', 'autopotion', 'party', 'friends', 'trade', 'arena'].includes(c.t)) { this.reply(p, c, false, 'Ölüyken bu işlem yapılamaz.'); return; }
    switch (c.t) {
      case 'gm_reset': {
        if (!['admin', 'owner'].includes(p.char.role)) return this.notice(p, 'Bu komut için yetkin yok.');
        let target: Player | undefined;
        for (const q of this.bySid.values()) if (q.char.name.toLocaleLowerCase('tr') === String(c.name ?? '').toLocaleLowerCase('tr')) { target = q; break; }
        if (!target) return this.notice(p, 'Oyuncu bu kanalda çevrimiçi değil.');
        this.adminResetPlayer(target.char.id);
        return this.notice(p, `${target.char.name} sıfırlandı.`, 'ok');
      }
      case 'gm_set': {
        // yalnız yönetici rolü; hedef bu kanalda çevrimiçi oyuncu (ada göre)
        if (!['admin', 'owner'].includes(p.char.role)) return this.notice(p, 'Bu komut için yetkin yok.');
        let target: Player | undefined;
        for (const q of this.bySid.values()) if (q.char.name.toLocaleLowerCase('tr') === String(c.name ?? '').toLocaleLowerCase('tr')) { target = q; break; }
        if (!target) return this.notice(p, 'Oyuncu bu kanalda çevrimiçi değil.');
        const num = (v: unknown, hi: number) => { if (v === undefined || v === null || v === '') return undefined; const n = Math.floor(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(hi, n)) : undefined; };
        this.adminSetPlayer(target.char.id, { level: num(c.level, 200), gems: num(c.gems, 2e9), essence: num(c.essence, 2e9), potions: num(c.potions, 1e6) });
        console.log('[denetim] gm_set', p.char.name, '→', target.char.name, JSON.stringify({ level: c.level, gems: c.gems, essence: c.essence, potions: c.potions }));
        return this.notice(p, `${target.char.name} güncellendi.`, 'ok');
      }
      case 'stall_open': return this.cmdStallOpen(p, c);
      case 'stall_close': return this.cmdStallClose(p);
      case 'stall_view': return this.cmdStallView(p, String(c.stall ?? ''));
      case 'stall_buy': return this.cmdStallBuy(p, c);
      case 'attack': return this.cmdAttack(p, c.id);
      case 'skill': return this.cmdSkill(p, c.s | 0, c.id, c.x, c.y, !!c.qte);
      case 'qte': return this.cmdQteStart(p, c.s | 0);
      case 'pickup': return this.cmdPickup(p, c.id);
      case 'respawn': return this.cmdRespawn(p, c.where === 'town' ? 'town' : 'here');
      case 'potion': return this.usePotion(p, false);
      case 'autopotion': p.char.misc.autoPotion = !!c.on; p.markSave(); this.sendSelf(p, 1); return;
      case 'chat': return this.cmdLocalChat(p, c);
      case 'equip': return this.cmdEquip(p, String(c.item));
      case 'unequip': return this.cmdUnequip(p, String(c.slot) as Slot);
      case 'travel': return this.cmdTravel(p, String(c.map), !!c.confirm, String(c.req ?? ''));
      case 'stats': return this.cmdStats(p, c);
      case 'skillup': return this.cmdSkillUp(p, c.s | 0, String(c.req ?? ''));
      case 'spec': return this.cmdSpec(p, String(c.spec), String(c.req ?? ''));
      case 'lock': return this.cmdLock(p, String(c.item), !!c.on);
      case 'sell': return this.cmdSell(p, Array.isArray(c.items) ? c.items.map(String).slice(0, 40) : [], String(c.req ?? ''));
      case 'buy': return this.cmdBuy(p, c);
      case 'essx': return this.cmdEssx(p, c);
      case 'donate': return this.cmdDonate(p, Math.floor(Number(c.amount) || 0), String(c.req ?? ''));
      case 'upgrade': return this.cmdUpgrade(p, c);
      case 'transform': return this.cmdTransform(p, c);
      case 'auto': return this.cmdAuto(p, !!c.on);
      case 'npc': return this.cmdNpc(p, String(c.id));
      case 'use': return this.cmdUse(p, String(c.key), String(c.req ?? ''), c.item ? String(c.item) : undefined);
      case 'mall_buy': return this.cmdMallBuy(p, String(c.id), Math.floor(Number(c.qty) || 1), String(c.req ?? ''));
      case 'stall_skin': { const ch = p.char; if (!ch.misc.stallSkin) return this.notice(p, 'Zümrüt Pazar Tezgâhı market ürünüdür.'); ch.misc.stallSkin = c.on ? 2 : 1; const st = this.ownStall(ch.id); if (st) { st.skin = c.on ? 'emerald' : undefined; const zz = this.zones.get(st.zone); if (zz) this.broadcastStalls(zz); } p.selfDirty |= 1; p.markSave(); return; }
      case 'rune': return this.cmdRune(p, String(c.op ?? ''), c);
      case 'market_search': return this.cmdMarketSearch(p, String(c.q ?? ''), String(c.cat ?? 'all'), String(c.sort ?? 'price'));
      case 'chat_item': return this.cmdChatItem(p, String(c.item), String(c.req ?? ''));
      case 'fish_cast': return this.cmdFishCast(p);
      case 'fish_end': return this.cmdFishEnd(p, String(c.token ?? ''), !!c.ok);
      case 'fish_rod': return this.cmdFishRod(p, String(c.req ?? ''));
      case 'fish_sell': return this.cmdFishSell(p, String(c.req ?? ''));
      case 'social': {
        const k = String(c.kind) as InviteKind;
        if (!['party', 'trade', 'duel', 'friend'].includes(k)) return;
        if (c.op === 'invite') { const t = this.findTarget(p.zone, Number(c.target) || 0); return this.social.invite(p, t instanceof Player ? t : null, k); }
        if (c.op === 'answer') return this.social.answer(p, Number(c.from) || 0, k, !!c.accept);
        return;
      }
      case 'party': if (c.op === 'leave') return this.social.leaveParty(p); if (c.op === 'kick') return this.social.kick(p, Number(c.target) || 0); return;
      case 'trade':
        if (c.op === 'set') return this.social.tradeSet(p, c.items, c.gems);
        if (c.op === 'lock') return this.social.tradeLock(p);
        if (c.op === 'confirm') return this.social.tradeConfirm(p);
        return this.social.tradeCancel(p);
      case 'friends': if (c.op === 'remove') return this.social.removeFriend(p, String(c.name ?? '')); return this.social.sendFriends(p);
      case 'arena': return this.cmdArena(p, String(c.op));
      case 'mount': return this.cmdMount(p, String(c.op));
      case 'tower': return this.cmdTower(p, String(c.op));
      case 'forge': {
        if (c.op === 'enter') return this.forge.enter(p);
        if (c.op === 'state') return this.forge.sendTo(p);
        if (c.op === 'leave') { if (p.zone.id !== FORGE_MAP) return; if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken kuleden çıkamazsın.'); return this.forge.leave(p, false); }
        return;
      }
      case 'evolve': return this.cmdEvolve(p, String(c.item ?? ''), String(c.req ?? ''));
      case 'worldboss': return this.cmdWorldBoss(p, String(c.req ?? ''));
      case 'garden': return this.cmdGarden(p, c as { op: string; i?: number; r?: number; n?: number; req?: string });
      // yeni oyuncu rehberi: tamamlanan adımlar (bit) kalıcı; geri alınamaz, yalnız eklenir
      case 'tut': { const b = Math.floor(Number((c as { bits?: number }).bits) || 0) & 63; if (b) { p.char.misc.tutorial = (p.char.misc.tutorial ?? 0) | b; p.markSave(); } return; }
      case 'storage': return this.cmdStorage(p, c as { op: string; id?: string; key?: string; n?: number; cur?: string });
      case 'view': { p.viewW = Math.max(1000, Math.min(2400, Number(c.w) || VIEW_HALF_W)); p.viewH = Math.max(700, Math.min(1700, Number(c.h) || VIEW_HALF_H)); return; }
      case 'craft': return this.cmdCraft(p, String(c.id), String(c.req ?? ''));
      case 'quest': return this.cmdQuest(p, String(c.op), String(c.id), String(c.req ?? ''));
      case 'bosses': this.sendJson(p, { t: 'bosses', list: this.bossStatus() }); return;
      case 'ping': this.sendJson(p, { t: 'pong', c: c.c, s: this.now }); return;
      case 'sync': p.resetPending = true; this.sendFullSelf(p); return;
      default: return;
    }
  }

  // ───────────────────────────── tick ─────────────────────────────
  /** Etkin etkinlikler (saniyede bir hesaplanır): TP/eşya/Öz çarpanları ve Kristal Sandık şansı */
  private evNow: ActiveEvents = { xp: 1, drop: 1, essence: 1, chest: 0, list: [] };
  private evSeen = new Set<string>();
  // ───────── bot doğrulaması ─────────
  /** Saniyede bir: zamanı gelene doğrulama sor; süresi dolanı oyundan çıkar. Yönetim/GM muaf. */
  private tickBotChecks() {
    for (const p of this.bySid.values()) {
      const c = p.char;
      if (STAFF_ROLES.has(c.role)) continue;
      if (p.botCheck) {
        if (this.now > p.botCheck.until) { p.botCheck = null; delete p.char.misc.botTries; p.char.misc.botUntil = this.now + BOT_GRACE_MS; p.markSave(); this.opt.post({ type: 'kick', sid: p.sid, text: 'Doğrulama kodu süresinde girilmedi. Tekrar giriş yapabilirsin.' }); }
        continue;
      }
      c.misc.botNext ??= this.now + BOT_EVERY_MS + Math.random() * BOT_JITTER_MS - BOT_JITTER_MS / 2;
      if (c.misc.botDue || this.now >= c.misc.botNext) this.issueBotCheck(p, 0);
    }
  }
  private issueBotCheck(p: Player, tries: number) {
    const cap = newCaptcha();
    const m = p.char.misc;
    // süre ve hak kayıtta: çıkıp girmek süreyi ve hakları yenilemez
    const until = p.botCheck?.until ?? (m.botUntil && m.botUntil > this.now ? m.botUntil : this.now + BOT_GRACE_MS);
    tries = Math.max(tries, m.botTries ?? 0);
    p.botCheck = { id: cap.id, until, tries, svg: cap.svg, at: this.now };
    m.botDue = true; m.botUntil = until; m.botTries = tries; p.markSave();
    if (p.autoOn) { this.autoTick(p, this.now); p.autoOn = false; this.autoSend(p); }
    p.queuedAtk = 0;
    this.sendJson(p, { t: 'botcheck', id: cap.id, svg: cap.svg, until, tries, max: BOT_MAX_TRIES });
  }
  /** engellenen komutta: mevcut kodu yeniden gönder (her seferinde yeni kod üretmek başkalarının kodunu silebiliyordu) */
  private sendBotCheck(p: Player) { const b = p.botCheck; if (b) this.sendJson(p, { t: 'botcheck', id: b.id, svg: b.svg, until: b.until, tries: b.tries, max: BOT_MAX_TRIES }); }
  private cmdBotCheck(p: Player, c: { id?: string; a?: string; renew?: boolean }) {
    if (!p.botCheck) return this.sendJson(p, { t: 'botcheck_ok' });
    if (c.renew) { if (this.now - p.botCheck.at < 3000) return this.sendBotCheck(p); return this.issueBotCheck(p, p.botCheck.tries); }
    if (c.id === p.botCheck.id && checkCaptcha(c.id, typeof c.a === 'string' ? c.a.slice(0, 12) : '')) {
      p.botCheck = null; p.char.misc.botDue = false; delete p.char.misc.botUntil; delete p.char.misc.botTries;
      p.char.misc.botNext = this.now + BOT_EVERY_MS + Math.random() * BOT_JITTER_MS - BOT_JITTER_MS / 2;
      p.markSave();
      return this.sendJson(p, { t: 'botcheck_ok' });
    }
    const tries = p.botCheck.tries + 1;
    if (tries >= BOT_MAX_TRIES) { p.botCheck = null; delete p.char.misc.botTries; p.char.misc.botUntil = this.now + BOT_GRACE_MS; p.markSave(); this.opt.post({ type: 'kick', sid: p.sid, text: 'Doğrulama kodu çok kez yanlış girildi.' }); return; }
    this.notice(p, `Kod yanlış. ${BOT_MAX_TRIES - tries} hakkın kaldı.`, 'error');
    this.issueBotCheck(p, tries);
  }

  private tickEvents() {
    const ev = activeEvents(TUNING.events, this.now);
    const ids = new Set(ev.list.map((x) => x.e.id + ':' + x.end));
    if (TUNING.events.announce) {
      for (const { e, end } of ev.list) if (!this.evSeen.has(e.id + ':' + end)) {
        const min = Math.max(1, Math.round((end - this.now) / 60000));
        const what = e.kind === 'chest' ? `canavarlardan Kristal Sandık düşüyor (%${+(e.chance * 100).toFixed(1)})` : `${EVENT_NAMES[e.kind]} ×${+e.mult.toFixed(2)}`;
        if (this.evSeen.size || this.tickNo > 50) this.chatAll(`Etkinlik başladı: ${what} · ${min >= 60 ? `${Math.floor(min / 60)} sa ${min % 60 ? (min % 60) + ' dk' : ''}` : min + ' dk'} sürecek!`);
      }
      for (const k of this.evSeen) if (!ids.has(k)) { const e = this.evNow.list.find((x) => x.e.id + ':' + x.end === k)?.e; if (e) this.chatAll(`Etkinlik sona erdi: ${EVENT_NAMES[e.kind]}. Katılan herkese teşekkürler!`); }
    }
    this.evSeen = ids; this.evNow = ev;
  }
  private chatAll(text: string) { for (const p of this.bySid.values()) this.sendJson(p, { t: 'chat', ch: 'world', from: 'Etkinlik', text, gm: true }); }

  tick() {
    const t = performance.now();
    this.now = Date.now();
    this.tickNo++;
    this.pathBudget = 24; // bir tikte en çok bu kadar yol hesabı (kalabalıkta sunucu yorulmasın)
    if (this.tickNo % Math.round(1000 / TICK_MS) === 0) { this.social.tick(); this.tickEvents(); this.tickBotChecks(); } // saniyede bir: davet/ticaret/düello/grup, etkinlikler
    for (const z of this.zones.values()) {
      if (z.playerSet.size === 0 && z.respawnQueue.length === 0 && z.lootById.size === 0) continue;
      this.tickZone(z);
    }
    this.buildSnapshots();
    for (const z of this.zones.values()) {
      z.events.length = 0;
      for (const m of z.monsterList) m.dirty = 0;
      for (const p of z.playerSet) p.dirty = 0;
    }
    this.periodicSaves();
    if (this.tickNo % 200 === 0) this.flushGuildTax();
    if (this.tickNo % 20 === 7) this.guildWarSweep();
    if (this.forge.runs.size && this.tickNo % 2 === 1) this.forge.tick();
    this.flushOut();
    const dt = performance.now() - t;
    this.tickHist.add(dt);
    if (dt > TICK_MS) this.overruns++;
  }

  private tickZone(z: Zone) {
    const now = this.now;
    // 1) oyuncu hareketleri
    for (const p of z.playerSet) {
      if (p.queuedAtk && now + 60 >= p.cooldowns[0]) { const id = p.queuedAtk; p.queuedAtk = 0; if (now <= p.queuedAtkUntil && !p.dead) this.cmdAttack(p, id); }
      p.movedThisTick = false;
      p.moveBudget = Math.min(p.moveBudget + TICK_MS, 300);
      const blocked = p.dead || now < p.stunUntil || now < p.rootUntil;
      while (p.inputs.length && p.moveBudget >= TICK_MS - 1) {
        const inp = p.inputs.shift()!;
        p.moveBudget -= TICK_MS;
        p.lastSeq = inp.seq;
        if (blocked || inp.dir === NO_DIR) continue;
        const ox = p.x, oy = p.y;
        stepMove(z.layout, p, inp.dir, p.stats.speed);
        if (p.x !== ox || p.y !== oy) { p.movedThisTick = true; p.dir = Math.round(inp.dir * DIR_TO_BYTE) & 255; }
      }
      if (p.movedThisTick) {
        z.players.move(p);
        p.dirty |= Upd.POS;
        if (p.anim !== Anim.WALK && now >= p.animUntil) { p.anim = Anim.WALK; p.dirty |= Upd.ANIM; }
        p.saveDirty = true;
      } else if (p.anim === Anim.WALK || (p.anim !== Anim.IDLE && p.anim !== Anim.DEAD && now >= p.animUntil)) {
        if (!p.dead) { p.anim = Anim.IDLE; p.dirty |= Upd.ANIM; }
      }
      if (p.dead) {
        // 3 dk ölü kalan oyuncu kasabaya döner (asılı ölüm ekranı yok)
        if (now - p.deadAt > 180_000) this.cmdRespawn(p, 'town');
        continue;
      }
      // can yenilenme (savaş dışı)
      if (now - p.lastDamageAt > COMBAT_LOCK_MS && p.hp < p.stats.maxHp && this.tickNo % 10 === 0) {
        p.hp = Math.min(p.stats.maxHp, p.hp + Math.ceil(p.stats.maxHp * 0.03)); p.dirty |= Upd.HP;
      }
      if ((p.char.misc.autoPool ?? 0) > 0 && p.hp <= p.stats.maxHp * 0.5 && now - p.lastAutoPotionAt >= 2000) {
        // Nesne Market oto iksiri: depodan maks. canın %20'si (normal iksirleri tüketmez)
        const heal = Math.min(p.char.misc.autoPool!, Math.ceil(p.stats.maxHp * 0.2), p.stats.maxHp - p.hp);
        p.hp += heal; p.char.misc.autoPool! -= heal; p.lastAutoPotionAt = now; p.dirty |= Upd.HP;
        p.zone.emit(p.x, p.y, { e: Ev.HEAL, tgt: p.id, amount: heal });
        if (this.tickNo % 20 === 0) p.selfDirty |= 1;
      } else if (p.char.misc.autoPotion && p.hp <= p.stats.maxHp * 0.5 && now - p.lastAutoPotionAt >= 2000) this.usePotion(p, true);
      if (this.tickNo % 40 === (p.sid % 40)) this.expireBuffs(p);
      if (p.autoOn && this.tickNo % 20 === (p.sid % 20)) this.autoTick(p, now);
      if (p.shieldUntil && now > p.shieldUntil) { p.shieldUntil = 0; p.shieldPct = 0; p.dirty |= Upd.FLAGS; }
      if (p.sbuff && now >= p.sbuff.until) { p.sbuff = null; p.recompute(true); p.selfDirty |= 4; }
      const flags = this.playerFlags(p);
      if (flags !== p.flags) { p.flags = flags; p.dirty |= Upd.FLAGS; }
    }
    // 2) canavarlar
    z.computeAwake();
    const list = z.monsterList;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.state === MState.DEAD) {
        if (now >= m.removeAt) { z.removeMonster(m); if (!m.sp.once) { z.respawnQueue.push({ at: now + this.respawnDelay(m.def), sp: m.sp }); if (m.def.boss) this.broadcastBosses(); } }
        continue;
      }
      if (!z.awakeCells[m.cell] && m.state === MState.IDLE) continue;
      this.updateMonster(z, m);
    }
    // 3) yeniden doğuş
    if (z.respawnQueue.length) {
      for (let i = z.respawnQueue.length - 1; i >= 0; i--) {
        const r = z.respawnQueue[i];
        if (now < r.at) continue;
        if (r.sp.monster === WORLD_BOSS_ID && !TUNING.worldBoss.enabled) { r.at = now + 60_000; continue; } // kapalıyken bekler
        z.respawnQueue.splice(i, 1);
        const def = MONSTERS.find((d) => d.id === r.sp.monster)!;
        z.addMonster(new Monster(def, r.sp));
        if (def.boss) this.bossSpawned(z, def, r.sp);
      }
    }
    if (z.id === TOWER_MAP && this.tickNo % 2 === 0) this.tickTower(z);
    // 4) ganimet süresi ve otomatik toplama
    if (z.lootById.size) {
      for (const l of z.lootById.values()) {
        if (now - l.createdAt > LOOT_TTL_MS) { z.removeLoot(l); continue; }
        if (now - l.createdAt > LOOT_OWNER_ONLY_MS && this.tickNo % 4 === 0) {
          for (const p of z.playerSet) {
            if (p.char.id !== l.ownerChar || p.dead) continue;
            if (dist(p, l) <= LOOT_PICKUP_RANGE) this.takeLoot(p, l, true);
          }
        }
      }
    }
  }

  playerFlags(p: Player) {
    let f = 0;
    if (p.dead) f |= EFlag.DEAD;
    if (p.zone.def.pvp) f |= EFlag.PVP;
    if (this.now < p.stunUntil) f |= EFlag.STUNNED;
    if (this.now < p.rootUntil) f |= EFlag.ROOTED;
    if (p.shieldUntil > this.now) f |= EFlag.SHIELD;
    if (p.char.role === 'gm' || p.char.role === 'admin' || p.char.role === 'owner') f |= EFlag.GM;
    if (p.fishing && this.now - p.fishing.biteAt < 125_000) f |= EFlag.FISHING; // herkes oltayı ve şamandırayı görür
    if (p.char.misc.mount?.owned && p.char.misc.mount.riding) f |= EFlag.MOUNTED; // herkes bineği görür
    return f;
  }

  // ───────────────────────────── canavar yapay zekâsı ─────────────────────────────
  private updateMonster(z: Zone, m: Monster) {
    const now = this.now;
    const def = m.def;
    if (m.anim !== Anim.IDLE && m.anim !== Anim.WALK && now >= m.animUntil) { m.anim = Anim.IDLE; m.dirty |= Upd.ANIM; }
    // agresif varyant / boss: yakındaki oyuncuyu fark et
    if (!m.target && m.state === MState.IDLE && (m.variant > 0 || def.boss)) {
      let best: Player | null = null, bd = def.aggroRadius;
      z.players.radius(m.x, m.y, def.aggroRadius, (p) => { if (!p.dead) { const d = dist(p, m); if (d < bd) { bd = d; best = p; } } });
      if (best) { m.target = best; m.threat.set(best, 1); m.state = MState.CHASE; }
    }
    if (m.state === MState.CHASE) {
      // hedef geçerli mi? en yüksek tehdit
      let t = m.target;
      if (!t || t.dead || t.zone !== z || !z.playerSet.has(t)) {
        m.threat.delete(t!);
        t = null; let top = 0;
        for (const [p, v] of m.threat) { if (p.dead || p.zone !== z || !z.playerSet.has(p)) { m.threat.delete(p); continue; } if (v > top) { top = v; t = p; } }
        m.target = t;
      }
      const fromSpawn = Math.hypot(m.x - m.sp.x, m.y - m.sp.y);
      if (!t || fromSpawn > def.leash) { m.state = MState.RETURN; m.target = null; m.threat.clear(); }
      else {
        const d = dist(m, t);
        const reach = def.range + 16;
        if (d > reach) {
          if (now >= m.rootUntil && now >= m.stunUntil && def.speed > 0) this.navTo(z, m, t.x + Math.cos(m.id) * 18, t.y + Math.sin(m.id) * 12, def.speed);
        } else if (now >= m.nextAttackAt && now >= m.stunUntil) {
          m.nextAttackAt = now + def.attackMs;
          m.dir = angleByte(t.x - m.x, t.y - m.y);
          m.anim = Anim.ATTACK; m.animUntil = now + 450; m.dirty |= Upd.ANIM;
          if (def.range > 150) z.emit(m.x, m.y, { e: Ev.CAST, src: m.id, skill: 9, tgt: t.id, x: t.x | 0, y: t.y | 0 });
          this.monsterHitPlayer(m, t, 1);
        }
        if (def.boss) this.bossPatterns(z, m, t);
      }
    }
    if (m.state === MState.RETURN) {
      const d = Math.hypot(m.x - m.sp.x, m.y - m.sp.y);
      if (d < 24) {
        m.state = MState.IDLE; m.hp = m.maxHp; m.dirty |= Upd.HP; m.telegraphs.length = 0;
        if (m.anim !== Anim.IDLE) { m.anim = Anim.IDLE; m.dirty |= Upd.ANIM; }
      } else {
        const mm = m as Monster & { retStuck?: number };
        const sp = Math.max(def.speed, 160) * 1.5;
        if ((mm.retStuck ?? 0) > 50 || !this.navTo(z, m, m.sp.x, m.sp.y, sp)) { mm.retStuck = (mm.retStuck ?? 0) + 1; if (mm.retStuck > 50) this.stepMonster(z, m, m.sp.x, m.sp.y, sp, true); }
        else mm.retStuck = 0;
      }
    }
    if (m.state === MState.IDLE) {
      // savaş dışı can yenilenme ve küçük gezinti
      if (m.hp < m.maxHp && now - m.lastHitAt > 5000 && this.tickNo % 10 === 0) { m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * 0.1)); m.dirty |= Upd.HP; }
      if (def.speed > 0 && now >= m.wanderAt) {
        if (m.wx === 0) { m.wx = m.sp.x + (rnd() - 0.5) * 220; m.wy = m.sp.y + (rnd() - 0.5) * 220; if (!freeAt(z.layout, m.wx, m.wy) || !los(z.layout, m.x, m.y, m.wx, m.wy)) { m.wx = 0; m.wanderAt = now + 2000 + rnd() * 4000; } }
        const d = Math.hypot(m.wx - m.x, m.wy - m.y);
        if (m.wx === 0) { /* uygun nokta yok: sonra yine dener */ } else if (d < 10 || !this.stepMonster(z, m, m.wx, m.wy, def.speed * 0.45)) { m.wx = 0; m.wanderAt = now + 4000 + rnd() * 9000; if (m.anim === Anim.WALK) { m.anim = Anim.IDLE; m.dirty |= Upd.ANIM; } }
      }
    }
    // bekleyen tehlike alanları
    if (m.telegraphs.length) this.resolveTelegraphs(z, m);
  }

  /**
   * Canavar adımı: engel (ağaç, kaya, ev) önündeyse etrafından dolanır. Yan açıları sırayla dener; bir kez seçtiği
   * yönü (sağ/sol) kısa süre korur, böylece iki yön arasında gidip gelip titremez. Bakış yönü gerçek hareket yönüdür.
   */
  /**
   * Canavarı hedefe götürür: arada engel yoksa düz gider; ağaç kümesi, göl, ev arkasındaysa A* ile etrafından dolanan
   * yolu bulur ve önündeki açık noktaya kestirir (yol 3 sn'de bir ya da hedef karosu değişince yenilenir).
   */
  private navTo(z: Zone, m: Monster, tx: number, ty: number, speed: number): boolean {
    const l = z.layout;
    const mm = m as Monster & { path?: { x: number; y: number }[]; pathI?: number; pathGoal?: number; pathAt?: number; losOk?: boolean };
    // düz yol açık mı: her canavar 4 tikte bir yoklar (yük dağıtılır)
    if (mm.losOk === undefined || (this.tickNo + m.id) % 4 === 0) mm.losOk = los(l, m.x, m.y, tx, ty);
    if (mm.losOk) { mm.path = undefined; return this.stepMonster(z, m, tx, ty, speed); }
    const gk = Math.floor(tx / 64) + Math.floor(ty / 64) * 4096;
    if (!mm.path || mm.pathGoal !== gk || this.now - (mm.pathAt ?? 0) > 3000) {
      if (this.pathBudget > 0) {
        this.pathBudget--;
        mm.path = findPath(l, m.x, m.y, tx, ty) ?? []; mm.pathI = 0; mm.pathGoal = gk; mm.pathAt = this.now;
      } else if (!mm.path) return this.stepMonster(z, m, tx, ty, speed);
    }
    const path = mm.path!;
    if (!path.length) return this.stepMonster(z, m, tx, ty, speed); // ulaşılmaz: eski davranış
    let i = mm.pathI ?? 0;
    // ip çekme: bir sonraki noktaya düz yol açıksa ara noktayı atla (köşe köşe değil, doğal kavisle gider)
    if (i < path.length - 1 && (this.tickNo + m.id) % 2 === 0 && los(l, m.x, m.y, path[i + 1].x, path[i + 1].y)) i++;
    if (Math.hypot(path[i].x - m.x, path[i].y - m.y) < 14 && i < path.length - 1) i++;
    mm.pathI = i;
    return this.stepMonster(z, m, path[i].x, path[i].y, speed);
  }

  private stepMonster(z: Zone, m: Monster, tx: number, ty: number, speed: number, ghost = false): boolean {
    const dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return false;
    const step = Math.min(d, speed * (TICK_MS / 1000));
    let mx = 0, my = 0, moved = false;
    if (ghost) { mx = (dx / d) * step; my = (dy / d) * step; moved = true; }
    else {
      const l = z.layout;
      const free = (x: number, y: number) => { const tx2 = Math.floor(x / 64), ty2 = Math.floor(y / 64); return tx2 >= 0 && ty2 >= 0 && tx2 < l.w && ty2 < l.h && l.blocked[ty2 * l.w + tx2] === 0; };
      // ileriyi de yokla (gövde yarıçapı kadar): engele burnunu dayayıp titremesin
      const ok = (ang: number) => { const cx = Math.cos(ang), cy = Math.sin(ang); return free(m.x + cx * step, m.y + cy * step) && free(m.x + cx * (step + 22), m.y + cy * (step + 22)); };
      const base = Math.atan2(dy, dx);
      const mm = m as Monster & { avoidSide?: number; avoidUntil?: number };
      let side = mm.avoidSide && this.now < (mm.avoidUntil ?? 0) ? mm.avoidSide : (m.id & 1 ? 1 : -1);
      const offs = [0, 0.45, 0.9, 1.35, 1.8, 2.3];
      for (const o of offs) {
        for (const sgn of o === 0 ? [1] : [side, -side]) {
          const ang = base + o * sgn;
          if (!ok(ang)) continue;
          mx = Math.cos(ang) * step; my = Math.sin(ang) * step; moved = true;
          if (o > 0) { mm.avoidSide = sgn; mm.avoidUntil = this.now + 900; side = sgn; }
          break;
        }
        if (moved) break;
      }
      // ayrışma: yakındaki canavarlardan hafifçe uzaklaş (üst üste yığılıp birbirine takılmasınlar)
      if (moved) {
        let sx = 0, sy = 0;
        z.monsters.radius(m.x, m.y, 44, (o) => {
          if (o === m || o.state === MState.DEAD) return;
          const ddx = m.x - o.x, ddy = m.y - o.y, dd = Math.hypot(ddx, ddy) || 1, k = (44 - dd) / 44;
          if (k > 0) { sx += (dd < 1 ? Math.cos(m.id) : ddx / dd) * k; sy += (dd < 1 ? Math.sin(m.id) : ddy / dd) * k; }
        });
        if (sx || sy) {
          const nx = mx + sx * step * 0.55, ny = my + sy * step * 0.55;
          if (free(m.x + nx, m.y + ny)) { mx = nx; my = ny; }
        }
      }
    }
    if (moved) {
      m.x += mx; m.y += my;
      z.monsters.move(m);
      m.dirty |= Upd.POS;
      const nd = angleByte(mx, my);
      if (nd !== m.dir || m.anim !== Anim.WALK) { m.dir = nd; if (this.now >= m.animUntil) m.anim = Anim.WALK; m.dirty |= Upd.ANIM; }
    }
    return moved;
  }

  private bossPatterns(z: Zone, m: Monster, t: Player) {
    if (this.now < m.nextPatternAt) return;
    const wb = m.def.id === WORLD_BOSS_ID;
    m.nextPatternAt = this.now + (wb ? TUNING.worldBoss.patternSec * 1000 : 5500);
    const pick = (this.tickNo + m.id) % 3;
    const warn = 1300;
    let tg: Telegraph;
    // Kor Kulesi'nde Karademir'in yer çatlağı gücü yönetimden (varsayılan 2,2 = diğer bosslarla aynı)
    const k = m.sp.forge !== undefined ? TUNING.forge.boss.slamMul / 2.2 : wb ? TUNING.worldBoss.slamMul / 2.2 : 1;
    if (pick === 0) tg = { at: this.now + warn, shape: 'circle', x: t.x, y: t.y, r: 190, dmgMult: 2.2 * k };
    else if (pick === 1) tg = { at: this.now + warn, shape: 'ring', x: m.x, y: m.y, r: 340, r2: 170, dmgMult: 2 * k };
    else { const a = Math.atan2(t.y - m.y, t.x - m.x); tg = { at: this.now + warn, shape: 'line', x: m.x, y: m.y, r: 70, a, len: 620, dmgMult: 2.6 * k }; }
    m.telegraphs.push(tg);
    const fx = tg.shape === 'circle' ? Fx.TELEGRAPH_CIRCLE : tg.shape === 'ring' ? Fx.TELEGRAPH_RING : Fx.TELEGRAPH_LINE;
    const aParam = tg.shape === 'line' ? Math.round(((tg.a! + Math.PI * 2) % (Math.PI * 2)) * 1000) : tg.shape === 'ring' ? tg.r2! : 0;
    z.emit(tg.x, tg.y, { e: Ev.FX, fx, x: tg.x | 0, y: tg.y | 0, r: tg.shape === 'line' ? tg.len! : tg.r, ms: warn, a: aParam });
  }

  private resolveTelegraphs(z: Zone, m: Monster) {
    for (let i = m.telegraphs.length - 1; i >= 0; i--) {
      const tg = m.telegraphs[i];
      if (this.now < tg.at) continue;
      m.telegraphs.splice(i, 1);
      const R = tg.shape === 'line' ? tg.len! : tg.r;
      z.players.radius(tg.x, tg.y, R + 40, (p) => {
        if (p.dead) return;
        const dx = p.x - tg.x, dy = p.y - tg.y;
        const d = Math.hypot(dx, dy);
        let hit = false;
        if (tg.shape === 'circle') hit = d <= tg.r;
        else if (tg.shape === 'ring') hit = d <= tg.r && d >= tg.r2!;
        else { const ca = Math.cos(tg.a!), sa = Math.sin(tg.a!); const along = dx * ca + dy * sa; const perp = Math.abs(-dx * sa + dy * ca); hit = along >= 0 && along <= tg.len! && perp <= tg.r; }
        if (hit) this.monsterHitPlayer(m, p, tg.dmgMult);
      });
    }
  }

  private monsterHitPlayer(m: Monster, p: Player, mult: number) {
    if (p.dead || m.state === MState.DEAD) return;
    const now = this.now;
    p.lastDamageAt = now; p.combatUntil = now + COMBAT_LOCK_MS;
    if (rnd() * 100 < p.stats.block) { p.zone.emit(p.x, p.y, { e: Ev.DAMAGE, src: m.id, tgt: p.id, amount: 0, flags: DmgFlag.BLOCK }); return; }
    let { dmg } = rollDamage(m.atk, mult, p.stats.def, 3, 40, rnd);
    // Kılıç / Büyü Savunması efsunu: canavarın saldırı türüne göre
    dmg = Math.max(1, Math.round(dmg * enchantDefenseMult(p.stats.enchants, monsterAttackKind(m.def.range))));
    if (p.shieldUntil > now) dmg = Math.round(dmg * (1 - p.shieldPct / 100));
    p.hp -= dmg; p.dirty |= Upd.HP;
    p.zone.emit(p.x, p.y, { e: Ev.DAMAGE, src: m.id, tgt: p.id, amount: dmg, flags: 0 });
    if (p.hp <= 0) this.killPlayer(p, null);
  }

  // ───────────────────────────── savaş ─────────────────────────────
  private findTarget(z: Zone, id: number): Monster | Player | null {
    const m = z.monsterById.get(id);
    if (m) return m;
    for (const p of z.playerSet) if (p.id === id) return p;
    return null;
  }

  private canPvp(a: Player, b: Player): boolean {
    if (a === b || a.zone !== b.zone || b.dead) return false;
    if (this.social.sameParty(a, b)) return false; // aynı gruptakiler hiçbir yerde birbirine vuramaz
    if (this.social.dueling(a, b)) return true; // karşılıklı kabul edilmiş düello: her haritada
    if (this.social.inDuel(a) || this.social.inDuel(b)) return false; // düellodakine üçüncü kişi karışamaz
    // arena: kapalıyken vuruşma yok; yeni doğan 4 sn korunur (doğuşta bekleyip kesme olmasın)
    if (a.zone.id === 'arena') return this.arenaActive && (this.arenaProt.get(b.char.id) ?? 0) <= this.now && (this.arenaProt.get(a.char.id) ?? 0) <= this.now;
    // lonca savaşı: yalnız aynı savaştaki karşı loncalar, savaş başlamışken; yeni doğan 4 sn korunur
    if (a.zone.id === 'guildwar') {
      const w = this.warOf(a); if (!w || this.now < w.startAt || this.now > w.endsAt || !b.guild) return false;
      const sa = a.guild!.gid === w.a ? 0 : 1, sb = b.guild.gid === w.a ? 0 : b.guild.gid === w.b ? 1 : -1;
      return sb >= 0 && sa !== sb && (this.arenaProt.get(b.char.id) ?? 0) <= this.now;
    }
    return a.zone.def.pvp;
  }

  private cmdAttack(p: Player, id: number) {
    if (this.now < p.stunUntil) return;
    const sk = classSkill(p.char.cls, 0)!;
    const cd = attackCooldown(sk.cooldownMs, p.stats.atkSpeed);
    // ağ titremesi: biraz erken gelen istek reddedilmez, sıraya alınır ve bekleme bitince vurulur
    // (eskiden reddediliyordu; istemci bir tam bekleme daha bekleyince vuruşlar arasında ~1 sn takılma oluyordu)
    if (this.now + 60 < p.cooldowns[0]) {
      if (p.cooldowns[0] - this.now <= 400) { p.queuedAtk = id; p.queuedAtkUntil = p.cooldowns[0] + 200; }
      return;
    }
    p.queuedAtk = 0;
    const t = this.findTarget(p.zone, id);
    if (!t) return;
    if (t instanceof Monster && t.state === MState.DEAD) return;
    if (t instanceof Player && !this.canPvp(p, t)) return;
    // yakın dövüş: ağ toleransı dar (uzaktan kılıç vurulmaz); menzilliler geniş
    if (dist(p, t) > sk.range + MONSTER_RADIUS + (sk.kind === 'melee' ? MELEE_TOLERANCE : RANGE_TOLERANCE)) return;
    p.cooldowns[0] = this.now + cd;
    this.faceAndAnim(p, t.x, t.y, Anim.ATTACK, 380);
    p.zone.emit(p.x, p.y, { e: Ev.CAST, src: p.id, skill: 0, tgt: t.id, x: t.x | 0, y: t.y | 0 });
    this.hit(p, t, sk.mult * skillDamageMult(p.char.skills[0] ?? 1));
  }

  private faceAndAnim(p: Player, x: number, y: number, anim: Anim, ms: number) {
    p.dir = angleByte(x - p.x, y - p.y); p.anim = anim; p.animUntil = this.now + ms; p.dirty |= Upd.ANIM;
    p.combatUntil = this.now + COMBAT_LOCK_MS;
  }

  /** Zamanlama çubuğu başladı: bekleme ve açılma uygunsa başlangıç anı sunucu saatiyle tutulur (yeşil bölge sunucuda denetlenir). */
  private cmdQteStart(p: Player, s: number) {
    if (s !== 4 || p.dead || this.now < p.stunUntil) return;
    const sk = classSkill(p.char.cls, 4, p.char.spec);
    if (!sk?.qte || p.char.level < sk.unlock || this.now + 60 < p.cooldowns[4]) return;
    p.qteAt = this.now;
  }

  private cmdSkill(p: Player, s: number, id?: number, x?: number, y?: number, qte = false) {
    if (s < 1 || s >= SKILL_SLOTS) return;
    if (p.char.misc.mount?.riding) return this.notice(p, 'Binekteyken yalnız düz saldırı yapabilirsin. Beceri için önce in.');
    if (this.now < p.stunUntil) return;
    const sk = classSkill(p.char.cls, s, p.char.spec);
    if (!sk) return this.notice(p, 'Bu beceri henüz açılmadı.');
    if (p.char.level < sk.unlock) return this.notice(p, `${sk.name} ${sk.unlock}. seviyede açılır.`);
    if (this.now + 60 < p.cooldowns[s]) return;
    const z = p.zone;
    const lvl = p.char.skills[s] ?? 1;
    let mult = sk.mult * skillDamageMult(lvl);
    // Sv. 7 becerisi: çubuk yeşilde durdurulduysa 1,5 kat (süre sunucuda ölçülür; ağ dalgalanması için küçük pay)
    let perfect = false;
    if (sk.qte) {
      const c = p.char, n = c.misc.qn ?? 0;
      if (qte && p.qteAt && this.now - p.qteAt <= QTE_SWEEP_MS + 500) {
        const k = (this.now - p.qteAt) / QTE_SWEEP_MS, [z0, z1] = qteZone(n, c.id);
        perfect = k >= z0 - QTE_TOL && k <= z1 + QTE_TOL;
      }
      p.qteAt = 0; c.misc.qn = n + 1;
      if (perfect) mult *= QTE_MULT;
    }
    const target = id ? this.findTarget(z, id) : null;
    const validTarget = (t: Monster | Player | null): t is Monster | Player =>
      !!t && (t instanceof Monster ? t.state !== MState.DEAD : this.canPvp(p, t));
    const cd = Math.round(sk.cooldownMs * (1 - Math.min(0.4, p.stats.skillSpeed / 100)));
    const use = (tx: number, ty: number, tgtId = 0) => {
      p.cooldowns[s] = this.now + cd;
      this.faceAndAnim(p, tx, ty, Anim.CAST, 480);
      // uzmanlık becerisinde ikinci yol 4 olarak gider (istemci doğru efekti seçsin)
      // Sv. 7 becerisi 5 (mükemmel vuruşta 6) olarak gider
      // Sv. 1 başlangıç becerisi 7 olarak gider
      const castId = s === 5 ? CAST_FIRST : s === 4 ? (perfect ? 6 : 5) : s === 3 && sk.spec && CLASSES[p.char.cls].specs[1]?.id === sk.spec ? 4 : s;
      z.emit(p.x, p.y, { e: Ev.CAST, src: p.id, skill: castId, tgt: tgtId, x: tx | 0, y: ty | 0 });
      this.sendJson(p, { t: 'cd', s, until: p.cooldowns[s] - this.now, ...(sk.qte ? { qn: p.char.misc.qn ?? 0, perfect } : {}) });
      if (sk.buff) this.skillBuff(p, sk, lvl);
    };
    switch (sk.kind) {
      case 'buff': {
        use(p.x, p.y);
        // geliştirme: her kademe +%4 yenileme (önceden kademe can yenilemeyi hiç etkilemiyordu)
        const heal = Math.round(p.stats.maxHp * skillHealPct(sk, lvl) / 100);
        p.hp = Math.min(p.stats.maxHp, p.hp + heal); p.dirty |= Upd.HP;
        p.shieldUntil = this.now + (sk.durationMs ?? 0); p.shieldPct = sk.dmgReducePct ?? 0;
        z.emit(p.x, p.y, { e: Ev.HEAL, tgt: p.id, amount: heal });
        z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.SHIELD, x: p.x | 0, y: p.y | 0, r: 60, ms: sk.durationMs ?? 0, a: p.id & 0xffff });
        return;
      }
      case 'heal': {
        use(p.x, p.y);
        const heal = (q: Player) => { const h = Math.round(q.stats.maxHp * skillHealPct(sk, lvl) / 100); q.hp = Math.min(q.stats.maxHp, q.hp + h); q.dirty |= Upd.HP; z.emit(q.x, q.y, { e: Ev.HEAL, tgt: q.id, amount: h }); };
        heal(p);
        z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.HEAL_WAVE, x: p.x | 0, y: p.y | 0, r: sk.range, ms: 700, a: 0 });
        return;
      }
      case 'aoe': {
        let cx = x ?? p.x, cy = y ?? p.y;
        if (sk.selfCenter) { cx = p.x; cy = p.y; }
        else if (validTarget(target)) { cx = target.x; cy = target.y; }
        if (Math.hypot(cx - p.x, cy - p.y) > sk.range + RANGE_TOLERANCE) {
          // menzil dışı nokta: menzile kırp
          const a = Math.atan2(cy - p.y, cx - p.x); cx = p.x + Math.cos(a) * sk.range; cy = p.y + Math.sin(a) * sk.range;
        }
        use(cx, cy, validTarget(target) ? target.id : 0);
        z.emit(cx, cy, { e: Ev.FX, fx: Fx.AOE_BLAST, x: cx | 0, y: cy | 0, r: sk.radius ?? 150, ms: 600, a: s });
        // Öz Girdabı: alandaki canavarları merkeze çeker (boss hariç)
        if (sk.buff?.k === 'leech') this.vortexPull(z, cx, cy, sk.radius ?? 180);
        this.aoe(p, cx, cy, sk.radius ?? 150, sk.maxTargets ?? 5, mult, sk);
        return;
      }
      default: {
        if (!validTarget(target)) return this.notice(p, 'Önce bir hedef seç.');
        if (dist(p, target) > sk.range + MONSTER_RADIUS + RANGE_TOLERANCE) return this.notice(p, 'Hedef menzil dışında.');
        use(target.x, target.y, target.id);
        if (sk.kind === 'pull' && target instanceof Monster && target.def.boss) this.notice(p, 'Bosslar zincirle çekilemez; yine de hasar aldı.');
        if (sk.kind === 'pull' && target instanceof Monster && !target.def.boss) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          const np = nearestFree(z.layout, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
          target.x = np.x; target.y = np.y; z.monsters.move(target); target.dirty |= Upd.POS;
          target.stunUntil = this.now + 600;
        }
        // oyuncu (PvP izni olan yerde: düello, arena, açık PvP bölgesi): zincirle önüne çekilir, kısa sersemler
        if (sk.kind === 'pull' && target instanceof Player && target !== p) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          const np = nearestFree(z.layout, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
          target.x = np.x; target.y = np.y; z.players.move(target); target.dirty |= Upd.POS;
          target.inputs.length = 0; target.stunUntil = Math.max(target.stunUntil, this.now + 600);
        }
        if (sk.kind === 'dash') {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          const np = nearestFree(z.layout, target.x - Math.cos(a) * 60, target.y - Math.sin(a) * 60);
          p.x = np.x; p.y = np.y; z.players.move(p); p.dirty |= Upd.POS;
          z.emit(target.x, target.y, { e: Ev.FX, fx: Fx.AOE_BLAST, x: target.x | 0, y: target.y | 0, r: sk.radius ?? 150, ms: 500, a: s });
          this.aoe(p, target.x, target.y, sk.radius ?? 150, sk.maxTargets ?? 6, mult, sk);
          return;
        }
        if (sk.kind === 'root' && sk.radius) {
          this.aoe(p, target.x, target.y, sk.radius, sk.maxTargets ?? 4, mult, sk);
          return;
        }
        // Öz Zinciri: ana hedef + en yakın n düşmana sıçrar (her sıçrayış istemciye ayrı olay: görüntü vurulanla aynı)
        if (sk.chain) { this.chainHit(p, target, mult, sk); return; }
        this.splash(p, target, mult, sk); // tek hedefli saldırı becerileri çevredekilere de vurur
        // Geri Sıçrayış: atıştan sonra hedefin tersine sıçrar (duvara/suya değil, en yakın boş yere)
        if (sk.leapBack) {
          const a = Math.atan2(p.y - target.y, p.x - target.x);
          const np = nearestFree(z.layout, p.x + Math.cos(a) * sk.leapBack, p.y + Math.sin(a) * sk.leapBack);
          p.x = np.x; p.y = np.y; p.inputs.length = 0; z.players.move(p); p.dirty |= Upd.POS;
        }
      }
    }
  }

  /** Sv. 7 becerisinin 3 sn'lik sınıf güçlendirmesi (değer beceri seviyesiyle artar) */
  private skillBuff(p: Player, sk: SkillDef, lvl: number) {
    const b = skillBuffVal(sk, lvl); if (!b) return;
    if (b.k === 'iron') {
      // Demir Deri: kalkan alanları (Çelik İrade ile aynı yol; hangisi güçlüyse o)
      p.shieldPct = Math.max(p.shieldUntil > this.now ? p.shieldPct : 0, b.v); p.shieldUntil = Math.max(p.shieldUntil, this.now + b.ms);
      p.dirty |= Upd.FLAGS;
    } else {
      p.sbuff = { k: b.k, until: this.now + b.ms, v: b.v, v2: b.v2 };
      p.recompute(true); p.selfDirty |= 4;
    }
  }
  private vortexPull(z: Zone, cx: number, cy: number, r: number) {
    z.monsters.radius(cx, cy, r + MONSTER_RADIUS, (m) => {
      if (m.state === MState.DEAD || m.def.boss) return;
      const d = Math.hypot(m.x - cx, m.y - cy); if (d < 30) return;
      const k = Math.min(d - 24, 70) / d;
      const np = nearestFree(z.layout, m.x + (cx - m.x) * k, m.y + (cy - m.y) * k);
      m.x = np.x; m.y = np.y; z.monsters.move(m); m.dirty |= Upd.POS; m.stunUntil = Math.max(m.stunUntil, this.now + 350);
    });
  }

  /** Zincir: ana hedef tam, ardından her sıçrayışta bir öncekine en yakın, henüz vurulmamış düşman (zincir çarpanıyla). */
  private chainHit(p: Player, main: Monster | Player, mult: number, sk: SkillDef) {
    const ch = sk.chain!; const z = p.zone;
    this.hit(p, main, mult, sk);
    const hitSet = new Set<Monster | Player>([main]);
    let from: Monster | Player = main;
    for (let i = 0; i < ch.n; i++) {
      const pick: { t: Monster | Player | null; d: number } = { t: null, d: Infinity };
      const fx = from.x, fy = from.y;
      z.monsters.radius(fx, fy, ch.r + MONSTER_RADIUS, (m) => { if (m.state === MState.DEAD || hitSet.has(m)) return; const d = Math.hypot(m.x - fx, m.y - fy); if (d < pick.d) { pick.d = d; pick.t = m; } });
      if (this.pvpHere(p)) z.players.radius(fx, fy, ch.r + PLAYER_HIT_R, (q) => { if (hitSet.has(q) || !this.canPvp(p, q)) return; const d = Math.hypot(q.x - fx, q.y - fy); if (d < pick.d) { pick.d = d; pick.t = q; } });
      const nxt = pick.t;
      if (!nxt) break;
      z.emit(fx, fy, { e: Ev.CAST, src: p.id, skill: CAST_CHAIN_HOP, tgt: nxt.id, x: fx | 0, y: fy | 0 });
      hitSet.add(nxt);
      this.hit(p, nxt, mult * ch.mul, sk);
      from = nxt;
    }
  }

  /** Tek hedefli saldırı becerisi: ana hedefe tam vuruş, çevresindeki en çok 4 düşmana sıçrayan hasar (yönetimden ayarlı). */
  private splash(p: Player, main: Monster | Player, mult: number, sk: SkillDef) {
    this.hit(p, main, mult, sk);
    const r = TUNING.splashRadius, k = TUNING.splashMul;
    if (r <= 0 || k <= 0) return;
    // ccMain: sersemletme/sabitleme yalnız ana hedefe; çevreye yalnız hasar sıçrar
    if (sk.ccMain && (sk.stunMs || sk.rootMs)) sk = { ...sk, stunMs: undefined, rootMs: undefined };
    const z = p.zone, cx = main.x, cy = main.y, sm = mult * k;
    let n = 0;
    const pl = () => { if (this.pvpHere(p) && n < 4) z.players.radius(cx, cy, r + PLAYER_HIT_R, (q) => { if (n < 4 && q !== main && this.canPvp(p, q)) { n++; this.hit(p, q, sm, sk); } }); };
    if (this.social.inDuel(p)) pl(); // düelloda rakip, çevredeki canavarlardan önce sayılır
    z.monsters.radius(cx, cy, r + MONSTER_RADIUS, (m) => { if (n < 4 && m !== main && m.state !== MState.DEAD) { n++; this.hit(p, m, sm, sk); } });
    if (!this.social.inDuel(p)) pl();
  }

  /** Bu oyuncunun alan vuruşları oyunculara da işler mi: PvP haritası ya da süren bir düello (her haritada). */
  private pvpHere(p: Player) { return p.zone.def.pvp || this.social.inDuel(p); }

  private aoe(p: Player, x: number, y: number, r: number, max: number, mult: number, sk: SkillDef) {
    let n = 0;
    const z = p.zone, duel = this.social.inDuel(p);
    const pl = () => { if (this.pvpHere(p) && n < max) z.players.radius(x, y, r + PLAYER_HIT_R, (q) => { if (n < max && this.canPvp(p, q)) { n++; this.hit(p, q, mult, sk); } }); };
    if (duel) pl(); // düelloda rakip, çevredeki canavarlardan önce sayılır
    z.monsters.radius(x, y, r + MONSTER_RADIUS, (m) => { if (n < max && m.state !== MState.DEAD) { n++; this.hit(p, m, mult, sk); } });
    if (!duel) pl();
  }

  private hit(p: Player, t: Monster | Player, mult: number, sk?: SkillDef) {
    const z = p.zone;
    const st = p.stats;
    if (t instanceof Monster) {
      let atk = st.atk;
      // Ateş, Buz, Donmuş Çam Gücü (ve eski Orman Gücü) efsunları
      atk *= enchantAttackMult(st.enchants, z.def.theme) * (1 + st.pvePower / 100);
      const { dmg, crit } = rollDamage(atk, mult, t.armor, st.crit, st.critDmg, rnd);
      const real = Math.min(dmg, t.hp);
      t.hp -= dmg; t.dirty |= Upd.HP; t.lastHitAt = this.now;
      t.threat.set(p, (t.threat.get(p) ?? 0) + real);
      if (t.state === MState.IDLE || !t.target) { t.state = MState.CHASE; t.target = t.target ?? p; }
      if (sk?.stunMs) t.stunUntil = this.now + sk.stunMs;
      if (sk?.rootMs) t.rootUntil = this.now + sk.rootMs;
      z.emit(t.x, t.y, { e: Ev.DAMAGE, src: p.id, tgt: t.id, amount: dmg, flags: crit ? DmgFlag.CRIT : 0 });
      if (st.lifesteal > 0) { const h = Math.round(real * st.lifesteal / 100); if (h > 0) { p.hp = Math.min(st.maxHp, p.hp + h); p.dirty |= Upd.HP; } }
      if (t.hp <= 0) this.killMonster(t, p);
    } else {
      // PvP
      if (rnd() * 100 < t.stats.block) { z.emit(t.x, t.y, { e: Ev.DAMAGE, src: p.id, tgt: t.id, amount: 0, flags: DmgFlag.BLOCK }); return; }
      const atk = st.atk * (1 + st.pvpPower / 100) * enchantAttackMult(st.enchants, null);
      let { dmg, crit } = rollDamage(atk, mult * 0.6, t.stats.def, st.crit, st.critDmg, rnd);
      dmg = Math.max(1, Math.round(dmg * (1 - Math.min(60, t.stats.pvpResist) / 100) * enchantDefenseMult(t.stats.enchants, classAttackKind(p.char.cls))));
      if (t.shieldUntil > this.now) dmg = Math.round(dmg * (1 - t.shieldPct / 100));
      t.hp -= dmg; t.dirty |= Upd.HP; t.lastDamageAt = this.now; t.combatUntil = this.now + COMBAT_LOCK_MS;
      if (sk?.stunMs) t.stunUntil = this.now + Math.round(sk.stunMs * 0.6);
      if (sk?.rootMs) t.rootUntil = this.now + Math.round(sk.rootMs * 0.6);
      z.emit(t.x, t.y, { e: Ev.DAMAGE, src: p.id, tgt: t.id, amount: dmg, flags: crit ? DmgFlag.CRIT : 0 });
      if (st.lifesteal > 0) { const h = Math.round(Math.min(dmg, Math.max(0, t.hp + dmg)) * st.lifesteal / 100); if (h > 0) { p.hp = Math.min(st.maxHp, p.hp + h); p.dirty |= Upd.HP; } }
      if (t.hp <= 0) this.killPlayer(t, p);
    }
  }

  private killMonster(m: Monster, killer: Player) {
    if (m.killed) return; // ölüm makbuzu: ödül tek kez
    m.killed = true;
    const z = m.zone;
    m.hp = 0; m.state = MState.DEAD; m.anim = Anim.DEAD; m.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS;
    m.deadAt = this.now; m.removeAt = this.now + 1600; m.telegraphs.length = 0;
    z.emit(m.x, m.y, { e: Ev.DEATH, id: m.id, killer: killer.id });
    if (m.sp.forge !== undefined) this.forge.monsterDied(m);
    // ödül: boss'ta yeterince hasar veren HERKES kendi ganimetini alır (bossun canının en az bossShareMin %'si);
    // duyuruda en çok hasar veren anılır. Normal canavarda öldüren.
    let owner = killer;
    if (m.def.boss) {
      let top = 0; for (const [p, v] of m.threat) if (v > top && z.playerSet.has(p)) { top = v; owner = p; }
      const min = m.maxHp * (TUNING.bossShareMin ?? 3) / 100;
      const got = new Set<Player>();
      for (const [p, v] of m.threat) if (z.playerSet.has(p) && !p.dead && (v >= min || p === owner)) got.add(p);
      if (!got.size) got.add(killer);
      m.threat.clear(); m.target = null;
      for (const p of got) { this.rewardKill(p, m); if (p !== owner) this.notice(p, `${m.def.name} düştü: katkın için ganimet kazandın!`, 'ok'); }
      if (m.sp.forge === undefined) this.bossDied(m, owner);
      return;
    }
    m.threat.clear(); m.target = null;
    this.rewardKill(owner, m);
  }

  private rewardKill(p: Player, m: Monster) {
    const c = p.char;
    const lvl0 = c.level; // öldürme anındaki seviye (TP ile seviye atlamadan önce): bölge sınırı buna göre
    const lvMod = (lv: number) => { const df = lv - m.level; return df > 5 ? Math.max(0.1, 1 - (df - 5) * 0.12) : df < -3 ? 1.2 : 1; };
    // ganimet (ekipman, malzeme, öz) seviye farkıyla gizlice azalmaz: yönetimde yazan şans geçerli. Çok yüksek seviyeli
    // oyuncu için tek kural bölgenin "seviye sınırı" (yönetimde görünür). Seviye farkı yalnız TP'yi etkiler.
    const mod = 1;
    const bf = charBuffs(c.misc.buffs, this.now);
    // TP: grupta, canavarın çevresindeki (geniş menzil) grup üyeleri paylaşır; her üyenin kendi seviye ve buff çarpanıyla
    for (const [q, xp] of this.social.shareXp(p, m.x, m.y, (q) => m.xp * lvMod(q.char.level) * TUNING.xpMul * this.evNow.xp * (1 + charBuffs(q.char.misc.buffs, this.now).xpPct / 100))) {
      this.addXp(q, xp);
      if (m.sp.floor && q.zone.id === TOWER_MAP) this.towerKill(q, m);
      this.questKill(q, m);
    }
    // Azrail: hasar veren herkese kesin Azrail Sandığı (boss ganimeti her katkı verene ayrı çağrılır)
    if (m.def.id === 'azrail') {
      c.materials.azrail_chest = (c.materials.azrail_chest ?? 0) + 1;
      this.sendJson(p, { t: 'loot', name: '1× Azrail Sandığı', rarity: 'crimson' });
      p.selfDirty |= 2;
    }
    c.kills++;
    const mq = c.misc.mount?.quest; if (mq && !c.misc.mount?.owned && mq.kills < MOUNT.kills) { mq.kills++; if (mq.kills === MOUNT.kills) this.notice(p, `Seyis görevi: ${MOUNT.kills} canavar tamam! Seyis Arda'ya dön.`, 'ok'); }
    const day = trDayKey(this.now);
    if (!c.misc.dailyKills || c.misc.dailyKills.day !== day) c.misc.dailyKills = { day, n: 0 };
    c.misc.dailyKills.n++;
    // canavar sıralaması (dönemlik yarış): dönem değişince önceki dönemin sayısı prev'e geçer (ödül hesabı için)
    const rk = trPeriod(this.now, TUNING.killRank.period).key;
    const rkc = c.misc.rankKills;
    if (!rkc || rkc.k !== rk) c.misc.rankKills = { k: rk, n: 0, ...(rkc ? { prev: { k: rkc.k, n: rkc.n } } : {}) };
    c.misc.rankKills!.n++;
    if (!STAFF_ROLES.has(c.role)) this.opt.post({ type: 'rank_kill', charId: c.id, name: c.name, cls: c.cls, level: c.level, k: rk, n: c.misc.rankKills!.n }); // sıralama anında güncellensin
    // evrim sayacı: kuşanılmış silah ve zırh (çok düşük seviyeli canavar sayılmaz: yönetimde "seviye farkı")
    const gap = TUNING.evo.maxGap;
    if (!gap || m.level >= lvl0 - gap) {
      for (const it of [c.equip.weapon, c.equip.armor]) if (it && (it.evo ?? 0) < EVO_TIERS) it.kills = (it.kills ?? 0) + 1;
    }
    if (m.sp.forge !== undefined) { this.forgeLoot(p, m); p.selfDirty |= 1 | 2; p.markSave(); return; }
    // ganimet tablosu: harita profili → bölge ayarı → canavar türü ayarı (istemcideki "?" penceresiyle aynı hesap)
    const prof = resolveLoot(TUNING, p.zone.id, p.zone.def.theme, m.def.id, (id) => MATERIAL.has(id), m.sp.floor);
    // bölge seviye sınırı: haritanın üst sınırını aşan oyuncuya eşya/malzeme düşmesi çok azalır
    const over = overLevelMul(prof, lvl0);
    const vm = VARIANT_LOOT_MULT[m.variant] * (m.def.boss ? 20 : 1) * mod;
    // canavarlardan mücevher düşmez (mücevher yalnız satış, görev ve ödüllerden kazanılır)
    const gems = 0;
    // Öz de bölge seviye sınırına tabi (sınırı aşan oyuncu ganimetin yalnız overMul kadarını alır)
    const ess = Math.round(randInt(prof.essence[0], prof.essence[1]) * vm * over * TUNING.essenceMul * this.evNow.essence * (1 + bf.essPct / 100));
    // lonca öz vergisi: kazancın vergi oranı kadarı lonca hazinesine (ana sürece toplu bildirilir)
    let ess2 = ess;
    if (p.guild && p.guild.tax > 0 && ess > 0) {
      // küçük kazançlarda (1–3 Öz) kesir birikir: vergi aşağı yuvarlanıp hep 0 olmasın
      p.taxFrac += ess * p.guild.tax / 100;
      const tax = Math.min(ess, Math.floor(p.taxFrac));
      if (tax > 0) { p.taxFrac -= tax; ess2 -= tax; const k = `${p.guild.gid}:${c.id}`; this.guildTax.set(k, (this.guildTax.get(k) ?? 0) + tax); }
    }
    c.gems += gems; c.essence += ess2;
    this.sendJson(p, { t: 'gain', gems, essence: ess2, x: m.x | 0, y: m.y | 0 });
    // ekipman
    const drops = m.def.boss ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      // gerçek zar: %2 ise ortalama 50 öldürmede 1, ama 3. öldürmede de 200.de de düşebilir
      const pe = prof.equipChance * VARIANT_LOOT_MULT[m.variant] * over * TUNING.dropMul * this.evNow.drop * (1 + bf.dropPct / 100);
      if ((m.def.boss && over === 1) || rnd() < pe) {
        const item = this.rollEquipment(p, prof.rarityWeights, m.variant === 2);
        if (item) this.dropLoot(p, m, { kind: 'item', item });
      }
    }
    // Ustalık Mührü canavardan hiç düşmez (yalnız market, görev ve üretimle); yönetim ganimetine eklense bile atlanır
    for (const mat of prof.materials) {
      if (NO_MONSTER_DROP.has(mat.id)) continue;
      if (rnd() < mat.chance * VARIANT_LOOT_MULT[m.variant] * mod * over * TUNING.dropMul * this.evNow.drop) this.dropLoot(p, m, { kind: 'mat', key: mat.id, qty: randInt(mat.qty[0], mat.qty[1]) });
    }
    // yönetim: bölge ve canavar özel düşenleri
    for (const d of prof.drops) {
      if (NO_MONSTER_DROP.has(d.key)) continue;
      if (rnd() >= d.chance * over * this.evNow.drop) continue;
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) continue;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = randInt(d.qty[0], d.qty[1]); k > 0; k--) this.dropLoot(p, m, { kind: 'item', item: makeItem(d.key, r, 'drop') });
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) this.dropLoot(p, m, { kind: 'mat', key: d.key, qty: randInt(d.qty[0], d.qty[1]) });
    }
    // Kristal Sandık etkinliği: her canavar öldürmede yönetimin verdiği şansla sandık düşer (bölge seviye sınırına tabi)
    if (this.evNow.chest > 0 && rnd() < this.evNow.chest * over) this.dropLoot(p, m, { kind: 'mat', key: 'crystal_chest', qty: 1 });
    p.selfDirty |= 1; p.markSave();
  }

  rollEquipment(p: Player, weights: Partial<Record<Rarity, number>>, shift: boolean): ItemInstance | null {
    // yönetim: bütün canavarlarda nadirlik düşme çarpanı
    const entries = (Object.entries(weights) as [Rarity, number][]).map(([k, w]) => [k, w * (TUNING.rarityDrop[k] ?? 1)] as [Rarity, number]).filter(([k, w]) => w > 0 && RARITIES.includes(k));
    if (!entries.length) return null;
    let tot = 0; for (const [, w] of entries) tot += w;
    let r = rnd() * tot; let rarity: Rarity = entries[0][0];
    for (const [k, w] of entries) { if ((r -= w) <= 0) { rarity = k; break; } }
    if (shift && rnd() < 0.35) { const i = RARITIES.indexOf(rarity); rarity = RARITIES[Math.min(i + 1, 3)]; }
    // her sınıfa her sınıfın eşyası eşit şansla düşebilir (avcıya muhafız zırhı vb.); kendi eşyasını bulmak kolay olmasın
    // kolye, küpe ve bilezik canavardan düşmez (üretimle Kızıl seviyede gelir)
    const pool = ITEM_TEMPLATES.filter((t) => t.slot !== 'necklace' && t.slot !== 'earring' && t.slot !== 'bracelet');
    const tpl = pool[Math.floor(rnd() * pool.length)];
    return makeItem(tpl.id, rarity, 'drop');
  }

  private dropLoot(p: Player, m: Monster, payload: LootPayload) {
    const a = rnd() * Math.PI * 2, r = 20 + rnd() * 40;
    const pos = nearestFree(p.zone.layout, m.x + Math.cos(a) * r, m.y + Math.sin(a) * r);
    const l = new Loot(pos.x, pos.y, p.char.id, p.id, this.now, payload);
    p.zone.addLoot(l);
  }

  addXp(p: Player, xp: number) {
    const c = p.char;
    const cap = LEVEL_CAP_BASE;
    // seviye sınırında (65) kazanılan tecrübe rütbeye akar
    if (c.level >= cap) { c.xp = 0; this.addRankXp(p, xp); return; }
    c.xp += xp;
    let leveled = false;
    while (c.level < cap && c.xp >= xpToNext(c.level)) { c.xp -= xpToNext(c.level); c.level++; leveled = true; }
    if (c.level >= cap) { const extra = c.xp; c.xp = 0; this.addRankXp(p, extra); } // 65'e ulaşan doğrudan Öz Avcısı
    if (leveled) {
      p.recompute(false);
      p.hp = p.stats.maxHp; // seviye atlayınca tam can (tasarım kararı)
      p.dirty |= Upd.HP | Upd.MAXHP | Upd.LEVEL;
      p.zone.emit(p.x, p.y, { e: Ev.LEVELUP, id: p.id, level: c.level });
      p.selfDirty |= 4;
      this.save(p, true);
    }
  }

  /** Rütbe tecrübesi (Sv.65): rütbesi yoksa önce Öz Avcısı olur; eşiği geçince bir üst rütbe. */
  private addRankXp(p: Player, xp: number) {
    const c = p.char;
    if (c.level < RANK_LEVEL) return;
    const before = c.misc.rank?.r ?? 0;
    const { st, ups } = addRankXp(c.misc.rank, xp);
    c.misc.rank = st;
    p.selfDirty |= 1; p.markSave();
    if (ups > 0) this.rankChanged(p, before);
  }
  /** Rütbe değişti: istatistik, çevredekilere yeni ad etiketi, kutlama */
  private rankChanged(p: Player, before: number) {
    const c = p.char, d = rankDef(c.misc.rank?.r);
    p.recompute(true);
    p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 1 | 4;
    for (const q of p.zone.playerSet) q.known.delete(p.id);
    if (d && d.id > before) {
      this.notice(p, `Yeni rütbe: ${d.name}! Saldırı ve azami can +%${d.atkPct}.`, 'ok');
      this.sendJson(p, { t: 'rank_up', r: d.id });
      p.zone.emit(p.x, p.y, { e: Ev.LEVELUP, id: p.id, level: c.level });
    }
    this.save(p, true);
  }
  // ───────────────────────────── rünler ─────────────────────────────
  /**
   * Rün paneli: craft (5 parça → 1. seviye), up (çantadaki ya da takılı rünü bir seviye yükselt; garantili),
   * equip / unequip (savaş dışında). Çantadaki rünler malzeme yığınıdır: rune_<tür>_<seviye>.
   */
  private cmdRune(p: Player, op: string, c: { k?: unknown; key?: unknown; req?: unknown }) {
    const ch = p.char, conf = runeConf();
    const R = (ok: boolean, msg: string) => { this.reply(p, { t: 'rune', req: String(c.req ?? '') }, ok, msg); if (!ok) this.notice(p, msg); };
    if (ch.level < conf.unlockLevel) return R(false, `Rün paneli ${conf.unlockLevel}. seviyede açılır.`);
    const st = (ch.misc.runes ??= { eq: {} });
    const take = (key: string, n: number) => { ch.materials[key] = (ch.materials[key] ?? 0) - n; if (ch.materials[key] <= 0) delete ch.materials[key]; };
    const give = (key: string, n: number) => { ch.materials[key] = (ch.materials[key] ?? 0) + n; };
    const done = (msg: string, stats = false) => { if (stats) { p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 4; } p.selfDirty |= 1 | 2; p.markSave(); R(true, msg); };
    if (op === 'craft') {
      if (!isRuneKind(c.k)) return R(false, 'Rün türü seç.');
      const d = RUNES[c.k];
      if ((ch.materials[d.frag] ?? 0) < conf.craftCost) return R(false, `${conf.craftCost} ${d.fragName} gerekir.`);
      take(d.frag, conf.craftCost); give(runeKey(c.k, 1), 1);
      return done(`${d.name} üretildi (Sv.1).`);
    }
    if (op === 'up') {
      // takılı rün: k ile; çantadaki: key ile
      let k: 'kudret' | 'siper' | 'yasam', lv: number, eq = false;
      if (isRuneKind(c.k) && !c.key) { k = c.k; lv = st.eq[k] ?? 0; eq = true; if (!lv) return R(false, 'Bu yuvada rün yok.'); }
      else { const r = parseRuneKey(String(c.key ?? '')); if (!r || (ch.materials[runeKey(r.k, r.lv)] ?? 0) < 1) return R(false, 'Rün bulunamadı.'); k = r.k; lv = r.lv; }
      if (lv >= RUNE_MAX_LEVEL) return R(false, 'Rün en yüksek seviyede.');
      const d = RUNES[k], cost = runeUpCost(lv);
      if ((ch.materials[d.frag] ?? 0) < cost) return R(false, `Yükseltmek için ${cost} ${d.fragName} gerekir.`);
      take(d.frag, cost);
      if (eq) st.eq[k] = lv + 1; else { take(runeKey(k, lv), 1); give(runeKey(k, lv + 1), 1); }
      return done(`${d.name} Sv.${lv + 1} oldu: ${d.statName} +%${runePct(lv + 1).toLocaleString('tr-TR')}.`, eq);
    }
    if (op === 'equip' || op === 'unequip') {
      if (this.now < p.combatUntil) return R(false, 'Rünler savaş dışında takılıp çıkarılır.');
      if (op === 'equip') {
        const r = parseRuneKey(String(c.key ?? ''));
        if (!r || (ch.materials[runeKey(r.k, r.lv)] ?? 0) < 1) return R(false, 'Rün bulunamadı.');
        take(runeKey(r.k, r.lv), 1);
        const old = st.eq[r.k]; if (old) give(runeKey(r.k, old), 1);
        st.eq[r.k] = r.lv;
        return done(`${RUNES[r.k].name} (Sv.${r.lv}) takıldı.`, true);
      }
      if (!isRuneKind(c.k) || !st.eq[c.k]) return R(false, 'Bu yuvada rün yok.');
      give(runeKey(c.k, st.eq[c.k]!), 1); delete st.eq[c.k];
      return done(`${RUNES[c.k].name} çıkarıldı.`, true);
    }
  }
  /** Yönetim: rütbe ver (0 = rütbeyi kaldır). Seviyesi 65 altındaysa rütbe saklanır, 65'te etkinleşir. */
  adminSetRank(charId: number, r: number): boolean {
    const p = this.byCharId(charId); if (!p) return false;
    const before = p.char.misc.rank?.r ?? 0;
    const rr = Math.max(0, Math.min(RANK_MAX, Math.floor(r)));
    if (rr === 0) delete p.char.misc.rank; else p.char.misc.rank = { r: rr, xp: 0 };
    this.rankChanged(p, before);
    return true;
  }

  private killPlayer(p: Player, killer: Player | null) {
    if (p.dead) return;
    // düelloda ölüm yok: kaybeden 1 canda kalır, düello biter
    if (killer && this.social.duelDown(p, killer)) { p.hp = 1; p.dirty |= Upd.HP; return; }
    p.dead = true; p.deadAt = this.now; p.hp = 0; p.anim = Anim.DEAD; p.inputs.length = 0;
    p.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS;
    p.zone.emit(p.x, p.y, { e: Ev.DEATH, id: p.id, killer: killer?.id ?? 0 });
    let lost = 0;
    // arena: öldürme ana sürece bildirilir (hile denetimi ve ortak sıralama orada); arenada kayıp yok
    if (killer && p.zone.id === 'arena' && this.arenaActive) this.opt.post({ type: 'arena_kill', killer: killer.char.id, victim: p.char.id, kLevel: killer.char.level, vLevel: p.char.level });
    if (killer && p.zone.id === 'guildwar') this.opt.post({ type: 'gwar_kill', killer: killer.char.id, victim: p.char.id });
    if (killer && p.zone.def.pvp && p.zone.id !== 'arena' && p.zone.id !== 'guildwar' && p.char.role === 'player') {
      lost = Math.floor(p.char.gems / 20);
      p.char.gems -= lost;
    }
    for (const m of p.zone.monsterList) if (m.target === p) { m.threat.delete(p); m.target = null; }
    this.sendJson(p, { t: 'dead', killer: killer?.name ?? null, lost, respawnIn: RESPAWN_DELAY_MS, town: MAPS[p.zone.def.respawnMap]?.name });
    this.save(p, true);
  }

  private cmdRespawn(p: Player, where: 'here' | 'town') {
    if (!p.dead) { this.sendSelfState(p); return; }
    if (this.now - p.deadAt < RESPAWN_DELAY_MS && where === 'here') return this.notice(p, 'Henüz doğamazsın.');
    p.dead = false; p.stunUntil = 0; p.rootUntil = 0;
    const target = where === 'town' ? 'bazaar' : p.zone.def.respawnMap;
    const z = this.zones.get(target)!;
    p.hp = Math.round(p.stats.maxHp * (where === 'town' ? 1 : 0.5));
    p.anim = Anim.IDLE; p.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS;
    p.lastDamageAt = 0; p.combatUntil = 0;
    if (target === 'arena') {
      // arena: etkinlik sürüyorsa arenada rastgele noktada tam canla, 4 sn korumalı doğ; bittiyse köyde
      if (this.arenaActive) { const pt = this.arenaPoint(); p.hp = p.stats.maxHp; this.moveToZone(p, z, pt.x, pt.y); this.arenaProt.set(p.char.id, this.now + 4000); }
      else { const town = this.zones.get('bazaar')!; this.moveToZone(p, town, town.layout.spawn.x, town.layout.spawn.y); }
    } else if (target === 'guildwar') {
      const w = this.warOf(p);
      if (w && this.now < w.endsAt) { const pt = this.warPoint(w, p); p.hp = p.stats.maxHp; this.moveToZone(p, z, pt.x, pt.y); this.arenaProt.set(p.char.id, this.now + 4000); }
      else { const town = this.zones.get('bazaar')!; this.moveToZone(p, town, town.layout.spawn.x, town.layout.spawn.y); }
    } else if (target === FORGE_MAP) {
      // Kor Kulesi: koşunun güncel katının girişinde (koşu bittiyse köyde)
      const pt = this.forge.respawnPoint(p);
      if (pt) this.moveToZone(p, z, pt.x, pt.y);
      else { const town = this.zones.get('bazaar')!; this.moveToZone(p, town, town.layout.spawn.x, town.layout.spawn.y); }
    } else if (target === TOWER_MAP) {
      // kulede ölen o katın girişinde doğar (ilerleme korunur)
      const t = this.towerProg(p), r = towerRoom(t.f);
      this.moveToZone(p, z, r.entry.x + (rnd() - 0.5) * 60, r.entry.y);
      this.towerSend(p);
    } else if (where === 'here' && z === p.zone) {
      // "burada doğ": öldüğü yerde (aynı haritada) doğar; köy merkezine taşınmaz
      p.dirty |= Upd.POS;
    } else this.moveToZone(p, z, z.layout.spawn.x + (rnd() - 0.5) * 80, z.layout.spawn.y + (rnd() - 0.5) * 60);
    this.sendJson(p, { t: 'respawned', hp: p.hp });
    this.save(p);
  }

  private moveToZone(p: Player, z: Zone, x: number, y: number) {
    const from = p.zone;
    const pos = nearestFree(z.layout, x, y);
    if (from !== z) {
      this.social.onZoneChange(p);
      if (from.id === FORGE_MAP) this.forge.detach(p);
      // arenadan hangi yolla çıkılırsa çıkılsın (ışınlanma, köye dön, düğme) ana süreç kaydı kapatsın
      if (from.id === 'arena') this.opt.post({ type: 'arena_left', charId: p.char.id });
      from.removePlayer(p);
      for (const m of from.monsterList) if (m.target === p) { m.target = null; m.threat.delete(p); }
      p.x = pos.x; p.y = pos.y;
      z.addPlayer(p);
      p.known.clear(); p.resetPending = true;
      p.inputs.length = 0;
      this.sendJson(p, { t: 'map', map: z.id, x: p.x, y: p.y });
      this.sendStalls(p);
    } else {
      p.x = pos.x; p.y = pos.y; z.players.move(p); p.dirty |= Upd.POS; p.inputs.length = 0;
      this.sendJson(p, { t: 'map', map: z.id, x: p.x, y: p.y });
      this.sendStalls(p);
    }
    z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.TELEPORT, x: p.x | 0, y: p.y | 0, r: 60, ms: 900, a: (p.char.misc.buffs?.emerald_gate ?? 0) > this.now ? 1 : 0 });
    p.markSave();
  }

  // ───────────────────────────── ganimet ─────────────────────────────
  private cmdPickup(p: Player, id: number) {
    const l = p.zone.lootById.get(id);
    if (!l) return;
    if (l.ownerChar !== p.char.id) return this.notice(p, 'Bu ganimet sana ait değil.');
    if (dist(p, l) > LOOT_PICKUP_RANGE + 20) return this.notice(p, 'Ganimete yaklaş.');
    this.takeLoot(p, l, false);
  }

  private takeLoot(p: Player, l: Loot, auto: boolean) {
    if (l.taken) return;
    if (l.payload.kind === 'item') {
      if (p.char.bag.length >= BAG_EQUIP_CAP) { if (!auto) this.notice(p, 'Çanta dolu (35 ekipman).'); return; }
      p.char.bag.push(l.payload.item);
      this.sendJson(p, { t: 'loot', name: itemDisplayName(l.payload.item), rarity: l.payload.item.rarity });
    } else {
      p.char.materials[l.payload.key] = (p.char.materials[l.payload.key] ?? 0) + l.payload.qty;
      this.sendJson(p, { t: 'loot', name: `${l.payload.qty}× ${MATERIAL.get(l.payload.key)?.name ?? MALL.get(l.payload.key)?.name ?? l.payload.key}`, rarity: MALL.has(l.payload.key) ? 'unique' : 'white' });
    }
    l.taken = true;
    p.zone.removeLoot(l);
    p.zone.emit(l.x, l.y, { e: Ev.FX, fx: Fx.PICKUP, x: l.x | 0, y: l.y | 0, r: 0, ms: 400, a: p.id & 0xffff });
    p.selfDirty |= 2; p.markSave();
  }

  // ───────────────────────────── eşya ve gelişim ─────────────────────────────
  private cmdEquip(p: Player, itemId: string) {
    const c = p.char;
    const i = c.bag.findIndex((it) => it.id === itemId);
    if (i < 0) return this.notice(p, 'Eşya bulunamadı.');
    const it = c.bag[i];
    const tpl = ITEM_TPL.get(it.tpl);
    if (!tpl) return;
    if (tpl.cls && tpl.cls !== c.cls) return this.notice(p, `Bu eşya ${CLASSES[tpl.cls].name} sınıfına ait.`);
    if (c.level < RARITY[it.rarity].minLevel) return this.notice(p, `${RARITY[it.rarity].name} eşya için seviye ${RARITY[it.rarity].minLevel} gerekir.`);
    const prev = c.equip[tpl.slot];
    c.bag.splice(i, 1);
    if (prev) c.bag.push(prev);
    c.equip[tpl.slot] = it;
    p.recompute(true);
    p.dirty |= Upd.MAXHP | Upd.HP;
    if (tpl.slot === 'weapon' || tpl.slot === 'armor') this.relook(p);
    p.selfDirty |= 2 | 4; p.markSave();
  }
  private cmdUnequip(p: Player, slot: Slot) {
    const c = p.char;
    // yalnız gerçekten kuşanılmış bir yuva ("constructor", "__proto__" gibi anahtarlar kanalı çökertiyordu)
    if (typeof slot !== 'string' || !/^[a-z]{2,16}$/.test(slot) || !Object.prototype.hasOwnProperty.call(c.equip, slot)) return;
    const it = c.equip[slot];
    if (!it || typeof it !== 'object' || typeof it.id !== 'string' || typeof it.tpl !== 'string') return;
    if (c.bag.length >= BAG_EQUIP_CAP) return this.notice(p, 'Çanta dolu.');
    delete c.equip[slot];
    c.bag.push(it);
    p.recompute(true);
    p.dirty |= Upd.MAXHP | Upd.HP;
    if (slot === 'weapon' || slot === 'armor') this.relook(p);
    p.selfDirty |= 2 | 4; p.markSave();
  }
  private cmdLock(p: Player, itemId: string, on: boolean) {
    const it = p.char.bag.find((x) => x.id === itemId) ?? Object.values(p.char.equip).find((x) => x?.id === itemId);
    if (!it) return;
    it.locked = on;
    p.selfDirty |= 2; p.markSave();
  }

  private usePotion(p: Player, auto: boolean) {
    if (p.dead) return;
    const n = p.char.materials.red_potion ?? 0;
    if (n <= 0) { if (!auto) this.notice(p, 'Kırmızı İksir yok.'); else { p.lastAutoPotionAt = this.now; } return; }
    if (!auto && this.now - p.lastPotionAt < 500) return;
    if (p.hp >= p.stats.maxHp) { if (!auto) this.notice(p, 'Canın zaten dolu.'); return; }
    p.char.materials.red_potion = n - 1;
    const h = Math.round(p.stats.maxHp * 0.2);
    p.hp = Math.min(p.stats.maxHp, p.hp + h); p.dirty |= Upd.HP;
    if (auto) p.lastAutoPotionAt = this.now; else p.lastPotionAt = this.now;
    p.zone.emit(p.x, p.y, { e: Ev.HEAL, tgt: p.id, amount: h });
    this.sendJson(p, { t: 'drink' }); // istemci iksir içme sesini çalar (iyileştirme becerisinin sesi değil)
    p.selfDirty |= 2; p.markSave();
  }

  private seenReceipt(p: Player, req: string): boolean {
    // yalnız kısa, düz kimlikler saklanır (NUL vb. karakter kaydı JSONB'de bozup karakteri donduruyordu)
    if (!req || typeof req !== 'string' || !/^[A-Za-z0-9_.:-]{1,40}$/.test(req)) return false;
    const r = (p.char.misc.receipts ??= []);
    if (r.includes(req)) return true;
    r.push(req); if (r.length > RECEIPT_KEEP) r.splice(0, r.length - RECEIPT_KEEP);
    return false;
  }
  private reply(p: Player, c: { t: string; req?: string }, ok: boolean, msg?: string) {
    this.sendJson(p, { t: 'result', for: c.t, req: c.req ?? null, ok, msg: msg ?? null });
  }

  private cmdStats(p: Player, c: Extract<ClientCmd, { t: 'stats' }>) {
    const ch = p.char;
    if ((ch.misc.statRev ?? 0) !== c.rev) return this.reply(p, c, false, 'Statü bilgisi eskimiş, yenilendi.'), this.sendSelf(p, 4);
    if (this.now < p.combatUntil) return this.reply(p, c, false, 'Savaş sırasında statü değiştirilemez.');
    const vals = [c.str, c.res, c.vit].map((v) => v | 0);
    if (vals.some((v) => v < 0 || v > STAT_MAX)) return this.reply(p, c, false, 'Geçersiz değer.');
    if (vals[0] + vals[1] + vals[2] > statBudget(ch.level)) return this.reply(p, c, false, 'Yetersiz statü puanı.');
    ch.stats = { str: vals[0], res: vals[1], vit: vals[2] };
    ch.misc.statRev = (ch.misc.statRev ?? 0) + 1;
    p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP;
    p.selfDirty |= 4; p.markSave();
    this.reply(p, c, true);
  }

  private cmdSkillUp(p: Player, s: number, req: string) {
    const ch = p.char;
    if (s < 0 || s >= SKILL_SLOTS) return;
    if (this.seenReceipt(p, req)) return;
    const cur = ch.skills[s] ?? 1;
    if (cur >= 10) return this.notice(p, 'Beceri en üst seviyede.');
    if (s === 3) { if (!ch.spec) return this.notice(p, 'Önce uzmanlık seç.'); }
    else {
      if (s === 4 || s === 5) { const sk = classSkill(ch.cls, s); if (sk && ch.level < sk.unlock) return this.notice(p, `${sk.name} ${sk.unlock}. seviyede açılır.`); }
      const used = skillPointsUsed(ch.skills);
      if (used >= skillUpgradeBudget(ch.level)) return this.notice(p, 'Geliştirme hakkın yok; seviye atladıkça açılır.');
    }
    // maliyet yönetimden (kademe başına Mücevher + malzemeler)
    const cost = skillUpCost(cur, s === 3);
    if (ch.gems < cost.gems) return this.notice(p, `${cost.gems.toLocaleString('tr-TR')} Mücevher gerekir.`);
    for (const [k, q] of Object.entries(cost.mats)) if ((ch.materials[k] ?? 0) < q) return this.notice(p, `Yeterli ${MATERIAL.get(k)?.name ?? MALL.get(k)?.name ?? k} yok (${q} gerekir).`);
    ch.gems -= cost.gems;
    for (const [k, q] of Object.entries(cost.mats)) ch.materials[k] -= q;
    ch.skills[s] = cur + 1;
    p.selfDirty |= 1 | 2 | 4; p.markSave();
    this.notice(p, 'Beceri geliştirildi.', 'ok');
  }

  private cmdSpec(p: Player, spec: string, req: string) {
    const ch = p.char;
    if (ch.level < TUNING.specLevel) return this.notice(p, `Uzmanlık ${TUNING.specLevel}. seviyede açılır.`);
    if (ch.spec) return this.notice(p, 'Uzmanlık zaten seçili. Değiştirmek için sıfırlama parşömeni gerekir.');
    if (!CLASSES[ch.cls].specs.some((s) => s.id === spec)) return;
    if (this.seenReceipt(p, req)) return;
    ch.spec = spec;
    p.selfDirty |= 4; p.markSave();
  }

  // ───────── Şifa Bahçesi ─────────
  /** her bitkinin bu oyuncu için yeniden olgunlaşacağı an (0: olgun) */
  private gardenState(p: Player) {
    const g = p.char.misc.garden ?? {};
    this.sendJson(p, { t: 'garden', ready: GARDEN_PLANTS.map((pl) => Math.max(0, (g[pl.i] ?? 0) - this.now)), sickle: (p.char.materials.sickle ?? 0) > 0 });
  }
  private cmdGarden(p: Player, c: { op: string; i?: number; r?: number; n?: number; req?: string }) {
    const T = TUNING.garden, ch = p.char, req = String(c.req ?? '');
    const R = (ok: boolean, msg: string) => this.reply(p, { t: 'garden', req }, ok, msg);
    if (c.op === 'state') return this.gardenState(p);
    if (c.op === 'cancel') { if (p.gather) { p.gather = null; if (p.anim === Anim.GATHER) { p.anim = Anim.IDLE; p.dirty |= Upd.ANIM; } } return; }
    if (!T.enabled) return R(false, 'Şifa Bahçesi şu an kapalı.');
    if (c.op === 'buy') {
      if (p.zone.id !== GARDEN_MAP || !this.nearNpc(p, 'reyhan')) return R(false, 'Şifacı Reyhan\'ın yanına git.');
      if ((ch.materials.sickle ?? 0) > 0) return R(false, 'Zaten bir orağın var.');
      if (ch.gems < T.sicklePrice) return R(false, `${T.sicklePrice.toLocaleString('tr-TR')} Mücevher gerekir.`);
      ch.gems -= T.sicklePrice; ch.materials.sickle = 1;
      p.selfDirty |= 1 | 2; this.save(p, true); this.gardenState(p);
      return R(true, 'Şifacı Orağı artık senin! Bahçedeki olgun bitkilere eğilip toplayabilirsin.');
    }
    if (c.op === 'brew') {
      if (p.zone.id !== GARDEN_MAP || !this.nearNpc(p, 'reyhan')) return R(false, 'Şifacı Reyhan\'ın yanına git.');
      const rc = T.recipes[Number(c.r)]; if (!rc) return R(false, 'Tarif bulunamadı.');
      const n = Math.max(1, Math.min(50, Math.floor(Number(c.n) || 1)));
      for (const [k, q] of Object.entries(rc.herbs)) if ((ch.materials[k] ?? 0) < (q ?? 0) * n) return R(false, `${MATERIAL.get(k)?.name ?? k} yetmiyor (${(q ?? 0) * n} gerekir).`);
      if (ch.gems < rc.gems * n) return R(false, `${(rc.gems * n).toLocaleString('tr-TR')} Mücevher gerekir.`);
      for (const [k, q] of Object.entries(rc.herbs)) { ch.materials[k] -= (q ?? 0) * n; if (ch.materials[k] <= 0) delete ch.materials[k]; }
      ch.gems -= rc.gems * n; ch.materials[rc.potion] = (ch.materials[rc.potion] ?? 0) + rc.out * n;
      p.selfDirty |= 1 | 2; this.save(p, true);
      return R(true, `${rc.out * n}× ${MATERIAL.get(rc.potion)?.name ?? rc.potion} hazır!`);
    }
    const pl = GARDEN_PLANTS[Number(c.i)];
    if (!pl || p.zone.id !== GARDEN_MAP) return;
    if (c.op === 'start') {
      if (p.dead || p.fishing) return;
      if ((ch.materials.sickle ?? 0) <= 0) return this.notice(p, 'Bitki toplamak için orak gerekir: Şifacı Reyhan\'dan alabilirsin.');
      if (Math.hypot(p.x - pl.x, p.y - pl.y) > GARDEN_REACH) return this.notice(p, 'Bitkiye yaklaş.');
      const left = (ch.misc.garden?.[pl.i] ?? 0) - this.now;
      if (left > 0) { const sec = Math.ceil(left / 1000); return this.notice(p, `Bu bitki henüz olgunlaşmadı (${sec < 60 ? sec + ' sn' : Math.ceil(sec / 60) + ' dk'}).`); }
      p.gather = { i: pl.i, at: this.now, x: p.x, y: p.y };
      p.dir = angleByte(pl.x - p.x, pl.y - p.y); p.anim = Anim.GATHER; p.animUntil = this.now + T.gatherMs + 400; p.dirty |= Upd.ANIM;
      return this.sendJson(p, { t: 'gather', op: 'start', i: pl.i, ms: T.gatherMs });
    }
    if (c.op === 'done') {
      const g = p.gather;
      if (!g || g.i !== pl.i) return;
      p.gather = null;
      if (this.now - g.at < T.gatherMs - 250 || Math.hypot(p.x - g.x, p.y - g.y) > 12 || p.dead) return this.sendJson(p, { t: 'gather', op: 'fail', i: pl.i });
      const q = randInt(T.qty[0], T.qty[1]);
      ch.materials[pl.herb] = (ch.materials[pl.herb] ?? 0) + q;
      (ch.misc.garden ??= {})[pl.i] = this.now + T.regrowSec * 1000;
      if (p.anim === Anim.GATHER) { p.anim = Anim.IDLE; p.dirty |= Upd.ANIM; }
      p.selfDirty |= 2; p.markSave();
      this.sendJson(p, { t: 'gather', op: 'done', i: pl.i, key: pl.herb, n: q });
      return this.gardenState(p);
    }
  }
  private drinkHerbPotion(p: Player, key: PotionKey) {
    const ch = p.char, e = TUNING.garden.effects[key];
    if ((ch.materials[key] ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
    ch.materials[key] -= 1; if (ch.materials[key] <= 0) delete ch.materials[key];
    (ch.misc.buffs ??= {})[key] = this.now + e.min * 60_000;
    p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.sendJson(p, { t: 'drink' });
    this.notice(p, `${MATERIAL.get(key)?.name}: ${e.min} dk boyunca etkin.`, 'ok');
  }

  /**
   * Depo (Depocu Rauf'un evi): eşya, malzeme, Nesne Market eşyası, Mücevher ve Öz bırakılır/alınır.
   * Hepsi karakterin kendi kaydında: taşıma bellekte tek adımda (çantadan çıkar, depoya girer), kayıt da tek
   * işlemde yazılır; arada eşya kaybolmaz ya da çoğalmaz. Yalnız Rauf'un yanında ve ticaret yokken çalışır.
   */
  private cmdStorage(p: Player, c: { op: string; id?: string; key?: string; n?: number; cur?: string }) {
    const ch = p.char;
    if (!this.nearNpc(p, 'rauf')) { this.sendJson(p, { t: 'storage', far: true }); return this.notice(p, 'Depoya Depocu Rauf\'un yanında erişebilirsin.'); }
    if (this.social.inTrade(p)) return this.notice(p, 'Ticaret sürerken depo kullanılamaz.');
    const v = (ch.misc.vault ??= {}), st = (ch.storage ??= []);
    const cap = storageCap(v.pages ?? 0);
    const n = Math.floor(Number(c.n));
    const qty = Number.isFinite(n) ? Math.max(0, Math.min(n, 1e12)) : 0;
    const fail = (t: string) => { this.notice(p, t); this.sendStorage(p); };
    let changed = false;
    switch (c.op) {
      case 'open': break;
      case 'put_item': {
        const i = ch.bag.findIndex((x) => x.id === c.id);
        if (i < 0) return fail('Eşya çantanda yok.');
        if (st.length >= cap) return fail(`Depo dolu (${cap} bölme). Ek Depo Sayfası ile genişletebilirsin.`);
        st.push(ch.bag.splice(i, 1)[0]); changed = true; break;
      }
      case 'take_item': {
        const i = st.findIndex((x) => x.id === c.id);
        if (i < 0) return fail('Eşya depoda yok.');
        if (ch.bag.length >= BAG_EQUIP_CAP) return fail('Çantan dolu.');
        ch.bag.push(st.splice(i, 1)[0]); changed = true; break;
      }
      case 'put_mat': case 'take_mat': {
        const k = String(c.key ?? '');
        if (!MATERIAL.has(k) && !MALL.has(k)) return fail('Bu depoya konmaz.');
        const vm = (v.mats ??= {});
        const from = c.op === 'put_mat' ? ch.materials : vm, to = c.op === 'put_mat' ? vm : ch.materials;
        const q = Math.min(from[k] ?? 0, qty);
        if (q <= 0) return fail('Yeterli miktar yok.');
        from[k] -= q; if (from[k] <= 0) delete from[k];
        to[k] = (to[k] ?? 0) + q;
        if (!Object.keys(vm).length) delete v.mats;
        changed = true; break;
      }
      case 'put_cur': case 'take_cur': {
        const cur = c.cur === 'gems' ? 'gems' : c.cur === 'essence' ? 'essence' : null;
        if (!cur) return;
        const inBag = ch[cur], inVault = v[cur] ?? 0;
        const q = Math.min(c.op === 'put_cur' ? inBag : inVault, qty);
        if (q <= 0) return fail('Yeterli miktar yok.');
        if (c.op === 'put_cur') { ch[cur] = inBag - q; v[cur] = inVault + q; } else { ch[cur] = inBag + q; v[cur] = inVault - q; }
        if (!v[cur]) delete v[cur];
        changed = true; break;
      }
      default: return;
    }
    if (changed) { p.selfDirty |= 1 | 2; this.save(p, true); }
    this.sendStorage(p);
  }
  private sendStorage(p: Player) {
    const v = p.char.misc.vault ?? {};
    this.sendJson(p, { t: 'storage', items: p.char.storage ?? [], mats: v.mats ?? {}, gems: v.gems ?? 0, essence: v.essence ?? 0, pages: Math.min(STORAGE_MAX_PAGES, STORAGE_BASE_PAGES + (v.pages ?? 0)), cap: storageCap(v.pages ?? 0) });
  }

  private nearNpc(p: Player, npcId: string): boolean {
    const n = p.zone.layout.npcs.find((x) => x.id === npcId);
    return !!n && dist(p, n) <= NPC_RANGE;
  }

  /** Kullanılabilir malzeme: tüketim ve ödül aynı adımda (tek thread, atomik). */
  private cmdUse(p: Player, key: string, req: string, itemId?: string) {
    const ch = p.char;
    if ((ch.materials[key] ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
    if (MALL.has(key)) return this.useMall(p, key, req, itemId);
    if (this.seenReceipt(p, req)) return;
    if (key === 'starter_chest') {
      ch.materials.starter_chest -= 1;
      ch.gems += 50;
      ch.materials.red_potion = (ch.materials.red_potion ?? 0) + 10;
      p.selfDirty |= 1 | 2; this.save(p, true);
      this.sendJson(p, { t: 'chestResult', title: 'Başlangıç Sandığı', rewards: ['50 Mücevher', '10× Kırmızı İksir'] });
      return;
    }
    if (key === 'prereg_chest') {
      ch.materials.prereg_chest -= 1;
      ch.gems += PREREG_REWARD.gems;
      ch.materials.pet_fox = Math.max(1, ch.materials.pet_fox ?? 0);
      // tilki hemen yanına gelir (başka bir pet etkin değilse)
      const b = (ch.misc.buffs ??= {});
      ch.misc.foxUntil = this.now + PET_FOX_MS; // 3 gün: sandık açılınca başlar
      if (!PET_KEYS.some((k) => k !== 'pet_fox' && (b[k] ?? 0) > this.now)) b.pet_fox = ch.misc.foxUntil;
      p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; this.relook(p);
      p.selfDirty |= 1 | 2; this.save(p, true);
      this.sendJson(p, { t: 'chestResult', title: 'Ön Kayıt Sandığı', rewards: ['Yeşil Tilki (3 gün: +10 saldırı, +200 can)', `${PREREG_REWARD.gems} Mücevher`] });
      return;
    }
    if (key === 'pet_fox') {
      // ön kayıt tilkisi: çağır / dinlenmeye gönder; 3 günlük süre dolunca çantadan kalkar
      const until = ch.misc.foxUntil ?? 0;
      if (until <= this.now) { delete ch.materials.pet_fox; delete (ch.misc.buffs ?? {}).pet_fox; p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 1 | 2; this.save(p, true); this.relook(p); return this.notice(p, 'Yeşil Tilki\'nin süresi doldu.', 'info'); }
      const b = (ch.misc.buffs ??= {});
      if ((b.pet_fox ?? 0) > this.now) { delete b.pet_fox; this.notice(p, 'Yeşil Tilki dinlenmeye gitti.', 'info'); }
      else {
        const other = PET_KEYS.find((k) => k !== 'pet_fox' && (b[k] ?? 0) > this.now);
        if (other) return this.notice(p, 'Başka bir pet yanında; süresi bitince tilkiyi çağırabilirsin.');
        b.pet_fox = until; this.notice(p, 'Yeşil Tilki yanında: +10 saldırı, +200 can.', 'ok');
      }
      p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 1 | 2; this.save(p, true);
      this.relook(p); // çevredekiler tilkiyi hemen görsün
      return;
    }
    if (key === 'red_potion') return this.usePotion(p, false);
    if ((POTIONS as string[]).includes(key)) return this.drinkHerbPotion(p, key as PotionKey);
    if (key === 'azrail_chest') return this.openAzrailChest(p);
    if (key === 'forge_chest') return this.openForgeChest(p);
    if (key === 'crystal_chest') return this.openCrystalChest(p);
    this.notice(p, 'Bu eşya doğrudan kullanılamaz.');
  }

  private cmdNpc(p: Player, id: string) {
    const def = p.zone.def.npcs.find((n) => n.id === id);
    if (!def || !this.nearNpc(p, id)) return this.notice(p, 'NPC\'ye yaklaş.');
    this.questTalk(p, id);
    this.sendJson(p, { t: 'npc', id, name: def.name, title: def.title, actions: def.actions });
  }

  /** Satış: çantadan ya da üzerindeki eşyadan, her yerde (NPC'ye gitmek gerekmez). Kilitli eşya satılmaz. */
  private cmdSell(p: Player, ids: string[], req: string) {
    if (this.seenReceipt(p, req)) return;
    const c = p.char;
    let total = 0, n = 0, equipped = false;
    for (const id of ids) {
      const i = c.bag.findIndex((x) => x.id === id);
      if (i >= 0) {
        if (c.bag[i].locked) continue;
        total += sellPrice(c.bag[i].rarity); c.bag.splice(i, 1); n++;
        continue;
      }
      const slot = (Object.keys(c.equip) as Slot[]).find((s) => c.equip[s]?.id === id);
      if (slot && !c.equip[slot]!.locked) { total += sellPrice(c.equip[slot]!.rarity); delete c.equip[slot]; n++; equipped = true; }
    }
    if (!n) return this.notice(p, 'Satılacak eşya yok (kilitli eşya satılmaz).');
    c.gems += total;
    if (equipped) { p.recompute(false); p.hp = Math.min(p.hp, p.stats.maxHp); p.dirty |= Upd.HP | Upd.MAXHP; }
    p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.notice(p, `${n} eşya satıldı: +${total} Mücevher`, 'ok');
  }

  /**
   * Market (Öz): n paket Öz → Mücevher (paket = essxEss Öz → essxGems Mücevher) ya da n Kırmızı İksir (potionEss Öz).
   * Oyuncunun gördüğü oran (rate) sunucudakiyle aynı değilse işlem yapılmaz (yönetim bu arada değiştirdiyse).
   */
  private cmdEssx(p: Player, c: Extract<ClientCmd, { t: 'essx' }>) {
    const n = Math.floor(Number(c.n));
    if (!(n >= 1 && n <= 100000)) return this.reply(p, c, false, 'Geçersiz miktar.');
    const ch = p.char;
    const ess = Math.round(TUNING.essxEss), gems = Math.round(TUNING.essxGems), pot = Math.round(TUNING.potionEss), gpot = Math.max(1, Math.round(TUNING.potionGems ?? 1));
    const rate = c.op === 'gems' ? ess * 100000 + gems : c.op === 'gpotion' ? gpot : pot;
    if (Number(c.rate) !== rate) { this.sendJson(p, { t: 'tuning', tuning: TUNING }); return this.reply(p, c, false, 'Oran değişti, lütfen tekrar bak.'); }
    if (this.seenReceipt(p, c.req)) return;
    // Mücevherle Kırmızı İksir (Market)
    if (c.op === 'gpotion') {
      const g = gpot * n;
      if (ch.gems < g) return this.reply(p, c, false, `Yetersiz Mücevher: ${g.toLocaleString('tr-TR')} gerekir.`);
      ch.gems -= g; ch.materials.red_potion = (ch.materials.red_potion ?? 0) + n;
      this.reply(p, c, true, `${n} Kırmızı İksir alındı (−${g.toLocaleString('tr-TR')} Mücevher).`);
      p.selfDirty |= 1 | 2; this.save(p, true); return;
    }
    const cost = c.op === 'gems' ? ess * n : pot * n;
    if (ch.essence < cost) return this.reply(p, c, false, `Yetersiz Öz: ${cost.toLocaleString('tr-TR')} gerekir.`);
    ch.essence -= cost;
    if (c.op === 'gems') { ch.gems += gems * n; this.reply(p, c, true, `${cost.toLocaleString('tr-TR')} Öz → ${(gems * n).toLocaleString('tr-TR')} Mücevher`); }
    else { ch.materials.red_potion = (ch.materials.red_potion ?? 0) + n; this.reply(p, c, true, `${n} Kırmızı İksir alındı.`); }
    p.selfDirty |= 1 | 2; this.save(p, true);
  }

  private cmdBuy(p: Player, c: Extract<ClientCmd, { t: 'buy' }>) {
    const shop = SHOPS[c.shop];
    if (!shop) return;
    if (!this.nearNpc(p, shop.npc)) return this.notice(p, `${shop.name} için NPC'ye yaklaş.`);
    const prod = shop.products.find((x) => x.id === c.product);
    if (!prod) return;
    const qty = Math.max(1, Math.min(99, c.qty | 0));
    if (prod.price !== c.price) return this.reply(p, c, false, 'Fiyat değişti, lütfen tekrar onayla.'), this.sendJson(p, { t: 'shop', shop: c.shop, data: shop });
    if (this.seenReceipt(p, c.req)) return;
    const cost = prod.price * qty;
    const ch = p.char;
    const wallet = prod.currency === 'gems' ? ch.gems : ch.essence;
    if (wallet < cost) return this.reply(p, c, false, 'Yetersiz bakiye.');
    if (prod.minLevel && ch.level < prod.minLevel) return this.reply(p, c, false, `Seviye ${prod.minLevel} gerekir.`);
    if (prod.kind === 'equipment') {
      if (ch.bag.length + qty > BAG_EQUIP_CAP) return this.reply(p, c, false, 'Çanta dolu; hiçbir bedel alınmadı.');
      const [slot, rarity] = prod.ref.split(':');
      for (let i = 0; i < qty; i++) {
        const tpl = ITEM_TEMPLATES.find((t) => t.slot === slot && (!t.cls || t.cls === ch.cls))!;
        ch.bag.push(makeItem(tpl.id, rarity as Rarity, 'shop'));
      }
    } else ch.materials[prod.ref] = (ch.materials[prod.ref] ?? 0) + prod.qty * qty;
    if (prod.currency === 'gems') ch.gems -= cost; else ch.essence -= cost;
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.reply(p, c, true, `${prod.name} alındı.`);
  }



  private cmdUpgrade(p: Player, c: Extract<ClientCmd, { t: 'upgrade' }>) {
    // her bölgede "upgrade" işi olan herhangi bir Demirci
    const smith = p.zone.layout.npcs.find((n) => MAPS[p.zone.id]?.npcs.find((d) => d.id === n.id)?.actions.includes('upgrade') && dist(p, n) <= NPC_RANGE);
    if (!smith) return this.reply(p, c, false, 'Demirciye yaklaş.');
    if (this.now < p.combatUntil) return this.reply(p, c, false, 'Savaş sırasında artı basılamaz.');
    if (this.seenReceipt(p, c.req)) return;
    const ch = p.char;
    const it = ch.bag.find((x) => x.id === c.item) ?? Object.values(ch.equip).find((x) => x?.id === c.item);
    if (!it) return this.reply(p, c, false, 'Eşya bulunamadı.');
    if (!isUpgradable(ITEM_TPL.get(it.tpl)?.slot)) return this.reply(p, c, false, 'Yalnız silah ve zırha artı basılır.');
    if (it.plus !== c.expectPlus) return this.reply(p, c, false, 'Eşya durumu değişmiş, pencere yenilendi.');
    if (it.plus >= MAX_PLUS) return this.reply(p, c, false, `Eşya en üst artıda (+${MAX_PLUS}).`);
    const step = upgradeStep(it.plus + 1);
    if (!step) return this.reply(p, c, false, 'Bu kademe tanımlı değil.');
    const m = ch.materials;
    if (ch.gems < step.gems || Object.entries(step.mats).some(([k, q]) => (m[k] ?? 0) < q)) return this.reply(p, c, false, 'Malzeme veya Mücevher yetersiz.');
    const useMastery = c.mastery && step.chance < 100 && (m.mastery_seal ?? 0) > 0;
    const chance = useMastery ? masteryChance(step.chance) : step.chance;
    for (const [k, q] of Object.entries(step.mats)) m[k] -= q;
    ch.gems -= step.gems;
    if (useMastery) m.mastery_seal -= 1;
    const ok = rnd() * 100 < chance;
    const before = it.plus;
    it.plus = ok ? it.plus + 1 : upgradeFailDown() ? Math.max(0, it.plus - 1) : it.plus;
    if (!ok && (m.protect_seal ?? 0) > 0) {
      // Demircinin Koruma Mührü: harcanan malzemelerin yarısı geri döner
      m.protect_seal -= 1;
      const back: string[] = [];
      for (const [k, q] of Object.entries(step.mats)) { const r = Math.floor(q / 2); if (r > 0) { m[k] = (m[k] ?? 0) + r; back.push(`${r}× ${MATERIAL.get(k)?.name ?? k}`); } }
      this.notice(p, back.length ? `Koruma Mührü: ${back.join(', ')} geri verildi.` : 'Koruma Mührü kullanıldı.', 'ok');
    }
    p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP;
    if (it.plus !== before && (ch.equip.weapon === it || ch.equip.armor === it)) this.relook(p);
    p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.sendJson(p, { t: 'upgradeResult', req: c.req, ok, before, after: it.plus, chance, item: it.id });
  }

  /**
   * Haso · Dönüşüm: ekipmanı Eşsiz nadirliğe çevirir. Efsun, artı, evrim ve sayaç aynen kalır.
   * Gereksinimler yönetimden (transformConf); şans %100 değilse başarısızlıkta yalnız malzeme gider, eşya bozulmaz.
   */
  private cmdTransform(p: Player, c: Extract<ClientCmd, { t: 'transform' }>) {
    const smith = p.zone.layout.npcs.find((n) => MAPS[p.zone.id]?.npcs.find((d) => d.id === n.id)?.actions.includes('upgrade') && dist(p, n) <= NPC_RANGE);
    if (!smith) return this.reply(p, c, false, 'Demirciye yaklaş.');
    if (this.now < p.combatUntil) return this.reply(p, c, false, 'Savaş sırasında dönüşüm yapılamaz.');
    if (this.seenReceipt(p, c.req)) return;
    const conf = transformConf();
    if (!conf.enabled) return this.reply(p, c, false, 'Dönüşüm şu an kapalı.');
    const ch = p.char;
    const it = ch.bag.find((x) => x.id === c.item) ?? Object.values(ch.equip).find((x) => x?.id === c.item);
    if (!it) return this.reply(p, c, false, 'Eşya bulunamadı.');
    const g = transformGroup(it);
    if (!g || !canTransform(it)) return this.reply(p, c, false, it.rarity === 'unique' ? 'Bu eşya zaten Eşsiz.' : `Yalnız ${conf.from.map((r) => RARITY[r].name).join(', ')} eşya dönüşür.`);
    const cost = conf.cost[g];
    if (ch.level < cost.minLevel) return this.reply(p, c, false, `Dönüşüm için seviye ${cost.minLevel} gerekir.`);
    if (it.plus < cost.minPlus) return this.reply(p, c, false, `Eşya en az +${cost.minPlus} olmalı.`);
    const m = ch.materials;
    if (ch.gems < cost.gems || Object.entries(cost.mats).some(([k, q]) => (m[k] ?? 0) < q)) return this.reply(p, c, false, 'Malzeme veya Mücevher yetersiz.');
    for (const [k, q] of Object.entries(cost.mats)) m[k] -= q;
    ch.gems -= cost.gems;
    const ok = rnd() * 100 < cost.chance;
    if (ok) { it.rarity = 'unique'; it.ench = []; } // Eşsiz'e dönüşen eşyanın efsunları silinir (yeniden efsunlanır)
    p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP;
    p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.sendJson(p, { t: 'transformResult', req: c.req, ok, item: it.id });
    if (ok) this.notice(p, `${itemDisplayName(it)} Eşsiz'e dönüştü! Artısı korundu, efsunları silindi.`, 'ok');
    else this.notice(p, 'Dönüşüm başarısız oldu; eşyan zarar görmedi.', 'error');
  }

  // ───── oto atak (günlük süre sınırlı; süre sunucuda tutulur) ─────
  private autoLeft(p: Player, now = Date.now()): number {
    const day = trDayKey(now), a = p.char.misc.autoDay;
    const used = a && a.day === day ? a.ms : 0;
    return Math.max(0, (TUNING.autoAttackMin ?? 120) * 60_000 - used);
  }
  private autoSend(p: Player) { this.sendJson(p, { t: 'auto', on: p.autoOn, left: this.autoLeft(p) }); }
  private cmdAuto(p: Player, on: boolean) {
    const now = Date.now();
    if (on && !p.autoOn) {
      if (this.autoLeft(p, now) <= 0) { this.notice(p, 'Bugünkü oto atak süren doldu. Gece 00.00\'da yenilenir.'); return this.autoSend(p); }
      if (p.dead) return this.autoSend(p);
      p.autoOn = true; p.autoAt = now;
    } else if (!on && p.autoOn) { this.autoTick(p, now); p.autoOn = false; }
    this.autoSend(p);
  }
  /** Geçen süreyi günlük hakka işler; hak bitince kapatır. Gün değişiminde sayaç sıfırlanır. */
  private autoTick(p: Player, now: number) {
    if (!p.autoOn) return;
    const day = trDayKey(now), c = p.char;
    if (!c.misc.autoDay || c.misc.autoDay.day !== day) c.misc.autoDay = { day, ms: 0 };
    c.misc.autoDay.ms += Math.max(0, Math.min(10_000, now - p.autoAt)); p.autoAt = now;
    p.markSave();
    if (p.dead || this.autoLeft(p, now) <= 0) {
      p.autoOn = false;
      if (!p.dead) this.notice(p, 'Bugünkü oto atak süren doldu. Gece 00.00\'da yenilenir.');
      this.autoSend(p);
    } else if (this.tickNo % 1200 < 20) this.autoSend(p); // dakikada bir kalan süre
  }

  // ───────────────────────────── Savaş Arenası (kanal tarafı) ─────────────────────────────
  private arenaActive = false;
  private arenaEndsAt = 0;
  private arenaProt = new Map<number, number>(); // charId → doğuş koruması bitişi
  /** Ana süreçten: etkinlik açıldı/kapandı. Kapanınca arenadaki herkes köye döner (ölüyse dirilerek). */
  setArena(active: boolean, endsAt: number) {
    this.arenaActive = active; this.arenaEndsAt = endsAt;
    if (active) return;
    const az = this.zones.get('arena'); if (!az) return;
    const town = this.zones.get('bazaar')!;
    for (const p of [...az.playerSet]) {
      if (p.dead) { p.dead = false; p.anim = Anim.IDLE; p.dirty |= Upd.ANIM | Upd.FLAGS; }
      p.hp = p.stats.maxHp; p.dirty |= Upd.HP;
      this.moveToZone(p, town, town.layout.spawn.x + (rnd() - 0.5) * 120, town.layout.spawn.y + (rnd() - 0.5) * 80);
      this.sendJson(p, { t: 'respawned', hp: p.hp });
      this.notice(p, 'Arena kapandı; köye döndün.', 'info');
    }
    this.arenaProt.clear();
  }
  /** Arena içinde rastgele açık nokta (yuvarlak meydan). */
  private arenaPoint() {
    const az = this.zones.get('arena')!, l = az.layout;
    const cx = (l.w / 2) * 64, cy = (l.h / 2) * 64;
    for (let i = 0; i < 20; i++) { const a = rnd() * Math.PI * 2, r = rnd() * 13 * 64; const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r; if (freeAt(l, x, y)) return { x, y }; }
    return { x: cx, y: cy };
  }
  private cmdArena(p: Player, op: string) {
    if (op === 'leave') {
      if (p.zone.id !== 'arena') return;
      const town = this.zones.get('bazaar')!;
      if (p.dead) { p.dead = false; p.hp = Math.round(p.stats.maxHp * 0.5); p.anim = Anim.IDLE; p.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS; this.sendJson(p, { t: 'respawned', hp: p.hp }); }
      this.moveToZone(p, town, town.layout.spawn.x, town.layout.spawn.y);
      return;
    }
    if (!this.arenaActive) return this.notice(p, 'Arena şu an kapalı.');
    if (p.zone.id === 'arena') return;
    if (p.dead) return this.notice(p, 'Ölüyken arenaya giremezsin.');
    if (p.char.level < TUNING.arena.minLevel) return this.notice(p, `Arenaya girmek için en az ${TUNING.arena.minLevel}. seviye gerekir.`);
    if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken arenaya giremezsin.');
    // son karar ana süreçte (aynı bağlantıdan en çok 2 karakter)
    this.opt.post({ type: 'arena_join', sid: p.sid, charId: p.char.id, level: p.char.level });
  }
  arenaJoinResult(sid: number, err: string | null) {
    const p = this.bySid.get(sid); if (!p) return;
    if (err) return this.notice(p, err);
    if (!this.arenaActive || p.dead || p.zone.id === 'arena') return;
    const az = this.zones.get('arena')!, pt = this.arenaPoint();
    this.social.tradeCancel(p, 'Ticaret iptal: arenaya girildi.');
    p.hp = p.stats.maxHp; p.dirty |= Upd.HP;
    this.moveToZone(p, az, pt.x, pt.y);
    this.arenaProt.set(p.char.id, this.now + 4000);
    this.notice(p, 'Savaş Arenası! Rakiplerini yen, puan topla. Aynı gruptakiler birbirine vuramaz.', 'ok');
  }

  // ───────────────────────────── binek ─────────────────────────────
  /** Seyis Arda: görev al / teslim et; sahibi bin-in yapar (her yerde, ölüyken ve balık tutarken değil). */
  private cmdMount(p: Player, op: string) {
    const c = p.char, m = c.misc.mount ?? (c.misc.mount = {});
    if (op === 'quest' || op === 'claim') {
      if (p.zone.id !== 'bazaar' || !this.nearNpc(p, MOUNT.npc)) return this.notice(p, "Seyis Arda'nın yanına git.");
      if (m.owned) return this.notice(p, 'Bineğin zaten var.');
      if (op === 'quest') {
        if (c.level < MOUNT.level) return this.notice(p, `Seyis görevi ${MOUNT.level}. seviyede alınır.`);
        if (m.quest) return this.notice(p, 'Görev zaten alındı.');
        m.quest = { kills: 0 }; p.selfDirty |= 1; p.markSave();
        return this.notice(p, `Görev alındı: ${MOUNT.kills} canavar öldür, ${MOUNT.seals} Kor Mührü ve ${MOUNT.gems} Mücevher getir.`, 'ok');
      }
      if (!m.quest) return this.notice(p, 'Önce görevi al.');
      if (m.quest.kills < MOUNT.kills) return this.notice(p, `Daha ${MOUNT.kills - m.quest.kills} canavar öldürmelisin.`);
      if ((c.materials[MOUNT.sealKey] ?? 0) < MOUNT.seals) return this.notice(p, `${MOUNT.seals} Kor Mührü gerekir.`);
      if (c.gems < MOUNT.gems) return this.notice(p, `${MOUNT.gems} Mücevher gerekir.`);
      c.materials[MOUNT.sealKey] -= MOUNT.seals; c.gems -= MOUNT.gems;
      m.owned = true; delete m.quest;
      p.selfDirty |= 1 | 2; this.save(p, true);
      this.sendJson(p, { t: 'mountGot' });
      return this.notice(p, `Tebrikler! ${MOUNT.name} artık senin. Binmek için "Binek" düğmesine bas.`, 'ok');
    }
    if (op === 'ride') {
      if (!m.owned) return this.notice(p, "Bineğin yok. Seyis Arda'dan görev al.");
      if (!m.riding && (p.dead || p.fishing)) return this.notice(p, 'Şu an binemezsin.');
      m.riding = !m.riding;
      p.recompute(true); p.dirty |= Upd.FLAGS | Upd.HP | Upd.MAXHP; p.selfDirty |= 1 | 4; p.markSave();
      return;
    }
  }

  // ───────────────────────────── Kadim Kule ─────────────────────────────
  /** Oyuncunun kule durumu; konumu başka kattaysa (yönetim ışınlaması vb.) o kata uyarlanır. */
  private towerProg(p: Player): TowerProgress {
    const c = p.char;
    let t = c.misc.tower;
    const at = p.zone.id === TOWER_MAP ? towerFloorAt(p.x, p.y) : 0;
    if (!t) t = c.misc.tower = { f: at || 1, n: 0 };
    if (at && at !== t.f) { const best = t.best, clears = t.clears; t = c.misc.tower = { f: at, n: 0, best, clears }; this.towerPuzzleInit(t); }
    return t;
  }
  private towerPuzzleInit(t: TowerProgress) {
    const ft = TUNING.tower.floors[t.f - 1];
    delete t.seq; delete t.si; delete t.rd; delete t.opts; delete t.alt; delete t.altAt; delete t.key;
    if (!ft) return;
    if (ft.puzzle === 'seq') { t.seq = Array.from({ length: 5 }, () => randInt(0, 3)); t.si = 0; }
    else if (ft.puzzle === 'riddle') { t.rd = randInt(0, RIDDLES.length - 1); const o = [0, 1, 2, 3]; for (let i = 3; i > 0; i--) { const j = randInt(0, i); [o[i], o[j]] = [o[j], o[i]]; } t.opts = o; }
    else if (ft.puzzle === 'altar') { t.alt = 0; t.altAt = 0; }
  }
  /** Kat başlangıcı: ilerleme sıfırlanır, bulmaca kurulur, oyuncu kat girişine taşınır. */
  private towerSetFloor(p: Player, f: number) {
    const c = p.char, old = c.misc.tower;
    const t: TowerProgress = { f, n: 0, best: Math.max(old?.best ?? 0, f), clears: old?.clears ?? 0 };
    this.towerPuzzleInit(t);
    c.misc.tower = t;
    p.towerPlate = -1; p.altarHold = null;
    this.questTower(p, f);
    const z = this.zones.get(TOWER_MAP)!, r = towerRoom(f);
    this.moveToZone(p, z, r.entry.x + (rnd() - 0.5) * 50, r.entry.y);
    const ft = TUNING.tower.floors[f - 1];
    this.notice(p, `Kadim Kule · ${f}. Kat — ${TOWER_PUZZLE_NAMES[ft?.puzzle ?? 'kill']}`, 'ok');
    this.towerSend(p);
    this.save(p);
  }
  private towerSend(p: Player) {
    if (p.zone.id !== TOWER_MAP) { this.sendJson(p, { t: 'tower', f: 0 }); return; }
    const t = this.towerProg(p), ft = TUNING.tower.floors[t.f - 1];
    if (!ft) return;
    const need = ft.puzzle === 'kill' ? ft.kills : ft.puzzle === 'seq' ? (t.seq?.length ?? 5) : ft.puzzle === 'altar' ? 3 : 1;
    const have = ft.puzzle === 'kill' ? t.n : ft.puzzle === 'seq' ? (t.si ?? 0) : ft.puzzle === 'altar' ? [0, 1, 2].filter((i) => (t.alt ?? 0) & (1 << i)).length : t.done ? 1 : 0;
    const rd = t.rd !== undefined ? RIDDLES[t.rd] : null;
    this.sendJson(p, {
      t: 'tower', f: t.f, puzzle: ft.puzzle, need, have, done: !!t.done, best: t.best ?? t.f, clears: t.clears ?? 0,
      seq: t.seq, si: t.si ?? 0,
      riddle: rd && t.opts ? { q: rd.q, opts: t.opts.map((o) => (o === 0 ? rd.a : rd.w[o - 1])) } : undefined,
      alt: t.alt ?? 0, altLeft: t.altAt ? Math.max(0, t.altAt + ALTAR_WINDOW_MS - this.now) : 0,
      key: !!t.key, kills: t.n,
    });
  }
  private towerDone(p: Player, t: TowerProgress, msg: string) {
    if (t.done) return;
    t.done = true;
    this.notice(p, msg, 'ok');
    const r = towerRoom(t.f);
    p.zone.emit(r.gate.x, r.gate.y, { e: Ev.FX, fx: Fx.TELEPORT, x: r.gate.x | 0, y: r.gate.y | 0, r: 80, ms: 1200, a: 0 }, p.id);
    p.markSave();
  }
  private towerKill(p: Player, m: Monster) {
    const t = this.towerProg(p);
    if (m.sp.floor !== t.f || t.done) return;
    const ft = TUNING.tower.floors[t.f - 1]; if (!ft) return;
    if (ft.puzzle === 'kill') {
      t.n++;
      if (t.n >= ft.kills) this.towerDone(p, t, 'Kat temizlendi! Kuzeydeki kapı açıldı.');
    } else if (ft.puzzle === 'key') {
      t.n++;
      if (rnd() < TUNING.tower.keyChance || t.n >= 15) { t.key = true; this.sendJson(p, { t: 'loot', name: 'Kat Anahtarı', rarity: 'orange' }); this.towerDone(p, t, 'Kat Anahtarı bulundu! Kapı açıldı.'); }
    } else if (ft.puzzle === 'boss' && m.def.boss) {
      t.clears = (t.clears ?? 0) + 1;
      this.towerDone(p, t, 'Azrail yenildi! Kapıdan çıkıp zaferini kutla.');
      const msg = JSON.stringify({ t: 'chat', ch: 'world', from: 'Kadim Kule', text: `${p.char.name} Azrail'i yendi ve Kadim Kule'yi fethetti!`, cls: '', gm: true });
      for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
    }
    this.towerSend(p);
  }
  /** Kuledeki oyuncular: kat taşları, sunaklar, kapı (2 tikte bir). */
  private tickTower(z: Zone) {
    for (const p of z.playerSet) {
      if (p.dead) continue;
      const t = this.towerProg(p), ft = TUNING.tower.floors[t.f - 1];
      if (!ft) continue;
      const room = towerRoom(t.f, ft.puzzle);
      // kapı: görev bittiyse üst kata (son katta köye)
      if (dist(p, room.gate) < GATE_R) {
        if (t.done) {
          if (t.f >= TOWER_FLOORS) { this.towerExit(p, true); continue; }
          this.towerSetFloor(p, t.f + 1); continue;
        }
        if (this.now - p.towerGateNote > 4000) { p.towerGateNote = this.now; this.notice(p, 'Kapı mühürlü: önce bu katın görevini tamamla.'); }
      }
      if (t.done || !room.plates.length) continue;
      let on = -1;
      for (let i = 0; i < room.plates.length; i++) if (dist(p, room.plates[i]) < PLATE_R) { on = i; break; }
      if (ft.puzzle === 'altar') {
        // sunak: üzerinde 3 sn durunca yanar; ilk yanandan sonra 60 sn içinde üçü de yanmalı
        if (t.altAt && this.now - t.altAt > ALTAR_WINDOW_MS) { t.alt = 0; t.altAt = 0; this.notice(p, 'Sunakların ateşi söndü. Yeniden dene.'); this.towerSend(p); }
        if (on < 0 || ((t.alt ?? 0) & (1 << on))) { p.altarHold = null; continue; }
        if (!p.altarHold || p.altarHold.i !== on) { p.altarHold = { i: on, since: this.now }; this.sendJson(p, { t: 'towerHold', i: on, ms: ALTAR_HOLD_MS }); continue; }
        if (this.now - p.altarHold.since >= ALTAR_HOLD_MS) {
          t.alt = (t.alt ?? 0) | (1 << on); if (!t.altAt) t.altAt = this.now; p.altarHold = null;
          const pl = room.plates[on]; z.emit(pl.x, pl.y, { e: Ev.FX, fx: Fx.TELEPORT, x: pl.x | 0, y: pl.y | 0, r: 60, ms: 900, a: 0 }, p.id);
          if (t.alt === 7) this.towerDone(p, t, 'Üç sunak da yandı! Kapı açıldı.');
          this.towerSend(p);
        }
        continue;
      }
      if (on === p.towerPlate) continue;
      p.towerPlate = on;
      if (on < 0) continue;
      if (ft.puzzle === 'seq' && t.seq) {
        if (t.seq[t.si ?? 0] === on) {
          t.si = (t.si ?? 0) + 1;
          if (t.si >= t.seq.length) this.towerDone(p, t, 'Mühürler doğru sırayla açıldı! Kapı açıldı.');
        } else {
          this.towerZap(p, 0.12, `Yanlış mühür! Sıra: ${t.seq.map((i) => SEQ_NAMES[i]).join(' → ')}. Baştan başla.`);
          t.si = 0;
          this.sendJson(p, { t: 'towerReplay' });
        }
        this.towerSend(p);
      } else if (ft.puzzle === 'riddle' && t.opts) {
        if (t.opts[on] === 0) this.towerDone(p, t, 'Doğru cevap! Bilge taşlar kapıyı açtı.');
        else {
          this.towerZap(p, 0.1, 'Yanlış cevap! Taşlar seni girişe fırlattı. Yeni bilmece seni bekliyor.');
          this.towerPuzzleInit(t); t.n = 0;
          this.moveToZone(p, z, room.entry.x, room.entry.y); p.towerPlate = -1;
        }
        this.towerSend(p);
      }
    }
  }
  /** Bulmaca cezası: canın bir kısmı (öldürmez) */
  private towerZap(p: Player, frac: number, msg: string) {
    const dmg = Math.min(Math.max(0, Math.round(p.hp) - 1), Math.round(p.stats.maxHp * frac));
    if (dmg > 0) { p.hp -= dmg; p.dirty |= Upd.HP; p.zone.emit(p.x, p.y, { e: Ev.DAMAGE, src: p.id, tgt: p.id, amount: dmg, flags: 0 }); }
    this.notice(p, msg, 'error');
  }
  private towerExit(p: Player, won: boolean) {
    const town = this.zones.get('bazaar')!;
    const n = town.layout.npcs.find((x) => x.id === 'bekci');
    const t = p.char.misc.tower;
    if (t) { t.f = 1; t.n = 0; delete t.done; }
    this.moveToZone(p, town, (n?.x ?? town.layout.spawn.x) + 60, (n?.y ?? town.layout.spawn.y) + 70);
    this.sendJson(p, { t: 'tower', f: 0 });
    if (won) this.notice(p, 'Kadim Kule\'den zaferle döndün!', 'ok');
    this.save(p);
  }
  private cmdTower(p: Player, op: string) {
    const T = TUNING.tower;
    if (op === 'state') return this.towerSend(p);
    if (op === 'leave') {
      if (p.zone.id !== TOWER_MAP) return;
      if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken kuleden çıkamazsın.');
      return this.towerExit(p, false);
    }
    if (op === 'enter') {
      if (!T.enabled) return this.notice(p, 'Kadim Kule şu an kapalı.');
      if (p.dead) return;
      if (p.zone.id !== 'bazaar' || !this.nearNpc(p, 'bekci')) return this.notice(p, 'Zindan Bekçisi\'nin yanına git.');
      if (p.char.level < T.minLevel) return this.notice(p, `Kadim Kule için en az ${T.minLevel}. seviye gerekir.`);
      this.towerSetFloor(p, 1);
    }
  }
  // ───────────────────────────── görevler ─────────────────────────────
  private qs(p: Player) { return (p.char.misc.quests ??= { a: {}, d: {} }); }
  /** Görevin hedef ilerlemesi (gösterilen = teslimde denetlenen) */
  private questProg(p: Player, q: QuestDef, i: number): number {
    const o = q.objs[i], st = this.qs(p).a[q.id];
    if (o.kind === 'collect') return p.char.materials[o.key] ?? 0;
    if (o.kind === 'level') return p.char.level;
    return st?.p[i] ?? 0;
  }
  private questReady(p: Player, q: QuestDef) {
    if (!q.objs.every((o, i) => this.questProg(p, q, i) >= o.n)) return false;
    // aynı malzemeyi isteyen birden çok hedef: toplam miktar denetlenir (eksiye düşüp çoğaltma olmasın)
    const need: Record<string, number> = {};
    for (const o of q.objs) if (o.kind === 'collect') need[o.key] = (need[o.key] ?? 0) + o.n;
    return Object.entries(need).every(([k, n]) => (p.char.materials[k] ?? 0) >= n);
  }
  private questOpen(p: Player, q: QuestDef): string | null {
    const s = this.qs(p), c = p.char;
    if (q.off) return 'Bu görev şu an verilmiyor.';
    if (s.a[q.id]) return 'Bu görev zaten sende.';
    if (q.repeat === 'daily' ? s.d[q.id] === trDayKey(this.now) : !!s.d[q.id]) return q.repeat === 'daily' ? 'Bu görevi bugün tamamladın; yarın yeniden alabilirsin.' : 'Bu görevi tamamladın.';
    if (q.prereq && !s.d[q.prereq]) return 'Önce önceki görevi tamamlamalısın.';
    if (c.level < q.minLevel) return `Bu görev için ${q.minLevel}. seviye gerekir.`;
    if (Object.keys(s.a).length >= QUEST_MAX_ACTIVE) return `En çok ${QUEST_MAX_ACTIVE} görev alabilirsin.`;
    return null;
  }
  private questKill(p: Player, m: Monster) {
    const s = p.char.misc.quests; if (!s) return;
    for (const [id, st] of Object.entries(s.a)) {
      const q = TUNING.quests.find((x) => x.id === id); if (!q) continue;
      q.objs.forEach((o, i) => {
        if (o.kind !== 'kill' || (o.key !== 'any' && o.key !== m.def.id) || (o.map && o.map !== 'any' && o.map !== p.zone.id)) return;
        if ((st.p[i] ?? 0) >= o.n) return;
        st.p[i] = (st.p[i] ?? 0) + 1;
        if (st.p[i] === o.n || st.p[i] % Math.max(1, Math.ceil(o.n / 5)) === 0) this.notice(p, `Görev · ${q.name}: ${st.p[i]}/${o.n}${st.p[i] === o.n ? ' ✔' : ''}`, st.p[i] === o.n ? 'ok' : 'info');
      });
    }
    p.selfDirty |= 1;
  }
  private questTalk(p: Player, npc: string) {
    const s = p.char.misc.quests; if (!s) return;
    let ch = false;
    for (const [id, st] of Object.entries(s.a)) {
      const q = TUNING.quests.find((x) => x.id === id); if (!q) continue;
      q.objs.forEach((o, i) => { if (o.kind === 'talk' && o.key === npc && !(st.p[i] >= 1)) { st.p[i] = 1; ch = true; this.notice(p, `Görev · ${q.name}: haber ulaştırıldı ✔`, 'ok'); } });
    }
    if (ch) { p.selfDirty |= 1; p.markSave(); }
  }
  private questTower(p: Player, f: number) {
    const s = p.char.misc.quests; if (!s) return;
    for (const [id, st] of Object.entries(s.a)) {
      const q = TUNING.quests.find((x) => x.id === id); if (!q) continue;
      q.objs.forEach((o, i) => { if (o.kind === 'tower' && (st.p[i] ?? 0) < f) { st.p[i] = f; if (f === o.n) this.notice(p, `Görev · ${q.name}: ${f}. kata ulaştın ✔`, 'ok'); } });
    }
    p.selfDirty |= 1;
  }
  private cmdQuest(p: Player, op: string, id: string, req: string) {
    const q = TUNING.quests.find((x) => x.id === id);
    const s = this.qs(p), c = p.char;
    const R = (ok: boolean, msg: string) => this.reply(p, { t: 'quest', req }, ok, msg);
    if (!q) { if (op === 'abandon' && s.a[id]) { delete s.a[id]; p.selfDirty |= 1; p.markSave(); return R(true, 'Görev bırakıldı.'); } return R(false, 'Böyle bir görev yok.'); }
    if (op === 'abandon') { if (!s.a[id]) return; delete s.a[id]; p.selfDirty |= 1; p.markSave(); return R(true, `"${q.name}" bırakıldı.`); }
    if (op === 'accept') {
      if (!this.nearNpc(p, q.giver)) return R(false, 'Görevi veren NPC\'nin yanına git.');
      const err = this.questOpen(p, q); if (err) return R(false, err);
      s.a[id] = { p: q.objs.map(() => 0), day: trDayKey(this.now) };
      // "konuş" hedefi görevi veren NPC ise hemen tamam (anlamsız bekleme olmasın)
      q.objs.forEach((o, i) => { if (o.kind === 'talk' && o.key === q.giver) s.a[id].p[i] = 1; });
      p.selfDirty |= 1; p.markSave();
      return R(true, `Görev alındı: ${q.name}`);
    }
    if (op === 'turnin') {
      if (!s.a[id]) return R(false, 'Bu görev sende değil.');
      if (!this.nearNpc(p, q.turnin)) return R(false, 'Görevi teslim alacak NPC\'nin yanına git.');
      if (this.seenReceipt(p, req)) return;
      if (!this.questReady(p, q)) return R(false, 'Görevin hedefleri henüz tamamlanmadı.');
      const items = q.reward.items.filter((x) => x.kind === 'item').reduce((a, x) => a + x.qty, 0);
      if (c.bag.length + items > BAG_EQUIP_CAP) return R(false, 'Ödül için çantada yer aç.');
      for (const o of q.objs) if (o.kind === 'collect') c.materials[o.key] -= o.n;
      const rw = q.reward, lines: string[] = [];
      if (rw.gems) { c.gems += rw.gems; lines.push(`${rw.gems.toLocaleString('tr-TR')} Mücevher`); }
      if (rw.essence) { c.essence += rw.essence; lines.push(`${rw.essence.toLocaleString('tr-TR')} Öz`); }
      if (rw.cp) { c.cp += rw.cp; lines.push(`${rw.cp} ÇP`); }
      for (const it of rw.items) {
        if (it.kind === 'item') {
          if (!ITEM_TPL.has(it.key)) continue;
          const r = (RARITIES as readonly string[]).includes(it.rarity ?? '') ? it.rarity as Rarity : 'blue';
          for (let k = 0; k < it.qty; k++) { const x = makeItem(it.key, r, 'quest'); c.bag.push(x); lines.push(itemDisplayName(x)); }
        } else if (MATERIAL.has(it.key) || MALL.has(it.key)) { c.materials[it.key] = (c.materials[it.key] ?? 0) + it.qty; lines.push(`${it.qty}× ${MATERIAL.get(it.key)?.name ?? MALL.get(it.key)?.name}`); }
      }
      if (rw.xp) { this.addXp(p, rw.xp); lines.push(`${rw.xp.toLocaleString('tr-TR')} TP`); }
      delete s.a[id]; s.d[id] = trDayKey(this.now);
      p.selfDirty |= 1 | 2 | 4; this.save(p, true);
      this.sendJson(p, { t: 'chestResult', title: `Görev tamamlandı: ${q.name}`, rewards: lines.length ? lines : ['Teşekkürler!'] });
      return;
    }
  }

  /** Üretim (Pakize): girdiler ve bedel tek adımda düşülür; başarıda çıktı, başarısızlıkta malzemelerin yarısı döner. */
  private cmdCraft(p: Player, id: string, req: string) {
    const r = TUNING.crafts.find((x) => x.id === id && !x.off);
    if (!r) return this.reply(p, { t: 'craft', req }, false, 'Bu tarif artık yok.');
    if (p.zone.id !== 'bazaar' || !this.nearNpc(p, 'pakize')) return this.reply(p, { t: 'craft', req }, false, 'Zanaatkâr Pakize\'nin yanına git.');
    if (this.seenReceipt(p, req)) return;
    const c = p.char;
    if (c.level < r.minLevel) return this.reply(p, { t: 'craft', req }, false, `Bu tarif için ${r.minLevel}. seviye gerekir.`);
    for (const [k, q] of Object.entries(r.inputs)) if ((c.materials[k] ?? 0) < q) return this.reply(p, { t: 'craft', req }, false, `Yeterli ${MATERIAL.get(k)?.name ?? MALL.get(k)?.name ?? k} yok (${q} gerekir).`);
    if (c.gems < r.gems) return this.reply(p, { t: 'craft', req }, false, `${r.gems.toLocaleString('tr-TR')} Mücevher gerekir.`);
    if (c.essence < r.essence) return this.reply(p, { t: 'craft', req }, false, `${r.essence.toLocaleString('tr-TR')} Öz gerekir.`);
    let tpl = r.out.key;
    if (r.out.kind === 'item') {
      if (/^[wah]_cls$/.test(tpl)) tpl = tpl.replace('cls', c.cls);
      if (!ITEM_TPL.has(tpl)) return this.reply(p, { t: 'craft', req }, false, 'Tarifin çıktısı geçersiz.');
      if (c.bag.length + r.out.qty > BAG_EQUIP_CAP) return this.reply(p, { t: 'craft', req }, false, 'Çantada yer aç.');
    } else if (!MATERIAL.has(tpl) && !MALL.has(tpl)) return this.reply(p, { t: 'craft', req }, false, 'Tarifin çıktısı geçersiz.');
    c.gems -= r.gems; c.essence -= r.essence;
    for (const [k, q] of Object.entries(r.inputs)) c.materials[k] -= q;
    const ok = rnd() * 100 < r.chance;
    let got = '';
    if (ok) {
      if (r.out.kind === 'item') {
        const rar = (RARITIES as readonly string[]).includes(r.out.rarity ?? '') ? r.out.rarity as Rarity : 'blue';
        for (let i = 0; i < r.out.qty; i++) { const it = makeItem(tpl, rar, 'craft'); c.bag.push(it); got = itemDisplayName(it); }
      } else { c.materials[tpl] = (c.materials[tpl] ?? 0) + r.out.qty; got = `${r.out.qty}× ${MATERIAL.get(tpl)?.name ?? MALL.get(tpl)?.name ?? tpl}`; }
    } else for (const [k, q] of Object.entries(r.inputs)) c.materials[k] += Math.floor(q / 2);
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.sendJson(p, { t: 'craftResult', ok, name: r.name, got });
    this.reply(p, { t: 'craft', req }, true, ok ? `Üretildi: ${got}` : 'Üretim başarısız oldu; malzemelerin yarısı geri döndü.');
  }

  /** Kor Kulesi ganimeti: kat malzemeleri (elit daha cömert), Karademir'de doğrudan düşenler + herkese Kor Sandığı */
  private forgeLoot(p: Player, m: Monster) {
    const T = TUNING.forge, c = p.char;
    const give = (d: { kind: string; key: string; chance: number; qty: [number, number]; rarity?: string }, mul = 1) => {
      if (rnd() >= Math.min(1, d.chance * mul * TUNING.dropMul)) return;
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) return;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = randInt(d.qty[0], d.qty[1]); k > 0; k--) this.dropLoot(p, m, { kind: 'item', item: makeItem(d.key, r, 'drop') });
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) this.dropLoot(p, m, { kind: 'mat', key: d.key, qty: randInt(d.qty[0], d.qty[1]) });
    };
    if (m.def.id === 'f_boss') {
      for (const d of T.boss.drops) give(d);
      c.materials.forge_chest = (c.materials.forge_chest ?? 0) + 1;
      this.sendJson(p, { t: 'loot', name: '1× Kor Sandığı', rarity: 'orange' });
      return;
    }
    const fl = T.floors[Math.max(0, Math.min(T.floors.length - 1, (this.forge.runs.get(m.sp.forge!)?.floor ?? 1) - 1))];
    const mul = m.variant === 2 ? T.eliteLoot : 1;
    for (const d of fl?.mats ?? []) give({ kind: 'mat', ...d }, mul);
  }
  /** Kristal Sandık (etkinlikten): içerik yönetimin Etkinlikler bölümünden */
  private openCrystalChest(p: Player) {
    const c = p.char, ch = TUNING.events.chest;
    if ((c.materials.crystal_chest ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
    const items = ch.drops.filter((d) => d.kind === 'item');
    if (items.length && c.bag.length + items.reduce((a, d) => a + d.qty[1], 0) > BAG_EQUIP_CAP) return this.notice(p, 'Sandığı açmak için çantada yer aç.');
    c.materials.crystal_chest -= 1;
    const rewards: string[] = [];
    const gems = randInt(ch.gems[0], ch.gems[1]), ess = randInt(ch.essence[0], ch.essence[1]);
    if (gems) { c.gems += gems; rewards.push(`${gems.toLocaleString('tr-TR')} Mücevher`); }
    if (ess) { c.essence += ess; rewards.push(`${ess.toLocaleString('tr-TR')} Öz`); }
    for (const d of ch.drops) {
      if (rnd() >= d.chance) continue;
      const q = randInt(d.qty[0], d.qty[1]);
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) continue;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = 0; k < q; k++) { const it = makeItem(d.key, r, 'chest'); c.bag.push(it); rewards.push(itemDisplayName(it)); }
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) {
        c.materials[d.key] = (c.materials[d.key] ?? 0) + q;
        rewards.push(`${q}× ${MATERIAL.get(d.key)?.name ?? MALL.get(d.key)?.name ?? d.key}`);
      }
    }
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.sendJson(p, { t: 'chestResult', title: 'Kristal Sandık', rewards: rewards.length ? rewards : ['Sandık boş çıktı'] });
  }

  private openForgeChest(p: Player) {
    const c = p.char, ch = TUNING.forge.chest;
    if ((c.materials.forge_chest ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
    const items = ch.drops.filter((d) => d.kind === 'item');
    if (items.length && c.bag.length + items.reduce((a, d) => a + d.qty[1], 0) > BAG_EQUIP_CAP) return this.notice(p, 'Sandığı açmak için çantada yer aç.');
    c.materials.forge_chest -= 1;
    const rewards: string[] = [];
    const gems = randInt(ch.gems[0], ch.gems[1]), ess = randInt(ch.essence[0], ch.essence[1]);
    if (gems) { c.gems += gems; rewards.push(`${gems.toLocaleString('tr-TR')} Mücevher`); }
    if (ess) { c.essence += ess; rewards.push(`${ess.toLocaleString('tr-TR')} Öz`); }
    for (const d of ch.drops) {
      if (rnd() >= d.chance) continue;
      const q = randInt(d.qty[0], d.qty[1]);
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) continue;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = 0; k < q; k++) { const it = makeItem(d.key, r, 'chest'); c.bag.push(it); rewards.push(itemDisplayName(it)); }
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) {
        c.materials[d.key] = (c.materials[d.key] ?? 0) + q;
        rewards.push(`${q}× ${MATERIAL.get(d.key)?.name ?? MALL.get(d.key)?.name ?? d.key}`);
        if (d.key === 'evo_crystal') rewards.unshift('★ Evrim Kristali');
      }
    }
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.sendJson(p, { t: 'chestResult', title: 'Kor Sandığı', rewards: rewards.length ? rewards : ['Sandık boş çıktı'] });
  }

  /**
   * Silah / zırh evrimi (Demirci Haso): eşyanın av sayacı kademenin istediğine ulaşınca Mücevher ve malzemeyle bir
   * üst kademeye geçer; sayaç sıfırlanır (sonraki kademe yeniden av ister). Silahta saldırı, zırhta savunma artar.
   */
  private cmdEvolve(p: Player, itemId: string, req: string) {
    const c = p.char, E = TUNING.evo;
    const R = (ok: boolean, msg: string) => this.reply(p, { t: 'evolve', req }, ok, msg);
    if (!E.enabled) return R(false, 'Evrim şu an kapalı.');
    if (p.zone.id !== 'bazaar' || !this.nearNpc(p, 'haso')) return R(false, 'Demirci Haso\'nun yanına git.');
    const it = c.bag.find((x) => x.id === itemId) ?? Object.values(c.equip).find((x) => x?.id === itemId);
    if (!it) return R(false, 'Eşya bulunamadı.');
    const tpl = ITEM_TPL.get(it.tpl);
    if (!tpl || (tpl.slot !== 'weapon' && tpl.slot !== 'armor')) return R(false, 'Yalnız silah ve zırh evrilir.');
    const cur = it.evo ?? 0;
    if (cur >= EVO_TIERS) return R(false, 'Bu eşya son evrim kademesinde.');
    const st = E[tpl.slot][cur];
    if ((it.kills ?? 0) < st.kills) return R(false, `Bu kademe için ${st.kills.toLocaleString('tr-TR')} canavar öldürmesi gerekir (şu an ${(it.kills ?? 0).toLocaleString('tr-TR')}).`);
    if (c.gems < st.gems) return R(false, `${st.gems.toLocaleString('tr-TR')} Mücevher gerekir.`);
    for (const [k, q] of Object.entries(st.mats)) if ((c.materials[k] ?? 0) < q) return R(false, `${q}× ${MATERIAL.get(k)?.name ?? k} gerekir (sende ${c.materials[k] ?? 0}).`);
    c.gems -= st.gems;
    for (const [k, q] of Object.entries(st.mats)) c.materials[k] -= q;
    it.evo = cur + 1; it.kills = 0;
    const equipped = Object.values(c.equip).includes(it);
    if (equipped) { p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; this.relook(p); }
    p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    p.zone.emit(p.x, p.y, { e: Ev.FX, fx: Fx.LEVELUP, x: p.x | 0, y: p.y | 0, r: 120, ms: 1400, a: 0 });
    this.sendJson(p, { t: 'evolved', item: it.id, evo: it.evo, name: itemDisplayName(it) });
    if (it.evo === EVO_TIERS) {
      const msg = JSON.stringify({ t: 'chat', ch: 'world', from: 'Demirci Haso', text: `${c.name} ${itemDisplayName(it)} eşyasını son kademeye (${EVO_NAMES[EVO_TIERS]}) evriltti!`, cls: '', gm: true });
      for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
    }
    return R(true, `${itemDisplayName(it)}: ${it.evo}. evrim tamam! ${tpl.slot === 'weapon' ? 'Saldırı' : 'Savunma'} +${st.add}.`);
  }
  /** Görünüm değişti (silah/zırh, evrim): çevredeki oyuncular karakteri yeniden kurar */
  private relook(p: Player) { for (const q of p.zone.playerSet) if (q !== p) q.known.delete(p.id); }

  private openAzrailChest(p: Player) {
    const c = p.char, ch = TUNING.tower.chest;
    if ((c.materials.azrail_chest ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
    const items = ch.drops.filter((d) => d.kind === 'item');
    if (items.length && c.bag.length + items.reduce((a, d) => a + d.qty[1], 0) > BAG_EQUIP_CAP) return this.notice(p, 'Sandığı açmak için çantada yer aç.');
    c.materials.azrail_chest -= 1;
    const rewards: string[] = [];
    const gems = randInt(ch.gems[0], ch.gems[1]), ess = randInt(ch.essence[0], ch.essence[1]);
    if (gems) { c.gems += gems; rewards.push(`${gems.toLocaleString('tr-TR')} Mücevher`); }
    if (ess) { c.essence += ess; rewards.push(`${ess.toLocaleString('tr-TR')} Öz`); }
    for (const d of ch.drops) {
      if (rnd() >= d.chance) continue;
      const q = randInt(d.qty[0], d.qty[1]);
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) continue;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = 0; k < q; k++) { const it = makeItem(d.key, r, 'chest'); c.bag.push(it); rewards.push(itemDisplayName(it)); }
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) {
        c.materials[d.key] = (c.materials[d.key] ?? 0) + q;
        rewards.push(`${q}× ${MATERIAL.get(d.key)?.name ?? MALL.get(d.key)?.name ?? d.key}`);
      }
    }
    if (rnd() < ch.hookChance) {
      c.materials.azrail_hook = (c.materials.azrail_hook ?? 0) + 1;
      rewards.unshift('★ Azrail Kancası');
      const msg = JSON.stringify({ t: 'chat', ch: 'world', from: 'Kadim Kule', text: `${c.name} Azrail Sandığı'ndan Azrail Kancası çıkardı!`, cls: '', gm: true });
      for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
    }
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.sendJson(p, { t: 'chestResult', title: 'Azrail Sandığı', rewards: rewards.length ? rewards : ['Sandık boş çıktı'] });
  }

  // ───────────────────────────── loncalar ─────────────────────────────
  private guildWars: GuildWarInfo[] = [];
  private guildTax = new Map<string, number>();
  guildSet(charId: number, g: GuildTag | null) {
    const p = this.byCharId(charId); if (!p) return;
    const before = p.guild ? `${p.guild.gid}|${p.guild.emblem}|${p.guild.name}` : '';
    p.guild = g;
    // ad etiketi değiştiyse çevredekiler oyuncuyu yeniden alsın
    if ((g ? `${g.gid}|${g.emblem}|${g.name}` : '') !== before) for (const q of p.zone.playerSet) q.known.delete(p.id);
  }
  /** Lonca kurma bedeli: seviye ve mücevher kanal sunucusunda denetlenip düşülür */
  guildCharge(sid: number, req: string, gems: number, minLevel: number) {
    const p = this.bySid.get(sid);
    const no = (err: string) => this.opt.post({ type: 'guild_charged', sid, req, ok: false, err });
    if (!p) return no('Oyunda değilsin.');
    if (p.guild) return no('Zaten bir loncadasın.');
    if (p.char.level < minLevel) return no(`Lonca kurmak için ${minLevel}. seviye gerekir.`);
    if (p.char.gems < gems) return no(`Lonca kurmak için ${gems.toLocaleString('tr-TR')} Mücevher gerekir.`);
    p.char.gems -= gems; p.selfDirty |= 1; this.save(p, true);
    this.opt.post({ type: 'guild_charged', sid, req, ok: true });
  }
  setGuildWars(wars: GuildWarInfo[]) { this.guildWars = wars; this.guildWarSweep(); }
  flushGuildTax() {
    if (!this.guildTax.size) return;
    const items: [number, number, number][] = [...this.guildTax].map(([k, n]) => { const [g, c] = k.split(':').map(Number); return [g, c, n]; });
    this.guildTax.clear();
    this.opt.post({ type: 'guild_tax', items });
  }
  private warOf(p: Player) { const g = p.guild?.gid; return g ? this.guildWars.find((w) => w.a === g || w.b === g) : undefined; }
  private warPoint(w: GuildWarInfo, p: Player) {
    const l = this.zones.get('guildwar')!.layout, side = p.guild?.gid === w.a ? -1 : 1;
    return { x: l.spawn.x + side * 11 * 64 + (rnd() - 0.5) * 120, y: l.spawn.y + (rnd() - 0.5) * 300 };
  }
  guildWarJoin(sid: number, side: 0 | 1) {
    const p = this.bySid.get(sid); if (!p) return;
    const w = this.warOf(p);
    if (!w || this.now > w.endsAt) return this.notice(p, 'Loncan şu an savaşta değil.');
    if (p.dead) return this.notice(p, 'Önce dirilmelisin.');
    if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken meydana geçemezsin.');
    void side;
    const z = this.zones.get('guildwar')!, pt = this.warPoint(w, p);
    this.moveToZone(p, z, pt.x, pt.y);
    this.arenaProt.set(p.char.id, Math.max(this.now, w.startAt) + 4000);
    this.notice(p, this.now < w.startAt ? `Savaş ${Math.ceil((w.startAt - this.now) / 1000)} sn sonra başlıyor. Hazırlan!` : 'Savaş Meydanı\'ndasın. Rakip loncayı yen!', 'ok');
  }
  /** Savaşı bitmiş ya da loncası savaşmayan oyuncular meydandan köye döner */
  private guildWarSweep() {
    const z = this.zones.get('guildwar'); if (!z || !z.playerSet.size) return;
    const town = this.zones.get('bazaar')!;
    for (const p of [...z.playerSet]) {
      const w = this.warOf(p);
      if (w && this.now <= w.endsAt + 3000) continue;
      if (p.dead) { p.dead = false; p.hp = p.stats.maxHp; p.anim = Anim.IDLE; p.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS; this.sendJson(p, { t: 'respawned', hp: p.hp }); }
      this.moveToZone(p, town, town.layout.spawn.x + (rnd() - 0.5) * 100, town.layout.spawn.y + (rnd() - 0.5) * 80);
      if (w || this.guildWars.length === 0) this.notice(p, 'Lonca savaşı bitti; köye döndün.', 'info');
    }
  }

  private cmdTravel(p: Player, mapId: string, confirm: boolean, req: string) {
    const def = MAPS[mapId];
    if (!def || !def.travelable) return this.notice(p, 'Bu bölgeye ışınlanılamaz.');
    if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken ışınlanamazsın.');
    if (p.char.level < def.minLevel) return this.notice(p, `${def.name} için seviye ${def.minLevel} gerekir.`);
    if (def.dropPenalty === 'gems5' && !confirm) {
      this.sendJson(p, { t: 'confirmTravel', map: mapId, text: `${def.name} açık PvP bölgesidir. Başka bir oyuncu tarafından öldürülürsen elindeki Mücevherin %5'ini kaybedersin. Ekipman korunur.` });
      return;
    }
    if (this.seenReceipt(p, req)) return;
    const z = this.zones.get(mapId)!;
    this.moveToZone(p, z, z.layout.spawn.x, z.layout.spawn.y);
  }

  private cmdLocalChat(p: Player, c: Extract<ClientCmd, { t: 'chat' }>) {
    if (c.ch !== 'local') return;
    const text = sanitizeChat(String(c.text ?? ''), CHAT_MAX);
    if (!text) return;
    const now = this.now;
    p.chatTimes = p.chatTimes.filter((t) => now - t < 10_000);
    if (p.chatTimes.length >= 6) return this.notice(p, 'Çok hızlı yazıyorsun.');
    p.chatTimes.push(now);
    const msg = JSON.stringify({ t: 'chat', ch: 'local', from: p.char.name, cls: p.char.cls, text, id: p.id });
    for (const q of p.zone.playerSet) this.pushOut(q.sid, msg);
    this.opt.post({ type: 'chatlog', from: p.char.name, text, map: p.zone.id });
  }

  // ───────────────────────────── çıktı ─────────────────────────────
  private pushOut(sid: number, data: string | ArrayBuffer) {
    this.out.push([sid, data]);
    if (typeof data !== 'string') this.transfer.push(data);
    this.msgsOut++;
    this.bytesOut += typeof data === 'string' ? data.length : data.byteLength;
  }
  sendJson(p: Player, o: unknown) { this.pushOut(p.sid, JSON.stringify(o)); }
  // ───────────────────────────── pazar: bağımsız dükkânlar ─────────────────────────────
  /**
   * Dükkân, sahibinden bağımsız bir dünya nesnesidir: eşyalar sahibinin çantasından dükkâna geçer,
   * sahip serbestçe dolaşır, oyundan çıksa da dükkân açık kalır. Satış parası sahibi bu kanaldaysa
   * hemen cüzdanına, değilse `pending` defterine yazılır ve sahibi kanala girdiğinde teslim edilir.
   * Her değişiklik, etkilenen karakterlerle birlikte tek mesajla (tek işlemde yazılmak üzere) kaydedilir.
   */
  market: MarketState = { v: 1, stalls: [], pending: {} };
  loadMarket(raw: unknown) {
    const st = sanitizeMarket(raw);
    // yükleme gelmeden açılmış dükkân olursa korunur (aynı kimlik iki kez eklenmez)
    const have = new Set(this.market.stalls.map((s) => s.id));
    for (const s of st.stalls) if (!have.has(s.id) && !this.market.stalls.some((q) => q.ownerId === s.ownerId)) this.market.stalls.push(s);
    for (const [k, v] of Object.entries(st.pending)) { const cur = this.market.pending[k]; this.market.pending[k] = cur ? { gems: cur.gems + v.gems, sales: [...cur.sales, ...v.sales].slice(-30) } : v; }
    for (const z of this.zones.values()) if (z.def.market) this.broadcastStalls(z);
    for (const p of this.bySid.values()) { this.deliverEarnings(p); this.sendMyStall(p); }
  }
  /** Pazar durumunu ve aynı işlemde yazılacak karakterleri ana sürece bildirir. */
  private persistMarket(players: Player[]) {
    const chars = players.map((q) => this.snapshotChar(q));
    this.opt.post({ type: 'market', channel: this.opt.channel, state: structuredClone(this.market), chars });
  }
  private stallList(z: Zone) {
    return this.market.stalls.filter((s) => s.zone === z.id).map((s) => ({ id: s.id, ownerId: s.ownerId, name: s.ownerName, title: s.title, x: Math.round(s.x), y: Math.round(s.y), n: s.items.length, ...(s.skin ? { skin: s.skin } : {}) }));
  }
  private sendStalls(p: Player) { if (p.zone.def.market) this.sendJson(p, { t: 'stalls', list: this.stallList(p.zone) }); }
  private broadcastStalls(z: Zone) {
    const msg = JSON.stringify({ t: 'stalls', list: this.stallList(z) });
    for (const q of z.playerSet) this.pushOut(q.sid, msg);
  }
  private ownStall(charId: number) { return this.market.stalls.find((s) => s.ownerId === charId) ?? null; }
  private sendMyStall(p: Player) {
    const s = this.ownStall(p.char.id);
    this.sendJson(p, { t: 'mystall', stall: s ? { id: s.id, title: s.title, zone: s.zone, x: s.x, y: s.y, items: s.items, earned: s.earned, openedAt: s.openedAt } : null });
  }
  /** Sahip yokken yapılan satışların parası: kanala girince cüzdana geçer. */
  private deliverEarnings(p: Player) {
    const key = String(p.char.id), due = this.market.pending[key];
    if (!due || due.gems <= 0) return;
    delete this.market.pending[key];
    p.char.gems += due.gems; p.selfDirty |= 1;
    const lines = due.sales.slice(-5).map((x) => `${x.buyer}: ${x.name} (${x.price.toLocaleString('tr-TR')})`).join(', ');
    this.notice(p, `Sen yokken dükkânın ${due.sales.length} satış yaptı: +${due.gems.toLocaleString('tr-TR')} Mücevher. ${lines}`, 'ok');
    this.sendJson(p, { t: 'stall_away', gems: due.gems, sales: due.sales });
    this.persistMarket([p]);
  }
  /** Oyuncu kanala girdiğinde: dükkân listesi, kendi dükkânı ve bekleyen kazanç. */
  marketJoin(p: Player) { this.sendStalls(p); this.sendMyStall(p); this.deliverEarnings(p); this.sendJson(p, { t: 'bosses', list: this.bossStatus() }); }

  private cmdStallOpen(p: Player, c: Extract<ClientCmd, { t: 'stall_open' }>) {
    if (this.ownStall(p.char.id)) return this.notice(p, 'Zaten açık bir dükkânın var. Yenisini kurmak için önce onu kapat.');
    const z = p.zone, mk = z.def.market;
    if (!mk) return this.notice(p, 'Dükkân yalnız Pazar Köyü\'ndeki Pazar Meydanı\'nda kurulabilir.');
    if (!inMarket(z.def, p.x, p.y)) return this.notice(p, `Dükkân kurmak için ${mk.name}'na git (köyün doğusu).`);
    for (const s of this.market.stalls) if (s.zone === z.id && Math.hypot(s.x - p.x, s.y - p.y) < STALL_MIN_GAP) return this.notice(p, `Burada ${s.ownerName} dükkân kurmuş. Biraz uzaklaş.`);
    if (this.market.stalls.length >= MARKET_MAX_STALLS) return this.notice(p, 'Pazarda yer kalmadı.');
    const items = Array.isArray(c.items) ? c.items.slice(0, STALL_MAX_ITEMS + 1) : [];
    const mats = Array.isArray(c.mats) ? c.mats.slice(0, STALL_MAX_ITEMS + 1) : [];
    if (items.length + mats.length === 0) return this.notice(p, 'Satmak için en az bir eşya ya da malzeme seç.');
    if (items.length + mats.length > STALL_MAX_ITEMS) return this.notice(p, `Dükkâna en çok ${STALL_MAX_ITEMS} satır konabilir.`);
    // malzeme / Nesne Market yığınları: hepsi çantada olmalı; aynı türden iki yığın birleşik sayılır
    const matPick: { key: string; qty: number; price: number }[] = [], need: Record<string, number> = {};
    for (const m of mats) {
      const key = String(m?.key ?? ''), qty = Math.floor(Number(m?.qty)), price = Math.floor(Number(m?.price));
      if (!(MATERIAL.has(key) || MALL.has(key)) || STALL_NO_SELL.has(key)) return this.notice(p, `${MATERIAL.get(key)?.name ?? MALL.get(key)?.name ?? 'Bu malzeme'} satılamaz.`);
      if (!Number.isFinite(qty) || qty < 1) return this.notice(p, 'Adet en az 1 olmalı.');
      if (!Number.isFinite(price) || price < 1 || price > STALL_MAX_PRICE) return this.notice(p, `Fiyat 1 ile ${STALL_MAX_PRICE.toLocaleString('tr-TR')} Mücevher arasında olmalı.`);
      need[key] = (need[key] ?? 0) + qty;
      if ((p.char.materials[key] ?? 0) < need[key]) return this.notice(p, `${MATERIAL.get(key)?.name ?? MALL.get(key)?.name} çantanda yetmiyor.`);
      matPick.push({ key, qty, price });
    }
    const picked: { idx: number; price: number }[] = [];
    for (const it of items) {
      const id = String(it?.id ?? ''), price = Math.floor(Number(it?.price));
      const idx = p.char.bag.findIndex((b) => b.id === id);
      if (idx < 0) return this.notice(p, 'Seçtiğin bir eşya artık çantanda değil.');
      if (p.char.bag[idx].locked) return this.notice(p, `${itemDisplayName(p.char.bag[idx])} kilitli. Satmak için önce kilidini aç.`);
      if (!Number.isFinite(price) || price < 1 || price > STALL_MAX_PRICE) return this.notice(p, `Fiyat 1 ile ${STALL_MAX_PRICE.toLocaleString('tr-TR')} Mücevher arasında olmalı.`);
      if (!picked.some((q) => q.idx === idx)) picked.push({ idx, price });
    }
    if (this.seenReceipt(p, String(c.req ?? ''))) return;
    // eşyalar çantadan dükkâna geçer (artık kullanılamaz, iki kez satılamaz)
    const moved: StallEntry[] = picked.map(({ idx, price }) => ({ item: p.char.bag[idx], price }));
    const skin = p.char.misc.stallSkin === 2 ? 'emerald' : undefined;
    const ids = new Set(picked.map(({ idx }) => p.char.bag[idx].id));
    p.char.bag = p.char.bag.filter((b) => !ids.has(b.id));
    for (const m of matPick) {
      p.char.materials[m.key] -= m.qty; if (p.char.materials[m.key] <= 0) delete p.char.materials[m.key];
      moved.push({ mat: { id: uuid(), key: m.key, qty: m.qty }, price: m.price });
    }
    const title = sanitizeChat(String(c.title ?? ''), STALL_TITLE_MAX).trim() || `${p.char.name} Dükkânı`;
    this.market.stalls.push({ id: uuid(), ownerId: p.char.id, ownerName: p.char.name, zone: z.id, title, x: Math.round(p.x), y: Math.round(p.y), items: moved, openedAt: this.now, earned: 0, ...(skin ? { skin } : {}) });
    p.selfDirty |= 2;
    this.persistMarket([p]);
    this.sendMyStall(p);
    this.broadcastStalls(z);
    this.notice(p, `Dükkânın açıldı: ${moved.length} satır. İstediğin yere gidebilirsin, oyundan çıksan da açık kalır.`, 'ok');
  }
  private cmdStallClose(p: Player) {
    const s = this.ownStall(p.char.id);
    if (!s) return this.notice(p, 'Açık bir dükkânın yok.');
    const eq = s.items.filter((m) => m.item).length;
    if (p.char.bag.length + eq > BAG_EQUIP_CAP) return this.notice(p, `Dükkândaki ${eq} eşya için çantanda yer aç (${BAG_EQUIP_CAP - p.char.bag.length} boş yer var).`);
    for (const m of s.items) {
      if (m.item) p.char.bag.push(m.item);
      else if (m.mat) p.char.materials[m.mat.key] = (p.char.materials[m.mat.key] ?? 0) + m.mat.qty;
    }
    this.market.stalls = this.market.stalls.filter((q) => q !== s);
    p.selfDirty |= 2;
    this.persistMarket([p]);
    this.sendMyStall(p);
    const z = this.zones.get(s.zone); if (z) this.broadcastStalls(z);
    this.notice(p, s.items.length ? `Dükkânın kapandı, satılmayan ${s.items.length} satır çantana döndü.` : 'Dükkânın kapandı.', 'info');
  }
  private cmdStallView(p: Player, id: string) {
    const s = this.market.stalls.find((q) => q.id === id);
    if (!s || s.zone !== p.zone.id) { this.sendJson(p, { t: 'stall', stall: id, closed: true }); return; }
    const own = s.ownerId === p.char.id;
    if (!own && Math.hypot(s.x - p.x, s.y - p.y) > STALL_VIEW_RANGE) { this.sendJson(p, { t: 'stall', stall: id, far: true, x: s.x, y: s.y, name: s.ownerName, title: s.title }); return; }
    this.sendJson(p, { t: 'stall', stall: id, name: s.ownerName, title: s.title, items: s.items, own });
  }
  private cmdStallBuy(p: Player, c: Extract<ClientCmd, { t: 'stall_buy' }>) {
    const s = this.market.stalls.find((q) => q.id === String(c.stall ?? ''));
    if (!s || s.zone !== p.zone.id) return this.notice(p, 'Bu dükkân kapanmış.');
    if (s.ownerId === p.char.id) return this.notice(p, 'Kendi dükkânından alamazsın.');
    if (Math.hypot(s.x - p.x, s.y - p.y) > STALL_VIEW_RANGE) return this.notice(p, 'Dükkâna biraz daha yaklaş.');
    const idx = s.items.findIndex((m) => stallEntryId(m) === String(c.item ?? ''));
    if (idx < 0) { this.cmdStallView(p, s.id); return this.notice(p, 'Bu eşya satılmış.'); }
    const { item, mat, price } = s.items[idx];
    if (price !== Math.floor(Number(c.price))) { this.cmdStallView(p, s.id); return this.notice(p, 'Fiyat değişmiş, dükkânı yeniledim.'); }
    if (p.char.gems < price) return this.notice(p, `Yeterli Mücevherin yok (${price.toLocaleString('tr-TR')} gerekiyor).`);
    if (item && p.char.bag.length >= BAG_EQUIP_CAP) return this.notice(p, 'Çantan dolu.');
    if (this.seenReceipt(p, String(c.req ?? ''))) return;
    // tek adımda aktarım; para sahibine: kanaldaysa cüzdanına, değilse bekleyen kazanca
    s.items.splice(idx, 1);
    if (item) { delete item.locked; item.src = 'pazar'; p.char.bag.push(item); }
    else if (mat) p.char.materials[mat.key] = (p.char.materials[mat.key] ?? 0) + mat.qty;
    p.char.gems -= price; p.selfDirty |= 1 | 2;
    s.earned += price;
    const name = stallEntryName({ item, mat, price });
    let owner: Player | null = null;
    for (const q of this.bySid.values()) if (q.char.id === s.ownerId) { owner = q; break; }
    if (owner) {
      owner.char.gems += price; owner.selfDirty |= 1;
      this.notice(owner, `Dükkânın sattı: ${p.char.name}, ${name} için ${price.toLocaleString('tr-TR')} Mücevher ödedi.`, 'ok');
      this.sendJson(owner, { t: 'stall_sold', buyer: p.char.name, name, price });
    } else {
      const key = String(s.ownerId), cur = this.market.pending[key] ?? { gems: 0, sales: [] };
      cur.gems += price; cur.sales.push({ buyer: p.char.name, name, price, at: this.now }); cur.sales = cur.sales.slice(-30);
      this.market.pending[key] = cur;
    }
    let closedEmpty = false;
    if (s.items.length === 0) { this.market.stalls = this.market.stalls.filter((q) => q !== s); closedEmpty = true; }
    this.persistMarket(owner ? [p, owner] : [p]);
    this.notice(p, `${name} satın alındı: −${price.toLocaleString('tr-TR')} Mücevher`, 'ok');
    if (owner) { this.sendMyStall(owner); if (closedEmpty) this.notice(owner, 'Dükkânındaki her şey satıldı, dükkân kapandı.', 'info'); }
    const z = this.zones.get(s.zone); if (z) this.broadcastStalls(z);
    this.cmdStallView(p, s.id);
  }

  notice(p: Player, text: string, kind: 'info' | 'error' | 'ok' = 'error') { this.sendJson(p, { t: 'notice', text, kind }); }

  private sendSelf(p: Player, mask: number) {
    const c = p.char;
    const o: Record<string, unknown> = { t: 'self' };
    if (mask & 1) Object.assign(o, { tut: c.misc.tutorial ?? 0, qn: c.misc.qn ?? 0, level: c.level, xp: c.xp, xpNext: xpToNext(c.level), gems: c.gems, essence: c.essence, cp: c.cp, kills: c.kills, autoPotion: !!c.misc.autoPotion, daily: c.misc.dailyKills?.n ?? 0, buffs: c.misc.buffs ?? {}, autoPool: c.misc.autoPool ?? 0, bait: c.misc.bait ?? 0, stallSkin: c.misc.stallSkin ?? 0, autoLeft: this.autoLeft(p), autoOn: p.autoOn, mount: c.misc.mount ?? {}, quests: c.misc.quests ?? { a: {}, d: {} }, towerBest: c.misc.tower?.best ?? 0, rank: c.level >= RANK_LEVEL ? (c.misc.rank ?? null) : null, runes: c.misc.runes ?? { eq: {} } });
    if (mask & 2) Object.assign(o, { bag: c.bag, equip: c.equip, materials: c.materials });
    if (mask & 4) {
      const s = p.stats;
      Object.assign(o, {
        level: c.level, xp: c.xp, xpNext: xpToNext(c.level), statAlloc: c.stats, statRev: c.misc.statRev ?? 0, statBudget: statBudget(c.level), skills: c.skills, spec: c.spec,
        skillBudget: skillUpgradeBudget(c.level), combat: { maxHp: s.maxHp, atk: s.atk, def: s.def, crit: s.crit, critDmg: s.critDmg, speed: Math.round(s.speed), atkSpeed: s.atkSpeed, block: s.block, lifesteal: s.lifesteal, pvpPower: s.pvpPower, pvpResist: s.pvpResist },
      });
    }
    this.sendJson(p, o);
  }
  private sendFullSelf(p: Player) {
    this.sendJson(p, { t: 'char', id: p.char.id, name: p.char.name, cls: p.char.cls, role: p.char.role });
    this.sendSelf(p, 1 | 2 | 4);
  }
  private sendSelfState(p: Player) { this.sendJson(p, { t: 'state', dead: p.dead, hp: Math.round(p.hp) }); }

  private periodicSaves() {
    for (const p of this.bySid.values()) {
      try {
        if (p.selfDirty) { this.sendSelf(p, p.selfDirty); p.selfDirty = 0; }
        if ((p.saveDirty || p.char.kills) && this.now - p.lastSaveAt > this.opt.saveIntervalMs + ((p.sid % 50) * 40)) {
          if (p.saveDirty) this.save(p); else p.lastSaveAt = this.now;
        }
      } catch (e) { console.error('[world] kayıt hatası', p.char.id, (e as Error).message); p.lastSaveAt = this.now; }
    }
  }

  setWorld(health: number, online: number) { this.worldHealth = health; this.online = online; }

  // ───────────────────────────── bosslar: doğma, duyuru, durum ─────────────────────────────
  respawnDelay(def: { id: string; boss?: boolean; respawnMin?: number }) {
    const mt = TUNING.monsters[def.id];
    if (def.boss) return (mt?.respawnMin ?? def.respawnMin ?? 10) * 60_000;
    if (mt?.respawnSec) return mt.respawnSec * 1000;
    if (mt?.respawnMin) return mt.respawnMin * 60_000;
    return (12_000 + rnd() * 8000) * TUNING.respawnMul * (mt?.respawnMul ?? 1);
  }
  /** Kanaldaki bütün bossların durumu: canlı mı, nerede, ne zaman doğacak. */
  bossStatus() {
    const out: { id: string; name: string; map: string; x: number; y: number; alive: boolean; hp: number; nextAt: number | null; level: number; cycleMs: number; off?: boolean }[] = [];
    for (const z of this.zones.values()) {
      for (const sp of z.layout.spawnPoints) {
        const def = MONSTERS.find((d) => d.id === sp.monster);
        if (!def?.boss) continue;
        const m = z.monsterList.find((q) => q.sp === sp);
        const alive = !!m && m.state !== MState.DEAD;
        let nextAt: number | null = null;
        if (!alive) { const r = z.respawnQueue.find((q) => q.sp === sp); nextAt = r ? r.at : m ? m.removeAt + this.respawnDelay(def) : null; }
        const off = def.id === WORLD_BOSS_ID && !TUNING.worldBoss.enabled;
        out.push({ id: def.id, name: def.name, map: z.id, x: Math.round(sp.x), y: Math.round(sp.y), alive, hp: alive && m ? Math.round((m.hp / m.maxHp) * 100) : 0, nextAt, level: sp.level, cycleMs: this.respawnDelay(def), ...(off ? { off } : {}) });
      }
    }
    return out;
  }
  /** Yönetim doğma aralığını kısaltınca bekleyen Dünya Boss'u doğuşu yeni süreye çekilir (uzatınca mevcut sayaç korunur). */
  retimeWorldBoss() {
    const z = this.zones.get(WORLD_BOSS_MAP); if (!z) return;
    const def = MONSTERS.find((d) => d.id === WORLD_BOSS_ID); if (!def) return;
    let changed = false;
    for (const r of z.respawnQueue) if (r.sp.monster === WORLD_BOSS_ID) { const at = Date.now() + this.respawnDelay(def); if (at < r.at) { r.at = at; changed = true; } }
    if (changed) this.broadcastBosses();
  }
  /** Dünya Boss'u canlıysa oyuncuyu Kadim Sunak'a götürür (sayaç dolunca mini haritanın altındaki düğme). */
  private cmdWorldBoss(p: Player, req: string) {
    const T = TUNING.worldBoss;
    if (!T.enabled) return this.notice(p, 'Dünya Boss\'u şu an kapalı.');
    if (p.dead) return;
    if (p.zone.id === WORLD_BOSS_MAP) return this.notice(p, 'Zaten Kadim Sunak\'tasın.', 'info');
    if (p.char.level < T.minLevel) return this.notice(p, `Dünya Boss'u için seviye ${T.minLevel} gerekir.`);
    if (this.now < p.combatUntil) return this.notice(p, 'Savaştayken ışınlanamazsın.');
    if (['arena', 'guildwar', 'tower', 'forge'].includes(p.zone.id)) return this.notice(p, 'Buradan Dünya Boss\'una gidilemez.');
    const st = this.bossStatus().find((b) => b.id === WORLD_BOSS_ID);
    if (!st?.alive) return this.notice(p, st?.nextAt ? 'Dünya Boss\'u henüz doğmadı.' : 'Dünya Boss\'u şu an yok.');
    if (this.seenReceipt(p, req)) return;
    const z = this.zones.get(WORLD_BOSS_MAP)!;
    this.moveToZone(p, z, z.layout.spawn.x, z.layout.spawn.y);
    this.notice(p, 'Kadim Sunak\'a geldin. Boss ortada; alan saldırılarının işaretlerinden kaç!', 'ok');
  }
  private broadcastBosses() { const msg = JSON.stringify({ t: 'bosses', list: this.bossStatus() }); for (const q of this.bySid.values()) this.pushOut(q.sid, msg); }
  private bossSpawned(z: Zone, def: { id: string; name: string }, sp: { x: number; y: number }) {
    const msg = JSON.stringify({ t: 'boss', ev: 'spawn', id: def.id, name: def.name, map: z.id, x: Math.round(sp.x), y: Math.round(sp.y) });
    for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
    if (def.id === WORLD_BOSS_ID) this.chatAll(`Dünya Boss'u ${def.name} Kadim Sunak'ta uyandı! Mini haritanın altındaki "Dünya Boss'una git" düğmesiyle savaşa katıl.`);
    this.broadcastBosses();
  }
  private bossDied(m: Monster, killer: Player) {
    const msg = JSON.stringify({ t: 'boss', ev: 'dead', id: m.def.id, name: m.def.name, map: m.zone.id, killer: killer.char.name, nextAt: m.removeAt + this.respawnDelay(m.def) });
    for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
    this.broadcastBosses();
  }

  // ───────────────────────────── Nesne Market ─────────────────────────────
  private cmdMallBuy(p: Player, id: string, qty: number, req: string) {
    const item = MALL.get(id);
    if (!item || !mallForSale(id)) return this.reply(p, { t: 'mall_buy', req }, false, 'Bu ürün şu an satışta değil.');
    qty = Math.max(1, Math.min(99, qty));
    const cost = mallPrice(id) * qty;
    const c = p.char;
    if (c.cp < cost) return this.reply(p, { t: 'mall_buy', req }, false, `Yeterli ÇP yok (${cost.toLocaleString('tr-TR')} ÇP gerekiyor).`);
    if (this.seenReceipt(p, req)) return;
    c.cp -= cost;
    if (id === 'support_pack') for (let k = 0; k < qty; k++) for (const s2 of SUPPORT_PACK) c.materials[s2] = (c.materials[s2] ?? 0) + 1;
    else c.materials[id] = (c.materials[id] ?? 0) + qty;
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.sendJson(p, { t: 'result', for: 'mall_buy', req, ok: true, msg: `${qty > 1 ? qty + '× ' : ''}${item.name} çantana eklendi.`, id, qty });
  }
  private expireBuffs(p: Player) {
    const b = p.char.misc.buffs; if (!b) return;
    let changed = false;
    for (const k of Object.keys(b)) if (b[k] <= this.now) { delete b[k]; changed = true; }
    if (changed) { p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP; p.selfDirty |= 1 | 4; p.markSave(); }
  }
  private useMall(p: Player, key: string, req: string, itemId?: string) {
    const c = p.char, m = MALL.get(key)!;
    const consume = () => { c.materials[key] -= 1; if (c.materials[key] <= 0) delete c.materials[key]; };
    const done = (text: string, mask = 1 | 2) => { p.selfDirty |= mask; this.save(p, true); this.sendJson(p, { t: 'result', for: 'use', req, ok: true, msg: text }); };
    if (m.buff) {
      const b = (c.misc.buffs ??= {});
      if (key === 'war_ration' && (b.war_ration ?? 0) > this.now) return this.notice(p, 'Kumanyanın etkisi sürüyor; bitince tekrar kullanabilirsin.');
      if (this.seenReceipt(p, req)) return;
      if ((PET_KEYS as readonly string[]).includes(key)) for (const pk of PET_KEYS) if (pk !== key) delete b[pk]; // aynı anda tek pet
      b[m.buff.key] = Math.max(b[m.buff.key] ?? 0, this.now) + m.buff.ms;
      if ((PET_KEYS as readonly string[]).includes(key) || key === 'crimson_wings') this.relook(p); // pet/kanat çevredekilere hemen görünsün
      consume(); p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP;
      const left = b[m.buff.key] - this.now, h = Math.round(left / 3600_000);
      return done(`${m.name} etkin (${h >= 48 ? Math.round(h / 24) + ' gün' : h >= 1 ? h + ' saat' : Math.round(left / 60_000) + ' dakika'}).`, 1 | 2 | 4);
    }
    if (AUTO_POOL[key]) { if (this.seenReceipt(p, req)) return; c.misc.autoPool = (c.misc.autoPool ?? 0) + AUTO_POOL[key]; consume(); return done(`Oto iksir deposu: ${c.misc.autoPool.toLocaleString('tr-TR')} can.`); }
    if (key === 'storage_page') {
      const v = (c.misc.vault ??= {});
      if (STORAGE_BASE_PAGES + (v.pages ?? 0) >= STORAGE_MAX_PAGES) return this.notice(p, `Depon en büyük boyutta (${STORAGE_MAX_PAGES} sayfa).`);
      if (this.seenReceipt(p, req)) return;
      v.pages = (v.pages ?? 0) + 1; consume(); this.sendStorage(p);
      return done(`Depona yeni sayfa eklendi: ${STORAGE_BASE_PAGES + v.pages} sayfa, ${storageCap(v.pages)} bölme.`);
    }
    if (CP_COUPON[key]) { if (this.seenReceipt(p, req)) return; c.cp += CP_COUPON[key]; consume(); return done(`${CP_COUPON[key]} ÇP hesabına eklendi.`); }
    if (key === 'fish_bait') { if (this.seenReceipt(p, req)) return; c.misc.bait = (c.misc.bait ?? 0) + 30; consume(); return done(`Bereketli Olta Yemi: sonraki ${c.misc.bait} avda balık iki kat.`); }
    if (key === 'protect_seal' || key === 'mastery_seal') return this.notice(p, 'Bu mühür Haso\'da artı basarken kendiliğinden kullanılır.', 'info');
    if (key === 'emerald_stall') {
      if (this.seenReceipt(p, req)) return;
      consume(); c.misc.stallSkin = 2;
      const st = this.ownStall(c.id); if (st) { st.skin = 'emerald'; const zz = this.zones.get(st.zone); if (zz) this.broadcastStalls(zz); }
      return done('Zümrüt Pazar Tezgâhı kalıcı olarak açıldı. Pazar penceresinden açıp kapatabilirsin.');
    }
    if (key === 'spec_reset') {
      if (!c.spec) return this.notice(p, 'Seçili bir uzmanlığın yok.');
      if (this.now - p.lastDamageAt < COMBAT_LOCK_MS) return this.notice(p, 'Savaş dışında kullanılır.');
      if (this.seenReceipt(p, req)) return;
      c.spec = null; consume(); p.recompute(true);
      return done('Uzmanlığın sıfırlandı. Yeni uzmanlığını Beceriler penceresinden seç.', 1 | 2 | 4);
    }
    if (key === 'rename') return this.notice(p, 'Yeni adı Nesne Market penceresinde yaz.', 'info');
    if (key === 'boss_tracker' || key === 'trade_glass') return; // buff olarak yukarıda
    if (m.target === 'equip') {
      if (key === 'item_reflect') return this.cmdChatItem(p, itemId ?? '', req);
      const it = itemId ? (c.bag.find((x) => x.id === itemId) ?? Object.values(c.equip).find((x) => x?.id === itemId)) : undefined;
      if (!it) return this.notice(p, 'Önce bir ekipman seç.');
      const tpl = ITEM_TPL.get(it.tpl); if (!tpl) return;
      const pool = (Object.keys(ENCHANTS) as EnchantType[]).filter((k) => !ENCHANTS[k].legacy && !(TUNING.enchants.disabled ?? []).includes(k) && ENCHANTS[k].slots.includes(tpl.slot));
      const tierPick = () => { const w = TUNING.enchants.tierWeights ?? ENCHANT_TIER_WEIGHTS; const tot = w.reduce((a, b2) => a + b2, 0); let r = rnd() * tot; for (let k = 0; k < w.length; k++) if ((r -= w[k]) <= 0) return k; return 0; };
      const mk = (t: EnchantType) => { const tier = tierPick(); return { t, v: (TUNING.enchants.values?.[t] ?? ENCHANTS[t].tiers)[tier], tier }; };
      if (key === 'enchant_add') {
        if (it.ench.length >= 4) return this.notice(p, 'Bu ekipmanda zaten 4 efsun var.');
        const free = pool.filter((t) => !it.ench.some((e) => e.t === t)); if (!free.length) return this.notice(p, 'Bu ekipmana eklenecek efsun kalmadı.');
        if (this.seenReceipt(p, req)) return;
        const e = mk(free[Math.floor(rnd() * free.length)]); it.ench.push(e); consume(); p.recompute(true);
        return done(`Yeni efsun: ${ENCHANTS[e.t].name} +${e.v}${ENCHANTS[e.t].unit}`, 1 | 2 | 4);
      }
      if (key === 'enchant_change') {
        if (!it.ench.length) return this.notice(p, 'Bu ekipmanda değiştirilecek efsun yok.');
        if (this.seenReceipt(p, req)) return;
        const left = [...pool]; const n = Math.min(it.ench.length, left.length);
        it.ench = Array.from({ length: n }, () => mk(left.splice(Math.floor(rnd() * left.length), 1)[0]));
        consume(); p.recompute(true);
        return done('Efsunlar yeniden belirlendi.', 1 | 2 | 4);
      }
    }
    this.notice(p, 'Bu ürün doğrudan kullanılamaz.');
  }
  /**
   * Ticaret Camı: Pazar Köyü'ndeki bütün dükkânlarda arama. cat: tümü / ekipman / malzeme / Nesne Market ürünü;
   * sort: en ucuz, en pahalı ya da (yığınlarda) birim fiyat. Önce bütün eşleşmeler toplanır, sonra sıralanıp kesilir.
   */
  private cmdMarketSearch(p: Player, q: string, cat = 'all', sort = 'price') {
    if (!['all', 'item', 'mat', 'mall'].includes(cat)) cat = 'all';
    if ((p.char.misc.buffs?.trade_glass ?? 0) <= this.now) return this.notice(p, 'Pazar araması için Ticaret Camı gerekir (Nesne Market).');
    const needle = q.trim().toLocaleLowerCase('tr').slice(0, 40);
    const kind = (e: StallEntry) => (e.item ? 'item' : e.mat && MALL.has(e.mat.key) ? 'mall' : 'mat');
    const res: { stall: string; owner: string; title: string; item?: ItemInstance; mat?: StallEntry['mat']; price: number; x: number; y: number }[] = [];
    const counts = { all: 0, item: 0, mat: 0, mall: 0 };
    for (const st of this.market.stalls) for (const e of st.items) {
      if (needle && !stallEntryName(e).toLocaleLowerCase('tr').includes(needle)) continue;
      const k = kind(e); counts.all++; counts[k]++;
      if (cat !== 'all' && cat !== k) continue;
      res.push({ stall: st.id, owner: st.ownerName, title: st.title, item: e.item, mat: e.mat, price: e.price, x: Math.round(st.x), y: Math.round(st.y) });
    }
    const unit = (r: typeof res[number]) => r.price / Math.max(1, r.mat?.qty ?? 1);
    res.sort(sort === 'desc' ? (a, b) => b.price - a.price : sort === 'unit' ? (a, b) => unit(a) - unit(b) : (a, b) => a.price - b.price);
    this.sendJson(p, { t: 'market_results', q, cat, sort, counts, list: res.slice(0, 120) });
  }
  private cmdChatItem(p: Player, itemId: string, req: string) {
    const c = p.char;
    if ((c.materials.item_reflect ?? 0) <= 0) return this.notice(p, 'Eşya Yansıtma gerekir (Nesne Market).');
    const it = c.bag.find((x) => x.id === itemId) ?? Object.values(c.equip).find((x) => x?.id === itemId);
    if (!it) return this.notice(p, 'Paylaşmak için bir ekipman seç.');
    if (this.seenReceipt(p, req)) return;
    c.materials.item_reflect -= 1; if (c.materials.item_reflect <= 0) delete c.materials.item_reflect;
    const msg = JSON.stringify({ t: 'chat', ch: 'local', from: c.name, cls: c.cls, text: `[${itemDisplayName(it)}]`, id: p.id, item: it });
    for (const q of p.zone.playerSet) this.pushOut(q.sid, msg);
    p.selfDirty |= 2; p.markSave();
  }

  // ───────────────────────────── balıkçılık ─────────────────────────────
  /** En yakın su karosu (2 karo içinde); yoksa null. */
  private nearWater(p: Player): { x: number; y: number } | null {
    const l = p.zone.layout, tx = Math.floor(p.x / 64), ty = Math.floor(p.y / 64);
    let best: { x: number; y: number } | null = null, bd = 1e9;
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue;
      const g = l.ground[y * l.w + x]; if (g !== 4 && g !== 10) continue; // su, derin su
      const d = dx * dx + dy * dy; if (d < bd) { bd = d; best = { x: x * 64 + 32, y: y * 64 + 32 }; }
    }
    return best;
  }
  private cmdFishCast(p: Player) {
    if (p.char.misc.mount?.riding) return this.notice(p, 'Balık tutmak için önce binekten in.');
    const c = p.char;
    if (p.dead) return;
    if ((c.materials[ROD_ID] ?? 0) <= 0) return this.notice(p, 'Oltan yok. Pazar Köyü göletindeki Balıkçı Kemal\'den alabilirsin.');
    const wt = this.nearWater(p);
    if (!wt) return this.notice(p, 'Suya yaklaş.');
    // suya dön (herkes oltayı suya doğru atmış görsün)
    p.dir = Math.round((Math.atan2(wt.y - p.y, wt.x - p.x) / (Math.PI * 2)) * 256) & 255; p.dirty |= Upd.ANIM;
    const table = fishTable(); const tot = table.reduce((a, f) => a + f.weight, 0);
    if (!tot) return this.notice(p, 'Şu an balık tutulamıyor.');
    let r = rnd() * tot; let fish = table[0]; for (const f of table) if ((r -= f.weight) <= 0) { fish = f; break; }
    const fc = fishingConf();
    const bite = Math.round((fc.biteMin + rnd() * (fc.biteMax - fc.biteMin)) * 1000);
    const token = Math.random().toString(36).slice(2, 10);
    p.fishing = { token, fish: fish.id, biteAt: this.now + bite };
    this.sendJson(p, { t: 'fish_wait', token, biteIn: bite, diff: fish.diff, motion: fish.motion });
  }
  private cmdFishEnd(p: Player, token: string, ok: boolean) {
    const f = p.fishing;
    if (!f || f.token !== token) return;
    p.fishing = undefined;
    const el = this.now - f.biteAt;
    if (!ok) return this.sendJson(p, { t: 'fish_result', ok: false });
    const def = FISH_BY_ID.get(f.fish)!;
    // tutma oyunu oynanmadan bitmez: zor balık (inci) daha uzun sürer (hileli istemci anında "tuttum" diyemesin)
    const minMs = 1200 + Math.max(0, Number(def?.diff) || 0) * 30;
    if (el < minMs || el > 120_000) return this.sendJson(p, { t: 'fish_result', ok: false });
    const c = p.char;
    let qty = 1;
    const guide = (c.misc.buffs?.fish_guide ?? 0) > this.now;
    if (guide) qty = 2;
    else if (!def.pearl && (c.misc.bait ?? 0) > 0) { qty = 2; c.misc.bait!--; }
    // Kılavuz etkinken yem harcanmaz: ikisi birlikte en fazla iki kat
    c.materials[f.fish] = (c.materials[f.fish] ?? 0) + qty;
    p.selfDirty |= 1 | 2; p.markSave();
    this.sendJson(p, { t: 'fish_result', ok: true, id: f.fish, name: def.name, qty });
  }
  private cmdFishRod(p: Player, req: string) {
    if (!p.zone.def.npcs.some((n) => n.actions.includes('fishing_shop') && this.nearNpc(p, n.id))) return this.notice(p, 'Balıkçıya yaklaş.');
    const c = p.char, price = fishingConf().rodPrice;
    if ((c.materials[ROD_ID] ?? 0) > 0) return this.notice(p, 'Zaten bir oltan var.', 'info');
    if (c.gems < price) return this.notice(p, `Olta ${price.toLocaleString('tr-TR')} Mücevher.`);
    if (this.seenReceipt(p, req)) return;
    c.gems -= price; c.materials[ROD_ID] = 1;
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.notice(p, 'Olta aldın! Suya yaklaş ve "Olta At"a bas.', 'ok');
  }
  private cmdFishSell(p: Player, req: string) {
    if (!p.zone.def.npcs.some((n) => n.actions.includes('fishing_shop') && this.nearNpc(p, n.id))) return this.notice(p, 'Balıkçıya yaklaş.');
    if (this.seenReceipt(p, req)) return;
    const c = p.char; let total = 0, n = 0;
    for (const f of fishTable()) { const q = c.materials[f.id] ?? 0; if (q > 0 && f.price > 0) { total += q * f.price; n += q; delete c.materials[f.id]; } }
    if (!n) return this.notice(p, 'Satılacak balık yok.', 'info');
    c.gems += total; p.selfDirty |= 1 | 2; this.save(p, true);
    this.notice(p, `${n} balık sattın: +${total.toLocaleString('tr-TR')} Mücevher.`, 'ok');
  }

  /**
   * Görüş alanı: her oyuncuya yalnız yakın varlıklar gönderilir. Kalabalıkta en yakın N oyuncu.
   * Bilinen varlık kümesiyle fark alınarak yeni/çıkan/değişen varlıklar ikili paketle gider.
   */
  private buildSnapshots() {
    const w = this.writer;
    const maxP = this.opt.aoiMaxPlayers;
    const visPlayers: Player[] = [];
    const visD: number[] = [];
    const heartbeat = this.tickNo % 10 === 0;
    const enc = this.encW, spawnBin = this.spawnBin, updBin = this.updBin;
    spawnBin.clear(); updBin.clear();
    const spawnOf = (e: object, make: () => EntitySpawn) => { let b = spawnBin.get(e); if (!b) { enc.reset(); writeSpawn(enc, make()); b = enc.bytes(); spawnBin.set(e, b); } return b; };
    const updOf = (e: Player | Monster) => {
      let b = updBin.get(e);
      if (!b) {
        enc.reset();
        writeUpdate(enc, { id: e.id, mask: e.dirty, x: Math.round(e.x), y: Math.round(e.y), hp: Math.max(0, Math.round(e.hp)), dir: e.dir, anim: e.anim, maxHp: e instanceof Player ? e.stats.maxHp : e.maxHp, flags: e instanceof Player ? this.playerFlags(e) : e.state === MState.DEAD ? EFlag.DEAD : 0, level: e instanceof Player ? e.char.level : e.level });
        b = enc.bytes(); updBin.set(e, b);
      }
      return b;
    };
    for (const z of this.zones.values()) {
      if (!z.playerSet.size) continue;
      for (const p of z.playerSet) {
        const x0 = p.x - p.viewW, x1 = p.x + p.viewW, y0 = p.y - p.viewH, y1 = p.y + p.viewH;
        const reset = p.resetPending;
        if (reset) { p.known.clear(); p.resetPending = false; }
        w.reset();
        w.wU8(reset ? 2 : Op.SNAPSHOT);
        w.wU32((this.now - this.t0) >>> 0);
        w.wU16(p.lastSeq);
        w.wF32(p.x); w.wF32(p.y);
        w.wU32(Math.max(0, Math.round(p.hp))); w.wU32(p.stats.maxHp); w.wU8(this.playerFlags(p));
        // oyuncular: kalabalıkta en yakın N
        visPlayers.length = 0; visD.length = 0;
        z.players.query(x0, y0, x1, y1, (q) => {
          if (q === p || q.x < x0 || q.x > x1 || q.y < y0 || q.y > y1) return;
          visPlayers.push(q); visD.push((q.x - p.x) ** 2 + (q.y - p.y) ** 2);
        });
        if (visPlayers.length > maxP) {
          const order = visPlayers.map((_, i) => i).sort((a, b) => visD[a] - visD[b]).slice(0, maxP);
          const keep = order.map((i) => visPlayers[i]);
          visPlayers.length = 0; visPlayers.push(...keep);
        }
        const spawnAt = w.reserveU16(); let nSpawn = 0;
        const updates: Player[] | Monster[] = [];
        const updList: (Player | Monster)[] = updates as (Player | Monster)[];
        const known = p.known, stamp = this.tickNo;
        for (const q of visPlayers) {
          const was = known.get(q.id); known.set(q.id, stamp);
          if (was === undefined) { w.wBytes(spawnOf(q, () => this.playerSpawn(q))); nSpawn++; }
          else if (q.dirty) updList.push(q);
        }
        z.monsters.query(x0, y0, x1, y1, (m) => {
          if (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) return;
          const was = known.get(m.id);
          if (was === undefined && m.state === MState.DEAD) return;
          known.set(m.id, stamp);
          if (was === undefined) { w.wBytes(spawnOf(m, () => monsterSpawn(m))); nSpawn++; }
          else if (m.dirty) updList.push(m);
        });
        z.loot.query(x0, y0, x1, y1, (l) => {
          const was = known.get(l.id); known.set(l.id, stamp);
          if (was === undefined) { w.wBytes(spawnOf(l, () => lootSpawn(l, this.now))); nSpawn++; }
        });
        w.patchU16(spawnAt, nSpawn);
        w.wU16(updList.length);
        for (const e of updList) w.wBytes(updOf(e));
        const remAt = w.reserveU16(); let nRem = 0;
        for (const [id, st] of known) if (st !== stamp) { known.delete(id); w.wU32(id); nRem++; }
        w.patchU16(remAt, nRem);
        const evAt = w.reserveU16(); let nEv = 0;
        for (const ze of z.events) {
          if (!eventVisible(ze, p, x0, y0, x1, y1)) continue;
          if (!ze.bin) { enc.reset(); writeEvent(enc, ze.ev); ze.bin = enc.bytes(); }
          w.wBytes(ze.bin); nEv++;
        }
        w.patchU16(evAt, nEv);
        const hasContent = reset || nSpawn || updList.length || nRem || nEv || p.movedThisTick || p.inputs.length || p.dirty || heartbeat;
        if (hasContent || this.tickNo - p.lastSnapTick >= 5) { p.lastSnapTick = this.tickNo; this.pushOut(p.sid, w.finish()); }
      }
    }
  }

  private playerSpawn(q: Player): EntitySpawn {
    return { kind: Kind.PLAYER, id: q.id, cls: q.clsIndex, name: q.char.name, level: q.char.level, x: Math.round(q.x), y: Math.round(q.y), dir: q.dir, anim: q.anim, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, flags: this.playerFlags(q), weapon: q.weaponRarityIndex(), wplus: Math.min(15, q.char.equip.weapon?.plus ?? 0) | (Math.min(3, q.char.equip.weapon?.evo ?? 0) << 4) | (Math.min(3, q.char.equip.armor?.evo ?? 0) << 6), cos: cosmeticByte(q.char.misc.buffs, Date.now()) | (((q.char.equip.armor?.plus ?? 0) >= 6 ? 2 : (q.char.equip.armor?.plus ?? 0) >= 5 ? 1 : 0) << 3), guild: q.guild ? `${q.guild.emblem}|${q.guild.name}` : '', rank: q.char.level >= RANK_LEVEL ? Math.max(0, Math.min(RANK_MAX, q.char.misc.rank?.r ?? 0)) : 0 };
  }

  private flushOut() {
    if (!this.out.length) return;
    const batch = this.out, transfer = this.transfer;
    this.out = []; this.transfer = [];
    this.opt.post({ type: 'out', batch }, transfer);
  }

  stats(): WorkerStats {
    const perMap: Record<string, number> = {};
    let monsters = 0, awake = 0;
    for (const z of this.zones.values()) {
      if (z.playerSet.size) perMap[z.id] = z.playerSet.size;
      monsters += z.monsterList.length;
      for (const m of z.monsterList) if (m.state !== MState.IDLE || z.awakeCells[m.cell]) awake++;
    }
    const h = this.tickHist.snapshot();
    this.tickHist.resetMax();
    return { channel: this.opt.channel, players: this.bySid.size, perMap, monsters, awakeMonsters: awake, tick: { p50: h.p50, p95: h.p95, p99: h.p99, max: h.max, overruns: this.overruns }, elu: 0, bytesOutPerSec: 0, msgsOutPerSec: 0, heapMB: 0, at: Date.now() };
  }
}

function eventVisible(ze: ZoneEvent, p: Player, x0: number, y0: number, x1: number, y1: number) {
  if (ze.only !== undefined && ze.only !== p.id) return false;
  const ev = ze.ev;
  if (ev.e === Ev.DAMAGE && (ev.src === p.id || ev.tgt === p.id)) return true;
  return ze.x >= x0 - 200 && ze.x <= x1 + 200 && ze.y >= y0 - 200 && ze.y <= y1 + 200;
}

function monsterSpawn(m: Monster): EntitySpawn {
  return { kind: Kind.MONSTER, id: m.id, tpl: m.tplIndex, variant: m.variant, level: m.level, x: Math.round(m.x), y: Math.round(m.y), dir: m.dir, anim: m.anim, hp: Math.max(0, Math.round(m.hp)), maxHp: m.maxHp, flags: m.state === MState.DEAD ? EFlag.DEAD : 0 };
}
function lootSpawn(l: Loot, now: number): EntitySpawn {
  const pl = l.payload;
  const icon = pl.kind === 'item' ? itemIconName(pl.item) : MATERIAL.get(pl.key)?.icon ?? 'bag';
  const rarity = pl.kind === 'item' ? RARITIES.indexOf(pl.item.rarity) : 0;
  const label = pl.kind === 'item' ? itemDisplayName(pl.item) : `${pl.qty}× ${MATERIAL.get(pl.key)?.name ?? pl.key}`;
  return { kind: Kind.LOOT, id: l.id, icon, rarity, x: Math.round(l.x), y: Math.round(l.y), owner: l.ownerChar, ttl: Math.max(0, LOOT_TTL_MS - (now - l.createdAt)), label };
}

/** Eşya üretimi: efsunlar uygun havuzdan, tür tekrar etmeden. */
/**
 * Karakteri yeni açılmış hâline döndürür (ad, sınıf, hesap ve rol korunur): seviye 1, statü/beceri sıfır,
 * çanta boş, üzerinde beyaz başlangıç silahı ve zırhı, 5 Kırmızı İksir, para yok, Pazar Köyü'nde.
 */
export function resetCharState(c: CharState) {
  const l = getLayout('bazaar');
  c.level = 1; c.xp = 0; c.kills = 0; c.spec = null;
  c.stats = { str: 0, res: 0, vit: 0 }; c.skills = [1, 1, 1, 1, 1, 1];
  c.gems = 0; c.essence = 0; c.cp = 0; c.arenaCoin = 0;
  c.bag = [];
  c.equip = { weapon: makeItem(`w_${c.cls}`, 'white', 'starter', 0), armor: makeItem(`a_${c.cls}`, 'white', 'starter', 0) };
  c.materials = { red_potion: 5 };
  c.misc = {};
  c.map = 'bazaar'; c.x = l.spawn.x; c.y = l.spawn.y;
  c.saveVersion++;
}

/** Yönetim verişi: karakter kaydına uygular (çevrimiçi/çevrimdışı ortak). Dönen metin oyuncuya gösterilir. */
export function applyGive(c: CharState, g: AdminGive): string {
  if (g.kind === 'item') {
    const it = makeItem(g.tpl, g.rarity as Rarity, 'gm');
    it.plus = Math.max(0, Math.min(MAX_PLUS, Math.round(g.plus ?? 0)));
    c.bag.push(it);
    return `Yönetimden hediye: ${itemDisplayName(it)}`;
  }
  if (g.kind === 'gems') { const n = Math.max(0, Math.min(10_000_000, Math.round(g.qty))); c.gems += n; return `Ödül: ${n.toLocaleString('tr-TR')} Mücevher`; }
  if (g.kind === 'cp') { const n = Math.max(0, Math.min(1_000_000, Math.round(g.qty))); c.cp += n; return `Ödül: ${n.toLocaleString('tr-TR')} ÇP`; }
  if (g.kind === 'essence') { const n = Math.max(0, Math.min(1e9, Math.round(g.qty))); c.essence += n; return `${n.toLocaleString('tr-TR')} Öz aldın`; }
  if (g.kind === 'rank') {
    const r = Math.max(0, Math.min(RANK_MAX, Math.floor(g.r)));
    if (r === 0) { delete c.misc.rank; return 'Rütben yönetim tarafından kaldırıldı.'; }
    c.misc.rank = { r, xp: 0 };
    return `Yönetimden rütbe: ${rankDef(r)!.name}${c.level < RANK_LEVEL ? ` (${RANK_LEVEL}. seviyede etkinleşir)` : ''}`;
  }
  if (g.kind === 'rune') {
    if (!isRuneKind(g.k)) return '';
    const lv = Math.max(1, Math.min(RUNE_MAX_LEVEL, Math.floor(g.lv)));
    const key = runeKey(g.k, lv);
    c.materials[key] = (c.materials[key] ?? 0) + 1;
    return `Yönetimden hediye: ${lv}. seviye ${RUNES[g.k].name}`;
  }
  const q = Math.max(1, Math.min(99999, Math.round(g.qty)));
  c.materials[g.key] = (c.materials[g.key] ?? 0) + q;
  return `Yönetimden hediye: ${q}× ${MATERIAL.get(g.key)?.name ?? MALL.get(g.key)?.name ?? g.key}`;
}

/**
 * Kaska Azami Can efsunu gelmez. Önceden gelmiş kasklardaki can efsunu, aynı kademede kaska uygun ve eşyada
 * olmayan başka bir efsunla değiştirilir (oyuncu girişte). Değişiklik olduysa true.
 */
export function fixHelmetHp(it: ItemInstance | undefined): boolean {
  if (!it || ITEM_TPL.get(it.tpl)?.slot !== 'helmet') return false;
  let changed = false;
  for (let i = 0; i < it.ench.length; i++) {
    const e = it.ench[i];
    if (e.t !== 'hp') continue;
    const have = new Set(it.ench.map((x) => x.t));
    const pool = (Object.keys(ENCHANTS) as EnchantType[]).filter((k) => !ENCHANTS[k].legacy && ENCHANTS[k].slots.includes('helmet') && !have.has(k));
    if (!pool.length) { it.ench.splice(i, 1); i--; changed = true; continue; }
    const t = pool[Math.floor(rnd() * pool.length)];
    const tier = Math.max(0, Math.min(3, e.tier ?? 0));
    it.ench[i] = { t, v: (TUNING.enchants.values?.[t] ?? ENCHANTS[t].tiers)[tier], tier };
    changed = true;
  }
  return changed;
}

export function makeItem(tplId: string, rarity: Rarity, src: string, enchCount?: number): ItemInstance {
  const tpl = ITEM_TPL.get(tplId)!;
  // canavardan düşen eşya: 1–4 rastgele efsun (nadirlik yükseldikçe çok efsun olasılığı artar)
  // yönetim: efsun sayısı/kademe oranları, kademe değerleri ve kapalı efsunlar (boşsa varsayılan rehber değerleri)
  const et = TUNING.enchants;
  const pick = (w: readonly number[]) => { const tot = w.reduce((a, b) => a + b, 0); let r = rnd() * tot; for (let k = 0; k < w.length; k++) if ((r -= w[k]) <= 0) return k; return 0; };
  const cw = et.countWeights?.[rarity] ?? et.countWeights?.default ?? ENCHANT_COUNT_WEIGHTS[rarity] ?? ENCHANT_COUNT_WEIGHTS.default;
  // efsunlu düşme grubu: Sıradan / Mavi / Turuncu kendi grubu, Kızıl ve üstü "default". Grupta değer yoksa %100
  // (yönetimde %100 seçilince kayda yazılmıyor). Önceden kayıtta olmayan "white" yanlışlıkla "default" (Kızıl ve üstü)
  // oranını alıyordu: %100 ayarlanan sıradan eşyalar çoğunlukla efsunsuz düşüyordu.
  const grp = rarity === 'white' || rarity === 'blue' || rarity === 'orange' ? rarity : 'default';
  const enchanted = src !== 'drop' || rnd() < (et.chance?.[grp] ?? 1);
  const n = enchCount ?? (src === 'drop' ? (enchanted ? pick(cw) + 1 : 0) : rarity === 'white' ? 0 : rarity === 'blue' ? randInt(1, 2) : rarity === 'orange' ? randInt(2, 3) : 4);
  const off = new Set(et.disabled ?? []);
  const pool = (Object.keys(ENCHANTS) as EnchantType[]).filter((k) => !ENCHANTS[k].legacy && !off.has(k) && ENCHANTS[k].slots.includes(tpl.slot));
  const ench: ItemInstance['ench'] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    const tier = pick(et.tierWeights ?? ENCHANT_TIER_WEIGHTS);
    ench.push({ t, v: (et.values?.[t] ?? ENCHANTS[t].tiers)[tier], tier });
  }
  return { id: uuid(), tpl: tplId, rarity, plus: 0, ench, src };
}

/** Eşya kimliği. crypto.randomUUID güvenli olmayan (http) tarayıcı sayfalarında yoktur; getRandomValues her yerde var. */
function uuid(): string {
  const c = (globalThis as { crypto?: { randomUUID?: () => string; getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.randomUUID) return c.randomUUID();
  const b = new Uint8Array(16);
  if (c?.getRandomValues) c.getRandomValues(b); else for (let i = 0; i < 16; i++) b[i] = (Math.random() * 256) | 0;
  b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
  const h = [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

/** dükkân satırının kimliği (ekipman kimliği ya da yığın kimliği) ve görünen adı */
export const stallEntryId = (e: StallEntry) => e.item?.id ?? e.mat?.id ?? '';
export const stallEntryName = (e: StallEntry) => e.item ? itemDisplayName(e.item) : e.mat ? `${e.mat.qty}× ${MATERIAL.get(e.mat.key)?.name ?? MALL.get(e.mat.key)?.name ?? e.mat.key}` : '?';

/** Kayıttan gelen pazar durumunu doğrular (bozuk kayıt dünyayı çökertmesin; geçersiz dükkân atlanır). */
function sanitizeMarket(raw: unknown): MarketState {
  const out: MarketState = { v: 1, stalls: [], pending: {} };
  const r = (raw && typeof raw === 'object' ? raw : {}) as { stalls?: unknown; pending?: unknown };
  const okItem = (it: unknown): it is ItemInstance => !!it && typeof it === 'object' && typeof (it as ItemInstance).id === 'string' && ITEM_TPL.has((it as ItemInstance).tpl) && Array.isArray((it as ItemInstance).ench);
  for (const s of Array.isArray(r.stalls) ? r.stalls as MarketStall[] : []) {
    if (!s || typeof s.id !== 'string' || !Number.isFinite(s.ownerId) || typeof s.zone !== 'string' || !MAPS[s.zone]?.market || !Array.isArray(s.items)) continue;
    const okMat = (m: unknown): m is NonNullable<StallEntry['mat']> => !!m && typeof m === 'object' && typeof (m as { id?: unknown }).id === 'string' && (MATERIAL.has((m as { key: string }).key) || MALL.has((m as { key: string }).key)) && Number.isFinite((m as { qty: number }).qty) && (m as { qty: number }).qty >= 1;
    const items: StallEntry[] = s.items.filter((m) => (okItem(m?.item) || okMat(m?.mat)) && Number.isFinite(m.price) && m.price >= 1)
      .map((m) => (m.item ? { item: m.item, price: Math.floor(m.price) } : { mat: { id: m.mat!.id, key: m.mat!.key, qty: Math.floor(m.mat!.qty) }, price: Math.floor(m.price) }));
    if (!items.length) continue;
    out.stalls.push({ id: s.id, ownerId: s.ownerId, ownerName: String(s.ownerName ?? '?').slice(0, 24), zone: s.zone, title: String(s.title ?? '').slice(0, STALL_TITLE_MAX), x: Number(s.x) || 0, y: Number(s.y) || 0, items, openedAt: Number(s.openedAt) || 0, earned: Number(s.earned) || 0, ...(s.skin === 'emerald' ? { skin: 'emerald' } : {}) });
  }
  if (r.pending && typeof r.pending === 'object') for (const [k, v] of Object.entries(r.pending as MarketState['pending'])) {
    if (!/^-?\d+$/.test(k) || !v || !Number.isFinite(v.gems) || v.gems <= 0) continue;
    out.pending[k] = { gems: Math.floor(v.gems), sales: Array.isArray(v.sales) ? v.sales.slice(-30) : [] };
  }
  return out;
}
