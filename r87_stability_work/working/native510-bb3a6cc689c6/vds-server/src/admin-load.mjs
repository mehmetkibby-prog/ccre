import {feature504} from './features504.mjs';
import {publicSlowWork504} from './realtime-diagnostics504.mjs';
// Cached process measurements only. No IPC, SQL, player identifiers, ports,
// secrets or raw health records are triggered/exposed by this admin view.
const number=v=>Number.isFinite(v)&&v>=0?Math.round(v*10)/10:null;
export function adminLoadSnapshot(database,processSnapshot,now=Date.now()){
 const row=(key,label,process,ready=true,online)=>{
  const c=process?.current,age=Number.isFinite(c?.sampledAtMs)?now-c.sampledAtMs:Infinity;
  const fresh=!!ready&&age>=0&&age<=7000;
  const countAge=Number.isFinite(online?.sampledAtMs)?now-online.sampledAtMs:Infinity;
  const countFresh=!!ready&&online?.status==='live'&&countAge>=0&&countAge<=7000&&Number.isSafeInteger(online.count)&&online.count>=0;
  return {key,label,status:!ready?'unavailable':fresh?'live':'stale',sampledAtMs:c?.sampledAtMs??null,
   busyPercent:fresh?number(c.loopUtilization*100):null,
   loopDelayMs:fresh?number(c.loopExcessMs):null,
   memoryMb:fresh?number(process?.memoryMb?.rss):null,
   ...(feature504('slowWork')?{slowWork504:publicSlowWork504(process?.slowWork504)}:{}),
   ...(feature504('channelCounts')&&key.startsWith('channel-')?{online504:{count:countFresh?online.count:null,capacity:25,sampledAtMs:online?.sampledAtMs??null,status:!ready?'unavailable':countFresh?'live':'stale'}}:{})};
 };
 const snapshot=database?.channelCompute?.snapshot();
 return {measuredAtMs:now,sampleSeconds:2,scope:'process-event-loop-not-network-ping',
  flags504:Object.fromEntries(['slowWork','channelCounts','channelBalance','cooperativeJobs'].map(k=>[k,feature504(k)])),rows:[
  row('main','Ana işlem',processSnapshot),
  ...[1,2,3].map(id=>{const channel=snapshot?.channels?.find(c=>c.channel===id);return row('channel-'+id,'Kanal '+id,channel?.health?.process,channel?.ready===true&&!channel.health?.error,channel?.health?.online504);}),
  ...(feature504('slowWork')?[row('realtime','Realtime',database?.diagnosticsRealtime504?.snapshot())]:[])]};
}
