import http from 'node:http';
import net from 'node:net';
import {fork} from 'node:child_process';
import {once} from 'node:events';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
const {ProcessStream}=await import(process.env.STUTTER_TREE+'/core511-source/scripts/core511/process-stream.mjs');
export async function remoteBots(scope,s,actors){
 const bridges=new Set(),sockets=new Set();let child,serial=0;const waiting=new Map();
 const server=http.createServer(async(req,res)=>{try{
  const chunks=[];for await(const b of req)chunks.push(b);
  const response=await (req.url.startsWith('/api/realtime/core511-')?s.core.http.bind(s.core):s.route)(new Request(s.f.origin+req.url,{method:req.method,headers:req.headers,...(['GET','HEAD'].includes(req.method)?{}:{body:Buffer.concat(chunks)})}));
  res.statusCode=response.status;for(const [k,v]of response.headers)res.setHeader(k,v);res.end(Buffer.from(await response.arrayBuffer()));
 }catch(e){res.writeHead(500).end(JSON.stringify({error:e.message}));}});
 server.on('connection',socket=>{sockets.add(socket);socket.on('close',()=>sockets.delete(socket));});
 server.on('upgrade',async(req,socket,head)=>{try{
  const channel=Number(req.url.match(/^\/game\/channel\/([1-4])$/)?.[1]),row=s.supervisor.rows.get(channel);assert(row);
  const listener=s.testListeners?.[channel],stream='validation:'+randomUUID();
  const bridge=listener?net.connect({...listener,noDelay:true}):new ProcessStream(row.child,{stream});bridges.add(bridge);bridge.on('close',()=>bridges.delete(bridge));
  if(listener)await once(bridge,'connect');else await new Promise((resolve,reject)=>row.child.send({type:'validation-client',stream},e=>e?reject(e):resolve()));
  bridge.on('error',()=>socket.destroy());socket.on('error',()=>bridge.destroy());socket.on('close',()=>bridge.destroy());bridge.on('close',()=>socket.destroy());
  const actor=actors[Number(req.headers['x-test-actor'])];assert(actor,'known synthetic socket actor');const headers={...req.headers,'x-real-ip':'198.51.100.'+(actor.n+1)};delete headers['x-test-actor'];
  bridge.write('GET '+req.url+' HTTP/1.1\r\n'+Object.entries(headers).map(([k,v])=>k+': '+v).join('\r\n')+'\r\n\r\n');if(head.length)bridge.write(head);socket.pipe(bridge).pipe(socket);
 }catch(e){console.error("population_upgrade",e);socket.destroy();}});
 server.listen(0,'127.0.0.1');await once(server,'listening');
 const call=(method,value)=>new Promise((resolve,reject)=>{const id=++serial,timer=setTimeout(()=>{waiting.delete(id);reject(Error('bot driver timeout: '+method));},120000);waiting.set(id,{resolve,reject,timer});child.send({id,method,value});});
 scope.after(async()=>{
  if(child?.connected){await call('close').catch(()=>{});child.disconnect();}
  for(const b of bridges)b.destroy();for(const socket of sockets)socket.destroy();await new Promise(r=>server.close(r));
  if(child?.exitCode===null){await Promise.race([once(child,'exit'),new Promise(r=>setTimeout(r,3000))]);if(child.exitCode===null)child.kill('SIGKILL');}
 });
 child=fork(new URL('./population-bots.mjs',import.meta.url),{execArgv:[],env:{...process.env},serialization:'advanced',stdio:['ignore','inherit','inherit','ipc']});
 child.on('message',m=>{const row=waiting.get(m.id);if(!row)return;waiting.delete(m.id);clearTimeout(row.timer);m.error?row.reject(Object.assign(Error(m.error.message),{stack:m.error.stack})):row.resolve(m.result);});
 child.on('exit',()=>{for(const row of waiting.values()){clearTimeout(row.timer);row.reject(Error('bot driver exited'));}waiting.clear();});
 for(const a of actors)await s.host.database.atomic(()=>globalThis.__colLaunch.grant(a.account.id,true));
 const ready=await call('init',{origin:'http://127.0.0.1:'+server.address().port,serverOrigin:s.f.origin,actors:actors.map(({n,id,channel,token,csrf,instance,zone,portalId,targetId,equipmentFixture})=>({n,id,channel,token,csrf,instance,zone,portalId,targetId,equipmentFixture}))});assert.equal(ready.players,actors.length);assert.notEqual(ready.pid,process.pid);
 return {call,pid:ready.pid};
}
