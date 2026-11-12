import {fileURLToPath as reviewFilePath} from 'node:url';
const reviewWorkspace=reviewFilePath(new URL('../../',import.meta.url));
import test from 'node:test';
import assert from 'node:assert/strict';
const tree=process.env.STUTTER_TREE||(reviewWorkspace+'r105_performance_review/working');
const {ResidentChannel}=await import(tree+'/core511-source/scripts/core511/resident-channel.mjs');
const area='kadim_0123456789abcdef0123456789abcdef_01';
function scenario(){
 const monsters=new Map(),players=new Map(),baseline=new Map();
 const c=Object.assign(Object.create(ResidentChannel.prototype),{owners:new Map([['p',{epoch:1}]]),peer:{channel:1,incarnation:'fixture'},world:{cycle:7},revision:0,
  presence:{merge:p=>p},fishing:new Map(),membership:{hydrate(){}},mounts:{enabled:false},frames:{hydrate(){}},ports:{hydrateMode(){}},globals:{__colAdventure:{profile:()=>({})}},
  combatCheckpoints:{seedMonsters:rows=>{for(const m of rows)if(!baseline.has(m.id))baseline.set(m.id,m);}},
  view:{setPlayer:p=>players.set(p.id,p),setEngagement(){},monster:id=>monsters.get(id),setMonster:m=>monsters.set(m.id,Object.freeze({...m}))}});
 const bundle=rows=>({player:{id:'p',area,channel:1},owner:{epoch:1,incarnation:'fixture'},world:{cycle:7},revision:2,combat:{revision:2},adventure:{monsters:rows},engagement:null});
 const mob={id:'curuk-adv-0123456789abcdef0123456789abcdef',channel:1,area,spawn_round:1,x:100,y:100,hp:85,max_hp:85,stun_until_ms:0};
 return {c,monsters,baseline,bundle,mob};
}
test('late actor snapshot cannot restore already accepted monster damage or movement',()=>{
 const {c,monsters,bundle,mob}=scenario();const latest={...mob,hp:18,x:155,stun_until_ms:20000};c.setMonster(latest);
 c.applyBundle(bundle([{...mob,hp:49}]));assert.deepEqual(monsters.get(mob.id),latest);
});
test('late actor snapshot cannot resurrect a monster after a confirmed defeat',()=>{
 const {c,monsters,bundle,mob}=scenario();c.setMonster({...mob,hp:0});c.applyBundle(bundle([mob]));assert.equal(monsters.get(mob.id).hp,0);
});
test('joining a new floor seeds previously unknown monsters and their combat checkpoint',()=>{
 const {c,monsters,baseline,bundle,mob}=scenario();c.applyBundle(bundle([mob]));assert.deepEqual(monsters.get(mob.id),mob);assert.deepEqual(baseline.get(mob.id),mob);
});
test('explicit committed monster state still replaces the current row',()=>{
 const {c,monsters,bundle,mob}=scenario();c.applyBundle(bundle([mob]));c.setMonster({...mob,hp:0});assert.equal(monsters.get(mob.id).hp,0);
});
test('actor snapshots retain the original realm and ownership fencing',()=>{
 const {c,monsters,bundle,mob}=scenario();const b=bundle([mob]);b.owner.epoch=2;assert.throws(()=>c.applyBundle(b),/resident_bundle_fenced/);assert.equal(monsters.size,0);
});
