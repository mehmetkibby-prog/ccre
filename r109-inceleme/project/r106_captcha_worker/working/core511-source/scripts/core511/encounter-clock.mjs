import {cloneEngagementR53} from './engagement-memory-r53.mjs';
import {r35Options} from './r35-options.mjs';
// Only this revision metadata is clamped. Native hit/deadline/expiry clocks,
// counters, damage, CAS and DELETE/INSERT lifecycle boundaries are untouched.
export function encounterTime(previous,nowMs){
 return r35Options.encounterSoft&&Number.isSafeInteger(previous?.updated_at_ms)&&Number.isSafeInteger(nowMs)?Math.max(previous.updated_at_ms,nowMs):nowMs;
}
export function monotonicEncounter(previous,row){
 if(!row)return row;
 const time=encounterTime(previous,row.updated_at_ms);
 return time===row.updated_at_ms?row:cloneEngagementR53(row,{updated_at_ms:time})??Object.freeze({...row,updated_at_ms:time});
}
export function normalizeEncounterPlan({base,current,transitions=[]},diagnose=null){
 if(!r35Options.encounterSoft)return {base,current,transitions};
 let previous=base,lastTime=base?.updated_at_ms??0;
 const clamp=(row,min)=>{
  if(!row||!Number.isSafeInteger(row.updated_at_ms)||row.updated_at_ms<0||row.updated_at_ms>=min)return row;
  diagnose?.({actor:row.player_id,from:row.updated_at_ms,to:min,hitSequence:row.hit_sequence});
  return {...row,updated_at_ms:min};
 };
 const steps=transitions.map(step=>{
  if(step.before){const before=clamp(step.before,lastTime);previous=null;lastTime=before.updated_at_ms;return {...step,before};}
  const after=clamp(step.after,lastTime);previous=after;lastTime=after?.updated_at_ms??lastTime;return {...step,after};
 });
 return {base,current:clamp(current,previous?.updated_at_ms??lastTime),transitions:steps};
}
let notices=0;
export function diagnoseEncounterClock(detail){
 // Bound logging under a bad clock while retaining a cumulative diagnostic.
 notices++;if(notices<=8||(notices&(notices-1))===0)console.warn(JSON.stringify({type:'core511_encounter_clock_clamp',count:notices,...detail}));
}
