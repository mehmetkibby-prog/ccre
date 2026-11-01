import test from 'node:test';
import assert from 'node:assert/strict';
import {patchNativeLogout} from '../patch-native-logout.mjs';
import {nativeLogoutSource,logoutHandlers} from './native-logout-fixture.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {json,put} from './pvp-fixture.mjs';

test('native logout patch changes only two batch calls and preserves every other bundle byte',()=>{
 const result=patchNativeLogout(nativeLogoutSource);assert.equal(result.proof.edits.length,2);let offset=0,recovered=result.source;
 const edits=result.proof.edits.toSorted((a,b)=>a.start-b.start).map(e=>{const patchedStart=e.start+offset;offset+=e.replacement.length-(e.end-e.start);return {...e,patchedStart};});
 for(const e of edits.toReversed()){assert.equal(recovered.slice(e.patchedStart,e.patchedStart+e.replacement.length),e.replacement);recovered=recovered.slice(0,e.patchedStart)+e.original+recovered.slice(e.patchedStart+e.replacement.length);}assert.equal(recovered,nativeLogoutSource);
 assert.throws(()=>patchNativeLogout(nativeLogoutSource.replace('async function deleteCurrentSession(request)','async function renamedDelete(request)')),/native_logout_function_missing/);
});

test('native logout retains Origin and optional-session CSRF checks before its database adapter',async t=>{
 const s=await setupEntry(t),db=s.f.database;let calls=0;db.core511Logout={batch:(statements)=>{calls++;return db.batch(statements);}};const routes=logoutHandlers({database:db,auth:s.auth,clock:s.clock});
 for(const headers of [{Origin:'https://foreign.invalid'},{'X-CSRF-Token':'wrong_csrf_'+'x'.repeat(40)},{Cookie:'__Host-yasam-session='+s.token}]){
  const response=await routes.post(s.request({path:'/api/auth/logout',headers}));assert.equal(response.status,403);assert.equal(calls,0);assert(s.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(s.tokenHash));
 }
 // Original logout permits deleting an expired cookie session without CSRF.
 s.sql.prepare('UPDATE auth_sessions SET expires_at=1 WHERE token_hash=?').run(s.tokenHash);
 const response=await routes.post(s.request({path:'/api/auth/logout',headers:{'X-CSRF-Token':''}}));assert.equal(response.status,200);assert.equal(calls,1);assert.equal(s.sql.prepare('SELECT 1 FROM auth_sessions WHERE token_hash=?').get(s.tokenHash),undefined);
});

test('native standalone, game and accounts logout SQL, redirects and cleared-cookie headers retain exact parity',async t=>{
 const s=await setupEntry(t),db=s.f.database,capture=()=>json(Object.fromEntries(['accounts','auth_sessions','game_presence'].map(name=>[name,s.sql.prepare('SELECT * FROM '+name+' ORDER BY 1').all()]))),before=capture();let calls=0,forgotten=[];
 const restore=()=>{for(const row of before.accounts)s.sql.prepare('UPDATE accounts SET security_version=?,updated_at=? WHERE id=?').run(row.security_version,row.updated_at,row.id);s.sql.exec('DELETE FROM auth_sessions;DELETE FROM game_presence');for(const name of ['auth_sessions','game_presence'])for(const row of before[name])put(s.sql,name,row);};
 db.core511Logout={batch:(statements)=>{calls++;return db.batch(statements);}};
 for(const role of [null,'game','accounts']){
  const realm=role?{role,authOrigin:'https://accounts.invalid',security:{forget:id=>forgotten.push(id)}}:null;
  const run=async source=>{const route=logoutHandlers({database:db,auth:s.auth,clock:s.clock,realm,...(source?{source}:{})}),response=await route.post(s.request({path:'/api/auth/logout'}));return {status:response.status,body:await response.json(),headers:[...response.headers],rows:capture(),forgotten:[...forgotten]};};
  restore();forgotten=[];const expected=await run(nativeLogoutSource);restore();forgotten=[];const count=calls,actual=await run();assert.deepEqual(actual,expected,role??'standalone');assert.equal(calls-count,role==='accounts'?0:1);assert.equal(actual.status,200);
 }
});
