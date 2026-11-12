import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {demand} from './contract.mjs';

export const ACTOR_READ_WIRE_R112='actorReadWireR112';
const LIMIT=4*1024*1024,hash=bytes=>createHash('sha256').update(bytes).digest('hex');
// Private read-only worker -> parent -> owning channel. The parent retains a
// small encoded snapshot instead of constructing, cloning and serializing the
// entire cold world again. Native command replies and durable receipts NEVER
// use this envelope. The existing 4 MiB reader limit also bounds expansion.
export function encodeActorReadR112(bundle,text=JSON.stringify(bundle)){
 const bytes=Buffer.byteLength(text);demand(bytes>0&&bytes<=LIMIT,'actor_read_wire_size');
 return {[ACTOR_READ_WIRE_R112]:{version:1,bytes,sha256:hash(text),data:deflateRawSync(text,{level:1}).toString('base64')},player:{id:bundle.player.id,is_gm:bundle.player.is_gm},combat:{afk:{active:bundle.combat?.afk?.active}}};
}
export function decodeActorReadR112(value,method){
 if(!value||!Object.hasOwn(value,ACTOR_READ_WIRE_R112))return value;
 const m=value[ACTOR_READ_WIRE_R112];
 demand(method==='read_actor'&&Object.keys(value).every(k=>[ACTOR_READ_WIRE_R112,'player','combat','afkCheck'].includes(k))&&m?.version===1&&Object.keys(m).sort().join(',')==='bytes,data,sha256,version'&&Number.isSafeInteger(m.bytes)&&m.bytes>0&&m.bytes<=LIMIT&&typeof m.data==='string'&&m.data.length<=Math.ceil((LIMIT+65536)/3)*4&&/^[A-Za-z0-9+/]*={0,2}$/.test(m.data)&&typeof m.sha256==='string'&&/^[a-f0-9]{64}$/.test(m.sha256),'actor_read_wire_scope');
 let bytes,bundle;
 try{bytes=inflateRawSync(Buffer.from(m.data,'base64'),{maxOutputLength:m.bytes});}catch{demand(false,'actor_read_wire_encoding');}
 demand(bytes.length===m.bytes&&hash(bytes)===m.sha256,'actor_read_wire_encoding');
 try{bundle=JSON.parse(bytes.toString('utf8'));}catch{demand(false,'actor_read_wire_encoding');}
 demand(bundle?.player?.id===value.player?.id&&bundle.player.is_gm===value.player.is_gm&&bundle.combat?.afk?.active===value.combat?.afk?.active,'actor_read_wire_identity');
 // Parent-owned captcha state is attached after the read, exactly as for an
 // ordinary bundle. It is not inferred or cached by a read-only SQL worker.
 if(Object.hasOwn(value,'afkCheck'))bundle.afkCheck=value.afkCheck;
 return bundle;
}
