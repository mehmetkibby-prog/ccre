import {demand} from './contract.mjs';
import {PERFORMANCE_POLICY as P} from './performance-policy.mjs';
export const INPUT_RESPONSE_PROTOCOL='client-send-to-native-result-v2';
export const COMPLETE_INPUT_PROTOCOL='client-send-to-native-result-mix-v3';
export const percentile=(values,p)=>values.length?[...values].sort((a,b)=>a-b)[Math.ceil(values.length*p)-1]:0;
const summary=values=>({samples:values.length,p99Ms:percentile(values,.99),maxMs:values.reduce((n,v)=>Math.max(n,v),0)});
// Half-open interval, determined by observed sends and durable native replies,
// never by a hard-coded ten-second exemption. Every sample belongs to one part.
export function inputPartition(rows){
 const potions=rows.filter(r=>r.action==='use_potion');
 const startedMs=potions.reduce((n,r)=>Math.min(n,r.startedMs),Infinity),endedMs=potions.reduce((n,r)=>Math.max(n,r.startedMs+r.ms),-Infinity);
 const burst=potions.length?{startedMs,endedMs,potions:potions.length,sendSpreadMs:Math.max(...potions.map(r=>r.startedMs))-startedMs}:null;
 const inBurst=r=>burst&&r.startedMs>=startedMs&&r.startedMs<endedMs;
 return {burst,segments:{potionBurst:summary(rows.filter(inBurst).map(r=>r.ms)),normal:summary(rows.filter(r=>!inBurst(r)).map(r=>r.ms))}};
}
export function validateInputMeasurements(input,{sent,acknowledged}){
 if(input?.protocol===COMPLETE_INPUT_PROTOCOL)return validateCompleteInputs(input,{sent,acknowledged});
 const failed=()=>['input_response_targets'];
 if(input?.protocol!==INPUT_RESPONSE_PROTOCOL||!Number.isSafeInteger(sent)||sent<200||acknowledged!==sent||input.samples!==sent||!Array.isArray(input.observations)||input.observations.length!==sent||sent>100000)return failed();
 const rows=[];for(const tuple of input.observations){
  if(!Array.isArray(tuple)||tuple.length!==6)return failed();const [channel,action,sequence,startedMs,ms,actor]=tuple;
  if(![1,2,3,4].includes(channel)||typeof action!=='string'||!Number.isSafeInteger(sequence)||sequence<1||!Number.isFinite(startedMs)||startedMs<0||!Number.isFinite(ms)||ms<0||typeof actor!=='string'||!actor)return failed();rows.push({channel,action,sequence,startedMs,ms,actor});
 }
 const part=inputPartition(rows),all=summary(rows.map(r=>r.ms)),same=(a,b)=>a&&['samples','p99Ms','maxMs'].every(k=>a[k]===b[k]);
 if(!same(input,all)||!part.burst||Object.keys(part.burst).some(k=>input.burst?.[k]!==part.burst[k])||part.burst.potions!==100||part.burst.sendSpreadMs>50)return failed();
 const potions=rows.filter(r=>r.action==='use_potion');if(new Set(potions.map(r=>r.actor)).size!==100||[1,2,3,4].some(channel=>potions.filter(r=>r.channel===channel).length!==25))return failed();
 if(!same(input.segments?.normal,part.segments.normal)||!same(input.segments?.potionBurst,part.segments.potionBurst)||part.segments.normal.samples<100||part.segments.normal.p99Ms>P.inputP99Ms||part.segments.normal.maxMs>P.inputMaxMs||part.segments.potionBurst.maxMs>P.potionBurstMaxMs)return failed();
 return [];
}
// Exact bounded samples. A full buffer fails the run; it cannot silently drop
// slow commands. Include durable completion, refresh, transport and client parse.
export class InputResponses {
 constructor({clock=()=>performance.now(),limit=100000,completeGame=false}={}){this.clock=clock;this.limit=limit;this.rows=[];this.started=null;this.completeGame=completeGame;}
 begin(at=this.clock()){demand(this.started===null,'input_measurement_busy');this.started=at;}
 record({at,channel,action,sequence,actor,scenario='normal'},ended=this.clock()){
  demand(this.started!==null&&Number.isFinite(at)&&at>=this.started&&ended>=at&&this.rows.length<this.limit,'input_measurement_scope');
  this.rows.push({channel,action,sequence,...(actor===undefined?{}:{actor}),...(this.completeGame?{scenario}:{}),startedMs:at-this.started,ms:ended-at,segment:at-this.started<10000?'startup':'normal'});
 }
 report(){return {protocol:this.completeGame?COMPLETE_INPUT_PROTOCOL:INPUT_RESPONSE_PROTOCOL,...summary(this.rows.map(r=>r.ms)),...(this.completeGame?completePartition(this.rows):inputPartition(this.rows)),channels:[1,2,3,4].map(channel=>({channel,...summary(this.rows.filter(r=>r.channel===channel).map(r=>r.ms))})),phases:Object.fromEntries(['startup','normal'].map(segment=>[segment,summary(this.rows.filter(r=>r.segment===segment).map(r=>r.ms))])),actions:[...new Set(this.rows.map(r=>r.action))].map(action=>({action,...summary(this.rows.filter(r=>r.action===action).map(r=>r.ms))})),slowest:[...this.rows].sort((a,b)=>b.ms-a.ms).slice(0,20),observationColumns:['channel','action','sequence','startedMs','ms','actor',...(this.completeGame?['scenario']:[])],observations:this.rows.map(r=>[r.channel,r.action,r.sequence,r.startedMs,r.ms,r.actor??null,...(this.completeGame?[r.scenario]:[])])};}
}

export const isPotionAction=action=>action==='use_potion'||action==='dungeon_potion';
function completePartition(rows){
 const boss=rows.filter(r=>r.scenario==='bossPotion'),normal=rows.filter(r=>r.scenario==='normal'),potions=normal.filter(r=>isPotionAction(r.action));
 return {segments:{normal:summary(normal.map(r=>r.ms)),normalPotion:summary(potions.map(r=>r.ms)),bossPotion:summary(boss.map(r=>r.ms))},bossWindow:boss.length?{startedMs:Math.min(...boss.map(r=>r.startedMs)),endedMs:Math.max(...boss.map(r=>r.startedMs+r.ms)),sendSpreadMs:Math.max(...boss.map(r=>r.startedMs))-Math.min(...boss.map(r=>r.startedMs))}:null};
}
function validateCompleteInputs(input,{sent,acknowledged}){
 const failed=()=>['input_response_targets'];
 if(!Number.isSafeInteger(sent)||sent<600||sent>100000||acknowledged!==sent||input.samples!==sent||input.observations?.length!==sent)return failed();
 const rows=[];for(const tuple of input.observations){
  if(!Array.isArray(tuple)||tuple.length!==7)return failed();const [channel,action,sequence,startedMs,ms,actor,scenario]=tuple;
  if(![1,2,3,4].includes(channel)||typeof action!=='string'||!Number.isSafeInteger(sequence)||sequence<1||!Number.isFinite(startedMs)||startedMs<0||startedMs>P.durationMs||!Number.isFinite(ms)||ms<0||typeof actor!=='string'||!actor||!['normal','bossPotion'].includes(scenario)||scenario==='bossPotion'&&!isPotionAction(action))return failed();rows.push({channel,action,sequence,startedMs,ms,actor,scenario});
 }
 const part=completePartition(rows),same=(a,b)=>a&&['samples','p99Ms','maxMs'].every(k=>a[k]===b[k]);
 if(!same(input,summary(rows.map(r=>r.ms)))||Object.keys(part.segments).some(k=>!same(input.segments?.[k],part.segments[k]))||!part.bossWindow||Object.keys(part.bossWindow).some(k=>input.bossWindow?.[k]!==part.bossWindow[k]))return failed();
 const boss=rows.filter(r=>r.scenario==='bossPotion'),normal=rows.filter(r=>r.scenario==='normal'&&isPotionAction(r.action)),actors=new Set(boss.map(r=>r.actor));
 if(boss.length!==100||actors.size!==100||[1,2,3,4].some(ch=>boss.filter(r=>r.channel===ch).length!==25)||part.bossWindow.sendSpreadMs>P.bossPotionSpreadMs||part.segments.bossPotion.p99Ms>P.bossPotionP99Ms||part.segments.bossPotion.maxMs>P.bossPotionMaxMs||part.segments.normal.p99Ms>P.inputP99Ms||part.segments.normal.maxMs>P.inputMaxMs||part.segments.normalPotion.p99Ms>P.inputP99Ms||part.segments.normalPotion.maxMs>P.inputMaxMs)return failed();
 if(normal.some(r=>!actors.has(r.actor)))return failed();
 for(const actor of actors){const times=normal.filter(r=>r.actor===actor).map(r=>r.startedMs).sort((a,b)=>a-b);if(times.length<5||times[0]>30000||P.durationMs-times.at(-1)>30000||times.some((t,i)=>i>0&&(t-times[i-1]<10000||t-times[i-1]>30000)))return failed();}
 return [];
}

export function validatePotionDebits(report){
 const p=report?.writer?.potions;
 if(report?.inputResponses?.protocol!==COMPLETE_INPUT_PROTOCOL)return p?.players===100&&p.expectedEach===1&&p.matched===100;
 if(p?.players!==100||p.matched!==100||!Number.isSafeInteger(p.initialEach)||p.initialEach<1||!Array.isArray(p.actors)||p.actors.length!==100||new Set(p.actors.map(r=>r.actor)).size!==100)return false;
 const counts=new Map();for(const r of report.inputResponses.observations??[])if(isPotionAction(r[1]))counts.set(r[5],(counts.get(r[5])??0)+1);
 return counts.size===100&&p.actors.every(r=>Number.isSafeInteger(r.remaining)&&r.remaining>=0&&r.consumed===counts.get(r.actor)&&r.remaining===p.initialEach-r.consumed);
}
