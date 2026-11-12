import {demand} from './contract.mjs';
import {requestDigest,opaqueId} from './generated/owner-protocol.mjs';

// Built once on the failed-command path. A near-limit command must not need
// retransmission inside a larger status frame to read its existing receipt.
export function commandStatusDescriptor(peer,command){
 const {playerId,epoch,sequence,operationId,operation,payload}=command;
 const actors=[...new Set([playerId,...(payload?.resources??[]).filter(k=>typeof k==='string'&&k.startsWith('player:')).map(k=>k.slice(7))])];
 demand(actors.length<=100,'actor_unknown_resources');for(const id of actors)opaqueId(id);
 return {statusVersion:1,playerId,epoch,sequence,operationId,operation,digest:requestDigest({realmId:peer.realm,channel:peer.channel,playerId,epoch,sequence,operation,payload}),actors};
}
