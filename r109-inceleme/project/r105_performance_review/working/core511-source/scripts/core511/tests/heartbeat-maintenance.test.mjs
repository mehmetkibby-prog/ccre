import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {BASE} from './helpers.mjs';
import {setupWorldJobs} from './world-jobs-fixture.mjs';
import {seedGuildWar,captureGuildDatabase,put,update,json} from './guild-war-fixture.mjs';
import {seedHeartbeatRewards,heartbeatDescriptor} from './heartbeat-maintenance-fixture.mjs';
import {createAttackRules} from '../generated/attack-rules.mjs';
import {actionRandom} from '../action-writer.mjs';
import {OperationRandom} from '../operation-random.mjs';
import {runHeartbeatMaintenance} from '../heartbeat-maintenance.mjs';
import {HeartbeatJobs} from '../heartbeat-jobs.mjs';
const proof=JSON.parse(fs.readFileSync(new URL('../generated/heartbeat-proof.json',import.meta.url))),source=fs.readFileSync(path.join(BASE,proof.source),'utf8');
const oracle=Function('return async function(database,entry,settings,rules,record){const {actor:playerId,nowMs:heartbeatNowMs,heartbeat,cycle}=entry,now=Math.floor(heartbeatNowMs/1000),heartbeatCyclePromise=Promise.resolve({cycle}),heartbeatSettingsPromise=Promise.resolve(settings),settledHeartbeat={current:null};const {colLabIsPlayer,tryFinishArenaForfeit,settleArenaMatch,isArenaMode,tryCreateArenaMatch,awardPendingBossRewards,tryAwardPendingSinsiStoneRewards,awardPendingNormalRewards,tryFinalizePendingDropEnchantments}=rules,publishRealtimeRoomEvent=record,deliverRealtime=v=>v,tickWorld=()=>{},cleanupWorld=()=>{},runRewardMaintenance=(_db,fn)=>fn();'+source.slice(proof.maintenance.start+1,proof.maintenance.end-1)+';return settledHeartbeat;}')();

test('heartbeat deferred arena and reward batch matches the original async body, every native row and event',async t=>{
 const f=await setupWorldJobs(t),{sql,services,nowMs}=f,seed='c'.repeat(64);sql.function('unixepoch',{varargs:true},()=>Math.floor(nowMs/1000));sql.function('strftime',{varargs:true},format=>{assert.equal(format,'%s');return String(Math.floor(nowMs/1000));});
 for(const scenario of ['rewards','forfeit','guild','queue1','queue2','queue3','queue5']){
  sql.exec('SAVEPOINT scenario');try{
   f.reset({area:scenario==='forfeit'?'arena':'forest'});
   if(scenario==='rewards')seedHeartbeatRewards(f);
   if(scenario==='guild')seedGuildWar(f,{delta:300000});
   if(['forfeit','guild'].includes(scenario)){sql.prepare('UPDATE arena_matches SET starts_at_ms=?').run(nowMs-300000);update(sql,'players',f.targetId,{last_seen:1});}
   if(scenario.startsWith('queue')){
    const size=Number(scenario.slice(5));for(let n=0;n<size*2;n++){
     const id=n===0?f.id:n===1?f.targetId:'heartbeat-queue-'+n;if(n>1)put(sql,'players',{id,name:id,role:'avci',created_at:1,last_seen:Math.floor(nowMs/1000)});
     update(sql,'players',id,{area:'forest',channel:1,hp:1000,max_hp:1000,level:40,last_seen:Math.floor(nowMs/1000),combat_lock_until_ms:0,arena_match_id:''});
     put(sql,'arena_queue',{player_id:id,mode:size+'v'+size,channel:1,room_id:'heartbeat-room',team_name:n<size?'Alpha':'Beta',queued_at_ms:nowMs+n,last_seen_ms:nowMs});
    }
   }
   const entry=heartbeatDescriptor(f),events=[],record=(...a)=>events.push(a),integers=new OperationRandom(seed),rng={nowMs,...actionRandom(seed),integer:(...a)=>integers.integer(...a)},rules=createAttackRules({...rng,globals:services.globals,now:()=>nowMs,fourChannels:true,ports:{publishRealtimeRoomEvent:record,publishRealtimeRoomEventToChannels:record,publishRealtimePlayerEvent:record,publishRealtimeWorldEvent:record,deliverRealtime:v=>v,runRewardDelivery:(_db,_key,fn)=>fn()}});
   sql.exec('SAVEPOINT oracle');services.active=rng;let expectedResult,expected;try{expectedResult=await oracle(f.db,entry,f.settings,rules,record);expected=captureGuildDatabase(sql);}finally{services.active=null;sql.exec('ROLLBACK TO oracle;RELEASE oracle');}
   const actual=services.run({seed,nowMs},()=>runHeartbeatMaintenance(sql,entry,{services,settings:f.settings,authority:f.authority}));
   assert.deepEqual(captureGuildDatabase(sql),expected,scenario);assert.deepEqual(json(actual.result),json(expectedResult),scenario);assert.deepEqual(json(actual.events),json(events.filter(e=>!String(e[3]?.eventId??'').startsWith('heartbeat:'))),scenario);
   if(scenario==='rewards'){assert.equal(sql.prepare('SELECT COUNT(*) n FROM boss_reward_claims').get().n,1);assert.equal(sql.prepare('SELECT COUNT(*) n FROM sinsi_reward_claims').get().n,4);assert.equal(sql.prepare('SELECT COUNT(*) n FROM normal_reward_claims').get().n,6);assert.equal(sql.prepare('SELECT COUNT(*) n FROM boss_participants WHERE boss_round=8000').get().n,0);}
   if(scenario.startsWith('queue'))assert.equal(sql.prepare('SELECT COUNT(*) n FROM arena_match_players').get().n,2*Number(scenario.slice(5)));
  }finally{sql.exec('ROLLBACK TO scenario;RELEASE scenario');}
 }
});

test('one-shot heartbeat tasks survive selection of another actor and a newer descriptor during read-worker discovery',async()=>{
 const peers=[{channel:1,incarnation:'c1'},{channel:2,incarnation:'c2'}],owners=new Map([['a',{...peers[0],admitted:true,epoch:1}],['b',{...peers[1],admitted:true,epoch:1}]]),world={row:{peer:{incarnation:'world'}},core:{clock:()=>1000,writer:{owners},reader:{query:null}}},jobs=new HeartbeatJobs(world),entry=(actor,counter=1)=>({actor,counter,epoch:1,nowMs:1000,cycle:1,heartbeat:{channel:actor==='a'?1:2,area:'arena',arena_match_id:'match-'+actor}});
 jobs.schedule(peers[0],entry('a'));jobs.schedule(peers[1],entry('b'));world.core.reader.query=async(_name,{entries})=>{jobs.schedule(peers[1],entry('b',2));return {rows:entries[0]};};
 const chosen=await jobs.due(world.row.peer,{nowMs:1000,cycle:1});assert.equal(chosen.actor,'a');assert.equal(jobs.pending.size,1);assert.equal(jobs.pending.get('b').counter,2);jobs.complete(chosen);
 world.core.reader.query=async(_name,{entries})=>({rows:entries[0]});const second=await jobs.due(world.row.peer,{nowMs:1000,cycle:1});assert.equal(second.actor,'b');assert.equal(jobs.pending.size,0);jobs.complete(second);
});
