import test from 'node:test';
import assert from 'node:assert/strict';
import {setupPvp,put} from './pvp-fixture.mjs';
import {until} from './helpers.mjs';
import {DurableMarketState,MarketStateCoordinator,readMarketRevision,readMarketState} from '../market-state.mjs';
import {ReadWorker} from '../read-worker.mjs';
test('market revision is rollback-safe, preserves native changes() and never publishes a reader image before WAL fsync',async t=>{
 const f=await setupPvp(t),feed=new DurableMarketState(f.f.database);await feed.initialize();const revision=feed.current,seen=[];feed.subscribe(value=>seen.push(value));
 await assert.rejects(f.f.database.atomic(sql=>{put(sql,'market_shops',{id:'rollback-shop',owner_id:f.id,owner_name:'Owner',name:'Shop',x:1,y:1,created_at:1});throw Error('market-rollback');}),/market-rollback/);assert.equal(readMarketRevision(f.sql),revision);assert.equal(feed.current,revision);
 await f.f.database.atomic(sql=>{put(sql,'market_shops',{id:'durable-shop',owner_id:f.id,owner_name:'Owner',name:'Shop',x:1,y:1,created_at:1});assert.equal(sql.prepare('SELECT changes() n').get().n,1);});const initial=feed.current;
 await f.f.database.atomic(sql=>sql.prepare('UPDATE market_shops SET active=active').run());assert.equal(feed.current,initial);
 const reader=new ReadWorker(f.f.file,new Map(),{actorBundles:true});t.after(()=>reader.close());const rows=new Map(),core={writer:{marketState:feed},reader,processes:rows,onFault:issue=>assert.fail(issue.error.message),process:peer=>rows.get(peer.channel)},delivery=new MarketStateCoordinator(core);t.after(()=>delivery.close());
 const sent=[],row={online:true,peer:{channel:1},control:{request:async(method,point)=>{assert.equal(method,'market_state');sent.push(point);return {revision:point.revision};}}};rows.set(1,row);await delivery.attach(row);assert.equal(sent.at(-1).shops[0].active,1);
 let release;const wait=new Promise(r=>release=r),durable=f.f.database.durableAfterCommit.bind(f.f.database);f.f.database.durableAfterCommit=()=>Promise.resolve(durable()).then(()=>wait);
 try{const writing=f.f.database.atomic(sql=>sql.prepare('UPDATE market_shops SET active=0').run());await until(()=>readMarketRevision(f.sql)>initial);assert.equal(feed.current,initial);const forced=delivery.point();assert.equal((await forced).revision,initial,'unchanged committed metadata reuses safe cached image');assert.equal(sent.length,1);
  // A fresh reader can see SQLite COMMIT before the asynchronous fsync ACK.
  // Its image remains held until the matching durable version is published.
  const fresh=new MarketStateCoordinator(core);let delivered=false;const reading=fresh.point().then(point=>{delivered=true;return point;});await new Promise(r=>setTimeout(r,25));assert.equal(delivered,false);release();await writing;assert.equal((await reading).shops[0].active,0);fresh.close();await delivery.flush(row);assert.equal(sent.at(-1).shops[0].active,0);assert.equal(feed.current,initial+1);assert.equal(readMarketState(f.sql).revision,feed.current);
 }finally{release();f.f.database.durableAfterCommit=durable;}
 feed.publish(initial);assert.equal(feed.current,initial+1);
});
