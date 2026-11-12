import test from 'node:test';
import assert from 'node:assert/strict';
import {finalCampaignMayContinue} from '../benchmark/final-campaign-policy.mjs';
import {syntheticPair,sha} from './load-report-fixture.mjs';
const other='b'.repeat(64);
const run=(attempt,candidate=sha)=>{const r=syntheticPair()[0];return {...r,attempt,manifestSha256:candidate,sourceIdentity:{sha256:candidate}};};
test('explicit resume starts33 without erasing32; final pair cannot silently change candidate',()=>{
 const history=[{attempt:30,status:'failed'},{attempt:31,status:'measured'},{attempt:32,status:'failed'}];assert(finalCampaignMayContinue(history,sha));
 const r=run(33);assert(finalCampaignMayContinue([...history,r],sha));assert(!finalCampaignMayContinue([...history,r],other));
 assert(!finalCampaignMayContinue([...history,r,run(34)],sha),'two passes stop measurement and advance to delivery');
});
test('either final performance failure stops, with no correction or candidate retry',()=>{
 for(const mutate of [r=>r.errors=1,r=>r.channels[3].tickP95Ms=30.0001,r=>r.status='failed',r=>r.sourceUnchanged=false,r=>r.inputResponses.observations.pop()]){
  const bad=run(33);mutate(bad);assert(!finalCampaignMayContinue([bad],sha));assert(!finalCampaignMayContinue([bad],other));
  const failed=run(34);mutate(failed);assert(!finalCampaignMayContinue([run(33),failed],sha));assert(!finalCampaignMayContinue([run(33),failed],other));
 }
});
