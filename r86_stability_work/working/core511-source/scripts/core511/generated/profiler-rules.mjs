import {Session} from 'node:inspector/promises';
import {randomUUID} from 'node:crypto';

export const PROFILE507_MS=60000,PROFILE507_TTL=300000,PROFILE507_MAX=16*1024*1024,PROFILE507_CHUNK=65536;
const failure=code=>Object.assign(Error(code),{code});
const validId=id=>typeof id==='string'&&/^[a-f0-9-]{36}$/.test(id);
const active=state=>['starting','recording','finishing'].includes(state);
const delay=(fn,ms)=>{const timer=setTimeout(fn,ms);timer.unref?.();return timer;};

// No inspector port, timers, samples, disk writes or profiler connection while
// idle. Heap values, arguments, SQL, environment and account data are not read.
export function createCpuProfiler507({sessionFactory=()=>new Session(),now=Date.now,schedule=delay,cancel=clearTimeout,duration=PROFILE507_MS,ttl=PROFILE507_TTL}={}){
 let job=null,session=null,timer=null,expiry=null,text=null;
 const snapshot=()=>job?{id:job.id,state:job.state,startedAtMs:job.startedAtMs,endsAtMs:job.endsAtMs,expiresAtMs:job.expiresAtMs??null,bytes:text?Buffer.byteLength(text):0}: {state:'idle'};
 const disconnect=()=>{try{session?.disconnect();}catch{}session=null;};
 const forget=()=>{cancel(expiry);expiry=null;text=null;job=null;};
 async function finish(){
  if(job?.state!=='recording')return;job.state='finishing';
  try{
   const {profile}=await session.post('Profiler.stop');
   await session.post('Profiler.disable');disconnect();
   if(!Array.isArray(profile?.nodes)||profile.nodes.length>100000||!Array.isArray(profile.samples)||profile.samples.length>100000)throw failure('profile_size_limit');
   // Preserve DevTools profile structure and line numbers, remove local roots,
   // query/fragment/user information and any unusual dynamically named frame.
   for(const node of profile.nodes){
    const frame=node.callFrame;
    if(frame){frame.url=String(frame.url??'').replace(/[?#].*$/,'').replaceAll('\\','/').split('/').slice(-3).join('/').slice(0,240);frame.functionName=String(frame.functionName??'').slice(0,200);}
   }
   text=JSON.stringify(profile);if(Buffer.byteLength(text)>PROFILE507_MAX){text=null;throw failure('profile_size_limit');}
   job.state='ready';
  }catch{job.state='failed';text=null;disconnect();}
  finally{timer=null;job.expiresAtMs=now()+ttl;expiry=schedule(forget,ttl);}
 }
 return {
  async command({operation,id,offset}={}){
   if(operation==='start'){
    if(!validId(id))throw failure('profile_invalid_id');
    if(job?.id===id)return snapshot();
    if(job&&active(job.state))throw failure('profile_busy');
    forget();job={id,state:'starting',startedAtMs:now(),endsAtMs:now()+duration};
    try{session=sessionFactory();session.connect();await session.post('Profiler.enable');await session.post('Profiler.setSamplingInterval',{interval:2000});await session.post('Profiler.start');job.startedAtMs=now();job.endsAtMs=now()+duration;job.state='recording';timer=schedule(()=>{void finish();},duration);return snapshot();}
    catch{job.state='failed';disconnect();job.expiresAtMs=now()+ttl;expiry=schedule(forget,ttl);throw failure('profile_start_failed');}
   }
   if(operation==='status')return !id||job?.id===id?snapshot():{state:'expired'};
   if(operation==='chunk'){
    if(!validId(id)||job?.id!==id||job.state!=='ready'||!text)throw failure('profile_not_ready');
    if(!Number.isSafeInteger(offset)||offset<0||offset>text.length)throw failure('profile_invalid_offset');
    return {id,offset,chunk:text.slice(offset,offset+PROFILE507_CHUNK),length:text.length};
   }
   throw failure('profile_invalid_operation');
  },
  close(){cancel(timer);forget();disconnect();},
 };
}
const workerProfiler=createCpuProfiler507();
export const cpuProfileCommand507=request=>workerProfiler.command(request);

export function createProfileCoordinator507({local=cpuProfileCommand507,now=Date.now}={}){
 let job=null,nextStart=0,downloading=false;
 const call=async(database,request)=>{
  if(job.target==='main')return local(request);
  const child=database?.channelCompute?.children?.get((job.target==='world'?0:Number(job.target.slice(-1))));
  if(!child?.ready||child!==job.child)throw failure('profile_process_changed');
  return child.rpc.request('cpuProfile507',request,{timeoutMs:5000});
 };
 const publicJob=value=>({...value,target:job?.target??null,nextStartAtMs:nextStart});
 return async function coordinate(database,{operation,target,id}={}){
  if(operation==='start'){
   if(!/^(main|world|channel-[1-4])$/.test(target??''))throw failure('profile_invalid_target');
   // A closed admin tab must not leave the coordinator busy forever after the
   // worker's fixed-duration capture/TTL has ended. Reconcile only on demand.
   if(job&&active(job.state)&&now()>=nextStart){try{job.state=(await call(database,{operation:'status',id:job.id})).state;}catch{job.state='failed';}}
   if(downloading||job&&active(job.state)||now()<nextStart)throw failure('profile_busy');
   const child=target==='main'?null:database?.channelCompute?.children?.get((target==='world'?0:Number(target.slice(-1))));
   if(target!=='main'&&!child?.ready)throw failure('profile_process_unavailable');
   job={id:randomUUID(),state:'starting',target,child};nextStart=now()+120000;
   try{const s=await call(database,{operation:'start',id:job.id});job.state=s.state;return publicJob(s);}
   catch(error){job.state='failed';throw error;}
  }
  if(operation==='status'){
   if(!job)return {state:'idle',nextStartAtMs:nextStart};
   try{const s=await call(database,{operation:'status',id:job.id});job.state=s.state;return publicJob(s);}
   catch{job.state='failed';return publicJob({id:job.id,state:'failed'});}
  }
  if(operation==='download'){
   if(downloading)throw failure('profile_download_busy');
   if(!validId(id)||job?.id!==id)throw failure('profile_not_ready');
   downloading=true;
   try{
    const s=await call(database,{operation:'status',id});job.state=s.state;
    if(s.state!=='ready'||s.bytes<=0||s.bytes>PROFILE507_MAX)throw failure('profile_not_ready');
    const chunks=[];let offset=0,length;
    do{
     const part=await call(database,{operation:'chunk',id,offset});
     if(part.id!==id||part.offset!==offset||typeof part.chunk!=='string'||part.chunk.length>PROFILE507_CHUNK||!part.chunk.length||!Number.isSafeInteger(part.length)||part.length>PROFILE507_MAX||length!==undefined&&length!==part.length)throw failure('profile_invalid_chunk');
     length=part.length;chunks.push(part.chunk);offset+=part.chunk.length;
    }while(offset<length);
    const body=chunks.join('');if(offset!==length||Buffer.byteLength(body)!==s.bytes)throw failure('profile_incomplete');
    return new Response(body,{headers:{'content-type':'application/json','content-disposition':'attachment; filename="coreoflife-'+job.target+'-'+id+'.cpuprofile"','cache-control':'no-store','x-content-type-options':'nosniff'}});
   }finally{downloading=false;}
  }
  throw failure('profile_invalid_operation');
 };
}
const coordinator=createProfileCoordinator507();
export async function adminCpuProfile507(database,input){
 try{const value=await coordinator(database,input);return value instanceof Response?value:Response.json(value,{headers:{'cache-control':'no-store'}});}
 catch(error){return Response.json({error:error?.code==='profile_busy'?'Bir profil çalışıyor veya kısa bekleme süresi dolmadı.':'Profil alınamadı; süreç durumunu kontrol edip tekrar deneyin.',code:String(error?.code??'profile_failed').slice(0,64)},{status:error?.code==='profile_invalid_target'?400:409,headers:{'cache-control':'no-store'}});}
}

export {runtimePerformance,startRuntimePerformance,reportRuntimeWork} from "../../../../native510-bb3a6cc689c6/vds-server/src/runtime-performance.mjs";

export function createAdminProfileResponder507(coordinate){const coordinator=(_database,input)=>coordinate(input);
async function adminCpuProfile507(database,input){
 try{const value=await coordinator(database,input);return value instanceof Response?value:Response.json(value,{headers:{'cache-control':'no-store'}});}
 catch(error){return Response.json({error:error?.code==='profile_busy'?'Bir profil çalışıyor veya kısa bekleme süresi dolmadı.':'Profil alınamadı; süreç durumunu kontrol edip tekrar deneyin.',code:String(error?.code??'profile_failed').slice(0,64)},{status:error?.code==='profile_invalid_target'?400:409,headers:{'cache-control':'no-store'}});}
}
return adminCpuProfile507;
}
