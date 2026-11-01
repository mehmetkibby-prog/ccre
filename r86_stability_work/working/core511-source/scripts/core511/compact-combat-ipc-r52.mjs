import {demand} from './contract.mjs';

// Wire-only, negotiated on an authenticated process connection. Native results,
// durable receipts, notification order and the reconstructed JSON are unchanged.
// Repeated flat SQL columns are represented by one template plus sparse values;
// unlike the rejected R51 prototype, constant cells are not copied at every row.
export const COMPACT_COMBAT_MARKER_R52='combatRowsR52';
export const COMPACT_COMBAT_WIRE_BYTES_R52=4194304;
const MAX_ROWS=8192,MAX_KEYS=32,MAX_CELLS=262144,MIN_ROWS=32;
const fields=['monsters','participants'],unsafeKeys=new Set(['__proto__','prototype','constructor']);
const own=(v,k)=>Object.hasOwn(v,k),plain=v=>v!==null&&typeof v==='object'&&[Object.prototype,null].includes(Object.getPrototypeOf(v));
const scalar=v=>v===null||typeof v==='string'||typeof v==='boolean'||typeof v==='number'&&Number.isFinite(v);
const sameNames=(names,keys)=>names.length===keys.length&&names.every((v,i)=>v===keys[i]);
const rowKeys=row=>plain(row)&&!own(row,'toJSON')?Object.keys(row):null;
export const compactCombatMethodR52=method=>method==='command'||method==='command_status';

function pack(rows,remaining){
 if(!Array.isArray(rows)||Object.getPrototypeOf(rows)!==Array.prototype||own(rows,'toJSON')||rows.length<MIN_ROWS||rows.length>MAX_ROWS)return null;
 const keys=rowKeys(rows[0]);if(!keys||keys.length<4||keys.length>MAX_KEYS||keys.some(key=>key.length>128||unsafeKeys.has(key))||keys.length*rows.length>remaining)return null;
 const first=rows[0],base={};
 for(const key of keys){const d=Object.getOwnPropertyDescriptor(first,key);if(!d||!own(d,'value')||!scalar(d.value))return null;Object.defineProperty(base,key,{value:d.value,writable:true,enumerable:true,configurable:true});}
 const extraBytes=Buffer.byteLength(JSON.stringify(base))*rows.length;if(extraBytes>COMPACT_COMBAT_WIRE_BYTES_R52)return null;
 const data=[];let changes=0;
 for(const row of rows){
  const names=rowKeys(row);if(!names||!sameNames(names,keys))return null;
  const delta=[0];let mask=0;
  for(let k=0;k<keys.length;k++){
   const key=keys[k],d=Object.getOwnPropertyDescriptor(row,key);if(!d||!own(d,'value')||!scalar(d.value))return null;
   if(d.value!==base[key]){mask|=1<<k;delta.push(d.value);changes++;}
  }
  delta[0]=mask>>>0;data.push(delta);
 }
 // A high-variation table cannot amortize this extra pass. Keep its R51 form.
 if(changes>keys.length*rows.length*0.75)return null;
 return {keys,base,data,extraBytes,cells:keys.length*rows.length};
}
function encode(frame){
 if(frame?.type!=='result'||frame.ok!==true||own(frame,COMPACT_COMBAT_MARKER_R52))return frame;
 const status=frame.value?.status==='committed',ack=status?frame.value.ack:frame.value,source=ack?.result;
 if(!plain(source)||own(source,'toJSON')||!plain(ack)||own(ack,'toJSON')||own(frame.value,'toJSON'))return frame;
 let result=source,cells=0,extraBytes=0;const tables=[];
 for(const field of fields){
  const descriptor=Object.getOwnPropertyDescriptor(source,field);if(!descriptor||!own(descriptor,'value'))continue;
  const table=pack(descriptor.value,MAX_CELLS-cells);if(!table||extraBytes+table.extraBytes>COMPACT_COMBAT_WIRE_BYTES_R52)continue;
  if(result===source)result={...source};result[field]=table.data;tables.push({field,keys:table.keys,base:table.base});cells+=table.cells;extraBytes+=table.extraBytes;
 }
 if(!tables.length)return frame;
 const encoded={...ack,result};return {...frame,value:status?{...frame.value,ack:encoded}:encoded,[COMPACT_COMBAT_MARKER_R52]:{version:1,status,tables}};
}
// Unknown user-derived shapes fall back to the existing serializer after commit.
export function encodeCompactCombatReplyR52(frame){try{return encode(frame);}catch{return frame;}}
export function decodeCompactCombatReplyR52(frame,wireBytes){
 if(!own(frame,COMPACT_COMBAT_MARKER_R52))return frame;
 const meta=frame[COMPACT_COMBAT_MARKER_R52];
 demand(frame.type==='result'&&frame.ok===true&&meta?.version===1&&typeof meta.status==='boolean'&&Array.isArray(meta.tables)&&meta.tables.length>0&&meta.tables.length<=fields.length,'ipc_compact_scope');
 demand(Number.isSafeInteger(wireBytes)&&wireBytes>0&&wireBytes<=COMPACT_COMBAT_WIRE_BYTES_R52,'ipc_compact_wire_size');
 const ack=meta.status?frame.value?.ack:frame.value,source=ack?.result;
 demand(plain(source)&&(!meta.status||frame.value.status==='committed'),'ipc_compact_scope');
 let cells=0,extraBytes=0;const seen=new Set();
 // Validate both tables, all masks and the expansion bound before allocating
 // even the first expanded table. wireBytes already covers all delta values;
 // baseBytes * rowCount additionally overcounts the replaced cells, so this
 // conservative sum bounds the reconstructed envelope below the old 8 MiB cap.
 for(const table of meta.tables){
  const {field,keys,base}=table??{},rows=source[field],names=rowKeys(base);
  demand(fields.includes(field)&&!seen.has(field)&&Array.isArray(keys)&&keys.length>=4&&keys.length<=MAX_KEYS&&keys.every(k=>typeof k==='string'&&k.length<=128&&!unsafeKeys.has(k))&&new Set(keys).size===keys.length&&names&&sameNames(names,keys)&&Array.isArray(rows)&&rows.length>=MIN_ROWS&&rows.length<=MAX_ROWS,'ipc_compact_shape');seen.add(field);
  demand(keys.every(key=>scalar(base[key])),'ipc_compact_template');cells+=keys.length*rows.length;extraBytes+=Buffer.byteLength(JSON.stringify(base))*rows.length;
  demand(cells<=MAX_CELLS&&extraBytes<=COMPACT_COMBAT_WIRE_BYTES_R52&&wireBytes+extraBytes<=8388608,'ipc_compact_expansion_limit');
  for(const row of rows){
   demand(Array.isArray(row)&&Number.isSafeInteger(row[0])&&row[0]>=0&&row[0]<=0xffffffff&&(keys.length===32||row[0]<2**keys.length),'ipc_compact_mask');
   let mask=row[0],count=1;while(mask){mask=(mask&(mask-1))>>>0;count++;}
   demand(row.length===count,'ipc_compact_values');for(let i=1;i<row.length;i++)demand(scalar(row[i]),'ipc_compact_values');
  }
 }
 const result={...source};
 for(const {field,keys,base} of meta.tables)result[field]=source[field].map(values=>{
  const row={...base};let mask=values[0],index=1;
  while(mask){const bit=31-Math.clz32(mask&-mask);row[keys[bit]]=values[index++];mask=(mask&(mask-1))>>>0;}
  return row;
 });
 const decoded={...ack,result},output={...frame,value:meta.status?{...frame.value,ack:decoded}:decoded};delete output[COMPACT_COMBAT_MARKER_R52];return output;
}
