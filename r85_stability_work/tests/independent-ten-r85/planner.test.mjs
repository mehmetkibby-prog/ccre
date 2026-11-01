import test from 'node:test';
import assert from 'node:assert/strict';
import {planSingleDeathsR57,takeSingleDeathsR57} from '../../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {AttackLoop} from '../../working/core511-source/scripts/core511/attack-loop.mjs';
import {DEFER_INPUT} from '../../working/core511-source/scripts/core511/fixed-loop.mjs';
import {olderGroupWaitingR57,rememberDeferredGroupR57} from '../../working/core511-source/scripts/core511/group-fairness-r57.mjs';
import {independentDeathBatchPayloadR85,independentDeathBatchResultR85} from '../../working/core511-source/scripts/core511/independent-death-batch-r85.mjs';
import {guardDeathBatchActorsR57,executeDeathBatchR57} from '../../working/core511-source/scripts/core511/death-batch-writer-r57.mjs';

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

test('ten independent basic deaths retain eleven and later accepted heads until the next batch',()=>{
 const f=fixture(),before=new Map([...f.players].map(([id,p])=>[id,p.queue[0]]));
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.entries.length,9);assert.equal(plan.ids.length,10);assert.equal(plan.targets.length,10);
 assert.deepEqual(actors(plan),Array.from({length:9},(_,i)=>'p'+(i+1)));
 for(const [id,p]of f.players)assert.equal(p.queue[0],before.get(id),'planning must preserve '+id);
 assert.equal(independentDeathBatchPayloadR85(payloadFor(f,plan),'p0'),true);
 const taken=takeSingleDeathsR57(f.c,plan);assert.equal(taken.length,9);
 for(let i=1;i<=9;i++){assert.equal(f.players.get('p'+i).queue.length,0);assert.deepEqual(f.players.get('p'+i).deferred,[{type:'action',sequence:1}]);}
 assert.equal(f.players.get('p10').queue[0],before.get('p10'));assert.equal(f.players.get('p11').queue[0],before.get('p11'));
 assert.throws(()=>takeSingleDeathsR57(f.c,plan),/death_batch_plan/);
});

test('full party union still stops at 25 actors before consuming the next party',()=>{
 const f=fixture({partySize:5}),plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.entries.length,4);assert.equal(plan.ids.length,25);assert.equal(plan.targets.length,5);
 assert.deepEqual(actors(plan),['p1','p2','p3','p4']);
 assert.equal(f.players.get('p5').queue.length,1);
 takeSingleDeathsR57(f.c,plan);assert.equal(f.players.get('p5').queue.length,1);
 const g=fixture({partySize:5});g.local.ids.push('extra');g.rows.set('extra',{...g.rows.get('p0'),id:'extra'});g.players.set('extra',{epoch:1,queue:[],deferred:[]});
 const smaller=planSingleDeathsR57(g.runtime,g.context,g.local);assert.equal(smaller.entries.length,3);assert.equal(smaller.ids.length,21);
});

test('nonbasic primary retains the previous four-extra limit',()=>{
 for(const ability of [1,2,3]){
  const f=fixture();f.context.input.ability=ability;
  const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
  assert.equal(plan.entries.length,4,'primary ability '+ability);
  assert.equal(independentDeathBatchPayloadR85(payloadFor(f,plan),'p0'),false);
 }
});

test('mixed area successors retain five total even when more independent heads exist',()=>{
 const f=fixture(),all=[...f.rows.keys()];
 for(const row of f.rows.values())row.role='arkanist';
 for(const id of all)f.groups.set(id,all);
 f.local.ids=all;f.players.get('p1').queue[0].payload.ability=2;
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.scope.kind,'mixed');assert.equal(plan.entries.length,4);
 assert.equal(f.players.get('p5').queue.length,1);
});

test('64 KiB batch limit stops planning before a head is consumed or rejected by the writer',()=>{
 const f=fixture();for(const p of f.players.values())if(p.queue.length)p.queue[0].payload.padding='x'.repeat(12000);
 const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
 assert.equal(plan.entries.length,5);assert(Buffer.byteLength(JSON.stringify(plan.entries))<=65536);
 const next=f.players.get('p6').queue[0];
 assert(Buffer.byteLength(JSON.stringify([...plan.entries,{...plan.entries[0],actor:'p6',input:next.payload}]))>65536);
 assert.equal(f.players.get('p1').queue.length,1);assert.equal(f.players.get('p6').queue[0],next);
 takeSingleDeathsR57(f.c,plan);assert.equal(f.players.get('p6').queue[0],next);
});

test('an older nonattack head and an earlier successor stop selection without overtaking',()=>{
 let f=fixture();f.players.get('p2').queue[0].payload={action:'use_potion'};
 assert.deepEqual(actors(planSingleDeathsR57(f.runtime,f.context,f.local)),['p1']);
 f=fixture();f.players.get('p1').queue.push({order:2.5,at:2.5,receivedAtMs:100,sequence:2,kind:'movement',payload:{action:'move'}});
 assert.deepEqual(actors(planSingleDeathsR57(f.runtime,f.context,f.local)),['p1']);
 f=fixture();f.players.get('p5').queue[0].payload.ability=1;
 assert.deepEqual(actors(planSingleDeathsR57(f.runtime,f.context,f.local)),['p1','p2','p3','p4']);
 assert.equal(f.players.get('p5').queue.length,1);assert.equal(f.players.get('p6').queue.length,1);
});

test('foreign, held, missing and overdue group members cannot enter a larger batch',()=>{
 for(const [label,mutate]of [
  ['foreign channel',f=>f.rows.get('p1').channel=2],
  ['foreign area',f=>f.rows.get('p1').area='frozen'],
  ['barrier',f=>f.players.get('p1-ally1').barrier={}],
  ['external hold',f=>f.players.get('p1-ally1').externalHold='held'],
  ['busy lane',f=>f.busy.add('player:p1-ally1')],
  ['missing resident',f=>f.runtime.localResident=id=>id!=='p1-ally1'],
  ['overdue checkpoint',f=>f.c.checkpoints.overdueR53=id=>id==='p1-ally1'],
  ['no local scope',f=>f.runtime.localKill=()=>null],
  ['duplicate target',f=>f.players.get('p1').queue[0].payload.targetId='m0'],
  ['deferred preview',f=>f.c.attackMemory.plan=()=>({deferred:true})],
 ]){
  const f=fixture({partySize:2});mutate(f);assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null,label);assert.equal(f.players.get('p1').queue.length,1,label);
 }
});

test('unmatched target life cannot obtain the widened allowance',()=>{
 for(const mutate of [
  f=>f.context.input.spawnRound=2,
  f=>f.local.targets[0].spawnRound=2,
  f=>f.players.get('p1').queue[0].payload.spawnRound=2,
 ]){
  const f=fixture();mutate(f);const plan=planSingleDeathsR57(f.runtime,f.context,f.local);
  assert((plan?.entries.length??0)<=4);assert.equal(f.players.get('p1').queue.length,1);
 }
 const f=fixture();f.local.targets=Array.from({length:10},(_,i)=>({id:'m'+i,spawnRound:1}));assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);
});

test('changed secondary epoch or head rejects the complete plan without partial consumption',()=>{
 for(const mutate of [f=>f.players.get('p9').epoch++,f=>f.players.get('p9').queue[0]={...f.players.get('p9').queue[0]}]){
  const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local);mutate(f);
  assert.throws(()=>takeSingleDeathsR57(f.c,plan),/death_batch_queue_changed/);
  for(let i=1;i<=9;i++){assert.equal(f.players.get('p'+i).queue.length,1);assert.equal(f.players.get('p'+i).deferred.length,0);}
 }
});

test('independent successor cannot borrow lead priority over an older remembered resource waiter',()=>{
 const f=fixture(),waiter=f.players.get('p2'),next=f.players.get('p1').queue[0];
 f.c.kernel.running=true;waiter.queue[0].order=2;next.order=3;
 rememberDeferredGroupR57({kernel:f.c.kernel,id:'p2',input:waiter.queue[0].payload,inputOrder:2,ids:['p2'],resources:['monster:m1']});waiter.barrier={};
 assert.equal(olderGroupWaitingR57({kernel:f.c.kernel,id:'p1',input:next.payload,inputOrder:3,ids:['p1'],resources:['monster:m1']}),true);
 assert.equal(planSingleDeathsR57(f.runtime,f.context,f.local),null);assert.equal(f.players.get('p1').queue.length,1);
});

test('AttackLoop leases every expanded actor and target before consuming any of the nine heads',()=>{
 const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local),leased=[];
 const loop=new AttackLoop({memory:{step:()=>({durable:true,boundary:{reason:'defeat',targets:['m0']}}),view:f.c.view},lanes:{busy:()=>false,acquire:keys=>{leased.push(...keys);return null;}},checkpoints:{},combatCheckpoints:{},submit:()=>{},frameFor:()=>({playerId:'p0',player:f.rows.get('p0')}),affectedActors:()=>[],committed:()=>{},publish:()=>{}});
 loop.shared={};loop.localKill=()=>f.local;loop.planBatchR57=()=>plan;loop.takeBatchR57=()=>{throw Error('must_not_consume_without_lease');};
 assert.equal(loop.attack({...f.context,epoch:1}),DEFER_INPUT);
 assert.deepEqual(new Set(leased),new Set([...plan.ids.map(id=>'player:'+id),...plan.targets.map(t=>'monster:'+t.id)]));
 for(let i=1;i<=9;i++)assert.equal(f.players.get('p'+i).queue.length,1);
});

test('wide payload classification rejects cross-scope, duplicate, oversized and incompletely held inputs',()=>{
 const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local),valid=payloadFor(f,plan);
 assert.equal(independentDeathBatchPayloadR85(valid,'p0'),true);
 for(const [label,mutate]of [
  ['mixed scope',p=>p.localScope.kind='mixed'],
  ['shared lease',p=>p.sharedLease='shared-proof'],
  ['special area',p=>p.expected.player.area='black'],
  ['nonbasic primary',p=>p.input.ability=1],
  ['nonbasic secondary',p=>p.batchAttacksR57[8].input.ability=2],
  ['duplicate actor',p=>p.batchAttacksR57[8].actor='p1'],
  ['duplicate target',p=>p.batchAttacksR57[8].input.targetId='m1'],
  ['mismatched life',p=>p.batchAttacksR57[8].input.spawnRound=2],
  ['invalid life',p=>p.localScope.targets[8].spawnRound=-1],
  ['expected life mismatch',p=>p.expected.monster.spawn_round=2],
  ['boss target',p=>p.expected.monster.is_boss=1],
  ['stone target',p=>p.expected.monster.is_stone=1],
  ['foreign primary target',p=>p.expected.monster.channel=2],
  ['missing actor resource',p=>p.resources=p.resources.filter(k=>k!=='player:p9')],
  ['missing target resource',p=>p.resources=p.resources.filter(k=>k!=='monster:m9')],
  ['extra target resource',p=>p.resources.push('monster:other')],
  ['duplicate resource',p=>p.resources.push(p.resources[0])],
  ['more than25 actors',p=>{for(let i=0;i<16;i++)p.resources.push('player:extra'+i);}],
  ['oversized batch',p=>p.batchAttacksR57[8].input.padding='x'.repeat(65536)],
  ['eleventh target',p=>p.localScope.targets.push({id:'m10',spawnRound:1})],
 ]){const p=clone(valid);mutate(p);assert.equal(independentDeathBatchPayloadR85(p,'p0'),false,label);}
});

test('secondary section proof binds all nine actor and sequence slots and rejects absent or changed proof',()=>{
 const result={actorSectionsR52:{actor:'p0'},batchResultsR57:Array.from({length:9},(_,i)=>({actor:'p'+(i+1),sequence:i+2,result:{status:200}})),independentDeathBatchR85:{version:1,actors:Array.from({length:10},(_,i)=>'p'+i),sequences:Array.from({length:9},(_,i)=>i+2),targets:Array.from({length:10},(_,i)=>({id:'m'+i,spawnRound:1}))}};
 assert.equal(independentDeathBatchResultR85(result),true);
 for(const [label,mutate]of [
  ['missing proof',r=>delete r.independentDeathBatchR85],
  ['wrong primary',r=>r.actorSectionsR52.actor='other'],
  ['wrong final actor',r=>r.batchResultsR57[8].actor='other'],
  ['wrong final sequence',r=>r.batchResultsR57[8].sequence++],
  ['duplicate actor',r=>r.independentDeathBatchR85.actors[9]='p1'],
  ['duplicate target',r=>r.independentDeathBatchR85.targets[9]={...r.independentDeathBatchR85.targets[1]}],
  ['missing final answer',r=>r.batchResultsR57.pop()],
  ['unrecognized proof field',r=>r.independentDeathBatchR85.extra=true],
 ]){const r=clone(result);mutate(r);assert.equal(independentDeathBatchResultR85(r),false,label);}
});

test('parent preflight checks every secondary and rejects mixed, nonbasic and oversized wide scopes before delegation',()=>{
 const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local),valid=payloadFor(f,plan),context={actor:'p0',epoch:1},seen=[];
 const guard=(_sql,p,c,kind)=>{seen.push([c.actor,c.epoch,kind,p.input.targetId]);return true;};
 guardDeathBatchActorsR57(null,valid,context,guard);
 assert.deepEqual(seen,Array.from({length:9},(_,i)=>['p'+(i+1),1,'attack','m'+(i+1)]));
 for(const mutate of [p=>p.localScope.kind='mixed',p=>p.input.ability=1,p=>p.batchAttacksR57[8].input.padding='x'.repeat(65536),p=>p.resources=p.resources.filter(k=>k!=='player:p9')]){
  const p=clone(valid);mutate(p);seen.length=0;
  assert.throws(()=>guardDeathBatchActorsR57(null,p,context,guard),{code:'death_batch_guard_scope'});assert.deepEqual(seen,[]);
 }
});

test('writer validates all nine owners before the first native call and retains all nine known-negative replies',()=>{
 const f=fixture(),plan=planSingleDeathsR57(f.runtime,f.context,f.local),valid=payloadFor(f,plan),seen=[];
 // Metadata-only port refuses portal certification; no native game SQL runs.
 const sql={isTransaction:true,prepare:query=>{
  if(/^PRAGMA (main|temp)\.schema_version$/.test(query))return {get:()=>({schema_version:1})};
  if(query.startsWith("SELECT 'main' scope,name,sql FROM main.sqlite_schema"))return {all:()=>[{scope:'main',name:'unit_unknown_trigger',sql:'unit'}]};
  throw Error('no_native_sql_in_unit');
 }},context={actor:'p0',epoch:1,key:'unit-key',sequence:1,realm:'realm',peer:{channel:1,incarnation:'boot'}},negative={status:409,body:{not_executed:true}};
 const dependencies={assertOwnership:(_sql,_peer,actor,epoch)=>{seen.push(['owner',actor,epoch]);return true;},guardActor:(_sql,_p,c)=>{seen.push(['guard',c.actor]);},runContext:(_p,work)=>work(),execute:()=>{seen.push(['execute']);return {r53Rejected:'p0',result:negative};}};
 const answer=executeDeathBatchR57(sql,valid,context,dependencies);
 assert.deepEqual(seen,Array.from({length:9},(_,i)=>[['owner','p'+(i+1),1],['guard','p'+(i+1)]]).flat().concat([['execute']]));
 assert.deepEqual(answer.batchResultsR57,plan.entries.map(e=>({actor:e.actor,sequence:e.sequence,result:negative})));
 for(const mutate of [p=>{p.localScope.kind='mixed';p.localScope.area='forest';},p=>p.input.ability=1,p=>p.batchAttacksR57[8].input.ability=2]){
  const p=clone(valid);mutate(p);seen.length=0;
  assert.throws(()=>executeDeathBatchR57(sql,p,context,dependencies),{code:'death_batch_scope'});assert.deepEqual(seen,[]);
 }
});
