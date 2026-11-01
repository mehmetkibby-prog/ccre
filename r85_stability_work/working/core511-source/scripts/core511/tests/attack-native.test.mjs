import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {BASE,SHA,native,seeded,hash} from './helpers.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {createAttackWriterRules} from '../generated/attack-writer-rules.mjs';
import {AttackMemory} from '../attack-memory.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {CombatControls} from '../combat-controls.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
import {nativeAtomicStatements} from '../retaliation-writer.mjs';
import {createAttackWriterHandler,readAttackFrame,attackRandom,createMonsterRewardHandler} from '../attack-writer.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {until} from './helpers.mjs';
import {temporary} from './helpers.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {AttackLoop} from '../attack-loop.mjs';
import {ActorCheckpoints,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {EncounterCheckpoints} from '../encounter-checkpoint.mjs';
import {CombatCheckpoints,createCombatCheckpointHandler} from '../combat-checkpoint.mjs';
import {residentSettlement,writerSettlement} from '../combat-settlement.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {readRetaliationFrame} from '../retaliation-writer.mjs';
import {SupportMemory} from '../support-memory.mjs';
import {AdventureService} from '../adventure-service.mjs';
import {createAdventureSchema} from '../adventure-schema.mjs';
process.env.COL_NATIVE_TEST_ROOT=BASE;process.env.COL_NATIVE_TEST_MANIFEST_SHA256=SHA;
const {fixture}=await import('../../perf-r11/tests/reward/fixture.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
const json=x=>JSON.parse(JSON.stringify(x));
const response={json:(body,{status=200}={})=>({body,status})};
const uuidFactory=()=>{let n=0;return()=>String(++n);};
const update=(sql,table,id,row)=>sql.prepare('UPDATE '+table+' SET '+Object.keys(row).map(k=>k+'=?').join(',')+' WHERE id=?').run(...Object.values(row),id);
const put=(sql,table,row)=>sql.prepare('INSERT INTO '+table+'('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row));
async function setup(t){
 const f=await fixture();t.after(()=>f.close());installRegistry({now:()=>100000});const sql=f.database.sqlite,db=nativeAtomicStatements(sql),nowMs=100000,id='real-1',mid='golge-attack511';
 const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()},globals={};
 createAdventureSchema(sql);globals.__colAdventure=new AdventureService(sql,{now:()=>nowMs,random:seeded(71),uuid:uuidFactory(),globals});
 put(sql,'monsters',{id:mid,name:'Attack parity',x:100,y:100,hp:1000000,max_hp:1000000,respawn_at:0,variant:'normal',is_boss:0,despawn_at:0,spawn_round:1,area:'forest',channel:1,is_stone:0,wave_stage:0,summoned:0,parent_stone_id:''});
 function reset({role='avci',area='forest',hp=1000000,ability=0,patch={}}={}){
  sql.exec('DELETE FROM pve_engagements;DELETE FROM combat_events;DELETE FROM monster_participants;DELETE FROM boss_participants;');
  update(sql,'players',id,{x:100,y:100,area,channel:1,hp:800,max_hp:1000,hp_revision:0,role,level:40,skill_one:5,skill_two:5,skill_three:5,skill_four:5,rod_equipped:0,last_seen:100,attack_one_at:0,attack_two_at:0,attack_three_at:0,attack_four_at:0,stun_until_ms:0,root_until_ms:0,combat_lock_until_ms:0,...patch});
  update(sql,'monsters',mid,{hp,max_hp:1000000,area,channel:1,x:100,y:100,is_boss:0,is_stone:0,wave_stage:0,stun_until_ms:0,root_until_ms:0,control_x:0,control_y:0});
  const oldEvents=[],random=seeded(192+ability),rules=createAttackRules({globals,now:()=>nowMs,random,uuid:uuidFactory(),response,ports:{settlePveEngagement:()=>null,publishRealtimeRoomEvent:(...a)=>oldEvents.push(a),publishRealtimeRoomEventToChannels:(...a)=>oldEvents.push(a),deliverRealtime:v=>v}});
  const frame=rules.hydrateAttack(db,id,mid),player=sql.prepare('SELECT * FROM players WHERE id=?').get(id),monster=sql.prepare('SELECT * FROM monsters WHERE id=?').get(mid),view=new AggroMemory({channel:1,cycle:1,now:()=>nowMs});
  view.setPlayer(player);view.setMonster(monster);
  const memory=new AttackMemory({view,globals,retaliate:()=>null,assertMonsterOwner:m=>m.channel===1,rankingEligible:()=>false,afk:()=>null,monsters:()=>[...view.monsters.values()]});
  const context={player:{...frame.player,pet_kind:null},playerId:id,settings,payload:{action:'attack',targetId:mid,spawnRound:1,ability,intentId:'test-'+ability},attackTargetId:mid,preloadedAttackMonster:frame.monster,requestReceivedAtMs:nowMs,now:100,auth:{account:{id:player.account_id}}};
  const oracle=Object.create(db);oracle.combat={enabled:true};oracle.combatHit=(guard,plans)=>{const accepted=guard.first();if(!accepted)return {guard:{results:[]},results:[]};for(const plan of plans)if(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(plan.target.id)?.hp<=plan.rolled)plan.prepareDurable();return {guard:{results:[accepted]},results:plans.flatMap(plan=>db.batch(plan.hitStatements))};};oracle.combatBatch=s=>db.batch(s);
  return {context,view,memory,rules,oldEvents,oracle,player,monster};
 }
 return {f,sql,db,settings,globals,id,mid,nowMs,reset};
}
test('outgoing native branch and writer have pinned provenance; memory has no SQL boundary',()=>{
 const p=JSON.parse(fs.readFileSync(new URL('../generated/attack-proof.json',import.meta.url)));
 assert.equal(hash(fs.readFileSync(new URL('../generated/attack-rules.mjs',import.meta.url))),p.generatedSha256);assert.equal(hash(fs.readFileSync(new URL('../generated/attack-writer-rules.mjs',import.meta.url))),p.writerSha256);
 assert.equal(hash(fs.readFileSync(new URL('../adapt-adventure-attack.mjs',import.meta.url))),p.adventureAdapterSha256);
 const rules=createAttackRules({globals:{}});assert(!/\b(database|await|async)\b/.test(rules.memoryAttack.toString()));assert(!/\b(database|await|async)\b/.test(rules.guardianMemory.toString()));
});
test('normal attacks and skill1/2 damage, cooldown, participants and control equal native SQLite',async t=>{
 const s=await setup(t);let exercised=0;
 for(const role of ['avci','arkanist','muhafiz'])for(const ability of [0,1,2]){
  const c=s.reset({role,ability}),actual=c.memory.step(c.context,{random:seeded(192+ability),uuid:uuidFactory(),nowMs:s.nowMs});assert.equal(actual.durable,false);
  const expected=await c.rules.nativeAttack(c.oracle,json(c.context));assert.deepEqual(json(actual.result),json(expected),role+'/'+ability);assert.deepEqual(json(actual.events),json(c.oldEvents));
  assert.deepEqual(json(c.view.player(s.id)),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id)),role+'/'+ability+' player');
  assert.deepEqual(json(c.view.monster(s.mid)),json(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.mid)),role+'/'+ability+' monster');
  assert.deepEqual(json(c.view.engagements.get(s.id)??null),json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id)??null));
  const participant=[...c.memory.participants.values()][0],saved=s.sql.prepare('SELECT * FROM monster_participants WHERE player_id=?').get(s.id);for(const k of Object.keys(participant))assert.equal(participant[k],saved[k]);
  assert.equal(actual.result.body.hits.length,1);exercised++;
 }assert.equal(exercised,9);
});

test('staged native shared proposal promotes the actor once without overwriting a newer shared life or its counters',async t=>{
 const s=await setup(t),c=s.reset();c.memory.assertMonsterOwner=m=>m.channel===0;c.view.setMonster({...c.monster,channel:0,is_boss:1});const row=c.view.monster(s.mid);c.context.preloadedAttackMonster={...c.context.preloadedAttackMonster,channel:0,is_boss:1};
 const player=c.view.player(s.id),proposal=c.memory.plan(c.context,{...attackRandom('4'.repeat(64)),nowMs:s.nowMs});assert.equal(proposal.durable,false);assert.equal(c.view.player(s.id),player);assert.equal(c.view.monster(s.mid),row);assert.equal(c.memory.participants.size,0);
 const newer={...row,spawn_round:2,hp:123};c.view.setMonster(newer);c.view.setPlayer({...player,last_seen:player.last_seen+1});c.memory.commit(proposal,{sharedIds:new Set([s.mid])});assert.deepEqual(c.view.monster(s.mid),newer);assert(c.view.player(s.id).attack_one_at>player.attack_one_at);assert.equal(c.view.player(s.id).last_seen,player.last_seen+1);assert.equal(c.memory.participants.size,0);assert.equal(c.memory.bossParticipants.size,0);assert.throws(()=>c.memory.commit(proposal,{sharedIds:new Set([s.mid])}),/attack_proposal_fenced/);
});
test('specialist burst/root and multi-target attacks equal native SQLite with SQL disabled in memory',async t=>{
 const s=await setup(t);
 for(const [role,specialization]of [['avci','avci_sharp'],['avci','avci_trap'],['arkanist','arkanist_burst'],['muhafiz','muhafiz_strike']]){
  const c=s.reset({role,ability:3,patch:{specialization}}),prepare=s.sql.prepare;s.sql.prepare=()=>{throw Error('hot attack SQL forbidden');};let actual;
  try{actual=c.memory.step(c.context,{random:seeded(195),uuid:uuidFactory(),nowMs:s.nowMs});}finally{s.sql.prepare=prepare;}
  const expected=await c.rules.nativeAttack(c.oracle,json(c.context));assert.deepEqual(json(actual.result),json(expected),specialization);assert.deepEqual(json(c.view.monster(s.mid)),json(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.mid)),specialization);assert.equal(actual.result.body.hits.length,1);
 }
 const c=s.reset({role:'avci',ability:2}),other={...c.monster,id:'golge-second511',x:200};put(s.sql,'monsters',other);c.view.setMonster(other);c.oracle.combat.syncEntity=()=>{};
 const actual=c.memory.step(c.context,{random:seeded(194),uuid:uuidFactory(),nowMs:s.nowMs}),expected=await c.rules.nativeAttack(c.oracle,json(c.context));
 assert.deepEqual(json(actual.result),json(expected));assert.equal(actual.result.body.hits.length,2);for(const m of c.view.monsters.values())assert.deepEqual(json(m),json(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(m.id)));
});
test('preflight rejections preserve native cadence, stun, scope and stale-spawn results',async t=>{
 const s=await setup(t);
 for(const patch of [{stun_until_ms:100001},{attack_one_at:100999},{rod_equipped:1}]){
  const c=s.reset({patch}),actual=c.memory.step(c.context,{random:seeded(192),uuid:uuidFactory(),nowMs:s.nowMs}),expected=await c.rules.nativeAttack(c.oracle,json(c.context));
  assert.deepEqual(json(actual.result),json(expected));assert.deepEqual(json(actual.events),json(c.oldEvents));assert.equal(c.memory.participants.size,0);
 }
 for(const round of [0,3,-1]){const c=s.reset();c.context.payload.spawnRound=round;const actual=c.memory.step(c.context,{nowMs:s.nowMs}),expected=await c.rules.nativeAttack(c.oracle,json(c.context));assert.deepEqual(json(actual.result),json(expected));assert.equal(c.memory.participants.size,0);}
});
test('lethal and stone-wave boundaries leave all resident state unpublished',async t=>{
 const s=await setup(t),c=s.reset({hp:1}),before=json(c.view.player(s.id)),monster=json(c.view.monster(s.mid));
 const actual=c.memory.step(c.context,{random:seeded(192),nowMs:s.nowMs});assert.equal(actual.durable,true);assert.equal(actual.boundary.reason,'defeat');
 assert.deepEqual(json(c.view.player(s.id)),before);assert.deepEqual(json(c.view.monster(s.mid)),monster);assert.equal(c.memory.participants.size,0);assert.equal(c.memory.combatEvents.length,0);
});
test('resource leases fence shared targets until known commit reconciliation',()=>{
 const lanes=new ResourceLanes(),a=lanes.acquire(['player:a','monster:shared'],'c1:boot1');assert(a);assert.equal(lanes.acquire(['player:b','monster:shared'],'c2:boot1'),null);
 lanes.fence(a);assert.throws(()=>lanes.release(a),/resource_lease_fenced/);assert.equal(lanes.acquire(['monster:shared'],'c2:boot1'),null);
 assert.throws(()=>lanes.reconcile(a,{owner:'c1:boot2',committed:true}),/resource_reconciliation_required/);lanes.reconcile(a,{owner:'c1:boot1',committed:true});assert(lanes.acquire(['monster:shared'],'c2:boot1'));
});
test('native kill XP/death receipt waits for fsync, replays once, and later hits cannot kill twice',async t=>{
 const s=await setup(t),c=s.reset({hp:1});const originalXp=s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp;
 const authority=new ChannelOwnership(s.f.database,{realmId:'attack'});await authority.initialize();const peer={channel:1,incarnation:'attack-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'attack-session',guard:()=>true});
 const handler=createAttackWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(db,p,id,epoch)=>Boolean(authority.assertAdmitted(db,p,id,epoch)),assertResources:()=>true,settleRetaliation:()=>null,clock:()=>s.nowMs});registerOwnedRule(authority,'attack',handler);
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed(s.id,owner.epoch,0);
 const frame=readAttackFrame(s.sql,s.id,s.mid,s.globals),payload={nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:'1'.repeat(64),input:c.context.payload,expected:{...frame,settings:s.settings}};
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const held=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 let returned=false;const event={actor:s.id,key:'first-death',kind:'attack',payload};const pending=client.submit(event).then(ack=>{returned=true;return ack;});await until(()=>s.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(s.mid).hp===0);
 assert.equal(returned,false);assert.equal(c.view.monster(s.mid).hp,1);assert.equal(s.sql.prepare('SELECT COUNT(*) AS n FROM normal_defeats WHERE monster_id=?').get(s.mid).n,1);
 release();const ack=await pending;s.f.database.durableAfterCommit=durable;
 assert.equal(ack.result.result.body.hits[0].killed,true);assert(s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp>originalXp);const xp=s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp;
 const replay=await authority.command(peer,{playerId:s.id,epoch:owner.epoch,sequence:1,operationId:event.key,operation:event.kind,payload});assert.deepEqual(json(replay),json(ack));assert.equal(s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp,xp);
 const fresh=readAttackFrame(s.sql,s.id,s.mid,s.globals);const second=await client.submit({actor:s.id,key:'second-hit',kind:'attack',payload:{...payload,expected:{...fresh,settings:s.settings}}});assert.equal(second.result.result.body.xp,0);assert.equal(second.result.result.body.hits.length,0);assert.equal(s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp,xp);
 registerOwnedRule(authority,'monster_reward',createMonsterRewardHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertResources:()=>true,clock:()=>s.nowMs}));
 const rewardEvent={actor:s.id,key:'normal-loot-once',kind:'monster_reward',payload:{nowMs:s.nowMs,seed:'2'.repeat(64),kind:'normal',monsterId:s.mid,spawnRound:1}},reward=await client.submit(rewardEvent);
 assert.equal(reward.result.result.awarded,true);assert.equal(s.sql.prepare('SELECT count(*) n FROM normal_reward_claims WHERE monster_id=?').get(s.mid).n,1);assert(s.sql.prepare('SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=?').get(s.mid).rewards_completed_at>0);
 const drops=json(s.sql.prepare('SELECT * FROM world_drops').all()),replayReward=await authority.command(peer,{playerId:s.id,epoch:owner.epoch,sequence:3,operationId:rewardEvent.key,operation:rewardEvent.kind,payload:rewardEvent.payload});assert.deepEqual(json(replayReward),json(reward));assert.deepEqual(json(s.sql.prepare('SELECT * FROM world_drops').all()),drops);assert.equal(s.sql.prepare('SELECT xp FROM players WHERE id=?').get(s.id).xp,xp);
});
test('seeded native attack/death/XP/level/quest and deferred loot remain byte-equivalent',async t=>{
 const s=await setup(t);s.globals.__colQuests438={enabled:true};const c=s.reset({hp:1,patch:{level:1,xp:95}});
 const tables=['players','monsters','combat_events','monster_participants','normal_defeats','monster_xp_claims','normal_reward_claims','world_drops'];
 const snapshot=()=>Object.fromEntries(tables.map(table=>[table,json(s.sql.prepare('SELECT * FROM '+table+' ORDER BY 1,2').all())]));
 const eventSeed='5'.repeat(64),rewardSeed='6'.repeat(64),oldEvents=[],ports={settlePveEngagement:()=>null,publishRealtimeRoomEvent:(...a)=>oldEvents.push(a),publishRealtimeRoomEventToChannels:(...a)=>oldEvents.push(a),deliverRealtime:v=>v,runRewardDelivery:(_,key,fn)=>fn()};
 const original=createAttackRules({...attackRandom(eventSeed),globals:s.globals,now:()=>s.nowMs,response,ports});
 s.sql.exec('SAVEPOINT native_oracle');const nativeResult=await original.nativeAttack(s.db,json(c.context)),nativeKill=snapshot();
 const originalReward=createAttackRules({...attackRandom(rewardSeed),globals:s.globals,now:()=>s.nowMs,response,ports});const rewardResult=await originalReward.awardPendingNormalRewards(s.db,s.settings,100,{id:s.mid,spawn_round:1});const nativeLoot=snapshot();s.sql.exec('ROLLBACK TO native_oracle;RELEASE native_oracle');
 const attack=createAttackWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,settleRetaliation:()=>null,clock:()=>s.nowMs});
 const actual=await s.f.database.atomic(db=>attack(db,{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:eventSeed,input:c.context.payload,expected:{...readAttackFrame(db,s.id,s.mid,s.globals),settings:s.settings}},{actor:s.id,peer:{channel:1},epoch:1}));
 assert.deepEqual(json(actual.result),json(nativeResult));assert.deepEqual(snapshot(),nativeKill);const player=s.sql.prepare('SELECT xp,level,quest_kills438 FROM players WHERE id=?').get(s.id);assert(player.xp>95);assert(player.level>1);assert.equal(player.quest_kills438,1);
 const reward=createMonsterRewardHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertResources:()=>true,clock:()=>s.nowMs}),loot=await s.f.database.atomic(db=>reward(db,{nowMs:s.nowMs,seed:rewardSeed,kind:'normal',monsterId:s.mid,spawnRound:1},{actor:s.id}));assert.deepEqual(json(loot.result),json(rewardResult));assert.deepEqual(snapshot(),nativeLoot);
});
test('channel4 rune boss preserves native winner and normal-quest exclusion guards',async t=>{
 const s=await setup(t),c=s.reset(),id='rune-v2-boss-c4-1',monster={...c.monster,id,area:'rune_v2',channel:4,hp:1,is_boss:0};put(s.sql,'monsters',monster);update(s.sql,'players',s.id,{is_gm:0,loadlab_run_id:'',channel:4,area:'rune_v2',gems:100});
 put(s.sql,'monster_participants',{monster_id:id,spawn_round:1,player_id:s.id,created_at:100,stone_damage476:500,stone_first_hit_at_ms476:10000});
 put(s.sql,'normal_defeats',{monster_id:id,spawn_round:1,defeated_at:100,x:100,y:100,xp_reward:0,essence_min:0,essence_span:0,loot_profile_json:JSON.stringify({runeV2Boss:{topDamageGems:250,revision:3}}),events_snapshot:'{}'});
 const old=createAttackWriterRules({globals:s.globals}),rules=createAttackWriterRules({globals:s.globals,fourChannels:true,uuid:uuidFactory()});
 assert.equal(old.prepareRuneV2Winner483(s.db,monster,1,s.nowMs).length,0);assert.equal(rules.questMonsterEligible438(monster),false);
 const statements=rules.prepareRuneV2Winner483(s.db,monster,1,s.nowMs);assert.equal(statements.length,3);await s.f.database.atomic(()=>s.db.batch(statements));assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,350);
 await s.f.database.atomic(()=>s.db.batch(rules.prepareRuneV2Winner483(s.db,monster,1,s.nowMs)));assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,350);
 assert.equal(s.sql.prepare('SELECT count(*) n FROM rune_v2_boss_winner_claims483 WHERE monster_id=?').get(id).n,1);
});
test('due multi-monster retaliation precedes outgoing attack with identical seeded results',async t=>{
 const s=await setup(t),retal=createRetaliationRules({globals:s.globals,now:()=>s.nowMs});
 for(const hp of [5000,1]){
  const c=s.reset({hp:100000,patch:{hp,max_hp:5000}}),extra={...c.monster,id:'curuk-due511'};
  s.sql.prepare('DELETE FROM monsters WHERE id=?').run(extra.id);put(s.sql,'monsters',extra);c.view.setMonster(extra);
  for(const target of [c.monster,extra])s.db.batch(retal.preparePveEngagement(s.db,c.player,target,s.nowMs-5000));
  const row=s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id);c.view.setEngagement(s.id,row);
  const admission=readRetaliationFrame(s.sql,s.id,[{monster_id:s.mid},{monster_id:extra.id}]);
  const frameFor=(id,entries,view)=>({player:Object.fromEntries(Object.keys(admission.player).map(k=>[k,Object.hasOwn(view.player(id),k)?view.player(id)[k]:admission.player[k]])),monsters489:{results:entries.map(e=>{const cached=admission.monsters.find(m=>m.id===e.monster_id),live=view.monster(e.monster_id);return cached&&live?Object.fromEntries(Object.keys(cached).map(k=>[k,Object.hasOwn(live,k)?live[k]:cached[k]])):null;}).filter(Boolean)},armorItems:admission.armorItems});
  c.memory.retaliate=residentSettlement({globals:s.globals,frameFor});const seed='7'.repeat(64),oldEvents=[],rng=attackRandom(seed);
  const nativeRetaliation=createRetaliationRules({globals:s.globals,random:rng.random,now:()=>s.nowMs,publish:(...args)=>oldEvents.push(args)});
  const nativeRules=createAttackRules({...rng,globals:s.globals,now:()=>s.nowMs,response,ports:{settlePveEngagement:()=>nativeRetaliation.settleAllNative(s.db,s.id,s.settings,s.nowMs),publishRealtimeRoomEvent:(...args)=>oldEvents.push(args),publishRealtimeRoomEventToChannels:(...args)=>oldEvents.push(args),deliverRealtime:v=>v}});
  const actual=c.memory.step(c.context,{...attackRandom(seed),nowMs:s.nowMs});assert.equal(actual.durable,hp===1);
  s.sql.exec('SAVEPOINT combined_oracle');const expected=await nativeRules.nativeAttack(c.oracle,json(c.context)),savedPlayer=json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id)),savedEncounter=json(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id)??null);s.sql.exec('ROLLBACK TO combined_oracle;RELEASE combined_oracle');
  if(hp>1){assert.deepEqual(json(actual.result),json(expected));assert.deepEqual(json(actual.events),json(oldEvents));assert.deepEqual(json(c.view.player(s.id)),savedPlayer);assert.deepEqual(json(c.view.engagements.get(s.id)),savedEncounter);assert(actual.result.body.pveHit.damage>0);}
  else{
   assert.equal(c.view.player(s.id).hp,1);assert.equal(actual.boundary.reason,'retaliation_death');
   const handler=createAttackWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,settleRetaliation:writerSettlement,clock:()=>s.nowMs});
   const committed=await s.f.database.atomic(db=>handler(db,{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed,input:c.context.payload,expected:{...readAttackFrame(db,s.id,s.mid,s.globals),settings:s.settings}},{actor:s.id}));
   assert.deepEqual(json(committed.result),json(expected));assert.deepEqual(json(committed.events),json(oldEvents));assert.deepEqual(json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id)),savedPlayer);assert.equal(s.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(s.mid).hp,100000);assert.equal(s.sql.prepare('SELECT count(*) n FROM monster_xp_claims WHERE monster_id=?').get(s.mid).n,0);
  }
 }
});
test('support healing/guard preserve party range, five-target limit, cooldown and stun predicates',async t=>{
 const s=await setup(t);put(s.sql,'parties',{id:'support-party',leader_id:s.id,created_at:100});put(s.sql,'party_members',{player_id:s.id,party_id:'support-party',joined_at:100});
 for(let n=0;n<9;n++){const id='support-'+n;put(s.sql,'players',{id,name:id,role:'avci',channel:1,area:'forest',x:120+n*10,y:100,hp:200,max_hp:1000,level:40,last_seen:100,created_at:100});put(s.sql,'party_members',{player_id:id,party_id:'support-party',joined_at:100});}
 for(const [role,specialization,patch]of [['arkanist','arkanist_heal',{}],['muhafiz','muhafiz_tank',{}],['arkanist','arkanist_heal',{stun_until_ms:100001}],['arkanist','arkanist_heal',{attack_four_at:100001}]]){
  const c=s.reset({role,patch:{specialization,...patch}}),rows=new Map(s.sql.prepare('SELECT * FROM players').all().map(p=>[p.id,{...p}])),oldEvents=[],events=[];
  const membership=new Map(s.sql.prepare('SELECT * FROM party_members').all().map(p=>[p.player_id,p.party_id]));
  const port=new SupportMemory({player:id=>rows.get(id),players:()=>[...rows.values()],setPlayer:p=>rows.set(p.id,p),party:id=>membership.get(id),arena:()=>null,team:()=>null});
  const args={globals:s.globals,now:()=>s.nowMs,response},rules=createAttackRules({...args,ports:{publishRealtimeRoomEvent:(...a)=>events.push(a),deliverRealtime:v=>v}}),original=createAttackRules({...args,ports:{publishRealtimeRoomEvent:(...a)=>oldEvents.push(a),deliverRealtime:v=>v}});
  const db=Object.create(s.db);db.guardedBatch=(guard,statements)=>{const r=s.db.batch([guard])[0];return {guard:r,results:r.results.length?s.db.batch(statements):[]};};
  const actual=rules.supportMemory(port,c.context.player,s.settings,{},s.nowMs),expected=await original.colSupportCast456(db,c.context.player,s.settings,{},s.nowMs);
  assert.deepEqual(json(actual),json(expected));assert.deepEqual(json(events),json(oldEvents));for(const p of rows.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)));
  if(specialization==='arkanist_heal'&&!Object.keys(patch).length){assert.equal(actual.body.specialEffect.targets.length,5);assert.deepEqual(actual.body.specialEffect.targets.map(p=>p.id),[s.id,'support-0','support-1','support-2','support-3']);}
 }
});
test('native guardian free dash movement and rejection match resident controls',async t=>{
 const s=await setup(t);
 for(const patch of [{},{root_until_ms:100001},{stun_until_ms:100001},{rod_equipped:1},{attack_three_at:100001}]){
  const c=s.reset({role:'muhafiz',patch}),rows=new Map([[s.id,{...c.player}]]),port=new CombatControls({player:id=>rows.get(id),monster:()=>null,setPlayer:p=>rows.set(p.id,p),setMonster:()=>{throw Error('dash touched monster');}});
  const options={globals:s.globals,now:()=>s.nowMs,uuid:uuidFactory()},rules=createAttackRules(options),original=createAttackRules({...options,uuid:uuidFactory()}),direction={x:1,y:.2};
  const actual=rules.dashMemory(port,c.context.player,direction,s.nowMs,5000),expected=await original.dashGuardian(s.db,c.context.player,direction,s.nowMs,5000);
  assert.deepEqual(json(actual),json(expected));assert.deepEqual(json(rows.get(s.id)),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id)));
 }
});
test('caught native batch failure cannot commit a partial reward or cooldown',async t=>{
 const s=await setup(t);const before=s.sql.prepare('SELECT gems,attack_four_at FROM players WHERE id=?').get(s.id);
 await s.f.database.atomic(()=>{
  assert.throws(()=>s.db.batch([s.db.prepare('UPDATE players SET gems=gems+100 WHERE id=?').bind(s.id),s.db.prepare('INSERT INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,?,?,?,?)').bind('missing',1,null,'bad',100)]));
  assert.throws(()=>s.db.guardedBatch(s.db.prepare('UPDATE players SET attack_four_at=999999 WHERE id=? RETURNING id').bind(s.id),[s.db.prepare('INSERT INTO monster_xp_claims(monster_id,spawn_round,player_id,claim_token,awarded_at) VALUES(?,?,?,?,?)').bind('missing',1,null,'bad',100)]));
  s.sql.prepare('UPDATE players SET last_seen=101 WHERE id=?').run(s.id);
 });
 assert.deepEqual(s.sql.prepare('SELECT gems,attack_four_at FROM players WHERE id=?').get(s.id),before);assert.equal(s.sql.prepare('SELECT last_seen FROM players WHERE id=?').get(s.id).last_seen,101);
});
test('20 Hz attack loop drains real resident hits and participant credits before durable kill',async t=>{
 const s=await setup(t),c=s.reset({hp:900});s.settings.hunter_base_attack=150;
 const authority=new ChannelOwnership(s.f.database,{realmId:'attack-loop'});await authority.initialize();const peer={channel:1,incarnation:'attack-loop-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'loop-session',guard:()=>true});
 const state=new ResidentState(1);state.put('players',{...c.view.player(s.id),cycle:1});state.claim(s.id,owner.epoch);
 const lanes=new ResourceLanes();let time=s.nowMs,bridge;const events=[];
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler());registerOwnedRule(authority,'combat_checkpoint',createCombatCheckpointHandler({assertResources:()=>true}));
 registerOwnedRule(authority,'attack',createAttackWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(db,p,id,epoch)=>Boolean(authority.assertAdmitted(db,p,id,epoch)),assertResources:()=>lanes.busy(['monster:'+s.mid]),settleRetaliation:()=>null,clock:()=>time}));
 const client=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});client.seed(s.id,owner.epoch,0);
 const encounters=new EncounterCheckpoints(id=>c.view.engagements.get(id)??null);encounters.hydrate(s.id,null);
 const checkpoints=new ActorCheckpoints({state,encounters,submit:e=>client.submit(e),clock:()=>time});checkpoints.hydrate(c.view.player(s.id));
 const journal=new CombatCheckpoints({submit:e=>client.submit(e),actor:()=>s.id,clock:()=>time});journal.hydrate('monsters',[c.monster]);
 c.memory.changed=changes=>{for(const row of changes.players)state.put('players',{...row,cycle:1});journal.changed(changes);};
 const frameFor=(id,input,now)=>({...c.context,payload:input,requestReceivedAtMs:now,now:Math.floor(now/1000),player:Object.fromEntries(Object.keys(c.context.player).map(k=>[k,Object.hasOwn(c.view.player(id),k)?c.view.player(id)[k]:c.context.player[k]])),preloadedAttackMonster:Object.fromEntries(Object.keys(c.context.preloadedAttackMonster).map(k=>[k,c.view.monster(s.mid)[k]]))});
 bridge=new AttackLoop({memory:c.memory,lanes,checkpoints,combatCheckpoints:journal,submit:e=>client.submit(e),frameFor,affectedActors:()=>[],publish:(...args)=>events.push(args),committed:r=>{for(const p of r.players){c.view.setPlayer(p);state.put('players',{...p,cycle:1});}for(const m of r.monsters)c.view.setMonster(m);c.view.setEngagement(s.id,r.engagement);}});
 const packets=[],kernel=new FixedLoop({state,wall:()=>time,send:(id,p)=>packets.push(p),rules:{movement:()=>({ok:true}),combat:ctx=>bridge.attack(ctx),ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>({results,lastApplied})}});t.after(()=>kernel.stop());kernel.admit(s.id,owner.epoch);kernel.stopped=false;
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const held=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 let sequence=0;for(;sequence<15&&!kernel.players.get(s.id).barrier;){time+=1000;kernel.enqueue(s.id,{sequence:++sequence,epoch:owner.epoch,kind:'combat',payload:c.context.payload});kernel.tick();}
 assert(sequence>1&&sequence<15);const pending=kernel.players.get(s.id).barrier;assert(pending);assert(c.view.monster(s.mid).hp>0);assert.equal(lanes.busy(['monster:'+s.mid]),true);
 assert.equal(kernel.players.get(s.id).lastApplied,sequence-1);release();await pending;await Promise.resolve();s.f.database.durableAfterCommit=durable;
 assert.equal(kernel.failure,null);assert.equal(c.view.monster(s.mid).hp,0);assert.equal(s.sql.prepare('SELECT hp FROM monsters WHERE id=?').get(s.mid).hp,0);assert.equal(lanes.busy(['monster:'+s.mid]),false);assert.equal(encounters.changed(s.id),false);
 assert.equal(s.sql.prepare('SELECT count(*) n FROM monster_xp_claims WHERE monster_id=?').get(s.mid).n,1);assert.equal(s.sql.prepare('SELECT count(*) n FROM combat_events WHERE player_id=?').get(s.id).n,sequence);
 assert.equal(Object.values(journal.snapshot()).every(rows=>rows.length===0),true);kernel.tick();assert.equal(packets.at(-1).lastApplied,sequence);assert.equal(packets.at(-1).results[0].body.hits[0].killed,true);
});
for(const operation of ['attack','monster_reward'])for(const phase of ['before','after'])test('actual '+operation+' SIGKILL '+phase+' COMMIT preserves one death/XP/loot claim',async t=>{
 const s=await setup(t),c=s.reset({hp:1}),dir=temporary(t),file=path.join(dir,'attack.sqlite'),inputFile=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');
 const source=new ChannelOwnership(s.f.database,{realmId:'attack-crash'});await source.initialize();const peer={channel:1,incarnation:'attack-surviving-channel'};await source.registerProcess(1,peer.incarnation);const owner=await source.admit(s.id,peer,{sessionId:'attack-crash-session',guard:()=>true});
 const options={settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertResources:()=>true,clock:()=>s.nowMs,assertOwnership:(db,p,id,epoch)=>Boolean(source.assertAdmitted(db,p,id,epoch)),settleRetaliation:()=>null};registerOwnedRule(source,'attack',createAttackWriterHandler(options));
 const first={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'kill-once',operation:'attack',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:'3'.repeat(64),input:c.context.payload,expected:{...readAttackFrame(s.sql,s.id,s.mid,s.globals),settings:s.settings}}};
 if(operation==='monster_reward')await source.command(peer,first);
 const request=operation==='attack'?first:{playerId:s.id,epoch:owner.epoch,sequence:2,operationId:'loot-once',operation:'monster_reward',payload:{nowMs:s.nowMs,seed:'4'.repeat(64),kind:'normal',monsterId:s.mid,spawnRound:1}};
 s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(inputFile,JSON.stringify({request,peer,settings:s.settings}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'attack-crash-fixture.mjs'),file,inputFile,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);
 assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_'+operation:'durable_'+operation+'_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());
 if(operation==='attack')assert.equal(db.sqlite.prepare('SELECT hp FROM monsters WHERE id=?').get(s.mid).hp,phase==='after'?0:1);
 else assert.equal(db.sqlite.prepare('SELECT count(*) n FROM normal_reward_claims WHERE monster_id=?').get(s.mid).n,phase==='after'?1:0);
 const authority=new ChannelOwnership(db,{realmId:'attack-crash'});await authority.initialize();const restartOptions={...options,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch))};registerOwnedRule(authority,operation,operation==='attack'?createAttackWriterHandler(restartOptions):createMonsterRewardHandler(restartOptions));
 const a=await authority.command(peer,request),b=await authority.command(peer,request);assert.deepEqual(json(a),json(b));assert.equal(authority.owner(s.id).sequence,request.sequence);
 assert.equal(db.sqlite.prepare('SELECT count(*) n FROM normal_defeats WHERE monster_id=?').get(s.mid).n,1);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM monster_xp_claims WHERE monster_id=?').get(s.mid).n,1);
 if(operation==='monster_reward'){assert.equal(db.sqlite.prepare('SELECT count(*) n FROM normal_reward_claims WHERE monster_id=?').get(s.mid).n,1);assert(db.sqlite.prepare('SELECT rewards_completed_at FROM normal_defeats WHERE monster_id=?').get(s.mid).rewards_completed_at>0);}
});

// R21 migration audit: the oracle is regenerated from the pinned V510 source
// BEFORE the adventure adapters, so this does not compare two patched branches.
test('R21 unchanged maps: 120 V510-oracle class/ability/range cases preserve result, HP and cooldown', {skip:!process.env.COL_R21_NATIVE_ATTACK_ORACLE}, async t=>{
 const {createAttackRules:createV510Rules}=await import(process.env.COL_R21_NATIVE_ATTACK_ORACLE),s=await setup(t);let cases=0;
 for(const area of ['forest','frozen','ancient','sinsi','sanctum'])for(const role of ['avci','arkanist','muhafiz'])for(const ability of [0,1,2,3])for(const distance of [0,450]){
  const specialization={avci:'avci_sharp',arkanist:'arkanist_burst',muhafiz:'muhafiz_strike'}[role];
  const c=s.reset({role,area,ability,patch:{specialization}});update(s.sql,'monsters',s.mid,{x:100+distance});c.view.setMonster({...c.monster,x:100+distance});c.context.preloadedAttackMonster={...c.context.preloadedAttackMonster,x:100+distance};
  const events=[],native=createV510Rules({globals:s.globals,now:()=>s.nowMs,random:seeded(192+ability),uuid:uuidFactory(),response,ports:{settlePveEngagement:()=>null,publishRealtimeRoomEvent:(...a)=>events.push(a),publishRealtimeRoomEventToChannels:(...a)=>events.push(a),deliverRealtime:v=>v}});
  const beforePrepare=s.sql.prepare;let actual;s.sql.prepare=()=>{throw Error('R21 hot combat must not read SQL');};try{actual=c.memory.step(c.context,{random:seeded(192+ability),uuid:uuidFactory(),nowMs:s.nowMs});}finally{s.sql.prepare=beforePrepare;}
  assert.equal(actual.durable,false);const expected=await native.nativeAttack(c.oracle,json(c.context));const label=[area,role,ability,distance].join('/');
  assert.deepEqual(json(actual.result),json(expected),label+' response');assert.deepEqual(json(actual.events),json(events),label+' events');
  assert.deepEqual(json(c.view.player(s.id)),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.id)),label+' actor');
  assert.deepEqual(json(c.view.monster(s.mid)),json(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get(s.mid)),label+' monster');cases++;
 }assert.equal(cases,120);t.diagnostic('120 cases; original V510-derived oracle; SQL forbidden on resident path');
});
