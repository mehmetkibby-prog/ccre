// Hooks attach only to existing, committed kill counters/receipts. No world
// scan, new simulation timer, or retryable client claim is introduced.
export function createContentLootR102(sql){
 const tables=new Set(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(r=>r.name));
 const cols=new Set(sql.prepare('PRAGMA table_info(players)').all().map(r=>r.name));
 if(cols.has('daily_monster_kills'))sql.exec(`CREATE TRIGGER IF NOT EXISTS content_stocking_drop_r102 AFTER UPDATE OF daily_monster_kills ON players
 WHEN NEW.is_gm=0 AND NEW.daily_monster_kills>0 AND
 (NEW.daily_monster_day<>OLD.daily_monster_day OR NEW.daily_monster_kills>OLD.daily_monster_kills)
 AND (SELECT json_extract(config,'$.newyear.enabled') FROM content_settings_r102 WHERE id=1)=1
 BEGIN
 INSERT INTO dungeon_materials(player_id,kind,amount)
 SELECT NEW.id,'newyear_sock_r102',COUNT(*) FROM
 (WITH RECURSIVE n(i) AS (SELECT 1 UNION ALL SELECT i+1 FROM n WHERE i<MIN(100,CASE WHEN NEW.daily_monster_day=OLD.daily_monster_day THEN NEW.daily_monster_kills-OLD.daily_monster_kills ELSE NEW.daily_monster_kills END))
 SELECT i FROM n WHERE abs(random()%100000000)<(SELECT json_extract(config,'$.newyear.dropPercent')*1000000 FROM content_settings_r102 WHERE id=1))
 HAVING COUNT(*)>0
 ON CONFLICT(player_id,kind) DO UPDATE SET amount=MIN(1000000000,amount+excluded.amount);
 END;`);
 if(!tables.has('war_kill_claims'))return;
 sql.exec(`CREATE TABLE IF NOT EXISTS content_battlefield_claims_r102(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,victim_account TEXT NOT NULL,killer_account TEXT NOT NULL,created_at INTEGER NOT NULL);
 CREATE INDEX IF NOT EXISTS content_battlefield_claim_time_r102 ON content_battlefield_claims_r102(created_at);`);
 const day='CAST((NEW.created_at_ms+10800000)/86400000 AS INTEGER)',minute='CAST(((NEW.created_at_ms+10800000)/60000)%1440 AS INTEGER)',weekday=`CAST(strftime('%w',NEW.created_at_ms/1000+10800,'unixepoch') AS INTEGER)`;
 const cfg="(SELECT config FROM content_settings_r102 WHERE id=1)",value=key=>`json_extract(${cfg},'$.battlefield.${key}')`;
 const start="json_extract(slot.value,'$.start')",end="json_extract(slot.value,'$.end')";
 const days=shift=>`EXISTS(SELECT 1 FROM json_each(slot.value,'$.days') d WHERE CAST(d.value AS INTEGER)=((${weekday}+${shift})%7))`;
 const schedule=`EXISTS(SELECT 1 FROM json_each(${cfg},'$.battlefield.slots') slot WHERE (${start}<${end} AND ${days(0)} AND ${minute}>=${start} AND ${minute}<${end}) OR (${start}>${end} AND ((${days(0)} AND ${minute}>=${start}) OR (${days(6)} AND ${minute}<${end}))))`;
 sql.exec(`CREATE TRIGGER IF NOT EXISTS content_battlefield_kill_r102 AFTER INSERT ON war_kill_claims
 WHEN ${value('enabled')}=1 AND ${schedule}
 BEGIN
 INSERT INTO content_battlefield_claims_r102(id,player_id,victim_account,killer_account,created_at)
 SELECT NEW.id,k.id,v.account_id,k.account_id,NEW.created_at_ms FROM players k JOIN players v ON v.id=NEW.victim_id
 WHERE k.id=NEW.killer_id AND k.id<>v.id AND k.account_id<>v.account_id AND k.is_gm=0 AND v.is_gm=0 AND k.area='war' AND v.area='war'
 AND NOT EXISTS(SELECT 1 FROM content_battlefield_victims_r102 prior WHERE prior.killer_account=k.account_id AND prior.victim_account=v.account_id AND NEW.created_at_ms-prior.last_at<${value('victimCooldownSeconds')}*1000)
 AND NOT EXISTS(SELECT 1 FROM content_battlefield_r102 tally WHERE tally.player_id=k.id AND tally.day=${day} AND tally.chests>=${value('maxChestsPerDay')})
 ON CONFLICT(id) DO NOTHING;
 END;
 CREATE TRIGGER IF NOT EXISTS content_battlefield_award_r102 AFTER INSERT ON content_battlefield_claims_r102 BEGIN
 INSERT INTO content_battlefield_victims_r102(killer_account,victim_account,last_at) VALUES(NEW.killer_account,NEW.victim_account,NEW.created_at)
 ON CONFLICT(killer_account,victim_account) DO UPDATE SET last_at=excluded.last_at;
 INSERT INTO content_battlefield_r102(player_id,day,kills,chests) VALUES(NEW.player_id,CAST((NEW.created_at+10800000)/86400000 AS INTEGER),1,0)
 ON CONFLICT(player_id) DO UPDATE SET kills=CASE WHEN day=excluded.day THEN kills+1 ELSE 1 END,chests=CASE WHEN day=excluded.day THEN chests ELSE 0 END,day=excluded.day;
 INSERT INTO dungeon_materials(player_id,kind,amount) SELECT NEW.player_id,'victory_chest_r102',1 FROM content_battlefield_r102 WHERE player_id=NEW.player_id AND kills>=${value('killsPerChest')}
 ON CONFLICT(player_id,kind) DO UPDATE SET amount=MIN(1000000000,amount+1);
 UPDATE content_battlefield_r102 SET kills=0,chests=chests+1 WHERE player_id=NEW.player_id AND kills>=${value('killsPerChest')};
 END;`);
}
