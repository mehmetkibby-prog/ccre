import {dungeonFrames510} from "./dungeon-frame510.mjs";
import http from 'node:http';
import {randomBytes} from 'node:crypto';
import {WebSocketServer} from 'ws';
export function createDungeonStream(engine,{hosts=[],port=3004,now=Date.now,validate=()=>true,deadline=()=>Infinity}={}){
 const tickets=new Map(),clients=new Map(),frames510=dungeonFrames510(engine);
 const server=http.createServer((req,res)=>{res.writeHead(404);res.end();});
 const wss=new WebSocketServer({server,maxPayload:4096,perMessageDeflate:false});
 function issue(auth){const token=randomBytes(32).toString('hex');tickets.set(token,{id:auth.player.id,auth,botCheckAtMs:deadline(auth),until:now()+20000});for(const[k,v]of tickets)if(v.until<now())tickets.delete(k);return token;}
 wss.on('connection',(ws,req)=>{
  let origin;try{origin=new URL(req.headers.origin).hostname;}catch{}
  if(!hosts.includes(origin)){ws.close(1008);return;}
  let identity=null,count=0,windowAt=now(),pending=0,tail=Promise.resolve();const timeout=setTimeout(()=>{if(!identity)ws.close(1008);},5000);timeout.unref();
  ws.on('close',()=>{clearTimeout(timeout);if(identity&&clients.get(identity.id)?.ws===ws)clients.delete(identity.id);});
  ws.on('error',()=>{});
  ws.on('message',raw=>{
   if(now()-windowAt>=1000){count=0;windowAt=now();}if(++count>65){ws.close(1008);return;}
   // A durable async command must finish before the next command from this
   // stream. Bound the queue if storage is stalled; never ACK a pending reward.
   if(pending>=32){ws.close(1013);return;}pending++;
   tail=tail.then(async()=>{try{
   if(ws.readyState!==1)return;
   const data=JSON.parse(raw.toString());
   if(!identity){const ticket=tickets.get(data.ticket);tickets.delete(data.ticket);if(!ticket||ticket.until<now()||!validate(ticket.auth)||!engine.membership(ticket.id)){ws.close(1008);return;}identity=ticket;clients.get(identity.id)?.ws.close(1000);clients.set(identity.id,{ws,identity,checked:now()});clearTimeout(timeout);ws.send(JSON.stringify({type:'ready'}));return;}
   if(globalThis.__colRealm?.maintenance&&!globalThis.__colRealm.maintenance.allows(identity.auth.account.id)||now()>=identity.botCheckAtMs){ws.close(1008);return;}
   if(!['sync','collect'].includes(data.action))return;
   if(data.action==='sync'&&(!Number.isFinite(data.x)||!Number.isFinite(data.y)||Math.abs(data.x)>1||Math.abs(data.y)>1||!Number.isSafeInteger(data.sequence)))return;
   const run=engine.runs.get(engine.membership(identity.id));if(!run||data.runId!==run.id||data.attempt!==run.attempt)return;
   const result=await engine.command(identity.id,{...data,stream:true});if(result.notice&&ws.readyState===1)ws.send(JSON.stringify({type:'notice',message:result.notice}));
  }catch{if(ws.readyState===1)ws.send(JSON.stringify({type:'notice',message:'Zindan işlemi uygulanamadı.'}));}finally{pending--;}});
  });
 });
 const timer=setInterval(()=>{
  const frames=new Map(),runsByMember=new Map();
  // The synchronous frame sees the live room list once. Do not retain a room
  // index across ticks: leave, finish and transfer must be visible next frame.
  if(clients.size)for(const run of engine.runs.values())for(const member of run.members){
   if(!member.left&&!runsByMember.has(member.id))runsByMember.set(member.id,run);
  }
  for(const[id,c]of clients){
   if(c.ws.readyState!==1)continue;
   if(now()-c.checked>5000){c.checked=now();if(!validate(c.identity.auth)){c.ws.close(1008);continue;}}
   const run=runsByMember.get(id);
   if(!run){c.ws.send(JSON.stringify({type:'state',state:{run:null,notice:engine.notices?.get(id)?.message,settings:{},materials:{}}}));c.ws.close(1000);continue;}
   const member=run.members.find(p=>p.id===id);member.seen=now();
   if(c.ws.bufferedAmount>32768)continue; // no queued stale snapshots on slow devices
   const frameKey = member.gmInvisible ? `${run.id}:self:${id}` : run.id;
   if(!frames.has(frameKey))frames.set(frameKey,JSON.stringify({type:'state',state:{run:frames510.project(run,id),settings:run.cfg}}));
   c.ws.send(frames.get(frameKey));
  }
 },33);timer.unref();server.listen(port,'127.0.0.1');
 return {issue,revalidate438(){for(const c of clients.values())if(!validate(c.identity.auth))c.ws.close(1008);},close:()=>{clearInterval(timer);for(const c of clients.values())c.ws.terminate();wss.close();server.close();},server};
}
