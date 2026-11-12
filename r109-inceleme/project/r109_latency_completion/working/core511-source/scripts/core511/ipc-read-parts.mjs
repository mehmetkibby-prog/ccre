import {demand} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {commandReplyParts} from './r50-reward-transport-options.mjs';
// Configuration refresh includes current participation/history rows. Reuse
// the same bounded snapshot transfer as actor reads; never re-run the admin
// operation or re-query the snapshot to obtain its individual parts.
export const readPartsMethod=method=>method==='read_actor'||method==='read_channel_refresh'||actorFaultIsolation&&method==='command_status'||commandReplyParts&&(method==='command'||method==='command_status');
// Exceptional response transfer. A large snapshot or committed ACK is retained once, then
// sent in bounded frames on the SAME authenticated process connection. No DB
// query, native operation or durable receipt is repeated to obtain its parts.
export const READ_PART_BYTES=196608,READ_RESULT_LIMIT=8388608;
const CACHE_LIMIT=33554432;
export class ReadResultParts {
 constructor(){this.rows=new Map();this.bytes=0;this.reserved=new Map();this.waiting=[];this.reservedBytes=0;}
 clear(){this.rows.clear();this.bytes=0;this.reserved.clear();this.reservedBytes=0;for(const row of this.waiting)row.reject(Object.assign(Error('ipc_read_parts_closed'),{code:'ipc_read_parts_closed'}));this.waiting=[];}
 offer(id,text){
  const size=Buffer.byteLength(text);if(size>READ_RESULT_LIMIT||this.rows.has(id))return null;
  if(this.reserved.has(id)){demand(this.reserved.get(id)===size,'ipc_read_part_snapshot_changed');this.reserved.delete(id);this.reservedBytes-=size;}
  else if(this.bytes+this.reservedBytes+size>CACHE_LIMIT)return false;
  const buffer=Buffer.from(text);this.rows.set(id,{buffer,index:0});this.bytes+=size;return {bytes:size};
 }
 // A full cache delays serialization, not the DB operation. Waiters hold only
 // the already-dispatched snapshot reference, bounded by transport maxInflight.
 // Reserve capacity FIFO so simultaneous large results cannot all wake/retry.
 wait(id,size){
  demand(Number.isSafeInteger(size)&&size>1048576&&size<=READ_RESULT_LIMIT&&this.waiting.length<128&&!this.waiting.some(row=>row.id===id)&&!this.reserved.has(id),'ipc_read_part_wait_scope');
  return new Promise((resolve,reject)=>{this.waiting.push({id,size,resolve,reject});this.drain();});
 }
 drain(){while(this.waiting.length&&this.bytes+this.reservedBytes+this.waiting[0].size<=CACHE_LIMIT){const row=this.waiting.shift();this.reserved.set(row.id,row.size);this.reservedBytes+=row.size;row.resolve();}}
 take(id,index){
  const row=this.rows.get(id);demand(row&&Number.isSafeInteger(index)&&index===row.index,'ipc_read_part_order');
  const start=index*READ_PART_BYTES,end=Math.min(start+READ_PART_BYTES,row.buffer.length),last=end===row.buffer.length;
  const frame={type:'result_part',id,index,bytes:row.buffer.subarray(start,end).toString('base64')};row.index++;
  if(last){this.bytes-=row.buffer.length;this.rows.delete(id);this.drain();}return frame;
 }
}
export function beginReadParts(row,meta){
 demand(row.readParts===true&&readPartsMethod(row.method)&&!row.parts&&Number.isSafeInteger(meta?.bytes)&&meta.bytes>1048576&&meta.bytes<=READ_RESULT_LIMIT,'ipc_read_part_scope');
 row.parts={buffer:Buffer.allocUnsafe(meta.bytes),index:0,offset:0};
}
export function appendReadPart(row,frame){
 const p=row?.parts;demand(p&&frame.index===p.index&&typeof frame.bytes==='string'&&frame.bytes.length<=4*Math.ceil(READ_PART_BYTES/3)&&/^[A-Za-z0-9+/]*={0,2}$/.test(frame.bytes),'ipc_read_part_frame');
 const part=Buffer.from(frame.bytes,'base64'),expected=Math.min(READ_PART_BYTES,p.buffer.length-p.offset);demand(part.length===expected,'ipc_read_part_size');part.copy(p.buffer,p.offset);p.offset+=part.length;p.index++;
 if(p.offset!==p.buffer.length)return null;
 const result=JSON.parse(p.buffer.toString('utf8'));demand(result.type==='result'&&result.id===frame.id&&result.ok===true,'ipc_read_part_result');delete row.parts;return result;
}
