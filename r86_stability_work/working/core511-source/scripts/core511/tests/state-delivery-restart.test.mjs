import test from 'node:test';
import assert from 'node:assert/strict';
import {setup} from './process-fixture.mjs';
import {until} from './helpers.mjs';

test('actual channel restart retires a lost old world-state delivery and hydrates the replacement from CURRENT DB',{timeout:30000},async t=>{
 const {f,core,writer,supervisor,world,faults}=await setup(t,{shared:true});await world.stopJobs();const old=supervisor.rows.get(4),channel=core.processes.get(4),send=channel.control.send;let withheld;
 // Drop only the old process's read-only state message. The actual control
 // request remains pending until its actual OS process exits; no game command
 // or checkpoint is intercepted or treated as successfully acknowledged.
 channel.control.send=frame=>{if(frame.method==='world_state'){withheld=frame;return;}send(frame);};
 await f.f.database.atomic(sql=>sql.prepare('UPDATE world_state SET health=health+1 WHERE id=1').run());await until(()=>withheld&&channel.control.pending.has(withheld.id),5000);const point=writer.worldState.current;
 await supervisor.restartChannel(4);const current=supervisor.rows.get(4),replacement=core.processes.get(4);assert(old.exited);assert.equal(old.child.signalCode,'SIGKILL');assert.notEqual(current,old);assert.notEqual(replacement,channel);assert.equal(channel.control.pending.size,0);assert(channel.worldDelivery.failure);
 assert.equal(replacement.worldDelivery.sent,point.revision);assert.equal(writer.worldState.current.world.health,point.world.health);assert.equal(f.sql.prepare('SELECT health FROM world_state WHERE id=1').get().health,point.world.health);
 assert.equal(faults.length,0,JSON.stringify(faults.map(f=>({channel:f.channel,incarnation:f.incarnation,code:f.error?.code,stack:f.error?.stack}))));
});

test('actual channel restart retires a lost old market reply and reloads its committed market revision',{timeout:30000},async t=>{
 const {f,core,writer,supervisor,world,faults}=await setup(t,{shared:true});await world.stopJobs();const old=supervisor.rows.get(4),channel=core.processes.get(4),send=channel.control.send;let withheld;
 channel.control.send=frame=>{if(frame.method==='market_state'){withheld=frame;return;}send(frame);};
 await f.f.database.atomic(sql=>sql.prepare('INSERT INTO market_shops(id,owner_id,name,owner_name,x,y,created_at,active) VALUES(?,?,?,?,?,?,?,1)').run('market-delivery511',f.id,'Delivery fixture','Owner fixture',1000,1000,Math.floor(f.clock()/1000)));await until(()=>withheld&&channel.control.pending.has(withheld.id),5000);const revision=writer.marketState.current,pending=channel.marketPending;await supervisor.restartChannel(4);const replacement=core.processes.get(4);
 assert(old.exited);assert.equal(old.child.signalCode,'SIGKILL');assert.notEqual(replacement,channel);assert.equal(channel.control.pending.size,0);await assert.rejects(pending,/ipc_control_outcome_unknown/);assert.equal(replacement.marketSent,revision);assert.equal(f.sql.prepare("SELECT active FROM market_shops WHERE id='market-delivery511'").get().active,1);assert.equal(faults.length,0,JSON.stringify(faults.map(f=>({channel:f.channel,incarnation:f.incarnation,code:f.error?.code}))));
});

test('actual world restart retires a lost old world-state reply before the new world loads CURRENT DB',{timeout:30000},async t=>{
 const {f,writer,world,faults}=await setup(t,{shared:true});await world.stopJobs();const old=world.row,send=old.control.send;let withheld;
 old.control.send=frame=>{if(frame.method==='world_state'){withheld=frame;return;}send(frame);};
 await f.f.database.atomic(sql=>sql.prepare('UPDATE world_state SET health=health+1 WHERE id=1').run());await until(()=>withheld&&old.control.pending.has(withheld.id),5000);const point=writer.worldState.current;await world.restart();await world.stopJobs();const replacement=world.row;
 assert(old.exited);assert.equal(old.child.signalCode,'SIGKILL');assert.notEqual(replacement,old);assert.equal(old.control.pending.size,0);assert(old.worldDelivery.failure);assert(replacement.worldDelivery.sent>=point.revision);assert.equal(faults.length,0,JSON.stringify(faults.map(f=>({world:f.world,incarnation:f.incarnation,code:f.error?.code}))));
});

test('read-only market and world delivery failures still report for the exact live process',{timeout:30000},async t=>{
 const {f,core,supervisor,world,faults}=await setup(t,{shared:true});await world.stopJobs();const channel=core.processes.get(4),oldChannel=supervisor.rows.get(4),oldWorld=world.row,marketRequest=channel.control.request.bind(channel.control),worldRequest=oldWorld.control.request.bind(oldWorld.control),failure=Object.assign(Error('live_delivery_failed'),{code:'live_delivery_failed'});
 channel.control.request=(method,payload)=>method==='market_state'?Promise.reject(failure):marketRequest(method,payload);oldWorld.control.request=(method,payload)=>method==='world_state'?Promise.reject(failure):worldRequest(method,payload);
 await f.f.database.atomic(sql=>{sql.prepare('UPDATE world_state SET health=health+1 WHERE id=1').run();sql.prepare('INSERT INTO market_shops(id,owner_id,name,owner_name,x,y,created_at,active) VALUES(?,?,?,?,?,?,?,1)').run('market-live-failure511',f.id,'Live delivery fixture','Owner fixture',1000,1000,Math.floor(f.clock()/1000));});
 await until(()=>faults.filter(f=>f.error===failure).length===2,5000);assert(faults.some(f=>f.error===failure&&f.channel===4&&f.incarnation===channel.peer.incarnation));assert(faults.some(f=>f.error===failure&&f.world===true&&f.incarnation===oldWorld.peer.incarnation));assert.equal(supervisor.rows.get(4),oldChannel);assert.equal(world.row,oldWorld);assert.equal(channel.online,true);assert.equal(oldWorld.exited,false);
 channel.control.request=marketRequest;oldWorld.control.request=worldRequest;
});
