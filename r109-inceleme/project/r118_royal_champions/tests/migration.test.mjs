import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {createContentLootR102} from '../../r109_latency_completion/working/core511-source/scripts/core511/content-loot-r102.mjs';
import {prepare,apply,verify,rollback,rollbackCheck,FEATURE_TABLES} from '../deployment/modules/royal_migration.mjs';
import {createRoyalSchemaR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/royal-config-r118.mjs';
import {ensureChampionsSchemaR118} from '../../r109_latency_completion/working/core511-source/scripts/core511/champions-service-r118.mjs';
import {installRoyalEquipmentTriggersR118} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/vds-server/src/equipment-sets-schema.mjs';
import {defaultRuneV2Config} from '../../r109_latency_completion/working/native510-bb3a6cc689c6/lib/rune-v2.mjs';
const initialize=db=>{createRoyalSchemaR118(db);ensureChampionsSchemaR118(db);installRoyalEquipmentTriggersR118(db);};
function fixture(t){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r118-schema-test-'));t.after(()=>fs.rmSync(dir,{recursive:true,force:true}));const database=path.join(dir,'game.sqlite'),snapshot=path.join(dir,'scope.sqlite');
 const db=new DatabaseSync(database);db.exec(`PRAGMA journal_mode=WAL;CREATE TABLE players(id TEXT PRIMARY KEY,daily_monster_kills INTEGER DEFAULT 0,daily_monster_day INTEGER DEFAULT 0,is_gm INTEGER DEFAULT 0,area TEXT,champion_level_r102 INTEGER,gems INTEGER,set_hp INTEGER DEFAULT 0,set_pve INTEGER DEFAULT 0,set_pvp INTEGER DEFAULT 0,set_resistance INTEGER DEFAULT 0,set_speed INTEGER DEFAULT 0,set_attack INTEGER DEFAULT 0);
 CREATE TABLE player_items(id TEXT PRIMARY KEY,player_id TEXT,rarity TEXT,kind TEXT,equipped INTEGER DEFAULT 0);
 CREATE TABLE dungeon_materials(player_id TEXT,kind TEXT,amount INTEGER,PRIMARY KEY(player_id,kind));
 CREATE TABLE content_settings_r102(id INTEGER PRIMARY KEY,config TEXT);
 CREATE TABLE rune_v2_settings(id INTEGER PRIMARY KEY,revision INTEGER,config_json TEXT);
 CREATE TABLE monsters(id TEXT PRIMARY KEY,name TEXT,x INTEGER,y INTEGER,hp INTEGER,max_hp INTEGER,variant TEXT,area TEXT,channel INTEGER,is_boss INTEGER,is_stone INTEGER,summoned INTEGER,respawn_at INTEGER,spawn_round INTEGER);
 CREATE TABLE unrelated_private_data(value TEXT);
 CREATE TRIGGER equipment_set_insert AFTER INSERT ON player_items WHEN NEW.equipped=1 BEGIN SELECT 1; END;
 CREATE TRIGGER equipment_set_delete AFTER DELETE ON player_items WHEN OLD.equipped=1 BEGIN SELECT 1; END;
 CREATE TRIGGER equipment_set_update AFTER UPDATE ON player_items WHEN OLD.equipped=1 OR NEW.equipped=1 BEGIN SELECT 1; END;
 INSERT INTO players(id,area,champion_level_r102,gems) VALUES('player','forest',1,12345);
 INSERT INTO monsters VALUES('forest-existing','Existing',100,100,50,100,'normal','forest',1,0,0,0,0,1);`);
 createContentLootR102(db);const stockingBefore=db.prepare("SELECT sql FROM sqlite_schema WHERE name='content_stocking_drop_r102'").get().sql.replace(" AND NEW.area<>'champions'",'');db.exec('DROP TRIGGER content_stocking_drop_r102');db.exec(stockingBefore);
 db.prepare('INSERT INTO rune_v2_settings VALUES(1,7,?)').run(JSON.stringify(defaultRuneV2Config()));db.prepare('INSERT INTO unrelated_private_data VALUES(?)').run('secret-player-mail@invalid.test'.repeat(10000));db.close();
 return {database,snapshot,open:()=>new DatabaseSync(database)};
}
function names(db){return db.prepare("SELECT name FROM sqlite_schema WHERE type='table'").all().map(row=>row.name);}
test('bounded SQLite snapshot, real additive migration, four channels and unchanged legacy progress',async t=>{
 const f=fixture(t),info=prepare(f.database,f.snapshot);assert.ok(info.bytes<300000);assert.equal(fs.readFileSync(f.snapshot).includes(Buffer.from('secret-player-mail')),false);
 await apply(f.database,f.snapshot,initialize);assert.equal(verify(f.database,f.snapshot).schemaReady,true);
 let db=f.open();assert.match(db.prepare("SELECT sql FROM sqlite_schema WHERE name='content_stocking_drop_r102'").get().sql,/NEW.area<>'champions'/);assert.equal(db.prepare("SELECT count(*) AS n FROM monsters WHERE area='champions'").get().n,192);assert.equal(db.prepare("SELECT gems FROM players WHERE id='player'").get().gems,12345);assert.equal(db.prepare("SELECT hp FROM monsters WHERE id='forest-existing'").get().hp,50);db.exec("UPDATE players SET gems=23456 WHERE id='player'");db.close();
 assert.equal((await apply(f.database,f.snapshot,initialize)).alreadyApplied,true);assert.equal(rollbackCheck(f.database,f.snapshot).rollbackAllowed,true);rollback(f.database,f.snapshot);
 db=f.open();assert.doesNotMatch(db.prepare("SELECT sql FROM sqlite_schema WHERE name='content_stocking_drop_r102'").get().sql,/NEW.area<>'champions'/);assert.ok(FEATURE_TABLES.every(name=>!names(db).includes(name)));assert.equal(db.prepare("SELECT gems FROM players WHERE id='player'").get().gems,23456);assert.equal(db.prepare('SELECT count(*) AS n FROM monsters').get().n,1);db.close();
});
test('migration exception rolls back DDL and all seeded monsters atomically',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);await assert.rejects(apply(f.database,f.snapshot,db=>{initialize(db);throw Error('injected migration interruption');}),/injected/);
 const db=f.open();assert.ok(FEATURE_TABLES.every(name=>!names(db).includes(name)));assert.equal(db.prepare('SELECT count(*) AS n FROM monsters').get().n,1);db.close();assert.equal(rollbackCheck(f.database,f.snapshot).migrated,false);
});
test('existing unknown new area or tables stops before snapshot or writes',t=>{
 const f=fixture(t),db=f.open();db.exec("CREATE TABLE royal_receipts_r118(sentinel TEXT)");db.close();assert.throws(()=>prepare(f.database,f.snapshot),/beklenmedik/);assert.equal(fs.existsSync(f.snapshot),false);
});
test('configuration or schema changed after snapshot stops migration',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);const db=f.open();db.exec('UPDATE rune_v2_settings SET revision=8');db.close();await assert.rejects(apply(f.database,f.snapshot,initialize),/değişmiş/);
 const check=f.open();assert.equal(names(check).includes('royal_settings_r118'),false);check.close();
});
test('completed gameplay receipt prevents downgrade and preserves all new data',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);await apply(f.database,f.snapshot,initialize);const db=f.open();db.exec("INSERT INTO royal_receipts_r118 VALUES('player','req','royal_transform_r118','digest','{}',1); INSERT INTO player_items VALUES('new-royal','player','royal','armor',0)");db.close();
 assert.throws(()=>rollbackCheck(f.database,f.snapshot),/ileri onarım/);assert.throws(()=>rollback(f.database,f.snapshot),/ileri onarım/);const check=f.open();assert.equal(check.prepare('SELECT rarity FROM player_items').get().rarity,'royal');assert.equal(check.prepare('SELECT count(*) AS n FROM royal_receipts_r118').get().n,1);check.close();
});
test('new material or damaged new mob blocks downgrade without erasing legacy progress',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);await apply(f.database,f.snapshot,initialize);let db=f.open();db.exec("UPDATE monsters SET hp=1 WHERE id='champions-ivory-guard-c1-01'");db.close();assert.throws(()=>rollbackCheck(f.database,f.snapshot),/kullanılmış/);
 db=f.open();assert.equal(db.prepare("SELECT gems FROM players WHERE id='player'").get().gems,12345);db.close();
});
test('out-of-contract schema addition rolls back the complete migration',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);await assert.rejects(apply(f.database,f.snapshot,db=>{initialize(db);db.exec('CREATE TABLE unrelated_new_feature(id INTEGER)');}),/kapsam dışı/);const db=f.open();assert.equal(names(db).includes('unrelated_new_feature'),false);assert.equal(names(db).includes('royal_settings_r118'),false);db.close();
});
test('snapshot tampering is rejected before migration',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);const s=new DatabaseSync(f.snapshot);s.exec("UPDATE r118_snapshot SET document='{}'");s.close();await assert.rejects(apply(f.database,f.snapshot,initialize),/özeti farklı/);
});

test('database inode replacement invalidates its existing migration snapshot',async t=>{
 const f=fixture(t);prepare(f.database,f.snapshot);fs.copyFileSync(f.database,f.database+'.other');fs.renameSync(f.database+'.other',f.database);await assert.rejects(apply(f.database,f.snapshot,initialize),/kimliği farklı/);
});
