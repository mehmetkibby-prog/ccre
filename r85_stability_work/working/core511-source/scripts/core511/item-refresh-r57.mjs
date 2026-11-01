import {itemRefreshR57} from './r57-options.mjs';
import {certifyActorSectionsR52,refreshActorSectionsR52} from './actor-section-reuse-r52.mjs';
import {captureCommitSectionsR57} from './actor-commit-sections-r57.mjs';
import {readActorBatches} from './ipc-safe-stream.mjs';
import {captureWeaponCountersR57,prepareWeaponCountersR57} from './weapon-counter-r57.mjs';
// Keep authoritative full equipment reads for every audited item owner. Only
// the other held recipients may reuse the existing validated section path.
function split(result){
 const audit=result.sharedRefresh,cold=audit?.itemActorsR57;
 if(!itemRefreshR57||!Array.isArray(result.players)||!result.players.length||result.players.length>25||!Array.isArray(audit?.tables)||!audit.tables.includes('player_items')||!Array.isArray(audit.actors)||!Array.isArray(cold)||!cold.length||cold.length>result.players.length||new Set(cold).size!==cold.length||cold.some(id=>typeof id!=='string'||!result.players.some(p=>p.id===id)))return null;
 const ids=new Set(cold),players=result.players.filter(p=>!ids.has(p.id));
 // Promote the one live proof, without retaining a second nested copy in the
 // temporary R52 result. Otherwise 25 full native rows exceed its byte bound
 // even though the actual bounded wire reply fits, forcing another group read.
 const {itemRefreshR57:unused,...base}=result;
 return {cold,players,warm:{...base,players,sharedRefresh:{...audit,tables:audit.tables.filter(t=>t!=='player_items'),actors:audit.actors.filter(id=>!ids.has(id)),itemActorsR57:[]}}};
}
export function captureItemRefreshR57(sql,kind,payload,context,result){
 if(kind!=='attack')return result;
 const parts=split(result);if(!parts)return result;
 const now=Date.now(),counter=captureWeaponCountersR57(sql,result,parts.cold,now);
 if(counter){
  const all={...parts.warm,players:result.players,sharedRefresh:{...parts.warm.sharedRefresh,actors:result.sharedRefresh.actors}};
  const warm=captureCommitSectionsR57(sql,certifyActorSectionsR52(sql,kind,payload,context,all),{nowMs:now});
  if(warm.actorSectionsR52&&warm.actorCommitSectionsR57){const value={...result,itemRefreshR57:{version:1,mode:'counter',cold:parts.cold,...counter,actorSectionsR52:warm.actorSectionsR52,actorCommitSectionsR57:warm.actorCommitSectionsR57}};if(Buffer.byteLength(JSON.stringify(value))<=512*1024)return value;}
 }
 if(!parts.players.length)return result;
 const warm=captureCommitSectionsR57(sql,certifyActorSectionsR52(sql,kind,payload,context,parts.warm));
 if(!warm.actorSectionsR52)return result;
 const value={...result,itemRefreshR57:{version:1,cold:parts.cold,actorSectionsR52:warm.actorSectionsR52,...(warm.actorCommitSectionsR57?{actorCommitSectionsR57:warm.actorCommitSectionsR57}:{})}};
 return Buffer.byteLength(JSON.stringify(value))<=512*1024?value:result;
}
export const itemRefreshMetricsR57={applied:0,coldActors:0,reusedActors:0,fallback:0};
export async function refreshItemSectionsR57(runtime,result,readDrops){
 const meta=result.itemRefreshR57,parts=split(result);if(!parts||meta?.version!==1||!Array.isArray(meta.cold)||JSON.stringify(meta.cold)!==JSON.stringify(parts.cold)||!meta.actorSectionsR52||Buffer.byteLength(JSON.stringify(result))>512*1024)return false;
 if(meta.mode==='counter'){
  const apply=prepareWeaponCountersR57(runtime,meta);if(!apply){itemRefreshMetricsR57.fallback++;return false;}
  const all={...parts.warm,players:result.players,sharedRefresh:{...parts.warm.sharedRefresh,actors:result.sharedRefresh.actors},actorSectionsR52:meta.actorSectionsR52,actorCommitSectionsR57:meta.actorCommitSectionsR57};
  if(!await refreshActorSectionsR52(runtime,all,readDrops)){itemRefreshMetricsR57.fallback++;return false;}
  apply();itemRefreshMetricsR57.applied++;itemRefreshMetricsR57.counterActors=(itemRefreshMetricsR57.counterActors??0)+meta.items.length;itemRefreshMetricsR57.reusedActors+=result.players.length;return true;
 }
 const c=runtime.channel,marks=[];
 for(const row of result.players){
  const owner=c.owners.get(row.id);if(!owner)continue;
  const p=c.kernel.players.get(row.id),sub=runtime.world.subscribers.get(row.id);
  if(!p?.barrier||p.suspended||p.externalHold||p.epoch!==owner.epoch||!c.lanes.busy(['player:'+row.id])||!sub){itemRefreshMetricsR57.fallback++;return false;}
  marks.push({id:row.id,owner,p,barrier:p.barrier,sub,revision:sub.revision});
 }
 const cold=parts.cold.filter(id=>c.owners.has(id));
 const bundles=await readActorBatches(cold,id=>c.loadActor(id,c.owners.get(id).epoch,++c.revision));
 for(const m of marks)if(c.owners.get(m.id)!==m.owner||c.kernel.players.get(m.id)!==m.p||m.p.barrier!==m.barrier||m.p.suspended||m.p.externalHold||runtime.world.subscribers.get(m.id)!==m.sub||m.sub.revision!==m.revision){itemRefreshMetricsR57.fallback++;return false;}
 // All cold fences must pass before the warm path installs any actor.
 for(const b of bundles){const owner=c.owners.get(b.player?.id);if(!owner||b.owner?.epoch!==owner.epoch||b.owner?.incarnation!==c.peer.incarnation||b.player.channel!==c.peer.channel||b.world?.cycle!==c.world.cycle||!Number.isSafeInteger(b.revision)||b.revision!==b.combat?.revision){itemRefreshMetricsR57.fallback++;return false;}}
 const warm={...parts.warm,actorSectionsR52:meta.actorSectionsR52,...(meta.actorCommitSectionsR57?{actorCommitSectionsR57:meta.actorCommitSectionsR57}:{})};
 if(!await refreshActorSectionsR52(runtime,warm,readDrops)){itemRefreshMetricsR57.fallback++;return false;}
 for(const b of bundles)c.applyBundle(b);
 itemRefreshMetricsR57.applied++;itemRefreshMetricsR57.coldActors+=bundles.length;itemRefreshMetricsR57.reusedActors+=parts.players.length;return true;
}
