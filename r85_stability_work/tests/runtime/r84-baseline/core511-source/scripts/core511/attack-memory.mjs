import {EncounterChanges} from './encounter-checkpoint.mjs';
import {createAttackRules} from './generated/attack-rules.mjs';
import {CombatControls} from './combat-controls.mjs';
import {RetaliationMemory} from './retaliation-memory.mjs';
import {demand} from './contract.mjs';
import {immutableRow} from './immutable-row.mjs';
import {claimHistoryR51} from './r51-options.mjs';
import {ClaimHistoryR51} from './claim-history-r51.mjs';
import {createMixedParticipantMapR52} from './mixed-participants-r52.mjs';
import {rewardAsyncReplyR54} from './r54-options.mjs';
import {previewDeathR54} from './reward-reply-r54.mjs';
import {resourceFairnessR61,captureResourceWaitR61,sealResourceWaitR61} from './attack-resource-fairness-r61.mjs';

const response={json:(body,{status=200}={})=>({body,status})};
const durable=Symbol('attack-requires-durable-owner');
const deferred=Symbol('attack-resource-busy');
const keyOf=(monster,player)=>JSON.stringify([monster.id,monster.spawn_round,player]);
const frozen=immutableRow;
const fields=(row,names)=>{const value={};for(const k of names)value[k]=row[k];return value;};

// An attack's transient writes are private until every native rule completes.
// The callbacks publish dirty versions only on success. A terminal boundary
// discards all proposed damage, participant credits, controls and messages.
export class AttackMemory {
 constructor({view,globals,retaliate,assertMonsterOwner,rankingEligible,afk,monsters,blocked=()=>false,changed=()=>{}}){
  for(const fn of [retaliate,assertMonsterOwner,rankingEligible,afk,monsters])demand(typeof fn==='function','attack_dependencies_unbound');
  demand(globals&&view,'attack_state_unbound');Object.assign(this,{view,globals,retaliate,assertMonsterOwner,rankingEligible,afk,monsters,blocked,changed});
  this.participants=createMixedParticipantMapR52();this.bossParticipants=new Map();this.combatEvents=[];this.proposals=new WeakMap();this.running=false;this.metrics={attacks:0,durable:0,hotSqlReads:0};
  this.claimHistory=claimHistoryR51?new ClaimHistoryR51():null;
  // These maps never leave a synchronous native operation. Escaping proposal
  // arrays/events retain their own storage; only private map containers recycle.
  this.scratch={nowMs:0,random:null,uuid:null,players:new Map(),monsters:new Map(),engagements:new EncounterChanges(id=>this.view.engagements.get(id)),participants:new Map(),bossParticipants:new Map(),combatEvents:null,events:null,boundary:null};
  const tx=this;
  this.overlay={player:id=>tx.player(id),monster:id=>tx.monster(id),setPlayer:row=>tx.setPlayer(row),setMonster:row=>tx.setMonster(row),setEngagement:(id,row)=>tx.t.engagements.set(id,frozen(row)),get engagements(){return {get:id=>tx.t.engagements.has(id)?tx.t.engagements.get(id):view.engagements.get(id)};}};
  this.encounters=new RetaliationMemory({view:this.overlay,globals});
  this.controls=new CombatControls(this.overlay);
  const record=(...args)=>{this.t.events.push(args);return undefined;};
  this.rules=createAttackRules({random:()=>this.t.random(),uuid:()=>this.t.uuid(),now:()=>this.t.nowMs,globals,fourChannels:true,response,ports:{
   publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,deliverRealtime:value=>value,releasePvpCommit:()=>{},
   // Mixed PvP is a separate action adapter; discovery must be bound. Until
   // that adapter is installed the path is explicitly unavailable, not ignored.
   prepareMixedPlayers473:(...args)=>{demand(typeof this.mixedPlayers==='function','mixed_combat_unbound');return this.mixedPlayers(...args);},
   selectMixedMonsters473:(...args)=>{demand(typeof this.mixedMonsters==='function','mixed_combat_unbound');return this.mixedMonsters(...args);},
   runMixedBlack473:(...args)=>{demand(typeof this.mixedAttack==='function','mixed_combat_unbound');return this.mixedAttack(...args);}
  }});
 }
 player(id){return this.t.players.get(id)??this.view.player(id);}
 requireDurable(boundary){this.t.boundary=boundary;throw durable;}
 defer(){throw deferred;}
 deferMonsterResourcesR61(plans){if(resourceFairnessR61)this.t.resourceWaitR61=captureResourceWaitR61(this.t.contextR61,plans,this.view);throw deferred;}
 monster(id){return this.t.monsters.get(id)??this.view.monster(id);}
 setPlayer(row){this.t.players.set(row.id,frozen(row));}
 setMonster(row){demand(this.assertMonsterOwner(row)===true,'attack_monster_owner_fenced');this.t.monsters.set(row.id,frozen(row));}
 control(id){const p=this.player(id);return p?fields(p,['stun_until_ms','root_until_ms']):null;}
 currentMonster(id){const p=this.monster(id);return p?fields(p,['hp','spawn_round']):null;}
 recentAttacks(id,since){return [...this.combatEvents,...this.t.combatEvents].filter(e=>e.player_id===id&&e.created_at>=since).map(e=>({target_id:e.target_id}));}
 reservePreview({playerId,player,attackColumn,cooldownMs,cooldownAtMs,cooldownGraceMs,nowMs}){
  const current=this.player(playerId);
  if(!current||current.hp<=0||current.stun_until_ms>nowMs||current[attackColumn]>cooldownAtMs+cooldownGraceMs||current.area!==player.area||current.channel!==player.channel||current.arena_match_id!==player.arena_match_id||current.realtime_scope_version!==player.realtime_scope_version)return null;
  return {reserved_until:Math.max(current[attackColumn],cooldownAtMs)+cooldownMs};
 }
 hitPlan(plan){return {...plan,hitStatements:[null,null],beforeHealthIndex:0,healthResultIndex:1,xpResultIndex:-1};}
 commitHits(guard,plans){
  const accepted=this.reservePreview(guard);if(!accepted)return {guard:{results:[]},results:[]};
  let terminalR54=null;const previewAllowedR54=rewardAsyncReplyR54&&plans.length<=512&&plans.every(p=>['forest','frozen','ancient'].includes(p.target.area)&&!p.target.is_boss&&!p.target.is_stone&&p.target.channel>0);
  // Acquire/check every target before any part of a multi-target attack changes.
  for(const plan of plans){
   const current=this.monster(plan.target.id);if(!current||current.hp<=0||current.spawn_round!==plan.target.spawn_round)continue;
   demand(this.assertMonsterOwner(current)===true,'attack_monster_owner_fenced');
   if(this.blocked(current))this.deferMonsterResourcesR61(plans);
   const stage=current.is_stone?(current.hp-plan.rolled<=0?3:current.hp-plan.rolled<=current.max_hp/2?Math.max(current.wave_stage,2):Math.max(current.wave_stage,1)):current.wave_stage;
   if(current.hp<=plan.rolled||stage>current.wave_stage){this.t.boundary={reason:current.hp<=plan.rolled?'defeat':'stone_wave',targets:plans.map(p=>p.target.id)};if(!previewAllowedR54)throw durable;terminalR54??=this.t.boundary;}
  }
  if(terminalR54){this.t.boundary=terminalR54;if(terminalR54.reason==='defeat'){const reply=previewDeathR54(plans,id=>this.monster(id),this.t.contextR54,accepted,guard.nowMs);if(reply)this.t.boundary.replyR54=reply;}throw durable;}
  const player=this.player(guard.playerId);this.setPlayer({...player,[guard.attackColumn]:accepted.reserved_until,combat_lock_until_ms:Math.max(player.combat_lock_until_ms,guard.nowMs+5000)});
  const results=[];
  for(const plan of plans){
   const {target,rolled,attackingPlayer,monster,ability,nowMs,now,targetsCount}=plan,current=this.monster(target.id);
   if(plan.targetIndex===0)this.t.combatEvents.push({player_id:player.id,target_id:monster.id,role:player.role,ability,created_at:nowMs});
   if(!current||current.hp<=0||current.spawn_round!==target.spawn_round){results.push({results:[]},{results:[]});continue;}
   const key=keyOf(current,player.id),prior=this.t.participants.get(key)??this.participants.get(key);
   const ranked=/^stone-boss-black-c[1-4]$/.test(current.id)||current.id==='dragon-world-1'||/^rune-v2-boss-c[1-4]-1$/.test(current.id);
   const eligible=ranked?this.rankingEligible(this.player(player.id),current):false;
   const nextParticipant={monster_id:current.id,spawn_round:current.spawn_round,player_id:player.id,created_at:now,stone_damage476:(prior?.stone_damage476??0)+(eligible?Math.min(current.hp,rolled):0),stone_first_hit_at_ms476:prior?.stone_first_hit_at_ms476>0?prior.stone_first_hit_at_ms476:eligible?nowMs:0};
   this.t.participants.set(key,frozen(nextParticipant));
   if(current.is_boss){const bossKey=JSON.stringify([current.spawn_round,player.id]),previous=this.t.bossParticipants.get(bossKey)??this.bossParticipants.get(bossKey);this.t.bossParticipants.set(bossKey,frozen({boss_round:current.spawn_round,player_id:player.id,hit_count:(previous?.hit_count??0)+1,total_damage:(previous?.total_damage??0)+Math.min(current.hp,rolled),created_at:previous?.created_at??now}));}
   const next={...current,hp:Math.max(0,current.hp-rolled),last_damaged_at_ms:nowMs,wave_stage:current.is_stone?(current.hp-rolled<=0?3:current.hp-rolled<=current.max_hp/2?Math.max(current.wave_stage,2):Math.max(current.wave_stage,1)):current.wave_stage};
   this.setMonster(next);results.push({results:[{hp:current.hp}]},{results:[{hp:next.hp,wave_stage:next.wave_stage}]});
   if(targetsCount===1)this.arm(attackingPlayer,target,nowMs);
  }
  return {guard:{results:[accepted]},results};
 }
 arm(player,monster,now){this.encounters.arm(player,monster,now);}
 guardian(...args){return this.rules.guardianMemory(this.controls,...args);}
 trap(...args){return this.rules.trapMemory(this.controls,...args);}
 restoreLife(id,amount){
  if(!Number.isSafeInteger(amount)||amount<=0)return null;const row=this.player(id);if(!row||row.hp<=0||row.hp>=row.max_hp)return null;
  const next={...row,hp:Math.min(row.max_hp,row.hp+amount),hp_revision:row.hp_revision+1};this.setPlayer(next);return {...fields(next,['hp','hp_revision','max_hp']),healed:next.hp-row.hp};
 }
 undoEmptyAttack({playerId,attackColumn,reservedUntilMs,cooldownMs,monster,ability,nowMs}){
  const p=this.player(playerId);if(p?.[attackColumn]===reservedUntilMs)this.setPlayer({...p,[attackColumn]:reservedUntilMs-cooldownMs});
  this.t.combatEvents=this.t.combatEvents.filter(e=>!(e.player_id===playerId&&e.target_id===monster.id&&e.ability===ability&&e.created_at===nowMs));
 }
 forbiddenBatch(){throw Error('attack_unexpected_storage_boundary');}
 clearDeadEncounter(){throw Error('attack_death_requires_writer');}
 stoneWaves(){throw Error('attack_stone_wave_requires_writer');}
 stoneRewards(){throw Error('attack_stone_reward_requires_writer');}
 committed({monsters,participants,bossParticipants,removed=[]}){
  demand(!this.running,'attack_overlap');const ids=new Set([...monsters.map(m=>m.id),...removed]),rounds=new Set(monsters.filter(m=>m.is_boss).map(m=>m.spawn_round));
  const lives=this.claimHistory?new Map(monsters.map(m=>[m.id,m.spawn_round])):null;
  for(const [key,row]of this.participants)if(ids.has(row.monster_id)){if(lives&&lives.get(row.monster_id)!==row.spawn_round)this.claimHistory.remember(row);this.participants.delete(key);}
  for(const [key,row]of this.bossParticipants)if(rounds.has(row.boss_round))this.bossParticipants.delete(key);
  for(const row of participants)this.participants.set(JSON.stringify([row.monster_id,row.spawn_round,row.player_id]),frozen(row));
  for(const row of bossParticipants)this.bossParticipants.set(JSON.stringify([row.boss_round,row.player_id]),frozen(row));
 }
 plan(context,options={}){return this.step(context,{...options,commit:false});}
 remember(proposal,nowMs){this.proposals.set(proposal,{nowMs,players:new Map(proposal.changes.players.map(p=>[p.id,this.view.player(p.id)])),monsters:new Map(proposal.changes.monsters.map(m=>[m.id,this.view.monster(m.id)]))});return proposal;}
 commit(proposal,{sharedIds=new Set()}={}){
  const base=this.proposals.get(proposal);demand(base&&!proposal.durable&&!proposal.deferred,'attack_proposal_fenced');const changes=proposal.changes;
  // The actor stays leased while the shared owner acknowledges. A native WS
  // presence stamp may advance, but no gameplay field may change underneath.
  for(const [id,row]of base.players){const current=this.view.player(id);demand(current&&(current===row&&Object.isFrozen(row)||Object.keys(row).every(k=>k==='last_seen'||Object.is(row[k],current[k]))),'attack_proposal_actor_changed');}
  for(const [id,row]of base.monsters)if(!sharedIds.has(id))demand(this.view.monster(id)===row,'attack_proposal_monster_changed');
  const sharedRounds=new Set([...base.monsters.values()].filter(m=>m?.is_boss&&sharedIds.has(m.id)).map(m=>m.spawn_round));
  const local={...changes,monsters:changes.monsters.filter(m=>!sharedIds.has(m.id)),participants:changes.participants.filter(p=>!sharedIds.has(p.monster_id)),bossParticipants:changes.bossParticipants.filter(p=>!sharedRounds.has(p.boss_round)),combatEvents:changes.combatEvents.filter(e=>!sharedIds.has(e.target_id))};
  for(const row of changes.players){const seen=Math.max(row.last_seen,this.view.player(row.id).last_seen);this.view.setPlayer(Object.is(seen,row.last_seen)?row:{...row,last_seen:seen});}
  for(const row of local.monsters)this.view.setMonster(row);for(const [id,row]of changes.engagements)this.view.setEngagement(id,row);
  for(const row of local.participants)this.participants.set(JSON.stringify([row.monster_id,row.spawn_round,row.player_id]),row);
  for(const row of local.bossParticipants)this.bossParticipants.set(JSON.stringify([row.boss_round,row.player_id]),row);
  this.combatEvents.push(...changes.combatEvents);this.combatEvents=this.combatEvents.filter(e=>e.created_at>=base.nowMs-8000);this.changed(local);this.proposals.delete(proposal);return proposal;
 }
 step(context,{random=Math.random,uuid=()=>crypto.randomUUID(),nowMs=Date.now(),commit=true}={}){
  demand(!this.running,'attack_overlap');this.running=true;
  this.t=this.scratch;Object.assign(this.t,{nowMs,random,uuid,combatEvents:[],events:[],boundary:null,contextR54:rewardAsyncReplyR54?context:null,contextR61:resourceFairnessR61?context:null,resourceWaitR61:null});
  try{
   // The caller gives an immutable equipment/stat frame; native code updates
   // its local HP after retaliation, so never pass a resident object by alias.
   const copy={...context,player:{...context.player}};
   const port=Object.create(this);port.retaliate=(id,settings,now)=>{
    const retaliation=this.retaliate(id,settings,now,this.overlay,{random,publish:(...args)=>this.t.events.push(args)});
    if(retaliation?.durable){this.t.boundary={reason:'retaliation_death',targets:[...new Set([context.payload.targetId,retaliation.monsterId].filter(Boolean))]};throw durable;}
    return retaliation;
   };
   port.monsters=p=>this.monsters(p).map(m=>this.monster(m.id));
   const result=this.rules.memoryAttack(port,copy);demand(!result?.then,'async_attack_result');
   const changes={players:[...this.t.players.values()],monsters:[...this.t.monsters.values()],engagements:this.t.engagements.snapshot(),participants:[...this.t.participants.values()],bossParticipants:[...this.t.bossParticipants.values()],combatEvents:this.t.combatEvents};
   const proposal=this.remember({durable:false,result,events:this.t.events,changes},nowMs);this.metrics.attacks++;if(commit)this.commit(proposal);return proposal;
  }catch(error){if(error===deferred||error?.code==='combat_resource_pending')return sealResourceWaitR61({deferred:true},error===deferred?this.t.resourceWaitR61:null);if(error!==durable)throw error;this.metrics.durable++;return {durable:true,boundary:this.t.boundary};}
  finally{const t=this.t;t.players.clear();t.monsters.clear();t.engagements.clear();t.participants.clear();t.bossParticipants.clear();t.random=t.uuid=t.events=t.combatEvents=t.boundary=t.contextR54=t.contextR61=t.resourceWaitR61=null;this.running=false;this.t=null;}
 }
}
