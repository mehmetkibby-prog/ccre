import test from 'node:test';
import assert from 'node:assert/strict';
import {planSingleDeathsR57,takeSingleDeathsR57} from '../../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {AttackLoop} from '../../working/core511-source/scripts/core511/attack-loop.mjs';
import {DEFER_INPUT} from '../../working/core511-source/scripts/core511/fixed-loop.mjs';
import {olderGroupWaitingR57,rememberDeferredGroupR57} from '../../working/core511-source/scripts/core511/group-fairness-r57.mjs';

function fixture({count=6,partySize=1}={}){
 const rows=new Map(),players=new Map(),groups=new Map(),monsters=new Map(),busy=new Set();let order=1;
 for(let n=0;n<count;n++){
  const actor='p'+n,group=[];
  for(let j=0;j<partySize;j++){
   const id=j?actor+'-ally'+j:actor;group.push(id);
   rows.set(id,{id,role:'muhafiz',area:'forest',channel:1,hp:100,world_cycle:1,realtime_scope_version:0});
   players.set(id,{epoch:1,queue:[],deferred:[],barrier:null,suspended:false,passive:false});
  }
  for(const id of group)groups.set(id,group);
  monsters.set('m'+n,{id:'m'+n,area:'forest',channel:1,hp:1,spawn_round:1,is_boss:0,is_stone:0});
  if(n){players.get(actor).queue.push({order:++order,at:order,receivedAtMs:100,sequence:1,kind:'combat',payload:{action:'attack',ability:0,targetId:'m'+n}});}
 }
 const view={player:id=>rows.get(id),monster:id=>monsters.get(id)},state={channel:1,assertOwner:(id,epoch)=>{assert.equal(epoch,players.get(id)?.epoch);},owners:new Map([...players].map(([id])=>[id,{epoch:1}]))};
 const kernel={players,state,metrics:{},running:false};
 const c={kernel,state,view,identities:new Map([...players].map(([id])=>[id,{id}])),ports:{guard:()=>true},mounts:{enabled:false},lanes:{busy:keys=>keys.some(k=>busy.has(k))},checkpoints:{overdueR53:()=>false},retaliationMemory:{due:()=>[]},frames:{attack:(id,input)=>({id,input})},attackMemory:{plan:frame=>({durable:true,boundary:{reason:'defeat'},frame})}};
 const runtime={channel:c,forceSharedActors:new Map(),localResident:id=>rows.has(id),localGroup:id=>groups.get(id),localKill:(id,preview)=>preview.durable?({ids:groups.get(id),targets:[{id:preview.frame.input.targetId,spawnRound:1}]}):null};
 const local={ids:groups.get('p0'),targets:[{id:'m0',spawnRound:1}]},context={id:'p0',input:{action:'attack',ability:0,targetId:'m0'},inputOrder:1,now:100,kernel};
 return {runtime,c,context,local,rows,players,groups,monsters,busy};
}
test('five independent lethal heads union their complete groups before any consumption',()=>{
 const f=fixture({partySize:5}),plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.entries.length,4);assert.equal(plan.ids.length,25);assert.equal(plan.targets.length,5);
 assert.deepEqual(plan.entries.map(e=>e.actor),['p1','p2','p3','p4']);
 assert.equal(f.players.get('p1').queue.length,1);assert.equal(f.players.get('p5').queue.length,1);
 const taken=takeSingleDeathsR57(f.c,plan);assert.equal(taken.length,4);
 assert.equal(f.players.get('p1').queue.length,0);assert.equal(f.players.get('p5').queue.length,1);
 assert.deepEqual(f.players.get('p1').deferred,[{type:'action',sequence:1}]);
});
test('an older nonattack head and an earlier successor stop selection without overtaking',()=>{
 let f=fixture();f.players.get('p2').queue[0].payload={action:'use_potion'};
 let plan=planSingleDeathsR57(f.runtime,f.context,f.local);assert.deepEqual(plan.entries.map(e=>e.actor),['p1']);
 f=fixture();f.players.get('p1').queue.push({order:2.5,at:2.5,receivedAtMs:100,sequence:2,kind:'movement',payload:{action:'move'}});
 plan=planSingleDeathsR57(f.runtime,f.context,f.local);assert.deepEqual(plan.entries.map(e=>e.actor),['p1']);
});
test('foreign/held group, shared target, duplicate life and nonlethal head keep original path',()=>{
 for(const mutate of [
  f=>f.rows.get('p1').channel=2,
  f=>f.rows.get('p1').area='frozen',
  f=>f.players.get('p1-ally1').barrier={},
  f=>f.players.get('p1-ally1').externalHold='held',
  f=>f.busy.add('player:p1-ally1'),
  f=>f.runtime.localResident=id=>id!=='p1-ally1',
  f=>f.runtime.localKill=()=>null,
  f=>f.players.get('p1').queue[0].payload.targetId='m0',
  f=>f.c.attackMemory.plan=()=>({deferred:true}),
 ]){const f=fixture({partySize:2});mutate(f);assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);assert.equal(f.players.get('p1').queue.length,1);}
});
test('ten-target and25-actor bounds stop before consuming the oversized group',()=>{
 const f=fixture({partySize:5});f.local.ids.push('extra');f.rows.set('extra',{...f.rows.get('p0'),id:'extra'});f.players.set('extra',{epoch:1,queue:[],deferred:[]});
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);assert.equal(plan.entries.length,3);assert.equal(plan.ids.length,21);
 const g=fixture();g.local.targets=Array.from({length:10},(_,i)=>({id:'m'+i,spawnRound:1}));assert.equal(planSingleDeathsR57(g.runtime,g.context,g.local),null);
});
test('changed secondary epoch or head rejects the plan without consuming any input',()=>{
 for(const mutate of [f=>f.players.get('p2').epoch++,f=>f.players.get('p2').queue[0]={...f.players.get('p2').queue[0]}]){
  const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local);mutate(f);assert.throws(()=>takeSingleDeathsR57(f.c,plan),/death_batch_queue_changed/);assert.equal(f.players.get('p1').queue.length,1);assert.equal(f.players.get('p1').deferred.length,0);
 }
});
test('independent successor cannot inherit lead priority over an older remembered resource waiter',()=>{
 const f=fixture(),waiter=f.players.get('p2'),next=f.players.get('p1').queue[0];
 f.c.kernel.running=true;f.c.state.read=(_table,id)=>f.rows.get(id);
 waiter.queue[0].order=2;next.order=3;
 rememberDeferredGroupR57({kernel:f.c.kernel,id:'p2',input:waiter.queue[0].payload,inputOrder:2,ids:['p2'],resources:['monster:m1']});waiter.barrier={};
 assert.equal(olderGroupWaitingR57({kernel:f.c.kernel,id:'p1',input:next.payload,inputOrder:3,ids:['p1'],resources:['monster:m1']}),true);
 assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);assert.equal(f.players.get('p1').queue.length,1);
});
test('AttackLoop leases every expanded actor and target before consuming the plan',()=>{
 const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local),leased=[];
 f.c.state.channel=1;
 const loop=new AttackLoop({memory:{step:()=>({durable:true,boundary:{reason:'defeat',targets:['m0']}}),view:f.c.view},lanes:{busy:()=>false,acquire:keys=>{leased.push(...keys);return null;}},checkpoints:{},combatCheckpoints:{},submit:()=>{},frameFor:()=>({playerId:'p0',player:f.rows.get('p0')}),affectedActors:()=>[],committed:()=>{},publish:()=>{}});
 loop.shared={};loop.localKill=()=>f.local;loop.planBatchR57=()=>plan;loop.takeBatchR57=()=>{throw Error('must_not_consume_without_lease');};
 assert.equal(loop.attack({...f.context,epoch:1}),DEFER_INPUT);
 assert.deepEqual(new Set(leased),new Set([...plan.ids.map(id=>'player:'+id),...plan.targets.map(t=>'monster:'+t.id)]));
 assert.equal(f.players.get('p1').queue.length,1);
});
