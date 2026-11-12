import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,manifest,hash,native} from './helpers.mjs';
const lab=await native('vds-server/src/loadlab-gameplay.mjs'),{eventForViewer}=await native('realtime-server/src/visibility.mjs');
function declarations(file,names){const source=fs.readFileSync(path.join(BASE,file),'utf8');assert.equal(hash(source),manifest.files.find(r=>r.path===file).sha256);const ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});return names.map(name=>{const n=ast.body.map(n=>n.declaration??n).find(n=>(n.id?.name??n.declarations?.[0]?.id?.name)===name);assert(n,name);return source.slice(n.start,n.end);}).join('\n');}
const sender=declarations('realtime-server/src/rooms.mjs',['MAX_EVENT_BYTES','roomKey','safeArea','send','broadcast','broadcastWorldEvent','broadcastPlayerEvent','applyPlayerState','broadcastAuthoritativeEvent','rememberVisibility','visibilityEvent']);
const publisher=declarations('dist-vds/server/channel-runtime/index.mjs',['safeArenaMatchId','realtimeRoomName','publishRealtimeRoomEvent','publishRealtimeWorldEvent','publishRealtimePlayerEvent','publishDedicatedRoomEvent','publishDedicatedWorldEvent','colLabPublishAudience']);

// Original VDS publishers -> original dedicated senders, with only the signed
// HTTP transport replaced by an in-memory call and an output collector. V510
// environment.mjs intentionally returns undefined for GAME_ROOMS on VDS.
export async function originalNotificationViews(route,players,{clock=()=>100000}={}){
 const socketsByPlayer=new Map(),rooms=new Map(),events=new Map(),hidden=id=>players.some(p=>p.id===id&&p.is_gm===1&&p.gm_invisible===1);
 const names=['Buffer','Date','socketsByPlayer','rooms','hiddenPlayer','motionCorkR11','eventForViewer','colLabValidateRoomAudience'];
 const values=[Buffer,{now:clock},socketsByPlayer,rooms,hidden,{prepare(){},send(socket,bytes){events.set(socket.player.playerId,JSON.parse(bytes));}},eventForViewer,lab.colLabValidateRoomAudience];
 const original=new Function(...names,`const traffic={bytesSent:0,framesSent:0},visibilityStates=new Map(),revokedSecurityVersions=new Map();\n${sender}\nreturn {roomKey,broadcastAuthoritativeEvent,broadcastWorldEvent,broadcastPlayerEvent};`)(...values);
 for(const p of players){const player={...p,playerId:p.id,cycle:p.world_cycle??p.cycle,arenaMatchId:p.arena_match_id??'',instanceId:p.instanceId??'',leaseExpiresAt:Infinity},socket={player,readyState:1,bufferedAmount:0,close(){this.readyState=3;}};socketsByPlayer.set(p.id,socket);const key=original.roomKey(player),room=rooms.get(key)??{clients:new Set(),players:new Map()};room.clients.add(socket);room.players.set(p.id,player);rooms.set(key,room);}
 const deliverDedicatedEvent=async(url,text)=>{const p=JSON.parse(text);return url==='/internal/broadcast-players'?original.broadcastPlayerEvent(p.cycle,p.audiencePlayerIds,p.event):url==='/internal/broadcast-world'?original.broadcastWorldEvent(p.cycle,p.event):original.broadcastAuthoritativeEvent(p.room,p.event);};
 const calls=new Function('Date','hasRealtimeSigningKey','deliverDedicatedEvent','publishDurableRoomEvent','colLabEventAudience','colLabPlayerRun',`${publisher}\nreturn {publishRealtimeRoomEvent,publishRealtimeWorldEvent,publishRealtimePlayerEvent};`)({now:clock},()=>true,deliverDedicatedEvent,async()=>false,lab.colLabEventAudience,lab.colLabPlayerRun);
 if(route.actors)await calls.publishRealtimePlayerEvent(route.cycle,route.channels[0],route.area,route.actors,route.event,route.arena);
 else if(route.rooms)await calls.publishRealtimeWorldEvent(route.cycle,route.rooms,route.event);
 else for(const channel of new Set(route.channels))await calls.publishRealtimeRoomEvent(route.cycle,channel,route.area,route.event,route.arena);
 return events;
}
