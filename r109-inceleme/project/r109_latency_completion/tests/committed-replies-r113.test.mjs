import test from 'node:test';
import assert from 'node:assert/strict';
import {FixedLoop} from '../working/core511-source/scripts/core511/fixed-loop.mjs';
import {queueCommittedRepliesR113} from '../working/core511-source/scripts/core511/committed-replies-r113.mjs';
const turn=()=>new Promise(r=>setImmediate(r));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>(resolve=a,reject=b));return {promise,resolve,reject};};
function fixture(t){
 const owner={epoch:1,pending:0,state:'active'},sent=[],wire=deferred();
 const state={channel:1,owners:new Map([['p',owner]]),read:()=>null,assertOwner:()=>owner,quiesce:()=>{owner.state='quiesced';},changes:()=>[]};
 const k=new FixedLoop({state,commitRepliesR113:true,send:(id,p)=>{sent.push({id,...p});return wire.promise;},rules:{movement:()=>{},combat:()=>{},ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>results.length?{type:'frame',results,lastApplied}:null}});
 k.admit('p',1);k.stopped=false;t.after(()=>{wire.resolve();k.stop();});return {k,p:k.players.get('p'),owner,sent,wire};
}
test('R113 committed result is sent without another tick, never before COMMIT, and replays exactly once',async t=>{
 const f=fixture(t),commit=deferred();f.p.lastAccepted=1;f.p.deferred.push({type:'action',sequence:1});
 const task=f.k.durableGroup(['p'],()=>commit.promise,{replyTo:'p',emitReceipt:false,ackResult:ack=>({type:'action',status:200,body:ack})});
 await turn();assert.equal(f.sent.length,0);assert.equal(f.owner.pending,1);assert.equal(f.k.metrics.ticks,0);
 commit.resolve({killed:true,xp:7});await task;await turn();assert.equal(f.sent.length,1);assert.equal(f.k.metrics.ticks,0);
 assert.deepEqual(f.sent[0].results,[{type:'action',sequence:1,status:200,body:{killed:true,xp:7}}]);
 assert.deepEqual(f.k.replayResults('p'),f.sent[0].results);assert.equal(f.p.results.length,0);
 let released=false;const drained=f.k.quiesce('p',1).then(()=>released=true);await turn();assert.equal(released,false);
 f.wire.resolve();await drained;assert.equal(released,true);assert.equal(f.sent.length,1);
});
test('R113 unknown COMMIT cannot emit a result or clear its owner barrier',async t=>{
 const f=fixture(t),commit=deferred();f.p.deferred.push({type:'action',sequence:1});
 const p=f.k.durable('p',()=>commit.promise);commit.reject(Error('commit_unknown'));await assert.rejects(p,/commit_unknown/);await turn();
 assert.equal(f.sent.length,0);assert(f.k.failure);assert(f.p.barrier);assert.equal(f.owner.pending,1);
});
test('R113 publication waits out a logical tick and never leaks private durable receipts',async t=>{
 const f=fixture(t);f.p.results.push({type:'action',sequence:1,status:200,body:{ok:true}},{type:'durable',value:{private:'not a public action'}});f.p.lastApplied=1;
 f.k.running=true;queueCommittedRepliesR113(f.k);await turn();assert.equal(f.sent.length,0);assert(f.k.commitReplyDeferredR113);
 f.k.running=false;queueCommittedRepliesR113(f.k);await turn();assert.equal(f.sent.length,1);assert.equal(f.sent[0].results.length,1);assert.equal(f.p.results[0].type,'durable');
 f.wire.resolve();queueCommittedRepliesR113(f.k);await turn();assert.equal(f.sent.length,1);
});
test('a later pending command cannot hold an earlier already committed reply',async t=>{
 const f=fixture(t),first=deferred(),second=deferred();f.p.deferred.push({type:'action',sequence:1,status:200,body:{ok:true}});
 const a=f.k.durableGroup(['p'],()=>first.promise,{emitReceipt:false});first.resolve();await a;
 f.p.deferred.push({type:'action',sequence:2,status:200,body:{ok:true}});const b=f.k.durableGroup(['p'],()=>second.promise,{emitReceipt:false});
 await turn();assert.equal(f.sent.length,1);assert.equal(f.sent[0].results[0].sequence,1);assert.equal(f.p.barrier,second.promise);
 second.resolve();await b;await turn();assert.equal(f.sent.length,2);assert.equal(f.sent[1].results[0].sequence,2);f.wire.resolve();
});
