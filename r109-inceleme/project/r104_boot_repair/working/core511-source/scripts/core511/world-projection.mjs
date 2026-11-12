import {zumrutGatherForR96,forgetZumrutGatherR96} from './zumrut-gather-projection-r96.mjs';
import {mergeZumrutNodeDepletionsR93,zumrutNodeProjectionR93} from './zumrut-node-projection-r93.mjs';
import {groundLootDeadlineMs} from './ground-loot-expiry.mjs';
import {createWorldProjectionRules,publicWorldPlayer,diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL,colLabPlayerRun,stoneBossFields476,pveEntries489 as nativeEntries} from './generated/world-projection-rules.mjs';
import {pveEntries489 as cachedEntries} from './generated/aggro-rules.mjs';
import {r35Options} from './r35-options.mjs';
import {r40Options} from './r40-options.mjs';
import {demand,PROTOCOL} from './contract.mjs';
import {timedPlayerView,timedPlayerDeadline} from './timed-player-view.mjs';
import {liveMarketShops,marketShopDeadline} from './generated/market-clock-rules.mjs';
import {SharedFrameEncoder} from './shared-frame-encoder.mjs';
import {POTION_REFRESH_FIELDS} from './potion-refresh.mjs';
import {publicPlayerCache} from './r50-projection-options.mjs';
import {PublicPlayerCache} from './public-player-cache.mjs';

const empty=Object.freeze({entities:Object.freeze({}),fields:Object.freeze({})});
const pveEntries489=r35Options.channelMicro?cachedEntries:nativeEntries;
const future=(now,...values)=>Math.min(Infinity,...values.filter(v=>Number.isFinite(v)&&v>now));
const sameScalarRow=(a,b)=>a===b||!!a&&Object.keys(a).length===Object.keys(b).length&&Object.keys(b).every(k=>Object.is(a[k],b[k]));
const pickColumns=(row,keys)=>{const value={};for(const k of keys)value[k]=row[k];return value;};
const privateFields=Object.freeze(['quest_kills438','quest_fish438','realtime_scope_version']);

// Native public/private payloads over the direct channel connection. Common
// entities are projected and diffed once per changed room, including their
// native time-based expiry. No SQL, timer, HTTP sender or actor data read here.
export class WorldProjection {
 constructor({state,view,mounts=null,castleNotice=()=>null,globals,waveView,epoch,clock=Date.now}){
  demand(state&&view&&typeof waveView==='function'&&typeof epoch==='string'&&epoch.length>0,'world_projection_dependencies');
  Object.assign(this,{state,view,mounts,castleNotice,globals,epoch,clock});this.rules=createWorldProjectionRules({globals,runeV2BossWave484:waveView});
  this.ownerFields=this.rules.PLAYER_FIELDS.filter(k=>k!=='realtime_scope_version');this.native=new this.rules.NativeProjection();this.time=clock();this.rooms=new Map();this.subscribers=new Map();this.peerPlayers=new Map();this.globalRevision=0;this.eventRevision=0;this.engagementRevision=0;this.lastChanges=null;this.engagements=new Map();this.waveView=waveView;
  Object.assign(this.native,{now:()=>this.time,players:state.table('players'),playerCache:new Map(),monsterCache:new Map(),pending:new Map(),monsters:new this.rules.WorldMonsterMap(),events:new Map(),subscribers:this.subscribers,player:id=>view.player(id),partyPlayer486:id=>view.player(id)??this.peerPlayers.get(id),worldLoop:{engagements:view.engagements,engagedByMonster:new Map()}});
  for(const monster of view.monsters.values())this.monster(monster);
  this.metrics={commonBuilds:0,commonHits:0,commonDiffs:0,privateBuilds:0,privateHits:0,privateDiffs:0,snapshots:0,deltas:0,heartbeats:0};
  this.wire=new SharedFrameEncoder();
 }
 mountedPlayer(row,now=this.time){const gather=zumrutGatherForR96(this,row.id,now);if(this.view.player(row.id)?.area==='zumrut'||Object.hasOwn(row,'gatherR96'))row={...row,gatherR96:gather};const tool=this.subscribers.get(row.id)?.data.zumrutR93?.equippedTool??'';if(tool||Object.hasOwn(row,'equippedToolR93'))row={...row,equippedToolR93:tool};if(!this.mounts?.enabled)return row;return {...row,mount:this.mounts.public(row.id)};}
 setWorld(world,totalOnline){demand(world&&Number.isSafeInteger(world.cycle)&&Number.isSafeInteger(totalOnline)&&totalOnline>=0,'projection_world');if(!sameScalarRow(this.native.world,world)||this.native.totalOnline!==totalOnline){this.native.world=Object.freeze({...world});this.native.totalOnline=totalOnline;this.globalRevision++;}}
 setLeaders(rows){demand(Array.isArray(rows),'projection_leaders');this.native.bossLeaders=rows;this.globalRevision++;}
 setWaveRevision(){this.globalRevision++;}
 setPeerPlayer(row){demand(row?.id,'projection_peer_player');this.peerPlayers.set(row.id,Object.freeze({...row}));this.native.friendCommitted487(row.id,row);this.globalRevision++;}
 monster(row){this.native.monsters.set(row.id,Object.freeze(this.rules.pick(row,this.rules.MONSTER_FIELDS)));}
 lifecycleCommitted({monsters,removed=[]}){
  if(!r40Options.monsterRespawnVisibility)return;
  // A tick can drain its dirty rows while every actor is suspended or absent.
  // Publish only this durable lifecycle batch directly; affected room versions
  // were already advanced with the resident rows before this callback.
  for(const id of removed)this.native.monsters.delete(id);
  for(const monster of monsters)this.monster(monster);
 }
 setSharedMonster(row){demand(row?.channel===0,'projection_shared_monster');this.monster(row);this.globalRevision++;}
 removeSharedMonster(id){if(this.native.monsters.delete(id))this.globalRevision++;}
 event(row){demand(row&&Number.isFinite(row.created_at)&&row.id!==undefined,'projection_combat_event');this.native.events.set(row.id,Object.freeze({...row}));this.eventRevision++;}
 setMarket(point){
  demand(Number.isSafeInteger(point?.revision)&&point.revision>=0&&Array.isArray(point.shops)&&point.shops.every(r=>typeof r.id==='string'&&[0,1].includes(r.active)&&Number.isFinite(r.created_at)),'market_point');
  if(this.market&&point.revision<=this.market.revision){if(point.revision===this.market.revision)demand(JSON.stringify(point.shops)===this.market.fingerprint,'market_point_reused');return {revision:this.market.revision};}
  this.market={revision:point.revision,fingerprint:JSON.stringify(point.shops),shops:new Map(point.shops.map(row=>[row.id,Object.freeze({...row})]))};for(const sub of this.subscribers.values())sub.cache=null;return {revision:point.revision};
 }
 update(id,data,{friends=[],marketRevision=0}={}){
  demand(Number.isSafeInteger(marketRevision)&&marketRevision>=0,'market_snapshot_revision');
  const live=this.view.player(id);demand(live&&data?.channel===this.state.channel&&live.area===data.area&&Array.isArray(data.players)&&data.players.some(p=>p.id===id),'projection_snapshot_scope');
  if(data.area==='zumrut')mergeZumrutNodeDepletionsR93(this,data.zumrutR93?.nodeDepletions,this.clock());
  const key=JSON.stringify([worldPushRoom(data),colLabPlayerRun(id)]),previous=this.subscribers.get(id);
  let room=this.rooms.get(key);if(!room)this.rooms.set(key,room={key:worldPushRoom(data),cacheKey:key,stateRoom:JSON.stringify([data.world.cycle,data.channel,data.area,data.area==='arena'?(data.arenaMatch?.id??''):'' ]),staticPlayers:new Map(),playerRows:new Map(),revision:0,version:0,common:null,deadline:-Infinity});
  for(const row of data.players){const value=publicWorldPlayer(row),old=room.staticPlayers.get(row.id);if(JSON.stringify(old)!==JSON.stringify(value)){room.staticPlayers.set(row.id,value);room.revision++;}}
  const sub={id,room,data,ownerRow:data.players.find(p=>p.id===id),seq:previous?.seq??0,last:previous?.room===room?previous.last:null,lastCommon:previous?.lastCommon,lastSentAt:previous?.lastSentAt??-Infinity,revision:(previous?.revision??0)+1,closed:false,cache:null,reset:previous?.room!==room};
  sub.marketRevision=marketRevision;if((previous?.data.zumrutR93?.equippedTool??'')!==(data.zumrutR93?.equippedTool??''))room.revision++;this.subscribers.set(id,sub);this.native.seedFriends487(id,friends);
  if(previous&&previous.room!==room)this.cleanup();return sub;
 }
 refreshPotion(row){
  const sub=this.subscribers.get(row.id);if(!sub||sub.data.area!==row.area||sub.data.channel!==row.channel)return false;
  const owner={...sub.ownerRow};for(const key of POTION_REFRESH_FIELDS)if(Object.hasOwn(owner,key))owner[key]=row[key];
  sub.ownerRow=owner;sub.data={...sub.data,players:sub.data.players.map(p=>p.id===row.id?owner:p)};sub.cache=null;sub.privateOwnerCache=null;sub.revision++;return true;
 }
 forget(id){forgetZumrutGatherR96(this,id);const sub=this.subscribers.get(id);if(sub){sub.closed=true;sub.room.revision++;this.subscribers.delete(id);this.native.forgetFriends487(id);if(publicPlayerCache)sub.room.publicPlayerCache?.forget(id);this.cleanup();}}
 cleanup(){const used=new Set([...this.subscribers.values()].map(s=>s.room));for(const [key,room]of this.rooms)if(!used.has(room)){if(publicPlayerCache)room.publicPlayerCache?.clear();this.rooms.delete(key);}}
 sync(changes,now){
  this.time=now;if(this.lastChanges===changes)return;this.lastChanges=changes;this.wire.begin(changes);
  for(const change of changes){
   if(change.kind==='monsters'){if(change.row)this.monster(change.row);else this.native.monsters.delete(change.id);}
   if(change.kind==='players')this.native.friendCommitted487(change.id,change.row);
  }
  // At most 25 live/passive actor entries per active group. Values are frozen;
  // reference comparison catches changes without serializing the engagements.
  let dirty=this.engagements.size!==this.view.engagements.size;
  for(const [id,row]of this.view.engagements)if(this.engagements.get(id)!==row){dirty=true;break;}
  if(dirty){this.engagements=new Map(this.view.engagements);this.engagementRevision++;const by=this.native.worldLoop.engagedByMonster;by.clear();for(const [id,row]of this.engagements)for(const e of pveEntries489(row)){let list=by.get(e.monster_id);if(!list)by.set(e.monster_id,list=new Set());list.add(id);}}
 }
 roomVersion(room){return this.state.versions.get(room.stateRoom)??0;}
 common(sub,now){
  const room=sub.room,version=this.roomVersion(room),maintenance=this.globals.__colRealm?.maintenance?.policy?.revision??0;
  if(room.common&&room.mountRevision===(this.mounts?.revision??0)&&room.stateVersion===version&&room.builtRevision===room.revision&&room.globalRevision===this.globalRevision&&room.eventRevision===this.eventRevision&&room.engagementRevision===this.engagementRevision&&room.maintenance===maintenance&&now>=room.builtAt&&now<room.deadline){this.metrics.commonHits++;return room.common;}
  const projected=this.native.project({id:'',loadlabViewerId:sub.id,room,data:sub.data}),next={players:publicPlayerCache?(room.publicPlayerCache??=new PublicPlayerCache({view:this.view,mounts:this.mounts,toolFor:id=>this.subscribers.get(id)?.data.zumrutR93?.equippedTool??'',gatherFor:(id,time)=>zumrutGatherForR96(this,id,time)})).project(projected.players,now):projected.players.map(p=>this.mountedPlayer(timedPlayerView(p,this.view.player(p.id),now),now)),monsters:projected.monsters,combatEvents:projected.combatEvents};
  room.previous=room.common;room.common=next;room.delta=room.previous?diffWorld(room.previous,next,{linearDiff:true}):null;if(room.previous)this.metrics.commonDiffs++;
  this.wire.prepare(next,room.delta);
  let deadline=Infinity;
  for(const p of room.staticPlayers.values()){const live=this.view.player(p.id);if(live)deadline=future(now,deadline,(live.last_seen+31)*1000,timedPlayerDeadline(p,live,now),zumrutGatherForR96(this,p.id,now)?.finishAtMs);}
  for(const e of this.native.events.values())deadline=future(now,deadline,e.created_at+2201);
  for(const e of this.engagements.values())deadline=future(now,deadline,e.expires_at_ms+1);
  Object.assign(room,{mountRevision:this.mounts?.revision??0,stateVersion:version,builtRevision:room.revision,globalRevision:this.globalRevision,eventRevision:this.eventRevision,engagementRevision:this.engagementRevision,maintenance,deadline,builtAt:now});room.version++;this.metrics.commonBuilds++;return next;
 }
 privateDeadline(sub,next,now){
  const data=sub.data;let until=future(now,data.partyInvite?(data.partyInvite.created_at+121)*1000:Infinity,data.globalAnnouncement?.expires_at_ms,data.gmAnnouncement?.announcement_expires_at_ms,data.arenaMatch?.status==='countdown'?data.arenaMatch.startsAtMs:Infinity,next.runeV2BossWave484?.expiresAtMs);
  for(const m of data.regionalMessages??[])until=future(now,until,(m.created_at+6)*1000);
  for(const d of data.drops??[])until=future(now,until,groundLootDeadlineMs(d.expires_at));
  for(const shop of data.shops??[])until=future(now,until,marketShopDeadline(shop));
  for(const row of data.party?.members??[]){const p=this.native.partyPlayer486(row.id)??row;until=future(now,until,(Math.max(Number(p.last_seen)||0,Math.floor((Number(p.movement_checked_at_ms)||0)/1000),Math.floor((Number(p.last_monster_hit_at)||0)/1000))+31)*1000);}
  const friend=this.native.friendViewCache487?.get(sub.id);return future(now,until,friend?.until);
 }
 privateOwner(sub,live,now){
  const previous=sub.privateOwnerCache;
  if(previous&&previous.mountRevision===(this.mounts?.revision??0)&&previous.live===live&&previous.source===sub.ownerRow&&now>=previous.at&&now<previous.until)return previous.value;
  const base={...sub.ownerRow,...pickColumns(live,this.ownerFields),...pickColumns(live,privateFields)},value=this.mountedPlayer(timedPlayerView(base,live,now),now);
  sub.privateOwnerCache={mountRevision:this.mounts?.revision??0,live,source:sub.ownerRow,at:now,until:Math.min(timedPlayerDeadline(base,live,now),value.gatherR96?.finishAtMs??Infinity),value};return value;
 }
 worldView(sub){
  const world=this.native.world;if(!world)return sub.data.world;const old=sub.worldCache;
  if(old?.world===world&&old.source===sub.data.world)return old.value;
  const value={...sub.data.world,...pickColumns(world,Object.keys(sub.data.world))};sub.worldCache={world,source:sub.data.world,value};return value;
 }
 snapshot(sub,common,now){
  const zumrutNodesR93=zumrutNodeProjectionR93(this,sub.data.area,now);
  const live=this.view.player(sub.id),cached=sub.cache,room=sub.room,wave=this.waveView(sub.data.area,sub.data.channel,common.monsters,now),castleNotice=this.castleNotice(now);
  if(cached&&cached.zumrutNodesR93===zumrutNodesR93&&cached.castleNotice===castleNotice&&cached.mountRevision===(this.mounts?.revision??0)&&cached.wave===wave&&cached.common===common&&cached.revision===sub.revision&&cached.globalRevision===this.globalRevision&&cached.live===live&&cached.maintenance===(this.globals.__colRealm?.maintenance?.policy?.revision??0)&&now>=cached.at&&now<cached.until){this.metrics.privateHits++;return cached.value;}
  let next;
  if(live.is_gm===1&&live.gm_invisible===1||!common.players.some(p=>p.id===sub.id)){next=this.native.project(sub);next={...next,players:next.players.map(p=>this.mountedPlayer(timedPlayerView(p,this.view.player(p.id),now),now))};}
  else{
   const {timedFields,liveDrops503,maintenanceWorldView491}=this.rules;
   const own=this.privateOwner(sub,live,now);
   const players=common.players.map(p=>p.id===sub.id?own:p);
   next={...sub.data,...common,maintenance438:live.is_gm===1?null:maintenanceWorldView491(),maintenanceRevision491:this.globals.__colRealm?.maintenance?.policy?.revision??0,
    ...timedFields(sub.data,common.monsters,now,id=>this.native.partyPlayer486(id)),friends:this.native.friendsView487(sub.id,sub.data.friends,now),
    ...(this.native.bossLeaders?stoneBossFields476(this.native.bossLeaders,sub.data.area,sub.data.channel,common.monsters,sub.id):{}),players,totalOnline:this.native.totalOnline??sub.data.totalOnline,
    world:this.worldView(sub),drops:liveDrops503(sub.data.drops,now),serverTime:Math.floor(now/1000),snapshotAtMs:now};
  }
  if(Array.isArray(next.shops)){let shops=liveMarketShops(next.shops,now);if(this.market&&this.market.revision>=sub.marketRevision){const live=row=>{const saved=this.market.shops.get(row.id);return saved?.active===1&&saved.created_at===row.created_at;};if(!shops.every(live))shops=shops.filter(live);}next={...next,shops};}
  if(castleNotice)next={...next,globalAnnouncement:castleNotice};
  if(zumrutNodesR93)next={...next,zumrutR93:{...next.zumrutR93,nodeDepletions:zumrutNodesR93.rows}};
  sub.cache={zumrutNodesR93,castleNotice,mountRevision:this.mounts?.revision??0,value:next,common,live,wave,revision:sub.revision,globalRevision:this.globalRevision,maintenance:this.globals.__colRealm?.maintenance?.policy?.revision??0,at:now,until:this.privateDeadline(sub,next,now)};this.metrics.privateBuilds++;return next;
 }
 project({id,now,changes,results=[],lastApplied=0}){
  this.sync(changes,now);const sub=this.subscribers.get(id);if(!sub)return results.length?{type:'frame',protocol:PROTOCOL,results,lastApplied}:null;
  const live=this.view.player(id);demand(live,'projection_actor_missing');
  if(live.channel!==sub.data.channel||live.area!==sub.data.area||live.area==='arena'&&live.arena_match_id!==sub.data.arenaMatch?.id||this.native.world&&this.native.world.cycle!==sub.data.world.cycle){
   const reset={type:'world_reset',protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:sub.room.key,seq:++sub.seq,reason:'scope'};this.forget(id);return {type:'frame',protocol:PROTOCOL,world:reset,results,lastApplied};
  }
  const common=this.common(sub,now),next=this.snapshot(sub,common,now);let world;
  if(!sub.last||sub.reset){sub.reset=false;sub.last=next;sub.lastCommon=common;sub.lastSentAt=now;world={type:'world_snapshot',data:{...next,serverTime:Math.floor(now/1000),snapshotAtMs:now,worldPush:{enabled:true,revision:3,protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:sub.room.key,seq:sub.seq}}};this.metrics.snapshots++;}
  else{
   let delta=empty;
   if(sub.last!==next){
    if(!(live.is_gm===1&&live.gm_invisible===1)&&common.players.some(p=>p.id===id)&&sub.lastCommon===sub.room.previous&&sub.room.delta){
     const privateDelta=diffWorld(sub.last,next,{rows:true,skipSharedEntities:true,linearDiff:true});delta={entities:{...sub.room.delta.entities,...privateDelta.entities},fields:privateDelta.fields};
     const old=sub.last.players.find(p=>p.id===id),own=next.players.find(p=>p.id===id),ownDelta=old===own?null:diffWorld({players:old?[old]:[]},{players:own?[own]:[]},{linearDiff:true}).entities.players;
     if(ownDelta){const shared=delta.entities.players??{upsert:[],remove:[],order:next.players.map(p=>p.id)};delta.entities.players={...shared,upsert:[...shared.upsert.filter(p=>p.id!==id),...ownDelta.upsert],remove:[...new Set([...shared.remove,...ownDelta.remove])]};}
    }else delta=diffWorld(sub.last,next,{rows:true,linearDiff:true});this.metrics.privateDiffs++;
   }
   const changed=Object.keys(delta.entities).length>0||Object.keys(delta.fields).length>0;
   if(changed||now-sub.lastSentAt>=1000){world={type:'world_delta',protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:sub.room.key,seq:++sub.seq,serverTime:Math.floor(now/1000),snapshotAtMs:now,...delta};sub.last=next;sub.lastSentAt=now;this.metrics[changed?'deltas':'heartbeats']++;}
   if(!changed)sub.last=next;sub.lastCommon=common;
  }
  return world||results.length?{type:'frame',protocol:PROTOCOL,...(world?{world}:{}),results,lastApplied}:null;
 }
}
