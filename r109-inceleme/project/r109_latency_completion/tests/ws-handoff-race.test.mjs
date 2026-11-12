// R110 socket handoff, focused: the real ChannelProcessSupervisor.handoffWebSocket
// against a real child process. The child is kept busy while the client sends
// its first frame; without readStop in the realm process Node would read and
// discard those bytes (the sent handle's onread is a no-op until the ACK).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fork} from 'node:child_process';
import {once} from 'node:events';
const tree=process.env.STUTTER_TREE||path.resolve(import.meta.dirname,'../working');
const {ChannelProcessSupervisor}=await import(tree+'/core511-source/scripts/core511/process-supervisor.mjs');
const handoff=ChannelProcessSupervisor.prototype.handoffWebSocket;
const childSource=`process.on('message',(m,handle)=>{
 if(m==='block'){const end=Date.now()+400;while(Date.now()<end);return;}
 if(m?.type!=='kernel511-ws-handoff')return;
 let got='';handle.on('data',b=>got+=b);handle.on('error',()=>{});
 setTimeout(()=>{process.send({got,url:m.url,headers:m.headers,head:m.head?Buffer.from(m.head).toString():null});handle.destroy();},250);
});process.send('ready');`;
async function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r110-race-'));fs.writeFileSync(dir+'/child.mjs',childSource);
 const child=fork(dir+'/child.mjs',[],{serialization:'advanced',stdio:['ignore','inherit','inherit','ipc']});await once(child,'message');
 const supervisor={closing:false,rows:new Map([[1,{ready:true,exited:false,expected:false,state:'running',child}]])};
 const upgrades=[];const server=http.createServer((_,res)=>res.end());server.on('upgrade',(req,socket,head)=>upgrades.push({req,socket,head}));
 server.listen(0,'127.0.0.1');await once(server,'listening');
 t.after(async()=>{child.kill();server.closeAllConnections?.();await new Promise(r=>server.close(r));fs.rmSync(dir,{recursive:true,force:true});});
 const upgrade=async()=>{const client=net.connect(server.address().port,'127.0.0.1');await once(client,'connect');client.write('GET /game/channel/1 HTTP/1.1\r\nHost: x\r\nConnection: Upgrade\r\nUpgrade: websocket\r\n\r\n');const until=Date.now()+2000;while(!upgrades.length&&Date.now()<until)await new Promise(r=>setTimeout(r,5));return {client,...upgrades.shift()};};
 return {child,supervisor,server,upgrade};
}
test('first client bytes sent while the channel is busy reach the channel, not the realm',async t=>{
 const {child,supervisor,upgrade}=await fixture(t);
 const {client,req,socket,head}=await upgrade();
 child.send('block');
 assert.equal(handoff.call(supervisor,1,socket,{url:req.url,headers:{...req.headers,'x-real-ip':'198.51.100.7'},head}),true);
 client.write('FIRST-FRAME');
 const [reply]=await once(child,'message');
 assert.equal(reply.got,'FIRST-FRAME');assert.equal(reply.url,'/game/channel/1');assert.equal(reply.headers['x-real-ip'],'198.51.100.7');assert.equal(reply.head,null);
 assert.equal(supervisor.handoffStatsR110.sent,1);client.destroy();
});
test('handoff is declined, socket untouched, when this process already holds client bytes or the channel is not running',async t=>{
 const {supervisor,upgrade,server}=await fixture(t);
 const first=await upgrade();
 first.client.write('EARLY');const until=Date.now()+1000;while(!first.socket.readableLength&&Date.now()<until)await new Promise(r=>setTimeout(r,5));
 assert(first.socket.readableLength>0);
 assert.equal(handoff.call(supervisor,1,first.socket,{url:first.req.url,headers:first.req.headers,head:first.head}),false);
 assert.equal(first.socket.destroyed,false);assert.equal(first.socket.read().toString(),'EARLY');
 const second=await upgrade();supervisor.rows.get(1).state='exited';
 assert.equal(handoff.call(supervisor,1,second.socket,{url:second.req.url,headers:second.req.headers,head:second.head}),false);
 assert.equal(second.socket.destroyed,false);assert.equal(handoff.call(supervisor,2,second.socket,{}),false);
 assert.equal(supervisor.handoffStatsR110.declined,3);
 first.client.destroy();second.client.destroy();first.socket.destroy();second.socket.destroy();
 // A realm-side close never waits on sockets owned by another process.
 supervisor.rows.get(1).state='running';const third=await upgrade();
 assert.equal(handoff.call(supervisor,1,third.socket,{url:third.req.url,headers:third.req.headers,head:third.head}),true);
 await new Promise(r=>setTimeout(r,50));const started=Date.now();await new Promise(r=>server.close(r));assert(Date.now()-started<1000);third.client.destroy();
});
