import fs from 'node:fs';
import {pathToFileURL} from 'node:url';
const overlap=(a,b,c,d)=>Math.max(0,Math.min(b,d)-Math.max(a,c));
const category=r=>r.action?`${r.kind}:${r.action}`:r.kind;
function totals(rows,duration){const out={};for(const r of rows){const k=category(r),v=out[k]??={count:0,totalMs:0,maxMs:0};const ms=duration(r);v.count++;v.totalMs+=ms;v.maxMs=Math.max(v.maxMs,ms);}return out;}
function union(intervals){let total=0,end=-Infinity;for(const [a,b]of intervals.sort((x,y)=>x[0]-y[0])){total+=Math.max(0,b-Math.max(end,a));end=Math.max(end,b);}return total;}
export function analyzeStartup(report){
 const p=report.writerLatency,from=p.startedAtMs,to=from+10000,rows=p.rows.filter(r=>r.enqueuedAtMs<to),byId=new Map(rows.map(r=>[r.id,r])),potions=rows.filter(r=>r.action==='use_potion'),reads=p.reads??[],commits=p.commits??[];
 const details=potions.map(r=>{
  const a=r.enqueuedAtMs,b=r.startedAtMs,executed=rows.filter(j=>j.id!==r.id&&overlap(a,b,j.startedAtMs,j.callbackEndedAtMs)>0),blockingReads=reads.filter(j=>j.synchronous&&overlap(a,b,j.startedAtMs,j.endedAtMs)>0),blockingCommits=commits.filter(j=>overlap(a,b,j.startedAtMs,j.endedAtMs)>0);
  const intervals=[...executed.map(j=>[j.startedAtMs,j.callbackEndedAtMs]),...blockingReads.map(j=>[j.startedAtMs,j.endedAtMs]),...blockingCommits.map(j=>[j.startedAtMs,j.endedAtMs])].map(([c,d])=>[Math.max(a,c),Math.min(b,d)]);
  return {actor:r.actor,key:r.key,queueMs:r.timing.queueMs,callbackMs:r.timing.callbackMs,ackAfterCallbackMs:r.ackAtMs-r.callbackEndedAtMs,aheadAtEnqueue:totals((r.ahead??[]).map(id=>byId.get(id)??{kind:'unclassified_before_probe'}),()=>0),executedDuringQueue:totals(executed,j=>overlap(a,b,j.startedAtMs,j.callbackEndedAtMs)),synchronousReadsDuringQueue:totals(blockingReads,j=>overlap(a,b,j.startedAtMs,j.endedAtMs)),commitMsDuringQueue:blockingCommits.reduce((n,j)=>n+overlap(a,b,j.startedAtMs,j.endedAtMs),0),unattributedQueueWallMs:Math.max(0,b-a-union(intervals))};
 }).sort((a,b)=>b.queueMs-a.queueMs);
 return {runId:report.runId,attempt:report.attempt,sourceSha256:report.sourceIdentity.sha256,startupDurationMs:10000,dropped:p.dropped,jobTotals:totals(rows,r=>r.timing.callbackMs??0),readTotals:totals(reads,r=>r.ms),commits:totals(commits,r=>r.ms),asyncFlushes:totals(p.flushes??[],r=>r.ms),potionDetails:details,notes:['FIFO order and raw acceptance unchanged. All100 players were admitted before timed gameplay; hydration query kinds remain reported if present.','Queue attribution uses exact complete native callback intervals, separate synchronous read and COMMIT intervals, and FIFO predecessor IDs.','Unattributed wall includes scheduling, IPC/other main work and GC; it is NOT automatically disk or background queue time. Async read/fsync intervals overlap and are not additive CPU costs.']};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){const [input,output]=process.argv.slice(2);const result=analyzeStartup(JSON.parse(fs.readFileSync(input)));fs.writeFileSync(output,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({attempt:result.attempt,jobs:result.jobTotals,reads:result.readTotals,worstPotion:result.potionDetails[0]}));}
