import {prepareCached477} from './writer-statements.mjs';
import {createNativeNotificationRules} from './generated/notification-rules.mjs';
import {colLabEventAudience} from './generated/world-projection-rules.mjs';
import {demand} from './contract.mjs';
import {r35Options} from './r35-options.mjs';
import {presenceStaleSkip} from './r47-options.mjs';
import {validRespawnActorRouteR85} from './respawn-notification-r85.mjs';

let lastInvalidWorldNotice=-Infinity;

const eventActors=event=>[...new Set([event.playerId,event.targetId,event.attackerId,event.actorId].filter(id=>typeof id==='string'&&id.length))];
const freezeEvent=value=>{if(value&&typeof value==='object'){for(const child of Object.values(value))freezeEvent(child);Object.freeze(value);}return value;};
const freeScratch=[];
const socketFields=['playerId','cycle','channel','area','arenaMatchId','instanceId','leaseExpiresAt'];
const scratch=()=>freeScratch.pop()??{rows:new Map(),sockets:new Map(),clients:new Set(),slots:[]};
function releaseScratch(pool){
 pool.rows.clear();pool.sockets.clear();pool.clients.clear();
 for(const socket of pool.slots)for(const key of socketFields)socket.player[key]=null;
 if(freeScratch.length<4)freeScratch.push(pool);
}

// Select presentation recipients through the original native senders. These
// temporary sockets are a snapshot of authenticated admissions, never sockets
// supplied by the browser. Live session/epoch checks remain at mailbox delivery.
export function notificationViews(route,players,{clock=Date.now,hidden=null,immutableEvents=false,recipientsOnly=false}={}){
 const pool=scratch(),rows=pool.rows,socketsByPlayer=pool.sockets,events=new Map(),concealed=new Set(route.concealed??[]);
 try{
 for(const p of players)rows.set(p.id,p);
 const hiddenPlayer=id=>concealed.has(id)||Boolean(hidden?.(id))||rows.get(id)?.is_gm===1&&rows.get(id)?.gm_invisible===1;
 let slot=0;for(const [id,p]of rows){
  let socket=pool.slots[slot];if(!socket){socket={readyState:1,bufferedAmount:0,close(){this.readyState=3;},player:{}};if(slot<128)pool.slots[slot]=socket;}slot++;
  socket.readyState=1;socket.bufferedAmount=0;const player=socket.player;player.playerId=id;player.cycle=p.world_cycle??p.cycle;player.channel=p.channel;player.area=p.area;player.arenaMatchId=p.arena_match_id??p.arenaMatchId??'';player.instanceId=p.instance_id??p.instanceId??'';player.leaseExpiresAt=Infinity;socketsByPlayer.set(id,socket);
 }
 // Native send already shares an encoded buffer when all viewers see the
 // same event. Only the transient hot fanout may share its parsed, deeply
 // frozen value. Viewer-specific buffers still have independent projections.
 const decoded=immutableEvents?new WeakMap():null;
 const rules=createNativeNotificationRules({socketsByPlayer,hiddenPlayer,clock,motionCorkR11:{prepare(){},send(socket,encoded){if(recipientsOnly){events.set(socket.player.playerId,true);return;}let value=decoded?.get(encoded);if(!value){value=JSON.parse(encoded);if(decoded){freezeEvent(value);decoded.set(encoded,value);}}events.set(socket.player.playerId,value);}}});
 if(route.actors){
  if(route.event?.type==='player_respawn'){
   demand(validRespawnActorRouteR85(route)&&rules.safeArea(route.area)===route.area,'notification_scope');
   const socket=socketsByPlayer.get(route.actors[0]),player=socket?.player;
   // The old epoch is fenced by the mailbox. Also discard a delayed respawn
   // after the actor has left its committed destination scope.
   if(player?.cycle!==route.cycle||player.channel!==route.channels[0]||player.area!==route.area)return events;
   rules.broadcast({clients:new Set([socket])},{...route.event,serverAt:Number(route.event.serverAt)||clock()});
   return events;
  }
  const audience=[...new Set(route.actors.filter(id=>typeof id==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(id)))];
  if(audience.length)rules.broadcastPlayerEvent(route.cycle,audience,route.event);
  return events;
 }
 if(route.rooms){
  try{rules.broadcastWorldEvent(route.cycle,route.event);}catch(error){
   if(!presenceStaleSkip||error?.message!=='invalid_world_event')throw error;
   // Malformed cosmetic mail is not a channel/transaction failure. Never
   // swallow other errors or include player/chat payloads in diagnostics.
   const now=Date.now();if(now-lastInvalidWorldNotice>=5000){lastInvalidWorldNotice=now;console.warn('core511_notification_skipped invalid_world_event');}
  }
  return events;
 }
 demand(Array.isArray(route.channels)&&typeof route.area==='string','notification_scope');
 // V510's room publisher rejects an absent/invalid arena match before send.
 if(route.area==='arena'&&!rules.safeArenaMatchId(route.arena))return events;
 const area=rules.safeArea(route.area)??'forest';
 for(const channel of new Set(route.channels.map(n=>Math.max(1,Math.floor(Number(n)||1))))){
  const key=rules.realtimeRoomName(route.cycle,channel,area,route.arena),clients=pool.clients;clients.clear();
  for(const socket of socketsByPlayer.values())if(rules.roomKey(socket.player)===key)clients.add(socket);
  const audience=colLabEventAudience(route.event,channel,area);if(audience?.length===0)continue;
  // These are security coordinator controls in CORE511, not cosmetic mail.
  demand(!['gm_visibility','force_disconnect','direct_message','trade_changed','world_delta','world_reset','pvp_gem_loss479'].includes(route.event.type),'notification_requires_private_or_security_route');
  rules.broadcast({clients},{...route.event,serverAt:Number(route.event.serverAt)||clock()},undefined,true,audience?new Set(audience):null);
 }
 return events;
 }finally{releaseScratch(pool);}
}

export function captureNotificationVisibility(sql,route){
 demand(sql.isTransaction,'notification_requires_game_transaction');
 const concealed=eventActors(route.event).filter(id=>{const row=prepareCached477(sql,'SELECT is_gm,gm_invisible FROM players WHERE id=?').get(id);return row?.is_gm===1&&row.gm_invisible===1;});
 return concealed.length?{...route,concealed}:route;
}

export function resolveNativeNotificationRecipients(sql,route){
 demand(sql.isTransaction,'notification_requires_game_transaction');
 if(r35Options.outboxV2)return resolveRoutedRecipients(sql,route);
 const players=prepareCached477(sql,`SELECT p.id,COALESCE((SELECT cycle FROM world_state WHERE id=1),1) AS world_cycle,p.channel,p.area,p.arena_match_id,p.is_gm,p.gm_invisible
  FROM kernel511_admissions a JOIN kernel511_channel_owners o ON o.player_id=a.player_id AND o.channel=a.channel AND o.epoch=a.epoch
  JOIN kernel511_channel_processes c ON c.channel=o.channel AND c.incarnation=o.incarnation AND c.online=1
  JOIN players p ON p.id=a.player_id AND p.channel=a.channel
  WHERE o.state IN('active','draining') ORDER BY a.player_id LIMIT 101`).all();
 demand(players.length<=100,'notification_admission_capacity');
 return [...notificationViews(route,players,{recipientsOnly:true}).keys()];
}

const routing=createNativeNotificationRules({socketsByPlayer:new Map(),hiddenPlayer:()=>false,motionCorkR11:{}});
function resolveRoutedRecipients(sql,route){
 let where='',bindings=[];
 if(route.actors){where=' AND p.id IN (SELECT value FROM json_each(?))';bindings=[JSON.stringify(route.actors)];}
 else if(!route.rooms){
  demand(Array.isArray(route.channels)&&typeof route.area==='string','notification_scope');
  if(route.area==='arena'&&!routing.safeArenaMatchId(route.arena))return [];
  where=' AND p.channel IN (SELECT value FROM json_each(?)) AND p.area=?';bindings=[JSON.stringify([...new Set(route.channels.map(n=>Math.max(1,Math.floor(Number(n)||1))))]),routing.safeArea(route.area)??'forest'];
  if(route.area==='arena'){where+=' AND p.arena_match_id=?';bindings.push(route.arena);}
 }
 // Bound each route's read/insert batch, not the global number of players.
 // Admission still enforces 25/channel. A malformed/old excess admission can
 // no longer crash a valid actor's economic commit at the old 101st row.
 const query=`SELECT p.id,COALESCE((SELECT cycle FROM world_state WHERE id=1),1) AS world_cycle,p.channel,p.area,p.arena_match_id,p.is_gm,p.gm_invisible
  FROM kernel511_admissions a JOIN kernel511_channel_owners o ON o.player_id=a.player_id AND o.channel=a.channel AND o.epoch=a.epoch
  JOIN kernel511_channel_processes c ON c.channel=o.channel AND c.incarnation=o.incarnation AND c.online=1
  JOIN players p ON p.id=a.player_id AND p.channel=a.channel
  WHERE o.state IN('active','draining')${where} AND p.id>? ORDER BY p.id LIMIT 64`;
 const hidden=new Set([...(route.concealed??[]),...eventActors(route.event).filter(id=>{const p=prepareCached477(sql,'SELECT is_gm,gm_invisible FROM players WHERE id=?').get(id);return p?.is_gm===1&&p.gm_invisible===1;})]);
 const actors=[];let after='';for(;;){const rows=prepareCached477(sql,query).all(...bindings,after);if(!rows.length)break;actors.push(...notificationViews(route,rows,{recipientsOnly:true,hidden:id=>hidden.has(id)}).keys());if(rows.length<64)break;after=rows.at(-1).id;}return actors;
}
