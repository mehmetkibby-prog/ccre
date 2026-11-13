import test from 'node:test';
import assert from 'node:assert/strict';
import {setup,extraPlayer} from '../working/core511-source/scripts/core511/tests/process-fixture.mjs';
import {until} from '../working/core511-source/scripts/core511/tests/helpers.mjs';
const gate=()=>{let release;return {promise:new Promise(r=>release=r),release:()=>release()};};

test('an unrelated actor keeps worker persistence through freeze and refresh, but native SQL waits for the worker',{timeout:60000},async t=>{
 const s=await setup(t,{shared:true,localCombat:{hp:1}}),{f,core,writer,world,http,connect,faults}=s;
 await world.stopJobs();const a=await http('character',{channel:1});assert.equal(a.status,200);await connect(a);
 const b=extraPlayer(s,91),ticket=await b.http('character',{channel:4});assert.equal(ticket.status,200,JSON.stringify(ticket));const live=await connect(ticket);
 await core.permanentPlayers([f.id,b.id],()=>{
  f.sql.prepare("UPDATE players SET area='bazaar',hp=100000,max_hp=100000 WHERE id=?").run(f.id);
  f.sql.prepare("UPDATE players SET area='forest',x=2700,y=2025,hp=100,max_hp=100000,potions=4,xp=0,level=40,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0,combat_lock_until_ms=0 WHERE id=?").run(b.id);
 });
 const w=writer.rewardWorkerR533,freeze=gate(),refresh=gate(),worker=gate(),endpointFor=core.permanent.endpointFor,send=w.send.bind(w);
 let frozen=false,refreshing=false,entered=false,intercepted=false,held;
 core.permanent.endpointFor=(...args)=>{
  const ep=endpointFor(...args);if(args[0]!==a.channel)return ep;
  return new Proxy(ep,{get(target,key){
   if(key==='freeze')return async q=>{const ack=await target.freeze(q);frozen=true;await freeze.promise;return ack;};
   if(key==='refresh')return async q=>{const ack=await target.refresh(q);refreshing=true;await refresh.promise;return ack;};
   const value=target[key];return typeof value==='function'?value.bind(target):value;
  }});
 };
 w.send=async envelope=>{if(!intercepted&&envelope.request.playerId===b.id){intercepted=true;await worker.promise;}return send(envelope);};
 try{
  held=core.permanent.permanentPlayers([f.id],()=>{entered=true;assert.equal(w.lane.busy,null,'native SQL cannot overlap a worker transaction');f.sql.prepare('UPDATE players SET gems=gems+1 WHERE id=?').run(f.id);});
  await until(()=>frozen,5000);assert.equal(core.permanent.entries.get(f.id).phase,'freezing');
  const before=w.stats.jobs;
  live.ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'attack',targetId:'golge-local-terminal511',spawnRound:17,ability:0,intentId:'r113-independent-persistence'}}));
  await until(()=>intercepted||faults.length||live.packets.some(p=>p.results?.some(r=>r.sequence===1)),6000);assert.equal(faults.length,0);assert(intercepted,'unrelated combat must stay in the worker during another actor freeze');
  freeze.release();await until(()=>core.permanent.entries.get(f.id)?.phase==='frozen',2000);assert.equal(entered,false,'native callback must await the in-flight worker');
  worker.release();await until(()=>refreshing,7000);assert(entered);assert.equal(w.stats.jobs,before+1);assert.equal(core.permanent.entries.get(f.id).phase,'refreshing');
  assert.throws(()=>core.permanent.assertAvailable([f.id]),/permanent_actor_fenced/);
  await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===1)),5000);
  live.ws.send(JSON.stringify({type:'input',sequence:2,payload:{action:'use_potion'}}));
  await until(()=>live.packets.some(p=>p.results?.some(r=>r.sequence===2))||faults.length,7000);
  assert.equal(faults.length,0,faults.map(f=>f.error?.stack).join('\n'));assert.equal(w.stats.jobs,before+2,'refresh must not redirect other players to main-thread SQL');
  assert.equal(f.sql.prepare('SELECT potions FROM players WHERE id=?').get(b.id).potions,3);
  refresh.release();await held;assert.equal(core.permanent.entries.size,0);
 }finally{freeze.release();worker.release();refresh.release();await held;core.permanent.endpointFor=endpointFor;w.send=send;}
});
