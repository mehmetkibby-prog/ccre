import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {nativeHttpServerFixture} from './native-http-server-fixture.mjs';
import {native,until,BASE,hash} from './helpers.mjs';
import {PROTOCOL} from '../contract.mjs';
const {signRealmServiceRequest}=await native('vds-server/src/realm-service-auth.mjs');

test('actual native loopback HTTP and four TCP channel listeners retain authorization, purchase, transfer and static bytes',{timeout:45000},async t=>{
 const s=await nativeHttpServerFixture(t),call=s.call;
 const health=await call('/api/vds-health');assert.equal(health.status,200,health.text);assert.deepEqual(health.body.realm.channels,[0,0,0,0]);assert.equal(s.server.server.address().address,'127.0.0.1');
 assert.equal((await call('/api/auth/login',{method:'POST',body:{}})).status,403);assert.equal((await call('/api/site-visit',{method:'POST',body:{}})).body.ignored,true);
 assert.equal((await call('/api/loadtest/session',{method:'POST',body:{},privateRequest:true})).status,404);
 await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE players SET essence=1000,potions=2 WHERE id=?').run(s.f.id));
 const ticket=await call('/api/realtime/core511-ticket',{method:'POST',body:{protocol:PROTOCOL}});assert.equal(ticket.status,200,ticket.text);const live=await s.networkConnect(ticket.body);
 const denied=await call('/api/action',{method:'POST',body:{action:'buy_potion'},headers:{'x-csrf-token':''}});assert.equal(denied.status,403);const bought=await call('/api/action',{method:'POST',body:{action:'buy_potion'}});assert.equal(bought.status,200,bought.text);assert.equal(s.f.sql.prepare('SELECT potions FROM players WHERE id=?').get(s.f.id).potions,3);assert(bought.headers['x-col-native-http-ms']);
 assert.equal((await call('/api/action',{method:'POST',body:{action:'attack'}})).status,428);assert.equal((await call('/api/world')).status,428);
 const transfer=await call('/api/realtime/core511-transfer',{method:'POST',body:{protocol:PROTOCOL,channel:4}});assert.equal(transfer.status,200,transfer.text);await s.networkConnect(transfer.body);await live.closed;assert.deepEqual((await call('/api/vds-health')).body.realm.channels,[0,0,0,1]);
 const assets=path.join(BASE,'dist-vds/client/assets'),asset=fs.readdirSync(assets).find(x=>x.endsWith('.css'));assert(asset);const staticFile=await call('/assets/'+asset);assert.equal(staticFile.status,200,staticFile.text.slice(0,100));assert.equal(hash(staticFile.bytes),hash(fs.readFileSync(path.join(assets,asset))));assert.equal(s.faults.length,0,s.faults.map(f=>f.error?.stack).join('\n'));
});

test('signed private maintenance over TCP retains native guards and drains after the caller disconnects',{timeout:45000},async t=>{
 const s=await nativeHttpServerFixture(t),runtime=s.core.realm;
 const body=JSON.stringify({revision:2,phase:'normal',startedAt:0,deadlineMs:0,adminAccountId:'',maintenanceText:''}),key=Buffer.from(fs.readFileSync(s.realm.config.realm.keyFile,'utf8'),'hex'),headers={...signRealmServiceRequest({key,realmId:s.host.expected.realmId,pathname:'/internal/maintenance',body}),'x-col-service-path':'/internal/maintenance'};
 const denied=await s.call('/api/realm/maintenance',{method:'POST',body,headers:{...headers,'x-forwarded-for':'127.0.0.1'},privateRequest:true});assert.equal(denied.status,403);assert.equal(runtime.maintenance.policy.revision,1);
 const forged=await s.call('/api/realm/maintenance',{method:'POST',body,headers:{...headers,'x-col-realm-signature':'0'.repeat(64)},privateRequest:true});assert.equal(forged.status,401);assert.equal(runtime.maintenance.policy.revision,1);
 const accepted=await s.call('/api/realm/maintenance',{method:'POST',body,headers,privateRequest:true});assert.equal(accepted.status,200,accepted.text);assert.equal(accepted.body.revision,2);assert.equal((await s.call('/api/realm/maintenance',{method:'POST',body,headers,privateRequest:true})).status,401);
 const next=JSON.stringify({...JSON.parse(body),revision:3}),nextHeaders={...signRealmServiceRequest({key,realmId:s.host.expected.realmId,pathname:'/internal/maintenance',body:next}),'x-col-service-path':'/internal/maintenance'};
 const original=runtime.maintenanceFanout438;let entered=false,release,closed=false;const gate=new Promise(r=>release=r);runtime.maintenanceFanout438=async frame=>{entered=true;await gate;return original(frame);};
 try{const {req,result}=s.raw('/api/realm/maintenance',{method:'POST',body:next,headers:nextHeaders,privateRequest:true});result.catch(()=>{});await until(()=>entered,5000);req.destroy();await until(()=>s.server.responses.size===0,5000);assert.equal(s.bindings.pending.size,1);const stopping=s.host.close().finally(()=>closed=true);await until(()=>s.server.stopping,2000);assert.equal(closed,false);assert.equal(s.host.closed,false);assert.equal([...s.supervisor.rows.values()].filter(r=>r.state==='running').length,4);release();await stopping;assert(s.server.stopped);assert(s.host.closed);assert.equal(s.bindings.pending.size,0);assert.equal(runtime.maintenance.policy.revision,3);}finally{release();runtime.maintenanceFanout438=original;}
});

test('real native HTTP response stream keeps all owners alive after handler resolution until the final body byte',{timeout:45000},async t=>{
 const s=await nativeHttpServerFixture(t),original=s.core.http.bind(s.core);let controller,firstByte=false,closed=false;
 s.core.http=async request=>new URL(request.url).pathname==='/api/core511-test-stream'?new Response(new ReadableStream({start(value){controller=value;value.enqueue(new TextEncoder().encode('first:'));}}),{headers:{'content-type':'application/octet-stream'}}):original(request);
 const release=()=>{if(controller){const stream=controller;controller=null;stream.enqueue(new TextEncoder().encode('last'));stream.close();}};
 try{const {req,result}=s.raw('/api/core511-test-stream');req.once('response',res=>res.once('data',()=>firstByte=true));await until(()=>firstByte&&s.bindings.pending.size===0,5000);assert.equal(s.server.responses.size,1);const stopping=s.host.close().finally(()=>closed=true);await until(()=>s.server.stopping,2000);assert.equal(closed,false);assert.equal(s.host.closed,false);assert.equal([...s.supervisor.rows.values()].filter(r=>r.state==='running').length,4);release();const r=await result;assert.equal(r.status,200);assert.equal(r.text,'first:last');await stopping;assert(s.server.stopped);assert(s.host.closed);assert.equal(s.server.responses.size,0);}finally{release();s.core.http=original;}
});
