import {actorRejection} from './actor-rejection.mjs';
import {demand} from './contract.mjs';
import {quarantineDrainR531} from './r531-options.mjs';
const aborted=new WeakMap();
// Called only after FixedLoop has validated the exact group's rollback and
// released all its barriers. Never infer this from a code string or a timeout.
export function recordGroupRejectionR531(promise,error,group){
 if(!quarantineDrainR531)return;
 const rejection=actorRejection(error);
 demand(rejection&&group.some(g=>g.id===rejection.actor&&g.p.epoch===rejection.epoch),'group_rejection_unproven');
 aborted.set(promise,{error,actors:new Map(group.map(g=>[g.id,g.p.epoch]))});
}
export function groupRejectionCoversR531(promise,error,id,epoch){
 const proof=quarantineDrainR531&&aborted.get(promise);
 return Boolean(proof&&proof.error===error&&proof.actors.get(id)===epoch);
}
