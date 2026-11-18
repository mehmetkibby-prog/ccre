/**
 * Kor Kulesi (sunucu): her grubun kendi 3 katlı kulesi (örnek). Kanal başına FORGE_SLOTS koşu aynı anda sürebilir.
 *
 * Akış (1. ve 2. kat): 1. dalga → 2. dalga → bulmaca → 3. dalga (elitler) → kapı. 3. kat: Karademir.
 * Kapıya giren ilk üye bütün grubu bir üst kata taşır; son katın kapısı köye çıkarır.
 * Koşu, üyeleri kopsa bile 2 dakika bekler (yeniden bağlanan kaldığı kattan sürer); kimse dönmezse silinir.
 */
import {
  Ev, Fx, MONSTERS, TUNING, forgeRoom, FORGE_MAP, FORGE_FLOORS, FORGE_SLOTS, FORGE_PLATE_R, FORGE_GATE_R, EMBER_PICK_R, ANVIL_R,
  FORGE_PUZZLE_NAMES, MOLD_SYMBOLS, Upd, Anim, type ForgePuzzle,
} from '@col/shared';
import { Player, Monster, MState } from './entities.ts';
import type { Zone } from './zone.ts';

export type ForgeStage = 'w1' | 'w2' | 'puzzle' | 'w3' | 'boss' | 'done';
export interface ForgeRun {
  slot: number; floor: number; stage: ForgeStage;
  /** sıradaki aşama ve başlama anı (dalga arası nefes) */
  pending: ForgeStage | null; nextAt: number;
  members: Set<number>;
  mons: Set<Monster>; total: number;
  puzzle: ForgePuzzle | null;
  mold?: { sym: number[]; open: number[]; found: number; closeAt: number };
  ember?: { spot: number; carrier: number; coolAt: number; delivered: number; need: number; respawnAt: number; last: number };
  boss?: Monster; addsDone: number;
  emptySince: number; startedAt: number; lastSent: number;
}
export interface ForgeHost {
  readonly now: number;
  zone(): Zone;
  byChar(charId: number): Player | undefined;
  partyMembers(p: Player): Player[];
  sendJson(p: Player, o: unknown): void;
  notice(p: Player, text: string, kind?: 'info' | 'error' | 'ok'): void;
  moveToZone(p: Player, z: Zone, x: number, y: number): void;
  toTown(p: Player): void;
  zap(p: Player, frac: number, msg: string): void;
  broadcastWorld(from: string, text: string): void;
  save(p: Player, urgent?: boolean): void;
  nearWarden(p: Player): boolean;
}

const rnd = Math.random;
const randInt = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);
const EMPTY_GRACE_MS = 120_000;
const DEFS = () => new Map(MONSTERS.map((m) => [m.id, m] as const));

export class Forge {
  runs = new Map<number, ForgeRun>();
  private ofChar = new Map<number, ForgeRun>();
  /** oyuncunun üstünde durduğu kalıp taşı (kenar tetiklemesi) */
  private plateOf = new Map<number, number>();
  private gateNote = new Map<number, number>();
  constructor(private h: ForgeHost) {}

  runOf(p: Player) { return this.ofChar.get(p.char.id); }
  hasChar(charId: number) { return this.ofChar.has(charId); }
  /** Tek oyuncuya güncel durum (giriş, yeniden bağlanma) */
  sendTo(p: Player) { const run = this.ofChar.get(p.char.id); if (run) this.send(run); else this.h.sendJson(p, { t: 'forge', on: false }); }

  // ───────── giriş / çıkış ─────────
  enter(p: Player) {
    const T = TUNING.forge, h = this.h, c = p.char;
    if (!T.enabled) return h.notice(p, 'Kor Kulesi şu an kapalı.');
    if (p.dead) return;
    if (p.zone.id !== 'bazaar' || !h.nearWarden(p)) return h.notice(p, 'Zindan Bekçisi\'nin yanına git.');
    if (c.level < T.minLevel) return h.notice(p, `Kor Kulesi için en az ${T.minLevel}. seviye gerekir.`);
    // grubun süren koşusu varsa ona katıl (bekleme ve bedel yok: grup arkadaşına yetişir)
    for (const q of h.partyMembers(p)) {
      const run = q !== p ? this.ofChar.get(q.char.id) : undefined;
      if (run) { this.join(run, p); h.notice(p, `Grubunun Kor Kulesi koşusuna katıldın · ${run.floor}. kat`, 'ok'); return; }
    }
    const left = (c.misc.forgeAt ?? 0) + T.cooldownMin * 60_000 - h.now;
    if (left > 0) return h.notice(p, `Kor Kulesi'ne yeniden girmek için ${Math.ceil(left / 60_000)} dakika bekle.`);
    if (T.entryGems > 0 && c.gems < T.entryGems) return h.notice(p, `Giriş için ${T.entryGems} Mücevher gerekir.`);
    let slot = -1;
    for (let s = 0; s < FORGE_SLOTS; s++) if (!this.runs.has(s)) { slot = s; break; }
    if (slot < 0) return h.notice(p, 'Kor Kulesi şu an dolu; birkaç dakika sonra yeniden dene.');
    if (T.entryGems > 0) { c.gems -= T.entryGems; p.selfDirty |= 1; }
    c.misc.forgeAt = h.now;
    const run: ForgeRun = { slot, floor: 1, stage: 'w1', pending: null, nextAt: 0, members: new Set(), mons: new Set(), total: 0, puzzle: null, addsDone: 0, emptySince: 0, startedAt: h.now, lastSent: 0 };
    this.runs.set(slot, run);
    this.join(run, p);
    this.startFloor(run, 1);
  }
  private join(run: ForgeRun, p: Player) {
    run.members.add(p.char.id); this.ofChar.set(p.char.id, run);
    const r = forgeRoom(run.slot, run.floor);
    this.h.moveToZone(p, this.h.zone(), r.entry.x + (rnd() - 0.5) * 80, r.entry.y);
    this.send(run);
    this.h.save(p);
  }
  /** Yeniden bağlanan: koşusu sürüyorsa kaldığı kata; yoksa köye. Dönüş: yerleşti mi */
  rejoin(p: Player): boolean {
    const run = this.ofChar.get(p.char.id);
    if (!run) return false;
    const r = forgeRoom(run.slot, run.floor);
    p.x = r.entry.x + (rnd() - 0.5) * 60; p.y = r.entry.y;
    return true;
  }
  /** Oyuncu kuleden çıkar (isteyerek ya da zaferle): köye döner */
  leave(p: Player, won: boolean) {
    if (p.zone.id === FORGE_MAP) this.h.toTown(p); // haritadan çıkış detach'i tetikler
    else this.detach(p);
    if (won) this.h.notice(p, 'Kor Kulesi\'nden zaferle döndün!', 'ok');
  }
  /** Kule haritasından herhangi bir yolla ayrılan (köyde doğma, ışınlanma, çıkış) koşudan düşer */
  detach(p: Player) {
    const run = this.ofChar.get(p.char.id);
    this.plateOf.delete(p.char.id);
    this.h.sendJson(p, { t: 'forge', on: false });
    if (!run) return;
    run.members.delete(p.char.id); this.ofChar.delete(p.char.id);
    if (run.ember?.carrier === p.char.id) this.dropEmber(run, 'Közü taşıyan kuleden ayrıldı; köz yere düştü.');
    if (!run.members.size) this.destroy(run);
    else this.send(run);
  }
  private destroy(run: ForgeRun) {
    const z = this.h.zone();
    for (const m of run.mons) if (z.monsterById.has(m.id)) { m.threat.clear(); m.target = null; z.removeMonster(m); }
    if (run.boss && z.monsterById.has(run.boss.id)) z.removeMonster(run.boss);
    for (const id of run.members) this.ofChar.delete(id);
    this.runs.delete(run.slot);
  }
  /** Yönetim kapatınca ya da kanal kapanırken: herkes köye */
  closeAll() {
    for (const run of [...this.runs.values()]) for (const id of [...run.members]) { const p = this.h.byChar(id); if (p) this.leave(p, false); else { run.members.delete(id); this.ofChar.delete(id); } }
    for (const run of [...this.runs.values()]) this.destroy(run);
  }

  // ───────── katlar ve aşamalar ─────────
  private startFloor(run: ForgeRun, f: number) {
    run.floor = f; run.mons.clear(); run.total = 0; run.mold = undefined; run.ember = undefined; run.addsDone = 0; run.boss = undefined;
    run.puzzle = f < FORGE_FLOORS ? TUNING.forge.floors[f - 1]?.puzzle ?? 'mold' : null;
    run.stage = f < FORGE_FLOORS ? 'w1' : 'boss';
    run.pending = run.stage; run.nextAt = this.h.now + 3500;
    for (const p of this.present(run)) this.h.notice(p, f < FORGE_FLOORS ? `Kor Kulesi · ${f}. Kat — dalgalar geliyor, hazır ol!` : 'Kor Kulesi · Zirve — Karademir uyanıyor…', 'ok');
    this.send(run);
  }
  private present(run: ForgeRun): Player[] {
    const out: Player[] = [];
    for (const id of run.members) { const p = this.h.byChar(id); if (p && p.zone.id === FORGE_MAP) out.push(p); }
    return out;
  }
  private begin(run: ForgeRun, st: ForgeStage): void {
    run.stage = st; run.pending = null;
    const T = TUNING.forge;
    if (st === 'w1' || st === 'w2' || st === 'w3') {
      const fl = T.floors[run.floor - 1];
      const wv = fl?.waves[st === 'w1' ? 0 : st === 'w2' ? 1 : 2];
      if (fl && wv) {
        const k = Math.max(1, this.present(run).length);
        const scale = 1 + T.partyScale * (k - 1);
        const n = Math.max(0, Math.round(wv.count * scale)), ne = Math.max(0, Math.round(wv.elite * (k > 1 ? scale : 1)));
        this.spawnWave(run, wv.monster, n, ne, fl.mon);
      }
      if (!run.mons.size) return this.cleared(run); // ayarda dalga boşsa geç
      for (const p of this.present(run)) this.h.notice(p, st === 'w3' ? 'Son dalga: elit golemler geliyor!' : `${st === 'w1' ? 1 : 2}. dalga!`, st === 'w3' ? 'error' : 'info');
    } else if (st === 'puzzle') {
      if (run.puzzle === 'mold') {
        const n = T.moldPairs, sym: number[] = [];
        for (let i = 0; i < n; i++) sym.push(i, i);
        for (let i = sym.length - 1; i > 0; i--) { const j = randInt(0, i); [sym[i], sym[j]] = [sym[j], sym[i]]; }
        run.mold = { sym, open: [], found: 0, closeAt: 0 };
      } else {
        run.ember = { spot: -1, carrier: 0, coolAt: 0, delivered: 0, need: T.emberCount, respawnAt: this.h.now + 500, last: -1 };
      }
      for (const p of this.present(run)) this.h.notice(p, `Bulmaca: ${FORGE_PUZZLE_NAMES[run.puzzle ?? 'mold']}`, 'ok');
    } else if (st === 'boss') {
      const b = T.boss, r = forgeRoom(run.slot, run.floor);
      const def = DEFS().get('f_boss')!;
      const m = new Monster(def, { monster: 'f_boss', level: b.level, variant: 0, x: r.cx, y: r.cy - 160, once: true, forge: run.slot, st: { hp: b.hp, atk: b.atk, def: b.def, xp: b.xp } });
      this.h.zone().addMonster(m); run.boss = m; run.mons.add(m); run.total = 1;
      this.h.zone().emit(m.x, m.y, { e: Ev.FX, fx: Fx.AOE_BLAST, x: m.x | 0, y: m.y | 0, r: 260, ms: 900, a: 0 });
      this.aggro(run, m);
    } else if (st === 'done') {
      const r = forgeRoom(run.slot, run.floor);
      this.h.zone().emit(r.gate.x, r.gate.y, { e: Ev.FX, fx: Fx.TELEPORT, x: r.gate.x | 0, y: r.gate.y | 0, r: 90, ms: 1400, a: 0 });
      for (const p of this.present(run)) this.h.notice(p, run.floor < FORGE_FLOORS ? 'Kat temizlendi! Kuzeydeki kapı açıldı.' : 'Karademir yenildi! Kapıdan çıkıp zaferini kutla.', 'ok');
    }
    this.send(run);
  }
  private spawnWave(run: ForgeRun, monster: string, n: number, elite: number, st: { level: number; hp: number; atk: number; def: number; xp: number }) {
    const T = TUNING.forge, z = this.h.zone(), r = forgeRoom(run.slot, run.floor);
    const def = DEFS().get(monster) ?? DEFS().get('f_slag')!;
    for (let i = 0; i < n + elite; i++) {
      const el = i >= n;
      const rf = r.rifts[(i + run.total) % r.rifts.length];
      const x = rf.x + (rnd() - 0.5) * 70, y = rf.y + (rnd() - 0.5) * 70;
      const s = el ? { hp: st.hp * T.eliteHp, atk: st.atk * T.eliteAtk, def: Math.round(st.def * 1.3), xp: st.xp * T.eliteXp } : { hp: st.hp, atk: st.atk, def: st.def, xp: st.xp };
      const m = new Monster(def, { monster: def.id, level: st.level, variant: el ? 2 : 1, x, y, once: true, forge: run.slot, st: s });
      z.addMonster(m); run.mons.add(m); run.total++;
      z.emit(x, y, { e: Ev.FX, fx: Fx.TELEPORT, x: x | 0, y: y | 0, r: el ? 90 : 60, ms: 800, a: 0 });
      this.aggro(run, m);
    }
  }
  /** Dalga canavarı doğar doğmaz en yakın üyeye saldırır */
  private aggro(run: ForgeRun, m: Monster) {
    let best: Player | null = null, bd = Infinity;
    for (const p of this.present(run)) if (!p.dead) { const d = dist(p, m); if (d < bd) { bd = d; best = p; } }
    if (best) { m.target = best; m.threat.set(best, 1); m.state = MState.CHASE; }
  }
  /** Koşudaki canavar öldü (öldürme makbuzundan bir kez) */
  monsterDied(m: Monster) {
    const run = m.sp.forge !== undefined ? this.runs.get(m.sp.forge) : undefined;
    if (!run || !run.mons.delete(m)) return;
    if (m === run.boss) { run.boss = undefined; for (const q of [...run.mons]) { q.hp = 0; q.state = MState.DEAD; q.anim = Anim.DEAD; q.dirty |= Upd.HP | Upd.ANIM | Upd.FLAGS; q.deadAt = this.h.now; q.removeAt = this.h.now + 1600; q.killed = true; q.threat.clear(); q.target = null; q.telegraphs.length = 0; this.h.zone().emit(q.x, q.y, { e: Ev.DEATH, id: q.id, killer: 0 }); } run.mons.clear(); this.begin(run, 'done'); this.victory(run); return; }
    if (!run.mons.size && run.stage !== 'boss') this.cleared(run);
    else this.send(run);
  }
  private victory(run: ForgeRun) {
    const names = this.present(run).map((p) => p.char.name);
    if (names.length) this.h.broadcastWorld('Kor Kulesi', `${names.join(', ')} Karademir'i yendi ve Kor Kulesi'ni fethetti!`);
  }
  private cleared(run: ForgeRun): void {
    const next: ForgeStage = run.stage === 'w1' ? 'w2' : run.stage === 'w2' ? 'puzzle' : 'done';
    if (next === 'done') return this.begin(run, 'done');
    run.pending = next; run.nextAt = this.h.now + TUNING.forge.waveDelay * 1000;
    this.send(run);
  }
  private puzzleSolved(run: ForgeRun, msg: string) {
    for (const p of this.present(run)) this.h.notice(p, msg, 'ok');
    const r = forgeRoom(run.slot, run.floor);
    this.h.zone().emit(r.cx, r.cy, { e: Ev.FX, fx: Fx.LEVELUP, x: r.cx | 0, y: r.cy | 0, r: 200, ms: 1200, a: 0 });
    run.mold = undefined; run.ember = undefined;
    run.stage = 'puzzle'; run.pending = 'w3'; run.nextAt = this.h.now + TUNING.forge.waveDelay * 1000;
    this.send(run);
  }

  // ───────── tik (2 tikte bir) ─────────
  tick() {
    const now = this.h.now, z = this.h.zone();
    for (const run of [...this.runs.values()]) {
      const here = this.present(run);
      if (!here.length) { if (!run.emptySince) run.emptySince = now; else if (now - run.emptySince > EMPTY_GRACE_MS) { this.destroy(run); continue; } }
      else run.emptySince = 0;
      // ölen ya da odası boşalan canavarlar (yönetim temizliği vb.)
      for (const m of run.mons) if (!z.monsterById.has(m.id)) { run.mons.delete(m); }
      if (run.pending && now >= run.nextAt && here.length) this.begin(run, run.pending);
      const r = forgeRoom(run.slot, run.floor);
      // boss: canı eşiklerin altına inince golem çağırır
      if (run.boss && run.boss.state !== MState.DEAD) {
        const b = TUNING.forge.boss, pct = (run.boss.hp / run.boss.maxHp) * 100;
        if (run.addsDone < b.addAt.length && pct <= b.addAt[run.addsDone] && b.adds > 0) {
          run.addsDone++;
          const fl = TUNING.forge.floors[0];
          this.spawnWave(run, 'f_slag', b.adds, 0, fl?.mon ?? { level: 12, hp: 1000, atk: 40, def: 8, xp: 70 });
          z.emit(run.boss.x, run.boss.y, { e: Ev.FX, fx: Fx.AOE_BLAST, x: run.boss.x | 0, y: run.boss.y | 0, r: 300, ms: 900, a: 0 });
          for (const p of here) this.h.notice(p, 'Karademir örsüne vurdu: cüruf golemleri uyandı!', 'error');
          this.send(run);
        }
      }
      // bulmacalar
      if (run.stage === 'puzzle' && !run.pending) {
        if (run.mold) this.tickMold(run, here, r);
        else if (run.ember) this.tickEmber(run, here, r);
      }
      // kapı
      if (run.stage === 'done') {
        for (const p of here) {
          if (p.dead || dist(p, r.gate) > FORGE_GATE_R) continue;
          if (run.floor >= FORGE_FLOORS) { for (const q of this.present(run)) this.leave(q, true); break; }
          const nf = run.floor + 1, nr = forgeRoom(run.slot, nf);
          this.startFloor(run, nf);
          for (const q of this.present(run)) if (!q.dead) this.h.moveToZone(q, z, nr.entry.x + (rnd() - 0.5) * 90, nr.entry.y);
          break;
        }
      } else {
        for (const p of here) if (!p.dead && dist(p, r.gate) < FORGE_GATE_R && now - (this.gateNote.get(p.char.id) ?? 0) > 4000) { this.gateNote.set(p.char.id, now); this.h.notice(p, 'Kapı kor ile mühürlü: önce bu katı temizle.'); }
      }
      if (now - run.lastSent > 1000) this.send(run); // geri sayımlar için seyrek tazeleme
    }
  }
  private tickMold(run: ForgeRun, here: Player[], r: ReturnType<typeof forgeRoom>) {
    const mo = run.mold!, now = this.h.now, n = mo.sym.length;
    if (mo.closeAt && now >= mo.closeAt) { mo.open = []; mo.closeAt = 0; this.send(run); }
    for (const p of here) {
      if (p.dead) continue;
      let on = -1;
      for (let i = 0; i < n; i++) if (dist(p, r.plates[i]) < FORGE_PLATE_R) { on = i; break; }
      const prev = this.plateOf.get(p.char.id) ?? -1;
      if (on === prev) continue;
      this.plateOf.set(p.char.id, on);
      if (on < 0 || mo.closeAt || (mo.found >> on) & 1 || mo.open.includes(on)) continue;
      mo.open.push(on);
      const pl = r.plates[on];
      this.h.zone().emit(pl.x, pl.y, { e: Ev.FX, fx: Fx.PICKUP, x: pl.x | 0, y: pl.y | 0, r: 50, ms: 500, a: 0 });
      if (mo.open.length === 2) {
        const [a, b] = mo.open;
        if (mo.sym[a] === mo.sym[b]) {
          mo.found |= (1 << a) | (1 << b); mo.open = [];
          for (const q of here) this.h.notice(q, `Kalıp eşleşti: ${MOLD_SYMBOLS[mo.sym[a]]?.name ?? ''}`, 'ok');
          if (mo.found === (1 << n) - 1) { this.puzzleSolved(run, 'Bütün kalıplar eşleşti! Dökümhane ateşi canlandı.'); return; }
        } else {
          mo.closeAt = now + 1300;
          this.h.zap(p, TUNING.forge.moldZap / 100, `Yanlış kalıp! ${MOLD_SYMBOLS[mo.sym[a]]?.name} ile ${MOLD_SYMBOLS[mo.sym[b]]?.name} eşleşmez; taşlar kapanıyor.`);
        }
      }
      this.send(run);
    }
  }
  private tickEmber(run: ForgeRun, here: Player[], r: ReturnType<typeof forgeRoom>) {
    const em = run.ember!, now = this.h.now;
    if (em.spot < 0 && !em.carrier && now >= em.respawnAt) {
      let s = randInt(0, r.emberSpots.length - 1); if (s === em.last) s = (s + 3) % r.emberSpots.length;
      em.spot = s; em.last = s;
      const sp = r.emberSpots[s];
      this.h.zone().emit(sp.x, sp.y, { e: Ev.FX, fx: Fx.AOE_BLAST, x: sp.x | 0, y: sp.y | 0, r: 70, ms: 600, a: 0 });
      this.send(run);
    }
    if (em.spot >= 0) {
      const sp = r.emberSpots[em.spot];
      for (const p of here) if (!p.dead && dist(p, sp) < EMBER_PICK_R) {
        em.carrier = p.char.id; em.spot = -1; em.coolAt = now + TUNING.forge.emberSec * 1000;
        this.h.notice(p, `Közü aldın! ${TUNING.forge.emberSec} saniyede örse yetiştir.`, 'ok');
        this.send(run); break;
      }
    } else if (em.carrier) {
      const p = this.h.byChar(em.carrier);
      if (!p || p.dead || p.zone.id !== FORGE_MAP || !run.members.has(em.carrier)) return this.dropEmber(run, 'Köz yere düştü ve söndü. Yenisi geliyor.');
      if (now >= em.coolAt) return this.dropEmber(run, 'Köz soğudu! Ocaktan yenisi sıçrıyor.');
      if (dist(p, r.anvil) < ANVIL_R) {
        em.delivered++; em.carrier = 0; em.respawnAt = now + 1200;
        this.h.zone().emit(r.anvil.x, r.anvil.y, { e: Ev.FX, fx: Fx.AOE_BLAST, x: r.anvil.x | 0, y: r.anvil.y | 0, r: 120, ms: 700, a: 0 });
        if (em.delivered >= em.need) return this.puzzleSolved(run, 'Örs kızıl kor ile doldu! Kule titriyor…');
        for (const q of here) this.h.notice(q, `Köz örse ulaştı (${em.delivered}/${em.need})`, 'ok');
        this.send(run);
      }
    }
  }
  private dropEmber(run: ForgeRun, msg: string) {
    const em = run.ember; if (!em) return;
    em.carrier = 0; em.spot = -1; em.respawnAt = this.h.now + 1500;
    for (const p of this.present(run)) this.h.notice(p, msg, 'error');
    this.send(run);
  }

  /** Kuledeki ölü üye "burada doğ" derse: koşunun güncel katının girişine */
  respawnPoint(p: Player): { x: number; y: number } | null {
    const run = this.ofChar.get(p.char.id); if (!run) return null;
    const r = forgeRoom(run.slot, run.floor);
    return { x: r.entry.x + (rnd() - 0.5) * 60, y: r.entry.y };
  }

  // ───────── istemciye durum ─────────
  send(run: ForgeRun) {
    const now = this.h.now, mo = run.mold, em = run.ember;
    run.lastSent = now;
    const carrier = em?.carrier ? this.h.byChar(em.carrier) : undefined;
    const msg = {
      t: 'forge', on: true, slot: run.slot, f: run.floor, stage: run.stage, pending: run.pending, wait: run.pending ? Math.max(0, run.nextAt - now) : 0,
      alive: run.mons.size, total: run.total, puzzle: run.puzzle, members: run.members.size,
      mold: mo ? { n: mo.sym.length, show: mo.sym.map((s, i) => ((mo.found >> i) & 1 || mo.open.includes(i) ? s : -1)), found: mo.found } : undefined,
      ember: em ? { spot: em.spot, carrier: carrier?.id ?? 0, cool: em.carrier ? Math.max(0, em.coolAt - now) : 0, done: em.delivered, need: em.need } : undefined,
      boss: run.boss ? Math.round((run.boss.hp / run.boss.maxHp) * 100) : undefined,
    };
    for (const p of this.present(run)) this.h.sendJson(p, msg);
  }
}
