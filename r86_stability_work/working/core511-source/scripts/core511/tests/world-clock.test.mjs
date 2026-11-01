import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {native,hash,seeded} from './helpers.mjs';
import {AggroMemory} from '../aggro-memory.mjs';
import {WorldClock} from '../world-clock.mjs';
const {WorldLoop}=await native('vds-server/src/world-loop.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
test.beforeEach(()=>installRegistry({now:()=>100000}));
const json=x=>JSON.parse(JSON.stringify(x));
const monster=(id,channel=2)=>({id,channel,area:'forest',x:0,y:0,hp:50,max_hp:100,spawn_round:1,is_boss:0,is_stone:0,last_damaged_at_ms:0,last_regen_at_ms:0,respawn_at:0,despawn_at:0});

test('world-clock formulas are pinned to the original five native methods',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/world-clock-proof.json',import.meta.url)));
 assert.equal(hash(fs.readFileSync(new URL('../generated/world-clock-rules.mjs',import.meta.url))),proof.generatedSha256);
 for(const row of proof.slices){const original=WorldLoop.prototype[row.name].toString();assert.equal(hash(original),row.sha256);let changed=original;for(const [a,b]of row.edits)changed=changed.replace(a,b);assert.equal(Object.getPrototypeOf(WorldClock.prototype)[row.name].toString(),changed);}
});
test('native regeneration parity covers combat expiry, spawn rounds, rounding, one-second cadence and five-second cap',()=>{
 const view=new AggroMemory({channel:2,cycle:1,now:()=>100000}),rng=seeded(142),changes=[];
 for(let i=0;i<600;i++){const max=1+Math.floor(rng()*100000);view.setMonster({...monster('m'+i,i%3?2:0),max_hp:max,hp:i%17?Math.floor(rng()*max)+1:0,last_damaged_at_ms:Math.floor(rng()*100000),last_regen_at_ms:i%5?0:99999,spawn_round:i%3});}
 for(let i=0;i<100;i++)view.setEngagement('p'+i,{monster_id:'m'+i,spawn_round:i%4,next_hit_at_ms:110000,expires_at_ms:i%2?100000:99999,attackers489:'{}'});
 const original={channel:2,now:()=>100000,monsters:new Map([...view.monsters].map(([id,row])=>[id,{...row}])),engagements:view.engagements,engagedByMonster:view.engagedByMonster,regenClocks:new Map(),monster(id){return this.monsters.get(id);}};
 original.combat={enabled:true,updateMonster:(row,patch)=>original.monsters.set(row.id,{...row,...patch})};
 const clock=new WorldClock({view,owns:m=>m.channel===2,blocked:()=>false,changed:c=>changes.push(c)});
 const initial=[...view.monsters.values()];
 for(const percent of [0,-2,.01,1,13.5,100])for(const delay of [0,1,15]){
  for(const row of initial){view.setMonster(row);original.monsters.set(row.id,{...row});}clock.regenClocks.clear();original.regenClocks.clear();
  for(const now of [100000,100999,101000,103001,200000]){
  const settings={monster_rest_regen_percent:percent,monster_rest_regen_combat_delay_seconds:delay};
  assert.equal(clock.regenerate(settings,now),WorldLoop.prototype.regenerate.call(original,settings,now));
  assert.deepEqual(json([...view.monsters]),json([...original.monsters]));assert.deepEqual(clock.regenClocks,original.regenClocks);
 }}
 assert(changes.length>100,'exercise real native HP mutations');
});
test('reverse engagement index removes replaced and detached players; held monsters do not advance clocks',()=>{
 const view=new AggroMemory({channel:4,cycle:1});view.setMonster(monster('m',4));view.setMonster(monster('shared',0));
 view.setEngagement('p',{monster_id:'m',spawn_round:1,next_hit_at_ms:110000,expires_at_ms:100000,attackers489:'{}'});assert.deepEqual([...view.engagedByMonster.get('m')],['p']);
 view.setEngagement('p',{attackers489:JSON.stringify({shared:{monster_id:'shared',spawn_round:1,next_hit_at_ms:110000}}),expires_at_ms:120000});assert(!view.engagedByMonster.has('m'));assert(view.engagedByMonster.get('shared').has('p'));
 view.removePlayer('p');assert.equal(view.engagedByMonster.size,0);
 let held=true;const changes=[],clock=new WorldClock({view,owns:m=>m.channel===4,blocked:()=>held,changed:c=>changes.push(c)}),settings={monster_rest_regen_percent:10,monster_rest_regen_combat_delay_seconds:0};
 clock.regenerate(settings,100000);assert.equal(view.monster('m').hp,50);assert.equal(clock.regenClocks.size,0);
 held=false;clock.regenerate(settings,100001);assert.equal(view.monster('m').hp,100);assert.equal(view.monster('shared').hp,50);assert.equal(changes.length,1);
});
test('separate shared-world owner alone regenerates shared monsters; fourth-channel repair and due rules retain native boundaries',()=>{
 const view=new AggroMemory({channel:4,cycle:1});for(const row of [monster('shared',0),monster('local',4),{...monster('stone-boss-black-c4',4),hp:0}, {...monster('due',4),hp:0,respawn_at:100},{...monster('other-due',0),hp:0,respawn_at:100}])view.setMonster(row);
 const create=channel=>new WorldClock({view,owns:m=>m.channel===channel,blocked:()=>false,changed:()=>{}}),world=create(0),local=create(4),settings={monster_rest_regen_percent:10,monster_rest_regen_combat_delay_seconds:0,black_stone_boss_enabled:1};
 world.regenerate(settings,100000);assert.equal(view.monster('shared').hp,100);assert.equal(view.monster('local').hp,50);
 assert.deepEqual(world.due(100).map(m=>m.id),['other-due']);assert.deepEqual(local.due(100).map(m=>m.id),['due']);
 assert.equal(local.needsRepair(settings),true);view.setMonster({...view.monster('stone-boss-black-c4'),respawn_at:101});assert.equal(local.needsRepair(settings),false);
 assert.equal(local.needsRepair({...settings,black_stone_boss_enabled:0}),true);
});
test('repair and despawn candidate sets collect exactly the original native predicates, including a stale summoned parent',()=>{
 const view=new AggroMemory({channel:2,cycle:1});for(const row of [{...monster('parent',2),spawn_round:5,is_stone:1},{...monster('child',2),hp:0,summoned:1,parent_stone_id:'parent',spawn_round:4},{...monster('normal',2),hp:0},{...monster('stone-boss-black-c2',2),hp:80},{...monster('expired',2),is_boss:1,despawn_at:100},{...monster('shared',0),hp:0}])view.setMonster(row);
 const clock=new WorldClock({view,owns:m=>m.channel===2,blocked:()=>false,changed:()=>{}}),settings={black_stone_boss_enabled:0},repair=[],despawn=[];
 for(const [id,row]of view.monsters){const isolated={...clock,channel:2,monster:key=>view.monster(key),monsters:{keys:()=>[id].values(),values:()=>[row].values(),get:key=>view.monster(key)}};if(WorldLoop.prototype.needsRepair.call(isolated,settings))repair.push(id);if(row.channel===2&&WorldLoop.prototype.needsDespawn.call(isolated,100))despawn.push(id);}
 assert.deepEqual(clock.repairCandidates(settings).map(m=>m.id),repair);assert.deepEqual(clock.despawnCandidates(100).map(m=>m.id),despawn);assert.deepEqual(repair,['child','normal','stone-boss-black-c2']);assert.deepEqual(despawn,['expired']);
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/world-clock-proof.json',import.meta.url)));for(const row of proof.derived)assert.equal(hash(Object.getPrototypeOf(WorldClock.prototype)[row.name].toString()),row.generatedSha256);
});
