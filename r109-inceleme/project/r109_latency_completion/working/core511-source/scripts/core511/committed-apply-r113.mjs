import {mergeDeathBundleR86} from './death-movement-r86.mjs';
import {decodeCommittedActorR113,decodeCommittedImageR113} from './committed-codec-r113.mjs';
import {committedResultsR113,committedResultMetricsR113} from './committed-protocol-r113.mjs';

export async function installCommittedResultR113(runtime,result,context){
 const d=result.committedR113;if(!d?.indirect)return applyCommittedResultR113(runtime,result,context);
 const wanted=new Set(result.players.map(p=>p.id)),actors=d.actors.filter(p=>wanted.has(p.id)&&runtime.channel.owners.has(p.id));
 const parts=await runtime.request('read_committed_r113',{operationId:d.operationId,actors});
 if(!parts){committedResultMetricsR113.recovered++;return false;}
 return applyCommittedResultR113(runtime,{...result,committedR113:{...d,actors:parts,indirect:false}},context);
}

// Prepare the entire recipient set before touching resident state. This port
// accepts only a writer result delivered after durable COMMIT, never a client
// command. Epoch and revision gaps recover through the existing snapshot path.
export function applyCommittedResultR113(runtime,result,context){
 const c=runtime.channel,delta=result.committedR113;
 if(!committedResultsR113||!delta)return false;
 const recover=()=>{committedResultMetricsR113.recovered++;return false;};
 if(delta.version!==1||delta.cycle!==c.world.cycle||typeof delta.operationId!=='string'||!Array.isArray(delta.actors)||!Array.isArray(result.players))return recover();
 const needed=result.players.filter(p=>c.owners.has(p.id)),parts=new Map();
 let settings=delta.dungeonSettingsR113===undefined?null:decodeCommittedImageR113(delta.dungeonSettingsR113);
 if(delta.dungeonSettingsRefR113!==undefined){
  const ref=delta.dungeonSettingsRefR113;
  if(typeof ref!=='string'||!/^[a-f0-9]{64}$/.test(ref)||c.dungeonSettingsR113?.ref!==ref)return recover();
  settings=c.dungeonSettingsR113.settings;
 }
 if(delta.dungeonSettingsR113!==undefined&&(!settings||!['game_settings','combat_settings','dungeon_settings','kadim_tower_settings'].every(k=>settings[k]&&typeof settings[k]==='object')))return recover();
 for(const encoded of delta.actors){const part=decodeCommittedActorR113(encoded);if(!part?.id||parts.has(part.id))return recover();parts.set(part.id,part);}
 const prepared=[];
 for(const row of needed){
  const part=parts.get(row.id),owner=c.owners.get(row.id),p=c.kernel.players.get(row.id),sub=runtime.world.subscribers.get(row.id),bundle=part?.bundle;
  if(bundle?.dungeon&&!Object.hasOwn(bundle.dungeon,'settings')){if(!settings)return recover();bundle.dungeon={...bundle.dungeon,settings};}
  if(!part||!bundle||bundle.player?.id!==row.id||bundle.owner?.epoch!==owner.epoch||bundle.owner?.incarnation!==owner.incarnation||bundle.owner?.channel!==owner.channel||bundle.world?.cycle!==c.world.cycle||
   !Number.isSafeInteger(part.base)||part.next!==part.base+1||c.commitRevisionsR113.get(row.id)!==part.base||
   !p||p.epoch!==owner.epoch||!p.barrier&&!p.externalHold||!c.lanes.busy(['player:'+row.id])||
   !sub||sub.data.area!==row.area||sub.data.channel!==row.channel||bundle.player.area!==row.area||bundle.player.channel!==row.channel||Object.keys(row).some(key=>!Object.is(row[key],bundle.player[key]))||
   part.sections?.owner?.id!==row.id||part.sections.owner.area!==row.area||part.sections.owner.channel!==row.channel)return recover();
  const revision=c.revision+prepared.length+1,installed=mergeDeathBundleR86(context?.deathMotionR86,{...bundle,revision,commitRevisionR113:part.next,combat:{...bundle.combat,revision}});
  // Movement accepted during this exact durable death may be newer than SQL.
  // Apply the existing proven merge to the private owner image as well.
  const own={...part.sections.owner};
  for(const key of Object.keys(own))if(Object.hasOwn(installed.player,key)&&!Object.is(installed.player[key],bundle.player[key]))own[key]=installed.player[key];
  prepared.push({bundle:installed,sections:{...part.sections,owner:own}});
 }
 for(const {bundle,sections}of prepared){c.applyBundle(bundle);runtime.world.commitPrivateR113(bundle.player.id,sections);runtime.slimReload.forget(bundle.player.id);}
 for(const monster of result.monsters??[])c.setMonster(monster);
 if(result.mistLoot)runtime.adventure.refreshLoot(result.mistLoot);
 committedResultMetricsR113.applied++;return true;
}
