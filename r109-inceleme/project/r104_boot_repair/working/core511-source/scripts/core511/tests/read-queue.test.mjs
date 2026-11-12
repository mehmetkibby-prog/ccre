import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {BoundedReadQueue} from '../bounded-read-queue.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {native,temporary,until} from './helpers.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');

test('100 simultaneous cold read requests stay within eight in-flight slots and preserve FIFO',async()=>{
 const queue=new BoundedReadQueue(),order=[];let active=0,max=0,release;const gate=new Promise(r=>release=r);
 const tasks=Array.from({length:100},(_,i)=>queue.run(async()=>{order.push(i);max=Math.max(max,++active);await gate;active--;return i;}));
 await Promise.resolve();assert.equal(queue.active,8);assert.equal(queue.waiting.length,92);release();assert.deepEqual(await Promise.all(tasks),Array.from({length:100},(_,i)=>i));assert.equal(max,8);assert.deepEqual(order,Array.from({length:100},(_,i)=>i));queue.close();
});

test('bounded cold read queue retains overload, timeout and close rejection',async()=>{
 const queue=new BoundedReadQueue({concurrency:1,maxQueued:1,waitMs:20});let release;
 const first=queue.run(()=>new Promise(r=>release=r));await Promise.resolve();const waiting=assert.rejects(queue.run(()=>99),{code:'read_worker_queue_timeout'});
 await assert.rejects(queue.run(()=>100),{code:'read_worker_backpressure'});await waiting;
 const closed=assert.rejects(queue.run(()=>101),{code:'read_worker_closed'});queue.close();await closed;release(1);assert.equal(await first,1);await assert.rejects(queue.run(()=>102),{code:'read_worker_closed'});
});

function fixture(t){
 const file=path.join(temporary(t),'queued.sqlite'),database=new LocalDatabase(file,{create:true,groupWrites:true,asyncDurable:true});database.sqlite.exec('CREATE TABLE fixture(id INTEGER PRIMARY KEY,amount INTEGER NOT NULL);INSERT INTO fixture VALUES(1,7)');
 const reader=new ReadWorker(file,new Map([['value','SELECT amount FROM fixture WHERE id=1'],['slow','WITH RECURSIVE n(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM n WHERE x<20000000) SELECT sum(x) AS total FROM n'],['forbidden','WITH n AS (SELECT 1) DELETE FROM fixture RETURNING *']]),{actorBundles:true});t.after(async()=>{await reader.close();database.close();});return {reader,database};
}

test('actual read-only SQLite worker accepts a 100-read burst without increasing its 16-message hard limit',async t=>{
 const {reader,database}=fixture(t);let maxPending=0;const send=reader.send.bind(reader);reader.send=(...args)=>{const result=send(...args);maxPending=Math.max(maxPending,reader.pending.size);return result;};
 const rows=await Promise.all(Array.from({length:100},()=>reader.query('value')));assert(rows.every(r=>r.rows[0].amount===7));assert.equal(reader.maxPending,16);assert(maxPending<=8);assert.equal(reader.starts,1);
 await assert.rejects(reader.query('forbidden'));assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);
});

test('queued reads accepted on a retired generation fail without being replayed on its replacement',async t=>{
 const {reader}=fixture(t);await reader.query('value');await until(()=>reader.readQueue.active===0);const old=reader.worker;
 const tasks=Array.from({length:100},()=>reader.query('slow').then(value=>({value}),error=>({error:error.code})));await until(()=>reader.pending.size===8);await old.terminate();
 const results=await Promise.all(tasks);assert(results.every(r=>r.error));assert.equal(results.filter(r=>r.error==='read_worker_process_changed').length,92);assert.equal(reader.starts,1);assert.equal(reader.pending.size,0);
 assert.equal((await reader.query('value')).rows[0].amount,7);assert.equal(reader.starts,2);
});
