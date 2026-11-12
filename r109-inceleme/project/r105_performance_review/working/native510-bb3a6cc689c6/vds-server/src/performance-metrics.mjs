import {diagnosticAction,expectedActionRejection} from '../../lib/action-diagnostics.mjs';
import {safeFailureReason} from '../../lib/request-failure.mjs';
const key=Symbol.for('coreoflife.nativePerformance');
export const measuredActions=new Set(['attack','pvp_attack','heartbeat','claim_rewards','move','fishing_input','start_fishing','finish_fishing','collect','hurt','use_potion']);
const routes=new Set(['world_full','world_owner','world_compact','world_combat',...measuredActions,'other_action']);
const limits=[1,2,5,10,15,20,25,30,40,50,60,75,100,150,200,300,500,750,1000,2000,5000,10000,30000,Infinity];
const intervalMs=10000,intervals=30;
const empty=()=>({count:0,sum:0,max:0,over50:0,over100:0,bins:new Array(limits.length).fill(0)});
const add=(data,value)=>{data.count++;data.sum+=value;data.max=Math.max(data.max,value);data.over50+=Number(value>50);data.over100+=Number(value>100);data.bins[limits.findIndex(limit=>value<=limit)]++;};
const summarize=data=>{
 const percentile=q=>{let n=0;for(let i=0;i<limits.length;i++){n+=data.bins[i];if(n>=Math.ceil(data.count*q))return Number.isFinite(limits[i])?limits[i]:null;}return null;};
 return {count:data.count,meanMs:Math.round(data.sum/data.count*10)/10,maxMs:Math.round(data.max*10)/10,p50UpperMs:percentile(.5),p95UpperMs:percentile(.95),over50:data.over50,over100:data.over100};
};
const businessReasons=new Set(['client_error','forbidden','scope_or_conflict']);
const counts=()=>({requests:0,errors:0,clientErrors:0,serverErrors:0,rejections:0,byStatus:{},byReason:{}});
function countRequest(row,status,reason,rejected,diagnostic){
 row.requests++;row.rejections+=Number(rejected);row.errors+=Number(status>=400&&!rejected);
 row.clientErrors+=Number(status>=400&&status<500&&!rejected);row.serverErrors+=Number(status>=500&&status<600);
 if(diagnostic){const code=Number.isInteger(status)&&status>=100&&status<=599?String(status):'unknown';row.byStatus[code]=(row.byStatus[code]??0)+1;
  if(status>=400){const label=rejected?'user_rejection':safeFailureReason(reason,status);row.byReason[label]=(row.byReason[label]??0)+1;}}
}
function mergeCounts(out,row){
 for(const key of ['requests','errors','clientErrors','serverErrors','rejections'])out[key]+=row[key];
 for(const key of ['byStatus','byReason'])for(const [label,count]of Object.entries(row[key]))out[key][label]=(out[key][label]??0)+count;
}
// Fixed names and histogram buckets, five minutes in memory. No player data,
// bodies, query strings, credentials, disk writes or per-request log spam.
export function createPerformanceMetrics({now=Date.now}={}) {
 const startedAtMs=now(),buckets=new Map();
 const prune=epoch=>{for(const time of buckets.keys())if(time<=epoch-intervals)buckets.delete(time);};
 return {
  record(route,values,status,reason,action,result){
   if(!routes.has(route))return;
   const epoch=Math.floor(now()/intervalMs);prune(epoch);
   let bucket=buckets.get(epoch);if(!bucket)buckets.set(epoch,bucket=new Map());
   let row=bucket.get(route);if(!row)bucket.set(route,row={...counts(),series:{},byAction:{}});
   const label=diagnosticAction(action),rejected=route==='other_action'&&result==='user_rejection'&&expectedActionRejection(label,status,reason&&!businessReasons.has(reason)?reason:undefined);
   countRequest(row,status,reason,rejected,route==='heartbeat'||route==='other_action');
   if(route==='other_action')countRequest(row.byAction[label]??=counts(),status,reason,rejected,true);
   for(const name of ['nativeMs','handlerMs','ingressMs']){const value=values[name];if(typeof value!=='number'||!Number.isFinite(value)||value<0)continue;add(row.series[name]??=empty(),value);}
  },
  snapshot(){
   const at=now();prune(Math.floor(at/intervalMs));const combined={};
   for(const bucket of buckets.values())for(const [route,row] of bucket){
    const out=combined[route]??={...counts(),series:{},byAction:{}};mergeCounts(out,row);
    for(const [action,data]of Object.entries(row.byAction))mergeCounts(out.byAction[action]??=counts(),data);
    for(const [name,data] of Object.entries(row.series)){const target=out.series[name]??=empty();target.count+=data.count;target.sum+=data.sum;target.max=Math.max(target.max,data.max);target.over50+=data.over50;target.over100+=data.over100;for(let i=0;i<limits.length;i++)target.bins[i]+=data.bins[i];}
   }
   return {protocol:'native-game-timing-v1',startedAtMs,measuredAtMs:at,windowSeconds:300,resolutionSeconds:10,scope:'server-only-not-player-rtt',routes:Object.fromEntries(Object.entries(combined).map(([route,row])=>[route,{requests:row.requests,errors:row.errors,clientErrors:row.clientErrors,serverErrors:row.serverErrors,...(['heartbeat','other_action'].includes(route)?{byStatus:row.byStatus,byReason:row.byReason}:{}),...(route==='other_action'?{rejections:row.rejections,byAction:row.byAction}:{}),...Object.fromEntries(Object.entries(row.series).map(([name,data])=>[name,summarize(data)]))}]))};
  },
 };
}
export const nativePerformance=()=>globalThis[key]??=createPerformanceMetrics();
