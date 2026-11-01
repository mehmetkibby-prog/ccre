import {prepareCached477 as nativePrepareCached} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
// Reuse only the native immutable method facade, not its query results or native
// statement handle. Its invocation still performs current-scope/schema/LRU/
// large-binding/reentrant checks and every original SQL/authorization query.
const connections=new WeakMap(),maxEntries=256,maxBytes=524288;
export function prepareCached477(sqlite,sql){
 let cache=connections.get(sqlite);if(!cache){cache={entries:new Map(),bytes:0};connections.set(sqlite,cache);}
 const hit=cache.entries.get(sql);if(hit)return hit;
 const facade=nativePrepareCached(sqlite,sql);
 // Outside a native prepared scope, or for unsupported SQL, preserve the
// original uncached statement. Never retain mutable native statement options.
 if(typeof sql==='string'&&sql.length*2<=maxBytes&&Object.isFrozen(facade)){
  while(cache.entries.size>=maxEntries||cache.bytes+sql.length*2>maxBytes){const key=cache.entries.keys().next().value;cache.entries.delete(key);cache.bytes-=key.length*2;}
  cache.entries.set(sql,facade);cache.bytes+=sql.length*2;
 }
 return facade;
}
export function writerStatementFacadeStats(sqlite){const cache=connections.get(sqlite);return {entries:cache?.entries.size??0,sqlBytes:cache?.bytes??0,maxEntries,maxBytes};}
