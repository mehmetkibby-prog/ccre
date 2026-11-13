import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

test('native ordinary death applies the committed result without a cold actor read; replay grants nothing twice',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,localCombat:{hp:1},prepare:f=>createAdventureSchema(f.sql)}),{f,writer,world,supervisor,core,http,connect,faults}=s;
 await world.stopJobs();
 const ticket=await http('character',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket);
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='forest',x=2700,y=2025,hp=100000,max_hp=100000,xp=0,level=40,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),f.id));
 let fullReads=0,request,ack;const query=s.reader.query.bind(s.reader),command=writer.command.bind(writer);
 s.reader.query=(name,...args)=>{if(name==='kernel511_actor_world')fullReads++;return query(name,...args);};
 writer.command=async(peer,q)=>{const a=await command(peer,q);if(q.operation==='attack'){request={peer,q};ack=a;}return a;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-local-terminal511',spawnRound:17,ability:0,intentId:'r113-death'}}));
 const events=()=>live.packets.flatMap(p=>p.type==='event'?[p.payload?.event??p.payload]:p.events??[]);
 await until(()=>ack&&events().some(e=>e?.type==='monster_result'&&e.intentId==='r113-death'&&e.hits?.some(h=>h.killed))||faults.length,12000);
 assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 assert(events().some(e=>e?.type==='monster_result'&&e.hits?.some(h=>h.killed)),JSON.stringify(live.packets.slice(-6)));
 assert(ack.result.committedR113,JSON.stringify(ack.result.sharedRefresh));assert.equal(ack.result.committedR113.version,2,JSON.stringify({scope:request.q.payload.localScope,tables:ack.result.sharedRefresh,result:ack.result.result,hasEncounter:Object.hasOwn(ack.result,'engagement')}));assert.equal(ack.result.committedR113.actors.some(p=>p.image||p.bundle),false,'no full actor image');assert.equal(fullReads,0,'ordinary completion must not need a full snapshot');
 const before=f.sql.prepare('SELECT hp,xp,gems FROM players WHERE id=?').get(f.id),state=await combatState(supervisor.rows.get(4));assert.equal(state.players.find(p=>p.id===f.id).xp,before.xp);
 const replay=await command(request.peer,request.q);assert.deepEqual(replay.result.committedR113,ack.result.committedR113,'the exact delta is durable and replayable');assert.deepEqual(f.sql.prepare('SELECT hp,xp,gems FROM players WHERE id=?').get(f.id),before);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.q.operationId).n,1);
});
