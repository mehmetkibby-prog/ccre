// Cache only a pure normalization of immutable SQL text. No SQLite rows,
// bindings, trigger decisions, receipts, ownership or rewards are cached.
export function createRewardSqlNormalizerR11(){
 const entries=new Map();let bytes=0;
 return function normalR11(sql){
  if(typeof sql!=='string')return sql.replace(/\s+/g,' ').trim();
  const hit=entries.get(sql);if(hit)return hit.value;
  const value=sql.replace(/\s+/g,' ').trim();
  // Bound retained UTF-8 text. Oversized input keeps the original operation.
  if(sql.length>32768||value.length>32768)return value;
  const size=Buffer.byteLength(sql)+Buffer.byteLength(value);
  if(size>32768)return value;
  while(entries.size>=128||bytes+size>262144){const first=entries.keys().next().value,old=entries.get(first);entries.delete(first);bytes-=old.bytes;}
  entries.set(sql,{value,bytes:size});bytes+=size;return value;
 };
}
