import {createHash} from 'node:crypto';
import {demand} from './contract.mjs';

// Only cold admission snapshots use this transport. Commands, receipts and
// public connections retain their existing frame limits and dispatch paths.
export const CONTROL_PART_BYTES_R116=196608;
export const CONTROL_LIMIT_R116=8388608;
export const CONTROL_CACHE_R116=33554432;
const methods=new Set(['admit','admit_held','admit_passive','global_admit','shared_admit','rebind']);
export const controlPartsMethodR116=method=>methods.has(method);
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const validId=id=>typeof id==='string'&&id.length>0&&id.length<=160;
const keys=(value,expected)=>Object.keys(value).sort().join(',')===expected;

export function prepareControlPartsR116(frame,text){
 demand(frame.type==='control'&&validId(frame.id)&&methods.has(frame.method),'ipc_control_parts_scope');
 const size=Buffer.byteLength(text);
 demand(size>1048576&&size<=CONTROL_LIMIT_R116,'ipc_control_parts_size');
 const buffer=Buffer.from(text);
 return {buffer,index:0,header:{type:'control_parts',id:frame.id,method:frame.method,bytes:size,sha256:digest(buffer)}};
}

export function takeControlPartR116(parts,id,index){
 demand(parts&&parts.header.id===id&&Number.isSafeInteger(index)&&index===parts.index,'ipc_control_part_order');
 const start=index*CONTROL_PART_BYTES_R116;
 demand(start<parts.buffer.length,'ipc_control_part_order');
 const end=Math.min(start+CONTROL_PART_BYTES_R116,parts.buffer.length);
 parts.index++;
 return {type:'control_part',id,index,bytes:parts.buffer.subarray(start,end).toString('base64')};
}

// Keep replay identity bounded too: a 512-entry completion cache must not retain
// 512 large JSON strings. Both normal and fragmented frames use this same rule.
export function controlFingerprintR116(method,payload){
 const text=JSON.stringify([method,payload]);
 return text.length<=65536?text:'sha256:'+digest(text);
}

export class ControlPartsReceiverR116 {
 constructor(){this.rows=new Map();this.bytes=0;}
 clear(){this.rows.clear();this.bytes=0;}
 begin(frame){
  demand(frame?.type==='control_parts'&&keys(frame,'bytes,id,method,sha256,type')&&validId(frame.id)&&methods.has(frame.method)&&Number.isSafeInteger(frame.bytes)&&frame.bytes>1048576&&frame.bytes<=CONTROL_LIMIT_R116&&typeof frame.sha256==='string'&&/^[a-f0-9]{64}$/.test(frame.sha256),'ipc_control_parts_scope');
  demand(!this.rows.has(frame.id)&&this.bytes+frame.bytes<=CONTROL_CACHE_R116,'ipc_control_parts_capacity');
  this.rows.set(frame.id,{header:frame,buffer:Buffer.allocUnsafe(frame.bytes),index:0,offset:0});this.bytes+=frame.bytes;
  return {type:'control_part_request',id:frame.id,index:0};
 }
 append(frame){
  const row=this.rows.get(frame?.id);
  demand(frame?.type==='control_part'&&keys(frame,'bytes,id,index,type')&&row&&Number.isSafeInteger(frame.index)&&frame.index===row.index&&typeof frame.bytes==='string'&&frame.bytes.length<=4*Math.ceil(CONTROL_PART_BYTES_R116/3)&&/^[A-Za-z0-9+/]*={0,2}$/.test(frame.bytes),'ipc_control_part_frame');
  const bytes=Buffer.from(frame.bytes,'base64'),expected=Math.min(CONTROL_PART_BYTES_R116,row.buffer.length-row.offset);
  demand(bytes.length===expected&&bytes.toString('base64')===frame.bytes,'ipc_control_part_size');
  bytes.copy(row.buffer,row.offset);row.offset+=bytes.length;row.index++;
  if(row.offset!==row.buffer.length)return {request:{type:'control_part_request',id:frame.id,index:row.index}};
  this.rows.delete(frame.id);this.bytes-=row.buffer.length;
  demand(digest(row.buffer)===row.header.sha256,'ipc_control_parts_integrity');
  let value;
  try{value=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(row.buffer));}catch{demand(false,'ipc_control_parts_encoding');}
  demand(value?.type==='control'&&value.id===row.header.id&&value.method===row.header.method&&keys(value,'id,method,payload,type'),'ipc_control_parts_identity');
  return {frame:value};
 }
}
