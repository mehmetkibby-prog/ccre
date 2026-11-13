export const DUNGEON_LOBBY_READ_R113='dungeon-lobby-read-r113';
const failed=(code,status=503,body)=>Object.assign(Error(code),{code,status,body});

export function readDungeonLobbyR113(client){
 if(client.lobbyReadR113?.generation===client.connection)return client.lobbyReadR113.promise;
 const generation=client.connection,epoch=client.epoch,channel=client.world?.channel,revision=client.dungeonRevisionR113??0;
 const controller=new AbortController();let timer;
 const slot={generation,promise:null};
 const work=async()=>{
  client.assertAvailable();
  const r=await client.fetch(client.origin+'/api/realtime/core511-dungeon-lobby',{method:'POST',credentials:'same-origin',signal:controller.signal,headers:client.headers(),body:JSON.stringify({protocol:'coreoflife-kernel-v1',epoch,channel})}),value=await r.json();
  client.assertAvailable();
  if(controller.signal.aborted)throw failed('dungeon_lobby_read_timeout');
  if(client.connection!==generation||client.epoch!==epoch||!client.ready)throw failed('dungeon_lobby_owner_changed',409);
  // A room push or user command that arrived later owns the displayed state.
  if((client.dungeonRevisionR113??0)!==revision){if(client.dungeon)return client.dungeon;throw failed('dungeon_lobby_superseded',409);}
  if(r.status===409&&value.resident===true)return null;
  if(!r.ok)throw failed(value.code??'dungeon_read_unavailable_r113',r.status,value);
  if(value.protocol!=='coreoflife-kernel-v1'||value.channel!==channel||value.epoch!==epoch||value.body?.run!==null)throw failed('dungeon_lobby_reply_scope');
  client.dungeon=value.body;client.emit('dungeon',value.body);return value.body;
 };
 // Timeout belongs only to this UI read; it never closes the game socket or
 // rejects a combat command. Fetch implementations ignoring abort stay fenced.
 slot.promise=Promise.race([work(),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(failed('dungeon_lobby_read_timeout'));},5000);})]).finally(()=>{clearTimeout(timer);if(client.lobbyReadR113===slot)client.lobbyReadR113=null;});
 client.lobbyReadR113=slot;return slot.promise;
}
