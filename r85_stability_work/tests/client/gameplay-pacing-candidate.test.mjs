import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fixture,flush,here,gameSource,sha,transportPath,transportSource,pacingExcerpt,requestExcerpt} from './source-fixture.mjs';

const manifest=JSON.parse(fs.readFileSync(process.argv[2]??path.join(here,'combined-client-candidate.json'),'utf8'));
const candidate=fs.readFileSync(manifest.candidate,'utf8');
assert.equal(sha(candidate),manifest.candidateSha256);
let reversed=candidate;
for(const replacement of [...manifest.replacements].reverse())reversed=reversed.replace(replacement.after,replacement.before);
assert.equal(reversed,gameSource);
assert.equal(requestExcerpt(candidate),requestExcerpt(gameSource),'all request timeout and error semantics retained byte for byte');
const evidence={scope:'exact candidate request/pacing code with unchanged complete transport in controlled virtual time; not live VDS/full React/browser test',sourceSha256:sha(gameSource),candidateSha256:sha(candidate),transportPath,transportSha256:sha(transportSource),candidatePacingSha256:sha(pacingExcerpt(candidate)),cases:[]};
async function run(name,body){const f=fixture({source:candidate,instance:name});try{await f.connect();await body(f);evidence.cases.push({name,status:'passed'});}finally{f.dispose();}}

for(const [action,slot]of [['attack',0],['attack',1],['attack',2],['pvp_attack',0],['pvp_attack',2],['cast_support456',3],['guardian_dash',2]]){
 await run('timeout keeps '+action+' slot '+slot+' owned until late ACK',async f=>{
  const first=f.invoke(slot,{action,ability:slot,intentId:'first'});await flush();f.queued(1);
  await f.clock.to(8000);assert.equal((await first).error.name,'ActionRequestTimeoutError');
  for(let i=0;i<30;i++){await f.clock.to(8100+i*80);assert.equal((await f.invoke(slot,{action,ability:slot,intentId:'suppressed-'+i})).attempt,'suppressed');}
  assert.equal(f.inputs().length,1);assert.equal(f.core.queue.length,0);
  await f.clock.to(20000);f.ack(1);await flush();
  assert.equal(f.inputs().length,1,'late ACK must not flush any stale duplicate');
  const next=f.invoke(slot,{action,ability:slot,intentId:'fresh'});await flush();assert.equal(f.inputs().length,2);assert.equal(f.inputs()[1].sequence,2);f.ack(2);assert.equal((await next).reply.ok,true);
 });
}

await run('transport queue also retains same-ability ownership before wire admission',async f=>{
 const other=f.core.command({action:'use_potion'});await flush();
 const first=f.invoke(0,{action:'attack',ability:0,intentId:'queued'});await flush();assert.equal(f.core.queue.length,1);
 await f.clock.to(8000);assert.equal((await first).error.name,'ActionRequestTimeoutError');
 assert.equal((await f.invoke(0,{action:'attack',ability:0})).attempt,'suppressed');assert.equal(f.core.queue.length,1);
 f.ack(1);await other;await flush();assert.equal(f.inputs().length,2);f.ack(2);await flush();
 assert.equal(f.context.pacing.begin(0),true);f.context.pacing.end(0);
});

await run('secondary slot and cross-target PvP/PvE share the established ability gate',async f=>{
 f.clock.now=200;const own=f.core.world.players[0];f.core.predictFrame({own,seconds:.1,frameAt:200},(p,dt)=>({x:p.x+100*dt,y:p.y}));
 assert.equal(f.core.active.movement,true);
 const pending=f.invoke(0,{action:'attack',ability:0,intentId:'secondary'});await flush();assert.equal(f.core.movementBehind.payload.action,'attack');
 await f.clock.to(8200);await pending;
 assert.equal((await f.invoke(0,{action:'pvp_attack',ability:0})).attempt,'suppressed');assert.equal(f.core.queue.length,0);
 f.ack(1,{ok:true,x:110,y:100,area:'forest',positionRevision:2});f.ack(2);await flush();
});

await run('different ability and non-combat actions preserve FIFO',async f=>{
 const basic=f.invoke(0,{action:'attack',ability:0});await flush();
 const skill=f.invoke(1,{action:'attack',ability:1});await flush();
 const item=f.core.command({action:'use_potion'});await flush();
 assert.equal(f.core.queue.length,2);assert.deepEqual(Array.from(f.core.queue,row=>row.payload.action),['attack','use_potion']);
 f.ack(1);assert.equal((await basic).reply.ok,true);await flush();assert.equal(f.inputs()[1].payload.ability,1);
 f.ack(2);await skill;await flush();assert.equal(f.inputs()[2].payload.action,'use_potion');f.ack(3);await item;
});

await run('normal fast attacks, double-click gate, explicit error and rate deadline',async f=>{
 const first=f.invoke(0,{action:'attack'});await flush();assert.equal((await f.invoke(0,{action:'attack'})).attempt,'suppressed');
 f.ack(1);await first;
 const second=f.invoke(0,{action:'attack'});await flush();f.ack(2,{ok:false,code:'basic_attack_cadence',error:'cadence'},409);assert.equal((await second).error.name,'ActionRequestError');
 assert.equal(f.context.pacing.begin(0),true);f.context.pacing.end(0);
 f.context.pacing.observe(429,{code:'rate_limited',retryAfter:2});assert.equal(f.context.pacing.begin(1),false);
 await f.clock.to(2000);assert.equal(f.context.pacing.begin(1),true);f.context.pacing.end(1);
});

await run('dungeon attack representation and release do not change native dungeon pacing',async f=>{
 const pending=f.core.command({action:'dungeon',command:{action:'attack',ability:1}});await flush();
 assert.equal(f.context.pacing.begin(1),false);assert.equal(f.context.pacing.begin(0),true);f.context.pacing.end(0);
 f.ack(1);await pending;assert.equal(f.context.pacing.begin(1),true);f.context.pacing.end(1);
});

await run('owner-ended rejection clears old commands but fresh combat remains fenced',async f=>{
 const first=f.invoke(0,{action:'attack'});await flush();await f.clock.to(8000);await first;
 assert.equal(f.context.pacing.begin(0),false);
 f.core.rejectActive('command_outcome_unknown');f.core.halted=true;f.core.haltFailure={code:'game_instance_expired',status:409,body:{code:'game_instance_expired',error:'expired'}};
 assert.equal((await f.invoke(0,{action:'attack'})).attempt,'suppressed');assert.equal(f.inputs().length,1);
});

await run('connecting, transition and verification states cannot accumulate pre-queue intent',async f=>{
 for(const [field,value]of [['ready',false],['halted',true],['botRequired',true],['replacing',Promise.resolve()]]){
  const before=f.core[field];f.core[field]=value;
  for(let i=0;i<4;i++)assert.equal((await f.invoke(0,{action:'attack',intentId:field+'-'+i})).attempt,'suppressed');
  assert.equal(f.core.queue.length,0);assert.equal(f.inputs().length,0);f.core[field]=before;
 }
 const valid=f.invoke(0,{action:'attack'});await flush();assert.equal(f.inputs().length,1);f.ack(1);await valid;
});

{
 const f=fixture({source:candidate,instance:'initial-world-connect'});
 try{
  assert.equal((await f.invoke(0,{action:'attack'})).attempt,'suppressed');
  assert.equal(f.inputs().length,0);assert.equal(f.sockets.length,0);
  // This is the exact initial-world route that establishes the transport;
  // subscribe() alone does not connect, and combat must not be its bootstrap.
  const response=await f.context.Z_('/api/world');assert.equal(response.ok,true);await flush();
  assert.equal(f.core.ready,true);assert.equal(f.sockets.length,1);
  const attack=f.invoke(0,{action:'attack'});await flush();f.ack(1);await attack;
  evidence.cases.push({name:'first world request establishes connection independently of combat gate',status:'passed'});
 }finally{f.dispose();}
}

await run('real socket close schedules reconnect independently of suppressed combat',async f=>{
 f.sockets.at(-1).close(1006,'controlled network interruption');assert.equal(f.core.ready,false);
 assert.equal((await f.invoke(0,{action:'attack'})).attempt,'suppressed');assert.equal(f.inputs().length,0);
 await f.clock.to(249);assert.equal(f.sockets.length,1);assert.equal(f.core.ready,false);
 await f.clock.to(250);assert.equal(f.sockets.length,2);assert.equal(f.core.ready,true);
 const attack=f.invoke(0,{action:'attack'});await flush();f.ack(1);assert.equal((await attack).reply.ok,true);
 assert.equal(f.inputs().length,1);assert.equal(f.core.active,null);assert.equal(f.core.queue.length,0);
});

fs.writeFileSync(path.join(here,'gameplay-pacing-candidate-evidence.json'),JSON.stringify(evidence,null,2)+'\n');
console.log(JSON.stringify({passed:evidence.cases.length,cases:evidence.cases,evidence:path.join(here,'gameplay-pacing-candidate-evidence.json')},null,2));
