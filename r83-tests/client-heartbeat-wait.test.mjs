import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Core511Transport, CLIENT_PROTOCOL as protocol} from '../r82-work/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js';
import {fixture,gate,turn,until,hash} from './server-heartbeat-fixture.mjs';

// Integration scope: unchanged shipped browser transport/prediction, actual
// FixedLoop, actual HeartbeatLoop and SharedCombatChannel. The explicit writer,
// refresh and schedule gates are controlled ports, not a live VDS measurement.
// The move rule below acknowledges its exact submitted endpoint solely to
// isolate the client scheduling delay; it is not a speed/collision test.
async function simulate({fixed,shared=false,sharedDurable=true,releaseAt=900}){
 const scheduled=gate(),f=await fixture({fixed,shared,sharedDurable,scheduleGate:scheduled});
 let now=0,seq=0,wire=[],outcome=null;
 f.state.patch('players',f.id,{position_revision:1});
 const own=()=>f.c.view.player(f.id);
 class Socket extends EventTarget {
  constructor(){super();this.readyState=1;this.bufferedAmount=0;queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  packet(packet){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(packet)}));}
  send(text){
   const p=JSON.parse(text);wire.push({at:now,...p});
   if(p.type==='auth'){
    queueMicrotask(()=>this.packet({type:'ready',protocol,channel:1,epoch:1,lastAccepted:0,lastApplied:0,capabilities:['queued-movement-v1','ordered-movement-v2']}));return;
   }
   if(p.type==='input'){
    f.c.kernel.enqueue(f.id,{sequence:p.sequence,epoch:1,kind:p.payload.action==='move'?'movement':'combat',payload:p.payload});
    queueMicrotask(()=>this.packet({type:'queued',protocol,epoch:1,sequence:p.sequence,kind:p.payload.action==='move'?'movement':'combat',accepted:true,durable:false}));
   }
  }
  close(){this.readyState=3;}
 }
 const core=new Core511Transport({fetch:()=>{throw Error('unexpected HTTP');},WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({}),now:()=>now});
 await core.open({protocol,channel:1,epoch:1,playerId:f.id,url:'/game/channel/1',ticket:'controlled-ticket'});
 const image=()=>({world:{cycle:1},channel:1,area:'forest',players:[own()],monsters:[],snapshotAtMs:100000+now,serverTime:100,worldPush:{enabled:true,protocol:'world-delta-v1',epoch:'fixture-image',room:'forest',seq:seq++}});
 core.ws.packet({type:'frame',protocol,world:{type:'world_snapshot',data:image()}});
 f.c.kernel.clock=()=>now;f.c.kernel.wall=()=>100000+now;
 f.c.kernel.rules.movement=ctx=>{
  assert.equal(ctx.input.basePositionRevision,own().position_revision,'canonical movement retains the current authority revision');
  f.state.patch('players',f.id,{x:ctx.input.x,y:ctx.input.y,position_revision:own().position_revision+1});
  return {status:200,body:{ok:true,x:own().x,y:own().y,area:'forest',positionRevision:own().position_revision}};
 };
 f.c.kernel.rules.project=ctx=>ctx.results.length?{type:'frame',protocol,results:ctx.results,world:{type:'world_snapshot',data:image()}}:null;
 f.c.kernel.send=(_,packet)=>core.ws.packet(packet);
 const heartbeat=core.enqueue({action:'heartbeat'}).then(value=>(outcome={at:now,value},value));
 await f.tick();await until(()=>f.events.includes('schedule-start'));await turn();
 const samples=[];
 try {
  for(now=50;now<=1200;now+=50){
   if(now===releaseAt){scheduled.resolve();await turn();}
   await f.tick();await turn();
   const pos=core.predictFrame({own:core.world.players[0],seconds:.05,frameAt:now},(p,dt)=>({x:p.x+100*dt,y:p.y}));
   samples.push({atMs:now,x:Math.round(pos.x*1000)/1000,pendingMs:Math.round(core.prediction.pending.reduce((sum,p)=>sum+p.seconds,0)*1000),activeAction:core.active?.payload?.action??null});
  }
  await heartbeat;await f.loop.drain();
  const stopped=samples.filter((s,i)=>i>0&&s.x===samples[i-1].x).length*50;
  return {fixed,shared,sharedDurable,controlledBackgroundHoldMs:releaseAt,firstMoveWireMs:wire.find(p=>p.type==='input'&&p.payload.action==='move')?.at??null,heartbeatResultMs:outcome.at,stationaryPresentationMs:stopped,finalX:samples.at(-1).x,maxPendingMs:Math.max(...samples.map(s=>s.pendingMs)),samples,heartbeatWireCount:wire.filter(p=>p.type==='input'&&p.payload.action==='heartbeat').length,nativeRequests:f.nativeRequests.length,fatals:f.fatals.map(e=>e.code??e.message)};
 } finally {scheduled.resolve();core.dispose();f.c.kernel.stop();}
}

const evidence=[];
for(const [name,options] of [['local durable',{}],['shared durable',{shared:true}],['shared becomes nonterminal',{shared:true,sharedDurable:false}]]){
 test(name+': unrelated background schedule cannot hold movement after real game completion',async()=>{
  const old=await simulate({fixed:false,...options}),fixed=await simulate({fixed:true,...options});
  evidence.push({name,before:old,after:fixed});
  assert.equal(old.heartbeatResultMs,900);
  assert.equal(old.firstMoveWireMs,900);
  // History reaches 600 ms; movement ACK arrives on the tick after the
  // background hold is released, leaving six stationary 50 ms frames.
  assert.equal(old.stationaryPresentationMs,300);
  assert.equal(fixed.heartbeatResultMs,50);
  assert.equal(fixed.firstMoveWireMs,50);
  assert.equal(fixed.stationaryPresentationMs,0);
  assert(fixed.maxPendingMs<=600);
  assert.equal(fixed.heartbeatWireCount,1);
  assert.equal(fixed.nativeRequests,options.sharedDurable===false?0:1);
  assert.deepEqual(fixed.fatals,[]);
 });
}
test.after(()=>{
 const transport=new URL('../r82-work/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js',import.meta.url);
 fs.writeFileSync(new URL('../r83-investigation/client/heartbeat-client-evidence.json',import.meta.url),JSON.stringify({scope:'controlled latency fixture; not live VDS or native SQLite movement benchmark',unchangedTransportSha256:hash(fs.readFileSync(transport)),cases:evidence},null,2)+'\n');
});
