import {demand} from './contract.mjs';
// Exactly the native normalization before its slice(0, 10). Native validation
// is also executed for each chunk; no reward math or SQL is copied here.
export function normalizeClaimTargets(input){
 const seen=new Set();return (Array.isArray(input)?input:[]).flatMap(t=>{
  const id=typeof t?.id==='string'&&/^[a-z0-9-]{1,64}$/.test(t.id)?t.id:'',round=Number(t?.spawnRound),spawnRound=Number.isInteger(round)&&round>=0?round:-1,key=id+':'+spawnRound;
  if(!id||spawnRound<0||seen.has(key))return [];seen.add(key);return [{id,spawnRound}];
 });
}
// Bound work BEFORE target/participant scans or writer SQL. Multiple historic
// rounds of one monster use the original shared/native route, never truncation.
export function localClaimTargets(input,limit=100){
 if(!Array.isArray(input)||input.length>limit)return null;
 const targets=normalizeClaimTargets(input);
 if(!targets.length||targets.length>limit||new Set(targets.map(t=>t.id)).size!==targets.length)return null;
 return targets;
}
// Oversized requests retain the original native ten-target behavior. Finding
// ten normalized targets inside this bounded prefix proves that the unscanned
// tail cannot change native normalize(fullInput).slice(0,10).
export function nativeClaimPrefix(input){
 if(!Array.isArray(input)||input.length<=100)return null;
 const targets=normalizeClaimTargets(input.slice(0,100)).slice(0,10);
 return targets.length===10&&new Set(targets.map(t=>t.id)).size===10?targets:null;
}
export function runClaimChunks(targets,run){
 let last=null,processed=0;const drops=new Map();
 for(let offset=0;offset<targets.length;offset+=10){
  const result=run(targets.slice(offset,offset+10));demand(!result?.then,'claim_chunks_synchronous');
  // All chunks share the outer atomic and RNG. A later unexpected failure
  // cannot acknowledge a partially processed list.
  if(result.status!==200){demand(offset===0,'claim_chunk_partial_failure');return result;}
  processed+=result.body.processed??0;for(const d of result.body.drops??[])drops.set(d.id,d);last=result;
 }
 return last?{...last,body:{...last.body,processed,drops:[...drops.values()]}}:run([]);
}
