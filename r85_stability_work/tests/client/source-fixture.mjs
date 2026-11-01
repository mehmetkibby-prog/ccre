import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {setImmediate as realImmediate} from 'node:timers';

export const here=path.dirname(fileURLToPath(import.meta.url));
export const workspace=path.resolve(here,'../..');
export const gamePath=path.join(workspace,'working/core511-source/scripts/core511/generated/client/game-client-core511-r84-1295951c6cf23767.js');
export const transportPath=path.join(workspace,'working/core511-source/scripts/core511/generated/client/core511-transport-r79-715e78ecd9021ea8.js');
export const sha=value=>crypto.createHash('sha256').update(value).digest('hex');
export const gameSource=fs.readFileSync(gamePath,'utf8');
export const transportSource=fs.readFileSync(transportPath,'utf8');
assert.equal(sha(gameSource),'1295951c6cf237672c1371eec30727238d8a2722773b848577d9cfbaeba72c8b');
assert.equal(sha(transportSource),'715e78ecd9021ea8dbfd5f2b534b8dc69f02f4fe78d8ec2978a92a4b707874dc');
export const requestExcerpt=source=>source.slice(source.indexOf('async function Z_(e3, t2) {'),source.indexOf('function ev({ initialPlayer:'));
export const pacingExcerpt=source=>source.slice(source.indexOf('function createCombatPacing481('),source.indexOf('function createClientUi481('));
export const flush=async()=>{for(let i=0;i<30;i++)await Promise.resolve();await new Promise(realImmediate);for(let i=0;i<30;i++)await Promise.resolve();};
export class Clock {
 now=0;serial=0;timers=new Map();
 set=(fn,ms=0,...args)=>{const id=++this.serial;this.timers.set(id,{at:this.now+Math.max(0,Number(ms)||0),fn,args});return id;};
 clear=id=>this.timers.delete(id);
 async to(target){
  assert(target>=this.now);
  for(let n=0;n<20000;n++){
   await flush();
   const due=[...this.timers].filter(([,timer])=>timer.at<=target).sort((a,b)=>a[1].at-b[1].at||a[0]-b[0])[0];
   if(!due){this.now=target;await flush();return;}
   const [id,timer]=due;this.now=timer.at;this.timers.delete(id);timer.fn(...timer.args);
  }
  throw Error('virtual timer runaway');
 }
}

// Executes the complete exact active transport bundle (only its ESM export
// declaration is replaced by test exposure), plus exact current Q/Z_ and combat
// pacing bodies. Timers and HTTP/WS peers are controlled local ports. No live
// VDS, React canvas rendering or native durable gameplay is simulated here.
export function fixture({source=gameSource,transport=transportSource,instance='r85-fixture',onInput,onAuth,beforeTicket,onFetch}={}){
 const clock=new Clock(),wire=[],events=[],calls=[],sockets=[];
 const protocol='coreoflife-kernel-v1';
 const win=Object.assign(new EventTarget(),{setTimeout:clock.set,clearTimeout:clock.clear});
 const doc=Object.assign(new EventTarget(),{cookie:'',hidden:false});
 const image=(x=100,revision=1)=>({world:{cycle:1},channel:1,area:'forest',players:[{id:'fixture-player',area:'forest',channel:1,x,y:100,hp:100,hp_revision:1,respawn_at_ms:0,position_revision:revision}],monsters:[],worldPush:{enabled:true,protocol:'world-delta-v1',epoch:'fixture',room:'forest',seq:revision}});
 class Socket extends EventTarget {
  constructor(url){super();this.url=url;this.readyState=1;this.bufferedAmount=0;sockets.push(this);queueMicrotask(()=>this.dispatchEvent(new Event('open')));}
  packet(value){this.dispatchEvent(new MessageEvent('message',{data:JSON.stringify(value)}));}
  send(text){const packet=JSON.parse(text);wire.push({at:clock.now,...packet});if(packet.type==='auth')queueMicrotask(()=>{
   const override=onAuth?.(this,clock)??{};
   this.packet({type:'ready',protocol,channel:1,epoch:1,lastAccepted:0,lastApplied:0,capabilities:['queued-movement-v1','ordered-movement-v2','validated-motion-v1','bot-challenge-v1'],motionStreamId:'fixture-motion-stream',...override.ready});
   this.packet({type:'frame',protocol,world:{type:'world_snapshot',data:override.world??image()}});
  });else if(packet.type==='input'){onInput?.(packet,this,clock);}}
  close(code,reason){if(this.readyState===3)return;this.readyState=3;events.push({at:clock.now,code,reason});this.dispatchEvent(new Event('close'));}
 }
 const fetch=async(url,init={})=>{
  calls.push({url,at:clock.now,body:init.body?JSON.parse(init.body):null});
  const controlled=await onFetch?.(url,init,clock);
  if(controlled!==undefined)return controlled;
  if(url.endsWith('/api/realtime/core511-ticket')){await beforeTicket?.(clock);return Response.json({protocol,playerId:'fixture-player',channel:1,epoch:1,url:'/game/channel/1',ticket:'fixture-ticket'});}
  if(String(url).includes('-options'))return Response.json({frameMotionClock:true});
  throw Error('Unexpected controlled HTTP endpoint: '+url);
 };
 const context=vm.createContext({Headers,Request,Response,TextEncoder,URL,AbortController,Event,CustomEvent,DOMException,EventTarget,MessageEvent,structuredClone,window:win,document:doc,location:{origin:'https://fixture.invalid'},WebSocket:Socket,fetch,setTimeout:clock.set,clearTimeout:clock.clear,performance:{now:()=>clock.now},Date:class extends Date {static now(){return clock.now;}},k_:8000,j_:8000,A_:1800,Zt:'x-game-instance',Kt:()=>instance,Ut:'coreoflife:game-session-ended',Yt:'coreoflife:instance-ended',publishAzrailResultR68:()=>{}});
 const suffix=/export \{\s*CLIENT_PROTOCOL,\s*Core511Transport,\s*BufferedInterpolation as PositionInterpolation,\s*browserCore,\s*browserRequest\s*\};\s*$/;
 assert(suffix.test(transport),'exact expected transport exports');
 vm.runInContext(transport.replace(suffix,'globalThis.kernel511=browserCore;globalThis.kernel511Request=browserRequest;'),context,{filename:transportPath});
 vm.runInContext(requestExcerpt(source)+'\n'+pacingExcerpt(source)+'\nglobalThis.pacing=colCombatPacing481;',context,{filename:gamePath+'#Q-Z_-pacing'});
 const core=context.kernel511(instance);
 const ack=(sequence,body={ok:true},status=200)=>sockets.at(-1).packet({type:'frame',protocol,results:[{type:'action',sequence,status,body}]});
 const queued=(sequence,kind='combat')=>sockets.at(-1).packet({type:'queued',protocol,epoch:1,sequence,kind,accepted:true,durable:false});
 const invoke=async(slot,payload)=>{
  if(!context.pacing.begin(slot))return {attempt:'suppressed'};
  try{return {attempt:'submitted',reply:await context.Q('/api/action',payload)};}
  catch(error){return {attempt:'submitted',error:{name:error.name,message:error.message}};}
  finally{context.pacing.end(slot);}
 };
 return {clock,core,context,wire,events,calls,sockets,protocol,image,ack,queued,invoke,evaluate:(source,label='fixture-adapter')=>vm.runInContext(source,context,{filename:label}),async connect(){await core.ensure();await flush();},inputs(){return wire.filter(row=>row.type==='input');},dispose(){core.dispose();}};
}
