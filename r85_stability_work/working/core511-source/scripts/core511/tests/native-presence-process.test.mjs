import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {setup,combatState} from './process-fixture.mjs';
import {presenceHandler} from './native-presence-fixture.mjs';
import {until} from './helpers.mjs';
import {PROTOCOL} from '../contract.mjs';

test('native presence release closes the exact admitted game instance but preserves its auth session',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),route=presenceHandler(s),response=await route(f.request({path:'/api/game-presence',body:{action:'release'}}));assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.equal(f.sql.prepare('SELECT 1 FROM game_presence WHERE account_id=?').get(f.account.id),undefined);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(writer.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);assert(!(await combatState(supervisor.rows.get(ticket.channel))).players.some(p=>p.id===f.id));await live.closed;
});

test('native presence claim cannot replace a live WS instance after persisted lease expiry',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),route=presenceHandler(s);await until(()=>core.presence.entries.get(f.id)?.lastAt>0,5000);f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);
 const response=await route(f.request({path:'/api/game-presence',headers:{'X-Game-Instance':randomUUID()},body:{action:'claim'}}));assert.equal(response.status,409);assert.equal((await response.json()).code,'game_already_open');assert.equal(f.sql.prepare('SELECT instance_id FROM game_presence WHERE account_id=?').get(f.account.id).instance_id,f.instance);assert.equal(writer.authority.admission(f.id).session_id,f.tokenHash);assert.equal(live.ws.readyState,1);
});

test('native presence renewal recognizes the same authenticated WS lease without changing its owner',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),owner=writer.authority.owner(f.id),route=presenceHandler(s);await until(()=>core.presence.entries.get(f.id)?.lastAt>0,5000);f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);
 const response=await route(f.request({path:'/api/game-presence',body:{action:'renew'}}));assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert(f.sql.prepare('SELECT expires_at_ms FROM game_presence WHERE account_id=?').get(f.account.id).expires_at_ms>f.clock());assert.deepEqual(writer.authority.owner(f.id),owner);assert.equal(live.ws.readyState,1);assert.equal(core.transitions.size,0);
});

test('native claim of an expired different instance retires its prior admission before the new tab enters',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http}=s;await world.stopJobs();const ticket=await http('ticket'),route=presenceHandler(s),instance=randomUUID();f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);
 const response=await route(f.request({path:'/api/game-presence',headers:{'X-Game-Instance':instance},body:{action:'claim'}}));assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.equal(writer.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);assert.equal(f.sql.prepare('SELECT instance_id FROM game_presence WHERE account_id=?').get(f.account.id).instance_id,instance);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal((await http('ticket')).status,409);
 const entered=await core.http(f.request({headers:{'X-Game-Instance':instance},body:{protocol:PROTOCOL}}));assert.equal(entered.status,200);assert((await entered.json()).epoch>ticket.epoch);assert.equal(core.sessions.get(f.id).session.gamePresence.instanceId,instance);
});

test('native release from another instance leaves the current owner and socket live',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),route=presenceHandler(s),response=await route(f.request({path:'/api/game-presence',headers:{'X-Game-Instance':randomUUID()},body:{action:'release'}}));assert.equal(response.status,200);assert.equal(writer.authority.admission(f.id).session_id,f.tokenHash);assert.equal(writer.authority.owner(f.id).epoch,ticket.epoch);assert.equal(f.sql.prepare('SELECT instance_id FROM game_presence WHERE account_id=?').get(f.account.id).instance_id,f.instance);assert.equal(live.ws.readyState,1);assert.equal(core.transitions.size,0);
});

for(const phase of ['before','after'])test('native presence release source SIGKILL '+phase+' COMMIT keeps game lease and admission retirement atomic',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket');await connect(ticket);const source=supervisor.rows.get(ticket.channel),others=[...supervisor.rows.values()].filter(r=>r!==source),oldWorld=world.row,route=presenceHandler(s),execute=f.f.database.execute.bind(f.f.database),logout=writer.logout.bind(writer);let killed=false,observed;
 const read=()=>({presence:Boolean(f.sql.prepare('SELECT 1 FROM game_presence WHERE account_id=?').get(f.account.id)),admission:Boolean(writer.authority.admission(f.id)),auth:Boolean(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash))}),before=read();
 f.f.database.execute=statement=>{const result=execute(statement);if(phase==='before'&&!killed&&statement.sql.startsWith('DELETE FROM game_presence WHERE account_id')){killed=true;source.child.kill('SIGKILL');throw Error('presence-release-before-commit');}return result;};
 writer.logout=async(...args)=>{try{const result=await logout(...args);if(phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Error('presence-release-ack-lost');}return result;}catch(error){if(phase==='before'&&killed)observed=read();throw error;}};
 const request=()=>f.request({path:'/api/game-presence',body:{action:'release'}});assert.equal((await route(request())).status,500);assert(killed);assert.deepEqual(observed,phase==='before'?before:{presence:false,admission:false,auth:true});await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.transitions.has(f.id),20000);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(world.row,oldWorld);assert(others.every(r=>supervisor.rows.get(r.peer.channel)===r));assert.equal((await route(request())).status,200);assert.deepEqual(read(),{presence:false,admission:false,auth:true});
});
