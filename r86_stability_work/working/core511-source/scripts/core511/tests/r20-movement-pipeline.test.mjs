import test from 'node:test';
import assert from 'node:assert/strict';
import {Core511Transport,CLIENT_PROTOCOL as protocol} from '../client-transport.mjs';
import {until} from './helpers.mjs';
const capability='queued-movement-v1';
const wait=ms=>new Promise(r=>setTimeout(r,ms));
function fixture({negotiated=true}={}){
 class Socket extends EventTarget{
  static all=[];constructor(){super();this.sent=[];this.bufferedAmount=0;this.readyState=1;Socket.all.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  send(text){this.sent.push(JSON.parse(text));}packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}close(){if(this.readyState===3)return;this.readyState=3;this.dispatchEvent(new Event('close'));}
 }
 const clock={now:0,epoch:1},errors=[],core=new Core511Transport({fetch:async()=>Response.json({protocol,playerId:'p',channel:1,epoch:clock.epoch,url:'/game/channel/1',ticket:'test'}),WebSocket:Socket,origin:'https://fixture.invalid',headers:()=>({}),now:()=>clock.now,notify:(kind,value)=>{if(kind==='error')errors.push(value);}});
 async function connect({accepted=0,applied=0,results=[]}={}){clearTimeout(core.reconnectTimer);core.reconnectTimer=null;const count=Socket.all.length,p=core.ensure();await until(()=>Socket.all.length>count&&Socket.all.at(-1).sent.some(p=>p.type==='auth'));const ws=Socket.all.at(-1);assert.deepEqual(ws.sent[0].capabilities,[capability,'ordered-movement-v2']);ws.packet({type:'ready',protocol,channel:1,epoch:clock.epoch,lastAccepted:accepted,lastApplied:applied,results,capabilities:negotiated?[capability]:[]});await p;return ws;}
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

for(const order of [[2,1],[1,2]])test('pipeline frame order '+order.join(',')+' waits for actual results and reconciles movement before world',async()=>{
 const f=fixture();try{
  const {ws,primary,settled}=await f.pipeline();const next=f.core.enqueue({action:'collect',targetId:'drop'});f.queued(ws,2,'movement');assert.equal(settled(),false);assert.equal(f.core.lastAccepted,0,'enqueue receipt is not action acknowledgement');assert(f.core.prediction.flight);
  f.clock.now=400;f.advance();f.core.pump();assert.equal(f.inputs(ws).length,2,'neither another command nor another movement may pass two slots');
  const receipts=new Map([[1,f.result(1,{ok:true,hp:0})],[2,f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]]);f.frame(ws,order.map(n=>receipts.get(n)),f.image(18,2));assert.equal((await primary).body.hp,0);assert.equal(f.core.prediction.authority.revision,2);assert(Math.abs(f.core.prediction.predicted.x-36)<1e-6,'new world must not erase unacknowledged input');assert.equal(f.inputs(ws).length,3);assert.equal(f.inputs(ws).at(-1).sequence,3);assert.equal(f.inputs(ws).at(-1).payload.action,'collect');f.frame(ws,[f.result(3)]);await next;
 }finally{f.core.dispose();}
});

test('movement result before combat in a separate frame cannot free another movement or economy slot',async()=>{
 const f=fixture();try{const{ws,primary,settled}=await f.pipeline();const next=f.core.enqueue({action:'claim_rewards'});f.clock.now=400;f.frame(ws,[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]);assert.equal(settled(),false);f.advance(.4);f.core.pump();assert.equal(f.inputs(ws).length,2);assert.equal(f.core.active.payload.intentId,'primary');f.frame(ws,[f.result(1)]);await primary;assert.equal(f.inputs(ws).at(-1).sequence,3);assert.equal(f.inputs(ws).at(-1).payload.action,'claim_rewards');f.frame(ws,[f.result(3)]);await next;}finally{f.core.dispose();}
});

test('unaccepted movement rate rejection preserves the primary and reuses only the rejected sequence',async()=>{
 const f=fixture();try{const{ws,primary,settled}=await f.pipeline();const next=f.core.enqueue({action:'collect',targetId:'drop'});ws.packet({type:'rejected',sequence:2,code:'rate_limited',retryAfter:1});assert.equal(f.core.pendingInputs().length,1);assert.equal(settled(),false);assert.equal(f.core.active.sequence,1);assert.equal(f.core.lastAccepted,0);f.frame(ws,[f.result(1)]);await primary;assert.equal(f.inputs(ws).at(-1).sequence,2);assert.equal(f.inputs(ws).at(-1).payload.action,'collect');f.frame(ws,[f.result(2)]);await next;}finally{f.core.dispose();}
});

test('movement retry targets only its own row; accepted receipt cancels retry without resolving combat',async()=>{
 const f=fixture();try{const{ws,primary,settled}=await f.pipeline();ws.packet({type:'retry',sequence:2,code:'actor_draining'});assert(f.core.movementBehind.retryTimer);f.queued(ws,2,'movement');f.clock.now=400;await wait(230);assert.equal(f.inputs(ws).length,2,'accepted movement is never resent by a late retry timer');assert.equal(settled(),false);f.frame(ws,[f.result(1),f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]);await primary;}finally{f.core.dispose();}
});

for(const accepted of [1,2])test('reconnect accepted='+accepted+' waits accepted rows and cancels only unaccepted movement',async()=>{
 const f=fixture();try{let{ws,primary,settled}=await f.pipeline();ws.packet({type:'retry',sequence:2,code:'actor_draining'});ws.close();ws=await f.connect({accepted,applied:0});assert.equal(f.inputs(ws).length,0);assert.equal(settled(),false);assert.equal(f.core.pendingInputs().length,accepted===2?2:1);assert.equal(f.core.prediction.flight,null,'reconnect clears speculative presentation');await wait(230);assert.equal(f.inputs(ws).length,0,'old retry timer cannot cross connection generation');f.frame(ws,[f.result(1),...accepted===2?[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]:[]]);await primary;assert.equal(f.core.pendingInputs().length,0);}finally{f.core.dispose();}
});

test('reconnect replay of committed primary waits for already accepted trailing movement before next command',async()=>{
 const f=fixture();try{let{ws,primary}=await f.pipeline();const next=f.core.enqueue({action:'collect',targetId:'drop'});ws.close();ws=await f.connect({accepted:2,applied:1,results:[f.result(1)]});await primary;assert.equal(f.inputs(ws).length,0);assert.equal(f.core.active.sequence,2);assert(f.core.active.movement);f.frame(ws,[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]);assert.equal(f.inputs(ws).length,1);assert.equal(f.inputs(ws)[0].sequence,3);f.frame(ws,[f.result(3)]);await next;}finally{f.core.dispose();}
});

test('changed owner rejects both old slots and never resends old gameplay',async()=>{
 const f=fixture();try{let{ws,primary}=await f.pipeline();const rejection=assert.rejects(primary,{code:'command_outcome_unknown'});ws.close();f.clock.epoch=2;ws=await f.connect();await rejection;assert.equal(f.core.pendingInputs().length,0);assert.equal(f.core.prediction.flight,null);assert.equal(f.inputs(ws).length,0);}finally{f.core.dispose();}
});

test('negotiation and eligible command allowlist are required; movement remains <=5Hz and <=350ms',async()=>{
 for(const negotiated of [false,true])for(const payload of [{action:'teleport'},{action:'attack',ability:1},{action:'use_potion'},{action:'attack',ability:0},{action:'claim_rewards'},{action:'collect'}]){
  const f=fixture({negotiated});try{const ws=await f.connect();f.snapshot(ws);const p=f.core.enqueue(payload);f.clock.now=100;f.advance(.6);if(negotiated)f.queued(ws,1);else f.core.pump();const eligible=negotiated&&(payload.action==='attack'&&payload.ability===0||['claim_rewards','collect'].includes(payload.action));assert.equal(f.inputs(ws).length,eligible?2:1);if(eligible){assert(f.core.prediction.flight.seconds<=.350001);f.core.lastMove=100;f.clock.now=299;assert.equal(f.core.movementEligible(f.clock.now),false);f.frame(ws,[f.result(1),f.result(2,{ok:true,...f.core.prediction.flight.target,area:'forest',positionRevision:2})]);}else f.frame(ws,[f.result(1)]);await p;}finally{f.core.dispose();}
 }
});

test('ensureIdle waits for both pipeline results before its drain heartbeat completes',async()=>{
 const f=fixture();try{const{ws,primary}=await f.pipeline();let done=false;const drain=f.core.ensureIdle().then(()=>done=true);await until(()=>f.core.queue.length===1);f.frame(ws,[f.result(1)]);await primary;assert.equal(done,false);assert.equal(f.inputs(ws).length,2);f.frame(ws,[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]);assert.equal(f.inputs(ws).at(-1).payload.action,'heartbeat');f.frame(ws,[f.result(3)]);await drain;assert(done);}finally{f.core.dispose();}
});

test('reconnect applied watermark without the primary receipt reports unknown and never reruns it',async()=>{
 const f=fixture();try{let{ws,primary}=await f.pipeline();const unknown=assert.rejects(primary,{code:'command_outcome_unknown'});ws.close();ws=await f.connect({accepted:2,applied:2,results:[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2})]});await unknown;assert.equal(f.inputs(ws).length,0);assert.equal(f.core.pendingInputs().length,0);assert.equal(f.core.lastAccepted,2);}finally{f.core.dispose();}
});

test('scope relocation clears prediction and a late old movement result cannot resurrect it',async()=>{
 const f=fixture();try{const{ws,primary}=await f.pipeline();const relocated=f.image(500,8);relocated.world.cycle=2;relocated.area='bazaar';relocated.players[0].area='bazaar';f.frame(ws,[],relocated);assert.equal(f.core.prediction.flight,null);assert.equal(f.core.prediction.pending.length,0);assert.equal(f.core.prediction.authority.x,500);f.frame(ws,[f.result(2,{ok:true,x:18,y:0,area:'forest',positionRevision:2}),f.result(1)]);await primary;assert.equal(f.core.prediction.authority.x,500);assert.equal(f.core.prediction.authority.revision,8);assert.equal(f.core.prediction.pending.length,0);assert.equal(f.core.pendingInputs().length,0);}finally{f.core.dispose();}
});
