import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
const native=path.resolve(import.meta.dirname,'../working/native510-bb3a6cc689c6/vds-server/src');
const candidate=await import(native+'/writer-sql-timing477.mjs');
const baseline=await import((reviewWorkspace+'r88_release_work/working/native510-bb3a6cc689c6/vds-server/src/writer-sql-timing477.mjs'));
const {LocalDatabase}=await import(native+'/database.mjs');
const {installRewardGroupCommitR53}=await import('../working/core511-source/scripts/core511/reward-group-commit-r53.mjs');
const wait=async f=>{const end=Date.now()+5000;while(!f()){assert(Date.now()<end);await new Promise(r=>setTimeout(r,5));}};
test('disabled detail does not wrap SQLite and preserves results, failures and transaction state',t=>{
 const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());const prepare=sql.prepare,exec=sql.exec;
 candidate.installWriterSqlTiming477(sql,{enabled:false});assert.equal(sql.prepare,prepare);assert.equal(sql.exec,exec);
 sql.exec('CREATE TABLE t(id INTEGER PRIMARY KEY,n INTEGER);INSERT INTO t VALUES(1,4)');
 const read=sql.prepare('SELECT n FROM t'),method=read.get,target={};
 const result=candidate.measureWriterSql477(sql,()=>{sql.exec('BEGIN IMMEDIATE');sql.prepare('UPDATE t SET n=n+2').run();assert.equal(read.get().n,6);sql.exec('ROLLBACK');return read.get().n;},target);
 assert.equal(result,4);assert.equal(read.get,method);assert.deepEqual(target,{sqlTimingModeR105:'disabled'});assert.equal(sql.isTransaction,false);
 assert.throws(()=>candidate.measureWriterSql477(sql,()=>sql.prepare('INSERT INTO t VALUES(1,9)').run(),{}),e=>e.code==='ERR_SQLITE_ERROR');
 assert.equal(read.get().n,4);
});
test('explicit SQL diagnostic mode matches old counters even for statements prepared before measurement',t=>{
 const exercise=adapter=>{const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());let clock=0;adapter.installWriterSqlTiming477(sql,{enabled:true,now:()=>++clock});sql.exec('CREATE TABLE t(id INTEGER PRIMARY KEY,n INTEGER);INSERT INTO t VALUES(1,0)');const read=sql.prepare('SELECT n FROM t'),write=sql.prepare('UPDATE t SET n=n+?'),outer={},inner={};adapter.measureWriterSql477(sql,()=>{read.get();write.run(2);adapter.measureWriterSql477(sql,()=>read.all(),inner);sql.exec('UPDATE t SET n=n+1');assert.throws(()=>sql.prepare('SELECT * FROM absent'),/no such table/);},outer);assert.equal(read.get().n,3);return {outer,inner};};
 assert.deepEqual(exercise(candidate),exercise(baseline));
});
test('disabled detail retains grouped writer rollback, stage timings and durable acknowledgement',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r105-sql-timing-')),db=new LocalDatabase(dir+'/game.sqlite',{create:true,groupWrites:true});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 await db.atomic(sql=>sql.exec('CREATE TABLE balance(n INTEGER);INSERT INTO balance VALUES(0)'));
 installRewardGroupCommitR53(db,{enabled:true,windowMs:0,maxJobs:8,budgetMs:8});
 const timings=[{},{},{}],seen=[],sentinel=Error('rollback only this job');let release;
 const held=new Promise(r=>release=r),durable=db.durableAfterCommit.bind(db);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 const pending=[1,2,3].map((n,i)=>db.atomic(sql=>{sql.prepare('UPDATE balance SET n=n+?').run(n);if(n===2)throw sentinel;return n;},{timing:timings[i]}).then(n=>{seen.push(n);return n;}));const all=Promise.allSettled(pending);
 await wait(()=>db.sqlite.prepare('SELECT n FROM balance').get().n===4);assert.deepEqual(seen,[]);assert.equal(db.sqlite.isTransaction,false);release();const outcomes=await all;
 assert.deepEqual(outcomes.map(x=>x.status),['fulfilled','rejected','fulfilled']);assert.equal(outcomes[1].reason,sentinel);assert.deepEqual(seen,[1,3]);
 for(const row of timings){assert.equal(row.sqlTimingModeR105,'disabled');for(const k of ['queueMs','jobMs','commitMs','durableMs'])assert(Number.isFinite(row[k]),k);}
});
