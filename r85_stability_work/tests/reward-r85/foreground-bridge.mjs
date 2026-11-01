import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {fixture,input,boss} from './foreground-fixture.mjs';
import {SharedCombatBridge} from '../../working/core511-source/scripts/core511/shared-combat-bridge.mjs';

function setup(t,{offline=[],passive=[],onHold=()=>{}}={}){
 const {sql}=fixture(t),messages=[],admissions=new Map(),simulations=new Map();
 const c={database:{sqlite:sql},writer:{owners:new Map(),playerWrites:{active:false}},processes:new Map(),sessions:new Map(),permanent:{entries:new Map()},transitions:new Map(),transferGroups:new Set(),actorIsolation:{entries:new Map(),unknownActors:new Map()},reader:{query:async()=>({rows:{world:{cycle:1},monsters:[]}})}};
 c.authority={owner:id=>c.writer.owners.get(id),admission:id=>admissions.get(id),simulation:id=>simulations.get(id)};
 for(let channel=1;channel<=4;channel++){
  const peer={channel,incarnation:'channel-'+channel,realm:'test'};
  for(const p of sql.prepare('SELECT id FROM players WHERE channel=?').all(channel)){
   const owner={player_id:p.id,channel,epoch:1,sequence:0,incarnation:peer.incarnation,state:'active'};c.writer.owners.set(p.id,owner);
   if(!offline.includes(p.id))(passive.includes(p.id)?simulations:admissions).set(p.id,{player_id:p.id,channel,epoch:1});
  }
  c.processes.set(channel,{peer,online:true,control:{async request(method,payload){
   messages.push({channel,method,payload});
   if(method==='shared_hold'){
    onHold(channel,sql);
    const actors=[...c.writer.owners].filter(([id,o])=>o.channel===channel&&(admissions.has(id)||simulations.has(id))&&!payload.except.some(a=>a.id===id)&&(!payload.only||payload.only.some(a=>a.id===id))).map(([id,o])=>({id,epoch:o.epoch,sequence:o.sequence}));
    return {token:payload.token,channel,incarnation:peer.incarnation,actors};
   }
   if(method==='shared_abort')return {token:payload.token,channel,incarnation:peer.incarnation,aborted:true};
   if(method==='shared_release')return {token:payload.token,released:true};
   throw Error(method);
  }}});
 }
 const worldMessages=[],world={core:c,global:{newSharedInput:async()=>{},recover:error=>{throw error;}},row:{state:'running',exited:false,peer:{channel:0,incarnation:'world'},owner:{epoch:1},control:{async request(method,payload){
  worldMessages.push({method,payload});if(method==='shared_acquire')return {proof:'signed-test-proof'};return {ok:true};
 }}}};
 const bridge=new SharedCombatBridge(world),peer=c.processes.get(1).peer;
 async function prepare(claim=input()){
  const request={id:randomUUID(),actor:'p1',epoch:1};const grant=await bridge.acquire(peer,request);request.proof=grant.proof;
  const answer=await bridge.prepare(peer,{...request,players:['p1'],...(claim?{foregroundClaimR85:claim}:{})});
  const payload={input:claim,sharedLease:grant.proof,resources:['player:p1',...(answer.players??[]).map(id=>'player:'+id)]};
  return {answer,request,payload};
 }
 return {sql,c,bridge,peer,messages,worldMessages,admissions,simulations,prepare};
}

test('real bridge with ten owners holds one foreign recipient, leaving eight bystanders unheld',async t=>{
 const s=setup(t);boss(s.sql,['p1','p4']);const {answer}=await s.prepare();
 assert(answer.prepared);assert.deepEqual(answer.players,['p4']);
 assert.deepEqual(s.bridge.terminal.channels.flatMap(x=>x.answer.actors.map(a=>a.id)),['p4']);
 assert(s.messages.filter(m=>m.method==='shared_hold').every(m=>Array.isArray(m.payload.only)));
 assert.equal(s.bridge.terminal.phase,'frozen');
});
test('non-claim/mixed actions preserve the original all-nine-bystander hold',async t=>{
 for(const claim of [null,{action:'claim_rewards',rewardTargets:[{id:'ordinary',spawnRound:7}]}]){
  const s=setup(t);boss(s.sql);const {answer}=await s.prepare(claim);assert.equal(answer.players.length,9);assert(s.messages.every(m=>m.payload.only===undefined));
 }
});
test('offline rewards still enter resources; passive dungeon owners and their room peers stay held',async t=>{
 const s=setup(t,{offline:['p7'],passive:['p4','p8']});boss(s.sql,['p1','p4']);
 s.sql.exec("INSERT INTO party_members VALUES('p4','party'),('p7','party');INSERT INTO dungeon_members VALUES('p4','room'),('p8','room')");
 const {answer,payload}=await s.prepare();assert.deepEqual(answer.players,['p4','p7','p8']);
 assert.deepEqual(s.bridge.terminal.channels.flatMap(x=>x.answer.actors.map(a=>a.id)),['p4','p8']);
 s.bridge.guard(s.peer,{playerId:'p1',operation:'native_action',payload});
 assert(payload.resources.includes('player:p7'));
});
test('party membership changing during drain aborts before command and resumes every started hold',async t=>{
 let changed=false;
 const s=setup(t,{onHold:(_channel,sql)=>{if(!changed){changed=true;sql.exec("INSERT INTO party_members VALUES('p4','new'),('p8','new')");}}});
 boss(s.sql,['p1','p4']);const {answer}=await s.prepare();assert.deepEqual(answer,{prepared:false,rejected:true});
 assert.equal(s.bridge.terminal,null);assert.equal(s.messages.filter(m=>m.method==='shared_abort').length,4);
 assert.equal(s.worldMessages.at(-1).method,'shared_finish');
});
test('pre-SQL guard binds input, actor resources and reset cycle, including extra offline writes',async t=>{
 const s=setup(t);boss(s.sql,['p1','p4']);const {payload}=await s.prepare();
 const request={playerId:'p1',operation:'native_action',payload};s.bridge.guard(s.peer,request);
 for(const altered of [{...request,operation:'attack'},{...request,payload:{...payload,input:input('dunya-bosu-1',8)}},{...request,payload:{...payload,resources:[...payload.resources,'player:p7']}}])assert.throws(()=>s.bridge.guard(s.peer,altered),{code:'shared_terminal_actor_fenced'});
 s.sql.exec('UPDATE world_state SET cycle=2');assert.throws(()=>s.bridge.guard(s.peer,request),{code:'shared_terminal_actor_fenced'});
});
test('foreign epoch drift remains fenced; native boss deletion is allowed only inside validated write scope',async t=>{
 const s=setup(t);boss(s.sql,['p1','p4']);const {payload}=await s.prepare();
 s.bridge.guard(s.peer,{playerId:'p1',operation:'native_action',payload});
 s.sql.exec('DELETE FROM boss_participants');s.c.writer.playerWrites.active=true;
 assert(s.bridge.guard(s.peer,{playerId:'p1',operation:'native_action',payload}));
 s.c.writer.owners.get('p4').epoch++;
 assert.throws(()=>s.bridge.assertWrite(s.sql,payload,{peer:s.peer,actor:'p1',epoch:1}),{code:'shared_terminal_actor_changed'});
});
