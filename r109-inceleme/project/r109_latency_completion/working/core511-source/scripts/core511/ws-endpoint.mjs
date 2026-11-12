import {r37Options} from './r37-options.mjs';
import http from 'node:http';
import {isIP} from 'node:net';
import {demand,validChannel} from './contract.mjs';
import {actorFaultIsolation} from './r48-options.mjs';
import {createFaultReporter} from './fence-diagnostics.mjs';
const reportUpgradeFault=createFaultReporter(text=>process.stderr.write(text));
const deniedReservation=new Set(['invalid_connection_identity','connection_lease_expired','connection_lease_owner','ipc_backpressure']);
const loopback=ip=>ip==='::1'||ip==='::ffff:127.0.0.1'||/^127\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(ip)&&isIP(ip)===4;
export const gameSocketPath=channel=>{demand(validChannel(channel),'invalid_channel');return '/game/channel/'+channel;};

// Bind this server to loopback behind the configured proxy. Origin and shared
// coordinator IP quota are checked before WebSocket allocation. The proxy must
// overwrite X-Real-IP; it is honored only on a trusted local connection.
export function createChannelWebSocketEndpoint({WebSocketServer,channel,boot,origins,budget,connections,onFault=()=>{}}){
 demand(typeof WebSocketServer==='function'&&validChannel(channel)&&typeof boot==='string'&&origins instanceof Set&&origins.size>0,'websocket_endpoint_configuration');
 const server=http.createServer((_,response)=>{response.writeHead(404,{'Connection':'close'});response.end();});
 server.requestTimeout=5000;server.headersTimeout=6000;server.keepAliveTimeout=5000;
 const webSockets=new WebSocketServer({noServer:true,maxPayload:r37Options.ingressBytes,perMessageDeflate:false,clientTracking:true});
 const pending=new Set();let closing=false;
 const reject=(socket,status)=>{if(socket.destroyed)return;socket.end('HTTP/1.1 '+status+'\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');};
 server.on('upgrade',(request,socket,head)=>{
  const run=async()=>{
   let lease=null,attached=false;const onError=()=>socket.destroy();socket.on('error',onError);
   try{
    const url=new URL(request.url??'/','http://localhost'),origin=request.headers.origin,remote=request.socket.remoteAddress??'';
    if(closing||request.method!=='GET'||url.pathname!==gameSocketPath(channel)||url.search||typeof origin!=='string'||!origins.has(origin)||!loopback(remote)){reject(socket,'403 Forbidden');return;}
    const forwarded=request.headers['x-real-ip'],ip=forwarded===undefined?remote:typeof forwarded==='string'?forwarded.trim():'';
    if(!isIP(ip)){reject(socket,'403 Forbidden');return;}
    // Bound requests awaiting the single coordinator; global quota still wins.
    if(pending.size>=128){reject(socket,'503 Service Unavailable');return;}
    pending.add(socket);
    lease=await budget.reserve(ip,boot);
    if(closing||socket.destroyed)return;
    webSockets.handleUpgrade(request,socket,head,ws=>{
     connections.attach(ws,{lease,boot,origin});attached=true;
    });
   }catch(error){if(error.code==='connection_budget_exceeded')reject(socket,'429 Too Many Requests');else if(actorFaultIsolation&&deniedReservation.has(error?.code)){reportUpgradeFault({channel,error});reject(socket,'503 Service Unavailable');}else{socket.destroy();onFault(error);}}
   finally{pending.delete(socket);if(lease&&!attached)try{await budget.release(lease,boot);}catch(error){if(actorFaultIsolation&&['connection_lease_owner','connection_lease_expired'].includes(error?.code))reportUpgradeFault({channel,error});else onFault(error);}}
  };
  void run();
 });
 // Dungeon AI's native connected-player window is ten seconds. Five-second
 // pings maintain it without DB heartbeats; the session timeout stays 40 s.
 const heartbeat=setInterval(()=>connections.heartbeat(),5000);heartbeat.unref();
 // R110: the realm ingress has already checked the proxy token, host, client IP
 // header and path, then handed the accepted client socket to this process. The
 // exact same upgrade handler runs: method/path/query/Origin/loopback peer,
 // X-Real-IP, pending bound, coordinator IP budget and ws handshake. The request
 // object carries the headers the ingress would have written on its TCP hop.
 const adopt=(socket,{url,headers,head}={})=>{
  if(typeof url!=='string'||url.length>2048||!headers||typeof headers!=='object'||Array.isArray(headers)){socket.destroy();return;}
  const request={method:'GET',url,headers,httpVersion:'1.1',httpVersionMajor:1,httpVersionMinor:1,socket};
  server.emit('upgrade',request,socket,head?Buffer.from(head):Buffer.alloc(0));
 };
 return {server,webSockets,pending,adopt,close(){
  closing=true;clearInterval(heartbeat);for(const socket of pending)socket.destroy();connections.close();
  for(const socket of webSockets.clients)socket.terminate();webSockets.close();server.close();
 }};
}
