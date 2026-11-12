import {isAdventureArea} from '../adventure-maps.mjs';
import {eventForViewer} from "../../../../native510-bb3a6cc689c6/realtime-server/src/visibility.mjs";
// Native sender bodies are unchanged; area validation and room construction
// also recognize strict adventure IDs. Authenticated sockets remain scoped.
export function createNativeNotificationRules({socketsByPlayer,hiddenPlayer,motionCorkR11,clock=Date.now}){
 const Date={now:clock},traffic={bytesSent:0,framesSent:0};
 const MAX_EVENT_BYTES = 24_000;
function roomKey({ cycle, channel, area, arenaMatchId }) {
  const arenaScope = area === "arena" && typeof arenaMatchId === "string" && /^[A-Za-z0-9-]{8,64}$/.test(arenaMatchId)
    ? `:match:${arenaMatchId}` : area === "arena" ? ":match:invalid" : "";
  return `cycle:${Math.max(1, Math.floor(Number(cycle) || 1))}:channel:${Math.max(1, Math.floor(Number(channel) || 1))}:area:${area}${arenaScope}`;
}
function safeArea(value) {
  if(isAdventureArea(value))return value;
  return typeof value === "string" && /^(zumrut|forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(value) ? value : null;
}
function send(socket, payload, essential = true) {
  motionCorkR11.prepare(socket,essential);
  if(socket.player?.area?.startsWith('guild_hall_')&&socket.player.leaseExpiresAt<=Date.now()){socket.close(4003,'Guild access lease expired');return false;}
  if (socket.readyState !== 1) return false;
  if (socket.bufferedAmount > 1_048_576) {
    socket.close(1013, "Client too slow");
    return false;
  }
  // Superseded movement must not accumulate behind a slow connection.
  if (!essential && socket.bufferedAmount > 8_192) return false;
  const encoded = Buffer.isBuffer(payload) ? payload
    : Buffer.from(typeof payload === "string" ? payload : JSON.stringify(payload));
  if (encoded.length > MAX_EVENT_BYTES) return false;
  // Shared UTF-8 buffers must retain the existing JSON text-frame protocol.
  motionCorkR11.send(socket,encoded,essential);
  traffic.bytesSent+=encoded.length;traffic.framesSent++;
  return true;
}
function broadcast(room, payload, except, essential = true, labAudience = null) {
  // Encode ordinary room fanout once; viewer-specific projections still pass
  // through send separately. Server text frames do not mutate this buffer.
  const encoded = Buffer.from(JSON.stringify(payload));
  if (encoded.length > MAX_EVENT_BYTES) return;
  const project = hiddenPlayer(payload.playerId) || hiddenPlayer(payload.targetId) || hiddenPlayer(payload.attackerId) || hiddenPlayer(payload.actorId);
  for (const client of room.clients) {
    if (client === except || labAudience && !labAudience.has(client.player?.playerId)) continue;
    const visibleEvent = project ? eventForViewer(payload, hiddenPlayer, client.player?.playerId) : payload;
    if (visibleEvent) send(client, visibleEvent === payload ? encoded : visibleEvent, essential);
  }
}
function broadcastWorldEvent(cycle, event) {
  const safeCycle = cycle;
  const message = event?.message;
  const messageId = message?.id;
  if (!Number.isSafeInteger(safeCycle) || safeCycle < 1
    || event?.type !== "chat_message" || !["world", "trade"].includes(event?.chatScope)
    || event?.cycle !== safeCycle
    || !Number.isSafeInteger(messageId) || messageId < 1
    || event?.eventId !== `chat-message:${messageId}`
    || message?.scope !== event?.chatScope || message?.recipient_id !== null || message?.area !== null
    || typeof message?.player_id !== "string" || !/^[A-Za-z0-9_-]{1,80}$/.test(message.player_id)
    || typeof message?.player_name !== "string" || message.player_name.length < 1 || message.player_name.length > 40
    || typeof message?.body !== "string" || message.body.length < 1 || message.body.length > 140
    || !Number.isSafeInteger(message?.channel) || message.channel < 1 || message.channel > 100
    || !Number.isSafeInteger(message?.created_at) || message.created_at < 1) {
    throw new Error("invalid_world_event");
  }
  const now = Date.now();
  const encoded = Buffer.from(JSON.stringify({ ...event, serverAt: Number(event.serverAt) || now }));
  if (encoded.length > MAX_EVENT_BYTES) return 0;
  let delivered = 0;
  for (const socket of socketsByPlayer.values()) {
    if(socket.player?.area?.startsWith('guild_hall_')&&socket.player.leaseExpiresAt<=now){socket.close(4003,'Guild access lease expired');continue;}
    if (socket.player?.cycle !== safeCycle) continue;
    if (send(socket, encoded)) delivered += 1;
  }
  return delivered;
}
function broadcastPlayerEvent(cycle, audience, event) {
 if(!Number.isSafeInteger(cycle)||cycle<1||!Array.isArray(audience)||audience.length<1||audience.length>(event?.type==='guild_changed'?80:8)
  ||audience.some(id=>typeof id!=="string"||!/^[A-Za-z0-9_-]{1,80}$/.test(id))
  ||!['direct_message','party_invite','trade_changed','guild_changed','world_delta','world_reset','pvp_gem_loss479'].includes(event?.type))throw new Error('invalid_private_event');
 if(event.type==='pvp_gem_loss479'&&(audience.length!==1||event.targetId!==audience[0]||!Number.isSafeInteger(event.hpRevision)||event.hpRevision<1||!Number.isSafeInteger(event.pvpGemsLost479)||event.pvpGemsLost479<0||event.eventId!=='pvp-gems479:'+event.targetId+':'+event.hpRevision))throw Error('invalid_pvp_gem_loss479');
 if(event.type==='guild_changed'&&(typeof event.eventId!=='string'||!/^[A-Za-z0-9_-]{1,120}$/.test(event.eventId)))throw new Error('invalid_guild_event');
 if(event.type==='direct_message'){
  const m=event.message;
  if(!Number.isSafeInteger(m?.id)||m.id<1||m.scope!=='direct'||event.eventId!==`direct-message:${m.id}`
   ||!m.player_id||!m.recipient_id||audience.some(id=>id!==m.player_id&&id!==m.recipient_id))throw new Error('invalid_private_message');
 }
 if(['world_delta','world_reset'].includes(event.type)){
  if(audience.length!==1||event.protocol!=='world-delta-v1'||event.cycle!==cycle||!Number.isSafeInteger(event.seq)||event.seq<1||typeof event.epoch!=='string'||typeof event.instanceId!=='string')throw Error('invalid_world_delta');
  const socket=socketsByPlayer.get(audience[0]),p=socket?.player;
  if(!p||p.cycle!==cycle||p.channel!==event.channel||p.area!==event.area||p.instanceId!==event.instanceId||(p.area==='arena'&&(p.arenaMatchId!==event.arenaMatchId||!p.arenaMatchId)))return 0;
  if(event.room!==JSON.stringify([cycle,p.channel,p.area,p.area==='arena'?p.arenaMatchId:'']))throw Error('invalid_world_scope');
  for(const row of event.entities?.players?.upsert??[])if(hiddenPlayer(row.id)&&row.id!==p.playerId)throw Error('hidden_world_player');
  for(const row of event.entities?.monsters?.upsert??[])for(const id of row.targetIds??[])if(hiddenPlayer(id)&&id!==p.playerId)throw Error('hidden_world_target');
  for(const row of event.entities?.combatEvents?.upsert??[])if((hiddenPlayer(row.player_id)&&row.player_id!==p.playerId)||(hiddenPlayer(row.target_id)&&row.target_id!==p.playerId))throw Error('hidden_world_combat');
  for(const row of event.entities?.drops?.upsert??[])if(row.owner_id!==undefined&&row.owner_id!==p.playerId)throw Error('private_world_drop');
  for(const key of ['inventory','storageItems'])for(const row of event.entities?.[key]?.upsert??[])if(row.player_id!==undefined&&row.player_id!==p.playerId)throw Error('private_world_inventory');
  for(const row of event.entities?.directMessages?.upsert??[])if(row.player_id!==undefined&&row.recipient_id!==undefined&&row.player_id!==p.playerId&&row.recipient_id!==p.playerId)throw Error('private_world_message');
  if(event.frame&&(!Number.isInteger(event.frame.index)||!Number.isInteger(event.frame.total)||event.frame.total<2||event.frame.total>128||event.frame.index<0||event.frame.index>=event.frame.total))throw Error('invalid_world_frame');
  for(const segment of event.fieldSegments??[])if(!['settings','halloweenEvent456','ranks','eventIsland','dragon','premiumPrices','party','partyInvite','starterReward','globalAnnouncement','gmAnnouncement','arenaQueue','arenaMatch','arenaResult','playerVisibility','bossLeaders','leaders','dungeonWings'].includes(segment.key)||typeof segment.text!=='string')throw Error('invalid_world_field_segment');
  return send(socket,event)?1:0;
 }
 const {audiencePlayerIds,recipients,...safeEvent}=event;
 let delivered=0;
 for(const id of new Set(audience)){const socket=socketsByPlayer.get(id);if(socket?.player?.cycle===cycle&&send(socket,{...safeEvent,serverAt:Number(event.serverAt)||Date.now()}))delivered++;}
 return delivered;
}
function safeArenaMatchId(value) {
	return typeof value === "string" && /^[A-Za-z0-9-]{8,64}$/.test(value) ? value : "";
}
function realtimeRoomName(cycle, channel, area, arenaMatchId) {
	const safeCycle = Math.max(1, Math.floor(Number(cycle) || 1));
	const safeChannel = Math.max(1, Math.floor(Number(channel) || 1));
	const safeArea = isAdventureArea(area) ? area : /^(zumrut|forest|frozen|bazaar|fishing|sanctum|sinsi|war|arena|black|ancient|event|rune|rune_v2|afk|dragon|guild_village_[1-9][0-9]{0,3}|guild_hall_[A-Za-z0-9-]{1,64})$/.test(area) ? area : "forest";
	return `cycle:${safeCycle}:channel:${safeChannel}:area:${safeArea}${safeArea === "arena" ? `:match:${safeArenaMatchId(arenaMatchId) || "invalid"}` : ""}`;
}
 return {roomKey,safeArea,safeArenaMatchId,realtimeRoomName,broadcast,broadcastWorldEvent,broadcastPlayerEvent,MAX_EVENT_BYTES};
}
