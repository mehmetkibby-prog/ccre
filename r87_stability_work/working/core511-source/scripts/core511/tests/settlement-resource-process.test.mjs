import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {until} from './helpers.mjs';
import {put} from './pvp-fixture.mjs';

import {controlled} from './settlement-process-fixture.mjs';

for(const action of ['use_potion','travel_market'])test('native '+action+' reads the real shared guardian control before settling an already due incoming hit',{timeout:30000},async t=>{
 const {f,live,reply,release,checkpointPending,faults,mid,controlled:control}=await controlled(t);try{
  live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action}}));await until(()=>reply(2)||checkpointPending()||faults.length,5000);release();await until(()=>reply(2)||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  if(action==='use_potion'){assert.equal(reply(2).status,200,JSON.stringify(reply(2)));assert.equal(reply(2).body.hp,700,'native stunned monster cannot hit before the potion');assert.equal(reply(2).body.potions,2);}
  else{assert.equal(reply(2).status,409);assert.equal(reply(2).body.error,'Savaş sürerken ışınlanamazsın. Birkaç saniye uzak durup tekrar dene.');assert.equal(f.sql.prepare('SELECT hp FROM players WHERE id=?').get(f.id).hp,500,'original travel rejection must not include a hit from the stunned monster');}
  assert.equal(f.sql.prepare('SELECT stun_until_ms FROM monsters WHERE id=?').get(mid).stun_until_ms,control.stun_until_ms);
 }finally{release();}
});

for(const phase of ['before','after'])test('actual '+phase+' COMMIT source SIGKILL preserves zero or one native potion after shared settlement',{timeout:45000},async t=>{
 const s=await controlled(t),{f,writer,world,core,supervisor,live,ticket,old,faults,release,checkpointPending}=s,source=supervisor.rows.get(ticket.channel),execute=writer.authority.operations.native_action.execute,command=writer.command.bind(writer);let killed=false,observed=null;const inspect=()=>({...f.sql.prepare('SELECT potions,hp FROM players WHERE id=?').get(f.id)});
 writer.authority.operations.native_action.execute=(...args)=>{const result=execute(...args);if(args[1].payload.input.action==='use_potion'&&phase==='before'&&!killed){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('settlement_potion_before_commit'),{code:'settlement_potion_before_commit'});}return result;};
 writer.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.operation==='native_action'&&request.payload.input.action==='use_potion'&&phase==='after'&&!killed){killed=true;observed=inspect();source.child.kill('SIGKILL');throw Object.assign(Error('settlement_potion_ack_lost'),{code:'settlement_potion_ack_lost'});}return ack;}catch(error){if(error.code==='settlement_potion_before_commit')observed=inspect();throw error;}};
 try{
  live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'use_potion'}}));await until(()=>checkpointPending()||observed||faults.length,5000);release();await until(()=>observed,9000);assert.deepEqual(observed,phase==='before'?{potions:3,hp:500}:{potions:2,hp:700});
  await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);assert(old.every(r=>r.exited));assert.equal(source.child.signalCode,'SIGKILL');assert.equal(inspect().potions,phase==='before'?3:2);assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
 }finally{release();}
});

test('local C4 potion holds the due native monster lane through durable ACK without taking the shared barrier',{timeout:30000},async t=>{
 const s=await setup(t,{shared:true,localCombat:{hp:1000000}}),{f,core,world,writer,supervisor,http,connect,faults}=s;await world.stopJobs();assert.equal((await http('ticket')).status,200);const ticket=await http('transfer',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket),mid='golge-local-terminal511';let due;
 await core.permanentPlayers([f.id],()=>{
  f.sql.prepare("UPDATE players SET role='muhafiz',area='forest',x=2700,y=2025,level=50,hp=500,max_hp=1000,potions=3,skill_two=5,attack_two_at=0,stun_until_ms=0,root_until_ms=0 WHERE id=?").run(f.id);f.sql.prepare('DELETE FROM player_items WHERE player_id=?').run(f.id);
  due=f.clock()+1100;put(f.sql,'pve_engagements',{player_id:f.id,monster_id:mid,spawn_round:17,next_hit_at_ms:due,expires_at_ms:due+8000,hit_sequence:0,last_skill_at_ms:due-1100,updated_at_ms:due-1100,attackers489:JSON.stringify({[mid]:{monster_id:mid,spawn_round:17,next_hit_at_ms:due,last_skill_at_ms:due-1100}})});
 });
 const reply=sequence=>live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===sequence),command=writer.command.bind(writer);let release,committed=false,resources;const gate=new Promise(r=>release=r);
 writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&request.payload.input.action==='use_potion'){committed=true;resources=request.payload.resources;assert(!request.payload.sharedLease);await gate;}return ack;};
 try{
  live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:mid,spawnRound:17,ability:1,intentId:'native-local-control-before-potion'}}));await until(()=>reply(1)||faults.length,7000);assert.equal(reply(1)?.status,200,JSON.stringify(reply(1)));await until(()=>f.clock()>=due,3000);
  live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'use_potion'}}));await until(()=>committed||faults.length,7000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(committed);assert(resources.includes('monster:'+mid));assert.equal(reply(2),undefined);
  const state=await combatState(supervisor.rows.get(4)),actor=state.players.find(p=>p.id===f.id);assert(state.lanes.includes('monster:'+mid));assert(actor.barrier);assert.equal(actor.potions,3);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);assert(!world.combat.busy);assert(!world.global.held);
  release();await until(()=>reply(2)||faults.length,7000);assert.equal(reply(2)?.status,200,JSON.stringify(reply(2)));assert.equal(reply(2).body.hp,700);assert.equal(reply(2).body.potions,2);assert(!(await combatState(supervisor.rows.get(4))).lanes.includes('monster:'+mid));assert.equal(faults.length,0);
 }finally{release();}
});
