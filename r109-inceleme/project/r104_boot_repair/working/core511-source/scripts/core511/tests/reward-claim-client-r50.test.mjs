import test from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {createRewardClaimBatcherR50,CLAIM_MAX_TARGETS_R50,claimRewardsR50} from '../reward-claim-client-r50.mjs';
import {NativeHttpBindings} from '../native-http-bindings.mjs';
const input=(n=25)=>({action:'claim_rewards',rewardTargets:Array.from({length:n},(_,i)=>({id:'monster-'+i,spawnRound:1}))});
const tick=()=>new Promise(resolve=>setImmediate(resolve));
function fakeClock(){let at=0,seq=0;const timers=new Map();return {clock:()=>at,setTimer:(fn,ms)=>{const id=++seq;timers.set(id,{at:at+ms,fn});return id;},clearTimer:id=>timers.delete(id),advance(ms){at+=ms;for(const [id,timer]of [...timers])if(timer.at<=at){timers.delete(id);timer.fn();}},timers};}
const good=body=>({status:200,body:{ok:true,...body}});

test('red legacy 1500-target message exceeds ingress and native prefix truncates; green chunks cover every target under 32 KiB',async()=>{
 const payload=input(1500);for(const row of payload.rewardTargets)row.id=('a'.repeat(45)+row.id).slice(0,64);
 assert(Buffer.byteLength(JSON.stringify({type:'input',sequence:1,payload}))>32768);
 assert.equal(payload.rewardTargets.slice(0,10).length,10);
 const sent=[],batcher=createRewardClaimBatcherR50({scope:()=>1,send:async row=>{sent.push(row);assert(row.rewardTargets.length<=10);assert(Buffer.byteLength(JSON.stringify({type:'input',sequence:1,payload:row}))<32768);return good({processed:row.rewardTargets.length,drops:[{id:'same'},{id:row.rewardTargets[0].id}],communityProgress:sent.length});}});
 const answer=await batcher.submit(payload);assert.equal(sent.length,150);assert.deepEqual(sent.flatMap(row=>row.rewardTargets),payload.rewardTargets);assert.equal(answer.body.processed,1500);assert.equal(answer.body.drops.length,151);assert.equal(answer.body.communityProgress,150);assert.equal(batcher.snapshot().jobs,0);
});
test('8192 targets are fully processed; 8193 is rejected before send without truncation',async()=>{
 let count=0;const batcher=createRewardClaimBatcherR50({scope:()=>1,send:async row=>{count+=row.rewardTargets.length;return good({processed:row.rewardTargets.length});}});
 assert.equal((await batcher.submit(input(CLAIM_MAX_TARGETS_R50))).body.processed,8192);assert.equal(count,8192);await assert.rejects(batcher.submit(input(8193)),{code:'claim_batch_target_limit'});assert.equal(count,8192);
});
test('duplicate targets deduplicate within one job; repeated event jobs stay native idempotent requests',async()=>{
 const seen=[],batcher=createRewardClaimBatcherR50({scope:()=>1,send:async row=>{seen.push(row);return good({processed:row.rewardTargets.length});}}),payload=input(12);payload.rewardTargets.push(payload.rewardTargets[0]);
 const [a,b]=await Promise.all([batcher.submit(payload),batcher.submit(payload)]);assert.equal(a.body.processed,12);assert.equal(b.body.processed,12);assert.deepEqual(seen.map(row=>row.rewardTargets.length),[10,2,10,2]);
});
test('explicit 429 retains exactly the current chunk, respects Retry-After seconds, then continues tail',async()=>{
 const time=fakeClock(),seen=[],batcher=createRewardClaimBatcherR50({...time,scope:()=>1,send:async row=>{seen.push(row);return seen.length===1?{status:429,body:{code:'rate_limited'},headers:{'retry-after':'2'}}:good({processed:row.rewardTargets.length});}});
 const result=batcher.submit(input(25));await tick();time.advance(1999);await tick();assert.equal(seen.length,1);time.advance(1);const answer=await result;assert.equal(answer.body.processed,25);assert.deepEqual(seen[0],seen[1]);assert.deepEqual(seen.slice(1).flatMap(row=>row.rewardTargets),input(25).rewardTargets);assert.equal(time.timers.size,0);
});
test('explicit native rejection after one completed chunk is partial, never whole-job not_executed',async()=>{
 let count=0;const batcher=createRewardClaimBatcherR50({scope:()=>1,send:async()=>++count===1?good({processed:10}):{status:409,body:{code:'actor_fenced',not_executed:true}}});
 await assert.rejects(batcher.submit(input(25)),error=>{assert.equal(error.code,'actor_fenced');assert.equal(error.body.completedTargets,10);assert.equal(error.body.pendingTargets,15);assert.equal(error.body.partial,true);assert.equal(error.body.not_executed,undefined);assert.equal(error.body.outcomeUnknown,false);return true;});assert.equal(count,2);
});
test('unknown command outcome never gets retried or mislabeled not_executed',async()=>{
 let count=0;const batcher=createRewardClaimBatcherR50({scope:()=>1,send:async()=>{count++;throw Object.assign(Error('unknown'),{code:'command_outcome_unknown'});}});
 await assert.rejects(batcher.submit(input()),error=>{assert.equal(error.code,'command_outcome_unknown');assert.equal(error.body.inFlightTargets,10);assert.equal(error.body.outcomeUnknown,true);assert.equal(error.body.not_executed,undefined);return true;});assert.equal(count,1);
});
test('owner change cancels only unsent tail after current successful command',async()=>{
 let owner=1,count=0;const batcher=createRewardClaimBatcherR50({scope:()=>owner,send:async()=>{count++;owner=2;return good({processed:10});}});
 await assert.rejects(batcher.submit(input()),error=>{assert.equal(error.code,'claim_owner_changed');assert.equal(error.body.completedTargets,10);assert.equal(error.body.pendingTargets,15);return true;});assert.equal(count,1);
});
test('AbortSignal stops unsent work, accepted current command remains awaited without resend',async()=>{
 let complete,count=0;const controller=new AbortController(),batcher=createRewardClaimBatcherR50({scope:()=>1,send:()=>{count++;return new Promise(resolve=>{complete=resolve;});}}),result=batcher.submit(input(),{signal:controller.signal});const rejected=assert.rejects(result,error=>{assert.equal(error.code,'claim_batch_aborted');assert.equal(error.body.inFlightTargets,10);assert.equal(error.body.outcomeUnknown,true);return true;});controller.abort();await rejected;assert.equal(count,1);complete(good({processed:10}));await tick();assert.equal(count,1);assert.equal(batcher.snapshot().jobs,0);
});
test('deadline returns coded unknown status while inflight settles; it never retries accepted work',async()=>{
 const time=fakeClock();let complete,count=0;const batcher=createRewardClaimBatcherR50({...time,scope:()=>1,deadlineMs:100,send:()=>{count++;return new Promise(resolve=>{complete=resolve;});}}),result=batcher.submit(input());const rejected=assert.rejects(result,error=>{assert.equal(error.code,'claim_batch_deadline');assert.equal(error.body.inFlightTargets,10);assert.equal(error.body.outcomeUnknown,true);return true;});time.advance(100);await rejected;complete(good({processed:10}));await tick();assert.equal(count,1);assert.equal(time.timers.size,0);
});
test('owner cancellation drops queued jobs, releases retry timers and preserves current normal command',async()=>{
 const time=fakeClock();let complete,count=0;const batcher=createRewardClaimBatcherR50({...time,scope:()=>1,send:()=>{count++;return new Promise(resolve=>{complete=resolve;});}}),one=batcher.submit(input()),two=batcher.submit(input());const failures=[assert.rejects(one,{code:'claim_transport_disposed'}),assert.rejects(two,{code:'claim_transport_disposed'})];batcher.cancel('claim_transport_disposed');await Promise.all(failures);assert.equal(time.timers.size,0);assert.equal(count,1);complete(good({processed:10}));await tick();assert.equal(batcher.snapshot().jobs,0);
});
test('ACK aggregation has a hard bound and reports already completed work',async()=>{
 let count=0;const batcher=createRewardClaimBatcherR50({scope:()=>1,maxAckBytes:100,send:async()=>{count++;return good({processed:10,drops:[{id:'a',name:'x'.repeat(100)}]});}});
 await assert.rejects(batcher.submit(input()),error=>{assert.equal(error.code,'claim_batch_ack_limit');assert.equal(error.body.completedTargets,10);assert.equal(error.body.partial,true);assert.equal(error.body.not_executed,undefined);return true;});assert.equal(count,1);
});
test('pool capacity rejects excess work with not_executed and does not leak after cancellation',async()=>{
 let complete;const batcher=createRewardClaimBatcherR50({scope:()=>1,send:()=>new Promise(resolve=>{complete=resolve;})}),one=batcher.submit(input(8192)),two=batcher.submit(input(8192));const failures=[assert.rejects(one,{code:'claim_owner_changed'}),assert.rejects(two,{code:'claim_owner_changed'})];await assert.rejects(batcher.submit(input(11)),{code:'claim_batch_queue_full'});assert.equal(batcher.snapshot().pendingTargets,16384);batcher.cancel();await Promise.all(failures);complete(good({processed:10}));await tick();assert.equal(batcher.snapshot().pendingTargets,0);
});
test('actual transport flag zero preserves the original whole input/result; flag one partitions only large claims',()=>{
 const moduleURL=new URL('../client-transport.mjs',import.meta.url).href,helperURL=new URL('../reward-claim-client-r50.mjs',import.meta.url).href;
 for(const enabled of [false,true]){
  const script=`import assert from 'node:assert/strict'; import {Core511Transport} from ${JSON.stringify(moduleURL)}; import {claimTimeoutR50} from ${JSON.stringify(helperURL)}; globalThis.fetch=async()=>Response.json({claimBatchClient:${enabled}});const sent=[],c=new Core511Transport({fetch:globalThis.fetch,WebSocket:class{},origin:'https://fixture.invalid',headers:()=>({})});c.ready=true;c.playerId='p';c.epoch=1;c.command=async row=>{sent.push(row);return {status:200,body:{ok:true,processed:row.rewardTargets.length}}};const payload=${JSON.stringify(input(25))};const r=await c.request('/api/action',{method:'POST',body:JSON.stringify(payload)},()=>{throw Error('unexpected fallback')});assert.equal(r.status,200);assert.equal((await r.json()).processed,25);assert.deepEqual(sent.map(x=>x.rewardTargets.length),${enabled?'[10,10,5]':'[25]'});${enabled?'':'assert.deepEqual(sent[0],payload);'}assert.equal(await claimTimeoutR50(payload,8000),${enabled?180000:8000});sent.length=0;await c.request('/api/action',{method:'POST',body:JSON.stringify({...payload,rewardTargets:payload.rewardTargets.slice(0,10)})},()=>{});assert.deepEqual(sent.map(x=>x.rewardTargets.length),[10]);c.dispose();`;
  execFileSync(process.execPath,['--input-type=module','-e',script],{stdio:'pipe'});
 }
});
test('public claim options route is allowed on game realm, read-only, and rejects non-GET',async()=>{
 const binding=Object.create(NativeHttpBindings.prototype);binding.accepting=true;binding.pending=new Set();binding.core=()=>({realm:{role:'game'}});
 const response=await binding.route(new Request('https://fixture.invalid/api/core511-r50-claim-options'),()=>{throw Error('native must not run');});assert.equal(response.status,200);assert.equal(response.headers.get('cache-control'),'no-store');assert.equal(typeof(await response.json()).claimBatchClient,'boolean');
 assert.equal((await binding.route(new Request('https://fixture.invalid/api/core511-r50-claim-options',{method:'POST'}),()=>{})).status,405);
});
test('options fetch failure is coded not_executed, cached only on success, and never falls through to oversized input',()=>{
 const moduleURL=new URL('../client-transport.mjs',import.meta.url).href;
 const script=`import assert from 'node:assert/strict';import {Core511Transport} from ${JSON.stringify(moduleURL)};let fetches=0;globalThis.fetch=async()=>{if(++fetches===1)throw new DOMException('aborted','AbortError');return Response.json({claimBatchClient:true})};const sent=[],c=new Core511Transport({fetch:globalThis.fetch,WebSocket:class{},origin:'https://fixture.invalid',headers:()=>({})});c.ready=true;c.playerId='p';c.epoch=1;c.command=async row=>{sent.push(row);return {status:200,body:{processed:row.rewardTargets.length}}};const opts={method:'POST',body:JSON.stringify(${JSON.stringify(input(25))})};const failed=await c.request('/api/action',opts,()=>{});assert.equal(failed.status,503);const body=await failed.json();assert.equal(body.code,'claim_batch_options_unavailable');assert.equal(body.not_executed,true);assert.equal(sent.length,0);const retry=await c.request('/api/action',opts,()=>{});assert.equal(retry.status,200);assert.equal(sent.length,3);assert.equal(fetches,2);c.dispose();`;
 execFileSync(process.execPath,['--input-type=module','-e',script],{stdio:'pipe'});
});
test('wrapper preserves command scope guard and refuses a changed epoch during ensure',async()=>{
 let sent=0,guards=0;const transport={playerId:'p',epoch:1,assertCommandScope(){guards++;},async ensure(){this.epoch=2;},async command(){sent++;return good({});}};
 await assert.rejects(claimRewardsR50(transport,input()),error=>{assert.equal(error.code,'claim_owner_changed');assert.equal(error.body.not_executed,true);return true;});assert.equal(sent,0);assert.equal(guards,2);
});
