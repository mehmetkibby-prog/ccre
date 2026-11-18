import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {setTimeout as delay} from 'node:timers/promises';
import {WriterMaintenance} from '../r109_latency_completion/working/core511-source/scripts/core511/writer-maintenance.mjs';
import {ChannelAuthority} from '../r109_latency_completion/working/core511-source/scripts/core511/receipt-authority.mjs';
import {SystemWriter} from '../r109_latency_completion/working/core511-source/scripts/core511/system-writer.mjs';
import {initializeCommittedStoreR113} from '../r109_latency_completion/working/core511-source/scripts/core511/committed-store-r113.mjs';
const NOW=1793861407163,OLD=1793503012594;
const slow=ms=>{const end=performance.now()+ms;while(performance.now()<end){}};
function fixture(t,{slowChannel=0,slowSelect=0,retention=true,minutes=15}={}){
 const sql=new DatabaseSync(':memory:');initializeCommittedStoreR113(sql);sql.exec('PRAGMA foreign_keys=ON');
 sql.exec(`CREATE TABLE kernel511_system_receipts(operation_id TEXT PRIMARY KEY,service TEXT NOT NULL,epoch INTEGER NOT NULL,sequence INTEGER NOT NULL,digest TEXT NOT NULL,response TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(service,epoch,sequence));CREATE TABLE kernel511_notifications(event_id TEXT PRIMARY KEY,operation_id TEXT NOT NULL,ordinal INTEGER NOT NULL,payload TEXT NOT NULL,created_ms INTEGER NOT NULL,UNIQUE(operation_id,ordinal));CREATE TABLE kernel511_notification_audience(actor TEXT NOT NULL,event_id TEXT NOT NULL REFERENCES kernel511_notifications(event_id),acknowledged INTEGER NOT NULL,PRIMARY KEY(actor,event_id)) WITHOUT ROWID;`);
 let clock=NOW,atomicCalls=0,queuedPlayer=false,channelCalls=0;
 const facade={get isTransaction(){return sql.isTransaction;},exec:sql.exec.bind(sql),prepare(query){const st=sql.prepare(query);if(slowSelect&&query.startsWith('SELECT rowid AS rid,created_ms FROM kernel511_system_receipts'))return {all(...args){slow(slowSelect);return st.all(...args);}};return st;}};
 const database={sqlite:facade,writeQueue:[],writeDrain:null,closed:false,atomic(work){atomicCalls++;if(queuedPlayer)this.writeQueue.push({player:true});sql.exec('BEGIN');try{const result=work(facade);sql.exec('COMMIT');return Promise.resolve(result);}catch(e){sql.exec('ROLLBACK');return Promise.reject(e);}}};
 const writer={database,system:{pending:0},inflight:0,authority:{pruneReceipts(){return this.database.atomic(()=>{channelCalls++;if(slowChannel)slow(slowChannel);return {changes:slowChannel?1:0};});}}};
 const maintenance=new WriterMaintenance(writer,{retention,idleCheckpoint:false,minutes,clock:()=>clock});
 t.after(()=>{maintenance.close();sql.close();});
 return {sql,writer,database,maintenance,get atomicCalls(){return atomicCalls;},get channelCalls(){return channelCalls;},queuePlayer(){queuedPlayer=true;},setClock(now){clock=now;},advance(ms=1001){clock+=ms;},async tick(){clock+=1001;await maintenance.step();},system(id,created=OLD){sql.prepare("INSERT INTO kernel511_system_receipts VALUES(?, 'world',1,?,'digest','{}',?)").run('sys'+id,id,created);},notification(id,{created=OLD,ack=1}={}){sql.prepare('INSERT INTO kernel511_notifications VALUES(?,?,0,?,?)').run('evt'+id,'op'+id,'{}',created);if(ack!==null)sql.prepare('INSERT INTO kernel511_notification_audience VALUES(?,?,?)').run('actor','evt'+id,ack);}};
}
const count=(f,table)=>f.sql.prepare('SELECT count(*) AS n FROM '+table).get().n;
test('slow channel batch cannot starve system or ACKed notifications',async t=>{
 const f=fixture(t,{slowChannel:6});f.system(1);f.notification(1);
 for(let i=0;i<9;i++)await f.tick();
 assert.equal(count(f,'kernel511_system_receipts'),0);assert.equal(count(f,'kernel511_notifications'),0);assert(f.maintenance.metrics.receipts>0);assert(f.maintenance.metrics.budgetOverruns>0);
});
test('cold system SELECT progresses one row even when initial read exceeds target',async t=>{
 const f=fixture(t,{slowSelect:4});for(let i=1;i<=6;i++)f.system(i);f.maintenance.familyBatches={channel:128,system:128,images:128,notifications:128};
 for(let i=0;i<9;i++)await f.tick();
 assert.equal(count(f,'kernel511_system_receipts'),0);assert.equal(f.maintenance.metrics.system,6);
});
test('one cold family does not monopolize the next family',async t=>{
 const f=fixture(t,{slowSelect:4});for(let i=1;i<=30;i++)f.system(i);f.notification(1);
 for(let i=0;i<3;i++)await f.tick();
 assert.equal(count(f,'kernel511_notifications'),0);assert(count(f,'kernel511_system_receipts')<30);
});
test('24-hour receipt boundary and 15-minute notification boundary and unacknowledged recipients remain protected',async t=>{
 const f=fixture(t);f.system(1,NOW-86400001);f.system(2,NOW-86400000);f.system(3,NOW);
 f.notification(1,{created:NOW-900001,ack:1});f.notification(2,{created:NOW-900001,ack:0});f.notification(3,{created:NOW-900000,ack:1});
 f.maintenance.familyBatches={channel:128,system:128,images:128,notifications:128};
 // Eligibility stays at the exact boundary; a bounded pass may yield before
 // the fourth family. Test eventual removal without advancing that cutoff.
 for(let pass=0;pass<4;pass++){f.maintenance.nextPassAt=0;await f.maintenance.step();}
 assert.deepEqual(f.sql.prepare('SELECT operation_id FROM kernel511_system_receipts ORDER BY operation_id').all().map(r=>r.operation_id),['sys2','sys3']);
 assert.deepEqual(f.sql.prepare('SELECT event_id FROM kernel511_notifications ORDER BY event_id').all().map(r=>r.event_id),['evt2','evt3']);
 assert.equal(f.sql.prepare("SELECT acknowledged FROM kernel511_notification_audience WHERE event_id='evt2'").get().acknowledged,0);
});
test('unacknowledged first row cannot prevent later eligible notification cleanup',async t=>{
 const f=fixture(t);f.notification(1,{ack:0});f.notification(2,{ack:1});f.notification(3,{ack:null});
 for(let i=0;i<5;i++)await f.tick();
 assert.deepEqual(f.sql.prepare('SELECT event_id FROM kernel511_notifications').all().map(r=>r.event_id),['evt1']);
});
test('all original foreground and durability idle guards prevent writes',async t=>{
 const f=fixture(t);f.system(1);
 for(const [object,key,value]of [[f.database,'maintenance',true],[f.database,'writeQueue',[{}]],[f.database,'writeDrain',{}],[f.database,'walSync',{running:{}}],[f.database,'walSync',{waiting:[{}]}],[f.writer,'inflight',1],[f.writer.system,'pending',1],[f.writer,'sharedCombat',{busy:true}],[f.writer,'sharedCombat',{terminal:{}}]]){
  const old=object[key];object[key]=value;await f.tick();object[key]=old;
 }
 assert.equal(f.atomicCalls,0);assert.equal(count(f,'kernel511_system_receipts'),1);
});
test('foreground work arriving after admission keeps FIFO priority',async t=>{
 const f=fixture(t);f.system(1);f.queuePlayer();await f.tick();
 assert.equal(f.maintenance.metrics.system,0);assert.equal(f.channelCalls,0);assert.equal(count(f,'kernel511_system_receipts'),1);
});
test('busy sampling gets one bounded retry, no extra work pass before the catch-up deadline',async t=>{
 const f=fixture(t);f.system(1);f.writer.system.pending=1;f.maintenance.start();await f.maintenance.step();
 const scheduled=f.maintenance.retryTimer;assert(scheduled);await f.maintenance.step();assert.equal(f.maintenance.retryTimer,scheduled);
 f.writer.system.pending=0;for(let i=0;i<20&&!f.maintenance.metrics.passes;i++)await delay(20);
 await f.maintenance.running;assert.equal(f.maintenance.metrics.passes,1);assert.equal(count(f,'kernel511_system_receipts'),0);
 for(let i=0;i<10;i++)await f.maintenance.step();assert.equal(f.maintenance.metrics.passes,1);assert.equal(f.maintenance.retryTimer,null);
});
test('close cancels retry and disabled retention never writes',async t=>{
 const f=fixture(t);f.writer.system.pending=1;f.maintenance.start();await f.maintenance.step();assert(f.maintenance.retryTimer);f.maintenance.close();assert.equal(f.maintenance.retryTimer,null);f.writer.system.pending=0;await delay(130);assert.equal(f.atomicCalls,0);
 const g=fixture(t,{retention:false});g.system(1);g.maintenance.start();assert.equal(g.maintenance.timer,null);await g.tick();assert.equal(g.atomicCalls,0);
});
test('pruning channel receipt preserves sequence watermark and forbids duplicate reward',async t=>{
 const f=fixture(t);let rewards=0,clock=OLD;
 const authority=new ChannelAuthority(f.database,{realmId:'realm1',now:()=>clock,operations:{reward:{execute(){rewards++;return {reward:1};}}}});await authority.initialize();await authority.registerProcess(1,'incarnation1');await authority.claim('player1',1,'incarnation1');
 f.writer.authority=authority;const peer={channel:1,incarnation:'incarnation1'},request={playerId:'player1',epoch:1,sequence:1,operationId:'operation1',operation:'reward',payload:{}};
 await authority.command(peer,request);assert.equal(rewards,1);await f.tick();assert.equal(count(f,'kernel511_channel_receipts'),0);assert.equal(authority.owner('player1').sequence,1);
 await assert.rejects(authority.command(peer,request),e=>e.code==='operation_already_retired');assert.equal(rewards,1);
});
test('pruning system receipt preserves epoch/sequence and forbids duplicate work',async t=>{
 const f=fixture(t);let rewards=0;
 const authority=new ChannelAuthority(f.database,{realmId:'realm1',now:()=>OLD});await authority.initialize();const system=new SystemWriter(f.database,{realmId:'realm1',authority,clock:()=>OLD});await system.initialize();f.writer.system=system;system.add('reward',()=>{rewards++;return {reward:1};});const peer={realm:'realm1',incarnation:'world1',channel:0,role:'world'};await system.register(peer);
 const request={epoch:1,sequence:1,key:'reward1',kind:'reward',payload:{}};await system.command(peer,request);await f.tick();assert.equal(count(f,'kernel511_system_receipts'),0);assert.equal(system.owner('world').sequence,1);
 await assert.rejects(system.command(peer,request),e=>e.code==='system_operation_retired');assert.equal(rewards,1);
});
test('continuous fresh appends do not strand a now-expired row behind the cursor',async t=>{
 const f=fixture(t);f.system(1,NOW);await f.maintenance.step();assert.equal(count(f,'kernel511_system_receipts'),1);
 f.setClock(NOW+86400001);let id=2;
 for(let pass=0;pass<12;pass++){
  for(let i=0;i<16;i++)f.system(id++,NOW+86400001+pass*1001);
  f.maintenance.batch=1;await f.tick();
 }
 assert.equal(f.sql.prepare("SELECT 1 FROM kernel511_system_receipts WHERE operation_id='sys1'").get(),undefined);
 assert(count(f,'kernel511_system_receipts')>100);
});
test('continuous appends cannot strand a notification acknowledged after its first scan',async t=>{
 const f=fixture(t);f.notification(1,{ack:0});await f.maintenance.step();assert.equal(count(f,'kernel511_notifications'),1);
 f.sql.prepare("UPDATE kernel511_notification_audience SET acknowledged=1 WHERE event_id='evt1'").run();
 let id=2;for(let pass=0;pass<12;pass++){for(let i=0;i<16;i++)f.notification(id++,{created:NOW+pass*1001,ack:0});f.maintenance.batch=1;await f.tick();}
 assert.equal(f.sql.prepare("SELECT 1 FROM kernel511_notifications WHERE event_id='evt1'").get(),undefined);
 assert(count(f,'kernel511_notifications')>100);
});
