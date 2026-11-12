import {extendLevelCosts} from '../../lib/level-progression.mjs';
import {ANCIENT_FAMILIES,ANCIENT_SPAWNS} from '../../lib/expansion65.mjs';
import {ANCIENT_BOSS_SPAWN} from '../../lib/ancient-core.mjs';
export function ensureExpansion65CombatSchema(db){
 db.exec(`CREATE TABLE IF NOT EXISTS ancient_monster_combat_profiles(
  profile_key TEXT PRIMARY KEY,area TEXT NOT NULL CHECK(area='ancient'),
  family TEXT NOT NULL CHECK(family IN ('golge','curuk','yutan')),
  variant TEXT NOT NULL CHECK(variant='normal'),max_hp INTEGER NOT NULL CHECK(max_hp BETWEEN 1 AND 10000000),
  hit_damage INTEGER NOT NULL CHECK(hit_damage BETWEEN 1 AND 1000000),updated_at INTEGER NOT NULL DEFAULT 0,
  CHECK(profile_key=area||'.'||family||'.'||variant));
  CREATE VIEW IF NOT EXISTS all_monster_combat_profiles AS SELECT * FROM monster_combat_profiles UNION ALL SELECT * FROM ancient_monster_combat_profiles;`);
}
export function ensureExpansion65(db){
 db.exec('BEGIN IMMEDIATE');
 try {
  const columns=new Set(db.prepare('PRAGMA table_info(game_settings)').all().map(r=>r.name));
  const first=!columns.has('expansion65_enabled');
  if(first)db.exec('ALTER TABLE game_settings ADD COLUMN expansion65_enabled INTEGER NOT NULL DEFAULT 0');
  if(!columns.has('expansion65_preview_player_id'))db.exec("ALTER TABLE game_settings ADD COLUMN expansion65_preview_player_id TEXT NOT NULL DEFAULT ''");
  if(!columns.has('expansion65_revision'))db.exec('ALTER TABLE game_settings ADD COLUMN expansion65_revision INTEGER NOT NULL DEFAULT 0');
  // Select automatically only when there is exactly one already-appointed GM.
  if(first)db.exec("UPDATE game_settings SET expansion65_preview_player_id=COALESCE((SELECT MAX(id) FROM players WHERE is_gm=1 HAVING COUNT(*)=1),'') WHERE id=1");
  const combat=new Set(db.prepare('PRAGMA table_info(combat_settings)').all().map(r=>r.name));
  for(const type of ANCIENT_FAMILIES){const key=`ancient_${type.family}_xp_reward`;if(!combat.has(key))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${key} INTEGER NOT NULL DEFAULT ${type.xp}`);}
  if(!combat.has('ancient_monster_respawn_seconds'))db.exec('ALTER TABLE combat_settings ADD COLUMN ancient_monster_respawn_seconds INTEGER NOT NULL DEFAULT 25');
  for(const [key,sql] of [
   ['ancient_boss_enabled','INTEGER NOT NULL DEFAULT 1'],
   ['ancient_boss_hp','INTEGER NOT NULL DEFAULT 26000'],
   ['ancient_boss_damage_scale','REAL NOT NULL DEFAULT 0.42'],
   ['ancient_boss_respawn_seconds','INTEGER NOT NULL DEFAULT 2400'],
   ['ancient_boss_xp_reward','INTEGER NOT NULL DEFAULT 500'],
   ['ancient_boss_reward_gems','INTEGER NOT NULL DEFAULT 12'],
  ])if(!combat.has(key))db.exec(`ALTER TABLE combat_settings ADD COLUMN ${key} ${sql}`);
  const current=db.prepare('SELECT xp_curve_json FROM game_settings WHERE id=1').get();
  if(!current)throw new Error('Missing game settings');
  const costs=JSON.parse(current.xp_curve_json),extended=extendLevelCosts(costs);
  if(costs.length!==extended.length)db.prepare('UPDATE game_settings SET xp_curve_json=? WHERE id=1').run(JSON.stringify(extended));
  ensureExpansion65CombatSchema(db);
  // Additive only: no player XP, equipment, old monster or custom profile writes.
  for(const type of ANCIENT_FAMILIES)db.prepare(`INSERT OR IGNORE INTO ancient_monster_combat_profiles(profile_key,area,family,variant,max_hp,hit_damage,updated_at) VALUES(?,'ancient',?,'normal',?,?,0)`).run(`ancient.${type.family}.normal`,type.family,type.hp,type.damage);
  const insert=db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round) VALUES(?,?,?,?,?,?,'normal','ancient',?,0,0,0,0,1)`);
  for(let channel=1;channel<=3;channel++)for(const spawn of ANCIENT_SPAWNS)insert.run(`${spawn.family}-ancient-c${channel}-${spawn.slot}`,spawn.name,spawn.x,spawn.y,spawn.hp,spawn.hp,channel);
  db.prepare(`INSERT OR IGNORE INTO monsters(id,name,x,y,hp,max_hp,variant,area,channel,is_boss,is_stone,summoned,respawn_at,spawn_round)
    VALUES('ancient-boss-1','Kadim Kökün Muhafızı',?,?,0,26000,'ancient_boss','ancient',0,0,0,0,unixepoch()+2400,1)`)
    .run(ANCIENT_BOSS_SPAWN.x,ANCIENT_BOSS_SPAWN.y);
  // Relocate only untouched v335 spawn coordinates; preserve combat state,
  // custom balance, drops, current equipment and every existing monster ID.
  const relocate=db.prepare("UPDATE monsters SET x=?,y=? WHERE id=? AND area='ancient' AND x=? AND y=?");
  const oldClearings=[{x:1150,y:940},{x:2470,y:1680},{x:1170,y:2340}];
  for(let channel=1;channel<=3;channel++)for(const spawn of ANCIENT_SPAWNS){
   const index=spawn.slot-1,group=Math.floor(index/9),i=index%9,center=oldClearings[group],angle=i*Math.PI*2/9;
   relocate.run(spawn.x,spawn.y,`${spawn.family}-ancient-c${channel}-${spawn.slot}`,
    Math.round(center.x+Math.cos(angle)*410),Math.round(center.y+Math.sin(angle)*330));
  }
  db.exec('COMMIT');
 }catch(error){db.exec('ROLLBACK');throw error;}
}
