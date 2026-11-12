import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {setupPvp,update,put} from '../working/core511-source/scripts/core511/tests/pvp-fixture.mjs';
import {ChannelOwnership} from '../working/core511-source/scripts/core511/ownership.mjs';
import {ColdWorldReader} from '../working/core511-source/scripts/core511/cold-world.mjs';
import {readActorWorldBundle} from '../working/core511-source/scripts/core511/read-worker.mjs';
import {AdventureService} from '../working/core511-source/scripts/core511/adventure-service.mjs';
import {createTowerSchema,TOWER_DEFAULTS} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {createAdventureSchema} from '../working/core511-source/scripts/core511/adventure-schema.mjs';
import {MIST_DEFAULTS} from '../working/core511-source/scripts/core511/mist-config.mjs';
import {defaultEvents} from '../working/native510-bb3a6cc689c6/lib/game-events.mjs';

const wire=value=>JSON.parse(JSON.stringify(value));
const membershipQuery='SELECT * FROM adventure_members WHERE player_id=?';
const profileQuery='SELECT a.id,a.profile FROM adventure_monsters a JOIN monsters m ON m.id=a.id WHERE a.run_id=? AND m.area=?';
const configQuery='SELECT value FROM kadim_tower_settings WHERE id=1';

async function scene(t){
 const f=await setupPvp(t),{sql,id,nowMs}=f;f.reset({area:'forest'});createTowerSchema(sql);createAdventureSchema(sql);
 const authority=new ChannelOwnership(f.f.database,{realmId:'cold-adventure-r108'});await authority.initialize();
 const peer={channel:1,incarnation:'cold-r108-1'};await authority.registerProcess(peer.channel,peer.incarnation);
 const owner=await authority.admit(id,peer,{sessionId:'cold-r108-session',guard:()=>true});
 const account=sql.prepare('SELECT account_id FROM players WHERE id=?').get(id).account_id;
 const readSql=new DatabaseSync(f.f.file,{readOnly:true});readSql.exec('PRAGMA query_only=ON');t.after(()=>readSql.close());
 const counts=new Map(),prepare=readSql.prepare;
 readSql.prepare=function(query,...args){const statement=Reflect.apply(prepare,this,[query,...args]);for(const key of ['get','all']){const invoke=statement[key];statement[key]=function(...bindings){counts.set(query,(counts.get(query)??0)+1);return Reflect.apply(invoke,this,bindings);};}return statement;};
 const params=[id,peer.channel,peer.incarnation,owner.epoch,1,nowMs,{account,chatAfterId:0,starterReward:{claimed:true}}];
 const reader=new ColdWorldReader(readSql),prior=new ColdWorldReader(readSql),legacy={cache:prior.cache,read:({actorBundle,...options})=>prior.read(options)};
 const compare=async()=>{
  counts.clear();const before=await readActorWorldBundle(readSql,params,legacy),oldCounts=new Map(counts);
  counts.clear();const after=await readActorWorldBundle(readSql,params,reader),newCounts=new Map(counts);
  assert.deepEqual(wire(after),wire(before),'the entire public/private snapshot and slim digests remain identical');
  assert.equal(oldCounts.get(membershipQuery),2);assert.equal(newCounts.get(membershipQuery),1);
  assert.equal(newCounts.get(configQuery),oldCounts.get(configQuery)-1,'one complete tower config parse/validation is removed');
  if(after.adventure.run){assert.equal(oldCounts.get(profileQuery),2);assert.equal(newCounts.get(profileQuery),1);}
  assert.notEqual(after.adventure.towerInfo,after.projection.data.adventure511.towerInfo,'public mutations cannot affect private simulation state');
  assert.notEqual(after.adventure.towerInfo.config.floors,after.projection.data.adventure511.towerInfo.config.floors);
  const original=after.adventure.towerInfo.config.floors[0].name;after.projection.data.adventure511.towerInfo.config.floors[0].name='public-only';assert.equal(after.adventure.towerInfo.config.floors[0].name,original);after.projection.data.adventure511.towerInfo.config.floors[0].name=original;
  return after;
 };
 return {...f,readSql,reader,params,compare,authority,peer,adventure:new AdventureService(sql,{now:()=>nowMs,uuid:randomUUID})};
}

test('one transaction reuses adventure rows without changing normal, tower or mist cold snapshots',async t=>{
 const s=await scene(t);await s.compare();
 const cycle=s.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
 for(const kind of ['tower','mist']){
  const config=structuredClone(kind==='tower'?TOWER_DEFAULTS:MIST_DEFAULTS),state=kind==='tower'?{floor:1,wave:1,clear:false,nextWaveAt:0}:{objective:'hunt',scale:1,gold:false,clear:false};
  const run=s.adventure.insertRun(kind,1,cycle,config,state);run.deadline_ms=s.nowMs+3600000;
  s.adventure.join(s.adventure.player(s.id),run);s.adventure.spawnWave(run);
  const first=await s.compare();assert.equal(first.projection.data.adventure511.run.kind,kind);
  s.sql.prepare('UPDATE adventure_members SET contribution=contribution+7 WHERE player_id=?').run(s.id);
  s.sql.prepare('UPDATE monsters SET hp=0 WHERE id=?').run(first.adventure.monsters[0].id);
  const second=await s.compare();assert.equal(second.projection.data.adventure511.run.contribution,7);
  assert.equal(second.adventure.monsters.find(m=>m.id===first.adventure.monsters[0].id).hp,0,'the next transaction rereads committed monster state');
  s.sql.prepare('UPDATE adventure_members SET departed=1 WHERE player_id=?').run(s.id);s.sql.prepare("UPDATE adventure_runs SET status='closed' WHERE id=?").run(run.id);update(s.sql,'players',s.id,{area:'forest'});
 }
 const changed=structuredClone(TOWER_DEFAULTS);changed.floors[0].name='New committed floor';s.sql.prepare('UPDATE kadim_tower_settings SET value=? WHERE id=1').run(JSON.stringify(changed));
 assert.equal((await s.compare()).projection.data.adventure511.towerInfo.config.floors[0].name,changed.floors[0].name,'settings are not retained across commits');
 await assert.rejects(readActorWorldBundle(s.readSql,[...s.params.slice(0,6),{...s.params[6],account:'different-account'}],s.reader),{code:'actor_world_owner_fenced'});
 assert.equal((await s.compare()).player.id,s.id,'a rejected owner read rolls back before the next snapshot');
});

test('a portal expiring after the private read is absent from the public snapshot',async t=>{
 const s=await scene(t),portal=s.adventure.portal({channel:1,area:'forest',x:800,y:500});
 const closes=s.sql.prepare('SELECT closes_ms FROM adventure_portals WHERE id=?').get(portal.id).closes_ms;
 const originalNow=Date.now;t.after(()=>{Date.now=originalNow;});Date.now=()=>closes-1;
 const reader={cache:s.reader.cache,read:options=>{assert(options.actorBundle.adventure.portals.some(p=>p.id===portal.id));Date.now=()=>closes;return s.reader.read(options);}};
 const value=await readActorWorldBundle(s.readSql,s.params,reader);
 assert(value.adventure.portals.some(p=>p.id===portal.id),'private snapshot retains its original timestamp boundary');
 assert(!value.projection.data.adventure511.portals.some(p=>p.id===portal.id),'public portal cutoff remains checked at projection time');
});

test('expired mist escrow is not exposed while public and private snapshots remain independent',async t=>{
 const s=await scene(t),cycle=s.sql.prepare('SELECT cycle FROM world_state WHERE id=1').get().cycle;
 const run=s.adventure.insertRun('mist',1,cycle,structuredClone(MIST_DEFAULTS),{objective:'hunt',scale:1,gold:false,clear:false});run.deadline_ms=s.nowMs+3600000;
 s.adventure.join(s.adventure.player(s.id),run);s.adventure.spawnWave(run);
 const chestId=randomUUID(),expires=s.nowMs+10000;
 put(s.sql,'mist_loot_chests',{id:chestId,run_id:run.id,channel:1,area:run.area,owner_id:s.id,owner_name:'Owner',death_revision:1,x:800,y:500,essence:17,gems:23,created_ms:s.nowMs,expires_ms:expires,status:'open'});
 const originalNow=Date.now;t.after(()=>{Date.now=originalNow;});Date.now=()=>expires-1;
 const reader={cache:s.reader.cache,read:options=>{assert(options.actorBundle.adventure.loot.some(c=>c.id===chestId));Date.now=()=>expires;return s.reader.read(options);}};
 const value=await readActorWorldBundle(s.readSql,s.params,reader);
 assert(value.adventure.loot.some(c=>c.id===chestId));assert(!value.projection.data.adventure511.loot.some(c=>c.id===chestId));
 assert.equal(s.sql.prepare('SELECT status FROM mist_loot_chests WHERE id=?').get(chestId).status,'open','read projection cannot settle or discard the durable escrow');
});

test('retained cold rules match fresh rules across clocks, configuration, accounts and service replacement',async t=>{
 const s=await scene(t),fresh=new ColdWorldReader(s.readSql),oracle={cache:fresh.cache,read:options=>fresh.read({...options,fresh:true})};
 const compare=async(params=s.params)=>{const expected=await readActorWorldBundle(s.readSql,params,oracle),actual=await readActorWorldBundle(s.readSql,params,s.reader);assert.deepEqual(wire(actual),wire(expected));return actual.projection.data;};
 await compare();const retained=s.reader.rules;assert(retained);
 s.params[5]+=2300;const advanced=await compare();assert.equal(advanced.snapshotAtMs,s.params[5]);assert.equal(advanced.serverTime,Math.floor(s.params[5]/1000));assert.equal(s.reader.rules,retained,'advancing the clock does not rebuild static rules');
 const events=defaultEvents(),sec=Math.floor(Date.now()/1000);events.events.halloween={enabled:true,start:sec-60,end:sec+3600,percent:31,runId:'r108-events'};events.halloweenWandChance=17;
 const themes={forest:'halloween',frozen:'new_year',__decor:{version:1,layouts:{'halloween:forest':{revision:1,custom:true,props:[[0,.2,.3,100]],lights:[]},'new_year:frozen':{revision:2,custom:true,props:[[1,.4,.5,110]],lights:[]}}}};
 s.sql.prepare('UPDATE game_settings SET events_json=?,seasonal_themes_json=?,health_decay_per_second=? WHERE id=1').run(JSON.stringify(events),JSON.stringify(themes),.123);
 const configured=await compare();assert.equal(configured.halloweenEvent456.percent,31);assert.equal(configured.halloweenEvent456.wandChance,17);assert.equal(configured.settings.health_decay_per_second,.123);assert.equal(configured.settings.seasonal_decor_current.area,'forest');assert.equal(configured.settings.seasonal_decor_current.revision,1);assert(Object.isFrozen(configured.settings.seasonal_decor_current.props[0]));assert.equal(s.reader.rules,retained);
 // Change raw JSON under the retained parser; no stale schedule/layout may survive.
 events.events.halloween.percent=43;events.halloweenWandChance=29;themes.__decor.layouts['halloween:forest'].revision=3;
 s.sql.prepare('UPDATE game_settings SET events_json=?,seasonal_themes_json=? WHERE id=1').run(JSON.stringify(events),JSON.stringify(themes));
 const changed=await compare();assert.equal(changed.halloweenEvent456.percent,43);assert.equal(changed.halloweenEvent456.wandChance,29);assert.equal(changed.settings.seasonal_decor_current.revision,3);assert.equal(configured.settings.seasonal_decor_current.revision,1,'previous public snapshot stays unchanged');
 update(s.sql,'players',s.id,{area:'frozen'});assert.equal((await compare()).settings.seasonal_decor_current.area,'frozen');
 // Maintenance closures are replaced between reads, including different accounts.
 s.params[6].maintenance={view:{allowed:true,marker:'first-account'},revision:4};assert.equal((await compare()).maintenance438.marker,'first-account');
 const account='r108-second-account';put(s.sql,'accounts',{id:account,username:account,username_normalized:account,email:'r108@example.test',email_normalized:'r108@example.test',password_hash:'fixture-only',password_salt:'fixture',created_at:sec,updated_at:sec});update(s.sql,'players',s.targetId,{account_id:account,area:'forest'});
 const owner=await s.authority.admit(s.targetId,s.peer,{sessionId:'r108-second-session',guard:()=>true});
 const other=[s.targetId,1,s.peer.incarnation,owner.epoch,1,s.params[5],{account,chatAfterId:0,starterReward:{claimed:true},maintenance:{view:{allowed:false,marker:'second-account'},revision:5}}];
 const second=await compare(other);assert.equal(second.maintenance438.marker,'second-account');assert.equal(second.settings.seasonal_decor_current.area,'forest');assert.equal(s.reader.rules,retained);
 delete s.params[6].maintenance;assert.equal((await compare()).maintenance438,null,'prior account maintenance policy is not retained');
 s.reader.services=null;await compare();assert.notEqual(s.reader.rules,retained,'new globals get a new rules factory');
 assert.equal(fresh.rules,null,'the fresh oracle never retains a rules factory');
});
