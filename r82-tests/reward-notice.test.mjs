import test from 'node:test';
import assert from 'node:assert/strict';
import * as prior from '../r81-work/core511-source/scripts/core511/reward-reply-r54.mjs';
import * as current from '../r82-work/core511-source/scripts/core511/reward-reply-r54.mjs';

const make=(overrides={})=>({id:'m1',spawn_round:1,hp:10,area:'forest',channel:1,is_boss:0,is_stone:0,...overrides});
const context={player:{area:'forest',channel:1,world_cycle:1},payload:{intentId:'attack:1'}};
const plans=[{target:{id:'m1',spawn_round:1},rolled:20}],accepted={reserved_until:1200};

test('provisional lethal reply removes only the stale generic notice and preserves every authoritative field',()=>{
 for(const area of ['forest','frozen','ancient']){
  const ctx={...context,player:{...context.player,area}},read=()=>make({area}),old=prior.previewDeathR54(plans,read,ctx,accepted,1000),next=current.previewDeathR54(plans,read,ctx,accepted,1000);
  assert.equal(typeof old.body.message,'string');delete old.body.message;assert.deepEqual(next,old);assert.equal(Object.hasOwn(next.body,'message'),false);assert.equal(next.status,202);assert.equal(next.body.combatPending,true);assert.equal(next.body.hits[0].hp,10);assert.equal(next.body.hits[0].killed,false);assert.equal(next.body.provisionalHits[0].hp,0);assert.equal(next.body.xp,0);
 }
});

test('notice change preserves preview eligibility and held-resource authorization',()=>{
 for(const overrides of [{is_boss:1},{is_stone:1},{hp:0},{spawn_round:2},{channel:2},{hp:100}])assert.equal(current.previewDeathR54(plans,()=>make(overrides),context,accepted,1000),prior.previewDeathR54(plans,()=>make(overrides),context,accepted,1000));
 const reply=current.previewDeathR54(plans,()=>make(),context,accepted,1000);assert.equal(current.acceptDeathPreviewR54(reply,{state:'held',keys:[]}),null);assert.equal(current.isDeathPreviewR54(reply),false);assert.equal(current.acceptDeathPreviewR54(reply,{state:'held',keys:['monster:m1']}),reply);assert.equal(current.isDeathPreviewR54(reply),true);
 const published=[];current.rejectDeathPreviewR54({publish:(...args)=>published.push(args)},reply,'actor-1',{targetId:'m1',spawnRound:1},1100);assert.equal(published[0][3].type,'monster_reject');assert.equal(published[0][3].intentId,'attack:1');
});
