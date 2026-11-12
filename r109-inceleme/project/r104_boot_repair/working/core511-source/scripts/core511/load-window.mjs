import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {threadId} from 'node:worker_threads';
import {demand} from './contract.mjs';
import {LOAD_WINDOW_PROTOCOL,LOAD_TARGETS} from './load-contract.mjs';
const validRun=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const probe=()=>new Promise(resolve=>setTimeout(resolve,5));
// Bounded witnesses only: the same unadjusted gaps still decide acceptance.
// Wall timestamps let a pause be compared with native work/GC observations.
function witness(h,kind,ms,at){if(h.pauseWitnesses.length<8192)h.pauseWitnesses.push({kind,startedAtMs:performance.timeOrigin+at-ms,endedAtMs:performance.timeOrigin+at,ms});else h.droppedPauseWitnesses++;}
function recordGap(h,at){const ms=at-h.lastProbe;h.maxGap=Math.max(h.maxGap,ms);if(h.lastProbe<h.started+10000)h.segmentTimerMax.startup=Math.max(h.segmentTimerMax.startup,ms);if(at>=h.started+10000)h.segmentTimerMax.normal=Math.max(h.segmentTimerMax.normal,ms);if(!h.segmentBoundary&&at>=h.started+10000)h.segmentBoundary={at,elu:performance.eventLoopUtilization()};if(ms>50)witness(h,'timer',ms,at);if(ms>=20){h.slowGaps.push({startedAtMs:performance.timeOrigin+h.lastProbe,endedAtMs:performance.timeOrigin+at,ms});h.slowGaps.sort((a,b)=>b.ms-a.ms);h.slowGaps.length=Math.min(20,h.slowGaps.length);}}
function captureHistogram(h,at){
 const ms=h.delay.max/1e6;
 if(ms>50){
  // Preserve EVERY segment's original max and count before clearing its bins.
  // This detects later smaller violations too; no full-window sample or peak
  // is removed from the raw acceptance statistics.
  h.capturedHistogramMax=Math.max(h.capturedHistogramMax,ms);h.capturedHistogramSamples+=h.delay.count;witness(h,'histogram',ms,at);h.delay.reset();
 }
}

// Private diagnostics only, with no timer or observer while idle. One raw
// histogram aggregate and raw timer gaps span the entire requested window:
// no sample discard, resolution subtraction, or raw GC/OS exclusion. CPU is process-wide and
// is reported only by thread0, so the read worker is never counted twice.
export class LoadWindow {
 constructor({target,incarnation}){demand(LOAD_TARGETS.includes(target)&&typeof incarnation==='string'&&incarnation.length>0,'load_window_identity');this.identity={protocol:LOAD_WINDOW_PROTOCOL,target,incarnation,pid:process.pid,threadId};this.active=null;this.last=null;}
 async command({operation,runId}={}){
  demand(validRun(runId),'load_window_run');
  if(operation==='begin'){
   demand(!this.active,'load_window_busy');const delay=monitorEventLoopDelay({resolution:1}),h={runId,delay,phase:'starting',expiry:null,timer:null,pending:null};this.active=h;this.last=null;delay.enable();
   try{
    await probe();demand(this.active===h,'load_window_cancelled');delay.reset();h.started=performance.now();h.cpu=process.cpuUsage();h.elu=performance.eventLoopUtilization();h.phase='running';h.lastProbe=h.started;h.maxGap=0;h.timerSamples=0;h.slowGaps=[];h.pauseWitnesses=[];h.droppedPauseWitnesses=0;h.capturedHistogramMax=0;h.capturedHistogramSamples=0;h.segmentTimerMax={startup:0,normal:0};h.segmentBoundary=null;
    // A histogram reset may miss work before its next internal probe. The
    // explicit first/final monotonic gap covers both edges of the interval.
    h.timer=setInterval(()=>{const at=performance.now();recordGap(h,at);captureHistogram(h,at);h.lastProbe=at;h.timerSamples++;},1);h.timer.unref();
    h.expiry=setTimeout(()=>{if(this.active===h)this.close();},900000);h.expiry.unref();return {...this.identity,runId,started:true};
   }catch(error){if(this.active===h)this.close();throw error;}
  }
  if(operation==='cancel'){if(this.active){demand(this.active.runId===runId,'load_window_fenced');this.close();}return {...this.identity,runId,cancelled:true};}
  demand(operation==='end','load_window_operation');if(this.last?.runId===runId)return structuredClone(this.last);
  const h=this.active;demand(h?.runId===runId&&['running','ending'].includes(h.phase),'load_window_fenced');if(h.pending)return h.pending;h.phase='ending';
  h.pending=(async()=>{
   // Let the monitor observe a synchronous block immediately preceding end.
   await probe();demand(this.active===h,'load_window_cancelled');const at=performance.now(),cpu=process.cpuUsage(h.cpu);recordGap(h,at);captureHistogram(h,at);
   const histogramMaxPauseMs=Math.max(h.capturedHistogramMax,h.delay.max/1e6),timerMaxPauseMs=h.maxGap,value={...this.identity,runId,startedAtMs:performance.timeOrigin+h.started,endedAtMs:performance.timeOrigin+at,durationMs:at-h.started,delaySamples:h.capturedHistogramSamples+h.delay.count,timerSamples:h.timerSamples,elu:performance.eventLoopUtilization(h.elu).utilization,histogramMaxPauseMs,timerMaxPauseMs,maxPauseMs:Math.max(histogramMaxPauseMs,timerMaxPauseMs),processCpuMs:threadId===0?(cpu.user+cpu.system)/1000:null,maxRssBytes:threadId===0?process.resourceUsage().maxRSS*1024:null,complete:true,slowGaps:h.slowGaps,pauseWitnessVersion:1,pauseWitnesses:h.pauseWitnesses,droppedPauseWitnesses:h.droppedPauseWitnesses};
   value.pauseCountsOver50Ms={timer:h.pauseWitnesses.filter(w=>w.kind==='timer').length,histogram:h.pauseWitnesses.filter(w=>w.kind==='histogram').length,dropped:h.droppedPauseWitnesses,note:'Observer counts overlap; do not add them as distinct physical stalls.'};
   value.segments={startup:{timerMaxPauseMs:h.segmentTimerMax.startup,elu:h.segmentBoundary?performance.eventLoopUtilization(h.segmentBoundary.elu,h.elu).utilization:value.elu},normal:{timerMaxPauseMs:h.segmentTimerMax.normal,elu:h.segmentBoundary?performance.eventLoopUtilization(h.segmentBoundary.elu).utilization:null},cutoffMs:10000,eluBoundaryElapsedMs:h.segmentBoundary?h.segmentBoundary.at-h.started:null,note:'Raw timer gaps crossing10s appear in both segments without clipping. Full-window histogram and timer maxima still decide acceptance.'};
   h.delay.disable();clearInterval(h.timer);clearTimeout(h.expiry);this.active=null;this.last=value;return structuredClone(value);
  })();return h.pending;
 }
 close(){const h=this.active;if(h){h.delay.disable();clearInterval(h.timer);clearTimeout(h.expiry);this.active=null;}this.last=null;}
}
