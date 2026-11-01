import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupPvp,put,update} from '../../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {ChannelOwnership} from '../../working/core511-source/scripts/core511/ownership.mjs';
import {ReadWorker} from '../../working/core511-source/scripts/core511/read-worker.mjs';
import {readAttackFrame} from '../../working/core511-source/scripts/core511/attack-writer.mjs';
import {createActionWriterHandler} from '../../working/core511-source/scripts/core511/action-writer.mjs';
import {SharedRefreshScope} from '../../working/core511-source/scripts/core511/shared-refresh-scope.mjs';
import {CollectWriteAudit,collectLightResult,applyCollectLight} from '../../working/core511-source/scripts/core511/collect-light.mjs';
import {validCollectMaterialsR85,captureCollectMaterialsR85} from '../../working/core511-source/scripts/core511/collect-materials-r85.mjs';
import {RUNE_TYPES} from '../../working/native510-bb3a6cc689c6/lib/runes.mjs';
import {plain,diff,resident,image} from './collect-fixtures.mjs';

const kinds=['strong_branch','strong_crystal','desert_plant','master_scroll',...Object.keys(RUNE_TYPES),'weathered_iron','wing','infinite','pet','halloween_pumpkin','witch_wand','halloween_candy'];
const drop=(s,kind,id)=>put(s.sql,'world_drops',{id,owner_id:s.id,monster_id:'golge-r85-collect',kind,item_name:'Native '+kind,rarity:'white',power:0,amount:3,role:null,enchantments:'[]',x:1000,y:1000,expires_at:Math.floor(s.nowMs/1000)+600,collectible_at:Math.floor(s.nowMs/1000)});
async function fixture(t){
 const s=await setupPvp(t);s.reset({area:'forest'});const {sql,id,nowMs}=s;
 const audit=new CollectWriteAudit();audit.initialize(sql);const scope=new SharedRefreshScope();scope.initialize(sql);
 const authority=new ChannelOwnership(s.f.database,{realmId:'r85-collect-native'});await authority.initialize();const peer={channel:1,incarnation:'r85-collect-channel'};await authority.registerProcess(1,peer.incarnation);const owner=await authority.admit(id,peer,{sessionId:'r85-collect-session',guard:()=>true});
 const reader=new ReadWorker(s.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());
 const access={account:sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id,chatAfterId:0,starterReward:{claimed:true}};
 const read=async()=>plain((await reader.query('kernel511_actor_world',[id,1,peer.incarnation,owner.epoch,1,nowMs,access])).rows);
 const handler=createActionWriterHandler({settingsFor:()=>s.settings,globalsFor:()=>s.globals,assertOwnership:()=>true,assertResources:()=>true,affectedActors:()=>[],settleRetaliation:()=>null,enforceRateLimit:()=>{},clock:()=>nowMs});
 async function collect(targetId){
  const payload={input:{action:'collect',targetId},localScope:{kind:'collect',owner:id},seed:s.seed,nowMs,receivedAtMs:nowMs,expected:{player:readAttackFrame(sql,id,'',s.globals).player,settings:s.settings}};
  return s.f.database.atomic(sql=>{let safe;const result=scope.run(sql,payload,{actor:id},()=>{const value=audit.run(sql,payload,()=>handler(sql,payload,{actor:id}));safe=value.safe;return value.result;},{global:true});return safe?collectLightResult(sql,payload,result):result;});
 }
 return {...s,audit,scope,read,collect};
}
test('all native material kinds update the complete actor bundle including Adventure and Dungeon inventories',async t=>{
 const s=await fixture(t),cases=[];
 put(s.sql,'adventure_portals',{id:'collect-portal',run_id:'collect-run',channel:1,area:'forest',x:100,y:100,opens_ms:0,closes_ms:Date.now()+600000,gold:1,capacity:10,entered:0,source_key:'collect-source'});
 put(s.sql,'dungeon_materials',{player_id:s.id,kind:'tower_azrail_chest',amount:7});
 for(const kind of kinds)for(const stacked of [false,true]){
  const target=kind+'-'+stacked;drop(s,kind,target);const before=await s.read(),f=resident(before),result=await s.collect(target);
  assert.equal(result.result.status,200,kind);assert.equal(result.result.body.ok,true);assert(result.collectLight?.materialsR85,kind+' complete material image');
  assert.equal(applyCollectLight(f.runtime,plain(result),{id:s.id,input:{action:'collect',targetId:target}}),true,kind);
  const after=await s.read();delete after.slim;
  assert.deepEqual(diff(after,image(f)),[],kind+' has no unhandled cold bundle dependency');
  assert.equal(after.adventure.towerInfo.inventory[kind],stacked?6:3);assert.equal(f.runtime.adventure.sent.has(s.id),false);assert.equal(f.runtime.adventure.projectionCache,null);
  assert.equal(after.adventure.towerInfo.inventory.tower_azrail_chest,7);assert(after.adventure.portals.some(p=>p.id==='collect-portal'));
  const replay=await s.collect(target);assert.equal(replay.result.status,404);assert.equal(replay.collectLight,undefined);
  cases.push({kind,stacked,amount:after.adventure.towerInfo.inventory[kind]});
 }
 fs.writeFileSync(new URL('../../evidence/collect-native-differential-r85.json',import.meta.url),JSON.stringify({passed:true,cases,scope:'native action writer, SQLite triggers/audit, complete readonly actor-world bundle differential',liveTouched:false},null,2)+'\n');
});
test('quest, foreign inventory, and changed player shape effects retain full refresh',async t=>{
 const s=await fixture(t);
 // Inject a quest award's player mutation into the real native material write.
 s.sql.exec("CREATE TEMP TRIGGER collect_quest_effect AFTER INSERT ON dungeon_materials BEGIN UPDATE players SET xp=xp+7 WHERE id=NEW.player_id;END");
 drop(s,'strong_branch','quest-progress');const before=await s.read(),result=await s.collect('quest-progress'),f=resident(before);
 assert.equal(result.result.status,200);assert.equal(result.players[0].xp,before.player.xp+7);assert.equal(applyCollectLight(f.runtime,plain(result),{id:s.id,input:{action:'collect',targetId:'quest-progress'}}),false);assert.deepEqual(image(f),image(resident(before)));
 s.sql.exec('DROP TRIGGER collect_quest_effect');
 // A quest journal write is outside the allowed tables, even without a player
 // change. The production global refresh audit sees trigger side effects too.
 s.sql.exec("CREATE TEMP TRIGGER collect_quest_journal AFTER INSERT ON dungeon_materials BEGIN INSERT INTO quest_claims438(player_id,quest_id,kills,fish,reward_json,claimed_at) VALUES(NEW.player_id,'collect-fixture-quest',0,0,'[]',1);END");
 drop(s,'master_scroll','quest-journal');const quest=await s.collect('quest-journal');assert.equal(quest.result.status,200);assert.equal(quest.collectLight,undefined);assert(quest.sharedRefresh.tables.includes('quest_claims438'));assert(s.sql.prepare("SELECT 1 FROM quest_claims438 WHERE player_id=? AND quest_id='collect-fixture-quest'").get(s.id));s.sql.exec('DROP TRIGGER collect_quest_journal');
 s.sql.exec("CREATE TEMP TRIGGER collect_foreign_material AFTER INSERT ON dungeon_materials BEGIN INSERT INTO dungeon_materials(player_id,kind,amount) VALUES('rival-511','foreign-side-effect',4) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+4;END");
 drop(s,'strong_crystal','foreign-material');const foreign=await s.collect('foreign-material');assert.equal(foreign.result.status,200);assert.equal(foreign.collectLight,undefined);assert.equal(s.sql.prepare("SELECT amount FROM dungeon_materials WHERE player_id='rival-511' AND kind='foreign-side-effect'").get().amount,4);
});
test('material row bounds and malformed snapshots fail closed before any resident mutation',async t=>{
 const s=await fixture(t);drop(s,'weathered_iron','bounds');const before=await s.read(),good=await s.collect('bounds');
 const bad=[null,{},[{kind:'x',amount:-1}],[{kind:'x',amount:1.1}],[{kind:'x',amount:Number.MAX_SAFE_INTEGER+1}],[{kind:'',amount:1}],[{kind:'x'.repeat(129),amount:1}],[{kind:'x',amount:1},{kind:'x',amount:2}],Array.from({length:129},(_,i)=>({kind:'m'+i,amount:1})),[{kind:'x',amount:1,extra:0}]];
 for(const rows of bad){assert.equal(validCollectMaterialsR85(rows),false);const f=resident(before),result=plain(good);result.collectLight.materialsR85=rows;assert.equal(applyCollectLight(f.runtime,result,{id:s.id,input:{action:'collect',targetId:'bounds'}}),false);assert.deepEqual(image(f),image(resident(before)));}
 for(const mutate of [f=>f.runtime.adventure.bundles.delete(s.id),f=>delete f.sub.data.adventure511,f=>delete f.runtime.dungeon.refreshActor,f=>f.runtime.channel.owners.delete(s.id)]){const f=resident(before);mutate(f);const data=plain(f.sub.data);assert.equal(applyCollectLight(f.runtime,plain(good),{id:s.id,input:{action:'collect',targetId:'bounds'}}),false);assert.deepEqual(f.sub.data,data);}
 for(let i=0;i<129;i++)put(s.sql,'dungeon_materials',{player_id:s.id,kind:'bounded-'+i,amount:1});assert.equal(captureCollectMaterialsR85(s.sql,s.id),null);
 drop(s,'pet','too-many-materials');assert.equal((await s.collect('too-many-materials')).collectLight,undefined);
});
test('all recipients and epochs are validated before any material state changes',async t=>{
 const s=await fixture(t);drop(s,'weathered_iron','group');const before=await s.read(),good=await s.collect('group');
 for(const mismatch of ['player','epoch']){
  const f=resident(before),peer='second-recipient',previous={...before.player,id:peer},r=f.runtime;
  r.channel.view.setPlayer(previous);r.channel.owners.set(peer,{epoch:1});r.channel.kernel.players.set(peer,{barrier:{},epoch:mismatch==='epoch'?2:1});r.world.subscribers.set(peer,{...plain(f.sub),ownerRow:{...f.sub.ownerRow,id:peer}});
  const result=plain(good);result.players.push({...previous,...(mismatch==='player'?{xp:previous.xp+1}:{})});
  if(mismatch==='player')assert.equal(applyCollectLight(r,result,{id:s.id,input:{action:'collect',targetId:'group'}}),false);
  else assert.throws(()=>applyCollectLight(r,result,{id:s.id,input:{action:'collect',targetId:'group'}}),/collect_light_not_fenced/);
  assert.deepEqual(image(f),image(resident(before)));
 }
});
