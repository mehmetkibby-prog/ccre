import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
import test from 'node:test';
import assert from 'node:assert/strict';
const tree=process.env.CLIENT_TREE||(reviewWorkspace+'r105_performance_review/working');
const {Core511Transport,CLIENT_PROTOCOL:P}=await import(tree+'/core511-source/scripts/core511/client-transport.mjs');
const ticket={protocol:P,playerId:'p',channel:1,epoch:1,url:'/game/channel/1',ticket:'opaque'};
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function wait(fn){for(let i=0;i<2200&&!fn();i++)await pause(5);assert(fn());}
function fixture(t){
 let at=0,calls=0;
 class Socket extends EventTarget{
  static all=[];
  constructor(){super();this.sent=[];this.readyState=1;this.bufferedAmount=0;Socket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(value){this.sent.push(JSON.parse(value));}
  packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  close(){if(this.readyState===3)return;this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 const c=new Core511Transport({fetch:async()=>{calls++;return Response.json(ticket);},WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({}),now:()=>at});t.after(()=>c.dispose());
 const ready=async(options={})=>{const count=Socket.all.length,work=c.ensure();await wait(()=>Socket.all.length>count);const ws=Socket.all.at(-1);ws.packet({type:'ready',protocol:P,channel:1,epoch:1,lastAccepted:0,lastApplied:0,...options});await work;return ws;};
 const image=(ws,seq=0)=>ws.packet({type:'frame',protocol:P,world:{type:'world_snapshot',data:{world:{cycle:1},channel:1,area:'bazaar',players:[{id:'p',hp:100,x:0,y:0,position_revision:0}],monsters:[],worldPush:{protocol:'world-delta-v1',epoch:'e',room:'r',seq}}}});
 return {c,Socket,ready,image,time:n=>{at=n;},calls:()=>calls};
}
test('world traffic keeps three connections healthy without additional requests',async t=>{
 const actors=await Promise.all([0,1,2].map(async()=>{const s=fixture(t),ws=await s.ready();s.image(ws);return {...s,ws};}));
 for(let at=1000;at<=60000;at+=1000)for(const s of actors){s.time(at);s.image(s.ws,at);s.c.checkConnectionR105();}
 for(const s of actors){assert.equal(s.calls(),1);assert.equal(s.c.ready,true);}
});
test('silent open socket reconnects and committed debit is recovered from receipt, never replayed',async t=>{
 const s=fixture(t),ws=await s.ready();s.image(ws);const result=s.c.command({action:'use_potion'});await wait(()=>ws.sent.some(x=>x.type==='input'));
 for(let at=2000;at<=16000;at+=2000){s.time(at);s.c.checkConnectionR105();}
 assert.equal(s.c.ready,false);assert.equal(ws.readyState,3);s.time(17000);
 const next=await s.ready({lastAccepted:1,lastApplied:1,results:[{type:'action',sequence:1,status:200,body:{potions:2}}]});
 assert.deepEqual((await result).body,{potions:2});assert.equal(next.sent.filter(x=>x.type==='input').length,0);s.image(next,10);assert.equal(s.c.ready,true);
});
test('resuming a sleeping tab grants queued world frames time to drain',async t=>{
 const s=fixture(t),ws=await s.ready();s.image(ws);s.time(90000);s.c.checkConnectionR105();assert.equal(s.c.ready,true);
 s.time(90001);s.image(ws,50);s.time(92000);s.c.checkConnectionR105();assert.equal(s.c.ready,true);assert.equal(s.calls(),1);
});
test('brief READY followed by broken snapshot retains backoff and polling shares one ticket',async t=>{
 const s=fixture(t);let ws=await s.ready();
 for(let i=0;i<4;i++){
  ws.packet({type:'frame',protocol:P,world:{type:'world_snapshot',data:{}}});
  const expected=500*2**i;assert.equal(s.c.reconnectAt-(i?100000*i:0),expected);
  const before=s.calls(),a=s.c.ensure(),b=s.c.ensure();await pause(20);assert.equal(s.calls(),before,'polling must respect backoff');
  s.time(100000*(i+1));await wait(()=>s.Socket.all.length===i+2);ws=s.Socket.all.at(-1);ws.packet({type:'ready',protocol:P,channel:1,epoch:1,lastAccepted:0,lastApplied:0});await Promise.all([a,b]);assert.equal(s.c.retry,i+1);
 }
 s.image(ws);s.time(416000);s.image(ws,1);assert.equal(s.c.retry,0,'healthy world flow releases backoff');
});
for(const body of [false,true])test('hung '+(body?'JSON body':'ticket fetch')+' finishes at a bounded deadline without replaying character POST',async t=>{
 const s=fixture(t);let calls=0,signal;
 s.c.fetch=async(_url,opts)=>{calls++;signal=opts.signal;if(body)return {json:()=>new Promise(()=>{})};return new Promise(()=>{});};
 t.mock.timers.enable({apis:['setTimeout']});
 const pending=s.c.endpoint('character',{channel:1});const checked=assert.rejects(pending,{code:'entry_request_timeout'});t.mock.timers.tick(10001);await checked;assert.equal(calls,1);assert.equal(signal.aborted,true);
});
test('session rejection stops recovery and does not override access checks',async t=>{
 const s=fixture(t);s.c.fetch=async()=>Response.json({code:'game_instance_expired'},{status:401});await assert.rejects(s.c.ensure(),{code:'game_instance_expired'});s.c.scheduleReconnect();assert.equal(s.c.halted,true);assert.equal(s.c.reconnectTimer,undefined);
});
test('429 Retry-After is shared by world refresh and reconnect without new ticket requests',async t=>{
 const s=fixture(t);let calls=0;s.c.fetch=async()=>{calls++;return Response.json({code:'rate_limited',retryAfter:60},{status:429,headers:{'retry-after':'60'}});};
 await assert.rejects(s.c.ensure(),{code:'rate_limited'});
 for(let i=0;i<10;i++)await assert.rejects(s.c.ensure(),{code:'rate_limited'});
 assert.equal(calls,1);s.c.scheduleReconnect();assert.equal(s.c.reconnectAt,60000);s.time(61000);s.c.fetch=async()=>{calls++;return Response.json(ticket);};const ws=await s.ready();s.image(ws);assert.equal(calls,2);assert.equal(s.c.ready,true);
});
