// R18 caches only pure derivations. Never cache authorization, player HP,
// ownership, reward eligibility, SQL bindings, clocks or random draws.
export function createEquipmentCacheR18({maxEntries=512,maxBytes=1048576}={}) {
 const cache=new Map();let bytes=0;const stats={hits:0,misses:0,bypasses:0};
 const derive=(items,parse,enhance,total)=>{
  const entries=items.flatMap(item=>enhance(item,parse(item.enchantments,item.kind)));
  const totals=new Map();return kind=>{if(totals.has(kind))return totals.get(kind);const value=total(entries,kind);if(typeof kind==='string'&&totals.size<64)totals.set(kind,value);return value;};
 };
 return {get(items,parse,enhance,total){
  if(!Array.isArray(items)||items.some(i=>!i||typeof i.enchantments!=='string'||typeof i.kind!=='string'||i.item_name!==undefined&&typeof i.item_name!=='string')){stats.bypasses++;return derive(items,parse,enhance,total);}
  // V491 +5 bonuses depend on the name. Both it and the exact JSON/kind belong
  // in the key; no numeric rounding or hash-only equality can serve stale gear.
  const key=JSON.stringify(items.map(i=>[i.kind,i.enchantments,i.item_name??null])),size=key.length*2;
  if(size>32768){stats.bypasses++;return derive(items,parse,enhance,total);}
  const old=cache.get(key);if(old?.parse===parse&&old.enhance===enhance&&old.total===total){stats.hits++;return old.value;}
  stats.misses++;const value=derive(items,parse,enhance,total);
  if(old){cache.delete(key);bytes-=old.size;}
  while(cache.size>=maxEntries||bytes+size>maxBytes){const first=cache.keys().next().value;if(first===undefined)break;bytes-=cache.get(first).size;cache.delete(first);}
  cache.set(key,{parse,enhance,total,value,size});bytes+=size;return value;
 },snapshot(){return {...stats,entries:cache.size,bytes};}};
}
const equipment=createEquipmentCacheR18();
export const equipmentTotalsR18=(...args)=>equipment.get(...args);
export const equipmentStatsR18=()=>equipment.snapshot();

// A resident engagement row is the exact row already projected into the TEMP
// SQL view. Only use it under this player's existing serialized owner scope.
// Undefined means fallback, while null is an acknowledged/local deletion.
export function ownedEngagementR18(database,id){
 if(!database.combat?.resident||database.actorContext?.getStore()?.playerId!==id||database.owners?.get(id)?.state!=='active')return undefined;
 const entry=database.combat.entry('pve_engagements',id);
 return entry?entry.current:undefined;
}

// All three original SELECTs and bindings stay intact. The existing read-only
// batch gives them one schema check and one scheduling boundary, with no write
// IPC, writer lock or relaxed durable acknowledgement.
export async function retaliationFrameR18(database,statements){
 const rows=await database.batch(statements);
 return [rows[0].results[0]??null,rows[1],rows[2]];
}

// Only the exact V487 factory's bounded XP multiplier may normalize to an
// already-reviewed full SQL digest. This does not admit arbitrary SQL, change
// the executed text, or bypass any schema/ownership/receipt/isolation gate.
export function canonicalRewardXpR18(sql){
 const re=/\(CASE WHEN p\.level>=([1-9]|[1-5][0-9]|6[0-5]) THEN ([0-9]|[1-9][0-9]|100)\/100\.0 ELSE 1 END\)\*/g;
 const matches=[...sql.matchAll(re)];
 if(matches.length!==1||!sql.slice(Math.max(0,matches[0].index-22),matches[0].index).endsWith('ROUND(a.amount*'))return sql;
 return sql.slice(0,matches[0].index)+sql.slice(matches[0].index+matches[0][0].length);
}
