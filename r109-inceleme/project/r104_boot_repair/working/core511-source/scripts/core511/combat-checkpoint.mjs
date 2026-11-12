import {readResourceMonstersR56,readResourcePlayersR56} from './resource-reads-r56.mjs';
import {checkpointDeadlinesR531} from './r531-options.mjs';
import {CheckpointDeadlinesR531} from './checkpoint-deadlines-r531.mjs';
import {checkpointSqlBatchPlanR531} from './checkpoint-sql-r531.mjs';
import {checkpointAckMatchesR53} from './checkpoint-ack-r53.mjs';
import {prepareServerStatement} from './server-statements.mjs';
import {demand,CHECKPOINT_MS} from './contract.mjs';
import {randomUUID} from 'node:crypto';
import {checkpointBatches} from './r47-options.mjs';
import {combatCheckpointBatches} from './combat-checkpoint-batches.mjs';
import {combatDirtySnapshot} from './r50-checkpoint-options.mjs';
import {CombatCheckpointIndex} from './combat-checkpoint-index.mjs';
import {rewardGroupCommitR53,memoryCombatR53,R53_CHECKPOINT_START_MS,R53_MEMORY_WINDOW_MS,normalMonsterR53} from './r53-options.mjs';
import {localMixedTargetLimitR51} from './r51-options.mjs';
import {rewardAsyncReplyR54} from './r54-options.mjs';

const specs=Object.freeze({
 monsters:{keys:['id'],scope:['id','area','channel','spawn_round','is_boss','is_stone','max_hp'],fields:['hp','last_damaged_at_ms','last_regen_at_ms','root_until_ms','stun_until_ms','control_x','control_y','wave_stage']},
 participants:{table:'monster_participants',keys:['monster_id','spawn_round','player_id'],scope:[],fields:['created_at','stone_damage476','stone_first_hit_at_ms476']},
 bossParticipants:{table:'boss_participants',keys:['boss_round','player_id'],scope:[],fields:['hit_count','total_damage','created_at']}
});
const columnLists=Object.fromEntries(Object.entries(specs).map(([kind,spec])=>[kind,Object.freeze([...new Set([...spec.keys,...spec.scope,...spec.fields])])]));
const columns=kind=>columnLists[kind];
const pick=(kind,row)=>{if(!row)return null;const value={};for(const k of columns(kind))value[k]=row[k];return value;};
const same=(kind,a,b)=>a===null||b===null?a===b:columns(kind).every(k=>Object.is(a[k],b[k]));
const key=(kind,row)=>JSON.stringify(specs[kind].keys.map(k=>row[k]));
const quote=n=>'"'+n+'"';

// Damage and its contribution credits are checkpointed together. This handler
// cannot defeat/respawn a monster, grant an item, award XP, or change ownership.
// The channel has one checkpoint lane, so actors sharing a target cannot flush
// independently and accidentally overwrite each other's contribution totals.
export function createCombatCheckpointHandler({assertResources}){
 demand(typeof assertResources==='function','combat_checkpoint_authority_required');
 return (db,payload,context)=>{
  demand(db.isTransaction&&assertResources(db,payload,context)===true,'combat_checkpoint_owner_fenced');
  demand(payload&&Object.keys(payload).sort().join(',')==='bossParticipants,combatEvents,monsters,participants','combat_checkpoint_fields');
  const batch=checkpointSqlBatchPlanR531(db,payload,specs,columnLists);
  // The approved checkpoint batch performs writes only in finish(), after all
  // reads/guards. Unknown-trigger fallback retains every original row read.
  const livesR56=batch?readResourceMonstersR56(db,payload.participants.map(p=>p?.current?.monster_id),'life'):null,playersR56=batch?readResourcePlayersR56(db,payload.participants.map(p=>p?.current?.player_id)):null;
  for(const kind of Object.keys(specs)){
   demand(Array.isArray(payload[kind])&&payload[kind].length<=1024,'combat_checkpoint_size');
   const spec=specs[kind],table=spec.table??kind,names=columns(kind),where=spec.keys.map(k=>quote(k)+' IS ?').join(' AND '),read=prepareServerStatement(db,'SELECT '+names.map(quote).join(',')+' FROM '+table+' WHERE '+where);
   for(const {base,current}of payload[kind]){
    demand(current&&names.length===Object.keys(current).length&&names.every(k=>Object.hasOwn(current,k)),'combat_checkpoint_columns');
    if(base)demand(names.length===Object.keys(base).length&&names.every(k=>Object.hasOwn(base,k)&&(![...spec.keys,...spec.scope].includes(k)||Object.is(base[k],current[k]))),'combat_checkpoint_scope');
    for(const name of spec.fields)demand(Number.isFinite(current[name])&&(!base||Number.isFinite(base[name])),'combat_checkpoint_number');
    if(kind==='monsters')demand(base&&base.hp>0&&current.hp>0&&current.hp<=current.max_hp&&current.wave_stage===base.wave_stage,'combat_checkpoint_terminal');
    else for(const name of spec.fields)demand(Number.isSafeInteger(current[name])&&current[name]>=0&&(!base||current[name]>=base[name]),'combat_checkpoint_counter');
    const args=spec.keys.map(k=>current[k]),saved=batch?batch.read(kind,current):read.get(...args)??null;demand(same(kind,saved,base),'combat_checkpoint_conflict');
    if(kind==='participants')demand((livesR56?(livesR56.get(current.monster_id)?.spawn_round===current.spawn_round&&livesR56.get(current.monster_id)?.hp>0):prepareServerStatement(db,'SELECT 1 FROM monsters WHERE id=? AND spawn_round=? AND hp>0').get(current.monster_id,current.spawn_round))&&(playersR56?playersR56.has(current.player_id):prepareServerStatement(db,'SELECT 1 FROM players WHERE id=?').get(current.player_id)),'combat_participant_missing');
    if(kind==='bossParticipants')demand(prepareServerStatement(db,'SELECT 1 FROM monsters WHERE spawn_round=? AND is_boss=1 AND hp>0').get(current.boss_round)&&prepareServerStatement(db,'SELECT 1 FROM players WHERE id=?').get(current.player_id),'combat_boss_participant_missing');
    if(batch){if(!base||!same(kind,current,base))batch.queue(kind,current,base);}
    else if(base){if(!same(kind,current,base))prepareServerStatement(db,'UPDATE '+table+' SET '+spec.fields.map(k=>quote(k)+'=?').join(',')+' WHERE '+where).run(...spec.fields.map(k=>current[k]),...args);}
    else prepareServerStatement(db,'INSERT INTO '+table+'('+names.map(quote).join(',')+') VALUES('+names.map(()=>'?').join(',')+')').run(...names.map(k=>current[k]));
   }
  }
  demand(Array.isArray(payload.combatEvents)&&payload.combatEvents.length<=4096,'combat_events_size');
  const event=prepareServerStatement(db,'INSERT INTO combat_events(player_id,target_id,role,ability,created_at) VALUES(?,?,?,?,?)');
  for(const row of payload.combatEvents){demand(row&&Object.keys(row).sort().join(',')==='ability,created_at,player_id,role,target_id'&&['avci','arkanist','muhafiz'].includes(row.role)&&Number.isInteger(row.ability)&&row.ability>=0&&row.ability<=3&&Number.isSafeInteger(row.created_at),'combat_event_fields');if(!batch)event.run(row.player_id,row.target_id,row.role,row.ability,row.created_at);}
  batch?.finish(payload.combatEvents);
  return {saved:payload};
 };
}

export class CombatCheckpoints {
 constructor({submit,submitBatch=null,actor=null,clock=()=>performance.now(),onFatal=()=>{}}){
  demand(typeof submit==='function'&&(actor===null||typeof actor==='function'),'combat_checkpoint_dependencies');Object.assign(this,{submit,submitBatch,actor,clock,onFatal});
  this.base=new Map(Object.keys(specs).map(k=>[k,new Map()]));this.current=new Map(Object.keys(specs).map(k=>[k,new Map()]));this.events=[];this.pending=null;this.failure=null;this.incarnation=randomUUID();this.serial=0;this.at=clock();
  this.snapshotIndex=combatDirtySnapshot?new CombatCheckpointIndex(Object.keys(specs)):null;
  this.reservedR53=new Set();this.deadlinesR531=checkpointDeadlinesR531&&memoryCombatR53?new CheckpointDeadlinesR531():null;
  if(this.snapshotIndex){this.base=this.snapshotIndex.base;this.current=this.snapshotIndex.current;}
 }
 // New committed adventure spawns have never appeared in a checkpoint. Adding
 // their initial baseline cannot overwrite an older in-flight checkpoint.
 seedMonsters(rows){for(const row of rows){const id=key('monsters',row);if(this.base.get('monsters').has(id))continue;const value=pick('monsters',row);this.base.get('monsters').set(id,value);this.current.get('monsters').set(id,value);}}
 retireIdleMonsters(ids){
  if(this.pending)return [];const eligible=new Set(ids);
  for(const id of ids){const k=key('monsters',{id});if(!same('monsters',this.base.get('monsters').get(k)??null,this.current.get('monsters').get(k)??null))eligible.delete(id);}
  for(const [k,row]of this.current.get('participants'))if(eligible.has(row.monster_id)&&!same('participants',this.base.get('participants').get(k)??null,row))eligible.delete(row.monster_id);
  for(const e of this.events)eligible.delete(e.target_id);const removed=[...eligible];this.committed({monsters:[],participants:[],bossParticipants:[],removed});return removed;
 }
 hydrate(kind,rows){demand(specs[kind]&&!this.pending,'combat_checkpoint_pending');for(const row of rows){const id=key(kind,row),value=pick(kind,row);this.base.get(kind).set(id,value);this.current.get(kind).set(id,value);if(kind==='monsters')this.deadlinesR531?.forget(row.id);}}
 retire(kind,rows){
  demand(['participants','bossParticipants'].includes(kind)&&!this.pending,'combat_cleanup_pending');
  for(const row of rows){const id=key(kind,row),base=this.base.get(kind).get(id)??null,current=this.current.get(kind).get(id)??null;demand(same(kind,base,current),'combat_cleanup_dirty');if(base)demand(base.created_at===row.created_at,'combat_cleanup_changed');this.base.get(kind).delete(id);this.current.get(kind).delete(id);}
 }
 committed({monsters,participants,bossParticipants,removed=[]}){
  demand(!this.pending,'combat_checkpoint_pending');const ids=new Set([...monsters.map(m=>m.id),...removed]),rounds=new Set(monsters.filter(m=>m.is_boss).map(m=>m.spawn_round));
  for(const id of removed)this.deadlinesR531?.forget(id);
  for(const maps of [this.base,this.current])for(const id of removed)maps.get('monsters').delete(key('monsters',{id}));
  for(const maps of [this.base,this.current])for(const kind of ['participants','bossParticipants'])for(const [id,row]of maps.get(kind))if(kind==='participants'?ids.has(row.monster_id):rounds.has(row.boss_round))maps.get(kind).delete(id);
  this.hydrate('monsters',monsters);this.hydrate('participants',participants);this.hydrate('bossParticipants',bossParticipants);
 }
 changed(changes){
  for(const kind of Object.keys(specs))for(const row of changes[kind]??[]){const id=key(kind,row);demand(kind!=='monsters'||this.base.get(kind).has(id),'combat_monster_not_hydrated');const value=pick(kind,row);this.current.get(kind).set(id,value);if(kind==='monsters')this.deadlinesR531?.change(row.id,value,this.base.get(kind).get(id),this.clock(),(a,b)=>same(kind,a,b));}
  this.events.push(...changes.combatEvents??[]);demand(this.events.length<=4096,'combat_journal_backpressure');
 }
 overdueR53(monster){
  if(!normalMonsterR53(monster))return false;
  const overdue=this.deadlinesR531?this.deadlinesR531.overdue(monster.id,this.clock(),this.at,R53_MEMORY_WINDOW_MS):this.clock()-this.at>=R53_MEMORY_WINDOW_MS;if(!overdue)return false;
  const id=key('monsters',monster);return !same('monsters',this.base.get('monsters').get(id)??null,this.current.get('monsters').get(id)??null);
 }
 snapshot(){
  if(this.snapshotIndex?.owns(this.base,this.current)){
   const payload={};for(const kind of Object.keys(specs))payload[kind]=this.snapshotIndex.snapshot(kind,same);payload.combatEvents=[...this.events];return payload;
  }
  const payload={};for(const kind of Object.keys(specs)){const base=this.base.get(kind);payload[kind]=[...this.current.get(kind)].filter(([id,row])=>!same(kind,base.get(id)??null,row)).map(([id,row])=>({base:base.get(id)??null,current:row}));}payload.combatEvents=[...this.events];return payload;
 }
 reserveR54(targets){
  demand(!this.failure,'combat_checkpoint_fenced');
  demand(rewardAsyncReplyR54&&Array.isArray(targets)&&targets.length>0&&targets.length<=localMixedTargetLimitR51&&new Set(targets).size===targets.length&&targets.every(id=>!this.reservedR53.has(id)),'combat_join_pending');
  // A captured checkpoint is immutable. Only a snapshot containing one of
  // these targets must ACK before their joined death can capture its base.
  // Reserve synchronously so every later flush excludes the dying targets.
  // An unknown scope retains the old full wait; it is never treated as empty.
  const scope=this.pendingTargetsR54,pending=this.pending&&(!(scope instanceof Set)||targets.some(id=>scope.has(id)))?this.pending:null;
  const token={ids:new Set(targets),pending};for(const id of token.ids)this.reservedR53.add(id);return token;
 }
 cancelReservationR54(token){
  demand(rewardAsyncReplyR54&&token&&!token.payload&&[...token.ids].every(id=>this.reservedR53.has(id)),'combat_join_changed');
  for(const id of token.ids)this.reservedR53.delete(id);
 }
 captureR53(targets,{reservationR54=null}={}){
  // A skipped unrelated checkpoint can fail while actor journals are awaited.
  // Its fatal fence still applies before any new defeat request is submitted.
  demand(!this.failure,'combat_checkpoint_fenced');
  const reserved=rewardAsyncReplyR54&&reservationR54;
  demand(Array.isArray(targets)&&targets.length>0&&targets.length<=localMixedTargetLimitR51&&(reserved?
   !reserved.payload&&reserved.ids.size===targets.length&&targets.every(id=>reserved.ids.has(id)&&this.reservedR53.has(id))&&(!this.pending||this.pendingTargetsR54 instanceof Set&&targets.every(id=>!this.pendingTargetsR54.has(id))):
   !this.pending&&targets.every(id=>!this.reservedR53.has(id))),'combat_join_pending');
  const ids=new Set(targets),all=this.snapshot(),payload={monsters:all.monsters.filter(r=>ids.has(r.current.id)),participants:all.participants.filter(r=>ids.has(r.current.monster_id)),bossParticipants:[],combatEvents:all.combatEvents.filter(r=>ids.has(r.target_id))};
  // Bound the joined IPC/receipt as strictly as an existing journal chunk.
  // Exceptional large histories retain the old bounded checkpoint drains.
  const captureBytesR54=Buffer.byteLength(JSON.stringify(payload));
  if(process.env.CORE511_STAGE_TIMING==='1')this.lastCaptureR54={monsters:payload.monsters.length,participants:payload.participants.length,events:payload.combatEvents.length,bytes:captureBytesR54};
  if(payload.monsters.length>1024||payload.participants.length>1024||payload.combatEvents.length>4096||captureBytesR54>224*1024)return null;
  for(const id of ids)this.reservedR53.add(id);this.deadlinesR531?.capture(payload.monsters,this.clock());return reserved?Object.assign(reserved,{payload}):{ids,payload};
 }
 finishR53(token,{committed=false,result=null}={}){
  demand([...token.ids].every(id=>this.reservedR53.has(id)),'combat_join_changed');
  if(committed){
   // Do not publish/retire a joined death after the channel journal failed,
   // even if its independent writer ACK arrived afterwards. Keep the lease
   // and reservation for the existing unknown-COMMIT recovery path.
   demand(!this.failure,'combat_checkpoint_fenced');
   this.acknowledgeDeadlineR531(token.payload);
   for(const kind of Object.keys(specs))for(const {current}of token.payload[kind])this.base.get(kind).set(key(kind,current),current);
   const sent=new Set(token.payload.combatEvents);this.events=this.events.filter(e=>!sent.has(e));
   if(result){
    demand(!result.bossParticipants?.length&&!result.removed?.length&&(result.monsters??[]).every(m=>token.ids.has(m.id)&&!m.is_boss&&!m.is_stone),'combat_join_result_scope');
    const changedIds=new Set((result.monsters??[]).map(m=>m.id));
    for(const maps of [this.base,this.current])for(const [id,row]of maps.get('participants'))if(changedIds.has(row.monster_id))maps.get('participants').delete(id);
    for(const kind of ['monsters','participants'])for(const row of result[kind]??[]){const id=key(kind,row),value=pick(kind,row);this.base.get(kind).set(id,value);this.current.get(kind).set(id,value);}
   }
  }
  this.deadlinesR531?.cancel(token.payload.monsters);for(const id of token.ids)this.reservedR53.delete(id);
 }
 acknowledgeDeadlineR531(payload){if(!this.deadlinesR531)return;this.deadlinesR531.acknowledged(payload.monsters,id=>this.current.get('monsters').get(key('monsters',{id})),(a,b)=>same('monsters',a,b));for(const {current}of payload.monsters)this.base.get('monsters').set(key('monsters',current),current);}
 flush({targetsR531=null}={}){
  demand(!this.failure,'combat_checkpoint_fenced');if(this.pending)return this.pending;
  const payload=this.snapshot(),capturedAt=this.clock();
  if(targetsR531){payload.monsters=payload.monsters.filter(r=>targetsR531.has(r.current.id));payload.participants=payload.participants.filter(r=>targetsR531.has(r.current.monster_id));payload.bossParticipants=[];payload.combatEvents=payload.combatEvents.filter(r=>targetsR531.has(r.target_id));}
  if(this.reservedR53.size){payload.monsters=payload.monsters.filter(r=>!this.reservedR53.has(r.current.id));payload.participants=payload.participants.filter(r=>!this.reservedR53.has(r.current.monster_id));payload.combatEvents=payload.combatEvents.filter(r=>!this.reservedR53.has(r.target_id));}
  if(Object.values(payload).every(rows=>rows.length===0)){if(!targetsR531&&!this.reservedR53.size)this.at=this.clock();return Promise.resolve({unchanged:true});}
  const actor=this.actor?.();if(this.actor)demand(typeof actor==='string'&&actor,'combat_checkpoint_actor_missing');
  const event={...(this.actor?{actor}:{}),key:'combat-checkpoint:'+this.incarnation+':'+(++this.serial),kind:'combat_checkpoint',payload};
  if(rewardAsyncReplyR54)this.pendingTargetsR54=new Set([...payload.monsters.map(r=>r.current.id),...payload.participants.map(r=>r.current.monster_id),...payload.combatEvents.map(r=>r.target_id)]);
  this.deadlinesR531?.capture(payload.monsters,capturedAt);
  this.pending=Promise.resolve().then(async()=>{
   if(!checkpointBatches)return this.submit(event);
   const batches=combatCheckpointBatches(payload,id=>this.current.get('monsters').get(key('monsters',{id})));
   if(batches.length===1)return this.submit(event);
   // Keep the single checkpoint lane pending through EVERY durable ACK. An
   // overlapping joined death still waits for this whole snapshot; disjoint
   // reservations never retire a chunk's pending scope early. Each monster
   // group retains one operation key/sequence and the existing ledger.
   if(rewardGroupCommitR53&&this.submitBatch){
    for(let offset=0;offset<batches.length;offset+=8){
     const commands=batches.slice(offset,offset+8).map((part,index)=>({...event,key:event.key+':'+(offset+index),payload:part})),acks=await this.submitBatch(commands);
     demand(Array.isArray(acks)&&acks.length===commands.length,'combat_checkpoint_ack_mismatch');
     for(let index=0;index<commands.length;index++){demand(acks[index].key===commands[index].key&&checkpointAckMatchesR53(acks[index].result,commands[index].payload),'combat_checkpoint_ack_mismatch');this.acknowledgeDeadlineR531(commands[index].payload);}
    }
   }else for(const [index,part]of batches.entries()){
    const partKey=event.key+':'+index,ack=await this.submit({...event,key:partKey,payload:part});
    demand(ack.key===partKey&&checkpointAckMatchesR53(ack.result,part),'combat_checkpoint_ack_mismatch');this.acknowledgeDeadlineR531(part);
   }
   return {key:event.key,result:{saved:payload}};
  }).then(ack=>{
   demand(ack.key===event.key&&checkpointAckMatchesR53(ack.result,payload),'combat_checkpoint_ack_mismatch');
   this.acknowledgeDeadlineR531(payload);
   for(const kind of Object.keys(specs))for(const {current}of payload[kind])this.base.get(kind).set(key(kind,current),current);
   if(memoryCombatR53){const sent=new Set(payload.combatEvents);this.events=this.events.filter(e=>!sent.has(e));}else this.events.splice(0,payload.combatEvents.length);this.pending=null;if(rewardAsyncReplyR54)this.pendingTargetsR54=null;if(!targetsR531)this.at=memoryCombatR53?capturedAt:this.clock();return ack;
  }).catch(error=>{this.failure=error;this.onFatal(error);throw error;});return this.pending;
 }
 poll(){
  const large=memoryCombatR53&&this.snapshotIndex?.owns(this.base,this.current)&&[...this.snapshotIndex.rows.values()].reduce((n,row)=>n+row.candidates.size,0)+this.events.length>=512;
  const interval=memoryCombatR53?(large?500:R53_CHECKPOINT_START_MS):CHECKPOINT_MS;
  if(!this.failure&&!this.pending&&this.clock()-this.at>=interval)void this.flush().catch(()=>{});
 }
 async drainTargetsR531(ids){demand(Array.isArray(ids)&&ids.length<=1024,'combat_scoped_drain_targets');if(this.pending)await this.pending;return this.flush({targetsR531:new Set(ids)});}
 async drain(){if(this.pending)await this.pending;return this.flush();}
}
