import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {randomUUID} from 'node:crypto';
import {TOWER_DEFAULTS,TOWER_HOOK,TOWER_CHEST,TOWER_HOOK_CHANCE,createTowerSchema,readTowerConfig,validateTowerConfig,towerConfigFromDatabase} from '../../r109_latency_completion/working/core511-source/scripts/core511/tower-config.mjs';
import {createTowerRules} from '../../r109_latency_completion/working/core511-source/scripts/core511/tower-rules.mjs';

test('existing six-percent saves become ten without changing stored JSON, custom floors, quantities or other loot',()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  createTowerSchema(sql);assert.equal(TOWER_HOOK_CHANCE,10);
  const prior=structuredClone(TOWER_DEFAULTS);prior.revision=19;prior.floors[0].name='Özel kat';
  prior.chest.find(row=>row.itemId===TOWER_HOOK.id).chance=6;
  prior.chest[1]={...prior.chest[1],chance:17.25,min:2,max:4};
  const text=JSON.stringify(prior);sql.prepare('UPDATE kadim_tower_settings SET value=?,revision=19').run(text);
  const actual=towerConfigFromDatabase(sql),expected=structuredClone(prior);
  expected.chest.find(row=>row.itemId===TOWER_HOOK.id).chance=10;
  assert.deepEqual(actual,expected);assert.equal(sql.prepare('SELECT value FROM kadim_tower_settings').get().value,text);
  assert.deepEqual(readTowerConfig(expected),expected);assert.deepEqual(prior,JSON.parse(text));
 }finally{sql.close();}
});

test('the actual chest rule pays exactly on the lower ten percent of uniform draws and receipt replay never pays twice',()=>{
 const sql=new DatabaseSync(':memory:');
 try{
  createTowerSchema(sql);sql.exec('CREATE TABLE dungeon_materials(player_id TEXT,kind TEXT,amount INTEGER,PRIMARY KEY(player_id,kind))');
  const config=structuredClone(TOWER_DEFAULTS);config.chest=[{itemId:TOWER_HOOK.id,chance:6,min:1,max:1}];
  sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(config));
  sql.prepare('INSERT INTO dungeon_materials VALUES(?,?,?)').run('actor',TOWER_CHEST.kind,1000);
  const put=sql.prepare('INSERT INTO dungeon_materials VALUES(?,?,?) ON CONFLICT(player_id,kind) DO UPDATE SET amount=amount+excluded.amount');
  let draw=0,calls=0;
  const ctx={db:sql,now:()=>1000,player:()=>({id:'actor',name:'Fikstür',hp:1,combat_lock_until_ms:0,arena_match_id:null}),locked:()=>false,settings:()=>({}),roll:()=>{calls++;return draw;},material:(id,kind,amount)=>put.run(id,kind,amount),transaction:fn=>{sql.exec('BEGIN IMMEDIATE');try{const v=fn();sql.exec('COMMIT');return v;}catch(e){sql.exec('ROLLBACK');throw e;}}};
  const rules=createTowerRules({randomUUID,globals:{}});let wins=0;
  for(let i=0;i<1000;i++){
   draw=i/1000;const input={requestId:'r117-chest-'+String(i).padStart(8,'0')};
   const result=rules.towerOpenChest.call(ctx,'actor',input);
   assert.equal(result.rewards.length,i<100?1:0);
   wins+=result.rewards.length;const before=calls;
   assert.deepEqual(rules.towerOpenChest.call(ctx,'actor',input),result);assert.equal(calls,before);
  }
  assert.equal(wins,100);
  assert.equal(sql.prepare('SELECT amount FROM dungeon_materials WHERE kind=?').get(TOWER_CHEST.kind).amount,0);
  assert.equal(sql.prepare('SELECT amount FROM dungeon_materials WHERE kind=?').get(TOWER_HOOK.kind).amount,100);
  assert.equal(sql.prepare('SELECT COUNT(*) n FROM kadim_tower_receipts').get().n,1000);
 }finally{sql.close();}
});

test('admin validation keeps the fixed ten-percent one-item contract and rejects unrelated legacy values',()=>{
 for(const chance of [6,0,9,11,100]){
  const config=structuredClone(TOWER_DEFAULTS);config.chest[0].chance=chance;
  assert.throws(()=>validateTowerConfig(config),/%10/);
 }
 const invalid=structuredClone(TOWER_DEFAULTS);invalid.chest[0].chance=7;
 assert.throws(()=>readTowerConfig(invalid),/%10/);
 const doubled=structuredClone(TOWER_DEFAULTS);doubled.chest[0].max=2;
 assert.throws(()=>validateTowerConfig(doubled),/%10/);
});
