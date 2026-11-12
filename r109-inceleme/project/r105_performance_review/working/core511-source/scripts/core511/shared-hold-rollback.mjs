import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {CAPACITY} from './contract.mjs';

// Only a writer-branded, completed LOCAL rollback can abort a still-reserving
// shared hold. Code strings and unknown/committed/shared outcomes are not proof.
export const sharedHoldRollbackIsolation=retiredActorIsolation&&process.env.CORE511_SHARED_HOLD_ROLLBACK!=='0';
// FixedLoop.durableGroup assigns one identical promise to its entire footprint.
// Capture before awaiting: FixedLoop clears every member's barrier on rollback,
// and the writer proof belongs to the initiator, not necessarily the first member.
export function sharedHoldBarrier(channel,barrier){
 const members=new Map();
 for(const [id,p]of channel.kernel.players)if(p.barrier===barrier){
  const owner=channel.owners.get(id);if(!owner||owner.epoch!==p.epoch||members.size===CAPACITY)return null;
  members.set(id,{p,owner,epoch:p.epoch});
 }
 return members;
}
export function sharedHoldRollback(error,id,epoch,channel,members){
 const r=actorRejection(error),peer=channel.peer,awaited=members?.get(id),source=members?.get(r?.actor);
 if(!r||r.outcome!=='not_executed'||!awaited||awaited.epoch!==epoch||!source||source.epoch!==r.epoch||r.channel!==peer.channel||r.incarnation!==peer.incarnation||r.sharedLease!==undefined||r.unsubmitted!==undefined)return null;
 // No owner/player replacement or a still-pending sibling may be hidden by
 // another member's known rollback. The same captured group must have settled.
 for(const [member,row]of members)if(channel.owners.get(member)!==row.owner||channel.kernel.players.get(member)!==row.p||row.owner.epoch!==row.epoch||row.p.epoch!==row.epoch||row.p.barrier!==null)return null;
 return {actor:r.actor,epoch:r.epoch,code:'actor_command_rejected',reason:error.code};
}
