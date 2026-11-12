import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {hash,native,temporary} from './helpers.mjs';
import {setupPvp,json,put,update} from './pvp-fixture.mjs';
import {attackRandom} from '../attack-writer.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {createPvpWriterHandler,readPvpFrame} from '../pvp-writer.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {PvpLoop} from '../pvp-loop.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
import {ActorCheckpoints,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {CombatCheckpoints,createCombatCheckpointHandler} from '../combat-checkpoint.mjs';

test('native PvP branch is pinned and the resident branch has no SQL or async path',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/pvp-proof.json',import.meta.url))),rules=createAttackRules({globals:{}});
 assert.equal(hash(rules.memoryPvp.toString()),proof.memoryBodySha256);assert(!/\b(database|async|await)\b/.test(rules.memoryPvp.toString()));assert(!/\b(database|async|await)\b/.test(rules.memoryContinuity.toString()));
});
test('all three roles PvP skill0/1/2 and four specialist attacks equal native state and messages',async t=>{
 const s=await setupPvp(t);let cases=0;
 for(const area of ['war','arena','black','rune_v2'])for(const role of ['avci','arkanist','muhafiz'])for(const ability of [0,1,2]){
  const c=s.reset({role,ability,area,extras:true}),prepare=s.sql.prepare;let actual;
  s.sql.prepare=()=>{throw Error('pvp hot SQL');};try{actual=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs});}finally{s.sql.prepare=prepare;}
  const expected=await c.original.nativePvp(s.db,json(c.context));assert.equal(actual.durable,false,area+'/'+role+'/'+ability);assert.deepEqual(json(actual.result),json(expected),area+'/'+role+'/'+ability);assert.deepEqual(json(actual.events),json(c.oldEvents));
  for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)),area+'/'+role+'/'+ability+'/'+p.id);cases++;
 }
 for(const [role,specialization]of [['avci','avci_sharp'],['avci','avci_trap'],['arkanist','arkanist_burst'],['muhafiz','muhafiz_strike']]){
  const c=s.reset({role,ability:3,actor:{specialization}}),actual=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs}),expected=await c.original.nativePvp(s.db,json(c.context));assert.deepEqual(json(actual.result),json(expected),specialization);assert.deepEqual(json(actual.events),json(c.oldEvents));for(const p of c.view.players.values())assert.deepEqual(json(p),json(s.sql.prepare('SELECT * FROM players WHERE id=?').get(p.id)));cases++;
 }assert.equal(cases,40);
});
test('PvP stun/root/cadence/rod/range/safe-zone/party and arena team/countdown guards match',async t=>{
 const s=await setupPvp(t);
 for(const spec of [{actor:{stun_until_ms:s.nowMs+1}},{actor:{attack_one_at:s.nowMs+1000}},{actor:{rod_equipped:1}},{victim:{x:1700}},{actor:{x:1800,y:996},victim:{x:1810,y:996}},{role:'muhafiz',ability:2,actor:{root_until_ms:s.nowMs+1}}]){
  const c=s.reset(spec),a=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs}),b=await c.original.nativePvp(s.db,json(c.context));assert.deepEqual(json(a.result),json(b));assert.deepEqual(json(a.events),json(c.oldEvents));
 }
 for(const mode of ['party','same-team','countdown']){
  const c=s.reset({area:mode==='party'?'war':'arena'});
  if(mode==='party'){put(s.sql,'parties',{id:'party-pvp',leader_id:s.id,created_at:1});for(const id of [s.id,s.targetId]){put(s.sql,'party_members',{party_id:'party-pvp',player_id:id,joined_at:1});c.party.set(id,'party-pvp');}}
  if(mode==='same-team'){s.sql.prepare('UPDATE arena_match_players SET team=1').run();c.teams.set('pvp-match:'+s.targetId,1);c.context.actionSnapshot.preloadedPvpArena.target_team=1;}
  if(mode==='countdown'){update(s.sql,'arena_matches','pvp-match',{starts_at_ms:s.nowMs+1000});c.arenas.get('pvp-match').starts_at_ms=s.nowMs+1000;c.context.actionSnapshot.preloadedPvpArena.starts_at_ms=s.nowMs+1000;}
  const a=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs}),b=await c.original.nativePvp(s.db,json(c.context));assert.deepEqual(json(a.result),json(b),mode);assert.deepEqual(json(a.events),json(c.oldEvents));
 }
});
test('lethal primary or secondary PvP hit leaves all actor HP, cooldown and messages private',async t=>{
 const s=await setupPvp(t);
 for(const ability of [0,2]){const c=s.reset({ability,victim:ability===0?{hp:1}:{},extras:true});if(ability===2){const p=c.view.player('rival-extra');c.view.setPlayer({...p,hp:1});}const before=json([...c.view.players]);const result=c.memory.step(c.context,{...attackRandom(s.seed),nowMs:s.nowMs});assert.equal(result.durable,true);assert.deepEqual(json([...c.view.players]),before);assert.equal(result.events,undefined);}
});

const tables=['players','combat_events','arena_matches','arena_match_players','arena_kill_claims','arena_reward_claims','arena_announcements','pvp_reward_cooldowns','war_kill_claims'];
const capture=sql=>Object.fromEntries(tables.map(table=>[table,json(sql.prepare('SELECT * FROM '+table+' ORDER BY rowid').all())]));
test('native PvP death, gem loss, war cooldown, arena score and final reward equal the ordered writer',async t=>{
 const s=await setupPvp(t);
 for(const area of ['war','arena','black','rune_v2'])for(const ability of [0,2]){
  const c=s.reset({area,ability,victim:{hp:1},extras:true});
  if(area==='arena'){update(s.sql,'arena_matches','pvp-match',{kill_target:1});c.context.actionSnapshot.preloadedPvpArena.kill_target=1;}
  s.sql.exec('SAVEPOINT pvp_oracle');const expected=await c.original.nativePvp(s.db,json(c.context)),after=capture(s.sql);s.sql.exec('ROLLBACK TO pvp_oracle;RELEASE pvp_oracle');
  const handler=createPvpWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,clock:()=>s.nowMs,mixedPorts:()=>({selectMixedMonsters473:()=>[]})});
  const actual=await s.f.database.atomic(sql=>handler(sql,{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input:c.context.payload,expected:{...readPvpFrame(sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}},{actor:s.id}));
  assert.deepEqual(json(actual.result),json(expected),area+'/'+ability);assert.deepEqual(json(actual.events),json(c.oldEvents),area+'/'+ability);assert.deepEqual(capture(s.sql),after,area+'/'+ability);
  if(area==='war')assert.equal(s.sql.prepare('SELECT count(*) n FROM war_kill_claims').get().n,1);
  if(area==='arena')assert.equal(s.sql.prepare('SELECT count(*) n FROM arena_reward_claims').get().n,1);
 }
});
test('two ordered PvP requests cannot claim the same victim twice; ACK waits for durability',async t=>{
 const s=await setupPvp(t),c=s.reset({victim:{hp:1}}),authority=new ChannelOwnership(s.f.database,{realmId:'pvp-order'});await authority.initialize();const peer={channel:1,incarnation:'pvp-order-owner'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'pvp-order-session',guard:()=>true});
 registerOwnedRule(authority,'pvp_attack',createPvpWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(db,p,id,epoch)=>Boolean(authority.assertAdmitted(db,p,id,epoch)),assertResources:()=>true,clock:()=>s.nowMs}));
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'pvp-once',operation:'pvp_attack',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input:c.context.payload,expected:{...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}}};
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release,acked=false;const held=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);const pending=authority.command(peer,request).then(v=>{acked=true;return v;});await new Promise(r=>setImmediate(r));assert.equal(acked,false);release();const a=await pending;s.f.database.durableAfterCommit=durable;const b=await authority.command(peer,request);assert.deepEqual(json(a),json(b));assert.equal(s.sql.prepare('SELECT count(*) n FROM war_kill_claims').get().n,1);
 const again={...request,sequence:2,operationId:'different-hit',payload:{...request.payload,expected:{...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}}};const rejected=await authority.command(peer,again);assert.equal(rejected.result.result.status,409);assert.equal(s.sql.prepare('SELECT count(*) n FROM war_kill_claims').get().n,1);
});
test('20 Hz PvP bridge checkpoints both actors before death and retains victim lock through fsync',async t=>{
 const s=await setupPvp(t),c=s.reset({victim:{hp:900}});s.settings.hunter_base_attack=150;let time=s.nowMs;
 const authority=new ChannelOwnership(s.f.database,{realmId:'pvp-loop'});await authority.initialize();const peer={channel:1,incarnation:'pvp-loop-owner'};await authority.registerProcess(1,peer.incarnation);const owners=new Map(),state=new ResidentState(1),lanes=new ResourceLanes();
 for(const id of [s.id,s.targetId]){const owner=await authority.admit(id,peer,{sessionId:'pvp-loop-'+id,guard:()=>true});owners.set(id,owner);state.put('players',{...c.view.player(id),cycle:1});state.claim(id,owner.epoch);}
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler());registerOwnedRule(authority,'combat_checkpoint',createCombatCheckpointHandler({assertResources:()=>true}));registerOwnedRule(authority,'pvp_attack',createPvpWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(db,p,id,epoch)=>Boolean(authority.assertAdmitted(db,p,id,epoch)),assertResources:()=>lanes.busy(['player:'+s.id])&&lanes.busy(['player:'+s.targetId]),clock:()=>time}));
 const client=new OrderedWriterClient({peer,owner:id=>owners.get(id),request:(p,r)=>authority.command(p,r)});for(const [id,owner]of owners)client.seed(id,owner.epoch,0);
 const checkpoints=new ActorCheckpoints({state,submit:e=>client.submit(e),clock:()=>time});for(const id of owners.keys())checkpoints.hydrate(c.view.player(id));const journal=new CombatCheckpoints({submit:e=>client.submit(e),actor:()=>s.id,clock:()=>time});
 c.memory.changed=changes=>{for(const p of changes.players)state.put('players',{...p,cycle:1});journal.changed(changes);};
 const overlay=template=>template&&Object.fromEntries(Object.keys(template).map(k=>[k,Object.hasOwn(c.view.player(template.id),k)?c.view.player(template.id)[k]:template[k]]));
 const frameFor=(id,input,now)=>({...c.context,payload:input,requestReceivedAtMs:now,actionSnapshot:{...c.context.actionSnapshot,player:overlay(c.context.actionSnapshot.player),preloadedPvpTarget:c.view.player(s.targetId).hp>0?overlay(c.context.actionSnapshot.preloadedPvpTarget):null}});
 const events=[],packets=[],bridge=new PvpLoop({memory:c.memory,lanes,checkpoints,combatCheckpoints:journal,submit:e=>client.submit(e),frameFor,affectedActors:()=>[],publish:(...a)=>events.push(a),committed:r=>{for(const p of r.players){c.view.setPlayer(p);state.put('players',{...p,cycle:1});}}});
 const kernel=new FixedLoop({state,wall:()=>time,send:(id,p)=>packets.push([id,p]),rules:{movement:()=>({ok:true}),combat:ctx=>bridge.attack(ctx),ai:()=>{},respawn:()=>{},project:({results,lastApplied})=>({results,lastApplied})}});t.after(()=>kernel.stop());for(const [id,owner]of owners)kernel.admit(id,owner.epoch);kernel.stopped=false;
 const durable=s.f.database.durableAfterCommit.bind(s.f.database);let release;const held=new Promise(r=>release=r);s.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 let sequence=0;for(;sequence<15&&!kernel.players.get(s.id).barrier;){time+=1000;kernel.enqueue(s.id,{sequence:++sequence,epoch:owners.get(s.id).epoch,kind:'combat',payload:c.context.payload});kernel.tick();}
 assert(sequence>1&&sequence<15);const pending=kernel.players.get(s.id).barrier;assert(pending);assert(c.view.player(s.targetId).hp>0);assert(lanes.busy(['player:'+s.targetId]));assert.equal(kernel.players.get(s.id).lastApplied,sequence-1);release();await pending;await Promise.resolve();s.f.database.durableAfterCommit=durable;
 assert.equal(kernel.failure,null);assert.equal(c.view.player(s.targetId).hp,0);assert.equal(s.sql.prepare('SELECT count(*) n FROM war_kill_claims').get().n,1);assert.equal(s.sql.prepare('SELECT count(*) n FROM combat_events WHERE player_id=?').get(s.id).n,sequence);assert.equal(lanes.busy(['player:'+s.targetId]),false);kernel.tick();assert.equal(kernel.players.get(s.id).lastApplied,sequence);
});
for(const mode of ['war','arena-round','arena-final'])for(const phase of ['before','after'])test('actual PvP '+mode+' SIGKILL '+phase+' COMMIT replays one economic outcome',async t=>{
 const s=await setupPvp(t),c=s.reset({area:mode==='war'?'war':'arena',victim:{hp:1}});if(mode==='arena-final')update(s.sql,'arena_matches','pvp-match',{kill_target:1});
 const source=new ChannelOwnership(s.f.database,{realmId:'pvp-crash'});await source.initialize();const peer={channel:1,incarnation:'pvp-surviving-channel'};await source.registerProcess(1,peer.incarnation);const owner=await source.admit(s.id,peer,{sessionId:'pvp-crash-session',guard:()=>true});
 const request={playerId:s.id,epoch:owner.epoch,sequence:1,operationId:'pvp-crash-once',operation:'pvp_attack',payload:{nowMs:s.nowMs,receivedAtMs:s.nowMs,seed:s.seed,input:c.context.payload,expected:{...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings}}};
 const dir=temporary(t),file=path.join(dir,'pvp.sqlite'),input=path.join(dir,'input.json'),marker=path.join(dir,'phase.txt');s.sql.exec('PRAGMA wal_checkpoint(TRUNCATE)');fs.copyFileSync(s.f.file,file);fs.writeFileSync(input,JSON.stringify({request,peer,settings:s.settings}));
 const child=spawn(process.execPath,[path.join(import.meta.dirname,'pvp-crash-fixture.mjs'),file,input,phase,marker],{stdio:['ignore','ignore','pipe']});let stderr='';child.stderr.on('data',b=>stderr+=b);const [code,signal]=await once(child,'exit');assert.equal(signal,'SIGKILL',stderr);assert.equal(code,null);assert.equal(fs.readFileSync(marker,'utf8'),phase==='before'?'uncommitted_pvp':'durable_pvp_before_ack');
 const {LocalDatabase}=await native('vds-server/src/database.mjs'),db=new LocalDatabase(file,{groupWrites:true,asyncDurable:true});t.after(()=>db.close());assert.equal(db.sqlite.prepare('SELECT count(*) n FROM '+(mode==='war'?'war_kill_claims':'arena_kill_claims')).get().n,phase==='after'?1:0);const authority=new ChannelOwnership(db,{realmId:'pvp-crash'});await authority.initialize();registerOwnedRule(authority,'pvp_attack',createPvpWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:(sql,p,id,epoch)=>Boolean(authority.assertAdmitted(sql,p,id,epoch)),assertResources:()=>true,clock:()=>s.nowMs}));
 const a=await authority.command(peer,request),state=capture(db.sqlite),b=await authority.command(peer,request);assert.deepEqual(json(a),json(b));assert.deepEqual(capture(db.sqlite),state);assert.equal(authority.owner(s.id).sequence,1);assert.equal(db.sqlite.prepare('SELECT count(*) n FROM '+(mode==='war'?'war_kill_claims':'arena_kill_claims')).get().n,1);if(mode==='arena-final')assert.equal(db.sqlite.prepare('SELECT count(*) n FROM arena_reward_claims').get().n,1);
});
