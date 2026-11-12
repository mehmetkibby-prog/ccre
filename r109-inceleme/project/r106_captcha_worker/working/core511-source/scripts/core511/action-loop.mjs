import {isZumrutActionR93,zumrutWithoutCombatDrainR93} from './zumrut-actions-r93.mjs';
import {castleEnabled,CASTLE_AREA} from './castle-model-r59.mjs';
import {olderGroupWaitingR57,rememberDeferredGroupR57} from './group-fairness-r57.mjs';
import {scopedPotionCheckpointR531} from './r531-options.mjs';
import {memoryCombatR53,normalPlayerR53,normalMonsterR53} from './r53-options.mjs';
import {performance} from 'node:perf_hooks';
import {collectTime} from './collect-light.mjs';
import {randomUUID} from 'node:crypto';
import {OperationRandom} from './operation-random.mjs';
import {NATIVE_ACTIONS} from './action-writer.mjs';
import {DEFER_INPUT} from './fixed-loop.mjs';
import {demand} from './contract.mjs';
import {stageStartR51,stageEndR51,stageRecordR51} from './stage-timing-r51.mjs';
import {claimDrainTargetsR56,ordinaryClaimDrainTargetsR56} from './claim-drain-r56.mjs';
import {claimActorJoinR56} from './r56-options.mjs';
import {potionJoinTargetsR56} from './potion-join-r56.mjs';
import {soloCollectJoinR85} from './collect-join-r85.mjs';
import {actorRejection} from './actor-rejection.mjs';
import {beginActionMovementR88,stopDeathMovementR86,rebaseDeathCheckpointR86} from './death-movement-r86.mjs';
import {ordinaryRuneRewardR87} from './rune-reward-scope-r87.mjs';
import {memoryCombatR53 as memoryCombatForRuneR88} from './r53-options.mjs';
// R88: a Rune V2 potion drains only the journals of the exact ordinary species
// it is engaged with (as ordinary maps already do), not every monster on the
// channel. Boss/stone/summons and any other footprint keep the full drain.
const runeScopeR88=process.env.CORE511_R88_RUNE_MOVEMENT!=='0';
const runePotionPlayerR88=p=>Boolean(runeScopeR88&&memoryCombatForRuneR88&&p&&p.area==='rune_v2'&&!p.arena_match_id&&!p.instance_id&&!p.instanceId);

// Public-map ground pickup reads the owned drop and actor/party inventories; it
// neither settles retaliation nor reads/writes monster contribution journals.
// Keep the actor drains and economic ACK below, but do not wait for unrelated
// combat on the channel for every item. Event/dragon catalog collectors also
// only grant owned inventory and delete the drop/payload. Adventure/arena and
// unfamiliar scopes retain the full drain. The writer revalidates drop/party.
const groundCollectAreasR79=new Set(['forest','frozen','black','ancient','sanctum','bazaar','event','dragon','sinsi','rune','rune_v2']);
export function collectWithoutCombatDrainR79({id,input,footprint,ids,kernel}){
 const scope=footprint.localScope;
 return memoryCombatR53&&process.env.CORE511_COLLECT_SCOPED_DRAIN_R79!=='0'&&input.action==='collect'&&scope?.kind==='collect'&&scope.owner===id&&scope.target===input.targetId&&scope.absent===false&&typeof scope.monster==='string'&&scope.monster.length>0&&ids.every(actor=>{const p=kernel.state.read('players',actor);return p&&groundCollectAreasR79.has(p.area)&&p.hp>0&&!p.arena_match_id&&!p.arenaMatchId&&!p.instance_id&&!p.instanceId;})&&footprint.resources.length>0&&footprint.resources.every(key=>key.startsWith('player:')&&ids.includes(key.slice(7)));
}

// Inventory/currency/respawn actions always use the ordered durable lane. The
// footprint comes from the server's cached party/drop/mode state, never from a
// client-supplied resource list. Unrelated actors keep running during the ACK.
export class ActionLoop {
 constructor({lanes,checkpoints,combatCheckpoints,submit,footprint,frameFor,committed,publish}){
  for(const fn of [submit,footprint,frameFor,committed,publish])demand(typeof fn==='function','action_loop_dependencies');Object.assign(this,{lanes,checkpoints,combatCheckpoints,submit,footprint,frameFor,committed,publish});this.incarnation=randomUUID();this.serial=0;
 }
 act({id,input,now,receivedAtMs=now,inputOrder,kernel}){
  demand(NATIVE_ACTIONS.includes(input.action),'action_loop_kind');
  // Capture before any drain; recheck immediately before handing work to the
  // writer. Reconnects never rebind an already accepted input to a new socket.
  const lootAction=input.action.startsWith('adventure_loot_')||isZumrutActionR93(input.action),lootConnection=lootAction?(this.connectionFor?.(id,input)??null):null;
  const footprint=this.footprint(id,input,receivedAtMs),ids=[...new Set([id,...footprint.players])];demand(ids.length<=25,'action_loop_footprint');
  const priorityR57={kernel,id,input,inputOrder,ids,resources:footprint.resources};
  if(olderGroupWaitingR57(priorityR57)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  if(ids.some(actor=>!kernel.players.has(actor)||kernel.players.get(actor).barrier||kernel.players.get(actor).suspended)){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  // Native potion/retaliation writes only this player's row and encounter.
  // Concurrent potions may share READ ownership of stable local monsters;
  // every attack/respawn/control mutation still requires an exclusive lease.
  // Unknown outcomes fence both readers and writers until reconciliation.
  const lease=this.lanes.acquire([...ids.map(actor=>'player:'+actor),...footprint.resources],this.incarnation,{readMonsters:input.action==='use_potion'||footprint.localScope?.completedR56===true});if(!lease){rememberDeferredGroupR57(priorityR57);return DEFER_INPUT;}
  const key='action:'+this.incarnation+':'+(++this.serial),seed=OperationRandom.seed();
  const joinedTargetsR56=(claimActorJoinR56?ordinaryClaimDrainTargetsR56({input,footprint,ids,kernel}):null)??potionJoinTargetsR56({input,footprint,ids,kernel})??(ids.length===1&&soloCollectJoinR85({id,input,scope:footprint.localScope,resources:footprint.resources,sharedLease:footprint.sharedLease,player:kernel.state.read('players',id),channel:kernel.state.channel})?[]:null);
  const actorsR56=[];
  const cancelR56=()=>{for(const t of actorsR56)if(t.entry.joinedR53===t)this.checkpoints.finishR53(t);actorsR56.length=0;};
  const labelR56=input.action==='claim_rewards'?'claim':input.action==='use_potion'?'potion':input.action==='collect'?'collect':'other';
  stageRecordR51('action.'+labelR56+'.inputWait',Math.max(0,now-receivedAtMs));
  let motionR88=null;
  try{kernel.durableGroup(ids,async()=>{
   const totalR56=stageStartR51();let phaseR56=totalR56;
   try{
    if(joinedTargetsR56){
     await Promise.all(ids.map(actor=>this.checkpoints.entries.get(actor)?.pending));
     for(const actor of ids)actorsR56.push(this.checkpoints.captureR53(actor));
     if(Buffer.byteLength(JSON.stringify(actorsR56.map(t=>({actor:t.id,epoch:t.entry.epoch,payload:t.payload}))))>224*1024){cancelR56();await Promise.all(ids.map(actor=>this.checkpoints.drain(actor)));}
    }else await Promise.all(ids.map(actor=>this.checkpoints.drain(actor)));
    stageEndR51('action.'+labelR56+'.actorDrain',phaseR56);phaseR56=stageStartR51();
    const scoped=scopedPotionCheckpointR531&&input.action==='use_potion'&&ids.length===1&&(normalPlayerR53(kernel.state.read('players',id))||runePotionPlayerR88(kernel.state.read('players',id)))&&footprint.resources.every(key=>key.startsWith('monster:')&&(normalMonsterR53(kernel.state.read('monsters',key.slice(8)))||runeScopeR88&&ordinaryRuneRewardR87(kernel.state.read('monsters',key.slice(8)))));
    const claimTargetsR56=joinedTargetsR56??claimDrainTargetsR56({input,footprint,ids,kernel});
    const castleTravel=castleEnabled()&&ids.length===1&&footprint.resources.every(key=>key==='player:'+id)&&['respawn','castle_enter_r59','castle_leave_r59'].includes(input.action)&&[CASTLE_AREA,'bazaar'].includes(kernel.state.read('players',id)?.area);
    if(castleTravel||zumrutWithoutCombatDrainR93({id,input,footprint,ids,kernel})||collectWithoutCombatDrainR79({id,input,footprint,ids,kernel})){/* No monster/history settlement. Periodic/exit journal remains active. */}else if(claimTargetsR56)await this.combatCheckpoints.drainTargetsR531(claimTargetsR56);
    else if(scoped)await this.combatCheckpoints.drainTargetsR531(footprint.resources.map(key=>key.slice(8)));else await this.combatCheckpoints.drain();this.lanes.assert(lease);
    stageEndR51('action.'+labelR56+'.combatDrain',phaseR56);phaseR56=stageStartR51();
    const expected=this.frameFor(id,input,now);
    // R88: a potion only changes HP/charges. Keep its actors walking while the
    // writer commits; the expected image above is captured first.
    if(input.action==='use_potion')motionR88=beginActionMovementR88(this,{kernel,ids,lease});
    const autoIpR102=['auto_start_r102','auto_tick_r102','auto_stop_r102'].includes(input.action)?await this.autoIpClaimR102?.(id,input):null;
    const ack=await this.submit({actor:id,key,kind:'native_action',payload:{...(autoIpR102?{autoIpR102}:{}),...(actorsR56.length?{claimActorsR56:actorsR56.map(t=>({actor:t.id,epoch:t.entry.epoch,payload:t.payload}))}:{}),...(footprint.localScope?{localScope:footprint.localScope}:{}),...(lootAction?{lootConnection:lootConnection&&this.connectionFor?.(id,input)===lootConnection?lootConnection:null}:{}),input,nowMs:now,receivedAtMs,seed,expected,resources:lease.keys}});
    stageEndR51('action.'+labelR56+'.writerAck',phaseR56);phaseR56=stageStartR51();
    stopDeathMovementR86(motionR88);
    demand(ack.key===key&&ack.result,'action_ack_mismatch');this.lanes.assert(lease);
    if(footprint.localScope?.completedR56&&ack.result.result?.status===200)stageRecordR51('action.claim.completedScope',0);
    if(actorsR56.length){
     if(ack.result.r56ClaimRejected){demand(ids.includes(ack.result.r56ClaimRejected)&&ack.result.result?.status===409&&ack.result.result.body?.not_executed===true,'claim_join_rejection');cancelR56();}
     else{demand(Array.isArray(ack.result.claimActorsR56)&&ack.result.claimActorsR56.length===actorsR56.length,'claim_join_ack');for(const t of actorsR56){const saved=ack.result.claimActorsR56.find(row=>row.id===t.id);demand(saved,'claim_join_ack');this.checkpoints.finishR53(t,saved);}actorsR56.length=0;}
    }
    demand(ack.result.players.every(p=>!kernel.players.has(p.id)||ids.includes(p.id)),'action_unlocked_recipient');const refreshStarted=performance.now();await this.committed(ack.result,{id,input,...(motionR88?{deathMotionR86:motionR88}:{})});if(input.action==='collect')collectTime(ack.result.collectLight?'refreshLightCandidate':'refreshFull',performance.now()-refreshStarted);
    stageEndR51('action.'+labelR56+'.refresh',phaseR56);
    for(const player of ack.result.players)if(kernel.players.has(player.id)&&!rebaseDeathCheckpointR86(motionR88,this.checkpoints,player))this.checkpoints.hydrateCommitted(player);
    for(const [actor,entry]of ack.result.encounters)if(kernel.players.has(actor))this.checkpoints.encounters?.hydrateCommitted(actor,entry);
    for(const event of ack.result.events)this.publish(...event);this.lanes.release(lease);return ack;
   }catch(error){if(actorRejection(error))cancelR56();if(lease.state==='held')this.lanes.reject(lease,error);if(footprint.localScope&&error?.code==='local_claim_requires_shared')this.localRejected?.(footprint.localScope.targets,id);if(footprint.localScope&&error?.code==='local_collect_requires_shared')this.localCollectRejected?.(id);throw error;}
   finally{stopDeathMovementR86(motionR88);stageEndR51('action.'+labelR56+'.heldTotal',totalR56);}
  },{replyTo:id,emitReceipt:false,ackResult:ack=>({type:'action',...ack.result.result})});}catch(error){if(lease.state==='held')this.lanes.reject(lease,error);throw error;}
  return {type:'action'};
 }
}
