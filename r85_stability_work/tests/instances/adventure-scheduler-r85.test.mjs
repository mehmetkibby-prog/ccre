import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const CORE=path.join(ROOT,'working/core511-source/scripts/core511');
const DIR=path.join(ROOT,'candidates/adventure-scheduler-r85');
const manifest=JSON.parse(await readFile(path.join(DIR,'manifest.json'),'utf8'));
const sha=s=>createHash('sha256').update(s).digest('hex');
async function load(name,expected){
 const source=await readFile(path.join(DIR,name),'utf8');assert.equal(sha(source),expected);
 // The complete pinned class is loaded; only relative import resolution moves
 // back to its real current source directory. No method is extracted/replaced.
 const resolved=source.replace(/from '(\.\/[^']+)'/g,(_,relative)=>`from '${pathToFileURL(path.join(CORE,relative)).href}'`);
 return (await import('data:text/javascript;base64,'+Buffer.from(resolved).toString('base64'))).AdventureChannel;
}
const [Baseline,Candidate,{FixedLoop},{ResourceLanes},{ResidentState},{mapArea}]=await Promise.all([
 load('baseline-adventure-channel.mjs',manifest.beforeSha256),load('adventure-channel.mjs',manifest.afterSha256),
 import(pathToFileURL(path.join(CORE,'fixed-loop.mjs'))),import(pathToFileURL(path.join(CORE,'resource-lanes.mjs'))),
 import(pathToFileURL(path.join(CORE,'resident-state.mjs'))),import(pathToFileURL(path.join(CORE,'adventure-maps.mjs')))
]);
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function deferred(){let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};}
const evidence={scope:'scheduler component: complete current AdventureChannel + actual FixedLoop durable barriers, ResourceLanes, ResidentState; controlled writer/checkpoint backend, no native process or full-game claim',beforeSha256:manifest.beforeSha256,afterSha256:manifest.afterSha256,cases:[]};

function scene(Class,{count=2,kind='mist',block=null,writeFailure=null,drainFailure=null,emptyFirst=false}={}){
 const now=100000,state=new ResidentState(1),lanes=new ResourceLanes(),fatal=[],requests=[],drains=[];
 const kernel=new FixedLoop({state,rules:Object.fromEntries(['movement','combat','ai','respawn','project'].map(key=>[key,()=>{}])),send:()=>{},onFatal:error=>fatal.push(error)});
 const runs=Array.from({length:count},(_,i)=>{const id=(i+1).toString(16).padStart(32,'0');return {id,kind,channel:1,cycle:1,area:mapArea(kind,id),status:'active',deadline_ms:now+60000,revision:1,config:{},state:{clear:false,nextWaveAt:0,floor:1}};});
 const ids=runs.map((run,i)=>'actor-'+i);
 for(const [i,id]of ids.entries()){
  state.put('players',{id,area:runs[i].area,channel:1,cycle:1,x:800,y:500,hp:100,max_hp:100});state.claim(id,1);kernel.admit(id,1);
 }
 const channel={kernel,lanes,state,owners:state.owners,world:{cycle:1},backgroundPaused:false,
  view:{players:state.table('players'),monsters:new Map(),engagements:new Map(),player:id=>state.read('players',id)},
  checkpoints:{drain:async id=>{drains.push(id);if(drainFailure)throw drainFailure;},hydrateCommitted:()=>{}},
  combatCheckpoints:{drain:async()=>{},retireIdleMonsters:()=>[]},
  writer:{finalSequence:id=>kernel.players.get(id).lastApplied},
  systemWriter:{submit:event=>{const gate=deferred();requests.push({event,gate});return writeFailure?Promise.reject(writeFailure):gate.promise;}},
  setMonster:()=>{},applyCommit:async()=>{},encounters:{hydrateCommitted:()=>{}},
  fail:error=>{fatal.push(error);kernel.fail(error);}
 };
 const adventure=new Class({channel,clock:()=>now,services:{adventureProfiles:new Map()}},{runs});
 for(const [i,id]of ids.entries())adventure.bundles.set(id,{run:runs[i],member:{run_id:runs[i].id,departed:false},portals:[]});
 if(emptyFirst){adventure.bundles.delete(ids[0]);runs[0].deadline_ms=now-1;}
 let hold=null,lease=null;
 if(block==='barrier'){hold=deferred();kernel.durable(ids[0],()=>hold.promise);}
 if(block==='suspended')kernel.players.get(ids[0]).suspended=true;
 if(block==='quiescer')kernel.players.get(ids[0]).quiescer={resolve:()=>{},reject:()=>{}};
 if(block==='missing')kernel.players.delete(ids[0]);
 if(block==='player-lease')lease=lanes.acquire(['player:'+ids[0]],'ordinary-action');
 if(block==='room-lease')lease=lanes.acquire(['adventure:'+runs[0].id],'ordinary-action');
 if(block==='monster-lease'){
  const monster={id:'a-monster',area:runs[0].area,hp:0};channel.view.monsters.set(monster.id,monster);
  lease=lanes.acquire(['monster:'+monster.id],'ordinary-action');
 }
 const unhold=async()=>{if(hold){hold.resolve({ok:true});await flush();}if(lease?.state==='held')lanes.release(lease);const p=kernel.players.get(ids[0]);if(p){p.suspended=false;p.quiescer=null;}};
 const finish=async index=>{
  const request=requests[index];assert(request,'writer request exists');const run=runs.find(row=>row.id===request.event.payload.runId);
  request.gate.resolve({key:request.event.key,result:{run:run?{...run,revision:run.revision+1,state:{...run.state,clear:true}}:undefined,players:[],portals:[]}});await flush();
 };
 // The real channel invokes modeTick only while its FixedLoop has no failure.
 return {now,state,lanes,kernel,channel,adventure,runs,ids,requests,drains,fatal,hold,lease,unhold,finish,tick:()=>{if(!kernel.failure)return adventure.tick(now);}};
}

test('baseline: due blocked first Sis room starves independent due room across five ticks',async()=>{
 const s=scene(Baseline,{block:'barrier'});
 for(let i=0;i<5;i++){s.tick();await flush();}
 assert.equal(s.requests.length,0);assert.equal(s.adventure.pending,null);
 s.runs[0].state.clear=true;s.tick();await flush();assert.equal(s.requests.length,1);assert.equal(s.requests[0].event.payload.runId,s.runs[1].id);
 await s.finish(0);await s.unhold();evidence.cases.push({name:'baseline-five-tick-starvation',submissionsWhileBlocked:0,independentRoomProgressesWhenFirstNoLongerDue:true});
});

for(const kind of ['mist','tower'])for(const block of ['barrier','suspended','quiescer','missing','player-lease','room-lease','monster-lease'])test(`candidate ${kind}: ${block} in first room permits exactly one independent room`,async()=>{
 const s=scene(Candidate,{kind,block});s.tick();await flush();
 assert.equal(s.requests.length,1);assert.equal(s.requests[0].event.payload.runId,s.runs[1].id);
 assert.deepEqual(s.requests[0].event.payload.actors.map(actor=>actor.id),[s.ids[1]]);
 assert.equal(s.drains.includes(s.ids[0]),false);assert.equal(s.fatal.length,0);
 for(let i=0;i<5;i++)s.tick();await flush();assert.equal(s.requests.length,1,'pending outcome prevents another operation');
 if(s.hold)assert.equal(s.kernel.players.get(s.ids[0]).barrier,s.hold.promise);
 if(s.lease)assert.equal(s.lease.state,'held');
 await s.finish(0);await s.unhold();evidence.cases.push({name:kind+'-'+block,independentSubmissions:1,blockedActorUntouched:true});
});

test('candidate: empty expired room with busy room lease also permits independent room',async()=>{
 const s=scene(Candidate,{block:'room-lease',emptyFirst:true});s.tick();await flush();
 assert.equal(s.requests.length,1);assert.equal(s.requests[0].event.payload.runId,s.runs[1].id);
 await s.finish(0);await s.unhold();
});

test('candidate: successful first admission stops scan and retains one operation through delayed writer ACK',async()=>{
 const s=scene(Candidate,{count:3});s.tick();await flush();assert.equal(s.requests.length,1);
 assert.equal(s.requests[0].event.payload.runId,s.runs[0].id);assert(s.adventure.pending);assert(s.kernel.players.get(s.ids[0]).barrier);
 for(let i=0;i<20;i++)s.tick();await flush();assert.equal(s.requests.length,1);
 await s.finish(0);s.tick();await flush();assert.equal(s.requests[1].event.payload.runId,s.runs[1].id);await s.finish(1);
});

test('candidate: four-room order is bounded and skipped first room regains original priority after unblocking',async()=>{
 const s=scene(Candidate,{count:4,block:'barrier'}),attempts=[];const execute=s.adventure.execute.bind(s.adventure);
 s.adventure.execute=(ids,run,schedule,now)=>{attempts.push(run?.id);return execute(ids,run,schedule,now);};
 s.tick();await flush();assert.deepEqual(attempts,[s.runs[0].id,s.runs[1].id]);await s.finish(0);
 attempts.length=0;s.tick();await flush();assert.deepEqual(attempts,[s.runs[0].id,s.runs[2].id]);await s.finish(1);
 await s.unhold();attempts.length=0;s.tick();await flush();assert.deepEqual(attempts,[s.runs[0].id]);await s.finish(2);
 attempts.length=0;s.tick();await flush();assert.deepEqual(attempts,[s.runs[3].id]);await s.finish(3);
 assert.deepEqual(s.requests.map(row=>row.event.payload.runId),[s.runs[1].id,s.runs[2].id,s.runs[0].id,s.runs[3].id]);
 assert.equal(s.fatal.length,0);evidence.cases.push({name:'four-room-bounded-order',submissionIndices:[1,2,0,3],oneActualOperationPerTick:true});
});

test('candidate: all blocked rooms are inspected once and no asynchronous work starts',async()=>{
 const s=scene(Candidate,{count:4});for(const p of s.kernel.players.values())p.suspended=true;
 const attempts=[];const execute=s.adventure.execute.bind(s.adventure);s.adventure.execute=(...args)=>{attempts.push(args[1].id);return execute(...args);};
 s.tick();await flush();assert.deepEqual(attempts,s.runs.map(run=>run.id));assert.equal(s.requests.length,0);assert.deepEqual(s.drains,[]);
});

for(const phase of ['checkpoint','writer'])test(`candidate: ${phase} unknown failure cannot fall through or duplicate another room`,async()=>{
 const error=Object.assign(Error('unknown-outcome-fixture'),{code:'unknown-outcome-fixture'});
 const s=scene(Candidate,{count:3,...phase==='writer'?{writeFailure:error}:{drainFailure:error}});
 s.tick();await flush();assert.equal(s.requests.length,phase==='writer'?1:0);assert(s.fatal.includes(error));
 assert.equal(s.lanes.held.get('player:'+s.ids[0]).state,'unknown');
 for(let i=0;i<3;i++)s.tick();await flush();assert.equal(s.requests.length,phase==='writer'?1:0);
 assert.equal(s.drains.includes(s.ids[1]),false);assert.equal(s.drains.includes(s.ids[2]),false);
});

test('candidate: synchronous admission error propagates without trying a later room',async()=>{
 const s=scene(Candidate,{count:3});const error=Error('synchronous-lease-error');s.lanes.acquire=()=>{throw error;};
 assert.throws(()=>s.tick(),value=>value===error);await flush();assert.deepEqual(s.drains,[]);assert.equal(s.requests.length,0);
});

test('candidate: unknown execute return does not authorize another attempt',()=>{
 const s=scene(Candidate,{count:3}),attempts=[];s.adventure.execute=(ids,run)=>{attempts.push(run.id);return undefined;};
 s.tick();assert.deepEqual(attempts,[s.runs[0].id]);
});

test('candidate: due scheduled portal retains existing priority and one operation boundary',async()=>{
 const s=scene(Candidate,{count:3});s.adventure.schedules.set('due-schedule',{id:'due-schedule',at_ms:s.now-1});s.tick();await flush();
 assert.equal(s.requests.length,1);assert.equal(s.requests[0].event.payload.scheduleId,'due-schedule');assert.equal(s.requests[0].event.payload.runId,null);
 await s.finish(0);
});

test.after(async()=>{await writeFile(path.join(ROOT,'evidence/adventure-scheduler-r85.json'),JSON.stringify(evidence,null,2)+'\n');});
