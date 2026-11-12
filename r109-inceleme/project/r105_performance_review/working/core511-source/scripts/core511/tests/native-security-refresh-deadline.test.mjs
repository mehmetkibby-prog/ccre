import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {realmStartupConfig} from './native-realm-startup-fixture.mjs';
import {until} from './helpers.mjs';
import {realmAdmissionFixture} from './native-realm-admission-fixture.mjs';
import {realmGate,deferred} from './native-realm-security-fixture.mjs';

test('periodic native auth publishes the completed signed background refresh deadline before the old mirror expires',{timeout:35000},async t=>{
 let background=false,release,entered=false;
 const waiting=new Promise(resolve=>release=resolve);
 const s=await nativeHttpHost(t,{realmSetup:async host=>{
  await realmStartupConfig(t,host,{state:async(_id,local)=>{if(background){entered=true;await waiting;}return {securityVersion:local.security_version,blocked:false,canPlay:true};}}).prepare();
 }}),{core,f,supervisor}=s;await s.world.stopJobs();await s.host.database.atomic(sql=>sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(f.id));
 const ticket=await s.http('character',{channel:1});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await s.connect(ticket),owners=[...supervisor.rows.values()],gate=core.realm.security,entry=gate.entries.get(f.account.id),oldDeadline=Date.now()+2500;
 gate.entries.set(f.account.id,{...entry,validUntil:oldDeadline});
 const current=core.sessions.get(f.id),oldMirror={...current.security,revision:core.nextRevision(f.id),securityValidUntil:oldDeadline};current.security=oldMirror;await core.process(core.authority.owner(f.id)).control.request('session',oldMirror);
 background=true;let settled=false;const refreshed=core.refresh().finally(()=>settled=true);
 try{
  await until(()=>entered,5000);await new Promise(resolve=>setTimeout(resolve,20));
  assert.equal(settled,false,'must await the exact native background job, not publish its old cached deadline');
 }finally{release();await refreshed;}
 const native=gate.entries.get(f.account.id);assert(native.validUntil>oldDeadline);assert.equal(core.sessions.get(f.id).security.securityValidUntil,native.validUntil);
 await new Promise(resolve=>setTimeout(resolve,Math.max(0,oldDeadline-Date.now()+100)));
 live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));
 await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),5000);
 const result=live.packets.flatMap(p=>p.results??[]).find(r=>r.sequence===1);assert.equal(result.status,200);assert.equal(live.ws.readyState,1);assert.equal(s.faults.length,0);assert.deepEqual([...supervisor.rows.values()],owners);
 assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(f.id).potions,1);
});

test('periodic refresh awaiting a formerly valid cache still commits a new ban once and retires only that actor',{timeout:35000},async t=>{
 const s=await realmAdmissionFixture(t),{core,f,supervisor}=s,{gate}=realmGate(s),ticket=await s.http('character',{channel:1}),live=await s.connect(ticket),owners=[...supervisor.rows.values()],network=deferred();
 gate.entries.set(f.account.id,{...gate.entries.get(f.account.id),validUntil:f.clock()+5000});gate.readSecurity=()=>network.promise;
 let finished=false;const refresh=core.refresh().finally(()=>finished=true);
 try{await until(()=>gate.pending.has(f.account.id),5000);await new Promise(resolve=>setImmediate(resolve));assert.equal(finished,false);}
 finally{network.resolve({securityVersion:f.account.security_version+1,blocked:true,canPlay:false});await refresh;}
 await core.tail;await live.closed;
 assert.equal(core.authority.admission(f.id),null);assert.equal(core.sessions.has(f.id),false);assert.equal(gate.pending.size,0);assert.equal(core.transitions.size,0);assert.deepEqual([...supervisor.rows.values()],owners);
 assert.equal(f.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(f.tokenHash),undefined);
 assert.equal(f.sql.prepare('SELECT security_version FROM accounts WHERE id=?').get(f.account.id).security_version,f.account.security_version+1);
 assert(s.faults.every(f=>f.authentication===true),s.faults.map(f=>f.error?.message).join(','));
});

test('a periodic mirror refresh obtains a signed deadline early enough for its next 10-second scan',{timeout:35000},async t=>{
 const s=await realmAdmissionFixture(t),{core,f}=s,{gate}=realmGate(s),ticket=await s.http('character',{channel:1});await s.connect(ticket);
 const read=gate.readSecurity.bind(gate),oldDeadline=Date.now()+15000;let reads=0;
 gate.readSecurity=async(...args)=>{reads++;return read(...args);};gate.entries.set(f.account.id,{...gate.entries.get(f.account.id),validUntil:oldDeadline});
 await core.refresh();assert.equal(reads,1,'a cached deadline must not be published across two 10-second scans without a new signed check');
 assert(core.sessions.get(f.id).security.securityValidUntil>oldDeadline);assert.equal(core.sessions.get(f.id).security.securityValidUntil,gate.entries.get(f.account.id).validUntil);assert.equal(s.faults.length,0);
});
