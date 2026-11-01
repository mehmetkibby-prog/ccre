// One local connection observes actual kernel TCP_NODELAY flags. No load test,
// source transformation, socket-option mutation, or live-server access.
import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {spawnSync} from 'node:child_process';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {WebSocket,WebSocketServer} from '/tmp/core511-build-deps/node_modules/ws/wrapper.mjs';
import {startIngress} from '../../working/core511-source/scripts/delivery511/runtime-ingress.mjs';
const hash=bytes=>createHash('sha256').update(bytes).digest('hex');
const ingressPath=new URL('../../working/core511-source/scripts/delivery511/runtime-ingress.mjs',import.meta.url),ingressBytes=readFileSync(ingressPath);
assert.equal(hash(ingressBytes),'325bd1caa7c52df9df159b63afa3cd7faf470f2cdae3f513a5c4ca29f655cec9');
const channel=http.createServer(),wss=new WebSocketServer({noServer:true});
channel.on('upgrade',(request,socket,head)=>wss.handleUpgrade(request,socket,head,ws=>wss.emit('connection',ws,request)));
const connect=net.connect;let ingress,upstream,inbound,client,channelWs;
const socketFlag=socket=>{
 assert(Number.isInteger(socket?._handle?.fd));
 const result=spawnSync('python3',['-c','import socket; s=socket.socket(fileno=3); print(s.getsockopt(socket.IPPROTO_TCP,socket.TCP_NODELAY))'],{stdio:['ignore','pipe','pipe',socket._handle.fd],encoding:'utf8'});
 assert.equal(result.status,0,result.stderr);return Number(result.stdout.trim());
};
try{
 channel.listen(0,'127.0.0.1');await once(channel,'listening');const channelPort=channel.address().port;
 net.connect=function(...args){const socket=Reflect.apply(connect,this,args);if(Number(args[0]?.port)===channelPort)upstream=socket;return socket;};
 ingress=await startIngress({config:{hosts:['fixture.invalid'],proxyToken:'local-socket-option-fixture',delivery511:{proxyPort:0,channelPorts:[channelPort,0,0,0],appPort:1}},health:()=>Response.json({ok:true})});
 ingress.server.on('connection',socket=>{inbound=socket;});
 const channelReady=once(wss,'connection');
 client=new WebSocket('ws://127.0.0.1:'+ingress.server.address().port+'/_game/game/channel/1',{headers:{'x-col-proxy-token':'local-socket-option-fixture','x-col-public-host':'fixture.invalid','x-col-client-ip':'127.0.0.1'}});
 await once(client,'open');[channelWs]=await channelReady;
 const flags={wsClient:socketFlag(client._socket),mainAcceptedHttpSocket:socketFlag(inbound),mainToChannelRawUpstream:socketFlag(upstream),channelAcceptedWebSocket:socketFlag(channelWs._socket)};
 assert.deepEqual(flags,{wsClient:1,mainAcceptedHttpSocket:1,mainToChannelRawUpstream:1,channelAcceptedWebSocket:1});
 const natives=process.binding('natives'),report={passed:true,nodeVersion:process.version,nodeExecutableSha256:hash(readFileSync(process.execPath)),archivedIngress:{path:ingressPath.pathname,bytes:ingressBytes.length,sha256:hash(ingressBytes),provenance:'One-property noDelay candidate derived from exact4b4a74 archive; not asserted to be installed live bytes.'},kernelTcpNoDelay:flags,readMethod:'getsockopt(IPPROTO_TCP,TCP_NODELAY) from duplicated actual socket fd in a short-lived local Python child; does not change options.',nodeBuiltinHashes:{net:hash(natives.net),httpServer:hash(natives._http_server)},ws:{version:JSON.parse(readFileSync('/tmp/core511-build-deps/node_modules/ws/package.json')).version,websocketJsSha256:hash(readFileSync('/tmp/core511-build-deps/node_modules/ws/lib/websocket.js'))},conclusions:['Patched raw ingress upstream has TCP_NODELAY1, matching all measured WS endpoints.','ws enables NODELAY on endpoints it owns; it never receives the raw proxy upstream socket.','Node22 HTTP accepted sockets default NODELAY on, but raw net.connect defaults it off.'],limits:['One loopback authenticated ingress/WS connection to a simple WS fixture, not native gameplay/load.','No latency A/B, packet trace or causal claim that Nagle explains any particular observed tail.','Live R84 ingress beforehash and installer-supported delivery scope are still required before production patching.']};
 writeFileSync(new URL('../../evidence/ingress-nodelay-after-observe-r85.json',import.meta.url),JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify({passed:true,kernelTcpNoDelay:flags}));
}finally{
 net.connect=connect;client?.terminate();channelWs?.terminate();await ingress?.close();await new Promise(resolve=>wss.close(resolve));await new Promise(resolve=>channel.close(resolve));
}
