import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {sessionFactory} from './native-session-fixture.mjs';
import {until} from './helpers.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';

test('native session creation cannot replace an active WS owner after persisted presence expiry',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),factory=sessionFactory({database:f.f.database,auth:f.auth,clock:f.clock}),version=f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version;
 // Persisted lease expires independently of the authenticated memory lease.
 // The native clock/policy is unchanged; only this isolated row is aged.
 f.sql.prepare('UPDATE game_presence SET expires_at_ms=? WHERE account_id=?').run(f.clock()-1,f.account.id);await until(()=>core.presence.entries.get(f.id)?.lastAt>0,5000);const raw=await f.auth.rules.getGameSession(f.request());assert(core.presence.augment(raw).gamePresence.expiresAtMs>f.clock());
 await assert.rejects(factory(f.account.id),e=>e.status===409&&e.code==='game_already_open');assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version,version);assert.equal(writer.authority.admission(f.id).session_id,f.tokenHash);assert.equal(live.ws.readyState,1);assert.equal((await combatState(supervisor.rows.get(ticket.channel))).players.find(p=>p.id===f.id).suspended,false);assert.equal((await http('ticket')).status,200);
});

test('native replacement of an expired unconnected admission retires the old owner in the session COMMIT',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http}=s;await world.stopJobs();const ticket=await http('ticket'),owner=writer.authority.owner(f.id),factory=sessionFactory({database:f.f.database,auth:f.auth,clock:f.clock}),version=f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version;
 f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);const created=await factory(f.account.id),session=f.sql.prepare('SELECT * FROM auth_sessions WHERE token_hash=?').get(nativeTokenHash(created.sessionToken));assert.equal(session.security_version,version+1);assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash),undefined);assert.equal(writer.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);assert(writer.authority.owner(f.id).epoch>owner.epoch);assert(!(await combatState(supervisor.rows.get(ticket.channel))).players.some(p=>p.id===f.id));assert.equal(core.transitions.size,0);
});

test('native login waits for a pending authenticated presence delivery before choosing replacement',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),route=core.route.bind(core);let held=false,release;const gate=new Promise(r=>release=r);t.after(()=>release());core.route=async(peer,method,payload)=>{if(method==='presence'&&!held){held=true;await gate;}return route(peer,method,payload);};
 const live=await connect(ticket),factory=sessionFactory({database:f.f.database,auth:f.auth,clock:f.clock});f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);let answered=false;const pending=factory(f.account.id).finally(()=>{answered=true;});void pending.catch(()=>{});
 await until(()=>held&&core.transitions.has(f.id),7000);assert.equal(answered,false);assert.equal(core.transitions.get(f.id).phase,'freezing');assert.equal(core.presence.entries.get(f.id).lastAt,0);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));
 release();await assert.rejects(pending,e=>e.status===409&&e.code==='game_already_open');assert.equal(writer.authority.admission(f.id).session_id,f.tokenHash);assert.equal(live.ws.readyState,1);assert.equal(core.transitions.size,0);
});

for(const mismatch of ['deleted','replaced'])test('native login does not resurrect '+mismatch+' SQL presence from a cached live WS lease',{timeout:35000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),factory=sessionFactory({database:f.f.database,auth:f.auth,clock:f.clock});await until(()=>core.presence.entries.get(f.id)?.lastAt>0,5000);
 if(mismatch==='deleted')f.sql.prepare('DELETE FROM game_presence WHERE account_id=?').run(f.account.id);else f.sql.prepare("UPDATE game_presence SET instance_id='different-native-instance',expires_at_ms=1 WHERE account_id=?").run(f.account.id);
 const created=await factory(f.account.id);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(nativeTokenHash(created.sessionToken)));assert.equal(writer.authority.admission(f.id),null);await live.closed;const presence=f.sql.prepare('SELECT * FROM game_presence WHERE account_id=?').get(f.account.id);assert.equal(presence,undefined,'the original session rotation also removes its old persisted presence');
});

for(const phase of ['before','after'])test('native replacement login source SIGKILL '+phase+' COMMIT keeps session rotation and admission retirement atomic',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http}=s;await world.stopJobs();const ticket=await http('ticket'),source=supervisor.rows.get(ticket.channel),others=[...supervisor.rows.values()].filter(r=>r!==source),oldWorld=world.row,factory=sessionFactory({database:f.f.database,auth:f.auth,clock:f.clock}),execute=f.f.database.execute.bind(f.f.database),logout=writer.logout.bind(writer);f.sql.prepare('UPDATE game_presence SET expires_at_ms=1 WHERE account_id=?').run(f.account.id);let killed=false,observed;
 const read=()=>({oldSession:Boolean(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash)),admission:Boolean(writer.authority.admission(f.id)),sessions:f.sql.prepare('SELECT COUNT(*) n FROM auth_sessions WHERE account_id=?').get(f.account.id).n,version:f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version}),before=read();
 f.f.database.execute=statement=>{const result=execute(statement);if(phase==='before'&&!killed&&statement.sql.startsWith('INSERT INTO auth_sessions')){killed=true;source.child.kill('SIGKILL');throw Error('native-session-before-commit');}return result;};
 writer.logout=async(...args)=>{try{const result=await logout(...args);if(phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Error('native-session-ack-lost');}return result;}catch(error){if(phase==='before'&&killed)observed=read();throw error;}};
 await assert.rejects(factory(f.account.id),/native-session/);assert(killed);assert.deepEqual(observed,phase==='before'?before:{oldSession:false,admission:false,sessions:1,version:before.version+1});
 await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.transitions.has(f.id),20000);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(world.row,oldWorld);assert(others.every(r=>supervisor.rows.get(r.peer.channel)===r));assert.equal(writer.authority.admission(f.id),null);
 const created=await factory(f.account.id);assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(nativeTokenHash(created.sessionToken)));assert.deepEqual(read(),{oldSession:false,admission:false,sessions:1,version:before.version+(phase==='before'?1:2)});
});
