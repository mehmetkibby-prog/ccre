// Preserve the installed Caddy -> /_game + secret-header contract. Only fixed
// channel paths reach WS owners. All session/Origin/rate checks stay in core698.
import {trustedClientIpR102} from '../core511/trusted-client-ip-r102.mjs';
import http from 'node:http';
import net from 'node:net';
import {timingSafeEqual} from 'node:crypto';
import {proxyGameRequest} from '../../../native510-bb3a6cc689c6/vds-server/src/game-proxy.mjs';
const privatePath=p=>/^\/(?:internal(?:\/|$)|api\/(?:realm\/(?:internal|maintenance)(?:\/|$)|loadtest(?:\/|$)))/.test(p);
export async function startIngress({config,health,acceptsPlay=()=>true,gateStatus=null}){
 const d=config.delivery511,sockets=new Set();let closing=false;
 const gateReasons=new Set(['closing','control_error','opening_pending','world_recovery','world_unavailable','jobs_paused','jobs_starting']);
 let lastGateLog=0;
 const gate=()=>{
  const value=gateStatus?.()??{allowed:acceptsPlay(),reason:'kernel_not_ready',retryable:false};
  if(value.allowed)return {allowed:true};
  return {allowed:false,reason:gateReasons.has(value.reason)?value.reason:'kernel_not_ready',retryable:value.retryable===true};
 };
 const logGate=(state,kind)=>{const now=Date.now();if(now-lastGateLog<5000)return;lastGateLog=now;console.warn('core511_ingress_gate',JSON.stringify({reason:state.reason,retryable:state.retryable,kind}));};
 const authorized=req=>{
  const supplied=Buffer.from(String(req.headers['x-col-proxy-token']??'')),expected=Buffer.from(config.proxyToken??'');
  if(!['127.0.0.1','::1','::ffff:127.0.0.1'].includes(req.socket.remoteAddress)||!expected.length||supplied.length!==expected.length||!timingSafeEqual(supplied,expected))throw Error('proxy_auth');
  if(!req.url.startsWith('/_game/'))throw Error('proxy_path');
  const host=String(req.headers['x-col-public-host']??'').toLowerCase(),ip=trustedClientIpR102(String(req.headers['x-col-client-ip']??''),req.headers);
  if(!config.hosts.includes(host)||net.isIP(ip)===0)throw Error('proxy_identity');
  const target=req.url.slice(6),pathname=new URL(target,'http://local').pathname;
  if(privatePath(pathname)||pathname.startsWith('/_game/'))throw Error('proxy_private');
  const headers={...req.headers,host,'x-forwarded-host':host,'x-forwarded-proto':'https','x-real-ip':ip,'cf-connecting-ip':ip};
  for(const key of Object.keys(headers))if(key.startsWith('x-col-')||['forwarded','x-forwarded-for'].includes(key))delete headers[key];
  return {target,pathname,headers};
 };
 const server=http.createServer(async(req,res)=>{
  if(closing){res.writeHead(503);res.end();return;}
  if(req.url==='/full-readyz'&&req.method==='GET'){
   const h=await health(),body=await h.json();res.writeHead(h.status,{'content-type':'application/json'});res.end(JSON.stringify({ok:body.ok,appReady:body.ok,protocol:'col-fullsite-v1',releaseId:'CORE511',status:'active'}));return;
  }
  try{const r=authorized(req);if(r.pathname.startsWith('/game/channel/'))throw Error('websocket_required');if(r.pathname.startsWith('/api/')&&!/^\/api\/(?:admin(?:\/|$)|auth(?:\/|$)|realm(?:\/|$)|launch(?:\/|$)|vds-health$)/.test(r.pathname)){const state=gate();if(!state.allowed){logGate(state,'http');res.writeHead(503,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify({error:'Çekirdek açılışa hazır değil; admin panelini kontrol edin.',code:'kernel511_unavailable',reason:state.reason,retryable:state.retryable,accepted:false}));return;}}proxyGameRequest(req,res,{hostname:'127.0.0.1',port:d.appPort,path:r.target,method:req.method,headers:r.headers});}
  catch{res.writeHead(403,{'cache-control':'no-store'});res.end();}
 });
 server.on('connection',socket=>{sockets.add(socket);socket.once('close',()=>sockets.delete(socket));});
 server.on('upgrade',(req,socket,head)=>{
  let r,channel;
  try{r=authorized(req);const m=/^\/game\/channel\/([1-4])$/.exec(r.pathname);if(!m||closing||String(req.headers.upgrade).toLowerCase()!=='websocket')throw Error('websocket_path');channel=Number(m[1]);}
  catch{socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
  const state=gate();if(!state.allowed){logGate(state,'websocket');socket.end('HTTP/1.1 503 Service Unavailable\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
  const upstream=net.connect({host:'127.0.0.1',port:d.channelPorts[channel-1],noDelay:true});sockets.add(upstream);upstream.once('close',()=>sockets.delete(upstream));
  const close=()=>{socket.destroy();upstream.destroy();};socket.on('error',close);upstream.on('error',close);socket.once('close',()=>upstream.destroy());upstream.once('close',()=>socket.destroy());
  upstream.once('connect',()=>{const headers={...r.headers,connection:'Upgrade',upgrade:'websocket'};upstream.write(`GET ${r.target} HTTP/1.1\r\n`+Object.entries(headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')+'\r\n');if(head.length)upstream.write(head);socket.pipe(upstream).pipe(socket);});
 });
 server.keepAliveTimeout=130000;server.headersTimeout=10000;server.requestTimeout=35000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(d.proxyPort,'127.0.0.1',resolve);});
 return {server,close:()=>new Promise(resolve=>{closing=true;server.close(resolve);for(const socket of sockets)socket.destroy();})};
}
