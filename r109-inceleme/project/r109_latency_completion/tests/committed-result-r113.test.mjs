import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,update,put} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {GameWriter} from '../working/core511-source/scripts/core511/writer-runtime.mjs';
import {readActorWorldBundle} from '../working/core511-source/scripts/core511/read-worker.mjs';
import {ColdWorldReader} from '../working/core511-source/scripts/core511/cold-world.mjs';
import {createTowerSchema} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {readCommitRevisionR113} from '../working/core511-source/scripts/core511/commit-revision-r113.mjs';
import {applyCommittedResultR113} from '../working/core511-source/scripts/core511/committed-apply-r113.mjs';
const wire=v=>JSON.parse(JSON.stringify(v));
async function scene(t){
 const f=await setupPvp(t);f.reset({area:'forest'});createTowerSchema(f.sql);createAdventureSchema(f.sql);
 const writer=new GameWriter(f.f.database,{realmId:'r113',ports:{guard:()=>true}});await writer.initialize();
 const peer={channel:1,incarnation:'r113-test'};await writer.register(peer);const owner=await writer.admit(f.id,peer,{sessionId:'r113-test-session',guard:()=>true});
 const context={actor:f.id,peer,epoch:owner.epoch,sequence:1,key:'r113-test-operation'};
 const capture=(tables=['players'])=>writer.committedR113.capture(f.sql,'attack',{},context,{players:[f.sql.prepare('SELECT * FROM players WHERE id=?').get(f.id)],result:{status:200,body:{ok:true}},sharedRefresh:{version:1,actors:[f.id],tables,all:false}});
 return {...f,writer,peer,owner,context,capture};
}
test('committed actor sections match the authoritative full snapshot after progression, equipment and deletion',async t=>{
 const s=await scene(t),{sql,id}=s;
 update(sql,'players',id,{level:65,xp:12345,rank_tier:3,champion_level_r102:2,champion_xp_r102:17});
 sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);
 put(sql,'player_items',{id:'r113-equipped',player_id:id,kind:'weapon',item_name:'Test sword',rarity:'red',power:17,role:'avci',enchantments:'[]',equipped:1,created_at:1});
 sql.prepare("INSERT INTO dungeon_materials(player_id,kind,amount) VALUES(?,'solo_key',7) ON CONFLICT(player_id,kind) DO UPDATE SET amount=7").run(id);
 for(const deleted of [false,true]){
  if(deleted){sql.prepare('DELETE FROM player_items WHERE player_id=?').run(id);sql.prepare('DELETE FROM dungeon_materials WHERE player_id=?').run(id);}
  const result=await s.f.database.atomic(()=>s.capture(['players','player_items','dungeon_materials']));
  assert(result.committedR113);const part=result.committedR113.actors[0];
  const fresh=await readActorWorldBundle(sql,[id,1,s.peer.incarnation,s.owner.epoch,0,result.committedR113.at,{account:part.bundle.player.account_id,chatAfterId:0,starterReward:null}],new ColdWorldReader(sql));
  for(const key of ['inventory','storageItems','stones','pets','dungeonMaterials','dungeonWings','drops','adventure511'])assert.deepEqual(wire(part.sections[key]),wire(fresh.projection.data[key]),key);
  const expected=fresh.projection.data.players.find(p=>p.id===id);
  for(const key of Object.keys(expected))assert.deepEqual(wire(part.sections.owner[key]??null),wire(expected[key]??null),'owner.'+key);
  for(const key of ['player','combat','engagement','fishing','party','partyMembers','guildSkill','arena','arenaPlayers','dungeon','adventure','mounts'])assert.deepEqual(wire(part.bundle[key]??null),wire(fresh[key]??null),key);
  assert.equal(readCommitRevisionR113(sql,id),deleted?2:1);
 }
});
test('rollback restores both reward rows and result revision; unknown effects cannot be certified',async t=>{
 const s=await scene(t),before=s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems;
 await assert.rejects(s.f.database.atomic(()=>{s.sql.prepare('UPDATE players SET gems=gems+99 WHERE id=?').run(s.id);s.capture();throw Error('abort-before-commit');}),/abort-before-commit/);
 assert.equal(s.sql.prepare('SELECT gems FROM players WHERE id=?').get(s.id).gems,before);assert.equal(readCommitRevisionR113(s.sql,s.id),0);
 const result=await s.f.database.atomic(()=>s.capture(['unknown_trigger_target']));assert.equal(result.committedR113,undefined);assert.equal(readCommitRevisionR113(s.sql,s.id),0);
});
test('consumer rejects a revision gap before changing any actor',()=>{
 let changed=0;const owner={epoch:1,incarnation:'c',channel:1},row={id:'a',area:'forest',channel:1};
 const c={world:{cycle:1},owners:new Map([['a',owner]]),kernel:{players:new Map([['a',{epoch:1,barrier:{}}]])},commitRevisionsR113:new Map([['a',3]]),lanes:{busy:()=>true},applyBundle:()=>changed++,revision:0};
 const r={channel:c,world:{subscribers:new Map([['a',{data:{area:'forest',channel:1}}]])}};
 assert.equal(applyCommittedResultR113(r,{players:[row],committedR113:{version:1,cycle:1,operationId:'op',actors:[{id:'a',base:1,next:2,bundle:{player:row,owner,world:{cycle:1}},sections:{owner:row}}]}}),false);assert.equal(changed,0);
});
