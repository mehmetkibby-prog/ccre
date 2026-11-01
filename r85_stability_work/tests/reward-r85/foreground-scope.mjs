import test from 'node:test';
import assert from 'node:assert/strict';
import {fixture,input,boss,stone,addPlayer} from './foreground-fixture.mjs';
import {foregroundClaimScopeR85,foregroundClaimTargetsR85,scopedRewardActorsR79} from '../../working/core511-source/scripts/core511/reward-actor-scope-r85.mjs';

test('historical participants, cross-channel parties and offline peers form one deterministic superset',t=>{
 const {sql}=fixture(t);boss(sql,['p1','p4']);
 sql.exec("INSERT INTO party_members VALUES('p4','party'),('p7','party'),('p10','party');INSERT INTO boss_reward_claims VALUES(7,'p4','old',1)");
 assert.deepEqual(scopedRewardActorsR79(sql,{kind:'boss',round:7}),['p1','p10','p4','p7']);
 assert.deepEqual(foregroundClaimScopeR85(sql,input(),'p1',1),{cycle:1,targets:[{id:'dunya-bosu-1',spawnRound:7}],actors:['p1','p10','p4','p7']});
});
test('Sinsi requests can name another channel; actual history, not requester room, determines recipients',t=>{
 const {sql}=fixture(t);stone(sql,['p4','p5']);
 sql.exec("INSERT INTO party_members VALUES('p5','party'),('p10','party')");
 assert.deepEqual(foregroundClaimScopeR85(sql,input('sinsi-tasi-2-1'),'p1',1).actors,['p1','p10','p4','p5']);
});
test('passive dungeon recipients include every room member before any hold',t=>{
 const {sql}=fixture(t);boss(sql,['p1','p4']);
 sql.exec("INSERT INTO dungeon_members VALUES('p4','room'),('p8','room'),('p9','room')");
 assert.deepEqual(foregroundClaimScopeR85(sql,input(),'p1',1).actors,['p1','p4','p8','p9']);
});
test('mixed, oversized, lab, alive/unrecorded and special claimant inputs retain original broad path',t=>{
 const {sql}=fixture(t);boss(sql);
 for(const value of [{action:'attack'},input('ordinary'),{...input(),rewardTargets:[...input().rewardTargets,{id:'ordinary',spawnRound:7}]},{...input(),rewardTargets:Array.from({length:11},()=>input().rewardTargets[0])}])assert.equal(foregroundClaimTargetsR85(value),null);
 assert.equal(foregroundClaimScopeR85(sql,input('dunya-bosu-1',8),'p1',1),null);
 assert.equal(foregroundClaimScopeR85(sql,input('sinsi-tasi-2-1'),'p1',1),null);
 sql.exec("INSERT INTO loadlab_boss_rounds_v1 VALUES('lab-boss',7)");assert.equal(foregroundClaimScopeR85(sql,input(),'p1',1),null);
 sql.exec("DELETE FROM loadlab_boss_rounds_v1;UPDATE players SET area='arena' WHERE id='p1'");assert.equal(foregroundClaimScopeR85(sql,input(),'p1',1),null);
 for(const area of ['forest','frozen','ancient']){sql.prepare('UPDATE players SET area=? WHERE id=?').run(area,'p1');assert.equal(foregroundClaimScopeR85(sql,input(),'p1',1),null,'worker-owned claimants retain broad scope');}
});
test('recipient and related-room capacities are bounded without silently truncating eligibility',t=>{
 const {sql}=fixture(t);boss(sql);
 sql.exec("INSERT INTO dungeon_members VALUES('p1','room')");
 for(let i=0;i<100;i++){const id='extra'+i;addPlayer(sql,id);sql.prepare('INSERT INTO dungeon_members VALUES(?,?)').run(id,'room');}
 assert.equal(foregroundClaimScopeR85(sql,input(),'p1',1),null);
});
test('a second read sees current party membership and reset cycle; no cached eligibility survives a wait',t=>{
 const {sql}=fixture(t);boss(sql,['p1','p4']);const before=foregroundClaimScopeR85(sql,input(),'p1',1);
 sql.exec("INSERT INTO party_members VALUES('p4','new'),('p8','new');UPDATE world_state SET cycle=2");
 const after=foregroundClaimScopeR85(sql,input(),'p1',1);assert.notDeepEqual(after,before);assert.equal(after.cycle,2);assert(after.actors.includes('p8'));
});
