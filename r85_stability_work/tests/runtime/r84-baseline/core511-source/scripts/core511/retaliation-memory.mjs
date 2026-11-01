import {createRetaliationRules} from './generated/retaliation-rules.mjs';
import {pveEntries489} from '../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs';
import {colLabMayAffectMonster} from '../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs';
import {demand} from './contract.mjs';
import {isAdventureArea,adventureArea} from './adventure-maps.mjs';
import {encounterTime} from './encounter-clock.mjs';
import {r40Options} from './r40-options.mjs';
import {retaliationDueQueueR52} from './r52-options.mjs';
import {RetaliationDueQueueR52} from './retaliation-due-queue-r52.mjs';
import {nativeEngagementR53} from './r53-options.mjs';
import {nativeStateR53,updateEngagementR53,removeEngagementR53,createEngagementR53,cloneEngagementR53,dueR53,isEngagementR53} from './engagement-memory-r53.mjs';

const terminal=Symbol('durable-retaliation');
const towerArmCache=process.env.CORE511_TOWER_ARM_CACHE!=='0';
const entries=row=>JSON.parse(row?.attackers489||'{}');
function head(row,attackers){
 const next={...row,attackers489:JSON.stringify(attackers)},ordered=Object.entries(attackers).sort(([a,x],[b,y])=>x.next_hit_at_ms-y.next_hit_at_ms||(a<b?-1:a>b?1:0));
 if(ordered.length){const [id,value]=ordered[0];Object.assign(next,{monster_id:id,spawn_round:value.spawn_round,next_hit_at_ms:value.next_hit_at_ms});}
 return next;
}

// All reads are direct resident object/Map accesses. The mechanically extracted
// native calculation calls this port instead of preparing SQL. Only the exact
// storage predicates and the pve JSON head update are represented here.
export class RetaliationMemory {
 constructor({view,globals,publish=()=>{},playerChanged=()=>{}}){
  demand(view&&typeof view.player==='function'&&typeof view.monster==='function','retaliation_view_missing');
  // Explicitly bind generated combat-services snapshots in a channel. Falling
  // back to ambient native services would reintroduce their per-hit SQL reads.
  demand(globals&&typeof globals==='object','retaliation_services_unbound');
  Object.assign(this,{view,globals,publish,playerChanged});this.metrics={hits:0,clears:0,terminal:0,hotSqlReads:0};
  this.nowMs=0;this.random=Math.random;
  this.rules=createRetaliationRules({random:()=>this.random(),now:()=>this.nowMs,globals,fourChannels:true});
  this.entryCache=new WeakMap();this.armCache=new Map();this.dueQueueR52=retaliationDueQueueR52?new RetaliationDueQueueR52(pveEntries489):null;
 }
 beginBatch(id){
  if(!nativeEngagementR53)return;demand(!this.batch,'retaliation_batch_overlap');
  const view=this.view,batch={id,view,row:null};this.batch=batch;
  this.view=Object.create(view);this.view.player=actor=>actor===id&&batch.row?batch.row:view.player(actor);
  this.view.setPlayer=row=>{demand(row.id===id,'retaliation_batch_actor');batch.row=row;};
 }
 endBatch(){const batch=this.batch;if(!batch)return;this.batch=null;this.view=batch.view;if(batch.row){this.view.setPlayer(batch.row);this.playerChanged(batch.row);}}
 patchPlayer(row,patch){
  if(this.batch?.id===row.id){const next=this.batch.row??{...row};Object.assign(next,patch);return next;}
  return {...row,...patch};
 }
 changedPlayer(row){this.view.setPlayer(row);if(!this.batch)this.playerChanged(row);}
 clear(id,engagement){
  const row=this.view.engagements.get(id);if(!row)return;
  const native=nativeStateR53(row);
  if(native&&!native.legacy){const old=native.map.get(engagement.monster_id);if(old?.spawn_round===engagement.spawn_round&&old?.next_hit_at_ms===engagement.next_hit_at_ms)this.view.setEngagement(id,removeEngagementR53(row,engagement.monster_id));this.metrics.clears++;return;}
  const current=entries(row),old=current[engagement.monster_id];
  if(old?.spawn_round===engagement.spawn_round&&old?.next_hit_at_ms===engagement.next_hit_at_ms){delete current[engagement.monster_id];this.view.setEngagement(id,Object.keys(current).length?head(row,current):null);}
  else if(row.attackers489==='{}')this.view.setEngagement(id,null);
  this.dueQueueR52?.forget(id);this.metrics.clears++;
 }
 hit({playerId,player,monster,engagement,damage,nowMs,nextHitAtMs,nextSkillAt,runeV2DeathPenalty483}){
  const current=this.view.player(playerId),target=this.view.monster(monster.id),row=this.view.engagements.get(playerId),native=nativeStateR53(row),attackers=native&&!native.legacy?null:entries(row),entry=attackers?attackers[monster.id]:native.map.get(monster.id);
  if(!current||current.hp<=0||current.area!==player.area||current.channel!==player.channel||current.realtime_scope_version!==player.realtime_scope_version||!entry||entry.spawn_round!==monster.spawn_round||entry.next_hit_at_ms!==engagement.next_hit_at_ms||engagement.next_hit_at_ms>nowMs||!target||target.hp<=0||target.spawn_round!==monster.spawn_round||target.stun_until_ms>nowMs)return null;
  const hp=Math.max(0,current.hp-damage.amount);
  // Nothing is changed before the caller acquires its ordered durable barrier.
  if(hp===0){this.metrics.terminal++;throw terminal;}
  const next=this.patchPlayer(current,{hp,hp_revision:current.hp_revision+1,respawn_at_ms:0,last_monster_hit_at:nowMs,last_seen:Math.floor(nowMs/1000),combat_lock_until_ms:Math.max(current.combat_lock_until_ms,nowMs+5000)});
  const updated={monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:nextHitAtMs,last_skill_at_ms:nextSkillAt},patch={hit_sequence:row.hit_sequence+1,updated_at_ms:encounterTime(row,nowMs),expires_at_ms:Math.max(row.expires_at_ms,nowMs+8000),last_skill_at_ms:nextSkillAt};
  if(attackers){attackers[monster.id]=updated;this.view.setEngagement(playerId,head({...row,...patch},attackers));this.dueQueueR52?.hit(playerId,row,this.view.engagements.get(playerId),entry,updated);}
  else this.view.setEngagement(playerId,updateEngagementR53(row,updated,patch));
  this.changedPlayer(next);this.metrics.hits++;
  return {hp,max_hp:next.max_hp,hp_revision:next.hp_revision,respawn_at_ms:next.respawn_at_ms,...(runeV2DeathPenalty483?{gems:next.gems}:{})};
 }
 step({playerId,settings,nowMs,engagement,frame,random=Math.random}){
  this.nowMs=nowMs;this.random=random;
  try{return {durable:false,result:this.rules.retaliateMemory(this,playerId,settings,nowMs,engagement,frame)};}
  catch(error){if(error!==terminal)throw error;return {durable:true};}
 }
 settle({playerId,settings,nowMs,frameFor,random=Math.random}){
  this.nowMs=nowMs;this.random=random;let terminalMonster=null;
  this.beginBatch(playerId);
  const port={row:id=>this.view.engagements.get(id),frame:(id,entries)=>frameFor(id,entries,this.view),one:(id,s,time,engagement,frame)=>{terminalMonster=engagement.monster_id;return this.rules.retaliateMemory(this,id,s,time,engagement,frame);}};
  try{return {durable:false,result:this.rules.settleAllMemory(port,playerId,settings,nowMs)};}
  catch(error){if(error!==terminal)throw error;return {durable:true,monsterId:terminalMonster};}
  finally{this.endBatch();}
 }
 arm(player,monster,nowMs){
  const rules=this.rules,live=this.view.player(player.id),target=this.view.monster(monster.id);
  if(isAdventureArea(monster.area)&&this.globals.__colAdventure?.profile(monster)?.stationary)return;
  if(rules.isRuneV2Boss(monster.id)||!colLabMayAffectMonster(player,monster)||player.area==='afk'||monster.is_stone||monster.hp<=0)return;
  if(!live||live.hp<=0||live.area!==player.area||live.channel!==player.channel||live.arena_match_id!==player.arena_match_id||live.realtime_scope_version!==player.realtime_scope_version||!target||target.spawn_round!==monster.spawn_round||target.hp<=0)return;
  let at=nowMs+rules.pveAttackCadenceMs(monster);const old=this.view.engagements.get(player.id);
  // A newly acquired tower attacker may strike on this tick. Native settlement
  // still checks range, stun and scope; subsequent same-round clocks stay put.
  const firstAt=!towerArmCache&&r40Options.towerFirstHit&&adventureArea(monster.area)?.kind==='tower'?nowMs:at;
  const added={monster_id:monster.id,spawn_round:monster.spawn_round,next_hit_at_ms:at,last_skill_at_ms:nowMs};
  let row;
  if(!old){added.next_hit_at_ms=towerArmCache&&r40Options.towerFirstHit&&adventureArea(monster.area)?.kind==='tower'?nowMs:firstAt;const meta={player_id:player.id,...added,expires_at_ms:nowMs+8000,hit_sequence:0,updated_at_ms:nowMs};row=nativeEngagementR53?createEngagementR53(meta,[added]):{...meta,attackers489:JSON.stringify({[monster.id]:added})};}
  else{
   const native=nativeStateR53(old);
   if(native){
    let image=old;if(native.legacy)image=createEngagementR53(old,[{monster_id:old.monster_id,spawn_round:old.spawn_round,next_hit_at_ms:old.next_hit_at_ms,last_skill_at_ms:old.last_skill_at_ms}]);
    const values=nativeStateR53(image).map,existing=values.get(monster.id);
    if(existing?.spawn_round!==monster.spawn_round&&(values.size<32||values.has(monster.id))){at=added.next_hit_at_ms=towerArmCache&&r40Options.towerFirstHit&&adventureArea(monster.area)?.kind==='tower'?nowMs:firstAt;image=updateEngagementR53(image,added,{},false);}
    else if(!isEngagementR53(image))image=createEngagementR53(image,[...values.values()]);
    const prior=this.view.monster(old.monster_id),keep=old.expires_at_ms>=nowMs&&prior?.spawn_round===old.spawn_round&&prior.hp>0;
    row=cloneEngagementR53(image,{...(keep?{next_hit_at_ms:Math.min(old.next_hit_at_ms,at),expires_at_ms:Math.max(old.expires_at_ms,nowMs+8000)}:{...added,expires_at_ms:nowMs+8000}),updated_at_ms:encounterTime(old,nowMs)});
   }else{
   let cached=old.attackers489==='{}'?null:this.armCache.get(old.attackers489);
   if(!cached&&old.attackers489!=='{}'){
    const parsed=entries(old);cached={parsed,text:JSON.stringify(parsed)};this.armCache.set(old.attackers489,cached);if(this.armCache.size>64)this.armCache.delete(this.armCache.keys().next().value);
   }
   // Cached JSON is read only. Only a real new/changed spawn gets a fresh
   // mutable parse, retaining native32-capacity and same-round deadlines.
   let attackersText;
   if(cached?.parsed[monster.id]?.spawn_round===monster.spawn_round)attackersText=cached.text;
   else{
    const attackers=old.attackers489==='{}'?{[old.monster_id]:{monster_id:old.monster_id,spawn_round:old.spawn_round,next_hit_at_ms:old.next_hit_at_ms,last_skill_at_ms:old.last_skill_at_ms}}:entries(old);
    if(attackers[monster.id]?.spawn_round!==monster.spawn_round&&(Object.keys(attackers).length<32||Object.hasOwn(attackers,monster.id))){at=added.next_hit_at_ms=towerArmCache&&r40Options.towerFirstHit&&adventureArea(monster.area)?.kind==='tower'?nowMs:firstAt;attackers[monster.id]=added;}
    attackersText=JSON.stringify(attackers);
   }
   const prior=this.view.monster(old.monster_id),keep=old.expires_at_ms>=nowMs&&prior?.spawn_round===old.spawn_round&&prior.hp>0;
   row={...old,...(keep?{next_hit_at_ms:Math.min(old.next_hit_at_ms,at),expires_at_ms:Math.max(old.expires_at_ms,nowMs+8000)}:{...added,expires_at_ms:nowMs+8000}),attackers489:attackersText,updated_at_ms:encounterTime(old,nowMs)};
   }
  }
  this.view.setEngagement(player.id,row);const lock=Math.max(live.combat_lock_until_ms,nowMs+5000);if(!Object.is(lock,live.combat_lock_until_ms))this.changedPlayer(this.patchPlayer(live,{combat_lock_until_ms:lock}));
 }
 due(playerId,nowMs){
  if(nativeEngagementR53)return dueR53(this.view.engagements.get(playerId),nowMs);
  if(this.dueQueueR52)return this.dueQueueR52.due(playerId,this.view.engagements.get(playerId),nowMs);
  const row=this.view.engagements.get(playerId);if(!row||row.next_hit_at_ms>nowMs)return [];
  let list=Object.isFrozen(row)?this.entryCache.get(row):null;
  if(!list){list=pveEntries489(row);if(Object.isFrozen(row))this.entryCache.set(row,list);}
  return list.filter(e=>e.next_hit_at_ms<=nowMs);
 }
 forgetR52(id){this.dueQueueR52?.forget(id);}
}
