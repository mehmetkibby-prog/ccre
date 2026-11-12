// Fixed vocabulary, bounded numeric process diagnostics. Never retain task
// arguments, SQL, request bodies, account IDs, stacks, tickets or credentials.
// No async hooks, per-event records on the common fast path, or file writes.
export function createSlowWork504({enabled=true,now=Date.now,allowedNames=new Set(),maxEvents=18432,maxGc=4096}={}){
 const windowMs=900000,thresholdMs=50;
 const jobs=new Array(maxEvents),gcs=new Array(maxGc),busy=[];
 let head=0,size=0,ghead=0,gsize=0,droppedEvents=0,droppedGc=0,depth=0,windowStartedAtMs=now(),coveredEnd=windowStartedAtMs;
 let interval=new Map(),gcInterval={count:0,totalMs:0,maxMs:0};
 // Historical position_flush measures through durability ACK, despite lacking
 // a _wall suffix. It MUST NOT masquerade as synchronous blocking work.
 const valid=(name,ms,start)=>allowedNames.has(name)&&!name.endsWith('_wall')&&name!=='position_flush'&&Number.isFinite(ms)&&ms>=0&&Number.isFinite(start);
 const round=n=>Math.round(n*100)/100;
 const prune=at=>{
  while(size&&jobs[head].startedAtMs+jobs[head].durationMs<=at-windowMs){jobs[head]=undefined;head=(head+1)%maxEvents;size--;}
  // GC observer delivery can be slightly late; its own timestamps are retained.
  while(gsize&&gcs[ghead].startedAtMs+gcs[ghead].durationMs<=at-windowMs){gcs[ghead]=undefined;ghead=(ghead+1)%maxGc;gsize--;}
  while(busy.length&&busy[0].endedAtMs<=at-windowMs)busy.shift();
 };
 const addTotal=(name,ms,start)=>{
  // Explicit unwrapped phases can nest (SQL inside dungeon_save). Count only
  // their previously uncounted tail. This intentionally under-attributes gaps
  // rather than ever presenting overlapping phases as additive busy time.
  const end=start+ms,elapsed=Math.max(0,end-Math.max(start,windowStartedAtMs,coveredEnd));coveredEnd=Math.max(coveredEnd,end);if(!elapsed)return;
  let row=interval.get(name);if(!row)interval.set(name,row={name,count:0,totalMs:0,maxMs:0});
  row.count++;row.totalMs+=elapsed;row.maxMs=Math.max(row.maxMs,ms);
 };
 const remember=(name,ms,start)=>{
  const gc=name.startsWith('gc_');if(!gc&&ms<=thresholdMs)return;
  const at=now();prune(at);if(start+ms<=at-windowMs||start>at+1000)return;
  const event={name,kind:gc?'gc':'job',startedAtMs:start,durationMs:ms};
  if(gc){if(gsize===maxGc){ghead=(ghead+1)%maxGc;gsize--;droppedGc++;}gcs[(ghead+gsize++)%maxGc]=event;}
  if(ms>thresholdMs){if(size===maxEvents){head=(head+1)%maxEvents;size--;droppedEvents++;}jobs[(head+size++)%maxEvents]=event;}
 };
 const publicRow=r=>({...r,startedAtMs:Math.round(r.startedAtMs),durationMs:round(r.durationMs)});
 return {
  enabled,
  // Only outermost synchronous invocation contributes to interval totals.
  // Nested report()/SQL phases remain eligible for the long-work listing.
  enter(){if(!enabled)return false;depth++;return true;},
  leave(name,ms,start){if(!enabled)return;depth=Math.max(0,depth-1);if(depth===0&&valid(name,ms,start))addTotal(name,ms,start);},
  report(name,ms,start){if(!enabled||!valid(name,ms,start))return;remember(name,ms,start);if(name.startsWith('gc_')){
   // GC duration overlaps paused JS callbacks. Report it separately, never add
   // it to job totals. Attribute delayed observer entries by their own clock.
   const target=start+ms>windowStartedAtMs?gcInterval:busy.findLast(row=>start+ms>row.startedAtMs&&start<row.endedAtMs)?.gc;
   if(target){target.count++;target.totalMs+=ms;target.maxMs=Math.max(target.maxMs,ms);}
  }else if(depth===0)addTotal(name,ms,start);},
  closeWindow({at=now(),loopUtilization=0}={}){
   if(!enabled)return;
   prune(at);
   if(loopUtilization>.9){const top=[...interval.values()].sort((a,b)=>b.totalMs-a.totalMs||a.name.localeCompare(b.name)).slice(0,5).map(r=>({...r,totalMs:round(r.totalMs),maxMs:round(r.maxMs)}));
    busy.push({startedAtMs:windowStartedAtMs,endedAtMs:at,loopUtilization,coverage:'non-overlapping-instrumented-tail-lower-bound; unobserved-gaps-not-attributed',top,gc:gcInterval});if(busy.length>8)busy.shift();}
   interval=new Map();gcInterval={count:0,totalMs:0,maxMs:0};windowStartedAtMs=at;coveredEnd=at;
  },
  snapshot(){
   const at=now();if(!enabled)return {enabled:false,measuredAtMs:at,windowSeconds:900,thresholdMs,top:[],busyWindows:[],gc:{count:0,totalMs:0,maxMs:0,recent:[]},retainedEvents:0,droppedEvents:0,droppedGc:0};
   prune(at);const top=[];for(let i=0;i<size;i++){const r=jobs[(head+i)%maxEvents];if(r.startedAtMs+r.durationMs<=at-windowMs)continue;let n=0;while(n<top.length&&top[n].durationMs>=r.durationMs)n++;if(n<10){top.splice(n,0,r);if(top.length>10)top.pop();}}
   let count=0,totalMs=0,maxMs=0;const recent=[];for(let i=0;i<gsize;i++){const r=gcs[(ghead+i)%maxGc];if(r.startedAtMs+r.durationMs<=at-windowMs)continue;count++;totalMs+=r.durationMs;maxMs=Math.max(maxMs,r.durationMs);recent.push(r);if(recent.length>10)recent.shift();}
   return {enabled:true,measuredAtMs:at,windowSeconds:900,thresholdMs,top:top.map(publicRow),gc:{count,totalMs:round(totalMs),maxMs:round(maxMs),recent:recent.map(publicRow)},busyWindows:busy.map(r=>({...r,top:r.top.map(x=>({...x})),gc:{count:r.gc.count,totalMs:round(r.gc.totalMs),maxMs:round(r.gc.maxMs)}})),retainedEvents:size,droppedEvents,droppedGc,limits:{slowEvents:maxEvents,gcEvents:maxGc,busyWindows:8},coverage:'explicit synchronous jobs and GC; async waits excluded; unknown callbacks possible; GC overlaps jobs; bounded retention may drop oldest'};
  },
 };
}
