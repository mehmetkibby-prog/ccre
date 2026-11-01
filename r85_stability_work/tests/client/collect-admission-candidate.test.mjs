import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {here,sha,gameSource,transportSource,flush} from './source-fixture.mjs';
import {collectFixture,collectExcerpts} from './collect-fixture.mjs';

const manifest=JSON.parse(fs.readFileSync(process.argv[2]??path.join(here,'combined-client-candidate.json'),'utf8'));
const candidate=fs.readFileSync(manifest.candidate,'utf8');
assert.equal(sha(candidate),manifest.candidateSha256);
const excerpts=collectExcerpts(candidate);
const out={scope:'exact game collection/manual/timer bodies and complete unchanged transport with controlled ACKs; no native database or full React/canvas execution',sourceSha256:sha(gameSource),candidateSha256:sha(candidate),transportSha256:sha(transportSource),excerptSha256:Object.fromEntries(Object.entries(excerpts).map(([key,value])=>[key,sha(value)])),cases:[],throughput:[]};
const owned=f=>[f.core.active,f.core.movementBehind,...f.core.queue].filter(row=>row?.payload?.action==='collect');
async function run(name,body,options={}){
 const f=collectFixture({source:candidate,instance:name,...options});
 try{await f.connect();const detail=await body(f);out.cases.push({name,status:'passed',...detail});}
 finally{f.dispose();await flush();}
}

await run('same target is owned after observer timeout for manual and automatic attempts',async f=>{
 f.context.pollAuto();await flush();f.queued(1);
 await f.clock.to(8000);assert.equal(f.context.Dr2.current.size,0);
 await f.context.Tm2(f.world.drops[0],false);assert.equal(f.inputs().length,1);
 for(const at of [9500,12000,16000]){await f.clock.to(at);f.context.pollAuto();await flush();}
 assert.equal(owned(f).length,1);assert.equal(f.core.queue.length,0);assert.equal(f.inputs().length,1);
 f.ack(1,{ok:true,essence:10});await flush();assert.equal(owned(f).length,0);
 assert.equal(f.context.collectAdmissionR85(f.core,f.context.Dr2.current).ids.size,0);
 // The old timed-out callback cannot apply speculative credit. The actual
 // server snapshot is authoritative for a late success; native ledger behavior
 // is deliberately not faked or claimed by this fixture.
 assert.equal(f.notifications.length,0);
 f.context.F2.current={...f.context.F2.current,drops:[],players:[{...f.world.players[0],essence:10}]};
 f.context.pollAuto();await flush();assert.equal(f.inputs().length,1);
 return {wireInputs:1,lateAckMs:16000,localPendingMarksAfterSettlement:0,creditClaim:'no client-side invented credit; native ledger not executed'};
});

await run('automatic admission is bounded before first timeout and keeps attack queue room',async f=>{
 for(let i=0;i<40;i++){await f.clock.to(i*120);f.context.pollAuto();await flush();}
 assert.equal(owned(f).length,2);assert.equal(f.core.queue.length,1);
 let finished=false;const attack=f.invoke(0,{action:'attack',intentId:'user-attack'}).then(value=>{finished=true;return value;});await flush();
 assert.equal(finished,false);assert.equal(f.core.queue.length,2);
 const before={atMs:f.clock.now,ownedCollections:owned(f).length,totalQueue:f.core.queue.length};
 f.ack(1,{ok:true,essence:1});await flush();f.ack(2,{ok:true,essence:2});await flush();
 assert.equal(f.inputs()[2].payload.action,'attack');f.ack(3);assert.equal((await attack).reply.ok,true);
 assert.equal(new Set(f.inputs().filter(row=>row.payload.action==='collect').map(row=>row.payload.targetId)).size,2);
 return {...before,userAttack:'admitted FIFO after two existing collections; no backpressure rejection'};
},{drops:80});

await run('synchronous automatic calls reserve both slots before async enqueue',async f=>{
 const pending=f.world.drops.map(drop=>f.context.Tm2(drop,true));
 assert.equal(f.context.Dr2.current.size,2);await flush();assert.equal(owned(f).length,2);
 f.ack(1,{ok:true});await flush();f.ack(2,{ok:true});await Promise.all(pending);
 assert.equal(f.notifications.length,2);assert.equal(f.context.Dr2.current.size,0);assert.equal(f.context.fr2.current,0);
},{drops:30});

await run('pending early drop does not hide the next collectible drop after UI timeout',async f=>{
 f.context.pollAuto();await flush();await f.clock.to(9500);f.context.pollAuto();await flush();
 assert.deepEqual(owned(f).map(row=>row.payload.targetId),['drop-0','drop-1']);
 f.ack(1,{ok:true});await flush();f.ack(2,{ok:true});await flush();
},{drops:3});

await run('manual closest available pickup remains allowed at automatic cap',async f=>{
 f.context.pollAuto();await flush();await f.clock.to(120);f.context.pollAuto();await flush();
 await f.clock.to(9000);assert.equal(f.context.Dr2.current.size,0);
 const manual=f.context.km2();await flush();
 assert.deepEqual(owned(f).map(row=>row.payload.targetId),['drop-0','drop-1','drop-2']);
 assert.equal(owned(f)[2].payload.automatic,false);
 f.ack(1,{ok:true});await flush();f.ack(2,{ok:true});await flush();f.ack(3,{ok:true});await manual;
 assert.equal(f.context.Dr2.current.size,0);
},{drops:4});

await run('successful pickup updates visible inventory and absolute balances only once',async f=>{
 f.context.du=()=>true;const drop=f.world.drops[0];drop.kind='weapon';drop.rarity='red';
 const task=f.context.Tm2(drop,false);await flush();
 f.ack(1,{ok:true,item:{id:'item-1',item_name:'Fixture sword',kind:'weapon',rarity:'red',power:20,role:'muhafiz',enchantments:'[]'},essence:17,stoneDust:3,pearls:2});await task;
 const world=f.context.F2.current;assert.equal(world.drops.length,0);assert.equal(world.inventory.length,1);assert.equal(world.inventory[0].id,'item-1');assert.equal(world.players[0].essence,17);assert.equal(f.notifications.length,1);
 f.ack(1,{ok:true,essence:17});await flush();assert.equal(f.notifications.length,1);assert.equal(f.core.active,null);assert.equal(f.context.Dr2.current.size,0);
});

await run('explicit failure keeps retry backoff and permits a later fresh attempt',async f=>{
 f.context.pollAuto();await flush();f.ack(1,{ok:false,error:'not ready'},409);await flush();
 assert.equal(f.context.kr2.current.get('drop-0'),1500);assert.equal(owned(f).length,0);
 await f.clock.to(1499);f.context.pollAuto();await flush();assert.equal(f.inputs().length,1);
 await f.clock.to(1500);f.context.pollAuto();await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true,essence:1});await flush();assert.equal(f.context.F2.current.drops.length,0);
});

await run('bag guard remains authoritative and no local pending mark survives rejection',async f=>{
 f.context.bagGuardR41.current.reject=()=>true;
 f.context.pollAuto();await flush();f.ack(1,{ok:false,code:'bag_full',error:'full'},409);await flush();
 assert.equal(f.context.Dr2.current.size,0);assert.equal(f.context.fr2.current,0);assert.equal(f.context.kr2.current.has('drop-0'),false);assert.equal(f.context.F2.current.drops.length,1);
 f.context.bagGuardR41.current.allowAuto=()=>false;f.context.pollAuto();await flush();assert.equal(f.inputs().length,1);
 f.context.bagGuardR41.current.allowAuto=()=>true;f.context.pollAuto();await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true});await flush();assert.equal(f.context.F2.current.drops.length,0);
});

await run('all fresh collection admissions respect connection and owner fences',async f=>{
 for(const [field,value]of [['ready',false],['halted',true],['botRequired',true],['replacing',Promise.resolve()]]){
  const old=f.core[field];f.core[field]=value;
  await f.context.Tm2(f.world.drops[0],false);await f.context.Tm2(f.world.drops[1],true);await flush();
  assert.equal(f.context.Dr2.current.size,0);assert.equal(owned(f).length,0);assert.equal(f.inputs().length,0);
  f.core[field]=old;
 }
 const manual=f.context.Tm2(f.world.drops[0],false);await flush();assert.equal(f.inputs().length,1);f.ack(1,{ok:true});await manual;
},{drops:2});

for(const [label,source]of [['baseline',gameSource],['candidate',candidate]]){
 let releaseTicket;
 const f=collectFixture({source,instance:'pre-queue-'+label,beforeTicket:()=>new Promise(resolve=>{releaseTicket=resolve;})});
 try{
  // Initial world fetch, rather than combat/collect, owns the connection setup.
  const world=f.context.Z_('/api/world');await flush();
  const first=f.context.Tm2(f.world.drops[0],false);await flush();
  assert.equal(f.sockets.length,0);assert.equal(owned(f).length,0);
  await f.clock.to(8000);await first;assert.equal(f.context.Dr2.current.size,0);
  await f.clock.to(9500);const second=f.context.Tm2(f.world.drops[0],false);await flush();
  releaseTicket();await world;await flush();
  if(label==='baseline'){
   assert.equal(owned(f).length,2);assert.equal(f.inputs().length,1);
   f.ack(1,{ok:true});await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true});await second;
   out.cases.push({name:'baseline counterexample: manual retry while ensure has no queue row',status:'baseline defect reproduced',delayedTicketMs:9500,wireSameDrop:2});
  }else{
   await second;assert.equal(owned(f).length,0);assert.equal(f.inputs().length,0);
   const fresh=f.context.Tm2(f.world.drops[0],false);await flush();assert.equal(f.inputs().length,1);f.ack(1,{ok:true});await fresh;
   out.cases.push({name:'manual pre-queue retry suppressed until independent initial connection is ready',status:'passed',delayedTicketMs:9500,wireSameDrop:1});
  }
 }finally{f.dispose();await flush();}
}

{
 let accepted=0;
 const f=collectFixture({source:candidate,drops:2,instance:'accepted-collection-reconnect',onAuth:()=>({ready:{lastAccepted:accepted,lastApplied:0}})});
 try{
  await f.connect();f.context.pollAuto();await flush();f.queued(1);accepted=1;
  f.sockets.at(-1).close(1006,'controlled loss');f.context.pollAuto();await flush();assert.equal(owned(f).length,1);
  await f.clock.to(250);assert.equal(f.core.ready,true);assert.equal(f.sockets.length,2);assert.equal(f.inputs().length,1,'accepted collection must not be replayed on reconnect');
  await f.clock.to(9500);await f.context.Tm2(f.world.drops[0],false);f.context.pollAuto();await flush();
  assert.equal(owned(f).length,2);assert.equal(f.inputs().length,1);assert.equal(f.core.queue[0].payload.targetId,'drop-1');
  f.ack(1,{ok:true});await flush();assert.equal(f.inputs().length,2);assert.equal(f.inputs()[1].payload.targetId,'drop-1');f.ack(2,{ok:true});await flush();
  assert.equal(owned(f).length,0);assert.equal(f.context.Dr2.current.size,0);
  out.cases.push({name:'accepted collection ownership survives real reconnect and late ACK without replay',status:'passed',sockets:f.sockets.length,wireInputs:f.inputs().length});
 }finally{f.dispose();await flush();}
}

async function throughput(source,delayFor,label){
 let f,received=0,completed=0,lastAt=0,maxOwned=0,maxQueue=0;const targets=[];
 f=collectFixture({source,drops:12,instance:'throughput-'+label,onInput:(packet,socket,clock)=>{
  assert.equal(packet.payload.action,'collect');const order=++received;
  targets.push(packet.payload.targetId);
  clock.set(()=>{completed++;lastAt=clock.now;f.ack(packet.sequence,{ok:true,essence:completed});},delayFor(order));
 }});
 try{
  await f.connect();
  for(let step=0;step<300&&completed<12;step++){
   await f.clock.to(step*120);f.context.pollAuto();await flush();maxOwned=Math.max(maxOwned,owned(f).length);maxQueue=Math.max(maxQueue,f.core.queue.length);
  }
  assert.equal(completed,12);assert.equal(received,12);assert.equal(new Set(targets).size,12);assert.equal(f.context.F2.current.drops.length,0);assert.equal(f.notifications.length,12);assert.equal(f.context.Dr2.current.size,0);
  return {lastPickupMs:lastAt,received,completed,maxOwned,maxQueue,queueDrainAfterFirstAckMs:lastAt-delayFor(1)};
 }finally{f.dispose();await flush();}
}
for(const delay of [40,100,120,180,300,600]){
 const baseline=await throughput(gameSource,()=>delay,'base-'+delay),patched=await throughput(candidate,()=>delay,'candidate-'+delay);
 assert.equal(patched.lastPickupMs,baseline.lastPickupMs,'constant healthy response delay throughput');assert(patched.maxOwned<=2);
 out.throughput.push({case:'constant ACK delay '+delay+' ms',baseline,candidate:patched,pickupDelayAddedMs:patched.lastPickupMs-baseline.lastPickupMs});
}
{
 const delay=order=>order<=3?600:20;
 const baseline=await throughput(gameSource,delay,'burst-base'),patched=await throughput(candidate,delay,'burst-candidate');
 assert(patched.maxOwned<=2);
 out.throughput.push({case:'first 3 ACKs 600 ms then 20 ms (recovery burst)',baseline,candidate:patched,pickupDelayAddedMs:patched.lastPickupMs-baseline.lastPickupMs,tradeoff:'bounded automatic backlog can leave up to one 120 ms poll gap after rapid ACK bursts; unchanged FIFO and pickup interval'});
}
fs.writeFileSync(path.join(here,'collect-admission-candidate-evidence.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.cases.filter(row=>row.status==='passed').length,baselineDefectsReproduced:out.cases.filter(row=>row.status==='baseline defect reproduced').length,cases:out.cases,throughput:out.throughput},null,2));
