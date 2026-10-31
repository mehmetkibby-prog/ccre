import {
  TICK_MS, VIEW_HALF_W, VIEW_HALF_H, NO_DIR, DIR_STEPS, LOOT_TTL_MS, LOOT_OWNER_ONLY_MS, LOOT_PICKUP_RANGE, RESPAWN_DELAY_MS,
  COMBAT_LOCK_MS, BAG_EQUIP_CAP, CHAT_MAX, Anim, Upd, EFlag, Ev, DmgFlag, Fx, Kind, Op, BinWriter, writeSpawn, writeUpdate, writeEvent,
  stepMove, nearestFree, getLayout, MAPS, classSkill, attackCooldown, skillDamageMult, rollDamage, xpToNext, statBudget, skillUpgradeBudget,
  LEVEL_CAP_BASE, STAT_MAX, ITEM_TPL, ITEM_TEMPLATES, RARITY, RARITIES, ENCHANTS, ENCHANT_TIER_WEIGHTS, LOOT_PROFILES, VARIANT_LOOT_MULT,
  SHOPS, SELL_PRICES, UPGRADE_TABLE, masteryChance, MATERIAL, trDayKey, sanitizeChat, itemDisplayName, CLASSES, MONSTERS,
  type ClientCmd, type ItemInstance, type Rarity, type Slot, type EnchantType, type GameEvent, type EntitySpawn, type SkillDef,
} from '@col/shared';
import type { CharState, FromWorker, WorkerStats } from '../types.ts';
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

  // ───────────────────────────── bağlantı ─────────────────────────────
  join(sid: number, char: CharState) {
    if (this.bySid.has(sid)) return;
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
      case 'donate': return this.cmdDonate(p, c.amount | 0, String(c.req ?? ''));
      case 'upgrade': return this.cmdUpgrade(p, c);
      case 'npc': return this.cmdNpc(p, String(c.id));
      case 'use': return this.cmdUse(p, String(c.key), String(c.req ?? ''));
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
      if (p.char.misc.autoPotion && p.hp <= p.stats.maxHp * 0.5 && now - p.lastAutoPotionAt >= 2000) this.usePotion(p, true);
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
        if (now >= m.removeAt) { z.removeMonster(m); z.respawnQueue.push({ at: now + (m.def.boss ? 10 * 60_000 : 12_000 + rnd() * 8000), sp: m.sp }); }
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
    if (dist(p, t) > sk.range + MONSTER_RADIUS + RANGE_TOLERANCE) return;
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
      const forestBonus = z.def.theme === 'forest' ? st.enchants.forest_power ?? 0 : z.def.theme === 'frozen' ? st.enchants.frost_power ?? 0 : 0;
      atk *= 1 + (forestBonus + st.pvePower) / 100;
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
      const atk = st.atk * (1 + st.pvpPower / 100);
      let { dmg, crit } = rollDamage(atk, mult * 0.6, t.stats.def, st.crit, st.critDmg, rnd);
      dmg = Math.max(1, Math.round(dmg * (1 - Math.min(60, t.stats.pvpResist) / 100)));
      if (t.shieldUntil > this.now) dmg = Math.round(dmg * (1 - t.shieldPct / 100));
      t.hp -= dmg; t.dirty |= Upd.HP; t.lastDamageAt = this.now; t.combatUntil = this.now + COMBAT_LOCK_MS;
      if (sk?.stunMs) t.stunUntil = this.now + Math.round(sk.stunMs * 0.6);
      if (sk?.rootMs) t.rootUntil = this.now + Math.round(sk.rootMs * 0.6);
      z.emit(t.x, t.y, { e: Ev.DAMAGE, src: p.id, tgt: t.id, amount: dmg, flags: crit ? DmgFlag.CRIT : 0 });
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
  }

  private rewardKill(p: Player, m: Monster) {
    const c = p.char;
    const diff = c.level - m.level;
    const mod = diff > 5 ? Math.max(0.1, 1 - (diff - 5) * 0.12) : diff < -3 ? 1.2 : 1;
    this.addXp(p, Math.max(1, Math.round(m.xp * mod)));
    c.kills++;
    const day = trDayKey(this.now);
    if (!c.misc.dailyKills || c.misc.dailyKills.day !== day) c.misc.dailyKills = { day, n: 0 };
    c.misc.dailyKills.n++;
    const w = c.equip.weapon;
    if (w) w.kills = (w.kills ?? 0) + 1;
    const prof = LOOT_PROFILES[p.zone.def.theme] ?? LOOT_PROFILES[p.zone.id] ?? LOOT_PROFILES.forest;
    const vm = VARIANT_LOOT_MULT[m.variant] * (m.def.boss ? 20 : 1) * mod;
    const gems = Math.round(randInt(prof.gems[0], prof.gems[1]) * vm);
    const ess = Math.round(randInt(prof.essence[0], prof.essence[1]) * vm);
    c.gems += gems; c.essence += ess;
    this.sendJson(p, { t: 'gain', gems, essence: ess, x: m.x | 0, y: m.y | 0 });
    // ekipman
    const drops = m.def.boss ? 3 : 1;
    for (let i = 0; i < drops; i++) {
      if (rnd() < prof.equipChance * VARIANT_LOOT_MULT[m.variant] * mod || m.def.boss) {
        const item = this.rollEquipment(p, prof.rarityWeights, m.variant === 2);
        if (item) this.dropLoot(p, m, { kind: 'item', item });
      }
    }
    for (const mat of prof.materials) {
      if (rnd() < mat.chance * VARIANT_LOOT_MULT[m.variant] * mod) this.dropLoot(p, m, { kind: 'mat', key: mat.id, qty: randInt(mat.qty[0], mat.qty[1]) });
    }
    p.selfDirty |= 1; p.markSave();
  }

  rollEquipment(p: Player, weights: Partial<Record<Rarity, number>>, shift: boolean): ItemInstance | null {
    const entries = Object.entries(weights) as [Rarity, number][];
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
    } else {
      p.x = pos.x; p.y = pos.y; z.players.move(p); p.dirty |= Upd.POS; p.inputs.length = 0;
      this.sendJson(p, { t: 'map', map: z.id, x: p.x, y: p.y });
    }
    z.emit(p.x, p.y, { e: Ev.FX, fx: Fx.TELEPORT, x: p.x | 0, y: p.y | 0, r: 60, ms: 900, a: 0 });
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
      this.sendJson(p, { t: 'loot', name: `${l.payload.qty}× ${MATERIAL.get(l.payload.key)?.name ?? l.payload.key}`, rarity: 'white' });
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
  private cmdUse(p: Player, key: string, req: string) {
    const ch = p.char;
    if ((ch.materials[key] ?? 0) <= 0) return this.notice(p, 'Elinde yok.');
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

  private cmdSell(p: Player, ids: string[], req: string) {
    if (!this.nearNpc(p, 'tuccar') && !this.nearNpc(p, 'haso')) return this.notice(p, 'Satış için Tüccar Selim\'e veya Haso\'ya yaklaş.');
    if (this.seenReceipt(p, req)) return;
    const c = p.char;
    let total = 0, n = 0;
    for (const id of ids) {
      const i = c.bag.findIndex((x) => x.id === id);
      if (i < 0) continue;
      const it = c.bag[i];
      if (it.locked) continue;
      total += SELL_PRICES[it.rarity] ?? 1;
      c.bag.splice(i, 1); n++;
    }
    c.gems += total;
    p.selfDirty |= 1 | 2; this.save(p, true);
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

  private cmdDonate(p: Player, amount: number, req: string) {
    if (amount <= 0 || amount > p.char.essence) return this.notice(p, 'Geçersiz bağış miktarı.');
    if (this.seenReceipt(p, req)) return;
    p.char.essence -= amount;
    p.selfDirty |= 1; this.save(p, true);
    this.opt.post({ type: 'donate', sid: p.sid, charId: p.char.id, name: p.char.name, amount });
  }

  private cmdUpgrade(p: Player, c: Extract<ClientCmd, { t: 'upgrade' }>) {
    if (!this.nearNpc(p, 'haso')) return this.reply(p, c, false, 'Demirci Haso\'ya yaklaş.');
    if (this.now < p.combatUntil) return this.reply(p, c, false, 'Savaş sırasında artı basılamaz.');
    if (this.seenReceipt(p, c.req)) return;
    const ch = p.char;
    const it = ch.bag.find((x) => x.id === c.item) ?? Object.values(ch.equip).find((x) => x?.id === c.item);
    if (!it) return this.reply(p, c, false, 'Eşya bulunamadı.');
    if (it.plus !== c.expectPlus) return this.reply(p, c, false, 'Eşya durumu değişmiş, pencere yenilendi.');
    const step = UPGRADE_TABLE.find((s) => s.target === it.plus + 1);
    if (!step) return this.reply(p, c, false, 'Eşya en üst artıda.');
    const m = ch.materials;
    if ((m.kor_seal ?? 0) < step.korSeal || (m[step.mat] ?? 0) < step.matQty || ch.gems < step.gems) return this.reply(p, c, false, 'Malzeme veya Mücevher yetersiz.');
    const useMastery = c.mastery && step.chance < 100 && (m.mastery_seal ?? 0) > 0;
    const chance = useMastery ? masteryChance(step.chance) : step.chance;
    m.kor_seal -= step.korSeal; m[step.mat] -= step.matQty; ch.gems -= step.gems;
    if (useMastery) m.mastery_seal -= 1;
    const ok = rnd() * 100 < chance;
    const before = it.plus;
    it.plus = ok ? it.plus + 1 : Math.max(0, it.plus - 1);
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
  notice(p: Player, text: string, kind: 'info' | 'error' | 'ok' = 'error') { this.sendJson(p, { t: 'notice', text, kind }); }

  private sendSelf(p: Player, mask: number) {
    const c = p.char;
    const o: Record<string, unknown> = { t: 'self' };
    if (mask & 1) Object.assign(o, { level: c.level, xp: c.xp, xpNext: xpToNext(c.level), gems: c.gems, essence: c.essence, cp: c.cp, kills: c.kills, autoPotion: !!c.misc.autoPotion, daily: c.misc.dailyKills?.n ?? 0 });
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
    return { kind: Kind.PLAYER, id: q.id, cls: q.clsIndex, name: q.char.name, level: q.char.level, x: Math.round(q.x), y: Math.round(q.y), dir: q.dir, anim: q.anim, hp: Math.max(0, Math.round(q.hp)), maxHp: q.stats.maxHp, flags: this.playerFlags(q), weapon: q.weaponRarityIndex(), guild: '' };
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
  const icon = pl.kind === 'item' ? ITEM_TPL.get(pl.item.tpl)?.icon ?? 'bag' : MATERIAL.get(pl.key)?.icon ?? 'bag';
  const rarity = pl.kind === 'item' ? RARITIES.indexOf(pl.item.rarity) : 0;
  const label = pl.kind === 'item' ? itemDisplayName(pl.item) : `${pl.qty}× ${MATERIAL.get(pl.key)?.name ?? pl.key}`;
  return { kind: Kind.LOOT, id: l.id, icon, rarity, x: Math.round(l.x), y: Math.round(l.y), owner: l.ownerChar, ttl: Math.max(0, LOOT_TTL_MS - (now - l.createdAt)), label };
}

/** Eşya üretimi: efsunlar uygun havuzdan, tür tekrar etmeden. */
export function makeItem(tplId: string, rarity: Rarity, src: string, enchCount?: number): ItemInstance {
  const tpl = ITEM_TPL.get(tplId)!;
  const n = enchCount ?? (rarity === 'white' ? 0 : rarity === 'blue' ? randInt(1, 2) : rarity === 'orange' ? randInt(2, 3) : 4);
  const pool = (Object.keys(ENCHANTS) as EnchantType[]).filter((k) => ENCHANTS[k].slots.includes(tpl.slot));
  const ench: ItemInstance['ench'] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const t = pool.splice(Math.floor(rnd() * pool.length), 1)[0];
    let r = rnd() * 100, tier = 0;
    for (let k = 0; k < 4; k++) { if ((r -= ENCHANT_TIER_WEIGHTS[k]) <= 0) { tier = k; break; } }
    ench.push({ t, v: ENCHANTS[t].tiers[tier], tier });
  }
  return { id: crypto.randomUUID(), tpl: tplId, rarity, plus: 0, ench, src };
}
