import {castleEnabled,CASTLE_AREA} from './castle-model-r59.mjs';
import {isMistArea} from './adventure-maps.mjs';
import {createAttackRules} from './generated/attack-rules.mjs';
import {CombatControls} from './combat-controls.mjs';
import {demand} from './contract.mjs';

const terminal=Symbol('pvp-durable'),busy=Symbol('pvp-busy');
const pick=(p,keys)=>p&&Object.fromEntries(keys.map(k=>[k,p[k]]));
const same=(a,b)=>a&&b&&a.area===b.area&&a.channel===b.channel&&a.arena_match_id===b.arena_match_id;
const safe=p=>p.area==='war'&&((p.x-1800)**2/202500+(p.y-996)**2/116964)<=1;
const distance2=(a,b)=>(a.x-b.x)**2+(a.y-b.y)**2;
const response={json:(body,{status=200,headers}={})=>({body,status,headers,json:()=>body})};

// Bounded Map storage for the mechanically extracted native PvP branch. A
// private overlay prevents a later lethal AoE victim from leaking earlier hits.
export class PvpMemory{
 constructor({view,globals,players,frameFor,targetFrameFor=frameFor,party,arena,team,dragon,pet,changedArenaLife,blocked,cycle,changed=()=>{},mixedPorts={}}){
  for(const fn of [players,frameFor,targetFrameFor,party,arena,team,dragon,pet,changedArenaLife,blocked,cycle])demand(typeof fn==='function','pvp_dependencies_unbound');
  Object.assign(this,{view,globals,players,frameFor,targetFrameFor,party,arena,team,dragon,pet,changedArenaLife,blocked,cycle,changed});this.running=false;
  this.controls=new CombatControls({player:id=>this.player(id),setPlayer:p=>this.setPlayer(p),monster:()=>{throw Error('pvp_monster_control');},setMonster:()=>{throw Error('pvp_monster_control');}});
  const record=(...a)=>{this.t.events.push(a);};
  this.rules=createAttackRules({globals,random:()=>this.t.random(),uuid:()=>this.t.uuid(),now:()=>this.t.nowMs,fourChannels:true,response,ports:{
   selectMixedMonsters473:(...args)=>{demand(this.nativeMixed,'mixed_combat_unbound');return this.nativeMixed.selectMixedMonsters473(...args);},runMixedBlack473:(...args)=>{demand(this.nativeMixed,'mixed_combat_unbound');return this.nativeMixed.runMixedBlack473(...args);},
   ...mixedPorts,publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,deliverRealtime:v=>v,
   releasePvpCommit:()=>{},pvpContinuity:c=>this.rules.memoryContinuity(this,this.t.original,c)
  }});
 }
 player(id){return this.t.players.get(id)??this.view.player(id);}
 requireDurable(boundary){this.t.boundary=boundary;throw terminal;}
 defer(){throw busy;}
 setPlayer(p){if(this.blocked(p.id))throw busy;this.t.players.set(p.id,Object.freeze({...p}));}
 sameParty(a,b){if(this.player(a)?.area===CASTLE_AREA){const guild=this.globals.__colCastle?.guild(a);return Boolean(guild&&guild===this.globals.__colCastle?.guild(b));}const group=this.party(a);return Boolean(group&&group===this.party(b));}
 control(id,target){const p=this.player(id);return p?{stun_until_ms:p.stun_until_ms,root_until_ms:p.root_until_ms,same_party497:Number(this.sameParty(id,target))}:null;}
 frame(id){const frame=this.frameFor(id);return frame?{...frame,...this.player(id)}:null;}
 // Native attacker projections contain weapon power; defender projections
 // contain equipped armor power. Preserve that distinction for AoE/retries.
 targetFrame(id){const frame=this.targetFrameFor(id);return frame?{...frame,...this.player(id)}:null;}
 snapshot(payload,id){const player=this.frame(id),candidate=this.targetFrame(payload.targetPlayerId);const target=candidate&&player&&candidate.hp>0&&candidate.last_seen>=Math.floor(this.t.nowMs/1000)-30&&same(player,candidate)&&(player.area!=='arena'||candidate.arena_match_id)?candidate:null;
  const match=player?.area==='arena'?this.arena(player.arena_match_id):null;
  return {player,settings:this.t.settings,preloadedPvpTarget:target,preloadedPvpArena:match?{...match,attacker_team:this.team(match.id,id),target_team:this.team(match.id,payload.targetPlayerId)}:null,pvpTargetId:payload.targetPlayerId};
 }
 targets(player,center,now,match){
  const actor=this.player(player.id);const rows=this.players(player).map(p=>this.player(p.id)).filter(p=>p.id!==player.id&&p.hp>0&&p.last_seen>=Math.floor(now/1000)-30&&!this.sameParty(player.id,p.id)&&same(p,player)&&p.loadlab_run_id===actor.loadlab_run_id&&(!p.loadlab_run_id||p.loadlab_team>0&&p.loadlab_team!==actor.loadlab_team)&&distance2(p,center)<=90000&&!safe(p)&&(p.area!=='arena'||this.team(match,player.id)!=null&&this.team(match,p.id)!=null&&this.team(match,p.id)!==this.team(match,player.id))).sort((a,b)=>(a.id===center.id?0:1)-(b.id===center.id?0:1)||distance2(a,center)-distance2(b,center)||(a.id<b.id?-1:a.id>b.id?1:0)).slice(0,29);
  this.t.targets=rows.map(p=>p.id);for(const p of rows)if(this.blocked(p.id))throw busy;
  return rows.map(p=>({...this.targetFrame(p.id),defender_dragon:Number(Boolean(this.dragon(p.id)))}));
 }
 requireNonlethal(target,damage){if(this.blocked(target.id))throw busy;if(target.hp<=damage){this.t.boundary={reason:'pvp_death',players:[...new Set([this.t.actor,target.id,...this.t.targets])]};throw terminal;}return false;}
 predictNonlethal(target,damage){
  // An unavailable castle cooldown cannot execute this hit. Let the unchanged
  // native reservation branch reject it in memory before taking death lanes.
  const actor=this.player(this.t.actor),reservation=this.t.reservation;
  if(castleEnabled()&&actor?.area===CASTLE_AREA&&(this.t.areaAttack?actor.attack_three_at>this.t.receivedAtMs:reservation&&actor[reservation.attackColumn]>reservation.cooldownAtMs+reservation.cooldownGraceMs))return false;
  if(this.t.areaAttack&&(isMistArea(this.player(this.t.actor)?.area)||['black','rune_v2'].includes(this.player(this.t.actor)?.area))){if(this.blocked(target.id))throw busy;return target.hp<=damage;}return this.requireNonlethal(target,damage);}
 reservePlan(data){this.t.reservation=data;return {kind:'reserve',...data};}
 reserve(data,apply=true){const {player,attackColumn,cooldownAtMs,cooldownMs,cooldownGraceMs,nowMs}=data,p=this.player(player.id);
  if(!p||p.hp<=0||p.stun_until_ms>nowMs||p[attackColumn]>cooldownAtMs+cooldownGraceMs||!same(p,player)||p.realtime_scope_version!==player.realtime_scope_version)return null;
  const until=Math.max(p[attackColumn],cooldownAtMs)+cooldownMs;if(apply)this.setPlayer({...p,[attackColumn]:until,combat_lock_until_ms:Math.max(p.combat_lock_until_ms,nowMs+5000)});return {reserved_until:until};
 }
 areaPlan(data){return {kind:'area',...data};}
 damagePlan(plans,context){return {kind:'damage',plans,...context};}
 eventsPlan(plans,context){return {kind:'events',plans,...context};}
 arenaValid(p,target,now){const m=this.arena(p.arena_match_id);return m&&['active','countdown'].includes(m.status)&&m.starts_at_ms<=now&&(!m.id.startsWith('guild-')||m.starts_at_ms+600000>this.t.nowMs)&&this.team(m.id,p.id)!=null&&this.team(m.id,target.id)!=null&&this.team(m.id,p.id)!==this.team(m.id,target.id);}
 validTarget(p,target,now){return p&&target&&p.hp>0&&target.hp>0&&(p.area!==CASTLE_AREA||this.globals.__colCastle?.mayDamage(p,target,now))&&same(p,target)&&!this.sameParty(p.id,target.id)&&!safe(p)&&!safe(target)&&(p.area!=='arena'||this.arenaValid(p,target,now));}
 guardedBatch(guard,statements){
  const p=this.player(guard.player.id),center=this.player(guard.target.id),reservation={...guard,attackColumn:'attack_three_at',cooldownGraceMs:0};
  if(!this.reserve(reservation,false)||this.cycle()!==guard.player.world_cycle||safe(p)||!center||distance2(p,center)>(guard.attackRange+95)**2)return {guard:{results:[]},results:[]};
  for(const plan of guard.plans){const v=this.player(plan.target.id),prior=plan.target;if(!this.validTarget(p,v,guard.nowMs)||v.hp!==prior.hp||v.hp_revision!==prior.hp_revision||v.realtime_scope_version!==prior.realtime_scope_version||Math.max(v.last_seen,Math.trunc(v.movement_checked_at_ms/1000),Math.trunc(v.last_monster_hit_at/1000))<Math.floor(guard.nowMs/1000)-30||distance2(v,center)>90000)return {guard:{results:[]},results:[]};}
  const accepted=this.reserve(reservation);return {guard:{results:[accepted]},results:this.batch(statements)};
 }
 batch(statements){let lastChanges=0;return statements.map(s=>{
  if(s.kind==='reserve'){const row=this.reserve(s);lastChanges=Number(Boolean(row));return {results:row?[row]:[]};}
  if(s.kind==='damage'){
   const result=[],actor=this.player(s.player.id),area=s.plans.length>1||this.t.areaAttack;
   for(const plan of s.plans){const p=this.player(plan.target.id);if(!this.validTarget(actor,p,s.nowMs)||p.hp_revision!==plan.target.hp_revision||p.realtime_scope_version!==plan.target.realtime_scope_version||actor.realtime_scope_version!==s.player.realtime_scope_version||!area&&!lastChanges)continue;
    this.requireNonlethal(p,plan.totalDamage);const next={...p,hp:p.hp-plan.totalDamage,hp_revision:p.hp_revision+1,respawn_at_ms:0,last_monster_hit_at:s.nowMs,combat_lock_until_ms:Math.max(p.combat_lock_until_ms,s.nowMs+5000)};this.setPlayer(next);result.push({...pick(next,['hp','hp_revision','respawn_at_ms','gems']),...(area?{id:p.id}:{})});
   }lastChanges=result.length;return {results:result};
  }
  if(s.kind==='events'){for(const plan of s.plans){const p=this.player(plan.target.id);if(p?.hp_revision===plan.target.hp_revision+1&&same(p,s.player)&&p.realtime_scope_version===plan.target.realtime_scope_version){this.t.combatEvents.push({player_id:s.player.id,target_id:p.id,role:s.player.role,ability:s.ability,created_at:s.nowMs});}}return {results:[]};}
  throw Error('pvp_invalid_memory_statement');
 });}
 undoCooldown(id,column,until,cooldown){const p=this.player(id);if(p?.[column]===until)this.setPlayer({...p,[column]:until-cooldown});}
 guardian(...args){return this.rules.guardianMemory(this.controls,...args);}
 trap(...args){return this.rules.trapMemory(this.controls,...args);}
 restoreLife(id,amount){if(!Number.isSafeInteger(amount)||amount<=0)return null;const p=this.player(id);if(!p||p.hp<=0||p.hp>=p.max_hp)return null;const next={...p,hp:Math.min(p.max_hp,p.hp+amount),hp_revision:p.hp_revision+1};this.setPlayer(next);return {...pick(next,['hp','hp_revision','max_hp']),healed:next.hp-p.hp};}
 requiresWriter(){throw Error('pvp_terminal_invariant');}
 plan(context,options={}){return this.step(context,{...options,commit:false});}
 commit(proposal,options={}){if(this.commitProposal)return this.commitProposal(proposal,options);for(const row of proposal.changes.players)this.view.setPlayer(row);this.changed(proposal.changes);return proposal;}
 step(context,{random=Math.random,uuid=()=>crypto.randomUUID(),nowMs=Date.now(),commit=true}={}){
  demand(!this.running,'pvp_overlap');this.running=true;this.t={random,uuid,nowMs,receivedAtMs:context.requestReceivedAtMs,actor:context.playerId,settings:context.actionSnapshot.settings,original:context.originalSnapshot??context.actionSnapshot,areaAttack:Number(context.payload.ability)===2&&['avci','arkanist'].includes(context.actionSnapshot.player?.role),targets:[],players:new Map(),events:[],combatEvents:[]};
  try{if(this.blocked(context.playerId))throw busy;const result=this.rules.memoryPvp(this,context);demand(!result?.then,'async_memory_pvp');const changes={...this.mixedChanges?.(this.t),players:[...this.t.players.values()],combatEvents:this.t.combatEvents},proposal={durable:false,result,events:this.t.events,changes};this.rememberProposal?.(proposal,nowMs);if(commit)this.commit(proposal);return proposal;}
  catch(error){if(error===busy||error?.code==='combat_resource_pending')return {deferred:true,...(castleEnabled()&&context.actionSnapshot.player?.area===CASTLE_AREA?{players:[...new Set([context.playerId,context.payload.targetPlayerId,...this.t.targets])]}:{})};if(error===terminal)return {durable:true,boundary:this.t.boundary};throw error;}
  finally{this.t=null;this.running=false;}
 }
}
