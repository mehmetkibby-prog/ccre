import test from 'node:test';
import assert from 'node:assert/strict';
import {offerPopulationAttackR113} from './population-arrivals-r113.mjs';
test('fixed offered traffic keeps counting backlog while replies stall and never exceeds the two-input window',async()=>{
 let pending=0,measuring=true;const releases=[];
 const a={n:1,id:'p',zone:'forest',claims:[],attacks:0,client:{ready:true,queue:[],world:{players:[{id:'p',hp:100,x:0,y:0}],monsters:[{id:'m',spawn_round:1,hp:100,x:1,y:1}]},pendingInputs:()=>Array.from({length:pending})}};
 const send=()=>{pending++;return new Promise(resolve=>releases.push(()=>{pending--;resolve({hits:[]});}));};
 const offer=now=>offerPopulationAttackR113(a,{now,measuring,isMeasuring:()=>measuring,send,count:()=>{},onError:e=>{throw e;}});
 for(let n=0;n<10;n++)offer(1000+n*950);
 assert.equal(a.arrivalsR113.offered,10);assert.equal(a.arrivalsR113.dispatched,2);assert.equal(a.arrivalsR113.backpressured,8);assert.equal(a.arrivalsR113.completed,0);assert.equal(pending,2);
 releases.shift()();await new Promise(r=>setImmediate(r));assert.equal(a.arrivalsR113.completed,1);
 offer(1000+10*950);assert.equal(a.arrivalsR113.dispatched,3);assert.equal(pending,2);
 measuring=false;for(const release of releases)release();await Promise.all(a.openTasksR113);assert.equal(a.arrivalsR113.drained,2);
});
