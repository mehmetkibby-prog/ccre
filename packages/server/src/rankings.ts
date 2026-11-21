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
const STAFF = new Set(['gm', 'admin', 'owner']);
export interface RankHost { give(charId: number, g: AdminGive): void; announce(text: string): void; onlineIds(): Set<number>; liveKills?(): Map<number, { charId: number; name: string; cls: string; level: number; k: string; n: number }> }

export class Rankings {
  private cache: { at: number; level: RankRow[]; kills: RankRow[]; key: string } | null = null;
  private killsAt = 0;
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
    // oyunda olan (ya da kaydı yazılmayı bekleyen) oyuncular: veritabanı birkaç saniye geride kalsa da listeye girer
    for (const c of this.store.liveChars()) {
      if (STAFF.has(c.role) || rows.some((r) => r.charId === c.id)) continue;
      const rk = c.misc.rankKills;
      const n = rk ? (rk.k === key ? rk.n : prev && rk.prev?.k === key ? rk.prev.n : 0) : 0;
      if (n > 0) rows.push({ charId: c.id, name: c.name, cls: c.cls, level: c.level, kills: n });
    }
    // kanallardan anında gelen av sayıları (kayıt beklemeden): en güncel değer
    for (const lk of this.host.liveKills?.().values() ?? []) {
      if (lk.k !== key) continue;
      const row = rows.find((r) => r.charId === lk.charId);
      if (row) { row.kills = Math.max(row.kills, lk.n); row.level = Math.max(row.level, lk.level); }
      else rows.push({ charId: lk.charId, name: lk.name, cls: lk.cls, level: lk.level, kills: lk.n });
    }
    return rows.filter((x) => x.kills > 0).sort((a, b) => b.kills - a.kills || b.level - a.level).slice(0, 10);
  }

  async get(): Promise<{ level: RankRow[]; kills: RankRow[]; period: { key: string; end: number; kind: string }; rewards: { cp: number; gems: number }[] }> {
    const now = Date.now(), per = trPeriod(now, TUNING.killRank.period);
    // av sıralaması 3 sn'de bir tazelenir (anlık); seviye sıralaması 20 sn önbellekte
    if (this.cache && this.cache.key === per.key && now - this.cache.at <= 20_000 && now - (this.killsAt ?? 0) > 3_000) { this.cache.kills = await this.query(per.key); this.killsAt = now; }
    if (!this.cache || now - this.cache.at > 20_000 || this.cache.key !== per.key) {
      const lv = await pool.query(
        `SELECT c.id, c.name, c.cls, c.level, c.kills, c.xp FROM characters c JOIN accounts a ON a.id=c.account_id
         WHERE c.deleted_at IS NULL AND a.role NOT IN ('gm','admin','owner') ORDER BY c.level DESC, c.xp DESC LIMIT 20`);
      const level = lv.rows.map((x) => ({ charId: Number(x.id), name: x.name, cls: x.cls, level: Number(x.level), kills: Number(x.kills), xp: Number(x.xp) }));
      // bellekteki güncel seviyeler (oyundakiler)
      for (const c of this.store.liveChars()) {
        if (STAFF.has(c.role)) continue;
        const row = level.find((r) => r.charId === c.id);
        if (row) { row.level = c.level; row.xp = c.xp; row.kills = c.kills; }
        else level.push({ charId: c.id, name: c.name, cls: c.cls, level: c.level, kills: c.kills, xp: c.xp });
      }
      level.sort((a, b) => b.level - a.level || b.xp - a.xp); level.length = Math.min(level.length, 10);
      this.cache = { at: now, level, kills: await this.query(per.key), key: per.key }; this.killsAt = now;
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
    const lk = this.host.liveKills?.(); if (lk) for (const [id, v] of lk) if (v.k !== cur.key) lk.delete(id); // eski dönemin anlık sayıları
    await pool.query(`INSERT INTO audit_log(actor_account, action, detail) VALUES (NULL,'killrank.reward',$1)`, [JSON.stringify({ period: last, top: top.slice(0, rewards.length) })]).catch(() => {});
    if (lines.length) this.host.announce(`Canavar Avcıları sıralaması sona erdi! ${lines.join(' · ')}`);
    this.cache = null;
  }
  private async saveState(current: string) {
    await pool.query(`INSERT INTO server_state(key, value, revision) VALUES ('killrank', $1, 0) ON CONFLICT (key) DO UPDATE SET value=$1, updated_at=now()`, [JSON.stringify({ current })]);
  }
}
