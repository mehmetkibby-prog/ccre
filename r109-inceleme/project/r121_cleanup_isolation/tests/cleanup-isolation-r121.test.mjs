import test from 'node:test';
import assert from 'node:assert/strict';
import {native,temporary,until} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
import {CommandFailureScope} from '../../r109_latency_completion/working/core511-source/scripts/core511/command-failure-scope.mjs';
import {SystemWriter} from '../../r109_latency_completion/working/core511-source/scripts/core511/system-writer.mjs';
import {ChannelOwnership} from '../../r109_latency_completion/working/core511-source/scripts/core511/ownership.mjs';
const {LocalDatabase}=await native('vds-server/src/database.mjs');

async function fixture(t){
 const db=new LocalDatabase(temporary(t)+'/cleanup.sqlite',{create:true,groupWrites:true,asyncDurable:true});t.after(async()=>{db.close();await db.walSync.closing;});
 const authority=new ChannelOwnership(db,{realmId:'cleanup-r121'});await authority.initialize();
 const writer=new SystemWriter(db,{realmId:'cleanup-r121',authority}),peer={realm:'cleanup-r121',role:'world',channel:0,incarnation:'cleanup-r121-world'};await writer.initialize();await writer.register(peer);
 const sql=db.sqlite,logs=[],scope=new CommandFailureScope(sql,{diagnostic:row=>logs.push(row)});
 sql.exec("CREATE TABLE messages(id INTEGER PRIMARY KEY,body TEXT); INSERT INTO messages VALUES(1,'retained-1'),(2,'retained-2'); CREATE TABLE loot(id TEXT PRIMARY KEY); INSERT INTO loot VALUES('protected-reward'); CREATE TRIGGER reject_expiry BEFORE DELETE ON messages WHEN OLD.id=2 BEGIN SELECT RAISE(ABORT,'injected_cleanup_constraint'); END");
 let calls=0,work=()=>{calls++;sql.prepare('DELETE FROM messages').run();return {table:'messages',rows:[{id:1},{id:2}]};};
 writer.add('world_cleanup_batch',(db,payload,context)=>scope.cleanup(payload,context,work));
 const request=(key='cleanup-r121:1',sequence=1)=>({key,kind:'world_cleanup_batch',epoch:writer.owner('world').epoch,sequence,payload:{token:'cleanup-test-token',plan:{table:'messages'}}});
 return {db,sql,writer,peer,scope,logs,request,calls:()=>calls,setWork:f=>work=f};
}

test('confirmed cleanup rollback retains every row and commits one durable negative receipt; replay never retries the DELETE',async t=>{
 const f=await fixture(t),ack=await f.writer.command(f.peer,f.request());
 assert.equal(ack.result.cleanupDeferredR121,true);assert.deepEqual(ack.result.rows,[]);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages').get().n,2);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM loot').get().n,1);
 assert.equal(f.logs[0].sqliteCode,1811);assert.equal(f.writer.owner('world').sequence,1);
 f.sql.exec('DROP TRIGGER reject_expiry');assert.deepEqual(await f.writer.command(f.peer,f.request()),ack);assert.equal(f.calls(),1);
 const next=await f.writer.command(f.peer,f.request('cleanup-r121:2',2));assert.equal(next.result.cleanupDeferredR121,undefined);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages').get().n,0);assert.equal(f.calls(),2);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,2);
});

test('cleanup rollback ACK waits for the negative receipt WAL fsync',async t=>{
 const f=await fixture(t),flush=f.db.walSync.flush.bind(f.db.walSync);let release,done=false;
 const held=new Promise(r=>release=r);t.after(()=>release());f.db.walSync.flush=async()=>{await held;return flush();};
 const result=f.writer.command(f.peer,f.request()).then(ack=>{done=true;return ack;});
 await until(()=>f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n===1);assert.equal(done,false);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages').get().n,2);release();assert.equal((await result).result.cleanupDeferredR121,true);
});

for(const kind of ['application','forged-sql','io','rollback','durability'])test(kind+' failure still rejects cleanup instead of authorizing a resume',async t=>{
 const f=await fixture(t);
 if(kind==='application')f.setWork(()=>{throw Object.assign(Error('owner fenced'),{code:'cleanup_owner_fenced'});});
 if(kind==='forged-sql')f.setWork(()=>{throw Object.assign(Error('forged'),{code:'ERR_SQLITE_ERROR',errcode:1});});
 if(kind==='io'){f.sql.function('io_failure_r121',()=>{throw Object.assign(Error('injected IO'),{code:'ERR_SQLITE_ERROR',errcode:10});});f.setWork(()=>f.sql.prepare('SELECT io_failure_r121()').get());}
 if(kind==='rollback'){const exec=f.sql.exec;f.sql.exec=function(query,...args){if(query.startsWith('ROLLBACK TO core511_optional_cleanup'))throw Error('injected rollback failure');return Reflect.apply(exec,this,[query,...args]);};}
 if(kind==='durability'){const flush=f.db.durableAfterCommit.bind(f.db);f.db.durableAfterCommit=()=>Promise.resolve(flush()).then(()=>{throw Error('injected fsync failure');});}
 await assert.rejects(f.writer.command(f.peer,f.request()));
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM messages').get().n,2);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,kind==='durability'?1:0);
});

