import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
const core=process.env.STUTTER_TREE+'/core511-source/scripts/core511/';
const {encodeActorReadR112,decodeActorReadR112,ACTOR_READ_WIRE_R112:mark}=await import(core+'actor-read-wire-r112.mjs');
const {IpcReplay}=await import(core+'ipc-replay-r111.mjs');
const bundle=()=>({player:{id:'owned',is_gm:0,name:'Çağrı 🦊'},combat:{afk:{active:0}},projection:{data:{inventory:Array.from({length:1000},(_,i)=>({id:'item-'+i,name:'Zümrüt',owner:'owned',equipped:0}))}},owner:{epoch:12,channel:2}});
test('actor snapshot wire preserves Unicode, inventory and parent-owned captcha state',()=>{
 const data=bundle(),wire=encodeActorReadR112(data);wire.afkCheck={locked:true,challenge:{id:'current'}};
 const decoded=decodeActorReadR112(JSON.parse(JSON.stringify(wire)),'read_actor');assert.deepEqual(decoded,{...data,afkCheck:wire.afkCheck});assert(JSON.stringify(wire).length<JSON.stringify(data).length/3);
 assert.equal(decodeActorReadR112(data,'read_actor'),data);assert.equal(decodeActorReadR112({result:{status:200}},'command').result.status,200);
});
test('malformed, oversized, wrong-owner and wrong-method actor envelopes fail closed',()=>{
 const good=encodeActorReadR112(bundle());assert.throws(()=>decodeActorReadR112(good,'command'),/actor_read_wire_scope/);
 for(const change of [w=>w[mark].bytes=4*1024*1024+1,w=>w[mark].bytes=1,w=>w[mark].sha256='0'.repeat(64),w=>w[mark].data='@@',w=>w[mark].version=2,w=>w.player.id='foreign',w=>w.player.is_gm=1,w=>w.combat.afk.active=1,w=>w.foreign=true]){
  const w=structuredClone(good);change(w);assert.throws(()=>decodeActorReadR112(w,'read_actor'),/actor_read_wire_/);
 }
 assert.throws(()=>encodeActorReadR112({player:{id:'x'},projection:'x'.repeat(4*1024*1024)}),/actor_read_wire_size/);
});
test('encoded snapshot replay never reruns SQL or changes the original captcha/ownership snapshot',async()=>{
 const cache=new IpcReplay(),id=randomUUID()+':1',data=bundle();let calls=0;
 const once=()=>{calls++;const wire=encodeActorReadR112(data);wire.afkCheck={locked:true};return wire;};
 const first=await cache.run(id,'read_actor',{epoch:12},once),again=await cache.run(id,'read_actor',{epoch:12},once);
 assert.equal(calls,1);assert.deepEqual(again,first);assert.deepEqual(decodeActorReadR112(again,'read_actor'),{...data,afkCheck:{locked:true}});assert(cache.storage.bytes<10000);
 assert.throws(()=>cache.run(id,'read_actor',{epoch:13},once),/ipc_request_id_reused/);
});
