// Native respawn publishes to the room being left. CORE511 resolves durable
// recipients after SQL has moved the actor, so that room no longer includes
// the actor. Keep its observer event and add a private copy of the same
// committed life transition. All values below come from native SQL/results.
export function respawnActorNotificationR85(events,{actor,before,after,result}){
 const body=result?.body;
 if(result?.status!==200||body?.ok!==true||before?.id!==actor||after?.id!==actor||
  !(before.hp<=0&&after.hp>0)||after.respawn_at_ms!==0||
  !Number.isSafeInteger(before.hp_revision)||!Number.isSafeInteger(after.hp_revision)||after.hp_revision<=before.hp_revision||
  after.channel!==before.channel||typeof after.area!=='string'||!after.area||after.area===before.area)return events;
 const matches=value=>value?.hp===after.hp&&value.maxHp===after.max_hp&&value.hpRevision===after.hp_revision&&
  value.area===after.area&&value.x===after.x&&value.y===after.y;
 if(!matches(body))return events;
 const source=events.find(args=>Array.isArray(args)&&args[0]===before.world_cycle&&args[1]===before.channel&&
  args[2]===before.area&&args[3]?.type==='player_respawn'&&args[3].playerId===actor&&matches(args[3]));
 if(!source)return events;
 const event=source[3];
 if(events.some(args=>Array.isArray(args?.[3])&&args[3].includes(actor)&&args[4]?.type==='player_respawn'&&args[4].eventId===event.eventId))return events;
 return [...events,[source[0],after.channel,after.area,[actor],{...event}]];
}

// This exception is only for the single actor's committed cross-area respawn.
// The generic native private-event allowlist remains unchanged.
export function validRespawnActorRouteR85(route){
 const event=route?.event,actor=route?.actors?.[0],stamp=typeof event?.eventId==='string'?Number(event.eventId.split(':')[1]):NaN;
 return Array.isArray(route?.actors)&&route.actors.length===1&&typeof actor==='string'&&/^[A-Za-z0-9_-]{1,80}$/.test(actor)&&
  event?.type==='player_respawn'&&event.playerId===actor&&Number.isSafeInteger(stamp)&&stamp>0&&event.eventId==='respawn:'+stamp+':'+actor&&
  Number.isSafeInteger(route.cycle)&&route.cycle>0&&Array.isArray(route.channels)&&route.channels.length===1&&[1,2,3,4].includes(route.channels[0])&&
  typeof route.area==='string'&&route.area!=='arena'&&route.area===event.area&&!route.rooms&&!route.arena&&
  Number.isFinite(event.hp)&&event.hp>0&&Number.isFinite(event.maxHp)&&event.maxHp>=event.hp&&
  Number.isSafeInteger(event.hpRevision)&&event.hpRevision>0&&Number.isFinite(event.x)&&Number.isFinite(event.y);
}
