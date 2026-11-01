import test from 'node:test';
import assert from 'node:assert/strict';
import {ResourceLanes} from '../resource-lanes.mjs';
test('potion read ownership permits independent actors but fences every monster mutation and unknown result',async()=>{
 const lanes=new ResourceLanes(),a=lanes.acquire(['player:a','monster:m'],'a',{readMonsters:true}),b=lanes.acquire(['player:b','monster:m'],'b',{readMonsters:true});assert(a&&b);assert(lanes.busy(['monster:m']));assert.equal(lanes.acquire(['monster:m'],'attack'),null);assert.equal(lanes.acquire(['player:a'],'cold'),null);
 lanes.fence(a);assert.equal(lanes.acquire(['player:c','monster:m'],'c',{readMonsters:true}),null);assert.throws(()=>lanes.release(a),/fenced/);lanes.release(b);assert(lanes.busy(['monster:m']));let awake=false;const wait=lanes.available(['monster:m']).then(()=>awake=true);await Promise.resolve();assert(!awake);lanes.reconcile(a,{owner:'a',committed:true});await wait;assert(awake);const attack=lanes.acquire(['monster:m'],'attack');assert(attack);assert.equal(lanes.acquire(['player:c','monster:m'],'c',{readMonsters:true}),null);lanes.release(attack);assert.equal(lanes.readers.size,0);assert.equal(lanes.held.size,0);
});
