import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {parse} from '../../perf-r11/tests/parser.mjs';
import {BASE,native} from './helpers.mjs';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {MovementActionMemory,createMovementWriterHandler} from '../movement-action.mjs';
import {createRules} from '../generated/rules.mjs';
import {createRetaliationRules} from '../generated/retaliation-rules.mjs';
import {residentSettlement,writerSettlement} from '../combat-settlement.mjs';
import {CombatFrames,readCombatBundle} from '../combat-frames.mjs';
import {ResidentState} from '../resident-state.mjs';
import {OperationRandom} from '../operation-random.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {ReadWorker} from '../read-worker.mjs';
const {pveEntries489}=await native('vds-server/src/pve-multi489.mjs');
const source=fs.readFileSync(path.join(BASE,'dist-vds/server/channel-runtime/index.mjs'),'utf8'),ast=parse(source,{ecmaVersion:'latest',sourceType:'module'});
const oldCode=ast.body.filter(n=>n.type==='FunctionDeclaration'&&['readAuthoritativeMovement','applyAuthoritativeMove','executeMovementAction'].includes(n.id.name)).map(n=>source.slice(n.start,n.end)).join('\n');

test('complete native movement/retaliation wrapper matches SQL and speed/scope decisions without resident SQL',async t=>{
 const s=await setupPvp(t),{sql,db,id,nowMs,settings,globals}=s,monsterId='golge-movement511',seed='b'.repeat(64);
 sql.function('strftime',(format,clock)=>{assert.equal(format,'%s');assert.equal(clock,'now');return String(Math.floor(nowMs/1000));});
 put(sql,'monsters',{id:monsterId,name:'movement test',area:'forest',channel:1,x:2700,y:2025,hp:100,max_hp:100,spawn_round:1,variant:'normal'});
 for(const mode of ['normal','retaliation','speed','scope','rooted','death']){
  const {view}=s.reset({area:'forest',actor:{x:2700,y:2025,hp:mode==='death'?1:1000,max_hp:1000,movement_checked_at_ms:nowMs-300,movement_debt_ms:0,position_revision:1,root_until_ms:mode==='rooted'?nowMs+100:0}}),player=sql.prepare('SELECT * FROM players WHERE id=?').get(id),monster=sql.prepare('SELECT * FROM monsters WHERE id=?').get(monsterId);
  const events=[],oldEvents=[],nativeRng=new OperationRandom(seed),memoryRng=new OperationRandom(seed),retaliation=createRetaliationRules({globals,random:()=>nativeRng.roll(),now:()=>nowMs,publish:(...a)=>oldEvents.push(a)});
  if(['retaliation','death'].includes(mode))db.batch(retaliation.preparePveEngagement(db,player,monster,nowMs-5000));
  const engagement=sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)??null;view.setEngagement(id,engagement);view.setPlayer(sql.prepare('SELECT * FROM players WHERE id=?').get(id));view.setMonster(monster);
  const world=sql.prepare('SELECT * FROM world_state WHERE id=1').get(),state=new ResidentState(1);state.put('players',{...view.player(id),cycle:world.cycle});state.claim(id,1);
  const frames=new CombatFrames({view,settings:()=>settings,world:()=>world,party:()=>null,arena:()=>null,team:()=>null,participants:()=>false,now:()=>nowMs});frames.hydrate(readCombatBundle(sql,id,{revision:1,nowMs}));frames.setProfiles(sql.prepare('SELECT * FROM all_monster_combat_profiles').all(),1);
  const settlement=residentSettlement({globals,frameFor:(...a)=>frames.retaliation(...a)}),memory=new MovementActionMemory({state,view,world,fishing:new Map(),epoch:()=>1,settings:()=>settings,retaliate:settlement,changed:c=>{for(const p of c.players)state.put('players',{...p,cycle:world.cycle});},recordSecurityEvent:()=>{},wall:()=>nowMs});
  const ctx=vm.createContext({...createRules(),recordSecurityEvent:()=>{},getGameSettings:()=>settings,settlePveEngagement:(...a)=>retaliation.settleAllNative(...a),publishRealtimeRoomEvent:(...a)=>oldEvents.push(a),deliverRealtime:()=>{}});vm.runInContext(oldCode,ctx);
  const auth={player:{id},account:{id:player.account_id}},payload={action:'move',x:mode==='speed'?3300:2715,y:2025,area:'forest',basePositionRevision:1,motionStreamId:'movement-stream-511',motionSequence:1},scope={scopeVersion:mode==='scope'?999:player.realtime_scope_version,cycle:world.cycle,channel:1,area:'forest',arenaMatchId:''};
  const expected=await ctx.executeMovementAction(null,auth,db,payload,nowMs,scope),prepare=sql.prepare.bind(sql);sql.prepare=()=>{throw Error('resident movement SQL');};let actual;try{actual=memory.step({auth,payload,nowMs,scope,random:()=>memoryRng.roll()});}finally{sql.prepare=prepare;}
  if(mode==='death'){
   assert(actual.durable);assert.equal(actual.monsterId,monsterId);assert.equal(view.player(id).hp,1);assert.equal(view.player(id).x,2700);assert.equal(expected.data.code,'movement_retaliation_dead');
  }else{
   assert.equal(actual.durable,false);assert.deepEqual(json(actual.result),json(expected),mode);assert.deepEqual(json(actual.events),json(oldEvents),mode+' events');
   const saved=sql.prepare('SELECT * FROM players WHERE id=?').get(id);for(const k of Object.keys(saved))assert.equal(view.player(id)[k],saved[k],mode+' '+k);assert.deepEqual(json(view.engagements.get(id)??null),json(sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)??null));
  }
 }
});

test('actor read worker returns a consistent native admission bundle and fences wrong ownership',async t=>{
 const s=await setupPvp(t);s.reset({area:'forest'});const authority=new ChannelOwnership(s.f.database,{realmId:'read-admission'});await authority.initialize();const peer={channel:1,incarnation:'read-worker-channel'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(s.id,peer,{sessionId:'read-worker-session',guard:()=>true});
 const reader=new ReadWorker(s.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const params=[s.id,1,peer.incarnation,owner.epoch,1,s.nowMs],bundle=(await reader.query('kernel511_actor_bundle',params)).rows;
 assert.equal(bundle.player.id,s.id);assert.equal(bundle.owner.epoch,owner.epoch);assert.equal(bundle.combat.actor,s.id);assert.equal(bundle.settings.world_cycle,undefined);assert(Array.isArray(bundle.profiles));
 assert.deepEqual(json(bundle.combat),json(readCombatBundle(s.sql,s.id,{revision:1,nowMs:s.nowMs})));
 await assert.rejects(reader.query('kernel511_actor_bundle',[s.id,2,peer.incarnation,owner.epoch,1,s.nowMs]),/actor_bundle_owner_fenced/);
 await assert.rejects(reader.query('kernel511_actor_bundle',[s.id,1,'wrong-incarnation',owner.epoch,1,s.nowMs]),/actor_bundle_owner_fenced/);
 assert.equal(s.sql.prepare('SELECT COUNT(*) n FROM kernel511_channel_receipts').get().n,0);
});

test('movement terminal writer uses the original death response and ordered receipt replay',async t=>{
 const s=await setupPvp(t),{sql,db,id,nowMs,settings,globals}=s;s.reset({area:'forest',actor:{x:2700,y:2025,hp:1,movement_checked_at_ms:nowMs-300,position_revision:1}});
 const monster={id:'golge-terminal511',name:'terminal movement',area:'forest',channel:1,x:2700,y:2025,hp:100,max_hp:100,spawn_round:1,variant:'normal'};put(sql,'monsters',monster);const player=sql.prepare('SELECT * FROM players WHERE id=?').get(id),retal=createRetaliationRules({globals});db.batch(retal.preparePveEngagement(db,player,monster,nowMs-5000));
 const authority=new ChannelOwnership(s.f.database,{realmId:'movement-terminal'});await authority.initialize();const peer={channel:1,incarnation:'move-terminal-boot'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(id,peer,{sessionId:'move-terminal-session',guard:()=>true});
 const handler=createMovementWriterHandler({settingsFor:()=>settings,globalsFor:()=>globals,settleRetaliation:writerSettlement,assertOwnership:(db,p,id,e)=>Boolean(authority.assertAdmitted(db,p,id,e)),assertResources:()=>true,recordSecurityEvent:()=>{},clock:()=>nowMs});registerOwnedRule(authority,'movement',handler);
 const ctx=vm.createContext({...createRules()});vm.runInContext(oldCode,ctx);const movement=await ctx.readAuthoritativeMovement(db,id,player.account_id,nowMs),request={playerId:id,epoch:owner.epoch,sequence:1,operationId:'move-death-once',operation:'movement',payload:{nowMs,input:{action:'move',x:2715,y:2025,area:'forest',basePositionRevision:1},seed:'c'.repeat(64),expected:{movement,settings}}};
 const ack=await authority.command(peer,request),duplicate=await authority.command(peer,request);assert.deepEqual(json(ack),json(duplicate));assert.equal(ack.result.result.data.code,'movement_retaliation_dead');assert.equal(ack.result.player.hp,0);assert.equal(ack.result.player.x,2700);assert.equal(ack.result.events.length,1);assert.equal(authority.owner(id).sequence,1);
});
