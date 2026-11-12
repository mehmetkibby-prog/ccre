import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.STUTTER_TREE+'/core511-source/scripts/core511';
const {FixedLoop}=await import(base+'/fixed-loop.mjs');
const {ResidentState}=await import(base+'/resident-state.mjs');
const {queueCombatContinuationR57}=await import(base+'/combat-continuation-r57.mjs');
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(count=1,{rule,monsterPatch={},playerPatch={}}={}){
 const state=new ResidentState(1),calls=[],packets=[],phases=[];
 let clock=100;
 const rules={movement:({id,input})=>{calls.push({id,action:'move'});return {status:200};},combat:context=>{calls.push({id:context.id,action:context.input.action,order:context.inputOrder});return rule?rule(context,()=>{clock+=3;}):{status:200,body:{hits:[{id:'mob',hp:1,killed:false}]}};},ai:()=>{phases.push('ai');},respawn:()=>{phases.push('respawn');},project:({results,lastApplied})=>({results,lastApplied})};
 const loop=new FixedLoop({state,rules,send:(id,packet)=>packets.push({id,packet}),clock:()=>clock,wall:()=>1000+clock});
 state.put('monsters',{id:'mob',area:'forest',channel:1,x:0,y:0,hp:100,spawn_round:1,is_boss:0,is_stone:0,...monsterPatch});
 for(let i=0;i<count;i++){const id='p'+i;state.put('players',{id,area:'forest',channel:1,x:0,y:0,hp:100,...playerPatch});state.claim(id,1);loop.admit(id,1);}
 loop.stopped=false;
 const send=(id='p0',sequence=1,payload={action:'attack',targetId:'mob',spawnRound:1},kind='combat')=>loop.enqueue(id,{epoch:1,sequence,kind,payload});
 return {loop,state,calls,packets,phases,send};
}
test('accepted ordinary attack starts without waiting for a tick; simulation stays at 20Hz',async()=>{
 const f=fixture();f.send();assert.equal(f.calls.length,0);await turn();
 assert.equal(f.calls.length,1);assert.equal(f.loop.metrics.ticks,0);assert.deepEqual(f.phases,[]);
 await f.loop.tick();assert.equal(f.calls.length,1);assert.equal(f.loop.metrics.ticks,1);assert.deepEqual(f.phases,['ai','respawn']);
 assert.equal(f.packets.flatMap(p=>p.packet.results).length,1);
});
test('older movement and commands keep their per-actor sequence',async()=>{
 const f=fixture();f.send('p0',1,{action:'move'},'movement');f.send('p0',2);
 await turn();assert.equal(f.calls.length,0);await f.loop.tick();
 assert.deepEqual(f.calls.map(c=>c.action),['move','attack']);
 assert.deepEqual(f.packets.flatMap(p=>p.packet.results).map(r=>r.sequence),[1,2]);
});
test('bosses, instances, stale monster lives and held actors keep their established path',async()=>{
 for(const options of [{monsterPatch:{is_boss:1}},{monsterPatch:{is_stone:1}},{monsterPatch:{spawn_round:2}},{playerPatch:{instance_id:'dungeon'}},{playerPatch:{area:'bazaar'}}]){
  const f=fixture(1,options);f.send();await turn();assert.equal(f.calls.length,0);f.loop.stop();
 }
 for(const field of ['barrier','suspended','passive']){
  const f=fixture();f.send();f.loop.players.get('p0')[field]=true;await turn();assert.equal(f.calls.length,0);f.loop.stop();
 }
});
test('one ingress burst shares the existing 16-attempt and 2ms continuation budgets',async()=>{
 const f=fixture(25);for(let i=0;i<25;i++)f.send('p'+i);await turn();
 assert.equal(f.calls.length,16);await f.loop.tick();assert.equal(f.calls.length,25);
 assert.equal(new Set(f.calls.map(c=>c.id)).size,25);
 const timed=fixture(10,{rule:(context,spend)=>{spend();return {status:200};}});
 for(let i=0;i<10;i++)timed.send('p'+i);await turn();assert.equal(timed.calls.length,1);
 timed.loop.stop();
});
test('an ingress wake does not pull a different actor boss or potion forward; a disk ACK keeps its old behavior',async()=>{
 for(const payload of [{action:'use_potion'},{action:'attack',targetId:'boss',spawnRound:1}]){
  const f=fixture(2);f.state.put('monsters',{id:'boss',area:'forest',channel:1,x:0,y:0,hp:100,spawn_round:1,is_boss:1});
  f.send('p0',1,payload);f.send('p1');await turn();assert.equal(f.calls.length,0);
  queueCombatContinuationR57(f.loop);await turn();assert.equal(f.calls.length,2);f.loop.stop();
 }
 const f=fixture(2);f.send('p0',1,{action:'use_potion'});f.send('p1');queueCombatContinuationR57(f.loop);
 await turn();assert.equal(f.calls.length,2);f.loop.stop();
});
test('the R111 opt-out restores the original next-tick path',async()=>{
 const previous=process.env.CORE511_R111_COMBAT_WAKE;process.env.CORE511_R111_COMBAT_WAKE='0';
 try{const f=fixture();f.send();await turn();assert.equal(f.calls.length,0);await f.loop.tick();assert.equal(f.calls.length,1);f.loop.stop();}
 finally{if(previous===undefined)delete process.env.CORE511_R111_COMBAT_WAKE;else process.env.CORE511_R111_COMBAT_WAKE=previous;}
});
test('early execution never acknowledges a kill before the original durable barrier',async()=>{
 let release;const disk=new Promise(resolve=>release=resolve);
 const f=fixture(1,{rule:({id,kernel})=>{kernel.durableGroup([id],()=>disk,{replyTo:id,emitReceipt:false,ackResult:()=>({status:200,body:{hits:[{id:'mob',hp:0,killed:true}]}})});return {status:200};}});
 f.send();await turn();await f.loop.tick();
 assert(f.loop.players.get('p0').barrier);assert.equal(f.packets.flatMap(p=>p.packet.results).length,0);
 release({durable:true});await turn();await f.loop.tick();
 const results=f.packets.flatMap(p=>p.packet.results);assert.equal(results.length,1);assert.equal(results[0].body.hits[0].killed,true);
});
