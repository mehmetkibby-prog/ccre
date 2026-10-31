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

  private async write(c: CharState) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const r = await client.query(
        `UPDATE characters SET level=$2, xp=$3, hp=$4, map=$5, x=$6, y=$7, gems=$8, essence=$9, cp=$10, arena_coin=$11,
          stat_str=$12, stat_res=$13, stat_vit=$14, skill_levels=$15, spec=$16, kills=$17, misc=$18, save_version=$19, last_seen=now()
         WHERE id=$1 AND save_version < $19 RETURNING id`,
        [c.id, c.level, c.xp, c.hp, c.map, c.x, c.y, c.gems, c.essence, c.cp, c.arenaCoin, c.stats.str, c.stats.res, c.stats.vit, c.skills, c.spec, c.kills, JSON.stringify(c.misc), c.saveVersion],
      );
      if (r.rowCount === 0) { await client.query('ROLLBACK'); this.stale++; return; }
      await writeItems(client, c);
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally { client.release(); }
  }

  async load(charId: number): Promise<CharState | null> {
    const cached = this.queue.get(charId) ?? this.cache.get(charId)?.char;
    if (cached) return structuredClone(cached);
    const r = await pool.query(
      `SELECT c.*, a.role FROM characters c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.deleted_at IS NULL`, [charId]);
    if (!r.rowCount) return null;
    const row = r.rows[0];
    const items = await pool.query(`SELECT id, tpl, rarity, plus, location, slot, locked, data, source FROM items WHERE char_id=$1 AND location IN ('bag','equip') ORDER BY created_at`, [charId]);
    const mats = await pool.query(`SELECT key, qty FROM materials WHERE char_id=$1`, [charId]);
    const bag: ItemInstance[] = [];
    const equip: Partial<Record<Slot, ItemInstance>> = {};
    for (const it of items.rows) {
      const inst: ItemInstance = { id: it.id, tpl: it.tpl, rarity: it.rarity, plus: it.plus, ench: it.data.ench ?? [], locked: it.locked, evo: it.data.evo, kills: it.data.kills, src: it.source ?? undefined };
      if (it.location === 'equip' && it.slot && !equip[it.slot as Slot]) equip[it.slot as Slot] = inst;
      else bag.push(inst);
    }
    const materials: Record<string, number> = {};
    for (const m of mats.rows) materials[m.key] = Number(m.qty);
    const c: CharState = {
      id: Number(row.id), accountId: Number(row.account_id), role: row.role, name: row.name, cls: row.cls,
      level: row.level, xp: Number(row.xp), hp: row.hp, map: row.map, x: row.x, y: row.y,
      gems: Number(row.gems), essence: Number(row.essence), cp: Number(row.cp), arenaCoin: Number(row.arena_coin),
      stats: { str: row.stat_str, res: row.stat_res, vit: row.stat_vit }, skills: row.skill_levels, spec: row.spec,
      kills: Number(row.kills), bag, equip, materials, misc: row.misc ?? {}, saveVersion: Number(row.save_version),
    };
    return c;
  }
}

async function writeItems(client: pg.PoolClient, c: CharState) {
  const rows: { it: ItemInstance; loc: string; slot: string | null }[] = [];
  for (const it of c.bag) rows.push({ it, loc: 'bag', slot: null });
  for (const [slot, it] of Object.entries(c.equip)) if (it) rows.push({ it, loc: 'equip', slot });
  if (rows.length) {
    const vals: unknown[] = [];
    const ph: string[] = [];
    rows.forEach((r, i) => {
      const b = i * 9;
      ph.push(`($${b + 1}::uuid,$${b + 2}::bigint,$${b + 3},$${b + 4},$${b + 5}::int,$${b + 6},$${b + 7},$${b + 8}::boolean,$${b + 9}::jsonb)`);
      vals.push(r.it.id, c.id, r.it.tpl, r.it.rarity, r.it.plus, r.loc, r.slot, !!r.it.locked, JSON.stringify({ ench: r.it.ench, evo: r.it.evo, kills: r.it.kills }));
    });
    await client.query(
      `INSERT INTO items (id, char_id, tpl, rarity, plus, location, slot, locked, data) VALUES ${ph.join(',')}
       ON CONFLICT (id) DO UPDATE SET char_id=EXCLUDED.char_id, rarity=EXCLUDED.rarity, plus=EXCLUDED.plus, location=EXCLUDED.location,
         slot=EXCLUDED.slot, locked=EXCLUDED.locked, data=EXCLUDED.data`, vals);
  }
  await client.query(`DELETE FROM items WHERE char_id=$1 AND location IN ('bag','equip') AND NOT (id = ANY($2::uuid[]))`, [c.id, rows.map((r) => r.it.id)]);
  const keys = Object.keys(c.materials).filter((k) => c.materials[k] > 0);
  if (keys.length) {
    await client.query(
      `INSERT INTO materials (char_id, key, qty) SELECT $1, k, q FROM unnest($2::text[], $3::bigint[]) AS t(k, q)
       ON CONFLICT (char_id, key) DO UPDATE SET qty=EXCLUDED.qty`, [c.id, keys, keys.map((k) => c.materials[k])]);
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
