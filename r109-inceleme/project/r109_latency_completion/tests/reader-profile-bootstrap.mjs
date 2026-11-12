// TEST ONLY. Copied into a disposable read-worker tree by profile-reader.py.
// Inspector sampling perturbs timings: every resulting load is diagnostic,
// never acceptance evidence. This module is not part of a release payload.
import {Session} from 'node:inspector';
import {writeFileSync} from 'node:fs';
import path from 'node:path';
import {threadId} from 'node:worker_threads';

const runPattern=/^[a-f0-9-]{36}$/;
const post=(session,method,params={})=>new Promise((resolve,reject)=>session.post(method,params,(error,result)=>error?reject(error):resolve(result)));

export function createReaderCpuDiagnosticR108({directory,incarnation}){
 if(threadId===0||!path.isAbsolute(directory)||!runPattern.test(incarnation))throw Error('reader_diagnostic_configuration');
 let active=null,last=null;
 const stop=async(cancelled=false)=>{
  const current=active;if(!current)return null;active=null;
  try{
   const {profile}=await post(current.session,'Profiler.stop');
   const file=path.join(directory,`reader-${current.runId}-${incarnation}-${process.pid}-${threadId}${cancelled?'-cancelled':''}.cpuprofile`);
   writeFileSync(file,JSON.stringify(profile),{flag:'wx',mode:0o600});
   last={runId:current.runId,target:'reader',pid:process.pid,threadId,incarnation,file,cancelled,diagnosticOnly:true,acceptanceEligible:false};
   writeFileSync(file+'.meta.json',JSON.stringify(last,null,2)+'\n',{flag:'wx',mode:0o600});
   return last;
  }finally{current.session.disconnect();}
 };
 return {
  async measure(payload,command){
   const {operation,runId}=payload;
   if(!runPattern.test(runId))throw Error('reader_diagnostic_run');
   if(operation==='begin'){
    if(active)throw Error('reader_diagnostic_busy');
    const session=new Session();session.connect();
    try{
     await post(session,'Profiler.enable');
     // Default V8 CPU sampling interval: no heap/allocation sampling or trace.
     await post(session,'Profiler.start');
     active={session,runId};last=null;
     return await command();
    }catch(error){if(active)await stop(true);else session.disconnect();throw error;}
   }
   if(active&&active.runId!==runId)throw Error('reader_diagnostic_fenced');
   const rows=await command();
   if(operation==='end'){
    const diagnostic=active?await stop():last?.runId===runId?last:null;
    if(!diagnostic)throw Error('reader_diagnostic_not_started');
    return {...rows,readerCpuDiagnostic:diagnostic};
   }
   if(operation==='cancel'&&active)await stop(true);
   return rows;
  }
 };
}
