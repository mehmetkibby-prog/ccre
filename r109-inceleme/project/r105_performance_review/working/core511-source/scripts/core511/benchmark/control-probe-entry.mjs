// Independent scheduler witness. Built-ins only: no game code, SQL, workload,
// network requests, inspector, custom priority, or reserved CPU.
import {monitorEventLoopDelay,performance} from 'node:perf_hooks';
import {randomUUID} from 'node:crypto';
let active=null;
const incarnation=randomUUID(),probe=()=>new Promise(resolve=>setTimeout(resolve,5));
function gap(h,at){const ms=at-h.last;h.max=Math.max(h.max,ms);if(ms>50){h.over50++;if(h.gaps.length<4096)h.gaps.push({startedAtMs:performance.timeOrigin+h.last,endedAtMs:performance.timeOrigin+at,ms});else h.dropped++;}h.last=at;}
function close(){if(active){clearInterval(active.timer);clearTimeout(active.expiry);active.delay.disable();active=null;}}
process.on('disconnect',()=>{close();process.exit(0);});
process.on('message',async message=>{
 if(message?.type!=='control-probe')return;
 const {id,operation,runId}=message;
 try{
  if(!Number.isSafeInteger(id)||id<1||typeof runId!=='string'||!/^[a-f0-9-]{36}$/.test(runId))throw Error('control_probe_identity');
  let value;
  if(operation==='begin'){
   if(active)throw Error('control_probe_busy');
   const h={runId,phase:'starting',delay:monitorEventLoopDelay({resolution:1}),gaps:[],over50:0,dropped:0,max:0,samples:0};active=h;h.delay.enable();await probe();
   if(active!==h)throw Error('control_probe_changed');h.delay.reset();h.started=performance.now();h.last=h.started;h.cpu=process.cpuUsage();h.elu=performance.eventLoopUtilization();h.phase='running';
   h.timer=setInterval(()=>{gap(h,performance.now());h.samples++;},1);h.expiry=setTimeout(()=>{close();process.exit(1);},900000);h.expiry.unref();
   value={started:true,runId,pid:process.pid,incarnation,startedAtMs:performance.timeOrigin+h.started};
  }else if(operation==='end'){
   const h=active;if(!h||h.runId!==runId||h.phase!=='running')throw Error('control_probe_fenced');h.phase='ending';await probe();if(active!==h)throw Error('control_probe_changed');
   const at=performance.now(),cpu=process.cpuUsage(h.cpu);gap(h,at);
   value={protocol:'core511-independent-control-v1',runId,pid:process.pid,incarnation,complete:true,startedAtMs:performance.timeOrigin+h.started,endedAtMs:performance.timeOrigin+at,durationMs:at-h.started,timerSamples:h.samples,delaySamples:h.delay.count,histogramMaxPauseMs:h.delay.max/1e6,timerMaxPauseMs:h.max,maxPauseMs:Math.max(h.delay.max/1e6,h.max),elu:performance.eventLoopUtilization(h.elu).utilization,processCpuMs:(cpu.user+cpu.system)/1000,maxRssBytes:process.resourceUsage().maxRSS*1024,gapsOver50:h.gaps,over50Count:h.over50,droppedGaps:h.dropped};close();
  }else throw Error('control_probe_operation');
  if(process.connected)process.send({type:'control-probe-reply',id,ok:true,value});
 }catch(error){if(process.connected)process.send({type:'control-probe-reply',id,ok:false,error:error.message});}
});
process.send({type:'control-probe-ready',pid:process.pid,incarnation});
