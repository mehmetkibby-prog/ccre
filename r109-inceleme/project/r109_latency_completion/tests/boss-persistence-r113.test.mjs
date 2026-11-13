import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {put} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
import {canonicalBossWriteR113} from '../working/core511-source/scripts/core511/persistence-scope-r113.mjs';

const boss='dunya-bosu-1',round=719;
test('canonical boss worker selection excludes other bosses, unleased work and mixed claims',()=>{
 const q={operation:'attack',payload:{sharedLease:'server-proof',expected:{player:{area:'sanctum'},monster:{id:boss,area:'sanctum',channel:0,is_boss:1}},input:{action:'attack',targetId:boss}}};
 assert(canonicalBossWriteR113(q));
 for(const mutate of [r=>delete r.payload.sharedLease,r=>r.payload.expected.player.area='forest',r=>r.payload.expected.player.instance_id='room',r=>r.payload.expected.player.arena_match_id='arena',r=>r.payload.expected.monster.id='dragon-world-1',r=>r.payload.expected.monster.channel=1,r=>r.payload.expected.monster.loadlab_run_id='simulation',r=>r.payload.batchAttacksR57=[],r=>r.operation='pvp_attack']){
  const bad=structuredClone(q);mutate(bad);assert.equal(canonicalBossWriteR113(bad),false);
 }
 const claim={...q,operation:'native_action',payload:{...q.payload,input:{action:'claim_rewards',rewardTargets:[{id:boss,spawnRound:round}]}}};assert(canonicalBossWriteR113(claim));
 for(const rewardTargets of [[],[{id:'dragon-world-1',spawnRound:round}],[{id:boss,spawnRound:0}],Array(11).fill({id:boss,spawnRound:round})])assert.equal(canonicalBossWriteR113({...claim,payload:{...claim.payload,input:{action:'claim_rewards',rewardTargets}}}),false);
});
async function fixture(t){
 const s=await setup(t,{shared:true,prepare:f=>{
  f.sql.prepare('UPDATE game_settings SET boss_hp=1 WHERE id=1').run();
  put(f.sql,'monsters',{id:boss,name:'Çürümenin Kadimi',area:'sanctum',channel:0,x:1200,y:690,hp:1,max_hp:1,spawn_round:round,is_boss:1,is_stone:0,respawn_at:0,despawn_at:Math.floor(f.clock()/1000)+600,last_regen_at_ms:f.clock()});
  f.sql.prepare("UPDATE players SET area='sanctum',x=1200,y=720,level=40,xp=0,hp=100000,max_hp=100000,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0 WHERE id=?").run(f.id);
 }});
 await s.world.stopJobs();const ticket=await s.http('character',{channel:4});assert.equal(ticket.status,200);
 return {...s,live:await s.connect(ticket)};
}

test('canonical shared boss death and claim use the sole worker with exact-once receipts',{timeout:65000},async t=>{
 const {f,core,writer,live,faults}=await fixture(t),w=writer.rewardWorkerR533,command=writer.command.bind(writer),calls=[];
 writer.command=async(peer,q)=>{const ack=await command(peer,q);if(q.playerId===f.id&&['attack','native_action'].includes(q.operation))calls.push({peer,q,ack});return ack;};
 const before=w.stats.jobs;
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:boss,spawnRound:round,ability:0,intentId:'r113-world-boss-worker'}}));
 try{await until(()=>calls.some(c=>c.q.operation==='attack')||faults.length,15000);}catch(error){throw Error(JSON.stringify({error:error.message,player:f.sql.prepare('SELECT area,x,y,channel,hp FROM players WHERE id=?').get(f.id),boss:f.sql.prepare('SELECT area,x,y,hp,spawn_round FROM monsters WHERE id=?').get(boss),packets:live.packets.slice(-2)}));}
 assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 const death=calls.find(c=>c.q.operation==='attack');assert(death);assert(death.q.payload.sharedLease);
 assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(boss).hp,0);
 assert(w.stats.jobs>before,'canonical boss terminal must not execute native reward SQL on the main thread');
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),7000);
 const beforeClaim=w.stats.jobs;
 live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'claim_rewards',rewardTargets:[{id:boss,spawnRound:round}]}}));
 await until(()=>calls.some(c=>c.q.operation==='native_action'&&c.q.payload.input?.action==='claim_rewards')||faults.length,12000);
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,12000);
 assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
 assert(w.stats.jobs>beforeClaim,'the subsequent canonical boss claim stays in the same sole writer');
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_defeats WHERE boss_round=?').get(round).n,1);
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims WHERE boss_round=? AND player_id=?').get(round,f.id).n,1);
 const state=()=>({player:f.sql.prepare('SELECT xp,gems,level FROM players WHERE id=?').get(f.id),items:f.sql.prepare('SELECT * FROM player_items WHERE player_id=? ORDER BY id').all(f.id)}),saved=state();
 for(const {peer,q,ack}of calls){assert.equal((await command(peer,q)).key,ack.key);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(q.operationId).n,1);}
 assert.deepEqual(state(),saved);await until(()=>core.sharedWorld.combat.terminal===null,7000);
});

for(const phase of ['before_commit','after_commit'])test('canonical boss worker crash '+phase+' keeps the global lease and durable outcome consistent',{timeout:65000},async t=>{
 const {f,writer,core,world,supervisor,live}=await fixture(t),w=writer.rewardWorkerR533;
 await w.lane.idle();if(w.slot&&!w.slot.ended){await w.slot.worker.terminate();await w.slot.exit;}
 const entry=w.entry;w.entry=new URL('./persistence-crash-worker-r113.mjs',import.meta.url);w.workerOptions={workerData:{crashAt:phase}};
 t.after(()=>{w.entry=entry;w.workerOptions={};});
 const command=writer.command.bind(writer),owners=[world.row,...supervisor.rows.values()];let record,ack,error;
 writer.command=async(peer,q)=>{if(q.operation!=='attack')return command(peer,q);record={peer,q};try{return ack=await command(peer,q);}catch(e){error=e;throw e;}};
 const state=()=>f.sql.prepare('SELECT xp,gems,level FROM players WHERE id=?').get(f.id),before=state();
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:boss,spawnRound:round,ability:0,intentId:'r113-boss-crash-'+phase}}));
 await until(()=>ack||error,20000);assert(record);assert(record.q.payload.sharedLease);
 const crashed=w.slot;assert.equal(await crashed.exit,98);assert(crashed.ended);
 const receipt=f.sql.prepare('SELECT * FROM kernel511_channel_receipts WHERE operation_id=?').get(record.q.operationId);
 if(phase==='before_commit'){
  assert.equal(error?.code,'reward_worker_rolled_back');assert.equal(receipt,undefined);assert.deepEqual(state(),before);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_defeats WHERE boss_round=?').get(round).n,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims WHERE boss_round=?').get(round).n,0);
  assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(boss).hp,1);assert.equal(w.stats.rollbacks,1);
 }else{
  assert.equal(error,undefined);assert(receipt);assert.equal(f.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(boss).hp,0);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM boss_defeats WHERE boss_round=?').get(round).n,1);assert.equal(w.stats.replays,1);
  const saved=state();assert.equal((await command(record.peer,record.q)).key,ack.key);assert.deepEqual(state(),saved);
  assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(record.q.operationId).n,1);
 }
 w.entry=entry;w.workerOptions={};await w.prepare();assert.equal(w.slot.ended,false);
 await until(()=>core.sharedWorld.combat.terminal===null,10000);
 assert(owners.every(r=>!r.exited),'proved worker outcomes must not retire the world or the four channels');
});
