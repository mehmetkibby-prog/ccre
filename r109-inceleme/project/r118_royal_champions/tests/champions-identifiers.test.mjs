import test from 'node:test';
import assert from 'node:assert/strict';
import {CHAMPIONS_MOBS_R118,championsMonsterIdR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-config-r118.mjs';
import {createChampionsViewR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-client-r118.mjs';
import {normalizeClaimTargets} from '../../r109_latency_completion/working/core511-source/scripts/core511/claim-chunks.mjs';
import {createRewardClaimBatcherR50} from '../../r109_latency_completion/working/core511-source/scripts/core511/reward-claim-client-r50.mjs';

test('every real champion monster identity survives existing reward protocols and selects its own artwork',async()=>{
 const view=createChampionsViewR118(),targets=[];
 for(let channel=1;channel<=4;channel++)for(const species of CHAMPIONS_MOBS_R118)for(let slot=1;slot<=12;slot++){
  const id=championsMonsterIdR118(species.key,channel,slot);
  targets.push({id,spawnRound:17});
  assert.equal(view.key({id,area:'champions'}),species.key);
 }
 assert.equal(targets.length,192);
 assert.equal(new Set(targets.map(row=>row.id)).size,192);
 assert.deepEqual(normalizeClaimTargets(targets),targets);
 const received=[],batcher=createRewardClaimBatcherR50({scope:()=> 'one-owner',send:async payload=>{
  assert(payload.rewardTargets.length<=10);
  assert.deepEqual(normalizeClaimTargets(payload.rewardTargets),payload.rewardTargets);
  received.push(...payload.rewardTargets);
  return {status:200,body:{ok:true,processed:payload.rewardTargets.length,drops:[]}};
 }});
 const result=await batcher.submit({action:'claim_rewards',rewardTargets:targets});
 assert.equal(result.body.processed,192);
 assert.deepEqual(received,targets);
});

test('new map artwork never recognizes an unrelated or malformed monster identity',()=>{
 const view=createChampionsViewR118();
 for(const id of ['champions-ivory_guard-c1-01','champions-ivory-guard-c5-01','champions-ivory-guard-c1-00','champions-ivory-guard-c1-13','other-ivory-guard-c1-01'])assert.equal(view.key({id,area:'champions'}),null);
 assert.equal(view.key({id:championsMonsterIdR118('ivory_guard',1,1),area:'forest'}),null);
});
