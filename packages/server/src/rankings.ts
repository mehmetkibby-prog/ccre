import { pool } from './db/pool.ts';
import { TUNING, trPeriod } from '@col/shared';
import type { CharacterStore } from './store.ts';
import type { AdminGive } from './types.ts';

/**
 * Sıralamalar: en yüksek seviye ilk 10 ve dönemlik canavar avcıları ilk 10. Yönetici/GM hesapları sıralamaya
 * girmez. Veri veritabanından (oyundakiler en çok ~15 sn geriden: düzenli kayıt) ve kısa süre önbelleklenir.
 * Dönem bitince (Türkiye saatiyle gün/hafta/ay) ilk sıralara yönetimdeki ödüller verilir ve herkese duyurulur;
 * hangi dönemin ödüllendiği server_state'te tutulur (yeniden başlatma iki kez ödül vermez).
 */
export interface RankRow { charId: number; name: string; cls: string; level: number; kills: number }
export interface RankHost { give(charId: number, g: AdminGive): void; announce(text: string): void; onlineIds(): Set<number> }

export class Rankings {
  private cache: { at: number; level: RankRow[]; kills: RankRow[]; key: string } | null = null;
  constructor(private store: CharacterStore, private host: RankHost) {}

  private async query(key: string, prev = false): Promise<RankRow[]> {
    const col = prev ? `CASE WHEN c.misc->'rankKills'->>'k' = $1 THEN (c.misc->'rankKills'->>'n')::int WHEN c.misc->'rankKills'->'prev'->>'k' = $1 THEN (c.misc->'rankKills'->'prev'->>'n')::int ELSE 0 END`
      : `CASE WHEN c.misc->'rankKills'->>'k' = $1 THEN (c.misc->'rankKills'->>'n')::int ELSE 0 END`;
    const r = await pool.query(
      `SELECT c.id, c.name, c.cls, c.level, ${col} AS rk FROM characters c JOIN accounts a ON a.id=c.account_id
       WHERE c.deleted_at IS NULL AND a.role NOT IN ('gm','admin','owner') AND (c.misc->'rankKills'->>'k' = $1 OR c.misc->'rankKills'->'prev'->>'k' = $1)
       ORDER BY rk DESC, c.level DESC LIMIT 40`, [key]);
    const rows = r.rows.map((x) => ({ charId: Number(x.id), name: x.name, cls: x.cls, level: Number(x.level), kills: Number(x.rk) }));
    // önbellekteki daha yeni kayıtlar (oyundakiler)
    for (const row of rows) {
      const live = this.store.peek(row.charId);
      const rk = live?.misc.rankKills;
      if (rk) row.kills = rk.k === key ? rk.n : rk.prev?.k === key && prev ? rk.prev.n : row.kills;
      if (live) row.level = live.level;
    }
    return rows.filter((x) => x.kills > 0).sort((a, b) => b.kills - a.kills || b.level - a.level).slice(0, 10);
  }

  async get(): Promise<{ level: RankRow[]; kills: RankRow[]; period: { key: string; end: number; kind: string }; rewards: { cp: number; gems: number }[] }> {
    const now = Date.now(), per = trPeriod(now, TUNING.killRank.period);
    if (!this.cache || now - this.cache.at > 20_000 || this.cache.key !== per.key) {
      const lv = await pool.query(
        `SELECT c.id, c.name, c.cls, c.level, c.kills FROM characters c JOIN accounts a ON a.id=c.account_id
         WHERE c.deleted_at IS NULL AND a.role NOT IN ('gm','admin','owner') ORDER BY c.level DESC, c.xp DESC LIMIT 10`);
      const level = lv.rows.map((x) => ({ charId: Number(x.id), name: x.name, cls: x.cls, level: Number(x.level), kills: Number(x.kills) }));
      this.cache = { at: now, level, kills: await this.query(per.key), key: per.key };
    }
    return { level: this.cache.level, kills: this.cache.kills, period: { key: per.key, end: per.end, kind: TUNING.killRank.period }, rewards: TUNING.killRank.rewards.slice(0, 3) };
  }

  /** Dakikada bir: dönem değiştiyse biten dönemin ilk sıralarını ödüllendir (bir kez). */
  async tick() {
    const now = Date.now(), cur = trPeriod(now, TUNING.killRank.period);
    const st = await pool.query(`SELECT value FROM server_state WHERE key='killrank'`);
    const last: string | undefined = st.rows[0]?.value?.current;
    if (!last) { await this.saveState(cur.key); return; }
    if (last === cur.key) return;
    // biten dönem: last. Önce durumu ilerlet (iki kez ödül olmasın), sonra dağıt.
    await this.saveState(cur.key);
    const top = await this.query(last, true);
    const rewards = TUNING.killRank.rewards;
    const lines: string[] = [];
    top.slice(0, rewards.length).forEach((row, i) => {
      const rw = rewards[i]; if (!rw) return;
      if (rw.cp > 0) this.host.give(row.charId, { kind: 'cp', qty: rw.cp });
      if (rw.gems > 0) this.host.give(row.charId, { kind: 'gems', qty: rw.gems });
      const parts = [rw.cp ? `${rw.cp} ÇP` : '', rw.gems ? `${rw.gems.toLocaleString('tr-TR')} Mücevher` : ''].filter(Boolean).join(' + ');
      lines.push(`${i + 1}. ${row.name} (${row.kills.toLocaleString('tr-TR')} av)${parts ? ' → ' + parts : ''}`);
    });
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES (NULL,'killrank.reward',$1)`, [JSON.stringify({ period: last, top: top.slice(0, rewards.length) })]).catch(() => {});
    if (lines.length) this.host.announce(`Canavar Avcıları sıralaması sona erdi! ${lines.join(' · ')}`);
    this.cache = null;
  }
  private async saveState(current: string) {
    await pool.query(`INSERT INTO server_state(key, value, revision) VALUES ('killrank', $1, 0) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`, [JSON.stringify({ current })]);
  }
}
