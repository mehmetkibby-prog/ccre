import test from 'node:test';
import assert from 'node:assert/strict';
import {WorldProjection} from '../../r109_latency_completion/working/core511-source/scripts/core511/world-projection.mjs';
import {publicWorldPlayer} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/world-projection-rules.mjs';

test('private inventory updates preserve the shared room until a publicly visible value changes',()=>{
 const owner={id:'one',area:'forest',channel:1,name:'Avcı',rank:{tier:2,bonuses:{pve:7}},hp:73};
 const room={staticPlayers:new Map([[owner.id,publicWorldPlayer(owner)]]),revision:4};
 const sub={room,ownerRow:owner,revision:2,data:{channel:1,area:'forest',players:[owner],inventory:[]}};
 const world={subscribers:new Map([[owner.id,sub]])};
 const publish=(o,inventory)=>WorldProjection.prototype.commitPrivateR113.call(world,'one',{owner:o,inventory});
 publish(structuredClone(owner),[{id:'private'}]);assert.equal(room.revision,4);assert.equal(sub.revision,3);assert.equal(sub.data.inventory[0].id,'private');
 const different=structuredClone(owner);different.rank.bonuses.pve=8;
 publish(different,[]);assert.equal(room.revision,5);assert.equal(room.staticPlayers.get('one').rank.bonuses.pve,8);assert.deepEqual(sub.data.inventory,[]);
 assert.equal(room.staticPlayers.get('one').inventory,undefined);
 assert.throws(()=>publish({...owner,channel:4},[]));
});
