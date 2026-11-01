// Baseline defect reproduction, not a desired-behavior regression suite.
// Uses exact production scheduler, ResidentState, FixedLoop, and ResourceLanes.
// Writer/checkpoint ports are controlled; this is not a native integration/FPS test.
import assert from 'node:assert/strict';
import {test,after} from 'node:test';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {AdventureChannel} from '../../working/core511-source/scripts/core511/adventure-channel.mjs';
import {ResidentState} from '../../working/core511-source/scripts/core511/resident-state.mjs';
import {FixedLoop} from '../../working/core511-source/scripts/core511/fixed-loop.mjs';
import {ResourceLanes} from '../../working/core511-source/scripts/core511/resource-lanes.mjs';
import {DungeonChannel} from '../../working/core511-source/scripts/core511/dungeon-channel.mjs';
import {DungeonLoop} from '../../working/core511-source/scripts/core511/dungeon-loop.mjs';

const observations=[];
function deferred(){let resolve;const promise=new Promise(yes=>resolve=yes);return {promise,resolve};}
function fixture({kind='mist',count=3}={}){
 const state=new ResidentState(1),faults=[],submitted=[],lanes=new ResourceLanes();
 const kernel=new FixedLoop({state,send:()=>{},clock:()=>1000,wall:()=>1000,onFatal:e=>faults.push(e.code??e.message),rules:Object.fromEntries(['movement','combat','ai','respawn','project'].map(name=>[name,()=>null]))});
 const runs=Array.from({length:count},(_,i)=>{
  const id=String.fromCharCode(97+i),runId=id.repeat(32),area=kind==='tower'?`kadim_${runId}_01`:`sis_${runId}`;
  state.put('players',{id,channel:1,cycle:1,area,x:800,y:940,hp:100});state.claim(id,1);kernel.admit(id,1);
  return {id:runId,kind,channel:1,area,status:'active',cycle:1,revision:1,deadline_ms:i===0?900:10000,config:{patterns:{}},state:{floor:1,clear:false,nextWaveAt:0}};
 });
 const channel={state,kernel,lanes,backgroundPaused:false,world:{cycle:1},owners:state.owners,
  view:{players:state.table('players'),monsters:state.table('monsters'),player:id=>state.read('players',id)},
  checkpoints:{drain:async()=>{}},combatCheckpoints:{drain:async()=>{}},writer:{finalSequence:()=>0},
  systemWriter:{submit:async event=>{submitted.push({runId:event.payload.runId,actors:event.payload.actors.map(p=>p.id)});const run=runs.find(r=>r.id===event.payload.runId);return {key:event.key,result:{run:{...run,status:'closed',revision:run.revision+1,state:{...run.state,clear:true}}}};}},
  fail:e=>faults.push(e.code??e.message)};
 const adventure=new AdventureChannel({channel,services:{adventureProfiles:new Map()},clock:()=>1000},{runs});adventure.pruneAt=Infinity;
 runs.forEach((run,i)=>adventure.bundles.set(String.fromCharCode(97+i),{member:{run_id:run.id,departed:0}}));
 return {state,kernel,lanes,channel,adventure,runs,submitted,faults};
}
async function settle(f){await f.adventure.drain();await Promise.resolve();assert.deepEqual(f.faults,[]);}
function ticks(f,count=20){for(let i=0;i<count;i++)f.adventure.tick(1000+i*50);}

for(const kind of ['mist','tower'])test(`baseline ${kind}: real actor A durable barrier prevents due disjoint rooms B/C from being submitted`,async()=>{
 const f=fixture({kind}),gate=deferred(),barrier=f.kernel.durableGroup(['a'],()=>gate.promise,{emitReceipt:false});
 assert.equal(f.kernel.players.get('a').barrier,gate.promise);assert.equal(f.state.owners.get('a').pending,1);
 ticks(f);assert.deepEqual(f.submitted,[]);assert.equal(f.adventure.pending,null);assert.equal(f.lanes.tokens.size,0);
 observations.push({case:`${kind}-durable-barrier`,ticks:20,blockedActor:'a',dueIndependentActors:['b','c'],submissionsWhileBlocked:0});
 gate.resolve({ok:true});await barrier;await Promise.resolve();
 // Baseline control: each room is runnable and receives exactly one write after
 // A's independently-created barrier resolves. The controlled ACK closes it.
 for(let i=0;i<3;i++){f.adventure.tick(2000+i*50);await settle(f);}
 assert.deepEqual(f.submitted.map(e=>e.actors),[['a'],['b'],['c']]);
 observations.at(-1).afterBarrierReleased=f.submitted.map(e=>e.actors[0]);
});

test('baseline: trusted quiesce keeps expired A due while B/C remain unscheduled',async()=>{
 const f=fixture(),gate=deferred(),barrier=f.kernel.durableGroup(['a'],()=>gate.promise,{emitReceipt:false});
 const quiesced=f.kernel.quiesce('a',1);assert.ok(f.kernel.players.get('a').quiescer);ticks(f);assert.deepEqual(f.submitted,[]);
 gate.resolve({ok:true});await barrier;await Promise.resolve();f.kernel.finishQuiescing();await quiesced;
 assert.equal(f.kernel.players.get('a').suspended,true);assert.equal(f.state.owners.get('a').state,'quiesced');
 ticks(f);assert.deepEqual(f.submitted,[]);assert.equal(f.runs[0].deadline_ms,900);
 observations.push({case:'quiesce-to-suspended',ticks:40,submissions:0,actorStillOwned:true,expiredDeadline:900});
 f.kernel.resume('a',1);f.adventure.tick(2100);await settle(f);assert.deepEqual(f.submitted.map(e=>e.actors),[['a']]);
});

test('baseline: actual conflicting room lane also suppresses disjoint rooms',async()=>{
 const f=fixture(),hold=f.lanes.acquire(['adventure:'+f.runs[0].id],'independent-room-operation');assert.ok(hold);
 ticks(f);assert.deepEqual(f.submitted,[]);assert.equal(f.adventure.pending,null);
 f.lanes.release(hold);f.adventure.tick(2100);await settle(f);assert.deepEqual(f.submitted.map(e=>e.actors),[['a']]);
 observations.push({case:'room-lane-busy',ticks:20,submissionsWhileBlocked:0});
});

test('DungeonChannel and DungeonLoop tick skip a real actor barrier and visit both later rooms',async()=>{
 const f=fixture(),gate=deferred(),barrier=f.kernel.durableGroup(['a'],()=>gate.promise,{emitReceipt:false});
 const runs=new Map(f.runs.map((r,i)=>[r.id,{run:{id:r.id,members:[{id:String.fromCharCode(97+i),left:false}],leaderId:String.fromCharCode(97+i)},lastTick:900}]));
 const channelVisits=[],loopVisits=[],resident={runs,pending:new Map(),lastTick:900,step:(id,operation)=>{loopVisits.push(id);return {durable:false};}};
 const dungeon=Object.assign(Object.create(DungeonChannel.prototype),{channel:f.channel,pending:new Map(),resident,start:(id,operation)=>channelVisits.push(id)});
 dungeon.tick({now:1000});new DungeonLoop(resident).tick({now:1000,kernel:f.kernel});
 assert.deepEqual(channelVisits,['b','c']);assert.deepEqual(loopVisits,['b','c']);assert.deepEqual(f.submitted,[]);
 gate.resolve({ok:true});await barrier;await Promise.resolve();
 observations.push({case:'dungeon-analogues',exactReadyAndTick:true,controlledStartOrStep:true,channelVisits,loopVisits});
});

after(async()=>{
 const source={};for(const file of ['adventure-channel.mjs','adventure-service.mjs','fixed-loop.mjs','channel-runtime.mjs','dungeon-channel.mjs','dungeon-loop.mjs']){const path=new URL('../../working/core511-source/scripts/core511/'+file,import.meta.url),bytes=await readFile(path);source[file]={path:path.pathname,sha256:createHash('sha256').update(bytes).digest('hex')};}
 await writeFile(new URL('./adventure-scheduler-review-evidence.json',import.meta.url),JSON.stringify({scope:'Exact production scheduler/kernel/state/lanes component reproduction, controlled writer/checkpoint ports. Not a native process, SQL, latency, or full-game FPS measurement.',baselineExpectedDefect:true,source,observations},null,2)+'\n');
});
