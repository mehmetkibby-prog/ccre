// Test-only observer for native 202 presentation replies. A predicted death
// is not a durable kill: match the original intent's terminal server event.
export function observePopulationFinalEvent(a,event){
 if(event?.attackerId!==a.id||!['monster_result','monster_reject'].includes(event.type)||typeof event.intentId!=='string')return;
 if(!a.observedAttackIntents?.has(event.intentId))return;
 a.finalAttackEvents??=new Map();a.finalAttackEvents.set(event.intentId,event);
 if(a.finalAttackEvents.size>256)throw Error('population_final_event_overflow');
 reconcilePopulationFinalEvents(a);
}
export function reconcilePopulationFinalEvents(a){
 for(const [key,t]of a.pendingKills){
  const event=a.finalAttackEvents?.get(t.intentId);if(!event)continue;
  // A final rejection or a surviving target is an acknowledged outcome,
  // not a successful death. Only explicit killed=true queues a reward claim.
  const hit=(event.hits??[]).find(h=>h.id===t.id&&h.spawnRound===t.spawnRound);
  a.pendingKills.delete(key);
  if(event.type==='monster_result'&&hit?.killed===true)a.claims.push({id:t.id,spawnRound:t.spawnRound});
  a.provisionalOutcomes??=[];
  if(a.provisionalOutcomes.length>=2048)throw Error('population_outcomes_overflow');
  a.provisionalOutcomes.push({intentId:t.intentId,id:t.id,spawnRound:t.spawnRound,type:event.type,killed:hit?.killed===true,hp:hit?.hp??null});
 }
 // Retain events arriving before the command Promise's 202 is observed.
 for(const [intent]of a.finalAttackEvents??[])if(!a.observedAttackIntents.has(intent))a.finalAttackEvents.delete(intent);
}
export function recordPopulationPending(a,input,body){
 for(const hit of body.hits??[])if(hit.killPending)a.pendingKills.set(input.intentId+':'+hit.id+':'+hit.spawnRound,{id:hit.id,spawnRound:hit.spawnRound,intentId:input.intentId});
 reconcilePopulationFinalEvents(a);
}
