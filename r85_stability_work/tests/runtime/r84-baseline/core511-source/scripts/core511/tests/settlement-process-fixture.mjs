import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';

// Original real guardian cast and uncheckpointed shared control fixture.
export async function controlled(t,{beforeCombat=null}={}){
 const s=await setup(t,{shared:true,sharedCombat:{playerHp:1000}}),{f,core,writer,world,supervisor,http,connect,faults}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),mid='shared-process511';let due;
 if(beforeCombat)await beforeCombat({...s,ticket,live});
 await core.permanentPlayers([f.id],()=>{
  f.sql.prepare("UPDATE players SET role='muhafiz',level=50,hp=500,max_hp=1000,potions=3,skill_two=5,attack_two_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id);f.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(f.id);
  due=f.clock()+1100;const entry={monster_id:mid,spawn_round:1,next_hit_at_ms:due,last_skill_at_ms:due-1100};f.sql.prepare('INSERT INTO pve_engagements(player_id,monster_id,spawn_round,next_hit_at_ms,expires_at_ms,hit_sequence,last_skill_at_ms,updated_at_ms,attackers489) VALUES(?,?,?,?,?,0,?,?,?) ON CONFLICT(player_id) DO UPDATE SET monster_id=excluded.monster_id,spawn_round=excluded.spawn_round,next_hit_at_ms=excluded.next_hit_at_ms,expires_at_ms=excluded.expires_at_ms,hit_sequence=0,last_skill_at_ms=excluded.last_skill_at_ms,updated_at_ms=excluded.updated_at_ms,attackers489=excluded.attackers489').run(f.id,mid,1,due,due+8000,due-1100,due-1100,JSON.stringify({[mid]:entry}));
 });
 let release,checkpointPending=false,released=false;const gate=new Promise(r=>release=()=>{released=true;r();}),command=writer.system.command.bind(writer.system);writer.system.command=async(peer,request)=>{if(peer.channel===0&&request.kind==='combat_checkpoint'&&request.payload.monsters.some(p=>p.current.id===mid&&p.current.stun_until_ms>0)&&!released){checkpointPending=true;await gate;}return command(peer,request);};
 const reply=sequence=>live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence);
 try{
  live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:mid,spawnRound:1,ability:1,intentId:'native-shared-control-before-potion'}}));await until(()=>reply(1)||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(reply(1).status,200,JSON.stringify(reply(1)));
  await until(()=>f.clock()>=due,3000);const controlled=world.monsters.get(mid);assert(controlled.stun_until_ms>f.clock(),'fixture requires the native active two-second guardian stun');assert.equal(f.sql.prepare('SELECT stun_until_ms FROM monsters WHERE id=?').get(mid).stun_until_ms,0,'shared control has not yet checkpointed');
  const before=(await combatState(supervisor.rows.get(ticket.channel))).players.find(p=>p.id===f.id).hp;assert.equal(before,500);
  return {...s,ticket,live,mid,controlled,reply,release,checkpointPending:()=>checkpointPending,old:[world.row,...supervisor.rows.values()]};
 }catch(error){release();throw error;}
}
