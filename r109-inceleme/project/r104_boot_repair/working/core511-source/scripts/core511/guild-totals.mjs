import {demand} from './contract.mjs';
// Additive, rebuildable read projection. The original ledger, treasury/reward
// guards and writer transaction remain authoritative. Never call during play.
export function installGuildTotals(sqlite,{maintenance,players,durableDrained}){
 demand(maintenance===true&&players===0&&durableDrained===true&&!sqlite.isTransaction,'guild_projection_requires_quiescence');
 sqlite.exec('BEGIN IMMEDIATE');
 try{
  sqlite.exec(`CREATE TABLE IF NOT EXISTS kernel511_read_projection(version INTEGER PRIMARY KEY);
   CREATE TABLE IF NOT EXISTS kernel511_guild_contributions(guild_id TEXT NOT NULL,player_key TEXT NOT NULL,player_id TEXT,total INTEGER NOT NULL,entries INTEGER NOT NULL CHECK(entries>0),PRIMARY KEY(guild_id,player_key)) WITHOUT ROWID;`);
  if(!sqlite.prepare('SELECT 1 FROM kernel511_read_projection WHERE version=1').get()){
   demand(sqlite.prepare('SELECT count(*) AS n FROM kernel511_guild_contributions').get().n===0,'unexpected_guild_projection_state');
   sqlite.exec(`INSERT INTO kernel511_guild_contributions
    SELECT guild_id,CASE WHEN player_id IS NULL THEN 'n' ELSE 's:'||player_id END,player_id,COALESCE(SUM(amount),0),COUNT(*) FROM guild_ledger WHERE kind='tax' GROUP BY guild_id,player_id;
    INSERT INTO kernel511_read_projection VALUES(1);`);
  }
  const insert=`INSERT INTO kernel511_guild_contributions(guild_id,player_key,player_id,total,entries)
    SELECT NEW.guild_id,CASE WHEN NEW.player_id IS NULL THEN 'n' ELSE 's:'||NEW.player_id END,NEW.player_id,COALESCE(NEW.amount,0),1 WHERE NEW.kind='tax'
    ON CONFLICT(guild_id,player_key) DO UPDATE SET total=total+COALESCE(NEW.amount,0),entries=entries+1;`;
  const remove=`DELETE FROM kernel511_guild_contributions WHERE OLD.kind='tax' AND guild_id=OLD.guild_id AND player_key=CASE WHEN OLD.player_id IS NULL THEN 'n' ELSE 's:'||OLD.player_id END AND entries=1;
    UPDATE kernel511_guild_contributions SET total=total-COALESCE(OLD.amount,0),entries=entries-1 WHERE OLD.kind='tax' AND guild_id=OLD.guild_id AND player_key=CASE WHEN OLD.player_id IS NULL THEN 'n' ELSE 's:'||OLD.player_id END;`;
  sqlite.exec(`CREATE TRIGGER IF NOT EXISTS kernel511_guild_tax_insert AFTER INSERT ON guild_ledger BEGIN ${insert} END;
    CREATE TRIGGER IF NOT EXISTS kernel511_guild_tax_delete AFTER DELETE ON guild_ledger BEGIN ${remove} END;
    CREATE TRIGGER IF NOT EXISTS kernel511_guild_tax_update AFTER UPDATE OF guild_id,player_id,kind,amount ON guild_ledger BEGIN ${remove} ${insert} END;`);
  sqlite.exec('COMMIT');
 }catch(error){if(sqlite.isTransaction)sqlite.exec('ROLLBACK');throw error;}
}
// Exactly the old lifetime-contribution output, with the full ledger GROUP BY
// replaced by a transactional projection. Retains former members and NULL IDs.
export const GUILD_CONTRIBUTIONS_SQL=`WITH totals AS (
 SELECT player_id,total FROM kernel511_guild_contributions WHERE guild_id=?
 ), current_members AS (SELECT player_id FROM guild_members WHERE guild_id=?),
 participants AS (SELECT player_id FROM totals UNION SELECT player_id FROM current_members)
 SELECT u.player_id,COALESCE(p.name,'Eski oyuncu') AS name,COALESCE(t.total,0) AS total,
 CASE WHEN m.player_id IS NULL THEN 0 ELSE 1 END AS is_member
 FROM participants u LEFT JOIN players p ON p.id=u.player_id LEFT JOIN totals t ON t.player_id=u.player_id
 LEFT JOIN current_members m ON m.player_id=u.player_id ORDER BY total DESC,name,u.player_id`;
