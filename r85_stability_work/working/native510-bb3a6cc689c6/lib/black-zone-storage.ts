// All transfers run in the same D1 transaction as the successful HP CAS.
// Gear keeps its primary key, rarity and enchantments; a chest is its temporary owner.
type Database = ReturnType<typeof import("./game-world").db>;
const resources = ["essence", "potions", "fish_sokan", "fish_levrek", "fish_zargana", "pearls", "stone_dust"] as const;
const flags = ["has_rod"] as const;
export const BLACK_LOOT_SECONDS = 5;
export const BLACK_CHEST_LIFETIME_MS = 5 * 60 * 1000;
export const BLACK_LOOT_RANGE = 150;
export const nonemptyChestSql = `(c.essence + c.potions + c.fish_sokan + c.fish_levrek + c.fish_zargana + c.pearls + c.stone_dust + c.has_rod + c.has_wings > 0
 OR EXISTS (SELECT 1 FROM player_items i WHERE i.player_id = 'chest:' || c.id))`;
const nearChestSql = `p.area = 'black' AND p.channel = c.channel AND p.hp > 0
 AND (p.x-c.x)*(p.x-c.x)+(p.y-c.y)*(p.y-c.y) <= ${BLACK_LOOT_RANGE ** 2}`;
export function blackDeathStatements(database: Database, chestId: string, victimId: string, killerId: string, revision: number, nowMs: number) {
  const fields = [...resources, ...flags];
  return [
    database.prepare(`INSERT INTO black_loot_chests
      (id, victim_id, victim_name, killer_id, victim_hp_revision, channel, x, y, created_at_ms, ${fields.join(",")})
      SELECT ?, id, name, ?, hp_revision, channel, x, y, ?, ${fields.join(",")} FROM players
      WHERE id = ? AND hp = 0 AND hp_revision = ? AND area = 'black' AND changes() > 0
      ON CONFLICT(victim_id, victim_hp_revision) DO NOTHING RETURNING id`)
      .bind(chestId, killerId, nowMs, victimId, revision),
    database.prepare(`UPDATE player_items SET player_id = ?, equipped = 0
      WHERE player_id = ? AND EXISTS (SELECT 1 FROM black_loot_chests WHERE id = ?)`)
      .bind(`chest:${chestId}`, victimId, chestId),
    database.prepare(`UPDATE players SET ${fields.map(f => `${f} = 0`).join(",")}, rod_equipped = 0,
      max_hp = MAX(1, COALESCE((SELECT player_max_hp FROM combat_settings WHERE id = 1), 100)) + CASE WHEN EXISTS(SELECT 1 FROM player_pets WHERE player_id=players.id AND kind='starter' AND equipped=1 AND acquired_at+259200>unixepoch()) THEN 350 ELSE 0 END
      WHERE id = ? AND EXISTS (SELECT 1 FROM black_loot_chests WHERE id = ?)`)
      .bind(victimId, chestId),
  ];
}
export function startBlackLoot(database: Database, playerId: string, chestId: string, token: string, nowMs: number) {
  return database.prepare(`INSERT INTO black_loot_attempts (player_id, chest_id, token, started_at_ms)
    SELECT p.id, c.id, ?, ? FROM players p JOIN black_loot_chests c ON c.id = ?
    WHERE p.id = ? AND ${nearChestSql} AND ${nonemptyChestSql} AND c.created_at_ms > ? AND (c.claimed_by = '' OR c.claimed_by = p.id)
    ON CONFLICT(player_id) DO UPDATE SET chest_id = excluded.chest_id, token = excluded.token, started_at_ms = excluded.started_at_ms
    RETURNING token, started_at_ms`).bind(token, nowMs, chestId, playerId, nowMs - BLACK_CHEST_LIFETIME_MS);
}
export function finishBlackLootStatements(database: Database, playerId: string, chestId: string, token: string, receipt: string, nowMs: number) {
  const guard = `EXISTS (SELECT 1 FROM black_loot_chests WHERE id = ? AND last_claim_token = ?)`;
  return [
    database.prepare(`UPDATE black_loot_chests AS c SET claimed_by = ?, last_claim_token = ?,
      take_rod = CASE WHEN (SELECT has_rod FROM players WHERE id = ?) = 0 THEN has_rod ELSE 0 END,
      take_wings = CASE WHEN (SELECT has_wings FROM players WHERE id = ?) = 0 THEN has_wings ELSE 0 END
      WHERE c.id = ? AND (c.claimed_by = '' OR c.claimed_by = ?) AND ${nonemptyChestSql} AND c.created_at_ms > ?
      AND EXISTS (SELECT 1 FROM black_loot_attempts a JOIN players p ON p.id = a.player_id
        WHERE a.player_id = ? AND a.chest_id = c.id AND a.token = ? AND a.started_at_ms <= ?
          AND a.started_at_ms >= ? AND ${nearChestSql}) RETURNING id`)
      .bind(playerId, receipt, playerId, playerId, chestId, playerId, nowMs - BLACK_CHEST_LIFETIME_MS, playerId, token, nowMs - BLACK_LOOT_SECONDS * 1000, nowMs - 30000),
    database.prepare(`UPDATE player_items SET player_id = ?, equipped = 0 WHERE player_id = ? AND ${guard}`)
      .bind(playerId, `chest:${chestId}`, chestId, receipt),
    database.prepare(`UPDATE players SET ${resources.map(f => `${f} = ${f} + (SELECT ${f} FROM black_loot_chests WHERE id = ?)`).join(",")},
      has_rod = MAX(has_rod, (SELECT take_rod FROM black_loot_chests WHERE id = ?)),
      has_wings = MAX(has_wings, (SELECT take_wings FROM black_loot_chests WHERE id = ?))
      WHERE id = ? AND ${guard}`)
      .bind(...resources.map(() => chestId), chestId, chestId, playerId, chestId, receipt),
    database.prepare(`UPDATE black_loot_chests SET ${resources.map(f => `${f} = 0`).join(",")},
      has_rod = has_rod - take_rod, has_wings = has_wings - take_wings, take_rod = 0, take_wings = 0
      WHERE id = ? AND last_claim_token = ? RETURNING has_rod, has_wings`).bind(chestId, receipt),
    database.prepare("DELETE FROM black_loot_attempts WHERE player_id = ? AND token = ?").bind(playerId, token),
  ];
}

/** A collected item no longer has chest ownership and is never deleted here. */
export function expireBlackChestStatements(database: Database, nowMs: number) {
  const cutoff = nowMs - BLACK_CHEST_LIFETIME_MS;
  return [
    database.prepare("DELETE FROM player_items WHERE player_id IN (SELECT 'chest:' || id FROM black_loot_chests WHERE created_at_ms <= ?)").bind(cutoff),
    database.prepare("DELETE FROM black_loot_attempts WHERE chest_id IN (SELECT id FROM black_loot_chests WHERE created_at_ms <= ?)").bind(cutoff),
    database.prepare("DELETE FROM black_loot_chests WHERE created_at_ms <= ?").bind(cutoff),
  ];
}
