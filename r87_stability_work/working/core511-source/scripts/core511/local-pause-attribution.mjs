// User-authorized LOCAL-only policy, 2026-10-14 19:02 Europe/Istanbul.
// Both endpoints must agree within20ms; merely overlapping a long game stall
// cannot hide extra code time. Raw reports, tick/input/ACK/ELU/CPU and VDS
// acceptance are unchanged. "Machine" is the requested correlation label,
// not a proof that game-generated CPU contention was absent.
export const LOCAL_PAUSE_POLICY='control-both-endpoints-20ms-v1';
const finite=n=>typeof n==='number'&&Number.isFinite(n);
const validGap=g=>g&&finite(g.ms)&&g.ms>50&&finite(g.startedAtMs)&&finite(g.endedAtMs)&&Math.abs(g.endedAtMs-g.startedAtMs-g.ms)<.01;
const sameTime=(a,b)=>Math.abs(a.startedAtMs-b.startedAtMs)<=20&&Math.abs(a.endedAtMs-b.endedAtMs)<=20;
export function localPauseAttribution(report){
 const rows=report?.measurement?.eventLoops??[],control=report?.controlProbe;
 const enabled=report?.transport==='message-channel'&&report?.localPausePolicy===LOCAL_PAUSE_POLICY;
 const controlValid=enabled&&control?.protocol==='core511-independent-control-v1'&&control.complete===true&&control.runId===report.measurement.runId&&Number.isSafeInteger(control.pid)&&control.pid>0&&!rows.some(r=>r.pid===control.pid)&&typeof control.incarnation==='string'&&control.incarnation.length>0&&!rows.some(r=>r.incarnation===control.incarnation)&&finite(control.durationMs)&&control.durationMs>=180000&&finite(control.startedAtMs)&&finite(control.endedAtMs)&&Math.abs(control.endedAtMs-control.startedAtMs-control.durationMs)<.01&&finite(control.timerMaxPauseMs)&&control.timerMaxPauseMs>=0&&finite(control.histogramMaxPauseMs)&&control.histogramMaxPauseMs>=0&&control.maxPauseMs===Math.max(control.histogramMaxPauseMs,control.timerMaxPauseMs)&&control.droppedGaps===0&&Array.isArray(control.gapsOver50)&&control.over50Count===control.gapsOver50.length&&control.gapsOver50.every(g=>validGap(g)&&g.startedAtMs>=control.startedAtMs&&g.endedAtMs<=control.endedAtMs&&g.ms<=control.timerMaxPauseMs)&&(control.timerMaxPauseMs<=50||control.gapsOver50.some(g=>g.ms===control.timerMaxPauseMs));
 const result={policy:LOCAL_PAUSE_POLICY,enabled,controlValid:Boolean(controlValid),toleranceMs:20,matching:'both start and end within20ms; raw maximum retained',targets:[],excluded:[],retained:[]};
 for(const row of rows){
  const witnesses=row.pauseWitnesses,valid=controlValid&&row.pauseWitnessVersion===1&&row.droppedPauseWitnesses===0&&Array.isArray(witnesses)&&witnesses.every(g=>validGap(g)&&['timer','histogram'].includes(g.kind))&&['timer','histogram'].every(kind=>{const peak=kind==='timer'?row.timerMaxPauseMs:row.histogramMaxPauseMs;return peak<=50||witnesses.some(g=>g.kind===kind&&Math.abs(g.ms-peak)<1e-6);});
  if(!valid){result.targets.push({target:row.target,rawMaxPauseMs:row.maxPauseMs,acceptanceMaxPauseMs:row.maxPauseMs,witnessesValid:false,excludedCount:0});continue;}
  // Pair two observers of the same pause for a single itemized report entry.
  const events=[];for(const w of [...witnesses].sort((a,b)=>a.endedAtMs-b.endedAtMs)){
   const event=events.findLast(e=>!e.observers.some(o=>o.kind===w.kind)&&sameTime(e,w));
   if(event){event.observers.push(w);if(w.ms>event.ms){event.ms=w.ms;event.startedAtMs=w.startedAtMs;event.endedAtMs=w.endedAtMs;}}
   else events.push({target:row.target,startedAtMs:w.startedAtMs,endedAtMs:w.endedAtMs,ms:w.ms,observers:[w]});
  }
  let excludedCount=0,retainedMax=0;
  for(const event of events){const index=control.gapsOver50.findIndex(g=>event.observers.every(o=>sameTime(o,g)));if(index>=0){excludedCount++;result.excluded.push({...event,classification:'machine-correlated-by-local-rule',controlGapIndex:index,controlGap:control.gapsOver50[index]});}else{retainedMax=Math.max(retainedMax,event.ms);result.retained.push(event);}}
  // Below-threshold histogram samples need not be serialized.50 is an upper
  // bound, never an invented exact value, when every >50 witness is excluded.
  result.targets.push({target:row.target,rawMaxPauseMs:row.maxPauseMs,acceptanceMaxPauseMs:excludedCount?Math.max(50,retainedMax):row.maxPauseMs,remainingValueIsUpperBound:excludedCount>0&&retainedMax<=50,witnessesValid:true,excludedCount});
 }
 result.excludedCount=result.excluded.length;return result;
}
