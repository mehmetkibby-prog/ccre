import {SQL_TABLES477,SQL_OPERATIONS477,SQL_PHASES477,SQL_JOB_DETAIL_KEYS477,SQL_COSTS477} from './writer-sql-labels477.mjs';
// Timing only: this adapter never changes SQL, bound values, results or errors.
// Writer callbacks are synchronous. Cached statements retain this adapter; the
// only unmeasured cost is a nullable active-target check per native execution.
const installed = new WeakMap();
const controlStatement=/^(?:BEGIN(?:\s+(?:DEFERRED|IMMEDIATE|EXCLUSIVE))?(?:\s+TRANSACTION)?|(?:COMMIT|END)(?:\s+TRANSACTION)?|ROLLBACK(?:\s+TRANSACTION)?(?:\s+TO(?:\s+SAVEPOINT)?\s+[A-Za-z_]\w*)?|SAVEPOINT\s+[A-Za-z_]\w*|RELEASE(?:\s+SAVEPOINT)?\s+[A-Za-z_]\w*)$/i;
// This is only an exclusion for known control-only calls, not an SQL parser.
// Mixed exec strings remain one native call, including all work inside them.
const control = sql => typeof sql==='string'&&sql.split(';').filter(part=>part.trim()).every(part=>controlStatement.test(part.trim()));
const add = (target, key, n) => { target[key] = (target[key] ?? 0) + n; };
const tables=new Set(SQL_TABLES477),operations=new Set(SQL_OPERATIONS477),phases=new Set(SQL_PHASES477),details=new Set(SQL_JOB_DETAIL_KEYS477),costs=new Set(SQL_COSTS477);
// Attribution is the first allowlisted table target/reference, not a SQL plan or
// a count of internal trigger VM statements. Multiple-table/unknown calls may
// be classified as other. No SQL text, values or account identifiers leave here.
function labels(sql){
  const op=typeof sql==='string'?sql.trimStart().match(/^([A-Za-z]+)/)?.[1]?.toLowerCase():'';
  // These exact, table-free reads were previously all labelled other. Matching
  // happens once when a statement is prepared, never per bound row or request.
  if(typeof sql==='string'){
    if(/^\s*SELECT\s+changes\(\)\s+AS\s+changes\s*,\s*last_insert_rowid\(\)\s+AS\s+last_row_id\s*;?\s*$/i.test(sql))return {table:'no_table',operation:'select',source:'connection_metadata'};
    if(/^\s*SELECT\s+total_changes\(\)\s+AS\s+n\s*;?\s*$/i.test(sql))return {table:'no_table',operation:'select',source:'connection_total_changes'};
    const pragma=sql.match(/^\s*PRAGMA\s+(?:(?:main|temp)\s*\.\s*)?(schema_version|table_info|index_list|index_info)\b/i);
    if(op==='pragma')return {table:'no_table',operation:'pragma',source:pragma?'pragma_'+pragma[1].toLowerCase():'pragma_other'};
  }
  // Skip a named CTE such as writer_key and resolve its known joined table.
  // A multi-table call is counted once, under its first known reference.
  const name=typeof sql==='string'?[...sql.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+(?:(?:main|temp)\s*\.\s*)?["`\[]?([A-Za-z_]\w*)/ig)].map(match=>match[1].toLowerCase()).find(name=>tables.has(name)):undefined;
  return {table:tables.has(name)?name:'other',operation:operations.has(op)?op:'other',source:tables.has(name)?'table_sql':'other'};
}
export function writerSqlCost477(label,phase,scope){
  // One exclusive cost per execution. A context UPDATE inside replay belongs
  // to replay, not both. Trigger VM work is not separately counted.
  if(phase==='reward_capture')return 'test_reward_capture';
  if(phase==='reward_replay')return 'test_reward_replay';
  if(label.table==='loadlab_writer_context_v1')return 'test_context';
  if(scope&&costs.has(scope))return scope;
  if(label.table.startsWith('loadlab_'))return 'test_validation';
  return label.table==='other'?'unclassified':'shared_gameplay';
}
function countSql(target,label,nested,phase,scope){
  const breakdown=target.sqlBreakdown;
  add(breakdown.tables,label.table,1);add(breakdown.steps,nested?'callback':'top_level',1);add(breakdown.operations,label.operation,1);
  add(breakdown.sources,label.source,1);add(breakdown.phases,phase,1);add(breakdown.costs,writerSqlCost477(label,phase,scope),1);
}
export function recordPreparedCache477(sqlite,hit){const target=installed.get(sqlite)?.target;if(target)add(target,hit?'sqlCacheHits':'sqlCacheMisses',1);}

// Synchronous scopes only, following the writer's existing atomic callback.
// Missing instrumentation is a no-op, including when test diagnostics are off.
export function withWriterSqlPhase477(sqlite,phase,task){
  const state=installed.get(sqlite);
  if(!state?.target||!phases.has(phase))return task();
  const prior=state.phase;state.phase=phase;
  try{return task();}finally{state.phase=prior;}
}
export function withWriterSqlCost477(sqlite,cost,task){
  const state=installed.get(sqlite);
  if(!state?.target||!costs.has(cost))return task();
  const prior=state.cost;state.cost=cost;
  try{return task();}finally{state.cost=prior;}
}
export function recordWriterJobDetail477(sqlite,key,amount=1){
  const target=installed.get(sqlite)?.target;
  if(!target||!details.has(key)||!Number.isSafeInteger(amount)||amount<0)return;
  const values=target.sqlJobDetail??={},sum=(values[key]??0)+amount;
  if(Number.isSafeInteger(sum)&&sum<=1000000000)values[key]=sum;
}

export function installWriterSqlTiming477(sqlite, {now=()=>performance.now()}={}) {
  if (installed.has(sqlite)) return;
  const state = { target: null, executionDepth: 0, phase:'unclassified',cost:null };
  const prepare = sqlite.prepare, exec = sqlite.exec;
  sqlite.prepare = function(sql, ...args) {
    // A SQLite trigger can enter JS and prepare/execute another statement on
    // this connection. Its work is already inside the outer native call wall.
    const target = state.target, nested=state.executionDepth!==0;
    const started = target ? now() : 0;
    let statement;
    try { statement = Reflect.apply(prepare, this, [sql, ...args]); }
    finally { if (target) {add(target,nested?'sqlPrepareNestedWallMs':'sqlPrepareWallMs',now()-started);add(target,'sqlPrepareCalls',1);} }
    let isControl, label;
    for (const name of ['get', 'all', 'run']) {
      const invoke = statement[name];
      statement[name] = function(...bindings) {
        const target = state.target;
        if (!target || (isControl ??= control(sql))) return Reflect.apply(invoke, this, bindings);
        const outermost=state.executionDepth++===0,started=outermost?now():0,phase=state.phase,cost=state.cost;
        try { return Reflect.apply(invoke, this, bindings); }
        finally { state.executionDepth--;if(outermost)add(target, 'sqlWallMs', now() - started);add(target, 'sqlCalls', 1);countSql(target,label ??= labels(sql),!outermost,phase,cost); }
      };
    }
    return statement;
  };
  sqlite.exec = function(sql, ...args) {
    const target = state.target;
    // exec may contain several statements. Count one exec CALL, never infer
    // statement count by splitting SQL (triggers and quoted semicolons exist).
    if (!target || control(sql)) return Reflect.apply(exec, this, [sql, ...args]);
    const outermost=state.executionDepth++===0,started=outermost?now():0,phase=state.phase,cost=state.cost;
    try { return Reflect.apply(exec, this, [sql, ...args]); }
    finally { state.executionDepth--;if(outermost)add(target, 'sqlWallMs', now() - started);add(target, 'sqlCalls', 1);add(target, 'sqlExecCalls', 1);countSql(target,labels(sql),!outermost,phase,cost); }
  };
  installed.set(sqlite, state);
}

export function withWriterSqlTiming477(sqlite, target, task) {
  const state = installed.get(sqlite);
  if (!state) throw new Error('writer_sql_timing_not_installed');
  // General stage durations are recorded by LocalDatabase; this caller does
  // not consume SQL detail. Preserve any enclosing full diagnostic target.
  if (target?.[Symbol.for('coreoflife.writerStageOnly.r78')] === true) return task();
  const prior = state.target,priorPhase=state.phase,priorCost=state.cost;
  // An observed cache hit with zero preparation is a measured zero, not missing.
  for(const key of ['sqlPrepareWallMs','sqlPrepareNestedWallMs','sqlPrepareCalls','sqlCacheHits','sqlCacheMisses'])target[key]??=0;
  state.target = target;
  state.phase='unclassified';state.cost=null;
  target.sqlJobDetail??={};
  target.sqlBreakdown??={};
  for(const key of ['tables','steps','operations','sources','phases','costs'])target.sqlBreakdown[key]??={};
  try { return task(); }
  finally { state.target = prior;state.phase=priorPhase;state.cost=priorCost; }
}

// Compatibility spelling with the task-first signature used by test fixtures.
export const measureWriterSql477 = (sqlite, task, target) => withWriterSqlTiming477(sqlite, target, task);
