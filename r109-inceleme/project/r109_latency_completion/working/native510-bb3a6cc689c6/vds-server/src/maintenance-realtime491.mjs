import {randomUUID} from 'node:crypto';
import {realtimeCrypto,postLoopback} from './realtime-transport.mjs';
export const MAINTENANCE_PATH491='/internal/maintenance491';

// Policy updates and an existing bridge's reconnect are the only triggers.
// A failed delivery has four bounded attempts; normal gameplay adds no work.
export function createRealtimeMaintenancePublisher491({post=postLoopback,crypto=realtimeCrypto,origin=process.env.REALTIME_HTTP_ORIGIN||'http://127.0.0.1:3001',now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,onError=e=>console.error('maintenance_realtime491',e.message)}={}){
 let job=null,closed=false,sentRevision=0;
 const stats={attempts:0,delivered:0,failed:0};
 const cancel=()=>{if(job?.timer!==null&&job?.timer!==undefined)clearTimer(job.timer);job=null;};
 async function send(current){
  if(closed||job!==current)return;current.attempt++;stats.attempts++;
  try{
   const body=JSON.stringify(current.frame),timestamp=String(Math.floor(now()/1000)),nonce=randomUUID(),key='coreoflife-p256-2026-09';
   const headers={'x-col-key-id':key,'x-col-timestamp':timestamp,'x-col-nonce':nonce,'x-col-signature':crypto.sign(`COL-REQUEST-V1\n${key}\n${timestamp}\n${nonce}\nPOST\n${MAINTENANCE_PATH491}\n${crypto.digest(body)}`)};
   const response=await post(origin,MAINTENANCE_PATH491,headers,body,1500);
   if(!response?.ok)throw Error('maintenance_realtime_status_'+(response?.status??0));
   const result=await response.json();if(result?.ok!==true||result.revision<current.frame.revision)throw Error('maintenance_realtime_ack');
   if(job!==current||closed)return;sentRevision=Math.max(sentRevision,current.frame.revision);stats.delivered++;job=null;
  }catch(error){
   if(job!==current||closed)return;
   if(current.attempt<4){current.timer=setTimer(()=>{current.timer=null;void send(current);},[250,750,2000][current.attempt-1]);current.timer?.unref?.();}
   else {job=null;stats.failed++;onError(error);}
  }
 }
 return {publish(frame,{force=false}={}){if(closed||!frame)return false;if(job?.frame.revision===frame.revision)return false;if(job?.frame.revision>frame.revision||!force&&sentRevision>=frame.revision)return false;cancel();job={frame,attempt:0,timer:null};void send(job);return true;},snapshot:()=>({...stats,sentRevision,pending:!!job}),close(){closed=true;cancel();}};
}

export function attachRealtimeMaintenance491(runtime,options){
 if(!runtime?.maintenance)return null;
 const publisher=createRealtimeMaintenancePublisher491(options),maintenance=runtime.maintenance;
 const stop=maintenance.subscribe(frame=>publisher.publish(frame));
 publisher.publish(maintenance.policy);
 const previousClose=maintenance.close.bind(maintenance);maintenance.close=()=>{stop();publisher.close();previousClose();};
 runtime.realtimeMaintenance491=publisher;
 return publisher;
}
