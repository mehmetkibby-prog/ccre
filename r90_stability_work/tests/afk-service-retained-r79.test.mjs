import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AfkService,AFK_WRONG_LOCK_MS} from '../working/core511-source/scripts/core511/afk-service.mjs';

function fixture(t,{enabled=true}={}){
 const directory=mkdtempSync(join(tmpdir(),'afk-r77-')),path=join(directory,'afk.sqlite');
 let now=1800000000000,sql,service;
 const open=()=>{sql=new DatabaseSync(path);service=new AfkService({sql,now:()=>now,enabled,icons:()=>Buffer.from([1])});};
 open();t.after(()=>{sql.close();rmSync(directory,{recursive:true,force:true});});
 if(enabled)assert.equal(service.updateSettings({id:'admin'},{wrongLimit:2}).status,200);
 const identity={actor:'player-1',account:'account-1',session:'session-1',channel:1,map:'forest'};
 return {
  identity,get service(){return service;},get sql(){return sql;},get now(){return now;},
  at(value){now=value;},advance(ms=1000){now+=ms;},
  restart(){sql.close();open();},
  attach(who=identity,context={eligible:true,exempt:false}){return service.attach(who,context);},
  issue(who=identity){return service.issue(who,{eligible:true,exempt:false,reason:'test'}).body.afkCheck;},
  state(who=identity){return service.state(who);},
  answer(correct,who=identity){
   now+=1000;
   const q=sql.prepare("SELECT * FROM afk_challenges WHERE player_id=? AND result='pending'").get(who.actor);
   assert(q,'a pending challenge is required');
   return service.answer(who,{nonce:q.nonce,choice:correct?q.answer_slot:q.answer_slot%4+1});
  },
  lock(){return sql.prepare('SELECT * FROM afk_locks WHERE player_id=?').get(identity.actor);},
  profile(){return sql.prepare('SELECT * FROM afk_profiles WHERE player_id=?').get(identity.actor);}
 };
}

test('two wrong choices persist a 120-second lock across reconnect, channel change and process restart',t=>{
 const f=fixture(t);f.attach();
 assert.equal(f.service.recordSummary(f.identity,{inputs:20,kills:5,score:91,continuousMs:900000,reasons:['cadence']}),true);
 const first=f.issue();
 assert.equal(first.blocked,true);assert.equal(first.locked,false);assert.equal(first.blockedUntil,0);
 assert.equal(first.challenge.attempt,1);assert.equal(first.challenge.maxAttempts,2);
 const wrongOne=f.answer(false);
 assert.equal(wrongOne.status,200);
 const second=wrongOne.body.afkCheck;
 assert.equal(second.blocked,true);assert.equal(second.locked,false);assert.equal(second.challenge.attempt,2);
 assert.notEqual(second.challenge.nonce,first.challenge.nonce);assert.equal(second.challenge.deadline,first.challenge.deadline);

 // A replacement session must retain the first wrong choice and original deadline.
 f.restart();const reconnect={...f.identity,session:'session-2',channel:2};
 const rebound=f.attach(reconnect);
 assert.equal(rebound.challenge.attempt,2);assert.equal(rebound.challenge.deadline,first.challenge.deadline);
 assert.notEqual(rebound.challenge.nonce,second.challenge.nonce);assert.equal(rebound.blocked,true);
 const wrongTwo=f.answer(false,reconnect),locked=wrongTwo.body.afkCheck,end=f.now+120000;
 assert.equal(AFK_WRONG_LOCK_MS,120000);assert.equal(wrongTwo.status,200);
 assert.equal(locked.locked,true);assert.equal(locked.blocked,true);assert.equal(locked.challenge,null);
 assert.equal(locked.blockedUntil,end);assert.equal(locked.blockedRemainingSeconds,120);
 assert.equal(f.lock().reason,'wrong_limit');assert.equal(f.lock().created_ms,f.now);
 assert.equal(f.profile().pending,0);

 f.advance(31000);f.restart();
 const switched={...reconnect,session:'session-3',channel:4},persisted=f.attach(switched);
 assert.equal(persisted.blockedUntil,end);assert.equal(persisted.blockedRemainingSeconds,89);
 assert.equal(persisted.challenge,null);assert.equal(persisted.blocked,true);
 const recover=f.service.recover(switched,{eligible:true,exempt:false});
 assert.equal(recover.status,409);assert.equal(recover.body.afkCheck.challenge,null);
 assert.equal(recover.body.afkCheck.blockedUntil,end);assert.equal(f.lock().created_ms,end-120000);

 const resetBefore=f.state(switched).resetRevision;
 f.at(end-1);assert.equal(f.service.hasExpired(),false);assert.equal(f.state(switched).blockedRemainingSeconds,1);
 assert.deepEqual(f.service.expire(),[]);assert.equal(f.state(switched).locked,true);
 f.at(end);assert.equal(f.service.hasExpired(),true);assert.deepEqual(f.service.expire(),[f.identity.actor]);
 const released=f.state(switched);
 assert.equal(released.blocked,false);assert.equal(released.locked,false);assert.equal(released.challenge,null);
 assert.equal(released.blockedUntil,0);assert.equal(released.blockedRemainingSeconds,0);
 assert(released.resetRevision>resetBefore);assert.equal(f.lock().locked,0);assert.equal(f.lock().cleared_ms,end);
 assert.equal(f.profile().score,0);assert.equal(f.profile().continuous_ms,0);assert.equal(f.profile().reasons,'[]');
 assert.equal(f.service.hasExpired(),false);

 // Reusing the same persistent lock row must start a fresh full penalty.
 const next=f.issue(switched);assert.equal(next.challenge.attempt,1);
 f.answer(false,switched);const again=f.answer(false,switched).body.afkCheck;
 assert.equal(again.blockedUntil,f.now+120000);assert.equal(again.blockedRemainingSeconds,120);
 assert.equal(f.lock().created_ms,f.now);assert(again.blockedUntil>end);
});

test('a correct choice clears the wrong streak and restores play immediately',t=>{
 const f=fixture(t);f.attach();f.issue();f.answer(false);
 const correct=f.answer(true);
 assert.equal(correct.status,200);assert.equal(correct.body.afkCheck.challenge,null);
 assert.equal(correct.body.afkCheck.blocked,false);assert.equal(correct.body.afkCheck.locked,false);
 assert.equal(correct.body.afkCheck.blockedUntil,0);
 const next=f.issue();assert.equal(next.challenge.attempt,1);assert.equal(next.challenge.maxAttempts,2);
 const wrong=f.answer(false).body.afkCheck;
 assert.equal(wrong.challenge.attempt,2);assert.equal(wrong.locked,false);assert.equal(wrong.blocked,true);
 assert.equal(f.sql.prepare("SELECT count(*) AS n FROM afk_challenges WHERE result='correct'").get().n,1);
});

test('unanswered challenges retain their existing recovery lock instead of receiving a timed penalty',t=>{
 const f=fixture(t);f.attach();const q=f.issue();
 f.at(q.challenge.deadline);assert.equal(f.service.hasExpired(),true);
 assert.deepEqual(f.service.expire(),[f.identity.actor]);
 const expired=f.state();assert.equal(expired.locked,true);assert.equal(expired.blocked,false);
 assert.equal(expired.blockedUntil,0);assert.equal(expired.challenge,null);assert.equal(f.lock().reason,'unanswered');
 f.advance(600000);assert.equal(f.service.hasExpired(),false);assert.deepEqual(f.service.expire(),[]);
 assert.equal(f.state().locked,true);
 const recovered=f.service.recover(f.identity,{eligible:true,exempt:false});
 assert.equal(recovered.status,200);assert.equal(recovered.body.afkCheck.challenge.attempt,1);
 assert.equal(recovered.body.afkCheck.blocked,true);
 const correct=f.answer(true).body.afkCheck;assert.equal(correct.locked,false);assert.equal(correct.blocked,false);
});

test('exemption hides a challenge and cancels it at expiry without imposing a lock',t=>{
 const f=fixture(t);f.attach();const q=f.issue();
 const exempt=f.service.context(f.identity,{exempt:true});
 assert.equal(exempt.exempt,true);assert.equal(exempt.blocked,false);assert.equal(exempt.locked,false);
 assert.equal(exempt.challenge,null);assert.equal(exempt.blockedUntil,0);
 assert.equal(f.service.issue(f.identity,{eligible:true,exempt:true}).body.afkCheck.challenge,null);
 f.at(q.challenge.deadline);f.service.expire();
 assert.equal(f.sql.prepare('SELECT result FROM afk_challenges WHERE nonce=?').get(q.challenge.nonce).result,'cancelled');
 assert.equal(f.lock(),undefined);assert.equal(f.state().blocked,false);
});

test('administrative disable and environment disable leave movement unblocked',t=>{
 const f=fixture(t);f.attach();f.issue();f.answer(false);f.answer(false);
 assert.equal(f.state().blocked,true);
 assert.equal(f.service.updateSettings({id:'admin'},{enabled:false}).status,200);
 const disabled=f.state();assert.equal(disabled.enabled,false);assert.equal(disabled.locked,false);
 assert.equal(disabled.blocked,false);assert.equal(disabled.blockedUntil,0);assert.equal(disabled.challenge,null);
 assert.equal(f.service.recover(f.identity,{eligible:true}).body.afkCheck.blocked,false);
 const off=new AfkService({sql:f.sql,now:()=>f.now,enabled:false});
 assert.equal(off.attach(f.identity).blocked,false);assert.equal(off.state(f.identity).enabled,false);
 assert.equal(off.issue(f.identity,{eligible:true}).body.afkCheck.challenge,null);
});
