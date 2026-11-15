// Existing transport contracts exercised against the distributed R118 artifact, plus new action routing.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const generated=new URL('../../r109_latency_completion/working/core511-source/scripts/core511/generated/',import.meta.url);
const proof=JSON.parse(fs.readFileSync(new URL('native-client-proof.json',generated)));
const {Core511Transport,PositionInterpolation,CLIENT_PROTOCOL}=await import(new URL('client/'+proof.bridge,generated));
import {PROTOCOL} from '../../r109_latency_completion/working/core511-source/scripts/core511/contract.mjs';
import {until} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/helpers.mjs';
const image=(x=0,seq=0)=>({world:{cycle:1},channel:2,area:'bazaar',players:[{id:'player-511',x,y:0,hp:100,position_revision:1}],monsters:[],worldPush:{enabled:true,protocol:'world-delta-v1',epoch:'projection-1',room:'room-1',seq}});
function fixture(){
 class Socket extends EventTarget{static all=[];constructor(url){super();this.url=url;this.sent=[];this.bufferedAmount=0;this.readyState=1;Socket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}send(text){this.sent.push(JSON.parse(text));}packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}close(){if(this.readyState===3)return;this.readyState=3;this.dispatchEvent(new Event('close'));}}
 let at=0;const events=[],core=new Core511Transport({fetch:async()=>Response.json({ok:true,protocol:PROTOCOL,playerId:'player-511',channel:2,epoch:1,url:'/game/channel/2',ticket:'opaque'}),WebSocket:Socket,origin:'https://game.invalid',headers:()=>({}),now:()=>at,notify:(...args)=>events.push(args)});
 const ready=async(epoch=1,lastAccepted=0,lastApplied=0,results=[],capabilities=[])=>{const before=Socket.all.length,work=core.ensure();await until(()=>Socket.all.length>before&&Socket.all.at(-1)?.sent.some(p=>p.type==='auth'));const socket=Socket.all.at(-1);socket.packet({type:'ready',protocol:PROTOCOL,channel:2,epoch,lastAccepted,lastApplied,results,capabilities});await work;return socket;};
 return {core,Socket,ready,events,time:value=>at=value};
}
test('R113 combat window is bounded to two and social/world reads never wait for a combat ACK',async()=>{
 const s=fixture();try{
  const ws=await s.ready(1,0,0,[],['queued-movement-v1','ordered-movement-v2','ordered-actions-r113']);
  ws.packet({type:'frame',protocol:PROTOCOL,world:{type:'world_snapshot',data:image()}});
  let finished=0;const pending=[1,2,3].map(ability=>s.core.command({action:'attack',ability}).then(r=>(finished++,r)));
  await until(()=>ws.sent.filter(p=>p.type==='input').length===2);assert.equal(finished,0);
  assert.deepEqual(ws.sent.filter(p=>p.type==='input').map(p=>p.sequence),[1,2]);assert.equal(ws.sent.at(-1).dependsOn,1);
  assert.equal((await s.core.request('/api/world',{},()=>assert.fail())).status,200);
  assert.equal((await s.core.request('/api/chat',{method:'POST',body:'{}'},async()=>Response.json({sent:true}))).status,200);
  ws.packet({type:'queued',protocol:PROTOCOL,epoch:1,sequence:1,kind:'combat',accepted:true,durable:false});
  ws.packet({type:'queued',protocol:PROTOCOL,epoch:1,sequence:2,kind:'combat',accepted:true,durable:false});assert.equal(finished,0);
  ws.packet({type:'frame',protocol:PROTOCOL,results:[{sequence:1,status:200,body:{ok:true}}]});
  await until(()=>ws.sent.filter(p=>p.type==='input').length===3);assert.equal(s.core.pendingInputs().length,2);
  ws.packet({type:'frame',protocol:PROTOCOL,results:[{sequence:2,status:200,body:{ok:true}},{sequence:3,status:200,body:{ok:true}}]});
  await Promise.all(pending);assert.equal(finished,3);
 }finally{s.core.dispose();}
});
test('client applies native deltas, bounds interpolation and waits for durable mailbox ACK before sending another batch',async()=>{
 assert.equal(CLIENT_PROTOCOL,PROTOCOL);const s=fixture();try{const ws=await s.ready();ws.packet({type:'frame',protocol:PROTOCOL,world:{type:'world_snapshot',data:{...image(),players:[...image().players,{...image().players[0],id:"remote-511"}]}}});s.time(100);ws.packet({type:'frame',protocol:PROTOCOL,world:{type:'world_delta',protocol:'world-delta-v1',epoch:'projection-1',room:'room-1',seq:1,serverTime:1,snapshotAtMs:100,entities:{players:{upsert:[{id:'remote-511',x:10}],remove:[]}},fields:{}}});
 const between=s.core.position('players',s.core.world.players[1],125).x;assert(between>0&&between<10);assert.equal(s.core.position('players',s.core.world.players[1],1000).x,10);assert.equal(s.core.world.players[1].x,10);
 const a='a'.repeat(64),b='b'.repeat(64);for(const id of [a,a,b])ws.packet({type:'event',id,payload:{event:{type:'trade_changed',id}}});assert.equal(s.events.filter(e=>e[0]==='event').length,2);assert.equal(ws.sent.filter(p=>p.type==='event_ack').length,1);ws.packet({type:'event_acked',ids:[a]});assert.equal(ws.sent.filter(p=>p.type==='event_ack').length,2);assert.deepEqual(ws.sent.at(-1).ids,[b]);ws.packet({type:'event_acked',ids:[a]});assert.equal(ws.sent.filter(p=>p.type==='event_ack').length,2);
 ws.packet({type:'gm_visibility',playerId:'other',invisible:true,visibilityRevision:2});assert(s.events.some(([type,e])=>type==='event'&&e.type==='gm_visibility'));
 }finally{s.core.dispose();}
 const p=new PositionInterpolation();p.accept(image(0),0);p.accept(image(900),100);assert.equal(p.position('players',{id:'player-511'},100).x,900);p.accept({...image(5),area:'forest'},200);assert.equal(p.position('players',{id:'player-511'},200).x,5);
});
test('single input queue keeps sequence after rejection and never acknowledges an economy command before its server result',async()=>{
 const s=fixture();try{const ws=await s.ready();let settled=false;const a=s.core.command({action:'use_potion'}).then(v=>(settled=true,v)),b=s.core.command({action:'donate',amount:1});await until(()=>ws.sent.some(p=>p.type==='input'));assert.equal(settled,false);assert.equal(ws.sent.filter(p=>p.type==='input').length,1);
 ws.packet({type:'rejected',sequence:1,code:'rate_limited',retryAfter:1});assert.equal((await a).status,429);await until(()=>ws.sent.filter(p=>p.type==='input').length===2);assert.equal(ws.sent.at(-1).sequence,1);ws.packet({type:'frame',protocol:PROTOCOL,results:[{type:'action',sequence:1,status:200,body:{ok:true,essence:9}}]});assert.equal((await b).body.essence,9);assert.equal(s.core.lastAccepted,1);
 }finally{s.core.dispose();}
});
test('reconnect consumes the saved result without replaying a committed debit; changed owner leaves an unknown result',async()=>{
 const s=fixture();try{let ws=await s.ready();const pending=s.core.command({action:'use_potion'});await until(()=>ws.sent.some(p=>p.type==='input'));ws.close();clearTimeout(s.core.reconnectTimer);s.core.reconnectTimer=null;ws=await s.ready(1,1,1,[{sequence:1,type:'action',status:200,body:{ok:true,potions:1}}]);assert.equal((await pending).body.potions,1);assert.equal(ws.sent.filter(p=>p.type==='input').length,0);
 const next=s.core.command({action:'donate',amount:1}),rejected=assert.rejects(next,{code:'command_outcome_unknown'});await until(()=>ws.sent.some(p=>p.type==='input'));ws.close();clearTimeout(s.core.reconnectTimer);s.core.reconnectTimer=null;s.core.fetch=async()=>Response.json({ok:true,protocol:PROTOCOL,playerId:'player-511',channel:2,epoch:2,url:'/game/channel/2',ticket:'opaque'});ws=await s.ready(2);await rejected;assert.equal(ws.sent.filter(p=>p.type==='input').length,0);
 }finally{s.core.dispose();}
});

test('closing socket before close event retains unsent input and mailbox ACK until safe reconnect',async()=>{
 const s=fixture();try{
  let ws=await s.ready();ws.readyState=2;const pending=s.core.command({action:'use_potion'});
  await until(()=>s.core.active!==null);assert.equal(ws.sent.filter(p=>p.type==='input').length,0);
  const id='c'.repeat(64);ws.packet({type:'event',id,payload:{event:{type:'trade_changed'}}});
  assert.equal(ws.sent.filter(p=>p.type==='event_ack').length,0);assert(s.core.ackIds.has(id));
  ws.close();clearTimeout(s.core.reconnectTimer);s.core.reconnectTimer=null;ws=await s.ready();
  assert.equal(ws.sent.filter(p=>p.type==='input').length,1);assert.equal(ws.sent.at(-1).sequence,1);
  ws.packet({type:'frame',protocol:PROTOCOL,results:[{type:'action',sequence:1,status:200,body:{ok:true,potions:1}}]});
  assert.equal((await pending).body.potions,1);ws.packet({type:'event',id,payload:{event:{type:'trade_changed'}}});
  assert.equal(ws.sent.filter(p=>p.type==='event_ack').length,1);
 }finally{s.core.dispose();}
});

for(const action of ['royal_transform_r118','royal_salvage_r118','travel_champions'])test('distributed R118 bridge routes '+action+' through acknowledged owner transport',async()=>{
 const s=fixture();try{
  const ws=await s.ready(1,0,0,[],['ordered-actions-r113']);
  const pending=s.core.request('/api/action',{method:'POST',body:JSON.stringify({action,requestId:'test-request-r118'})},()=>assert.fail('legacy HTTP fallback'));
  await until(()=>ws.sent.some(p=>p.type==='input'));
  const sent=ws.sent.find(p=>p.type==='input');assert.equal(sent.payload.action,action);
  ws.packet({type:'frame',protocol:PROTOCOL,results:[{sequence:sent.sequence,status:200,body:{ok:true}}]});
  assert.equal((await pending).status,200);
 }finally{s.core.dispose();}
});
