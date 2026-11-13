import { pool } from './db/pool.ts';
import { applyTuning, sanitizeTuning, TUNING, type GameTuning } from '@col/shared';

/** Oyun ayarları (yönetim paneli): veritabanında tek kayıt, sürüm numarasıyla eşzamanlı yazım koruması. */
export class TuningState {
  revision = 0;
  async load() {
    const r = await pool.query(`SELECT value, revision FROM server_state WHERE key='tuning'`);
    if (r.rowCount) { applyTuning(r.rows[0].value); this.revision = Number(r.rows[0].revision); }
    else await pool.query(`INSERT INTO server_state(key, value, revision) VALUES ('tuning', $1, 0) ON CONFLICT DO NOTHING`, [JSON.stringify(sanitizeTuning(TUNING))]);
  }
  current(): GameTuning { return sanitizeTuning(TUNING); }
  async set(next: unknown, expectRevision: number, actor: number): Promise<{ ok: boolean; tuning: GameTuning; revision: number }> {
    const clean = sanitizeTuning(next);
    const r = await pool.query(
      `UPDATE server_state SET value=$1, revision=revision+1, updated_at=now(), updated_by=$3 WHERE key='tuning' AND revision=$2 RETURNING revision`,
      [JSON.stringify(clean), expectRevision, actor]);
    if (!r.rowCount) return { ok: false, tuning: this.current(), revision: this.revision };
    applyTuning(clean);
    this.revision = Number(r.rows[0].revision);
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,'tuning.set',$2)`, [actor, JSON.stringify({ revision: this.revision })]).catch(() => {});
    return { ok: true, tuning: this.current(), revision: this.revision };
  }
}
