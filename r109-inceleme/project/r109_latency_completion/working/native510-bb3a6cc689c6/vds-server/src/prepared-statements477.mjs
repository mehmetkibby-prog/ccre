import {recordPreparedCache477} from './writer-sql-timing477.mjs';

// Cache compiled SQL, never rows, parameters, authority decisions or receipts.
// Only the synchronous writer scope opts in. Raw prepare keeps its native API.
const states = new WeakMap();
const ddl = /\b(?:CREATE|ALTER|DROP|ATTACH|DETACH|VACUUM|REINDEX)\b/i;
const cacheable = /^\s*(?:SELECT|INSERT|UPDATE|DELETE|REPLACE|WITH)\b/i;
const schemaChange = sql => typeof sql !== 'string' || ddl.test(sql) || /\bPRAGMA\b[^;]*=/i.test(sql);
// SQLite keeps the last bound values with a reusable native statement. Avoid
// retaining large payloads in every cache slot (maximum 16 KiB per slot).
function largeBindings(bindings){
  let bytes=0;
  for(const value of bindings){
    if(typeof value==='string'){if(value.length>16384)return true;bytes+=Buffer.byteLength(value,'utf8');}
    else if(ArrayBuffer.isView(value))bytes+=value.byteLength;
    else if(value!==null&&typeof value==='object')return true; // native named binding path, no getter inspection
    else bytes+=8;
    if(bytes>16384)return true;
  }
  return false;
}
function clear(state) {
  state.entries.clear(); state.sqlBytes = 0; state.invalidations++;
  state.schemaSnapshot = null;
  state.onInvalidate?.();
}
const immediateBegin = /^\s*BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)(?:\s+TRANSACTION)?\s*;?\s*$/i;
const transactionControl = /(?:^|;)\s*(?:(?:\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))\s*)*(?:BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE)\b/i;
const transactionRestart = /(?:^|;)\s*(?:(?:\/\*[\s\S]*?\*\/|--[^\n]*(?:\n|$))\s*)*(?:BEGIN|COMMIT|END)\b/i;
// A schema pair may be borrowed only while this connection still holds the
// explicit writer lock which protected its read. Savepoints do not release
// that lock; a rollback can undo TEMP DDL and must discard the schema pair.
function transactionBoundary477(state,sqlite,sql,beforeTransaction,succeeded) {
  if (!sqlite.isTransaction) { state.writerTransaction=false;state.schemaSnapshot=null;return; }
  if (!beforeTransaction) {
    state.writerTransaction=succeeded&&typeof sql==='string'&&immediateBegin.test(sql);
    state.schemaSnapshot=null;
  } else if(typeof sql!=='string'||transactionRestart.test(sql)) {
    // Mixed/unknown control SQL never earns the fast path. False positives in
    // comments or trigger text only cause a fresh schema read.
    state.writerTransaction=false;state.schemaSnapshot=null;
  } else if(/\bROLLBACK\b/i.test(sql)) state.schemaSnapshot=null;
}
export function invalidatePreparedStatements477(sqlite) {
  const state = states.get(sqlite); if (state) clear(state);
}
export function installPreparedStatements477(sqlite, {maxEntries=256,maxSqlBytes=524288,maxSqlLength=65536,onInvalidate}={}) {
  if (states.has(sqlite)) return;
  if (![maxEntries,maxSqlBytes,maxSqlLength].every(n=>Number.isSafeInteger(n)&&n>0)) throw new TypeError('Invalid prepared statement cache limits');
  const state={entries:new Map(),sqlBytes:0,maxEntries,maxSqlBytes,maxSqlLength,onInvalidate,depth:0,hits:0,misses:0,reentrantMisses:0,invalidations:0,schemaMayRollback:false,writerTransaction:false,schemaSnapshot:null};
  states.set(sqlite,state);
  const exec=sqlite.exec,prepare=sqlite.prepare,register=sqlite.function,close=sqlite.close;
  const changed=()=>{state.schemaMayRollback=true;clear(state);};
  sqlite.exec=function(sql,...args){
    const mutates=schemaChange(sql),rollback=state.schemaMayRollback&&/\bROLLBACK\b/i.test(sql);
    const beforeTransaction=this.isTransaction;let succeeded=false;
    try{const result=Reflect.apply(exec,this,[sql,...args]);succeeded=true;return result;}
    finally{if(mutates||rollback)changed();transactionBoundary477(state,this,sql,beforeTransaction,succeeded);if(/^\s*(?:COMMIT|END)\b/i.test(sql))state.schemaMayRollback=false;}
  };
  // DDL through native prepared statements is uncommon, but must invalidate
  // Node's cached column mapping too. DML statements are returned unchanged.
  sqlite.prepare=function(sql,...args){
    const statement=Reflect.apply(prepare,this,[sql,...args]);
    const mutates=schemaChange(sql),control=typeof sql==='string'&&transactionControl.test(sql);
    if(mutates||control)for(const name of ['get','all','run']){
      const invoke=statement[name];statement[name]=function(...bindings){const beforeTransaction=sqlite.isTransaction;let succeeded=false;try{const result=Reflect.apply(invoke,this,bindings);succeeded=true;return result;}finally{if(mutates||state.schemaMayRollback&&/\bROLLBACK\b/i.test(sql))changed();transactionBoundary477(state,sqlite,sql,beforeTransaction,succeeded);}};
    }
    return statement;
  };
  sqlite.function=function(...args){try{return Reflect.apply(register,this,args);}finally{clear(state);}};
  sqlite.close=function(...args){try{return Reflect.apply(close,this,args);}finally{clear(state);state.closed=true;}};
  state.main=sqlite.prepare('PRAGMA main.schema_version');
  state.temp=sqlite.prepare('PRAGMA temp.schema_version');
  state.mainVersion=state.main.get().schema_version;state.tempVersion=state.temp.get().schema_version;
}
export function checkPreparedSchema477(sqlite, mainVersion) {
  const state=states.get(sqlite);if(!state)return null;
  const main=mainVersion??state.main.get().schema_version,temp=state.temp.get().schema_version;
  if(main!==state.mainVersion||temp!==state.tempVersion){clear(state);state.mainVersion=main;state.tempVersion=temp;}
  if(!sqlite.isTransaction)state.schemaMayRollback=false;
  const versions=Object.freeze({mainVersion:main,tempVersion:temp});
  state.schemaSnapshot=state.writerTransaction&&sqlite.isTransaction?versions:null;
  return versions;
}
export function preparedSchemaVersions477(sqlite) {
  const state=states.get(sqlite);
  if(state?.depth&&state.writerTransaction&&sqlite.isTransaction&&state.schemaSnapshot)return state.schemaSnapshot;
  if(state)return checkPreparedSchema477(sqlite);
  // Compatibility for uninstrumented connections and isolated writer guards.
  return {mainVersion:sqlite.prepare('PRAGMA main.schema_version').get().schema_version,tempVersion:sqlite.prepare('PRAGMA temp.schema_version').get().schema_version};
}
export function withPreparedStatements477(sqlite,task,{schemaChecked=false}={}) {
  if(typeof task!=='function'||task.constructor?.name==='AsyncFunction')throw new TypeError('Synchronous prepared statement scope required');
  installPreparedStatements477(sqlite);
  const state=states.get(sqlite);
  if(!state.depth&&!schemaChecked)checkPreparedSchema477(sqlite);
  state.depth++;
  try{const result=task();if(result&&typeof result.then==='function')throw new TypeError('Synchronous prepared statement scope required');return result;}
  finally{state.depth--;}
}
// R110: calls made outside a writer scope on an instrumented connection used to
// compile the same SQL natively on every call (about 10k compiles per minute at
// 40 players). They now enter a one-call scope instead: the same schema-version
// check, rollback/close/reentrancy/large-binding rules and LRU as the writer
// scope, exactly like prepareServerStatement's coordinator reads. Only compiled
// SQL is reused; rows, bindings and authority results never are. Set
// CORE511_R110_SCOPED_FACADE=0 to restore the previous per-call compile.
const scopedFacadeR110=process.env.CORE511_R110_SCOPED_FACADE!=='0';
export function prepareCached477(sqlite,sql) {
  const state=states.get(sqlite);
  const outside=!state?.depth&&!(scopedFacadeR110&&state&&!state.closed);
  if(outside||typeof sql!=='string'||!cacheable.test(sql)||schemaChange(sql)||sql.length>state.maxSqlLength||sql.length*2>state.maxSqlBytes)return sqlite.prepare(sql);
  // A facade never exposes mutable native options, expanded SQL, or an iterator
  // that could remain active after the synchronous scope. Bindings stay native.
  const invoke=(method,bindings)=>{
    if(!state.depth){
      if(scopedFacadeR110&&!state.closed)return withPreparedStatements477(sqlite,()=>invoke(method,bindings));
      const statement=sqlite.prepare(sql);return Reflect.apply(statement[method],statement,bindings);
    }
    let entry=state.entries.get(sql),statement,temporary=false;
    if(largeBindings(bindings)){
      if(entry&&!entry.busy){state.entries.delete(sql);state.sqlBytes-=sql.length*2;}
      state.misses++;recordPreparedCache477(sqlite,false);
      const uncached=sqlite.prepare(sql);return Reflect.apply(uncached[method],uncached,bindings);
    }
    if(entry&&!entry.busy){
      state.hits++;recordPreparedCache477(sqlite,true);
      state.entries.delete(sql);state.entries.set(sql,entry);statement=entry.statement;
    }else{
      state.misses++;if(entry?.busy)state.reentrantMisses++;
      recordPreparedCache477(sqlite,false);statement=sqlite.prepare(sql);
      if(entry?.busy)temporary=true;
      else{
        while(state.entries.size>=state.maxEntries||state.sqlBytes+sql.length*2>state.maxSqlBytes){const oldest=state.entries.keys().next().value;state.entries.delete(oldest);state.sqlBytes-=oldest.length*2;}
        entry={statement,busy:false};state.entries.set(sql,entry);state.sqlBytes+=sql.length*2;
      }
    }
    if(!temporary)entry.busy=true;
    try{return Reflect.apply(statement[method],statement,bindings);}
    finally{if(!temporary)entry.busy=false;}
  };
  return Object.freeze(Object.fromEntries(['get','all','run','columns'].map(name=>[name,(...args)=>invoke(name,args)])));
}
export function preparedStatementsStats477(sqlite) {
  const s=states.get(sqlite);return s?{entries:s.entries.size,sqlBytes:s.sqlBytes,hits:s.hits,misses:s.misses,reentrantMisses:s.reentrantMisses,invalidations:s.invalidations}:null;
}
