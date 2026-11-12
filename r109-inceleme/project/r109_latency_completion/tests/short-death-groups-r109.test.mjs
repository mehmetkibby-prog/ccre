import test from 'node:test';
import assert from 'node:assert/strict';
import {planSingleDeathsR57,takeSingleDeathsR57} from '../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {takeDeathBatchR57} from '../working/core511-source/scripts/core511/death-batch-channel-r57.mjs';
import {independentDeathBatchPayloadR85} from '../working/core511-source/scripts/core511/independent-death-batch-r85.mjs';
import {rememberDeferredGroupR57} from '../working/core511-source/scripts/core511/group-fairness-r57.mjs';
function fixture({count=12,partySize=1}={}){
 const rows=new Map(),players=new Map(),groups=new Map(),monsters=new Map(),busy=new Set();let order=1;
 for(let n=0;n<count;n++){
  const actor='p'+n,group=[];
  for(let j=0;j<partySize;j++){
   const id=j?actor+'-ally'+j:actor;group.push(id);
   rows.set(id,{id,role:'muhafiz',area:'forest',channel:1,hp:100,x:n*1000,y:0,world_cycle:1,realtime_scope_version:0});
   players.set(id,{epoch:1,queue:[],deferred:[],barrier:null,suspended:false,passive:false});
  }
  for(const id of group)groups.set(id,group);
  monsters.set('m'+n,{id:'m'+n,area:'forest',channel:1,hp:1,x:n*1000,y:10,spawn_round:1,is_boss:0,is_stone:0});
  if(n)players.get(actor).queue.push({order:++order,at:order,receivedAtMs:100,sequence:1,kind:'combat',payload:{action:'attack',ability:0,targetId:'m'+n,spawnRound:1}});
 }
 const view={players:rows,monsters,player:id=>rows.get(id),monster:id=>monsters.get(id)},state={channel:1,read:(_table,id)=>rows.get(id),assertOwner:(id,epoch)=>{assert.equal(epoch,players.get(id)?.epoch);},owners:new Map([...players].map(([id])=>[id,{epoch:1}]))};
 const kernel={players,state,metrics:{},running:false};
 const c={kernel,state,view,identities:new Map([...players].map(([id])=>[id,{id}])),ports:{guard:()=>true},mounts:{enabled:false},lanes:{busy:keys=>keys.some(k=>busy.has(k))},checkpoints:{overdueR53:()=>false},retaliationMemory:{due:()=>[]},frames:{attack:(id,input)=>({id,input,player:rows.get(id),preloadedAttackMonster:monsters.get(input.targetId)})},attackMemory:{participants:new Map(),plan:frame=>({durable:true,boundary:{reason:'defeat'},frame})}};
 const runtime={channel:c,forceSharedActors:new Map(),localResident:id=>rows.has(id),localGroup:id=>groups.get(id),localKill:(id,preview)=>preview.durable?({ids:groups.get(id),targets:[{id:preview.frame.input.targetId,spawnRound:monsters.get(preview.frame.input.targetId)?.spawn_round}]}):null};
 const local={ids:groups.get('p0'),targets:[{id:'m0',spawnRound:1}]},context={id:'p0',input:{action:'attack',ability:0,targetId:'m0',spawnRound:1},inputOrder:1,now:100,kernel};
 return {runtime,c,context,local,rows,players,groups,monsters,busy};
}
const actors=plan=>plan?.entries.map(e=>e.actor)??[];
const clone=value=>JSON.parse(JSON.stringify(value));
function payloadFor(f,plan){
 return {input:f.context.input,nowMs:f.context.now,expected:{player:f.rows.get('p0'),monster:f.monsters.get('m0')},localScope:{kind:'kill',targets:plan.targets},batchAttacksR57:plan.entries,resources:[...plan.ids.map(id=>'player:'+id),...plan.targets.map(t=>'monster:'+t.id)]};
}


test('small groups retain all later heads and preserve seeds, sequences and FIFO',()=>{
 const f=fixture(),original=new Map([...f.players].map(([id,p])=>[id,p.queue[0]]));
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.deepEqual(actors(plan),['p1']);assert.equal(independentDeathBatchPayloadR85(payloadFor(f,plan),'p0'),true);
 const seed=plan.entries[0].seed;assert.equal(seed.length,64);
 for(const [id,p]of f.players)assert.equal(p.queue[0],original.get(id));
 takeSingleDeathsR57(f.c,plan);assert.deepEqual(f.players.get('p1').deferred,[{type:'action',sequence:1}]);
 for(let i=2;i<12;i++)assert.equal(f.players.get('p'+i).queue[0],original.get('p'+i));
 const head=f.players.get('p2').queue.shift(),context={...f.context,id:'p2',input:head.payload,inputOrder:head.order};
 const next=planSingleDeathsR57(f.runtime,context,{ids:['p2'],targets:[{id:'m2',spawnRound:1}]});assert.deepEqual(actors(next),['p3']);
 assert.throws(()=>takeSingleDeathsR57(f.c,plan),/death_batch_plan/);
});

test('full party leases remain complete and no later group is consumed',()=>{
 const f=fixture({partySize:5}),plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.entries.length,1);assert.equal(plan.ids.length,10);assert.equal(plan.targets.length,2);
 takeSingleDeathsR57(f.c,plan);assert.equal(f.players.get('p2').queue.length,1);
});

test('mixed area planning and accepted overlapping casts also retain later heads',()=>{
 const f=fixture(),all=[...f.rows.keys()];for(const row of f.rows.values())row.role='arkanist';for(const id of all)f.groups.set(id,all);
 f.local.ids=all;f.players.get('p1').queue[0].payload.ability=2;
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);assert.equal(plan.scope.kind,'mixed');assert.deepEqual(actors(plan),['p1']);
 takeSingleDeathsR57(f.c,plan);assert.equal(f.players.get('p2').queue.length,1);
 const g=fixture();for(const row of g.rows.values())row.role='arkanist';for(const p of g.players.values())if(p.queue[0])p.queue[0].payload.targetId='m0';
 const entries=takeDeathBatchR57(g.runtime,{...g.context,ids:[...g.rows.keys()],targets:[{id:'m0'}]});assert.equal(entries.length,1);assert.equal(entries[0].actor,'p1');assert.equal(g.players.get('p2').queue.length,1);
});

test('foreign, held, missing, overdue and older waiters still block without consumption',()=>{
 for(const mutate of [f=>f.rows.get('p1').channel=2,f=>f.rows.get('p1').area='frozen',f=>f.players.get('p1-ally1').barrier={},f=>f.busy.add('player:p1-ally1'),f=>f.c.checkpoints.overdueR53=id=>id==='p1-ally1',f=>f.runtime.localResident=id=>id!=='p1-ally1',f=>f.runtime.localKill=()=>null]){
  const f=fixture({partySize:2});mutate(f);assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);assert.equal(f.players.get('p1').queue.length,1);
 }
 const f=fixture();f.c.kernel.running=true;const waiter=f.players.get('p2'),next=f.players.get('p1').queue[0];waiter.queue[0].order=2;next.order=3;
 rememberDeferredGroupR57({kernel:f.c.kernel,id:'p2',input:waiter.queue[0].payload,inputOrder:2,ids:['p2'],resources:['monster:m1']});waiter.barrier={};
 assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);assert.equal(f.players.get('p1').queue.length,1);
});

test('changed ownership or head invalidates the entire planned group',()=>{
 for(const mutate of [f=>f.players.get('p1').epoch++,f=>f.players.get('p1').queue[0]={...f.players.get('p1').queue[0]}]){
  const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local);mutate(f);assert.throws(()=>takeSingleDeathsR57(f.c,plan),/death_batch_queue_changed/);
  for(let i=1;i<12;i++){assert.equal(f.players.get('p'+i).queue.length,1);assert.equal(f.players.get('p'+i).deferred.length,0);}
 }
});
