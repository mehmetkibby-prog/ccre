import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {Core511Transport} from '../client-transport.mjs';
import {nativeHttpServerFixture} from './native-http-server-fixture.mjs';
import {until} from './helpers.mjs';
const {WebSocket}=await import('/tmp/core511-build-deps/node_modules/ws/wrapper.mjs');
const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));

async function setup(t,options){
 const s=await nativeHttpServerFixture(t,options),routes=[],exits=[];
 for(const row of s.supervisor.rows.values())row.child.on('exit',(code,signal)=>exits.push({channel:row.peer.channel,code,signal}));
 const route=s.core.route.bind(s.core);s.core.route=async(peer,method,payload)=>{try{return await route(peer,method,payload);}catch(error){routes.push({method,actor:payload?.actor,epoch:payload?.epoch,code:error.code,stack:error.stack,owner:s.writer.authority.owner(payload?.actor)});throw error;}};
 await s.host.database.atomic(()=>s.f.sql.prepare('UPDATE players SET hp=1,potions=2 WHERE id=?').run(s.f.id));
 class DirectSocket extends WebSocket{constructor(url){const u=new URL(url),ch=Number(u.pathname.split('/').at(-1));super('ws://127.0.0.1:'+s.listeners[ch].port+u.pathname,{origin:s.f.origin});}}
 const fetch=async(url,options={})=>{const u=new URL(url,s.f.origin),r=await s.call(u.pathname+u.search,{method:options.method??'GET',body:options.body,headers:options.headers});return new Response(r.bytes,{status:r.status,headers:r.headers});};
 const client=new Core511Transport({fetch,WebSocket:DirectSocket,origin:s.f.origin,headers:()=>Object.fromEntries(s.f.request().headers)});t.after(()=>client.dispose());await client.image();
 const potion=await client.command({action:'use_potion'});assert.equal(potion.status,200);await until(()=>client.world.players.find(p=>p.id===s.f.id)?.potions===1);
 return {...s,client,routes,exits,fetch,transfer:channel=>client.request('/api/action',{method:'POST',body:JSON.stringify({action:'select_channel',channel})},fetch)};
}
const details=s=>JSON.stringify({routes:s.routes,exits:s.exits,faults:s.faults},(_key,v)=>v instanceof Error?{code:v.code,message:v.message,stack:v.stack}:v);

test('native transfer holds late notification wakeups across durable ownership change',{timeout:40000},async t=>{
 const s=await setup(t),begin=s.writer.beginTransfer.bind(s.writer),old=[...s.supervisor.rows.values()];let delayed=false;
 s.writer.beginTransfer=async(...args)=>{const value=await begin(...args);delayed=true;s.core.notify([s.f.id]);await pause(220);return value;};
 const started=performance.now(),response=await s.transfer(4),body=await response.text();
 assert(delayed);assert.equal(response.status,200,body+' '+details(s));assert(performance.now()-started<2000);
 assert.deepEqual([...s.supervisor.rows.values()],old);assert.equal(s.exits.length,0);assert.equal(s.faults.length,0,details(s));assert.equal(s.routes.length,0,details(s));
 assert.equal(s.writer.authority.owner(s.f.id).channel,4);assert.equal(s.client.world.players.find(p=>p.id===s.f.id).potions,1);
});

for(const method of ['notification_pending','notification_ack'])test('native freeze drains in-flight '+method+' before changing epoch',{timeout:40000},async t=>{
 const s=await setup(t),route=s.core.route.bind(s.core),begin=s.writer.beginTransfer.bind(s.writer);let entered=false,advanced=false,release,blocked=true;
 const gate=new Promise(resolve=>release=resolve);t.after(release);
 s.core.route=async(peer,kind,payload)=>{if(blocked&&kind===method&&payload.actor===s.f.id){entered=true;await gate;}return route(peer,kind,payload);};
 s.writer.beginTransfer=async(...args)=>{advanced=true;return begin(...args);};
 // A durable native chat notification gives the browser a real event ACK.
 await s.host.database.atomic(sql=>{const p=sql.prepare('SELECT * FROM players WHERE id=?').get(s.f.id),cycle=sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;return s.writer.notifications.append(sql,{realm:s.core.realmId,key:'transfer-traffic-'+method},{events:[[cycle,p.channel,p.area,{type:'player_state',targetId:p.id,hp:p.hp,hpRevision:p.hp_revision}]]});});
 s.core.notify([s.f.id]);await until(()=>entered,5000);
 let settled=false;const transfer=s.transfer(4).then(r=>{settled=true;return r;});
 try{await pause(120);assert.equal(advanced,false,'freeze acknowledged while old-epoch '+method+' is in flight');assert.equal(settled,false);}
 finally{blocked=false;release();}
 const response=await transfer;assert.equal(response.status,200,(await response.text())+' '+details(s));assert.equal(s.routes.length,0,details(s));assert.equal(s.faults.length,0,details(s));assert.equal(s.exits.length,0);assert.equal(s.client.world.players.find(p=>p.id===s.f.id).potions,1);
});

test('real GC pauses during source freeze, durable handoff and target import complete without channel restart',{timeout:50000},async t=>{
 const s=await setup(t,{channelEntry:path.join(import.meta.dirname,'transfer-pause-channel-fixture.mjs')}),original=[...s.supervisor.rows.values()],evidence=[];
 for(const method of ['freeze','detach','admit_held']){
  const before=s.writer.authority.owner(s.f.id),target=before.channel%4+1,row=s.supervisor.rows.get(method==='admit_held'?target:before.channel),request=randomUUID(),messages=[];
  const receive=m=>{if(m?.request===request)messages.push(m);};row.child.on('message',receive);
  row.child.send({type:'test-arm-transfer-gc',request,method});await until(()=>messages.some(m=>m.type==='test-gc-armed'));
  const started=performance.now(),response=await s.transfer(target),ms=performance.now()-started,trace=messages.find(m=>m.type==='test-gc-complete');row.child.off('message',receive);
  assert.equal(response.status,200,(await response.text())+' '+details(s));assert(trace&&trace.wallMs>=250&&trace.gc.length>0&&trace.maxWaitMs>150,JSON.stringify(trace));assert(ms<2000,'bounded transient transfer '+ms);
  assert.equal(s.writer.authority.owner(s.f.id).epoch,before.epoch+1);assert.equal(s.client.world.players.find(p=>p.id===s.f.id).potions,1);evidence.push({...trace,transferMs:ms});
 }
 assert.deepEqual([...s.supervisor.rows.values()],original);assert.equal(s.exits.length,0);assert.equal(s.routes.length,0,details(s));assert.equal(s.faults.length,0,details(s));t.diagnostic(JSON.stringify({gcTransfers:evidence}));
});

test('lost freeze, admission and resume acknowledgements replay same controls without reapplying transfer',{timeout:50000},async t=>{
 const s=await setup(t),original=[...s.supervisor.rows.values()],evidence=[];
 for(const method of ['freeze','admit_held','resume']){
  const before=s.writer.authority.owner(s.f.id),target=before.channel%4+1,control=s.core.processes.get(method==='freeze'?before.channel:target).control,receive=control.receive.bind(control);let dropped=null;
  control.receive=frame=>{const task=control.pending.get(frame.id);if(!dropped&&task?.frame.method===method){dropped={id:frame.id,method};setTimeout(()=>control.attach(control.send),120);return;}return receive(frame);};
  const response=await s.transfer(target);control.receive=receive;assert(dropped);assert.equal(response.status,200,(await response.text())+' '+details(s));assert.equal(s.writer.authority.owner(s.f.id).epoch,before.epoch+1);assert.equal(s.client.world.players.find(p=>p.id===s.f.id).potions,1);evidence.push(dropped);
 }
 assert.deepEqual([...s.supervisor.rows.values()],original);assert.equal(s.exits.length,0);assert.equal(s.routes.length,0,details(s));assert.equal(s.faults.length,0,details(s));t.diagnostic(JSON.stringify({lostAckTransfers:evidence}));
});
