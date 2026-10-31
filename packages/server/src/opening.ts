import { pool } from './db/pool.ts';
import { config } from './config.ts';

export type OpeningMode = 'closed' | 'scheduled' | 'open' | 'maintenance';
export interface Opening { mode: OpeningMode; openAt: number | null; message: string; revision: number }

/** Açılış durumu yalnız yetkili yönetici kararıyla değişir; yeniden başlatma kararı değiştirmez. */
export class OpeningState {
  state: Opening = { mode: config.devMode ? 'open' : 'closed', openAt: null, message: '', revision: 0 };
  async load() {
    const r = await pool.query(`SELECT value, revision FROM server_state WHERE key='opening'`);
    if (r.rowCount) this.state = { ...r.rows[0].value, revision: Number(r.rows[0].revision) };
    else await pool.query(`INSERT INTO server_state(key, value, revision) VALUES ('opening', $1, 0) ON CONFLICT DO NOTHING`, [JSON.stringify(this.state)]);
  }
  isOpenFor(earlyAccess: boolean, staff: boolean): { ok: boolean; reason?: string } {
    if (staff) return { ok: true };
    const s = this.state;
    if (s.mode === 'open') return { ok: true };
    if (s.mode === 'scheduled' && s.openAt && Date.now() >= s.openAt) return { ok: true };
    if (earlyAccess && s.mode !== 'maintenance') return { ok: true };
    if (s.mode === 'maintenance') return { ok: false, reason: s.message || 'Sunucu bakımda.' };
    return { ok: false, reason: s.mode === 'scheduled' ? 'Oyun henüz açılmadı.' : 'Oyun şu an kapalı (ön kayıt).' };
  }
  async set(next: Omit<Opening, 'revision'>, expectRevision: number, actor: number): Promise<{ ok: boolean; state: Opening }> {
    const r = await pool.query(
      `UPDATE server_state SET value=$1, revision=revision+1, updated_at=now(), updated_by=$3 WHERE key='opening' AND revision=$2 RETURNING revision`,
      [JSON.stringify(next), expectRevision, actor]);
    if (!r.rowCount) return { ok: false, state: this.state };
    this.state = { ...next, revision: Number(r.rows[0].revision) };
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES ($1,'opening.set',$2)`, [actor, JSON.stringify(this.state)]);
    return { ok: true, state: this.state };
  }
}
