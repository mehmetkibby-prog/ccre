import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {SnapshotReadQueue as Before} from '../r82-work/core511-source/scripts/core511/snapshot-read-queue.mjs';
import {SnapshotReadQueue as After} from '../r83-investigation/periodic/snapshot-read-queue.mjs';

const actor=id=>({id,name:'kernel511_actor_world'});
const deferred=()=>{let resolve,reject;const promise=new Promise((yes,no)=>{resolve=yes;reject=no;});return {promise,resolve,reject};};
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function make(Queue=After,extra={}){
 const state={time:0,inTransaction:false,begins:0,commits:0,rollbacks:0,reads:[],posted:[],events:[]};
 const ops={
  clock:()=>state.time,
  begin:()=>{assert.equal(state.inTransaction,false);state.inTransaction=true;state.begins++;state.events.push('begin');},
  commit:()=>{assert.equal(state.inTransaction,true);state.inTransaction=false;state.commits++;state.events.push('commit');},
  rollback:()=>{assert.equal(state.inTransaction,true);state.inTransaction=false;state.rollbacks++;state.events.push('rollback');},
  post:reply=>{assert.equal(state.inTransaction,false,'reply must follow readonly COMMIT/ROLLBACK');state.posted.push(reply);state.events.push('post:'+reply.id);},
  turn,
 };
 let queue;
 ops.read=async(message,options={})=>{
  state.reads.push(message.id);state.events.push('read:'+message.id);
  if(extra.beforeRead)await extra.beforeRead({message,options,state,queue});
  const post=options.post??ops.post;
  assert.equal(state.inTransaction,Boolean(options.insideTransaction));
  post({id:message.id,ok:true,value:message.id});
  if(extra.afterRead)await extra.afterRead({message,options,state,queue});
 };
 queue=new Queue({...ops,...extra.operations});
 return {queue,state,ops};
}
async function finish(queue){while(queue.running)await queue.running;}

test('actual R82 queue withholds completed A behind blocked unrelated B; bounded queue publishes A first',async()=>{
 for(const [Queue,expected]of [[Before,[]],[After,['a']]]){
  const blocked=deferred(),release=deferred();
  const {queue,state}=make(Queue,{beforeRead:async({message,state})=>{
   if(message.id==='a')state.time+=9;
   if(message.id==='b'){blocked.resolve();await release.promise;}
  }});
  queue.push(actor('a'));queue.push(actor('b'));queue.push(actor('c'));
  await blocked.promise;
  assert.deepEqual(state.posted.map(row=>row.id),expected);
  assert.deepEqual(state.reads,['a','b']);
  release.resolve();await finish(queue);
  assert.deepEqual(state.posted.map(row=>row.id),['a','b','c']);
  assert.equal(state.inTransaction,false);assert.equal(state.rollbacks,0);
 }
});

test('fast reads retain one snapshot and only publish after its commit',async()=>{
 const {queue,state}=make(After,{beforeRead:({state})=>{state.time++;}});
 for(const id of ['a','b','c','d'])queue.push(actor(id));await finish(queue);
 assert.equal(state.begins,1);assert.equal(state.commits,1);
 assert.deepEqual(state.events,['begin','read:a','read:b','read:c','read:d','commit','post:a','post:b','post:c','post:d']);
});

test('batch maximum remains four and the fifth request is read exactly once',async()=>{
 const {queue,state}=make();for(const id of ['a','b','c','d','e'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(state.reads,['a','b','c','d','e']);
 assert.deepEqual(state.posted.map(row=>row.id),state.reads);
 assert.equal(state.begins,1);assert.equal(state.commits,1);
 assert.equal(state.events.indexOf('read:e')>state.events.indexOf('post:d'),true);
});

test('unstarted tail stays ahead of messages arriving during an awaited read',async()=>{
 let injected=false;
 const {queue,state}=make(After,{beforeRead:({message,state,queue})=>{
  state.time+=9;
  if(message.id==='a'&&!injected){injected=true;queue.push(actor('later'));queue.push({id:'guild',name:'kernel511_guild_step'});}
 }});
 for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(state.reads,['a','b','c','later','guild']);
 assert.deepEqual(state.posted.map(row=>row.id),state.reads);
 assert.equal(new Set(state.reads).size,state.reads.length);
});

test('non-actor message is an unchanged FIFO grouping boundary',async()=>{
 const {queue,state}=make();
 for(const message of [actor('a'),{id:'guild',name:'kernel511_guild_step'},actor('b'),actor('c')])queue.push(message);
 await finish(queue);assert.deepEqual(state.reads,['a','guild','b','c']);
 assert.deepEqual(state.events,['read:a','post:a','read:guild','post:guild','begin','read:b','read:c','commit','post:b','post:c']);
});

test('budget is checked at a complete read boundary including the exact threshold',async()=>{
 const {queue,state}=make(After,{beforeRead:({message,state})=>{state.time+=message.id==='a'?8:1;}});
 for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
 assert.equal(state.begins,2);assert.equal(state.commits,2);
 assert.deepEqual(state.events,['begin','read:a','commit','post:a','begin','read:b','read:c','commit','post:b','post:c']);
});

test('a single expensive read is never split or replied to speculatively',async()=>{
 const entered=deferred(),release=deferred();
 const {queue,state}=make(After,{beforeRead:async({message,state})=>{
  if(message.id==='a'){state.time+=500;entered.resolve();await release.promise;}
 }});
 queue.push(actor('a'));queue.push(actor('b'));await entered.promise;
 assert.deepEqual(state.posted,[]);assert.equal(state.inTransaction,true);
 release.resolve();await finish(queue);assert.deepEqual(state.posted.map(row=>row.id),['a','b']);
});

test('COMMIT failure publishes only failure for processed actor and preserves unread requests',async()=>{
 const fixture=make(After,{beforeRead:({state})=>{state.time+=9;}}),{queue,state,ops}=fixture;
 let failOnce=true;queue.commit=()=>{if(failOnce){failOnce=false;throw Object.assign(Error('commit-fail'),{code:'commit-fail'});}return ops.commit();};
 for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(state.reads,['a','b','c']);assert.equal(state.rollbacks,1);
 assert.deepEqual(state.posted,[{id:'a',ok:false,code:'commit-fail'},{id:'b',ok:true,value:'b'},{id:'c',ok:true,value:'c'}]);
});

test('read error retains original all-current-batch failure without replay or premature success',async()=>{
 for(const Queue of [Before,After]){
  const {queue,state}=make(Queue,{beforeRead:({message})=>{if(message.id==='b')throw Object.assign(Error('read-fail'),{code:'read-fail'});}});
  for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
  assert.deepEqual(state.reads,['a','b']);assert.equal(state.rollbacks,1);
  assert.deepEqual(state.posted,['a','b','c'].map(id=>({id,ok:false,code:'read-fail'})));
 }
});

test('later read failure cannot retract an already committed partial batch',async()=>{
 const {queue,state}=make(After,{beforeRead:({message,state})=>{
  if(message.id==='a')state.time+=9;
  if(message.id==='c')throw Object.assign(Error('later-fail'),{code:'later-fail'});
 }});
 for(const id of ['a','b','c','d'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(state.reads,['a','b','c']);
 assert.deepEqual(state.posted,[{id:'a',ok:true,value:'a'},...['b','c','d'].map(id=>({id,ok:false,code:'later-fail'}))]);
 assert.equal(state.commits,1);assert.equal(state.rollbacks,1);
});

test('per-message error reply remains buffered until commit as in actual readMessage',async()=>{
 const {queue,state}=make();
 queue.read=async(message,{post,insideTransaction}={})=>{
  assert.equal(insideTransaction,true);assert.equal(state.inTransaction,true);state.reads.push(message.id);
  post(message.id==='b'?{id:'b',ok:false,code:'actor_bundle_owner_fenced'}:{id:message.id,ok:true});
  assert.deepEqual(state.posted,[]);
 };
 queue.push(actor('a'));queue.push(actor('b'));await finish(queue);
 assert.deepEqual(state.posted,[{id:'a',ok:true},{id:'b',ok:false,code:'actor_bundle_owner_fenced'}]);
 assert.equal(state.commits,1);assert.equal(state.rollbacks,0);
});

test('close control stays after every earlier actor even after repeated partial batches',async()=>{
 let closed=false;
 const {queue,state}=make(After,{beforeRead:({message,state})=>{
  state.time+=9;if(message.name==='close')closed=true;else assert.equal(closed,false);
 }});
 for(const id of ['a','b','c','d'])queue.push(actor(id));queue.push({id:'close',name:'close'});
 await finish(queue);assert.equal(closed,true);assert.deepEqual(state.reads,['a','b','c','d','close']);
 assert.deepEqual(state.posted.map(row=>row.id),state.reads);assert.equal(state.inTransaction,false);
});

function sqliteFixture(t){
 const dir=mkdtempSync(join(tmpdir(),'core511-r83-read-batch-')),path=join(dir,'read.sqlite');
 const writer=new DatabaseSync(path);writer.exec('PRAGMA journal_mode=WAL;CREATE TABLE value(n INTEGER);INSERT INTO value VALUES(1)');
 const reader=new DatabaseSync(path,{readOnly:true});reader.exec('PRAGMA query_only=ON');
 t.after(()=>{reader.close();writer.close();rmSync(dir,{recursive:true,force:true});});
 return {writer,reader};
}

test('real SQLite keeps complete individual reads and a fast batch on one WAL snapshot',async t=>{
 const {writer,reader}=sqliteFixture(t),results=[],readRows=[];let time=0;
 const queue=new After({
  clock:()=>time,begin:()=>reader.exec('BEGIN'),commit:()=>reader.exec('COMMIT'),rollback:()=>reader.exec('ROLLBACK'),
  post:reply=>{assert.equal(reader.isTransaction,false);results.push(reply);},
  read:async(message,{insideTransaction=false,post=reply=>results.push(reply)}={})=>{
   if(!insideTransaction)reader.exec('BEGIN');assert.equal(reader.isTransaction,true);
   const first=reader.prepare('SELECT n FROM value').get().n;
   if(message.id==='a')writer.exec('UPDATE value SET n=2');
   await turn();const second=reader.prepare('SELECT n FROM value').get().n;
   assert.equal(first,second,'no split inside actor read');readRows.push(message.id);time++;
   if(!insideTransaction)reader.exec('COMMIT');post({id:message.id,n:first});
  }
 });
 for(const id of ['a','b','c','d','e'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(results,[{id:'a',n:1},{id:'b',n:1},{id:'c',n:1},{id:'d',n:1},{id:'e',n:2}]);
 assert.deepEqual(readRows,['a','b','c','d','e']);assert.equal(reader.isTransaction,false);
});

test('real SQLite starts a fresh snapshot only after committed partial batch, with no actor replay',async t=>{
 const {writer,reader}=sqliteFixture(t),results=[],readRows=[];let time=0;
 const queue=new After({
  clock:()=>time,begin:()=>reader.exec('BEGIN'),commit:()=>reader.exec('COMMIT'),rollback:()=>reader.exec('ROLLBACK'),
  post:reply=>{
   assert.equal(reader.isTransaction,false);results.push(reply);
   if(reply.id==='a')writer.exec('UPDATE value SET n=2');
  },
  read:async(message,{insideTransaction=false,post=queue.post}={})=>{
   if(!insideTransaction)reader.exec('BEGIN');assert.equal(reader.isTransaction,true);
   const first=reader.prepare('SELECT n FROM value').get().n;
   await turn();const second=reader.prepare('SELECT n FROM value').get().n;assert.equal(first,second);
   readRows.push(message.id);time+=message.id==='a'?9:1;
   if(!insideTransaction)reader.exec('COMMIT');post({id:message.id,n:first});
  }
 });
 for(const id of ['a','b','c'])queue.push(actor(id));await finish(queue);
 assert.deepEqual(results,[{id:'a',n:1},{id:'b',n:2},{id:'c',n:2}]);
 assert.deepEqual(readRows,['a','b','c']);assert.equal(reader.isTransaction,false);
 assert.throws(()=>reader.exec('UPDATE value SET n=3'),/readonly/i);
});
