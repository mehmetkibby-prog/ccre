import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary,NODE,until} from './helpers.mjs';
import {DurableLedger} from '../durable-ledger.mjs';
import {ReliableStream,createStreamServer} from '../reliable-stream.mjs';
import {ReadWorker} from '../read-worker.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
function fixture(file,{create=false}={}){
 const database=new LocalDatabase(file,{create,groupWrites:true,asyncDurable:true});
 if(create)database.sqlite.exec('CREATE TABLE fixture(id INTEGER PRIMARY KEY,amount INTEGER NOT NULL);INSERT INTO fixture VALUES(1,0)');
 const ledger=new DurableLedger(database,{authorize:(_,peer,event)=>peer.realm==='test'&&event.realm==='test'&&peer.epoch===1,handlers:new Map([['fixture',(sqlite,payload)=>{
  sqlite.prepare('UPDATE fixture SET amount=amount+? WHERE id=1').run(payload.amount);
  if(payload.fail)throw Object.assign(Error('rejected'),{code:'fixture_rejected'});
  return {amount:sqlite.prepare('SELECT amount FROM fixture WHERE id=1').get().amount};
 }]])});return {database,ledger};
}
const peer={realm:'test',epoch:1};
const event={realm:'test',key:'reward:1',actor:'test-player',kind:'fixture',payload:{amount:7}};
test('component: concurrent duplicate receipts commit once, reject reused keys and roll back failed handlers',async t=>{
 const dir=temporary(t),{database,ledger}=fixture(path.join(dir,'test.sqlite'),{create:true});t.after(()=>database.close());
 const replies=await Promise.all(Array.from({length:32},()=>ledger.submit(peer,event)));
 assert.equal(replies.filter(r=>!r.replayed).length,1);assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);
 await assert.rejects(ledger.submit(peer,{...event,payload:{amount:8}}),/economy_key_reused/);
 await assert.rejects(ledger.submit({...peer,epoch:2},event),/economy_owner_or_test_scope_rejected/);
 await assert.rejects(ledger.submit(peer,{...event,realm:'production',key:'other'}),/economy_owner_or_test_scope_rejected/);
 await assert.rejects(ledger.submit(peer,{...event,key:'bad',payload:{amount:100,fail:true}}),/rejected/);
 assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM kernel511_receipts').get().n,1);
 assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);
});
for(const mode of ['before','after'])test('component: actual SIGKILL '+mode+' COMMIT, WAL recovery and retry',async t=>{
 const dir=temporary(t),file=path.join(dir,'test.sqlite'),marker=path.join(dir,'phase.txt');fixture(file,{create:true}).database.close();
 const child=spawn(NODE,[path.join(import.meta.dirname,'crash-fixture.mjs'),file,mode,marker],{stdio:['ignore','ignore','pipe']});let errors='';child.stderr.on('data',bytes=>errors+=bytes);
 const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',errors);assert.equal(code,null);
 assert.equal(fs.readFileSync(marker,'utf8'),mode==='before'?'uncommitted':'committed_before_ack');
 const {database}=fixture(file);t.after(()=>database.close());
 assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,mode==='before'?0:7);
 const ledger=new DurableLedger(database,{authorize:(_,p,e)=>p.realm===e.realm,handlers:new Map([['fixture',sqlite=>{sqlite.prepare('UPDATE fixture SET amount=amount+7 WHERE id=1').run();return {amount:sqlite.prepare('SELECT amount FROM fixture').get().amount};}]])});
 const retry={...event,payload:{}};const result=await ledger.submit(peer,retry);assert.equal(result.replayed,mode==='after');assert.equal(result.result.amount,7);
 await ledger.submit(peer,retry);assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);
});
test('component: lost Unix socket ACK retries without double application',{skip:process.env.CORE511_TEST_UNIX==='1'?false:'Unix listen is EPERM in this workspace; MessageChannel test runs separately; real WS gate remains installer-side'},async t=>{
 const dir=temporary(t),file=path.join(dir,'test.sqlite'),socketPath=path.join(dir,'writer.sock');const {database,ledger}=fixture(file,{create:true});t.after(()=>database.close());
 let handshakes=0,deliveries=0,firstSocket;
 const sockets=new Set(),server=createStreamServer({authenticate:async frame=>{assert.equal(frame.proof,'test-only-proof');handshakes++;return peer;},dispatch:async(_,method,payload)=>{
  assert.equal(method,'economy');const result=await ledger.submit(peer,payload);deliveries++;if(deliveries===1)firstSocket.destroy();return result;
 }});
 server.on('connection',socket=>{firstSocket??=socket;sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});server.listen(socketPath);await once(server,'listening');
 t.after(async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));});
 const client=new ReliableStream({path:socketPath,handshake:()=>({proof:'test-only-proof'}),retryMs:5});t.after(()=>client.close());client.start();
 const result=await client.request('economy',event,{id:'wire-one'});assert.equal(result.result.amount,7);assert.equal(result.replayed,true);
 assert.equal(handshakes,2);assert.equal(deliveries,2);assert.equal(database.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);
});
test('component: IPC disconnect preserves pending work and rejects invalid auth',async t=>{
 const dir=temporary(t),socketPath=path.join(dir,'absent.sock');
 const client=new ReliableStream({path:socketPath,handshake:()=>({}),retryMs:5,maxPending:1});client.start();t.after(()=>client.close());
 const pending=client.request('economy',{}, {id:'one'});const rejected=assert.rejects(pending,/ipc_outcome_unknown/);
 await assert.rejects(client.request('economy',{}),/ipc_backpressure/);await until(()=>client.socket===null);assert.equal(client.pending.size,1);client.close();await rejected;
});
test('component: heavy WITH reads stay off the main thread and the worker is read-only',async t=>{
 const dir=temporary(t),file=path.join(dir,'test.sqlite'),{database}=fixture(file,{create:true});t.after(()=>database.close());
 const worker=new ReadWorker(file,new Map([
  ['sum','WITH RECURSIVE counter(x) AS (SELECT 1 UNION ALL SELECT x+1 FROM counter WHERE x<200000) SELECT sum(x) AS total FROM counter'],
  ['forbidden','WITH x AS (SELECT 1) DELETE FROM fixture RETURNING *'],
 ]));t.after(()=>worker.close());
 let timerRan=false;const timer=setTimeout(()=>{timerRan=true;},5);t.after(()=>clearTimeout(timer));
 const result=await worker.query('sum');assert.equal(result.rows[0].total,200000*200001/2);assert.equal(timerRan,true);
 await assert.rejects(worker.query('forbidden'));assert.equal(database.sqlite.prepare('SELECT count(*) AS n FROM fixture').get().n,1);
 await assert.rejects(worker.query('arbitrary SQL'),/unknown_read_worker_query/);
});
