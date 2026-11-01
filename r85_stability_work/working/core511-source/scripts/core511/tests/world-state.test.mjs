import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {DurableWorldState,WorldStateDelivery,readWorldPoint,acceptWorldPoint} from '../world-state.mjs';
test('world revision, row and native changes() survive rollback and publish only after WAL fsync',async t=>{
 const f=await setupPvp(t),feed=new DurableWorldState(f.f.database);await feed.initialize();const initial=feed.current,seen=[];feed.subscribe(point=>seen.push(point));
 await assert.rejects(f.f.database.atomic(sql=>{sql.prepare('UPDATE world_state SET health=23 WHERE id=1').run();throw Error('rollback-world');}),/rollback-world/);assert.deepEqual(readWorldPoint(f.sql),initial);assert.equal(seen.length,0);
 await f.f.database.atomic(sql=>sql.prepare('UPDATE world_state SET health=health WHERE id=1').run());assert.deepEqual(feed.current,initial);assert.equal(seen.length,0);
 const durable=f.f.database.durableAfterCommit.bind(f.f.database);let release;const hold=new Promise(r=>release=r);f.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>hold);
 try{const job=f.f.database.atomic(sql=>{sql.prepare('UPDATE world_state SET health=23 WHERE id=1').run();assert.equal(sql.prepare('SELECT changes() n').get().n,1);return 'saved';});await until(()=>readWorldPoint(f.sql).world.health===23);assert.equal(feed.current,initial);assert.equal(seen.length,0);release();assert.equal(await job,'saved');assert.equal(feed.current.world.health,23);assert.equal(feed.current.revision,initial.revision+1);assert.equal(seen.length,1);assert(Object.isFrozen(feed.current.world));
 }finally{release();f.f.database.durableAfterCommit=durable;}
 const older=feed.current;await f.f.database.atomic(sql=>sql.prepare('UPDATE world_state SET health=31 WHERE id=1').run());feed.publish(older);assert.equal(feed.current.world.health,31);assert.equal(seen.length,2);
 f.sql.prepare('UPDATE world_state SET health=42 WHERE id=1').run();assert.equal(feed.current.world.health,31);await feed.syncExternal();assert.equal(feed.current.world.health,42);assert.equal(seen.length,3);
 assert.throws(()=>acceptWorldPoint(feed.current,{revision:feed.current.revision,world:{...feed.current.world,health:3}}),/world_point_reused/);
});
test('world delivery coalesces outstanding updates and rejects a stale ACK',async()=>{
 let current={revision:0,world:{id:1,cycle:1,health:100}},release;const sent=[],hold=new Promise(r=>release=r),delivery=new WorldStateDelivery({current:()=>current,request:async point=>{sent.push(point);if(sent.length===1)await hold;return {revision:point.revision};}});
 const pending=delivery.flush();await until(()=>sent.length===1);current={revision:1,world:{id:1,cycle:1,health:90}};assert.equal(delivery.flush(),pending);current={revision:2,world:{id:1,cycle:1,health:80}};release();await pending;assert.deepEqual(sent.map(p=>p.revision),[0,2]);assert.equal(delivery.sent,2);
 current={revision:3,world:{id:1,cycle:1,health:70}};delivery.request=async()=>({revision:2});await assert.rejects(delivery.flush(),/world_state_ack/);await assert.rejects(delivery.flush(),/world_state_ack/);
});
