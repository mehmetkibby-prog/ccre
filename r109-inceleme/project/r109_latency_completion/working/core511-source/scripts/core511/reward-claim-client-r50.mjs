// Claim-only client batching. Each normal command still uses the existing
// sequence/ACK machinery; an unknown commit is never retried here.
export const CLAIM_BATCH_SIZE_R50=10,CLAIM_MAX_TARGETS_R50=8192,CLAIM_DEADLINE_MS_R50=180000;
const MAX_JOBS=32,MAX_QUEUED_TARGETS=16384,MAX_ACK_BYTES=8*1024*1024;
const encoder=new TextEncoder();
function failure(code,status=409,detail={}){return Object.assign(Error(code),{code,status,body:{...detail,ok:false,code}});}
function targetsOf(input){
 const rows=input?.rewardTargets;
 if(!Array.isArray(rows)||rows.length>CLAIM_MAX_TARGETS_R50)throw failure('claim_batch_target_limit',413,{not_executed:true,maxTargets:CLAIM_MAX_TARGETS_R50});
 const seen=new Set(),targets=[];
 for(const row of rows){const id=String(row?.id??''),spawnRound=Number(row?.spawnRound);if(!/^[a-z0-9-]{1,64}$/.test(id)||!Number.isSafeInteger(spawnRound)||spawnRound<0)throw failure('claim_batch_invalid_target',400,{not_executed:true});const key=id+':'+spawnRound;if(!seen.has(key)){seen.add(key);targets.push({id,spawnRound});}}
 return targets;
}
function retryDelay(answer){const headers=answer?.headers,raw=answer?.body?.retryAfter??(typeof headers?.get==='function'?headers.get('retry-after'):headers?.['retry-after']??headers?.['Retry-After']),milliseconds=raw==null?Number(answer?.body?.retryAfterMs):Number(raw)*1000;return Number.isFinite(milliseconds)&&milliseconds>0?Math.max(50,Math.ceil(milliseconds)):1000;}

export function createRewardClaimBatcherR50({send,scope,clock=Date.now,setTimer=setTimeout,clearTimer=clearTimeout,deadlineMs=CLAIM_DEADLINE_MS_R50,maxAckBytes=MAX_ACK_BYTES}){
 if(typeof send!=='function'||typeof scope!=='function')throw TypeError('claim_batch_functions_required');
 let queue=[],active=null,running=false,queuedTargets=0;
 const jobs=new Set();
 const detail=job=>({completedTargets:job.cursor,pendingTargets:Math.max(0,job.targets.length-job.cursor),inFlightTargets:job.inFlightTargets??0,outcomeUnknown:(job.inFlightTargets??0)>0,partial:job.cursor>0,recovery:'durable_reward_reconciliation'});
 const errorBody=(job,body={})=>{const {not_executed,...rest}=body;return {...rest,...(not_executed===true&&job.cursor===0&&!job.inFlightTargets?{not_executed:true}:{}),...detail(job)};};
 function settle(job,error,value){if(job.settled)return;job.settled=true;clearTimer(job.deadlineTimer);clearTimer(job.waitTimer);job.wake?.();job.signal?.removeEventListener('abort',job.abort);error?job.reject(error):job.resolve(value);if(active!==job||!job.inFlightTargets)release(job);}
 function release(job){if(!jobs.delete(job))return;queuedTargets-=job.targets.length;queue=queue.filter(row=>row!==job);}
 function stop(job,code){job.stopped=true;settle(job,failure(code,409,detail(job)));}
 function check(job){if(job.stopped)return false;if(clock()>=job.deadline){stop(job,'claim_batch_deadline');return false;}if(scope()!==job.owner){stop(job,'claim_owner_changed');return false;}return true;}
 async function wait(job,ms){if(!check(job))return;await new Promise(resolve=>{job.wake=resolve;job.waitTimer=setTimer(resolve,Math.min(ms,Math.max(0,job.deadline-clock())));});job.wake=null;clearTimer(job.waitTimer);}
 async function run(job){
  const drops=new Map();let processed=0,bytes=0,last={},communityProgress;
  try{
   while(job.cursor<job.targets.length&&check(job)){
    const chunk=job.targets.slice(job.cursor,job.cursor+CLAIM_BATCH_SIZE_R50);
    // Do not race/cancel this promise: accepted work must settle through the
    // transport, even if its caller has aborted or changed ownership.
    job.inFlightTargets=chunk.length;
    const answer=await send({action:'claim_rewards',rewardTargets:chunk});
    job.inFlightTargets=0;
    if(job.stopped)return;
    if(answer?.status===429){await wait(job,retryDelay(answer));continue;}
    if(!(answer?.status>=200&&answer.status<300)||answer?.body?.ok===false){throw failure(typeof answer?.body?.code==='string'?answer.body.code:'claim_batch_rejected',answer?.status??503,errorBody(job,answer?.body));}
    job.cursor+=chunk.length;
    const body=answer.body??{};bytes+=encoder.encode(JSON.stringify(body)).byteLength;
    if(bytes>maxAckBytes)throw failure('claim_batch_ack_limit',413,detail(job));
    last=body;processed+=Number.isFinite(Number(body.processed))?Number(body.processed):0;
    if(body.communityProgress!==undefined)communityProgress=body.communityProgress;
    for(const drop of Array.isArray(body.drops)?body.drops:[])if(drop&&typeof drop.id==='string')drops.set(drop.id,drop);
   }
   if(check(job))settle(job,null,{status:200,body:{...last,processed,drops:[...drops.values()],...(communityProgress===undefined?{}:{communityProgress})},headers:{}});
  }catch(error){if(!job.settled)settle(job,Object.assign(error instanceof Error?error:Error('claim_batch_unknown'),{code:typeof error?.code==='string'?error.code:'claim_batch_outcome_unknown',status:error?.status??503,body:{...errorBody(job,error?.body),ok:false,code:typeof error?.code==='string'?error.code:'claim_batch_outcome_unknown'}}));}
 }
 async function drain(){if(running)return;running=true;try{while(queue.length){active=queue.shift();if(!active.settled)await run(active);release(active);active=null;}}finally{running=false;}}
 return {
  submit(input,{signal}={}){
   let targets;try{targets=targetsOf(input);}catch(error){return Promise.reject(error);}
   if(signal?.aborted)return Promise.reject(failure('claim_batch_aborted',409,{not_executed:true}));
   if(jobs.size>=MAX_JOBS||queuedTargets+targets.length>MAX_QUEUED_TARGETS)return Promise.reject(failure('claim_batch_queue_full',429,{not_executed:true}));
   const owner=scope();if(owner==null)return Promise.reject(failure('claim_owner_unavailable',409,{not_executed:true}));
   return new Promise((resolve,reject)=>{const job={targets,cursor:0,owner,signal,resolve,reject,deadline:clock()+deadlineMs,stopped:false,settled:false};job.abort=()=>stop(job,'claim_batch_aborted');job.deadlineTimer=setTimer(()=>stop(job,'claim_batch_deadline'),deadlineMs);signal?.addEventListener('abort',job.abort,{once:true});jobs.add(job);queuedTargets+=targets.length;queue.push(job);void drain();});
  },
  cancel(code='claim_owner_changed'){for(const job of [...jobs])stop(job,code);},
  snapshot(){return {jobs:jobs.size,queuedJobs:queue.length,pendingTargets:[...jobs].reduce((sum,job)=>sum+Math.max(0,job.targets.length-job.cursor),0),inFlightTargets:active?.inFlightTargets??0};}
 };
}

let enabledValue,optionsPending;
export function rewardClaimCandidateR50(input){return input?.action==='claim_rewards'&&Array.isArray(input.rewardTargets)&&input.rewardTargets.length>CLAIM_BATCH_SIZE_R50;}
export async function rewardClaimEnabledR50(){
 if(enabledValue!==undefined)return enabledValue;
 if(!optionsPending){optionsPending=(async()=>{const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),2500);try{const response=await globalThis.fetch('/api/core511-r50-claim-options',{credentials:'same-origin',cache:'no-store',signal:controller.signal});if(!response.ok)throw failure('claim_batch_options_unavailable',503,{not_executed:true});const value=await response.json();if(typeof value?.claimBatchClient!=='boolean')throw failure('claim_batch_options_invalid',503,{not_executed:true});enabledValue=value.claimBatchClient;return enabledValue;}finally{clearTimeout(timer);}})().catch(error=>{optionsPending=null;throw typeof error?.code==='string'?error:failure('claim_batch_options_unavailable',503,{not_executed:true});});}
 return optionsPending;
}
export async function claimTimeoutR50(input,legacyMs){return rewardClaimCandidateR50(input)&&await rewardClaimEnabledR50()?CLAIM_DEADLINE_MS_R50:legacyMs;}
const batchers=new WeakMap();
const ownerOf=transport=>transport.disposed||transport.halted||transport.replacing?null:transport.playerId!=null&&transport.epoch!=null?String(transport.playerId)+':'+String(transport.epoch):null;
export async function claimRewardsR50(transport,input,{signal}={}){
 transport.assertCommandScope();const before=ownerOf(transport);
 await transport.ensure();
 transport.assertCommandScope();if(before!==null&&before!==ownerOf(transport))throw failure('claim_owner_changed',409,{not_executed:true});
 let batcher=batchers.get(transport);
 if(!batcher){batcher=createRewardClaimBatcherR50({send:payload=>transport.command(payload),scope:()=>ownerOf(transport)});batchers.set(transport,batcher);}
 return batcher.submit(input,{signal});
}
export function cancelRewardClaimsR50(transport,code){batchers.get(transport)?.cancel(code);}
