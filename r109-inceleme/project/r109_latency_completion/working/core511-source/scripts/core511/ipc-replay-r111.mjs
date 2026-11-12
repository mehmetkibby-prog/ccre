import {serialize,deserialize} from 'node:v8';
import {demand} from './contract.mjs';

// Keep the exact same sequence window and fail-closed retirement policy.
// Large successful RPC outcomes are retained as owned V8 bytes, not thousands
// of live JS rows for each of 512 requests in every channel. This is private
// process memory only; wire JSON and durable SQLite receipts do not change.
// Pending promises and rejected errors (including provenance) stay original.
const byteMethods=new Set(['command','system_command','read_actor','read_channel_refresh','read_actor_drops_r52']);
export class IpcReplay {
 constructor({limit=512,compact=process.env.CORE511_R111_REPLAY_STORAGE!=='0'}={}){
  this.limit=limit;this.compact=compact;this.prefix=null;this.high=0;this.rows=new Map();
  this.storage={encoded:0,replayed:0,fallbacks:0,bytes:0};
 }
 run(id,method,payload,work){
  const match=typeof id==='string'&&/^([a-f0-9-]{36}):([1-9][0-9]{0,14})$/.exec(id);demand(match,'ipc_request_identity');
  const serial=Number(match[2]);demand(Number.isSafeInteger(serial)&&(!this.prefix||this.prefix===match[1]),'ipc_request_identity');
  const fingerprint=JSON.stringify([method,payload]),old=this.rows.get(serial);
  if(old){
   demand(old.fingerprint===fingerprint,'ipc_request_id_reused');
   if(old.bytes){this.storage.replayed++;return Promise.resolve(deserialize(old.bytes));}
   return old.promise;
  }
  demand(serial>this.high&&serial<=this.high+128,'ipc_request_retired');
  this.prefix=match[1];this.high=serial;
  const row={fingerprint,done:false,promise:null,bytes:null};this.rows.set(serial,row);
  const finish=()=>{
   row.done=true;
   for(const [key,value]of this.rows){
    if(this.rows.size<=this.limit)break;
    if(value.done){this.rows.delete(key);this.storage.bytes-=value.bytes?.length??0;}
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
