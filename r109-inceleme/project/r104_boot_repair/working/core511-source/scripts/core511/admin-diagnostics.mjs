import {CAPACITY} from './contract.mjs';
import {createAdminProfileResponder507} from './generated/profiler-rules.mjs';
import {publicSlowWork504} from '../../../native510-bb3a6cc689c6/vds-server/src/realtime-diagnostics504.mjs';
import {feature504} from '../../../native510-bb3a6cc689c6/vds-server/src/features504.mjs';
import {demand} from './contract.mjs';
import {publicDeathLatencyR82} from './death-latency-r82.mjs';
const targets=['main','world','channel-1','channel-2','channel-3','channel-4'];
const number=(value,max=1e15)=>Number.isFinite(value)&&value>=0&&value<=max?Math.round(value*10)/10:null;

// Only fixed public metrics, never raw health records, actor IDs, ports,
// process handles, errors, session data or SQL. The native admin route remains
// the sole HTTP caller and performs its original authorization before this.
export function adminLoad511(snapshot,now=Date.now()){
 const flags504=Object.fromEntries(['slowWork','channelCounts','channelBalance','cooperativeJobs'].map(key=>[key,feature504(key)]));
 const rows=targets.map(key=>{
  const target=snapshot.targets?.find(row=>row.target===key),available=key==='main'||target?.available===true,metrics=target?.metrics,p=key==='main'?snapshot.main:metrics?.process,c=p?.current,age=now-c?.sampledAtMs;
  const fresh=available&&Number.isFinite(age)&&age>=0&&age<=7000,label=key==='main'?'Ana işlem':key==='world'?'Ortak dünya':'Kanal '+key.slice(-1),channel=key.startsWith('channel-');
  const tick=fresh&&metrics?{tickP95Ms:number(metrics.tickP95Ms),maxTickMs:number(metrics.maxMs),ticks:number(metrics.ticks),messagesPerSecond:channel?number(metrics.messagesPerSecond):null,writerAckP95Ms:channel?number(metrics.writerAckP95Ms):null,...(channel?{deathWaitR82:publicDeathLatencyR82(metrics.deathWaitR82)}:{}),slowest:(Array.isArray(metrics.slowest)?metrics.slowest:[]).slice(0,10).filter(row=>number(row.tick)!==null&&number(row.ms)!==null&&number(row.at)!==null).map(row=>({tick:number(row.tick),at:number(row.at),ms:number(row.ms)}))}:null;
  return {key,label,status:!available?'unavailable':fresh?'live':'stale',sampledAtMs:Number.isSafeInteger(c?.sampledAtMs)?c.sampledAtMs:null,busyPercent:fresh?number(c.loopUtilization*100,100):null,loopDelayMs:fresh?number(c.loopExcessMs):null,memoryMb:fresh?number(p?.memoryMb?.rss):null,...(flags504.slowWork?{slowWork504:publicSlowWork504(p?.slowWork504)}:{}),...(channel?{online504:{count:fresh&&Number.isSafeInteger(metrics?.players)?number(metrics.players,CAPACITY):null,capacity:CAPACITY,sampledAtMs:snapshot.measuredAtMs??null,status:!available?'unavailable':fresh?'live':'stale'}}:{}),kernel511:tick};
 });
 return {measuredAtMs:snapshot.measuredAtMs,sampleSeconds:2,scope:'process-event-loop-not-network-ping',flags504,rows};
}

export class AdminDiagnostics {
 constructor(diagnostics,{clock=Date.now}={}){demand(diagnostics&&typeof diagnostics.profile==='function'&&typeof diagnostics.sample==='function','admin_diagnostics_required');Object.assign(this,{diagnostics,clock});this.respond=createAdminProfileResponder507(input=>diagnostics.profile(input));}
 profile(input){return this.respond(null,input);}
 async load(){try{return Response.json(adminLoad511(await this.diagnostics.sample(),this.clock()),{headers:{'cache-control':'no-store'}});}catch{return Response.json({error:'Ölçümler alınamadı.',code:'diagnostics_unavailable'},{status:503,headers:{'cache-control':'no-store'}});}}
}
