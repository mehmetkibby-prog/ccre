import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulerFixture} from './helpers/scheduler-fixture.mjs';

const {SharedWorldJobs:R79}=await import('../r79-audit/core511-source/scripts/core511/shared-world-jobs.mjs');
const operations=['writer.world_upkeep','request.guild_war_due','request.world_player_jobs','request.dungeon_lifecycle_due'];

for(const [name,result,retries]of [
 ['scoped reward 50 ms',{scopedRewardR79:true,retryAfterMs:50},200],
 ['normal recovery 250 ms',{recoveryOnlyR62:true,retryAfterMs:250},40],
])test('R79 versus R80 exact-module call counts: '+name,async t=>{
 const before=schedulerFixture(t,{heartbeat:()=>({...result})},R79);
 await before.ticks(10000);
 const after=schedulerFixture(t,{heartbeat:()=>({...result})});
 await after.ticks(10000);
 for(const name of operations){assert.equal(before.count(name),retries,name);assert.equal(after.count(name),10,name);}
 assert.equal(before.count('request.heartbeat_due'),retries);
 assert.equal(after.count('request.heartbeat_due'),retries);
 t.diagnostic(JSON.stringify({scenario:name,simulatedSeconds:10,source:'Direct imports of unchanged R79 and patched R80; mocked I/O, not CPU or latency.',R79:{ordinaryCalls:retries,rewardScans:retries},R80:{ordinaryCalls:10,rewardScans:retries}}));
});
