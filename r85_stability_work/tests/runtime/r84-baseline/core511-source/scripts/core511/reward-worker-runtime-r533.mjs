import {statSync} from 'node:fs';
import {deathBatchWorkerCallR57} from './death-batch-writer-r57.mjs';
import {statementBootPoolR61,prepareCombatStatementBootR61} from './statement-boot-pool-r61.mjs';
import {parentPort,workerData} from 'node:worker_threads';
import {LocalDatabase} from '../../../native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {GameWriter} from './writer-runtime.mjs';
import {installRegistry} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab/registry.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {demand} from './contract.mjs';
import {workerWindowR56} from './r56-options.mjs';
import {installRewardGroupCommitR53} from './reward-group-commit-r53.mjs';
import {installRewardCheckpointR79} from './checkpoint-runtime-r79.mjs';

export async function runRewardWorkerR533({hook=()=>{}}={}){
 const config=workerData,stat=statSync(config.file);
 demand(config.role==='core511-reward-r533'&&String(stat.dev)===config.dev&&String(stat.ino)===config.ino&&stat.nlink===1,'reward_worker_file_identity');
 // This connection runs only while the parent's sole-writer FIFO is reserved.
 // FULL WAL COMMIT is the ACK boundary, including parent/worker kill -9.
 const database=new LocalDatabase(config.file,{create:false,groupWrites:true,asyncDurable:false});
 const checkpoint=installRewardCheckpointR79(database,config.checkpointR79);
 // Protocol permits exactly one outstanding command. Waiting20ms for a second
 // command cannot form a group here; the parent sole-writer lane stays held.
 // Install the existing bounded FIFO/commit/fsync machinery with no idle window.
 if(workerWindowR56)installRewardGroupCommitR53(database,{windowMs:0});
 const registry=installRegistry(),sql=database.sqlite;let current=null,clock=Date.now(),written=[];
 const writer=new GameWriter(database,{realmId:config.realmId,clock:()=>clock,ports:{guard:(db,payload,context,kind)=>{
  const r=current?.request;demand(db===sql&&db.isTransaction&&r&&context.realm===config.realmId&&((context.actor===r.playerId&&context.epoch===r.epoch&&context.key===r.operationId&&kind===r.operation&&payload===r.payload)||deathBatchWorkerCallR57(r,payload,context,kind)),'reward_worker_guard');return true;
 }}});
 writer.authority.commandGuard=(_sql,peer,request)=>{
  demand(current&&peer.channel===current.peer.channel&&peer.incarnation===current.peer.incarnation&&request.playerId===current.request.playerId&&request.epoch===current.request.epoch&&request.operation===current.request.operation,'reward_worker_command_guard');
  for(const id of [request.playerId,...(request.payload?.resources??[]).filter(k=>k.startsWith('player:')).map(k=>k.slice(7))]){const code=current.blocked.find(row=>row[0]===id)?.[1];if(code)throw Object.assign(Error(code),{code});}
  return true;
 };
 writer.sharedCombat={
  assertWrite(db,payload,context){const h=current?.shared;demand(h&&payload.sharedLease===h.proof&&context.actor===current.request.playerId&&context.epoch===current.request.epoch,'reward_worker_shared_scope');for(const p of h.owners){const o=writer.authority.owner(p.id,db);demand(o&&['channel','incarnation','epoch','sequence','state'].every(k=>o[k]===p[k]),'shared_terminal_actor_changed');}return true;},
  allows(id,peer,request){const h=current?.shared;return Boolean(h&&request.payload?.sharedLease===h.proof&&request.playerId===current.request.playerId&&peer.channel===current.peer.channel&&peer.incarnation===current.peer.incarnation&&h.actors.includes(id));}
 };
 await writer.initialize();
 if(statementBootPoolR61)prepareCombatStatementBootR61(sql);
 const materialize=writer.presence.materialize.bind(writer.presence);writer.presence.materialize=db=>(written=materialize(db));
 const commit=database.commitWrites.bind(database);database.commitWrites=()=>{hook('before_commit',{database,current});commit();hook('after_commit',{database,current});};
 let serial=0,queue=Promise.resolve();
 parentPort.on('message',message=>{queue=queue.then(async()=>{
  if(message.type==='checkpoint_mode_r79'){demand(!current,'reward_checkpoint_pending');checkpoint.sync();parentPort.postMessage({type:'checkpoint_mode_r79',checkpointR79:checkpoint.snapshot()});return;}
  if(message.type==='close'){demand(!current,'reward_worker_close_pending');registry.close();checkpoint.close();database.close();parentPort.postMessage({type:'closed'});return;}
  demand(message.type==='run'&&Number.isSafeInteger(message.id)&&message.id>serial&&!current,'reward_worker_protocol');serial=message.id;current=message.envelope;clock=current.clockNow;written=[];
  const started=performance.now();
  try{
   demand(['attack','native_action'].includes(current.request.operation)&&(current.request.operation==='attack'||current.request.payload.input?.action==='claim_rewards'),'reward_worker_operation');
   registry.registry.apply(current.registry);for(const fault of current.registryFaults??[])registry.registry.stop(fault.runId,{code:fault.code});
   writer.refreshOwners();writer.services.refresh();writer.services.globals.__colAdventure.profileCache.clear();writer.presence.rows=new Map(current.presence.map(p=>[p.actor,p]));
   hook('before_command',{database,current});const ack=await writer.command(current.peer,current.request);hook('after_command',{database,current,ack});
   parentPort.postMessage({id:message.id,ok:true,ack,written:written.map(p=>[p.actor,p.version]),workMs:performance.now()-started});
  }catch(error){parentPort.postMessage({id:message.id,ok:false,error:{code:error.code??'reward_worker_failed',message:error.message,stack:error.stack,fenceContext:error.fenceContext,rejection:actorRejection(error)},workMs:performance.now()-started});}
  finally{current=null;}
 }).catch(error=>{parentPort.postMessage({type:'fatal',code:error.code??'reward_worker_failed'});process.exitCode=1;parentPort.close();});});
 parentPort.postMessage({type:'ready',checkpointR79:checkpoint.snapshot()});
}
