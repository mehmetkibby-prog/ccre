import {STONE_PARTICIPANT_EXPIRY_GUARD476,STONE_DEFEAT_EXPIRY_GUARD476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
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

