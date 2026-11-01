// Fixture-only scalar timings. No SQL wrappers, worker mutations or inspector.
export function observeWriterTimingR85(s,started){
 const worker=s.writer.rewardWorkerR533,lane=worker.lane,db=s.host.database;
 const rows=[],drains=[],sends=[],restores=[];let active=null,enabled=true;
 const offset=()=>performance.now()-started;
 const wrap=(object,key,create)=>{const original=object[key];object[key]=create(original);restores.push(()=>object[key]=original);};
 wrap(worker,'dispatch',original=>function(peer,request){
  const descriptor=original.call(this,peer,request);if(!enabled)return descriptor;
  const payload=request.payload,row={operationId:request.operationId,operation:request.operation,action:payload?.input?.action,actor:request.playerId,channel:peer.channel,actors:1+(payload?.batchAttacksR57?.length??0),resources:payload?.resources?.length??0,targets:payload?.localScope?.targets?.length??0,dispatchOffset:offset()};rows.push(row);
  const atomic=descriptor.atomic;descriptor.atomic=work=>{
   row.queuedOffset=offset();const previous=active;active=row;let result;
   try{result=atomic(sql=>{row.preflightStartOffset=offset();try{return work(sql);}finally{row.preflightCallbackMs=offset()-row.preflightStartOffset;}});}finally{active=previous;}
   return result.then(value=>{row.completedOffset=offset();row.ok=true;return value;},error=>{row.completedOffset=offset();row.ok=false;row.error=error?.code??error?.message;throw error;});
  };return descriptor;
 });
 wrap(lane,'run',original=>function(work){
  const row=active;if(!row)return original.call(this,work);
  return original.call(this,function(){row.laneStartOffset=offset();const at=performance.now();try{return work();}finally{row.synchronousInvocationMs=performance.now()-at;}});
 });
 wrap(worker,'send',original=>async function(envelope){
  if(!enabled)return original.call(this,envelope);
  const row={operationId:envelope.request.operationId,sendOffset:offset(),actors:1+(envelope.request.payload?.batchAttacksR57?.length??0)};sends.push(row);
  try{const result=await original.call(this,envelope);row.workMs=result?.workMs;row.ok=result?.ok;row.status=result?.ack?.result?.result?.status;return result;}
  catch(error){row.error=error?.code??error?.message;throw error;}
  finally{row.receiveOffset=offset();row.wallMs=row.receiveOffset-row.sendOffset;}
 });
 wrap(db,'drainWrites',original=>function(...args){
  if(!enabled)return original.apply(this,args);
  const at=performance.now(),row={offset:at-started,kind:this.writeQueue[0]?.externalR533?'external':'main',depth:this.writeQueue.length};
  try{return original.apply(this,args);}finally{row.synchronousMs=performance.now()-at;row.depthAfter=this.writeQueue.length;drains.push(row);}
 });
 return {finish(){enabled=false;for(const restore of restores.toReversed())restore();return {scope:'Diagnostic only: scalar parent timings around existing dispatch/lane/preflight/send/drain. Worker workMs is original runtime value. No inspector/per-SQL/native source hooks. Extra wrappers and promise continuations add unquantified small overhead.',rows,sends,drains};}};
}
