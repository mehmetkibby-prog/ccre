import {
  TICK_MS, VIEW_HALF_W, VIEW_HALF_H, NO_DIR, DIR_STEPS, LOOT_TTL_MS, LOOT_OWNER_ONLY_MS, LOOT_PICKUP_RANGE, RESPAWN_DELAY_MS,
  COMBAT_LOCK_MS, BAG_EQUIP_CAP, STALL_MAX_ITEMS, STALL_MIN_GAP, STALL_VIEW_RANGE, STALL_MAX_PRICE, STALL_TITLE_MAX, MARKET_MAX_STALLS, inMarket, CHAT_MAX, Anim, Upd, EFlag, Ev, DmgFlag, Fx, Kind, Op, BinWriter, writeSpawn, writeUpdate, writeEvent,
  stepMove, nearestFree, getLayout, MAPS, classSkill, attackCooldown, skillDamageMult, rollDamage, xpToNext, statBudget, skillUpgradeBudget,
  LEVEL_CAP_BASE, STAT_MAX, ITEM_TPL, ITEM_TEMPLATES, RARITY, RARITIES, ENCHANTS, ENCHANT_TIER_WEIGHTS, LOOT_PROFILES, VARIANT_LOOT_MULT,
  itemIconName, enchantAttackMult, enchantDefenseMult, classAttackKind, monsterAttackKind, ENCHANT_COUNT_WEIGHTS,
  SHOPS, sellPrice, masteryChance, MALL, mallPrice, mallForSale, charBuffs, AUTO_POOL, CP_COUPON, SUPPORT_PACK, PET_KEYS, fishTable, fishingConf, fishPrice, FISH_BY_ID, ROD_ID, validateCharacterName, MAX_PLUS, upgradeStep, upgradeFailDown, isUpgradable, MATERIAL, trDayKey, sanitizeChat, itemDisplayName, CLASSES, MONSTERS, TUNING, rebuildSpawns,
  type ClientCmd, type ItemInstance, type Rarity, type Slot, type EnchantType, type GameEvent, type EntitySpawn, type SkillDef,
} from '@col/shared';
import type { CharState, FromWorker, WorkerStats, MarketState, MarketStall } from '../types.ts';
import { Zone, type ZoneEvent } from './zone.ts';
import { Player, Monster, Loot, MState, type LootPayload, type Telegraph } from './entities.ts';
import { Histogram } from '../metrics.ts';

const DIR_TO_BYTE = 256 / DIR_STEPS;
const angleByte = (dx: number, dy: number) => { let a = Math.atan2(dy, dx); if (a < 0) a += Math.PI * 2; return Math.round((a / (Math.PI * 2)) * 256) & 255; };
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const rnd = Math.random;
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const MONSTER_RADIUS = 22;
const RANGE_TOLERANCE = 48;
const MELEE_TOLERANCE = 30;
const NPC_RANGE = 260;
const RECEIPT_KEEP = 64;

export interface WorldOptions { channel: number; aoiMaxPlayers: number; saveIntervalMs: number; post: (m: FromWorker, transfer?: ArrayBuffer[]) => void }

/** Bir kanalın tüm bölgeleri. Tek thread, tek yazar: kanal içi her durum değişikliği burada sıralı işlenir. */
export class World {
  zones = new Map<string, Zone>();
  bySid = new Map<number, Player>();
  tickNo = 0;
  t0 = Date.now();
  now = Date.now();
  out: [number, string | ArrayBuffer][] = [];
  transfer: ArrayBuffer[] = [];
  writer = new BinWriter(64 * 1024);
  tickHist = new Histogram(1200);
  overruns = 0;
  bytesOut = 0; msgsOut = 0;
  worldHealth = 100; online = 0;

  constructor(public opt: WorldOptions) {
    for (const id of Object.keys(MAPS)) this.zones.set(id, new Zone(id));
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
  /** İsim Değiştirme: ad veritabanında değişti; burada bellekteki ad güncellenir ve ürün tüketilir. */
  adminRename(charId: number, name: string): boolean {
    const p = this.findPlayer(charId); if (!p || !name) return false;
    const c = p.char;
    if ((c.materials.rename ?? 0) > 0) c.materials.rename -= 1;
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

  /** Yönetim: haritanın canavar yuvalarını güncel yoğunlukla yeniden kurar (oyuncuların görüşünden çıkanlar istemciden düşer). */
  reseedMonsters(mapId: string) {
    const z = this.zones.get(mapId);
    if (!z) return;
    for (const m of [...z.monsterList]) { m.threat.clear(); m.target = null; z.removeMonster(m); }
    z.respawnQueue.length = 0;
    rebuildSpawns(z.layout);
    const defs = new Map(MONSTERS.map((d) => [d.id, d] as const));
    for (const sp of z.layout.spawnPoints) { const d = defs.get(sp.monster); if (d) z.addMonster(new Monster(d, sp)); }
  }

  // ───────────────────────────── bağlantı ─────────────────────────────
  join(sid: number, char: CharState) {
    if (this.bySid.has(sid)) return;
    char.level = Math.max(1, Math.min(LEVEL_CAP_BASE, char.level));
    if (char.level < LEVEL_CAP_BASE && char.xp >= xpToNext(char.level)) char.xp = xpToNext(char.level) - 1; // TP tablosu değiştiyse
    if (!this.zones.has(char.map)) { const l = getLayout('bazaar'); char.map = 'bazaar'; char.x = l.spawn.x; char.y = l.spawn.y; }
    const zone = this.zones.get(char.map)!;
    const pos = nearestFree(zone.layout, char.x || zone.layout.spawn.x, char.y || zone.layout.spawn.y);
    char.x = pos.x; char.y = pos.y;
    const p = new Player(sid, char);
    if (char.misc.deadAt && char.hp <= 0) { p.dead = true; p.deadAt = Math.min(this.now, char.misc.deadAt); p.hp = 0; p.anim = Anim.DEAD; }
    if (p.hp <= 0 && !p.dead) p.hp = p.stats.maxHp;
    this.bySid.set(sid, p);
    zone.addPlayer(p);
    this.sendJson(p, { t: 'welcome', entityId: p.id, channel: this.opt.channel, map: zone.id, x: p.x, y: p.y, serverTime: this.now, worldHealth: this.worldHealth, online: this.online });
    this.sendFullSelf(p);
    this.marketJoin(p);
    this.opt.post({ type: 'joined', sid, ok: true });
  }

  leave(sid: number) {
    const p = this.bySid.get(sid);
    if (!p) return;
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
    return structuredClone(c);
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
    if (p.dead && !['respawn', 'chat', 'ping', 'sync', 'lock', 'autopotion'].includes(c.t)) { this.reply(p, c, false, 'Ölüyken bu işlem yapılamaz.'); return; }
    switch (c.t) {
      case 'gm_reset': {
        if (!['gm', 'admin', 'owner'].includes(p.char.role)) return this.notice(p, 'Bu komut için yetkin yok.');
        let target: Player | undefined;
        for (const q of this.bySid.values()) if (q.char.name.toLocaleLowerCase('tr') === String(c.name ?? '').toLocaleLowerCase('tr')) { target = q; break; }
        if (!target) return this.notice(p, 'Oyuncu bu kanalda çevrimiçi değil.');
        this.adminResetPlayer(target.char.id);
        return this.notice(p, `${target.char.name} sıfırlandı.`, 'ok');
      }
      case 'gm_set': {
        // yalnız yönetici rolü; hedef bu kanalda çevrimiçi oyuncu (ada göre)
        if (!['gm', 'admin', 'owner'].includes(p.char.role)) return this.notice(p, 'Bu komut için yetkin yok.');
        let target: Player | undefined;
        for (const q of this.bySid.values()) if (q.char.name.toLocaleLowerCase('tr') === String(c.name ?? '').toLocaleLowerCase('tr')) { target = q; break; }
        if (!target) return this.notice(p, 'Oyuncu bu kanalda çevrimiçi değil.');
        this.adminSetPlayer(target.char.id, { level: c.level, gems: c.gems, essence: c.essence, potions: c.potions });
        return this.notice(p, `${target.char.name} güncellendi.`, 'ok');
      }
      case 'stall_open': return this.cmdStallOpen(p, c);
      case 'stall_close': return this.cmdStallClose(p);
      case 'stall_view': return this.cmdStallView(p, String(c.stall ?? ''));
      case 'stall_buy': return this.cmdStallBuy(p, c);
      case 'attack': return this.cmdAttack(p, c.id);
      case 'skill': return this.cmdSkill(p, c.s | 0, c.id, c.x, c.y);
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
      case 'donate': return this.cmdDonate(p, Math.floor(Number(c.amount) || 0), String(c.req ?? ''));
      case 'upgrade': return this.cmdUpgrade(p, c);
      case 'npc': return this.cmdNpc(p, String(c.id));
      case 'use': return this.cmdUse(p, String(c.key), String(c.req ?? ''), c.item ? String(c.item) : undefined);
      case 'mall_buy': return this.cmdMallBuy(p, String(c.id), Math.floor(Number(c.qty) || 1), String(c.req ?? ''));
      case 'stall_skin': { const ch = p.char; if (!ch.misc.stallSkin) return this.notice(p, 'Zümrüt Pazar Tezgâhı market ürünüdür.'); ch.misc.stallSkin = c.on ? 2 : 1; const st = this.ownStall(ch.id); if (st) { st.skin = c.on ? 'emerald' : undefined; const zz = this.zones.get(st.zone); if (zz) this.broadcastStalls(zz); } p.selfDirty |= 1; p.markSave(); return; }
      case 'market_search': return this.cmdMarketSearch(p, String(c.q ?? ''));
      case 'chat_item': return this.cmdChatItem(p, String(c.item), String(c.req ?? ''));
      case 'fish_cast': return this.cmdFishCast(p);
      case 'fish_end': return this.cmdFishEnd(p, String(c.token ?? ''), !!c.ok);
      case 'fish_rod': return this.cmdFishRod(p, String(c.req ?? ''));
      case 'fish_sell': return this.cmdFishSell(p, String(c.req ?? ''));
      case 'bosses': this.sendJson(p, { t: 'bosses', list: this.bossStatus() }); return;
      case 'ping': this.sendJson(p, { t: 'pong', c: c.c, s: this.now }); return;
      case 'sync': p.resetPending = true; this.sendFullSelf(p); return;
      default: return;
    }
  }

  // ───────────────────────────── tick ─────────────────────────────
  tick() {
    const t = performance.now();
    this.now = Date.now();
    this.tickNo++;
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
    this.flushOut();
    const dt = performance.now() - t;
    this.tickHist.add(dt);
    if (dt > TICK_MS) this.overruns++;
  }

  private tickZone(z: Zone) {
    const now = this.now;
    // 1) oyuncu hareketleri
    for (const p of z.playerSet) {
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
      if (p.shieldUntil && now > p.shieldUntil) { p.shieldUntil = 0; p.shieldPct = 0; p.dirty |= Upd.FLAGS; }
      const flags = this.playerFlags(p);
      if (flags !== p.flags) { p.flags = flags; p.dirty |= Upd.FLAGS; }
    }
    // 2) canavarlar
    z.computeAwake();
    const list = z.monsterList;
    for (let i = list.length - 1; i >= 0; i--) {
      const m = list[i];
      if (m.state === MState.DEAD) {
        if (now >= m.removeAt) { z.removeMonster(m); z.respawnQueue.push({ at: now + this.respawnDelay(m.def), sp: m.sp }); if (m.def.boss) this.broadcastBosses(); }
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
        z.respawnQueue.splice(i, 1);
        const def = MONSTERS.find((d) => d.id === r.sp.monster)!;
        z.addMonster(new Monster(def, r.sp));
        if (def.boss) this.bossSpawned(z, def, r.sp);
      }
    }
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
          if (now >= m.rootUntil && now >= m.stunUntil && def.speed > 0) this.stepMonster(z, m, t.x + Math.cos(m.id) * 18, t.y + Math.sin(m.id) * 12, def.speed);
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
      } else this.stepMonster(z, m, m.sp.x, m.sp.y, Math.max(def.speed, 160) * 1.5, true);
    }
    if (m.state === MState.IDLE) {
      // savaş dışı can yenilenme ve küçük gezinti
      if (m.hp < m.maxHp && now - m.lastHitAt > 5000 && this.tickNo % 10 === 0) { m.hp = Math.min(m.maxHp, m.hp + Math.ceil(m.maxHp * 0.1)); m.dirty |= Upd.HP; }
      if (def.speed > 0 && now >= m.wanderAt) {
        if (m.wx === 0) { m.wx = m.sp.x + (rnd() - 0.5) * 220; m.wy = m.sp.y + (rnd() - 0.5) * 220; }
        const d = Math.hypot(m.wx - m.x, m.wy - m.y);
        if (d < 10 || !this.stepMonster(z, m, m.wx, m.wy, def.speed * 0.45)) { m.wx = 0; m.wanderAt = now + 4000 + rnd() * 9000; if (m.anim === Anim.WALK) { m.anim = Anim.IDLE; m.dirty |= Upd.ANIM; } }
      }
    }
    // bekleyen tehlike alanları
    if (m.telegraphs.length) this.resolveTelegraphs(z, m);
  }

  private stepMonster(z: Zone, m: Monster, tx: number, ty: number, speed: number, ghost = false): boolean {
    const dx = tx - m.x, dy = ty - m.y;
    const d = Math.hypot(dx, dy);
    if (d < 1) return false;
    const step = Math.min(d, speed * (TICK_MS / 1000));
    const nx = m.x + (dx / d) * step, ny = m.y + (dy / d) * step;
    let moved = false;
    if (ghost) { m.x = nx; m.y = ny; moved = true; }
    else {
      const l = z.layout;
      const free = (x: number, y: number) => { const t = l.blocked[Math.floor(y / 64) * l.w + Math.floor(x / 64)]; return t === 0; };
      if (free(nx, ny)) { m.x = nx; m.y = ny; moved = true; }
      else if (free(nx, m.y)) { m.x = nx; moved = true; }
      else if (free(m.x, ny)) { m.y = ny; moved = true; }
    }
    if (moved) {
      z.monsters.move(m);
      m.dirty |= Upd.POS;
      const nd = angleByte(dx, dy);
      if (nd !== m.dir || m.anim !== Anim.WALK) { m.dir = nd; if (this.now >= m.animUntil) m.anim = Anim.WALK; m.dirty |= Upd.ANIM; }
    }
    return moved;
  }

  private bossPatterns(z: Zone, m: Monster, t: Player) {
    if (this.now < m.nextPatternAt) return;
    m.nextPatternAt = this.now + 5500;
    const pick = (this.tickNo + m.id) % 3;
    const warn = 1300;
    let tg: Telegraph;
    if (pick === 0) tg = { at: this.now + warn, shape: 'circle', x: t.x, y: t.y, r: 190, dmgMult: 2.2 };
    else if (pick === 1) tg = { at: this.now + warn, shape: 'ring', x: m.x, y: m.y, r: 340, r2: 170, dmgMult: 2 };
    else { const a = Math.atan2(t.y - m.y, t.x - m.x); tg = { at: this.now + warn, shape: 'line', x: m.x, y: m.y, r: 70, a, len: 620, dmgMult: 2.6 }; }
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
    if (a === b || a.zone !== b.zone || !a.zone.def.pvp || b.dead) return false;
    return true;
  }

  private cmdAttack(p: Player, id: number) {
    if (this.now < p.stunUntil) return;
    const sk = classSkill(p.char.cls, 0)!;
    const cd = attackCooldown(sk.cooldownMs, p.stats.atkSpeed);
    if (this.now + 60 < p.cooldowns[0]) return; // ağ titremesi toleransı
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

  private cmdSkill(p: Player, s: number, id?: number, x?: number, y?: number) {
    if (s < 1 || s > 3) return;
    if (this.now < p.stunUntil) return;
    const sk = classSkill(p.char.cls, s, p.char.spec);
    if (!sk) return this.notice(p, 'Bu beceri henüz açılmadı.');
    if (p.char.level < sk.unlock) return this.notice(p, `${sk.name} ${sk.unlock}. seviyede açılır.`);
    if (this.now + 60 < p.cooldowns[s]) return;
    const z = p.zone;
    const lvl = p.char.skills[s] ?? 1;
    const mult = sk.mult * skillDamageMult(lvl);
    const target = id ? this.findTarget(z, id) : null;
    const validTarget = (t: Monster | Player | null): t is Monster | Player =>
      !!t && (t instanceof Monster ? t.state !== MState.DEAD : this.canPvp(p, t));
    const cd = Math.round(sk.cooldownMs * (1 - Math.min(0.4, p.stats.skillSpeed / 100)));
    const use = (tx: number, ty: number, tgtId = 0) => {
      p.cooldowns[s] = this.now + cd;
      this.faceAndAnim(p, tx, ty, Anim.CAST, 480);
      z.emit(p.x, p.y, { e: Ev.CAST, src: p.id, skill: s, tgt: tgtId, x: tx | 0, y: ty | 0 });
      this.sendJson(p, { t: 'cd', s, until: p.cooldowns[s] - this.now });
    };
    switch (sk.kind) {
      case 'buff': {
        use(p.x, p.y);
        const heal = Math.round(p.stats.maxHp * (sk.healPct ?? 0) / 100);
        p.hp = Math.min(p.stats.maxHp, p.hp + heal); p.dirty |= Upd.HP;
        p.shieldUntil = this.now + (sk.durationMs ?? 0); p.shieldPct = sk.dmgReducePct ?? 0;
        z.emit(p.x, p.y, { e: Ev.HEAL, tgt: p.id, amount: heal });
        z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.SHIELD, x: p.x | 0, y: p.y | 0, r: 60, ms: sk.durationMs ?? 0, a: p.id & 0xffff });
        return;
      }
      case 'heal': {
        use(p.x, p.y);
        const heal = (q: Player) => { const h = Math.round(q.stats.maxHp * (sk.healPct ?? 0) / 100); q.hp = Math.min(q.stats.maxHp, q.hp + h); q.dirty |= Upd.HP; z.emit(q.x, q.y, { e: Ev.HEAL, tgt: q.id, amount: h }); };
        heal(p);
        z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.HEAL_WAVE, x: p.x | 0, y: p.y | 0, r: sk.range, ms: 700, a: 0 });
        return;
      }
      case 'aoe': {
        let cx = x ?? p.x, cy = y ?? p.y;
        if (validTarget(target)) { cx = target.x; cy = target.y; }
        if (Math.hypot(cx - p.x, cy - p.y) > sk.range + RANGE_TOLERANCE) {
          // menzil dışı nokta: menzile kırp
          const a = Math.atan2(cy - p.y, cx - p.x); cx = p.x + Math.cos(a) * sk.range; cy = p.y + Math.sin(a) * sk.range;
        }
        use(cx, cy, validTarget(target) ? target.id : 0);
        z.emit(cx, cy, { e: Ev.FX, fx: Fx.AOE_BLAST, x: cx | 0, y: cy | 0, r: sk.radius ?? 150, ms: 600, a: s });
        this.aoe(p, cx, cy, sk.radius ?? 150, sk.maxTargets ?? 5, mult, sk);
        return;
      }
      default: {
        if (!validTarget(target)) return this.notice(p, 'Önce bir hedef seç.');
        if (dist(p, target) > sk.range + MONSTER_RADIUS + RANGE_TOLERANCE) return this.notice(p, 'Hedef menzil dışında.');
        use(target.x, target.y, target.id);
        if (sk.kind === 'pull' && target instanceof Monster && !target.def.boss) {
          const a = Math.atan2(target.y - p.y, target.x - p.x);
          const np = nearestFree(z.layout, p.x + Math.cos(a) * 70, p.y + Math.sin(a) * 70);
          target.x = np.x; target.y = np.y; z.monsters.move(target); target.dirty |= Upd.POS;
          target.stunUntil = this.now + 600;
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
        this.hit(p, target, mult, sk);
      }
    }
  }

  private aoe(p: Player, x: number, y: number, r: number, max: number, mult: number, sk: SkillDef) {
    let n = 0;
    const z = p.zone;
    z.monsters.radius(x, y, r + MONSTER_RADIUS, (m) => { if (n < max && m.state !== MState.DEAD) { n++; this.hit(p, m, mult, sk); } });
    if (z.def.pvp && n < max) z.players.radius(x, y, r, (q) => { if (n < max && this.canPvp(p, q)) { n++; this.hit(p, q, mult, sk); } });
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
    // ödül: en çok hasar veren (boss) ya da öldüren
    let owner = killer;
    if (m.def.boss) { let top = 0; for (const [p, v] of m.threat) if (v > top && z.playerSet.has(p)) { top = v; owner = p; } }
    m.threat.clear(); m.target = null;
    this.rewardKill(owner, m);
    if (m.def.boss) this.bossDied(m, owner);
  }

  private rewardKill(p: Player, m: Monster) {
    const c = p.char;
    const diff = c.level - m.level;
    const mod = diff > 5 ? Math.max(0.1, 1 - (diff - 5) * 0.12) : diff < -3 ? 1.2 : 1;
    const bf = charBuffs(c.misc.buffs, this.now);
    this.addXp(p, Math.max(1, Math.round(m.xp * mod * TUNING.xpMul * (1 + bf.xpPct / 100))));
    c.kills++;
    const day = trDayKey(this.now);
    if (!c.misc.dailyKills || c.misc.dailyKills.day !== day) c.misc.dailyKills = { day, n: 0 };
    c.misc.dailyKills.n++;
    const w = c.equip.weapon;
    if (w) w.kills = (w.kills ?? 0) + 1;
    const base = LOOT_PROFILES[p.zone.def.theme] ?? LOOT_PROFILES[p.zone.id] ?? LOOT_PROFILES.forest;
    // yönetim: canavar türüne özel ganimet tablosu (boş alanlar harita profilinden)
    const mt = TUNING.monsters[m.def.id];
    const prof = !mt ? base : {
      equipChance: mt.equipChance ?? base.equipChance, rarityWeights: (mt.rarity as typeof base.rarityWeights) ?? base.rarityWeights,
      gems: mt.gems ?? base.gems, essence: mt.essence ?? base.essence,
      materials: [...base.materials.map((x) => ({ ...x, chance: mt.mats?.[x.id] ?? x.chance })),
        ...Object.entries(mt.mats ?? {}).filter(([id, ch]) => ch > 0 && MATERIAL.has(id) && !base.materials.some((x) => x.id === id)).map(([id, chance]) => ({ id, chance, qty: [1, 1] as [number, number] }))],
    };
    const vm = VARIANT_LOOT_MULT[m.variant] * (m.def.boss ? 20 : 1) * mod;
    const gems = Math.round(randInt(prof.gems[0], prof.gems[1]) * vm * TUNING.gemMul);
    const ess = Math.round(randInt(prof.essence[0], prof.essence[1]) * vm * TUNING.essenceMul * (1 + bf.essPct / 100));
    c.gems += gems; c.essence += ess;
    this.sendJson(p, { t: 'gain', gems, essence: ess, x: m.x | 0, y: m.y | 0 });
    // ekipman
    const drops = m.def.boss ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      if (rnd() < prof.equipChance * VARIANT_LOOT_MULT[m.variant] * mod * TUNING.dropMul * (1 + bf.dropPct / 100) || m.def.boss) {
        const item = this.rollEquipment(p, prof.rarityWeights, m.variant === 2);
        if (item) this.dropLoot(p, m, { kind: 'item', item });
      }
    }
    for (const mat of prof.materials) {
      if (rnd() < mat.chance * VARIANT_LOOT_MULT[m.variant] * mod * TUNING.dropMul) this.dropLoot(p, m, { kind: 'mat', key: mat.id, qty: randInt(mat.qty[0], mat.qty[1]) });
    }
    // yönetim (boss paneli): özel düşenler
    for (const d of mt?.drops ?? []) {
      if (rnd() >= d.chance) continue;
      if (d.kind === 'item') {
        if (!ITEM_TPL.has(d.key)) continue;
        const r = (RARITIES as readonly string[]).includes(d.rarity ?? '') ? d.rarity as Rarity : 'blue';
        for (let k = randInt(d.qty[0], d.qty[1]); k > 0; k--) this.dropLoot(p, m, { kind: 'item', item: makeItem(d.key, r, 'drop') });
      } else if (MATERIAL.has(d.key) || MALL.has(d.key)) this.dropLoot(p, m, { kind: 'mat', key: d.key, qty: randInt(d.qty[0], d.qty[1]) });
    }
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
    // %60 kendi sınıfına uygun
    const pool = ITEM_TEMPLATES.filter((t) => !t.cls || t.cls === p.char.cls || rnd() < 0.25);
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
    if (c.level >= cap) { c.xp = Math.min(c.xp + xp, xpToNext(c.level)); return; }
    c.xp += xp;
    let leveled = false;
    while (c.level < cap && c.xp >= xpToNext(c.level)) { c.xp -= xpToNext(c.level); c.level++; leveled = true; }
    if (leveled) {
      p.recompute(false);
      p.hp = p.stats.maxHp; // seviye atlayınca tam can (tasarım kararı)
      p.dirty |= Upd.HP | Upd.MAXHP | Upd.LEVEL;
      p.zone.emit(p.x, p.y, { e: Ev.LEVELUP, id: p.id, level: c.level });
      p.selfDirty |= 4;
      this.save(p, true);
    }
  }

  private killPlayer(p: Player, killer: Player | null) {
    if (p.dead) return;
    p.dead = true; p.deadAt = this.now; p.hp = 0; p.anim = Anim.DEAD; p.inputs.length = 0;
    p.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS;
    p.zone.emit(p.x, p.y, { e: Ev.DEATH, id: p.id, killer: killer?.id ?? 0 });
    let lost = 0;
    if (killer && p.zone.def.pvp && p.char.role === 'player') {
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
    this.moveToZone(p, z, z.layout.spawn.x + (rnd() - 0.5) * 80, z.layout.spawn.y + (rnd() - 0.5) * 60);
    this.sendJson(p, { t: 'respawned', hp: p.hp });
    this.save(p);
  }

  private moveToZone(p: Player, z: Zone, x: number, y: number) {
    const from = p.zone;
    const pos = nearestFree(z.layout, x, y);
    if (from !== z) {
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
    p.selfDirty |= 2 | 4; p.markSave();
  }
  private cmdUnequip(p: Player, slot: Slot) {
    const c = p.char;
    const it = c.equip[slot];
    if (!it) return;
    if (c.bag.length >= BAG_EQUIP_CAP) return this.notice(p, 'Çanta dolu.');
    delete c.equip[slot];
    c.bag.push(it);
    p.recompute(true);
    p.dirty |= Upd.MAXHP | Upd.HP;
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
    p.selfDirty |= 2; p.markSave();
  }

  private seenReceipt(p: Player, req: string): boolean {
    if (!req) return false;
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
    if (s < 0 || s > 3) return;
    if (this.seenReceipt(p, req)) return;
    const cur = ch.skills[s] ?? 1;
    if (cur >= 10) return this.notice(p, 'Beceri en üst seviyede.');
    if (s === 3) {
      if (!ch.spec) return this.notice(p, 'Önce uzmanlık seç.');
      const cost = 2 * 5 * cur;
      if (ch.gems < cost) return this.notice(p, `${cost} Mücevher gerekir.`);
      ch.gems -= cost; ch.skills[3] = cur + 1;
    } else {
      const used = (ch.skills[0] ?? 1) + (ch.skills[1] ?? 1) + (ch.skills[2] ?? 1);
      if (used >= skillUpgradeBudget(ch.level)) return this.notice(p, 'Geliştirme hakkın yok; seviye atladıkça açılır.');
      const cost = cur * 5;
      if (ch.gems < cost) return this.notice(p, `${cost} Mücevher gerekir.`);
      ch.gems -= cost; ch.skills[s] = cur + 1;
    }
    p.selfDirty |= 1 | 4; p.markSave();
    this.notice(p, 'Beceri geliştirildi.', 'ok');
  }

  private cmdSpec(p: Player, spec: string, req: string) {
    const ch = p.char;
    if (ch.level < 30) return this.notice(p, 'Uzmanlık 30. seviyede açılır.');
    if (ch.spec) return this.notice(p, 'Uzmanlık zaten seçili. Değiştirmek için sıfırlama parşömeni gerekir.');
    if (!CLASSES[ch.cls].specs.some((s) => s.id === spec)) return;
    if (this.seenReceipt(p, req)) return;
    ch.spec = spec;
    p.selfDirty |= 4; p.markSave();
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
    if (key === 'red_potion') return this.usePotion(p, false);
    this.notice(p, 'Bu eşya doğrudan kullanılamaz.');
  }

  private cmdNpc(p: Player, id: string) {
    const def = p.zone.def.npcs.find((n) => n.id === id);
    if (!def || !this.nearNpc(p, id)) return this.notice(p, 'NPC\'ye yaklaş.');
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
    p.selfDirty |= 1 | 2 | 4; this.save(p, true);
    this.sendJson(p, { t: 'upgradeResult', req: c.req, ok, before, after: it.plus, chance, item: it.id });
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
    if (items.length === 0) return this.notice(p, 'Satmak için en az bir eşya seç.');
    if (items.length > STALL_MAX_ITEMS) return this.notice(p, `Dükkâna en çok ${STALL_MAX_ITEMS} eşya konabilir.`);
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
    const moved = picked.map(({ idx, price }) => ({ item: p.char.bag[idx], price }));
    const skin = p.char.misc.stallSkin === 2 ? 'emerald' : undefined;
    const ids = new Set(moved.map((m) => m.item.id));
    p.char.bag = p.char.bag.filter((b) => !ids.has(b.id));
    const title = sanitizeChat(String(c.title ?? ''), STALL_TITLE_MAX).trim() || `${p.char.name} Dükkânı`;
    this.market.stalls.push({ id: uuid(), ownerId: p.char.id, ownerName: p.char.name, zone: z.id, title, x: Math.round(p.x), y: Math.round(p.y), items: moved, openedAt: this.now, earned: 0, ...(skin ? { skin } : {}) });
    p.selfDirty |= 2;
    this.persistMarket([p]);
    this.sendMyStall(p);
    this.broadcastStalls(z);
    this.notice(p, `Dükkânın açıldı: ${moved.length} eşya. İstediğin yere gidebilirsin, oyundan çıksan da açık kalır.`, 'ok');
  }
  private cmdStallClose(p: Player) {
    const s = this.ownStall(p.char.id);
    if (!s) return this.notice(p, 'Açık bir dükkânın yok.');
    if (p.char.bag.length + s.items.length > BAG_EQUIP_CAP) return this.notice(p, `Dükkândaki ${s.items.length} eşya için çantanda yer aç (${BAG_EQUIP_CAP - p.char.bag.length} boş yer var).`);
    for (const m of s.items) p.char.bag.push(m.item);
    this.market.stalls = this.market.stalls.filter((q) => q !== s);
    p.selfDirty |= 2;
    this.persistMarket([p]);
    this.sendMyStall(p);
    const z = this.zones.get(s.zone); if (z) this.broadcastStalls(z);
    this.notice(p, s.items.length ? `Dükkânın kapandı, ${s.items.length} eşya çantana döndü.` : 'Dükkânın kapandı.', 'info');
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
    const idx = s.items.findIndex((m) => m.item.id === String(c.item ?? ''));
    if (idx < 0) { this.cmdStallView(p, s.id); return this.notice(p, 'Bu eşya satılmış.'); }
    const { item, price } = s.items[idx];
    if (price !== Math.floor(Number(c.price))) { this.cmdStallView(p, s.id); return this.notice(p, 'Fiyat değişmiş, dükkânı yeniledim.'); }
    if (p.char.gems < price) return this.notice(p, `Yeterli Mücevherin yok (${price.toLocaleString('tr-TR')} gerekiyor).`);
    if (p.char.bag.length >= BAG_EQUIP_CAP) return this.notice(p, 'Çantan dolu.');
    if (this.seenReceipt(p, String(c.req ?? ''))) return;
    // tek adımda aktarım; para sahibine: kanaldaysa cüzdanına, değilse bekleyen kazanca
    s.items.splice(idx, 1);
    delete item.locked;
    item.src = 'pazar';
    p.char.gems -= price; p.char.bag.push(item); p.selfDirty |= 1 | 2;
    s.earned += price;
    const name = itemDisplayName(item);
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
    if (mask & 1) Object.assign(o, { level: c.level, xp: c.xp, xpNext: xpToNext(c.level), gems: c.gems, essence: c.essence, cp: c.cp, kills: c.kills, autoPotion: !!c.misc.autoPotion, daily: c.misc.dailyKills?.n ?? 0, buffs: c.misc.buffs ?? {}, autoPool: c.misc.autoPool ?? 0, bait: c.misc.bait ?? 0, stallSkin: c.misc.stallSkin ?? 0 });
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
      if (p.selfDirty) { this.sendSelf(p, p.selfDirty); p.selfDirty = 0; }
      if ((p.saveDirty || p.char.kills) && this.now - p.lastSaveAt > this.opt.saveIntervalMs + ((p.sid % 50) * 40)) {
        if (p.saveDirty) this.save(p); else p.lastSaveAt = this.now;
      }
    }
  }

  setWorld(health: number, online: number) { this.worldHealth = health; this.online = online; }

  // ───────────────────────────── bosslar: doğma, duyuru, durum ─────────────────────────────
  respawnDelay(def: { id: string; boss?: boolean; respawnMin?: number }) {
    const mt = TUNING.monsters[def.id];
    if (def.boss) return (mt?.respawnMin ?? def.respawnMin ?? 10) * 60_000;
    if (mt?.respawnMin) return mt.respawnMin * 60_000;
    return (12_000 + rnd() * 8000) * TUNING.respawnMul * (mt?.respawnMul ?? 1);
  }
  /** Kanaldaki bütün bossların durumu: canlı mı, nerede, ne zaman doğacak. */
  bossStatus() {
    const out: { id: string; name: string; map: string; x: number; y: number; alive: boolean; hp: number; nextAt: number | null; level: number }[] = [];
    for (const z of this.zones.values()) {
      for (const sp of z.layout.spawnPoints) {
        const def = MONSTERS.find((d) => d.id === sp.monster);
        if (!def?.boss) continue;
        const m = z.monsterList.find((q) => q.sp === sp);
        const alive = !!m && m.state !== MState.DEAD;
        let nextAt: number | null = null;
        if (!alive) { const r = z.respawnQueue.find((q) => q.sp === sp); nextAt = r ? r.at : m ? m.removeAt + this.respawnDelay(def) : null; }
        out.push({ id: def.id, name: def.name, map: z.id, x: Math.round(sp.x), y: Math.round(sp.y), alive, hp: alive && m ? Math.round((m.hp / m.maxHp) * 100) : 0, nextAt, level: sp.level });
      }
    }
    return out;
  }
  private broadcastBosses() { const msg = JSON.stringify({ t: 'bosses', list: this.bossStatus() }); for (const q of this.bySid.values()) this.pushOut(q.sid, msg); }
  private bossSpawned(z: Zone, def: { id: string; name: string }, sp: { x: number; y: number }) {
    const msg = JSON.stringify({ t: 'boss', ev: 'spawn', id: def.id, name: def.name, map: z.id, x: Math.round(sp.x), y: Math.round(sp.y) });
    for (const q of this.bySid.values()) this.pushOut(q.sid, msg);
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
    const done = (text: string, mask = 1 | 2) => { p.selfDirty |= mask; this.save(p, true); this.notice(p, text, 'ok'); this.sendJson(p, { t: 'result', for: 'use', req, ok: true, msg: text }); };
    if (m.buff) {
      const b = (c.misc.buffs ??= {});
      if (key === 'war_ration' && (b.war_ration ?? 0) > this.now) return this.notice(p, 'Kumanyanın etkisi sürüyor; bitince tekrar kullanabilirsin.');
      if (this.seenReceipt(p, req)) return;
      if ((PET_KEYS as readonly string[]).includes(key)) for (const pk of PET_KEYS) if (pk !== key) delete b[pk]; // aynı anda tek pet
      b[m.buff.key] = Math.max(b[m.buff.key] ?? 0, this.now) + m.buff.ms;
      consume(); p.recompute(true); p.dirty |= Upd.MAXHP | Upd.HP;
      const left = b[m.buff.key] - this.now, h = Math.round(left / 3600_000);
      return done(`${m.name} etkin (${h >= 48 ? Math.round(h / 24) + ' gün' : h >= 1 ? h + ' saat' : Math.round(left / 60_000) + ' dakika'}).`, 1 | 2 | 4);
    }
    if (AUTO_POOL[key]) { if (this.seenReceipt(p, req)) return; c.misc.autoPool = (c.misc.autoPool ?? 0) + AUTO_POOL[key]; consume(); return done(`Oto iksir deposu: ${c.misc.autoPool.toLocaleString('tr-TR')} can.`); }
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
  private cmdMarketSearch(p: Player, q: string) {
    if ((p.char.misc.buffs?.trade_glass ?? 0) <= this.now) return this.notice(p, 'Pazar araması için Ticaret Camı gerekir (Nesne Market).');
    const needle = q.trim().toLocaleLowerCase('tr').slice(0, 40);
    const res: { stall: string; owner: string; title: string; item: ItemInstance; price: number; x: number; y: number }[] = [];
    for (const st of this.market.stalls) for (const e of st.items) {
      if (needle && !itemDisplayName(e.item).toLocaleLowerCase('tr').includes(needle)) continue;
      res.push({ stall: st.id, owner: st.ownerName, title: st.title, item: e.item, price: e.price, x: Math.round(st.x), y: Math.round(st.y) });
      if (res.length >= 80) break;
    }
    res.sort((a, b) => a.price - b.price);
    this.sendJson(p, { t: 'market_results', q, list: res });
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
  private nearWater(p: Player) {
    const l = p.zone.layout, tx = Math.floor(p.x / 64), ty = Math.floor(p.y / 64);
    for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) {
      const x = tx + dx, y = ty + dy; if (x < 0 || y < 0 || x >= l.w || y >= l.h) continue;
      const g = l.ground[y * l.w + x]; if (g === 4 || g === 10) return true; // su, derin su
    }
    return false;
  }
  private cmdFishCast(p: Player) {
    const c = p.char;
    if (p.dead) return;
    if ((c.materials[ROD_ID] ?? 0) <= 0) return this.notice(p, 'Oltan yok. Şelale Gölü\'ndeki Balıkçı Hasan\'dan alabilirsin.');
    if (!this.nearWater(p)) return this.notice(p, 'Suya yaklaş.');
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
    if (el < 1200 || el > 120_000) return this.sendJson(p, { t: 'fish_result', ok: false }); // tutma oyunu oynanmadan bitmez
    const c = p.char, def = FISH_BY_ID.get(f.fish)!;
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
    if (!p.zone.def.npcs.some((n) => n.actions.includes('fishing_shop') && this.nearNpc(p, n.id))) return this.notice(p, 'Balıkçı Hasan\'a yaklaş.');
    const c = p.char, price = fishingConf().rodPrice;
    if ((c.materials[ROD_ID] ?? 0) > 0) return this.notice(p, 'Zaten bir oltan var.', 'info');
    if (c.gems < price) return this.notice(p, `Olta ${price.toLocaleString('tr-TR')} Mücevher.`);
    if (this.seenReceipt(p, req)) return;
    c.gems -= price; c.materials[ROD_ID] = 1;
    p.selfDirty |= 1 | 2; this.save(p, true);
    this.notice(p, 'Olta aldın! Suya yaklaş ve "Olta At"a bas.', 'ok');
  }
  private cmdFishSell(p: Player, req: string) {
    if (!p.zone.def.npcs.some((n) => n.actions.includes('fishing_shop') && this.nearNpc(p, n.id))) return this.notice(p, 'Balıkçı Hasan\'a yaklaş.');
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
    const seen = new Set<number>();
    const heartbeat = this.tickNo % 10 === 0;
    for (const z of this.zones.values()) {
      if (!z.playerSet.size) continue;
      for (const p of z.playerSet) {
        const x0 = p.x - VIEW_HALF_W, x1 = p.x + VIEW_HALF_W, y0 = p.y - VIEW_HALF_H, y1 = p.y + VIEW_HALF_H;
        const reset = p.resetPending;
        if (reset) { p.known.clear(); p.resetPending = false; }
        w.reset();
        w.wU8(reset ? 2 : Op.SNAPSHOT);
        w.wU32((this.now - this.t0) >>> 0);
        w.wU16(p.lastSeq);
        w.wF32(p.x); w.wF32(p.y);
        w.wU32(Math.max(0, Math.round(p.hp))); w.wU32(p.stats.maxHp); w.wU8(this.playerFlags(p));
        seen.clear();
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
        for (const q of visPlayers) {
          seen.add(q.id);
          if (!p.known.has(q.id)) { p.known.set(q.id, Kind.PLAYER); writeSpawn(w, this.playerSpawn(q)); nSpawn++; }
          else if (q.dirty) updList.push(q);
        }
        z.monsters.query(x0, y0, x1, y1, (m) => {
          if (m.x < x0 || m.x > x1 || m.y < y0 || m.y > y1) return;
          if (m.state === MState.DEAD && !p.known.has(m.id)) return;
          seen.add(m.id);
          if (!p.known.has(m.id)) { p.known.set(m.id, Kind.MONSTER); writeSpawn(w, monsterSpawn(m)); nSpawn++; }
          else if (m.dirty) updList.push(m);
        });
        z.loot.query(x0, y0, x1, y1, (l) => {
          seen.add(l.id);
          if (!p.known.has(l.id)) { p.known.set(l.id, Kind.LOOT); writeSpawn(w, lootSpawn(l, this.now)); nSpawn++; }
        });
        w.patchU16(spawnAt, nSpawn);
        w.wU16(updList.length);
        for (const e of updList) {
          const mask = e.dirty;
          writeUpdate(w, { id: e.id, mask, x: Math.round(e.x), y: Math.round(e.y), hp: Math.max(0, Math.round(e.hp)), dir: e.dir, anim: e.anim, maxHp: e instanceof Player ? e.stats.maxHp : e.maxHp, flags: e instanceof Player ? this.playerFlags(e) : e.state === MState.DEAD ? EFlag.DEAD : 0, level: e instanceof Player ? e.char.level : e.level });
        }
        const remAt = w.reserveU16(); let nRem = 0;
        for (const id of p.known.keys()) if (!seen.has(id)) { p.known.delete(id); w.wU32(id); nRem++; }
        w.patchU16(remAt, nRem);
        const evAt = w.reserveU16(); let nEv = 0;
        for (const ze of z.events) {
          if (!eventVisible(ze, p, x0, y0, x1, y1)) continue;
          writeEvent(w, ze.ev); nEv++;
        }
        w.patchU16(evAt, nEv);
        const hasContent = reset || nSpawn || updList.length || nRem || nEv || p.movedThisTick || p.inputs.length || p.dirty || heartbeat;
        if (hasContent || this.tickNo - p.lastSnapTick >= 5) { p.lastSnapTick = this.tickNo; this.pushOut(p.sid, w.finish()); }
      }
    }
  }

  private playerSpawn(q: Player): EntitySpawn {
    return { kind: Kind.PLAYER, id: q.id, cls: q.clsIndex, name: q.char.name, level: q.char.level, x: Math.round(q.x), y: Math.round(q.y), dir: q.dir, anim: q.anim, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, flags: this.playerFlags(q), weapon: q.weaponRarityIndex(), wplus: Math.min(255, q.char.equip.weapon?.plus ?? 0), guild: '' };
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
  c.stats = { str: 0, res: 0, vit: 0 }; c.skills = [1, 1, 1, 1];
  c.gems = 0; c.essence = 0; c.cp = 0; c.arenaCoin = 0;
  c.bag = [];
  c.equip = { weapon: makeItem(`w_${c.cls}`, 'white', 'starter', 0), armor: makeItem(`a_${c.cls}`, 'white', 'starter', 0) };
  c.materials = { red_potion: 5 };
  c.misc = {};
  c.map = 'bazaar'; c.x = l.spawn.x; c.y = l.spawn.y;
  c.saveVersion++;
}

export function makeItem(tplId: string, rarity: Rarity, src: string, enchCount?: number): ItemInstance {
  const tpl = ITEM_TPL.get(tplId)!;
  // canavardan düşen eşya: 1–4 rastgele efsun (nadirlik yükseldikçe çok efsun olasılığı artar)
  // yönetim: efsun sayısı/kademe oranları, kademe değerleri ve kapalı efsunlar (boşsa varsayılan rehber değerleri)
  const et = TUNING.enchants;
  const pick = (w: readonly number[]) => { const tot = w.reduce((a, b) => a + b, 0); let r = rnd() * tot; for (let k = 0; k < w.length; k++) if ((r -= w[k]) <= 0) return k; return 0; };
  const cw = et.countWeights?.[rarity] ?? et.countWeights?.default ?? ENCHANT_COUNT_WEIGHTS[rarity] ?? ENCHANT_COUNT_WEIGHTS.default;
  const grp = et.chance && rarity in et.chance ? rarity : 'default';
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

/** Kayıttan gelen pazar durumunu doğrular (bozuk kayıt dünyayı çökertmesin; geçersiz dükkân atlanır). */
function sanitizeMarket(raw: unknown): MarketState {
  const out: MarketState = { v: 1, stalls: [], pending: {} };
  const r = (raw && typeof raw === 'object' ? raw : {}) as { stalls?: unknown; pending?: unknown };
  const okItem = (it: unknown): it is ItemInstance => !!it && typeof it === 'object' && typeof (it as ItemInstance).id === 'string' && ITEM_TPL.has((it as ItemInstance).tpl) && Array.isArray((it as ItemInstance).ench);
  for (const s of Array.isArray(r.stalls) ? r.stalls as MarketStall[] : []) {
    if (!s || typeof s.id !== 'string' || !Number.isFinite(s.ownerId) || typeof s.zone !== 'string' || !MAPS[s.zone]?.market || !Array.isArray(s.items)) continue;
    const items = s.items.filter((m) => okItem(m?.item) && Number.isFinite(m.price) && m.price >= 1).map((m) => ({ item: m.item, price: Math.floor(m.price) }));
    if (!items.length) continue;
    out.stalls.push({ id: s.id, ownerId: s.ownerId, ownerName: String(s.ownerName ?? '?').slice(0, 24), zone: s.zone, title: String(s.title ?? '').slice(0, STALL_TITLE_MAX), x: Number(s.x) || 0, y: Number(s.y) || 0, items, openedAt: Number(s.openedAt) || 0, earned: Number(s.earned) || 0, ...(s.skin === 'emerald' ? { skin: 'emerald' } : {}) });
  }
  if (r.pending && typeof r.pending === 'object') for (const [k, v] of Object.entries(r.pending as MarketState['pending'])) {
    if (!/^-?\d+$/.test(k) || !v || !Number.isFinite(v.gems) || v.gems <= 0) continue;
    out.pending[k] = { gems: Math.floor(v.gems), sales: Array.isArray(v.sales) ? v.sales.slice(-30) : [] };
  }
  return out;
}
