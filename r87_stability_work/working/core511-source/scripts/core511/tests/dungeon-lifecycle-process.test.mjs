import test from 'node:test';
import assert from 'node:assert/strict';
import {party} from './dungeon-process-fixture.mjs';
import {until} from './helpers.mjs';
import {combatState} from './process-fixture.mjs';

test('native empty dungeon finishes after its former leader leaves and logs out',{timeout:30000},async t=>{
 const s=await party(t,{together:true}),{f,world,writer,actors,action,faults}=s;assert.equal((await action(actors[0],{action:'create'})).ok,true);for(const actor of actors.slice(1))assert.equal((await action(actor,{action:'ready',ready:true})).ok,true);const run=f.sql.prepare('SELECT id FROM dungeon_runs').get().id;
 assert.equal((await action(actors[0],{action:'leave'})).ok,true);assert.equal((await actors[0].http('logout')).status,200);assert.equal(writer.authority.admission(actors[0].id),null);for(const actor of actors.slice(1))assert.equal((await action(actor,{action:'leave'})).ok,true);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dungeon_members').get().n,0);
 await world.startJobs();await until(()=>f.sql.prepare('SELECT status FROM dungeon_runs WHERE id=?').get(run).status==='abandoned'||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(f.sql.prepare('SELECT status FROM dungeon_runs WHERE id=?').get(run).status,'abandoned');
});

test('finished native room retires its passive member without re-admission or an occupied client slot',{timeout:30000},async t=>{
 const s=await party(t,{together:true}),{f,world,writer,actors,action,faults}=s,offline=actors[2];assert.equal((await offline.http('logout')).status,200);assert.equal((await action(actors[0],{action:'create'})).ok,true);assert(writer.authority.simulation(offline.id));assert.equal((await action(actors[0],{action:'leave'})).ok,true);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dungeon_members').get().n,0);
 await world.startJobs();await until(()=>!writer.authority.simulation(offline.id)||faults.length,8000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(writer.authority.simulation(offline.id),null);assert.equal(writer.authority.admission(offline.id),null);assert.equal(writer.authority.counts().get(actors[0].ticket.channel),2);
});

async function abandoned(t,{passive=false,zero=false}={}){
 const s=await party(t,{together:true}),{f,actors,action,writer}=s;
 if(passive)assert.equal((await actors[2].http('logout')).status,200);
 assert.equal((await action(actors[0],{action:'create'})).ok,true);const run=f.sql.prepare('SELECT id FROM dungeon_runs').get().id;
 if(!passive)for(const actor of actors.slice(1))assert.equal((await action(actor,{action:'ready',ready:true})).ok,true);
 assert.equal((await action(actors[0],{action:'leave'})).ok,true);
 if(!passive){assert.equal((await actors[0].http('logout')).status,200);for(const actor of actors.slice(1))assert.equal((await action(actor,{action:'leave'})).ok,true);}
 if(zero)for(const actor of actors.slice(1))assert.equal((await actor.http('logout')).status,200);
 const inspect=()=>({status:f.sql.prepare('SELECT status FROM dungeon_runs WHERE id=?').get(run).status,passive:!!writer.authority.simulation(actors[2].id),finished:!!f.sql.prepare('SELECT 1 FROM kernel511_dungeon_finalizations WHERE run_id=?').get(run)});
 assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM dungeon_members').get().n,0);return {...s,run,inspect};
}

for(const passive of [false,true])for(const phase of ['before','after'])test('actual '+phase+' COMMIT SIGKILL recovers '+(passive?'passive retirement':'empty-room native finish')+' from CURRENT DB',{timeout:45000},async t=>{
 const s=await abandoned(t,{passive}),{writer,core,world,supervisor,actors,old,inspect,faults,connect}=s,victim=supervisor.rows.get(actors[0].ticket.channel),operation=writer.system.operations.get('world_transition'),command=writer.system.command.bind(writer.system);let killed=false,observed=null;
 writer.system.operations.set('world_transition',(...args)=>{const result=operation(...args);if(args[1].mode==='dungeon_cleanup'&&phase==='before'&&!killed){killed=true;victim.child.kill('SIGKILL');throw Object.assign(Error('dungeon_cleanup_before_commit'),{code:'dungeon_cleanup_before_commit'});}return result;});
 writer.system.command=async(peer,request)=>{try{const ack=await command(peer,request);if(request.payload.mode==='dungeon_cleanup'&&phase==='after'&&!killed){killed=true;observed=inspect();victim.child.kill('SIGKILL');throw Object.assign(Error('dungeon_cleanup_lost_ack'),{code:'dungeon_cleanup_lost_ack'});}return ack;}catch(error){if(error.code==='dungeon_cleanup_before_commit')observed=inspect();throw error;}};
 await world.startJobs();await until(()=>observed,12000);assert.deepEqual(observed,passive?{status:'cancelled',passive:phase==='before',finished:true}:{status:phase==='before'?'active':'abandoned',passive:false,finished:phase==='after'});
 await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r))&&inspect().finished&&!inspect().passive,20000);
 assert(old.every(r=>r.exited));assert.equal(victim.child.signalCode,'SIGKILL');assert.equal(inspect().status,passive?'cancelled':'abandoned');assert(faults.some(f=>f.globalTransition));assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));
 const ticket=await actors[1].http();assert.equal(ticket.status,200);const live=await connect(ticket);assert.equal(live.ws.readyState,1);assert.equal(writer.authority.simulation(actors[2].id),null);
});

for(const method of ['global_export','global_refresh'])test('lost '+method+' ACK during dungeon cleanup retires all five old owners before recovery',{timeout:45000},async t=>{
 const passive=method==='global_export',s=await abandoned(t,{passive}),{core,world,supervisor,actors,old,inspect,faults}=s,channel=actors[0].ticket.channel,victim=supervisor.rows.get(channel),control=core.processes.get(channel).control,request=control.request.bind(control);let lost=false;
 control.request=async(name,payload)=>{const ack=await request(name,payload);if(name===method&&world.global.held?.mode==='dungeon_cleanup'&&!lost){lost=true;victim.child.kill('SIGKILL');throw Object.assign(Error('dungeon_'+method+'_ack_lost'),{code:'dungeon_'+method+'_ack_lost'});}return ack;};
 await world.startJobs();await until(()=>lost,12000);await until(()=>!core.recoveringWorld&&!world.global.recovery&&!world.global.held&&world.row?.state==='running'&&supervisor.rows.size===4&&[...supervisor.rows.values()].every(r=>r.state==='running'&&!old.includes(r)),20000);
 assert(old.every(r=>r.exited));assert.deepEqual(inspect(),{status:passive?'cancelled':'abandoned',passive:false,finished:true});assert(faults.some(f=>f.globalTransition));assert(!faults.some(f=>f.globalRecovery),faults.map(f=>f.error?.stack).join('\n'));const snapshot=await combatState(supervisor.rows.get(channel));assert(!snapshot.players.some(p=>p.id===actors[2].id&&passive));
});

test('zero-player world restart rediscovers empty native room while all channel owners stay unchanged',{timeout:30000},async t=>{
 const s=await abandoned(t,{zero:true}),{f,world,supervisor,inspect,faults}=s,oldWorld=world.row,channels=[...supervisor.rows.values()];assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_simulations').get().n,0);
 await world.restart();await until(()=>inspect().finished&&!world.global.held||faults.length,10000);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert(oldWorld.exited);assert.notEqual(world.row,oldWorld);assert.deepEqual([...supervisor.rows.values()],channels);assert.deepEqual(inspect(),{status:'abandoned',passive:false,finished:true});assert.equal(f.sql.prepare('SELECT COUNT(*) n FROM kernel511_admissions').get().n,0);
});
