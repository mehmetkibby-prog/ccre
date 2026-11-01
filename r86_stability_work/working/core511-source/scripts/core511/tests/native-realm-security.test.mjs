import test from 'node:test';
import assert from 'node:assert/strict';
import {native} from './helpers.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {put,json} from './pvp-fixture.mjs';
import {RealmAdmission as Candidate} from '../generated/native-realm-admission.mjs';
import {NativeRealmSecurity} from '../native-realm-security.mjs';
import {deferred} from './native-realm-security-fixture.mjs';
const {RealmAdmission:Original}=await native('vds-server/src/realm-admission.mjs'),{RealmSecurityGate}=await native('vds-server/src/realm-security-gate.mjs');

test('native security mirror preserves complete rows and regression/no-op/unban behavior across12 cases',async t=>{
 const f=await setupEntry(t),db=f.f.database,options={realmId:'security-parity511',now:f.clock},original=new Original(db,options),candidate=new Candidate(db,options),tables=['accounts','auth_sessions','game_presence'],read=()=>json(Object.fromEntries(tables.map(name=>[name,f.sql.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]))),before=read(),version=f.account.security_version;let calls=0;
 db.core511RealmSecurity={batch:statements=>{calls++;return db.batch(statements);}};
 const restore=banned=>{f.sql.exec('DELETE FROM auth_sessions;DELETE FROM game_presence');for(const row of before.accounts)f.sql.prepare('UPDATE accounts SET security_version=?,permanently_banned=? WHERE id=?').run(row.security_version,row.id===f.account.id?banned:row.permanently_banned,row.id);for(const name of ['auth_sessions','game_presence'])for(const row of before[name])put(f.sql,name,row);};
 for(const delta of [-1,0,1])for(const blocked of [false,true])for(const banned of [0,1]){
  const run=async service=>{restore(banned);let error=null;try{await service.applySecurity(f.account.id,{securityVersion:version+delta,blocked});}catch(e){error={name:e.name,message:e.message};}return {error,rows:read()};};
  const expected=await run(original),count=calls,actual=await run(candidate);assert.deepEqual(actual,expected,[delta,blocked,banned].join(':'));assert.equal(calls-count,delta<0||delta===0&&!blocked&&!banned?0:1);
 }
 const count=calls;await original.applySecurity('missing-account',{securityVersion:1,blocked:true});await candidate.applySecurity('missing-account',{securityVersion:1,blocked:true});assert.equal(calls,count);
});

test('binding preserves the actual native gate boolean fast path, freshness deadline, generation rules and restore',async()=>{
 const core={database:{},closed:false},adapter=new NativeRealmSecurity(core);core.database.core511RealmSecurity=adapter;core.serial=operation=>adapter.inCoordinator(operation);let now=1000,reads=0,apply=0;
 const gate=new RealmSecurityGate({now:()=>now,readSecurity:async()=>{reads++;return {securityVersion:1,blocked:false,canPlay:true};},applySecurity:async()=>{apply++;}}),originalApply=gate.applySecurity,originalAuthorize=gate.authorize,originalRefresh=gate.refresh;adapter.bindGate(gate);assert.equal(gate.refresh,originalRefresh);assert.equal(gate.maxAgeMs,30000);assert.equal(await gate.authorize('account',1),true);assert.equal(reads,1);assert.equal(apply,1);assert.equal(gate.authorize('account',1),true);assert.equal(gate.authorize('account',2),false);assert.equal(reads,1);
 const request=deferred();gate.readSecurity=()=>request.promise;now=31000;const pending=gate.authorize('account',1);void pending.catch(()=>{});now=61000;request.resolve({securityVersion:1,blocked:false,canPlay:true});await assert.rejects(pending,/Central security response expired/);assert.equal(gate.entries.size,0);assert.equal(gate.pending.size,0);
 const next=deferred();gate.readSecurity=()=>next.promise;const retired=gate.authorize('account',1);void retired.catch(()=>{});gate.forget('account');next.resolve({securityVersion:1,blocked:false,canPlay:true});await assert.rejects(retired,/closed session/);assert.equal(gate.entries.size,0);
 adapter.close();assert.equal(gate.applySecurity,originalApply);assert.equal(gate.authorize,originalAuthorize);assert.equal(gate.refresh,originalRefresh);assert.equal(Object.hasOwn(gate,'authorize'),false);assert.throws(()=>adapter.bindGate(gate),{code:'native_realm_security_binding'});
});
