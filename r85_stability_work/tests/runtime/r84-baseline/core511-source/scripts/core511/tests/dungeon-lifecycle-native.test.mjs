import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {json,put} from './pvp-fixture.mjs';
import {setupWorldJobs,jobCommand,isolatedFrozen} from './world-jobs-fixture.mjs';
import {createWorldTransitionHandler} from '../world-jobs.mjs';
import {createEmptyDungeonTick} from '../dungeon-runtime.mjs';
import {ensureDungeonFinalizations} from '../dungeon-finalizations.mjs';
import {dungeonLifecycleDue} from '../dungeon-lifecycle.mjs';
import {ChannelOwnership} from '../ownership.mjs';
import {SystemWriter} from '../system-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';

const {DungeonEngine}=await native('vds-server/src/dungeon-engine.mjs');
const capture=sql=>Object.fromEntries(sql.prepare("SELECT name FROM sqlite_schema WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE 'kernel511_%' ORDER BY name").all().map(({name})=>[name,json(sql.prepare('SELECT * FROM '+JSON.stringify(name)).all())]));
async function room(t){
 const f=await setupWorldJobs(t);await f.f.database.atomic(sql=>ensureDungeonFinalizations(sql));const ids=[f.id,f.targetId,'rival-extra'];
 for(const id of ids)f.sql.prepare("UPDATE players SET area='bazaar',level=50,x=1910,y=660,hp=100,max_hp=100,arena_match_id='',combat_lock_until_ms=0,last_seen=? WHERE id=?").run(Math.floor(f.nowMs/1000),id);
 put(f.sql,'parties',{id:'empty-native-party',leader_id:f.id,created_at:1});for(const id of ids)put(f.sql,'party_members',{party_id:'empty-native-party',player_id:id,joined_at:1});
 const old=new DungeonEngine(f.sql,{now:()=>f.nowMs,stats:f.services.dungeonOptions().stats,onWork:()=>{}});assert.equal(old.command(f.id,{action:'create'}).ok,true);
 const template=structuredClone([...old.runs.values()][0]);for(const p of template.members){p.left=true;p.hp=0;p.input={x:0,y:0};}
 f.sql.exec('DELETE FROM dungeon_members;DELETE FROM dungeon_runs');
 f.writer.operations.set('world_transition',createWorldTransitionHandler({services:f.services,authority:f.authority,clock:()=>f.nowMs,assertFrozen:isolatedFrozen}));
 const store=(id,status='active',deadline=f.nowMs+60000)=>{const run={...structuredClone(template),id,status,deadline};put(f.sql,'dungeon_runs',{id,party_id:run.partyId,leader_id:run.leaderId,status,state:JSON.stringify(run),updated_at:f.nowMs-100});return run;};
 return {...f,old,template,store};
}

test('empty-room cleanup matches the pinned native tick, all SQL rows and notices for every original finish order',async t=>{
 const f=await room(t);let index=0;
 for(const status of ['active','portal','wipe','complete'])for(const expired of [false,true]){
  const run=f.store('empty-parity-'+(++index),status,f.nowMs+(expired?-1:60000));f.old.runs=new Map([[run.id,structuredClone(run)]]);f.old.persistedAt=new Map([[run.id,f.nowMs-100]]);f.old.notices.clear();f.old.lastSave=new Map([[run.id,f.nowMs]]);
  f.sql.exec('SAVEPOINT native_empty_oracle');f.old.transactionSaves=new Map();let expected,notices;
  try{f.old.withStepSettings(()=>f.old.tickStep(f.old.runs.values(),f.nowMs,0));expected=capture(f.sql);notices=json([...f.old.notices]);}finally{f.old.transactionSaves=null;f.sql.exec('ROLLBACK TO native_empty_oracle;RELEASE native_empty_oracle');}
  const request=jobCommand(f,'dungeon_cleanup'),ack=await f.writer.command(f.peer,request);assert.deepEqual(capture(f.sql),expected,status+' expired='+expired);assert.deepEqual(json(ack.result.dungeon.notices),notices);assert.equal(ack.result.dungeon.finished.length,status==='complete'&&!expired?0:1);assert.deepEqual(json(await f.writer.command(f.peer,request)),json(ack));assert.deepEqual(capture(f.sql),expected);
 }
 assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),false);const before=capture(f.sql),repeat=await f.writer.command(f.peer,jobCommand(f,'dungeon_cleanup'));assert.deepEqual(repeat.result.dungeon.finished,[]);assert.deepEqual(repeat.result.dungeon.notices,[]);assert.deepEqual(capture(f.sql),before,'archived complete room must not finish a second time');
});

test('empty-room discovery is bounded and excludes ready rooms, current members and non-left room images',async t=>{
 const f=await room(t);assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),false);const protectedIds=['ready-room','live-member-room','nonleft-room'];
 f.store(protectedIds[0],'ready');const live=f.store(protectedIds[1]);put(f.sql,'dungeon_members',{run_id:live.id,player_id:f.id});const nonleft=f.store(protectedIds[2]);nonleft.members[0].left=false;f.sql.prepare('UPDATE dungeon_runs SET state=? WHERE id=?').run(JSON.stringify(nonleft),nonleft.id);
 const protectedRows=f.sql.prepare('SELECT * FROM dungeon_runs ORDER BY id').all();assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),false);
 for(let n=0;n<9;n++)f.store('batch-empty-'+n);assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),true);
 const first=await f.writer.command(f.peer,jobCommand(f,'dungeon_cleanup'));assert.equal(first.result.dungeon.finished.length,8);assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),true);
 const second=await f.writer.command(f.peer,jobCommand(f,'dungeon_cleanup'));assert.equal(second.result.dungeon.finished.length,1);assert.equal(dungeonLifecycleDue(f.sql,f.nowMs),false);
 assert.deepEqual(f.sql.prepare('SELECT * FROM dungeon_runs WHERE id IN (?,?,?) ORDER BY id').all(...protectedIds),protectedRows);
 const invalid=jobCommand(f,'dungeon_cleanup');invalid.payload.fence='not-frozen';await assert.rejects(f.writer.command(f.peer,invalid),/world_transition_not_frozen/);
 const tick=createEmptyDungeonTick(f.services.dungeonOptions()),row=f.sql.prepare('SELECT * FROM dungeon_runs WHERE id=?').get(live.id);assert.throws(()=>tick(f.sql,row,invalid.payload),/dungeon_empty_requires_atomic/);
 await assert.rejects(f.f.database.atomic(sql=>tick(sql,row,invalid.payload)),/dungeon_empty_scope/);assert.deepEqual(f.sql.prepare('SELECT * FROM dungeon_runs WHERE id IN (?,?,?) ORDER BY id').all(...protectedIds),protectedRows);
});

test('actual sole-writer SIGKILL before and after native finish keeps room, finalization and replay receipt atomic',{timeout:20000},async t=>{
 const f=await room(t);f.store('durable-complete-room','complete',f.nowMs-1);const before=capture(f.sql),dir=temporary(t),request=jobCommand(f,'dungeon_cleanup'),input=path.join(dir,'input.json');fs.writeFileSync(input,JSON.stringify({peer:f.peer,request}));f.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');const {LocalDatabase}=await native('vds-server/src/database.mjs');
 for(const phase of ['before','after']){
  const file=path.join(dir,phase+'.sqlite'),marker=path.join(dir,phase+'.marker');fs.copyFileSync(f.f.file,file);const child=spawn(process.execPath,[path.join(import.meta.dirname,'world-jobs-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null,stderr);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_world_job':'durable_world_job_before_ack');
  const db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});try{
   assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_dungeon_finalizations').get().n,phase==='before'?0:1);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,phase==='before'?0:1);if(phase==='before')assert.deepEqual(capture(db.sqlite),before);else assert.notDeepEqual(capture(db.sqlite),before);
   const authority=new ChannelOwnership(db,{realmId:f.peer.realm}),writer=new SystemWriter(db,{realmId:f.peer.realm,authority}),services=new NativeGameServices(db.sqlite,{clock:()=>f.nowMs});writer.add('world_transition',createWorldTransitionHandler({services,authority,clock:()=>f.nowMs,assertFrozen:isolatedFrozen}));const ack=await writer.command(f.peer,request),after=capture(db.sqlite);assert.deepEqual(json(await writer.command(f.peer,request)),json(ack));assert.deepEqual(capture(db.sqlite),after);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_system_receipts').get().n,1);assert.equal(dungeonLifecycleDue(db.sqlite,f.nowMs),false);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_dungeon_finalizations').get().n,1);
  }finally{db.close();}
 }
});
