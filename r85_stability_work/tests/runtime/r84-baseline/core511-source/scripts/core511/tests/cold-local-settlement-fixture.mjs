import assert from 'node:assert/strict';
import {setup,extraPlayer} from './process-fixture.mjs';
import {put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';

export async function localSettlement(t){
 const s=await setup(t,{shared:true,localCombat:{hp:1000000}}),{f,core,world,writer,http,connect,faults}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),guest=extraPlayer(s,65),mid='golge-local-terminal511';
 await core.permanentPlayers([guest.id],()=>f.sql.prepare("UPDATE players SET area='bazaar',combat_lock_until_ms=0 WHERE id=?").run(guest.id));assert.equal((await guest.http()).status,200);const guestTicket=await guest.http('transfer',{channel:4});assert.equal(guestTicket.status,200,JSON.stringify(guestTicket));guest.live=await connect(guestTicket);let due;
 await core.permanentPlayers([f.id,guest.id],()=>{
  for(const id of [f.id,guest.id]){f.sql.prepare("UPDATE players SET area='forest',role='muhafiz',x=2700,y=2025,level=50,hp=?,max_hp=1000000,skill_two=5,attack_two_at=0,stun_until_ms=0,root_until_ms=0,combat_lock_until_ms=? WHERE id=?").run(id===f.id?500:1000000,id===f.id?f.clock()+8000:0,id);f.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);}
  due=f.clock()+1100;put(f.sql,'pve_engagements',{player_id:f.id,monster_id:mid,spawn_round:17,next_hit_at_ms:due,expires_at_ms:due+8000,hit_sequence:0,last_skill_at_ms:due-1100,updated_at_ms:due-1100,attackers489:JSON.stringify({[mid]:{monster_id:mid,spawn_round:17,next_hit_at_ms:due,last_skill_at_ms:due-1100}})});
 });
 let release,checkpointPending=false,released=false;const gate=new Promise(r=>release=()=>{released=true;r();}),command=writer.system.command.bind(writer.system);
 writer.system.command=async(peer,request)=>{if(peer.channel===4&&request.kind==='combat_checkpoint'&&request.payload.monsters.some(p=>p.current.id===mid&&p.current.stun_until_ms>0)&&!released){checkpointPending=true;await gate;}return command(peer,request);};
 const stun=async()=>{guest.live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:mid,spawnRound:17,ability:1,intentId:'cold-local-guardian-control'}}));await until(()=>guest.live.packets.some(p=>p.results?.some(r=>r.sequence===1))||faults.length,7000);const reply=guest.live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(reply?.status,200,JSON.stringify(reply));await until(()=>f.clock()>=due,3000);assert.equal(f.sql.prepare('SELECT stun_until_ms FROM monsters WHERE id=?').get(mid).stun_until_ms,0);};
 return {...s,ticket,live,guest,mid,due,release,checkpointPending:()=>checkpointPending,stun,old:[world.row,...s.supervisor.rows.values()]};
}

export async function localJoin(t){
 const s=await localSettlement(t);assert.equal((await s.http('logout')).status,200);
 await s.core.permanentPlayers([s.f.id],()=>s.f.sql.prepare('UPDATE players SET combat_lock_until_ms=0 WHERE id=?').run(s.f.id));
 await s.stun();return s;
}
