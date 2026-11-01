import {feature510} from "./features510.mjs";
import {ensureGuildBannerSchema} from './guild-banner.mjs';
export const GUILD_WAR_TIMEOUT_SQL = `UPDATE arena_matches SET status=CASE WHEN status='waiting' THEN 'cancelled' ELSE 'finished' END,
 winner_team=CASE WHEN status='waiting' THEN 0 WHEN team_a_score>team_b_score THEN 1 WHEN team_b_score>team_a_score THEN 2 ELSE 0 END,
 finished_at_ms=?,updated_at_ms=? WHERE id IN (SELECT war_id FROM guild_war_locks)
 AND status IN ('waiting','countdown','active') AND starts_at_ms+CASE WHEN status='waiting' THEN 0 ELSE 600000 END<=?`;
// Additive only. Currency invariants are enforced in SQLite, not by UI checks.
export function ensureGuildSchema(database) {
  ensureGuildBannerSchema(database);
  database.exec('SAVEPOINT guild_schema_upgrade');
 try { database.exec(`
CREATE TABLE IF NOT EXISTS guilds (
 id TEXT PRIMARY KEY, name TEXT NOT NULL, name_key TEXT NOT NULL UNIQUE,
 leader_id TEXT NOT NULL UNIQUE REFERENCES players(id), tax_rate INTEGER NOT NULL DEFAULT 0 CHECK(tax_rate BETWEEN 0 AND 50),
 treasury INTEGER NOT NULL DEFAULT 0 CHECK(typeof(treasury)='integer' AND treasury BETWEEN 0 AND 9000000000000),
 monster_kills INTEGER NOT NULL DEFAULT 0, wars_won INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_members (
 player_id TEXT PRIMARY KEY REFERENCES players(id), guild_id TEXT NOT NULL REFERENCES guilds(id),
 can_invite INTEGER NOT NULL DEFAULT 0 CHECK(can_invite IN (0,1)), joined_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guild_members_guild ON guild_members(guild_id,joined_at);
CREATE TABLE IF NOT EXISTS guild_invites (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL REFERENCES guilds(id), sender_id TEXT NOT NULL, recipient_id TEXT NOT NULL,
 expires_at INTEGER NOT NULL, UNIQUE(guild_id,recipient_id)
);
CREATE INDEX IF NOT EXISTS guild_invites_recipient ON guild_invites(recipient_id,expires_at);
CREATE TABLE IF NOT EXISTS guild_ledger (
 id TEXT PRIMARY KEY, guild_id TEXT NOT NULL REFERENCES guilds(id), player_id TEXT NOT NULL,
 kind TEXT NOT NULL CHECK(kind IN ('tax','withdraw')), amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount>0 AND amount<=9000000000000), created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS guild_ledger_history ON guild_ledger(guild_id,created_at DESC);
CREATE TABLE IF NOT EXISTS guild_essence_rewards (
 id TEXT PRIMARY KEY, player_id TEXT NOT NULL REFERENCES players(id), amount INTEGER NOT NULL CHECK(typeof(amount)='integer' AND amount>=0 AND amount<=1000000000), created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS guild_monster_claims (world_cycle INTEGER NOT NULL, monster_id TEXT NOT NULL, spawn_round INTEGER NOT NULL, guild_id TEXT NOT NULL, PRIMARY KEY(world_cycle,monster_id,spawn_round));
CREATE TABLE IF NOT EXISTS guild_wars (
 id TEXT PRIMARY KEY, challenger TEXT NOT NULL REFERENCES guilds(id), defender TEXT NOT NULL REFERENCES guilds(id),
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','active','finished','declined')), expires_at INTEGER NOT NULL,
 start_token TEXT NOT NULL DEFAULT '', created_at INTEGER NOT NULL, CHECK(challenger!=defender)
);
CREATE INDEX IF NOT EXISTS guild_wars_defender ON guild_wars(defender,status,expires_at);
CREATE INDEX IF NOT EXISTS guild_wars_challenger ON guild_wars(challenger,status,expires_at);
CREATE TABLE IF NOT EXISTS guild_war_locks (guild_id TEXT PRIMARY KEY REFERENCES guilds(id), war_id TEXT NOT NULL REFERENCES guild_wars(id));
CREATE TABLE IF NOT EXISTS guild_war_returns (war_id TEXT NOT NULL, player_id TEXT NOT NULL, channel INTEGER NOT NULL, PRIMARY KEY(war_id,player_id));
-- Closed guild financial records remain available for audit and replay protection.
CREATE TABLE IF NOT EXISTS closed_guild_ledger (
 id TEXT PRIMARY KEY,guild_id TEXT NOT NULL,player_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL,created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS closed_guilds (
 id TEXT PRIMARY KEY,name TEXT NOT NULL,leader_id TEXT NOT NULL,closed_at INTEGER NOT NULL
);
CREATE TRIGGER IF NOT EXISTS guild_disband_guard BEFORE DELETE ON guilds BEGIN
 SELECT CASE WHEN OLD.treasury!=0 THEN RAISE(ABORT,'Önce Öz kasasını boşalt.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=OLD.id)
 OR EXISTS(SELECT 1 FROM guild_wars WHERE (challenger=OLD.id OR defender=OLD.id) AND status='active')
 THEN RAISE(ABORT,'Aktif savaş sırasında lonca kapatılamaz.') END;
END;
CREATE TRIGGER IF NOT EXISTS guild_disband_apply AFTER DELETE ON guilds BEGIN
 INSERT INTO closed_guilds VALUES(OLD.id,OLD.name,OLD.leader_id,CAST(strftime('%s','now') AS INTEGER));
 INSERT INTO closed_guild_ledger SELECT * FROM guild_ledger WHERE guild_id=OLD.id;
 DELETE FROM guild_ledger WHERE guild_id=OLD.id;
 DELETE FROM guild_invites WHERE guild_id=OLD.id;
 DELETE FROM guild_members WHERE guild_id=OLD.id;
 DELETE FROM guild_banners WHERE guild_id=OLD.id;
 DELETE FROM guild_war_returns WHERE war_id IN(SELECT id FROM guild_wars WHERE challenger=OLD.id OR defender=OLD.id);
 DELETE FROM guild_wars WHERE challenger=OLD.id OR defender=OLD.id;
END;
CREATE TRIGGER IF NOT EXISTS guild_create_guard BEFORE INSERT ON guilds BEGIN
 SELECT CASE WHEN NOT EXISTS(SELECT 1 FROM players p,economy_settings s WHERE p.id=NEW.leader_id AND s.id=1
 AND p.level>=s.guild_create_level AND p.gems>=s.guild_create_gems AND NOT EXISTS(SELECT 1 FROM guild_members WHERE player_id=p.id))
 THEN RAISE(ABORT,'Lonca kurmak için seviye veya mücevher yetersiz; başka loncada olamazsın.') END;
END;
CREATE TRIGGER IF NOT EXISTS guild_create_apply AFTER INSERT ON guilds BEGIN
 UPDATE players SET gems=gems-(SELECT guild_create_gems FROM economy_settings WHERE id=1) WHERE id=NEW.leader_id;
 INSERT INTO guild_members VALUES(NEW.leader_id,NEW.id,1,NEW.created_at);
END;
CREATE TRIGGER IF NOT EXISTS guild_member_capacity BEFORE INSERT ON guild_members BEGIN
 SELECT CASE WHEN (SELECT COUNT(*) FROM guild_members WHERE guild_id=NEW.guild_id)>=40 THEN RAISE(ABORT,'Lonca dolu: en fazla 40 üye.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=NEW.guild_id) THEN RAISE(ABORT,'Savaş sırasında üyelik değiştirilemez.') END;
END;
CREATE TRIGGER IF NOT EXISTS guild_member_leave_guard BEFORE DELETE ON guild_members BEGIN
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guild_war_locks WHERE guild_id=OLD.guild_id) THEN RAISE(ABORT,'Savaş sırasında üyelik değiştirilemez.') END;
 SELECT CASE WHEN EXISTS(SELECT 1 FROM guilds WHERE id=OLD.guild_id AND leader_id=OLD.player_id) THEN RAISE(ABORT,'Önce başkanlığı başka üyeye devret.') END;
END;
CREATE TRIGGER IF NOT EXISTS guild_reward_apply AFTER INSERT ON guild_essence_rewards BEGIN
 UPDATE players SET essence=essence+NEW.amount WHERE id=NEW.player_id;
 INSERT INTO guild_ledger(id,guild_id,player_id,kind,amount,created_at)
 SELECT 'tax:'||NEW.id,g.id,NEW.player_id,'tax',CAST(NEW.amount*g.tax_rate/100 AS INTEGER),NEW.created_at
 FROM guild_members m JOIN guilds g ON g.id=m.guild_id
 WHERE m.player_id=NEW.player_id AND CAST(NEW.amount*g.tax_rate/100 AS INTEGER)>0;
END;
CREATE TRIGGER IF NOT EXISTS guild_ledger_guard BEFORE INSERT ON guild_ledger BEGIN
 SELECT CASE WHEN NEW.kind='withdraw' AND NOT EXISTS(SELECT 1 FROM guilds WHERE id=NEW.guild_id AND leader_id=NEW.player_id AND treasury>=NEW.amount)
 THEN RAISE(ABORT,'Kasa bakiyesi veya başkan yetkisi yetersiz.') END;
 SELECT CASE WHEN NEW.kind='withdraw' AND (SELECT essence FROM players WHERE id=NEW.player_id)>9000000000000-NEW.amount
 THEN RAISE(ABORT,'Öz taşıma sınırına ulaştın.') END;
END;
CREATE TRIGGER IF NOT EXISTS guild_ledger_apply AFTER INSERT ON guild_ledger BEGIN
 UPDATE guilds SET treasury=treasury+CASE NEW.kind WHEN 'tax' THEN NEW.amount ELSE -NEW.amount END WHERE id=NEW.guild_id;
 UPDATE players SET essence=essence+CASE NEW.kind WHEN 'tax' THEN -NEW.amount ELSE NEW.amount END WHERE id=NEW.player_id;
END;
CREATE TRIGGER IF NOT EXISTS guild_monster_rank AFTER INSERT ON guild_monster_claims BEGIN
 UPDATE guilds SET monster_kills=monster_kills+1 WHERE id=NEW.guild_id;
END;
DROP TRIGGER IF EXISTS guild_war_finish;
CREATE TRIGGER guild_war_finish AFTER UPDATE OF status ON arena_matches
WHEN NEW.status IN ('finished','cancelled') AND OLD.status IN ('waiting','countdown','active') AND EXISTS(SELECT 1 FROM guild_wars WHERE id=NEW.id AND status='active') BEGIN
 UPDATE guilds SET wars_won=wars_won+1 WHERE NEW.status='finished' AND id=(SELECT CASE NEW.winner_team WHEN 1 THEN challenger WHEN 2 THEN defender ELSE '' END FROM guild_wars WHERE id=NEW.id);
 UPDATE guild_wars SET status='finished' WHERE id=NEW.id;
 DELETE FROM guild_war_locks WHERE war_id=NEW.id;
 UPDATE arena_matches SET settlement_token='guild-settled:'||NEW.id WHERE id=NEW.id;
 -- Legacy guild rooms may exceed the current capacity. Returning players use a
 -- free public slot, preferring the saved channel; no public admission bypass.
 -- If every public channel is full, expire only the overflow player's presence.
 -- Their character is safely returned and normal channel admission handles reentry.
 UPDATE players SET last_seen=0 WHERE arena_match_id=NEW.id AND last_seen>=unixepoch()-30
 AND NOT EXISTS(SELECT 1 FROM (SELECT 1 AS channel UNION ALL SELECT 2 UNION ALL SELECT 3) c
  WHERE (SELECT COUNT(*) FROM players occupied WHERE occupied.channel=c.channel
   AND occupied.id!=players.id AND occupied.last_seen>=unixepoch()-30)
   <(SELECT MAX(1,MIN(30,channel_capacity)) FROM game_settings WHERE id=1));
 UPDATE players SET area='bazaar',arena_match_id='',x=1200,y=920,hp=max_hp,hp_revision=hp_revision+1,respawn_at_ms=0,
 channel=COALESCE((SELECT r.channel FROM guild_war_returns r WHERE r.war_id=NEW.id AND r.player_id=players.id
  AND (players.last_seen<unixepoch()-30 OR
   (SELECT COUNT(*) FROM players occupied WHERE occupied.channel=r.channel AND occupied.id!=players.id AND occupied.last_seen>=unixepoch()-30)
   <(SELECT MAX(1,MIN(30,channel_capacity)) FROM game_settings WHERE id=1))),
  (SELECT c.channel FROM (SELECT 1 AS channel UNION ALL SELECT 2 UNION ALL SELECT 3) c
   WHERE (SELECT COUNT(*) FROM players occupied WHERE occupied.channel=c.channel AND occupied.id!=players.id AND occupied.last_seen>=unixepoch()-30)
   <(SELECT MAX(1,MIN(30,channel_capacity)) FROM game_settings WHERE id=1) ORDER BY c.channel LIMIT 1),channel),
 movement_checked_at_ms=CAST(strftime('%s','now') AS INTEGER)*1000,movement_debt_ms=0,motion_stream_id='',motion_sequence=0,
 position_revision=position_revision+1,realtime_scope_version=realtime_scope_version+1,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0
 WHERE arena_match_id=NEW.id;
 DELETE FROM guild_war_returns WHERE war_id=NEW.id;
 INSERT OR IGNORE INTO arena_announcements(match_id,mode,team_name,message,created_at_ms,expires_at_ms)
 SELECT NEW.id,NEW.mode,CASE NEW.winner_team WHEN 1 THEN NEW.team_a_name WHEN 2 THEN NEW.team_b_name ELSE 'Beraberlik' END,
 'Lonca savaşı: '||NEW.team_a_name||' '||NEW.team_a_score||' — '||NEW.team_b_score||' '||NEW.team_b_name,
 NEW.updated_at_ms,NEW.updated_at_ms+7000 WHERE NEW.status='finished';
END;
`); if(feature510('mainSql'))database.exec("CREATE INDEX IF NOT EXISTS guild_ledger_contributions510 ON guild_ledger(guild_id,player_id,amount) WHERE kind='tax'"); database.exec('RELEASE guild_schema_upgrade'); } catch(error) { database.exec('ROLLBACK TO guild_schema_upgrade; RELEASE guild_schema_upgrade'); throw error; }
}
