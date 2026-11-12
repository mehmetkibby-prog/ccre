import {signRealmServiceRequest} from './realm-service-auth.mjs';

const validId=value=>typeof value==='string'&&value.length<=100;
function normalize(frame){
 if(!frame||!Number.isSafeInteger(frame.revision)||frame.revision<1||!['normal','open','waiting','ended','maintenance'].includes(frame.phase)||!validId(frame.adminAccountId))throw Error('maintenance_policy_invalid');
 const startedAt=Number(frame.startedAt)||0,deadlineMs=Number(frame.deadlineMs)||0;
 if(!Number.isSafeInteger(startedAt)||!Number.isSafeInteger(deadlineMs)||startedAt<0||deadlineMs<0||frame.phase==='maintenance'&&deadlineMs<startedAt)throw Error('maintenance_deadline_invalid');
 return Object.freeze({revision:frame.revision,phase:frame.phase,startedAt,deadlineMs,adminAccountId:frame.adminAccountId,maintenanceText:String(frame.maintenanceText??'').slice(0,2000)});
}

// One process-wide deadline; no player clocks, polling, SQL or session changes.
export function createMaintenance438({now=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,isGameMaster=()=>false}={}){
 let policy=null,view=null,timer=null,closed=false;const listeners=new Set();
 const emit=deadline=>{for(const listener of listeners)try{const result=listener(policy,{deadline});if(result?.catch)result.catch(error=>console.error('maintenance_listener',error.message));}catch(error){console.error('maintenance_listener',error.message);}};
 const cancel=()=>{if(timer!==null)clearTimer(timer);timer=null;};
 function arm(){cancel();if(closed||policy?.phase!=='maintenance'||policy.deadlineMs<=now())return;const revision=policy.revision;timer=setTimer(()=>{timer=null;if(closed||policy?.revision!==revision)return;if(policy.deadlineMs>now()){arm();return;}emit(true);},Math.min(2147483647,Math.max(1,policy.deadlineMs-now())));timer?.unref?.();}
 return {
  get policy(){return policy;},
  isAdmin(id){return !!id&&id===policy?.adminAccountId;},
  // Server database callback only. Never consult request bodies, names or client flags.
  isGameMaster(id){return policy?.phase==='maintenance'&&typeof id==='string'&&id.length>0&&id.length<=100&&isGameMaster(id)===true;},
  apply(input){const next=normalize(input);if(closed||policy&&next.revision<=policy.revision)return false;policy=next;view=next.phase==='maintenance'?Object.freeze({revision:next.revision,startedAt:next.startedAt,deadlineMs:next.deadlineMs,maintenanceText:next.maintenanceText,get serverTime(){return now();}}):null;arm();emit(false);return true;},
  allows(id){return !policy||policy.phase!=='maintenance'||now()<policy.deadlineMs||this.isGameMaster(id);},
  deadline(id){return policy?.phase==='maintenance'&&!this.isGameMaster(id)?policy.deadlineMs:Infinity;},
  view(id){return this.isGameMaster(id)?null:view;},
  subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
  close(){closed=true;cancel();listeners.clear();}
 };
}

// Policy changes are rare: one bounded, coalesced job per configured realm.
export function createMaintenancePublisher438(runtime,keys,{fetcher=fetch,setTimer=setTimeout,clearTimer=clearTimeout}={}){
 const jobs=new Map();let closed=false;
 async function send(job){
  if(closed||jobs.get(job.realm.id)!==job)return;
  const frame=job.frame,body=JSON.stringify(frame);job.attempt++;
  try{
   const headers=signRealmServiceRequest({key:keys.get(job.realm.id),realmId:job.realm.id,pathname:'/internal/maintenance',body});
   const response=await fetcher(`http://127.0.0.1:${job.realm.ports.app}/api/realm/maintenance`,{method:'POST',headers:{...headers,'content-type':'application/json','x-col-service-path':'/internal/maintenance'},body,signal:AbortSignal.timeout(1500)});
   if(!response.ok)throw Error('maintenance_notify_'+response.status);await response.arrayBuffer();
   if(jobs.get(job.realm.id)===job)jobs.delete(job.realm.id);
  }catch(error){
   if(closed||jobs.get(job.realm.id)!==job)return;
   if(job.attempt<4){job.timer=setTimer(()=>{job.timer=null;void send(job);},[250,750,2000][job.attempt-1]);job.timer?.unref?.();}
   else {jobs.delete(job.realm.id);console.error('maintenance_notify_failed',job.realm.id,error.message);}
  }
 }
 return {publish(input){const frame=normalize(input);if(closed)return;for(const realm of runtime.manifest.realms){if(!keys.has(realm.id))continue;const old=jobs.get(realm.id);if(old?.timer)clearTimer(old.timer);const job={realm,frame,attempt:0,timer:null};jobs.set(realm.id,job);void send(job);}},close(){closed=true;for(const job of jobs.values())if(job.timer)clearTimer(job.timer);jobs.clear();}};
}

export async function acceptMaintenance438(req,res,runtime){
 const reply=(code,body)=>{res.writeHead(code,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(body));};
 try{
  if(req.method!=='POST'||runtime?.role!=='game'||!runtime.maintenanceVerifier438||!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket?.remoteAddress)||['forwarded','x-forwarded-for','x-real-ip','cf-connecting-ip','x-forwarded-host','x-forwarded-proto'].some(key=>req.headers[key]!==undefined))return reply(403,{error:'maintenance_private_endpoint'});
  let size=0;const chunks=[];for await(const chunk of req){size+=chunk.length;if(size>16384)return reply(413,{error:'payload_too_large'});chunks.push(chunk);}
  const body=Buffer.concat(chunks).toString('utf8');
  if(req.headers['x-col-service-path']!=='/internal/maintenance'||!runtime.maintenanceVerifier438.verify({method:'POST',pathname:'/internal/maintenance',headers:req.headers,body}))return reply(401,{error:'invalid_signature'});
  runtime.maintenance.apply(JSON.parse(body));
  try{await runtime.maintenanceFanout438?.(runtime.maintenance.policy);}catch{return reply(503,{error:'maintenance_channel_retry'});}
  return reply(200,{ok:true,revision:runtime.maintenance.policy.revision});
 }catch{return reply(400,{error:'maintenance_policy_rejected'});}
}
