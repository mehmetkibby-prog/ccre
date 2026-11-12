import test from 'node:test';
import assert from 'node:assert/strict';
import {generateKeyPairSync} from 'node:crypto';
import {MessageChannel} from 'node:worker_threads';
import {once} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {MessagePortStream} from '../message-port-stream.mjs';
import {createChannelWebSocketEndpoint,gameSocketPath} from '../ws-endpoint.mjs';
import {ChannelConnections} from '../channel-connections.mjs';
import {ConnectionBudget} from '../connection-budget.mjs';
import {TicketConsumer,issueTicket} from '../ticket.mjs';
import {until} from './helpers.mjs';
const wsRoot=process.env.CORE511_WS_MODULE??'/tmp/core511-build-deps/node_modules/ws';
assert.equal(JSON.parse(fs.readFileSync(path.join(wsRoot,'package.json'))).version,'8.21.3');
const {WebSocket,WebSocketServer}=await import(pathToFileURL(path.join(wsRoot,'wrapper.mjs')));
const origin='https://game.invalid',{privateKey,publicKey}=generateKeyPairSync('ec',{namedCurve:'prime256v1'});
function pipe(t,endpoint,{remote='127.0.0.1',headers={},pathname=gameSocketPath(4),requestOrigin=origin}={}){
 const ports=new MessageChannel(),client=new MessagePortStream(ports.port1),server=new MessagePortStream(ports.port2);
 Object.defineProperty(server,'remoteAddress',{value:remote});
 // Actual Node HTTP parser, Upgrade exchange and ws masking/framing, carried
 // over MessagePort instead of TCP. This is NOT the installation network test.
 endpoint.server.emit('connection',server);
 const socket=new WebSocket('ws://127.0.0.1'+pathname,{createConnection:()=>client,origin:requestOrigin,headers,handshakeTimeout:4000});
 socket.on('error',()=>{});t.after(()=>{socket.terminate();client.destroy();server.destroy();});return socket;
}
function fixture(t){
 const budget=new ConnectionBudget(),identity={realm:'ws-fixture',channel:4,boot:'ws-boot',actor:'p',account:'a',session:'s',epoch:1,securityVersion:0,origin};
 const inputs=[],packets=[];let verifications=0,disconnects=0;
 const kernel={state:{channel:4},players:new Map([['p',{epoch:1,lastAccepted:0,lastApplied:0}]]),enqueue:(id,input)=>inputs.push({id,input})};
 const tickets=new TicketConsumer({publicKey,...identity,origins:new Set([origin]),assertOwner:()=>{verifications++;return true;}});
 const connections=new ChannelConnections({tickets,budget,kernel,admit:()=>{},guard:()=>true,rate:()=>0,disconnected:()=>disconnects++});
 const endpoint=createChannelWebSocketEndpoint({WebSocketServer,channel:4,boot:identity.boot,origins:new Set([origin]),budget,connections});t.after(()=>endpoint.close());
 return {endpoint,budget,connections,identity,inputs,packets,verifications:()=>verifications,disconnects:()=>disconnects};
}
test('real HTTP Upgrade and WS frames over MessageChannel authenticate once and carry inputs, output, ping and ban',{timeout:10000},async t=>{
 const s=fixture(t),socket=pipe(t,s.endpoint);await once(socket,'open');
 const ready=once(socket,'message');socket.send(JSON.stringify({type:'auth',ticket:issueTicket(privateKey,s.identity)}));
 assert.equal(JSON.parse((await ready)[0]).type,'ready');
 socket.send(JSON.stringify({type:'input',sequence:1,payload:{action:'move',x:3,y:4}}));
 socket.send(JSON.stringify({type:'input',sequence:2,payload:{action:'attack',targetId:'m'}}));await until(()=>s.inputs.length===2);assert.equal(s.verifications(),1);
 const frame=once(socket,'message');s.connections.send('p',{type:'world',lastApplied:2,results:[{ok:true}]});assert.equal(JSON.parse((await frame)[0]).lastApplied,2);
 const pong=once([...s.endpoint.webSockets.clients][0],'pong');s.connections.heartbeat();await pong;
 const closed=once(socket,'close');s.connections.revoke({account:'a'});assert.equal((await closed)[0],4003);await until(()=>s.budget.leases.size===0&&s.disconnects()===1);
});
test('real upgrade rejects wrong origin, route, untrusted proxy and forged IP without reserving a slot',{timeout:10000},async t=>{
 const s=fixture(t);
 for(const options of [{requestOrigin:'https://evil.invalid'},{pathname:'/game/channel/1'},{remote:'192.0.2.8',headers:{'x-real-ip':'127.0.0.1'}},{headers:{'x-real-ip':'garbage'}}]){
  const socket=pipe(t,s.endpoint,options);await once(socket,'error');await until(()=>socket.readyState===3);assert.equal(s.budget.leases.size,0);
 }
});
test('real masked WS rejects ticket replay and binary game input',{timeout:10000},async t=>{
 const s=fixture(t),token=issueTicket(privateKey,s.identity),first=pipe(t,s.endpoint);await once(first,'open');
 let reply=once(first,'message');first.send(JSON.stringify({type:'auth',ticket:token}));await reply;
 const replay=pipe(t,s.endpoint);await once(replay,'open');const replayClose=once(replay,'close');replay.send(JSON.stringify({type:'auth',ticket:token}));assert.equal((await replayClose)[0],1008);
 const closed=once(first,'close');first.send(Buffer.from('{}'));assert.equal((await closed)[0],1009);assert.equal(s.inputs.length,0);
});
