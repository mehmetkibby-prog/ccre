import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {Worker} from 'node:worker_threads';
import {mkdtempSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {CheckpointRuntimeR79} from '../r80-work/core511-source/scripts/core511/checkpoint-runtime-r79.mjs';
import {WalCheckpoint} from '../r80-work/native510-bb3a6cc689c6/vds-server/src/wal-checkpoint.mjs';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
async function until(predicate,{timeout=8000}={}){const end=performance.now()+timeout;while(!predicate()){assert.ok(performance.now()<end,'condition timed out');await sleep(5);}}
const auto=sql=>Number(sql.prepare('PRAGMA wal_autocheckpoint').get().wal_autocheckpoint);
const sync=sql=>Number(sql.prepare('PRAGMA synchronous').get().synchronous);
const fastRetry={initialMs:25,maxMs:200,maxAttempts:3,stableMs:100000,probeIntervalMs:30,probeMaxIntervalMs:90,probeHealthyPasses:2};

function fixture(t,{options={},retryOptions={}}={}){
 const directory=mkdtempSync(join(tmpdir(),'core511-r80-checkpoint-')),file=join(directory,'test.sqlite'),sql=new DatabaseSync(file);
 sql.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA wal_autocheckpoint=4000; CREATE TABLE t(id INTEGER PRIMARY KEY, bytes BLOB); INSERT INTO t(bytes) VALUES(zeroblob(4096));');
 const database={sqlite:sql},events=[];
 const runtime=new CheckpointRuntimeR79(database,file,{options:{intervalMs:60000,...options},retryOptions:{...fastRetry,...retryOptions},report:event=>events.push(event)});
 const workers=[runtime.worker],originalStart=runtime.start.bind(runtime);
 runtime.start=function(recovery){
  assert.ok(workers.every(worker=>!worker?.worker||worker.exited),'replacement started before actual prior worker exit');
  const result=originalStart(recovery);workers.push(this.worker);return result;
 };
 const value={directory,file,sql,database,events,runtime,workers,readers:[],reward:null};
 t.after(async()=>{
  try{await value.reward?.close();await runtime.close();}
  finally{for(const reader of value.readers)try{reader.close();}catch{}try{sql.close();}catch{}rmSync(directory,{recursive:true,force:true});}
 });
 return value;
}

async function rewardFixture(file,buffer){
 const worker=new Worker(new URL('./checkpoint-reward-worker.mjs',import.meta.url),{workerData:{file,buffer}}),pending=new Map();let serial=0;
 const initial=await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
 worker.on('message',message=>{const slot=pending.get(message.id);if(!slot)return;pending.delete(message.id);clearTimeout(slot.timer);message.ok?slot.resolve(message.result??message):slot.reject(Error(message.code));});
 const request=kind=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{pending.delete(id);reject(Error('reward fixture timeout'));},5000);pending.set(id,{resolve,reject,timer});worker.postMessage({id,kind});});
 return {initial,request,async close(){try{await request('close');}finally{await worker.terminate();}}};
}

test('production backlog threshold: pinned reader retains one standby worker; both connections recover safely',{timeout:20000},async t=>{
 const f=fixture(t);assert.equal(await f.runtime.ready,true);assert.equal(f.runtime.worker.maxPendingPages,16384);
 assert.equal(await f.runtime.worker.check(),true);
 f.reward=await rewardFixture(f.file,f.runtime.buffer);assert.equal(f.reward.initial.autocheckpoint,0);assert.equal(f.reward.initial.synchronous,2);
 const reader=new DatabaseSync(f.file,{readOnly:true});f.readers.push(reader);reader.exec('BEGIN');reader.prepare('SELECT COUNT(*) FROM t').get();
 f.sql.exec('BEGIN IMMEDIATE');const insert=f.sql.prepare('INSERT INTO t(bytes) VALUES(zeroblob(4194304))');for(let i=0;i<17;i++)insert.run();f.sql.exec('COMMIT');
 const old=f.runtime.worker;assert.equal(await old.check(),false);assert.equal(old.snapshot().fallback,'checkpoint-backlog');
 assert.equal(auto(f.sql),4000);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),0);
 assert.equal((await f.reward.request('commit')).autocheckpoint,4000);
 await until(()=>f.runtime.snapshot().retryR80.state==='probing'&&f.runtime.worker.snapshot().recoveryProbe.attempts>=3);
 const candidate=f.runtime.worker;assert.notEqual(candidate,old);assert.equal(old.exited,true);assert.equal(candidate.snapshot().ready,false);
 assert.equal(f.runtime.attempts,1);assert.equal(f.workers.length,2);assert.equal(auto(f.sql),4000);assert.equal(sync(f.sql),2);
 assert.equal((await f.reward.request('commit')).autocheckpoint,4000);
 await sleep(110);assert.equal(f.runtime.worker,candidate);assert.equal(f.runtime.attempts,1,'long reader must not churn checkpoint workers');
 reader.exec('COMMIT');
 await until(()=>f.runtime.snapshot().ready&&f.runtime.snapshot().retryR80.recoveries===1);
 assert.equal(f.runtime.worker,candidate);assert.ok(candidate.snapshot().recoveryProbe.healthyPasses>=2);
 assert.equal(auto(f.sql),0);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),1);
 const reward=await f.reward.request('commit');assert.equal(reward.autocheckpoint,0);assert.equal(reward.synchronous,2);
 assert.equal(f.sql.prepare('SELECT COUNT(*) AS n FROM t').get().n,18);assert.equal(f.sql.prepare('PRAGMA quick_check').get().quick_check,'ok');
 assert.ok(f.events.some(event=>event.state==='recovered'));assert.equal(f.runtime.snapshot().fallback,null);
 await f.runtime.close();assert.equal(auto(f.sql),4000);assert.equal((await f.reward.request('commit')).autocheckpoint,4000);
});

test('repeated actual worker exits obey bounded exponential retry and never overlap',{timeout:8000},async t=>{
 const f=fixture(t,{options:{workerFile:new URL('./checkpoint-crash-worker.mjs',import.meta.url)}});
 assert.equal(await f.runtime.ready,false);
 await until(()=>f.runtime.snapshot().retryR80.state==='retry-exhausted');
 assert.equal(f.runtime.attempts,3);assert.equal(f.workers.length,4);assert.equal(f.runtime.snapshot().retryR80.retryAllowed,false);
 assert.deepEqual(f.events.filter(event=>event.state==='retry-wait').map(event=>event.delayMs),[25,50,100]);
 await until(()=>f.workers.every(worker=>worker.exited));
 await sleep(230);assert.equal(f.workers.length,4);assert.equal(auto(f.sql),4000);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),0);
});

test('unclassified real SQLite worker error stays in safe fallback without blind retry',{timeout:5000},async t=>{
 const f=fixture(t,{options:{workerFile:new URL('./checkpoint-error-worker.mjs',import.meta.url)}});
 assert.equal(await f.runtime.ready,false);await sleep(150);
 assert.equal(f.runtime.snapshot().fallback,'worker-error');assert.equal(f.runtime.snapshot().retryR80.retryAllowed,false);
 assert.equal(f.runtime.attempts,0);assert.equal(f.workers.length,1);assert.equal(auto(f.sql),4000);
});

test('checkpoint timeout retries remain automatic until a replacement actually proves ready',{timeout:8000},async t=>{
 const f=fixture(t,{options:{workerFile:new URL('./checkpoint-timeout-worker.mjs',import.meta.url),deadlineMs:40}});
 assert.equal(await f.runtime.ready,true);assert.equal(await f.runtime.worker.check(),false);assert.equal(auto(f.sql),4000);
 await until(()=>f.runtime.snapshot().retryR80.state==='retry-exhausted');
 assert.equal(f.runtime.attempts,3);assert.equal(f.runtime.recoveries,0);assert.equal(auto(f.sql),4000);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),0);
 assert.ok(f.events.every(event=>event.state!=='recovered'));
});

test('shutdown cancels a scheduled retry',{timeout:5000},async t=>{
 const f=fixture(t,{retryOptions:{initialMs:70,maxMs:100}});assert.equal(await f.runtime.ready,true);
 f.runtime.worker.fail('checkpoint-timeout');assert.equal(f.runtime.snapshot().retryR80.state,'retry-wait');
 await f.runtime.close();await sleep(130);assert.equal(f.runtime.attempts,0);assert.equal(f.workers.length,1);assert.equal(f.runtime.snapshot().retryR80.state,'closed');assert.equal(auto(f.sql),4000);
});

test('shutdown racing a pending exit proof cannot start a new worker',{timeout:5000},async t=>{
 const f=fixture(t);assert.equal(await f.runtime.ready,true);const old=f.runtime.worker,nativeClose=old.close.bind(old);
 let release;const held=new Promise(resolve=>{release=resolve;});
 old.close=()=>nativeClose().then(()=>held);
 try{
  old.fail('checkpoint-timeout');await until(()=>Boolean(f.runtime.retrying));
  const closing=f.runtime.close();assert.equal(f.runtime.closed,true);release();await closing;await sleep(100);
  assert.equal(f.runtime.attempts,0);assert.equal(f.workers.length,1);assert.equal(old.exited,true);assert.equal(auto(f.sql),4000);
 }finally{release();}
});

test('shutdown during a real reader-blocked probe leaves no retry or disabled autocheckpoint',{timeout:6000},async t=>{
 const f=fixture(t);assert.equal(await f.runtime.ready,true);await f.runtime.worker.check();
 const reader=new DatabaseSync(f.file,{readOnly:true});f.readers.push(reader);reader.exec('BEGIN');reader.prepare('SELECT COUNT(*) FROM t').get();
 f.sql.exec('INSERT INTO t(bytes) VALUES(zeroblob(16384))');
 f.runtime.worker.fail('checkpoint-backlog');
 await until(()=>f.runtime.snapshot().retryR80.state==='probing'&&f.runtime.worker.snapshot().recoveryProbe.attempts>=1);
 assert.equal(f.runtime.worker.snapshot().ready,false);await f.runtime.close();const count=f.workers.length;await sleep(150);
 assert.equal(f.workers.length,count);assert.ok(f.workers.every(worker=>worker.exited));assert.equal(auto(f.sql),4000);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),0);
});

test('a refused worker-exit proof prevents replacement and retains safe fallback',{timeout:5000},async t=>{
 const f=fixture(t);assert.equal(await f.runtime.ready,true);const old=f.runtime.worker,nativeClose=old.close.bind(old);
 old.close=()=>Promise.reject(Error('injected unconfirmed exit'));
 try{
  old.fail('checkpoint-timeout');
  await until(()=>f.runtime.snapshot().retryR80.lastFallback==='worker-close'&&!f.runtime.retrying);
  assert.equal(f.runtime.attempts,0);assert.equal(f.workers.length,1);assert.equal(f.runtime.snapshot().retryR80.retryAllowed,false);
  assert.equal(auto(f.sql),4000);assert.equal(Atomics.load(new Int32Array(f.runtime.buffer),0),0);
  await sleep(100);assert.equal(f.workers.length,1);
 }finally{old.close=nativeClose;}
});

test('unsupported SQLite safety gate remains closed and runtime cannot spoof its version',{timeout:5000},async t=>{
 const f=fixture(t,{options:{sqliteVersion:'99.0.0'}});assert.equal(await f.runtime.ready,true);assert.equal(f.runtime.snapshot().sqliteVersion,process.versions.sqlite);
 const native=new WalCheckpoint(f.file,{sqliteVersion:'3.50.6'});
 assert.equal(await native.ready,false);assert.equal(native.snapshot().fallback,'sqlite-version');assert.equal(native.worker,undefined);await native.close();
});

test('production LocalDatabase NORMAL plus real async WAL fsync remains durable across recovery',{timeout:8000},async t=>{
 const {LocalDatabase}=await import('../r80-work/native510-bb3a6cc689c6/vds-server/src/database.mjs');
 const directory=mkdtempSync(join(tmpdir(),'core511-r80-async-checkpoint-')),file=join(directory,'test.sqlite');
 const database=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true});let runtime;
 t.after(async()=>{try{await runtime?.close();database.close();await database.walSync?.closing;}finally{rmSync(directory,{recursive:true,force:true});}});
 await database.atomic(sql=>sql.exec('CREATE TABLE t(id INTEGER PRIMARY KEY, value TEXT);'));
 assert.ok(database.walSync);assert.equal(sync(database.sqlite),1);
 runtime=new CheckpointRuntimeR79(database,file,{options:{intervalMs:60000},retryOptions:{...fastRetry,initialMs:100},report:()=>{}});
 assert.equal(await runtime.ready,true);const before=database.walSync.snapshot().syncs;
 await runtime.worker.worker.terminate();
 assert.equal(auto(database.sqlite),4000);assert.equal(sync(database.sqlite),1);
 await database.atomic(sql=>sql.prepare('INSERT INTO t(value) VALUES(?)').run('fallback-write'));
 assert.ok(database.walSync.snapshot().syncs>before,'the real fsync acknowledgement must complete');
 await until(()=>runtime.snapshot().ready&&runtime.recoveries===1);
 assert.equal(auto(database.sqlite),0);assert.equal(sync(database.sqlite),1);
 const middle=database.walSync.snapshot().syncs;
 await database.atomic(sql=>sql.prepare('INSERT INTO t(value) VALUES(?)').run('recovered-write'));
 assert.ok(database.walSync.snapshot().syncs>middle);assert.equal(database.sqlite.prepare('SELECT COUNT(*) AS n FROM t').get().n,2);
});
