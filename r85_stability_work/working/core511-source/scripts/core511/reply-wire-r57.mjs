import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {demand} from './contract.mjs';

// Negotiated process transport only. Receipts, database rows and browser
// messages retain their original JSON. Expansion never exceeds one old frame.
export const REPLY_WIRE_MARKER_R57='replyWireR57';
export const REPLY_WIRE_LIMIT_R57=1048576;
const digest=text=>createHash('sha256').update(text).digest('hex');
export function encodeReplyWireR57(frame){
 try{
  if(frame?.type!=='result'||frame.ok!==true||Object.hasOwn(frame,REPLY_WIRE_MARKER_R57))return null;
  const text=JSON.stringify(frame),bytes=Buffer.byteLength(text);
  if(bytes<32768||bytes>REPLY_WIRE_LIMIT_R57)return null;
  const result={type:frame.type,id:frame.id,ok:true,[REPLY_WIRE_MARKER_R57]:{version:1,bytes,sha256:digest(text),data:deflateRawSync(text,{level:1}).toString('base64')}};
  return Buffer.byteLength(JSON.stringify(result))<=bytes*.85?result:null;
 }catch{return null;}
}
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
