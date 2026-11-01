import {withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {STMT_CACHE} from './performance-options.mjs';

// Enter the existing native cache scope even for coordinator reads. Native
// schema/rollback/close/reentrancy/large-binding invalidation is retained, as is
// CommandFailureScope's wrapped prepare. Never retain rows or native handles.
const connections=new WeakMap();
export function prepareServerStatement(sql,query,{legacyCached=false}={}){
 if(!STMT_CACHE)return legacyCached?prepareCached477(sql,query):sql.prepare(query);
 let cache=connections.get(sql);if(!cache){cache=new Map();connections.set(sql,cache);}
 let statement=cache.get(query);
 if(!statement){
  statement=Object.freeze(Object.fromEntries(['get','all','run'].map(method=>[method,(...args)=>withPreparedStatements477(sql,()=>prepareCached477(sql,query)[method](...args))])));
  if(cache.size>=256)cache.delete(cache.keys().next().value);
  cache.set(query,statement);
 }
 return statement;
}
