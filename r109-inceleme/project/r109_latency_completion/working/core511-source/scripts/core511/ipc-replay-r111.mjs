import {serialize,deserialize} from 'node:v8';
import {demand} from './contract.mjs';
import {COMPACT_COMBAT_MARKER_R52,decodeCompactCombatReplyR52} from './compact-combat-ipc-r52.mjs';
import {REPLY_WIRE_MARKER_R57,decodeReplyWireR57} from './reply-wire-r57.mjs';

// Keep the exact same sequence window and fail-closed retirement policy.
// Large successful RPC outcomes are retained as owned V8 bytes, not thousands
// of live JS rows for each of 512 requests in every channel. This is private
// process memory only; wire JSON and durable SQLite receipts do not change.
// Pending promises and rejected errors (including provenance) stay original.
// Reader replies are plain row snapshots already cloned across the reader
// boundary. Do not traverse command outcomes a second time: they may contain
// lazy getters, and the wire encoder owns their one serialization.
const byteMethods=new Set(['read_actor','read_channel_refresh','read_actor_drops_r52']);
export class IpcReplay {
 constructor({limit=512,compact=process.env.CORE511_R111_REPLAY_STORAGE!=='0'}={}){
  this.limit=limit;this.compact=compact;this.prefix=null;this.high=0;this.rows=new Map();
  this.storage={encoded:0,replayed:0,fallbacks:0,bytes:0,wireEncodedR113:0};
 }
 // The authenticated transport supplies the exact text it has ALREADY
 // serialized. Do not traverse lazy command fields or serialize rewards again.
 // Release the resolved promise's large graph while retaining the same replay
 // window and fingerprint. Errors/pending/unknown outcomes are unchanged.
 retainSerializedR113(id,text){
  if(!this.compact||process.env.CORE511_R113_WIRE_REPLAY==='0')return;
  const prefix=this.prefix+':';if(typeof id!=='string'||!id.startsWith(prefix))return;
  const row=this.rows.get(Number(id.slice(prefix.length)));
  if(!row?.done||typeof text!=='string'&&!Buffer.isBuffer(text))return;
  const bytes=Buffer.from(text);if(bytes.length>1048576)return;
  this.storage.bytes-=(row.bytes?.length??0)+(row.wire?.length??0);
  row.bytes=null;row.wire=bytes;row.promise=null;this.storage.bytes+=bytes.length;this.storage.wireEncodedR113++;
 }
 run(id,method,payload,work){
  const match=typeof id==='string'&&/^([a-f0-9-]{36}):([1-9][0-9]{0,14})$/.exec(id);demand(match,'ipc_request_identity');
  const serial=Number(match[2]);demand(Number.isSafeInteger(serial)&&(!this.prefix||this.prefix===match[1]),'ipc_request_identity');
  const fingerprint=JSON.stringify([method,payload]),old=this.rows.get(serial);
  if(old){
   demand(old.fingerprint===fingerprint,'ipc_request_id_reused');
   if(old.wire){this.storage.replayed++;let frame=JSON.parse(old.wire.toString('utf8')),wireBytes=old.wire.length;if(Object.hasOwn(frame,REPLY_WIRE_MARKER_R57)){const decoded=decodeReplyWireR57(frame);frame=decoded.frame;wireBytes=decoded.wireBytes;}if(Object.hasOwn(frame,COMPACT_COMBAT_MARKER_R52))frame=decodeCompactCombatReplyR52(frame,wireBytes);return Promise.resolve(frame.value);}
   if(old.bytes){this.storage.replayed++;return Promise.resolve(deserialize(old.bytes));}
   return old.promise;
  }
  demand(serial>this.high&&serial<=this.high+128,'ipc_request_retired');
  this.prefix=match[1];this.high=serial;
  const row={fingerprint,method,done:false,promise:null,bytes:null,wire:null};this.rows.set(serial,row);
  const finish=()=>{
   row.done=true;
   for(const [key,value]of this.rows){
    if(this.rows.size<=this.limit)break;
    if(value.done){this.rows.delete(key);this.storage.bytes-=(value.bytes?.length??0)+(value.wire?.length??0);}
   }
  };
  row.promise=Promise.resolve().then(work).then(value=>{
   if(this.compact&&byteMethods.has(method)&&value&&typeof value==='object'){
    try{row.bytes=serialize(value);this.storage.bytes+=row.bytes.length;this.storage.encoded++;row.promise=null;}
    catch{this.storage.fallbacks++;}
   }
   finish();return value;
  },error=>{finish();throw error;});
  return row.promise;
 }
}
