import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {performance} from 'node:perf_hooks';
const root=path.resolve(import.meta.dirname,'..'),base=root+'/../r106_captcha_worker/working/core511-source/scripts/core511';
const {AdventureChannel:Before}=await import(base+'/adventure-channel.mjs');
const {AdventureChannel:After}=await import(root+'/working/core511-source/scripts/core511/adventure-channel.mjs');
const {mapArea}=await import(base+'/adventure-maps.mjs');
function scene(Type,seed,{rooms=12,background=100,refuse=false,membersPerRoom=3}={}){
 let value=seed;const rnd=()=>((value=Math.imul(value,1664525)+1013904223>>>0)/4294967296),now=100000;
 const players=new Map(),monsters=new Map(),owners=new Map(),runs=[],profiles=[],bundles=[],portals=[],schedules=[];
 for(let i=0;i<rooms;i++){
  const id=i.toString(16).padStart(32,'0'),kind=i%2?'mist':'tower',floor=1+i%10,area=mapArea(kind,id,floor);
  const run={id,kind,area,channel:1,cycle:rnd()<.1?2:1,status:rnd()<.1?'closed':'active',deadline_ms:rnd()<.2?now-1:now+10000,config:{patterns:{a:{enabled:true}}},state:{floor,clear:rnd()<.2,autoNextAt:rnd()<.5?now-1:now+1,nextWaveAt:rnd()<.5?now-1:now+1,objective:rnd()<.5?'seals':'clear',bossSpawned:rnd()<.5,hazard:rnd()<.5?null:{at:now-1},nextHazardAt:now-1}};runs.push(run);
  if(rnd()<.7)portals.push({id:'portal'+i,run_id:id,closes_ms:rnd()<.3?now-1:now+1});
  for(let j=0;j<membersPerRoom;j++){
   const actor='p'+i+'-'+j,catchup=kind==='tower'&&floor>1&&rnd()<.2;
   players.set(actor,{id:actor,channel:1,area:rnd()<.15?'forest':catchup?mapArea(kind,id,floor-1):area,hp:rnd()<.1?0:100});
   if(rnd()>.1)owners.set(actor,{epoch:1});
   bundles.push([actor,{member:{run_id:id,departed:rnd()<.15}}]);
  }
  for(let j=0;j<4;j++){const id='m'+i+'-'+j;monsters.set(id,{id,area,hp:rnd()<.4?0:10});profiles.push([id,{kind:j===0?'azrail':j===1?'seal':'claw'}]);}
 }
 for(let i=0;i<background;i++)monsters.set('bg'+i,{id:'bg'+i,area:'forest',hp:100});
 const calls=[],removed=[];
 const channel={view:{players,monsters,player:id=>players.get(id),removeMonster:id=>monsters.delete(id)},owners,world:{cycle:1},backgroundPaused:false,lanes:{busy:()=>false},combatCheckpoints:{retireIdleMonsters:ids=>{removed.push(...ids);return ids;}},state:{remove:()=>{}},worldClock:{forget:()=>{}},attackMemory:{committed:()=>{}}};
 const runtime={channel,services:{adventureProfiles:new Map(profiles)}};
 const a=new Type(runtime,{runs,portals,schedules});a.bundles=new Map(bundles);a.pruneAt=now+10000;
 a.execute=(ids,run,scheduleId,time)=>{calls.push({ids:[...ids],runId:run?.id??null,scheduleId,time});return refuse?false:undefined;};
 return {a,channel,calls,now,removed,view:()=>({calls,runs:[...a.runs.keys()],portals:[...a.portals.keys()],removed})};
}
test('room scheduling parity across deaths, owners, seals, hazards, expiry and explicit refusal',()=>{
 for(let seed=1;seed<=150;seed++)for(const refuse of [false,true]){
  const before=scene(Before,seed,{refuse}),after=scene(After,seed,{refuse});
  before.a.tick(before.now);after.a.tick(after.now);assert.deepEqual(after.view(),before.view(),'seed '+seed+' refusal '+refuse);
 }
});
test('mutations between ticks are immediately visible; no retained room/member cache',()=>{
 const before=scene(Before,31,{refuse:true}),after=scene(After,31,{refuse:true});
 for(let round=0;round<8;round++){
  for(const s of [before,after]){
   for(const [id,m]of s.channel.view.monsters)if(id.endsWith('-'+round%4))s.channel.view.monsters.set(id,{...m,hp:round%2?0:10});
   if(round===2)s.channel.owners.delete('p0-0');
   if(round===3)s.a.bundles.get('p1-0').member.departed=true;
   if(round===4)s.a.schedules.set('scheduled',{id:'scheduled',at_ms:s.now});
   if(round===5)s.a.scheduleRetryAt.set('scheduled',s.now+1000);
   if(round===6)s.a.pruneAt=0;
   if(round===7)s.channel.backgroundPaused=true;
   s.a.tick(s.now+round*100);
  }
  assert.deepEqual(after.view(),before.view(),'round '+round);
 }
});
test('whole-world monster iteration is independent of occupied room count',()=>{
 function count(Type){
  const s=scene(Type,1,{rooms:40,background:6000,refuse:true});let visited=0;
  // Keep every room active and living so all objectives are examined.
  for(const r of s.a.runs.values()){r.status='active';r.deadline_ms=s.now+10000;r.state.clear=false;}
  const values=s.channel.view.monsters.values.bind(s.channel.view.monsters);
  s.channel.view.monsters.values=function*(){for(const m of values()){visited++;yield m;}};
  s.a.tick(s.now);return {visited,size:s.channel.view.monsters.size,calls:s.calls};
 }
 const before=count(Before),after=count(After);assert.deepEqual(after.calls,before.calls);
 assert.equal(after.visited,after.size);assert(before.visited>after.visited*20);
});
if(process.env.SCAN_BENCH==='1'){
 const results=[];
 for(const fixture of [{rooms:1,background:1500},{rooms:2,background:1500},{rooms:4,background:1500},{rooms:8,background:6000},{rooms:10,background:1500,membersPerRoom:1}])for(const Type of [Before,After]){
  const s=scene(Type,1,{...fixture,refuse:true});for(const r of s.a.runs.values()){r.status='active';r.deadline_ms=s.now+10000;r.state.clear=false;}
  for(let i=0;i<50;i++)s.a.tick(s.now);
  const start=performance.now(),cpu=process.cpuUsage();for(let i=0;i<500;i++)s.a.tick(s.now);
  results.push({version:Type===Before?'R106':'R107',ticks:500,ms:performance.now()-start,cpuMicros:process.cpuUsage(cpu),size:s.channel.view.monsters.size,rooms:fixture.rooms,players:fixture.rooms*(fixture.membersPerRoom??3)});
 }
 fs.writeFileSync(root+'/evidence/adventure-scan-benchmark-valid-capacity.json',JSON.stringify(results,null,2)+'\n');console.log(results);
}
