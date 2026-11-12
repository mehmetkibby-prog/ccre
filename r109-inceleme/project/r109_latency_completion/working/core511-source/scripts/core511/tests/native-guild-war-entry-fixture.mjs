import assert from 'node:assert/strict';
import {villageFixture} from './native-guild-village-fixture.mjs';
import {extraPlayer} from './process-fixture.mjs';
import {membershipHandler} from './native-guild-membership-fixture.mjs';
export async function guildWarEntryFixture(t){
 const s=await villageFixture(t),extras=[81,82,83].map(index=>({...extraPlayer(s,index),index}));
 await s.host.database.atomic(()=>{for(const p of extras)globalThis.__colLaunch.grant('shared-account-'+p.index,true);});
 for(const [n,p]of extras.entries()){assert.equal((await p.http()).status,200);p.ticket=await p.http('transfer',{channel:[3,1,2][n]});assert.equal(p.ticket.status,200,JSON.stringify(p.ticket));p.live=await s.connect(p.ticket);}
 const players=[{id:s.f.id,index:null},{id:s.guest.id,index:71},{id:s.observer.id,index:72},...extras];
 await s.core.nativeConfiguration.run([],()=>{
  for(const p of players)s.f.sql.prepare("UPDATE players SET area='bazaar',x=1200,y=920,hp=max_hp,combat_lock_until_ms=0,root_until_ms=0,stun_until_ms=0,last_seen=?,level=65,gems=1000000 WHERE id=?").run(Math.floor(s.f.clock()/1000),p.id);
  s.f.sql.prepare("DELETE FROM pve_engagements WHERE player_id IN (?,?,?,?,?,?)").run(...players.map(p=>p.id));
  s.f.sql.prepare('INSERT INTO guilds(id,name,name_key,leader_id,created_at) VALUES(?,?,?,?,1)').run('http-war-b511','Guild War B','guild war b',extras[0].id);
  for(const [list,gid]of [[players.slice(0,3),'http-revoke511'],[extras,'http-war-b511']])for(const p of list)s.f.sql.prepare('INSERT INTO guild_members(player_id,guild_id,joined_at) VALUES(?,?,1) ON CONFLICT(player_id) DO UPDATE SET guild_id=excluded.guild_id').run(p.id,gid);
 });
 const handler=membershipHandler(s);
 function request(p,body){if(p.index===null)return s.f.request({path:'/api/guild',body});const token='shared-native-session-'+String(p.index).repeat(40),csrf='shared-native-csrf-'+String(p.index).repeat(40),instance=s.f.sql.prepare('SELECT instance_id FROM game_presence WHERE account_id=?').get('shared-account-'+p.index).instance_id;return new Request(s.f.origin+'/api/guild',{method:'POST',headers:{Origin:s.f.origin,Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf,'X-Game-Instance':instance,'Content-Type':'application/json'},body:JSON.stringify(body)});}
 const respond=(p,body)=>handler(request(p,body));
 const call=async(p,body)=>{const response=await respond(p,body),value=await response.json();assert.equal(response.status,200,JSON.stringify({body,value}));return value;};
 return {...s,players,extras,request,handler,respond,call};
}
export async function prepareKickoff(s){
 await s.call(s.players[0],{action:'challenge',target:'http-war-b511'});
 const war=s.f.sql.prepare("SELECT id FROM guild_wars WHERE challenger='http-revoke511' AND defender='http-war-b511'").get();assert(war);
 await s.call(s.extras[0],{action:'war_accept',id:war.id});
 for(const p of [s.players[1],s.players[2],s.extras[1]])await s.call(p,{action:'war_join',id:war.id});
 return {war,actor:s.extras[2],body:{action:'war_join',id:war.id}};
}
