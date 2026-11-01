import {actorFrameConflictProof} from './actor-frame-rejection.mjs';
import {demand} from './contract.mjs';
import {prepareCached477} from './writer-statements.mjs';
export const potionBatchR61=process.env.CORE511_R61_POTION_BATCH==='1';

// Private IPC envelope only: the original native action still validates every
// independent actor, journal, expected image, resource, clock and seed.
function validateEntry(e,outer,context,clock){
 demand(e&&typeof e.actor==='string'&&Number.isSafeInteger(e.epoch)&&e.epoch>0&&Number.isSafeInteger(e.sequence)&&e.sequence>0,'potion_batch_entry');
 const p=e.payload,held=new Set(outer.resources??[]);
 demand(p?.input?.action==='use_potion'&&!p.sharedLease&&!p.localScope&&!p.batchPotionsR61&&Number.isSafeInteger(p.nowMs)&&p.nowMs>=0&&p.nowMs<=clock()+5000&&Number.isSafeInteger(p.receivedAtMs)&&p.receivedAtMs>=0&&p.receivedAtMs<=p.nowMs&&typeof p.seed==='string'&&/^[a-f0-9]{64}$/.test(p.seed),'potion_batch_payload');
 demand(Array.isArray(p.resources)&&p.resources.includes('player:'+e.actor)&&p.resources.length<=1025&&p.resources.every(k=>held.has(k)&&(k==='player:'+e.actor||k.startsWith('monster:'))),'potion_batch_resources');
 demand(Array.isArray(p.claimActorsR56)&&p.claimActorsR56.length===1&&p.claimActorsR56[0].actor===e.actor&&p.claimActorsR56[0].epoch===e.epoch,'potion_batch_journal');
 demand(context.peer&&p.expected?.player?.id===e.actor&&Object.keys(p).sort().join(',')==='claimActorsR56,expected,input,nowMs,receivedAtMs,resources,seed','potion_batch_expected');
}

// Convert a *proven whole-transaction rollback* only. Integration calls this
// after its outer CommandFailureScope returns the primary negative receipt.
// Missing ACK / transport errors must never call this cancellation helper.
export function cancelledPotionBatchR61(sql,entries,negative){
 demand(negative?.result?.status===409&&negative.result.body?.not_executed===true&&typeof negative.r56ClaimRejected==='string','potion_batch_rollback_proof');
 const values=entries.map(e=>({...negative,r56ClaimRejected:e.actor,players:[prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(e.actor)],encounters:[[e.actor,prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(e.actor)??null]],events:[],claimActorsR56:undefined}));
 return {cancelActorsR61:entries.map(e=>e.actor),batchResultsR61:entries.map((e,i)=>({actor:e.actor,sequence:e.sequence,value:values[i]}))};
}

function executePotionsR61(sql,outer,context,{execute,guardActor,runContext,clock=Date.now}){
 const entries=outer.entries;
 demand(sql.isTransaction&&Array.isArray(entries)&&entries.length>=2&&entries.length<=5&&new Set(entries.map(e=>e.actor)).size===entries.length&&entries[0].actor===context.actor&&entries[0].epoch===context.epoch&&Array.isArray(outer.resources)&&outer.resources.length<=2048&&Buffer.byteLength(JSON.stringify(outer))<=224*1024,'potion_batch_scope');
 for(const e of entries){validateEntry(e,outer,context,clock);demand(guardActor(sql,e.payload,{...context,actor:e.actor,epoch:e.epoch})===true,'potion_batch_guard');}
 const rows=[];let activeEntry=null;sql.exec('SAVEPOINT core511_potion_batch_r61');
 try{
  for(const e of entries){
   activeEntry=e;const value=runContext(e.payload,()=>execute(sql,e.payload,{...context,actor:e.actor,epoch:e.epoch}));demand(!value?.then,'potion_batch_async');
   if(value.r56ClaimRejected){sql.exec('ROLLBACK TO core511_potion_batch_r61');const cancelled=cancelledPotionBatchR61(sql,entries,value);sql.exec('RELEASE core511_potion_batch_r61');return cancelled;}
   rows.push(value);
  }
  sql.exec('RELEASE core511_potion_batch_r61');
 }catch(error){
  const e=activeEntry,proven=e&&actorFrameConflictProof(error,context.peer,{operation:'native_action',playerId:e.actor,epoch:e.epoch,operationId:context.key});
  if(sql.isTransaction)sql.exec('ROLLBACK TO core511_potion_batch_r61; RELEASE core511_potion_batch_r61');
  if(proven)return cancelledPotionBatchR61(sql,entries,{r56ClaimRejected:e.actor,result:{status:409,body:{not_executed:true,code:error.code,error:'Oyuncu durumu yenilendi. İşlem uygulanmadı; tekrar deneyebilirsin.'}},events:[]});
  throw error;
 }
 // Keep each actor's own complete native answer and fishing/refund result.
 // All final rows must be reread once after the whole batch, because native
 // SQL triggers can affect an earlier held actor. Each refresh still uses the
 // original one-player canRefreshPotion check and full-read fallback.
 const players=entries.map(e=>prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(e.actor)),encounters=entries.map(e=>[e.actor,prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(e.actor)??null]);
 return {batchResultsR61:entries.map((e,i)=>({actor:e.actor,sequence:e.sequence,value:{...rows[i],players:[players[i]],encounters:[encounters[i]]}}))};
}

function aggregate(entries,value){
 const parts=value.batchResultsR61,first=parts[0].value;
 return {...first,players:parts.flatMap(r=>r.value.players),encounters:parts.flatMap(r=>r.value.encounters),events:parts.flatMap(r=>r.value.events??[]),
  ...(value.cancelActorsR61?{cancelActorsR61:value.cancelActorsR61}:{}),
  potionBatchResultsR61:parts.map(r=>({...r,value:{...r.value,events:[]}}))};
}
export function potionBatchHandlerR61(handler,{guardActor,runContext}){
 return (sql,payload,context)=>{
  if(payload.batchPotionsR61===undefined)return handler(sql,payload,context);
  demand(potionBatchR61&&Array.isArray(payload.batchPotionsR61),'potion_batch_disabled');
  const entries=payload.batchPotionsR61,{batchPotionsR61:unused,...source}=payload;
  demand(entries[0]?.payload&&JSON.stringify({...source,resources:entries[0].payload.resources})===JSON.stringify(entries[0].payload),'potion_batch_primary');
  const outer={entries,resources:payload.resources};
  return aggregate(entries,executePotionsR61(sql,outer,context,{execute:handler,guardActor,runContext}));
 };
}
// CommandFailureScope owns SQL-error provenance and rolls back the complete
// outer operation. Only AFTER that proven rollback may all journals cancel.
export function finishPotionBatchFailureR61(sql,payload,result){
 if(!potionBatchR61||!Array.isArray(payload.batchPotionsR61)||result.potionBatchResultsR61)return result;
 demand(result.r56ClaimRejected&&result.result?.body?.not_executed===true,'potion_batch_failure_ack');
 return aggregate(payload.batchPotionsR61,cancelledPotionBatchR61(sql,payload.batchPotionsR61,result));
}
export function runPotionBatchContextR61(services,payload,work){
 demand(potionBatchR61&&services.sql.isTransaction&&services.active,'potion_batch_context');
 const outer=services.active;services.active=null;try{return services.run(payload,work);}finally{services.active=outer;}
}
