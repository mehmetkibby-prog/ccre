import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {AggroMemory} from '../aggro-memory.mjs';
import {native,hash,seeded} from './helpers.mjs';
const {WorldLoop}=await native('vds-server/src/world-loop.mjs');
const {installRegistry}=await native('vds-server/src/loadlab/registry.mjs');
// Install the actual native, disabled laboratory registry. Missing registry is
// deliberately fail-closed in production; the fixture must obey that contract.
test.beforeEach(()=>installRegistry({now:()=>100000}));
test('engagement index compares the captured scalar snapshot even when an input getter changes',()=>{
 const view=new AggroMemory({channel:1,cycle:1,now:()=>100000}),entry=id=>JSON.stringify({[id]:{monster_id:id,spawn_round:1,next_hit_at_ms:200000,last_skill_at_ms:100000}}),a=entry('a'),b=entry('b'),row={player_id:'p',monster_id:'a',spawn_round:1,next_hit_at_ms:200000,last_skill_at_ms:100000,attackers489:a};
 view.setEngagement('p',row);let reads=0;const input=Object.freeze({...row,get attackers489(){return ++reads===1?a:b;}});view.setEngagement('p',input);
 assert.equal(reads,1);assert.equal(view.engagements.get('p').attackers489,a);assert(view.engagedByMonster.get('a').has('p'));assert(!view.engagedByMonster.has('b'));
 view.setEngagement('p',{...row,monster_id:'b',attackers489:b});assert(!view.engagedByMonster.has('a'));assert(view.engagedByMonster.get('b').has('p'));
});
const json=value=>JSON.parse(JSON.stringify(value));
function originalView(memory){
 const view={now:memory.now,players:memory.players,monsters:memory.monsters,engagements:memory.engagements,activePlayers:new Set(memory.activePlayers),monstersByScope:new Map(),player:id=>memory.player(id),monster:id=>memory.monster(id)};
 for(const row of memory.monsters.values()){
  let area=view.monstersByScope.get(row.area);if(!area)view.monstersByScope.set(row.area,area=new Map());
  let ids=area.get(row.channel);if(!ids)area.set(row.channel,ids=new Set());ids.add(row.id);
 }
 return view;
}
test('aggro storage change preserves native method apart from grid lookup and fourth-channel id families',()=>{
 const proof=JSON.parse(fs.readFileSync(new URL('../generated/aggro-proof.json',import.meta.url))),original=WorldLoop.prototype.nearby.toString();
 assert.equal(hash(original),proof.methodSha256);
 assert.equal(hash(fs.readFileSync(new URL('../generated/aggro-rules.mjs',import.meta.url))),proof.generatedSha256);
 const optimized=Object.getPrototypeOf(AggroMemory.prototype).nearby.toString();
 assert.equal(optimized,original.replace('channels=this.monstersByScope.get(p.area)','channels=this.candidateScopes(p)').replaceAll('rune-v2-boss-c[1-3]-1','rune-v2-boss-c[1-4]-1').replace("base.id==='stone-boss-black-c3'","base.id==='stone-boss-black-c3'||base.id==='stone-boss-black-c4'"));
});
test('spatial native aggro equals V510 full scan across seeded players, targets, deaths, existing encounters and map changes',()=>{
 const rng=seeded(771),now=100000,memory=new AggroMemory({channel:1,cycle:1,now:()=>now});
 for(let i=0;i<25;i++)memory.setPlayer({id:'game-p'+i,x:rng()*1200,y:rng()*1200,hp:i%11?100:0,area:i%7?'forest':'event',channel:1,last_seen:i%9?100:0});
 for(let i=0;i<1200;i++)memory.setMonster({id:(i%11?'game-m':'yutan')+i,x:rng()*2000,y:rng()*2000,hp:i%13?100:0,max_hp:100,area:i%7?'forest':'event',channel:i%3?1:0,spawn_round:i%4,is_stone:i%29?0:1,is_boss:i%31?0:1});
 let selected=0;
 for(let turn=0;turn<24;turn++){
  const original=originalView(memory);
  for(const id of memory.players.keys())for(const multiple of [false,true]){
   const a=WorldLoop.prototype.nearby.call(original,id,now,multiple),b=memory.nearby(id,now,multiple);assert.deepEqual(json(b),json(a),id+' turn '+turn+' multiple '+multiple);if(Array.isArray(b)?b.length:b)selected++;
  }
  const id='game-p'+(turn%25),player=memory.player(id);memory.setPlayer({...player,x:rng()*1200,y:rng()*1200,hp:100});
  const nearest=memory.nearby(id,now,true)?.slice(0,3)??[],attackers=Object.fromEntries(nearest.map(v=>[v.monster.id,{monster_id:v.monster.id,spawn_round:v.monster.spawn_round,next_hit_at_ms:now+1000,last_skill_at_ms:0}]));
  memory.setEngagement(id,{player_id:id,attackers489:JSON.stringify(attackers)});
  const monster=memory.monster('game-m'+(turn*7+1));if(monster)memory.setMonster({...monster,hp:0,x:monster.x+800});
 }
 assert(selected>100,'comparison must exercise nonempty target selections');
});
test('channel4 boss exclusion, aggro radius and 32-encounter limit match native channel families',()=>{
 const now=100000,memory=new AggroMemory({channel:4,cycle:1,now:()=>now});
 memory.setPlayer({id:'p',x:0,y:0,hp:100,area:'black',channel:4,last_seen:100});
 const base={x:369,y:0,hp:100,max_hp:100,area:'black',channel:4,spawn_round:1,is_stone:0,is_boss:0};
 memory.setMonster({...base,id:'stone-boss-black-c4'});assert.equal(memory.nearby('p').monster.id,'stone-boss-black-c4');
 memory.removeMonster('stone-boss-black-c4');memory.setPlayer({...memory.player('p'),area:'rune_v2'});
 memory.setMonster({...base,id:'rune-v2-boss-c4-1',x:1,area:'rune_v2'});assert.equal(memory.nearby('p'),null);
 memory.removeMonster('rune-v2-boss-c4-1');memory.setPlayer({...memory.player('p'),area:'forest'});
 const attackers={};for(let i=0;i<40;i++){const id='m'+String(i).padStart(2,'0');memory.setMonster({...base,id,x:i,y:0,area:'forest'});if(i<31)attackers[id]={monster_id:id,spawn_round:1,next_hit_at_ms:now+1};}
 memory.setEngagement('p',{attackers489:JSON.stringify(attackers)});assert.deepEqual(memory.nearby('p',now,true).map(r=>r.monster.id),['m31']);
 attackers.m31={monster_id:'m31',spawn_round:1,next_hit_at_ms:now+1};memory.setEngagement('p',{attackers489:JSON.stringify(attackers)});assert.deepEqual(memory.nearby('p',now,true),[]);
});
