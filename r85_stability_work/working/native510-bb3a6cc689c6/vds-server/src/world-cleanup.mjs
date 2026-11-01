import {STONE_PARTICIPANT_EXPIRY_GUARD476,STONE_DEFEAT_EXPIRY_GUARD476} from '../../lib/stone-boss-ranking476.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';

const DROP_READY = "enchantments NOT IN ('__pending__','__profile_pending__')";
const withoutBossParticipant = 'NOT EXISTS (SELECT 1 FROM boss_participants p WHERE p.boss_round=boss_reward_claims.boss_round AND p.player_id=boss_reward_claims.player_id)';
const withoutParticipant = table => `NOT EXISTS (SELECT 1 FROM monster_participants p WHERE p.monster_id=${table}.monster_id AND p.spawn_round=${table}.spawn_round AND p.player_id=${table}.player_id)`;

// Retire the discoverable death before its participants, and the participants
// before their receipts. A reward request may already hold a death snapshot
// across an I/O turn: retain its receipt while that participant can still be
// selected by INSERT ... SELECT in the authoritative reward transaction.
export const WORLD_CLEANUP_TABLES = [
  ['solo_entry_receipts','created_at',604800,"NOT EXISTS (SELECT 1 FROM dungeon_members m WHERE m.run_id=solo_entry_receipts.run_id)"],
  ['solo_key_crafts','created_at',2592000],
  ['boss_defeats','defeated_at',86400],
  ['normal_defeats','defeated_at',86400,STONE_DEFEAT_EXPIRY_GUARD476],
  ['sinsi_defeats','defeated_at',86400],
  ['boss_participants','created_at',86400],
  ['monster_participants','created_at',86400,STONE_PARTICIPANT_EXPIRY_GUARD476],
  ['boss_reward_claims','awarded_at',86400,withoutBossParticipant],
  ['normal_reward_claims','awarded_at',86400,withoutParticipant('normal_reward_claims')],
  ['sinsi_reward_claims','awarded_at',86400,withoutParticipant('sinsi_reward_claims')],
  ['messages','created_at',86400,"id NOT IN (SELECT id FROM messages WHERE recipient_id IS NULL AND scope = 'world' AND announcement_expires_at_ms = 0 ORDER BY id DESC LIMIT 20)"],
  ['world_drops','expires_at',0,DROP_READY],
  ['combat_events','created_at',5000,'',true],
  ['party_invites','created_at',120],
  ['fishing_sessions','expires_at_ms',0,'',true],
  ['arena_queue','last_seen_ms',45000,'',true],
  ['arena_announcements','expires_at_ms',30000,'',true],
  ['arena_kill_claims','created_at_ms',604800000,'',true],
  ['war_kill_claims','created_at_ms',604800000,'',true],
  ['arena_reward_claims','awarded_at_ms',2592000000,'',true],
  ['guardian_reward_claims','awarded_at',604800],
];

// Additive VDS-only indexes. Existing indexes already cover the other expiry
// ranges; neither old D1 migrations nor gameplay records are changed here.
export function ensureWorldCleanupIndexes(database) {
  for (const [table,column] of WORLD_CLEANUP_TABLES.filter(([table]) => [
    'boss_defeats','boss_participants','monster_participants','boss_reward_claims',
    'normal_reward_claims','sinsi_reward_claims','party_invites',
    'arena_kill_claims','arena_reward_claims',
  ].includes(table))) database.exec(`CREATE INDEX IF NOT EXISTS idx_cleanup_${table} ON ${table}(${column})`);
  database.exec(`CREATE INDEX IF NOT EXISTS idx_cleanup_world_drops ON world_drops(expires_at) WHERE ${DROP_READY}`);
}

export function worldCleanupSql([table,column,,guard]) {
  return `DELETE FROM ${table} WHERE rowid IN (SELECT rowid FROM ${table} WHERE ${column} < ?${guard ? ` AND ${guard}` : ''} ORDER BY ${column},rowid LIMIT ?)`;
}

const active = new WeakMap();
const cursors=new WeakMap();
export function cleanupWorldHistory(database, nowMs, {defer=deferDatabaseBackgroundTask, batchSize=32, maxBatchesPerTable=128}={}) {
  if (active.has(database)) return active.get(database);
  if (!Number.isSafeInteger(nowMs) || nowMs <= 0) return Promise.reject(new Error('Invalid world cleanup time'));
  if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 256 || !Number.isInteger(maxBatchesPerTable) || maxBatchesPerTable < 1 || maxBatchesPerTable > 128) return Promise.reject(new Error('Invalid world cleanup budget'));
  const job = (async () => {
    let progress=cursors.get(database);if(!progress)cursors.set(database,progress=new Map());
    if(process.env.CORE_WORLD_LOOP!=='0'){
      // No timestamp on payloads: advance a bounded rowid cursor. Retain every
      // payload whose drop still exists; never traverse the whole table in tick.
      const table='dragon_drop_payloads';
      const exists=await database.prepare("SELECT 1 FROM sqlite_schema WHERE name='dragon_drop_payloads'").first();
      if(exists){let cursor=progress.get(table)??0;
        for(let batch=0;batch<maxBatchesPerTable;batch++){
          const count=await defer(async()=>{
            const {results}=await database.prepare('SELECT rowid AS rid FROM dragon_drop_payloads WHERE rowid>? ORDER BY rowid LIMIT ?').bind(cursor,batchSize).all();
            if(!results.length)return 0;
            cursor=results.at(-1).rid;progress.set(table,cursor);
            await database.batch([database.prepare(`DELETE FROM dragon_drop_payloads WHERE rowid IN (${results.map(()=>'?').join(',')}) AND NOT EXISTS(SELECT 1 FROM world_drops d WHERE d.id=dragon_drop_payloads.drop_id)`).bind(...results.map(r=>r.rid))]);
            return results.length;
          });
          if(count<batchSize){progress.delete(table);break;}
        }
      }
    }
    for (const entry of WORLD_CLEANUP_TABLES) {
      const cutoff = (entry[4] ? nowMs : Math.floor(nowMs / 1000)) - entry[2];
      const sql = worldCleanupSql(entry);
      let cursor=progress.get(entry[0])??[-Number.MAX_SAFE_INTEGER,0];
      for (let batch = 0; batch < maxBatchesPerTable; batch++) {
        // Each group is independently committed. Never hold a SQLite
        // transaction across an event-loop yield or player request.
        let candidates=null;
        const removed = await defer(async () => {
          if(process.env.CORE_WORLD_LOOP!=='0'){
            const [table,column,,guard]=entry;
            // LIMIT the time-index candidates BEFORE testing protection. A
            // million protected receipts must not be scanned for 32 deletions.
            const rows=await database.prepare(`SELECT rowid AS rid,${column} AS stamp FROM main.${table} WHERE ${column}<? AND (${column},rowid)>(?,?) ORDER BY ${column},rowid LIMIT ?`).bind(cutoff,...cursor,batchSize).all();
            candidates=rows.results.length;if(!candidates){progress.delete(table);return 0;}
            const last=rows.results.at(-1);cursor=[last.stamp,last.rid];progress.set(table,cursor);
            const [result]=await database.batch([database.prepare(`DELETE FROM ${table} WHERE rowid IN (${rows.results.map(()=>'?').join(',')}) AND ${column}<?${guard?` AND ${guard}`:''}`).bind(...rows.results.map(r=>r.rid),cutoff)]);
            return Number(result.meta.changes);
          }
          const [result] = await database.batch([database.prepare(sql).bind(cutoff,batchSize)]);
          return Number(result.meta.changes);
        });
        if ((candidates??removed) < batchSize){progress.delete(entry[0]);break;}
      }
    }
  })();
  active.set(database,job);
  void job.finally(() => { if (active.get(database) === job) active.delete(database); }).catch(() => {});
  return job;
}
