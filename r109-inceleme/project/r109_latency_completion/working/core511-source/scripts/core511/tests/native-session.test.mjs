import test from 'node:test';
import assert from 'node:assert/strict';
import {patchNativeSession} from '../patch-native-session.mjs';
import {sessionFactory,nativeSessionSource} from './native-session-fixture.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {json,put} from './pvp-fixture.mjs';

test('native session patch alters only one non-accounts batch and reverses to the exact original bundle',()=>{
 const result=patchNativeSession(nativeSessionSource);assert.equal(result.proof.edits.length,1);const e=result.proof.edits[0];assert.equal(result.source.slice(0,e.start)+e.original+result.source.slice(e.start+e.replacement.length),nativeSessionSource);assert.throws(()=>patchNativeSession(nativeSessionSource.replace('async function createSession(accountId,loginGuard439=null)','async function renamedCreateSession(accountId,loginGuard439=null)')),/native_session_create_missing/);
});

test('original session SQL, bans, missing accounts, accounts guard and realm lifetime retain exact parity',async t=>{
 const f=await setupEntry(t),db=f.f.database,read=()=>json(Object.fromEntries(['accounts','auth_sessions','game_presence'].map(name=>[name,f.sql.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]))),before=read();let calls=0;
 db.core511Session={batch:statements=>{calls++;return db.batch(statements);}};
 const restore=()=>{for(const row of before.accounts)f.sql.prepare('UPDATE accounts SET security_version=?,updated_at=?,permanently_banned=?,suspended_until_ms=? WHERE id=?').run(row.security_version,row.updated_at,row.permanently_banned,row.suspended_until_ms,row.id);f.sql.exec('DELETE FROM auth_sessions;DELETE FROM game_presence');for(const name of ['auth_sessions','game_presence'])for(const row of before[name])put(f.sql,name,row);};
 for(const role of [null,'game','accounts'])for(const scenario of ['live','expired','banned','missing','guard']){
  const run=async source=>{restore();if(scenario==='expired')f.sql.prepare('UPDATE game_presence SET expires_at_ms=1').run();if(scenario==='banned')f.sql.prepare('UPDATE accounts SET permanently_banned=1 WHERE id=?').run(f.account.id);const factory=sessionFactory({database:db,auth:f.auth,clock:f.clock,realm:role?{role}:null,...(source?{source}:{})});let answer,guardCalls=0;try{answer={result:json(await factory(scenario==='missing'?'missing-account511':f.account.id,scenario==='guard'?()=>{guardCalls++;throw Error('native-launch-guard');}:null))};}catch(error){answer={error:{name:error.name,message:error.message,code:error.code,status:error.status}};}return {answer,guardCalls,rows:read()};};
  const expected=await run(nativeSessionSource),count=calls,actual=await run();assert.deepEqual(actual,expected,String(role)+':'+scenario);assert.equal(calls-count,role==='accounts'||['banned','missing'].includes(scenario)?0:1);
 }
});
