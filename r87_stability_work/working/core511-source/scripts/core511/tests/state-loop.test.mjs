import test from 'node:test';
import assert from 'node:assert/strict';
import {SpatialGrid} from '../spatial-grid.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop,DEFER_INPUT} from '../fixed-loop.mjs';
import {releaseGate,selectChannel} from '../contract.mjs';
import {seeded,player} from './helpers.mjs';
test('release refuses missing, non-finite or duplicate process evidence',()=>{
 for(const load of [undefined,{}, {durationMs:600000,players:100,channelCount:4,actualGameRules:true,actualNetwork:true,cpuBudget:4,channels:Array(4).fill({channel:1,players:25,hotSqlReads:0})}])assert.equal(releaseGate({load}).ready,false);
 assert(releaseGate({load:{totalCpuFraction:NaN,mainElu:undefined,maxPauseMs:-1}}).failures.includes('load:host_targets'));
 assert.equal(selectChannel(new Map()),2);assert.equal(selectChannel(new Map([[1,25],[2,25],[3,25],[4,25]])),null);
 assert.equal(selectChannel(new Map([[1,12],[2,4],[3,4],[4,2]])),4);
});
test('global drain suspends a group together only after queued cross-player work and its durable ACK settle',async()=>{
 const state=new ResidentState(1);for(const id of ['a','b']){state.put('players',player(id));state.claim(id,1);}let release;const hold=new Promise(r=>release=r),seen=[];
 const kernel=new FixedLoop({state,send:(id,p)=>seen.push([id,p]),rules:{movement:()=>({}),combat:({id,kernel})=>{assert.equal(id,'b');assert.equal(kernel.players.get('a').suspended,false);kernel.durableGroup(['a','b'],()=>hold,{replyTo:'b'});return {ok:true};},ai:()=>{},respawn:()=>{},project:({results})=>({results})}});for(const id of ['a','b'])kernel.admit(id,1);kernel.stopped=false;kernel.enqueue('b',{sequence:1,epoch:1,kind:'combat',payload:{}});
 const pending=kernel.quiesceGroup([{id:'a',epoch:1},{id:'b',epoch:1}]);assert.equal(kernel.players.get('a').suspended,false);assert.throws(()=>kernel.enqueue('a',{sequence:1,epoch:1,kind:'combat',payload:{}}),/actor_draining/);kernel.tick();assert.equal(kernel.players.get('a').suspended,false);assert.equal(kernel.players.get('b').suspended,false);release({saved:true});await kernel.players.get('b').barrier;kernel.tick();await pending;assert(kernel.players.get('a').suspended);assert(kernel.players.get('b').suspended);assert.equal(kernel.players.get('b').lastApplied,1);assert(seen.some(([id,p])=>id==='b'&&p.results.some(r=>r.sequence===1)));
 for(const id of ['a','b'])kernel.resume(id,1);assert(kernel.players.get('a').accepting);
});
test('spatial lookup matches a brute-force reference after moves, deletions and room changes',()=>{
 const grid=new SpatialGrid(),rows=new Map(),random=seeded(91);
 for(let i=0;i<2000;i++){const row={...player('p'+i,i%4+1),cycle:i%3,instanceId:String(i%5),x:Math.floor(random()*6000-3000),y:Math.floor(random()*6000-3000)};rows.set(row.id,row);grid.upsert(row);}
 for(let i=0;i<800;i++){
  const id='p'+Math.floor(random()*2000),old=rows.get(id);if(!old)continue;
  if(i%3===0){rows.delete(id);grid.remove(id);}else{const row={...old,x:old.x+1024,instanceId:'changed'};rows.set(id,row);grid.upsert(row);}
 }
 for(let i=0;i<100;i++){
  const row=[...rows.values()][i*7],radius=1024;
  const expected=[...rows.values()].filter(p=>p.cycle===row.cycle&&p.channel===row.channel&&p.area===row.area&&p.instanceId===row.instanceId&&(p.x-row.x)**2+(p.y-row.y)**2<=radius**2).map(p=>p.id).sort();
  assert.deepEqual(grid.nearby(row,row.x,row.y,radius).map(p=>p.id),expected);
 }
 assert.throws(()=>grid.nearby(player(),0,0,Infinity),/invalid_grid_query/);
});
test('resident state cannot expose mutable rows or replace an undrained owner',()=>{
 const state=new ResidentState(4),source=player('p',4);state.put('players',source);state.claim('p',1);source.x=200;
 assert.equal(state.read('players','p').x,0);assert.throws(()=>{state.read('players','p').x=1;},TypeError);
 assert.throws(()=>state.put('players',{...source,extra:{hp:2}}),/nested/);
 const original=state.read('players','p');let externalHp=9;const getterRow=Object.freeze({...original,get hp(){return externalHp;}});state.put('players',getterRow);externalHp=7;assert.equal(state.read('players','p').hp,9);state.put('players',original);
 assert.throws(()=>state.put('players',source,{id:'replacement'}),/identity_patch_forbidden/);
 assert.throws(()=>state.put('players',{...source,x:NaN}),/invalid_grid_entity/);assert.equal(state.read('players','p').x,0);
 assert.throws(()=>state.claim('p',2),/owner_still_present/);
 state.changes();const before=state.sequence;state.patch('players','p',{hp:100});assert.equal(state.sequence,before);assert.deepEqual(state.changes(),[]);
 const owner=state.assertOwner('p',1);owner.pending=1;state.freeze('p',1);assert.throws(()=>state.release('p',1),/owner_not_drained/);
 owner.pending=0;state.release('p',1);state.put('players',source);assert.throws(()=>state.claim('p',1),/owner_epoch_reused/);state.claim('p',2);
});
function loop(t,{rules:overrides={},onFatal=()=>{}}={}){
 const state=new ResidentState(1);state.put('players',player());state.claim('p',1);
 const calls=[],packets=[],rules={movement:({input})=>{calls.push(input);return {ok:true};},combat:({input})=>{calls.push(input);return {ok:true};},ai:()=>{calls.push('ai');},respawn:()=>{calls.push('respawn');},project:({results})=>results.length?{results}:null,...overrides};
 const kernel=new FixedLoop({state,rules,send:(id,packet)=>packets.push(packet),onFatal});kernel.admit('p',1);kernel.start();t.after(()=>kernel.stop());return {state,kernel,calls,packets};
}
test('alternating movement/combat inputs remain ordered and finish within the first tick',t=>{
 const {kernel,calls,packets}=loop(t);
 ['combat','movement','combat','movement'].forEach((kind,i)=>kernel.enqueue('p',{sequence:i+1,epoch:1,kind,payload:i+1}));
 kernel.tick();assert.deepEqual(calls,[1,2,3,4,'ai','respawn']);assert.equal(packets.length,1);assert.deepEqual(packets[0].results.map(r=>r.sequence),[1,2,3,4]);
 assert.throws(()=>kernel.enqueue('p',{sequence:4,epoch:1,kind:'combat'}),/input_sequence_gap/);
 assert.throws(()=>kernel.enqueue('p',{sequence:5,epoch:2,kind:'combat'}),/owner_epoch_fenced/);
});
test('durable barrier does not acknowledge or apply the next actor input before commit',async t=>{
 const {kernel,state,calls,packets}=loop(t);let resolve;
 const pending=kernel.durable('p',()=>new Promise(done=>resolve=done));
 kernel.enqueue('p',{sequence:1,epoch:1,kind:'combat',payload:'attack'});kernel.tick();assert.equal(state.owners.get('p').pending,1);assert.equal(packets.length,0);assert(!calls.includes('attack'));
 resolve({receipt:'r'});await pending;kernel.tick();assert(calls.includes('attack'));assert.equal(state.owners.get('p').pending,0);assert.equal(packets[0].results.at(-1).type,'durable');
});
test('rejected durable write fences the kernel; the owner cannot transfer an unknown outcome',async t=>{
 let fatal;const {kernel,state}=loop(t,{onFatal:error=>{fatal=error;}});const failure=Error('fsync failed');
 await assert.rejects(kernel.durable('p',()=>Promise.reject(failure)),/fsync failed/);
 assert.equal(fatal,failure);assert.throws(()=>kernel.enqueue('p',{sequence:1,epoch:1,kind:'movement'}),/kernel_unavailable/);
 state.freeze('p',1);assert.throws(()=>state.release('p',1),/owner_not_drained/);
});
test('an economy input is not marked applied or acknowledged until its own durable write resolves',async t=>{
 let resolve;
 const {kernel,packets}=loop(t,{rules:{combat:({id,kernel})=>{kernel.durable(id,()=>new Promise(done=>resolve=done));return {ok:true,reward:'receipt-only-after-commit'};}}});
 kernel.enqueue('p',{sequence:1,epoch:1,kind:'combat',payload:'reward'});kernel.tick();assert.equal(kernel.players.get('p').lastApplied,0);assert.equal(packets.length,0);
 const pending=kernel.players.get('p').barrier;resolve({receipt:'durable'});await pending;kernel.tick();assert.equal(kernel.players.get('p').lastApplied,1);assert.equal(packets[0].results[0].reward,'receipt-only-after-commit');
});
test('a channel rejects its twenty-sixth actor',t=>{
 const {kernel,state}=loop(t);for(let i=2;i<=25;i++){const id='p'+i;state.put('players',player(id));state.claim(id,1);kernel.admit(id,1);}
 state.put('players',player('p26'));state.claim('p26',1);assert.throws(()=>kernel.admit('p26',1),/channel_full/);
});
test('a durable room fences all members, delivers private ACK only to sender and does not spin on deferred input',async t=>{
 let resolve,attempts=0;
 const {kernel,state,packets}=loop(t,{rules:{combat:({id,kernel})=>{
  if(id==='p'){kernel.durableGroup(['p','q'],()=>new Promise(r=>resolve=r),{replyTo:'p',ackResult:v=>v,emitReceipt:false});return {pending:true};}
  return ++attempts<2?DEFER_INPUT:{ok:true};
 }}});
 state.put('players',player('q'));state.claim('q',1);kernel.admit('q',1);
 for(const id of ['p','q'])kernel.enqueue(id,{sequence:1,epoch:1,kind:'combat',payload:{}});
 kernel.tick();assert.equal(attempts,0);assert.equal(packets.length,0);assert.equal(state.owners.get('q').pending,1);
 const promise=kernel.players.get('p').barrier;resolve({ok:false,code:'dungeon_rule_rejected',privateReceipt:'p-only'});await promise;
 kernel.tick();assert.equal(attempts,1);assert.equal(kernel.players.get('q').lastApplied,0);assert.equal(packets.length,1);
 assert.equal(packets[0].results[0].ok,false);assert.equal(packets[0].results[0].privateReceipt,'p-only');
 kernel.tick();assert.equal(attempts,2);assert.equal(kernel.players.get('q').lastApplied,1);assert.equal(packets[1].results[0].privateReceipt,undefined);
});

test('durable scope retirement replies to every queued old input and removes only that actor from a concurrent group drain',async()=>{
 const state=new ResidentState(1);for(const id of ['a','b']){state.put('players',player(id));state.claim(id,1);}let release;const wait=new Promise(resolve=>release=resolve),kernel=new FixedLoop({state,send:()=>{},rules:{movement:()=>assert.fail('retired movement executed'),combat:({id,kernel})=>{assert.equal(id,'a');kernel.durableGroup(['a'],()=>wait,{replyTo:'a',emitReceipt:false,ackResult:()=>({status:200,body:{killed:true}})});return {};},ai:()=>{},respawn:()=>{},project:({results})=>({results})}});
 for(const id of ['a','b'])kernel.admit(id,1);kernel.stopped=false;kernel.enqueue('a',{sequence:1,epoch:1,kind:'combat',payload:{}});kernel.enqueue('a',{sequence:2,epoch:1,kind:'movement',payload:{}});kernel.tick();const pending=kernel.players.get('a').barrier,group=kernel.quiesceGroup([{id:'a',epoch:1},{id:'b',epoch:1}]),a=kernel.players.get('a');a.suspended=true;a.externalHold='native-return';assert.throws(()=>kernel.retireScope('a',1,'native-return'),/retire_scope_not_committed/);
 release({durable:true});await pending;await Promise.resolve();const packet=kernel.retireScope('a',1,'native-return');assert.deepEqual(packet.results.map(r=>[r.sequence,r.status]),[[1,200],[2,409]]);assert.equal(packet.lastApplied,2);state.freeze('a',1);kernel.detach('a',1);kernel.tick();const drained=await group;assert(drained.some(r=>r.id==='a'&&r.retired));assert(kernel.players.get('b').suspended);assert.equal(state.owners.has('a'),false);
});
