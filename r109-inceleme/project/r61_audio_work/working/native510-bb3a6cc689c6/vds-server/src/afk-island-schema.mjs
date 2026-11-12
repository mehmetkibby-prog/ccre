import {AFK_SPAWNS} from '../../lib/afk-island.mjs';
export function ensureAfkIsland(db){
 db.exec('BEGIN IMMEDIATE');
 try{
  const combat=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(r=>r.name));
  if(!combat.has('afk_island_enabled'))db.exec('ALTER TABLE combat_settings ADD COLUMN afk_island_enabled INTEGER NOT NULL DEFAULT 0');
  if(!combat.has('afk_island_xp_reward'))db.exec('ALTER TABLE combat_settings ADD COLUMN afk_island_xp_reward INTEGER NOT NULL DEFAULT 10');
  if(!combat.has('afk_island_respawn_seconds'))db.exec('ALTER TABLE combat_settings ADD COLUMN afk_island_respawn_seconds INTEGER NOT NULL DEFAULT 12');
  for(const [key,defaultValue] of [['ancient_boss_purple_chance',0.001],['ancient_normal_purple_chance',0.001],['world_boss_purple_chance',0.0005]]){
    if(!combat.has(key))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${key} REAL NOT NULL DEFAULT ${defaultValue} CHECK(${key} BETWEEN 0 AND 1)`);
  }
  db.exec(`CREATE TABLE IF NOT EXISTS afk_hunt_state(
    player_id TEXT PRIMARY KEY,day INTEGER NOT NULL,used_ms INTEGER NOT NULL DEFAULT 0 CHECK(used_ms>=0),
    bonus_ms INTEGER NOT NULL DEFAULT 0 CHECK(bonus_ms IN (0,7200000)),
    active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1)),tick_at_ms INTEGER NOT NULL DEFAULT 0,
    kills_since_essence INTEGER NOT NULL DEFAULT 0,next_essence_at INTEGER NOT NULL DEFAULT 4,
    last_reward_token TEXT NOT NULL DEFAULT ''
  );
  CREATE TABLE IF NOT EXISTS afk_monster_combat_profiles(
    profile_key TEXT PRIMARY KEY,area TEXT NOT NULL CHECK(area='afk'),
    family TEXT NOT NULL CHECK(family IN ('golge','curuk','yutan')),
    variant TEXT NOT NULL CHECK(variant='normal'),max_hp INTEGER NOT NULL CHECK(max_hp BETWEEN 1 AND 10000000),
    hit_damage INTEGER NOT NULL CHECK(hit_damage BETWEEN 1 AND 1000000),updated_at INTEGER NOT NULL DEFAULT 0,
    CHECK(profile_key=area||'.'||family||'.'||variant)
  );
  CREATE TABLE IF NOT EXISTS afk_map_layout(id INTEGER PRIMARY KEY CHECK(id=1),version INTEGER NOT NULL);`);
  // SQLite views contain only schema definitions; replace the old union atomically.
  db.exec(`DROP VIEW IF EXISTS all_monster_combat_profiles;
    CREATE VIEW all_monster_combat_profiles AS SELECT * FROM monster_combat_profiles
      UNION ALL SELECT * FROM ancient_monster_combat_profiles UNION ALL SELECT * FROM afk_monster_combat_profiles;`);
  const profile=db.prepare(`INSERT OR IGNORE INTO afk_monster_combat_profiles
    (profile_key,area,family,variant,max_hp,hit_damage) VALUES(?,'afk',?,'normal',?,?)`);
  const insert=db.prepare(`INSERT OR IGNORE INTO monsters
    (id,name,x,y,hp,max_hp,respawn_at,variant,is_boss,spawn_round,area,channel,is_stone,summoned)
    VALUES(?,?,?,?,?,?,0,'normal',0,1,'afk',?,0,0)`);
  for(const spawn of AFK_SPAWNS){
   profile.run(`afk.${spawn.family}.normal`,spawn.family,spawn.hp,spawn.damage);
   for(let channel=1;channel<=3;channel++)insert.run(`${spawn.family}-afk-c${channel}-${spawn.slot}`,spawn.name,spawn.x,spawn.y,spawn.hp,spawn.hp,channel);
  }
  const layout=db.prepare('SELECT version FROM afk_map_layout WHERE id=1').get()?.version??0;
  if(layout<2){
   const move=db.prepare("UPDATE monsters SET x=?,y=? WHERE id=? AND area='afk'");
   for(const spawn of AFK_SPAWNS)for(let channel=1;channel<=3;channel++)
     move.run(spawn.x,spawn.y,`${spawn.family}-afk-c${channel}-${spawn.slot}`);
   db.prepare('INSERT INTO afk_map_layout(id,version) VALUES(1,2) ON CONFLICT(id) DO UPDATE SET version=2').run();
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
