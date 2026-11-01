import {boundedClaimR53} from './r53-options.mjs';
export const CLAIM_ROWS_R53=128,CLAIM_BYTES_R53=48*1024;
// This query is a response projection, never reward generation/claim/collect.
// All rows remain durable and the existing authoritative world/drop refresh
// includes them. Reading one extra row proves truncation without a COUNT scan.
const freshQuery=/^SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at\s+FROM world_drops WHERE owner_id = \? AND expires_at >= \? AND collectible_at >= \?\s+AND enchantments NOT IN \(\?, \?\)\s+AND monster_id IN \([?,]+\) ORDER BY collectible_at, id$/;
export function claimOutputDatabaseR53(db){
 if(!boundedClaimR53)return db;
 return new Proxy(db,{get(target,key,receiver){if(key==='prepare')return query=>target.prepare(freshQuery.test(query)?query+' LIMIT '+(CLAIM_ROWS_R53+1):query);return Reflect.get(target,key,receiver);}});
}
export function boundedClaimResultR53(result){
 const rows=result?.body?.drops;if(!boundedClaimR53||!Array.isArray(rows))return result;
 let bytes=2;const drops=[];
 for(const row of rows){const size=Buffer.byteLength(JSON.stringify(row))+1;if(drops.length>=CLAIM_ROWS_R53||bytes+size>CLAIM_BYTES_R53)break;drops.push(row);bytes+=size;}
 return drops.length===rows.length?result:{...result,body:{...result.body,drops,dropsTruncatedR53:true}};
}
