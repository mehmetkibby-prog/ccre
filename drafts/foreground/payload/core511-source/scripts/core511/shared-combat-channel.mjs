import {stoppedChannelProofR533} from './shared-stopped-r533.mjs';
import {retiredActorIsolation} from './r48_2-options.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {sharedHoldRollbackIsolation,sharedHoldBarrier,sharedHoldRollback} from './shared-hold-rollback.mjs';
import {PARALLEL_RELEASE} from './performance-options.mjs';
import {EncounterChanges} from './encounter-checkpoint.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {attackSeedR57} from './planned-attack-seed-r57.mjs';
import {attackRandom} from './attack-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand,PROTOCOL} from './contract.mjs';
import {sharedNeeds} from './generated/shared-lease-selection.mjs';
import {heartbeatRestFrame} from './heartbeat-writer.mjs';
import {RetaliationMemory} from './retaliation-memory.mjs';
import {foregroundClaimTargetsR80} from './reward-actor-scope-r80.mjs';

const empty=()=>({monsters:[],participants:[],bossParticipants:[],combatEvents:[]});
const key=(kind,p)=>JSON.stringify(kind==='participants'?[p.monster_id,p.spawn_round,p.player_id]:[p.boss_round,p.player_id]);

// Independent actor/encounter and nonterminal combat drains may share a native
// commit group. Join every started drain, including on rejection, so recovery
// cannot replace an owner while a sibling checkpoint is still awaiting fsync.
function rejectedCheckpoint(error,channel,ids){
 const r=actorRejection(error);return r?.operation==='actor_checkpoint'&&r.outcome==='not_executed'&&ids.includes(r.actor)&&channel.owners.get(r.actor)?.epoch===r.epoch&&r.channel===channel.peer.channel&&r.incarnation===channel.peer.incarnation?r:null;
}
export async function drainCombatCheckpoints(channel,ids){
 const settled=await Promise.allSettled([...ids.map(id=>Promise.resolve().then(()=>channel.checkpoints.drain(id))),Promise.resolve().then(()=>channel.combatCheckpoints.drain())]);
 // A known actor rollback must never conceal a sibling's unknown durable
 // outcome. Every started drain has settled before selecting the error.
 const failed=(retiredActorIsolation&&settled.find(result=>result.status==='rejected'&&!rejectedCheckpoint(result.reason,channel,ids)))||settled.find(result=>result.status==='rejected');if(failed)throw failed.reason;
}

export class SharedCombatChannel {
 constructor(runtime){this.runtime=runtime;this.channel=runtime.channel;this.pending=new Map();this.planning=null;this.held=null;this.abortedHolds=new Map();}
 async idle(){await Promise.all([...new Set(this.pending.values())].map(row=>row.completion));}
 async rejectBeforePrepare(row,error){
  const rejected=actorFaultIsolation&&actorRejection(error);
  if(rejected?.sharedLease&&rejected.sharedLease===row.proof&&rejected.actor===row.actor&&rejected.epoch===row.epoch&&rejected.key==='shared:'+row.id&&row.lease?.state==='held'){
   if(rejected.unsubmitted===true){const ack=await this.runtime.request('shared_cancel',this.scope(row,{operationId:rejected.key}));demand(ack?.cancelled===true,'shared_cancel_ack');}
   // Parent confirms pre-execution rollback AND completed shared_abort before
   // forwarding this scoped negative result. No terminal gameplay ran.
   await this.runtime.request('shared_complete',this.scope(row));this.channel.lanes.release(row.lease);for(const id of row.ids)if(this.pending.get(id)===row)this.pending.delete(id);return true;
  }
  if(!rejected||row.prepareStarted||!row.proof||!row.ids.includes(rejected.actor)||row.lease?.state!=='held')return false;
  // Only checkpoints have run. The terminal writer has not been submitted;
  // release the world read lease with empty changes before the local lanes.
  await this.runtime.request('shared_finish',this.scope(row,{changes:empty()}));
  await this.runtime.request('shared_complete',this.scope(row));this.channel.lanes.release(row.lease);
  for(const id of row.ids)if(this.pending.get(id)===row)this.pending.delete(id);return true;
 }
 async rejectedPreparation(row){
  await this.runtime.request('shared_complete',this.scope(row));this.channel.lanes.release(row.lease);
  for(const id of row.ids)if(this.pending.get(id)===row)this.pending.delete(id);
  return {result:{status:409,body:{code:'shared_prepare_actor_rejected',error:'İşlem uygulanmadı. Tekrar deneyebilirsin.'}},events:[]};
 }

 residentResult(value,prepared){const stopped=new Set(prepared.stoppedPlayers??[]);return stopped.size?{...value,players:(value.players??[]).filter(p=>!stopped.has(p.id)),...(value.encounters?{encounters:value.encounters.filter(([id])=>!stopped.has(id))}:{})}:value;}
 needs(input,actor,now=this.channel.wall()){
  if(!['attack','pvp_attack'].includes(input?.action))return false;
  const c=this.channel,view=c.view,r=this.runtime;if(!this.sharedIndex||this.indexVersion!==r.sharedVersion||this.indexEpoch!==r.sharedEpoch){this.sharedIndex=new Map([...view.monsters].filter(([,m])=>m.channel===0));this.indexVersion=r.sharedVersion;this.indexEpoch=r.sharedEpoch;}
  return sharedNeeds.call({monsters:this.sharedIndex,localMonster:id=>view.monster(id)},input,actor)||input.action==='attack'&&c.retaliationMemory.due(actor.id,now).some(e=>view.monster(e.monster_id)?.channel===0);
 }
 ownsPlayer(id){return this.planning?.ids.includes(id)===true;}
 ownsMonster(id){return this.planning?.lease.keys.includes('monster:'+id)===true;}
 scope(row,extra={}){return {actor:row.actor,epoch:row.epoch,id:row.id,proof:row.proof,...extra};}
 hasShared(keys){return keys.some(key=>key.startsWith('monster:')&&this.channel.view.monster(key.slice(8))?.channel===0);}
 read(context,{keys,seed,kind,plan,payload,commit,prepare=()=>({}),apply=null,response=value=>value.result,type='action',after=async()=>{},reply=true}){
  if(this.runtime.sharedPaused&&!context.kernel.players.get(context.id)?.quiescer)return DEFER_INPUT;
  const c=this.channel,{id,kernel}=context,row={id:randomUUID(),actor:id,epoch:c.owners.get(id).epoch,ids:[id],phase:'waiting',lease:null};this.pending.set(id,row);
  row.completion=kernel.durableGroup([id],async()=>{
   try{
    const grant=await this.runtime.request('shared_acquire',this.scope(row));row.proof=grant.proof;demand(grant.snapshot.cycle===c.world.cycle,'shared_channel_cycle');
    keys=[...new Set([...keys,...grant.snapshot.monsters.map(m=>'monster:'+m.id),...[...c.view.monsters.values()].filter(m=>m.channel===c.peer.channel&&m.area===c.view.player(id).area).map(m=>'monster:'+m.id)])];while(!(row.lease=c.lanes.acquire(keys,row.id)))await c.lanes.available(keys);row.phase='executing';
    this.planning=row;let result;try{const rng=new OperationRandom(seed);result=plan(()=>rng.roll());demand(!result.deferred,'shared_read_plan_changed');}finally{this.planning=null;}
    if(result.durable){
     await drainCombatCheckpoints(c,[id]);row.prepareStarted=true;const prepared=await this.runtime.request('shared_prepare',this.scope(row,{players:[id],...prepare()}));if(actorFaultIsolation&&prepared?.prepared===false&&prepared.rejected===true)return await this.rejectedPreparation(row);demand(prepared.prepared,'shared_read_prepare');
     const ack=await c.writer.submit({actor:id,key:'shared:'+row.id,kind,payload:{...payload(),seed,resources:[...row.lease.keys,...prepared.players.map(pid=>'player:'+pid)],sharedLease:row.proof}});demand(ack.key==='shared:'+row.id&&ack.result,'shared_read_ack');c.lanes.assert(row.lease);const value=this.residentResult(ack.result,prepared);if(apply)await apply(value);else{await c.applyCommit(value);c.checkpoints.hydrate(c.view.player(id));c.encounters.hydrateCommitted(id,value.engagement);}result={result:response(value),events:value.events};await this.runtime.request('shared_finish',this.scope(row,{changes:empty()}));
    }else{await this.runtime.request('shared_finish',this.scope(row,{changes:empty()}));c.lanes.assert(row.lease);commit(result);}
    for(const event of result.events??[])c.ports.publish(...event);await this.runtime.request('shared_complete',this.scope(row));c.lanes.release(row.lease);this.pending.delete(id);await after();return result;
   }catch(error){let rejected=false;try{rejected=await this.rejectBeforePrepare(row,error);}catch(abortError){error=abortError;}if(!rejected){if(row.lease?.state==='held')c.lanes.fence(row.lease);this.runtime.fail(error);}throw error;}
  },{replyTo:reply?id:null,emitReceipt:false,...(reply?{ackResult:value=>({type,...value.result})}:{})});return {type};
 }
 nativeAction(context){
  const c=this.channel,{id,input,now,receivedAtMs=now}=context;
  // Native collection, party membership and arena admission can affect other
  // actors. Cached room membership is not authority for their cold SQL reads.
  // Reuse the accepted-input FIFO and native cold barrier. The parent may
  // derive a bounded recipient scope for audited boss/stone claims only;
  // every held foreign resident refreshes its committed rows before release.
  return this.read(context,{keys:['player:'+id],seed:OperationRandom.seed(),kind:'native_action',plan:()=>({durable:true}),
   prepare:()=>foregroundClaimTargetsR80(input)?{foregroundClaimR80:input}:{},
   payload:()=>({input,nowMs:now,receivedAtMs,expected:{player:c.frames.frame(id),settings:c.settings}}),
   apply:async value=>{await c.applyCommit({...value,players:value.players.filter(p=>p.id===id)});c.checkpoints.hydrate(c.view.player(id));c.encounters.hydrateCommitted(id,value.encounters.find(([pid])=>pid===id)?.[1]??null);}
  });
 }
 guildRevoke(context){
  const c=this.channel,{id,input,now}=context;
  return this.read(context,{keys:['player:'+id],seed:OperationRandom.seed(),kind:'mode_action',type:'mode',plan:()=>({durable:true}),
   payload:()=>({kind:input.kind,input:input.command,nowMs:now}),response:value=>({body:value.result,status:value.status??(value.result.ok===false?409:200),...(value.headers?{headers:value.headers}:{})}),
   apply:async value=>{await c.applyCommit({...value,players:value.players.filter(p=>p.id===id)});c.checkpoints.hydrate(c.view.player(id));}
  });
 }
 dungeonEntry(context){
  const dungeon=this.runtime.dungeon,{input,now}=context;
  return this.read(context,{keys:['player:'+context.id],seed:OperationRandom.seed(),kind:'dungeon_entry',type:'dungeon',plan:()=>({durable:true}),
   payload:()=>({command:input.command,nowMs:now,lastTick:dungeon.resident.lastTick}),apply:value=>dungeon.applyEntry(value)});
 }
 heartbeat(context,{keys,seed,counter,loop}){
  const c=this.channel,{id,now}=context;return this.read(context,{keys,seed,kind:'heartbeat',plan:random=>loop.memory.plan(id,now,{random}),payload:()=>({nowMs:now,expected:{player:c.frames.frame(id),rest:heartbeatRestFrame(c.view.player(id)),settings:c.settings,state:c.frames.entry(id).heartbeatState}}),commit:result=>loop.memory.commit(result),after:()=>loop.maintenance(id,now,counter)});
 }
 movement(context,{keys,seed,scope,auth}){
  const c=this.channel,{id,input,receivedAtMs=context.now}=context;return this.read(context,{keys,seed,kind:'movement',plan:random=>c.movementMemory.step({auth,payload:input,nowMs:receivedAtMs,scope,random,commit:false}),payload:()=>({nowMs:receivedAtMs,input,scope,expected:c.movement.frameFor(id,receivedAtMs)}),commit:result=>c.movementMemory.commit(result)});
 }
 retaliation(context,{entry,seed}){
  const c=this.channel,{id,now}=context;let currentRow,engagement,frame;
  return this.read(context,{keys:['player:'+id,'monster:'+entry.monster_id],seed,kind:'retaliation_death',reply:false,plan:random=>{
   const players=new Map(),engagements=new EncounterChanges(pid=>c.view.engagements.get(pid)),events=[],view={player:pid=>players.get(pid)??c.view.player(pid),monster:mid=>c.view.monster(mid),setPlayer:p=>players.set(p.id,p),setEngagement:(pid,e)=>engagements.set(pid,e),engagements:{get:pid=>engagements.has(pid)?engagements.get(pid):c.view.engagements.get(pid)}};
   const memory=new RetaliationMemory({view,globals:c.globals,publish:(...args)=>events.push(args)});currentRow=c.view.engagements.get(id);engagement={...currentRow,...entry};frame=c.retaliation.frameFor(id,entry);return {...memory.step({playerId:id,settings:c.settings,nowMs:now,engagement,frame,random}),events,changes:{players:[...players.values()],engagements:engagements.snapshot()}};
  },payload:()=>({nowMs:now,engagement,row:currentRow,frame,settings:c.settings}),commit:result=>{for(const p of result.changes.players)c.view.setPlayer({...p,last_seen:Math.max(p.last_seen,c.view.player(p.id).last_seen)});for(const [pid,e]of result.changes.engagements)c.view.setEngagement(pid,e);}});
 }
 plan(row,context){
  const c=this.channel,a=c.attackMemory,old={participants:a.participants,bossParticipants:a.bossParticipants},rounds=new Set(row.snapshot.monsters.filter(m=>m.is_boss).map(m=>m.spawn_round));
  for(const kind of ['participants','bossParticipants']){a[kind]=new Map([...old[kind]].filter(([,p])=>kind==='participants'?!row.sharedIds.has(p.monster_id):!rounds.has(p.boss_round)));for(const p of row.snapshot[kind])a[kind].set(key(kind,p),Object.freeze({...p}));}
  this.planning=row;try{return row.memory.plan(context,{...attackRandom(row.seed),nowMs:row.now});}finally{this.planning=null;Object.assign(a,old);}
 }
 act(context,{players=null,seed=null}={}){
  if(this.runtime.sharedPaused&&!context.kernel.players.get(context.id)?.quiescer)return DEFER_INPUT;
  const c=this.channel,{id,epoch,input,now,receivedAtMs=now,kernel}=context,actor=c.view.player(id),area=actor.area;
  // Native black AoE can mutate every resident in this scope. Reserve those
  // actor barriers before an asynchronous lease; waiting borrowers hold no
  // resource lane and can be checkpointed by a different terminal borrower.
  const mixed=Math.min(3,Math.max(0,Math.floor(Number(input.ability)||0)))===2&&actor.role!=='muhafiz';
  const ids=[...new Set(players??[id,...(mixed?[...c.view.players.values()].filter(p=>p.area===area&&p.channel===actor.channel&&p.arena_match_id===actor.arena_match_id).map(p=>p.id):[])])].filter(pid=>pid===id||!stoppedChannelProofR533(c,c.quarantines?.entries.get(pid)?.proof??{actor:pid}));demand(ids.includes(id),'shared_source_group');
  if(ids.some(pid=>!kernel.players.has(pid)||kernel.players.get(pid).barrier||kernel.players.get(pid).suspended||c.lanes.busy(['player:'+pid])))return DEFER_INPUT;
  const row={id:randomUUID(),actor:id,epoch,ids,now,input,receivedAtMs,seed:seed??attackSeedR57(context),phase:'waiting',lease:null,memory:input.action==='attack'?c.attackMemory:c.pvpMemory};for(const pid of ids)this.pending.set(pid,row);
  const pending=kernel.durableGroup(ids,async()=>{
   try{
    const grant=await this.runtime.request('shared_acquire',this.scope(row));row.proof=grant.proof;row.snapshot=grant.snapshot;row.sharedIds=new Set(grant.snapshot.monsters.map(m=>m.id));demand(grant.snapshot.cycle===c.world.cycle,'shared_channel_cycle');
    const keys=[...ids.map(pid=>'player:'+pid),...grant.snapshot.monsters.map(m=>'monster:'+m.id),...[...c.view.monsters.values()].filter(m=>m.channel===c.peer.channel&&m.area===area).map(m=>'monster:'+m.id)];
    while(!(row.lease=c.lanes.acquire(keys,row.id)))await c.lanes.available(keys);row.phase='executing';
    // load() published and acknowledged this exact shared image before grant.
    for(const monster of grant.snapshot.monsters)demand(c.view.monster(monster.id)&&JSON.stringify(c.view.monster(monster.id))===JSON.stringify(monster),'shared_channel_projection_mismatch');
    const frame=()=>input.action==='attack'?c.frames.attack(id,input,receivedAtMs,now):c.frames.pvp(id,input,receivedAtMs,now),original=frame();let result=this.plan(row,original);demand(!result.deferred,'shared_plan_resource_changed');
    if(result.durable){
     // Actor/encounter and nonterminal combat snapshots write disjoint rows.
     // Submit both drains together so the native writer can group their fsync;
     // every receipt still finishes before the terminal barrier/kill begins.
     await drainCombatCheckpoints(c,ids);c.lanes.assert(row.lease);
     row.prepareStarted=true;const prepared=await this.runtime.request('shared_prepare',this.scope(row,{players:ids}));if(actorFaultIsolation&&prepared?.prepared===false&&prepared.rejected===true)return await this.rejectedPreparation(row);demand(prepared.prepared,'shared_terminal_prepare');const fresh=frame(),resources=[...new Set([...row.lease.keys,...prepared.players.map(pid=>'player:'+pid)])],payload={nowMs:now,receivedAtMs,seed:row.seed,input,resources,sharedLease:row.proof,...(input.action==='attack'?{expected:{player:fresh.player,monster:fresh.preloadedAttackMonster,settings:fresh.settings}}:{expected:fresh.actionSnapshot,originalSnapshot:original.originalSnapshot??original.actionSnapshot})};
     const ack=await c.writer.submit({actor:id,key:'shared:'+row.id,kind:input.action,payload});demand(ack.key==='shared:'+row.id&&ack.result,'shared_terminal_ack');c.lanes.assert(row.lease);const value=this.residentResult(ack.result,prepared);
     demand((value.players??[]).every(p=>!c.owners.has(p.id)||ids.includes(p.id)||prepared.players.includes(p.id)),'shared_terminal_unlocked_actor');
     // The shared projection is published by its owner after durable reload.
     row.returnMoves=value.moves?.length?value.moves:null;const moved=new Set((row.returnMoves??[]).map(m=>m.id));
     await c.applyCommit({...value,players:(value.players??[]).filter(p=>!moved.has(p.id)),monsters:(value.monsters??[]).filter(m=>m.channel!==0)});
     const local={monsters:(value.monsters??[]).filter(m=>m.channel!==0),participants:(value.participants??[]).filter(p=>!row.sharedIds.has(p.monster_id)),bossParticipants:(value.bossParticipants??[]).filter(p=>!row.snapshot.monsters.some(m=>m.is_boss&&m.spawn_round===p.boss_round))};c.attackMemory.committed(local);c.combatCheckpoints.committed(local);
     for(const p of value.players??[])if(ids.includes(p.id)&&!moved.has(p.id))c.checkpoints.hydrate(c.view.player(p.id));if(value.encounters){for(const [pid,e]of value.encounters)if(!moved.has(pid))c.encounters.hydrateCommitted(pid,e);}else c.encounters.hydrateCommitted(id,value.engagement);
     if(row.returnMoves){demand(this.held,'shared_return_hold_missing');row.suspension=new Map(ids.map(pid=>[pid,kernel.players.get(pid).suspended]));for(const pid of ids){const p=kernel.players.get(pid);p.externalHold=this.held.token;p.suspended=true;}}
     result={result:value.result,events:value.events};const finished=await this.runtime.request('shared_finish',this.scope(row,{changes:empty()}));if(row.returnMoves)demand(finished.returning&&finished.token===this.held.token,'shared_return_finish_ack');
    }else{
     const changes=result.changes,rounds=new Set(row.snapshot.monsters.filter(m=>m.is_boss).map(m=>m.spawn_round)),shared={monsters:changes.monsters.filter(m=>row.sharedIds.has(m.id)),participants:changes.participants.filter(p=>row.sharedIds.has(p.monster_id)),bossParticipants:changes.bossParticipants.filter(p=>rounds.has(p.boss_round)),combatEvents:changes.combatEvents.filter(e=>row.sharedIds.has(e.target_id))};
     await this.runtime.request('shared_finish',this.scope(row,{changes:shared}));c.lanes.assert(row.lease);row.memory.commit(result,{sharedIds:row.sharedIds});
    }
    for(const event of result.events)c.ports.publish(...event);if(row.returnMoves)return result;await this.runtime.request('shared_complete',this.scope(row));c.lanes.release(row.lease);for(const pid of ids)if(this.pending.get(pid)===row)this.pending.delete(pid);return result;
   }catch(error){let rejected=false;try{rejected=await this.rejectBeforePrepare(row,error);}catch(abortError){error=abortError;}if(!rejected){if(row.lease?.state==='held')c.lanes.fence(row.lease);this.runtime.fail(error);}throw error;}
  },{replyTo:id,emitReceipt:false,ackResult:value=>({type:'action',...value.result})});
  // Registered after FixedLoop's own completion handler: old owner.pending
  // and deferred input results are settled before any actor can be exported.
  row.completion=pending.then(()=>row.returnMoves?this.returnSource(row):undefined);void row.completion.catch(error=>this.runtime.fail(error));return {type:'action'};
 }
 async returnSource(row){
  const c=this.channel,h=this.held;demand(h&&row.returnMoves&&row.ids.every(id=>!c.kernel.players.get(id)?.barrier),'shared_return_source_pending');
  c.lanes.release(row.lease);
  for(const id of row.ids){const p=c.kernel.players.get(id),owner=c.owners.get(id);demand(p?.externalHold===h.token&&!h.actors.some(a=>a.id===id),'shared_return_source_hold');const lease=c.lanes.acquire(['player:'+id],h.token);demand(lease,'shared_return_source_resource');h.actors.push({id,epoch:owner.epoch,p,suspended:row.suspension.get(id),lease,borrowed:false});}
  const actors=row.ids.map(id=>({id,epoch:c.owners.get(id).epoch,sequence:c.writer.finalSequence(id),rates:c.owners.get(id).passive===1?null:this.runtime.rates.snapshot(c.identities.get(id))}));
  await this.runtime.request('shared_return',this.scope(row,{actors}));await this.runtime.request('shared_complete',this.scope(row));for(const id of row.ids)if(this.pending.get(id)===row)this.pending.delete(id);
 }
 async export({token,id,source,target,retired=false}){
  const r=this.runtime,c=this.channel,h=this.held,a=h?.actors.find(a=>a.id===id);demand(h?.token===token&&a?.epoch===source.epoch&&source.channel===c.peer.channel&&source.incarnation===c.peer.incarnation,'shared_export_owner');
  const global=r.globalControl.held;if(global)global.actors=global.actors.filter(row=>row.id!==id);
  if(a.cold)c.control.retireFrozen(a.cold);
  const packet=c.kernel.retireScope(id,source.epoch,token),final=[];if(packet.results.length)final.push({type:'frame',protocol:PROTOCOL,...packet});
  final.push({type:'channel_changed',protocol:PROTOCOL,channel:target.channel,epoch:target.epoch,retired});await r.connections.retire(id,final);c.detach(id);if(a.lease)c.lanes.release(a.lease);h.actors=h.actors.filter(row=>row!==a);return {token,id,exported:true};
 }
 async admit(payload){
  const r=this.runtime,c=this.channel,h=this.held,token=payload.frozen?.token,{identity}=payload;demand(h?.token===token&&!h.actors.some(a=>a.id===identity.actor),'shared_admit_scope');const lease=c.lanes.acquire(['player:'+identity.actor],token);demand(lease,'shared_admit_resource');
  await r.mailbox.hold(token,[identity.actor]);const global=r.globalControl.held;if(global)await r.mailbox.hold(global.token,[identity.actor]);
  await r.control(payload.bundle.owner.passive===1?'admit_passive':'admit',payload);await c.kernel.quiesce(identity.actor,identity.epoch);const p=c.kernel.players.get(identity.actor);p.externalHold=token;
  h.actors.push({id:identity.actor,epoch:identity.epoch,p,lease,borrowed:false,quiesced:true,suspended:Boolean(global)});if(global)global.actors.push({id:identity.actor,epoch:identity.epoch});return {token,id:identity.actor,epoch:identity.epoch,admitted:true};
 }
 async hold({token,except,freezes=[],stopped=[],only=null}){
  demand(!this.held&&typeof token==='string'&&Array.isArray(except),'shared_hold_scope');const c=this.channel;
  demand(only===null||Array.isArray(only)&&new Set(only.map(a=>a.id)).size===only.length&&only.every(a=>typeof a.id==='string'&&Number.isSafeInteger(a.epoch)&&c.owners.get(a.id)?.epoch===a.epoch),'shared_hold_selected_scope');
  const h={token,actors:[],stoppedActors:[],phase:'reserving',except,only};if(actorFaultIsolation)h.interrupted=new Promise(resolve=>h.interrupt=resolve);this.held=h;
  try{
   await this.runtime.flushPresence();await this.runtime.mailbox.hold(token,only?only.map(a=>a.id):[...c.owners.keys()]);if(this.runtime.sharedPending)await this.runtime.sharedPending;
   for(const [id,owner]of c.owners){if(only&&!only.some(p=>p.id===id&&p.epoch===owner.epoch)||except.some(p=>p.id===id&&p.epoch===owner.epoch))continue;
    const skip=stopped.find(p=>p.actor===id&&p.epoch===owner.epoch);if(skip&&stoppedChannelProofR533(c,skip)){h.stoppedActors.push({actor:id,epoch:skip.epoch,token:skip.token,finalSequence:skip.finalSequence});continue;}
    const p=c.kernel.players.get(id);let lease=null,borrowed=false,coldRequest=null;
    for(;;){
     if(actorFaultIsolation)this.pendingActor(id,owner.epoch);
     if(h.interruptError)throw h.interruptError;
     if(p.barrier&&this.pending.get(id)?.phase!=='waiting'){
      if(sharedHoldRollbackIsolation){
       const barrier=p.barrier,members=sharedHoldBarrier(c,barrier);
       try{await Promise.race([barrier,h.interrupted.then(()=>{throw h.interruptError;})]);}
       catch(error){
        const rejected=sharedHoldRollback(error,id,owner.epoch,c,members);
        if(rejected&&this.held===h&&h.phase==='reserving'&&c.owners.get(id)===owner&&c.kernel.players.get(id)===p&&p.epoch===owner.epoch){
         this.abortHold({token});return {token,channel:c.peer.channel,incarnation:c.peer.incarnation,actors:[],aborted:true,rejected};
        }throw error;
       }
      }else if(actorFaultIsolation)await Promise.race([p.barrier,h.interrupted.then(()=>{throw h.interruptError;})]);else await p.barrier;
      continue;
     }
     // A completed global freeze is safe to borrow: that world transaction
     // cannot start until the source of this still-accepted attack drains.
     const control=c.control.entries.get(id),authorized=control&&freezes.some(f=>f.id===id&&f.epoch===owner.epoch&&f.token===control.token);
     // Quiescence can finish before mode drains acquire the cold lane. Once
     // suspended, wait for that authorized freeze instead of stealing its
     // lane. Active actors must still drain accepted shared terminal work.
     if(authorized&&control.phase==='freezing'&&(control.lease?.state==='held'||p.suspended)){if(actorFaultIsolation)await Promise.race([control.promise,h.interrupted.then(()=>{throw h.interruptError;})]);else await control.promise;continue;}
     const cold=authorized&&control.phase==='frozen';
     // The parent authorizes borrowing only while the whole cold operation
     // is still draining. It cannot execute until this accepted terminal
     // attack and every requested freeze have completed.
     borrowed=p.suspended&&(this.runtime.globalControl.held!==null||cold);
     if(borrowed){if(cold)coldRequest={id,epoch:owner.epoch,token:control.token};break;}lease=c.lanes.acquire(['player:'+id],token);if(lease)break;if(actorFaultIsolation)await Promise.race([c.lanes.available(['player:'+id]),h.interrupted.then(()=>{throw h.interruptError;})]);else await c.lanes.available(['player:'+id]);
    }
    const entry={id,epoch:owner.epoch,p,suspended:p.suspended,...(actorFaultIsolation?{externalHold:p.externalHold}:{}),lease,borrowed,cold:coldRequest};h.actors.push(entry);p.externalHold=token;p.suspended=true;
   }
   h.phase='draining';if(!only||h.actors.length)await drainCombatCheckpoints(c,h.actors.map(a=>a.id));h.phase='held';
   return {token,channel:c.peer.channel,incarnation:c.peer.incarnation,...(h.stoppedActors.length?{stoppedActors:h.stoppedActors}:{}),actors:h.actors.map(a=>({id:a.id,epoch:a.epoch,sequence:c.writer.finalSequence(a.id),rates:c.owners.get(a.id).passive===1?null:this.runtime.rates.snapshot(c.identities.get(a.id))}))};
  }catch(error){
   const rejected=actorFaultIsolation&&actorRejection(error);
   if(actorFaultIsolation&&h.phase==='reserving'&&error===h.interruptError){this.abortHold({token});return {token,channel:c.peer.channel,incarnation:c.peer.incarnation,actors:[],aborted:true,rejected:h.interruptActor};}
   if((retiredActorIsolation?rejectedCheckpoint(error,c,h.actors.map(a=>a.id)):rejected?.operation==='actor_checkpoint'&&error.code==='checkpoint_snapshot_conflict')&&h.actors.some(a=>a.id===rejected.actor&&a.epoch===rejected.epoch)){
    this.abortHold({token});return {token,channel:c.peer.channel,incarnation:c.peer.incarnation,actors:[],aborted:true,rejected:{actor:rejected.actor,epoch:rejected.epoch,...(retiredActorIsolation?{code:'actor_checkpoint_rejected',reason:error.code}:{code:error.code})}};
   }
   for(const a of h.actors)if(a.lease?.state==='held')c.lanes.fence(a.lease);this.runtime.fail(error);throw error;
  }
 }
 pendingActor(id,epoch){
  const h=this.held;if(!actorFaultIsolation||h?.phase!=='reserving'||h.except.some(a=>a.id===id&&a.epoch===epoch)||h.only&&!h.only.some(a=>a.id===id&&a.epoch===epoch))return;
  const q=retiredActorIsolation&&this.channel.quarantines?.entries.get(id),proof=q&&actorRejection(q.error),quarantined=q?.epoch===epoch&&proof?.actor===id&&proof.epoch===epoch;
  if(!quarantined&&!this.runtime.commandRecovery?.hasActor(id,{confirmedOnly:true}))return;
  // Only reservation can be cancelled. No entered shared command is undone.
  const code=quarantined?'actor_quarantined':'actor_command_pending';
  if(!h.interruptError){h.interruptActor={actor:id,epoch,code,...(quarantined?{reason:q.error.code}:{})};h.interruptError=Object.assign(Error(code),{code});h.interrupt();}
 }
 abortHold({token}){
  demand(actorFaultIsolation,'shared_abort_disabled');const c=this.channel,h=this.held,old=this.abortedHolds.get(token);if(old)return old;
  demand(h?.token===token,'shared_abort_scope');
  for(const a of h.actors){demand(c.kernel.players.get(a.id)===a.p&&c.owners.get(a.id)?.epoch===a.epoch&&a.p.externalHold===token,'shared_abort_actor_fenced');if(a.lease)c.lanes.assert(a.lease);}
  for(const a of h.actors){if(a.lease)c.lanes.release(a.lease);a.p.externalHold=a.externalHold??null;a.p.suspended=c.quarantines?.entries.has(a.id)?true:a.suspended;}
  this.held=null;this.runtime.mailbox.resume(token);const ack={token,channel:c.peer.channel,incarnation:c.peer.incarnation,aborted:true};this.abortedHolds.set(token,ack);if(this.abortedHolds.size>128)this.abortedHolds.delete(this.abortedHolds.keys().next().value);return ack;
 }
 async release({token,refreshActors=null}){
  const c=this.channel,h=this.held;demand(h?.token===token,'shared_release_scope');
  const started=performance.now();let read=null,applyMs=0;
  try{for(const a of h.actors){
    const global=this.runtime.globalControl.held,cold=a.cold&&c.control.entries.get(a.id);
    demand(!a.cold||cold?.token===a.cold.token&&cold.epoch===a.epoch&&cold.phase==='frozen','shared_release_cold_fenced');
    const borrowedGlobal=a.borrowed&&global&&['freezing','frozen'].includes(global.phase)&&global.actors.some(p=>p.id===a.id&&p.epoch===a.epoch);
    c.state.assertOwner(a.id,a.epoch,{allowDraining:Boolean(cold),allowQuiesced:Boolean(a.quiesced||borrowedGlobal||cold)});
    demand(c.owners.get(a.id)?.epoch===a.epoch&&a.p.externalHold===token,'shared_release_actor_fenced');
   }
   demand(refreshActors===null||Array.isArray(refreshActors)&&new Set(refreshActors).size===refreshActors.length&&refreshActors.every(id=>h.actors.some(a=>a.id===id)),'shared_release_refresh_scope');
   const selected=refreshActors===null?h.actors:h.actors.filter(a=>refreshActors.includes(a.id));let bundles;
   const readAt=performance.now();bundles=[];
   if(PARALLEL_RELEASE){
    const requests=selected.map(a=>({id:a.id,epoch:a.epoch,revision:++c.revision}));
    const pending=requests.map(a=>Promise.resolve().then(()=>c.loadActor(a.id,a.epoch,a.revision)));
    try{bundles=await Promise.all(pending);}catch(error){
     // Join every started read before the existing fence/recovery path runs.
     // No bundle is applied and no lease is released on a failed batch.
     await Promise.allSettled(pending);throw error;
    }
   }else for(const a of selected)bundles.push(await c.loadActor(a.id,a.epoch,++c.revision));
   read={query:'kernel511_actor_world',actors:selected.length,wallMs:performance.now()-readAt};
   demand(bundles.length===selected.length&&bundles.every((b,i)=>b.player.id===selected[i].id),'shared_release_bundle_order');
   const applyAt=performance.now();for(const bundle of bundles){c.applyBundle(bundle);c.checkpoints.hydrate(bundle.player);c.encounters.hydrate(bundle.player.id,bundle.engagement);}applyMs=performance.now()-applyAt;
   for(const a of h.actors){
    if(a.lease)c.lanes.release(a.lease);a.p.externalHold=null;const global=this.runtime.globalControl.held;
    if(a.quiesced&&global){if(global.phase==='frozen'){const lease=c.lanes.acquire(['player:'+a.id],global.token);demand(lease,'shared_return_global_resource');global.extraLeases.push(lease);}a.p.suspended=true;}
    else if(a.quiesced)c.kernel.resume(a.id,a.epoch);else a.p.suspended=a.suspended;
   }this.held=null;this.runtime.mailbox.resume(token);return {token,released:true,refresh:{durationMs:performance.now()-started,applyMs,read}};
  }catch(error){for(const a of h.actors)if(a.lease?.state==='held')c.lanes.fence(a.lease);this.runtime.fail(error);throw error;}
 }
}
