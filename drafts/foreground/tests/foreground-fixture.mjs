import {DatabaseSync} from 'node:sqlite';

export const root=new URL('../r80-work/',import.meta.url);
export const core=new URL('core511-source/scripts/core511/',root);
export const NOW=1800000000000;
export const input=(id='dunya-bosu-1',spawnRound=7)=>({action:'claim_rewards',rewardTargets:[{id,spawnRound}]});
export function schema(sql){
 sql.exec(`
 CREATE TABLE players(id TEXT PRIMARY KEY,name TEXT,account_id TEXT,area TEXT DEFAULT 'sanctum',channel INTEGER DEFAULT 1,
  arena_match_id TEXT DEFAULT '',role TEXT DEFAULT 'avci',level INTEGER DEFAULT 1,drop_charm_until INTEGER DEFAULT 0,
  hp INTEGER DEFAULT 100,max_hp INTEGER DEFAULT 100,last_seen INTEGER DEFAULT 1800000000,movement_checked_at_ms INTEGER DEFAULT 0,
  last_monster_hit_at INTEGER DEFAULT 0,x REAL DEFAULT 0,y REAL DEFAULT 0,xp INTEGER DEFAULT 0,gems INTEGER DEFAULT 0,
  xp_ring_until INTEGER DEFAULT 0,is_gm INTEGER DEFAULT 0,rank_tier INTEGER DEFAULT 0,battle_pass_xp INTEGER DEFAULT 0,
  battle_pass_season TEXT DEFAULT '',halloween_candy_until INTEGER DEFAULT 0,arena_exp_until INTEGER DEFAULT 0,loadlab_run_id TEXT DEFAULT '');
 CREATE TABLE world_state(id INTEGER PRIMARY KEY,cycle INTEGER);INSERT INTO world_state VALUES(1,1);
 CREATE TABLE game_settings(id INTEGER PRIMARY KEY,xp_curve_json TEXT,expansion65_enabled INTEGER,expansion65_preview_player_id TEXT);
 INSERT INTO game_settings VALUES(1,'[1000000,1000000,1000000]',0,'');
 CREATE TABLE battle_pass_settings(id INTEGER PRIMARY KEY,season_id TEXT,xp_cap INTEGER,enabled INTEGER,starts_at INTEGER,ends_at INTEGER);
 INSERT INTO battle_pass_settings VALUES(1,'',1000000,0,0,0);
 CREATE TABLE party_members(player_id TEXT PRIMARY KEY,party_id TEXT);
 CREATE TABLE dungeon_members(player_id TEXT PRIMARY KEY,run_id TEXT);
 CREATE TABLE player_items(player_id TEXT,kind TEXT,equipped INTEGER,item_name TEXT,rarity TEXT,power INTEGER,role TEXT,enchantments TEXT,expires_at_ms INTEGER,premium_origin INTEGER);
 CREATE TABLE player_pets(player_id TEXT,kind TEXT,equipped INTEGER,acquired_at INTEGER);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,hp INTEGER,spawn_round INTEGER,channel INTEGER);
 CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT,created_at INTEGER DEFAULT 1,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE boss_participants(boss_round INTEGER,player_id TEXT,total_damage INTEGER,created_at INTEGER DEFAULT 1,PRIMARY KEY(boss_round,player_id));
 CREATE TABLE loadlab_boss_rounds_v1(monster_id TEXT,boss_round INTEGER);
 CREATE TABLE boss_defeats(boss_round INTEGER PRIMARY KEY,x REAL DEFAULT 0,y REAL DEFAULT 0,xp_reward INTEGER DEFAULT 100,events_snapshot TEXT DEFAULT '{}',loot_source_key TEXT DEFAULT 'boss.world',loot_profile_revision INTEGER DEFAULT 0,loot_profile_json TEXT DEFAULT '',pearls_retired INTEGER DEFAULT 0);
 CREATE TABLE sinsi_defeats(monster_id TEXT,spawn_round INTEGER,defeated_at INTEGER DEFAULT 1,x REAL DEFAULT 0,y REAL DEFAULT 0,xp_reward INTEGER DEFAULT 100,events_snapshot TEXT DEFAULT '{}',loot_source_key TEXT DEFAULT 'sinsi.stone',loot_profile_revision INTEGER DEFAULT 0,loot_profile_json TEXT DEFAULT '',pearls_retired INTEGER DEFAULT 0,PRIMARY KEY(monster_id,spawn_round));
 CREATE TABLE boss_reward_claims(boss_round INTEGER,player_id TEXT,claim_token TEXT,awarded_at INTEGER,PRIMARY KEY(boss_round,player_id));
 CREATE TABLE sinsi_reward_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,claim_token TEXT,awarded_at INTEGER,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE normal_reward_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,claim_token TEXT,awarded_at INTEGER,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE monster_xp_claims(monster_id TEXT,spawn_round INTEGER,player_id TEXT,claim_token TEXT,awarded_at INTEGER,PRIMARY KEY(monster_id,spawn_round,player_id));
 CREATE TABLE world_drops(id TEXT PRIMARY KEY,owner_id TEXT,monster_id TEXT,kind TEXT,item_name TEXT,rarity TEXT,power INTEGER,amount INTEGER,role TEXT,enchantments TEXT,x REAL,y REAL,expires_at INTEGER,collectible_at INTEGER);
 `);
}
export function addPlayer(sql,id,channel=1){sql.prepare('INSERT INTO players(id,name,account_id,channel) VALUES(?,?,?,?)').run(id,id,'account-'+id,channel);}
export function boss(sql,ids=['p1'],round=7){
 sql.prepare('INSERT INTO boss_defeats(boss_round) VALUES(?)').run(round);
 ids.forEach((id,i)=>{sql.prepare('INSERT INTO boss_participants(boss_round,player_id,total_damage) VALUES(?,?,?)').run(round,id,100-i);sql.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id) VALUES(?,?,?)').run('dunya-bosu-1',round,id);});
}
export function stone(sql,ids=['p1'],id='sinsi-tasi-2-1',round=7){
 sql.prepare('INSERT INTO sinsi_defeats(monster_id,spawn_round) VALUES(?,?)').run(id,round);
 for(const actor of ids)sql.prepare('INSERT INTO monster_participants(monster_id,spawn_round,player_id) VALUES(?,?,?)').run(id,round,actor);
}
export function fixture(t){const sql=new DatabaseSync(':memory:');schema(sql);t.after(()=>sql.close());for(let i=1;i<=10;i++)addPlayer(sql,'p'+i,Math.min(4,Math.ceil(i/3)));return {sql};}
