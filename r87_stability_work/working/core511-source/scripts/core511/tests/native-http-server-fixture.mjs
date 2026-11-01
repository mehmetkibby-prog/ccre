import http from 'node:http';
import net from 'node:net';
import path from 'node:path';
import {once} from 'node:events';
import assert from 'node:assert/strict';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {realmStartupConfig} from './native-realm-startup-fixture.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {NativeHttpServer} from '../native-http-server.mjs';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

export async function nativeHttpServerFixture(t,{realmSetup=null,worldJobs=false,channelEntry}={}){
 const listeners={},reserved=[];try{for(const channel of [1,2,3,4]){const server=net.createServer();reserved.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});listeners[channel]={host:'127.0.0.1',port:server.address().port};}}finally{await Promise.all(reserved.map(s=>new Promise(r=>s.close(r))));}
 let realm;const s=await nativeHttpHost(t,{listeners,...(channelEntry?{channelEntry}:{}),realmSetup:async(host,seed)=>{await (realm=realmStartupConfig(t,host)).prepare();if(realmSetup)await realmSetup(host,seed);}});if(!worldJobs)await s.world.stopJobs();
 const proxy=process.env.VINEXT_TRUST_PROXY,hosts=process.env.VINEXT_TRUSTED_HOSTS;process.env.VINEXT_TRUST_PROXY='1';process.env.VINEXT_TRUSTED_HOSTS='game.invalid';t.after(()=>{if(proxy===undefined)delete process.env.VINEXT_TRUST_PROXY;else process.env.VINEXT_TRUST_PROXY=proxy;if(hosts===undefined)delete process.env.VINEXT_TRUSTED_HOSTS;else process.env.VINEXT_TRUSTED_HOSTS=hosts;});
 const staged=stageNativeHttp(t),server=await NativeHttpServer.start(s.host,{outDir:path.join(staged.root,'dist-vds'),port:0,hosts:['game.invalid']}),clients=[];
 t.after(()=>{for(const ws of clients)ws.terminate();});
 const raw=(url,{method='GET',body,headers={},privateRequest=false}={})=>{
  const publicHeaders=privateRequest?{}:{...Object.fromEntries(s.f.request().headers),host:'game.invalid','x-forwarded-host':'game.invalid','x-forwarded-proto':'https'};
  const req=http.request({host:'127.0.0.1',port:server.port,path:url,method,agent:false,headers:{...publicHeaders,...headers,...(body===undefined?{}:{'content-type':'application/json'})}});
  const result=new Promise((resolve,reject)=>{req.once('error',reject);req.once('response',res=>{const chunks=[];res.on('data',chunk=>chunks.push(chunk));res.once('error',reject);res.once('end',()=>{const bytes=Buffer.concat(chunks),text=bytes.toString();let body;try{body=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,bytes,text,body});});});});
  req.end(body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body));return {req,result};
 };
 async function networkConnect(ticket,{localAddress}={}){const ws=new WebSocket('ws://127.0.0.1:'+listeners[ticket.channel].port+ticket.url,{origin:s.f.origin,...(localAddress?{localAddress}:{})}),packets=[],errors=[];clients.push(ws);ws.on('error',e=>errors.push(e.code??e.message));ws.on('message',bytes=>packets.push(JSON.parse(bytes)));await once(ws,'open');const closed=once(ws,'close');ws.send(JSON.stringify({type:'auth',ticket:ticket.ticket}));await until(()=>packets.some(p=>p.type==='ready')||ws.readyState===3,7000);assert(packets.some(p=>p.type==='ready'),JSON.stringify(packets));return {ws,packets,errors,closed};}
 return {...s,server,realm,staged,listeners,raw,call:(...args)=>raw(...args).result,networkConnect};
}
