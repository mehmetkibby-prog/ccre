import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import fs from 'node:fs';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary,until} from './helpers.mjs';
import {installGroupCommit} from '../group-commit.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const burn=()=>{const end=performance.now()+4;while(performance.now()<end){}};
async function fixture(t){const file=path.join(temporary(t),'group.sqlite'),db=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{if(!db.closed)db.close();await db.walSync.closing;});await db.atomic(sql=>sql.exec('CREATE TABLE money(n INTEGER);INSERT INTO money VALUES(0);CREATE TABLE applied(id INTEGER PRIMARY KEY)'));return {db,file};}
test('separate FIFO transactions share one fsync; each ACK waits and a later COMMIT waits for the next fsync',async t=>{
 const {db}=await fixture(t);installGroupCommit(db);const flush=db.walSync.flush.bind(db.walSync),holds=[],acks=[],timings=[{},{},{}];
 db.walSync.flush=async()=>{await new Promise(resolve=>holds.push(resolve));return flush();};
 const write=i=>db.atomic(sql=>{sql.prepare('INSERT INTO applied VALUES(?)').run(i);sql.exec('UPDATE money SET n=n+1');burn();return i;},{timing:timings[i-1]}).then(value=>{acks.push(value);return value;});
 const before=db.writeStats.commits,a=write(1),b=write(2);await until(()=>holds.length===1);
 assert.equal(db.writeStats.commits-before,2);assert.equal(db.sqlite.isTransaction,false);assert.equal(db.sqlite.prepare('SELECT n FROM money').get().n,2);assert.deepEqual(acks,[]);
 const c=write(3);await until(()=>db.writeStats.commits-before===3);assert.deepEqual(acks,[]);
 holds[0]();await Promise.all([a,b]);assert.deepEqual(acks,[1,2]);await until(()=>holds.length===2);assert.deepEqual(acks,[1,2]);holds[1]();await c;
 assert.equal(timings[0].flushId,timings[1].flushId);assert.notEqual(timings[1].flushId,timings[2].flushId);assert.equal(new Set(timings.map(x=>x.batchId)).size,3);
});
test('failed native WAL fsync releases no successful ACK and retains fail-closed recovery',async t=>{
 const {db}=await fixture(t);installGroupCommit(db);const flush=db.walSync.flush.bind(db.walSync),acks=[];
 db.walSync.flush=async()=>{throw Error('injected_sync_failure');};
 const pending=[1,2].map(i=>db.atomic(sql=>{sql.prepare('INSERT INTO applied VALUES(?)').run(i);burn();}).then(()=>acks.push(i)));
 const outcomes=await Promise.allSettled(pending);assert(outcomes.every(x=>x.status==='rejected'));assert.deepEqual(acks,[]);assert(db.walSync.failed);assert.equal(db.sqlite.prepare('PRAGMA synchronous').get().synchronous,2);
 db.walSync.flush=flush;await db.atomic(sql=>sql.prepare('SELECT count(*) FROM applied').get());assert(db.walSync.recovery);assert(db.walSync.failed,'NORMAL must never re-enable');
});
for(const phase of ['before_commit','before_fsync','after_fsync','after_ack'])test('actual grouped SIGKILL '+phase+' keeps receipt/state atomic and retry pays once',async t=>{
 const {db,file}=await fixture(t);const peer={realm:'group-test'},event=i=>({realm:peer.realm,key:'reward:'+i,actor:'p',kind:'reward',payload:{i}});
 const ledger=new DurableLedger(db,{authorize:()=>true,handlers:new Map([['reward',(sql,{i})=>{sql.prepare('INSERT INTO applied VALUES(?)').run(i);sql.exec('UPDATE money SET n=n+1');return {i,n:sql.prepare('SELECT n FROM money').get().n};}]])});
 db.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');db.close();await db.walSync.closing;
 const marker=path.join(path.dirname(file),'marker.json'),child=spawn(process.execPath,[path.join(import.meta.dirname,'group-commit-crash.mjs'),file,phase,marker],{stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',b=>errors+=b);const [code,signal]=await once(child,'exit');assert.equal(code,null,errors);assert.equal(signal,'SIGKILL',errors);
 const proof=JSON.parse(fs.readFileSync(marker));assert.equal(proof.acks,phase==='after_ack'?2:0);if(phase!=='before_commit')assert.equal(proof.commits,2);
 const recover=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});installGroupCommit(recover);t.after(async()=>{recover.close();await recover.walSync.closing;});
 const count=recover.sqlite.prepare('SELECT n FROM money').get().n;assert(count>=0&&count<=2);assert.equal(recover.sqlite.prepare('SELECT count(*) n FROM kernel511_receipts').get().n,count);assert.equal(recover.sqlite.prepare('SELECT count(*) n FROM applied').get().n,count);if(['after_fsync','after_ack'].includes(phase))assert.equal(count,2);
 const replay=new DurableLedger(recover,{authorize:()=>true,handlers:ledger.handlers});for(const i of [1,2]){const a=await replay.submit(peer,event(i)),b=await replay.submit(peer,event(i));assert.deepEqual(a.result,b.result);}
 assert.equal(recover.sqlite.prepare('SELECT n FROM money').get().n,2);assert.equal(recover.sqlite.prepare('SELECT count(*) n FROM kernel511_receipts').get().n,2);
});
