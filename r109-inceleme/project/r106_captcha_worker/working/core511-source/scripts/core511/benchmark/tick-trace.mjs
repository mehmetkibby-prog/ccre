import {performance,PerformanceObserver} from 'node:perf_hooks';
export const quantile=(a,p=.95)=>a.length?[...a].sort((x,y)=>x-y)[Math.ceil(a.length*p)-1]:0;
const stats=()=>({count:0,totalMs:0,maxMs:0,selfMs:0});
const add=(map,key,ms,selfMs)=>{const row=map[key]??=stats();row.count++;row.totalMs+=ms;row.maxMs=Math.max(row.maxMs,ms);row.selfMs+=selfMs;};
export class TickTrace {
 constructor(){this.active=null;this.gc=[];this.gcDropped=0;this.observer=new PerformanceObserver(list=>{for(const e of list.getEntries()){if(this.gc.length<4096)this.gc.push({startedAtMs:performance.timeOrigin+e.startTime,endedAtMs:performance.timeOrigin+e.startTime+e.duration,ms:e.duration,kind:e.detail.kind});else this.gcDropped++;}});this.observer.observe({entryTypes:['gc']});}
 begin(runId,started){this.active={runId,started,samples:[],startup:[],normal:[],slowest:[],work:{},slowWork:[],asyncWork:[],stack:null,tick:null};return this.active;}
 call(key,fn){
  const h=this.active;if(!h)return fn();const at=performance.now(),parent=h.stack,frame={children:0};h.stack=frame;
  try{return fn();}finally{const ms=performance.now()-at,self=Math.max(0,ms-frame.children);h.stack=parent;if(parent)parent.children+=ms;add(h.work,key,ms,self);if(h.tick)add(h.tick.work,key,ms,self);if(ms>=20){h.slowWork.push({name:key,ms,at:Date.now()});h.slowWork.sort((a,b)=>b.ms-a.ms);h.slowWork.length=Math.min(20,h.slowWork.length);}}
 }
 tick(fn){
  const h=this.active;if(!h||h.closing)return fn();const at=performance.now(),row={startedAtMs:performance.timeOrigin+at,phases:{},work:{}};h.tick=row;
  const complete=()=>{row.ms=performance.now()-at;row.at=row.endedAtMs=row.startedAtMs+row.ms;row.segment=at-h.started<10000?'startup':'normal';h.samples.push(row.ms);h[row.segment].push(row.ms);h.slowest.push(row);h.slowest.sort((a,b)=>b.ms-a.ms);h.slowest.length=Math.min(10,h.slowest.length);};
  try{const value=fn();if(value?.then)return value.finally(complete);complete();return value;}catch(error){complete();throw error;}finally{h.tick=null;}
 }
 phase(name,fn){const row=this.active?.tick;if(!row)return fn();const at=performance.now();try{return fn();}finally{row.phases[name]=(row.phases[name]??0)+performance.now()-at;}}
 asyncCall(key,fn){const h=this.active,at=performance.now();const value=fn();if(!h)return value;return Promise.resolve(value).finally(()=>{const ms=performance.now()-at;if(ms>20){h.asyncWork.push({name:key,startedAtMs:performance.timeOrigin+at,ms,endedAtMs:performance.timeOrigin+performance.now()});h.asyncWork.sort((a,b)=>b.ms-a.ms);h.asyncWork.length=Math.min(50,h.asyncWork.length);}});}
 end(){
  const h=this.active;this.active=null;
  for(const row of h.slowest){row.gc=this.gc.filter(e=>e.endedAtMs>row.startedAtMs&&e.startedAtMs<row.endedAtMs);row.gcOverlapMs=row.gc.reduce((n,e)=>n+Math.max(0,Math.min(row.endedAtMs,e.endedAtMs)-Math.max(row.startedAtMs,e.startedAtMs)),0);row.breakdown={combatMs:row.phases.combat??0,retaliationMs:row.work['retaliation.tick']?.totalMs??0,projectionMs:row.phases.project??0,serializationMs:row.work['transport.serialize']?.totalMs??0,sendMs:row.work['transport.send']?.totalMs??0,gcMs:row.gcOverlapMs};}
  const summary=a=>({ticks:a.length,tickP95Ms:quantile(a),tickP99Ms:quantile(a,.99),maxTickMs:Math.max(0,...a)});
  return {...summary(h.samples),slowest:h.slowest,work:h.work,slowWork:h.slowWork,asyncWork:h.asyncWork,segments:{startup:{durationMs:10000,...summary(h.startup)},normal:summary(h.normal)},gcEvents:this.gc,gcDropped:this.gcDropped,notes:'Function totalMs is inclusive; selfMs excludes instrumented children. GC overlaps function wall times and must not be added twice. All profiling/instrumentation overhead remains in raw acceptance.'};
 }
 close(){this.observer.disconnect();}
}
// Exact ChannelConnections.send operations, instrumented only in benchmark entry.
export function measuredSend(trace,connections,actor,packet,options={}){const socket=connections.actors.get(actor);if(!socket||socket.readyState!==1)return false;if(socket.bufferedAmount>1048576){socket.close(1013,'Slow connection');return false;}const text=trace.call('transport.serialize',()=>connections.encode(packet)),row=trace.active?.tick,perform=()=>{const h=trace.active,prior=h?.tick;if(h&&row)h.tick=row;try{return trace.call('transport.send',()=>socket.send(text));}finally{if(h)h.tick=prior;}};return connections.write(socket,text,{...options,perform});}
