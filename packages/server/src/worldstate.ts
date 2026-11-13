import { pool } from './db/pool.ts';
import { TUNING } from '@col/shared';

/**
 * Ortak Dünya Sağlığı: tüm kanallar için tek değer, ana thread'de tutulur.
 * Zamanla azalır (yönetim: azalma hızı), oyuncuların Öz bağışlarıyla artar (yönetim: bağış başına kazanç).
 */
export class WorldState {
  health = 100;
  /** Çarpan 1'de saniyede düşüş (≈ günde %26). */
  baseDecayPerSec = 0.003;
  contrib = new Map<number, { name: string; amount: number }>();
  private dirty = false;
  async load() {
    const r = await pool.query(`SELECT value FROM server_state WHERE key='world_health'`);
    if (r.rowCount) { this.health = Number(r.rows[0].value.health ?? 100); }
    setInterval(() => { const d = this.baseDecayPerSec * TUNING.worldDecayMul; if (d > 0 && this.health > 0) { this.health = Math.max(0, this.health - d); this.dirty = true; } }, 1000).unref();
    setInterval(() => this.persist(), 30_000).unref();
  }
  /** Bağış: sağlık düştükçe her Öz daha çok iyileştirir (en az %15 etki). */
  donate(charId: number, name: string, amount: number): number {
    const gain = amount * TUNING.worldDonateGain * Math.max(0.15, (100 - this.health) / 100);
    this.health = Math.min(100, this.health + gain);
    const c = this.contrib.get(charId) ?? { name, amount: 0 };
    c.amount += amount; this.contrib.set(charId, c);
    this.dirty = true;
    return gain;
  }
  /** Yönetim: sağlığı doğrudan ayarla. */
  set(v: number) { this.health = Math.max(0, Math.min(100, v)); this.dirty = true; }
  top(n = 5) { return [...this.contrib.values()].sort((a, b) => b.amount - a.amount).slice(0, n); }
  async persist() {
    if (!this.dirty) return;
    this.dirty = false;
    await pool.query(`INSERT INTO server_state(key, value) VALUES ('world_health', $1) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`, [JSON.stringify({ health: this.health })]).catch(() => { this.dirty = true; });
  }
}
