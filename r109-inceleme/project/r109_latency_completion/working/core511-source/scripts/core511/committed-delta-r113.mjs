import {captureItemRefreshR57} from './item-refresh-r57.mjs';
import {certifyActorSectionsR52} from './actor-section-reuse-r52.mjs';
import {captureCommitSectionsR57} from './actor-commit-sections-r57.mjs';
import {readCommitRevisionR113} from './commit-revision-r113.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {demand} from './contract.mjs';

// Versioned changes reuse the audited native table/column projection contract.
// No full actor/combat/inventory hydration is performed for these outcomes.
// The reward transaction stores the complete bounded patch in its own receipt;
// a consumer with a different base must load current state, never replay RNG.
export function captureCommittedDeltaR113(sql,kind,payload,context,result,nowMs){
 let certified=certifyActorSectionsR52(sql,kind,payload,context,result),scope,sections,counters=null;
 if(certified.actorSectionsR52){const captured=captureCommitSectionsR57(sql,certified,{nowMs});scope=captured.actorSectionsR52;sections=captured.actorCommitSectionsR57;}
 else{
  // Ordinary kills advance the equipped weapon's non-stat evolution counter.
  // Reuse its byte-exact inventory/derived-enchantment validator; every other
  // item edit still requires the complete native image.
  const meta=captureItemRefreshR57(sql,kind,payload,context,result).itemRefreshR57;
  if(meta?.mode!=='counter')return null;
  scope=meta.actorSectionsR52;sections=meta.actorCommitSectionsR57;
  counters={cold:meta.cold,kills:meta.kills,items:meta.items};
 }
 if(!sections?.complete)return null;
 const actors=[];
 for(const part of scope.actors){
  if(!part.owner)continue;
  const base=readCommitRevisionR113(sql,part.id);demand(Number.isSafeInteger(base)&&Number.isSafeInteger(base+1),'committed_delta_revision');
  actors.push({id:part.id,base,next:base+1,...part.owner});
 }
 const committedR113={version:2,kind:'actor-sections',operationId:context.key,cycle:scope.cycle,at:nowMs,actors,scope,sections,
  ...(counters?{counters}:{}),...(result.portalCreationR57?{portal:result.portalCreationR57}:{})};
 const value={...result,committedR113};
 if(Buffer.byteLength(JSON.stringify(value))>224*1024)return null;
 for(const {id,next}of actors)prepareCached477(sql,'INSERT INTO kernel511_actor_revision_r113 VALUES(?,?) ON CONFLICT(actor) DO UPDATE SET revision=excluded.revision').run(id,next);
 return value;
}
