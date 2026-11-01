import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,combatState} from './process-fixture.mjs';
import {logoutHandlers} from './native-logout-fixture.mjs';
import {until} from './helpers.mjs';
import {nativeTokenHash} from '../entry-writer.mjs';
import {put} from './pvp-fixture.mjs';
import {party} from './dungeon-process-fixture.mjs';

test('native auth logout retires the exact admitted channel owner before returning success',{timeout:30000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket');assert.equal(ticket.status,200);const live=await connect(ticket),routes=logoutHandlers({database:f.f.database,auth:f.auth,clock:f.clock});
 const response=await routes.post(f.request({path:'/api/auth/logout'}));assert.equal(response.status,200);assert.equal((await response.json()).ok,true);assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash),undefined);
 assert.equal(writer.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);assert(!(await combatState(supervisor.rows.get(ticket.channel))).players.some(p=>p.id===f.id));await live.closed;
});

test('native logout waits for an already accepted potion ACK before deleting session and admission',{timeout:30000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,http,connect,faults}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket);await core.permanentPlayers([f.id],()=>f.sql.prepare('UPDATE players SET hp=500,max_hp=1000,potions=3 WHERE id=?').run(f.id));
 const command=writer.command.bind(writer);let committed=false,release;const gate=new Promise(resolve=>release=resolve);t.after(()=>release());writer.command=async(peer,request)=>{const ack=await command(peer,request);if(request.operation==='native_action'&&!committed){committed=true;await gate;}return ack;};
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>committed||faults.length,8000);assert.equal(faults.length,0);const routes=logoutHandlers({database:f.f.database,auth:f.auth,clock:f.clock});let answered=false;const response=routes.post(f.request({path:'/api/auth/logout'})).then(r=>{answered=true;return r;});
 await until(()=>core.transitions.has(f.id),5000);assert.equal(answered,false);assert(writer.authority.admission(f.id));assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);
 release();assert.equal((await response).status,200);assert.equal(writer.authority.admission(f.id),null);assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash),undefined);assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,2);assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));
});

for(const phase of ['before','after'])test('native auth logout source SIGKILL '+phase+' COMMIT preserves atomic session and channel retirement',{timeout:45000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket');await connect(ticket);const source=supervisor.rows.get(ticket.channel),others=[...supervisor.rows.values()].filter(r=>r!==source),oldWorld=world.row,execute=f.f.database.execute.bind(f.f.database),logout=writer.logout.bind(writer);let killed=false,observed;
 const read=()=>({session:Boolean(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash)),admission:Boolean(writer.authority.admission(f.id)),version:f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version}),before=read();
 f.f.database.execute=statement=>{const result=execute(statement);if(phase==='before'&&!killed&&/^DELETE FROM auth_sessions WHERE token_hash/.test(statement.sql)){killed=true;source.child.kill('SIGKILL');throw Object.assign(Error('native_logout_before_commit'),{code:'native_logout_before_commit'});}return result;};
 writer.logout=async(...args)=>{try{const result=await logout(...args);if(phase==='after'&&!killed){killed=true;observed=read();source.child.kill('SIGKILL');throw Object.assign(Error('native_logout_lost_ack'),{code:'native_logout_lost_ack'});}return result;}catch(error){if(killed&&phase==='before')observed=read();throw error;}};
 const routes=logoutHandlers({database:f.f.database,auth:f.auth,clock:f.clock}),response=await routes.post(f.request({path:'/api/auth/logout'}));assert.equal(response.status,500);assert(killed);if(phase==='before')assert.deepEqual(observed,before);else assert.deepEqual(observed,{session:false,admission:false,version:before.version+1});
 await until(()=>source.exited&&supervisor.rows.get(ticket.channel)!==source&&supervisor.rows.get(ticket.channel)?.state==='running'&&!core.transitions.has(f.id),20000);assert.equal(source.child.signalCode,'SIGKILL');assert.equal(world.row,oldWorld);assert(others.every(r=>supervisor.rows.get(r.peer.channel)===r));
 if(phase==='before'){const again=await routes.post(f.request({path:'/api/auth/logout'}));assert.equal(again.status,200);}assert.deepEqual(read(),{session:false,admission:false,version:before.version+1});assert.equal((await http('ticket')).status,401);
});

test('logging out an older native session preserves the current admission and applies the original realm security policy',{timeout:40000},async t=>{
 const s=await setup(t,{shared:true}),{f,core,world,writer,supervisor,http,connect}=s;await world.stopJobs();const ticket=await http('ticket'),live=await connect(ticket),owner=writer.authority.owner(f.id),session=f.sql.prepare('SELECT * FROM auth_sessions WHERE token_hash=?').get(f.tokenHash),token='old_native_session_'+'z'.repeat(40),csrf='old_native_csrf_'+'y'.repeat(40),tokenHash=nativeTokenHash(token),forgotten=[];
 const request=()=>f.request({path:'/api/auth/logout',headers:{Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf}});
 for(const role of ['game',null]){
  put(f.sql,'auth_sessions',{...session,token_hash:tokenHash,csrf_hash:nativeTokenHash(csrf)});
  const realm=role?{role,authOrigin:'https://accounts.invalid',security:{forget:id=>forgotten.push(id)}}:null,routes=logoutHandlers({database:f.f.database,auth:f.auth,clock:f.clock,realm}),response=await routes.post(request());assert.equal(response.status,200);assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(tokenHash),undefined);
  assert(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash));assert.equal(writer.authority.admission(f.id).session_id,f.tokenHash);assert.deepEqual(writer.authority.owner(f.id),owner);assert((await combatState(supervisor.rows.get(ticket.channel))).players.some(p=>p.id===f.id));
  if(role){assert.equal(core.sessions.get(f.id).security.blocked,false);assert.equal(live.ws.readyState,1);assert.equal((await http('ticket')).status,200);assert.deepEqual(forgotten,[f.account.id]);}
  else{assert.equal(core.sessions.get(f.id).security.blocked,true);await live.closed;assert.equal((await http('ticket')).status,401);assert.equal(f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version,session.security_version+1);}
 }
});

test('native auth logout deletes the token while retaining a fresh passive dungeon owner',{timeout:40000},async t=>{
 const s=await party(t,{together:true}),{f,core,writer,supervisor,actors,action}=s,actor=actors[0];assert.equal((await action(actor,{action:'create'})).ok,true);for(const member of actors.slice(1))assert.equal((await action(member,{action:'ready',ready:true})).ok,true);
 const owner=writer.authority.owner(actor.id),token='shared-native-session-'+String(64).repeat(40),csrf='shared-native-csrf-'+String(64).repeat(40),tokenHash=nativeTokenHash(token),routes=logoutHandlers({database:f.f.database,auth:f.auth,clock:f.clock}),request=f.request({path:'/api/auth/logout',headers:{Cookie:'__Host-yasam-session='+token+'; __Host-yasam-csrf='+csrf,'X-CSRF-Token':csrf}}),response=await routes.post(request);
 assert.equal(response.status,200);assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(tokenHash),undefined);assert.equal(writer.authority.admission(actor.id),null);assert.equal(core.sessions.has(actor.id),false);const simulation=writer.authority.simulation(actor.id);assert(simulation);assert.equal(simulation.channel,owner.channel);assert(simulation.epoch>owner.epoch);assert((await combatState(supervisor.rows.get(owner.channel))).players.some(p=>p.id===actor.id));await actor.live.closed;assert.equal((await actor.http()).status,401);
 assert.equal(f.sql.prepare('SELECT status FROM dungeon_runs').get().status,'active');assert.equal((await action(actors[1],{action:'move',x:1,y:0,sequence:1})).ok,true);assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});
