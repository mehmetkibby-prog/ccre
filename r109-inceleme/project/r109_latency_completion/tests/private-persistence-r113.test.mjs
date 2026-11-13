import test from 'node:test';
import assert from 'node:assert/strict';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {setup,extraPlayer} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
import {privateCombatWriteR113} from '../working/core511-source/scripts/core511/persistence-scope-r113.mjs';

test('private persistence admission excludes economic transitions and unbounded claims',()=>{
 const q=input=>({operation:'native_action',payload:{input}});
 assert(privateCombatWriteR113(q({action:'use_potion'})));
 assert(!privateCombatWriteR113({operation:'native_action',payload:{input:{action:'use_potion'},batchPotionsR61:[]}}));
 assert(privateCombatWriteR113(q({action:'claim_rewards',rewardTargets:[{id:'x',spawnRound:1}]})));
 for(const action of ['trade','collect','guild','equip','donate','dungeon'])assert(!privateCombatWriteR113(q({action})));
 assert(!privateCombatWriteR113(q({action:'claim_rewards',rewardTargets:Array(11).fill({id:'x',spawnRound:1})})));
});

test('simultaneous potions retain native batch guards and settle both actors exactly once',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,writer,world,http,connect,supervisor,faults}=s;
 await world.stopJobs();const other=extraPlayer(s,711),ids=[f.id,other.id];
 const a=await http('character',{channel:4}),b=await other.http('character',{channel:4});
 assert.equal(a.status,200);assert.equal(b.status,200);
 const clients=[await connect(a),await connect(b)];
 await core.permanentPlayers(ids,()=>{for(const id of ids)f.sql.prepare("UPDATE players SET area='forest',x=2700,y=2025,hp=100,max_hp=100000,potions=5,level=40,combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.clock()/1000),id);});
 const original=writer.command.bind(writer);let record,error;
 writer.command=async(peer,q)=>{
  if(!q.payload.batchPotionsR61)return original(peer,q);
  try{const ack=await original(peer,q);record={peer,q,ack};return ack;}catch(e){error=e;throw e;}
 };
 const workerJobs=writer.rewardWorkerR533.stats.jobs;
 supervisor.rows.get(4).child.send({type:'test-potion-burst-r113',request:'potion-regression',actors:ids});
 await until(()=>record||error||faults.length,10000);
 assert.equal(error,undefined,error?.stack);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));assert(record,'the real channel must form a native potion batch');
 assert.equal(record.q.payload.batchPotionsR61.length,2);
 assert.equal(writer.rewardWorkerR533.stats.jobs,workerJobs,'multi-actor potion policy remains in its original guarded writer');
 const state=()=>ids.map(id=>f.sql.prepare('SELECT hp,potions FROM players WHERE id=?').get(id));
 const after=state();for(const p of after){assert(p.hp>100);assert.equal(p.potions,4);}
 assert.equal(f.sql.prepare('SELECT count(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(record.q.operationId).n,1);
 await original(record.peer,record.q);assert.deepEqual(state(),after,'replay cannot consume a second potion');
 for(const client of clients)await until(()=>client.packets.some(p=>(p.results??[]).some(r=>r.sequence===1)),10000);
 for(const client of clients)client.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'heartbeat'}}));
 for(const client of clients)await until(()=>client.packets.some(p=>(p.results??[]).some(r=>r.sequence===2)),10000);
 assert.equal(faults.length,0);assert.equal(writer.rewardWorkerR533.stats.jobs,workerJobs);
});

for(const area of ['forest','black','rune_v2'])test(area+': native claim and potion persist in sole worker and replay exactly once',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,localCombat:{hp:1,area},prepare:f=>createAdventureSchema(f.sql)}),{f,writer,core,world,http,connect,faults}=s;
 await world.stopJobs();const ticket=await http('character',{channel:4});assert.equal(ticket.status,200);const live=await connect(ticket);
 await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET area=?,x=2700,y=2025,hp=100,max_hp=100000,potions=4,xp=0,level=40,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0,last_seen=? WHERE id=?').run(area,Math.floor(f.clock()/1000),f.id));
 const original=writer.command.bind(writer),records=[];let staleEncounter=false;
 writer.command=async(peer,q)=>{
  if(staleEncounter&&q.payload.input?.action==='use_potion'){
   staleEncounter=false;assert(q.payload.claimActorsR56,'exercise the actual joined journal');
   await core.database.atomic(sql=>{
    const now=q.payload.receivedAtMs,mid='golge-r113-stale',entry={monster_id:mid,spawn_round:1,next_hit_at_ms:now-1,last_skill_at_ms:now-2000};
    sql.prepare('INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round) VALUES(?,?,?,?,?,?,?,?,?)').run(mid,'Stale journal fixture',area,4,2700,2025,100,100,1);
    sql.prepare('INSERT OR REPLACE INTO pve_engagements(player_id,monster_id,spawn_round,next_hit_at_ms,last_skill_at_ms,expires_at_ms,hit_sequence,updated_at_ms,attackers489) VALUES(?,?,?,?,?,?,?,?,?)').run(f.id,mid,1,now-1,now-2000,now+8000,0,now,JSON.stringify({[mid]:entry}));
   });
  }
  const ack=await original(peer,q);if(['attack','native_action'].includes(q.operation))records.push({peer,q,ack});return ack;
 };
 let sequence=0;
 async function send(payload){
  const start=records.length;live.ws.send(JSON.stringify({type:'input',sequence:++sequence,payload}));
  await until(()=>records.length>start||faults.length,15000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
  const row=records[start];assert(row);await until(()=>live.packets.some(p=>(p.results??[]).some(r=>r.sequence===sequence))||faults.length,10000);return row;
 }
 await send({action:'attack',targetId:'golge-local-terminal511',spawnRound:17,ability:0,intentId:'r113-private-'+area});
 assert.equal(f.sql.prepare("SELECT hp FROM monsters WHERE id='golge-local-terminal511'").get().hp,0);
 const worker=writer.rewardWorkerR533;
 for(const input of [{action:'claim_rewards',rewardTargets:[{id:'golge-local-terminal511',spawnRound:17}]},{action:'use_potion'}]){
  const jobs=worker.stats.jobs,before=f.sql.prepare('SELECT hp,potions FROM players WHERE id=?').get(f.id),{peer,q,ack}=await send(input);
  assert.equal(worker.stats.jobs,jobs+1,'operation must leave the main thread');
  assert.equal(ack.result.result.status,200,JSON.stringify(ack.result.result));
  const after=f.sql.prepare('SELECT hp,potions,xp,gems FROM players WHERE id=?').get(f.id);
  if(input.action==='use_potion'){assert.equal(after.potions,before.potions-1);assert(after.hp>before.hp);}
  // Receipts and the actual client wire are JSON; optional undefined fields
  // are absent after durable replay, as in the unchanged native contract.
  const expected=JSON.parse(JSON.stringify(ack));
  if(input.action==='use_potion'){
   assert(expected.result.events.some(e=>e.some?.(p=>p?.type==='player_state')));
   expected.result.events=[]; // Already-published HP effects must not replay.
  }
  assert.deepEqual(await original(peer,q),expected);assert.deepEqual(f.sql.prepare('SELECT hp,potions,xp,gems FROM players WHERE id=?').get(f.id),after);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(q.operationId).n,1);
 }
 if(area==='forest'){
  const before=f.sql.prepare('SELECT hp,potions FROM players WHERE id=?').get(f.id);staleEncounter=true;
  const {ack}=await send({action:'use_potion'});
  assert.equal(ack.result.result.status,409,'stale journal must be a safe native CAS rejection, never an unknown outcome');
  assert.equal(ack.result.result.body.not_executed,true);
  assert.deepEqual(f.sql.prepare('SELECT hp,potions FROM players WHERE id=?').get(f.id),before);
  assert.equal(faults.length,0);
 }
});
