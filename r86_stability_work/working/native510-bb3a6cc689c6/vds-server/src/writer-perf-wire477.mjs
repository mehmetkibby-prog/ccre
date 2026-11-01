import {SQL_TABLES477,SQL_STEPS477,SQL_OPERATIONS477,SQL_SOURCES477,SQL_PHASES477,SQL_JOB_KINDS477,SQL_JOB_DETAIL_KEYS477,SQL_COSTS477} from './writer-sql-labels477.mjs';
export {SQL_TABLES477,SQL_STEPS477,SQL_OPERATIONS477,SQL_SOURCES477,SQL_PHASES477,SQL_JOB_KINDS477,SQL_JOB_DETAIL_KEYS477,SQL_COSTS477} from './writer-sql-labels477.mjs';
// Fixed, bounded diagnostics. No SQL, parameter values or game identities cross this wire.
export const WRITER_TIMING_KEYS=Object.freeze(['writer_batch_queue_wall','writer_sql_wall','writer_sql_prepare_wall','writer_sql_prepare_nested_wall','writer_job_wall','writer_transaction_wall','writer_commit_wall','writer_durable_wall','writer_fsync_wait_wall','writer_cohort_ack_wall']);
export const WRITER_JOB_COUNT_KEYS=Object.freeze(['sqlCalls','sqlPrepareCalls','sqlCacheHits','sqlCacheMisses']);
export const WRITER_JOB_MS_KEYS=Object.freeze(['sqlPrepareWallMs','sqlPrepareNestedWallMs']);
export const WRITER_BREAKDOWN_KEYS=Object.freeze({tables:SQL_TABLES477,steps:SQL_STEPS477,operations:SQL_OPERATIONS477,sources:SQL_SOURCES477,phases:SQL_PHASES477,costs:SQL_COSTS477});
export const WRITER_HEAVY_THRESHOLD477=100;
const count=n=>Number.isSafeInteger(n)&&n>=0&&n<=1000000000?n:null;
const wall=n=>Number.isFinite(n)&&n>=0&&n<=120000?Math.round(n*1000)/1000:null;
const object=input=>!!input&&typeof input==='object'&&!Array.isArray(input);
const modes=new Set(['async-wal-fsync','sync-wal-fsync','sqlite-full','recovery-wal-fsync']);
const jobKinds=new Set(SQL_JOB_KINDS477);
const pickCounts=(input,keys)=>Object.fromEntries(keys.flatMap(key=>count(input?.[key])!==null&&input[key]>0?[[key,input[key]]]:[]));
const sum=input=>Object.values(input).reduce((n,value)=>n+value,0);
export function sanitizeSqlBreakdown477(input){
 if(!object(input))return null;
 // Missing R5 dimensions stay absent. An empty R6 object means measured zero.
 return Object.fromEntries(Object.entries(WRITER_BREAKDOWN_KEYS).flatMap(([dimension,keys])=>object(input[dimension])?[[dimension,pickCounts(input[dimension],keys)]]:[]));
}
export function sanitizeWriterJobDetail477(input){return object(input)?pickCounts(input,SQL_JOB_DETAIL_KEYS477):null;}
export function sanitizeWriterBatch477(row){
 if(!object(row)||typeof row.id!=='string'||!/^\d{1,12}-\d{1,16}$/.test(row.id)||!Number.isSafeInteger(row.size)||row.size<1||row.size>1000000)return null;
 const extra=Object.fromEntries([...WRITER_JOB_COUNT_KEYS.slice(1).flatMap(key=>count(row[key])!==null?[[key,row[key]]]:[]),...WRITER_JOB_MS_KEYS.flatMap(key=>wall(row[key])!==null?[[key,wall(row[key])]]:[])]),sqlBreakdown=sanitizeSqlBreakdown477(row.sqlBreakdown),sqlJobDetail=sanitizeWriterJobDetail477(row.sqlJobDetail);
 if(sqlBreakdown?.costs&&sum(sqlBreakdown.costs)!==row.sqlCalls)delete sqlBreakdown.costs;
 return {id:row.id,size:row.size,sqlCalls:count(row.sqlCalls),sqlExecCalls:count(row.sqlExecCalls),...extra,...(sqlBreakdown?{sqlBreakdown}:{}),...(sqlJobDetail?{sqlJobDetail}:{}),...(jobKinds.has(row.sqlJobKind)?{sqlJobKind:row.sqlJobKind}:{}),durabilityMode:modes.has(row.durabilityMode)?row.durabilityMode:null,flushId:typeof row.flushId==='string'&&/^[a-f0-9]{32}$/.test(row.flushId)?row.flushId:null,replayed:row.replayed===true};
}
// A heavy row is a descriptive example of an already-counted write, never an
// extra observation for latency or SQL percentiles. Table counts are top-eight
// and omittedTableCalls retains the exact remainder; sources/phases stay whole.
export function sanitizeHeavyJob477(row){
 if(!object(row)||!Number.isSafeInteger(row.writeOrdinal)||row.writeOrdinal<1||row.writeOrdinal>1000000000||typeof row.batchId!=='string'||!/^\d{1,12}-\d{1,16}$/.test(row.batchId)||count(row.sqlCalls)===null||row.sqlCalls<WRITER_HEAVY_THRESHOLD477)return null;
 const tables=pickCounts(row.tables,SQL_TABLES477),omittedTableCalls=count(row.omittedTableCalls);
 if(Object.keys(tables).length>8||omittedTableCalls===null||sum(tables)+omittedTableCalls!==row.sqlCalls)return null;
 const sources=object(row.sources)?pickCounts(row.sources,SQL_SOURCES477):null,phases=object(row.phases)?pickCounts(row.phases,SQL_PHASES477):null,costs=object(row.costs)?pickCounts(row.costs,SQL_COSTS477):null,sqlJobDetail=sanitizeWriterJobDetail477(row.sqlJobDetail);
 if(sources&&sum(sources)!==row.sqlCalls||phases&&sum(phases)!==row.sqlCalls||costs&&sum(costs)!==row.sqlCalls)return null;
 return {writeOrdinal:row.writeOrdinal,batchId:row.batchId,sqlCalls:row.sqlCalls,...(jobKinds.has(row.sqlJobKind)?{sqlJobKind:row.sqlJobKind}:{}),...(sqlJobDetail?{sqlJobDetail}:{}),tables,omittedTableCalls,...(sources?{sources}:{}),...(phases?{phases}:{}),...(costs?{costs}:{}),replayed:row.replayed===true};
}
export function writerHeavyJob477(row,writeOrdinal){
 if(count(row?.sqlCalls)===null||row.sqlCalls<WRITER_HEAVY_THRESHOLD477||!object(row.sqlBreakdown?.tables))return null;
 const ordered=Object.entries(row.sqlBreakdown.tables).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0])),tables=Object.fromEntries(ordered.slice(0,8));
 return sanitizeHeavyJob477({writeOrdinal,batchId:row.id,sqlCalls:row.sqlCalls,sqlJobKind:row.sqlJobKind,sqlJobDetail:row.sqlJobDetail,tables,omittedTableCalls:ordered.slice(8).reduce((n,row)=>n+row[1],0),sources:row.sqlBreakdown.sources,phases:row.sqlBreakdown.phases,costs:row.sqlBreakdown.costs,replayed:row.replayed});
}
export const WRITER_TOTAL_KEYS=Object.freeze(['writes','groupedWrites','sqlMeasuredWrites','sqlCalls','sqlExecCalls','fsyncMeasuredWrites','sqlPrepareMeasuredWrites','sqlPrepareCalls','sqlCacheHits','sqlCacheMisses','sqlPrepareWallMicros','sqlPrepareNestedWallMicros','sqlBreakdownMeasuredWrites','sqlSourceMeasuredWrites','sqlPhaseMeasuredWrites','sqlJobDetailMeasuredWrites','sqlCostMeasuredWrites','sharedGameplaySqlCalls','testOnlySqlCalls','unclassifiedSqlCalls']);
export function sanitizeWriterPerf477(input){
 if(!object(input)||input.schema!=='col-writer-evidence-v1')return null;
 const batches=Array.isArray(input.batches)?input.batches.slice(0,8).map(sanitizeWriterBatch477).filter(Boolean).map(({sqlBreakdown,...row})=>row):[];
 const totals=Object.fromEntries(WRITER_TOTAL_KEYS.map(key=>[key,count(input.totals?.[key])]));
 const sqlBreakdown=sanitizeSqlBreakdown477(input.sqlBreakdown);
 const heavyMeasuredWrites=count(input.heavyMeasuredWrites),heavyJobs=Array.isArray(input.heavyJobs)?input.heavyJobs.slice(0,2).map(sanitizeHeavyJob477).filter(Boolean):[];
 const heavy=input.heavyJobThreshold===WRITER_HEAVY_THRESHOLD477&&heavyMeasuredWrites!==null&&heavyMeasuredWrites>=heavyJobs.length?{heavyJobThreshold:WRITER_HEAVY_THRESHOLD477,heavyMeasuredWrites,heavyJobs,omittedHeavyJobs:Math.max(count(input.omittedHeavyJobs)??0,heavyMeasuredWrites-heavyJobs.length)}:{};
 return {schema:'col-writer-evidence-v1',batches,omitted:count(input.omitted),totals,...(sqlBreakdown?{sqlBreakdown}:{}),...(count(input.omittedSqlBreakdownWrites)!==null?{omittedSqlBreakdownWrites:input.omittedSqlBreakdownWrites}:{}),...heavy};
}
export function boundWriterPerf477(input){
 const result=sanitizeWriterPerf477(input);if(!result)return null;
 // Preserve exact totals and ordinary samples before optional heavy examples.
 while(JSON.stringify(result).length>4096&&result.heavyJobs?.length){result.heavyJobs.pop();result.omittedHeavyJobs++;}
 while(JSON.stringify(result).length>4096&&result.batches.length){result.batches.pop();result.omitted=(result.omitted??0)+1;}
 if(JSON.stringify(result).length>4096&&result.sqlBreakdown){delete result.sqlBreakdown;result.omittedSqlBreakdownWrites=result.totals.sqlBreakdownMeasuredWrites;}
 return result;
}

// Reasons describe the existing in-process memory-combat decision only.
// A compute-worker decision has no parent request context and remains missing.
export const COMBAT_PATH_KEYS=Object.freeze(['attempts','disabled','not_accepting','target_locked','dirty_overdue','target_missing','spawn_changed','lethal','stone','resulting_death','changed_noncombat','guard_rejected','memory_accepted','durable_required','durable_cast']);
export function sanitizeCombatPath477(input){
 if(!input||input.schema!=='col-combat-path-v1'||input.scope!=='native-resident-only'||!input.counts||typeof input.counts!=='object'||Array.isArray(input.counts))return null;
 return {schema:'col-combat-path-v1',scope:'native-resident-only',counts:Object.fromEntries(COMBAT_PATH_KEYS.map(key=>[key,Number.isSafeInteger(input.counts[key])&&input.counts[key]>=0&&input.counts[key]<=65535?input.counts[key]:null])),capped:input.capped===true};
}
