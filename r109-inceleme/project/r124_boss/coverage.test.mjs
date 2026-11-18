import assert from 'node:assert/strict';
import test from 'node:test';
import {claimScopeCoveredR124} from '../r109_latency_completion/working/core511-source/scripts/core511/reward-actor-scope-r85.mjs';

test('a departed participant does not invalidate an already held boss scope', () => {
 const held={cycle:1,area:'rune_v2',target:{id:'rune-v2-boss-c4-1',spawnRound:17},actors:['source','departed']};
 const current={...held,actors:['source']};
 assert.equal(claimScopeCoveredR124(current,held),true);
 assert.equal(claimScopeCoveredR124({...current,actors:['source','new']},held),false);
 assert.equal(claimScopeCoveredR124({...current,target:{...current.target,spawnRound:18}},held),false);
 assert.equal(claimScopeCoveredR124({...current,cycle:2},held),false);
 assert.equal(claimScopeCoveredR124(null,held),false);
});
