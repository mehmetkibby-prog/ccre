import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE,hash} from './helpers.mjs';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {createRuneBossRules} from '../generated/rune-boss-rules.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {RuneBossMemory} from '../rune-boss-memory.mjs';
import {OperationRandom} from '../operation-random.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {NativeGameServices} from '../game-services.mjs';
import {ResidentServices} from '../resident-services.mjs';
import {readConfiguration} from '../read-configuration.mjs';
const file='vds-server/src/rune-v2-combat484.mjs',source=fs.readFileSync(path.join(BASE,file),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
// Independent original async implementation: only import/export wrappers and
// its UUID/global-service environment are supplied by this isolated oracle.
const makeOriginal=new Function('randomUUID','globalThis',ast.body.filter(n=>n.type!=='ImportDeclaration').map(n=>source.slice((n.declaration??n).start,n.end)).join('\n')+'\nreturn {run,views,wave:runeV2BossWave484};');
test('rune boss preserves pinned native timing/target code with SQL-free synchronous memory boundaries',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/rune-boss-proof.json',import.meta.url)));assert.equal(hash(source),proof.sourceSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/rune-boss-rules.mjs',import.meta.url))),proof.generatedSha256);for(const row of [...proof.slices,...proof.storageBoundaries])assert.equal(hash(source.slice(row.start,row.end)),row.sha256);assert(!/\b(?:await|SELECT|UPDATE|INSERT)\b/.test(createRuneBossRules().runMemory.toString()));
});
async function scenario(t,{channel=1}={}){
 const f=await setupPvp(t),{sql,id,targetId}=f,bossId='rune-v2-boss-c'+channel+'-1';let time=f.nowMs,writerTime=time,random;
 f.reset({area:'rune_v2',actor:{x:2240,y:700,hp:1000,max_hp:1000,gems:103},victim:{x:2240,y:850,hp:1000,max_hp:1000,gems:213}});for(const actor of [id,targetId])update(sql,'players',actor,{channel});sql.function('unixepoch',{varargs:true},(...args)=>args.includes('subsec')?writerTime/1000:Math.floor(writerTime/1000));
 if(channel===4&&!sql.prepare('SELECT 1 FROM monsters WHERE id=?').get(bossId)){const base={...sql.prepare("SELECT * FROM monsters WHERE id='rune-v2-boss-c1-1'").get(),id:bossId,channel};put(sql,'monsters',base);}
 update(sql,'monsters',bossId,{hp:26000,max_hp:26000,spawn_round:17,area:'rune_v2',channel,x:2240,y:680,is_boss:0,is_stone:0,summoned:0,stun_until_ms:0,root_until_ms:0,control_x:0,control_y:0,loadlab_run_id:''});
 sql.prepare('DELETE FROM rune_v2_boss_state484 WHERE id=?').run(bossId);
 const cfg=JSON.parse(sql.prepare('SELECT config_json FROM rune_v2_settings WHERE id=1').get().config_json);cfg.enabled=true;cfg.monsters.boss.damage=100;cfg.monsters.boss.waveDamage=120;sql.prepare('UPDATE rune_v2_settings SET config_json=?,revision=revision+1 WHERE id=1').run(JSON.stringify(cfg));
 const view=new AggroMemory({channel,cycle:1,now:()=>time}),owners=new Map([[id,true],[targetId,true]]);for(const actor of owners.keys())view.setPlayer(sql.prepare('SELECT * FROM players WHERE id=?').get(actor));view.setMonster(sql.prepare('SELECT * FROM monsters WHERE id=?').get(bossId));
 const db={...nativeAtomicStatements(sql),channel,owners,worldLoop:{enabled:true,activePlayers:owners.keys(),player:id=>sql.prepare('SELECT * FROM players WHERE id=?').get(id),monster:id=>sql.prepare('SELECT * FROM monsters WHERE id=?').get(id)}};
 // A reusable Set is essential: native worldLoop.activePlayers is not a
 // one-use iterator. Use the same admitted membership for each oracle step.
 db.worldLoop.activePlayers=new Set(owners.keys());
 let config;sql.exec('SAVEPOINT read_rune_config');try{config=readConfiguration(sql,{revision:1,nowMs:time});}finally{sql.exec('ROLLBACK TO read_rune_config;RELEASE read_rune_config');}
 const resident=new ResidentServices({config,player:id=>view.player(id),locked:()=>false,clock:()=>time}),nativeServices=new NativeGameServices(sql,{clock:()=>time}),rules=createRuneBossRules(),frames=new Map(),associated=new Set();
 const refreshFrames=()=>{frames.clear();for(const row of rules.readPlayers(db,[...owners.keys()],channel))frames.set(row.id,row);};refreshFrames();
 const memory=new RuneBossMemory({view,channel,owners,frameFor:id=>frames.get(id),associated:id=>associated.has(id),globals:resident.globals,settings:()=>f.settings,clock:()=>time,session:'rune-native-session511'});
 const original=makeOriginal(()=>random.uuid(),nativeServices.globals),originalState={session:memory.context.session,states:new Map()},originalCombat=createRetaliationRules({globals:nativeServices.globals,now:()=>time,random:()=>random.roll(),fourChannels:channel===4});let index=0;
 async function step(offset,{lag=0}={}){
  time=f.nowMs+offset;writerTime=time;const seed=(++index).toString(16).padStart(64,'0');random=new OperationRandom(seed);const events=[];
  if(channel===4){const extended=createRuneBossRules({globals:nativeServices.globals,uuid:()=>random.uuid()});await extended.runNative(db,originalState,{settings:f.settings,damage:originalCombat.runeBossDamage,cadence:originalCombat.pveAttackCadenceMs,position:originalCombat.monsterCombatPosition,publish:e=>events.push(e),nowMs:time,clock:()=>time+lag});original.views.clear();for(const [k,v]of extended.views)original.views.set(k,v);}
  else await original.run(db,originalState,{settings:f.settings,damage:originalCombat.runeBossDamage,cadence:originalCombat.pveAttackCadenceMs,position:originalCombat.monsterCombatPosition,publish:e=>events.push(e),nowMs:time,clock:()=>time+lag});
  const beforePlayers=new Map(view.players),beforeStates=new Map(memory.states),prepare=sql.prepare,exec=sql.exec;sql.prepare=()=>assert.fail('rune resident touched SQLite');sql.exec=()=>assert.fail('rune resident touched SQLite');const priorClock=memory.clock;memory.clock=()=>time+lag;let plan;try{plan=memory.plan(time,{seed});}finally{sql.prepare=prepare;sql.exec=exec;memory.clock=priorClock;}
  assert.deepEqual(view.players,beforePlayers,'planning never commits a player mutation');assert.deepEqual(memory.states,beforeStates,'planning never advances acknowledged AI state');
  assert.deepEqual(json(plan.events),json(events),'events step '+offset);assert.deepEqual(json([...plan.context.states]),json([...originalState.states]),'cache step '+offset);assert.deepEqual(json([...plan.views]),json([...original.views]),'wave projection step '+offset);
  const saved=sql.prepare('SELECT * FROM rune_v2_boss_state484 WHERE id=?').get(bossId)??null;assert.deepEqual(json(plan.states.get(bossId)??null),json(saved),'persistent state step '+offset);
  for(const actor of owners.keys()){const actual=plan.players.get(actor)??view.player(actor),expected=sql.prepare('SELECT * FROM players WHERE id=?').get(actor);assert.deepEqual(json(actual),json(expected),'player '+actor+' step '+offset);}
  memory.commit(plan);for(const p of plan.players.values())view.setPlayer(p);return plan;
 }
 // External scenario edits must include the original UPDATE triggers too.
 // In particular a position edit changes the native movement timestamp; a
 // wall-clock second boundary cannot leave the oracle and Map setup unequal.
 const player=(actor,patch)=>{update(sql,'players',actor,patch);view.setPlayer(sql.prepare('SELECT * FROM players WHERE id=?').get(actor));refreshFrames();};
 const boss=patch=>{update(sql,'monsters',bossId,patch);view.setMonster({...view.monster(bossId),...patch});};
 return {...f,view,bossId,frames,owners,memory,originalState,step,player,boss,associated,get time(){return time;}};
}
test('native rune basics, telegraph, impact, dodging, stun and life reset equal original SQL with resident SQL forbidden',async t=>{
 const f=await scenario(t);assert.equal((await f.step(0)).durable,true);assert.equal((await f.step(200)).operations.length,0);let plan=await f.step(2500);assert.equal(plan.durable,false);assert.equal(plan.events.length,1);
 plan=await f.step(12000);assert.deepEqual(plan.operations,['wave']);assert.equal(plan.views.get(1).phase,'telegraph');assert.equal((await f.step(12799)).events.length,0);
 f.player(f.targetId,{x:2500,y:680});plan=await f.step(12800);assert.equal(plan.events.length,1,'outer player dodges the projected wave');assert.equal(plan.events[0].ability,'rune_wave484');assert.equal(plan.durable,false);await f.step(13101);
 await f.step(24000);f.boss({stun_until_ms:f.nowMs+26000});plan=await f.step(24200);assert.deepEqual(plan.operations,['cancel']);assert.equal(plan.views.size,0);f.boss({stun_until_ms:0,spawn_round:18});plan=await f.step(25000);assert.deepEqual(plan.operations,['initialize']);assert.equal(plan.events.length,0);
});
test('native rune wave delivery grace, expired casts and lethal gem penalty preserve original results without early memory commit',async t=>{
 const f=await scenario(t);await f.step(0);let plan=await f.step(12000,{lag:301});assert.deepEqual(plan.operations,['wave','cancel']);assert.equal(plan.events.length,0);assert.equal(plan.views.size,0);
 await f.step(24000);plan=await f.step(25101);assert.deepEqual(plan.operations,['cancel']);assert.equal(plan.events.length,0);
 f.player(f.id,{hp:1,gems:103});plan=await f.step(28000);assert.equal(plan.durable,true);assert.equal(plan.events[0].dead,true);assert.equal(plan.players.get(f.id).gems,98);assert.equal(plan.players.get(f.id).respawn_at_ms,f.nowMs+30600);
});
test('native rune candidate lab/GM/session exclusions and channel4 use the same guarded clock and damage',async t=>{
 const f=await scenario(t);await f.step(0);f.player(f.id,{is_gm:1});f.player(f.targetId,{loadlab_run_id:'excluded-rune-lab'});let plan=await f.step(2500);assert.equal(plan.events.length,0);f.player(f.id,{is_gm:0});f.player(f.targetId,{loadlab_run_id:''});plan=await f.step(2600);assert.equal(plan.events.length,1);f.owners.delete(f.id);f.originalState.states.clear();f.memory.context.states.clear();await f.step(3000);
 const c4=await scenario(t,{channel:4});await c4.step(0);plan=await c4.step(2500);assert.equal(plan.events.length,1);assert.equal(plan.events[0].channel,4);await c4.step(12000);plan=await c4.step(12800);assert(plan.events.every(e=>e.channel===4));
});
