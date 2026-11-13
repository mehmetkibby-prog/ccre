import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';

for(const phase of ['before_commit','after_commit'])test('instance persistence '+phase+' worker exit resolves one receipt and the next instance still progresses',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,prepare:f=>createAdventureSchema(f.sql)});await s.world.stopJobs();
 const w=s.writer.rewardWorkerR533;await w.lane.idle();if(w.slot&&!w.slot.ended){await w.slot.worker.terminate();await w.slot.exit;}
 const entry=w.entry;w.entry=new URL('./persistence-crash-worker-r113.mjs',import.meta.url);w.workerOptions={workerData:{crashAt:phase}};let crashed=false;
 w.onTestHook=m=>{if(m.systemR113){crashed=true;w.entry=entry;w.workerOptions={};}};
 t.after(()=>{w.entry=entry;w.workerOptions={};w.onTestHook=null;});
 const row=s.supervisor.rows.get(1),command=s.writer.system.command.bind(s.writer.system);let peer,request;
 s.writer.system.command=(p,q)=>{if(q.key==='r113-system-crash-'+phase){peer=p;request=q;}return command(p,q);};
 const submit=key=>new Promise((resolve,reject)=>{const receive=m=>{if(m.type!=='test-system-command-r113'||m.request!==key)return;row.child.off('message',receive);m.error?reject(Object.assign(Error(m.error.message),m.error)):resolve(m.ack);};row.child.on('message',receive);row.child.send({type:'test-system-command-r113',request:key,command:{key,kind:'adventure_step',payload:{actors:[],scheduleId:'missing-schedule-fixture',nowMs:s.f.clock(),seed:'31'.repeat(32)}}});});
 const ack=await submit('r113-system-crash-'+phase);assert(crashed);assert.equal(ack.key,request.key);
 assert.equal(s.f.sql.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts WHERE operation_id=?').get(request.key).n,1);
 assert.equal(s.writer.system.owner('channel:1').sequence,request.sequence);
 assert.deepEqual(await s.writer.system.command(peer,request),ack);
 const next=await submit(request.key+'-next');assert.equal(next.sequence,request.sequence+1);
 assert.equal(phase==='before_commit'?w.stats.rollbacks:w.stats.replays,1);
 await assert.rejects(s.writer.system.command(peer,{...request,key:request.key+'-stale',epoch:request.epoch+1}),/system_epoch_fenced/);
});
