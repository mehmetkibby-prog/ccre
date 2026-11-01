import {deathMotionComparisonRowR86,mergeDeathRowR86} from './death-movement-r86.mjs';
import {INDEPENDENT_DEATH_EXTRA_LIMIT_R85,independentDeathBatchResultR85} from './independent-death-batch-r85.mjs';
import {resolveCommitRowR61} from './compact-commit-rows-r61.mjs';
import {rewardSectionTableR60,needsMaterialSectionsR60,validMaterialSectionR60,materialPartR60} from './reward-sections-r60.mjs';
import {actorSectionReuseR52} from './r52-options.mjs';
import {prepareCached477} from './writer-statements.mjs';
import {groundLoot30s} from './ground-loot-expiry.mjs';
import {ENCOUNTER_FIELDS} from './encounter-checkpoint.mjs';
import {rewardAsyncReplyR54} from './r54-options.mjs';
import {refreshReadPipelineR56,sectionReadGroupR56} from './r56-options.mjs';
import {commitSectionsR57} from './r57-options.mjs';
import {portalRefreshScopeR57,portalRefreshTableR57,preparePortalRefreshR57} from './portal-refresh-r57.mjs';
import {ACTOR_PROGRESS_FIELDS_R85,actorProgressPatchR85} from './actor-progress-refresh-r85.mjs';
import {prepareCollectMaterialsR85,applyCollectMaterialsR85} from './collect-materials-r85.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';

// This is an optional post-COMMIT refresh proof, never write authority. The
// existing owner/resource guards and native transaction run before it. Unknown
// cold-table effects, player columns, equipment, level and scope retain R51's
// complete authoritative reload. There is no persistent cache or new timer.
const areas=new Set(['forest','frozen','black','ancient','sanctum','rune_v2']);
const tables=new Set(['players','monster_xp_claims','normal_reward_claims','world_drops','pve_engagements','auth_rate_limits']);
export const ACTOR_REFRESH_FIELDS_R52=Object.freeze(['xp','essence','essence_bonus_remainder','gems','potions','pearls','stone_dust','hp','hp_revision','last_seen','last_monster_hit_at','combat_lock_until_ms','attack_one_at','attack_two_at','attack_three_at','attack_four_at','daily_monster_day','daily_monster_kills']);
export const ACTOR_REFRESH_LIMITS_R52=Object.freeze({actors:25,drops:512,proofBytes:128*1024,readBatch:4});
export const ACTOR_GROUP_READ_LIMITS_R56=Object.freeze({actors:25,bytes:512*1024});
const fields=new Set([...ACTOR_REFRESH_FIELDS_R52,...ACTOR_PROGRESS_FIELDS_R85]),{actors:MAX_ACTORS,drops:MAX_DROPS,proofBytes:MAX_PROOF_BYTES}=ACTOR_REFRESH_LIMITS_R52;
// The native projection reads this counter directly from the resident row.
// It changes no equipment, level, derived stats or cold projection section.
if(rewardAsyncReplyR54)fields.add('quest_kills438');
export const actorSectionMetricsR52={candidateChecks:0,notCandidate:0,statusFallback:0,actorCountFallback:0,certified:0,applied:0,actors:0,fullFallback:0,tableFallback:0,boundsFallback:0,scopeFallback:0,columnFallback:0,fenceFallback:0,dropsReads:0,dropsReadActors:0,dropsReadFallback:0};
// Byte-for-byte native DROPS_SQL apart from the explicit bounded LIMIT. It
// uses the same seconds/area/expiry rules. Special dragon catalog drops cannot
// occur in the supported ordinary areas and are conservatively refused below.
export const ACTOR_DROPS_SQL_R52=`SELECT id, owner_id, monster_id, kind, item_name, rarity, power, amount, role, enchantments, x, y, expires_at, collectible_at
  FROM world_drops WHERE owner_id = ? AND expires_at ${groundLoot30s ? '>' : '>='} ? AND enchantments NOT IN ('__pending__','__profile_pending__')
  AND monster_id NOT LIKE '%-afk-%'
  AND ((? = CASE WHEN monster_id LIKE 'event-%' THEN CASE WHEN json_extract((SELECT config_json FROM event_island_settings444 WHERE id=1),'$.enabled')=1 THEN 'event' ELSE 'bazaar' END WHEN monster_id LIKE 'rune-v2-%' THEN 'rune_v2' WHEN monster_id LIKE 'rune-%' THEN 'rune' WHEN monster_id='dragon-world-1' THEN 'dragon' WHEN monster_id LIKE '%-ancient-%' OR monster_id = 'ancient-boss-1' THEN 'ancient' ELSE 'forest' END AND monster_id != 'dunya-bosu-1' AND monster_id NOT LIKE 'sinsi-tasi-%' AND monster_id NOT LIKE '%-sinsi-%' AND monster_id NOT LIKE 'frozen-%' AND (monster_id LIKE 'event-%' OR monster_id NOT LIKE '%-frozen-%') AND monster_id NOT LIKE '%-black-%')
    OR (? = 'black' AND monster_id LIKE '%-black-%')
    OR (? = 'sanctum' AND monster_id = 'dunya-bosu-1')
    OR (? = 'sinsi' AND (monster_id LIKE 'sinsi-tasi-%' OR monster_id LIKE '%-sinsi-%'))
    OR (? = 'frozen' AND monster_id NOT LIKE 'event-%' AND (monster_id LIKE 'frozen-%' OR monster_id LIKE '%-frozen-%')))
  ORDER BY expires_at LIMIT 513`;

export function actorSectionCandidateR52(kind,payload){
 return actorSectionReuseR52&&!payload.sharedLease&&((kind==='attack'&&['kill','mixed'].includes(payload.localScope?.kind))||(kind==='native_action'&&payload.input?.action==='claim_rewards'&&payload.localScope?.kind==='claim'));
}

export function certifyActorSectionsR52(sql,kind,payload,context,result){
 if(!actorSectionReuseR52)return result;
 actorSectionMetricsR52.candidateChecks++;
 if(!actorSectionCandidateR52(kind,payload)){actorSectionMetricsR52.notCandidate++;return result;}
 if(result.result?.status!==200||result.mistLoot!==undefined){actorSectionMetricsR52.statusFallback++;return result;}
 if(!Array.isArray(result.players)||!result.players.length||result.players.length>MAX_ACTORS){actorSectionMetricsR52.actorCountFallback++;return result;}
 if(result.players.some(p=>p?.area==='rune_v2')&&(kind!=='attack'||!result.monsters?.length||!result.monsters.every(ordinaryRuneRewardR87))){actorSectionMetricsR52.scopeFallback++;return result;}
 const audit=result.sharedRefresh,portal=kind==='attack'&&portalRefreshScopeR57(result)&&result.portalCreationR57.channel===context.peer.channel;
 if(audit?.version!==1||audit.all!==false&&!portal||!Array.isArray(audit.tables)||!Array.isArray(audit.actors)||audit.tables.some(t=>!tables.has(t)&&!rewardSectionTableR60(t)&&!(portal&&portalRefreshTableR57(t)))){actorSectionMetricsR52.tableFallback++;return result;}
 const ids=new Set(result.players.map(p=>p?.id));if(ids.size!==result.players.length||audit.actors.some(id=>!ids.has(id))){actorSectionMetricsR52.scopeFallback++;return result;}
 const claim=kind==='native_action',encounters=claim?result.encounters:null;
 if(claim&&(!Array.isArray(encounters)||encounters.length!==result.players.length||new Set(encounters.map(e=>e?.[0])).size!==encounters.length||encounters.some(e=>!Array.isArray(e)||e.length!==2||!ids.has(e[0])||!validEngagement(e[1],e[0])))){actorSectionMetricsR52.scopeFallback++;return result;}
 if(!claim&&(!Object.hasOwn(result,'engagement')||!validEngagement(result.engagement,context.actor))){actorSectionMetricsR52.scopeFallback++;return result;}
 const cycle=prepareCached477(sql,'SELECT cycle FROM world_state WHERE id=1').get()?.cycle,actors=[];
 if(!Number.isSafeInteger(cycle)||portal&&result.portalCreationR57.cycle!==cycle)return result;
 for(const row of result.players){
  if(!row||typeof row.id!=='string'||row.hp<=0||!areas.has(row.area)||row.arena_match_id||row.channel!==context.peer.channel){actorSectionMetricsR52.scopeFallback++;return result;}
  const owner=prepareCached477(sql,'SELECT channel,incarnation,epoch,state FROM kernel511_channel_owners WHERE player_id=?').get(row.id);
  // Recently disconnected reward recipients have no resident state to reuse.
  // Their DB reward remains untouched; resident validation ignores them.
  if(owner&&(owner.state!=='active'||owner.channel!==context.peer.channel||owner.incarnation!==context.peer.incarnation)){actorSectionMetricsR52.scopeFallback++;return result;}
  const batchIndex=kind==='attack'&&Array.isArray(result.batchEngagementsR57)?result.batchEngagementsR57.findIndex(e=>e?.[0]===row.id):-1;
  const engagementRef=claim?{kind:'ack-encounter',index:encounters.findIndex(e=>e[0]===row.id)}:batchIndex>=0?{kind:'ack-batch-r57',index:batchIndex}:{kind:row.id===context.actor?'ack-attack':'resident'};
  const entry={id:row.id,owner:owner?{channel:owner.channel,incarnation:owner.incarnation,epoch:owner.epoch}:null,engagementRef};
  actors.push(entry);
 }
 // ACK already carries claim encounters / the attacker's encounter. Refer to
 // those existing rows rather than duplicating large attacker maps. Other
 // attack recipients must still match their held resident encounter. The
 // reader supplies each exact authoritative section, never an inferred row.
 const proof={version:1,cycle,actor:context.actor,actors,readSections:true,readDrops:audit.tables.includes('world_drops'),...(needsMaterialSectionsR60(result)?{readMaterialsR60:true}:{})};
 if(Buffer.byteLength(JSON.stringify(proof))>MAX_PROOF_BYTES){actorSectionMetricsR52.boundsFallback++;return result;}
 actorSectionMetricsR52.certified++;return {...result,actorSectionsR52:proof};
}

const validEngagement=(row,id)=>row===null||!!row&&typeof row==='object'&&!Array.isArray(row)&&Object.keys(row).length===ENCOUNTER_FIELDS.length&&ENCOUNTER_FIELDS.every(key=>Object.hasOwn(row,key))&&row.player_id===id;
const sameEngagement=(a,b,id)=>validEngagement(a,id)&&validEngagement(b,id)&&(a===null||b===null?a===b:ENCOUNTER_FIELDS.every(key=>Object.is(a[key],b[key])));
const invalidEngagement=Symbol('invalid encounter reference');
function referencedEngagement(runtime,result,part){
 const ref=part.engagementRef;if(!ref||typeof ref!=='object'||Array.isArray(ref))return invalidEngagement;
 let row;
 if(ref.kind==='ack-encounter'&&Object.keys(ref).length===2&&Number.isSafeInteger(ref.index)&&ref.index>=0){
  const entries=result.encounters;if(!Array.isArray(entries)||entries.length!==result.players.length||new Set(entries.map(e=>e?.[0])).size!==entries.length||entries.some(e=>!Array.isArray(e)||e.length!==2||!validEngagement(e[1],e[0])))return invalidEngagement;
  const entry=entries[ref.index];if(entry?.[0]!==part.id)return invalidEngagement;row=entry[1];
 }else if(ref.kind==='ack-batch-r57'&&Object.keys(ref).length===2&&Number.isSafeInteger(ref.index)&&ref.index>=0){
  const entries=result.batchEngagementsR57,answers=result.batchResultsR57;
  if(!Array.isArray(entries)||entries.length<1||entries.length>4&&!(entries.length<=INDEPENDENT_DEATH_EXTRA_LIMIT_R85&&independentDeathBatchResultR85(result))||!Array.isArray(answers)||answers.length!==entries.length||new Set(entries.map(e=>e?.[0])).size!==entries.length||entries.some((e,i)=>!Array.isArray(e)||e.length!==2||e[0]!==answers[i]?.actor||!validEngagement(e[1],e[0])))return invalidEngagement;
  const entry=entries[ref.index];if(entry?.[0]!==part.id)return invalidEngagement;row=entry[1];
 }else if(ref.kind==='ack-attack'&&Object.keys(ref).length===1&&result.actorSectionsR52.actor===part.id&&Object.hasOwn(result,'engagement'))row=result.engagement;
 else if(ref.kind==='resident'&&Object.keys(ref).length===1&&result.actorSectionsR52.actor!==part.id)row=runtime.channel.view.engagements.get(part.id)??null;
 else return invalidEngagement;
 return validEngagement(row,part.id)?row:invalidEngagement;
}
const reject=reason=>{actorSectionMetricsR52.fullFallback++;actorSectionMetricsR52[reason]++;return false;};
function validatedUpdates(runtime,result,{allowDropRead=false,context=null}={}){
 if(!actorSectionReuseR52||!result.actorSectionsR52)return false;
 const c=runtime.channel,proof=result.actorSectionsR52,audit=result.sharedRefresh,portal=portalRefreshScopeR57(result,c.world.cycle);
 if(proof.version!==1||proof.cycle!==c.world.cycle||!Array.isArray(proof.actors)||proof.actors.length>MAX_ACTORS||!Array.isArray(result.players)||proof.actors.length!==result.players.length||audit?.version!==1||audit.all!==false&&!portal||!Array.isArray(audit.tables)||!Array.isArray(audit.actors)||audit.tables.some(t=>!tables.has(t)&&!rewardSectionTableR60(t)&&!(portal&&portalRefreshTableR57(t))))return reject('scopeFallback');
 if(proof.readSections===true&&!allowDropRead)return reject('scopeFallback');
 if(audit.tables.some(rewardSectionTableR60)&&(audit.actors.some(id=>!result.players.some(row=>row?.id===id))||needsMaterialSectionsR60(result)&&proof.readMaterialsR60!==true))return reject('scopeFallback');
 const updates=[];const seen=new Set();
 for(let i=0;i<result.players.length;i++){
  const row=result.players[i],part=proof.actors[i];
  if(!row||part?.id!==row.id||seen.has(row.id))return reject('scopeFallback');seen.add(row.id);
  if(!c.owners.has(row.id))continue;
  const residentPrevious=c.view.player(row.id),previous=deathMotionComparisonRowR86(context?.deathMotionR86,row.id,residentPrevious),owner=c.owners.get(row.id),actor=c.kernel.players.get(row.id),sub=runtime.world.subscribers.get(row.id);
  if(!previous||!sub||!c.frames.entries.get(row.id)?.valid||row.hp<=0||previous.hp<=0||!areas.has(row.area)||row.arena_match_id||runtime.dungeon.locked(row.id)||sub.data.area!==row.area||sub.data.channel!==row.channel)return reject('scopeFallback');
  if(Object.keys(row).some(key=>!fields.has(key)&&(!Object.hasOwn(previous,key)||!Object.is(row[key],previous[key])))){
   if(process.env.CORE511_STAGE_TIMING==='1'){
    const reasons=actorSectionMetricsR52.columnReasonsR54??={};
    for(const key of Object.keys(row))if(!fields.has(key)&&!Object.is(row[key],previous[key])&&Object.keys(reasons).length<64)reasons[key]=(reasons[key]??0)+1;
   }
   return reject('columnFallback');
  }
  if(!part.owner||part.owner.epoch!==owner.epoch||part.owner.channel!==owner.channel||part.owner.incarnation!==owner.incarnation||!actor?.barrier||actor.suspended||actor.externalHold||actor.epoch!==owner.epoch||!c.lanes.busy(['player:'+row.id]))return reject('fenceFallback');
  const engagement=allowDropRead&&proof.readSections===true?referencedEngagement(runtime,result,part):part.engagement;
  if(engagement===invalidEngagement)return reject('scopeFallback');
  if(!Array.isArray(sub.data.players)||!sub.ownerRow||!sub.data.players.some(p=>p.id===row.id)||(!(allowDropRead&&proof.readSections===true)&&!Object.hasOwn(part,'engagement'))||(audit.tables.includes('world_drops')&&!(allowDropRead&&proof.readDrops===true)&&(!Array.isArray(part.drops)||part.drops.length>MAX_DROPS||part.drops.some(d=>d.owner_id!==row.id))))return reject('scopeFallback');
  if(proof.readSections!==true&&!validMaterialSectionR60(result,part))return reject('scopeFallback');
  const progress=actorProgressPatchR85(previous,row,sub.ownerRow);if(!progress)return reject('columnFallback');
  const progressChanged=ACTOR_PROGRESS_FIELDS_R85.some(key=>!Object.is(previous[key],row[key]));
  if(progressChanged&&typeof runtime.dungeon.refreshActor!=='function')return reject('scopeFallback');
  const materials=needsMaterialSectionsR60(result)&&proof.readSections!==true?prepareCollectMaterialsR85(runtime,row.id,part.dungeonMaterialsR60):null;
  if(needsMaterialSectionsR60(result)&&proof.readSections!==true&&!materials)return reject('scopeFallback');
  c.state.assertOwner(row.id,owner.epoch);updates.push({row,part,owner,sub,engagement,progress,progressChanged,materials});
 }
 return updates;
}
export function applyActorSectionsR52(runtime,result,context=null){
 const updates=validatedUpdates(runtime,result,{context});if(!updates)return false;
 const portal=portalRefreshScopeR57(result,runtime.channel.world.cycle),applyPortal=portal?preparePortalRefreshR57(runtime,result,updates):null;
 if(portal&&!applyPortal)return reject('scopeFallback');
 const c=runtime.channel;
 // Keep raw commit rows throughout certification. Only the final installed
 // image may overlay movement captured by this exact stopped death group.
 const installed=new Map(updates.map(({row})=>[row.id,mergeDeathRowR86(context?.deathMotionR86,row,{cycle:c.world.cycle})]));
 // No await and no changes before every recipient and section is validated.
 for(const {row,part,owner,sub,progress,progressChanged} of updates){
  c.view.setPlayer(c.presence.merge(installed.get(row.id),owner.epoch));c.view.setEngagement(row.id,part.engagement);
  // Cold hydration also refreshes the dungeon's raw player mirror, including
  // actors outside a room. Keep that mirror on this same committed row before
  // a later dungeon command can consult it. Membership/materials are unchanged.
  if(progressChanged)runtime.dungeon.refreshActor({player:c.view.player(row.id)});
  const projected={...sub.ownerRow,...progress};for(const key of fields)if(Object.hasOwn(projected,key))projected[key]=row[key];
  sub.ownerRow=projected;sub.data={...sub.data,players:sub.data.players.map(p=>p.id===row.id?projected:p),...(part.drops?{drops:part.drops}:{})};
  sub.cache=null;sub.privateOwnerCache=null;sub.revision++;
  runtime.slimReload.forget(row.id);
 }
 if(applyPortal){applyPortal();actorSectionMetricsR52.portalAppliedR57=(actorSectionMetricsR52.portalAppliedR57??0)+1;}
 // Portal closures retain their prepared bundle. Apply the validated material
 // image afterwards, merging into that current bundle rather than restoring it.
 for(const {row,materials} of updates)if(materials)applyCollectMaterialsR85(runtime,row.id,materials);
 for(const monster of result.monsters??[])c.setMonster(monster);
 actorSectionMetricsR52.applied++;actorSectionMetricsR52.actors+=updates.length;return true;
}

// last_seen alone is authenticated presence, not gameplay state. It may be
// materialized by another writer command; ResidentPresence.merge keeps the
// latest local stamp. Every other raw column must match across the read.
const samePlayer=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(key=>Object.hasOwn(b,key)&&(key==='last_seen'||Object.is(a[key],b[key])));
function committedSectionsR57(runtime,result,updates){
 const snapshot=result.actorCommitSectionsR57,proof=result.actorSectionsR52,now=runtime.clock?.()??Date.now();
 if(!snapshot||snapshot.version!==1||snapshot.complete!==true||snapshot.cycle!==proof.cycle||!Number.isSafeInteger(snapshot.readAtMs)||snapshot.readAtMs>now||now-snapshot.readAtMs>1000||!Array.isArray(snapshot.actors)||snapshot.actors.length>MAX_ACTORS||Buffer.byteLength(JSON.stringify(result))>512*1024)return null;
 const entries=new Map();
 for(const captured of snapshot.actors){
  const fresh=resolveCommitRowR61(captured,result.players);
  if(!fresh||entries.has(fresh.id)||!proof.actors.some(p=>p.id===fresh.id&&p.owner))return null;
  entries.set(fresh.id,fresh);
 }
 for(const expected of updates){
  const fresh=entries.get(expected.row.id);
  if(!validMaterialSectionR60(result,fresh)||!fresh?.owner||fresh.owner.epoch!==expected.owner.epoch||fresh.owner.channel!==expected.owner.channel||fresh.owner.incarnation!==expected.owner.incarnation||!samePlayer(fresh.player,expected.row)||!Object.hasOwn(fresh,'engagement')||!sameEngagement(fresh.engagement,expected.engagement,fresh.id)||(proof.readDrops===true&&(!Array.isArray(fresh.drops)||fresh.drops.length>MAX_DROPS||fresh.drops.some(drop=>drop.owner_id!==fresh.id))))return null;
 }
 // Held owners cannot receive a second inventory/reward mutation. The only
 // time-dependent predicate in this exact drop SELECT is expires_at. Apply
 // that same native predicate at delivery instead of an extra IPC read merely
 // because the clock crossed a second; never extend a drop's lifetime.
 const seconds=Math.floor(now/1000);
 return {...result,players:result.players.map(row=>entries.get(row.id)?.player??row),actorSectionsR52:{...proof,readSections:false,readDrops:false,actors:proof.actors.map(part=>{const fresh=entries.get(part.id);return fresh?{...part,engagement:fresh.engagement,...materialPartR60(result,fresh),...(proof.readDrops===true?{drops:fresh.drops.filter(d=>groundLoot30s?d.expires_at>seconds:d.expires_at>=seconds)}:{})}:part;})}};
}
export function refreshActorSectionsR52(runtime,result,readDrops,context=null){
 // Flag0/no-proof stay synchronous: preserve the old barrier scheduling.
 if(!actorSectionReuseR52||!result.actorSectionsR52)return false;
 if(result.actorSectionsR52.readSections!==true&&result.actorSectionsR52.readDrops!==true)return applyActorSectionsR52(runtime,result,context);
 const updates=validatedUpdates(runtime,result,{allowDropRead:true,context});if(!updates)return false;
 if(commitSectionsR57&&result.actorCommitSectionsR57){
  const committed=committedSectionsR57(runtime,result,updates);
  if(committed){const applied=applyActorSectionsR52(runtime,committed,context);if(applied){actorSectionMetricsR52.commitAppliedR57=(actorSectionMetricsR52.commitAppliedR57??0)+1;return true;}}
  actorSectionMetricsR52.commitFallbackR57=(actorSectionMetricsR52.commitFallbackR57??0)+1;
 }
 // The old read protocol contains no material section; an absent/stale
 // commit snapshot must use the complete authoritative reload instead.
 if(needsMaterialSectionsR60(result)||typeof readDrops!=='function')return false;
 const before=updates.map(({row,sub,part,engagement})=>({id:row.id,row:runtime.channel.view.player(row.id),sub,revision:sub.revision,barrier:runtime.channel.kernel.players.get(row.id).barrier,...(part.engagementRef?.kind==='resident'?{engagement}: {})}));
 return completeDropRead(runtime,result,readDrops,updates,before,{context});
}
async function completeDropRead(runtime,result,readDrops,updates,before,{group=sectionReadGroupR56,context=null}={}){
 let updated;
 try{
  const proof=result.actorSectionsR52,replacements=new Map();
  // A party-wide commit already fences these <=25 residents. One bounded,
  // authoritative WAL snapshot avoids serial IPC round trips between chunks.
  // Large drop/encounter sections retry the unchanged four-actor read path.
  const grouped=group&&updates.length>ACTOR_REFRESH_LIMITS_R52.readBatch;
  const batchSize=grouped?ACTOR_GROUP_READ_LIMITS_R56.actors:ACTOR_REFRESH_LIMITS_R52.readBatch,concurrency=grouped?1:refreshReadPipelineR56?2:1;
  for(let i=0;i<updates.length;i+=batchSize*concurrency){
   // The original small-chunk pipeline and the bounded group read share the
   // same authoritative reader; neither introduces a cache or another writer.
   // Settle the complete wave before fallback, so no orphan read continues
   // when the full authoritative reload starts. No resident is mutated here.
   const batches=[];for(let j=i;j<Math.min(updates.length,i+batchSize*concurrency);j+=batchSize)batches.push(updates.slice(j,j+batchSize));
   const replies=refreshReadPipelineR56?await Promise.allSettled(batches.map(batch=>Promise.resolve().then(()=>readDrops(batch.map(({row,owner})=>({actor:row.id,epoch:owner.epoch,area:row.area})))))):null;
   for(let k=0;k<batches.length;k++){
   const batch=batches[k];let response;
   if(replies){if(replies[k].status!=='fulfilled')throw replies[k].reason;response=replies[k].value;}
   else response=await readDrops(batch.map(({row,owner})=>({actor:row.id,epoch:owner.epoch,area:row.area})));
   actorSectionMetricsR52.dropsReads++;
   if(grouped){
    actorSectionMetricsR52.groupReadsR56=(actorSectionMetricsR52.groupReadsR56??0)+1;
    if(response?.version===1&&response.complete===false&&response.reason==='bounds'){
     actorSectionMetricsR52.groupBoundsR56=(actorSectionMetricsR52.groupBoundsR56??0)+1;
     return completeDropRead(runtime,result,readDrops,updates,before,{group:false,context});
    }
   }
   if(response?.version!==1||response.complete!==true||response.cycle!==proof.cycle||!Array.isArray(response.actors)||response.actors.length!==batch.length)throw Error('actor_drop_read_incomplete');
   for(let j=0;j<batch.length;j++){
    const expected=batch[j],fresh=response.actors[j];
    if(fresh?.id!==expected.row.id||!fresh.owner||fresh.owner.epoch!==expected.owner.epoch||fresh.owner.channel!==expected.owner.channel||fresh.owner.incarnation!==expected.owner.incarnation||!samePlayer(fresh.player,expected.row)||!Object.hasOwn(fresh,'engagement')||!sameEngagement(fresh.engagement,expected.engagement,fresh.id)||(proof.readDrops===true&&(!Array.isArray(fresh.drops)||fresh.drops.length>MAX_DROPS||fresh.drops.some(drop=>drop.owner_id!==fresh.id))))throw Error('actor_drop_read_changed');
    replacements.set(fresh.id,fresh);actorSectionMetricsR52.dropsReadActors++;
   }
   }
  }
  // Reads yield to IPC. A new actor/owner/section image or barrier invalidates
  // the ENTIRE attempt before any recipient is changed; the full path retries.
  for(const old of before)if(!samePlayer(runtime.channel.view.player(old.id),old.row)||runtime.world.subscribers.get(old.id)!==old.sub||old.sub.revision!==old.revision||runtime.channel.kernel.players.get(old.id)?.barrier!==old.barrier||(Object.hasOwn(old,'engagement')&&(runtime.channel.view.engagements.get(old.id)??null)!==old.engagement))throw Error('actor_drop_read_resident_changed');
  updated={...result,players:result.players.map(row=>replacements.get(row.id)?.player??row),actorSectionsR52:{...proof,readSections:false,readDrops:false,actors:proof.actors.map(part=>{const fresh=replacements.get(part.id);return fresh?{...part,engagement:fresh.engagement,...(proof.readDrops===true?{drops:fresh.drops}:{})}:part;})}};
 }catch{actorSectionMetricsR52.dropsReadFallback++;return false;}
 // A genuine apply invariant error must not be disguised as a read fallback
 // after resident mutation has begun.
 return applyActorSectionsR52(runtime,updated,context);
}
