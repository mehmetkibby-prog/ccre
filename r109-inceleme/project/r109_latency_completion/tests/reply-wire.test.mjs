import test from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {encodeReplyWireR57,decodeReplyWireR57} from '../working/core511-source/scripts/core511/reply-wire-r57.mjs';
import {encodeCompactCombatReplyR52,decodeCompactCombatReplyR52} from '../working/core511-source/scripts/core511/compact-combat-ipc-r52.mjs';
const result=()=>({type:'result',id:'request-1',ok:true,value:{key:'death:1',result:{players:Array.from({length:25},(_,i)=>({id:'p'+i,hp:100,xp:4,metadata:'ö漢字😀'.repeat(450)})),monsters:Array.from({length:60},(_,i)=>({id:'m'+i,hp:0,spawn_round:1,channel:1,area:'forest'})),participants:[],events:[]}}});
test('live ACK, status replay and existing compact tables roundtrip without mutation',()=>{
 for(const frame of [result(),{type:'result',id:'status-1',ok:true,value:{status:'committed',ack:result().value}},encodeCompactCombatReplyR52(result())]){
  const before=JSON.stringify(frame),packed=encodeReplyWireR57(frame);assert(packed);assert(JSON.stringify(packed).length<before.length/4);assert.equal(JSON.stringify(frame),before);
  const decoded=decodeReplyWireR57(JSON.parse(JSON.stringify(packed)));assert.deepEqual(decoded.frame,JSON.parse(before));assert.equal(decoded.wireBytes,Buffer.byteLength(before));
  if(frame.combatRowsR52)assert.deepEqual(decodeCompactCombatReplyR52(decoded.frame,decoded.wireBytes),result());
 }
});
test('expansion, corruption, wrong request identity and malformed envelopes are rejected',()=>{
 const good=encodeReplyWireR57(result()),m=good.replyWireR57;
 for(const bad of [{...good,id:'foreign'},{...good,ok:false},{...good,value:{}},...[
  {...m,bytes:1},{...m,bytes:1048577},{...m,bytes:m.bytes-1},{...m,sha256:'0'.repeat(64)},{...m,data:m.data.slice(5)},{...m,version:2},{...m,extra:1}
 ].map(replyWireR57=>({...good,replyWireR57}))])assert.throws(()=>decodeReplyWireR57(bad),e=>e.code?.startsWith('ipc_reply_wire_'));
});
test('small, incompressible, error and above-one-frame results use the old transport',()=>{
 for(const frame of [{type:'result',id:'1',ok:true,value:'small'},{type:'result',id:'1',ok:false,value:'x'.repeat(50000)},{type:'result',id:'1',ok:true,value:randomBytes(50000).toString('base64')},{type:'result',id:'1',ok:true,value:'x'.repeat(1048576)}])assert.equal(encodeReplyWireR57(frame),null);
});
