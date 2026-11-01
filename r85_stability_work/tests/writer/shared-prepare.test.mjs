import test from 'node:test';
import assert from 'node:assert/strict';
import {gate,turns} from './freeze-fixture.mjs';
const base=process.env.R85_TEST_BASELINE==='1'?'../../working/core511-source/scripts/core511/':'../../working/core511-source/scripts/core511/';
const {SharedCombatBridge}=await import(base+'shared-combat-bridge.mjs');

async function fixture({pause=null}={}){
 const events=[],recoveries=[],timers=[],cleared=[],gates=new Map(),answers=new Map(),owners=new Map(),processes=new Map(),pauseGate=gate();
 for(let channel=1;channel<=4;channel++){
  const peer={channel,incarnation:'boot-'+channel,realm:'r85-fixture'},id=channel===1?'source-actor':'peer-'+channel;
  owners.set(id,{player_id:id,epoch:1,channel,incarnation:peer.incarnation,sequence:0,state:'active'});gates.set(channel,gate());
  processes.set(channel,{peer,online:true,control:{async request(method,payload){
   events.push({channel,method,token:payload.token});
   if(method===pause)await pauseGate.promise;
   if(method==='shared_hold'){const answer={token:payload.token,channel,incarnation:peer.incarnation,actors:channel===1?[]:[{id,epoch:1,sequence:0}]};answers.set(channel,answer);await gates.get(channel).promise;return answer;}
   if(method==='shared_abort')return {token:payload.token,channel,incarnation:peer.incarnation,aborted:true};
   throw Error('Unexpected channel method '+method);
  }}});
 }
 const core={realmId:'r85-fixture',recoveringWorld:false,writer:{owners},authority:{owner:id=>owners.get(id),admission:id=>({session_id:'session-'+id,epoch:1})},sessions:new Map(),permanent:{entries:new Map()},transitions:new Map(),transferGroups:new Set(),actorIsolation:{entries:new Map(),unknownActors:new Map()},onFault:()=>{},processes};
 const worldControl={async request(method,payload){events.push({channel:0,method});if(method===pause)await pauseGate.promise;if(method==='shared_acquire')return {proof:'world-proof-'+payload.id};if(method==='shared_checkpoint')return {checkpointed:true};if(method==='shared_finish')return {finished:true};throw Error('Unexpected world method '+method);}};
 const world={core,row:{state:'running',exited:false,control:worldControl,peer:{channel:0,incarnation:'world-boot'}},global:{recover(issue){recoveries.push(issue);}}};
 const bridge=new SharedCombatBridge(world,{set(fn,ms){const timer={fn,ms,unref(){}};timers.push(timer);return timer;},clear:timer=>cleared.push(timer)});core.sharedWorld={combat:bridge};
 const peer=processes.get(1).peer,id='shared-fixture-operation-0001',source={...peer,actor:'source-actor',epoch:1};
 const grant=await bridge.reserve(source,id),payload={id,actor:source.actor,epoch:1,proof:grant.proof,players:[source.actor]};
 return {core,bridge,world,peer,payload,events,recoveries,gates,answers,owners,timers,cleared,pauseGate,release:channel=>gates.get(channel).resolve()};
}

test('shared transport error starts recovery while another hold has no reply',async()=>{
 const s=await fixture(),error=Object.assign(Error('control_stream_failed'),{code:'control_stream_failed'});let result,settled=false;
 const pending=s.bridge.prepare(s.peer,s.payload).catch(e=>result=e).finally(()=>settled=true);
 await turns();s.gates.get(1).reject(error);await turns(80);
 const early={settled,recovering:s.core.recoveringWorld,recoveries:s.recoveries.length};
 // Finish late transport promises solely to show they cannot make a second
 // recovery request or turn the already-failed preparation into a grant.
 for(const channel of [2,3,4])s.release(channel);await pending;await turns(80);
 assert.deepEqual(early,{settled:true,recovering:true,recoveries:1});assert.equal(result,error);assert.equal(s.recoveries.length,1);assert.equal(s.bridge.terminal.phase,'freezing');assert(!s.events.some(e=>e.method==='shared_checkpoint'||e.method==='shared_abort'));
});

test('shared prepare cannot remain silent forever; deadline only escalates recovery',async()=>{
 const s=await fixture();let result,settled=false;
 const pending=s.bridge.prepare(s.peer,s.payload).catch(e=>result=e).finally(()=>settled=true);await turns();
 const deadline=s.timers.find(timer=>timer.ms===10000);deadline?.fn();await turns(80);
 const early={deadline:Boolean(deadline),settled,recoveries:s.recoveries.length};
 for(const channel of [1,2,3,4])s.release(channel);await pending;await turns(80);
 assert.deepEqual(early,{deadline:true,settled:true,recoveries:1});assert.equal(result.code,'cold_freeze_deadline');assert.equal(s.core.recoveringWorld,true);assert.equal(s.bridge.terminal.phase,'freezing');assert(!s.events.some(e=>e.method==='shared_abort'||e.method==='shared_checkpoint'));
});

test('healthy shared prepare waits for every exact hold before its world checkpoint',async()=>{
 const s=await fixture();let settled=false;
 const pending=s.bridge.prepare(s.peer,s.payload).finally(()=>settled=true);await turns();for(const channel of [1,2,3])s.release(channel);await turns(80);
 assert.equal(settled,false);assert(!s.events.some(e=>e.method==='shared_checkpoint'));s.release(4);const result=await pending;
 assert.equal(result.prepared,true);assert.equal(s.bridge.terminal.phase,'frozen');assert.equal(s.bridge.terminal.channels.length,4);assert.equal(s.events.filter(e=>e.method==='shared_checkpoint').length,1);assert.equal(s.core.recoveringWorld,false);assert.equal(s.recoveries.length,0);
});

test('structured pending abort still joins every started hold and never sends a gameplay command',async()=>{
 const s=await fixture();let settled=false;
 const pending=s.bridge.prepare(s.peer,s.payload).finally(()=>settled=true);await turns();
 Object.assign(s.answers.get(2),{aborted:true,rejected:{actor:'peer-2',epoch:1,code:'actor_command_pending'}});
 s.core.actorIsolation.unknownActors.set('peer-2',new Set([{owners:[{id:'peer-2',owner:{...s.owners.get('peer-2')}}]}]));
 for(const channel of [1,2,3])s.release(channel);await turns(80);assert.equal(settled,false);assert(!s.events.some(e=>e.method==='shared_abort'));
 s.release(4);assert.deepEqual(await pending,{prepared:false,rejected:true});assert.equal(s.bridge.terminal,null);assert.equal(s.events.filter(e=>e.method==='shared_abort').length,4);assert.equal(s.events.filter(e=>e.method==='shared_finish').length,1);assert(!s.events.some(e=>e.method==='shared_checkpoint'));assert.equal(s.recoveries.length,0);
});

test('late old hold replies cannot freeze or recover a newly installed shared terminal',async()=>{
 const s=await fixture();let result;
 const pending=s.bridge.prepare(s.peer,s.payload).catch(e=>result=e);await turns();const old=s.bridge.terminal;
 s.core.recoveringWorld=true;s.world.row.exited=true;s.bridge.recovered();
 s.world.row={...s.world.row,exited:false,peer:{channel:0,incarnation:'new-world-boot'}};
 const replacement={phase:'freezing',channels:[],token:'replacement-token',row:{id:'replacement-operation'}};s.bridge.terminal=replacement;s.core.recoveringWorld=false;
 for(const channel of [1,2,3,4])s.release(channel);await pending;await turns(80);
 assert.equal(result?.code,'shared_prepare_superseded');assert.equal(s.bridge.terminal,replacement);assert.equal(replacement.phase,'freezing');assert.equal(replacement.channels.length,0);assert.equal(old.phase,'freezing');assert.equal(old.channels.length,0);assert.equal(s.recoveries.length,0);assert(!s.events.some(e=>e.method==='shared_checkpoint'));
});

for(const pause of ['shared_checkpoint','shared_abort','shared_finish'])test('late '+pause+' ACK cannot clear or recover replacement terminal',async()=>{
 const s=await fixture({pause});let result,settled=false;
 const pending=s.bridge.prepare(s.peer,s.payload).catch(e=>result=e).finally(()=>settled=true);await turns();const old=s.bridge.terminal;
 if(pause!=='shared_checkpoint'){
  Object.assign(s.answers.get(2),{aborted:true,rejected:{actor:'peer-2',epoch:1,code:'actor_command_pending'}});
  s.core.actorIsolation.unknownActors.set('peer-2',new Set([{owners:[{id:'peer-2',owner:{...s.owners.get('peer-2')}}]}]));
 }
 for(const channel of [1,2,3,4])s.release(channel);await turns(120);assert.equal(settled,false);assert(s.events.some(e=>e.method===pause));
 s.core.recoveringWorld=true;s.world.row.exited=true;s.bridge.recovered();
 s.world.row={...s.world.row,exited:false,peer:{channel:0,incarnation:'new-world-boot'}};
 const replacement={phase:'freezing',channels:[],token:'replacement-token',row:{id:'replacement-operation'}};s.bridge.terminal=replacement;s.core.recoveringWorld=false;
 s.pauseGate.resolve();await pending;await turns(80);
 assert.equal(result?.code,'shared_prepare_superseded');assert.equal(s.bridge.terminal,replacement);assert.equal(replacement.phase,'freezing');assert.equal(old.phase,'freezing');assert.equal(s.recoveries.length,0);
 if(pause==='shared_abort')assert(!s.events.some(e=>e.method==='shared_finish'));
});
