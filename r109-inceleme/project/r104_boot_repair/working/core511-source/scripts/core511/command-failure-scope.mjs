import {isSharedClaimMismatchR85,markSharedClaimRollbackR85} from './shared-claim-rejection-r85.mjs';
import {deathBatchRollbackEntriesR85,clearDeathBatchRollbackR85} from './death-batch-writer-r57.mjs';
import {createHash} from 'node:crypto';
import {memoryCombatR53} from './r53-options.mjs';
import {SQL_TABLES477} from '../../../native510-bb3a6cc689c6/vds-server/src/writer-sql-labels477.mjs';
import {invalidatePreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';
import {demand} from './contract.mjs';
import {isLocalMonsterMismatch,markLocalRollback} from './local-write-rejection.mjs';
import {isBagFull,bagFullBody} from './bag-limit.mjs';
import {assertCommandOutputSize,isCommandOutputLimit,markCommandOutputRollback} from './command-output-guard.mjs';

const supported=new Set(['attack','native_action','movement']);
const tables=new Set(SQL_TABLES477),installed=new WeakMap();
const control=/^\s*(?:BEGIN|COMMIT|END|ROLLBACK|SAVEPOINT|RELEASE|PRAGMA|VACUUM|ATTACH|DETACH)\b/i;
function label(sql){
 const text=typeof sql==='string'?sql:'',op=text.trimStart().match(/^([A-Za-z]+)/)?.[1]?.toLowerCase();
 const table=[...text.matchAll(/\b(?:FROM|INTO|UPDATE|JOIN)\s+(?:(?:main|temp)\s*\.\s*)?["`\[]?([A-Za-z_]\w*)/ig)].map(m=>m[1].toLowerCase()).find(name=>tables.has(name));
 const eligible=['select','insert','update','delete','replace','with'].includes(op)&&!control.test(text);
 return {family:(eligible?op:'other')+'_'+(table??'other'),queryDigest:createHash('sha256').update(text).digest('hex').slice(0,16),eligible};
}
// Mark only errors caught directly at this connection's SQLite call boundary.
// A forged `code` property on an application/guard exception is insufficient.
function observe(sql){
 if(installed.has(sql))return installed.get(sql);
 const state={active:null,known:new WeakMap()},prepare=sql.prepare,exec=sql.exec;
 const capture=(error,metadata)=>{if(state.active&&error&&typeof error==='object'&&error.code==='ERR_SQLITE_ERROR'&&Number.isSafeInteger(error.errcode)&&(error.errcode===1||(error.errcode&255)===19)){const detail=metadata();if(detail.eligible)state.known.set(error,{...detail,scope:state.active,sqliteCode:error.errcode});}return error;};
 sql.prepare=function(text,...args){let detail;const metadata=()=>detail??=label(text);let statement;try{statement=Reflect.apply(prepare,this,[text,...args]);}catch(error){throw capture(error,metadata);}
  for(const method of ['get','all','run']){const invoke=statement[method];statement[method]=function(...bindings){try{return Reflect.apply(invoke,this,bindings);}catch(error){throw capture(error,metadata);}};}return statement;
 };
 sql.exec=function(text,...args){try{return Reflect.apply(exec,this,[text,...args]);}catch(error){throw capture(error,()=>label(text));}};
 // Statements prepared before installation must not bypass this provenance.
 invalidatePreparedStatements477(sql);installed.set(sql,state);return state;
}
function safeFrames(error){return String(error?.stack??'').split('\n').slice(1).flatMap(line=>{const hit=line.match(/([A-Za-z0-9_.-]+\.m?js):(\d+):(\d+)/);return hit?[hit[0]]:[];}).slice(0,6);}
export class CommandFailureScope {
 constructor(sql,{checkpoint=()=>null,onRollback=()=>{},diagnostic=record=>console.error(JSON.stringify(record)),clock=Date.now}={}){this.sql=sql;this.state=observe(sql);this.checkpoint=checkpoint;this.onRollback=onRollback;this.diagnostic=diagnostic;this.clock=clock;this.logged=new Map();}
 preserve(afterRollback){demand(typeof afterRollback==='function','command_failure_preserve');if(this.state.active)this.state.active.preserved.push(afterRollback);}
 run(kind,payload,context,work){
  if(!supported.has(kind))return work();
  const sql=this.sql,state=this.state;demand(sql.isTransaction&&!state.active,'command_failure_scope');const scope={preserved:[]},checkpoint=this.checkpoint();
  sql.exec('SAVEPOINT core511_owned_command');state.active=scope;
  try{const result=work();demand(!result?.then,'command_failure_async');assertCommandOutputSize(result,context);sql.exec('RELEASE core511_owned_command');return result;}
  catch(error){
   if(kind==='native_action'&&isSharedClaimMismatchR85(error)&&sql.isTransaction){
    sql.exec('ROLLBACK TO core511_owned_command; RELEASE core511_owned_command');
    this.onRollback(checkpoint);for(const preserve of scope.preserved)demand(!preserve()?.then,'command_failure_async_preserve');
    markSharedClaimRollbackR85(error);throw error;
   }
   if(isCommandOutputLimit(error)&&sql.isTransaction){
    sql.exec('ROLLBACK TO core511_owned_command; RELEASE core511_owned_command');
    this.onRollback(checkpoint);for(const preserve of scope.preserved)demand(!preserve()?.then,'command_failure_async_preserve');
    markCommandOutputRollback(error,kind,context);throw error;
   }
   if(kind==='attack'&&isLocalMonsterMismatch(error)&&sql.isTransaction){
    sql.exec('ROLLBACK TO core511_owned_command; RELEASE core511_owned_command');
    this.onRollback(checkpoint);for(const preserve of scope.preserved)demand(!preserve()?.then,'command_failure_async_preserve');
    markLocalRollback(error);throw error;
   }
   const evidence=state.known.get(error);if(!evidence||evidence.scope!==scope||!sql.isTransaction)throw error;
   // Both steps must succeed. COMMIT/fsync occur later in LocalDatabase and
   // remain outside this catch: ambiguous durability still fails closed.
   sql.exec('ROLLBACK TO core511_owned_command; RELEASE core511_owned_command');this.onRollback(checkpoint);for(const preserve of scope.preserved)demand(!preserve()?.then,'command_failure_async_preserve');
   const player=sql.prepare('SELECT * FROM players WHERE id=?').get(context.actor);demand(player,'command_failure_actor_missing');
   const engagement=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(context.actor)??null;
   const bagFull=isBagFull(error),result={result:{status:409,body:bagFull?bagFullBody():{code:'command_sql_rolled_back',error:'Bu işlem uygulanmadı. Yeniden deneyebilirsin.',retryable:false}},events:[],community:[],player,players:[player],monsters:[],participants:[],bossParticipants:[],engagement,encounters:[[context.actor,engagement]],sharedRefresh:{version:1,actors:[],all:false,tables:[]}};
   // This marker is created only after the connection-proven SQL failure and
   // successful rollback above. Joined snapshots rolled back with the attack;
   // the channel must cancel their reservation rather than expect a saved ACK.
   if(memoryCombatR53&&kind==='attack'&&payload.checkpointR53){result.r53Rejected=context.actor;result.result.body.not_executed=true;}
   if(kind==='native_action'&&payload.claimActorsR56){result.r56ClaimRejected=context.actor;result.result.body.not_executed=true;}
   if(kind==='attack'&&payload.batchAttacksR57!==undefined){
    const entries=deathBatchRollbackEntriesR85(payload,context);if(!entries)throw error;
    // The entire native operation, including earlier kills and joined actor
    // checkpoints, was rolled back above. Preserve each accepted sequence in
    // the same original durable receipt; missing/unknown COMMIT never enters
    // this branch. The nonjoined route needs the same cancellation marker.
    result.r53Rejected=context.actor;result.result.body.not_executed=true;
    result.players=[player,...entries.map(entry=>{const row=sql.prepare('SELECT * FROM players WHERE id=?').get(entry.actor);demand(row,'command_failure_batch_actor_missing');return row;})];
    result.encounters=result.players.map(row=>[row.id,sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(row.id)??null]);
    result.batchResultsR57=entries.map(entry=>({actor:entry.actor,sequence:entry.sequence,result:result.result}));
   }
   if(kind==='native_action'){result.fishing=sql.prepare('SELECT * FROM fishing_sessions WHERE player_id=?').get(context.actor)??null;if(payload.input?.action==='collect')result.drop=sql.prepare('SELECT * FROM world_drops WHERE id=? AND owner_id=?').get(payload.input.targetId,context.actor)??null;}
   const key=kind+':'+evidence.family+':'+evidence.queryDigest,now=this.clock();if(!bagFull&&now-(this.logged.get(key)??-Infinity)>=60000){this.logged.set(key,now);if(this.logged.size>64)this.logged.delete(this.logged.keys().next().value);try{this.diagnostic({type:'core511_command_sql_rolled_back',operation:kind,family:evidence.family,queryDigest:evidence.queryDigest,sqliteCode:evidence.sqliteCode,frames:safeFrames(error),outcome:'negative_receipt_pending_durability'});}catch{}}
   // The surrounding existing authority transaction persists this negative
   // response and advances its ordered sequence. Same-operation replay never
   // reruns the failed game work, and the response waits for COMMIT/fsync.
   try{assertCommandOutputSize(result,context);}catch(outputError){if(isCommandOutputLimit(outputError))markCommandOutputRollback(outputError,kind,context);throw outputError;}
   return result;
  }finally{clearDeathBatchRollbackR85(payload);state.active=null;}
 }
}
