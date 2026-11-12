import {PERFORMANCE_POLICY as P} from '../performance-policy.mjs';
// Explicit resumption after historical STOP18. Preserve all earlier evidence.
export const RESUMED_FIRST_RUN=19;
export function worstChannel(r){return r?.status==='measured'&&r.sourceUnchanged===true&&r.channels?.length===4&&r.channels.every(c=>Number.isFinite(c.maxPauseMs))?Math.max(...r.channels.map(c=>c.maxPauseMs)):Infinity;}
export function failedCriteria(r){
 const failures=[];const limit=(name,n,max)=>{if(!Number.isFinite(n)||n<0||n>max)failures.push(name);};
 if(r?.status!=='measured'||r.sourceUnchanged!==true)return ['measurement_invalid'];
 for(const c of r.channels??[]){limit(`channel-${c.channel}:tick_p95`,c.tickP95Ms,P.tickP95Ms);limit(`channel-${c.channel}:tick_p99`,c.tickP99Ms,P.tickP99Ms);}
 for(const row of r.measurement?.eventLoops??[])limit(row.target+':pause',row.maxPauseMs,P.maxPauseMs);
 limit('input:p99',r.inputResponses?.p99Ms,P.inputP99Ms);limit('input:max',r.inputResponses?.maxMs,P.inputMaxMs);
 limit('main:elu',r.writer?.elu,P.mainElu);limit('core:ram',r.resources?.maxRssBytes,P.maxRssBytes);
 // Numeric criteria count once, even when several validators flag them.
 for(const f of r.performanceAcceptance?.failures??[]){if(['channel_targets','writer_targets','host_targets','input_response_targets'].includes(f)||/^runtime_(pause|elu|rss):/.test(f))continue;failures.push(f);}
 if(!r.performanceAcceptance)failures.push('acceptance_missing');
 if(r.performanceAcceptance?.passed===false&&!failures.length)failures.push('structural_acceptance_failure');
 return [...new Set(failures)];
}
export function progressPoint(r){return {failedCriteria:failedCriteria(r),inputMaxMs:r?.status==='measured'&&r.sourceUnchanged===true&&Number.isFinite(r.inputResponses?.maxMs)?r.inputResponses.maxMs:Infinity,channelMaxMs:worstChannel(r)};}
export function nonDecreasingRuns(history){
 let count=0,before=progressPoint(history[RESUMED_FIRST_RUN-2]);
 for(let i=RESUMED_FIRST_RUN-1;i<history.length;i++){
  if(history[i].measurementStarted===false)continue;
  const after=progressPoint(history[i]),invalid=history[i].status!=='measured'||history[i].sourceUnchanged!==true;
  const improved=!invalid&&(after.failedCriteria.length<before.failedCriteria.length||after.inputMaxMs<before.inputMaxMs||after.channelMaxMs<before.channelMaxMs);
  count=improved?0:count+1;if(!invalid)before=after;
 }return count;
}
export const RESUMED_POLICY=Object.freeze({firstRun:19,baselineRun:18,maximumRuns:null,stopAfterNonDecreasingRuns:3,stopConjunction:['failed criterion count does not decrease','true input maximum does not decrease','raw worst channel pause does not decrease'],requiredConsecutivePasses:2,rawPauseLimitMs:150,localExclusionsApplied:0,startupDurationMs:10000,authorization:'2026-10-14 20:54 Europe/Istanbul: reset counter and resume; stop only after THREE consecutive runs with no reduction in failed criterion count AND neither true input maximum nor raw channel maximum decreases. Input maximum includes potions. All acceptance thresholds and safety/economy/V510/capacity unchanged.'});
