import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {nativeHttpHost} from '../../r109_latency_completion/working/core511-source/scripts/core511/tests/native-http-host-fixture.mjs';
import {GameWriter} from '../../r109_latency_completion/working/core511-source/scripts/core511/writer-runtime.mjs';
import {nonlethalSchemaR56,nonlethalRewardPortR56,nonlethalStatsR56} from '../../r109_latency_completion/working/core511-source/scripts/core511/nonlethal-rewards-r56.mjs';
import {nonlethalTriggersR56} from '../../r109_latency_completion/working/core511-source/scripts/core511/nonlethal-triggers-r56.mjs';
import {royalTriggerHashesR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-trigger-audit-r118.mjs';
import {createAttackWriterRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/generated/attack-writer-rules.mjs';
import {nativeAtomicStatements} from '../../r109_latency_completion/working/core511-source/scripts/core511/retaliation-writer.mjs';
import {attackRandom} from '../../r109_latency_completion/working/core511-source/scripts/core511/attack-writer.mjs';
import {canonicalFixtureContentTriggerR118} from './production-trigger-fixture-r118.mjs';
const hash=value=>createHash('sha256').update(value).digest('hex');
const quote=value=>'"'+value.replaceAll('"','""')+'"';
const review=JSON.parse(fs.readFileSync(new URL('../evidence/r118-trigger-review.json',import.meta.url)));
const readTriggers=sql=>sql.prepare("SELECT 'main' scope,name,sql FROM main.sqlite_schema WHERE type='trigger' UNION ALL SELECT 'temp',name,sql FROM temp.sqlite_schema WHERE type='trigger'").all();

test('R118 exact migrated production trigger certification retains native nonlethal elision',{timeout:60000},async t=>{
 const s=await nativeHttpHost(t,{start:false,realmId:'royal-cert-r118'}),sql=s.host.database.sqlite;
 const normalization=canonicalFixtureContentTriggerR118(sql);assert.equal(normalization.sha256,'50f67c1f0a305021440081f4836e61be1fb341a4dc9059fc3b1772b216d83448');
 // Same additive installer journal as royal_migration.apply, before any writer.
 sql.exec('CREATE TABLE r118_install_state(id INTEGER PRIMARY KEY CHECK(id=1),document TEXT NOT NULL)');
 await s.bind();const writer=new GameWriter(s.host.database,{realmId:'royal-cert-r118',ports:{guard:()=>true}});await s.host.prepareWriter(writer);
 const rng=()=>({random:()=>0.4,uuid:()=>crypto.randomUUID()});
 const inTransaction=fn=>{sql.exec('BEGIN IMMEDIATE');try{const result=fn();sql.exec('ROLLBACK');return result;}catch(error){if(sql.isTransaction)sql.exec('ROLLBACK');throw error;}};
 await t.test('all reviewed exact definitions exist; migrated writer uses the optimized port',()=>{
  const actual=new Map(readTriggers(sql).map(r=>[r.scope+':'+r.name,r]));
  assert.equal(Object.keys(royalTriggerHashesR118).length,27);
  for(const row of review.rows){assert.equal(actual.get(row.scope+':'+row.name)?.sql,row.sql,row.name);assert.equal(royalTriggerHashesR118[row.scope+':'+row.name],hash(row.sql));}
  assert.equal(nonlethalSchemaR56(sql),true);
  inTransaction(()=>{const port=nonlethalRewardPortR56(sql,rng());assert.equal(typeof port.skip,'function');assert.equal(port.hitGroupSize,64);assert.equal(typeof port.batchHits,'function');});
  assert.equal(nonlethalStatsR56(sql).schemaFallback,0);
 });
 await t.test('historical R117 equipment hashes stay valid as exact alternatives',()=>{
  const current=readTriggers(sql).filter(r=>r.scope==='main'&&r.name.startsWith('equipment_set_'));
  try{
   for(const row of current){const old=row.sql.replaceAll("rarity IN ('emerald','royal')","rarity='emerald'");assert.equal(hash(old),nonlethalTriggersR56['main:'+row.name]);sql.exec('DROP TRIGGER '+quote(row.name));sql.exec(old);}
   assert.equal(nonlethalSchemaR56(sql),true);
  }finally{for(const row of current){sql.exec('DROP TRIGGER '+quote(row.name));sql.exec(row.sql);}}
  assert.equal(nonlethalSchemaR56(sql),true);
 });
 await t.test('unknown main and TEMP triggers invalidate the schema cache and force native fallback',()=>{
  for(const scope of ['','TEMP ']){
   sql.exec('CREATE '+scope+'TRIGGER unexpected_r118 AFTER UPDATE ON monsters BEGIN SELECT 1; END');
   assert.equal(nonlethalSchemaR56(sql),false);
   inTransaction(()=>assert.equal(nonlethalRewardPortR56(sql,rng()).skip,undefined));
   sql.exec('DROP TRIGGER '+(scope?'temp.':'main.')+'unexpected_r118');assert.equal(nonlethalSchemaR56(sql),true);
  }
  assert.equal(nonlethalStatsR56(sql).schemaFallback,2);
 });
 await t.test('changed existing Royal and TEMP observer definitions still force native fallback',()=>{
  for(const key of ['main:royal_champion_update_r118','main:equipment_set_update','temp:kernel511_refresh_r533_royal_receipts_r118_UPDATE_scope']){
   const [scope,name]=key.split(':'),row=readTriggers(sql).find(r=>r.scope===scope&&r.name===name),restore=()=>sql.exec(scope==='temp'?row.sql.replace(/^CREATE TRIGGER/,'CREATE TEMP TRIGGER'):row.sql);
   sql.exec('DROP TRIGGER '+scope+'.'+quote(name));
   try{sql.exec((scope==='temp'?row.sql.replace(/^CREATE TRIGGER/,'CREATE TEMP TRIGGER'):row.sql).replace(/ END\s*$/,' SELECT 1; END'));assert.equal(nonlethalSchemaR56(sql),false);inTransaction(()=>assert.equal(nonlethalRewardPortR56(sql,rng()).skip,undefined));}
   finally{sql.exec('DROP TRIGGER '+scope+'.'+quote(name));restore();}
   assert.equal(nonlethalSchemaR56(sql),true);
  }
 });
 await t.test('nonlethal native attack skips only empty rewards; lethal native reward and replay remain once',()=>{
  const id='golge-royal-cert-r118',actor=s.seed.id,now=Date.now(),db=nativeAtomicStatements(sql),globals=writer.services.globals;
  sql.prepare("UPDATE players SET area='forest',channel=1,x=2700,y=2025,hp=1000,max_hp=1000,rod_equipped=0,level=40,attack_one_at=0,stun_until_ms=0,root_until_ms=0,combat_lock_until_ms=0 WHERE id=?").run(actor);
  sql.prepare("INSERT INTO monsters(id,name,area,channel,x,y,hp,max_hp,spawn_round,is_boss,is_stone) VALUES(?,'Gölge Kurt','forest',1,2700,2025,1000000,1000000,17,0,0)").run(id);
  const settings={...sql.prepare('SELECT * FROM game_settings WHERE id=1').get(),...sql.prepare('SELECT * FROM combat_settings WHERE id=1').get()};
  const attack=(optimized=true)=>{
   const random=attackRandom('7'.repeat(64)),port=optimized?nonlethalRewardPortR56(sql,random):{uuid:random.uuid,random:random.random},rules=createAttackWriterRules({...random,uuid:port.uuid,random:port.random,globals,now:()=>now,response:{json:(body,{status=200}={})=>({body,status})},ports:{skipNonlethalRewardsR56:port.skip,hitGroupSizeR56:port.hitGroupSize,batchHitsR56:port.batchHits,settlePveEngagement:()=>null,publishRealtimeRoomEvent:()=>{},publishRealtimeRoomEventToChannels:()=>{},deliverRealtime:x=>x,runRewardDelivery:(_db,_key,fn)=>fn()}}),frame=rules.hydrateAttack(db,actor,id);frame.player.pet_kind=null;
   const result=rules.nativeAttack(db,{player:frame.player,playerId:actor,payload:{action:'attack',targetId:id,spawnRound:17,ability:0,intentId:'royal-cert-hit'},settings,attackTargetId:id,preloadedAttackMonster:frame.monster,requestReceivedAtMs:now,now:Math.floor(now/1000),auth:{account:{id:frame.player.account_id}}});assert.equal(result.status,200,JSON.stringify(result));return {rules,result,randomProbe:{roll:random.random(),uuid:random.uuid()}};
  };
  const snap=()=>JSON.stringify({xp:sql.prepare('SELECT xp FROM players WHERE id=?').get(actor),xpClaims:sql.prepare('SELECT * FROM monster_xp_claims ORDER BY claim_token').all(),drops:sql.prepare('SELECT * FROM world_drops WHERE monster_id=? ORDER BY id').all(id),materials:sql.prepare('SELECT * FROM dungeon_materials WHERE player_id=? ORDER BY kind').all(actor)});
  // Compare the exact same seeded native statement graph with and without
  // empty reward elision, rolling back each trial. The next RNG values also
  // prove the skipped preparation preserved its original random/UUID draws.
  const trials=[];
  for(const optimized of [false,true])trials.push(inTransaction(()=>{const {result,randomProbe}=attack(optimized);return {result,randomProbe,rewards:snap(),player:{...sql.prepare('SELECT * FROM players WHERE id=?').get(actor)},monster:{...sql.prepare('SELECT * FROM monsters WHERE id=?').get(id)},events:sql.prepare('SELECT * FROM combat_events ORDER BY id').all()};}));
  assert.deepEqual(trials[1],trials[0]);
  const prior=snap(),before=nonlethalStatsR56(sql).skipped;
  sql.exec('BEGIN IMMEDIATE');try{const {result}=attack();assert.equal(result.body.hits[0].killed,false);sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
  assert.equal(nonlethalStatsR56(sql).skipped,before+1);assert.equal(snap(),prior);assert(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp<1000000);
  sql.prepare('UPDATE monsters SET hp=1 WHERE id=?').run(id);sql.prepare('UPDATE players SET attack_one_at=0 WHERE id=?').run(actor);
  let rules;sql.exec('BEGIN IMMEDIATE');try{const value=attack();rules=value.rules;assert.equal(value.result.body.hits[0].killed,true);const awarded=rules.awardPendingNormalRewards(db,settings,Math.floor(now/1000),{id,spawn_round:17});assert.equal(awarded.awarded,true,JSON.stringify(awarded));sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
  assert.equal(sql.prepare('SELECT hp FROM monsters WHERE id=?').get(id).hp,0);assert.notEqual(snap(),prior);
  const committed=snap();sql.exec('BEGIN IMMEDIATE');try{rules.awardPendingNormalRewards(db,settings,Math.floor(now/1000),{id,spawn_round:17});sql.exec('COMMIT');}catch(e){sql.exec('ROLLBACK');throw e;}
  assert.equal(snap(),committed);assert.equal(nonlethalStatsR56(sql).skipped,before+1);
 });
});
