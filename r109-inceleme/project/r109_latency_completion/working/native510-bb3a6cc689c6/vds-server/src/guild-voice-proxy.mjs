import {createServer,request as upstreamRequest} from 'node:http';
// Only the SFU signaling paths are public. Tokens are checked against current
// guild membership and the live game instance before each WebSocket upgrade.
export function startGuildVoiceProxy(voice,{port=3005,upstreamPort=7880}={}){
 const sockets=new Set();
 const target=req=>{const url=new URL(req.url,'http://localhost');if(req.method!=='GET'||!/^\/rtc(?:\/v1)?(?:\/validate)?$/.test(url.pathname))return null;return url;};
 const authorize=async req=>{const url=target(req);if(!url)return false;const token=url.searchParams.get('access_token')??String(req.headers.authorization??'').replace(/^Bearer /i,'');return voice.authorize(token);};
 const forward=req=>upstreamRequest({host:'127.0.0.1',port:upstreamPort,method:'GET',path:req.url,headers:{...req.headers,host:`127.0.0.1:${upstreamPort}`},timeout:8000});
 const server=createServer(async(req,res)=>{try{if(!await authorize(req)){res.writeHead(403,{'Cache-Control':'no-store'});res.end('Sesli salon yetkisi sona erdi.');return;}const p=forward(req);p.on('response',r=>{res.writeHead(r.statusCode??502,r.headers);r.pipe(res);});p.on('timeout',()=>p.destroy());p.on('error',()=>{if(!res.headersSent)res.writeHead(503);res.end();});req.on('aborted',()=>p.destroy());p.end();}catch{res.writeHead(503);res.end();}});
 server.on('upgrade',async(req,socket,head)=>{try{if(!await authorize(req)){socket.end('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');return;}const p=forward(req);p.on('upgrade',(r,upstream,upstreamHead)=>{upstream.setTimeout(0);socket.write(`HTTP/1.1 ${r.statusCode} ${r.statusMessage}\r\n`+Object.entries(r.headers).map(([k,v])=>`${k}: ${v}\r\n`).join('')+'\r\n');if(head.length)upstream.write(head);if(upstreamHead.length)socket.write(upstreamHead);upstream.pipe(socket);socket.pipe(upstream);socket.on('error',()=>upstream.destroy());upstream.on('error',()=>socket.destroy());socket.on('close',()=>upstream.destroy());});p.on('response',()=>socket.destroy());p.on('error',()=>socket.destroy());p.on('timeout',()=>p.destroy());p.end();}catch{socket.destroy();}});
 server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});server.requestTimeout=10000;server.headersTimeout=10000;
 server.on('error',error=>console.error('Voice proxy unavailable:',error.code));server.listen(port,'127.0.0.1');server.unref();return {server,close:()=>{for(const socket of sockets)socket.destroy();server.close();}};
}
