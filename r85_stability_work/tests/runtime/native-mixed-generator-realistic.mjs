// Separate OS client generator. No database or server runtime is imported.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
const core=new URL('core511-source/scripts/core511/',pathToFileURL(process.env.R85_RUNTIME_TREE+'/'));
const {Core511Transport}=await import(new URL('client-transport.mjs',core));
const {createRules}=await import(new URL('generated/rules.mjs',core));
const rules=createRules();
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const clients=[],errors=[],samples=[],holds=[],clientQueueSamples=[];
let origin,gateway,shard,started,stopping=false,timer,potionTimer,setupHeartbeat,queueTimer,progressTimer,requestId=0,windowState;
const pendingHttp=new Map(),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
function send(message){if(process.connected)process.send(message);}
function http(url,options){const id=++requestId;return new Promise((resolve,reject)=>{pendingHttp.set(id,{resolve,reject});send({type:'generator-http',id,url,options:{...options,headers:[...new Headers(options.headers)]}});});}
const detail=result=>result?.body?.data??result?.body??{};
const cadenceRejection=result=>result?.status===429&&detail(result).code==='basic_attack_cadence'&&(Number.isFinite(Number(detail(result).retryAfterMs))&&Number(detail(result).retryAfterMs)>=0||Number.isFinite(Number(detail(result).nextAttackAtMs)));
function attackCooldown(c,record=true){
 const world=c.clientTransport.world,own=world?.players?.find(p=>p.id===c.p.id);
 assert(own&&Array.isArray(world.inventory)&&world.settings,'attack_stats_projection');
 const stats=rules.calculateEquipmentStats(own.role,world.inventory,world.settings,false,Boolean(own.weapon_skin_enabled),own.rank?.bonuses??undefined,own.guildBuff??undefined,own.premiumBuff??undefined);
 const cooldownMs=Math.max(180,rules.effectiveAttackCooldownMs(650,stats.attackSpeed));
 if(record)c.attackCadences.push({offset:performance.now()-started,attackSpeed:stats.attackSpeed,cooldownMs});return cooldownMs;
}
function correctAttackDeadline(c,result,optimisticDeadline){
 const value=detail(result);let remaining=Number(value.cooldownRemainingMs??value.retryAfterMs);
 if(!Number.isFinite(remaining)){const deadline=Number(value.nextAttackAtMs);if(Number.isFinite(deadline)){const clock=c.serverClock,now=clock?.observedAt>0&&clock.serverTimeMs>0?clock.serverTimeMs+Math.max(0,Date.now()-clock.observedAt):Date.now();remaining=Math.max(0,deadline-now);}}
 if(Number.isFinite(remaining)&&remaining>=0&&c.attackDeadline===optimisticDeadline)c.attackDeadline=Math.max(optimisticDeadline,performance.now()+remaining);
}
function clientCommand(c,payload,{seededKill=false,automaticPotion=false}={}){
 const pendingKey=automaticPotion?'potionPending':'commandPending';if(c[pendingKey])return false;c[pendingKey]=true;let optimisticDeadline;
 if(payload.action==='attack'){c.lastAttackAt=performance.now();optimisticDeadline=c.attackDeadline=c.lastAttackAt+attackCooldown(c);}
 c.clientTransport.command(payload).then(result=>{
  if(payload.action==='attack')correctAttackDeadline(c,result,optimisticDeadline);
  if(payload.action==='attack'&&cadenceRejection(result)){c.cadenceRetries.push({offset:performance.now()-started,status:result.status,...detail(result)});return;}
  if(automaticPotion)c.automaticPotionReplies.push({offset:performance.now()-started,status:result.status,body:result.body});
  if(result.status>=200&&result.status<300)c.successful[payload.action]=(c.successful[payload.action]??0)+1;
  if(seededKill&&result.status>=200&&result.status<300)c.kills++;
  if(payload.action==='collect'&&result.status<300)c.collected.add(payload.targetId);
 },error=>{if(!stopping)errors.push({kind:'client-command',actor:c.p.id,action:payload.action,code:error.code??error.message});}).finally(()=>{c[pendingKey]=false;});return true;
}
function automaticPotionPoll(c,at){
 const world=c.clientTransport.world,own=world?.players?.find(p=>p.id===c.p.id);if(!own||!c.clientTransport.ready)return;
 c.automaticPotionPolls++;
 if(world.area==='war'||world.area==='arena'||own.arena_match_id||!own.auto_potion_owned||!own.auto_potion_enabled||own.hp<=0||own.hp>own.max_hp*.5||c.potionPending||at-(c.lastPotionAt??-Infinity)<2000)return;
 c.lastPotionAt=at;clientCommand(c,{action:'use_potion',automatic:true},{automaticPotion:true});
}
function realisticFrame(c,at){
 const transport=c.clientTransport,own=transport.world?.players?.find(p=>p.id===c.p.id);if(!own||!transport.ready)return;
 const elapsed=at-started,gap=at-(c.lastFrameAt??at-50),dt=Math.min(.25,Math.max(0,gap/1000));c.maxFrameGapMs=Math.max(c.maxFrameGapMs??0,gap);c.lastFrameAt=at;c.inputFrames=(c.inputFrames??0)+1;
 const beforePending=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0),limitedInputMs=Math.max(0,dt-Math.max(0,.6-beforePending))*1000;
 if(limitedInputMs>1e-4){c.predictionLimitedFrames=(c.predictionLimitedFrames??0)+1;c.predictionLimitedInputMs=(c.predictionLimitedInputMs??0)+limitedInputMs;c.predictionLimitedSamples.push({offset:elapsed,requestedMs:dt*1000,limitedMs:limitedInputMs,pendingMs:beforePending*1000});}
 // Feed the real transport/prediction at 20 Hz. It independently enforces
 // 200 ms authoritative movement, 50 ms previews, two slots and 600 ms cap.
 transport.predictFrame({own,seconds:dt,frameAt:at},(point,seconds)=>{
  const target={x:c.p.x+Math.sin(elapsed/900)*24,y:c.p.y+Math.cos(elapsed/900)*24},dx=target.x-point.x,dy=target.y-point.y,distance=Math.hypot(dx,dy),step=Math.min(distance,100*seconds);
  return distance?{x:point.x+dx/distance*step,y:point.y+dy/distance*step}:point;
 });
 const capped=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0)>=.599;
 if(capped){if(c.predictionCapStart==null){c.predictionCapStart=at;c.predictionCapEpisodes=(c.predictionCapEpisodes??0)+1;}c.predictionCapMs=(c.predictionCapMs??0)+gap;c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,at-c.predictionCapStart);}else closeCap(c,at);
 if(c.commandPending)return;
 if(c.kills<2&&elapsed>2000+c.kills*10000&&at>=(c.attackDeadline??-Infinity)){clientCommand(c,{action:'attack',targetId:c.p.targetId+'-lethal-'+c.kills,spawnRound:17,ability:0,intentId:randomUUID()},{seededKill:true});return;}
 if(c.collects<2&&elapsed>4000+c.collects*12000){clientCommand(c,{action:'collect',targetId:c.p.drops[c.collects++]});return;}
 if(at-(c.lastHeartbeatAt??-Infinity)>=5000){c.lastHeartbeatAt=at;clientCommand(c,{action:'heartbeat'});return;}
 const drops=transport.world?.drops??transport.world?.worldDrops??[];
 const drop=drops.find(d=>(d.owner_id??d.ownerId)===c.p.id&&!c.p.drops.includes(d.id)&&!c.collected.has(d.id)&&Number(d.collectible_at??0)<=Date.now()/1000&&Math.hypot(d.x-own.x,d.y-own.y)<=100);
 if(drop&&at-(c.lastCollectAt??-Infinity)>=200){c.lastCollectAt=at;clientCommand(c,{action:'collect',targetId:drop.id,automatic:true});return;}
 if(at>=(c.attackDeadline??-Infinity)){const targets=c.kills>=2?[c.p.targetId+'-lethal-0',c.p.targetId+'-lethal-1',c.p.targetId]:[c.p.targetId],target=targets.map(id=>transport.world?.monsters?.find(m=>m.id===id)).find(m=>m&&m.hp>0&&Math.hypot(m.x-own.x,m.y-own.y)<=100);if(target)clientCommand(c,{action:'attack',targetId:target.id,spawnRound:target.spawn_round??target.spawnRound,ability:0,intentId:randomUUID()});}
}
function closeCap(c,at){if(c.predictionCapStart!=null){const durationMs=at-c.predictionCapStart;c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,durationMs);c.predictionCapIntervals.push({startOffsetMs:c.predictionCapStart-started,endOffsetMs:at-started,durationMs});c.predictionCapStart=null;}}
async function add({p,ticket}){
 const c={p,sequence:0,pending:new Map(),turn:0,potion:false,kills:0,collects:0,lastAttackAt:-Infinity,lastMoveAck:null,maxMoveAckGap:0,commandPending:false,potionPending:false,successful:{},collected:new Set(),motionFrames:0,cancelledInputs:[],attackCadences:[],cadenceRetries:[],automaticPotionPolls:0,automaticPotionReplies:[],predictionCapIntervals:[],predictionLimitedSamples:[]};clients.push(c);
 const Socket=class extends WebSocket {constructor(url){const parsed=new URL(url);parsed.protocol='ws:';parsed.hostname='127.0.0.1';parsed.port=String(gateway.port);parsed.pathname='/_game'+parsed.pathname;super(parsed.href,{origin,headers:{'x-col-proxy-token':gateway.token,'x-col-public-host':gateway.host,'x-col-client-ip':'127.0.0.'+(p.channel+1)}});}};
 const headers=()=>({Origin:origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'});
 const transport=new Core511Transport({fetch:http,WebSocket:Socket,origin,headers,notify:(kind,value)=>{if(kind==='world')c.serverClock={serverTimeMs:value.snapshotAtMs||value.serverTime*1000,observedAt:Date.now()};if(kind==='error'&&!stopping)errors.push({kind:'client-transport',actor:p.id,value});}});
 c.clientTransport=transport;const sendInput=transport.sendInput.bind(transport),rejectInput=transport.rejectInput.bind(transport);
 transport.rejectInput=function(input,code){if(input){c.pending.delete(input.sequence);if(!stopping)c.cancelledInputs.push({sequence:input.sequence,action:input.payload?.action,code,offset:performance.now()-started});}return rejectInput(input,code);};
 transport.sendInput=function(input){if(input&&!input.queued&&!c.pending.has(input.sequence)){c.pending.set(input.sequence,{action:input.payload.action,at:performance.now()});c.sequence=Math.max(c.sequence,input.sequence);}return sendInput(input);};
 await transport.open(ticket);await transport.image();
 const wireSend=transport.ws.send.bind(transport.ws);transport.ws.send=function(bytes,...args){const packet=JSON.parse(String(bytes));if(packet.type==='motion')c.motionFrames++;c.sentBytes=(c.sentBytes??0)+Buffer.byteLength(bytes);return wireSend(bytes,...args);};
 const live={ws:transport.ws,packets:[]};c.live=live;
  live.ws.on('close',(code,reason)=>{if(!stopping)errors.push({kind:'disconnect',actor:p.id,code,reason:String(reason)});});
  live.ws.on('message',bytes=>{const packet=JSON.parse(bytes);c.receivedBytes=(c.receivedBytes??0)+bytes.length;if(packet.type==='event'&&false){live.ws.send(JSON.stringify({type:'event_ack',ids:[packet.id]}));}
   if(packet.type==='not_queued')c.pending.delete(packet.sequence);
   if(packet.type==='rejected'){const pending=c.pending.get(packet.sequence);c.pending.delete(packet.sequence);errors.push({kind:'rejected-input',actor:p.id,action:pending?.action,code:packet.code});}
   for(const result of packet.results??[]){const pending=c.pending.get(result.sequence);if(!pending)continue;c.pending.delete(result.sequence);const at=performance.now();samples.push({actor:p.id,channel:p.channel,sequence:result.sequence,action:pending.action,ms:at-pending.at,offset:pending.at-started,status:result.status??200});
    if(pending.action==='move'){if(c.lastMoveAck!==null)c.maxMoveAckGap=Math.max(c.maxMoveAckGap,at-c.lastMoveAck);c.lastMoveAck=at;}
    if(!(pending.action==='attack'&&cadenceRejection(result))&&(result.status>=400||result.error||result.body?.error||result.body?.ok===false))errors.push({kind:'result',actor:p.id,action:pending.action,status:result.status,body:result.body,error:result.error});
   }live.packets.length=0;
  });
 return {actor:p.id,connected:transport.ready};
}
async function prepare(){
 clearInterval(setupHeartbeat);setupHeartbeat=null;
 const deadline=performance.now()+10000;while(clients.some(c=>c.commandPending||c.potionPending||c.pending.size||c.clientTransport.pendingInputs().length||c.clientTransport.queue.length)&&performance.now()<deadline)await pause(20);
 assert(clients.every(c=>!c.commandPending&&!c.potionPending&&!c.pending.size&&!c.clientTransport.pendingInputs().length&&!c.clientTransport.queue.length&&c.clientTransport.ready),'setup_commands_drained');
 const setupHeartbeats=clients.reduce((n,c)=>n+(c.successful.heartbeat??0),0);samples.length=0;for(const c of clients)c.successful={};
 return {pid:process.pid,shard,setupHeartbeats,players:clients.length,actors:clients.map(c=>{const own=c.clientTransport.world.players.find(p=>p.id===c.p.id);return {actor:c.p.id,channel:c.p.channel,initialProjectedHealth:{hp:own.hp,maxHp:own.max_hp,autoPotionOwned:own.auto_potion_owned,autoPotionEnabled:own.auto_potion_enabled},basicAttackCooldownMs:attackCooldown(c,false),ready:c.clientTransport.ready};}),errors:structuredClone(errors)};
}
async function run({seconds,startEpochMs}){
 assert(!windowState,'generator_window_already_started');
 started=startEpochMs-performance.timeOrigin;
 const cpuBefore=process.cpuUsage(),eluBefore=performance.eventLoopUtilization(),loop=monitorEventLoopDelay({resolution:1});loop.enable();
 windowState={cpuBefore,eluBefore,loop,startEpochMs,resourceStartedEpochMs:performance.timeOrigin+performance.now(),drained:false};
 timer=setInterval(()=>{for(const c of clients)realisticFrame(c,performance.now());},50);
 potionTimer=setInterval(()=>{for(const c of clients)automaticPotionPoll(c,performance.now());},500);
 queueTimer=setInterval(()=>{const at=performance.now();clientQueueSamples.push({offset:at-started,maxClientQueue:Math.max(0,...clients.map(c=>c.clientTransport.queue.length)),maxClientPending:Math.max(0,...clients.map(c=>c.pending.size)),generatorRssBytes:process.memoryUsage().rss});for(const c of clients)for(const [sequence,pending] of c.pending)if(at-pending.at>=600)holds.push({actor:c.p.id,sequence,action:pending.action,ageMs:at-pending.at,offset:at-started});},100);
 progressTimer=setInterval(()=>send({type:'generator-progress',elapsedSeconds:(performance.now()-started)/1000,acks:samples.length,maxAckMs:samples.reduce((n,s)=>Math.max(n,s.ms),0),errors:errors.length,pending:clients.reduce((n,c)=>n+c.pending.size,0),predictionCapActors:clients.filter(c=>c.predictionCapStart!=null).length,generatorRssBytes:process.memoryUsage().rss}),15000);
 while(performance.now()-started<seconds*1000)await pause(Math.max(1,seconds*1000-(performance.now()-started)));clearInterval(timer);clearInterval(potionTimer);timer=potionTimer=null;for(const c of clients){closeCap(c,performance.now());c.clientTransport.suspendPrediction();}
 const end=performance.now()+10000;while(clients.some(c=>c.pending.size||c.commandPending||c.potionPending||c.clientTransport.pendingInputs().length||c.clientTransport.queue.length)&&performance.now()<end)await pause(20);
 clearInterval(queueTimer);clearInterval(progressTimer);queueTimer=progressTimer=null;
 windowState.drained=true;windowState.drainOffsetMs=performance.now()-started;
 send({type:'generator-window-complete',shard,pid:process.pid,drainOffsetMs:windowState.drainOffsetMs});
 return {shard,pid:process.pid,drained:true,drainOffsetMs:windowState.drainOffsetMs};
}
function finish({commonEndEpochMs}){
 assert(windowState?.drained&&!windowState.finished,'generator_window_not_drained');windowState.finished=true;
 const endedEpochMs=performance.timeOrigin+performance.now(),durationMs=endedEpochMs-windowState.startEpochMs,cpu=process.cpuUsage(windowState.cpuBefore),elu=performance.eventLoopUtilization(windowState.eluBefore);windowState.loop.disable();
 const actors=clients.map(c=>({actor:c.p.id,channel:c.p.channel,generatorShard:shard,motionFrames:c.motionFrames,sentBytes:c.sentBytes,receivedBytes:c.receivedBytes,successfulCommands:c.successful,automaticPotionPolls:c.automaticPotionPolls,automaticPotionReplies:c.automaticPotionReplies,attackCadences:c.attackCadences,cadenceRetries:c.cadenceRetries,maxMoveAckGapMs:c.maxMoveAckGap,inputFrames:c.inputFrames,maxGeneratorFrameGapMs:c.maxFrameGapMs,totalPredictionCapMs:c.predictionCapIntervals.reduce((n,row)=>n+row.durationMs,0),sampledCappedFrameElapsedMs:c.predictionCapMs??0,maxPredictionCapEpisodeMs:c.maxPredictionCapMs??0,predictionCapEpisodes:c.predictionCapEpisodes??0,predictionCapIntervals:structuredClone(c.predictionCapIntervals),predictionLimitedFrames:c.predictionLimitedFrames??0,predictionLimitedInputMs:c.predictionLimitedInputMs??0,predictionLimitedSamples:c.predictionLimitedSamples,cancelledInputs:structuredClone(c.cancelledInputs),remainingCommandQueue:c.clientTransport.queue.length}));
 return {passed:errors.length===0&&clients.every(c=>c.pending.size===0&&c.live.ws.readyState===1&&c.clientTransport.pendingInputs().length===0&&c.clientTransport.queue.length===0&&!c.commandPending&&!c.potionPending),errors:structuredClone(errors),samples,actors,clientQueueSamples,commandHoldsOver600Ms:holds,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),runtimeCancelledInputCount:clients.reduce((n,c)=>n+c.cancelledInputs.length,0),generatorResources:{shard,pid:process.pid,players:clients.length,startEpochMs:windowState.startEpochMs,resourceStartedEpochMs:windowState.resourceStartedEpochMs,endedEpochMs,commonEndEpochMs,drainOffsetMs:windowState.drainOffsetMs,durationMs,cpuMs:(cpu.user+cpu.system)/1000,cpuCores:(cpu.user+cpu.system)/1000/durationMs,elu:elu.utilization,eluActiveMs:elu.active,eluIdleMs:elu.idle,maxPauseMs:windowState.loop.max/1e6,peakRssBytes:process.resourceUsage().maxRSS*1024,sampledMeanRssBytes:clientQueueSamples.length?clientQueueSamples.reduce((n,r)=>n+r.generatorRssBytes,0)/clientQueueSamples.length:null,sampleCount:clientQueueSamples.length},durationMs};
}
function close(){stopping=true;windowState?.loop.disable();for(const t of [timer,potionTimer,setupHeartbeat,queueTimer,progressTimer])clearInterval(t);for(const c of clients){c.clientTransport.dispose();c.live?.ws.terminate();}}
process.on('disconnect',()=>{close();process.exit(1);});
process.on('message',message=>{
 if(message?.type==='generator-http-result'){const row=pendingHttp.get(message.id);if(!row)return;pendingHttp.delete(message.id);if(message.error)row.reject(Error(message.error));else row.resolve(new Response(message.body,{status:message.status,headers:message.headers}));return;}
 if(message?.type!=='generator-command')return;
 void(async()=>{
  switch(message.method){
   case 'initialize':origin=message.payload.origin;gateway=message.payload.gateway;shard=message.payload.shard;setupHeartbeat=setInterval(()=>{for(const c of clients)if(c.clientTransport.ready&&!c.commandPending)clientCommand(c,{action:'heartbeat'});},5000);return {pid:process.pid,shard};
   case 'add':return add(message.payload);
   case 'prepare':return prepare();
   case 'run':return run(message.payload);
   case 'finish':return finish(message.payload);
   case 'close':close();return {closed:true};
   default:throw Error('unknown_generator_command');
  }
 })().then(value=>send({type:'generator-result',id:message.id,value}),error=>send({type:'generator-result',id:message.id,error:{message:error.message,stack:error.stack}}));
});
