import {Session} from 'node:inspector';
import {PerformanceObserver} from 'node:perf_hooks';
import {runChannelProcess} from '../channel-process.mjs';
import {demand} from '../contract.mjs';

// Isolated correctness fault injection. No production RPC, GC flags or heap
// settings change; the inspector forces real collections only in this entry.
await runChannelProcess({afterCreate(runtime){
 let armed=null;
 process.on('message',m=>{if(m?.type==='test-arm-transfer-gc'){
  demand(!armed&&['freeze','detach','admit_held'].includes(m.method),'test_gc_scope');armed=m;
  process.send({type:'test-gc-armed',request:m.request});
 }});
 const control=runtime.control.bind(runtime);runtime.control=async(method,payload)=>{
  if(armed?.method===method){
   const plan=armed;armed=null;const session=new Session(),gc=[],observer=new PerformanceObserver(list=>gc.push(...list.getEntries().map(e=>({startMs:e.startTime,ms:e.duration,kind:e.detail.kind}))));observer.observe({entryTypes:['gc']});session.connect();
   // One bounded live graph remains below the unchanged384MiB old-space cap.
   // Inspector collection is asynchronous; await its real completion, never
   // mistake command dispatch or an injected exception for a measured pause.
   const retained=Array.from({length:1400000},(_,n)=>({n,a:[n,n+1,n+2,n+3]})),waits=[];let last=performance.now();
   const probe=setInterval(()=>{const now=performance.now();waits.push({atMs:now,ms:now-last});last=now;},1);await new Promise(resolve=>setTimeout(resolve,5));
   const started=performance.now();let collections=0;
   do{await new Promise((resolve,reject)=>session.post('HeapProfiler.collectGarbage',error=>error?reject(error):resolve()));collections++;}while(performance.now()-started<250&&collections<10);
   const ended=performance.now();demand(retained.at(-1).n===1399999,'test_gc_live_heap');session.disconnect();
   await new Promise(resolve=>setTimeout(resolve,5));clearInterval(probe);gc.push(...observer.takeRecords().map(e=>({startMs:e.startTime,ms:e.duration,kind:e.detail.kind})));observer.disconnect();
   process.send({type:'test-gc-complete',request:plan.request,channel:runtime.peer.channel,method,wallMs:ended-started,startedMs:started,endedMs:ended,maxWaitMs:Math.max(...waits.map(p=>p.ms)),waits,collections,gc,heapUsed:process.memoryUsage().heapUsed});
  }
  return control(method,payload);
 };
}});
