// Separate OS client generator. No database or server runtime is imported.
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {performance,monitorEventLoopDelay} from 'node:perf_hooks';
const core=new URL('core511-source/scripts/core511/',pathToFileURL(process.env.R85_RUNTIME_TREE+'/'));
const {Core511Transport}=await import(new URL('client-transport.mjs',core));
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const clients=[],errors=[],samples=[],holds=[],clientQueueSamples=[];
let origin,gateway,started,stopping=false,timer,setupHeartbeat,queueTimer,progressTimer,requestId=0;
const pendingHttp=new Map(),pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const summary=values=>{const a=[...values].sort((a,b)=>a-b),p=f=>a[Math.max(0,Math.ceil(a.length*f)-1)]??null;return {count:a.length,p50:p(.5),p95:p(.95),p99:p(.99),max:a.at(-1)??null};};
function send(message){if(process.connected)process.send(message);}
function http(url,options){const id=++requestId;return new Promise((resolve,reject)=>{pendingHttp.set(id,{resolve,reject});send({type:'generator-http',id,url,options:{...options,headers:[...new Headers(options.headers)]}});});}
function clientCommand(c,payload){
 if(c.commandPending)return false;c.commandPending=true;if(payload.action==='attack')c.lastAttackAt=performance.now();
 c.clientTransport.command(payload).then(result=>{
  if(result.status>=200&&result.status<300)c.successful[payload.action]=(c.successful[payload.action]??0)+1;
  if(payload.action==='collect'&&result.status<300)c.collected.add(payload.targetId);
 },error=>{if(!stopping)errors.push({kind:'client-command',actor:c.p.id,action:payload.action,code:error.code??error.message});}).finally(()=>{c.commandPending=false;});return true;
}
function realisticFrame(c,at){
 const transport=c.clientTransport,own=transport.world?.players?.find(p=>p.id===c.p.id);if(!own||!transport.ready)return;
 const elapsed=at-started,gap=at-(c.lastFrameAt??at-50),dt=Math.min(.1,Math.max(0,gap/1000));c.maxFrameGapMs=Math.max(c.maxFrameGapMs??0,gap);c.lastFrameAt=at;c.inputFrames=(c.inputFrames??0)+1;
 const beforePending=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0),limitedInputMs=Math.max(0,dt-Math.max(0,.6-beforePending))*1000;
 if(limitedInputMs>1e-4){c.predictionLimitedFrames=(c.predictionLimitedFrames??0)+1;c.predictionLimitedInputMs=(c.predictionLimitedInputMs??0)+limitedInputMs;}
 // Feed the real transport/prediction at 20 Hz. It independently enforces
 // 200 ms authoritative movement, 50 ms previews, two slots and 600 ms cap.
 transport.predictFrame({own,seconds:dt,frameAt:at},(point,seconds)=>{
  const target={x:c.p.x+Math.sin(elapsed/900)*24,y:c.p.y+Math.cos(elapsed/900)*24},dx=target.x-point.x,dy=target.y-point.y,distance=Math.hypot(dx,dy),step=Math.min(distance,100*seconds);
  return distance?{x:point.x+dx/distance*step,y:point.y+dy/distance*step}:point;
 });
 const capped=transport.prediction.pending.reduce((n,row)=>n+row.seconds,0)>=.599;
 if(capped){if(c.predictionCapStart==null){c.predictionCapStart=at;c.predictionCapEpisodes=(c.predictionCapEpisodes??0)+1;}c.predictionCapMs=(c.predictionCapMs??0)+gap;c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,at-c.predictionCapStart);}else {if(c.predictionCapStart!=null)c.maxPredictionCapMs=Math.max(c.maxPredictionCapMs??0,at-c.predictionCapStart);c.predictionCapStart=null;}
 if(c.commandPending)return;
 if(own.hp<=own.max_hp*.35&&Number(own.potions)>0&&at-(c.lastPotionAt??-Infinity)>=2000){c.lastPotionAt=at;clientCommand(c,{action:'use_potion'});return;}
 if(c.kills<2&&elapsed>2000+c.kills*10000&&at-c.lastAttackAt>=1300){clientCommand(c,{action:'attack',targetId:c.p.targetId+'-lethal-'+c.kills++,spawnRound:17,ability:0,intentId:randomUUID()});return;}
 if(c.collects<2&&elapsed>4000+c.collects*12000){clientCommand(c,{action:'collect',targetId:c.p.drops[c.collects++]});return;}
 if(at-(c.lastHeartbeatAt??-Infinity)>=5000){c.lastHeartbeatAt=at;clientCommand(c,{action:'heartbeat'});return;}
 const drops=transport.world?.drops??transport.world?.worldDrops??[];
 const drop=drops.find(d=>(d.owner_id??d.ownerId)===c.p.id&&!c.p.drops.includes(d.id)&&!c.collected.has(d.id)&&Number(d.collectible_at??0)<=Date.now()/1000&&Math.hypot(d.x-own.x,d.y-own.y)<=100);
 if(drop&&at-(c.lastCollectAt??-Infinity)>=200){c.lastCollectAt=at;clientCommand(c,{action:'collect',targetId:drop.id,automatic:true});return;}
 if(at-c.lastAttackAt>=1300){const targets=c.kills>=2?[c.p.targetId+'-lethal-0',c.p.targetId+'-lethal-1',c.p.targetId]:[c.p.targetId],target=targets.map(id=>transport.world?.monsters?.find(m=>m.id===id)).find(m=>m&&m.hp>0&&Math.hypot(m.x-own.x,m.y-own.y)<=100);if(target)clientCommand(c,{action:'attack',targetId:target.id,spawnRound:target.spawn_round??target.spawnRound,ability:0,intentId:randomUUID()});}
}
async function add({p,ticket}){
 const c={p,sequence:0,pending:new Map(),turn:0,potion:false,kills:0,collects:0,lastAttackAt:-Infinity,lastMoveAck:null,maxMoveAckGap:0,commandPending:false,successful:{},collected:new Set(),motionFrames:0,cancelledInputs:[]};clients.push(c);
 const Socket=class extends WebSocket {constructor(url){const parsed=new URL(url);parsed.protocol='ws:';parsed.hostname='127.0.0.1';parsed.port=String(gateway.port);parsed.pathname='/_game'+parsed.pathname;super(parsed.href,{origin,headers:{'x-col-proxy-token':gateway.token,'x-col-public-host':gateway.host,'x-col-client-ip':'127.0.0.'+(p.channel+1)}});}};
 const headers=()=>({Origin:origin,Cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'X-CSRF-Token':p.csrf,'X-Game-Instance':p.instance,'Content-Type':'application/json'});
 const transport=new Core511Transport({fetch:http,WebSocket:Socket,origin,headers,notify:(kind,value)=>{if(kind==='error'&&!stopping)errors.push({kind:'client-transport',actor:p.id,value});}});
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
    if(result.status>=400||result.error||result.body?.error||result.body?.ok===false)errors.push({kind:'result',actor:p.id,action:pending.action,status:result.status,body:result.body,error:result.error});
   }live.packets.length=0;
  });
 return {actor:p.id,connected:transport.ready};
}
async function prepare(){
 clearInterval(setupHeartbeat);setupHeartbeat=null;
 const deadline=performance.now()+10000;while(clients.some(c=>c.commandPending)&&performance.now()<deadline)await pause(20);
 assert(clients.every(c=>!c.commandPending),'setup_commands_drained');
 const setupHeartbeats=clients.reduce((n,c)=>n+(c.successful.heartbeat??0),0);samples.length=0;
 return {pid:process.pid,setupHeartbeats,players:clients.length};
}
async function run({seconds,startEpochMs}){
 started=startEpochMs-performance.timeOrigin;
 const cpuBefore=process.cpuUsage(),eluBefore=performance.eventLoopUtilization(),loop=monitorEventLoopDelay({resolution:1});loop.enable();
 timer=setInterval(()=>{for(const c of clients)realisticFrame(c,performance.now());},50);
 queueTimer=setInterval(()=>{const at=performance.now();clientQueueSamples.push({offset:at-started,maxClientQueue:Math.max(0,...clients.map(c=>c.clientTransport.queue.length)),maxClientPending:Math.max(0,...clients.map(c=>c.pending.size)),generatorRssBytes:process.memoryUsage().rss});for(const c of clients)for(const [sequence,pending] of c.pending)if(at-pending.at>=600)holds.push({actor:c.p.id,sequence,action:pending.action,ageMs:at-pending.at,offset:at-started});},100);
 progressTimer=setInterval(()=>send({type:'generator-progress',elapsedSeconds:(performance.now()-started)/1000,acks:samples.length,maxAckMs:samples.reduce((n,s)=>Math.max(n,s.ms),0),errors:errors.length,pending:clients.reduce((n,c)=>n+c.pending.size,0),predictionCapActors:clients.filter(c=>c.predictionCapStart!=null).length,generatorRssBytes:process.memoryUsage().rss}),15000);
 while(performance.now()-started<seconds*1000)await pause(Math.max(1,seconds*1000-(performance.now()-started)));clearInterval(timer);timer=null;for(const c of clients)c.clientTransport.suspendPrediction();
 const end=performance.now()+10000;while(clients.some(c=>c.pending.size||c.commandPending||c.clientTransport.pendingInputs().length||c.clientTransport.queue.length)&&performance.now()<end)await pause(20);
 clearInterval(queueTimer);clearInterval(progressTimer);queueTimer=progressTimer=null;
 const durationMs=performance.now()-started,cpu=process.cpuUsage(cpuBefore),elu=performance.eventLoopUtilization(eluBefore);loop.disable();
 send({type:'generator-window-complete'});
 const actors=clients.map(c=>({actor:c.p.id,motionFrames:c.motionFrames,sentBytes:c.sentBytes,receivedBytes:c.receivedBytes,successfulCommands:c.successful,maxMoveAckGapMs:c.maxMoveAckGap,inputFrames:c.inputFrames,maxGeneratorFrameGapMs:c.maxFrameGapMs,totalPredictionCapMs:c.predictionCapMs??0,maxPredictionCapEpisodeMs:c.maxPredictionCapMs??0,predictionCapEpisodes:c.predictionCapEpisodes??0,predictionLimitedFrames:c.predictionLimitedFrames??0,predictionLimitedInputMs:c.predictionLimitedInputMs??0,cancelledInputs:structuredClone(c.cancelledInputs),remainingCommandQueue:c.clientTransport.queue.length}));
 const result={passed:errors.length===0&&clients.every(c=>c.pending.size===0&&c.live.ws.readyState===1&&c.clientTransport.pendingInputs().length===0&&c.clientTransport.queue.length===0&&!c.commandPending),errors:structuredClone(errors),samples,actors,clientQueueSamples,commandHoldsOver600Ms:holds,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),commandLatencyMs:summary(samples.map(r=>r.ms)),byAction:Object.fromEntries([...new Set(samples.map(r=>r.action))].map(action=>[action,summary(samples.filter(r=>r.action===action).map(r=>r.ms))])),runtimeCancelledInputCount:clients.reduce((n,c)=>n+c.cancelledInputs.length,0),generatorResources:{pid:process.pid,durationMs,cpuMs:(cpu.user+cpu.system)/1000,cpuCores:(cpu.user+cpu.system)/1000/durationMs,elu:elu.utilization,maxPauseMs:loop.max/1e6,peakRssBytes:process.resourceUsage().maxRSS*1024,sampledMeanRssBytes:clientQueueSamples.reduce((n,r)=>n+r.generatorRssBytes,0)/clientQueueSamples.length},durationMs};
 return result;
}
function close(){stopping=true;for(const t of [timer,setupHeartbeat,queueTimer,progressTimer])clearInterval(t);for(const c of clients){c.clientTransport.dispose();c.live?.ws.terminate();}}
process.on('disconnect',()=>{close();process.exit(1);});
process.on('message',message=>{
 if(message?.type==='generator-http-result'){const row=pendingHttp.get(message.id);if(!row)return;pendingHttp.delete(message.id);if(message.error)row.reject(Error(message.error));else row.resolve(new Response(message.body,{status:message.status,headers:message.headers}));return;}
 if(message?.type!=='generator-command')return;
 void(async()=>{
  switch(message.method){
   case 'initialize':origin=message.payload.origin;gateway=message.payload.gateway;setupHeartbeat=setInterval(()=>{for(const c of clients)if(c.clientTransport.ready&&!c.commandPending)clientCommand(c,{action:'heartbeat'});},5000);return {pid:process.pid};
   case 'add':return add(message.payload);
   case 'prepare':return prepare();
   case 'run':return run(message.payload);
   case 'close':close();return {closed:true};
   default:throw Error('unknown_generator_command');
  }
 })().then(value=>send({type:'generator-result',id:message.id,value}),error=>send({type:'generator-result',id:message.id,error:{message:error.message,stack:error.stack}}));
});
