// R32 yalnız ilave tablolar kullanır; oyun/ödül tablolarına veya tetikleyicilerine dokunmaz.
export function createAfkSchema(sql) {
 sql.exec(`
 CREATE TABLE IF NOT EXISTS afk_settings(id INTEGER PRIMARY KEY CHECK(id=1),value TEXT NOT NULL,revision INTEGER NOT NULL,updated_ms INTEGER NOT NULL);
 CREATE TABLE IF NOT EXISTS afk_profiles(
  player_id TEXT PRIMARY KEY,account_id TEXT NOT NULL,player_name TEXT NOT NULL,account_name TEXT NOT NULL,
  score REAL NOT NULL DEFAULT 0,reasons TEXT NOT NULL DEFAULT '[]',channel INTEGER NOT NULL DEFAULT 0,map TEXT NOT NULL DEFAULT '',continuous_ms INTEGER NOT NULL DEFAULT 0,
  watch INTEGER NOT NULL DEFAULT 0,pending INTEGER NOT NULL DEFAULT 0,clean_ms INTEGER NOT NULL DEFAULT 0,reset_revision INTEGER NOT NULL DEFAULT 0,
  revision INTEGER NOT NULL DEFAULT 0,last_seen_ms INTEGER NOT NULL DEFAULT 0,last_summary_ms INTEGER NOT NULL DEFAULT 0);
 CREATE INDEX IF NOT EXISTS afk_profiles_score ON afk_profiles(score DESC,last_seen_ms);
 CREATE TABLE IF NOT EXISTS afk_challenges(
  nonce TEXT PRIMARY KEY,root_nonce TEXT NOT NULL,player_id TEXT NOT NULL,account_id TEXT NOT NULL,session_hash TEXT NOT NULL,
  target TEXT NOT NULL,choices TEXT NOT NULL,answer_slot INTEGER NOT NULL CHECK(answer_slot BETWEEN 1 AND 4),
  created_ms INTEGER NOT NULL,deadline_ms INTEGER NOT NULL,attempt INTEGER NOT NULL,max_attempts INTEGER NOT NULL,reason TEXT NOT NULL,
  result TEXT NOT NULL CHECK(result IN ('pending','correct','wrong','unanswered','rebound','cancelled')),answered_ms INTEGER NOT NULL DEFAULT 0,answer_ms INTEGER NOT NULL DEFAULT 0);
 CREATE UNIQUE INDEX IF NOT EXISTS afk_challenges_one_pending ON afk_challenges(player_id) WHERE result='pending';
 CREATE INDEX IF NOT EXISTS afk_challenges_due ON afk_challenges(result,deadline_ms);
 CREATE INDEX IF NOT EXISTS afk_challenges_history ON afk_challenges(player_id,created_ms DESC);
 CREATE INDEX IF NOT EXISTS afk_challenges_retention ON afk_challenges(created_ms) WHERE result<>'pending';
 CREATE TABLE IF NOT EXISTS afk_locks(player_id TEXT PRIMARY KEY,locked INTEGER NOT NULL CHECK(locked IN (0,1)),reason TEXT NOT NULL,created_ms INTEGER NOT NULL,updated_ms INTEGER NOT NULL,cleared_ms INTEGER NOT NULL DEFAULT 0);
 CREATE TABLE IF NOT EXISTS afk_activity(
  id INTEGER PRIMARY KEY,player_id TEXT NOT NULL,at_ms INTEGER NOT NULL,from_ms INTEGER NOT NULL,to_ms INTEGER NOT NULL,channel INTEGER NOT NULL,map TEXT NOT NULL,
  continuous_ms INTEGER NOT NULL,score REAL NOT NULL,reasons TEXT NOT NULL,kills INTEGER NOT NULL,xp INTEGER NOT NULL,inputs INTEGER NOT NULL,
  mean_ms REAL NOT NULL,stddev_ms REAL NOT NULL,cv REAL NOT NULL,radius REAL NOT NULL,hourly_kills REAL NOT NULL,inputs_per_minute REAL NOT NULL,
  UNIQUE(player_id,to_ms));
 CREATE INDEX IF NOT EXISTS afk_activity_history ON afk_activity(player_id,at_ms DESC);
 CREATE INDEX IF NOT EXISTS afk_activity_retention ON afk_activity(at_ms);
 CREATE TABLE IF NOT EXISTS afk_admin_log(id INTEGER PRIMARY KEY,player_id TEXT NOT NULL,admin_id TEXT NOT NULL,admin_name TEXT NOT NULL,at_ms INTEGER NOT NULL,action TEXT NOT NULL,detail TEXT NOT NULL);
 CREATE INDEX IF NOT EXISTS afk_admin_log_history ON afk_admin_log(player_id,at_ms DESC);
 CREATE TABLE IF NOT EXISTS afk_sessions(id INTEGER PRIMARY KEY,player_id TEXT NOT NULL,account_id TEXT NOT NULL,session_hash TEXT NOT NULL,started_ms INTEGER NOT NULL,ended_ms INTEGER NOT NULL DEFAULT 0,channel INTEGER NOT NULL,UNIQUE(player_id,session_hash,started_ms));
 CREATE INDEX IF NOT EXISTS afk_sessions_history ON afk_sessions(player_id,started_ms DESC);
 CREATE INDEX IF NOT EXISTS afk_sessions_retention ON afk_sessions(ended_ms) WHERE ended_ms>0;
 `);
}
