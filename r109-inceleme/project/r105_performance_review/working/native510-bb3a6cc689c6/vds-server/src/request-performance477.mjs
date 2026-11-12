import {WRITER_TIMING_KEYS,WRITER_TOTAL_KEYS,WRITER_BREAKDOWN_KEYS,WRITER_HEAVY_THRESHOLD477,writerHeavyJob477,sanitizeWriterBatch477,boundWriterPerf477,COMBAT_PATH_KEYS} from './writer-perf-wire477.mjs';
import {AsyncLocalStorage} from 'node:async_hooks';
import {randomBytes} from 'node:crypto';
const context=new AsyncLocalStorage();
const phases=new Set(['body','session','csrf','seed','pre_reads','reads','pvp_validation','pvp_commit','pve_retaliation','pve_validation','finish','prepare','snapshot','response','move','total']);
const extras=new Set(['native_ingress_session','native_owner_wall','native_total','writer_queue_wall','writer_rpc_wall','world_snapshot_wall',...WRITER_TIMING_KEYS]);
let epoch=-1,logged=0,dropped=0;
const number=n=>Number.isFinite(n)&&n>=0&&n<=120000?Math.round(n*1000)/1000:null;
export const requestPerf477=()=>context.getStore();
export function perfStage477(name,ms){const c=context.getStore(),n=number(ms);if(c&&!c.closed&&n!==null&&(extras.has(name)||name.startsWith('server_')&&phases.has(name.slice(7))))c.timing[name]=number((c.timing[name]??0)+n);}
export function recordWriterPerf477(timing,batch){
 const c=context.getStore();if(!c||c.closed)return;
 for(const key of WRITER_TIMING_KEYS)if(timing?.[key]!==undefined)perfStage477(key,timing[key]);
 const row=sanitizeWriterBatch477(batch);if(!row)return;
 const writer=c.perf.writer??={schema:'col-writer-evidence-v1',batches:[],omitted:0,totals:Object.fromEntries(WRITER_TOTAL_KEYS.map(key=>[key,0])),heavyJobThreshold:WRITER_HEAVY_THRESHOLD477,heavyMeasuredWrites:0,heavyJobs:[],omittedHeavyJobs:0};
 writer.totals.writes++;if(row.size>1)writer.totals.groupedWrites++;
 if(row.sqlCalls!==null){writer.totals.sqlMeasuredWrites++;writer.totals.sqlCalls+=row.sqlCalls;writer.totals.sqlExecCalls+=row.sqlExecCalls??0;}
 if(number(timing?.writer_fsync_wait_wall)!==null)writer.totals.fsyncMeasuredWrites++;
 if(row.sqlPrepareWallMs!==undefined&&row.sqlPrepareNestedWallMs!==undefined&&row.sqlPrepareCalls!==undefined&&row.sqlCacheHits!==undefined&&row.sqlCacheMisses!==undefined){
  writer.totals.sqlPrepareMeasuredWrites++;for(const key of ['sqlPrepareCalls','sqlCacheHits','sqlCacheMisses'])writer.totals[key]+=row[key];
  writer.totals.sqlPrepareWallMicros+=Math.round(row.sqlPrepareWallMs*1000);writer.totals.sqlPrepareNestedWallMicros+=Math.round(row.sqlPrepareNestedWallMs*1000);
 }
 if(row.sqlBreakdown){writer.totals.sqlBreakdownMeasuredWrites++;writer.sqlBreakdown??={};
  for(const [dimension,keys] of Object.entries(WRITER_BREAKDOWN_KEYS))if(row.sqlBreakdown[dimension]){
   writer.sqlBreakdown[dimension]??={};
   for(const key of keys)if(row.sqlBreakdown[dimension][key])writer.sqlBreakdown[dimension][key]=(writer.sqlBreakdown[dimension][key]??0)+row.sqlBreakdown[dimension][key];
  }
  if(row.sqlBreakdown.sources)writer.totals.sqlSourceMeasuredWrites++;
  if(row.sqlBreakdown.phases)writer.totals.sqlPhaseMeasuredWrites++;
  if(row.sqlBreakdown.costs){writer.totals.sqlCostMeasuredWrites++;const costs=row.sqlBreakdown.costs;writer.totals.sharedGameplaySqlCalls+=costs.shared_gameplay??0;writer.totals.unclassifiedSqlCalls+=costs.unclassified??0;for(const key of ['test_reward_capture','test_reward_replay','test_context','test_validation'])writer.totals.testOnlySqlCalls+=costs[key]??0;}
 }
 if(row.sqlJobDetail)writer.totals.sqlJobDetailMeasuredWrites++;
 if(row.sqlCalls!==null&&row.sqlCalls>=WRITER_HEAVY_THRESHOLD477){
  writer.heavyMeasuredWrites++;
  const heavy=writerHeavyJob477(row,writer.totals.writes);
  if(heavy){writer.heavyJobs.push(heavy);writer.heavyJobs.sort((a,b)=>b.sqlCalls-a.sqlCalls||a.writeOrdinal-b.writeOrdinal);if(writer.heavyJobs.length>2)writer.heavyJobs.pop();}
  writer.omittedHeavyJobs=writer.heavyMeasuredWrites-writer.heavyJobs.length;
 }
 const {sqlBreakdown,...detail}=row;
 if(writer.batches.length<8)writer.batches.push(detail);else writer.omitted++;
}
export function recordCombatPath477(reason){
 const c=context.getStore();if(!c||c.closed||!COMBAT_PATH_KEYS.includes(reason))return;
 const path=c.perf.combatPath??={schema:'col-combat-path-v1',scope:'native-resident-only',counts:Object.fromEntries(COMBAT_PATH_KEYS.map(key=>[key,0])),capped:false};
 if(path.counts[reason]<65535)path.counts[reason]++;else path.capped=true;
}
export function actionTiming477(){const c=context.getStore();let previous=performance.now();return {action:'',mark(stage){if(!c||c.closed||!phases.has(stage))return;const at=performance.now();perfStage477('server_'+stage,at-previous);previous=at;}};}
export function recordHttpTiming477(value){if(typeof value!=='string'||value.length>2048)return;for(const field of value.split(',')){const m=/^\s*([a-z_]+);dur=([0-9]+(?:\.[0-9]+)?)\s*$/.exec(field);if(m&&phases.has(m[1]))perfStage477('server_'+m[1],Number(m[2]));}}
export async function measureRequest477(kind,playerId,task,ingressStarted,worldMode){
 const run=globalThis.__colLoadLab?.playerRun(playerId);
 if(!run||!['world','attack','move'].includes(kind))return {result:await task()};
 const at=performance.now(),started=Number.isFinite(ingressStarted)&&ingressStarted<=at?ingressStarted:at;
 const c={perf:{requestId:randomBytes(16).toString('hex'),serverAtMs:Date.now()-Math.round(at-started)},kind,worldMode:kind==='world'&&['full','combat','compact','owner'].includes(worldMode)?worldMode:undefined,timing:{},started};
 return context.run(c,async()=>{
  try{const result=await task();perfStage477('native_total',performance.now()-c.started);finish(c,result?.status??200);c.closed=true;return {result,timing:{...c.timing},perf:{...c.perf}};}
  catch(error){perfStage477('native_total',performance.now()-c.started);finish(c,null,'thrown');c.closed=true;throw error;}
 });
}
function finish(c,status,outcome='response'){
 if(c.perf.writer)c.perf.writer=boundWriterPerf477(c.perf.writer);
 if(c.timing.native_total<200)return;
 const minute=Math.floor(Date.now()/60000);if(minute!==epoch){epoch=minute;logged=0;}
 if(logged>=20){dropped++;return;}logged++;
 try{console.info('native_request_timing',JSON.stringify({version:1,...c.perf,pid:process.pid,channel:Number(process.env.CORE_CHANNEL_ID)||0,operation:c.kind,requestWorldMode:c.worldMode,status,outcome,stages:c.timing,droppedSlowEvents:dropped,droppedScope:'process-lifetime',scope:'test-request-elapsed-wall; nested-stages-overlap; no-cpu-attribution'}));}catch{}
}
export function attachHttpPerf477(response,record){
 if(!record.perf)return;if(record.perf.combatPath)response.headers.set('X-Col-Perf-Combat',JSON.stringify(record.perf.combatPath));if(record.perf.writer)response.headers.set('X-Col-Perf-Writer',JSON.stringify(record.perf.writer));response.headers.set('X-Col-Perf-Id',record.perf.requestId);response.headers.set('X-Col-Perf-At-Ms',String(record.perf.serverAtMs));
 const stages=Object.entries(record.timing).filter(([name])=>extras.has(name)).map(([name,ms])=>`${name};dur=${ms}`);
 if(stages.length)response.headers.set('Server-Timing',[response.headers.get('Server-Timing'),...stages].filter(Boolean).join(', '));
}
