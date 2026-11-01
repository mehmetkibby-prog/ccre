import {runtimePerformance} from '../../../native510-bb3a6cc689c6/vds-server/src/runtime-performance.mjs';
import {writerLaneSnapshotR80} from './writer-lane-r533.mjs';

const number=value=>Number.isFinite(value)&&value>=0&&value<=1e15?Math.round(value*100)/100:null;
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const select=(source,keys)=>Object.fromEntries(keys.map(key=>[key,number(source?.[key])]));
const reasons=new Set(['disabled','sqlite-version','not-ready','closed','checkpoint-backlog','checkpoint-timeout','checkpoint-error','checkpoint-result','connection-configuration','worker-start','worker-start-timeout','worker-error','worker-message','worker-sqlite-version','worker-exit','worker-close']);
const reason=value=>value===null||value===undefined?null:reasons.has(value)?value:'unknown';
const states=new Set(['starting','ready','fallback','retry-wait','probing','retry-exhausted','closed']);

// All public fields are selected numeric/boolean values or fixed enums. Never
// return a native error, path, SQL, owner identity or whole diagnostic object.
export function publicCheckpointR80(source){
 const retry=source?.retryR80,probe=source?.recoveryProbe;
 return {ready:source?.ready===true,fallback:reason(source?.fallback),running:source?.running===true,pendingPages:count(source?.pendingPages),
  retryR80:retry?{state:states.has(retry.state)?retry.state:'unknown',attempts:count(retry.attempts),consecutiveAttempts:count(retry.consecutiveAttempts),maxAttempts:count(retry.maxAttempts),nextRetryAtMs:count(retry.nextRetryAtMs),recoveries:count(retry.recoveries),lastFallback:reason(retry.lastFallback),lastRecoveredAtMs:count(retry.lastRecoveredAtMs),retryAllowed:retry.retryAllowed===true}:null,
  recoveryProbe:probe?{active:probe.active===true,attempts:count(probe.attempts),healthyPasses:count(probe.healthyPasses),requiredHealthyPasses:count(probe.requiredHealthyPasses),nextProbeAtMs:count(probe.nextProbeAtMs)}:null};
}

// This is a read of existing counters. It does not start a profiler, perform
// SQL, send channel IPC, add timers or wait for a write/flush to complete.
export function runtimeHealthR80(core,{nowMs=Date.now(),processSnapshot=null}={}){
 try{
  const p=processSnapshot??runtimePerformance().snapshot(),current=p.current;
  const age=nowMs-current?.sampledAtMs,fresh=Number.isFinite(age)&&age>=0&&age<=7000;
  const lane=writerLaneSnapshotR80(core.database),sync=core.database?.walSync,flush=sync?.snapshot();
  const commits=core.diagnostics?.writerStallsR79?.snapshot(),worker=core.writer?.rewardWorkerR533;
  return {protocol:'runtime-diagnostics-r80-v1',available:true,measuredAtMs:nowMs,scope:'server-process-and-durable-write-wait-not-player-ping',
   main:{status:!current?'unavailable':fresh?'live':'stale',sampleSeconds:2,sampledAtMs:count(current?.sampledAtMs),eventLoopBusyPercent:fresh&&number(current.loopUtilization)!==null&&current.loopUtilization<=1?number(current.loopUtilization*100):null,eventLoopDelayMs:fresh?number(current.loopExcessMs):null,
    cpu:{scope:'process-all-threads-one-core-is-100-percent',windowSeconds:300,resolutionPercentPoints:10,sampleCount:count(p.samples),meanPercent:fresh&&number(p.cpuCoresMean)!==null?number(p.cpuCoresMean*100):null,maxPercent:fresh&&number(p.cpuCoresMax)!==null?number(p.cpuCoresMax*100):null}},
   writerLane:lane?{protocol:'single-writer-lane-v1',externalBusy:lane.externalBusy===true,...select(lane,['externalAgeMs','queuedWrites','queuedExternal','oldestQueuedAgeMs','nativeWrites','completedExternal','maxExternalMs'])}:null,
   walSync:flush?{scope:'async-WAL-flush-service-wall-time-including-libuv-and-callback-scheduling-excluding-preflush-queue',ready:flush.ready===true,fallback:Boolean(sync.failed),running:Boolean(sync.running),queuedForNextFlush:count(sync.waiting?.length),pumpedCallsTotal:count(flush.waiters),...select(flush,['syncs','meanMs','maxMs','totalMs','errors','reopened'])}:null,
   mainCommits:commits?{scope:'main-connection-SQLite-COMMIT-wall-time',...select(commits,['slowCommits','lastCommitMs','maxCommitMs','lastSlowAtMs'])}:null,
   rewardWorker:worker?{scope:'completed-worker-jobs-not-current-job-latency',pending:Boolean(worker.slot?.pending),...select(worker.stats,['jobs','fallbacks','replays','rollbacks','restarts','maxWorkerMs','maxPreflightMs','maxReadyWaitMs'])}:null};
 }catch{return {protocol:'runtime-diagnostics-r80-v1',available:false};}
}
