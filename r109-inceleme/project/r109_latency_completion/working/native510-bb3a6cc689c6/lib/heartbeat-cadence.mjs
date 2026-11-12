// All heartbeat callers share this clock. Existing normal timer owns retries.
export const HEARTBEAT_INTERVAL_MS=5000;
export function createHeartbeatCadence({now=()=>performance.now(),wallNow=Date.now}={}){
 let nextAt=-Infinity,normalOnly=false;
 return {
  begin(source='normal'){
   const at=now();if(at<nextAt||normalOnly&&source!=='normal')return false;
   nextAt=at+HEARTBEAT_INTERVAL_MS;normalOnly=false;return true;
  },
  rateLimited(retryAfter){
   const value=String(retryAfter??'').trim();
   const seconds=value!==''?Number(value):NaN;
   const date=value&&!Number.isFinite(seconds)?Date.parse(value):NaN;
   const wait=Number.isFinite(seconds)&&seconds>=0?seconds*1000:Number.isFinite(date)?Math.max(0,date-wallNow()):60000;
   nextAt=Math.max(nextAt,now()+wait);normalOnly=true;
  },
 };
}
