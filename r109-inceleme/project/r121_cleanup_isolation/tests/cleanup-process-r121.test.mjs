import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/process-fixture.mjs';

test('actual SQL expiry rejection retains contribution and WS, resumes all owners, backs off and later cleans once',{timeout:45000},async t=>{
 const {f,writer,core,supervisor,world,http,connect,faults}=await setup(t,{shared:true,cleanup:true});await world.stopJobs();
 const ticket=await http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket),old=[world.row,...supervisor.rows.values()],pids=old.map(row=>row.child.pid);
 f.sql.exec("CREATE TEMP TRIGGER reject_cleanup_r121 BEFORE DELETE ON main.monster_participants WHEN OLD.monster_id='cleanup-process511' BEGIN SELECT RAISE(ABORT,'injected_cleanup_r121'); END");
 const params={nowMs:f.clock(),cycle:writer.worldState.current.world.cycle};
 await world.cleanup.run(world.row.peer,params);
 assert(f.sql.prepare("SELECT 1 FROM monster_participants WHERE monster_id='cleanup-process511'").get());assert.equal(live.ws.readyState,1);assert.equal(world.cleanup.held,null);assert.equal(world.global.held,null);assert(!core.recoveringWorld);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));
 const receipts=f.sql.prepare("SELECT response FROM kernel511_system_receipts WHERE response LIKE '%cleanupDeferredR121%'").all();assert.equal(receipts.length,1);
 await world.cleanup.run(world.row.peer,params);assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_system_receipts WHERE response LIKE '%cleanupDeferredR121%'").get().n,1);
 assert.deepEqual([world.row,...supervisor.rows.values()].map(row=>row.child.pid),pids);assert(old.every(row=>!row.exited));
 f.sql.exec('DROP TRIGGER reject_cleanup_r121');world.cleanup.retryAt.delete('monster_participants');await world.cleanup.run(world.row.peer,params);
 assert(!f.sql.prepare("SELECT 1 FROM monster_participants WHERE monster_id='cleanup-process511'").get());assert.equal(live.ws.readyState,1);assert.equal(faults.length,0,faults.map(x=>x.error?.stack).join('\n'));assert.deepEqual([world.row,...supervisor.rows.values()].map(row=>row.child.pid),pids);
});

// Reproduce the former unwrapped handler with the current real supervisor:
// a recoverable SQL constraint is converted into five OS owner replacements.
test('former cleanup execution turns a SQL rejection into all-owner recovery',{timeout:45000},async t=>{
 const {createCleanupHandler}=await import('../../r109_latency_completion/working/core511-source/scripts/core511/world-cleanup.mjs');
 const {until}=await import('../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs');
 const {f,writer,core,supervisor,world}=await setup(t,{shared:true,cleanup:true});await world.stopJobs();const old=[world.row,...supervisor.rows.values()];
 writer.system.operations.set('world_cleanup_batch',createCleanupHandler({clock:f.clock,assertHeld:(...args)=>world.cleanup.assertHeld(...args)}));
 f.sql.exec("CREATE TEMP TRIGGER reject_cleanup_r121 BEFORE DELETE ON main.monster_participants WHEN OLD.monster_id='cleanup-process511' BEGIN SELECT RAISE(ABORT,'injected_cleanup_r121'); END");
 await assert.rejects(world.cleanup.run(world.row.peer,{nowMs:f.clock(),cycle:writer.worldState.current.world.cycle}));
 assert(f.sql.prepare("SELECT 1 FROM monster_participants WHERE monster_id='cleanup-process511'").get());f.sql.exec('DROP TRIGGER reject_cleanup_r121');
 await until(()=>old.every(row=>row.exited)&&!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&[...supervisor.rows.values()].every(row=>row.state==='running'),22000);
 assert(old.every(row=>row.child.signalCode==='SIGKILL'));
});

test('lost negative cleanup receipt ACK still retires every old owner before recovery',{timeout:45000},async t=>{
 const {until}=await import('../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs');
 const {f,writer,core,supervisor,world}=await setup(t,{shared:true,cleanup:true});await world.stopJobs();const old=[world.row,...supervisor.rows.values()];
 f.sql.exec("CREATE TEMP TRIGGER reject_cleanup_r121 BEFORE DELETE ON main.monster_participants WHEN OLD.monster_id='cleanup-process511' BEGIN SELECT RAISE(ABORT,'injected_cleanup_r121'); END");
 const command=writer.system.command.bind(writer.system);let lost=false;
 writer.system.command=async(...args)=>{const ack=await command(...args);if(ack.result.cleanupDeferredR121&&!lost){lost=true;world.row.child.kill('SIGKILL');throw Object.assign(Error('test negative ACK lost'),{code:'test_cleanup_ack_lost'});}return ack;};
 await assert.rejects(world.cleanup.run(world.row.peer,{nowMs:f.clock(),cycle:writer.worldState.current.world.cycle}));assert(lost);
 assert(f.sql.prepare("SELECT 1 FROM monster_participants WHERE monster_id='cleanup-process511'").get());assert.equal(f.sql.prepare("SELECT COUNT(*) n FROM kernel511_system_receipts WHERE response LIKE '%cleanupDeferredR121%'").get().n,1);f.sql.exec('DROP TRIGGER reject_cleanup_r121');
 await until(()=>old.every(row=>row.exited)&&!core.recoveringWorld&&!world.global.recovery&&world.row?.state==='running'&&[...supervisor.rows.values()].every(row=>row.state==='running'),22000);
 assert(old.every(row=>row.child.signalCode==='SIGKILL'));
});
