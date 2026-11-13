import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

for(const phase of ['before_commit','after_commit'])test('sole persistence worker exits '+phase+': receipt, reward and committed image stay atomic',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,localCombat:{hp:1},prepare:f=>createAdventureSchema(f.sql)}),{f,writer,core,world,http,connect}=s;
 await world.stopJobs();const ticket=await http('character',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket);
 await core.permanentPlayers([f.id],()=>f.sql.prepare("UPDATE players SET area='forest',x=2700,y=2025,hp=100000,max_hp=100000,xp=0,level=40,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),f.id));
 const worker=writer.rewardWorkerR533;assert(worker);await worker.lane.idle();
 if(worker.slot&&!worker.slot.ended){await worker.slot.worker.terminate();await worker.slot.exit;}
 const entry=worker.entry;worker.entry=new URL('./persistence-crash-worker-r113.mjs',import.meta.url);worker.workerOptions={workerData:{crashAt:phase}};
 t.after(()=>{worker.entry=entry;worker.workerOptions={};});
 const command=writer.command.bind(writer);let request,ack,error;
 writer.command=async(peer,q)=>{if(q.operation!=='attack')return command(peer,q);request={peer,q};try{return ack=await command(peer,q);}catch(e){error=e;throw e;}};
 const before=f.sql.prepare('SELECT xp,gems FROM players WHERE id=?').get(f.id);
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-local-terminal511',spawnRound:17,ability:0,intentId:'r113-worker-crash'}}));
 await until(()=>ack||error,20000);assert(request,'the native attack reached the writer');
 assert.equal(worker.slot.ended,true);assert.equal(await worker.slot.exit,98,'real worker exit at transaction boundary');
 const receipt=f.sql.prepare('SELECT * FROM kernel511_channel_receipts WHERE operation_id=?').get(request.q.operationId);
 const after=f.sql.prepare('SELECT xp,gems FROM players WHERE id=?').get(f.id);
 worker.entry=entry;worker.workerOptions={};
 if(phase==='before_commit'){
  assert.equal(error?.code,'reward_worker_rolled_back');assert.equal(receipt,undefined);assert.deepEqual(after,before);
  assert.equal(f.sql.prepare('SELECT revision FROM kernel511_actor_revision_r113 WHERE actor=?').get(f.id),undefined);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_committed_images_r113 WHERE operation_id=?').get(request.q.operationId).n,0);
  assert.equal(worker.stats.rollbacks,1);
 }else{
  assert.equal(error,undefined);assert(receipt);assert(after.xp>before.xp);assert(ack.result.committedR113);
  assert.equal(worker.stats.replays,1);
  const replay=await command(request.peer,request.q);assert.deepEqual(replay,ack);
  assert.deepEqual(f.sql.prepare('SELECT xp,gems FROM players WHERE id=?').get(f.id),after);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.q.operationId).n,1);
  assert.equal(f.sql.prepare('SELECT revision FROM kernel511_actor_revision_r113 WHERE actor=?').get(f.id).revision,1);
 }
 // A crash must not poison the persistence connection for unrelated players.
 await worker.prepare();assert.equal(worker.slot.ended,false);
 await core.database.atomic(sql=>sql.prepare('SELECT 1').get());
});
