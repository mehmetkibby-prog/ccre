import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const {IpcReplay}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/ipc-replay-r111.mjs');
test('pending requests share the exact promise; stored success replays without executing again',async()=>{
 const r=new IpcReplay(),id=randomUUID()+':1';let release,calls=0;
 const value={key:'receipt',result:{players:[{id:'p',hp:100}],events:[['reward',{amount:7}]],checkpoint:{epoch:4,sequence:2}}};
 const p=r.run(id,'read_actor',{sequence:2},()=>{calls++;return new Promise(resolve=>release=resolve);});
 assert.equal(r.run(id,'read_actor',{sequence:2},()=>assert.fail()),p);await Promise.resolve();release(value);
 assert.deepEqual(await p,value);assert.equal(r.rows.get(1).promise,null);assert(r.rows.get(1).bytes instanceof Buffer);
 assert.deepEqual(await r.run(id,'read_actor',{sequence:2},()=>assert.fail()),value);assert.equal(calls,1);
 assert.throws(()=>r.run(id,'read_actor',{sequence:3},()=>assert.fail()),/ipc_request_id_reused/);
});
test('errors keep their identity and provenance and are never rerun',async()=>{
 const r=new IpcReplay(),id=randomUUID()+':1',error=Error('unknown commit'),proof=new WeakSet([error]);
 const p=r.run(id,'command',{},()=>{throw error;});await assert.rejects(p,e=>e===error&&proof.has(e));
 assert.equal(r.run(id,'command',{},()=>assert.fail()),p);assert.equal(r.rows.get(1).bytes,null);
});
test('eviction keeps original retirement and pending protections; byte accounting follows retained rows',async()=>{
 const r=new IpcReplay({limit:2}),prefix=randomUUID();let release;
 const first=r.run(prefix+':1','read_actor',{},()=>new Promise(resolve=>release=resolve));await Promise.resolve();
 await r.run(prefix+':2','read_actor',{},()=>({a:2}));await r.run(prefix+':3','read_actor',{},()=>({a:3}));
 assert(r.rows.has(1));assert.throws(()=>r.run(prefix+':2','command',{},()=>assert.fail()),/ipc_request_retired/);
 release({a:1});await first;assert.equal(r.rows.size,2);assert.equal(r.storage.bytes,[...r.rows.values()].reduce((s,r)=>s+(r.bytes?.length??0),0));
 assert.throws(()=>r.run(prefix+':132','command',{},()=>assert.fail()),/ipc_request_retired/);
});
test('unsupported values and opt-out retain original cache semantics',async()=>{
 for(const options of [{compact:false},{}]){
  const r=new IpcReplay(options),id=randomUUID()+':1',value={fn:()=>1};
  const p=r.run(id,'read_actor',{},()=>value);assert.equal(await p,value);assert.equal(r.run(id,'read_actor',{},()=>assert.fail()),p);
 }
});
test('command replies retain the original value without traversing lazy fields',async()=>{
 const r=new IpcReplay(),id=randomUUID()+':1';let reads=0;
 const value={get body(){reads++;return {ok:true};}};
 const promise=r.run(id,'command',{},()=>value);
 assert.equal(await promise,value);assert.equal(reads,0);
 assert.equal(r.run(id,'command',{},()=>assert.fail()),promise);
 assert.equal(r.storage.encoded,0);assert.equal(reads,0);
});
test('replay preserves JSON wire data of rows, arrays, binary values and Unicode',async()=>{
 const r=new IpcReplay(),id=randomUUID()+':1',value={players:[Object.assign(Object.create(null),{id:'çığ',hp:0})],nil:null,missing:undefined,bytes:Buffer.from([0,1,255]),nested:[[1,true,'öz']]};
 await r.run(id,'read_actor',{},()=>value);const replay=await r.run(id,'read_actor',{},()=>assert.fail());
 assert.equal(JSON.stringify(replay),JSON.stringify(value));replay.players[0].hp=999;
 assert.equal((await r.run(id,'read_actor',{},()=>assert.fail())).players[0].hp,0);
});
