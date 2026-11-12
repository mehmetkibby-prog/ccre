import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {setupPvp,put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {ResidentChannel} from '../resident-channel.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {createCombatCheckpointHandler} from '../combat-checkpoint.mjs';
import {createAttackWriterHandler} from '../attack-writer.mjs';
import {createActionWriterHandler} from '../action-writer.mjs';
import {writerSettlement} from '../combat-settlement.mjs';
import {ReadWorker} from '../read-worker.mjs';
import {ReliableStream,acceptStreamSocket} from '../reliable-stream.mjs';
import {MessagePortStream} from '../message-port-stream.mjs';

test('resident composition shares movement/AI/attack state and durable potion over real MessageChannel frames',async t=>{
 const f=await setupPvp(t),{sql,id}=f;f.reset({area:'forest',actor:{x:2700,y:2025,hp:700,max_hp:1000,potions:2,movement_checked_at_ms:f.nowMs-200,position_revision:1}});
 const monster={id:'golge-resident511',name:'resident target',area:'forest',channel:1,x:2750,y:2025,hp:100000,max_hp:100000,spawn_round:1,variant:'normal'};put(sql,'monsters',monster);
 const database=f.f.database,authority=new ChannelOwnership(database,{realmId:'resident-composition'});await authority.initialize();const peer={channel:1,incarnation:'resident-integration-boot'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(id,peer,{sessionId:'resident-session',guard:()=>true});
 let time=f.nowMs;const own=(db,p,id,e)=>Boolean(authority.assertAdmitted(db,p,id,e)),dependencies={settingsFor:()=>f.settings,globalsFor:()=>f.globals,assertOwnership:own,assertResources:()=>true,settleRetaliation:writerSettlement,clock:()=>time};
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler(),{duringDrain:true});registerOwnedRule(authority,'combat_checkpoint',createCombatCheckpointHandler({assertResources:()=>true}),{duringDrain:true});registerOwnedRule(authority,'attack',createAttackWriterHandler(dependencies));registerOwnedRule(authority,'native_action',createActionWriterHandler({...dependencies,affectedActors:()=>[],enforceRateLimit:()=>null}));
 const sockets=[],stream=new ReliableStream({open:()=>{const {port1,port2}=new MessageChannel(),server=new MessagePortStream(port2);sockets.push(server);acceptStreamSocket(server,{authenticate:h=>h.proof==='isolated-resident-test'?peer:null,dispatch:(p,method,request)=>{assert.equal(method,'command');return authority.command(p,request);}});return new MessagePortStream(port1);},handshake:()=>({proof:'isolated-resident-test'})});stream.start();t.after(()=>{stream.close();for(const socket of sockets)socket.destroy();});
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const loadActor=async(actor,epoch,revision)=>(await reader.query('kernel511_actor_bundle',[actor,1,peer.incarnation,epoch,revision,time])).rows;
 const bundle=await loadActor(id,owner.epoch,0),packets=[],events=[],faults=[];let channel;
 // The world/other-mode ports here are deliberately fixture-only: this test
 // covers composition/ordering, not the unfinished production mode renderer.
 channel=new ResidentChannel({peer,initial:{world:bundle.world,settings:f.settings,profiles:bundle.profiles,monsters:[sql.prepare('SELECT * FROM monsters WHERE id=?').get(monster.id)]},globals:f.globals,loadActor,requestWriter:(_,r)=>stream.request('command',r),wall:()=>time,send:(id,p)=>packets.push(p),onFatal:e=>faults.push(e),ports:{
  guard:()=>true,scope:id=>{const p=channel.state.read('players',id);return {scopeVersion:p.realtime_scope_version,cycle:channel.world.cycle,channel:1,area:p.area,arenaMatchId:p.arena_match_id};},
  footprint:()=>({players:[],resources:[]}),affectedAttack:()=>[],affectedPvp:()=>[],rankingEligible:()=>false,monsterOwned:m=>m.channel===1,changedArenaLife:()=>false,publish:(...a)=>events.push(a),project:({results,lastApplied})=>results.length?{results,lastApplied}:null,
  modeAction:()=>assert.fail('fixture unexpected mode'),modeTick:()=>{},respawn:()=>{},recordSecurityEvent:()=>{},hydrateMode:()=>{},dropMode:()=>{},drainMode:async()=>{},mixedPvp:{selectMixedMonsters473:()=>[]}
 }});t.after(()=>channel.stop());channel.admit(bundle,{actor:id,account:bundle.player.account_id,epoch:owner.epoch});channel.kernel.stopped=false;
 const input=(sequence,payload)=>{channel.kernel.enqueue(id,{sequence,epoch:owner.epoch,kind:payload.action==='move'?'movement':'combat',payload});channel.kernel.tick();};
 input(1,{action:'move',x:2715,y:2025,area:'forest',basePositionRevision:1});assert.equal(channel.state.read('players',id).x,2715);assert.equal(channel.frames.frame(id).x,2715);assert.equal(sql.prepare('SELECT x FROM players WHERE id=?').get(id).x,2700);
 time+=200;input(2,{action:'attack',targetId:monster.id,spawnRound:1,ability:0,intentId:'composition-attack'});assert.equal(faults.length,0);assert(channel.view.monster(monster.id).hp<monster.hp,JSON.stringify(packets));assert.equal(channel.state.read('monsters',monster.id).hp,channel.view.monster(monster.id).hp);assert.equal(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(monster.id).hp,monster.hp);
 time+=200;input(3,{action:'use_potion'});const pending=channel.kernel.players.get(id).barrier;assert(pending);assert.equal(channel.kernel.players.get(id).lastApplied,2);
 await pending;await Promise.resolve();channel.kernel.tick();assert.equal(faults.length,0);assert.equal(channel.kernel.players.get(id).lastApplied,3);assert.equal(channel.state.read('players',id).potions,1);assert.equal(sql.prepare('SELECT potions FROM players WHERE id=?').get(id).potions,1);assert.equal(channel.state.read('players',id).hp,900);assert.equal(channel.frames.frame(id).hp,900);assert.equal(channel.lanes.busy(['player:'+id]),false);
 const operations=sql.prepare('SELECT operation_id FROM kernel511_channel_receipts ORDER BY sequence').all().map(r=>r.operation_id.split(':')[0]);assert.deepEqual(operations,['checkpoint','combat-checkpoint','action']);assert(packets.some(p=>p.results.some(r=>r.sequence===3&&r.body?.ok)));assert(events.length>0);
 const drained=await channel.drain(id);assert.equal(drained.finalSequence,3);channel.detach(id);assert.equal(channel.state.read('players',id),null);assert.equal(channel.kernel.players.size,0);
});
