import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {LocalDatabase} from '../working/native510-bb3a6cc689c6/vds-server/src/database.mjs';
import {DurableWorldState,readWorldPoint,acceptWorldPoint} from '../working/core511-source/scripts/core511/world-state.mjs';
const until=async f=>{const end=Date.now()+5000;while(!f()){assert(Date.now()<end);await new Promise(r=>setTimeout(r,5));}};
test('unrelated writes reuse only the same durable world revision; new rows wait for fsync and rollback stays isolated',async t=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'r105-world-')),db=new LocalDatabase(dir+'/game.sqlite',{create:true,groupWrites:true});t.after(()=>{db.close();fs.rmSync(dir,{recursive:true,force:true});});
 await db.atomic(sql=>sql.exec('CREATE TABLE world_state(id INTEGER PRIMARY KEY,cycle INTEGER,health REAL);INSERT INTO world_state VALUES(1,1,100);CREATE TABLE unrelated(n INTEGER);INSERT INTO unrelated VALUES(0)'));
 let fullReads=0;const prepare=db.sqlite.prepare;db.sqlite.prepare=function(text,...args){const s=prepare.call(this,text,...args);if(text==='SELECT * FROM world_state WHERE id=1'){const get=s.get;s.get=function(...args){fullReads++;return get.apply(this,args);};}return s;};
 const feed=new DurableWorldState(db);await feed.initialize();const first=feed.current;fullReads=0;
 for(let i=0;i<20;i++)await db.atomic(sql=>sql.prepare('UPDATE unrelated SET n=n+1').run());
 assert.equal(fullReads,0,'unchanged world row need not be reread/copied/serialized');assert.equal(feed.current,first);assert.equal(db.sqlite.prepare('SELECT n FROM unrelated').get().n,20);
 await assert.rejects(db.atomic(sql=>{sql.prepare('UPDATE world_state SET health=10').run();throw Error('rollback');}),/rollback/);assert.equal(feed.current,first);assert.deepEqual(readWorldPoint(db.sqlite),first);
 let release;const held=new Promise(r=>release=r),durable=db.durableAfterCommit.bind(db);db.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>held);
 const changing=db.atomic(sql=>sql.prepare('UPDATE world_state SET health=80').run());
 await until(()=>db.sqlite.prepare('SELECT health FROM world_state').get().health===80);assert.equal(feed.current,first);
 const following=db.atomic(sql=>sql.prepare('UPDATE unrelated SET n=n+1').run());await until(()=>db.sqlite.prepare('SELECT n FROM unrelated').get().n===21);assert.equal(feed.current,first);
 release();await Promise.all([changing,following]);assert.equal(feed.current.world.health,80);assert.equal(feed.current.revision,first.revision+1);assert(Object.isFrozen(feed.current));assert(Object.isFrozen(feed.current.world));db.durableAfterCommit=durable;
 assert.throws(()=>acceptWorldPoint(feed.current,{revision:feed.current.revision,world:{...feed.current.world,health:2}}),/world_point_reused/);
 db.sqlite.prepare('UPDATE world_state SET health=70').run();await feed.syncExternal();assert.equal(feed.current.world.health,70);
 // A schema change cannot silently reuse the old row shape at the same revision.
 await assert.rejects(db.atomic(sql=>sql.exec('ALTER TABLE world_state ADD COLUMN extra INTEGER DEFAULT 7')),/world_point_reused/);
});
