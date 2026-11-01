import {deathBatchR57} from './r57-options.mjs';
import {demand} from './contract.mjs';
import {assertLocalMixedScope} from './local-mixed-scope.mjs';
import {assertLocalRewardScope,LOCAL_KILL_REJECTED} from './local-reward-scope.mjs';
import {attackMonsterRowsR51,attackParticipantRowsR51} from './attack-row-batch-r51.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {captureDeathBatchPortalsR57} from './portal-refresh-r57.mjs';
const batchRefreshR61=process.env.CORE511_R61_BATCH_REFRESH==='1';
export const DEATH_BATCH_EXTRA_LIMIT_R57=4;
export const deathBatchActorPayloadR57=(payload,entry)=>({...payload,input:entry.input,seed:entry.seed,receivedAtMs:entry.receivedAtMs});
export function guardDeathBatchActorsR57(sql,payload,context,guard){
 if(payload.batchAttacksR57===undefined)return;
 demand(deathBatchR57&&Array.isArray(payload.batchAttacksR57)&&payload.batchAttacksR57.length>0&&payload.batchAttacksR57.length<=DEATH_BATCH_EXTRA_LIMIT_R57,'death_batch_guard_scope');
 for(const entry of payload.batchAttacksR57)demand(guard(sql,deathBatchActorPayloadR57(payload,entry),{...context,actor:entry.actor,epoch:entry.epoch},'attack')===true,'game_writer_security');
}
// The worker receives only the parent's authenticated envelope. Its secondary
// calls must reference an exact entry of that envelope, with every other
// payload field retaining object identity. No independently supplied actor or
// alternate resource/checkpoint image is authorized here.
export function deathBatchWorkerCallR57(request,payload,context,kind){
 if(!deathBatchR57||kind!=='attack'||request?.operation!=='attack'||context.key!==request.operationId||!Array.isArray(request.payload?.batchAttacksR57))return false;
 const outer=request.payload,entry=outer.batchAttacksR57.find(e=>e.actor===context.actor&&e.epoch===context.epoch);
 if(!entry||Object.keys(payload).length!==Object.keys(outer).length)return false;
 const expected=deathBatchActorPayloadR57(outer,entry);
 return Object.keys(expected).every(k=>Object.hasOwn(payload,k)&&Object.is(payload[k],expected[k]));
}

// Private synchronous context nesting for accepted ordinary attacks only.
// Each native call has the same independent seed/clock it would receive as a
// separate writer command. The surrounding transaction remains the owner of
// every effect, receipt, failure rollback and final fsync.
export function runDeathBatchContextR57(services,payload,work){
 demand(deathBatchR57&&services.sql.isTransaction&&services.active,'death_batch_context');
 const outer=services.active;services.active=null;
 try{return services.run(payload,work);}finally{services.active=outer;}
}

export const executeDeathBatchR57=(sql,payload,context,dependencies)=>captureDeathBatchPortalsR57(sql,()=>executeBatch(sql,payload,context,dependencies));
function executeBatch(sql,payload,context,{execute,executeSnapshotR61,readFrame,settingsFor,assertOwnership,guardActor,runContext}){
 const batch=payload.batchAttacksR57,held=new Set(payload.resources??[]),single=payload.localScope?.kind==='kill';
 demand(deathBatchR57&&sql.isTransaction&&!payload.sharedLease&&(single||payload.localScope?.kind==='mixed')&&['forest','frozen','ancient'].includes(single?payload.expected?.player?.area:payload.localScope.area)&&Array.isArray(payload.localScope.targets)&&payload.localScope.targets.length<=(single?10:64)&&Array.isArray(batch)&&batch.length>0&&batch.length<=DEATH_BATCH_EXTRA_LIMIT_R57&&typeof runContext==='function','death_batch_scope');
 demand(new Set([context.actor,...batch.map(e=>e?.actor)]).size===batch.length+1&&Buffer.byteLength(JSON.stringify(batch))<=65536,'death_batch_inputs');
 for(const entry of batch){
  demand(entry&&Object.keys(entry).sort().join(',')==='actor,epoch,input,receivedAtMs,seed,sequence'&&typeof entry.actor==='string'&&held.has('player:'+entry.actor)&&held.has('monster:'+entry.input?.targetId)&&Number.isSafeInteger(entry.epoch)&&entry.epoch>0&&Number.isSafeInteger(entry.sequence)&&entry.sequence>0&&Number.isSafeInteger(entry.receivedAtMs)&&entry.receivedAtMs>=0&&entry.receivedAtMs<=payload.nowMs&&typeof entry.seed==='string'&&/^[a-f0-9]{64}$/.test(entry.seed)&&entry.input?.action==='attack'&&(single?[0]:[0,1,2]).includes(Math.min(3,Math.max(0,Math.floor(Number(entry.input.ability)||0)))),'death_batch_input');
  demand(assertOwnership(sql,context.peer,entry.actor,entry.epoch)===true,'attack_owner_fenced');
  demand(typeof guardActor==='function','death_batch_guard');guardActor(sql,deathBatchActorPayloadR57(payload,entry),{...context,actor:entry.actor,epoch:entry.epoch});
 }
 const snapshotR61=typeof executeSnapshotR61==='function';
 const {batchAttacksR57:unused,...firstPayload}=payload,first=snapshotR61?executeSnapshotR61(sql,firstPayload,context,{secondary:false,last:false}):execute(sql,firstPayload,context),rows=[first],answers=[];
 if(first.r53Rejected)return {...first,batchResultsR57:batch.map(e=>({actor:e.actor,sequence:e.sequence,result:first.result}))};
 for(const entry of batch){
  const sub={...firstPayload,input:entry.input,seed:entry.seed,receivedAtMs:entry.receivedAtMs};delete sub.checkpointR53;
  const subContext={...context,actor:entry.actor,epoch:entry.epoch};
  const value=runContext(sub,()=>{
   if(single)assertLocalRewardScope(sql,{code:LOCAL_KILL_REJECTED,targets:sub.localScope.targets,input:sub.input,resources:sub.resources,peer:context.peer,actor:entry.actor});
   else assertLocalMixedScope(sql,{local:sub.localScope,input:sub.input,resources:sub.resources,peer:context.peer,actor:entry.actor,nowMs:sub.nowMs,batchSinglesR57:true});
   if(snapshotR61)return executeSnapshotR61(sql,sub,subContext,{secondary:true,last:entry===batch.at(-1)});
   const frame=readFrame(sql,entry.actor,entry.input.targetId);
   sub.expected={player:frame.player,monster:frame.monster,settings:settingsFor(sql,entry.actor)};
   return execute(sql,sub,subContext);
  });
  rows.push(value);answers.push({actor:entry.actor,sequence:entry.sequence,result:value.result});
 }
 const targetIds=[...new Set(rows.flatMap(r=>(snapshotR61?r.result?.body?.hits??[]:r.monsters??[]).map(m=>m.id)))],monsters=attackMonsterRowsR51(sql,targetIds);
 let players=rows.at(-1).players;
 // A native call may clear only its encounter before returning no hits. Such
 // a caster is absent from the cumulative players-write audit, but still must
 // receive its final encounter and rebase its checkpoint behind the lease.
 if(batchRefreshR61){const final=new Map(players.map(p=>[p.id,p]));for(const id of [context.actor,...batch.map(e=>e.actor)])if(!final.has(id))final.set(id,prepareCached477(sql,'SELECT * FROM players WHERE id=?').get(id));players=[...final.keys()].sort().map(id=>final.get(id));}
 const value={...first,players,monsters,participants:attackParticipantRowsR51(sql,monsters),engagement:prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null,
  events:rows.flatMap(r=>r.events??[]),community:rows.flatMap(r=>r.community??[]),completedClaimsR56:[...new Map(rows.flatMap(r=>r.completedClaimsR56??[]).map(r=>[JSON.stringify([r.id,r.spawnRound]),r])).values()],
  rewardsCompletedR53:rows.reduce((n,r)=>n+(r.rewardsCompletedR53??0),0),batchResultsR57:answers};
 value.batchEngagementsR57=batch.map(e=>[e.actor,prepareCached477(sql,'SELECT * FROM pve_engagements WHERE player_id=?').get(e.actor)??null]);
 // Only the outer whole-batch creation proof may cover all native calls.
 delete value.portalCreationR57;
 return value;
}
