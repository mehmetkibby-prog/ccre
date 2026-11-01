import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary} from './helpers.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {randomUUID} from 'node:crypto';
const {LocalDatabase}=await native('vds-server/src/database.mjs');

function setup(t,options={}){
 const file=path.join(temporary(t),'read-recovery.sqlite'),database=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true});
 database.sqlite.exec('CREATE TABLE fixture(id INTEGER PRIMARY KEY,amount INTEGER NOT NULL);INSERT INTO fixture VALUES(1,7)');
 const reader=new ReadWorker(file,new Map([
  ['value','SELECT amount FROM fixture WHERE id=1'],
  ['slow','WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<2000000) SELECT sum(x) AS total FROM n'],
  ['forbidden','WITH n AS (SELECT 1) DELETE FROM fixture RETURNING *']
 ]),options);
 t.after(async()=>{await reader.close();database.close();});return {database,reader};
}

test('an exited read-only worker restarts once for concurrent future reads of the current database',async t=>{
 const {database,reader}=setup(t);assert.equal((await reader.query('value')).rows[0].amount,7);const old=reader.worker;
 await old.terminate();assert.equal(reader.closed,false);await database.atomic(sql=>sql.prepare('UPDATE fixture SET amount=11 WHERE id=1').run());
 const values=await Promise.all(Array.from({length:8},()=>reader.query('value')));assert(values.every(v=>v.rows[0].amount===11));assert.equal(reader.starts,2);assert.notEqual(reader.worker,old);
 await assert.rejects(reader.query('forbidden'));assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,11);assert.equal(reader.pending.size,0);
});

test('interrupted read requests reject without replay and an old generation cannot answer a new request',async t=>{
 const {reader}=setup(t),old=reader.worker,first=reader.query('slow'),second=reader.query('value');
 const rejected=Promise.all([assert.rejects(first,/read_worker_closed/),assert.rejects(second,/read_worker_closed/)]);await Promise.resolve();await old.terminate();await rejected;assert.equal(reader.pending.size,0);
 const next=reader.query('value'),id=reader.sequence;await Promise.resolve();old.emit('message',{id,ok:true,rows:[{amount:999999}],workMs:0});
 assert.equal((await next).rows[0].amount,7);assert.equal(reader.starts,2);assert.equal(reader.pending.size,0);
});

test('a timed-out query keeps backpressure, retires its thread, and permits a later query after observed exit',async t=>{
 const {reader}=setup(t,{maxPending:1});await reader.query('value');reader.timeoutMs=1;const old=reader.worker,pending=reader.query('slow'),rejected=assert.rejects(pending,/read_worker_timeout/);
 await assert.rejects(reader.query('value'),/read_worker_backpressure/);await rejected;reader.timeoutMs=5000;
 assert.equal((await reader.query('value')).rows[0].amount,7);assert.equal(reader.starts,2);assert.equal(old.threadId,-1);assert.equal(reader.pending.size,0);
});

test('explicit close cancels a waiting recovery and never creates another worker',async t=>{
 const {reader}=setup(t);await reader.worker.terminate();const pending=reader.query('value'),rejected=assert.rejects(pending,/read_worker_closed/);await reader.close();await rejected;
 await assert.rejects(reader.query('value'),/read_worker_closed/);assert.equal(reader.starts,1);assert.equal(reader.pending.size,0);
});

test('a read-only measurement timeout does not terminate or replay a live native query',async t=>{
 const {reader}=setup(t);await reader.query('value');const slot=reader.slot,runId=randomUUID(),query=reader.query('slow');
 const sample=reader.send({type:'load_measure',payload:{operation:'begin',runId}},{expectedSlot:slot,timeoutMs:1,terminateOnTimeout:false});await assert.rejects(sample,{code:'read_measurement_timeout'});assert.equal(slot.failed,false);assert.equal(reader.starts,1);assert.equal((await query).rows[0].total,2000001000000);
 await reader.measure({operation:'cancel',runId},{slot});assert.equal((await reader.query('value')).rows[0].amount,7);assert.equal(reader.slot,slot);assert.equal(reader.pending.size,0);assert.equal(reader.starts,1);
});
