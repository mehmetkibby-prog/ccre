import {demand} from './contract.mjs';
import {acceptDeathPreviewR54,rejectDeathPreviewR54,isDeathPreviewR54} from './reward-reply-r54.mjs';
import {deathBatchPreviewR86} from './death-batch-single-r57.mjs';
const permits=new WeakMap(),groups=new WeakSet(),replies=new WeakSet();
const motionFields=new Set(['x','y','movement_checked_at_ms','movement_debt_ms','position_revision','motion_stream_id','motion_sequence','last_movement_at_ms']);
const ordinary=new Set(['forest','frozen','ancient']);
const basic=input=>input?.action==='attack'&&Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))===0;
const sameOther=(a,b)=>a&&b&&Object.keys(a).length===Object.keys(b).length&&Object.keys(a).every(k=>motionFields.has(k)||k==='last_seen'||Object.is(a[k],b[k]));
const scopeSame=(a,b)=>['id','account_id','area','channel','arena_match_id','realtime_scope_version','cycle','instanceId','instance_id'].every(k=>Object.is(a[k],b[k]));
const exactMotion=(a,b)=>[...motionFields].every(k=>Object.is(a[k],b[k]));
const metric=(kernel,name,n=1)=>{const m=kernel.metrics.deathMovementR86??={};m[name]=(m[name]??0)+n;};

// The writer request has already captured immutable positions and combat state.
// Only the existing provisional attack receipt is settled here; no HP, kill,
// item or currency result is acknowledged before the original durable ACK.
export function beginDeathMovementR86(loop,{kernel,id,input,ids,lease,preview,entries,joined}){
 if(process.env.CORE511_R86_DEATH_MOVEMENT==='0'||!joined||!isDeathPreviewR54(preview)||!basic(input))return null;
 metric(kernel,'candidateGroups');
 const descriptors=[{id,input,preview},...entries.map(e=>({id:e.actor,input:e.input,preview:deathBatchPreviewR86(e),entry:e}))];
 if(descriptors.some(d=>!basic(d.input)||!d.preview)||new Set(descriptors.map(d=>d.input.targetId)).size!==descriptors.length){metric(kernel,'blockedPreview');return null;}
 const actors=[];
 for(const d of descriptors){
  const p=kernel.players.get(d.id),owner=kernel.state.owners.get(d.id),row=kernel.state.read('players',d.id),checkpoint=loop.checkpoints.entries.get(d.id);
  const captured=checkpoint?.joinedR53?.payload.current,clean=checkpoint&&!checkpoint.pending&&!checkpoint.joinedR53&&!loop.checkpoints.changed(d.id)&&Object.keys(checkpoint.base).every(k=>Object.is(checkpoint.base[k],row?.[k]));
  if(!ids.includes(d.id)||!p?.barrier||p.suspended||p.externalHold||p.quiescer||!p.accepting||owner?.state!=='active'||owner.epoch!==p.epoch||!ordinary.has(row?.area)||row.hp<=0||row.arena_match_id||row.instance_id||row.instanceId||!checkpoint||checkpoint.pending||!captured&&!clean||captured&&!['id','account_id','area','channel','arena_match_id','realtime_scope_version'].every(k=>Object.is(captured[k],row[k]))||!lease.keys.includes('player:'+d.id)){metric(kernel,'blockedEligibility');return null;}
  if(d.entry){if(p.deferred.length!==1||p.deferred[0].sequence!==d.entry.sequence||p.lastApplied>=d.entry.sequence)return null;}
  else if(p.deferred.length)return null;
  if(!acceptDeathPreviewR54(d.preview,lease))return null;
  actors.push({...d,p,owner,row,checkpoint,barrier:p.barrier,epoch:p.epoch});
 }
 loop.lanes.assert(lease);
 const group={loop,kernel,lease,actors,active:true,savedRows:new Map(),rejected:new Set()};groups.add(group);
 for(const actor of actors){permits.set(actor.p,{group,actor});if(actor.entry){const prior=actor.p.deferred.shift();demand(prior.sequence===actor.entry.sequence,'death_motion_secondary_sequence');const reply={...actor.preview,sequence:prior.sequence};kernel.settled(actor.p,reply);actor.p.results.push(reply);metric(kernel,'secondaryPreviews');}}
 metric(kernel,'groups');metric(kernel,'eligibleActors',actors.length);return group;
}
// R88: the identical bounded permit for an ordinary potion commit. A potion
// never relocates, kills or controls its actor; the writer request has already
// captured the immutable pre-command row. While it commits only motion fields
// may change (sameOther/scopeSame/engagement/overdue guards in
// runDeathMovementR86 are unchanged). The potion's own reply stays deferred
// until its durable ACK; each actor's existing deferred count is recorded so
// later replies cannot overtake an unrelated pending result. The committed row
// is merged and the checkpoint rebased exactly like the R86 kill path.
export const actionMovementR88=process.env.CORE511_R88_ACTION_MOVEMENT!=='0';
export function beginActionMovementR88(loop,{kernel,ids,lease}){
 if(!actionMovementR88)return null;
 const actors=[];
 for(const id of ids){
  const p=kernel.players.get(id),owner=kernel.state.owners.get(id),row=kernel.state.read('players',id),checkpoint=loop.checkpoints.entries.get(id);
  const captured=checkpoint?.joinedR53?.payload.current,clean=checkpoint&&!checkpoint.pending&&!checkpoint.joinedR53&&!loop.checkpoints.changed(id)&&Object.keys(checkpoint.base).every(k=>Object.is(checkpoint.base[k],row?.[k]));
  if(!p?.barrier||permits.has(p)||p.suspended||p.externalHold||p.quiescer||!p.accepting||owner?.state!=='active'||owner.epoch!==p.epoch||!ordinary.has(row?.area)||row.hp<=0||row.arena_match_id||row.instance_id||row.instanceId||!checkpoint||checkpoint.pending||!captured&&!clean||captured&&!['id','account_id','area','channel','arena_match_id','realtime_scope_version'].every(k=>Object.is(captured[k],row[k]))||!lease.keys.includes('player:'+id)){metric(kernel,'actionBlockedEligibility');continue;}
  actors.push({id,p,owner,row,checkpoint,barrier:p.barrier,epoch:p.epoch,deferredAt:p.deferred.length});
 }
 if(!actors.length)return null;
 loop.lanes.assert(lease);
 const group={loop,kernel,lease,actors,active:true,savedRows:new Map(),rejected:new Set(),kind:'action'};groups.add(group);
 for(const actor of actors)permits.set(actor.p,{group,actor});
 metric(kernel,'actionGroups');metric(kernel,'actionEligibleActors',actors.length);return group;
}
export function deathMovementPermitR86(kernel,id){
 const p=kernel.players.get(id),permit=p&&permits.get(p);if(!permit)return null;
 const {group,actor}=permit;
 if(!group.active||group.kernel!==kernel||p!==actor.p||p.barrier!==actor.barrier||p.epoch!==actor.epoch||p.suspended||p.externalHold||p.quiescer||!p.accepting||p.deferred.length!==(actor.deferredAt??0)||kernel.failure||kernel.state.owners.get(id)!==actor.owner||actor.owner.state!=='active'||group.lease.state!=='held'||!group.loop.lanes.owns(group.lease,'player:'+id))return null;
 return permit;
}
export const mayProcessDeathMovementR86=(kernel,id,p,phase)=>phase==='movement'&&p.queue[0]?.kind==='movement'&&p.queue[0]?.payload?.action==='move'&&!!deathMovementPermitR86(kernel,id);
export const isDeathMovementReplyR86=reply=>replies.has(reply);
export function runDeathMovementR86(movement,context,permit){
 const {id,input,now,receivedAtMs=now,kernel}=context,{group,actor}=permit;
 if(deathMovementPermitR86(kernel,id)!==permit)return null;
 const row=kernel.state.read('players',id),engagement=movement.memory.view.engagements.get(id);
 // No pending hit may be skipped, settled twice or promoted out of the frozen
 // combat image. The native movement proposal additionally proves no HP or
 // encounter mutation. The existing bounded checkpoint age remains in force.
 if(!sameOther(actor.row,row)||!scopeSame(actor.row,row)||row.hp<=0||row.root_until_ms>receivedAtMs||row.stun_until_ms>receivedAtMs||engagement&&engagement.next_hit_at_ms<=receivedAtMs||movement.checkpoints.overdueR53(id)){metric(kernel,'blockedState');return null;}
 const native=movement.contextFor(id,input,now),proposal=movement.memory.step({...native,payload:input,nowMs:receivedAtMs,commit:false});
 if(proposal.deferred||proposal.durable||proposal.changes.engagements.length||proposal.changes.players.some(next=>next.id!==id||!sameOther(row,next)||!scopeSame(row,next))||proposal.events.some(event=>event[3]?.type!=='move'||event[3]?.playerId!==id)){metric(kernel,'blockedProposal');return null;}
 demand(deathMovementPermitR86(kernel,id)===permit,'death_motion_permit_changed');
 movement.memory.commit(proposal);for(const event of proposal.events)movement.publish(...event);
 const reply={type:'action',...proposal.result};replies.add(reply);metric(kernel,reply.status===200?'moves':'movementRejections');return reply;
}
export function stopDeathMovementR86(group){if(!group)return;demand(groups.has(group),'death_motion_group');group.active=false;for(const {p}of group.actors)if(permits.get(p)?.group===group)permits.delete(p);}
export function rejectDeathMovementR86(group,now){if(!group)return;for(const actor of group.actors)rejectActor(group,actor,now);}
function rejectActor(group,actor,now){if(group.rejected.has(actor.id)||!actor.preview)return;group.rejected.add(actor.id);rejectDeathPreviewR54(group.loop,actor.preview,actor.id,actor.input,now);}
export function validateDeathResultsR86(group,value){
 if(!group)return;demand(groups.has(group),'death_motion_group');
 const entries=group.actors.filter(a=>a.entry).map(a=>a.entry),rows=value.batchResultsR57;
 if(entries.length)demand(Array.isArray(rows)&&rows.length===entries.length&&new Set(rows.map(r=>r?.actor)).size===entries.length&&entries.every(e=>rows.some(r=>r?.actor===e.actor&&r.sequence===e.sequence&&r.result&&Number.isInteger(r.result.status))),'death_motion_final_batch');
 else demand(rows===undefined||Array.isArray(rows)&&rows.length===0,'death_motion_unexpected_batch');
}
export function rejectDeathResultsR86(group,value,now){if(!group)return;validateDeathResultsR86(group,value);for(const actor of group.actors){const result=actor.entry?value.batchResultsR57?.find(r=>r.actor===actor.id&&r.sequence===actor.entry.sequence)?.result:value.result;demand(result&&Number.isInteger(result.status),'death_motion_final_result');if(result.status>=400||result.body?.ok===false)rejectActor(group,actor,now);}}
// A completed kill owns the same player lanes until every committed section is
// installed. These private capabilities never change raw SQL proof rows.
function refreshActor(group,id){
 if(!group)return null;demand(groups.has(group)&&!group.active,'death_motion_refresh_phase');
 const actor=group.actors.find(a=>a.id===id);if(!actor)return null;
 const {kernel,loop,lease}=group,p=kernel.players.get(id),current=kernel.state.read('players',id);
 demand(p===actor.p&&p.barrier===actor.barrier&&p.epoch===actor.epoch&&kernel.state.owners.get(id)===actor.owner&&actor.owner.state==='active'&&lease.state==='held','death_motion_refresh_fenced');loop.lanes.assert(lease);
 return {actor,current};
}
// Existing section certification compares committed SQL columns with the
// immutable pre-command image. Its raw receipt/SQL equality checks remain
// unchanged; this temporary comparison image is never installed in the world.
export function deathMotionComparisonRowR86(group,id,previous){
 const proof=refreshActor(group,id);if(!proof)return previous;
 const {actor,current}=proof;
 if(previous!==current||!sameOther(actor.row,current)||!scopeSame(actor.row,current))return null;
 const comparison={...previous};for(const field of motionFields){if(Object.hasOwn(actor.row,field))comparison[field]=actor.row[field];else delete comparison[field];}
 return comparison;
}
// Full or certified partial hydration remains authoritative for combat and
// economy. Preserve only the validated resident position suffix when the SQL
// commit did not relocate, kill or control the actor. Keep the unmerged SQL row
// separately as the true durable base for the next position checkpoint.
export function mergeDeathRowR86(group,saved,{cycle}={}){
 const proof=refreshActor(group,saved.id);if(!proof)return saved;
 const {actor,current}=proof,{kernel}=group;group.savedRows.set(actor.id,saved);
 const compatible=sameOther(actor.row,current)&&scopeSame(actor.row,current)&&cycle===actor.row.cycle&&['id','account_id','area','channel','arena_match_id','realtime_scope_version'].every(k=>Object.is(actor.row[k],saved[k]))&&!saved.instance_id&&!saved.instanceId&&exactMotion(actor.row,saved)&&saved.hp>0&&saved.root_until_ms===actor.row.root_until_ms&&saved.stun_until_ms===actor.row.stun_until_ms;
 if(!compatible){metric(kernel,'authoritativeCorrections');return saved;}
 const player={...saved};for(const field of motionFields)if(Object.hasOwn(current,field))player[field]=current[field];player.last_seen=Math.max(saved.last_seen,current.last_seen);
 metric(kernel,'preservedPositions',Number(current.position_revision>saved.position_revision));return player;
}
export function mergeDeathBundleR86(group,bundle){
 const player=mergeDeathRowR86(group,bundle.player,{cycle:bundle.world?.cycle});return player===bundle.player?bundle:{...bundle,player};
}
export function rebaseDeathCheckpointR86(group,checkpoints,row){
 const saved=group?.savedRows.get(row.id);if(!saved)return false;
 demand(groups.has(group)&&!group.active,'death_motion_rebase_phase');
 // hydrate(saved) intentionally bypasses hydrateCommitted's resident-row
 // shortcut: the newer position has not reached disk and must remain dirty.
 checkpoints.hydrate(saved);return true;
}
