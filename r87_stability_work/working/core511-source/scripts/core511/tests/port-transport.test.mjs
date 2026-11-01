import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel,Worker} from 'node:worker_threads';
import {once} from 'node:events';
import path from 'node:path';
import {native,temporary,until} from './helpers.mjs';
import {ReliableStream} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');
test('MessageChannel: actual writer worker, lost ACK and restart preserve the receipt',async t=>{
 const dir=temporary(t),file=path.join(dir,'port.sqlite'),database=new LocalDatabase(file,{create:true});
 database.sqlite.exec('CREATE TABLE fixture(id INTEGER PRIMARY KEY,amount INTEGER NOT NULL);INSERT INTO fixture VALUES(1,0)');database.close();
 let worker,opened=0;
 async function start(dropAck){worker=new Worker(new URL('./port-writer-fixture.mjs',import.meta.url),{workerData:{file,dropAck,proof:'isolated-fixture-proof'}});const [ready]=await once(worker,'message');assert(ready.ready);}
 await start(true);
 const client=new ReliableStream({open:()=>{opened++;const {port1,port2}=new MessageChannel();worker.postMessage({port:port2},[port2]);return new MessagePortStream(port1);},handshake:()=>({proof:'isolated-fixture-proof'}),retryMs:2});
 t.after(async()=>{client.close();await worker.terminate();});client.start();
 const event={realm:'test',actor:'test-player',kind:'fixture',key:'reward:port',payload:{amount:7}};
 const result=await client.request('economy',event);assert(result.replayed);assert.equal(result.result.amount,7);assert.equal(opened,2);
 const stopped=once(worker,'exit');worker.postMessage({stop:true});await stopped;
 // A new writer reconstructs idempotency from the durable database, not cache.
 await start(false);const replay=await client.request('economy',event);assert(replay.replayed);assert.equal(replay.result.amount,7);
 const read=new LocalDatabase(file,{readOnly:true});assert.equal(read.sqlite.prepare('SELECT amount FROM fixture').get().amount,7);read.close();
});
