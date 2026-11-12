import {createMistLootSchema} from './mist-loot.mjs';
import {migrateTowerXp} from './tower-xp.mjs';
import {MIST_DEFAULTS} from './mist-config.mjs';
export function createAdventureSchema(sql){
 sql.exec(`CREATE TABLE IF NOT EXISTS adventure_settings(id INTEGER PRIMARY KEY CHECK(id=1),revision INTEGER NOT NULL,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS adventure_runs(id TEXT PRIMARY KEY,kind TEXT NOT NULL,channel INTEGER NOT NULL,cycle INTEGER NOT NULL,area TEXT NOT NULL UNIQUE,status TEXT NOT NULL,created_ms INTEGER NOT NULL,deadline_ms INTEGER NOT NULL,revision INTEGER NOT NULL DEFAULT 1,config TEXT NOT NULL,state TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS adventure_runs_channel ON adventure_runs(channel,status);
 CREATE TABLE IF NOT EXISTS adventure_members(player_id TEXT PRIMARY KEY,run_id TEXT NOT NULL,origin_area TEXT NOT NULL,origin_x REAL NOT NULL,origin_y REAL NOT NULL,joined_ms INTEGER NOT NULL,contribution INTEGER NOT NULL DEFAULT 0,departed INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS adventure_members_run ON adventure_members(run_id,departed);
 CREATE TABLE IF NOT EXISTS adventure_entries(run_id TEXT NOT NULL,player_id TEXT NOT NULL,PRIMARY KEY(run_id,player_id));
 CREATE TABLE IF NOT EXISTS adventure_monsters(id TEXT PRIMARY KEY,run_id TEXT NOT NULL,area TEXT NOT NULL,profile TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS adventure_monsters_run ON adventure_monsters(run_id);
 CREATE TABLE IF NOT EXISTS adventure_portals(id TEXT PRIMARY KEY,run_id TEXT NOT NULL UNIQUE,channel INTEGER NOT NULL,area TEXT NOT NULL,x REAL NOT NULL,y REAL NOT NULL,opens_ms INTEGER NOT NULL,closes_ms INTEGER NOT NULL,gold INTEGER NOT NULL,capacity INTEGER NOT NULL,entered INTEGER NOT NULL DEFAULT 0,source_key TEXT UNIQUE);
 CREATE INDEX IF NOT EXISTS adventure_portals_live ON adventure_portals(channel,closes_ms);
 CREATE TABLE IF NOT EXISTS adventure_receipts(player_id TEXT NOT NULL,request_id TEXT NOT NULL,action TEXT NOT NULL,result TEXT NOT NULL,PRIMARY KEY(player_id,request_id,action));
 CREATE TABLE IF NOT EXISTS adventure_awards(key TEXT NOT NULL,player_id TEXT NOT NULL,created_ms INTEGER NOT NULL,PRIMARY KEY(key,player_id));
 CREATE TABLE IF NOT EXISTS adventure_schedule(id TEXT PRIMARY KEY,channel INTEGER NOT NULL,area TEXT NOT NULL,x REAL NOT NULL,y REAL NOT NULL,at_ms INTEGER NOT NULL,gold INTEGER NOT NULL,done_ms INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS adventure_schedule_due ON adventure_schedule(done_ms,channel,at_ms);
 CREATE TABLE IF NOT EXISTS adventure_chests(id TEXT PRIMARY KEY,player_id TEXT NOT NULL,gold INTEGER NOT NULL,contents TEXT NOT NULL,opened_ms INTEGER NOT NULL DEFAULT 0);`);
 // Indexed actor/party lookups keep quest reads and group admission bounded
 // as the durable adventure history grows. Additive indexes survive rollback.
 sql.exec(`CREATE INDEX IF NOT EXISTS adventure_chests_player_r70 ON adventure_chests(player_id,gold);
 CREATE INDEX IF NOT EXISTS adventure_awards_player_r70 ON adventure_awards(player_id,key);
 CREATE INDEX IF NOT EXISTS adventure_active_party_r70 ON adventure_runs(json_extract(state,'$.partyId'),cycle) WHERE kind='tower' AND status='active';`);
 sql.prepare('INSERT OR IGNORE INTO adventure_settings VALUES(1,1,?)').run(JSON.stringify(MIST_DEFAULTS));
 createMistLootSchema(sql);migrateTowerXp(sql);
}
