// Runs in the same transaction as character creation. The account ledger also
// covers legacy preregistration rewards, so a new character cannot claim twice.
export const STARTER_CHARACTER_GRANT_SQL = `INSERT OR IGNORE INTO prereg_rewards(account_id,player_id,granted_at_ms)
  SELECT account_id,id,? FROM players WHERE id=? AND account_id=?`;
