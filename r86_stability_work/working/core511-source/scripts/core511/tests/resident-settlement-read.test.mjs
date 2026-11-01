import test from 'node:test';
import assert from 'node:assert/strict';
import {ResidentSettlementRead} from '../resident-settlement-read.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
import {until} from './helpers.mjs';

test('cold local read waits for earlier resource work and remains held through durable journal acknowledgement',async()=>{
 const lanes=new ResourceLanes(),prior=lanes.acquire(['monster:local'],'accepted-input'),peer={channel:4,incarnation:'read-owner-four'},resources=['monster:local'];let release,draining=false;const gate=new Promise(r=>release=r),read=new ResidentSettlementRead({peer,cycle:()=>7,lanes,journal:{drain:async()=>{draining=true;await gate;}},writer:{sequence:19},monster:()=>({channel:4}),onFatal:()=>assert.fail('unexpected read failure')});
 const pending=read.freeze({token:'parent-cold-read-token',cycle:7,resources});await new Promise(setImmediate);assert.equal(draining,false);await assert.rejects(read.freeze({token:'other-read-token-123',cycle:7,resources}),{code:'settlement_read_scope'});lanes.release(prior);await until(()=>draining);assert(lanes.busy(resources));assert.equal(lanes.busy(['monster:unrelated']),false);release();assert.deepEqual(await pending,{token:'parent-cold-read-token',cycle:7,resources,channel:4,incarnation:peer.incarnation,sequence:19});assert(lanes.busy(resources));assert.throws(()=>read.resume({token:'wrong-token'}),{code:'settlement_read_fenced'});assert(lanes.busy(resources));read.resume({token:'parent-cold-read-token'});assert(!lanes.busy(resources));
});

test('cold local read rejects foreign/shared resources and fences an unknown checkpoint instead of unlocking it',async()=>{
 const lanes=new ResourceLanes(),failure=Object.assign(Error('durable_checkpoint_ack_lost'),{code:'durable_checkpoint_ack_lost'});let fatal;
 const read=new ResidentSettlementRead({peer:{channel:4,incarnation:'read-owner-four'},cycle:()=>7,lanes,journal:{drain:async()=>{throw failure;}},writer:{sequence:19},monster:id=>({channel:id==='local'?4:id==='shared'?0:2}),onFatal:error=>fatal=error});
 for(const resources of [['monster:shared'],['monster:foreign'],['player:actor'],['monster:local','monster:local'],[]]){await assert.rejects(read.freeze({token:'parent-cold-read-token',cycle:7,resources}),{code:'settlement_read_scope'});assert.equal(lanes.tokens.size,0);}
 await assert.rejects(read.freeze({token:'parent-cold-read-token',cycle:7,resources:['monster:local']}),{code:failure.code});assert.equal(fatal,failure);assert(lanes.busy(['monster:local']));assert.equal(read.held.lease.state,'unknown');assert.throws(()=>read.resume({token:'parent-cold-read-token'}),{code:'resource_lease_fenced'});
});
