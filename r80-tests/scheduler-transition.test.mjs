import test from 'node:test';
import assert from 'node:assert/strict';
import {schedulerFixture,fastScoped,heartbeatEntry,START_MS} from './helpers/scheduler-fixture.mjs';

function transitionOrder(h){
 const names=h.calls.map(row=>row.name);
 const stages=['request.world_transition_prepare','sharedCombat.idle','journal.drain','writer.drain','project','writer.world_transition','transition.refreshed'];
 let prior=-1;
 for(const name of stages){const at=names.indexOf(name);assert.ok(at>prior,name+' must follow its predecessor');prior=at;}
 assert.equal(h.jobs.blocked,false);assert.equal(h.jobs.transition,null);
}

test('a real heartbeat transition on a fast tick retains all drain and refresh boundaries',async t=>{
 let entry;
 const h=schedulerFixture(t,{heartbeat:()=>h.offset===0?fastScoped():entry});
 entry=heartbeatEntry();
 await h.tick(0);await h.tick(50);
 assert.equal(h.count('writer.world_upkeep'),1);
 assert.equal(h.count('request.world_player_jobs'),1);
 const command=h.named('writer.world_transition')[0].payload;
 assert.equal(command.payload.mode,'heartbeat');assert.deepEqual(command.payload.heartbeatJob,entry);
 transitionOrder(h);
});

for(const mode of ['reset','guardian'])test('a new '+mode+' deadline preempts a fast reward retry without repeating upkeep',async t=>{
 const h=schedulerFixture(t,{heartbeat:fastScoped});
 await h.tick(0);
 const due=Math.floor((START_MS+50)/1000);
 if(mode==='reset')h.runtime.initial.world.reset_at=due;else h.runtime.initial.world.guardian_reward_at=due;
 await h.tick(50);
 assert.equal(h.count('writer.world_upkeep'),1);
 assert.equal(h.count('request.heartbeat_due'),1);
 assert.equal(h.named('writer.world_transition')[0].payload.payload.mode,mode);
 assert.equal(h.runtime.initial.world.cycle,mode==='reset'?2:1);
 transitionOrder(h);
});

for(const [mode,option]of [['guild_timeout','guildDue'],['dungeon_cleanup','dungeonDue']])test(mode+' is not starved by a continuous fast reward backlog',async t=>{
 const h=schedulerFixture(t,{heartbeat:fastScoped,[option]:fixture=>fixture.offset>=50});
 await h.ticks(1050);
 assert.deepEqual(h.times('writer.world_upkeep'),[0,1000]);
 assert.deepEqual(h.times('writer.world_transition'),[1000]);
 assert.equal(h.named('writer.world_transition')[0].payload.payload.mode,mode);
 transitionOrder(h);
});

for(const status of ['skipped','aborted'])test(status+' heartbeat prepare releases the local block without issuing a transition',async t=>{
 const h=schedulerFixture(t,{heartbeat:()=>h.offset===0?fastScoped():h.offset===50?heartbeatEntry():null,prepare:status});
 await h.tick(0);await h.tick(50);
 assert.equal(h.count('request.world_transition_prepare'),1);
 assert.equal(h.count('writer.world_transition'),0);
 assert.equal(h.count('journal.drain'),0);
 assert.equal(h.jobs.blocked,false);assert.equal(h.jobs.transition,null);
 await h.tick(1000);assert.equal(h.count('writer.world_upkeep'),2);
});

test('global prepare must wait for the already accepted lifecycle task',async t=>{
 let release;const lifecycle=new Promise(resolve=>{release=resolve;});
 const h=schedulerFixture(t,{heartbeat:heartbeatEntry});h.runtime.lifecycle.pending=lifecycle;
 const pending=h.begin(0);await new Promise(resolve=>setImmediate(resolve));
 assert.equal(h.jobs.blocked,true);assert.equal(h.count('request.world_transition_prepare'),0);
 h.runtime.lifecycle.pending=null;release();await pending;transitionOrder(h);
});

test('prepare failure retains the unknown transition and reports failure',async t=>{
 const error=Object.assign(Error('prepare_failed'),{code:'prepare_failed'});
 const h=schedulerFixture(t,{heartbeat:heartbeatEntry,prepare:()=>{throw error;}});
 await assert.rejects(h.tick(0),value=>value===error);
 assert.equal(h.count('writer.world_transition'),0);
 assert.equal(h.jobs.blocked,true);assert.ok(h.jobs.transition);assert.deepEqual(h.failures,[error]);
});

test('unverified skip acknowledgement cannot release the transition block',async t=>{
 const h=schedulerFixture(t,{heartbeat:heartbeatEntry,prepare:(_fixture,payload)=>({...payload,cycle:payload.cycle+1,prepared:false,skipped:true})});
 await assert.rejects(h.tick(0),error=>error.code==='world_transition_skip_ack');
 assert.equal(h.jobs.blocked,true);assert.ok(h.jobs.transition);
 assert.equal(h.count('writer.world_transition'),0);
});

test('commit failure is not converted to success or a resumed world',async t=>{
 const error=Object.assign(Error('commit_failed'),{code:'commit_failed'});
 const h=schedulerFixture(t,{heartbeat:heartbeatEntry,commit:()=>{throw error;}});
 await assert.rejects(h.tick(0),value=>value===error);
 assert.equal(h.count('writer.world_transition'),1);
 assert.equal(h.jobs.blocked,true);assert.ok(h.jobs.transition);assert.deepEqual(h.failures,[error]);
});

test('a transition receipt without the required refresh remains a fatal error',async t=>{
 const h=schedulerFixture(t,{heartbeat:heartbeatEntry,refresh:false});
 await assert.rejects(h.tick(0),error=>error.code==='world_transition_refresh_missing');
 assert.equal(h.count('writer.world_transition'),1);
 assert.equal(h.jobs.blocked,true);assert.ok(h.jobs.transition);
});
