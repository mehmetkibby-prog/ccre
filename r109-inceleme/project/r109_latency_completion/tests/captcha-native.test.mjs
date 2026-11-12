import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeHttpHost} from '../working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {stageNativeHttp} from '../working/core511-source/scripts/core511/tests/native-http-bundle-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';

async function setup(t){
 const s=await nativeHttpHost(t);await s.world.stopJobs();
 await s.host.database.atomic(()=>{globalThis.__colLaunch.grant(s.f.account.id,true);s.f.sql.prepare('INSERT INTO bot_due VALUES(?,?) ON CONFLICT(account_id) DO UPDATE SET due_ms=excluded.due_ms').run(s.f.account.id,Date.now()-1000);});
 s.module=await stageNativeHttp(t).load();s.get=()=>s.module.default(s.f.request({path:'/api/bot-check',method:'GET'}));
 s.rows=()=>s.f.sql.prepare("SELECT * FROM bot_challenges WHERE owner=? AND purpose='game'").all(s.f.account.id);return s;
}
function pauseDrawing(s){
 let release;const gate=new Promise(r=>release=r),bot=s.core.bot,original=bot.prepareChallengeR106;let calls=0;
 bot.prepareChallengeR106=async(...args)=>{calls++;assert.equal(s.host.database.sqlite.isTransaction,false);await gate;return original(...args);};
 return {get calls(){return calls;},release,restore:()=>{bot.prepareChallengeR106=original;release();}};
}

test('real game route draws outside the writer and coordinator; simultaneous GETs install one challenge',{timeout:35000},async t=>{
 const s=await setup(t),drawing=pauseDrawing(s);let pending=[];
 try{
  pending=[s.get(),s.get()];await until(()=>drawing.calls===2,5000);
  assert.equal(s.rows().length,0);
  let coordinator=false,writer=false;
  const other=s.core.serial(async()=>{coordinator=true;await s.host.database.atomic(()=>{writer=true;});});
  await until(()=>coordinator&&writer,3000);await other;
  drawing.release();const responses=await Promise.all(pending);assert(responses.every(r=>r.status===200));const values=await Promise.all(responses.map(r=>r.json()));
  assert(values.every(v=>v.required&&v.id===values[0].id));assert.equal(s.rows().length,1);assert.match(values[0].image,/^data:image\/png;base64,/);
  const cached=await (await s.get()).json();assert.equal(cached.id,values[0].id);assert.equal(drawing.calls,2,'cached challenge needs no new render');assert.equal(s.faults.length,0);
 }finally{drawing.restore();await Promise.allSettled(pending);}
});

test('expired login during rendering is reauthorized and cannot create a challenge',{timeout:35000},async t=>{
 const s=await setup(t),drawing=pauseDrawing(s);let pending;
 try{
  pending=s.get();await until(()=>drawing.calls===1,5000);
  await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE auth_sessions SET expires_at=0 WHERE account_id=?').run(s.f.account.id));
  drawing.release();const response=await pending;assert.notEqual(response.status,200);assert.equal(s.rows().length,0);assert.equal(s.faults.length,0);
 }finally{drawing.restore();await pending?.catch(()=>{});}
});

test('if verification succeeds in another request while rendering, the old deadline is not restored',{timeout:35000},async t=>{
 const s=await setup(t),drawing=pauseDrawing(s);let pending;
 try{
  pending=s.get();await until(()=>drawing.calls===1,5000);const renewed=Date.now()+1800000;
  await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE bot_due SET due_ms=? WHERE account_id=?').run(renewed,s.f.account.id));
  drawing.release();const response=await pending;assert.equal(response.status,200);const value=await response.json();assert.equal(value.required,false);assert.equal(value.dueAt,renewed);assert.equal(s.rows().length,0);assert.equal(s.faults.length,0);
 }finally{drawing.restore();await pending?.catch(()=>{});}
});

test('render failure returns an error without installing a half-created challenge',{timeout:35000},async t=>{
 const s=await setup(t),bot=s.core.bot,prepare=bot.prepareChallengeR106;
 bot.prepareChallengeR106=async()=>{throw Error('test worker failure');};
 try{const response=await s.get();assert(response.status>=500);assert.equal(s.rows().length,0);assert.equal(s.faults.length,0);}
 finally{bot.prepareChallengeR106=prepare;}
});
