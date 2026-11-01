import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {native,temporary} from './helpers.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {setupPvp,put,update,json,response} from './pvp-fixture.mjs';
import {AttackMemory} from '../attack-memory.mjs';
import {MixedCombat} from '../mixed-combat.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {attackRandom,readAttackFrame,createAttackWriterHandler} from '../attack-writer.mjs';
import {createPvpWriterHandler,readPvpFrame} from '../pvp-writer.mjs';
import {writerSettlement} from '../combat-settlement.mjs';

async function setup(t){
 const s=await setupPvp(t);
 for(const [id,x]of [['black-mixed-a511',1050],['black-mixed-b511',1200]])put(s.sql,'monsters',{id,name:id,x,y:1000,hp:1000000,max_hp:1000000,area:'black',channel:1,spawn_round:1,respawn_at:0,variant:'normal',is_boss:0,despawn_at:0,is_stone:0,wave_stage:0,summoned:0,parent_stone_id:''});
 function reset(spec={}){
  const c=s.reset({...spec,ability:2,area:'black',extras:true,mixed:true});
  s.sql.exec('DELETE FROM monster_participants;DELETE FROM boss_participants;DELETE FROM normal_defeats;DELETE FROM sinsi_defeats;');
  for(const id of ['black-mixed-a511','black-mixed-b511'])update(s.sql,'monsters',id,{hp:1000000,is_stone:0,wave_stage:0,last_damaged_at_ms:0});
  for(const row of s.sql.prepare("SELECT * FROM monsters WHERE area='black' AND channel=1 AND hp>0").all())c.view.setMonster(row);
  const blocked=new Set(),attack=new AttackMemory({view:c.view,globals:s.globals,retaliate:()=>null,assertMonsterOwner:m=>m.channel===1,rankingEligible:()=>false,afk:()=>null,monsters:p=>[...c.view.monsters.values()].filter(m=>m.area===p.area),blocked:m=>blocked.has(m.id)});
  new MixedCombat({attack,pvp:c.memory,frameFor:id=>c.frames.get(id),party:id=>c.party.get(id),dragon:()=>false,blocked:id=>blocked.has(id),cycle:()=>1});
  const oldEvents=[],rng=attackRandom(s.seed);let rules;rules=createAttackRules({globals:s.globals,now:()=>s.nowMs,...rng,fourChannels:true,response,ports:{settlePveEngagement:()=>null,releasePvpCommit:()=>{},pvpContinuity:ctx=>rules.nativeContinuity(s.db,c.context.actionSnapshot,ctx),publishRealtimeRoomEvent:(...a)=>{oldEvents.push(a);},publishRealtimeRoomEventToChannels:(...a)=>{oldEvents.push(a);},publishRealtimePlayerEvent:(...a)=>{oldEvents.push(a);},deliverRealtime:v=>v}});
  const frame=rules.hydrateAttack(s.db,s.id,'black-mixed-a511');frame.player.pet_kind=null;
  const context={player:frame.player,playerId:s.id,settings:s.settings,payload:{action:'attack',targetId:'black-mixed-a511',spawnRound:1,ability:2,intentId:'mixed-pve511'},attackTargetId:'black-mixed-a511',preloadedAttackMonster:frame.monster,requestReceivedAtMs:s.nowMs,now:Math.floor(s.nowMs/1000),auth:{account:{id:frame.player.account_id}}};
  return {...c,attack,contextPve:context,oldEvents,rules,blocked};
 }
 return {...s,reset};
}
test('both primary target routes: original native mixed damage, events and complete rows equal SQL-free overlay',async t=>{
 const s=await setup(t);let cases=0;
 for(const role of ['avci','arkanist'])for(const primary of ['player','monster']){
  const c=s.reset({role}),memory=primary==='player'?c.memory:c.attack,context=primary==='player'?c.context:c.contextPve,prepare=s.sql.prepare;let actual;
  s.sql.prepare=()=>{throw Error('mixed hot SQL forbidden');};try{actual=memory.step(json(context),{...attackRandom(s.seed),nowMs:s.nowMs});}finally{s.sql.prepare=prepare;}
  assert.equal(actual.durable,false,role+'/'+primary);assert.equal(actual.result.status,200);assert.equal(actual.result.body.ok,true);
  const expected=await (primary==='player'?c.rules.nativePvp(s.db,json(context)):c.rules.nativeAttack(s.db,json(context)));
  assert.deepEqual(json(actual.result),json(expected),role+'/'+primary+' response');assert.deepEqual(json(actual.events),json(c.oldEvents),role+'/'+primary+' events');
  for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)),p.id);
  for(const m of c.view.monsters.values())assert.deepEqual(json(m),json(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(m.id)),m.id);
  assert.deepEqual(json(c.view.engagements.get(s.id)??null),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id)??null));
  assert.deepEqual(json(actual.changes.combatEvents),json(s.sql.prepare('SELECT player_id,target_id,role,ability,created_at FROM combat_events ORDER BY id').all()));cases++;
 }assert.equal(cases,4);
});
test('any late mixed terminal or locked target discards the entire cast and names every participant',async t=>{
 const s=await setup(t);
 for(const primary of ['player','monster'])for(const boundary of ['player','monster','stone','busy']){
  const c=s.reset(),target='black-mixed-b511';
  if(boundary==='player')c.view.setPlayer({...c.view.player('rival-extra'),hp:1});
  if(boundary==='monster'||boundary==='stone')c.view.setMonster({...c.view.monster(target),hp:boundary==='monster'?1:1000000,is_stone:Number(boundary==='stone')});
  if(boundary==='busy')c.blocked.add(target);
  const before=json({players:[...c.view.players],monsters:[...c.view.monsters],engagements:[...c.view.engagements]});
  const result=(primary==='player'?c.memory:c.attack).step(json(primary==='player'?c.context:c.contextPve),{...attackRandom(s.seed),nowMs:s.nowMs});
  if(boundary==='busy')assert.equal(result.deferred,true);else{assert.equal(result.durable,true);assert.deepEqual(new Set(result.boundary.players),new Set([s.id,s.targetId,'rival-extra']));assert.deepEqual(new Set(result.boundary.targets),new Set(['black-mixed-a511',target]));}
  assert.deepEqual(json({players:[...c.view.players],monsters:[...c.view.monsters],engagements:[...c.view.engagements]}),before);
 }
});

const capture=sql=>Object.fromEntries(['players','monsters','normal_defeats','monster_participants','boss_participants','pve_engagements','player_quest_progress','combat_events'].filter(table=>sql.prepare('SELECT 1 FROM sqlite_schema WHERE type=\'table\' AND name=?').get(table)).map(table=>[table,json(sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all())]));
test('mixed player death and monster XP/defeat commit together; native result and persisted rows match both entry routes',async t=>{
 const s=await setup(t);
 for(const primary of ['player','monster']){
  const c=s.reset({victim:{hp:1}});update(s.sql,'monsters','black-mixed-b511',{hp:1});
  const input=(primary==='player'?c.context:c.contextPve).payload;
  const expected=primary==='player'?{...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}:{...readAttackFrame(s.sql,s.id,input.targetId,s.globals),settings:s.settings};
  if(primary==='monster')expected.player.pet_kind=null;
  const payload={nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input,expected,resources:[s.id,s.targetId,'rival-extra'].map(id=>'player:'+id).concat(['black-mixed-a511','black-mixed-b511'].map(id=>'monster:'+id))};
  const oldContext=primary==='player'?{...c.context,actionSnapshot:expected}:{...c.contextPve,player:expected.player,preloadedAttackMonster:expected.monster};
  s.sql.exec('SAVEPOINT original_mixed');const result=await (primary==='player'?c.rules.nativePvp(s.db,json(oldContext)):c.rules.nativeAttack(s.db,json(oldContext)));const original=capture(s.sql);s.sql.exec('ROLLBACK TO original_mixed');s.sql.exec('RELEASE original_mixed');
  const options={settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,settleRetaliation:writerSettlement,clock:()=>s.nowMs};
  const handler=(primary==='player'?createPvpWriterHandler:createAttackWriterHandler)(options),context={actor:s.id,epoch:1,peer:{channel:1,incarnation:'mixed-parity'},key:'mixed-atomic'};
  const ack=await s.f.database.atomic(sql=>handler(sql,payload,context));
  assert.deepEqual(json(ack.result),json(result));assert.deepEqual(capture(s.sql),original);assert.equal(s.sql.prepare('SELECT hp,gems FROM players WHERE id=?').get(s.targetId).hp,0);assert.equal(s.sql.prepare('SELECT hp FROM monsters WHERE id=?').get('black-mixed-b511').hp,0);assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM normal_defeats WHERE monster_id=?').get('black-mixed-b511').n,1);
  assert.deepEqual(new Set(ack.players.map(p=>p.id)),new Set([s.id,s.targetId,'rival-extra']));assert.equal(ack.monsters.length,2);
 }
});

for(const primary of ['player','monster'])for(const phase of ['before','after'])test('mixed '+primary+' primary SIGKILL '+phase+' COMMIT retains one combined death/XP/receipt outcome',async t=>{
 const s=await setup(t),c=s.reset({victim:{hp:1}});update(s.sql,'monsters','black-mixed-b511',{hp:1});
 const authority=new ChannelOwnership(s.f.database,{realmId:'mixed-crash'});await authority.initialize();const peer={channel:1,incarnation:'mixed-surviving-channel'};await authority.registerProcess(1,peer.incarnation);
 const owner=await authority.admit(s.id,peer,{sessionId:'mixed-session',guard:()=>true}),input=(primary==='player'?c.context:c.contextPve).payload;
 const expected=primary==='player'?{...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}:{...readAttackFrame(s.sql,s.id,input.targetId,s.globals),settings:s.settings};
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'one-mixed-cast',operation:primary==='player'?'pvp_attack':'attack',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input,expected,resources:['player:'+s.id,'player:'+s.targetId,'player:rival-extra','monster:black-mixed-a511','monster:black-mixed-b511']}};
 const dir=temporary(t),file=path.join(dir,'mixed.sqlite'),data=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(data,JSON.stringify({request,peer,settings:s.settings}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'mixed-crash-fixture.mjs'),file,data,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_mixed':'durable_mixed_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts WHERE operation_id=?').get(request.operationId).n,Number(phase==='after'));
 assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM normal_defeats WHERE monster_id=?').get('black-mixed-b511').n,Number(phase==='after'));
 assert.equal(db.sqlite.prepare('SELECT hp FROM players WHERE id=?').get(s.targetId).hp,phase==='after'?0:1);
 const resumed=new ChannelOwnership(db,{realmId:'mixed-crash'});await resumed.initialize();const handler=(primary==='player'?createPvpWriterHandler:createAttackWriterHandler)({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(sql,p,id,epoch)=>Boolean(resumed.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true,settleRetaliation:writerSettlement,clock:()=>s.nowMs});registerOwnedRule(resumed,request.operation,handler);
 const a=await resumed.command(peer,request),saved=capture(db.sqlite),b=await resumed.command(peer,request);assert.deepEqual(json(a),json(b));assert.deepEqual(capture(db.sqlite),saved);assert.equal(resumed.owner(s.id).sequence,1);assert.equal(db.sqlite.prepare('SELECT hp,gems FROM players WHERE id=?').get(s.targetId).gems,950);assert.equal(db.sqlite.prepare('SELECT COUNT(*) n FROM normal_defeats WHERE monster_id=?').get('black-mixed-b511').n,1);
});
