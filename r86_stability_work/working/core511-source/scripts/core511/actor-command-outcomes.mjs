import {demand} from './contract.mjs';
import {requestDigest} from './generated/owner-protocol.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {prepareCached477} from './writer-statements.mjs';

// Parent-memory evidence, never inferred from a timeout or a missing receipt.
// The authority records a rejection only after LocalDatabase has returned the
// original exception through its completed savepoint rollback/durability path.
// Parent restart retires the old channel incarnation; no proof crosses it.
export class ActorCommandOutcomes {
 constructor(authority){this.authority=authority;this.pending=new Map();this.rejected=new Map();this.actors=new Map();}
 identity(peer,request){return {operationId:request.operationId,actor:request.playerId,epoch:request.epoch,sequence:request.sequence,operation:request.operation,channel:peer.channel,incarnation:peer.incarnation,digest:requestDigest({realmId:this.authority.realmId,channel:peer.channel,playerId:request.playerId,epoch:request.epoch,sequence:request.sequence,operation:request.operation,payload:request.payload})};}
 same(a,b){return ['operationId','actor','epoch','sequence','operation','channel','incarnation','digest'].every(key=>a[key]===b[key]);}
 begin(peer,request){
  this.pruneActor(request.playerId);const old=this.rejected.get(request.operationId);
  if(old)demand(this.same(old,this.identity(peer,request)),'operation_id_reused');
  // Track queue entry before dispatch, without hashing every hot-path payload
  // twice. The exact digest is needed only on a retained cold-path rejection.
  const token={operationId:request.operationId,peer,request};let rows=this.pending.get(token.operationId);
  if(rows?.size){const exact=this.identity(peer,request);for(const pending of rows)demand(this.same(exact,this.identity(pending.peer,pending.request)),'operation_id_reused');}
  if(!rows)this.pending.set(token.operationId,rows=new Set());rows.add(token);return token;
 }
 finish(token){const rows=this.pending.get(token.operationId);rows?.delete(token);if(rows?.size===0)this.pending.delete(token.operationId);}
 inFlight(request){return (this.pending.get(request.operationId)?.size??0)>0;}
 otherInFlight(token){return (this.pending.get(token.operationId)?.size??0)>1;}
 remember(peer,request,error){
  const proof=actorRejection(error);
  // A shared request also needs completed shared_abort; its existing bridge
  // retains that stronger proof and supplies its own terminal status.
  if(!proof||proof.sharedLease||proof.unsubmitted)return;
  const row=this.identity(peer,request);
  demand(proof.outcome==='not_executed'&&proof.actor===row.actor&&proof.epoch===row.epoch&&proof.sequence===row.sequence&&proof.key===row.operationId&&proof.operation===row.operation&&proof.channel===row.channel&&proof.incarnation===row.incarnation,'actor_rollback_proof_mismatch');
  const old=this.rejected.get(row.operationId);demand(!old||this.same(old,row),'operation_id_reused');
  // Reap only demonstrably retired/advanced owners. Current unresolved proof
  // has no TTL and is never evicted to make room for a new request.
  for(const id of this.actors.keys())this.pruneActor(id);
  this.rejected.set(row.operationId,{...row,error:{code:error.code,message:error.code},rejection:proof});
  let ids=this.actors.get(row.actor);if(!ids)this.actors.set(row.actor,ids=new Set());ids.add(row.operationId);
 }
 remove(key){const row=this.rejected.get(key);if(!row)return;this.rejected.delete(key);const ids=this.actors.get(row.actor);ids?.delete(key);if(ids?.size===0)this.actors.delete(row.actor);}
 pruneActor(id){
  const ids=this.actors.get(id);if(!ids)return;const owner=this.authority.owner(id);
  for(const key of [...ids]){const row=this.rejected.get(key);if(!row){ids.delete(key);continue;}if(!owner||owner.epoch!==row.epoch||owner.channel!==row.channel||owner.incarnation!==row.incarnation||owner.sequence>=row.sequence)this.remove(key);}
 }
 forgetProcess(peer){for(const [key,row]of this.rejected)if(row.channel===peer.channel&&row.incarnation===peer.incarnation)this.remove(key);}
 rejectedStatus(peer,request,digest){
  const row=this.rejected.get(request.operationId);if(!row)return null;
  demand(row.actor===request.playerId&&row.epoch===request.epoch&&row.sequence===request.sequence&&row.operation===request.operation&&row.channel===peer.channel&&row.incarnation===peer.incarnation&&row.digest===digest,'actor_rollback_status_fenced');
  if(this.inFlight(request)||prepareCached477(this.authority.database.sqlite,'SELECT 1 FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId))return null;
  const owner=this.authority.owner(row.actor);
  if(!owner||owner.epoch!==row.epoch||owner.channel!==row.channel||owner.incarnation!==row.incarnation||!['active','draining'].includes(owner.state)||owner.sequence>=row.sequence){this.pruneActor(row.actor);return null;}
  return {status:'not_executed',error:row.error,rejection:row.rejection};
 }
}
