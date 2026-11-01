// Native startup only: after every schema upgrade and retireBlackLoot, before
// runtime services, read workers and the application bundle become available.
import {DatabaseSync} from 'node:sqlite';
import {backupInOneStep,verifiedBackup} from './sqlite-backup.mjs';
import {mkdirSync, chmodSync} from 'node:fs';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';

export const PEARL_RESET_ID = 'all-player-pearls-reset-2026-09-26-v1';
export async function ensurePearlReset(db, {backupRoot, now = Date.now} = {}) {
  // Existing app startup already creates this table. Keep this independently usable.
  db.exec('CREATE TABLE IF NOT EXISTS app_release_migrations(id TEXT PRIMARY KEY NOT NULL,applied_at_ms INTEGER NOT NULL)');
  const previous = db.prepare('SELECT applied_at_ms FROM app_release_migrations WHERE id=?').get(PEARL_RESET_ID);
  if (previous) return {applied: false, appliedAtMs: previous.applied_at_ms};
  if (!backupRoot) throw new Error('Pearl reset requires a durable backup directory.');
  const appliedAtMs = Math.max(1, now());
  mkdirSync(backupRoot, {recursive: true, mode: 0o700});
  const backupName = `before-pearl-reset-${appliedAtMs}-${randomUUID()}.sqlite`;
  const backupFile = join(backupRoot, backupName);
  await verifiedBackup(backupFile,file=>backupInOneStep(db,file));
  chmodSync(backupFile, 0o600);
  const verification = new DatabaseSync(backupFile, {readOnly: true});
  try {
    if (verification.prepare('PRAGMA integrity_check').get().integrity_check !== 'ok') {
      throw new Error('Pearl reset backup verification failed; stock was not changed.');
    }
  } finally { verification.close(); }
  db.exec('BEGIN IMMEDIATE');
  try {
    const raced = db.prepare('SELECT applied_at_ms FROM app_release_migrations WHERE id=?').get(PEARL_RESET_ID);
    if (raced) { db.exec('COMMIT'); return {applied: false, appliedAtMs: raced.applied_at_ms}; }
    // Mark the exact pre-reset defeats. New defeats default to zero, including
    // kills in the same second; queued XP and every other reward remain payable.
    // Dragon recovery shares normal_defeats with ordinary monsters.
    for (const table of ['normal_defeats', 'boss_defeats', 'sinsi_defeats']) {
      const columns = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(row => row.name));
      if (!columns.has('pearls_retired')) db.exec(`ALTER TABLE ${table} ADD COLUMN pearls_retired INTEGER NOT NULL DEFAULT 0`);
      db.exec(`UPDATE ${table} SET pearls_retired=1`);
    }
    // Offers are promises, not escrow: cancel only active trades containing pearls.
    const cancel = db.prepare("UPDATE player_trades SET status='cancelled',revision=revision+1,a_ready=0,b_ready=0,a_confirm=0,b_confirm=0 WHERE id=?");
    const unlock = db.prepare('DELETE FROM player_trade_locks WHERE trade_id=?');
    for (const trade of db.prepare("SELECT id,a_offer,b_offer FROM player_trades WHERE status IN ('invited','open')").all()) {
      const containsPearls = [trade.a_offer, trade.b_offer].some(value => JSON.parse(value).materials.some(item => item.key === 'pearls'));
      if (containsPearls) { cancel.run(trade.id); unlock.run(trade.id); }
    }
    db.exec(`
      UPDATE players SET pearls=0,wheel_paid_pearls=0 WHERE pearls!=0 OR wheel_paid_pearls!=0;
      UPDATE black_loot_chests SET pearls=0 WHERE pearls!=0;
      DELETE FROM player_storage_items WHERE kind IN ('pearl','pearls');
      DELETE FROM player_items WHERE kind IN ('pearl','pearls');
      UPDATE market_shops SET active=0
        WHERE EXISTS(SELECT 1 FROM market_listings l WHERE l.shop_id=market_shops.id AND l.kind='pearl')
        AND NOT EXISTS(SELECT 1 FROM market_listings l WHERE l.shop_id=market_shops.id AND l.kind!='pearl');
      DELETE FROM market_listings WHERE kind='pearl';
      DELETE FROM world_drops WHERE kind IN ('pearl','pearls') OR id IN (
        SELECT drop_id FROM dragon_drop_payloads
        WHERE CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.itemId') END='resource:pearls'
      );
      DELETE FROM dragon_drop_payloads
        WHERE CASE WHEN json_valid(payload_json) THEN json_extract(payload_json,'$.itemId') END='resource:pearls';
      DELETE FROM fishing_sessions;
    `);
    // Native sale/cancel batches are atomic. Preserve all gold and history; seal
    // unsuccessful/incomplete pearl operations so old requests cannot mint stock.
    db.prepare("UPDATE market_settlements SET amount=0,applied_at_ms=? WHERE kind='pearl' AND applied_at_ms<=0").run(appliedAtMs);
    // Never delete request/claim/reward receipts: those are replay barriers.
    db.prepare('INSERT INTO app_release_migrations(id,applied_at_ms) VALUES(?,?)').run(PEARL_RESET_ID, appliedAtMs);
    db.exec('COMMIT');
    return {applied: true, appliedAtMs, backupName};
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
