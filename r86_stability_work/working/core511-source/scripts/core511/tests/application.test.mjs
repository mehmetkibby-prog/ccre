import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import {once} from 'node:events';
import {startApplication,applicationConfiguration} from '../application.mjs';
import {PROTOCOL} from '../contract.mjs';
import {nativeHttpHost} from './native-http-host-fixture.mjs';
import {realmStartupConfig} from './native-realm-startup-fixture.mjs';
import {stageNativeHttp} from './native-http-bundle-fixture.mjs';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');

test('production application starts sole locked writer, read worker, world and four real WS channels; drains before lock release',{timeout:50000},async()=>{
 const cleanup=[],t={after:fn=>cleanup.push(fn)},faults=[];let runtime,ws;try{
  const {host,seed}=await nativeHttpHost(t,{start:false}),transport=realmStartupConfig(t,host,{securityRead:()=>runtime?.host.database.sqlite??seed.sql}),staged=stageNativeHttp(t),manifest=JSON.parse(fs.readFileSync(transport.config.realm.manifestFile)),servers=[],ports=[];
  try{for(let i=0;i<9;i++){const server=net.createServer();servers.push(server);await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});ports.push(server.address().port);}}finally{await Promise.all(servers.map(s=>new Promise(r=>s.close(r))));}
  const realm=manifest.realms[0];realm.origin=seed.origin;realm.ports={proxy:ports[0],app:ports[1],realtime:ports[2],dungeon:ports[3],voice:ports[4],channels:ports.slice(5)};fs.writeFileSync(transport.config.realm.manifestFile,JSON.stringify(manifest));
  await host.database.atomic(()=>host.database.sqlite.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(seed.id));await host.close();
  const config={...transport.config,hosts:[new URL(seed.origin).host],kernel511:{protocol:PROTOCOL,outDir:path.join(staged.root,'dist-vds')}};
  await assert.rejects(applicationConfiguration({...config,database:'/not/current.sqlite'}),{code:'application_realm_identity'});
  await assert.rejects(applicationConfiguration({...config,environment:{CORE_VOICE_UPSTREAM_PORT:'0'}}),{code:'application_voice_upstream'});
  runtime=await startApplication(config,{onFault:i=>faults.push(i)});const {core}=runtime;assert.equal(runtime.host.children.size,5);assert(core.timer);assert.equal(runtime.host.database.worldLoop,undefined);assert.equal(runtime.host.database.channelCompute,undefined);assert.equal(runtime.core.reader,runtime.reader);
  const call=(route,body)=>new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port:ports[1],path:route,method:body?'POST':'GET',agent:false,headers:{...Object.fromEntries(seed.request().headers),host:new URL(seed.origin).host,'x-forwarded-host':new URL(seed.origin).host,'x-forwarded-proto':'https'}},res=>{let text='';res.on('data',b=>text+=b);res.on('end',()=>resolve({status:res.statusCode,body:JSON.parse(text)}));});req.on('error',reject);req.end(body?JSON.stringify(body):undefined);});
  const health=await call('/api/vds-health');assert.equal(health.status,200);assert.equal(health.body.realm.protocol,PROTOCOL);assert.equal(health.body.realm.channels.length,4);
  const ticket=await call('/api/realtime/core511-ticket',{protocol:PROTOCOL});assert.equal(ticket.status,200,JSON.stringify(ticket));const packets=[];ws=new WebSocket('ws://127.0.0.1:'+ports[ticket.body.channel+4]+ticket.body.url,{origin:seed.origin});ws.on('message',data=>packets.push(JSON.parse(data)));await once(ws,'open');ws.send(JSON.stringify({type:'auth',ticket:ticket.body.ticket}));await until(()=>packets.some(p=>p.type==='ready'),7000);
  ws.send(JSON.stringify({type:'input',sequence:1,payload:{action:'use_potion'}}));await until(()=>packets.some(p=>p.results?.some(r=>r.sequence===1)),7000);assert.equal(runtime.host.database.sqlite.prepare('SELECT potions FROM players WHERE id=?').get(seed.id).potions,1);
  ws.terminate();ws=null;await runtime.close();assert(runtime.host.closed);assert([...runtime.host.children.values()].every(row=>row.exited));assert.equal(faults.length,0,faults.map(i=>i.error?.stack).join('\n'));runtime=null;
 }finally{ws?.terminate();await runtime?.close();for(const fn of cleanup.toReversed())await fn();}
});
