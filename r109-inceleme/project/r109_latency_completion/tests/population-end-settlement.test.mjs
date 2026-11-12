import test from 'node:test';
import assert from 'node:assert/strict';
import {settlePopulationEnd} from './population-end-settlement.mjs';
const actor=()=>({n:6,id:'synthetic-six',busy:false,claims:[],pendingKills:new Map([
 ['first:7',{id:'first',spawnRound:7}],['second:9',{id:'second',spawnRound:9}]
]),client:{ready:true,queue:[],active:null,movementBehind:null,world:{monsters:[{id:'first',spawn_round:7,hp:10},{id:'second',spawn_round:9,hp:10}]}}});

test('two provisional kills settle on late world updates and native claim ACK, without new combat',async()=>{
 const a=actor(),calls=[],counts={pendingKills:63,settledKills:61};
 a.client.active={sequence:41};
 const ack=setTimeout(()=>{a.client.active=null;},10);
 const update=setTimeout(()=>{a.client.world={monsters:[{id:'first',spawn_round:7,hp:0},{id:'second',spawn_round:10,hp:10}]};},25);
 try{
  const proof=await settlePopulationEnd([a],async(owner,input)=>{
   assert.equal(owner,a);assert.equal(input.action,'claim_rewards');assert.equal(a.pendingKills.size,0);
   assert.equal(a.claims.length,2,'claim targets remain until ACK');calls.push(input);
   a.client.active={sequence:42};await new Promise(r=>setTimeout(r,10));a.client.active=null;
   return {ok:true};
  },{timeoutMs:500,pollMs:5});
  assert.equal(proof.passed,true);assert.equal(proof.completed,true);assert.equal(proof.before[0].pendingTargets.length,2);
  assert.equal(proof.after[0].pendingTargets.length,0);assert.equal(proof.after[0].claimTargets.length,0);
  assert.equal(proof.after[0].active,0);assert.equal(calls.length,1);
  assert.deepEqual(calls[0].rewardTargets,[{id:'first',spawnRound:7},{id:'second',spawnRound:9}]);
  assert.equal(proof.claims[0].acknowledged,true);assert.equal(proof.reconciledTargets.length,2);
  assert.deepEqual(counts,{pendingKills:63,settledKills:61},'60-second counters are not rewritten by tail settlement');
 }finally{clearTimeout(ack);clearTimeout(update);}
});

test('never-settling provisional kills time out with exact IDs and remain failed',async()=>{
 const a=actor();let calls=0;
 await assert.rejects(settlePopulationEnd([a],async()=>{calls++;},{timeoutMs:35,pollMs:5}),error=>{
  assert.equal(error.message,'population_end_settlement_timeout');assert.equal(error.endSettlement.passed,false);assert.equal(error.endSettlement.completed,false);
  assert.deepEqual(error.endSettlement.after[0].pendingTargets,[{id:'first',spawnRound:7},{id:'second',spawnRound:9}]);
  assert.equal(error.endSettlement.claims.length,0);return true;
 });
 assert.equal(calls,0);assert.equal(a.pendingKills.size,2);
});
