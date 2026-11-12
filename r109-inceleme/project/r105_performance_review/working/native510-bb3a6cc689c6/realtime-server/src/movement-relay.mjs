import {relayPerf477,optionalPerfBudget477} from './perf-timing477.mjs';
import {WebSocketServer} from 'ws';
import {isLocalBroadcastRequest} from './broadcast-ingress.mjs';
import {MOVEMENT_PROTOCOL,MOVEMENT_STREAM_PATH,MOVEMENT_BATCH_LIMIT,MOVEMENT_FRAME_LIMIT,movementPayload} from './movement-wire.mjs';

// The game connects to this loopback-only, signed upgrade. Browser sockets can
// submit intentions only; an ACK is returned after the game confirms its WAL.
export function createMovementRelay({verify,clients,timeoutMs=1800,windowMs=2}={}) {
  const wss=new WebSocketServer({noServer:true,maxPayload:MOVEMENT_FRAME_LIMIT,perMessageDeflate:false});
  const bridges=new Map();let upgrades=0,timer=null,serial=0;
  const pending=new Map();let queue=[];
  const stats={batches:0,checkpoints:0,completed:0,rejected:0,timeouts:0};
  const bridgeFor=channel=>bridges.get(channel)??(bridges.size===1?bridges.get(0):null);
  const ready=channel=>channel===undefined?[...bridges.values()].some(s=>s.readyState===1):bridgeFor(channel)?.readyState===1;
  const send=(socket,value)=>{if(socket.readyState===1&&socket.bufferedAmount<262144)socket.send(JSON.stringify(value));};
  function notify(){for(const socket of clients())if(socket.player?.movementGrant)send(socket,{type:'movement_transport',protocol:MOVEMENT_PROTOCOL,ready:ready(socket.player.channel)});}
  function finish(item,status,data,diagnostics477){
    if(!pending.delete(item.key))return;
    clearTimeout(item.timer);
    if(item.socket.movementPending===item)item.socket.movementPending=null;
    const reply=optionalPerfBudget477({type:'movement_ack',protocol:MOVEMENT_PROTOCOL,streamId:item.streamId,id:item.id,status,data,...(diagnostics477?relayPerf477(diagnostics477,item):{})},MOVEMENT_FRAME_LIMIT);
    item.socket.movementLast={id:item.id,reply};
    if(item.socket.player?.connectionId===item.streamId)send(item.socket,reply);
  }
  function unavailable(item){stats.timeouts++;finish(item,503,{error:'Hareket bağlantısı yenileniyor.',code:'movement_transport_unavailable'});}
  function flush(){
    clearTimeout(timer);timer=null;
    while(queue.length){
      const batch=queue.splice(0,MOVEMENT_BATCH_LIMIT).filter(item=>pending.has(item.key));
      if(!batch.length)continue;
      const groups=new Map();
      for(const item of batch){const bridge=bridgeFor(item.wire.channel);if(!bridge||bridge.readyState!==1||bridge.bufferedAmount>MOVEMENT_FRAME_LIMIT){unavailable(item);continue;}let rows=groups.get(bridge);if(!rows)groups.set(bridge,rows=[]);item.bridge=bridge;rows.push(item);}
      for(const [bridge,rows]of groups){for(const item of rows)if(item.receivedAt477!==undefined)item.sentAt477=performance.now();bridge.send(JSON.stringify({type:'movement_batch',items:rows.map(item=>item.wire)}));stats.batches++;}
    }
  }
  wss.on('connection',(socket,channel)=>{
    const previous=bridges.get(channel);bridges.set(channel,socket);previous?.close(1012,'Game process replaced');
    // Never transfer queued work/credentials from an earlier game process.
    for(const item of [...pending.values()])if(item.bridge===previous||item.wire.channel===channel)unavailable(item);
    queue=queue.filter(item=>pending.has(item.key));
    socket.send(JSON.stringify({type:'movement_ready',protocol:MOVEMENT_PROTOCOL}));notify();
    socket.on('message',(bytes,binary)=>{
      if(socket!==bridges.get(channel)||binary)return;
      let message;try{message=JSON.parse(bytes.toString());}catch{return socket.close(1007,'Invalid movement response');}
      if(message?.type!=='movement_results'||!Array.isArray(message.items)||message.items.length>MOVEMENT_BATCH_LIMIT)return socket.close(1008,'Invalid movement response');
      for(const row of message.items){
        const item=pending.get(row?.key);
        if(!item||item.bridge!==socket||!Number.isInteger(row.status)||row.status<200||row.status>599||!row.data||typeof row.data!=='object')continue;
        stats.completed++;finish(item,row.status,row.data,row);
      }
    });
    socket.on('close',()=>{if(bridges.get(channel)!==socket)return;bridges.delete(channel);for(const item of [...pending.values()])if(item.bridge===socket)unavailable(item);queue=queue.filter(item=>pending.has(item.key));notify();});
    socket.on('error',()=>{});
  });
  return {
    get available(){return ready();},
    availableFor:channel=>ready(channel),
    snapshot:()=>({protocol:MOVEMENT_PROTOCOL,ready:ready(),channels:[...bridges].map(([channel,socket])=>({channel,ready:socket.readyState===1})),pending:pending.size,...stats}),
    async upgrade(request,socket,head){
      if(!isLocalBroadcastRequest(request)||upgrades>=8){socket.destroy();return;}
      const pathname=new URL(request.url,'http://localhost').pathname;
      const channel=pathname===MOVEMENT_STREAM_PATH?0:Number(pathname.slice(`${MOVEMENT_STREAM_PATH}/channel/`.length));
      if(pathname!==MOVEMENT_STREAM_PATH&&!([1,2,3].includes(channel)&&pathname===`${MOVEMENT_STREAM_PATH}/channel/${channel}`)){socket.destroy();return;}
      upgrades++;
      try{
        if(!await verify(request.headers,pathname,'','GET')||socket.destroyed){socket.destroy();return;}
        wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,channel));
      }catch{socket.destroy();}finally{upgrades--;}
    },
    handle(socket,message){
      const player=socket.player;
      if(!player||socket.readyState!==1)return;
      const diagnostic477=Boolean(player.loadlabRunId&&globalThis.__colLoadLab?.playerRun(player.playerId)===player.loadlabRunId),receivedAt477=diagnostic477?performance.now():undefined;
      const reject=(status,code)=>{stats.rejected++;send(socket,{type:'movement_ack',protocol:MOVEMENT_PROTOCOL,streamId:player.connectionId,id:message.id,status,data:{error:'Hareket doğrulanamadı.',code}});};
      if(!Number.isSafeInteger(message.id)||message.id<1||message.streamId!==player.connectionId)return reject(400,'invalid_movement');
      if(socket.movementLast?.id===message.id){send(socket,socket.movementLast.reply);return;}
      if(message.id<=(socket.movementLast?.id??0))return reject(409,'movement_checkpoint_stale');
      if(socket.movementPending){if(socket.movementPending.id!==message.id)reject(429,'movement_busy');return;}
      const payload=movementPayload(message);
      if(!payload||payload.area!==player.area||(payload.motionStreamId&&payload.motionStreamId!==player.connectionId))return reject(400,'invalid_movement');
      if(!player.movementGrant||!ready(player.channel))return reject(503,'movement_transport_unavailable');
      if(pending.size>=2048)return reject(429,'movement_busy');
      const key=++serial;
      const item={...(diagnostic477?{receivedAt477}:{}),key,socket,id:message.id,streamId:player.connectionId,wire:{key,grant:player.movementGrant,
        playerId:player.playerId,instanceId:player.instanceId,securityVersion:player.securityVersion,
        scopeVersion:player.scopeVersion,cycle:player.cycle,channel:player.channel,area:player.area,
        arenaMatchId:player.arenaMatchId||'',payload}};
      item.timer=setTimeout(()=>unavailable(item),timeoutMs);item.timer.unref?.();
      socket.movementPending=item;pending.set(key,item);queue.push(item);stats.checkpoints++;
      if(queue.length>=MOVEMENT_BATCH_LIMIT)flush();else if(!timer){timer=setTimeout(flush,windowMs);timer.unref?.();}
    },
    detach(socket){const item=socket.movementPending;if(item){pending.delete(item.key);clearTimeout(item.timer);socket.movementPending=null;}},
    close(){clearTimeout(timer);for(const item of [...pending.values()])unavailable(item);queue=[];for(const bridge of bridges.values())bridge.terminate();bridges.clear();wss.close();},
  };
}
