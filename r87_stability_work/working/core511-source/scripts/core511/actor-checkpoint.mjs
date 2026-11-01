import {actorFrameIsolation} from './r48_3-options.mjs';
import {quarantineDrainR531} from './r531-options.mjs';
import {POSITION_FIELDS} from '../../../native510-bb3a6cc689c6/vds-server/src/position-store.mjs';
import {COMBAT_TABLES} from '../../../native510-bb3a6cc689c6/vds-server/src/combat-store.mjs';
import {dirtyWriter} from '../../../native510-bb3a6cc689c6/vds-server/src/dirty-writer.mjs';
import {CHECKPOINT_MS,demand} from './contract.mjs';
import {randomUUID} from 'node:crypto';
import {writeEncounterCheckpoint} from './encounter-checkpoint.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {checkpointConflict} from './checkpoint-rejection.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {memoryCombatR53,R53_CHECKPOINT_START_MS,R53_MEMORY_WINDOW_MS} from './r53-options.mjs';
import {checkpointScheduleR57} from './r57-options.mjs';
import {expandJoinedAckR57} from './joined-ack-r57.mjs';

export const CHECKPOINT_FIELDS=Object.freeze([...new Set([...POSITION_FIELDS,...COMBAT_TABLES.players.fields,'root_until_ms','stun_until_ms','last_regen_at','last_movement_at_ms'])]);
const scope=Object.freeze(['id','account_id','area','channel','arena_match_id','realtime_scope_version','max_hp']);
const columns=Object.freeze([...scope,...CHECKPOINT_FIELDS]);
const pick=row=>{const value={};for(const name of columns)value[name]=row[name];return value;};
const same=(a,b,fields=columns)=>fields.every(name=>Object.is(a?.[name],b?.[name]));
const quote=s=>'"'+s+'"';
// Original allowlists and changed-column writer. A nonterminal checkpoint can
// never change currency/items/XP/scope, revive a dead player or commit a death.
// Native death/respawn/reward rules must use their durable operation handlers.
export function createActorCheckpointHandler(){
 const connections=new WeakMap();
 return (db,{base,current,pve},context)=>{
  demand(db.isTransaction,'checkpoint_requires_atomic');
  demand(base&&current&&Object.keys(base).length===columns.length&&Object.keys(current).length===columns.length&&columns.every(k=>Object.hasOwn(base,k)&&Object.hasOwn(current,k)),'checkpoint_columns');
  demand(base.id===context.actor&&current.id===context.actor&&same(base,current,scope),'checkpoint_scope');
  for(const row of [base,current])for(const field of CHECKPOINT_FIELDS)if(field!=='motion_stream_id')demand(Number.isFinite(row[field]),'checkpoint_number');
  demand(typeof base.motion_stream_id==='string'&&typeof current.motion_stream_id==='string'&&current.motion_stream_id.length<=80,'checkpoint_motion_stream');
  const deadClock=base.hp===0&&current.hp===0&&same(base,current,CHECKPOINT_FIELDS.filter(field=>field!=='last_regen_at'));
  demand(deadClock||base.hp>0&&current.hp>0&&current.hp<=current.max_hp,'checkpoint_terminal_health');
  demand(current.position_revision>=base.position_revision&&current.hp_revision>=base.hp_revision&&current.movement_checked_at_ms>=base.movement_checked_at_ms,'checkpoint_revision_regression');
  let connection=connections.get(db);
  if(!connection){
   const read=db.prepare('SELECT '+columns.map(quote).join(',')+' FROM main.players WHERE id=?');
   const guard=' AND '+columns.filter(n=>n!=='id').map(n=>quote(n)+' IS ?').join(' AND ');
   const writer=dirtyWriter(sql=>db.prepare(sql),{table:'main.players',keys:['id'],fields:CHECKPOINT_FIELDS,guard});
   connection={read,writer,presence:db.prepare('UPDATE main.players SET last_seen=MAX(last_seen,?) WHERE id=?'),stationary:db.prepare('UPDATE main.players SET last_movement_at_ms=? WHERE id=?')};connections.set(db,connection);
  }
  const saved=connection.read.get(context.actor);if(!same(saved,base))throw checkpointConflict(saved,base,columns,context);
  const written=connection.writer.write(current,base,[context.actor],columns.filter(n=>n!=='id').map(n=>base[n]));
  if(!(written.columns===0||written.result.changes===1))throw checkpointConflict(connection.read.get(context.actor),base,columns,context);
  // This is derived from validated movement, never a WS heartbeat write.
  connection.presence.run(Math.floor(current.movement_checked_at_ms/1000),context.actor);
  // Native coordinate triggers run at SQL execution time. This is a replay of
  // already executed movement, so retain that movement's original trigger time.
  if(base.x!==current.x||base.y!==current.y)connection.stationary.run(current.last_movement_at_ms,context.actor);
  const encounter=pve===undefined?undefined:writeEncounterCheckpoint(db,pve,context);
  const finalSaved=pick(connection.read.get(context.actor));
  // Native AFTER triggers may change HP while the checkpoint updates last_seen.
  // Detect that inside the request savepoint, before COMMIT/ACK, so the proven
  // rollback path can stop just this actor instead of returning a stale ACK.
  if(actorFaultIsolation&&!same(finalSaved,current))throw checkpointConflict(finalSaved,current,columns,context);
  return {saved:finalSaved,...(pve===undefined?{}:{encounter})};
 };
}

// Snapshot double buffering: movements may continue while a periodic fsync is
// pending. ACK advances only the durable base, never overwrites newer resident
// coordinates/HP. The owner pending counter prevents transfer/exit until drain.
export class ActorCheckpoints {
 constructor({state,submit,encounters=null,pollable=()=>true,clock=()=>performance.now(),onFatal=()=>{},onRejected=()=>{}}){
  demand(state&&typeof submit==='function'&&typeof pollable==='function','checkpoint_dependencies');Object.assign(this,{state,submit,encounters,pollable,clock,onFatal,onRejected});
  this.entries=new Map();this.incarnation=randomUUID();this.serial=0;this.failure=null;
 }
 hydrate(row){demand(!this.entries.get(row.id)?.pending,'checkpoint_pending');const owner=this.state.owners.get(row.id);demand(owner,'owner_epoch_fenced');this.entries.set(row.id,{base:pick(row),epoch:owner.epoch,at:this.clock(),pending:null});}
 // Only post-commit callers use this: applyCommit has already installed a
 // validated DB bundle (or a certified receipt refresh) behind the actor lease.
 // That read may be newer than the receipt. Never rebase to the older receipt.
 hydrateCommitted(row){this.hydrate(quarantineDrainR531?this.state.read('players',row.id):row);}
 changed(id){const entry=this.entries.get(id);return entry&&(!same(entry.base,this.state.read('players',id))||this.encounters?.changed(id));}
 captureR53(id){
  const entry=this.entries.get(id);demand(entry&&!entry.pending&&!entry.joinedR53,'checkpoint_join_pending');
  if(quarantineDrainR531&&entry.rejectedR531)throw entry.rejectedR531;
  const owner=this.state.assertOwner(id,entry.epoch),current=pick(this.state.read('players',id)),pve=this.encounters?.snapshot(id);
  demand(same(entry.base,current,scope),'checkpoint_scope_changed');
  const token={id,entry,owner,at:this.clock(),payload:{base:entry.base,current,...(pve===undefined?{}:{pve})}};
  entry.joinedR53=token;return token;
 }
 finishR53(token,saved=null){
  const {id,entry,owner,payload}=token;demand(this.entries.get(id)===entry&&entry.joinedR53===token&&this.state.owners.get(id)===owner,'checkpoint_join_changed');
  saved=expandJoinedAckR57(saved,id,payload);
  if(saved){demand(same(saved.saved,payload.current),'checkpoint_join_ack');if(this.encounters)this.encounters.acknowledged(id,payload.pve,saved.encounter);entry.base=payload.current;entry.at=token.at;}
  entry.joinedR53=null;
 }
 overdueR53(id){const e=this.entries.get(id);return memoryCombatR53&&e&&this.clock()-e.at>=R53_MEMORY_WINDOW_MS&&this.changed(id);}
 flush(id){
  demand(!this.failure,'checkpoint_fenced');const entry=this.entries.get(id);demand(entry,'checkpoint_not_hydrated');
  if(entry.pending)return entry.pending;
  // Preserve this exact entry's writer-proven rollback. A later party drain
  // must not replace it with an unproven owner error after quarantine froze it.
  if(quarantineDrainR531&&entry.rejectedR531)throw entry.rejectedR531;
  const owner=this.state.assertOwner(id,entry.epoch,{allowQuiesced:true}),row=this.state.read('players',id),snapshot=pick(row);
  if(same(snapshot,entry.base)&&!this.encounters?.changed(id)){entry.at=this.clock();return Promise.resolve({unchanged:true});}
  demand(same(snapshot,entry.base,scope),'checkpoint_scope_changed');
  const pve=this.encounters?.snapshot(id),capturedAt=this.clock();
  const event={actor:id,key:'checkpoint:'+this.incarnation+':'+(++this.serial),kind:'actor_checkpoint',payload:{base:entry.base,current:snapshot,...(pve===undefined?{}:{pve})}};
  owner.pending++;
  const pending=Promise.resolve().then(()=>this.submit(event)).then(ack=>{
   demand(ack.key===event.key&&same(ack.result?.saved,snapshot),'checkpoint_ack_mismatch');
   demand(this.entries.get(id)===entry&&this.state.owners.get(id)===owner,'checkpoint_owner_changed');
   if(this.encounters)this.encounters.acknowledged(id,pve,ack.result.encounter);
   entry.base=snapshot;entry.pending=null;entry.at=memoryCombatR53?capturedAt:this.clock();owner.pending--;return ack;
  }).catch(error=>{const rejection=actorRejection(error);if(rejection?.actor===id&&rejection.epoch===entry.epoch&&rejection.key===event.key&&this.entries.get(id)===entry&&this.state.owners.get(id)===owner){entry.pending=null;entry.at=this.clock();owner.pending--;if(actorFaultIsolation&&(error.code==='checkpoint_snapshot_conflict'||actorFrameIsolation&&error.code==='encounter_snapshot_conflict')){if(quarantineDrainR531)entry.rejectedR531=error;this.state.freeze(id,entry.epoch);this.onRejected(id,error);}throw error;}this.failure=error;if(this.state.owners.get(id)===owner)this.state.freeze(id,entry.epoch);this.onFatal(error);throw error;});
  entry.pending=pending;return pending;
 }
 poll(){
  if(this.failure)return;const now=this.clock();
  const paced=memoryCombatR53&&checkpointScheduleR57;
  if(paced&&(!this.pollWindowR57||now>=this.pollWindowR57.until))this.pollWindowR57={until:now+50,count:0};
  // A party hydration aligns up to 25 checkpoint clocks. Spread new periodic
  // snapshots over five frames instead of flooding the sole writer. Explicit
  // drains/joins bypass pacing; the 2s overdue input fence remains unchanged.
  const entries=paced?[...this.entries].sort((a,b)=>a[1].at-b[1].at):this.entries;
  for(const [id,entry]of entries)if(!entry.pending&&!entry.joinedR53&&now-entry.at>=(memoryCombatR53?R53_CHECKPOINT_START_MS:CHECKPOINT_MS)&&this.pollable(id)){
   const owner=this.state.owners.get(id);if(owner?.state!=='active'||owner.epoch!==entry.epoch)continue;
   if(paced&&this.changed(id)){if(this.pollWindowR57.count>=5)continue;this.pollWindowR57.count++;}
   void this.flush(id).catch(()=>{});
  }
 }
 async drain(id){
  const entry=this.entries.get(id);demand(entry,'checkpoint_not_hydrated');
  if(entry.pending)await entry.pending;
  // Caller has already stopped new input and mutations for this actor.
  return this.flush(id);
 }
 forget(id){demand(!this.entries.get(id)?.pending,'checkpoint_pending');this.entries.delete(id);this.encounters?.forget(id);}
}
