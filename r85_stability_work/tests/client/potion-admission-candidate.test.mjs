import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {here,sha,gameSource,transportSource,flush} from './source-fixture.mjs';
import {potionFixture,potionExcerpt} from './potion-fixture.mjs';
const manifest=JSON.parse(fs.readFileSync(process.argv[2]??path.join(here,'combined-client-candidate.json'),'utf8'));
const candidate=fs.readFileSync(manifest.candidate,'utf8');assert.equal(sha(candidate),manifest.candidateSha256);
const out={scope:'exact automatic potion poll and unchanged complete transport with controlled time/ACK/world state; native healing/inventory database not executed',sourceSha256:sha(gameSource),candidateSha256:sha(candidate),transportSha256:sha(transportSource),candidatePotionExcerptSha256:sha(potionExcerpt(candidate)),cases:[],cadence:[]};
const pending=f=>[f.core.active,f.core.movementBehind,...f.core.queue].filter(row=>row?.payload?.action==='use_potion'||row?.payload?.action==='dungeon'&&row.payload.command?.action==='potion');
async function run(name,body,options={}){const f=potionFixture({source:candidate,instance:name,...options});try{await f.connect();await body(f);out.cases.push({name,status:'passed'});}finally{f.dispose();await flush();}}

for(const dungeon of [false,true]){
 await run((dungeon?'dungeon':'open-world')+' automatic potion ownership lasts beyond UI timeout',async f=>{
  await f.clock.to(2000);f.context.pollPotion();await flush();f.queued(1);
  for(let at=2500;at<=20000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
  assert.equal(f.context.hg2.current,false);assert.equal(f.inputs().length,1);assert.equal(pending(f).length,1);assert.equal(f.core.queue.length,0);
  f.ack(1,{ok:true});await flush();assert.equal(pending(f).length,0);
  await f.clock.to(20500);f.context.pollPotion();await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true});await flush();
 },{dungeon});
 await run((dungeon?'dungeon':'open-world')+' death while potion pending is never inferred as revival',async f=>{
  await f.clock.to(2000);f.context.pollPotion();await flush();f.queued(1);
  await f.clock.to(3000);f.player.hp=0;if(dungeon)f.context.W2.current.run.members[0].hp=0;
  for(let at=3500;at<=12000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
  f.ack(1,{ok:true,hp:100,hpRevision:2});await flush();
  for(let at=12500;at<=16000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
  assert.equal(f.inputs().length,1);assert.equal(f.player.hp,0);if(dungeon)assert.equal(f.context.W2.current.run.members[0].hp,0);assert.equal(pending(f).length,0);
 },{dungeon});
}

await run('automatic potion waits behind deliberate manual potions without deduplicating manual intents',async f=>{
 await f.clock.to(2000);
 const first=f.core.command({action:'use_potion'}),second=f.core.command({action:'use_potion'});await flush();
 f.context.pollPotion();await flush();assert.equal(pending(f).length,2);assert.equal(f.context.hg2.current,false);
 f.ack(1,{ok:true});await first;await flush();f.context.pollPotion();await flush();assert.equal(pending(f).length,1);
 f.ack(2,{ok:true});await second;await flush();assert.equal(f.inputs().length,2);
 f.context.pollPotion();await flush();assert.equal(f.inputs().length,3);assert.equal(f.inputs()[2].payload.automatic,true);f.ack(3,{ok:true});await flush();
});

await run('automatic potion remains admissible behind a different gameplay action',async f=>{
 await f.clock.to(2000);const action=f.core.command({action:'attack',ability:1});await flush();
 f.context.pollPotion();await flush();assert.equal(pending(f).length,1);assert.equal(f.core.queue.length,1);
 f.ack(1,{ok:true});await action;await flush();f.ack(2,{ok:true});await flush();
});

await run('explicit potion rejection releases ownership while retaining original two-second cadence',async f=>{
 await f.clock.to(2000);f.context.pollPotion();await flush();f.ack(1,{ok:false,error:'controlled rejection'},409);await flush();
 assert.equal(f.context.hg2.current,false);assert.equal(pending(f).length,0);
 await f.clock.to(3999);f.context.pollPotion();await flush();assert.equal(f.inputs().length,1);
 await f.clock.to(4000);f.context.pollPotion();await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true});await flush();
});

await run('connection, replacement and verification fences prevent pre-queue automatic intents',async f=>{
 await f.clock.to(2000);
 for(const [field,value]of [['ready',false],['halted',true],['botRequired',true],['replacing',Promise.resolve()]]){
  const old=f.core[field];f.core[field]=value;f.context.pollPotion();await flush();assert.equal(f.context.hg2.current,false);assert.equal(pending(f).length,0);f.core[field]=old;
 }
 f.context.pollPotion();await flush();assert.equal(f.inputs().length,1);f.ack(1,{ok:true});await flush();
});

await run('existing death, HP, ownership, enabled, area and visibility conditions stay enforced',async f=>{
 await f.clock.to(2000);
 const changes=[
  [f.player,'hp',0],[f.player,'hp',51],[f.player,'auto_potion_owned',0],[f.player,'auto_potion_enabled',0],
  [f.context.F2.current,'area','war'],[f.context.F2.current,'area','arena'],[f.player,'arena_match_id','match-1'],[f.context.document,'hidden',true]
 ];
 for(const [object,key,value]of changes){const old=object[key];object[key]=value;f.context.pollPotion();await flush();assert.equal(f.inputs().length,0);object[key]=old;}
 f.context.pollPotion();await flush();assert.equal(f.inputs().length,1);f.ack(1,{ok:true});await flush();
});

{
 let releaseTicket;
 const f=potionFixture({source:candidate,instance:'potion-initial-connection',beforeTicket:()=>new Promise(resolve=>{releaseTicket=resolve;})});
 try{
  const world=f.context.Z_('/api/world');await flush();
  for(let at=2000;at<=10000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
  assert.equal(f.context.hg2.current,false);assert.equal(f.inputs().length,0);assert.equal(pending(f).length,0);
  releaseTicket();await world;await flush();f.context.pollPotion();await flush();assert.equal(f.inputs().length,1);f.ack(1,{ok:true});await flush();
  out.cases.push({name:'delayed initial ticket admits no stale potion and restores automatic use after independent world connection',status:'passed'});
 }finally{f.dispose();await flush();}
}

{
 let accepted=0;
 const f=potionFixture({source:candidate,instance:'accepted-potion-reconnect',onAuth:()=>({ready:{lastAccepted:accepted,lastApplied:0}})});
 try{
  await f.connect();await f.clock.to(2000);f.context.pollPotion();await flush();f.queued(1);accepted=1;
  f.sockets.at(-1).close(1006,'controlled loss');
  await f.clock.to(2250);assert.equal(f.core.ready,true);assert.equal(f.sockets.length,2);
  for(let at=2500;at<=12000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
  assert.equal(f.inputs().length,1);assert.equal(pending(f).length,1);f.ack(1,{ok:true});await flush();
  await f.clock.to(12500);f.context.pollPotion();await flush();assert.equal(f.inputs().length,2);f.ack(2,{ok:true});await flush();
  out.cases.push({name:'real reconnect retains accepted potion without replay and late ACK releases the gate',status:'passed'});
 }finally{f.dispose();await flush();}
}

for(const dungeon of [false,true]){
 const sequences=[];
 for(const [label,source]of [['baseline',gameSource],['candidate',candidate]]){
  let f;f=potionFixture({source,dungeon,instance:'healthy-'+label+'-'+dungeon,onInput:(packet,socket,clock)=>clock.set(()=>f.ack(packet.sequence,{ok:true}),40)});
  try{
   await f.connect();for(let at=0;at<=10000;at+=500){await f.clock.to(at);f.context.pollPotion();await flush();}
   await f.clock.to(10040);assert.equal(f.inputs().length,5);sequences.push(f.inputs().map(row=>row.at));
  }finally{f.dispose();await flush();}
 }
 assert.deepEqual(sequences[0],sequences[1]);out.cadence.push({scope:dungeon?'dungeon':'open-world',baselineWireMs:sequences[0],candidateWireMs:sequences[1],healthyAckMs:40});
}

const excerpt=(source,start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
assert.equal(excerpt(candidate,'  let _m2 = (0, R.useCallback)(', '  }, [Y2, J]), ym2 ='),excerpt(gameSource,'  let _m2 = (0, R.useCallback)(', '  }, [Y2, J]), ym2 ='),'manual generic inventory/economy callback unchanged byte for byte');
assert.equal(excerpt(candidate,'  let th2 = (0, R.useCallback)(', '  }, [Zp2, _m2]), nh2 ='),excerpt(gameSource,'  let th2 = (0, R.useCallback)(', '  }, [Zp2, _m2]), nh2 ='),'manual open-world/dungeon potion callback unchanged byte for byte');
out.cases.push({name:'manual generic inventory/economy and potion callback bodies remain byte-identical',status:'passed'});
fs.writeFileSync(path.join(here,'potion-admission-candidate-evidence.json'),JSON.stringify(out,null,2)+'\n');
console.log(JSON.stringify({passed:out.cases.length,cases:out.cases,cadence:out.cadence},null,2));
