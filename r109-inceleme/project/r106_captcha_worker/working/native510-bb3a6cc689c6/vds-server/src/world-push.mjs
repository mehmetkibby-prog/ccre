import {optimizeR18} from './perf-r18-features.mjs';
let maintenanceWorldOwner491=null,maintenanceWorldPolicy491=null,maintenanceWorldValue491=null;
function maintenanceWorldView491(){const owner=globalThis.__colRealm?.maintenance,policy=owner?.policy;if(!owner)return null;if(owner!==maintenanceWorldOwner491||policy!==maintenanceWorldPolicy491){maintenanceWorldOwner491=owner;maintenanceWorldPolicy491=policy;const value=owner.view(null);maintenanceWorldValue491=value?Object.freeze({...value}):null;}return maintenanceWorldValue491;}
import {friendOnline487} from '../../lib/friends487.mjs';
import {partyView486} from '../../lib/party-view486.mjs';
import {runeV2BossWave484} from './rune-v2-combat484.mjs';
import {isRuneV2RankBoss483} from '../../lib/rune-v2-ranking.mjs';
import {perfR11Features} from './perf-r11-features.mjs';
const worldDiffLinear=perfR11Features.enabled('worldDiffLinear');
import {colLabIsMonster,colLabPlayerRun,colLabCanSeeMonster,colLabCanSeeCombat} from './loadlab-gameplay.mjs';
import {isStoneBossRanking476,stoneBossFields476,seedStoneBossRows476,stoneBossHasContributor476} from '../../lib/stone-boss-ranking476.mjs';
import {splitWorldEvent,worldPacketBody,worldPayloadSizes,WORLD_PACKET_BUDGET} from './world-push-packets.mjs';
import {publicWorldPlayer} from './world-push-player.mjs';
import {randomUUID} from 'node:crypto';
import {diffWorld,worldPushRoom,WORLD_PUSH_PROTOCOL} from '../../lib/world-push.mjs';
import {realtimeBatcher,realtimeCrypto,postLoopback} from './realtime-transport.mjs';
import {deferDatabaseBackgroundTask} from './database.mjs';
import {reportRuntimeWork} from './runtime-performance.mjs';

const MONSTER_FIELDS='id name x y hp max_hp respawn_at variant is_boss despawn_at spawn_round area channel is_stone wave_stage summoned parent_stone_id'.split(' ');
const PLAYER_FIELDS='id x y hp max_hp hp_revision respawn_at_ms position_revision motion_stream_id motion_sequence area channel arena_match_id realtime_scope_version is_gm gm_invisible gm_visibility_revision last_seen'.split(' ');
const VOLATILE_PLAYER=new Set([...PLAYER_FIELDS.filter(k=>!['area','channel','arena_match_id','is_gm','gm_invisible'].includes(k)),'movement_checked_at_ms','last_attack_at','last_basic_attack_at','last_ability_at','last_monster_hit_at','last_pvp_hit_at','last_damage_at','last_heartbeat_at','movement_debt_ms','attack_one_at','attack_two_at','attack_three_at','attack_four_at','special_guard_until_ms','combat_lock_until_ms','last_regen_at','last_movement_at_ms','battle_pass_season','battle_pass_xp','quest_kills438','quest_fish438']);
const pick=(row,fields)=>Object.fromEntries(fields.map(k=>[k,row[k]]));
// Match the authoritative arena context's existing 45-second live queue gate.
// This cache only projects committed queue rows; admission/settlement stays in
// the existing game/writer lane.
const ARENA_QUEUE_TTL_MS=45000;
const QUEUE_FIELDS='player_id mode team_name queued_at_ms last_seen_ms channel room_id'.split(' ');
const queueRoom=row=>JSON.stringify([row.room_id,row.mode,row.channel]);
const queueEqual=(a,b)=>a===b||!!a&&!!b&&['mode','teamName','queuedAtMs','queuedCount','position'].every(key=>a[key]===b[key]);
const privateTables=new Set(['player_cauldron488','player_friends487','world_drops','player_items','player_storage_items','player_stones','player_pets','dungeon_materials','dungeon_wings','normal_reward_claims']);
// These tables can affect the public equipment/pet silhouette. Preserve the
// legacy full-room repair when their owner has no push subscription.
const appearanceTables441=new Set(['player_items','player_pets','dungeon_wings']);
const globalTables=new Set(['world_state','game_settings','combat_settings','economy_settings','rank_settings','event_island_settings444','event_island_monsters444','rune_settings','rune_v2_settings','dragon_settings','guild_members','guild_skills','arena_matches','arena_match_players','arena_queue','arena_announcements','gm_announcements','parties','party_members','party_invites','market_shops','market_listings','premium_listings','messages','direct_message_dismissals','premium_shop_settings']);
export const WORLD_PUSH_TABLES=Object.freeze(['players','monsters','combat_events',...privateTables,...globalTables,'boss_participants','broken_core_state464','broken_core_settings464']);
export const WORLD_PUSH_VOLATILE_PLAYER=Object.freeze([...VOLATILE_PLAYER]);
function liveDrops503(rows,now){
 const values=rows??[];if(!values.length)return values;const second=Math.floor(now/1000);
 // Native snapshots replace arrays when owner rows change. Still inspect every
 // expiry on every call: clock rollback and even in-place expiry edits are safe.
 for(let i=0;i<values.length;i++)if(!(values[i].expires_at>=second))return values.filter(d=>d.expires_at>=second);
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

export class WorldPush {
 constructor(database,{positions,combat,worldLoop,channel=0,enabled=process.env.CORE_WORLD_PUSH!=='0',now=Date.now,send,watchWrites=true}={}){
  if(![0,1,2,3].includes(channel))throw Error('Invalid world push channel');this.channel=channel;
  this.db=database;this.positions=positions;this.combat=combat;this.worldLoop=worldLoop;this.enabled=enabled;this.now=now;this.epoch=randomUUID();this.rooms=new Map();this.sharedDirty=new Map();this.sharedRunning=new Map();this.recipientSequences=new Map();this.legacyPaused=new Map();this.subscribers=new Map();this.players=new Map();this.playerCache=new Map();this.monsterCache=new Map();this.monsters=new WorldMonsterMap();this.events=new Map();this.pending=new Map();this.durability=new Set();this.generation=0;this.visibilityRevision=0;this.running=null;this.stopped=false;
  this.stats={deliveryByStatus:{},sharedReads:{chat:0,market:0,settings:0},ownerRefreshes:0,fullRefreshes:0,droppedReasons:{byteBudget:0,scope:0,error:0},maxPacketBytes:0,maxDeltaBytes:0,largestFields:{},splitFrames:0,splitPackets:0,deltas:0,bytes:0,delivered:0,deliveredBytes:0,keepalives:0,coalesced:0,snapshotRequests:0,gaps:0,dropped:0,errors:0,internalSnapshots:0,worldReads:0,readModes:{},invalidations:{},playerInvalidations:{},seedCpuMs:0,seedMsMax:0,seedRows:0,tickMsMax:0,tickCpuMs:0,ticks:0,slices:0,sliceMsMax:0};this.started=now();this.send=send??this.deliver.bind(this);
  if(!enabled)return;
  const raw=database.sqlite.positionRawPrepare??database.sqlite.prepare.bind(database.sqlite);this.raw=raw;
  this.arenaQueue=new Map();this.arenaQueueDirty=false;this.arenaQueueAt=Infinity;
  if(raw("SELECT 1 FROM main.sqlite_schema WHERE type='table' AND name='arena_queue'").get()){
   this.arenaQueueLookup=raw(`SELECT ${QUEUE_FIELDS.join(',')} FROM main.arena_queue WHERE player_id=?`);
   for(const row of raw(`SELECT ${QUEUE_FIELDS.join(',')} FROM main.arena_queue`).all())this.arenaQueue.set(row.player_id,row);
   this.arenaQueueDirty=true;
  }
  this.privateOwnerChannel=channel?raw('SELECT channel FROM main.players WHERE id=?'):null;
  this.world=raw('SELECT * FROM main.world_state WHERE id=1').get();
  for(const p of raw(`SELECT quest_kills438,quest_fish438,last_monster_hit_at,${PLAYER_FIELDS.join(',')} FROM main.players${channel?` WHERE channel=${channel}`:''}`).all())this.players.set(p.id,p);
  for(const m of raw(`SELECT ${MONSTER_FIELDS.join(',')} FROM main.monsters${channel?` WHERE channel=${channel} OR channel=0 OR is_boss=1 OR id='dragon-world-1'`:''}`).all())this.monsters.set(m.id,m);
  for(const e of raw('SELECT id,player_id,target_id,role,ability,created_at FROM main.combat_events WHERE created_at>=? ORDER BY created_at DESC,id DESC LIMIT 512').all(now()-2200))this.events.set(e.id,e);
  if(watchWrites)this.attach(database.sqlite,()=>database.durableAfterCommit(),true);
  if(combat)combat.worldPush=this;
 }
 read(mode){this.stats.worldReads++;this.stats.readModes[mode]=(this.stats.readModes[mode]??0)+1;}
 async deliver(sub,event,preparedBody){
  const path='/internal/broadcast-players',body=preparedBody??worldPacketBody(sub,event);
  if(Buffer.byteLength(body)>WORLD_PACKET_BUDGET)throw Error('World packet exceeds verified budget');
  const sign=async(pathname,payload)=>{const timestamp=String(Math.floor(this.now()/1000)),nonce=randomUUID(),key='coreoflife-p256-2026-09';return {'x-col-key-id':key,'x-col-timestamp':timestamp,'x-col-nonce':nonce,'x-col-signature':realtimeCrypto.sign(`COL-REQUEST-V1\n${key}\n${timestamp}\n${nonce}\nPOST\n${pathname}\n${realtimeCrypto.digest(payload)}`)};};
  const origin=process.env.REALTIME_HTTP_ORIGIN||'http://127.0.0.1:3001';
  this.stats.bytes+=Buffer.byteLength(body);
  const response=await realtimeBatcher.send(origin,path,body,sign)??await postLoopback(origin,path,await sign(path,body),body);
  const status=String(response?.status??0);this.stats.deliveryByStatus[status]=(this.stats.deliveryByStatus[status]??0)+1;
  if(!response?.ok){sub.dropReason='error';return false;}
  const result=await response.json(),ok=result.worldPushProtocol===WORLD_PUSH_PROTOCOL&&result.delivered===1;
  if(ok){this.stats.delivered++;this.stats.deliveredBytes+=Buffer.byteLength(body);}else sub.dropReason=result.delivered===0?'scope':'error';return ok;
 }
 drop(reason){this.stats.dropped++;this.stats.droppedReasons[reason]++;}
 async sendFrame(sub,event){
  const body=worldPacketBody(sub,event),bytes=Buffer.byteLength(body);
  if(bytes>this.stats.maxDeltaBytes){this.stats.maxDeltaBytes=bytes;this.stats.largestFields=worldPayloadSizes(event);}
  let packets;
  try{packets=bytes<=WORLD_PACKET_BUDGET?[event]:sub.rows?splitWorldEvent(sub,event):[event];
   if(!sub.rows&&bytes>WORLD_PACKET_BUDGET)throw Error('Legacy client cannot split');
  }catch{
   this.drop('byteBudget');this.legacyPaused.set(sub.id,this.now()+65000);
   const {entities,fields,...scope}=event;packets=[{...scope,type:'world_reset',reason:'byte_budget'}];this.remove(sub);
  }
  if(packets.length>1){this.stats.splitFrames++;this.stats.splitPackets+=packets.length;}
  for(let index=0;index<packets.length;index++){
   if(index&&sub.closed)return true;
   const packet={...packets[index],seq:index?this.nextSequence(sub):event.seq};
   // The normal unsplit envelope is identical; use its exact bytes for size,
   // signature and transport. Split/reset packets retain their own encoding.
   const packetBody=packets[index]===event?body:worldPacketBody(sub,packet);
   this.stats.maxPacketBytes=Math.max(this.stats.maxPacketBytes,Buffer.byteLength(packetBody));
   // Each part is independently signed and admitted to the existing bounded
   // batcher. Awaiting it yields network I/O, and preserves recipient order.
   if(!await this.send(sub,packet,packetBody)){const reason=sub.dropReason??'error';this.drop(reason);if(reason==='error')this.stats.errors++;this.remove(sub);return false;}
  }
  return true;
 }
 attach(sqlite,durable=()=>null,external=false){
  if(!this.enabled||sqlite.worldPushAttached)return;sqlite.worldPushAttached=true;
  const raw=sqlite.positionRawPrepare??sqlite.prepare.bind(sqlite),exec=sqlite.exec.bind(sqlite);let changed=null;
  const schema=new Map(raw("SELECT name FROM main.sqlite_schema WHERE type='table'").all().map(r=>[r.name,new Set(raw(`PRAGMA main.table_info("${r.name.replaceAll('"','""')}")`).all().map(c=>c.name))]));
  const readers=new Map(),waiting=[];
  const confirm=promise=>{for(const batch of waiting.splice(0)){batch.confirmed=true;if(promise)promise.then(batch.done,batch.failed);else batch.done();}};
  sqlite.worldPushLayer={confirmDurable:confirm};
  sqlite.function('col_push_changed',{varargs:true},(table,id,owner,staticChanged,peer)=>{const key=table+'\u001e'+id,old=changed?.get(key);changed?.set(key,{table,id,owner,peer,staticChanged:staticChanged||old?.staticChanged});return 0;});
  for(const table of ['players','monsters','combat_events',...privateTables,...globalTables,'boss_participants','broken_core_state464','broken_core_settings464']){
   const cols=schema.get(table);if(!cols)continue;
   const key=cols.has('id')?'id':cols.has('player_id')?'player_id':[...cols][0];if(!key)continue;
   if(['players','monsters','combat_events','world_state','messages'].includes(table))readers.set(table,raw(`SELECT ${table==='players'?['quest_kills438','quest_fish438','last_monster_hit_at',...PLAYER_FIELDS].join(','):table==='monsters'?MONSTER_FIELDS.join(','):table==='world_state'?'*':table==='messages'?'id,player_id,recipient_id,scope,area,channel':'id,player_id,target_id,role,ability,created_at'} FROM main.${table} WHERE ${key}=?`));
   const owner=cols.has('owner_id')?'owner_id':cols.has('player_id')?'player_id':table==='players'?'id':null;
   for(const [op,ref]of [['INSERT','NEW'],['UPDATE','NEW'],['DELETE','OLD']]){
    const staticChanged=table==='players'&&op==='UPDATE'?`CASE ${[...cols].filter(k=>!VOLATILE_PLAYER.has(k)).map(k=>`WHEN OLD."${k}" IS NOT NEW."${k}" THEN '${k}'`).join(' ')} ELSE '' END`:'1';
    exec(`CREATE TEMP TRIGGER col_push_${table}_${op} AFTER ${op} ON main.${table} BEGIN SELECT col_push_changed('${table}',${ref}.${key},${owner?`${ref}.${owner}`:'NULL'},${staticChanged},${cols.has('recipient_id')?`${ref}.recipient_id`:table==='player_friends487'?`${ref}.friend_id`:'NULL'});END;`);
   }
  }
  sqlite.exec=sql=>{
   if(/^\s*BEGIN\s+(?:IMMEDIATE|EXCLUSIVE)\b/i.test(sql)){changed=new Map();try{return exec(sql);}catch(e){changed=null;throw e;}}
   if(/^\s*(?:COMMIT|END)\b/i.test(sql)){
    const result=exec(sql),batch=changed;changed=null;
    if(batch?.size){const changes=[...batch.values()].map(c=>({...c,row:readers.get(c.table)?.get(c.id)??null}));const token=++this.generation;
     for(const c of changes)if(c.table==='players'||c.table==='monsters')this.pending.set(c.table+'\u001e'+c.id,token);
     const done=()=>{for(const c of changes){if(this.pending.get(c.table+'\u001e'+c.id)===token)this.pending.delete(c.table+'\u001e'+c.id);this.committed(c);}};
     let complete;const settled=new Promise(resolve=>{complete=resolve;});this.durability.add(settled);
     const finish=()=>{this.durability.delete(settled);complete();};
     const notification={confirmed:false,done:()=>{try{done();}finally{finish();}},failed:()=>{this.stats.errors++;this.enabled=false;for(const sub of this.subscribers.values())this.remove(sub);finish();}};
     if(external){waiting.push(notification);setImmediate(()=>{if(!notification.confirmed){const wait=durable();confirm(wait);}});}else notification.done();
    }return result;
   }
   if(/^\s*ROLLBACK\b(?!\s+TO)/i.test(sql)){const result=exec(sql);changed=null;return result;}
   return exec(sql);
  };
 }
 committed({table,id,owner,row,staticChanged,peer}){
  if(table==='players')this.friendCommitted487(id,row);
  if(table==='game_settings')for(const sub of this.subscribers.values())this.invalidate(sub.id,'owner',['player_cauldron488'],true);
  if(table==='player_friends487'){this.invalidate(owner,'full',null,true);if(peer&&peer!==owner)this.invalidate(peer,'full',null,true);return;}
  if(this.channel&&row){if(table==='players'&&row.channel!==this.channel){if(!this.players.has(id))return;row=null;}else if(table==='monsters'&&row.channel!==this.channel&&row.channel!==0&&!row.is_boss&&row.id!=='dragon-world-1'){if(!this.monsters.has(id))return;row=null;}}
  const invalidated=()=>{this.stats.invalidations[table]=(this.stats.invalidations[table]??0)+1;};
  if(table==='boss_participants'){this.bossDirty=++this.generation;}else if(table==='world_state'){this.world=row;}else if(table==='players'){
   if((!row||staticChanged)&&stoneBossHasContributor476(this.bossLeaders,id))this.bossDirty=++this.generation;const previous=this.players.get(id);if(row)this.players.set(id,pick(row,[...PLAYER_FIELDS,'quest_kills438','quest_fish438','last_monster_hit_at']));else{this.players.delete(id);this.playerCache.delete(id);}
   if(!previous||!row||['area','channel','arena_match_id','is_gm','gm_invisible'].some(k=>previous[k]!==row[k]))this.visibilityRevision++;
   if(!previous||!row||staticChanged){invalidated();this.stats.playerInvalidations[staticChanged??'membership']=(this.stats.playerInvalidations[staticChanged??'membership']??0)+1;this.invalidate(!previous||!row||['area','channel','arena_match_id','is_gm','gm_invisible'].some(k=>previous[k]!==row[k])?undefined:id,'owner',['players']);}
   else if(previous.last_seen<Math.floor(this.now()/1000)-30&&row.last_seen>=Math.floor(this.now()/1000)-30){
    // A legacy/non-subscribed visitor can wake after its public row retired.
    // Rehydrate just the visible room once on that presence transition; ordinary
    // heartbeat/position commits remain volatile and cause no roster repair.
    for(const sub of this.subscribers.values())if(sub.data.channel===row.channel&&sub.data.area===row.area&&(row.area!=='arena'||row.arena_match_id&&row.arena_match_id===sub.data.arenaMatch?.id)&&(!(row.is_gm===1&&row.gm_invisible===1)||sub.id===id)){sub.invalid=++this.generation;sub.invalidKind='full';sub.ownerTables441=null;}
   }
  }else if(table==='monsters'){const previous=this.monsters.get(id);if(String(id).startsWith('event-')&&globalThis.__colEventIsland444?.monsterChanged(id,row))this.markShared('settings');if(row?.is_boss||previous?.is_boss||(isStoneBossRanking476(id)||isRuneV2RankBoss483(id)||id==='dragon-world-1'))this.bossDirty=++this.generation;if(row)this.monsters.set(id,pick(row,MONSTER_FIELDS));else{this.monsters.delete(id);this.monsterCache.delete(id);}if(!row||previous&&['area','channel','is_boss'].some(key=>previous[key]!==row[key]))for(const room of this.rooms.values())room.targetRows?.delete(id);}
  else if(table==='combat_events'){if(row)this.events.set(id,pick(row,['id','player_id','target_id','role','ability','created_at']));else this.events.delete(id);}
  else if(table==='broken_core_state464'){if(this.channel&&owner&&this.privateOwnerChannel.get(owner)?.channel!==this.channel)return;this.invalidate(owner,'owner',['players'],true);}
  else if(table==='broken_core_settings464'){for(const sub of this.subscribers.values()){if(sub.data.players?.some(p=>p.id===sub.id&&p.broken_core464))this.invalidate(sub.id,'owner',['players'],true);}}
  else if(privateTables.has(table)){
   // Writer commits are broadcast to every resident channel. An inventory or
   // private reward belonging to another channel cannot affect this room.
   // Keep legacy local-owner/old-client appearance repair and ownerless fallback.
   if(this.channel&&owner&&this.privateOwnerChannel.get(owner)?.channel!==this.channel)return;
   invalidated();this.invalidate(owner,'owner',[table],!appearanceTables441.has(table));
  }
  else if(table==='messages'){
   invalidated();const recipient=row?.recipient_id??peer;
   if(recipient){this.invalidate(owner);this.invalidate(recipient);}else this.markShared('chat');
  }else if(table==='market_shops'||table==='market_listings'||table==='premium_listings'){invalidated();this.markShared('market');}
  else if(table==='arena_queue'){
   // A heartbeat's last_seen write has no world/roster/equipment effect. Read
   // only its durable key and update the private queue view from memory.
   const key=owner??id;
   if(this.arenaQueueLookup&&key){const next=this.arenaQueueLookup.get(key);if(next)this.arenaQueue.set(key,next);else this.arenaQueue.delete(key);this.arenaQueueDirty=true;}
   else if(key)this.invalidate(key);
  }
  else if(['game_settings','combat_settings','economy_settings','rank_settings','event_island_settings444','event_island_monsters444','rune_settings','rune_v2_settings','dragon_settings','premium_shop_settings'].includes(table)){invalidated();this.markShared('settings');if(table==='rank_settings')this.invalidate();}
  else if(table==='direct_message_dismissals'){invalidated();this.invalidate(owner);}
  else if(globalTables.has(table)){invalidated();this.invalidate();}
 }
 invalidate(owner,kind='full',tables=null,privateOnly=false){
  const target=owner&&this.subscribers.get(owner);
  // No subscribed recipient can see another owner's private inventory/drop.
  // Unknown owner remains a conservative full repair; appearance stays legacy.
  if(owner&&privateOnly&&!target)return;
  for(const sub of this.subscribers.values())if(!owner||sub.id===owner||kind==='owner'&&!target){
   sub.invalid=++this.generation;
   if(!owner||!target||kind==='full'){sub.invalidKind='full';sub.ownerTables441=null;}
   else if(sub.invalidKind!=='full'){
    sub.invalidKind='owner';
    if(tables===null)sub.ownerTables441=null;
    else if(sub.ownerTables441!==null){sub.ownerTables441??=new Set();for(const table of tables)sub.ownerTables441.add(table);}
   }
  }
 }
 markShared(topic){
  if(!this.readShared){this.invalidate();return;}
  this.sharedDirty.set(topic,++this.generation);
 }
 refreshArenaQueue(now){
  if(!this.arenaQueueLookup||!this.arenaQueueDirty&&now<this.arenaQueueAt)return;
  this.arenaQueueDirty=false;this.arenaQueueAt=Infinity;
  const groups=new Map(),cutoff=now-ARENA_QUEUE_TTL_MS;
  for(const row of this.arenaQueue.values())if(row.last_seen_ms>=cutoff){let group=groups.get(queueRoom(row));if(!group)groups.set(queueRoom(row),group=[]);group.push(row);this.arenaQueueAt=Math.min(this.arenaQueueAt,row.last_seen_ms+ARENA_QUEUE_TTL_MS+1);}
  for(const group of groups.values())group.sort((a,b)=>a.queued_at_ms-b.queued_at_ms||(a.player_id<b.player_id?-1:a.player_id>b.player_id?1:0));
  for(const sub of this.subscribers.values()){
   if(sub.closed||!Object.hasOwn(sub.data,'arenaQueue'))continue;
   const row=this.arenaQueue.get(sub.id),player=this.player(sub.id);let next=null;
   if(row&&player){const group=groups.get(queueRoom({...row,channel:player.channel}))??[];let low=0,high=group.length;while(low<high){const mid=(low+high)>>1,other=group[mid];if(other.queued_at_ms<row.queued_at_ms||other.queued_at_ms===row.queued_at_ms&&other.player_id<row.player_id)low=mid+1;else high=mid;}next={mode:row.mode,teamName:row.team_name??'',queuedAtMs:Number(row.queued_at_ms??0),queuedCount:group.length,position:low+1};}
   if(queueEqual(sub.data.arenaQueue,next))continue;
   const fields={arenaQueue:next};sub.sharedFields={...sub.sharedFields,...fields};sub.sharedVersion=++this.generation;sub.data={...sub.data,...fields};
  }
 }
 async refreshShared(topic){
  const version=this.sharedDirty.get(topic);
  try{
   if(topic==='chat'){
    for(const room of [...this.rooms.values()]){
     const sub=[...this.subscribers.values()].find(s=>s.room===room);if(!sub)continue;
     const scope={area:sub.data.area,channel:sub.data.channel,arenaMatchId:sub.data.arenaMatch?.id??''};
     const data=await this.readShared(topic,scope);this.stats.sharedReads.chat++;
     if(this.db.worldReadFenceEnabledR13?.())await this.db.worldReadDurableR13();else if(this.durability.size)await Promise.all([...this.durability]);
     const views=new Map();
     for(const recipient of this.subscribers.values())if(recipient.room===room&&!recipient.closed){
      let fields=views.get(recipient.chatAfterId);if(!fields){fields={chat:data.chat.filter(m=>m.scope==='world'||m.id>recipient.chatAfterId),regionalMessages:data.regionalMessages.filter(m=>m.id>recipient.chatAfterId)};views.set(recipient.chatAfterId,fields);}recipient.sharedFields={...recipient.sharedFields,...fields};recipient.sharedVersion=++this.generation;recipient.data={...recipient.data,...fields};
     }
    }
   }else{
    const received502=await this.readShared(topic,{});const {projectSettings502,...data}=received502;const settingsViews502=new Map();this.stats.sharedReads[topic]++;
    if(this.db.worldReadFenceEnabledR13?.())await this.db.worldReadDurableR13();else if(this.durability.size)await Promise.all([...this.durability]);
    for(const sub of this.subscribers.values())if(!sub.closed){
     const fields=topic==='market'?{listings:data.listings,shops:data.shops.filter(s=>s.channel===sub.data.channel&&(s.hasListings||s.owner_id===sub.id)).map(({hasListings,...row})=>({...row,stock_count502:hasListings}))}:topic==='settings'?(()=>{const area502=sub.data.area,arena502=sub.data.arenaMatch?.id??'',key502=JSON.stringify([area502,arena502.startsWith('guild-')]);let settings502=settingsViews502.get(key502);if(!settings502){settings502=typeof projectSettings502==='function'?projectSettings502(area502,arena502):data.settings;settingsViews502.set(key502,settings502);}return {...data,settings:settings502,...(data.eventIsland?{eventIsland:globalThis.__colEventIsland444?.public(sub.data.channel)??data.eventIsland}:{})};})():data;
     sub.sharedFields={...sub.sharedFields,...fields};sub.sharedVersion=++this.generation;sub.data={...sub.data,...fields};
    }
   }
   if(this.sharedDirty.get(topic)===version)this.sharedDirty.delete(topic);
  }catch{this.stats.errors++;}finally{this.sharedRunning.delete(topic);}
 }

 memoryChanged(changes){if(changes.some(c=>c.name==='boss_participants'||c.name==='monsters'&&(isStoneBossRanking476(c.id)||isRuneV2RankBoss483(c.id)||c.id==='dragon-world-1')))this.bossDirty=++this.generation;for(const {name,id}of changes)if(name==='combat_events'){const e=this.combat.entry(name,id);if(e?.dirtyAt&&e.current)this.events.set(e.current.id,pick(e.current,['id','player_id','target_id','role','ability','created_at']));}}
 player(id){
  const base=this.players.get(id);if(!base)return null;
  const blocked=this.pending.has('players\u001e'+id);
  const p=this.positions?.entries.get(id)?.current,c=this.combat?.entry('players',id);
  const cached=this.playerCache.get(id);if(cached?.base===base&&cached.p===p&&cached.c===c?.current&&cached.blocked===blocked)return cached.row;
  let row=base;if(p&&p.area===base.area&&p.channel===base.channel&&p.realtime_scope_version===base.realtime_scope_version)row={...row,...pick(p,['x','y','position_revision','motion_stream_id','motion_sequence']),last_seen:Math.max(base.last_seen,Math.floor(p.movement_checked_at_ms/1000))};
  if(!blocked&&c?.dirtyAt&&c.current?.hp>0&&base.hp>0&&c.current.area===base.area&&c.current.channel===base.channel&&c.current.realtime_scope_version===base.realtime_scope_version)row={...row,hp:c.current.hp,hp_revision:c.current.hp_revision};
  this.playerCache.set(id,{base,p,c:c?.current,blocked,row});return row;
 }
 partyPlayer486(id){
  const row=this.player(id),base=this.players.get(id);if(!row||!base)return row;
  const c=this.combat?.entry('players',id),blocked=this.pending.has('players\u001e'+id);
  let lastHit=base.last_monster_hit_at??0;
  if(!blocked&&c?.dirtyAt&&c.current?.hp>0&&base.hp>0&&c.current.area===base.area&&c.current.channel===base.channel&&c.current.realtime_scope_version===base.realtime_scope_version)lastHit=Math.max(lastHit,c.current.last_monster_hit_at??0);
  return {...row,last_monster_hit_at:lastHit};
 }
 seedRoom(sub,ownerOnly=false){
  const started=performance.now(),room=sub.room;room.staticPlayers??=new Map();room.playerRows??=new Map();
  for(const p of sub.data.players){if(ownerOnly&&p.id!==sub.id)continue;const row=publicWorldPlayer(p);const old=room.staticPlayers.get(p.id);if(!old||JSON.stringify(old)!==JSON.stringify(row))room.staticPlayers.set(p.id,row);}
  sub.ownerRow=sub.data.players.find(p=>p.id===sub.id);
  const ms=performance.now()-started;this.stats.seedRows+=sub.data.players.length;this.stats.seedCpuMs+=ms;this.stats.seedMsMax=Math.max(this.stats.seedMsMax,ms);reportRuntimeWork('world_push_seed',ms,performance.timeOrigin+started);
 }
 project(sub){
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
  const players=projectedPlayers.sort((a,b)=>b.last_seen-a.last_seen).slice(0,80);
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
 }
 async subscribe({auth,request,data,read,readOwner,readShared,readBossLeaders,friends487=[]}){
  if(this.channel&&data.channel!==this.channel)throw Error('world_push_channel_scope');
  if(!this.enabled||!auth.player||!auth.gamePresence)return {...data,worldPush:{enabled:false}};
  if(this.db.worldReadFenceEnabledR13?.())await this.db.worldReadDurableR13();else if(this.durability.size)await Promise.all([...this.durability]);
  if(readShared)this.readShared=readShared;
  if(this.subscribers.size===0&&this.bossDirty&&!this.bossRefreshing&&Array.isArray(data.bossLeaders))this.bossLeaders=[...data.bossLeaders,...(this.bossLeaders??[]).filter(row=>row.stone_monster_id)];if(readBossLeaders)this.readBossLeaders=readBossLeaders;if(data.bossLeaders)this.bossLeaders=seedStoneBossRows476(this.bossLeaders,data);
  const id=auth.player.id;if(data.area==='rune_v2'||data.area==='dragon')this.bossDirty=++this.generation;
  if((this.legacyPaused.get(id)??0)>this.now())return {...data,worldPush:{enabled:false,reason:'byte_budget'}};
  this.legacyPaused.delete(id);
  const roomKey=worldPushRoom(data),roomCacheKey=JSON.stringify([roomKey,colLabPlayerRun(id)]);let room=this.rooms.get(roomCacheKey);if(!room)this.rooms.set(roomCacheKey,room={key:roomKey,cacheKey:roomCacheKey});
  const sub={id,accountId:auth.account?.id,room,data,read,readOwner,rows:new URL(request.url).searchParams.get('pushRevision')==='3',chatAfterId:auth.gamePresence.chatAfterId??0,seq:this.recipientSequences.get(id)??0,lastSentAt:this.now(),instanceId:auth.gamePresence.instanceId,expiresAt:this.now()+65000,invalid:0,refreshing:null,sending:null};
  const previous=this.subscribers.get(id);if(previous)previous.closed=true;
  this.subscribers.set(id,sub);this.seedFriends487(id,friends487??[]);this.arenaQueueDirty=true;this.seedRoom(sub);const next=this.project(sub);sub.last=next;this.stats.snapshotRequests++;if(new URL(request.url).searchParams.get('gap')==='1')this.stats.gaps++;
  return {...next,worldPush:{enabled:true,revision:sub.rows?3:2,protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:roomKey,seq:sub.seq}};
 }
 async refresh(sub){
  const generation=sub.invalid,sharedVersion=sub.sharedVersion,owner=sub.invalidKind==='owner'&&sub.readOwner;
  const ownerTables=owner&&sub.ownerTables441 instanceof Set?[...sub.ownerTables441]:null;
  // Swap the pending set before yielding. Changes committed during a read are
  // accumulated separately and cause another read through the generation fence.
  sub.ownerTables441=undefined;
  try{const data=await (owner?sub.readOwner(ownerTables):sub.read());if(sub.closed)return;if(!data?.players||!data.world){this.remove(sub);return;}
   if(this.db.worldReadFenceEnabledR13?.())await this.db.worldReadDurableR13();else if(this.durability.size)await Promise.all([...this.durability]);
   if(sub.closed)return;if(worldPushRoom(data)!==sub.room.key){this.remove(sub);return;}
   // An owner repair merges only its private fields and owner row. Shared chat
   // and market updates which finished while the reader ran remain current.
   if(owner){
    const {players,ownerOnly,partial,...fields}=data;const own=players.find(p=>p.id===sub.id);
    sub.data={...sub.data,...fields,...(sub.sharedVersion!==sharedVersion&&Object.hasOwn(sub.sharedFields??{},'arenaQueue')?{arenaQueue:sub.sharedFields.arenaQueue}:{}),players:sub.data.players.map(p=>p.id===sub.id?own??p:p)};this.stats.ownerRefreshes++;
   }else{sub.data={...data,...(sub.sharedVersion!==sharedVersion?sub.sharedFields:{})};this.stats.fullRefreshes++;}
   this.seedRoom(sub,!!owner);if(sub.invalid===generation){sub.invalid=0;sub.invalidKind=null;sub.ownerTables441=undefined;}this.stats.internalSnapshots++;
  }catch{this.stats.errors++;this.remove(sub);}finally{sub.refreshing=null;}
 }
 remove(sub){sub.closed=true;if(this.subscribers.get(sub.id)===sub){this.subscribers.delete(sub.id);this.forgetFriends487(sub.id);}}
 tick(){
  if(!this.enabled||this.stopped)return Promise.resolve();if(this.running)return this.running;
  // No recipient, room, active presence or pending projection work: there is
  // nothing to serialize. Admission/seed and every existing invalidation remain.
  if(optimizeR18&&!this.subscribers.size&&!this.rooms.size&&!this.sharedDirty.size&&!this.bossDirty&&!this.arenaQueueDirty&&!this.arenaQueue?.size&&!this.sharedRunning.size&&!this.bossRefreshing&&this.worldLoop?.activePlayers?.size===0){this.totalOnline=0;this.idleSkipsR18=(this.idleSkipsR18??0)+1;return Promise.resolve();}
  const work=this.frames();let cpuMs=0;
  const run=async()=>{try{let more=true;while(more&&!this.stopped&&this.enabled){await deferDatabaseBackgroundTask(()=>{const at=performance.now();more=this.slice(work);const ms=performance.now()-at;cpuMs+=ms;this.stats.slices++;this.stats.sliceMsMax=Math.max(this.stats.sliceMsMax,ms);reportRuntimeWork('world_push_slice',ms,performance.timeOrigin+at);});}}finally{this.stats.ticks++;this.stats.tickCpuMs+=cpuMs;this.stats.tickMsMax=Math.max(this.stats.tickMsMax,cpuMs);this.running=null;}};
  return this.running=run();
 }
 // No yield inside a database transaction. A slice executes only projection /
 // encoding and enqueues signed delivery; the next slice gives network I/O a turn.
 slice(work){const deadline=performance.now()+1;do{if(work.next().done)return false;}while(performance.now()<deadline);return true;}
 async refreshBoss(){const version=this.bossDirty;try{const leaders=await this.readBossLeaders();if(this.db.worldReadFenceEnabledR13?.())await this.db.worldReadDurableR13();else if(this.durability.size)await Promise.all([...this.durability]);if(!this.stopped)this.bossLeaders=leaders;if(this.bossDirty===version)this.bossDirty=0;}catch{this.stats.errors++;}finally{this.bossRefreshing=null;}}
 *frames(){
  if(this.subscribers.size)for(const topic of this.sharedDirty.keys())if(!this.sharedRunning.has(topic))this.sharedRunning.set(topic,this.refreshShared(topic));
  if(this.subscribers.size&&this.bossDirty&&this.readBossLeaders&&!this.bossRefreshing)this.bossRefreshing=this.refreshBoss();
  const now=this.now(),visibility=this.visibilityRevision;
  this.refreshArenaQueue(now);
  const subscribers=[...this.subscribers.values()];
  const presence=this.worldLoop?.enabled?this.worldLoop.activePlayers:this.players.keys();
  this.totalOnline=0;for(const id of presence)if((this.player(id)?.last_seen??0)>=Math.floor(now/1000)-30)this.totalOnline++;
  for(const room of this.rooms.values()){
   const first=subscribers.find(s=>s.room===room);if(!first)continue;
   const common=this.project({id:'',loadlabViewerId:first.id,room,data:first.data});
   const before=room.common;room.common={players:common.players,monsters:common.monsters,combatEvents:common.combatEvents};
   room.previousCommon=before;room.delta=before?diffWorld(before,room.common,{linearDiff:worldDiffLinear}):null;
   yield; if(this.visibilityRevision!==visibility)return;
  }
  for(const sub of subscribers){
   if(sub.closed)continue;
   if(sub.expiresAt<now||!this.player(sub.id)||this.player(sub.id).last_seen<Math.floor(now/1000)-30){this.remove(sub);continue;}
   if(sub.invalid&&!sub.refreshing)sub.refreshing=this.refresh(sub);
   if(sub.sending){this.stats.coalesced++;continue;}
   const live=this.player(sub.id),common=sub.room.common;
   if(this.world?.cycle!==sub.data.world.cycle||live.area!==sub.data.area||live.channel!==sub.data.channel||live.area==='arena'&&live.arena_match_id!==sub.data.arenaMatch?.id){
    const event={type:'world_reset',protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:sub.room.key,seq:this.nextSequence(sub),instanceId:sub.instanceId,cycle:sub.data.world.cycle,area:sub.data.area,channel:sub.data.channel,arenaMatchId:sub.data.arenaMatch?.id??'',reason:'scope'};
    this.drop('scope');this.remove(sub);void Promise.resolve(this.send(sub,event)).catch(()=>{this.stats.errors++;this.drop('error');});continue;
   }
   let next,delta;
   if(live.is_gm===1&&live.gm_invisible===1||!common){next=this.project(sub);delta=diffWorld(sub.last,next,{rows:sub.rows,linearDiff:worldDiffLinear});}
   else {
    const owner=common.players.find(p=>p.id===sub.id),oldOwner=sub.last.players.find(p=>p.id===sub.id);
    let own=owner;
    if(owner&&sub.ownerRow){
     const cached=sub.ownerProjection;
     if(cached?.source===sub.ownerRow&&cached.live===live)own=cached.row;
     else{own={...sub.ownerRow,...pick(live,PLAYER_FIELDS.filter(k=>k!=='realtime_scope_version')),...pick(live,['quest_kills438','quest_fish438','realtime_scope_version'])};sub.ownerProjection={source:sub.ownerRow,live,row:own};}
    }
    const players=common.players.map(p=>p.id===sub.id?own:p);
    next={...sub.data,...common,...timedFields(sub.data,common.monsters,now,id=>this.partyPlayer486(id)),friends:this.friendsView487(sub.id,sub.data.friends,now),...(this.bossLeaders?stoneBossFields476(this.bossLeaders,sub.data.area,sub.data.channel,common.monsters,sub.id):{}),players,totalOnline:this.totalOnline??sub.data.totalOnline,world:this.world?{...sub.data.world,...pick(this.world,Object.keys(sub.data.world))}:sub.data.world,drops:liveDrops503(sub.data.drops,now),serverTime:Math.floor(now/1000),snapshotAtMs:now};
    if(sub.lastCommon===sub.room.previousCommon&&sub.room.delta){
     const privateDelta=diffWorld(sub.last,next,{rows:sub.rows,skipSharedEntities:true,linearDiff:worldDiffLinear});
     delta={entities:{...sub.room.delta.entities,...privateDelta.entities},fields:privateDelta.fields};
     const ownDelta=oldOwner===own?undefined:diffWorld({players:oldOwner?[oldOwner]:[]},{players:own?[own]:[]},{linearDiff:worldDiffLinear}).entities.players;
     if(ownDelta){const shared=delta.entities.players??{upsert:[],remove:[],order:players.map(p=>p.id)};delta.entities.players={...shared,upsert:[...shared.upsert.filter(p=>p.id!==sub.id),...ownDelta.upsert],remove:[...new Set([...shared.remove,...ownDelta.remove])]};}
    }else delta=diffWorld(sub.last,next,{rows:sub.rows,linearDiff:worldDiffLinear});
   }
   const empty=!Object.keys(delta.entities).length&&!Object.keys(delta.fields).length;
   // Keep the diff baseline at the last queued packet. Skipped ticks and empty
   // frames consume no sequence number. A slow recipient gets the latest state.
   if(empty&&now-sub.lastSentAt<1000){sub.lastCommon=common;continue;}
   sub.lastCommon=common;
   if(empty)this.stats.keepalives++;
   const event={type:'world_delta',protocol:WORLD_PUSH_PROTOCOL,epoch:this.epoch,room:sub.room.key,seq:this.nextSequence(sub),instanceId:sub.instanceId,cycle:sub.data.world.cycle,area:sub.data.area,channel:sub.data.channel,arenaMatchId:sub.data.arenaMatch?.id??'',serverTime:next.serverTime,snapshotAtMs:next.snapshotAtMs,...delta};
   this.stats.deltas++;sub.last=next;sub.lastSentAt=now;
   sub.sending=this.sendFrame(sub,event).catch(()=>{this.stats.errors++;this.drop('error');this.remove(sub);}).finally(()=>{sub.sending=null;});
   yield; if(this.visibilityRevision!==visibility)return;
  }
  const occupied=new Set([...this.subscribers.values()].map(s=>s.room.cacheKey));for(const key of this.rooms.keys())if(!occupied.has(key))this.rooms.delete(key);
 }
 // Retain the last queued sequence across repairs, expiry and room changes.
 // An old in-flight packet is then <= the new snapshot cursor and is ignored.
 // This map has at most one entry per observed player (not one per connection).
 nextSequence(sub){const seq=(this.recipientSequences.get(sub.id)??sub.seq)+1;this.recipientSequences.set(sub.id,seq);sub.seq=seq;return seq;}
 snapshot(){const seconds=Math.max(1,(this.now()-this.started)/1000);return {enabled:this.enabled,revision:3,deliveryByStatus:{...this.stats.deliveryByStatus},sharedReads:{...this.stats.sharedReads},ownerRefreshes:this.stats.ownerRefreshes,fullRefreshes:this.stats.fullRefreshes,droppedReasons:{...this.stats.droppedReasons},maxPacketBytes:this.stats.maxPacketBytes,maxDeltaBytes:this.stats.maxDeltaBytes,largestFields:{...this.stats.largestFields},splitFrames:this.stats.splitFrames,splitPackets:this.stats.splitPackets,packets:this.stats.delivered,bytes:this.stats.deliveredBytes,queuedPackets:this.stats.deltas,attemptedBytes:this.stats.bytes,keepalives:this.stats.keepalives,coalesced:this.stats.coalesced,protocol:WORLD_PUSH_PROTOCOL,rooms:this.rooms.size,deltasPerSec:this.stats.delivered/seconds,bytesPerSec:this.stats.deliveredBytes/seconds,snapshotRequests:this.stats.snapshotRequests,gaps:this.stats.gaps,dropped:this.stats.dropped,errors:this.stats.errors,worldReadsPerSec:this.stats.worldReads/seconds,worldReads:this.stats.worldReads,readModes:{...this.stats.readModes},internalSnapshots:this.stats.internalSnapshots,seedRows:this.stats.seedRows,seedCpuMs:this.stats.seedCpuMs,seedMsMax:this.stats.seedMsMax,invalidations:{...this.stats.invalidations},playerInvalidations:{...this.stats.playerInvalidations},tickMsMax:this.stats.tickMsMax,tickCpuMs:this.stats.tickCpuMs,tickMsMean:this.stats.tickCpuMs/Math.max(1,this.stats.ticks),ticks:this.stats.ticks,slices:this.stats.slices,sliceMsMax:this.stats.sliceMsMax};}
 stop(){this.stopped=true;for(const sub of this.subscribers.values())this.remove(sub);clearInterval(this.timer);}
}
