import {demand} from './contract.mjs';

// Only an authenticated old-owner control reply can redirect a pending
// freeze. The native guild result and target ownership have already committed.
// A changed owner without this explicit retirement is still an unknown outcome.
export function retiredFreezeOwner(authority,id,source,ack,token){
 demand(ack?.id===id&&ack.token===token&&ack.epoch===source.epoch&&ack.channel===source.channel&&ack.incarnation===source.incarnation&&ack.retired===true,'freeze_retirement_scope');
 const owner=authority.owner(id),admission=authority.admission(id),simulation=authority.simulation?.(id),active=admission??simulation;
 demand(owner?.state==='active'&&owner.epoch===source.epoch+1&&active?.epoch===owner.epoch&&active.channel===owner.channel,'freeze_retirement_owner');
 return {...owner};
}
