import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {rewardAsyncReplyR54} from './r54-options.mjs';
import {checkpointWireR57} from './r57-options.mjs';
import {demand} from './contract.mjs';
const WIRE=224*1024,RAW=768*1024;
const digest=value=>createHash('sha256').update(value).digest('hex');
// A lossless, request-local wire image. No new disk rows, authority, gameplay
// fields or raised IPC limit. Small checkpoints keep their exact old shape.
export function packCheckpointR54(value){
 const text=JSON.stringify(value),bytes=Buffer.byteLength(text);
 if(bytes<=WIRE){
  if(!checkpointWireR57||!rewardAsyncReplyR54||bytes<16384)return value;
  // Party encounter journals repeat large native attacker maps. Compress the
  // transport image before IPC hashing/copying, preserving every base/CAS row.
  // Incompressible images keep their existing bounded representation.
  const packed={codec:'deflate-r57',bytes,sha256:digest(text),data:deflateRawSync(text,{level:1}).toString('base64')};
  return Buffer.byteLength(JSON.stringify(packed))<=bytes*.85?packed:value;
 }
 if(!rewardAsyncReplyR54||bytes>RAW)return null;
 const packed={codec:'deflate-r54',bytes,sha256:digest(text),data:deflateRawSync(text,{level:1}).toString('base64')};
 return Buffer.byteLength(JSON.stringify(packed))<=WIRE?packed:null;
}
export function unpackCheckpointR54(value){
 if(!value?.codec)return value;
 const size=value.codec==='deflate-r54'?value.bytes>WIRE&&value.bytes<=RAW:checkpointWireR57&&value.codec==='deflate-r57'&&value.bytes>=16384&&value.bytes<=WIRE;
 demand(rewardAsyncReplyR54&&size&&Object.keys(value).sort().join(',')==='bytes,codec,data,sha256'&&Number.isSafeInteger(value.bytes)&&typeof value.data==='string'&&value.data.length<=WIRE&&/^[A-Za-z0-9+/]*={0,2}$/.test(value.data)&&typeof value.sha256==='string'&&/^[a-f0-9]{64}$/.test(value.sha256),'checkpoint_join_encoding');
 let text;
 try{text=inflateRawSync(Buffer.from(value.data,'base64'),{maxOutputLength:value.bytes}).toString('utf8');}
 catch{demand(false,'checkpoint_join_encoding');}
 demand(Buffer.byteLength(text)===value.bytes&&digest(text)===value.sha256,'checkpoint_join_encoding');
 try{return JSON.parse(text);}catch{demand(false,'checkpoint_join_encoding');}
}
