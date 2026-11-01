import {Session} from 'node:inspector';
import {writeFileSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {threadId} from 'node:worker_threads';

const micros=()=>Number(process.hrtime.bigint()/1000n);
export async function startCleanCpuR85(){
 const session=new Session();session.connect();
 const post=(method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,value)=>error?reject(error):resolve(value)));
 await post('Profiler.enable');await post('Profiler.setSamplingInterval',{interval:1000});await post('Profiler.start');
 let active=null,stopped=false;const jobs=[],kills=new Set(),profileStartedHrUs=micros();
 return {
  begin(envelope){if(stopped)return;if(active)throw Error('clean_cpu_overlap');active={operationId:envelope.request.operationId,operation:envelope.request.operation,actors:1+(envelope.request.payload?.batchAttacksR57?.length??0),startedHrUs:micros(),startedWall:performance.now(),cpu:process.threadCpuUsage()};},
  async end(envelope,ack,error){
   if(stopped||!active)return;const row=active;active=null;row.endedHrUs=micros();row.wallMs=performance.now()-row.startedWall;const usage=process.threadCpuUsage(row.cpu);row.threadCpuMs=(usage.user+usage.system)/1000;delete row.startedWall;delete row.cpu;row.status=ack?.result?.result?.status;row.error=error?.code??error?.message;
   for(const result of [ack?.result?.result,...(ack?.result?.batchResultsR57??[]).map(r=>r.result)])for(const hit of result?.body?.hits??[])if(hit.killed)kills.add(JSON.stringify([hit.id,hit.spawnRound]));
   row.uniqueKills=kills.size;jobs.push(row);
   if(kills.size<50)return;stopped=true;
   const stopStartedHrUs=micros(),{profile}=await post('Profiler.stop');session.disconnect();
   const prefix=new URL('../../evidence/worker-clean-cpu-r85-'+process.pid+'-'+threadId,import.meta.url),pins=Object.fromEntries(['worker-clean-cpu-r85.mjs','worker-clean-cpu-loader-r85.mjs','register-worker-clean-cpu-r85.mjs'].map(name=>[name,createHash('sha256').update(readFileSync(new URL(name,import.meta.url))).digest('hex')]));
   writeFileSync(prefix.pathname+'.cpuprofile',JSON.stringify(profile));
   writeFileSync(prefix.pathname+'.json',JSON.stringify({scope:'Diagnostic1ms reward-worker CPU sampling only. Started before READY, no SQL or coarse stage observers. Sampling/stop/file-output add overhead. Final profiled ACK includes stop/output overhead, excluded from stored job wall.',profileStartedHrUs,stopStartedHrUs,profileStartTime:profile.startTime,profileEndTime:profile.endTime,samplingIntervalUs:1000,uniqueKills:kills.size,threadId,node:process.version,jobs,pins},null,2)+'\n');
  }
 };
}
