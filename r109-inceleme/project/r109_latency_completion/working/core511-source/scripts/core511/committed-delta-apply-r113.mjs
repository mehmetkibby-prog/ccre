import {prepareWeaponCountersR57} from './weapon-counter-r57.mjs';
import {refreshActorSectionsR52} from './actor-section-reuse-r52.mjs';
import {committedResultMetricsR113} from './committed-protocol-r113.mjs';

export function applyCommittedDeltaR113(runtime,result,context){
 const d=result.committedR113,c=runtime.channel,needed=(result.players??[]).filter(p=>c.owners.has(p.id));
 if(d.version!==2||d.kind!=='actor-sections'||d.cycle!==c.world.cycle||typeof d.operationId!=='string'||!Array.isArray(d.actors)||d.actors.length>25||!d.scope||!d.sections)return false;
 const parts=new Map();
 for(const p of d.actors){if(!p?.id||parts.has(p.id))return false;parts.set(p.id,p);}
 for(const row of needed){
  const p=parts.get(row.id),owner=c.owners.get(row.id);
  if(!p||!Number.isSafeInteger(p.base)||p.next!==p.base+1||c.commitRevisionsR113.get(row.id)!==p.base||p.epoch!==owner.epoch||p.channel!==owner.channel||p.incarnation!==owner.incarnation)return false;
 }
 let audit=result.sharedRefresh,applyCounters=null;
 if(d.counters){
  if(!Array.isArray(audit?.tables)||!audit.tables.includes('player_items')||JSON.stringify(audit.itemActorsR57)!==JSON.stringify(d.counters.cold))return false;
  applyCounters=prepareWeaponCountersR57(runtime,d.counters);if(!applyCounters)return false;
  audit={...audit,tables:audit.tables.filter(t=>t!=='player_items'),itemActorsR57:[]};
 }
 // No read callback: this call either validates and applies the entire native
 // patch synchronously, or returns false before any mutation. Missing/stale
 // sections, changed equipment, unknown columns and expired snapshots take
 // the existing authoritative full snapshot path.
 const applied=refreshActorSectionsR52(runtime,{...result,sharedRefresh:audit,actorSectionsR52:d.scope,actorCommitSectionsR57:d.sections,...(d.portal?{portalCreationR57:d.portal}:{})},null,context);
 if(applied!==true){committedResultMetricsR113.deltaFallback++;return false;}
 if(applyCounters)applyCounters();
 for(const row of needed)c.commitRevisionsR113.set(row.id,parts.get(row.id).next);
 committedResultMetricsR113.deltaApplied++;return true;
}
