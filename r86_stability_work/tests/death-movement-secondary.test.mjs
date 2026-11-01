import test from 'node:test';
import assert from 'node:assert/strict';
import {FixedLoop} from '../working/core511-source/scripts/core511/fixed-loop.mjs';
import {ResidentChannel} from '../working/core511-source/scripts/core511/resident-channel.mjs';
import {previewDeathR54,acceptDeathPreviewR54} from '../working/core511-source/scripts/core511/reward-reply-r54.mjs';
import {planSingleDeathsR57,takeSingleDeathsR57} from '../working/core511-source/scripts/core511/death-batch-single-r57.mjs';
import {deathBatchReplyR57} from '../working/core511-source/scripts/core511/death-batch-channel-r57.mjs';
import {beginDeathMovementR86,deathMovementPermitR86,runDeathMovementR86,stopDeathMovementR86,rejectDeathMovementR86,rejectDeathResultsR86} from '../working/core511-source/scripts/core511/death-movement-r86.mjs';

function fixture(){
 const now=10000,ids=['primary','secondary'],rows=new Map(ids.map(id=>[id,Object.freeze({id,account_id:'account-'+id,role:'muhafiz',area:'forest',channel:1,arena_match_id:'',hp:100,max_hp:100,x:10,y:10,position_revision:1,movement_checked_at_ms:9000,movement_debt_ms:0,motion_stream_id:'fixture-stream-1',motion_sequence:1,last_movement_at_ms:9000,last_seen:9,root_until_ms:0,stun_until_ms:0,realtime_scope_version:1})]));
 const owners=new Map(ids.map(id=>[id,{state:'active',epoch:1,pending:0,channel:1,incarnation:'fixture'}]));
 const state={channel:1,owners,read:(kind,id)=>rows.get(id),assertOwner(id,epoch){const owner=owners.get(id);assert.equal(owner.epoch,epoch);return owner;},changes:()=>({})};
 let guardAllowed=true,resident;
 const kernel=new FixedLoop({state,clock:()=>now,wall:()=>now,send(){},rules:{movement:ctx=>ResidentChannel.prototype.action.call(resident,ctx),combat(){throw Error('combat must stay fenced');},ai(){},respawn(){},project(){return null;}}});
 kernel.stopped=false;for(const id of ids)kernel.admit(id,1);
 const inputs=ids.map((id,i)=>({action:'attack',ability:0,targetId:'monster-'+id,spawnRound:1,intentId:'intent-'+id}));
 const monsters=new Map(ids.map(id=>['monster-'+id,{id:'monster-'+id,area:'forest',channel:1,hp:1,max_hp:1,is_boss:0,is_stone:0,spawn_round:1}]));
 const preview=(id,input)=>previewDeathR54([{target:monsters.get(input.targetId),rolled:2}],m=>monsters.get(m),{player:{...rows.get(id),world_cycle:1},payload:input},{reserved_until:now+100},now);
 const checkpointEntries=new Map(ids.map(id=>[id,{epoch:1,pending:null,joinedR53:{payload:{current:{...rows.get(id)}}}}]));
 const lease={state:'held',keys:[...ids.map(id=>'player:'+id),...inputs.map(i=>'monster:'+i.targetId)]};
 const lanes={busy:()=>false,owns:(held,key)=>held===lease&&lease.keys.includes(key),assert:held=>assert.equal(held,lease)};
 const channel={kernel,state,view:{player:id=>rows.get(id),monsters,engagements:new Map()},checkpoints:{entries:checkpointEntries,overdueR53:()=>false},retaliationMemory:{due:()=>[]},identities:new Map(ids.map(id=>[id,{actor:id,account:'account-'+id}])),ports:{guard:()=>true},mounts:{enabled:false,rejectAction:()=>false},lanes,frames:{attack:(id,input)=>({id,input})},attackMemory:{participants:new Map(),plan:frame=>({boundary:{replyR54:preview(frame.id,frame.input)}})}};
 const runtime={channel,forceSharedActors:new Map(),localResident:()=>true,localGroup:id=>[id],localKill:(id,plan)=>({ids:[id],targets:[{id:'monster-'+id,spawnRound:1}]})};
 kernel.metrics.inputs=1;kernel.players.get('primary').lastAccepted=1;
 kernel.enqueue('secondary',{sequence:1,epoch:1,kind:'combat',payload:inputs[1]});
 const plan=planSingleDeathsR57(runtime,{id:'primary',input:inputs[0],inputOrder:1,now,kernel},{ids:['primary'],targets:[{id:'monster-primary',spawnRound:1}]});
 assert(plan);const entries=takeSingleDeathsR57(channel,plan);assert.equal(entries.length,1);
 const events=[],loop={lanes,checkpoints:channel.checkpoints,publish:(...e)=>events.push(e)};
 const primaryPreview=acceptDeathPreviewR54(preview('primary',inputs[0]),lease);
 let finish;
 const completion=new Promise(resolve=>{finish=resolve;});
 const pending=kernel.durableGroup(ids,()=>completion,{replyTo:'primary',emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result}),groupAckResult:(ack,prior,id)=>deathBatchReplyR57(ack,prior,id,entries)});
 kernel.settled(kernel.players.get('primary'),{...primaryPreview,sequence:1});
 const group=beginDeathMovementR86(loop,{kernel,id:'primary',input:inputs[0],ids,lease,preview:primaryPreview,entries,joined:true});assert(group);
 const movement={checkpoints:channel.checkpoints,contextFor:(id,input)=>({id}),publish:(...e)=>events.push(e),memory:{view:channel.view,step({id,payload,nowMs}){const next={...rows.get(id),x:payload.x,position_revision:rows.get(id).position_revision+1,movement_checked_at_ms:nowMs,motion_sequence:payload.motionSequence};return {durable:false,result:{status:200,body:{x:next.x}},changes:{players:[next],engagements:[]},events:[],security:[]};},commit(proposal){for(const p of proposal.changes.players)rows.set(p.id,Object.freeze(p));}}};
 resident={kernel,identities:channel.identities,ports:{guard:()=>guardAllowed?true:{status:429,body:{error:'rate limit'}}},movement:{moveDuringDeathR86:(ctx,permit)=>runDeathMovementR86(movement,ctx,permit)}};
 const ack={result:{result:{status:200,body:{kill:true}},batchResultsR57:[{actor:'secondary',sequence:1,result:{status:200,body:{kill:true}}}]}};
 return {kernel,group,rows,events,lease,entries,pending,finish:()=>finish(ack),setGuard:value=>{guardAllowed=value;},enqueue(id,sequence,x){kernel.enqueue(id,{epoch:1,sequence,kind:'movement',payload:{action:'move',x,motionSequence:sequence}});},now};
}

test('real secondary plan settles one 202 and later moves never regress on durable ACK',async()=>{
 const f=fixture(),p=f.kernel.players.get('secondary');
 assert.equal(p.deferred.length,0);assert.equal(p.settled.filter(r=>r.sequence===1&&r.status===202).length,1);
 f.enqueue('secondary',2,11);f.enqueue('secondary',3,12);await f.kernel.tick();
 assert.equal(p.lastApplied,3);assert.equal(f.rows.get('secondary').x,12);assert.equal(p.deferred.length,0);
 stopDeathMovementR86(f.group);f.finish();await f.pending;await Promise.resolve();
 assert.equal(p.barrier,null);assert.equal(p.lastApplied,3);assert.deepEqual(p.settled.map(r=>r.sequence),[1,2,3]);assert.equal(f.kernel.failure,null);
});

test('guard rejection stays queued during death and cannot become an attack ACK',async()=>{
 const f=fixture(),p=f.kernel.players.get('primary');f.enqueue('primary',2,11);f.enqueue('primary',3,12);f.setGuard(false);
 await f.kernel.tick();assert.equal(p.lastApplied,1);assert.deepEqual(p.queue.map(r=>r.sequence),[2,3]);assert.equal(p.deferred.length,0);
 f.setGuard(true);await f.kernel.tick();assert.equal(p.lastApplied,3);assert.equal(p.deferred.length,0);
 stopDeathMovementR86(f.group);f.finish();await f.pending;await Promise.resolve();
 assert.equal(p.lastApplied,3);assert.deepEqual(p.settled.map(r=>r.sequence),[1,2,3]);assert.equal(p.settled[1].body.kill,undefined);assert.equal(f.kernel.failure,null);
});

test('secondary rejection event is idempotent and does not rewind settled movement',async()=>{
 const f=fixture(),p=f.kernel.players.get('secondary');f.enqueue('secondary',2,11);await f.kernel.tick();
 stopDeathMovementR86(f.group);rejectDeathMovementR86(f.group,f.now);rejectDeathMovementR86(f.group,f.now);
 assert.equal(f.events.filter(e=>e[3]?.type==='monster_reject'&&e[3].attackerId==='secondary').length,1);
 assert.equal(deathMovementPermitR86(f.kernel,'secondary'),null);assert.equal(p.lastApplied,2);assert.equal(p.deferred.length,0);
 f.finish();await f.pending;await Promise.resolve();assert.equal(p.lastApplied,2);assert.deepEqual(p.settled.map(r=>r.sequence),[1,2]);
});

test('early-settled secondary still requires one exact final result per captured actor',async()=>{
 const f=fixture();stopDeathMovementR86(f.group);
 const row={actor:'secondary',sequence:1,result:{status:200,body:{}}};
 for(const batchResultsR57 of [[],[row,row],[row,{...row,actor:'foreign'}],[{...row,sequence:99}]]){
  assert.throws(()=>rejectDeathResultsR86(f.group,{result:{status:200,body:{}},batchResultsR57},f.now));
 }
 assert.doesNotThrow(()=>rejectDeathResultsR86(f.group,{result:{status:200,body:{}},batchResultsR57:[row]},f.now));
 f.finish();await f.pending;
});
