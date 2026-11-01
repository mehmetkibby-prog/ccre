import test from 'node:test';
import assert from 'node:assert/strict';
import {RealmSecurityQueue} from '../realm-security-queue.mjs';
import {until} from './helpers.mjs';
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
function fixture(){const core={tail:Promise.resolve(),serial(operation){const next=this.tail.then(()=>queue.inCoordinator(operation));this.tail=next.catch(()=>{});return next;}},queue=new RealmSecurityQueue(core),gate={pending:new Map()};return {core,queue,gate};}

for(const before of [false,true])test('exact native security job executes once when its batch queues '+(before?'before':'after')+' coordinator auth waits',async()=>{
 const {core,queue,gate}=fixture(),network=deferred(),entered=deferred(),allowAuth=deferred();let calls=0,job;
 // Native refresh creates its one pending promise before the network resolves.
 const refresh=(async()=>{await network.promise;return queue.run(gate,'account',()=>{calls++;return 'durable';});})();gate.pending.set('account',refresh);
 const request=core.serial(async()=>{entered.resolve();await allowAuth.promise;return queue.authorize(gate,'account',()=>refresh.then(x=>x==='durable'));});await entered.promise;
 if(before){network.resolve();await new Promise(r=>setImmediate(r));allowAuth.resolve();}else{allowAuth.resolve();await new Promise(r=>setImmediate(r));network.resolve();}
 assert.equal(await request,true);assert.equal(await refresh,'durable');await core.tail;assert.equal(calls,1);
});

test('unrelated security jobs and fast-path background refresh cannot escape the active cold operation',async()=>{
 const {core,queue,gate}=fixture(),network=deferred(),entered=deferred(),release=deferred();let calls=0,refresh;
 const request=core.serial(async()=>{refresh=(async()=>{await network.promise;return queue.run(gate,'other',()=>{calls++;return 'durable';});})();gate.pending.set('other',refresh);assert.equal(queue.authorize(gate,'account',()=>true),true);entered.resolve();await release.promise;});await entered.promise;network.resolve();await new Promise(r=>setImmediate(r));assert.equal(calls,0);release.resolve();await request;assert.equal(await refresh,'durable');assert.equal(calls,1);
});

test('promoted failure rejects original auth and queued slot without replay or blocking subsequent work',async()=>{
 const {core,queue,gate}=fixture(),network=deferred(),entered=deferred(),allowAuth=deferred(),error=Error('unknown security commit');let calls=0;
 const refresh=(async()=>{await network.promise;return queue.run(gate,'account',()=>{calls++;throw error;});})();void refresh.catch(()=>{});gate.pending.set('account',refresh);
 const request=core.serial(async()=>{entered.resolve();await allowAuth.promise;return queue.authorize(gate,'account',()=>refresh);});void request.catch(()=>{});await entered.promise;network.resolve();await new Promise(r=>setImmediate(r));allowAuth.resolve();await assert.rejects(request,e=>e===error);await assert.rejects(refresh,e=>e===error);await core.tail;assert.equal(calls,1);assert.equal(await core.serial(()=>123),123);
});

test('expired auth context does not lend a later unrelated coordinator scope',async()=>{
 const {core,queue,gate}=fixture(),network=deferred(),release=deferred(),entered=deferred();let refresh,calls=0;
 await core.serial(()=>{refresh=(async()=>{await network.promise;return queue.run(gate,'account',()=>++calls);})();gate.pending.set('account',refresh);assert.equal(queue.authorize(gate,'account',()=>true),true);});
 const later=core.serial(async()=>{entered.resolve();await release.promise;});await entered.promise;network.resolve();await new Promise(r=>setImmediate(r));assert.equal(calls,0);release.resolve();await later;assert.equal(await refresh,1);assert.equal(calls,1);
});
