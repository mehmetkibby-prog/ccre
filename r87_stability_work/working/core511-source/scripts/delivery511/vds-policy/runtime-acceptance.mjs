import {PERFORMANCE_POLICY as P,pauseLimit} from './performance-policy.mjs';
import {LOAD_TARGETS,LOAD_WINDOW_PROTOCOL} from '../../core511/load-contract.mjs';
const finite=(n,min,max)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
export function measuredResources(eventLoops){
 const processes=eventLoops.filter(row=>row.threadId===0);return {cpuBudget:4,totalCpuFraction:processes.reduce((sum,row)=>sum+row.processCpuMs/row.durationMs,0)/4,maxRssBytes:processes.reduce((sum,row)=>sum+row.maxRssBytes,0)};
}
export function validateRuntimeMeasurements(report,{durationMs,transport}={}){
 const failures=[],m=report?.measurement,rows=m?.eventLoops;
 if(!/^[a-f0-9-]{36}$/.test(m?.runId??'')||!Array.isArray(rows)||rows.length!==LOAD_TARGETS.length||new Set(rows.map(r=>r?.target)).size!==LOAD_TARGETS.length||LOAD_TARGETS.some(target=>!rows.some(r=>r?.target===target)))return ['runtime_inventory'];
 const identities=new Set(),incarnations=new Set();
 for(const row of rows){
  if(row.protocol!==LOAD_WINDOW_PROTOCOL||row.runId!==m.runId||row.complete!==true||typeof row.incarnation!=='string'||!row.incarnation.length||!Number.isSafeInteger(row.pid)||row.pid<1||!Number.isSafeInteger(row.threadId)||row.threadId<0||!finite(row.durationMs,durationMs,Infinity)||!Number.isSafeInteger(row.delaySamples)||row.delaySamples<1||!Number.isSafeInteger(row.timerSamples)||row.timerSamples<1||!finite(row.histogramMaxPauseMs,0,Infinity)||!finite(row.timerMaxPauseMs,0,Infinity)||row.maxPauseMs!==Math.max(row.histogramMaxPauseMs,row.timerMaxPauseMs))failures.push('runtime_scope:'+row.target);
  identities.add(row.pid+':'+row.threadId);incarnations.add(row.incarnation);
  if(!finite(row.maxPauseMs,0,pauseLimit(row.target)))failures.push('runtime_pause:'+row.target);
  if(!finite(row.elu,0,row.target==='main' ? P.mainElu : 1))failures.push('runtime_elu:'+row.target);
  if(row.threadId===0?(!finite(row.processCpuMs,0,Infinity)||!finite(row.maxRssBytes,1,P.maxRssBytes)):(row.processCpuMs!==null||row.maxRssBytes!==null))failures.push('runtime_process_resources:'+row.target);
 }
 if(identities.size!==7||incarnations.size!==7)failures.push('runtime_identity');
 const main=rows.find(r=>r.target==='main'),reader=rows.find(r=>r.target==='reader'),owners=rows.filter(r=>!['main','reader'].includes(r.target)),pids=new Set(rows.map(r=>r.pid));
 const processModel=pids.size===6&&main.threadId===0&&reader.pid===main.pid&&reader.threadId>0&&owners.every(r=>r.threadId===0&&r.pid!==main.pid)&&new Set(owners.map(r=>r.pid)).size===5;
 const threadModel=transport==='message-channel'&&pids.size===1&&main.threadId===0&&rows.filter(r=>r!==main).every(r=>r.threadId>0);
 if(!processModel&&!threadModel)failures.push('runtime_topology');
 const resources=measuredResources(rows);
 if(!finite(resources.totalCpuFraction,0,1)||!finite(resources.maxRssBytes,1,P.maxRssBytes)||!finite(report?.resources?.totalCpuFraction,0,1)||Math.abs(report.resources.totalCpuFraction-resources.totalCpuFraction)>1e-12||report?.resources?.maxRssBytes!==resources.maxRssBytes)failures.push('runtime_host_totals');
 return failures;
}
