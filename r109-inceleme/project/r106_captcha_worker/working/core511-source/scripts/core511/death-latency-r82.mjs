import {performance} from 'node:perf_hooks';

const SCOPE='local-monster-death-callback';
const PHASES=['checkpoint','writer','refresh'];
const OUTCOMES=['completed','rejected','failed'];
const MAX_ACTIVE=128,MAX_RECENT=128,MAX_SLOW=16,SLOW_MS=100;
const valid=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=1e15;
const rounded=value=>valid(value)?Math.round(value*10)/10:null;
const count=value=>Number.isSafeInteger(value)&&value>=0?value:null;
const clock=read=>{try{const value=read();return valid(value)?value:null;}catch{return null;}};
const row=value=>value&&OUTCOMES.includes(value.outcome)&&['totalMs','checkpointMs','writerMs','refreshMs'].every(key=>valid(value[key]))?{
 atMs:rounded(value.atMs),outcome:value.outcome,totalMs:rounded(value.totalMs),checkpointMs:rounded(value.checkpointMs),writerMs:rounded(value.writerMs),refreshMs:rounded(value.refreshMs)
}:null;

// A bounded observer of wall time while a local death holds its actors. This
// includes asynchronous waits that event-loop CPU/delay measurements cannot
// attribute. It creates no timers, storage writes, network traffic or IDs.
// Tokens stay private; snapshots contain only bounded measurements. Invalid
// clocks discard an observation; timing must never decide a gameplay outcome.
export function createDeathLatencyR82({now=()=>performance.now(),wall=()=>Date.now()}={}){
 const active=new Map(),recent=[],slow=[];
 const counters={completed:0,rejected:0,failed:0,dropped:0};
 const increment=key=>{counters[key]=Math.min(Number.MAX_SAFE_INTEGER,counters[key]+1);};
 const discard=token=>{if(active.delete(token))increment('dropped');};
 const step=(token,at)=>{
  const item=active.get(token);
  if(!item)return null;
  if(at===null||at<item.last){discard(token);return null;}
  item.ms[item.phase]+=at-item.last;item.last=at;return item;
 };
 return {
  begin(){
   const at=clock(now);
   if(at===null||active.size>=MAX_ACTIVE){increment('dropped');return null;}
   const token=Object.freeze({});active.set(token,{start:at,last:at,phase:'checkpoint',ms:{checkpoint:0,writer:0,refresh:0}});return token;
  },
  phase(token,next){
   const item=active.get(token);if(!item)return;
   if(PHASES.indexOf(next)!==PHASES.indexOf(item.phase)+1){discard(token);return;}
   const live=step(token,clock(now));if(live)live.phase=next;
  },
  finish(token,outcome='failed'){
   if(!active.has(token))return;
   if(!OUTCOMES.includes(outcome)){discard(token);return;}
   const item=step(token,clock(now));if(!item)return;
   active.delete(token);
   const observed={atMs:clock(wall),outcome,totalMs:item.last-item.start,checkpointMs:item.ms.checkpoint,writerMs:item.ms.writer,refreshMs:item.ms.refresh};
   if(!row(observed)){increment('dropped');return;}
   increment(outcome);recent.push(observed);if(recent.length>MAX_RECENT)recent.shift();
   if(observed.totalMs>=SLOW_MS){slow.push(observed);if(slow.length>MAX_SLOW)slow.shift();}
  },
  snapshot(){
   const at=clock(now),phaseActive={checkpoint:0,writer:0,refresh:0},phaseOldestMs={checkpoint:null,writer:null,refresh:null};
   let oldestActiveMs=active.size?null:0;
   for(const item of active.values()){
    phaseActive[item.phase]++;
    if(at!==null&&at>=item.last){
     oldestActiveMs=Math.max(oldestActiveMs??0,at-item.start);
     phaseOldestMs[item.phase]=Math.max(phaseOldestMs[item.phase]??0,at-item.last);
    }
   }
   const totals=recent.map(value=>value.totalMs).sort((a,b)=>a-b),maximum=key=>recent.length?Math.max(...recent.map(value=>value[key])):null;
   return {schema:1,scope:SCOPE,measuredAtMs:clock(wall),active:active.size,oldestActiveMs,phaseActive,phaseOldestMs,...counters,
    sampleScope:'last-128-finished-in-this-process',samples:recent.length,totalP95Ms:totals.length?totals[Math.ceil(totals.length*.95)-1]:null,
    totalMaxMs:maximum('totalMs'),checkpointMaxMs:maximum('checkpointMs'),writerMaxMs:maximum('writerMs'),refreshMaxMs:maximum('refreshMs'),
    last:recent.length?{...recent[recent.length-1]}:null,slowThresholdMs:SLOW_MS,recentSlow:slow.map(value=>({...value}))};
  }
 };
}

// The authenticated admin endpoint exposes only fixed fields and bounded rows.
// Missing diagnostics stay null, including channels running an older version.
export function publicDeathLatencyR82(value){
 if(!value||value.schema!==1||value.scope!==SCOPE||count(value.active)===null||value.active>MAX_ACTIVE)return null;
 const result={schema:1,scope:SCOPE,measuredAtMs:rounded(value.measuredAtMs),sampleScope:'last-128-finished-in-this-process',active:value.active,oldestActiveMs:rounded(value.oldestActiveMs)};
 for(const key of ['completed','rejected','failed','dropped'])result[key]=count(value[key]);
 result.phaseActive=Object.fromEntries(PHASES.map(key=>[key,count(value.phaseActive?.[key])]));
 result.phaseOldestMs=Object.fromEntries(PHASES.map(key=>[key,rounded(value.phaseOldestMs?.[key])]));
 result.samples=count(value.samples)!==null&&value.samples<=MAX_RECENT?value.samples:null;
 for(const key of ['totalP95Ms','totalMaxMs','checkpointMaxMs','writerMaxMs','refreshMaxMs'])result[key]=rounded(value[key]);
 result.last=row(value.last);result.slowThresholdMs=SLOW_MS;
 result.recentSlow=(Array.isArray(value.recentSlow)?value.recentSlow:[]).slice(-MAX_SLOW).map(row).filter(Boolean);
 return result;
}

export const deathLatencyR82=createDeathLatencyR82();
