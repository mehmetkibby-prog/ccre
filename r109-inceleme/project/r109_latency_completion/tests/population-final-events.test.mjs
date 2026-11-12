import test from 'node:test';import assert from 'node:assert/strict';
import {observePopulationFinalEvent,recordPopulationPending} from './population-final-events.mjs';
const fixture=()=>({id:'a',observedAttackIntents:new Set(['intent']),pendingKills:new Map(),claims:[]});
const input={intentId:'intent'},body={hits:[{id:'m',spawnRound:7,killPending:true}]};
const event=(patch={})=>({type:'monster_result',attackerId:'a',intentId:'intent',hits:[{id:'m',spawnRound:7,killed:true,hp:0}],...patch});
for(const early of [true,false])test('durable event '+(early?'before':'after')+' 202 settles exactly once',()=>{
 const a=fixture();if(early)observePopulationFinalEvent(a,event());recordPopulationPending(a,input,body);if(!early)observePopulationFinalEvent(a,event());observePopulationFinalEvent(a,event());assert.equal(a.pendingKills.size,0);assert.deepEqual(a.claims,[{id:'m',spawnRound:7}]);assert.equal(a.provisionalOutcomes.length,1);
});
for(const e of [event({type:'monster_reject',hits:[]}),event({hits:[{id:'m',spawnRound:7,killed:false,hp:100}]})])test('native '+e.type+' surviving/rejected outcome is never called a kill',()=>{
 const a=fixture();recordPopulationPending(a,input,body);observePopulationFinalEvent(a,e);assert.equal(a.pendingKills.size,0);assert.equal(a.claims.length,0);assert.equal(a.provisionalOutcomes[0].killed,false);
});
test('unmatched or missing terminal event cannot make the test pass',()=>{
 const a=fixture();recordPopulationPending(a,input,body);for(const e of [event({attackerId:'other'}),event({intentId:'other'}),event({type:'movement'})])observePopulationFinalEvent(a,e);assert.equal(a.pendingKills.size,1);assert.equal(a.claims.length,0);
});
