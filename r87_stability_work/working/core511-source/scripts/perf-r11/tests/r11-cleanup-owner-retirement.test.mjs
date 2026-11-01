import test from 'node:test';
import assert from 'node:assert/strict';
import {fork} from 'node:child_process';
import {randomUUID} from 'node:crypto';
import {fixture} from './native-fixture.mjs';

const frame=(sql,...params)=>({sql,params});
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const handlers=x=>x.controls.get(1).handlers;
const maintenance=db=>db.remote([frame('DELETE FROM combat_events WHERE created_at < ?',-1)]);
const removeOwner=(x,id)=>x.database.atomic(sql=>sql.prepare('DELETE FROM channel_owners WHERE player_id=?').run(id));
const removePlayer=(x,id)=>x.database.atomic(sql=>sql.prepare('DELETE FROM players WHERE id=?').run(id));
const drain=(x,ids=['bot-1','bot-2'])=>handlers(x).loadlabDrain({runId:x.runId,ids});
const forget=(x,ids=['bot-1','bot-2'])=>handlers(x).loadlabForget({runId:x.runId,playerIds:ids,monsterIds:[]});

test('R6 retains retirement of only the drained bot leases before deletion; real writer work keeps succeeding',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1),realOwner=db.owners.get('real-1');
  const proof=await drain(x);assert.equal(proof.drained,true);
  for(const id of ['bot-1','bot-2']){assert.equal(db.owners.has(id),false);assert.equal(db.drainingPlayers.has(id),true);}
  assert.equal(db.owners.get('real-1'),realOwner);
  await removeOwner(x,'bot-1');await removeOwner(x,'bot-2');
  await maintenance(db);
  const before=x.database.sqlite.prepare('SELECT gems FROM players WHERE id=?').get('real-1').gems;
  await db.runPlayer('real-1',()=>db.remote([frame('UPDATE players SET gems=gems+1 WHERE id=?','real-1')]));
  assert.equal(x.database.sqlite.prepare('SELECT gems FROM players WHERE id=?').get('real-1').gems,before+1);
  for(const id of ['bot-1','bot-2'])await removePlayer(x,id);
  await forget(x);
  assert.equal(db.owners.get('real-1'),realOwner);assert.equal(db.drainingPlayers.has('real-1'),false);
  assert.equal(db.drainingPlayers.has('bot-1'),false);assert.equal(x.fatals.length,0);assert.equal(db.failure,undefined);
  await maintenance(db);
 }finally{await x.close();}
});

test('accepted actor work and its durable write finish before local lease retirement',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1),entered=deferred(),release=deferred();x.setRunStatus('active');
  const action=db.runPlayer('bot-1',async()=>{
   const e=db.combat.entry('players','bot-1');e.current={...e.current,hp:e.current.hp-1};e.generation++;
   db.combat.dirty.set('players\u001ebot-1',{name:'players',id:'bot-1',e});
   entered.resolve();await release.promise;return db.flushMemory();
  });
  await entered.promise;x.setRunStatus('revoked');
  let drained=false;const pending=drain(x).then(v=>{drained=true;return v;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(drained,false);assert.equal(db.owners.has('bot-1'),true);
  release.resolve();await action;await pending;
  assert.equal(x.database.sqlite.prepare('SELECT hp FROM players WHERE id=?').get('bot-1').hp,99);
  assert.equal(db.owners.has('bot-1'),false);assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('forged real-player or wrong-run cohort fails before any supplied bot lease is retired',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1);
  await assert.rejects(drain(x,['bot-1','real-1']),{code:'unowned_drain_player'});
  assert.equal(db.owners.has('bot-1'),true);assert.equal(db.owners.has('real-1'),true);
  assert.equal(db.drainingPlayers.has('real-1'),false);
  await assert.rejects(handlers(x).loadlabDrain({runId:'forged-run',ids:['bot-1']}),{code:'unowned_drain_player'});
  assert.equal(db.owners.has('bot-1'),true);assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('a previously queued actorless request keeps valid leases through its durable ACK before drain returns',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1),entered=deferred(),release=deferred(),write=db.requestWrite.bind(db);let intercepted=false;
  db.requestWrite=async request=>{if(!intercepted){intercepted=true;assert.ok(request.owners.some(o=>o.playerId==='bot-1'));entered.resolve();await release.promise;}return write(request);};
  const work=maintenance(db);await entered.promise;
  let finished=false;const proof=drain(x).then(v=>{finished=true;return v;});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(finished,false);assert.equal(db.owners.has('bot-1'),true);
  assert.ok(x.database.sqlite.prepare('SELECT 1 FROM channel_owners WHERE player_id=?').get('bot-1'));
  release.resolve();await work;await proof;
  assert.equal(db.owners.has('bot-1'),false);assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('actorless work queued behind the captured final drain barrier builds its lease list after retirement',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1),barrier=deferred(),captured=deferred(),flush=db.flushMemory.bind(db),write=db.requestWrite.bind(db);let calls=0;const owners=[];
  db.flushMemory=async()=>{await flush();if(++calls===3){db.writeTail=barrier.promise;captured.resolve();}};
  db.requestWrite=request=>{owners.push(request.owners.map(o=>o.playerId));return write(request);};
  const proof=drain(x);await captured.promise;await new Promise(resolve=>setImmediate(resolve));
  const late=maintenance(db);barrier.resolve();await proof;await late;
  assert.ok(owners.length>0);assert.deepEqual(owners.at(-1),['real-1']);
  for(const id of ['bot-1','bot-2'])await removeOwner(x,id);
  await maintenance(db);assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('partial entity deletion can retry using its original private drain frame',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1);await drain(x);await removeOwner(x,'bot-1');await removePlayer(x,'bot-1');
  await drain(x,['bot-2']);
  assert.equal(db.owners.has('bot-1'),false);assert.equal(db.owners.has('bot-2'),false);
  await maintenance(db);await removeOwner(x,'bot-2');await removePlayer(x,'bot-2');await forget(x);
  assert.equal(db.drainingPlayers.has('bot-1'),false);assert.equal(db.drainingPlayers.has('bot-2'),false);
  assert.equal(db.owners.has('real-1'),true);assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('committed notifications may rehydrate a clean cache but cannot restore a retired lease',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1);await drain(x);
  await db.applyCommitted([{table:'players',id:'bot-1',keys:['bot-1'],owner:'bot-1',staticChanged:'inventory'}]);
  assert.equal(db.owners.has('bot-1'),false);assert.equal(db.drainingPlayers.has('bot-1'),true);
  assert.equal(db.positions.dirty.has('bot-1'),false);assert.equal(db.combat.dirty.has('players\u001ebot-1'),false);
  await assert.rejects(db.runPlayer('bot-1',async()=>{}),/owner_draining/);
  for(const id of ['bot-1','bot-2'])await removeOwner(x,id);
  await maintenance(db);
  for(const id of ['bot-1','bot-2'])await removePlayer(x,id);
  await forget(x);
  assert.equal(db.positions.entries.has('bot-1'),false);assert.equal(db.combat.tables.get('players').records.has('bot-1'),false);
  assert.equal(x.fatals.length,0);
 }finally{await x.close();}
});

test('a dirty bot combat entry after the drain barrier fails closed without losing its lease',async()=>{
 const x=await fixture();try{
  const db=x.channels.get(1),flush=db.flushMemory.bind(db);let calls=0;
  db.flushMemory=async()=>{await flush();if(++calls===3){const e=db.combat.entry('players','bot-1');e.current={...e.current,hp:e.current.hp-1};e.generation++;db.combat.dirty.set('players\u001ebot-1',{name:'players',id:'bot-1',e});}};
  await assert.rejects(drain(x),{code:'dirty_record_after_drain'});
  assert.equal(db.owners.has('bot-1'),true);assert.equal(db.combat.dirty.has('players\u001ebot-1'),true);
  assert.equal(db.drainingPlayers.has('bot-1'),true);assert.equal(db.owners.has('real-1'),true);
 }finally{await x.close();}
});

test('actual cleanup phases interleave real maintenance after owner-row deletion without fatal',async()=>{
 const x=await fixture({channels:[1,2,3]});try{
  const db=x.channels.get(1),atomic=x.database.atomic.bind(x.database);let interleaved=false;
  x.database.atomic=async task=>{const result=await atomic(task);
   if(!interleaved&&!x.database.sqlite.prepare('SELECT 1 FROM channel_owners WHERE player_id=?').get('bot-1')&&x.database.sqlite.prepare('SELECT 1 FROM players WHERE id=?').get('bot-1')){
    interleaved=true;assert.equal(db.owners.has('bot-1'),false);await maintenance(db);
    await db.runPlayer('real-1',()=>db.remote([frame('UPDATE players SET gems=gems+1 WHERE id=?','real-1')]));
   }return result;
  };
  const result=await x.cleanupLoadLabRun({database:x.database,supervisor:x.supervisor,registry:x.registry,runId:x.runId});
  assert.equal(result.clean,true);assert.equal(interleaved,true);assert.equal(x.fatals.length,0);
  assert.equal(x.database.sqlite.prepare('SELECT COUNT(*) n FROM players WHERE loadlab_run_id=?').get(x.runId).n,0);
  assert.ok(db.owners.has('real-1'));await maintenance(db);
 }finally{await x.close();}
});

test('actual forked channel keeps its PID and durable real-player writes across cleanup', {timeout:15000}, async t=>{
 const x=await fixture({channels:[1,2,3]});let child,rpc,exit;const messages=[];let stderr='';
 try{
  const {ChannelRpc}=await x.importModule('vds-server/src/channel-rpc.mjs');
  const identity=randomUUID(),peer=x.peers.get(1),eventRange=await x.writer.reserveEvents(peer);
  child=fork(new URL('./r11-cleanup-child-worker.mjs',import.meta.url),[],{execPath:process.execPath,execArgv:[],env:{...process.env,COL_R4_CLEANUP_FIXTURE:JSON.stringify({runtime:x.runtime,file:x.file,runId:x.runId,botIds:x.botIds,identity,eventRange})},stdio:['ignore','ignore','pipe','ipc']});
  const exited=new Promise(resolve=>child.once('exit',(code,signal)=>{exit={code,signal};resolve(exit);}));
  t.after(()=>{if(child&&exit===undefined)child.kill('SIGKILL');});
  child.stderr.on('data',chunk=>{stderr=(stderr+chunk).slice(-8192);});
  const ready=new Promise((resolve,reject)=>{
   child.on('message',message=>{if(message?.type==='fixture-ready')resolve(message);else if(message?.type==='fixture-fatal')messages.push(message);});
   child.once('error',reject);child.once('exit',()=>reject(Error('Fixture exited before ready: '+stderr)));
  });
  rpc=new ChannelRpc(child,{identity,handlers:{claim:({id})=>x.authority.claim(id,1,peer.incarnation),write:request=>x.writer.write(peer,request)}});
  const initial=await ready;assert.equal(initial.pid,child.pid);
  x.supervisor.children.get(1).rpc=rpc;
  const before=await rpc.request('fixtureHumanWork',{});const atomic=x.database.atomic.bind(x.database);let during=null;
  x.database.atomic=async(task,options)=>{const result=await atomic(task,options);
   if(during===null&&!x.database.sqlite.prepare('SELECT 1 FROM channel_owners WHERE player_id=?').get('bot-1')&&x.database.sqlite.prepare('SELECT 1 FROM players WHERE id=?').get('bot-1')){
    during=false;during=await rpc.request('fixtureHumanWork',{});
   }return result;
  };
  const clean=await x.cleanup();assert.equal(clean.clean,true);assert.ok(during&&during.pid===initial.pid);
  const after=await rpc.request('fixtureHumanWork',{}),health=await rpc.request('fixturePing',{});
  assert.equal(exit,undefined);assert.equal(child.pid,initial.pid);assert.equal(after.pid,initial.pid);assert.equal(health.pid,initial.pid);
  assert.equal(health.realOwned,true);assert.equal(health.botOwned,false);assert.equal(health.failed,false);
  assert.equal(after.gems,before.gems+2);assert.equal(x.database.sqlite.prepare('SELECT gems FROM players WHERE id=?').get('real-1').gems,after.gems);
  assert.deepEqual(messages,[]);assert.equal(x.fatals.length,0);
  t.diagnostic(JSON.stringify({scope:'local-fork-native-ipc',beforePid:before.pid,duringPid:during.pid,afterPid:after.pid,realGemsBefore:before.gems,realGemsAfter:after.gems,cleanupConfirmed:clean.clean,exitedDuringCleanup:exit!==undefined,fatalEvents:messages.length}));
  child.kill('SIGTERM');assert.deepEqual(await exited,{code:0,signal:null});
 }finally{
  rpc?.close();
  if(child&&exit===undefined){child.kill('SIGKILL');await new Promise(resolve=>child.once('exit',resolve));}
  await x.close();
 }
});
