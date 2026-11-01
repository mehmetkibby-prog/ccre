import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {ResidentState} from '../resident-state.mjs';
import {FixedLoop} from '../fixed-loop.mjs';
import {ResourceLanes} from '../resource-lanes.mjs';
import {ChannelOwnership,OrderedWriterClient,registerOwnedRule} from '../ownership.mjs';
import {ActorCheckpoints,createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {CombatFrames,readCombatBundle} from '../combat-frames.mjs';
import {PermanentCoordinator} from '../permanent-coordinator.mjs';
import {ResidentControl} from '../resident-control.mjs';
import {EncounterCheckpoints} from '../encounter-checkpoint.mjs';

async function setup(t){
 const f=await setupPvp(t),{sql,id}=f,{view}=f.reset({area:'forest'}),database=f.f.database;
 const authority=new ChannelOwnership(database,{realmId:'permanent-control'});await authority.initialize();
 const peer={channel:1,incarnation:'permanent-channel-boot'};await authority.registerProcess(1,peer.incarnation);
 const owner=await authority.admit(id,peer,{sessionId:'permanent-session',guard:()=>true});
 const state=new ResidentState(1),row=sql.prepare('SELECT * FROM players WHERE id=?').get(id);state.put('players',{...row,cycle:1});state.claim(id,owner.epoch);
 const lanes=new ResourceLanes(),frames=new CombatFrames({view,settings:()=>f.settings,world:()=>({cycle:1,reset_at:0}),party:()=>null,arena:()=>null,team:()=>null,participants:()=>false,now:()=>f.nowMs});
 frames.hydrate(readCombatBundle(sql,id,{revision:0,nowMs:f.nowMs}));
 const writer=new OrderedWriterClient({peer,owner:()=>owner,request:(p,r)=>authority.command(p,r)});writer.seed(id,owner.epoch,0);
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler(),{duringDrain:true});
 registerOwnedRule(authority,'fixture_economy',(db,p)=>{db.prepare('UPDATE players SET gems=gems+? WHERE id=?').run(p.amount,id);return {ok:true};});
 const checkpoints=new ActorCheckpoints({state,submit:e=>writer.submit(e)});checkpoints.hydrate(row);
 const kernel=new FixedLoop({state,send:()=>{},rules:{movement:({id,input})=>{state.patch('players',id,{x:input.x,position_revision:state.read('players',id).position_revision+1});view.setPlayer(state.read('players',id));return {ok:true};},combat:()=>({ok:true}),ai:()=>{},respawn:()=>{},project:({results})=>results.length?{results}:null}});kernel.admit(id,owner.epoch);kernel.start();t.after(()=>kernel.stop());
 let revision=0,readCount=0;const faults=[];
 const control=new ResidentControl({kernel,peer,lanes,checkpoints,combatCheckpoints:{drain:()=>Promise.resolve()},writer,frames,
  readBundle:async actor=>{readCount++;return {...readCombatBundle(sql,actor,{revision:++revision,nowMs:f.nowMs}),player:sql.prepare('SELECT * FROM players WHERE id=?').get(actor)};},
  applyBundle:bundle=>{state.put('players',{...bundle.player,cycle:1});view.setPlayer(bundle.player);},onFault:e=>faults.push(e)});
 const coordinator=new PermanentCoordinator({authority,endpointFor:(c,i)=>c===peer.channel&&i===peer.incarnation?control:null,durable:()=>database.durableAfterCommit(),onFault:(e,err)=>faults.push(err)});
 authority.commandGuard=(...a)=>coordinator.guard(...a);authority.admissionGuard=ids=>coordinator.assertAvailable(ids);
 return {...f,database,authority,peer,owner,state,view,frames,lanes,kernel,writer,checkpoints,control,coordinator,faults,readCount:()=>readCount};
}

test('rare writer waits for accepted motion and fsync, refreshes native equipment before resuming',async t=>{
 const s=await setup(t),{id,owner,kernel,state,sql,coordinator,lanes,frames}=s;
 kernel.enqueue(id,{sequence:1,epoch:owner.epoch,kind:'movement',payload:{x:1234}});
 let atOperation=false,release;const held=new Promise(r=>release=r),durable=coordinator.durable;coordinator.durable=async()=>{await durable();await held;};
 const done=coordinator.permanentPlayers([id],()=>{
  atOperation=true;assert.equal(sql.prepare('SELECT x FROM players WHERE id=?').get(id).x,1234);assert.equal(kernel.players.get(id).lastApplied,1);assert(lanes.busy(['player:'+id]));assert.throws(()=>frames.frame(id),/combat_frame_stale/);
  const statement=sql.prepare('UPDATE players SET gems=gems+7,max_hp=max_hp+30,hp=hp+30 WHERE id=?');return statement.run(id).changes;
 });
 await until(()=>atOperation);assert(kernel.players.get(id).suspended);assert.throws(()=>kernel.enqueue(id,{sequence:2,epoch:owner.epoch,kind:'movement',payload:{x:9}}),/actor_draining/);
 await assert.rejects(s.authority.command(s.peer,{playerId:id,epoch:owner.epoch,sequence:2,operationId:'blocked-economy',operation:'fixture_economy',payload:{amount:99}}),/permanent_actor_fenced/);
 await assert.rejects(s.authority.logout(id,s.peer,{epoch:owner.epoch,sessionId:'permanent-session',finalSequence:1}),/permanent_actor_fenced/);
 release();assert.equal(await done,1);assert.equal(state.read('players',id).gems,1007);assert.equal(state.read('players',id).max_hp,1030);assert.equal(frames.frame(id).hp,state.read('players',id).hp);assert.equal(kernel.players.get(id).accepting,true);assert.equal(lanes.busy(['player:'+id]),false);assert.equal(s.readCount(),1);
 kernel.enqueue(id,{sequence:2,epoch:owner.epoch,kind:'movement',payload:{x:1250}});await until(()=>kernel.players.get(id).lastApplied===2);await s.checkpoints.drain(id);assert.equal(sql.prepare('SELECT x FROM players WHERE id=?').get(id).x,1250);assert.equal(sql.prepare('SELECT gems FROM players WHERE id=?').get(id).gems,1007);
});

test('freeze/resume replies replay without duplicate checkpoint or stale bundle publication',async t=>{
 const s=await setup(t),request={id:s.id,epoch:s.owner.epoch,token:'control-replay-token'};
 s.state.patch('players',s.id,{x:1440,position_revision:2});
 const first=s.control.freeze(request),duplicate=s.control.freeze(request);assert.equal(first,duplicate);
 const ack=await first;assert.equal(ack.finalSequence,1);assert.throws(()=>s.control.freeze({...request,token:'other-control-token'}),/resident_control_busy/);
 s.sql.prepare('UPDATE players SET gems=gems+1 WHERE id=?').run(s.id);
 const a=await s.control.resume(request),b=await s.control.resume(request);assert.deepEqual(a,b);assert.equal(s.readCount(),1);assert.equal(s.state.read('players',s.id).gems,1001);assert.throws(()=>s.control.freeze(request),/token_retired/);
});

test('unknown durability and failed snapshot keep resident and coordinator fenced',async t=>{
 const s=await setup(t);s.coordinator.durable=async()=>{throw Error('fsync-outcome-unknown');};
 await assert.rejects(s.coordinator.permanentPlayers([s.id],()=>s.sql.prepare('UPDATE players SET gems=gems+9 WHERE id=?').run(s.id)),/fsync-outcome-unknown/);
 assert.equal(s.coordinator.entries.get(s.id).phase,'unknown');assert(s.kernel.players.get(s.id).suspended);assert(s.lanes.busy(['player:'+s.id]));assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,1009);
 await assert.rejects(s.coordinator.permanentPlayers([s.id],()=>assert.fail('second write')),/permanent_actor_fenced/);
 assert.throws(()=>s.coordinator.reconciled(s.id,{incarnation:s.peer.incarnation,recovered:true}),/old_process_live/);
});

test('failed cold refresh never publishes old gear or reopens input',async t=>{
 const s=await setup(t);s.control.readBundle=async()=>{throw Error('read-worker-failed');};
 await assert.rejects(s.coordinator.permanentPlayers([s.id],()=>({ok:true})),/read-worker-failed/);
 assert.equal(s.control.entries.get(s.id).phase,'unknown');assert.equal(s.coordinator.entries.get(s.id).phase,'unknown');assert.throws(()=>s.frames.frame(s.id),/combat_frame_stale/);assert(s.kernel.players.get(s.id).suspended);assert(s.lanes.busy(['player:'+s.id]));
});

test('cold refresh replaces encounter checkpoint baseline after native row creation and deletion',async t=>{
 const s=await setup(t),read=s.control.readBundle,apply=s.control.applyBundle,encounters=new EncounterCheckpoints(id=>s.view.engagements.get(id)??null);encounters.hydrate(s.id,null);s.checkpoints.encounters=encounters;
 s.control.readBundle=async id=>({...await read(id),engagement:s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(id)??null});s.control.applyBundle=b=>{apply(b);s.view.setEngagement(b.player.id,b.engagement);};
 s.sql.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round) VALUES('golge-cold-encounter','Cold encounter fixture','forest',1,1000,1000,100,100,1)").run();const m={id:'golge-cold-encounter',spawn_round:1},entry={monster_id:m.id,spawn_round:m.spawn_round,next_hit_at_ms:s.nowMs+2000,last_skill_at_ms:s.nowMs},row={player_id:s.id,...entry,expires_at_ms:s.nowMs+8000,hit_sequence:0,updated_at_ms:s.nowMs,attackers489:JSON.stringify({[m.id]:entry})};
 await s.coordinator.permanentPlayers([s.id],()=>s.sql.prepare('INSERT INTO pve_engagements('+Object.keys(row).join(',')+') VALUES('+Object.keys(row).map(()=>'?').join(',')+')').run(...Object.values(row)));assert.deepEqual(encounters.snapshot(s.id),{base:row,current:row});
 const next={...row,updated_at_ms:row.updated_at_ms+1};s.view.setEngagement(s.id,next);await s.checkpoints.drain(s.id);assert.equal(s.sql.prepare('SELECT updated_at_ms FROM pve_engagements WHERE player_id=?').get(s.id).updated_at_ms,next.updated_at_ms);
 await s.coordinator.permanentPlayers([s.id],()=>s.sql.prepare('DELETE FROM pve_engagements WHERE player_id=?').run(s.id));assert.deepEqual(encounters.snapshot(s.id),{base:null,current:null});await s.checkpoints.drain(s.id);assert.equal(s.sql.prepare('SELECT * FROM pve_engagements WHERE player_id=?').get(s.id),undefined);assert.equal(s.faults.length,0);
});

test('synchronous rare error waits for fsync and reloads committed effects before returning the same error',async t=>{
 const s=await setup(t),error=Error('native-rule-error-after-commit'),durable=s.coordinator.durable;let release,started=false;const gate=new Promise(r=>release=r);t.after(()=>release());s.coordinator.durable=async()=>{started=true;await durable();await gate;};
 const pending=s.coordinator.permanentPlayers([s.id],()=>{s.sql.prepare('UPDATE players SET gems=gems+17 WHERE id=?').run(s.id);throw error;});void pending.catch(()=>{});
 await until(()=>started);assert.equal(s.kernel.players.get(s.id).suspended,true);assert.equal(s.state.read('players',s.id).gems,1000);assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,1017);assert.equal(s.coordinator.entries.get(s.id).phase,'frozen');
 release();await assert.rejects(pending,e=>e===error);assert.equal(s.state.read('players',s.id).gems,1017);assert.equal(s.kernel.players.get(s.id).suspended,false);assert.equal(s.lanes.busy(['player:'+s.id]),false);assert.equal(s.coordinator.entries.size,0);assert.equal(s.faults.length,0);
});

test('synchronous native rejection cannot release an owner after an unknown fsync result',async t=>{
 const s=await setup(t),unknown=Error('fsync-outcome-unknown');s.coordinator.durable=async()=>{throw unknown;};
 await assert.rejects(s.coordinator.permanentPlayers([s.id],()=>{throw Error('ordinary-native-rejection');}),e=>e===unknown);assert.equal(s.coordinator.entries.get(s.id).phase,'unknown');assert.equal(s.kernel.players.get(s.id).suspended,true);assert.equal(s.lanes.busy(['player:'+s.id]),true);assert.equal(s.readCount(),0);
});

test('owned asynchronous operation failure stays fenced and is never classified as an ordinary native rejection',async t=>{
 const s=await setup(t),unknown=Error('owned-commit-ack-lost');let durable=false;s.coordinator.durable=async()=>{durable=true;};
 await assert.rejects(s.coordinator.durablePlayers([s.id],async()=>{throw unknown;}),e=>e===unknown);assert.equal(durable,false);assert.equal(s.coordinator.entries.get(s.id).phase,'unknown');assert.equal(s.kernel.players.get(s.id).suspended,true);assert.equal(s.lanes.busy(['player:'+s.id]),true);assert.equal(s.readCount(),0);
});
