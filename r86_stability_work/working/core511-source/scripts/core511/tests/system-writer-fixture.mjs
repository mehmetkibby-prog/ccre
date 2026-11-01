import {SystemWriter} from '../system-writer.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {createCombatCheckpointHandler} from '../combat-checkpoint.mjs';
import {native} from './helpers.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
export async function systemFixture(file,{initialize=true}={}){
 const db=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true}),authority=new ChannelOwnership(db,{realmId:'system-native'}),writer=new SystemWriter(db,{realmId:'system-native',authority});
 if(initialize){await authority.initialize();await writer.initialize();db.sqlite.exec(`
  CREATE TABLE monsters(id TEXT PRIMARY KEY,area TEXT,channel INTEGER,spawn_round INTEGER,is_boss INTEGER,is_stone INTEGER,max_hp INTEGER,hp INTEGER,last_damaged_at_ms INTEGER,last_regen_at_ms INTEGER,root_until_ms INTEGER,stun_until_ms INTEGER,control_x REAL,control_y REAL,wave_stage INTEGER);
  INSERT INTO monsters VALUES('shared','forest',0,1,0,0,100,50,0,0,0,0,0,0,0);
  INSERT INTO monsters SELECT 'local',area,4,spawn_round,is_boss,is_stone,max_hp,hp,last_damaged_at_ms,last_regen_at_ms,root_until_ms,stun_until_ms,control_x,control_y,wave_stage FROM monsters WHERE id='shared';
  CREATE TABLE monster_participants(monster_id TEXT,spawn_round INTEGER,player_id TEXT,created_at INTEGER,stone_damage476 INTEGER,stone_first_hit_at_ms476 INTEGER);
  CREATE TABLE boss_participants(boss_round INTEGER,player_id TEXT,hit_count INTEGER,total_damage INTEGER,created_at INTEGER);
  CREATE TABLE combat_events(player_id TEXT,target_id TEXT,role TEXT,ability INTEGER,created_at INTEGER);
 `);}
 writer.add('combat_checkpoint',createCombatCheckpointHandler({assertResources:(sql,p,c)=>p.monsters.every(r=>sql.prepare('SELECT channel FROM monsters WHERE id=?').get(r.current.id)?.channel===c.peer.channel)&&!p.participants.length&&!p.bossParticipants.length&&!p.combatEvents.length}));
 return {db,authority,writer};
}
