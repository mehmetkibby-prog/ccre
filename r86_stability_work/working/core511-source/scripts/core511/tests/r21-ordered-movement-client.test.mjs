import test from 'node:test';
import assert from 'node:assert/strict';
import {Core511Transport,CLIENT_PROTOCOL as protocol} from '../client-transport.mjs';
import {until} from './helpers.mjs';
const capability='queued-movement-v1',ordered='ordered-movement-v2';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fixture({negotiated=true,immediate=true}={}){
 class Socket extends EventTarget{
  static all=[];constructor(){super();this.sent=[];this.bufferedAmount=0;this.readyState=1;Socket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(text){this.sent.push(JSON.parse(text));}packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}close(){if(this.readyState===3)return;this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 const clock={now:0,epoch:1},errors=[],core=new Core511Transport({fetch:async()=>Response.json({protocol,playerId:'p',channel:1,epoch:clock.epoch,url:'/game/channel/1',ticket:'test'}),WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({}),now:()=>clock.now,notify:(kind,value)=>{if(kind==='error')errors.push(value);}});
 async function connect({accepted=0,applied=0,results=[]}={}){clearTimeout(core.reconnectTimer);core.reconnectTimer=null;const count=Socket.all.length,p=core.ensure();await until(()=>Socket.all.length>count&&Socket.all.at(-1).sent.some(p=>p.type==='auth'));const ws=Socket.all.at(-1);assert.deepEqual(ws.sent[0].capabilities,[capability,ordered]);ws.packet({type:'ready',protocol,channel:1,epoch:clock.epoch,lastAccepted:accepted,lastApplied:applied,results,capabilities:negotiated?[capability,...immediate?[ordered]:[]]:[]});await p;return ws;}
 const image=(x=0,revision=1)=>({world:{cycle:1},channel:1,area:'forest',players:[{id:'p',area:'forest',x,y:0,hp:100,positionRevision:revision}],monsters:[],worldPush:{enabled:true,protocol:'world-delta-v1',epoch:'projection',room:'room',seq:revision-1}});
 const snapshot=(ws,x=0,revision=1)=>ws.packet({type:'frame',protocol,world:{type:'world_snapshot',data:image(x,revision)}});
 const advance=(seconds=.1)=>{for(let remaining=seconds;remaining>1e-9;remaining-=.05)core.prediction.advance(Math.min(.05,remaining),(p,dt)=>({x:p.x+180*dt,y:p.y}),clock.now);assert(core.prediction.pending.reduce((n,r)=>n+r.seconds,0)<=.600001);};
 const queued=(ws,sequence,kind='combat')=>ws.packet({type:'queued',protocol,epoch:clock.epoch,sequence,kind,durable:false,accepted:true});
 const result=(sequence,body={ok:true},status=200)=>({type:'action',sequence,status,body});
 const frame=(ws,results,world)=>ws.packet({type:'frame',protocol,results,...world?{world:{type:'world_snapshot',data:world}}:{}});
 const inputs=ws=>ws.sent.filter(p=>p.type==='input');
 async function pipeline(){const ws=await connect();snapshot(ws);const primary=core.enqueue({action:'attack',ability:0,intentId:'primary'});let settled=false;primary.then(()=>settled=true,()=>{});clock.now=200;advance();assert.equal(inputs(ws).length,1);queued(ws,1);assert.equal(settled,false);assert.equal(inputs(ws).length,2);assert.equal(core.pendingInputs().length,2);return{ws,primary,settled:()=>settled};}
 return{core,clock,errors,connect,image,snapshot,advance,queued,result,frame,inputs,pipeline};
}


test('immediate ordered movement waits for real command result, not enqueue receipt',async()=>{
 const f=fixture();try{const ws=await f.connect();f.snapshot(ws);let settled=false;const p=f.core.enqueue({action:'attack',ability:0}).then(v=>(settled=true,v));f.clock.now=200;f.advance(.2);f.core.pump();
 assert.equal(f.inputs(ws).length,2);assert.equal(f.inputs(ws)[1].dependsOn,1);assert.equal(settled,false);assert.equal(f.core.lastAccepted,0);assert.equal(f.core.pendingInputs().length,2);
 f.queued(ws,1);f.queued(ws,2,'movement');assert.equal(settled,false);assert.equal(f.inputs(ws).length,2);
 f.frame(ws,[f.result(2,{ok:true,x:36,y:0,area:'forest',positionRevision:2}),f.result(1)]);await p;assert.equal(f.core.lastAccepted,2);assert.equal(f.core.prediction.pending.length,0);assert.equal(f.core.prediction.authority.x,36);
 }finally{f.core.dispose();}
});

test('old negotiated server retains receipt wait and receives no dependency field',async()=>{
 const f=fixture({immediate:false});try{const ws=await f.connect();f.snapshot(ws);const p=f.core.enqueue({action:'attack'});f.clock.now=200;f.advance(.2);f.core.pump();assert.equal(f.inputs(ws).length,1);f.queued(ws,1);assert.equal(f.inputs(ws).length,2);assert.equal(f.inputs(ws)[1].dependsOn,undefined);f.frame(ws,[f.result(1),f.result(2,{ok:true,x:36,y:0,positionRevision:2})]);await p;}finally{f.core.dispose();}
});

test('rejected parent plus explicitly unqueued movement preserves sequence, speculative path and next command',async()=>{
 const f=fixture();try{const ws=await f.connect();f.snapshot(ws);const p=f.core.enqueue({action:'attack'});f.clock.now=200;f.advance(.2);f.core.pump();const next=f.core.enqueue({action:'collect'});ws.packet({type:'rejected',sequence:1,code:'rate_limited',retryAfter:1});assert.equal((await p).status,429);assert.equal(f.core.lastAccepted,0);assert.equal(f.inputs(ws).length,2);assert(f.core.prediction.flight);
 ws.packet({type:'not_queued',protocol,epoch:1,sequence:2,dependsOn:1,code:'dependency_not_queued',durable:false});assert.equal(f.core.prediction.flight,null);assert(Math.abs(f.core.prediction.pending.reduce((n,r)=>n+r.seconds,0)-.2)<1e-9);assert.equal(f.inputs(ws).at(-1).sequence,1);assert.equal(f.inputs(ws).at(-1).payload.action,'collect');f.frame(ws,[f.result(1)]);await next;assert.equal(f.core.lastAccepted,1);
 }finally{f.core.dispose();}
});

test('explicit movement retry removes socket dependency and never resends primary',async()=>{
 const f=fixture();try{const ws=await f.connect();f.snapshot(ws);const p=f.core.enqueue({action:'attack'});f.clock.now=200;f.advance(.2);f.core.pump();ws.packet({type:'retry',sequence:2,code:'actor_draining'});f.clock.now=400;await wait(230);assert.equal(f.inputs(ws).length,3);assert.equal(f.inputs(ws)[2].sequence,2);assert.equal(f.inputs(ws)[2].dependsOn,undefined);assert.equal(f.inputs(ws).filter(p=>p.sequence===1).length,1);f.queued(ws,2,'movement');f.frame(ws,[f.result(1),f.result(2,{ok:true,x:36,y:0,positionRevision:2})]);await p;}finally{f.core.dispose();}
});

for(const accepted of [0,1,2])test('reconnect before admission receipts with '+accepted+' accepted slots never replays accepted movement',async()=>{
 const f=fixture();try{let ws=await f.connect();f.snapshot(ws);const p=f.core.enqueue({action:'attack'});f.clock.now=200;f.advance(.2);f.core.pump();ws.close();ws=await f.connect({accepted,applied:0});assert.equal(f.inputs(ws).length,accepted===0?1:0);assert.equal(f.core.prediction.flight,null);assert.equal(f.core.pendingInputs().filter(r=>r.movement).length,accepted===2?1:0);f.frame(ws,[f.result(1),...accepted===2?[f.result(2,{ok:true,x:36,y:0,positionRevision:2})]:[]]);await p;assert.equal(f.core.pendingInputs().length,0);}finally{f.core.dispose();}
});

async function moveFirst(f){const ws=await f.connect();f.snapshot(ws);f.clock.now=200;f.advance(.2);f.core.pump();f.core.sendMovement(f.core.prediction.batch().payload,f.clock.now,f.core.prediction.batch());assert.equal(f.inputs(ws).length,1);const p=f.core.enqueue({action:'claim_rewards'});assert.equal(f.inputs(ws).length,2);assert.equal(f.inputs(ws)[1].dependsOn,1);return{ws,p};}

test('move -> reward -> move advances within two slots without settling reward early or starving it',async()=>{
 const f=fixture();try{const{ws,p}=await moveFirst(f);let done=false;p.then(()=>done=true);f.clock.now=400;f.advance(.2);f.frame(ws,[f.result(1,{ok:true,x:36,y:0,positionRevision:2})]);assert.equal(done,false);assert.equal(f.inputs(ws).length,2);f.queued(ws,2,'combat');assert.equal(f.inputs(ws).length,3);assert.equal(f.inputs(ws)[2].payload.action,'move');assert.equal(f.inputs(ws)[2].dependsOn,undefined);assert.equal(f.core.pendingInputs().length,2);f.advance(.4);f.core.pump();assert.equal(f.inputs(ws).length,3);f.frame(ws,[f.result(3,{ok:true,x:72,y:0,positionRevision:3}),f.result(2)]);await p;assert.equal(f.core.pendingInputs().length,0);}finally{f.core.dispose();}
});

test('unqueued reward after rejected movement is known unsubmitted and sent once at original sequence',async()=>{
 const f=fixture();try{const{ws,p}=await moveFirst(f);ws.packet({type:'rejected',sequence:1,code:'rate_limited',retryAfter:1});assert.equal(f.core.active.payload.action,'claim_rewards');ws.packet({type:'not_queued',protocol,epoch:1,sequence:2,dependsOn:1,code:'dependency_not_queued',durable:false});assert.equal(f.inputs(ws).length,3);assert.equal(f.inputs(ws)[2].sequence,1);assert.equal(f.inputs(ws)[2].dependsOn,undefined);assert.equal(f.core.lastAccepted,0);f.frame(ws,[f.result(1)]);await p;assert.equal(f.core.lastAccepted,1);}finally{f.core.dispose();}
});

for(const accepted of [0,1,2])test('move-first reconnect with '+accepted+' accepted slots preserves eligible command exactly once',async()=>{
 const f=fixture();try{let{ws,p}=await moveFirst(f);ws.close();ws=await f.connect({accepted,applied:0});if(accepted<2){assert.equal(f.inputs(ws).length,1);assert.equal(f.inputs(ws)[0].sequence,accepted+1);assert.equal(f.inputs(ws)[0].dependsOn,undefined);}else assert.equal(f.inputs(ws).length,0);f.frame(ws,[...accepted?[f.result(1,{ok:true,x:36,y:0,positionRevision:2})]:[],f.result(accepted===0?1:2)]);await p;assert.equal(f.core.pendingInputs().length,0);}finally{f.core.dispose();}
});

for(const first of ['combat','movement'])test(first+' retried parent regains one secondary slot only after its new admission receipt',async()=>{
 const f=fixture();try{let ws,p;if(first==='movement')({ws,p}=await moveFirst(f));else{ws=await f.connect();f.snapshot(ws);p=f.core.enqueue({action:'attack'});f.clock.now=200;f.advance(.2);f.core.pump();}
 assert.equal(f.inputs(ws).length,2);ws.packet({type:'retry',sequence:1,code:'actor_draining'});ws.packet({type:'not_queued',protocol,epoch:1,sequence:2,dependsOn:1,code:'dependency_not_queued',durable:false});f.clock.now=400;f.core.pump();assert.equal(f.inputs(ws).length,2,'no dependent re-send before parent admission');
 await wait(first==='movement'?220:70);assert.equal(f.inputs(ws).length,3);assert.equal(f.inputs(ws)[2].sequence,1);f.queued(ws,1,first);assert.equal(f.inputs(ws).length,4);assert.equal(f.inputs(ws)[3].sequence,2);assert.equal(f.inputs(ws)[3].dependsOn,undefined);assert.equal(f.core.pendingInputs().length,2);f.core.pump();assert.equal(f.inputs(ws).length,4,'never a third pending slot');
 f.queued(ws,2,first==='movement'?'combat':'movement');f.frame(ws,[f.result(first==='movement'?1:2,{ok:true,x:36,y:0,positionRevision:2}),f.result(first==='movement'?2:1)]);await p;assert.equal(f.core.pendingInputs().length,0);
 }finally{f.core.dispose();}
});
