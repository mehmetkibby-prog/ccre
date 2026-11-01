import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {DatabaseSync} from 'node:sqlite';
import {WriterSettings} from '../working/core511-source/scripts/core511/writer-settings.mjs';
import {defaultLootTemplateR87} from '../working/core511-source/scripts/core511/default-loot-cache-r87.mjs';

test('real WAL settings reread preserves unrelated-commit identity and invalidates edits/rollback',t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r87-settings-')),file=path.join(dir,'test.sqlite');
 const a=new DatabaseSync(file),b=new DatabaseSync(file);t.after(()=>{a.close();b.close();fs.rmSync(dir,{recursive:true});});
 a.exec('PRAGMA journal_mode=WAL;CREATE TABLE game_settings(id INTEGER PRIMARY KEY,rate REAL);CREATE TABLE combat_settings(id INTEGER PRIMARY KEY,speed INTEGER);CREATE TABLE moves(id INTEGER PRIMARY KEY,x INTEGER);INSERT INTO game_settings VALUES(1,0.05);INSERT INTO combat_settings VALUES(1,10);INSERT INTO moves VALUES(1,0)');
 const cache=new WriterSettings();cache.initialize(a);const first=cache.read(a);assert(Object.isFrozen(first));
 b.exec('UPDATE moves SET x=1');assert.equal(cache.read(a),first);
 b.exec('UPDATE game_settings SET rate=0.1');const changed=cache.read(a);assert.notEqual(changed,first);assert.equal(changed.rate,0.1);
 a.exec('BEGIN;UPDATE combat_settings SET speed=20');const transient=cache.read(a);assert.equal(transient.speed,20);a.exec('ROLLBACK');assert.equal(cache.read(a).speed,10);assert.notEqual(cache.read(a),transient);
 a.exec('BEGIN;UPDATE combat_settings SET speed=30;COMMIT');assert.equal(cache.read(a).speed,30);
 b.exec('UPDATE game_settings SET rate=0.05');assert.equal(cache.read(a).rate,0.05);
});

test('static profile reuse isolates mutation, keys/settings, malformed/oversize and exceptions',()=>{
 let calls=0;const settings=Object.freeze({chance:10}),build=()=>({lootSourceKey:'forest.golge',lootProfileRevision:0,lootProfileJson:JSON.stringify({chance:++calls})});
 const first=defaultLootTemplateR87(settings,'forest.golge',build);first.lootProfileJson='mutated';
 assert.equal(defaultLootTemplateR87(settings,'forest.golge',build).lootProfileJson,'{"chance":1}');assert.equal(calls,1);
 defaultLootTemplateR87(settings,'forest.curuk',build);assert.equal(calls,2);
 defaultLootTemplateR87(Object.freeze({chance:20}),'forest.golge',build);assert.equal(calls,3);
 const mutable={chance:10};defaultLootTemplateR87(mutable,'forest.golge',build);mutable.chance=5;defaultLootTemplateR87(mutable,'forest.golge',build);assert.equal(calls,5);
 const huge=()=>{calls++;return {lootSourceKey:'x',lootProfileRevision:0,lootProfileJson:'x'.repeat(270000)}};
 defaultLootTemplateR87(settings,'huge',huge);defaultLootTemplateR87(settings,'huge',huge);assert.equal(calls,7);
 assert.throws(()=>defaultLootTemplateR87(settings,'throws',()=>{throw Error('native failure')}),/native failure/);
 for(let i=0;i<40;i++)defaultLootTemplateR87(settings,'row'+i,build);
 const before=calls;defaultLootTemplateR87(settings,'forest.golge',build);assert.equal(calls,before+1);
});
