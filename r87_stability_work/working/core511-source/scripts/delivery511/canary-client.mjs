import os from 'node:os';
import http from 'node:http';
import {randomUUID} from 'node:crypto';
import {once} from 'node:events';
import {PROTOCOL,demand} from '../core511/contract.mjs';
import {InputResponses} from '../core511/input-response-measurements.mjs';
const {WebSocket}=await import('../../../native510-bb3a6cc689c6/node_modules/ws/wrapper.mjs');
const pause=ms=>new Promise(r=>setTimeout(r,ms));
const clients=[],failures=[],responses=new InputResponses(),counts={errors:0,disconnects:0,sent:0,acknowledged:0,moves:0,attacks:0,potions:0,heartbeats:0};
let descriptor,measuring=false,stopping=false,timer,started,cpu,report;
function fail(kind,e){counts.errors++;if(failures.length<100)failures.push({kind,code:e.code??e.message??String(e)});}
async function ticket(p){
 return new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port:descriptor.appPort,path:'/api/realtime/core511-ticket',method:'POST',agent:false,localAddress:'127.0.0.'+(p.channel+1),headers:{host:new URL(descriptor.origin).host,origin:descriptor.origin,'x-forwarded-host':new URL(descriptor.origin).host,'x-forwarded-proto':'https','content-type':'application/json',cookie:'__Host-yasam-session='+p.token+'; __Host-yasam-csrf='+p.csrf,'x-csrf-token':p.csrf,'x-game-instance':p.instance}},res=>{let text='';res.on('data',b=>{text+=b;if(text.length>65536)req.destroy(Error('ticket_too_large'));});res.on('end',()=>{try{const value=JSON.parse(text);demand(res.statusCode===200&&value.protocol===PROTOCOL&&value.channel===p.channel,'canary_ticket_rejected');resolve(value);}catch(e){reject(e);}});});req.setTimeout(7000,()=>req.destroy(Error('ticket_timeout')));req.on('error',reject);req.end(JSON.stringify({protocol:PROTOCOL}));
 });
}
function ack(c){if(!c.eventPending&&c.eventQueue.size&&c.ws.readyState===1){c.eventPending=[...c.eventQueue].slice(0,64);for(const id of c.eventPending)c.eventQueue.delete(id);c.ws.send(JSON.stringify({type:'event_ack',ids:c.eventPending}));}}
async function connect(p){
 const t=await ticket(p);demand(/^\/game\/channel\/[1-4]$/.test(t.url),'canary_ticket_path');
 const ws=new WebSocket('ws://127.0.0.1:'+descriptor.ports[p.channel]+t.url,{origin:descriptor.origin,localAddress:'127.0.0.'+(p.channel+1)}),c={p,ws,sequence:0,pending:new Map(),ready:false,eventQueue:new Set(),eventPending:null,moves:0,attacks:0};clients.push(c);
 ws.on('error',e=>{if(!stopping)fail('socket',e);});ws.on('close',()=>{if(!stopping)counts.disconnects++;});
 ws.on('message',bytes=>{try{
  const packet=JSON.parse(bytes);
  if(packet.type==='ready'){demand(packet.protocol===PROTOCOL&&packet.channel===p.channel&&packet.lastAccepted===0,'canary_ready');c.ready=true;return;}
  if(packet.type==='frame'){
   demand(packet.protocol===PROTOCOL,'canary_frame_protocol');
   for(const result of packet.results??[]){const pending=c.pending.get(result.sequence);if(!pending)continue;clearTimeout(pending.retry);c.pending.delete(result.sequence);
    if(pending.measured){counts.acknowledged++;responses.record({at:pending.at,actor:p.id,channel:p.channel,action:pending.payload.action,sequence:result.sequence});}
    demand((result.status===undefined||result.status>=200&&result.status<300)&&!result.error&&!result.body?.error&&result.body?.ok!==false,'canary_command_rejected');
   }
  }else if(packet.type==='retry'){
   const row=c.pending.get(packet.sequence);demand(row,'canary_retry_without_command');clearTimeout(row.retry);row.retry=setTimeout(()=>{if(c.pending.get(packet.sequence)===row&&ws.readyState===1)ws.send(row.wire);},50);
  }else if(packet.type==='event'){demand(/^[a-f0-9]{64}$/.test(packet.id),'canary_event_id');if(!c.eventPending?.includes(packet.id))c.eventQueue.add(packet.id);ack(c);}
  else if(packet.type==='event_acked'){demand(JSON.stringify(packet.ids)===JSON.stringify(c.eventPending),'canary_event_ack');c.eventPending=null;ack(c);}
  else if(packet.type!=='gm_visibility')throw Error('canary_unexpected_packet:'+packet.type);
 }catch(e){fail('packet',e);}});
 await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:t.ticket}));const end=performance.now()+7000;while(!c.ready&&ws.readyState===1&&performance.now()<end)await pause(5);demand(c.ready,'canary_ready_timeout');return c;
}
function send(c,payload){demand(c.ws.readyState===1&&!c.pending.size,'canary_client_busy');const sequence=++c.sequence,wire=JSON.stringify({type:'input',sequence,payload});c.pending.set(sequence,{payload,wire,at:performance.now(),measured:measuring});if(measuring){counts.sent++;if(payload.action==='move'){counts.moves++;c.moves++;}else if(payload.action==='attack'){counts.attacks++;c.attacks++;}else if(payload.action==='use_potion')counts.potions++;else if(payload.action==='heartbeat')counts.heartbeats++;}c.ws.send(wire);}
async function settled(c){const end=performance.now()+10000;while(c.pending.size&&performance.now()<end)await pause(5);demand(!c.pending.size,'canary_preflight_unanswered');}
async function init(d){
 demand(!descriptor&&d?.players?.length===100&&d.durationMs===180000&&d.origin==='https://game.invalid','canary_descriptor');
 demand(Object.values(d.ports).length===4&&Object.values(d.ports).every(p=>Number.isInteger(p)&&p>=1024&&p<=65535),'canary_ports');
 os.setPriority(0,10);demand(os.getPriority(0)===10,'canary_nice_required');descriptor=d;
 for(let i=0;i<25;i++)for(const channel of [2,3,4,1])await connect(d.players.find(p=>p.channel===channel&&p.index===i));
 for(const channel of [1,2,3,4]){const c=clients.find(c=>c.p.channel===channel);send(c,{action:'move',area:'forest',x:c.p.x+2,y:c.p.y});await settled(c);send(c,{action:'attack',targetId:c.p.targetId,spawnRound:17,ability:0,intentId:randomUUID()});await settled(c);}
 demand(counts.errors===0&&counts.disconnects===0,'canary_preflight_failed');return {ready:100,nice:os.getPriority(0),pid:process.pid};
}
async function run(){
 demand(descriptor&&!started,'canary_already_started');started=performance.now();cpu=process.cpuUsage();responses.begin(started);measuring=true;let turn=0;
 timer=setInterval(()=>{turn++;for(const c of clients){if(c.ws.readyState!==1||c.pending.size)continue;const payload=!c.usedPotion?(c.usedPotion=true,{action:'use_potion'}):turn%20===0?{action:'heartbeat'}:turn%2===1?{action:'move',area:'forest',x:c.p.x+(turn%4===1?2:0),y:c.p.y}:{action:'attack',targetId:c.p.targetId,spawnRound:17,ability:turn%40===2?1:0,intentId:randomUUID()};try{send(c,payload);}catch(e){fail('send',e);}}},500);
 await pause(180000);clearInterval(timer);const deadline=performance.now()+5000;while(clients.some(c=>c.pending.size)&&performance.now()<deadline)await pause(10);measuring=false;
 const durationMs=performance.now()-started,usage=process.cpuUsage(cpu),processCpuMs=(usage.user+usage.system)/1000;
 report={...counts,durationMs,failures,completedPlayers:clients.filter(c=>c.ws.readyState===1&&!c.pending.size).length,unacknowledged:clients.reduce((n,c)=>n+c.pending.size,0),generator:{pid:process.pid,nice:os.getPriority(0),durationMs,processCpuMs,totalCpuFraction:processCpuMs/durationMs/4,maxRssBytes:process.resourceUsage().maxRSS*1024},channels:[1,2,3,4].map(channel=>({channel,moves:clients.filter(c=>c.p.channel===channel).reduce((n,c)=>n+c.moves,0),attacks:clients.filter(c=>c.p.channel===channel).reduce((n,c)=>n+c.attacks,0)}))};
 return {durationMs,errors:counts.errors,unacknowledged:report.unacknowledged};
}
async function stop(){stopping=true;clearInterval(timer);for(const c of clients){for(const p of c.pending.values())clearTimeout(p.retry);c.ws.terminate();}}
demand(typeof process.send==='function','canary_private_child_required');
process.on('message',async m=>{try{let value;if(m.operation==='init')value=await init(m.value);else if(m.operation==='run')value=await run();else if(m.operation==='report'){demand(report,'canary_report_not_ready');value={...report,inputResponses:responses.report()};}else if(m.operation==='stop'){await stop();value={stopped:true};}else throw Error('canary_operation');process.send({id:m.id,value});if(m.operation==='stop')process.disconnect();}catch(e){process.send({id:m.id,error:e.code??e.message});}});
process.once('disconnect',()=>void stop());
