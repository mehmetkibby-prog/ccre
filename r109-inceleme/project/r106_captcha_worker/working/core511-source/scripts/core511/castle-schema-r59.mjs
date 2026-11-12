import {castleEnabled} from './castle-model-r59.mjs';
export function createCastleSchema(sql){if(!castleEnabled())return;sql.exec(`
CREATE TABLE IF NOT EXISTS castle_config_r59(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,value TEXT NOT NULL,updated_by TEXT NOT NULL DEFAULT '',updated_at_ms INTEGER NOT NULL DEFAULT 0);
INSERT OR IGNORE INTO castle_config_r59(id,revision,value) VALUES(1,0,'{"enabled":false,"drops":[]}');
CREATE TABLE IF NOT EXISTS castle_events_r59(day TEXT PRIMARY KEY,revision INTEGER NOT NULL,state TEXT NOT NULL,rewards TEXT NOT NULL,winner TEXT,finished_at_ms INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS castle_roster_r59(day TEXT NOT NULL,player_id TEXT NOT NULL,guild_id TEXT NOT NULL,PRIMARY KEY(day,player_id));
CREATE INDEX IF NOT EXISTS castle_roster_guild_r59 ON castle_roster_r59(day,guild_id,player_id);
CREATE TABLE IF NOT EXISTS castle_chests_r59(day TEXT NOT NULL,player_id TEXT NOT NULL,result TEXT NOT NULL,claimed_at_ms INTEGER NOT NULL,PRIMARY KEY(day,player_id));
CREATE TABLE IF NOT EXISTS castle_entries_r59(player_id TEXT PRIMARY KEY,return_channel INTEGER NOT NULL,entered_at_ms INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS castle_receipts_r59(scope TEXT NOT NULL,request_id TEXT NOT NULL,input TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(scope,request_id));
`);}
