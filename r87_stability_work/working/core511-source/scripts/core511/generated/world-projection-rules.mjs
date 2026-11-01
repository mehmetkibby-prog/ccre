import {groundLoot30s} from '../ground-loot-expiry.mjs';
import {friendOnline487} from "../../../../native510-bb3a6cc689c6/lib/friends487.mjs";
import {partyView486} from "../../../../native510-bb3a6cc689c6/lib/party-view486.mjs";
import {colLabIsMonster,colLabCanSeeMonster,colLabCanSeeCombat,colLabPlayerRun} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
import {stoneBossFields476} from "../../../../native510-bb3a6cc689c6/lib/stone-boss-ranking476.mjs";
import {publicWorldPlayer} from "../../../../native510-bb3a6cc689c6/vds-server/src/world-push-player.mjs";
import {diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL} from "../../../../native510-bb3a6cc689c6/lib/world-push.mjs";
import {pveEntries489} from "../../../../native510-bb3a6cc689c6/vds-server/src/pve-multi489.mjs";
export {eventForViewer} from "../../../../native510-bb3a6cc689c6/realtime-server/src/visibility.mjs";
export {colLabEventAudience,colLabAssertAction} from "../../../../native510-bb3a6cc689c6/vds-server/src/loadlab-gameplay.mjs";
export {publicWorldPlayer,diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL,colLabPlayerRun,stoneBossFields476,pveEntries489};
import {castleEnabled} from '../castle-model-r59.mjs';
export function createWorldProjectionRules({globals,runeV2BossWave484}){
 const globalThis=globals;
 let maintenanceWorldOwner491=null,maintenanceWorldPolicy491=null,maintenanceWorldValue491=null;
function maintenanceWorldView491(){const owner=globalThis.__colRealm?.maintenance,policy=owner?.policy;if(!owner)return null;if(owner!==maintenanceWorldOwner491||policy!==maintenanceWorldPolicy491){maintenanceWorldOwner491=owner;maintenanceWorldPolicy491=policy;const value=owner.view(null);maintenanceWorldValue491=value?Object.freeze({...value}):null;}return maintenanceWorldValue491;}
const MONSTER_FIELDS='id name x y hp max_hp respawn_at variant is_boss despawn_at spawn_round area channel is_stone wave_stage summoned parent_stone_id'.split(' ');
const PLAYER_FIELDS='id x y hp max_hp hp_revision respawn_at_ms position_revision motion_stream_id motion_sequence area channel arena_match_id realtime_scope_version is_gm gm_invisible gm_visibility_revision last_seen'.split(' ');
const pick=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
function liveDrops503(rows,now){
 const values=rows??[];if(!values.length)return values;const second=Math.floor(now/1000);
 // Native snapshots replace arrays when owner rows change. Still inspect every
 // expiry on every call: clock rollback and even in-place expiry edits are safe.
 for(let i=0;i<values.length;i++)if(!(groundLoot30s?values[i].expires_at>second:values[i].expires_at>=second))return values.filter(d=>groundLoot30s?d.expires_at>second:d.expires_at>=second);
 return values;
}
const regionalExpiryCache=new WeakMap();
function timedFields(data,monsters,now,player){
 const fields={runeV2BossWave484:runeV2BossWave484(data.area,data.channel,monsters,now)};const second=Math.floor(now/1000);
 if(data.party?.members)fields.party=partyView486(data.party.id,data.party.members.map(row=>{const live=player(row.id);if(!live)return row;const fields=['hp','max_hp','area','channel','last_seen','x','y','arena_match_id','movement_checked_at_ms','last_monster_hit_at'].filter(k=>Object.hasOwn(row,k)&&live[k]!==undefined);return fields.some(k=>row[k]!==live[k])?{...row,...pick(live,fields)}:row;}),data.party.viewerId486,second);
 if(data.regionalMessages){let cached=regionalExpiryCache.get(data.regionalMessages);if(cached?.second!==second){const rows=data.regionalMessages.filter(m=>m.created_at>=second-5);cached={second,rows:rows.length===data.regionalMessages.length?data.regionalMessages:rows};regionalExpiryCache.set(data.regionalMessages,cached);}fields.regionalMessages=cached.rows;}
 if(data.partyInvite&&data.partyInvite.created_at<second-120)fields.partyInvite=null;
 if(data.globalAnnouncement?.expires_at_ms<=now)fields.globalAnnouncement=null;
 if(data.gmAnnouncement?.announcement_expires_at_ms<=now)fields.gmAnnouncement=null;
 if(data.arenaMatch?.status==='countdown'&&data.arenaMatch.startsAtMs<=now)fields.arenaMatch={...data.arenaMatch,status:'active'};
 const boss=monsters.find(m=>m.is_boss===1&&!colLabIsMonster(m.id));
 if(Object.hasOwn(data,'bossNextAt'))fields.bossNextAt=boss&&boss.hp<=0?boss.respawn_at:0;
 if(Object.hasOwn(data,'bossEndsAt'))fields.bossEndsAt=boss&&boss.hp>0?boss.despawn_at:0;
 return fields;
}
class WorldMonsterMap extends Map {
 constructor(){super();this.byArea=new Map();this.shared=new Map();this.membership=new Map();}
 removeMembership(id,scope){
  if(scope.shared){this.shared.delete(id);return;}
  const channels=this.byArea.get(scope.area),bucket=channels?.get(scope.channel);
  bucket?.delete(id);if(bucket?.size===0)channels.delete(scope.channel);if(channels?.size===0)this.byArea.delete(scope.area);
 }
 set(id,row){
  const shared=row.is_boss===1&&!colLabIsMonster(id)||row.id==='dragon-world-1',previous=this.membership.get(id);
  const same=previous&&previous.shared===shared&&(shared||previous.area===row.area&&previous.channel===row.channel);
  if(previous&&!same)this.removeMembership(id,previous);
  if(shared)this.shared.set(id,row);
  else {let channels=this.byArea.get(row.area);if(!channels)this.byArea.set(row.area,channels=new Map());let bucket=channels.get(row.channel);if(!bucket)channels.set(row.channel,bucket=new Map());bucket.set(id,row);}
  if(!same)this.membership.set(id,{shared,area:row.area,channel:row.channel});
  return super.set(id,row);
 }
 delete(id){const scope=this.membership.get(id);if(scope)this.removeMembership(id,scope);this.membership.delete(id);return super.delete(id);}
 clear(){super.clear();this.byArea.clear();this.shared.clear();this.membership.clear();}
 *candidates(area,channel){
  const channels=this.byArea.get(area);
  yield* channels?.get(0)?.values()??[];
  if(channel!==0)yield* channels?.get(channel)?.values()??[];
  yield* this.shared.values();
 }
}
 class NativeProjection {project(sub){
  const now=this.now(),data=sub.data,sameRoom=p=>p.channel===data.channel&&p.area===data.area&&(p.area!=='arena'||p.arena_match_id&&p.arena_match_id===data.arenaMatch?.id);
  const projectedPlayers=[],cutoff=Math.floor(now/1000)-30;
  for(const publicRow of sub.room.staticPlayers.values()){
   const p=publicRow.id===sub.id?sub.ownerRow??publicRow:publicRow,live=this.player(p.id),offline=live&&live.last_seen<cutoff,owner=this.subscribers.get(p.id);
   // Retire history during the roster's existing pass. Keep a subscribed owner
   // until the existing expiry/reset path runs, including its private snapshot
   // exception and dead players' unchanged 30-second visibility/fade window.
   if(!live||!sameRoom(live)||offline&&p.id!==sub.id&&(!owner||owner.closed||owner.room!==sub.room)){
    sub.room.staticPlayers.delete(p.id);sub.room.playerRows.delete(p.id);if(!live||offline)this.playerCache.delete(p.id);continue;
   }
   if(offline&&p.id!==sub.id||live.is_gm===1&&live.gm_invisible===1&&p.id!==sub.id)continue;
   const cache=p===publicRow?sub.room.playerRows:sub.ownerCache??=new Map(),prior=cache.get(p.id);
   if(prior?.p===p&&prior.live===live){projectedPlayers.push(prior.row);continue;}
   const row={...p,...pick(live,PLAYER_FIELDS.filter(k=>k!=='realtime_scope_version')),...(p.id===sub.id?pick(live,['quest_kills438','quest_fish438','realtime_scope_version']):{})};cache.set(p.id,{p,live,row});projectedPlayers.push(row);
  }
  const castleRoom=castleEnabled()&&data.channel===4;
  const players=projectedPlayers.sort((a,b)=>castleRoom?Number(b.id===sub.id)-Number(a.id===sub.id)||b.last_seen-a.last_seen:b.last_seen-a.last_seen).slice(0,castleRoom?100:80);
  const visiblePlayerIds=new Set(players.map(p=>p.id));
  const monsters=[];for(const base of this.monsters.candidates(data.area,data.channel)){
   let m=base;const e=this.combat?.entry('monsters',m.id);
   if(!this.pending.has('monsters\u001e'+m.id)&&e?.dirtyAt&&e.current?.hp>0&&m.hp>0&&e.current.spawn_round===m.spawn_round){const cached=this.monsterCache.get(m.id);if(cached?.base===base&&cached.hp===e.current.hp)m=cached.row;else{m={...m,hp:e.current.hp};this.monsterCache.set(m.id,{base,hp:e.current.hp,row:m});}}
   if(colLabCanSeeMonster(sub.loadlabViewerId??sub.id,m)&&((m.area===data.area&&(m.channel===0||m.channel===data.channel))||(m.is_boss===1&&!colLabIsMonster(m.id))||m.id==='dragon-world-1')&&(!m.summoned||m.hp>0)){const targetIds=[];for(const id of this.worldLoop?.engagedByMonster.get(m.id)??[]){const engagement=this.worldLoop.engagements.get(id),p=this.player(id);if(engagement?.spawn_round===m.spawn_round&&engagement.expires_at_ms>=now&&p&&visiblePlayerIds.has(id)&&p.hp>0&&sameRoom(p)&&(!(p.is_gm===1&&p.gm_invisible===1)||p.id===sub.id))targetIds.push(id);}targetIds.sort();const key=JSON.stringify(targetIds),cache=sub.room.targetRows??=new Map(),old=cache.get(m.id);if(old?.base===m&&old.key===key)m=old.row;else{const base=m;m={...m,targetIds};cache.set(m.id,{base,key,row:m});}monsters.push(m);}
  }
  monsters.sort((a,b)=>a.is_boss-b.is_boss||a.is_stone-b.is_stone||(a.id<b.id?-1:a.id>b.id?1:0));
  const combatEvents=[];for(const [id,e]of this.events){if(e.created_at<now-2200){this.events.delete(id);continue;}const attacker=this.player(e.player_id),target=this.player(e.target_id);if(colLabCanSeeCombat(sub.loadlabViewerId??sub.id,e)&&attacker&&sameRoom(attacker)&&(!(attacker.is_gm===1&&attacker.gm_invisible===1)||attacker.id===sub.id)&&(!(target?.is_gm===1&&target.gm_invisible===1)||target.id===sub.id))combatEvents.push(e);}
  combatEvents.sort((a,b)=>b.created_at-a.created_at||b.id-a.id);
  return {...data,maintenance438:this.player(sub.id)?.is_gm===1?null:maintenanceWorldView491(),maintenanceRevision491:globalThis.__colRealm?.maintenance?.policy?.revision??0,...timedFields(data,monsters,now,id=>this.partyPlayer486(id)),...(sub.id?{friends:this.friendsView487(sub.id,data.friends,now)}:{}),...(this.bossLeaders?stoneBossFields476(this.bossLeaders,data.area,data.channel,monsters,sub.id):{}),totalOnline:this.totalOnline??data.totalOnline,world:this.world?{...data.world,...pick(this.world,Object.keys(data.world))}:data.world,players,monsters,combatEvents:combatEvents.slice(0,512).reverse(),drops:liveDrops503(data.drops,now),serverTime:Math.floor(now/1000),snapshotAtMs:now};
 }
forgetFriends487(owner){
  const ids=this.friendByOwner487?.get(owner);if(!ids)return;
  for(const id of ids){const owners=this.friendOwners487.get(id);owners?.delete(owner);if(!owners?.size){this.friendOwners487.delete(id);this.friendPresence487.delete(id);}}
  this.friendByOwner487.delete(owner);this.friendViewCache487?.delete(owner);
 }
seedFriends487(owner,rows){
  this.friendByOwner487??=new Map();this.friendOwners487??=new Map();this.friendPresence487??=new Map();this.friendViewCache487??=new Map();
  this.forgetFriends487(owner);const ids=new Set();
  for(const row of rows.slice(0,100)){ids.add(row.id);let owners=this.friendOwners487.get(row.id);if(!owners)this.friendOwners487.set(row.id,owners=new Set());owners.add(owner);this.friendPresence487.set(row.id,{last_seen:row.last_seen,is_gm:row.is_gm,gm_invisible:row.gm_invisible});}
  this.friendByOwner487.set(owner,ids);
 }
friendCommitted487(id,row){
  const owners=this.friendOwners487?.get(id);if(!owners)return;
  const old=this.friendPresence487.get(id),next=row?{last_seen:row.last_seen,is_gm:row.is_gm,gm_invisible:row.gm_invisible}:{last_seen:0,is_gm:0,gm_invisible:0};
  if(old&&old.last_seen===next.last_seen&&old.is_gm===next.is_gm&&old.gm_invisible===next.gm_invisible)return;
  this.friendPresence487.set(id,next);const second=Math.floor(this.now()/1000);
  if(friendOnline487(old,second)!==friendOnline487(next,second))for(const owner of owners)this.friendViewCache487.delete(owner);
 }
friendsView487(owner,rows,now){
  if(!Array.isArray(rows)||!rows.length)return rows??[];
  const cached=this.friendViewCache487?.get(owner);if(cached?.rows===rows&&now<cached.until)return cached.result;
  let changed=false,until=Infinity;const next=rows.map(row=>{const live=this.friendPresence487?.get(row.id);const online=live?friendOnline487(live,Math.floor(now/1000)):row.online;if(online&&live)until=Math.min(until,(Number(live.last_seen)+31)*1000);if(online===row.online)return row;changed=true;return {...row,online};});
  const result=changed?next:rows;this.friendViewCache487?.set(owner,{rows,result,until});return result;
 }}
 return {NativeProjection,WorldMonsterMap,timedFields,liveDrops503,MONSTER_FIELDS,PLAYER_FIELDS,pick,maintenanceWorldView491};
}
