export function ensureEventSchema(db){
 db.exec(CHEST_RECEIPT_SCHEMA);
 db.exec(`CREATE TABLE IF NOT EXISTS dungeon_event_claims(run_id TEXT NOT NULL,enemy_id TEXT NOT NULL,player_id TEXT NOT NULL,amount INTEGER NOT NULL,PRIMARY KEY(run_id,enemy_id,player_id))`);
 const cols=new Set(db.prepare('PRAGMA table_info(game_settings)').all().map(r=>r.name));
 if(!cols.has('events_json'))db.exec("ALTER TABLE game_settings ADD COLUMN events_json TEXT NOT NULL DEFAULT ''");
 for(const table of ['normal_defeats','boss_defeats','sinsi_defeats']){
 const columns=new Set(db.prepare(`PRAGMA table_info(${table})`).all().map(r=>r.name));
 if(columns.size&&!columns.has('events_snapshot'))db.exec(`ALTER TABLE ${table} ADD COLUMN events_snapshot TEXT NOT NULL DEFAULT ''`);
 }
 // Reward repair reads only unfinished gear. Both chest events can increase the
 // ground-drop table without making every kill scan all collected/expired loot.
 if(db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='world_drops'").get())
  db.exec("CREATE INDEX IF NOT EXISTS idx_world_drops_pending_gear ON world_drops(expires_at) WHERE enchantments IN ('__pending__','__profile_pending__') AND kind IN ('weapon','armor','helmet','shoes','necklace')");
}
export const CHEST_RECEIPT_SCHEMA=`CREATE TABLE IF NOT EXISTS crystal_chest_openings(
 id TEXT PRIMARY KEY,player_id TEXT NOT NULL,reward_json TEXT NOT NULL,claim_token TEXT NOT NULL,created_at INTEGER NOT NULL)`;
