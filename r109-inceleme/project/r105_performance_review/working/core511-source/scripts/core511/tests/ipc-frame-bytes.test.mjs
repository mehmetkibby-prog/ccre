import test from 'node:test';
import assert from 'node:assert/strict';
import {framed,observeFraming} from '../reliable-stream.mjs';
const previous=value=>{const body=Buffer.from(JSON.stringify(value));if(body.length<1||body.length>1048576)throw Object.assign(Error('ipc_frame_size'),{code:'ipc_frame_size'});const header=Buffer.allocUnsafe(4);header.writeUInt32BE(body.length);return Buffer.concat([header,body]);};
test('single-buffer IPC preserves exact prefix, JSON/UTF8 bytes, getters and size rejection',()=>{
 const values=[null,{},[],0,-0,NaN,'a\u0000ö𐀀\ud800',new Array(3),{a:undefined,z:[null,Infinity]},...Array.from({length:1000},(_,i)=>({type:'request',method:'command',n:i,text:'ğö漢字😀'.repeat(i%100)})),{text:'x'.repeat(1048565)},{text:'x'.repeat(1048576)}];
 const circular={};circular.self=circular;values.push(circular,undefined,1n);const outcome=fn=>{try{return {bytes:fn()};}catch(e){return {name:e.name,code:e.code};}};
 for(const value of values)assert.deepEqual(outcome(()=>framed(value)),outcome(()=>previous(value)));
 let count=0;framed({get value(){count++;return 5;}});assert.equal(count,1);
 const rows=[],dispose=observeFraming(row=>rows.push(row));try{assert.deepEqual(framed({type:'result',value:'ö'}),previous({type:'result',value:'ö'}));assert.equal(rows.length,1);assert(Math.abs(rows[0].jsonMs+rows[0].bufferMs-rows[0].ms)<.0001);}finally{dispose();}
});
