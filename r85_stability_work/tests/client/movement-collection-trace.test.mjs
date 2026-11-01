import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {here,sha,gameSource,transportSource,flush} from './source-fixture.mjs';
import {collectFixture} from './collect-fixture.mjs';

const manifest=JSON.parse(fs.readFileSync(process.argv[2]??path.join(here,'combined-client-candidate.json'),'utf8'));
const candidate=fs.readFileSync(manifest.candidate,'utf8');
assert.equal(sha(candidate),manifest.candidateSha256);
const out={scope:'real current transport/prediction plus exact current collection callbacks against a controlled serial authoritative peer. This establishes scheduling causality only; it is not a native writer performance benchmark.',gameSha256:sha(gameSource),candidateSha256:sha(candidate),transportSha256:sha(transportSource),cases:[]};
async function trace(source,{name,duration,service}){
 let f,available=0,revision=1,count=0,maxQueue=0,unchangedMs=0,run=0,longest=0,previous=100;
 const frames=[],acks=[];
 f=collectFixture({source,drops:80,instance:name,onInput:(packet,socket,clock)=>{
  const action=packet.payload.action,number=++count;
  queueMicrotask(()=>socket.packet({type:'queued',protocol:f.protocol,epoch:1,sequence:packet.sequence,kind:action==='move'?'movement':'combat',accepted:true,durable:false}));
  const at=available=Math.max(clock.now,available)+service(number,action);
  clock.set(()=>{
   const body=action==='move'?{ok:true,x:packet.payload.x,y:packet.payload.y,area:'forest',positionRevision:++revision}:{ok:true};
   acks.push({at:clock.now,sequence:packet.sequence,action});
   f.ack(packet.sequence,body);
  },at-clock.now);
 }});
 try{
  await f.connect();f.context.pollAuto();await flush();
  for(let at=20;at<=duration;at+=20){
   await f.clock.to(at);
   if(at%120===0){f.context.pollAuto();await flush();}
   const own=f.core.world.players[0];
   const position=f.core.predictFrame({own,seconds:.02,frameAt:at},(p,seconds)=>({x:p.x+100*seconds,y:p.y}));
   await flush();
   const pendingMs=f.core.prediction.pending.reduce((total,row)=>total+row.seconds*1000,0);
   assert(pendingMs<=600.000001,'original prediction bound remains enforced');
   const stopped=Math.abs(position.x-previous)<1e-6;
   if(stopped){unchangedMs+=20;run+=20;longest=Math.max(longest,run);}else run=0;
   frames.push({at,x:Math.round(position.x*1000)/1000,pendingMs:Math.round(pendingMs),stopped});previous=position.x;
   maxQueue=Math.max(maxQueue,f.core.queue.length);
  }
  return {durationMs:duration,maxQueue,firstMovementWireMs:f.inputs().find(row=>row.payload.action==='move')?.at??null,firstMovementAckMs:acks.find(row=>row.action==='move')?.at??null,movementCommands:f.inputs().filter(row=>row.payload.action==='move').length,collectionCommands:f.inputs().filter(row=>row.payload.action==='collect').length,finalX:frames.at(-1).x,unchangedMs,longestUnchangedMs:longest,frames,movementWire:f.inputs().filter(row=>row.payload.action==='move').map(row=>({at:row.at,sequence:row.sequence,x:row.payload.x,dependsOn:row.dependsOn??null})),acks};
 }finally{f.dispose();await flush();}
}
for(const scenario of [
 {name:'healthy serial ACK 40 ms',duration:6000,service:()=>40},
 {name:'each serial durable result held 300 ms',duration:6000,service:()=>300},
 {name:'first collect held 5000 ms then serial ACKs 40 ms',duration:7000,service:number=>number===1?5000:40}
]){
 const baseline=await trace(gameSource,{...scenario,name:scenario.name+'-baseline'}),patched=await trace(candidate,{...scenario,name:scenario.name+'-candidate'});
 const samePrediction=JSON.stringify(baseline.frames)===JSON.stringify(patched.frames);
 const sameDisplayedPositions=baseline.frames.every((row,index)=>row.x===patched.frames[index].x);
 assert(sameDisplayedPositions,'presentation under the same controlled durable ACK holds remains unchanged');
 assert.equal(baseline.firstMovementWireMs,20);assert.equal(patched.firstMovementWireMs,20);
 if(scenario.name.includes('5000')){assert.equal(baseline.maxQueue,32);assert(patched.maxQueue<=1);assert.equal(patched.firstMovementAckMs,5040);assert(patched.longestUnchangedMs>=4000);assert.deepEqual(baseline.frames.filter(row=>row.at<=5000),patched.frames.filter(row=>row.at<=5000),'queue admission cannot resolve the original held durable result');}
 out.cases.push({scenario:scenario.name,samePrediction,sameDisplayedPositions,baseline,candidate:patched});
}
fs.writeFileSync(path.join(here,'movement-collection-trace-evidence.json'),JSON.stringify(out,null,2)+'\n');
const compact=row=>Object.fromEntries(Object.entries(row).filter(([key])=>!['frames','movementWire','acks'].includes(key)));
console.log(JSON.stringify(out.cases.map(({scenario,samePrediction,sameDisplayedPositions,baseline,candidate})=>({scenario,samePrediction,sameDisplayedPositions,baseline:compact(baseline),candidate:compact(candidate)})),null,2));
