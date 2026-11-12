import {createHash} from 'node:crypto';
import {deflateRawSync,inflateRawSync} from 'node:zlib';
import {jsonBytes} from './generated/owner-protocol.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {r35Options} from './r35-options.mjs';
const LIMIT=256*1024,transient=new Set(['player_hit','player_state','monster_preview','monster_result']);
const digest=text=>createHash('sha256').update(text).digest('hex');
const eventType=e=>Array.isArray(e)?e.find(v=>v&&typeof v==='object'&&!Array.isArray(v)&&typeof v.type==='string')?.type:e?.type;
const withoutCommitSectionsR57=value=>{
 if(!value||typeof value!=='object'||!Object.hasOwn(value,'actorCommitSectionsR57')&&!Object.hasOwn(value,'portalCreationR57')&&!Object.hasOwn(value,'itemRefreshR57')&&!Object.hasOwn(value,'castleCombatR59'))return value;
 const {actorCommitSectionsR57,portalCreationR57,itemRefreshR57,castleCombatR59,...rest}=value;
 return rest;
};
const durableValueR57=value=>{
 const outer=withoutCommitSectionsR57(value);
 return outer?.result&&typeof outer.result==='object'?{...outer,result:withoutCommitSectionsR57(outer.result)}:outer;
};
const withoutVisuals=value=>value&&Array.isArray(value.events)?{...value,events:value.events.filter(e=>!transient.has(eventType(e)))}:value;
export function replayValue(value){
 const outer=withoutVisuals(durableValueR57(value));
 return outer?.result&&typeof outer.result==='object'?{...outer,result:withoutVisuals(outer.result)}:outer;
}
export const receiptMetrics={plain:0,packed:0,overflow:0,savedBytes:0};
export function writeReceipt(result,operationId){
 if(!r35Options.compactReceipt)return {response:jsonBytes(durableValueR57(result),LIMIT)};
 // Never alter the live result: all four transient types still reach the
 // existing immediate publisher after fsync. Replays retain the exact player
 // response and authoritative rows, without replaying obsolete visual frames.
 const text=JSON.stringify(replayValue(result));
 if(text===undefined)throw Error('invalid_receipt_result');
 const bytes=Buffer.byteLength(text);let response=text,overflow=null;
 if(bytes>LIMIT){
  const envelope={__core511Receipt:1,codec:'deflate',bytes,sha256:digest(text),data:deflateRawSync(text,{level:1}).toString('base64')};
  response=JSON.stringify(envelope);
  if(Buffer.byteLength(response)>LIMIT){
   // Incompressible data has no fatal size cliff. The complete replay image
   // stays in the SAME durable transaction, behind a small receipt reference.
   overflow=text;response=JSON.stringify({__core511Receipt:1,codec:'overflow',operationId,bytes,sha256:envelope.sha256});receiptMetrics.overflow++;
  }else receiptMetrics.packed++;
 }else receiptMetrics.plain++;
 receiptMetrics.savedBytes+=Buffer.byteLength(response)+(overflow?bytes:0);
 return {response,overflow};
}
export function readReceipt(sql,response){
 const value=JSON.parse(response);if(value?.__core511Receipt!==1)return value;
 // Decode even when the write optimization has been disabled. Existing R35
 // receipts remain readable until their original epoch is retired/pruned.
 let text;
 if(value.codec==='deflate')text=inflateRawSync(Buffer.from(value.data,'base64'),{maxOutputLength:value.bytes}).toString('utf8');
 else if(value.codec==='overflow')text=prepareCached477(sql,'SELECT payload FROM kernel511_receipt_overflow WHERE operation_id=?').get(value.operationId)?.payload;
 if(typeof text!=='string'||Buffer.byteLength(text)!==value.bytes||digest(text)!==value.sha256)throw Object.assign(Error('receipt_storage_corrupt'),{code:'receipt_storage_corrupt'});
 return JSON.parse(text);
}
