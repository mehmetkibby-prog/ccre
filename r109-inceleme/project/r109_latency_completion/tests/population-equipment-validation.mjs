// TEST ONLY: focused validation, not a load/capacity result.
// Run with the pinned native runner and STUTTER_TREE pointing at the selected
// working tree. Uses a fresh temporary native database, never production.
// Fixture debugging retained here: initial clone setup failed account uniqueness
// and channel capacity; corrected by unique accounts and four-channel spread,
// without disabling either guard. Native helmet generation required selecting
// the legal stone-profile family and bounded re-rolls. The first lethal subtest
// lacked adventure_settings; using createAdventureSchema fixed that fixture.
// Native ownership/resource guards are isolated stubs in this focused test;
// full authority/receipt replay coverage remains in the existing native suite.
import assert from 'node:assert/strict';
import {seedPopulationEquipment,populationWeaponCounterSnapshot} from './population-equipment.mjs';
const tree=process.env.STUTTER_TREE,core=tree+'/core511-source/scripts/core511';
const {setupEntry}=await import(core+'/tests/entry-fixture.mjs');
const {put}=await import(core+'/tests/pvp-fixture.mjs');
const {readAttackFrame,createAttackWriterHandler}=await import(core+'/attack-writer.mjs');
const {until}=await import(core+'/tests/helpers.mjs');
const {createAdventureSchema}=await import(core+'/adventure-schema.mjs');
const clean=[],f=await setupEntry({after:fn=>clean.push(fn)}),q=f.sql,db=f.f.database;
try{
 createAdventureSchema(q);
 q.prepare("UPDATE players SET level=65,skill_one=5,skill_two=5,skill_three=5,skill_four=1,area='forest',x=1000,y=1000,hp=100000,max_hp=100000,attack_one_at=0,attack_two_at=0,attack_three_at=0,attack_four_at=0 WHERE id=?").run(f.id);
 const template=q.prepare('SELECT * FROM players WHERE id=?').get(f.id),account=q.prepare('SELECT * FROM accounts WHERE id=?').get(template.account_id),actors=[];
 for(let n=0;n<40;n++){const id=n?'equipment-player-'+n:f.id;if(n){const aid='equipment-account-'+n;put(q,'accounts',{...account,id:aid,username:aid,username_normalized:aid,email:aid+'@fixture.invalid',email_normalized:aid+'@fixture.invalid'});put(q,'players',{...template,id,account_id:aid,name:'Equipment '+n,channel:n%4+1});}actors.push({n,id,zone:'forest'});}
 const seeded=await seedPopulationEquipment(q,actors,{tree,rotateRoles:true,nowMs:f.nowMs});
 assert.equal(seeded.itemCount,1400);assert.equal(q.prepare('SELECT count(*) n FROM player_items').get().n,1400);
 for(const actor of actors){const row=q.prepare('SELECT count(*) n,sum(equipped) equipped FROM player_items WHERE player_id=?').get(actor.id);assert.equal(row.n,35);assert.equal(row.equipped,5);assert(actor.equipmentFixture.abilities.every(a=>a.available));assert.equal(q.prepare('SELECT count(*) n FROM player_pets WHERE player_id=?').get(actor.id).n,1);}
 assert(populationWeaponCounterSnapshot(q,actors).every(r=>r.kills===0));
 const actor=actors[4],mid='golge-equipment-counter511';
 put(q,'monsters',{id:mid,name:'Counter fixture',area:'forest',channel:1,x:1000,y:1000,hp:1,max_hp:1000,variant:'normal',is_boss:0,is_stone:0,summoned:0,spawn_round:1,respawn_at:0});
 const settings={...q.prepare('SELECT * FROM game_settings WHERE id=1').get(),...q.prepare('SELECT * FROM combat_settings WHERE id=1').get()},nowMs=f.nowMs;
 const handler=createAttackWriterHandler({settingsFor:()=>settings,globalsFor:()=>f.globals,assertOwnership:()=>true,assertResources:()=>true,settleRetaliation:()=>null,clock:()=>nowMs});
 const input={action:'attack',targetId:mid,spawnRound:1,ability:0,intentId:'equipment-counter-intent',requestId:'equipment-counter-request'},frame=readAttackFrame(q,actor.id,mid,f.globals);
 assert.equal(frame.player.pet_kind,'starter');assert.equal(frame.player.wings_equipped,1);assert(frame.player.equipped_weapon_id);
 const payload={nowMs,receivedAtMs:nowMs,seed:'1'.repeat(64),input,expected:{...frame,settings}};
 let release;const held=new Promise(r=>release=r),durable=db.durableAfterCommit.bind(db);db.durableAfterCommit=()=>durable().then(()=>held);
 let returned=false;const pending=db.atomic(sql=>f.services.run(payload,()=>handler(sql,payload,{actor:actor.id,peer:{channel:1},epoch:1}))).then(ack=>{returned=true;return ack;});pending.catch(()=>{});
 try{await until(()=>populationWeaponCounterSnapshot(q,[actor])[0].kills===1,3000);assert.equal(returned,false,'counter must not acknowledge before durability');}finally{release();db.durableAfterCommit=durable;}
 const ack=await pending;assert.equal(ack.result.body.hits[0].killed,true);assert.equal(populationWeaponCounterSnapshot(q,[actor])[0].kills,1);
 console.log(JSON.stringify({passed:true,actors:40,items:seeded.itemCount,classes:[...new Set(seeded.actors.map(a=>a.role))],equippedPerActor:5,bagPerActor:30,starterPets:40,wings:40,counterAfterKill:1,ackHeldUntilDurability:true,firstAbilityPlan:actors[1].equipmentFixture.abilities}));
}catch(e){console.error(e);process.exitCode=1;}finally{for(const fn of clean.reverse())await fn();}
