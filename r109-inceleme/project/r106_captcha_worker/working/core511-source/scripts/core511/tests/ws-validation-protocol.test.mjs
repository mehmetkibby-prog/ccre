import test from 'node:test';
import assert from 'node:assert/strict';
import {observeValidationPacket} from '../ws-validation.mjs';
import {PROTOCOL} from '../contract.mjs';
test('canary requires actual native frame results, rejects rule errors and serializes durable private acknowledgements',()=>{
 const sent=[],client={ready:true,sequence:2,lastAck:0,pending:new Map([[1,0],[2,0]]),socket:{send:text=>sent.push(JSON.parse(text))}},count={acknowledged:0},frame={type:'frame',protocol:PROTOCOL,lastApplied:1,results:[]};
 observeValidationPacket(client,frame,count);assert.equal(count.acknowledged,0);assert.equal(client.pending.size,2);observeValidationPacket(client,{...frame,results:[{sequence:1,status:200,body:{ok:true}}]},count);assert.equal(count.acknowledged,1);assert.throws(()=>observeValidationPacket(client,{...frame,lastApplied:2,results:[{sequence:2,status:409,body:{error:'Rejected'}}]},count),/game_action_rejected/);assert.equal(client.pending.size,1);assert.throws(()=>observeValidationPacket(client,{...frame,type:'world'},count),/unexpected_validation_reply/);
 const a='a'.repeat(64),b='b'.repeat(64);for(const id of [a,a,b])observeValidationPacket(client,{type:'event',id,payload:null},count);assert.equal(sent.length,1);observeValidationPacket(client,{type:'event_acked',ids:[a]},count);assert.deepEqual(sent[1].ids,[b]);assert.throws(()=>observeValidationPacket(client,{type:'event_acked',ids:[a]},count),/event_ack_changed/);
});
