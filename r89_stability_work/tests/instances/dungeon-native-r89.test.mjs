import {installBagLimit} from '../../working/core511-source/scripts/core511/bag-limit.mjs';
// Current schema setup only; native oracle, economy, receipt and authority assertions unchanged.
import {createTowerSchema} from '../../working/core511-source/scripts/core511/tower-config.mjs';
import {createAdventureSchema} from '../../working/core511-source/scripts/core511/adventure-schema.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,SHA,native,temporary} from '../../working/core511-source/scripts/core511/tests/helpers.mjs';
import {createRules} from '../../working/core511-source/scripts/core511/generated/rules.mjs';
import {createDungeonRules} from '../../working/core511-source/scripts/core511/generated/dungeon-rules.mjs';
import {ResidentDungeon,createDungeonWriterHandler,readDungeonAdmission} from '../../working/core511-source/scripts/core511/dungeon-runtime.mjs';
import {DurableLedger} from '../../working/core511-source/scripts/core511/durable-ledger.mjs';
import {OperationRandom} from '../../working/core511-source/scripts/core511/operation-random.mjs';
import {DungeonProjection} from '../../working/core511-source/scripts/core511/dungeon-projection.mjs';
import {ResidentState} from '../../working/core511-source/scripts/core511/resident-state.mjs';
import {FixedLoop} from '../../working/core511-source/scripts/core511/fixed-loop.mjs';
import {DungeonLoop} from '../../working/core511-source/scripts/core511/dungeon-loop.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../../working/core511-source/scripts/core511/ownership.mjs';

process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../working/core511-source/scripts/perf-r11/tests/reward/fixture.mjs');
const {DungeonEngine}=await native('vds-server/src/dungeon-engine.mjs');
const {LocalDatabase}=await native('vds-server/src/database.mjs');
const {createDragonBoss}=await native('vds-server/src/dragon-boss.mjs');
const json=v=>JSON.parse(JSON.stringify(v));
const seed=n=>n.toString(16).padStart(64,'0');
function insert(sql,table,row){const columns=Object.keys(row);sql.prepare(`INSERT INTO ${table}(${columns.join(',')}) VALUES(${columns.map(()=>'?').join(',')})`).run(...Object.values(row));}

test('shipped R86 dungeon rules are preserved byte-for-byte; RNG replay is stable',()=>{
 // The V510 source predates the shipped tower and dungeon-control adapters.
 // Pin the complete R86 generated file (from the verified R86 update manifest),
 // including those adapters, rather than comparing it to unadapted V510 methods.
 const bytes=fs.readFileSync(new URL('../../working/core511-source/scripts/core511/generated/dungeon-rules.mjs',import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),'77963628107a0505f24d134e4a10929094a1033137c66321a174d559e007a15f');
 const a=new OperationRandom(seed(918)),b=new OperationRandom(seed(918));
 for(let i=0;i<1000;i++){assert.equal(a.roll(),b.roll());assert.equal(a.integer(3,17),b.integer(3,17));assert.equal(a.uuid(),b.uuid());}
});

async function scenario(t,{ordered=false}={}){
 const f=await fixture(),dir=temporary(t);t.after(()=>f.close());
 const source=f.database.sqlite,ids=['real-1','d511-b','d511-c'];let now=Date.now(),oldRandom;
 createTowerSchema(source);createAdventureSchema(source);installBagLimit(source);
 for(const id of ids.slice(1)){
  insert(source,'accounts',{id:'account-'+id,username:id,username_normalized:id,email:id+'@fixture.invalid',email_normalized:id+'@fixture.invalid',password_hash:'fixture-only',password_salt:'fixture',created_at:Math.floor(now/1000),updated_at:Math.floor(now/1000)});
  insert(source,'players',{id,account_id:'account-'+id,name:id,role:'avci',channel:1,area:'bazaar',level:50,x:1910,y:660,hp:100,max_hp:100,last_seen:Math.floor(now/1000),created_at:Math.floor(now/1000)});
 }
 source.prepare("UPDATE players SET level=50,area='bazaar',x=1910,y=660,last_seen=? WHERE id IN (?,?,?)").run(Math.floor(now/1000),...ids);
 insert(source,'parties',{id:'d511-party',leader_id:ids[0],created_at:Math.floor(now/1000)});for(const id of ids)insert(source,'party_members',{party_id:'d511-party',player_id:id,joined_at:Math.floor(now/1000)});
 source.prepare("UPDATE game_settings SET events_json=? WHERE id=1").run(JSON.stringify({enhancement491Drop:{enabled:true,revision:1,dropPercent:100}}));
 source.exec('PRAGMA wal_checkpoint(TRUNCATE)');
 const targetFile=path.join(dir,'resident.sqlite');fs.copyFileSync(f.file,targetFile);
 const target=new LocalDatabase(targetFile,{groupWrites:true,asyncDurable:true});installBagLimit(target.sqlite);t.after(async()=>{await target.walSync?.durable();target.close();});
 const globals={__colDragonBoss:createDragonBoss(target.sqlite,{now:()=>now})},oldGlobals={__colDragonBoss:createDragonBoss(source,{now:()=>now})},stats=createRules({globals}).calculateEquipmentStats;
 const Old=createDungeonRules({globals:oldGlobals,randomUUID:()=>oldRandom.uuid(),randomInt:(...a)=>oldRandom.integer(...a)}).DungeonEngine;
 oldRandom=new OperationRandom(seed(1));const old=new Old(source,{now:()=>now,roll:()=>oldRandom.roll(),stats,onWork:()=>{}});
 const epochs=new Map(ids.map(id=>[id,1])),peer={channel:1,realm:'fixture',incarnation:'native-dungeon-1'},events=[],published=[];
 const authority=ordered?new ChannelOwnership(target,{realmId:'fixture',now:()=>now}):null,owners=new Map();
 if(authority){await authority.initialize();for(const channel of [1,2,3,4])await authority.registerProcess(channel,'native-dungeon-'+channel);for(const id of ids)owners.set(id,await authority.admit(id,peer,{sessionId:'session-'+id,guard:(sql,owner)=>sql.prepare('SELECT channel FROM players WHERE id=?').get(id)?.channel===owner.channel}));}
 const handler=createDungeonWriterHandler({stats,globals,clock:()=>now,assertOwnership:(sql,p,id,epoch)=>authority?Boolean(authority.assertAdmitted(sql,p,id,epoch)):p===peer&&epochs.get(id)===epoch&&sql.prepare('SELECT channel FROM players WHERE id=?').get(id)?.channel===1});
 const ledger=new DurableLedger(target,{authorize:(_,p,e)=>p===peer&&e.realm==='fixture',handlers:new Map([['dungeon',handler]])});
 const client=authority?new OrderedWriterClient({peer,owner:id=>owners.get(id),request:(p,r)=>authority.command(p,r)}):null;
 if(authority){registerOwnedRule(authority,'dungeon',handler);for(const id of ids)client.seed(id,owners.get(id).epoch,owners.get(id).sequence);}
 let blockAck=null;
 const resident=new ResidentDungeon({channel:1,globals,clock:()=>now,assertOwned:id=>epochs.get(id),actorsFor:(actor,input)=>input.action==='create'?ids:[actor],onCommitted:value=>published.push(value),submit:async e=>{
  const event={...e,realm:'fixture'};events.push(event);const result=await (client?client.submit(event):ledger.submit(peer,event));if(blockAck)await blockAck;return result;
 }});
 resident.hydrate(readDungeonAdmission(target.sqlite,ids));
 let serial=10;
 async function both(actor,input){
  now+=50;const s=seed(++serial);oldRandom=new OperationRandom(s);
  const expected=old.command(actor,input),step=resident.step(actor,{kind:'command',input},{now,seed:s});
  const result=step.durable?await step.completion:step.result;
  assert.deepEqual(json(result),json(expected));assert.deepEqual(json([...resident.runs.values()].map(r=>r.run)),json([...old.runs.values()]));return step;
 }
 async function tick(elapsed=.05){
  now+=elapsed*1000;const s=seed(++serial);oldRandom=new OperationRandom(s);old.withStepSettings(()=>old.tickStep(old.runs.values(),now,elapsed));
  const run=[...resident.runs.values()][0]?.run,actor=run?.members.find(p=>!p.left)?.id??run?.leaderId;
  if(actor){const step=resident.step(actor,{kind:'tick',elapsed,runId:run.id},{now,seed:s});if(step.durable)await step.completion;}
  assert.deepEqual(json([...resident.runs.values()].map(r=>r.run)),json([...old.runs.values()]));
 }
 return {f,dir,ids,source,target,targetFile,handler,old,resident,ledger,peer,epochs,events,published,authority,client,owners,both,tick,now:()=>now,advance:ms=>now+=ms,
  setAckBarrier:p=>{blockAck=p;},setRandom:s=>oldRandom=new OperationRandom(s)};
}

test('idle room keeps exact native clocks without full-room clone or redundant projection',async t=>{
 const s=await scenario(t);await s.both(s.ids[0],{action:'create'});
 const resident=s.resident,run=resident.runFor(s.ids[0]),version=resident.versions.get(run.id),projection=new DungeonProjection(resident);
 const first=projection.changed(s.ids[0],s.now());assert(first);const builds=projection.metrics.builds,clone=globalThis.structuredClone;
 globalThis.structuredClone=()=>assert.fail('hot idle room cloned the whole graph');
 try{for(let n=0;n<40;n++)await s.tick();}finally{globalThis.structuredClone=clone;}
 assert.equal(resident.versions.get(run.id),version);assert.equal(projection.changed(s.ids[0],s.now()),null);assert.equal(projection.metrics.builds,builds);
 const snapshot=projection.snapshot(s.ids[0],s.now());assert.deepEqual(json(snapshot.run),json(s.old.publicRun(s.old.runs.get(run.id),s.ids[0])));
});

test('native group dungeon entry, movement, combat, boss rewards, collect and leave match SQLite engine',async t=>{
 const s=await scenario(t);const {old,resident,source,target,ids}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const runId=[...old.runs.keys()][0];
 const room=()=>old.runs.get(runId),current=()=>resident.runs.get(runId).run;
 const writes=resident.metrics.writerSteps;
 for(let i=1;i<=12;i++){
  await s.both(ids[0],{action:'move',x:i%2?100:-100,y:20,sequence:i});await s.tick();
 }
 assert.equal(resident.metrics.writerSteps,writes,'ordinary move/tick does not contact the writer');
 assert(Math.hypot(current().members[0].input.x,current().members[0].input.y)<=1.000001);
 await s.both(ids[0],{action:'move',x:10000,y:10000,sequence:12});
 // Arrange identical combat positions/HP in the two private test worlds.
 // The actual attack, floor/shield phases, reward and pickup methods run intact.
 for(const r of [room(),current()]){r.stage=3;r.focusPhase=2;r.enemies=[{id:'d511-boss',kind:'boss',x:1200,y:540,hp:1,maxHp:1,nextAttack:s.now()+100000,attackCount:0,shield:false}];for(const p of r.members){p.x=1200;p.y=540;p.cooldowns=[0,0,0,0];}}
 await s.both(ids[0],{action:'attack',skill:0,target:'d511-boss'});
 assert.equal(current().status,'complete');assert.equal(target.sqlite.prepare('SELECT count(*) n FROM dungeon_rewards WHERE run_id=?').get(runId).n,3);
 const afterKill=s.events.at(-1);const count=target.sqlite.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(ids[0],'forge_ember491').amount;
 assert.equal(count,1);assert.equal((await s.ledger.submit(s.peer,afterKill)).replayed,true);
 assert.equal(target.sqlite.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(ids[0],'forge_ember491').amount,1);
 for(const actor of ids){
  while(current().groundLoot.some(d=>d.ownerId===actor)){
   const drop=current().groundLoot.find(d=>d.ownerId===actor);
   for(const r of [room(),current()])Object.assign(r.members.find(p=>p.id===actor),{x:drop.x,y:drop.y});
   await s.both(actor,{action:'collect'});
  }
 }
 for(const table of ['dungeon_rewards','dungeon_materials','player_items','player_stones','dungeon_event_claims']){
  const order=rows=>json(rows).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
  assert.deepEqual(order(target.sqlite.prepare('SELECT * FROM '+table).all()),order(source.prepare('SELECT * FROM '+table).all()),table);
 }
 for(const id of ids)await s.both(id,{action:'leave'});s.advance(60001);await s.tick();
 assert.equal(target.sqlite.prepare('SELECT count(*) n FROM dungeon_members').get().n,0);assert.equal(resident.runs.size,0);
});

test('dungeon writer ACK loss keeps every room member fenced and replay cannot grant twice',async t=>{
 const s=await scenario(t),{ids,resident,target}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const entry=[...resident.runs.values()][0],before=structuredClone(entry.run);
 let release;const delayed=new Promise(resolve=>release=resolve);s.setAckBarrier(delayed);
 const step=resident.step(ids[0],{kind:'command',input:{action:'leave'}},{now:s.now()+50,seed:seed(3000)});
 assert.equal(step.durable,true);await new Promise(resolve=>setTimeout(resolve,20));
 assert.deepEqual(resident.runFor(ids[0]),before,'published room stays at last ACK while writer has committed');
 assert.throws(()=>resident.step(ids[1],{kind:'command',input:{action:'move',x:1,y:0,sequence:1}},{now:s.now()+50}),/dungeon_room_pending/);
 assert.equal(target.sqlite.prepare('SELECT run_id FROM dungeon_members WHERE player_id=?').get(ids[0]),undefined);
 release();await step.completion;assert.equal(resident.pending.size,0);assert.equal(resident.runFor(ids[0]),null);
 const event=s.events.at(-1);assert.equal((await s.ledger.submit(s.peer,event)).replayed,true);
 const wrong={...event,key:event.key+'-stale'};await assert.rejects(s.ledger.submit(s.peer,wrong),/dungeon_snapshot_conflict/);
});

test('failed native economy command rolls back, preserves room and allows a later valid command',async t=>{
 const s=await scenario(t),{ids,resident,target}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const run=resident.runFor(ids[0]),member=run.members.find(p=>p.id===ids[0]);member.hp=1;
 target.sqlite.prepare('UPDATE players SET potions=0 WHERE id=?').run(ids[0]);
 const step=resident.step(ids[0],{kind:'command',input:{action:'potion'}},{now:s.now()+50,seed:seed(3001)});
 const result=await step.completion;assert.equal(result.ok,false);assert.equal(result.code,'dungeon_rule_rejected');
 assert.equal(resident.runFor(ids[0]).members.find(p=>p.id===ids[0]).hp,1);assert.equal(resident.failure,null);assert.equal(resident.pending.size,0);
 assert.equal(target.sqlite.prepare('SELECT potions FROM players WHERE id=?').get(ids[0]).potions,0);
 const move=resident.step(ids[0],{kind:'command',input:{action:'move',x:1,y:0,sequence:1}},{now:s.now()+100});assert.equal(move.durable,false);
});

for(const phase of ['before','after'])test('native dungeon reward survives SIGKILL '+phase+' COMMIT and applies exactly once after writer restart',async t=>{
 const s=await scenario(t),{ids,resident,target}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const run=resident.runFor(ids[0]);run.stage=3;run.focusPhase=2;run.enemies=[{id:'crash-boss',kind:'boss',x:1200,y:540,hp:1,maxHp:1,nextAttack:s.now()+100000,attackCount:0,shield:false}];
 for(const p of run.members){p.x=1200;p.y=540;p.cooldowns=[0,0,0,0];}
 let release,reject;resident.submit=()=>new Promise((resolve,rejected)=>{release=resolve;reject=rejected;});
 const step=resident.step(ids[0],{kind:'command',input:{action:'attack',skill:0,target:'crash-boss'}},{now:s.now()+50,seed:seed(9000)});
 assert.equal(step.durable,true);await Promise.resolve();
 const event={...step.event,realm:'fixture'},file=path.join(s.dir,'crash.sqlite'),eventFile=path.join(s.dir,'event.json'),marker=path.join(s.dir,'phase.txt');
 target.sqlite.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.targetFile,file);fs.writeFileSync(eventFile,JSON.stringify(event));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'../../working/core511-source/scripts/core511/tests/dungeon-crash-fixture.mjs'),file,eventFile,phase,marker],{stdio:['ignore','ignore','pipe']});
 let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');
 assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_native_dungeon_reward':'committed_native_dungeon_reward_before_ack');
 assert.equal(resident.runFor(ids[0]).status,'active','no speculative boss death before ACK');
 const recovered=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(async()=>{await recovered.walSync?.durable();recovered.close();});
 const receiptCount=()=>recovered.sqlite.prepare('SELECT count(*) n FROM dungeon_rewards WHERE run_id=?').get(run.id).n;
 assert.equal(receiptCount(),phase==='after'?3:0);
 const ledger=new DurableLedger(recovered,{authorize:(_,p,e)=>p===s.peer&&e.realm==='fixture',handlers:new Map([['dungeon',s.handler]])});
 const ack=await ledger.submit(s.peer,event);assert.equal(ack.replayed,phase==='after');release(ack);await step.completion;
 assert.equal(receiptCount(),3);assert.equal(resident.runFor(ids[0]).status,'complete');
 await ledger.submit(s.peer,event);assert.equal(receiptCount(),3);
 assert.equal(recovered.sqlite.prepare('SELECT amount FROM dungeon_materials WHERE player_id=? AND kind=?').get(ids[0],'forge_ember491').amount,1);
 assert.equal(resident.pending.size,0);
});

test('20 Hz input queues integrate the native dungeon writer without publishing uncommitted results',async t=>{
 const s=await scenario(t),{resident,ids}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const state=new ResidentState(1),packets=[];
 for(const id of ids){state.put('players',{...resident.players.get(id),cycle:1});state.claim(id,1);}
 const bridge=new DungeonLoop(resident),kernel=new FixedLoop({state,wall:s.now,send:(id,data)=>packets.push({id,data}),rules:{
  movement:ctx=>bridge.handle(ctx),combat:ctx=>bridge.handle(ctx),ai:()=>{},respawn:()=>{},project:({results})=>results.length?{results}:null,
 }});t.after(()=>kernel.stop());for(const id of ids)kernel.admit(id,1);kernel.stopped=false;
 let release;const held=new Promise(resolve=>release=resolve);s.setAckBarrier(held);
 kernel.enqueue(ids[0],{epoch:1,sequence:1,kind:'combat',payload:{action:'leave'}});
 kernel.enqueue(ids[1],{epoch:1,sequence:1,kind:'combat',payload:{action:'move',x:1,y:0,sequence:1}});
 kernel.tick();assert.equal(packets.length,0);assert.equal(kernel.players.get(ids[0]).lastApplied,0);
 for(const id of ids)assert.equal(state.owners.get(id).pending,1);
 const pending=kernel.players.get(ids[0]).barrier;release();await pending;kernel.tick();
 assert.equal(kernel.players.get(ids[0]).lastApplied,1);assert.equal(kernel.players.get(ids[1]).lastApplied,1);
 assert.equal(packets.find(p=>p.id===ids[0]).data.results[0].ok,true);
 assert.equal(packets.find(p=>p.id===ids[1]).data.results[0].ok,true);
 assert.equal(packets.find(p=>p.id===ids[1]).data.results.some(r=>r.type==='durable'),false);
 assert.equal(kernel.failure,null);assert.equal(resident.pending.size,0);
});

test('native solo entry key, daily limit receipt, three loot draws, pickup and exit remain equal',async t=>{
 const s=await scenario(t),{ids,resident,old,source,target}=s,id=ids[0];
 for(const sql of [source,target.sqlite])sql.prepare("INSERT INTO dungeon_materials VALUES(?,'solo_key',1)").run(id);
 resident.hydrate(readDungeonAdmission(target.sqlite,ids));
 const input={action:'create_solo',requestId:'solo-entry-511-test-one'};
 await s.both(id,input);await s.both(id,input);
 assert.equal(target.sqlite.prepare('SELECT used FROM solo_daily_entries WHERE player_id=?').get(id).used,1);
 assert.equal(target.sqlite.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='solo_key'").get(id).amount,0);
 const rid=resident.runFor(id).id;
 for(const r of [resident.runFor(id),old.runs.get(rid)]){
  r.stage=3;r.enemies=[{id:'solo511-boss',kind:'boss',x:1200,y:540,hp:1,maxHp:1,nextAttack:s.now()+100000,attackCount:0,shield:false}];
  r.members[0].x=1200;r.members[0].y=540;r.members[0].cooldowns=[0,0,0,0];
 }
 await s.both(id,{action:'attack',target:'solo511-boss',skill:0});
 assert.equal(resident.runFor(id).groundLoot.length,3);assert.equal(resident.runFor(id).rewards[id].length,3);
 while(resident.runFor(id).groundLoot.length){const d=resident.runFor(id).groundLoot[0];for(const r of [resident.runFor(id),old.runs.get(rid)])Object.assign(r.members[0],{x:d.x,y:d.y});await s.both(id,{action:'collect'});}
 assert.equal(target.sqlite.prepare("SELECT amount FROM dungeon_materials WHERE player_id=? AND kind='weathered_iron'").get(id).amount,3);
 assert.deepEqual(json(target.sqlite.prepare('SELECT * FROM dungeon_rewards WHERE run_id=?').all(rid)),json(source.prepare('SELECT * FROM dungeon_rewards WHERE run_id=?').all(rid)));
 await s.both(id,{action:'leave'});assert.equal(resident.runFor(id),null);assert.equal(resident.runs.size,0);
});

test('native dungeon rewards use four-channel authority and per-player ordered durable receipts',async t=>{
 const s=await scenario(t,{ordered:true}),{ids,resident,old,target,authority,peer}=s;
 await s.both(ids[0],{action:'create'});await s.both(ids[1],{action:'ready',ready:true});await s.both(ids[2],{action:'ready',ready:true});
 const rid=resident.runFor(ids[0]).id;
 for(const r of [resident.runFor(ids[0]),old.runs.get(rid)]){
  r.stage=3;r.focusPhase=2;r.enemies=[{id:'owned-boss',kind:'boss',x:1200,y:540,hp:1,maxHp:1,nextAttack:s.now()+100000,attackCount:0,shield:false}];
  for(const p of r.members){p.x=1200;p.y=540;p.cooldowns=[0,0,0,0];}
 }
 await s.both(ids[0],{action:'attack',target:'owned-boss',skill:0});
 const e=s.events.at(-1),owner=authority.owner(e.actor),request={playerId:e.actor,epoch:owner.epoch,sequence:owner.sequence,operationId:e.key,operation:e.kind,payload:e.payload};
 const receipt=await authority.command(peer,request);assert.equal(receipt.key,e.key);assert.equal(receipt.result.run.status,'complete');
 assert.equal(target.sqlite.prepare('SELECT count(*) n FROM dungeon_rewards WHERE run_id=?').get(rid).n,3);
 assert.equal(target.sqlite.prepare('SELECT count(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(e.key).n,1);
 await assert.rejects(authority.command({...peer,channel:4,incarnation:'native-dungeon-4'},request),/owner_epoch_fenced/);
 await assert.rejects(authority.command(peer,{...request,payload:{...request.payload,now:request.payload.now+1}}),/operation_id_reused/);
 assert.equal(target.sqlite.prepare('SELECT count(*) n FROM dungeon_rewards WHERE run_id=?').get(rid).n,3);
});
