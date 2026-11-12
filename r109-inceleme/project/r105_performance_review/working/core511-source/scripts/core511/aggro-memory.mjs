import {sameMembersR53} from './engagement-memory-r53.mjs';
import {aggroScopeCacheR51} from './r51-options.mjs';
import {aggroSpatialIndexR52} from './r52-options.mjs';
import {AggroSpatialIndexR52} from './aggro-spatial-index-r52.mjs';
import {NativeAggroRules,pveEntries489} from './generated/aggro-rules.mjs';
import {SpatialGrid} from './spatial-grid.mjs';
import {demand,validChannel} from './contract.mjs';
import {immutableRow} from './immutable-row.mjs';
import {isAdventureArea} from './adventure-maps.mjs';

// Native target selection with a bounded candidate set. This is the selection
// part of AI; native retaliation, damage/death and respawn integration remain
// separate rule adapters. Shared monsters here are read-only replicas.
export class AggroMemory extends NativeAggroRules {
 constructor({channel,cycle,now=Date.now}){
  super();demand(validChannel(channel)&&Number.isSafeInteger(cycle),'invalid_aggro_scope');
  Object.assign(this,{channel,cycle,now});this.players=new Map();this.monsters=new Map();this.engagements=new Map();this.engagedByMonster=new Map();this.activePlayers=new Set();this.grid=new SpatialGrid({trackScopes:aggroScopeCacheR51});this.candidateCache=new Map();
  this.aggroSpatialIndexR52=aggroSpatialIndexR52?new AggroSpatialIndexR52({cycle}):null;
 }
 player(id){return this.players.get(id)??null;}
 monster(id){return this.monsters.get(id)??null;}
 setPlayer(row){
  demand(row?.channel===this.channel,'aggro_player_scope');this.players.set(row.id,immutableRow(row));
  if(row.last_seen>=Math.floor(this.now()/1000)-30)this.activePlayers.add(row.id);else this.activePlayers.delete(row.id);
 }
 removePlayer(id){this.players.delete(id);this.activePlayers.delete(id);this.candidateCache.delete(id);this.setEngagement(id,null);}
 setMonster(row){
  demand(row&&(row.channel===0||row.channel===this.channel),'aggro_monster_scope');const value=immutableRow(row);this.monsters.set(row.id,value);this.grid.upsert({...value,cycle:this.cycle});
  this.aggroSpatialIndexR52?.upsert(value,this.cycle);
 }
 removeMonster(id){this.monsters.delete(id);this.grid.remove(id);this.aggroSpatialIndexR52?.remove(id);}
 setEngagement(id,row){
  const old=this.engagements.get(id),next=row?immutableRow(row):null;
  // The reverse index contains only player IDs. The native parser sees the
  // same attacker JSON and every legacy fallback field, so changed expiry or
  // hit_sequence cannot change its membership. Still publish the new row.
  if(old&&next&&sameMembersR53(old,next)){this.engagements.set(id,next);return;}
  if(old&&next&&old.attackers489===next.attackers489&&old.monster_id===next.monster_id&&old.spawn_round===next.spawn_round&&old.next_hit_at_ms===next.next_hit_at_ms&&old.last_skill_at_ms===next.last_skill_at_ms){this.engagements.set(id,next);return;}
  for(const entry of pveEntries489(this.engagements.get(id))){const ids=this.engagedByMonster.get(entry.monster_id);ids?.delete(id);if(!ids?.size)this.engagedByMonster.delete(entry.monster_id);}
  if(!next){this.engagements.delete(id);return;}
  this.engagements.set(id,next);
  for(const entry of pveEntries489(next)){let ids=this.engagedByMonster.get(entry.monster_id);if(!ids)this.engagedByMonster.set(entry.monster_id,ids=new Set());ids.add(id);}
 }
 candidateScopes(player){
  if(this.aggroSpatialIndexR52&&!this.aggroSpatialIndexR52.disabled&&this.aggroSpatialIndexR52.cycle===this.cycle&&this.monster===AggroMemory.prototype.monster&&Number.isFinite(player.x)&&Number.isFinite(player.y)){
   const scopes=new Map(),adventure=isAdventureArea(player.area);
   for(const channel of [0,player.channel]){
    const ids=this.aggroSpatialIndexR52.candidates(player,channel);
    // Native adventure profiles are extensible. Keep R51's hard broad-phase
    // radius even if a future/custom profile advertises a larger exact range.
    scopes.set(channel,adventure?ids.filter(id=>{const m=this.monsters.get(id);return m&&(m.x-player.x)**2+(m.y-player.y)**2<=650*650;}):ids);
   }
   return scopes;
  }
  const cached=this.candidateCache.get(player.id),revision=aggroScopeCacheR51?this.grid.scopeRevision({cycle:this.cycle,channel:player.channel,area:player.area}):this.grid.geometryRevision,sharedRevision=aggroScopeCacheR51?this.grid.scopeRevision({cycle:this.cycle,channel:0,area:player.area}):null;
  // Cache only geometric IDs. Native rules reread health, spawn round, cohort,
  // nearest-player ownership and engagement limits on EVERY selection.
  if(cached&&cached.revision===revision&&cached.sharedRevision===sharedRevision&&cached.cycle===this.cycle&&cached.channel===player.channel&&cached.area===player.area&&Object.is(cached.x,player.x)&&Object.is(cached.y,player.y))return new Map(cached.scopes);
  const scopes=new Map();
  // Adventure profiles allow a 650 px aggro range. This is only a broad-phase
  // bound: nearby() still applies each monster's exact configured range.
  const radius=isAdventureArea(player.area)?650:370;
  for(const channel of [0,player.channel])scopes.set(channel,Object.freeze(this.grid.nearby({cycle:this.cycle,channel,area:player.area},player.x,player.y,radius).map(row=>row.id)));
  this.candidateCache.set(player.id,{revision,sharedRevision,cycle:this.cycle,channel:player.channel,area:player.area,x:player.x,y:player.y,scopes:new Map(scopes)});
  return scopes;
 }
}
