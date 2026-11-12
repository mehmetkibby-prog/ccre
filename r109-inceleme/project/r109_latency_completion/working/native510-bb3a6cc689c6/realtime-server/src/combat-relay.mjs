function validPendingCombatR13(data) {
  return !!data && data.combatPending === true && data.combatPhase === 'pending' &&
    Object.keys(data).every(key => ['combatPending','combatPhase','rewardPending','xp','groundDrops','intentId','provisionalHits','cycle','channel','area','serverAt'].includes(key)) &&
    data.rewardPending === false && data.xp === 0 && data.groundDrops === 0 &&
    data.hits === undefined && data.progression === undefined && data.drops === undefined &&
    typeof data.intentId === 'string' && /^[A-Za-z0-9:_-]{1,120}$/.test(data.intentId) &&
    Array.isArray(data.provisionalHits) && data.provisionalHits.length > 0 &&
    data.provisionalHits.length <= 32 && data.provisionalHits.every(hit => hit &&
      Object.keys(hit).length === 5 && Object.keys(hit).every(key => ['id','spawnRound','damage','hp','killPending'].includes(key)) &&
      typeof hit.id === 'string' && /^[A-Za-z0-9:_-]{1,120}$/.test(hit.id) &&
      Number.isSafeInteger(hit.spawnRound) && hit.spawnRound >= 0 &&
      Number.isFinite(hit.damage) && hit.damage > 0 && Number.isFinite(hit.hp) && hit.hp >= 0 &&
      typeof hit.killPending === 'boolean' && hit.killPending === (hit.hp === 0));
}

import {relayPerf477,optionalPerfBudget477} from './perf-timing477.mjs';
import {WebSocketServer} from 'ws';
import {isLocalBroadcastRequest} from './broadcast-ingress.mjs';
import {COMBAT_PROTOCOL,COMBAT_STREAM_PATH,COMBAT_BATCH_LIMIT,COMBAT_FRAME_LIMIT,combatPayload} from './combat-wire.mjs';

// The game connects to this loopback-only, signed upgrade. Browser sockets can
// submit intentions only; an ACK is returned after the game confirms its WAL.
export function createCombatRelay({verify,clients,timeoutMs=1800,windowMs=2}={}) {
  const wss=new WebSocketServer({noServer:true,maxPayload:COMBAT_FRAME_LIMIT,perMessageDeflate:false});
  const bridges=new Map();let upgrades=0,timer=null,serial=0;
  const pending=new Map();let queue=[];
  const stats={batches:0,checkpoints:0,completed:0,rejected:0,timeouts:0};
  const bridgeFor=channel=>bridges.get(channel)??(bridges.size===1?bridges.get(0):null);
  const ready=channel=>channel===undefined?[...bridges.values()].some(s=>s.readyState===1):bridgeFor(channel)?.readyState===1;
  const send=(socket,value)=>{if(socket.readyState===1&&socket.bufferedAmount<262144)socket.send(JSON.stringify(value));};
  function notify(){for(const socket of clients())if(socket.player?.combatGrant)send(socket,{type:'combat_transport',protocol:COMBAT_PROTOCOL,ready:ready(socket.player.channel)});}
  function finish(item,status,data,serverMs,diagnostics477){
    if(!pending.delete(item.key))return;
    clearTimeout(item.timer);
    if(item.socket.combatPending===item)item.socket.combatPending=null;
    const reply=optionalPerfBudget477({type:'combat_ack',protocol:COMBAT_PROTOCOL,streamId:item.streamId,id:item.id,status,data,...(Number.isFinite(serverMs)?{serverMs}:{}),...(diagnostics477?relayPerf477(diagnostics477,item):{})},COMBAT_FRAME_LIMIT);
    item.socket.combatLast={id:item.id,reply};
    if(item.socket.player?.connectionId===item.streamId)send(item.socket,reply);
  }
  function unavailable(item){stats.timeouts++;finish(item,503,{error:'Saldırı bağlantısı yenileniyor.',code:'combat_transport_unavailable'});}
  function flush(){
    clearTimeout(timer);timer=null;
    while(queue.length){
      const batch=queue.splice(0,COMBAT_BATCH_LIMIT).filter(item=>pending.has(item.key));
      if(!batch.length)continue;
      const groups=new Map();
      for(const item of batch){const bridge=bridgeFor(item.wire.channel);if(!bridge||bridge.readyState!==1||bridge.bufferedAmount>COMBAT_FRAME_LIMIT){unavailable(item);continue;}let rows=groups.get(bridge);if(!rows)groups.set(bridge,rows=[]);item.bridge=bridge;rows.push(item);}
      for(const [bridge,rows]of groups){for(const item of rows)if(item.receivedAt477!==undefined)item.sentAt477=performance.now();bridge.send(JSON.stringify({type:'combat_batch',items:rows.map(item=>item.wire)}));stats.batches++;}
    }
  }
  wss.on('connection',(socket,channel)=>{
    const previous=bridges.get(channel);bridges.set(channel,socket);previous?.close(1012,'Game process replaced');
    // Never transfer queued work/credentials from an earlier game process.
    for(const item of [...pending.values()])if(item.bridge===previous||item.wire.channel===channel)unavailable(item);
    queue=queue.filter(item=>pending.has(item.key));
    socket.send(JSON.stringify({type:'combat_ready',protocol:COMBAT_PROTOCOL}));notify();
    socket.on('message',(bytes,binary)=>{
      if(socket!==bridges.get(channel)||binary)return;
      let message;try{message=JSON.parse(bytes.toString());}catch{return socket.close(1007,'Invalid combat response');}
      if(message?.type==='combat_pending'){
        const item=pending.get(message.key);
        if(item&&item.bridge===socket&&!item.pendingSentR13&&item.deferredR13&&message.deferredRewardProtocol==='durable-combat-two-phase-r13'&&message.status===202&&validPendingCombatR13(message.data)&&message.data.intentId===item.wire.payload.intentId&&item.socket.player?.connectionId===item.streamId){
          item.pendingSentR13=true;
          send(item.socket,{type:'combat_pending',protocol:COMBAT_PROTOCOL,deferredRewardProtocol:'durable-combat-two-phase-r13',streamId:item.streamId,id:item.id,status:202,data:message.data,...(Number.isFinite(message.serverMs)?{serverMs:message.serverMs}:{})});
        }
        return;
      }
      if(message?.type!=='combat_results'||!Array.isArray(message.items)||message.items.length>COMBAT_BATCH_LIMIT)return socket.close(1008,'Invalid combat response');
      for(const row of message.items){
        const item=pending.get(row?.key);
        if(!item||item.bridge!==socket||!Number.isInteger(row.status)||row.status<200||row.status>599||!row.data||typeof row.data!=='object')continue;
        stats.completed++;finish(item,row.status,row.data,row.serverMs,row);
      }
    });
    socket.on('close',()=>{if(bridges.get(channel)!==socket)return;bridges.delete(channel);for(const item of [...pending.values()])if(item.bridge===socket)unavailable(item);queue=queue.filter(item=>pending.has(item.key));notify();});
    socket.on('error',()=>{});
  });
  return {
    get available(){return ready();},
    availableFor:channel=>ready(channel),
    snapshot:()=>({protocol:COMBAT_PROTOCOL,ready:ready(),channels:[...bridges].map(([channel,socket])=>({channel,ready:socket.readyState===1})),pending:pending.size,...stats}),
    async upgrade(request,socket,head){
      if(!isLocalBroadcastRequest(request)||upgrades>=8){socket.destroy();return;}
      const pathname=new URL(request.url,'http://localhost').pathname;
      const channel=pathname===COMBAT_STREAM_PATH?0:Number(pathname.slice(`${COMBAT_STREAM_PATH}/channel/`.length));
      if(pathname!==COMBAT_STREAM_PATH&&!([1,2,3].includes(channel)&&pathname===`${COMBAT_STREAM_PATH}/channel/${channel}`)){socket.destroy();return;}
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
      const reject=(status,code)=>{stats.rejected++;send(socket,{type:'combat_ack',protocol:COMBAT_PROTOCOL,streamId:player.connectionId,id:message.id,status,data:{error:'Saldırı doğrulanamadı.',code}});};
      if(!Number.isSafeInteger(message.id)||message.id<1||message.streamId!==player.connectionId)return reject(400,'invalid_combat');
      if(socket.combatLast?.id===message.id){send(socket,socket.combatLast.reply);return;}
      if(message.id<=(socket.combatLast?.id??0))return reject(409,'combat_attack_stale');
      if(socket.combatPending){if(socket.combatPending.id!==message.id)reject(429,'combat_busy');return;}
      const payload=combatPayload(message);
      if(!payload||(payload.action==='attack'?payload.area!==player.area:message.area!==undefined&&message.area!==player.area))return reject(400,'invalid_combat');
      // Newly relayed actions used the authenticated player's area on HTTP.
      // Bind it to the signed socket scope here, never to client coordinates.
      if(payload.action!=='attack')payload.area=player.area;
      if(!player.combatGrant||!ready(player.channel))return reject(503,'combat_transport_unavailable');
      if(pending.size>=2048)return reject(429,'combat_busy');
      const key=++serial;
      const item={...(diagnostic477?{receivedAt477}:{}),key,socket,id:message.id,streamId:player.connectionId,deferredR13:message.deferredRewardProtocol==='durable-combat-two-phase-r13'&&payload.action==='attack',wire:{key,grant:player.combatGrant,...(message.deferredRewardProtocol==='durable-combat-two-phase-r13'&&payload.action==='attack'?{deferredRewardProtocol:'durable-combat-two-phase-r13'}:{}),
        playerId:player.playerId,instanceId:player.instanceId,securityVersion:player.securityVersion,
        scopeVersion:player.scopeVersion,cycle:player.cycle,channel:player.channel,area:player.area,
        arenaMatchId:player.arenaMatchId||'',payload}};
      item.timer=setTimeout(()=>unavailable(item),timeoutMs);item.timer.unref?.();
      socket.combatPending=item;pending.set(key,item);queue.push(item);stats.checkpoints++;
      if(queue.length>=COMBAT_BATCH_LIMIT)flush();else if(!timer){timer=setTimeout(flush,windowMs);timer.unref?.();}
    },
    detach(socket){const item=socket.combatPending;if(item){pending.delete(item.key);clearTimeout(item.timer);socket.combatPending=null;}},
    close(){clearTimeout(timer);for(const item of [...pending.values()])unavailable(item);queue=[];for(const bridge of bridges.values())bridge.terminate();bridges.clear();wss.close();},
  };
}
