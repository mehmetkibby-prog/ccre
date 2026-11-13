import test from 'node:test';
import assert from 'node:assert/strict';
import {AdventureChannel} from '../working/core511-source/scripts/core511/adventure-channel.mjs';
import {ResourceLanes} from '../working/core511-source/scripts/core511/resource-lanes.mjs';
const deferred=()=>{let resolve,reject;const task=new Promise((a,b)=>{resolve=a;reject=b;});return {task,resolve,reject};};
function scene(){
 const gates=new Map(),writes=[],drains=[],faults=[],players=new Map(),owners=new Map(),runs=[];
 for(let i=0;i<8;i++){
  const id='p'+i,run={id:'room'+i,kind:'mist',area:'mist_room'+i,channel:1,cycle:1,status:'active',deadline_ms:999999,config:{},state:{clear:false,nextWaveAt:0,objective:'hunt'}};
  runs.push(run);players.set(id,{id,area:run.area,hp:100,epoch:1});owners.set(id,{epoch:1});
 }
 const c={owners,world:{cycle:1},lanes:new ResourceLanes(),view:{players,monsters:new Map(),player:id=>players.get(id)},kernel:{players,durableGroup:(_ids,work)=>work()},checkpoints:{drain:async()=>{}},combatCheckpoints:{drain:async()=>assert.fail('unrelated rooms must not be flushed'),drainTargetsR531:async ids=>drains.push(ids)},fail:e=>faults.push(e)};
 const r={channel:c,clock:()=>10000,services:{adventureProfiles:new Map()}},a=new AdventureChannel(r,{runs});a.pruneAt=999999;
 for(let i=0;i<8;i++)a.bundles.set('p'+i,{member:{run_id:'room'+i,departed:0}});
 a.write=async(ids,run)=>{writes.push(run.id);const gate=deferred();gates.set(run.id,gate);await gate.task;return {run:{...run,state:{...run.state,nextWaveAt:999999}}};};
 return {a,c,r,gates,writes,drains,faults,runs};
}
const turn=()=>new Promise(r=>setImmediate(r));
test('four independent room transitions progress concurrently, and a fifth waits for bounded capacity',async()=>{
 const s=scene();s.a.tick(10000);await turn();assert.equal(s.a.pending.size,4);assert.deepEqual(s.writes,['room0','room1','room2','room3']);
 assert.equal(s.a.execute(['p0'],s.runs[0],null,10000),false,'same run must not have a second owner');
 s.gates.get('room1').resolve();await turn();assert(!s.a.pending.has('run:room1'));assert(s.a.pending.has('run:room0'));
 s.a.tick(10001);await turn();assert(s.gates.has('room4'),'a slow first room cannot starve a different room');assert.equal(s.a.pending.size,4);
 for(const gate of s.gates.values())gate.resolve();await s.a.drain();assert.equal(s.faults.length,0);
});
test('draining a player waits only for that player’s run, while global drain waits for all',async()=>{
 const s=scene();s.a.execute(['p0'],s.runs[0],null,10000);s.a.execute(['p1'],s.runs[1],null,10000);await turn();
 let own=false,all=false;const mine=s.a.drain(['p0']).then(()=>own=true),global=s.a.drain().then(()=>all=true);
 s.gates.get('room0').resolve();await mine;assert(own);assert.equal(all,false);assert(s.a.pendingFor('p1'));assert.equal(s.a.pendingFor('unrelated'),null);
 s.gates.get('room1').resolve();await global;assert(all);assert.equal(s.c.lanes.tokens.size,0);
});
test('an unknown failed write retains only its own resource lease until recovery',async()=>{
 const s=scene();s.a.execute(['p0'],s.runs[0],null,10000);s.a.execute(['p1'],s.runs[1],null,10000);await turn();
 s.gates.get('room0').reject(Error('unknown commit'));s.gates.get('room1').resolve();await turn();
 assert.equal(s.faults.length,1);assert.equal(s.c.lanes.held.get('player:p0').state,'unknown');assert.equal(s.c.lanes.held.has('player:p1'),false);
});
