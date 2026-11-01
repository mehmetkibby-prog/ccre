import {mountEnabled} from './mounts-model.mjs';
import {createMountDropSchemaR55} from './mount-drops-r55.mjs';
import {migrateMountMaterialsR60} from './mount-materials-r60.mjs';
export function createMountSchema(sql,{enabled=mountEnabled()}={}){
 if(!enabled)return;
 sql.exec(`CREATE TABLE IF NOT EXISTS mount_profiles_r49(
 player_id TEXT PRIMARY KEY,active INTEGER NOT NULL DEFAULT 0 CHECK(active IN(0,1)),variant TEXT NOT NULL DEFAULT '',selected TEXT NOT NULL DEFAULT '',
 started_at_ms INTEGER NOT NULL DEFAULT 0,cycle INTEGER NOT NULL DEFAULT 0,crafted INTEGER NOT NULL DEFAULT 0 CHECK(crafted IN(0,1)),
 challenge_id TEXT NOT NULL DEFAULT '',challenge_step INTEGER NOT NULL DEFAULT 0,challenge_target_ms INTEGER NOT NULL DEFAULT 0,challenge_expires_ms INTEGER NOT NULL DEFAULT 0,
 challenge_hp_revision INTEGER NOT NULL DEFAULT 0,challenge_attack_state TEXT NOT NULL DEFAULT '[]');
 CREATE TABLE IF NOT EXISTS mount_inventory_r49(player_id TEXT NOT NULL,kind TEXT NOT NULL,amount INTEGER NOT NULL CHECK(amount>=0 AND amount<=50),PRIMARY KEY(player_id,kind));
 CREATE TABLE IF NOT EXISTS mount_unlocks_r49(player_id TEXT NOT NULL,kind TEXT NOT NULL,unlocked_at_ms INTEGER NOT NULL,PRIMARY KEY(player_id,kind));
 CREATE TABLE IF NOT EXISTS mount_receipts_r49(scope TEXT NOT NULL,request_id TEXT NOT NULL,operation TEXT NOT NULL,result TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(scope,request_id));
 CREATE TABLE IF NOT EXISTS mount_reward_claims_r49(player_id TEXT NOT NULL,cycle INTEGER NOT NULL,reward_key TEXT NOT NULL,created_at_ms INTEGER NOT NULL,PRIMARY KEY(player_id,cycle,reward_key));
 CREATE INDEX IF NOT EXISTS mount_profiles_active_r49 ON mount_profiles_r49(active,player_id);`);
 createMountDropSchemaR55(sql);
 migrateMountMaterialsR60(sql);
}
