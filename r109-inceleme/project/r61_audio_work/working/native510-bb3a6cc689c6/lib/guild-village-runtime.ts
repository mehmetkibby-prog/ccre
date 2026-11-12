export function guildVillageService():any{return (globalThis as any).__colGuildVillage??null;}
export async function publishGuildEjections(events:any[]){
 if(!events.length)return;
 const [{db},{publishRealtimeRoomEvent}]=await Promise.all([import('./game-world'),import('./realtime-room')]);
 const cycle=await db().prepare('SELECT cycle FROM world_state WHERE id=1').first<{cycle:number}>();
 await Promise.all(events.map(({oldArea,channel,...event})=>publishRealtimeRoomEvent(cycle?.cycle??1,channel,oldArea,{...event,type:'player_respawn',respawnAtMs:0,serverAt:Date.now()})));
}
