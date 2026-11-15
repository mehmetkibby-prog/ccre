import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';

const coreRoot=process.env.R118_TEST_CORE_ROOT
 ?pathToFileURL(path.resolve(process.env.R118_TEST_CORE_ROOT)+'/')
 :new URL('../../r109_latency_completion/working/core511-source/scripts/core511/',import.meta.url);
const {WorldProcessSupervisor}=await import(new URL('world-supervisor.mjs',coreRoot));
const turn=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};

function fixture(request=async()=>({accepted:true})){
 const calls=[],faults=[],processes=new Map();
 const make=(incarnation='channel-a')=>({peer:{realm:'r1',channel:1,incarnation},online:true,
  control:{request(method,payload){calls.push({incarnation,method,payload:structuredClone(payload)});return request(method,payload,incarnation);}}});
 const channel=make();processes.set(1,channel);
 const world=Object.create(WorldProcessSupervisor.prototype);
 Object.assign(world,{core:{processes,onFault:issue=>faults.push(issue),process(peer){const row=processes.get(peer.channel);if(!row?.online||row.peer.incarnation!==peer.incarnation||row.peer.realm!==peer.realm)throw Object.assign(Error('channel_process_fenced'),{code:'channel_process_fenced'});return row;}},row:{owner:{epoch:1},peer:{incarnation:'world-a'},exited:false},monsters:new Map(),projection:null,deliveries:new Map(),subscriptions:new Map()});
 const projection=(version,{full=version===1,epoch=world.row.owner.epoch,incarnation=world.row.peer.incarnation,monsters=[{id:'shared-a',channel:0,hp:100-version}],cycle=1}={})=>({epoch,incarnation,version,cycle,full,monsters});
 const publish=(version,options)=>world.publish(world.row,projection(version,options));
 return {world,channel,make,processes,calls,faults,projection,publish};
}

test('a registered child can spend over five seconds booting without receiving premature projections',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});
 let ready=false;const f=fixture(async()=>ready?({accepted:true}):new Promise(()=>{}));
 const bootPublication=f.publish(1,{monsters:[{id:'shared-a',channel:0,hp:90},{id:'shared-b',channel:0,hp:75}]});
 await turn();t.mock.timers.tick(6001);await bootPublication;
 assert.equal(f.faults.length,0,'booting channel must not fault: '+f.faults.map(fault=>fault.error.code).join(','));
 assert.equal(f.calls.length,0,'no control may be queued before the child is ready');
 await f.publish(2,{monsters:[{id:'shared-a',channel:0,hp:80}]});
 assert.equal(f.calls.length,0);assert.deepEqual(f.faults,[]);
 ready=true;
 await f.world.attachChannel(f.channel.peer);
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.full,true);assert.equal(f.calls[0].payload.version,2);
 assert.deepEqual(f.calls[0].payload.monsters.map(m=>[m.id,m.hp]),[['shared-a',80],['shared-b',75]]);
 await f.publish(3);assert.equal(f.calls[1].payload.full,false);assert.equal(f.calls[1].payload.version,3);
 assert.deepEqual(f.faults,[]);
});

test('an initial full snapshot is enqueued before publications arriving during its acknowledgement',async()=>{
 const gate=deferred();let first=true;
 const f=fixture(async()=>{if(first){first=false;await gate.promise;}return {accepted:true};});
 await f.publish(1);const attached=f.world.attachChannel(f.channel.peer);await turn();
 assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.full,true);
 const second=f.publish(2),third=f.publish(3);await turn();assert.equal(f.calls.length,1);
 gate.resolve();await Promise.all([attached,second,third]);
 assert.deepEqual(f.calls.map(c=>[c.payload.version,c.payload.full]),[[1,true],[2,false],[3,false]]);
 assert.deepEqual(f.faults,[]);
});

test('attachment before the first world projection subscribes to its future full snapshot',async()=>{
 const f=fixture();await f.world.attachChannel(f.channel.peer);assert.equal(f.calls.length,0);
 await f.publish(1);assert.equal(f.calls.length,1);assert.equal(f.calls[0].payload.full,true);
});

test('a replacement incarnation must attach independently and stale peers remain fenced',async()=>{
 const f=fixture();await f.publish(1);await f.world.attachChannel(f.channel.peer);
 const replacement=f.make('channel-b');f.channel.online=false;f.processes.set(1,replacement);
 await f.publish(2);assert.equal(f.calls.length,1);
 await assert.rejects(f.world.attachChannel(f.channel.peer),{code:'channel_process_fenced'});
 assert.equal(f.world.subscriptions.get(1).incarnation,'channel-a');
 await f.world.attachChannel(replacement.peer);await f.publish(3);
 assert.deepEqual(f.calls.map(c=>[c.incarnation,c.payload.version,c.payload.full]),[['channel-a',1,true],['channel-b',2,true],['channel-b',3,false]]);
 assert.equal(f.world.subscriptions.size,1);
});

test('a failed old attachment cannot unsubscribe a successfully attached replacement',async()=>{
 const gate=deferred(),f=fixture(async(_method,_payload,incarnation)=>{if(incarnation==='channel-a')await gate.promise;return {accepted:true};});
 await f.publish(1);const old=f.world.attachChannel(f.channel.peer),rejected=assert.rejects(old,/old-channel-failed/);await turn();
 const replacement=f.make('channel-b');f.channel.online=false;f.processes.set(1,replacement);
 await f.publish(2);await f.world.attachChannel(replacement.peer);
 gate.reject(Error('old-channel-failed'));await rejected;
 assert.equal(f.world.subscriptions.get(1).incarnation,'channel-b');
 await f.publish(3);assert.equal(f.calls.at(-1).incarnation,'channel-b');assert.equal(f.calls.at(-1).payload.version,3);
});

test('a failed current attachment unsubscribes until a later successful full resynchronization',async()=>{
 let fail=true;const f=fixture(async()=>{if(fail)throw Error('initial-snapshot-failed');return {accepted:true};});
 await f.publish(1);await assert.rejects(f.world.attachChannel(f.channel.peer),/initial-snapshot-failed/);
 assert.equal(f.world.subscriptions.size,0);await f.publish(2);assert.equal(f.calls.length,1);
 fail=false;await f.world.attachChannel(f.channel.peer);assert.equal(f.calls[1].payload.full,true);assert.equal(f.calls[1].payload.version,2);
 await f.publish(3);assert.equal(f.calls[2].payload.full,false);
});

test('the normal five-second projection timeout still faults a stalled attached channel',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});let stall=false;
 const f=fixture(async()=>stall?new Promise(()=>{}):({accepted:true}));
 await f.publish(1);await f.world.attachChannel(f.channel.peer);stall=true;
 const published=f.publish(2);await turn();
 t.mock.timers.tick(4999);await turn();assert.equal(f.faults.length,0);
 t.mock.timers.tick(1);await published;
 assert.equal(f.faults.length,1);assert.equal(f.faults[0].error.code,'world_projection_channel_timeout');
 assert.equal(f.faults[0].incarnation,f.channel.peer.incarnation);
});

test('initial attachment also preserves the five-second response guard and unsubscribes on timeout',async t=>{
 t.mock.timers.enable({apis:['setTimeout']});const f=fixture(async()=>new Promise(()=>{}));
 await f.publish(1);const attaching=f.world.attachChannel(f.channel.peer),rejected=assert.rejects(attaching,{code:'world_projection_channel_timeout'});await turn();
 t.mock.timers.tick(5000);await rejected;assert.equal(f.world.subscriptions.size,0);
 await f.publish(2);assert.equal(f.calls.length,1);
});

test('world restart preserves live subscriptions and changes epoch through a new full snapshot',async()=>{
 const f=fixture();await f.publish(1);await f.world.attachChannel(f.channel.peer);await f.publish(2);
 f.world.row={owner:{epoch:2},peer:{incarnation:'world-b'},exited:false};f.world.projection=null;f.world.monsters.clear();
 await f.publish(1,{monsters:[{id:'new-shared',channel:0,hp:500}]});await f.publish(2,{monsters:[{id:'new-shared',channel:0,hp:450}]});
 assert.deepEqual(f.calls.slice(-2).map(c=>[c.payload.epoch,c.payload.version,c.payload.full]),[[2,1,true],[2,2,false]]);
 assert.deepEqual(f.calls.at(-2).payload.monsters,[{id:'new-shared',channel:0,hp:500}]);assert.deepEqual(f.faults,[]);
});

test('duplicate delivery is ignored and repeated attachments cannot let deltas overtake a full snapshot',async()=>{
 const f=fixture();await f.publish(1);await f.world.attachChannel(f.channel.peer);
 assert.deepEqual(await f.world.deliver(f.channel,f.projection(1)),{ignored:true});assert.equal(f.calls.length,1);
 const attaching=f.world.attachChannel(f.channel.peer),published=f.publish(2);await Promise.all([attaching,published]);
 assert.deepEqual(f.calls.map(c=>[c.payload.version,c.payload.full]),[[1,true],[2,true]]);
 assert.equal(f.world.deliveries.get(1).version,2);
 await assert.rejects(f.publish(2),/world_projection_sequence/);
 await assert.rejects(f.world.publish(f.world.row,f.projection(3,{incarnation:'stale-world'})),/world_projection_fenced/);
 assert.deepEqual(f.faults,[]);
});
