import { pool } from './db/pool.ts';

/** Ortak Dünya Sağlığı: tüm kanallar için tek değer, ana thread'de tutulur. */
export class WorldState {
  health = 100;
  decayPerSec = 0.003;
  perEssence = 0.02;
  contrib = new Map<number, { name: string; amount: number }>();
  private dirty = false;
  async load() {
    const r = await pool.query(`SELECT value FROM server_state WHERE key='world_health'`);
    if (r.rowCount) { this.health = Number(r.rows[0].value.health ?? 100); }
    setInterval(() => { this.health = Math.max(0, this.health - this.decayPerSec); this.dirty = true; }, 1000).unref();
    setInterval(() => this.persist(), 30_000).unref();
  }
  donate(charId: number, name: string, amount: number): number {
    const gain = amount * this.perEssence * Math.max(0.15, (100 - this.health) / 100);
    this.health = Math.min(100, this.health + gain);
    const c = this.contrib.get(charId) ?? { name, amount: 0 };
    c.amount += amount; this.contrib.set(charId, c);
    this.dirty = true;
    return gain;
  }
  async persist() {
    if (!this.dirty) return;
    this.dirty = false;
    await pool.query(`INSERT INTO server_state(key, value) VALUES ('world_health', $1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`, [JSON.stringify({ health: this.health })]).catch(() => { this.dirty = true; });
  }
}
