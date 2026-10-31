import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SnapshotReadQueue} from '../r83-investigation/periodic/snapshot-read-queue.mjs';
import {ColdReadCache} from '../r82-work/core511-source/scripts/core511/slim-reload.mjs';

const actor=id=>({id,name:'kernel511_actor_world'});
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const deferred=()=>{let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};};
async function finish(queue){while(queue.running)await queue.running;}

test('soft budget: a 2 ms actor still waits for the already-started 500 ms second actor, but not a third actor',async()=>{
 let time=0,inTransaction=false;const posted=[],reads=[],events=[];
 const blocked=deferred(),release=deferred();
 const queue=new SnapshotReadQueue({
  clock:()=>time,
  begin:()=>{assert.equal(inTransaction,false);inTransaction=true;},
  commit:()=>{assert.equal(inTransaction,true);inTransaction=false;events.push('commit');},
  rollback:()=>{inTransaction=false;assert.fail('unexpected rollback');},
  post:reply=>{assert.equal(inTransaction,false);posted.push({...reply,at:time});events.push('post:'+reply.id);},
  read:async(message,{insideTransaction=false,post=reply=>queue.post(reply)}={})=>{
   reads.push(message.id);events.push('read:'+message.id);
   if(insideTransaction)assert.equal(inTransaction,true);
   if(message.id==='a')time+=2;
   if(message.id==='b'){blocked.resolve();await release.promise;time+=500;}
   if(message.id==='c'){
    assert.deepEqual(posted.map(row=>row.id),['a','b']);
    time+=500;
   }
   post({id:message.id,ok:true});
  }
 });
 for(const id of ['a','b','c'])queue.push(actor(id));
 await blocked.promise;
 assert.deepEqual(reads,['a','b']);assert.deepEqual(posted,[]);
 assert.equal(inTransaction,true,'no release while a complete actor read is still running');
 release.resolve();await finish(queue);
 assert.deepEqual(posted,[{id:'a',ok:true,at:502},{id:'b',ok:true,at:502},{id:'c',ok:true,at:1002}]);
 assert.deepEqual(events,['read:a','read:b','commit','post:a','post:b','read:c','post:c']);
 assert.equal(inTransaction,false);
});

test('actual ColdReadCache invalidates at a new WAL snapshot after a completed partial batch',async t=>{
 const dir=mkdtempSync(join(tmpdir(),'core511-r83-client-review-')),file=join(dir,'review.sqlite');
 const writer=new DatabaseSync(file);
 writer.exec('PRAGMA journal_mode=WAL;CREATE TABLE value(n INTEGER);INSERT INTO value VALUES(1)');
 const reader=new DatabaseSync(file,{readOnly:true});reader.exec('PRAGMA query_only=ON');
 t.after(()=>{reader.close();writer.close();rmSync(dir,{recursive:true,force:true});});
 const cache=new ColdReadCache(reader),posted=[];let time=0;
 const query='SELECT n FROM value';
 const queue=new SnapshotReadQueue({
  clock:()=>time,begin:()=>reader.exec('BEGIN'),commit:()=>reader.exec('COMMIT'),rollback:()=>reader.exec('ROLLBACK'),
  post:reply=>{
   assert.equal(reader.isTransaction,false,'no cache/projection result before snapshot commit');
   posted.push(reply);
   if(reply.id==='a')writer.exec('UPDATE value SET n=2');
  },
  read:async(message,{insideTransaction=false,post=reply=>queue.post(reply)}={})=>{
   if(!insideTransaction)reader.exec('BEGIN');
   assert.equal(reader.isTransaction,true);
   cache.begin();
   const first=cache.read(query,[],()=>reader.prepare(query).all()).map(row=>row.n);
   await turn();
   cache.begin();
   const second=cache.read(query,[],()=>reader.prepare(query).all()).map(row=>row.n);
   assert.deepEqual(second,first,'one actor stays consistent across native async reads');
   assert.deepEqual(reader.prepare(query).all().map(row=>row.n),first,'cache matches actual transaction');
   time+=message.id==='a'?9:1;
   if(!insideTransaction)reader.exec('COMMIT');
   post({id:message.id,values:first});
  }
 });
 for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(posted,[{id:'a',values:[1]},{id:'b',values:[2]},{id:'c',values:[2]}]);
 assert.equal(cache.metrics.resets,2,'same snapshot reused; new WAL version invalidates cached data');
 assert.equal(cache.metrics.misses,2);assert.equal(cache.metrics.hits,4);
 assert.equal(reader.isTransaction,false);
});
