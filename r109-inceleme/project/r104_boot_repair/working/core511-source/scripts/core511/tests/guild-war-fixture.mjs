import {put,update,json} from './pvp-fixture.mjs';
export {json,put,update};
export function seedGuildWar(f,{id='guild-war511',status='active',delta=0,a=4,b=2,home=3,channel=1,offline=false}={}){
 const nowMs=f.nowMs??f.clock(),now=Math.floor(nowMs/1000),sql=f.sql;
 for(const [n,player]of [[1,f.id],[2,f.targetId]])if(!sql.prepare('SELECT 1 FROM guilds WHERE id=?').get('war-guild-'+n)){
  update(sql,'players',player,{level:150,gems:500000});put(sql,'guilds',{id:'war-guild-'+n,name:'War Guild '+n,name_key:'war guild '+n,leader_id:player,created_at:now});
 }
 put(sql,'guild_wars',{id,challenger:'war-guild-1',defender:'war-guild-2',status:'active',expires_at:now+60,created_at:now});
 for(const guild of ['war-guild-1','war-guild-2'])put(sql,'guild_war_locks',{guild_id:guild,war_id:id});
 put(sql,'arena_matches',{id,mode:'1v1',team_size:1,status,world_cycle:1,channel,team_a_name:'War Guild 1',team_b_name:'War Guild 2',team_a_score:a,team_b_score:b,starts_at_ms:nowMs-(status==='waiting'?0:600000)+delta,created_at_ms:nowMs-601000,updated_at_ms:nowMs-601000,kill_target:999,reward_gems:0});
 for(const [i,player]of [f.id,f.targetId].entries()){
  update(sql,'players',player,{area:'arena',arena_match_id:id,channel,x:300+i,y:400,hp:1,max_hp:4321,respawn_at_ms:nowMs+2000,stun_until_ms:nowMs+3000,root_until_ms:nowMs+4000,last_seen:offline?1:now});
  put(sql,'arena_match_players',{id:'member-'+id+'-'+i,slot:1,joined_at_ms:nowMs-601000,match_id:id,player_id:player,team:i+1});
  put(sql,'guild_war_returns',{war_id:id,player_id:player,channel:home});
 }
 return id;
}
export const captureGuildDatabase=sql=>Object.fromEntries(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all().map(({name})=>[name,json(sql.prepare('SELECT * FROM '+JSON.stringify(name)).all())]));
