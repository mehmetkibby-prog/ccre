import test from 'node:test';
import assert from 'node:assert/strict';
import {patchNativePresence} from '../patch-native-presence.mjs';
import {presenceHandler,nativePresenceSource} from './native-presence-fixture.mjs';
import {setupEntry} from './entry-fixture.mjs';
import {json,put} from './pvp-fixture.mjs';

test('native presence patch reverses exactly three execution calls to the original bundle',()=>{
 const result=patchNativePresence(nativePresenceSource);assert.equal(result.proof.edits.length,3);let offset=0,output=result.source;const edits=result.proof.edits.toSorted((a,b)=>a.start-b.start).map(e=>{const at=e.start+offset;offset+=e.replacement.length-(e.end-e.start);return {...e,at};});for(const e of edits.toReversed())output=output.slice(0,e.at)+e.original+output.slice(e.at+e.replacement.length);assert.equal(output,nativePresenceSource);assert.throws(()=>patchNativePresence(nativePresenceSource.replace('async function POST$24(request)','async function renamedPresence(request)')),/native_presence_route_missing/);
});

test('original presence SQL, result bodies, headers and maintenance deadlines retain exact parity',async t=>{
 const f=await setupEntry(t),db=f.f.database,read=()=>json(f.sql.prepare('SELECT * FROM game_presence ORDER BY account_id').all()),before=read();db.core511Presence={execute:(statement,{first})=>first?statement.first():statement.run()};
 const restore=()=>{f.sql.exec('DELETE FROM game_presence');for(const row of before)put(f.sql,'game_presence',row);f.sql.prepare('UPDATE players SET is_gm=0 WHERE id=?').run(f.id);};
 for(const action of ['claim','renew','release'])for(const scenario of ['live','expired','missing','other_live','other_expired','maintenance']){
  const run=async source=>{restore();if(scenario.endsWith('expired'))f.sql.prepare('UPDATE game_presence SET expires_at_ms=1').run();if(scenario==='missing')f.sql.exec('DELETE FROM game_presence');if(scenario==='maintenance'&&action==='claim')f.sql.prepare('UPDATE players SET is_gm=1 WHERE id=?').run(f.id);
   const realm=scenario==='maintenance'?{maintenance:{policy:{phase:'maintenance',deadlineMs:f.clock()+1234},deadline:()=>f.clock()+1234,isGameMaster:()=>action==='claim'}}:null,route=presenceHandler({f,realm,...(source?{source}:{})}),response=await route(f.request({path:'/api/game-presence',body:{action},...(scenario.startsWith('other')?{headers:{'X-Game-Instance':'22222222-2222-4222-8222-222222222222'}}:{})}));return {status:response.status,body:await response.json(),headers:[...response.headers],rows:read()};};
  assert.deepEqual(await run(),await run(nativePresenceSource),action+':'+scenario);
 }
});

test('native presence Origin, CSRF, instance, account and maintenance denials precede adapter execution',async t=>{
 const f=await setupEntry(t);let calls=0;f.f.database.core511Presence={execute:()=>{calls++;assert.fail('denied native route reached adapter');}};
 for(const [headers,body,status,realm]of [[{Origin:'https://other.invalid'},{action:'release'},403],[{'X-CSRF-Token':'bad_csrf_'+'a'.repeat(40)},{action:'claim'},403],[{'X-Game-Instance':'invalid'},{action:'renew'},400],[{},{action:'claim',accountId:'different-account'},409],[{},{action:'invalid'},400],[{},{action:'claim'},403,{maintenance:{policy:{phase:'maintenance'},isGameMaster:()=>false}}]]){
  const response=await presenceHandler({f,realm})(f.request({path:'/api/game-presence',headers,body}));assert.equal(response.status,status);assert.equal(calls,0);
 }
});
