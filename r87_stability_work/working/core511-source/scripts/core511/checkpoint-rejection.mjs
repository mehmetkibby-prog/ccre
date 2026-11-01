import {kernelError} from './contract.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
import {actorFaultIsolation} from './r48-options.mjs';

// A code received over IPC is not proof that a command was rolled back. Keep
// the writer-created exception and exact command identity private until the
// native atomic promise rejects AFTER its request savepoint was rolled back.
const conflicts=new WeakMap();
const report=createFaultReporter(line=>process.stderr.write(line));
export function checkpointConflict(saved,base,columns,context){
 const error=kernelError('checkpoint_snapshot_conflict');
 if(actorFaultIsolation){
  const checkpointColumns=Object.freeze(columns.filter(name=>!Object.is(saved?.[name],base?.[name])));
  const proof=Object.freeze({actor:context.actor,epoch:context.epoch,key:context.key,channel:context.peer?.channel,incarnation:context.peer?.incarnation,checkpointColumns});
  conflicts.set(error,proof);
  error.fenceContext={operation:'actor_checkpoint',phase:'compare',actor:proof.actor,channel:proof.channel,incarnation:proof.incarnation,requestEpoch:proof.epoch,checkpointColumns};
  report({error});
 }
 return error;
}
export function checkpointConflictProof(error,peer,request){
 if(!actorFaultIsolation||request.operation!=='actor_checkpoint'||request.payload?.sharedLease)return null;
 const proof=conflicts.get(error);
 return proof&&proof.actor===request.playerId&&proof.epoch===request.epoch&&proof.key===request.operationId&&proof.channel===peer.channel&&proof.incarnation===peer.incarnation?proof:null;
}
