import type pg from 'pg';
import { pool } from './db/pool.ts';
import type { CharState } from './types.ts';
import { CLASSES, getLayout, computeStats, type ItemInstance, type Slot } from '@col/shared';
import { Histogram } from './metrics.ts';

/**
 * Karakter kalıcılığı. Write-behind: worker'lar durumu gönderir, burada karakter başına
 * birleştirilip (yalnız en yeni sürüm) kısa işlemlerle yazılır. Oyun döngüsü DB'yi asla beklemez.
 * save_version koruması geç gelen eski bir kaydın yeni durumu ezmesini engeller.
 */
export class CharacterStore {
  private queue = new Map<number, CharState>();
  private urgent = new Set<number>();
  /** Son bilinen bellek durumu: kanal değişiminde DB'yi beklemeden devralma. */
  private cache = new Map<number, { char: CharState; at: number }>();
  private running = false;
  writeHist = new Histogram(2000);
  failures = 0;
  written = 0;
  stale = 0;

  get queueLength() { return this.queue.size; }

  enqueue(c: CharState, urgent = false) {
    const prev = this.queue.get(c.id);
    if (prev && prev.saveVersion > c.saveVersion) return;
    this.queue.set(c.id, c);
    if (urgent) this.urgent.add(c.id);
    this.remember(c);
  }
  remember(c: CharState) {
    const cur = this.cache.get(c.id);
    if (!cur || cur.char.saveVersion <= c.saveVersion) this.cache.set(c.id, { char: c, at: Date.now() });
  }

  start() {
    const loop = async () => {
      if (this.running) return;
      this.running = true;
      try { await this.flush(64); } finally { this.running = false; }
    };
    setInterval(loop, 150).unref();
    // önbellek temizliği
    setInterval(() => {
      const cut = Date.now() - 10 * 60_000;
      for (const [id, v] of this.cache) if (v.at < cut && !this.queue.has(id)) this.cache.delete(id);
    }, 60_000).unref();
  }

  async flush(max = Infinity): Promise<void> {
    const ids = [...this.urgent, ...this.queue.keys()];
    const seen = new Set<number>();
    let n = 0;
    const batch: CharState[] = [];
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      const c = this.queue.get(id);
      if (!c) continue;
      this.queue.delete(id); this.urgent.delete(id);
      batch.push(c);
      if (++n >= max) break;
    }
    // 4 paralel bağlantı ile yaz
    const lanes = 4;
    await Promise.all(Array.from({ length: lanes }, async (_, lane) => {
      for (let i = lane; i < batch.length; i += lanes) {
        const c = batch[i];
        const t = performance.now();
        try {
          await this.write(c);
          this.written++;
        } catch (e) {
          this.failures++;
          console.error('[store] save failed', c.id, (e as Error).message);
          // yeniden dene: daha yeni sürüm gelmediyse kuyruğa geri koy
          if (!this.queue.has(c.id)) this.queue.set(c.id, c);
        }
        this.writeHist.add(performance.now() - t);
      }
    }));
  }

  /**
   * Pazar değişikliği: pazar durumu ve etkilenen karakterler TEK işlemde yazılır (eşya ya dükkânda ya
   * çantada olur, ikisinde birden ya da hiçbirinde değil). Daha yeni sürümü yazılmış karakter atlanır:
   * o yeni sürüm bu değişikliği zaten içerir.
   */
  async writeMarket(channel: number, state: unknown, chars: CharState[]) {
    for (const c of chars) this.remember(c);
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(`INSERT INTO server_state (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, revision = server_state.revision + 1, updated_at = now()`, ['market:ch' + channel, safeJson(state)]);
      // her karakter kendi kayıt noktasıyla: biri yazılamazsa (bozuk veri) bütün pazar ve öteki karakterler takılı kalmaz
      for (const c of chars) {
        await client.query('SAVEPOINT ch');
        try { await this.writeChar(client, c); await client.query('RELEASE SAVEPOINT ch'); }
        catch (e) { await client.query('ROLLBACK TO SAVEPOINT ch'); this.failures++; console.error('[store] pazar: karakter yazılamadı', c.id, (e as Error).message); }
      }
      await client.query('COMMIT');
      for (const c of chars) { const q = this.queue.get(c.id); if (q && q.saveVersion <= c.saveVersion) { this.queue.delete(c.id); this.urgent.delete(c.id); } }
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      this.failures++;
      console.error('[store] market write failed', channel, (e as Error).message);
      throw e;
    } finally { client.release(); }
  }
  async loadMarket(channel: number): Promise<unknown> {
    const r = await pool.query(`SELECT value FROM server_state WHERE key = $1`, ['market:ch' + channel]);
    return r.rowCount ? r.rows[0].value : null;
  }

  private async write(c: CharState) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      if (!(await this.writeChar(client, c))) { await client.query('ROLLBACK'); this.stale++; return; }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  }
  /** Bir karakteri açık işlem içinde yazar; daha yeni sürüm varsa false. */
  private async writeChar(client: pg.PoolClient, c: CharState): Promise<boolean> {
    {
      const r = await client.query(
        `UPDATE characters SET level=$2, xp=$3, hp=$4, map=$5, x=$6, y=$7, gems=$8, essence=$9, cp=$10, arena_coin=$11,
          stat_str=$12, stat_res=$13, stat_vit=$14, skill_levels=$15, spec=$16, kills=$17, misc=$18, save_version=$19, last_seen=now()
         WHERE id=$1 AND save_version < $19 RETURNING id`,
        [c.id, c.level, c.xp, c.hp, c.map, c.x, c.y, c.gems, c.essence, c.cp, c.arenaCoin, c.stats.str, c.stats.res, c.stats.vit, c.skills, c.spec, c.kills, safeJson(c.misc), c.saveVersion],
      );
      if (r.rowCount === 0) return false;
      await writeItems(client, c);
      return true;
    }
  }

  /** Bellekteki bütün karakterler (oyunda olanlar ve yazılmayı bekleyenler; en yenisi), kopyalanmadan. */
  *liveChars(): Iterable<CharState> { const seen = new Set<number>(); for (const c of this.queue.values()) { seen.add(c.id); yield c; } for (const e of this.cache.values()) if (!seen.has(e.char.id)) yield e.char; }
  /** Bellekteki en yeni durum (oyunda olan ya da yazılmayı bekleyen), kopyalanmadan. */
  peek(charId: number): CharState | undefined { return this.queue.get(charId) ?? this.cache.get(charId)?.char; }
  async load(charId: number): Promise<CharState | null> {
    const cached = this.queue.get(charId) ?? this.cache.get(charId)?.char;
    if (cached) return structuredClone(cached);
    const r = await pool.query(
      `SELECT c.*, a.role FROM characters c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.deleted_at IS NULL`, [charId]);
    if (!r.rowCount) return null;
    const row = r.rows[0];
    const items = await pool.query(`SELECT id, tpl, rarity, plus, location, slot, locked, data, source FROM items WHERE char_id=$1 AND location IN ('bag','equip','storage') ORDER BY created_at`, [charId]);
    const mats = await pool.query(`SELECT key, qty FROM materials WHERE char_id=$1`, [charId]);
    const bag: ItemInstance[] = [];
    const equip: Partial<Record<Slot, ItemInstance>> = {};
    const storage: ItemInstance[] = [];
    for (const it of items.rows) {
      const inst: ItemInstance = { id: it.id, tpl: it.tpl, rarity: it.rarity, plus: it.plus, ench: it.data.ench ?? [], locked: it.locked, evo: it.data.evo, kills: it.data.kills, src: it.source ?? undefined };
      if (it.location === 'storage') storage.push(inst);
      else if (it.location === 'equip' && it.slot && !equip[it.slot as Slot]) equip[it.slot as Slot] = inst;
      else bag.push(inst);
    }
    const materials: Record<string, number> = {};
    for (const m of mats.rows) materials[m.key] = Number(m.qty);
    const c: CharState = {
      id: Number(row.id), accountId: Number(row.account_id), role: row.role, name: row.name, cls: row.cls,
      level: row.level, xp: Number(row.xp), hp: row.hp, map: row.map, x: row.x, y: row.y,
      gems: Number(row.gems), essence: Number(row.essence), cp: Number(row.cp), arenaCoin: Number(row.arena_coin),
      stats: { str: row.stat_str, res: row.stat_res, vit: row.stat_vit }, skills: row.skill_levels, spec: row.spec,
      kills: Number(row.kills), bag, equip, materials, misc: row.misc ?? {}, storage, saveVersion: Number(row.save_version),
    };
    return c;
  }
}

/** JSONB'ye yazılacak JSON: NUL ve eşsiz vekil (lone surrogate) karakterleri ayıklanır (PostgreSQL reddediyor; karakter donuyordu) */
export function safeJson(v: unknown): string {
  return JSON.stringify(v, (_k, x) => (typeof x === 'string' ? x.replace(/\u0000/g, '').replace(/[\ud800-\udbff](?![\udc00-\udfff])|(?<![\ud800-\udbff])[\udc00-\udfff]/g, '\ufffd') : x));
}
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAT_KEY_RE = /^[a-z0-9_]{1,40}$/;
async function writeItems(client: pg.PoolClient, c: CharState) {
  const rows: { it: ItemInstance; loc: string; slot: string | null }[] = [];
  // geçersiz eşya (kimliksiz/şablonsuz: hileli istekten kalma) yazılmaz; yoksa bütün kayıt düşüp karakter donuyordu
  const valid = (it: ItemInstance | undefined): it is ItemInstance => !!it && typeof it.id === 'string' && UUID_RE.test(it.id) && typeof it.tpl === 'string' && !!it.tpl;
  const seen = new Set<string>();
  const add = (it: ItemInstance | undefined, loc: string, slot: string | null) => { if (!valid(it)) { if (it) console.error('[store] geçersiz eşya atlandı', c.id, loc); return; } if (seen.has(it.id)) return; seen.add(it.id); rows.push({ it, loc, slot }); };
  for (const it of c.bag) add(it, 'bag', null);
  for (const [slot, it] of Object.entries(c.equip)) if (it) add(it, 'equip', slot);
  for (const it of c.storage ?? []) add(it, 'storage', null);
  if (rows.length) {
    const vals: unknown[] = [];
    const ph: string[] = [];
    rows.forEach((r, i) => {
      const b = i * 9;
      ph.push(`($${b + 1}::uuid,$${b + 2}::bigint,$${b + 3},$${b + 4},$${b + 5}::int,$${b + 6},$${b + 7},$${b + 8}::boolean,$${b + 9}::jsonb)`);
      vals.push(r.it.id, c.id, r.it.tpl, r.it.rarity, Math.max(0, Math.min(99, Math.floor(Number(r.it.plus) || 0))), r.loc, r.slot, !!r.it.locked, safeJson({ ench: r.it.ench, evo: r.it.evo, kills: r.it.kills }));
    });
    await client.query(
      `INSERT INTO items (id, char_id, tpl, rarity, plus, location, slot, locked, data) VALUES ${ph.join(',')}
       ON CONFLICT (id) DO UPDATE SET char_id=EXCLUDED.char_id, rarity=EXCLUDED.rarity, plus=EXCLUDED.plus, location=EXCLUDED.location,
         slot=EXCLUDED.slot, locked=EXCLUDED.locked, data=EXCLUDED.data`, vals);
  }
  // eşya tek yerde: çanta, kuşanılmış ya da depo (bir işlemde yazılır; arada kaybolmaz, çoğalmaz)
  await client.query(`DELETE FROM items WHERE char_id=$1 AND location IN ('bag','equip','storage') AND NOT (id = ANY($2::uuid[]))`, [c.id, rows.map((r) => r.it.id)]);
  const keys = Object.keys(c.materials).filter((k) => MAT_KEY_RE.test(k) && Number.isFinite(c.materials[k]) && c.materials[k] > 0 && c.materials[k] < 9e15);
  if (keys.length) {
    await client.query(
      `INSERT INTO materials (char_id, key, qty) SELECT $1, k, q FROM unnest($2::text[], $3::bigint[]) AS t(k, q)
       ON CONFLICT (char_id, key) DO UPDATE SET qty=EXCLUDED.qty`, [c.id, keys, keys.map((k) => Math.floor(c.materials[k]))]);
  }
  await client.query(`DELETE FROM materials WHERE char_id=$1 AND NOT (key = ANY($2::text[]))`, [c.id, keys]);
}

/** Yeni karakterin başlangıç durumu. */
export function initialHp(cls: CharState['cls']): number {
  return computeStats({ cls, level: 1, stats: { str: 0, res: 0, vit: 0 }, equip: {} }).maxHp;
}
export function startPosition() {
  const l = getLayout('bazaar');
  return { map: 'bazaar', x: l.spawn.x, y: l.spawn.y };
}
export { CLASSES };
