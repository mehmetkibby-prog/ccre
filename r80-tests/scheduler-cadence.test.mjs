import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulerFixture,fastScoped,deferred,START_MS} from './helpers/scheduler-fixture.mjs';

const ordinary=['writer.world_upkeep','request.guild_war_due','request.world_player_jobs','request.dungeon_lifecycle_due'];

test('ordinary one-second maintenance is unchanged without a reward backlog',async t=>{
 const h=schedulerFixture(t);
 await h.ticks(5000);
 for(const name of [...ordinary,'request.heartbeat_due'])assert.deepEqual(h.times(name),[0,1000,2000,3000,4000],name);
 assert.equal(h.count('request.world_cleanup'),1);
 assert.equal(h.count('writer.world_transition'),0);
});

for(const [name,result,rewardCalls]of [
 ['50 ms scoped reward retries',{scopedRewardR79:true,retryAfterMs:50},200],
 ['50 ms normal reward recovery',{recoveryOnlyR62:true,retryAfterMs:50},200],
 ['250 ms deferred normal recovery',{recoveryOnlyR62:true,retryAfterMs:250},40],
 ['1000 ms deferred scoped rewards',{scopedRewardR79:true,retryAfterMs:1000},10],
])test(name+' preserve reward progress without multiplying ordinary maintenance',async t=>{
 const h=schedulerFixture(t,{heartbeat:()=>({...result})});
 await h.ticks(10000);
 for(const kind of ordinary)assert.equal(h.count(kind),10,kind);
 assert.equal(h.count('request.heartbeat_due'),rewardCalls);
 assert.equal(h.count('request.world_cleanup'),1);
 assert.equal(h.count('writer.world_transition'),0);
 assert.equal(h.jobs.blocked,false);
 assert.equal(new Set(h.named('writer.world_upkeep').map(row=>row.payload.key)).size,10);
});

test('a deferred reward at 50 ms cannot postpone maintenance due at 1000 ms',async t=>{
 const h=schedulerFixture(t,{heartbeat:()=>({scopedRewardR79:true,retryAfterMs:h.offset===0?50:1000})});
 await h.tick(0);await h.tick(50);
 assert.equal(h.jobs.nextAt,START_MS+1000);
 await h.tick(999);assert.equal(h.count('writer.world_upkeep'),1);
 await h.tick(1000);assert.equal(h.count('writer.world_upkeep'),2);
 assert.deepEqual(h.times('request.heartbeat_due'),[0,50,1000]);
});

test('slow work does not replay missed maintenance intervals in a burst',async t=>{
 let first=true;
 const h=schedulerFixture(t,{heartbeat:fastScoped,upkeep:fixture=>{if(first){first=false;fixture.setOffset(2500);}}});
 await h.tick(0);
 await h.tick(2500);
 await h.tick(2550);
 assert.deepEqual(h.times('writer.world_upkeep'),[0,2500]);
 assert.equal(h.count('request.heartbeat_due'),3);
 assert.equal(h.jobs.nextMaintenanceAt,START_MS+3500);
});

test('a backward clock jump does not duplicate work or create a catch-up burst',async t=>{
 const h=schedulerFixture(t,{heartbeat:fastScoped});
 await h.tick(0);await h.tick(-2000);await h.tick(-50);await h.tick(0);
 assert.equal(h.count('writer.world_upkeep'),1);assert.equal(h.count('request.heartbeat_due'),1);
 await h.tick(50);await h.tick(1000);
 assert.deepEqual(h.times('writer.world_upkeep'),[0,1000]);
 assert.deepEqual(h.times('request.heartbeat_due'),[0,50,1000]);
});

test('pending reward I/O prevents overlapping scheduler work',async t=>{
 const gate=deferred();let first=true;
 const h=schedulerFixture(t,{heartbeat:()=>{if(first){first=false;return gate.promise;}return fastScoped();}});
 const pending=h.begin(0);
 await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.count('request.heartbeat_due'),1);
 assert.equal(h.begin(50),pending);
 assert.equal(h.count('writer.world_upkeep'),1);
 gate.resolve(fastScoped());await pending;
 await h.tick(100);
 assert.equal(h.count('request.heartbeat_due'),2);
 assert.equal(h.count('writer.world_upkeep'),1);
});

test('drain waits for accepted reward work and prevents new ticks',async t=>{
 const gate=deferred();
 const h=schedulerFixture(t,{heartbeat:()=>gate.promise});
 const pending=h.begin(0);
 await new Promise(resolve=>setImmediate(resolve));
 let drained=false;const drain=h.jobs.drain().then(()=>{drained=true;});
 await Promise.resolve();assert.equal(drained,false);
 h.begin(50);assert.equal(h.count('writer.world_upkeep'),1);
 gate.resolve(fastScoped());await pending;await drain;
 assert.equal(drained,true);
 await h.tick(1000);assert.equal(h.count('writer.world_upkeep'),1);
});

test('cleanup keeps its own 30-second boundary during fast rewards',async t=>{
 const h=schedulerFixture(t,{heartbeat:fastScoped});
 await h.ticks(30050);
 assert.deepEqual(h.times('request.world_cleanup'),[0,30000]);
});

test('deferred cleanup retries once per second during fast rewards',async t=>{
 const h=schedulerFixture(t,{heartbeat:fastScoped,cleanupDeferred:true});
 await h.ticks(3050);
 assert.deepEqual(h.times('request.world_cleanup'),[0,1000,2000,3000]);
});

test('upkeep failure stops the run before reward work and preserves failure state',async t=>{
 const error=Object.assign(Error('upkeep_failed'),{code:'upkeep_failed'});
 const h=schedulerFixture(t,{heartbeat:fastScoped,upkeep:()=>{throw error;}});
 await assert.rejects(h.tick(0),value=>value===error);
 assert.equal(h.count('request.heartbeat_due'),0);
 assert.equal(h.jobs.blocked,true);assert.equal(h.jobs.pending,null);
 assert.deepEqual(h.failures,[error]);
});

test('fast reward failure is not hidden by the maintenance cadence',async t=>{
 const error=Object.assign(Error('reward_failed'),{code:'reward_failed'});
 const h=schedulerFixture(t,{heartbeat:()=>{if(h.offset>0)throw error;return fastScoped();}});
 await h.tick(0);await assert.rejects(h.tick(50),value=>value===error);
 assert.equal(h.count('writer.world_upkeep'),1);
 assert.equal(h.jobs.blocked,true);assert.equal(h.jobs.pending,null);
 assert.deepEqual(h.failures,[error]);
});

for(const [result,code]of [
 [{scopedRewardR79:true,retryAfterMs:25},'scoped_reward_retry_bound'],
 [{recoveryOnlyR62:true,retryAfterMs:75},'reward_recovery_retry_bound'],
])test('invalid retry remains rejected: '+code,async t=>{
 const h=schedulerFixture(t,{heartbeat:()=>result});
 await assert.rejects(h.tick(0),error=>error.code===code);
 assert.equal(h.jobs.blocked,true);assert.equal(h.count('writer.world_transition'),0);
});
