import {readResourceMonstersR56} from './resource-reads-r56.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';
import {assertResourceActorFenceR57} from './authority-read-r57.mjs';

// The private IPC peer identifies the process; client request fields do not
// authorize another owner. Run inside the same native durable transaction.
// Player/monster write audits still check actual statements and triggers.
export function assertNativeWriteResources(sql,payload,context,{authority,shared}){
 const resources=payload?.resources;
 demand(sql.isTransaction&&Array.isArray(resources)&&resources.length>0&&resources.length<=2048&&resources.every(k=>typeof k==='string'&&k.length<=240&&/^(player|monster):.+$/.test(k))&&resources.includes('player:'+context.actor),'native_write_resource_scope');
 if(payload.sharedLease){demand(shared,'shared_writer_authority_missing');shared.assertWrite(sql,payload,context);}
 const monstersR56=readResourceMonstersR56(sql,resources.filter(k=>k.startsWith('monster:')).map(k=>k.slice(8)),'channel');
 const fencesR57=!payload.sharedLease?authority.resourceFencesR57?.(sql,resources.filter(k=>k.startsWith('player:')).map(k=>k.slice(7))):null;
 let processCheckedR57=false;
 for(const key of new Set(resources)){
  if(key.startsWith('player:')){
   const id=key.slice(7),fence=fencesR57?.get(id),owner=fence?fence.owner:authority.owner(id,sql),live=fence?(fence.admission??fence.simulation):authority.admission(id,sql)||authority.simulation(id,sql);
   demand(fence?fence.exists:prepareCached477(sql,'SELECT 1 FROM players WHERE id=?').get(id),'native_write_resource_player');
   if(live){
    demand(owner,'player_write_owner_missing');
    if(owner.channel===context.peer.channel&&owner.incarnation===context.peer.incarnation){if(fence){assertResourceActorFenceR57(authority,sql,context.peer,fence,{checkProcess:!processCheckedR57});processCheckedR57=true;}else authority.assertSimulated(sql,context.peer,id,owner.epoch,{allowDraining:true});}
    else demand(payload.sharedLease&&shared.allows(id,context.peer,{playerId:context.actor,payload}),'player_write_foreign_owner');
   }
  }else{
   const row=monstersR56?monstersR56.get(key.slice(8)):prepareCached477(sql,'SELECT channel FROM monsters WHERE id=?').get(key.slice(8));
   // Native settlement may clear an already removed target. This grants no
   // permission to insert or mutate foreign rows; actual write scope checks
   // fresh children against their held native stone parent.
   if(row?.channel===0)demand(payload.sharedLease,'shared_writer_lease_required');
   else if(row)demand(row.channel===context.peer.channel,'monster_write_foreign_owner');
  }
 }
 return true;
}
