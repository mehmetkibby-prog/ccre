import {measureRequest477,perfStage477} from './request-performance477.mjs';
import {randomUUID} from 'node:crypto';
import {WebSocket} from 'ws';
import {realtimeCrypto} from './realtime-transport.mjs';
import {MOVEMENT_PROTOCOL,MOVEMENT_STREAM_PATH,MOVEMENT_BATCH_LIMIT,MOVEMENT_FRAME_LIMIT,movementPayload} from '../../realtime-server/src/movement-wire.mjs';

const scopeKeys=['playerId','instanceId','securityVersion','scopeVersion','cycle','channel','area','arenaMatchId'];
export function createMovementBridge({origin=process.env.REALTIME_HTTP_ORIGIN||'http://127.0.0.1:3001',enabled=true,now=Date.now,channel=0,runPlayer}={}) {
  if(![0,1,2,3].includes(channel))throw Error('Invalid bridge channel');
  const streamPath=channel?`${MOVEMENT_STREAM_PATH}/channel/${channel}`:MOVEMENT_STREAM_PATH;
  const target=new URL(origin);
  if(target.protocol!=='http:'||target.hostname!=='127.0.0.1'||target.pathname!=='/'||target.search||target.username||target.password)throw new Error('Movement bridge must use loopback');
  let socket=null,connected=false,stopped=false,retry=null,heartbeat=null,lastPong=0,inflight=0;
  const grants=new Map(),byPlayer=new Map();
  const stats={batches:0,checkpoints:0,completed:0,rejected:0,errors:0,maxBatch:0};
  function discard(id){const grant=grants.get(id);if(byPlayer.get(grant?.scope.playerId)===id)byPlayer.delete(grant.scope.playerId);grants.delete(id);}
  const cleanup=setInterval(()=>{for(const [id,grant] of grants)if(grant.expiresAt<=now()||now()-grant.usedAt>1800000)discard(id);},30000);cleanup.unref();
  function headers(){const timestamp=String(Math.floor(now()/1000)),nonce=randomUUID(),key='coreoflife-p256-2026-09';
    return {'x-col-key-id':key,'x-col-timestamp':timestamp,'x-col-nonce':nonce,
      'x-col-signature':realtimeCrypto.sign(`COL-REQUEST-V1\n${key}\n${timestamp}\n${nonce}\nGET\n${streamPath}\n${realtimeCrypto.digest('')}`)};}
  function connect(){
    if(stopped||!enabled||!process.env.REALTIME_SIGNING_PRIVATE_KEY)return;
    let current;try{current=new WebSocket(`ws://${target.host}${streamPath}`,{headers:headers(),handshakeTimeout:2500,maxPayload:MOVEMENT_FRAME_LIMIT,perMessageDeflate:false});}catch{schedule();return;}
    socket=current;
    current.on('pong',()=>{lastPong=now();});
    current.on('message',async(bytes,binary)=>{
      if(socket!==current||binary)return;
      let message;try{message=JSON.parse(bytes.toString());}catch{current.close(1007,'Invalid movement batch');return;}
      if(message?.type==='movement_ready'&&message.protocol===MOVEMENT_PROTOCOL){connected=true;lastPong=now();globalThis.__colRealm?.realtimeMaintenance491?.publish(globalThis.__colRealm.maintenance.policy,{force:true});return;}
      if(!connected||message?.type!=='movement_batch'||!Array.isArray(message.items)||!message.items.length||message.items.length>MOVEMENT_BATCH_LIMIT){current.close(1008,'Invalid movement batch');return;}
      if(inflight+message.items.length>256){globalThis.__colLoadLabMetrics?.record(503,message.items.length);current.close(1013,"Movement queue full");return;}
      inflight+=message.items.length;
      stats.batches++;stats.maxBatch=Math.max(stats.maxBatch,message.items.length);
      // A transport batch contains independent authoritative operations. Publish
      // ready results after their own execute/WAL promise; another player's
      // unfinished operation must not hold them behind a batch-wide barrier.
      let readyResults=[],resultFlushQueued=false;
      const flushResults=()=>{
        resultFlushQueued=false;const results=readyResults;readyResults=[];
        if(socket!==current||current.readyState!==1||current.bufferedAmount>=MOVEMENT_FRAME_LIMIT)return;
        try{
          let encoded=JSON.stringify({type:'movement_results',items:results});
          // Optional test diagnostics must never consume an operation's ACK budget.
          if(results.some(r=>r.perf)&&Buffer.byteLength(encoded)>MOVEMENT_FRAME_LIMIT){for(const result of results){delete result.timing;delete result.perf;}encoded=JSON.stringify({type:'movement_results',items:results});}
          current.send(encoded);
        }catch{current.terminate();}
      };
      const publishResult=result=>{
        globalThis.__colLoadLabMetrics?.record(result.status);
        inflight--;readyResults.push(result);
        if(!resultFlushQueued){resultFlushQueued=true;queueMicrotask(flushResults);}
      };
      // The256-item bound counts unfinished operations. Completed peers may
      // submit again even while another operation in their old batch is pending.
      await Promise.all(message.items.map(async item=>{
        const fail=(status,code)=>{stats.rejected++;return {key:item?.key,status,data:{error:'Hareket oturumu doğrulanamadı.',code}};};
        const grant=grants.get(item?.grant),payload=movementPayload(item?.payload);
        if(!Number.isSafeInteger(item?.key)||!grant||grant.expiresAt<=now()||!payload||scopeKeys.some(key=>item[key]!==grant.scope[key]))return fail(409,'movement_grant_expired');
        if(grant.busy)return fail(429,'movement_busy');
        grant.busy=true;grant.usedAt=now();stats.checkpoints++;
        try{
          const record=await measureRequest477('move',grant.scope.playerId,async()=>{
            const admittedAt=performance.now();
            const execute=()=>{perfStage477('native_owner_wall',performance.now()-admittedAt);return grant.execute(grant.request,grant.tokenHash,grant.scope,payload,now());};
            return runPlayer?runPlayer(grant.scope.playerId,execute):execute();
          });const result=record.result;
          stats.completed++;return {key:item.key,status:result.status,data:result.data,...(record.perf?{timing:record.timing,perf:record.perf}:{})};
        }catch{stats.errors++;return fail(503,'movement_transport_unavailable');}finally{grant.busy=false;}
      }).map(work=>work.then(publishResult)));
    });
    current.on('error',()=>{});
    current.on('close',()=>{if(socket!==current)return;socket=null;connected=false;schedule();});
  }
  function schedule(){if(!stopped&&!retry){retry=setTimeout(()=>{retry=null;connect();},2000);retry.unref();}}
  return {
    start(){connect();heartbeat=setInterval(()=>{if(socket?.readyState===1){if(now()-lastPong>30000)socket.terminate();else socket.ping();}},10000);heartbeat.unref();},
    issue(request,auth,scope,execute){
      if(channel&&scope.channel!==channel)return undefined;
      if(!connected||!auth.player||typeof execute!=='function')return undefined;
      // Keep the session hash and audit request inside the game process. Only
      // a random grant reference appears in the signed, private login ticket.
      const auditRequest=new Request(new URL('/api/action',request.url),{method:'POST',headers:{
        'x-game-instance':auth.gamePresence.instanceId,
        'cf-connecting-ip':request.headers.get('cf-connecting-ip')||'',
        'user-agent':request.headers.get('user-agent')||'',
      }});
      const issuedScope={...scope,playerId:auth.player.id,
        instanceId:auth.gamePresence.instanceId,securityVersion:auth.securityVersion};
      const previous=byPlayer.get(auth.player.id),existing=grants.get(previous);
      // Ticket delivery and socket renewal are asynchronous. Reuse only the
      // exact same authority so the active socket stays valid during renewal.
      // Keep its busy lock and absolute expiry; auth/scope changes still revoke.
      if(existing&&existing.expiresAt>now()&&existing.expiresAt===auth.expiresAt*1000
        &&existing.tokenHash===auth.tokenHash&&existing.execute===execute
        &&scopeKeys.every(key=>existing.scope[key]===issuedScope[key])){
        existing.request=auditRequest;existing.usedAt=now();return previous;
      }
      if(previous)discard(previous);
      if(grants.size>=5000)return undefined;
      const id=randomUUID();
      grants.set(id,{request:auditRequest,tokenHash:auth.tokenHash,scope:issuedScope,execute,
        expiresAt:auth.expiresAt*1000,usedAt:now(),busy:false});byPlayer.set(auth.player.id,id);return id;
    },
    snapshot:()=>({protocol:MOVEMENT_PROTOCOL,ready:connected,grants:grants.size,...stats}),
    close(){stopped=true;clearTimeout(retry);clearInterval(heartbeat);clearInterval(cleanup);socket?.terminate();socket=null;connected=false;grants.clear();byPlayer.clear();},
  };
}
