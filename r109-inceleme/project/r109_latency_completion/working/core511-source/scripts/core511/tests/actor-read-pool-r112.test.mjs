import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put} from './pvp-fixture.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {until} from './helpers.mjs';
import {createTowerSchema} from '../tower-config.mjs';
import {createAdventureSchema} from '../adventure-schema.mjs';
import {createCastleSchema} from '../castle-schema-r59.mjs';

async function fixture(t){
 const f=await setupPvp(t),{sql,id,targetId,nowMs}=f;f.reset({area:'forest'});createTowerSchema(sql);createAdventureSchema(sql);createCastleSchema(sql);
 const account=sql.prepare('SELECT * FROM accounts WHERE id=(SELECT account_id FROM players WHERE id=?)').get(id);
 put(sql,'accounts',{...account,id:'pool-second-account',username:'PoolSecond',username_normalized:'poolsecond',email:'poolsecond@fixture.invalid',email_normalized:'poolsecond@fixture.invalid'});sql.prepare('UPDATE players SET account_id=? WHERE id=?').run('pool-second-account',targetId);
 const authority=new ChannelOwnership(f.f.database,{realmId:'pool-r112'});await authority.initialize();
 for(const channel of [1,2,3,4])await authority.registerProcess(channel,'pool-'+channel);
 const params=[];
 for(const [actor,channel]of [[id,1],[targetId,2]]){
  sql.prepare('UPDATE players SET channel=? WHERE id=?').run(channel,actor);
  const owner=await authority.admit(actor,{channel,incarnation:'pool-'+channel},{sessionId:'pool-session-'+channel,guard:()=>true});
  params.push([actor,channel,'pool-'+channel,owner.epoch,1,nowMs,{account:sql.prepare('SELECT account_id FROM players WHERE id=?').get(actor).account_id,chatAfterId:0,starterReward:{claimed:true}}]);
 }
 const reader=new ReadWorker(f.f.file,new Map([['slow','WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<3000000) SELECT sum(x) AS total FROM n'],['write','WITH n AS (SELECT 1) DELETE FROM players RETURNING id']]),{actorBundles:true});
 t.after(()=>reader.close());return {reader,params,sql,authority};
}

test('actor WAL reads run independently of a busy sibling and retain account/epoch fences',{timeout:20000},async t=>{
 const {reader,params,sql}=await fixture(t);
 await Promise.all(params.map(p=>reader.query('kernel511_actor_world',p)));
 assert.equal(reader.readers.length,3);assert.equal(reader.actorReader(1),reader.actorReader(3));assert.notEqual(reader.actorReader(1),reader.actorReader(2));
 const first=reader.actorReader(1),second=reader.actorReader(2);let slowDone=false;
 const slow=first.send({name:'slow',params:[]}).then(()=>{slowDone=true;});
 const result=await reader.query('kernel511_actor_world',params[1]);assert.equal(result.rows.actor,params[1][0]);assert.equal(slowDone,false,'independent reader must not wait for the other WAL reader');await slow;
 const invalid=[...params[1]];invalid[3]++;
 await assert.rejects(reader.query('kernel511_actor_world',invalid),{code:'actor_bundle_owner_fenced'});
 const foreign=[...params[1]];foreign[6]={...foreign[6],account:params[0][6].account};
 await assert.rejects(reader.query('kernel511_actor_world',foreign),{code:'actor_world_owner_fenced'});
 const before=sql.prepare('SELECT count(*) n FROM players').get().n;
 await assert.rejects(second.send({name:'write',params:[]}));assert.equal(sql.prepare('SELECT count(*) n FROM players').get().n,before);
 assert.equal((await reader.query('kernel511_actor_world',params[1])).rows.actor,params[1][0],'failed snapshot rolls back before next read');
});

test('one eight-slot queue bounds all actor readers; queued work cannot cross a retired shard incarnation',{timeout:20000},async t=>{
 const {reader,params}=await fixture(t);await reader.query('kernel511_actor_world',params[0]);await until(()=>reader.readQueue.active===0);
 let release;const gate=new Promise(r=>release=r),busy=Array.from({length:8},()=>reader.readQueue.run(()=>gate));
 const queued=Array.from({length:100},()=>reader.query('kernel511_actor_world',params[0]).then(()=>null,e=>e.code));
 assert.equal(reader.readQueue.active,8);assert.equal(reader.readQueue.waiting.length,100);
 const backend=reader.actorReader(1),other=reader.actorReader(2),old=backend.slot,otherSlot=other.slot;await old.worker.terminate();assert.equal(reader.ready,false);
 release();await Promise.all(busy);assert.deepEqual(new Set(await Promise.all(queued)),new Set(['read_worker_process_changed']));assert.equal(backend.starts,1);
 assert.equal((await reader.query('kernel511_actor_world',params[0])).rows.actor,params[0][0]);assert.equal(backend.starts,2);assert.equal(other.slot,otherSlot);assert.equal(reader.ready,true);
 const slots=reader.readers.map(r=>r.slot);await reader.close();assert(slots.every(s=>s.ended));await assert.rejects(reader.query('kernel511_actor_world',params[0]),{code:'read_worker_closed'});
});

test('a burst for one shard cannot occupy the other shard slots or reorder a shard FIFO',async()=>{
 const {BoundedReadQueue}=await import('../bounded-read-queue.mjs');const q=new BoundedReadQueue(),order=[],releases=[];
 const submit=(key,i)=>q.run(()=>new Promise(resolve=>{order.push(key+i);releases.push(resolve);}),{key,limit:4});
 const first=Array.from({length:20},(_,i)=>submit('a',i)),second=Array.from({length:4},(_,i)=>submit('b',i));await new Promise(r=>setImmediate(r));
 assert.deepEqual(order,['a0','a1','a2','a3','b0','b1','b2','b3']);assert.equal(q.active,8);assert.equal(q.waiting.length,16);
 while(order.length<24||q.active){for(const resolve of releases.splice(0))resolve();await new Promise(r=>setImmediate(r));}
 await Promise.all([...first,...second]);assert.deepEqual(order.filter(x=>x.startsWith('a')),Array.from({length:20},(_,i)=>'a'+i));assert.equal(q.activeKeys.size,0);q.close();
});

test('the read-only worker encodes the same owned snapshot without cloning its row graph into the parent',{timeout:20000},async t=>{
 const {reader,params}=await fixture(t),{decodeActorReadR112,ACTOR_READ_WIRE_R112}=await import('../actor-read-wire-r112.mjs');
 const plain=(await reader.query('kernel511_actor_world',params[0])).rows;
 const wire=(await reader.query('kernel511_actor_world',params[0],{actorWire:true})).rows;
 assert(wire[ACTOR_READ_WIRE_R112]);assert.equal(wire.projection,undefined);assert.deepEqual(decodeActorReadR112(wire,'read_actor'),JSON.parse(JSON.stringify(plain)));
});
