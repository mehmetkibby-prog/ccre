import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,json,put,update} from './pvp-fixture.mjs';
import {CombatFrames,readCombatBundle} from '../combat-frames.mjs';
import {readAttackFrame} from '../attack-writer.mjs';
import {readPvpFrame} from '../pvp-writer.mjs';
import {readRetaliationFrame} from '../retaliation-writer.mjs';

function cache(s,c){const frames=new CombatFrames({view:c.view,settings:()=>s.settings,world:()=>({cycle:1,reset_at:0}),party:id=>c.party.get(id),arena:id=>c.arenas.get(id),team:(id,pid)=>c.teams.get(id+':'+pid),participants:(id,mid,round)=>id===s.id&&mid==='golge-frame511'&&round===1,now:()=>s.nowMs});for(const p of c.view.players.values())frames.hydrate(readCombatBundle(s.sql,p.id,{revision:0,nowMs:s.nowMs}));frames.setProfiles(s.sql.prepare('SELECT * FROM all_monster_combat_profiles').all(),0);return frames;}
test('admission frames reproduce native gear/HP/world/PvP projections with all hot SQL disabled',async t=>{
 const s=await setupPvp(t),c=s.reset({area:'war'}),frames=cache(s,c);
 const oldAttack=readAttackFrame(s.sql,s.id,'',s.globals).player,oldPvp={...readPvpFrame(s.sql,s.id,s.targetId,s.globals,s.nowMs),settings:s.settings},prepare=s.sql.prepare;
 s.sql.prepare=()=>{throw Error('SQL in resident projection');};try{
  for(let n=0;n<1000;n++){assert.deepEqual(json(frames.frame(s.id)),json(oldAttack));assert.deepEqual(json(frames.pvp(s.id,c.context.payload,s.nowMs).actionSnapshot),json(oldPvp));}
 }finally{s.sql.prepare=prepare;}
 assert(frames.metrics.cacheHits>2900);assert.equal(frames.metrics.sqlReads,0);
 for(const id of ['',s.id,'bad_target','short','a'.repeat(65)])assert.deepEqual(json(frames.pvp(s.id,{...c.context.payload,targetPlayerId:id},s.nowMs).actionSnapshot),json({...readPvpFrame(s.sql,s.id,id,s.globals,s.nowMs),settings:s.settings}));
 update(s.sql,'players',s.targetId,{hp:0});c.view.setPlayer(s.sql.prepare('SELECT * FROM players WHERE id=?').get(s.targetId));assert.equal(frames.pvp(s.id,c.context.payload,s.nowMs).actionSnapshot.preloadedPvpTarget,null);
});
test('retaliation armor/profile/participant lookup equals native joins and follows current overlay HP',async t=>{
 const s=await setupPvp(t),c=s.reset({area:'forest'});put(s.sql,'monsters',{id:'golge-frame511',name:'Profile mob',area:'forest',channel:1,x:1000,y:1000,hp:1000,max_hp:1000,variant:'normal',is_boss:0,is_stone:0,summoned:0,spawn_round:1,respawn_at:0});
 put(s.sql,'monster_participants',{monster_id:'golge-frame511',spawn_round:1,player_id:s.id,created_at:Math.floor(s.nowMs/1000)});c.view.setMonster(s.sql.prepare('SELECT * FROM monsters WHERE id=?').get('golge-frame511'));const frames=cache(s,c),entries=[{monster_id:'golge-frame511',spawn_round:1}],nativeFrame=readRetaliationFrame(s.sql,s.id,entries);
 const actual=frames.retaliation(s.id,entries);assert.deepEqual(json({player:actual.player,monsters:actual.monsters,armorItems:actual.armorItems}),json(nativeFrame));
 const overlay={player:id=>({...c.view.player(id),hp:400,hp_revision:11}),monster:id=>({...c.view.monster(id),hp:555})},live=frames.retaliation(s.id,entries,overlay);assert.equal(live.player.hp,400);assert.equal(live.player.hp_revision,11);assert.equal(live.monsters[0].hp,555);assert.equal(live.monsters[0].provoked,1);
});
test('equipment invalidation fails closed, fresh bundles restore native stats and pets expire in memory',async t=>{
 const s=await setupPvp(t),c=s.reset({area:'forest'}),frames=cache(s,c);frames.invalidate(s.id);assert.throws(()=>frames.frame(s.id),/combat_frame_stale/);
 put(s.sql,'player_items',{id:'frame-weapon',player_id:s.id,kind:'weapon',item_name:'Native Bow',rarity:'white',power:50,role:'avci',equipped:1,enchantments:'[]',created_at:1});put(s.sql,'player_pets',{player_id:s.id,kind:'dragon',equipped:1,acquired_at:Math.floor(s.nowMs/1000)});
 frames.hydrate(readCombatBundle(s.sql,s.id,{revision:1,nowMs:s.nowMs}));assert.deepEqual(json(frames.frame(s.id)),json(readAttackFrame(s.sql,s.id,'',s.globals).player));assert.equal(frames.pet(s.id),'dragon');assert.equal(frames.pet(s.id,s.nowMs+604801000),null);assert.equal(frames.dragon(s.id,s.nowMs+604801000),null);assert.throws(()=>frames.hydrate(readCombatBundle(s.sql,s.id,{revision:0})),/combat_bundle_stale/);
});
