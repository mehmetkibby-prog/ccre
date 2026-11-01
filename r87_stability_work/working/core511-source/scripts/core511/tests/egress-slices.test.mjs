import test from 'node:test';
import assert from 'node:assert/strict';
import {EgressSlices} from '../egress-slices.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {ResidentState} from '../resident-state.mjs';
import {player} from './helpers.mjs';
test('startup25 frames yield in FIFO slices with identical bytes, socket binding and bounded backpressure',async()=>{
 const tasks=[],seen=[],socket={readyState:1,bufferedAmount:0,send:text=>seen.push(text),close:()=>seen.push('closed')},q=new EgressSlices({schedule:fn=>tasks.push(fn),clock:()=>0}),pending=[];
 for(let i=0;i<25;i++)pending.push(q.push(socket,JSON.stringify({i})));
 assert.equal(tasks.length,1);tasks.shift()();assert.equal(seen.length,8);tasks.shift()();assert.equal(seen.length,16);tasks.shift()();assert.equal(seen.length,24);tasks.shift()();assert.equal(seen.length,25);await Promise.all(pending);assert.deepEqual(seen,Array.from({length:25},(_,i)=>JSON.stringify({i})));
 const old=q.push(socket,'old');socket.readyState=3;tasks.shift()();assert.equal(await old,false);assert(!seen.includes('old'));
 socket.readyState=1;const big=q.push(socket,'x'.repeat(1048577));assert.equal(q.push(socket,'next'),null);tasks.shift()();await big;assert(seen.includes('closed'));
});
test('logical tick includes all send wait and cannot release ownership before output drain',async()=>{
 let now=0,flush;const state=new ResidentState(1);state.put('players',player());state.claim('p',1);
 const kernel=new FixedLoop({state,clock:()=>now,wall:()=>1000,send:()=>new Promise(resolve=>flush=resolve),rules:{movement:()=>({ok:true}),combat:()=>({ok:true}),ai:()=>{},respawn:()=>{},project:({results})=>({results})}});kernel.admit('p',1);kernel.stopped=false;
 kernel.enqueue('p',{sequence:1,epoch:1,kind:'combat',payload:{}});const tick=kernel.tick(),quiet=kernel.quiesce('p',1);assert.equal(kernel.players.get('p').suspended,false);assert.equal(kernel.metrics.samples.length,0);assert.throws(()=>kernel.tick(),/overlapping_tick/);
 now=151;flush(true);await tick;await quiet;assert.equal(kernel.metrics.samples[0],151);assert.equal(kernel.snapshot().tickP99Ms,151);assert.equal(kernel.players.get('p').suspended,true);assert.equal(kernel.metrics.ticks,1);
});
