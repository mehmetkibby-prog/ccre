import test from 'node:test';
import assert from 'node:assert/strict';
import {FixedLoop} from '../working/core511-source/scripts/core511/fixed-loop.mjs';
import {planSingleDeathsR57,takeSingleDeathsR57} from '../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {rememberDeferredGroupR57} from '../working/core511-source/scripts/core511/group-fairness-r57.mjs';

function fixture({incoming='incoming-secondary',party=false,future=false,waiter=false,nonbasic=false}={}){
 const now=10000,ids=['primary','secondary',...(waiter?['waiter']:[]),...(nonbasic?['blocker']:[])];
 const rows=new Map(ids.map(id=>[id,Object.freeze({id,account_id:'account-'+id,role:'muhafiz',area:'forest',channel:1,arena_match_id:'',hp:100,max_hp:100,realtime_scope_version:1})]));
 const owners=new Map(ids.map(id=>[id,{state:'active',epoch:1,pending:0,channel:1,incarnation:'test'}]));
 const state={channel:1,owners,read:(_kind,id)=>rows.get(id),assertOwner(id,epoch){const owner=owners.get(id);assert.equal(owner.epoch,epoch);return owner;}};
 let monotonic=now;
 const kernel=new FixedLoop({state,clock:()=>monotonic++,wall:()=>now,send(){},rules:{movement(){},combat(){},ai(){},respawn(){},project(){}}});
 kernel.stopped=false;for(const id of ids)kernel.admit(id,1);
 const primary={action:'attack',ability:0,targetId:'monster-primary',spawnRound:1,intentId:'primary'},secondary={action:'attack',ability:0,targetId:'monster-secondary',spawnRound:1,intentId:'secondary'};
 kernel.metrics.inputs=1;kernel.players.get('primary').lastAccepted=1;
 if(nonbasic)kernel.enqueue('blocker',{sequence:1,epoch:1,kind:'combat',payload:{action:'cast_support456'}});
 kernel.enqueue('secondary',{sequence:1,epoch:1,kind:'combat',payload:secondary});
 const secondaryHead=kernel.players.get('secondary').queue[0];
 kernel.acceptedAtStartR86=new Map(ids.map(id=>[id,id==='secondary'&&future?0:kernel.players.get(id).lastAccepted]));
 let due=[{monster_id:incoming,spawn_round:1,next_hit_at_ms:now-1}],calls=0,previews=0;
 const order=[];
 const channel={kernel,state,view:{player:id=>rows.get(id),monster:id=>({id,area:'forest',channel:1,hp:1,spawn_round:1}),monsters:new Map()},checkpoints:{overdueR53:()=>false},retaliationMemory:{due:id=>id==='secondary'?due:[]},identities:new Map(ids.map(id=>[id,{actor:id}])),ports:{guard:()=>true},mounts:{enabled:false,rejectAction:()=>false},lanes:{busy:()=>false},frames:{attack:(id,input)=>({id,input,player:rows.get(id)})},attack:{beforeOrdinaryAttackR86({id}){assert.equal(id,'secondary');calls++;order.push('settle');rows.set(id,Object.freeze({...rows.get(id),hp:93}));due=[];return true;}},attackMemory:{participants:new Map(),plan(frame){previews++;order.push('preview');assert.equal(frame.player.hp,93,'native planning frame must be read after due AI settlement');assert.equal(due.length,0);return {durable:true,boundary:{reason:'defeat'}};}}};
 const runtime={channel,forceSharedActors:new Map(),localResident:()=>true,localGroup:id=>party&&id==='secondary'?['secondary','other-party-member']:[id],localKill:id=>({ids:[id],targets:[{id:'monster-'+id,spawnRound:1}]})};
 if(waiter){
  const p=kernel.players.get('waiter'),input={action:'attack',targetId:incoming};
  p.queue.push({sequence:1,kind:'combat',payload:input,order:0,receivedAtMs:now-1,at:now-1});p.lastAccepted=1;kernel.running=true;
  rememberDeferredGroupR57({kernel,id:'waiter',input,inputOrder:0,ids:['waiter'],resources:['monster:'+incoming]});
  p.barrier=Promise.resolve(); // Existing accepted older waiter is absent from the active-head iterator.
 }
 return {kernel,channel,rows,order,secondaryHead,plan:()=>planSingleDeathsR57(runtime,{id:'primary',input:primary,inputOrder:1,now,kernel},{ids:['primary'],targets:[{id:'monster-primary',spawnRound:1}]}),calls:()=>calls,previews:()=>previews};
}

test('independent secondary settles due AI before its frame, but only take consumes input',()=>{
 const f=fixture(),p=f.kernel.players.get('secondary'),plan=f.plan();
 assert(plan);assert.equal(plan.entries.length,1);assert.equal(f.calls(),1);assert.equal(f.previews(),1);assert.deepEqual(f.order,['settle','preview']);
 assert.equal(f.rows.get('secondary').hp,93);assert.equal(p.queue[0],f.secondaryHead);assert.equal(p.lastApplied,0);assert.equal(p.deferred.length,0);
 const entries=takeSingleDeathsR57(f.channel,plan);assert.equal(entries.length,1);assert.equal(p.queue.length,0);assert.deepEqual(p.deferred,[{type:'action',sequence:1}]);assert.equal(p.lastApplied,0);assert.equal(f.calls(),1);
});

for(const [name,options]of [
 ['incoming attacker is an earlier kill target',{incoming:'monster-primary'}],
 ['secondary belongs to a party',{party:true}],
 ['an older overlapping waiter is already fenced',{waiter:true}],
 ['secondary arrived after the exact tick watermark despite the same timestamp',{future:true}],
 ['an earlier nonbasic input separates the FIFO prefix',{nonbasic:true}]
])test(name+' leaves AI and accepted head untouched',()=>{
 const f=fixture(options),p=f.kernel.players.get('secondary');assert.equal(f.plan(),null);assert.equal(f.calls(),0);assert.equal(f.previews(),0);
 assert.equal(f.rows.get('secondary').hp,100);assert.equal(p.queue[0],f.secondaryHead);assert.equal(p.lastApplied,0);assert.equal(p.deferred.length,0);
});
