import {SQL_POPULATIONS477} from './writer-sql-population477.mjs';

// Diagnostics only. One classification per durable ACK, using the existing
// verified actor population. No SQL, identity, request or trigger text is kept.
export const REWARD_REASONS_R10=Object.freeze(['not_candidate','shape','schema','puzzle','community','scope']);
export const REWARD_EXCLUDED_R10=Object.freeze(['no_frame_path','receipt_replay','action_rolled_back']);
const KEYS=Object.freeze(['jobs','used','notUsed','targets','framesSaved',...REWARD_REASONS_R10.map(k=>'notUsed_'+k),...REWARD_EXCLUDED_R10.map(k=>'excluded_'+k)]);
const integer=n=>Number.isSafeInteger(n)&&n>=0;
const object=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const zero=()=>Object.fromEntries(KEYS.map(k=>[k,0]));
const reasonDetails=Object.freeze({not_candidate:'bulkRewardNotCandidate',shape:'bulkRewardFallbackShape',schema:'bulkRewardFallbackSchema',puzzle:'bulkRewardFallbackPuzzle',community:'bulkRewardFallbackCommunity',scope:'bulkRewardFallbackScope'});
const detailKeys=Object.freeze(['bulkRewardExamined','bulkRewardAttempted','bulkRewardPreparations','bulkRewardExecuted','bulkRewardTargets','bulkRewardFramesSaved',...Object.values(reasonDetails)]);
const total=(r,keys)=>keys.reduce((n,k)=>n+r[k],0);
function validRow(r){return object(r)&&KEYS.every(k=>integer(r[k]))&&r.notUsed===total(r,REWARD_REASONS_R10.map(k=>'notUsed_'+k))&&r.jobs===r.used+r.notUsed+total(r,REWARD_EXCLUDED_R10.map(k=>'excluded_'+k))&&(!r.used?r.targets===0&&r.framesSaved===0:r.targets>=r.used*2&&r.targets<=r.used*32);}
export const REWARD_LIMITS_R10='Exact counters for durably acknowledged channel writer jobs while LoadLab diagnostics are active; population uses the unchanged verified actor lease and database marker. Used means a recognized batch was prepared, executed, restored and committed without a LoadLab action rollback. Not used is counted by the actual decision reason, never inferred from SQL-call counts. No-frame-path jobs, receipt replays and rolled-back actions are excluded from used/not-used decisions. This counts preparation/execution path use, not loot awards or targets killed. Missing instrumentation, changed generation, rejected observations and regressed counters are unmeasured; no decisions is not measured zero. Snapshot interval excludes cleanup and may omit the final unobserved tail. No gameplay SQL or schema whitelist changes.';

export class WriterRewardMetricsR10{
 constructor({generation,now=Date.now}={}){if(typeof generation!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(generation))throw Error('invalid_reward_metrics_generation');this.generation=generation;this.now=now;this.rejected=0;this.rows=Object.fromEntries(SQL_POPULATIONS477.map(k=>[k,zero()]));}
 record(population,timing,{replayed=false,actionRolledBack=false}={}){
  const row=this.rows[population],raw=timing?.sqlJobDetail;
  const reject=()=>{if(this.rejected<Number.MAX_SAFE_INTEGER)this.rejected++;return false;};
  if(!row||!object(raw))return reject();
  const d=Object.fromEntries(detailKeys.map(k=>[k,raw[k]??0]));
  if(!Object.values(d).every(integer))return reject();
  const increment=zero();increment.jobs=1;
  if(replayed)increment.excluded_receipt_replay=1;
  else if(actionRolledBack)increment.excluded_action_rolled_back=1;
  else{
   const reasons=REWARD_REASONS_R10.filter(k=>d[reasonDetails[k]]>0),examined=d.bulkRewardExamined,attempted=d.bulkRewardAttempted;
   if(examined===0){if(Object.values(d).some(n=>n!==0))return reject();increment.excluded_no_frame_path=1;}
   else if(examined!==1||attempted+d.bulkRewardNotCandidate!==examined||reasons.some(k=>d[reasonDetails[k]]!==1))return reject();
   else if(d.bulkRewardExecuted===1&&d.bulkRewardPreparations===1&&attempted===1&&!reasons.length&&d.bulkRewardTargets>=2&&d.bulkRewardTargets<=32){increment.used=1;increment.targets=d.bulkRewardTargets;increment.framesSaved=d.bulkRewardFramesSaved;}
   else if(reasons.length===1&&d.bulkRewardExecuted===0&&d.bulkRewardPreparations===0&&d.bulkRewardTargets===0&&d.bulkRewardFramesSaved===0){increment.notUsed=1;increment['notUsed_'+reasons[0]]=1;}
   else return reject();
  }
  if(KEYS.some(k=>!integer(row[k]+increment[k])))return reject();
  for(const k of KEYS)row[k]+=increment[k];return true;
 }
 snapshot(){return {schema:'col-writer-reward-paths-r10-v1',generation:this.generation,observedAtMs:this.now(),rejected:this.rejected,rows:Object.fromEntries(SQL_POPULATIONS477.map(k=>[k,{...this.rows[k]}]))};}
}
export function publicWriterRewardMetricsR10(input){
 if(input?.schema!=='col-writer-reward-paths-r10-v1'||typeof input.generation!=='string'||!/^[A-Za-z0-9_.:-]{1,100}$/.test(input.generation)||!integer(input.observedAtMs)||input.observedAtMs>8640000000000000||!integer(input.rejected))return null;
 const rows={};for(const k of SQL_POPULATIONS477){if(!validRow(input.rows?.[k]))return null;rows[k]=Object.fromEntries(KEYS.map(key=>[key,input.rows[k][key]]));}
 return {schema:input.schema,generation:input.generation,observedAtMs:input.observedAtMs,rejected:input.rejected,rows};
}
export function summarizeWriterRewardMetricsR10(beforeInput,afterInput){
 const before=publicWriterRewardMetricsR10(beforeInput),after=publicWriterRewardMetricsR10(afterInput),reasons=[];
 if(!before)reasons.push('baseline_missing_or_invalid');if(!after)reasons.push('final_missing_or_invalid');
 if(before&&after){if(before.generation!==after.generation)reasons.push('process_generation_changed');if(after.observedAtMs<=before.observedAtMs)reasons.push('no_positive_snapshot_interval');if(after.rejected!==before.rejected)reasons.push('rejected_measurements');if(SQL_POPULATIONS477.some(p=>KEYS.some(k=>after.rows[p][k]<before.rows[p][k])))reasons.push('counter_regressed');}
 const available=reasons.length===0,rows={};
 for(const p of SQL_POPULATIONS477){let row={measured:false,jobs:null,decisions:null,used:null,notUsed:null,notUsedByReason:null,excluded:null,targets:null,framesSaved:null};if(available){const delta=Object.fromEntries(KEYS.map(k=>[k,after.rows[p][k]-before.rows[p][k]])),decisions=delta.used+delta.notUsed;row={measured:decisions>0,jobs:delta.jobs,decisions,used:decisions?delta.used:null,notUsed:decisions?delta.notUsed:null,notUsedByReason:decisions?Object.fromEntries(REWARD_REASONS_R10.map(k=>[k,delta['notUsed_'+k]])):null,excluded:Object.fromEntries(REWARD_EXCLUDED_R10.map(k=>[k,delta['excluded_'+k]])),targets:decisions?delta.targets:null,framesSaved:decisions?delta.framesSaved:null};}rows[p]=row;}
 return {schema:'col-writer-reward-path-summary-r10-v1',available,reasons:[...new Set(reasons)],limits:REWARD_LIMITS_R10,fromAtMs:before?.observedAtMs??null,toAtMs:after?.observedAtMs??null,rows};
}
