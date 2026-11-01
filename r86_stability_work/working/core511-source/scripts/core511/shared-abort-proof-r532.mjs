import {sharedAbortEpochR532} from './r532-options.mjs';

// A retirement can COMMIT epoch+1 before isolate_detach reaches its channel.
// That channel correctly rejects a hold with its still-stopped old epoch.
// Capture BOTH valid identities before sending any holds. A later detach ACK
// may delete the isolation entry; it cannot invalidate this pre-command abort.
// This proof grants no write, reward, admission, thaw or committed ACK.
export function captureSharedAbortOwners(core){
 const owners=new Map([...core.writer.owners].map(([id,o])=>[id,{epoch:o.epoch,channel:o.channel,incarnation:o.incarnation}]));
 if(sharedAbortEpochR532)for(const [id,p]of core.actorIsolation?.entries??[]){
  const current=core.writer.owners.get(id),captured=owners.get(id);
  if(p.actor===id&&p.stopped===true&&p.phase==='retiring'&&current?.epoch===p.epoch+1&&current.state==='active'&&current.sequence===0&&current.channel===p.peer.channel&&current.incarnation===p.peer.incarnation&&!core.authority.admission(id))captured.retiredEpoch=p.epoch;
 }
 return owners;
}
export function sharedAbortOwnerMatches(owner,rejection,peer){
 return Boolean(owner&&(owner.epoch===rejection.epoch||sharedAbortEpochR532&&owner.retiredEpoch===rejection.epoch)&&owner.channel===peer.channel&&owner.incarnation===peer.incarnation&&typeof rejection.reason==='string'&&/^[a-z][a-z0-9_]{0,95}$/.test(rejection.reason));
}
