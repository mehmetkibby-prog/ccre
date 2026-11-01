// Observation only: the native potion envelope may contain up to five actors.
// Include its primary entry once and retain each actor's own native reply.
export function automaticPotionEntries(request){
 const batch=request?.payload?.batchPotionsR61;
 const entries=Array.isArray(batch)?batch:[{actor:request?.playerId,sequence:request?.sequence,payload:request?.payload}];
 return entries.filter(entry=>entry.payload?.input?.action==='use_potion'&&entry.payload.input.automatic===true).map(entry=>({actor:entry.actor,sequence:entry.sequence,batchSize:entries.length}));
}
export function automaticPotionReply(ack,entry){
 const value=ack?.result;
 return entry.batchSize>1?value?.potionBatchResultsR61?.find(row=>row.actor===entry.actor&&row.sequence===entry.sequence)?.value?.result:value?.result??value;
}
