import {put,update} from './pvp-fixture.mjs';

export function seedHeartbeatRewards(f,{bosses=2,stones=5,normals=7}={}){
 const {sql,id,nowMs}=f,now=Math.floor(nowMs/1000);
 update(sql,'players',id,{area:'forest',channel:1,hp:1000,max_hp:1000,level:40,last_seen:now});
 for(let n=0;n<bosses;n++){
  const round=8000+n;put(sql,'boss_defeats',{boss_round:round,defeated_at:now,x:1000,y:1000,xp_reward:10});
  put(sql,'boss_participants',{boss_round:round,player_id:id,total_damage:100,hit_count:1,created_at:now});
  put(sql,'monster_participants',{monster_id:'dunya-bosu-1',spawn_round:round,player_id:id,created_at:now});
 }
 for(const [kind,count]of [['stone',stones],['normal',normals]])for(let n=0;n<count;n++){
  const monster=(kind==='stone'?'sinsi-tasi-':'golge-')+'heartbeat-'+n;
  put(sql,kind==='stone'?'sinsi_defeats':'normal_defeats',{monster_id:monster,spawn_round:1,defeated_at:now,x:1000,y:1000,xp_reward:10,...(kind==='normal'?{essence_min:2,essence_span:3}:{})});
  put(sql,'monster_participants',{monster_id:monster,spawn_round:1,player_id:id,created_at:now,stone_damage476:100});
 }
}
export function heartbeatDescriptor(f){const p=f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id);return {actor:f.id,epoch:1,counter:1,cycle:f.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle,nowMs:f.nowMs,heartbeat:Object.fromEntries(['hp','max_hp','hp_revision','respawn_at_ms','area','channel','arena_match_id'].map(k=>[k,p[k]]))};}
