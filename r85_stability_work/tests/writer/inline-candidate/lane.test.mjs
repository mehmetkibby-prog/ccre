import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate as tick} from 'node:timers/promises';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {exclusiveWriterLaneR533 as candidate} from '../../../working/core511-source/scripts/core511/writer-lane-r533.mjs';
import {exclusiveWriterLaneR533 as baseline} from '../../../working/core511-source/scripts/core511/writer-lane-r533.mjs?baseline';
import {LocalDatabase} from '../../../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {installRewardGroupCommitR53} from '../../../working/core511-source/scripts/core511/reward-group-commit-r53.mjs';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(install=candidate){
 const stats={turns:0,native:[]};
 const db={writeQueue:[],writeDrain:null,sqlite:{isTransaction:false},closed:false,maintenance:false,
  assertAvailable(){assert.equal(this.closed,false);assert.equal(this.maintenance,false);},
  scheduleWriteDrain(){if(this.writeDrain||!this.writeQueue.length)return;this.writeDrain=setImmediate(()=>{stats.turns++;this.drainWrites();});},
  drainWrites(){this.writeDrain=null;const job=this.writeQueue.shift();if(job){try{job.resolve(job.atomic());}catch(e){job.reject(e);}}this.scheduleWriteDrain();},
  async exec(sql){stats.native.push(sql);return sql;}
 };
 const lane=install(db);const atomic=work=>new Promise((resolve,reject)=>{db.writeQueue.push({atomic:work,resolve,reject});db.scheduleWriteDrain();});
 return {db,lane,stats,atomic};
}

test('12 queued external jobs use 3 bounded drains instead of 12 and publish in FIFO order',async()=>{
 for(const [install,expected] of [[baseline,12],[candidate,3]]){
  const f=fixture(install),events=[],turns=[];
  await Promise.all(Array.from({length:12},(_,i)=>f.lane.run(()=>{events.push(`start${i}`);turns.push(f.stats.turns);return i;}).then(v=>events.push(`ack${v}`))));
  await f.lane.idle();
  assert.equal(f.stats.turns,expected);assert.deepEqual(events,Array.from({length:12},(_,i)=>[`start${i}`,`ack${i}`]).flat());
  if(install===candidate)assert.deepEqual(turns,[1,1,1,1,2,2,2,2,3,3,3,3]);
  assert.equal(f.lane.snapshot().completedExternal,12);
 }
});

test('a 4ms synchronous invocation consumes the continuation budget',async t=>{
 const f=fixture(),turns=[];let now=100;
 t.mock.method(performance,'now',()=>now);
 await Promise.all([f.lane.run(()=>{turns.push(f.stats.turns);now+=4;}),f.lane.run(()=>turns.push(f.stats.turns))]);
 assert.deepEqual(turns,[1,2]);
});

test('main atomic FIFO entry is never crossed and later preflight is fresh',async()=>{
 const f=fixture(),release=deferred(),entered=deferred(),events=[];let owner='old';
 const first=f.lane.run(async()=>{events.push('first');entered.resolve();await release.promise;events.push('durable-first');});
 const main=f.atomic(()=>{owner='new';events.push('main');});
 const next=f.lane.run(()=>{events.push(`next:${owner}`);});
 await entered.promise;assert.equal(f.db.writeQueue.length,2);release.resolve();
 await Promise.all([first,main,next]);assert.deepEqual(events,['first','durable-first','main','next:new']);assert.equal(f.stats.turns,3);
});

test('cold/freeze idle waiter retains the original one-job boundary',async()=>{
 const f=fixture(),release=deferred(),entered=deferred(),events=[];
 const first=f.lane.run(async()=>{entered.resolve();await release.promise;events.push('first');});
 const next=f.lane.run(()=>events.push('next'));
 await entered.promise;const idle=f.lane.idle().then(()=>{events.push('idle');assert.equal(f.db.writeQueue.length,1);});
 release.resolve();await Promise.all([first,idle,next]);assert.deepEqual(events,['first','idle','next']);assert.equal(f.stats.turns,2);
});

test('idle requested by the durable publication callback stops the next job',async()=>{
 const f=fixture(),events=[];let idle;
 const first=f.lane.run(()=>1).then(()=>{events.push('ack');idle=f.lane.idle().then(()=>events.push('idle'));});
 const next=f.lane.run(()=>events.push('next'));
 await Promise.all([first,next]);await idle;
 assert.deepEqual(events,['ack','idle','next']);assert.equal(f.stats.turns,2);
});

test('maintenance/closed state observed at ACK prevents an inline successor',async()=>{
 for(const field of ['maintenance','closed']){
  const f=fixture(),events=[];
  const first=f.lane.run(()=>{f.db[field]=true;events.push('first');});
  const next=f.lane.run(()=>events.push('next'));
  await Promise.all([first,next]);assert.deepEqual(events,['first','next']);assert.equal(f.stats.turns,2);
 }
});

test('legacy native write waits for current ACK and prevents continuation',async()=>{
 const f=fixture(),release=deferred(),entered=deferred(),events=[];
 const first=f.lane.run(async()=>{entered.resolve();await release.promise;events.push('first');});
 const next=f.lane.run(()=>{events.push('next');assert.deepEqual(f.stats.native,['UPDATE fixture']);});
 await entered.promise;const write=f.db.exec('UPDATE fixture').then(()=>events.push('native'));assert.equal(f.lane.nativeWrites,1);
 release.resolve();await Promise.all([first,write,next]);assert.deepEqual(events,['first','native','next']);assert.equal(f.stats.turns,2);
});

test('rejected work preserves later queued job and yields a scheduler turn',async()=>{
 const f=fixture(),error=Error('worker_failed'),events=[];
 const first=f.lane.run(()=>{events.push('first');throw error;});
 const next=f.lane.run(()=>events.push('next'));
 await assert.rejects(first,e=>e===error);await next;await f.lane.idle();
 assert.deepEqual(events,['first','next']);assert.equal(f.stats.turns,2);assert.equal(f.lane.snapshot().completedExternal,2);
});

test('an awaited worker yields to I/O and future callbacks see current preflight state',async()=>{
 const f=fixture(),events=[];let presence=1;
 const first=f.lane.run(async()=>{events.push('start');await tick();presence=2;events.push('worker-ack');});
 const next=f.lane.run(()=>events.push(`preflight:${presence}`));
 await Promise.all([first,next]);assert.deepEqual(events,['start','worker-ack','preflight:2']);assert.equal(f.stats.turns,1);
});

test('durable native DB atomic FIFO and rollback remain identical under actual group wrapper',async t=>{
 const directory=mkdtempSync(join(tmpdir(),'r85-inline-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
 const db=new LocalDatabase(join(directory,'fixture.sqlite'),{create:true,groupWrites:true,asyncDurable:true});
 t.after(()=>db.close());db.sqlite.exec('CREATE TABLE proofs(id INTEGER PRIMARY KEY,value INTEGER NOT NULL); INSERT INTO proofs VALUES(1,0)');
 installRewardGroupCommitR53(db,{enabled:true,windowMs:0});const lane=candidate(db),events=[];
 const first=lane.run(async()=>{assert.equal(db.sqlite.isTransaction,false);events.push('external-one');await tick();return 1;});
 const durable=db.atomic(sql=>{sql.prepare('UPDATE proofs SET value=value+1 WHERE id=1').run();events.push('native-commit');return 2;});
 const rolledBack=db.atomic(sql=>{sql.prepare('UPDATE proofs SET value=999 WHERE id=1').run();throw Error('savepoint_failure');});
 const next=lane.run(()=>{assert.equal(db.sqlite.isTransaction,false);assert.equal(db.sqlite.prepare('SELECT value FROM proofs').get().value,1);events.push('external-two');return 3;});
 const result=await Promise.allSettled([first,durable,rolledBack,next]);await lane.idle();await db.walSync.durable();
 assert.deepEqual(result.map(x=>x.status),['fulfilled','fulfilled','rejected','fulfilled']);
 assert.deepEqual(events,['external-one','native-commit','external-two']);assert.equal(db.sqlite.prepare('PRAGMA synchronous').get().synchronous,1);
 assert.equal(db.sqlite.prepare('SELECT value FROM proofs').get().value,1);assert.equal(lane.snapshot().completedExternal,2);
});
