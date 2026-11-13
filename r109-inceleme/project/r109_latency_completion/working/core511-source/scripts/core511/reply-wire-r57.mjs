import {createHash} from 'node:crypto';
import {deflateRaw,deflateRawSync,inflateRawSync} from 'node:zlib';
import {demand} from './contract.mjs';

// Negotiated process transport only. Receipts, database rows and browser
// messages retain their original JSON. Expansion never exceeds one old frame.
export const REPLY_WIRE_MARKER_R57='replyWireR57';
export const REPLY_WIRE_LIMIT_R57=1048576;
const digest=text=>createHash('sha256').update(text).digest('hex');
export function encodeReplyWireR57(frame){
 const encoded=prepareReplyWireR105(frame);
 return encoded?.frame!==frame?encoded?.frame??null:null;
}
// Keep one local serialization for the immediate process write. Never cache by
// object identity, and do not retain oversized text while read-parts waits.
export function prepareReplyWireR105(frame){
 try{
  if(frame?.type!=='result'||frame.ok!==true||Object.hasOwn(frame,REPLY_WIRE_MARKER_R57))return null;
  const text=JSON.stringify(frame),bytes=Buffer.byteLength(text);
  if(bytes>REPLY_WIRE_LIMIT_R57)return null;
  if(bytes<32768)return {frame,text};
  const result={type:frame.type,id:frame.id,ok:true,[REPLY_WIRE_MARKER_R57]:{version:1,bytes,sha256:digest(text),data:deflateRawSync(text,{level:1}).toString('base64')}};
  const encoded=JSON.stringify(result);
  return Buffer.byteLength(encoded)<=bytes*.85?{frame:result,text:encoded}:{frame,text};
 }catch{return null;}
}
// Compression is transport work, not part of SQLite settlement. Serialize the
// committed result once before yielding, then compress in libuv's worker pool.
// At capacity send the already bounded plain frame instead of building a queue
// behind unrelated combat replies. Both forms use the same negotiated decoder.
export function createAsyncReplyWireR113({compress=deflateRaw,maxJobs=4,maxBytes=2097152}={}){
 let active=0,retainedBytes=0;
 const stats={compressed:0,bypassed:0,failed:0};
 const prepare=async(frame,onSerialized=null)=>{
  let text,bytes;
  try{
   if(frame?.type!=='result'||frame.ok!==true||Object.hasOwn(frame,REPLY_WIRE_MARKER_R57))return null;
   text=JSON.stringify(frame);bytes=Buffer.byteLength(text);
  }catch{return null;}
  if(bytes>REPLY_WIRE_LIMIT_R57)return null;
  // Freeze replay before async compression or a physical socket reconnect.
  onSerialized?.(text);
  if(bytes<32768)return {frame,text};
  if(active>=maxJobs||retainedBytes+bytes>maxBytes){stats.bypassed++;return {frame,text};}
  active++;retainedBytes+=bytes;
  try{
   const buffer=Buffer.from(text),sha256=digest(buffer);
   const compressed=await new Promise((resolve,reject)=>compress(buffer,{level:1},(error,value)=>error?reject(error):resolve(value)));
   const result={type:'result',id:frame.id,ok:true,[REPLY_WIRE_MARKER_R57]:{version:1,bytes,sha256,data:compressed.toString('base64')}};
   const encoded=JSON.stringify(result);
   if(Buffer.byteLength(encoded)>bytes*.85)return {frame,text};
   stats.compressed++;return {frame:result,text:encoded};
  }catch{stats.failed++;return {frame,text};}
  finally{active--;retainedBytes-=bytes;}
 };
 return {prepare,metrics:()=>({...stats,active,retainedBytes})};
}
const asyncReplyWireR113=createAsyncReplyWireR113();
export const prepareReplyWireR113=asyncReplyWireR113.prepare;
export function decodeReplyWireR57(frame){
 const meta=frame?.[REPLY_WIRE_MARKER_R57];
 demand(frame?.type==='result'&&frame.ok===true&&typeof frame.id==='string'&&Object.keys(frame).sort().join(',')==='id,ok,replyWireR57,type'&&meta?.version===1&&Object.keys(meta).sort().join(',')==='bytes,data,sha256,version'&&Number.isSafeInteger(meta.bytes)&&meta.bytes>=32768&&meta.bytes<=REPLY_WIRE_LIMIT_R57&&typeof meta.data==='string'&&meta.data.length<=REPLY_WIRE_LIMIT_R57&&/^[A-Za-z0-9+/]*={0,2}$/.test(meta.data)&&typeof meta.sha256==='string'&&/^[a-f0-9]{64}$/.test(meta.sha256),'ipc_reply_wire_scope');
 let text,value;
 try{text=inflateRawSync(Buffer.from(meta.data,'base64'),{maxOutputLength:meta.bytes}).toString('utf8');}
 catch{demand(false,'ipc_reply_wire_encoding');}
 demand(Buffer.byteLength(text)===meta.bytes&&digest(text)===meta.sha256,'ipc_reply_wire_encoding');
 try{value=JSON.parse(text);}catch{demand(false,'ipc_reply_wire_encoding');}
 demand(value?.type==='result'&&value.id===frame.id&&value.ok===true&&Object.hasOwn(value,'value')&&!Object.hasOwn(value,REPLY_WIRE_MARKER_R57),'ipc_reply_wire_scope');
 return {frame:value,wireBytes:meta.bytes};
}
