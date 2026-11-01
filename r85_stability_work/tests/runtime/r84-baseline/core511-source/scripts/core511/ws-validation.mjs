import {randomUUID} from 'node:crypto';
import {demand,CHANNELS,PROTOCOL} from './contract.mjs';
import {validateLocalLoad} from './acceptance.mjs';
import {InputResponses} from './input-response-measurements.mjs';
const timeout=(promise,ms,code)=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(code)),ms);promise.then(value=>{clearTimeout(timer);resolve(value);},error=>{clearTimeout(timer);reject(error);});});
// This observer is shared by the real canary and protocol tests. Count an
// acknowledgement only with the exact native result, never just a watermark.
export function observeValidationPacket(client,packet,counters){
 demand(client.ready,'validation_not_ready');
 if(packet.type==='event'){
  demand(typeof packet.id==='string'&&/^[a-f0-9]{64}$/.test(packet.id),'validation_event_identity');client.eventAcks??=new Set();if(!client.eventAckPending?.includes(packet.id))client.eventAcks.add(packet.id);
 }else if(packet.type==='event_acked'){
  demand(JSON.stringify(packet.ids)===JSON.stringify(client.eventAckPending),'validation_event_ack_changed');client.eventAckPending=null;
 }else if(packet.type==='gm_visibility'){demand(packet.protocol===PROTOCOL,'validation_visibility_protocol');return;}
 else{
  demand(packet.type==='frame'&&packet.protocol===PROTOCOL,'unexpected_validation_reply');
  demand(Number.isSafeInteger(packet.lastApplied)&&packet.lastApplied>=client.lastAck&&packet.lastApplied<=client.sequence,'invalid_input_ack');
  for(const result of packet.results??[]){
   if(result.sequence===undefined)continue;demand(Number.isSafeInteger(result.sequence)&&result.sequence<=packet.lastApplied&&result.sequence<=client.sequence,'invalid_result_sequence');
   demand(result.status===undefined||result.status>=200&&result.status<300,'validation_game_action_rejected');demand(result.ok!==false&&!result.error&&result.body?.ok!==false&&!result.body?.error,'validation_game_action_rejected');
   if(client.pending.has(result.sequence)){const pending=client.pending.get(result.sequence);client.responses?.record({...pending,channel:client.player.channel,sequence:result.sequence});client.pending.delete(result.sequence);counters.acknowledged++;}
  }
  client.lastAck=packet.lastApplied;return;
 }
 if(!client.eventAckPending&&client.eventAcks?.size){client.eventAckPending=[...client.eventAcks].slice(0,64);for(const id of client.eventAckPending)client.eventAcks.delete(id);client.socket.send(JSON.stringify({type:'event_ack',ids:client.eventAckPending}));}
}
// Called ONLY inside the installer's isolated validation service. No test
// account is created by this driver, and it has no game DB or admin API handle.
// The privileged installer supplies a disposable realm and validates its OS
// isolation before exposing endpoints/tickets. Tests of this driver alone are
// not proof that those production installer bindings exist or work.
export async function runWebSocketValidation({descriptor,assertIsolation,issueTickets,createWebSocket,beginMetrics,endMetrics,durationMs=180000,clock=()=>performance.now()}){
 demand(durationMs===180000,'validation_requires_three_minutes');
 demand(descriptor?.purpose==='kernel511-isolated-validation'&&Array.isArray(descriptor.players)&&descriptor.players.length===100,'invalid_validation_descriptor');
 demand(/^[a-f0-9-]{36}$/.test(descriptor.runId??''),'invalid_validation_run_id');
 demand(validateLocalLoad(descriptor.localAcceptance,descriptor.manifestSha256).passed,'complete_game_local_acceptance_required');
 demand(new Set(descriptor.players.map(p=>p.id)).size===100,'duplicate_validation_player');
 const counts=new Map();for(const player of descriptor.players){
  demand(CHANNELS.includes(player.channel)&&player.id.startsWith(descriptor.runId+':')&&typeof player.targetId==='string','invalid_validation_player');
  demand(Number.isFinite(player.x)&&Number.isFinite(player.y)&&typeof player.area==='string','invalid_validation_spawn');
  const url=new URL(player.url);demand(url.protocol==='ws:'&&['127.0.0.1','[::1]'].includes(url.hostname)&&!url.username&&!url.password&&!url.search,'validation_endpoint_must_be_private_loopback');
  counts.set(player.channel,(counts.get(player.channel)??0)+1);
 }
 demand(CHANNELS.every(c=>counts.get(c)===25),'validation_channel_population');
 demand(await assertIsolation(descriptor)===true,'validation_isolation_not_proven');
 const responses=new InputResponses({clock});
 const clients=[],counters={errors:0,disconnects:0,sent:0,acknowledged:0,moves:0,attacks:0};let stopping=false,timer;
 function connect(player,ticket){return new Promise((resolve,reject)=>{
  const socket=createWebSocket(player.url,{origin:descriptor.origin,localAddress:'127.0.0.'+(player.channel+1)}),client={socket,player,responses,sequence:0,lastAck:0,pending:new Map(),ready:false};clients.push(client);
  socket.on('open',()=>socket.send(JSON.stringify({type:'auth',ticket})));
  socket.on('error',error=>{if(!stopping)counters.errors++;reject(error);});
  socket.on('close',()=>{if(!stopping)counters.disconnects++;if(!client.ready)reject(Error('validation_connect_closed'));});
  socket.on('message',(bytes,binary)=>{
   try{
    demand(!binary,'unexpected_binary_reply');const packet=JSON.parse(bytes.toString());
    if(packet.type==='ready'){
     demand(!client.ready&&packet.protocol===PROTOCOL&&packet.channel===player.channel&&packet.lastAccepted===0,'validation_session_mismatch');
     client.ready=true;client.epoch=packet.epoch;resolve(client);return;
    }
    observeValidationPacket(client,packet,counters);
   }catch(error){counters.errors++;reject(error);}
  });
 });}
 try{
  // Four IP identities, 25 clients each; at most seven simultaneous pending
  // admissions per IP. Original default 8-pending/32-connected limits remain.
  for(let offset=0;offset<25;offset+=7){
   const batch=CHANNELS.flatMap(channel=>descriptor.players.filter(p=>p.channel===channel).slice(offset,offset+7));
   const tickets=await issueTickets(batch.map(p=>p.id));
   await timeout(Promise.all(batch.map(player=>connect(player,tickets[player.id]))),4000,'validation_admission_timeout');
  }
  demand(clients.every(c=>c.ready&&c.socket.readyState===1),'validation_population_not_ready');
  await beginMetrics();const started=clock();responses.begin(started);let turn=0;
  timer=setInterval(()=>{
   turn++;
   for(const client of clients){
    if(client.socket.readyState!==1||client.pending.size)continue;
    const move=turn%2===1,payload=move?{action:'move',area:client.player.area,x:client.player.x+(turn%4===1?2:0),y:client.player.y}:{action:'attack',targetId:client.player.targetId,ability:0,intentId:randomUUID()};
    const sequence=++client.sequence;client.pending.set(sequence,{at:clock(),action:payload.action});counters.sent++;move?counters.moves++:counters.attacks++;
    try{demand(client.pending.size<=64,'validation_input_ack_timeout');client.socket.send(JSON.stringify({type:'input',sequence,payload}));}catch{counters.errors++;}
   }
  },500);
  await new Promise(resolve=>setTimeout(resolve,durationMs));clearInterval(timer);
  const pendingDeadline=clock()+5000;while(clients.some(client=>client.pending.size)&&clock()<pendingDeadline)await new Promise(resolve=>setTimeout(resolve,10));
  const measured=await endMetrics();
  const report={...measured,inputResponses:responses.report(),schemaVersion:1,workload:'native-gameplay-mixed',transport:'websocket',manifestSha256:descriptor.manifestSha256,durationMs:clock()-started,players:100,simultaneouslyConnected:100,completedPlayers:clients.filter(c=>c.socket.readyState===1&&!c.pending.size).length,
   ...counters,unacknowledged:clients.reduce((sum,c)=>sum+c.pending.size,0),isolation:descriptor.isolation};
  return report;
 }finally{
  stopping=true;clearInterval(timer);
  for(const client of clients){try{client.socket.close(1000,'Validation finished');}catch{}client.socket.terminate?.();}
 }
}
