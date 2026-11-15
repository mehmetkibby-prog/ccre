import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
import {DatabaseSync} from 'node:sqlite';
const core=new URL('../r109_latency_completion/working/core511-source/scripts/core511/',import.meta.url);
const {WriterMaintenance:Current}=await import(new URL('writer-maintenance.mjs',core));
const source=fs.readFileSync(new URL('./evidence/writer-maintenance-r121.mjs',import.meta.url),'utf8').replace(/from '(\.\/[^']+)'/g,(_,p)=>"from '"+new URL(p,core).href+"'");
const {WriterMaintenance:Before}=await import('data:text/javascript;base64,'+Buffer.from(source).toString('base64'));
const {initializeCommittedStoreR113}=await import(new URL('committed-store-r113.mjs',core));
let budgetClock=0;const spin=ms=>{budgetClock+=ms;};
async function run(Type){
 const sql=new DatabaseSync(':memory:');initializeCommittedStoreR113(sql);sql.exec(`CREATE TABLE kernel511_system_receipts(operation_id TEXT PRIMARY KEY,created_ms INTEGER);CREATE TABLE kernel511_notifications(event_id TEXT PRIMARY KEY,created_ms INTEGER);CREATE TABLE kernel511_notification_audience(actor TEXT,event_id TEXT,acknowledged INTEGER,PRIMARY KEY(actor,event_id)) WITHOUT ROWID`);
 const insert=sql.prepare('INSERT INTO kernel511_system_receipts VALUES(?,0)');for(let n=0;n<10000;n++)insert.run('s'+n);
 let now=100000000;const facade={get isTransaction(){return sql.isTransaction;},prepare(q){const s=sql.prepare(q);if(q.includes('SELECT')&&q.includes('LIMIT ?'))return {all(...args){spin(1);return s.all(...args);}};return s;}};
 const database={sqlite:facade,writeQueue:[],atomic(fn){sql.exec('BEGIN');try{const result=fn(facade);sql.exec('COMMIT');return Promise.resolve(result);}catch(e){sql.exec('ROLLBACK');throw e;}}};
 const writer={database,system:{pending:0},inflight:0,authority:{pruneReceipts(){return this.database.atomic(()=>{spin(1);return {changes:0};});}}};
 const m=new Type(writer,{retention:true,idleCheckpoint:false,clock:()=>now});const started=process.hrtime.bigint();
 try{for(let n=0;n<600;n++){now+=100;await m.step();}return {removed:m.metrics.system,passes:m.metrics.passes,maxBatchMs:m.metrics.maxBatchMs,wallMs:Number(process.hrtime.bigint()-started)/1e6};}finally{m.close();sql.close();}
}
test('independent batches and catch-up improve controlled cleanup capacity without shortening retention',async t=>{
 t.mock.method(performance,'now',()=>budgetClock);
 const before=await run(Before),after=await run(Current);
 const result={scenario:'60 seconds simulated idle windows; virtual clock and fixed 1 ms SELECT budget cost; scheduling regression test, not measured live throughput',before,after};
 fs.writeFileSync(new URL('evidence/retention-capacity.json',import.meta.url),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
 assert(after.removed>before.removed*3);
});
