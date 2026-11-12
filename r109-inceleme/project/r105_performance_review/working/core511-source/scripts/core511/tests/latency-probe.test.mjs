import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {native,temporary,until} from './helpers.mjs';
import {writerLatencyProbe} from '../benchmark/latency-probe.mjs';
import {installGroupCommit} from '../group-commit.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
test('startup probe identifies FIFO predecessors and complete callbacks without early durable ACK',async t=>{
 const db=new LocalDatabase(path.join(temporary(t),'probe.sqlite'),{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});
 await db.atomic(sql=>sql.exec('CREATE TABLE applied(n INTEGER)'));installGroupCommit(db);
 const nativeAtomic=db.atomic;db.atomic=function(work,options){return nativeAtomic.call(this,sql=>{const value=work(sql);sql.prepare('INSERT INTO applied VALUES(?)').run(9);return value;},options);};
 const writer={database:db,system:{command:(_p,r)=>db.atomic(sql=>{sql.prepare('INSERT INTO applied VALUES(?)').run(r.n);return r.n;})},command(_p,r){return db.atomic(sql=>{sql.prepare('INSERT INTO applied VALUES(?)').run(r.n);return r.n;});},notificationAck(){return db.atomic(sql=>sql.prepare('SELECT count(*) n FROM applied').get());},notificationPending(){return [];}};
 const probe=writerLatencyProbe(writer,{sqlTiming:false}),flush=db.walSync.flush.bind(db.walSync),holds=[],acks=[];db.walSync.flush=async()=>{await new Promise(r=>holds.push(r));return flush();};probe.begin();
 const peer={channel:1},a=writer.command(peer,{n:1,playerId:'p',operation:'actor_checkpoint',operationId:'a'}).then(x=>acks.push(x)),b=writer.notificationAck(peer,{actor:'p'}),c=writer.command(peer,{n:2,playerId:'p',operation:'native_action',operationId:'c',payload:{input:{action:'use_potion'}}}).then(x=>acks.push(x));
 writer.notificationPending(peer,{actor:'p'});await until(()=>holds.length===1);assert.deepEqual(acks,[]);holds[0]();await Promise.all([a,b,c]);
 const result=probe.end(),rows=result.rows.sort((x,y)=>x.id-y.id),potion=rows[2];assert.deepEqual(rows.map(r=>r.kind),['actor_checkpoint','notification_ack','native_action']);assert.deepEqual(potion.ahead,rows.slice(0,2).map(r=>r.id));assert.equal(potion.queueDepth,2);assert.deepEqual(acks,[1,2]);
 assert.deepEqual(db.sqlite.prepare('SELECT n FROM applied').all().map(r=>r.n),[1,9,9,2,9]);assert(rows.every(r=>r.startedAtMs>=r.enqueuedAtMs&&r.callbackEndedAtMs>=r.startedAtMs&&r.ackAtMs>=r.callbackEndedAtMs));assert.equal(result.reads[0].kind,'notification_pending');assert(result.commits.length>0);assert.equal(result.dropped,0);
});
