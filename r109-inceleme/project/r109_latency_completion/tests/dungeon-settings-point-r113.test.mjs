import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {TOWER_DEFAULTS} from '../working/core511-source/scripts/core511/tower-config.mjs';
import {readDungeonSettingsPointR113,retainDungeonSettingsR113} from '../working/core511-source/scripts/core511/dungeon-settings-point-r113.mjs';
import {applyCommittedResultR113} from '../working/core511-source/scripts/core511/committed-apply-r113.mjs';

function fixture(t){const sql=new DatabaseSync(':memory:');t.after(()=>sql.close());sql.exec("CREATE TABLE game_settings(id PRIMARY KEY,value);INSERT INTO game_settings VALUES(1,3);CREATE TABLE combat_settings(id PRIMARY KEY,value);INSERT INTO combat_settings VALUES(1,5);CREATE TABLE dungeon_settings(id PRIMARY KEY,value);INSERT INTO dungeon_settings VALUES(1,'{}');CREATE TABLE kadim_tower_settings(id PRIMARY KEY,value);INSERT INTO kadim_tower_settings VALUES(1,'{}')");sql.prepare('UPDATE kadim_tower_settings SET value=?').run(JSON.stringify(TOWER_DEFAULTS));return sql;}
test('exact settings rows reuse an immutable point; each table, SQL rollback and mutation are fenced',t=>{
 const sql=fixture(t),original=readDungeonSettingsPointR113(sql);assert.equal(readDungeonSettingsPointR113(sql),original);
 assert.throws(()=>original.settings.game_settings.value=17,TypeError);
 for(const table of ['game_settings','combat_settings','dungeon_settings','kadim_tower_settings']){
  sql.exec('BEGIN');sql.prepare('UPDATE '+table+' SET value=? WHERE id=1').run(table==='dungeon_settings'?'{} ':table==='kadim_tower_settings'?JSON.stringify({...TOWER_DEFAULTS,minLevel:31}):7);
  const changed=readDungeonSettingsPointR113(sql);assert.notEqual(changed,original);
  if(table!=='dungeon_settings')assert.notEqual(changed.ref,original.ref);
  sql.exec('ROLLBACK');assert.deepEqual(readDungeonSettingsPointR113(sql),original);
 }
 const channel={},input=structuredClone(original.settings);retainDungeonSettingsR113(channel,input);input.game_settings.value=19;
 assert.equal(channel.dungeonSettingsR113.ref,original.ref);assert.equal(channel.dungeonSettingsR113.settings.game_settings.value,3);
 retainDungeonSettingsR113(channel,input);assert.notEqual(channel.dungeonSettingsR113.ref,original.ref);
});
test('matching reference installs all private actors; missing or stale configuration falls back before mutation',t=>{
 const point=readDungeonSettingsPointR113(fixture(t)),owner={epoch:1,incarnation:'c',channel:1},rows=['a','b'].map(id=>({id,area:'forest',channel:1}));let changed=[];
 const c={world:{cycle:1},owners:new Map(rows.map(p=>[p.id,owner])),kernel:{players:new Map(rows.map(p=>[p.id,{epoch:1,barrier:{}}]))},commitRevisionsR113:new Map(rows.map(p=>[p.id,0])),lanes:{busy:()=>true},applyBundle:b=>changed.push(b),revision:0};
 const runtime={channel:c,world:{subscribers:new Map(rows.map(p=>[p.id,{data:{area:'forest',channel:1}}])),commitPrivateR113(){}},slimReload:{forget(){}}};
 const result=()=>({players:rows,committedR113:{version:1,cycle:1,operationId:'operation',dungeonSettingsRefR113:point.ref,actors:rows.map(row=>({id:row.id,base:0,next:1,bundle:{player:row,owner,world:{cycle:1},combat:{},dungeon:{players:[row]}},sections:{owner:row}}))}});
 assert.equal(applyCommittedResultR113(runtime,result()),false);assert.equal(changed.length,0);
 c.dungeonSettingsR113={ref:'f'.repeat(64),settings:point.settings};assert.equal(applyCommittedResultR113(runtime,result()),false);assert.equal(changed.length,0);
 c.dungeonSettingsR113=point;assert.equal(applyCommittedResultR113(runtime,result()),true);assert.equal(changed.length,2);
 for(const bundle of changed)assert.equal(bundle.dungeon.settings,point.settings);
});
