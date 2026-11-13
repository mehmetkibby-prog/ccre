import {demand,kernelError} from './contract.mjs';
import {systemService} from './system-writer.mjs';
import {eventDigest} from './durable-ledger.mjs';
import {withPreparedStatements477} from '../../../native510-bb3a6cc689c6/vds-server/src/prepared-statements477.mjs';

// Use the same one-writer FIFO for instance timers and actor commands. The
// parent validates its live process/global barriers; the worker repeats SQL
// epoch/sequence/receipt and native adventure ownership under the writer lock.
export function systemPersistenceR113(worker,peer,request){
 if(!worker?.file||worker.closed||request?.kind!=='adventure_step')return null;
 const {database,writer,core,lane}=worker,system=writer.system,sql=database.sqlite,marker={};let envelope;
 const publish=value=>{worker.publishCommitted();writer.services.globals.__colAdventure.profileCache.clear();return value;};
 return {execute:(db,payload,context)=>{
  if(core.permanent.entries.size||lane.nativeWrites)return system.operations.get(request.kind)(db,payload,context);
  demand(db===sql&&db.isTransaction&&Array.isArray(payload.actors)&&payload.actors.length<=25,'system_persistence_scope');
  for(const a of payload.actors){const owner=core.authority.assertSimulated(db,peer,a.id,a.epoch,{allowDraining:true});demand(owner.sequence===a.sequence,'adventure_actor_sequence');}
  const registry=globalThis.__colLoadLab;demand(registry?.snapshot&&registry.faults,'system_persistence_registry');
  envelope={systemR113:true,peer,request,clockNow:core.clock(),registry:registry.snapshot(),registryFaults:registry.faults()};throw marker;
 },atomic:work=>lane.run(async()=>{
  database.assertAvailable();demand(!sql.isTransaction,'system_persistence_main_transaction');sql.exec('BEGIN IMMEDIATE');
  let delegated=false,value;
  try{value=withPreparedStatements477(sql,()=>work(sql));database.commitWrites();}
  catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');if(error!==marker){await database.durableAfterCommit();throw error;}delegated=true;}
  if(!delegated){await database.durableAfterCommit();return value;}
  const service=systemService(peer),digest=eventDigest({realm:system.realmId,service,incarnation:peer.incarnation,epoch:request.epoch,sequence:request.sequence,kind:request.kind,payload:request.payload});
  for(let attempt=0;;attempt++){
   let result;
   try{result=await worker.send(envelope);}catch(error){
    const slot=worker.slot;demand(slot,'system_persistence_missing_slot');await slot.exit;await database.durableAfterCommit();
    const owner=system.assert(sql,peer,request.epoch),receipt=sql.prepare('SELECT * FROM kernel511_system_receipts WHERE operation_id=?').get(request.key);
    if(receipt){demand(receipt.service===service&&receipt.digest===digest&&receipt.epoch===request.epoch&&receipt.sequence===request.sequence&&owner.sequence===request.sequence,'system_persistence_receipt_fenced');worker.stats.replays++;return JSON.parse(receipt.response);}
    demand(owner.sequence===request.sequence-1&&!sql.isTransaction,'system_persistence_rollback_unproven');
    demand(Object.values(sql.prepare('PRAGMA quick_check').get())[0]==='ok','system_persistence_integrity');worker.stats.rollbacks++;
    // Only a confirmed absent receipt after actual exit permits one retry.
    // The sole lane is still held; no later native write has passed this job.
    if(attempt===0)continue;throw kernelError('system_persistence_rolled_back');
   }
   if(!result.ok)throw Object.assign(Error(result.error.message),result.error);
   const receipt=sql.prepare('SELECT service,epoch,sequence,digest FROM kernel511_system_receipts WHERE operation_id=?').get(request.key);
   demand(result.ack?.key===request.key&&result.ack.sequence===request.sequence&&receipt?.service===service&&receipt.epoch===request.epoch&&receipt.sequence===request.sequence&&receipt.digest===digest,'system_persistence_ack_fenced');
   worker.stats.jobs++;worker.stats.maxWorkerMs=Math.max(worker.stats.maxWorkerMs,result.workMs??0);return result.ack;
  }
 }).then(publish)};
}
