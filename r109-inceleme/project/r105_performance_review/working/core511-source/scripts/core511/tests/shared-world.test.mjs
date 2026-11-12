import test from 'node:test';
import assert from 'node:assert/strict';
import {SharedWorldMemory,SharedWorldRuntime} from '../shared-world.mjs';
import {WorldClock} from '../world-clock.mjs';
import {native} from './helpers.mjs';
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
const monster={id:'shared',area:'forest',channel:0,spawn_round:1,is_boss:0,is_stone:0,max_hp:100,hp:10,last_damaged_at_ms:0,last_regen_at_ms:0,root_until_ms:0,stun_until_ms:0,control_x:0,control_y:0,wave_stage:0};
test('four channel engagement replicas retain native expiry and a stale source cannot erase transferred combat',()=>{
 installRegistry({now:()=>100000});const view=new SharedWorldMemory();view.setMonster(monster);
 for(const channel of [1,2,3,4])view.receive([{actor:'p'+channel,epoch:1,channel,incarnation:'boot'+channel,engagement:{player_id:'p'+channel,monster_id:'shared',spawn_round:1,next_hit_at_ms:101000,expires_at_ms:102000,attackers489:'{}'}}]);
 const clock=new WorldClock({view,owns:m=>m.channel===0,blocked:()=>false,changed:()=>{}}),settings={monster_rest_regen_percent:10,monster_rest_regen_combat_delay_seconds:0};
 clock.regenerate(settings,100000);assert.equal(view.monster('shared').hp,10);assert.equal(view.engagedByMonster.get('shared').size,4);
 view.receive([{actor:'p1',epoch:2,channel:4,incarnation:'new4',engagement:{...view.engagements.get('p1'),expires_at_ms:110000}}]);
 view.receive([{actor:'p1',epoch:1,channel:1,incarnation:'boot1',engagement:null}]);assert.equal(view.engagements.get('p1').expires_at_ms,110000);
 assert.throws(()=>view.receive([{actor:'p1',epoch:2,channel:1,incarnation:'boot1',engagement:null}]),/shared_engagement_fenced/);
 clock.regenerate(settings,110000);assert.equal(view.monster('shared').hp,10,'expiry is inclusive');clock.regenerate(settings,111000);assert.equal(view.monster('shared').hp,20);
});
test('shared runtime retains newer projection changes during an outstanding send and drains zero-player checkpoints',async()=>{
 installRegistry({now:()=>100000});let now=100000,release;const sent=[],writes=[],hold=new Promise(r=>release=r),runtime=new SharedWorldRuntime({peer:{realm:'world-unit',channel:0,role:'world',incarnation:'boot'},initial:{system:{incarnation:'boot',epoch:1,sequence:0,online:1},world:{cycle:1},settings:{monster_rest_regen_percent:10,monster_rest_regen_combat_delay_seconds:0},monsters:[monster],engagements:[],config:{}},clock:()=>now,request:async(method,payload)=>{if(method==='world_projection'){sent.push(payload);if(sent.length===2)await hold;return {version:payload.version};}assert.equal(method,'system_command');writes.push(payload);return {key:payload.key,sequence:payload.sequence,result:{saved:payload.payload}};}});
 await runtime.activate();runtime.stop();runtime.started=true;
 now=101000;runtime.tick();await Promise.resolve();assert.equal(sent.length,2);assert.equal(sent[1].monsters[0].hp,60);
 now=102000;runtime.tick();assert.equal(runtime.view.monster('shared').hp,70);assert.equal(sent.length,2);release();await runtime.projecting;await runtime.project();assert.equal(sent[2].monsters[0].hp,70);
 await runtime.drain();assert.equal(writes.length,1);assert.equal(writes[0].payload.monsters[0].current.hp,70);assert.equal(writes[0].actor,undefined);
});
