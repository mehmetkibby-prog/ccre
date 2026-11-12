import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put,update,json} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {ResidentChannel} from '../resident-channel.mjs';
import {ChannelOwnership,registerOwnedRule} from '../ownership.mjs';
import {createActorCheckpointHandler} from '../actor-checkpoint.mjs';
import {createCombatCheckpointHandler} from '../combat-checkpoint.mjs';
import {createDungeonWriterHandler,readDungeonAdmission} from '../dungeon-runtime.mjs';
import {DungeonChannel} from '../dungeon-channel.mjs';
import {DungeonProjection} from '../dungeon-projection.mjs';
import {createRules} from '../generated/rules.mjs';
import {ReadWorker} from '../read-worker.mjs';

test('native dungeon room shares channel actor leases through write ACK, refresh and rare-operation drain',async t=>{
 const f=await setupPvp(t),{sql,id}=f;f.reset({area:'bazaar',actor:{level:50,x:1910,y:660},victim:{level:50,x:1910,y:660},extras:true});
 const ids=[id,f.targetId,'rival-extra'];update(sql,'players',ids[2],{level:50,x:1910,y:660});put(sql,'parties',{id:'channel-dungeon-party',leader_id:id,created_at:1});for(const player of ids)put(sql,'party_members',{party_id:'channel-dungeon-party',player_id:player,joined_at:1});
 let time=f.nowMs,hold=null;const authority=new ChannelOwnership(f.f.database,{realmId:'dungeon-channel',now:()=>time});await authority.initialize();const peer={channel:1,incarnation:'dungeon-channel-boot'},owners=new Map();await authority.registerProcess(1,peer.incarnation);
 for(const actor of ids)owners.set(actor,await authority.admit(actor,peer,{sessionId:'session-'+actor,guard:()=>true}));
 registerOwnedRule(authority,'actor_checkpoint',createActorCheckpointHandler(),{duringDrain:true,allowSimulation:true});registerOwnedRule(authority,'combat_checkpoint',createCombatCheckpointHandler({assertResources:()=>true}),{duringDrain:true,allowSimulation:true});
 registerOwnedRule(authority,'dungeon',createDungeonWriterHandler({globals:f.globals,stats:createRules({globals:f.globals}).calculateEquipmentStats,clock:()=>time,assertOwnership:(sql,p,id,e)=>Boolean(authority.assertSimulated(sql,p,id,e))}),{allowSimulation:true});
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());const loadActor=async(actor,epoch,revision)=>(await reader.query('kernel511_actor_bundle',[actor,1,peer.incarnation,epoch,revision,time])).rows;
 const bundles=await Promise.all(ids.map(actor=>loadActor(actor,owners.get(actor).epoch,0))),packets=[],faults=[];let channel,dungeon,projection;
 channel=new ResidentChannel({peer,globals:f.globals,initial:{world:bundles[0].world,settings:f.settings,profiles:bundles[0].profiles,monsters:[]},wall:()=>time,loadActor,
  requestWriter:async(p,r)=>{const value=await authority.command(p,r);if(r.operation==='dungeon'&&hold)await hold;return value;},send:(id,packet)=>packets.push({id,...packet}),onFatal:e=>faults.push(e),
  ports:{guard:()=>true,scope:()=>{},footprint:()=>({players:[],resources:[]}),affectedAttack:()=>[],affectedPvp:()=>[],rankingEligible:()=>false,monsterOwned:()=>true,changedArenaLife:()=>false,publish:()=>{},recordSecurityEvent:()=>{},respawn:()=>{},
   modeAction:ctx=>dungeon.action(ctx),modeTick:ctx=>dungeon?.tick(ctx),hydrateMode:b=>dungeon?.refreshActor(b),dropMode:id=>dungeon.drop(id),drainMode:id=>dungeon.drain(id),drainModeGroup:ids=>dungeon.drainActors(ids),
   project:({id,results,lastApplied,now})=>({results,lastApplied,...(projection?.changed(id,now)?{dungeon:true}:{})})}
 });t.after(()=>channel.stop());for(const b of bundles)channel.admit(b,{actor:b.actor,account:b.player.account_id,epoch:b.owner.epoch});
 dungeon=new DungeonChannel(channel,{globals:f.globals,initial:readDungeonAdmission(sql,ids),clock:()=>time,actorsFor:(actor,input)=>input.action==='create'?ids:[actor]});projection=new DungeonProjection(dungeon.resident);channel.kernel.stopped=false;
 const sequences=new Map(ids.map(p=>[p,0])),enqueue=(actor,command)=>channel.kernel.enqueue(actor,{sequence:sequences.set(actor,sequences.get(actor)+1).get(actor),epoch:owners.get(actor).epoch,kind:'combat',payload:{action:'dungeon',command}});
 let release;hold=new Promise(r=>release=r);enqueue(id,{action:'create'});channel.kernel.tick();await until(()=>sql.prepare('SELECT COUNT(*) n FROM dungeon_members').get().n===3);
 assert(ids.every(id=>channel.lanes.busy(['player:'+id])));assert.equal(channel.kernel.players.get(id).lastApplied,0);assert.equal(dungeon.locked(id),false);
 enqueue(f.targetId,{action:'ready',ready:true});const count=channel.kernel.metrics.inputs;channel.kernel.tick();assert.equal(channel.kernel.players.get(f.targetId).queue.length,1);assert.equal(channel.kernel.metrics.inputs,count);
 hold=null;release();await channel.kernel.players.get(id).barrier;await Promise.resolve();time+=50;channel.kernel.tick();await channel.kernel.players.get(f.targetId).barrier;await Promise.resolve();time+=50;channel.kernel.tick();
 enqueue(ids[2],{action:'ready',ready:true});channel.kernel.tick();await channel.kernel.players.get(ids[2]).barrier;await Promise.resolve();time+=50;channel.kernel.tick();assert.equal(dungeon.resident.runFor(id).status,'active');assert.equal(faults.length,0);
 const room=dungeon.resident.runFor(id);const writes=dungeon.resident.metrics.writerSteps;
 enqueue(id,{action:'move',x:1,y:0,sequence:1});time+=50;channel.kernel.tick();assert.equal(dungeon.resident.metrics.writerSteps,writes,'room move/tick remain memory-only');assert.equal(channel.kernel.players.get(id).lastApplied,sequences.get(id));
 // The first view builds the shared native image. Other viewers reuse it and
 // see the same fields as the unchanged per-viewer native projection.
 const at=dungeon.resident.rules.DungeonEngine.prototype.publicRun,engine={now:()=>time,refreshPumpkin499:()=>{}};
 const actualRoom=dungeon.resident.runFor(id);actualRoom.members[1].gmInvisible=true;dungeon.resident.versions.set(room.id,(dungeon.resident.versions.get(room.id)??0)+1);const before=projection.metrics.builds;
 for(const actor of ids){const snapshot=projection.snapshot(actor,time);assert.deepEqual(json(snapshot.run),json(at.call(engine,actualRoom,actor)));}
 assert.equal(projection.metrics.builds,before+1);assert(!projection.snapshot(id,time).run.members.some(p=>p.id===ids[1]));assert(projection.snapshot(ids[1],time).run.members.some(p=>p.id===ids[1]));
 const freeze=channel.control.freeze({id,epoch:owners.get(id).epoch,token:'dungeon-freeze-once'});channel.kernel.tick();const frozen=await freeze;assert(frozen.finalSequence>0);assert(channel.kernel.players.get(id).suspended);
 const saved=json(JSON.parse(sql.prepare('SELECT state FROM dungeon_runs WHERE id=?').get(room.id).state));time+=50;channel.kernel.tick();assert.deepEqual(json(dungeon.resident.runFor(id)),saved,'room cannot advance during rare-route freeze');
 await channel.control.resume({id,epoch:owners.get(id).epoch,token:'dungeon-freeze-once'});assert.equal(channel.kernel.players.get(id).suspended,false);assert.equal(faults.length,0);
 // Two cold targets share one room checkpoint. The unselected room member
 // remains alive but cannot advance that room while either cold lease is held.
 const requests=ids.slice(0,2).map(id=>({id,epoch:owners.get(id).epoch,token:'dungeon-group-'+id})),groupWrites=dungeon.resident.metrics.writerSteps;
 hold=new Promise(r=>release=r);const pair=channel.control.freezeGroup(requests);channel.kernel.tick();await until(()=>dungeon.resident.metrics.writerSteps>groupWrites);
 assert(ids.every(id=>channel.lanes.busy(['player:'+id])));assert(requests.every(r=>channel.kernel.players.get(r.id).suspended));assert.equal(channel.kernel.players.get(ids[2]).suspended,false);
 hold=null;release();const acks=await pair;assert.equal(acks.length,2);assert.equal(dungeon.resident.metrics.writerSteps,groupWrites+1);const frozenRoom=json(dungeon.resident.runFor(id));time+=50;channel.kernel.tick();assert.deepEqual(json(dungeon.resident.runFor(id)),frozenRoom);
 for(const request of requests)await channel.control.resume(request);assert(requests.every(r=>!channel.kernel.players.get(r.id).suspended));assert.equal(faults.length,0);
 // Logging out retires all client tickets/sequences but leaves an offline room
 // member under simulation-only authority. It no longer consumes a channel slot.
 const draining=channel.drain(id);channel.kernel.tick();const drained=await draining;
 const loggedOut=await authority.logout(id,peer,{epoch:drained.epoch,sessionId:'session-'+id,finalSequence:drained.finalSequence});assert.equal(loggedOut.simulation,room.id);assert.equal(authority.admission(id),null);assert.equal(authority.counts().get(1),2);
 const passive=await loadActor(id,loggedOut.epoch,50);channel.rebind(passive,{actor:id,account:passive.player.account_id,epoch:passive.owner.epoch});assert.equal(channel.kernel.activeCount,2);assert.equal(channel.kernel.players.get(id).passive,true);
 assert.throws(()=>channel.kernel.enqueue(id,{sequence:1,epoch:loggedOut.epoch,kind:'combat',payload:{action:'dungeon',command:{action:'attack'}}}),/actor_draining/);
 assert.throws(()=>authority.assertAdmitted(sql,peer,id,loggedOut.epoch),/owner_epoch_fenced/);assert.throws(()=>authority.assertSimulated(sql,peer,id,drained.epoch),/simulation_epoch_fenced/);
 const beforeVersion=dungeon.resident.versions.get(room.id);time+=50;channel.kernel.tick();assert(dungeon.resident.versions.get(room.id)>beforeVersion,'offline member does not pause remaining room players');
 const groupActors=[...channel.owners].map(([id,o])=>({id,epoch:o.epoch})),groupDrain=channel.kernel.quiesceGroup(groupActors);channel.kernel.tick();await groupDrain;await dungeon.drainGroup(ids);assert(groupActors.every(a=>channel.kernel.players.get(a.id).suspended));assert.deepEqual(json(dungeon.resident.runFor(id)),json(JSON.parse(sql.prepare('SELECT state FROM dungeon_runs WHERE id=?').get(room.id).state)),'whole room including passive member checkpoints once while frozen');for(const a of groupActors)channel.kernel.resume(a.id,a.epoch);
 await assert.rejects(authority.retireSimulation(id,peer,{epoch:loggedOut.epoch,finalSequence:channel.writer.finalSequence(id)}),/simulation_not_drained/);
 // A fresh login can resume this room only after its passive actor is drained.
 const resumeDrain=channel.drain(id);channel.kernel.tick();const passiveDrain=await resumeDrain;
 const active=await authority.admit(id,peer,{sessionId:'session-return',simulationFinalSequence:passiveDrain.finalSequence,guard:()=>true}),activeBundle=await loadActor(id,active.epoch,51);
 channel.rebind(activeBundle,{actor:id,account:activeBundle.player.account_id,epoch:active.epoch});assert.equal(channel.kernel.players.get(id).passive,false);assert.equal(authority.simulation(id),null);assert.equal(channel.kernel.activeCount,3);assert.equal(dungeon.resident.runFor(id).id,room.id);assert.equal(faults.length,0);
});
