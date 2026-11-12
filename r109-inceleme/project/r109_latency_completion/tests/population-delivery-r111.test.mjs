import test from 'node:test';
import assert from 'node:assert/strict';
import {PopulationDelivery} from './population-delivery-r111.mjs';

test('pending visual reply cannot be counted as a committed death',()=>{
 const d=new PopulationDelivery(),input={action:'attack',intentId:'one',targetId:'mob'};
 d.sent(1,input,10);
 d.reply(1,input,{status:202,body:{combatPending:true,hits:[{hp:100,killed:false,killPending:true}]}},30);
 assert.equal(d.snapshot().deaths.count,0);
 d.event(1,{type:'monster_result',intentId:'one',hits:[{killed:true}]},210);
 assert.equal(d.snapshot().deaths.maxMs,200);
 assert.equal(d.snapshot().pending,0);
 d.event(1,{type:'monster_result',intentId:'one',hits:[{killed:true}]},250);
 assert.equal(d.snapshot().deaths.count,1);
});

test('terminal result before ACK and nonlethal/rejected replies stay distinct',()=>{
 const d=new PopulationDelivery();
 for(const actor of [1,2,3])d.sent(actor,{action:'attack',intentId:'shared'},0);
 d.event(1,{type:'monster_result',intentId:'shared',hits:[{killed:true}]},20);
 d.reply(1,{action:'attack',intentId:'shared'},{status:202},30);
 d.reply(2,{action:'attack',intentId:'shared'},{status:200,body:{hits:[{killed:false,hp:1}]}},40);
 d.event(3,{type:'monster_reject',intentId:'shared'},50);
 assert.equal(d.snapshot().deaths.count,1);
 assert.equal(d.snapshot().deaths.maxMs,20);
 assert.equal(d.snapshot().pending,0);
});


test('authoritative dead HP may precede a terminal kill, but wrong rounds and another player death do not count',()=>{
 const d=new PopulationDelivery(),input={action:'attack',intentId:'early',targetId:'boss',spawnRound:7};d.sent(1,input,10);d.sent(2,input,10);
 d.world(1,{monsters:[{id:'boss',spawn_round:6,hp:0}]},20);d.world(1,{monsters:[{id:'boss',spawn_round:7,hp:1}]},30);d.world(1,{monsters:[{id:'boss',spawn_round:7,hp:0}]},40);
 d.world(2,{monsters:[{id:'boss',spawn_round:7,hp:0}]},40);assert.equal(d.snapshot().visibleDeaths.count,0);
 d.reply(1,input,{status:200,body:{hits:[{killed:true}]}},110);d.reply(2,input,{status:200,body:{hits:[{killed:false}]}},120);
 assert.equal(d.snapshot().deaths.maxMs,100);assert.equal(d.snapshot().visibleDeaths.maxMs,30);assert.equal(d.snapshot().visibleDeaths.count,1);assert.equal(d.snapshot().worldBeforeReply,1);
});
